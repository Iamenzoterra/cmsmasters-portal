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
4. **Element-click delegator** (WP-028 Phase 2) → `postMessage({ type: 'block-forge:element-click', slug, selector, rect, computedStyle })` for parent TweakPanel seeding.
   - Delegated click listener on `document.body` (capture phase). Filters by `CLICKABLE_TAGS` (semantic block elements) and emits `e.preventDefault() + e.stopPropagation()` on match so the preview doesn't navigate/submit.
   - Selector derivation per Ruling H: `#id` → stable class → `nth-of-type` fallback walk, max depth 5. Utility prefixes (`hover:`, `focus:`, `active:`, `animate-`, `group-`, `peer-`) excluded from "stable" class pool.
   - Strictly additive injection (Ruling E) — wrap structure, layer order, and slot CSS are unchanged. Any future PARITY edit that touches wrap structure should land separately from the click-handler script.
   - Cross-surface byte-identical with `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` click-handler block.

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

## Discipline Confirmation (WP-028 Phase 3)

Variant CRUD drawer landed end-to-end on both surfaces (tools/block-forge + Studio) with byte-identical body + session-backed undo on block-forge. PARITY section added above; §7 "deliberate divergence" UNCHANGED pending Phase 3.5 Path B re-converge. No new files; arch-test stays at 499/0.

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

## Variant CRUD (WP-028 Phase 3 — additive)

As of Phase 3, block-forge ships a `VariantsDrawer` (`src/components/VariantsDrawer.tsx`, byte-identical body to Studio's `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx`) wired into `App.tsx` via `handleVariantAction` + session-backed CRUD:
- **Store:** `session.variants: BlockVariants` seeded from `block.variants ?? {}` on slug-change (Ruling P' — useEffect spread, `createSession()` stays zero-arg for backward compat).
- **Actions:** `createVariant / renameVariant / deleteVariant` in `src/lib/session.ts`; `history` carries the action for undo, `delete` records `prev: BlockVariant` so restore is lossless.
- **Undo:** extends existing `undo()` to handle `variant-create / variant-rename / variant-delete` in addition to accept/reject/tweak. Parity-locked with Phase 2 undo uniformity.
- **Dirty:** `isDirty(state)` returns true if any variant-* action is in history, in addition to the P2 tweak/pending/rejected checks.
- **Save round-trip:** `handleSave` appends `variants: Object.keys(session.variants).length > 0 ? session.variants : undefined` to the `BlockJson` payload (disk parity with Studio's `formDataToPayload`). `clearAfterSave(prev, refreshed.variants ?? {})` aligns session.variants to post-save disk state.

**Render-time variant composition (Phase 3 INTERIM — see Phase 3.5 below):** `PreviewTriptych.tsx` calls `composeVariants(base, variantList)` INLINE when `composedBlock.variants` is non-empty, then feeds the composed `{html, css}` into existing `PreviewPanel` → `composeSrcDoc` unchanged. The `composeSrcDoc` wrap (`<div class="slot-inner"><div data-block-shell="{slug}">{html}</div></div>`) is untouched this phase.

**Phase 3.5 follow-up (scheduled):** `preview-assets.ts` drops the inner `<div data-block-shell>` wrap and `PreviewTriptych` switches from the inline `composeVariants` call to `renderForPreview(block, { variants })` — Path B re-converge with Studio. §7 "deliberate divergence" in `apps/studio/.../PARITY.md` flips to `✅ RE-CONVERGED` in that mini-phase. Scope boundary: Phase 3 preserves `preview-assets.ts` + its `.test.ts` + its `.snap` + Studio §7 UNTOUCHED.

## Cross-contract test layers

Block-forge's safety net is two-layered:

1. **Core engine contract** — `packages/block-forge-core/src/__tests__/snapshot.test.ts.snap` freezes the `analyzeBlock` → `generateSuggestions` → `applySuggestions` → `composeVariants` → `renderForPreview` pipeline output for all 3 canonical fixtures + E2E. Any engine behavior drift fails at the package level before block-forge runs.
2. **UI surface contract** — `tools/block-forge/src/__tests__/integration.test.tsx` verifies that the Vite app consumes the engine identically: suggestion IDs flow through to DOM `data-suggestion-id`; Save POST payload matches `applySuggestions` output exactly; `requestBackup` flag flips correctly after first save per session.

A regression in one layer fails tests in that layer — never silently. The snapshot is the ground truth for fixture behavior (not the filename); see saved memory `feedback_fixture_snapshot_ground_truth.md`.
