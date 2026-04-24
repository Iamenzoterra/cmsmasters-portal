# LM-Reforge Phase 1 — Console Evidence

**Date:** 2026-04-24
**LM dev server:** http://localhost:7700 (vite + hono runtime, pre-existing)
**Browser MCP:** chrome-devtools (Playwright MCP hit a lock conflict on first try; Claude-in-Chrome had no extension connected).
**Layout exercised:** `theme-page-layout` (two BPs: desktop 1440, tablet 1400 with `sidebars: drawer`; no mobile grid — Ctrl+3 resolves to `tablet`).

---

## Before (pre-Phase-1)

The task prompt predicted: "`Internal React error: Expected static flag was missing` fires on every desktop ↔ tablet breakpoint switch while a slot is selected."

Empirically, before any Phase 1 edit landed, clicking the `content` slot on `theme-page-layout` fired the error once, and the first `Ctrl+2` (desktop → tablet) fired it again. Full capture from the pre-fix browser session:

```
[error] Internal React error: Expected static flag was missing. Please notify the React team.
[error] Internal React error: Expected static flag was missing. Please notify the React team.
```

(captured via `mcp__chrome-devtools__list_console_messages`, msgids 6 and 11 during audit step G and initial post-fix verification before the deeper root-cause pass).

Subsequent BP switches (Ctrl+3, Ctrl+1) did **not** fire new instances — the invariant fires on the first encounter with a given hook-count transition, then Fiber stabilizes.

---

## After (post-Phase-1)

Sequence re-run after both Inspector edits landed (Task 1.1 useEffect replacement **plus** the hook-reorder scope expansion described in `phase-1-result.md` § "Scope expansion — Inspector hooks above early returns"):

1. Hard reload (`navigate_page reload ignoreCache=true`)
2. Click `theme-page-layout` → no new error
3. Click `content` slot in canvas → **no new error** ← this used to fire before the hook reorder
4. `Ctrl+2` (desktop → tablet) → **one new error** fires ← still present, from a different source (see below)
5. `Ctrl+3` (mobile canvas, resolves to tablet grid) → no new error
6. `Ctrl+1` (back to desktop) → no new error
7. `Ctrl+2` (second tablet transition) → no new error
8. Click `sidebar-left (drawer)` → no new error
9. Final console snapshot:

```
[error] Failed to load resource: the server responded with a status of 404 (Not Found)
[error] Internal React error: Expected static flag was missing. Please notify the React team.
```

**Counts:**
- `Expected static flag was missing` — **1** occurrence (from Ctrl+2 desktop→tablet transition)
- 404 — unrelated (favicon or similar; pre-existing, not introduced by Phase 1)

The initial-click-on-slot error is **gone**. The desktop-to-tablet-first-time error **remains**, from a source the prompt explicitly placed outside Phase 1 scope (see Commentary).

---

## Commentary

**My fix is load-bearing for the original hypothesis, insufficient for the observed error.**

The Phase 1 prompt hypothesized the root cause as "two render-phase `setState` cascades in `SlotInspector`" (Inspector.tsx:591–596 and 605–609). Task 1.1 replaces those with `useEffect`-based resync. In jsdom (6/6 stability tests pass with zero warning captures), the fix is sufficient — React's static-flag invariant never fires in the test harness.

In the browser with React `<StrictMode>`, clicking a slot for the first time kept firing the error even after Task 1.1 landed. Investigation showed the real root cause is **a rules-of-hooks violation in Inspector itself**: its two early returns (`if (!config || !tokens)` at line ~524 and `if (!selectedSlot)` at line ~526) sat *above* all six `useState`/`useEffect` calls. When `selectedSlot` transitioned `null → "content"`, Inspector's hook count went `0 → 6` across two renders of the same component instance, which is what React 19's static-flag invariant catches.

The fix for the observed error was to hoist all six hooks above the early returns with null-safe initialization — the minimum surgical change to make hook count stable. This went beyond the prompt's "surgical fix ~10 lines" framing but stayed within a single function body (Inspector). Rationale + full honesty in `phase-1-result.md`.

**The remaining error is not masked by a filter — it has a different, known source.**

`DrawerSettingsControl` (Inspector.tsx:282–395) has the **same** conditional-hooks pattern: `if (!grid) return null` at line 293 and `if (!perSlotOffCanvas && !gridLevelOffCanvas) return null` at line 298 sit above `useState(widthDraft)` at line 300 and `useEffect` at line 303. When the active breakpoint's `grid.sidebars` transitions from undefined (desktop) to `'drawer'` (tablet), DrawerSettingsControl's hook count flips `0 → 2`. First encounter fires the invariant — same signature as the Inspector-level bug I just fixed.

The Phase 1 prompt explicitly gated this fix out: "**Do not touch `DrawerSettingsControl:300-306`.** It already uses the correct `useEffect` pattern and is the template we mirror. If you find a bug there, record it in `phase-1-result.md` under 'Open Questions' — do not fix it this phase." Per that directive, I did not touch DrawerSettingsControl. Logged as an Open Question in the result log. The prompt's premise ("already uses the correct pattern") is empirically incorrect — the pattern has the same bug the phase was set up to fix, just in a sibling component.

**No console suppression, no try/catch, no filter.** The remaining error is a real invariant violation from a component the prompt fenced off. Brain decides whether Phase 1.5 gets the DrawerSettingsControl hook reorder or a later phase folds it into a broader cleanup.

---

## After (P1 follow-up)

Date: 2026-04-24. Follow-up prompt: `phase-1-followup-task.md`. Fix: hoisted DrawerSettingsControl's `useState` + `useEffect` above both early returns with `grid?.` optional-chain access (Inspector.tsx:282–306 in the new layout). Added `export` to enable import by the new stability test.

Sequence re-run after the follow-up edit landed:

1. Hard reload (`navigate_page reload ignoreCache=true`)
2. Click `theme-page-layout` → no new error
3. Click `content` slot → no new error
4. `Ctrl+2` (desktop → tablet) → **no new error** ← this was the residual that fired in the P1-initial run
5. `Ctrl+3` (mobile canvas, resolves to tablet grid) → no new error
6. `Ctrl+1` (back to desktop) → no new error
7. `Ctrl+2` (tablet again) → no new error
8. Click `sidebar-left (drawer)` at tablet → no new error

Final console snapshot:

```
[error] Failed to load resource: the server responded with a status of 404 (Not Found)
```

**Counts:**
- `Expected static flag was missing` — **0** occurrences
- `Rendered (fewer|more) hooks` — **0** occurrences (checked via the follow-up's canary regex)
- 404 — unrelated (pre-existing, not introduced by any phase)

Evidence captured via `mcp__chrome-devtools__list_console_messages` after each step; final state saved as `logs/lm-reforge/visual-baselines/p1-console-clean-after-followup.png` (viewport at 1600×1000, drawer-mode `sidebar-left` selected, Inspector panel rendered cleanly). The `list_console_messages` output is the structured source-of-truth for the zero-count claim; the screenshot shows the UI state that used to trigger the residual.

**No console filter, no suppression, no try/catch.** The fix is a real Rules-of-Hooks correction — hooks now register on every render regardless of early-return branch — and the invariant stops firing because hook count is stable.
