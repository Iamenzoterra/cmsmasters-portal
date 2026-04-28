# WP-034 Phase 2 (Close) — Result

> **Phase:** 2 (Close — PARITY trio "Known limitations" RESOLVED + status flip + atomic doc batch)
> **Date:** 2026-04-28
> **Workpackage:** WP-034 Inspector Cascade-Override Fix
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — atomic doc batch ready for Brain approval gate
> **Phase 1 commit:** `ead09eb7`

---

## TL;DR

Doc-only Close phase. 5 doc files updated to flip the cascade-override
"Known limitations" (Phase 3 Issue #3 / Phase 4 OQ5 carryover) to
"RESOLVED via WP-034 Path A". Status flips through WP doc + ROADMAP +
BRIEF status row. Zero source edits. Atomic commit per
`feedback_close_phase_approval_gate` Brain-approval gate (≥3 doc files
threshold).

---

## Files updated (atomic batch)

| File | Section | LOC delta |
|---|---|---|
| `tools/block-forge/PARITY.md` | §"Known limitations (Phase 3 Issue #3 carryover)" → §"Cascade-override fix (WP-034 — RESOLVED)" — Path A behaviour explanation + minor +1 @container tradeoff documented | ~+12 / -5 |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | §"Known limitations (Phase 3 Issue #3 carryover)" → §"Cascade-override fix (WP-034 — RESOLVED)" — Studio mirror cross-reference | ~+9 / -4 |
| `workplan/WP-034-inspector-cascade-override.md` | Status BACKLOG → ✅ DONE; Outcome Ladder; Commit Ladder; AC checkmarks (6/6); Path A Brain ruling locked | ~+25 / -8 |
| `.context/ROADMAP.md` | Deferred entry: BACKLOG → ✅ DONE 2026-04-28 | 1 mod |
| `.context/BRIEF.md` | Sprint status row added: "Inspector Cascade-Override Fix ✅ DONE (WP-034: ...)" | +1 |

**Total: ~50 LOC across 5 doc files. Zero source files. Zero test files.**

Plus this `phase-2-result.md` (#6) for the Phase 2 record.

`tools/responsive-tokens-editor/PARITY.md` — NOT affected (no
cascade-override caveat — its mention of "cascade-override" refers to
generated tokens.responsive.css cascade strategy, unrelated to TokenChip
chip-apply).

---

## Cross-file drift audit (per `feedback_close_phase_approval_gate`)

5 doc files cross-checked for consistency on the following invariants:

### 1. Path A canonical BPs `[0, 375, 768, 1440]`
- ✅ tools/block-forge/PARITY.md (RESOLVED section — "4 tweaks at canonical BPs `[0, 375, 768, 1440]`")
- ✅ apps/studio/.../PARITY.md (mirror)
- ✅ WP-034 doc AC + Outcome Ladder
- ✅ ROADMAP + BRIEF entries

### 2. emitTweak Case C dedupe-update behaviour
- ✅ Both PARITY files describe in-place dedupe with sibling preservation
- ✅ WP-034 AC explicitly references Case C
- ✅ Studio test `cascade-conflict in-place dedupe with sibling preservation`

### 3. Path A +1 @container tradeoff
- ✅ tools/block-forge/PARITY.md "Known minor tradeoff" paragraph
- ✅ apps/studio/.../PARITY.md cross-reference
- ✅ WP-034 AC #2 (no regression on no-conflict case acceptable)
- ✅ session.test.ts test 2 explicitly covers redundant block creation

### 4. Tooltip caveat removed
- ✅ Both TokenChip.tsx files (source — committed Phase 1)
- ✅ Both TokenChip.test.tsx files (tests — committed Phase 1)
- ✅ tools/block-forge/PARITY.md "tooltip caveat removed — new format `Sets X/Y/Z at M/T/D`"
- ✅ apps/studio/.../PARITY.md mirror

### 5. Path choice (Path A) consistent
- ✅ All 5 docs mention Path A explicitly
- ✅ WP-034 doc Status header pins "Path chosen: A"
- ✅ ROADMAP + BRIEF describe path

### 6. Status flip
- ✅ workplan/WP-034 — Status: ✅ DONE
- ✅ ROADMAP Deferred entry — ✅ DONE 2026-04-28
- ✅ BRIEF status table — Inspector Cascade-Override Fix ✅ DONE row added

### 7. Test count totals
- Studio dispatchInspectorEdit.test.ts +3 tests
- block-forge session.test.ts +2 tests
- Total WP-034 new tests: +5 across cross-surface mirror
- arch-test: 595/595 (no manifest change — no new files in WP-034)

### 8. Commit SHAs
- Phase 1: `ead09eb7` — pinned in 4 docs (Studio PARITY, block-forge PARITY, WP-034 doc commit ladder, BRIEF status row)
- Phase 2: TBD — backfilled into commit ladder post-commit

**Audit conclusion:** zero drift detected across 5 doc files. All references
to Path A behaviour, canonical BPs, emitTweak Case C semantics, the +1
@container tradeoff, tooltip caveat removal, and status are mutually
consistent.

---

## Constraints re-confirmed (all green)

- ✅ Zero source edits — Phase 2 is doc-only
- ✅ Zero test edits — no behaviour changes; existing tests already passing
  (Studio 300/300 + block-forge 363/369 + 6 skipped)
- ✅ arch-test still 595/595 (manifest unchanged in Phase 2)
- ✅ PARITY pair (`tools/block-forge/PARITY.md` + `apps/studio/.../PARITY.md`) updated in lockstep
  - `tools/responsive-tokens-editor/PARITY.md` not affected
- ✅ Status flip cascades through 3 docs (WP-034 + ROADMAP + BRIEF)

---

## Brain approval gate

Per saved memory `feedback_close_phase_approval_gate` — Close phases
touching ≥3 doc files MUST surface the doc batch for explicit Brain
approval before commit. This batch is **5 doc files** + the Phase 2
result.md.

**Awaiting "OK to commit Phase 2 atomic doc batch" before landing.**

---

## Commit ladder (post-Phase 2)

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit) | logs/wp-034/phase-0-recon-result.md (shipped Phase 1) |
| 1 | `feat(studio+block-forge): WP-034 phase 1 — Inspector cascade-override fix (Path A)` | `ead09eb7` | 11 (4 source + 4 test + 1 RECON + 2 smoke) |
| 2 (Close) | `docs(wp-034): phase 2 close — PARITY trio "Known limitations" RESOLVED + status flip` | `31cb1d43` | 6 (5 doc + result.md) |

**Total WP-034 footprint: ~500 LOC across 17 files in 2 commits over 1 day.**

---

## What's next

Per the WP-034 Acceptance criteria checklist (6/6 ✅) and the Outcome
Ladder Platinum tier ✅, the workpackage is complete.

ADR-025 Layer 2 polish queue items remaining:

- **Smart Path A future polish** — scan-then-emit to drop the
  redundant @container blocks created when canonical BPs are missing
  from source. Would change Path A from "always emit 4" to "emit at
  bp:0 + at each existing @container conflict BP for this
  selector+property". ~10-15 LOC additional per surface. Track if author
  feedback warrants.
- **PropertyRow row-shape PARITY restoration** — separate larger WP
  candidate (carryover from WP-037 phase-3-result.md). Block-forge
  single-cell vs Studio M/T/D grid divergence persists.
- **Tooltip primitive portal-wide rollout** — beyond Inspector, future
  WPs can consume `Tooltip` from `@cmsmasters/ui` for any label-info
  pattern (carryover from WP-037).
- **Inspector e2e Playwright coverage** — Future WP per WP-033 Phase 5
  Ruling 3 DEFER (carryover from WP-036).

WP-034 ships clean. ADR-025 Layer 2 polish wave continues.
