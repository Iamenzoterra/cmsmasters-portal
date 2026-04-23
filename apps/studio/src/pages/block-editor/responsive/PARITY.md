# Studio Responsive Tab — Preview Parity Contract

> **Sibling contract:** [`tools/block-forge/PARITY.md`](../../../../../../tools/block-forge/PARITY.md). Any edit here must apply there (and vice-versa).

> Source of truth for what the Studio Responsive tab's preview iframe injects and why.
> Every change to `preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (as of Phase 1 seed, WP-027 — mirrors tools/block-forge/PARITY.md Phase 2 contract)

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
- Save/backup behavior — Studio handles save via existing `updateBlockApi` + Hono revalidate, not via the preview layer.

## Discipline (PARITY-LOG equivalent)

1. Before proposing a change to `preview-assets.ts` or iframe composition, re-read this file.
2. When a divergence from portal render is observed, log it in the "Open Divergences" section below BEFORE debugging — naming where the lie lives is half the fix.
3. When closing a divergence, move it to "Fixed" with commit SHA AND add a contract test in `preview-assets.test.ts`.
4. When changing the token list, `@layer` order, slot wrapper, or runtime injection, update the Contract section above in the same commit as the code.
5. **Cross-surface parity enforcement:** any edit to this file MUST be mirrored in `tools/block-forge/PARITY.md` in the same WP (and vice versa). Divergence between the two PARITY contracts is a bug.

## Open Divergences

_(none at Phase 1 seed — preview-assets.ts is a TODO stub; Phase 2 implements and runs first parity check)_

## Fixed

_(empty)_

---

## Studio-specific deviations

The following intentional deltas from `tools/block-forge/PARITY.md` apply only to the Studio Responsive tab:

1. **`?raw` path depth — 6 `..` from source, 7 `..` from tests.**
   Studio's `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` lives 2 directories deeper than `tools/block-forge/src/lib/preview-assets.ts`. Paths:
   - Source: `'../../../../../../packages/ui/src/theme/tokens.css?raw'` (6 `..`)
   - Tests under `__tests__/`: `'../../../../../../../packages/ui/src/theme/tokens.css?raw'` (7 `..`)
   - WP-025 fixtures from tests: `'../../../../../../../packages/block-forge-core/src/__tests__/fixtures/{name}.html?raw'` (7 `..`)

2. **Variants IN scope from Phase 2.**
   Studio Responsive tab must render variant-bearing blocks end-to-end (DB `blocks.variants` may be non-null). Phase 2 `ResponsivePreview.tsx` uses Path B: `renderForPreview(block, { variants: variantList })`. tools/block-forge defers variants to Phase 3+ — Studio does NOT.

3. **Sandbox attribute order `"allow-scripts allow-same-origin"`.**
   Standardized on the tools/block-forge order for cross-surface parity. Studio's existing `apps/studio/src/components/block-preview.tsx` uses `"allow-same-origin"` (+ `"allow-scripts"` in interactive mode) — Responsive tab does NOT share code with block-preview.tsx (separate injection stack per Phase 0 §0.3).

4. **Dirty-state coupling — RHF `formState.isDirty`.**
   On Accept, Phase 4 calls `form.setValue('code', newCodeString, { shouldDirty: true })`. Existing Save footer + beforeunload + dirty indicator fire unchanged (studio-core invariant: "all editors use react-hook-form + zodResolver"). Session-state primitives (`session-state.ts`) hold accept/reject bookkeeping for UI only — dirty-state lives in RHF. No parallel dirty system.

5. **Auth context — reuse existing Studio `updateBlockApi`.**
   Save path goes through `apps/studio/src/lib/block-api.ts`' `updateBlockApi` with Supabase session token via `authHeaders()`. Hono `PUT /api/blocks/:id` + `requireRole('content_manager', 'admin')`. Revalidate via Hono `POST /api/content/revalidate` with `{ all: true }` body (Phase 4 extension, per WP-027 plan Q3 Option 2).

---

## Cross-contract parity notes

- **Injection stack identity:** `@layer tokens, reset, shared, block` order + `.slot-inner { container-type: inline-size; container-name: slot }` wrapper + `<div data-block-shell="{slug}">` block wrapper + `animate-utils.js` runtime injection — byte-identical between Studio and tools/block-forge.
- **Test mirror:** Studio's `__tests__/preview-assets.test.ts` (Phase 2) mirrors tools/block-forge/src/__tests__/preview-assets.test.ts case-by-case to catch drift between the two injection implementations.
- **Contract-test pair:** both surfaces test the `@layer` order, slot wrapper presence + `container-type`, width reflection in body, and postMessage type literal.
