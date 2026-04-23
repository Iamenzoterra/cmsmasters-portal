# WP-027 Phase 2 — ResponsivePreview + token injection + variant-display

**For:** Hands agent
**From:** Brain (via planning assistant)
**WP:** `workplan/WP-027-studio-responsive-tab.md` (amended)
**Phase 1 result:** `logs/wp-027/phase-1-result.md` — 489/0 green; 2-tab bar live; session-state pure mirror; preview-assets.ts is TODO stub
**Phase 0 result:** `logs/wp-027/phase-0-result.md` — carry-overs (e), (f), (i) are load-bearing this phase
**Goal:** Replace preview-assets.ts stub + PreviewPanel/ResponsivePreview stubs with the real WP-026 injection contract mirrored for Studio. 3-panel triptych at 1440/768/375 renders any DB block (including variant-bearing ones via Path B composition). `preview-assets.test.ts` stub becomes real contract tests. Manual parity check against a composed-page block confirms byte-identical render vs. Portal. arch-test stays 489/0 (no manifest changes).

---

## Context you MUST load first

1. `workplan/WP-027-studio-responsive-tab.md` — Phase 2 tasks 2.1–2.7, Key Decisions, amendments block
2. `logs/wp-027/phase-0-result.md` — §0.6 (composeVariants signature + call rehearsal), §0.11 (PARITY seed), §0.3 (block-preview.tsx current state — **do NOT touch**), §0.13 (dev port)
3. `logs/wp-027/phase-1-result.md` — confirm what stubs currently contain (placeholder comments + 6/7 path depth note in preview-assets.ts)
4. `tools/block-forge/src/lib/preview-assets.ts` — **authoritative source for the injection contract.** Your `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` mirrors this byte-for-byte (paths + sandbox ordering are the only deviations; see Brain rulings below).
5. `tools/block-forge/src/__tests__/preview-assets.test.ts` — **authoritative test template.** Mirror case-for-case; Studio's version tests the same contract at the same assertions.
6. `tools/block-forge/PARITY.md` — contract doc; your `responsive/PARITY.md` already has the verbatim seed from Phase 1. Finalize this phase.
7. `tools/block-forge/src/components/PreviewPanel.tsx` + `PreviewTriptych.tsx` — reference components (iframe + ResizeObserver + scale-to-fit pattern). Your new files mirror shape but use Studio's design tokens for any chrome.
8. `packages/block-forge-core/src/compose/compose-variants.ts` + `packages/block-forge-core/src/index.ts` — engine exports. Reconfirm `renderForPreview` and `composeVariants` signatures at read-time (don't trust memory).
9. `apps/portal/app/[[...slug]]/page.tsx` — composed-page renderer; the parity-check reference. (Not the theme-page `apps/portal/app/themes/[slug]/page.tsx:189` — that has the known `.slot-inner` bypass; see Brain ruling below.)

---

## Brain rulings locked for Phase 2 (do NOT re-litigate)

1. **Path B for variants.** `renderForPreview(block, { variants: variantList })` — engine absorbs `composeVariants` internally. DB → engine conversion:
   ```ts
   const variantList: Variant[] = block.variants
     ? Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))
     : []
   ```
   Single call, no manual composeVariants step in the UI layer.

2. **Double-wrap resolution — Option (a): Studio composeSrcDoc drops `data-block-shell` wrap.** `renderForPreview` already emits `<div data-block-shell="{slug}">...</div>` via `wrapBlockHtml` (`packages/block-forge-core/src/compose/render-preview.ts:45`). tools/block-forge composeSrcDoc ALSO wraps because its MVP feeds raw block.html without engine pre-wrap. Studio can't mirror byte-identically without double-wrap. Resolution: Studio's composeSrcDoc wraps ONLY `<div class="slot-inner">${html}</div>`; the inner shell comes pre-wrapped upstream. Documented as PARITY §7. Forward-compatible — WP-028 adding variants to block-forge will re-converge the pattern.

3. **Do NOT pass `{ width }` to `renderForPreview`** — its width option adds ANOTHER `<div style="max-width:...">...</div>` wrap (`render-preview.ts:47`), triple-wrap hazard. Per-BP width lives in composeSrcDoc's body CSS only. Pass `{ variants }` only.

4. **`?raw` path depth from `responsive/` subtree.** 6 `..` from source files, 7 `..` from `__tests__/` files (carry-over (f), verified Phase 0). Full paths:
   - From `preview-assets.ts`:
     - `'../../../../../../packages/ui/src/theme/tokens.css?raw'`
     - `'../../../../../../packages/ui/src/theme/tokens.responsive.css?raw'`
     - `'../../../../../../packages/ui/src/portal/portal-blocks.css?raw'`
     - `'../../../../../../packages/ui/src/portal/animate-utils.js?raw'`
   - From `__tests__/preview-assets.test.ts` (if it imports the same assets for assertions): one more `../` level = 7 dots.

5. **Sandbox attribute order: `"allow-scripts allow-same-origin"`** (WP-026 order; PARITY.md Studio deviation §3). Do NOT mirror `apps/studio/src/components/block-preview.tsx`'s `"allow-same-origin"` — that file is untouched per hard gate.

6. **Manual parity check uses a composed-page block, NOT a theme-page slot block.** `apps/portal/app/themes/[slug]/page.tsx:189` has a known `.slot-inner` bypass (app-portal SKILL forward-risk, Phase 0 §0.1 trap). Variant-bearing blocks in theme-page slot-closure render differently portal vs. iframe preview. Pick a block rendered via `apps/portal/app/[[...slug]]/page.tsx` (composed page) for the byte-identical parity test.

7. **Block prop wiring.** `ResponsiveTab` accepts `{ block: Block | null }` prop. `block-editor.tsx` passes `existingBlock` (the DB-loaded useState value) to it. **Phase 2 does NOT tie the preview to live-form edits** — that's Phase 4 concern (when accept/reject mutates CSS via `form.setValue('code', …)`). For Phase 2 MVP, preview reflects the DB snapshot as loaded; form edits don't live-update the iframe. Simpler MVP, clean separation.

8. **DS token discipline (self-correction from Phase 1).** Any code example below OR your own code for chrome / buttons / panels / labels uses `hsl(var(--...))` / `var(--spacing-*)` / `var(--text-*-font-size)` tokens. Zero hardcoded hex, zero hardcoded px values (other than the breakpoint widths 1440/768/375 which are data, not style). `lint-ds` will reject on commit otherwise.

---

## Hard gates (unchanged from Phase 1 + Phase 2 additions)

- **Do NOT touch:** `apps/studio/src/components/block-preview.tsx` (studio-core-owned; regression risk).
- **Do NOT refactor:** existing Process button, BlockImportPanel, any FormSection, any Save footer logic.
- **Do NOT call engine functions** in ways other than `renderForPreview(block, { variants })` Path B. No direct `composeVariants` calls in UI layer.
- **Do NOT add new pkg-ui primitives.** Re-use Studio's existing design primitives for any chrome (borders, buttons, labels). If no existing primitive fits, inline style with token vars.
- **Do NOT touch `apps/api/**`.** Preview is read-only from the frontend; no new API routes.
- **Do NOT add new manifest entries.** All Phase 2 work is on files already registered in Phase 1 (the 8 source + 4 test stubs). `preview-assets.ts` moves from `export {}` stub to real content; `preview-assets.test.ts` replaces `describe.skip` with real tests. Same paths, same registration.
- **Do NOT edit `tools/block-forge/**`.** That's the reference implementation; any cross-surface parity updates to `tools/block-forge/PARITY.md` are Phase 5 Close concern (approval gate).
- **No engine calls in `preview-assets.ts` itself** — keep it a pure composer of srcdoc strings. Engine calls happen in `ResponsivePreview.tsx`.

---

## The 9 tasks

### 2.1 `preview-assets.ts` — real content (with deliberate PARITY deviation vs. block-forge)

Replace the stub at `apps/studio/src/pages/block-editor/responsive/preview-assets.ts`.

**⚠ CRITICAL BLOCKER RESOLUTION — double-wrap collision.** `renderForPreview` (engine) already wraps output html in `<div data-block-shell="{slug}">...</div>` (`render-preview.ts:45` via `wrapBlockHtml`). `tools/block-forge/src/lib/preview-assets.ts:70` ALSO wraps (`<div class="slot-inner"><div data-block-shell="${slug}">${html}</div></div>`) — block-forge avoids the collision because its MVP feeds RAW `block.html` into composeSrcDoc without engine pre-wrap. Studio, per Brain ruling 1 (Path B), MUST call `renderForPreview(block, { variants })` first — so Studio's composeSrcDoc MUST NOT re-wrap `data-block-shell`. **Resolution (Brain-approved option a):** Studio's composeSrcDoc wraps ONLY `<div class="slot-inner">${html}</div>` — trusts the caller to pre-wrap via `renderForPreview`. Documented as PARITY §7 deviation (task 2.7). Forward-compatible: when WP-028 adds variants to block-forge, its composeSrcDoc will adopt the same pattern, re-converging PARITY.

**⚠ CRITICAL gotcha #2 — don't pass `width` to `renderForPreview`.** `renderForPreview`'s `{ width }` option wraps html in ANOTHER `<div style="max-width: {width}px; margin: 0 auto;">` (`render-preview.ts:47`). Triple-wrap hazard. Studio calls `renderForPreview(block, { variants })` WITHOUT width; composeSrcDoc uses width for body CSS only. Enforced in task 2.4.

**Contract — structurally mirror `tools/block-forge/src/lib/preview-assets.ts`, with TWO deviations:**

```ts
import tokensCSS from '../../../../../../packages/ui/src/theme/tokens.css?raw'
import tokensResponsiveCSS from '../../../../../../packages/ui/src/theme/tokens.responsive.css?raw'
import portalBlocksCSS from '../../../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../../../packages/ui/src/portal/animate-utils.js?raw'

// Inline — NOT exported (mirrors tools/block-forge/src/lib/preview-assets.ts:19 which is `const`
// not `export const`). Any change here breaks PARITY contract with block-forge.
const SLOT_CONTAINMENT_RULE = `.slot-inner {
  container-type: inline-size;
  container-name: slot;
}`

export type ComposeSrcDocInput = {
  /** Pre-wrapped html from renderForPreview — contains <div data-block-shell="{slug}">...</div> */
  html: string
  /** Pre-stripped css from renderForPreview (stripGlobalPageRules already applied) */
  css: string
  /** Optional per-block JS blob appended after animate-utils */
  js?: string
  /** Breakpoint width in px: 1440 | 768 | 375 */
  width: number
  /** Block slug — used for postMessage filter payload, NOT for DOM wrapping */
  slug: string
}

export function composeSrcDoc(input: ComposeSrcDocInput): string {
  const { html, css, js, width, slug } = input
  const jsBlock = js ? `<script type="module">${js}</script>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${width}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @layer tokens, reset, shared, block;
    @layer tokens {
      ${tokensCSS}
      ${tokensResponsiveCSS}
    }
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Manrope', system-ui, sans-serif;
        width: ${width}px;
        overflow: hidden;
        background: white;
      }
    }
    @layer shared {
      ${portalBlocksCSS}
      ${SLOT_CONTAINMENT_RULE}
    }
    @layer block {
      ${css}
    }
  </style>
</head>
<body>
  <div class="slot-inner">${html}</div>
  <script type="module">${animateUtilsJS}</script>
  ${jsBlock}
  <script>
    const ro = new ResizeObserver((entries) => {
      const h = Math.ceil(entries[0].contentRect.height);
      parent.postMessage({ type: 'block-forge:iframe-height', slug: ${JSON.stringify(slug)}, width: ${width}, height: h }, '*');
    });
    ro.observe(document.body);
  </script>
</body>
</html>`
}
```

**Deviations from `tools/block-forge/src/lib/preview-assets.ts` (deliberate, documented in PARITY §7):**
1. Body wraps ONLY `<div class="slot-inner">${html}</div>` — NO inner `<div data-block-shell="${slug}">` (that wrap comes from `renderForPreview` upstream in Studio's pipeline).
2. Everything else byte-identical: @layer order, tokens injection, body reset, portal-blocks + SLOT_CONTAINMENT_RULE in shared, block CSS layer, Google Fonts preconnect + link, animate-utils script, optional js blob, ResizeObserver postMessage with `"block-forge:iframe-height"` literal.

**Key implementation notes:**
- **postMessage type literal MUST be `"block-forge:iframe-height"`** — contract-pinned in tests + PARITY §runtime-injection. Rename forces cross-surface test updates; don't rename.
- **No `</script>` escape logic** — block-forge reference has none; Studio matches. Block authors are expected to not write `</script>` inside CSS/JS (same convention). Adding escape here would deviate from PARITY without reason.
- **No engine imports** in preview-assets.ts — keep it pure srcdoc composition. ResponsivePreview (task 2.4) calls `renderForPreview` and feeds output into composeSrcDoc.
- **`SLOT_CONTAINMENT_RULE` is NOT exported** — inline const only, matches reference. Don't export it; tests read it via substring match on the output string, not import.

**LOC budget:** ~80 lines (close to the block-forge version; slightly shorter due to single-wrap body).

### 2.2 `__tests__/preview-assets.test.ts` — mirror 9 reference cases + 1 Studio-specific

Replace the Phase-1 stub. Mirror `tools/block-forge/src/__tests__/preview-assets.test.ts` case-for-case (a–i), then adapt the DOM-hierarchy case (b) for Studio's pre-wrap input shape + add ONE Studio-specific case for the deviation contract.

**File header (mirror reference):**
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { composeSrcDoc } from '../preview-assets'

const MINIMAL = {
  html: '<div data-block-shell="test-block"><section>hi</section></div>',  // ← pre-wrapped (Studio deviation)
  css: '.x { color: red; }',
  width: 1440,
  slug: 'test-block',
}
```

Note the MINIMAL `html` already contains `<div data-block-shell="test-block">` — this simulates the upstream `renderForPreview` output. Reference uses raw `<section>hi</section>`; Studio's unit test feeds pre-wrapped input.

**9 reference cases, 1 Studio case — expected test list:**

- **(a)** `@layer` declaration order exactly `tokens, reset, shared, block` — regex match on `@layer tokens, reset, shared, block;` appearing BEFORE any `@layer <name> {` block.
- **(b)** Body DOM hierarchy via DOMParser: `body > div.slot-inner > div[data-block-shell="kebab-slug"] > <inner>`. Input: `MINIMAL` with `slug: 'kebab-slug'`, `html: '<div data-block-shell="kebab-slug"><p id="inside">x</p></div>'`. Assert `slotInner.querySelector(':scope > div[data-block-shell="kebab-slug"]')` non-null + `#inside` nested inside the shell. **Studio-specific note in comment:** data-block-shell comes from pre-wrapped input (upstream `renderForPreview`), NOT from composeSrcDoc — deviation vs. block-forge documented in PARITY §7.
- **(c)** Slug reflected verbatim in the iframe output — appears in data-block-shell (via pre-wrap) AND in postMessage payload. Use `toContain('data-block-shell="kebab-slug"')` + `toContain("slug: \"kebab-slug\"")` (postMessage `JSON.stringify(slug)`).
- **(d)** Width reflected in meta viewport AND body rule — `<meta name="viewport" content="width=768" />` + `body { ... width: 768px ... }` regex.
- **(e)** BOTH `tokens.css` + `tokens.responsive.css` injected inside `@layer tokens` block — substring `--bg-page:` (from tokens.css) AND `--space-section:` (from tokens.responsive.css). Both appear in slice `out.slice(tokensStart, resetStart)`. **`css: true` landmine:** without it these substrings would never appear.
- **(f)** `.slot-inner` containment rule present inside `@layer shared { ... }` — regex `/\.slot-inner\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*slot[^}]*\}/`, scoped to slice between `@layer shared {` and `@layer block {`.
- **(g)** Optional js block — without `js`, count of `<script type="module">` occurrences = N (animate-utils only); with `js: 'console.log("block-js");'`, count = N+1 AND output contains the literal `'console.log("block-js");'`.
- **(h)** Empty html/css doesn't crash — `composeSrcDoc({ ...MINIMAL, html: '', css: '' })` does NOT throw. Output contains `<div class="slot-inner"></div>` (empty slot-inner for Studio, NOT `<div data-block-shell="test-block"></div>` like block-forge — reflects the deviation).
- **(i)** postMessage type literal pinned to `'block-forge:iframe-height'` — `toContain("type: 'block-forge:iframe-height'")`.
- **(studio-1)** composeSrcDoc does NOT emit an inner `data-block-shell` wrapper on its own — when input html has NO `data-block-shell`, output body is `<div class="slot-inner">{raw-html}</div>` with no injected shell. Verifies the deviation contract. Input: `{ ...MINIMAL, html: '<section>plain</section>', slug: 'plain-slug' }`; assert body DOM `body > div.slot-inner > section` (no `data-block-shell` descendant) AND `slug: "plain-slug"` still present in postMessage. This test guards against accidentally re-adding the wrap.

**Key gotcha — `css: true` landmine (saved memory `feedback_vitest_css_raw.md`):** without `test: { css: true }` in `apps/studio/vite.config.ts`, the `?raw` CSS imports load as empty strings; assertions on `--bg-page:` / `--space-section:` would silently pass against `''`. Phase 1 set `css: true` — verify before running tests. If tests pass suspiciously fast, check `apps/studio/vite.config.ts:test.css === true`.

**Verification:**
```bash
npm -w @cmsmasters/studio test -- preview-assets.test.ts
```
10 cases green (9 mirror + 1 Studio-specific).

### 2.3 `PreviewPanel.tsx` — iframe + ResizeObserver + scale-to-fit

Replace stub at `apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx`.

**Contract — mirror `tools/block-forge/src/components/PreviewPanel.tsx`:**

```tsx
interface PreviewPanelProps {
  srcdoc: string          // from composeSrcDoc(...)
  width: number           // 1440 | 768 | 375
  label?: string          // e.g. "Desktop 1440" — rendered above iframe
}

export function PreviewPanel({ srcdoc, width, label }: PreviewPanelProps) {
  // - single <iframe> with srcDoc={srcdoc}, sandbox="allow-scripts allow-same-origin"
  //   ← CRITICAL: allow-scripts FIRST per Brain ruling 3 + PARITY §sandbox
  // - ResizeObserver on container to compute available pane width
  // - Scale factor: containerWidth / iframeWidth if containerWidth < iframeWidth, else 1
  // - postMessage listener for "block-forge:iframe-height" → sets iframe height state
  // - Label rendered above iframe with DS tokens (hsl(var(--text-muted)), var(--text-xs-font-size))
}
```

**Critical details:**
- **postMessage listener scope:** filter `event.data?.type === 'block-forge:iframe-height'` AND `event.data?.slug` matches the currently-rendered block to avoid cross-iframe pollution if multiple panels mount. (tools/block-forge pattern.)
- **Scale-to-fit clamp:** don't scale UP — only DOWN. If container is wider than the iframe target width, show 1× (iframe at natural width). If container is narrower, scale proportionally.
- **React 19:** `useEffect` for postMessage listener needs cleanup. ResizeObserver disconnected on unmount. Don't leak listeners — Phase 4 tests may create/destroy panels quickly.
- **DS tokens for chrome:** any padding, border, label text uses `var(--spacing-*)`, `var(--text-*-font-size)`, `hsl(var(--border-default))`, `hsl(var(--text-muted))`. Zero hardcoded px/hex.

**LOC budget:** ~80–100 lines.

### 2.4 `ResponsivePreview.tsx` — 3-panel triptych + Path B composition

Replace stub at `apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx`.

**Contract:**

```tsx
import { renderForPreview, type BlockOutput, type Variant } from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'  // or wherever Block type lives — Phase 0 §0.1 confirmed @cmsmasters/db exports it
import { composeSrcDoc } from './preview-assets'
import { PreviewPanel } from './PreviewPanel'

interface ResponsivePreviewProps {
  block: Block | null  // from ResponsiveTab prop, which gets it from block-editor existingBlock
}

const BREAKPOINTS = [1440, 768, 375] as const

export function ResponsivePreview({ block }: ResponsivePreviewProps) {
  if (!block) {
    return <EmptyState />  // "Select a block to preview" — DS-token placeholder
  }

  // Path B composition (Brain ruling 1):
  const variantList: Variant[] = block.variants
    ? Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))
    : []

  // ⚠ Do NOT pass { width } to renderForPreview — it wraps html in an EXTRA
  //   <div style="max-width:...">...</div>, causing triple-wrap. Per-BP width
  //   lives in composeSrcDoc's body CSS only.
  const preview = renderForPreview(
    {
      slug: block.slug,
      html: block.html ?? '',
      css: block.css ?? '',
    } /* as BlockOutput */,
    { variants: variantList },
  )
  // preview.html is now pre-wrapped: '<div data-block-shell="{slug}">...</div>'
  //   (possibly with data-variant="base"/"{name}" descendants if variantList non-empty)
  // preview.css has been stripGlobalPageRules'd (html/body selectors removed)

  // Build srcdoc once per breakpoint — useMemo keyed on stable inputs to avoid
  // re-composing on unrelated parent re-renders. preview.html/css themselves are
  // new object refs every render; key on the source block fields instead.
  const srcdocs = useMemo(
    () => BREAKPOINTS.map(w => ({
      width: w,
      srcdoc: composeSrcDoc({
        html: preview.html,
        css: preview.css,
        width: w,
        slug: block.slug,      // required for postMessage payload + (internal) iframe title
        // js: block.js,        // optional — if DB block has a js field, thread it through
      }),
    })),
    [block.id, block.html, block.css, block.variants],  // stable deps; do NOT include preview.*
  )

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', padding: 'var(--spacing-xl)', overflowX: 'auto' }}>
      {srcdocs.map(({ width, srcdoc }) => (
        <PreviewPanel key={width} width={width} srcdoc={srcdoc} label={`${width}px`} />
      ))}
    </div>
  )
}
```

**Critical details:**
- **Dep array on useMemo** — do NOT include `preview.html` / `preview.css` directly; engine returns new object references every call which defeats memo. Use stable inputs: `block.id`, `block.html`, `block.css`, `block.variants` (the latter by reference is fine; if block.variants mutates in place, Phase 4 will surface it).
- **Empty state handling** — when `block === null` (e.g. Responsive tab opened on a brand-new block before first save), show a placeholder with DS tokens: `<p style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)', padding: 'var(--spacing-xl)' }}>Select a block to preview.</p>`. No crash, no engine call.
- **Overflow handling** — three 1440+768+375 panels side-by-side don't fit in a typical Studio viewport. Wrap in `overflowX: auto` container. Don't force-shrink to fit — user should see actual breakpoint widths (`PreviewPanel` scales each iframe down if pane < target).
- **No live-form-edit coupling** — Brain ruling 5. Preview reflects `block` prop only. Phase 4 revisits when accept/reject mutates form state.

**LOC budget:** ~60–80 lines.

### 2.5 Wire `ResponsiveTab.tsx` to receive + pass block

Replace the placeholder content at `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx`:

```tsx
import type { Block } from '@cmsmasters/db'  // reconfirm import path
import { ResponsivePreview } from './ResponsivePreview'

interface ResponsiveTabProps {
  block: Block | null
}

export function ResponsiveTab({ block }: ResponsiveTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Phase 2: preview only */}
      <ResponsivePreview block={block} />
      {/* Phase 3: SuggestionList goes here */}
      {/* Phase 4: SuggestionRow becomes interactive */}
    </div>
  )
}
```

**Keep it minimal.** Suggestion list + accept/reject come in Phase 3/4. Phase 2 is preview-only shell.

### 2.6 Wire `block-editor.tsx` to pass `existingBlock` down

Edit `apps/studio/src/pages/block-editor.tsx` to pass the block as a prop:

```tsx
// Find the Phase 1 line:
//   {activeTab === 'responsive' && (<div ...><ResponsiveTab /></div>)}
// Change to:
{activeTab === 'responsive' && (
  <div className="flex flex-1 flex-col overflow-y-auto" ...>
    <ResponsiveTab block={existingBlock ?? null} />
  </div>
)}
```

**Rules:**
- Single-line change. No other edits to block-editor.tsx.
- `existingBlock` is whatever state name Phase 1 / pre-existing code uses for the DB-loaded block — read Phase 1's block-editor.tsx diff to confirm the exact identifier (likely `existingBlock` per Phase 0 §0.2 rehearsal).
- If the loaded block shape doesn't match `Block` type exactly (e.g. some fields optional), cast with care — don't invent a new type. Use the `@cmsmasters/db` canonical `Block` type.

### 2.7 Finalize `PARITY.md`

Phase 1 seeded `apps/studio/src/pages/block-editor/responsive/PARITY.md` with the verbatim copy + 5 Studio deviations. This phase **finalizes** the file with post-implementation reality:

1. **Flip the "Out of scope" line** on variants from the tools/block-forge copy — for Studio, variants ARE in scope from this Phase. Update the section accordingly:
   ```markdown
   ### Out of scope (Studio tab)
   - Theme-page chrome — Studio preview renders blocks in isolation, same as tools/block-forge.
   - Layout-maker slot grid rules — Studio doesn't reconstruct layout either.
   - Tweak sliders + variants drawer — WP-028 scope.

   ### In scope (NEW vs tools/block-forge)
   - **Variant composition via Path B:** `renderForPreview(block, { variants })` — engine internally calls `composeVariants`. This phase (WP-027 Phase 2) wires it end-to-end.
   ```

2. **Finalize the Studio-specific deviations block** with post-implementation verified data:
   - §1 `?raw` path depth: confirmed 6/7 ✅
   - §2 Variants in scope: implemented in ResponsivePreview.tsx (Path B) ✅
   - §3 Sandbox attribute order: `"allow-scripts allow-same-origin"` (matches WP-026) ✅
   - §4 Dirty-state coupling via RHF: wired in Phase 4 (forward-reference)
   - §5 Auth context via updateBlockApi: wired in Phase 4 (forward-reference)

3. **Add §7 — `data-block-shell` wrap-location divergence.** Text for the section:

   ```markdown
   ### §7 — `data-block-shell` wrap originates upstream, not in composeSrcDoc

   **tools/block-forge:** `composeSrcDoc` emits the two-level slot hierarchy
   inline: `<div class="slot-inner"><div data-block-shell="{slug}">{html}</div></div>`.
   block-forge's MVP feeds RAW `block.html` into composeSrcDoc without engine
   pre-wrap, so this is the canonical wrap point for that surface.

   **Studio Responsive tab:** ResponsivePreview calls
   `renderForPreview(block, { variants })` per Brain ruling 1 (Path B single-call).
   The engine's `wrapBlockHtml` (`packages/block-forge-core/src/lib/css-scoping.ts`)
   emits the `<div data-block-shell="{slug}">...</div>` wrap upstream. Studio's
   composeSrcDoc therefore emits ONLY `<div class="slot-inner">{html}</div>` —
   the inner shell comes pre-wrapped from the engine. Double-wrapping is
   explicitly avoided.

   **Why the divergence is acceptable:**
   - Studio needs end-to-end variant composition from Phase 2 (composeVariants
     lives inside renderForPreview); block-forge defers variants to WP-028.
   - Path B is the Brain-locked architecture decision for WP-027.
   - The DOM output is byte-identical between the two surfaces: both produce
     `body > div.slot-inner > div[data-block-shell="{slug}"] > content`.

   **Forward-compatibility:** when WP-028 adds variants to tools/block-forge,
   that surface will also switch to calling `renderForPreview` upstream — at
   which point tools/block-forge's composeSrcDoc should adopt Studio's
   single-wrap pattern, re-converging PARITY. Until then, §7 marks the
   deliberate divergence.

   **Anti-regression test:** `__tests__/preview-assets.test.ts` case (studio-1)
   pins the single-wrap contract — input html without `data-block-shell`
   produces output body without `data-block-shell`. Any future edit that
   accidentally re-adds the inner wrap in composeSrcDoc fails this test.
   ```

4. **Add §8 — "Known corner: theme-page slot-block bypass"** documenting the `.slot-inner` forward-risk from app-portal SKILL + confirming Phase 2.8 parity check uses composed-page blocks only. Short paragraph; links to `apps/portal/app/themes/[slug]/page.tsx:189` for posterity.

5. **Do NOT edit `tools/block-forge/PARITY.md` reverse cross-reference yet.** That's Phase 5 Close (approval gate). The reverse reference will note: "Studio Responsive tab diverges on wrap location per §7 of its PARITY.md — this is expected until WP-028 unifies."

### 2.8 Manual parity check — composed-page block (Brain ruling 4)

**This is the load-bearing AC item for Phase 2.** No substitution allowed.

Steps:
1. Pick a **published, non-variant** block rendered via `apps/portal/app/[[...slug]]/page.tsx`. Identify candidates: query Studio's /blocks list UI or grep Portal's composed-page content. Any block that's actually visible on a published composed page works. If uncertain, use a simple text block (e.g. a "hero" or "headline" block) to minimize noise.
2. Start both dev servers:
   ```bash
   # Terminal 1
   npm -w @cmsmasters/studio run dev     # port 5173
   # Terminal 2
   npm -w @cmsmasters/api run dev        # Hono on 8787
   # Terminal 3 (if Portal not already running)
   npm -w @cmsmasters/portal run dev     # port 3000
   ```
3. In Studio, open the chosen block's editor; switch to Responsive tab; confirm the 1440-panel iframe renders.
4. Open Chrome DevTools on the Studio page; use "Inspect" on the iframe content; find the block's root element (the `<div data-block-shell="{slug}">`).
5. Copy selected computed styles from a representative child element (e.g. a heading): `font-size`, `line-height`, `color`, `padding`, `margin`, `background-color`. Record values.
6. Navigate Portal to the composed page where this block actually lives; open DevTools on the same block's corresponding element.
7. Compare computed style values field-by-field. **Byte-identical for the block subtree = PASS.** Any divergence = investigate:
   - If tokens differ → check `tokens.css` / `tokens.responsive.css` paths matching between the two surfaces
   - If layout differs → check `.slot-inner` wrapper presence + container-type
   - If font differs → check Google Fonts preconnect + link loading
8. **Document the chosen block + delta (or "zero delta") in phase-2-result.md.** Paste a small table of the compared computed styles.

**If delta is non-zero:**
- STOP. Don't commit. Surface to Brain with the observed delta + hypothesized cause.
- Do NOT "fix forward" by adjusting composeSrcDoc to match Portal — that might paper over a real bug. Root-cause first.

### 2.9 Replace variant-bearing integration stub with synthetic variant test

The `__tests__/integration.test.tsx` stub was created in Phase 1 with `describe.skip`. Phase 3 will expand it with full integration scenarios, but Phase 2 adds the **variant-display test** since that's where variant composition lives.

Add a variant-specific test block to `__tests__/preview-assets.test.ts` (keep `integration.test.tsx` as `describe.skip` still — Phase 3/4 populate it):

```ts
import { renderForPreview } from '@cmsmasters/block-forge-core'

describe('preview-assets — variant-bearing block rendering (Path B)', () => {
  it('renders both data-variant wrappers when block has variants', () => {
    // Synthetic block (inline, not from fixture — Brain ruling from Phase 0):
    const syntheticBlock = {
      slug: 'test-variant-block',
      html: '<p class="hero">Base content</p>',
      css: '.hero { font-size: 24px; }',
      variants: {
        sm: { html: '<p class="hero">Mobile content</p>', css: '.hero { font-size: 16px; }' },
      },
    }
    const variantList = Object.entries(syntheticBlock.variants).map(
      ([name, v]) => ({ name, html: v.html, css: v.css })
    )
    const preview = renderForPreview(
      { slug: syntheticBlock.slug, html: syntheticBlock.html, css: syntheticBlock.css },
      { variants: variantList },  // NO width option — see Brain gotcha #2 in Task 2.1
    )
    const srcdoc = composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: 375,
      slug: syntheticBlock.slug,  // required field
    })

    // Assert both variant wrappers inlined (from engine's composeVariants output):
    expect(srcdoc).toContain('data-variant="base"')
    expect(srcdoc).toContain('data-variant="sm"')
    // Assert @container reveal rule present — at 375 panel width, sm variant reveals
    // via @container slot (max-width: 480px) emitted by buildAtContainer(480, body):
    expect(srcdoc).toMatch(/@container slot.*max-width:\s*480px/)
    // Assert data-block-shell wrap present (from renderForPreview, not composeSrcDoc):
    expect(srcdoc).toContain('data-block-shell="test-variant-block"')
  })

  it('composes identity output when block has no variants', () => {
    const preview = renderForPreview(
      { slug: 'plain', html: '<p>hi</p>', css: 'p { color: black; }' },
      { variants: [] },
    )
    const srcdoc = composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: 1440,
      slug: 'plain',
    })
    // No variant wrappers when variantList is empty:
    expect(srcdoc).not.toContain('data-variant=')
    // Base html still wrapped by renderForPreview's wrapBlockHtml:
    expect(srcdoc).toContain('<div data-block-shell="plain">')
    expect(srcdoc).toContain('<p>hi</p>')
  })
})
```

**Important:**
- Do NOT reuse WP-025 engine fixtures here — Brain ruling (fixture strategy) specified **synthesize variant-bearing blocks inline** because engine has no variant-bearing fixture. Reuse of WP-025 fixtures is for **Phase 3 heuristic-trigger integration tests**, not here.
- Do NOT pass `{ width }` to `renderForPreview` — triple-wrap hazard (Task 2.1 gotcha #2).
- `slug` is REQUIRED in composeSrcDoc input — drops into postMessage payload.

### 2.10 Gates

```bash
npm run arch-test                        # target: 489 / 0 (UNCHANGED — no manifest edits this phase)
npm run typecheck                        # target: clean (across monorepo)
npm -w @cmsmasters/studio test           # target: 16 (Phase 1 session-state) + 10 (preview-assets contract — 9 mirror + 1 Studio-specific) + 2 (variant-bearing tests) = 28 passed, 2 todo stubs remaining (suggestion-row, integration)
npm -w @cmsmasters/studio run build      # target: clean (bundle grows due to ?raw CSS inlining; expected)
npm -w @cmsmasters/studio run dev        # manual: open any block → Responsive tab → 3-panel triptych renders
                                         # → 1440 panel shows block at 1× or scaled-down
                                         # → 768 panel shows block
                                         # → 375 panel shows block
                                         # → .slot-inner wrapper present (DevTools inspect)
                                         # → @layer order correct (DevTools CSS panel)
                                         # → tokens.responsive.css tokens resolve (DevTools computed styles)
# Phase 2.8 manual parity check — documented in phase-2-result.md
```

---

## Result log

Template at `logs/wp-027/phase-2-result.md`:

```markdown
# WP-027 Phase 2 — Result

**Date:** 2026-04-DD
**Duration:** ~Xh
**Commits:**
- Task prompt: <SHA> — logs/wp-027/phase-2-task.md
- Implementation: <SHA> — atomic Phase 2 commit
- SHA-embed result: <this file>

**Arch-test:** 489 / 0 (unchanged — no manifest edits this phase)
**Studio test suite:** <N> passed | <M> todo (across 4 files; suggestion-row + integration still stub)
**Studio typecheck:** clean
**Studio build:** clean
**Cross-domain typecheck:** clean

---

## Task-by-task

### 2.1 preview-assets.ts
<findings — LOC, structural mirror verification>

### 2.2 preview-assets.test.ts
<case count + green, any deviations from 14-case template>

### 2.3 PreviewPanel.tsx
<iframe sandbox verified "allow-scripts allow-same-origin"; postMessage filter; scale-to-fit behavior>

### 2.4 ResponsivePreview.tsx
<Path B call site; useMemo deps; empty state; overflow handling>

### 2.5 + 2.6 Prop wiring
<block prop threaded from block-editor existingBlock through ResponsiveTab to ResponsivePreview>

### 2.7 PARITY.md finalized
<changes from Phase 1 seed; sections updated>

### 2.8 Manual parity check
- Chosen block: <slug + where it renders on Portal>
- Computed-style delta: <paste small table>
- Verdict: PASS (byte-identical) | INVESTIGATE (delta documented, Brain surfaced)

### 2.9 Variant tests
<both cases green; synthetic inline approach confirmed>

### 2.10 Gates
<all green>

---

## Deviations / Plan Corrections
<DS token violations caught by lint-ds, path-depth corrections, any engine-signature surprises, etc.>

---

## Carry-overs for Phase 3
- <useAnalysis hook design — run analyzeBlock + generateSuggestions in ResponsiveTab>
- <Suggestion list ordering — mirror tools/block-forge HEURISTIC_ORDER>
- <Fixture-reuse 7-dot path for Phase 3 integration tests>
- <Any observed engine-return-shape surprises that affect Phase 3 contract>

---

## Ready for Phase 3
<summary>
```

---

## Verification + commit sequence

Single atomic commit for the implementation (mirror Phase 1 pattern):

```bash
# 1. Commit the task prompt first (this file):
git add logs/wp-027/phase-2-task.md
git commit -m "chore(logs): WP-027 Phase 2 task prompt"

# 2. Do all the work from 2.1 through 2.9. Stage EXPLICITLY:
git add apps/studio/src/pages/block-editor/responsive/preview-assets.ts
git add apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx
git add apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx
git add apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
git add apps/studio/src/pages/block-editor/responsive/PARITY.md
git add apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts
git add apps/studio/src/pages/block-editor.tsx

# Verify:
git status                              # only the above 7 should be modified/untracked
git diff --staged --stat                # inspect the LOC deltas

git commit -m "feat(studio): WP-027 Phase 2 — preview injection contract + 3-panel triptych + Path B variants"

# 3. Write phase-2-result.md; commit + SHA-embed amend.
```

**R2-contamination reminder:** do NOT `git add -A` / `git add .` — inspect staged files first, same as Phase 1.

---

## Escalation protocol

Surface to Brain BEFORE committing if:
- **Parity delta non-zero** in 2.8 — root-cause first, don't fix-forward.
- **Engine signature surprise** — if `renderForPreview` or `composeVariants` actually have different shapes than Phase 0 §0.6 recorded, stop and surface. The plan's Path B assumption depends on the signature.
- **`?raw` imports fail to load content** (empty strings in test output despite `css: true` set) — saved memory landmine variant; investigate vite.config.ts delta between Phase 1 and now.
- **DOM structure in `<div class="slot-inner">` wrapper doesn't match what engine produces** — check `data-block-shell` wrapper placement vs. what renderForPreview actually emits.
- **Console errors on dev-server manual test** that originate in WP-027 code paths (not Agentation or Hono-startup-race noise).
- **Variant test fails on synthetic block** — might surface an engine-contract surprise about how `sm` name maps to `@container` reveal rule (see compose-variants.ts `buildAtContainer` logic).

Do NOT silently work around any of these — each signals a broken assumption in the plan or a forward-risk about the engine.

---

## Estimated effort

~3–4h focused work. Rough split:
- 2.1 preview-assets.ts mirror: 45 min
- 2.2 preview-assets.test.ts (14 cases): 45 min
- 2.3 PreviewPanel.tsx (iframe + ResizeObserver): 45 min
- 2.4 ResponsivePreview.tsx (Path B + triptych): 30 min
- 2.5 + 2.6 wire props: 15 min
- 2.7 PARITY finalize: 20 min
- 2.8 manual parity check: 30 min (critical — don't rush)
- 2.9 variant tests: 20 min
- 2.10 gates + result log + commits: 45 min

Total ~4h ceiling. If at 3h and not through 2.7, surface for check-in.

---

## Forward-reference

Phase 3 picks up:
- `useResponsiveAnalysis(block)` hook — runs `analyzeBlock` + `generateSuggestions` over the same `block` prop this phase wires; useMemo keyed on `{html, css, variants}`.
- `SuggestionList.tsx` + `SuggestionRow.tsx` — replace stubs with real content; Accept/Reject buttons present but DISABLED until Phase 4.
- Integration test (the Phase 1 describe.skip stub) — expanded to cover: fixture-reuse via 7-dot `?raw` path for heuristic-trigger assertions, snapshot-as-ground-truth cross-ref before any `toContain`.
- Warnings banner above the list if `analyzeBlock` returns warnings.

**Phase 2 output:** injection contract live, 3-panel triptych rendering, Path B variant composition verified, PARITY.md finalized, composed-page byte-parity confirmed. Engine display path DONE. Engine suggestion path is Phase 3.

Let's go.
