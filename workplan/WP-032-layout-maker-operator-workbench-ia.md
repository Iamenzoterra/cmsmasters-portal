# WP-032: Layout Maker Operator Workbench IA

> Move slot structure and rare drawer controls out of the selected-object Inspector so Layout Maker behaves like an operator workbench, not an implementation panel.

**Status:** ✅ DONE
**Priority:** P1 - operator productivity
**Prerequisites:** WP-031 ✅ (Layout Maker Inspector / Workbench UX Refactor)
**Milestone/Wave:** Layout Maker UX continuation
**Estimated effort:** 8-12 hours across 6 phases
**Created:** 2026-04-25
**Completed:** 2026-04-26

---

## Problem Statement

WP-031 improved the Inspector foundation: semantic clusters, breakpoint scope cues, responsive shell behavior, and inline style hygiene. The post-WP first viewport is still wrong for operator work. Global slot structure controls still sit above selected-object properties, so the Inspector starts with `SLOTS`, sidebar toggles, and a tiny `+ Slot` action before the selected slot itself.

This is not a spacing or polish defect. It is an IA ownership defect. Slot topology, slot visibility, and add-slot actions are structure/canvas concerns. The right Inspector should edit the currently selected layout or slot, not host global layout topology controls.

The same issue appears inside `Slot Role`: sidebar drawer trigger label/icon/color are expanded inline beside role basics. They are conditional, rare-use drawer configuration, but visually compete with always-needed layout properties on the first screen.

---

## Solution Overview

### Architecture

```
Layout config + app state
        |
        v
+----------------------+------------------------+------------------------+
| Left sidebar         | Canvas                 | Right Inspector        |
| - Layouts/scopes     | - Slot zones           | - Selected identity    |
| - Structure surface  | - Slot state chrome    | - Role basics          |
| - Add slot           | - Visibility affordance| - Area/params/refs     |
+----------------------+------------------------+------------------------+
        |                         |                        |
        +----------- shared existing callbacks ----------------+
```

No schema, generator, Portal, or DB contract changes are planned. The work moves existing controls to the surface that owns them and preserves the existing update callbacks.

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|-------------------------|
| Structure ownership | Left sidebar / structure surface | Matches Figma/Webflow mental model: hierarchy and add actions live outside properties | Keep structure in Inspector with stronger styling, rejected because it still consumes selected-property space |
| Structure placement gate | Phase 0 must choose exact placement before Phase 1: existing left sidebar section, left sidebar tabs, or separate column | This is load-bearing for shell behavior and prevents Phase 1 from being rebuilt twice | Defer placement to implementation, rejected because it hides the largest IA risk |
| Structure responsive contract | Phase 0 must lock 1600/1024/390 behavior for the structure surface before code changes | WP-031 introduced Inspector overlay behavior below desktop widths; WP-032 cannot regress that shell | Assume desktop behavior only, rejected because the original regression was viewport-specific |
| Slot visibility | Structure row plus canvas slot chrome | Operators should control the sidebar from the sidebar or its structure row | Keep detached toggle list, rejected because it is not spatial |
| Drawer trigger editing | Inspector summary row plus modal/popover | Keeps rare configuration available without dominating first screen | Keep inline fields, rejected because it mixes role basics with drawer config |
| Implementation order | Structure first, drawer modal later | Removing global controls fixes the root first-screen problem | Start with drawer modal, rejected because it leaves `SLOTS` at top of Inspector |
| Data contract | Preserve existing YAML/generator/update paths | This is UX ownership work, not parity or schema work | Add new schema fields, explicitly out of scope |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|----------------|----------------|
| infra-tooling | Primary. Layout Maker UI, tests, workplan, and logs change. | Layout Maker remains a standalone dev tool. Existing generator/parity contracts remain untouched. | Do not modify `css-generator.ts` or YAML semantics unless a RECON defect proves it necessary. Workplans are volatile and not individually manifest-owned. |
| app-portal | None planned. | Portal consumes exported layout output. | Any generator/export change would become cross-domain and must be re-scoped. |
| studio-core | None planned. | Studio reads layout rows downstream. | Do not change DB push/export semantics in this WP. |

**Public API boundaries:**
- `infra-tooling` public entrypoints used: none; Layout Maker is a local dev surface.
- Existing Layout Maker callbacks to preserve: slot selection, slot visibility toggle, create top-level slot, update slot role, update responsive overrides.

**Cross-domain risks:**
- Changing layout export, YAML schema, or generated CSS would affect Portal/Studio and is out of scope.
- New source files may need `src/__arch__/domain-manifest.ts` only if arch-test expects ownership for Layout Maker UI files. RECON must verify the current manifest pattern before adding entries.

---

## What This Changes

### New Files

```
tools/layout-maker/src/components/SlotStructurePanel.tsx      # likely new structure surface for slot rows + add action
tools/layout-maker/src/components/DrawerTriggerDialog.tsx     # likely new focused drawer trigger editor
tools/layout-maker/src/components/*.{test,tsx}                # focused tests as needed
logs/wp-032/phase-*-result.md                                 # phase evidence and screenshots
```

Exact filenames are RECON-dependent. Reuse existing components if the current shell already has a better owner.

### Modified Files

```
tools/layout-maker/src/App.tsx                 # wire structure surface and callbacks
tools/layout-maker/src/components/Inspector.tsx # remove global slot controls; add drawer summary path
tools/layout-maker/src/components/Canvas.tsx    # canvas slot state affordances
tools/layout-maker/src/components/SlotToggles.tsx # reuse/extract row behavior or retire from Inspector
tools/layout-maker/src/styles/maker.css         # structure/canvas/summary/modal styling
tools/layout-maker/src/**/*.test.tsx            # tests for moved controls and first-screen behavior
workplan/WP-032-layout-maker-operator-workbench-ia.md
```

### Manifest Updates

```
No manifest update planned at WP creation.
RECON must verify whether new Layout Maker UI files are expected in src/__arch__/domain-manifest.ts.
If arch-test requires registration, add files under infra-tooling in the same phase that creates them.
```

### Database Changes

```sql
-- None.
```

---

## Implementation Phases

### Phase 0: RECON (0.5-1h)

**Goal:** Lock the current IA baseline, verify ownership boundaries, and confirm exact component seams before code changes.

**Tasks:**

0.1. **Read domain context** - `.context/BRIEF.md`, `.context/CONVENTIONS.md`, `.claude/skills/domains/infra-tooling/SKILL.md`

0.2. **Verify PARITY precondition** - confirm `tools/layout-maker/PARITY-LOG.md` has 0 open entries before any Inspector, Canvas, CSS, parser, generator, or export-adjacent work. If open entries exist, pause and triage before Phase 1.

0.3. **Check manifest boundaries** - verify `src/__arch__/domain-manifest.ts` treatment of Layout Maker UI files and whether new files need registration.

0.4. **Run audit commands**
```bash
rg -n "SlotToggles|AddSlotButton|Trigger label|Trigger icon|Trigger color|onToggleSlot|onCreateTopLevelSlot" tools/layout-maker/src
npm run arch-test
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
```

0.5. **Capture baseline** - Playwright screenshots at 1600, 1024, and 390 widths for selected `sidebar-left` and empty Inspector states.

0.6. **Lock placement and responsive contract** - choose and document the structure surface placement before Phase 1 starts.
- Placement options to evaluate: existing left sidebar section, `Layouts | Structure` tabs in the left sidebar, or a separate column between sidebar and Canvas.
- Responsive contract must state what happens at 1600 desktop, 1024 Inspector-overlay width, and 390 mobile width.
- If the chosen placement creates a new column, Phase 0 must explicitly prove it does not recreate the WP-031 medium/mobile canvas regression.

0.7. **Report findings** - create `logs/wp-032/phase-0-result.md` with:
- current control ownership map
- exact files/components to edit
- screenshot list
- test/build baseline
- any dirty worktree notes

**Verification:** RECON report exists. No runtime code written.

---

### Phase 1: Structure Surface (2-3h)

**Goal:** Remove slot topology controls from the selected-object Inspector and place them in a dedicated structure surface.

**Tasks:**

1.1. **Create or extend structure surface** - add active-layout slot rows in the Phase 0-approved placement.
- Phase 1 must not start until Phase 0 has committed the exact placement and responsive contract.
- Show slot color, name, selected state, locked/visible/hidden/drawer metadata.
- Preserve existing slot ordering and locked-slot behavior.
- Keep selection synchronized with canvas and Inspector.

1.2. **Move add-slot action** - replace the tiny Inspector `+ Slot` with a visible `Add slot` action in the structure surface.
- Preserve `onCreateTopLevelSlot` behavior.
- Keep labels visible at narrow sidebar widths.

1.3. **Move visibility toggles** - move `SlotToggles` behavior out of `Inspector.tsx`.
- Preserve `onToggleSlot` behavior.
- Keep disabled state for locked slots.
- Keep keyboard access and accessible labels.

1.4. **Update tests** - assert the new owner and removed old owner.
- `rg "SlotToggles" tools/layout-maker/src/components/Inspector.tsx` returns 0.
- Toggle and add-slot tests target the new surface.

**Verification:**
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
```
Playwright evidence: at 1024x768, selected Inspector starts with selected slot identity, not `SLOTS`.

---

### Phase 2: Canvas Slot State Controls (2-3h)

**Goal:** Make sidebar visibility/state understandable where the sidebar is drawn, while keeping the structure surface as a reliable fallback.

**Tasks:**

2.1. **Add canvas slot chrome affordance** - expose visibility state through a precise interaction contract.
- Structure surface remains the always-on control path for all slot rows.
- Canvas selected chrome shows an actionable visibility control for non-locked sidebar slots.
- Canvas hover/focus may reveal the same action for non-selected non-locked sidebar slots if hit targets remain stable.
- Non-selected slots may show passive state badges for hidden/drawer/push states, but should not show a dense control list.
- Use an icon affordance rather than text-heavy controls.
- Avoid intercepting normal slot selection accidentally.
- Keep control hit targets stable and reachable.

2.2. **Show state metadata spatially** - render hidden/drawer/push state near the affected slot/badge where applicable.
- Do not add new slot capabilities.
- Do not change breakpoint resolution semantics.

2.3. **Keyboard/fallback path** - structure panel remains the non-hover and keyboard-reliable control path.

2.4. **Update tests and visual proof** - cover click path and no accidental selection regressions.
- Test: clicking the slot body selects the slot.
- Test: clicking the visibility icon toggles visibility without changing the selected slot unexpectedly.
- Test: locked slots do not expose an enabled visibility action.
- Playwright: selected sidebar chrome at 1024px shows the state affordance without covering slot content.

**Verification:**
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
```
Playwright evidence: sidebar visibility can be understood from canvas/structure without opening Inspector.

---

### Phase 3: Drawer Trigger Modal (1.5-2.5h)

**Goal:** Replace inline drawer trigger fields in `Slot Role` with a compact summary and focused editor.

**Tasks:**

3.1. **Add summary row** - replace always-visible rows:
- Trigger label
- Trigger icon
- Trigger color

With one compact row for eligible sidebar slots:
```text
Drawer trigger    quickactions · chevron · the-sky    Configure
```

Default-state contract:
- Non-sidebar slots: no drawer trigger row.
- Sidebar slots with default values: show a compact defaults summary, not three expanded fields.
- Sidebar slots with custom values: show the custom label/icon/color summary.
- If the active breakpoint is not currently in drawer mode but the slot is drawer-capable, keep the summary row available as secondary configuration rather than expanding fields inline.

3.2. **Add modal/popover editor** - edit label, icon, and color in a focused surface.
- Preserve existing `onUpdateSlotRole` write path.
- Include reset/default behavior only if it already exists or can be represented by current values.
- Keep focus management and Esc/backdrop close behavior.

3.3. **Update tests** - assert summary, modal open, edit, save/cancel, default-state behavior, and unchanged non-sidebar behavior.

**Verification:**
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
```
Playwright evidence: first screen no longer shows three drawer trigger rows inline.

---

### Phase 4: First-Screen Composition Pass (1-2h)

**Goal:** Make the first 280px of the selected Inspector read as a focused property editor.

**Phase 4 non-goals:**
- No new tokens.
- No standalone spacing-scale changes.
- No new BEM modifiers unless directly required by the IA moves from Phases 1-3.
- No second visual-rhythm purge. If a padding/gap/token cleanup appears, park it as Appendix B unless it is required to make the moved controls fit.

**Tasks:**

4.1. **Tighten identity hierarchy** - selected slot name, badges, copy action, and override filter should scan as one header area.

4.2. **Rebalance role basics** - keep always-needed role fields readable without making rare configuration equal weight.

4.3. **Verify text fit and density** - check 280px Inspector width, 1024 overlay, and 390 mobile shell.

4.4. **Document before/after** - screenshots and metrics in `logs/wp-032/phase-4-result.md`.

**Verification:**
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
```
Playwright evidence at 1024x768 selected sidebar first screen shows selected identity, compact role basics, and the start of Slot Area.

---

### Phase 5: Close (mandatory, always last)

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

5.1. **CC reads all phase logs** - understand what was done, what deviated from plan, and what was deferred.

5.2. **CC proposes doc updates** - list exact files to update.

5.3. **Brain approves** - reviews proposed changes.

5.4. **CC executes doc updates** - update `.context/BRIEF.md`, domain skills, or Layout Maker docs only if contracts changed.

5.5. **Verify everything green:**
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
```

5.6. **Update WP status** - mark WP as ✅ DONE and include final commit range.

**Files to update:**
- `.context/BRIEF.md` - only if project state changes enough to orient future agents
- `.context/CONVENTIONS.md` - only if new UI/workbench convention is established
- `.claude/skills/domains/infra-tooling/SKILL.md` - only if Layout Maker invariants or traps changed
- `src/__arch__/domain-manifest.ts` - only if new files must be registered
- `logs/wp-032/phase-*-result.md` - phase evidence must exist

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Structure move breaks slot toggle behavior | Users cannot hide/show sidebars reliably | Preserve callbacks; add component tests around visible/locked states |
| Add slot becomes less discoverable in new surface | Layout creation friction | Make it a labeled structure action, not an icon-only corner pill |
| Canvas controls cause accidental toggles | Operator mis-clicks while selecting slots | Keep controls visible only in stable chrome and test selection/toggle separation |
| Drawer modal hides needed fields too much | Sidebar trigger editing becomes hard to find | Summary row must show current values and a clear `Configure` action |
| Work touches generator by accident | Portal/Studio parity risk | Explicit non-goal; fail phase if schema/generator changes appear without re-scope |
| New source files miss manifest ownership if required | arch-test failure | Phase RECON checks current manifest policy; run arch-test every phase |
| Visual proof substitutes for missing tests | Regression risk | Add focused tests for every moved control; screenshots only supplement behavior tests |

---

## Acceptance Criteria (Definition of Done)

- [x] Phase 0 result records the chosen structure surface placement and rejected alternatives. Evidence: `logs/wp-032/phase-0-result.md` chooses left-sidebar section and rejects tabs/third column.
- [x] Phase 0 result records the responsive contract for 1600, 1024, and 390 widths. Evidence: `logs/wp-032/phase-0-result.md` responsive contract table.
- [x] Phase 0 verifies `tools/layout-maker/PARITY-LOG.md` has 0 open entries before code work starts. Evidence: Phase 0 PARITY section and Phase 5 pre-flight.
- [x] `SlotToggles` and `AddSlotButton` no longer mount from `tools/layout-maker/src/components/Inspector.tsx`. Evidence: Phase 1/5 forbidden Inspector grep returns 0 matches.
- [x] Selected Inspector at 1024x768 starts with selected slot identity, not global `SLOTS` controls. Evidence: Phase 1 and Phase 4 1024 selected screenshots.
- [x] `Add slot` is a visible structure action, not a tiny Inspector corner pill. Evidence: `SlotStructurePanel` shipped in Phase 1 and Inspector grep for `AddSlotButton` is clean.
- [x] Sidebar visibility remains editable from the structure surface and is understandable from canvas slot state. Evidence: Phase 1 structure toggles plus Phase 2 canvas eye/hidden badge proof.
- [x] Canvas visibility action test proves slot-body click selects while visibility-icon click toggles without unexpected re-selection. Evidence: `Canvas.visibility-chrome.test.tsx` in Phase 2.
- [x] Locked slots do not expose an enabled canvas visibility action. Evidence: Phase 2 locked-slot tests.
- [x] Drawer trigger label/icon/color are no longer always expanded inline in `Slot Role`. Evidence: Phase 3 forbidden trigger-label grep returns 0 matches.
- [x] Drawer trigger summary plus configure surface preserves existing edit behavior. Evidence: `DrawerTriggerDialog.test.tsx` and updated Inspector tests in Phase 3.
- [x] Drawer trigger default state is defined and tested: non-sidebar hidden, sidebar defaults summarized, custom values summarized. Evidence: Phase 3 helper/dialog tests and default summary contract.
- [x] No YAML schema, generator, Portal, Studio, or DB contract changes unless explicitly re-scoped. Evidence: Phase 1-4 result logs and Phase 5 scoped status.
- [x] `cd tools/layout-maker && npm run test` passes. Evidence: Phase 5 final gate, `182 passed`.
- [x] `cd tools/layout-maker && npm run build` passes. Evidence: Phase 5 final gate, JS `331.38 kB`, CSS `74.53 kB`.
- [x] `npm run arch-test` passes. Evidence: Phase 5 final gate, `501 passed`.
- [x] Playwright screenshots cover 1600, 1024, and 390 widths after final phase. Evidence: Phase 4 screenshots plus Phase 5 count of 32 total PNGs.
- [x] All phases logged in `logs/wp-032/`. Evidence: Phase 0-5 result logs exist.
- [x] Domain skills/context updated if contracts changed. Evidence: Phase 5 approved updates to `infra-tooling/SKILL.md` and `tools/layout-maker/CLAUDE.md`; BRIEF/CONVENTIONS intentionally unchanged.
- [x] No known blockers for the next WP. Evidence: Phase 5 close notes; optional follow-ups remain parked, not blockers.

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-031 Layout Maker Inspector / Workbench UX Refactor | ✅ DONE | Baseline cluster shell, responsive overlay, override cues, and style hygiene |
| `tools/layout-maker/codex-review/14-inspector-ux-research-v2.md` | ✅ DONE | UX evidence and benchmark rationale |
| Playwright availability | Required during phases | Screenshot verification and interaction proof |

---

## Notes

Research basis:

- `tools/layout-maker/codex-review/14-inspector-ux-research-v2.md`
- `tools/layout-maker/codex-review/wp032-research-current-sidebar-first-screen-1024.png`
- `tools/layout-maker/codex-review/wp032-research-current-sidebar-inspector-open-1024.png`

Benchmark references:

- Figma right sidebar / properties panel: https://help.figma.com/hc/en-us/articles/360039832014-Design-prototype-and-explore-layer-properties-in-the-right-sidebar
- Figma left sidebar / layers panel: https://help.figma.com/hc/en-us/articles/360039831974-View-layers-and-pages-in-the-left-sidebar
- Webflow Navigator: https://help.webflow.com/hc/en-us/articles/33961320786451-Navigator
- Webflow Add Elements panel: https://university.webflow.com/videos/add-elements-panel
- Framer Insert panel: https://www.framer.com/academy/lessons/framer-fundamentals-the-insert-panel
- Webflow Style panel overview: https://help.webflow.com/hc/en-us/articles/33961362040723-Style-panel-overview

---

## Final Result

WP-032 closed on 2026-04-26 as a three-commit implementation range:

- `73d602df feat(lm): WP-032 phases 1+2 — structure surface + canvas visibility chrome [WP-032 phases 1-2]` — moved slot topology/add/row visibility into the left-sidebar Structure surface and added selected-sidebar canvas visibility chrome.
- `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]` — replaced inline drawer trigger rows with a compact Inspector summary plus `DrawerTriggerDialog`.
- `4f84c601 feat(lm): WP-032 phase 4 — first-screen composition pass [WP-032 phase 4]` — tightened selected Inspector identity and role basics while preserving Phase 1-3 ownership boundaries.

Final verification: `cd tools/layout-maker && npm run test` passes with `182` tests, `npm run build` passes with JS raw `331.38 kB` and CSS raw `74.53 kB`, `npm run arch-test` passes with `501` tests, and `tools/layout-maker/PARITY-LOG.md` remains at 0 open entries.



