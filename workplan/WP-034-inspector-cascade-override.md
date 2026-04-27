# WP-034 — Inspector Cascade-Override Fix

> **Status:** 📋 BACKLOG (not started)
> **Origin:** WP-033 Phase 4 Open Question 5; Phase 3 Issue #3
> **Estimated effort:** 1–2 phases
> **Layer:** L2 authoring tools (refines WP-033 Inspector chip behaviour)

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

- [ ] Chip apply on a property with pre-existing `@container slot` rules: token visibly applies at **all 3 BPs** (`getComputedStyle` post-apply matches token resolution at each BP).
- [ ] No regression in chip-apply behaviour for properties **without** `@container` conflicts (single bp:0 tweak still emitted, no spurious decl removals).
- [ ] Coordinated cross-surface update — both `tools/block-forge/src/components/TokenChip.tsx` and `apps/studio/.../inspector/TokenChip.tsx` ship together.
- [ ] Tooltip pin updated to reflect the new behaviour (drop the "existing breakpoint overrides may still apply" caveat once cascade is cleared).
- [ ] Add a vitest regression pin proving the cascade-clear emit chain (multi-tweak emit OR rule-removal walk).
- [ ] Live smoke at both surfaces: `.heading` with token → all 3 BPs visibly track the token in the iframe.

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
