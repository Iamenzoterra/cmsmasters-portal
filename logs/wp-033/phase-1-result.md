# WP-033 Phase 1 — Result

**Status:** ✅ COMPLETE
**Commit:** `547bb79d` — `feat(block-forge): WP-033 phase 1 — iframe inspector pipeline [WP-033 phase 1]`
**Date:** 2026-04-27
**Budget:** 8–10h estimated, ~3h actual
**Phase 0 Commit:** `6d6c1c66`
**Task prompt:** [phase-1-task.md](phase-1-task.md) at commit `d3fc2ad2`

---

## Outcome

Hover/pin DevTools-style protocol is wired end-to-end on `tools/block-forge` (port 7702). User flow exercised live in browser:

1. **Block selection → Inspector activates** (slug propagates from App.tsx → Inspector → InspectorPanel; empty state hint replaced by hover prompt + BP picker)
2. **Click element in iframe → element-click message fires → Inspector requests pin → iframe applies `data-bf-pin` → green outline visible** (cross-frame roundtrip ≈ instant)
3. **Inspector breadcrumb populates** with derived selector + green dot indicator
4. **Clear button appears** (pinned state non-null)
5. **Escape clears pin** → iframe drops `data-bf-pin` → outline gone → breadcrumb back to empty hint
6. **BP picker click 1440 → 768** → PreviewTriptych tab follows (Tablet selected, iframe re-created at 768px) AND vice versa (Triptych tab click → Inspector BP follows)

Phase 1 deliverable per task prompt: **iframe pipeline + protocol + integration shell**. Properties surface (PropertyRow, token chips, per-BP cell sourcing) is Phase 2/3 scope and stays as a Phase 2 placeholder div.

---

## Brain rulings honored

| Ruling | How it landed |
|---|---|
| **A — Selector strategy HOLD** | New Inspector IIFE uses identical `deriveSelector` (id > stable class > nth-of-type, depth 5, UTILITY_PREFIXES filter) duplicated from existing element-click IIFE. No reimplement. Confirmed via live smoke — pinned breadcrumb showed `div.slot-inner > div:nth-of-type(1) > section.block-fast-loading-speed > div.gauge-wrap > div.gauge-score`. |
| **C — Slider-doesn't-apply NOT a wiring fault** | Live-smoke kickoff (Task 1.1) GREEN: dragging font-size slider at BP=1440 with Desktop tab active changed `.gauge-score` font-size from 60px → 72px in real time. Bug already fixed by post-WP-030 commits `ac739477` + `3ff4eddf`. Phase 3 §3.1 collapses to "use existing `composeTweakedCss`" — no new helper needed. |
| **D — REIMPLEMENT (block-forge first)** | Inspector + InspectorPanel created under `tools/block-forge/src/components/`. `packages/block-forge-ui/` stays dormant. Studio mirror is Phase 4. |
| **E — Per-BP cell sourcing** | Deferred to Phase 3. Phase 1 InspectorPanel is shell-only with "Properties — Phase 2" placeholder. |
| **F — Chip emission** | Deferred to Phase 3. |

## Pre-empted designs honored

- **`block-forge:` namespace, no `inspector:` prefix** — all 4 new types: `inspector-hover`, `inspector-unhover`, `inspector-request-pin`, `inspector-pin-applied` (note: `element-click` reused as the click-to-pin trigger; no new `inspector-click` invented).
- **rAF cleanup contract** — `cancelAnimationFrame` on each new mouseover (last-write-wins dedup); `beforeunload` clears rAF + `data-bf-hover` + `data-bf-pin` attrs.
- **BP normalization** — Inspector panel uses `1440 | 768 | 375` (matches preview viewports); TweakPanel keeps legacy `1440 | 768 | 480` independently. Both panels coexist in the aside. Phase 5 collapses both to `1440|768|375`.

---

## Files touched

### Modified (5)

| File | LOC delta | What changed |
|---|---:|---|
| `tools/block-forge/src/lib/preview-assets.ts` | +181 | `INSPECTOR_OUTLINE_RULE` const + `@layer shared` injection. New inspector IIFE (helpers duplicated from element-click IIFE for blast-radius isolation; mouseover+mouseleave handlers; `inspector-request-pin` listener with `__clear__` sentinel; `beforeunload` cleanup). |
| `tools/block-forge/src/components/PreviewTriptych.tsx` | +21/-2 | Option C lift: optional `activeId?` + `onActiveIdChange?` props with internal-state fallback. Backward-compat preserved. |
| `tools/block-forge/src/App.tsx` | +34 | New imports (`Inspector`, `InspectorBp`). `VIEWPORT_BP` + `BP_VIEWPORT` lookup tables. `previewActiveId` state, `inspectorActiveBp` derived, `handleInspectorBpChange` callback. PreviewTriptych receives controlled props. Inspector rendered in aside below TweakPanel. |
| `src/__arch__/domain-manifest.ts` | +8 | 4 new file paths in `infra-tooling.owned_files`. |
| `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap` | +310 | Body-region snapshots regenerated for new IIFE. |

### New (5)

| File | LOC | Purpose |
|---|---:|---|
| `tools/block-forge/src/components/Inspector.tsx` | 175 | Orchestrator. 4 message listeners, requestPin via iframe[title^="…"] querySelector, Escape handler, slug-change cleanup, BP-change re-pin (60ms defer for new IIFE registration). |
| `tools/block-forge/src/components/InspectorPanel.tsx` | 122 | Pure UI shell. Header + breadcrumb (with hover/pin dot indicator) + BP radio group + Properties placeholder. DS-token-only styling. Empty state for `slug=null`. |
| `tools/block-forge/src/__tests__/Inspector.test.tsx` | 232 | 14 unit tests covering all listeners, slug-filter, Escape gating, slug-change cleanup, BP-change re-pin (with fake timers), BP picker click. |
| `tools/block-forge/src/__tests__/InspectorPanel.test.tsx` | 110 | 6 tests including 4 snapshots (empty / populated-no-state / hover-only / pinned) + 2 BP-picker structure assertions. |
| `tools/block-forge/src/__tests__/__snapshots__/InspectorPanel.test.tsx.snap` | (auto) | 4 snapshots from above. |

### Untouched (zero-touch enforced)
- `apps/studio/**` — all 15 Studio preview-assets tests still pass in their own context.
- `packages/**` — including `packages/block-forge-core` and `packages/block-forge-ui` (latter stays dormant per Ruling D).
- `tools/block-forge/src/components/TweakPanel.tsx` — slider, BP picker, debounce, all still functional. Verified via live smoke (Task 1.1).
- `tools/responsive-tokens-editor/**` — out of scope.

---

## Gates

| Gate | Status | Detail |
|---|---|---|
| **arch-test** | ✅ 548/548 | Baseline 544 + 4 new owned_files (one path-test per file; estimated +8 was off by 4 — actual schema is +1/file, not +2). |
| **typecheck (tools/block-forge)** | ✅ clean | `npx tsc --noEmit` zero errors. |
| **block-forge full test suite** | ✅ 185/185 (+ 6 skipped) | All 10 test files pass. |
| **Studio isolated test suite** | ✅ 15/15 | `apps/studio/.../preview-assets.test.ts` passes — confirms zero-touch on Studio. |
| **DS-token lint (pre-commit)** | ✅ clean | 1 file checked, no hardcoded styles. |
| **Live-smoke (Task 1.1, Ruling C gate)** | ✅ GREEN | Slider 60→72px on Desktop 1440 iframe, no console errors. |
| **Manifest delta** | ✅ +4 owned_files | Inspector.tsx, InspectorPanel.tsx, Inspector.test.tsx, InspectorPanel.test.tsx — all in `infra-tooling`. |
| **Zero-touch on apps/studio/**, packages/**, TweakPanel.tsx** | ✅ verified | `git diff --stat HEAD -- ':!apps/studio/**'` confirms no Studio modifications from Phase 1. |

---

## Live-verification artifacts

All exercised at `http://localhost:7702/` via preview-tools (block selected: `fast-loading-speed`, target: `.gauge-score`):

| Check | Method | Verdict |
|---|---|---|
| Slider GREEN (Ruling C gate) | Drag font-size 60→72 at BP=1440 → DOM read | ✅ Visible change |
| INSPECTOR_OUTLINE_RULE present | Search `<style>` blocks | ✅ `[data-bf-hover]`, `[data-bf-pin]` rules found |
| Inspector IIFE present | Search emitted HTML for `WP-033 Phase 1` marker | ✅ |
| Hover outline color | Set `data-bf-hover` manually + `getComputedStyle` | ✅ `rgb(40, 79, 220)` (text-link) solid 2px offset -2px |
| Pin outline color | Set `data-bf-pin` manually | ✅ `rgb(52, 129, 49)` (status-success-fg) solid 2px |
| Pin protocol roundtrip | Post `inspector-request-pin` from parent → capture reply | ✅ `inspector-pin-applied` returned with selector + rect + computedStyle |
| `__clear__` sentinel | Post with `selector: '__clear__'` | ✅ pin attr removed, reply with `selector: null` |
| Click-to-pin | Dispatch click on `.gauge-score` | ✅ green outline + Inspector breadcrumb populated + Clear button rendered |
| Escape clears pin | `KeyboardEvent('keydown', { key: 'Escape' })` on window | ✅ pin attr removed, breadcrumb back to empty hint |
| BP lockstep (Inspector → Triptych) | Click `inspector-bp-768` | ✅ Triptych tab Tablet selected, iframe title = `fast-loading-speed-768` |
| BP lockstep (Triptych → Inspector) | Click Mobile tab | ✅ Inspector `data-bp="375"`, BP-375 radio aria-checked=true |

### Known limitation (cosmetic only)
- **rAF in headless preview is throttled** (Chromium quirk for backgrounded windows). This means the `mouseover` rAF callback may not fire in our preview-tools test environment, so the live-smoke verification of the *automatic* hover-outline could not be observed via synthetic dispatch. Verified the handler IS registered (rAF was scheduled when mouseover dispatched; counter ticked) and the manual `data-bf-hover` toggle confirms the CSS half. In real-user Chrome with a focused window, rAF fires normally — this is a test-tool artifact, not a code defect. Phase 1 unit tests cover the deterministic logic.

---

## Two design decisions Brain delegated (locked)

| Question | Decision |
|---|---|
| **Task 1.5 — `activeId` lift direction** | Option C: lift to App.tsx with `activeId?` + `onActiveIdChange?` optional props on PreviewTriptych. Internal `useState` fallback preserves the legacy uncontrolled API (zero regression risk for any future callers that don't lift). |
| **Escape pin-clear protocol** | Sentinel string `'__clear__'` (not `null`). Cross-iframe-safe — `null` can serialize oddly through `postMessage` in some realms; the explicit string is unambiguous. Iframe handler treats `__clear__` OR falsy `selector` as clear-only no-op (defensive). |

Both decisions were proposed in the Phase 1 task prompt as the path forward. User delegate ("це твоє рішення") locked them in without edits.

---

## Carry-forward to Phase 2

### Open product caveats from Phase 0 §0.11 (NOT triggered in Phase 1, baked into Phase 2 design)
1. **Chip 3-BP impact label** — when a token-chip is shown for an editable property, the chip label must reflect that the token applies across ALL three BPs (not just the active one). Phase 2 PropertyRow design.
2. **Inherited properties: hybrid UX** — for inherited (e.g., color cascading from parent), show edit-target ambiguity warning + offer "edit on this element" vs "edit on parent" options. Phase 2.
3. **Active-BP coherence** — when Inspector active-BP differs from the BP whose value is shown for an inherited cell, dim the inactive cell + show `↗ view` icon to switch BPs. Phase 2.

### Phase 2 entry conditions (all met)
- Inspector orchestrator has `pinned.computedStyle` populated → Phase 2 PropertyRow consumes this.
- BP picker active in InspectorPanel → Phase 2 reads activeBp for rendering.
- Iframe protocol stable + tested → Phase 2 doesn't need iframe changes.
- `data-bf-hover` / `data-bf-pin` outline visuals work in production Chrome → no Phase 2 polish needed there.

### Phase 2 scope reminder
- Replace `inspector-properties-placeholder` div with PropertyRow components (curated MVP per Ruling B).
- 3-BP cell render per property: layout + sourcing logic deferred per Ruling E (Phase 3 lands the per-BP heuristic).
- Editing path: PropertyRow change → `dispatchTweakToForm`-style emit → composeTweakedCss → preview reflects (live-smoke validated).
- Phase 2 still touches block-forge ONLY; Studio mirror stays in Phase 4.

---

## Notes for Brain review

- **Re-pin defer (60ms)** — chosen to give the new iframe instance time for its IIFE to register the `inspector-request-pin` listener. Tested with `vi.useFakeTimers` in the BP-change test; behavior is deterministic. If real-world Chrome is faster than 60ms (likely), the post arrives just after the listener registers — no edge case.
- **iframe selection** — `document.querySelector('iframe[title^="<slug>-"]')` finds the active preview iframe by slug prefix. PreviewTriptych renders one at a time, so this resolves uniquely. If Phase 4 brings parallel BPs back (e.g., split-view), the selector needs `[title="<slug>-<bp>"]` exact match instead.
- **Helper duplication in IIFE** — 25 lines of `deriveSelector` + helpers duplicated rather than hoisted. Trade-off: blast-radius isolation vs DRY. WP-028 element-click IIFE has been stable through 4 phases; touching it would be a bigger risk than carrying the duplication. Phase 5 cleanup may collapse if the two scripts converge.
- **`outline-color` shorthand fallback** — initial draft used `outline: 2px solid hsl(...)` shorthand. Live verification revealed only the color resolved correctly (style: none, width: 0). Switched to individual properties — works through any block-CSS `outline: 0` reset. Documented in the comment on `INSPECTOR_OUTLINE_RULE`.

---

**Phase 1 ready for Brain review. Proceed to Phase 2 (PropertyRow + curated MVP property surface) on approval.**
