# WP-024 Phase 4 — Result

> Phase: 4 of 5 (Slot container-type + tokens.responsive.css scaffold)
> Commit: `e43533b9` (pre-commit HEAD was `ebccfa4d`)
> Domains touched: `pkg-ui`, `app-portal`, `infra-tooling`

---

## Audit confirm-pass (Phase 0 RECON)

| Check | Expected | Observed | ✓ |
|---|---|---|---|
| Baseline `npm run arch-test` | 380 passed, 0 failed | 380 passed, 0 failed | ✅ |
| css-generator.ts generic rule at L245-252 | 5 declarations verbatim | Matches RECON baseline | ✅ |
| css-generator.test.ts fixtures | `threeColLayout()` + `tokens` at top | Present (L6-61) | ✅ |
| PARITY-LOG `## Fixed` insertion point | Line 72 | Line 72 confirmed | ✅ |
| `tokens.responsive.css` absent pre-phase | No such file | Not found | ✅ |
| Portal globals.css imports | 3 imports (tokens, blocks, shell) | Confirmed L2-4 | ✅ |
| Canvas.tsx iframe pattern | `@layer tokens { ${tokensCSS} }` | Confirmed L36-39 | ✅ |
| Studio injection sites | block-preview L96, block-editor L366/L522 | Confirmed | ✅ |
| `/tokens/css` endpoint shape | Single-file read at L205-215 | Confirmed | ✅ |
| Current HEAD | `b117a686` (Phase 3) or later | `ebccfa4d` (one post-Phase-3 docs commit) | ✅ |
| PARITY-LOG open-entry conflict check | No open entry mentions `container-type`, `container-name`, or generic `.slot-inner` | Only open entry is orthogonal (`[tablet] align + max-width on container slots`) — touches per-slot loop, not generic rule | ✅ |

---

## What Was Implemented

Turned on the browser-side responsive mechanism for leaf slots: the layout-maker's css-generator now emits `container-type: inline-size` and `container-name: slot` on the generic `[data-slot] > .slot-inner` rule, enabling block CSS to author `@container slot (max-width: …)` queries that actually evaluate per-slot width (ADR-025 / WP-024 infrastructure). Added a companion hand-maintained `packages/ui/src/theme/tokens.responsive.css` scaffold (two `clamp()` tokens — real population deferred to WP-029, explicitly documented in the file header) and wired it into every portal-asset injection point: portal globals, LM Canvas iframe, LM `/tokens/css` endpoint, Studio block-preview and block-editor template strings. Layout-schematic.tsx deliberately skipped (renders shadow-root stub boxes per slot, not real blocks — clamp tokens are non-applicable). Contract tests in `css-generator.test.ts` now assert both the generic-rule emission and that container-slot outer rules never receive the new properties. PARITY-LOG "Fixed" entry added at the top of the section per LM CLAUDE.md's non-negotiable discipline for css-generator changes. Manifest updated to claim `tokens.responsive.css` under `pkg-ui` and `css-generator.ts` + `.test.ts` under `infra-tooling` (Brain Q1 decision: minimal footprint, no new domain).

---

## Key Decisions

| Decision | Rationale |
|---|---|
| `container-type: inline-size` + `container-name: slot` applied to the GENERIC rule `[data-slot] > .slot-inner` only | Brain Q3 — container slots naturally don't match the selector (they hold nested `data-slot` children, not `.slot-inner`), so the generic rule is the right home. Per-slot rules inherit through cascade without needing the declarations repeated. |
| `layout-schematic.tsx` NOT edited | Renders shadow-root slot stubs (one labeled dashed box per slot with count badge) — not real block content, no `@container slot` queries run inside it, clamp-based tokens have no effect on stub rendering. Including it would add a meaningless import. Decision flagged here for traceability. |
| Visual-diff canary = analytic / source-level (Option A-derived) | Live tsx-based canary hit import-order / `import.meta.dirname` failures in `token-parser.ts` when loaded from a scratch dir. Since `generateCSS` is a pure, deterministic function composed of `out.push(...)` calls over the same string array, source-level diff = emitted-CSS diff. Source diff shows exactly two new emission lines (`container-type: inline-size` and `container-name: slot`) plus 3 comment lines that do not affect output. Contract test `WP-024: slot container-type (ADR-025)` in `css-generator.test.ts` asserts the exact two properties appear + the 5 pre-existing declarations remain. Two evidences combined > one Option-B canary. |
| Canvas.tsx `@layer tokens { … }` — responsive file concatenated INSIDE the existing block | Follows task 4.6 guidance + CLAUDE.md's documented `@layer tokens, reset, shared, block` order. Keeps responsive tokens in the same specificity bucket as base tokens so overrides behave predictably. |
| `/tokens/css` endpoint rewrite: concatenate both files | Simpler than adding a second route; matches how LM/Studio already inject the two files locally (one blob in srcdoc). Handler gracefully falls back to "not found" when either file is missing. |
| PARITY-LOG entry placed at TOP of `## Fixed`, did NOT touch the open-section entry on `[tablet] align + max-width on container slots` | Reverse-chronological order per log convention; the orthogonal open entry has its own contract-test plan and is a separate concern. |
| Manifest diff: +3 owned_files + 1 known_gap (not +2 files as task estimated) | Task said "+2" but the three additions are `tokens.responsive.css` in `pkg-ui` and `css-generator.ts` + `css-generator.test.ts` in `infra-tooling`. Expected arch-test count was 380+2=382; actual is 384 because there's also a new `known_gaps` severity test per the manifest test harness. +4 net is the correct new total. |
| `stripGlobalPageRules` NOT touched, `tokens.css` NOT touched | Phase scope boundary. Figma-sync invariant preserved (`git diff --stat tokens.css` empty). |

---

## Files Changed

| File | Change | Size |
|---|---|---|
| `tools/layout-maker/runtime/lib/css-generator.ts` | +2 emission lines on generic `.slot-inner` + 3-line explanatory comment | +5 / -1 |
| `tools/layout-maker/runtime/lib/css-generator.test.ts` | New `describe('WP-024: slot container-type (ADR-025)')` with 2 tests + `extractRule` helper | +40 / 0 |
| `tools/layout-maker/PARITY-LOG.md` | New "Fixed" entry at top of section | +17 / 0 |
| `packages/ui/src/theme/tokens.responsive.css` | NEW — 2 scaffold tokens with WP-024/ADR-025/WP-029 header | +19 / 0 (new file) |
| `apps/portal/app/globals.css` | +1 `@import` line | +1 / 0 |
| `tools/layout-maker/src/components/Canvas.tsx` | +1 import + 1 injection line inside `@layer tokens {}` block | +2 / 0 |
| `tools/layout-maker/runtime/routes/blocks.ts` | `/tokens/css` endpoint rewritten to concatenate both files | +10 / -7 |
| `apps/studio/src/components/block-preview.tsx` | +1 import + variable added to `sharedStyles` concat | +1 / -0 (1 modified) |
| `apps/studio/src/pages/block-editor.tsx` | +1 import + 2 injection sites (L367 export template, L524 preview window) | +3 / -0 (2 modified) |
| `src/__arch__/domain-manifest.ts` | pkg-ui.owned_files +1, pkg-ui.known_gaps +1, infra-tooling.owned_files +2 | +4 / 0 |
| `packages/ui/src/theme/tokens.css` | **NOT TOUCHED** (confirmed: `git diff --stat` = empty) | 0 / 0 |
| `apps/studio/src/components/layout-schematic.tsx` | **NOT TOUCHED** — schematic renders stubs, not real blocks (Brain-confirmed skip) | 0 / 0 |

---

## Two-path sync (contract check)

| Concern | LM canvas | Studio block-preview | Studio block-editor export | Studio block-editor preview-window | Portal globals | LM `/tokens/css` |
|---|---|---|---|---|---|---|
| tokens.css injected | ✅ (inside `@layer tokens`) | ✅ (`sharedStyles`) | ✅ (L367) | ✅ (L522) | ✅ (L2) | ✅ (served) |
| tokens.responsive.css injected (NEW) | ✅ (same `@layer tokens` block) | ✅ (`sharedStyles` concat) | ✅ (L367) | ✅ (L524) | ✅ (L3) | ✅ (concatenated) |
| Order: responsive after base | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Issues & Workarounds

- **Visual-diff canary live run hit `import.meta.dirname` failure** in `token-parser.ts` when the file was copied to a scratch directory and loaded via tsx — `path.resolve` received `undefined` because the module-metadata context differed. Not a real problem (file works fine in Vite/Node production contexts). Fell back to **analytic canary**: source-level `git diff HEAD` shows the only emission-changing lines are the two new `out.push()` calls; `generateCSS` is a pure function so source-level diff deterministically equals output-level diff; the contract test corroborates with a positive assertion on real generator output. Two independent evidences.
- **ESLint warning during portal build**: `Invalid Options: 'extensions' has been removed` — pre-existing, unrelated to this phase, shown during build but does not fail the build (exit 0, 5 pages generated).

---

## Open Questions

- **`[data-slot] > .slot-inner` vs hand-written theme-page wrapper** — `apps/portal/app/themes/[slug]/page.tsx:189` constructs `<div class="slot-inner">` manually (not inside `[data-slot]`). Per Brain Q3, this was deliberately out of scope for Phase 4 but is a forward-risk: any theme page rendered through that path will NOT have `container-type` set on its top-level slot-inner, so `@container slot` queries inside those blocks would silently fail on theme pages rendered before the layout-CSS cascade reaches them. To be flagged in Phase 5 doc updates as a future WP candidate.
- **Layout re-export triggering** — the `container-type` contract only lands on a theme when its layout CSS is regenerated and published. Existing themes keep serving pre-WP-024 layout CSS until someone opens the layout in LM and hits Export. WP-024 does not batch-re-export, so the rollout is lazy/edit-driven. This is the intended behavior (matches Brain's scope discipline) but worth documenting in Phase 5.

---

## Verification Results

| # | Check | Result |
|---|---|---|
| 1 | `npm run arch-test` | ✅ 384 passed, 0 failed (was 380 → +4: 3 new path entries + 1 new known-gap test) |
| 2 | `npx vitest run tools/layout-maker/runtime/lib/css-generator.test.ts` | ✅ 21 passed (was 19 → +2 new WP-024 tests) |
| 3 | `npx tsc -p apps/portal/tsconfig.json --noEmit` | ✅ exit 0 |
| 4 | `npx tsc -p apps/studio/tsconfig.json --noEmit` | ✅ exit 0 |
| 5 | `npx tsc -p tools/layout-maker/tsconfig.json --noEmit` | ✅ exit 0 |
| 6 | `npm run -w @cmsmasters/portal build` | ✅ exit 0 — 5 pages generated (3 static + 2 dynamic) |
| 7 | `grep -c "container-type: inline-size" tools/layout-maker/runtime/lib/css-generator.ts` | ✅ 2 matches — L246 (comment explaining why) + L254 (actual `out.push`). Only 1 emission (task intent). |
| 8 | `grep -c "tokens.responsive.css" <5-file-batch>` | ✅ globals 1, block-preview 1, block-editor 1 (var used elsewhere), Canvas 1, blocks.ts 3. Raw-string refs + variable refs combined in block-editor = 3, Canvas = 2. All expected injection sites present. |
| 9 | `grep -c "clamp" packages/ui/src/theme/tokens.responsive.css` | ✅ 2 (two scaffold clamp tokens) |
| 10 | `git diff --stat packages/ui/src/theme/tokens.css` | ✅ EMPTY — tokens.css byte-unchanged (Figma-sync invariant preserved) |
| 11 | Manifest additions: `grep -cE "tokens.responsive.css\|css-generator" src/__arch__/domain-manifest.ts` | ✅ 4 matches (pkg-ui file + pkg-ui known_gap + 2 infra-tooling files) |
| 12 | PARITY-LOG entry at top of `## Fixed`: `sed -n '72,95p'` | ✅ "all-bp Slot container-type enables per-slot responsive variants (WP-024 / ADR-025)" present as first Fixed entry |
| 13 | Visual-diff canary (analytic) | ✅ Source-level diff: exactly 2 new `out.push(...)` lines (`container-type: inline-size;` and `container-name: slot;`) + 3 added comment lines (non-emitting) + 1 period added to existing comment. No other emission changes. Contract test corroborates with positive assertion. |

---

## Manifest impact

- `pkg-ui.owned_files`: +1 (`tokens.responsive.css`) — manifest test "Path Existence" added.
- `pkg-ui.known_gaps`: +1 string — manifest test "Known Gaps Severity" added.
- `infra-tooling.owned_files`: +2 (`css-generator.ts`, `css-generator.test.ts`) — 2 Path Existence tests added.
- Arch-test count: **380 → 384** (+4). Exceeds the task's +2 estimate by 2 — the extra two are (a) the Known Gaps Severity test auto-generated for the new known_gap string, (b) the manifest test harness generates one arch test per file in `owned_files`, confirming 3 new file-level tests + 1 known-gap test = +4. Noted for log-completeness; the count is internally consistent and reflects the test harness working correctly.

---

## Git commit SHA

`e43533b9`
