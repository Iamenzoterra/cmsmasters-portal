# WP-031 Phase 0 - UX Baseline And IA Lock (RESULT)

Date: 2026-04-25

## Outcome

Phase 0 completed. The old trust-oriented `codex-review` bundle was not used as
the current UX source of truth. A fresh browser/code pass found that the
Inspector problem is information architecture and workbench ownership, not just
CSS polish.

## Artifacts

- Research doc: `tools/layout-maker/codex-review/13-inspector-ux-research.md`
- Rewritten plan: `workplan/WP-031-layout-maker-inspector-ux.md`
- Baseline screenshots:
  - `tools/layout-maker/codex-review/ux-current-desktop-layouts.png`
  - `tools/layout-maker/codex-review/ux-current-theme-layout.png`
  - `tools/layout-maker/codex-review/ux-current-content-selected.png`
  - `tools/layout-maker/codex-review/ux-current-sidebar-left-selected.png`
  - `tools/layout-maker/codex-review/ux-current-sidebar-tablet-viewport.png`
  - `tools/layout-maker/codex-review/ux-current-sidebar-tablet-inspector-bottom.png`
  - `tools/layout-maker/codex-review/ux-current-sidebar-left-bp-tablet.png`
  - `tools/layout-maker/codex-review/ux-current-mobile-shell.png`

## Key Findings

- Current shell grid is `240px 1fr 280px`.
- At 1024x768, canvas gets only `504px`.
- At 390x844, canvas resolves to `0px`.
- Selected-slot Inspector currently mixed slot properties with global
  sidebar/drawer controls.
- `buildPropertyRows` is not safe to delete yet because it carries unique
  read-only visibility for `gap`, `min-height`, and `margin-top`.

## Decisions

- Do not start with CSS-only polish.
- Do not blindly change Inspector width to 320px before a shell strategy.
- Begin implementation with confirmed duplicate/noise removal and ownership
  fixes.
- Move global responsive preview controls to the breakpoint/canvas context.

## Verification

- Browser screenshots captured with local Vite UI.
- Code inventory checked with `rg` for Inspector control ownership.
- No runtime behavior changed in Phase 0.
