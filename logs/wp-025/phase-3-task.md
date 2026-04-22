# WP-025 Phase 3 — Task (Heuristic engine — six rules)

> **Role:** Hands (execution)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 3 of 5 (Rule engine)
> **Estimated duration:** ~3–4h
> **Prerequisites:** Phase 2 ✅ — commits `a0972344` (impl) + `8ab2f9e7` (SHA embed)
> **Baseline (from Phase 2 close):** arch-test **402/0**, typecheck clean, 15 tests green, `analyzeBlock` exported

---

## Mission

Implement the RULE ENGINE: `generateSuggestions(analysis)` returns an ordered `Suggestion[]` covering all six ADR-025 heuristics. Each heuristic is a pure function from `BlockAnalysis` to `Suggestion[]` in its own file with its own unit test file. Inputs are **inline synthetic CSS/HTML strings** — zero fixture files per Q1 hybrid.

End-state: heuristics correctly flag adaptive candidates, skip already-adaptive blocks (rules inside `@container` / `@media`), assign deterministic IDs, and return a stable ordered list. `generateSuggestions` becomes the second runtime export of the package.

**No compose/write path this phase.** `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview` land in Phase 4. Snapshot fixtures also land in Phase 4.

---

## Carry-overs from Phase 2 — use verbatim

| Item | Value | Where it applies |
|---|---|---|
| Arch-test baseline | **402/0** | Phase 3 delta calc — 402 → ~416 expected (+14 new owned_files × path-existence) |
| atRuleChain order | **Bottom-up** — innermost at-rule first | Skip-guard: `rule.atRuleChain[0]?.startsWith('@container')` → already-adaptive, skip |
| Empty-params at-rules | Emit without trailing space (`@starting-style` not `@starting-style `) | If heuristic needs to match at-rule strings |
| PostCSS silent recovery | Some malformed input parses successfully with no warning | Heuristics don't need to defensively re-validate — trust the `Rule[]` output |
| Types unchanged | `src/lib/types.ts` correctly sized for rule engine | Expect zero type changes this phase; flag if you need one |
| Element tag casing | Lowercase (`div`, not `DIV`) | Match tag names case-sensitively against lowercase |
| parentTag for top-level | `null` (elements under implicit doc root) | Used by heuristic-flex-wrap nested-row check |

---

## Scope contract — strict

**In scope:**
- `packages/block-forge-core/src/rules/heuristic-grid-cols.ts`
- `packages/block-forge-core/src/rules/heuristic-spacing-clamp.ts`
- `packages/block-forge-core/src/rules/heuristic-font-clamp.ts`
- `packages/block-forge-core/src/rules/heuristic-flex-wrap.ts`
- `packages/block-forge-core/src/rules/heuristic-horizontal-overflow.ts`
- `packages/block-forge-core/src/rules/heuristic-media-maxwidth.ts`
- `packages/block-forge-core/src/rules/index.ts` — dispatcher
- `packages/block-forge-core/src/__tests__/heuristic-grid-cols.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-spacing-clamp.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-font-clamp.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-flex-wrap.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-horizontal-overflow.test.ts`
- `packages/block-forge-core/src/__tests__/heuristic-media-maxwidth.test.ts`
- `packages/block-forge-core/src/__tests__/rules-dispatcher.test.ts` — dispatcher ordering + ID uniqueness
- `packages/block-forge-core/src/index.ts` — add `export { generateSuggestions }` below existing exports
- `src/__arch__/domain-manifest.ts` — append 14 new files to owned_files, amend known_gaps Phase-2 note

**Out of scope (do NOT write this phase):**
- Anything under `src/compose/` — Phase 4
- Any fixture files under `src/__tests__/fixtures/` — Phase 4
- `snapshot.test.ts` — Phase 4
- `src/lib/container-query.ts`, `src/lib/css-scoping.ts` — Phase 4 (they're compose-path helpers)
- Touching `src/analyze/*` — Phase 2 is done

**If implementation tempts you outside this list — STOP and escalate.**

---

## Tasks

### 3.1 — Implement six heuristics

Each heuristic is a pure function `(analysis: BlockAnalysis) => Suggestion[]`. Exported as a named function from its own file. All six conform to the same signature so the dispatcher can iterate uniformly.

**Universal skip-guard — applies to every heuristic:**

```ts
function isAlreadyAdaptive(rule: Rule): boolean {
  return rule.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))
}
```

Any rule where `isAlreadyAdaptive(rule)` is true MUST be skipped. The author already addressed the breakpoint concern; re-suggesting is noise.

**Deterministic IDs:** every `Suggestion.id` is content-derived. Use a simple stable string hash (djb2 / FNV-1a — no crypto). Format: `${heuristic}-${hash8}` where `hash8` is the first 8 hex chars of `hash(selector + '|' + bp + '|' + property + '|' + value)`. Identical inputs → identical IDs across runs. Put the hash function in `src/rules/index.ts` (dispatcher-private helper) or `src/lib/hash.ts` (new file under lib/, added to owned_files). Pick one, note it.

Below: the contract for each heuristic. Confidence assignments are fixed; don't improvise.

---

**3.1.1 — `heuristic-grid-cols.ts`** — collapse multi-column grids at narrow widths

- **Detects:** Rule with `display: grid` + `grid-template-columns: repeat(N, ...)` where `N >= 2`.
- **Non-triggers:** `display: grid` without explicit `grid-template-columns`; `repeat(1, ...)`; columns specified without `repeat()` (e.g., `1fr 1fr 1fr`); inline grids inside flex containers (if `display` in that same rule is also `flex`, treat the last one declared — PostCSS preserves decl order).
- **Emits:**
  - At `bp: 768`, property `grid-template-columns`, value `repeat(2, 1fr)` — if source N >= 3.
  - At `bp: 480`, property `grid-template-columns`, value `1fr` — always (for any N >= 2).
- **Confidence:** `high` for both emissions.
- **Rationale text:** e.g., `"grid with N columns — collapse to 2 at 768px (and 1 at 480px)"`.
- **Skip:** `isAlreadyAdaptive(rule)`.

---

**3.1.2 — `heuristic-spacing-clamp.ts`** — convert absolute padding/margin/gap to clamp

- **Detects:** Declaration where `prop` matches one of: `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`, `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `gap`, `row-gap`, `column-gap`. Value contains at least one absolute-unit number `>= 40px` (or `>= 2.5rem` — convert 1rem = 16px).
- **Multi-value handling:** `padding: 64px 40px` — trigger on the largest value (64px). Emit one suggestion per declaration, not per value.
- **Non-triggers:** values using `var(--…)`, `clamp(…)`, `min(…)`, `max(…)`, `calc(…)`, percentage (`%`), viewport units (`vw`, `vh`, `svw` etc.), relative units (`em`) already viewport-adaptive or context-bound — leave them alone.
- **Emits:** at `bp: 640`, property is the original `prop`, value is `clamp({min}, {fluid}, {max})` where:
  - `min` = ~60% of source (rounded to nearest `0.5rem` or `8px`)
  - `max` = source value
  - `fluid` = a reasonable `vw`-based interpolation — pick `calc({min} + {delta} * ((100vw - 320px) / 1080))` OR simpler `{max * 4}vw` + bounds. Heuristic; the test asserts shape, not exact constants.
- **Confidence:** `medium` — authors may want different min/max.
- **Skip:** `isAlreadyAdaptive(rule)`.

---

**3.1.3 — `heuristic-font-clamp.ts`** — fluid typography for large fonts

- **Detects:** Declaration where `prop === 'font-size'` and value is an absolute size `>= 24px` (or `>= 1.5rem`).
- **Non-triggers:** values using `var(--…)`, `clamp(…)`, `min/max/calc`, viewport units, `em`/`%`.
- **Emits:** at `bp: 640`, property `font-size`, value `clamp({min}, {fluid}, {max})` — same pattern as spacing-clamp but for typography.
  - `min` = max(`1rem` (16px), source * 0.55 rounded to nearest `0.125rem`)
  - `max` = source
- **Confidence:** `high` — large fonts are almost always fluid-worthy.
- **Skip:** `isAlreadyAdaptive(rule)`.

---

**3.1.4 — `heuristic-flex-wrap.ts`** — wrap flex rows at narrow widths (with nested-row skip)

- **Detects:** Rule with `display: flex` AND `flex-direction: row` (or `flex-direction` unset — `row` is the default, count it) AND the rule's selector matches an element whose `childCount >= 3`.
- **Selector-to-element matching:** best-effort. Iterate `analysis.elements`; for each rule, find elements whose `classes` include the rule's simple class selector (e.g., selector `.foo` matches elements with `foo` in classes). Complex selectors (descendant, attribute) — skip; too fragile for heuristics. Note in rationale: "flex-row with N children".
- **Nested-row skip — HARD CONTRACT:** if the matched element's `parentTag` is NOT `null` AND NOT `body`, skip the suggestion. This is the `block-nested-row` fixture contract (Q1 resolution): nested flex-rows inside column parents should NOT trigger. Nav inside hero, button group inside card, etc. — all skip.
- **Emits:** at `bp: 640`, property `flex-wrap`, value `wrap`.
- **Confidence:** `medium`.
- **Skip:** `isAlreadyAdaptive(rule)` AND nested-parent check above.

**Unit test 3.3.4 MUST include the nested-row-NO-trigger case** — per plan L312 and per Q1 hybrid contract. Assert: a rule `.nav` with `display: flex; flex-direction: row` where the matched `nav` element has `parentTag: 'header'` (not null/body) produces ZERO suggestions.

---

**3.1.5 — `heuristic-horizontal-overflow.ts`** — overflow-x fallback for nowrap content

- **Detects:** Rule with `white-space: nowrap` AND no `overflow-x: auto | scroll | hidden` in the same rule's declarations.
- **Emits:** at `bp: 480`, property `overflow-x`, value `auto`.
- **Confidence:** `low` — weaker signal; nowrap is sometimes intentional for badges/tags.
- **Skip:** `isAlreadyAdaptive(rule)`.

---

**3.1.6 — `heuristic-media-maxwidth.ts`** — ensure media is responsive by default

**This is the ONLY heuristic that cross-references HTML + CSS.** Others are pure rule-scan.

- **Detects:** Element with `tag` in `['img', 'video', 'iframe']` AND no CSS rule in `analysis.rules` sets `max-width` on a matching selector.
  - "Matching selector" = rule whose simple selector is the tag name (`img`, `video`, `iframe`) OR a class selector matching one of the element's classes.
- **Emits:** at `bp: 0` (unconditional — no breakpoint), property `max-width`, value `100%`, selector = the element's tag (e.g., `img`). Also emit a paired suggestion for `height: auto` on the same selector.
  - NOTE: `bp: 0` semantically means "base / no breakpoint". Consumers interpret `0` as unconditional. Document in rationale: `"media element without max-width cap — add 100% cap to prevent overflow"`.
- **Dedupe:** one suggestion per `{tag, property}` pair — don't emit `img.max-width` three times if HTML has three `<img>` tags.
- **Confidence:** `high`.
- **No atRuleChain skip needed** — heuristic is element-driven, not rule-driven. But: if ANY rule targets the tag and sets `max-width`, skip for that tag entirely.

---

### 3.2 — Dispatcher: `src/rules/index.ts`

```ts
import type { BlockAnalysis, Suggestion } from '../lib/types'
import { heuristicGridCols } from './heuristic-grid-cols'
import { heuristicSpacingClamp } from './heuristic-spacing-clamp'
import { heuristicFontClamp } from './heuristic-font-clamp'
import { heuristicFlexWrap } from './heuristic-flex-wrap'
import { heuristicHorizontalOverflow } from './heuristic-horizontal-overflow'
import { heuristicMediaMaxwidth } from './heuristic-media-maxwidth'

export function generateSuggestions(analysis: BlockAnalysis): Suggestion[] {
  return [
    ...heuristicGridCols(analysis),
    ...heuristicSpacingClamp(analysis),
    ...heuristicFontClamp(analysis),
    ...heuristicFlexWrap(analysis),
    ...heuristicHorizontalOverflow(analysis),
    ...heuristicMediaMaxwidth(analysis),
  ]
}
```

**Dispatcher order is fixed** — tests depend on it for predictable indices. Do not sort, do not re-order based on confidence. Heuristic execution order = emission order.

**ID uniqueness:** after concatenation, all IDs MUST be unique. If two different heuristics produce the same `selector|bp|property|value` tuple (unlikely but possible for cross-heuristic collisions), the `${heuristic}-` prefix in the ID disambiguates them. No extra dedupe needed at the dispatcher level — each heuristic is responsible for dedupe within its own output.

Place the stable hash helper either here (dispatcher-private) or in `src/lib/hash.ts`. If new file: add to owned_files in 3.4.

### 3.3 — Unit tests per heuristic

Each `heuristic-*.test.ts` covers four cases per plan L311:

1. **Triggering case** — input that should produce a suggestion. Assert exact `{selector, bp, property, value, confidence}` (rationale can be loose-matched via `.toContain()`).
2. **Non-triggering case** — input where the heuristic should NOT fire. Assert `suggestions.length === 0` OR `.toEqual([])`.
3. **Already-adaptive skip** — input where the same CSS is wrapped in `@container slot (max-width: …) { … }`. Assert `.toEqual([])`.
4. **Confidence correctness** — asserted inline with case (1) or a dedicated case — pick whichever reads cleaner.

**Specific required test cases:**

- `heuristic-grid-cols.test.ts`:
  - Triggers on `repeat(3, 1fr)` — emits 2 suggestions (bp 768 + 480)
  - Triggers on `repeat(2, 1fr)` — emits 1 suggestion (bp 480 only; N is already 2)
  - Does NOT trigger on `repeat(1, 1fr)`, on `1fr 1fr 1fr` without repeat, on `display: grid` without columns
  - Already-adaptive skip: same `repeat(3, 1fr)` inside `@container slot (max-width: 600px)` → `[]`

- `heuristic-spacing-clamp.test.ts`:
  - Triggers on `padding: 64px 40px` (largest value 64px, >= 40px)
  - Triggers on `gap: 48px`
  - Does NOT trigger on `padding: 32px` (< 40px), `padding: var(--space-lg)`, `padding: 2vw`, `padding: clamp(1rem, 2vw, 3rem)` (already clamp)
  - Already-adaptive skip

- `heuristic-font-clamp.test.ts`:
  - Triggers on `font-size: 60px`, `font-size: 2rem`
  - Does NOT trigger on `font-size: 16px`, `font-size: 1rem`, `font-size: var(--h1)`
  - Already-adaptive skip

- `heuristic-flex-wrap.test.ts`:
  - Triggers on `.hero { display: flex; flex-direction: row }` with matching element `<div class="hero">` (parentTag: null) having 4 children
  - **Nested-row-NO-trigger** (hard contract): `.nav { display: flex; flex-direction: row }` with matching `<nav class="nav">` element having parentTag `'header'` and 4 children → `[]`
  - Does NOT trigger on `flex-direction: column`, on element with 2 children, on element with no matching CSS
  - Already-adaptive skip

- `heuristic-horizontal-overflow.test.ts`:
  - Triggers on rule with `white-space: nowrap` and no `overflow-x`
  - Does NOT trigger if same rule also has `overflow-x: auto` or `overflow-x: scroll`
  - Already-adaptive skip

- `heuristic-media-maxwidth.test.ts`:
  - Triggers when HTML has `<img>` and no CSS rule caps it — emits `img.max-width: 100%` + `img.height: auto` (2 suggestions)
  - Does NOT trigger when CSS has `img { max-width: 100%; }` already
  - Dedupe: 3 `<img>` tags + no cap → still 2 suggestions (one per property), not 6
  - No-element case: HTML without media → `[]`

- `rules-dispatcher.test.ts`:
  - Dispatcher returns heuristics in fixed order: calling on input that triggers ALL six returns suggestions with the expected `heuristic` field order `['grid-cols', 'spacing-clamp', 'font-clamp', 'flex-wrap', 'horizontal-overflow', 'media-maxwidth']`
  - All returned IDs are unique (no collisions across heuristics)
  - Empty analysis → empty array
  - Determinism smoke: call dispatcher twice on same input, deep-equal

**Expected test count across this phase:** ~30 assertions, spread across 7 test files.

### 3.4 — Manifest + public export

**`src/index.ts`** — add below the `analyzeBlock` export:

```ts
export { generateSuggestions } from './rules'
```

**`src/__arch__/domain-manifest.ts`** — append 14 new owned_files (7 source + 7 test) + optional `src/lib/hash.ts` if you created it.

Update the Phase-2 known_gaps note:

```
'note: Phase 3 shipped rules/ + generateSuggestions export. compose/ + render-preview + remaining function exports land in Phase 4',
```

Keep the `note:` prefix.

### 3.5 — Verify

```bash
npm run arch-test
```

Expected: **~416/0** (402 baseline + ~14 new path-existence tests). If you added `src/lib/hash.ts`, expect +1 more (417/0). Any delta needs explanation in result log.

```bash
npm -w @cmsmasters/block-forge-core run test
```

Expected: 9 test files (1 smoke + 1 analyze + 7 rules) — ~45 tests total (15 carry-over + ~30 new). All green.

```bash
npm run typecheck
```

Expected: clean monorepo.

**Determinism hard-check:**

```bash
npm -w @cmsmasters/block-forge-core run test -- --run --reporter=verbose | grep -c "determinism"
```

Expect at least 1 determinism test across the phase (in `rules-dispatcher.test.ts`).

### 3.6 — Log + commit

Write `logs/wp-025/phase-3-result.md` with:

- Heuristic-by-heuristic summary: file + LoC + test count + any edge case discovered
- Stable-hash choice (location + algorithm — djb2 / FNV-1a / whatever)
- Arch-test delta with per-type accounting
- Test count per file + totals
- **Nested-row contract test** — paste the exact `it()` block assertion for block-nested-row case in heuristic-flex-wrap.test.ts (this is the Q1 contract handshake — explicit evidence it shipped)
- Any type-shape tweaks in `types.ts` (expect zero; flag if not)
- Any deviations with one-line justification
- Open questions for Brain — numbered Q1..Qn OR explicit "**None.**"

Stage:

```
packages/block-forge-core/src/rules/*.ts            # 7 new files
packages/block-forge-core/src/__tests__/heuristic-*.test.ts  # 6 new files
packages/block-forge-core/src/__tests__/rules-dispatcher.test.ts  # 1 new file
packages/block-forge-core/src/lib/hash.ts           # if created
packages/block-forge-core/src/index.ts              # modified
src/__arch__/domain-manifest.ts                     # modified
logs/wp-025/phase-3-task.md                         # this file
logs/wp-025/phase-3-result.md                       # your result log
```

Commit message:

```
feat(pkg-block-forge-core): six heuristics + generateSuggestions dispatcher [WP-025 phase 3]
```

Embed final SHA into result log post-commit (per WP-024 precedent).

---

## Hard gates — do not violate

- **All six heuristics skip already-adaptive rules** via `atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))`. Each heuristic's test case (3) proves this.
- **Nested-row NO-trigger contract** holds in `heuristic-flex-wrap.test.ts` — explicit test, not implied.
- **Dispatcher order is fixed.** Tests depend on the exact sequence declared in 3.2.
- **Deterministic IDs.** Same input → same IDs. Dispatcher test asserts IDs are unique across heuristics.
- **Zero type changes in `src/lib/types.ts`.** Phase 1 types were correctly sized per Phase 2's finding; expect same here. If you need a change, STOP and flag — types.ts changes affect every phase downstream.
- **`media-maxwidth` is the only heuristic that touches HTML.** Don't leak HTML-scanning into other heuristics — they're purely CSS-driven.
- **No compose-path code** — `src/compose/` stays absent. `applySuggestions`/`emitTweak` are Phase 4 even if "trivial" one-liners tempt you.
- **No fixture files** — `src/__tests__/fixtures/` stays absent. All inputs inline synthetic.

---

## Verification checklist — what phase-3-result.md MUST show

| # | Check | Expected |
|---|---|---|
| 1 | 7 heuristic source files + 7 test files exist | `ls packages/block-forge-core/src/rules/ packages/block-forge-core/src/__tests__/heuristic-*.test.ts` |
| 2 | `generateSuggestions` exported from package entry | grep `src/index.ts` |
| 3 | Manifest has +14 (or +15 with hash.ts) files | grep owned_files |
| 4 | known_gaps third entry says "Phase 3 shipped rules/ …" | grep |
| 5 | Arch-test 402 → ~416/0 with explained delta | output tail |
| 6 | Package tests: 9 files, ~45 tests, all green | test output tail |
| 7 | Typecheck clean monorepo | per-app exit 0 |
| 8 | Nested-row-NO-trigger test present & green | paste the `it()` body |
| 9 | Dispatcher determinism test present & green | paste assertion |
| 10 | Dispatcher order test present & green | paste heuristic-order assertion |
| 11 | ID uniqueness test present & green | paste assertion |
| 12 | No compose/ files created, no fixtures/ files created | `ls packages/block-forge-core/src/compose packages/block-forge-core/src/__tests__/fixtures 2>&1` errors |
| 13 | Types.ts unchanged | `git diff packages/block-forge-core/src/lib/types.ts` empty |

---

## What success looks like

Phase 4 opens to a working `generateSuggestions`, reads `Suggestion[]` output shape, and implements `applySuggestions(block, accepted)` that takes those suggestions and mutates CSS. The heuristic layer is isolated, well-tested, and the nested-row contract is documented in code via the failing-would-be-loud test. `block-nested-row` snapshot fixture in Phase 4 will cross-confirm the contract at end-to-end level.

If Phase 4 needs to add a field to `Suggestion` (e.g., a `replace: string` hint for the write path), that's a legitimate additive tweak to `types.ts` — but check this phase doesn't require it first.
