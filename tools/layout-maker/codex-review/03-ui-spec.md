# Layout Maker UI Spec

This document translates the review into concrete UI behavior and screen-level requirements.

## 1. Breakpoint Truth Surface

### Goal

Make canonical breakpoint language, resolved config state, and edit-target behavior visible at the same time.

### Breakpoint Bar

The breakpoint bar should expose three distinct layers:

- active canonical breakpoint
- resolved config breakpoint
- current edit target

### Required UI

For the active state, show:

- `Canonical: Tablet (768px)`
- `Viewport: 768px`
- `Resolved config: theme-tablet @ 1400px`

If the canonical key does not exist yet, show an inline edit-target hint:

- `Edit target: first change will create tablet @ 768px from theme-tablet`

If the canonical key already exists, show:

- `Edit target: tablet @ 768px`

If the resolved config width differs from the canonical width, show a warning badge:

- `Non-canonical`

If the resolved config key is nearest-match only, show an explanatory hint:

- `Recovered by closest min-width match`

### Authoring Behavior

When the active canonical breakpoint has no same-named grid key:

- the UI must not silently imply that the resolved config already is the canonical config
- the UI must explain that the next edit will materialize `grid[canonicalBreakpointId]`
- the first successful edit should clone from the resolved source, rewrite `min-width` to the canonical width, and then update the UI to show the new canonical key as both resolved config and edit target

### Warning Behavior

Non-canonical breakpoint mismatches should appear in:

- breakpoint bar
- Inspector breakpoint section
- validation summary

### Copy

Suggested warning text:

- `Tablet currently resolves to theme-tablet at 1400px. Canonical tablet width is 768px.`
- `Your first tablet edit will create grid.tablet at 768px cloned from theme-tablet.`

## 2. Inspector Capability Surface

### Goal

Keep current slot-type gating trustworthy and make it more legible to operators.

### Current Baseline To Preserve

The current build already does these correctly enough to preserve:

- container and leaf sections are mostly separated
- sidebar trigger fields are sidebar-only
- reference utilities start collapsed

### Slot Context Labels

The Inspector should show a visible context badge near the selected slot name, such as:

- `Leaf`
- `Container`
- `Sidebar`
- `Top`
- `Bottom`

These labels are for operator comprehension and do not need to be mutually exclusive in architecture.

### Required Behavior

#### Container slot

Show:

- slot name
- slot context badge
- role fields
- child slot management
- container-safe outer/background controls that are actually honored

Hide:

- leaf-only inner layout controls
- grid-width controls when the slot is not a grid participant
- controls whose downstream meaning is not parity-safe

#### Leaf slot

Show:

- slot name
- slot context badge
- width if it belongs to grid
- inner spacing controls
- align
- max-width
- per-BP visibility and order where valid
- allowed block type hints

#### Sidebar slot

In addition to leaf/container behavior, show:

- drawer trigger label
- drawer trigger icon
- drawer trigger color

Only show these for sidebar slots.

#### Top/Bottom slot

Show:

- role-level position
- sticky
- z-index
- structural fields that actually matter

Avoid presenting them as normal grid cells.

## 3. Validation Surface

### Goal

Turn validation into a continuous guidance system rather than an export-time surprise.

### Main Summary

Add a persistent validation summary near the top of the canvas area or Inspector header.

States:

- `No issues`
- `Warnings: 2`
- `Errors: 3`

### Error vs Warning Rules

Errors:

- block export
- remain visible until resolved

Warnings:

- do not block export
- remain visible but can be collapsed

### Interaction

Each validation item should:

- describe the problem in plain operator language
- point to the relevant slot or breakpoint when possible
- navigate or focus the relevant part of the editor

### Example Copy

- `Tablet currently resolves to theme-tablet at 1400px instead of canonical 768px.`
- `The next tablet edit will create grid.tablet from theme-tablet.`
- `Sidebar drawer visibility requires a drawer trigger on the active grid.`

## 4. Export Surface

### Goal

Make export feel like a final handoff review, not a diagnostic dumping ground.

### Required Changes

Keep:

- slug
- title
- scope
- HTML preview
- CSS preview
- slot_config preview
- exported file paths

Remove from UI:

- `status`

### Validation Gate

If blocking validation errors exist:

- show export as blocked before generating the payload
- present the reasons directly

### Suggested Copy

- `Export blocked: 3 structural errors must be fixed first.`

## 5. Sidebar Workflow Structure

### Goal

Make the left panel teach the real operator workflow.

### Layout List

Keep layout list as the main upper region.

### Action Groups

Use grouped sections:

#### Create

- `New`
- `Clone`

#### Transfer

- `Export`
- `Import`

#### Manage

- `Rename`
- `Delete`

### Visual Priority

- `Export` should be visually strongest among end-state actions
- `Import` should be visibly secondary
- `Delete` should remain isolated and danger-marked

## 6. External Change Handling

### Goal

Treat file reloads as meaningful context interruptions.

### Required UI

When a layout reloads from disk:

- show a sticky banner
- keep it visible until dismissed or until the next meaningful operator action

### Suggested Copy

- `Layout reloaded from external YAML changes.`

If a diff summary is available:

- `Breakpoint config changed`
- `Slot structure changed`
- `Sidebar settings changed`

## 7. Reference Utilities

### Goal

Keep editing primary and reference secondary.

### Required Changes

- keep `Slot Reference` and `Design Tokens` collapsed by default
- move them below a utility divider, into a secondary Inspector tab, or into a lower utility drawer

### Default State

- collapsed by default

## 8. Scopes Screen

### Goal

Reflect the actual meaning of the screen.

### Required Change

Rename `Settings` to `Scopes`.

### Secondary Option

Move `Scopes` into a lower-priority project config entry in the sidebar.

## 9. Preview Fixture Messaging

### Goal

Explain `test-blocks` in product language.

### Required UI

When preview blocks are shown, add a short informational hint:

- `Preview fixtures only. Not exported to Studio.`

When no preview blocks exist:

- use neutral empty states
- do not imply that the layout is incomplete

## 10. Stability Requirements

### Goal

Keep responsive inspection stable while slot, breakpoint, and external state change underneath the Inspector.

### Required UI Behavior

- switching slot or breakpoint must not trigger React internal errors
- drawer inspection must remain stable in `hidden`, `drawer`, and `push` flows
- draft input values must resync cleanly after slot changes and external reloads
