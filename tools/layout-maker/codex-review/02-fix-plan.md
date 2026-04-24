# Layout Maker Fix Plan

This document turns the audit into an implementation-oriented plan.

## 1. Make Breakpoint Truth Explicit

### Problem

The UI currently hides two different states behind one label:

- the canonical breakpoint the operator selected
- the resolved config key the app is actually reading from

When the canonical key is missing, the first edit can also materialize a new canonical grid entry without warning the operator first.

### Fix

- show canonical breakpoint and resolved config separately
- warn on non-canonical `min-width` values and fallback resolution
- explain when the next edit will materialize `grid.<breakpoint>`
- after the first canonicalizing edit, switch the UI to the new canonical key explicitly

### Why

Operators need to see both what they are previewing and what their next edit will write.

### Priority

`P0`

## 2. Move Validation Into The Main Editing Loop

### Problem

Validation is delayed until export.

### Fix

- run validation after meaningful edits
- keep validation results in UI state
- display blocking errors and non-blocking warnings in the main workflow
- make export a confirmation step, not the first moment of truth

### Why

A forge/validator should guide continuously, not only reject at the end.

### Priority

`P0`

## 3. Fix Inspector Render-Phase Instability

### Problem

Responsive/drawer inspection can still surface a React internal error, which weakens trust in the entire editing surface.

### Fix

- remove render-phase state synchronization for Inspector draft inputs
- resync width/max-width drafts via effects or equivalent derived state
- verify breakpoint switching, drawer modes, slot switching, and external reloads explicitly

### Why

A structurally correct tool that feels unstable is still not trustworthy.

### Priority

`P0`

## 4. Remove Studio Lifecycle Concepts From LM UI

### Problem

The export UI shows `status`, even though status belongs to Studio.

### Fix

- remove `status` from `ExportDialog`
- preserve compatibility only at payload level if temporarily required
- later remove the field from LM export generation when ingest can own it

### Why

This restores the boundary between layout authoring and publishing lifecycle.

### Priority

`P1`

## 5. Clarify Editing Scope At The Point Of Action

### Problem

The storage scope of edits is too implicit.

### Fix

- add scope chips to Inspector sections
- show labels such as `Base`, `Role`, `Tablet override`, `Grid-level`
- state where inherited values come from
- make reset behavior explicit

### Why

This lowers cognitive load without changing the underlying model.

### Priority

`P1`

## 6. Rebuild Sidebar Actions Around The Real Flow

### Problem

Primary and secondary actions currently share one flat action stack.

### Fix

Group actions by phase:

- `Create`: `New`, `Clone`
- `Transfer`: `Export`, `Import`
- `Manage`: `Rename`, `Delete`

Also:

- visually demote `Import`
- visually strengthen `Export`

### Why

The sidebar should teach the real workflow instead of listing everything equally.

### Priority

`P1`

## 7. Treat External Reloads As Context Interruptions

### Problem

External YAML updates currently show up as a small toast only.

### Fix

- add a persistent banner for external reloads
- summarize the type of structural change where possible
- make it clear that the current view has been reloaded from disk

### Why

For this class of tool, context shifts should be visible and memorable.

### Priority

`P1`

## 8. Harden Inspector Capability Logic

### Problem

Current Inspector gating is better than before, but the rule system is still distributed across JSX branches and heuristics.

### Fix

- centralize slot capability logic in one auditable place
- keep current container/leaf/sidebar gating intact
- add visible slot-type/context badges
- add regression coverage for container/sidebar states

### Why

This reduces regression risk without pretending that the current Inspector is still fully ungated.

### Priority

`P1`

## 9. Reduce Inspector Utility Noise

### Problem

Reference material is already collapsed by default, but it still competes with editing controls in the main scroll path.

### Fix

- keep `Slot Reference` and `Design Tokens` collapsed by default
- move them into a secondary utility area
- keep the primary editing path visually dominant

### Why

The Inspector should feel like an editor first, not editor-plus-documentation.

### Priority

`P2`

## 10. Reframe Settings As Project Configuration

### Problem

`Settings` overstates the scope of that screen.

### Fix

- rename it to `Scopes`
- or move it into a secondary config entry point

### Why

This better reflects its actual role and lowers navigation noise.

### Priority

`P2`

## 11. Explain Preview Fixtures Clearly

### Problem

`test-blocks` behavior is architecturally useful but poorly explained in UI language.

### Fix

- add inline messaging that preview blocks are fixtures only
- state that they are not part of export
- avoid making empty slots look incomplete just because fixtures are absent

### Why

This keeps structural authoring separate from content authoring in the operator's mental model.

### Priority

`P2`

## Recommended Implementation Order

1. Breakpoint truth and canonical-key materialization disclosure.
2. Live validation surface and export blocking.
3. Inspector stability fix for responsive/drawer inspection.
4. Remove `status` from LM UI.
5. Add scope chips and inheritance clarity.
6. Regroup sidebar actions.
7. Harden Inspector capability logic and add slot-type/context badges.
8. Improve external-change signaling.
9. Move reference utilities further out of the main editing flow.
10. Reframe `Settings` as `Scopes`.
11. Add `test-blocks` product copy.

## Best Next Spec Layer

The strongest next step is a narrow spec for three systemic surfaces:

- breakpoint truth, including canonical-key materialization behavior
- live validation surface
- Inspector stability remediation

Those three changes remove the largest remaining trust failures before any deeper redesign work starts.
