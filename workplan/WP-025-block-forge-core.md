# WP-025: Block Forge Core

> Framework-agnostic core engine for responsive block authoring: CSS analyzer, auto-rules generator, tweak emitter, variant composer, preview renderer. Pure functions, unit-tested. No UI, no DB, no side-effects.

**Status:** ✅ DONE
**Priority:** P0 — Critical path (consumed by WP-026 tools/block-forge and WP-027 Studio tab)
**Prerequisites:** WP-024 ✅ (Foundation — `blocks.variants` column, `BlockVariants` type, slot `container-type`, tokens.responsive.css scaffold)
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 10–14 hours across 6 phases
**Created:** 2026-04-22
**Completed:** 2026-04-23

---

## Problem Statement

ADR-025 defines a 4-layer model for making blocks responsive: auto-rules heuristics (Layer 1), visual tweaks (Layer 2), shared BP tokens (Layer 3), inlined variants (Layer 4). WP-024 delivered the data and runtime plumbing — `variants` column, renderer that inlines them, slot `container-type`, responsive tokens file. What's missing is the **engine** that turns a raw block (`{ html, css }`) into an adaptive one (`{ html, css, variants }`) — the pure logic that both surfaces (standalone `tools/block-forge/` Vite app in WP-026 and Studio «Responsive» tab in WP-027) will call.

Today we have a string-and-regex based `apps/studio/src/lib/block-processor.ts` that does token scanning — that's a precedent but not a fit. Responsive authoring requires **CSS-AST awareness**: we need to know that a `padding` lives on a specific selector inside a block's top-level rules (not nested in `@media` / `@container`), how many children sit in a flex row, which declarations look safe to rewrite via `clamp()`, and whether a proposed `@container` rule would conflict with an existing one. Regex is the wrong tool; a proper parser (PostCSS) is the right one.

Shipping the engine as its own package has two payoffs: (a) identical behaviour across both authoring surfaces — one place for heuristics, one place for fixture tests; (b) the engine is pure, fast, and deterministic, so it can also run in a pre-commit hook or CI lint in the future without dragging in UI code.

Why now: WP-026 and WP-027 both need this. Scope discipline here — this WP delivers the engine only, zero UI, zero persistence — keeps the blast radius tight.

---

## Solution Overview

### Architecture

```
                  Block input                          Block output
               { html, css, slug }                 { html, css, variants }
                       │                                     ▲
                       ▼                                     │
   ┌───────────────────────────────────────────────────────────────┐
   │                    @cmsmasters/block-forge-core                │
   │                                                                │
   │  READ PATH                                                     │
   │    parseBlockCSS(css)    ──── PostCSS AST ──┐                  │
   │    parseBlockHTML(html)  ──── DOM tree    ──┤                  │
   │                                             ▼                  │
   │                                    BlockAnalysis                │
   │                                    { rules[], elements[],       │
   │                                      warnings[] }               │
   │                                             │                  │
   │  RULE ENGINE                                ▼                  │
   │    generateSuggestions(analysis) ─── 6 heuristics ──┐           │
   │                                                     ▼          │
   │                                          Suggestion[]           │
   │                                          { id, heuristic,       │
   │                                            selector, bp,        │
   │                                            property, value,     │
   │                                            rationale,           │
   │                                            confidence }         │
   │                                                                │
   │  WRITE PATH                                                    │
   │    applySuggestions(block, accepted[]) ─── mutates CSS          │
   │    emitTweak({ selector, bp, property, value }, css) ─ patch    │
   │    composeVariants(base, variants[]) ─── inlines DOM +          │
   │                                            reveal @container    │
   │    renderForPreview(block, { width }) ─── deterministic         │
   │                                           HTML+CSS string       │
   │                                                                │
   └───────────────────────────────────────────────────────────────┘
          consumers                       ▲
          (future WPs)                    │
   ┌──────────────────────────────────────┴──────────────────────────┐
   │  WP-026 tools/block-forge/  (Vite app, file-based I/O)           │
   │  WP-027 Studio Responsive tab  (React tab, DB I/O)               │
   └──────────────────────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|---|---|---|---|
| Package location | `packages/block-forge-core/` | Published as `@cmsmasters/block-forge-core`, consumable by both `tools/` and `apps/studio` through workspace alias | `tools/block-forge-core/` — fine for `tools/block-forge/` consumer but breaks when Studio (an `apps/` consumer) tries to import it |
| CSS parser | PostCSS (exact version pinned in Phase 0) | Battle-tested AST, mature ecosystem, small core (~40KB gz), walk APIs ideal for read/write passes | Regex (precedent in block-processor.ts) — too brittle for nested at-rules; `css-tree` — heavier and less familiar API |
| HTML parser | `node-html-parser` | Zero-deps, fast, small (~15KB), covers the one heuristic that needs child counts | `cheerio` — heavy jQuery-like API; `parse5` — heavier; `DOMParser` — browser-only; native regex — unreliable |
| Export surface | Pure functions, no classes | Deterministic, easy to unit-test, tree-shakable | Class-based engine — harder to test slices; plugin architecture — YAGNI for six heuristics |
| Heuristic list | Exactly the six from ADR-025 | Scope contract — don't invent new rules in this WP | Expand to ten — creep; ship three — doesn't cover variant-worthy cases |
| Suggestion application | **Never auto-apply.** Engine emits suggestions; consumer decides accept/tweak/reject | Matches ADR-025's "always previewable, never silent" constraint | Auto-apply high-confidence — violates ADR; silent rewrite on save — identical risk |
| Preview renderer output | Deterministic HTML + CSS **string**, not DOM or React | Both surfaces (Vite file-based, Studio iframe) can consume a string; matches portal's `renderBlock()` family | Return React nodes — couples core to React; return virtual DOM — unnecessary abstraction |
| Confidence model | Three levels: `high` / `medium` / `low` | Lets UI (future WPs) surface "accept all high" vs. individual review | Single flag — loses useful signal; percentage score — false precision |
| Fixture strategy | **Hybrid: per-heuristic unit tests use inline synthetic CSS/HTML strings; fixtures folder reserved for end-to-end snapshot test only (3 frozen real blocks)** | Two different signals: (a) unit tests pin the trigger/non-trigger/skip contract for each heuristic via explicit synthetic inputs in `.test.ts`; (b) snapshot test chronicles behaviour against real-world content shapes and catches silent drift. Mixing them overfits unit tests to real content and hides the contract | Fixtures for every heuristic — overfits; synthetic only — misses real-world shapes; all real blocks — slow and noisy |

---

## Domain Impact

**New domain: `pkg-block-forge-core`** — first new domain added since WP-017. Mirrors the existing `pkg-validators` shape.

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **pkg-block-forge-core** (NEW) | Entire domain is created — manifest entry, skill stub, owned files, tests | Pure functions only; no I/O; no React; no Supabase; no `window`. `@cmsmasters/db` import limited to `BlockVariant`/`BlockVariants` types. PostCSS walks use `.clone()` when mutating — never in-place edits that survive unintended | PostCSS version mismatch with other apps (pin version explicitly). `node-html-parser` interpreting malformed HTML silently (add explicit warning path). Heuristics running on CSS that's already been wrapped in `@container` (must skip — can't recursively adapt an already-adaptive block) |
| **pkg-db** | Read-only dependency on `BlockVariant` / `BlockVariants` types from WP-024 Phase 1 | types.ts still hand-maintained; still no `supabase gen types` runs | — |
| **infra-tooling** (manifest) | `domain-manifest.ts` gains new domain entry; `arch-test.ts` may need a fixture update if domain count is asserted anywhere | Path existence, parity, ownership, skill parity all enforced by arch-test | Arch-test fails on missing SKILL.md for new domain — Phase 1 creates the stub alongside the manifest entry |

**Public API boundaries:**
- `packages/block-forge-core/src/index.ts` — sole entrypoint. Exports: `analyzeBlock`, `generateSuggestions`, `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`, plus all public types (`BlockAnalysis`, `Suggestion`, `Heuristic`, `Confidence`, …).
- No deep imports allowed from consumers — enforced by arch-test ownership + future WPs consuming via `@cmsmasters/block-forge-core`.
- `allowed_imports_from`: `['pkg-db']` only. The core must stay lean.

**Cross-domain risks:**
- **Introducing PostCSS as a repo-wide dep.** Currently only `apps/admin/postcss.config.cjs` uses a PostCSS *ecosystem* tool (autoprefixer-style), not the library directly. This WP pins the core PostCSS library as a dep of `packages/block-forge-core/`. Other apps' PostCSS configs are untouched.
- **Fixture drift.** Snapshot tests use real blocks copied from `content/db/blocks/`. If those files are regenerated (via `/content-pull` skill), fixtures may drift silently. Mitigation: copy fixtures into `packages/block-forge-core/src/__tests__/fixtures/` and treat them as frozen artefacts; never `/content-pull` into the fixtures folder.

---

## What This Changes

### New Files

```
packages/block-forge-core/
  package.json                              # @cmsmasters/block-forge-core, private, main=src/index.ts
  README.md                                 # one-pager: what it is, how to import, scope contract

  src/
    index.ts                                # public API only — re-exports

    analyze/
      parse-css.ts                          # PostCSS parse + walk helpers
      parse-html.ts                         # node-html-parser wrapper + element tree
      analyze-block.ts                      # top-level analyzeBlock() → BlockAnalysis

    rules/
      index.ts                              # generateSuggestions() dispatcher
      heuristic-grid-cols.ts                # repeat(N) → collapse at 768/480
      heuristic-spacing-clamp.ts            # padding/gap ≥ 40px → clamp()
      heuristic-font-clamp.ts               # font-size ≥ 24px → clamp()
      heuristic-flex-wrap.ts                # row flex with 3+ children → wrap @ 640px
      heuristic-horizontal-overflow.ts      # horizontal-only content → overflow-x at 480px
      heuristic-media-maxwidth.ts           # img/video without cap → max-width: 100%

    compose/
      apply-suggestions.ts                  # accepts Suggestion[], mutates CSS
      emit-tweak.ts                         # single-property per-BP tweak → @container chunk
      compose-variants.ts                   # variants object → inlined DOM + reveal CSS
      render-preview.ts                     # block + width → deterministic HTML+CSS string

    lib/
      container-query.ts                    # pure helpers: buildAtContainer(bp, body)
      css-scoping.ts                        # scope CSS under .block-{slug} (shared with portal)
      types.ts                              # all public types (BlockAnalysis, Suggestion, …)

    __tests__/
      README.md                             # explains split: inline-synthetic for unit tests,
                                            # real-frozen for snapshot; no /content-pull here
      fixtures/
        README.md                           # 3 frozen artefacts; sha256 per file;
                                            # origin slug + snapshot date; DO NOT overwrite
        block-spacing-font.{html,css}       # slug=fast-loading-speed — triggers
                                            #   spacing-clamp (padding 64 40) + font-clamp (60px)
        block-plain-copy.{html,css}         # slug=sidebar-perfect-for — negative-case baseline
        block-nested-row.{html,css}         # slug=header — nested flex-row 4 anchors, documents
                                            #   "nested flex-row is NOT a trigger" contract
      analyze-block.test.ts                 # inline synthetic CSS/HTML inputs
      heuristic-grid-cols.test.ts           # inline synthetic — trigger, non-trigger, adaptive-skip
      heuristic-spacing-clamp.test.ts       # inline synthetic
      heuristic-font-clamp.test.ts          # inline synthetic
      heuristic-flex-wrap.test.ts           # inline synthetic — includes nested-row skip case
      heuristic-horizontal-overflow.test.ts # inline synthetic
      heuristic-media-maxwidth.test.ts      # inline synthetic
      apply-suggestions.test.ts             # inline synthetic
      emit-tweak.test.ts                    # inline synthetic
      compose-variants.test.ts              # inline synthetic
      render-preview.test.ts                # inline synthetic
      snapshot.test.ts                      # end-to-end: 3 real fixtures → analyze → suggest
                                            #   → apply → compose → render, committed snapshots

.claude/skills/domains/pkg-block-forge-core/
  SKILL.md                                  # Start Here / Invariants / Traps / Blast Radius

logs/wp-025/
  phase-0-result.md … phase-5-result.md
```

### Modified Files

```
src/__arch__/domain-manifest.ts               -- ADD pkg-block-forge-core domain entry
                                                 ADD tests for domain count if asserted
package.json (root)                           -- workspaces include packages/block-forge-core
                                                 (if not already covered by a glob)
```

Note: no other files in `apps/` or `packages/` change. WP-026 and WP-027 consume this package; this WP ships the package and its tests and nothing else.

### Manifest Updates

```ts
// src/__arch__/domain-manifest.ts — NEW entry:
'pkg-block-forge-core': {
  name: 'Block Forge Core Engine',
  slug: 'pkg-block-forge-core',
  description: 'Framework-agnostic responsive block authoring — CSS analyzer, auto-rules, tweak emitter, variant composer, preview renderer. Pure functions.',
  owned_files: [
    'packages/block-forge-core/package.json',
    'packages/block-forge-core/README.md',
    'packages/block-forge-core/src/index.ts',
    'packages/block-forge-core/src/analyze/parse-css.ts',
    'packages/block-forge-core/src/analyze/parse-html.ts',
    'packages/block-forge-core/src/analyze/analyze-block.ts',
    'packages/block-forge-core/src/rules/index.ts',
    'packages/block-forge-core/src/rules/heuristic-grid-cols.ts',
    'packages/block-forge-core/src/rules/heuristic-spacing-clamp.ts',
    'packages/block-forge-core/src/rules/heuristic-font-clamp.ts',
    'packages/block-forge-core/src/rules/heuristic-flex-wrap.ts',
    'packages/block-forge-core/src/rules/heuristic-horizontal-overflow.ts',
    'packages/block-forge-core/src/rules/heuristic-media-maxwidth.ts',
    'packages/block-forge-core/src/compose/apply-suggestions.ts',
    'packages/block-forge-core/src/compose/emit-tweak.ts',
    'packages/block-forge-core/src/compose/compose-variants.ts',
    'packages/block-forge-core/src/compose/render-preview.ts',
    'packages/block-forge-core/src/lib/container-query.ts',
    'packages/block-forge-core/src/lib/css-scoping.ts',
    'packages/block-forge-core/src/lib/types.ts',
  ],
  owned_tables: [],
  public_entrypoints: ['packages/block-forge-core/src/index.ts'],
  allowed_imports_from: ['pkg-db'],
  known_gaps: [
    'important: heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025',
    'note: fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder',
  ],
},
```

### Database Changes

None. This WP is pure library code.

---

## Implementation Phases

### Phase 0: RECON (~1h)

**Goal:** Confirm preconditions, read relevant skills, pin dependency versions, verify pre-finalized fixtures.

**Tasks:**
0.1. Read domain skills: `pkg-db` (for `BlockVariants` type location), `pkg-validators` (mirror pattern), `studio-blocks` (how existing `block-processor.ts` is structured — useful reference, not code to reuse).
0.2. Verify WP-024 `BlockVariant` / `BlockVariants` exports are live in `packages/db/src/index.ts`.
0.3. **Audit + pin PostCSS version.** `grep -r "from 'postcss'\|\"postcss\":" packages/ apps/ tools/` — confirm library isn't installed yet (autoprefixer/postcss-config in apps/admin is a different tool and doesn't conflict). Then `npm view postcss version` to discover the current latest stable. **Record the exact `X.Y.Z` in the phase-0 log** as the version Phase 1 will pin in `package.json` (use exact `"postcss": "X.Y.Z"` — no caret, no tilde). Same treatment for `node-html-parser`: `npm view node-html-parser version`, record exact, pin exact. Rationale: library code across 3 future consumers (tools/block-forge, Studio tab, potential pre-commit hook) needs reproducible parser behaviour; caret ranges let patch releases silently change AST output.
0.4. **Fixtures — finalized by Brain (Q1 resolution).** The three real blocks to copy into `__tests__/fixtures/` are fixed; no discovery needed:

| Fixture name | Source slug | Source file | sha256 | Purpose |
|---|---|---|---|---|
| `block-spacing-font` | `fast-loading-speed` | `content/db/blocks/fast-loading-speed.json` | `91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a` | Triggers spacing-clamp (`padding: 64px 40px`) + font-clamp (`60px`) |
| `block-plain-copy` | `sidebar-perfect-for` | `content/db/blocks/sidebar-perfect-for.json` | `263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452` | Negative-case baseline — near-zero triggers |
| `block-nested-row` | `header` | `content/db/blocks/header.json` | `36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91` | Nested flex-row 4 anchors — documents "nested flex-row is NOT a trigger" contract for `heuristic-flex-wrap` |

Phase 0 task here: **confirm the three files exist at the above paths and recompute sha256** (`sha256sum content/db/blocks/{fast-loading-speed,sidebar-perfect-for,header}.json`). If any hash mismatches, STOP — content has drifted since Brain's decision; flag for re-discussion before Phase 1 or 2. If all match, record "hashes verified" in the log. Phase 2 copies the `.html` and `.css` out of each JSON into `__tests__/fixtures/` and re-asserts the hash at copy time.

Rationale (from Q1 resolution): fixtures folder is reserved for `snapshot.test.ts` only. Per-heuristic unit tests use inline synthetic CSS/HTML — they pin the trigger/non-trigger/skip contract explicitly. Grid heuristic and root-flex-row heuristic currently do not trigger on any real block in `content/db/blocks/` — that is information the snapshot test chronicles, not a coverage gap to paper over with synthetic fixtures.
0.5. **Arch-test baseline + domain-count hardcode audit.** First: `npm run arch-test` (expected green after WP-024 Phase 5 → 384/0; record exact count). Second: `grep -rnE "(domains\)?\.toHaveLength|Object\.keys\(.*domains.*\)\.length|DOMAIN_COUNT|expect.*\b11\b" src/__arch__/` — if any assertion hardcodes `11` (the current domain count), list the file:line in the log. Phase 1 must bump these to `12` when it registers `pkg-block-forge-core`, in the same commit as the manifest edit. If zero hardcodes found, record "none — parity/ownership assertions are count-agnostic".
0.6. **Workspace pickup — root + vitest.** (a) Confirm `package.json` workspaces glob covers `packages/*` (or add explicit entry if it's an enumerated list, not a glob). (b) Confirm Vitest will pick up the new package: `ls vitest.workspace.ts vitest.config.ts 2>&1` at repo root; if workspace config exists, open it and check whether `packages/*` is in the project list or if `packages/block-forge-core/` must be added explicitly. Record the concrete Phase 1 action needed ("glob covers it, nothing to add" OR "explicit entry required in `vitest.workspace.ts` line N").

**Verification:** `logs/wp-025/phase-0-result.md` with findings. No code written. The log must contain four concrete carry-overs for Phase 1: (a) pinned versions for `postcss` and `node-html-parser`, (b) list of arch-test files needing `11 → 12` bump (or "none"), (c) whether vitest needs an explicit entry, (d) fixture slugs + hashes.

---

### Phase 1: Package scaffold + public types (~2h)

**Goal:** Package exists, is on the workspace graph, arch-test stays green, public API types are defined, test harness runs (zero tests yet but the runner works).

**Tasks:**
1.1. Create `packages/block-forge-core/` with `package.json` mirroring `packages/validators/package.json` (private, main=src/index.ts, vitest script). Deps: `@cmsmasters/db: "*"`, `postcss: "X.Y.Z"`, `node-html-parser: "X.Y.Z"` — **exact versions from Phase 0 log carry-over (a); no caret, no tilde**. Dev deps: `vitest` workspace-level is fine; add only if needed. If Phase 0 carry-over (c) flagged vitest needs an explicit entry, add it here in the same step.
1.2. Create `src/index.ts` with `export *` for everything that will ship — for now export only types from `lib/types.ts`.
1.3. Create `src/lib/types.ts` with all public type shapes: `BlockInput`, `BlockOutput`, `BlockAnalysis`, `Rule`, `Element`, `Suggestion`, `Heuristic`, `Confidence`, `Tweak`, `Variant`, `PreviewResult`.
1.4. Stub `src/__tests__/` with one trivial test asserting `import { Suggestion } from '../index'` type-resolves (smoke).
1.5. Add new domain entry to `src/__arch__/domain-manifest.ts`. Create `.claude/skills/domains/pkg-block-forge-core/SKILL.md` stub (required by arch-test `skill parity` check). If Phase 0 carry-over (b) listed any hardcoded-11 assertions in `src/__arch__/`, bump them to 12 **in the same commit** as the manifest edit.
1.6. `npm install` to wire up the new package; `npm run arch-test` must stay green.

**Verification:**
```bash
npm run arch-test               # still 384/0
npm -w @cmsmasters/block-forge-core run test   # smoke passes
npm run typecheck               # clean
```

---

### Phase 2: Read path — analyzers (~2–3h)

**Goal:** `analyzeBlock({ html, css })` returns a typed `BlockAnalysis`: a flat list of rules (selector + declarations + at-rule chain) plus an element tree (tag + attrs + children count) plus any parse warnings. Pure function. No suggestions yet.

**Tasks:**
2.1. `parse-css.ts` — PostCSS wrapper that parses CSS and walks to a flat `Rule[]` structure with at-rule context preserved (so heuristics can skip rules already inside `@container` / `@media`).
2.2. `parse-html.ts` — node-html-parser wrapper that returns a shallow `Element[]` with tag, class list, child count, and parent pointer.
2.3. `analyze-block.ts` — top-level glue that returns `BlockAnalysis`.
2.4. Unit tests for edge cases using **inline synthetic inputs** in `analyze-block.test.ts`: empty CSS, malformed CSS (must return warning, not throw), nested at-rules, CSS with `.block-{slug}` prefix intact, block with no styles, HTML with comments / scripts. No fixture files referenced in this phase.

**Verification:**
```bash
npm -w @cmsmasters/block-forge-core run test
# all analyzer tests green; typecheck clean; arch-test 384/0
```

---

### Phase 3: Heuristic engine — six rules (~3–4h)

**Goal:** `generateSuggestions(analysis)` returns an ordered `Suggestion[]` covering all six ADR-025 heuristics. Each heuristic is a pure function from `BlockAnalysis` to `Suggestion[]` and has its own unit test file.

**Tasks:**
3.1. Implement `heuristic-grid-cols`, `heuristic-spacing-clamp`, `heuristic-font-clamp`, `heuristic-flex-wrap`, `heuristic-horizontal-overflow`, `heuristic-media-maxwidth` — each a pure function in its own file.
3.2. `rules/index.ts` dispatcher calls each heuristic, concatenates results, assigns deterministic IDs, returns ordered.
3.3. Each heuristic has unit tests for: (a) triggering case produces correct `Suggestion`, (b) non-triggering case produces `[]`, (c) already-adaptive input (rule inside `@container`) is skipped, (d) confidence level is correct. **All inputs are inline synthetic CSS/HTML strings inside the `.test.ts` file — no fixture files per heuristic.** Each test case is short (one to three declarations) and makes the contract read like a table.
3.4. Skip / guard: heuristics MUST NOT suggest rewriting declarations inside existing `@container` or `@media` wrappers — the author already addressed it. For `heuristic-flex-wrap` specifically, add an explicit unit test that a **nested** `flex-direction: row` (e.g. a row inside a column parent) does **not** trigger the suggestion — this is the contract documented by the `block-nested-row` snapshot fixture.

**Verification:**
```bash
npm -w @cmsmasters/block-forge-core run test
# all six heuristic tests green; one dispatcher test; ~30 assertions total; arch-test 384/0
```

---

### Phase 4: Write path — applicator, tweak emitter, variant composer, preview (~2–3h)

**Goal:** Consumers can take a block, accept some suggestions, compose variants, and render a preview string. All functions pure.

**Tasks:**
4.1. `apply-suggestions.ts` — given `{ html, css }` and `accepted: Suggestion[]`, return mutated `{ html, css }`. MUST produce identical output for identical inputs (no timestamps, no randomness). Preserves original declaration order for unchanged rules.
4.2. `emit-tweak.ts` — given `{ selector, bp, property, value }`, patch CSS: either adds a new `@container slot (max-width: {bp}) { selector { property: value } }` rule or updates the matching declaration inside an existing `@container`. Deterministic ordering.
4.3. `compose-variants.ts` — given a base block and an array of `{ name, html, css }`, return `{ html, css, variants }` where the base HTML is wrapped in `<div data-variant="base">…</div>` followed by each variant wrapper, and the top-level CSS appends the reveal rules (`@container slot (…) { [data-variant] selectors }`).
4.4. `render-preview.ts` — given a block and a target width, returns `{ html, css }` ready for injection into an iframe/preview container. Must match portal's `renderBlock()` output shape for non-variant blocks (verify against WP-024 Phase 3 renderer).
4.5. Snapshot tests in `__tests__/snapshot.test.ts` — **the only file that consumes the 3 frozen fixtures from Phase 0 carry-over (d)**. Pipeline: fixture → analyze → suggest → apply → compose → render, asserted against committed snapshots. Expected observations chronicled in the snapshot (not defects to "fix"): `block-plain-copy` produces near-empty suggestions; `block-nested-row` produces suggestions from other heuristics but NOT from `heuristic-flex-wrap` (contract pinned); `block-spacing-font` produces clamp rewrites for padding and font-size. Grid heuristic NOT exercised by any current fixture — documented in the snapshot header comment.

**Verification:**
```bash
npm -w @cmsmasters/block-forge-core run test
# write path tests + snapshots green; arch-test 384/0; typecheck clean
```

---

### Phase 5: Close (~0.5–1h)

**Goal:** Docs reflect the new domain and its contracts; WP marked done.

**Tasks:**
5.1. CC reads all phase logs; digests discoveries / drift.
5.2. Propose doc updates:
   - `.context/BRIEF.md` — note WP-025 done; new `@cmsmasters/block-forge-core` package; consumed by WP-026/WP-027
   - `.context/CONVENTIONS.md` — new subsection "Block Forge Core — when to call": consumers use this package; do not duplicate CSS parsing logic elsewhere
   - `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — fill in Invariants / Traps / Blast Radius / Recipes based on actual implementation
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — cross-reference ADR-025 + WP-024 + WP-025
   - `src/__arch__/domain-manifest.ts` — confirm `known_gaps` matches what actually shipped
5.3. Brain approves (approval gate — ≥3 doc files touched, so explicit gate per the saved pattern).
5.4. CC executes doc updates.
5.5. Verify green:
   ```bash
   npm run arch-test
   npm run typecheck
   npm -w @cmsmasters/block-forge-core run test
   ```
5.6. Flip WP status to `✅ DONE`, set Completed date.

**Files to update:**
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `src/__arch__/domain-manifest.ts`
- `logs/wp-025/phase-*-result.md`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PostCSS / node-html-parser drift between installs | AST output changes silently → snapshot churn, false test flips | Phase 0 carry-over (a): exact version pin (no caret, no tilde) in Phase 1 `package.json`. `npm audit` in Phase 1; re-audit in Close. Bumping either parser is a deliberate, logged action — not automatic |
| Vitest doesn't pick up new package automatically | Tests appear to pass in isolation but aren't in workspace CI run | Phase 0 carry-over (c) explicitly checks `vitest.workspace.ts` / `vitest.config.ts`; Phase 1.1 adds explicit entry if needed. Phase 1 verification runs the workspace-wide `vitest` (not just `-w @cmsmasters/block-forge-core`) to confirm pickup |
| Arch-test domain-count hardcode not audited | Phase 1 commits a 12-domain manifest but a test asserts `length === 11` → red CI | Phase 0 carry-over (b): grep for `toHaveLength`, `.length`, `DOMAIN_COUNT`, literal `11` in `src/__arch__/`. Phase 1 bumps them atomically with the manifest edit |
| node-html-parser misparses real blocks | False negatives/positives in flex-wrap heuristic | Run parser against all 3 fixtures + 5 additional real blocks from DB in Phase 2 verification. If misparses, fall back to skipping flex-wrap heuristic in that block (emit warning) |
| Heuristic false-positives — rewriting declarations that shouldn't be clamped | Author rejects many suggestions; trust erodes | Confidence levels; per-heuristic fixture covering "should trigger" AND "should skip"; document in SKILL.md the bias: "under-suggest rather than over-suggest" |
| Snapshot tests overfit on formatting | Every unrelated CSS format tweak breaks them | Normalize whitespace + declaration order before snapshotting; document normalization in `__tests__/README.md` |
| Already-adaptive block treated as non-adaptive | Core double-wraps in `@container`, causes rule explosion | Phase 3.4 — all heuristics must check at-rule chain and skip declarations already inside `@container` / `@media`. Explicit test |
| Consumer reaches into `src/analyze/` bypassing public API | Future refactor risk; boundary erosion | Arch-test ownership rules flag deep imports; public API documented in `index.ts` comment block |
| Introducing a new domain changes arch-test expected counts elsewhere | arch-test suddenly fails with "expected 11 domains" | Phase 1 discovers and updates any hardcoded count in test files as part of manifest edit; arch-test parity suite will flag it |
| `@cmsmasters/block-forge-core` pulled into browser bundle (Studio) inflates build | Bundle size regression in Studio after WP-027 | Core is pure JS, tree-shakable; confirm in WP-027. This WP ensures package has NO `"sideEffects": true` and no top-level `console.log` |
| Fixture blocks change shape under `/content-pull` | Tests break on unrelated content edits | Fixtures live under `src/__tests__/fixtures/` — frozen artefacts, never overwritten by content-pull. Phase 0 records origin block slug + copied-at date |
| PostCSS version collides with a later WP's Tailwind v4 PostCSS pipeline | Root dep graph fight | Core lists its own `postcss` as a direct dep; other apps' PostCSS configs use their own pinned versions. Confirm in Phase 1 with `npm ls postcss` |
| Domain boundary violation | arch-test fails | `allowed_imports_from: ['pkg-db']` strictly; no deep imports from apps or other packages |

---

## Acceptance Criteria (Definition of Done)

- [ ] `packages/block-forge-core/` exists with `package.json`, `README.md`, `src/index.ts`, full directory structure per "New Files"
- [ ] `@cmsmasters/block-forge-core` resolves via workspace; `node_modules/.pnpm` or equivalent shows the symlink
- [ ] Public API surface exported from `src/index.ts`: `analyzeBlock`, `generateSuggestions`, `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`, plus all public types
- [ ] Six heuristics implemented, each a pure function with its own unit test file using **inline synthetic inputs only**
- [ ] Each heuristic's triggering + non-triggering cases covered; already-adaptive-block skip covered
- [ ] `heuristic-flex-wrap.test.ts` has an explicit "nested row does NOT trigger" case (contract with `block-nested-row` snapshot fixture)
- [ ] `analyzeBlock` handles empty CSS, malformed CSS (warning not throw), nested at-rules
- [ ] `applySuggestions` is deterministic — identical input produces identical output (snapshot-verified)
- [ ] `emitTweak` produces well-formed `@container slot (max-width: …)` chunks under `.block-{slug}` scope
- [ ] `composeVariants` produces inlined DOM + reveal CSS matching ADR-025 shape
- [ ] `renderForPreview` for non-variant blocks matches portal `renderBlock()` output shape (cross-checked against WP-024 Phase 3 renderer)
- [ ] Snapshot test `__tests__/snapshot.test.ts` exercises the full pipeline against the 3 frozen fixtures (`block-spacing-font`, `block-plain-copy`, `block-nested-row`); header comment documents which heuristics are NOT exercised by current content
- [ ] `__tests__/README.md` and `__tests__/fixtures/README.md` exist and document the inline-synthetic-vs-frozen-fixture split + sha256 + content-pull ban
- [ ] All unit + snapshot tests green (`npm -w @cmsmasters/block-forge-core run test`)
- [ ] `npm run arch-test` passes — 384/0 baseline (or whatever baseline was green at WP-024 close), no new regressions
- [ ] New domain `pkg-block-forge-core` registered in `src/__arch__/domain-manifest.ts` with correct `owned_files`, `public_entrypoints`, `allowed_imports_from`, `known_gaps`
- [ ] `.claude/skills/domains/pkg-block-forge-core/SKILL.md` populated (not stub) with Start Here, Invariants, Traps, Blast Radius, Recipes
- [ ] `npm run typecheck` passes across monorepo
- [ ] `allowed_imports_from: ['pkg-db']` enforced — `grep -r "from '@cmsmasters/" packages/block-forge-core/src/` shows only `@cmsmasters/db` imports (types only)
- [ ] `@cmsmasters/block-forge-core` does NOT import anything from `apps/**` or `tools/**`
- [ ] Zero UI code in the package (no JSX, no React imports)
- [ ] Zero side effects at import time (no top-level `console.log`, no file reads, no network)
- [ ] All six phases logged in `logs/wp-025/phase-*-result.md`
- [ ] `.context/BRIEF.md`, `.context/CONVENTIONS.md`, `workplan/BLOCK-ARCHITECTURE-V2.md` updated
- [ ] Phase 5 went through explicit Brain-approval gate before doc execution (per saved Close-phase pattern)
- [ ] No known blockers for WP-026 (tools/block-forge Vite app) or WP-027 (Studio Responsive tab)

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| WP-024 ✅ (Foundation) — `BlockVariants` type, renderer contract | Done | WP-025 Phases 1+ need `BlockVariants` import |
| ADR-025 active | ✅ | Heuristic set (Phase 3) is fixed by the ADR |
| Vitest workspace setup (root config picks up new package) | to verify in Phase 0 | Package resolution + test discovery |
| Root `package.json` workspaces glob covers `packages/*` | to verify in Phase 0 | Package resolution |

This WP blocks:
- **WP-026** — `tools/block-forge/` Vite app (consumes core via file I/O wrapper)
- **WP-027** — Studio «Responsive» tab (consumes core via DB I/O wrapper)
- **WP-028** — Tweaks + Variants UI (extends both surfaces, consumes core's tweak emitter + variant composer)
- **WP-029** — Auto-rules polish + responsive tokens population (refines core heuristics; needs this baseline)

---

## Notes

- **Scope discipline, strict.** This WP ships library code only. No UI, no DB writes, no portal changes, no fixtures of existing blocks touched. If a phase is considering touching anything outside `packages/block-forge-core/` (except the manifest and a new skill file), stop and re-scope.
- **"Never auto-apply"** is an inherited contract from ADR-025. The engine returns suggestions; it does not mutate CSS silently. Test explicitly: `applySuggestions(block, [])` must return `block` unchanged.
- **Heuristic count is exactly six** — no more in this WP. If Phase 3 discovers an obvious seventh rule, log it for WP-029 and move on.
- **Deterministic output is a hard gate.** Snapshot tests depend on it. No `Date.now()`, no `Math.random()`, no iteration over `Map`/`Set` without sort.
- **Fixtures are frozen.** Do not run `/content-pull` against `packages/block-forge-core/src/__tests__/fixtures/`. Add a note in `__tests__/README.md` and in the fixture folder itself.
- **Close phase MUST use the approval gate** — ≥3 doc files are touched (BRIEF, CONVENTIONS, SKILL, manifest, architecture doc). Per saved pattern, explicit Brain approval between "propose" and "execute".
- **ADR-025 is the tie-breaker.** If any implementation question can't be resolved from this WP, read the ADR first.
- **Layered follow-ups.** WP-029 will populate `tokens.responsive.css` with more values and tune heuristic thresholds against real adoption data. Don't pre-optimize here.
