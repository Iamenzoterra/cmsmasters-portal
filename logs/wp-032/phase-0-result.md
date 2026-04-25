# Execution Log: WP-032 Phase 0 — RECON

> Epic: WP-032 Layout Maker Operator Workbench IA
> Executed: 2026-04-25T20:02:34.1234026+02:00
> Duration: ~18 minutes
> Status: ✅ COMPLETE
> Domains audited: infra-tooling

## Baseline
- `npm run arch-test`: ✅ (501 tests, 1 file, 559ms test duration; command wall ~3s)
- `cd tools/layout-maker && npm run test`: ✅ (152 tests, 17 files, 5.44s)
- `cd tools/layout-maker && npm run build`: ✅ (`index-B4sdzQX9.js` 326.25 kB raw / 94.98 kB gzip; `index-DpK5TtyU.css` 70.63 kB raw / 12.37 kB gzip)

## Domain Context Summary

### `.context/BRIEF.md`

Relevant invariants:
- Layout Maker is a standalone tool in `tools/layout-maker/` that edits YAML/config and exports Portal-compatible HTML/CSS; WP-032 must stay inside tooling UI.
- Layout Maker supports container slots via `nested-slots`; `content` can contain `theme-blocks`, and leaf slots hold blocks via `.slot-inner`.
- Global fields include `position`, `sticky`, `z-index`, `nested-slots`, and `allowed-block-types`; drawer trigger label/icon/color are role-level slot fields, not per-BP visual overrides.

Relevant traps:
- Portal/Studio consume exported layout output downstream; any generator/schema/export change would become cross-domain and is out of scope.
- Container vs leaf behavior is already contract-heavy; moving controls must not re-expose container-only false controls.
- Layout Maker responsive behavior is driven by grid config and CSS media queries; shell changes can regress breakpoint usability.

### `.context/CONVENTIONS.md`

Relevant invariants:
- New source files may require domain-manifest ownership if they are in an owned domain path; run `npm run arch-test` after structural changes.
- Use semantic tokens and existing design-system conventions; avoid hardcoded colors/fonts and avoid unnecessary new styling primitives.
- Layout Maker's generated CSS exposes `container-type: inline-size; container-name: slot` only on leaf `.slot-inner` hosts.

Relevant traps:
- Do not edit generated package UI tokens directly.
- Cross-surface parity docs matter when a surface has an explicit PARITY contract; for WP-032, `tools/layout-maker/PARITY-LOG.md` is the hard precondition.
- Avoid drifting into block-forge/studio responsive contracts; WP-032 is only Layout Maker workbench IA.

### `.claude/skills/domains/infra-tooling/SKILL.md`

Relevant invariants:
- Layout Maker YAML supports `nested-slots: string[]` and validator prevents broken references, multiple parents, and cycles.
- `css-generator` skips `.slot-inner` rules for container slots; container outer rules remain, inner slot controls must not be surfaced falsely.
- `css-generator` emits container queries on the generic leaf `.slot-inner` rule; container slots correctly skip because they do not hold `.slot-inner`.

Relevant traps:
- `workplan/*.md` and logs are volatile; they are not individually manifest-owned.
- `tools/layout-maker/runtime/lib/css-generator.ts` has high blast radius; WP-032 should not touch it.
- `.context/BRIEF.md` and `.context/CONVENTIONS.md` are orientation gates; update only if WP-032 changes durable contracts.

## PARITY-LOG Status

Open count: 0

Open content (verbatim):
```markdown
## Open

_(none)_

## Status (as of Phase 7 close, 2026-04-24)

Open: **0 entries**. All Phase 2–Phase 6 entries resolved. The last Open
entry (grid-template-columns not pruning hidden/drawer sidebars) was
moved to Fixed in the Phase 4 cut chain with its css-generator contract
test (5 cases). Trust reforge closes with no outstanding lies.
```

Decision: PROCEED.

## Manifest Policy

`infra-tooling` owns specific files by explicit `owned_files` entries, not by a broad `tools/layout-maker/src/components/*` glob. Current manifest entries include `tools/layout-maker/runtime/lib/css-generator.ts` and `tools/layout-maker/runtime/lib/css-generator.test.ts` at `src/__arch__/domain-manifest.ts:612-613`, but no Layout Maker UI components. The arch test iterates `getOwnedPaths(infra)` and checks file existence (`src/__arch__/domain-manifest.test.ts:25-33`). Phase 1/3 can add `SlotStructurePanel.tsx` / `DrawerTriggerDialog.tsx` without manifest registration unless the manifest policy is intentionally expanded.

## Current Ownership Map

| Control | Current owner file | Mount point | Callback prop | Tests today |
|---------|-------------------|-------------|---------------|-------------|
| Per-slot visibility toggles | `tools/layout-maker/src/components/SlotToggles.tsx:33-65` | Empty state: `Inspector.tsx:451-453`; selected state: `Inspector.tsx:626-628`; both above `.lm-inspector__body` (`Inspector.tsx:455`, `Inspector.tsx:630`) | `onToggleSlot` prop (`SlotToggles.tsx:36`, called at `SlotToggles.tsx:55`) | No direct SlotToggles behavior test found; `Inspector.test.tsx:39` and `Inspector.stability.test.tsx:60` provide mock props only |
| `+ Slot` action | `tools/layout-maker/src/components/Inspector.tsx:366-390` (`AddSlotButton`) | Empty state: `Inspector.tsx:451-453`; selected state: `Inspector.tsx:626-628`; same `.lm-slot-toggles-row` as SlotToggles | `onCreateTopLevelSlot` (`Inspector.tsx:370`, called at `Inspector.tsx:390`) | No direct AddSlotButton test found; `Inspector.test.tsx:48` and `Inspector.stability.test.tsx:69` provide mock props only |
| Drawer trigger label | `tools/layout-maker/src/components/Inspector.tsx` | Inline in role/drawer trigger block: `Inspector.tsx:753-767`; row label at `Inspector.tsx:756` | `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-label': v.trim() || undefined })` at `Inspector.tsx:764` | `Inspector.test.tsx:107-121` asserts inline text exists; capability pins at `inspector-capabilities.test.ts:197-198`, alias at `:316` |
| Drawer trigger icon | `tools/layout-maker/src/components/Inspector.tsx` | Inline in same block: `Inspector.tsx:768-783`; row label at `Inspector.tsx:769` | `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-icon': v || undefined })` at `Inspector.tsx:775` | `Inspector.test.tsx:107-121`; capability pin at `inspector-capabilities.test.ts:199` |
| Drawer trigger color | `tools/layout-maker/src/components/Inspector.tsx` | Inline in same block: `Inspector.tsx:784-802`; row label at `Inspector.tsx:785` | `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-color': v })` at `Inspector.tsx:797` | `Inspector.test.tsx:107-121`; capability pin at `inspector-capabilities.test.ts:200` |

## Baseline Screenshots

| Width | State | Path |
|-------|-------|------|
| 1600 | empty | `logs/wp-032/phase-0-baseline-1600-empty.png` |
| 1600 | selected sidebar-left | `logs/wp-032/phase-0-baseline-1600-sidebar-left.png` |
| 1024 | empty (overlay) | `logs/wp-032/phase-0-baseline-1024-empty.png` |
| 1024 | selected sidebar-left (overlay) | `logs/wp-032/phase-0-baseline-1024-sidebar-left.png` |
| 390 | empty | `logs/wp-032/phase-0-baseline-390-empty.png` |
| 390 | selected sidebar-left | `logs/wp-032/phase-0-baseline-390-sidebar-left.png` |

Playwright notes:
- Initial `networkidle` navigation timed out because Vite/HMR keeps the dev connection alive; recaptured with `domcontentloaded` plus explicit `.lm-shell` / `.lm-sidebar__item` waits.
- Captured layout: active sidebar item was `the-new / Theme page`.
- Selected `sidebar-left` via `.lm-slot-zone[data-slot-type="sidebar-left"]` for all selected screenshots.
- Measured shell: 1600 canvas 1080px, 1024 canvas 784px, 390 canvas 150px. Inspector overlay was open at 1024 and 390 (`data-inspector-open="true"`).

## Placement Decision

| Option | Rejected? | Reason |
|--------|-----------|--------|
| A — Left-sidebar section | No | Chosen. Reuses the existing 240px sidebar and does not add a column or new shell mode. Best fit for Phase 1 because `LayoutSidebar.tsx` already owns layout-level navigation/actions and `maker.css:159-165` defines it as a flex column with a scrollable list. |
| B — Left-sidebar tabs | Yes | Would hide either layouts or active structure behind another state. The sidebar already has `Layouts` / `Scopes` nav at `LayoutSidebar.tsx:146-158`; adding another tab layer risks discoverability and state complexity before we prove it is needed. |
| C — Third column | Yes | Recreates the exact class of shell risk WP-031 fixed. Current measured 1024 shell is sidebar 240 + canvas 784 + Inspector overlay; adding a third column would take width from canvas. At 390 the canvas is only 150px, so a third column would collapse it again. |

**Chosen: A** — add a `Structure` block inside the existing left sidebar, directly below the `Layouts/Scopes` nav and above the layouts list. The layout list remains scrollable below it; existing Create/Transfer/Manage actions stay at the bottom. Phase 1 should not add a new shell column and should not introduce a tab state unless the first implementation proves vertical overflow cannot be managed.

## Responsive Contract

| Width | Structure surface | Inspector | Selection sync | Add-slot reach | Visibility toggle reach | Canvas regression check |
|-------|-------------------|-----------|----------------|----------------|-------------------------|-------------------------|
| 1600 | Always visible in the existing left sidebar, under nav and above layouts list | Normal right column, 280px wide | Structure row click and canvas slot click both set `selectedSlot`; Inspector reflects selection | Visible as labeled `Add slot` action in Structure block | Visible as row-level controls in Structure block | No new column; keep measured canvas at 1080px (sidebar 240 + canvas 1080 + Inspector 280) |
| 1024 | Still in existing left sidebar; does not overlay and does not push canvas | WP-031 right-edge overlay, opened from BreakpointBar; measured canvas 784px with overlay shell | Structure/canvas selection stays available while Inspector overlay can open/close independently | Reachable from left sidebar without opening Inspector | Reachable from left sidebar; Phase 2 adds selected canvas chrome as secondary path | No new column; preserve measured canvas 784px and `data-inspector-open` behavior |
| 390 | Still in existing left sidebar; compact rows and sidebar vertical scroll if needed | WP-031 overlay, 280px wide over the remaining canvas; narrow notice remains | Structure row selection works from sidebar; canvas selection remains possible where visible | Reachable in Structure block; if vertical space is tight, scroll within sidebar, not a separate overlay | Reachable in Structure block; canvas chrome is secondary and must not cover slot content | No new column; preserve measured canvas 150px rather than returning to 0px |

## Answers to the 14 Questions

1. **PARITY-LOG status:** 0 open entries. Verbatim open section pasted above.

2. **Inspector mount points:** `SlotToggles` and `AddSlotButton` mount in `Inspector.tsx:451-453` for empty selected-slot state and `Inspector.tsx:626-628` for selected-slot state. They are above `.lm-inspector__body`, which starts at `Inspector.tsx:455` and `Inspector.tsx:630` respectively.

3. **SlotToggles shape:** `SlotToggles.tsx` accepts all data via props: `config: LayoutConfig`, `activeBreakpoint: string`, `onToggleSlot: (slotName: string, enabled: boolean) => void` at `SlotToggles.tsx:33-37`. It does not pull from a React context/hook. It derives ordered slot rows from `SLOT_DEFINITIONS` plus `content` at `SlotToggles.tsx:10-31` and computes enabled state from `grid.columns[name]` or `config.slots[name]?.position` at `SlotToggles.tsx:46`.

4. **Drawer trigger inline rows:** label/icon/color render in the same drawer-trigger block inside the role cluster: comment at `Inspector.tsx:750-752`, capability gate at `Inspector.tsx:753`, label row `:755-767`, icon row `:768-783`, color row `:784-802`. The calls are exactly `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-label': v.trim() || undefined })`, `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-icon': v || undefined })`, and `onUpdateSlotRole(selectedSlot, { 'drawer-trigger-color': v })`.

5. **Callback wiring in App.tsx:** callbacks are local `useCallback` handlers. `handleToggleSlot` at `App.tsx:402-421` calls `enableSidebar` / `disableSidebar`, saves via `api.updateLayout`, then toasts. `handleUpdateSlotRole` at `App.tsx:591-629` mutates role-level base slot fields and saves. `handleCreateTopLevelSlot` at `App.tsx:632-661` adds a slot and optionally grid columns. `App.tsx:754-772` passes them into `Inspector` as `onToggleSlot`, `onUpdateSlotRole`, and `onCreateTopLevelSlot`.

6. **LayoutSidebar shape:** `LayoutSidebar.tsx` owns layouts/scopes navigation (`:146-158`), the layouts list (`:161-185`), and actions grouped as Create/Transfer/Manage (`:187-219`). It has no structure section and no nested tabs. It has a usable section pattern via `.lm-sidebar__group` / `.lm-sidebar__group-label` at `maker.css:224-246`, but the best Phase 1 placement is a new Structure block under nav and above `.lm-sidebar__list`.

7. **Canvas slot rendering:** top/grid/bottom slots render `SlotZone` at `Canvas.tsx:226-243`, `:256-275`, and `:281-298`. Selection is `isSelected={name === selectedSlot}` and click calls `onSlotSelect(name)` at `Canvas.tsx:236`, `:268`, `:291`. `SlotZone` applies `lm-slot-zone--selected` at `Canvas.tsx:431-437` and attaches `onClick` at `Canvas.tsx:452`. Hidden/drawer/push sidebars already have selectable badges at `Canvas.tsx:312-345`. Phase 2 can attach a selected-chrome visibility icon to the existing `SlotZone` selected surface without redesigning the canvas.

8. **Responsive overlay rules:** WP-031 overlay shell is in `maker.css:93-113`: below `1279px`, `.lm-shell` becomes `var(--lm-sidebar-w) 1fr`, `.lm-inspector` becomes fixed right overlay, and `[data-inspector-open="true"]` slides it in. Backdrop is `maker.css:117-127`; inspector toggle visibility is `maker.css:129-140`; narrow notice is `maker.css:142-156`. Phase 1 should touch sidebar/structure selectors and avoid shell grid-template rules unless Phase 0 is re-opened.

9. **Existing tests around moved controls:** no direct tests for `SlotToggles` behavior or `AddSlotButton` behavior were found. `Inspector.test.tsx:35-49` and `Inspector.stability.test.tsx:55-70` only provide mocked props. `Inspector.test.tsx:107-121` asserts inline drawer trigger texts exist and must change in Phase 3. `inspector-capabilities.test.ts:197-200`, `:286-289`, and `:316` pin capability visibility and must move from field-level expanded rows to summary/modal expectations.

10. **Manifest policy:** no broad ownership for `tools/layout-maker/src/components/`. `domain-manifest.ts:596-613` lists infra tooling and only includes Layout Maker runtime css-generator files. New UI components do not need manifest registration under current policy; still run `npm run arch-test` every phase.

11. **Container vs leaf parity check:** moved controls are not container-only inner fields. Slot toggles operate grid membership / positioned slots. Add-slot creates topology. Drawer trigger label/icon/color are role-level fields in `ROLE_FIELDS` at `inspector-capabilities.ts:253-262` and gated by `traits.isSidebar` at `inspector-capabilities.ts:212-215`. The PARITY fixed entry on container slots concerns inner params (`max-width`, `align`, padding, gap, etc.), not these moved controls.

12. **Placement decision:** A — Left-sidebar section. Rejected B because it hides either layouts or structure behind extra state; rejected C because it risks medium/mobile canvas regression and would reduce the already-measured 784px/150px canvas.

13. **Responsive contract:** filled in the table above for 1600 / 1024 / 390. The contract preserves the existing shell grid and Inspector overlay behavior.

14. **Anything surprising:** `networkidle` is not usable for the Vite dev server due HMR; use `domcontentloaded` + selector waits for Phase screenshots. The repo has pre-existing unrelated dirty/untracked files, so strict global `git status` cannot be used as a clean/no-clean signal; Phase 0 touched only `logs/wp-032` and did not modify runtime source.

## Deviations from WP-032 Assumptions

- The task said load default `theme-page-layout`; the live UI active first layout is `the-new / Theme page`. Screenshots use that active layout because it is the current local baseline and matches the earlier WP-031/WP-032 evidence path.
- Playwright first attempt with `networkidle` timed out; final pass succeeded with `domcontentloaded`.
- Global worktree is dirty before this phase. Scoped status for runtime source (`tools/layout-maker/src`, `tools/layout-maker/runtime`) stayed clean; only `logs/wp-032` was added by this phase.

## Recommendations for Phase 1

- Build `SlotStructurePanel` as a child of `LayoutSidebar`, not `Inspector`.
- Thread existing `config`, resolved `gridKey`, `selectedSlot`, `onSelectSlot`, `onToggleSlot`, and `onCreateTopLevelSlot` from `App.tsx` into `LayoutSidebar` or a child component.
- Keep the first Phase 1 write surface to `App.tsx`, `LayoutSidebar.tsx`, a new component if useful, tests, and `maker.css`; do not touch `css-generator`, YAML schema, Portal, or Studio.
- Update tests by moving assertions out of Inspector ownership: add structure-surface tests for toggle/add-slot, and update Inspector tests so selected state starts at identity without global `SLOTS`.
- Preserve the current shell metrics: 1600 canvas ~1080px, 1024 canvas ~784px, 390 canvas ~150px.
- Park Phase 4 visual-rhythm choices. Phase 1 should only add styling required for the new Structure surface to be usable.

## Files Touched

- `logs/wp-032/phase-0-result.md`
- `logs/wp-032/phase-0-baseline-1600-empty.png`
- `logs/wp-032/phase-0-baseline-1600-sidebar-left.png`
- `logs/wp-032/phase-0-baseline-1024-empty.png`
- `logs/wp-032/phase-0-baseline-1024-sidebar-left.png`
- `logs/wp-032/phase-0-baseline-390-empty.png`
- `logs/wp-032/phase-0-baseline-390-sidebar-left.png`

## Verification Results

| Check | Result |
|-------|--------|
| arch-test baseline | ✅ (501 tests) |
| LM test baseline | ✅ (152 tests) |
| LM build baseline | ✅ (`326.25 kB` JS raw, `70.63 kB` CSS raw) |
| PARITY-LOG 0 open | ✅ |
| Placement chosen | ✅ (A) |
| Responsive contract filled | ✅ |
| No runtime code changes | ✅ scoped to `tools/layout-maker/src` and `tools/layout-maker/runtime`; global repo had pre-existing dirty files |
| Phase 4 territory not pre-decided | ✅ |
