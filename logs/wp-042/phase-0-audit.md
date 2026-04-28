# WP-042 Phase 0 — RECON Audit

> **Phase:** 0 (RECON — Brain ruling required)
> **Date:** 2026-04-28
> **Workpackage:** WP-042 Inspector e2e Playwright Coverage
> **Author:** Hands (autonomous mode)
> **Status:** 🟡 BLOCKED — awaiting Brain ruling

---

## TL;DR

**WP doc's stated assumption that Playwright is "already in monorepo" is empirically FALSE.** RECON confirms zero `@playwright/test` in any package.json, no `e2e/` directory anywhere, no `playwright.config.*` file, and the existing GH workflow (`sandbox-test.yml`) is a `repository_dispatch`-only orchestrator hook — there is no PR-on-push CI for the main project's tests.

This makes WP-042 NOT a "test-infrastructure-only" task as framed. It would require:
1. Adding `@playwright/test` + browser binaries
2. Creating `playwright.config.ts`
3. Authoring fixture + 5 spec paths
4. Wiring a NEW GH workflow for PR-on-push CI runs (or deferring CI)

This is a Brain decision point — multiple viable paths with material cost differences.

---

## Findings

### 1. Playwright presence: ZERO

```bash
$ grep -l '@playwright/test' **/package.json  # no matches
$ find . -name 'playwright.config.*' -not -path '*/node_modules/*'  # no matches
$ find . -path '*/e2e/*.spec.ts' -not -path '*/node_modules/*'  # no matches
```

The MCP `mcp__playwright__*` tools I used in WP-040/WP-041 visual smoke are extension-bundled, not project-installed. Distinct surfaces.

### 2. CI is sandbox-test workflow, not PR-on-push

`.github/workflows/sandbox-test.yml` is triggered by:
- `workflow_dispatch` (manual)
- `repository_dispatch` (external Orchestrator service)

Inputs require `task_id`, `callback_url`, `project_id` — this is a webhook integration with a Supabase-backed Orchestrator. **No `on: pull_request`** anywhere. Tests today run only when an external service dispatches them.

`.github/workflows/deploy-functions.yml` is the only other workflow — Supabase function deploy, irrelevant to e2e gates.

### 3. Test runner today: Vitest only

- Root: `vitest@^4.1.2` (devDep)
- Block-forge: `vitest@^4` + `jsdom@^25` + `@testing-library/react@^16`
- Studio: parallel setup (verified via `apps/studio/package.json` — same kit)
- arch-test: 597/597 — all tests via Vitest

No Jest, no Cypress, no Playwright in deps tree (apart from the MCP extension's own bundle).

### 4. Block-forge launch shape

Confirmed: `tools/block-forge/vite.config.ts` line 369 → `port: 7702, strictPort: true`.

Studio launch shape: TBD from `apps/studio/vite.config.ts` (not yet probed — only relevant for path 3 if Brain rules in).

### 5. AC checklist mapping

| WP doc AC | Status under "no install" | Status under "install + spec" | Status under "install + spec + CI" |
|---|---|---|---|
| Spec at `tools/block-forge/e2e/inspector.spec.ts` | ❌ blocked | ✅ feasible | ✅ feasible |
| 5 paths covered (chip-apply / cascade / typed input / tooltip / hover→highlight) | ❌ | ✅ | ✅ |
| Fixture in `tools/block-forge/e2e/fixtures/` | ❌ | ✅ | ✅ |
| <60s CI / <30s local | n/a | ✅ local-only | ✅ |
| Playwright config + CI integration | ❌ | partial (no CI) | ✅ |
| PARITY note | ✅ doc-only | ✅ | ✅ |
| WP-033 Ruling 3 retired | ✅ doc-only | ✅ | ✅ |

---

## Decision matrix

### Option A — Full per WP doc literal AC (~6–8h)

Install Playwright + browser binaries, author 5 spec paths + fixture, write a NEW `.github/workflows/e2e.yml` with `on: pull_request: paths: [...]`, exercise CI on a test PR.

- ✅ All AC met as written
- ❌ Cost is 2× WP doc estimate; introduces new CI surface area to maintain
- ❌ Blast radius unclear — no precedent in repo for browser-binary-cached CI runs; potential install-step flake

### Option B — Local-only (no CI) (~3–4h)

Install Playwright, author specs + fixture, wire `npm run test:e2e` script. Skip CI workflow. AC reframed: "spec runs on demand locally; CI is a separately-tracked follow-up."

- ✅ Pins regressions for human-run validation pre-PR
- ✅ Matches WP doc effort estimate
- ✅ Future contributors can wire CI when monorepo's CI strategy matures
- ❌ No automated gate — relies on convention
- 🤔 Sets precedent for "local-only test infra" — needs explicit OK

### Option C — DEFER WP-042; rely on MCP smoke (~30m doc-only)

Close WP-042 with rationale: "MCP `mcp__playwright__*` covers visual smoke needs in dev session; formal Playwright install premature given no PR-CI wiring." Update WP-033 Phase 5 Ruling 3 to point at MCP-driven smoke convention instead of formal e2e. Add to `.context/CONVENTIONS.md` §"Visual smoke pattern (MCP playwright)".

- ✅ Honest acknowledgment — current state already provides regression catching during phase-shipping
- ✅ Minimal scope creep
- ❌ MCP is human-in-the-loop only — no automated gate even locally
- ❌ Punts the question rather than answering

### Option D — Vitest + jsdom iframe-CSS pin (~2h)

Author Vitest specs that mount Inspector + simulated iframe in jsdom, assert on style mutations applied to iframe's contentDocument. Stays in existing test runner.

- ✅ Zero new infra
- ❌ jsdom doesn't honor `@container` queries, viewport-size–dependent CSS, or compute true styles — would require heavy mocking
- ❌ The 5 AC paths each rely on real browser computed styles or hover events that jsdom can't fake faithfully
- ❌ False confidence risk: tests pass but don't pin the actual rendered behavior

---

## Recommendation

**Option B (local-only)** is the cleanest fit for the WP doc's effort budget and its "test-infrastructure-only" framing. It:

1. Fulfills the spirit of WP-033 Phase 5 Ruling 3 DEFER — establishes a runnable e2e gate
2. Stays within ~3–4h budget
3. Doesn't take on CI maintenance debt as a side-quest
4. Leaves CI wire-up as a clean discrete follow-up if/when the monorepo grows PR-CI workflows generally

The CI gap is honest: WP-042 close-out documents that automated CI gating is a follow-up, not silent debt.

---

## Brain ruling needed on

1. **Option A vs B vs C vs D** — pick the path
2. **If B or A**: which app's e2e (block-forge only, studio only, both)? Block-forge has 5 paths fully addressable; Studio mirror is largely PARITY-locked, so block-forge alone may suffice.
3. **If A**: pick a CI workflow shape (PR-on-push with path filter? merge-queue gate? schedule-only nightly?)

---

## Phase 1 lock (pending ruling)

Will be filled post-ruling. No source/test code written in Phase 0.

---

## Sources

- WP doc: `workplan/WP-042-inspector-e2e-playwright.md`
- Constraint: `tools/block-forge/vite.config.ts:369` (port 7702, strictPort)
- CI surface: `.github/workflows/sandbox-test.yml` (repository_dispatch only)
- Test runner: root `package.json` (vitest@^4.1.2); `tools/block-forge/package.json` (vitest@^4 + jsdom@^25)
