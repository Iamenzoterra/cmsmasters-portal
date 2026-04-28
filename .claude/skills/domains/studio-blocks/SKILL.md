---
domain: studio-blocks
description: "Block editor, import panel, CSS token scanner, token map — the processing pipeline."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/studio/src/pages/block-editor.tsx` — 941-line editor with Process panel, preview iframe, import/export, 2-tab surface (Editor | Responsive)
2. `apps/studio/src/lib/block-processor.ts` — CSS scanner: finds hardcoded values, suggests token replacements
3. `apps/studio/src/lib/token-map.ts` — maps hex/px/font values to design token names
4. `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — engine-backed preview triptych + suggestion list; consumes `@cmsmasters/block-forge-core` `analyzeBlock → generateSuggestions → applySuggestions` pipeline (WP-027, ADR-025)

## Public API

(none — studio-blocks is consumed only within the Studio app via direct imports)

## Invariants

- **Processing is 100% client-side.** block-processor.ts scans CSS locally using regex-based parsing — no API calls for token analysis.
- **token-map defines the mapping tables.** `fontSizeTokens`, `lineHeightTokens`, `fontWeightTokens`, `spacingTokens`, `radiusTokens`, `shadowTokens`, `buttonColorTokens` + color converters (`hexToHsl`, `rgbToHsl`) + closest-match finders (`findClosestColorToken`, `findClosestSpacing`).
- **Suggestion confidence levels: `exact`, `close`, `approximate`.** Only `exact` matches are auto-applied. `close` and `approximate` require user review.
- **CSS scoping: every block gets `.block-{slug}` prefix.** This prevents style leaking between blocks on the portal.
- **block-import-panel preserves `<script>` tags** during HTML import. It strips `<html>`, `<head>`, `<body>` wrappers but keeps inline scripts.
- **Image tracking via `ImageRef` type.** block-processor detects images in HTML (`img-src`) and CSS (`css-url`), tracks their status (`new`, `existing`, `removed`) for R2 batch upload.
- **Responsive tab session state is pure — no React state inside session module.** `apps/studio/src/pages/block-editor/responsive/session-state.ts` exports pure functions (`createSession`, `accept`, `reject`, `undo`, `clearAfterSave`, `isActOn`, `pickAccepted`, `isDirty`). All React state lives in `ResponsiveTab`'s `useState`. Mirrors `tools/block-forge/src/lib/session.ts` minus `backedUp`/`lastSavedAt`.
- **Preview uses Path B — `renderForPreview(block, { variants })`.** The engine does compose+render in one call; Studio's `composeSrcDoc` deliberately single-wraps (drops the inner `data-block-shell` layer) because the engine already wraps. See `tools/block-forge/PARITY.md` → "WP-027 Studio Responsive tab cross-reference".
- **Save ALWAYS revalidates cache-wide.** `/api/content/revalidate` POST body is `{}` — Portal invalidates every tag. Path-scoped revalidation misses layout cache; see memory `feedback_revalidate_default.md`.

## Traps & Gotchas

- **"Token suggestions wrong after tokens.css update"** — token-map.ts has hardcoded token values (hex colors, px sizes). If tokens.css changes via /sync-tokens, token-map may become stale. Must update manually.
- **"Preview iframe blank"** — block-editor uses `srcdoc` for the preview iframe. CSP headers or browser extensions can block srcdoc. Also, tokens.css and portal-blocks.css are injected into the iframe via raw imports (`?raw` suffix in Vite).
- **"Import strips my scripts"** — block-import-panel DOES preserve `<script>` tags, but only from the `<body>`. Scripts in `<head>` are stripped with the wrapper.
- **`idCounter` in block-processor is module-level** — suggestion IDs increment across calls. `resetIdCounter()` exists for testing but is not called automatically between imports.
- **Suggestion `category` field** determines UI grouping: `color`, `typography`, `spacing`, `radius`, `shadow`, `component`. Component suggestions include `suggestedClass` (e.g., `.cms-btn`) and optional `warning`.
- **"Responsive tab Save button doesn't enable after Accept"** — missing `onApplyToForm` callback wiring. Accept updates session but not `formState.isDirty`. Wire the callback + `form.setValue('code', ..., { shouldDirty: true })` on every mount.
- **"Session wipes on tab switch"** — tab switch must use CSS `display: none`, NOT unmount. If future routing refactor unmounts, lift session state to `block-editor.tsx` before landing.
- **"Responsive tab preview is triple-nested"** — Studio's `composeSrcDoc` must NOT wrap `data-block-shell` — the engine already does. Triple-nest = silent `@container slot` query failure. Block-forge parity is `@layer shared` + outer `.slot-inner`; Studio inherits via Path B.

## Blast Radius

- **Changing block-processor.ts** — affects ALL block import/processing flows. Every CSS suggestion depends on this.
- **Changing token-map.ts** — affects token suggestion accuracy for ALL CSS properties
- **Changing block-editor.tsx** — affects block CRUD, import, export, Process panel preview, and all block editing UI
- **Changing block-import-panel.tsx** — affects HTML import with script preservation
- **Changing `apps/studio/src/pages/block-editor/responsive/session-state.ts`** — affects Responsive tab dirty-state, Accept/Reject/Undo flows, and the Save button enable/disable logic. Tests mirror block-forge's `session.test.ts` verbatim.
- **Changing `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx`** — affects the entire authoring surface for responsive heuristics. Consumers: `block-editor.tsx` only. No cross-app imports.

## Recipes

```typescript
// Scan CSS for hardcoded values:
import { scanCSS } from '../lib/block-processor'
const suggestions = scanCSS(cssString, selectorContext)
// Returns Suggestion[] with token replacement proposals

// Convert hex to HSL for token matching:
import { hexToHsl } from '../lib/token-map'
const hsl = hexToHsl('#218721') // { h: 120, s: 61, l: 33 }
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** block-processor depends on token-map — if tokens.css changes, token-map may need updates
- **note:** processing is 100% client-side — no API calls for token analysis

## Tweaks + Variants integration (WP-028, ADR-025 Layer 2 + Layer 4)

### Invariants (WP-028)
- **RHF form fields:** `code` (html+css merged string) + `variants: BlockVariants | null`. Both trigger `formState.isDirty` on mutation; Save footer consumes `formState.isDirty` as canonical save-enabling signal.
- **Dispatch helpers:**
  - `dispatchTweakToForm(form, tweak)` (`ResponsiveTab.tsx:138`) — reads LIVE `form.code` at dispatch time (**live-read invariant** — no stale closure), runs `emitTweak` PostCSS mutation, writes result via `setValue('code', ..., { shouldDirty: true })`.
  - `dispatchVariantToForm(form, action)` (`ResponsiveTab.tsx`) — mirrors dispatchTweakToForm pattern for variant CRUD + update-content.
- **OQ5 zero-touch (Studio side):** `emitTweak` lands in `form.code` at dispatch time; save serializes `form.code` verbatim (no composeTweakedCss step needed). Studio path SYMMETRIC with block-forge post-Phase-6. Contrast with block-forge: OQ5 affected block-forge only because its handleSave operated on raw `block.css`.
- **Empty variants emit `null` payload.** `formDataToPayload` (`block-editor.tsx:163`) emits `variants: populated-map` when `Object.keys(data.variants).length > 0`, else `null`. `null` sentinel is OQ2 clear-signal (WP-028 Phase 5 Ruling HH); validator accepts `variantsSchema.nullable().optional()`.

### Traps & Gotchas (WP-028)
- **`block-editor.tsx` LOC deviation 33/40.** Phase 5 left `block-editor.tsx` at 33 LOC over the 40-cap deviation baseline (export keyword on formDataToPayload + JSDoc refresh). Phase 6 zero-touch held this at 33/40. If future edits push above 40, refactor extraction required before landing.
- **OQ4 carry-forward to WP-029 Task A.** Studio-side variant CSS scoping validator (warn at edit time when variant CSS lacks `[data-variant="NAME"]` or `@container` reveal) is deferred to WP-029. If an author gets bitten by un-scoped variant CSS leaking to base variant (like WP-028 Phase 4 smoke caught), that's expected until WP-029 ships. Reference: `logs/wp-028/parked-oqs.md` §OQ4.
- **`VariantsDrawer.tsx` byte-identical body with block-forge.** Studio mirror is 1:1 except header + `composeSrcDoc` import path (`./preview-assets` vs block-forge `../lib/preview-assets`). Cross-surface sync-edit discipline enforced by `apps/studio/src/pages/block-editor/responsive/PARITY.md`.
- **`handleSave` revalidates cache-wide via `{}`.** `/api/content/revalidate` body is `{}` (WP-027 ≤15 LOC extension); invalidates every tag. Block CSS changes cascade to every theme using the block. Memory `feedback_revalidate_default.md` enforces this — do NOT default to `{ slug, type: 'block' }`.

### Blast Radius (WP-028)
- **Changing `formDataToPayload`** — breaks OQ2 clear-signal flow (null vs undefined emission). Studio integration pins in `responsive/__tests__/integration.test.tsx` + `block-editor/__tests__/formDataToPayload.test.ts` guard the null contract.
- **Changing `dispatchTweakToForm`** — affects TweakPanel → form.code bridge. TweakPanel.test.ts pins include LIVE-read semantics (3 tests: dispatch reads getValues at call time, no stale closure, handles missing style tag).
- **Changing `dispatchVariantToForm`** — affects VariantsDrawer CRUD + VariantEditor update-content → form.variants bridge. Integration tests cover rename-race safety + update-content flush.
- **Tightening `variants` schema to non-nullable** — silently breaks "delete all variants" save (regresses OQ2). Phase 5 Ruling HH: stay `nullable().optional()`.

### Recipes (WP-028)
1. **Add a new form field exposed via dispatch helper** — mirror the `dispatchTweakToForm` pattern: read LIVE via `form.getValues`, mutate, write via `setValue(..., { shouldDirty: true })`. Integration pin: assert `form.getValues()` reflects the dispatch call immediately.
2. **Debug "Save button doesn't enable after Accept/Tweak"** — check `onApplyToForm` callback is wired when mounting `ResponsiveTab` (optional but required for save-enabling). Verify `shouldDirty: true` flag on every setValue call inside dispatch helpers.

### WP-030 cross-surface PARITY (Responsive tokens.responsive.css)

`apps/studio/src/pages/block-editor/responsive/preview-assets.ts:19` already imports `tokensResponsiveCSS` via `?raw` since WP-027. Studio's iframe injection auto-resolves any change to `packages/ui/src/theme/tokens.responsive.css` (machine-generated by `tools/responsive-tokens-editor` post-WP-030). No Studio-side code change needed for token-content updates; cascade activation is automatic via Vite HMR.

Cross-surface mirror discipline applies: byte-identical body with `tools/block-forge/src/lib/preview-assets.ts` (modulo path depth + 3-line JSDoc header per Ruling GG). PARITY.md trio: `apps/studio/src/pages/block-editor/responsive/PARITY.md` §"WP-030 cross-surface PARITY (Phase 6)" + `tools/block-forge/PARITY.md` + `tools/responsive-tokens-editor/PARITY.md` (canonical save-flow contract).

Reference: WP-030 Phase 0 Ruling #4 reduced Studio-side Phase 6 work to docs-only (preview-assets.ts already wired).

## Variant CSS scoping validator (WP-029, ADR-025)

### Invariants (WP-029)
- **Validator is studio-internal + advisory.** `validateVariantCss(cssText,
  variantName)` is a pure PostCSS-based helper at
  `apps/studio/src/pages/block-editor/responsive/validateVariantCss.ts`. Output
  is `Warning[] | null`; never throws. Save is **never** blocked.
- **OR-semantics on multi-selector rules.** A CSS rule passes if EITHER (1) any
  selector includes `[data-variant="<this-variant-name>"]`, OR (2) any ancestor
  at-rule is `@container (…)` (named or unnamed; traverses across `@media`).
  Multi-selector rule like `.unscoped, [data-variant="sm"] .scoped { … }` is
  fine — the rule passes because one selector satisfies the scope check.
- **Banner is INLINE inside `VariantEditorPanel`** (no separate component
  file). JSX renders below the textareas grid (~L451 in `VariantsDrawer.tsx`).
  Tokens: `--status-warn-fg` / `--status-warn-bg` only — NOT `--status-warning-*`
  (the latter is a pre-existing Studio drift, tracked as a chip; see
  `logs/wp-028/parked-oqs.md` §OQ-α).
- **Latches on the existing 300ms debounce.** Validator state is local React
  state, lazy-initialized via `useState(() => validateVariantCss(...))` so
  pre-existing unscoped CSS is flagged at mount. Re-validates on
  `[variant, name]` change. Flush-on-unmount via `latestRef` (Ruling BB
  pattern); no separate validator timer.
- **Cross-surface mirror discipline relaxed for this surface.** The validator
  ships in Studio only — `tools/block-forge/src/components/VariantsDrawer.tsx`
  body is NO LONGER byte-identical to its Studio mirror. The cross-surface
  contract is intentionally bent for the WP-028 field-data window;
  re-evaluate per Task C / WP-030 (see `logs/wp-028/parked-oqs.md` §OQ-δ).

### Traps & Gotchas (WP-029)
- **Token drift trap.** New code MUST use `--status-warn-fg/bg`. The 6 existing
  `--status-warning-*` references in Studio (`block-editor.tsx:928`,
  `template-editor.tsx:387`, `slots-list.tsx:206/297`, `VariantsDrawer.tsx:302`,
  cross-surface mirror at `tools/block-forge/.../VariantsDrawer.tsx:302`) are
  pre-existing drift — do NOT inherit the broken namespace.
- **Initial-render priming is load-bearing.** `useState(() => validator(...))`
  lazy init is what flags pre-existing unscoped CSS at mount. A regular
  `useState(null)` + `useEffect` would only validate on first edit — pre-loaded
  block warnings would not show until the author types.
- **`form.setValue` is NOT involved.** Validator output is local component
  state; never written to RHF. RHF `formState.isDirty` independence is
  pinned by RTL test "save stays enabled" — do not bridge them.

### Blast Radius (WP-029)
- **Changing `validateVariantCss.ts`** — affects validator behavior matrix.
  12 inline-CSS unit cases in
  `apps/studio/src/pages/block-editor/responsive/__tests__/validateVariantCss.test.ts`
  pin OR-semantics, ancestor walk, parse-error, multi-selector. Adding a new
  accepted reveal syntax updates the unit cases + ADR-025 carry-over (h)
  table in `logs/wp-029/phase-0-result.md` §0.3.a.
- **Changing the inline banner JSX in `VariantEditorPanel`** — affects 5 RTL
  pins in `VariantsDrawer.test.tsx` + `editor-panel-sm` snapshot. Banner is
  the only Studio-specific JSX block in the cross-surface mirrored body;
  edits MUST stay Studio-only (block-forge mirror untouched per OQ-δ
  acceptance).

## Inspector cross-surface mirror (WP-033, ADR-025 Layer 2)

### Start Here (Inspector / Studio mirror)
1. `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector — Studio-side cross-surface contract + integration notes
2. `apps/studio/src/pages/block-editor/responsive/inspector/Inspector.tsx` — orchestrator (4 message listeners + useInspectorPerBpValues lifecycle)
3. `apps/studio/src/pages/block-editor/responsive/inspector/lib/dispatchInspectorEdit.ts` — Studio-local form mutation pattern (mirrors `dispatchTweakToForm` LIVE-read invariant)
4. `apps/studio/src/pages/block-editor/responsive/inspector/lib/css-mutate.ts` — `removeDeclarationFromCss` PostCSS decl removal (Studio-local; visibility-uncheck path)
5. `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` §Inspector mount — TweakPanel sibling + 3 curried callbacks (cell edit / apply token / visibility toggle)

### Invariants (Inspector / Studio mirror)
- **1:1 mirror of block-forge Inspector internals** — 9 source files mirrored byte-identical mod 3-line JSDoc per Phase 4 Ruling 1 REIMPLEMENT. Emit boundary diverges intentionally: block-forge uses `addTweak` reducer; Studio uses `dispatchInspectorEdit(form, edit)` form mutation.
- **`dispatchInspectorEdit` LIVE-read invariant** — uses `form.getValues('code')` at dispatch time (no closure cache); matches `dispatchTweakToForm` invariant from WP-028 Phase 2 OQ4. Three edit kinds: `tweak` / `apply-token` / `remove-decl`.
- **`removeDeclarationFromCss`** is Studio-local (no block-forge counterpart needed because block-forge uses session reducer). Bp=0 walks top-level rules; bp>0 walks `@container slot (max-width: {bp}px)` rules. Cleans empty rules + empty containers.
- **Studio's `preview-assets.ts` MUST mirror block-forge's Inspector IIFE block byte-identically** (Phase 4 Issue #2). Hover/unhover with rAF dedup + request-pin listener that sets `data-bf-pin` + posts `inspector-pin-applied` with `snapshotComputed`.
- **TweakPanel + Inspector coexist V1** (Phase 0 §0.4 + Phase 4 §4.6 verified). Both write to `form.code` via dispatch helpers. WP-033 §5.2 historical "Delete TweakPanel" task superseded by Phase 5 Brain ruling KEEP — sunset deferred.
- **`displayBlock` follows `watchedFormCode`** post-WP-033 Phase 5 OQ1 fix (`ResponsiveTab.tsx:518`). Inspector + TweakPanel + SuggestionList tweaks reflect in the visible iframe IMMEDIATELY (DevTools mental model). Falls back to suggestions-applied derivation when no form.code threaded.
- **Probe iframes pass through `renderForPreview`** before `composeSrcDoc` to match the visible DOM with `<div data-block-shell="{slug}">` wrap (Phase 3 §3.3 requirement, mirrored from block-forge in Phase 4).
- **`@cmsmasters/ui/responsive-config.json` package export** is the canonical chip-detection import path (post-Phase 4 Ruling 5). Both Studio + block-forge consume via `import responsiveConfig from '@cmsmasters/ui/responsive-config.json'`.

### Traps & Gotchas (Inspector / Studio mirror)
- **`<input>` blur events don't bubble in browser; React listens to `focusout`.** Vitest tests use `fireEvent.blur(...)` (testing-library); native code paths must dispatch `focusout` not `blur`. Same trap as block-forge surface.
- **`displayBlock` derivation affects ALL preview consumers** — currently only `ResponsivePreview` consumes it (1 consumer at L676). Phase 5 OQ1 fix verified low risk via §5.0.2 RECON. Future consumers (e.g. hypothetical export-preview) inherit live-form behaviour automatically.
- **`integration.test.tsx` regex must scope to "Select a block to preview"** — Inspector ALSO renders an empty state "Select a block to inspect elements." matching the broader `/Select a block/i` regex. Specificity matters.
- **`tsconfig.json` paths mapping for `@cmsmasters/ui`** takes precedence over package.json `exports` field with bundler resolution. Phase 4 Ruling 5 added an explicit `@cmsmasters/ui/responsive-config.json` paths entry; without it TypeScript errors at the chip-detection import site.
- **Studio's PARITY.md §7 wrap-LOCATION deviation** is documented (data-block-shell emitted by composeSrcDoc, not renderForPreview). Inspector probe iframes pass through `renderForPreview` to MATCH the visible DOM — do not "fix" the wrap to match block-forge's deeper wrap.
- **`watchedFormCode` flow into `displayBlock` is now load-bearing.** If the prop is dropped from ResponsiveTab callsite, displayBlock falls back to suggestions-applied derivation (test contexts) — but the visible iframe stops tracking Inspector edits. Always thread `watchedFormCode` from a parent that wraps `useWatch({ name: 'code' })`.

### Blast Radius (Inspector / Studio mirror)
- **`inspector/` hooks/components changes** require coordinated cross-surface edit with `tools/block-forge/src/components/{Inspector,InspectorPanel,...}.tsx` + hooks (see infra-tooling SKILL §Inspector / block-forge).
- **`ResponsiveTab.tsx::displayBlock` derivation** affects the entire visible preview — `ResponsivePreview` is the single consumer today; future consumers inherit. 5-test pin in `__tests__/responsive-tab-live-rerender.test.tsx` guards live-rerender + fallback contract.
- **`dispatchInspectorEdit.ts` contract** — adding a new `kind` (e.g. `multi-tweak` for WP-034 cascade-clear) requires updating both the type union and the switch + Inspector callsite. Test pin in `__tests__/dispatchInspectorEdit.test.ts` covers each kind branch.
- **`preview-assets.ts` Inspector IIFE block** — byte-identical contract with block-forge. Editing one without the other breaks PARITY trio. Audit trail: `apps/studio/.../PARITY.md` + `tools/block-forge/PARITY.md`.

### Recipes (Inspector / Studio mirror)
1. **Run Inspector live smoke at Studio:** `npm -w @cmsmasters/studio run dev` → `:5173/block-editor/{id}` → switch to Responsive tab → click pin on element → cell-edit at active BP → blur → visible iframe re-renders IMMEDIATELY (post-Phase 5 OQ1 fix). Verify TweakPanel + Inspector populate same selection.
2. **Add a new edit kind to dispatchInspectorEdit** — extend `InspectorEdit` type union, add switch branch in `dispatchInspectorEdit`, add Inspector callsite (e.g. new button in PropertyRow), add test in `dispatchInspectorEdit.test.ts`. Studio is the canonical site; block-forge has its own emit reducer (no parallel needed unless engine-level change).
3. **Debug "Inspector pin doesn't post message"** — check Studio's `preview-assets.ts` Inspector IIFE block matches block-forge byte-identically (Phase 4 Issue #2 was missing IIFE → no message dispatch). Compare ranges with diff or grep for `block-forge:inspector-`.

## Inspector UX Polish cross-surface mirror (WP-036, ADR-025 Layer 2)

### Start Here (Inspector UX polish / Studio mirror)
1. `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector UX Polish — Studio-side cross-surface contract + multi-iframe broadcast
2. `apps/studio/src/pages/block-editor/responsive/SuggestionGroupCard.tsx` — collapsed-by-default group card with inline-style flavour
3. `apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx` — `groupKey` + `buildEntries` primitives + branch render (singleton SuggestionRow vs N≥2 SuggestionGroupCard)
4. `apps/studio/src/pages/block-editor/responsive/session-state.ts` `removeFromPending` — per-id Undo reducer
5. `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` — `[data-bf-hover-from-suggestion]` outline rule + `inspector-request-hover` IIFE listener (Phase 1 mirror)

### Invariants (Inspector UX polish / Studio mirror)
- **Cross-surface PARITY** — `removeFromPending` reducer + `SuggestionGroupCard` component logic byte-identical to block-forge (mod Tailwind→inline-style). Group key tuple `(heuristic, bp, property, value, rationale)` is the same.
- **Studio multi-iframe broadcast** — `handlePreviewHover` at ResponsiveTab.tsx uses `querySelectorAll('iframe[title^="${slug}-"]')` to broadcast to ALL 3 triptych iframes simultaneously. Author's hover lights up element across desktop/tablet/mobile previews at once.
- **Studio SuggestionRow Undo parity** — Phase 2 brings Studio in line with block-forge: pending mode renders single Undo button (block-forge style, was Accept+Reject which silently no-op'd via Reject's pending guard).
- **`[data-bf-hover-from-suggestion]` is SEPARATE from native `[data-bf-hover]`** — same separation rationale as block-forge: avoid race with iframe's own mouseover handler.
- **Group rendering preserves engine atomicity** — `session.pending` still stores individual suggestion ids; grouping is render-time only. Save composition unchanged.

### Traps & Gotchas (Inspector UX polish / Studio mirror)
- **Studio rail layout has NO max-height** (block-forge uses `40vh shrink-0`); grouped cards MUST default to COLLAPSED to avoid pushing Inspector below the fold. Phase 0 RECON §Probe E concern; Phase 2 default-collapsed render fixes it.
- **Studio's existing `sorted = sortSuggestions(visible)` filters rejected before grouping** — group entries never see rejected ids. Defensive `rejectedIds.has(s.id)` in SuggestionGroupCard is redundant at Studio but matches block-forge byte-identically.
- **`tsc --noEmit` lint may fail with concurrent agent's PropertyRow drift** — those errors live in `tools/block-forge` only. Studio typecheck via `npm run lint` should be CLEAN (Phase 2 verified 245/245 + 53 new = 298 tests).

### Blast Radius (Inspector UX polish / Studio mirror)
- **`removeFromPending` reducer changes** — coordinated with block-forge mirror; both surfaces' SuggestionRow Undo wiring + SuggestionGroupCard "Reject all" routing depend on it.
- **Group key tuple changes** — break test fixtures at both surfaces (`__tests__/suggestion-grouping.test.ts`).
- **`SuggestionGroupCard` prop changes** — coordinated with `SuggestionList.tsx` branch render; both surfaces edit in lockstep.

### Recipes (Inspector UX polish / Studio mirror)
1. **Live smoke at Studio:** `npm -w @cmsmasters/studio run dev` → `:5173/blocks/080da794-b6cd-4865-9c2a-7d7586ceaff7` (global-settings UUID) → switch to Responsive tab → 1 grouped card with "3 selectors" badge appears (instead of 3 separate cards) → expand → 3 selector rows visible → Accept on row 1 → row gets pending pill + Undo → click Undo → row returns to default. Round-trip GREEN.
2. **Multi-iframe hover broadcast verification:** above setup, hover any selector row in expanded group → `data-bf-hover-from-suggestion` attribute appears on the matching element in ALL 3 iframes (1440 + 768 + 375). Confirmable via DevTools or Playwright `page.evaluate(...querySelectorAll('iframe').map(...contentDocument.querySelectorAll(...)))`.
3. **Add a new heuristic suggestion that should never group** — emit per-selector rationale with selector-unique data (childCount, computed px, etc.). The 5-tuple groupKey will keep them separate.

### Start Here (Inspector typed inputs + tooltips / Studio mirror — WP-037)
1. `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector Typed Inputs + Tooltips (WP-037) — Studio-side cross-surface contract + active-cell-only `<select>` rendering + Tooltip Provider wrapping
2. `apps/studio/src/pages/block-editor/responsive/inspector/property-meta.ts` — PROPERTY_META mirror file (byte-identical to block-forge mod 3-line JSDoc header)
3. `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx` — active-cell `<select>` branch when `meta.kind === 'enum'`; label `<button>` trigger when `meta.tooltip` exists (M/T/D grid layout preserved — Phase 0 RECON Ruling 1B)
4. `apps/studio/src/main.tsx` — `<TooltipProvider>` wraps `<App />` (via `<ToastProvider>`)

### Invariants (Inspector typed inputs + tooltips / Studio mirror — WP-037)
- **PROPERTY_META content byte-identical** between Studio and block-forge mirror (mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
- **Studio renders `<select>` in the ACTIVE M/T/D cell only** — inactive cells stay text spans + ↗ switch button (M/T/D grid UX preserved).
- **Studio's PropertyRow shape DIVERGES from block-forge** post-WP-033 polish — Studio is M/T/D grid, block-forge is single-cell. Phase 0 RECON Ruling 1B formalizes this; PARITY trio "byte-identical" claim narrowed to PROPERTY_META content + Tooltip primitive consumption.
- **`<TooltipProvider>` lives at `apps/studio/src/main.tsx`** (between `<ToastProvider>` and `<App />`). Providers compose; ToastProvider doesn't conflict.

### Traps & Gotchas (Inspector typed inputs + tooltips / Studio mirror — WP-037)
- **Studio Inspector test files need 3 `renderXxx` helpers** — `renderRow` / `renderPanel` / `renderInspector` in `__tests__/PropertyRow.test.tsx`, `…/InspectorPanel.test.tsx`, `…/Inspector.test.tsx` respectively. Pattern: `function renderRow(ui: ReactElement) { return render(<TooltipProvider>{ui}</TooltipProvider>) }`.
- **Studio's PropertyRow exposes the active-cell `<select>` via `data-testid="property-row-{label}-select-{bp}"`** (note the BP suffix). block-forge's testid is `property-row-{label}-select` (no BP suffix — single-cell). Test mirror is per-shape; don't copy testid patterns blindly.
- **Custom-value fallback works the same** on both surfaces — but Studio renders the disabled `(custom)` option only in the active cell. Inactive cells show the legacy value as plain text in their span.

### Blast Radius (Inspector typed inputs + tooltips / Studio mirror — WP-037)
- **Adding to PROPERTY_META** requires coordinated edit on Studio mirror file. Both surfaces' tests must update if a new property entry tests are added.
- **Removing `<TooltipProvider>` from main.tsx** crashes EVERY Inspector usage where label has tooltip — instant prod break.
- **Renaming `@cmsmasters/ui` Tooltip exports** breaks Studio's PropertyRow import — coordinated with block-forge mirror (both consume from the same DS package).

### Recipes (Inspector typed inputs + tooltips / Studio mirror — WP-037)
1. **Live smoke at Studio:** Studio dev → load any block → Responsive tab → click element to pin → scroll Inspector LAYOUT section → 4 select dropdowns visible (with dotted-underline labels) → hover `display` label → tooltip appears (auto-positioned to avoid Inspector right edge).
2. **Verify M/T/D shape preserved:** active cell shows `<select>`; inactive cells (M and T when D is active) show text spans like "block" + ↗ switch button. Click ↗ on T → activeBp=768 → T cell becomes the `<select>`.
3. **Cross-surface meta sync workflow:** edit `tools/block-forge/src/lib/property-meta.ts` first → copy entire body to `apps/studio/.../inspector/property-meta.ts` (preserve the JSDoc header) → run `npm test` on both surfaces.
