# WP-025 Phase 2 — Task (Read path — analyzers)

> **Role:** Hands (execution)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 2 of 5 (Read path)
> **Estimated duration:** ~2–3h
> **Prerequisites:** Phase 1 ✅ — commits `11d926d9` (scaffold) + `1570764f` (SHA embed)
> **Baseline (from Phase 1 close):** arch-test **398/0**, typecheck clean, smoke test green

---

## Mission

Implement the engine's READ PATH: `analyzeBlock({ html, css })` returns a typed `BlockAnalysis` — flat rules list with at-rule context preserved + element tree + parse warnings. Pure function, zero side effects, deterministic output for identical inputs.

**No rule engine this phase.** Heuristics land in Phase 3; compose/write path in Phase 4; snapshot fixtures in Phase 4. Phase 2 is purely the parse-and-normalize layer that everything downstream builds on.

End-state: `import { analyzeBlock } from '@cmsmasters/block-forge-core'` works and returns a well-shaped `BlockAnalysis` for any reasonable block input. Edge cases (empty, malformed, deeply-nested at-rules) documented via unit tests with **inline synthetic CSS/HTML** — per Q1 resolution, zero fixture files this phase.

---

## Carry-overs from Phase 1 — use verbatim

| Item | Value | Where it applies |
|---|---|---|
| Arch-test baseline | **398/0** (not 384 — Phase 1 added 14 tests for new domain) | Phase 2 delta calculation; 398 → ~402 expected (4 new owned_files × path-existence) |
| PostCSS version | `8.5.10` installed nested under block-forge-core (confirmed via `npm ls postcss`) | Use as-is; do not upgrade, do not pin differently |
| node-html-parser version | `7.1.0` under block-forge-core | Use as-is |
| SKILL.md frontmatter | `domain` / `source_of_truth` / `status` required by Skill Parity test | No SKILL.md changes expected this phase (stub stays) |
| known_gaps prefix | `important:` or `note:` required by Known Gaps Severity test | When amending manifest gaps entries |
| Function export pattern | Phase 1 shipped types-only `export type { … }`. Phase 2 ADDS `analyzeBlock` as a runtime export | See task 2.5 |

---

## Scope contract — strict

**In scope:**
- `packages/block-forge-core/src/analyze/parse-css.ts` — PostCSS wrapper
- `packages/block-forge-core/src/analyze/parse-html.ts` — node-html-parser wrapper
- `packages/block-forge-core/src/analyze/analyze-block.ts` — top-level glue
- `packages/block-forge-core/src/__tests__/analyze-block.test.ts` — edge-case unit tests, **inline synthetic inputs only**
- `packages/block-forge-core/src/index.ts` — add `export { analyzeBlock } from './analyze/analyze-block'` below the existing type export
- `src/__arch__/domain-manifest.ts` — append 4 new files to `pkg-block-forge-core.owned_files`, update known_gaps scaffold-note to reflect Phase 2 progress

**Out of scope (do NOT write this phase):**
- Anything under `src/rules/` or `src/compose/` — Phase 3/4
- Any fixture files under `src/__tests__/fixtures/` — Phase 4
- Per-heuristic test files (`heuristic-*.test.ts`) — Phase 3
- Touching consumers (tools/, apps/) — future WPs
- Any type changes in `src/lib/types.ts` beyond **additive** clarifications if the declared types don't accommodate the implementation (document each change in result log)

**If implementation pushes against `types.ts` shapes:** additive tweaks OK (add optional fields, relax string unions); breaking changes STOP — escalate to Brain. Phase 1's types are a contract with future phases.

---

## Tasks

### 2.1 — `src/analyze/parse-css.ts`

**Goal:** PostCSS wrapper that parses CSS and walks to a flat `Rule[]` structure with at-rule context preserved. Must not throw on malformed input — return warnings instead.

**Signature:**

```ts
import type { Rule } from '../lib/types'

export interface ParseCSSResult {
  rules: Rule[]
  warnings: string[]
}

export function parseCSS(css: string): ParseCSSResult
```

**Implementation notes:**

- Use `postcss.parse(css, { from: undefined })` — `from: undefined` suppresses the "missing source" warning noise.
- Wrap parse in `try/catch`. On CssSyntaxError, return `{ rules: [], warnings: [`parse error: ${err.reason} at ${err.line}:${err.column}`] }`. Do NOT re-throw.
- Walk the AST via `root.walkRules(rule => …)`. For each rule:
  - `selector` = `rule.selector` verbatim (preserves `.block-{slug}` prefixes, compound selectors, etc.)
  - `declarations` = map over `rule.nodes` where `node.type === 'decl'`, extracting `{ prop: decl.prop, value: decl.value }`. Skip comments inside rules.
  - `atRuleChain` = walk `rule.parent` upward, collecting `@${atRule.name} ${atRule.params}` strings for each `AtRule` ancestor, bottom-up. Format: `"@container slot (max-width: 640px)"` (single space between name and params). Empty array for top-level rules.
- Handle nested `@container` / `@media` / `@supports` uniformly — all treated as at-rule context.
- Empty CSS (`""` or only whitespace) returns `{ rules: [], warnings: [] }`.

**Determinism:** rule order is walk order (DOM order of the source). No sorting, no shuffling.

**Imports allowed in this file:**
- `import postcss from 'postcss'` (or named: `import { parse, type AtRule, type Rule as PcssRule } from 'postcss'` — whatever compiles cleanly)
- `import type { Rule } from '../lib/types'` — re-named on import to avoid collision with PostCSS's `Rule` type (`import type { Rule as EngineRule } from '../lib/types'`)

### 2.2 — `src/analyze/parse-html.ts`

**Goal:** node-html-parser wrapper returning a shallow `Element[]` list — tag, classes, element-child count, parent tag.

**Signature:**

```ts
import type { Element } from '../lib/types'

export interface ParseHTMLResult {
  elements: Element[]
  warnings: string[]
}

export function parseHTML(html: string): ParseHTMLResult
```

**Implementation notes:**

- Use `parse(html)` from `node-html-parser`. Default options are fine (keeps scripts and style tags as elements — they're valid DOM).
- Walk all descendants (not just top-level). node-html-parser's `.querySelectorAll('*')` returns every element; iterate that.
- For each element:
  - `tag` = `el.tagName.toLowerCase()` (node-html-parser uppercases tags; normalize to lowercase for consistency with how heuristics will match).
  - `classes` = parse `el.classNames` (space-separated string → `string[]`; empty string → `[]`). Trim whitespace.
  - `childCount` = count of **element** children only (filter out text nodes and comments). In node-html-parser, iterate `el.childNodes` and filter by `node.nodeType === 1` (or use `.childNodes.filter(n => n.nodeType === NodeType.ELEMENT_NODE)` — whichever API the installed version exposes).
  - `parentTag` = `el.parentNode?.tagName?.toLowerCase() ?? null`. Top-level elements under the implicit document root get `null`.
- Empty HTML (`""` or whitespace-only) returns `{ elements: [], warnings: [] }`.
- Malformed HTML: node-html-parser is lenient — it won't throw on missing close tags etc. If the parser itself reports issues (it has no throwing API by default), emit nothing; rely on unit tests to pin behavior on malformed inputs.
- Comments (`<!-- … -->`) are NOT elements — filtered by the element-only walk.
- `<script>` and `<style>` tags ARE elements — they appear in the list. Heuristics will skip them; parsing shouldn't.

**Determinism:** element order is document order. No sorting.

### 2.3 — `src/analyze/analyze-block.ts`

**Goal:** Top-level glue function. Calls `parseCSS` + `parseHTML`, merges warnings, returns `BlockAnalysis`.

**Signature:**

```ts
import type { BlockAnalysis } from '../lib/types'
import { parseCSS } from './parse-css'
import { parseHTML } from './parse-html'

export interface AnalyzeBlockInput {
  html: string
  css: string
}

export function analyzeBlock(input: AnalyzeBlockInput): BlockAnalysis {
  const cssResult = parseCSS(input.css)
  const htmlResult = parseHTML(input.html)
  return {
    rules: cssResult.rules,
    elements: htmlResult.elements,
    warnings: [...cssResult.warnings, ...htmlResult.warnings],
  }
}
```

Keep it thin — one-liner glue. Don't add validation, don't defensively trim, don't log. All the smart work is in the two parsers.

**Note:** WP plan L269 signature says `analyzeBlock({ html, css })` — no `slug` field. That matches the `BlockInput` type's `html` + `css` fields (slug is stored elsewhere, not needed for AST analysis). If you find a strong reason to take full `BlockInput` here (e.g., slug used in a warning message), flag in result log — but default is shape above.

### 2.4 — `src/__tests__/analyze-block.test.ts`

**Goal:** Edge-case coverage via **inline synthetic inputs only**. Per Q1 resolution, fixtures land in Phase 4 for snapshot test; Phase 2 unit tests pin contracts with minimal string inputs.

**Required test cases (each a focused `it()` block):**

1. **Empty inputs** — `analyzeBlock({ html: '', css: '' })` returns `{ rules: [], elements: [], warnings: [] }`.
2. **Whitespace-only inputs** — same result as empty.
3. **Simple CSS + HTML** — `.foo { padding: 1rem; }` and `<div class="foo"><span>x</span></div>` produces exactly 1 rule with selector `.foo`, 1 decl `padding: 1rem`, empty atRuleChain; 2 elements (`div` with 1 child + 1 class, `span` with 0 children + parentTag `div`).
4. **Malformed CSS** — input like `.foo { padding: }` or `}` or `.foo { color: red` (unclosed). MUST NOT throw; returns warnings array with at least 1 entry; `rules` may be empty or partial depending on how PostCSS recovers. Assertion: `warnings.length >= 1` + `expect(() => analyzeBlock(…)).not.toThrow()`.
5. **Nested at-rules** — `@media (min-width: 640px) { @container slot (max-width: 400px) { .foo { padding: 1rem; } } }`. Rule `.foo` has `atRuleChain` of length 2 with entries in bottom-up order: `['@container slot (max-width: 400px)', '@media (min-width: 640px)']`. Pin exact strings and exact order.
6. **`.block-{slug}` prefix preserved verbatim** — `.block-hero .child { color: red; }` → rule selector is `.block-hero .child` exactly, no mutation.
7. **Block with no CSS** — `css: ''`, non-empty HTML → rules empty, elements populated.
8. **Block with no HTML** — non-empty CSS, `html: ''` → rules populated, elements empty.
9. **HTML with comments** — `<!-- hidden --><div>a</div>` → comments are NOT elements; `elements.length === 1` (just the div).
10. **HTML with `<script>` and `<style>`** — both ARE elements in the list; assert they appear with correct tags (`script`, `style`). No warnings.
11. **Multi-class HTML** — `<div class="  a  b   c  "></div>` → classes=`['a','b','c']` (trim + collapse whitespace; no empty strings).
12. **CSS declaration with nested functions** — `.foo { background: linear-gradient(to right, red, blue); }` → value preserved verbatim as string `"linear-gradient(to right, red, blue)"`. Comma-containing values don't split.
13. **Top-level at-rule with no nested rule** — `@media (min-width: 640px) { }` → produces zero rules, no warning (empty at-rules are valid).
14. **Determinism smoke** — run `analyzeBlock` on the same input twice; assert the two results are deep-equal. Catches accidental nondeterminism (e.g., `Map` iteration order) early.

Structure the file as one `describe('analyzeBlock', …)` block with nested `describe` for "CSS parsing", "HTML parsing", "glue + warnings" if it helps readability. Each `it()` uses inline string literals — NO imports of fixture files, NO file reads. Short, table-like test bodies.

**Expected test count:** ~14 tests, all green.

### 2.5 — Public export + manifest update

**`src/index.ts`** — add runtime export below the existing type block:

```ts
// ... existing export type block unchanged ...

export { analyzeBlock } from './analyze/analyze-block'
```

**`src/__arch__/domain-manifest.ts`** — append 4 new files to `pkg-block-forge-core.owned_files`:

```ts
'packages/block-forge-core/src/analyze/parse-css.ts',
'packages/block-forge-core/src/analyze/parse-html.ts',
'packages/block-forge-core/src/analyze/analyze-block.ts',
'packages/block-forge-core/src/__tests__/analyze-block.test.ts',
```

Update the third `known_gaps` entry from:

```
'note: scaffold-only in Phase 1: analyze/ rules/ compose/ trees + function exports land in Phases 2-4',
```

to:

```
'note: Phase 2 shipped analyze/ + analyzeBlock export. rules/ compose/ trees + remaining function exports land in Phases 3-4',
```

Keep the `note:` prefix — required by Known Gaps Severity test (Phase 1 discovery).

### 2.6 — Install + verify

No new deps — postcss + node-html-parser already installed in Phase 1. Skip `npm install` unless you hit a resolution issue.

```bash
npm run arch-test
```

Expected: **~402/0** (398 baseline + ~4 new path-existence tests for the 4 new owned_files). Any delta beyond that needs explanation in the result log. Red tests block the phase.

```bash
npm -w @cmsmasters/block-forge-core run test
```

Expected: ~14 analyze tests green + 1 smoke test green = **15 tests, 2 files**.

```bash
npm run typecheck
```

Expected: clean across monorepo. PostCSS and node-html-parser types must resolve cleanly.

**Sanity — verify no scope creep:**

```bash
git status --short packages/block-forge-core/
```

Expected changes: exactly the 4 new files under `src/analyze/`, the new `src/__tests__/analyze-block.test.ts`, and the modified `src/index.ts`. Nothing under `src/rules/` or `src/compose/`.

### 2.7 — Log + commit

Write `logs/wp-025/phase-2-result.md` with:

- What shipped (file list + LoC estimate per file)
- Arch-test delta (398 → N) with per-test-type accounting (e.g., "+4 path-existence")
- Test count per file + totals
- Any type-shape tweaks in `types.ts` (should be zero; flag if not)
- Any deviations from this task prompt with one-line justification each
- Representative test output snippet (one green `it()` line per test category — CSS edge cases, HTML edge cases, glue)
- Open questions for Brain — numbered Q1..Qn OR explicit "**None.**"

Stage ONLY:

```
packages/block-forge-core/src/analyze/parse-css.ts
packages/block-forge-core/src/analyze/parse-html.ts
packages/block-forge-core/src/analyze/analyze-block.ts
packages/block-forge-core/src/__tests__/analyze-block.test.ts
packages/block-forge-core/src/index.ts
src/__arch__/domain-manifest.ts
logs/wp-025/phase-2-task.md
logs/wp-025/phase-2-result.md
```

Commit message:

```
feat(pkg-block-forge-core): analyzeBlock + CSS/HTML AST wrappers [WP-025 phase 2]
```

Embed the final commit SHA into `phase-2-result.md` as a post-commit follow-up (per WP-024 precedent).

---

## Hard gates — do not violate

- **Deterministic output.** Identical inputs → identical `BlockAnalysis` (deep-equal). Catch via the determinism smoke test (case 14).
- **Zero throws on malformed input.** Every malformed case in the test suite wraps with `.not.toThrow()` assertion.
- **PostCSS AST is not leaked.** The `Rule` shape returned is the engine's plain-object `Rule`, not PostCSS's. Future phases (and future consumers) must not have to import PostCSS types.
- **node-html-parser AST is not leaked.** Same rule for `Element`.
- **No new public types.** Only `analyzeBlock` becomes exported. All types were declared in Phase 1's `src/lib/types.ts`; implementation conforms to them.
- **Element tag is lowercase.** Consistency contract — heuristics in Phase 3 will match on lowercase.
- **atRuleChain order is bottom-up** — innermost at-rule first. This is the ergonomic order for "is this rule inside a `@container`?" checks that Phase 3 heuristics will run.
- **No scope creep into Phase 3/4 work** — even if implementation reveals a clean place to add a heuristic helper or a compose stub.

---

## Verification checklist — what phase-2-result.md MUST show

| # | Check | Expected | How to capture |
|---|---|---|---|
| 1 | 4 new source files exist | `ls packages/block-forge-core/src/analyze/ packages/block-forge-core/src/__tests__/` | captured |
| 2 | `analyzeBlock` exported from package entry | `grep "analyzeBlock" packages/block-forge-core/src/index.ts` | captured |
| 3 | Manifest has +4 files under `pkg-block-forge-core.owned_files` | `grep -n "analyze/parse-css\|analyze/parse-html\|analyze/analyze-block\|analyze-block.test" src/__arch__/domain-manifest.ts` | captured |
| 4 | known_gaps third entry amended with `note:` prefix | `grep "note: Phase 2 shipped" src/__arch__/domain-manifest.ts` | captured |
| 5 | arch-test green with explained delta | `npm run arch-test` output tail — new count + per-type accounting | captured |
| 6 | package tests green | `npm -w @cmsmasters/block-forge-core run test` — 2 files, ~15 tests | captured |
| 7 | typecheck clean across monorepo | run per-app typechecks (portal, studio, api, layout-maker, new pkg) all exit 0 | captured |
| 8 | PostCSS types don't leak — `Rule` in exports is engine's | `grep "import.*postcss.*Rule" packages/block-forge-core/src/index.ts` returns nothing | captured |
| 9 | Determinism test present and green | test case 14 visible in output | captured |
| 10 | Malformed CSS doesn't throw | tests 4 + (any other malformed cases) with `.not.toThrow()` | captured |
| 11 | atRuleChain bottom-up order | test 5 asserts exact array order | captured |
| 12 | No rules/ or compose/ files created | `ls packages/block-forge-core/src/rules packages/block-forge-core/src/compose 2>&1` returns no such dir | captured |

---

## What success looks like

Phase 3 opens `phase-2-result.md`, sees `analyzeBlock` working + deterministic, knows the `Rule[]` shape and `atRuleChain` semantics, and can write heuristics as pure functions from `BlockAnalysis` to `Suggestion[]` without ever opening a PostCSS docs page. The analyze layer is done; rules layer builds on top of it cleanly.

If Phase 3 would need a change to `Rule` or `Element` shape after Phase 2 ships, Phase 2 left something on the table. Expected outcome: zero shape changes in Phases 3-4.
