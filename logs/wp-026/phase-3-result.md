# WP-026 Phase 3 — Core Engine + Suggestion List Result

**Date:** 2026-04-23
**Duration:** ~90 min
**Commit(s):** `90f4af85` (feat) + this chore-logs amendment
**Arch-test:** 467 / 0
**Test totals:** file-io 14 + preview-assets 9 + integration 4 = 27 / 27
**Build:** clean (2.03s, 193 modules; pre-existing @import-order + chunk-size warnings unchanged)

---

## What Shipped

| Path | Kind | Purpose |
|---|---|---|
| `tools/block-forge/src/lib/useAnalysis.ts` | new | Hook wrapping `analyzeBlock` + `generateSuggestions`; `useMemo` over (slug, html, css); null-tolerant; defensive try/catch surfaces analyzer crashes as synthesized warnings. |
| `tools/block-forge/src/components/SuggestionList.tsx` | new | Sorted list (dispatcher-order → selector → bp) + warning banner (`role="alert"`) + empty state. Exports `sortSuggestions` for future unit tests. |
| `tools/block-forge/src/components/SuggestionRow.tsx` | new | Heuristic pill, BP label (`base` / `@Npx`), selector+decl in mono, rationale, ConfidencePill, disabled Accept / Reject buttons with `title="Phase 4 — accept/reject wiring pending"`. |
| `tools/block-forge/src/__tests__/integration.test.tsx` | new | 4 cases via Testing Library + jsdom. Per-file `@vitest-environment jsdom` pragma. `afterEach(cleanup)` bridges Vitest's non-auto cleanup. |
| `tools/block-forge/src/App.tsx` | modified | +3 deltas: `useAnalysis` import, `{ suggestions, warnings } = useAnalysis(block)` call, `<SuggestionList …>` wiring in the suggestions aside. |
| `src/__arch__/domain-manifest.ts` | modified | +4 `owned_files` entries under `infra-tooling`. |

Hard-gate negatives (none added):
- No `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview` imports anywhere in `tools/block-forge/src/`. (`grep -rn` clean.)
- No `session.ts`, `StatusBar.tsx`, `CodeView.tsx`. (`Glob` clean.)
- No POST endpoint added to Vite plugin. (`vite.config.ts` unchanged.)
- No fixture copies under `tools/block-forge/`. Integration test reads from `packages/block-forge-core/src/__tests__/fixtures/` via `node:fs/promises` at test time.

---

## Real-block Suggestion Counts (Browser QA)

Captured via Playwright MCP on running :7702 dev server, `data-suggestion-id` attribute count + heuristic DOM scrape.

| Block | Count | Heuristics (in sort order) | Confidences | Warnings |
|---|---|---|---|---|
| header | 4 | `horizontal-overflow` ×2, `media-maxwidth` ×2 | low, low, high, high | 0 |
| fast-loading-speed | 3 | `font-clamp`, `media-maxwidth` ×2 | high, high, high | 0 |
| sidebar-perfect-for | 0 | — (empty state renders) | — | 0 |
| sidebar-pricing | 3 | `horizontal-overflow` ×3 | low, low, low | 0 |

Notes:
- `header` mixes confidences — the `horizontal-overflow` pair renders with the `low` pill (neutral surface + muted text per CONFIDENCE_STYLES); the `media-maxwidth` pair renders with `high` (success green). Screenshot confirms visual distinction.
- `sidebar-perfect-for` is the empty-state case in production data — the block has no responsive-authoring triggers. The "No suggestions — block has no responsive-authoring triggers." copy renders.
- Block switches re-analyze cleanly: DOM swap observed on each `selectOption`, no stale rows. Memoization keyed on `(slug, html, css)` behaves as designed.

---

## Fixture Contract Verification

Integration test runs 4 cases against WP-025-frozen fixtures (`packages/block-forge-core/src/__tests__/fixtures/`):

| Fixture | Contract | Result |
|---|---|---|
| `block-spacing-font` | ≥ 1 suggestion including **`font-clamp`** (see Plan Correction #C1) | ✅ 3 suggestions, `font-clamp` present |
| `block-plain-copy` | Empty-state copy visible; no `role="alert"` | ✅ 0 suggestions, no banner |
| `block-nested-row` | Zero `flex-wrap` entries | ✅ 4 suggestions (all `horizontal-overflow` / `media-maxwidth`), no flex-wrap |
| `null` (picker-not-selected) | Empty-state renders without crash | ✅ |

Cross-referenced against core's own frozen snapshot at `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` lines 218-224 / 346-347 / 470-475. Heuristic arrays match 1:1.

---

## DevTools Parity Spot-checks

Per prompt's §Verification block, captured inline with `browser_evaluate`:

| Assertion | Observed | Pass |
|---|---|---|
| `data-suggestion-id` attribute present + non-empty on each row | `horizontal-overflow-158c36f1` (example) | ✅ |
| ConfidencePill has inline `style=` with real CSS vars | `background-color: hsl(var(--bg-surface)); color: hsl(var(--text-muted));` (on a `low` pill) | ✅ |
| First button `disabled={true}` | `disabled: true` | ✅ |
| First button `title` | `"Phase 4 — accept/reject wiring pending"` | ✅ |
| Button label | `"Accept"` | ✅ |

No `hsl(,,)` placeholders, no `undefined` token expansions, no console errors (0 errors across every block switch; console log archived at `.playwright-mcp/console-2026-04-23T10-11-59-343Z.log`).

---

## Token Grep Verification

All tokens referenced in Phase 3 code were grep-verified against `packages/ui/src/theme/tokens.css` **before** writing code (memorized hotfix discipline):

| Token | Line | Used in |
|---|---|---|
| `--status-error-fg` | 123 | SuggestionList warning border+text, App.tsx load-error label |
| `--status-error-bg` | 122 | SuggestionList warning background |
| `--status-success-bg` | 120 | SuggestionRow ConfidencePill `high` bg |
| `--status-success-fg` | 121 | SuggestionRow ConfidencePill `high` fg |
| `--status-info-bg` | 126 | SuggestionRow ConfidencePill `medium` bg |
| `--status-info-fg` | 127 | SuggestionRow ConfidencePill `medium` fg |
| `--bg-surface` | 97 | Row surface, `low` pill bg, Accept/Reject button bg |
| `--bg-page` | 96 | Heuristic badge pill bg |
| `--text-primary` | 105 | Row body text, heuristic badge fg |
| `--text-muted` | 107 | Count label, selector prefix, `low` pill fg, disabled button text |
| `--border-default` | 114 | Row border, button border |

**All 11 tokens present. Zero renames needed.** The Phase 2 token sanity gate discipline carried forward clean — no `--status-danger-fg` / `--bg-base` aliases re-surfaced.

---

## Verification Commands Executed

```
npm run arch-test                        → 467 passed (467)       — 509ms
cd tools/block-forge && npm run typecheck → clean (tsc --noEmit)
cd tools/block-forge && npm test          → 27 passed (3 files)    — 1.42s
cd tools/block-forge && npm run build     → ✓ built in 2.03s (193 modules)
cd tools/block-forge && npm run dev       → VITE v6.4.2 ready on :7702 (350ms)
```

Screenshot artifact (gitignored): `tools/block-forge/phase-3-suggestions-verification.png` (1108×1092 full-page on 1440 viewport; shows `header` with 4-row list + confidence pills + disabled action buttons).

---

## Deviations

1. **Dropped `toBeInTheDocument` matcher** — `@testing-library/jest-dom` is not a devDependency and not required by the prompt. Replaced with `expect(screen.getByText(...)).toBeTruthy()` — semantically equivalent because `getByText` throws on miss (the assertion is implicit) and `.toBeTruthy()` satisfies unused-expression lint without adding a new dep. No functionality change.
2. **Testing-Library cleanup** — Added `afterEach(cleanup)` import + call. Vitest doesn't auto-invoke `@testing-library/react` cleanup the way Jest's `@testing-library/jest-dom` does; without it, each `render()` stacks onto previous DOM and `getByText` fails with "multiple elements found". Documented inline in the test file.
3. **Debug script scratch file** — Created `tools/block-forge/debug-fixture.mjs` mid-run to diagnose a fixture mismatch (see Plan Correction #C1); deleted before commit.

---

## Plan Corrections

### C1 — `block-spacing-font` fixture doesn't produce `spacing-clamp`

**Prompt text** (`logs/wp-026/phase-3-task.md` §3.6, integration test case #1):
> `it('block-spacing-font: shows ≥ 1 suggestion including spacing-clamp', ...)`

**Reality:** The frozen WP-025 snapshot at `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap:470-475` says `block-spacing-font` produces:
```
suggestionHeuristics: [ "font-clamp", "media-maxwidth", "media-maxwidth" ]
```

**Why:** The fixture's CSS uses `padding: var(--spacing-5xl, 64px) var(--spacing-3xl, 40px);`. Per `heuristic-spacing-clamp.test.ts:38-49` ("does NOT trigger on sub-threshold, var, viewport, or already-clamp values"), `var()` values are explicitly skipped — so `spacing-clamp` never fires, and only the `font-size: var(--h2-font-size, 42px)` → `font-clamp` trigger survives the fixture. The fixture **name** (spacing-font) suggests both, but the **behavior** (after var-skip) is font-only.

**Correction applied:** Test assertion changed to `expect(heuristics).toContain('font-clamp')`. Rationale pinned in a long comment above the assertion so future readers don't re-break this. Test description updated: `block-spacing-font: shows ≥ 1 suggestion including font-clamp`.

**Recommended Phase 3.x follow-up for Brain:** either (a) update `phase-3-task.md` §3.6 to match frozen behavior (font-clamp, not spacing-clamp), or (b) re-author the fixture to include a raw-px `padding: 64px;` or `gap: 48px;` that *would* trigger spacing-clamp — but that would also force a core snapshot regeneration and invalidates the WP-025 freeze. Path (a) is cheaper and correct.

### C2 — jsdom cleanup not implicit in Vitest

**Prompt text** (§3.5): "Use (a). `file-io.test.ts` runs in Node env (uses `node:fs`); forcing jsdom globally adds ~50ms overhead per test file and risks breaking Node-specific APIs. Per-test override keeps things clean."

**Missing detail:** Per-file `@vitest-environment jsdom` does NOT auto-run `cleanup()` between `it` blocks the way Jest + `@testing-library/jest-dom` do. Without `afterEach(cleanup)`, multiple `render()` calls accumulate in the same DOM, and `getByText` fails with "multiple elements found".

**Correction applied:** Added `import { cleanup } from '@testing-library/react'` + `afterEach(() => { cleanup() })` with an inline comment linking to the testing-library caveat. No config change needed — this is a per-file addition alongside the env pragma.

**Recommendation for Brain:** If any future phase pulls more integration tests into `tools/block-forge`, factor a tiny `src/__tests__/setup.tsx` that imports `cleanup` + registers `afterEach` + is referenced via `@vitest-environment jsdom` + a `setupFiles` entry in `vite.config.ts`'s `test:` block (scoped to match `.tsx` pattern to keep `file-io.test.ts` untouched). For just 1 test file, per-file import is fine.

### C3 — `toBeInTheDocument` requires extra setup

**Prompt text** (§3.6, test body): `expect(...).toBeInTheDocument()`

**Reality:** `toBeInTheDocument` lives in `@testing-library/jest-dom` which is not in `tools/block-forge/package.json` devDependencies.

**Correction applied:** Swapped to `expect(...).toBeTruthy()` — since `getByText` throws on miss, the assertion is already implicit in the call; `toBeTruthy` just silences unused-expression complaints from any future lint rule.

**Recommendation for Brain:** Either add `@testing-library/jest-dom` as a devDep + a setupFile (overkill for 2 assertions), or leave as-is. I chose the latter — documented inline.

---

## Ready for Phase 4

- **Hook identifier for Accept/Reject wiring:** `[data-suggestion-id]` attribute on each row. Phase 4's handlers can `querySelector` or lift state through `SuggestionRow` props.
- **Warning banner conditional:** `warnings.length > 0` → renders `role="alert"` region. Phase 4's POST-flow can surface save errors through the same prop (or a separate `saveErrors` prop if we want to distinguish analyzer warnings from save errors).
- **Re-analysis on block change:** verified via browser QA — every `selectOption` swaps the DOM. Phase 4's "re-analyze post-save" will just dispatch a new `setBlock` call; `useMemo` reruns automatically.
- **No blockers:** `session.ts`, POST endpoint, Save, backup-on-first-save, dirty-state tracking all remain untouched. PARITY.md still has zero open divergences.

---

## Summary for Brain

1. **Commit SHA(s):** `90f4af85` (feat + result log) + this chore-logs SHA-embed amendment
2. **Arch-test:** 467 / 0 ✅
3. **Tests:** 27 / 27 ✅ (file-io 14 + preview-assets 9 + integration 4)
4. **Suggestion counts for the 4 real blocks:** header 4, fast-loading-speed 3, sidebar-perfect-for 0, sidebar-pricing 3 — all ✅
5. **Fixture contracts:** 4 / 4 pass (3 explicit + null-safe) — 1 Plan Correction on the spacing-font assertion (C1)
6. **Deviations:** 3 (`toBeInTheDocument` drop, afterEach(cleanup), debug script scratch) — all documented
7. **Plan Corrections:** 3 (C1 spacing-clamp → font-clamp, C2 jsdom cleanup, C3 matcher swap) — all actionable by Brain in next phase's prompt
