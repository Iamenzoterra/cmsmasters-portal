# WP-032 Phase 1 Result - Structure Surface

Date: 2026-04-25
Status: DONE
Task: logs/wp-032/phase-1-task.md

## Pre-flight

- PARITY-LOG open entries: 0 (`## Open` is `_(none)_`).
- Phase 0 baseline screenshots: present on disk.
- Scoped pre-code status: `tools/layout-maker/src` and `tools/layout-maker/runtime` were clean before implementation.
- Baseline architecture gate: `npm run arch-test` passed, 501 tests.
- Baseline Layout Maker tests: `npm run test` passed, 152 tests.
- Baseline Layout Maker build: passed, JS raw 326.25 kB, CSS raw 70.63 kB.

## Implementation

Phase 1 moved slot topology out of Inspector and into the left sidebar Structure surface.

- Added `SlotStructurePanel.tsx` and mounted it in `LayoutSidebar` between the layout nav and layout list.
- Reused `SlotToggles` (Shape A) instead of duplicating slot-row markup. This keeps slot ordering, lock state, and color handling in one component.
- Extended `SlotToggles` with optional selection wiring: slot-name click selects; visibility checkbox toggles only and does not select.
- Wired callbacks through `App.tsx`: `handleToggleSlot`, `handleCreateTopLevelSlot`, and `setSelectedSlot` now flow to `LayoutSidebar` / `SlotStructurePanel`.
- Removed slot topology controls from `Inspector.tsx`: `SlotToggles`, `AddSlotButton`, and the slot create/toggle props are gone.
- Kept Inspector focused on selected-slot properties. Empty state now starts with layout defaults, selected state starts with identity.
- CSS change is local to the sidebar structure surface and existing slot rows. No runtime, schema, parser, generator, or canvas behavior was changed.

## Files Changed

- `tools/layout-maker/src/App.tsx`
- `tools/layout-maker/src/components/LayoutSidebar.tsx`
- `tools/layout-maker/src/components/SlotStructurePanel.tsx`
- `tools/layout-maker/src/components/SlotStructurePanel.test.tsx`
- `tools/layout-maker/src/components/SlotToggles.tsx`
- `tools/layout-maker/src/components/Inspector.tsx`
- `tools/layout-maker/src/components/Inspector.test.tsx`
- `tools/layout-maker/src/components/Inspector.stability.test.tsx`
- `tools/layout-maker/src/styles/maker.css`

## Hard Gates

All Phase 1 Inspector grep gates are clean:

- `rg "SlotToggles" tools/layout-maker/src/components/Inspector.tsx`: 0 matches
- `rg "AddSlotButton" tools/layout-maker/src/components/Inspector.tsx`: 0 matches
- `rg "onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src/components/Inspector.tsx`: 0 matches

Runtime/generator/parser/schema were not touched.

## Tests

Targeted Vitest:

- Command: `npx vitest run src/components/SlotStructurePanel.test.tsx src/components/Inspector.test.tsx src/components/Inspector.stability.test.tsx`
- Result: passed, 36 tests.
- Note: the sandboxed run hit `spawn EPERM`; reran with approved escalation and passed.

Full Layout Maker test suite:

- Command: `npm run test`
- Result: passed, 160 tests.
- Delta vs Phase 0 baseline: +8 tests.

Architecture gate:

- Command: `npm run arch-test`
- Result: passed, 501 tests.

Build:

- Command: `npm run build`
- Result: passed.
- JS raw: 326.70 kB, +0.45 kB vs Phase 0 baseline.
- CSS raw: 71.08 kB, +0.45 kB vs Phase 0 baseline.

## Visual Proof

Playwright checked 6 states and saved screenshots:

| Viewport | State | Screenshot | Canvas | Inspector | Structure surface |
| --- | --- | --- | ---: | --- | --- |
| 1600x768 | empty | `logs/wp-032/phase-1-after-1600-empty.png` | 1080 | in flow | visible |
| 1600x768 | sidebar-left | `logs/wp-032/phase-1-after-1600-sidebar-left.png` | 1080 | in flow | visible, selected row `sidebar-left` |
| 1024x768 | empty | `logs/wp-032/phase-1-after-1024-empty.png` | 784 | closed overlay, offscreen | visible |
| 1024x768 | sidebar-left | `logs/wp-032/phase-1-after-1024-sidebar-left.png` | 784 | open overlay, 744-1024 | visible, selected row `sidebar-left` |
| 390x768 | empty | `logs/wp-032/phase-1-after-390-empty.png` | 150 | closed overlay, offscreen | visible |
| 390x768 | sidebar-left | `logs/wp-032/phase-1-after-390-sidebar-left.png` | 150 | open overlay, 110-390 | visible, selected row `sidebar-left` |

WP-031 shell contract remained stable: canvas widths are still 1080 / 784 / 150 at 1600 / 1024 / 390.

Inspector slot topology check in all Playwright states: `hasInspectorSlots=false`.

## Acceptance Criteria Status

- Slot topology removed from Inspector: PASS.
- Top-level Add slot moved to Structure surface: PASS.
- Sidebar slot visibility toggles live in left sidebar: PASS.
- Selected slot stays synchronized between Structure surface and Inspector: PASS.
- Checkbox toggle does not accidentally select: PASS, covered by unit test.
- Empty Inspector starts with layout defaults, not slot topology: PASS.
- Selected Inspector starts with identity, not slot topology: PASS.
- WP-031 responsive shell metrics preserved: PASS.
- PARITY-LOG remains 0 open: PASS.

## Deviations / Notes

- `CreateSlotModal` still contains its pre-existing inline styles. Phase 1 reused the modal and did not refactor modal internals.
- The new Structure surface reuses existing slot-row visual density. Deeper visual treatment of slot rows belongs to later UX phases, not this IA move.
- Repo-level `logs/wp-032` is untracked in the current working tree; scoped status was used to avoid mixing unrelated dirty files.

## Phase 2 Handoff

Phase 2 can focus on canvas chrome because the Structure surface now owns topology. The useful contract from Phase 1 is: clicking a slot name selects it, clicking the visibility toggle only toggles visibility and does not re-select.
