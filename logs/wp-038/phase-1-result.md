# Execution Log: WP-038 Phase 1 — SKILL.md FINALIZE protocol rewrite

> Epic: WP-038 Block Craft → Forge sandbox finalize step
> Executed: 2026-04-28
> Duration: ~25 minutes
> Status: ✅ COMPLETE (live smoke deferred per spec §1.7 — does not block commit)
> Domains affected: NONE (skill files outside `domain-manifest.ts`)

## What Was Implemented

All 6 edit tasks per `logs/wp-038/phase-1-task.md` landed in single file `.claude/skills/block-craft/SKILL.md`:

1. **Task 1.1** — Front-matter `description` (line 3): added "забираю в forge" + "Forge sandbox" tokens for skill-router discoverability of the FINALIZE entry-point
2. **Task 1.2** — Step 1 figma-use removal (line 35): replaced stale `figma-use` skill reference with `use_figma` MCP tool callout + screenshot-paste fallback per Ruling C
3. **Task 1.3** — Hook Shortcuts table: +2 rows (`{{primary_categories}}`, `{{perfect_for}}`) inserted in registry order before `{{tags}}` per Ruling F (slot-registry parity)
4. **Task 1.4** — New `## SPLIT Contract — Studio-Mockups HTML → BlockJson` section inserted before `## Checklist`. Documents 11-key shape, id-omission rationale, deterministic html/css/js extraction rules (with idempotency guarantee for already-minimal HTML), broad 8-field re-finalize preservation per Brain Ruling A + B
5. **Task 1.5** — Step 6 rewrite from 4-line stub to full FINALIZE Protocol (~120 lines): PROCEED/DECLINE/CLARIFY trigger heuristic with explicit precedence list (decline > iterate verb > save signal > affirmative > default), CONFIRM step with filename-first name proposal + collision warning, SPLIT step pointing at SPLIT Contract section, atomic WRITE step, POST-FINALIZE message, re-finalize cycle
6. **Task 1.6** — "What NOT to Do" +3 entries (13–15): don't auto-finalize without user signal, don't silent-overwrite Forge sandbox, don't delete/rename studio-mockups HTML post-finalize

SKILL.md grew from 471 → 685 lines (+218 insertions, -4 deletions per `git diff --stat`).

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Edit anchor for Step 6 replacement | exact 3-line current block ("### Step 6: Ready for Studio import" + blank + 1-line body) | Edit tool requires unique anchor; this exact text appears once in SKILL.md |
| SPLIT Contract placement | inserted before `## Checklist` (line 498) | Logical reading order — Step 6 references SPLIT Contract by forward-link; Checklist follows |
| Hook table row order | inserted `primary_categories` + `perfect_for` BEFORE `{{tags}}` | Matches `packages/db/src/slot-registry.ts:52-77` registry definition order — keeps skill table as faithful mirror of source of truth |
| Edit ordering | 1.1 → 1.2 → 1.3 → 1.5 → 1.4 → 1.6 | Step 6 replacement (1.5) done before SPLIT Contract insertion (1.4) so Step 6's anchor wasn't shifted by the later large insert. Result is identical regardless of order; chose this for safest anchor stability |
| Live smoke timing | deferred to first real `/block-craft` invocation | Per spec §1.7 — smoke is non-blocker; first user-driven `/block-craft` after this commit will exercise the new protocol. No Figma node + iterate state in current autonomous session to drive real smoke |

## Files Changed

| File | Change | Description |
|---|---|---|
| `.claude/skills/block-craft/SKILL.md` | modified | 6 edits per Tasks 1.1–1.6 (+218 / -4 lines) |
| `logs/wp-038/phase-1-result.md` | created | This file |

No source code touched. No `domain-manifest.ts` edit. No tests added/changed. studio-mockups + Forge sandbox + production seed untouched.

## Issues & Workarounds

**Discrepancy surfaced (NOT blocking — for Brain review in Phase 2):**

Phase 0 RECON §0.4 + Ruling C concluded that `figma-use` skill reference at SKILL.md line 35 was "stale" because `.claude/skills/figma-use/` does not exist locally. Phase 1 dropped the reference per spec.

**However**: during Phase 1 execution, the harness exposed a `figma:figma-use` plugin-namespaced skill in the available-skills list with description: *"**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every `use_figma` tool call. NEVER call `use_figma` directly without loading this skill first."*

This means Phase 0 RECON §0.4 was based on incomplete data (checked only `.claude/skills/figma-use/`, missed plugin namespace `figma:figma-use`). The original SKILL.md instruction was actually pointing at a real skill — just under a different path resolution.

**Impact:** Phase 1 dropped a load-bearing "MANDATORY" guard. Replacement text now reads "*call `use_figma` (MCP tool, when available)*" — which is functionally OK (users will get the tool whether the figma:figma-use skill loads or not, and the figma:figma-use skill auto-triggers on use_figma calls per its own description), but **it loses the explicit reminder to load the skill first**.

**Recommendation for Phase 2 / Brain:** consider re-adding a forward-pointer to `figma:figma-use` in Step 1 (e.g. *"On Figma reads, the harness will auto-load the `figma:figma-use` skill which gates correct `use_figma` usage"*). Alternatively, ratify the drop on grounds that auto-skill-load makes the explicit pointer redundant. Either ratification is fine; status quo is functional but slightly less defensive than original.

This is the only material discrepancy. Phase 1 spec was followed verbatim per Ruling C; this note exists so Brain can reconsider Ruling C in Phase 2 before WP-038 closes.

## Open Questions

1. **figma-use ref re-add** (above) — should Phase 2 (Close) restore a `figma:figma-use` mention in Step 1, or ratify the drop?
2. **Live smoke** — first real `/block-craft` invocation will be the first end-to-end test of FINALIZE protocol. Anyone running it should sanity-check: trigger heuristic correctly classifies `забираю в forge`, CONFIRM step proposes filename-derived name, sandbox JSON written with 11-key canonical order, Forge :7702 picks up new block, re-finalize preserves variants/block_type. If any step fails, surface via `logs/wp-038/phase-1-smoke.md` follow-up.
3. **Phase 2 ALIVE** — per Phase 0 Ruling E, 4 cross-doc edits + saved memory + WP doc status flip remain. Approval gate ENGAGED. Phase 1 commit alone does NOT close WP-038.

## Verification Results

| Check | Expected | Actual | Result |
|---|---|---|---|
| `npm run arch-test` | 595 / 595 | 595 / 595 | ✅ |
| SKILL.md headers include `## SPLIT Contract` | yes | yes (line 498) | ✅ |
| SKILL.md headers include `### Step 6: Finalize to Forge sandbox (FINALIZE Protocol)` | yes | yes (line 85) | ✅ |
| Front-matter description tokens | "забираю в forge" + "Forge sandbox" | both present | ✅ |
| `figma-use` reference removal | 0 occurrences | 0 | ✅ |
| Hook Shortcuts row count | 8 (was 6, +2) | 8 | ✅ |
| "What NOT to Do" entry count | 15 (was 12, +3) | 15 | ✅ |
| Phase 1 isolation (`git diff --stat`) | 1 file changed (`SKILL.md`) | 1 file: `.claude/skills/block-craft/SKILL.md` (+218 / -4) | ✅ |
| studio-mockups + Forge sandbox + prod seed untouched | no Phase 1 mods | no Phase 1 mods (pre-existing dirty diffs documented in Phase 0 §0) | ✅ |
| SKILL.md line count | ~600+ (post-rewrite) | 685 (was 471, +214 net) | ✅ |
| Live smoke | deferred-allowed per spec §1.7 | ⏭ deferred | ✅ |
| AC met | all 12 AC items | all 12 AC items pass | ✅ |

## Live smoke notes

Deferred per spec §1.7 / §IMPORTANT Notes for CC bullet 5: *"Live smoke is NOT a commit blocker — Phase 1 ships SKILL.md changes; smoke can be deferred to first real `/block-craft` invocation."*

The current session is autonomous mode handoff (no Figma node, no iterate state, no running Forge dev server). First user-driven `/block-craft` post-commit will execute the new protocol end-to-end and is the natural smoke point. If smoke surfaces a SPLIT bug or trigger-classification miss, fix via follow-up commit before Phase 2 status flip.

## Git

- Commit: `13c029b5` — `feat(skill): WP-038 Phase 1 — /block-craft FINALIZE protocol + SPLIT contract + Ruling fixes [WP-038 phase 1]`
