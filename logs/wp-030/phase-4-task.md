# Task: WP-030 Phase 4 — Token Preview Grid + Per-Token Override Editor

> Epic: WP-030 Responsive Tokens Editor
> Phase 3 baseline (Global Scale UI + WCAG banner): `45a8e973` (+ doc fixup `95d4fb35`)
> Phase 2 baseline (engine + locked snapshot): `ddec80e4` (+ doc fixup `f17a66e7`)
> Phase 1 baseline (Vite scaffold): `d8c5498a`
> Phase 0 baseline (RECON): `4f487154`
> Status: 🟡 PLANNED — awaiting user approval; pre-flight RECON COMPLETE (Brain RECON 2026-04-26 — see PF.15–PF.20)
> Estimated effort: 8-10h
> Domains affected: infra-tooling (NEW: 2 components + 2 tests)

## Goal

User opens `tools/responsive-tokens-editor/` at `:7703`, sees the **Token Preview Grid** below the Global Scale form. Grid renders all **22 active tokens** in 3 sub-sections (Typography 10 + Spacing 11 + Section rhythm 1), each row showing token name + 3 columns `@375 / @768 / @1440` (computed values) + override badge + WCAG warning indicator + edit toggle. Clicking edit on a row expands an **inline override editor** (minPx + maxPx + reason text + "Use scale" toggle when scale fallback exists). Editing values reflects immediately in: row columns, top-level WcagBanner (PF.14 form-trigger gap closes here), and per-row WCAG indicator.

**Crucially out of scope:**
- ContainerWidthsEditor (Phase 5 — `--container-max-w` + `--container-px` discrete @media values)
- LivePreviewRow (Phase 5 — sample H1+H2+body iframes at 3 widths)
- Save-to-disk + cross-surface PARITY (Phase 6)
- Edit-multipliers toggle inside GlobalScaleConfig (Phase 5+ polish)
- Locale-aware number formatting (Phase 5+ polish; en-US period-decimal works for V1)

Phase 4 is **per-token override-editing UI surface** ONLY.

## Inputs

- Phase 3 orchestrator: `App.tsx` (75 lines, single `useState<ResponsiveConfig>` + 2 `useMemo` derivations + cancel-flag mount-once `useEffect`)
- Phase 2 engine ready: `defaults.ts::conservativeDefaults` (22 explicit overrides), `generator.ts::generateTokensCss()` (returns `result.tokens: GeneratedToken[]`), `validate.ts::validate()` (returns `WcagViolation[]` keyed by token name)
- `types.ts::ResponsiveConfig.overrides: Record<string, TokenOverride>` where `TokenOverride = { minPx, maxPx, reason? }`
- `types.ts::GeneratedToken` shape: `{ name, minPx, maxPx, clampCss, source: 'override'|'type-scale'|'space-scale'|'special', wcagViolation? }`
- Phase 0 §0.6 conservative-defaults table — 22 tokens locked, all WCAG-clean (no row-level violation in V1 baseline)
- Phase 3 patterns to mirror: nested-shape merge (`{ ...config, type: { ...config.type, X: n } }`), no-hardcode discipline, jsdom per-file directive, afterEach(cleanup) hook

## Outputs

- 2 NEW components: `TokenPreviewGrid.tsx`, `TokenOverrideEditor.tsx`
- App.tsx: 1-line composition addition (insert `<TokenPreviewGrid />` between `<GlobalScaleConfig />` and `<ResetButton />` in `<main>`)
- 2 NEW test files: `TokenPreviewGrid.test.tsx`, `TokenOverrideEditor.test.tsx`
- Manifest: +4 entries to `infra-tooling.owned_files` (2 components + 2 tests)
- 0 changes to: `lib/*`, `types.ts`, `setupTests.ts`, `vite.config.ts`, `package.json`, `globals.css`

## Dependencies

- `App.tsx::config` state (Phase 3 — single source of truth)
- `App.tsx::result` useMemo result (Phase 3 — provides `result.tokens` to grid)
- `App.tsx::violations` useMemo result (Phase 3 — provides per-row WCAG lookup)
- `validate.ts::WcagViolation.token` keying convention (used to filter violations per row)
- `generator.ts` token-grouping filter pattern (lines 105-109 — reuse for Phase 4 grid sections)

## Pre-empted findings (carry from Phase 0 → 1 → 2 → 3)

- **PE.1** cd-pattern in npm scripts — Phase 4 noop (no new root scripts).
- **PE.2** install dance — Phase 4 noop (no new deps; `@cmsmasters/ui` workspace dep STILL deferred per PF.15).

Plus **Phase 4 pre-flight findings** (Brain RECON 2026-04-26):

- **PF.15** `@cmsmasters/ui` workspace dep STILL deferred. Phase 4 uses **inline-expand pattern** (per-row collapse/expand) instead of Drawer/Dialog modal. Rationale: (a) avoids install-dance + `resolve.dedupe`/`alias` config complexity that PF.5+PF.6 flagged; (b) inline-expand keeps editor near row data — better tabular ergonomics; (c) zero portal/focus-management concerns; (d) simpler tests (no React Testing Library portal handling). PF.5+PF.6 stay parked; activate only if user pushes back during review for explicit modal pattern.

- **PF.16** `--space-section` is `source: 'special'` per `generator.ts:44` — has NO stepMap entry NOR multiplier entry, so removing its override leaves no scale fallback. **TokenOverrideEditor MUST disable "Use scale" toggle** for special-source rows (rendered as "no scale fallback for this token"). Other 21 rows have valid fallbacks: typography → `config.type.stepMap` (10 tokens), spacing → `config.spacing.multipliers` (11 tokens).

- **PF.17** `config.overrides` mutation pattern lock — Phase 4 mutates via two operations:
  - **Set/update**: `{ ...config, overrides: { ...config.overrides, [tokenName]: { minPx, maxPx, reason } } }`
  - **Clear (Use scale)**: `const { [tokenName]: _, ...rest } = config.overrides; { ...config, overrides: rest }` (destructure-omit; `delete` mutates and is forbidden in immutable React state)
  - **Reason field optional**: omit from override object if user clears the text input — `reason` is `?` in `TokenOverride` type; absent vs empty-string both valid; prefer absent for cleanliness.

- **PF.18** 22-token contract preserved — Phase 4 does NOT modify `defaults.ts`, `generator.ts`, `validate.ts`, or `types.ts`. Phase 2 snapshot regression (22 `vi`, 0 `vw` in `__snapshots__/generator.test.ts.snap`) MUST hold. Verification §4 confirms.

- **PF.19** **@768 column linear interpolation formula** = utopia-clamp output match. Formula:
  ```
  if viewport ≤ minViewport → return minPx
  if viewport ≥ maxViewport → return maxPx
  else → minPx + (viewport - minViewport) / (maxViewport - minViewport) × (maxPx - minPx)
  ```
  For V1 conservative-defaults (minViewport=375, maxViewport=1440), @768 ratio = (768-375)/(1440-375) = 393/1065 ≈ 0.3690. e.g., `--text-display` {minPx: 28, maxPx: 64} → @768 ≈ 28 + 0.369 × 36 = 41.28 → display "41 px" (round to integer for grid; 1-decimal would over-precise the visual).
  Pure function — extract `valueAtViewport(token, viewport, config) → number` for testability.

- **PF.20** Vitest config carry — `setupFiles: ['./src/setupTests.ts']` + `css: true` + `afterEach(cleanup)` hook from Phase 3 are sufficient for Phase 4 component tests. NO `vite.config.ts` or `setupTests.ts` changes. PF.13 cleanup hook covers multi-render scenarios in TokenPreviewGrid tests (22 rows + 22 expand/collapse states would otherwise compound).

---

## Domain Context

### `infra-tooling` (PRIMARY — owns all Phase 4 code)

- **Saved memory — `feedback_use_design_agents`** says: spawn UX Architect + UI Designer agents before building new UI components. **Phase 4 evaluation:** TokenPreviewGrid is the meatier UI surface in this WP (22 rows × 5+ columns × inline expand), but scope remains internal authoring tool (single-author, Dmytro), not customer-facing. Existing layout-maker tabular patterns (`TokenReference.tsx`, `BreakpointBar.tsx`) provide reference. Phase 3 already established the chrome (typography hierarchy, color palette, spacing rhythm, input control patterns). Phase 4 reuses these — design surface is incremental, not novel. **Skip design-agent spawn for Phase 4** — same reasoning as Phase 3. If user pushes back during review with "this needs more polish", retroactively spawn UI Designer for Phase 5 or as a polish pass.
- **Saved memory — `feedback_no_hardcoded_styles`** is HARD GATE — every color/font/size/spacing must use `tokens.css` vars via Tailwind classes. Phase 3 pattern (`bg-[hsl(var(--background))]`, `text-[length:var(--text-sm-font-size)]`, `border-[hsl(var(--destructive-border))]`) is the template.
- **Saved memory — `feedback_visual_check_mandatory`** — Phase 4 is UI-touching → MUST run live Playwright/Chrome verification in same session before commit. Verification §7 spec'd below; 5 screenshots minimum (baseline grid, expanded editor, edited override min, "Use scale" toggle, WCAG-trigger via aggressive override).
- **Saved memory — `feedback_radix_slot_aschild`** — N/A in Phase 4 (no `asChild` primitives; `<button>` + `<input>` + `<table>` HTML only).
- **Saved memory — `feedback_lint_ds_fontfamily`** — Phase 4 components inherit Manrope from body (Phase 1 globals.css); never set `fontFamily:` inline.
- **Saved memory — `feedback_vitest_globals_false_cleanup`** (PF.13 lock) — Phase 3's `afterEach(cleanup)` in setupTests.ts already covers Phase 4 multi-render tests; Phase 4 inherits, no setupTests changes.
- **Saved memory — `feedback_external_lib_semantic_contract`** — Phase 4 does NOT touch `validate.ts` (which locks utopia-core checkWCAG semantic contract). Per-row WCAG lookup uses `WcagViolation[]` shape only — no contract drift risk.
- **Saved memory — `feedback_fixture_snapshot_ground_truth`** — Phase 2 snapshot remains the canonical reference for engine output; verification §4 grep-confirms it untouched.

### `pkg-ui` (NOT TOUCHED IN PHASE 4)

- Phase 4 does NOT modify `tokens.responsive.css` (Phase 6 owns regeneration), `tokens.css` (off-limits — Figma-synced), or `responsive-config.json` (Phase 6 first-creates).
- Phase 4 imports ZERO modules from `@cmsmasters/ui` (verified clean per PF.15).

### `studio-blocks` (NOT TOUCHED IN PHASE 4)

- PARITY work is Phase 6 (docs + cross-surface CSS imports). Phase 4 stays inside `tools/responsive-tokens-editor/`.

---

## Tasks

### 4.1 — `TokenPreviewGrid.tsx` scaffold (sections + rows + columns)

**Purpose:** Render `result.tokens` as a 3-section table. Each row collapses by default; clicking "Edit override" expands an inline `<TokenOverrideEditor />` row spanning the full width.

**Section grouping** (REUSE generator.ts:105-109 filter pattern verbatim):

```ts
const SECTIONS = [
  {
    label: 'Typography',
    filter: (t: GeneratedToken) =>
      t.name.includes('font-size') || t.name === '--text-display',
  },
  {
    label: 'Spacing',
    filter: (t: GeneratedToken) => t.name.startsWith('--spacing-'),
  },
  {
    label: 'Section rhythm',
    filter: (t: GeneratedToken) => t.name === '--space-section',
  },
] as const
```

Expected row counts on V1 conservative-defaults: Typography 10 / Spacing 11 / Section rhythm 1 = 22 total.

**`valueAtViewport` pure helper** (extract for testability — PF.19):

```ts
function valueAtViewport(token: GeneratedToken, viewport: number, config: ResponsiveConfig): number {
  if (viewport <= config.minViewport) return token.minPx
  if (viewport >= config.maxViewport) return token.maxPx
  const t = (viewport - config.minViewport) / (config.maxViewport - config.minViewport)
  return token.minPx + t * (token.maxPx - token.minPx)
}
```

**Component prop shape:**

```tsx
type TokenPreviewGridProps = {
  tokens: GeneratedToken[]
  violations: WcagViolation[]
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}
```

**Composition:**

```
<section> "Token preview"
  ├── per SECTION:
  │   ├── <h2> section.label + " · " + count
  │   └── <table>
  │       ├── <thead> Token | @375 px | @768 px | @1440 px | WCAG | Action
  │       └── <tbody>
  │           └── per token in section:
  │               ├── <tr> token-row
  │               │   ├── <td> token name (mono) + override badge
  │               │   ├── <td> @375 value
  │               │   ├── <td> @768 value
  │               │   ├── <td> @1440 value
  │               │   ├── <td> WCAG indicator (! badge OR null)
  │               │   └── <td> "Edit override" button
  │               └── <tr> editor-row (rendered when expandedToken === t.name; colSpan=6)
  │                   └── <TokenOverrideEditor token={t} ...callbacks />
  └── ...
```

**Override badge** — show "OVERRIDDEN" pill in token-name cell when `t.source === 'override'` OR `t.source === 'special'`. For V1 baseline EVERY row shows OVERRIDDEN (per defaults.ts every token is in overrides).

**WCAG cell** — lookup `violations.find(v => v.token === t.name)`; if found, render small badge (no emoji, geometric/text-only):

```tsx
<span
  aria-label={`WCAG 1.4.4 violation: ${v.reason}`}
  title={v.reason}
  className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] text-[hsl(var(--destructive-text))] text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)]"
>
  !
</span>
```

If no violation → render empty `<td />` (preserve column width via empty cell).

**Action cell** — single button: "Edit override" (collapsed) / "Done" (expanded). Click toggles `expandedToken` local state in TokenPreviewGrid:

```tsx
const [expandedToken, setExpandedToken] = useState<string | null>(null)
const isExpanded = expandedToken === t.name
```

**Skeleton (write VERBATIM modulo final styling polish):**

```tsx
import { useState } from 'react'
import type { ResponsiveConfig, GeneratedToken, WcagViolation } from '../types'
import { TokenOverrideEditor } from './TokenOverrideEditor'

const SECTIONS = [
  /* see filter pattern above */
] as const

export function valueAtViewport(token: GeneratedToken, viewport: number, config: ResponsiveConfig): number {
  if (viewport <= config.minViewport) return token.minPx
  if (viewport >= config.maxViewport) return token.maxPx
  const t = (viewport - config.minViewport) / (config.maxViewport - config.minViewport)
  return token.minPx + t * (token.maxPx - token.minPx)
}

export function TokenPreviewGrid({
  tokens,
  violations,
  config,
  onChange,
}: {
  tokens: GeneratedToken[]
  violations: WcagViolation[]
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
}) {
  const [expandedToken, setExpandedToken] = useState<string | null>(null)

  return (
    <section className="space-y-8 max-w-3xl mt-8">
      <h2 className="text-[length:var(--h3-font-size)] font-[var(--font-weight-semibold)]">
        Token preview
      </h2>
      {SECTIONS.map((section) => {
        const sectionTokens = tokens.filter(section.filter)
        if (sectionTokens.length === 0) return null
        return (
          <div key={section.label} className="space-y-3">
            <h3 className="text-[length:var(--text-sm-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
              {section.label} · {sectionTokens.length}
            </h3>
            <table className="w-full text-[length:var(--text-sm-font-size)] border border-[hsl(var(--border))] rounded-md overflow-hidden">
              <thead className="bg-[hsl(var(--accent))]">
                <tr>
                  <th className="text-left px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">Token</th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">@375</th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">@768</th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">@1440</th>
                  <th className="text-center px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">WCAG</th>
                  <th className="text-right px-3 py-2 text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--muted-foreground))]">Action</th>
                </tr>
              </thead>
              <tbody>
                {sectionTokens.map((t) => {
                  const isExpanded = expandedToken === t.name
                  const v = violations.find((x) => x.token === t.name)
                  const isOverridden = t.source === 'override' || t.source === 'special'
                  return (
                    <Fragment key={t.name}>
                      <tr className="border-t border-[hsl(var(--border))]">
                        <td className="px-3 py-2 font-mono text-[length:var(--text-xs-font-size)]">
                          {t.name}
                          {isOverridden && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-[hsl(var(--accent))] px-1.5 py-0.5 text-[length:var(--text-xs-font-size)] text-[hsl(var(--accent-foreground))]">
                              OVERRIDDEN
                            </span>
                          )}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">{Math.round(valueAtViewport(t, 375, config))} px</td>
                        <td className="text-right px-3 py-2 tabular-nums">{Math.round(valueAtViewport(t, 768, config))} px</td>
                        <td className="text-right px-3 py-2 tabular-nums">{Math.round(valueAtViewport(t, 1440, config))} px</td>
                        <td className="text-center px-3 py-2">
                          {v ? (
                            <span aria-label={`WCAG 1.4.4 violation: ${v.reason}`} title={v.reason} className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] text-[hsl(var(--destructive-text))] text-[length:var(--text-xs-font-size)] font-[var(--font-weight-semibold)]">
                              !
                            </span>
                          ) : null}
                        </td>
                        <td className="text-right px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setExpandedToken(isExpanded ? null : t.name)}
                            className="text-[length:var(--text-xs-font-size)] underline text-[hsl(var(--foreground))] hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] rounded-sm"
                          >
                            {isExpanded ? 'Done' : 'Edit override'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[hsl(var(--accent))]">
                          <td colSpan={6} className="px-3 py-4">
                            <TokenOverrideEditor
                              token={t}
                              config={config}
                              onChange={onChange}
                              onClose={() => setExpandedToken(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </section>
  )
}
```

`Fragment` import: `import { Fragment, useState } from 'react'`.

### 4.2 — `TokenOverrideEditor.tsx` (inline-expand editor)

**Purpose:** Editor row that lets the user (a) edit minPx + maxPx of an existing override, (b) edit optional `reason` text, (c) clear override via "Use scale" toggle (when scale fallback exists per PF.16).

**Component prop shape:**

```tsx
type TokenOverrideEditorProps = {
  token: GeneratedToken
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
  onClose: () => void
}
```

**State logic:**

- Read current override from `config.overrides[token.name]` (V1 baseline: every row has one)
- Local state for editing min/max/reason (controlled inputs)
- "Apply" button — commits via `onChange` + closes via `onClose` (pattern: spread merge per PF.17)
- "Use scale" button — only enabled when `token.source !== 'special'` (PF.16); commits delete-via-destructure + closes
- Inline WCAG warning — recompute on local input change; show under inputs if `local.maxPx > 2.5 × local.minPx`

**`hasFallback` check:**

```ts
const hasFallback = token.source !== 'special'
// 'override' source always has fallback (it overrode either type-scale OR space-scale)
// 'special' source (only --space-section) has NO fallback
```

For V1 baseline every row is `source: 'override'` except `--space-section` which is `source: 'special'`.

**Skeleton (write VERBATIM modulo final styling polish):**

```tsx
import { useState } from 'react'
import type { ResponsiveConfig, GeneratedToken, TokenOverride } from '../types'

export function TokenOverrideEditor({
  token,
  config,
  onChange,
  onClose,
}: {
  token: GeneratedToken
  config: ResponsiveConfig
  onChange: (next: ResponsiveConfig) => void
  onClose: () => void
}) {
  const current: TokenOverride | undefined = config.overrides[token.name]
  const [minPx, setMinPx] = useState(current?.minPx ?? token.minPx)
  const [maxPx, setMaxPx] = useState(current?.maxPx ?? token.maxPx)
  const [reason, setReason] = useState(current?.reason ?? '')

  const hasFallback = token.source !== 'special'
  const localWcagFail = maxPx > 2.5 * minPx

  const apply = () => {
    const nextOverride: TokenOverride = { minPx, maxPx, ...(reason.trim() ? { reason: reason.trim() } : {}) }
    onChange({
      ...config,
      overrides: { ...config.overrides, [token.name]: nextOverride },
    })
    onClose()
  }

  const useScale = () => {
    const { [token.name]: _omit, ...rest } = config.overrides
    onChange({ ...config, overrides: rest })
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <label className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
            Min (px @{config.minViewport})
          </span>
          <input
            type="number"
            value={minPx}
            step={0.5}
            min={1}
            max={200}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) setMinPx(n)
            }}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
            Max (px @{config.maxViewport})
          </span>
          <input
            type="number"
            value={maxPx}
            step={0.5}
            min={1}
            max={200}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) setMaxPx(n)
            }}
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 max-w-md">
        <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
          Reason (optional)
        </span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="why this override exists (e.g., 'preserve desktop static')"
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        />
      </label>

      {localWcagFail && (
        <div
          role="alert"
          className="rounded-md border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] p-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--destructive-text))]"
        >
          WCAG 1.4.4 violation · max ({maxPx}) &gt; 2.5× min ({minPx}). Apply anyway only with explicit reason.
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] font-[var(--font-weight-medium)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={useScale}
          disabled={!hasFallback}
          title={hasFallback ? '' : 'No scale fallback for this token'}
          className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use scale
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-[length:var(--text-xs-font-size)] underline text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] rounded-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

**HARD GATE:** `--destructive-{border,subtle,text}` triad MUST exist in `tokens.css` (Phase 3 verified — both light + dark theme rows present at lines 17/29-31 + 425/437-439). If sync-tokens removes them → escalate.

### 4.3 — `App.tsx` 1-line composition

**Insert** `<TokenPreviewGrid />` between `<GlobalScaleConfig />` and `<ResetButton />` in `<main>`:

```tsx
<main className="flex-1 overflow-y-auto px-6 py-6">
  <WcagBanner violations={violations} />
  <GlobalScaleConfig config={config} onChange={setConfig} />
  <TokenPreviewGrid                                          {/* NEW Phase 4 */}
    tokens={result.tokens}
    violations={violations}
    config={config}
    onChange={setConfig}
  />
  <ResetButton onReset={() => setConfig(conservativeDefaults)} />
</main>
```

Add import: `import { TokenPreviewGrid } from './components/TokenPreviewGrid'`.

**Footer copy update** — flip Phase 3 placeholder ribbon from "Phase 4 placeholder" wording to next-phase signpost:

```
Phase 4 · Container widths editor + Live preview row land in Phase 5 · Save in Phase 6
```

(Optional polish — not load-bearing; if Hands keeps original Phase 3 footer, surface in result.md `Issues & Workarounds`.)

### 4.4 — Tests (2 files)

**Per-file directive on EVERY component test:** `// @vitest-environment jsdom` (line 1 — PF.7 carry).

**Setup files inherit** from Phase 3: `setupTests.ts` already loads `@testing-library/jest-dom/vitest` + `afterEach(cleanup)`. NO changes (PF.20).

**`__tests__/TokenPreviewGrid.test.tsx`** — at least 6 assertions (target ≥7):

```ts
// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'  // (NOTE: if not in deps, fall back to fireEvent — see verification §3)
import { describe, expect, it } from 'vitest'
import { TokenPreviewGrid, valueAtViewport } from '../components/TokenPreviewGrid'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
```

Required assertions:
1. Renders **3 section headers** (Typography 10, Spacing 11, Section rhythm 1) on V1 baseline
2. Renders **22 rows total** (count token-name <td>s; or count <tr> with `font-mono` className)
3. Each row shows correct **@375 = minPx** for V1 conservative-defaults (e.g., row for `--h1-font-size` shows "44 px" in @375 column)
4. Each row shows correct **@1440 = maxPx** for V1 (e.g., `--h1-font-size` row shows "54 px" in @1440 column)
5. Every row shows **OVERRIDDEN badge** on V1 baseline (every token is in overrides)
6. Click "Edit override" on a row → editor row appears with `<TokenOverrideEditor>` for that token; row count increases by 1 (the editor row)
7. Click "Done" on expanded row → editor row disappears
8. **WCAG cell empty** for all 22 rows on V1 baseline (no WCAG violations)
9. **`valueAtViewport` pure-fn assertions** (no React render): edge cases
   - viewport ≤ minViewport → minPx
   - viewport ≥ maxViewport → maxPx
   - viewport in middle → linear interp (round-trip e.g., {minPx:28, maxPx:64, minViewport:375, maxViewport:1440}, viewport=768 → 41.28...)

Use `fireEvent` from `@testing-library/react` if `@testing-library/user-event` is NOT in package.json (PF check before write — Phase 3 install dance avoided extra deps; same here).

**`__tests__/TokenOverrideEditor.test.tsx`** — at least 5 assertions (target ≥6):

```ts
// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TokenOverrideEditor } from '../components/TokenOverrideEditor'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
```

Required assertions:
1. Initial render — minPx/maxPx inputs reflect current override values for `--h1-font-size` (44 + 54)
2. Editing minPx + clicking Apply → `onChange` called with merged config containing `overrides['--h1-font-size'].minPx = <newValue>`; `onClose` called
3. Clicking "Use scale" on `--h1-font-size` (override + has stepMap fallback) → `onChange` called with config where `overrides` does NOT contain `--h1-font-size` key; `onClose` called
4. Clicking "Use scale" on `--space-section` (special source — no fallback) → button is disabled; clicking does nothing
5. Setting maxPx > 2.5 × minPx (e.g., min=10, max=30 → ratio 3.0) → inline WCAG warning renders (`role="alert"`)
6. Setting reason text + Apply → resulting override object contains `reason` field; setting empty reason + Apply → `reason` field absent in resulting override

**Snapshot regression carry:** Phase 2's `__snapshots__/generator.test.ts.snap` MUST still match — Phase 4 doesn't touch generator.ts/defaults.ts/validate.ts. Verification §4 confirms.

---

## Mandatory Verification (do NOT skip)

```bash
echo "=== Phase 4 Verification ==="

# 1. Drift sanity-check on locked checkWCAG SEMANTIC contract — carry from Phase 2/3
cd tools/responsive-tokens-editor && node -e "
const { checkWCAG } = require('utopia-core');
const isViolation = (r) => Array.isArray(r) && r.length > 0;
const a = checkWCAG({ min: 16, max: 18, minWidth: 375, maxWidth: 1440 });
const b = checkWCAG({ min: 16, max: 40, minWidth: 375, maxWidth: 1440 });
const c = checkWCAG({ min: 10, max: 30, minWidth: 375, maxWidth: 1440 });
const ok = !isViolation(a) && !isViolation(b) && isViolation(c) && c.length === 2;
console.log('contract drift:', ok ? '✅ HOLD' : '❌ DRIFT — STOP, surface to Brain');
"
echo "(expect: ✅ HOLD — semantic contract intact)"

# 2. Typecheck
cd tools/responsive-tokens-editor && npm run typecheck
echo "(expect: tsc exits 0)"

# 3. Tests — count assertions across 2 new files + 6 existing
cd tools/responsive-tokens-editor && npm test
echo "(expect: 9 test files; ≥48 assertions; 0 fail; 0 skip)"
echo "(Phase 3 baseline: 7 files / 36 assertions — Phase 4 +2 files / +12-14 assertions ≈ 48-50)"

# 4. Phase 2 snapshot regression
ls tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c 'vi,' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
grep -c 'vw,' tools/responsive-tokens-editor/src/__tests__/__snapshots__/generator.test.ts.snap
echo "(expect: 22 vi entries; 0 vw entries; file unchanged from Phase 2 baseline)"

# 5. Arch-test
npm run arch-test
echo "(expect: 533 / 0 — 529 baseline + 4 new owned_files)"

# 6. No-hardcoded-styles audit (per CLAUDE.md HARD rule)
cd tools/responsive-tokens-editor && grep -rn -E "(#[0-9a-fA-F]{3,8}|rgba?\(|fontFamily:|fontSize: ['\"]\\d|fontWeight: \\d{3})" src/components/TokenPreviewGrid.tsx src/components/TokenOverrideEditor.tsx 2>/dev/null
echo "(expect: empty — every color/font/size via tokens.css var via Tailwind class)"
echo "(NOTE: width: \${progress * 100}% in ResetButton.tsx is allowed dynamic-value exception per CLAUDE.md;"
echo " Phase 4 components have NO equivalent — table cells are static-class only)"

# 7. Live UI verification (per saved memory feedback_visual_check_mandatory)
# — runs in same session via Playwright/Chrome MCP
#   (a) start dev server: cd tools/responsive-tokens-editor && npm run dev (background)
#   (b) navigate to http://localhost:7703/
#   (c) screenshot 01: baseline render — TokenPreviewGrid visible below GlobalScaleConfig;
#                        3 section headers (Typography 10 / Spacing 11 / Section rhythm 1);
#                        22 rows with OVERRIDDEN badge + @columns + no WCAG cells filled
#   (d) click "Edit override" on --h1-font-size row → screenshot 02: editor row expanded with
#                        minPx=44, maxPx=54, reason="preserve desktop static (ruling 1)" populated
#   (e) edit maxPx to 200 (extreme — > 2.5× 44) → screenshot 03: inline WCAG warning visible in
#                        editor row + click Apply → row's @1440 column shows "200 px" + per-row
#                        WCAG ! badge appears + top-level WcagBanner shows --h1-font-size violation
#   (f) click "Edit override" on --h1-font-size again → click "Use scale" → screenshot 04: row
#                        OVERRIDDEN badge gone (or row source flips); WcagBanner clears
#   (g) click "Edit override" on --space-section row → screenshot 05: editor visible with "Use
#                        scale" button DISABLED + tooltip "No scale fallback for this token"
#   (h) hold ResetButton 3s → screenshot 06: all overrides restored; baseline matches (a)
echo "(expect: 6 screenshots in logs/wp-030/p4-smoke/ + UI passes 5 acceptance scenarios)"

# 8. Save-safety contract NOT regressed
grep -n "writeFile\|fs.write" tools/responsive-tokens-editor/src/lib/config-io.ts
echo "(expect: empty — Phase 4 does NOT introduce fs writes; Phase 6 owns)"

# 9. Manifest count
grep -c "tools/responsive-tokens-editor/" src/__arch__/domain-manifest.ts
echo "(expect: 32 — 28 baseline + 4 new)"

# 10. Scope gates
git status --short tools/responsive-tokens-editor/ src/__arch__/domain-manifest.ts logs/wp-030/
git status --short apps/ packages/ content/
echo "(expect: only tools/responsive-tokens-editor/, manifest, logs/wp-030/ changed; ZERO apps/packages/content/)"

# 11. fast-loading-speed.json side observation
git status --short content/db/blocks/fast-loading-speed.json content/db/blocks/fast-loading-speed.json.bak
echo "(expect: same M + ?? as Phase 2 baseline — UNTOUCHED)"

# 12. Emoji audit (zero in source files)
cd tools/responsive-tokens-editor/src && grep -rn -P "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" components/ App.tsx __tests__/ setupTests.ts 2>/dev/null
echo "(expect: empty — geometric ▶/▾ characters from Geometric Shapes block 25A0-25FF are NOT in audit range; '!' / 'OVERRIDDEN' / 'Done' / 'Edit override' are plain ASCII)"

# 13. Token coverage gate (Phase 4 specific) — verify all 22 tokens render
cd tools/responsive-tokens-editor && node -e "
const { conservativeDefaults } = require('./src/lib/defaults.ts');  // adjust if .ts not directly requirable — alternate: parse via grep
" 2>&1 || true
# Fallback: grep-based coverage check (TS not directly executable in Node without tsx):
grep -c "minPx:" tools/responsive-tokens-editor/src/lib/defaults.ts
echo "(expect: 22 — every token has minPx entry; matches Phase 0 §0.6 + Phase 2 snapshot)"
```

---

## Hard Gates / Scope Held

- [ ] Drift sanity-check (verification §1) ✅ HOLD before write any code
- [ ] Typecheck exits 0
- [ ] All tests pass (≥48 assertions across 9 files: 7 baseline + 2 Phase 4)
- [ ] Phase 2 snapshot regression intact (22 vi, 0 vw)
- [ ] arch-test 533/0 (529 + 4 new)
- [ ] No hardcoded styles (verification §6 grep empty)
- [ ] **Live UI verification done in same session** (verification §7) — 6 screenshots saved + 5 acceptance scenarios passed
- [ ] No fs writes added (verification §8 grep empty)
- [ ] Scope: ONLY `tools/responsive-tokens-editor/`, `src/__arch__/domain-manifest.ts`, `logs/wp-030/` (verification §10)
- [ ] fast-loading-speed.json side observation untouched (verification §11)
- [ ] No emojis in any source file (verification §12)
- [ ] Token coverage = 22 (verification §13)

---

## IMPORTANT Notes

- **PF.15–PF.20 carry from Brain RECON 2026-04-26** — material findings for Phase 4 execution. Read before writing code.
- **`@cmsmasters/ui` workspace dep STILL deferred** (PF.15). Phase 4 uses inline-expand row pattern. PF.5+PF.6 only activate if user pushes back during review for explicit modal pattern.
- **`--space-section` "Use scale" disabled** (PF.16) — `t.source === 'special'` rows render disabled "Use scale" button with tooltip. Other 21 rows have valid scale fallback.
- **Override mutation immutability** (PF.17) — set via `{ ...config.overrides, [token]: ... }`; clear via destructure-omit `const { [token]: _, ...rest }`. NEVER use `delete` (mutates in place; React state must be immutable).
- **`valueAtViewport` is a pure function** (PF.19) — extract for testability; reused by `<td>` content + tests. Verify edge cases (viewport ≤ min, ≥ max, in middle).
- **Vitest config inherits from Phase 3** (PF.20) — NO setupTests.ts or vite.config.ts changes. afterEach(cleanup) covers Phase 4 multi-render tests.
- **Live UI verification (verification §7) is non-skippable** — saved memory `feedback_visual_check_mandatory`. UI-touching phase + same-session check. Save 6 screenshots to `logs/wp-030/p4-smoke/` (mkdir before commit). Use Playwright/Chrome MCP. No auth wall (single-author tool on localhost:7703).
- **PF.14 closure path** — Phase 4 closes the form-trigger gap from Phase 3 (V1 form couldn't trigger banner because conservative-defaults are all WCAG-clean and GlobalScaleConfig only edits scale fields, not per-token overrides). Per-token override editor in Phase 4 IS the form path that can trigger banner naturally. Verification §7 step (e) explicitly tests this.
- **Saved memory `feedback_use_design_agents`** — evaluated and waived for Phase 4 (incremental UI on Phase 3 chrome; reuses established patterns). Document deviation in result.md `Key Decisions` table.

### STOP and surface to Brain immediately if:

- `tokens.css` does NOT have `--destructive-border` / `--destructive-subtle` / `--destructive-text` triad (Phase 3 verified present; sync-tokens drift would break per-row WCAG indicator + inline editor warning)
- `valueAtViewport` returns NaN or non-finite values for any V1 conservative-default token (means types.ts ResponsiveConfig shape drift OR generator.ts emitting unexpected fields)
- Test render of TokenPreviewGrid shows fewer than 22 rows on V1 baseline (defaults.ts + generator.ts contract drift; PF.18 invariant violated)
- "Use scale" toggle on `--h1-font-size` (or any non-special row) results in a row that disappears from grid OR shows source other than `'type-scale'`/`'space-scale'` after scale fallback recompute (means generator.ts override-removal flow broken)
- Inline WCAG warning in TokenOverrideEditor doesn't trigger on extreme inputs (e.g., min=10, max=30) — means localWcagFail logic broken OR token color tokens absent
- Live UI verification (§7) reveals layout overflow, color clash, font regression, OR keyboard-navigation broken (Tab cycle stuck) — STOP, screenshot, escalate
- `userEvent` package NOT in package.json AND `fireEvent` from `@testing-library/react` doesn't satisfy click test simulation — surface dep question to Brain (do not silently npm install)

### NEVER:

- Touch `apps/`, `packages/` (except verifying tokens.css has triad — read-only), `content/`, `tokens.css`, `tokens.responsive.css`
- Pull `@cmsmasters/ui` workspace dep in Phase 4 (defer to Phase 5+ if needed; PF.15 lock)
- Add fs writes to `config-io.ts` (Phase 6 owns saving)
- Touch `tools/block-forge/` or `tools/layout-maker/` (different domain owner — Phase 4 only adds new files in tools/responsive-tokens-editor/)
- Modify `lib/*` (`defaults.ts`, `generator.ts`, `validate.ts`, `config-io.ts`) — Phase 2/3 lock
- Modify `types.ts` — Phase 2 lock; Phase 4 only consumes existing types
- Modify `setupTests.ts` or `vite.config.ts` — PF.20 lock
- Hardcode any color / font-family / font-size / shadow (CLAUDE.md "STRICT: No Hardcoded Styles")
- Skip verification §7 (live UI) — saved memory `feedback_visual_check_mandatory` is non-negotiable
- Add emojis (`\x{1F300}-\x{1FAFF}` or `\x{2600}-\x{27BF}` ranges) to any source file
- Use `delete config.overrides[token]` (mutates state — use destructure-omit per PF.17)
- Use a portal/Dialog primitive (PF.15 says inline-expand — DOM-flat, no portal)

---

## Result file

After execution, surface results in `logs/wp-030/phase-4-result.md` following Phase 1/2/3 result template:

- `## What Was Implemented` (single-paragraph technical summary)
- `## Pre-flight findings` (PF.15-PF.20 status; any new findings during execution PF.21+)
- `## Live UI verification` (§ — 6 screenshots embedded + 5 acceptance scenarios confirmation)
- `## Key Decisions` (table — including "Skip design-agent spawn" deviation; inline-expand vs modal choice)
- `## Files Changed` (table)
- `## Issues & Workarounds`
- `## Open Questions` (expect: forward-note PF.14 closed; Phase 5 ContainerWidthsEditor scope confirmed)
- `## Verification Results` (13-row table matching verification block above)
- `## Pre-empted findings status` (table)
- `## 7 rulings + 4 escalations status` (carry table — none re-fire in Phase 4)
- `## Git` (commit SHA placeholder pending review)
- `## Next steps after review` (Phase 5 prep notes — ContainerWidthsEditor + LivePreviewRow)

---

## Brain review gate (before commit)

**Phase 4 has TWO review gates:**

1. **Code review gate** — typecheck + tests green + arch-test 533/0 + no-hardcode audit clean + token coverage = 22 (gates 1-6 + 8-13)
2. **Live UI review gate** — Hands surfaces 6 screenshots in result.md `§ Live UI verification`; Brain visually inspects (per `feedback_visual_qa`); approves or sends back

If both gates green → commit:
```bash
git add tools/responsive-tokens-editor/src/App.tsx \
        tools/responsive-tokens-editor/src/components/TokenPreviewGrid.tsx \
        tools/responsive-tokens-editor/src/components/TokenOverrideEditor.tsx \
        tools/responsive-tokens-editor/src/__tests__/TokenPreviewGrid.test.tsx \
        tools/responsive-tokens-editor/src/__tests__/TokenOverrideEditor.test.tsx \
        src/__arch__/domain-manifest.ts \
        logs/wp-030/phase-4-result.md \
        logs/wp-030/p4-smoke/

git commit -m "feat(wp-030): Phase 4 — Token preview grid + override editor [WP-030 phase 4]"
```

If pushback: adjust components, re-run verification + UI smoke, re-surface.

---

## Pre-empted findings table (final state Phase 4)

| # | Status | Action |
|---|--------|--------|
| PE.1 cd-pattern in npm scripts | ✅ HELD | No new root scripts in Phase 4 |
| PE.2 install dance not applicable | ✅ HELD | No new deps in Phase 4 |
| PF.1 tokens.css static = §0.6 1:1 | ✅ HELD (Phase 2) | Phase 4 does NOT modify defaults |
| PF.2 `relativeTo: 'viewport'` → vi | ✅ HELD (Phase 2) | Generator unchanged |
| PF.3 `--text-display` fluid-only | ✅ HELD (Phase 2) | Snapshot unchanged |
| PF.4 checkWCAG semantic contract | ✅ HELD (Phase 2) | validate.ts unchanged; per-row lookup consumes WcagViolation[] only |
| PF.5 @cmsmasters/ui primitives audit | ✅ deferred AGAIN | Inline-expand pattern; no Drawer/Dialog needed |
| PF.6 Slider integration dedupe/alias | ✅ deferred AGAIN | NOT pulled in Phase 4 |
| PF.7 Vitest jsdom per-file directive | ✅ used | Both new component tests line 1 |
| PF.8 testing-library/jest-dom add | ✅ inherited (Phase 3) | NO setupTests.ts changes |
| PF.9 loadConfig() returns null | ✅ inherited (Phase 3) | App.tsx mount-once useEffect unchanged |
| PF.10 Tailwind v4 token classes | ✅ used | Verbatim from Phase 1/3 patterns |
| PF.11 Nested-shape adoption | ✅ inherited (Phase 3) | Phase 4 extends to overrides spread |
| PF.12 loadConfig async cancel-flag | ✅ inherited (Phase 3) | App.tsx unchanged |
| PF.13 Vitest cleanup hook | ✅ inherited (Phase 3) | afterEach(cleanup) covers multi-render |
| PF.14 V1 form can't trigger banner | ✅ CLOSED | TokenOverrideEditor IS the form path that triggers banner |
| PF.15 @cmsmasters/ui still deferred | ✅ used | Inline-expand chosen |
| PF.16 --space-section special source | ✅ used | "Use scale" disabled for this row |
| PF.17 Override mutation immutability | ✅ used | Spread for set; destructure-omit for clear |
| PF.18 22-token contract preserved | ✅ used | Phase 2 snapshot intact; verification §4 + §13 |
| PF.19 @768 linear interp formula | ✅ used | valueAtViewport pure-fn helper |
| PF.20 Vitest config inherited | ✅ used | NO config changes |
