# WP-036 Phase 3 (Close) — Result

> **Phase:** 3 (Close — PARITY trio + SKILL flips + CONVENTIONS + status flip + atomic doc batch)
> **Date:** 2026-04-28
> **Workpackage:** WP-036 Inspector UX Polish
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — atomic doc batch ready for Brain approval gate
> **Phase 1 commit:** `81de7729`
> **Phase 2 commit:** `e09c8cc5`

---

## TL;DR

Doc-only Close phase. 8 doc files updated to record WP-036 as the canonical
"Inspector UX Polish" reference across PARITY trio + SKILL trio + CONVENTIONS
patterns + status flip in WP doc + ROADMAP + BRIEF status row. Zero source
edits. Atomic commit per `feedback_close_phase_approval_gate` Brain-approval
gate (≥3 doc files threshold).

---

## Files updated (atomic batch)

| File | Section added | LOC delta |
|---|---|---|
| `tools/block-forge/PARITY.md` | §Inspector UX Polish (WP-036) — Phase 1 protocol + Phase 2 reducer/group + cumulative postMessage table | +103 |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | §Inspector UX Polish (WP-036) — Studio-side multi-iframe broadcast + Undo parity + owned-files table | +44 |
| `.claude/skills/domains/infra-tooling/SKILL.md` | §Inspector UX Polish (WP-036) — Start Here / Invariants / Traps / Blast Radius / Recipes | +30 |
| `.claude/skills/domains/studio-blocks/SKILL.md` | §Inspector UX Polish cross-surface mirror (WP-036) — Studio-specific traps + recipes | +27 |
| `.context/CONVENTIONS.md` | §Inspector UX Polish patterns (WP-036) — 3-pattern bundle (hover protocol + per-id Undo + render-time group) | +118 |
| `workplan/WP-036-inspector-ux-polish.md` | Status BACKLOG → ✅ DONE; Outcome Ladder; Commit Ladder; AC checkmarks (15/15) | ~30 mod |
| `.context/ROADMAP.md` | Deferred entry: BACKLOG → ✅ DONE | 1 mod |
| `.context/BRIEF.md` | New status row "Inspector UX Polish ✅ DONE (WP-036: ...)" | +1 |

**Total: ~354 LOC across 8 doc files. Zero source files. Zero test files.**

Plus this `phase-3-result.md` (#9) for the Phase 3 record.

---

## Cross-file drift audit (per `feedback_close_phase_approval_gate`)

8 doc files cross-checked for consistency on the following invariants:

### 1. postMessage type literal: `block-forge:inspector-request-hover`
- ✅ tools/block-forge/PARITY.md (cumulative table + iframe IIFE listener excerpt)
- ✅ apps/studio/PARITY.md (cross-reference)
- ✅ infra-tooling/SKILL.md (Recipes mention)
- ✅ studio-blocks/SKILL.md (Multi-iframe broadcast mention)
- ✅ CONVENTIONS.md (Pattern 1 protocol table)

### 2. Attribute slot name: `data-bf-hover-from-suggestion`
- ✅ All 5 of the above + Inspector outline rule excerpts in 4 of them
- Race-with-native-`[data-bf-hover]` rationale spelled out in 4 files (PARITY-bf, infra-tooling SKILL, studio-blocks SKILL, CONVENTIONS)

### 3. Reducer name: `removeFromPending`
- ✅ All 5 references include the precise-history-filter rationale
- ✅ "Why precise filter not pop-last" pinned in 3 files (PARITY-bf, infra-tooling SKILL, CONVENTIONS)

### 4. Group key tuple: `(heuristic, bp, property, value, rationale)`
- ✅ All 5 references use the exact 5-element tuple
- ✅ "Embedding rationale separates same-heuristic-different-px" rationale present in 3 files

### 5. Component name: `SuggestionGroupCard`
- ✅ Owned-files tables in PARITY-bf + PARITY-studio + infra-tooling SKILL + studio-blocks SKILL
- ✅ Domain manifest entries (committed in Phase 2)

### 6. Status flip
- ✅ workplan/WP-036 — Status: ✅ DONE
- ✅ ROADMAP Deferred entry — ✅ DONE 2026-04-28
- ✅ BRIEF status table — Inspector UX Polish ✅ DONE row added

### 7. Test count totals (cross-doc consistency)
- Phase 1: +12 hover-protocol tests (6 per surface) — pinned in result.md, BRIEF, PARITY-bf
- Phase 2: +14 removeFromPending tests (7 per surface) + +20 grouping tests (10 per surface) — pinned in result.md, BRIEF
- Total WP-036 new tests: +46 across cross-surface mirror
- arch-test: 580 → 588 (+8 from manifest +4 entries — 2 components + 2 tests)

### 8. Commit SHAs
- Phase 1: `81de7729` — pinned in commit ladder + Phase 2 result.md
- Phase 2: `e09c8cc5` — pinned in commit ladder + this Phase 3 result.md
- Phase 3: TBD — backfilled into commit ladder post-commit

**Audit conclusion:** zero drift detected across 8 doc files. All references
to protocol shape, attribute names, reducer name, group-key tuple, component
name, status, test counts, and commit SHAs are mutually consistent.

---

## Constraints re-confirmed (all green)

- ✅ Zero source edits — Phase 3 is doc-only
- ✅ Zero test edits — no behaviour changes; existing tests already passing (cross-surface 99 + 53 = 152)
- ✅ arch-test still 588/588 (manifest unchanged in Phase 3)
- ✅ PARITY trio (`tools/block-forge/PARITY.md` + `apps/studio/.../PARITY.md`) updated in lockstep
  - `tools/responsive-tokens-editor/PARITY.md` not affected — no Inspector consumer changes there
- ✅ SKILL pair (`infra-tooling` + `studio-blocks`) updated in lockstep
- ✅ CONVENTIONS pattern bundle pulls together protocol + reducer + render-grouping for future reuse
- ✅ Status flip cascades through 3 docs (WP-036 + ROADMAP + BRIEF)

---

## Brain approval gate

Per saved memory `feedback_close_phase_approval_gate` — Close phases touching
≥3 doc files MUST surface the doc batch for explicit Brain approval before
commit. This batch is **8 doc files** + the Phase 3 result.md.

**Awaiting "OK to commit Phase 3 atomic doc batch" before landing.**

---

## Commit ladder (post-Phase 3)

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit) | logs/wp-036/phase-0-recon-result.md |
| 1 | `feat(studio+block-forge): WP-036 phase 1 — sidebar hover-highlight protocol` | `81de7729` | 14 (10 source + 4 doc) |
| 2 | `feat(studio+block-forge): WP-036 phase 2 — undo fix + heuristic group` | `e09c8cc5` | 16 (12 source + 2 manifest + result.md) |
| 3 (Close) | `docs(wp-036): phase 3 close — PARITY trio + SKILL flips + CONVENTIONS + status flip` | TBD | 9 (8 doc + result.md) |

**Total WP-036 footprint: ~2,100 LOC across 39 files in 3 commits over 1 day.**

---

## What's next

Per the WP-036 Acceptance criteria checklist (15/15 ✅) and the Outcome Ladder
Platinum tier ✅, the workpackage is complete. ADR-025 Layer 2 polish queue
items remaining:

- **WP-034** Inspector cascade-override fix — BACKLOG (chip apply with @container clearing). Independent of WP-036.
- **TweakPanel sunset decision** — Future, surface field data on whether authors prefer Inspector vs TweakPanel.
- **Inspector e2e Playwright coverage** — Future WP per WP-033 Phase 5 Ruling 3 DEFER.

WP-036 ships clean. ADR-025 Layer 2 polish wave continues with WP-034 if/when Brain decides.
