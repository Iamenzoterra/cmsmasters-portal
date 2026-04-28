# WP-040 — PropertyRow Row-Shape PARITY Restoration

> **Status:** ✅ DONE (Phase 0 RECON + Phase 1 + Phase 2 Close shipped 2026-04-28)
> **Origin:** WP-037 Phase 3 result.md + WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 2
> **Estimated effort:** 1 full WP, 4–6h across 2–3 phases — actual ~80 LOC source delta + test mirror in 2 phases over 1 day
> **Layer:** L2 authoring tools (Inspector PARITY restoration across block-forge + Studio surfaces)
> **Priority:** P2 — restored cross-surface visual parity; WP-037 Ruling 1B retired
> **Prerequisites:** WP-037 ✅ DONE (PROPERTY_META SoT mirror established)
> **Path chosen:** B (single-cell wins; Studio adopts Forge shape)
> **Completed:** 2026-04-28
> **Phase 1 commit:** `a8275e25`

---

## TL;DR

`PropertyRow` ships in two shapes today:

- **block-forge** (`tools/block-forge/src/components/PropertyRow.tsx`) — single-cell layout: one input/select for the active BP only.
- **Studio** (`apps/studio/.../inspector/PropertyRow.tsx`) — M/T/D 3-cell grid: three inputs side-by-side for mobile/tablet/desktop.

The divergence is formalized as **PARITY Ruling 1B** (WP-037): row-shape is principled (Forge sandbox = single-BP focus authoring; Studio = multi-BP overview). Content-meta (PROPERTY_META, Tooltip, label, kind, options) is shape-agnostic and mirrored byte-identically.

WP-040 restores row-shape PARITY by aligning both surfaces to the same shape (or formally retiring the divergence). Decision in Phase 0 RECON: which shape wins, or do they both need a third unified shape.

---

## Problem (from WP-034 phase-2-result.md §What's next)

> **PropertyRow row-shape PARITY restoration** — separate larger WP candidate (carryover from WP-037 phase-3-result.md). Block-forge single-cell vs Studio M/T/D grid divergence persists.

---

## Acceptance criteria

- [x] Both `PropertyRow` files ship with **identical visual shape** — single-cell wins (Brain ruling Option B). Body byte-identical mod 3-line JSDoc + `'./property-meta'` import.
- [x] PROPERTY_META mirror invariant preserved (byte-identical, WP-037 baseline).
- [x] Tooltip integration preserved (WP-037).
- [x] PARITY Ruling 1B retired in both PARITY.md files; replaced with §"PropertyRow shape — UNIFIED (WP-040)" section.
- [x] No regression in chip-apply behavior, hover-suggestion → highlight target (WP-036), or any Inspector UX feature delivered post-WP-033 — gates GREEN at every commit.
- [x] Vitest regression pins:
  - Studio `PropertyRow.test.tsx` rewritten to mirror Forge byte-equivalent (39 tests).
  - Studio `inspector-cell-edit.test.tsx` rewritten to mirror Forge byte-equivalent (12 tests).
  - block-forge `PropertyRow.test.tsx` unchanged (canonical shape; mirror target).
- [x] Visual smoke: `logs/wp-040/smoke-{1-forge,2-studio,2-studio-inspector}.png` — Forge `:7702` + Studio `:5173` on `fast-loading-speed` `.heading` show single-cell rows with identical anatomy.

---

## Decision matrix (Phase 0 RECON output)

| Option | Pros | Cons |
|---|---|---|
| **A — M/T/D grid wins** (Studio shape replaces Forge single-cell) | Authors see all 3 BPs at once; matches Studio production shape | Forge sandbox loses focus-on-active-BP UX; row height triples |
| **B ⭐ — Single-cell wins** (Forge shape replaces Studio M/T/D) | Compact UX; clear "active BP" signal; Forge shape carries richer affordances (parseValueUnit/normalizeWithUnit, ↺ revert slot) | Studio loses multi-BP overview; authors must switch BPs to see other values |
| **C — Hybrid** (single-cell with M/T/D mini-preview; or M/T/D with active highlight) | Best-of-both | More LOC; new design pattern to maintain |
| **D — Formalize divergence** (don't restore PARITY; codify Ruling 1B as permanent PARITY exemption) | Zero code change; honest about UX context difference | Carries divergence forward; future WPs must account for it |

**Brain ruling: Option B (single-cell wins).** Empirical UX precedent
(Forge migrated from M/T/D to single-cell driven by user feedback);
BP picker is canonical on both surfaces (M/T/D grid duplicates the
affordance); Forge shape is more complete; lowest LOC + risk; PARITY
trio "byte-identical mod 3-line JSDoc" claim restored. Full RECON evidence
in `logs/wp-040/phase-0-recon-result.md`.

---

## Constraints

- ✅ Both surfaces ship in lockstep.
- ✅ PROPERTY_META mirror invariant preserved.
- ✅ Tooltip primitive (`@cmsmasters/ui`) consumption preserved.
- ❌ No PROPERTY_META schema changes — content-meta is shape-agnostic.
- ❌ No `dispatchInspectorEdit` / `dispatchTweakToForm` contract changes.

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 1h | Audit current shape divergence; surface decision matrix; Brain ruling on Option A/B/C/D |
| 1 Impl | 2–3h | Selected option; cross-surface coordinated edits; tests; visual smoke |
| 2 Close | 1h | PARITY trio Ruling 1B retirement / replacement; status flip; WP-037 Outcome Ladder note |

Total: ~4–5h across 2–3 phases.

---

## Outcome Ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Phase 0 RECON empirically validated Option B (single-cell wins) — both surfaces have identical BP picker; M/T/D cells redundant | `logs/wp-040/phase-0-recon-result.md` |
| Silver | Phase 1 Studio surface ported byte-equivalent to Forge mod JSDoc — PropertyRow + InspectorPanel + 51 tests rewritten | commit `a8275e25` |
| Gold | All gates GREEN: core 81/81, Studio 317/317, Forge 363/363+6 skipped, arch-test 597/597, both surfaces tsc CLEAN, DS lint clean | `logs/wp-040/phase-1-result.md` |
| Platinum | Phase 2 Close — PARITY trio Ruling 1B RETIRED + status flip + atomic doc batch | this commit (Phase 2 SHA) |

---

## Commit Ladder

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit — shipped with Phase 1) | `logs/wp-040/phase-0-recon-result.md` |
| 1 | `feat(studio): WP-040 phase 1 — port Studio Inspector to single-cell row shape (Path B)` | `a8275e25` | 11 (2 source + 4 test/snapshot + 5 RECON+result+smoke) |
| 2 (Close) | `docs(wp-040): phase 2 close — PARITY trio Ruling 1B RETIRED + status flip` | TBD | 5 (PARITY pair + WP-040 doc + WP-037 doc + ROADMAP) + result.md |

**Total WP-040 footprint: ~80 LOC source delta + test mirror across 2 commits over 1 day.**

---

## Cross-references

- WP-037 Phase 3 result.md (PARITY Ruling 1B formalization — now retired by WP-040)
- WP-037 PARITY trio sections in both `PARITY.md` files (updated Phase 2 Close)
- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 2
- WP-036 hover-suggestion → highlight target (must not regress — verified GREEN)
- Forge canonical PropertyRow + InspectorPanel: `tools/block-forge/src/components/`
