# WP-034 — Inspector Cascade-Override Fix

> **Status:** ✅ DONE (Phase 0 RECON + Phase 1 + Phase 2 Close shipped 2026-04-28)
> **Origin:** WP-033 Phase 4 Open Question 5; Phase 3 Issue #3
> **Estimated effort:** 1–2 phases (~6–8h) — actual 2 phases delivered in 1 day
> **Layer:** L2 authoring tools (refines WP-033 Inspector chip behaviour)
> **Completed:** 2026-04-28
> **Path chosen:** A (4-tweak fan-out at canonical BPs)
> **Phase 1 commit:** `ead09eb7`

---

## TL;DR

Inspector's chip-apply (`[Use --h2-font-size ✓]`) emits a single tweak at `{bp:0, value:'var(--token)'}`, but pre-existing `@container slot (max-width: …)` rules at higher specificity continue to override the token at one or more breakpoints. The chip's "fluid token applies at all 3 BPs" promise is therefore true at the *top-level rule* only — a known limitation documented in the Inspector PARITY trio.

WP-034 closes the gap so chip apply also clears (or coordinates with) the conflicting per-BP rules.

---

## Problem (from WP-033 Phase 3 result.md §Issue #3)

**Symptom:** Click `[Use --h2-font-size ✓]` on `.heading` → bp:0 tweak with `var(--h2-font-size)` lands; iframe `getComputedStyle` still resolves to ~42px at 768px width (where the token should resolve to ~37px).

**Diagnosis:** The block CSS often has `@container slot (max-width: 1440px) { .heading { font-size: 42px } }`. When chip-apply emits the var() at top-level, the more-specific `@container` rule wins the cascade. The chip's promise applies at the top-level rule but pre-existing per-BP overrides still take precedence.

**WP-033 decision:** Honest behaviour — chip emits the prompted contract; tooltip pin (Phase 4 Ruling 2) documents the caveat: `"Sets {M}/{T}/{D}px at M/T/D · Note: existing breakpoint overrides may still apply."` PARITY trio "Known limitations" sections cross-reference this WP.

---

## Acceptance criteria

- [x] Chip apply on a property with pre-existing `@container slot` rules: token visibly applies at **all 3 BPs** (`emitTweak` Case C dedupe-update in place — verified via `dispatchInspectorEdit.test.ts` cascade-conflict test + live smoke on `fast-loading-speed.json` `.heading`).
- [x] No regression in chip-apply behaviour for properties **without** `@container` conflicts — Path A always emits 4 tweaks; missing canonical BPs get new `@container` blocks (cosmetic +1-3 blocks; cascade resolves correctly). Documented as Path A tradeoff.
- [x] Coordinated cross-surface update — both `tools/block-forge/src/components/TokenChip.tsx` and `apps/studio/.../inspector/TokenChip.tsx` ship together (commit `ead09eb7`).
- [x] Tooltip pin updated — caveat removed; new format `"Sets X/Y/Z at M/T/D"`.
- [x] Vitest regression pins:
  - Studio `dispatchInspectorEdit.test.ts` +3 tests (apply-token kind 4-tweak emit, cascade-conflict in-place dedupe with sibling preservation, +1 @container creation when canonical BP missing).
  - block-forge `session.test.ts` +2 tests in `WP-034 Path A` describe block.
- [x] Live smoke verified at block-forge `:7702` on `fast-loading-speed.json` `.heading` — chip click → save → file written with `var(--h2-font-size)` at top-level + 3 @container blocks (1440 NEW, 768 + 375 dedupe-updated). Sibling decl `line-height: 36px` in @container 375 preserved.

## Outcome ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Phase 0 RECON empirically debunked WP-034 doc's "Path A pollutes" claim | logs/wp-034/phase-0-recon-result.md |
| Silver | Phase 1 cross-surface 4-tweak fan-out + tooltip caveat removed + 5 new tests | commit `ead09eb7` |
| Gold | Visual smoke on real cascade-conflict fixture verified token applied at all 3 BPs | logs/wp-034/smoke-{1,2}.png |
| Platinum | Phase 2 Close — PARITY trio "Known limitations" → "RESOLVED" + status flip + atomic doc batch | commit `31cb1d43` |
| Diamond (post-WP-034 polish) | Smart Path A scan-then-emit shipped in WP-039 — drops redundant @container blocks on no-conflict sources; behaviour at conflict BPs unchanged | WP-039 commit `d4e17a4c` |

## Commit ladder

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit) | logs/wp-034/phase-0-recon-result.md (shipped Phase 1) |
| 1 | `feat(studio+block-forge): WP-034 phase 1 — Inspector cascade-override fix (Path A)` | `ead09eb7` | 11 (4 source + 4 test + 1 RECON + 2 smoke) |
| 2 (Close) | `docs(wp-034): phase 2 close — PARITY trio "Known limitations" RESOLVED + status flip` | `31cb1d43` | 6 (5 doc + result.md) |

---

## Implementation paths (to be evaluated in Phase 0 RECON)

**Path A — Multi-tweak emit (fan-out).** Chip click dispatches 4 tweaks: `{bp:0, value:'var(--token)'}` + 3 × `{bp:480|768|1440, value:'var(--token)'}`. Pros: single emit primitive (`emitTweak` already exists); test surface narrow. Cons: pollutes `@container slot` rules with redundant decls; doesn't actually *remove* the original conflicting decl.

**Path B — Cascade-clear (rule removal).** Walk the CSS for the active selector + property; for each `@container slot` rule that defines the property, remove the decl (via `removeDeclarationFromCss` already shipped Phase 4); then emit the bp:0 tweak. Pros: clean output (no redundant decls). Cons: more semantic work — author may have intentionally tuned per-BP values that the chip click would silently nuke.

**Path C — Hybrid with confirm modal.** Detect cascade conflict at click time → show a confirm "This token will override your manual values at 480/768/1440px. Continue?" → on confirm, run Path B; on cancel, current Phase 3 behaviour. Pros: respects author intent. Cons: UX friction; confirm modal infrastructure to add.

Brain ruling required at Phase 0 RECON output.

---

## Constraints (locked)

- ❌ No engine package edits (`packages/block-forge-core/**`).
- ❌ No token system edits (`packages/ui/src/**`).
- ❌ No `dispatchTweakToForm` / `dispatchInspectorEdit` contract changes — extend with a new emit type instead if needed.
- ✅ Both surfaces ship in lockstep (block-forge + Studio Inspector).
- ✅ PARITY trio updates remove the "Known limitations" section once chip cascade is fixed.

---

## Cross-references

- WP-033 Phase 3 Issue #3 (`logs/wp-033/phase-3-result.md` §Issues & Workarounds)
- WP-033 Phase 4 Ruling 2 (tooltip pin V1 mitigation)
- WP-033 Phase 4 result.md Open Question 5 (scope ruling: STUB this WP, do NOT implement in WP-033)
- PARITY trio "Known limitations" sections in `tools/block-forge/PARITY.md`, `apps/studio/src/pages/block-editor/responsive/PARITY.md`, `tools/responsive-tokens-editor/PARITY.md`.

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 1h | Probe paths A/B/C; surface vitest+ live-smoke evidence shape |
| 1 Impl | 4–6h | Selected path; cross-surface coordinated edits; tests |
| 2 Close | 1h | Tooltip update; PARITY trio "Known limitations" removal; status flip |

Total: ~6–8h across 1–2 phases.
