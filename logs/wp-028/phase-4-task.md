# WP-028 Phase 4: Variant editor side-by-side + first real DB variant write

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 4 of 7
> Priority: P0 — first real `blocks.variants` column write; Portal variant render verification is mandatory
> Estimated: 4h (editor UI 1.5h + mini-preview + slider 1h + save E2E both surfaces 45min + Playwright portal verification 30min + tests + result log 45min)
> Type: Frontend + integration
> Previous: Phase 3 ✅ (VariantsDrawer fork/rename/delete) + Phase 3.5 ✅ (Path B re-converge; both surfaces unified render)
> Next: Phase 5 — Dirty-state consolidation + conflict handling (~1-2h, likely small per workplan)
> Affected domains: infra-tooling, studio-blocks, pkg-block-forge-core (consume-only), app-api (consume-only — updateBlockSchema already validates variants), app-portal (read-only — revalidate-driven render verification)

---

## Context

Phase 3 + 3.5 left both surfaces with VariantsDrawer (fork/rename/delete) + unified render path (`renderForPreview(block, { variants })` + single-wrap composeSrcDoc). Session + RHF both carry `variants` state. Save payloads already shape correctly (`variants: undefined | BlockVariants`). Validators + Hono accept the variants payload since WP-024/WP-027 Phase 4. Portal render via `renderForPreview` is the same render-time engine call that the authoring surfaces use.

What's missing: **the editor itself**. Fork creates a variant that deep-copies the base — post-fork, variant HTML === base HTML, so @container reveal fires at the variant BP but shows visually identical content. Phase 4 adds the editor so authors can diverge variant HTML/CSS from base, and the DB actually holds a non-null `blocks.variants` value after a Studio save.

```
CURRENT (entering Phase 4):
  VariantsDrawer.tsx both surfaces — fork/rename/delete list + empty state  ✅  (266 LOC each)
  Drawer barrel @cmsmasters/ui — 8 Radix-backed re-exports                   ✅
  Both surfaces render via renderForPreview(block, { variants })             ✅
  composeSrcDoc — single-wrap .slot-inner both surfaces                      ✅
  PARITY.md §7 — ✅ RE-CONVERGED                                             ✅
  Studio form.variants — RHF registered (L84), dispatchVariantToForm helper  ✅
  block-forge session.variants — pure reducers + undo + savedVariants param ✅
  updateBlockApi + Hono updateBlockSchema — variants already accepted        ✅
  revalidate fire-and-forget post-Save — `{ all: true }`                     ✅

MISSING (Phase 4 adds):
  Editor UI inside drawer — tabbed layout + 4 textareas + mini-preview      ❌
  'update-content' VariantAction kind — content dispatch separate from CRUD ❌
  Debounced editor dispatch (300ms) — mirrors Phase 2 tweak pattern         ❌
  Mini-preview iframe + panel-width slider                                  ❌
  First real variants DB write via Studio save → Supabase persist           ❌
  Portal variant render verification — Playwright E2E at variant BP          ❌
  PARITY.md §Variant Editor additive section both files                     ❌
```

**Biggest risk: first real DB variants write.** Every prior WP touched `blocks.variants` structurally (column, types, schema, save-path plumbing). Phase 4 is where actual author-authored variants land in production Supabase. Portal verification via Playwright is mandatory per saved memory `feedback_visual_check_mandatory.md`.

---

## Domain Context

**infra-tooling (`tools/block-forge/`):**
- Key invariants: session.variants is source of truth; save path fs.writeFileSync round-trips unknown fields; PARITY.md same-commit discipline
- Known traps (carryover): React dedupe fragile (Phase 3.5 parked); tools/block-forge not in root workspaces
- Public API: session.variants mutation via `createVariant/renameVariant/deleteVariant` (Phase 3) — Phase 4 extends with `updateVariantContent(state, name, content)` helper (new action type `variant-update` for undo symmetry)
- Blast radius: VariantsDrawer.tsx grows from 266 → ~450 LOC; snap regen; session.ts +1 reducer +1 action type

**studio-blocks (`apps/studio/src/pages/block-editor/**`):**
- Key invariants: RHF `form.variants` canonical; `dispatchVariantToForm` pattern; revalidate `{ all: true }` fire-and-forget
- Known traps: form lives in block-editor.tsx; 31-line deviation cap 40; Phase 4 budget +0 (extend existing `handleVariantDispatch`)
- Public API: extend `VariantAction` union with `{ kind: 'update-content'; name: string; html: string; css: string }`; `dispatchVariantToForm` handles the new kind via same `form.setValue('variants', next, { shouldDirty: true })` pattern
- Blast radius: editor UI drives real DB writes; Portal render via revalidate

**pkg-block-forge-core (consume-only):**
- ZERO touch — engine frozen
- `renderForPreview(block, { variants })` is the render entrypoint in mini-preview iframe
- `composeVariants(base, variants[])` emits reveal rules; author-edited variant CSS scoped under `[data-variant="{name}"]` at render time

**app-portal (read-only verification):**
- Portal inlines variants + @container CSS reveals correct variant per WP-024 (already shipped)
- Revalidate `{ all: true }` tag-invalidation fires from Studio save (WP-027 Phase 4)
- Phase 4 verifies Portal renders the Studio-edited variant at the expected width (Playwright E2E)

**app-api (consume-only):**
- `updateBlockSchema` validates `variants?: Record<string, {html, css}>` since WP-024
- `PUT /api/blocks/:id` handler already forwards variants to Supabase write (no code change needed)
- Verify via live network trace in Phase 4 smoke

---

## PHASE 0: Audit (do FIRST)

Pre-flight RECON is load-bearing (memory `feedback_preflight_recon_load_bearing.md`, empirical 7/7 WP-028 phases). Document findings in `logs/wp-028/phase-4-result.md` §Pre-flight.

```bash
# 0. Baseline arch-test
npm run arch-test
# (expect: 499 / 0 — unchanged since Phase 3.5 exit)

# 1. Current VariantsDrawer LOC (target for +additions this phase)
wc -l \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
# (expect: 266 / 266 each; byte-identical body mod 3-line header)

# 2. Cross-surface VariantsDrawer body diff (baseline for Phase 4 regression detection)
diff -u \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
# (expect: 8-line diff — 3 content + diff markers; body byte-identical from line 4)

# 3. Snap byte-identity baseline
diff -u \
  tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap
# (expect: 0 lines — byte-identical)

# 4. session.ts current action types + reducer exports
grep -A 6 "SessionAction\|export function createVariant\|export function renameVariant\|export function deleteVariant" \
  tools/block-forge/src/lib/session.ts | head -40

# 5. Studio dispatchVariantToForm current shape (target for update-content extension)
grep -A 30 "export function dispatchVariantToForm" \
  apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx

# 6. block-editor.tsx handleVariantDispatch current signature + LOC deviation counter
grep -n "handleVariantDispatch\|dispatchVariantToForm\|VariantAction" \
  apps/studio/src/pages/block-editor.tsx
wc -l apps/studio/src/pages/block-editor.tsx
# (expect: ~31 LOC deviation cap 40; Phase 4 budget +0 — extend existing callback only)

# 7. updateBlockApi + Hono + validator variants path (verification only, zero-touch)
grep -n "variants" apps/studio/src/lib/block-api.ts apps/api/src/routes/blocks.ts packages/validators/src/block.ts
# (expect: variants already accepted through full stack)

# 8. Portal render test block candidate — find a published block with slots for variant testing
ls content/db/blocks/ | head -10
grep -l "block-fast-loading\|homepage-hero" content/db/blocks/*.json 2>&1 | head -3
# (expect: at least one published block available for Phase 4 Playwright smoke)

# 9. revalidate tags + payload shape
grep -A 10 "api/content/revalidate" apps/studio/src/pages/block-editor.tsx
# (expect: `{ all: true }` fire-and-forget post-save)

# 10. DB variants column state — any block currently has non-null variants?
# (Manual — query Supabase via existing tooling OR skip if DB access off-limits locally)
```

**Document findings, especially:**
- (a) VariantsDrawer baseline diff state (8 lines; body byte-identical)
- (b) session.ts reducer pattern (target for `updateVariantContent` addition)
- (c) block-editor.tsx LOC deviation count (31 baseline; cap 40)
- (d) Stack zero-touch confirmation — block-api.ts + Hono + validators all pre-accept variants
- (e) Candidate block for Portal Playwright verification (existing published block OR create test block in Phase 4)
- (f) Whether any production block currently has non-null variants in DB (baseline for "first real variants write" claim verification)

**IMPORTANT gotchas:**
- RHF `form.variants` is dirty-tracked WITHOUT explicit `register('variants')` because `setValue('variants', ..., { shouldDirty: true })` sufficient. Do NOT add register/Controller unless testing reveals stale isDirty.
- `composeVariants` emits `variantsRecord` with `{ html, css }` — Phase 4 editor writes `html` + `css` strings; engine handles scoping at render time.
- Debounced dispatch + Save button race: if user types → clicks Save fast, debounce-pending content is LOST unless we flush on save. Must fire pending on save handler entry.
- Portal CDN image rewriter (see Studio PARITY §9) — if test block has `<img>` tags, Portal output differs from Studio preview on `src` attribute. Pick a text-only block for Phase 4 verification OR normalize URLs in diff.
- Iframe in drawer has its own postMessage context — if element-click handler (Phase 2) fires inside the mini-preview iframe, TweakPanel may listen. Scope the drawer's iframe to NOT inject the click handler (pass `interactive: false` through composeSrcDoc OR filter in TweakPanel listener).

---

## Task 4.1: VariantsDrawer editor UI extension (inline, both surfaces byte-identical)

### What to Build

Extend existing VariantsDrawer with tabbed layout: **"Manage"** tab (current fork/rename/delete list — unchanged) + one tab per existing variant. Active variant tab shows 2-column content (base read-only / variant editable) + bottom mini-preview iframe panel.

```typescript
// BOTH SURFACES — byte-identical body mod 3-line header.
// Append to existing VariantsDrawer.tsx (current 266 LOC → ~450 LOC total).

// EXTEND VariantAction union:
export type VariantAction =
  | { kind: 'create'; name: string; html: string; css: string }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'delete'; name: string }
  | { kind: 'update-content'; name: string; html: string; css: string }  // Phase 4

// ADD Drawer tabs state:
type ActiveTab = 'manage' | string  // 'manage' OR variant name
const [activeTab, setActiveTab] = React.useState<ActiveTab>('manage')

// Handle active tab cleanup on delete/rename:
React.useEffect(() => {
  if (activeTab !== 'manage' && !(activeTab in variants)) {
    setActiveTab('manage')
  }
}, [variants, activeTab])

React.useEffect(() => {
  // If user renamed the active variant, follow the rename
  // (Phase 3 onAction('rename') already fires; this effect catches the state)
}, [variants])

// Tab bar inside DrawerContent (above current body):
<div className="flex gap-1 border-b border-[hsl(var(--border-default))] px-6 pt-3" data-testid="variants-drawer-tabs">
  <Button
    data-testid="variants-drawer-tab-manage"
    variant={activeTab === 'manage' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setActiveTab('manage')}
  >
    Manage
  </Button>
  {names.map((name) => (
    <Button
      key={name}
      data-testid={`variants-drawer-tab-${name}`}
      variant={activeTab === name ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(name)}
    >
      {name}
    </Button>
  ))}
</div>

// Body switches on activeTab:
{activeTab === 'manage' ? (
  /* Existing manage UI — unchanged */
) : (
  <VariantEditorPanel
    name={activeTab}
    baseHtml={baseHtml}
    baseCss={baseCss}
    variant={variants[activeTab]}
    onUpdate={(html, css) =>
      onAction({ kind: 'update-content', name: activeTab, html, css })
    }
  />
)}
```

### VariantEditorPanel — internal sub-component (same file)

```typescript
interface VariantEditorPanelProps {
  name: string
  baseHtml: string
  baseCss: string
  variant: { html: string; css: string }
  onUpdate: (html: string, css: string) => void
}

function VariantEditorPanel(props: VariantEditorPanelProps) {
  const { name, baseHtml, baseCss, variant, onUpdate } = props
  // Local controlled state — editor is the live source; debounce pushes to parent.
  const [html, setHtml] = React.useState(variant.html)
  const [css, setCss] = React.useState(variant.css)

  // Sync local state if parent variant changes (e.g. after rename, or undo restore).
  React.useEffect(() => {
    setHtml(variant.html)
    setCss(variant.css)
  }, [variant])

  // Ruling BB — 300ms debounce on textarea edits.
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const dispatch = React.useCallback((nextHtml: string, nextCss: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onUpdate(nextHtml, nextCss)
    }, 300)
  }, [onUpdate])

  // Cleanup on unmount — fire pending dispatch (Ruling BB flush-on-unmount).
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        // Flush last pending state so unmount doesn't drop user edits:
        onUpdate(html, css)
      }
    }
  }, [html, css, onUpdate])

  // Ruling CC — width slider default per variant name.
  const revealBp =
    name === 'sm' || /^4\d\d$/.test(name) ? 480 :
    name === 'md' || /^6\d\d$/.test(name) ? 640 :
    name === 'lg' || /^7\d\d$/.test(name) ? 768 :
    640  // non-convention fallback
  const [previewWidth, setPreviewWidth] = React.useState(revealBp)

  // Mini-preview srcdoc — rebuilt on content/width change.
  // Uses renderForPreview + composeSrcDoc (Ruling R' unified).
  const srcdoc = React.useMemo(() => {
    const variantList = [{ name, html, css }]  // single-variant render for this tab
    const preview = renderForPreview(
      { slug: 'variant-preview', html: baseHtml, css: baseCss },
      { variants: variantList },
    )
    return composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: previewWidth,
      slug: 'variant-preview',
    })
  }, [name, html, css, baseHtml, baseCss, previewWidth])

  return (
    <div className="flex flex-col gap-3 px-6 pb-4" data-testid={`variants-drawer-editor-${name}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Base HTML (read-only)
          </label>
          <textarea
            data-testid="variants-editor-base-html"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={baseHtml}
            readOnly
          />
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Base CSS (read-only)
          </label>
          <textarea
            data-testid="variants-editor-base-css"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={baseCss}
            readOnly
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Variant HTML
          </label>
          <textarea
            data-testid="variants-editor-variant-html"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={html}
            onChange={(e) => {
              const v = e.target.value
              setHtml(v)
              dispatch(v, css)
            }}
          />
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Variant CSS
          </label>
          <textarea
            data-testid="variants-editor-variant-css"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={css}
            onChange={(e) => {
              const v = e.target.value
              setCss(v)
              dispatch(html, v)
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2" data-testid="variants-editor-width-slider">
        <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
          Preview width
        </label>
        <input
          type="range"
          min={320}
          max={1440}
          step={10}
          value={previewWidth}
          onChange={(e) => setPreviewWidth(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-[number:var(--font-weight-medium)] text-[length:var(--text-sm-font-size)] tabular-nums">
          {previewWidth}px
        </span>
      </div>
      <iframe
        data-testid={`variants-editor-preview-iframe-${name}`}
        title={`Variant ${name} preview`}
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-64 rounded border border-[hsl(var(--border-default))]"
        style={{ width: `${previewWidth}px`, maxWidth: '100%' }}
      />
    </div>
  )
}

// Additional imports at top of VariantsDrawer.tsx:
import { renderForPreview } from '@cmsmasters/block-forge-core'
// Surface-specific composeSrcDoc import — same relative path pattern as existing sibling files:
//   Studio: import { composeSrcDoc } from './preview-assets'
//   block-forge: import { composeSrcDoc } from '../lib/preview-assets'
```

### Integration

- Parents (`ResponsiveTab.tsx` Studio + `App.tsx` block-forge) — NO prop changes; existing `onAction` already accepts new `update-content` kind.
- `dispatchVariantToForm` (Studio) + `handleVariantAction` (block-forge) add a case branch for `update-content` kind — 5-7 lines each.
- Snap regen on both surfaces — editor tabs + empty-state path change.

### Domain Rules

- Byte-identical body between surfaces from line 4 onwards. ONE surface-specific import: `composeSrcDoc` path differs (Studio `./preview-assets` vs block-forge `../lib/preview-assets`). Ruling GG accepts this as the sole non-body diff.
- Ruling Y (inline extension) — no new files; VariantEditorPanel is an internal sub-component in VariantsDrawer.tsx.
- Ruling Z (plain textareas) — no Monaco/CodeMirror; plain `<textarea>` with monospace font token.
- Ruling AA (4 textareas visible) — 2 read-only base + 2 editable variant.
- Ruling BB (300ms debounce + flush-on-unmount).
- Ruling CC (width slider default per variant name).
- Sandbox `allow-scripts allow-same-origin` mirrors main preview iframe (portal-parity).

---

## Task 4.2: `update-content` VariantAction wiring

### Studio (`ResponsiveTab.tsx`):

```typescript
// Extend dispatchVariantToForm switch:
switch (action.kind) {
  case 'create': /* existing */ break
  case 'rename': /* existing */ break
  case 'delete': /* existing */ break
  case 'update-content': {
    if (!(action.name in current)) return prev  // rename-race safety
    next = { ...current, [action.name]: { html: action.html, css: action.css } }
    break
  }
}
```

### block-forge (`session.ts` + `App.tsx`):

```typescript
// session.ts — NEW reducer + action type:
//
// ADD to SessionAction:
//   | { type: 'variant-update'; name: string; prev: BlockVariant }
//
// ADD reducer:
export function updateVariantContent(
  state: SessionState,
  name: string,
  content: BlockVariant,
): SessionState {
  const existing = state.variants[name]
  if (!existing) return state  // rename-race safety
  if (existing.html === content.html && existing.css === content.css) return state  // no-op
  return {
    ...state,
    variants: { ...state.variants, [name]: content },
    history: [...state.history, { type: 'variant-update', name, prev: existing }],
  }
}
//
// EXTEND undo():
//   case 'variant-update':
//     if (!(last.name in state.variants)) return { ...state, history }
//     return { ...state, variants: { ...state.variants, [last.name]: last.prev }, history }
//
// EXTEND isDirty() — no change needed (any variant-* action in history is already dirty).
```

```typescript
// App.tsx — extend handleVariantAction switch:
case 'update-content':
  setSession((prev) =>
    updateVariantContentFn(prev, action.name, { html: action.html, css: action.css }),
  )
  break
```

### block-editor.tsx (Studio):

Zero net LOC change (Ruling FF) — existing `handleVariantDispatch` callback already passes arbitrary `VariantAction` to `dispatchVariantToForm`; new kind is handled inside the helper. If trace reveals the switch is per-kind in parent, consolidate to single dispatch (still +0 net).

### Domain Rules

- Rename-race safety: editor dispatches `{name: 'sm', html, css}`; if user renamed sm→mobile while debounce was pending, reducer no-ops on the stale name (both Studio + block-forge). Drawer tab effect (§4.1) handles UI transition to 'manage' tab.
- No-op dedup in `updateVariantContent` — if debounce fires with identical content (e.g. user types+deletes), skip history entry.

---

## Task 4.3: Verify mini-preview renders correctly

### What to Build

Phase 2 iframe srcdoc injection (ResizeObserver + element-click delegator) fires inside every preview iframe that uses composeSrcDoc. The mini-preview iframe inside the drawer is a DIFFERENT context — element-click postMessages from this iframe MUST NOT hijack the main TweakPanel.

```typescript
// VariantsDrawer VariantEditorPanel — composeSrcDoc config:
// Option A: suppress click-handler injection (cleanest; requires composeSrcDoc opt-out param)
// Option B: filter in parent — TweakPanel listener already filters by currentSlug;
//   since drawer iframe uses slug 'variant-preview', the filter naturally excludes it.
//
// Ruling II — Option B (filter-based); no composeSrcDoc param changes.
// Document inline: drawer iframe uses slug 'variant-preview' which never matches
// currentSlug (always the real block slug), so TweakPanel handler silently
// discards the postMessage.
```

### Verification

Add a test case in both surfaces' `VariantsDrawer.test.tsx`:
```typescript
it('editor mini-preview iframe uses slug "variant-preview" — isolated from TweakPanel', () => {
  // Render drawer with 1 variant + open editor tab
  // Query iframe → assert data-testid="variants-editor-preview-iframe-sm"
  // Assert srcdoc content contains 'data-block-shell="variant-preview"'
})
```

### Domain Rules

- slug `'variant-preview'` is the drawer iframe convention — reserved; real blocks never use this slug.
- Playwright smoke should NOT find TweakPanel state changes after editor textarea changes (isolated event streams).

---

## Task 4.4: Studio save path E2E — first real DB variants write

### What to Build

No Studio code change needed — RHF dirty flag + Save footer + updateBlockApi + revalidate all already accept variants. Phase 4 VERIFIES the full stack works end-to-end.

### Verification (Playwright — mandatory per saved memory `feedback_visual_check_mandatory.md`):

```
Phase 4 Studio E2E flow (save screenshots to logs/wp-028/smoke-p4/):

1. Login to Studio (service key + session injection per memory feedback_visual_check_mandatory.md)
2. Navigate /blocks/{existing-block-id} (pick text-heavy block with slots — avoid image-only)
3. Open Responsive tab → Open Variants drawer → Fork 'sm'
4. Switch to 'sm' tab → Edit variant HTML: change a heading text (e.g. "Hello" → "Hello Mobile")
5. Edit variant CSS: add a color override (e.g. `h2 { color: #ff0000 }`)
6. Wait 500ms for debounce flush (optional — Save flushes too per Ruling BB)
7. Mini-preview iframe at 480px shows the edited variant content
8. Save block → button shows success toast → dirty indicator clears
9. NETWORK TRACE assert:
   - PUT /api/blocks/:id body.variants.sm = {html: "...Hello Mobile...", css: "...color: #ff0000..."}
   - Response 200 OK
   - POST /api/content/revalidate body = {all: true}
10. Refresh page → confirm variants persisted (GET /api/blocks/:id response.data.variants.sm intact)
11. Portal verification — navigate to published theme URL that uses this block
12. Resize viewport to 375px width → assert variant content renders ("Hello Mobile" visible, h2 color red)
13. Resize to 1440px → assert base content renders (original "Hello", default color)

Screenshots:
- wp028-p4-smoke-01-editor-open.png — drawer with 'sm' tab active + mini-preview
- wp028-p4-smoke-02-edited-textarea.png — variant HTML/CSS edited
- wp028-p4-smoke-03-save-success.png — dirty indicator cleared
- wp028-p4-smoke-04-db-persisted.png — browser devtools network tab showing PUT body + revalidate POST
- wp028-p4-smoke-05-portal-375.png — variant rendered at mobile width
- wp028-p4-smoke-06-portal-1440.png — base rendered at desktop width
```

**Manual DB check** (if Playwright can't reach DB): run `SELECT variants FROM blocks WHERE id = '{test-block-id}'` via existing Supabase tooling — confirm non-null JSONB after save.

### Domain Rules

- Ruling EE — Playwright Portal verification is MANDATORY; cannot punt to Phase 5.
- Test block choice — avoid image-heavy blocks (Portal CDN rewriter delta). Text-only OR simple structure preferred.
- Revalidate fire-and-forget — test accepts success even if revalidate timing varies; re-check after 2s if Portal stale on first try.

---

## Task 4.5: block-forge save path E2E

### What to Build

No code change needed — `session.variants` already flows into `updatedBlock.variants` at save (Phase 3 Task 3.4); fs.writeFileSync round-trips. Phase 4 VERIFIES.

### Verification (Playwright on port 7702):

```
1. Open block-forge → select test block
2. Fork 'sm' → switch to editor tab → edit variant HTML
3. Save → Status bar shows success
4. Open on disk: content/db/blocks/{slug}.json → verify variants.sm = {html: edited, css: base}
5. Refresh browser → block reloads from disk → session picks up persisted variants
6. Re-edit → save again → .bak contains pre-second-save state (not pre-first-save)
```

### Domain Rules

- `.bak` semantics (Phase 2 session): backedUp flag true after first save; `.bak` written once per session.
- Preserve non-variant fields in save roundtrip (id, name, block_type, hooks, metadata) — Phase 3 already handles.

---

## Task 4.6: Tests

### Editor unit tests (both surfaces' `VariantsDrawer.test.tsx` — extend with ~10 cases):

- `it('renders Manage tab by default')`
- `it('shows editor panel when switching to variant tab')`
- `it('textarea edit fires debounced update-content after 300ms')` — use `vi.useFakeTimers()`
- `it('flushes pending debounce on unmount')` — mount editor, type, unmount before 300ms, assert onAction called with final content
- `it('renames to active-tab variant → tab label updates but stays active')`
- `it('deletes active-tab variant → switches to Manage tab')`
- `it('mini-preview iframe uses slug variant-preview (TweakPanel isolation)')`
- `it('width slider defaults to sm→480 / md→640 / lg→768 / custom→640')`
- `it('parity snapshot — editor tab active with populated variant')` — `.toMatchSnapshot()`

### block-forge session unit tests (`session.test.ts` — extend with ~5 cases):

- `it('updateVariantContent appends history entry with prev payload')`
- `it('updateVariantContent no-op if content identical')`
- `it('updateVariantContent no-op if variant not found (rename race)')`
- `it('undo reverts updateVariantContent restoring prev content')`
- `it('isDirty true after updateVariantContent')`

### Integration tests:

**Studio** (`__tests__/integration.test.tsx` — extend):
- `it('editor → form.variants updated with shouldDirty → form.formState.isDirty true')`
- `it('editor → save → mock updateBlockApi called with variants payload including edited content')`

**block-forge** (`__tests__/integration.test.tsx` — extend):
- `it('editor → session.variants updated → save → fs POST body contains variant payload')`
- `it('save round-trip preserves edited variant content through fs write → re-read')`

### Tests count targets

- Studio: 92 → ~105 (+13: 9 editor + 2 integration + 2 behavioral for update-content dispatch)
- block-forge: 113 → ~130 (+17: 9 editor + 5 session + 2 integration + 1 preview-slug isolation)

### Domain Rules

- Debounce tests use `vi.useFakeTimers()` + `vi.advanceTimersByTime(300)`; reset fake timers in `afterEach`.
- `.snap` byte-identity preserved — describe names + tab names use generic strings (`'VariantsDrawer — editor tab'`), not surface-specific.

---

## Task 4.7: Playwright live smoke + Portal verification (MANDATORY)

Detailed flow per Task 4.4 above. Screenshots saved to `logs/wp-028/smoke-p4/`. At minimum 6 screenshots covering editor-open → edited → save-success → DB-persisted → portal-375 → portal-1440.

### Fallback if Portal auth blocks smoke

Per memory `feedback_visual_check_mandatory.md` — auth walls are solvable via service key + session injection. Do NOT punt to Phase 5. If blocked, the result log documents:
1. What was attempted (service key path, cookie injection, etc.)
2. Why it didn't work (specific error)
3. Surface to Brain for decision on workaround or temporary portal build

### Broaden smoke coverage (rolls in Phase 3.5 parked cleanup #2)

- 2+ variants simultaneously (create 'sm' + 'md') — verify both render at respective BPs
- Non-convention name ('custom') — verify console warning fires + no reveal rule emitted
- Delete variant via drawer → save → DB field updates to remove it (or null if empty)

---

## Task 4.8: PARITY.md §Variant Editor additive section — both files symmetric

### Changes

**Both PARITY.md files — new subsection (additive, after existing §Variant CRUD):**

```markdown
## §Variant Editor (WP-028 Phase 4)

Editor UI inside VariantsDrawer — tabbed layout:
- "Manage" tab — fork/rename/delete list (Phase 3, unchanged)
- Per-variant tabs — 2-column editor (base read-only | variant editable) + mini-preview iframe

Dispatch path: `onAction({ kind: 'update-content', name, html, css })` — debounced 300ms.

Mini-preview iframe uses slug `'variant-preview'` (reserved; isolated from TweakPanel listener).
Width slider: 320-1440, step 10. Default = variant reveal BP (sm→480, md→640, lg→768, custom→640).

Save path (per surface):
- Studio: `form.variants` → `updateBlockApi` → Supabase → `revalidate { all: true }`
- block-forge: `session.variants` → fs.writeFileSync → `content/db/blocks/{slug}.json`

First real DB variants write lands here — verified via Playwright portal render at variant BP.
```

### Discipline

Both files edited in SAME commit as code (§5). Verification: grep for `§Variant Editor` in both files post-edit.

---

## Files to Modify

**Modified:**
- `tools/block-forge/src/components/VariantsDrawer.tsx` — tabbed layout + VariantEditorPanel sub-component + VariantAction `update-content` kind (266 → ~450 LOC)
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` — +~9 editor cases
- `tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` — regen (editor tab state)
- `tools/block-forge/src/lib/session.ts` — +`updateVariantContent` reducer + `variant-update` action type + undo extension
- `tools/block-forge/src/__tests__/session.test.ts` — +~5 updateVariantContent cases
- `tools/block-forge/src/App.tsx` — handleVariantAction case for `update-content` (~5 lines)
- `tools/block-forge/src/__tests__/integration.test.tsx` — +~2 editor integration cases
- `tools/block-forge/PARITY.md` — §Variant Editor additive
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` — mirror of block-forge changes (byte-identical body)
- `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx` — +~9 editor cases (mirror)
- `apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` — regen
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — `dispatchVariantToForm` case for `update-content`
- `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` — +~2 editor integration cases + dispatchVariantToForm behavioral
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — §Variant Editor additive

**Zero touch (VERIFY):**
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — no new files (editor is inline sub-component)
- `.claude/skills/domains/**/SKILL.md` — Close-phase territory
- `workplan/WP-028-*.md` body — Close-phase territory
- `packages/ui/**` — Drawer barrel already complete; no new primitives
- `packages/validators/src/block.ts` — variants schema accepts edited payload
- `apps/studio/src/lib/block-api.ts` — already accepts variants since WP-027 Phase 4
- `apps/api/src/routes/blocks.ts` — validates via updateBlockSchema (pre-configured)
- `apps/portal/**` — read-only verification target; no code change
- `apps/studio/src/pages/block-editor.tsx` — ZERO LOC delta (Ruling FF; existing handleVariantDispatch handles new kind transparently)
- `tools/block-forge/src/lib/preview-assets.ts` — Phase 3.5 territory; unchanged
- `tools/block-forge/src/components/PreviewTriptych.tsx` — Phase 3.5 re-converged; unchanged

---

## Acceptance Criteria

- [ ] VariantsDrawer editor UI landed on both surfaces; editor body byte-identical mod 3-line header + 1 surface-specific composeSrcDoc import (Ruling GG)
- [ ] Snap byte-identity between surfaces = 0 lines diff
- [ ] `update-content` VariantAction kind wired end-to-end: drawer textarea → debounced dispatch → Studio RHF or block-forge session → full state update
- [ ] 300ms debounce + flush-on-unmount verified via test + live smoke (no lost edits on drawer close)
- [ ] Mini-preview iframe renders edited variant via renderForPreview + composeSrcDoc; width slider updates iframe live
- [ ] Mini-preview iframe uses slug `'variant-preview'` — TweakPanel listener filter excludes it (no cross-iframe event hijack)
- [ ] Active tab transitions correctly: rename → tab follows new name; delete → switches to 'manage' tab
- [ ] block-forge session.ts `updateVariantContent` reducer + `variant-update` action type + undo extension shipped; isDirty true after content edit
- [ ] Studio RHF dispatch: `form.setValue('variants', ..., { shouldDirty: true })` fires → `form.formState.isDirty === true`
- [ ] **First real DB variants write verified**: Studio Save → `PUT /blocks/:id` body.variants populated → Supabase row has non-null JSONB
- [ ] **Portal variant render verified via Playwright** (per memory `feedback_visual_check_mandatory.md`): 375px viewport renders variant content; 1440px renders base content. Screenshots saved.
- [ ] block-forge save writes updated variants to disk; refresh reload picks up persisted state; `.bak` semantics preserved
- [ ] PARITY.md §Variant Editor additive section on both files; §5 same-commit discipline
- [ ] `npm run arch-test` = 499 / 0 (Δ0 preserved; editor inline)
- [ ] `npx tsc --noEmit` clean both surfaces
- [ ] Studio tests: 92 → ~105 green
- [ ] block-forge tests: 113 → ~130 green
- [ ] block-editor.tsx LOC deviation unchanged from Phase 3.5 exit (31; cap 40 held)

---

## MANDATORY: Verification

```bash
echo "=== Phase 4 Verification ==="

# 1. Arch-test
npm run arch-test
echo "(expect: 499 / 0 — Δ0 preserved)"

# 2. Typecheck both surfaces
npx tsc --noEmit
cd tools/block-forge && npm run typecheck && cd ../..
echo "(expect: clean)"

# 3. Studio tests target
npm -w @cmsmasters/studio test 2>&1 | tail -5
echo "(expect: ≥ 105 passing)"

# 4. block-forge tests target
cd tools/block-forge && npm test 2>&1 | tail -5 && cd ../..
echo "(expect: ≥ 130 passing)"

# 5. Editor body byte-identical mod surface-specific composeSrcDoc import
diff -u \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
echo "(expect: ~10-line diff — 3 content + diff markers + 1 composeSrcDoc import path)"

# 6. Snap byte-identity
diff \
  tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap
echo "(expect: 0 lines)"

# 7. PARITY.md §Variant Editor present both files
grep -c "§Variant Editor\|Variant Editor (WP-028 Phase 4)" \
  tools/block-forge/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/PARITY.md
echo "(expect: both ≥ 1)"

# 8. Manifest + Phase 3.5 zero-touch
git diff --stat src/__arch__/domain-manifest.ts tools/block-forge/src/lib/preview-assets.ts tools/block-forge/src/components/PreviewTriptych.tsx
echo "(expect: empty — these are untouched)"

# 9. block-editor.tsx LOC stable
wc -l apps/studio/src/pages/block-editor.tsx
git diff --stat apps/studio/src/pages/block-editor.tsx
echo "(expect: 0 lines changed — Ruling FF held)"

# 10. Live Playwright smoke + Portal verification (MANDATORY)
# Detailed flow in Task 4.4. Screenshots to logs/wp-028/smoke-p4/

echo "=== Phase 4 verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification, create `logs/wp-028/phase-4-result.md` with:
- Pre-flight 10-step audit findings
- Brain Rulings Applied (Y–GG + II)
- Files Modified table with LOC deltas
- Test Counts table (baseline 92/113 → target ≥105/≥130)
- Parity diffs (editor body + snap + PARITY.md)
- Playwright smoke step-by-step with all 6+ screenshots
- Network trace evidence for first-real-DB-variants-write (PUT body.variants)
- Portal render verification evidence (375px variant + 1440px base)
- REIMPLEMENT lockstep metric update — projected 16-17 non-cosmetic diffs total. **If >15**, surface to Brain for Phase 5 re-audit (threshold breach triggers extract-vs-continue decision).
- Deviations from this prompt
- Open Questions for Phase 5 (dirty-state consolidation scope — any real conflicts discovered?)

---

## Git

```bash
git add \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  tools/block-forge/src/__tests__/VariantsDrawer.test.tsx \
  tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  tools/block-forge/src/lib/session.ts \
  tools/block-forge/src/__tests__/session.test.ts \
  tools/block-forge/src/App.tsx \
  tools/block-forge/src/__tests__/integration.test.tsx \
  tools/block-forge/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx \
  apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
  apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx \
  apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx \
  apps/studio/src/pages/block-editor/responsive/PARITY.md

git commit -m "feat(studio+tools): WP-028 Phase 4 — variant editor + first real DB variants write [WP-028 phase 4]"
```

Then embed implementation SHA into `logs/wp-028/phase-4-result.md` and commit log separately (Phase 2+3+3.5 pattern).

---

## IMPORTANT Notes for CC

- **Playwright portal verification is mandatory** — memory `feedback_visual_check_mandatory.md`; auth walls solvable via service key + session injection; do NOT defer to Phase 5.
- **First real DB variants write** — network trace PUT body + DB SELECT are both required evidence in result log.
- **block-editor.tsx zero LOC** — Ruling FF. If Phase 4 needs block-editor.tsx touch, STOP and escalate — deviation cap 40 is tight.
- **Byte-identical body discipline preserved** — ONE surface-specific import allowed (composeSrcDoc relative path); all other code byte-identical between surfaces.
- **Debounce flush-on-unmount** is load-bearing — without it, closing drawer mid-edit drops content silently.
- **Mini-preview slug 'variant-preview'** is a reserved convention — must not collide with real block slugs (enforced by slug regex `/^[a-z0-9-]+$/` — 'variant-preview' is valid but trivially avoidable as a real slug; document as convention).
- **Phase 3.5 territory (preview-assets.ts + PreviewTriptych + PARITY §7) still OFF-LIMITS** — Phase 4 scope does not need to touch the main preview stack.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 4 промпт готовий: `logs/wp-028/phase-4-task.md`.

## Структура

**8 tasks, ~4h budget (realistic ~5-5.5h with 1.3× multiplier; hard cap 6h → split trigger):**

| # | Task | Scope |
|---|------|-------|
| 4.1 | VariantsDrawer editor UI extension | Tabbed layout (Manage + per-variant); VariantEditorPanel inline sub-component; 4 textareas (2 ro base / 2 rw variant); mini-preview iframe + width slider. Byte-identical body mod 3-line header + 1 composeSrcDoc import |
| 4.2 | `update-content` VariantAction wiring | Extend VariantAction union; Studio dispatchVariantToForm case; block-forge session.ts `updateVariantContent` + `variant-update` action type + undo extension; App.tsx case |
| 4.3 | Mini-preview iframe isolation | Slug `'variant-preview'` reserved convention → TweakPanel listener filters by currentSlug; no cross-iframe hijack |
| 4.4 | Studio save path E2E — first real DB variants write | PUT /blocks/:id body.variants populated; Supabase row non-null; revalidate {all:true} fire; Portal Playwright verify |
| 4.5 | block-forge save path E2E | fs.writeFileSync round-trip; refresh reload intact; `.bak` semantics preserved |
| 4.6 | Tests | Studio 92→~105; block-forge 113→~130; editor unit + session reducer + integration coverage |
| 4.7 | Playwright live smoke + Portal verification | MANDATORY 6+ screenshots: editor-open → edited → save-success → DB-persisted → portal-375 → portal-1440 |
| 4.8 | PARITY.md §Variant Editor additive both files | §5 same-commit discipline |

## 9 Brain rulings locked

1. **Y — Editor inline in VariantsDrawer.tsx** — no new files; VariantEditorPanel as internal sub-component; arch-test Δ0 preserved; mirrors Ruling T from Phase 3.
2. **Z — Plain `<textarea>` editor** — no Monaco/CodeMirror; monospace token font; MVP per workplan.
3. **AA — 4 textareas** — 2 read-only base (baseHtml, baseCss) + 2 editable variant (variantHtml, variantCss).
4. **BB — 300ms debounce + flush-on-unmount** — mirrors Phase 2 tweak pattern; useRef(setTimeout) pattern; cleanup effect fires pending on unmount (prevents lost edits on drawer close).
5. **CC — Width slider default per variant name** — sm→480, md→640, lg→768, custom→640; range 320-1440 step 10; live drives iframe style width.
6. **DD — Save flow reuses existing paths** — Studio RHF.isDirty → existing footer; block-forge session.isDirty → existing status bar; no new Save buttons anywhere.
7. **EE — Playwright Portal verification MANDATORY** — memory `feedback_visual_check_mandatory.md`; auth walls via service key; cannot punt to Phase 5.
8. **FF — block-editor.tsx +0 LOC** — deviation stays at 31; existing handleVariantDispatch transparent to new action kind; cap 40 preserved.
9. **GG — Lockstep metric on threshold** — projected 16-17 diffs post-Phase-4. **Above ≤15 threshold.** Flag for Phase 5 extract-vs-continue re-audit; document in result log §Lockstep assessment.

## Additional rulings

- **II — Mini-preview slug reservation** — `'variant-preview'` is a reserved convention; TweakPanel listener's existing currentSlug filter excludes this iframe automatically. No composeSrcDoc opt-out param needed.

## Hard gates (inherited + Phase 4 additions)

- Zero touch: engine, manifest, SKILL files, workplan body, validators, pkg-ui primitives, block-api.ts, Hono routes, portal code.
- **Phase 3.5 territory OFF-LIMITS**: `preview-assets.ts` + `PreviewTriptych.tsx` + `preview-assets.test.ts` + PARITY §7 — UNTOUCHED.
- Zero new files — arch-test Δ0; editor is inline sub-component in VariantsDrawer.tsx.
- block-editor.tsx LOC deviation = 0 in Phase 4; total stays at 31 (cap 40).
- Editor body byte-identical between surfaces mod 3-line header + 1 surface-specific composeSrcDoc import (Ruling GG explicit exception).
- Snap byte-identity = 0 lines diff.
- PARITY.md §Variant Editor additive land SAME commit as code (§5).
- Playwright Portal verification MANDATORY; failure to reach Portal surfaces to Brain, not to Phase 5.

## Escalation triggers

- **Phase 4 at 4h without editor+save complete** → surface for Phase 4.5 split (Playwright + Portal verification as mini-phase).
- **REIMPLEMENT metric >15 non-cosmetic diffs** → Phase 5 re-audit mandatory; document in result log §Lockstep assessment with full diff enumeration.
- **RHF `setValue('variants', ...)` doesn't trigger isDirty** → investigate with Controller or explicit register; surface before writing editor code.
- **Debounce test fakeTimers race** — if `vi.useFakeTimers()` interferes with flush-on-unmount cleanup, use real timers + explicit `await new Promise(setTimeout(..., 310))`.
- **Portal Playwright auth wall** → memory mandates service key + session injection path; if still blocked after that, stop and surface (do NOT defer to Phase 5).
- **`.bak` round-trip loses variants** (unlikely — fs passthrough) → integration test catches; add case if regression detected.
- **Mini-preview TweakPanel hijack** (drawer iframe postMessage reaches TweakPanel) → add currentSlug filter test + surface; Ruling II should prevent this by design.
- **block-editor.tsx forced touch** → STOP; consider Phase 5.5 dispatch layer extraction (already parked memory).

## Arch-test target

**499 / 0** — unchanged. Editor UI inline; no new files; no manifest edit.

## Git state

- `logs/wp-028/phase-4-task.md` — new untracked
- Phase 3 + 3.5 result logs closed (`598d09fc` summary commit)
- Workplan body unchanged (Close-phase territory)
- Nothing staged

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найімовірніший fork — Ruling EE Portal verification → якщо вважаєш варто split as Phase 4.5 upfront; або Ruling Z editor component choice)
3. АБО Ruling FF block-editor.tsx zero-touch challenge — якщо бачиш potential overflow під час execution

Чекаю.
