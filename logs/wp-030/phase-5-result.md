# WP-030 Phase 5 — Result

> Phase 5: Container Widths Editor + Live Preview Row.
> Status: 🟢 SEALED (Brain dual-gate review APPROVED 2026-04-26 — code + live UI both 🟢).
> Phase 4 baseline: `a917f3b6` (doc fixup of `4c377a33`).

## What Was Implemented

Container Widths Editor (3-BP × 2-field form) and Live Preview Row (3 fixed-width iframes 1440/768/375) wired into the orchestrator below the existing Token Preview Grid. Schema extension landed `containers: { mobile, tablet, desktop }` on `ResponsiveConfig` (with `ContainerBpValue` discriminated by mobile-only `'100%'` allowance). Conservative defaults seeded per WP §2.2 (mobile 100%/16, tablet 720/24, desktop 1280/32). Generator extended to emit `:root` mobile container block + 2 `@media` blocks (TABLET_BP=768, DESKTOP_BP=1280 hardcoded constants — V1 schema-minimal; making editable is V2). Phase 0 escalation (b) `--container-*` token introduction → ✅ RESOLVED via Phase 5 schema-and-generator activation (0 consumers today; cascade resolves to fluid-system values once Phase 6 PARITY activates the `tokens.responsive.css` overlay). PostCSS `@import must precede` warning baked silent via `globals.css` reorder (PF.21). Phase 2 snapshot accepted as new baseline — 22 `vi,` entries STILL present + 2 `@media` blocks + 3 `--container-max-w` lines emitted. Live UI verification ran in same session via chrome-devtools MCP — 6 screenshots in `logs/wp-030/p5-smoke/` covering baseline, per-token override propagation through all 3 iframes, Mobile full-bleed toggle off + numeric value, Tablet maxWidth narrowing, Desktop padding gutter widening, and Reset restoration to baseline.

## Pre-flight findings

| # | Status | What |
|---|--------|------|
| PF.21 | ✅ BAKED | `globals.css` reorder — Manrope `@import url(...)` now precedes `@import 'tailwindcss'` and `@config '../tailwind.config.ts'`. Verification §1.5 confirms no `@import must precede` warning on dev-server boot. |
| PF.22 | ✅ used | `--container-*` introduction confirmed: 0 grep matches across packages/+apps/ before Phase 5; schema+defaults+generator extension is the introduction point. |
| PF.23 | ✅ used | Schema field REQUIRED (not optional `?:`) — `ResponsiveConfig.containers` is non-nullable. Conservative defaults updated with explicit field. TypeScript check passes. |
| PF.24 | ✅ used | Generator emits `:root` mobile + 2 `@media` blocks. Snapshot accepted. New invariants: 22 `vi,` STILL present + 0 `vw,` + 2 `@media` + 3 `--container-max-w` lines (1 mobile + 2 inside @media). |
| PF.25 | ✅ used | `LivePreviewRow` uses 3 raw `<iframe>` elements (NOT `<div>`s). Match `block-forge/PreviewTriptych` precedent. iframe inner `width` attribute = simulated viewport; `vi` units inside resolve to that width. Stable remount via `key={`${panel.width}-${remountKey}`}` where `remountKey = resultCss.length`. |
| PF.26 | ✅ used | Sample CSS in `LivePreviewRow.tsx::SAMPLE_CSS` template literal contains `font-family: system-ui, sans-serif`, `hsl(0 0% 12%)`, etc. — sample preview surface, NOT tool chrome. Outer editor adheres to no-hardcoded-styles. |
| PF.27 | ✅ used | No `vite.config.ts` / `setupTests.ts` changes. `afterEach(cleanup)` hook from Phase 3 covers iframe-mounting tests. iframe srcdoc not loaded by jsdom — tests assert on srcdoc string content + element shape, not rendered iframe DOM. |

### New Phase 5 findings (PF.28–PF.30)

| # | Severity | Description |
|---|----------|-------------|
| PF.28 | LOW | `lint-ds.sh` at L53-56 explicitly skips all `tools/` paths (`if [[ "$file" =~ tools/ ]]; then return; fi`). Saved memory `feedback_lint_ds_fontfamily` was authored with `apps/` in scope; the pre-commit hook does NOT actually fire on `tools/responsive-tokens-editor/` content. The `/* ds-lint-ignore */` comment placed above `font-family:` in `LivePreviewRow.tsx::SAMPLE_CSS` is purely documentary (intent clarity for human readers + future audits) — functionally inert. No action needed; documentation added inline + this PF entry. |
| PF.29 | LOW (task spec drift) | Task §verification 7(d) said "edit Type Base @ Max from 18 → 22 → all 3 iframes show larger H2/body". On V1 baseline this produces NO visible iframe change — `conservativeDefaults` overrides ALL 22 tokens (PF.18 invariant), and the type-scale config (`config.type.baseAtMin/Max/ratio*`) only drives scale-derived tokens NOT in `overrides`. With every token explicitly overridden, the type-scale dial is effectively dormant for V1 baseline. Mitigation: scenario 02 pivoted to per-token override edit on `--h1-font-size` (44/54 → 80/120) which DOES propagate to all 3 iframes — this is the actual user-facing path for editing visible token values in V1. Real-time-update path verified via this scenario instead. |
| PF.30 | LOW (task spec drift) | Task §verification 7(f) said "edit Tablet maxWidth 720 → 1000 → 768 iframe content stretches wider". At iframe inner width 768 with body padding (`--container-px`) of 24px each side, available content area = 720px. Container `max-width: 1000` at iframe 768 resolves to `min(1000, 720) = 720` — same as before. Visible effect at 768 iframe is NIL when increasing tablet maxWidth above iframe width minus body padding. Mitigation: scenario 04 pivoted to 720 → 500 (smaller than body content area) which DOES produce visible narrowing (container shrinks from 720 → 500 inside the 768 iframe with ~110px margin each side). Documents the cascade-interaction nuance for future V2 polish where the tool could surface "effective max width" contextually. |

## Live UI verification

Per saved memory `feedback_visual_check_mandatory` — UI-touching phase requires same-session live check. 6 screenshots saved to `logs/wp-030/p5-smoke/`:

| # | File | Acceptance scenario |
|---|------|---------------------|
| 01 | `01-baseline-grid-containers-preview.png` | V1 baseline: TokenPreviewGrid + NEW Container Widths Editor (3 BP rows, mobile full-bleed checked, tablet 720/24, desktop 1280/32) + NEW LivePreviewRow (3 iframes 1440/768/375 with H1+H2+body+buttons sample). |
| 02 | `02-h1-override-80-120-iframes-update.png` | Per-token override edit `--h1-font-size` 44/54 → 80/120 via inline editor's Apply. All 3 iframes show much larger "Heading 1" — proves config → result.css → iframe srcdoc → re-render path works. (Scenario pivoted from task spec's Type Base @ Max edit per PF.29.) |
| 03 | `03-mobile-fullbleed-off-320-iframe-margin.png` | Mobile full-bleed toggle OFF + numeric maxWidth 320. ContainerWidthsEditor's mobile row swapped checkbox-only to checkbox-unchecked + number input visible (320). Mobile · 375px iframe shows narrower container (subtle margin since 320 < 375). |
| 04 | `04-tablet-maxwidth-500-narrower.png` | Tablet maxWidth 720 → 500. Tablet · 768px iframe content squeezed narrower with visible side margins (container = 500, body content area available 720, ~110px margin each side). (Scenario pivoted from task spec's 720 → 1000 per PF.30.) |
| 05 | `05-desktop-padding-64-wider-gutters.png` | Desktop padding 32 → 64. Desktop · 1440px iframe shows wider left gutter (body padding doubled from 32 to 64 each side). |
| 06 | `06-reset-restores-baseline.png` | Reset button held 3.5s → all overrides restored: Tablet maxW back to 720, Desktop padding back to 32, Mobile full-bleed re-checked, --h1-font-size back to 44/47/54 px in TokenPreviewGrid. Visually identical to screenshot 01. |

Acceptance scenarios all PASS. The 3 iframes' real-time response across config-change paths (per-token override + container BP fields) is fully verified.

## Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `containers` field REQUIRED (not optional) | Forces every config to specify containers; conservativeDefaults seeded with WP §2.2 V1 values; no "containers undefined" code path needed in generator or UI. |
| 2 | TABLET_BP=768 / DESKTOP_BP=1280 hardcoded constants in `generator.ts` | V1 schema minimal; making BPs editable is a V2 concern. Per Brain ruling R.3. Documented inline in generator.ts comments. |
| 3 | LivePreviewRow uses raw `<iframe>` elements (not `<div>`) | iframe inner viewport = `width` attribute → `vi` units inside resolve to that width. Fixed-width div on a 1920px monitor would still report host viewport for `vi`. Per Brain ruling R.4 + block-forge PreviewTriptych precedent. |
| 4 | Iframe srcdoc CSS exempt from `feedback_no_hardcoded_styles` | Sample preview surface is NOT tool chrome (PF.26). Outer editor (ContainerWidthsEditor + LivePreviewRow wrapper) adheres to token-class discipline; only the SAMPLE_CSS template-literal contents are exempt. Per Brain ruling R.5. |
| 5 | Phase 2 snapshot accepted as new baseline (`npm test -- -u`) | Container BP blocks ADD to existing 22-token clamp block (do NOT replace). New invariants locked in __snapshots__/generator.test.ts.snap: 22 `vi,` STILL present + 2 `@media` blocks + 3 `--container-max-w` lines. Per Brain ruling R.6 + saved memory `feedback_fixture_snapshot_ground_truth`. |
| 6 | PF.21 globals.css fix BAKED into Phase 5 (not deferred) | 1-line reorder; cheap; eliminates dev-server warning surfaced in Phase 4 result.md. Verification §1.5 confirms silent. Per Brain ruling R.7. |
| 7 | Skip design-agent spawn (`feedback_use_design_agents` waiver) | ContainerWidthsEditor mirrors GlobalScaleConfig's NumericField pattern (Phase 3 precedent). LivePreviewRow mirrors block-forge PreviewTriptych pattern. Both reuse established UI; design surface is incremental, not novel. Same waiver as Phase 3+4. |
| 8 | `/* ds-lint-ignore */` placed above `font-family:` line in LivePreviewRow despite `lint-ds.sh` skipping `tools/` (PF.28) | Documentary intent — preserves the saved-memory pattern + signals to future audits that the line was deliberate. Functionally inert per PF.28 but cosmetically explicit. |
| 9 | Scenario 02 + 04 pivoted from task spec values (PF.29 + PF.30) | Task spec edits chosen for "easy visible change" but V1 cascade behavior makes them visually inert at the chosen values. Pivoted to per-token H1 override (scenario 02) and Tablet 500 (scenario 04) to produce verifiable visible changes; documents the cascade nuances. |

## Files Changed

| Path | Type | Δ |
|------|------|---|
| `tools/responsive-tokens-editor/src/types.ts` | MOD | +27 / -0 (containers field + ContainerBpValue type + docblock) |
| `tools/responsive-tokens-editor/src/lib/defaults.ts` | MOD | +9 / -0 (containers seed) |
| `tools/responsive-tokens-editor/src/lib/generator.ts` | MOD | +40 / -1 (TABLET_BP+DESKTOP_BP constants + container emit block) |
| `tools/responsive-tokens-editor/src/components/ContainerWidthsEditor.tsx` | NEW | 196 LOC |
| `tools/responsive-tokens-editor/src/components/LivePreviewRow.tsx` | NEW | 96 LOC |
| `tools/responsive-tokens-editor/src/App.tsx` | MOD | +5 / -2 (2-line composition + 2 imports + footer copy) |
| `tools/responsive-tokens-editor/src/globals.css` | MOD | +1 / -2 (PF.21 reorder; net -1 line) |
| `tools/responsive-tokens-editor/src/__tests__/ContainerWidthsEditor.test.tsx` | NEW | 95 LOC, 6 assertions |
| `tools/responsive-tokens-editor/src/__tests__/LivePreviewRow.test.tsx` | NEW | 65 LOC, 5 assertions |
| `tools/responsive-tokens-editor/src/__tests__/generator.test.ts` | MOD | +18 / -0 (3 container-emit assertions) |
| `tools/responsive-tokens-editor/src/__tests__/defaults.test.ts` | MOD | +7 / -0 (1 container-seed assertion) |
| `tools/responsive-tokens-editor/src/__tests__/App.test.tsx` | MOD | +5 / -3 (footer copy assertion updated) |
| `tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap` | MOD (snap accept) | +21 / -1 (container blocks added; trailing `}` repositioned) |
| `src/__arch__/domain-manifest.ts` | MOD | +6 (4 owned_files + 2-line Phase 5 comment) |
| `logs/wp-030/p5-smoke/01-baseline-grid-containers-preview.png` | NEW | 970 KB |
| `logs/wp-030/p5-smoke/02-h1-override-80-120-iframes-update.png` | NEW | 985 KB |
| `logs/wp-030/p5-smoke/03-mobile-fullbleed-off-320-iframe-margin.png` | NEW | 980 KB |
| `logs/wp-030/p5-smoke/04-tablet-maxwidth-500-narrower.png` | NEW | 980 KB |
| `logs/wp-030/p5-smoke/05-desktop-padding-64-wider-gutters.png` | NEW | 980 KB |
| `logs/wp-030/p5-smoke/06-reset-restores-baseline.png` | NEW | 970 KB |
| `logs/wp-030/phase-5-task.md` | NEW (in stage) | task draft (Brain) |
| `logs/wp-030/phase-5-result.md` | NEW | this file |

## Issues & Workarounds

- **Chrome-devtools fullPage screenshot doesn't capture content past `<main overflow-y-auto>` boundary** (Phase 4 carry). Workaround: injected runtime CSS override via `evaluate_script` to set `html, body { height: auto; overflow: visible }` + `main { overflow: visible; flex: none }`. After override, fullPage captures the entire 3609px-tall document. The override is screenshot-tool-only — does NOT modify source files; resets on page reload.
- **Reset button hold-timer simulation** — ResetButton uses `onMouseDown` + `setInterval` 3-second hold. `dispatchEvent(new MouseEvent('mousedown'))` triggers React's synthetic onMouseDown handler reliably. Subsequent `sleep 3.5` (bash) lets the timer elapse + `onReset()` fires. Verified post-reset state matches V1 defaults via second `evaluate_script`.

## Open Questions

- **Phase 6 prep** (next-step initiation owned by Brain per `feedback_plan_approval`). Per WP-030 plan + Phase 0 §0.7 Studio side-already-activated finding + Phase 0 Ruling #4 reduction, Phase 6 reduces to:
  1. Save flow (`config-io.ts` `saveConfig()` writes to `packages/ui/src/theme/responsive-config.json` via fs)
  2. Generator output writes to `packages/ui/src/theme/tokens.responsive.css`
  3. PARITY.md cross-reference (Studio + block-forge globals.css already imports tokens.responsive.css per pre-flight finding)
  4. Live revalidate Portal (no-op since cascade is read at HTTP request time once tokens.responsive.css is committed and Vercel rebuild fires)
- **Polish queue carry-forward (post-WP-030)**:
  1. Locale-aware number formatting (current display "0,125" = en-DE comma decimal — actually browser-locale dependent; could be normalized to "0.125" en-US)
  2. Edit-multipliers toggle in GlobalScaleConfig (currently `read-only · advanced (Phase 5+)` — flip to editable when V2 spacing-multiplier-tuning surface lands)
  3. Container preview "effective max width" indicator (PF.30 informed — surfaces max(maxWidth - 2×containerPx, 0) bounded by iframe width when relevant)
  4. Auto-scale-down LivePreviewRow on narrow editor screens (PF.25 explicitly defers to V2)

## Verification Results

| # | Gate | Expected | Actual |
|---|------|----------|--------|
| 1 | Drift sanity-check | ✅ HOLD | ✅ HOLD (`contract drift: HOLD`) |
| 1.5 | PostCSS @import warning silent on dev-server boot | empty | empty ✅ |
| 2 | Typecheck | tsc exits 0 | tsc exits 0 ✅ |
| 3 | Tests pass | 11 files / ≥62 assertions / 0 fail | 11 files / 67 assertions / 0 fail ✅ |
| 4 | Snapshot regression | 22 vi entries STILL + 0 vw + 2 @media + 3 --container-max-w | 22 / 0 / 2 / 3 ✅ |
| 5 | arch-test | 537 / 0 (533 + 4 new) | 537 / 537 ✅ |
| 6 | No-hardcoded-styles audit | ContainerWidthsEditor empty; LivePreviewRow exemption documented | both clean / inside-srcdoc only flagged ✅ |
| 7 | Live UI verification | 6 screenshots + acceptance scenarios | 6 screenshots in p5-smoke/ + scenarios 02 & 04 pivoted per PF.29/30 + all visually verified ✅ |
| 8 | No fs writes | empty | empty (Phase 6 owns) ✅ |
| 9 | Manifest count | 36 (32 + 4 new) | 36 ✅ |
| 10 | Scope | only tools/responsive-tokens-editor/, manifest, logs/wp-030/ | confirmed (apps/packages/content untouched outside fast-loading-speed.json baseline drift) ✅ |
| 11 | fast-loading-speed.json side observation | same M + ?? as Phase 4 baseline | same — UNTOUCHED ✅ |
| 12 | Emoji audit | empty | empty ✅ |
| 13 | Token coverage gate | 22 fluid tokens unchanged | 22 (containers separate class) ✅ |
| 14 | Container schema + emit gate | ≥3 / 1 / ≥4 | 3 / 1 / 7 ✅ |
| 15 | ds-lint-ignore comment present | comment immediately above font-family line | confirmed at L42 (immediately preceding L43 `font-family: system-ui, sans-serif`) ✅ |

## Pre-empted findings status

| # | Status |
|---|--------|
| PE.1 cd-pattern in npm scripts | ✅ HELD (no new root scripts) |
| PE.2 install dance | ✅ HELD (no new deps) |
| PF.1 tokens.css static = §0.6 1:1 | ✅ HELD (Phase 5 doesn't touch tokens.css) |
| PF.2 `relativeTo: 'viewport'` → vi | ✅ HELD (container blocks use px / @media — no clamp involved) |
| PF.3 `--text-display` fluid-only | ✅ HELD (snapshot has 22 vi entries STILL) |
| PF.4 checkWCAG semantic contract | ✅ HELD (validate.ts unchanged) |
| PF.5 @cmsmasters/ui primitives audit | ✅ deferred AGAIN (Phase 5 no Drawer/Dialog/Slider) |
| PF.6 Slider integration dedupe/alias | ✅ deferred AGAIN |
| PF.7 Vitest jsdom per-file directive | ✅ used (both new component tests line 1) |
| PF.8 testing-library/jest-dom add | ✅ inherited (Phase 3) |
| PF.9 loadConfig() returns null | ✅ inherited (Phase 3 — App.tsx mount-once useEffect unchanged) |
| PF.10 Tailwind v4 token classes | ✅ used (verbatim) |
| PF.11 Nested-shape adoption | ✅ inherited; extended to containers spread |
| PF.12 loadConfig async cancel-flag | ✅ inherited (App.tsx unchanged) |
| PF.13 Vitest cleanup hook | ✅ inherited (covers iframe multi-render) |
| PF.14 V1 form can't trigger banner | ✅ CLOSED (Phase 4) — Phase 5 doesn't reopen |
| PF.15 @cmsmasters/ui still deferred | ✅ used |
| PF.16 --space-section special source | ✅ HELD (Phase 5 doesn't touch override mutation) |
| PF.17 Override mutation immutability | ✅ HELD (containers use spread-merge same pattern) |
| PF.18 22-token contract preserved | ✅ HELD (containers separate class; 22 vi entries STILL in updated snapshot) |
| PF.19 @768 linear interp formula | ✅ HELD (Phase 5 doesn't touch valueAtViewport) |
| PF.20 Vitest config inherited | ✅ HELD (no config changes) |
| PF.21 PostCSS @import order warning | ✅ BAKED |
| PF.22 --container-* tokens introduction | ✅ used |
| PF.23 Schema field REQUIRED | ✅ used |
| PF.24 Generator @media emit | ✅ used |
| PF.25 LivePreviewRow iframes | ✅ used |
| PF.26 srcdoc CSS exemption | ✅ used (documented inline + Key Decisions table) |
| PF.27 Vitest config carry | ✅ used |
| PF.28 lint-ds.sh skips tools/ paths | ✅ NEW — documented; ds-lint-ignore comment placed for documentary intent |
| PF.29 Type-scale dial dormant on V1 baseline | ✅ NEW — scenario 02 pivoted to per-token H1 override |
| PF.30 Tablet maxWidth above body content area = no visible effect | ✅ NEW — scenario 04 pivoted to 720→500 |

## 7 rulings + 4 escalations status

| ID | Status |
|----|--------|
| Ruling 1 conservative-defaults discipline | ✅ HELD (overrides unchanged) |
| Ruling 1.a --text-display 28-64 | ✅ HELD |
| Ruling 1.b --space-section 52-96 | ✅ HELD |
| Ruling 1.c borderline 20% cap | ✅ HELD |
| Ruling 2 fluid-typography ladder | ✅ HELD |
| Ruling 3 utopia-core authoritative | ✅ HELD |
| Ruling 4 PARITY reduction (Studio side already imports) | ✅ HELD (Phase 5 doesn't engage; Phase 6 owns) |
| Ruling 5 Phase 0 RECON load-bearing | ✅ HELD (4th consecutive phase pre-flight kept implementation drift-free) |
| Ruling 6 saved memory `feedback_visual_check_mandatory` | ✅ HELD (live UI verification ran in same session — 6 screenshots) |
| Ruling 7 saved memory `feedback_no_hardcoded_styles` | ✅ HELD (editor chrome clean; iframe srcdoc exempt per PF.26) |
| Escalation (a) spacing 6xl–10xl excluded | ✅ HELD (defaults.ts unchanged; tested) |
| Escalation (b) `--container-*` introduction | ✅ RESOLVED via Phase 5 introduction (PF.22 + PF.23 + PF.24) |
| Escalation (c) WCAG 1.4.4 strictness | ✅ HELD (validate.ts unchanged; containers WCAG-irrelevant) |
| Escalation (d) Studio side already imports tokens.responsive.css | ✅ HELD (Phase 6 owns activation) |

## Git

- Commit SHA: `23ec58f4` — `feat(wp-030): Phase 5 — Container widths editor + Live preview row [WP-030 phase 5]`
- 22 files changed / +1867 / -7
- DS-lint hook: clean (1 file checked)
- Co-author: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- WP-030 ladder: `4f487154` (P1) → `d8c5498a` (P2) → `ddec80e4` (P2.fixup) → `45a8e973` (P3) → `95d4fb35` (P3.fixup) → `4c377a33` (P4) → `a917f3b6` (P4.fixup) → `23ec58f4` (P5)

## Next steps after review

- Brain dual-gate review (code review gate + live UI review gate per task §"Brain review gate")
- On approval: commit per task §"Brain review gate" command block (15 paths staged: 2 new components + 2 new tests + 4 modified source + 1 globals.css + 1 modified snapshot + 2 modified existing tests + 1 modified manifest + 6 screenshots + this result.md + phase-5-task.md). Doc fixup follows in second commit recording the SHA.
- Phase 6 prep (Brain owns next-step initiation): Save flow + cross-surface PARITY (reduced per Phase 0 Ruling #4 to docs-only on Studio side since Studio already imports tokens.responsive.css per Phase 0 §0.7 finding).
