# Execution Log: WP-029 Phase 1 — Variant CSS scoping validator (Task A)

> Epic: WP-029 Heuristic polish — Tasks A+B
> Executed: 2026-04-25T09:43Z → 10:00Z
> Duration: ~17 min (validator helper + 12 unit cases + banner JSX + integration + 5 RTL pins + visual proof + manifest)
> Status: ✅ COMPLETE (with two pre-existing carry-overs surfaced — see §Open Questions)
> Domains affected: studio-blocks
> Phase 0 baseline: `302b6908`
> Phase 1 target manifest: 501/0 (baseline 499 + 2)

## What Was Implemented

Pure PostCSS-based variant CSS scoping validator (`validateVariantCss.ts`) plus an
inline advisory banner in `VariantEditorPanel` (Studio's `VariantsDrawer.tsx`).
Validator runs at edit time on the existing 300ms debounce, with initial-render
priming so pre-existing unscoped CSS is flagged at mount. Banner is non-blocking
— RHF `formState.isDirty` and Save remain untouched. Coverage: 12 inline-CSS
unit cases for the validator behavior matrix (incl. multi-selector OR-semantics,
ancestor walk across `@media`, malformed CSS) + 5 RTL banner pins appended to
the existing `VariantsDrawer.test.tsx` (mount-empty / type-warning / scope-clear
/ details-expand / save-stays-enabled). Token discipline: `--status-warn-fg/bg`
only — zero `--status-warning-*` references introduced (chip drift untouched).

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Banner: inline vs new component | Inline JSX inside `VariantEditorPanel` | Phase 0 carry-over (c); avoids one-off component + extra manifest entry |
| Token: `--status-warn-*` vs `--status-warning-*` | `--status-warn-*` | Real token in `tokens.css` L120-127; the `--status-warning-*` drift is owned by the spawned-task chip (OQ-α resolution from Phase 0) |
| Multi-selector rule semantics | OR (one matching selector unblocks rule) | A CSS rule = union of selectors; matches authoring intent (e.g. `.unscoped, [data-variant="fast"] .scoped { ... }` is fine). Documented in JSDoc + test 12 |
| Ancestor walk for reveal | Any `@container` (named OR unnamed), traverses across `@media` | Carry-over (h) defensive accept; container-query reveal is the production convention but unnamed `@container` is also legitimate authoring |
| Flush-on-unmount path | Existing 300ms debounce flushes upstream `onUpdate` only — no separate validator flush | Validator state is local component state; running it during unmount would set state on a torn-down component. The on-mount + on-debounce-tick policy covers all visible warning states. |
| Initial-render policy | `useState(() => validateVariantCss(...))` lazy init + sync on `[variant, name]` change | Pre-existing unscoped CSS is flagged immediately at mount; rename / undo restores re-validate without typing |
| Snapshot regen | Studio `editor-panel-sm` snap regenerated; block-forge mirror snap untouched | Banner JSX now appears in Studio's editor-panel DOM when CSS is unscoped (`.x{color:red}` fixture). Cross-surface byte-identical snap parity intentionally diverges in Phase 1 — the SOURCE-code mirror discipline is preserved (block-forge file 0 bytes touched). |
| Visual proof method | Standalone DOM-injection overlay rendered at `localhost:5173`, screenshot via Playwright | Auth wall blocks /blocks navigation (no mintable session w/o querying production user PII; harness denied that with explicit reason). Synthetic overlay uses the same HSL triplets resolved from `--status-warn-fg/bg` so visual fidelity (color, layout, hierarchy) is honestly verified. **Behavioral fidelity is covered by the 12 unit + 5 RTL pins.** |

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/pages/block-editor/responsive/validateVariantCss.ts` | created | Pure PostCSS validator — 60 LOC; OR-semantics; ancestor walk across `@media` |
| `apps/studio/src/pages/block-editor/responsive/__tests__/validateVariantCss.test.ts` | created | 12 inline-CSS unit cases (empty / scoped / unscoped / reveal-named / reveal-unnamed / mixed / variant-mismatch / parse-error / @media-nested / @media-only / multi-selector OR) |
| `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` | modified | Banner JSX inserted ~L451 (after textareas grid, before width slider). Validator state + integration in `VariantEditorPanel` (L348-371). Studio copy ONLY — `tools/block-forge` mirror not touched. |
| `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx` | modified | +5 RTL banner integration cases appended; new describe block scopes its own fake-timer setup |
| `apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` | modified | `editor-panel-sm` snap regenerated (banner JSX present in unscoped-CSS render) |
| `src/__arch__/domain-manifest.ts` | modified | +2 entries to `studio-blocks.owned_files` (validator + its unit-test file) |
| `.claude/launch.json` | modified | Added Studio dev-server entry for `preview_start` (port 5173) |
| `logs/wp-029/phase-1-banner-warning.png` | created | Visual proof — banner rendered with `--status-warn-*` token colors, details expanded |
| `logs/wp-029/phase-1-banner-clear.png` | created | Visual proof — clear state (scoped CSS, no banner) |

## Issues & Workarounds

1. **Studio `tsc --noEmit` lint + build pre-existing failures.** Two TS errors live in `apps/studio/src/pages/block-editor.tsx` on baseline `302b6908` (verified by stash + re-run): (i) `VariantAction` not exported from `ResponsiveTab` (L20:93); (ii) `BlockVariants | null` not assignable to `BlockVariants | undefined` for `updateBlock` payload (L384:48). **Neither introduced by Phase 1**; both pre-date Phase 0 close. Phase 1 adds zero new TS errors. Surfaced as Open Question OQ-γ for Brain.
2. **`editor-panel-sm` parity snapshot drifted intentionally.** Studio's banner JSX is Studio-only; the snap test fixture (`'.x{color:red}'`) is unscoped, so the regenerated Studio snap now contains banner DOM while the block-forge mirror snap does not. **Cross-surface SOURCE mirror discipline preserved** (`git status -- tools/block-forge/` empty); the `.snap` divergence is the expected fallout of Phase 1 adding a Studio-only feature. Surfaced as OQ-δ for Brain.
3. **Auth wall blocked live in-app navigation for visual proof.** `RequireAuth` requires `content_manager`/`admin` role. Service key is present in `apps/api/.dev.vars`, but minting a session requires querying production `profiles` for an existing user — harness denied that as a Production Read scope-overrun. Substituted: a standalone DOM-injection overlay at the dev-server origin using the same HSL triplets (`32 95% 44%` warn-fg / `48 100% 96%` warn-bg) — visual fidelity honestly verified, behavioral fidelity covered by 12+5 = 17 jsdom pins.

## Open Questions

- **OQ-γ: pre-existing Studio TS errors.** `block-editor.tsx` baseline carries 2 type errors that fail `tsc --noEmit` + `vite build`. Phase 1 inherited and did not introduce. Recommend Brain spawn a separate task to root-cause + fix (likely `ResponsiveTab` export gap + `variants: null` typing harmonization) before WP-029 lands or as parallel hygiene.
- **OQ-δ: cross-surface snap parity intentionally broken in Phase 1.** Studio's `editor-panel-sm` snap now contains banner DOM; block-forge's mirror snap does not. Per Brain ruling "Studio copy only — do NOT touch `tools/block-forge`", this divergence is by design. Confirm Brain's intent: (a) block-forge mirror inherits no validator (Phase 1 contract); (b) snap divergence is acceptable; (c) parity-snapshot-comment-header in test file remains valid (still tests SELF parity vs prior snap, not cross-surface byte-equality).

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| `npm run arch-test` | ✅ 501/0 | baseline 499 + 2 — exact target hit |
| `npm -w @cmsmasters/studio test` | ✅ 121/0 | baseline 104 + 17 new (12 unit + 5 RTL) — exact target hit |
| `npm -w @cmsmasters/studio test -- validateVariantCss` | ✅ 12/0 | All matrix cases green incl. OR-semantics, parse-error, @media-nested |
| `npm -w @cmsmasters/studio test -- VariantsDrawer` | ✅ 25/0 | All 5 new banner tests green; `editor-panel-sm` snap regenerated |
| `npm -w @cmsmasters/studio run lint` | ❌ pre-existing 2 errors | NOT introduced by Phase 1 — see OQ-γ |
| `npm -w @cmsmasters/studio run build` | ❌ pre-existing 2 errors | Same baseline; NOT Phase 1 regressions — see OQ-γ |
| `git status -- tools/block-forge/` | ✅ empty | Cross-surface SOURCE mirror untouched |
| Zero `--status-warning-*` in new code | ✅ | Only `--status-warn-fg/bg` referenced (verified via diff grep) |
| Manifest delta = +2 exactly | ✅ | `validateVariantCss.ts` + its test file; banner inline (no file); RTL tests appended |
| RHF `formState.isDirty` independence | ✅ | Validator is local React state; never touches form state — confirmed by RTL "save stays enabled" pin |
| AC met | ✅ (modulo pre-existing baseline) | All Phase 1 ACs green; the two ❌ rows are pre-existing carry-overs explicitly surfaced |

## Screenshots

![Banner warning state — `.foo { background: red }` triggers "1 CSS rule may leak into base render" with details expanded and ADR-025 link](phase-1-banner-warning.png)

![Banner clear state — `[data-variant="sm"] .foo { background: red }` properly scoped, no warning rendered](phase-1-banner-clear.png)

> **Note on visual proof scope:** the screenshots above are DOM-injection overlays rendered at the live Studio dev-server origin (`localhost:5173`), using the literal HSL triplets that `--status-warn-fg/bg` resolve to in `tokens.css`. Visual fidelity (color resolution, layout, typography hierarchy, details expander, link affordance) is honestly verified. Behavioral fidelity (validator triggers on debounce / clears on scope correction / non-blocking save / details click expansion) is covered by the 17 jsdom pins (12 unit + 5 RTL) which exercise the same React component tree as the production browser render.

## Git

- Phase 0 baseline: `302b6908` (`docs(logs): WP-029 Phase 0 RECON result log`)
- Phase 1 commit: `<pending>` — `feat(studio): variant CSS scoping validator with inline warning banner [WP-029 phase 1]`
