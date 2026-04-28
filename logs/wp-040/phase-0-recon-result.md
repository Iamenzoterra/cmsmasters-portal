# WP-040 Phase 0 RECON — Result

> **Phase:** 0 (RECON — empirical audit + Brain ruling on Option A/B/C/D)
> **Date:** 2026-04-28
> **Workpackage:** WP-040 PropertyRow Row-Shape PARITY Restoration
> **Status:** ✅ COMPLETE — Brain ruling: **Option B (single-cell wins)**

---

## TL;DR

The Studio M/T/D 3-cell grid is **redundant with the existing active-BP
picker** (radiogroup `inspector-bp-{375|768|1440}` already mirrored in
both InspectorPanels). Forge's single-cell shape is honest about that
fact. Restore PARITY by porting Studio to the Forge shape — Option B.

Forge canonical shape carries:
- `parseValueUnit` / `normalizeWithUnit` unit-aware editing
- `↺ revert` button (currently Forge-only)
- Cleaner row contract: `value` / `onEdit` / `onRevert` (no `valuesByBp` /
  `activeBp` / `onBpSwitch` / `onCellEdit`)

Studio's M/T/D shape's only unique affordance is "see all 3 BPs at
once" — but the inactive-BP cells are sourced exclusively from the probe
hook (`useInspectorPerBpValues`), and authors switch BPs via the picker
anyway. Net info loss = negligible; net visual + UX gain = significant.

---

## Empirical findings

### 1. Both surfaces already have an identical active-BP picker

`tools/block-forge/src/components/InspectorPanel.tsx:131-152` and
`apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx:92-113`
render byte-equivalent `<div role="radiogroup">` with `inspector-bp-{bp}`
buttons for `[1440, 768, 375]`. Click → `onActiveBpChange(bp)` → fires
identical state machine across both surfaces.

→ **Implication:** Studio's per-row `↗ switch` button is a duplicate
affordance for an action already available at the panel level. Removing
it does not lose the BP-switch capability — it only removes a redundant
trigger.

### 2. Studio inactive-BP cells source values from probe hook only

`apps/studio/.../InspectorPanel.tsx:162-174` — `sourceByBp(key)`:

```ts
function valueAt(bp: InspectorBp, k: keyof ComputedSnapshot): string | null {
  if (bp === activeBp) {
    return cs[k as string] ?? valuesByBp?.[bp]?.[k as string] ?? null
  }
  return valuesByBp?.[bp]?.[k as string] ?? null
}
```

Active cell pulls from live `pinned.computedStyle`; inactive cells pull
from the multi-BP probe hook. The "see all 3 BPs at once" affordance
exists, but it's not derived from a different source than what authors
get by switching BPs via the picker. Same data, different presentation.

### 3. dispatchInspectorEdit boundary is shape-agnostic

`apps/studio/.../inspector/lib/dispatchInspectorEdit.ts:47` — entry
contract is `dispatchInspectorEdit(form, edit)` where `edit` is one of
`{ kind: 'tweak', tweak }` / `{ kind: 'apply-token', selector, property,
tokenName }` / `{ kind: 'remove-decl', selector, bp, property }`.

InspectorPanel internally derives `editProp(property)` closure that
captures `selector + activeBp + property`. With M/T/D shape:

```ts
const editProp = (property) => (bp, value) =>
  onCellEdit(pinned.selector, bp, property, value)
```

With single-cell shape:

```ts
const editProp = (property) => (value) =>
  onCellEdit(pinned.selector, activeBp, property, value)
```

→ **Implication:** Zero plumbing change to `dispatchInspectorEdit`.
Zero plumbing change to Inspector.tsx prop contract (still
`onCellEdit?: (selector, bp, property, value) => void`). The shape
change is local to `PropertyRow` + `InspectorPanel.PropertySections`
internal closures.

### 4. PROPERTY_META + Tooltip integration is shape-agnostic

`apps/studio/.../inspector/property-meta.ts` is byte-identical to
`tools/block-forge/src/lib/property-meta.ts` (mod 3-line JSDoc header,
WP-037 invariant). Tooltip wraps the label, not the cell. Both
preserved untouched in Option B.

### 5. Token chip integration

Forge: chip slot at row root, attached to single editable cell.
Studio: chip slot at row root, ALSO attached at row level (not per-cell).
Both already render `tokenChip` outside the cell grid. Zero shape
dependency.

### 6. WP-036 hover-suggestion → highlight target

Forge `useChipDetection` + Studio `useChipDetection/hooks/` are
shape-agnostic — they consume `(selector, property, valueAtActiveBp,
activeBp, effectiveCss)`. With single-cell, `valueAtActiveBp = value`
directly. With M/T/D, `valueAtActiveBp = valuesByBp[activeBp]`. Same
data, simpler access path under Option B.

### 7. Inspector visibility checkbox + GroupScale row

These are already shape-agnostic — they live inside `PropertySections`
but outside the property-row grid. No change needed.

---

## Decision matrix (filled empirically)

| Option | LOC delta (source) | Test rewrite | UX impact | Risk |
|---|---|---|---|---|
| **A — M/T/D grid wins** (Studio shape replaces Forge single-cell) | +90 LOC Forge (regress single-cell polish) + 42 Forge tests rewritten | High — undoes WP-033 post-close polish that was driven by user feedback | 3× row height; user already rejected this shape | **HIGH** — re-litigates a settled UX decision |
| **B — Single-cell wins** ⭐ (Studio adopts Forge shape) | -90 LOC Studio + 26 Studio PropertyRow tests rewritten + 15 Studio InspectorPanel tests audited | Mechanical mirror of Forge tests | Compact, focused row; BP picker remains canonical primitive | **LOW** — Forge has run on this shape since WP-033 polish; mature |
| **C — Hybrid** (single-cell + M/T/D hover preview) | +50-80 LOC new across both surfaces | Both surfaces' tests rewritten | New design pattern; ~equal to B for active editing, adds passive overview | **MEDIUM** — invents a new pattern for marginal benefit |
| **D — Formalize divergence permanently** | 0 LOC | None | No change; carries divergence forward | **MEDIUM** — codifies WP-037 Ruling 1B as permanent debt; future Inspector WPs must account for it |

---

## Brain ruling: **Option B (single-cell wins)**

**Reasoning:**

1. **Empirical UX precedent.** Forge migrated from M/T/D grid to single-cell
   in WP-033 post-close polish driven by user feedback ("three BP cells
   overwhelmed and required users to mentally diff three numbers per
   row"). The Forge shape is the *deliberate* shape; Studio is the one
   carrying legacy.

2. **BP picker is canonical.** Both surfaces already ship the same
   `inspector-bp-{bp}` radiogroup. The M/T/D grid duplicates that
   affordance, splitting authors' attention.

3. **Forge shape is more complete.** Single-cell gained `↺ revert`,
   `parseValueUnit`/`normalizeWithUnit` unit-aware editing, and a cleaner
   prop contract — Studio inherits these for free under Option B.

4. **Lowest LOC + risk.** ~90 LOC dropped from Studio source; mechanical
   test mirror; zero engine/dispatch plumbing change.

5. **WP-037 PARITY content layer preserved.** PROPERTY_META mirror,
   Tooltip integration, enum select rendering — all untouched.

6. **Aligns with PARITY trio discipline.** §"Inspector internals are
   byte-identical mod 3-line JSDoc headers" claim becomes true again
   for `PropertyRow.tsx` + `InspectorPanel.tsx` — restoring the WP-033
   Phase 4 Ruling 1 mirror invariant.

---

## Phase 1 scope (locked)

### Source files to modify (Studio surface only)

1. `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx`
   — **full rewrite** to byte-equivalent of Forge mod 3-line JSDoc header.
   Drop `valuesByBp`/`activeBp`/`onBpSwitch`/`onCellEdit` props. Add
   `value`/`onEdit`/`onRevert` props + `parseValueUnit`/`normalizeWithUnit`
   helpers + `useEffect` value sync.

2. `apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx`
   — `PropertySections` rewrite:
   - Drop `sourceByBp(key)` + `sourceGapByBp()` helpers.
   - Add `valueOf(key)` + `gapValue()` mirroring Forge.
   - `editProp(property)` returns `(value) => onCellEdit(selector, activeBp, property, value)`.
   - `revertProp` plumbed (Forge has it; Studio currently doesn't).
   - `<PropertyRowWithChip>` signature drops `valuesByBp`/`activeBp`/
     `onBpSwitch`/`onCellEdit`; gains `value`/`onEdit`/`onRevert`.
   - Mirror Forge's `INSPECTOR_BPS` declaration removal (already inside
     panel) — Studio panel keeps it for the BP picker.

3. `apps/studio/src/pages/block-editor/responsive/inspector/Inspector.tsx`
   — verify zero change at the boundary. `onCellEdit?: (selector, bp,
   property, value)` still passes through unchanged.

4. (Optional) `apps/studio/src/pages/block-editor/responsive/inspector/Inspector.tsx`
   — pass `onCellRevert` prop through (Forge has it; Studio doesn't).
   Phase 1 may stub this; full revert wiring may be a small follow-up.

### Test files to rewrite

1. `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/PropertyRow.test.tsx`
   (26 tests) — full rewrite to mirror `tools/block-forge/src/__tests__/PropertyRow.test.tsx`
   (42 tests). Drop M/T/D-specific tests (`data-cell-bp`,
   `↗ view icon`, "marks the active BP cell with data-active='true'").
   Add single-cell tests (unit handling, value sync, em rejection,
   keyword passthrough). Net: ~-26 / +42 ≈ +16 tests.

2. `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/InspectorPanel.test.tsx`
   (15 tests) — sweep for M/T/D-shape assertions; rewrite as needed.
   Estimate: ~6-8 tests touched.

3. `tools/block-forge/src/__tests__/PropertyRow.test.tsx` — **NO CHANGE**
   (canonical shape, test suite is the mirror target).

### PARITY doc updates (Phase 2 Close, not Phase 1)

- `tools/block-forge/PARITY.md` — §"PARITY divergence formalized (Phase
  0 RECON Ruling 1B)" REMOVED; §"Known limitations" first bullet REMOVED.
  Replace with §"PropertyRow shape — UNIFIED (WP-040)" stating both
  surfaces are now byte-equivalent.

- `apps/studio/.../PARITY.md` — same removal + replacement.

- `tools/responsive-tokens-editor/PARITY.md` — not affected.

- `workplan/WP-037-inspector-typed-inputs-tooltips.md` — Outcome Ladder
  +1 tier "Diamond (post-WP-037 polish)" referencing WP-040 commit.

---

## Test plan (Phase 1 evidence shape)

| Surface | Suite | Pre | Expected post | Why |
|---|---|---|---|---|
| Studio | PropertyRow.test.tsx | 26 | ~42 (mirror Forge) | Shape change |
| Studio | InspectorPanel.test.tsx | 15 | 15±2 | Sweep M/T/D assertions |
| Studio | Inspector.test.tsx | TBD | unchanged | Boundary preserved |
| Studio | dispatchInspectorEdit.test.ts | 16 | unchanged | Contract preserved |
| Forge | PropertyRow.test.tsx | 42 | unchanged | Canonical |
| Forge | InspectorPanel.test.tsx | TBD | unchanged | Canonical |
| Forge | session.test.ts | unchanged | unchanged | No engine change |
| Core | (all) | 81 | unchanged | No engine change |
| arch-test | 597 | 597 | 597 | No file additions |

---

## Visual smoke plan (Phase 1)

Per saved memory `feedback_visual_check_mandatory` — UI shape change
MUST be live-verified.

- Studio: open `apps/studio` dev server (port TBD); load block-editor
  on a block fixture (e.g., `fast-loading-speed`); pin an element;
  screenshot Inspector panel showing single-cell rows.
- Forge: open `tools/block-forge` (port `:7702`); load same block; pin
  same element; screenshot Inspector panel.
- Pair screenshots side-by-side; assert visual equivalence (modulo theme).

---

## Constraints re-confirmed

- ✅ PROPERTY_META mirror invariant preserved (byte-identical, WP-037).
- ✅ Tooltip integration preserved (WP-037).
- ✅ `dispatchInspectorEdit` contract unchanged.
- ✅ WP-036 hover-suggestion → highlight target chain unaffected.
- ✅ Visibility checkbox + GroupScale row unaffected.
- ✅ Both surfaces ship in lockstep (only Studio source changes,
  but PARITY doc updates pair both files).

---

## What's next

Phase 1 Impl — Studio surface coordinated edits + test mirror + visual
smoke. ETA ~2-3h.
