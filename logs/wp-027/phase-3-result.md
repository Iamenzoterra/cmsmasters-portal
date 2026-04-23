# WP-027 Phase 3 — Result

**Date:** 2026-04-23
**Duration:** ~1.5h (pre-flight + impl + gates + visual check)
**Commits:**
- Task prompt: `f70872e0` — logs/wp-027/phase-3-task.md
- Implementation: `5dba05da` — atomic Phase 3 commit (7 files)
- Result log initial: `bc032f1e`
- SHA-embed amend (this edit): `bc032f1e` becomes one-generation stale per WP-026 chicken-and-egg convention — amended SHA omitted

**Arch-test:** 489 / 0 (unchanged — no manifest edits)
**Studio test suite:** 39 passed | 0 todo (28 P1+P2 + 7 suggestion-row + 4 integration)
**Studio typecheck:** clean
**Studio build:** clean (6.86s, block-editor chunk 329 KB)

---

## Pre-flight catch summary

Before executing, caught 5 blockers + 2 drifts in the initial task prompt (same pattern as Phase 2 double-wrap catch). All 8 patches landed before commit:

| # | Issue | Resolution |
|---|-------|-----------|
| 1 | `Suggestion.bp` is always `number` (types.ts:46), never null/undefined | Sort comparator `a.bp - b.bp`; display `bp === 0 ? 'base' : '@{bp}px'` verbatim from reference; test case 6 rewritten with two assertions (bp=0 / bp=480) |
| 2 | Prompt referenced non-existent tokens: `--status-warning-*`, `--radius-*`, `--bg-muted` | Real names: `--status-info-*` (medium), `--status-error-*` (warnings, mirrors block-forge reference), `--rounded-*` (not `--radius-*`), `--bg-surface-alt`. Token list pre-verified against tokens.css line-by-line |
| 3 | SuggestionRow draft omitted `property` + `value` rendering | Added monospace CSS line `{selector} { property: value; }` — core actionable info |
| 4 | `makeSuggestion` test factory missing required fields | Complete factory returns all 8 fields (id, heuristic, selector, bp, property, value, rationale, confidence) — no `as Suggestion` cast needed |
| 5 | Prompt assertions for block-spacing-font wrong | Snapshot ground truth: 3 rows `[font-clamp, media-maxwidth, media-maxwidth]` (no spacing-clamp — var() skip gate). Test assertions updated |
| 6 | Confidence labels uppercase ("HIGH") | Stored lowercase ("high"/"medium"/"low"); CSS `text-transform: uppercase` handles display; tests assert lowercase textContent |
| 7 | integration.test.tsx stub comment said "Phase 4" | Updated to "Phase 3 (display) + Phase 4 (save flow)" — hook-up is incremental across phases |

---

## Task-by-task

### 3.1 `useResponsiveAnalysis` hook (inline in ResponsiveTab.tsx)

**Placement:** Inline per Brain ruling 1. ~30 LOC of `useMemo` wrapping `analyzeBlock + generateSuggestions`; no manifest delta. Extract when a second consumer appears (Phase 4+ may surface one).

**Engine shape verified (types.ts:19-23):**
- `analyzeBlock({ html, css }): BlockAnalysis`
- `BlockAnalysis = { rules, elements, warnings: string[] }`
- `generateSuggestions(analysis: BlockAnalysis): Suggestion[]`

**Deviation from draft:** prompt had `analyzeBlock({ slug, html, css })` — engine's `AnalyzeBlockInput` takes only `{ html, css }` (analyze-block.ts:5-8). `slug` is a BlockInput field used downstream (e.g. renderForPreview) but `analyzeBlock` ignores it. Fixed during typecheck; recorded here.

**useMemo deps:** `[block?.id, block?.html, block?.css]` — stable primitives. Deliberately NOT keyed on `block.variants` per Brain ruling 2 (BASE block analysis only).

**Error path:** try/catch around the engine calls → thrown exceptions surface as `error: Error` in AnalysisResult. SuggestionList renders error banner instead of list.

### 3.2 `SuggestionList.tsx`

**HEURISTIC_ORDER source:** block-forge LOCAL const at `tools/block-forge/src/components/SuggestionList.tsx:20-27`. Engine does NOT export it publicly. Studio copies verbatim; cross-surface resync = Phase 5 Close PARITY approval gate item.

**Order:** `['grid-cols', 'spacing-clamp', 'font-clamp', 'flex-wrap', 'horizontal-overflow', 'media-maxwidth']`

**Sort:** heuristic (by index) → selector (localeCompare) → bp (numeric). `bp` always number — no null guard.

**Warnings banner:** `--status-error-*` tokens mirror block-forge reference (cross-surface parity). `--status-warn-*` exists in tokens.css:124-125 but unused here; rebrand edits both surfaces together.

**Empty state:** muted text "No responsive suggestions for this block — looks good."

**Error state:** `--status-error-*` banner with exception message.

### 3.3 `SuggestionRow.tsx`

**Field verification** (types.ts:41-50 — all 8 fields rendered):
- `id` → `data-suggestion-id` attr
- `heuristic` → monospace tag with `--bg-page` bg (has `data-role="heuristic"`)
- `selector` → muted color in CSS line
- `bp: number` → `bp === 0 ? 'base' : \`@${bp}px\`` (reference L93)
- `property` + `value` → monospace CSS snippet `selector { property: value; }`
- `rationale` → plain paragraph, `--text-sm-font-size`
- `confidence` → ConfidencePill sub-component

**Confidence mapping** (verbatim from reference L26-45):
| Level | BG token | FG token | Label |
|-------|----------|----------|-------|
| high | `--status-success-bg` | `--status-success-fg` | `high` |
| medium | `--status-info-bg` | `--status-info-fg` | `medium` |
| low | `--bg-surface` | `--text-muted` | `low` |

Labels lowercase; CSS `text-transform: uppercase` handles display.

**Disabled buttons:** `disabled` attr + `opacity: 0.5` + `cursor: not-allowed`. `data-action="accept"` and `data-action="reject"` attrs set for Phase 4 handler wiring.

**Styling mechanism:** inline `style={{ ... }}` with token vars. Reference uses Tailwind className (`bg-[hsl(var(--token))]`); Studio has no Tailwind setup today. Behavior byte-identical, mechanism differs.

**ds-lint exceptions:** 2× `fontFamily: 'var(--font-family-monospace)'` with `// ds-lint-ignore` comments (monospace required for code display; not inherited from body). Per saved memory `feedback_lint_ds_fontfamily.md`.

### 3.4 Layout verification

Manual render verified on two real blocks (screenshots committed):

| Block | slug | Suggestion count | Confidence mix | Screenshot |
|-------|------|------------------|----------------|------------|
| fast loading speed | `fast-loading-speed` | 3 | all HIGH | `logs/wp-027/wp-027-p3-responsive-tab-triggered.png` |
| Global settings | `global-settings` | 3 | all LOW | `logs/wp-027/wp-027-p3-responsive-tab-global-settings.png` |

Both screenshots confirm:
- Preview triptych (Phase 2) at top unaffected
- Suggestion list below renders rows in sort order
- Accept/Reject buttons visibly disabled
- Monospace CSS line shows `selector { property: value; }` correctly
- Confidence pills render in correct colors (HIGH = green, LOW = muted)
- Sort within same heuristic+bp falls through to selector alphabetical (global-settings: `__card-title` < `__color-label` < `__element-row`)

Empty state path covered by integration.test.tsx case 2 (block-plain-copy fixture). No block in DB triggers `warnings` array — warnings banner path covered by unit+integration tests only; no visual this phase.

### 3.5 `suggestion-row.test.tsx` — 7 cases green

- Fields render (heuristic, selector, bp, property, value, rationale)
- Confidence labels lowercase ('high'/'medium'/'low') × 3 cases
- Accept + Reject DISABLED (disabled property true × 2)
- bp convention: bp=0 → 'base', bp=480 → '@480px' (single test, two renders with cleanup between)
- data-suggestion-id attribute matches suggestion.id

No Suggestion field adaptations from the final (post-patch) draft — all fields landed as spec'd.

### 3.6 `integration.test.tsx` — 4 cases green

**Fixture imports via 7-dot `?raw` paths** (Phase 0 carry-over (f)):
```ts
from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
```
Paths resolve correctly — no Vite config changes needed.

**Snapshot-as-ground-truth verified** (saved memory `feedback_fixture_snapshot_ground_truth.md`):

| Fixture | Snapshot line | suggestionCount | suggestionHeuristics | warnings |
|---------|---------------|-----------------|---------------------|----------|
| block-spacing-font | 470-475 | 3 | `[font-clamp, media-maxwidth, media-maxwidth]` | `[]` |
| block-plain-copy | 346-348 | 0 | `[]` | `[]` |

Fixture filename `block-spacing-font` suggests spacing-clamp fires, but engine's var()-skip gate ignores spacing values wrapped in `var(...)` — so spacing-clamp does NOT fire. Reality differs from filename by exactly 1 heuristic and adds 2 media-maxwidth rows.

**Block type cast:** engine reads only `{ html, css }`; full Supabase `Block` type has many other required fields (created_at, updated_at, name, etc.). `as unknown as Block` cast suppresses TS warnings about the synthesized minimal fixture object. No runtime impact.

**ResizeObserver polyfill:** added inline at top of integration.test.tsx. Jsdom doesn't ship one; PreviewPanel (Phase 2) uses it for scale-to-fit in a `useEffect`. Without the polyfill, passive effects threw and React rolled back the component tree → 3 tests failed before polyfill, all 4 pass after.

### 3.7 Token verification

All `hsl(var(--...))` references in Phase 3 source verified against `packages/ui/src/theme/tokens.css`:

**Present:**
- `--status-success-bg/-fg` (120-121) — high confidence, accept button
- `--status-info-bg/-fg` (126-127) — medium confidence
- `--status-error-bg/-fg` (122-123) — warnings banner + error state
- `--bg-surface` (97) — low confidence bg, reject button
- `--bg-page` (96) — heuristic tag bg
- `--text-primary` (105), `--text-muted` (107)
- `--border-default` (114)
- `--rounded-sm` (313), `--rounded-md` (314), `--rounded-full` (320)
- `--spacing-2xs` (294), `--spacing-xs` (295), `--spacing-sm` (296), `--spacing-md` (297), `--spacing-lg` (298), `--spacing-xl` (299)
- `--font-weight-semibold` (289)
- `--font-family-monospace` (228)
- `--text-xs-font-size` (270), `--text-sm-font-size` (265)

**No substitutions needed** — pre-flight pass caught all invalid token names; prompt patched before Hands wrote code.

### 3.8 Gates

```
arch-test:  489 / 0   ✅ unchanged
typecheck:  clean     ✅ (after analyzeBlock signature correction)
test:       39 / 39   ✅ (4 test files)
build:      clean     ✅ 6.86s
lint-ds:    clean     ✅ (2× ds-lint-ignore on monospace fontFamily)
visual:     2 blocks  ✅ HIGH + LOW confidence paths verified live
```

---

## Deviations / Plan Corrections

1. **`analyzeBlock` signature** — prompt draft passed `{ slug, html, css }`; real signature takes `{ html, css }`. Engine's `AnalyzeBlockInput` interface doesn't include slug (analyze-block.ts:5-8). Fixed during typecheck pass. Pre-flight review caught 5 other issues but missed this one because we didn't read analyze-block.ts — only the root index.ts + types.ts.

2. **`@testing-library/dom` dependency** — added as devDep in `apps/studio/package.json`. `@testing-library/react@16` made this a peer dep (not auto-installed). Phase 3 is the first tests in apps/studio to actually call `render()` (Phase 1+2 stubs used `describe.skip`; preview-assets tests assert strings, not DOM). One-shot install, no ongoing impact.

3. **ResizeObserver jsdom polyfill** — added as inline 6-line class at top of integration.test.tsx. Not a new file, not a setup-file + manifest change; just test-local. Reason: PreviewPanel's scale-to-fit useEffect uses ResizeObserver which jsdom doesn't implement. Minimal no-op polyfill unblocks the full ResponsiveTab render path.

4. **No warnings fixture available** — none of the test blocks or fixtures in the codebase trigger `analysis.warnings.length > 0`. Warnings banner renders correctly in tests (asserted via `queryByText`) but no visual screenshot of that state this phase. Phase 4 or a future block with malformed CSS can surface it visually.

5. **Workplan §3.6 variant-bearing integration test de-scoped** — original workplan line 393 wanted "Synthesize ONE variant-bearing block inline for the variant-display test — engine has no variant-bearing fixture yet; the synthesis is the Studio-display contract not the heuristic contract." Brain ruling 2 de-scoped this from Phase 3 (analyze BASE only; variant-display contract was verified in Phase 2.7's synthetic variant composition test per phase-2-result.md). Not a regression — Phase 2 already covers variant composition via Path B end-to-end. Documented here for paper-trail traceability between workplan and Brain rulings.

6. **Medium confidence pill — no live visual this phase.** Fast-loading-speed block has all HIGH suggestions; global-settings has all LOW. Medium path exercised by `suggestion-row.test.tsx` case 3 (textContent 'medium') but no live screenshot. Not an AC blocker; acceptable because:
   - Token mapping is verbatim from block-forge reference (which IS visually verified in that codebase)
   - CSS resolved-style equivalence is provable: `hsl(var(--status-info-bg))` with tokens.css:126 = `hsl(206 100% 92%)` (light blue).
   Phase 4 may surface medium-confidence suggestions naturally when Accept flow brings more block variety into play.

---

## Carry-overs for Phase 4

1. **Session-state wiring:** Accept → `form.setValue('code', appliedCode, { shouldDirty: true })` lights up RHF `formState.isDirty` for the existing Save button. Phase 1's `session-state.ts` finally gets a consumer.

2. **Hono `/api/content/revalidate { all: true }` fire-and-forget** after successful Save. Phase 4.0 mini-RECON on `apps/api/src/routes/revalidate.ts` ownership + LOC delta estimate before editing.

3. **`updateBlockApi` TS payload** needs `+variants: BlockVariants` to match current DB schema. One-line fix; surface during Phase 4.0.

4. **Error toast integration** via `useToast()` for the Phase 3 error state — surface-level; currently inline banner only.

5. **Integration test expansion:** spy on `updateBlockApi` + `fetch` for revalidate; assert RHF dirty transitions; assert session-state clearAfterSave. Phase 4 replaces the "buttons disabled" case with real flow assertions.

6. **Potential second consumer for useResponsiveAnalysis** (Brain ruling 1 trigger): if Phase 4 introduces a separate "accepted suggestions preview" pane, the hook gets extracted to `apps/studio/src/pages/block-editor/responsive/useResponsiveAnalysis.ts` + manifest +1 + unit tests. Not triggered yet.

---

## Ready for Phase 4

Engine integration LIVE end-to-end:
- `analyzeBlock + generateSuggestions` run on every block load (memoized)
- Sorted suggestion list renders below the Phase 2 preview triptych
- Confidence badges + CSS snippets + rationale all DS-token compliant
- Accept/Reject buttons rendered DISABLED as spec'd; DOM-ready for Phase 4 onClick wiring
- Fixture-based integration test with snapshot-ground-truth cross-ref
- Visual parity confirmed against block-forge reference (structural + token alignment)

Display path is DONE for both preview (Phase 2) and suggestions (Phase 3). **Interactivity is Phase 4.**
