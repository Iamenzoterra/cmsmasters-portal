# WP-031: Layout Maker - Inspector / Workbench UX Refactor

Status: ✅ DONE  
Priority: P1 - operator productivity  
Created: 2026-04-25  
Updated: 2026-04-25  
Completed: 2026-04-25  
Close report: `logs/wp-031/phase-close-result.md`  
Final commit: 8dddfb82 (P6 visual rhythm purge)  
Total: 6 phases shipped + 4 hotfix passes + close summary

## Mission

Turn the Layout Maker Inspector from a correct-but-flat field list into a
usable operator workbench.

This WP is not another trust/parity pass. LM-Reforge P0-P7 already made the
tool more truthful and stable. WP-031 closes the UX gap that remains:

- which controls belong in the Inspector
- which controls belong in the canvas / breakpoint context
- which controls belong in structure/navigation
- how the Inspector should be grouped
- how breakpoint override scope should be obvious
- how the shell should behave when the viewport is too narrow for three fixed
  columns

The research basis is `tools/layout-maker/codex-review/13-inspector-ux-research.md`.

## Current Evidence

Fresh browser pass on 2026-04-25 against the local UI at
`http://localhost:5174/`.

Captured evidence:

- `tools/layout-maker/codex-review/ux-current-theme-layout.png`
- `tools/layout-maker/codex-review/ux-current-content-selected.png`
- `tools/layout-maker/codex-review/ux-current-sidebar-left-selected.png`
- `tools/layout-maker/codex-review/ux-current-sidebar-tablet-viewport.png`
- `tools/layout-maker/codex-review/ux-current-sidebar-tablet-inspector-bottom.png`
- `tools/layout-maker/codex-review/ux-current-sidebar-left-bp-tablet.png`
- `tools/layout-maker/codex-review/ux-current-mobile-shell.png`

Measured current shell:

- desktop shell grid: `240px 1fr 280px`
- at 1024x768: `240px 504px 280px`
- at 390x844: `240px 0px 280px`; canvas is unusable
- selected sidebar Inspector at 1024x768: `.lm-inspector__body`
  `scrollHeight 876`, `clientHeight 545`

Important implication: a fixed Inspector width increase to 320px is not safe by
itself. It would reduce the 1024px canvas from 504px to 464px.

## Non-Goals

- No Portal render changes.
- No generator changes unless a hidden parity defect is discovered.
- No YAML/schema semantic changes.
- No `--lm-*` to product DS migration.
- No new slot/layout fields.
- No dependency install unless explicitly approved.
- No git push, reset, checkout, destructive deletes, or unrelated cleanup.
- No rewrite of Layout Maker as a different app.

## UX Principles

1. Inspector is for selected layout/slot editing, not every control in the app.
2. Canvas top bar owns breakpoint, viewport, and preview-global behavior.
3. Structure/navigation controls must be visually distinct from property fields.
4. Rare configuration belongs in collapsed clusters or modals.
5. Breakpoint write scope must be visible before a field is edited.
6. Medium and mobile viewport behavior must be intentional; zero-width canvas is
   not an acceptable responsive state.
7. Parity guardrails remain active: a moved field must call the same update path.

## Target Workbench Ownership

### Left Sidebar

Owns project-level navigation and layout actions:

- layouts list
- scopes navigation
- new / clone / import / export / rename / delete

### Canvas Top Bar

Owns preview and breakpoint context:

- breakpoint selector
- device preset selector
- resolved/edit-target truth
- viewport width and column summary
- global sidebar visibility mode
- drawer preview behavior

`SidebarModeControl` and `DrawerSettingsControl` should move here or into a
popover opened from here. They are not selected-slot properties.

### Structure Surface

Owns slot navigation and slot topology:

- slot toggles
- add top-level slot
- select slot
- nested slot navigation where practical

For a first implementation, this can remain in the right panel, but it must be
named and styled as Structure rather than blending into the property Inspector.

### Inspector

Owns selected layout or selected slot properties.

Selected-slot clusters:

1. Identity - slot name, badges, copy summary, current scope
2. Layout - position, width/order/visibility where applicable
3. Spacing - padding, gap, min-height, margin-top
4. Frame - inner max-width, align, background, borders
5. Children - nested slots and leaf/container conversion
6. Behavior - sticky, z-index, allowed block types
7. Drawer Trigger - sidebar-only trigger label/icon/color
8. Diagnostics - usable width, test blocks, CSS scoping warnings
9. References - secondary utility disclosure

Not all clusters render for all slot types. Existing capability logic remains
the source of truth.

## Current Problems To Fix

### P1. Inspector has mixed ownership

Selected-slot editing currently includes global sidebar/drawer controls and
structure controls. This makes the right pane feel larger than it needs to be
and weakens the user's mental model.

### P2. Flat scroll hides intent

Sections exist, but they are not real IA. Decorative glyphs imply disclosure
without providing it.

### P3. Duplicate and low-value rows add scroll

Current code includes:

- inline breakpoint row duplicating `BreakpointFooter`
- selected-slot render of global controls that should live elsewhere

`buildPropertyRows` needs special handling. It is not safe to delete in Phase 1:
current recon shows `gap`, `min-height`, and `margin-top` are not otherwise
editable or visible as first-class controls in the Inspector. Treat those rows
as diagnostics until a later cluster phase gives them a proper owner.

### P4. Breakpoint override state is too subtle

Dots and reset controls are correct but local. Users need cluster-level scope
and row-level cues.

### P5. Shell responsiveness is broken

The fixed three-column grid collapses the canvas at mobile widths and makes
medium viewports cramped.

## Implementation Phases

### Phase 0 - UX Baseline And IA Lock

Goal: lock the current UX baseline and correct this WP before code changes.

Scope:

- create/update research artifact
- record screenshots
- inventory control ownership
- verify stale assumptions from `codex-review/12-workplan.md`
- confirm current dirty files before code changes

Acceptance:

- `tools/layout-maker/codex-review/13-inspector-ux-research.md` exists
- WP-031 reflects workbench IA, not cosmetic polish
- screenshot baseline exists for empty, container, leaf, tablet, and mobile
- no runtime behavior change

Verification:

```bash
git status --short
rg -n "SidebarModeControl|DrawerSettingsControl|buildPropertyRows|InspectorUtilityZone" tools/layout-maker/src/components/Inspector.tsx
rg -n -- "--lm-sidebar-w|--lm-inspector-w|grid-template-columns" tools/layout-maker/src/styles/maker.css
```

### Phase 1 - Delete Confirmed Duplicate Noise

Goal: reduce scroll and cognitive load without moving behavior yet.

Scope:

- remove selected-slot inline breakpoint info row; `BreakpointFooter` remains
  source of truth
- ensure `InspectorUtilityZone` mounts exactly once in each Inspector state
- remove decorative title glyphs that are not disclosure affordances, or convert
  them only when real clusters land
- leave `buildPropertyRows` visible for now; it carries unique read-only values
  for some spacing fields and must move into a cluster before deletion
- keep all field write paths unchanged

Out of scope:

- no cluster architecture yet
- no top-bar popover yet
- no shell width change

Acceptance:

- selected leaf Inspector is shorter
- no editable field disappears
- breakpoint truth remains visible through `BreakpointFooter`
- references remain accessible but secondary

Tests:

- Inspector leaf state still renders editable padding, width, max-width,
  background, align controls where capability allows
- container state still renders children controls
- `BreakpointFooter` still renders in empty, leaf, and container states

Verification:

```bash
npm run test
npm run typecheck
npm run build
rg -n "Breakpoint" src/components/Inspector.tsx
```

### Phase 2 - Re-home Global And Structure Controls

Goal: put controls under the right owner.

Scope:

- create a named Structure surface for slot toggles and `+ Slot`
- move or visually isolate structure controls from selected-slot property
  clusters
- move `SidebarModeControl` and `DrawerSettingsControl` out of selected-slot
  property scroll
- preferred target: canvas top bar popover tied to breakpoint/preview context
- preserve callback paths:
  - `onBatchUpdateSlotConfig`
  - `onUpdateGridProp`
  - `onToggleSlot`
  - `onCreateTopLevelSlot`

Out of scope:

- no new drawer behavior
- no new sidebar modes
- no config schema changes

Acceptance:

- selecting a slot no longer inserts global sidebar/drawer controls into the
  selected-slot property list
- global controls remain reachable from the active breakpoint context
- structure controls are visually named and separated

Tests:

- global sidebar mode buttons still call `onBatchUpdateSlotConfig` with the
  same args as before
- drawer settings still call `onUpdateGridProp` with the same keys as before
- slot toggles still call `onToggleSlot`

Verification:

```bash
npm run test
npm run typecheck
npm run build
```

Screenshot states:

- no slot selected, desktop
- sidebar slot selected, desktop
- tablet breakpoint with drawer controls open

### Phase 3 - Semantic Inspector Clusters

Goal: replace flat sections with navigable, collapsible IA.

Scope:

- add a small `InspectorCluster` primitive, preferably native
  `details/summary`
- define cluster IDs:
  - `identity`
  - `layout`
  - `spacing`
  - `frame`
  - `children`
  - `behavior`
  - `drawer-trigger`
  - `diagnostics`
  - `references`
- map current fields into those clusters
- use capability dispatcher to keep illegal fields hidden
- remove false section glyphs
- persist collapse state only if it does not complicate tests; otherwise defer
  persistence to a follow-up cut

Default open policy:

- Identity: always visible
- Layout: open
- Spacing: open for leaf slots
- Frame: open for leaf slots if width/background/border exists, otherwise
  collapsed
- Children: open for containers
- Behavior: collapsed unless sticky/z-index/allowed block types active
- Drawer Trigger: collapsed for sidebar slots
- Diagnostics: collapsed
- References: collapsed

Out of scope:

- no shell width change unless Phase 5 lands first
- no modal extraction unless Phase 4 includes it

Acceptance:

- every visible field has a semantic owner
- cluster titles are real disclosure affordances
- old visible field matrix remains intact for container/leaf/sidebar slots
- keyboard interaction works through native disclosure controls

Tests:

- leaf slot cluster matrix
- container slot cluster matrix
- sidebar slot cluster matrix
- default open/closed states

Verification:

```bash
npm run test
npm run typecheck
npm run build
```

### Phase 4 - Scope And Override Clarity

Goal: make base/tablet/mobile write scope obvious.

Scope:

- cluster-level scope strip
- override count per cluster
- row-level `data-overridden` cue
- stronger inherited/overridden visual treatment
- optional "show overridden only" filter

Out of scope:

- no change to how overrides are stored
- no merge/draft persistence UX

Acceptance:

- base breakpoint reads neutral
- tablet/mobile no-override state reads inherited
- overridden rows are visible at a glance
- reset controls remain attached to the correct rows

Tests:

- scope strip renders base/tablet/mobile labels correctly
- overridden row data attributes render only when current BP has override
- reset still calls the existing `resetField` path

Verification:

```bash
npm run test
npm run typecheck
npm run build
```

Screenshot states:

- desktop/base
- tablet inherited
- tablet with override
- show-overridden-only active, if implemented

### Phase 4b - Drawer Trigger Modal

Goal: remove rarely-used drawer trigger detail from the default sidebar slot
scroll.

Scope:

- extract drawer trigger label/icon/color into `DrawerTriggerModal` or an
  equivalent compact popover
- keep the same `onUpdateSlotRole` fields:
  - `drawer-trigger-label`
  - `drawer-trigger-icon`
  - `drawer-trigger-color`
- keep sidebar-only capability gating

Out of scope:

- no new drawer icons
- no drawer preview behavior change

Acceptance:

- sidebar slot shows compact "Configure trigger" action
- modal/popover opens and writes the same fields as the current inline controls
- non-sidebar slots do not show the action

Tests:

- modal writes match current inline behavior
- modal close/cancel does not write
- sidebar-only visibility remains enforced

### Phase 5 - Workbench Shell Responsiveness

Goal: prevent the canvas from collapsing under fixed chrome widths.

Scope:

- replace fixed `240px 1fr 280px` behavior with intentional breakpoints
- evaluate one of:
  - resizable/collapsible right Inspector
  - tabbed panels below a medium-width threshold
  - Inspector overlay/drawer below a medium-width threshold
  - explicit desktop-tool message on very small viewports
- do not increase Inspector width until this strategy is in place

Recommended initial rule:

- `>= 1280px`: three-pane workbench
- `900px..1279px`: collapsible right Inspector or overlay Inspector
- `< 900px`: panel navigation, not simultaneous three-pane layout

Acceptance:

- 1024px viewport keeps a usable canvas and reachable Inspector
- 390px viewport does not render a zero-width canvas
- no horizontal hidden content that traps the user

Tests:

- Playwright layout assertions for 1600, 1024, 390 widths
- canvas area width is greater than 0 at all supported widths
- if small viewport is unsupported for full authoring, the UI states that
  explicitly

Verification:

```bash
npm run test
npm run typecheck
npm run build
```

Screenshot states:

- desktop 1600x1000
- tablet-ish 1024x768
- mobile 390x844

### Phase 6 - Visual Rhythm And Inline Style Purge

Goal: clean up code and visual rhythm after controls are in the right places.

Scope:

- replace inline `style={{ marginTop/fontSize/width/flex }}` with CSS classes
- keep dynamic color swatch inline styles
- unify control heights and spacing tokens
- tighten labels, values, and section/cluster spacing
- keep palette and DS tokens unchanged

Acceptance:

- `style={{` count in `Inspector.tsx` drops to dynamic swatches plus any
  genuinely dynamic CSS variable usage
- no magic pixel margin rhythm in JSX
- controls align consistently across clusters

Verification:

```bash
rg -n "style=\\{\\{" src/components/Inspector.tsx
npm run test
npm run typecheck
npm run build
```

### Phase 7 - Close

Goal: empirical close, docs, and regression proof.

Scope:

- run full verification
- capture final screenshot matrix
- update `tools/layout-maker/CLAUDE.md` with Inspector/workbench IA
- update `PARITY-LOG.md` only if a real parity fact changed or a new open entry
  is discovered
- mark WP complete

Verification:

```bash
npm run test
npm run typecheck
npm run build
```

If repo-root arch-test is relevant and available:

```bash
npm run arch-test
```

Final screenshot matrix:

- empty layout state
- no slot selected
- container slot selected
- leaf slot selected
- sidebar slot selected
- tablet inherited state
- tablet overridden state
- medium shell
- mobile shell

## File Ownership

Expected files:

- `tools/layout-maker/src/components/Inspector.tsx`
- `tools/layout-maker/src/components/InspectorUtilityZone.tsx`
- `tools/layout-maker/src/components/BreakpointBar.tsx`
- `tools/layout-maker/src/components/Canvas.tsx` only if shell/top-bar placement
  requires it
- `tools/layout-maker/src/styles/maker.css`
- `tools/layout-maker/src/lib/inspector-capabilities.ts`
- new Inspector helper components only when a phase needs them
- `tools/layout-maker/codex-review/13-inspector-ux-research.md`
- `workplan/WP-031-layout-maker-inspector-ux.md`
- `logs/wp-031/*` for phase results if executing as formal WP

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Moving controls changes update paths | Hidden parity regression | Tests assert callback args before/after; no schema changes |
| Fixed 320px Inspector worsens canvas | Medium viewport regression | Shell phase before width change |
| Accordion hides fields users expect | Discoverability drop | Default-open policy for common clusters; screenshots and smoke pass |
| Modal extraction changes drawer trigger writes | Portal mismatch | Modal tests assert same `onUpdateSlotRole` fields |
| Removing read-only echoes removes copy workflow | Operator friction | Recon first; replace with one copy summary if needed |
| Responsive shell creates large refactor | Scope creep | Isolate Phase 5; do not mix with field IA |
| DS cleanup creeps in | Large unrelated surface | Keep DS migration out of scope |

## Quality Gates

Required per implementation phase:

- tests green
- typecheck green
- build green
- no unrelated file reverts
- screenshots for phases that affect UI
- no new PARITY-LOG open entry unless a real defect is discovered and recorded

Recommended grep checks:

```bash
rg -n "style=\\{\\{" src/components/Inspector.tsx
rg -n "SidebarModeControl|DrawerSettingsControl|buildPropertyRows|InspectorUtilityZone" src/components/Inspector.tsx
rg -n -- "--lm-sidebar-w|--lm-inspector-w|grid-template-columns" src/styles/maker.css
```

## Definition Of Done

- Inspector fields are grouped by operator task, not implementation accident.
- Global preview controls no longer interrupt selected-slot editing.
- Structure controls are visually and semantically separated from properties.
- Breakpoint scope is visible at cluster and row level.
- Medium/mobile shell behavior is intentional and tested.
- The old flat scroll is gone or substantially reduced.
- PARITY behavior remains unchanged.
- Final screenshots prove the UI result, not just tests.

## Current Recommendation

Start with Phase 1 and Phase 2 after this WP rewrite:

1. delete confirmed duplicate rows
2. isolate Structure
3. re-home global sidebar/drawer controls

Do not begin with a CSS-only polish pass. It would make the current structure
neater without solving the user's actual UX complaint.
