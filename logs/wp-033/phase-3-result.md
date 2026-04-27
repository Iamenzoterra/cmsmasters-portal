# WP-033 Phase 3 — Result: Property editing + per-BP cell sourcing + token-aware suggestions + visibility wire

> Epic: WP-033 Block Forge Inspector
> Phase 3 of 5 — **GREEN**
> Owner: Hands (this terminal)
> Brain: phase-3-task.md
> Operator: Dmytro
> Effort: actual ~6h (under 12-17h budget)
> Status: ✅ COMPLETE — implementation + tests + manifest + live smoke green; ready for Brain review
> Commit: `936101a6` (impl) — task prompt was `83102a10`; result.md follow-up commit pending

---

## TL;DR — what shipped Phase 3

| Section | Outcome |
|---|---|
| §3.1 Per-property emit | ✅ Active cell editable on focus; blur/Enter commit; Esc cancel; em-validation reject |
| §3.2 useInspectorPerBpValues | ✅ 3 hidden iframes per pin; module-scoped cache by (selector, cssHash, slug); cleanup on unmount/clear |
| §3.3 useChipDetection + TokenChip | ✅ PostCSS cascade walk; 22-token compatibility table; two modes (in-use / available); bp:0 emit |
| §3.4 Visibility wire | ✅ Checkbox enabled when toggle provided; check → display:none tweak; uncheck → property-scoped removeTweakFor |
| §3.5 Tests + slider regression + manifest | ✅ +63 tests, +8 owned files, slider-bug regression GREEN |

**Outcome ladder:**

1. **Bronze — code lands, gates pass.** ✅ All 4 sub-tasks ship; arch-test 560/560; typecheck clean; 275 vitest passing.
2. **Silver — live smoke confirms each surface end-to-end.** ✅ Cell edit `.gauge-score` 60→48 lands tweak + iframe re-renders. Chip detection on `h2.heading` flips to `Use --h2-font-size ✓` → click → `Using --h2-font-size`. Visibility checkbox check → `display:none` in iframe → uncheck → element returns. ↗ at 768 → BP switches, pin preserved.
3. **Gold — slider-bug regression pinned.** ✅ 3 emitTweak vitest assertions verify the @container slot contract that fixed `ac739477`.

---

## §3.1 — Per-property emit

### What was implemented

**`tools/block-forge/src/components/PropertyRow.tsx`** — when `onCellEdit` provided AND cell is active AND value present, render `<input type="text">` instead of `<span>`. Inactive cells always stay `<span>` (Phase 0 §0.11.g — no edit-at-wrong-BP). Empty cells (`value: null`) stay `—` (jsdom hook fills these).

Validation: `isValidCellValue(v)` rejects empty + `em` (per `(?<!r)em` regex). `rem`, `px`, `%`, `var(...)`, keyword values all pass. Invalid input snaps back via `e.currentTarget.value = value` and skips `onCellEdit`.

```tsx
isEditable ? (
  <input
    type="text"
    defaultValue={value ?? ''}
    onBlur={(e) => {
      const next = e.currentTarget.value
      if (next === value) return                    // no-op same value
      if (!isValidCellValue(next)) {                 // em / empty reject
        e.currentTarget.value = value ?? ''
        return
      }
      onCellEdit?.(bp, next.trim())                  // commit
    }}
    onKeyDown={(e) => {
      if (e.key === 'Enter') e.currentTarget.blur()       // Enter commits
      if (e.key === 'Escape') {                            // Esc cancels
        e.currentTarget.value = value ?? ''
        e.currentTarget.blur()
      }
    }}
  />
) : (
  <span>...</span>
)
```

**Threading (chosen Option A — Inspector owns lifecycle):**

- `PropertyRow.onCellEdit(bp, value)` fires
- `InspectorPanel` curries via `editProp(property)` → `onCellEdit(pinned.selector, bp, property, value)`
- `Inspector` forwards untouched
- `App.handleInspectorCellEdit` dispatches `setSession((prev) => addTweak(prev, { selector, bp, property, value }))`

Synchronous (not debounced like TweakPanel slider) — discrete edit, not continuous drag. `composedBlock` memo picks up the new tweak; PreviewTriptych re-renders iframe.

### Test coverage

`__tests__/inspector-cell-edit.test.tsx` — 12 tests covering:
- Active cell renders input vs read-only span (with/without `onCellEdit`)
- Inactive cells stay span even with `onCellEdit`
- Empty active cells stay `—`
- Blur with new value calls `onCellEdit(bp, trimmedValue)`
- Blur with unchanged value is no-op
- Enter blurs (commits)
- Escape reverts + blurs (no commit)
- `em` value rejected (snaps back)
- `rem` value accepted (distinct from em)
- Empty value rejected

---

## §3.2 — useInspectorPerBpValues hook

### What was implemented

**`tools/block-forge/src/hooks/useInspectorPerBpValues.ts`** — owns 3 hidden iframes lifecycle. Per Ruling 1 (React hook, no Worker).

Pattern:
1. On `(pinned, blockHtml, effectiveCss, slug)` change: cache lookup; hit → setState + return; miss → spawn 3 iframes.
2. Each iframe at canonical width (375/768/1440); `position: absolute; left: -99999px`; srcdoc via `composeSrcDoc({html: probeRendered.html, css: probeRendered.css, width: bp, slug: 'inspector-probe-{bp}'})`.
3. `probeRendered = renderForPreview({slug, html, css}, { variants: [] })` — wraps with `<div data-block-shell="{slug}">` to MATCH the visible PreviewTriptych DOM (Phase 1 selector capture path). **Without this wrap, captured selectors like `div.slot-inner > div:nth-of-type(1) > section.X > …` fail to match** because composeSrcDoc only adds the outer `.slot-inner`. (Caught during live smoke — see Issues §.)
4. On each `load` event: `querySelector(pinned.selector)` → `harvestSnapshot(getComputedStyle(target))`.
5. After all 3 settle: cache.set(key, result); setState; iframes.remove().
6. Cleanup on unmount or pin clear: dispose in-flight iframes.

```ts
const probeRendered = renderForPreview(
  { slug: slug ?? 'inspector-probe', html: blockHtml, css: effectiveCss },
  { variants: [] },
)
// then iframe.srcdoc = composeSrcDoc({ html: probeRendered.html, css: probeRendered.css, ... })
```

### Wiring — Option A (Inspector owns hook)

`Inspector` calls `useInspectorPerBpValues({ pinned, blockHtml, effectiveCss, slug })` and passes the result map to `InspectorPanel` as `valuesByBp`. App threads `composedBlock?.html` and `composedBlock?.css` into `Inspector` as `blockHtml` and `effectiveCss` props.

### Sourcing precedence (escalation §5)

In `InspectorPanel.PropertySections.sourceByBp`:
- For activeBp cell: `cs[k] ?? valuesByBp?.[bp]?.[k] ?? null` — prefers Phase 1 visible iframe; falls back to hook.
- For inactive bp cells: `valuesByBp?.[bp]?.[k] ?? null` — hook only.

Rationale: visible iframe IS what the user sees rendered; hidden probe is for the inactive cells the user can't see.

### Test coverage

`__tests__/useInspectorPerBpValues.test.tsx` — 10 tests covering:
- Null pin → empty map, 0 iframes
- Empty blockHtml → empty map, 0 iframes
- Pin + html + css → 3 iframes spawn with correct titles + off-screen positioning
- Manual load dispatch (jsdom doesn't fire srcdoc load) → cleanup + state set
- Cleanup on unmount + on pin clear
- Cache hit on remount with same key spawns 0 iframes
- Cache miss on selector change spawns new iframes

**jsdom limitation:** srcdoc iframe `load` events don't fire under jsdom (no rendering pipeline). Tests dispatch the event manually to validate the load handler chain. Resolved-value correctness is verified in live smoke — see "Live smoke" §.

---

## §3.3 — useChipDetection + TokenChip

### What was implemented

**`tools/block-forge/src/hooks/useChipDetection.ts`** — `useMemo`-based detection.

Algorithm:
1. If `selector | effectiveCss` empty or property has no compatible tokens → `null`.
2. `findCascadeWinner(css, selector, property, activeBp)` walks PostCSS root: top-level rules first, then `@container slot (max-width: <bp>)` rules whose bp === activeBp. Within each, picks the LAST decl for `property` (cascade ≈ source order).
3. If source value is `var(--known-token)` AND token in compatible category → `mode: 'in-use'`, valuesByBp = resolveTokenAllBps.
4. Else if `valueAtActiveBp` parses as px AND matches some compatible token at activeBp (linear-interp via `responsive-config.json`) → `mode: 'available'`.
5. Else → `null`.

Token compatibility table (from Phase 3 task §3.3):
- `font-size` → 10 type tokens (`--text-display`, `--h1-font-size`…`--h4-font-size`, `--text-lg/base/sm/xs`, `--caption-font-size`)
- `margin-*`, `padding-*`, `gap`, `row-gap`, `column-gap` → 12 spacing tokens (`--spacing-3xs`…`--spacing-5xl`, `--space-section`)
- All others (text-align, font-weight, display, etc.) → no chip

Token resolution math:
```ts
function resolveTokenAtBp(token, bp, config): number | null {
  const { minPx, maxPx } = config.overrides[token] ?? null
  if (bp <= minViewport) return minPx
  if (bp >= maxViewport) return maxPx
  return Math.round(minPx + ((bp - 375) / (1440 - 375)) * (maxPx - minPx))
}
```

**`tools/block-forge/src/components/TokenChip.tsx`** — 2 modes:
- `mode: 'in-use'` → `<span>Using --token</span>` subdued, non-clickable
- `mode: 'available'` → `<button>Use --token ✓</button>` clickable; click → `onApply()` → App.dispatch `addTweak({selector, bp:0, property, value: 'var(--token)'})`

`title` attr carries M/T/D triple: `"Sets 34/37/42px at M/T/D"` for transparency.

### Wiring

`InspectorPanel.PropertyRowWithChip` wraps each PropertyRow:
- Calls `useChipDetection({ selector, property, valueAtActiveBp, activeBp, effectiveCss })`
- Renders `<TokenChip />` into PropertyRow's `tokenChip` slot
- `onApply` only set when `mode === 'available'`

### Test coverage

- `__tests__/useChipDetection.test.tsx` — 22 tests covering token resolution math (min/max/interp), parseVarToken, parsePx, compatibleTokens, var-source in-use, raw-px available, no-match null, incompatible category null, cascade winner respect, memoization stability.
- `__tests__/TokenChip.test.tsx` — 9 tests covering mode rendering, click → onApply, title attr shape, custom data-testid.

### Note on import path

`useChipDetection` imports `responsive-config.json` via relative path:
```ts
import responsiveConfig from '../../../../packages/ui/src/theme/responsive-config.json'
```
because `@cmsmasters/ui` package exports only `.` and Phase 3 hard gate forbids `packages/ui/**` mods. Documented inline at the import site. Vite resolves natively. If the file moves, this import + `tokens.css` consumers need a coordinated update.

---

## §3.4 — Visibility wire

### What was implemented

**`tools/block-forge/src/lib/session.ts`** — new `removeTweakFor(state, selector, bp, property)` reducer added (additive — `removeTweaksFor` selector+bp scoped reducer untouched). Like its sibling, no compensating history entry.

**`tools/block-forge/src/components/InspectorPanel.tsx`** — checkbox `disabled={!onVisibilityToggle}` and `checked={isHiddenAtActiveBp}`. `onChange` fires `onVisibilityToggle(activeBp, e.currentTarget.checked)`.

**`tools/block-forge/src/components/Inspector.tsx`** — derives `isHiddenAtActiveBp` from `tweaks` slice:
```ts
const isHiddenAtActiveBp = useMemo(() => {
  if (!pinned?.selector || !tweaks) return false
  return tweaks.some(
    (t) => t.selector === pinned.selector
        && t.bp === activeBp
        && t.property === 'display'
        && t.value === 'none',
  )
}, [pinned?.selector, activeBp, tweaks])
```

**`tools/block-forge/src/App.tsx`** — `handleInspectorVisibilityToggle`:
```ts
hide
  ? addTweak(prev, { selector, bp, property: 'display', value: 'none' })
  : removeTweakFor(prev, selector, bp, 'display')
```

Per Ruling 4 — show-back semantic restore (display: block vs flex vs grid) is DEFERRED. Uncheck removes only the `display:none` tweak, restoring the original cascade value.

### Test coverage

- `InspectorPanel.test.tsx` updates: 5 visibility tests (disabled-fallback, enabled-when-toggle, isHiddenAtActiveBp checked state, check fires `(bp, true)`, uncheck fires `(bp, false)`).
- `session.test.ts` adds: `removeTweakFor` 3 tests (selector+bp+property scoped removal, no-op on non-match same ref).

---

## §3.5 — Slider-bug regression pin

### What was implemented

**`tools/block-forge/src/__tests__/slider-bug-regression.test.ts`** — 3 tests:
1. `emitTweak({ bp: 1440, property: 'font-size', value: '48px' })` — output contains `@container slot (max-width: 1440px) { ... .gauge-score { font-size: 48px ... } }`.
2. `emitTweak({ bp: 0, value: 'var(--h2-font-size)' })` — output has `.gauge-score { font-size: var(--h2-font-size) }` at top-level (PostCSS walked: rule.parent.type === 'root').
3. Update overwrites existing `@container slot` decl from `48px` → `40px` without duplication; preserves top-level `60px` (different cascade scope).

### Manifest

`src/__arch__/domain-manifest.ts` `infra-tooling.owned_files` +8:
- `tools/block-forge/src/components/TokenChip.tsx`
- `tools/block-forge/src/hooks/useInspectorPerBpValues.ts`
- `tools/block-forge/src/hooks/useChipDetection.ts`
- `tools/block-forge/src/__tests__/inspector-cell-edit.test.tsx`
- `tools/block-forge/src/__tests__/useInspectorPerBpValues.test.tsx`
- `tools/block-forge/src/__tests__/useChipDetection.test.tsx`
- `tools/block-forge/src/__tests__/TokenChip.test.tsx`
- `tools/block-forge/src/__tests__/slider-bug-regression.test.ts`

`hooks/` directory established this phase. arch-test target: 552 + 8 = **560** ✅.

---

## Verification Results

### Static gates

| Gate | Target | Actual |
|---|---|---|
| arch-test | 560 / 560 | **560 / 560** ✅ |
| block-forge:typecheck | clean | **clean** ✅ |
| block-forge tests | 240+ passing | **275 passing, 6 skipped** ✅ |
| Studio + packages diff | 0 | 0 ✅ |
| TweakPanel.tsx diff | 0 | 0 ✅ |
| preview-assets.ts outline IIFE diff | 0 | 0 ✅ |
| PreviewTriptych.tsx diff | 0 | 0 ✅ |

### Live smoke (`tools/block-forge/` :7702 — `fast-loading-speed` block)

| Check | Evidence | Status |
|---|---|---|
| 3 cells populated for font-size | Active=60px, M=34px, T=60px (clamp interp) | ✅ |
| 3 hidden iframes spawn at pin | MutationObserver peakProbes=3 mid-event | ✅ |
| Iframes self-clean after settle | finalProbes=0 ~2s after pin | ✅ |
| Active cell click → input editable | `<input value="60px">` rendered with field-sizing | ✅ |
| Type 48px + blur → tweak commits + iframe re-renders | `{bp:1440, property:'font-size', value:'48px'}` in session.tweaks; iframe getComputedStyle = "48px" | ✅ |
| Pin h2.heading → token chip appears | `[Use --h2-font-size ✓]` (available mode), title `"Sets 34/37/42px at M/T/D"` | ✅ |
| Click chip → bp:0 tweak + chip flips to in-use | session.tweaks adds `{bp:0, value:'var(--h2-font-size)'}`; chip → `Using --h2-font-size` | ✅ |
| Visibility check → display:none in iframe | iframe getComputedStyle.display = "none"; tweak landed | ✅ |
| Visibility uncheck → element returns | display = "flex" (original); only display tweak removed (font-size 48px preserved) | ✅ |
| ↗ click on 768 cell → tab switch + re-pin | inspectorBpAfter="768", visibleIframe="fast-loading-speed-768", input now at 768 cell | ✅ |
| Slider-bug regression vitest GREEN | 3/3 emitTweak assertions pass | ✅ |

(`preview_screenshot` timed out at 30s — heavy iframe renderer, same Phase 2 issue. Eval-based proofs verify all 11 acceptance criteria via DOM/state inspection.)

---

## Issues & Workarounds

### 1. composeSrcDoc DOM mismatch with Phase 1 captured selectors (live-smoke catch)

**Symptom:** Hook spawned 3 probes, iframes loaded, but `result[bp]` came back null. Cells stayed `—`.

**Diagnosis:** Phase 1 captured selectors include the `<div data-block-shell="{slug}">` wrapper added by `renderForPreview`. The visible iframe runs html through `renderForPreview` (PreviewTriptych:75-89). My hook initially passed bare `blockHtml` to `composeSrcDoc`, which only adds the outer `.slot-inner`. So pinned selector `div.slot-inner > div:nth-of-type(1) > section…` had `:nth-of-type(1)` referring to a missing wrapper div in the probe iframe → `querySelector` returned null → harvest skipped.

**Fix:** Hook now calls `renderForPreview({slug, html, css}, { variants: [] })` before `composeSrcDoc`. Probe iframe DOM now matches visible iframe DOM. Live smoke confirms cells populate.

### 2. React `defaultValue` + native blur events in eval testing

**Symptom:** Setting `input.value = '48px'` programmatically + dispatching `new FocusEvent('blur')` did NOT fire React's onBlur. Logs were silent. Initial confusion that the wire was broken.

**Diagnosis:** React listens to `focusout` (not `blur`) for event delegation. Native `blur` events don't bubble. Native code paths must use `focusout` to trigger React handlers.

**Workaround in eval tests:** dispatch `new FocusEvent('focusout', { bubbles: true })`. Real user interaction (tab-out, click-elsewhere) generates focusout naturally. Vitest tests use `fireEvent.blur(...)` from `@testing-library/react` which dispatches the right event.

### 3. Cascade override: chip apply emits at bp:0 but @container rules can override

**Symptom:** Click `[Use --h2-font-size ✓]` on `.heading` → bp:0 tweak with `var(--h2-font-size)` lands; iframe getComputedStyle still resolves to 41.9997px even at 768 width (where token should resolve to ~37px).

**Diagnosis:** The original block CSS likely has `@container slot (max-width: 1440px) { .heading { font-size: 42px } }`. When chip-apply emits the var() at top-level, the @container rule is more specific in the cascade and wins. The chip's "fluid token applies at all 3 BPs" promise is true at the *top-level rule*, but pre-existing @container overrides still take precedence.

**Phase 3 decision:** Acceptable. The chip click is correct per task prompt — it emits `{bp:0, value:'var(--token)'}`. Resolving the cascade nuance would require either:
(a) ALSO emitting tweaks at all 3 BPs to clear the @container rules (multiplicative), OR
(b) a "remove @container overrides for this property" mode

**Document for Phase 4 / follow-up:** UX consideration — should chip-apply additionally clear conflicting @container rules? Surface as Open Question for Brain ruling. Phase 3 ships honest behavior with the task-prompted contract.

### 4. PostCSS dev-server warnings (Vite externalization)

**Symptom:** Console fills with `[warn] Module "path"/"url"/"source-map-js" has been externalized for browser compatibility`. PostCSS source-map facilities try to access Node modules.

**Impact:** None — warnings, not errors. Hook works correctly. PostCSS parse + walk run fine in browser.

**Fix needed?** No. These are Vite advisories about Node-only modules; ignored gracefully. If they grow noisy, consider `optimizeDeps.exclude: ['source-map-js']` but not Phase 3 scope.

---

## Brain Rulings — How they were honored

| Ruling | Phase 3 implementation |
|---|---|
| **R1** — useInspectorPerBpValues placement: React hook (no Worker) | ✅ Hook owns iframe lifecycle. useEffect + cleanup. Module-scoped cache. Inspector calls hook (Option A). |
| **R2** — useChipDetection scope: curated MVP × full 22-token table | ✅ 12 properties × 22 tokens via responsive-config.json. Property-token compatibility table per task prompt. |
| **R3** — Ancestors emit: DEFER | ✅ BreadcrumbNav unchanged. PinState payload contract unchanged. Phase 3 explicit non-goal. |
| **R4** — Visibility checkbox: hide-only | ✅ Check → addTweak({display:none}). Uncheck → removeTweakFor (property-scoped). Show-back semantic restore deferred. |

---

## Phase 4 entry conditions (all must be ✅)

- [x] Phase 3 GREEN — 275 vitest, arch-test 560, typecheck clean, live smoke verified end-to-end
- [x] Studio + packages untouched (Phase 4 mirror prerequisite)
- [x] TweakPanel coexists (no merge required for Phase 4)
- [x] Inspector postMessage protocol unchanged from Phase 1 (Phase 4 mirror reuses)
- [x] All 4 Brain rulings honored
- [x] No new escalation triggers fired (the composeSrcDoc DOM-shape issue self-resolved via renderForPreview)
- [x] Slider-bug regression pinned (no chance of subtly breaking @container behavior in Phase 4)

---

## Open Questions for Phase 4 (cross-surface mirror)

1. **Studio Responsive tab placement.** Where in `apps/studio/src/pages/block-editor/responsive/` does Inspector live alongside the existing TweakPanel mirror? Phase 4 task prompt should specify integration point + co-existence policy.

2. **Chip-apply cascade override** (Issue #3 above). Should clicking `[Use --h2-font-size ✓]` also remove conflicting `@container slot` rules at all 3 BPs that override the token? Phase 3 ships task-prompt-specified emit; UX may want richer "clear overrides + apply token" flow. Brain ruling needed.

3. **PARITY.md trio updates.** Phase 4 prompt should specify whether Studio mirror generates new PARITY.md entries or reuses the block-forge ones.

4. **`hooks/` placement in studio.** Studio doesn't currently have a `hooks/` directory in `apps/studio/src/pages/block-editor/`. Phase 4 may establish it parallel to the block-forge structure, or fold the hooks under `responsive/`.

5. **Responsive-config import.** Studio is the consumer of `@cmsmasters/ui` already; relative-path workaround used in block-forge (Issue documented in §3.3) won't be needed if Studio adds responsive-config.json to `@cmsmasters/ui` exports as part of the Phase 4 mirror. Brain ruling: should Phase 4 add the `./responsive-config.json` export to packages/ui? (Note: that would relax Phase 3's "packages/ui locked" gate — Phase 4 is a different gate context.)

---

## Phase 3 deferrals (out-of-scope this phase, surfaced for follow-up WPs)

- **Inheritance walker** for `inheritedFrom?` slot — Phase 0 §0.11.b explicit deferral. Slot stays empty. Multiplicative cost (parent ancestry × 3 BPs) requires its own scoping.
- **Show-back semantic restore** for visibility — Ruling 4 simplified to property-scoped removeTweakFor only. Document for Phase 5/follow-up.
- **BreadcrumbNav ancestor chain** — Ruling 3 deferral. Phase 5 close or post-WP-033 polish.
- **Chip-apply cascade-override clearing** — see Open Question #2.

---

## Files Touched (Phase 3 commit `936101a6`)

| File | Status | LOC delta |
|---|---|---|
| tools/block-forge/src/components/PropertyRow.tsx | MOD | +50 |
| tools/block-forge/src/components/InspectorPanel.tsx | MOD | +130 |
| tools/block-forge/src/components/Inspector.tsx | MOD | +50 |
| tools/block-forge/src/components/TokenChip.tsx | NEW | +50 |
| tools/block-forge/src/hooks/useInspectorPerBpValues.ts | NEW | +175 |
| tools/block-forge/src/hooks/useChipDetection.ts | NEW | +220 |
| tools/block-forge/src/App.tsx | MOD | +35 |
| tools/block-forge/src/lib/session.ts | MOD | +20 |
| tools/block-forge/src/__tests__/inspector-cell-edit.test.tsx | NEW | +220 |
| tools/block-forge/src/__tests__/useInspectorPerBpValues.test.tsx | NEW | +200 |
| tools/block-forge/src/__tests__/useChipDetection.test.tsx | NEW | +250 |
| tools/block-forge/src/__tests__/TokenChip.test.tsx | NEW | +110 |
| tools/block-forge/src/__tests__/slider-bug-regression.test.ts | NEW | +75 |
| tools/block-forge/src/__tests__/InspectorPanel.test.tsx | MOD | +75 |
| tools/block-forge/src/__tests__/PropertyRow.test.tsx | (unchanged) | 0 |
| tools/block-forge/src/__tests__/session.test.ts | MOD | +40 |
| tools/block-forge/src/__tests__/__snapshots__/InspectorPanel.test.tsx.snap | MOD (regen) | snapshot |
| tools/block-forge/src/__tests__/__snapshots__/PropertyRow.test.tsx.snap | MOD (regen) | snapshot |
| src/__arch__/domain-manifest.ts | MOD | +14 (8 paths + 6 comment) |

Total: **18 files, +1881 / -115 LOC** (per `git show 936101a6 --stat`).

---

## Notes for Brain Review

1. **One material implementation choice that wasn't in the task prompt — `renderForPreview` wrap in the hook.** Surface here so it's not lost: when `useInspectorPerBpValues` builds probe srcdoc, it must call `renderForPreview` to wrap the html with `<div data-block-shell="{slug}">…</div>`. Otherwise pinned selectors don't match the probe DOM. Caught during live smoke; documented in Issue #1 + inline code comment. This adds a runtime dependency from `@cmsmasters/block-forge-core` (already used by App.tsx via emitTweak; no new package surface).

2. **Cascade override on chip apply** — see Open Question #2. Phase 3 ships the contract per task prompt. Phase 4 may want to revisit UX. Surface for ruling early since Studio mirror copies the chip behavior verbatim.

3. **`hooks/` directory** established under `tools/block-forge/src/`. This is a new convention within block-forge (no prior hooks/ existed). Per arch-test rules, all 2 new hook files registered in manifest. Phase 4 Studio mirror may follow the same pattern.

4. **Slider-bug regression pin is defensive** — it pins the contract that fixed the bug WP-033 was born to fix. Phase 3 would have shipped fine without it; the pin protects against future @container handling regressions.

5. **Test count delta is +63** (212 → 275). Breakdown:
   - inspector-cell-edit: 12
   - useInspectorPerBpValues: 10
   - useChipDetection: 22
   - TokenChip: 9
   - slider-bug-regression: 3
   - InspectorPanel updates: +5 (visibility checkbox flow)
   - session.ts removeTweakFor: 3
   - PropertyRow snapshot regen + new properties: -1 (snapshot count adjustment)

6. **Auto mode operated as intended** — single material question would have been cascade-override Phase 3 vs Phase 4, judgment call: Phase 3 ships task-prompt contract verbatim, Brain rules on Phase 4 enrichment. No pre-code escalation needed; live smoke surfaced the renderForPreview issue mid-implementation, which I fixed and documented inline.

---

## Git

- Phase 3 task prompt: `83102a10` — `docs(wp-033): phase 3 task prompt …`
- Phase 3 implementation: **`936101a6`** — `feat(block-forge): WP-033 phase 3 …` — 18 files, +1881/−115 LOC
- Phase 3 result.md (this file): committed in follow-up

---

## Brain → Operator handoff

Phase 3 GREEN. All 4 Brain rulings honored. Live smoke end-to-end verified. Slider-bug regression pinned. 1 implementation discovery (renderForPreview wrap requirement) surfaced + fixed during smoke. 2 deferrals + 1 cascade-override Open Question documented for Phase 4.

Ready for Brain review and Phase 4 (cross-surface Studio mirror) entry on approval.
