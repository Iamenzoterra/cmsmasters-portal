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
<div class="slot-inner">                   ← containment context (inline-size, name=slot) — composeSrcDoc writes
  <div data-block-shell="{slug}">          ← portal-parity block wrapper — renderForPreview writes upstream
    {block.html}
  </div>
</div>
```

**Wrap emitter split (post-WP-028 Phase 3.5):** the outer `.slot-inner` is emitted by `composeSrcDoc` (this file). The inner `<div data-block-shell="{slug}">` comes PRE-WRAPPED via `renderForPreview(block, { variants })` — engine `wrapBlockHtml` at `packages/block-forge-core/src/lib/css-scoping.ts:26-28`. DOM output structurally identical to pre-3.5 (verified via live Playwright DOM queries + snapshot pins on composeSrcDoc body region); the WHO-wraps changed, the WHAT-emits is structurally the same.

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

## Discipline Confirmation (WP-028 Phase 3.5)

Path B re-converge landed. `composeSrcDoc` single-wraps (`.slot-inner` only); `PreviewTriptych` calls `renderForPreview(block, { variants })` upstream so engine `wrapBlockHtml` emits the `<div data-block-shell="{slug}">…</div>` inner wrap + any `[data-variant]` descendants in one pass. PARITY §7 flipped to `✅ RE-CONVERGED` on both files. Iframe DOM byte-identical to pre-3.5 output (verified via live Playwright smoke); WHO-wraps changed, WHAT-emits unchanged. +2 new `preview-assets.test.ts` cases pin the single-wrap contract + pre-wrapped pass-through. Arch-test stays at 499/0.

## Discipline Confirmation (WP-026 Close)

Across Phases 2–4 of WP-026, **zero open divergences** were observed against the portal theme-page block render contract:

- **Phase 2** (preview seed) — 3 tests in `preview-assets.test.ts` verify token injection, slot wrapper structure, and `postMessage` height-sync contract.
- **Phase 3** (suggestions consumer) — 4 fixture contracts from `@cmsmasters/block-forge-core` frozen snapshot consumed in `integration.test.tsx`: `block-spacing-padding`, `block-spacing-font`, `block-components-anchor`, `block-overflow-sidebar`.
- **Phase 4** (save orchestration) — 4 real blocks under `content/db/blocks/` (`global-header-ui`, `global-footer-ui`, `homepage-hero`, `block-spacing-padding`) verified end-to-end: load → accept suggestions → Save → `.bak` created → `.json` rewritten → re-analysis.

Block-forge is baseline-true vs the portal theme-page render as of the commit closing WP-026.

## WP-027 Studio Responsive tab cross-reference — ✅ RE-CONVERGED at WP-028 Phase 3.5

Both surfaces now use Path B: `renderForPreview(block, { variants })` emits the pre-wrapped `<div data-block-shell="{slug}">…</div>` upstream; each surface's composeSrcDoc adds ONLY the outer `.slot-inner` container. Identical iframe DOM shape:

```
<div class="slot-inner">              ← composeSrcDoc writes (outer only) — both surfaces
  <div data-block-shell="{slug}">     ← renderForPreview writes upstream (engine wrapBlockHtml)
    {block.html content}
  </div>
</div>
```

**Historical note:** through WP-028 Phase 3, block-forge's composeSrcDoc double-wrapped (both outer `.slot-inner` AND inner `data-block-shell`) while Studio was already on Path B (WP-027 single-wrap). The deliberate divergence shipped as PARITY §7 "forward-compat" on the Studio side. Phase 3 landed Variant CRUD on top of that interim state via an inline `composeVariants` call in `PreviewTriptych`. Phase 3.5 replaced the inline call with `renderForPreview` + dropped the inner wrap in composeSrcDoc — single refactor pass, no behavior change (verified via byte-identical iframe DOM smoke).

**Contract (current):** both surfaces expect the html flowing into `composeSrcDoc` to be PRE-WRAPPED by `renderForPreview`. Future edits to either composeSrcDoc that re-introduce a `data-block-shell` wrap are a regression — the engine wrap becomes double and `@container slot` queries evaluate against the wrong box.

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

**Phase 3.5 follow-up (landed):** `preview-assets.ts` now emits only the outer `.slot-inner` wrap; `PreviewTriptych` calls `renderForPreview(block, { variants })` — the inline `composeVariants` helper was removed. §7 "deliberate divergence" flipped to `✅ RE-CONVERGED` on both PARITY.md files. Both surfaces structurally identical iframe DOM (live smoke DOM queries + snapshot pins). No behavior change — WHO-wraps refactor only.

## Variant Editor (WP-028 Phase 4 — additive)

As of Phase 4, `VariantsDrawer.tsx` ships a tabbed editor on both surfaces:
- **"Manage" tab** — fork/rename/delete list (Phase 3, unchanged).
- **Per-variant tabs** — 2-column editor (base HTML/CSS read-only | variant HTML/CSS editable) + width slider + mini-preview iframe.

Editor body byte-identical between surfaces mod 3-line JSDoc header + 1 surface-specific `composeSrcDoc` import path (Ruling GG explicit exception — block-forge `../lib/preview-assets`, Studio `./preview-assets`).

**Dispatch path:** textarea edit → 300ms debounce → `onAction({ kind: 'update-content', name, html, css })`. Flush-on-unmount (empty-deps cleanup effect reading latest-values via ref) guarantees closing the drawer mid-edit never drops content (Ruling BB).

**Mini-preview iframe:** uses reserved slug `'variant-preview'` — TweakPanel listener filters by `currentSlug` (the real block slug), so cross-iframe `block-forge:element-click` postMessages from this preview are silently dropped. No composeSrcDoc opt-out param needed (Ruling II). Render pipeline: `renderForPreview(base, { variants: [{ name, html, css }] })` → `composeSrcDoc({ html, css, width, slug: 'variant-preview' })`.

**Width slider:** range 320-1440 step 10. Default per variant name convention — `sm`/`4**`→480, `md`/`6**`→640, `lg`/`7**`→768, custom→640 (Ruling CC). Drives iframe `style.width` live.

**Save paths (per surface):**
- Studio: textarea → debounced `onAction` → `dispatchVariantToForm({kind:'update-content',...})` → `form.setValue('variants', next, { shouldDirty: true })` → RHF.isDirty footer → existing Save button → `updateBlockApi` → Supabase `blocks.variants` JSONB → `revalidate { all: true }` fire-and-forget.
- block-forge: textarea → debounced `onAction` → `updateVariantContent(session, name, content)` reducer → `session.isDirty` status bar → existing Save button → `fs.writeFileSync` → `content/db/blocks/{slug}.json`. `.bak` semantics preserved.

**Rename-race safety:** if the user renames or deletes a variant while a debounce is pending, the stale `update-content` dispatch silently no-ops at both dispatch sites (`dispatchVariantToForm` checks `action.name in current`; `updateVariantContent` checks `name in state.variants`).

**Undo symmetry:** `session.ts` extends `SessionAction` with `{ type: 'variant-update'; name; prev: BlockVariant }`; `undo()` restores the pre-edit payload. `isDirty()` picks up `variant-update` entries alongside existing variant-* actions.

**First real DB variants write lands at Phase 4** — verified via Playwright Studio save E2E + Portal render at variant BP (screenshots in `logs/wp-028/smoke-p4/`).

## Cross-contract test layers

Block-forge's safety net is two-layered:

1. **Core engine contract** — `packages/block-forge-core/src/__tests__/snapshot.test.ts.snap` freezes the `analyzeBlock` → `generateSuggestions` → `applySuggestions` → `composeVariants` → `renderForPreview` pipeline output for all 3 canonical fixtures + E2E. Any engine behavior drift fails at the package level before block-forge runs.
2. **UI surface contract** — `tools/block-forge/src/__tests__/integration.test.tsx` verifies that the Vite app consumes the engine identically: suggestion IDs flow through to DOM `data-suggestion-id`; Save POST payload matches `applySuggestions` output exactly; `requestBackup` flag flips correctly after first save per session.

A regression in one layer fails tests in that layer — never silently. The snapshot is the ground truth for fixture behavior (not the filename); see saved memory `feedback_fixture_snapshot_ground_truth.md`.

## Dirty-state contract (WP-028 Phase 5)

Authoritative enumeration of dirty signals + save-enabling sources across both surfaces. All rows reflect the canonical post-Phase-4 carve-out behaviour (Phase 4 fixed StatusBar `hasChanges` + `handleSave` pre-existing bugs where tweak-only and variant-only edits were silently non-saving) plus the Phase 5 OQ2 clear-signal fix (empty variants emit `null`, not `undefined`).

### Studio Responsive tab (RHF-driven)

| Source | Field | Triggers `formState.isDirty` | Save button reads |
|--------|-------|------------------------------|-------------------|
| Code textarea (Editor tab) | `form.code` | Yes (RHF native) | `formState.isDirty` |
| Suggestion Accept (Responsive tab) | `form.code` via `setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Tweak slider dispatch | `form.code` via `dispatchTweakToForm → setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Variant CRUD (fork/rename/delete) | `form.variants` via `dispatchVariantToForm → setValue('variants', ..., { shouldDirty: true })` | Yes | same |
| Variant editor (update-content) | `form.variants` via `dispatchVariantToForm({kind:'update-content'})` → `setValue` | Yes | same |

**Save payload shape (post-Phase-5):** `formDataToPayload` emits `variants: populated-map` when `Object.keys(data.variants).length > 0`, else `variants: null`. The `null` sentinel is the OQ2 clear-signal — Supabase JS `update({ variants: null })` NULLs the column; `update({ variants: undefined })` (pre-Phase-5) silently dropped the key and left the prior value intact. Validator accepts `variantsSchema.nullable().optional()`.

### tools/block-forge (session-driven)

| Source | State mutation | `isDirty(session)` true | StatusBar `hasChanges` reads |
|--------|----------------|-------------------------|------------------------------|
| Suggestion Accept | `pending.push(id)` | Yes | `isDirty(session)` |
| Suggestion Reject | `rejected.push(id)` | Yes | same |
| Tweak dispatch | `tweaks.push(tweak)` | Yes (post-Phase-4 StatusBar fix) | same |
| Variant fork | `variants[name] = {...}` | Yes | same |
| Variant rename | variants key swap | Yes | same |
| Variant delete | variants key removal | Yes | same |
| Variant editor (update-content) | `variants[name].html / .css` updated via `updateVariantContent` | Yes | same |
| Undo | history pop | If history non-empty, yes; else no-op | same |

**handleSave path (post-Phase-4+5):**
1. Early return if `!isDirty(session)` — prevents no-op fs writes (Phase 4 carve-out).
2. `accepted = pickAccepted(session, suggestions)`; `applySuggestions` only runs when `accepted.length > 0`, else html/css pass through verbatim (Phase 4 carve-out).
3. Payload `{ ...block, html: applied.html, css: applied.css, variants: hasVariants ? session.variants : null }` written via `saveBlock` → fs middleware. `null` on empty (Phase 5 OQ2 / Ruling LL — JSON.stringify preserves the key for disk/DB parity with Studio's PUT payload).
4. `.bak` written iff `!session.backedUp` (first save per session).
5. `clearAfterSave(session, refreshed.variants ?? {})` — session aligns to post-save disk state.

**Pre-existing save-path gap (Phase 5 result-log OQ5 candidate for Phase 6+):** `composeTweakedCss` runs in the render-time `composedBlock` memo (App.tsx L146-153) but is NOT called inside `handleSave`. A tweak-only save therefore writes the base CSS, not the tweak-composed CSS. Phase 4 carve-outs fixed the "save proceeds at all" bug; tweak-composition at save time was never in scope and is logged here for transparency. Phase 5 integration pins cover the save-happens half only.

### Cross-tab concurrency — last-write-wins semantics

Both surfaces follow last-write-wins — no per-tab isolation, no explicit conflict-resolution UI. Example scenarios:

1. **Studio:** Editor-tab textarea edits `form.code` → author switches to Responsive tab → tweak slider dispatches → `dispatchTweakToForm` also writes `form.code`. Result: tweak-composed CSS lands; manual textarea edits preserved iff outside the CSS region PostCSS `emitTweak` touched.
2. **block-forge:** Accept suggestion → tweak element → variant fork. All three land in `session` (each via a distinct reducer path); `handleSave` writes all in one fs round-trip.

Transparent last-write-wins is acceptable per the WP-028 workplan §5 directive: "document last-write-wins behaviour. No new logic unless real data loss." Phase 4 live-smoke confirmed no data loss on either surface. This section is the canonical documentation; Phase 6 Close cross-references it without duplication.
