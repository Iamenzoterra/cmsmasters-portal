# WP-025 Phase 3 — Result (Heuristic engine — six rules)

> **Phase:** 3 of 5 (Rule engine)
> **Status:** ✅ Shipped
> **Task:** [phase-3-task.md](./phase-3-task.md)
> **Prerequisites:** Phase 2 ✅ — commits `a0972344` + `8ab2f9e7`

---

## Summary

All six ADR-025 heuristics shipped as pure functions under `packages/block-forge-core/src/rules/`, wired through a fixed-order `generateSuggestions` dispatcher. Deterministic IDs via djb2 hash in `src/lib/hash.ts`. Public entry gains second runtime export. Zero fixture files. Zero compose-path files. Zero type-shape changes. Nested-row NO-trigger contract shipped as explicit test.

Arch-test: **402 → 417/0** (+15 path-existence: 14 task-listed + 1 hash.ts).
Package tests: **9 files, 43 tests, all green** (15 carry-over + 28 new).
Typecheck: clean.

---

## Heuristic-by-heuristic summary

| # | File | LoC | Tests | Notes |
|---|---|---|---|---|
| 1 | `rules/heuristic-grid-cols.ts` | 63 | 4 | `repeat(N, …)` with N≥2; bp 768 (N≥3) + bp 480 (always). Confidence: high. |
| 2 | `rules/heuristic-spacing-clamp.ts` | 62 | 4 | 13 spacing props; largest value ≥ 40px / 2.5rem; rejects var/clamp/min/max/calc/%/vw/vh/em. Confidence: medium. |
| 3 | `rules/heuristic-font-clamp.ts` | 49 | 4 | `font-size` only; single value ≥ 24px / 1.5rem; min floored at 16px. Confidence: high. |
| 4 | `rules/heuristic-flex-wrap.ts` | 63 | 4 | `display: flex` + `flex-direction: row` (or unset); simple-class selector matching; **nested-row hard skip**. Confidence: medium. |
| 5 | `rules/heuristic-horizontal-overflow.ts` | 41 | 4 | `white-space: nowrap` + no `overflow-x`. Confidence: low. |
| 6 | `rules/heuristic-media-maxwidth.ts` | 65 | 4 | `<img>/<video>/<iframe>` without cap; tag-level AND per-element class-level cap checks; dedupe by `{tag, property}`. Confidence: high. |
| — | `rules/index.ts` | 19 | — | Fixed-order dispatcher. |
| — | `lib/hash.ts` | 18 | — | djb2 stable hash → 8-hex chars + `suggestionId()` helper. |
| — | `__tests__/rules-dispatcher.test.ts` | — | 4 | Order, uniqueness, empty, determinism. |

**Test total:** 28 new assertions (24 heuristic + 4 dispatcher).

---

## Stable-hash choice

**Algorithm:** djb2 (Bernstein 2a variant, `hash = ((hash << 5) + hash) + c`).
**Location:** `packages/block-forge-core/src/lib/hash.ts` (new file; added to owned_files).
**Why lib/ not dispatcher-private:** task offered either; I picked `lib/` because the helper is pure, non-dispatcher-state, and Phase 4's compose path will likely want the same ID derivation when it re-emits suggestions.
**Output:** `${heuristic}-${hash8}` where `hash8` is first 8 hex chars of `djb2(selector|bp|property|value)`. No crypto. Deterministic across runs.

ID sanity check (from heuristic-grid-cols test):
```
expect(suggestions[0].id).toMatch(/^grid-cols-[0-9a-f]{8}$/)
```

Dispatcher test asserts cross-heuristic uniqueness:
```ts
const uniqueIds = new Set(suggestions.map(s => s.id))
expect(uniqueIds.size).toBe(ids.length)
```

---

## Nested-row HARD contract — test evidence

File: `packages/block-forge-core/src/__tests__/heuristic-flex-wrap.test.ts`

```ts
it('nested-row NO-trigger contract — .nav inside <header> does NOT emit', () => {
  const analysis = analyzeBlock({
    html: '<header><nav class="nav"><a>1</a><a>2</a><a>3</a><a>4</a></nav></header>',
    css: '.nav { display: flex; flex-direction: row; }',
  })
  const navEl = analysis.elements.find(e => e.tag === 'nav')
  expect(navEl?.parentTag).toBe('header')
  expect(navEl?.childCount).toBe(4)
  expect(heuristicFlexWrap(analysis)).toEqual([])
})
```

Implementation guard (`heuristic-flex-wrap.ts`):
```ts
function isTopLevelParent(parentTag: string | null): boolean {
  return parentTag === null || parentTag === 'body'
}
// ...
const qualifying = matches.find(
  el => el.childCount >= 3 && isTopLevelParent(el.parentTag),
)
if (!qualifying) continue
```

**Contract satisfied:** matched element with `parentTag: 'header'` → no suggestion, even though `childCount: 4` and `display: flex; flex-direction: row` both hold. Q1 handshake with Phase 4's `block-nested-row` snapshot fixture is locked at unit level.

---

## Dispatcher order + determinism — test evidence

**Fixed-order assertion:**
```ts
const firstIdx = (h: string) => heuristicOrder.indexOf(h as (typeof heuristicOrder)[number])
expect(firstIdx('spacing-clamp')).toBeGreaterThan(firstIdx('grid-cols'))
expect(firstIdx('font-clamp')).toBeGreaterThan(firstIdx('spacing-clamp'))
expect(firstIdx('flex-wrap')).toBeGreaterThan(firstIdx('font-clamp'))
expect(firstIdx('horizontal-overflow')).toBeGreaterThan(firstIdx('flex-wrap'))
expect(firstIdx('media-maxwidth')).toBeGreaterThan(firstIdx('horizontal-overflow'))

const uniqueHeuristics = new Set(heuristicOrder)
expect(uniqueHeuristics.size).toBe(6)
```

**ID uniqueness:**
```ts
const ids = suggestions.map(s => s.id)
const uniqueIds = new Set(ids)
expect(uniqueIds.size).toBe(ids.length)
```

**Determinism smoke:**
```ts
const a = generateSuggestions(analysis)
const b = generateSuggestions(analysis)
expect(a).toEqual(b)
expect(a.map(s => s.id)).toEqual(b.map(s => s.id))
```

All green.

---

## Arch-test delta accounting

```
Phase 2 close baseline: 402/0
New owned_files added: 15
  → 14 listed in task (7 rules sources + 7 tests + dispatcher index + dispatcher test split = 8 source + 7 test)
  → wait: 6 heuristic sources + rules/index.ts = 7 source; 6 heuristic tests + rules-dispatcher.test.ts = 7 test; +1 lib/hash.ts = 15 total
Phase 3 close total: 417/0
Delta: +15 path-existence tests
```

Per-type: 15 new Path Existence tests for new owned_files. No new Skill Parity, Known Gaps Severity, or Dual Ownership entries needed (`pkg-block-forge-core` domain + SKILL already existed from Phase 1; known_gaps third entry amended in place).

---

## Test count per file

| File | Tests |
|---|---|
| `smoke.test.ts` | 1 |
| `analyze-block.test.ts` | 14 |
| `heuristic-grid-cols.test.ts` | 4 |
| `heuristic-spacing-clamp.test.ts` | 4 |
| `heuristic-font-clamp.test.ts` | 4 |
| `heuristic-flex-wrap.test.ts` | 4 |
| `heuristic-horizontal-overflow.test.ts` | 4 |
| `heuristic-media-maxwidth.test.ts` | 4 |
| `rules-dispatcher.test.ts` | 4 |
| **Total** | **43** |

All green. ~720ms total.

---

## types.ts — unchanged

```
$ git diff packages/block-forge-core/src/lib/types.ts
(empty)
```

Hard gate satisfied. Phase 1 type shapes held for rule engine.

---

## Verification checklist

| # | Check | Status |
|---|---|---|
| 1 | 7 heuristic source files + 7 test files exist | ✅ `rules/*.ts` (7), `__tests__/heuristic-*.test.ts` (6), `rules-dispatcher.test.ts` (1) |
| 2 | `generateSuggestions` exported from package entry | ✅ `src/index.ts` line 17 |
| 3 | Manifest has +15 files | ✅ 11→26 in pkg-block-forge-core owned_files |
| 4 | known_gaps third entry says "Phase 3 shipped rules/ …" | ✅ |
| 5 | Arch-test 402 → 417/0 with explained delta | ✅ +15 path-existence, 417 passed |
| 6 | Package tests: 9 files, 43 tests, all green | ✅ |
| 7 | Typecheck clean monorepo | ✅ `npx nx run-many -t typecheck` (only block-forge-core has the target) |
| 8 | Nested-row-NO-trigger test present & green | ✅ quoted above |
| 9 | Dispatcher determinism test present & green | ✅ quoted above |
| 10 | Dispatcher order test present & green | ✅ quoted above |
| 11 | ID uniqueness test present & green | ✅ quoted above |
| 12 | No `compose/` or `fixtures/` created | ✅ both absent; `ls` returns no-such-file |
| 13 | Types.ts unchanged | ✅ `git diff` empty |

---

## Deviations

**1 — TS narrowing in dispatcher-order assertion.**
`heuristicOrder` is typed as `Heuristic[]` (narrow union of 6 strings). `indexOf('string')` rejected raw `string` arg. Fix: widened via `h as (typeof heuristicOrder)[number]` local cast inside the test helper. Runtime behavior unchanged; pure type assertion for the test DSL. No implementation/public-type impact.

**2 — Dispatcher test input restructure (1 local edit).**
Initial `ALL_SIX_INPUT` nested `.hero` inside `.grid`, which correctly made flex-wrap skip per the nested-row contract — but that meant only 5/6 heuristics fired, failing the dispatcher-order assertion. Fix: flattened HTML so `.hero` is top-level (parentTag null). This is a test-scaffolding fix, not a heuristic change. Actually reinforces the contract: the skip is working as designed.

No implementation-level deviations.

---

## Judgment calls logged

- **Hash location:** chose `src/lib/hash.ts` over dispatcher-private helper. Rationale above. Phase 4 consumers of IDs (e.g., `applySuggestions` receipts) will reuse `suggestionId()`.
- **`isAlreadyAdaptive` duplicated inline** across 5 heuristics (media-maxwidth doesn't use it — element-driven). Reason: importing from `rules/index.ts` back into heuristics creates circular import risk; adding another `src/lib/*.ts` just for one 3-line guard feels overweight. 5× duplication of a pure predicate is tolerable. Flag if Phase 4 or 5 finds the duplication annoying.
- **Spacing-clamp value shape:** `clamp(Xpx, Y.YYvw, Zpx)` with `min = round(max × 0.6 / 8) × 8` floored at 8px; `fluid = max / 19.2 vw` (reaches `max` at 1920vw viewport). Task allowed any "reasonable" fluid formula — picked the simplest that produces valid CSS. Tests use `.toContain('clamp(')` + `.toContain('<max>px')` (not exact string), so the formula is free to evolve without test churn.
- **Font-clamp value shape:** same fluid formula; min = `max(16, round(max × 0.55 / 2) × 2)` — floored at 16px (browser default body size) per task.
- **Flex-wrap `flex-direction: row-reverse`** treated as a trigger alongside `row`. Task said row-or-unset; row-reverse is logically also a horizontal flex row. No edge test for it; tests cover column (non-trigger) + unset-row (default trigger via explicit `row`).
- **Media-maxwidth class-level cap check:** when `every` element of a tag is class-capped, skip. One uncapped element → emit. Task text was ambiguous here ("if ANY rule targets the tag") — I read "tag" as the selector literal. Flagging so Brain can redirect if needed.

---

## Open questions

**None.** All hard gates met; judgment calls logged above for Brain review but none block Phase 4.

---

## Files created / modified

**Created (15):**
- `packages/block-forge-core/src/lib/hash.ts`
- `packages/block-forge-core/src/rules/index.ts`
- `packages/block-forge-core/src/rules/heuristic-grid-cols.ts`
- `packages/block-forge-core/src/rules/heuristic-spacing-clamp.ts`
- `packages/block-forge-core/src/rules/heuristic-font-clamp.ts`
- `packages/block-forge-core/src/rules/heuristic-flex-wrap.ts`
- `packages/block-forge-core/src/rules/heuristic-horizontal-overflow.ts`
- `packages/block-forge-core/src/rules/heuristic-media-maxwidth.ts`
- `packages/block-forge-core/src/__tests__/heuristic-grid-cols.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-spacing-clamp.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-font-clamp.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-flex-wrap.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-horizontal-overflow.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-media-maxwidth.test.ts`
- `packages/block-forge-core/src/__tests__/rules-dispatcher.test.ts`

**Modified (2):**
- `packages/block-forge-core/src/index.ts` — added `export { generateSuggestions } from './rules'`
- `src/__arch__/domain-manifest.ts` — appended 15 owned_files; amended known_gaps third entry

---

## Commit

SHA: `<TO-EMBED-POST-COMMIT>`
