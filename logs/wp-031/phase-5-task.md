# WP-031 Phase 5 - Workbench Shell Responsiveness (TASK)

Date: 2026-04-25

## Goal

Stop the canvas from collapsing when chrome chrome panels (sidebar +
inspector) overrun the viewport. Phase 0 RECON measured: at 1024px,
canvas = 504px; at 390px, canvas = **0px** (unusable). Inspector +
sidebar consumed 100% of viewport width.

Fix the shell so:
- ≥1280px: full three-pane (unchanged behavior)
- 768-1279px: Inspector becomes a right-side overlay; toggle button
  surfaces in BreakpointBar; canvas occupies sidebar+canvas track only
- <768px: same overlay strategy + a "narrow viewport" notice (LM remains
  desktop-tool-first, but canvas stays usable)

PARITY contract preserved. No write path changes. No new fields.

## Binding Brain Decisions

1. **Pure CSS media-query driven.** No JS resize listener. State for
   inspector-open/close is React `useState` toggled by a button; CSS
   media query controls which mode the layout uses.

2. **Inspector overlay below 1280px.** `position: fixed; top: 0;
   right: 0; bottom: 0; width: var(--lm-inspector-w); z-index: 50`.
   Translate-X off-screen by default; toggle to translate-X(0) when
   `data-inspector-open="true"` on shell.

3. **Toggle button in BreakpointBar.** New button labeled "Inspector"
   visible only at <1280px via media query. Click toggles state.
   Reuses existing `lm-bp-btn` class for visual coherence.

4. **Backdrop on overlay open.** Semi-transparent backdrop element,
   z-index 49 (below Inspector). Click backdrop OR Esc key → close.

5. **Sidebar stays in flow.** Don't overlay the left sidebar in this
   phase — keeps scope tight. If 768px proves cramped for sidebar +
   canvas alone, address in Phase 5b.

6. **<768px narrow notice.** Small banner above canvas: "Narrow
   viewport — Layout Maker works best at ≥1280px wide." Inspector
   overlay still reachable via toggle.

7. **Auto-close on BP switch — NO.** Operator may want to keep Inspector
   open across BP changes. Close requires explicit click/Esc.

8. **Path budget ≤ 6:** App.tsx + BreakpointBar.tsx + maker.css +
   App.test.tsx (or new) + 2 screenshots.

9. **Bundle cap ±5 kB.** CSS additions ~30 lines, JS additions ~10
   lines (state + button + backdrop element).

10. **Test floor 149 → ≥154.** Adds: toggle button visibility per
    width tier, data-inspector-open attribute wiring, Esc key close,
    backdrop click close.

11. **Empirical pass/fail BEFORE close.** Playwright @ 1280, 1024,
    390 widths. Measure `.lm-canvas-area` width + `.lm-inspector`
    visibility/position.

12. **PARITY zero open precondition.** Shell layer is presentation-
    only — Inspector internals unchanged.

13. **Catch-all stop trigger:**
    - App.tsx grows > 50 LOC
    - Bundle > ±5 kB
    - Test fail after batch
    - Canvas still 0px at 390px after fix (acceptance break)
    - Sidebar overlap with canvas at 1024px

## File scope

```
tools/layout-maker/src/App.tsx                             # M (state, data-attr, backdrop, narrow notice)
tools/layout-maker/src/components/BreakpointBar.tsx        # M (Inspector toggle button + onToggleInspector prop)
tools/layout-maker/src/styles/maker.css                    # M (media queries + overlay CSS + backdrop CSS + toggle button visibility)
tools/layout-maker/src/components/BreakpointBar.test.tsx   # M (toggle button visibility + callback)
tools/layout-maker/codex-review/wp031-phase5-1024-overlay.png   # NEW
tools/layout-maker/codex-review/wp031-phase5-390-narrow.png     # NEW
```

## Tests planned

```
# BreakpointBar.test.tsx — Phase 5 additions
- Inspector toggle button rendered (callback wiring works regardless of viewport — CSS controls visibility)
- Click on toggle calls onToggleInspector callback

# (Optional) App-level test:
- data-inspector-open attribute toggles on shell
```

## Acceptance (Definition of Done)

- [ ] `.lm-canvas-area` computed width > 0 at 390px viewport
- [ ] `.lm-canvas-area` computed width > 0 at 1024px viewport
- [ ] Inspector reachable at 1024px (toggle button → overlay visible)
- [ ] Inspector reachable at 390px (same)
- [ ] No horizontal scrollbar on .lm-shell at any tested width
- [ ] Toggle button hidden at ≥1280px
- [ ] Esc closes Inspector overlay
- [ ] Backdrop click closes Inspector overlay
- [ ] All 149 existing tests still pass + new ones added
- [ ] PARITY-LOG zero open preserved
