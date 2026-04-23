# LM-Reforge Phase 0 — Test Runner Setup

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` (LM Trust Reforge)
> Phase: 0 of 7 (prerequisite — mandatory per §1 rule 1)
> Priority: P0
> Estimated: 0.25d (~2h)
> Type: Config
> Previous: — (first phase)
> Next: Phase 1 (Inspector stability fix — first phase that needs the runner)
> Affected domains: `tools/layout-maker` (standalone Vite app; **not** part of monorepo `src/__arch__/domain-manifest.ts`)

---

## Context

`tools/layout-maker/` is a standalone Vite + React + Hono tool. It has `dev`, `typecheck`, `build` scripts — **no `test` script, no test deps** (verified in `package.json` at the time of writing: scripts block ends with `"build": "vite build"`, devDeps list `tsx`, `typescript`, `vite`, `@vitejs/plugin-react` but **no** vitest/RTL/jsdom).

Every downstream phase of the LM Trust Reforge workplan (P1–P7) adds one or more contract tests listed in workplan §4. Per §1 rule 1 of the workplan, P0 is **mandatory** — without it, no later phase can pass its own acceptance. This phase picks Vitest as the runner (mirrors the rest of the monorepo), wires the minimal config, writes one trivial smoke test to prove the loop, and updates `package.json`.

```
CURRENT:  dev / typecheck / build scripts, no test runner, no test deps   ✅ known-state
MISSING:  vitest + RTL + jsdom, vitest.config.ts, test-setup.ts,
          src/lib/__smoke__/setup.test.ts, npm --prefix … run test        ❌
```

This phase is **config-only**. It touches zero production code. If you feel the urge to fix anything in `App.tsx`, `Inspector.tsx`, or `maker.css` — stop. That belongs to P1+.

---

## Domain Context

LM is outside the monorepo's arch-test / domain-manifest system. That means:

- **No `npm run arch-test`** gate in this phase. Verification uses `npm --prefix tools/layout-maker run typecheck` + the new `run test`.
- **No `.claude/skills/domains/*` skill** for LM (it is not a domain). Canonical reference for LM-internal invariants is `tools/layout-maker/CLAUDE.md` — read it once before starting.
- **Parity contract** (invariant): LM must not lie to the operator about Portal render. See `tools/layout-maker/CLAUDE.md` § "Parity with Portal" and `tools/layout-maker/PARITY-LOG.md`. This phase does not touch the config→CSS pipeline, so no PARITY-LOG entry is expected. If one is needed, flag and stop.

**Monorepo Vitest convention (mirror, do not introduce new majors):**

- `apps/studio/package.json` uses `vitest: "^4"`, `@testing-library/react: "^16"`, `@testing-library/dom: "^10.4.1"`, `jsdom: "^25"`.
- `packages/block-forge-core/package.json` uses `vitest: "^4.1.2"`.
- `packages/block-forge-core/vitest.config.ts` is the minimal node-env reference; `apps/studio` has no committed `vitest.config.ts` yet, so we invent ours from the workplan spec + the saved `vitest-css-raw` memory.
- `@testing-library/jest-dom` is **not yet** in the monorepo. We add it pinned to `^6` (current stable major). Workplan §P0 mandates it for matchers like `toBeInTheDocument()`; it is imported from the setup file.

---

## PHASE 0: Audit (do FIRST — CRITICAL, before any write)

Hands runs these reads before touching any file. Outcomes land in the Phase 0 result log verbatim.

```bash
# A. Confirm LM current package.json shape (expect: no "test" script, no vitest deps)
cat tools/layout-maker/package.json

# B. Confirm LM has no vitest config yet (expect: zero hits — file does not exist)
ls tools/layout-maker/vitest.config.ts 2>/dev/null || echo "ABSENT (expected)"

# C. Confirm LM has no test-setup yet
ls tools/layout-maker/src/test-setup.ts 2>/dev/null || echo "ABSENT (expected)"

# D. Pin versions to monorepo peers (copy exact ranges — do not introduce new majors)
grep -E '"vitest"|"@testing-library/react"|"@testing-library/dom"|"jsdom"' apps/studio/package.json
grep -E '"vitest"' packages/block-forge-core/package.json

# E. Confirm LM typecheck is currently green (baseline before touching anything)
npm --prefix tools/layout-maker run typecheck

# F. Grep-gate BASELINE (workplan §1 rule 6 — this phase's ONLY gate duty)
#    Run from repo root. Capture counts; they become the baseline every later
#    phase reports delta-vs. The gate is INFORMATIONAL — hits are expected
#    today, the three counts just freeze the starting debt.

# F.1 — hardcoded colors (rgba or hex) in LM code (excludes docs/logs)
rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code \
   -g "!tools/layout-maker/codex-review/**" \
   -g "!tools/layout-maker/logs/**" \
   "rgba?\(|#[0-9a-fA-F]{3,8}\b" tools/layout-maker \
  | rg -v "currentColor|data:|(//|/\*).*#" | wc -l

# F.2 — hardcoded font names
rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code \
   -g "!tools/layout-maker/codex-review/**" \
   -g "!tools/layout-maker/logs/**" \
   "['\"](Manrope|JetBrains Mono|Segoe UI|Inter|SF Mono|Cascadia Code|ui-monospace|system-ui)['\"]" \
   tools/layout-maker | wc -l

# F.3 — raw px font-size (geometry px is fine; this only catches font-size)
rg -n --type-add "code:*.{ts,tsx,js,jsx,css,html}" -t code \
   -g "!tools/layout-maker/codex-review/**" \
   -g "!tools/layout-maker/logs/**" \
   "font-size\s*:\s*[0-9]+px" tools/layout-maker | wc -l
```

**Document findings (A–F) in `logs/lm-reforge/phase-0-result.md` before writing code.** The three F counts become the baseline every later phase reports delta against.

**IMPORTANT:** If the typecheck in step E is red before you touch anything — **stop and surface to Brain**. The workplan assumes a green baseline; fixing pre-existing typecheck debt is not Phase 0 scope.

---

## Task 0.1: Update `tools/layout-maker/package.json`

### What to Build

Add `test` + `test:watch` scripts, add dev-dep entries pinned to monorepo peers.

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"tsx watch runtime/index.ts\"",
    "dev:ui": "vite",
    "dev:runtime": "tsx watch runtime/index.ts",
    "start": "tsx runtime/index.ts",
    "typecheck": "tsc --noEmit",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/js-yaml": "^4",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6",
    "@testing-library/react": "^16",
    "concurrently": "^9",
    "jsdom": "^25",
    "tsx": "^4",
    "typescript": "^5",
    "vite": "^6",
    "vitest": "^4"
  }
}
```

### Domain Rules

- **Do not change existing scripts or deps.** Only add the four new test-stack entries (`@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/react`, `jsdom`, `vitest`) + the two scripts. Alphabetical order inside `devDependencies` preserved above.
- **Pinned ranges match monorepo peers verbatim.** If audit step D returns different ranges for `apps/studio` vs what this prompt lists, the source-of-truth is `apps/studio/package.json` — match studio's ranges, surface the delta in the result log.
- **Do not add `@vitest/ui`.** Workplan calls it optional; we skip it to keep the dep tree lean. If an operator wants the UI later, they add it separately.

---

## Task 0.2: Create `tools/layout-maker/vitest.config.ts`

### What to Build

New file at `tools/layout-maker/vitest.config.ts` — minimal jsdom + react config.

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

### Domain Rules

- **`css: true` is load-bearing** (saved memory `feedback_vitest_css_raw.md`): without it, any future test that imports a `?raw` CSS string or observes computed styles silently runs against empty strings. LM has `?raw` imports in iframe rendering (see `tools/layout-maker/CLAUDE.md` § "Vite ?raw Import Paths") — future Inspector/preview tests will regress without this flag.
- **`globals: true`** — workplan spec. Lets tests use `describe/it/expect` without explicit imports, matches the sample test in Task 0.4.
- **`include` pattern** — scope tests to `src/**` only. Don't pick up accidental tests under `runtime/`, `exports/`, `imports/`, `dist/`.
- **`plugins: [react()]`** — required for JSX/TSX transform inside test files (P1's `Inspector.stability.test.tsx` relies on it).

---

## Task 0.3: Create `tools/layout-maker/src/test-setup.ts`

### What to Build

```ts
import '@testing-library/jest-dom/vitest'
```

### Domain Rules

- Single-line file. It wires `@testing-library/jest-dom`'s matchers into Vitest's `expect` via the `/vitest` subpath export. No other setup needed in this phase — DOM mocks / fixtures arrive per-phase as needed.

---

## Task 0.4: Create the smoke test

### What to Build

New file at `tools/layout-maker/src/lib/__smoke__/setup.test.ts` — proves the loop end-to-end.

```ts
import { describe, it, expect } from 'vitest'

describe('lm test runner', () => {
  it('executes a single assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

### Domain Rules

- **Lives under `src/lib/__smoke__/`** — matches workplan spec verbatim. The `__smoke__` folder is intentional: it signals "delete-safe once real tests exist" to future readers. Do not move it to `src/__tests__/` or `src/lib/`.
- **No imports beyond `vitest`.** The test's only job is to prove the runner, config, and setup file wire together. Adding any LM-source import here (to "make it more useful") voids the smoke signal — if this test fails, we want to know it's a runner failure, not an LM-source bug.

---

## Task 0.5: `tsconfig.json` types array (conditional)

### What to Build

`tools/layout-maker/tsconfig.json` currently has no `types` array (verified — `compilerOptions` ends with `"outDir": "dist"`, no `types` key). **Do not add a `types` array.** Vitest 4 + `@testing-library/jest-dom/vitest` pick up ambient types through the setup-file import; adding `"types": [...]` would require also listing `vite/client`, `node`, etc., and risks breaking the existing `runtime/` typecheck.

If `npm run typecheck` returns errors about missing `describe`/`it`/`expect` globals after the test file exists, **only then** add:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

…and re-run typecheck. Record the decision (added or not needed) in the result log.

### Domain Rules

- **Additive only.** Do not touch `target`, `module`, `moduleResolution`, `strict`, `jsx`, `outDir`, or the `include` array. They are load-bearing for `runtime/` + `src/` compilation.

---

## Files to Modify

- `tools/layout-maker/package.json` — add 2 scripts + 5 devDependencies
- `tools/layout-maker/vitest.config.ts` — **new file**
- `tools/layout-maker/src/test-setup.ts` — **new file**
- `tools/layout-maker/src/lib/__smoke__/setup.test.ts` — **new file**
- `tools/layout-maker/tsconfig.json` — conditional edit (only if typecheck complains about globals; see Task 0.5)
- `logs/lm-reforge/phase-0-result.md` — **new file** (execution log with grep-gate baseline)

Not touched this phase: everything under `src/App.tsx`, `src/components/**`, `src/lib/**` (except the new `__smoke__/setup.test.ts`), `src/styles/**`, `runtime/**`, `PARITY-LOG.md`, `CLAUDE.md`, `package-lock.json` beyond what `npm install` auto-updates.

---

## Acceptance Criteria

- [ ] `npm --prefix tools/layout-maker run test` exits 0 and reports exactly **one** passing test (the smoke).
- [ ] `npm --prefix tools/layout-maker run typecheck` exits 0 (no new errors introduced).
- [ ] `npm --prefix tools/layout-maker run build` exits 0 (Vite still builds; vitest.config.ts must not confuse the Vite build — they are separate configs).
- [ ] `tools/layout-maker/vitest.config.ts` sets `test.css: true` (saved memory `feedback_vitest_css_raw.md` — without this, every downstream phase's `?raw` CSS tests silently pass against empty strings).
- [ ] Versions of `vitest`, `@testing-library/react`, `@testing-library/dom`, `jsdom` match `apps/studio/package.json` verbatim (no new majors).
- [ ] Three grep-gate counts from the audit step F captured in `phase-0-result.md` as **baseline** (workplan §1 rule 6).
- [ ] No edit to files listed as out-of-scope above. `git status` shows only the six expected paths.
- [ ] No PARITY-LOG entry needed (this phase does not touch config → CSS pipeline). If one was added, surface to Brain — it means scope creep.

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== LM-Reforge Phase 0 Verification ==="

# 1. Install new deps (updates package-lock.json — expected)
npm --prefix tools/layout-maker install
echo "(expect: adds 5 devDeps, no other lockfile churn)"

# 2. Smoke test runs green
npm --prefix tools/layout-maker run test
echo "(expect: 1 passed, 0 failed, 0 skipped)"

# 3. Typecheck still green
npm --prefix tools/layout-maker run typecheck
echo "(expect: no output, exit 0)"

# 4. Build still green (Vite + vitest.config.ts must coexist)
npm --prefix tools/layout-maker run build
echo "(expect: exit 0, dist/ populated, no vitest config leakage into the bundle)"

# 5. Grep gates — re-run the three from audit step F and record counts.
#    Delta-vs-baseline must be ZERO this phase (we touched no LM source,
#    only config + one trivial smoke test with no hex/font/px).

echo "=== Verification complete ==="
```

Paste the output of steps 2, 3, 4, and the three F grep counts into `phase-0-result.md` verbatim.

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/lm-reforge/phase-0-result.md`:

```markdown
# Execution Log: LM-Reforge Phase 0 — Test Runner Setup
> Workplan: tools/layout-maker/codex-review/12-workplan.md
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Surface affected: tools/layout-maker (config only)

## What Was Implemented
{2–5 sentences: Vitest + RTL + jsdom wired, one smoke test, six-file diff.}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Version pins | Match apps/studio verbatim | Workplan §P0: no new majors |
| `@vitest/ui` | Skipped | Workplan marks optional; keep dep tree lean |
| `tsconfig.json` types array | Added / Not needed | {record outcome from Task 0.5} |
| `css: true` in vitest.config | Yes | Memory feedback_vitest_css_raw — load-bearing for downstream phases |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| tools/layout-maker/package.json | modified | +2 scripts, +5 devDeps |
| tools/layout-maker/vitest.config.ts | created | jsdom + react + css:true |
| tools/layout-maker/src/test-setup.ts | created | jest-dom/vitest import |
| tools/layout-maker/src/lib/__smoke__/setup.test.ts | created | smoke test |
| tools/layout-maker/tsconfig.json | modified / unchanged | {per Task 0.5 outcome} |
| tools/layout-maker/package-lock.json | modified | npm install side-effect |

## Grep-gate BASELINE (frozen for P1–P7 delta reporting)
| Gate | Count |
|------|-------|
| F.1 hardcoded colors (rgba/hex) | {N} |
| F.2 hardcoded font names | {N} |
| F.3 raw px font-size | {N} |

These counts are the baseline. Every later phase reports delta-vs-baseline.
Absolute zero is a goal for the Appendix B DS workplan, NOT this one.

## Issues & Workarounds
{None / describe}

## Open Questions
{None / describe}

## Verification Results
| Check | Result |
|-------|--------|
| npm run test | ✅ 1 passed |
| npm run typecheck | ✅ clean |
| npm run build | ✅ clean |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `chore(lm): phase 0 — test runner setup [LM-reforge phase 0]`
```

Then include `logs/lm-reforge/` in your `git add` before committing.

---

## Git

```bash
git add \
  tools/layout-maker/package.json \
  tools/layout-maker/package-lock.json \
  tools/layout-maker/vitest.config.ts \
  tools/layout-maker/src/test-setup.ts \
  tools/layout-maker/src/lib/__smoke__/setup.test.ts \
  tools/layout-maker/tsconfig.json \
  logs/lm-reforge/phase-0-task.md \
  logs/lm-reforge/phase-0-result.md

git commit -m "chore(lm): phase 0 — test runner setup [LM-reforge phase 0]"
```

(If `tsconfig.json` was not modified per Task 0.5, drop it from the `git add` list.)

---

## IMPORTANT Notes for CC

- **Read `tools/layout-maker/CLAUDE.md` first** — especially "Parity with Portal" (non-negotiable invariant) and the "Vite ?raw Import Paths" section (explains why `css: true` is load-bearing).
- **No production-code edits.** The only `.ts`/`.tsx` file this phase creates under `src/` is the smoke test. Anything else is scope creep — surface to Brain.
- **No `@vitest/ui`, no coverage tool, no happy-dom experiments.** Workplan is explicit: Vitest + RTL + jsdom. Pick nothing else.
- **Grep-gate is baseline only** — this phase does not "fix hits," it freezes the starting number.
- **No arch-test.** LM is outside `src/__arch__/domain-manifest.ts` — attempting `npm run arch-test` from the tool is a category error (the command lives at repo root and scans only monorepo domains).
- **If typecheck goes red after touching anything**, revert the config change that tripped it and surface. Do not debug typing around it.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 0 промпт готовий: `logs/lm-reforge/phase-0-task.md`.

## Структура

**5 tasks + 1 audit, ~2h budget:**

| # | Task | Scope |
|---|------|-------|
| 0.audit | Pre-write reads (A–F) + grep-gate baseline capture | no file writes; freezes starting debt counts |
| 0.1 | `tools/layout-maker/package.json` modify | +2 scripts (`test`, `test:watch`), +5 devDeps pinned to `apps/studio` peers |
| 0.2 | `tools/layout-maker/vitest.config.ts` create | jsdom + `@vitejs/plugin-react` + `css: true` + setupFiles |
| 0.3 | `tools/layout-maker/src/test-setup.ts` create | single import: `@testing-library/jest-dom/vitest` |
| 0.4 | `tools/layout-maker/src/lib/__smoke__/setup.test.ts` create | one `1+1===2` assertion, no LM-source imports |
| 0.5 | `tools/layout-maker/tsconfig.json` conditional | only touch if Task 0.4 fails on missing globals |
| Gates | Verification | `run test` ✅ 1 passed, `run typecheck` clean, `run build` clean, grep-gate baseline recorded |

## 6 Brain rulings locked

1. **Vitest version = `^4`** (mirrors `apps/studio`). Not `^4.1.2` (block-forge-core) — studio is the jsdom+RTL peer, block-forge-core is node-env only.
2. **`@testing-library/jest-dom` pinned at `^6`** — first LM-scoped addition of this package. Monorepo does not use it yet; workplan mandates it for matcher ergonomics in P1+ component tests.
3. **`css: true` is load-bearing, not optional.** Saved memory `feedback_vitest_css_raw.md` — without it, LM's `?raw` CSS imports silently test against empty strings in future phases.
4. **`@vitest/ui` skipped.** Workplan calls it optional; keep dep tree lean. Operators can add later per-workstation.
5. **No `tsconfig.json` types array by default.** Vitest 4 + `/vitest` setup export wire globals through module resolution; adding `types` risks breaking `runtime/` typecheck. Add only if typecheck complains.
6. **Grep-gate is baseline-only this phase.** Hex/font/px hits are pre-existing debt — freeze the counts in P0, report delta every phase after. Absolute zero is Appendix B's job, not this workplan's.

## Hard gates (Phase 0 specific — nothing inherited, this is the first phase)

- **Zero production-code edits.** No touches under `src/App.tsx`, `src/components/**`, `src/lib/**` (except the new `__smoke__/setup.test.ts`), `src/styles/**`, `runtime/**`.
- **Zero tsconfig churn beyond the conditional `types` array** — all other fields load-bearing for existing compilation.
- **Zero `@vitest/ui`, `happy-dom`, coverage tools, or alternative runners.** Workplan is explicit.
- **Zero PARITY-LOG entries expected.** Phase 0 does not touch config → CSS pipeline. If one is added, scope creeped — surface.
- **Zero arch-test invocation.** LM is outside the monorepo domain manifest.

## Escalation triggers

Written to catch the config-phase failure modes up-front:

- **`npm run typecheck` red before any edit** → baseline is not green; stop, surface. Fixing pre-existing typecheck debt is out of scope.
- **`apps/studio/package.json` ranges differ from what this prompt lists** → studio is ground truth; match studio verbatim, record the delta in the result log.
- **Smoke test fails with "describe is not defined"** → don't randomly add `import { describe, it, expect } from 'vitest'` everywhere; that means `globals: true` didn't take. Fix the config, not the test (test is lifted from workplan verbatim).
- **Smoke test fails with CSS / transform errors** → `css: true` missing or `@vitejs/plugin-react` misconfigured. Re-read Task 0.2 before debugging.
- **`npm run build` goes red after config landing** → `vitest.config.ts` leaking into Vite build. Confirm file is named `vitest.config.ts` (not `vite.config.ts`). They are separate files.
- **More than 6 files in `git status`** → scope creep. Stop, surface.

## Arch-test target

**N/A** — LM is outside `src/__arch__/domain-manifest.ts`. This phase's analog is `npm --prefix tools/layout-maker run test` (1 test green) + `run typecheck` + `run build` all clean.

## Git state

- `logs/lm-reforge/phase-0-task.md` — new untracked (this file)
- `tools/layout-maker/codex-review/12-workplan.md` — untouched (read-only reference)
- Nothing staged, nothing committed

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найчастіше — rulings 2 або 3, якщо хочеш інші пін-ранжі чи вимкнути `css: true`)
3. АБО self-commit if workflow permits

Чекаю.
