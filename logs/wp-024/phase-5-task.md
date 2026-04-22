# WP-024 Phase 5: Close — doc updates, skill invariants, WP status flip

> Workplan: WP-024 Responsive Blocks — Foundation
> Phase: 5 of 5 (final)
> Priority: P0
> Estimated: ~0.5 hour
> Type: Documentation + status
> Previous: Phase 4 ✅ (slot container-type + tokens.responsive.css — commit `e43533b9` + `2a7948d6`)
> Next: — (WP-024 ships; WP-025 Block Forge Core unblocks)
> Affected domains: meta (docs), pkg-ui, app-portal, infra-tooling

---

## Context

Phase 5 is the **close phase**: update docs and skill files to reflect the new contracts so future sessions (human or agent) pick them up automatically, then flip the WP status to DONE. No runtime code changes.

This phase has a **mandatory two-step workflow** (per WP §5.3):

1. **Propose** — Hands digests all phase logs, drafts the full set of proposed doc changes into `logs/wp-024/phase-5-proposal.md`, and **STOPS**.
2. **Brain approves** — Brain reviews the proposal, either green-lights or asks for edits. Hands only proceeds after explicit approval.
3. **Execute** — Hands applies the approved changes, verifies green, commits, and writes `logs/wp-024/phase-5-result.md`.

**DO NOT execute docs changes before Brain approves the proposal.** The proposal-then-execute split exists so knowledge artifacts (skills, BRIEF, CONVENTIONS) don't drift silently — Brain is the human-facing reviewer for doc content even when the code work happened autonomously.

```
CURRENT:
  - WP-024 code complete (Phase 4 landed in e43533b9 + 2a7948d6)                            ✅
  - 382+2 arch-tests green, typecheck clean across all workspaces                           ✅
  - Forward-risks logged in phase-3 and phase-4 result logs but not in top-level docs       ⚠️
  - WP-024 status line still reads `PLANNING`                                               ❌
  - Domain skills (pkg-ui, app-portal, infra-tooling) do not mention variants contract      ❌
  - BRIEF.md doesn't note WP-024 complete / ADR-025 active                                  ❌
  - CONVENTIONS.md has no section on responsive blocks / @container scoping                 ❌
  - BLOCK-ARCHITECTURE-V2.md doesn't cross-reference ADR-025 or WP-024                      ❌
```

---

## PHASE 0: Audit (do FIRST)

```bash
# 0. Baseline
npm run arch-test
# Expected: 384 passed, 0 failed (post-Phase-4 count)

# 1. Confirm Phase 4 commits are HEAD / near-HEAD
git log --oneline -5
# Expected: 2a7948d6 and e43533b9 visible near top

# 2. Read all four phase-result logs (these are the source material for the proposal)
cat logs/wp-024/phase-0-result.md
cat logs/wp-024/phase-1-result.md
cat logs/wp-024/phase-2-result.md
cat logs/wp-024/phase-3-result.md
cat logs/wp-024/phase-4-result.md

# 3. Read the doc files that will be edited (for structure / insertion-point context)
cat .context/BRIEF.md
cat .context/CONVENTIONS.md
cat .claude/skills/domains/pkg-ui/SKILL.md
cat .claude/skills/domains/app-portal/SKILL.md
cat .claude/skills/domains/infra-tooling/SKILL.md
cat workplan/BLOCK-ARCHITECTURE-V2.md
# (ADR-025 reference — not edited here, just for cross-link targets)
ls workplan/adr/025-responsive-blocks.md

# 4. Current WP status line
head -15 workplan/WP-024-responsive-blocks-foundation.md
```

---

## Task 5.1: Digest phase logs, identify every doc-worthy discovery

From the five `phase-*-result.md` files, extract into the proposal:

- **New contracts introduced** — what's now true that wasn't before (e.g., "blocks can carry an optional `variants` JSONB", "every leaf `.slot-inner` exposes `container-type: inline-size`").
- **New invariants** — things future code MUST respect (e.g., "tokens.responsive.css is hand-maintained and NOT touched by /sync-tokens", "variant CSS must scope under `.block-{slug}`", "renderer variant-absent branch must stay byte-identical").
- **Forward-risks** — known gaps that WP-024 deliberately didn't address but future WPs will need to handle (e.g., theme-page hand-written `.slot-inner` doesn't get container-type, lazy re-export rollout, `.block-{slug}` vs `data-block-shell` divergence).
- **Cross-references** — what points to what (ADR-025 ↔ WP-024 ↔ CONVENTIONS ↔ skills).

Sourced from:
- Phase 0 Q1 → manifest decision (Brain-approved)
- Phase 0 Q3 → scope decision (Brain-approved), logged as forward-risk
- Phase 3 Open Questions → `.block-{slug}` vs `data-block-shell` divergence, `@container` surviving `stripGlobalPageRules`
- Phase 4 Open Questions → theme-page wrapper, lazy re-export rollout
- Phase 4 Key Decisions → layout-schematic.tsx skipped (reason)

---

## Task 5.2: Draft proposal (STOP after writing; do not edit target files yet)

Write the full proposal to `logs/wp-024/phase-5-proposal.md`. Structure:

```markdown
# WP-024 Phase 5 — Doc Update Proposal (awaiting Brain approval)

## Summary
{2-3 sentences on what WP-024 shipped and why it needs doc propagation}

## Proposed changes

### 1. `.context/BRIEF.md`
**Current state (verbatim snippet of the section to modify):**
```
{quote the current paragraph/section}
```
**Proposed change (unified diff or full replacement block):**
```diff
- {old line(s)}
+ {new line(s)}
```
**Rationale:** {1-2 sentences}

### 2. `.context/CONVENTIONS.md`
{same structure}

### 3. `.claude/skills/domains/pkg-ui/SKILL.md`
{same structure — add invariant about tokens.responsive.css being hand-maintained}

### 4. `.claude/skills/domains/app-portal/SKILL.md`
{same structure — add invariants about BlockRenderer variants contract, byte-identity when absent, @container scoping}

### 5. `.claude/skills/domains/infra-tooling/SKILL.md`
{same structure — add invariant about css-generator emitting container-type + container-name on generic .slot-inner; note infra-tooling now owns css-generator.ts + .test.ts}

### 6. `workplan/BLOCK-ARCHITECTURE-V2.md`
{same structure — cross-reference ADR-025 + WP-024, note the variants + container-type mechanism}

### 7. `workplan/WP-024-responsive-blocks-foundation.md`
**Status flip:**
```diff
- **Status:** PLANNING
+ **Status:** ✅ DONE
- **Completed:** —
+ **Completed:** 2026-04-22
```

## Forward-risks being documented (for future WPs)

| Risk | Flagged in | Target doc |
|---|---|---|
| theme-page hand-written `.slot-inner` doesn't get `container-type` | Phase 4 OQ | CONVENTIONS.md + app-portal SKILL |
| Lazy re-export rollout for existing themes | Phase 4 OQ | CONVENTIONS.md note |
| `.block-{slug}` vs `data-block-shell` pre-existing divergence | Phase 3 OQ | app-portal SKILL (known trap) |
| `stripGlobalPageRules` strips `body { … }` nested in `@container` | Phase 3 OQ | app-portal SKILL (documented behavior, low-risk) |

## Summary of diffs
{table: file → +N / -M lines}

## STOP — awaiting Brain approval before executing
```

### Rules for the proposal

- **Show verbatim current-state quotes** for every section you propose to edit. Brain should not have to open the files to review.
- **Propose specific diffs**, not abstract intent. "Add a section" is not a proposal; the exact new text IS a proposal.
- **Err toward concise additions** — skills/BRIEF/CONVENTIONS are read by every future agent; every line competes for attention. Prefer 2 tight sentences over a paragraph.
- **Do NOT edit target files in this task.** Write only `logs/wp-024/phase-5-proposal.md`.
- **Do NOT commit** the proposal. Brain will approve/reject in-session; once approved, Task 5.3 commits the final set together.

When the proposal is written, output one line summarizing file count + total diff size, then stop. Do not proceed to Task 5.3.

---

## Task 5.3: APPROVAL GATE

**Hands halts after writing the proposal.** Brain reads, and replies either:
- `approved` / `go` / `proceed` → Hands continues with Task 5.4+
- `change X: {…}` → Hands revises the proposal and re-posts for approval
- `reject` → Hands flags the rejection reason in phase-5-result.md and exits

Do NOT interpret silence as approval. Do NOT execute partial changes.

---

## Task 5.4: Execute approved changes

Once approved, apply the diffs from `phase-5-proposal.md` exactly. Any deviation from the approved text triggers a re-approval cycle. If during execution a diff doesn't apply cleanly (e.g., Brain's review required mid-flight), STOP and flag.

Files to touch (exact list depends on the approved proposal, but will include):

- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/pkg-ui/SKILL.md`
- `.claude/skills/domains/app-portal/SKILL.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `workplan/WP-024-responsive-blocks-foundation.md` (status flip to `✅ DONE`, completion date `2026-04-22`)
- `logs/wp-024/phase-5-task.md` (this file — already exists)
- `logs/wp-024/phase-5-proposal.md` (already exists, from Task 5.2)
- `logs/wp-024/phase-5-result.md` (new, mandatory execution log)

---

## Task 5.5: Verify green

```bash
echo "=== WP-024 Phase 5 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: 384 passed, 0 failed — unchanged from Phase 4; no files added to manifest in Phase 5)"

# 2. Typecheck
npx tsc -p apps/portal/tsconfig.json --noEmit
npx tsc -p apps/studio/tsconfig.json --noEmit
npx tsc -p tools/layout-maker/tsconfig.json --noEmit
echo "(expect: all exit 0 — no code changed)"

# 3. WP status is DONE
head -15 workplan/WP-024-responsive-blocks-foundation.md | grep -E "Status|Completed"
echo "(expect: Status ✅ DONE + Completed 2026-04-22)"

# 4. All six target docs actually edited
git diff --stat HEAD~1 .context/BRIEF.md .context/CONVENTIONS.md \
  .claude/skills/domains/pkg-ui/SKILL.md \
  .claude/skills/domains/app-portal/SKILL.md \
  .claude/skills/domains/infra-tooling/SKILL.md \
  workplan/BLOCK-ARCHITECTURE-V2.md
echo "(expect: all six files show a diff; none zero)"

# 5. Proposal matches final diffs (approved-text-equals-committed-text check)
# No automatable check — spot-check by re-reading proposal and diff, confirm identical

echo "=== Verification complete ==="
```

---

## Task 5.6: Write execution log

`logs/wp-024/phase-5-result.md`:

```markdown
# WP-024 Phase 5 — Result (Close)

> Phase: 5 of 5
> Duration: {mins}
> Commits: {proposal sha (if committed separately)}, {execution sha}

## Audit confirm-pass
{table showing phase-5 audit checks all pass}

## What Was Implemented
Doc updates across 6 files propagating WP-024 contracts to top-level docs + three domain skills + BLOCK-ARCHITECTURE-V2. WP-024 status flipped to ✅ DONE.

## Approval record
- Proposal written: `logs/wp-024/phase-5-proposal.md` ({N} lines)
- Brain approval received: "{quote the approval message verbatim}"
- Any revisions: {list; or "none"}

## Files Changed
| File | +/- | Summary |
{table — 7 rows including the proposal file itself}

## Forward-risks documented
| Risk | Target doc | Lines |
{table — 4 rows}

## Verification Results
{table — 5 rows from Task 5.5}

## Git
- Commit: `{sha}` — `docs: WP-024 close — propagate variants + container-type contracts [WP-024 phase 5]`
- Staged files: {list}

## WP-024 final status
✅ DONE — 2026-04-22
- 5 phases, {total duration}, {N} commits
- arch-test: 380 → 384 (+4), typecheck clean, all AC met
- Unblocks WP-025 (Block Forge Core)
```

---

## Files to Modify / Create

- `logs/wp-024/phase-5-proposal.md` — NEW (Task 5.2)
- `.context/BRIEF.md` — modified (approved text only, Task 5.4)
- `.context/CONVENTIONS.md` — modified
- `.claude/skills/domains/pkg-ui/SKILL.md` — modified
- `.claude/skills/domains/app-portal/SKILL.md` — modified
- `.claude/skills/domains/infra-tooling/SKILL.md` — modified
- `workplan/BLOCK-ARCHITECTURE-V2.md` — modified (cross-reference ADR-025 + WP-024)
- `workplan/WP-024-responsive-blocks-foundation.md` — status flip + completion date
- `logs/wp-024/phase-5-task.md` — exists (this file)
- `logs/wp-024/phase-5-result.md` — NEW (Task 5.6)
- `src/__arch__/domain-manifest.ts` — **NO change** (no new owned files in Phase 5)

---

## Acceptance Criteria

- [ ] `phase-5-proposal.md` exists with verbatim current-state quotes + exact proposed diffs for every target file
- [ ] Brain approval recorded verbatim in `phase-5-result.md`
- [ ] All six target docs edited to match the approved proposal byte-for-byte
- [ ] WP-024 status line reads `**Status:** ✅ DONE` and `**Completed:** 2026-04-22`
- [ ] Four forward-risks explicitly documented in at least one of: CONVENTIONS.md, pkg-ui SKILL, app-portal SKILL, infra-tooling SKILL
- [ ] Cross-reference from `BLOCK-ARCHITECTURE-V2.md` to ADR-025 + WP-024 present
- [ ] `npm run arch-test` — 384 passed, 0 failed (unchanged)
- [ ] All workspace typechecks — exit 0 (unchanged — no code modified)
- [ ] No code file modified (git diff --stat shows only `.md` files + the two log files)

---

## Git

```bash
# Option 1 — one commit after full execution (preferred):
git add \
  .context/BRIEF.md \
  .context/CONVENTIONS.md \
  .claude/skills/domains/pkg-ui/SKILL.md \
  .claude/skills/domains/app-portal/SKILL.md \
  .claude/skills/domains/infra-tooling/SKILL.md \
  workplan/BLOCK-ARCHITECTURE-V2.md \
  workplan/WP-024-responsive-blocks-foundation.md \
  logs/wp-024/phase-5-task.md \
  logs/wp-024/phase-5-proposal.md \
  logs/wp-024/phase-5-result.md

git commit -m "docs: WP-024 close — propagate variants + container-type contracts [WP-024 phase 5]"
```

---

## IMPORTANT Notes for CC

- **The approval gate is real.** Do not interpret silence or partial feedback as approval. If Brain's reply says "approved with small change in pkg-ui skill: …", update the proposal, ask for re-approval, then execute.
- **No code changes in this phase.** Arch-test count is unchanged (384/0). Typecheck is unchanged. Any code-file diff in the final commit is a red flag.
- **Err toward concise doc additions.** Every line in BRIEF / CONVENTIONS / skills competes for attention in future agent contexts — 2 sharp sentences beats a paragraph.
- **Cross-reference responsibility.** Each forward-risk goes in exactly ONE place (the most appropriate doc) — not repeated across all three skills. Pick the domain that owns the risk.
- **Status flip is the last thing you write.** Everything else landing first means the "DONE" is truthful.
- **Absolutely do NOT introduce new invariants that weren't exercised by WP-024.** Skills should reflect what IS, not what MIGHT BE in WP-025+. Stay ruthless about scope.
