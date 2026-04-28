# WP-040 — PropertyRow Row-Shape PARITY Restoration

> **Status:** 🟡 BACKLOG (drafted 2026-04-28 as WP-034/WP-037 polish queue carryover)
> **Origin:** WP-037 Phase 3 result.md + WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 2
> **Estimated effort:** 1 full WP, 4–6h across 2–3 phases
> **Layer:** L2 authoring tools (Inspector PARITY restoration across block-forge + Studio surfaces)
> **Priority:** P2 — restores cross-surface visual parity; current divergence is principled but documented
> **Prerequisites:** WP-037 ✅ DONE (PROPERTY_META SoT mirror established)

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

- [ ] Both `PropertyRow` files ship with **identical visual shape** (decided in Phase 0 RECON: M/T/D grid wins, single-cell wins, or new unified shape).
- [ ] PROPERTY_META mirror invariant preserved (byte-identical, established WP-037).
- [ ] Tooltip integration preserved (established WP-037).
- [ ] PARITY Ruling 1B retired in both PARITY.md files; replaced with §"PropertyRow shape — UNIFIED" section.
- [ ] No regression in chip-apply behavior, hover-suggestion → highlight target (WP-036), or any Inspector UX feature delivered post-WP-033.
- [ ] Vitest regression pins:
  - Studio `PropertyRow.test.tsx` updated to match shape.
  - block-forge `PropertyRow.test.tsx` updated to match shape.
  - +1 cross-surface snapshot test (or rendered-output equivalence test) confirming PARITY.
- [ ] Visual smoke: open block in both surfaces, click same property, screenshot pair shows pixel-equivalent (modulo theme) rows.

---

## Decision matrix (Phase 0 RECON output)

| Option | Pros | Cons |
|---|---|---|
| **A — M/T/D grid wins** (Studio shape replaces Forge single-cell) | Authors see all 3 BPs at once; matches Studio production shape | Forge sandbox loses focus-on-active-BP UX; row height triples |
| **B — Single-cell wins** (Forge shape replaces Studio M/T/D) | Compact UX; clear "active BP" signal | Studio loses multi-BP overview; authors must switch BPs to see other values |
| **C — Hybrid** (single-cell with M/T/D mini-preview; or M/T/D with active highlight) | Best-of-both | More LOC; new design pattern to maintain |
| **D — Formalize divergence** (don't restore PARITY; codify Ruling 1B as permanent PARITY exemption) | Zero code change; honest about UX context difference | Carries divergence forward; future WPs must account for it |

Brain ruling required at Phase 0 RECON.

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

## Cross-references

- WP-037 Phase 3 result.md (PARITY Ruling 1B formalization)
- WP-037 PARITY trio sections in both `PARITY.md` files
- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 2
- WP-036 hover-suggestion → highlight target (must not regress)
