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
