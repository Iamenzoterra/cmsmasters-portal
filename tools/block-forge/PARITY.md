# Block Forge Preview Parity Contract

> Source of truth for what block-forge's preview iframe injects and why.
> Every change to `src/lib/preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (as of Phase 2 seed, WP-026)

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
<div class="slot-inner">                   ← containment context (inline-size, name=slot)
  <div data-block-shell="{slug}">          ← portal-parity block wrapper
    {block.html}
  </div>
</div>
```

Matches portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper. LM does NOT wrap (legacy blocks use `@media`, not `@container slot`) — block-forge's divergence from LM is deliberate.

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

### Out of scope (explicit — do not mistake for divergence)
- Theme-page chrome (header, nav, footer, layout grid) — block-forge previews blocks in isolation.
- Any `[data-slot="…"]` outer grid rules from layout-maker — block-forge doesn't reconstruct the layout, only the `.slot-inner` containment context.
- Variants — `composeVariants` output is Phase 3+ territory; this contract covers single-block base rendering only.
- Save/backup behavior — Phase 4 wires POST; read-only this phase.

## Discipline (PARITY-LOG equivalent)

1. Before proposing a change to `preview-assets.ts` or iframe composition, re-read this file.
2. When a divergence from portal render is observed, log it in the "Open Divergences" section below BEFORE debugging — naming where the lie lives is half the fix.
3. When closing a divergence, move it to "Fixed" with commit SHA AND add a contract test in `preview-assets.test.ts`.
4. When changing the token list, `@layer` order, slot wrapper, or runtime injection, update the Contract section above in the same commit as the code.

## Open Divergences

_(none at Phase 2 seed)_

## Fixed

_(empty)_

## Discipline Confirmation (WP-026 Close)

Across Phases 2–4 of WP-026, **zero open divergences** were observed against the portal theme-page block render contract:

- **Phase 2** (preview seed) — 3 tests in `preview-assets.test.ts` verify token injection, slot wrapper structure, and `postMessage` height-sync contract.
- **Phase 3** (suggestions consumer) — 4 fixture contracts from `@cmsmasters/block-forge-core` frozen snapshot consumed in `integration.test.tsx`: `block-spacing-padding`, `block-spacing-font`, `block-components-anchor`, `block-overflow-sidebar`.
- **Phase 4** (save orchestration) — 4 real blocks under `content/db/blocks/` (`global-header-ui`, `global-footer-ui`, `homepage-hero`, `block-spacing-padding`) verified end-to-end: load → accept suggestions → Save → `.bak` created → `.json` rewritten → re-analysis.

Block-forge is baseline-true vs the portal theme-page render as of the commit closing WP-026.

## WP-027 Studio Responsive tab cross-reference

Studio's Responsive tab (WP-027) consumes `@cmsmasters/block-forge-core` directly via Path B — `renderForPreview(block, { variants })` absorbs composeVariants in one call. This yields a different iframe DOM shape from block-forge's:

### block-forge (this tool) — double-wrap, deliberate
```
<div class="slot-inner">              ← composeSrcDoc writes (outer)
  <div data-block-shell="{slug}">     ← composeSrcDoc writes (inner)
    {block.html}                      ← block content
  </div>
</div>
```

### Studio Responsive tab — single-wrap, deliberate
```
<div class="slot-inner">              ← Studio composeSrcDoc writes (outer only)
  <div data-block-shell="{slug}">     ← renderForPreview engine wrote (already in block.html)
    {block.html content}
  </div>
</div>
```

**Why the divergence:** block-forge predates engine Path B (WP-025 shipped the convenience overload; block-forge Phase 2 was already wrapping). Studio started fresh with Path B so the engine does the inner wrap; Studio's composeSrcDoc drops its inner wrap to avoid triple-nest.

**Contract:** if block-forge ever migrates to Path B (Phase 6+ refactor), drop its inner wrap here AND in `preview-assets.ts`. Until then, do NOT "align Studio to block-forge" — you'll regress Studio to triple-nest and `@container slot` queries will silently evaluate against the wrong box. The divergence is NOT an "Open Divergence" against the portal (where both tools agree on the `@container slot` contract) — it is a surface-local delta between the two authoring tools.

### Phase 4 documented deviations (from `logs/wp-027/phase-4-result.md`)

Six divergences between Phase 4 plan and shipped code, all acceptable, all logged:
1. `analyzeBlock` run on stable source (base block only), not dirty form content — prevents suggestion churn during an Accept storm
2. Tab mount uses CSS `display: none` (not unmount) — preserves session across Editor↔Responsive switches
3. `clearAfterSave` only on successful save — error path preserves pending accepts (Brain ruling 8)
4. `onApplyToForm` callback is optional — `ResponsiveTab` works in read-only preview contexts
5. `authHeaders` imported directly in `block-editor.tsx` (not duplicated) — single source
6. Null-block / empty-pending guards in `displayBlock` memo — prevents infinite re-render on block-id transition edge case

See `logs/wp-027/phase-4-result.md` §"6 documented deviations" for full trace.

## Cross-contract test layers

Block-forge's safety net is two-layered:

1. **Core engine contract** — `packages/block-forge-core/src/__tests__/snapshot.test.ts.snap` freezes the `analyzeBlock` → `generateSuggestions` → `applySuggestions` → `composeVariants` → `renderForPreview` pipeline output for all 3 canonical fixtures + E2E. Any engine behavior drift fails at the package level before block-forge runs.
2. **UI surface contract** — `tools/block-forge/src/__tests__/integration.test.tsx` verifies that the Vite app consumes the engine identically: suggestion IDs flow through to DOM `data-suggestion-id`; Save POST payload matches `applySuggestions` output exactly; `requestBackup` flag flips correctly after first save per session.

A regression in one layer fails tests in that layer — never silently. The snapshot is the ground truth for fixture behavior (not the filename); see saved memory `feedback_fixture_snapshot_ground_truth.md`.
