# WP-027 Phase 3 — Core engine integration + suggestion list (display only)

**For:** Hands agent
**From:** Brain (via planning assistant)
**WP:** `workplan/WP-027-studio-responsive-tab.md` (amended; Phase 2 locked PARITY §7 + §8 + §9)
**Phase 2 result:** `logs/wp-027/phase-2-result.md` — 28/28 tests green; parity check PASS with URL-rewriter delta documented as §9; engine display path DONE.
**Phase 0 result:** `logs/wp-027/phase-0-result.md` — carry-over (e) snapshot-as-ground-truth reminder; carry-over (f) 7-dot test paths for fixture reuse.
**Goal:** Wire `analyzeBlock` + `generateSuggestions` into ResponsiveTab. Display the suggestion list sorted heuristic → selector → BP. Confidence badge for each row. Accept/Reject buttons present but **DISABLED** until Phase 4. Warnings from engine surface as banner above list. Fixture-reuse integration test via 7-dot `?raw` paths with snapshot-as-ground-truth cross-ref. arch-test stays **489 / 0** (no new files; hook inlined in ResponsiveTab).

---

## Context you MUST load first

1. `workplan/WP-027-studio-responsive-tab.md` — Phase 3 tasks 3.1–3.6, amendments block, Key Decisions "Suggestion UX" row
2. `logs/wp-027/phase-2-result.md` — confirm Phase 2 output shape (ResponsiveTab currently renders `<ResponsivePreview block={block} />` with TODO comment for suggestion list slot; PARITY §7 + §8 + §9 are locked)
3. `logs/wp-027/phase-0-result.md` — carry-over (e) snapshot-as-ground-truth trap; carry-over (f) fixture paths from `__tests__/` perspective (7 dots)
4. `packages/block-forge-core/src/index.ts` — engine public API. **Re-verify at read-time** the exact signatures of `analyzeBlock`, `generateSuggestions`, and the `Suggestion` / `Warning` return types. Don't trust memory; plan was wrong about this kind of thing before (Phase 2 double-wrap bug).
5. `tools/block-forge/src/components/SuggestionList.tsx` + `SuggestionRow.tsx` + `ConfidencePill.tsx` (if exists) — **reference components.** Your Studio versions mirror the shape + behavior; styling uses Studio's DS tokens, not block-forge's.
6. `tools/block-forge/src/hooks/useAnalysis.ts` (or wherever the analysis hook lives in block-forge) — semantic reference for the hook you'll inline in ResponsiveTab. If there's a constant called `HEURISTIC_ORDER` or similar exported from block-forge or the engine, read it verbatim; Studio must order identically.
7. `tools/block-forge/src/__tests__/integration.test.tsx` — reference for your Studio `integration.test.tsx`. Your file reuses WP-025 engine fixtures via 7-dot `?raw` paths.
8. `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` — **AUTHORITATIVE.** Before asserting `expect(suggestions).toContain(...)` on any reused fixture, open this file and find the authoritative suggestion set for that fixture slug. Fixture filename is aspirational; snapshot is authority. Saved memory `feedback_fixture_snapshot_ground_truth.md`.
9. `packages/ui/src/theme/tokens.css` — find the real token names for confidence levels (high/medium/low). Check for `--status-success-*`, `--status-warning-*`, `--status-error-*`, `--text-muted`, etc. Don't invent token names.

---

## Brain rulings locked for Phase 3 (do NOT re-litigate)

1. **Hook placement: inline in `ResponsiveTab.tsx`, not a new file.** No manifest delta this phase. Rationale: the hook is ~30 LOC of `useMemo` over engine calls; extracting to a standalone file adds bookkeeping (one more `owned_files` entry + one more test file) for no testability gain — integration test covers the hook via ResponsiveTab render path. Copy-then-extract principle applies; extract when a second consumer appears (Phase 4+ may surface one).

2. **Analyze the BASE block only, not the composed preview output.** `useResponsiveAnalysis({ block })` runs `analyzeBlock + generateSuggestions` on `{ slug: block.slug, html: block.html ?? '', css: block.css ?? '' }` — ignores `block.variants`. Rationale: suggestions are about the author's BASE CSS; variant CSS is typically short breakpoint overrides, and analyzing the composed output would surface suggestions on engine-generated variant-scoping rules which the author can't meaningfully act on. Phase 3 keeps it simple; WP-028 (variants drawer) may revisit.

3. **Suggestion ordering: heuristic → selector → BP.** Mirror whatever `HEURISTIC_ORDER` constant/function `tools/block-forge` uses. If block-forge imports it from the engine, Studio imports the same. If block-forge defines it locally, read it verbatim and copy the constant to `SuggestionList.tsx` — do NOT invent a different order.

4. **Accept/Reject buttons DISABLED this phase.** Rendered (HTML-present) but `disabled={true}`; no click handlers, no session-state dispatch. Phase 4 enables them AND wires `form.setValue('code', ..., { shouldDirty: true })`. This keeps Phase 3 display-only scope clean.

5. **Warnings banner above the list.** `analyzeBlock` return type includes a `warnings` array (re-verify shape at read-time from engine source — may be `string[]` or `Warning[]`). If `warnings.length > 0`, render a single banner above the suggestion list with each warning as a bullet. **Banner tokens: `--status-error-*`** (mirrors block-forge reference — its SuggestionList uses error tokens for the warnings banner despite `--status-warn-*` being available in tokens.css. Cross-surface parity wins over semantic purity; any future rebrand edits both surfaces together).

6. **Empty state (zero suggestions AND zero warnings).** SuggestionList renders a friendly placeholder: "No responsive suggestions for this block — looks good." Muted styling via `hsl(var(--text-muted))` + `var(--text-sm-font-size)` + `var(--spacing-xl)` padding.

7. **Fixture reuse via 7-dot `?raw` paths (Phase 0 carry-over (f)).** DO NOT copy WP-025 fixtures into `apps/studio/**`. Import directly:
   ```ts
   import blockSpacingFontHtml from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
   import blockSpacingFontCss  from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'
   ```
   (7 dots from `__tests__/` subdir.)

8. **Snapshot-as-ground-truth for all `toContain` on heuristic-trigger fixtures.** Before writing ANY assertion like `expect(suggestions.map(s => s.heuristic)).toContain('spacing-clamp')`, open `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` and find the authoritative set for that fixture. Fixture filename is aspirational (e.g. `block-spacing-font.css` name suggests spacing-clamp AND font-clamp fire, but reality may be just font-clamp due to var()-skip gates — see saved memory `feedback_fixture_snapshot_ground_truth.md`). Assert against what the snapshot SHOWS, not what the filename SUGGESTS.

9. **DS token discipline (still load-bearing from Phase 1/2).** Zero hardcoded hex, zero hardcoded px except breakpoint widths + LOC budgets. Any confidence badge color / banner bg / divider border uses `hsl(var(--...))`. `lint-ds` blocks commit otherwise.

---

## Hard gates

- **Do NOT touch** `apps/studio/src/components/block-preview.tsx`, `tools/block-forge/**`, `apps/api/**`, `packages/block-forge-core/**`.
- **Do NOT add new manifest entries.** Phase 3 works on files already registered in Phase 1. `SuggestionList.tsx` and `SuggestionRow.tsx` move from `return null` stubs to real content; `suggestion-row.test.tsx` and `integration.test.tsx` move from `describe.skip` to real tests.
- **Do NOT create new source files.** Hook is inline in ResponsiveTab.tsx (Brain ruling 1). If you catch yourself wanting to extract into `useResponsiveAnalysis.ts`, stop and surface.
- **Do NOT enable Accept/Reject handlers** (Brain ruling 4). No `onClick` wiring, no session-state dispatch. Buttons render with `disabled={true}` only.
- **Do NOT call `applySuggestions`** — that's Phase 4.
- **Do NOT touch `block-editor.tsx`** — prop wiring was done in Phase 2.6, no changes needed here.
- **Do NOT modify PARITY.md** — §7/§8/§9 are locked from Phase 2. If Phase 3 surfaces a new deviation, surface to Brain before editing.
- **Do NOT copy WP-025 fixtures into Studio.** Use 7-dot `?raw` path imports (Brain ruling 7).

---

## The 8 tasks

### 3.1 Inline `useResponsiveAnalysis` hook in `ResponsiveTab.tsx`

Replace current `ResponsiveTab.tsx` content. Add an inline hook + render a grid of preview + suggestion list.

```tsx
import { useMemo } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  type Suggestion,
} from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'
import { ResponsivePreview } from './ResponsivePreview'
import { SuggestionList } from './SuggestionList'

interface ResponsiveTabProps {
  block: Block | null
}

interface AnalysisResult {
  suggestions: Suggestion[]
  warnings: string[]  // re-verify shape from engine; may be string[] or Warning[]
  error: Error | null
}

function useResponsiveAnalysis(block: Block | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return { suggestions: [], warnings: [], error: null }
    try {
      const analysis = analyzeBlock({
        slug: block.slug,
        html: block.html ?? '',
        css: block.css ?? '',
      })
      const suggestions = generateSuggestions(analysis)
      return {
        suggestions,
        warnings: analysis.warnings ?? [],
        error: null,
      }
    } catch (err) {
      return {
        suggestions: [],
        warnings: [],
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }, [block?.id, block?.html, block?.css])
  // Deliberately NOT keyed on block.variants — Brain ruling 2 (analyze base only)
}

export function ResponsiveTab({ block }: ResponsiveTabProps) {
  const { suggestions, warnings, error } = useResponsiveAnalysis(block)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden',
    }}>
      <ResponsivePreview block={block} />
      <SuggestionList
        suggestions={suggestions}
        warnings={warnings}
        error={error}
      />
    </div>
  )
}
```

**Key implementation details:**
- **Re-verify engine shape before writing.** Open `packages/block-forge-core/src/index.ts` + the analyzeBlock source — confirm the return type of `analyzeBlock` actually has a `warnings` field and what its shape is (`string[]` vs `Warning[]` vs something else). If the type differs from what my draft shows, use the real shape; don't rewrite the engine.
- **useMemo deps:** `block?.id`, `block?.html`, `block?.css` — stable primitives. Do NOT include `block` (new ref every render) or `block?.variants` (Brain ruling 2: analyze base only, variants ignored here).
- **Error path:** if engine throws, `suggestions` + `warnings` become empty and `error` captures the exception. SuggestionList renders an error banner instead of the normal list. Prevents a thrown engine call from crashing the whole tab.
- **No new imports or files.** Hook + component both inside ResponsiveTab.tsx.

**LOC budget:** ~50 additional LOC in ResponsiveTab.tsx (currently ~15 LOC from Phase 2).

### 3.2 `SuggestionList.tsx` — real content

Replace `return null` stub at `apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx`.

```tsx
import type { Suggestion, Heuristic } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'

// HEURISTIC_ORDER — copy verbatim from tools/block-forge/src/components/SuggestionList.tsx:20-27.
// Phase 3 pre-flight confirmed block-forge defines it LOCALLY (not exported from the engine).
// Studio copies the constant here; future cross-surface resync keeps them aligned via the
// Phase 5 Close PARITY approval gate.
const HEURISTIC_ORDER: readonly Heuristic[] = [
  'grid-cols',
  'spacing-clamp',
  'font-clamp',
  'flex-wrap',
  'horizontal-overflow',
  'media-maxwidth',
]

function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  // Heuristic → selector → BP
  return [...suggestions].sort((a, b) => {
    const hIdxA = HEURISTIC_ORDER.indexOf(a.heuristic)
    const hIdxB = HEURISTIC_ORDER.indexOf(b.heuristic)
    if (hIdxA !== hIdxB) return hIdxA - hIdxB
    if (a.selector !== b.selector) return a.selector.localeCompare(b.selector)
    return a.bp - b.bp  // bp is always number per Suggestion type (types.ts:45); no null guard
  })
}

interface SuggestionListProps {
  suggestions: Suggestion[]
  warnings: string[]  // engine's analysis.warnings shape — re-verify at read-time; adapt if it's Warning[] with .message
  error: Error | null
}

export function SuggestionList({ suggestions, warnings, error }: SuggestionListProps) {
  // Error state
  if (error) {
    return (
      <div style={{
        padding: 'var(--spacing-xl)',
        backgroundColor: 'hsl(var(--status-error-bg))',
        color: 'hsl(var(--status-error-fg))',
        borderRadius: 'var(--rounded-md)',
        margin: 'var(--spacing-xl)',
      }}>
        <strong>Analysis error:</strong> {error.message}
      </div>
    )
  }

  // Empty state
  if (suggestions.length === 0 && warnings.length === 0) {
    return (
      <div style={{
        padding: 'var(--spacing-xl)',
        color: 'hsl(var(--text-muted))',
        fontSize: 'var(--text-sm-font-size)',
      }}>
        No responsive suggestions for this block — looks good.
      </div>
    )
  }

  const sorted = sortSuggestions(suggestions)

  return (
    <div style={{ padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {warnings.length > 0 && (
        <div style={{
          // Mirror block-forge: warnings banner uses --status-error-* (cross-surface parity,
          // even though tokens.css also has --status-warn-bg/-fg available). Any rebrand of
          // warnings visuals must edit both surfaces in lockstep.
          padding: 'var(--spacing-md)',
          backgroundColor: 'hsl(var(--status-error-bg))',
          color: 'hsl(var(--status-error-fg))',
          borderRadius: 'var(--rounded-md)',
          fontSize: 'var(--text-sm-font-size)',
        }}>
          <strong>Warnings ({warnings.length})</strong>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
            {warnings.map((w, i) => (
              <li key={i}>{typeof w === 'string' ? w : w.message /* adjust to Warning shape */}</li>
            ))}
          </ul>
        </div>
      )}
      {sorted.map(s => (
        <SuggestionRow key={s.id} suggestion={s} />
      ))}
    </div>
  )
}
```

**Key details (post-reference-verification):**
- **HEURISTIC_ORDER verbatim from reference** (`tools/block-forge/src/components/SuggestionList.tsx:20-27`). Engine does NOT export this constant publicly — it's a local block-forge const. Studio copies it. Cross-surface drift becomes Phase 5 Close gate item.
- **`bp` is always `number`** (verified — engine `types.ts:45`). Sort subtracts directly; no `?? 0` guard.
- **Error state** uses `--status-error-*` + `--rounded-md` (real tokens from tokens.css:122-123, 314).
- **Warnings banner** uses `--status-error-*` (mirrors reference; tokens.css:122-123). Inline comment documents the cross-surface parity rationale.
- **Warning shape verification** — `analysis.warnings` engine return: verify at read-time whether it's `string[]` or `Warning[]`. Current guard `typeof w === 'string' ? w : w.message` handles both but adapt cleanly once shape is confirmed.

### 3.3 `SuggestionRow.tsx` — real content with DISABLED buttons (ref-aligned)

Replace `return null` stub. **Structurally mirror `tools/block-forge/src/components/SuggestionRow.tsx`** (Phase 3 pre-flight confirmed all token + field references). The reference uses Tailwind className + `bg-[hsl(var(--token))]` pattern; Studio currently has no Tailwind-in-studio setup, so we use inline `style={{ ... }}` with token vars. Behavior byte-identical, styling mechanism differs.

```tsx
import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

interface SuggestionRowProps {
  suggestion: Suggestion
}

// Confidence → token mapping (verbatim from tools/block-forge/src/components/SuggestionRow.tsx:26-45).
// Labels are lowercase; CSS text-transform: uppercase handles display.
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px var(--spacing-xs)',
        borderRadius: 'var(--rounded-full)',
        backgroundColor: s.bg,
        color: s.fg,
        fontSize: 'var(--text-xs-font-size)',
        fontWeight: 'var(--font-weight-semibold)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {s.label}
    </span>
  )
}

export function SuggestionRow({ suggestion }: SuggestionRowProps) {
  const { id, heuristic, selector, bp, property, value, rationale, confidence } = suggestion

  return (
    <div
      data-suggestion-id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-sm)',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-sm)',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      {/* Header row: heuristic tag + bp + confidence pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
        <span
          data-role="heuristic"
          style={{
            padding: '2px var(--spacing-xs)',
            borderRadius: 'var(--rounded-sm)',
            backgroundColor: 'hsl(var(--bg-page))',
            color: 'hsl(var(--text-primary))',
            fontFamily: 'var(--font-family-monospace)',
            fontSize: 'var(--text-xs-font-size)',
          }}
        >
          {heuristic}
        </span>
        <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
          {bp === 0 ? 'base' : `@${bp}px`}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <ConfidencePill level={confidence} />
        </span>
      </div>

      {/* The actionable CSS line — core of the suggestion */}
      <div style={{
        fontFamily: 'var(--font-family-monospace)',
        fontSize: 'var(--text-xs-font-size)',
        color: 'hsl(var(--text-primary))',
      }}>
        <span style={{ color: 'hsl(var(--text-muted))' }}>{selector}</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      {/* Rationale */}
      <p style={{
        margin: 0,
        fontSize: 'var(--text-sm-font-size)',
        color: 'hsl(var(--text-primary))',
      }}>
        {rationale}
      </p>

      {/* Accept/Reject — DISABLED in Phase 3 per Brain ruling 4 */}
      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-2xs)' }}>
        <button
          type="button"
          data-action="accept"
          disabled
          aria-label="Accept suggestion (enabled in Phase 4)"
          style={{
            padding: '4px var(--spacing-sm)',
            borderRadius: 'var(--rounded-sm)',
            border: '1px solid hsl(var(--status-success-fg))',
            backgroundColor: 'hsl(var(--status-success-bg))',
            color: 'hsl(var(--status-success-fg))',
            fontSize: 'var(--text-xs-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            opacity: 0.5,
            cursor: 'not-allowed',
          }}
        >
          Accept
        </button>
        <button
          type="button"
          data-action="reject"
          disabled
          aria-label="Reject suggestion (enabled in Phase 4)"
          style={{
            padding: '4px var(--spacing-sm)',
            borderRadius: 'var(--rounded-sm)',
            border: '1px solid hsl(var(--border-default))',
            backgroundColor: 'hsl(var(--bg-surface))',
            color: 'hsl(var(--text-muted))',
            fontSize: 'var(--text-xs-font-size)',
            opacity: 0.5,
            cursor: 'not-allowed',
          }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
```

**Key details (post-reference-verification):**
- **Field names verified** (`types.ts:41-50`): `id`, `heuristic`, `selector`, `bp: number`, `property: string`, `value: string`, `rationale: string`, `confidence`.
- **`bp === 0 ? 'base' : \`@${bp}px\`` exact mirror** of reference (`SuggestionRow.tsx:93`). NO `?? 'base'` pattern — bp is always a number.
- **Property + value rendering is core actionable info** — reference L101-106 shows `<code>{selector} { property: value; }</code>`. Omitting these fields makes the row useless (tells author what heuristic fired but not what to change). Engine populates them; render them.
- **Labels lowercase `'high'/'medium'/'low'`** per reference (L33, L38, L43). CSS `text-transform: uppercase` handles display. Test assertions check lowercase textContent.
- **Confidence token mapping verbatim from reference:** high → success, medium → **info** (not warning), low → bg-surface + text-muted. All tokens verified present in `packages/ui/src/theme/tokens.css`.
- **Radii:** `--rounded-sm` (4px) for card, `--rounded-full` (9999px) for confidence pill. `--rounded-md` exists as 6px if needed.
- **Spacing tokens all verified:** `--spacing-2xs` (4px), `--spacing-xs` (8px), `--spacing-sm` (12px), `--spacing-md` (16px), etc.
- **Accept/Reject DISABLED** — `disabled` attr + `cursor: not-allowed` + `opacity: 0.5` to make it visually apparent. No click handlers.
- **No Tailwind** — inline `style={{ }}` with token vars. Studio doesn't have Tailwind today; reference uses className (`bg-[hsl(var(--token))]`) because block-forge has Tailwind. Behavior identical; styling mechanism differs.
- **data-role="heuristic"** + **data-action="accept"/"reject"** attrs set for test targeting + future Phase 4 wiring.

### 3.4 Wire into ResponsiveTab layout (already done in 3.1)

Task 3.1's ResponsiveTab draft already imports and renders `<SuggestionList>` below `<ResponsivePreview>`. No additional wiring needed here if 3.1 and 3.2 are done. Just verify the layout renders without overflow clashes.

**Verify manually:** `npm -w @cmsmasters/studio run dev` → open any block with likely heuristic triggers (grep content/db/blocks for `.hero` + media queries or complex spacing) → click Responsive tab → preview triptych renders above + suggestion list (or empty state / warnings / error state) renders below.

### 3.5 `__tests__/suggestion-row.test.tsx` — replace stub

Replace `describe.skip` stub. Unit tests for SuggestionRow rendering + disabled-state contract.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { SuggestionRow } from '../SuggestionRow'
import type { Suggestion } from '@cmsmasters/block-forge-core'

afterEach(cleanup)  // RTL cleanup isn't auto in Vitest — saved memory from WP-026 Phase 3

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  // All fields verified against types.ts:41-50. `bp` is number (not nullable).
  // `property` + `value` are required — mandatory for the core actionable CSS line.
  return {
    id: 'test-suggestion-1',
    heuristic: 'spacing-clamp',
    selector: '.hero',
    bp: 768,
    property: 'padding',
    value: 'clamp(1rem, 5vw, 3rem)',
    rationale: 'Test rationale for spacing-clamp.',
    confidence: 'high',
    ...overrides,
  }
}

describe('SuggestionRow', () => {
  it('renders heuristic, selector, bp, property, value, rationale', () => {
    render(<SuggestionRow suggestion={makeSuggestion()} />)
    expect(screen.getByText('spacing-clamp')).toBeTruthy()
    expect(screen.getByText(/\.hero/)).toBeTruthy()       // selector in monospace line
    expect(screen.getByText(/@768px/)).toBeTruthy()       // bp label (reference format)
    expect(screen.getByText(/padding/)).toBeTruthy()      // property in CSS line
    expect(screen.getByText(/clamp\(1rem/)).toBeTruthy()  // value in CSS line
    expect(screen.getByText(/Test rationale/)).toBeTruthy()
  })

  it('renders "high" confidence label for high confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'high' })} />)
    // Label stored lowercase per reference (SuggestionRow.tsx:33); CSS text-transform uppercases it.
    // RTL reads source textContent (lowercase) — test assertion targets the raw label string.
    expect(screen.getByText('high')).toBeTruthy()
  })

  it('renders "medium" confidence label for medium confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'medium' })} />)
    expect(screen.getByText('medium')).toBeTruthy()
  })

  it('renders "low" confidence label for low confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'low' })} />)
    expect(screen.getByText('low')).toBeTruthy()
  })

  it('Accept and Reject buttons are DISABLED (Phase 3 contract)', () => {
    render(<SuggestionRow suggestion={makeSuggestion()} />)
    const accept = screen.getByRole('button', { name: /accept/i })
    const reject = screen.getByRole('button', { name: /reject/i })
    expect(accept).toHaveProperty('disabled', true)
    expect(reject).toHaveProperty('disabled', true)
  })

  it('renders bp as "base" when bp === 0 (reference convention)', () => {
    // bp is always number per types.ts:45 — no null/undefined path. bp === 0 means
    // "top-level rule, no media-maxwidth" per engine convention (media-maxwidth bp:0).
    render(<SuggestionRow suggestion={makeSuggestion({ bp: 0 })} />)
    expect(screen.getByText('base')).toBeTruthy()
    // And for non-zero bp, format is "@Npx":
    cleanup()
    render(<SuggestionRow suggestion={makeSuggestion({ bp: 480 })} />)
    expect(screen.getByText('@480px')).toBeTruthy()
  })

  it('data-suggestion-id attribute matches suggestion.id', () => {
    const { container } = render(<SuggestionRow suggestion={makeSuggestion({ id: 'abc-123' })} />)
    const row = container.querySelector('[data-suggestion-id]')
    expect(row?.getAttribute('data-suggestion-id')).toBe('abc-123')
  })
})
```

**Key details (post-reference-verification):**
- **`afterEach(cleanup)` is mandatory** — saved memory from WP-026 Phase 3; RTL doesn't auto-cleanup in Vitest.
- **`getByText` throws on miss** — `toBeTruthy()` is belt-and-suspenders. Do NOT add `@testing-library/jest-dom` for `toBeInTheDocument`.
- **Suggestion factory has ALL required fields** — `id`, `heuristic`, `selector`, `bp: number`, `property: string`, `value: string`, `rationale: string`, `confidence: Confidence`. No `as Suggestion` cast needed because the factory returns a complete object. TypeScript happy.
- **Lowercase confidence labels** — reference stores `'high'/'medium'/'low'` as strings; CSS handles uppercase display. Tests read source textContent (lowercase).
- **bp === 0 case** replaces the wrong "null/undefined" case. Two assertions in one test: bp=0 renders "base", bp=480 renders "@480px".
- **7 cases total.**

### 3.6 `__tests__/integration.test.tsx` — replace stub with fixture-based test

Replace `describe.skip` stub. Phase 1 created this stub with comment "Phase 4"; Phase 3 **hijacks** it for fixture-based integration testing (display path) and Phase 4 **expands** it with save-flow cases. Intentional per the amended Phase-3 plan. Update the file-header comment from `"Phase 4"` to `"Phase 3 (display) + Phase 4 (save flow)"` when you replace the stub.

Integration test renders ResponsiveTab with a fixture-shaped block; verifies suggestions surface correctly; uses WP-025 fixtures via 7-dot `?raw` paths.

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ResponsiveTab } from '../ResponsiveTab'
import type { Block } from '@cmsmasters/db'

// Fixture reuse per Brain ruling 7 (Phase 0 carry-over (f)) — 7 dots from __tests__/
import blockSpacingFontHtml from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
import blockSpacingFontCss  from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'
import blockPlainCopyHtml  from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.html?raw'
import blockPlainCopyCss   from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.css?raw'

afterEach(cleanup)

function fixtureBlock(slug: string, html: string, css: string): Block {
  // Synthesize a minimum-viable Block shape. Verify the Block type fields at read-time —
  // engine's analyzeBlock only reads { slug, html, css }; full Block shape has more fields
  // (id, name, created_at, etc.) which ResponsiveTab may or may not need. Fill in as the
  // TypeScript compiler demands.
  return {
    id: `fixture-${slug}`,
    slug,
    html,
    css,
    variants: null,
    // ... other required fields per Block type — use plausible defaults
  } as Block
}

describe('ResponsiveTab — integration via WP-025 fixtures', () => {
  it('block-spacing-font: 3 suggestions (font-clamp + 2× media-maxwidth) per snapshot ground truth', () => {
    // ⚠ SNAPSHOT-AS-GROUND-TRUTH (saved memory feedback_fixture_snapshot_ground_truth.md).
    // Ground truth per snapshot.test.ts.snap:470-475:
    //   "suggestionCount": 3,
    //   "suggestionHeuristics": ["font-clamp", "media-maxwidth", "media-maxwidth"],
    //   "warnings": []
    // The fixture filename suggests spacing-clamp fires, but engine's var()-skip gate
    // ignores spacing values wrapped in var() — so spacing-clamp does NOT fire. Don't assert it.
    // HEURISTIC_ORDER sort keeps font-clamp first (index 2) then media-maxwidth (index 5).

    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)

    // Count total rendered suggestion rows via data-suggestion-id attribute
    const rows = document.querySelectorAll('[data-suggestion-id]')
    expect(rows.length).toBe(3)

    // All suggestion heuristics render in data-role="heuristic" spans
    const heuristicSpans = document.querySelectorAll('[data-role="heuristic"]')
    const heuristicTexts = Array.from(heuristicSpans).map(el => el.textContent?.trim())
    expect(heuristicTexts).toEqual(['font-clamp', 'media-maxwidth', 'media-maxwidth'])
    // Order reflects HEURISTIC_ORDER sort: font-clamp (idx 2) before media-maxwidth (idx 5).

    // No warnings banner rendered (snapshot shows warnings: [])
    expect(screen.queryByText(/^Warnings \(/)).toBeNull()
  })

  it('block-plain-copy: empty state (no heuristic triggers, no warnings)', () => {
    // Ground truth per snapshot: plain-copy fixture has zero triggers — verify the exact
    // snapshot entry before relying on this. If reality differs, adapt.
    const block = fixtureBlock('block-plain-copy', blockPlainCopyHtml, blockPlainCopyCss)
    render(<ResponsiveTab block={block} />)
    expect(screen.getByText(/No responsive suggestions/i)).toBeTruthy()
    // No rows rendered:
    expect(document.querySelectorAll('[data-suggestion-id]').length).toBe(0)
  })

  it('null block: renders empty preview prompt + empty suggestion state', () => {
    render(<ResponsiveTab block={null} />)
    expect(screen.getByText(/Select a block/i)).toBeTruthy()
    expect(screen.getByText(/No responsive suggestions/i)).toBeTruthy()
  })

  it('Accept/Reject buttons remain DISABLED across all suggestion rows (block-spacing-font)', () => {
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)
    const acceptButtons = screen.queryAllByRole('button', { name: /accept/i })
    const rejectButtons = screen.queryAllByRole('button', { name: /reject/i })
    // Expect 3 of each (one per row)
    expect(acceptButtons.length).toBe(3)
    expect(rejectButtons.length).toBe(3)
    for (const btn of acceptButtons) expect(btn).toHaveProperty('disabled', true)
    for (const btn of rejectButtons) expect(btn).toHaveProperty('disabled', true)
  })
})
```

**Key details:**
- **Snapshot-as-ground-truth is NOT optional.** Before running the tests, open the snapshot file and adapt the assertions to what it shows. If you skip this step, tests may pass against wrong assumptions (false positive) or fail spuriously (false negative).
- **7-dot `?raw` paths are Brain-locked** — don't copy fixtures into apps/studio.
- **Block type shape** — engine only cares about `{ slug, html, css }`; full Block type from `@cmsmasters/db` has more required fields. Cast with `as Block` if TypeScript complains about missing fields that the tab doesn't actually read. Record any cast notes in phase-3-result.md.
- **Only 4 test cases** — keep integration focused. Phase 4 will expand with save flow, error paths, etc.

### 3.7 Token sanity-check (pre-flight already verified)

Phase 3 pre-flight reviewed tokens.css and locked the real token names. The draft above uses only verified-present tokens. Before committing, re-grep `packages/ui/src/theme/tokens.css` for these exact names and confirm they still exist (in case tokens.css moved since pre-flight):

**Colors (semantic + surface):**
- `--status-success-bg` / `--status-success-fg` ✅ (tokens.css:120-121)
- `--status-info-bg` / `--status-info-fg` ✅ (tokens.css:126-127) ← medium confidence mapping
- `--status-error-bg` / `--status-error-fg` ✅ (tokens.css:122-123) ← warnings banner + error state
- `--status-warn-bg` / `--status-warn-fg` ✅ (tokens.css:124-125) ← **exists but NOT used** (block-forge reference uses --status-error-* for warnings; Studio mirrors for parity)
- `--bg-surface` / `--bg-surface-alt` / `--bg-page` ✅ (tokens.css:97-98 + elsewhere)
- `--text-muted` / `--text-primary` ✅ (tokens.css:107 + elsewhere)
- `--border-default` ✅ (tokens.css:114)

**Radii:**
- `--rounded-sm` (4px) / `--rounded-md` (6px) / `--rounded-lg` (8px) / `--rounded-full` (9999px) ✅ (tokens.css:313-314, 315, 320)

**Spacing:**
- `--spacing-2xs` (4px) / `--spacing-xs` (8px) / `--spacing-sm` (12px) / `--spacing-md` (16px) / `--spacing-lg` (20px) / `--spacing-xl` (24px) ✅ (tokens.css:293-300)

**Typography:**
- `--font-weight-semibold` ✅ (tokens.css:289)
- `--font-family-monospace` — verify at read-time (likely present in tokens.css; WP-026 Phase 1 hotfix used it)
- `--text-xs-font-size` / `--text-sm-font-size` — verify at read-time (part of the typography scale)

**Invalid tokens (DO NOT USE — they don't exist):**
- ❌ `--status-warning-bg/-fg/-border` (the scale uses `--status-warn-*`, not `-warning-*`; draft corrected)
- ❌ `--radius-sm/-md/-lg` (the scale uses `--rounded-*`, not `--radius-*`; draft corrected)
- ❌ `--bg-muted` (use `--bg-surface-alt` 0 0% 95% for muted surfaces, or `--bg-surface` per reference; draft corrected)

If `--font-family-monospace` or `--text-xs-font-size` / `--text-sm-font-size` doesn't exist in current tokens.css (unlikely but verify), record the substitution in phase-3-result.md Deviations section.

### 3.8 Gates

```bash
npm run arch-test                          # target: 489 / 0 (UNCHANGED — no new files)
npm run typecheck                          # target: clean
npm -w @cmsmasters/studio test             # target: 28 (P1 + P2) + 7 (suggestion-row) + 4 (integration) = 39 passed, 0 todo stubs remaining (integration.test.tsx now real content; Phase 4 expands it with save-flow cases)
npm -w @cmsmasters/studio run build        # target: clean
npm -w @cmsmasters/studio run dev          # manual:
                                           # - open a block with heuristic triggers
                                           #   → suggestion list renders below preview
                                           #   → rows ordered heuristic → selector → BP
                                           #   → confidence badges render with correct colors
                                           #   → Accept/Reject buttons visible but DISABLED
                                           # - open a plain-text block
                                           #   → empty state "No responsive suggestions"
                                           # - open a block that triggers warnings
                                           #   → warnings banner above list
```

**Cross-domain smoke:** run `npm -w @cmsmasters/admin run lint` + `npm -w @cmsmasters/dashboard run lint` — confirm no regression (not strictly required, but low-cost sanity check like Phase 1 did).

---

## Result log template

```markdown
# WP-027 Phase 3 — Result

**Date:** 2026-04-DD
**Duration:** ~Xh
**Commits:**
- Task prompt: <SHA> — logs/wp-027/phase-3-task.md
- Implementation: <SHA> — atomic Phase 3 commit
- Result log: <SHA> — this file (SHA-embed amend)

**Arch-test:** 489 / 0 (unchanged — no manifest edits)
**Studio test suite:** <N> passed | <M> todo
**Studio typecheck:** clean
**Studio build:** clean

---

## Task-by-task

### 3.1 useResponsiveAnalysis hook (inline)
<engine return shape as verified; useMemo dep array; error path behavior>

### 3.2 SuggestionList
<HEURISTIC_ORDER source: engine export | block-forge local copy | link to source>
<token substitutions if any from tokens.css reality check>

### 3.3 SuggestionRow
<Suggestion field verifications; confidence badge mapping; disabled button contract>

### 3.4 Layout verification
<manual render confirmation — which blocks tested>

### 3.5 suggestion-row.test.tsx
<7 cases green; any Suggestion field adaptations from draft>

### 3.6 integration.test.tsx
<snapshot-as-ground-truth cross-ref: what snapshot.test.ts.snap actually showed for reused fixtures; assertions adapted accordingly>
<Block type cast notes if any>

### 3.7 Token verification
<list of hsl(var(--...)) references; which tokens existed; any substitutions>

### 3.8 Gates
<all green>

---

## Deviations / Plan Corrections
<engine return shape surprises; token substitutions; snapshot-driven assertion corrections; anything else>

---

## Carry-overs for Phase 4
- <Session-state wiring: accept dispatches via form.setValue('code', ..., { shouldDirty: true })>
- <Hono revalidate patch ≤15 LOC — Phase 4.0 mini-RECON>
- <updateBlockApi TS payload +variants: BlockVariants — one-line>
- <Error toast integration via useToast()>

---

## Ready for Phase 4
<summary>
```

---

## Verification + commit sequence

Single atomic commit for implementation:

```bash
# 1. Commit task prompt:
git add logs/wp-027/phase-3-task.md
git commit -m "chore(logs): WP-027 Phase 3 task prompt"

# 2. Do work 3.1–3.7. Stage EXPLICITLY (no -A / no .):
git add apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
git add apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx
git add apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-row.test.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx

# Verify exactly those 5 files are staged:
git status
git diff --staged --stat

git commit -m "feat(studio): WP-027 Phase 3 — analyzeBlock + generateSuggestions wiring; suggestion list display-only"

# 3. Write phase-3-result.md; commit + SHA-embed amend.
```

---

## Escalation protocol

Surface to Brain BEFORE committing if any of:
- **Engine return shape differs materially from my draft** — e.g. `analyzeBlock` returns something that isn't `{ warnings, ... }`; `Suggestion` missing a field I used. Stop, re-plan the hook contract.
- **`HEURISTIC_ORDER` doesn't exist in engine or block-forge** — can't mirror without a source. Ask before inventing an order.
- **Snapshot-as-ground-truth reveals assertions in my draft are wrong** — tests won't pass as written. Update assertions per snapshot, document in phase-3-result.md.
- **Required DS tokens don't exist in tokens.css** — substitution may cascade visually. Flag if the gap is more than 1–2 tokens.
- **Fixture `?raw` paths don't resolve** — check Vite path depth, may need adjustment (Phase 0 said 7, but file moves since could change depth).
- **Engine `analyzeBlock` throws on fixture input** — should return warnings instead; if it throws, that's an engine bug or a contract misalignment. Don't silently swallow.

---

## Estimated effort

~2.5h focused. Split:
- 3.1 hook inline: 25 min
- 3.2 SuggestionList: 30 min
- 3.3 SuggestionRow: 35 min (DS token care)
- 3.4 layout verify: 10 min
- 3.5 suggestion-row tests: 30 min
- 3.6 integration test + snapshot cross-ref: 40 min (snapshot read is critical; don't rush)
- 3.7 token verify: 10 min
- 3.8 gates + result + commits: 30 min

Total ~3.5h ceiling (plan said ~2h but real-world padding from Phase 0/1/2 experience). If at 2.5h and not through 3.5, surface for check-in.

---

## Forward-reference

Phase 4 picks up:
- Enable Accept/Reject — dispatch to session-state reducer (Phase 1's `session-state.ts` finally gets a consumer).
- `form.setValue('code', appliedCode, { shouldDirty: true })` on Accept → RHF's `formState.isDirty` lights up existing Save button.
- Existing Save button → `updateBlockApi` (with variants TS fix) → fire-and-forget Hono `/api/content/revalidate { all: true }` call.
- Phase 4.0 mini-RECON on `apps/api/src/routes/revalidate.ts` ownership + LOC delta estimate before editing the Hono endpoint.
- Integration test expands with save flow (spy on `updateBlockApi` + `fetch`; assert RHF dirty transitions; assert session-state clearAfterSave).

**Phase 3 output:** engine integration live, suggestion list display-only, confidence badges + warnings banner + empty state all DS-token compliant, fixture-based integration test with snapshot-ground-truth cross-ref documented. Display path is DONE for both preview (Phase 2) and suggestions (Phase 3). Interactivity is Phase 4.

Let's go.
