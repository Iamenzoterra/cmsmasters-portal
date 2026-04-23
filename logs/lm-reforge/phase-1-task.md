# LM-Reforge Phase 1 — Inspector Stability Fix

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` (LM Trust Reforge)
> Phase: 1 of 7
> Priority: P0 (unblocks every later visual verification)
> Estimated: 0.5d (~4h)
> Type: Frontend (React refactor) + Config (Playwright screenshot pass)
> Previous: Phase 0 ✅ (test runner + jest-dom + 3 wiring-proof smoke tests landed in `306af86a` + `7b3a736e` + `1862a180`)
> Next: Phase 2 (Breakpoint Truth Surface — BreakpointBar rewrite; needs stable Inspector rerenders to verify)
> Affected surface: `tools/layout-maker/src/components/Inspector.tsx` (standalone Vite app; not a monorepo domain)

---

## Context

`tools/layout-maker` throws a reproducible `Internal React error: Expected
static flag was missing` on every desktop ↔ tablet ↔ mobile breakpoint
switch while a slot is selected. Confirmed 23 Apr 2026 in the audit
(`codex-review/03-ui-spec.md` Epic 6 / `11-playwright-visual-pass.md`).

The bug is **two render-phase `setState` blocks** in `SlotInspector`
(`Inspector.tsx:591-596` and `:605-609`). They implement React's documented
"store previous prop in state; call `setState` during render when it
changes" pattern — which is allowed by React but fragile under React 19
reconciliation when multiple such blocks cascade in one render, and
particularly when the parent also re-renders due to `activeBreakpoint`
change. The cascade trips React's static-flag invariant.

```
CURRENT (Inspector.tsx:588–609):                                    ✅ compiles, ❌ throws at runtime
  const [widthDraft, setWidthDraft] = useState(currentPx)
  const [prevColumnWidth, setPrevColumnWidth] = useState(columnWidth)
  if (columnWidth !== prevColumnWidth) {          // render phase
    setPrevColumnWidth(columnWidth)                // setState during render
    setWidthDraft(newPx)                           // setState during render
  }
  // same pattern for maxWidthDraft + prevMaxWidth

PRECEDENT (Inspector.tsx:300–306, DrawerSettingsControl):           ✅ correct pattern already in this file
  const [widthDraft, setWidthDraft] = useState((grid['drawer-width'] ?? '').replace(/px$/, ''))
  useEffect(() => {
    setWidthDraft((grid['drawer-width'] ?? '').replace(/px$/, ''))
  }, [gridKey, grid['drawer-width']])

TARGET:                                                             ✅ cascade removed, effect-based resync
  // Replace both `if-during-render` blocks with useEffect.
  // Draft discards on slot change, BP change, and external (SSE) reload.
```

**Every later phase needs Inspector rerenders to be stable** to verify
its own visual work (BP bar, validation pill, scope chips, badges).
Shipping P2+ on a flaky Inspector means every screenshot pass is
contaminated by this error. P1 first.

---

## Domain Context

LM is outside the monorepo domain manifest. No `npm run arch-test` here.

**Invariants preserved by this phase:**

- **Parity-with-Portal.** This phase does NOT touch the config→CSS
  pipeline, `html-generator`, `css-generator`, or Portal rendering. It
  is internal UI state management only. No PARITY-LOG entry expected.
  If one becomes necessary, scope has crept — stop and surface to Brain.
- **"Draft before commit" UX preserved.** Operators still type freely
  into width / max-width; blur or Enter still flushes the value to
  config. Draft discarding happens on *context* change (slot / BP /
  external reload), never on keystrokes.
- **Render-phase `if (prev !== next) setPrev(next)` stays legal in React** —
  we are not making a blanket rule; we are surgically replacing two
  specific cascading occurrences with the `useEffect` pattern that the
  same file uses successfully elsewhere (`DrawerSettingsControl:303-306`).

**Draft-handling rule (workplan §Phase 1, locked):**

| Event | What happens to unsaved draft |
|-------|-------------------------------|
| Slot change | Draft discarded; input resyncs to new slot's committed value |
| BP change (same slot) | Draft discarded; input resyncs to the value visible at the new BP (base or override) |
| External SSE reload | Draft discarded; input reflects the freshly-loaded committed value |
| Keystroke | Draft updates, no flush |
| Blur / Enter | Draft flushes to config |

No merge UX. No "keep your changes?" prompt. No per-slot draft
persistence — that is over-engineering for a render-phase bug fix.

---

## PHASE 0: Audit (do FIRST — CRITICAL, before any write)

Hands runs these reads before touching any file. Outcomes land in
`logs/lm-reforge/phase-1-result.md` verbatim.

```bash
# A. Baseline — test runner green, smoke tests pass
npm --prefix tools/layout-maker run test
#    expect: 3 passed (setup, globals, setup-and-tsx)

# B. Baseline — typecheck clean
npm --prefix tools/layout-maker run typecheck
#    expect: exit 0

# C. Baseline — build clean
npm --prefix tools/layout-maker run build
#    expect: exit 0, 55 modules, ~310 kB JS

# D. Read the bug in-situ — confirm line numbers still match before editing
grep -nE "setPrevColumnWidth|setPrevMaxWidth|prevColumnWidth|prevMaxWidth" \
  tools/layout-maker/src/components/Inspector.tsx
#    expect: 6 hits around lines 591-609 (both render-phase blocks);
#    if line numbers differ significantly, file was edited since this
#    prompt was written — use Grep/Read to locate, don't hardcode lines.

# E. Read the precedent pattern (DrawerSettingsControl, same file)
sed -n '298,310p' tools/layout-maker/src/components/Inspector.tsx
#    expect: `const [widthDraft, setWidthDraft] = useState(...)` followed
#    by a single `useEffect(() => { setWidthDraft(...) }, [gridKey, ...])`.
#    This is the template to replicate.

# F. Confirm no existing Inspector tests (otherwise we merge, not create)
ls tools/layout-maker/src/components/ | grep -i inspector
#    expect: only Inspector.tsx — no .test.tsx yet

# G. Capture current console-error behavior for "before" evidence
#    Manual step — record in phase-1-result.md:
#    - run `npm --prefix tools/layout-maker run dev`
#    - open http://localhost:7700
#    - open `theme-page-layout`
#    - click content slot
#    - Ctrl+2 (tablet) → capture console via browser_console_messages
#    - expect: "Internal React error: Expected static flag was missing" fires
#    - save: logs/lm-reforge/phase-1-console-before.md
```

**Document findings (A–G) in `phase-1-result.md` before writing code.**

**IMPORTANT (carry-over from P0 binding hook):**
Any test this phase adds that imports a `*.css?raw` string MUST assert the
string is non-empty (at least `expect(cssRaw.length).toBeGreaterThan(0)`).
This enforces the `css: true` vitest config from P0 — without the assertion,
a broken config silently tests against empty strings. If Phase 1's tests add
zero `?raw` imports, the hook carries forward to P2 unchanged.

---

## Task 1.1: Replace render-phase setState cascade in SlotInspector

### What to Build

Replace the two `if (prev !== next) { setPrev(next); setDraft(...) }` blocks
(Inspector.tsx lines 591-596 and 605-609) with `useEffect`-based resync that
depends on the *actual* drivers of change: `selectedSlot`, `gridKey`, and
the committed values themselves.

```tsx
// REMOVE (around lines 586-609 — verify with Read before editing):
const currentPx = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
const [widthDraft, setWidthDraft] = useState(currentPx)

const [prevColumnWidth, setPrevColumnWidth] = useState(columnWidth)
if (columnWidth !== prevColumnWidth) {
  setPrevColumnWidth(columnWidth)
  const newPx = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
  setWidthDraft(newPx)
}

const innerMaxWidth = slotConfig['max-width']
const hasInnerMaxWidth = !!innerMaxWidth
const innerMaxWidthPx = hasInnerMaxWidth ? parseInt(innerMaxWidth!, 10).toString() : ''
const [maxWidthDraft, setMaxWidthDraft] = useState(innerMaxWidthPx)

const [prevMaxWidth, setPrevMaxWidth] = useState(innerMaxWidth)
if (innerMaxWidth !== prevMaxWidth) {
  setPrevMaxWidth(innerMaxWidth)
  setMaxWidthDraft(innerMaxWidth ? parseInt(innerMaxWidth, 10).toString() : '')
}

// REPLACE WITH:
const currentPx = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
const [widthDraft, setWidthDraft] = useState(currentPx)

// Resync draft when the committed value or context changes.
// Drivers: selectedSlot (slot switch), gridKey (BP switch), columnWidth
// (external SSE reload). Per LM-reforge Phase 1 draft-handling rule:
// dirty draft is discarded on any of these; there is no merge UX.
useEffect(() => {
  const px = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
  setWidthDraft(px)
}, [selectedSlot, gridKey, columnWidth])

const innerMaxWidth = slotConfig['max-width']
const hasInnerMaxWidth = !!innerMaxWidth
const innerMaxWidthPx = hasInnerMaxWidth ? parseInt(innerMaxWidth!, 10).toString() : ''
const [maxWidthDraft, setMaxWidthDraft] = useState(innerMaxWidthPx)

useEffect(() => {
  const px = innerMaxWidth ? parseInt(innerMaxWidth, 10).toString() : ''
  setMaxWidthDraft(px)
}, [selectedSlot, gridKey, innerMaxWidth])
```

### Integration

- Keep `SlotInspector`'s function signature unchanged.
- Keep `ColumnWidthControl` props (`widthDraft`, `setWidthDraft`)
  unchanged — the child control receives the same draft state, only the
  resync mechanism changes.
- Keep blur / Enter flush paths at lines 458-469 untouched.
- Keep the Reset button logic at line 1198 (`resetField('max-width'); setMaxWidthDraft('')`) untouched — explicit user-initiated clear is orthogonal to the resync path.

### Domain Rules

- **Do not touch `DrawerSettingsControl:300-306`.** It already uses the
  correct `useEffect` pattern and is the template we mirror. If you find
  a bug there, record it in `phase-1-result.md` under "Open Questions" —
  do not fix it this phase.
- **Do not add new `useState` for "previous" bookkeeping.** The whole
  point is removing the shadow-state cascade, not relocating it.
- **Do not introduce `useRef` for the draft value.** Draft must remain a
  `useState` so that `onChange` keystrokes re-render the input; a ref
  would break the controlled-input contract.
- **`selectedSlot` is a required dep** even though the parent already
  remounts `SlotInspector` on slot change (`ColumnWidthControl` does not
  remount; its draft state in parent scope must still resync).

---

## Task 1.2: Inspector.stability.test.tsx — 3 resync paths

### What to Build

New file: `tools/layout-maker/src/components/Inspector.stability.test.tsx`.

Three tests asserting the exact behavior the draft-handling rule mandates.
The tests exercise `SlotInspector` through its public component surface
(render with props, change props, assert on DOM + no warnings).

```tsx
/// <reference types="vitest/globals" />
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Inspector } from './Inspector'
import type { LayoutConfig } from '../lib/types'

// Minimal fixture — one leaf slot with numeric width + max-width. Expand as
// needed; keep it the smallest config that can render SlotInspector.
const fixture: LayoutConfig = {
  /* fill in shape that matches LayoutConfig — mirror an existing fixture
     from tools/layout-maker/layouts/ if one works; otherwise hand-write
     the minimum. Document the choice in phase-1-result.md. */
} as LayoutConfig

// Helper: capture render-phase warnings that React logs to console.error
// when the static-flag invariant is violated.
function collectConsoleErrors() {
  const errors: string[] = []
  const original = console.error
  console.error = (msg: unknown, ...rest: unknown[]) => {
    errors.push(String(msg))
    original(msg, ...rest)
  }
  return {
    errors,
    restore: () => { console.error = original },
  }
}

describe('Inspector stability — draft resync on context change', () => {
  let spy: ReturnType<typeof collectConsoleErrors>
  beforeEach(() => { spy = collectConsoleErrors() })
  afterEach(() => { spy.restore(); cleanup() })

  it('discards dirty width draft on slot change and resyncs to new slot value', () => {
    const { rerender } = render(
      <Inspector
        selectedSlot="content"
        config={fixture}
        activeBreakpoint="desktop"
        gridKey="desktop"
        /* fill remaining required props with jest mocks + safe defaults */
      />
    )
    // 1. Find width input, fire change to dirty the draft
    // 2. rerender() with selectedSlot="sidebar-left"
    // 3. Assert input.value === <sidebar-left's committed width>
    // 4. Assert no render-phase warnings in spy.errors
    expect(spy.errors.filter(e => /Expected static flag was missing/.test(e))).toHaveLength(0)
  })

  it('discards dirty width draft on breakpoint change and resyncs to BP-resolved value', () => {
    // Same pattern: start desktop → type into width → rerender activeBreakpoint="tablet"
    // + gridKey="tablet" → assert input reflects tablet-override value (or base if none)
    expect(spy.errors.filter(e => /Expected static flag was missing/.test(e))).toHaveLength(0)
  })

  it('discards dirty width draft on external reload (columnWidth prop change)', () => {
    // Start with columnWidth="720px" → type "999" → rerender with columnWidth="800px"
    // (simulating SSE reload) → assert input.value === "800"
    expect(spy.errors.filter(e => /Expected static flag was missing/.test(e))).toHaveLength(0)
  })
})
```

### Integration

- File sits next to `Inspector.tsx` (workplan §4 convention).
- Vitest `include: ['src/**/*.test.{ts,tsx}']` from P0 picks it up
  automatically. No config change.
- `render()` from `@testing-library/react` is already installed (P0).

### Domain Rules

- **Assertion 1 per test: no render-phase warning.** The
  `Expected static flag was missing` string is the canary. Checking for
  its absence is the actual stability contract.
- **Assertion 2 per test: input value matches the new committed value.**
  This is the draft-handling rule expressed as a DOM assertion.
- **Do NOT snapshot the whole Inspector tree.** That snapshot would
  change every time P2–P7 adds a field, producing false failures. Scope
  assertions to the input value + the warning-absent invariant.
- **Fixture shape — verify against `LayoutConfig` before hand-writing.**
  Read `src/lib/types.ts` to see the current `LayoutConfig` shape;
  mirror it precisely. If a pre-existing `tools/layout-maker/layouts/*.yaml`
  can be loaded in a test (via yaml parse), that's preferable to an
  inline hand-rolled config — fewer fields to keep in sync.

---

## Task 1.3: Playwright visual + console verification pass

### What to Build

Live verification that the runtime error is gone across desktop/tablet/
mobile. LM is already running at `localhost:7700` after `npm run dev`.

**Required screenshots (workplan §1 rule 5):**

| File | Viewport | Scenario |
|------|----------|----------|
| `logs/lm-reforge/visual-baselines/p1-desktop-1600.png` | 1600×1000 | `theme-page-layout`, slot `content` selected, no errors |
| `logs/lm-reforge/visual-baselines/p1-tablet-1024.png` | 1024×1000 | after Ctrl+2 switch from desktop, same slot selected |
| `logs/lm-reforge/visual-baselines/p1-mobile-420.png` | 420×800 | after Ctrl+3, same slot |
| `logs/lm-reforge/visual-baselines/p1-drawer-inspection.png` | 1024×1000 | tablet mode, click a drawer-mode sidebar, drawer Inspector panel visible |

**Required console-clean evidence:**

Save `logs/lm-reforge/phase-1-console-clean.md` with three sections:

1. **Before** — the single `Expected static flag was missing` error captured
   in audit step G, copy-pasted verbatim.
2. **After** — output of `browser_console_messages` after the full switch
   sequence (desktop → tablet → mobile → desktop) with a slot selected.
   Must show zero occurrences of the error string.
3. **Commentary** — one paragraph confirming the fix is load-bearing and
   not masked by a different console filter.

### Integration

- Use Claude-in-Chrome MCP (already in the session's available tools) or
  Playwright MCP. Choose one; mention which in the result log.
- The `allow-same-origin` iframe contract from `tools/layout-maker/CLAUDE.md`
  § Architecture remains untouched — iframes render unchanged; only
  React parent-tree stability changes.

### Domain Rules

- **Keyboard shortcuts (from `CLAUDE.md`):** Ctrl+1 / Ctrl+2 / Ctrl+3
  switch to desktop / tablet / mobile. Ctrl+[ / Ctrl+] cycle. Use
  these to exercise the full switch matrix.
- **Drawer inspection stability** = click a sidebar with `visibility:
  drawer` at tablet, confirm the drawer-specific Inspector panel renders
  without console errors. This covers `DrawerSettingsControl` implicitly.
- **Don't add new screenshots beyond the four listed above.** Later
  phases each produce their own; keep P1 evidence surface minimal.

---

## Files to Modify

- `tools/layout-maker/src/components/Inspector.tsx` — replace two
  render-phase setState blocks (lines ~588-609) with two `useEffect`
  hooks. Single surgical diff; no other edits to this file.
- `tools/layout-maker/src/components/Inspector.stability.test.tsx` —
  **new file**, 3 tests, ~150 lines.
- `logs/lm-reforge/phase-1-task.md` — this file (pre-phase deliverable,
  committed with the phase).
- `logs/lm-reforge/phase-1-result.md` — **new file**, execution log.
- `logs/lm-reforge/phase-1-console-clean.md` — **new file**, console evidence.
- `logs/lm-reforge/visual-baselines/p1-*.png` — **4 new files**, screenshots.

Not touched this phase: every other file under `src/`, `runtime/`,
`PARITY-LOG.md`, `CLAUDE.md`, root `package.json`, root
`package-lock.json`, `tsconfig.json`, `vitest.config.ts`.

---

## Acceptance Criteria

- [ ] `npm --prefix tools/layout-maker run test` exits 0; test count is
      **6 passed** (3 P0 smoke + 3 new stability tests).
- [ ] `npm --prefix tools/layout-maker run typecheck` exits 0.
- [ ] `npm --prefix tools/layout-maker run build` exits 0 (bundle size
      within ±2 kB of P0 baseline 310.62 kB JS — the diff is minimal
      code, no bundle-size jump expected).
- [ ] Switching desktop ↔ tablet ↔ mobile on `theme-page-layout` with a
      slot selected produces **zero** occurrences of
      `Expected static flag was missing` in browser console
      (captured via `browser_console_messages` / equivalent).
- [ ] Drawer inspection (click a drawer-mode sidebar at tablet) renders
      the drawer Inspector panel without console errors.
- [ ] Four screenshots present under `logs/lm-reforge/visual-baselines/`.
- [ ] Contract test asserts all three resync paths (slot / BP / external).
- [ ] Grep-gate deltas recorded in `phase-1-result.md` vs P0 baseline
      (75 / 3 / 87 from `phase-0-result.md`). Expected: delta = 0 on all
      three (Inspector.tsx change is JS-only, no CSS / font / color edits).
      Non-zero positive delta requires a one-line justification in the
      result log.
- [ ] **Binding hook (carry-over from P0):** If any test added this phase
      imports `*.css?raw`, the test MUST include
      `expect(cssRaw.length).toBeGreaterThan(0)`. If no `?raw` import —
      hook carries forward to P2; note this in `phase-1-result.md`.
- [ ] `git status` shows only the 7 expected paths (1 source edit + 1 new
      test + 5 log/evidence files). More = scope creep; stop and surface.
- [ ] No PARITY-LOG entry (phase does not touch config → CSS pipeline).

---

## MANDATORY: Verification

```bash
echo "=== LM-Reforge Phase 1 Verification ==="

# 1. All tests green (3 P0 smoke + 3 new stability)
npm --prefix tools/layout-maker run test
echo "(expect: 6 passed, 0 failed)"

# 2. Typecheck clean
npm --prefix tools/layout-maker run typecheck
echo "(expect: exit 0)"

# 3. Build clean
npm --prefix tools/layout-maker run build
echo "(expect: exit 0, ~310.62 kB JS ±2 kB)"

# 4. Grep-gate re-run (delta reporting vs P0 baseline 75/3/87)
#    Use the three commands from workplan §1 rule 6, identical to audit step F
#    in phase-0-task.md. Record output in phase-1-result.md.

# 5. Playwright visual + console pass
#    - Open http://localhost:7700 (after `npm run dev` in LM)
#    - Load theme-page-layout
#    - Select slot "content"
#    - Ctrl+1 → Ctrl+2 → Ctrl+3 → Ctrl+1 (full rotation)
#    - Capture browser_console_messages — expect zero
#      "Expected static flag was missing" occurrences
#    - Save 4 screenshots under logs/lm-reforge/visual-baselines/

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

Create `logs/lm-reforge/phase-1-result.md` with sections:

- Status frame (match P0 template — honest about any deviations)
- What Was Implemented (2–5 sentences)
- Key Decisions table
- Files Changed table (expected 7 entries)
- Grep-gate delta table (vs P0 baseline 75/3/87)
- Playwright console-clean evidence — reference
  `phase-1-console-clean.md`
- Issues & Workarounds
- Open Questions
- Verification Results table
- Git section with commit sha

**Honest self-review section is mandatory if any deviation from this prompt
occurred.** P0 established the pattern; P1 inherits the bar. Do not soften
misses into "notes" — if a scope-gate fired, name it.

---

## Git

```bash
git add \
  tools/layout-maker/src/components/Inspector.tsx \
  tools/layout-maker/src/components/Inspector.stability.test.tsx \
  logs/lm-reforge/phase-1-task.md \
  logs/lm-reforge/phase-1-result.md \
  logs/lm-reforge/phase-1-console-clean.md \
  logs/lm-reforge/visual-baselines/

git commit -m "fix(lm): phase 1 — Inspector stability via useEffect resync [LM-reforge phase 1]"
```

Explicit pathspec on `git commit -- <paths>` (P0 lesson learned —
filtered `git status` as scope gate failed once; use pathspec directly).

---

## IMPORTANT Notes for CC

- **Read `tools/layout-maker/CLAUDE.md` first** — specifically "Parity
  with Portal" (we don't touch it, but know the invariant) and "Before
  ANY CSS Change" (we don't touch CSS either, but the render-phase
  invariant mindset applies).
- **Read `logs/lm-reforge/phase-0-result.md` "Honest self-review"** —
  specifically the "broken-intermediate commit" warning on `306af86a`
  and the "Escalation gates that fired — named honestly" section. P1
  inherits the same standard: scope-gate trips get named in the result
  log, not softened.
- **This is a surgical fix.** The `useEffect` replacement is ~10 lines
  net diff. If you find yourself rewriting more than one function body
  in `Inspector.tsx`, stop — scope has crept.
- **Do NOT touch `DrawerSettingsControl` (lines ~282-395).** It already
  uses the correct pattern.
- **Do NOT add a `key` prop trick as an alternative.** Keying
  `ColumnWidthControl` on `${selectedSlot}-${gridKey}` would also fix
  the symptom by forcing remount, but it's a heavier hammer that changes
  remount timing for the entire control subtree. `useEffect` resync is
  the workplan-specified fix.
- **Test must run in jsdom** — React 19's static-flag warning fires in
  jsdom the same as in browsers; no need for Playwright to verify the
  warning-absent contract. Playwright only covers the visual + browser-
  console evidence pass (Task 1.3).
- **If the React error still fires after the fix**, do NOT add a
  suppression (`console.error = () => {}`) or a try/catch. Root-cause
  further and surface to Brain.
- **Check P0 binding hook.** If your new test imports anything `?raw`,
  the non-empty assertion is mandatory.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 1 промпт готовий: `logs/lm-reforge/phase-1-task.md`.

## Структура

**3 tasks + 1 audit, ~4h budget:**

| # | Task | Scope |
|---|------|-------|
| 1.audit | Pre-write reads A–G; confirm line numbers + capture "before" console evidence | no code writes |
| 1.1 | `Inspector.tsx` surgical edit | replace two render-phase `if(prev!==next){setPrev;setDraft}` blocks (lines ~588–609) with two `useEffect` hooks keyed on `[selectedSlot, gridKey, columnWidth]` / `[selectedSlot, gridKey, innerMaxWidth]` |
| 1.2 | `Inspector.stability.test.tsx` create | 3 RTL tests: slot-change / BP-change / SSE-reload resync paths; assert `.errors` has zero `"Expected static flag was missing"` + input value matches committed post-change |
| 1.3 | Playwright visual + console pass | 4 screenshots (desktop 1600 / tablet 1024 / mobile 420 / drawer-inspection) + `phase-1-console-clean.md` (before/after/commentary) |
| Gates | Verification | 6 tests green (3 P0 + 3 new); typecheck clean; build ±2 kB of 310.62 kB; grep-delta = 0; 7-file git scope |

## 6 Brain rulings locked

1. **Fix pattern = `useEffect`, not `key` remount.** `key` would work but changes remount timing for the whole `ColumnWidthControl` subtree; `useEffect` is surgical and matches the precedent `DrawerSettingsControl:303-306` already uses in-file.
2. **Deps array: `[selectedSlot, gridKey, committedValue]`.** `selectedSlot` stays in deps even though parent may remount — `ColumnWidthControl` does not remount, and its draft state lives in `SlotInspector` scope. All three drivers must fire the resync.
3. **Draft-handling rule: discard on context change.** No per-slot persistence, no merge UX. Workplan §Phase 1 locked this; no reopening.
4. **`DrawerSettingsControl` untouched.** It's the template we mirror. Fixing unrelated bugs there is out of scope; log them as Open Questions.
5. **Test scope: three resync paths + warning-absent canary.** No whole-tree snapshots (fragile under P2–P7 additions); assertions target input value + `console.error` capture for `Expected static flag was missing`.
6. **P0 binding hook inherited.** Any `*.css?raw` import in new tests triggers the `expect(cssRaw.length).toBeGreaterThan(0)` requirement. If no `?raw` import in P1 tests, hook carries to P2 unchanged.

## Hard gates (inherited from P0 + P1 additions)

- **Zero touch:** `DrawerSettingsControl` body, `runtime/**`, `src/App.tsx`, `src/styles/**`, `PARITY-LOG.md`, `CLAUDE.md`, root `package.json`, root `package-lock.json`, `vitest.config.ts`, `tsconfig.json`. LM `package.json` also zero — no new deps needed.
- **Zero new `useState` for "previous" bookkeeping.** The cascade removal is the whole point.
- **Zero `useRef` for draft value.** Breaks controlled-input contract.
- **Zero `console.error` suppression** or `try/catch` around the warning. Root-cause only.
- **Zero whole-tree snapshot tests.** Targeted assertions only.
- **Zero new screenshots beyond the 4 listed.** Later phases produce their own.
- **Zero PARITY-LOG entries expected.** Phase does not touch config→CSS. If one appears, surface.
- **≤ 7 files in `git status`.** Same category as P0's 6-file gate. More = scope creep; stop.
- **`git commit -- <pathspec>` explicitly.** P0 lesson learned — filtered `git status` as scope gate fails.

## Escalation triggers

- **Line numbers in `Inspector.tsx` differ from ~588–609 at read-time** → file was edited since prompt was written. Use Grep to find the two `if (prev !== next)` blocks; don't hardcode, don't edit blind.
- **React error still fires after the `useEffect` replacement** → not a render-phase setState — different root cause. STOP, capture console output, surface to Brain.
- **Build bundle size diff > ±2 kB** → change rippled beyond the intended surface. Investigate before committing.
- **New test's warning-capture fires in the "after" run** → the fix doesn't hold. Do not merge with a suppressed spy; surface.
- **`LayoutConfig` hand-written fixture drifts from `src/lib/types.ts`** → load from `tools/layout-maker/layouts/*.yaml` instead, or mirror an existing test fixture. Hand-rolled is last resort.
- **More than 7 files in `git status` at commit time** → scope creep. Stop, diagnose, re-scope.
- **Drawer Inspector panel throws a different error class after fix** → `DrawerSettingsControl` precedent may be subtly different. Log as Open Question; do not fix.

## Arch-test target

**N/A** — LM outside `src/__arch__/domain-manifest.ts`. P1 analog: 6 tests green (3 P0 + 3 new) + typecheck + build + Playwright console-clean all clean.

## Git state

- `logs/lm-reforge/phase-1-task.md` — new untracked (this file)
- Nothing else staged, nothing committed yet
- `7b3a736e` + `5fb8bcc7` + `1862a180` on `main` from P0 close

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найімовірніше — ruling 1 якщо `key` remount preferred, або ruling 2 якщо deps array має інші входи)
3. АБО self-commit if workflow permits

Чекаю.
