# WP-025 Phase 4 — Task (Write path — applicator, emitter, composer, preview)

> **Role:** Hands (execution)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 4 of 5 (Write path + fixtures + snapshot)
> **Estimated duration:** ~2–3h
> **Prerequisites:** Phase 3 ✅ — commits `7c0fde92` (impl) + `b0f020f8` (SHA embed)
> **Baseline (from Phase 3 close):** arch-test **417/0**, typecheck clean, 43 tests green, `analyzeBlock` + `generateSuggestions` exported

---

## Mission

Implement the WRITE PATH: apply accepted suggestions, emit tweaks, compose variants, render preview. Introduce the 3 frozen real-block fixtures with sha256 verification against Phase 0 carry-overs. Snapshot test exercises the full pipeline end-to-end. Four remaining public exports land: `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`. Package public API is complete after this phase.

**Phase 5 (Close) is a docs/manifest/WP-status phase only** — all code ships here.

---

## Carry-overs from Phase 3 — use verbatim

| Item | Value | Where it applies |
|---|---|---|
| Arch-test baseline | **417/0** | Phase 4 delta calc — 417 → ~436/0 expected (+19 new owned_files × path-existence) |
| Hash helper | `packages/block-forge-core/src/lib/hash.ts` (djb2, `djb2Hash8` exports) | `emit-tweak.ts` + `apply-suggestions.ts` use it for deterministic `@container` rule IDs / ordering if needed |
| Suggestion order | Dispatcher emits in fixed order: grid-cols → spacing-clamp → font-clamp → flex-wrap → horizontal-overflow → media-maxwidth | `applySuggestions` must be order-agnostic (consumer may pass a filtered subset); internal sort before application for determinism |
| atRuleChain bottom-up | Innermost at-rule first | When building new `@container` rules for emitted tweaks, emit top-to-bottom (portal-CSS style) but represent the atRuleChain consistently with Phase 2 semantics |
| Inline `isAlreadyAdaptive` precedent | Phase 3 inlined the helper per-file to avoid circular imports | OK to continue pattern if a compose file needs it; also OK to consolidate into `src/lib/at-rules.ts` this phase since lib/ is already a going concern |

---

## Carry-overs from Phase 0 — fixture bootstrap contracts

| Fixture | Source file | sha256 (frozen) | Role |
|---|---|---|---|
| `block-spacing-font` | `content/db/blocks/fast-loading-speed.json` | `91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a` | Triggers spacing-clamp (`padding: 64px 40px`) + font-clamp (`60px`) |
| `block-plain-copy` | `content/db/blocks/sidebar-perfect-for.json` | `263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452` | Near-zero triggers (negative-case baseline) |
| `block-nested-row` | `content/db/blocks/header.json` | `36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91` | Nested flex-row (4 anchors in `__links` child) — documents "nested flex-row NOT a trigger" contract at E2E level |

---

## Scope contract — strict

**In scope (4 source + 2 lib + 5 tests + 6 fixtures + 2 READMEs + exports + manifest = 20 new/modified paths):**

Compose (4):
- `packages/block-forge-core/src/compose/apply-suggestions.ts`
- `packages/block-forge-core/src/compose/emit-tweak.ts`
- `packages/block-forge-core/src/compose/compose-variants.ts`
- `packages/block-forge-core/src/compose/render-preview.ts`

Lib helpers (2):
- `packages/block-forge-core/src/lib/container-query.ts` — `buildAtContainer(bp, body)` pure helper
- `packages/block-forge-core/src/lib/css-scoping.ts` — `scopeBlockCss(css, slug)` + sibling helpers

Tests (5):
- `packages/block-forge-core/src/__tests__/apply-suggestions.test.ts`
- `packages/block-forge-core/src/__tests__/emit-tweak.test.ts`
- `packages/block-forge-core/src/__tests__/compose-variants.test.ts`
- `packages/block-forge-core/src/__tests__/render-preview.test.ts`
- `packages/block-forge-core/src/__tests__/snapshot.test.ts`

Fixtures (6 + 2 READMEs):
- `packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.{html,css}`
- `packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.{html,css}`
- `packages/block-forge-core/src/__tests__/fixtures/block-nested-row.{html,css}`
- `packages/block-forge-core/src/__tests__/fixtures/README.md`
- `packages/block-forge-core/src/__tests__/README.md`

Exports + manifest:
- `packages/block-forge-core/src/index.ts` — add 4 runtime exports
- `src/__arch__/domain-manifest.ts` — add 19 new files to `owned_files`, finalize known_gaps

**Out of scope:**
- Touching `src/analyze/` or `src/rules/` — done in prior phases
- Any doc propagation (BRIEF.md, CONVENTIONS.md, SKILLs) — **Phase 5 Close**, under approval gate
- Flipping WP-025 to DONE — Phase 5
- Any consumer (tools/, apps/studio/) — future WPs

---

## Tasks

### 4.0 — Fixture bootstrap (MUST run first, before any snapshot work)

Snapshot test depends on fixtures existing. Do this subtask first so the rest of Phase 4 lives in a consistent test environment.

**4.0.1** — Re-verify sha256 against Phase 0 carry-over. If ANY hash drifted (source JSON changed since Phase 0), **STOP** — we're downstream of uncaptured drift. Flag in result log, do not proceed.

```bash
sha256sum content/db/blocks/fast-loading-speed.json
sha256sum content/db/blocks/sidebar-perfect-for.json
sha256sum content/db/blocks/header.json
```

Expected output matches the table above byte-for-byte.

**4.0.2** — Extract `html` + `css` fields from each JSON into the 6 fixture files:

For each source → target pair:
- Read source JSON as text
- Parse `.html` field → write to `block-{role}.html` as UTF-8, no trailing newline mutation (preserve as-is)
- Parse `.css` field → write to `block-{role}.css` as UTF-8, same preservation rule

Use a small node one-liner or inline script; do NOT commit the extraction script. Only the output files land.

**4.0.3** — Write `packages/block-forge-core/src/__tests__/fixtures/README.md`:

```markdown
# Frozen fixtures — DO NOT /content-pull into this folder

These block payloads are extracted from `content/db/blocks/` and frozen for snapshot stability.

## Contract

| Fixture | Source file | sha256 at freeze time | Role |
|---|---|---|---|
| `block-spacing-font` | `content/db/blocks/fast-loading-speed.json` | `91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a` | spacing-clamp + font-clamp E2E |
| `block-plain-copy` | `content/db/blocks/sidebar-perfect-for.json` | `263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452` | negative-case baseline |
| `block-nested-row` | `content/db/blocks/header.json` | `36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91` | nested flex-row (documents NO-trigger contract at E2E level) |

Frozen: WP-025 Phase 0 (2026-04-22).

Updating these fixtures is a deliberate act — never an automatic side-effect of `/content-pull` or any content sync. If the source block evolves and the fixture needs to reflect that, re-extract manually + update sha256 in this README + refresh snapshot + document the why in a commit.
```

**4.0.4** — Write `packages/block-forge-core/src/__tests__/README.md`:

```markdown
# Tests — strategy split

Block Forge Core has two distinct test modes. Both live here; know which one you're writing.

## Per-heuristic and per-function unit tests

Inline synthetic CSS/HTML strings as test input. Short, focused, read like tables. No fixture files. Pin trigger/non-trigger/adaptive-skip/confidence contracts cleanly.

Files: `analyze-block.test.ts`, `heuristic-*.test.ts`, `apply-suggestions.test.ts`, `emit-tweak.test.ts`, `compose-variants.test.ts`, `render-preview.test.ts`, `rules-dispatcher.test.ts`, `smoke.test.ts`.

## Snapshot test

`snapshot.test.ts` runs the full pipeline `analyze → suggest → applyAll → compose → renderForPreview` against the 3 frozen real-block fixtures under `fixtures/`. It captures end-to-end behavior on actual content shapes.

Grid and root-flex-row heuristics do not currently fire on any block in `content/db/blocks/`. The snapshot chronicles this — it is information, not a coverage gap. Per-heuristic unit tests exercise those heuristics with synthetic inputs.

## When to update

- Inline test fails → probably the heuristic / compose function changed behavior. Update test if intentional, investigate if not.
- Snapshot fails → either the engine changed OR a fixture's source JSON drifted (never run `/content-pull` into `fixtures/`). Re-run `sha256sum` against the source paths in `fixtures/README.md` first. If source matches and snapshot changed, update snapshot deliberately.
```

### 4.1 — `src/compose/apply-suggestions.ts`

**Signature:**

```ts
import type { BlockInput, BlockOutput, Suggestion } from '../lib/types'

export function applySuggestions(block: BlockInput, accepted: Suggestion[]): BlockOutput
```

**Contract:**

- `accepted: []` returns a structurally-equivalent `BlockOutput` (same slug + html + css; no variants unless block had them — it doesn't at input). **Explicit test:** `applySuggestions(block, []).css === block.css` AND `.html === block.html`.
- Identical `(block, accepted)` → identical output string-for-string (deterministic).
- Internally sort `accepted` by `(heuristic-order-index, bp asc, selector asc, property asc)` before application. Use the same heuristic order as dispatcher (Phase 3).
- Preserves original declaration order for rules that are untouched.
- For each accepted suggestion, emit the `@container slot (max-width: {bp}) { {selector} { {property}: {value}; } }` chunk via `buildAtContainer()` (task 4.6.1). Append to end of CSS string (simplest deterministic placement).
- Media-maxwidth suggestions use `bp: 0` — these don't belong in `@container`. Emit them as top-level rules inside the block's CSS (wrapped in nothing — just `selector { property: value; }`). Or: if `bp === 0`, skip `@container` wrapper. Document the branch.
- No mutation of input — return new objects.

**Imports allowed:** `../lib/types`, `../lib/container-query`, `../lib/hash` (if you need deterministic ordering key for collisions).

### 4.2 — `src/compose/emit-tweak.ts`

**Signature:**

```ts
import type { Tweak } from '../lib/types'

export function emitTweak(tweak: Tweak, css: string): string
```

**Contract:**

- Given `{selector, bp, property, value}` and existing CSS, return a new CSS string with the tweak applied:
  - **Case A — no existing `@container slot (max-width: {bp})` rule:** append a new one with `{ {selector} { {property}: {value}; } }`.
  - **Case B — existing `@container slot (max-width: {bp})` rule exists but `selector` inside it doesn't have this declaration:** add the declaration to the matching inner rule.
  - **Case C — existing declaration inside matching `@container` for this exact `{selector, property}`:** update the value; preserve other declarations in that rule.
- Deterministic ordering. If multiple `@container` chunks exist for different `bp`s, emit in ascending `bp` order (append-only, don't re-sort existing authored order — just ensure new additions land in the right spot).
- Use PostCSS to parse, mutate, stringify. This is the natural shape; regex is brittle for nested at-rules.
- `bp === 0` — special-case. Emit as top-level rule, not inside `@container`. Document the branch.
- Identical `(tweak, css)` input → identical output.

**Imports allowed:** `../lib/types`, `../lib/container-query`, `postcss`.

### 4.3 — `src/compose/compose-variants.ts`

**Signature:**

```ts
import type { BlockInput, BlockOutput, Variant } from '../lib/types'

export function composeVariants(base: BlockInput, variants: Variant[]): BlockOutput
```

**Contract:**

- Wraps base HTML in `<div data-variant="base">{base.html}</div>`.
- For each variant in order, appends `<div data-variant="{variant.name}" hidden>{variant.html}</div>`.
- Emits concatenated HTML: base wrapper + all variant wrappers, in declared order.
- For CSS:
  - Starts with `base.css` (verbatim).
  - Appends each variant's CSS scoped under `[data-variant="{variant.name}"]` — i.e., prefix every top-level rule's selector with `[data-variant="{name}"] `.
  - Appends a reveal block per variant: `@container slot ({condition}) { [data-variant="base"] { display: none; } [data-variant="{name}"] { display: block; } }`.
  - The `{condition}` for each variant comes from convention: variant names like `sm`, `md`, `lg` (or `480`, `640`, `768`) map to `(max-width: 640px)`, etc. The mapping is **fixed by variant NAME convention** — document it explicitly.
- `variants: []` → output matches input shape with `variants: undefined` (don't synthesize an empty object; downstream code may check `block.variants?.`).
- Deterministic: variant declaration order preserved in output HTML and reveal-CSS order.
- Returns `BlockOutput` with `variants` populated as `Record<name, {html, css}>` for downstream compatibility with DB shape (`BlockVariants` type from pkg-db).

**Variant name → breakpoint mapping — fix this convention this phase:**

```
name='sm' or name matches /^4\d\d$/ → (max-width: 480px)
name='md' or name matches /^6\d\d$/ → (max-width: 640px)
name='lg' or name matches /^7\d\d$/ → (max-width: 768px)
otherwise → emit warning, skip reveal rule for that variant
```

If Hands finds this convention too narrow, flag in result log + propose alternative — don't invent.

**Imports allowed:** `../lib/types`, `../lib/container-query`, `../lib/css-scoping`.

### 4.4 — `src/compose/render-preview.ts`

**Signature:**

```ts
import type { BlockInput, PreviewResult } from '../lib/types'

export interface RenderForPreviewOptions {
  width?: number   // viewport hint for preview iframe — optional
}

export function renderForPreview(block: BlockInput, opts?: RenderForPreviewOptions): PreviewResult
```

**Contract:**

- For non-variant blocks (i.e., `BlockInput` without `variants`): output HTML+CSS must match portal's `renderBlock()` non-variant output shape.
  - **Hands must read portal's renderer** before writing this function. Likely location: `apps/portal/lib/` or `apps/portal/app/` — grep for `renderBlock`. Record the exact file:line you matched against in the result log.
  - Portal wraps block HTML in `.block-{slug}` div; scopes CSS under that class. Match this.
- For blocks with variants: call `composeVariants` internally; output already matches WP-024 Phase 3 inline-variants shape.
- `width` option: if provided, wrap output HTML in a sized container for iframe preview: `<div style="max-width: {width}px; margin: 0 auto;">{rendered}</div>`. If absent, emit no outer constraint. Document behavior in the result log.
- Use `scopeBlockCss(css, slug)` helper (task 4.6.2) for the scoping step — shared with portal semantics.
- Deterministic output.

**Imports allowed:** `../lib/types`, `./compose-variants`, `../lib/css-scoping`.

### 4.5 — `src/__tests__/snapshot.test.ts`

**Goal:** Exercise the full pipeline on all 3 frozen fixtures. Capture output to committed snapshots. Vitest's `toMatchSnapshot()` writes `__tests__/__snapshots__/snapshot.test.ts.snap` — commit it.

**Contract:**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeBlock, generateSuggestions, applySuggestions, renderForPreview } from '../index'

const FIXTURE_DIR = join(__dirname, 'fixtures')

function loadFixture(name: string) {
  return {
    slug: name,
    html: readFileSync(join(FIXTURE_DIR, `${name}.html`), 'utf-8'),
    css: readFileSync(join(FIXTURE_DIR, `${name}.css`), 'utf-8'),
  }
}

describe('snapshot — end-to-end pipeline', () => {
  for (const name of ['block-spacing-font', 'block-plain-copy', 'block-nested-row']) {
    it(`produces stable pipeline output for ${name}`, () => {
      const input = loadFixture(name)
      const analysis = analyzeBlock(input)
      const suggestions = generateSuggestions(analysis)
      const applied = applySuggestions(input, suggestions)
      const rendered = renderForPreview(applied)

      expect({
        fixture: name,
        suggestionCount: suggestions.length,
        suggestionHeuristics: suggestions.map(s => s.heuristic).sort(),
        warnings: analysis.warnings,
        renderedHtml: rendered.html,
        renderedCss: rendered.css,
      }).toMatchSnapshot()
    })
  }
})
```

Run once with `--update-snapshot` to generate; then commit the `.snap` file + add it to owned_files.

**Expected chronicled observations** (document in result log — they are the point of the snapshot):
- `block-spacing-font` → suggestions include `spacing-clamp` + `font-clamp` entries; zero `grid-cols`, zero `flex-wrap` (column-flex root).
- `block-plain-copy` → suggestions near zero; note exact count.
- `block-nested-row` → **zero `flex-wrap` suggestions** despite nested row of 4 anchors. If this fails, the nested-row contract is broken — STOP and investigate.

### 4.6 — Lib helpers

**4.6.1 — `src/lib/container-query.ts`:**

```ts
export function buildAtContainer(bp: number, body: string): string {
  return `@container slot (max-width: ${bp}px) {\n${body}\n}`
}

export function parseContainerBp(atRule: string): number | null {
  // parses '@container slot (max-width: 640px)' → 640; returns null on mismatch
}
```

**4.6.2 — `src/lib/css-scoping.ts`:**

```ts
export function scopeBlockCss(css: string, slug: string): string {
  // prefix every top-level rule selector with `.block-{slug} `
  // use PostCSS for AST-safe scoping
  // leave @container / @media bodies alone — they contain nested rules that already inherit scope
}

export function wrapBlockHtml(html: string, slug: string): string {
  return `<div class="block-${slug}">${html}</div>`
}
```

**Unit-test coverage** for helpers is OK inside the compose test files that use them (`emit-tweak.test.ts` covers `buildAtContainer` indirectly; `render-preview.test.ts` covers `scopeBlockCss`). No separate test file for lib helpers.

### 4.7 — Unit tests for compose functions

Each of `apply-suggestions.test.ts`, `emit-tweak.test.ts`, `compose-variants.test.ts`, `render-preview.test.ts` uses **inline synthetic inputs** (per Q1 hybrid; fixtures reserved for snapshot.test.ts).

**Required cases per file:**

- `apply-suggestions.test.ts`:
  - Empty accepted → block unchanged (bit-identity via `===` on strings)
  - Single suggestion → `@container` chunk appended correctly
  - Multiple suggestions, different bps → multiple chunks in ascending bp order
  - `bp: 0` media-maxwidth suggestion → top-level rule, not wrapped in @container
  - Determinism: same (block, accepted) twice → deep-equal output

- `emit-tweak.test.ts`:
  - New tweak, no existing @container → appends chunk
  - Tweak into existing @container (same bp) → adds rule inside existing
  - Tweak updates existing declaration → value changes, rest preserved
  - `bp: 0` → top-level rule
  - Determinism smoke

- `compose-variants.test.ts`:
  - No variants → output matches input shape (no wrapper div, no variants field)
  - One variant with name='sm' → reveal rule maps to `(max-width: 480px)`
  - Unknown variant name → warning + skip reveal (test warning propagation)
  - Variant HTML/CSS scoped under `[data-variant="{name}"]` (assert via string contains)
  - `BlockVariants` output shape matches pkg-db type (TS compile is sufficient assertion)

- `render-preview.test.ts`:
  - Non-variant block → HTML wrapped in `.block-{slug}` div, CSS scoped (match portal shape — paste portal's file:line reference you found)
  - Block with variants → calls composeVariants; output has `data-variant` markers
  - `width: 800` option → outer `max-width: 800px` container wraps output
  - No width → no outer wrapper
  - Determinism smoke

**Expected new test count:** ~20 across the 4 compose test files + 3 snapshot tests = ~23 new tests. Total package tests: 43 (carry-over) + 23 + 3 snapshot = ~69 tests, 10 files (smoke + analyze + 7 heuristic/dispatcher + 4 compose + 1 snapshot).

### 4.8 — Exports + manifest

**`src/index.ts`** — add 4 exports below `generateSuggestions`:

```ts
export { applySuggestions } from './compose/apply-suggestions'
export { emitTweak } from './compose/emit-tweak'
export { composeVariants } from './compose/compose-variants'
export { renderForPreview } from './compose/render-preview'
```

**`src/__arch__/domain-manifest.ts`** — append 19 new `owned_files` entries:

```
packages/block-forge-core/src/compose/apply-suggestions.ts
packages/block-forge-core/src/compose/emit-tweak.ts
packages/block-forge-core/src/compose/compose-variants.ts
packages/block-forge-core/src/compose/render-preview.ts
packages/block-forge-core/src/lib/container-query.ts
packages/block-forge-core/src/lib/css-scoping.ts
packages/block-forge-core/src/__tests__/apply-suggestions.test.ts
packages/block-forge-core/src/__tests__/emit-tweak.test.ts
packages/block-forge-core/src/__tests__/compose-variants.test.ts
packages/block-forge-core/src/__tests__/render-preview.test.ts
packages/block-forge-core/src/__tests__/snapshot.test.ts
packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html
packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css
packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.html
packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.css
packages/block-forge-core/src/__tests__/fixtures/block-nested-row.html
packages/block-forge-core/src/__tests__/fixtures/block-nested-row.css
packages/block-forge-core/src/__tests__/fixtures/README.md
packages/block-forge-core/src/__tests__/README.md
```

**Note:** snapshot `.snap` file lives at `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap`. Git-track it (Vitest generates on `--update-snapshot`), but do NOT list it in `owned_files` — generated artifact, same precedent as `dist/` etc. If arch-test flags it as unowned-in-domain-path, flag in result log and we decide how to whitelist.

**Update known_gaps third entry** — replace the Phase-3 phrasing:

```
'note: Phase 4 shipped compose/ + 4 compose-path exports + 3 frozen fixtures + snapshot test. WP-025 code-complete — Phase 5 Close ships docs propagation only.',
```

Keep the `note:` prefix.

### 4.9 — Verify

```bash
npm run arch-test
```

Expected: **~436/0** (417 + 19 path-existence). Any extra (or missing) delta needs explanation — especially if snapshot `.snap` file triggers an unowned-in-domain error.

```bash
npm -w @cmsmasters/block-forge-core run test
```

Expected: 10 files, ~69 tests, all green. Snapshot test writes `.snap` file on first run; commit it.

```bash
npm run typecheck
```

Expected: clean monorepo.

**Determinism hard-check** — run snapshot test twice consecutively:

```bash
npm -w @cmsmasters/block-forge-core run test -- --run snapshot
npm -w @cmsmasters/block-forge-core run test -- --run snapshot
```

Second run: **zero obsolete snapshots, zero updates**. If any snapshot updates on the second identical run, there's nondeterminism in the pipeline — STOP and find it.

**Portal-renderBlock parity check:**

```bash
grep -rn "renderBlock\|renderBlockShell\|stripGlobalPageRules" apps/portal/
```

Record the file:line of portal's non-variant renderBlock output; paste the shape comparison in result log (side-by-side with `renderForPreview` output for a simple synthetic block).

### 4.10 — Log + commit

Write `logs/wp-025/phase-4-result.md` with:

- Fixture bootstrap — sha256 verification result (hashes match → ✅; any drift → STOP + flag)
- Each compose file — LoC + summary of implementation choices
- Portal `renderBlock` location + shape match summary
- Variant name→bp convention — locked values with justification
- Arch-test delta with per-type accounting (+19 expected)
- Test count per file + totals
- Snapshot observations — paste the 3 chronicled observations (spacing-font, plain-copy, nested-row)
- Nested-row snapshot evidence: `block-nested-row` pipeline output has ZERO `flex-wrap` suggestions (contract E2E-verified)
- Any type-shape tweaks in `types.ts` (expect zero; flag if not)
- Deviations with one-line justification
- Open questions for Brain — numbered Q1..Qn OR explicit "**None.**"

Stage:

```
packages/block-forge-core/src/compose/                              # 4 new files
packages/block-forge-core/src/lib/container-query.ts                # new
packages/block-forge-core/src/lib/css-scoping.ts                    # new
packages/block-forge-core/src/__tests__/apply-suggestions.test.ts   # new
packages/block-forge-core/src/__tests__/emit-tweak.test.ts          # new
packages/block-forge-core/src/__tests__/compose-variants.test.ts    # new
packages/block-forge-core/src/__tests__/render-preview.test.ts      # new
packages/block-forge-core/src/__tests__/snapshot.test.ts            # new
packages/block-forge-core/src/__tests__/__snapshots__/              # generated but committed
packages/block-forge-core/src/__tests__/README.md                   # new
packages/block-forge-core/src/__tests__/fixtures/                   # 6 files + README
packages/block-forge-core/src/index.ts                              # modified
src/__arch__/domain-manifest.ts                                     # modified
logs/wp-025/phase-4-task.md                                         # this file
logs/wp-025/phase-4-result.md                                       # your result log
```

Commit message:

```
feat(pkg-block-forge-core): compose path + fixtures + E2E snapshot [WP-025 phase 4]
```

Embed final SHA in result log post-commit.

---

## Hard gates — do not violate

- **Fixture hashes match Phase 0 byte-for-byte.** Any drift → STOP, do not proceed.
- **`applySuggestions(block, []).css === block.css`** — empty accepted = identity. ADR-025 "never auto-apply" enforcement.
- **Nested-row E2E contract:** snapshot for `block-nested-row` has ZERO `flex-wrap` suggestions. Hard-assert this in the snapshot test body (not just the `.snap` file) — a direct `expect(suggestions.filter(s => s.heuristic === 'flex-wrap').length).toBe(0)` before the snapshot comparison. This locks the contract independently of snapshot fragility.
- **Determinism:** pipeline idempotent on repeated identical inputs. Second snapshot-test run must write zero updates.
- **Portal `renderBlock()` shape parity for non-variant blocks** — verified by grep + manual compare, documented in result log.
- **Zero type changes in `src/lib/types.ts`.** If you need a field on `Variant` or `PreviewResult`, it was a miss in Phase 1 — flag and escalate.
- **No compose → analyze/rules import circles.** compose depends on lib + types + (for render-preview) compose-variants. rules and analyze do NOT import from compose.
- **No fixture `.snap` file is committed if snapshot content changes between two consecutive runs.** That's proof of nondeterminism — blocks the phase.

---

## Verification checklist — what phase-4-result.md MUST show

| # | Check | Evidence |
|---|---|---|
| 1 | 3 fixture sha256s match Phase 0 carry-over | `sha256sum` output pasted |
| 2 | 6 fixture `.html`/`.css` + 2 README files present | `ls` output |
| 3 | 4 compose sources + 2 lib helpers + 5 tests present | `ls` output |
| 4 | 4 exports added to `src/index.ts` | `cat` excerpt |
| 5 | 19 new owned_files in manifest | `grep -c "packages/block-forge-core/src/compose\|packages/block-forge-core/src/__tests__/fixtures\|packages/block-forge-core/src/__tests__/apply-suggestions\|…"` |
| 6 | known_gaps finalized for Phase 4 | `grep "Phase 4 shipped compose" src/__arch__/domain-manifest.ts` |
| 7 | Arch-test 417 → ~436/0 with explained delta | output tail |
| 8 | Package tests: 10 files, ~69 tests, all green | output tail |
| 9 | Typecheck clean monorepo | per-app exit 0 |
| 10 | Empty-accepted identity: `applySuggestions(block, []).css === block.css` | test case paste |
| 11 | Second consecutive snapshot run writes zero updates | `vitest --run snapshot` ran twice, diff empty |
| 12 | Nested-row E2E: zero `flex-wrap` suggestions hardcoded + snapshot-confirmed | test case paste |
| 13 | Portal `renderBlock()` parity | file:line + shape comparison |
| 14 | Variant name→bp convention locked | values table in result log |
| 15 | Types.ts unchanged | `git diff` empty |
| 16 | `.snap` file committed, not in owned_files | git status + manifest grep |

---

## What success looks like

Phase 5 (Close) opens to a code-complete package with 6 public functions, full test coverage across synthetic + real fixtures, snapshots chronicling real-world behavior, and a domain manifest that reflects exactly what's on disk. Phase 5's job becomes pure doc propagation — `.context/`, domain SKILL, `workplan/BLOCK-ARCHITECTURE-V2.md` cross-references, WP status flip — under the mandatory approval gate.

If Phase 5 discovers missing compose-path behavior (e.g., `emitTweak` can't handle a shape a consumer needs), this phase left something on the table. Expected outcome: Phase 5 reads the code, writes the docs, flips the WP status, nothing else.
