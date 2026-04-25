# WP-031 Phase 1-2 - Inspector Noise + Control Ownership (RESULT)

Date: 2026-04-25

## Outcome

Completed the first low-risk implementation slice:

- removed selected-slot inline breakpoint info row
- kept `BreakpointFooter` as the single Inspector breakpoint truth surface
- removed decorative section glyph spans (`▲`, `▭`, `▤`) that implied
  disclosure before clusters exist
- moved global responsive preview controls out of the Inspector scroll path and
  into the BreakpointBar as a `Preview controls` popover
- extracted responsive controls into `ResponsivePreviewControls.tsx`
- preserved the old `DrawerSettingsControl` import contract through an
  Inspector re-export for the existing stability test

## Files Changed

- `src/components/Inspector.tsx`
- `src/components/Inspector.test.tsx`
- `src/components/BreakpointBar.tsx`
- `src/components/BreakpointBar.test.tsx`
- `src/components/ResponsivePreviewControls.tsx`
- `src/App.tsx`
- `src/styles/maker.css`

## Behavioral Contract

No layout YAML, generator, schema, or Portal behavior changed.

Responsive global controls still call the same callbacks:

- sidebar mode: `onBatchUpdateSlotConfig(slotNames, 'visibility', value, bp)`
- drawer trigger: `onUpdateGridProp(gridKey, 'drawer-trigger', value)`
- drawer position: `onUpdateGridProp(gridKey, 'drawer-position', value)`
- drawer width: `onUpdateGridProp(gridKey, 'drawer-width', value)`

## Tests Added

- `Inspector.test.tsx`
  - selected slot renders only one Inspector `Breakpoint` label via footer
  - decorative section glyphs are not rendered before real clusters exist
- `BreakpointBar.test.tsx`
  - desktop hides `Preview controls`
  - tablet shows global sidebar/drawer controls in the breakpoint popover
  - popover controls call the expected callbacks

## Verification

Commands:

```bash
npx.cmd vitest run src/components/BreakpointBar.test.tsx src/components/Inspector.test.tsx src/components/DrawerSettingsControl.stability.test.tsx
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
```

Results:

- Targeted tests: 3 files passed, 14 tests passed
- Full tests: 16 files passed, 111 tests passed
- Typecheck: passed
- Build: passed
  - CSS: 66.79 kB, gzip 11.71 kB
  - JS: 323.23 kB, gzip 94.24 kB

Browser verification:

- Screenshot: `tools/layout-maker/codex-review/ux-phase1-sidebar-left-selected.png`
  - `glyphCount: 0`
  - Inspector breakpoint label count: `1`
- Screenshot: `tools/layout-maker/codex-review/ux-phase2-preview-controls-popover.png`
  - popover contains `All sidebars at tablet` and `Drawer at tablet`
  - `inspectorHasGlobalControls: false`

## Follow-Up

Next implementation phase should be semantic Inspector clusters. Do not delete
`buildPropertyRows` until `gap`, `min-height`, and `margin-top` have a proper
cluster owner or editable controls.
