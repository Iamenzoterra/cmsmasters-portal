# WP-039 Phase 0 RECON — Smart Path A: Scan-Then-Emit

> **Phase:** 0 (RECON)
> **Date:** 2026-04-28
> **Workpackage:** WP-039 Smart Path A Scan-Then-Emit Refinement
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — proceeding to Phase 1 with default helper location

---

## TL;DR

WP-039 refines WP-034 Path A from "always emit 4 tweaks at canonical BPs" to "emit at `bp:0` + at each BP where the source CSS already declares the property for the active selector". This eliminates cosmetic +1–3 redundant `@container` blocks created when the source has no conflict at a given canonical BP.

Phase 0 RECON outputs three findings:
1. Helper home — `@cmsmasters/block-forge-core` (colocate with `emitTweak` + `parseContainerBp`).
2. Forge access path — call `composeTweakedCss(prev.block.css, prev.tweaks)` inside `handleInspectorApplyToken` to obtain the current CSS state, scan, then choose BPs.
3. Studio access path — already at hand via `splitCode(form.getValues('code')).css`.

No surprises uncovered; WP doc estimate of ~30 LOC + 5 tests holds.

---

## Findings

### 1. Helper home — `@cmsmasters/block-forge-core/src/compose/find-conflict-bps.ts`

**Why core, not per-surface:**
- `parseContainerBp()` already lives at `packages/block-forge-core/src/lib/container-query.ts:5-8` — required for the scan.
- `emitTweak()` (the consumer-side function the smart logic *defers* to) lives at `packages/block-forge-core/src/compose/emit-tweak.ts`.
- Cross-surface duplication risk: if scan logic lives in Forge App.tsx + Studio dispatchInspectorEdit.ts, byte-identity is fragile. Core export = single source of truth.
- Test ergonomics: pure function with `(css, selector, property) → Set<number>` signature is trivial to vitest from `packages/block-forge-core/src/__tests__/find-conflict-bps.test.ts`.

**Proposed signature:**
```ts
export function findConflictBps(
  css: string,
  selector: string,
  property: string,
): Set<number>
```

Returns: set of BP numbers (excluding 0) where `css` contains a `@container slot (max-width: Npx) { selector { property: ...; } }` declaration.

Top-level rules at `bp:0` are NOT included (they're always emitted unconditionally — the chip's bp:0 is the contract).

### 2. Forge access path

**Current** (`tools/block-forge/src/App.tsx:248-265`):
```ts
const handleInspectorApplyToken = useCallback(
  (selector, property, tokenName) => {
    const value = `var(${tokenName})`
    setSession((prev) => {
      let next = prev
      for (const bp of [0, 375, 768, 1440] as const) {
        next = addTweak(next, { selector, bp, property, value })
      }
      return next
    })
  },
  [],
)
```

**Smart variant:**
```ts
const handleInspectorApplyToken = useCallback(
  (selector, property, tokenName) => {
    const value = `var(${tokenName})`
    setSession((prev) => {
      const currentCss = composeTweakedCss(prev.block.css, prev.tweaks)
      const conflicts = findConflictBps(currentCss, selector, property)
      const bps = [0, ...([375, 768, 1440] as const).filter((bp) => conflicts.has(bp))]
      let next = prev
      for (const bp of bps) {
        next = addTweak(next, { selector, bp, property, value })
      }
      return next
    })
  },
  [],
)
```

`composeTweakedCss` already exists at `tools/block-forge/src/lib/session.ts:406-411`. `block.css` is the source CSS field on `SessionState['block']`.

**Subtle but correct:** If the user clicks chip A (emits 4), then clicks chip B on same selector+property, the second scan sees those 4 tweaks-already-applied as "conflicts" and re-emits 4 — same outcome as WP-034 baseline. No regression.

### 3. Studio access path

**Current** (`apps/studio/src/pages/block-editor/responsive/inspector/lib/dispatchInspectorEdit.ts:57-71`):
```ts
case 'apply-token': {
  const value = `var(${edit.tokenName})`
  const tweaks: Tweak[] = [
    { selector, bp: 0, property, value },
    { selector, bp: 375, property, value },
    { selector, bp: 768, property, value },
    { selector, bp: 1440, property, value },
  ]
  nextCss = tweaks.reduce((acc, t) => emitTweak(t, acc), css)
  break
}
```

**Smart variant:**
```ts
case 'apply-token': {
  const value = `var(${edit.tokenName})`
  const conflicts = findConflictBps(css, edit.selector, edit.property)
  const bps = [0, ...[375, 768, 1440].filter((bp) => conflicts.has(bp))]
  const tweaks: Tweak[] = bps.map((bp) => ({
    selector: edit.selector, bp, property: edit.property, value,
  }))
  nextCss = tweaks.reduce((acc, t) => emitTweak(t, acc), css)
  break
}
```

CSS is already at hand inside `dispatchInspectorEdit` via the `splitCode(liveCode)` extraction at line 49.

---

## Empirical contract for `findConflictBps`

| Input CSS shape | Conflicts returned |
|---|---|
| `.heading { color: red; }` (no @container) | `Set([])` |
| `@container slot (max-width: 768px) { .heading { font-size: 42px; } }` | `Set([768])` |
| `@container slot (max-width: 768px) { .heading { font-size: 42px; } } @container slot (max-width: 1440px) { .heading { font-size: 56px; } }` | `Set([768, 1440])` |
| `.heading { font-size: 24px; } @container slot (max-width: 768px) { .heading { font-size: 42px; } }` (top-level + container) | `Set([768])` (top-level rule excluded — bp:0 always emitted unconditionally) |
| `@container slot (max-width: 768px) { .other { font-size: 42px; } }` (different selector) | `Set([])` |
| `@container slot (max-width: 768px) { .heading { color: red; } }` (different property) | `Set([])` |
| `@container slot (max-width: 1024px) { .heading { font-size: 42px; } }` (non-canonical BP) | `Set([1024])` (returns ALL conflict BPs; caller decides which to act on) |

The scan returns *all* conflicts, regardless of canonical BP membership. Caller filters to the canonical set `[375, 768, 1440]` — leaves room for future polish (e.g., warn on non-canonical BPs).

---

## Test plan (Phase 1)

**Core tests** (`packages/block-forge-core/src/__tests__/find-conflict-bps.test.ts` — 6 tests):
- No-conflict: `Set([])` for plain CSS.
- Single conflict at 768: `Set([768])`.
- Multi-conflict at 375 + 768 + 1440: `Set([375, 768, 1440])`.
- Top-level rule excluded (only @container counts).
- Different selector ignored.
- Different property ignored.

**Studio integration tests** (`dispatchInspectorEdit.test.ts` — +3 WP-039 tests):
- No-conflict input → 1 tweak emitted (only bp:0).
- Partial-conflict (768 only) → 2 tweaks (bp:0 + 768).
- Full-conflict (all 3 canonical BPs) → 4 tweaks (same as WP-034 baseline).

**Forge integration tests** (`tools/block-forge/src/__tests__/session.test.ts` — +2 WP-039 tests in describe `WP-039 Smart Path A`):
- No-conflict source CSS → session ends up with 1 tweak.
- Partial-conflict → session ends up with 2 tweaks.

Total: +11 tests across 3 files (vs WP doc estimate of +5; revised upward to include core helper unit tests).

---

## Brain rulings (resolved at RECON time, auto mode)

1. **Helper home:** `@cmsmasters/block-forge-core` (colocate with `emitTweak`).
2. **Test breadth:** +11 tests (3-file split: 6 core + 3 Studio + 2 Forge).
3. **Non-canonical BP handling:** scan returns all conflicts; consumer filters to `[375, 768, 1440]` — preserves future flexibility without complicating the helper.
4. **Top-level rule exclusion:** scan ignores top-level rules. Rationale: `bp:0` is always emitted by the contract, so its conflict status is irrelevant to the smart filter.

---

## Constraints re-confirmed

- ❌ No engine surface changes beyond the new helper export.
- ❌ No `dispatchInspectorEdit` contract changes — payload shape unchanged.
- ❌ No `addTweak` signature changes.
- ✅ Both surfaces ship in lockstep.
- ✅ PARITY trio updated to retire Path A tradeoff caveat.

---

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| PostCSS scan misses non-standard whitespace in `@container` params | Low | `parseContainerBp` regex tolerates whitespace; same regex powers emitTweak so divergence is unlikely |
| Different `selector` forms (`.heading` vs `div.heading`) miss matches | Low | WP-034 already handles via `selector.trim() === selector.trim()`; scan uses identical comparison |
| Forge `block.css` field name divergence | Low | Verified at session.test.ts; field is stable across WP-028 onward |
| Adding helper to core triggers domain-manifest changes | Low | New file in existing package; arch-test should classify under same domain (verified Phase 1) |

---

## What's next

Proceeding to Phase 1 implementation: write `findConflictBps` + 6 core tests, wire smart variant in both surfaces, +5 surface tests, visual smoke at `fast-loading-speed.json` cascade-conflict fixture.
