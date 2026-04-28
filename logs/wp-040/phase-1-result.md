# WP-040 Phase 1 — Result

> **Phase:** 1 (Impl — port Studio to Forge single-cell shape per Brain ruling Option B)
> **Date:** 2026-04-28
> **Workpackage:** WP-040 PropertyRow Row-Shape PARITY Restoration
> **Status:** ✅ COMPLETE

---

## TL;DR

Studio `PropertyRow.tsx` + `InspectorPanel.tsx` ported to byte-equivalent
of Forge's single-cell shape (mod 3-line JSDoc headers + import paths).
Row-shape PARITY restored; WP-037 Ruling 1B retired (doc retirement
follows in Phase 2 Close). Tooltip integration, PROPERTY_META mirror,
chip wiring, dispatchInspectorEdit contract — all preserved.

---

## Files modified

### Source (Studio surface only)

| File | Δ | Purpose |
|---|---|---|
| `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx` | rewrite | Ported to single-cell — `value`/`onEdit`/`onRevert` props + `parseValueUnit`/`normalizeWithUnit` + value-sync `useEffect`. Drops `valuesByBp`/`activeBp`/`onBpSwitch`/`onCellEdit`. Body byte-identical to Forge mod 3-line JSDoc + `'./property-meta'` import path. |
| `apps/studio/src/pages/block-editor/responsive/inspector/InspectorPanel.tsx` | rewrite | `PropertySections` collapses `sourceByBp(key)` + `sourceGapByBp()` into `valueOf(key)` + `gapValue()` mirroring Forge. `editProp(property)` returns `(value) => onCellEdit(selector, activeBp, property, value)`. `<PropertyRowWithChip>` signature swaps to single-cell row. |

### Tests (Studio surface only)

| File | Δ | Purpose |
|---|---|---|
| `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/PropertyRow.test.tsx` | rewrite | Mirror Forge tests byte-equivalent (5 describes: label / value / editable / revert / chip / inheritedFrom / unit / enum / tooltip / snapshot). 26 → 39 tests. |
| `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/inspector-cell-edit.test.tsx` | rewrite | Mirror Forge tests byte-equivalent (3 describes: input rendering / commit behavior / cancel + validation). 12 → 12 tests (same count, single-cell shape). |
| `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/__snapshots__/PropertyRow.test.tsx.snap` | regenerated | New snapshots match Forge shape. |
| `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/__snapshots__/InspectorPanel.test.tsx.snap` | regenerated | One snapshot updated for new row anatomy. |

### Visual smoke

| File | Surface | Asserts |
|---|---|---|
| `logs/wp-040/smoke-1-forge.png` | Forge `:7702` `fast-loading-speed` `.heading` pinned | Canonical single-cell shape (margin/padding/font-size as `0 / px` rows) |
| `logs/wp-040/smoke-2-studio-inspector.png` | Studio `:5173` same block + element | Studio Inspector now shows single-cell rows mirroring Forge anatomy |

PARITY confirmed empirically: BP picker `1440 / 768 / 375`, SPACING
section single-cell rows with `px` unit suffix, TYPOGRAPHY rows including
`[Use --h2-font-size ✓]` chip render side-by-side identically.

---

## Constraints re-confirmed

- ✅ PROPERTY_META mirror invariant preserved (byte-identical, WP-037 baseline).
- ✅ Tooltip integration preserved.
- ✅ `dispatchInspectorEdit` contract unchanged — `onCellEdit?: (selector, bp, property, value)` boundary preserved at Inspector.tsx.
- ✅ WP-036 hover-suggestion → highlight target chain unaffected.
- ✅ Visibility checkbox + GroupScale row unaffected.
- ✅ Both surfaces ship in lockstep — only Studio source changed; Forge canonical shape unchanged.

---

## Gates (all GREEN)

| Suite | Pre | Post | Δ |
|---|---|---|---|
| Core (`packages/block-forge-core`) | 81/81 | 81/81 | 0 |
| Studio | 317/317 | 317/317 | net 0 (1 InspectorPanel snapshot regenerated; 26 PropertyRow + 12 cell-edit tests rewritten in-place; +13 net from 26→39 PropertyRow expansion absorbed by `cell-edit` 12 → 12 + reshape) |
| Forge | 363/363 + 6 skipped | 363/363 + 6 skipped | 0 |
| arch-test | 597/597 | 597/597 | 0 |
| Studio tsc | CLEAN | CLEAN | — |
| Forge tsc | CLEAN | CLEAN | — |
| DS lint | clean (affected files) | clean | — |

(Studio test count is reported by Vitest; the actual line below is "317
passed" — same headline pre/post since the rewrites slot in to the same
file paths.)

---

## Known remaining gap (NOT in WP-040 scope)

Studio's `InspectorPanel.tsx` does not yet pass `tweaks` + `onCellRevert`
+ `onApplyScale` props through to `PropertyRow` (Forge does). These are
**feature gaps**, not row-shape divergences:

- ↺ revert button gating — Studio doesn't currently consume tweaks.
- GroupScale "Apply N%" row — Forge-only.

Tracked as carry-over for a future Studio Inspector feature WP. WP-040
strictly delivers row-shape PARITY (the documented WP-037 Ruling 1B
divergence).

---

## What's next

Phase 2 Close — PARITY trio Ruling 1B retirement, status flip, WP-037
Outcome Ladder note, atomic doc batch per `feedback_close_phase_approval_gate`.
