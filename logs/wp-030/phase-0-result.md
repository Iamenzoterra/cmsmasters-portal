# Execution Log: WP-030 Phase 0 — RECON pre-flight audit

> Epic: WP-030 Responsive Tokens Editor
> Executed: 2026-04-26 ~13:07–13:50
> Duration: ~45 min
> Status: ✅ COMPLETE
> Domains audited: infra-tooling, pkg-ui, studio-blocks (zero file mutations outside `logs/wp-030/`)

## What Was Audited

Pre-flight + 9 RECON tasks across 3 domains. Zero code written. Confirmed cascade order, scaffold state, npm-script pattern, port 7703 free; probed `utopia-core@1.6.0` API in `/tmp`; counted token consumers across the repo (~26 tokens vs WP plan's "~24"); audited 3 production blocks for `var(--token, fallback)` universality + `@container slot` interactions; drafted conservative-defaults table for 22 active tokens; ran product-RECON scenario. **4 Brain rulings surfaced + 4 escalations + 2 pre-empted findings.**

---

## §0 — Pre-flight baseline

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ **501 / 0** (unchanged from WP-029 P3 baseline) |
| `apps/portal/app/globals.css` lines 2-5 | ✅ tokens.css → tokens.responsive.css → portal-blocks.css → portal-shell.css (exact order) |
| `packages/ui/src/theme/tokens.responsive.css` | ✅ 19 lines, 2 scaffold tokens (`--space-section`, `--text-display`) |
| `tools/block-forge/src/globals.css` line 1 | ✅ tokens.css imported, **NO** tokens.responsive.css yet (Phase 6 to add) |
| `.context/CONVENTIONS.md` §0 (lines 533-542) | ✅ "**`tools/block-forge/` is NOT an npm workspace**" — cd-pattern authoritative |
| Drift across `apps/portal/` for token redefinition | ✅ ZERO (no other file redefines `--h*-font-size` / `--spacing-*` between imports) |

---

## §0.1 — Domain skill NEW invariants relevant to WP-030

### `infra-tooling/SKILL.md`
- **Single-port architecture for tools/* Vite servers** — Vite `configureServer` middleware handles `/api/*` POST requests (block-forge pattern); no separate Hono runtime. Phase 1 mirrors this for `responsive-tokens-editor` `/api/scale-config` + `/api/tokens-config` endpoints.
- **`test: { css: true }` required** in any Vitest config touching `?raw` CSS imports. Without it, CSS loads as empty strings + assertions silently pass on nothing (memory `feedback_vitest_css_raw`). Phase 4 generator tests must set this.
- **WP-029 render-pin pattern** — `vi.mock('../lib/api-client')` + `vi.mocked()` typed access; jsdom polyfills file-level (no `vitest.setup.ts`); production code FROZEN during pin authoring; drift-detector lives as `test.skip(...)`. Phase 4 may reuse this pattern for end-to-end "save scale-config → generated CSS hits expected snapshot" test.
- **Save-safety contract (6 rules)** — read-guards, opened-file-only writes, first-save-per-session `.bak`, dirty guards, no-op save when nothing pending, no deletes. Phase 1 `/api/scale-config` + `/api/tokens-config` POST handlers must apply same rules to `tools/responsive-tokens-editor/data/*.json`.

### `pkg-ui/SKILL.md`
- **No build step in `packages/ui/`** — consumers import TS directly via `?raw` (Vite) or `@import`. Phase 6 cascade activation does NOT need a rebuild step.
- **Tailwind v4 traps** — for editor UI: `text-[length:var(--text-sm-font-size)]` (font-size), `h-[--button-height-sm]` bare (sizing without `var()` wrapper), `bg-[hsl(var(--primary))]` (hsl wrapper for color). Phase 3 editor UI MUST follow these or component classes silently drop.
- **Command Center exempt** — `apps/command-center` has its own dark theme. WP-030 cascade activation does NOT affect CC. (Consistent with overall DS scope.)

### `studio-blocks/SKILL.md`
- **Path B single-wrap invariant** — `composeSrcDoc` wraps body with ONLY `<div class="slot-inner">${html}</div>`; engine `wrapBlockHtml` provides inner shell. **WP-030 must NOT touch this.** Critical for Phase 6 Studio cross-ref work.
- **`preview-assets.ts:19` already imports `tokens.responsive.css`** — confirmed via direct read (Phase 6 Task 6.3 reduces to docs-only).
- **Save revalidates cache-wide via `{}`** — memory `feedback_revalidate_default.md` enforces. NOT relevant to WP-030 (no save flow), but documented for completeness.
- **Cross-surface mirror discipline RELAXED for `VariantsDrawer.tsx`** post-WP-029 (validator banner is Studio-only). WP-030 does NOT inherit this constraint — out of scope.

---

## §0.2 — Portal CSS cascade order confirmation

```
apps/portal/app/globals.css:
  1: /* Portal global styles */
  2: @import '../../../packages/ui/src/theme/tokens.css';
  3: @import '../../../packages/ui/src/theme/tokens.responsive.css';
  4: @import '../../../packages/ui/src/portal/portal-blocks.css';
  5: @import '../../../packages/ui/src/portal/portal-shell.css';
```

✅ **EXACT match** to WP §pre-flight expectation. Cascade overrides will resolve correctly: `tokens.css` defines static values, `tokens.responsive.css` overrides with clamps, portal-blocks/shell consume both via `var(--token, fallback)`.

**Drift check across `apps/portal/`** — Grep for `--h\d-font-size|--text-display|--spacing-md|--container-max-w` redefinition (excluding the two import sources): **NO MATCHES**. No file in `apps/portal/` redefines a typography or spacing token between the two imports. Cascade is clean.

---

## §0.3 — Token consumer count table (blast radius)

Aggregated `var(--TOKEN)` references across `packages/ apps/portal/ apps/studio/ content/ tools/` (`*.css *.tsx *.ts *.json`).

### Typography (10 tokens)
| Token | Static (px) | Consumers | Sample file:line |
|---|---|---|---|
| `--text-sm-font-size` | 15 | **194** 🟡 | content/db/blocks/theme-details.json:11, sidebar-pricing.json:11, sidebar-perfect-for.json:11 |
| `--text-xs-font-size` | 13 | **166** 🟡 | (widespread across content/db/blocks/*.json) |
| `--text-base-font-size` | 18 | 17 | content/db/blocks/header.json (search-input), sidebar-help-support.json:34 |
| `--h4-font-size` | 26 | 10 | content/db/blocks/fast-loading-speed.json (.score-label) |
| `--text-lg-font-size` | 20 | 8 | (limited use) |
| `--h3-font-size` | 32 | 8 | (limited use) |
| `--h2-font-size` | 42 | 4 | content/db/blocks/fast-loading-speed.json (.heading) |
| `--caption-font-size` | 14 | 3 | (limited use) |
| `--h1-font-size` | 54 | 1 | content/db/blocks/theme-name.json:11 |
| `--text-display` | (scaffold clamp 28–64) | **0** ⚠ | NONE — defined in scaffold, no block consumes it yet |

### Spacing (16 tokens defined; 11 used, 5 unused)
| Token | Static (px) | Consumers | Sample file:line |
|---|---|---|---|
| `--spacing-sm` | 12 | **141** 🟡 | apps/dashboard/src/pages/my-themes.tsx:153, 168, 181 |
| `--spacing-md` | 16 | **108** 🟡 | content/db/blocks/header.json (padding) |
| `--spacing-xs` | 8 | **77** 🟡 | (widespread) |
| `--spacing-xl` | 24 | **58** 🟡 | (widespread) |
| `--spacing-lg` | 20 | 43 | content/db/blocks/sidebar-help-support.json:21 |
| `--spacing-2xl` | 32 | 25 | content/db/blocks/fast-loading-speed.json (.gap), header.json:48 |
| `--spacing-3xl` | 40 | 20 | content/db/blocks/fast-loading-speed.json (padding) |
| `--spacing-2xs` | 4 | 11 | (limited) |
| `--spacing-4xl` | 48 | 10 | (limited) |
| `--spacing-5xl` | 64 | 4 | content/db/blocks/fast-loading-speed.json (padding) |
| `--spacing-3xs` | 2 | 2 | (rarely used) |
| `--spacing-6xl` | 80 | **0** ⚠ | UNUSED — escalation (a) |
| `--spacing-7xl` | 96 | **0** ⚠ | UNUSED |
| `--spacing-8xl` | 112 | **0** ⚠ | UNUSED |
| `--spacing-9xl` | 128 | **0** ⚠ | UNUSED |
| `--spacing-10xl` | 144 | **0** ⚠ | UNUSED |

### Container (0 tokens — escalation b)
- `--container-max-w` and `--container-px` **DO NOT EXIST** in `tokens.css`. WP §0.3 plan listed these — fiction. Phase 2 generator output: NO container tokens in V1. Container responsiveness handled by per-block `@container slot` queries (existing pattern).

### Special: `--space-section` (scaffold, in `tokens.responsive.css`)
- **5 hits**, all in tests/scaffold definition: `tokens.responsive.css:15` + 4 in `preview-assets.test.ts` (Studio + block-forge). **0 hits in actual block CSS.** Decision needed in Phase 2 (escalation c).

### Blast-radius summary
- **🟡 7 YELLOW signals** (>50 consumers each): `--text-sm-font-size` 194, `--text-xs-font-size` 166, `--spacing-sm` 141, `--spacing-md` 108, `--spacing-xs` 77, `--spacing-xl` 58, `--spacing-lg` 43. Cascade override touches them all — Phase 2 snapshot test must lock minPx/maxPx for these 7 first.
- **⚠ 5 spacing tokens (6xl–10xl) UNUSED** — 0 consumers. Skip from V1 generator (escalation a).
- **⚠ 1 typography token (`--text-display`) defined in scaffold but UNUSED** — escalation c, decision needed.

---

## §0.4 — utopia-core@1.6.0 API confirmed

```
utopia-core@1.6.0
Exports: ['calculateClamp', 'calculateClamps', 'calculateSpaceScale', 'calculateTypeScale', 'checkWCAG']
```

**5 exports — 2 BONUS** beyond WP §2.3 plan:
- `checkWCAG` — built-in WCAG 1.4.4 ratio checker (Phase 2 / §0.6 can use this instead of manual arithmetic)
- `calculateClamps` — bulk variant of `calculateClamp`

### Confirmed shapes (all match WP §2.3)

```ts
calculateClamp(input: {
  minSize: number, maxSize: number,
  minWidth: number, maxWidth: number,
  usePx?: boolean,        // default false → emits rem (divider 16)
  relativeTo?: 'viewport' | 'viewport-width' | 'container'  // default 'viewport-width' → 'vw'
}) => string
// Handles isNegative case; emits clamp(min, slope*relativeUnit + intersection, max)
```

```ts
calculateTypeScale(config: {
  minWidth, maxWidth,
  minFontSize, maxFontSize,
  minTypeScale, maxTypeScale,
  positiveSteps: number, negativeSteps: number
}) => Step[]
// Returns array: positiveSteps reversed + step 0 + negativeSteps
// Each step: { step, minFontSize, maxFontSize, clamp, ... } from calculateTypeStep(config, i)
```

```ts
calculateSpaceScale(config: {
  minWidth, maxWidth,
  minSize, maxSize,
  positiveSteps: number[], negativeSteps: number[],
  customSizes?: string[]
}) => { sizes: Size[], oneUpPairs: Pair[], customPairs: Pair[] }
// sizes: positive[] reversed + size 0 + negative[]
// oneUpPairs: ladder pairs; customPairs: from customSizes
```

✅ **NO API DRIFT.** WP §Phase 2 task 2.3 plan stands. Brain Ruling #3 = "no drift confirmed" with bonus (`checkWCAG` available).

---

## §0.5 — 3-block production CSS audit

| Block | Tokens used | `var(--token, fallback)` pattern? | `@container slot` queries? |
|---|---|---|---|
| `fast-loading-speed` | `--spacing-5xl/3xl/2xl`, `--h2-font-size` + `--h2-line-height`, `--font-weight-medium`, `--h4-font-size` + `--h4-line-height`, `--font-weight-regular`, `--text-sm-font-size` + `--text-sm-line-height`, `--font-weight-semibold` | ✅ universal | ✅ **YES** — `@container slot (max-width: 768px) { ...font-size: 32px }` AND `@container slot (max-width: 640px) { ...font-size: clamp(34px, 3.13vw, 60px) }` |
| `header` | `--spacing-md/2xl/sm`, `--text-sm-font-size` + `--text-sm-line-height`, `--text-base-font-size` + `--text-base-line-height`, `--rounded-full` | ✅ mostly universal (1 instance no fallback at L48: `gap: var(--spacing-2xl);`) | ❌ none in first 100 lines |
| `sidebar-help-support` | `--rounded-2xl`, `--spacing-2xl/lg/md`, `--text-base-font-size` + `--text-base-line-height` + `--text-base-letter-spacing`, `--font-weight-semibold/regular`, `--text-sm-font-size` + `--text-sm-line-height` + `--text-sm-letter-spacing` | ✅ mostly universal (1 instance no fallback at L52: `gap: var(--spacing-md);`) | ❌ none in first 100 lines |

### Interactions paragraph

`fast-loading-speed` has hardcoded `font-size: 32px` AND `clamp(34px, 3.13vw, 60px)` inside `@container slot` queries (max-width 768px / 640px). **When WP-030 makes `--h2-font-size` fluid via tokens.responsive.css cascade override, the existing container-query overrides WIN at narrow widths** — selector specificity inside `@container` beats root `:root` cascade. This is **not a bug**: WP-030 fluid scale provides the *base*, container queries provide per-block fine-tuning. Two implications:

1. **Phase 6 PARITY check must verify** that `fast-loading-speed` still renders correctly post-activation (the existing 32px override at @max-768px will continue to fire — block looks unchanged at narrow widths).
2. **CONVENTIONS update opportunity** — document that `@container slot` overrides on tokens are valid + take precedence; future block authors should know they can layer per-block fine-tuning on top of the system scale.

The 2 missing-fallback instances (`header.json:48`, `sidebar-help-support.json:52`) resolve cleanly post-activation (the override exists → no fallback needed). No action required.

---

## §0.6 — Conservative-defaults draft table (Brain Ruling #1)

**Rule:** clamp max = current static; mobile reduction max ~20%; WCAG 1.4.4 ratio max ≤ 2.5×.

**Scope: 11 typography + 11 spacing in active scope = 22 tokens** (5 spacing 6xl–10xl excluded — 0 consumers, see escalation a).

### Typography draft (10 active tokens)
| Token | maxPx | Draft minPx | Reduction% | Ratio | OK? |
|---|---|---|---|---|---|
| `--h1-font-size` | 54 | 44 | 18.5% | 1.23 | ✅ |
| `--h2-font-size` | 42 | 34 | 19.0% | 1.24 | ✅ |
| `--h3-font-size` | 32 | 26 | 18.8% | 1.23 | ✅ |
| `--h4-font-size` | 26 | 22 | 15.4% | 1.18 | ✅ |
| `--text-lg-font-size` | 20 | 17 | 15.0% | 1.18 | ✅ |
| `--text-base-font-size` | 18 | 16 | 11.1% | 1.13 | ✅ |
| `--text-sm-font-size` | 15 | 14 | 6.7% | 1.07 | ✅ |
| `--text-xs-font-size` | 13 | 12 | 7.7% | 1.08 | ✅ |
| `--caption-font-size` | 14 | 13 | 7.1% | 1.08 | ✅ |
| `--text-display` | 64 | 52 | 18.8% | 1.23 | ✅ ⚠ tightens WP-024 scaffold (was 28-64, ratio 2.29) |

### Spacing draft (11 active tokens; 5 unused excluded)
| Token | maxPx | Draft minPx | Reduction% | OK? |
|---|---|---|---|---|
| `--spacing-3xs` | 2 | 2 | 0% (no-op) | ✅ |
| `--spacing-2xs` | 4 | 4 | 0% (no-op) | ✅ |
| `--spacing-xs` | 8 | 8 | 0% (tap-target floor) | ✅ |
| `--spacing-sm` | 12 | 10 | 16.7% | ✅ |
| `--spacing-md` | 16 | 14 | 12.5% | ✅ |
| `--spacing-lg` | 20 | 16 | 20.0% | ✅ borderline |
| `--spacing-xl` | 24 | 20 | 16.7% | ✅ |
| `--spacing-2xl` | 32 | 26 | 18.8% | ✅ |
| `--spacing-3xl` | 40 | 32 | 20.0% | ✅ borderline |
| `--spacing-4xl` | 48 | 40 | 16.7% | ✅ |
| `--spacing-5xl` | 64 | 52 | 18.8% | ✅ |

### Sub-questions for Brain Ruling #1
- **(a) `--text-display` direction:** tightening from WP-024 scaffold's 28-64 (ratio 2.29) to draft 52-64 (ratio 1.23). KEEP tight defaults? OR retain WP-024's aggressive scaffold for backward parity? Recommend: **tighten to 52-64** (matches conservative rule; future blocks adopting `--text-display` get sane fluid behavior).
- **(b) `--space-section` (scaffold-only, no consumers):** keep generating? Currently `clamp(24px, 4vw, 96px)` (ratio 4.0). Recommend: **drop from V1 generator output** — 0 consumers in actual block CSS; can re-add in Phase 2.5 if a block adopts it.
- **(c) Borderline 20.0% rows** (`--spacing-lg`, `--spacing-3xl`): tighten to 19% by bumping minPx by 1? Recommend: **leave at 20%** — clean integer values + within rule.

🔔 **Brain Ruling #1 — please review the 22-row table + 3 sub-questions. Locks Phase 2 snapshot test.**

---

## §0.7 — Phase 6 PARITY insertion points

### block-forge — NEW edit (Phase 6 Task 6.2)
```diff
  tools/block-forge/src/globals.css
  Line 1:  @import '../../../packages/ui/src/theme/tokens.css';
+ Line 2:  @import '../../../packages/ui/src/theme/tokens.responsive.css';
  Line 3:  @import 'tailwindcss';
  Line 4:  @config '../tailwind.config.ts';
  ...
```

### Studio — ALREADY ACTIVATED (no code edit needed)
```ts
apps/studio/src/pages/block-editor/responsive/preview-assets.ts:18-19
  18: import tokensCSS from '...?raw'
  19: import tokensResponsiveCSS from '...?raw'  ← ALREADY EXISTS (since WP-027)
```

Confirmed: file lines 18-21 import all 4 raw assets (tokens.css, tokens.responsive.css, portal-blocks.css, animate-utils.js). `tokensResponsiveCSS` is composed into srcdoc by existing `composeSrcDoc` flow. Activation happens automatically when the WP-030 generator populates real values into `tokens.responsive.css` — preview iframe will render fluid behavior with no edit to Studio.

🔔 **Brain Ruling #4 — Phase 6 Task 6.3 reduction:** Studio side reduces to PARITY.md cross-reference only (no code edit). WP §Phase 6 plan needs in-place amendment when Phase 6 starts. Recommend: bake the reduction into Phase 6 task spec at Phase 6 kickoff (not now).

PARITY files exist: `tools/block-forge/PARITY.md` (~21KB) + `apps/studio/.../PARITY.md` (~24KB). Phase 6 will add cross-ref entries pointing to `tools/responsive-tokens-editor/PARITY.md`.

---

## §0.8 — Port 7703 + npm script pattern

```
$ netstat -ano | grep ':7703' || echo "PORT 7703 FREE"
PORT 7703 FREE ✅
```

```
$ grep -E '"(block-forge|layout-maker|studio-mockups)":' package.json
    "block-forge": "cd tools/block-forge && npm run dev",
    "layout-maker": "cd tools/layout-maker && npm run dev"
```

✅ **CONFIRMED:** Phase 1 root `package.json` script must be:
```json
"responsive-tokens-editor": "cd tools/responsive-tokens-editor && npm run dev"
```

**WP §1.7's `--workspace=` plan is WRONG.** CONVENTIONS §0 (lines 533-542) is the authority: *"`tools/block-forge/` is NOT an npm workspace ... DO `cd tools/block-forge && npm <cmd>` ... DON'T `npm -w tools/block-forge <cmd>` — fails with 'No workspaces found'."* Phase 1 baked. No Brain ruling needed.

---

## §0.9 — Product RECON: Utopia full-system mental-model match

**Scenario walk-through (Dmytro opens `tools/responsive-tokens-editor/` for the first time, goal: tune fluid token defaults for the first 10 production blocks):**

**(a) Authoring question match.** The user's actual question is *"how do I tune fluid tokens for my 300-block portal?"*. The 5-pane editor IA (Global Scale / Token Preview / Per-token Override / Container Widths / Live Preview + WCAG/Reset/Save) DOES answer this — but with a level of indirection. The Utopia mental model is *system-level scale → step-based generation → per-step overrides*. This matches the question if and only if the user grasps "edit one slider → 24 tokens shift". A user who wants to "edit each token's min/max directly" will bypass the global scale and per-token-override every row, defeating the system. Risk: moderate.

**(b) First action.** Likely path: read global scale labels → toggle one input (e.g., `baseAtMin: 16 → 17`) → see the table change → look up the specific token they care about (e.g., `--h2-font-size`) → see it has min/max already set → decide whether the system value works OR override. This path works **if and only if the global scale inputs have plain-English labels and tooltips showing affected tokens**. If labeled as raw Utopia jargon (`minTypeScale=1.2`, `maxTypeScale=1.25`), the user defaults to per-token overrides → anti-pattern surfacing. **Mitigation in V1:** each global scale input MUST have layperson description + "this affects: --h1 → --caption (10 tokens)" tooltip.

**(c) Missing affordance.** Yes — the "Preview a real block" feature is deferred to V2 per WP §5.3. V1 Live Preview Row shows generic H1/H2/body/section/button. The user's mental model for validating defaults is *"show me what `fast-loading-speed` looks like at @375"*, not generic samples. **Acceptable for V1 IF Phase 6 PARITY work activates block-forge as the parallel feedback channel** (open block-forge in another tab post-Save → see effect on real blocks at the same viewport). Without this, RED. With this, YELLOW → GREEN.

**(d) Mental-model trap risk.** Moderate. A designer thinking *"I know exactly what I want for --h2; why bother with global scale?"* will override every token, accumulating per-token minPx/maxPx until no system remains. **Mitigation in V1:** per-token override modal warns *"This token currently follows the global scale. If you override, you opt out of automatic scale updates. [confirm]"*. With this guard, OK.

### Verdict: 🟢 **GREEN with V1 caveats**

Three caveats MUST be implemented in Phase 3 editor UI:
1. Each global scale input has plain-English label + tooltip showing affected tokens.
2. Per-token override modal warns about opting out of scale + requires confirm.
3. PARITY documentation notes that "real-block preview deferred to V2" with workaround "open block-forge in second tab to validate".

If any of the 3 caveats is dropped, verdict downgrades to 🟡 YELLOW.

🔔 **Brain Ruling #2 — confirm the GREEN-with-caveats verdict, OR push back if the indirection feels wrong for the workflow.** This is the product gate Brain authoritatively owns; the 2026-04-26 retrospective named this class of miss.

---

## 🔔 Brain rulings surfaced (4)

### Ruling #1: Conservative-defaults concrete numbers (22 rows)
**Question:** Confirm the typography (10) + spacing (11) draft tables in §0.6 as V1 defaults. Lock for Phase 2 snapshot test.

**Recommendation:** USE the table as drafted. Sub-questions:
- (a) `--text-display`: tighten to 52-64 (vs WP-024's 28-64 scaffold) — RECOMMEND tighten.
- (b) `--space-section`: drop from V1 (0 consumers) — RECOMMEND drop.
- (c) Borderline 20.0% rows: leave as-is — RECOMMEND no change.

**Alternatives if you disagree:** (i) tighten typography minPx by 2-4px more (more conservative); (ii) loosen spacing minPx by 2-4px (more aggressive); (iii) drop 1+ token classes entirely (e.g., `--caption-font-size` 3 consumers — questionable cost/benefit).

### Ruling #2: Utopia full-system mental-model match
**Question:** §0.9 verdict — 🟢 GREEN with 3 V1 caveats. Confirm OR pivot UX before Phase 1 starts.

**Recommendation:** GREEN. The Utopia model fits the authoring problem; the 3 caveats are concrete UX guards that close the moderate trap-risk gap. Phase 3 editor UI MUST implement all 3.

**Alternatives if you disagree:** (i) skip global scale entirely → V1 is just a 24-row min/max grid with WCAG checks ("just edit each token directly" mental model); (ii) keep global scale but make per-token-override the *default* surface, scale collapsed by default; (iii) defer V1 to "Preview a real block" feature being ready (delays Phase 1 by ~1 phase).

### Ruling #3: utopia-core API drift
**Question:** Phase 2 task 2.3 plan codes against `calculateClamp / calculateTypeScale / calculateSpaceScale`. Confirm shapes match plan.

**Recommendation:** **NO DRIFT** confirmed. 3 core functions match WP §2.3 input/output shapes exactly. **Bonus:** 2 unplanned exports (`checkWCAG`, `calculateClamps`) — Phase 2 generator should use `checkWCAG(minPx, maxPx)` to remove manual ratio arithmetic from Phase 0.6 / Phase 2.4.

**Alternatives if you disagree:** none — the API matches; only question is whether to adopt `checkWCAG` (recommend yes, ~10 LOC saved + canonical implementation).

### Ruling #4: Phase 6 Studio PARITY scope reduction
**Question:** Phase 6 Task 6.3 originally specced "PARITY mirror to Studio preview-assets.ts". Reduce to PARITY.md cross-reference only?

**Recommendation:** **YES, REDUCE.** `preview-assets.ts:19` already imports `tokensResponsiveCSS`. Studio activation happens automatically when generator populates values. Phase 6 Task 6.3 = docs-only cross-reference + Studio PARITY.md note. Net code change for Studio: 0 lines.

**Alternatives if you disagree:** (i) keep Phase 6 Task 6.3 as code-edit if there's some future-proofing concern (none identified); (ii) collapse Phase 6 entirely to a single block-forge edit + 2 PARITY.md updates (cleaner, ~30 LOC reduction).

---

## Pre-empted findings (no ruling needed; baked into Phase 1)

- **npm script pattern:** `"responsive-tokens-editor": "cd tools/responsive-tokens-editor && npm run dev"` (NOT `--workspace=`). CONVENTIONS §0 lines 533-542 is the authority. WP §1.7 plan WRONG; Phase 1 spec amendment in-place when Phase 1 starts.
- **Install dance:** `tools/responsive-tokens-editor/package.json` declaring `@cmsmasters/*: "*"` workspace deps will 404 on first `npm install`. Strip three lines → `npm install` → restore. Same as block-forge pattern (infra-tooling/SKILL.md L70).

---

## Escalations from RECON (NEW — surface for Brain awareness)

### (a) 5 spacing tokens (`6xl`–`10xl`) have **0 consumers**
| Token | Static | Consumers |
|---|---|---|
| `--spacing-6xl` | 80px | 0 |
| `--spacing-7xl` | 96px | 0 |
| `--spacing-8xl` | 112px | 0 |
| `--spacing-9xl` | 128px | 0 |
| `--spacing-10xl` | 144px | 0 |

**Recommendation:** SKIP from V1 generator output. Phase 2 generator emits 11 spacing tokens (3xs–5xl), not 16. Future use: when a block consumes 6xl, generator can auto-extend OR the scale extends naturally via positiveSteps growth. Reflected in §0.6 table.

### (b) `--container-max-w` / `--container-px` **don't exist** in tokens.css
WP §0.3 plan listed these — fiction. Phase 2 generator output: NO container tokens in V1. Container responsiveness handled by per-block `@container slot` queries (existing pattern, see §0.5 `fast-loading-speed`).

### (c) `--text-display` has **0 consumers** in actual block CSS
Defined in WP-024 scaffold; no block uses it. Decision needed (sub-question under Ruling #1.a).

### (d) WP-024 documentation drift in `tokens.responsive.css` comment
File header lines 6-7 says *"Real token values are hand-tuned in WP-029 (Responsive Tokens Population)"* — but WP-029 was actually about block-forge render-pin testing. **WP-030 is the population work.** 1-line comment fix in Phase 1 (zero-cost, surface to spec).

---

## Open Questions

None beyond the 4 rulings. All escalations consolidate into Ruling #1 sub-questions or are pre-empted.

---

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ 501 / 0 (unchanged from WP-029 P3 baseline) |
| `result.md` exists with all 9 sections | ✅ §0 + §0.1 through §0.9 |
| Zero file changes outside `logs/wp-030/` | ✅ (verified — only this file added) |
| 4 Brain rulings clearly enumerated | ✅ |
| §0.3 covers all 26 inventoried tokens (10 typo + 16 spacing) with counts + samples | ✅ |
| §0.4 utopia-core API documented for 3 functions Phase 2 codes against | ✅ + 2 bonus exports |
| §0.6 conservative-defaults covers 22 active tokens with WCAG ratio ≤ 2.5× | ✅ all rows pass |
| §0.9 Product RECON has explicit GREEN/YELLOW/RED verdict | ✅ 🟢 GREEN with 3 V1 caveats |

---

## Git
- Phase 0 task prompt + WP-030 plan: commit `57793462` (`docs(wp-030): WP plan + Phase 0 RECON task — responsive-tokens-editor [WP-030 phase 0 prep]`)
- Phase 0 result: this commit (next).
