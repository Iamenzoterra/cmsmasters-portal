---
domain: pkg-block-forge-core
description: "Framework-agnostic responsive block authoring — CSS analyzer, auto-rules, tweak emitter, variant composer, preview renderer. Pure functions."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

# pkg-block-forge-core — Block Forge Core Engine

> **Purpose:** Pure-function engine for responsive block authoring. Turns `{html, css}` into `{html, css, variants}` via ADR-025's 4-layer model (heuristics → tweaks → shared tokens → variants). Consumed by `tools/block-forge` (WP-026) and Studio Responsive tab (WP-027); never by portal at render time.

## Start Here

1. `packages/block-forge-core/src/index.ts` — public surface (6 functions + 11 types)
2. `packages/block-forge-core/src/lib/types.ts` — type definitions (`BlockInput/Output/Analysis`, `Suggestion`, `Tweak`, `Variant`, `PreviewResult`)
3. `packages/block-forge-core/src/rules/index.ts` — dispatcher: fixed order + deterministic IDs (djb2)
4. `packages/block-forge-core/src/compose/apply-suggestions.ts` — how accepted suggestions become `@container` chunks
5. `packages/block-forge-core/src/__tests__/snapshot.test.ts` — E2E pipeline against 3 frozen fixtures

## Public API

- `analyzeBlock(input)` — parse to rules + element tree
- `generateSuggestions(analysis)` — six ADR-025 heuristics, fixed order: `grid-cols` → `spacing-clamp` → `font-clamp` → `flex-wrap` → `horizontal-overflow` → `media-maxwidth`
- `applySuggestions(block, accepted)` — emit accepted as `@container slot (max-width: Npx)` blocks; identity on `accepted: []`
- `emitTweak(tweak, css)` — single-tweak PostCSS mutation (append container / add rule / update decl)
- `composeVariants(base, variants)` — scope + reveal-rule variant plumbing
- `renderForPreview(block, opts?)` — portal-parity preview HTML+CSS pair

## Invariants

- **Never auto-apply.** `applySuggestions(block, []).css === block.css` holds byte-for-byte. Consumers MUST present suggestions for accept/tweak/reject per ADR-025. The engine produces; it does not commit.
- **Heuristics skip unsafe values.** Spacing and font heuristics reject values containing `var(…)`, `calc(…)`, `clamp(…)`, `min(…)`, `max(…)`, `%`, `vw/vh/em` (`rem` is allowed). Token-driven content is out of scope — rewriting tokenized padding would fight the design-system layer.
- **Fixed dispatcher order.** `generateSuggestions` always emits in the order: grid-cols, spacing-clamp, font-clamp, flex-wrap, horizontal-overflow, media-maxwidth. Downstream consumers may re-sort, but the dispatcher output is deterministic.
- **Deterministic IDs.** Every `Suggestion.id` is `{heuristic}-{stableHash8(selector|bp|property|value)}` — djb2. Identical analysis → identical suggestion set, byte-for-byte.
- **`bp: 0` = top-level rule.** Only `media-maxwidth` emits `bp: 0`. Both `applySuggestions` and `emitTweak` special-case this as a top-level rule, not wrapped in `@container`. All other heuristics use `bp ∈ {480, 640, 768}`.
- **Already-adaptive skip.** A rule nested inside any `@container` or `@media` chain is considered author-managed and skipped by all heuristics. Five of six heuristics inline the guard (`rule.atRuleChain.some(…)`); `media-maxwidth` is element-driven and doesn't need it.
- **Nested flex-row NO-trigger.** `flex-wrap` only fires when the matched element's parent is `null` or `body`. A `.nav` inside `<header>` with 4 anchors does NOT emit — locked hardcoded + via snapshot on `block-nested-row` fixture.
- **Fixtures frozen.** `src/__tests__/fixtures/` contains 3 real blocks extracted from `content/db/blocks/` with sha256 pinned in `fixtures/README.md`. Never run `/content-pull` into this folder. Source drift is a deliberate act — update the hash + snapshot together.

## Traps & Gotchas

- **Portal render parity uses `data-block-shell`, NOT `.block-{slug}`.** `renderForPreview` mirrors `apps/portal/lib/hooks.ts` → `renderBlock()` exactly: `<div data-block-shell="{slug}">…</div>` + `stripGlobalPageRules(css)`. The `.block-{slug}` prefix lives in block-authoring convention inside the CSS itself, not in the wrapper. If you prefix-scope the wrapper, you'll break tag visibility in Studio preview iframe. Use `scopeBlockCss()` only for non-iframe document embedding.
- **`atRuleChain` is innermost-first (bottom-up).** The rule inside `@media (min-width: 640px) { @container slot (max-width: 480px) { .foo {} } }` has `atRuleChain: ['@container slot (max-width: 480px)', '@media (min-width: 640px)']`. If you write a top-down traversal guard, flip the order.
- **`(?<!r)em` negative lookbehind.** The unsafe-value regex must exclude `rem` while rejecting `em`. Look for `/(var\(|…|(?<!r)em\b)/i`. If you simplify to `/em\b/`, you'll wrongly reject `1.25rem`.
- **Snapshot updates require hash verification.** A red snapshot with no code change usually means the fixture source drifted. Re-run `sha256sum content/db/blocks/{…}.json` against `fixtures/README.md` before regenerating the snap. If the sha drifted, that's the real bug.
- **Fluid clamp formula constant.** `clamp(minPx, (maxPx/19.2).toFixed(2)vw, maxPx)` hits max at ~1920vw viewport. Changing the divisor (e.g., to `/10.8` for 1080vw) changes every suggestion — will fail the dispatcher determinism test and the snapshot in one go.
- **`composeVariants` unknown-name is soft.** Unknown variant names emit a warning via optional callback and skip the reveal rule, but the variant CSS IS still scoped and inlined. Upstream validators (`packages/validators`) should reject bad names; engine is permissive so it doesn't crash on legacy data.

## Blast Radius

- **Changing `rules/index.ts` dispatcher order** → breaks the dispatcher test (`rules-dispatcher.test.ts`), and every consumer that cares about suggestion ordering (none today; watch WP-026/027 as they land).
- **Changing the hash function in `lib/hash.ts`** → every existing snapshot and every persisted suggestion ID rotates. Treat as a breaking change; document in ADR if ever done.
- **Changing `bp: 0` semantics in `apply-suggestions.ts` / `emit-tweak.ts`** → media-maxwidth output shape flips (top-level vs nested). All 3 fixture snapshots change. Accept consciously.
- **Changing variant name → bp mapping in `compose-variants.ts`** → any existing block authored against the current convention stops revealing correctly. Breaking change for WP-026/027 consumers.
- **Editing fixtures/\*.html or fixtures/\*.css without re-running sha256** → arch-test stays green (path existence only) but snapshot explodes silently. Always update `fixtures/README.md` sha hashes in the same commit.

## Recipes

### Full pipeline in 4 calls

```ts
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  renderForPreview,
} from '@cmsmasters/block-forge-core'

const input = { slug: 'hero', html, css }
const analysis = analyzeBlock(input)
const suggestions = generateSuggestions(analysis)
// Present suggestions to user; capture accepted subset
const applied = applySuggestions(input, acceptedSubset)
const preview = renderForPreview(applied) // { html, css } for iframe
```

### Emitting a single author-driven tweak

```ts
import { emitTweak } from '@cmsmasters/block-forge-core'

const newCss = emitTweak(
  { selector: '.hero', bp: 640, property: 'padding', value: '24px' },
  block.css,
)
```

Case behavior: appends new `@container` chunk if none exists for that bp; adds inner rule if container exists but selector doesn't; updates declaration if selector + property both present.

### Composing variants with reveal plumbing

```ts
import { composeVariants } from '@cmsmasters/block-forge-core'

const warnings: string[] = []
const composed = composeVariants(
  base,
  [{ name: 'sm', html: smHtml, css: smCss }],
  msg => warnings.push(msg),
)
```

`composed.html` = `<div data-variant="base">…</div><div data-variant="sm" hidden>…</div>`.
`composed.css` = base CSS + variant CSS scoped under `[data-variant="sm"]` + reveal rule inside `@container slot (max-width: 480px)`.

### Writing a new heuristic

1. Create `packages/block-forge-core/src/rules/heuristic-{name}.ts` exporting `(analysis: BlockAnalysis) => Suggestion[]`.
2. Inline the `atRuleChain` already-adaptive guard (5 existing heuristics do this).
3. Use `suggestionId(heuristic, selector, bp, property, value)` from `lib/hash.ts` for deterministic IDs.
4. Register in `rules/index.ts` dispatcher at the correct fixed-order position.
5. Add unit test under `__tests__/heuristic-{name}.test.ts` covering: trigger, non-trigger, already-adaptive skip, dedupe.
6. Run `npm run arch-test` to verify manifest + skill parity.

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025
- **important:** heuristics skip values containing var()/calc()/clamp()/min()/max()/%/vw/vh/em (rem allowed) — tokenized content does NOT trigger clamp suggestions by design
- **note:** fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder
