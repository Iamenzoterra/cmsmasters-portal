# WP-026 Phase 3 — Core engine wiring + suggestion list

**Role:** Hands
**Phase:** 3
**Estimated time:** ~2.5–3h
**Plan reference:** `workplan/WP-026-tools-block-forge-mvp.md` Phase 3 (lines 273–291, post-patch)
**Carry-overs:** Phase 0 `(a)`, `(d)`, `(e)`, `(f)` still in force; Phase 1 hotfix DS base + Phase 2 preview + API foundation + PARITY.md seeded.

---

## Phase 2 landing context

Commit `7a29960f` shipped preview-triptych + picker + blocks API cleanly:
- Arch-test floor: **463/0**.
- Test total: **23/23** (file-io 14 + preview-assets 9).
- 4 real blocks from `content/db/blocks/` load through `/api/blocks` endpoints.
- Two-level slot wrapper + `@layer tokens, reset, shared, block` injection verified in DevTools.
- PARITY.md seeded with zero open divergences.

Phase 2 Plan Corrections already absorbed:
- Token renames: `--status-danger-fg` → `--status-error-fg`, `--bg-base` → `--bg-surface`.
- `vite.config.ts` has `test: { css: true }` — **don't remove it**; it's load-bearing for any CSS-touching tests (including Phase 3's integration test). Per saved memory `feedback_vitest_css_raw.md`.
- `__dirname` via `fileURLToPath(import.meta.url)` for Windows robustness (Phase 2 deviation #4) — same pattern holds for any new Node-side code this phase (none expected).

---

## Mission

Wire `@cmsmasters/block-forge-core`'s `analyzeBlock` + `generateSuggestions` into block-forge. A `useAnalysis(block)` hook returns `{ suggestions, warnings }`. `<SuggestionList>` renders the suggestions (sorted, grouped, with confidence badges). `<SuggestionRow>` shows each entry with disabled Accept / Reject buttons (real wiring lands Phase 4). A warning banner surfaces core warnings above the list. Integration test with Testing Library loads the WP-025 frozen fixtures (`block-spacing-font`, `block-plain-copy`, `block-nested-row`) and asserts the three heuristic-behavior contracts.

**Success** =
1. App.tsx's right-hand aside (previously `<em>Suggestion list — Phase 3 placeholder</em>`) now renders the real SuggestionList.
2. Selecting `header` / `fast-loading-speed` / `sidebar-perfect-for` / `sidebar-pricing` from the picker triggers `useAnalysis` → suggestions populate (count depends on the real block's CSS; some may be 0 — that's expected).
3. Switching blocks re-analyzes (no stale state).
4. Warning banner renders above the list when `warnings.length > 0`; hidden otherwise.
5. Accept / Reject buttons are present but **`disabled`** — Phase 4 wires them.
6. Integration test: three fixture contracts verified.
7. Arch-test 467/0; total tests ~28.

**Zero Accept/Reject state, zero save wiring, zero `session.ts`, zero `applySuggestions`.** All of that is Phase 4.

---

## Hard Gates (DO NOT)

- DO NOT call `applySuggestions`, `emitTweak`, `composeVariants`, or `renderForPreview` from core. The only two core functions this phase touches: `analyzeBlock` and `generateSuggestions`.
- DO NOT implement `session.ts`, `StatusBar.tsx`, `CodeView.tsx`. The suggestions/status/code panes stay placeholders until Phase 4 beyond what this phase builds.
- DO NOT persist Accept / Reject state anywhere. Buttons render `disabled={true}` with a tooltip "Phase 4 — wiring pending" (or equivalent).
- DO NOT mutate `block.css` / `block.html` through the UI. The suggestion list is display-only; no Save button yet.
- DO NOT add a POST endpoint to the Vite plugin.
- DO NOT cache analysis across blocks. Re-analyze on every block change — `useAnalysis` has no memoization store beyond React's `useMemo` scoped to the current block.
- DO NOT copy fixtures permanently into `tools/block-forge/`. The integration test reads them from `packages/block-forge-core/src/__tests__/fixtures/` via `readFile` at test time.
- DO NOT touch `packages/`, `apps/`, other `tools/`, `workplan/`, `.claude/skills/`, `.context/`, `content/**`, `file-io.ts`, `preview-assets.ts`, `vite.config.ts` (except if adding jsdom env — see 3.5 below), Phase-2 components.

---

## Tasks

### 3.1 — `src/lib/useAnalysis.ts`

A React hook wrapping `analyzeBlock` + `generateSuggestions`. Pure; no side effects beyond the computation.

```ts
import { useMemo } from 'react'
import { analyzeBlock, generateSuggestions, type Suggestion } from '@cmsmasters/block-forge-core'
import type { BlockJson } from '../types'

export type AnalysisResult = {
  suggestions: Suggestion[]
  warnings: string[]
}

const EMPTY: AnalysisResult = { suggestions: [], warnings: [] }

/**
 * Runs analyzeBlock + generateSuggestions for the given block.
 * Re-computes when block.slug / block.html / block.css change.
 * Null input → empty result (picker hasn't selected yet).
 */
export function useAnalysis(block: BlockJson | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return EMPTY
    try {
      const analysis = analyzeBlock({ slug: block.slug, html: block.html, css: block.css })
      const suggestions = generateSuggestions(analysis)
      return { suggestions, warnings: analysis.warnings }
    } catch (err) {
      // Per WP-025 invariant, core doesn't throw on malformed input — it records warnings.
      // This catch is belt-and-suspenders; log and surface as a synthesized warning.
      const msg = err instanceof Error ? err.message : String(err)
      return { suggestions: [], warnings: [`analyzer crashed: ${msg}`] }
    }
  }, [block?.slug, block?.html, block?.css])
}
```

**Contract highlights:**
- No side effects — safe to call during render.
- Re-memoizes on any of (slug, html, css) change.
- Null-tolerant for picker-not-yet-selected state.
- Defensive try/catch despite WP-025's "no throws on malformed" guarantee — if core ever regresses, the UI still renders instead of white-screening.

### 3.2 — `src/components/SuggestionList.tsx`

Receives `suggestions` + `warnings` as props (App.tsx owns the hook). Sorts + renders.

```tsx
import type { Suggestion } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'

type Props = {
  suggestions: Suggestion[]
  warnings: string[]
}

/** Dispatcher order from WP-025 — stable list ordering. */
const HEURISTIC_ORDER = [
  'grid-cols',
  'spacing-clamp',
  'font-clamp',
  'flex-wrap',
  'horizontal-overflow',
  'media-maxwidth',
] as const

function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => {
    const ha = HEURISTIC_ORDER.indexOf(a.heuristic)
    const hb = HEURISTIC_ORDER.indexOf(b.heuristic)
    if (ha !== hb) return ha - hb
    if (a.selector !== b.selector) return a.selector.localeCompare(b.selector)
    return a.bp - b.bp
  })
}

export function SuggestionList({ suggestions, warnings }: Props) {
  const sorted = sortSuggestions(suggestions)

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      {warnings.length > 0 && (
        <div
          role="alert"
          className="rounded border border-[hsl(var(--status-error-fg))] bg-[hsl(var(--status-error-bg))] p-3 text-sm text-[hsl(var(--status-error-fg))]"
        >
          <div className="font-semibold">Analyzer warnings ({warnings.length})</div>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w, i) => (
              <li key={i} className="font-mono text-xs">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
          No suggestions — block has no responsive-authoring triggers.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-[hsl(var(--text-muted))]">
            {sorted.length} suggestion{sorted.length === 1 ? '' : 's'}
          </div>
          {sorted.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  )
}

export { sortSuggestions }  // exported for unit testing
```

**Token grep gate** before coding: verify `--status-error-fg` and `--status-error-bg` exist in `packages/ui/src/theme/tokens.css` (they should — Phase 2 corrections confirmed). If any is missing, fallback logic per hotfix precedent + flag Plan Correction.

### 3.3 — `src/components/SuggestionRow.tsx`

Single row: heuristic badge, selector, BP, rationale, confidence pill, disabled Accept/Reject.

```tsx
import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

type Props = {
  suggestion: Suggestion
}

// Confidence → token mapping (no --status-warning-* in tokens.css, so medium uses info).
const CONFIDENCE_STYLES: Record<Confidence, { bg: string; fg: string; label: string }> = {
  high: {
    bg: 'hsl(var(--status-success-bg))',
    fg: 'hsl(var(--status-success-fg))',
    label: 'high',
  },
  medium: {
    bg: 'hsl(var(--status-info-bg))',
    fg: 'hsl(var(--status-info-fg))',
    label: 'medium',
  },
  low: {
    bg: 'hsl(var(--bg-surface))',
    fg: 'hsl(var(--text-muted))',
    label: 'low',
  },
}

function ConfidencePill({ level }: { level: Confidence }) {
  const s = CONFIDENCE_STYLES[level]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  )
}

export function SuggestionRow({ suggestion }: Props) {
  const { heuristic, selector, bp, rationale, confidence, property, value } = suggestion

  return (
    <div
      data-suggestion-id={suggestion.id}
      className="flex flex-col gap-2 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-3"
    >
      <div className="flex items-center gap-2">
        <span className="rounded bg-[hsl(var(--bg-page))] px-2 py-0.5 font-mono text-xs text-[hsl(var(--text-primary))]">
          {heuristic}
        </span>
        <span className="text-xs text-[hsl(var(--text-muted))]">
          {bp === 0 ? 'base' : `@${bp}px`}
        </span>
        <span className="ml-auto">
          <ConfidencePill level={confidence} />
        </span>
      </div>

      <div className="font-mono text-xs text-[hsl(var(--text-primary))]">
        <span className="text-[hsl(var(--text-muted))]">{selector}</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      <p className="text-sm text-[hsl(var(--text-primary))]">{rationale}</p>

      <div className="flex gap-2">
        <button
          type="button"
          disabled
          title="Phase 4 — accept/reject wiring pending"
          className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          disabled
          title="Phase 4 — accept/reject wiring pending"
          className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
```

**Token grep gate:** verify all referenced tokens exist (`--status-success-bg`, `--status-success-fg`, `--status-info-bg`, `--status-info-fg`, `--bg-surface`, `--bg-page`, `--text-primary`, `--text-muted`, `--border-default`). All confirmed present by Brain recon; but re-verify at coding time.

**ConfidencePill inline styles:** the `style={{ backgroundColor, color }}` pair is acceptable because the color pair is driven by runtime `level` prop — truly dynamic. Alternative would be 3 cva-variant Tailwind classes, also fine. Either pattern is OK.

### 3.4 — Update `src/App.tsx` — wire SuggestionList

Replace the `<aside data-region="suggestions">` placeholder with real wiring:

```tsx
import { useEffect, useState } from 'react'
import type { BlockJson } from './types'
import { getBlock } from './lib/api-client'
import { useAnalysis } from './lib/useAnalysis'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'

export function App() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSlug) {
      setBlock(null)
      return
    }
    setLoadError(null)
    getBlock(selectedSlug)
      .then(setBlock)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [selectedSlug])

  const { suggestions, warnings } = useAnalysis(block)

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="flex items-center gap-6 border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <BlockPicker selected={selectedSlug} onSelect={setSelectedSlug} />
        {loadError && (
          <span className="text-sm text-[hsl(var(--status-error-fg))]">{loadError}</span>
        )}
      </header>

      <main className="grid grid-cols-[1fr_360px] overflow-hidden">
        <section
          data-region="triptych"
          className="overflow-auto border-r border-[hsl(var(--border-default))]"
        >
          <PreviewTriptych block={block} />
        </section>
        <aside data-region="suggestions" className="overflow-hidden">
          <SuggestionList suggestions={suggestions} warnings={warnings} />
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-default))] px-6 py-2"
      >
        <em className="text-sm text-[hsl(var(--text-muted))]">
          Status bar — Phase 4 placeholder
        </em>
      </footer>
    </div>
  )
}
```

Only two changes vs Phase 2's App.tsx: added `useAnalysis` import + call + passed to `<SuggestionList>` in the aside.

### 3.5 — Vitest jsdom environment

The integration test uses Testing Library which requires jsdom. Two paths:

**(a) Per-test env directive** (preferred, minimal surface):
```ts
// src/__tests__/integration.test.tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest'
// ...
```

**(b) Global config** in `vite.config.ts`:
```ts
test: {
  css: true,
  environment: 'jsdom',  // forces jsdom for ALL tests
},
```

**Use (a).** `file-io.test.ts` runs in Node env (uses `node:fs`); forcing jsdom globally adds ~50ms overhead per test file and risks breaking Node-specific APIs. Per-test override keeps things clean. Confirm `jsdom` is already in `devDependencies` (Phase 1 prompt listed it; verify).

### 3.6 — `src/__tests__/integration.test.tsx`

Three contract assertions from the plan's Phase 3 manual-verify block:

```tsx
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import type { BlockJson } from '../types'
import { useAnalysis } from '../lib/useAnalysis'
import { SuggestionList } from '../components/SuggestionList'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES = path.resolve(__dirname, '../../../../packages/block-forge-core/src/__tests__/fixtures')

async function loadFixture(slug: string): Promise<BlockJson> {
  const [html, css] = await Promise.all([
    readFile(path.join(FIXTURES, `${slug}.html`), 'utf8'),
    readFile(path.join(FIXTURES, `${slug}.css`), 'utf8'),
  ])
  return {
    id: `fixture-${slug}`,
    slug,
    name: slug,
    html,
    css,
  }
}

function Harness({ block }: { block: BlockJson | null }) {
  const { suggestions, warnings } = useAnalysis(block)
  return <SuggestionList suggestions={suggestions} warnings={warnings} />
}

describe('SuggestionList integration with core engine', () => {
  let spacingFont: BlockJson
  let plainCopy: BlockJson
  let nestedRow: BlockJson

  beforeAll(async () => {
    spacingFont = await loadFixture('block-spacing-font')
    plainCopy = await loadFixture('block-plain-copy')
    nestedRow = await loadFixture('block-nested-row')
  })

  it('block-spacing-font: shows ≥ 1 suggestion including spacing-clamp', () => {
    render(<Harness block={spacingFont} />)
    const rows = document.querySelectorAll('[data-suggestion-id]')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    const heuristics = Array.from(rows).map((r) =>
      r.querySelector('.font-mono')?.textContent,
    )
    expect(heuristics.join(' ')).toContain('spacing-clamp')
  })

  it('block-plain-copy: renders empty-state message (no suggestions)', () => {
    render(<Harness block={plainCopy} />)
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
    expect(screen.getByText(/no responsive-authoring triggers/i)).toBeInTheDocument()
  })

  it('block-nested-row: no flex-wrap suggestions (nested-row contract)', () => {
    render(<Harness block={nestedRow} />)
    const rows = document.querySelectorAll('[data-suggestion-id]')
    const heuristics = Array.from(rows).map((r) => r.querySelector('.font-mono')?.textContent ?? '')
    expect(heuristics.some((h) => h.includes('flex-wrap'))).toBe(false)
  })

  it('null block: renders empty-state cleanly (no crash)', () => {
    render(<Harness block={null} />)
    expect(screen.getByText(/no responsive-authoring triggers/i)).toBeInTheDocument()
  })
})
```

**Why read fixtures from core's test dir vs copy locally:**
- WP-025 froze those fixtures by SHA; drift would be caught at the core's own test layer.
- Block-forge's integration test is a **cross-package contract check** — it verifies the same fixtures produce the same suggestion shapes on the UI side.
- No copies → no sync obligation → no drift risk.

**Path fragility:** the 4x `../` from `src/__tests__/` to repo root is fragile if test folder moves. If Phase 4 reorganizes tests, recompute. Consider a small helper at `src/__tests__/fixtures.ts` if the pattern repeats.

### 3.7 — Domain manifest

Append to `infra-tooling.owned_files`:

```ts
'tools/block-forge/src/lib/useAnalysis.ts',
'tools/block-forge/src/components/SuggestionList.tsx',
'tools/block-forge/src/components/SuggestionRow.tsx',
'tools/block-forge/src/__tests__/integration.test.tsx',
```

**4 new owned_files.** Expected arch-test: 463 + 4 = **467 / 0**.

---

## Verification

```bash
npm run arch-test                                        # 467/0
npm run typecheck                                        # clean
cd tools/block-forge && npm run typecheck                # clean
cd tools/block-forge && npm test                         # 23 + 4 = 27/27 (file-io 14 + preview-assets 9 + integration 4)
cd tools/block-forge && npm run build                    # clean
cd tools/block-forge && npm run dev                      # :7702 live
```

**Browser verification (dev server running):**
1. Open http://localhost:7702/.
2. Pick `header` from dropdown.
3. Observe three iframes + right-hand suggestion list.
4. If `header` produces ≥ 1 suggestion → confirm each row renders: heuristic name, selector, BP, rationale, confidence pill, disabled Accept/Reject.
5. Disabled buttons: hover should show the "Phase 4 — wiring pending" tooltip; click does nothing.
6. Switch to `fast-loading-speed` → list re-analyzes; old rows disappear, new rows appear.
7. Switch to `sidebar-perfect-for` and `sidebar-pricing` — record suggestion counts in result log.
8. Force a warning: temporarily edit one `content/db/blocks/*.json` to have malformed CSS (like `{{unclosed`) → reload → warning banner appears above the list → revert the edit. **Do NOT commit the malformed edit.** (Skip this step if safer to just verify via unit-test that the warning banner renders conditionally.)
9. Screenshot: `tools/block-forge/phase-3-suggestions-verification.png` (gitignored).

**DevTools spot check on a suggestion row:**
- `data-suggestion-id` attribute present (opaque ID, just check it exists and non-empty).
- Confidence pill has inline-style background + color resolved to real HSL values (not `hsl(,,)` or `undefined`).

---

## Result Log Structure

Write `logs/wp-026/phase-3-result.md`:

```markdown
# WP-026 Phase 3 — Core Engine + Suggestion List Result

**Date:** 2026-04-23
**Duration:** <minutes>
**Commit(s):** <sha list>
**Arch-test:** 467 / 0
**Test totals:** file-io 14 + preview-assets 9 + integration 4 = 27/27

## What Shipped

- `src/lib/useAnalysis.ts` — hook wrapping analyzeBlock + generateSuggestions
- `src/components/SuggestionList.tsx` — sorted list + warning banner + empty state
- `src/components/SuggestionRow.tsx` — row with confidence pill + disabled Accept/Reject
- `src/__tests__/integration.test.tsx` — 4 cases; 3 fixture contracts + null-safe
- `src/App.tsx` — wires useAnalysis + SuggestionList into suggestions aside

## Real-block Suggestion Counts

| Block | Suggestions | Heuristics observed | Warnings |
|---|---|---|---|
| header | <N> | <list> | <N> |
| fast-loading-speed | <N> | <list> | <N> |
| sidebar-perfect-for | <N> | <list> | <N> |
| sidebar-pricing | <N> | <list> | <N> |

## Fixture Contract Verification

- block-spacing-font → <N> suggestions, spacing-clamp present ✅ / ❌
- block-plain-copy → empty-state visible ✅ / ❌
- block-nested-row → zero flex-wrap entries ✅ / ❌

## Token Grep Verification

- All 10 tokens referenced in Phase 3 code exist in `packages/ui/src/theme/tokens.css`: <list>
- No renames needed / renames found: <summary>

## Deviations

<e.g., Badge primitive swapped for inline-styled pill because Badge has no semantic-success variant; path adjustment if fixture tree moved>

## Plan Corrections

<Usually empty.>

## Ready for Phase 4

- Accept / Reject button hooks are identified (data-suggestion-id attribute on each row).
- Warning banner renders conditionally on `warnings.length > 0`.
- Re-analysis on block change verified.
- No blockers for Phase 4's session.ts + POST endpoint + Save + backup-on-first-save.
```

---

## Verification Before Writing Result Log

- [ ] All 27 tests pass.
- [ ] `npm run arch-test` = 467/0.
- [ ] Vitest runs with `test.css: true` still in `vite.config.ts` (unchanged from Phase 2).
- [ ] Integration test uses per-test `@vitest-environment jsdom` directive, NOT global config change.
- [ ] `jsdom` confirmed in `devDependencies` (or added if Phase 1 missed it — flag as Deviation).
- [ ] Accept / Reject buttons are `disabled` in JSX, AND render with `disabled:cursor-not-allowed disabled:opacity-60` styles.
- [ ] No `applySuggestions` / `emitTweak` / `composeVariants` / `renderForPreview` imports in this phase.
- [ ] Picker → list re-analyzes on block switch; no stale state.
- [ ] `sortSuggestions` is exported for unit-test access OR covered implicitly by integration test.
- [ ] Zero inline styles except ConfidencePill's dynamic `{backgroundColor, color}` pair (per runtime confidence level).
- [ ] Real-block suggestion counts recorded in result log for all 4 blocks.

## After Writing

Report back with:
1. Commit SHA(s).
2. Arch-test count (expected 467/0).
3. Test totals (expected 27/27).
4. Suggestion counts for all 4 real blocks.
5. Fixture contract verification table (3 fixtures × pass/fail).
6. Deviations + Plan Corrections (if any).

---

**Brain contract:** after Phase 3 result is clean, Brain writes `logs/wp-026/phase-4-task.md` (session.ts + POST endpoint + Save + backup-on-first-save + dirty-state + re-analyze post-save).
