# WP-039 — Smart Path A: Scan-Then-Emit Refinement

> **Status:** 🟡 BACKLOG (drafted 2026-04-28 as WP-034 polish queue carryover)
> **Origin:** WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 1
> **Estimated effort:** 1 phase + close (~2–3h, ~30 LOC across 2 surfaces + tests)
> **Layer:** L2 authoring tools (refines WP-034 Inspector chip cascade-override fix)
> **Priority:** P3 — cosmetic; only triggered if author feedback flags Path A's verbose output as noisy
> **Prerequisites:** WP-034 ✅ DONE (Path A baseline shipped)

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

- [ ] Chip apply on a property with **no** `@container` conflicts emits exactly 1 tweak at `bp:0` (zero new `@container` blocks created).
- [ ] Chip apply on a property with conflicts at SOME BPs (e.g., 768 only) emits 2 tweaks: `bp:0` + `bp:768` (no redundant 375 / 1440 blocks).
- [ ] Chip apply on a property with conflicts at ALL 3 BPs still resolves to all-applied (4-tweak emit, same as WP-034 baseline).
- [ ] Sibling decl preservation invariant holds (same as WP-034 — `emitTweak` Case C dedupe-update semantics).
- [ ] Cross-surface lockstep — both `tools/block-forge/src/App.tsx` `handleInspectorApplyToken` and `apps/studio/.../inspector/lib/dispatchInspectorEdit.ts` `apply-token` case ship together.
- [ ] Vitest regression pins:
  - Studio `dispatchInspectorEdit.test.ts` +3 tests (no-conflict → 1 tweak; partial-conflict → N tweaks; full-conflict → 4 tweaks).
  - block-forge `session.test.ts` +2 tests in WP-039 describe block.
- [ ] PARITY trio "Path A tradeoff" paragraph removed; replaced with smart-emit description.
- [ ] WP-034 Outcome Ladder Bronze/Silver tier note: "Smart variant shipped in WP-039".

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

## Cross-references

- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 1
- WP-034 commit `ead09eb7` (Phase 1, Path A baseline)
- `emitTweak` Case C dedupe-update test: `packages/block-forge-core/src/__tests__/emit-tweak.test.ts:31-43`
