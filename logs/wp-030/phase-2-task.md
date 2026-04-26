# WP-030 Phase 2: Config schema + math engine (utopia-core integration; snapshot test on conservative defaults)

> Workplan: WP-030 Responsive Tokens Editor — Utopia full system + tools/ Vite editor
> Phase: 2 of 7
> Priority: P0
> Estimated: 8-10 hours
> Type: Frontend (engine + types) + Tests
> Previous: Phase 1 ✅ Vite scaffold (`d8c5498a` — 14 files, 12 manifest entries, 513/0 arch-test, :7703 boots clean)
> Next: Phase 3 (Global Scale UI — wires `defaults.ts` + `generator.ts` to React state; bakes Caveat #1 + #2 from Ruling #2)
> Affected domains: `infra-tooling` (NEW: 7 engine + test files in `tools/responsive-tokens-editor/src/lib/` + `src/__tests__/`)

---

## Context

WP-030 builds a populated `tokens.responsive.css` for ADR-025 Layer 1. Phase 2 is **engine-only** — no UI, no disk writes. Implements:

1. `ResponsiveConfig` type (replaces Phase 1's `Phase1Stub = never`)
2. Conservative V1 defaults for 22 active tokens (per Phase 0 §0.6 + Brain rulings 1.a/1.b/1.c)
3. `generator.ts` — config + utopia-core → CSS string (emits `vi` units per WP §Output format)
4. `validate.ts` — wraps utopia-core's `checkWCAG` per Ruling #3
5. `config-io.ts` — Vite middleware contract scaffolding (no actual disk writes Phase 2; Phase 6 wires fs-bridge)
6. 3 test suites — generator snapshot (LOCKS conservative defaults), defaults assertion, validate WCAG

```
CURRENT  ✅  Phase 1 scaffold runnable at :7703 (empty shell)
CURRENT  ✅  utopia-core@1.6.0 installed; 5 exports verified runtime
CURRENT  ✅  Phase 0 §0.6 22-token conservative-defaults table locked by 7 Brain rulings
CURRENT  ✅  Phase 0 §0.4 utopia-core API shape confirmed; relativeTo: 'viewport' → vi (RTL-safe)
MISSING  ❌  src/lib/{generator,defaults,validate,config-io}.ts — does not exist
MISSING  ❌  src/__tests__/{generator,defaults,validate}.test.ts — does not exist
MISSING  ❌  src/types.ts is a 1-line stub (Phase 1 placeholder)
```

After Phase 2: `npm -C tools/responsive-tokens-editor test` runs 3 test files green; snapshot file `src/__tests__/__snapshots__/generator.test.ts.snap` committed with locked conservative-defaults CSS string output. Engine importable but not yet wired to UI (Phase 3+). No file changes outside `tools/responsive-tokens-editor/src/` + manifest.

**No disk writes in Phase 2** — `config-io.ts` defines the contract (function signatures, in-memory pass-through), but actual fs persistence wires only in Phase 6 save flow. Tests use synthetic in-memory configs.

---

## 7 Brain rulings — Phase 2 anchors

These are LOCKED. Phase 2 implements/encodes them. Do not re-litigate.

| # | Ruling | Phase 2 encoding |
|---|---|---|
| **1.a** | KEEP `--text-display: clamp(28px, ..., 64px)` (28-64, ratio 2.29 ≤ WCAG 2.5×) | `defaults.ts` overrides: `'--text-display': { minPx: 28, maxPx: 64, reason: 'WP-024 hero scaffold preserved (ruling 1.a)' }` |
| **1.b** | KEEP `--space-section`, tighten `clamp(24px, 4vw, 96px)` → `clamp(52px, ..., 96px)` (ratio 1.85) | `defaults.ts` overrides: `'--space-section': { minPx: 52, maxPx: 96, reason: 'tightened from 24-96 (ratio 4.0 fail-WCAG) per ruling 1.b' }` |
| **1.c** | Borderline 20% rows leave as-is | `defaults.ts` overrides: `'--spacing-lg': { minPx: 16, maxPx: 20 }` (20%); `'--spacing-3xl': { minPx: 32, maxPx: 40 }` (20%). Both within 2.5× cap. |
| **2** | 🟢 GREEN with 3 V1 caveats | **Phase 2: noop UI**. Caveats (i)+(ii) → Phase 3 spec. Caveat (iii) → Phase 6 PARITY (already pre-mentioned in `PARITY.md`). |
| **3** | utopia-core no drift; adopt `checkWCAG` | `validate.ts` calls `checkWCAG({ min, max, minWidth, maxWidth })`; NO manual ratio arithmetic. |
| **4** | Phase 6.3 docs-only | **Phase 2: noop**. Phase 6 amendment when Phase 6 starts. |
| **side** | fast-loading-speed.json M leave | **Phase 2: do NOT touch** `content/db/blocks/`. Phase 2 scope = `tools/responsive-tokens-editor/src/` + manifest only. |

Plus pre-empted findings (carry from Phase 0 → Phase 1 → Phase 2):
- **PE.1** cd-pattern in npm scripts — Phase 2 noop (Phase 1 baked).
- **PE.2** install dance — Phase 2 still NOT applicable (no `@cmsmasters/*` deps added; pure local engine + test code).

Plus **Phase 2 pre-flight findings** (from Brain RECON + Hands' Brain-approval round-trip 2026-04-26):
- **PF.1** `tokens.css` static values empirically match Phase 0 §0.6 table 1:1 — `defaults.ts` `maxPx` values are GROUND TRUTH (no invented constants).
- **PF.2** utopia-core `relativeTo: 'viewport'` → emits `vi` units (RTL-safe per WP §Output format key decision). `'viewport-width'` (default) → `vw`. **Generator MUST pass `relativeTo: 'viewport'`** in every `calculateClamp` invocation.
- **PF.3** `--text-display` does NOT exist in `tokens.css` — only in `tokens.responsive.css` scaffold. It's a fluid-only token, no static fallback. Cascade works (any consumer's `var(--text-display, fallback)` resolves to clamp from tokens.responsive.css). Mental model: `--text-display` is the one V1 token that ONLY exists as fluid.
- **PF.4** utopia-core `checkWCAG({ min, max, minWidth, maxWidth }) => number[] | null` — empirically locked contract (Hands' RECON, dist/index.d.ts L75-80 confirmation; refined post-amendment empirical probe 2026-04-26). Semantics:
  - `pass` = result is `null` OR `[]` (empty array)
  - `fail` = result is length-2 number array `[from, to]` (viewport-width bounds where ratio > 2.5× violates)
  - The `null` vs `[]` distinction for pass cases is **non-deterministic from inputs** — it's an internal numeric-precision artifact of utopia-core (e.g. `(16, 40)` returns `[]` while `(10, 25)` returns `null` despite both having ratio === 2.5 exact). Both shapes mean "no violation".
  - Adapter `isViolation = Array.isArray(result) && result.length > 0` correctly handles BOTH pass shapes via short-circuit (null fails Array.isArray; [] fails length > 0).
  - Task 2.4 `validate.ts` adapter is shape-aware from line 1 (no TODO stubs to replace).
  - Bonus: `UtopiaStep` (return of `calculateTypeScale`) carries inline `wcagViolation?: { from, to } | null` per step — Phase 3+ scale-derived path can leverage; V1 override-only path uses `validate()` for uniform diagnostics.

---

## Domain Context

### `infra-tooling` (PRIMARY — owns engine code)

- **Invariant — Save-safety contract (6 rules)** for any `/api/*` POST handler in tools/* Vite middleware: (1) read-guards, (2) opened-file-only writes, (3) first-save-per-session `.bak`, (4) dirty guards, (5) no-op save when nothing pending, (6) no deletes. **Phase 2: contract documented in `config-io.ts` JSDoc; actual fs writes deferred to Phase 6.**
- **Trap — `test: { css: true }` REQUIRED.** Already set in Phase 1's `vite.config.ts` (verified). Snapshot test would silently pass on empty CSS strings without it. Saved memory `feedback_vitest_css_raw`.
- **Saved memory — `feedback_snapshot_ground_truth`.** Once committed, `__snapshots__/generator.test.ts.snap` is the locked baseline. Future engine changes (Phase 3+) review snapshot diff explicitly. Brain reviews snapshot output before commit during this phase.
- **Pattern — block-forge as engine-test reference.** `tools/block-forge/src/__tests__/` uses vitest + RTL; mirror test patterns (helper extraction, mock patterns) where applicable.

### `pkg-ui` (NOT TOUCHED IN PHASE 2)

- `tokens.responsive.css` content is NOT regenerated in Phase 2. Phase 6 owns regeneration. Phase 2 generator OUTPUT exists only as test snapshot + in-memory string.
- `responsive-config.json` is NOT created in Phase 2. Phase 6 first save creates it. Phase 2's `config-io.loadConfig()` returns `null` if file missing → Phase 3 falls back to `defaults.ts`.

---

## Phase 0 Audit — re-baseline (do FIRST)

```bash
# 0. Confirm Phase 1 baseline state
git log --oneline -3                                              # expect: phase 1 commit chain (d8c5498a + 4d77a5be)
git status --short                                                # expect: clean OR known unrelated drift (fast-loading-speed.json M is OK to leave)

# 1. Confirm baseline tests pass
npm run arch-test
echo "(expect: 513 / 0 — Phase 1 close baseline)"

# 2. Confirm tools/responsive-tokens-editor/ scaffold intact
ls tools/responsive-tokens-editor/src/
ls tools/responsive-tokens-editor/src/lib 2>/dev/null && echo "❌ lib/ exists already; investigate" || echo "✅ lib/ absent — proceed"
ls tools/responsive-tokens-editor/src/__tests__ 2>/dev/null && echo "❌ __tests__/ exists already; investigate" || echo "✅ __tests__/ absent — proceed"

# 3. Confirm types.ts is still the Phase 1 stub
cat tools/responsive-tokens-editor/src/types.ts
echo "(expect: 'export type Phase1Stub = never' single-line stub)"

# 4. Re-confirm utopia-core API at runtime (sanity check post-install)
cd tools/responsive-tokens-editor && node -e "
const u = require('utopia-core');
const exp = Object.keys(u).sort();
const expected = ['calculateClamp','calculateClamps','calculateSpaceScale','calculateTypeScale','checkWCAG'].sort();
console.log('exports:', exp.join(', '));
console.log('match:', JSON.stringify(exp) === JSON.stringify(expected) ? '✅' : '❌');
console.log('vi-emit:', u.calculateClamp({ minSize: 16, maxSize: 18, minWidth: 375, maxWidth: 1440, relativeTo: 'viewport' }));
"
echo "(expect: 5 exports match + vi-emit contains 'vi' unit)"

# 5. Confirm tokens.css has static values matching Phase 0 §0.6 (sample 5 tokens)
grep -E '^\s*--(h1|h2|text-base|spacing-md|spacing-5xl)-?(font-size)?:' packages/ui/src/theme/tokens.css | head -10
echo "(expect: --h1-font-size: 54px; --h2-font-size: 42px; --text-base-font-size: 18px; --spacing-md: 16px; --spacing-5xl: 64px;)"
```

**STOP and surface to Brain immediately if:**
- arch-test ≠ 513/0 → drift since Phase 1
- utopia-core export list differs from 5-name set → API drift mid-flight; re-rule before any engine code
- `relativeTo: 'viewport'` does NOT emit `vi` unit (output contains `vw` or `vh` etc.) → RTL-safety key decision broken; escalate
- Static token values in tokens.css differ from Phase 0 §0.6 table → defaults.ts groundedness compromised; re-RECON

---

## Task 2.1: Define `ResponsiveConfig` + supporting types — replace stub

### What to Build

Replace `tools/responsive-tokens-editor/src/types.ts` (currently `export type Phase1Stub = never`) with the full type definitions.

```ts
// WP-030 Phase 2 — types for the responsive tokens editor.
//
// ResponsiveConfig is the single source of truth for the fluid scale.
// Persisted to packages/ui/src/theme/responsive-config.json (Phase 6).
// Consumed by:
//   - generator.ts → emits tokens.responsive.css
//   - validate.ts → WCAG 1.4.4 checks via utopia-core checkWCAG
//   - Phase 3+ React UI

/** Map from semantic token name → utopia step number. */
export type StepMapEntry = {
  /** Token name as written in tokens.css (e.g., '--h1-font-size'). */
  token: string
  /** Token name to override in tokens.responsive.css cascade output (same as `token` for V1). */
  overrides: string
}

export type ResponsiveConfig = {
  /** Viewport range — fluid scale interpolates between these widths. */
  minViewport: number // px (V1 default 375)
  maxViewport: number // px (V1 default 1440)

  /** Type scale config — drives utopia-core calculateTypeScale. */
  type: {
    baseAtMin: number    // px — body size at minViewport (V1 default 16)
    baseAtMax: number    // px — body size at maxViewport (V1 default 18)
    ratioAtMin: number   // V1 default 1.2 (Minor Third)
    ratioAtMax: number   // V1 default 1.25 (Major Third)
    /**
     * Step number → token mapping. e.g.,
     *   { 5: { token: '--h1-font-size', overrides: '--h1-font-size' },
     *     4: { token: '--h2-font-size', overrides: '--h2-font-size' },
     *     0: { token: '--text-base-font-size', overrides: '--text-base-font-size' },
     *    -2: { token: '--text-xs-font-size',   overrides: '--text-xs-font-size'   } }
     */
    stepMap: Record<number, StepMapEntry>
  }

  /** Spacing scale config — drives utopia-core calculateSpaceScale. */
  spacing: {
    baseAtMin: number    // px (V1 default 16)
    baseAtMax: number    // px (V1 default 20)
    /**
     * Multiplier name → ratio. Maps to existing `--spacing-{name}` tokens.
     * e.g., { '3xs': 0.125, '2xs': 0.25, 'xs': 0.5, 'sm': 0.75, 'md': 1,
     *        'lg': 1.25, 'xl': 1.5, '2xl': 2, '3xl': 2.5, '4xl': 3, '5xl': 4 }
     * V1 emits 11 tokens (3xs–5xl); 6xl–10xl unused per Phase 0 escalation (a).
     */
    multipliers: Record<string, number>
  }

  /**
   * Per-token overrides — escape hatch from the scale.
   * Used in V1 for ALL existing tokens to preserve current desktop static values
   * (per Brain ruling #1 conservative-defaults discipline).
   * Future authoring: scale-derived first, override only when scale doesn't fit.
   */
  overrides: Record<string, TokenOverride>
}

export type TokenOverride = {
  minPx: number
  maxPx: number
  reason?: string
}

/** Output entry for one generated token line. */
export type GeneratedToken = {
  name: string             // e.g., '--h1-font-size'
  minPx: number
  maxPx: number
  clampCss: string         // e.g., 'clamp(2.75rem, 2.487rem + 1.127vi, 3.375rem)'
  source: 'override' | 'type-scale' | 'space-scale' | 'special'
  /** Set when validate.ts flags this token. */
  wcagViolation?: WcagViolation
}

/** Output of validate.ts — utopia-core checkWCAG wrapped in our shape. */
export type WcagViolation = {
  token: string
  minPx: number
  maxPx: number
  /** Fail message from checkWCAG, or our wrapper's diagnostic. */
  reason: string
}

/** Result of generator.ts — full CSS string + per-token diagnostics. */
export type GeneratorResult = {
  /** Complete tokens.responsive.css content, including auto-generated header. */
  css: string
  /** Per-token output for UI display (Phase 4 Token Preview Grid). */
  tokens: GeneratedToken[]
  /** Aggregated WCAG diagnostics (subset of `tokens` with violations). */
  wcagViolations: WcagViolation[]
}

/** Result of config-io.loadConfig() — null if file missing. */
export type LoadConfigResult = ResponsiveConfig | null

/** Result of config-io.saveConfig() — fs-write outcome. */
export type SaveConfigResult = {
  ok: boolean
  /** Reason on failure; absent on success. */
  error?: string
}
```

### Domain Rules

- **Single source of truth:** `ResponsiveConfig` is the contract for everything downstream. Phase 3 React state holds one of these; Phase 4 grid renders from `GeneratorResult.tokens`; Phase 6 save serializes via JSON.stringify.
- **No emoji.** No comments referencing the current task / fix / caller (per CLAUDE.md "Default to writing no comments"). The JSDoc above is the exception — it's API surface documentation, not internal explanation.
- **Phase 1 stub removal:** `Phase1Stub` removed entirely; the file is now the canonical types module.

---

## Task 2.2: Seed conservative V1 defaults — `defaults.ts`

### What to Build

Create `tools/responsive-tokens-editor/src/lib/defaults.ts`:

```ts
import type { ResponsiveConfig } from '../types'

/**
 * V1 conservative defaults — locked by Brain rulings 1.a/1.b/1.c (Phase 0 close 2026-04-26).
 *
 * Discipline: clamp max = current tokens.css static (preserves desktop rendering);
 * mobile reduction max ~20%; WCAG 1.4.4 ratio max ≤ 2.5×.
 *
 * For V1 every existing token has an explicit override entry — the type/space scales
 * (ratioAtMin, multipliers, etc.) are seeded for future-token derivation but the
 * generator emits override values as the actual clamp() output for every entry.
 */
export const conservativeDefaults: ResponsiveConfig = {
  minViewport: 375,
  maxViewport: 1440,

  type: {
    baseAtMin: 16,
    baseAtMax: 18,
    ratioAtMin: 1.2,
    ratioAtMax: 1.25,
    stepMap: {
      // Future-token step assignments — generator falls back to these
      // when an entry is NOT in `overrides`. V1: every existing token IS in overrides.
      6:  { token: '--text-display',         overrides: '--text-display' },
      5:  { token: '--h1-font-size',         overrides: '--h1-font-size' },
      4:  { token: '--h2-font-size',         overrides: '--h2-font-size' },
      3:  { token: '--h3-font-size',         overrides: '--h3-font-size' },
      2:  { token: '--h4-font-size',         overrides: '--h4-font-size' },
      1:  { token: '--text-lg-font-size',    overrides: '--text-lg-font-size' },
      0:  { token: '--text-base-font-size',  overrides: '--text-base-font-size' },
      [-1]: { token: '--text-sm-font-size',  overrides: '--text-sm-font-size' },
      [-2]: { token: '--text-xs-font-size',  overrides: '--text-xs-font-size' },
      [-3]: { token: '--caption-font-size',  overrides: '--caption-font-size' },
    },
  },

  spacing: {
    baseAtMin: 16,
    baseAtMax: 20,
    multipliers: {
      '3xs': 0.125, '2xs': 0.25, 'xs': 0.5, 'sm': 0.75, 'md': 1,
      'lg':  1.25,  'xl':  1.5,  '2xl': 2,  '3xl': 2.5, '4xl': 3, '5xl': 4,
      // 6xl–10xl excluded per Phase 0 escalation (a) — 0 consumers
    },
  },

  overrides: {
    // Typography (10 — values match Phase 0 §0.6 conservative-defaults table)
    '--h1-font-size':        { minPx: 44, maxPx: 54, reason: 'preserve desktop static (ruling 1)' },
    '--h2-font-size':        { minPx: 34, maxPx: 42, reason: 'preserve desktop static (ruling 1)' },
    '--h3-font-size':        { minPx: 26, maxPx: 32, reason: 'preserve desktop static (ruling 1)' },
    '--h4-font-size':        { minPx: 22, maxPx: 26, reason: 'preserve desktop static (ruling 1)' },
    '--text-lg-font-size':   { minPx: 17, maxPx: 20, reason: 'preserve desktop static (ruling 1)' },
    '--text-base-font-size': { minPx: 16, maxPx: 18, reason: 'preserve desktop static (ruling 1)' },
    '--text-sm-font-size':   { minPx: 14, maxPx: 15, reason: 'preserve desktop static (ruling 1)' },
    '--text-xs-font-size':   { minPx: 12, maxPx: 13, reason: 'preserve desktop static (ruling 1)' },
    '--caption-font-size':   { minPx: 13, maxPx: 14, reason: 'preserve desktop static (ruling 1)' },
    '--text-display':        { minPx: 28, maxPx: 64, reason: 'WP-024 hero scaffold preserved (ruling 1.a)' },

    // Spacing (11 — 3xs..5xl)
    '--spacing-3xs':  { minPx: 2,  maxPx: 2,  reason: 'no-op (ruling 1)' },
    '--spacing-2xs':  { minPx: 4,  maxPx: 4,  reason: 'no-op (ruling 1)' },
    '--spacing-xs':   { minPx: 8,  maxPx: 8,  reason: 'no-op tap-target floor (ruling 1)' },
    '--spacing-sm':   { minPx: 10, maxPx: 12, reason: 'preserve desktop static (ruling 1)' },
    '--spacing-md':   { minPx: 14, maxPx: 16, reason: 'preserve desktop static (ruling 1)' },
    '--spacing-lg':   { minPx: 16, maxPx: 20, reason: 'borderline 20% per ruling 1.c — within cap' },
    '--spacing-xl':   { minPx: 20, maxPx: 24, reason: 'preserve desktop static (ruling 1)' },
    '--spacing-2xl':  { minPx: 26, maxPx: 32, reason: 'preserve desktop static (ruling 1)' },
    '--spacing-3xl':  { minPx: 32, maxPx: 40, reason: 'borderline 20% per ruling 1.c — within cap' },
    '--spacing-4xl':  { minPx: 40, maxPx: 48, reason: 'preserve desktop static (ruling 1)' },
    '--spacing-5xl':  { minPx: 52, maxPx: 64, reason: 'preserve desktop static (ruling 1)' },

    // Special (1 — section rhythm; tightened per ruling 1.b)
    '--space-section': {
      minPx: 52, maxPx: 96,
      reason: 'tightened from WP-024 scaffold 24-96 (ratio 4.0 fail-WCAG) per ruling 1.b — section rhythm first-class concern',
    },
  },
}
```

### Domain Rules

- **Saved memory `feedback_snapshot_ground_truth`:** these values get baked into the snapshot. Once committed, future changes review snapshot diff explicitly.
- **Verbatim Phase 0 §0.6 table:** every minPx/maxPx pair must match the table. Hands cross-references before commit. Off-by-one = invented constants.
- **22 entries in `overrides`** = 10 typography + 11 spacing + 1 special section. Count = exactly 22.

---

## Task 2.3: Implement `generator.ts`

### What to Build

Create `tools/responsive-tokens-editor/src/lib/generator.ts`:

```ts
import { calculateClamp, calculateTypeScale, calculateSpaceScale } from 'utopia-core'
import type { ResponsiveConfig, GeneratedToken, GeneratorResult } from '../types'
import { validate } from './validate'

const HEADER = `/* tokens.responsive.css
 *
 * AUTO-GENERATED by tools/responsive-tokens-editor/ — do not edit manually.
 * Source of truth: packages/ui/src/theme/responsive-config.json
 *
 * Cascade-overrides static tokens defined in tokens.css with clamp()-based
 * fluid values. RTL-safe via 'vi' (viewport-inline) units.
 *
 * See ADR-025 (Responsive Blocks) and WP-030 (Responsive Tokens Editor).
 */`

/**
 * Convert config → tokens.responsive.css string + per-token diagnostics.
 *
 * Discipline:
 *   - Every entry in config.overrides → emit explicit clamp() with override min/max
 *   - For tokens NOT in overrides but present in stepMap → derive from utopia-core
 *     calculateTypeScale (V1 produces nothing here; future-token coverage)
 *   - Spacing tokens NOT in overrides but in multipliers → derive from
 *     calculateSpaceScale customSizes (V1: same — overrides cover all)
 *   - All clamp() output uses 'vi' units via relativeTo: 'viewport' (PF.2 / WP §Output format)
 */
export function generateTokensCss(config: ResponsiveConfig): GeneratorResult {
  const tokens: GeneratedToken[] = []

  // 1. Override-driven tokens (V1: covers all 22 active tokens)
  for (const [name, override] of Object.entries(config.overrides)) {
    const clampCss = calculateClamp({
      minSize: override.minPx,
      maxSize: override.maxPx,
      minWidth: config.minViewport,
      maxWidth: config.maxViewport,
      relativeTo: 'viewport', // PF.2 — emits 'vi' (RTL-safe)
    })
    tokens.push({
      name,
      minPx: override.minPx,
      maxPx: override.maxPx,
      clampCss,
      source: name === '--space-section' ? 'special' : 'override',
    })
  }

  // 2. (Future) Type-scale-derived tokens — entries in stepMap NOT in overrides.
  //    V1: empty (every stepMap token has an explicit override).
  const typeScale = calculateTypeScale({
    minWidth: config.minViewport,
    maxWidth: config.maxViewport,
    minFontSize: config.type.baseAtMin,
    maxFontSize: config.type.baseAtMax,
    minTypeScale: config.type.ratioAtMin,
    maxTypeScale: config.type.ratioAtMax,
    positiveSteps: 6,
    negativeSteps: 3,
  })
  for (const [stepStr, entry] of Object.entries(config.type.stepMap)) {
    if (config.overrides[entry.token] !== undefined) continue
    const step = Number(stepStr)
    const stepData = typeScale.find((s) => s.step === step)
    if (!stepData) continue
    const clampCss = calculateClamp({
      minSize: stepData.minFontSize,
      maxSize: stepData.maxFontSize,
      minWidth: config.minViewport,
      maxWidth: config.maxViewport,
      relativeTo: 'viewport',
    })
    tokens.push({
      name: entry.overrides,
      minPx: stepData.minFontSize,
      maxPx: stepData.maxFontSize,
      clampCss,
      source: 'type-scale',
    })
  }

  // 3. (Future) Space-scale-derived tokens — multipliers entries NOT in overrides.
  //    V1: empty (every spacing token has an explicit override).
  const spaceScale = calculateSpaceScale({
    minWidth: config.minViewport,
    maxWidth: config.maxViewport,
    minSize: config.spacing.baseAtMin,
    maxSize: config.spacing.baseAtMax,
    positiveSteps: [1.5, 2, 2.5, 3, 4],
    negativeSteps: [0.75, 0.5, 0.25, 0.125],
  })
  // (Phase 2 V1: spaceScale is computed but not used — every multiplier is overridden.
  // Phase 3+ override-removal flow uses these as fallback values.)
  void spaceScale

  // 4. Validate via utopia-core checkWCAG (per Ruling #3)
  const wcagViolations = validate(config, tokens)
  for (const violation of wcagViolations) {
    const t = tokens.find((tok) => tok.name === violation.token)
    if (t) t.wcagViolation = violation
  }

  // 5. Emit CSS string
  const lines = [HEADER, '', ':root {']
  // Group: typography first, spacing second, special last (matches existing tokens.css order)
  const groups = [
    { label: '/* Typography — fluid clamps */', filter: (t: GeneratedToken) => t.name.includes('font-size') || t.name === '--text-display' },
    { label: '/* Spacing — fluid clamps */',    filter: (t: GeneratedToken) => t.name.startsWith('--spacing-') },
    { label: '/* Section rhythm */',             filter: (t: GeneratedToken) => t.name === '--space-section' },
  ]
  for (const group of groups) {
    const groupTokens = tokens.filter(group.filter)
    if (groupTokens.length === 0) continue
    lines.push('  ' + group.label)
    for (const t of groupTokens) {
      lines.push(`  ${t.name}: ${t.clampCss};`)
    }
    lines.push('')
  }
  // Trim trailing blank line + close
  while (lines[lines.length - 1] === '') lines.pop()
  lines.push('}')
  lines.push('')

  return {
    css: lines.join('\n'),
    tokens,
    wcagViolations,
  }
}
```

### Domain Rules

- **PF.2 (CRITICAL):** every `calculateClamp` call passes `relativeTo: 'viewport'` — produces `vi` units. WP §Output format key decision. Missing this → emits `vw` (RTL-unsafe) → snapshot diff at first commit.
- **Output format:** `clamp(min_rem, calc(intercept_rem + slope_vi), max_rem)` per WP. utopia-core formats this exactly.
- **Header comment:** AUTO-GENERATED warning + WP-030 reference. Matches Task 1.8's tokens.responsive.css header style.
- **Group ordering** — typography → spacing → special. Matches conventional `tokens.css` reading order.
- **No `void spaceScale` cleanup needed if linter complains** — comment + voiding marks "computed but unused in V1" intent. Hands may extract to a no-op until used.

---

## Task 2.4: Implement `validate.ts` — wraps `checkWCAG`

### What to Build

Create `tools/responsive-tokens-editor/src/lib/validate.ts`:

```ts
import { checkWCAG } from 'utopia-core'
import type { ResponsiveConfig, GeneratedToken, WcagViolation } from '../types'

/**
 * Per-token WCAG 1.4.4 ratio check (max ≤ 2.5× min) via utopia-core checkWCAG.
 * Returns one entry per violator; empty array if all clean.
 *
 * Per Ruling #3: NO manual ratio arithmetic — checkWCAG is canonical.
 *
 * checkWCAG contract (locked empirically 2026-04-26 — utopia-core@1.6.0):
 *   Signature: ({ min, max, minWidth, maxWidth }) => number[] | null
 *   Semantic contract:
 *     pass = null OR []     (no violation; null vs [] is non-deterministic
 *                            numeric-precision artifact of utopia-core internals —
 *                            do NOT rely on which shape is returned for any input)
 *     fail = [from, to]     length-2 number array; viewport-width bounds where
 *                            ratio > 2.5× violates. Cross-ref UtopiaStep.wcagViolation
 *                            which exposes { from, to } per scale-derived step.
 *
 * Bonus (non-blocking, Phase 3+ forward note): calculateTypeScale already returns
 * UtopiaStep[] with inline wcagViolation?: { from, to } | null per step. Future
 * scale-derived (override-removal) flow may consume that directly; V1 path
 * (every token is an explicit override → flat calculateClamp calls) goes through
 * this validate() function for uniform diagnostics.
 */
export function validate(
  config: ResponsiveConfig,
  tokens: GeneratedToken[],
): WcagViolation[] {
  const violations: WcagViolation[] = []
  for (const t of tokens) {
    const result = checkWCAG({
      min: t.minPx,
      max: t.maxPx,
      minWidth: config.minViewport,
      maxWidth: config.maxViewport,
    })
    if (isViolation(result)) {
      violations.push({
        token: t.name,
        minPx: t.minPx,
        maxPx: t.maxPx,
        reason: buildReason(result),
      })
    }
  }
  return violations
}

function isViolation(result: number[] | null): boolean {
  return Array.isArray(result) && result.length > 0
}

function buildReason(result: number[] | null): string {
  if (!isViolation(result)) return ''
  const [from, to] = result as number[]
  return `WCAG 1.4.4 violation; ratio > 2.5× across viewport ${from.toFixed(0)}–${to.toFixed(0)}px`
}
```

### MANDATORY drift sanity-check at execution start

Contract was empirically locked Phase 2 pre-flight RECON (2026-04-26 — Hands' Brain-approval round-trip; refined post-amendment 2026-04-26). Confirm no drift since. Tests SEMANTIC contract only — `null` vs `[]` for pass cases is **non-deterministic numeric-precision artifact** of utopia-core (e.g. `(16, 40)` returns `[]` while `(10, 25)` returns `null` despite both having ratio === 2.5 exact). Both shapes mean "no violation".

```bash
cd tools/responsive-tokens-editor && node -e "
const { checkWCAG } = require('utopia-core');
const isViolation = (r) => Array.isArray(r) && r.length > 0;
const a = checkWCAG({ min: 16, max: 18, minWidth: 375, maxWidth: 1440 });
const b = checkWCAG({ min: 16, max: 40, minWidth: 375, maxWidth: 1440 });
const c = checkWCAG({ min: 10, max: 30, minWidth: 375, maxWidth: 1440 });
console.log('clean pass (16-18, ratio 1.125):', JSON.stringify(a), '→', isViolation(a) ? 'FAIL' : 'pass');
console.log('boundary pass (16-40, ratio 2.5):', JSON.stringify(b), '→', isViolation(b) ? 'FAIL' : 'pass');
console.log('fail (10-30, ratio 3.0):', JSON.stringify(c), '→', isViolation(c) ? 'fail' : 'PASS');
"
```

Expected output (semantic contract):

```
clean pass (16-18, ratio 1.125): <null|[]> → pass
boundary pass (16-40, ratio 2.5): <null|[]> → pass     // either shape is valid; non-deterministic
fail (10-30, ratio 3.0): [<from>,<to>] → fail          // numbers ARE viewport-width bounds where ratio > 2.5× violates
```

The semantic contract: **pass = `null` OR `[]`; fail = length-2 number array `[from, to]`**. Adapter `isViolation = Array.isArray(result) && result.length > 0` correctly handles BOTH pass shapes via short-circuit.

If actual output structurally differs (Promise, throws, different ndim like `{ violations: [...] }`, no length-2 array on fail) → STOP, surface to Brain. Do NOT silently adapt — that's how invented constants leak in. The locked array-or-null sentinel pattern is the spec contract.

### Domain Rules

- **Ruling #3:** zero manual ratio arithmetic. The `min/max ≤ 2.5×` rule is encoded inside utopia-core. We ONLY consume the result.
- **`tokens` parameter is iterated** — not `config.overrides` directly. Reason: we want validation on the EFFECTIVE rendered values, including future scale-derived tokens, not just override entries.
- **Brain ruling escalation (post pre-flight):** `number[] | null` IS the locked expected shape. Escalate ONLY on TRUE exotic shapes (Promise, throw, completely different ndim like `{ violations: [...] }`). The drift sanity-check at execution start is the gate.

---

## Task 2.5: Implement `config-io.ts` — Vite middleware contract

### What to Build

Create `tools/responsive-tokens-editor/src/lib/config-io.ts`:

```ts
import type { ResponsiveConfig, LoadConfigResult, SaveConfigResult } from '../types'

/**
 * Load responsive-config.json from disk via the Vite dev-server fs bridge.
 *
 * Phase 2: function signature only — body returns null (file not yet wired).
 * Phase 6: wires GET /api/load-config to the Vite middleware that reads
 *   packages/ui/src/theme/responsive-config.json via fs.readFile.
 *
 * Returns null if file missing — Phase 3 falls back to defaults.ts.
 */
export async function loadConfig(): Promise<LoadConfigResult> {
  // Phase 6 wires this via fetch('/api/load-config'). Phase 2: stub.
  return null
}

/**
 * Save responsive-config.json + regenerated tokens.responsive.css to disk.
 *
 * Phase 2: function signature only — body returns { ok: false, error: 'phase-6-not-yet' }.
 * Phase 6: wires POST /api/save-config to the Vite middleware that:
 *   1. Validates config via validate.ts
 *   2. Writes packages/ui/src/theme/responsive-config.json (JSON.stringify pretty)
 *   3. Generates CSS via generator.ts and writes packages/ui/src/theme/tokens.responsive.css
 *   4. Applies save-safety contract (6 rules per infra-tooling SKILL):
 *      first-save .bak, no-creates, slug-equivalent path safety, etc.
 */
export async function saveConfig(_config: ResponsiveConfig): Promise<SaveConfigResult> {
  // Phase 6 wires this via fetch('/api/save-config', { method: 'POST', body: ... }).
  // Phase 2: stub.
  return { ok: false, error: 'phase-6-not-yet-implemented' }
}
```

### Domain Rules

- **Phase 2 = engine-only.** No actual fs I/O. Stub return values document the Phase 6 contract.
- **Save-safety contract (6 rules)** — documented in JSDoc; Phase 6 implementation enforces.
- **No Vite plugin / `configureServer` in Phase 2.** Just the client-side function signatures. Phase 6 adds the matching middleware in `vite.config.ts`.

---

## Task 2.6: Tests — `generator` + `defaults` + `validate`

### What to Build

Three test files in `tools/responsive-tokens-editor/src/__tests__/`:

#### `generator.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { generateTokensCss } from '../lib/generator'
import { conservativeDefaults } from '../lib/defaults'

describe('generator — V1 conservative defaults', () => {
  const result = generateTokensCss(conservativeDefaults)

  it('emits exactly 22 tokens (10 typography + 11 spacing + 1 special)', () => {
    expect(result.tokens).toHaveLength(22)
  })

  it('every token clampCss uses vi units (RTL-safe per WP §Output format)', () => {
    for (const t of result.tokens) {
      expect(t.clampCss).toMatch(/vi\)/)
      expect(t.clampCss).not.toMatch(/vw\)/)
    }
  })

  it('every token clampCss is a clamp() expression', () => {
    for (const t of result.tokens) {
      expect(t.clampCss).toMatch(/^clamp\(/)
    }
  })

  it('zero WCAG violations on V1 defaults', () => {
    expect(result.wcagViolations).toEqual([])
  })

  it('matches locked snapshot — Brain ruling 1 conservative-defaults table baseline', () => {
    // Snapshot ground truth per saved memory feedback_snapshot_ground_truth.
    // Future changes to defaults.ts → review this snapshot diff explicitly.
    expect(result.css).toMatchSnapshot()
  })

  it('header includes WP-030 reference + AUTO-GENERATED warning', () => {
    expect(result.css).toContain('AUTO-GENERATED')
    expect(result.css).toContain('WP-030')
    expect(result.css).toContain('do not edit manually')
  })

  it('preserves desktop static for every existing token (maxPx = current static)', () => {
    const tokenStaticMap = new Map<string, number>([
      ['--h1-font-size', 54],
      ['--h2-font-size', 42],
      ['--h3-font-size', 32],
      ['--h4-font-size', 26],
      ['--text-lg-font-size', 20],
      ['--text-base-font-size', 18],
      ['--text-sm-font-size', 15],
      ['--text-xs-font-size', 13],
      ['--caption-font-size', 14],
      ['--spacing-3xs', 2], ['--spacing-2xs', 4], ['--spacing-xs', 8],
      ['--spacing-sm', 12], ['--spacing-md', 16], ['--spacing-lg', 20],
      ['--spacing-xl', 24], ['--spacing-2xl', 32], ['--spacing-3xl', 40],
      ['--spacing-4xl', 48], ['--spacing-5xl', 64],
    ])
    for (const [name, expectedStatic] of tokenStaticMap) {
      const t = result.tokens.find((tok) => tok.name === name)
      expect(t, `token ${name} missing from output`).toBeDefined()
      expect(t!.maxPx, `token ${name} maxPx must equal desktop static`).toBe(expectedStatic)
    }
  })
})
```

#### `defaults.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { conservativeDefaults } from '../lib/defaults'

describe('conservativeDefaults — V1 ruling-locked values', () => {
  it('viewport range is 375-1440 px', () => {
    expect(conservativeDefaults.minViewport).toBe(375)
    expect(conservativeDefaults.maxViewport).toBe(1440)
  })

  it('type base 16/18 px; ratio 1.2/1.25 (Minor Third → Major Third)', () => {
    expect(conservativeDefaults.type.baseAtMin).toBe(16)
    expect(conservativeDefaults.type.baseAtMax).toBe(18)
    expect(conservativeDefaults.type.ratioAtMin).toBeCloseTo(1.2)
    expect(conservativeDefaults.type.ratioAtMax).toBeCloseTo(1.25)
  })

  it('spacing base 16/20 px', () => {
    expect(conservativeDefaults.spacing.baseAtMin).toBe(16)
    expect(conservativeDefaults.spacing.baseAtMax).toBe(20)
  })

  it('exactly 22 override entries (10 typography + 11 spacing + 1 special)', () => {
    expect(Object.keys(conservativeDefaults.overrides)).toHaveLength(22)
  })

  it('--text-display ruling 1.a: 28-64 (preserves WP-024 hero scaffold)', () => {
    const o = conservativeDefaults.overrides['--text-display']
    expect(o).toBeDefined()
    expect(o.minPx).toBe(28)
    expect(o.maxPx).toBe(64)
  })

  it('--space-section ruling 1.b: 52-96 (tightened from 24-96 to satisfy WCAG)', () => {
    const o = conservativeDefaults.overrides['--space-section']
    expect(o).toBeDefined()
    expect(o.minPx).toBe(52)
    expect(o.maxPx).toBe(96)
    expect(o.maxPx / o.minPx).toBeLessThanOrEqual(2.5)
  })

  it('every typography override maxPx = tokens.css static (preserve desktop)', () => {
    // Cross-references Phase 0 §0.6 + Phase 2 pre-flight grep
    const expected: Record<string, number> = {
      '--h1-font-size': 54, '--h2-font-size': 42, '--h3-font-size': 32, '--h4-font-size': 26,
      '--text-lg-font-size': 20, '--text-base-font-size': 18,
      '--text-sm-font-size': 15, '--text-xs-font-size': 13, '--caption-font-size': 14,
    }
    for (const [token, staticPx] of Object.entries(expected)) {
      expect(conservativeDefaults.overrides[token].maxPx).toBe(staticPx)
    }
  })

  it('every override has WCAG ratio max/min ≤ 2.5×', () => {
    for (const [name, override] of Object.entries(conservativeDefaults.overrides)) {
      const ratio = override.maxPx / override.minPx
      expect(ratio, `${name} ratio ${ratio} exceeds WCAG 2.5×`).toBeLessThanOrEqual(2.5)
    }
  })

  it('mobile reduction percentage ≤ 20% on every override (ruling 1.c borderline cap)', () => {
    for (const [name, o] of Object.entries(conservativeDefaults.overrides)) {
      // Skip --text-display + --space-section — these are intentionally aggressive
      // (greenfield tokens with no current static to preserve)
      if (name === '--text-display' || name === '--space-section') continue
      const reduction = (o.maxPx - o.minPx) / o.maxPx
      expect(reduction, `${name} reduction ${(reduction * 100).toFixed(1)}% exceeds 20% cap`).toBeLessThanOrEqual(0.2 + 0.001)
    }
  })

  it('spacing 6xl..10xl excluded per Phase 0 escalation (a)', () => {
    expect(conservativeDefaults.overrides['--spacing-6xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-7xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-8xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-9xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-10xl']).toBeUndefined()
  })
})
```

#### `validate.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { validate } from '../lib/validate'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
import type { ResponsiveConfig } from '../types'

describe('validate — WCAG 1.4.4 via utopia-core checkWCAG', () => {
  it('zero violations on V1 conservative defaults', () => {
    const result = generateTokensCss(conservativeDefaults)
    const violations = validate(conservativeDefaults, result.tokens)
    expect(violations).toEqual([])
  })

  it('flags aggressive override (ratio > 2.5×)', () => {
    const aggressive: ResponsiveConfig = {
      ...conservativeDefaults,
      overrides: {
        ...conservativeDefaults.overrides,
        '--h1-font-size': { minPx: 16, maxPx: 60, reason: 'test — ratio 3.75 exceeds cap' },
      },
    }
    const result = generateTokensCss(aggressive)
    expect(result.wcagViolations.length).toBeGreaterThan(0)
    expect(result.wcagViolations.some((v) => v.token === '--h1-font-size')).toBe(true)
  })

  it('borderline ratio = 2.5× passes', () => {
    const borderline: ResponsiveConfig = {
      ...conservativeDefaults,
      overrides: {
        ...conservativeDefaults.overrides,
        '--h1-font-size': { minPx: 20, maxPx: 50, reason: 'test — exact 2.5× borderline' },
      },
    }
    const result = generateTokensCss(borderline)
    const h1Violation = result.wcagViolations.find((v) => v.token === '--h1-font-size')
    expect(h1Violation, 'borderline 2.5× must pass').toBeUndefined()
  })
})
```

### Snapshot first-write workflow

The first `npm test` run will FAIL on `generator.test.ts` snapshot assertion (no `.snap` file exists yet) — Vitest auto-writes the snapshot on first run with `--update`. Procedure:

```bash
cd tools/responsive-tokens-editor && npm test -- --update
# Review the generated src/__tests__/__snapshots__/generator.test.ts.snap
# Verify CSS output is sane (correct token count, vi units, header, group order)
# Commit the .snap file alongside generator.ts in this phase's commit
```

**Brain reviews snapshot output before commit.** Hands writes result.md `§ Snapshot review` block with the actual generated CSS string for Brain inspection. If Brain approves → commit. If Brain pushes back → adjust generator.ts/defaults.ts and regenerate.

### Domain Rules

- **`feedback_snapshot_ground_truth`:** snapshot is locked baseline. Brain reviews FIRST capture explicitly. Future engine changes review snapshot diff explicitly.
- **`feedback_vitest_css_raw`:** Phase 1 already set `test: { css: true }` in `vite.config.ts`. Snapshot tests rely on this; do NOT remove.
- **`feedback_empirical_over_declarative`:** snapshot test verifies AC #5 (matches locked baseline) BEFORE marking the AC tick. Honest skip beats rubber-stamped tick — if snapshot review surfaces drift, fix BEFORE green.

---

## Files to Modify

| File | Change | Description |
|---|---|---|
| `tools/responsive-tokens-editor/src/types.ts` | replaced | full ResponsiveConfig + supporting types (Phase 1 stub removed) |
| `tools/responsive-tokens-editor/src/lib/defaults.ts` | created | 22-token conservative V1 defaults — ruling-locked values |
| `tools/responsive-tokens-editor/src/lib/generator.ts` | created | utopia-core integration; emits CSS string with vi units |
| `tools/responsive-tokens-editor/src/lib/validate.ts` | created | wraps checkWCAG (Ruling #3) — adapter shape after pre-flight |
| `tools/responsive-tokens-editor/src/lib/config-io.ts` | created | Vite middleware contract scaffolding (Phase 6 wires fs) |
| `tools/responsive-tokens-editor/src/__tests__/generator.test.ts` | created | snapshot lock + 7 assertions on generator output |
| `tools/responsive-tokens-editor/src/__tests__/defaults.test.ts` | created | 9 assertions on conservative-defaults values |
| `tools/responsive-tokens-editor/src/__tests__/validate.test.ts` | created | 3 assertions on WCAG validation behavior |
| `tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap` | created | locked snapshot — Brain reviews first capture |
| `src/__arch__/domain-manifest.ts` | modified | +7 entries to `infra-tooling.owned_files` (4 lib + 3 tests) |

**Created:** 9 files (7 source + 1 snap + 0 manifest entry for snap per block-forge precedent — verify via grep)
**Modified:** 2 files (`types.ts` content edit + `domain-manifest.ts`)

**Manifest delta:** +7 (lib/{config-io,generator,defaults,validate}.ts + __tests__/{generator,defaults,validate}.test.ts). The `.snap` file is NOT registered (block-forge precedent — verify via `grep '__snapshots__' src/__arch__/domain-manifest.ts`).

**Arch-test target:** 513 + 7 = **520 / 0**.

---

## Acceptance Criteria

- [ ] `tools/responsive-tokens-editor/src/types.ts` exports `ResponsiveConfig`, `StepMapEntry`, `TokenOverride`, `GeneratedToken`, `WcagViolation`, `GeneratorResult`, `LoadConfigResult`, `SaveConfigResult` (8 type exports). Phase1Stub removed.
- [ ] `defaults.ts` exports `conservativeDefaults: ResponsiveConfig` with EXACTLY 22 entries in `overrides` (10 typography + 11 spacing + 1 special).
- [ ] Every override row matches Phase 0 §0.6 conservative-defaults table verbatim — typography maxPx = tokens.css static; ruling 1.a `--text-display: 28-64`; ruling 1.b `--space-section: 52-96`; ruling 1.c borderline 20% rows preserved.
- [ ] `generator.ts::generateTokensCss(config)` returns `GeneratorResult` with `tokens.length === 22`, every `clampCss` containing `vi)` (NOT `vw)`), `wcagViolations === []` for V1 defaults.
- [ ] `validate.ts::validate(config, tokens)` wraps `utopia-core.checkWCAG` per Ruling #3 — zero manual ratio arithmetic; helper shape adapted post-pre-flight runtime probe.
- [ ] `config-io.ts::loadConfig()` returns `null`; `saveConfig(...)` returns `{ ok: false, error: 'phase-6-not-yet-implemented' }`. Documented JSDoc references Phase 6 contract.
- [ ] `__snapshots__/generator.test.ts.snap` exists; Brain has reviewed first capture; result.md `§ Snapshot review` section quotes the generated CSS for explicit approval.
- [ ] `npm -C tools/responsive-tokens-editor test` runs all 3 test suites green: generator (7 assertions + 1 snapshot), defaults (9 assertions), validate (3 assertions). Total ≥ 19 vitest assertions; 0 fail; 0 skip.
- [ ] `npm run responsive-tokens-editor:typecheck` exits 0.
- [ ] `npm run arch-test` returns **520 / 0** (513 baseline + 7 new owned_files).
- [ ] No edits to: `apps/`, `content/`, `tools/block-forge/`, `tools/layout-maker/`, `packages/ui/src/theme/tokens.responsive.css` (Phase 6 owns regeneration), `packages/ui/src/theme/tokens.css` (off-limits).
- [ ] `content/db/blocks/fast-loading-speed.json` (and `.bak`) untouched per side observation Ruling.
- [ ] No emojis in any source file.

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. Drift sanity-check on locked checkWCAG SEMANTIC contract (pass = null OR [], fail = [from, to])
# NOTE: Tests SEMANTIC contract only — null vs [] for pass cases is non-deterministic
# numeric-precision artifact of utopia-core internals (per refined PF.4). Do NOT assert
# specific shape per input; assert pass/fail behavior via adapter's isViolation predicate.
cd tools/responsive-tokens-editor && node -e "
const { checkWCAG } = require('utopia-core');
const isViolation = (r) => Array.isArray(r) && r.length > 0;
const a = checkWCAG({ min: 16, max: 18, minWidth: 375, maxWidth: 1440 });  // ratio 1.125 — pass
const b = checkWCAG({ min: 16, max: 40, minWidth: 375, maxWidth: 1440 });  // ratio 2.5 — pass (boundary)
const c = checkWCAG({ min: 10, max: 30, minWidth: 375, maxWidth: 1440 });  // ratio 3.0 — fail
const ok = !isViolation(a)
        && !isViolation(b)
        && isViolation(c) && c.length === 2;
console.log('contract drift:', ok ? '✅ HOLD' : '❌ DRIFT — STOP, surface to Brain');
console.log('clean:', JSON.stringify(a), '/ edge:', JSON.stringify(b), '/ fail:', JSON.stringify(c));
"
echo "(expect: ✅ HOLD — semantic contract intact; null vs [] for pass is utopia-core numeric-precision detail)"

# 2. Typecheck
npm run responsive-tokens-editor:typecheck
echo "(expect: tsc exits 0)"

# 3. Tests
cd tools/responsive-tokens-editor && npm test
echo "(expect: 3 test files green, ≥19 assertions, 0 fail, 0 skip)"

# 4. Snapshot exists
ls tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: file exists; Hands quotes content in result.md § Snapshot review)"

# 5. Verify vi units in snapshot
grep -c 'vi)' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: ≥22 — every token clamp uses vi)"

grep -c 'vw)' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: 0 — RTL-safe per WP §Output format)"

# 6. Arch-test
npm run arch-test
echo "(expect: 520 / 0 — 513 baseline + 7 new owned_files)"

# 7. No scope creep
git status --short | grep -v 'tools/responsive-tokens-editor/' | grep -v 'logs/wp-030/' | grep -v 'src/__arch__/domain-manifest.ts' && echo "❌ unexpected files touched" || echo "✅ scope held"

# 8. Phase 1 stub fully removed
grep -c 'Phase1Stub' tools/responsive-tokens-editor/src/types.ts
echo "(expect: 0 — Phase 1 stub replaced)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (and BEFORE committing), create `logs/wp-030/phase-2-result.md`:

```markdown
# Execution Log: WP-030 Phase 2 — Config schema + math engine

> Epic: WP-030 Responsive Tokens Editor
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Phase 1 baseline: `d8c5498a`
> Domains affected: infra-tooling (NEW: 7 engine + test files)

## What Was Implemented
{2-5 sentences — types replaced, defaults seeded, generator emits CSS with vi units, validate wraps checkWCAG, config-io stubbed for Phase 6, snapshot locked}

## Pre-flight findings
- checkWCAG runtime return shape: {actual JSON shape from runtime probe}
- validate.ts adapter implementation: {one-line description matching shape}
- Other surprises: {any}

## Snapshot review (BRAIN INSPECTS BEFORE COMMIT)

\`\`\`css
{paste full content of __snapshots__/generator.test.ts.snap here}
\`\`\`

**Brain verdict:** [ ] APPROVED → commit / [ ] PUSHBACK on {row} → adjust defaults.ts/generator.ts and regenerate

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| `relativeTo: 'viewport'` (not default 'viewport-width') | yes | PF.2 + WP §Output format key decision — emits vi (RTL-safe) |
| validate.ts adapter shape | matches runtime probe | Ruling #3 — no manual ratio arithmetic |
| Snapshot lock | first capture committed | feedback_snapshot_ground_truth — future diffs reviewed explicitly |
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `tools/responsive-tokens-editor/src/types.ts` | replaced | ... |
| ... (8 more rows) ... | ... | ... |

## Issues & Workarounds
{Anything surprising about utopia-core API at runtime; "None" if clean}

## Open Questions
{Carry-forward to Phase 3 if any. "None" if all rulings consolidate.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ 520 / 0 (513 + 7 new owned_files) |
| typecheck | ✅ clean |
| Tests | ✅ 3 files green, {N} assertions, 0 fail/skip |
| Snapshot vi-only | ✅ {N} 'vi)' / 0 'vw)' |
| utopia-core runtime probe documented | ✅ |
| Phase1Stub removed | ✅ |
| Scope held | ✅ |

## 7 rulings status (Phase 2)
| # | Status | Phase 2 encoding location |
|---|--------|---------------------------|
| 1.a `--text-display` 28-64 | ✅ encoded | `defaults.ts` overrides + `defaults.test.ts` ruling 1.a assertion |
| 1.b `--space-section` 52-96 | ✅ encoded | `defaults.ts` overrides + `defaults.test.ts` ruling 1.b assertion |
| 1.c borderline 20% rows | ✅ encoded | `defaults.ts` overrides + `defaults.test.ts` 20% cap assertion |
| 2 GREEN + 3 caveats | carried | (i)+(ii) → Phase 3 spec; (iii) → Phase 6 PARITY |
| 3 utopia-core no drift + checkWCAG | ✅ encoded | `validate.ts` adopts checkWCAG; manual arithmetic absent |
| 4 Phase 6.3 docs-only | carried | Phase 6 amendment when Phase 6 starts |
| side fast-loading-speed.json M | held | NOT touched (verified via git status) |

## Git
- Phase 2 commit: `{sha}` — `feat(wp-030): Phase 2 — config schema + math engine + locked snapshot [WP-030 phase 2]`
```

---

## Git

```bash
git add tools/responsive-tokens-editor/src/types.ts \
        tools/responsive-tokens-editor/src/lib/ \
        tools/responsive-tokens-editor/src/__tests__/ \
        src/__arch__/domain-manifest.ts \
        logs/wp-030/phase-2-result.md \
        logs/wp-030/phase-2-task.md

git commit -m "feat(wp-030): Phase 2 — config schema + math engine + locked snapshot [WP-030 phase 2]"
```

---

## IMPORTANT Notes for CC (Hands)

- **READ Phase 0 §0.4 + §0.6 BEFORE writing defaults.ts.** Every minPx/maxPx pair is locked by Brain rulings — invented values cause snapshot misalignment.
- **READ Phase 1 vite.config.ts** to confirm `test: { css: true }` is set. Snapshot test depends on this.
- **checkWCAG contract LOCKED empirically pre-approval** (utopia-core@1.6.0, 2026-04-26; refined post-amendment): `({ min, max, minWidth, maxWidth }) => number[] | null`. **Semantic contract (definitive):** pass = `null` OR `[]`; fail = length-2 number array `[from, to]` (viewport-width bounds where ratio > 2.5× violates). The `null` vs `[]` distinction for pass cases is a **non-deterministic numeric-precision artifact** of utopia-core internals — both shapes mean "no violation". Adapter `isViolation = Array.isArray(result) && result.length > 0` correctly short-circuits both pass shapes (null fails Array.isArray; [] fails length > 0). `validate.ts` helpers shape-aware from line 1 — no stub-replacement step. Drift sanity-check at execution start (verification §1) tests SEMANTIC contract only, not specific shape per input.
- **PASS `relativeTo: 'viewport'` to EVERY `calculateClamp` invocation.** Missing this → `vw` units → RTL-unsafe → snapshot diff at first commit. PF.2 is non-negotiable.
- **Snapshot review gate.** Hands quotes the generated CSS in result.md `§ Snapshot review` block. Brain reviews + approves BEFORE Hands commits. Do NOT auto-commit the snap file.
- **DO NOT touch:**
  - `apps/` (any app)
  - `content/db/` (any block JSON, especially `fast-loading-speed.json` per side observation)
  - `tools/block-forge/` (reference only — read, don't write)
  - `tools/layout-maker/` (unrelated)
  - `packages/ui/src/theme/tokens.css` (Figma-synced, off-limits)
  - `packages/ui/src/theme/tokens.responsive.css` (Phase 6 regenerates; Phase 2 only consumes static values for cross-reference)
  - `packages/ui/src/theme/responsive-config.json` (Phase 6 first-saves it)
- **STOP and surface to Brain immediately if:**
  - utopia-core checkWCAG return drifts from locked `number[] | null` contract (Promise, throw, completely different ndim like `{ violations: [...] }`) — escalate; do NOT silently adapt. The drift sanity-check at execution start surfaces this in 5 seconds.
  - utopia-core's `relativeTo: 'viewport'` stops emitting `vi` (semver patch surprise) — RTL-safety key decision broken; escalate
  - generator output CSS has any `vw)` substring — should be `vi)` only
  - any token in `defaults.ts` has minPx/maxPx that doesn't match Phase 0 §0.6 — invented constants slipping; cross-reference table verbatim
  - snapshot review surfaces structural drift from rulings (e.g., ratio fail somewhere, missing token group, wrong unit) — adjust BEFORE green
  - arch-test ≠ 520 (more — SKILL parity unexpectedly triggered; less — registration off)
  - typecheck fails on ResponsiveConfig consumers — types.ts shape may not match what generator/validate import

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
