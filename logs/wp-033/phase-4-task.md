# WP-033 Phase 4 — Task Prompt: Cross-surface Studio mirror + PARITY trio sync

> Epic: WP-033 Block Forge Inspector
> Phase 4 of 5 (per WP §Phases)
> Owner: Hands (separate Claude Code terminal)
> Brain: this prompt
> Operator: Dmytro
> Effort budget: 13–18h (1-2h §4.0 RECON + 12-16h impl/tests/PARITY)
> Status: 📋 PENDING — task prompt drafted, awaiting Operator approval to commit + handoff
> Pre-conditions met: Phase 3 GREEN (275 vitest · arch-test 560/560 · live smoke verified end-to-end · 4 Brain rulings honored · slider-bug regression pinned · 1 implementation discovery — `renderForPreview` wrap — surfaced + fixed inline)

---

## TL;DR — what Hands ships in Phase 4

**Mirror Phase 3 Inspector surface to Studio Responsive tab + PARITY trio sync:**

1. **§4.0 RECON pre-flight** (1-2h) — verify Studio's current ResponsiveTab structure, hooks/ absence, dispatchTweakToForm contract still holds, responsive-config relative-import gotcha, ResponsiveTab integration point, PARITY trio current state.
2. **§4.1 Mirror 9 source files** (4-5h) — BreadcrumbNav, PropertyRow, TokenChip, InspectorPanel, Inspector, useInspectorPerBpValues, useChipDetection + 2 Studio-local lib helpers (dispatchInspectorEdit, removeDeclarationFromCss).
3. **§4.2 Mirror 10 test files** (3-4h) — 7 mirrored from block-forge + 1 cell-edit integration + 2 lib unit.
4. **§4.3 ResponsiveTab integration** (1-2h) — mount Inspector alongside TweakPanel; thread form.code; coexistence policy.
5. **§4.4 PARITY.md trio sync** (1-2h) — block-forge ↔ Studio Responsive ↔ responsive-tokens-editor.
6. **§4.5 Manifest + arch-test** (1h) — +19 owned_files; target 579/579.
7. **§4.6 Live smoke at Studio** (1h) — verify 9-12 acceptance criteria identical to Phase 3 block-forge smoke.

**Hard gates — zero touch:**
- ❌ `tools/block-forge/src/**` — Phase 3 surface LOCKED. **Pure mirror, no upstream changes** (chip-apply cascade override IS deferred per Ruling 2 below).
- ❌ `packages/block-forge-core/src/**` — engine LOCKED.
- ❌ `packages/ui/src/**` other than `responsive-config.json` re-export (see Ruling 5).
- ❌ Studio TweakPanel.tsx + dispatchTweakToForm + splitCode/assembleCode (the Studio emit pipeline) — coexist and reuse, no edits.
- ❌ Studio's existing variant/suggestion infra (VariantsDrawer, SuggestionList, validateVariantCss) — orthogonal concerns.

**Soft gate — light edits OK:**
- ✅ `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — mount Inspector + thread props (small additive change, no removal of existing wires).
- ✅ `packages/ui/package.json` — add `./responsive-config.json` to exports (Ruling 5 below).
- ✅ Three PARITY.md files — additive Inspector cross-surface sections.
- ✅ `src/__arch__/domain-manifest.ts` — +19 owned_files in `studio-blocks` domain (NOT `infra-tooling`).

---

## §4.0 — RECON pre-flight (mandatory, 1-2h, zero code)

Per saved memory `feedback_preflight_recon_load_bearing` — Phase 0 RECON caught 24 pre-code traps across WP-027. Phase 4 RECON pre-flight is mandatory before any code lands.

### §4.0.1 — Studio responsive directory baseline

`find apps/studio/src/pages/block-editor/responsive -type f -name "*.ts" -o -name "*.tsx"` and document:
- Current src files (8 known: ResponsiveTab, TweakPanel, ResponsivePreview, PreviewPanel, SuggestionList, SuggestionRow, VariantsDrawer, validateVariantCss, session-state, preview-assets)
- Current test files
- Subdirectory absence: confirm `inspector/` and `hooks/` do NOT exist yet (Phase 4 establishes them)

### §4.0.2 — `dispatchTweakToForm` invariant verification

Read `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` lines 138-153. Confirm:
- LIVE-read invariant (`form.getValues('code')` at dispatch time, no closure cache) still holds
- `splitCode` + `emitTweak` + `assembleCode` chain unchanged from WP-028
- `shouldDirty: true` flag still set on setValue (Studio's form state coordination)

If any drift since Phase 3 close, ESCALATE — Phase 4 emit path depends on this contract.

### §4.0.3 — Studio test infrastructure baseline

Confirm Studio's vitest setup matches block-forge's `test: { css: true }` for `?raw` CSS imports (saved memory `feedback_vitest_css_raw`). Check `apps/studio/vite.config.ts` or equivalent.

Check whether `@testing-library/user-event` is installed in Studio (block-forge does NOT have it). If absent, mirror Phase 3 pattern (fireEvent + act + 350ms debounce flush per saved memory).

### §4.0.4 — `responsive-config.json` consumer count

Grep for `responsive-config.json` imports across the repo. Document:
- Phase 3 block-forge import (relative path workaround — Issue documented in Phase 3 §3.3)
- Any other consumers (responsive-tokens-editor? package internals?)
- packages/ui current `exports` field shape — does `./responsive-config.json` already exist or need adding?

### §4.0.5 — ResponsiveTab integration point

Read `ResponsiveTab.tsx:560-580` (TweakPanel mount block). Identify:
- Where `<TweakPanel>` mounts in the render tree
- What props it consumes (selection, appliedTweaks, onBpChange, onTweak, onReset, onClose)
- Where `<Inspector>` should mount (sibling to TweakPanel? wrapper? tab-style toggle?)
- Whether selection state shared between TweakPanel and Inspector (both listen to `block-forge:element-click` per Phase 0 §0.4)

**RECON output:** Document a proposed integration shape WITHOUT writing code. Brain ruling embedded below provides default; Hands may propose alternative if RECON surfaces a better fit.

### §4.0.6 — PARITY trio current state

Read all 3 PARITY.md files:
- `tools/block-forge/PARITY.md`
- `apps/studio/src/pages/block-editor/responsive/PARITY.md`
- `tools/responsive-tokens-editor/PARITY.md`

Identify:
- Which sections describe iframe injection (Phase 4 may need to add Inspector-related runtime if any new postMessage types land — none expected per Phase 3 result.md)
- Section anchor pattern (`## Contract (Phase X)`, `### Token injection`, etc.) so Phase 4 additions follow the same style
- Any §7+ deviation rules (Studio currently has §7 wrap-LOCATION deviation — Inspector mirror inherits or stays neutral)

### §4.0.7 — Studio-local form mutation pattern (visibility uncheck)

Phase 3 block-forge used `removeTweakFor(state, selector, bp, property)` — operates on `session.tweaks` array. Studio has NO equivalent session — form.code is the SOT. Confirm via RECON:
- Studio has no `removeTweakFor` analog
- Phase 4 needs a NEW Studio-local `removeDeclarationFromCss(css, selector, bp, property): string` helper using PostCSS walk + `decl.remove()`
- Location: `apps/studio/src/pages/block-editor/responsive/inspector/lib/css-mutate.ts` (Studio-local; not pushed up to engine)

### §4.0.8 — RECON output requirements

Output: a `logs/wp-033/phase-4-result.md §4.0` section with:
- ✅/⚠️/❌ verdict per probe
- Documented current state of each baseline check
- Proposed integration shape (§4.0.5)
- Any discrepancies vs Brain rulings — surface BEFORE code lands
- Pass/fail gate: if ANY ❌ → escalate to Brain; do NOT proceed to §4.1

---

## Brain rulings (5 — all 5 Phase 3 Open Questions resolved)

These rulings are LOCKED for Phase 4 entry. Hands MAY surface RECON findings that conflict with a ruling — escalate, do NOT silently override.

### 🔔 Ruling 1 — Studio Inspector placement: **REIMPLEMENT under `apps/studio/src/pages/block-editor/responsive/inspector/`**

**Decision:** Mirror Phase 3 block-forge Inspector surface as a sibling subdirectory to TweakPanel. Files: `inspector/{Inspector,InspectorPanel,PropertyRow,BreadcrumbNav,TokenChip}.tsx` + `inspector/hooks/{useInspectorPerBpValues,useChipDetection}.ts` + `inspector/lib/{dispatchInspectorEdit,css-mutate}.ts`.

**Rationale:**
- Phase 0 §0.5 ruling REIMPLEMENT held for TweakPanel cross-surface dup; Phase 4 follows same pattern for Inspector. The composite criterion (LOC > 800 OR qualitative I/O divergence) trips in LOC but the qualitative I/O divergence at the EMIT boundary (block-forge: session.tweaks; Studio: form.code via dispatchTweakToForm) makes a shared package premature. YAGNI.
- Sibling directory `inspector/` (vs flat in `responsive/`) keeps the new surface visually scoped — doesn't pollute the existing flat structure already populated with TweakPanel + ResponsivePreview + etc.
- Future extract path: if Inspector enters Phase 6+ feature work and the LOC drift becomes painful, extract to `packages/block-forge-ui/` as a follow-up WP. Phase 4 ships REIMPLEMENT.

### 🔔 Ruling 2 — Chip-apply cascade override (Phase 3 Issue #3): **DEFER to follow-up WP, document as known limitation**

**Decision:** Phase 4 Studio mirror copies block-forge chip-apply behavior VERBATIM. Single bp:0 tweak emits `var(--token)` at top-level. Pre-existing `@container slot` rules may still override — document this as a known limitation in Phase 4 PARITY.md additions + add a tooltip on the chip "Existing breakpoint overrides may take precedence".

**Rationale:**
- The cascade override is a real product trap surfaced in Phase 3 live smoke (`.heading` raw 42px → click chip → resolves to 41.9997px not the expected ~37px at 768).
- Phase 4 is a cross-surface MIRROR phase. Behavior changes need their own design ruling (chip emits 1 vs 3-or-4 tweaks; whether to clear existing @container rules; what the tooltip says). That's a Phase 6+ Inspector-polish WP, NOT Phase 4 scope.
- Surface the limitation explicitly so the user sees it and can plan. Add tooltip text: `Note: existing breakpoint overrides may still apply. To clear them, edit the cells individually first.` — Studio chip + block-forge chip both gain this tooltip; coordinated in Phase 4.
- Document Phase 3 Issue #3 in `apps/studio/src/pages/block-editor/responsive/PARITY.md` "Known limitations" section + cross-ref `tools/block-forge/PARITY.md`.

**Block-forge tooltip update:** Phase 4 may make the SINGLE allowed edit to block-forge: add the tooltip string to `TokenChip.tsx`. Hands MUST document this in Phase 4 result.md as the only block-forge-side touch (additive; no behavioral change). If RECON §4.0.5 reveals this as more invasive than expected, escalate.

### 🔔 Ruling 3 — PARITY.md trio update strategy: **Additive Inspector section in all 3 files**

**Decision:** Each of the 3 PARITY.md files gains a new section `## Inspector (Phase 4 — WP-033)` describing:
- Owned files (per surface)
- Cross-surface mapping (block-forge file → Studio mirror file → responsive-tokens-editor's responsive-config consumer note)
- Known limitations (chip cascade override per Ruling 2)
- postMessage types reused (Phase 1 protocol — no new types in Phase 4)
- DOM hierarchy match (probe iframes use renderForPreview wrap per Phase 3 Issue #1)

**Rationale:**
- Trio sync rule: any PARITY edit in one file must apply in others. Phase 4 lands all 3 in same commit.
- responsive-tokens-editor's PARITY.md is the smallest delta — just notes that responsive-config.json is now consumed by Inspector chip detection (already noted via packages/ui consumer count).
- block-forge's PARITY.md gains "Studio mirror at: …" cross-ref.
- Studio's PARITY.md gains the largest delta (mirrors block-forge content for the Inspector subdirectory).

### 🔔 Ruling 4 — `hooks/` placement in Studio: **Nested under `inspector/hooks/`, not parallel to `responsive/`**

**Decision:** `apps/studio/src/pages/block-editor/responsive/inspector/hooks/{useInspectorPerBpValues,useChipDetection}.ts` — nested under the new `inspector/` subdirectory.

**Rationale:**
- Keeps Inspector surface self-contained. Other Studio code doesn't share these hooks (chip detection is Inspector-specific; per-BP iframe pool is Inspector-specific).
- If a future hook needs cross-Studio reuse, lift then. YAGNI.
- Mirrors block-forge structure: `tools/block-forge/src/hooks/` → `apps/studio/src/pages/block-editor/responsive/inspector/hooks/` (close enough; no API churn).

### 🔔 Ruling 5 — `responsive-config.json` import: **Add `./responsive-config.json` to `@cmsmasters/ui` exports + migrate block-forge import**

**Decision:** Phase 4 adds `./responsive-config.json` to `packages/ui/package.json` exports. Studio uses package import (`import responsiveConfig from '@cmsmasters/ui/responsive-config.json'`). Block-forge's relative-path workaround migrates to package import in the same commit (single source-of-truth coordinated update).

**Rationale:**
- The relative path `../../../../packages/ui/src/theme/responsive-config.json` from block-forge is a workaround documented in Phase 3 §3.3. Two surfaces consuming the same SOT via different import paths IS the bug-magnet pattern saved memory `feedback_external_lib_semantic_contract` warns against (precision artifact of "this specific path on this specific dev's machine works").
- packages/ui already exports `tokens.css` and other internals via the `exports` field — adding `responsive-config.json` is the same well-trodden pattern (1-line addition).
- Coordinated migration in same commit avoids drift.
- This is the ONLY Phase 4 packages/ui touch. The hard gate "❌ packages/ui/src/**" remains intact (only `package.json` changes; no source files).

**Hard-gate caveat documented:** Phase 4 result.md §Issues must explicitly note "packages/ui/package.json modified for Ruling 5 — exports addition only, source files untouched."

---

## §4.1 — Mirror 9 source files

### File-by-file (mirror with Studio-specific adaptations)

#### §4.1.1 `apps/studio/src/pages/block-editor/responsive/inspector/BreadcrumbNav.tsx`

**Identical to block-forge** except for the `import type { HoverState, PinState } from './Inspector'` path (relative within the inspector subdirectory). 1:1 mirror.

#### §4.1.2 `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx`

**Identical to block-forge.** Validation regex, BP map, active-cell input, ↗ button, tokenChip slot — all 1:1.

`InspectorBp` import switches to local `'./Inspector'`.

#### §4.1.3 `apps/studio/src/pages/block-editor/responsive/inspector/TokenChip.tsx`

**Identical to block-forge except: add tooltip per Ruling 2.**

```tsx
<button
  type="button"
  // ... existing props
  title={`Sets ${valuesByBp[375]}/${valuesByBp[768]}/${valuesByBp[1440]}px at M/T/D · Note: existing breakpoint overrides may still apply.`}
>
```

The same tooltip update lands in `tools/block-forge/src/components/TokenChip.tsx` in the SAME COMMIT (Phase 4 single allowed block-forge touch per Ruling 2 footnote).

#### §4.1.4 `apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx`

**Identical structurally to block-forge.** All 4 sections, conditional rows, per-axis margin/padding, visibility checkbox.

Differences from block-forge:
- `tweaks` prop signature stays — Studio derives from `parseTweaksFromCode(form.code)` (Studio-local helper or inline)
- Visibility's `isHiddenAtActiveBp` derives from form.code (CSS analysis), not session.tweaks list

#### §4.1.5 `apps/studio/src/pages/block-editor/responsive/inspector/Inspector.tsx`

**Mostly identical** with these adaptations:
- Owns `useInspectorPerBpValues` lifecycle (Option A from Phase 3)
- Receives `form` prop instead of `slug + activeBp + onActiveBpChange + tweaks + onCellEdit + onApplyToken + onVisibilityToggle` — packed differently
- Internally derives all the dispatch handlers via `dispatchInspectorEdit(form, edit)`

Wait — to keep mirror byte-similarity high, prefer **Inspector receives the SAME prop shape as block-forge** (slug/activeBp/onCellEdit/etc.). Studio's ResponsiveTab adapts those callbacks to form-aware dispatchers via the inline form closure:

```tsx
<Inspector
  slug={selectedSlug}
  activeBp={inspectorBp}
  onActiveBpChange={setInspectorBp}
  blockHtml={composedBlock?.html ?? ''}
  effectiveCss={composedBlock?.css ?? ''}
  tweaks={parseTweaksFromCode(form.getValues('code'))}
  onCellEdit={(selector, bp, property, value) => {
    dispatchInspectorEdit(form, { selector, bp, property, value })
  }}
  onApplyToken={(selector, property, tokenName) => {
    dispatchInspectorEdit(form, { selector, bp: 0, property, value: `var(${tokenName})` })
  }}
  onVisibilityToggle={(bp, hide) => {
    if (hide) {
      dispatchInspectorEdit(form, { selector: pinned.selector, bp, property: 'display', value: 'none' })
    } else {
      dispatchInspectorEdit(form, { selector: pinned.selector, bp, property: 'display', value: REMOVE_DECL })
    }
  }}
/>
```

**Inspector internals identical across surfaces; emit handlers diverge at the ResponsiveTab boundary.** Maximizes mirror byte-equality.

#### §4.1.6 `apps/studio/src/pages/block-editor/responsive/inspector/hooks/useInspectorPerBpValues.ts`

**Identical to block-forge.** Same renderForPreview wrap pattern (Phase 3 Issue #1 already addressed). Same module-scoped cache. Same dependency on `composeSrcDoc` — but Studio's preview-assets.ts has its own composeSrcDoc; the hook imports from local `../../preview-assets` (Studio-local), NOT block-forge's.

**Caveat:** if Studio's composeSrcDoc and block-forge's diverge in any way (Phase 1 ruling: Studio-deviation §7 about wrap-LOCATION), the hook may need surface-specific composeSrcDoc handling. RECON §4.0.5 verifies.

#### §4.1.7 `apps/studio/src/pages/block-editor/responsive/inspector/hooks/useChipDetection.ts`

**Identical to block-forge** with Ruling 5 import change:

```ts
import responsiveConfig from '@cmsmasters/ui/responsive-config.json'
```

Per Ruling 5, packages/ui exports add this; both surfaces use the package import.

#### §4.1.8 `apps/studio/src/pages/block-editor/responsive/inspector/lib/dispatchInspectorEdit.ts`

**NEW Studio-local helper.** Wraps form mutation pattern:

```ts
import { emitTweak, type Tweak } from '@cmsmasters/block-forge-core'

export const REMOVE_DECL = '__remove__' as const

export function dispatchInspectorEdit(
  form: { getValues: (key: 'code') => string; setValue: (key: 'code', value: string, opts?: { shouldDirty?: boolean }) => void },
  edit: Tweak | { selector: string; bp: number; property: string; value: typeof REMOVE_DECL },
): void {
  const liveCode = form.getValues('code')
  const { html, css } = splitCode(liveCode)
  const nextCss =
    edit.value === REMOVE_DECL
      ? removeDeclarationFromCss(css, edit.selector, edit.bp, edit.property)
      : emitTweak(edit as Tweak, css)
  form.setValue('code', assembleCode(nextCss, html), { shouldDirty: true })
}
```

`splitCode` + `assembleCode` are imports from `'../../ResponsiveTab'` (where dispatchTweakToForm currently exports them) OR re-implemented locally if the existing exports don't expose them. RECON §4.0.5 verifies.

`removeDeclarationFromCss` from `./css-mutate` (next file).

#### §4.1.9 `apps/studio/src/pages/block-editor/responsive/inspector/lib/css-mutate.ts`

**NEW Studio-local helper.** PostCSS-based declaration removal:

```ts
import postcss, { type AtRule as PcssAtRule, type Rule as PcssRule } from 'postcss'

/**
 * Remove a single declaration matching (selector, bp, property) from css.
 * - bp === 0: top-level rule
 * - bp > 0: rule inside @container slot (max-width: <bp>px)
 *
 * If the declaration's parent rule has no other declarations left, remove the
 * rule. If a @container has no rules left, remove the @container.
 *
 * Returns css unchanged if no match.
 */
export function removeDeclarationFromCss(css: string, selector: string, bp: number, property: string): string {
  const root = postcss.parse(css)
  // ... walk + remove + cleanup empty rules / containers
  return root.toString()
}
```

Implementation walks the AST per the bp === 0 (top-level) vs bp > 0 (@container) split. Cleans up empty rules + empty @container blocks (mirror inverse of emitTweak's "create-if-missing" logic). Tests verify no orphaned empty rules.

### Section budget: 4-5h

---

## §4.2 — Mirror 10 test files

### Mirror plan

Phase 3 tests transplant 1:1 with paths adapted. Studio's vitest config already supports the same patterns.

| Phase 3 test file | Studio mirror file | Adaptations |
|---|---|---|
| `inspector-cell-edit.test.tsx` | `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/inspector-cell-edit.test.tsx` | Wraps with TanStack Form harness; mocks form.getValues + setValue; asserts dispatchInspectorEdit invocation shape |
| `useInspectorPerBpValues.test.tsx` | mirror | Identical structurally; uses Studio's preview-assets.ts |
| `useChipDetection.test.tsx` | mirror | Updates the responsive-config import path (per Ruling 5) |
| `TokenChip.test.tsx` | mirror | +1 test verifying the cascade-override tooltip (Ruling 2) |
| `InspectorPanel.test.tsx` | mirror | Verifies visibility checkbox check/uncheck → dispatchInspectorEdit invocation |
| `PropertyRow.test.tsx` | mirror | Identical |
| `BreadcrumbNav.test.tsx` | mirror | Identical |
| (NEW Studio-only) | `inspector/__tests__/dispatchInspectorEdit.test.ts` | Tests emit + remove paths via mock form |
| (NEW Studio-only) | `inspector/__tests__/css-mutate.test.ts` | Tests removeDeclarationFromCss: 4-6 cases (bp=0 top-level, bp>0 container, empty rule cleanup, empty container cleanup, no-match no-op) |
| (Studio-only) | `inspector/__tests__/Inspector.test.tsx` | Integration: pin + cell edit + token apply + visibility toggle → form.setValue called with composed code |

Test count target: ~50 new Studio tests (Inspector mirror suite). Studio vitest run target: existing baseline + ~50.

### Section budget: 3-4h

---

## §4.3 — ResponsiveTab integration

### Where to mount

Studio's ResponsiveTab.tsx renders TweakPanel near line 564 (RECON §4.0.5 confirms). Inspector mounts AS A SIBLING to TweakPanel — both selection-driven, both element-click consumers, both authoring tools. Coexistence policy:

- **Selection state shared** — ResponsiveTab listens to `block-forge:element-click`; sets `selection` for TweakPanel; passes `selection.selector` (or new `pinnedSelector`) to Inspector for click-to-pin compatibility.
- **No mutual exclusion required** — Phase 0 §0.4 confirmed both surfaces can coexist on the same selection. User picks which tool to use; both update the same form.code.

```tsx
<TweakPanel
  selection={selection}
  appliedTweaks={appliedTweaks}
  onBpChange={handleBpChange}
  onTweak={handleTweak}
  onReset={handleReset}
  onClose={handleClose}
/>
<Inspector
  slug={selectedBlockSlug}
  activeBp={inspectorBp}
  onActiveBpChange={setInspectorBp}
  blockHtml={composedBlock?.html ?? ''}
  effectiveCss={composedBlock?.css ?? ''}
  tweaks={parseTweaksFromCode(form.getValues('code'))}
  onCellEdit={...}
  onApplyToken={...}
  onVisibilityToggle={...}
/>
```

Note: `inspectorBp` is a NEW useState in ResponsiveTab.tsx (Studio's TweakPanel uses its own `selection.bp`; Inspector keeps a separate BP picker). Initial value: 1440. Persistence: not required Phase 4 (in-memory only).

`composedBlock` is the post-renderForPreview composition Studio already computes (block-editor.tsx via session memo). Confirm at RECON §4.0.5 — if Studio doesn't expose this directly, Phase 4 may need to thread it through.

`parseTweaksFromCode(form.getValues('code'))` — Studio likely has an equivalent in ResponsiveTab.tsx (the code that seeds TweakPanel's slider positions per WP-029). If absent or named differently, document at result.md.

### Section budget: 1-2h

---

## §4.4 — PARITY.md trio sync

Per Ruling 3, all 3 PARITY.md files gain `## Inspector (Phase 4 — WP-033)` sections. Skeleton:

### `tools/block-forge/PARITY.md` addition

```markdown
## Inspector (Phase 4 — WP-033)

> **Studio mirror:** [`apps/studio/src/pages/block-editor/responsive/inspector/`](../../apps/studio/src/pages/block-editor/responsive/inspector/) — files mirror this directory's `src/components/` + `src/hooks/`.

### Owned files (block-forge surface)

| File | Studio mirror |
|---|---|
| `src/components/Inspector.tsx` | `…/inspector/Inspector.tsx` |
| `src/components/InspectorPanel.tsx` | `…/inspector/InspectorPanel.tsx` |
| (… 5 more rows …) |

### Known limitations (Phase 3 Issue #3)

When a block has pre-existing `@container slot` rules for a property and the user clicks `[Use --token ✓]`, the chip emits a single bp:0 tweak — but the existing @container rule may still take precedence in the cascade. Tooltip on chip surfaces this. Cleanup pathway is per-cell editing of the @container rules. To be revisited in a follow-up Inspector-polish WP.

### postMessage types (Phase 1 protocol — Phase 4 reuses unchanged)

(no new types added in Phase 4)

### Probe iframe DOM match (Phase 3 Issue #1)

Probe iframes (`useInspectorPerBpValues`) MUST run html through `renderForPreview` BEFORE `composeSrcDoc` to match the visible iframe DOM. `<div data-block-shell="{slug}">` wrap MUST be present so pinned selectors with `:nth-of-type` resolve correctly.
```

### `apps/studio/src/pages/block-editor/responsive/PARITY.md` addition

Mirror the same content with surface-flipped cross-refs.

### `tools/responsive-tokens-editor/PARITY.md` addition

Smaller delta:

```markdown
## Inspector consumer note (Phase 4 — WP-033)

`responsive-config.json` is now consumed by `useChipDetection` in both block-forge and Studio Inspector. Token resolution math (linear interp between 375 and 1440) is duplicated in both surfaces (mirror, not extract per Phase 0 §0.5 ruling). Any change to `responsive-config.json` math semantics must coordinate with both Inspector surfaces.
```

### Section budget: 1-2h

---

## §4.5 — Manifest + arch-test

### Owned_files additions (`studio-blocks` domain)

19 new owned_files:

```
apps/studio/src/pages/block-editor/responsive/inspector/Inspector.tsx
apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx
apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx
apps/studio/src/pages/block-editor/responsive/inspector/BreadcrumbNav.tsx
apps/studio/src/pages/block-editor/responsive/inspector/TokenChip.tsx
apps/studio/src/pages/block-editor/responsive/inspector/hooks/useInspectorPerBpValues.ts
apps/studio/src/pages/block-editor/responsive/inspector/hooks/useChipDetection.ts
apps/studio/src/pages/block-editor/responsive/inspector/lib/dispatchInspectorEdit.ts
apps/studio/src/pages/block-editor/responsive/inspector/lib/css-mutate.ts
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/Inspector.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/InspectorPanel.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/PropertyRow.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/BreadcrumbNav.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/TokenChip.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/useInspectorPerBpValues.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/useChipDetection.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/inspector-cell-edit.test.tsx
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/dispatchInspectorEdit.test.ts
apps/studio/src/pages/block-editor/responsive/inspector/__tests__/css-mutate.test.ts
```

Domain: `studio-blocks` (NOT `infra-tooling` — Studio mirror lives under `apps/studio/`).

`npm run arch-test` target: **579 / 579** (560 baseline + 19 new × 1 test/file).

No SKILL flips Phase 4 — those happen at Phase 5 Close.

### Section budget: 1h

---

## §4.6 — Live smoke at Studio

Run Studio dev server. Open block-editor page for a fast-loading-speed-equivalent block (or whatever Studio surface allows). Pin `.gauge-score` (or equivalent). Verify (mirror Phase 3 §3.x checks):

| Check | Expected | Status |
|---|---|---|
| 3 hidden iframes spawn at pin | DOM count = 3 mid-event |  |
| Iframes self-clean after settle | DOM count = 0 ~2s post-pin |  |
| Active cell click → input editable | `<input>` rendered, focus visible |  |
| Type new value + blur → form.code updates | `form.getValues('code')` shows new emitTweak output; iframe re-renders |  |
| Type `2em` → snaps back | input reverts; form.code unchanged |  |
| Pin element with raw `42px` → chip appears | `[Use --h2-font-size ✓]` mode='available'; tooltip shows cascade-override note |  |
| Click chip → bp:0 tweak in form.code; chip flips to in-use | form.code contains `var(--h2-font-size)` at top-level; chip renders subdued |  |
| Visibility check → form.code adds display:none at activeBp | iframe getComputedStyle = "none" |  |
| Visibility uncheck → form.code removes display tweak; element returns | css-mutate.removeDeclarationFromCss successful; iframe getComputedStyle = original |  |
| ↗ click on inactive cell → BP picker switches; pin preserved | inspectorBp updates; visible iframe re-renders at new BP; cell becomes active+editable |  |
| TweakPanel + Inspector coexist on same selection | both panels populate; both can emit tweaks against the same form.code without conflict |  |
| Cascade-override tooltip on chip visible on hover | matches Ruling 2 spec |  |

(Document live smoke evidence in result.md §4.6 with at least 1 screenshot or equivalent eval-based proof per check.)

### Section budget: 1h

---

## What success looks like (Hands' result.md tables)

| Gate | Target |
|---|---|
| arch-test | 579/579 (+19) |
| typecheck (studio + block-forge) | clean |
| Studio vitest | existing baseline + ~50 new Inspector tests |
| block-forge vitest | 275 → 275 (zero behavior change; tooltip-only edit per Ruling 2 affects 1 snapshot) |
| `tools/block-forge/src/components/TokenChip.tsx` diff | tooltip-only addition documented |
| `tools/block-forge/src/__tests__/TokenChip.test.tsx.snap` regen | acknowledged |
| All other block-forge files | 0 diff |
| packages/ui/package.json exports addition | `"./responsive-config.json": "./src/theme/responsive-config.json"` |
| All other packages/ui files | 0 diff |
| Live smoke at Studio | 12 acceptance checks GREEN |
| 3 PARITY.md files updated | block-forge + Studio (additive) + responsive-tokens-editor (small delta) |
| RECON pre-flight | committed alongside or in §4.0 of result.md before §4.1 work begins |

---

## Phase 4 deliverables (committed by Hands)

1. **3 commits on main (typical pattern):**
   - `docs(wp-033): phase 4 task prompt — cross-surface Studio mirror + PARITY trio [WP-033 phase 4]` (this file, committed by Brain BEFORE handoff per workflow)
   - `feat(studio): WP-033 phase 4 — inspector cross-surface mirror + PARITY trio sync [WP-033 phase 4]` (impl + tests + manifest + PARITY trio + packages/ui exports + chip tooltip)
   - `docs(wp-033): phase 4 result — Studio Inspector mirror GREEN [WP-033 phase 4 followup]` (result.md)

2. **Files touched (expected):**
   - 9 NEW Studio inspector source files
   - 10 NEW Studio inspector test files (mirror + 3 Studio-only)
   - 1 MOD `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` (mount Inspector + thread props)
   - 1 MOD `tools/block-forge/src/components/TokenChip.tsx` (tooltip-only per Ruling 2)
   - 1 MOD `tools/block-forge/src/__tests__/__snapshots__/TokenChip.test.tsx.snap` (regen due to tooltip)
   - 1 MOD `packages/ui/package.json` (exports addition)
   - 3 MOD PARITY.md files (block-forge, Studio, responsive-tokens-editor)
   - 1 MOD `src/__arch__/domain-manifest.ts` (+19 owned_files in studio-blocks)

3. **Result.md sections (mandatory):**
   - §4.0 RECON pre-flight findings (per Ruling-pre-flight gate; before any code)
   - What Was Implemented
   - §4.1 / §4.2 / §4.3 / §4.4 / §4.5 / §4.6 sub-sections
   - Issues & Workarounds (especially RECON drift findings if any)
   - Brain Rulings — How they were honored (5 rulings; explicit table)
   - Open Questions for Phase 5 (Close)
   - Phase 5 entry conditions (all must be ✅)
   - Verification Results table
   - Files touched table
   - Notes for Brain Review
   - Git (commit SHA)

---

## Out-of-scope this phase (DO NOT do)

- ❌ Cascade-override fix (Ruling 2 — DEFERRED follow-up WP)
- ❌ Inheritance walker for `inheritedFrom?` slot (Phase 0 §0.11.b deferred; Phase 3 deferred)
- ❌ Show-back semantic restore for visibility uncheck (Ruling 4 from Phase 3 — uncheck removes only display:none decl; no recovery of original)
- ❌ BreadcrumbNav ancestor chain (Phase 3 Ruling 3 — DEFERRED)
- ❌ Engine extensions (no new exports from packages/block-forge-core)
- ❌ packages/ui source file edits (only package.json exports addition per Ruling 5)
- ❌ tools/block-forge behavioral changes (only TokenChip tooltip per Ruling 2)
- ❌ SKILL flips (Phase 5 Close scope)
- ❌ block-forge ↔ Studio shared package extraction (REIMPLEMENT per Ruling 1; YAGNI)

---

## Escalation triggers (surface to Brain immediately)

1. **§4.0 RECON drift** — any ❌ verdict on RECON probes (dispatchTweakToForm contract drift, missing test infrastructure, composeSrcDoc divergence Phase 0 §0.4 didn't anticipate, etc.) → halt; write result.md §4.0; await Brain ruling.
2. **Studio composeSrcDoc divergence from block-forge's** — if Studio's iframe wrap shape differs from block-forge's per PARITY §7 deviation, hidden-iframe probe DOM may not match. Phase 3 fix (renderForPreview wrap) may need surface-specific adaptation. Document; surface for Brain ruling on whether Studio mirror needs different probe wrap.
3. **packages/ui/package.json exports addition surfaces unexpected resolution issues** — e.g., the json export needs additional config field — escalate; do NOT silently change packages/ui tsconfig or build chain.
4. **chip cascade-override tooltip is more intrusive than expected** (Ruling 2's "single allowed block-forge edit") — if the tooltip update requires touching multiple block-forge files OR breaks more than 1-2 snapshots → escalate; reconsider whether tooltip belongs in Phase 4 vs Phase 5.
5. **TweakPanel + Inspector selection-state coexistence conflict** — if §4.0.5 RECON or §4.6 live smoke surfaces them stomping on each other → escalate; Brain rules on co-existence policy refinement.
6. **arch-test lands at unexpected count** — if +19 doesn't match (e.g., Studio's domain ownership rules treat tests differently than infra-tooling) → escalate; do NOT silently update manifest schema to make the count work.

---

## Acceptance criteria (Hands MUST satisfy ALL)

- [ ] §4.0 RECON pre-flight committed BEFORE §4.1 code (single commit OK; just sequenced in result.md)
- [ ] `npm run arch-test` from repo root → **579 / 579** (+19 from Phase 3 baseline 560)
- [ ] `npm run typecheck` from repo root → clean (no new type errors)
- [ ] Studio vitest passes (~50 new Inspector tests + existing baseline)
- [ ] block-forge vitest passes (275 unchanged + 1 snapshot regen for TokenChip tooltip)
- [ ] No diffs in `tools/block-forge/src/**` other than `TokenChip.tsx` (tooltip) + 1 snapshot
- [ ] No diffs in `packages/ui/src/**` (only `package.json` exports addition)
- [ ] No diffs in `packages/block-forge-core/**`
- [ ] Live smoke at Studio — 12 acceptance checks GREEN
- [ ] All 5 Brain rulings honored, deviations explicitly escalated
- [ ] PARITY trio updated in same commit
- [ ] result.md committed with §4.0 RECON + all mandatory sections
- [ ] Commit SHAs recorded in result.md §Git

---

## Brain → Operator handoff
Phase 4 task prompt drafted. 7 sub-sections, ~13-18h budget, 5 Brain rulings locked, RECON pre-flight gate enforced (saved memory `feedback_preflight_recon_load_bearing`), known limitation tooltip per Ruling 2, single coordinated package.json exports update per Ruling 5. Phase 5 Close (SKILL flips + CONVENTIONS + approval gate) unblocked once Phase 4 ships.

Awaiting Operator approval to commit prompt + handoff to Hands.
