# WP-032 Phase 5 — Close

> Phase 5 of WP-032 Layout Maker Operator Workbench IA. Mandatory close phase.
> Tip at start: `4f84c601 feat(lm): WP-032 phase 4 — first-screen composition pass [WP-032 phase 4]`
> Predecessors:
> - `73d602df feat(lm): WP-032 phases 1+2 — structure surface + canvas visibility chrome [WP-032 phases 1-2]`
> - `011156bf feat(lm): WP-032 phase 3 — drawer trigger dialog [WP-032 phase 3]`
> - `4f84c601 feat(lm): WP-032 phase 4 — first-screen composition pass [WP-032 phase 4]`
>
> WP-032 commit range: `73d602df..4f84c601` (3 commits, plus the Phase 0 RECON logs folded into 73d602df).
>
> Goal: confirm the WP-032 IA reorg is documented where it needs to be, mark the workplan DONE, and verify everything green. **No more code changes in Phase 5.** This is doc + status work.

---

## Hard non-goals (Phase 5)

- **No code changes** in `tools/layout-maker/src/`, `tools/layout-maker/runtime/`, `packages/`, or `apps/`. If a Phase 4 regression surfaces, **STOP** and re-open Phase 4 — do not patch it inside Close.
- **No new files outside the approved doc-update list.** Phase 5 result log + any approved doc edits only.
- **No silent doc updates.** Every doc file edit must appear in the approved proposal table (4 rows minimum: file, current state, proposed change, why). The split is: CC proposes → Brain approves → CC executes. (Memory: feedback_close_phase_approval_gate.)
- **No re-opening Phase 1–4.** All four phase result logs are sealed deliverables. Phase 5 reads them; it does not edit them.
- **No PARITY-LOG entries.** WP-032 was an IA reorg, not a parity defect. If the close discovers a new parity divergence, log it in PARITY-LOG.md and that becomes a separate WP, not Phase 5 work.

---

## Pre-flight (HARD GATE)

Same evidence-required posture as Phases 1–4 (memory: feedback_empirical_over_declarative). Each item gets its own line under `## Pre-flight` in the result log.

1. PARITY-LOG check
   ```bash
   rg -n "^## Open" tools/layout-maker/PARITY-LOG.md
   ```
   Must be `_(none)_`. If anything else, **STOP** — Close cannot run on top of an open parity entry.

2. Phase 4 tip
   ```bash
   git log -1 --oneline
   ```
   Expect: `4f84c601 feat(lm): WP-032 phase 4 — first-screen composition pass [WP-032 phase 4]`.

3. WP-032 commit range
   ```bash
   git log --oneline | rg "WP-032|wp-032"
   ```
   Expected three commits: `4f84c601`, `011156bf`, `73d602df` (plus the Phase 0 RECON logs folded into `73d602df`). Record the actual list in the result log.

4. All four phase result logs exist
   ```bash
   ls logs/wp-032/phase-{0,1,2,3,4}-result.md
   ```
   All five files must exist. If any is missing, **STOP** — that phase did not actually close.

5. All Phase 1–4 PNG sets present
   ```bash
   ls logs/wp-032/phase-1-after-*.png logs/wp-032/phase-2-after-*.png logs/wp-032/phase-2-toggle-*.png logs/wp-032/phase-3-after-*.png logs/wp-032/phase-4-after-*.png
   ```
   Expect: 6 (P1) + 6+1 (P2) + 7 (P3) + 6 (P4) = 26 PNGs. Plus 6 P0 baseline PNGs already in repo. If the count is off, document why before continuing.

6. Final gate sweep (full, not delta)
   ```bash
   cd tools/layout-maker && npm run test
   cd tools/layout-maker && npm run build
   npm run arch-test
   rg -n "SlotToggles|AddSlotButton|onToggleSlot|onCreateTopLevelSlot|Trigger label|Trigger icon|Trigger color" tools/layout-maker/src/components/Inspector.tsx
   ```
   Expected:
   - LM tests: `182 passed` (Phase 4 close baseline)
   - LM build: green; record JS + CSS numbers (`331.38 kB` / `74.53 kB` from Phase 4)
   - arch-test: `501 passed`
   - Inspector grep: `0 matches`

7. Worktree scoped status
   ```bash
   git status --short -- tools/layout-maker/src tools/layout-maker/runtime
   ```
   Should be clean. Phase 5 will only touch docs / workplan / SKILL files, not source.

---

## Tasks

### 5.1 CC reads all phase logs

Read in order (no skimming):
- `logs/wp-032/phase-0-result.md`
- `logs/wp-032/phase-1-result.md`
- `logs/wp-032/phase-2-result.md`
- `logs/wp-032/phase-3-result.md`
- `logs/wp-032/phase-4-result.md`

In the result log under `## Phase Recap`, write a 1–2-sentence summary per phase covering:
- What shipped (1 line)
- Material deviation from the task prompt (1 line, or "none")

This is the input to the proposal — if you skip it, the proposal is fiction.

### 5.2 CC proposes doc updates

Write a `## Proposed Doc Updates` section in `logs/wp-032/phase-5-result.md` as a table:

| File | Current state | Proposed change | Why |
|------|---------------|-----------------|-----|

Candidates to evaluate (do NOT pre-decide; evaluate based on phase recap):

A. `workplan/WP-032-layout-maker-operator-workbench-ia.md`
   - Almost-certainly required: flip `Status: PLANNING` → `Status: ✅ DONE`, fill `Completed: 2026-04-26`, append a `## Final Result` section listing the three commits with one-line descriptions.

B. `.claude/skills/domains/infra-tooling/SKILL.md`
   - Currently has zero references to Layout Maker IA, Inspector ownership, SlotStructurePanel, DrawerTriggerDialog, or Canvas slot-state chrome. The four LM lines mention only yaml/html/css generators (WP-020/024).
   - Decide: does the WP-032 Inspector IA reorg cross into a project-level invariant or trap that future agents need to know about, OR is it self-evident from the code now?
   - If yes → propose adding a small `Layout Maker — Inspector IA` invariant block (size: ≤6 bullet lines) listing: Inspector no longer hosts slot topology; structure surface owns slot rows + add slot; canvas slot chrome owns spatial visibility; drawer trigger lives in DrawerTriggerDialog; capability rules in `inspector-capabilities.ts` are the source of truth for what shows.
   - If no → propose nothing for this file and document why in the result log.

C. `.context/BRIEF.md`
   - Decide: does WP-032 shift project-level state enough to warrant a sentence in the agent-orienting brief, OR is it inside Layout Maker's local docs?
   - If `BRIEF.md` already has a Layout Maker section, propose a one-line addition at most. If not, propose nothing.
   - Default lean: NO change. BRIEF.md is for project state, not per-WP completion announcements.

D. `.context/CONVENTIONS.md`
   - Decide: did WP-032 establish a NEW UI/workbench convention reusable beyond Layout Maker (e.g. "rare-config gets a summary row + dialog, never inline triple-row")? If yes, ≤3-line addition. If the pattern is already covered by F.3 in `tools/layout-maker/CLAUDE.md`, propose nothing.
   - Default lean: NO change.

E. `src/__arch__/domain-manifest.ts`
   - Phase 5 must verify whether the four new LM source files (`SlotStructurePanel.tsx`, `DrawerTriggerDialog.tsx`, `color-token-select.tsx`, `drawer-trigger-defaults.ts`) need explicit registration. The current LM pattern in the manifest is selective (`runtime/lib/css-generator.ts` + its test only).
   - Empirical check: arch-test passed at 501 in Phase 4 with these files unregistered. So registration is NOT required.
   - Default: NO change. Document the observation in the result log so future agents do not re-debate it.

F. `tools/layout-maker/CLAUDE.md`
   - Decide: does the LM CLAUDE.md need a new sub-section on the WP-032 IA boundary (parallel to its WP-020 Container vs Leaf section, WP-023 visibility, or LM-Reforge sections)? If the IA boundary is load-bearing for future agents, yes. If self-evident from `Inspector.tsx` once they read it, no.
   - Default lean: PROPOSE a small "WP-032 Inspector IA boundary" sub-section (≤10 lines) listing the same invariants from candidate B but tool-local. Treat this as the most likely doc landing site.

G. `tools/layout-maker/PARITY-LOG.md`
   - No change expected. WP-032 is IA, not parity. Verify `## Open` is still `_(none)_` and that no Phase 1–4 result log claimed to add an entry.

H. `logs/wp-032/phase-5-task.md` (this file)
   - Already exists once written. No subsequent change.

I. `logs/wp-032/phase-5-result.md`
   - Required new file. Not part of the "approval" doc list; it's the close evidence itself.

The `## Proposed Doc Updates` section must include EVERY candidate above with a clear `propose / no-change` decision. A missing candidate row means it was not evaluated, which is a fail.

Pass/fail for 5.2 (must precede 5.3 tick):
- ✅ Each candidate A–I has an explicit row with `propose / no-change` + reason.
- ✅ For each `propose` row, the proposed change is concrete enough to be diffed (file path + 2–6 lines of intent, not vague "update SKILL").

### 5.3 Brain approves

After the proposal lands in `phase-5-result.md`, **STOP coding and wait for Brain approval through chat**. Do NOT pre-execute the proposal.

The Brain's approval message will be one of:
- `approve all` → execute the full proposal as written.
- `approve with edits: ...` → execute with the specified edits.
- `reject ...` → revise the proposal and re-submit.

Memory rationale: `feedback_close_phase_approval_gate` — Close phases touching ≥3 doc files have a history of cross-file drift unless the proposal is gated.

Pass/fail for 5.3 (must precede 5.4 tick):
- ✅ Result log has a `## Brain Decision` line capturing the explicit approval message.
- ✅ No doc edits committed before this line is filled.

### 5.4 CC executes the approved doc updates

Execute the approved subset only. Each file edited gets:
- A line under `## Files Touched` in the result log with the actual diff scope (e.g. "Inserted 6-line invariant block under `## Invariants` in `infra-tooling/SKILL.md`").
- A grep/diff evidence line if the change is small (e.g. `git diff -- workplan/WP-032-...md | rg "Status:"`).

If any approved edit turns out to be larger than the proposal implied during execution, **STOP** and update the proposal + re-ask. Do not silently expand scope.

Pass/fail for 5.4:
- ✅ Each approved row is closed with a "DONE" reference in the result log.
- ✅ Each rejected/no-change row is left as-is and recorded as such.

### 5.5 WP-032 status update

In `workplan/WP-032-layout-maker-operator-workbench-ia.md`:
- Top frontmatter line `**Status:** PLANNING` → `**Status:** ✅ DONE`.
- Top frontmatter line `**Completed:** -` → `**Completed:** 2026-04-26`.
- Append a `## Final Result` section at the end of the workplan with:
  - The three commit lines (full hash + subject) in chronological order.
  - One sentence per commit on what shipped.
  - Final test/build/arch numbers from Phase 4 close (`182 passed` / JS+CSS / `501 passed`).

This is the only doc edit that is REQUIRED regardless of the 5.2 proposal — closing a workplan without flipping its status is incomplete close.

### 5.6 Final gate re-run

After all doc edits land:
```bash
cd tools/layout-maker && npm run test
cd tools/layout-maker && npm run build
npm run arch-test
git status --short -- tools/layout-maker/src tools/layout-maker/runtime
```

Expected:
- All three commands green with the same numbers as pre-flight (`182 passed`, JS `331.38 kB` + CSS `74.53 kB`, arch-test `501 passed`). Phase 5 should not have moved any of these.
- `git status` clean for `src/` and `runtime/` — Phase 5 only touched docs/workplan/SKILL.

If arch-test changed by `+/- 6`, that is the `feedback_arch_test_status_flip` pattern (skeleton → full status flip on a SKILL). For WP-032 this is unexpected (infra-tooling is already `status: full`), so investigate and document if it appears.

Pass/fail for 5.6:
- ✅ Test/build/arch numbers identical to pre-flight.
- ✅ src/ and runtime/ scoped diff empty.

### 5.7 Result log close

Fill `logs/wp-032/phase-5-result.md` `## Acceptance Criteria` and `## Honest Notes` sections. Verify against the workplan-level AC checklist (the bullet block at the bottom of `workplan/WP-032-...md`) — every bullet there must have a one-line evidence reference in `phase-5-result.md`.

---

## Acceptance Criteria

Tick each in result log with evidence:

- [ ] Pre-flight passed: PARITY 0, Phase 4 tip verified, all 5 phase result logs present, all 26+ PNGs present, baseline tests/build/arch recorded.
- [ ] Phase recap section summarizes Phases 0–4 with material deviations called out.
- [ ] Proposed doc updates table covers candidates A–I with explicit `propose / no-change` + reason.
- [ ] Brain approval line captured verbatim before any doc edit.
- [ ] All approved doc edits executed; each closed in result log; no silent extras.
- [ ] WP-032 workplan status flipped to `✅ DONE`, Completed `2026-04-26`, `## Final Result` section appended with three-commit list.
- [ ] Workplan-level AC checklist (the one in `workplan/WP-032-...md` bottom) re-verified bullet-by-bullet against shipped artifacts.
- [ ] Final test/build/arch numbers identical to pre-flight (no Phase 5 regression).
- [ ] `src/` and `runtime/` scoped diff empty at end.
- [ ] PARITY-LOG `## Open` still `_(none)_`.
- [ ] No new files outside the approved scope + `phase-5-result.md`.
- [ ] DS lint clean on staged Phase 5 files (workplan/SKILL/etc. should not have token violations, but the lint runs anyway).

---

## Risks (and how to dodge them)

1. **Skipping the proposal-approval split.** Memory feedback_close_phase_approval_gate exists because Close phases touching multiple docs have drifted before. Even if the doc edits look small, the gate stays.
2. **Pre-deciding the doc proposal.** Candidates A–I are evaluated against the phase recap, not pre-filled with a fixed answer. The default leans listed are guidance, not verdicts.
3. **Editing a phase result log retroactively.** Phases 0–4 result logs are sealed. If something is wrong in them, write the correction in `phase-5-result.md` `## Honest Notes`, not in the older log.
4. **Forgetting the workplan AC checklist.** The bullet block at the bottom of `workplan/WP-032-...md` is the canonical AC list. Phase 5 must walk it bullet-by-bullet, not improvise.
5. **Adding to PARITY-LOG.md.** WP-032 is IA work; nothing to log there. If a phase result mentions a PARITY divergence, that is a separate WP, not Phase 5 work.
6. **Touching src/ during Close.** Hard no. If Phase 4 regression appears, re-open Phase 4 in a fresh task, do not patch in Close.
7. **Bundle / test / arch number drift between pre-flight and 5.6.** Should be zero. Any drift means a doc edit accidentally hit code or a test, which is a pre-commit catch-and-revert moment.
8. **Manifest under-registration.** If arch-test failed because new LM files need registration, that is a manifest update, but only for the specific files that arch-test names. Do not bulk-register the four new files preemptively.

---

## Files Modified (expected scope)

```
workplan/WP-032-layout-maker-operator-workbench-ia.md  # status flip + Final Result section (mandatory)
.claude/skills/domains/infra-tooling/SKILL.md          # only if approved in proposal
tools/layout-maker/CLAUDE.md                           # only if approved in proposal
.context/BRIEF.md                                      # only if approved in proposal
.context/CONVENTIONS.md                                # only if approved in proposal
src/__arch__/domain-manifest.ts                        # only if arch-test demands it
logs/wp-032/phase-5-result.md                          # mandatory new file
```

The result log must justify every file outside this list that ends up in `git diff` at end of Phase 5.

---

## Mandatory Result Log Skeleton

Create `logs/wp-032/phase-5-result.md` with:

```
# WP-032 Phase 5 Result — Close

Date: 2026-04-26
Tip at start: 4f84c601 feat(lm): WP-032 phase 4 — first-screen composition pass [WP-032 phase 4]

## Pre-flight
[All 7 pre-flight items with evidence lines]

## Phase Recap
[1-2 sentences per phase 0-4, with material deviation noted]

## Proposed Doc Updates
[Candidates A-I as a table, propose/no-change + reason]

## Brain Decision
[Verbatim approval message + timestamp]

## Files Touched
[Per-file actual diff scope after execution]

## Workplan AC Walkthrough
[Each workplan AC bullet from workplan/WP-032-...md with one-line evidence]

## Final Gate
[Numbers from 5.6, identical to pre-flight expected]

## Acceptance Criteria
[Each Phase 5 AC bullet from this task with evidence reference]

## Honest Notes
[Any deviation, late-breaking finding, or Appendix B carry-over]
```

---

## Important

- This phase is doc + status work. If any task tries to drag code into scope, **STOP** and re-scope.
- The proposal-approval split is non-negotiable for ≥3-doc-file Close phases. Even if the actual approved set turns out to be 1 or 2 files, the gate runs.
- After 5.6 passes, **DO NOT commit** Phase 5 yourself. The Brain commits Phase 5 along with the cadence after verifying.
- Memory pointers active in this phase: `feedback_close_phase_approval_gate`, `feedback_arch_test_status_flip`, `feedback_empirical_over_declarative`, `feedback_visual_check_mandatory` (n/a — no UI changes), `feedback_no_blocker_no_ask` (proposal table is the structured "ask").
