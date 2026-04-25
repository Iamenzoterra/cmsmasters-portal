# Layout Maker Inspector UX Research

Date: 2026-04-25  
Scope: Inspector / workbench UX, not parity, not DS migration.

## Executive Finding

The Inspector is correct enough after LM-Reforge, but it is not yet a good
operator workbench. The current issue is information architecture, not just
visual rhythm.

The right next step is a workbench refactor:

- keep the Inspector focused on the selected layout or selected slot
- move global breakpoint/sidebar/drawer controls out of the selected-slot scroll
- move reference utilities out of the primary edit path
- group slot fields into semantic clusters
- make breakpoint override scope visible at cluster and row level
- fix the fixed-width shell so medium/mobile viewports do not collapse the
  canvas

This is deliberately broader than the earlier "Inspector polish" proposal.
Cleaning inline styles would improve code hygiene, but it would not solve the
main UX friction.

## Evidence Captured

Fresh browser pass against the current local UI at `http://localhost:5174/`.

Screenshots saved in `tools/layout-maker/codex-review/`:

- `ux-current-desktop-layouts.png` - loaded layout list, no selection
- `ux-current-theme-layout.png` - selected `theme-page-layout`, no slot selected
- `ux-current-content-selected.png` - selected container slot
- `ux-current-sidebar-left-selected.png` - selected sidebar leaf slot
- `ux-current-sidebar-tablet-viewport.png` - 1024x768 viewport, sidebar leaf
- `ux-current-sidebar-tablet-inspector-bottom.png` - Inspector body scrolled
- `ux-current-sidebar-left-bp-tablet.png` - tablet breakpoint state
- `ux-current-mobile-shell.png` - 390x844 shell collapse

Relevant measured facts:

- Desktop shell grid is `240px 1fr 280px`.
- At 1024x768, shell resolves to `240px 504px 280px`.
- At 390x844, shell resolves to `240px 0px 280px`; the canvas has zero width.
- At 1024x768, selected sidebar Inspector body is scrollable:
  `.lm-inspector__body` has `scrollHeight 876`, `clientHeight 545`.
- Selected sidebar leaf view contains slot identity, slot toggles, role fields,
  drawer trigger fields, slot area fields, read-only derived rows, slot
  parameters, breakpoint info, references, and footer truth in one right pane.
- Tablet breakpoint selected-slot view still includes global sidebar/drawer
  controls in the selected-slot scroll path.

## What Is Already Better Than The Old Review Assumed

The old `codex-review` bundle is stale in several places. Current code already
has:

- `InspectorUtilityZone`, collapsed by default
- `inspector-capabilities.ts` dispatcher
- slot type badges
- scope-chip related logic
- sidebar action grouping
- Scopes tab rename
- breakpoint truth footer and bar disclosure
- validation summary
- focus-ring and motion-safety close work from LM-Reforge P7/P7a

Do not treat `codex-review/12-workplan.md` as current UI truth. It is useful
history, not a current UX plan.

## Primary UX Problems

### 1. The Inspector Owns Too Many Jobs

The right pane currently mixes:

- slot selection / slot enablement
- selected-slot editing
- layout defaults
- global sidebar mode
- drawer preview behavior
- breakpoint truth
- derived diagnostics
- reference docs

These are different operator tasks. Keeping them in one scroll surface makes
the Inspector feel dense even when each control is individually valid.

### 2. Global Controls Appear Inside Selected-Slot Editing

`SidebarModeControl` and `DrawerSettingsControl` are breakpoint/canvas-level
controls. They affect multiple slots or the preview system, not the selected
slot's own field group. When rendered inside the selected-slot scroll, they
interrupt the mental model: the user selected `content`, but the pane also
edits all sidebars and drawer panel behavior.

Better home: a breakpoint/canvas toolbar popover or a dedicated layout-settings
cluster that is visibly separate from slot properties.

### 3. Slot Structure And Slot Properties Are Blended

`SlotToggles` and `+ Slot` are structure/navigation controls. They are useful,
but they are not selected-slot properties. In the current right pane they take
top priority over the actual selected slot fields.

Better home: a compact structure rail/tree, a collapsible `Structure` panel, or
an Inspector header mode above the scroll that is visually distinct from
property clusters.

### 4. Sections Are Visual Dividers, Not Navigable IA

The current sections have titles, colors, and glyphs, but they do not provide
navigation. Triangle glyphs such as `▲` imply disclosure, yet the sections are
not collapsible. That is a false affordance.

Better pattern: semantic clusters with real disclosure controls and stable
default-open states.

### 5. Per-Breakpoint Scope Is Still Too Local

The current dots/reset affordances are correct but too subtle. A user editing
tablet/mobile needs to understand scope before touching a field.

Better pattern:

- sticky identity/scope header
- cluster-level scope strip
- row-level override rail/tint
- optional "show overridden only" filter

### 6. Fixed Chrome Widths Break The Workbench At Medium/Mobile Sizes

The fixed `240px + 1fr + 280px` grid makes the canvas too small on medium
screens and completely collapses it on mobile. Increasing Inspector width to
320px without changing shell behavior would make this worse at 1024px:
`240px + 320px` leaves only `464px` for the canvas.

The shell needs a responsive/resizable strategy before any permanent Inspector
width increase.

## Recommended Information Architecture

### Left Sidebar

Owns project-level navigation and layout actions:

- layouts list
- scopes navigation
- new / clone / import / export / rename / delete

Possible later refinement: split `Export` into a top-level command near
validation if export becomes a primary completion action.

### Canvas Top Bar

Owns preview and breakpoint context:

- breakpoint buttons
- device preset selector
- resolved/edit-target truth
- viewport/columns/gap summary
- global sidebar/drawer preview controls via popover

This is where `SidebarModeControl` and `DrawerSettingsControl` should move,
because they modify preview/breakpoint behavior rather than a slot property.

### Structure Surface

Owns slot enablement and slot creation:

- slot tree or toggle list
- add top-level slot
- nested slot navigation
- select slot

This could be:

- a compact section above the Inspector scroll
- a collapsible Structure drawer inside the right pane
- a future middle-left rail beside the canvas

For a first implementation, keep it in the right pane but visually separate it
from property clusters.

### Right Inspector

Owns selected layout or selected slot editing only.

Recommended selected-slot clusters:

1. `Identity` - slot name, type badges, copy summary, scope state
2. `Layout` - position, width/order/visibility where applicable
3. `Spacing` - padding, gap, min-height, margin-top
4. `Frame` - inner max-width, content align, background, borders
5. `Children` - nested slots, convert leaf/container
6. `Behavior` - sticky, z-index, allowed block types
7. `Drawer Trigger` - sidebar-only trigger configuration, preferably modal
8. `Diagnostics` - usable width, test blocks, CSS scoping warnings
9. `References` - utility disclosure, still secondary

Not every cluster renders for every slot type. Capability dispatcher remains
the guardrail.

## Move / Remove / Add

### Move

- Move `SidebarModeControl` out of selected-slot scroll.
- Move `DrawerSettingsControl` out of selected-slot scroll.
- Move `SlotToggles` and `+ Slot` into a clearly named Structure surface.
- Move references into a utility drawer/modal or keep as the final collapsed
  cluster with lower visual weight.
- Move drawer trigger label/icon/color into a sidebar-only modal or collapsed
  cluster, because it is configured rarely.

### Remove

- Do not blindly remove `buildPropertyRows` rows. Current recon shows they are
  not pure duplicates: for `gap`, `min-height`, and `margin-top` they are the
  only Inspector-visible values. Treat them as diagnostics until a later cluster
  phase either moves them into `Diagnostics` or turns them into real editable
  Spacing controls.
- Remove duplicate inline breakpoint info row; the sticky footer and top bar
  are the sources of truth.
- Remove decorative section glyphs that are not real disclosure controls.
- Remove inline `style={{ marginTop/fontSize/width }}` overrides after IA is
  settled.

### Add

- Real collapsible clusters (`details/summary` is a good low-state option).
- Cluster default-open policy.
- Cluster-level scope strip and override count.
- Row-level per-BP override rail/tint.
- Optional "show overridden only" filter.
- Responsive shell rule for medium/mobile viewports.
- A compact layout/global controls popover in the canvas top bar.

## WP-031 Corrections Needed

The existing `workplan/WP-031-layout-maker-inspector-ux.md` is a better
starting point than the old review, but it should be revised before execution.

Keep:

- 8-ish semantic clusters
- dedup phase
- inline-style purge after structure is clear
- per-BP override visualization
- drawer trigger modal candidate
- no PARITY changes
- no DS migration

Change:

- Do not hard-code Inspector width to 320px without a shell strategy.
- Do not treat accordion alone as the UX solution.
- Add a `Workbench Shell` phase before or alongside width changes.
- Re-home global drawer/sidebar controls to the canvas top bar, not empty state.
- Make Structure a named surface instead of leaving slot toggles as anonymous
  chrome inside the Inspector.
- Make the first implementation slice delete/dedup/re-home, not cluster
  architecture.

## Recommended Implementation Order

### Phase 0 - UX Baseline And IA Lock

Deliverables:

- this research doc
- revised WP-031
- screenshot baseline
- field/control ownership map

No code behavior changes.

### Phase 1 - Delete Confirmed Duplicate Noise

Low-risk implementation:

- remove duplicate inline BP info row
- ensure `InspectorUtilityZone` mounts once per state
  - do not remove `buildPropertyRows` yet; it currently carries unique
    read-only value visibility for some spacing fields
- ensure global controls do not duplicate between empty and selected states

### Phase 2 - Re-home Global And Structure Controls

Move controls to their correct owner:

- Structure surface for slot toggles/add slot
- Canvas top bar popover for sidebar/drawer global controls

This phase changes UX but should not change config writes.

### Phase 3 - Inspector Clusters

Convert flat sections into semantic clusters:

- Identity
- Layout
- Spacing
- Frame
- Children
- Behavior
- Drawer Trigger
- Diagnostics
- References

Use the existing capability dispatcher to keep field visibility correct.

### Phase 4 - Scope And Override Clarity

Add:

- cluster scope strip
- row override rails
- override count
- show-overridden-only filter

### Phase 5 - Shell Responsiveness

Resolve the fixed-width shell:

- desktop: stable three-pane workbench
- medium: collapsible/resizable side panels or Inspector overlay
- mobile: explicit panel navigation, not `1fr` collapsing to zero

This phase may happen earlier if Inspector width changes are required.

### Phase 6 - Close

Run tests, typecheck, build, screenshots, update CLAUDE/PARITY docs.

## Guardrails

- No new layout YAML semantics.
- No generator changes unless a hidden parity defect is found.
- No Portal CSS changes.
- No `--lm-*` to app DS migration.
- No new field behavior hidden inside the refactor.
- Do not change `Inspector` prop shape unless a separate migration is approved.
- Do not delete user or generated artifacts unrelated to this work.

## Open Design Decisions

1. Should `Structure` stay in the Inspector or become a separate rail?
2. Should the Inspector be fixed, resizable, or collapse into an overlay below
   a viewport threshold?
3. Should drawer trigger configuration be a modal immediately, or first a
   collapsed cluster?
4. Is `Export` a left-sidebar action or a top validation/completion action?
5. Does mobile need full authoring support or an explicit "desktop tool"
   message with panel navigation?

## Recommendation

Proceed with WP-031, but only after rewriting it around workbench IA and shell
responsiveness. The first code phase should be delete/dedup and control
ownership, not CSS cleanup.
