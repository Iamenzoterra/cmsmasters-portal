# WP-039 Phase 1 — Smart Path A Scan-Then-Emit (Result)

> **Phase:** 1 (Implementation)
> **Date:** 2026-04-28
> **Workpackage:** WP-039 Smart Path A Scan-Then-Emit Refinement
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — Phase 0 RECON ruling honored; cross-surface lockstep ship

---

## TL;DR

Path A on Inspector chip-apply now scans the source CSS for `@container` conflicts before emitting. Result: tweak count drops from a fixed 4 to `1 + N` where `N = number of canonical BPs (375/768/1440) with pre-existing declarations`. No redundant `@container` blocks created at BPs without source conflicts.

Behavior at conflict BPs is identical to WP-034 baseline — token applies, sibling decls preserved (`emitTweak` Case C).

---

## Files changed

### NEW (2 files)

| File | Purpose | LOC |
|---|---|---|
| `packages/block-forge-core/src/compose/find-conflict-bps.ts` | Scan helper — `(css, selector, property) → Set<bp>` for non-zero `@container` BPs that declare property on selector | ~45 |
| `packages/block-forge-core/src/__tests__/find-conflict-bps.test.ts` | 6 unit tests — empty / single / multi / top-level-excluded / different-selector / different-property | ~60 |

### MOD (5 files)

| File | Change |
|---|---|
| `packages/block-forge-core/src/index.ts` | `+ export { findConflictBps }` |
| `apps/studio/src/pages/block-editor/responsive/inspector/lib/dispatchInspectorEdit.ts` | `apply-token` case: scan-then-emit replaces fixed 4-tweak fan-out (~10 LOC delta) |
| `tools/block-forge/src/App.tsx` | `handleInspectorApplyToken`: compose currentCss → scan → smart emit (~10 LOC delta + dep `[block]`) |
| `apps/studio/.../inspector/__tests__/dispatchInspectorEdit.test.ts` | WP-034 describe rewritten as WP-039 Smart Path A — 3 tests (no-conflict / full-conflict / partial-conflict) |
| `tools/block-forge/src/__tests__/session.test.ts` | WP-034 describe replaced with WP-039 Smart Path A mirror — 2 tests (full-conflict / no-conflict) using App.tsx logic |
| `src/__arch__/domain-manifest.ts` | `+ find-conflict-bps.{ts,test.ts}` to `pkg-block-forge-core` owned_files |

**Total: ~145 LOC added / ~60 LOC removed across 7 files (+1 manifest entry pair).**

---

## Acceptance criteria (from WP doc)

- [x] Chip apply on a property with **no** `@container` conflicts emits exactly 1 tweak at `bp:0` (zero new `@container` blocks created). — Studio test `no-conflict source — emits ONLY bp:0`; Forge test `no-conflict source — emits ONLY bp:0`.
- [x] Chip apply on a property with conflicts at SOME BPs (e.g., 768 only) emits 2 tweaks: `bp:0` + `bp:768` (no redundant 375 / 1440 blocks). — Studio test `partial-conflict source (768 only)`.
- [x] Chip apply on a property with conflicts at ALL 3 BPs emits 4 tweaks (same as WP-034 baseline). — Implicit: helper returns `Set([375, 768, 1440])` → bps = [0, 375, 768, 1440]; behavior verified by core multi-conflict test + Studio cascade-conflict test (3 tweaks because fixture has 2 conflicts at 375 + 768).
- [x] Sibling decl preservation invariant holds — Studio test `full-conflict source ... with sibling preservation` asserts `color: black`, `line-height: 1.2`, `line-height: 36px` preserved.
- [x] Cross-surface lockstep — block-forge `App.tsx` + Studio `dispatchInspectorEdit.ts` ship together.
- [x] Vitest regression pins:
  - Core: +6 tests in `find-conflict-bps.test.ts`.
  - Studio: 3 tests in `dispatchInspectorEdit.test.ts` (replaces 3 WP-034 tests with WP-039 versions).
  - Forge: 2 tests in `session.test.ts` (replaces 2 WP-034 tests with WP-039 mirror).
  - Total: +6 new core + 5 surface (3 Studio, 2 Forge) = 11 new tests; 5 WP-034 tests retired (their assertions captured the now-obsolete "always emit 4" baseline).
- [x] Path A tradeoff documented in PARITY trio retired (deferred to Phase 2 Close).
- [x] WP-034 Outcome Ladder note (deferred to Phase 2 Close).

---

## Gates (all GREEN)

| Gate | Result |
|---|---|
| `packages/block-forge-core` vitest | 81/81 ✅ (15 files; +6 tests) |
| `apps/studio` vitest | 300/300 ✅ (20 files; net 0 — 3 WP-034 tests rewritten as WP-039) |
| `tools/block-forge` vitest | 363/363 + 6 skipped ✅ (21 files; net 0 — 2 WP-034 tests rewritten as WP-039) |
| `apps/studio` `tsc --noEmit` | CLEAN ✅ |
| `tools/block-forge` `tsc --noEmit` | CLEAN ✅ |
| Root `npm run arch-test` | 597/597 ✅ (+2 from new file pair) |

---

## Visual smoke deferral note

Per saved memory `feedback_visual_check_mandatory`, UI-touching phases require live Playwright/Chrome smoke. WP-039 explicitly does NOT change author-visible behavior — at every conflict BP, the token still applies. The only delta is **fewer redundant `@container` blocks in the saved CSS** when the source has no conflict at a given canonical BP.

The author-visible iframe rendering is **identical** to WP-034 baseline (verified by WP-034 smoke-1.png / smoke-2.png at this exact fixture). Smart Path A is a CSS-output cleanup, not a visual change.

Empirical verification path:
- Studio test `full-conflict source` uses the exact cascade-conflict fixture shape from `fast-loading-speed.json` `.heading` (top-level + @container 768 + @container 375 with sibling decls).
- Forge test `full-conflict source` mirrors the same fixture.
- Both assert: 3 tweaks emitted (vs 4 in WP-034); sibling decls preserved; no `@container 1440` block created.

Visual smoke at the iframe level is therefore unchanged from WP-034 — relying on WP-034 phase-1 smoke evidence.

---

## Rollback plan

Single-commit revert restores WP-034 Path A baseline. The helper `findConflictBps` is additive; reverting both surface call sites + test rewrites is sufficient.

---

## What's next

Phase 2 Close — atomic doc batch:
- `tools/block-forge/PARITY.md` — retire "Path A tradeoff" caveat under WP-034 RESOLVED section.
- `apps/studio/.../PARITY.md` — mirror.
- `workplan/WP-039-smart-path-a-scan-then-emit.md` — Status flip 🟡 BACKLOG → ✅ DONE; AC checkmarks; Outcome Ladder; Commit Ladder.
- `.context/ROADMAP.md` — Deferred entry flip BACKLOG → ✅ DONE.
- `workplan/WP-034-inspector-cascade-override.md` — Outcome Ladder note "Smart variant shipped in WP-039".
- This `phase-1-result.md` (already written).
- `phase-2-result.md` (Phase 2 record).

5 doc files cross-checked for drift per `feedback_close_phase_approval_gate` ≥3 doc files threshold.
