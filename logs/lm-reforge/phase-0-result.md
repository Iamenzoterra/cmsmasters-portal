# Execution Log: LM-Reforge Phase 0 — Test Runner Setup

> Workplan: `tools/layout-maker/codex-review/12-workplan.md`
> Task prompt: `logs/lm-reforge/phase-0-task.md`
> Executed: 2026-04-24T00:10:00Z
> Duration: ~45 min (includes 1 Brain-escalation round-trip for the jest-dom install gap)
> Status: ✅ COMPLETE (with one Brain-ratified scope deviation — see Key Decisions)
> Surface affected: `tools/layout-maker` (config only — zero production-code edits under `src/`)

---

## What Was Implemented

Vitest 4 + `@vitejs/plugin-react` + jsdom + RTL wired into `tools/layout-maker` as the
tool's first test runner. Added `test` / `test:watch` scripts and 4 devDep pins
(not 5 — `@testing-library/jest-dom` deferred to P1; see decisions). New
`vitest.config.ts` sets `css: true` (load-bearing per saved memory
`feedback_vitest_css_raw`) and points at a wired `src/test-setup.ts` ready to
import jest-dom matchers when P1 lands the first RTL assertion. One smoke test
under `src/lib/__smoke__/setup.test.ts` proves the runner end-to-end
(`expect(1+1).toBe(2)`, no LM-source imports). Grep-gate baseline frozen for
P1–P7 delta reporting.

---

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Version pins | Match `apps/studio` verbatim (`vitest ^4`, `@testing-library/dom ^10.4.1`, `@testing-library/react ^16`, `jsdom ^25`) | Workplan §P0 rule: no new majors; studio is the jsdom+RTL peer, `block-forge-core` uses node-env |
| Actual vitest resolved | `4.1.5` | `^4` range; npm picked latest satisfying 4.x — still dedupe-compatible with studio/block-forge-core (`4.1.2` hoisted at root) |
| `@vitest/ui` | Skipped | Workplan marks optional; keep dep tree lean |
| `@testing-library/jest-dom` | **DEFERRED to P1** (scope deviation — see Issues) | LM is first monorepo adopter; installing it required infrastructure changes beyond P0's 6-file scope. Brain ruling #7 (new): defer install-plumbing to when first RTL matcher actually lands |
| `tsconfig.json` types array | Not added | Vitest 4 globals + RTL types resolved through module import graph without explicit `types[]`; typecheck stays green. Revisit if P1's TSX component test complains |
| `css: true` in vitest.config | Yes | Memory `feedback_vitest_css_raw` — load-bearing for every downstream phase that touches `?raw` CSS imports |
| `src/test-setup.ts` content | `export {}` + comment marker for P1 | Keeps the wiring (vitest.config `setupFiles` → `./src/test-setup.ts`) intact; P1 only needs to change *content*, not topology |
| LM `package-lock.json` | Not committed | Honors LM's pre-existing pattern (no own lockfile, upward resolution into root `node_modules`). Temporary install used `file:../../packages/db` swap; reverted to `*` post-install |

---

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `tools/layout-maker/package.json` | modified | +2 scripts (`test`, `test:watch`); +4 devDeps (`@testing-library/dom`, `@testing-library/react`, `jsdom`, `vitest`) — alphabetical. **Not** added: `@testing-library/jest-dom` (deferred to P1) |
| `tools/layout-maker/vitest.config.ts` | created | jsdom + `@vitejs/plugin-react` + `globals: true` + `css: true` + `setupFiles: ['./src/test-setup.ts']` + `include: ['src/**/*.test.{ts,tsx}']` |
| `tools/layout-maker/src/test-setup.ts` | created | `export {}` + one-line comment noting P1 will add `@testing-library/jest-dom/vitest` import |
| `tools/layout-maker/src/lib/__smoke__/setup.test.ts` | created | Smoke test: one `expect(1+1).toBe(2)` assertion; no LM-source imports |
| `logs/lm-reforge/phase-0-task.md` | created (pre-phase, Brain deliverable) | Task prompt |
| `logs/lm-reforge/phase-0-result.md` | created (this file) | Execution log |

**Not touched** (verified via targeted `git status`):

- `tools/layout-maker/tsconfig.json` — per Task 0.5 conditional, not needed
- `tools/layout-maker/package-lock.json` — not created under LM's pre-existing pattern (deleted post-install)
- All production code under `src/App.tsx`, `src/components/**`, `src/lib/**` (except the new `__smoke__/setup.test.ts`)
- `runtime/**`, `PARITY-LOG.md`, `CLAUDE.md`

Scope check: **6 files in `git status`** exactly matching prompt expectation.

---

## Grep-gate BASELINE (frozen for P1–P7 delta reporting)

Run from repo root against `tools/layout-maker/**` excluding `codex-review/` and
`logs/`. These counts are the **baseline** — every later phase reports delta
vs. these numbers; absolute zero is an Appendix B concern, not this workplan's.

| Gate | Pattern | Baseline count |
|------|---------|---------------:|
| F.1 | hardcoded colors (`rgba\(\|#RGB\|#RRGGBB\|#RRGGBBAA`) | **75** |
| F.2 | hardcoded font names (`Manrope`, `JetBrains Mono`, `Segoe UI`, `Inter`, `SF Mono`, `Cascadia Code`, `ui-monospace`, `system-ui`) | **3** |
| F.3 | raw px font-size (`font-size: \d+px`) | **87** |

Post-edit re-run confirmed counts are unchanged (delta = 0) — expected, since
this phase touched zero production code.

---

## Issues & Workarounds

### 1. `@testing-library/jest-dom` install plumbing — DEFERRED (Brain-ratified)

**Observed.** LM is not a member of the monorepo's workspaces array (root
`workspaces: ["apps/*", "packages/*"]`; `tools/*` excluded). LM has no own
committed `package-lock.json`; all its declared deps resolve via Node upward
lookup into root `node_modules/`, populated by workspace-member hoists.

**Problem.** All 5 new Phase 0 devDeps were already hoisted at root
(`vitest@4.1.2`, `jsdom@25.0.1`, `@testing-library/react@16.3.2`,
`@testing-library/dom@10.4.1`) — except `@testing-library/jest-dom`. It has
no host workspace member declaring it (LM would be the first adopter).
Therefore a standalone LM `npm install` was the only way to install it — and
that fails with `E404` on `@cmsmasters/db@*` (declared at version `*` but not
a registry package; works only via workspace symlink from root, which LM
cannot consume since it's outside the workspace).

**Resolution.** Surfaced to Brain mid-execution with five options (add LM to
workspaces / add jest-dom to root devDeps / pollute studio with unused dep /
defer to P1 / stop-and-replan). Brain ratified option **D: defer**. Kept
`src/test-setup.ts` as a wired-but-empty stub so P1 only changes file
*content*, not topology.

**Why this is safe for P0.** The smoke test uses zero jest-dom matchers —
`expect(1+1).toBe(2)` is pure vitest. Installing jest-dom in P0 would be
install-for-install's-sake. P1's first RTL component test (Inspector
stability) will add the `import '@testing-library/jest-dom/vitest'` line AND
its install-plumbing in one motion, with real usage justifying it.

### 2. Pre-existing LM `node_modules` — accidentally deleted, then restored

**Observed.** Baseline typecheck (audit step E) was green. Mid-execution I
did `rm -rf node_modules package-lock.json` in LM, assuming they'd been
created by a partial earlier install. Typecheck then went red on
`@types/js-yaml` + `@hono/node-server` (LM-specific devDeps not hoisted
anywhere else).

**Root cause.** LM had a pre-existing (gitignored) `node_modules/` from an
earlier session. The audit was green because of it. My `rm -rf` destroyed
that state.

**Resolution.** Temporarily swapped `"@cmsmasters/db": "*"` →
`"@cmsmasters/db": "file:../../packages/db"` in LM's `package.json`, ran
`npm install --no-audit --no-fund` (202 packages), reverted the swap back to
`*`, deleted the generated `package-lock.json` (LM's pattern: no own
lockfile). Re-verified typecheck exit 0.

**Residual risk.** Next fresh clone + attempted standalone LM install will
hit the same `E404` on `@cmsmasters/db@*`. This is a pre-existing
infrastructure gap not introduced by P0. Captured for possible workplan
addendum (see Open Questions).

---

## Open Questions (for Brain to park / address later)

- **When does jest-dom actually get installed?** P1's Inspector stability
  test presumably needs `toBeInTheDocument()` / similar matchers. P1 task
  prompt should either (a) add LM to root `workspaces` array (2-file change
  to root `package.json` + root `package-lock.json`, structurally correct),
  or (b) continue the file-swap workaround, or (c) pick another matcher
  library that's already installed. Flag before P1 kickoff.

- **LM workspaces integration.** Bigger question — should `tools/*` join
  `packages/*` + `apps/*` in the root workspaces array? Would fix LM's
  install story permanently, unblock jest-dom, and apply to sister tools
  (`block-forge`, `block-forge-core` have similar patterns). Worth its own
  ADR / workplan entry — not a P0-sized decision.

---

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Smoke test runs | `npm run test` (cwd = LM) | ✅ 1 passed, 0 failed (duration 2.05s, vitest `4.1.5`, env `jsdom`) |
| Typecheck clean | `npm run typecheck` | ✅ exit 0, no output |
| Build clean | `npm run build` | ✅ exit 0, 55 modules, `dist/index.html` + `index-*.css` (58.78 kB) + `index-*.js` (310.62 kB) |
| Grep gates (delta) | F.1/F.2/F.3 re-run | ✅ 75/3/87 unchanged (delta = 0) |
| File scope | `git status` on P0 paths | ✅ exactly 6: `package.json` (M), `vitest.config.ts` (new), `src/test-setup.ts` (new), `src/lib/__smoke__/setup.test.ts` (new), `logs/lm-reforge/phase-0-task.md` (new), `logs/lm-reforge/phase-0-result.md` (new) |
| `vitest.config.ts` has `css: true` | grep | ✅ present (line 8 of new config) |
| Version pins match studio | diff vs `apps/studio/package.json` | ✅ `vitest ^4`, `@testing-library/dom ^10.4.1`, `@testing-library/react ^16`, `jsdom ^25` verbatim |
| No PARITY-LOG entry | `git status` | ✅ not touched (this phase does not touch config→CSS pipeline) |
| No arch-test | N/A | ✅ not invoked (LM outside `src/__arch__/domain-manifest.ts`) |

**All Phase 0 AC met.**

---

## Git

- Commit: `306af86a` — `chore(lm): phase 0 — test runner setup [LM-reforge phase 0]`
- Files included: 6 (matches 6-file scope hard gate)
- Insertions: 659 · deletions: 2
- DS-lint hook: ✅ clean (0 files lintable in this scope)
