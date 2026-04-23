# Studio Responsive Tab — Preview Parity Contract

> **Sibling contract:** [`tools/block-forge/PARITY.md`](../../../../../../tools/block-forge/PARITY.md). Any edit here must apply there (and vice-versa).

> Source of truth for what the Studio Responsive tab's preview iframe injects and why.
> Every change to `preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (Phase 2 — finalized, WP-027 — mirrors tools/block-forge/PARITY.md with §7 divergence)

### Token injection (inside `@layer tokens`)
1. `packages/ui/src/theme/tokens.css` — portal design-system tokens (semantic colors, typography scale, spacing, radii, shadows).
2. `packages/ui/src/theme/tokens.responsive.css` — WP-024 clamp-based responsive companion (currently 2-token scaffold: `--space-section`, `--text-display`; WP-029 populates).

### Reset layer (`@layer reset`)
- Box-sizing + margin/padding normalize on `*, *::before, *::after`.
- `body { font-family: 'Manrope', system-ui, sans-serif; width: {renderWidth}px; overflow: hidden; background: white; }`
  - `width` is fixed per breakpoint panel (1440/768/375). `overflow: hidden` prevents double-scroll; parent `PreviewPanel` controls scroll via ResizeObserver → postMessage height sync.

### Shared layer (`@layer shared`)
1. `packages/ui/src/portal/portal-blocks.css` — shared component classes from ADR-024 (buttons, headings, containers shared across blocks).
2. `.slot-inner { container-type: inline-size; container-name: slot; }` — inline containment rule matching portal's theme-page hierarchy. Reference: `tools/layout-maker/runtime/lib/css-generator.ts:254-255`.

### Block layer (`@layer block`)
- Per-block CSS from `block.css` (verbatim, no preprocessing).

### DOM hierarchy in iframe body
```
<div class="slot-inner">                   ← containment context (inline-size, name=slot) — emitted by composeSrcDoc
  <div data-block-shell="{slug}">          ← portal-parity block wrapper — emitted by renderForPreview (engine upstream)
    {block.html}                           ← if variants present: contains data-variant="base"/"{name}" descendants
  </div>
</div>
```

Matches portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper. The wrap-LOCATION (who emits data-block-shell) is the PARITY §7 deviation — see Studio deviation §7 below.

### Runtime injection (after body DOM)
1. `packages/ui/src/portal/animate-utils.js` — ADR-023 animation layer (always-on for parity with portal runtime).
2. Block's own `block.js` (if present) — appended after animate-utils.
3. ResizeObserver → `postMessage({ type: 'block-forge:iframe-height', slug, width, height })` for parent-panel height sync.
   - `type` literal is pinned by `preview-assets.test.ts` case (i) — any rename forces test update.

### Canonical breakpoints
- Desktop: 1440px
- Tablet: 768px
- Mobile: 375px

### Sandbox policy
- `sandbox="allow-scripts allow-same-origin"`
- `allow-same-origin` is required for Google Fonts `<link>` loading inside srcdoc (matches LM iframe convention).

### Out of scope (Studio tab)
- Theme-page chrome — Studio preview renders blocks in isolation, same as tools/block-forge.
- Layout-maker slot grid rules — Studio doesn't reconstruct layout either.
- Tweak sliders + variants drawer — WP-028 scope.

### In scope (NEW vs tools/block-forge)
- **Variant composition via Path B:** `renderForPreview(block, { variants })` — engine internally calls `composeVariants` when `variants.length > 0`. This phase (WP-027 Phase 2) wires it end-to-end. tools/block-forge defers variants to WP-028.

## Discipline (PARITY-LOG equivalent)

1. Before proposing a change to `preview-assets.ts` or iframe composition, re-read this file.
2. When a divergence from portal render is observed, log it in the "Open Divergences" section below BEFORE debugging — naming where the lie lives is half the fix.
3. When closing a divergence, move it to "Fixed" with commit SHA AND add a contract test in `preview-assets.test.ts`.
4. When changing the token list, `@layer` order, slot wrapper, or runtime injection, update the Contract section above in the same commit as the code.
5. **Cross-surface parity enforcement:** any edit to this file MUST be mirrored in `tools/block-forge/PARITY.md` in the same WP (and vice versa). Divergence between the two PARITY contracts is a bug.

## Open Divergences

_(none at Phase 2 close — preview-assets.ts + tests implemented; Phase 2.8 composed-page parity check documented in `logs/wp-027/phase-2-result.md`)_

## Fixed

_(empty)_

---

## Studio-specific deviations

The following intentional deltas from `tools/block-forge/PARITY.md` apply only to the Studio Responsive tab:

1. **`?raw` path depth — 6 `..` from source, 7 `..` from tests.** ✅ (verified Phase 2 implementation)
   Studio's `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` lives 2 directories deeper than `tools/block-forge/src/lib/preview-assets.ts`. Paths:
   - Source: `'../../../../../../packages/ui/src/theme/tokens.css?raw'` (6 `..`)
   - Tests under `__tests__/`: `'../../../../../../../packages/ui/src/theme/tokens.css?raw'` (7 `..`) — applies only to Phase 3 fixture reuse; Phase 2 tests don't import `?raw` content directly (they assert on substring match in composeSrcDoc output).
   - WP-025 fixtures from tests: `'../../../../../../../packages/block-forge-core/src/__tests__/fixtures/{name}.html?raw'` (7 `..`) — forward reference for Phase 3.

2. **Variants IN scope from Phase 2.** ✅ (implemented in `ResponsivePreview.tsx`)
   Studio Responsive tab renders variant-bearing blocks end-to-end via Path B: `renderForPreview(block, { variants: variantList })`. Engine internally calls `composeVariants` when `variants.length > 0`. tools/block-forge defers variants to WP-028.

3. **Sandbox attribute order `"allow-scripts allow-same-origin"`.** ✅ (matches WP-026)
   Standardized on the tools/block-forge order. Studio's existing `apps/studio/src/components/block-preview.tsx` uses `"allow-same-origin"` (+ `"allow-scripts"` in interactive mode) — Responsive tab does NOT share code with block-preview.tsx (separate injection stack per Phase 0 §0.3).

4. **Dirty-state coupling — RHF `formState.isDirty`.** (forward reference — Phase 4)
   On Accept, Phase 4 calls `form.setValue('code', newCodeString, { shouldDirty: true })`. Existing Save footer + beforeunload + dirty indicator fire unchanged (studio-core invariant: "all editors use react-hook-form + zodResolver"). Session-state primitives (`session-state.ts`) hold accept/reject bookkeeping for UI only — dirty-state lives in RHF. No parallel dirty system.

5. **Auth context — reuse existing Studio `updateBlockApi`.** (forward reference — Phase 4)
   Save path goes through `apps/studio/src/lib/block-api.ts`' `updateBlockApi` with Supabase session token via `authHeaders()`. Hono `PUT /api/blocks/:id` + `requireRole('content_manager', 'admin')`. Revalidate via Hono `POST /api/content/revalidate` with `{ all: true }` body (Phase 4 extension, per WP-027 plan Q3 Option 2).

6. **Block-type uniform applicability.** (forward reference — WP-027 Close)
   Responsive tab covers `/blocks/:id`, `/elements/:id`, `/global-elements/:id` identically — all three share the `.slot-inner` container-type context. Complex elements (tabs, dynamic content) are prime candidates; atomic elements gracefully show the empty state. Slot-context variance (content vs sidebar vs header widths) is pre-existing — acknowledge once and move on. Close phase finalizes this note.

7. **`data-block-shell` wrap originates upstream, not in composeSrcDoc.** ✅ (resolved double-wrap blocker)

   **tools/block-forge:** `composeSrcDoc` emits the two-level slot hierarchy inline:
   ```
   <div class="slot-inner"><div data-block-shell="{slug}">{html}</div></div>
   ```
   block-forge's MVP feeds RAW `block.html` into composeSrcDoc without engine pre-wrap, so this is the canonical wrap point for that surface.

   **Studio Responsive tab:** `ResponsivePreview` calls `renderForPreview(block, { variants })` per Brain ruling 1 (Path B single-call). The engine's `wrapBlockHtml` (`packages/block-forge-core/src/lib/css-scoping.ts`) emits the `<div data-block-shell="{slug}">...</div>` wrap upstream. Studio's composeSrcDoc therefore emits ONLY `<div class="slot-inner">{html}</div>` — the inner shell comes pre-wrapped from the engine. Double-wrapping is explicitly avoided.

   **Why the divergence is acceptable:**
   - Studio needs end-to-end variant composition from Phase 2 (composeVariants lives inside renderForPreview); block-forge defers variants to WP-028.
   - Path B is the Brain-locked architecture decision for WP-027.
   - The DOM output is byte-identical between the two surfaces: both produce `body > div.slot-inner > div[data-block-shell="{slug}"] > content`.

   **Forward-compatibility:** when WP-028 adds variants to tools/block-forge, that surface will also switch to calling `renderForPreview` upstream — at which point tools/block-forge's composeSrcDoc should adopt Studio's single-wrap pattern, re-converging PARITY. Until then, §7 marks the deliberate divergence.

   **Anti-regression test:** `__tests__/preview-assets.test.ts` case `(studio-1)` pins the single-wrap contract — input html without `data-block-shell` produces output body without `data-block-shell`. Any future edit that accidentally re-adds the inner wrap in composeSrcDoc fails this test.

8. **Known corner: theme-page slot-block bypass.** (forward-risk acknowledgement, not fixed)
   `apps/portal/app/themes/[slug]/page.tsx:189` has a known `.slot-inner` bypass for theme-page slot-closure rendering (documented in app-portal SKILL). Variant-bearing blocks rendered through that path may differ from iframe preview output. **Phase 2.8 manual parity check uses a composed-page block (via `apps/portal/app/[[...slug]]/page.tsx`) ONLY — never a theme-page slot block** — to avoid false positives against this known delta. If a theme-page slot-block ever needs parity verification, either patch app-portal's bypass first or add an explicit separate contract with its own test suite.

---

## Cross-contract parity notes

- **Injection stack identity:** `@layer tokens, reset, shared, block` order + `.slot-inner { container-type: inline-size; container-name: slot }` wrapper + `<div data-block-shell="{slug}">` block wrapper + `animate-utils.js` runtime injection — byte-identical DOM + CSS output between Studio and tools/block-forge (wrap LOCATION differs per §7, wrap RESULT is identical).
- **Test mirror:** Studio's `__tests__/preview-assets.test.ts` mirrors `tools/block-forge/src/__tests__/preview-assets.test.ts` cases (a)–(i) and adds case `(studio-1)` pinning the §7 single-wrap contract. Both surfaces test the `@layer` order, slot wrapper presence + `container-type`, width reflection in body, and postMessage type literal.
- **Cross-surface reverse-reference:** `tools/block-forge/PARITY.md` should cross-reference Studio §7 in WP-027 Phase 5 Close ("Studio Responsive tab diverges on wrap LOCATION per its PARITY.md §7 — this is expected until WP-028 unifies"). Until that close pass, the reverse reference lives only here.
