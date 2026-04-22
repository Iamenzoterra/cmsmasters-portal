# WP-025 Phase 5 — Proposal (Close doc propagation)

> **Role:** Hands — STEP 1 (propose). No doc edits yet.
> **Baseline:** arch-test 436/0, 75 tests green, typecheck clean, 6 public functions shipped.
> **Delta expected:** 6 doc files edited (5 `.md` + 1 `.ts` manifest), zero code files.

---

## 1 — Audit pass (verbatim current state)

### 1.1 `.context/BRIEF.md`

**L5 — last-updated date (stale, pre-Phase-5):**

> `> Last updated: 22 April 2026`

**L118-119 — last row in Current sprint table:**

> ```
> Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
> ```
> ```
> ```

No Block Forge Core row exists yet. Will be appended below the WP-024 row.

### 1.2 `.context/CONVENTIONS.md`

**L421-437 — "Responsive blocks (WP-024, ADR-025)" section (end of file):**

> ```
> ## Responsive blocks (WP-024, ADR-025)
>
> ### Slot container-type
>
> Layout Maker's css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule. Block CSS may author `@container slot (max-width: …) { … }` to react to the block's slot width. Only leaf slots carry containment; container slots (with `nested-slots`) hold nested `<div data-slot>` children and correctly skip the rule.
> …
> ### Responsive tokens file
>
> `packages/ui/src/theme/tokens.responsive.css` is a hand-maintained companion to `tokens.css`. `/sync-tokens` does NOT touch it. Currently two clamp-based scaffold tokens (`--space-section`, `--text-display`); real population is deferred to WP-029 so design choices can be informed by real use in WP-025/026. Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.
> ```

End-of-file line is L437. New section "Block Forge Core — when to call" will append at L438+.

### 1.3 `.claude/skills/domains/pkg-block-forge-core/SKILL.md`

**Full file (L1-30) — stub content slated for full rewrite:**

> ```
> ---
> domain: pkg-block-forge-core
> description: "Framework-agnostic responsive block authoring — CSS analyzer, auto-rules, tweak emitter, variant composer, preview renderer. Pure functions."
> source_of_truth: src/__arch__/domain-manifest.ts
> status: skeleton
> ---
>
> # pkg-block-forge-core — Block Forge Core Engine
>
> > **Status:** scaffold (Phase 1 — WP-025). Invariants/Traps/Recipes populated in Phase 5 Close.
> > **Purpose:** Pure-function engine for responsive block authoring. Consumed by tools/block-forge (future WP-026) and Studio Responsive tab (future WP-027).
>
> ## Start Here (Phase 1 — minimal)
>
> - [packages/block-forge-core/README.md](../../../../packages/block-forge-core/README.md) — what + why
> - [packages/block-forge-core/src/lib/types.ts](../../../../packages/block-forge-core/src/lib/types.ts) — public type surface
> - [workplan/WP-025-block-forge-core.md](../../../../workplan/WP-025-block-forge-core.md) — full architecture + phases
>
> ## Invariants
>
> TBD in Phase 5 Close (after implementation lands in Phases 2–4).
>
> ## Traps & Gotchas
>
> TBD in Phase 5 Close.
>
> ## Blast Radius
>
> TBD in Phase 5 Close.
> ```

Frontmatter preserved; `status: skeleton` → `status: full`. Body fully rewritten.

### 1.4 `workplan/BLOCK-ARCHITECTURE-V2.md`

**L7 — header blockquote:**

> ```
> > Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
> ```

One-line WP-025 cross-reference will append as the next blockquote paragraph (L8, preserving L7's existing `>` continuation).

### 1.5 `src/__arch__/domain-manifest.ts`

**L246-250 — current `known_gaps`:**

> ```
>     known_gaps: [
>       'important: heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025',
>       'note: fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder',
>       'note: Phase 4 shipped compose/ + 4 compose-path exports + 3 frozen fixtures + snapshot test. WP-025 code-complete — Phase 5 Close ships docs propagation only.',
>     ],
> ```

Phase-progress note (L249) is temporary scaffolding — removed. The D2 invariant (`var()`-skip) is added as a third `important:` entry so arch-test surfaces it.

### 1.6 `workplan/WP-025-block-forge-core.md`

**L5 — status line:**

> `**Status:** PLANNING`

**L11 — completed line:**

> `**Completed:** —`

Both flip in one pass per task hard gate (no half-flips).

---

## 2 — Routing table (fact → authoritative doc)

| Fact | Authoritative doc | Placement | Second lens? (justified cross-ref) |
|---|---|---|---|
| D1 — `data-block-shell` + `stripGlobalPageRules` parity; NOT `.block-{slug}` prefix scoping | `SKILL.md` Traps | "renderForPreview mirrors string-helper path — `data-block-shell` attribute + `stripGlobalPageRules` CSS; divergence from `.block-{slug}`-prefix assumption is intentional (portal parity)" | No duplicate — WP-024 close doc already carries the RSC vs string-helper split |
| D2 — heuristics skip `var(…)`, `calc(…)`, `%`, `vw/vh/em` (but NOT `rem`); tokenized content does NOT trigger clamp | `SKILL.md` Invariants (primary) + `CONVENTIONS.md` "Block Forge Core" brief note | Skill: engine-author lens; CONVENTIONS: block-author lens (why doesn't my tokenized padding trigger?) | ✅ two genuinely different audiences |
| D3 — variant name → breakpoint convention (`sm`/`4xx`→480, `md`/`6xx`→640, `lg`/`7xx`→768, else warn+skip) | `CONVENTIONS.md` "Block Forge Core" subsection | Block-author-facing — they choose variant names | No duplicate |
| `bp: 0` = top-level rule (not inside `@container`) | `SKILL.md` Invariants | Engine-internal emission contract | No duplicate |
| Fixtures-frozen contract (sha256 baseline; NEVER `/content-pull` into `fixtures/`) | `SKILL.md` Recipes + `domain-manifest` `known_gaps` (already there) | Skill: human reading the domain map; manifest: arch-test-visible | ✅ two lenses (human + machine) |
| `applySuggestions(block, []) === block` (ADR-025 "never auto-apply") | `SKILL.md` Invariants + `domain-manifest` `known_gaps` (already there as `important:`) | Skill: called out as #1 invariant; manifest: arch-test surfaces severity | ✅ two lenses (human + machine) |
| Public surface (6 functions + 11 types) | `CONVENTIONS.md` "Block Forge Core" subsection + `SKILL.md` Start Here / Public API | CONVENTIONS: one-line each; SKILL: file:line references | No duplicate — CONVENTIONS is name + intent only; SKILL is file map |

Routing discipline: each *contract* lives in exactly one authoritative place. Where two lenses exist (human vs machine, engine-author vs block-author), the cross-ref is intentional and the content differs — never copy-paste.

---

## 3 — Exact diffs

### File 1 — `.context/BRIEF.md`

**Diff A — bump last-updated date (L5):**

BEFORE:
```
> Last updated: 22 April 2026
```

AFTER:
```
> Last updated: 23 April 2026
```

**Diff B — append Block Forge Core row to Current sprint table (after L118):**

BEFORE (L117-119 context):
```
Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
```

AFTER:
```
Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
Block Forge Core                  ✅ DONE (WP-025: pure-function engine — 6 public fns, 75 tests, 3 frozen fixtures + E2E snapshot; unblocks WP-026 tools/block-forge + WP-027 Studio Responsive tab; ADR-025)
```

---

### File 2 — `.context/CONVENTIONS.md`

**Diff — append new section at end of file (after L437):**

BEFORE (L435-437, end of file):
```
### Responsive tokens file

`packages/ui/src/theme/tokens.responsive.css` is a hand-maintained companion to `tokens.css`. `/sync-tokens` does NOT touch it. Currently two clamp-based scaffold tokens (`--space-section`, `--text-display`); real population is deferred to WP-029 so design choices can be informed by real use in WP-025/026. Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.
```

AFTER (append below, preserving existing L437 final newline):
```
### Responsive tokens file

`packages/ui/src/theme/tokens.responsive.css` is a hand-maintained companion to `tokens.css`. `/sync-tokens` does NOT touch it. Currently two clamp-based scaffold tokens (`--space-section`, `--text-display`); real population is deferred to WP-029 so design choices can be informed by real use in WP-025/026. Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.

---

## Block Forge Core — when to call (WP-025, ADR-025)

`@cmsmasters/block-forge-core` is the pure-function engine behind responsive block authoring. Consumed by `tools/block-forge` (WP-026) and Studio Responsive tab (WP-027); never by portal at render time.

### Public surface (6 functions)

| Function | Returns | Purpose |
|---|---|---|
| `analyzeBlock({html, css})` | `BlockAnalysis` | PostCSS-AST parse → flat rules list + element tree + warnings |
| `generateSuggestions(analysis)` | `Suggestion[]` | Six ADR-025 heuristics in fixed order; IDs are deterministic djb2 hashes |
| `applySuggestions(block, accepted)` | `BlockOutput` | Emit accepted suggestions as `@container slot (max-width:Npx)` chunks (or top-level for `bp:0`). `accepted: []` → identity |
| `emitTweak(tweak, css)` | `string` | PostCSS mutation — append chunk / add inner rule / update decl |
| `composeVariants(base, variants)` | `BlockOutput` | Scope variant CSS under `[data-variant="{name}"]` + reveal-rule in `@container` |
| `renderForPreview(block, opts?)` | `PreviewResult` | Portal-parity preview — `<div data-block-shell="{slug}">…</div>` + `stripGlobalPageRules` CSS |

Types: `BlockInput`, `BlockOutput`, `BlockAnalysis`, `Rule`, `Element`, `Suggestion`, `Heuristic`, `Confidence`, `Tweak`, `Variant`, `PreviewResult` — from `packages/block-forge-core/src/lib/types.ts`.

### Variant name → breakpoint convention (locked)

| Variant name | Reveal breakpoint |
|---|---|
| `sm` or `/^4\d\d$/` | `(max-width: 480px)` |
| `md` or `/^6\d\d$/` | `(max-width: 640px)` |
| `lg` or `/^7\d\d$/` | `(max-width: 768px)` |
| anything else | no reveal rule — `onWarning` fires, variant CSS still inlined |

`composeVariants` warns (via optional callback) for unknown names; it never throws. Block authors pick names from this table or document a new one here.

### `bp: 0` — unconditional rules

`media-maxwidth` heuristic emits suggestions with `bp: 0`. In `applySuggestions` and `emitTweak` this is a branch: `bp === 0` → top-level rule, NOT wrapped in `@container`. Other heuristics never emit `bp: 0`.

### Why tokenized content doesn't trigger clamp suggestions

Heuristics intentionally skip values containing `var(…)`, `calc(…)`, `clamp(…)`, `min(…)`, `max(…)`, `%`, `vw/vh/em` (but NOT `rem`). Token-driven padding like `var(--spacing-5xl, 64px)` is already a design-system decision — rewriting it into `clamp()` would fight the token layer. Feature, not bug.

To get a clamp suggestion, author raw `px`/`rem` at ≥40px spacing or ≥24px font-size. If you see a block you expected to light up and didn't, check the CSS for `var(` first.

### Portal render parity

`renderForPreview` matches `apps/portal/lib/hooks.ts` → `renderBlock()` non-variant output: wrap in `<div data-block-shell="{slug}">`, pass CSS through `stripGlobalPageRules`. It does NOT prefix-scope with `.block-{slug}` — portal relies on authored `.block-{slug}` selectors already present in block CSS. If a future consumer embeds multiple blocks in one document (no iframe), use the exported `scopeBlockCss(css, slug)` helper for runtime isolation.
```

---

### File 3 — `.claude/skills/domains/pkg-block-forge-core/SKILL.md`

**Full rewrite.** Frontmatter preserved; `status: skeleton` → `status: full`. Complete new body below (see §4).

---

### File 4 — `workplan/BLOCK-ARCHITECTURE-V2.md`

**Diff — append one-line WP-025 cross-reference inside the header blockquote (after L7):**

BEFORE (L5-9):
```
> Status: DRAFT v2 — потребує підтвердження Brain
> Дата: 2026-03-31
> Замінює: hardcoded packages/blocks/ schemas model
> Контекст: WP-005A Phases 0-2 done (type→block rename), Phases 3-4 cancelled
> Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
```

AFTER:
```
> Status: DRAFT v2 — потребує підтвердження Brain
> Дата: 2026-03-31
> Замінює: hardcoded packages/blocks/ schemas model
> Контекст: WP-005A Phases 0-2 done (type→block rename), Phases 3-4 cancelled
> Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
> Engine update 2026-04-23 (WP-025 / ADR-025): `@cmsmasters/block-forge-core` ships the pure-function pipeline — `analyzeBlock` → `generateSuggestions` (6 heuristics) → `applySuggestions` / `emitTweak` / `composeVariants` / `renderForPreview`. Consumed by WP-026 (tools/block-forge Vite app) and WP-027 (Studio Responsive tab). See `.context/CONVENTIONS.md` → "Block Forge Core".
```

---

### File 5 — `src/__arch__/domain-manifest.ts`

**Diff — finalize `known_gaps` (L246-250):**

BEFORE:
```ts
    known_gaps: [
      'important: heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025',
      'note: fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder',
      'note: Phase 4 shipped compose/ + 4 compose-path exports + 3 frozen fixtures + snapshot test. WP-025 code-complete — Phase 5 Close ships docs propagation only.',
    ],
```

AFTER:
```ts
    known_gaps: [
      'important: heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025',
      'important: heuristics skip values containing var()/calc()/clamp()/min()/max()/%/vw/vh/em (rem allowed) — tokenized content does NOT trigger clamp suggestions by design',
      'note: fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder',
    ],
```

Changes: (a) added D2 invariant as new `important:` line; (b) removed phase-progress scaffolding note (Phase 4 entry). Two `important:` + one `note:` remain.

---

### File 6 — `workplan/WP-025-block-forge-core.md`

**Diff A — flip status (L5):**

BEFORE:
```
**Status:** PLANNING
```

AFTER:
```
**Status:** ✅ DONE
```

**Diff B — set completion date (L11):**

BEFORE:
```
**Completed:** —
```

AFTER:
```
**Completed:** 2026-04-23
```

---

## 4 — SKILL.md full new body (file 3 replacement)

```markdown
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
```

---

## 5 — Expected totals

- **Files edited:** 6 (5 `.md` + 1 `.ts` manifest)
- **Estimated diff size:** +140 / −10 lines (dominated by SKILL.md rewrite: +~130 new lines, −24 stub lines; ~+55 for CONVENTIONS subsection; ~+3 everywhere else; −3 in manifest known_gaps reshuffle)
- **Zero code files in `packages/`** — sanity-checked via `git diff --stat HEAD` before commit. If any `packages/block-forge-core/src/…` path appears in the stat, STOP.
- **Arch-test count stays 436/0** — zero new `owned_files`, zero new known_gaps-severity entries beyond the one reshuffle (2 `important:` + 1 `note:` vs prior 1 `important:` + 2 `note:`).

---

## 6 — Verification plan (for STEP 2 execute)

After applying every diff:

```bash
# 1. Arch-test — must stay 436/0
npm run arch-test                                | tail -5

# 2. Typecheck — monorepo clean
npx nx run-many -t typecheck                     | tail -10

# 3. Git stat — only .md + manifest + WP-025 + logs
git diff --stat HEAD                             # zero packages/block-forge-core/src paths

# 4. WP-025 status flip confirmation
head -15 workplan/WP-025-block-forge-core.md    # expect Status: ✅ DONE, Completed: 2026-04-23

# 5. SKILL.md frontmatter preserved + status flipped
head -6 .claude/skills/domains/pkg-block-forge-core/SKILL.md  # expect status: full

# 6. Manifest known_gaps shape
grep -A 5 "pkg-block-forge-core" src/__arch__/domain-manifest.ts | grep -E "important:|note:"
# expected 3 lines: 2 important + 1 note
```

If any check fails → STOP, investigate, re-propose single offending diff. Don't proceed past a red verification.

After green verification:

```bash
git add .context/BRIEF.md \
        .context/CONVENTIONS.md \
        .claude/skills/domains/pkg-block-forge-core/SKILL.md \
        workplan/BLOCK-ARCHITECTURE-V2.md \
        src/__arch__/domain-manifest.ts \
        workplan/WP-025-block-forge-core.md \
        logs/wp-025/phase-5-task.md \
        logs/wp-025/phase-5-proposal.md \
        logs/wp-025/phase-5-result.md

git commit -m "docs: WP-025 close — propagate block-forge-core contracts [WP-025 phase 5]"
```

Then write `logs/wp-025/phase-5-result.md` per task spec §STEP 2 item 3, and embed final SHA via `chore(logs)` follow-up commit.

---

STOP — awaiting Brain approval (do not proceed without explicit `approved — go`).
