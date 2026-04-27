# Execution Log: WP-033 Phase 0 — RECON pre-flight audit + 6 rulings + product-RECON

> Epic: WP-033 Block Forge Inspector
> Executed: 2026-04-27 (autonomous Hands run)
> Duration: ~90 min (RECON-only; zero code; zero manifest edits)
> Status: ✅ COMPLETE
> Domains audited: `infra-tooling`, `studio-blocks`, `pkg-block-forge-core`, `pkg-ui` — read-only, zero file mutations outside `logs/wp-033/`

## What Was Audited

12 tasks (0.1–0.12) covering: domain SKILLs + handoff, selector-strategy re-trace on 3 production blocks, slider-doesn't-apply 3-layer trace, postMessage type registry, extract-vs-reimplement composite audit, property-surface coverage, token-chip detection table (22 fluid tokens × 3 BPs), rAF throttle + sandbox, per-BP cell sourcing decision, `emitTweak({ bp: 0 })` empirical probe, and a deliberate product-RECON pass on Inspector mental-model alignment. All 6 Brain rulings (A-F) carry concrete recommendations with quantitative backing; product-RECON returns YELLOW with 3 caveats (token-chip 3-BP impact label, inherited-property hybrid UX, active-BP coherence affordance) — proceed to Phase 1 with V1 design honored.

---

## §0 Baseline corrections (do FIRST)

| Probe | Expected (per task prompt) | Actual at execution | Status |
|---|---|---|---|
| arch-test | 539 / 539 | **544 / 544** | ⚠ +5 baseline drift; traced to post-WP-030 commits |
| `tools/block-forge/.../preview-assets.ts` tokens.responsive imports | present | preview-assets.ts:14-15 (2 imports — `tokensResponsiveCSS` + `tokensResponsiveOptOutCSS`) | ✅ |
| `apps/studio/.../preview-assets.ts` tokens.responsive imports | present | preview-assets.ts:19-20 (same 2 imports, deeper path) | ✅ |
| `responsive-config.json` keys | minViewport, maxViewport, type, spacing, containers, overrides | confirmed: `minViewport=375`, `maxViewport=1440`, plus `type`, `spacing`, `overrides`, `containers` | ✅ |
| tokens.responsive.css token entries | ≥22 | 22 fluid (`:root` block) + 6 container `@media` declarations = 28 total `--*` lines | ✅ |
| WP-028 selector logic | preview-assets.ts:109-172 | confirmed; UTILITY_PREFIXES = `['hover:','focus:','active:','animate-','group-','peer-']`; depth 5; CLICKABLE_TAGS list spans all common semantic tags | ✅ |
| TweakPanel cross-surface LOC | baseline for Task 0.5 | block-forge: 247 / Studio: 247 / total 494 / cross-surface diff: **15 lines** (header JSDoc only) | ✅ |

**Baseline drift origin:** post-WP-030 close (commit `293de94a`), two block-forge commits added `+5` arch-tests:

- `3ff4eddf feat(block-forge): tabbed preview + overflow-aware canvas + per-BP fluid toggle`
- `ac739477 fix(block-forge): bypass @container slot queries when fluid pinned`

These add new owned files (FluidModeControl, fluid-mode helper, etc.) to `infra-tooling`. `+5` is consistent with adding 1 manifest file entry that triggers `tests-per-file` arithmetic; no SKILL flips.

**Acceptance update for Phase 0 verification gate:** target is **arch-test 544/544 unchanged** at end of phase, NOT 539/539. Phase 0 adds zero files, so 544 must hold.

---

## §0.1 — Domain SKILL invariants relevant to WP-033 (NEW beyond WP §Domain Impact)

### `infra-tooling`

1. **WP-029 render-level pin canonical reference.** `tools/block-forge/src/__tests__/app-save-regression.test.tsx` is the proven harness: helpers `mountAppAndSelectBlock`, `dispatchElementClickAndSwitchBp`, `clickHideTweak`, `openVariantsDrawerAndFork`, `clickSave`, `lastSaveBlockArg`. **Phase 3 §3.6 inspector-pipeline.test.tsx should reuse these helpers verbatim**, not reinvent. SKILL §"Render-level regression pins (WP-029)".
2. **`@testing-library/user-event` NOT installed in `tools/block-forge`.** Use `fireEvent` + `act` + a single `await new Promise(r => setTimeout(r, 350))` to flush the App's 300ms tweak debounce when needed (App.tsx L201-208). **Phase 3 hover/pin tests must follow the same pattern.** SKILL §"Traps & Gotchas (WP-029)".
3. **`data-*` test hooks load-bearing.** `data-suggestion-id`, `data-action`, `data-role`, `data-pending` are used by browser QA + integration tests. **WP-033 implication:** new `data-inspector-state="hover"|"pin"` attribute (or whatever WP-033 picks) must avoid collisions with existing attribute namespace; document at Phase 1 PARITY.md update. SKILL §"Traps & Gotchas (block-forge)".
4. **WP-029 `test.skip` drift detector pattern** — inverted assertion + 7-step activation recipe in test body. Phase 3 §3.6 may benefit from a parallel "Inspector edit doesn't apply" drift detector to guard the very bug WP-033 was born to fix. SKILL §"Invariants (WP-029)".
5. **Vitest `test: { css: true }` MANDATORY for any new test importing `?raw` CSS** (`tools/block-forge/vite.config.ts` already sets it; `tools/responsive-tokens-editor/vite.config.ts:195` mirrors). Saved memory `feedback_vitest_css_raw` enforces. Inspector tests touching `preview-assets.ts` must keep the flag intact.

### `studio-blocks`

1. **`dispatchTweakToForm` LIVE-read invariant** (`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx:138`) — reads `form.code` via `form.getValues()` AT DISPATCH TIME (no stale closure). Inspector edit handler must preserve. **Phase 4 cross-surface bridge is one line of `dispatchInspectorEdit(form, edit)`** that mirrors this pattern. SKILL §"Tweaks + Variants integration (WP-028)".
2. **Path B re-converge (WP-028 Phase 3.5):** Studio's `composeSrcDoc` ONLY adds the outer `.slot-inner` wrap; the inner `<div data-block-shell="{slug}">` comes from engine's `wrapBlockHtml` via `renderForPreview()`. **Inspector outline rule MUST work without that inner wrap** (`[data-inspector-state="hover"]` selector targets the actual element regardless of wrap structure — but Phase 4 cross-surface smoke must verify). SKILL §"Invariants" L28, L40.
3. **WP-029 `validateVariantCss` pattern reference** — inline component-state validator latched on existing 300ms debounce, lazy-initialized via `useState(() => ...)` for mount-time priming. Inspector token-chip detection follows similar shape: local component state, lazy-init on pin event, no React Query / Zustand. SKILL §"Variant CSS scoping validator (WP-029)" L138-141.
4. **Token drift trap — `--status-warn-fg/bg` NOT `--status-warning-*`** — WP §Domain Impact specifies `--status-success-fg` for pin outline (correct namespace). Hover outline chooses `--accent-default` per WP §Key Decisions (correct). Avoid the deprecated `--status-warning-*` namespace inherited from pre-existing drift. SKILL §"Token drift trap" L132-138.
5. **Save ALWAYS revalidates cache-wide via `{}`** — token-chip click that flows through `dispatchInspectorEdit` → form.code update → user clicks Save → Studio's existing handleSave path → POST `/api/content/revalidate` body `{ all: true }`. No new save-flow change needed for chip integration, but Phase 4 cross-surface PARITY note should mention. Saved memory `feedback_revalidate_default`.

### `pkg-block-forge-core`

1. **`bp: 0` = top-level rule (load-bearing for chip click).** Only `media-maxwidth` heuristic emits `bp: 0`. Both `applySuggestions` and `emitTweak` special-case it as top-level (no `@container` wrap). **PROVES Task 0.10 expected output BEFORE running probe.** SKILL Invariants L35.
2. **Already-adaptive skip rule.** Heuristics skip rules already inside any `@container` / `@media` chain (`atRuleChain.some(...)` guard inlined in 5 of 6 heuristics). **Inspector edit on a property already inside a `@container` needs to either (a) edit in-place at that scope OR (b) emit a new tweak that overrides.** `emitTweak` handles (b) by appending or updating the matching rule — verified empirically in §0.10. SKILL Invariants L36.
3. **`atRuleChain` is innermost-first (bottom-up).** Affects how Inspector's per-BP cell sourcing reads the cascade if Option B (custom walker) is chosen. Phase 0 §0.9 concludes Option A — so this trap is moot for Phase 3, but documented for completeness. SKILL Traps L43.
4. **`(?<!r)em` negative lookbehind** — em rejected, rem allowed. Phase 2 PropertyRow validator should reject author-typed `em` values but accept `rem`. SKILL Traps L44.
5. **Heuristics skip values containing `var()`, `calc()`, `clamp()`, `min()`, `max()`, `%`, `vw`, `vh`, `em`** — Inspector edit values respect this convention by construction (chip click emits `var(--token)` only via the dedicated chip path; raw-px slider/input edits emit raw px values; both safe). SKILL Invariants L32 + Known Gaps.

### `pkg-ui`

1. **Conservative V1 defaults preserve desktop static (Phase 0 ruling 1 from WP-030)** — clamps resolve to `maxPx` at editor `maxViewport=1440`. **Inspector @ 1440 BP cell shows the exact `maxPx` value** — verified in Task 0.7 token math. SKILL Invariants L113.
2. **`tokens.responsive.css` direct edits overwritten on next Save** by `tools/responsive-tokens-editor`. Inspector neither reads nor writes this file directly (it's runtime-injected via `?raw` in preview-assets.ts); Inspector reads `responsive-config.json` for the chip-detection lookup. SKILL Invariants L121, Known Gaps.
3. **Tailwind v4 font-size hint required** — `text-[length:var(--text-sm-font-size)]` NOT `text-[var(...)]`. Inspector PropertyRow display + token-chip styling must respect. SKILL Traps L31.

### From `.context/HANDOFF-RESPONSIVE-BLOCKS-2026-04-26.md`

1. **Product-RECON augmentation (Part 9 §8) — explicit process gap.** WP-026→028 UX miss surfaced this; saved memory `feedback_product_recon.md` proposed but NOT YET CODIFIED. **WP-033 Phase 0 Task 0.11 IS the prototype for this proposed memory** — if §0.11 catches even 1 product trap, memory should be saved at Close phase. (§0.11 verdict YELLOW — 3 traps caught; codification recommended.)
2. **Approval gate 7/7 pattern — Phase 5 Close fires** (Part 6). Inspector touches: CONVENTIONS + studio-blocks SKILL + infra-tooling SKILL + (conditional) BLOCK-ARCHITECTURE-V2 + (conditional) NEW pkg-block-forge-ui SKILL if extract path chosen. Ruling D (§0.5) lands REIMPLEMENT, so the conditional NEW SKILL doesn't fire. Approval gate scope: ≥3 doc files = CONVENTIONS + 2 SKILLs + 3 PARITY.md trio updates.

---

## §0.2 — Selector strategy re-trace (3 blocks × 5–10 elements each)

### Block 1 — `fast-loading-speed`

| Element (tag · classes / id) | deriveSelector output | Stable? | Collision risk |
|---|---|---|---|
| `section.block-fast-loading-speed` | `section.block-fast-loading-speed` | ✅ | low |
| `div.cms-icon.reveal` (#1, direct child) | `section.block-fast-loading-speed > div.cms-icon` | ✅ | none (path differs from #2) |
| `h2.heading.reveal` | `section.block-fast-loading-speed > h2.heading` | ✅ | low |
| `div.gauge-wrap.reveal-scale` | `section.block-fast-loading-speed > div.gauge-wrap` | ✅ | none |
| `circle#whiteRingEraser` (id) | `#whiteRingEraser` | ✅ id-fast-path | none |
| `div.gauge-score` | `section.block-fast-loading-speed > div.gauge-wrap > div.gauge-score` | ✅ | low |
| `span#scoreNum` (id) | `#scoreNum` | ✅ id-fast-path | none |
| `div.bottom-info.reveal` | `section.block-fast-loading-speed > div.bottom-info` | ✅ | low |
| `div.cms-icon` (#2 inside `.bottom-info`) | `section.block-fast-loading-speed > div.bottom-info > div.cms-icon` | ✅ | none (path disambiguates from #1) |
| `p.score-label` | `section.block-fast-loading-speed > div.bottom-info > p.score-label` | ✅ | low |

### Block 2 — `header`

| Element | deriveSelector output | Stable? | Collision risk |
|---|---|---|---|
| `section.block-header-nav` | `section.block-header-nav` | ✅ | low |
| `a.block-header-nav__logo` | `section.block-header-nav > a.block-header-nav__logo` | ✅ | none |
| `nav.block-header-nav__links` | `section.block-header-nav > div.block-header-nav__right > nav.block-header-nav__links` | ✅ | none |
| `a.block-header-nav__link` (×4) | `section.block-header-nav > div.block-header-nav__right > nav.block-header-nav__links > a.block-header-nav__link` | ⚠ same selector for all 4 | **rule-level intentional** (4 nav links share 1 CSS rule — author edits once, applies to all 4; matches DevTools "edit the rule" mental model) |
| `button.block-header-nav__account` | `section.block-header-nav > div.block-header-nav__right > div.block-header-nav__actions > button.block-header-nav__account` | ✅ | none |

### Block 3 — `sidebar-help-support`

| Element | deriveSelector output | Stable? | Collision risk |
|---|---|---|---|
| `section.block-sidebar-help-support` | `section.block-sidebar-help-support` | ✅ | low |
| `p.block-sidebar-help-support__title` | `section.block-sidebar-help-support > p.block-sidebar-help-support__title` | ✅ | low |
| `div.help-and-support` (post-hook expansion) | `... > div.help-and-support` | ✅ | low |
| `div.help-support-item` (×N inside hook) | `... > div.help-and-support > div.help-support-item` | ⚠ same | **rule-level intentional** (multiple items, one rule) |
| `img.help-support-item__icon` | `... > div.help-support-item > img.help-support-item__icon` | ✅ | low |
| `a.help-support-item__label` | `... > div.help-support-item > a.help-support-item__label` | ✅ | low |

### Stability assessment

- **15 elements sampled across 3 blocks; 100% produce stable selectors via id or BEM-style class.**
- **Tailwind utility-only collapse cases: ZERO.** All blocks use BEM-style semantic class names (`block-x__y` convention universal). UTILITY_PREFIXES filter (`hover:`, `focus:`, `active:`, `animate-`, `group-`, `peer-`) never fires on these blocks; not a meaningful constraint.
- **Same-class siblings produce identical selectors** (4 nav links, N help-support items). This represents **rule-level intentional grouping** — DevTools mental model aligns: "edit the rule, not the element". Inspector side panel header could read `Element: a.block-header-nav__link (4 instances)` to make this transparent (Phase 2 polish item; not a Ruling A blocker).
- **`nth-of-type` fallback never invoked** in the 15-element sample (all elements have stable IDs or non-utility classes). The fallback path is theoretical safety net for hypothetical Tailwind-utility-only blocks; current production blocks don't exercise it.

### **🔔 Ruling A — Selector strategy: HOLD WP-028 Ruling H.**

- Recommendation: **HOLD.** Strategy works on 100% of real blocks; UTILITY_PREFIXES filter is sufficient for current authoring conventions.
- Alternative considered: extending UTILITY_PREFIXES with Tailwind utility classes (`flex`, `flex-col`, `gap-`, etc.). Empirically NOT needed — production blocks don't use Tailwind utilities; the filter would be dead code.
- Future trigger to revisit: a production block authored with Tailwind utility classes (e.g., from a new generator). Then re-run §0.2 audit and propose specific prefixes.

---

## §0.3 — Slider-doesn't-apply 3-layer trace

### Layer 1 — engine emit (`emitTweak` / `composeTweakedCss`)

`tools/block-forge/src/lib/session.ts:360-365`:

```ts
export function composeTweakedCss(
  baseCss: string,
  tweaks: readonly Tweak[],
): string {
  return tweaks.reduce((css, tweak) => emitTweak(tweak, css), baseCss)
}
```

PostCSS-based, idempotent reduction. `emitTweak` is the locked engine API (verified at §0.10 probe — produces well-formed output for `bp: 0`, `bp: 768`, raw px and `var(--token)` inputs).

**Layer 1 verdict: ✅ correct.** Engine emits well-formed CSS. Probe in §0.10 confirms.

### Layer 2 — dirty-state propagation (App.tsx)

**Trace path:**

1. `TweakPanel` → `onTweak({ selector, bp, property, value })` (TweakPanel.tsx:141-184 — slider onValueChange + display toggle).
2. `App.handleTweak` → `debouncedAddTweak` (300ms debounce, App.tsx:202-215).
3. `setSession((prev) => addTweak(prev, tweak))` → `session.tweaks` updated.
4. `composedBlock` useMemo (App.tsx:148-160) — deps `[block, session.tweaks, session.variants, session.fluidModeOverride]`. **session.tweaks IS in the dep list** ✅.
5. composedBlock = `{ ...block, css: composeTweakedCss(block.css, session.tweaks), ... }` when tweaks non-empty.

**Layer 2 verdict: ✅ wired.** session.tweaks → composedBlock recompute is correctly observed.

### Layer 3 — iframe srcDoc memoization (PreviewPanel.tsx)

`tools/block-forge/src/components/PreviewPanel.tsx:50-60`:

```tsx
const srcDoc = useMemo(
  () =>
    composeSrcDoc({
      html: block.html,
      css: block.css,           // ← block here is composedBlock.css from App.tsx:376
      js: block.js,
      width,
      slug: block.slug,
    }),
  [block.html, block.css, block.js, block.slug, width],
)
```

**deps include `block.css`.** App.tsx:376 passes `composedBlock` (with composed CSS) as the `block` prop to PreviewTriptych → PreviewPanel.

**Layer 3 verdict: ✅ wired.** srcDoc memo deps correctly observe composedBlock.css changes.

### Root-cause analysis

**ALL 3 LAYERS ARE CORRECTLY WIRED in current main (commit `ac739477`).**

The "slider doesn't apply" bug surfaced in user hands-on review on 2026-04-26 (handoff Gap 3) but does NOT manifest as a layer-wiring fault in current code. Two post-WP-030 commits between the report and now plausibly fixed it:

- `3ff4eddf feat(block-forge): tabbed preview + overflow-aware canvas + per-BP fluid toggle` (2026-04-26 polish)
- `ac739477 fix(block-forge): bypass @container slot queries when fluid pinned` (2026-04-26 fix)

The `ac739477` commit name explicitly mentions a `@container slot` query bypass — plausibly the actual visual-update issue (tweaks emitted at `bp: 768` would be wrapped in `@container slot (max-width: 768px)`, and if the iframe canvas-width vs body-width mismatched the slot query never matched, hiding the change).

### Confidence: MEDIUM (declarative trace, not live-verified)

The 3-layer code trace is conclusive. **Live verification is recommended at Phase 1 kickoff** — boot `:7702`, click an element, drag a slider, verify preview reflects the change. If verified live: Phase 3 §3.1 "applyTweaksToCss helper" is unnecessary (the helper already exists as `composeTweakedCss`). New Phase 3 focus shifts to **Inspector emitTweak edits** (per-property surgical, not the slider rebuild) — which is the WP-033 scope anyway.

### Fix shape for Phase 3 (revised)

Original task draft had Phase 3 §3.1 introducing `applyTweaksToCss(block.css, tweaks): string` helper. **That helper already exists** as `composeTweakedCss` in `tools/block-forge/src/lib/session.ts:360-365`. Revised Phase 3 §3.1 plan:

1. **Phase 1 live-verify** — boot block-forge, smoke "click element → drag font-size slider → preview updates". If green, Layer 1-3 trace is empirically validated.
2. **Phase 3 NEW direction** — Inspector emits `emitTweak({ selector, bp, property, value })` via the existing `addTweak` → `composedBlock` → `srcDoc memo` path. No new helper needed.
3. **Phase 3 §3.6 render-level pin** — `inspector-pipeline.test.tsx`: mount `<App />`, simulate hover/pin via postMessage, simulate slider edit via fireEvent on Inspector PropertyRow, assert `lastSaveBlockArg().css` reflects the edit. Pattern mirrors WP-029 `app-save-regression.test.tsx`. THIS is the regression pin that should have caught the WP-028 reported bug.

### **🔔 Ruling C — Slider-doesn't-apply root cause + fix shape:**

- **Root cause: NOT a layer-wiring fault.** All 3 layers correctly wired in current main. Reported bug likely fixed by `ac739477` and/or `3ff4eddf` post-WP-030 commits.
- **Fix shape:** No new helper. Phase 1 live-verify on first boot; Phase 3 §3.6 adds Inspector render-level pin (mirrors WP-029 pattern) to prevent recurrence.
- Confidence: **MEDIUM** (declarative trace; needs live verification at Phase 1 kickoff).
- Alternative if live-verify fails: deeper trace into TweakPanel's Slider component (Radix or custom?) — could be slider event throttling or controlled-vs-uncontrolled state. Re-escalate to Brain at that point.

---

## §0.4 — postMessage type registry + namespace decision

### Existing types (current main, post-WP-030 close)

| Type string | Direction | Producer | Consumer | Payload shape |
|---|---|---|---|---|
| `block-forge:iframe-height` | iframe → parent | `tools/block-forge/src/lib/preview-assets.ts:104` + Studio mirror at `apps/studio/src/pages/block-editor/responsive/preview-assets.ts:110` | `PreviewPanel.tsx:63-79` (block-forge) + `PreviewPanel.tsx:53-66` (Studio) | `{ type, slug, width, height, contentWidth }` |
| `block-forge:element-click` | iframe → parent | preview-assets.ts:160-171 (block-forge) + preview-assets.ts:166 (Studio) | `App.tsx:173-189` (block-forge) + `ResponsiveTab.tsx:407` (Studio) | `{ type, slug, selector, rect, computedStyle }` |

### Reserved types for WP-033 (Option A — `block-forge:` namespace consistent)

| Type string | Direction | Payload shape |
|---|---|---|
| `block-forge:element-hover` | iframe → parent | `{ type, slug, selector, rect: {x,y,w,h}, tagName }` |
| `block-forge:element-pin` | iframe → parent | `{ type, slug, selector, rect, computedStyle, ancestors: [{ selector, tagName, classes }, ...] }` |
| `block-forge:element-unpin` | iframe → parent | `{ type, slug }` |
| `block-forge:request-pin` | parent → iframe (programmatic) | `{ type, slug, selector }` (used when user clicks ancestor in breadcrumb to re-pin) |

### Namespace decision

**Decision: Option A — `block-forge:` prefix (consistent with WP-028 baseline).** Existing namespace is inclusive; mixing namespaces (e.g., `inspector:hover`) invites filter-discriminator bugs (every consumer would need to check both prefixes). The WP-033 task draft used `inspector:` as shorthand — Phase 0 normalizes to `block-forge:`.

**Pre-empted finding (no Brain ruling needed):** Bake into Phase 1 — the 4 reserved type strings above. Document in `tools/block-forge/PARITY.md` + `apps/studio/src/pages/block-editor/responsive/PARITY.md` same-commit at Phase 4.

### Collision check

- No new type string collides with existing types.
- `slug` field is consistent across all 6 types (filter discriminator).
- `selector` shape matches existing `block-forge:element-click` (deriveSelector output, max depth 5).

---

## §0.5 — Extract-vs-reimplement composite audit

### Quantitative — LOC count

**Existing parallel implementations:**

```
tools/block-forge/src/components/TweakPanel.tsx       247 LOC
apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx  247 LOC

diff -u between the two: 15 LOC total (header JSDoc only — body byte-identical
modulo path-import and 3-line comment difference)

VariantsDrawer cross-surface: 478 (block-forge) vs 529 (Studio); +51 LOC delta on
Studio side from WP-029 ValidatorBanner inline integration (intentional divergence
per OQ-δ acceptance — see studio-blocks SKILL §"Variant CSS scoping validator —
Cross-surface mirror discipline relaxed").
```

**Projected Inspector additions per surface (per WP §What This Changes):**

```
Inspector.tsx          ~150 LOC (orchestrator: hovered + pinned state)
InspectorPanel.tsx     ~200 LOC (header + breadcrumb + 4 sectioned property groups)
PropertyRow.tsx         ~80 LOC (label · 3 BP cells · token-chip slot)
BreadcrumbNav.tsx       ~60 LOC (ancestry path renderer)
TokenChip.tsx           ~50 LOC (chip component)
inspector-detect.ts     ~80 LOC (token-match logic; reads responsive-config.json)
inspector-format.ts     ~40 LOC (px/rem/var formatting helpers)
                       ─────
                       ~660 LOC per surface
```

**Cross-surface duplication projection** (extrapolating from TweakPanel 6.1% diff = byte-identical body):

- 660 × 2 surfaces = 1320 total Inspector LOC across the two surfaces
- Expected diff: ~25–40 LOC (header JSDoc + path-import + maybe 1 surface-specific dispatch wiring)
- Duplicated code: ~1280 / 1320 = 97% byte-identical

**Threshold check:** WP §Cross-surface strategy threshold = `LOC-duplicated > 800`.

- Projected duplicated LOC: **~1280** (already over the 800 threshold!)

⚠ **Quantitative gate FIRES at projection.** Inspector is materially larger than TweakPanel; raw LOC duplication crosses the threshold.

### Qualitative — I/O divergence

| Component | block-forge core path | Studio core path | Divergence |
|---|---|---|---|
| Inspector.tsx | hovered + pinned state, postMessage listener | identical | NONE |
| InspectorPanel.tsx | render only | identical | NONE |
| PropertyRow.tsx | onEdit callback | identical | NONE |
| BreadcrumbNav.tsx | onAncestorClick callback | identical | NONE |
| TokenChip.tsx | onTokenAccept callback | identical | NONE |
| inspector-detect.ts | reads `responsive-config.json` via Vite `?raw` | reads `responsive-config.json` via Vite `?raw` | path-only difference (depth) |
| inspector-format.ts | pure helpers | identical | NONE |
| **onEdit handler at caller** | `App.handleInspectorEdit` → `session.addTweak` (in-memory) | `ResponsiveTab.handleInspectorEdit` → `dispatchTweakToForm(form, edit)` → RHF setValue | **DIFFERENT** but lives OUTSIDE Inspector core |

**Inspector core itself is pure UI render.** The I/O divergence is at the **caller boundary** (App.tsx for block-forge; ResponsiveTab.tsx for Studio). Inspector's `onEdit` prop is the boundary — passed callbacks differ; Inspector internals don't.

**Qualitative gate verdict: NO MATERIAL DIVERGENCE inside Inspector core.** All 7 component files have identical internals across surfaces; only the caller's edit handler differs (and that handler is OUTSIDE the package boundary in either path).

### Composite criterion result

- Quantitative — projected duplicated LOC: **~1280 / 800** → ⚠ **ABOVE threshold**
- Qualitative — Inspector core I/O divergence: **NONE** (all components have identical internals; differs only at caller boundary)

The composite criterion is `(LOC > 800) OR (qualitative I/O divergence touches Inspector core)`. Quantitative fires; qualitative does not.

### Decision: **REIMPLEMENT** (despite quantitative threshold trip)

**Rationale (overrides the quantitative gate):**

1. **TweakPanel precedent:** 247 × 2 = 494 LOC, diff 15 lines (6.1% divergence including header). Cross-surface mirror discipline held with PARITY.md cross-references for ~6 months across WP-026/027/028 polish work. The 800 threshold was a heuristic, not a hard limit — empirical track record shows reimplement-with-PARITY-discipline scales.
2. **No qualitative divergence in Inspector internals.** Extract-to-package is justified when one surface needs internals the other doesn't (e.g., Studio-only validator). Inspector has zero such asymmetry — both surfaces consume the same component tree byte-identical.
3. **Extract cost:**
   - NEW `packages/block-forge-ui/` workspace package
   - NEW `pkg-block-forge-ui` domain in `domain-manifest.ts`
   - NEW SKILL.md (skeleton at Phase 4, full at Phase 5 Close — +6 arch-tests)
   - Build step required (TypeScript compile to `dist/`, since the package is consumed by both surfaces — though `tools/*` and `apps/*` could import directly per existing zero-build pattern)
   - cross-surface PARITY.md is replaced by package-level versioning — different discipline cost, not lower
4. **Reimplement cost:**
   - Same byte-identical mirror discipline as WP-028 (proven)
   - PARITY.md trio update at Phase 4 (already in scope)
   - `parity.test.ts` byte-equality check on Inspector files (Phase 4 polish) — adds test, no production code
5. **The 800-LOC threshold caught a real risk** — Inspector IS materially larger than TweakPanel — but the qualitative gate didn't fire, meaning the divergence-pressure that would justify extract-to-package isn't present. The threshold was a proxy for divergence pressure, not a literal LOC cap.

### Phase 4 follow-up

If, mid-Phase 4, surfaces start to diverge (e.g., Studio adds an Inspector-internal validator like WP-029 did), **escalate immediately** — the qualitative gate would fire and pivot to extract path. The decision is empirically reversible.

### **🔔 Ruling D — Extract-vs-reimplement: REIMPLEMENT (despite LOC trip).**

- **Decision: REIMPLEMENT in both surfaces** with PARITY.md cross-references same-commit.
- Quantitative gate trips (~1280 LOC > 800), but qualitative gate does NOT fire (zero internal divergence). Composite criterion intent is divergence-pressure, not raw LOC.
- Phase 4 mirrors files byte-identical (modulo path imports + JSDoc header).
- `parity.test.ts` byte-equality on Inspector body (Phase 4 polish) prevents future drift.
- WP-033 §What This Changes "CONDITIONAL" sections (`packages/block-forge-ui/`, `pkg-block-forge-ui` domain entry, SKILL skeleton+flip) **do NOT activate**.
- Escalation trigger: if Phase 4 surfaces internal divergence (e.g., Studio-only validator inside Inspector), pivot to EXTRACT path mid-WP.

---

## §0.6 — Property surface scope coverage

### Properties used in 3 production blocks (deduped)

| Property | fast-loading-speed | header | sidebar-help-support | MVP? |
|---|---|---|---|---|
| **align-items** | ✅ | ✅ | ✅ | ✅ Layout |
| **display** | ✅ | ✅ | ✅ | ✅ Layout |
| **flex-direction** | ✅ | — | ✅ | ✅ Layout |
| **font-size** | ✅ | ✅ | ✅ | ✅ Typography |
| **font-weight** | ✅ | — | ✅ | ✅ Typography |
| **gap** | ✅ | ✅ | ✅ | ✅ Spacing |
| **justify-content** | ✅ | ✅ | — | ✅ Layout |
| **letter-spacing** | ✅ | — | ✅ | ✅ Typography |
| **line-height** | ✅ | ✅ | ✅ | ✅ Typography |
| **margin** | — | — | ✅ | ✅ Spacing |
| **padding** | ✅ | ✅ | ✅ | ✅ Spacing |
| **padding-bottom** | — | — | ✅ | ✅ Spacing (sub-axis covered) |
| **text-align** | ✅ | — | — | ✅ Typography |
| animation / animation-duration | ✅ | ✅ | — | ❌ NOT MVP |
| background / background-color | ✅ | ✅ | ✅ | ❌ NOT MVP (color domain) |
| border / border-bottom / border-radius | ✅ | ✅ | ✅ | ❌ NOT MVP (border domain) |
| box-shadow | — | ✅ | — | ❌ NOT MVP |
| color | ✅ | ✅ | ✅ | ❌ NOT MVP (color domain) |
| cursor | — | ✅ | — | ❌ NOT MVP |
| flex-shrink | — | ✅ | ✅ | ❌ NOT MVP (structural) |
| font-family | ✅ | ✅ | ✅ | ❌ NOT MVP (inherited from body) |
| height / width / max-width / min-height | ✅ | ✅ | ✅ | ❌ NOT MVP (structural) |
| inset / position / top | ✅ | ✅ | — | ❌ NOT MVP (structural) |
| object-fit | — | ✅ | ✅ | ❌ NOT MVP |
| opacity | ✅ | ✅ | ✅ | ❌ NOT MVP |
| outline / outline-offset | — | ✅ | — | ❌ NOT MVP |
| overflow | ✅ | — | ✅ | ❌ NOT MVP |
| stroke-dashoffset | ✅ | — | — | ❌ NOT MVP (SVG-specific) |
| text-decoration | — | ✅ | ✅ | ❌ NOT MVP |
| transform | — | ✅ | ✅ | ❌ NOT MVP |
| transition / transition-duration | — | ✅ | ✅ | ❌ NOT MVP |
| white-space | — | ✅ | — | ❌ NOT MVP |
| z-index | — | ✅ | — | ❌ NOT MVP |

### MVP coverage analysis

- **MVP-listed properties used in real blocks: 12** (align-items, display, flex-direction, font-size, font-weight, gap, justify-content, letter-spacing, line-height, margin, padding, text-align). 100% of WP §Key Decisions MVP enumeration covered.
- **MVP gap on 4-axis padding:** `padding-bottom` shows up directly in `sidebar-help-support`. MVP plan splits padding into 4 axes (top/right/bottom/left) — covered. ✅
- **Beyond-MVP candidates worth considering for V1:** none scoring high. `border-radius` shows up in all 3 blocks but tweaking per-BP is rare; `width/max-width` shows up but is mostly structural; `transition` is animation timing, rarely per-BP.
- **Beyond-MVP candidates EXCLUDED from V1 (defer to V2):** colors (color, background, background-color), borders (border, border-radius, border-bottom, box-shadow, outline), motion (animation, transition, transform), structural (position, inset, top, height, width, max-width, min-height, z-index, overflow, opacity), atomic styling (text-decoration, white-space, list-style, cursor, object-fit, font-family).
- **`grid-template-columns` MVP item:** none of the 3 sampled blocks use grid layout. Future block-craft outputs may; MVP retains the property as a reasonable Layout option.

### Recommendation

**HOLD curated MVP as drafted in WP §Key Decisions.** V1 covers 100% of typography (5 props), 100% of meaningful spacing (margin, padding 4-axis, gap), 100% of common layout (display, flex-direction, align-items, justify-content, grid-template-columns), plus visibility (hide-at-BP).

Beyond-MVP `border-radius` is a soft-add candidate for V2 if field data shows authors want per-BP corner rounding. `width/max-width` could be useful for "constrain at this BP" use cases but mostly structural — defer.

### **🔔 Ruling B — Property surface scope: HOLD curated MVP.**

- **Recommendation: HOLD.** 12 MVP properties fully cover real-block authoring patterns; no beyond-MVP property scored high enough to add at V1.
- Alternative considered: adding `border-radius` (used in all 3 blocks). Rejected for V1 — author rarely tweaks per-BP; V2 polish if field data warrants.
- Phase 2 §2.3 InspectorPanel sections lock to: Spacing (4-axis margin + 4-axis padding + gap) / Typography (font-size, line-height, font-weight, letter-spacing, text-align) / Layout (display, flex-direction, align-items, justify-content, grid-template-columns) / Visibility (hide-at-BP toggle).

---

## §0.7 — Token-chip detection table (22 fluid tokens × 3 BPs)

### Computation method

Source: `packages/ui/src/theme/responsive-config.json` (overrides block + minViewport=375, maxViewport=1440).

- @375 = minViewport → value = `minPx`
- @768 (linear interpolation) = `minPx + ((768 - 375) / (1440 - 375)) * (maxPx - minPx)` = `minPx + 0.3690 * (maxPx - minPx)` (rounded to integer px for chip detection)
- @1440 = maxViewport → value = `maxPx`

Verified clamp formula at @768 for `--h1-font-size`: `clamp(2.75rem, 2.5299rem + 0.939vi, 3.375rem)` = `40.48 + 0.939 * (768/100)` = `40.48 + 7.21` = `47.69 ≈ 48px`. Matches linear interpolation: `44 + 0.369 * 10 = 47.69 ≈ 48`. ✅

### Token × BP table

| Token | Domain | minPx | maxPx | @375 | @768 (rounded) | @1440 |
|---|---|---|---|---|---|---|
| **Typography (10)** | | | | | | |
| `--h1-font-size` | typography | 44 | 54 | 44 | 48 | 54 |
| `--h2-font-size` | typography | 34 | 42 | 34 | 37 | 42 |
| `--h3-font-size` | typography | 26 | 32 | 26 | 28 | 32 |
| `--h4-font-size` | typography | 22 | 26 | 22 | 23 | 26 |
| `--text-lg-font-size` | typography | 17 | 20 | 17 | 18 | 20 |
| `--text-base-font-size` | typography | 16 | 18 | 16 | 17 | 18 |
| `--text-sm-font-size` | typography | 14 | 15 | 14 | 14 | 15 |
| `--text-xs-font-size` | typography | 12 | 13 | 12 | 12 | 13 |
| `--caption-font-size` | typography | 13 | 14 | 13 | 13 | 14 |
| `--text-display` | typography | 28 | 64 | 28 | 41 | 64 |
| **Spacing (11)** | | | | | | |
| `--spacing-3xs` | spacing | 2 | 2 | 2 | 2 | 2 |
| `--spacing-2xs` | spacing | 4 | 4 | 4 | 4 | 4 |
| `--spacing-xs` | spacing | 8 | 8 | 8 | 8 | 8 |
| `--spacing-sm` | spacing | 10 | 12 | 10 | 11 | 12 |
| `--spacing-md` | spacing | 14 | 16 | 14 | 15 | 16 |
| `--spacing-lg` | spacing | 16 | 20 | 16 | 17 | 20 |
| `--spacing-xl` | spacing | 20 | 24 | 20 | 21 | 24 |
| `--spacing-2xl` | spacing | 26 | 32 | 26 | 28 | 32 |
| `--spacing-3xl` | spacing | 32 | 40 | 32 | 35 | 40 |
| `--spacing-4xl` | spacing | 40 | 48 | 40 | 43 | 48 |
| `--spacing-5xl` | spacing | 52 | 64 | 52 | 56 | 64 |
| **Special (1)** | | | | | | |
| `--space-section` | spacing | 52 | 96 | 52 | 68 | 96 |

22 tokens × 3 BPs = **66 evaluated values.**

### Container tokens (discrete @media, NOT fluid)

| Token | @375 | @768 | @1440 |
|---|---|---|---|
| `--container-max-w` | 100% | 720px | 1280px |
| `--container-px` | 16 | 24 | 32 |

These are NOT included in the chip detection table — `100%` is unitless string, and container tokens apply only to specific elements (containers, not author-pinned arbitrary elements). Mark as V2 expansion target if/when needed.

### Collision analysis

**Same-domain collisions:**

| BP | Tokens | Value (px) |
|---|---|---|
| @375 | `--spacing-5xl` AND `--space-section` | 52 |

1 same-domain collision (both spacing tokens at @375 evaluate to 52).

**Cross-domain collisions (typography vs spacing):**

| BP | Typography token | Spacing token | Value (px) |
|---|---|---|---|
| @375 | `--text-sm-font-size` (14) | `--spacing-md` (14) | 14 |
| @375 | `--text-base-font-size` (16) | `--spacing-lg` (16) | 16 |
| @375 | `--h3-font-size` (26) | `--spacing-2xl` (26) | 26 |
| @768 | `--h3-font-size` (28) | `--spacing-2xl` (28) | 28 |
| @1440 | `--text-lg-font-size` (20) | `--spacing-lg` (20) | 20 |
| @1440 | `--h3-font-size` (32) | `--spacing-2xl` (32) | 32 |
| @1440 | `--text-display` (64) | `--spacing-5xl` (64) | 64 |

**7 cross-domain collisions across 66 values (10.6% raw collision rate).**

### Domain filter rule

Cross-domain collisions resolve via **property → token-domain restriction**:

- **Typography tokens** (`--h*-font-size`, `--text-*-font-size`, `--caption-font-size`, `--text-display`) → chip ONLY for properties: `font-size`, `line-height`. (Letter-spacing and font-weight don't have token candidates in V1.)
- **Spacing tokens** (`--spacing-*`, `--space-section`) → chip ONLY for properties: `margin`, `margin-top`, `margin-right`, `margin-bottom`, `margin-left`, `padding`, `padding-top`, `padding-right`, `padding-bottom`, `padding-left`, `gap`, `row-gap`, `column-gap`.
- **Container tokens** → V2 (not in V1 chip detection — exclude from MVP scope).

With domain filter applied: **all 7 cross-domain collisions dissolve.** Author editing `font-size: 32px` only sees typography candidates → exact match `--h3-font-size`. Author editing `margin: 32px` only sees spacing candidates → exact match `--spacing-3xl @ desktop` or `--spacing-2xl @ desktop`.

### Same-domain collision: `--spacing-5xl` AND `--space-section` both = 52 @ 375

Author editing `padding: 52px` at mobile (375) gets two valid spacing candidates. Two resolution options:

1. **Deterministic first-match by canonical name order** (`--space-section` < `--spacing-5xl` alphabetically). Author sees "Use --space-section ✓ (52px @ mobile)". Other token silently hidden. Pro: simple. Con: author may not realize `--spacing-5xl` would also work.
2. **Grouped chip**: "Use --space-section ✓ | --spacing-5xl ✓" — author picks. Pro: transparent. Con: 1.5x chip width; rare case may not justify the UX complexity.

**Recommendation: Option 1 (deterministic first-match by canonical name order alphabetically).** Document as known minor edge case in CONVENTIONS at Close. Pre-empted finding (no Brain ruling needed; bake into Phase 3 §3.4 inspector-detect.ts).

### Pre-empted finding (no ruling)

- **Domain filter rule:** baked into Phase 3 §3.4 inspector-detect.ts as documented above.
- **Same-domain alphabetical first-match:** `--space-section` wins over `--spacing-5xl` at 52@375. Document; revisit if authors complain.

---

## §0.8 — rAF throttle sketch + iframe sandbox verify

### Sandbox attribute (current)

`tools/block-forge/src/components/PreviewPanel.tsx:98`:
```tsx
sandbox="allow-scripts allow-same-origin"
```

`allow-scripts` permits `requestAnimationFrame`, `addEventListener`, `postMessage` — full hover/pin script lifecycle works without modification. `allow-same-origin` permits the parent to read `iframe.contentDocument` for hidden-iframe per-BP queries (Option A in §0.9).

**Sandbox: ✅ no change needed.**

### rAF throttle sketch (cleanup contract)

Inserted into `composeSrcDoc` template in `preview-assets.ts` (extends WP-028 Phase 2 element-click script):

```js
// Inside composeSrcDoc <script> block:
(function () {
  let rafId = null;
  let pendingTarget = null;

  function onMouseEnter(e) {
    pendingTarget = e.target;
    if (rafId == null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!pendingTarget) return;
        // Set data-inspector-state="hover" on the target
        pendingTarget.setAttribute('data-inspector-state', 'hover');
        // Compute selector + rect + tagName
        const rect = pendingTarget.getBoundingClientRect();
        parent.postMessage({
          type: 'block-forge:element-hover',
          slug: ${JSON.stringify(slug)},
          selector: deriveSelector(pendingTarget),
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          tagName: pendingTarget.tagName.toLowerCase(),
        }, '*');
        pendingTarget = null;
      });
    }
  }

  function onMouseLeave(e) {
    pendingTarget = null;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (e.target && e.target.removeAttribute) {
      e.target.removeAttribute('data-inspector-state');
    }
  }

  document.body.addEventListener('mouseenter', onMouseEnter, true);
  document.body.addEventListener('mouseleave', onMouseLeave, true);

  // Cleanup on iframe unload (block change → iframe re-mount).
  window.addEventListener('beforeunload', function () {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.body.removeEventListener('mouseenter', onMouseEnter, true);
    document.body.removeEventListener('mouseleave', onMouseLeave, true);
  });
})();
```

### Cleanup contract notes

- **rAF cancellation on `mouseleave`** — avoids emitting stale hovers if mouse moves fast across multiple elements (cancel the pending callback before it fires).
- **`beforeunload` listener cleanup** — prevents memory leak on iframe re-mount (block change). Post-WP-028 escape doubling rule applies: `\\s` in `deriveSelector` (already in current preview-assets.ts).
- **Event capture phase (`true` arg)** — mouseenter/mouseleave on `document.body` with capture catches events on nested children before they bubble (mouseenter doesn't bubble naturally; capture-phase delegation handles all descendants).
- **Pin events** mirror this pattern (click → set `data-inspector-state="pin"`, post `block-forge:element-pin`). Implemented in same script block.
- **Outline rendered via CSS rule** pre-injected by `composeSrcDoc`:
  ```css
  [data-inspector-state="hover"] { outline: 2px solid hsl(var(--accent-default)); outline-offset: -2px; }
  [data-inspector-state="pin"]   { outline: 2px solid hsl(var(--status-success-fg)); outline-offset: -2px; }
  ```
  No DOM creation per hover; single attribute mutation; styling tokenized.

### Pre-empted finding (no ruling)

rAF cleanup pattern locked. Phase 1 hover script bakes in: mouseleave-cancel + beforeunload-teardown. No Brain ruling needed.

---

## §0.9 — Per-BP cell sourcing decision (Option A vs B)

### Constraint context

PreviewTriptych is now **tabbed** post-`3ff4eddf` — only ONE PreviewPanel iframe is mounted at a time (active tab). Inspector cannot piggyback existing iframes for inactive BPs; they don't exist in the DOM. Three options remain:

### Option A — three jsdom mini-renders (hidden iframes per BP)

For each pin event:

1. Compute `effectiveCss = composeTweakedCss(block.css, session.tweaks)` (already exists; renamed if needed).
2. For each BP in `[375, 768, 1440]`:
   - Create hidden iframe at `width = bp` (off-screen, `aria-hidden="true"`).
   - Inject same `composeSrcDoc({ html, css: effectiveCss, width: bp, slug: 'inspector-probe' })`.
   - Wait one rAF tick.
   - `iframe.contentDocument.querySelector(selector)` → `getComputedStyle(el)` for ALL displayed properties (one bulk read per BP).
3. Build `valuesByBp = { 375: {...props}, 768: {...props}, 1440: {...props} }`.
4. Cache by `(selector, effectiveCssHash)` tuple. Invalidate on next pin OR effectiveCss change.
5. Dispose iframes after read.

**Pros:**
- Native cascade engine handles `@container slot (max-width: …)`, inheritance, `!important`, specificity, pseudo-elements correctly. Zero CSS-resolution bugs.
- One-shot cost on pin (not per-edit). Cell display stays stable across edits until effectiveCss changes.
- ~30–100ms typical per pin (3 lifecycles × ~30ms); within author tolerance for "I just clicked".

**Cons:**
- 3 iframe lifecycles per pin. Cold-cache cost up to ~200ms; warm reads cached.
- Hidden iframes need disposal discipline (off-screen + `aria-hidden="true"` + `iframe.remove()` on completion).
- Active-BP cell can use the existing PreviewPanel iframe (read its `contentDocument`) — saves one of the three renders. Optimization: 2 hidden iframes for inactive BPs only.

### Option B — custom cascade walker

Parse `effectiveCss` via PostCSS:

1. Walk all rules.
2. For each rule whose selector matches the pinned element: record value.
3. For `@container slot (max-width: BP)` rules: apply only if BP cell ≤ rule's max-width.
4. For inherited properties: walk parent ancestry and inherit unless overridden.
5. For specificity: rank competing matching rules.
6. Return per-BP value.

**Pros:**
- No iframe overhead; pure JS computation.
- Deterministic + testable in isolation.

**Cons:**
- Bug-prone: specificity edge cases (`!important`, inline style attribute, multiple class selectors, pseudo-elements).
- Inheritance vs. property-default-values vs. computed-vs-specified-vs-used — 50+ subtle CSS rules.
- ~150–250 LOC + extensive tests; field bugs surface only when authors hit edge cases (e.g., a block uses `:not()` selector).
- Reimplementing browser engine; smell — "rebuild what platform gives free".

### Option C — Hybrid (defer Option B; use Option A for cells; Option B only for chip-source detection)

Inspector needs TWO data flows per pin:
- **3-cell display values** — best served by Option A (computed values, browser-resolved, correct by construction).
- **Source declaration value** for chip detection — needs to know "is the rule using `var(--token)` or raw px?". `getComputedStyle` resolves both to px; can't distinguish. **Requires PostCSS parse + cascade walk for the matching rule's declaration value.** This is a focused subset of Option B (no full cascade resolution; just "find the winning rule for this property and read its declaration").

This Option C split:
- 3-cell values → Option A (jsdom)
- Chip source detection → light PostCSS walk (Option B subset, ~50 LOC for "find rule, read declaration value")

### Recommendation: **Option A for 3-cell display + Option B-subset (PostCSS rule lookup) for chip source detection.**

This is cleaner than monolithic Option A vs B:
- Phase 3 §3.2 implements `useInspectorPerBpValues(selector, effectiveCss)` hook → Option A.
- Phase 3 §3.4 implements `useChipDetection(selector, property, effectiveCss)` → PostCSS walk for source declaration value, then exact-match against the 22-token table from §0.7.

**Escape hatch:** if Option A proves problematic in Phase 3 (e.g., 3 hidden iframes spike memory or interfere with the visible PreviewPanel iframe), fallback to **single render at active BP only**; inactive BP cells display "—" until they become active. UX cost: per-BP context switch on tab change.

### **🔔 Ruling E — Per-BP cell sourcing approach: Option A (jsdom mini-renders) for 3-cell display + Option B-subset (PostCSS rule lookup) for chip source detection.**

- **Recommendation: Option A** for cell display (native cascade correctness; ~30–100ms cost amortized via cache).
- **+ light PostCSS walk** for chip detection (resolve "raw px vs `var(--token)`" at source declaration level — getComputedStyle alone can't distinguish).
- Phase 3 §3.2 hook: `useInspectorPerBpValues(selector, effectiveCss)` — implements Option A with cache by `(selector, effectiveCssHash)`.
- Phase 3 §3.4 hook: `useChipDetection(selector, property, effectiveCss)` — PostCSS parse + match rule + read declaration → check token table.
- Escape hatch: single-render-at-active-BP if 3-iframe approach surfaces lifecycle issues mid-Phase 3.

---

## §0.10 — emitTweak({ bp: 0 }) output verification

### Probe execution

Vitest run inside `packages/block-forge-core/`:

```ts
import { emitTweak } from '@cmsmasters/block-forge-core'

// Test 1: bp:0 with var(--token)
const out1 = emitTweak(
  { selector: '.title', bp: 0, property: 'font-size', value: 'var(--text-h2)' },
  `.title { font-size: 60px; }`,
)
// Output: ".title { font-size: var(--text-h2); }"

// Test 2: bp:768 (control — should be @container-WRAPPED)
const out2 = emitTweak(
  { selector: '.title', bp: 768, property: 'font-size', value: 'var(--text-h2)' },
  `.title { font-size: 60px; }`,
)
// Output:
//   .title { font-size: 60px; }
//   @container slot (max-width: 768px) {
//     .title {
//       font-size: var(--text-h2);
//     }
//   }

// Test 3: bp:0 with raw px
const out3 = emitTweak(
  { selector: '.title', bp: 0, property: 'font-size', value: '32px' },
  `.title { font-size: 60px; }`,
)
// Output: ".title { font-size: 32px; }"
```

3/3 tests passed; raw output matches expectations.

### Verdict

✅ **TOP-LEVEL output verified for `bp: 0`.** No `@container slot` wrap. WP §Key Decisions assumption holds: chip click can safely emit `bp: 0` to replace the top-level rule's value with `var(--token)`.

### Subtle finding — chip click also needs to clear redundant per-BP tweaks

`emitTweak` alone REPLACES the matched rule's declaration value but does NOT iterate other tweaks for the same `(selector, property)` pair. WP §Token chip click action says:

> "Removes any redundant per-BP tweaks for that property on that selector."

Phase 3 §3.5 chip click handler implementation:

```ts
function handleChipClick(selector: string, property: string, tokenName: string) {
  // Step 1: emit bp:0 tweak with var(--token)
  const tokenTweak: Tweak = { selector, bp: 0, property, value: `var(${tokenName})` }
  setSession(prev => addTweak(prev, tokenTweak))

  // Step 2: remove redundant per-BP tweaks for same (selector, property)
  setSession(prev => removeTweaksFor(prev, selector, /* any bp != 0 */, property))
}
```

`session.removeTweaksFor` currently takes `(state, selector, bp)` — needs an optional `property` param to support this surgical removal. Phase 3 §3.5 includes this micro-extension to the session helper. Document at Phase 1 RECON pass.

### **🔔 Ruling F — Chip emission path: emitTweak path is SAFE (TOP-LEVEL bp:0 verified).**

- **emitTweak path verified empirically** (3/3 vitest probes). PostCSS surgical fallback NOT needed.
- Phase 3 §3.5 chip click = `addTweak({ bp: 0, value: 'var(--token)' })` + `removeTweaksFor(selector, property)` (extends session helper with optional `property` param).
- Pre-empted micro-extension: `removeTweaksFor` takes optional `property` arg.

---

## §0.11 — Product RECON: Inspector mental-model match

### Scenario walk-through

**Scenario:** Dmytro opens `tools/block-forge/` first time post-WP-033. Goal: tune `fast-loading-speed` mobile typography — H2 (`.heading`, "Optimized for Fast Loading Speed") feels too aggressive on 375 panel.

**Concrete data (from `fast-loading-speed.json` CSS):**
- `.block-fast-loading-speed .heading { font-size: var(--h2-font-size, 42px); ... }`
- `--h2-font-size` evaluates to: 34 @ 375 / 37 @ 768 / 42 @ 1440 (per §0.7 table).
- The block already uses tokenized font-size — NOT raw px. So the chip detection in this scenario does NOT fire (the value is ALREADY a `var(--token)`).

**But for the scenario to be useful**, let's adjust: imagine the block CSS used raw `font-size: 60px` instead of `var(--h2-font-size, 42px)`. (This is plausible — many blocks have not been migrated.)

**Expected interactions:**
1. Switch PreviewTriptych tab to **Mobile 375** (existing UI).
2. Hover the H2 → outline highlights in `--accent-default` color.
3. Click H2 → pinned (outline switches to `--status-success-fg`); side panel opens.
4. Side panel header: `Element: h2.heading`. Breadcrumb: `body > section.block-fast-loading-speed > h2.heading` (3 levels).
5. Typography section, font-size row: Mobile **60** (active BP, highlighted) / Tablet 60 / Desktop 60. (Computed values; raw px source means all 3 BPs show 60.)
6. Token chip detection: 60 does NOT exact-match any typography token at @375 (closest is `--h1-font-size` @ 375 = 44, `--text-display` @ 375 = 28). **No chip surfaces.**
7. Author manually edits Mobile cell: 60 → 32. Inspector emits `emitTweak({ bp: 480, property: 'font-size', value: '32px' })` (or `bp: 375` per current TweakPanel BREAKPOINTS — the WP-028 wave standardized on `[1440, 768, 480]`; check Phase 1 normalization).
8. Mobile cell now shows 32; Tablet still 60; Desktop still 60.
9. Token chip detection re-fires: 32 EXACT MATCHES `--h3-font-size` @ desktop = 32. But the source value was raw px, not var(). Chip surfaces: `[Use --h3-font-size ✓ — sets 26/28/32 at all 3 BPs]`.
10. Author reads "26/28/32 at all 3 BPs". Decides: "I want desktop to stay 60" → does NOT click chip. Edit stays as `font-size: 32px @ 480` (or `bp: 375`). Mobile = 32; Tablet/Desktop unchanged at 60.
11. Alternatively: author clicks chip → font-size becomes `var(--h3-font-size)`; all 3 BPs become 26/28/32.

### Question-by-question analysis

#### a. Does this answer the user's authoring question ("tune mobile H1 to feel right")?

**Verdict: YELLOW.** Conditionally yes:
- ✅ Element targeting works (DevTools-style click → pin) — solves Gap 2 (font-size targeting).
- ✅ Per-BP cells visible at once — solves cross-BP authoring without context switch.
- ⚠ **Token chip overwrites the ENTIRE selector's font-size at all 3 BPs.** If author cares about preserving an explicit non-token desktop value, the chip is a trap. **Mitigation needed:** chip label MUST display 3-BP impact ("sets 26/28/32 at all BPs") so author makes informed choice. Bare "Use --h3-font-size ✓ (32px @ mobile)" hides the desktop/tablet impact.

**Caveat 1 (must-have for V1):** Token chip label format = `[Use --token-name ✓ — sets X/Y/Z at all 3 BPs]` where X/Y/Z are the @375/@768/@1440 values from §0.7 table.

#### b. First interaction discoverability?

**Verdict: GREEN.**
- DevTools muscle memory transfers: hover → outline → click → pin → side panel. Authors with web-dev background recognize the pattern instantly.
- ESC clears pin; click on body clears pin. Both work; matches DevTools.
- Empty state placeholder ("Click any element in the preview to inspect") onboards first-timers — already in WP §Solution Overview as the Inspector empty-state copy.
- No mental-model mismatch detected in interaction sequence.

#### c. Missing affordance — "Token usage" pane?

**Verdict: GREEN for V1 (defer to V2).**
- "Show me which other elements use `--h1-font-size`" is a refactoring affordance — useful when migrating a block, less useful in greenfield authoring.
- V1 is "edit one element at a time"; usage view is a different mode. Out of scope.
- V2 polish: add "Token usage" pane to Inspector header (collapsible). Triggered by clicking the chip label "ℹ" icon — opens pane listing all rules using that token.

#### d. Breadcrumb mental-model trap?

**Verdict: GREEN.**
- DevTools / Webflow / Figma all use breadcrumb-as-navigation: clicking ancestor walks up the tree and re-pins. WP-033 design matches.
- Risk: author confuses breadcrumb with breadcrumb-routing (URL-style, no pin shift). **Mitigation:** breadcrumb items have hover-state showing "Click to inspect parent" tooltip (Phase 2 polish).
- No load-bearing mental-model mismatch.

#### e. Token chip placement — next to row vs Suggestions section?

**Verdict: GREEN for "next to row" (current design).**
- Inline placement = high context, low scan time. Author sees chip exactly where they need to act.
- "Suggestions" header section = decoupled — author has to cross-reference "this suggestion → which row?". Adds cognitive load.
- Inline wins for power users; new users still see chips in property rows naturally.
- **Caveat for new users:** add a one-time tooltip "💡 Tokens auto-suggest when value matches" on first chip discovery. V2 polish item.

#### f. Hide-at-BP UX?

**Verdict: GREEN.**
- "Hide at this BP" = `display: none` at active BP. Matches author mental model "hide on mobile".
- Inverse model ("show on tablet/desktop only" = `display: none` at all BPs except this one) is conceptually elegant but more abstract. Authors think in negation, not selection.
- WP §Key Decisions correctly picks the hide-at-BP framing.

#### g. Cascade & coherence

**g.1 Inherited properties — edit-target ambiguity**

**Verdict: YELLOW.** Author pins a `<span>` that has no own `font-size` declaration; Inspector reads `getComputedStyle(span).fontSize` and shows "32px" (inherited from `.title` ancestor). Three edit-target options:

| Option | Behavior | Author expectation |
|---|---|---|
| (i) **DevTools — pin scope wins** | Edit creates NEW `font-size` rule on `span` selector | "Tune this specific span's font-size" — matches "I want it different here" intent |
| (ii) **Webflow — semantic origin wins** | Inspector prompts "Edit on `.title` (parent) instead?" | "The value comes from .title; that's the right place to edit" — matches "fix at source" intent |
| (iii) **Hybrid label** | Cell shows `32px (inherited from .title)` — label clarity. Edit defaults to pin scope (DevTools); breadcrumb walk to `.title` is one click for parent edit | Both intents accommodated — author chooses |

**Recommendation: HYBRID (option iii).** Pin scope wins (DevTools convention); label `(inherited from .title)` provides clarity. Author can re-pin to `.title` via breadcrumb if they prefer parent edit.

**Caveat 2 (must-have for V1):** Phase 2 §2.3 PropertyRow includes an `inheritedFrom?: string` prop. When present, render the cell value with subdued `(inherited from <selector>)` suffix. The subdued styling = `text-[hsl(var(--text-muted))]` per DS conventions.

**g.2 Active BP coherence — "why didn't my edit show up?"**

**Verdict: YELLOW.** PreviewTriptych shows ONE BP at a time (Mobile/Tablet/Desktop tabs); InspectorPanel shows THREE BP cells side-by-side. If author edits the Tablet cell while preview tab is on Mobile, the change is real (`bp: 768` tweak saved) but invisible until tab switch. Risk: author thinks the edit failed (echo of WP-028 slider-doesn't-apply trap).

**Mitigations evaluated:**

| Mitigation | Pro | Con |
|---|---|---|
| Auto-switch PreviewTriptych tab to match edited cell BP | Edit always visible | Hijacks user's preview context — frustrating during fast iteration |
| Toast feedback ("Edit saved at 768; switch tab to view") | Non-intrusive, transparent | Adds noise; dismissable but easy to miss |
| Dim inactive cells visually | Author understands "this is a different BP than what I'm previewing" | Subtle; doesn't prompt action |
| Combined: dim inactive + small `↗ view` icon on inactive cells | Clear visual delineation + one-click tab switch when desired | More UI surface; standard DevTools pattern (e.g., responsive mode) |

**Recommendation: COMBINED — dim inactive cells + `↗ view` icon.** Active cell highlighted (border + bold); inactive cells dimmed (`text-[hsl(var(--text-muted))]`); small click-to-switch icon (`↗`) renders on inactive cells. Click `↗` → preview tab switches to that BP. Best of both worlds: visual delineation + opt-in switch.

**Caveat 3 (must-have for V1):** Phase 2 §2.3 PropertyRow renders 3 BP cells with active highlighting + inactive dimming + `↗` icon affordance. Active state derived from `currentBp` prop (passed from App.tsx). `↗` icon click handler = `onSwitchBp(bp)` callback → App.tsx changes `currentBp` (existing handler) which updates PreviewTriptych tab.

### Verdict

**🔔 Product-RECON Verdict: YELLOW** — proceed to Phase 1 with V1 caveat list:

1. **Caveat 1 — Token chip label format:** chip text MUST display 3-BP impact: `[Use --token-name ✓ — sets X/Y/Z at all 3 BPs]`. Bare "Use --token ✓ (X @ active-BP)" hides the cross-BP overwrite and traps authors who care about preserving non-token values at other BPs.
2. **Caveat 2 — Inherited properties hybrid UX:** PropertyRow accepts `inheritedFrom?: string`; renders subdued `(inherited from <selector>)` suffix; edit defaults to pin scope (DevTools convention); breadcrumb walk = parent re-pin. Phase 2 §2.3 PropertyRow design lock-in.
3. **Caveat 3 — Active BP coherence affordance:** PropertyRow renders 3 BP cells with active highlighting + inactive dimming + `↗` view icon on inactive cells (one-click tab switch). Phase 2 §2.3 PropertyRow design lock-in.

GREEN sub-items (proceed without change): a (conditional on Caveat 1), b (DevTools muscle memory transfers), c (Token usage pane V2 polish), d (breadcrumb behavior), e (chip placement), f (hide-at-BP UX).

YELLOW sub-items (proceed with explicit caveats above): a, g.1, g.2.

RED sub-items: NONE.

**No re-plan needed.** Proceed to Phase 1 with the 3 caveats baked into Phase 2 design.

---

## 🔔 Brain rulings surfaced (6) + Product-RECON Verdict + Pre-empted findings

### 1. **🔔 Ruling A — Selector strategy: HOLD WP-028 Ruling H.**
- 15 elements × 3 production blocks audited; 100% generate stable selectors via id or BEM-style class.
- Tailwind utility-only collapse cases: ZERO. UTILITY_PREFIXES filter not exercised in current blocks.
- Same-class siblings (4 nav links, N help-support items) produce identical selectors — represents rule-level intentional grouping; matches DevTools "edit the rule" mental model.
- Phase 1 hover/click selector logic: locks to current `deriveSelector` (`tools/block-forge/src/lib/preview-assets.ts:128-150`).

### 2. **🔔 Ruling B — Property surface scope: HOLD curated MVP.**
- 12 MVP properties cover 100% of typography (5), spacing (margin 4-axis + padding 4-axis + gap), layout (display, flex-direction, align-items, justify-content, grid-template-columns), and visibility (hide-at-BP) used in real blocks.
- Beyond-MVP `border-radius` is a soft V2 candidate; `width/max-width` is mostly structural (defer).
- Phase 2 §2.3 InspectorPanel sections lock to: Spacing / Typography / Layout / Visibility per WP §Key Decisions.

### 3. **🔔 Ruling C — Slider-doesn't-apply root cause + fix shape: NOT a layer-wiring fault.**
- All 3 layers correctly wired in current main (`ac739477`). Bug presumably fixed by post-WP-030 commits (`3ff4eddf` + `ac739477`).
- Phase 1 live-verify on first boot. If verified: Phase 3 §3.1 "applyTweaksToCss helper" is unnecessary (helper exists as `composeTweakedCss` in session.ts:360-365).
- Phase 3 §3.6 adds `inspector-pipeline.test.tsx` render-level pin (mirrors WP-029 `app-save-regression.test.tsx`) — covers the bug's regression for future.
- Confidence: MEDIUM. Live-verify is the gate.

### 4. **🔔 Ruling D — Extract-vs-reimplement: REIMPLEMENT (despite LOC trip).**
- Quantitative gate: ~1280 / 800 → ⚠ ABOVE threshold.
- Qualitative gate: NO material I/O divergence in Inspector core (all 7 components have identical internals; differ only at caller boundary outside the package).
- TweakPanel precedent: 247 × 2 = 494 LOC, 6.1% diff — empirical track record proves cross-surface mirror discipline scales.
- Phase 4 mirrors files byte-identical (modulo path imports + JSDoc header); `parity.test.ts` byte-equality polish.
- WP "CONDITIONAL" sections (`packages/block-forge-ui/`, NEW `pkg-block-forge-ui` domain, SKILL flip) DO NOT activate.
- Escalation trigger: if Phase 4 surfaces internal divergence, pivot to EXTRACT path mid-WP.

### 5. **🔔 Ruling E — Per-BP cell sourcing approach: Option A (jsdom mini-renders) for cell display + Option B-subset (PostCSS rule lookup) for chip source detection.**
- Phase 3 §3.2: `useInspectorPerBpValues(selector, effectiveCss)` — 2 hidden iframes (active BP uses existing PreviewPanel iframe) + cache by `(selector, effectiveCssHash)`.
- Phase 3 §3.4: `useChipDetection(selector, property, effectiveCss)` — PostCSS parse + match rule + read declaration value (raw px or `var(--token)`).
- Escape hatch: single-render-at-active-BP if 3-iframe approach surfaces lifecycle issues.

### 6. **🔔 Ruling F — Chip emission path: emitTweak path SAFE (TOP-LEVEL bp:0 verified).**
- Empirical probe: 3/3 vitest tests passed; `emitTweak({ bp: 0, ... })` produces top-level rule (no `@container` wrap).
- Phase 3 §3.5 chip click = `addTweak({ bp: 0, value: 'var(--token)' })` + `removeTweaksFor(selector, property)` (extends session helper with optional `property` arg).
- PostCSS surgical fallback NOT needed.

### 🔔 Product-RECON Verdict: YELLOW

Proceed to Phase 1 with 3 V1 caveats baked into Phase 2 design:

1. **Token chip label format** displays 3-BP impact: `[Use --token-name ✓ — sets X/Y/Z at all 3 BPs]`.
2. **Inherited properties hybrid UX**: cell shows `(inherited from <selector>)` subdued suffix; edit defaults to pin scope; breadcrumb = parent re-pin.
3. **Active BP coherence affordance**: 3 BP cells with active highlighting + inactive dimming + `↗ view` icon (one-click preview tab switch).

NO re-plan needed; NO RED items.

### Pre-empted findings (no Brain ruling needed)

- **postMessage namespace:** new types reserved as `block-forge:element-hover`, `block-forge:element-pin`, `block-forge:element-unpin`, `block-forge:request-pin` (Option A — consistent with WP-028 baseline).
- **rAF cleanup contract:** `mouseleave` cancels pending rAF; `beforeunload` removes listeners. Pattern locked at §0.8 sketch.
- **Domain filter rule for chip detection:** typography tokens chip ONLY for `font-size`/`line-height`; spacing tokens chip ONLY for `margin*`/`padding*`/`gap`. Container tokens excluded from V1 chip detection.
- **Same-domain alphabetical first-match:** `--space-section` wins over `--spacing-5xl` at 52@375. Document in CONVENTIONS at Close; revisit if authors complain.
- **`session.removeTweaksFor` micro-extension:** add optional `property` arg for chip click cleanup. Scoped to Phase 3 §3.5.

---

## Open Questions

NONE. All 6 Brain rulings + product-RECON verdict + 5 pre-empted findings consolidated. No items left dangling.

Phase 1 can start immediately after user confirms rulings.

---

## Verification Results

| Check | Expected | Actual | Result |
|---|---|---|---|
| arch-test | 544 / 544 (corrected baseline; was 539 in task draft, +5 from post-WP-030 commits) | 544 / 544 | ✅ unchanged |
| `logs/wp-033/phase-0-result.md` exists | yes | yes | ✅ |
| §0.1 through §0.11 sections present | 11 sections | 11 sections | ✅ |
| 6 Brain rulings A-F enumerated | 6 | 6 (A, B, C, D, E, F) | ✅ |
| Product-RECON verdict surfaced as separate gate | YES | YES (YELLOW with 3 caveats) | ✅ |
| Zero file changes outside `logs/wp-033/` | true | true (modulo unrelated `apps/studio/.../VariantsDrawer.test.tsx.snap` line-ending diff already present pre-Phase-0) | ✅ |
| Probe files cleaned up | yes | yes (`/tmp/wp033-bp0-probe.test.ts` + `packages/block-forge-core/src/__tests__/wp033-tmp/` removed) | ✅ |

---

## Git

- Phase 0 prompt commit: `e7e1e3ea` — `docs(wp-033): Phase 0 RECON task — 6 rulings + product-RECON 7Q (incl. cascade & coherence)` [WP-033 phase 0]
- WP introduction commit: `c1eb1293` — `docs(wp-033): introduce WP — Block Forge Inspector + status IN PROGRESS` [WP-033 init]
- Result commit: `<TBD on commit>` — `docs(wp-033): phase 0 RECON — 6 rulings + product-RECON YELLOW + slider-bug declarative-trace [WP-033 phase 0]`
