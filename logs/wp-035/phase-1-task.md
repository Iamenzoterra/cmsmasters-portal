# WP-035 Phase 1: Forge ExportDialog (Clone deferred to Phase 3)

> Workplan: WP-035 Block Forge Sandbox + Export/Import — decouple authoring from production SOT
> Phase: 1 of 5 (Phase 4 collapsed into 3 per Phase 0 Ruling F)
> Priority: P1 — first user-facing deliverable; payload-export gate before Studio Import lands in Phase 2
> Estimated: 2.5–3.5 hours (was 4–6h with Clone; Clone scope-shifted to Phase 3 with sandbox)
> Type: Frontend (block-forge UI + new component + tests)
> Previous: Phase 0 ✅ (RECON, 6 rulings + GREEN product-RECON verdict, 2026-04-28)
> Next: Phase 2 (Studio Import UI — ImportDialog + new POST /api/blocks/import endpoint)
> Affected domains: `infra-tooling` (block-forge surface)

---

## Context

Phase 0 RECON locked 6 rulings + GREEN product-RECON. Phase 1 ships the **Forge-side export gate** — `ExportDialog.tsx` ported from layout-maker (Ruling D), wired into the existing footer StatusBar via a new `[Export]` button, with Download JSON / Copy payload affordances and toast confirmation. This is the first user-facing artifact of WP-035; its existence unblocks the manual roundtrip flow (`Forge Save → Forge Export → paste → Studio Import → Portal revalidate`) even before Phase 2 lands the Studio side.

```
CURRENT  ✅  Phase 0 result.md committed; rulings A-F approved 2026-04-28
CURRENT  ✅  layout-maker ExportDialog (217 LOC) — port reference, mapping table in §0.3
CURRENT  ✅  StatusBar.tsx (82 LOC) — footer toolbar; current home of Save button
CURRENT  ✅  App.tsx exposes `block` (BlockJson) + `composedBlock` (with effective CSS) in scope
CURRENT  ✅  globals.css receives bf-* class additions inline (precedent from existing components)
CURRENT  ✅  arch-test 580 / 580 baseline

MISSING  ❌  ExportDialog.tsx — no Forge-side payload export surface
MISSING  ❌  [Export] button in StatusBar — currently only [Save]
MISSING  ❌  bf-export-* CSS — namespace not yet established
MISSING  ❌  ExportDialog tests — no unit/integration coverage for clipboard/download paths
```

**Scope tightening vs WP-035 spec (Brain pre-flight finding):**

> WP-035 §Phase 1 originally bundled Clone + ExportDialog. **Clone is unsafe before Phase 3 sandbox migration**: with `SOURCE_DIR = content/db/blocks/`, every Clone writes `<slug>-copy-N.json` directly into the production seed — exactly the architectural smell WP-035 was born to fix. Phase 1 ships ExportDialog ONLY. Clone bundles into Phase 3 (sandbox + Clone in one phase, Clone always lands in sandbox dir). Net effort unchanged (~2-3h shifted from P1 → P3); risk eliminated.

If Brain disagrees, the alternative is to gate Clone in Phase 1 behind a `BLOCK_FORGE_SOURCE_DIR != content/db/blocks/` check (disabled with tooltip until Phase 3) — 30-min add. Default decision: **defer Clone to Phase 3**. User confirms or pushes back.

---

## Domain Context

### `infra-tooling`

- **Invariant — block-forge globals.css receives bf-* additions inline.** No separate stylesheet per component (precedent: VariantsDrawer, Inspector classes already inline in globals.css). New `bf-export-*` block lands at the bottom of `tools/block-forge/src/globals.css`.
- **Invariant — Tailwind v4 token usage.** `bg-[hsl(var(--bg-surface))]` for HSL colors; `h-[--button-height-sm]` bare-var for sizing; `text-[length:var(--text-sm-font-size)]` length hint for font sizes. Hardcoded styles are blocked by `lint-ds` pre-commit hook (saved memory `feedback_no_hardcoded_styles`).
- **Invariant — Test env mocks `?raw` CSS imports as empty unless `test: { css: true }`.** Already set in `tools/block-forge/vite.config.ts:217`. ExportDialog tests do not need `?raw` imports (no CSS injection); skip this gotcha but keep aware.
- **Invariant — `tools/*` is NOT an npm workspace.** No new `package.json` deps; ExportDialog uses plain React + `navigator.clipboard` + Blob API.
- **Invariant — StatusBar is pure presentational.** No effects, no state. App.tsx owns the dialog open/close state + payload generation. StatusBar gains a new `onExport` prop wired to `setShowExportDialog(true)`.
- **Trap — Pretty-print byte-parity.** Vite middleware writes `JSON.stringify(block, null, 2) + '\n'` (vite.config.ts:150). ExportDialog Download/Copy MUST produce the same byte sequence (trailing newline included) so a download → re-import round-trip is git-clean. Saved memory `feedback_fixture_snapshot_ground_truth` applies.
- **Trap — Test isolation for clipboard.** `navigator.clipboard.writeText` requires the test env to mock it. Vitest jsdom does NOT polyfill clipboard. Pattern: `vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })` per beforeEach.
- **Trap — Multi-render component tests need `afterEach(cleanup)` per saved memory `feedback_vitest_globals_false_cleanup`.** tools/block-forge has `globals: false` in vitest config; ExportDialog tests render twice (open + closed states) — DOM cleanup mandatory.

---

## Phase 1 Audit — re-baseline (do FIRST)

```bash
# 0. Baseline — confirm clean starting state
npm run arch-test                                       # expect: 580 / 580 (post-Phase 0 close baseline)

# 1. Read layout-maker ExportDialog reference (port source)
sed -n '1,217p' tools/layout-maker/src/components/ExportDialog.tsx
# Note: lm-export-* class names → port as bf-export-*; api.exportLayout fetch → drop
# (block payload is in-memory state); validation gating → drop (no equivalent for blocks);
# files: section → drop (no compiled-files concept); slot_config → drop (layout-only)

# 2. Read layout-maker CSS reference (port styles)
grep -n "lm-export" tools/layout-maker/src/styles/maker.css | head -30
sed -n '1477,1620p' tools/layout-maker/src/styles/maker.css
# Note: ~140 LOC of CSS; port as bf-export-* into tools/block-forge/src/globals.css

# 3. Read current StatusBar (where [Export] button mounts)
sed -n '1,82p' tools/block-forge/src/components/StatusBar.tsx

# 4. Read App.tsx footer mount + block state (where ExportDialog renders)
grep -n "StatusBar\|setSession\|setShowVariants\|VariantsDrawer" tools/block-forge/src/App.tsx | head -10
sed -n '550,575p' tools/block-forge/src/App.tsx

# 5. BlockJson shape — payload SOT
sed -n '1,30p' tools/block-forge/src/types.ts
# 11 keys: id, slug, name, html, css, js?, block_type?, hooks?, metadata?, is_default?, sort_order?, variants?
```

**Document findings briefly in §0 of result.md before proceeding.**

---

## Task 1.1: Port ExportDialog.tsx from layout-maker

### What to Build

New file: `tools/block-forge/src/components/ExportDialog.tsx` (~140-160 LOC)

**Adapt from `tools/layout-maker/src/components/ExportDialog.tsx`:**

```tsx
import { useState } from 'react'
import type { BlockJson } from '../types'

type Props = {
  block: BlockJson
  onClose: () => void
  onShowToast: (message: string) => void
}

export function ExportDialog({ block, onClose, onShowToast }: Props) {
  const [htmlOpen, setHtmlOpen] = useState(false)
  const [cssOpen, setCssOpen] = useState(false)
  const [jsOpen, setJsOpen] = useState(false)

  // Payload is in-memory state (NOT a server fetch). Pretty-print mirrors
  // Vite middleware's writeFile format (JSON.stringify(block, null, 2) + '\n')
  // so a download → re-import round-trip is git-clean.
  const payloadString = JSON.stringify(block, null, 2) + '\n'

  const handleCopyPayload = async () => {
    await navigator.clipboard.writeText(payloadString)
    onShowToast('Payload copied to clipboard.')
  }

  const handleDownloadJson = () => {
    const blob = new Blob([payloadString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${block.slug}.json`
    a.click()
    URL.revokeObjectURL(url)
    onShowToast('JSON downloaded.')
  }

  const lineCount = (s: string) => s.split('\n').length
  const hasJs = typeof block.js === 'string' && block.js.trim().length > 0
  const hasVariants = block.variants && Object.keys(block.variants).length > 0

  return (
    <div
      className="bf-export-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bf-export-dialog-title"
    >
      <div className="bf-export-dialog">
        <div className="bf-export-dialog__header">
          <span id="bf-export-dialog-title">Export: {block.slug}</span>
          <button
            type="button"
            className="bf-export-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="bf-export-dialog__body">
          <div className="bf-export-dialog__meta">
            <div className="bf-export-dialog__meta-row">
              <span className="bf-export-dialog__meta-label">slug</span>
              <code>{block.slug}</code>
            </div>
            <div className="bf-export-dialog__meta-row">
              <span className="bf-export-dialog__meta-label">name</span>
              <code>{block.name}</code>
            </div>
            {block.block_type && (
              <div className="bf-export-dialog__meta-row">
                <span className="bf-export-dialog__meta-label">type</span>
                <code>{block.block_type}</code>
              </div>
            )}
          </div>

          <div className="bf-export-dialog__section">
            <button
              type="button"
              className="bf-export-dialog__toggle"
              onClick={() => setHtmlOpen(!htmlOpen)}
            >
              {htmlOpen ? '▾' : '▸'} HTML ({lineCount(block.html)} lines)
            </button>
            {htmlOpen && (
              <pre className="bf-export-dialog__preview">{block.html}</pre>
            )}
          </div>

          <div className="bf-export-dialog__section">
            <button
              type="button"
              className="bf-export-dialog__toggle"
              onClick={() => setCssOpen(!cssOpen)}
            >
              {cssOpen ? '▾' : '▸'} CSS ({lineCount(block.css)} lines)
            </button>
            {cssOpen && (
              <pre className="bf-export-dialog__preview">{block.css}</pre>
            )}
          </div>

          {hasJs && (
            <div className="bf-export-dialog__section">
              <button
                type="button"
                className="bf-export-dialog__toggle"
                onClick={() => setJsOpen(!jsOpen)}
              >
                {jsOpen ? '▾' : '▸'} JS ({lineCount(block.js!)} lines)
              </button>
              {jsOpen && (
                <pre className="bf-export-dialog__preview">{block.js}</pre>
              )}
            </div>
          )}

          {hasVariants && (
            <div className="bf-export-dialog__section">
              <div className="bf-export-dialog__section-title">
                variants ({Object.keys(block.variants!).length})
              </div>
              <pre className="bf-export-dialog__preview bf-export-dialog__preview--short">
                {JSON.stringify(block.variants, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bf-export-dialog__actions">
          <button
            type="button"
            className="bf-btn bf-btn--primary"
            onClick={handleDownloadJson}
            data-action="download-json"
          >
            Download JSON
          </button>
          <button
            type="button"
            className="bf-btn"
            onClick={handleCopyPayload}
            data-action="copy-payload"
          >
            Copy payload
          </button>
          <button
            type="button"
            className="bf-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Domain Rules (from `infra-tooling` skill)

- Pretty-print payload MUST be `JSON.stringify(block, null, 2) + '\n'` — byte-parity with Vite middleware (vite.config.ts:150)
- Class names use `bf-export-*` prefix (mirror layout-maker `lm-export-*` convention)
- Dialog uses `role="dialog" aria-modal="true"` + `aria-labelledby` (a11y baseline)
- Backdrop click-to-close pattern (matches layout-maker UX)
- All buttons have `type="button"` (NEVER `type="submit"`; dialog mounts inside potential forms)

### Out of scope

- Validation gating (no schema validation on export — payload is in-memory editor state, already validated at Save)
- `files: { html, css }` section (no compiled-files concept for blocks)
- `slot_config` rendering (layout-only)
- `onExportSuccess` callback (no external-reload-banner equivalent in Forge)
- Server fetch (`api.exportLayout` pattern) — payload is in-memory; no roundtrip

---

## Task 1.2: Add bf-export-* CSS to globals.css

### What to Build

Append to `tools/block-forge/src/globals.css`:

**Port from `tools/layout-maker/src/styles/maker.css:1477-1620`** with these substitutions:

| LM token | BF substitution | Reason |
|---|---|---|
| `var(--lm-bg-overlay)` | `hsl(var(--black-alpha-60))` | LM uses local palette; BF uses Portal DS overlay token |
| `var(--lm-text-primary)` | `hsl(var(--text-default))` | Portal DS text token |
| `var(--lm-text-muted)` | `hsl(var(--text-muted))` | Portal DS muted token |
| `var(--lm-bg-surface)` | `hsl(var(--bg-surface))` | Portal DS surface token |
| `var(--lm-bg-elevated)` | `hsl(var(--bg-surface-alt))` | Portal DS elevated token |
| `var(--lm-border-subtle)` | `hsl(var(--border-default))` | Portal DS border token |
| `var(--lm-radius-md)` | `var(--rounded-lg)` | Portal DS radius |
| `var(--lm-shadow-lg)` | `var(--shadow-lg)` | Portal DS shadow |
| `--lm-text-sm` (font-size) | `var(--text-sm-font-size)` | Portal DS typography |
| Hardcoded `font-family: monospace` | `var(--font-family-monospace)` | Portal DS font |

**Required structure (mirror LM):**

```css
/* WP-035 Phase 1 — ExportDialog overlay + dialog. Port from layout-maker
   (lm-export-*) with Portal DS tokens. */
.bf-export-overlay {
  position: fixed;
  inset: 0;
  background: hsl(var(--black-alpha-60));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.bf-export-dialog {
  background: hsl(var(--bg-surface));
  border: 1px solid hsl(var(--border-default));
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-lg);
  width: min(720px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

/* ... port lm-export-dialog__header, __close, __body, __meta, __section,
       __toggle, __preview, __actions per LM source with substitution table ... */

.bf-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--rounded-md);
  border: 1px solid hsl(var(--border-default));
  background: hsl(var(--bg-surface));
  color: hsl(var(--text-default));
  font-size: var(--text-sm-font-size);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.bf-btn:hover { background: hsl(var(--bg-surface-alt)); }
.bf-btn--primary {
  background: hsl(var(--status-success-bg));
  color: hsl(var(--status-success-fg));
  border-color: hsl(var(--status-success-fg));
}
.bf-btn--primary:hover { opacity: 0.9; }
```

### Domain Rules

- **NO hardcoded styles** (saved memory `feedback_no_hardcoded_styles`). Every color/font/shadow/radius via Portal DS tokens.
- `lint-ds` pre-commit hook will reject hardcoded `fontFamily:`, hex colors, raw px font-sizes. Run `npm run lint-ds` (or invoke skill) after CSS append before committing.
- HSL convention: token stores raw `H S% L%` triplet; class uses `hsl(var(--token))` wrapper.

---

## Task 1.3: Wire [Export] button + dialog state into App.tsx + StatusBar

### What to Build

**Modify `tools/block-forge/src/components/StatusBar.tsx`:**

Add `onExport: () => void` to Props, render new `<button data-action="export">Export</button>` next to Save. Disabled state: `disabled={!sourcePath}` (no block selected = nothing to export).

```tsx
type Props = {
  sourcePath: string | null
  session: SessionState
  onSave: () => void
  onExport: () => void          // NEW
  saveInFlight: boolean
  saveError: string | null
}

// ... existing render ...

<button
  type="button"
  data-action="export"
  disabled={!sourcePath}
  onClick={onExport}
  className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs font-semibold text-[hsl(var(--text-default))] hover:bg-[hsl(var(--bg-surface-alt))] disabled:cursor-not-allowed disabled:opacity-50"
>
  Export
</button>

<button
  type="button"
  data-action="save"
  /* ... existing Save button unchanged ... */
>
```

**Modify `tools/block-forge/src/App.tsx`:**

1. Add state: `const [showExportDialog, setShowExportDialog] = useState(false)`
2. Add `onExport={() => setShowExportDialog(true)}` to `<StatusBar>` props
3. Add toast helper if not present (or reuse existing) — pattern: `showToast(msg: string)` setter
4. Render `<ExportDialog>` conditionally next to `<VariantsDrawer>`:

```tsx
{showExportDialog && composedBlock && (
  <ExportDialog
    block={composedBlock}
    onClose={() => setShowExportDialog(false)}
    onShowToast={(msg) => {
      // Reuse existing toast pattern OR setSaveError-style transient state.
      // If no existing toast infra: minimal addition — setExportToast(msg) +
      // useEffect timeout; OR document gap and use console.log + browser
      // alert as V1 fallback (Phase 5 polish if needed).
    }}
  />
)}
```

### Integration

- ExportDialog uses `composedBlock` (already in App.tsx scope, line 544 — has effective CSS post-tweaks/variants), NOT `block` (raw on-disk). Reason: user expects exported payload to reflect current editor state.
- If session is dirty, `composedBlock` differs from disk — that's correct UX; export reflects in-memory edits even if not yet saved.
- Disable Export button while `saveInFlight === true` (avoid race: Save mid-flight might mutate disk between dialog open and Copy click). Or: keep enabled but freeze payload at dialog open (current sketch does this — payload computed on render).

### Domain Rules

- Session dirty state has no Export gating (export reflects current state regardless of save status — user mental model: "show me what I'd ship right now")
- StatusBar prop additions are non-breaking (existing tests still pass; new tests add coverage for `onExport`)

---

## Task 1.4: Tests

### What to Build

**New file: `tools/block-forge/src/__tests__/ExportDialog.test.tsx`**

Coverage:
1. Renders with block payload (slug, name, line counts visible)
2. Backdrop click calls `onClose` (event.target === event.currentTarget)
3. Inner dialog click does NOT call `onClose`
4. Close button calls `onClose`
5. Toggle buttons reveal/hide HTML/CSS/JS preview sections
6. JS section absent when `block.js` empty/undefined
7. variants section absent when `block.variants` empty/null
8. variants section present when populated
9. Copy payload click → `navigator.clipboard.writeText` called with pretty-printed JSON + trailing newline; toast called with "Payload copied to clipboard."
10. Download JSON click → URL.createObjectURL called; toast called with "JSON downloaded."
11. Pretty-print byte-parity: stringified payload === `JSON.stringify(block, null, 2) + '\n'` (no trailing-newline drift)

**Test setup:**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ExportDialog } from '../components/ExportDialog'
import type { BlockJson } from '../types'

const fixture: BlockJson = {
  id: 1,
  slug: 'test-block',
  name: 'Test Block',
  html: '<div>hello</div>',
  css: '.test { color: red; }',
}

beforeEach(() => {
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
})

afterEach(() => {
  cleanup()        // saved memory feedback_vitest_globals_false_cleanup
  vi.unstubAllGlobals()
})

// ... tests ...
```

**Modify `tools/block-forge/src/__tests__/StatusBar` test (if exists):**

Search: `find tools/block-forge/src/__tests__ -name "StatusBar*"`. If exists, extend to cover new `onExport` prop. If absent, skip — StatusBar coverage was scoped out by precedent.

### Domain Rules

- Vitest `globals: false` requires explicit `afterEach(cleanup)` (saved memory `feedback_vitest_globals_false_cleanup`)
- `navigator.clipboard.writeText` mock via `vi.stubGlobal('navigator', ...)` (jsdom does not polyfill)
- Pretty-print byte-parity assertion: `expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify(fixture, null, 2) + '\n')`

---

## Task 1.5: Update domain-manifest.ts + arch-test

### What to Build

**Modify `src/__arch__/domain-manifest.ts`:**

Append to `infra-tooling.owned_files` array (under existing block-forge entries, in WP-035 Phase 1 comment block):

```ts
// WP-035 Phase 1: ExportDialog (Forge-side payload export). Ports
// layout-maker pattern; payload is in-memory state, no server roundtrip.
// Clone affordance deferred to Phase 3 (bundles with sandbox migration).
'tools/block-forge/src/components/ExportDialog.tsx',
'tools/block-forge/src/__tests__/ExportDialog.test.tsx',
```

**arch-test target: 580 → 582 (+2 owned_files).**

If arch-test reports differently (e.g., +3 because of an unexpected dual-ownership or new test file), STOP and document in result.md before committing.

---

## Task 1.6: Live smoke verification (Playwright/Chrome — MANDATORY)

Per saved memory `feedback_visual_check_mandatory`, UI-touching phases require live browser smoke in the SAME session. Visual checks are NEVER deferred.

```bash
# Start block-forge dev server (port 7702)
cd tools/block-forge && npm run dev &

# Wait for ready, then drive the UI:
# 1. Navigate http://localhost:7702
# 2. Pick any block (e.g., fast-loading-speed) from BlockPicker
# 3. Verify [Export] button visible in StatusBar (footer)
# 4. Click [Export] → ExportDialog opens; payload preview renders
# 5. Toggle HTML/CSS sections — content reveals/hides
# 6. Click [Copy payload] → toast "Payload copied to clipboard."
#    Verify clipboard via DevTools console: await navigator.clipboard.readText()
# 7. Click [Download JSON] → file `<slug>.json` downloads
# 8. Click backdrop → dialog closes
# 9. Re-open → click Close button → dialog closes
# 10. Screenshot full state (saved memory feedback_visual_qa — critically evaluate)
```

**Acceptance:**
- Dialog renders with Portal DS tokens (no hardcoded colors visible in DevTools)
- bf-export-* classes present (no lm-* leakage)
- Pretty-print preview matches on-disk format byte-for-byte (open downloaded JSON in editor, diff against `cat content/db/blocks/<slug>.json`)
- No console errors / warnings

**If toast infrastructure is missing in App.tsx**, document in result.md §Issues; the V1 fallback is `console.log(msg)` until Phase 5 adds toast (or reuse Studio's toast pattern as polish).

---

## Files to Modify

- `tools/block-forge/src/components/ExportDialog.tsx` — **NEW** (~140-160 LOC) — port + adapt from layout-maker
- `tools/block-forge/src/__tests__/ExportDialog.test.tsx` — **NEW** (~120-150 LOC) — coverage per Task 1.4
- `tools/block-forge/src/components/StatusBar.tsx` — **MODIFY** — add `onExport` prop + button (~10 LOC delta)
- `tools/block-forge/src/App.tsx` — **MODIFY** — add `showExportDialog` state, `<ExportDialog>` render, wire `onExport` (~15 LOC delta)
- `tools/block-forge/src/globals.css` — **MODIFY** — append bf-export-* CSS block (~140 LOC)
- `src/__arch__/domain-manifest.ts` — **MODIFY** — register 2 new files in `infra-tooling.owned_files` (+2 entries)

**Zero touch (hard gates):**
- `content/db/blocks/**` (production seed; Phase 3 migration territory)
- `apps/studio/**` (Studio Import = Phase 2)
- `apps/api/**` (Hono import endpoint = Phase 2)
- `packages/**` (no DS / validator / db changes)
- `tools/layout-maker/**` (read-only port reference)
- `tools/block-forge/PARITY.md` (Phase 5 close updates)
- Sandbox dir (does not exist yet; Phase 3)
- `workplan/WP-035-*.md` (Brain owns; Hands does not edit)

---

## Acceptance Criteria

- [ ] `tools/block-forge/src/components/ExportDialog.tsx` exists with prop shape `{ block, onClose, onShowToast }`, renders pretty-printed payload preview with collapsible HTML/CSS/JS sections + variants section (when populated)
- [ ] Pretty-print byte-parity: payload string === `JSON.stringify(block, null, 2) + '\n'` (asserted in tests)
- [ ] Backdrop click + Close button + dialog handler all fire `onClose`; inner dialog click does NOT fire `onClose`
- [ ] `[Copy payload]` calls `navigator.clipboard.writeText` with the byte-parity string + fires `onShowToast("Payload copied to clipboard.")`
- [ ] `[Download JSON]` creates Blob with `application/json` MIME, sets `<a download="${block.slug}.json">`, fires `onShowToast("JSON downloaded.")`
- [ ] `tools/block-forge/src/components/StatusBar.tsx` gains `onExport` prop + `[Export]` button; existing Save button untouched
- [ ] `tools/block-forge/src/App.tsx` adds `showExportDialog` state + renders `<ExportDialog>` with `composedBlock` (NOT raw `block`)
- [ ] `tools/block-forge/src/globals.css` gains bf-export-* CSS block; ZERO hardcoded colors/fonts/shadows; all values via Portal DS tokens
- [ ] `npm run lint-ds` (or skill invocation) passes — no token violations
- [ ] `tools/block-forge/src/__tests__/ExportDialog.test.tsx` passes with ≥10 cases covering interactions enumerated in Task 1.4
- [ ] All existing tests still pass (StatusBar, integration, file-io — no regressions)
- [ ] `npm run arch-test` returns **582 / 582** (+2 from 580 baseline)
- [ ] Live Playwright/Chrome smoke verified in session — screenshot captured + critically evaluated (saved memory `feedback_visual_qa`)
- [ ] Zero modifications to gated paths (content/db/blocks/, apps/studio/, apps/api/, packages/, tools/layout-maker/, PARITY.md, workplan/, sandbox dir)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: 582 / 582 — baseline 580 + 2 new owned_files)"

# 2. Block-forge tests
cd tools/block-forge && npm test -- --run
echo "(expect: all green — including new ExportDialog suite)"

# 3. Token lint
cd ../.. && npm run lint-ds || echo "(check: no hardcoded styles in globals.css addition)"

# 4. Typecheck
cd tools/block-forge && npx tsc --noEmit
echo "(expect: zero errors)"

# 5. Live smoke (manual or Playwright MCP — see Task 1.6)
cd ../.. && echo "→ start dev server, navigate :7702, click Export, screenshot"

# 6. Confirm zero changes outside expected files
git status --short
# Expect ONLY:
#   M tools/block-forge/src/App.tsx
#   M tools/block-forge/src/components/StatusBar.tsx
#   M tools/block-forge/src/globals.css
#   M src/__arch__/domain-manifest.ts
#   ?? tools/block-forge/src/components/ExportDialog.tsx
#   ?? tools/block-forge/src/__tests__/ExportDialog.test.tsx
#   ?? logs/wp-035/phase-1-result.md

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-035/phase-1-result.md`:

```markdown
# Execution Log: WP-035 Phase 1 — Forge ExportDialog

> Epic: WP-035 Block Forge Sandbox + Export/Import
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling

## What Was Implemented
{2-5 sentences — ExportDialog port from layout-maker, [Export] button in StatusBar, App.tsx wiring, bf-export-* CSS, tests, manifest update. Clone deferred to Phase 3 per Brain pre-flight finding.}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Clone scope | Deferred to Phase 3 | Without sandbox, Clone pollutes content/db/blocks/ — exactly the smell WP-035 fixes |
| Payload source | composedBlock (post-tweaks) | User expects export to reflect current editor state, not last-saved disk state |
| CSS namespace | bf-export-* | Mirror lm-export-* convention; tool-local prefix |
| Toast infra | {existing pattern OR V1 fallback documented} | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `tools/block-forge/src/components/ExportDialog.tsx` | created | ~150 LOC port from layout-maker |
| `tools/block-forge/src/__tests__/ExportDialog.test.tsx` | created | ~10+ test cases |
| `tools/block-forge/src/components/StatusBar.tsx` | modified | +onExport prop + button |
| `tools/block-forge/src/App.tsx` | modified | +showExportDialog state + render |
| `tools/block-forge/src/globals.css` | modified | +bf-export-* CSS block |
| `src/__arch__/domain-manifest.ts` | modified | +2 owned_files in infra-tooling |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean. Document toast infra gap if it surfaces.}

## Open Questions
{Non-blocking questions. "None" if none. Phase-2 prep notes acceptable.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ 582 / 582 |
| block-forge tests | ✅ N tests green |
| lint-ds | ✅ no token violations |
| typecheck | ✅ zero errors |
| Live smoke (browser) | ✅ Export → Copy → Download → Close all functional |
| Visual QA (screenshot eval) | ✅ Portal DS tokens applied; no hardcoded styles visible |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add tools/block-forge/src/components/ExportDialog.tsx \
        tools/block-forge/src/__tests__/ExportDialog.test.tsx \
        tools/block-forge/src/components/StatusBar.tsx \
        tools/block-forge/src/App.tsx \
        tools/block-forge/src/globals.css \
        src/__arch__/domain-manifest.ts \
        logs/wp-035/phase-1-result.md

git commit -m "feat(block-forge): WP-035 phase 1 — ExportDialog (Download JSON / Copy payload) [WP-035 phase 1]"
```

---

## IMPORTANT Notes for CC (Hands)

- **Read Phase 0 result.md first** (`logs/wp-035/phase-0-result.md`) — Rulings A-F locked; Ruling D maps fields verbatim; do not deviate.
- **Clone is deferred to Phase 3** per Brain pre-flight finding (sandbox + Clone bundle). DO NOT add Clone in Phase 1 even if WP-035 spec mentions it. If user explicitly overrides this in chat, surface back to Brain — not silently re-add.
- **ExportDialog payload is `composedBlock`, NOT `block`.** composedBlock includes effective CSS post-tweaks/variants. App.tsx already exposes it (line 544).
- **Pretty-print byte-parity is load-bearing.** Test asserts `JSON.stringify(block, null, 2) + '\n'`. Vite middleware writes the same string at vite.config.ts:150. A round-trip download → Studio import (Phase 2) → Forge re-fetch should produce zero git diff. Saved memory `feedback_fixture_snapshot_ground_truth`.
- **CSS port from layout-maker MUST swap LM tokens for Portal DS tokens** per Task 1.2 substitution table. NEVER copy raw `var(--lm-*)` references — `lint-ds` rejects unknown tokens; saved memory `feedback_no_hardcoded_styles`.
- **Live smoke is MANDATORY** — saved memory `feedback_visual_check_mandatory`. UI-touching phase requires same-session browser check. If Playwright/Chrome MCP unavailable, document why in result.md §Issues; do NOT mark phase ✅ COMPLETE without visual evidence.
- **Visual QA is critical evaluation, not checkbox-ticking** — saved memory `feedback_visual_qa`. Screenshot the full dialog; check token values in DevTools; verify CSS variable resolution; only THEN mark done.
- **Vitest globals false** — `afterEach(cleanup)` mandatory in ExportDialog.test.tsx (saved memory `feedback_vitest_globals_false_cleanup`).
- **navigator.clipboard mock pattern** — `vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })`. jsdom does not polyfill clipboard API.
- **Toast infrastructure** — if App.tsx already has a toast pattern (e.g., from VariantsDrawer or save flow), reuse. If absent, V1 fallback is `console.log(msg)` for the demo + document gap in result.md (Phase 5 polish absorbs proper toast).
- **Stop and surface to Brain immediately** if:
  - layout-maker ExportDialog source has changed since Phase 0 §0.3 mapping table → re-validate field substitutions before porting
  - composedBlock is not exposed in App.tsx scope (refactor since Phase 0) → use raw `block` and document the regression
  - lint-ds fails on a Portal DS token mismatch → STOP, do not commit; ask which token replacement is correct
  - arch-test reports +3 instead of +2 → unexpected dual-ownership or test discovery; investigate before commit
  - Live smoke surfaces a hardcoded color in DevTools → STOP, fix before commit (memory: zero tolerance)
- **Saved memories to honor:**
  - `feedback_visual_check_mandatory` — live browser check same session
  - `feedback_visual_qa` — critically evaluate screenshot, don't tick boxes
  - `feedback_no_hardcoded_styles` — zero hardcoded colors/fonts/shadows
  - `feedback_vitest_globals_false_cleanup` — afterEach(cleanup) mandatory
  - `feedback_fixture_snapshot_ground_truth` — byte-parity assertions on payload format
  - `feedback_lint_ds_fontfamily` — pre-commit blocks `fontFamily:` lines; use `// ds-lint-ignore` only if non-inherited font is required (likely zero hits this phase)

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
