# WP-034 Phase 0 (RECON) — Result

> **Phase:** 0 (RECON — pre-flight discovery, no code, no commit)
> **Date:** 2026-04-28
> **Workpackage:** WP-034 Inspector Cascade-Override Fix
> **Author:** Hands (autonomous mode)
> **Status:** ⚠️ RECON CATCHES — Brain rulings required before Phase 1

---

## TL;DR

WP-034 doc described 3 paths (A multi-tweak fan-out, B cascade-clear via
`removeDeclarationFromCss`, C hybrid with confirm modal) and called Path A's
output "pollution". RECON empirically tested `emitTweak`'s deduping
behaviour and found **Path A is clean, not polluted**. Path A also avoids
the asymmetry between block-forge (`session.tweaks`) and Studio
(`form.code`) that Path B would force.

Real-world frequency: **1/10 production blocks** has the cascade-conflict
case (`fast-loading-speed.json` `.heading` with `@container slot
(max-width: 768)` + `(max-width: 375)` font-size overrides). Both
overrides use canonical BPs (768, 375) — Path A's 4-tweak fan-out at
canonical BPs (0/375/768/1440) covers 100% of observed conflicts.

**Recommendation: Path A with empirical correction to the WP-034 doc's
"pollution" claim.**

---

## Findings

### F1 — TokenChip click flow + tooltip (cross-surface)

Both `tools/block-forge/src/components/TokenChip.tsx` and
`apps/studio/src/pages/block-editor/responsive/inspector/TokenChip.tsx`:

- Props: `{ mode, tokenName, valuesByBp: Record<InspectorBp, number>, onApply?: () => void }`
- `onClick` → `onApply()` direct call (no signature transform).
- Tooltip text: `"Sets {M}/{T}/{D}px at M/T/D · Note: existing breakpoint overrides may still apply."`

The "may still apply" caveat will be removed in Phase 2 Close once the
fix lands.

### F2 — `onApplyToken` chain emits ONLY at bp:0 today

block-forge `App.tsx::handleInspectorApplyToken`:

```ts
addTweak(prev, { selector, bp: 0, property, value: `var(${tokenName})` })
```

Studio's `dispatchInspectorEdit(form, edit)` similarly emits one PostCSS
write with `bp: 0` semantics. **Confirmed:** WP-034 doc's claim "single
bp:0 tweak only" is accurate for both surfaces.

### F3 — `removeDeclarationFromCss` exists with full @container support

`apps/studio/src/pages/block-editor/responsive/inspector/lib/css-mutate.ts`:

```ts
function removeDeclarationFromCss(
  css: string,
  selector: string,
  bp: number,
  property: string,
): string
```

- Walks `@container slot (max-width: Npx)` rules for `bp > 0`.
- Walks top-level rules for `bp === 0`.
- Removes empty rules + empty @container blocks (cleanup).
- Test coverage: `css-mutate.test.ts` 12 cases.

**However:** this lives in the Studio surface only. block-forge's session
reducer side has `removeTweakFor(state, selector, bp, property)` but
that operates on `session.tweaks[]` (the user's edits), not the BASE
CSS. Path B at block-forge would need either:
- (B1) extend `composeTweakedCss(baseCss, tweaks)` to walk + delete from
  base CSS before composing — invasive engine-package edit (BANNED by
  WP-034 constraints).
- (B2) add a "remove @container rule" tweak type (extend `Tweak`
  primitive to mark certain emits as deletes).

Either way, Path B introduces asymmetry: Studio's path uses
`removeDeclarationFromCss` directly; block-forge needs new plumbing.

### F4 — Real-world @container frequency: 1/10 blocks

Grep of `content/db/blocks/*.json`:

| Block | @container slot blocks | Cascade conflict for chip-applicable property? |
|---|---|---|
| `fast-loading-speed.json` | 4 (`@container slot (max-width: 768)`, `(640) × 4 dup`, `(375)`) | **YES** — `h2.heading` font-size: top-level `var(--h2-font-size, 42px)` + `@container 768`: 32px + `@container 375`: 30px |
| Other 9 blocks | 0 | No |

The 4 duplicate `@container slot (max-width: 640)` blocks targeting
`.gauge-score` are a separate hygiene issue (looks like duplicate
emits from earlier authoring) — flagged but out-of-scope for WP-034.

**Concrete fixture for Phase 1:** `fast-loading-speed.json` `h2.heading`
font-size. Token to apply: `--h2-font-size`. Expected behaviour after
Phase 1: `getComputedStyle('.heading').fontSize` at 1440/768/375 all
resolve to the token's clamp-interpolated value.

### F5 — `emitTweak` is idempotent and dedupes — Path A claim "pollution" is WRONG

`packages/block-forge-core/src/compose/emit-tweak.ts`:

```ts
// Case C: Container + selector-rule exist
//   - declaration for `property` absent → append declaration
//   - declaration present → update its value (preserves other decls)
```

When the chip emits at `bp:1440` with `font-size: var(--token)`:
1. `emitTweak` walks `@container slot (max-width: 1440px)` rules.
2. Finds the matching `.heading` rule inside.
3. Walks decls → finds existing `font-size: 42px` → **updates value in place** to `var(--token)`.
4. Other decls in the same rule (e.g. `line-height`, `color`) preserved.

**Output:** Same @container blocks, font-size decls replaced with token
value. No duplicate @container blocks. No redundant decls. The WP-034
doc's stated concern "pollutes @container slot rules with redundant
decls" was theoretical and is empirically false against `emitTweak`'s
actual implementation.

### F6 — PARITY trio "Known limitations" sections to flip

Two PARITY.md files have the cascade-override caveat:

- `tools/block-forge/PARITY.md:276-280` — full description + Path A/B/C
  hint pointing to WP-034.
- `apps/studio/.../PARITY.md:292-296` — abbreviated mirror.

Phase 2 Close: replace these with "RESOLVED via WP-034 (Path A)" + commit
SHA.

### F7 — Confirm modal infrastructure: window.confirm available

- `Drawer` primitive in `@cmsmasters/ui` (used by VariantsDrawer).
- `window.confirm` already used by VariantsDrawer delete (Ruling O,
  WP-028 Phase 3).
- No custom Confirm component.

Path C estimate: ~30-50 LOC additive (window.confirm callsite is the
low-friction option). Custom Confirm component would be ~80 LOC.

### F8 — Token resolution: per-BP clamp interpolation

`tools/block-forge/src/hooks/useChipDetection.ts`:

```ts
function resolveTokenAtBp(token: string, bp: InspectorBp, config): number | null
function resolveTokenAllBps(token: string, config): Record<InspectorBp, number> | null
```

- Reads `responsive-config.json` `overrides` data for fluid token
  clamp config (e.g. `--h2-font-size: { minPx: 34, maxPx: 42 }`).
- Linear interpolation: `value = minPx + t * (maxPx - minPx)` where
  `t = (bp - 375) / (1440 - 375)`.
- Resolves all 3 canonical BPs (375/768/1440) from the same config.

Path A's 4-tweak fan-out emits the same `var(--token)` string at each
BP — the BROWSER's clamp resolution does the per-BP interpolation
automatically at render time. We don't need to compute pre-resolved
pixel values.

---

## Path comparison (revised after RECON)

| Aspect | Path A (4-tweak fan-out) | Path B (cascade-clear) | Path C (hybrid + confirm) |
|---|---|---|---|
| **LOC per surface** | ~5 | ~15 (+ ~30 LOC for block-forge symmetry plumbing) | ~45 (+ B's plumbing) |
| **Cross-surface symmetry** | ✅ both surfaces use `addTweak` × 4 (block-forge) or `emitTweak` × 4 (Studio) — same primitive shape | ❌ asymmetric: Studio gets `removeDeclarationFromCss`; block-forge needs new "remove" tweak type or engine edit (banned) | ❌ inherits B's asymmetry |
| **Output cleanliness** | ✅ `emitTweak` Case C dedupes — replaces decl in place, preserves other decls in same rule | ✅ `removeDeclarationFromCss` removes only target decl + cleans empty containers | ✅ same as B |
| **Author intent preservation** | ✅ token replaces per-BP value at canonical BPs only — non-canonical (e.g. 640px) overrides untouched (author keeps tuning) | ⚠️ removes ALL @container conflicts for the property — could nuke 640px-specific tuning | ✅ user-gated (B) |
| **Real-world coverage** | 100% of observed cases (1/10 blocks; both conflict BPs canonical) | 100% (handles non-canonical too) | 100% (with friction) |
| **UX friction** | ✅ zero — chip click does the right thing | ✅ zero — chip click does the right thing | ⚠️ modal on every chip click with conflict |
| **Test surface** | narrow — assert 4 tweaks emitted, assert composed CSS has var() at all 3 @container blocks | medium — assert removeDeclaration walked all matching rules + emit at bp:0 | wide — modal interaction + B's tests |
| **Engine package edit** | ❌ none | ❌ none (Studio uses lib helper) — but block-forge needs new tweak type which CAN be added in `packages/block-forge-core` (engine boundary check) — banned by constraints | ❌ same as B |

---

## Open Brain rulings (must be made before Phase 1)

### Ruling 1 — Path choice
**Recommendation: Path A.**

Rationale:
- WP-034 doc's "pollution" concern is empirically false; `emitTweak` Case C
  dedupes in place.
- Cross-surface symmetric — both surfaces use the same primitive (`emitTweak`
  via `addTweak` on block-forge, direct `emitTweak` via PostCSS on Studio).
- Real-world data shows 100% of observed conflicts use canonical BPs (768, 375
  for the only conflict-fixture block) — Path A's canonical-BP fan-out covers
  them all.
- Path B would force engine-package extension (banned by WP-034 constraints)
  OR Studio-only fix (breaks PARITY).
- Path C adds confirm modal friction for a 1-in-10-blocks edge case.

### Ruling 2 — bp set for fan-out
The WP-034 doc says "bp:480 | bp:768 | bp:1440". This is wrong — canonical
Inspector BPs are **375 | 768 | 1440** (`INSPECTOR_BPS` const at
`Inspector.tsx`). 480 doesn't exist as a canonical breakpoint.

**Recommendation: emit at `[0, 375, 768, 1440]`** (4 tweaks total — bp:0
top-level + 3 canonical container BPs).

### Ruling 3 — Tests scope
**Recommendation:** add 2 unit tests + 1 live smoke at each surface:
- Unit test 1: chip click → 4 `addTweak` calls with same value, distinct BPs.
- Unit test 2: composed CSS post-tweak has `var(--token)` in 3 @container
  blocks + 1 top-level rule.
- Live smoke: `fast-loading-speed.json` → click chip on `.heading` → all 3 BP
  iframes show token-resolved px values matching `getComputedStyle`.

### Ruling 4 — Phasing
**Recommendation:** 2 phases.
- **Phase 1 (impl)**: ~5 LOC × 2 surfaces TokenChip handler change + new tweak
  composition tests + tooltip update + cross-surface PARITY trio sync.
- **Phase 2 (Close)**: PARITY trio "Known limitations" → "RESOLVED" flip,
  status flip in WP/ROADMAP/BRIEF, atomic doc commit.

(WP-034 plan doc says 1-2 phases; recommend 2 to keep Phase 1 commit clean
and Phase 2 atomic doc batch under `feedback_close_phase_approval_gate`.)

---

## Constraints re-confirmed

- ✅ No engine package edits (`packages/block-forge-core/**`) — Path A uses
  existing `emitTweak` primitive untouched.
- ✅ No token system edits — Path A doesn't change tokens.css.
- ✅ No `dispatchTweakToForm` / `dispatchInspectorEdit` contract changes —
  Path A reuses existing primitives.
- ✅ Both surfaces ship in lockstep (cross-surface byte-identical handler).
- ✅ PARITY trio "Known limitations" sections removed Phase 2 Close.

---

## What's next

**Awaiting Brain rulings on:**
1. Ruling 1 (path choice) — recommended **A**.
2. Ruling 2 (bp set) — recommended `[0, 375, 768, 1440]`, NOT the doc's 480.
3. Ruling 3 (tests scope) — recommended 2 unit + 1 live smoke per surface.
4. Ruling 4 (phasing) — recommended **2 phases** (impl + Close).

Default-defaults block: if Brain accepts all four, Hands proceeds autonomously
through Phase 1 impl → Phase 2 Close. Otherwise Brain specifies overrides.
