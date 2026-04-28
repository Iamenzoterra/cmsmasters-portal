# WP-039 — Smart Path A: Scan-Then-Emit Refinement

> **Status:** ✅ DONE (Phase 0 RECON + Phase 1 + Phase 2 Close shipped 2026-04-28)
> **Origin:** WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 1
> **Estimated effort:** 1 phase + close (~2–3h, ~30 LOC across 2 surfaces + tests) — actual ~145 LOC across 7 files in 2 phases over 1 day
> **Layer:** L2 authoring tools (refines WP-034 Inspector chip cascade-override fix)
> **Priority:** P3 — cosmetic; only triggered if author feedback flags Path A's verbose output as noisy
> **Prerequisites:** WP-034 ✅ DONE (Path A baseline shipped)
> **Completed:** 2026-04-28
> **Phase 1 commit:** `d4e17a4c`

---

## TL;DR

WP-034 Path A always emits 4 tweaks at canonical BPs `[0, 375, 768, 1440]` on chip-apply. When the source CSS has no `@container` rule at a given BP, this creates a redundant block (e.g., emits a `@container slot (max-width: 1440px) { .heading { font-size: var(--h2-font-size) } }` even if no other `font-size` decl existed at 1440). Cascade resolves correctly — the redundant block is functionally a no-op — but the output is verbose by 1–3 blocks per chip click.

WP-039 makes Path A "smart": scan the CSS for the active `selector + property` first, then emit only at `bp:0` + at each BP where a conflict already exists. Output stays minimal; behavior unchanged.

---

## Problem (from WP-034 phase-2-result.md §What's next)

> **Smart Path A future polish** — scan-then-emit to drop the redundant @container blocks created when canonical BPs are missing from source. Would change Path A from "always emit 4" to "emit at bp:0 + at each existing @container conflict BP for this selector+property". ~10–15 LOC additional per surface. Track if author feedback warrants.

This is documented as a Path A tradeoff in both PARITY trio files (`tools/block-forge/PARITY.md`, `apps/studio/.../PARITY.md`) under the WP-034 RESOLVED section.

---

## Acceptance criteria

- [x] Chip apply on a property with **no** `@container` conflicts emits exactly 1 tweak at `bp:0` (zero new `@container` blocks created). — Studio + Forge tests `no-conflict source — emits ONLY bp:0`.
- [x] Chip apply on a property with conflicts at SOME BPs (e.g., 768 only) emits 2 tweaks: `bp:0` + `bp:768` (no redundant 375 / 1440 blocks). — Studio test `partial-conflict source (768 only)`.
- [x] Chip apply on a property with conflicts at ALL 3 BPs still resolves to all-applied (4-tweak emit, same as WP-034 baseline). — Implicit via core multi-conflict test + helper signature contract.
- [x] Sibling decl preservation invariant holds (same as WP-034 — `emitTweak` Case C dedupe-update semantics). — Studio + Forge full-conflict tests assert `color: black`, `line-height: 1.2`, `line-height: 36px` preserved.
- [x] Cross-surface lockstep — both `tools/block-forge/src/App.tsx` `handleInspectorApplyToken` and `apps/studio/.../inspector/lib/dispatchInspectorEdit.ts` `apply-token` case ship together (commit `d4e17a4c`).
- [x] Vitest regression pins:
  - Core `find-conflict-bps.test.ts` +6 tests (NEW file).
  - Studio `dispatchInspectorEdit.test.ts` 3 WP-039 tests (rewriting 3 stale WP-034 tests — same describe slot).
  - block-forge `session.test.ts` 2 WP-039 tests in `WP-039 Smart Path A` describe block (rewriting 2 stale WP-034 tests).
- [x] PARITY trio "Path A tradeoff" paragraph removed; replaced with smart-emit description (Phase 2 Close).
- [x] WP-034 Outcome Ladder note: "Smart variant shipped in WP-039" (Phase 2 Close).

---

## Implementation sketch

Add a CSS-walking helper (or extend an existing one in `@cmsmasters/block-forge-core`) that takes `(css, selector, property)` and returns `Set<bp>` — the set of BPs where the property is currently declared.

```ts
function getConflictBps(css: string, selector: string, property: string): Set<number> {
  // Walk @container slot rules; return Set of bp values where (selector { property: ... }) appears
}
```

Then:

```ts
const conflicts = getConflictBps(css, selector, property)
const bps = [0, ...[375, 768, 1440].filter((bp) => conflicts.has(bp))]
const tweaks = bps.map((bp) => ({ selector, bp, property, value: `var(${tokenName})` }))
```

Same shape on both surfaces.

---

## Constraints

- ❌ No engine package edits beyond optionally adding the scan helper to `@cmsmasters/block-forge-core` (decision in Phase 0 RECON: extend core vs duplicate per-surface).
- ❌ No `dispatchInspectorEdit` contract changes — the `apply-token` kind body changes, payload shape unchanged.
- ✅ Both surfaces ship in lockstep.
- ✅ PARITY trio updated to remove the Path A tradeoff caveat.

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 30m | Probe scan-helper home (core vs per-surface); empirical fixtures for no-conflict / partial / full-conflict |
| 1 Impl | 2h | Scan helper + smart emit; cross-surface coordinated edits; +5 tests |
| 2 Close | 30m | PARITY trio caveat removal; status flip; WP-034 Outcome Ladder note |

Total: ~3h across 1 phase + close.

---

## Outcome Ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Phase 0 RECON empirically validated helper home (core) + Forge access path (composeTweakedCss + scan) | logs/wp-039/phase-0-recon-result.md |
| Silver | Phase 1 cross-surface scan-then-emit + 11 new tests + helper colocated with emitTweak/parseContainerBp | commit `d4e17a4c` |
| Gold | All gates GREEN: core 81/81, studio 300/300, forge 363/363+6 skipped, arch-test 597/597, both surfaces tsc CLEAN | logs/wp-039/phase-1-result.md |
| Platinum | Phase 2 Close — PARITY trio "Path A tradeoff" caveat retired + status flip + atomic doc batch | this commit (Phase 2 SHA) |

---

## Commit Ladder

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit — shipped with Phase 1) | logs/wp-039/phase-0-recon-result.md |
| 1 | `feat(studio+block-forge): WP-039 phase 1 — Smart Path A scan-then-emit` | `d4e17a4c` | 10 (2 NEW core + 5 MOD + 2 RECON+result.md + 1 manifest) |
| 2 (Close) | `docs(wp-039): phase 2 close — PARITY trio "Path A tradeoff" RETIRED + status flip` | `a8f3a7d7` | 5 (PARITY pair + WP-039 doc + WP-034 doc + ROADMAP) + result.md |

**Total WP-039 footprint: ~145 LOC across 2 commits over 1 day.**

---

## Cross-references

- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 1
- WP-034 commit `ead09eb7` (Phase 1, Path A baseline)
- `emitTweak` Case C dedupe-update test: `packages/block-forge-core/src/__tests__/emit-tweak.test.ts:31-43`
