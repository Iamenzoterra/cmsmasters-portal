# Layout Maker Quick Wins

This document lists improvements that should deliver UX value quickly without requiring a large redesign.

## Quick Win 1: Remove `status` From Export UI

### Change

Stop showing `status` in `ExportDialog`.

### Why

- it does not belong to LM's product model
- it removes one visible boundary violation immediately

### Cost

Low

## Quick Win 2: Add Breakpoint Truth Badges And Materialization Hint

### Change

If a resolved config width differs from canonical width, show a warning badge in the breakpoint bar.

If the canonical key is missing, show a short hint that the first edit will create it from the resolved source.

### Why

- immediately surfaces hidden contract drift
- removes surprise structure writes on first edit

### Cost

Low to medium

## Quick Win 3: Add Scope Chips To Inspector Sections

### Change

Add chips such as:

- `Base`
- `Role`
- `Tablet override`
- `Grid-level`

### Why

- clarifies storage model instantly
- reduces operator guesswork

### Cost

Low to medium

## Quick Win 4: Fix Render-Phase Inspector Draft Sync

### Change

Move width/max-width draft synchronization out of render and into effects or equivalent derived state.

### Why

- removes a likely source of the current React internal error
- improves trust in breakpoint-specific editing quickly

### Cost

Low to medium

## Quick Win 5: Add Preview Fixture Copy

### Change

Add one line near block previews:

- `Preview fixtures only. Not exported to Studio.`

### Why

- clarifies what `test-blocks` are
- removes a recurring source of conceptual confusion

### Cost

Low

## Quick Win 6: Replace External Reload Toast With Banner

### Change

Use a persistent banner instead of a transient toast for external file reloads.

### Why

- much better context retention
- no core architecture change required

### Cost

Low to medium

## Quick Win 7: Reorder Sidebar Actions

### Change

Move actions into a more workflow-aligned order even before full visual regrouping.

Suggested interim order:

- `New`
- `Clone`
- `Export`
- `Import`
- `Rename`
- `Delete`

### Why

- better reflects the real flow immediately

### Cost

Low

## Quick Win 8: Add Blocking Validation Count Near Export

### Change

Show a compact validation indicator near the export entry point:

- `Ready to export`
- `Export blocked: 2 errors`

### Why

- reduces surprise
- creates a much better mental model of export readiness

### Cost

Medium

## Best First Batch

If you want a very small first pass with strong signal, do these first:

1. remove `status` from export UI
2. add breakpoint mismatch badge plus materialization hint
3. add scope chips
4. fix render-phase Inspector draft sync
5. add preview fixture copy
