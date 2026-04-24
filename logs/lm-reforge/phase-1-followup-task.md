# LM-Reforge Phase 1 Follow-up — DrawerSettingsControl Rules-of-Hooks Fix

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` (LM Trust Reforge)
> Phase: 1 follow-up (layers on initial P1 commit `23fcc685`)
> Priority: P0 (blocks P2 screenshot pass — residual console error contaminates every later phase's visual evidence)
> Estimated: ≤ 30 min
> Type: Frontend (React surgical) + single contract test + Playwright re-verify
> Previous: Phase 1 initial ⚠️ (AC #4 + #5 ❌ — residual `Expected static flag was missing` from DrawerSettingsControl) — commits `23fcc685` + `8255a588`
> Next: Phase 2 (Breakpoint Truth Surface — needs clean console)
> Affected surface: `tools/layout-maker/src/components/Inspector.tsx` — **`DrawerSettingsControl` function only** (lines ~282–330)

---

## Why this is a follow-up (not a new phase, not an amend)

Precedent: Phase 0 shipped as `306af86a` then layered a follow-up `7b3a736e`
on top. History preserves the honest path; no rebase, no amend. Same
pattern here.

**Brain's Phase 1 prompt was wrong about one hard gate.** Gate #4 said
"Do NOT touch `DrawerSettingsControl` — it already uses the correct
`useEffect` pattern." That ruling came from a partial read of lines
300–306, which *do* show a correct `useState` + `useEffect` pair in
isolation. Brain did not read lines 282–299, where **two conditional
early returns** (lines 293 and 298) sit ABOVE the hooks — making the
hooks conditional. That is a Rules-of-Hooks violation, a different
class of bug from the one P1 fixed in `SlotInspector`, and it is the
residual source of the `Expected static flag was missing` warning that
Phase 1 AC #4 + #5 caught.

The gate shielded the actual bug from inspection. Hands honored the
gate, which is correct behavior. Brain accepts accountability for the
wrong gate (documented in the updated `phase-1-result.md` self-review).
This follow-up removes the gate and applies the surgical fix.

---

## Context

Current state of `DrawerSettingsControl` (Inspector.tsx:282–330):

```tsx
function DrawerSettingsControl({ config, activeBreakpoint, gridKey, onUpdateGridProp }) {
  const grid = config.grid[gridKey]
  if (!grid) return null                                           // ← early return 1

  const isOffCanvas = (v) => v === 'drawer' || v === 'push'
  const perSlotOffCanvas = Object.values(grid.slots ?? {}).some((s) => isOffCanvas(s.visibility))
  const gridLevelOffCanvas = isOffCanvas(grid.sidebars)
  if (!perSlotOffCanvas && !gridLevelOffCanvas) return null        // ← early return 2

  const [widthDraft, setWidthDraft] = useState(...)                // ← hooks AFTER conditions
  useEffect(() => { ... }, [gridKey, grid['drawer-width']])
  // ... rest of body
}
```

**What breaks:** On desktop, a layout may have no off-canvas sidebars →
both early returns fire → zero hooks called. On tablet (same layout),
a sidebar switches to drawer mode → early returns pass → two hooks
called. React sees **different hook counts between renders of the same
component instance**. React 19's reconciler logs
`Internal React error: Expected static flag was missing`.

```
CURRENT:  2 early returns BEFORE 2 hooks  →  conditional hooks  →  ❌ React 19 error on BP switch
TARGET:   2 hooks BEFORE 2 early returns  →  stable hook order  →  ✅ error gone; JSX gating preserved
```

Fix is mechanical: hoist the hooks. Null-safe the initializer and the
effect body because `grid` may be undefined at hook-call time.

---

## Domain Context

LM is outside the monorepo domain manifest. No `npm run arch-test`.

**Invariants preserved by this follow-up:**

- **Parity with Portal.** Zero touch on `html-generator`, `css-generator`,
  or Portal render. No PARITY-LOG entry expected.
- **Drawer rendering behavior stays identical.** Both early returns
  remain — they still gate whether JSX renders. Hoisting hooks changes
  *when React registers them*, not *whether the component renders its
  UI*. Operators see no behavioral change.
- **Keyboard shortcuts / drawer trigger logic / inheritedWidth walk —
  all untouched.** We edit 4 lines of code; we add a null-safe operator
  twice; everything else in the function stays byte-identical.

**Rules-of-Hooks, stated:** every `useState` / `useEffect` / `useX`
call for a given component must be called on every render, in the same
order, unconditional. Early returns, conditionals, loops, and `try/catch`
around hook calls all violate this. The fix is always: move hooks above
the conditional, and let the conditional gate the return / render path
instead of the hook path.

---

## PHASE 0: Audit (do FIRST)

```bash
# A. Baseline — test runner at current P1 initial state
npm --prefix tools/layout-maker run test
#    expect: 6 passed (3 P0 smoke + 3 P1 stability)

# B. Confirm the bug still reproduces with the current Playwright flow
#    - npm --prefix tools/layout-maker run dev
#    - open http://localhost:7700
#    - load `theme-page-layout`
#    - Ctrl+2 (desktop → tablet)
#    - capture browser_console_messages
#    expect: 1 occurrence of "Expected static flag was missing" — same
#    residual Hands documented in the P1 audit. If it does NOT repro,
#    stop and surface (something else changed).

# C. Re-read DrawerSettingsControl end-to-end — do not skim
#    This audit step is the whole reason we are here. Read lines 282–330
#    in full. In the result log, confirm you saw:
#    - Line 293: if (!grid) return null
#    - Line 298: if (!perSlotOffCanvas && !gridLevelOffCanvas) return null
#    - Line 300: const [widthDraft, setWidthDraft] = useState(...)
#    - Line 303: useEffect(...)
#    If line numbers shifted since this prompt was written, use Grep to
#    relocate — do not edit blind.

# D. Confirm DrawerSettingsControl is NOT exported
grep -n "^function DrawerSettingsControl\|^export function DrawerSettingsControl" \
  tools/layout-maker/src/components/Inspector.tsx
#    expect: 1 hit, `function DrawerSettingsControl` (no `export`).
#    Task 1.f-2 adds the `export` keyword so the test can import it.
```

**Document A–D in `phase-1-result.md` (edit, do not create).**

---

## Task 1.f-1: Hoist hooks above early returns in DrawerSettingsControl

### What to Build

Edit `tools/layout-maker/src/components/Inspector.tsx` — exactly the
`DrawerSettingsControl` function body. Change **only** the hook order +
null-safe access. JSX below line 328 stays byte-identical.

```tsx
// BEFORE (around lines 282–307):
function DrawerSettingsControl({ config, activeBreakpoint, gridKey, onUpdateGridProp }: {
  config: LayoutConfig
  activeBreakpoint: string
  gridKey: string
  onUpdateGridProp: Props['onUpdateGridProp']
}) {
  const grid = config.grid[gridKey]
  if (!grid) return null

  const isOffCanvas = (v: string | undefined) => v === 'drawer' || v === 'push'
  const perSlotOffCanvas = Object.values(grid.slots ?? {}).some((s) => isOffCanvas(s.visibility))
  const gridLevelOffCanvas = isOffCanvas(grid.sidebars)
  if (!perSlotOffCanvas && !gridLevelOffCanvas) return null

  const [widthDraft, setWidthDraft] = useState((grid['drawer-width'] ?? '').replace(/px$/, ''))

  useEffect(() => {
    setWidthDraft((grid['drawer-width'] ?? '').replace(/px$/, ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey, grid['drawer-width']])

  // ... rest of body

// AFTER:
export function DrawerSettingsControl({ config, activeBreakpoint, gridKey, onUpdateGridProp }: {
  config: LayoutConfig
  activeBreakpoint: string
  gridKey: string
  onUpdateGridProp: Props['onUpdateGridProp']
}) {
  const grid = config.grid[gridKey]

  // HOOKS FIRST — Rules-of-Hooks: called on every render, always in the
  // same order, unconditional. Null-safe access because `grid` may be
  // undefined (guarded by the early return below).
  const [widthDraft, setWidthDraft] = useState(
    (grid?.['drawer-width'] ?? '').replace(/px$/, '')
  )

  useEffect(() => {
    setWidthDraft((grid?.['drawer-width'] ?? '').replace(/px$/, ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey, grid?.['drawer-width']])

  // Early returns AFTER hooks — gate JSX rendering, not hook registration.
  if (!grid) return null

  const isOffCanvas = (v: string | undefined) => v === 'drawer' || v === 'push'
  const perSlotOffCanvas = Object.values(grid.slots ?? {}).some((s) => isOffCanvas(s.visibility))
  const gridLevelOffCanvas = isOffCanvas(grid.sidebars)
  if (!perSlotOffCanvas && !gridLevelOffCanvas) return null

  // ... rest of body unchanged
```

### Integration

- `const grid = config.grid[gridKey]` stays at line 292 (first line of
  body).
- Hooks move to lines 293–300 (immediately after `grid` assignment).
- Early returns move to lines 302–307.
- Everything below line 307 (the `inheritedWidth` IIFE, the JSX) stays
  byte-identical.
- The existing `// eslint-disable-next-line react-hooks/exhaustive-deps`
  comment stays — it is intentional and carries over.

### Domain Rules

- **Do NOT change the JSX.** The render output is correct today — only
  the bug is Rules-of-Hooks ordering.
- **Do NOT delete or modify the `eslint-disable` comment** on the deps
  line. It was added intentionally; touching it expands scope.
- **Do NOT hoist `isOffCanvas` / `perSlotOffCanvas` / `gridLevelOffCanvas`
  derivations above the early returns.** They depend on `grid` being
  defined, which is only guaranteed after line 303's `if (!grid) return null`.
  Keep them between the two early returns where they are today.
- **Do NOT touch any other function in `Inspector.tsx`.** Phase 1 initial
  already closed `SlotInspector`. If Rules-of-Hooks violations exist
  elsewhere in the file — Open Question in `phase-1-result.md`, not a fix.
- **Do NOT remove the `?.` optional chain from the effect's deps array.**
  `grid?.['drawer-width']` is safer than `grid && grid['drawer-width']` —
  React treats both as valid deps, and the optional-chain is idiomatic.

---

## Task 1.f-2: Export `DrawerSettingsControl` for test access

### What to Build

Single-character change: add `export` keyword to the function
declaration (see Task 1.f-1's "AFTER" block). This is the only visibility
change; other module-local functions (`ColumnWidthControl`,
`SidebarModeControl`, etc.) stay unexported.

### Domain Rules

- **Export only `DrawerSettingsControl`.** Do not batch-export other
  Inspector-local helpers. Each export is an API boundary; we add one
  because we need one.
- **Do not re-export through a barrel.** `Inspector.tsx` exports only
  `Inspector` today. Adding a second named export is the minimal change;
  creating an `index.ts` barrel is scope creep.

---

## Task 1.f-3: Add `DrawerSettingsControl.stability.test.tsx`

### What to Build

New file: `tools/layout-maker/src/components/DrawerSettingsControl.stability.test.tsx`.

One test asserting that rerendering `DrawerSettingsControl` across a
gridKey switch that toggles the off-canvas condition does NOT produce
an `Expected static flag was missing` warning. Mirrors the approach
used in `Inspector.stability.test.tsx` — warning-absent canary is the
real contract.

```tsx
/// <reference types="vitest/globals" />
import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect } from 'vitest'
import { DrawerSettingsControl } from './Inspector'
import type { LayoutConfig } from '../lib/types'

// Minimum config shape for DrawerSettingsControl. Two grids:
//   - desktop: no off-canvas sidebar (early returns fire, component renders null)
//   - tablet:  drawer sidebar (early returns pass, JSX renders)
// Switching gridKey between the two triggers the Rules-of-Hooks bug
// in the pre-followup code.
const makeConfig = (): LayoutConfig => ({
  /* Fill to match current LayoutConfig shape in src/lib/types.ts.
     Required fields at minimum: grid.desktop + grid.tablet, both with
     `min-width` strings and `slots` records. Tablet's sidebar slot has
     `visibility: 'drawer'`; desktop's slot does not. Mirror an existing
     fixture from tools/layout-maker/layouts/ if shape is large —
     document the source in phase-1-result.md. */
} as LayoutConfig)

function collectConsoleErrors() {
  const errors: string[] = []
  const original = console.error
  console.error = (msg: unknown, ...rest: unknown[]) => {
    errors.push(String(msg))
    original(msg, ...rest)
  }
  return { errors, restore: () => { console.error = original } }
}

describe('DrawerSettingsControl stability — Rules-of-Hooks on BP switch', () => {
  let spy: ReturnType<typeof collectConsoleErrors>
  beforeEach(() => { spy = collectConsoleErrors() })
  afterEach(() => { spy.restore(); cleanup() })

  it('does not warn when gridKey toggles between a non-drawer grid and a drawer grid', () => {
    const config = makeConfig()
    const noop = () => {}

    const { rerender } = render(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="desktop"
        gridKey="desktop"
        onUpdateGridProp={noop}
      />
    )

    rerender(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="tablet"
        gridKey="tablet"
        onUpdateGridProp={noop}
      />
    )

    rerender(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="desktop"
        gridKey="desktop"
        onUpdateGridProp={noop}
      />
    )

    const hookErrors = spy.errors.filter((e) =>
      /Expected static flag was missing|Rendered (fewer|more) hooks/.test(e)
    )
    expect(hookErrors).toHaveLength(0)
  })
})
```

### Integration

- File sits next to `Inspector.tsx` + `Inspector.stability.test.tsx`
  (workplan §4 sibling convention).
- `vitest.config.ts` `include: ['src/**/*.test.{ts,tsx}']` picks it up.
- No new deps, no new config.

### Domain Rules

- **Assertion canary = warning-absent.** Cover both the R19 variant
  (`Expected static flag was missing`) and the classic Rules-of-Hooks
  diagnostic (`Rendered fewer hooks than expected` / `Rendered more
  hooks than expected`). The regex matches either class.
- **Do NOT snapshot DrawerSettingsControl's JSX.** The render output
  changes if workplan P2+ edits drawer controls; a snapshot would break
  on unrelated future edits.
- **Fixture — prefer a real YAML over hand-rolled.** If any file under
  `tools/layout-maker/layouts/` has a drawer-on-tablet + no-drawer-on-
  desktop shape, load it via `js-yaml` instead of hand-writing
  `LayoutConfig`. Document the source in the result log; fall back to
  hand-rolled only if no YAML matches.
- **`noop` callback is fine for `onUpdateGridProp`.** The test does not
  exercise click paths; only the render → rerender → render cycle.

---

## Task 1.f-4: Playwright re-verification

### What to Build

Live verification that the switch sequence now produces a clean console,
replacing the contaminated P1-initial evidence.

**Required screenshot (one new file):**

| File | Scenario |
|------|----------|
| `logs/lm-reforge/visual-baselines/p1-console-clean-after-followup.png` | DevTools Console panel visible, showing zero red errors after a full desktop → tablet → mobile → desktop switch with a slot selected |

**Required console-clean evidence:**

Update existing `logs/lm-reforge/phase-1-console-clean.md` in place. Add
a third section after the initial "Before" / "After (P1 initial)" /
"Commentary" blocks:

- `## After (P1 follow-up)` — verbatim `browser_console_messages` output
  showing zero `Expected static flag was missing` across the full switch
  rotation **and** a click on a drawer-mode sidebar (the scenario that
  triggered the residual in P1 initial).

### Integration

- Use the same MCP tool Hands chose for P1 initial (Claude-in-Chrome or
  Playwright — whichever was used; don't switch mid-phase).
- The 4 existing screenshots under `logs/lm-reforge/visual-baselines/`
  stay — they are still accurate for their named scenarios. Do not
  regenerate them.

### Domain Rules

- **If the switch sequence still shows ANY `Expected static flag was
  missing` occurrence after the fix** → the hoist was not applied
  correctly, OR a third Rules-of-Hooks violation exists elsewhere.
  **STOP. Capture the full console. Surface to Brain.** Do not ship.
- **Drawer click required.** P1 initial verified the BP-switch path but
  the *residual* fired specifically when a drawer-mode sidebar exists
  at the destination BP. Include a click on a drawer-mode sidebar in
  the re-verification sequence.

---

## Task 1.f-5: Update `phase-1-result.md` in place

### What to Build

Edit the existing Phase 1 result log. Do NOT create a new file. Brain's
P0 precedent (`phase-0-result.md` rewritten in `7b3a736e`) is the
template: the result log remains authoritative; follow-up content layers
into the same file, not a new one.

**Edits required:**

1. **Status frame at top** — flip from ⚠️ (partial) to ✅ COMPLETE, with
   a one-line annotation noting the follow-up SHA.
2. **New subsection "Brain-gate correction — named honestly"** after the
   existing honest-review section:
   - Document Brain's wrong gate #4 (partial read of lines 300–306).
   - Acknowledge Hands honored the gate correctly; accountability is
     Brain's, not Hands'.
   - Reference the follow-up commit SHA.
3. **AC #4 + #5 updates** — flip from ❌ to ✅ in the AC table. Reference
   the follow-up commit and `p1-console-clean-after-followup.png`.
4. **AC #10 clarification** — leave the ⚠️ but add a one-line Brain-side
   annotation: the "7 expected paths" count in the P1 prompt was a
   Brain-side counting miss (I said "5 log/evidence files" in the Files
   to Modify list but listed 4 screenshots + 2 logs = 6); not a Hands
   scope-creep. Mark as "counting-miss in Brain prompt, resolved."
5. **New Verification Results row** — the Playwright re-run after the
   fix, with the 0-occurrence count.
6. **Files Changed table extension** — new section "Follow-up commit"
   listing the 3–4 new/modified files.
7. **Git section** — extend the commit chain with the follow-up SHA.

### Domain Rules

- **Do NOT rewrite the existing P1 result log from scratch.** The
  initial content stays — it is the honest record of what Hands shipped
  and how Brain's gate failed. The follow-up layers annotations.
- **Self-review extension required.** If Hands caught anything new
  during follow-up execution (e.g. a third R-o-H site, a test fixture
  gotcha, a console tool quirk), document it in the extended self-review.
- **Keep the baseline-caveat callout** on the grep-gate table. Delta-vs-
  pre-P1 remains 0/0/0 for the follow-up too (JS-only edit + new test).

---

## Files to Modify

- `tools/layout-maker/src/components/Inspector.tsx` — hoist 2 hooks,
  add 2 optional-chain operators, add `export` keyword. **~4 lines net diff.**
- `tools/layout-maker/src/components/DrawerSettingsControl.stability.test.tsx`
  — **new file**, ~50 lines.
- `logs/lm-reforge/phase-1-result.md` — in-place edit per Task 1.f-5.
- `logs/lm-reforge/phase-1-console-clean.md` — append "After (P1 follow-up)" section.
- `logs/lm-reforge/visual-baselines/p1-console-clean-after-followup.png` — new screenshot.
- `logs/lm-reforge/phase-1-followup-task.md` — this file (committed with follow-up).

Not touched this follow-up: every other Inspector function body, every
other component under `src/components/`, all of `runtime/**`,
`PARITY-LOG.md`, `CLAUDE.md`, root `package.json`, root
`package-lock.json`, `vitest.config.ts`, `tsconfig.json`.

---

## Acceptance Criteria

- [ ] `npm --prefix tools/layout-maker run test` exits 0; test count is
      **7 passed** (6 prior + 1 new stability).
- [ ] `npm --prefix tools/layout-maker run typecheck` exits 0.
- [ ] `npm --prefix tools/layout-maker run build` exits 0 (bundle ±2 kB
      of P1-initial baseline 310.58 kB).
- [ ] Full desktop → tablet → mobile → desktop rotation with a slot
      selected **AND** a drawer-mode sidebar click produces **zero**
      occurrences of `Expected static flag was missing` or
      `Rendered (fewer|more) hooks`.
- [ ] `phase-1-result.md` AC #4 + #5 flipped from ❌ to ✅ with
      follow-up SHA reference; Status frame updated.
- [ ] `phase-1-result.md` "Brain-gate correction" subsection present,
      naming the wrong-gate accountability.
- [ ] `phase-1-console-clean.md` has "After (P1 follow-up)" section
      with verbatim console output.
- [ ] Grep-gate delta-vs-P1-initial = 0/0/0 (no CSS / font / color
      touched). Reported in the extended Verification Results table.
- [ ] **P0 binding hook inherited:** If the new test imports any
      `*.css?raw`, `expect(cssRaw.length).toBeGreaterThan(0)` required.
      If no `?raw` imports — hook carries forward to P2 unchanged.
- [ ] `git status` at commit shows exactly **5 paths** — no scope creep.
      (`Inspector.tsx`, new test file, in-place edits to 2 logs, 1 new
      PNG + this task prompt = 5 tracked + 1 already-committed-now-edited.
      Strictly: 5 file paths in `git status`; `phase-1-followup-task.md`
      is the 6th but is committed as part of the follow-up SHA.)
- [ ] No PARITY-LOG entry (follow-up does not touch config→CSS).

---

## MANDATORY: Verification

```bash
echo "=== LM-Reforge Phase 1 Follow-up Verification ==="

# 1. Test count = 7 (6 prior + 1 new)
npm --prefix tools/layout-maker run test
echo "(expect: 7 passed, 0 failed)"

# 2. Typecheck clean
npm --prefix tools/layout-maker run typecheck

# 3. Build clean
npm --prefix tools/layout-maker run build
echo "(expect: ~310.58 kB ±2 kB)"

# 4. Grep-gate re-run — record delta vs P1-initial counts
#    (NOT vs P0 baseline — P1 initial is the now-current reference)

# 5. Playwright re-verification (manual)
#    - npm run dev, open http://localhost:7700
#    - load theme-page-layout, select content slot
#    - Ctrl+1 → Ctrl+2 → Ctrl+3 → Ctrl+1
#    - click a drawer-mode sidebar at tablet
#    - capture browser_console_messages
#    - expect: zero "Expected static flag was missing" or "Rendered (fewer|more) hooks"
#    - save screenshot: logs/lm-reforge/visual-baselines/p1-console-clean-after-followup.png

echo "=== Verification complete ==="
```

---

## MANDATORY: Update Execution Log (do NOT create new)

Edit `logs/lm-reforge/phase-1-result.md` per Task 1.f-5 spec above.
Follow P0 precedent: `phase-0-result.md` was rewritten in-place by
commit `7b3a736e` — the result log is authoritative regardless of how
many commits layered onto the phase.

---

## Git

```bash
git add \
  tools/layout-maker/src/components/Inspector.tsx \
  tools/layout-maker/src/components/DrawerSettingsControl.stability.test.tsx \
  logs/lm-reforge/phase-1-followup-task.md \
  logs/lm-reforge/phase-1-result.md \
  logs/lm-reforge/phase-1-console-clean.md \
  logs/lm-reforge/visual-baselines/p1-console-clean-after-followup.png

git commit -m "fix(lm): phase 1 follow-up — DrawerSettingsControl Rules-of-Hooks fix [LM-reforge phase 1]"
```

**Explicit pathspec on `git commit -- <paths>`.** P0 lesson learned;
filtered `git status` as scope gate failed once (aborted `b96b9257`).

---

## IMPORTANT Notes for CC

- **Read `phase-1-result.md` before starting.** Specifically the AC
  audit table (Brain's review) — it names exactly which ACs this
  follow-up must flip (#4, #5) and which annotations go into the result
  log (#10 counting-miss).
- **This is one function body edit.** If you find yourself editing more
  than `DrawerSettingsControl` (lines ~282–330) in `Inspector.tsx`, stop
  — scope has crept.
- **The `export` keyword addition on line 282 is the only visibility
  change.** Do not export other Inspector-local functions.
- **Do NOT rebase / amend / squash the P1-initial commit `23fcc685`.**
  Follow-up commit layers on top; history is preserved.
- **If a third Rules-of-Hooks violation exists elsewhere in `Inspector.tsx`**,
  it is Open Question territory. Log it in the extended self-review;
  do not fix this phase. Scope discipline over thoroughness.
- **If the Playwright re-verification still shows the residual**, do
  NOT add a console filter or silence the warning. Root-cause further,
  capture full console output, surface to Brain.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 1 follow-up промпт готовий: `logs/lm-reforge/phase-1-followup-task.md`.

## Why this exists (one-sentence)

Brain's P1 hard gate #4 was wrong — it shielded `DrawerSettingsControl`
from inspection based on a partial read; the function has two
conditional early returns above two hooks → classic Rules-of-Hooks
violation → residual `Expected static flag was missing` on BP switch
(AC #4 + #5 ❌ in the P1 audit). Follow-up surgically fixes it.

## Структура

**4 tasks + 1 audit + 1 log-update, ≤ 30 min:**

| # | Task | Scope |
|---|------|-------|
| 1.f-audit | Reads A–D; confirm bug repros, line numbers, export status | no writes |
| 1.f-1 | `Inspector.tsx` surgical edit | hoist `useState` + `useEffect` above both early returns; add 2× `?.` optional-chain; ~4 line net diff |
| 1.f-2 | `export` keyword on `DrawerSettingsControl` | single-character change, enables test import |
| 1.f-3 | `DrawerSettingsControl.stability.test.tsx` | 1 test, gridKey toggle across off-canvas condition, warning-absent canary regex covers both R19 + classic R-o-H diagnostics |
| 1.f-4 | Playwright re-verify | full BP rotation **+ drawer sidebar click** (the specific scenario that triggered the residual); 1 new screenshot; append to console-clean log |
| 1.f-5 | Update `phase-1-result.md` in-place | flip AC #4+#5 ❌→✅; add "Brain-gate correction" subsection; annotate AC #10 counting-miss; extend verification table + files-changed table |
| Gates | Verification | 7 tests green; typecheck clean; build ±2 kB of 310.58 kB; 5-file git scope |

## 5 Brain rulings locked

1. **Root cause = Rules-of-Hooks, not render-phase setState.** Different bug class from P1-initial. Fix = hoist hooks, not `useEffect` rewrite. Null-safe via `?.` operator because `grid` may be undefined at hook-call time (guarded by early return below).
2. **`export` added only to `DrawerSettingsControl`.** Not a batch-export of all Inspector-locals. Each export = API boundary; we add the one we need.
3. **Test canary regex matches both R19 variant AND classic R-o-H diagnostics:** `/Expected static flag was missing|Rendered (fewer|more) hooks/`. React 19 mostly emits the former, but the classic strings still fire in some paths. Covering both makes the canary robust across React minor bumps.
4. **`phase-1-result.md` edited in-place, not rewritten.** P0 precedent (`7b3a736e` rewrote `phase-0-result.md`) is close but not identical — here the log's initial content is the honest record of Hands' audit work, which surfaced the Brain-gate failure. Extending beats rewriting.
5. **Precedent for "Brain was wrong" accountability stays in the log.** Extended self-review subsection "Brain-gate correction — named honestly" documents the partial-read mistake. Same category framing as P0's escalation-gates-that-fired subsection.

## Hard gates (inherited from P0 + P1 + follow-up additions)

- **Zero touch** beyond `DrawerSettingsControl` body, `export` keyword, new test file, log updates, new screenshot. Other Inspector functions, other components, runtime, configs — untouched.
- **Zero JSX edits** in `DrawerSettingsControl`. Only hook ordering + null-safe operators.
- **Zero rebase / amend / squash** of `23fcc685` or `8255a588`. Layer, don't rewrite.
- **Zero console filter or error suppression.** Root-cause if the fix doesn't hold.
- **Zero export beyond `DrawerSettingsControl`.**
- **Zero PARITY-LOG entries expected.**
- **≤ 5 files in `git status` at commit.** (The follow-up task prompt itself is the 6th but is the subject of the commit — Brain counts tracked-staged paths.)
- **`git commit -- <pathspec>` explicitly.** P0 lesson; no filtered status as scope gate.

## Escalation triggers

- **Bug does not reproduce in audit step B** → something shifted between Hands' P1 work and now. STOP, surface.
- **Line numbers in `DrawerSettingsControl` differ from ~282–330** → file edited since prompt was written. Use Grep to find the two `if (...) return null` + the two `useState`/`useEffect` lines.
- **After the fix, BP switch still shows the residual** → hoist was misapplied, OR third R-o-H site exists. STOP, capture console, surface. Do not ship with a suppressed spy.
- **TypeScript complains about `grid?.['drawer-width']` being `string | undefined` where `string` expected** → the existing fallback `?? ''` + `.replace(/px$/, '')` chain handles it; confirm the types of `grid` (from `LayoutConfig['grid'][string]`) before adding new type assertions.
- **Test's render throws on mount** (not a warning, but an actual exception) → fixture shape drift vs `src/lib/types.ts`. Use a real YAML from `tools/layout-maker/layouts/` instead of hand-rolled.
- **5+ files in `git status` at commit time** → scope crept. Investigate; don't ship.
- **Click on drawer sidebar doesn't trigger the drawer Inspector panel** → test fixture does not have a drawer-mode slot at tablet. Fix the fixture; do not skip the drawer-click step.

## Arch-test target

**N/A** — LM outside `src/__arch__/domain-manifest.ts`. P1 follow-up analog: 7 tests green + typecheck + build + Playwright 0-occurrence all clean.

## Git state

- `logs/lm-reforge/phase-1-followup-task.md` — new untracked (this file)
- `23fcc685` + `8255a588` on `main` from P1 initial + SHA-embed
- Nothing else staged, nothing committed yet for the follow-up

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найімовірніше — ruling 1 якщо хочеш інший fix approach, або ruling 4 якщо воліш rewrite-in-place over layered edits)
3. АБО self-commit if workflow permits

Чекаю.
