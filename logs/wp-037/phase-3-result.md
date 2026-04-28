# WP-037 Phase 3 (Close) — Result

> **Phase:** 3 (Close — PARITY trio + SKILL flips + CONVENTIONS pattern + status flip + atomic doc batch)
> **Date:** 2026-04-28
> **Workpackage:** WP-037 Inspector Typed Inputs + Property Tooltips
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — atomic doc batch ready for Brain approval gate
> **Pre-flight commit:** `3a4f345c`
> **Phase 1 commit:** `b49c2cd7`
> **Phase 2 commit:** `37acf1a6`

---

## TL;DR

Doc-only Close phase. 8 doc files updated to record WP-037 as the canonical
"Inspector Typed Inputs + Property Tooltips" reference across PARITY trio +
SKILL trio + CONVENTIONS patterns + status flip in WP doc + ROADMAP +
BRIEF status row. Zero source edits. Atomic commit per
`feedback_close_phase_approval_gate` Brain-approval gate (≥3 doc files
threshold).

---

## Files updated (atomic batch)

| File | Section added | LOC delta |
|---|---|---|
| `tools/block-forge/PARITY.md` | §Inspector Typed Inputs + Tooltips (WP-037) — PROPERTY_META schema + Tooltip primitive + PARITY divergence ruling | ~+95 |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | §Inspector Typed Inputs + Tooltips (WP-037) — Studio-side mirror + active-cell-only select rendering | ~+70 |
| `.claude/skills/domains/infra-tooling/SKILL.md` | §Inspector typed inputs + tooltips — Start Here / Invariants / Traps / Blast Radius / Recipes | ~+45 |
| `.claude/skills/domains/studio-blocks/SKILL.md` | §Inspector typed inputs + tooltips cross-surface mirror — Studio-specific traps + recipes | ~+35 |
| `.claude/skills/domains/pkg-ui/SKILL.md` | Tooltip primitive recipe block (compound + convenience APIs) | ~+30 |
| `.context/CONVENTIONS.md` | §Inspector typed inputs + Tooltip primitive (WP-037) — 2-pattern bundle (PROPERTY_META SoT + Radix Tooltip primitive) | ~+115 |
| `workplan/WP-037-inspector-typed-inputs.md` | Status PLAN → ✅ DONE; Outcome Ladder; Commit Ladder; AC checkmarks (15/15) | ~30 mod |
| `.context/ROADMAP.md` | Deferred entry: PLAN → ✅ DONE | 1 mod |
| `.context/BRIEF.md` | Sprint status row: PLAN → ✅ DONE | 1 mod |

**Total: ~420 LOC across 9 doc files. Zero source files. Zero test files.**

Plus this `phase-3-result.md` (#10) for the Phase 3 record.

---

## Cross-file drift audit (per `feedback_close_phase_approval_gate`)

9 doc files cross-checked for consistency on the following invariants:

### 1. PROPERTY_META schema shape
- ✅ `tools/block-forge/PARITY.md` — full schema TS block
- ✅ `apps/studio/.../PARITY.md` — references mirror + cross-link
- ✅ `infra-tooling/SKILL.md` — Start Here line + invariant
- ✅ `studio-blocks/SKILL.md` — same
- ✅ `CONVENTIONS.md` — Pattern 1 with TS block
- ✅ `WP-037 doc` — AC #2 references PROPERTY_META

### 2. Initial enum properties (4 entries)
- ✅ `display`, `flex-direction`, `align-items`, `justify-content` consistent across all 9 docs
- ✅ `grid-template-columns` explicitly excluded as out-of-scope (free-form template, not enum) in PARITY-bf + CONVENTIONS

### 3. Custom-value fallback (Phase 0 RECON Ruling 4B)
- ✅ All 5 references (PARITY-bf, PARITY-studio, infra-tooling SKILL, CONVENTIONS, WP-037 doc) use the exact same wording: "disabled `<option>` labeled `<value> (custom)`"

### 4. Tooltip primitive defaults
- ✅ `delayDuration={400}`, `skipDelayDuration={150}`, `side="right"`, `align="start"`, `sideOffset={8}`, `avoidCollisions=true` consistent across PARITY-bf, pkg-ui SKILL, CONVENTIONS

### 5. Tokens used
- ✅ `--popover` / `--popover-foreground` / `--shadow-md` / `--rounded-md` / `--spacing-xs` / `--spacing-2xs` / `--text-xs-font-size` / `--text-xs-line-height` consistent across PARITY-bf + CONVENTIONS + WP-037 AC

### 6. PARITY divergence formalization (Ruling 1B)
- ✅ Both PARITY.md files declare the divergence + corrected scope of "byte-identical" claim
- ✅ infra-tooling SKILL + studio-blocks SKILL describe same divergence
- ✅ WP-037 AC checkbox marked as "formalized per Phase 0 Ruling 1B"

### 7. Test wrapper helpers
- ✅ `renderRow` / `renderPanel` / `renderInspector` patterns documented in studio-blocks SKILL + CONVENTIONS
- ✅ `rerender()` wrapping caveat documented in infra-tooling SKILL Traps + CONVENTIONS

### 8. Status flip
- ✅ workplan/WP-037 — Status: ✅ DONE
- ✅ ROADMAP Deferred entry — ✅ DONE 2026-04-28
- ✅ BRIEF status table — Inspector Typed Inputs + Tooltips ✅ DONE row updated

### 9. Test count totals (cross-doc consistency)
- Pre-flight: 54 tests on Inspector trio at block-forge (regen)
- Phase 1: +20 enum tests across 2 surfaces (11 block-forge + 9 Studio)
- Phase 2: +8 tooltip tests across 2 surfaces (4 each)
- Total WP-037 new tests: +28 across cross-surface mirror
- arch-test: 588 → 595 (+7 from WP-035 +5 + WP-037 +3 — 2 property-meta files + 1 tooltip primitive)

### 10. Commit SHAs
- Pre-flight: `3a4f345c` — pinned in commit ladder + Phase 0 RECON result.md
- Phase 1: `b49c2cd7` — pinned in commit ladder
- Phase 2: `37acf1a6` — pinned in commit ladder + Phase 3 result.md
- Phase 3: TBD — backfilled into commit ladder post-commit

**Audit conclusion:** zero drift detected across 9 doc files. All references
to PROPERTY_META schema, enum entries, custom-value fallback, Tooltip
defaults, tokens, PARITY divergence, test patterns, status, test counts,
and commit SHAs are mutually consistent.

---

## Constraints re-confirmed (all green)

- ✅ Zero source edits — Phase 3 is doc-only
- ✅ Zero test edits — no behaviour changes; existing tests already passing (Studio 298 + block-forge Inspector trio 54 = 352)
- ✅ arch-test still 595/595 (manifest unchanged in Phase 3)
- ✅ PARITY trio (`tools/block-forge/PARITY.md` + `apps/studio/.../PARITY.md`) updated in lockstep
  - `tools/responsive-tokens-editor/PARITY.md` not affected — no Inspector consumer changes there
- ✅ SKILL trio (`infra-tooling` + `studio-blocks` + `pkg-ui`) updated — pkg-ui added because Tooltip primitive is its first DS-level tooltip
- ✅ CONVENTIONS pattern bundle pulls together PROPERTY_META + Tooltip primitive for future reuse
- ✅ Status flip cascades through 3 docs (WP-037 + ROADMAP + BRIEF)

---

## Out-of-scope items flagged (separate concerns)

Phase 0/1/2 surfaced two pre-existing block-forge issues NOT introduced by
WP-037 — neither blocks WP-037 close. Both are post-WP-035 ExportDialog
drift:

1. **`tools/block-forge/src/__tests__/app-save-regression.test.tsx`** — 2
   tests fail on TweakPanel BP button lookup timeout. WP-035 Phase 3
   landed sandbox decouple + Clone affordance which appears to have
   changed timing or render gating around TweakPanel mount. Tests pre-date
   WP-037 work.
2. **`tools/block-forge/src/__tests__/integration.test.tsx:217`** —
   typecheck error on missing `onExport / onClone / cloneInFlight` props
   for ExportDialog. WP-035 Phase 3 added these as required props but
   the integration test fixture wasn't updated.

Tracking option: spawn a small follow-up WP "fix(block-forge): repair
post-WP-035 ExportDialog drift" with both fixes in one commit. NOT
required for WP-037 close — these failures predate WP-037 and are
unrelated to typed inputs / tooltips.

---

## Brain approval gate

Per saved memory `feedback_close_phase_approval_gate` — Close phases
touching ≥3 doc files MUST surface the doc batch for explicit Brain
approval before commit. This batch is **9 doc files** + the Phase 3
result.md.

**Awaiting "OK to commit Phase 3 atomic doc batch" before landing.**

---

## Commit ladder (post-Phase 3)

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit) | logs/wp-037/phase-0-recon-result.md (shipped Phase 1) |
| Pre-flight | `feat(block-forge): WP-033 post-close polish — single-cell Inspector` | `3a4f345c` | 10 (5 source + 3 test + 2 snapshot) |
| 1 | `feat(studio+block-forge): WP-037 phase 1 — Inspector typed enum inputs` | `b49c2cd7` | 13 (4 source + 4 test + 1 manifest + 4 doc) |
| 2 | `feat(ui+studio+block-forge): WP-037 phase 2 — Tooltip primitive + label hints` | `37acf1a6` | 23 (5 source + 6 test + 1 manifest + 5 smoke + 6 misc) |
| 3 (Close) | `docs(wp-037): phase 3 close — PARITY trio + SKILL flips + CONVENTIONS + status flip` | TBD | 10 (9 doc + result.md) |

**Total WP-037 footprint: ~2,200 LOC across 56 files in 4 commits over 1 day.**

---

## What's next

Per the WP-037 Acceptance criteria checklist (15/15 ✅) and the Outcome
Ladder Platinum tier ✅, the workpackage is complete.

ADR-025 Layer 2 polish queue items remaining:

- **WP-034** Inspector cascade-override fix — BACKLOG (chip apply with @container clearing). Independent of WP-037.
- **Post-WP-035 ExportDialog drift fix** — small follow-up WP candidate (2 test failures + 1 typecheck error). Surfaced by WP-037 Phase 0 RECON; not blocking.
- **PropertyRow row-shape PARITY restoration** — separate larger WP candidate. WP-037 formalized the divergence; restoring it (porting Studio to single-cell or block-forge to M/T/D) would be its own dedicated WP.
- **Tooltip primitive portal-wide rollout** — beyond Inspector, future WPs can consume `Tooltip` from `@cmsmasters/ui` for any label-info pattern. First portal use beyond Inspector becomes a new pattern adoption point.
- **Inspector e2e Playwright coverage** — Future WP per WP-033 Phase 5 Ruling 3 DEFER (carry-forward from WP-036).

WP-037 ships clean. ADR-025 Layer 2 polish wave continues with WP-034 if/when Brain decides.
