# WP-032 Phase 3 Result — Drawer Trigger Dialog

Date: 2026-04-26
Tip at start: `73d602df feat(lm): WP-032 phases 1+2 — structure surface + canvas visibility chrome [WP-032 phases 1-2]`

## Summary

Phase 3 is implemented. The Inspector no longer renders the three inline drawer trigger rows (`Trigger label`, `Trigger icon`, `Trigger color`). Drawer trigger editing is now represented as one compact summary row plus a focused `Configure` dialog.

The implementation keeps the capability rule surface unchanged: `inspector-capabilities.ts` was not modified, and the existing drawer trigger capability names still govern editability. The render location moved; the contract did not.

## Files Changed

- `tools/layout-maker/src/lib/color-token-select.tsx` — extracted `getBrandColorTokens` and `ColorTokenSelect`.
- `tools/layout-maker/src/lib/drawer-trigger-defaults.ts` — centralized drawer trigger defaults/effective values.
- `tools/layout-maker/src/components/DrawerTriggerDialog.tsx` — focused drawer trigger editor dialog.
- `tools/layout-maker/src/components/DrawerTriggerDialog.test.tsx` — dialog behavior tests.
- `tools/layout-maker/src/components/Inspector.tsx` — replaced inline rows with summary row and dialog mount.
- `tools/layout-maker/src/components/Inspector.test.tsx` — updated sidebar role assertions for summary/dialog.
- `tools/layout-maker/src/components/Inspector.stability.test.tsx` — updated stale inline-row comment.
- `tools/layout-maker/src/styles/maker.css` — summary row + dialog styling.

## Implementation Notes

- `ColorTokenSelect` extraction was straightforward; no fallback-to-props deviation needed.
- `getEffectiveDrawerTrigger` is used by both the summary row and dialog initial state.
- Save writes all three drawer trigger fields in one `onUpdateSlotRole` call.
- Default or empty values are written as `undefined`, preserving the existing "default means absent override" shape.
- Cancel, Escape, backdrop click, and close button call `onClose` only.
- Dialog closes when `selectedSlot` changes to avoid stale open state.

## Verification

| Gate | Result |
|------|--------|
| `rg "Trigger label\|Trigger icon\|Trigger color" src/components/Inspector.tsx` | `0 hits` |
| `rg "DrawerTriggerDialog" src/components/Inspector.tsx` | `2 hits` (import + JSX) |
| `rg "SlotToggles\|AddSlotButton\|onToggleSlot\|onCreateTopLevelSlot" src/components/Inspector.tsx` | `0 hits` |
| `git diff -- src/lib/inspector-capabilities.ts` | empty |
| PARITY-LOG open entries | `_(none)_` |
| `npm run test` in `tools/layout-maker` | `179 passed` |
| `npm run build` in `tools/layout-maker` | passed |
| `npm run arch-test` at repo root | `501 passed` |

## Bundle

Phase 2 baseline from task: JS `327.84 kB`, CSS `71.97 kB`.

Phase 3 close:

| Asset | Phase 2 | Phase 3 | Delta |
|-------|---------|---------|-------|
| JS raw | `327.84 kB` | `331.07 kB` | `+3.23 kB` |
| CSS raw | `71.97 kB` | `73.44 kB` | `+1.47 kB` |

The JS increase is from the dialog and helper extraction. CSS increase is from summary row/dialog rules.

## Playwright Proof

All screenshots were captured from `http://localhost:7700/`.

| Screenshot | Viewport | State | Key checks |
|------------|----------|-------|------------|
| `phase-3-after-1600-empty.png` | `1600x768` | layout selected, no slot selected | canvas `1080px`; first Inspector cluster `Layout defaults`; no drawer summary |
| `phase-3-after-1600-sidebar-left-closed.png` | `1600x768` | `sidebar-left` selected | canvas `1080px`; summary row visible; inline trigger labels absent |
| `phase-3-after-1600-sidebar-left-open.png` | `1600x768` | dialog open | dialog `420x305`; title `Configure drawer trigger — sidebar-left` |
| `phase-3-after-1024-sidebar-left-closed.png` | `1024x768` | Inspector overlay open | canvas `784px`; Inspector rect `744..1024`; summary row visible |
| `phase-3-after-1024-sidebar-left-open.png` | `1024x768` | dialog open | dialog `247x322`; title visible; inline trigger labels absent |
| `phase-3-after-390-sidebar-left-closed.png` | `390x768` | Inspector overlay open | canvas `150px`; Inspector rect `110..390`; summary row visible |
| `phase-3-after-390-sidebar-left-open.png` | `390x768` | dialog open | dialog `263x322`; title visible; no full-height empty modal |

Canvas widths preserve the WP-031 shell contract: `1080 / 784 / 150`.

## Honest Notes

- During visual verification the first 1024 screenshot was captured before the Inspector overlay finished opening. I re-ran that proof with an explicit wait for `inspector.right === viewport.width` and overwrote the screenshot.
- Mobile dialog initially stretched to nearly full viewport height because the mobile media rule used `align-items: stretch`, and `max-height` referenced a non-existent `--lm-sp-16` token. I fixed it to content-height behavior with a token-only `calc(...)` max-height; the final 390 screenshot verifies the correction.
- The live `the-new` fixture has a custom drawer trigger label (`quickactions`), so the visual summary is `quickactions · chevron · the-sky`, not the pure default `Menu · chevron · the-sky`.
- No Save action was performed during Playwright proof, so runtime YAML/layout files were not intentionally mutated.

## Acceptance Criteria Status

- [x] Pre-flight passed: Phase 1+2 tip verified, PARITY open 0, 19 baseline PNGs present, tests/build green.
- [x] Color token helpers extracted.
- [x] Drawer trigger defaults/effective helper exists and is used by summary row and dialog.
- [x] DrawerTriggerDialog created with Escape/backdrop/Cancel/close behavior, autofocus, and reset-on-open.
- [x] Save writes all three fields in one `onUpdateSlotRole` call, using `undefined` for defaults.
- [x] Inline drawer trigger rows removed from Inspector.
- [x] Summary row + Configure button present.
- [x] Dialog closes on selected slot change.
- [x] `inspector-capabilities.ts` unchanged.
- [x] Phase 1+2 Inspector grep contracts preserved.
- [x] Inspector and DrawerTriggerDialog tests updated/added.
- [x] `npm run test`, `npm run build`, and `npm run arch-test` pass.
- [x] PARITY-LOG still has 0 open entries.
- [x] Seven Playwright screenshots captured.
- [x] Canvas widths preserved at `1080 / 784 / 150`.
- [x] No generator/parser/schema/runtime/YAML/Portal/Studio files touched.

## Handoff To Phase 4

Phase 4 can proceed against the compact drawer trigger surface. The remaining Inspector composition work should treat drawer trigger as a rare-use summary row and avoid reopening the inline three-row pattern.
