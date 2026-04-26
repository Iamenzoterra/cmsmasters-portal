# WP-032 Phase 4 Result — First-Screen Composition Pass

Date: 2026-04-26
Tip at start: `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]`

## Pre-flight

| Check | Evidence |
|------|----------|
| PARITY open | `## Open` contains `_(none)_` |
| Phase 3 tip | `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]` |
| Scoped status | clean under `src/`, `runtime/`, `layouts`; only `logs/wp-032/phase-4-task.md` was untracked |
| Baseline LM tests | `179 passed` |
| Baseline LM build | JS `331.07 kB`, CSS `73.44 kB` |
| Baseline arch-test | `501 passed` |
| Phase 1-3 forbidden Inspector grep | `0 matches` |

## What Changed

Identity is now a single header block. The slot name and copy button occupy the first row, and badges sit as a tight second row inside the same block. This avoids the old 280px failure where `sidebar-left` truncated to `sidebar-l/sidebar-le` because badges and copy competed with the name.

The non-base `Show overridden only` filter remains inside identity and visually attaches to that block as a compact sub-row. Playwright verified that the filter still toggles `data-filter="overridden"` on `.lm-inspector__body`.

The Slot Role section now has a `role-basics` sub-area. `Position` remains the anchor field, while `Sticky`/`Z-index` render inside a nested `role-modifiers` group when capability gates allow them. Drawer trigger stays the Phase 3 compact summary row.

## Decisions

- Chose a tight sub-row shape for badges rather than forcing name + badges + copy onto one 280px row. The one-row shape still truncated common names.
- Kept the override filter as a sub-row, not same-row, because the same-row shape is too crowded once badges and copy are preserved.
- Did not add tokens, spacing rungs, or `lm-inspector__*--*` modifiers.
- Appendix B park: broader density/token cleanup remains out of scope.

## Files Touched

- `tools/layout-maker/src/components/Inspector.tsx` — identity block JSX and role basics/modifiers grouping.
- `tools/layout-maker/src/styles/maker.css` — composition-only rules using existing tokens.
- `tools/layout-maker/src/components/Inspector.test.tsx` — identity grouping, copy contract, role modifiers, and block-types behavior tests.
- `logs/wp-032/phase-4-after-*.png` — six Playwright screenshots.
- `logs/wp-032/phase-4-result.md` — this result log.

## Hard Gates

| Gate | Result |
|------|--------|
| `rg "SlotToggles\|AddSlotButton\|onToggleSlot\|onCreateTopLevelSlot\|Trigger label\|Trigger icon\|Trigger color" src/components/Inspector.tsx` | `0 matches` |
| `git diff -- src/lib/inspector-capabilities.ts src/lib/inspector-capabilities.test.ts` | empty |
| `git diff -- src/components/SlotStructurePanel.tsx src/components/DrawerTriggerDialog.tsx src/components/Canvas.tsx` | empty |
| `git diff -- src/styles/maker.css \| rg "^\+\s*--lm-"` | `0` new token definitions |
| `git diff -- src/styles/maker.css \| rg "^\+\.[^{]*lm-inspector__[^\s{]*--"` | `0` new Inspector modifiers |
| `git diff --check` | clean; only existing LF→CRLF warnings |
| PARITY open | `_(none)_` |
| Runtime/layouts | no modified files under `runtime/` or `layouts/` |

## Tests

Targeted:

- `npx vitest run src/components/Inspector.test.tsx src/components/Inspector.stability.test.tsx` → `32 passed`

Final:

- `npm run test` in `tools/layout-maker` → `182 passed`
- `npm run arch-test` at repo root → `501 passed`

New/updated Inspector assertions:

- identity block contains slot name, badges, copy, and non-base filter;
- copy button still writes `formatSummary()` payload and calls `onShowToast('Copied!')`;
- top-positioned slot groups Sticky/Z-index under role modifiers;
- custom leaf block types still toggle `allowed-block-types`.

## Build

| Asset | Phase 3 | Phase 4 | Delta |
|-------|---------|---------|-------|
| JS raw | `331.07 kB` | `331.38 kB` | `+0.31 kB` |
| CSS raw | `73.44 kB` | `74.53 kB` | `+1.09 kB` |

CSS is `+0.09 kB` over the target expectation. Reason: the two-row identity grid plus role modifier grouping needed explicit selectors to stop 280px truncation. No new tokens or modifiers were added.

## Visual Proof

| Screenshot | Viewport | State | Evidence |
|------------|----------|-------|----------|
| `phase-4-after-1600-empty.png` | `1600x768` | layout selected, no slot | canvas `1080`; empty Inspector unchanged |
| `phase-4-after-1600-sidebar-left.png` | `1600x768` | `sidebar-left` | canvas `1080`; full `sidebar-left`; badges under name; copy visible |
| `phase-4-after-1024-sidebar-left.png` | `1024x768` | Inspector overlay open | canvas `784`; Inspector `744..1024`; identity → Position → Drawer trigger → Slot Area |
| `phase-4-after-1024-sidebar-left-tablet.png` | `1024x768` | tablet BP + filter visible | canvas `784`; filter inside identity; toggle proof changed body filter to `overridden` |
| `phase-4-after-390-sidebar-left.png` | `390x768` | mobile overlay open | canvas `150`; Inspector `110..390`; full slot name + copy visible |
| `phase-4-after-1600-leaf-blocktypes.png` | `1600x768` | `theme-title` selected | canvas `1080`; Block types visible; Sticky under role modifiers |

Phase 3/Phase 4 hash comparison:

- `1600-empty`: identical (`C8344F4DA972` both) — expected, empty state is outside Phase 4 composition work.
- `1600-sidebar-left`: changed (`A7C5A903B3C8` → `5B8FEDF5C929`).
- `1024-sidebar-left`: changed (`08195F69A45B` → `7EDFDA4E9876`).
- `390-sidebar-left`: changed (`B13B90E28F53` → `1A521E5788EB`).

## Acceptance Criteria Status

- [x] Pre-flight passed: PARITY 0, Phase 3 tip verified, baseline tests/build/arch recorded, Phase 1-3 grep clean.
- [x] Identity reads as one header block: Playwright shows `grid-template-areas: "name copy" "badges copy"` and full `sidebar-left`.
- [x] `Show overridden only` still toggles: Playwright tablet proof changed `data-filter` to `overridden`; unit test still passes.
- [x] `CopyButton` still copies `formatSummary()` and toasts `Copied!`: new Inspector test asserts clipboard payload and toast call.
- [x] Role basics: Position primary; Sticky/Z-index grouped under `.lm-inspector__role-modifiers`; block types still toggles; drawer summary remains compact.
- [x] 1024 selected sidebar-left first screen: identity → Position → Drawer trigger → Slot Area.
- [x] Six Playwright screenshots captured with required names.
- [x] WP-031 canvas widths preserved: `1080 / 784 / 150`.
- [x] No new `--lm-*` tokens.
- [x] No new `lm-inspector__*--*` modifiers.
- [x] No capability rule edits.
- [x] No Phase 1-3 component edits.
- [x] No generator/parser/schema/YAML/runtime/Portal/Studio touch.
- [x] LM tests `182 passed`; arch-test `501 passed`; build green.
- [x] PARITY `## Open` remains `_(none)_`.
- [x] DS hygiene proxy clean: no new token definitions/modifiers and `git diff --check` clean. Pre-commit hook was not run because this phase was not committed here.

## Honest Notes

- Empty-state screenshot is identical to Phase 3. I did not alter empty Inspector just to make a hash differ; selected-state evidence proves the actual composition change.
- The first identity attempt kept badges on the same row and still truncated `sidebar-left`. Final shape moved badges into a tight second row inside the same identity block.
- CSS bundle is `+1.09 kB`, just over the `+/-1 kB` expectation. This is from explicit composition selectors, not a token/rhythm sweep.

## Phase 5 Handoff

Identity, role basics, drawer trigger summary, and the responsive shell proof are sealed for Phase 4. Phase 5 close should confirm documentation/cadence only and avoid reopening capability or density work.
