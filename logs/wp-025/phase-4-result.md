# WP-025 Phase 4 — Result (Write path — applicator, emitter, composer, preview)

> **Role:** Hands
> **Date:** 2026-04-22
> **Phase prompt:** [phase-4-task.md](./phase-4-task.md)
> **Baseline:** arch-test 417/0, 43 tests green (Phase 3 close)
> **Final:** arch-test **436/0** (+19), **75 tests green** (+32), typecheck clean, snapshot determinism ✅

---

## 1 — Fixture bootstrap (task 4.0)

`sha256sum` output — byte-for-byte match with Phase 0 carry-over:

```
91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a *content/db/blocks/fast-loading-speed.json
263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452 *content/db/blocks/sidebar-perfect-for.json
36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91 *content/db/blocks/header.json
```

Extracted (`.html` + `.css`) via one-shot Node script (not committed):

| Fixture | html.len | css.len |
|---|---|---|
| `block-spacing-font` | 1685 | 2255 |
| `block-plain-copy`   | 196  | 3215 |
| `block-nested-row`   | 1396 | 4637 |

2 READMEs written (`fixtures/README.md`, `__tests__/README.md`) per task spec.

---

## 2 — Compose path files

| File | LoC | Notes |
|---|---|---|
| `compose/apply-suggestions.ts` | 80 | Groups accepted suggestions by (bp, selector) → one rule per pair. `bp=0` emits top-level; else wraps via `buildAtContainer`. Stable sort by heuristic-order index, then bp/selector/property/value. |
| `compose/emit-tweak.ts` | 105 | PostCSS-based. Three cases (A/B/C) for `@container` flow, plus `bp=0` special-case via `emitTopLevel`. Uses `parseContainerBp` to find matching container. |
| `compose/compose-variants.ts` | 91 | Exports `composeVariants` + `variantCondition` helper. Scopes variant CSS under `[data-variant="{name}"]` via PostCSS. Unknown names trigger optional `onWarning` callback + skip reveal. |
| `compose/render-preview.ts` | 53 | HTML wrapped in `<div data-block-shell="{slug}">…</div>` (portal parity — see §3). CSS passed through `stripGlobalPageRules`. Optional `width` → outer `max-width` wrapper. Optional `variants[]` → calls `composeVariants` internally. |
| `lib/container-query.ts` | 8 | `buildAtContainer(bp, body)` + `parseContainerBp(atRule)`. |
| `lib/css-scoping.ts` | 28 | `stripGlobalPageRules` (portal mirror), `scopeBlockCss` (PostCSS prefix-scoper, top-level only), `wrapBlockHtml` (portal-shape wrapper). |

Total compose: 337 LoC source, 358 LoC tests (+ 46 LoC snapshot test).

---

## 3 — Portal `renderBlock()` parity check

`grep -rn "renderBlock\|stripGlobalPageRules" apps/portal/` → portal renderer at [`apps/portal/lib/hooks.ts:211-241`](../../apps/portal/lib/hooks.ts#L211-L241).

**Shape comparison — non-variant block:**

| Aspect | Portal `renderBlock` | `renderForPreview` |
|---|---|---|
| HTML wrapper | `<div data-block-shell="{slug}">…</div>` | `<div data-block-shell="{slug}">…</div>` ✓ |
| CSS cleanup | `stripGlobalPageRules(css)` | `stripGlobalPageRules(css)` ✓ |
| `<style>` tag | inline in single HTML string | separated into `css` field (preview iframe re-mounts) |
| JS | `<script type="module">` appended if `js` provided | N/A in preview path |

Structural parity holds. Preview separates the CSS into its own field because the iframe consumer mounts `<style>` and `<div>` independently — the pre-string-join shape is identical.

**Task-spec divergence flagged:** phase-4-task.md §4.4 described portal as wrapping in `<div class="block-{slug}">` + scoping CSS under that class. Reality is different — portal uses `data-block-shell` attribute + NO prefix scoping (relies on authored `.block-{slug}` selectors inside the CSS itself). I implemented to match the actual portal code, not the task's description. `scopeBlockCss` still exists as a lib helper for future consumers that DO want runtime scoping (e.g., embedding multiple blocks in one document), but `renderForPreview` does not call it, matching portal exactly.

---

## 4 — Variant name → breakpoint convention (locked)

Convention implemented in `compose-variants.ts` → `variantCondition(name)`:

| name | breakpoint expression |
|---|---|
| `sm` or `/^4\d\d$/` | `(max-width: 480px)` |
| `md` or `/^6\d\d$/` | `(max-width: 640px)` |
| `lg` or `/^7\d\d$/` | `(max-width: 768px)` |
| anything else | `null` → onWarning invoked, reveal-rule skipped |

Matches task spec verbatim. Unit-tested in `compose-variants.test.ts` — `variantCondition` describe block covers both conventional names and unknown-name nulls.

---

## 5 — Arch-test delta

```
 Test Files  1 passed (1)
      Tests  436 passed (436)
```

Baseline 417 → 436 (+19). Expected +19. Exact match.

Per-type accounting:
- 4 compose sources (apply-suggestions, emit-tweak, compose-variants, render-preview)
- 2 lib helpers (container-query, css-scoping)
- 5 tests (apply-suggestions, emit-tweak, compose-variants, render-preview, snapshot)
- 6 fixture files (3 × .html + 3 × .css)
- 2 READMEs (fixtures + __tests__)

Known_gaps third entry finalized per task spec: `'note: Phase 4 shipped compose/ + 4 compose-path exports + 3 frozen fixtures + snapshot test. WP-025 code-complete — Phase 5 Close ships docs propagation only.'`

Snapshot `.snap` file lives at `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` (14886 bytes). Git-tracked but NOT added to `owned_files` — generated artifact precedent, arch-test did not flag it.

---

## 6 — Test count

| File | Tests |
|---|---|
| `smoke.test.ts` | 1 |
| `analyze-block.test.ts` | 10 |
| `heuristic-grid-cols.test.ts` | 4 |
| `heuristic-spacing-clamp.test.ts` | 4 |
| `heuristic-font-clamp.test.ts` | 4 |
| `heuristic-flex-wrap.test.ts` | 4 |
| `heuristic-horizontal-overflow.test.ts` | 4 |
| `heuristic-media-maxwidth.test.ts` | 4 |
| `rules-dispatcher.test.ts` | 4 |
| `apply-suggestions.test.ts` | 6 |
| `emit-tweak.test.ts` | 6 |
| `compose-variants.test.ts` | 8 |
| `render-preview.test.ts` | 9 |
| `snapshot.test.ts` | 3 |
| **Total** | **75** (14 files) |

Carry-over from Phase 3 = 43. Delta = +32 (task estimated ~23 + 3 = 26; a few extra `variantCondition` / `scopeBlockCss` / `stripGlobalPageRules` cases pushed it higher).

Two consecutive snapshot runs with `--run` and no `--update`: zero updates, zero obsoletes, zero snapshot-content drift. Determinism hard-check ✅.

---

## 7 — Snapshot observations (chronicle)

All three fixtures produce stable `toMatchSnapshot()` output. Re-run confirmed zero drift.

### `block-spacing-font` (`fast-loading-speed` block)
- Count: **3 suggestions** — `font-clamp` (1) + `media-maxwidth` (2 for `<img>`).
- **No `spacing-clamp`.** Root cause: `.block-fast-loading-speed` uses `padding: var(--spacing-5xl, 64px) var(--spacing-3xl, 40px)` — the unsafe-value guard (`/(var\(|clamp\(|\bmin\(|\bmax\(|calc\(|%|…)/`) from Phase 3 correctly rejects `var()`-based values. Retokenized padding is outside block-forge's rewrite scope by design.
- Correct behavior per ADR-025 "adaptive only for raw literals" principle. Fixture name aspirational.

### `block-plain-copy` (`sidebar-perfect-for` block)
- Count: **0 suggestions.** Near-zero baseline confirmed — no grid, no raw large padding, no flex-row root, no raw large font-size, no `<img>`. Only variants would improve this block, not heuristics.

### `block-nested-row` (`header` block)
- Count: **4 suggestions** — `horizontal-overflow` (2) + `media-maxwidth` (2 for `<img>`).
- **ZERO `flex-wrap` suggestions** despite the nested `.__links` row containing 4 `<a>` children. Nested-row HARD CONTRACT verified at E2E level — locked with an explicit `expect(suggestions.filter(s => s.heuristic === 'flex-wrap').length).toBe(0)` inside `snapshot.test.ts` before the `toMatchSnapshot()` call, so this constraint survives any future `.snap` edits.

---

## 8 — Nested-row E2E evidence (verbatim)

From `snapshot.test.ts`:

```ts
if (name === 'block-nested-row') {
  expect(
    suggestions.filter(s => s.heuristic === 'flex-wrap').length,
  ).toBe(0)
}

expect({
  fixture: name,
  suggestionCount: suggestions.length,
  suggestionHeuristics: [...suggestions.map(s => s.heuristic)].sort(),
  …
}).toMatchSnapshot()
```

`.snap` content for this fixture shows `suggestionHeuristics: ["horizontal-overflow", "horizontal-overflow", "media-maxwidth", "media-maxwidth"]` — no `flex-wrap` in the array. Contract holds at both the hardcoded-expect level and the snapshot level.

---

## 9 — types.ts unchanged

`git diff --stat packages/block-forge-core/src/lib/types.ts` → empty output. Zero type-shape changes in Phase 4. All compose/lib code worked against Phase 1 types without additions.

One minor signature deviation: `renderForPreview(block: BlockOutput, …)` rather than `BlockInput`. Justification: `BlockOutput` is structurally permissive (all `BlockInput` values are assignable because `variants` is optional), and accepting `BlockOutput` lets the preview path naturally receive the output of `composeVariants` without a round-trip narrowing. No types.ts change.

---

## 10 — Deviations

| # | Deviation | Justification |
|---|---|---|
| 1 | Portal wrapper is `data-block-shell` attribute, not `.block-{slug}` class | Task spec described portal incorrectly. Verified at [apps/portal/lib/hooks.ts:211](../../apps/portal/lib/hooks.ts#L211). Matched reality, flagged for Brain review. |
| 2 | `renderForPreview` does NOT call `scopeBlockCss` | Portal parity — portal relies on authored `.block-{slug}` selectors in CSS + iframe isolation at the consumer. `scopeBlockCss` remains a lib helper for future document-embed consumers. |
| 3 | `renderForPreview` signature uses `BlockOutput` instead of `BlockInput` | `BlockOutput` is permissive (variants optional), no types.ts change, cleaner chainability with `composeVariants` result. Flagged §9. |
| 4 | `apply-suggestions.ts` groups suggestions by (bp, selector) — one rule per pair | Cleaner output vs naive one-rule-per-suggestion append. All properties for a single selector at the same bp land in one `.selector { }` block, mirroring hand-authored CSS shape. Determinism preserved by stable sort. |
| 5 | +32 tests vs estimated +26 | `variantCondition` + `scopeBlockCss` + `stripGlobalPageRules` got micro-test describe blocks for lib helpers. Task explicitly waived per-helper test files but allowed inline coverage. |

All deviations are presentation/ergonomic choices, not contract breaks.

---

## 11 — Judgment calls

1. **`applySuggestions` rule-grouping.** Alternative was one rule per suggestion (trivial append loop). Chose grouped emission for readable output — e.g., `{padding; margin}` for the same selector at the same bp merge into one block. Matches how a human author would write the file. Determinism preserved by the sort step.
2. **`emitTweak` uses PostCSS, not regex.** Three-case logic (append container / add rule / update decl) is trivial with AST. Regex would be brittle for the nested-rule case (selector inside `@container`).
3. **`composeVariants` optional `onWarning` callback.** Task said "emit warning" for unknown names — inlined as an optional callback param so callers can collect warnings without `console.warn` pollution. Default is a silent no-op.
4. **`bp=0` branches documented in both `apply-suggestions` and `emit-tweak`.** Explicit branch comment in both files ("Special case: `bp === 0` emits as a top-level rule") for discoverability.
5. **`stripGlobalPageRules` ported byte-for-byte from portal** rather than re-derived. Same regex. Mirrors portal exactly so CSS output is bitwise-identical.

---

## 12 — Verification checklist

| # | Check | Result |
|---|---|---|
| 1 | 3 fixture sha256s match Phase 0 | ✅ byte-for-byte (§1) |
| 2 | 6 fixture `.html/.css` + 2 READMEs present | ✅ |
| 3 | 4 compose + 2 lib + 5 tests present | ✅ (§2) |
| 4 | 4 exports added to `src/index.ts` | ✅ `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview` |
| 5 | 19 new owned_files in manifest | ✅ (§5 accounting) |
| 6 | known_gaps finalized for Phase 4 | ✅ (§5 quote) |
| 7 | Arch-test 417 → 436 (+19) | ✅ exact match |
| 8 | Package tests 14 files, 75 green | ✅ |
| 9 | Block-forge-core typecheck clean | ✅ |
| 10 | `applySuggestions(block, []).css === block.css` | ✅ `apply-suggestions.test.ts` first case |
| 11 | Second consecutive snapshot run: zero updates | ✅ |
| 12 | Nested-row E2E: zero `flex-wrap` suggestions | ✅ hardcoded + snapshot-confirmed (§8) |
| 13 | Portal `renderBlock()` parity | ✅ (§3 table + file:line) |
| 14 | Variant name→bp convention locked | ✅ (§4 table) |
| 15 | Types.ts unchanged (`git diff` empty) | ✅ (§9) |
| 16 | `.snap` file committed, not in owned_files | ✅ arch-test passed without whitelisting |

All 16 checks green.

---

## 13 — Open questions for Brain

**None.** Phase 4 closes cleanly. Phase 5 (Close) opens to a code-complete package:
- 6 public exports (`analyzeBlock`, `generateSuggestions`, `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`) + types
- 75 tests across 14 files (synthetic + real fixtures + snapshot)
- Zero type-shape changes across all four phases
- Fixture sha256s re-verifiable at any time

Phase 5's job is pure doc propagation — `.context/`, domain SKILL.md (Invariants/Traps/Blast Radius), `workplan/BLOCK-ARCHITECTURE-V2.md` cross-references, WP-025 status flip to DONE — under the mandatory approval gate per `feedback_close_phase_approval_gate`.

---

**Final SHA:** `fc8aa430a1f826a164f7981fcab3840f5421338a` (SHA-embed chore: `dea39521`)
