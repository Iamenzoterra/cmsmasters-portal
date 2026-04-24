# LM-Reforge Phase 2 — Breakpoint Truth Surface

> Workplan: `tools/layout-maker/codex-review/12-workplan.md` (LM Trust Reforge)
> Phase: 2 of 7
> Priority: P0 (first trust-payoff phase after stability is locked)
> Estimated: 1–1.5d (~8–12h)
> Type: Frontend (new derivator + BreakpointBar rewrite + Inspector footer add) + contract tests + Playwright
> Previous: Phase 1 ✅ (Inspector + DrawerSettingsControl stability — commits `23fcc685`, `12efd4bf`; console clean across full BP rotation + drawer click)
> Next: Phase 3 (Live Validation + Export Cleanup — needs BP truth data to route validation items to the right BP chip)
> Affected surface: `tools/layout-maker/src/lib/` (new file) + `src/components/BreakpointBar.tsx` (rewrite) + `src/components/Inspector.tsx` (add footer) + `src/styles/maker.css` (optional new classes for badge/chip)

---

## Context

Today's `BreakpointBar` readout says `Grid: tablet` whether the active
grid is the canonical `tablet` key or a non-canonical alias like
`theme-tablet`. It also does not distinguish *active canonical BP* from
*resolved config key* from *what the next edit will write to*. Three
distinct concepts collapsed into one label — operator-hostile.

```
CURRENT (BreakpointBar.tsx:94-112):                         ❌ collapses canonical vs resolved vs target
  Viewport: 1400px  |  Grid: tablet  |  content: 1fr  |  Gap: 24px  |  Max: 1200px

TARGET (Phase 2 spec):                                      ✅ three truths visible
  Active:     Tablet — 768px (canonical)     [Ctrl+2]
  Resolved:   theme-tablet  @ min-width 1400px    [Non-canonical ⚠]
  Edit target: First edit will create grid.tablet from theme-tablet @ 1400px
  (or, after materialization:)
  Edit target: Tablet @ 768px

  (existing Viewport / column widths / Gap / Max stay, below)

INSPECTOR (no footer today):                                ❌ operator has no in-context BP reminder
  — add a small footer at Inspector's bottom mirroring the same data —

INSPECTOR AFTER (new footer block):                         ✅ in-context reminder, scope-aware
  ────────────────────────────────
  Breakpoint  Desktop → desktop (1440px)
  Edit writes to:  Base (role-level)  [or]  Override: theme-tablet
```

The bug class is **data visibility**, not behavior. `ensureGridEntry`
and `applySlotConfigUpdate` already materialize the canonical key on
first write — the algorithm is correct. The failure is that operators
have no way to predict this before clicking.

**Three data surfaces, one source of truth.** New pure function
`deriveBreakpointTruth(activeBreakpointId, grid): BreakpointTruth`
computed at render time in both `BreakpointBar` and `Inspector`. No
state, no plumbing, no behavior change — just display.

---

## Domain Context

LM is outside the monorepo domain manifest. No `npm run arch-test`.

**Invariants preserved by this phase:**

- **Parity with Portal — untouched.** Zero edits to `html-generator`,
  `css-generator`, `App.tsx` handlers, or `ensureGridEntry`. Workplan
  §Phase 2 "Risk" section is explicit: *"keep the current algorithm;
  only add the disclosure at UI level; do not change what gets written,
  only when user is told."*
- **`resolveGridKey` untouched.** The derivator builds ON it, not
  AROUND it. Current strategy (exact name → closest min-width → first
  key) is preserved; `BreakpointTruth` records which path was taken.
- **Materialization timing untouched.** `ensureGridEntry` still runs
  on first per-BP write inside `applySlotConfigUpdate`. P2 only
  *predicts* the write for the operator; it does not preempt or defer.

**Key invariants from `types.ts` Hands must respect:**

- `BreakpointGrid['min-width']` is a **string with "px" suffix** —
  parse with `parseInt(value, 10)` for comparison.
- `CANVAS_BREAKPOINTS[0-2]` has canonical widths: desktop 1440, tablet 768, mobile 375.
- `CanvasBreakpointId = 'desktop' | 'tablet' | 'mobile'` — grid keys
  can be anything (theme-tablet, narrow-desktop, etc.); canonical IDs
  are fixed.
- `getBaseGridKey(grid)` prefers `desktop` key, falls back via
  `resolveGridKey('desktop', grid)`. Don't collide with it.

---

## PHASE 0: Audit (do FIRST — CRITICAL, before any write)

**This audit is load-bearing. P1's Brain-gate correction was the
direct consequence of skipping a full file read. Hands must do the
reads; Brain's prompt is based on this recon but file state can drift.**

```bash
# A. Baseline — all prior tests green (3 P0 smoke + 3 Inspector + 1 DrawerSettings)
npm --prefix tools/layout-maker run test
#    expect: 7 passed (6 before P1 follow-up + 1 new DrawerSettingsControl.stability)

# B. Baseline — typecheck + build clean
npm --prefix tools/layout-maker run typecheck
npm --prefix tools/layout-maker run build
#    expect: exit 0 on both; build ~310.70 kB JS (P1 follow-up reference)

# C. Re-read BreakpointBar.tsx end-to-end
#    Brain read lines 1-199 at prompt authoring time; confirm:
#    - line 40: const gridKey = resolveGridKey(activeBreakpoint, config.grid)
#    - line 42: if (!grid) return null
#    - lines 94-112: .lm-bp-bar__widths row — SPECIFICALLY line 102:
#      <span>Grid: <strong>{gridKey}</strong></span>
#    If lines shifted → use Grep to locate, don't edit by line number alone.

# D. Re-read resolveGridKey implementation
sed -n '38,64p' tools/layout-maker/src/lib/types.ts
#    expect: strategy = exact name match → closest by min-width → first key
#    This is ground truth for the derivator's `isFallbackResolved` signal.

# E. Re-read ensureGridEntry
sed -n '92,103p' tools/layout-maker/src/App.tsx
#    expect: early return if config.grid[bpId] exists; otherwise clone from
#    resolveGridKey(bpId, config.grid) source + set min-width to canonical.
#    This is ground truth for `materializationSourceKey` + `willMaterializeCanonicalKey`.

# F. Confirm Inspector has NO breakpoint footer today
grep -nE "Breakpoint\b.*desktop|lm-inspector__footer|bp-footer" \
  tools/layout-maker/src/components/Inspector.tsx
#    expect: zero hits for anything that looks like a BP indicator at the
#    bottom of the panel. If Hands finds one — surface to Brain; recon
#    was wrong.

# G. Confirm CSS token scope
grep -nE "^\s*--lm-text-|^\s*--lm-bg-|^\s*--lm-border-" \
  tools/layout-maker/src/styles/maker.css | head -30
#    expect: LM chrome uses --lm-* tokens (NOT portal DS tokens).
#    New badge/chip classes this phase MUST reuse --lm-* — DS migration
#    is Appendix B, not P2.

# H. Grep-gate BASELINE re-run for delta reporting
#    Run the three gates from workplan §1 rule 6 and record counts.
#    P2 MAY touch CSS (badge/chip classes), so gate hits could grow.
#    Positive delta requires explicit justification in phase-2-result.md.
#    Current baseline (from phase-1-result.md Verification Results):
#    F.1=76, F.2=5, F.3=91  (vs P0 logged 75/3/87 — pre-existing drift captured in P1)

# I. Confirm canonical fixture `theme-page-layout` still loads
#    - npm --prefix tools/layout-maker run dev
#    - open http://localhost:7700
#    - confirm `theme-page-layout` appears in sidebar
#    - note: it uses canonical `desktop` + non-canonical `theme-tablet`
#    - this is the fixture for Playwright screenshots in Task 2.6
```

**Document A–I in `phase-2-result.md` before writing code.**

**IMPORTANT (carry-over from P0 binding hook):**
If any test this phase imports a `*.css?raw` string, it MUST assert
`expect(cssRaw.length).toBeGreaterThan(0)`. Pure derivator tests almost
certainly won't trigger this (they test a JS function, not CSS), but
the hook carries forward per P1 precedent.

---

## Task 2.1: `src/lib/breakpoint-truth.ts` — pure derivator

### What to Build

New file. Pure function. No React import. No state. No side effects.

```ts
import type { CanvasBreakpointId, BreakpointGrid } from './types'
import { CANVAS_BREAKPOINTS, resolveGridKey } from './types'

export interface BreakpointTruth {
  /** The canonical canvas BP the operator selected (desktop/tablet/mobile). */
  canonicalId: CanvasBreakpointId
  /** The canonical BP's width from CANVAS_BREAKPOINTS (1440/768/375). */
  canonicalWidth: number
  /** The grid key resolveGridKey picked (may equal canonicalId or an alias). */
  resolvedKey: string
  /** The resolved grid's min-width, parsed to number. */
  resolvedMinWidth: number
  /** True if `grid[canonicalId]` exists as an exact key. */
  hasCanonicalGridKey: boolean
  /** True if resolved exists but its min-width differs from canonical width. */
  isNonCanonicalMatch: boolean
  /** True when resolveGridKey fell back to nearest-match (no exact). */
  isFallbackResolved: boolean
  /** True when the next canonicalizing edit would materialize `grid[canonicalId]`. */
  willMaterializeCanonicalKey: boolean
  /** The grid key ensureGridEntry would clone from (matches resolvedKey when materializing). */
  materializationSourceKey: string
}

export function deriveBreakpointTruth(
  canonicalId: CanvasBreakpointId,
  grid: Record<string, BreakpointGrid>,
): BreakpointTruth {
  const canonicalWidth = CANVAS_BREAKPOINTS.find((b) => b.id === canonicalId)!.width
  const resolvedKey = resolveGridKey(canonicalId, grid)
  const resolvedGrid = grid[resolvedKey]
  const resolvedMinWidth = resolvedGrid ? parseInt(resolvedGrid['min-width'], 10) || 0 : 0

  const hasCanonicalGridKey = !!grid[canonicalId]
  const isFallbackResolved = !hasCanonicalGridKey && resolvedKey !== canonicalId
  const isNonCanonicalMatch = hasCanonicalGridKey
    ? resolvedMinWidth !== canonicalWidth  // exact key exists but widths diverge (pathological)
    : isFallbackResolved && resolvedMinWidth !== canonicalWidth

  const willMaterializeCanonicalKey = !hasCanonicalGridKey
  const materializationSourceKey = resolvedKey

  return {
    canonicalId,
    canonicalWidth,
    resolvedKey,
    resolvedMinWidth,
    hasCanonicalGridKey,
    isNonCanonicalMatch,
    isFallbackResolved,
    willMaterializeCanonicalKey,
    materializationSourceKey,
  }
}
```

### Domain Rules

- **Zero React imports.** The derivator is called during render in two
  components; it does not BELONG to render. Pure function, always returns
  a fresh object.
- **Reuse `resolveGridKey` verbatim** — do not re-implement the
  exact-match-then-closest-then-first strategy. If a bug is found in
  `resolveGridKey`, log it as Open Question; don't fork.
- **`isNonCanonicalMatch` semantics** — subtle. Two branches:
  - If canonical key EXISTS but its own `min-width` diverges from
    the canonical width (pathological config) → flag.
  - If canonical key MISSING and the fallback resolved grid's
    `min-width` diverges from canonical width → flag.
  The "match" in the name is "widths match"; `!match` = non-canonical.
- **Do not compute materialization "what would get written".** Only
  expose *which key would get created* and *which source it would clone*.
  The clone content lives in `ensureGridEntry` — DO NOT duplicate it.
- **Do not export `BreakpointTruth` type helpers** like "isWarning"
  or "hasAnyFlag". UI callers combine the flags themselves; adding
  helpers freezes UI semantics in the derivator.

---

## Task 2.2: `src/lib/breakpoint-truth.test.ts` — contract tests

### What to Build

New file. 5 cases covering every signal on every path.

```ts
/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { deriveBreakpointTruth } from './breakpoint-truth'
import type { BreakpointGrid } from './types'

const makeGrid = (entries: Record<string, number>): Record<string, BreakpointGrid> => {
  const out: Record<string, BreakpointGrid> = {}
  for (const [key, minWidth] of Object.entries(entries)) {
    out[key] = { 'min-width': `${minWidth}px`, columns: {} }
  }
  return out
}

describe('deriveBreakpointTruth', () => {
  it('canonical key present with matching width', () => {
    const t = deriveBreakpointTruth('tablet', makeGrid({ desktop: 1440, tablet: 768 }))
    expect(t).toMatchObject({
      canonicalId: 'tablet',
      canonicalWidth: 768,
      resolvedKey: 'tablet',
      resolvedMinWidth: 768,
      hasCanonicalGridKey: true,
      isNonCanonicalMatch: false,
      isFallbackResolved: false,
      willMaterializeCanonicalKey: false,
      materializationSourceKey: 'tablet',
    })
  })

  it('canonical key present but width diverges (pathological)', () => {
    const t = deriveBreakpointTruth('tablet', makeGrid({ desktop: 1440, tablet: 900 }))
    expect(t.hasCanonicalGridKey).toBe(true)
    expect(t.isNonCanonicalMatch).toBe(true)
    expect(t.willMaterializeCanonicalKey).toBe(false)
  })

  it('canonical key absent, fallback resolves to a non-canonical alias', () => {
    const t = deriveBreakpointTruth('tablet', makeGrid({ desktop: 1440, 'theme-tablet': 1400 }))
    expect(t).toMatchObject({
      hasCanonicalGridKey: false,
      isFallbackResolved: true,
      willMaterializeCanonicalKey: true,
      materializationSourceKey: 'theme-tablet',
      resolvedMinWidth: 1400,
    })
    expect(t.isNonCanonicalMatch).toBe(true)
  })

  it('canonical key absent, only a far-away grid remains → fallback to first key', () => {
    const t = deriveBreakpointTruth('mobile', makeGrid({ desktop: 1440 }))
    expect(t).toMatchObject({
      hasCanonicalGridKey: false,
      isFallbackResolved: true,
      willMaterializeCanonicalKey: true,
      materializationSourceKey: 'desktop',
    })
  })

  it('exact canonical desktop + canonical width = happy path (no flags)', () => {
    const t = deriveBreakpointTruth('desktop', makeGrid({ desktop: 1440, tablet: 768 }))
    expect(t.isNonCanonicalMatch).toBe(false)
    expect(t.isFallbackResolved).toBe(false)
    expect(t.willMaterializeCanonicalKey).toBe(false)
  })
})
```

### Domain Rules

- **Use `makeGrid` helper — don't hand-roll 10 grid objects.** Keeps
  fixtures readable and changes atomic if `BreakpointGrid` shape evolves.
- **`toMatchObject` over `toEqual`** — tolerates additional fields
  getting added to `BreakpointTruth` in future phases without breaking
  these tests. Assertions still cover every field that matters per case.
- **No snapshot tests** — per P1 precedent, snapshots are fragile.
- **Test file sibling of derivator** — `src/lib/breakpoint-truth.test.ts`
  next to `src/lib/breakpoint-truth.ts`.

---

## Task 2.3: `BreakpointBar.tsx` — rewrite readout row

### What to Build

Replace lines 94-112 (the `.lm-bp-bar__widths` row) with a **two-layer
readout**:

- **Active layer:** canonical label + canonical width (already shown
  via buttons; repeat inline for clarity).
- **Resolved & target layer:** resolved key + its min-width + edit
  target hint + optional `Non-canonical` / `Recovered` badge.

Existing `Viewport`, column widths, `Gap`, `Max` move to a third-layer
row below (kept for power users; still the debug info). No delete;
only regroup.

```tsx
// ADD near top of file, after existing imports:
import { deriveBreakpointTruth } from '../lib/breakpoint-truth'

// INSIDE BreakpointBar function, around line 40 (replace):
const truth = deriveBreakpointTruth(activeBreakpoint, config.grid)
const grid = config.grid[truth.resolvedKey]
if (!grid) return null

// (everything below stays the same up to the readout row — viewport detection,
//  presets grouping, etc.)

// REPLACE lines 94-112 .lm-bp-bar__widths row with the two-layer readout:
return (
  <div className="lm-bp-bar">
    {/* ...existing buttons + preset dropdown... */}

    {/* Layer 1: Active canonical (canonical label + canonical width) */}
    <div className="lm-bp-bar__active">
      <span>Active:</span>
      <strong>{canonicalLabel(truth.canonicalId)}</strong>
      <span className="lm-bp-bar__muted">— {truth.canonicalWidth}px</span>
      {isCustomWidth && (
        <span className="lm-bp-badge lm-bp-badge--warn" title="Viewport differs from canonical width">
          custom viewport
        </span>
      )}
    </div>

    {/* Layer 2: Resolved config key + edit target + badges */}
    <div className="lm-bp-bar__resolved">
      <span>Resolved:</span>
      <strong>{truth.resolvedKey}</strong>
      <span className="lm-bp-bar__muted">@ min-width {truth.resolvedMinWidth}px</span>
      {truth.isNonCanonicalMatch && (
        <span className="lm-bp-badge lm-bp-badge--warn" title="Resolved width differs from canonical">
          Non-canonical
        </span>
      )}
      {truth.isFallbackResolved && !truth.isNonCanonicalMatch && (
        <span className="lm-bp-badge lm-bp-badge--info" title="Nearest-match resolution">
          Recovered
        </span>
      )}
    </div>

    {/* Edit target disclosure — materialization hint or live target chip */}
    <div className="lm-bp-bar__target">
      <span>Edit target:</span>
      {truth.willMaterializeCanonicalKey ? (
        <span className="lm-bp-bar__materialization">
          First edit will create <code>grid.{truth.canonicalId}</code> from{' '}
          <code>{truth.materializationSourceKey}</code> @ {truth.resolvedMinWidth}px
        </span>
      ) : (
        <span className="lm-bp-bar__chip">
          <code>{truth.canonicalId}</code> @ {truth.canonicalWidth}px
        </span>
      )}
    </div>

    {/* Layer 3: existing debug info (viewport, columns, gap, max) */}
    <div className="lm-bp-bar__widths">
      <span>Viewport: <strong>{viewportWidth}px</strong></span>
      {columnWidths.map(({ name, width }) => (
        <span key={name}>{name}: <strong>{width}</strong></span>
      ))}
      <span>Gap: <strong>{gapDisplay}</strong></span>
      {grid['max-width'] && (
        <span>Max: <strong>{grid['max-width']}</strong></span>
      )}
    </div>

    <div className="lm-bp-bar__shortcuts">
      <kbd>Ctrl+1/2/3</kbd> switch
      <kbd>Ctrl+[/]</kbd> cycle
    </div>
  </div>
)

// ADD helper near bottom of file (after PresetDropdown):
function canonicalLabel(id: CanvasBreakpointId): string {
  return CANVAS_BREAKPOINTS.find((b) => b.id === id)?.label ?? id
}
```

### Integration — CSS

Add to `src/styles/maker.css` (location: append to the existing
`.lm-bp-bar` section; grep for `.lm-bp-bar__widths` to locate). **New
classes only; do not modify existing ones.**

```css
.lm-bp-bar__active,
.lm-bp-bar__resolved,
.lm-bp-bar__target {
  display: flex;
  align-items: center;
  gap: var(--lm-sp-6);
  padding: 0 var(--lm-sp-8);
  font-size: 13px;          /* existing widths row uses 13px; match — grep gate F.3 will flag; acknowledge */
  color: var(--lm-text-secondary);
}

.lm-bp-bar__muted {
  color: var(--lm-text-muted);
}

.lm-bp-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.03em;
}

.lm-bp-badge--warn {
  background: var(--lm-bg-hover);
  color: var(--lm-text-accent);
  border: 1px solid var(--lm-border-focus);
}

.lm-bp-badge--info {
  background: var(--lm-bg-hover);
  color: var(--lm-text-secondary);
  border: 1px solid var(--lm-border);
}

.lm-bp-bar__materialization code,
.lm-bp-bar__chip code {
  font-family: var(--lm-font-mono);
  font-size: 12px;
  padding: 1px 6px;
  background: var(--lm-bg-input);
  border-radius: 4px;
}
```

### Domain Rules

- **`--lm-*` tokens only — no Portal DS, no hardcoded hex.** DS migration
  is Appendix B; P2 stays on existing chrome per workplan §P0 scope.
- **Grep-gate delta will be positive** on F.1 (border-radius 999/4),
  F.3 (font-size 11px/12px/13px). Acknowledge in result log. The
  workplan §1 rule 6 explicitly says positive delta is acceptable when
  intentional. Workplan §P7 "Polish on existing tokens only" sweeps
  these at close-out.
- **Do NOT delete the existing `.lm-bp-bar__widths` row.** Move it
  under the new rows as Layer 3; power users still need viewport +
  column widths for debugging.
- **Do NOT add new `useState` or `useEffect`.** The derivator runs
  inline during render — pure, cheap, no memoization needed for three
  BP objects.

---

## Task 2.4: `Inspector.tsx` — ADD breakpoint footer (new sub-component)

### What to Build

**This is a net-new UI element.** Inspector has no breakpoint footer
today (audit step F confirms). Add a small `BreakpointFooter`
sub-component rendered inside Inspector's main panel, below its
existing content, above any panel close tag.

```tsx
// ADD to Inspector.tsx — near the bottom, after helper functions,
// before the main `Inspector` export:

function BreakpointFooter({ config, activeBreakpoint }: {
  config: LayoutConfig
  activeBreakpoint: CanvasBreakpointId
}) {
  const truth = deriveBreakpointTruth(activeBreakpoint, config.grid)
  const writesTo = truth.willMaterializeCanonicalKey
    ? `will create grid.${truth.canonicalId}`
    : truth.resolvedKey === truth.canonicalId
      ? 'Base / canonical override'
      : `Override: ${truth.resolvedKey}`

  return (
    <div className="lm-inspector__bp-footer">
      <div className="lm-inspector__bp-row">
        <span className="lm-inspector__label">Breakpoint</span>
        <span>
          <strong>{truth.canonicalId}</strong>
          <span className="lm-inspector__muted"> → {truth.resolvedKey} ({truth.resolvedMinWidth}px)</span>
        </span>
        {truth.isNonCanonicalMatch && (
          <span className="lm-bp-badge lm-bp-badge--warn">Non-canonical</span>
        )}
      </div>
      <div className="lm-inspector__bp-row">
        <span className="lm-inspector__label">Edit writes to</span>
        <span className="lm-inspector__muted">{writesTo}</span>
      </div>
    </div>
  )
}

// ADD import at top of Inspector.tsx:
import { deriveBreakpointTruth } from '../lib/breakpoint-truth'
```

**Render the footer inside the main `Inspector` return** — at the bottom
of the panel, inside the outer `<div className="lm-inspector" ...>`.
Exact placement: grep for the LAST `</div>` that closes `.lm-inspector`
and insert `<BreakpointFooter ... />` immediately before it. Render it
regardless of whether a slot is selected (the BP data applies at panel
level, not slot level).

```css
/* Add to maker.css */
.lm-inspector__bp-footer {
  border-top: 1px solid var(--lm-border-subtle);
  padding: var(--lm-sp-8) var(--lm-sp-12);
  display: flex;
  flex-direction: column;
  gap: var(--lm-sp-4);
  font-size: 12px;
  background: var(--lm-bg-panel);
}

.lm-inspector__bp-row {
  display: flex;
  align-items: center;
  gap: var(--lm-sp-6);
}

.lm-inspector__muted {
  color: var(--lm-text-muted);
}
```

### Domain Rules

- **Footer renders at panel level, not slot level.** Even when no slot
  is selected (empty-state panel), the operator should still see which
  BP they are authoring.
- **`BreakpointFooter` is module-local** — do NOT export it. Same
  pattern as `ColumnWidthControl` (module-local). Test coverage comes
  via the derivator tests + Playwright visuals, not a unit test on the
  component.
- **Do NOT reuse `SidebarModeControl` or `DrawerSettingsControl` layout
  conventions.** Those are slot-scoped; BP footer is panel-scoped.
  Dedicated CSS class namespace (`lm-inspector__bp-*`).
- **Use existing `--lm-*` tokens only.** Same scope discipline as
  Task 2.3.
- **If Inspector's outer `<div className="lm-inspector">` renders twice**
  (empty-state + selected-state), the footer needs to appear in both.
  Audit step F should surface if this is the case; confirm in result log.

---

## Task 2.5: Playwright visual + behavior pass

### What to Build

Three screenshots demonstrating the three truth states, plus one
fourth showing Inspector footer parity.

| File | Fixture / Scenario |
|------|--------------------|
| `logs/lm-reforge/visual-baselines/p2-bp-bar-canonical.png` | `theme-page-layout`, desktop view — happy path, no badges |
| `logs/lm-reforge/visual-baselines/p2-bp-bar-non-canonical.png` | `theme-page-layout`, tablet view — `Non-canonical` badge on `theme-tablet @ 1400px`; `Recovered` hint optional depending on flags |
| `logs/lm-reforge/visual-baselines/p2-bp-bar-materialization.png` | scratch layout with only `desktop` key, switch to tablet — `Edit target: First edit will create grid.tablet from desktop @ 1440px` |
| `logs/lm-reforge/visual-baselines/p2-inspector-footer.png` | Inspector panel with BP footer visible — any slot selected at tablet |

**Materialization verification flow (manual, for result log):**

1. Create scratch layout with only `desktop` key (or use an existing
   scratch fixture — document which).
2. Switch to tablet → verify `Edit target: First edit will create ...`.
3. Edit a single slot field (any: `gap`, `padding`, etc.).
4. Verify `Edit target` flips to `<code>tablet</code> @ 768px` (material-
   ized). Inspector footer mirrors the flip.
5. Capture the post-materialization YAML via Export dialog → verify
   `grid.tablet` now exists with `min-width: 768px`.

Record the 5-step flow outcome in `phase-2-result.md` (separate section
from the AC table).

### Domain Rules

- **Do NOT regenerate P1 screenshots** (`p1-*.png` under same dir).
  They are Phase 1 evidence; untouched.
- **Keep `theme-page-layout` as the canonical fixture** for the first
  two screenshots. It is the project's reference layout; uses canonical
  `desktop` + non-canonical `theme-tablet`.
- **Document any scratch fixture** created for materialization —
  either commit it to `tools/layout-maker/layouts/` (if reusable for
  future phases) or describe it inline in the result log.
- **Console-clean expectation.** Phase 1 closed with zero console
  errors across the rotation; Phase 2 must preserve that. A
  `phase-2-console-clean.md` is not required (no new UI behavior that
  risks React warnings), but if any warning appears during the 5-step
  flow, capture and surface.

---

## Files to Modify

- `tools/layout-maker/src/lib/breakpoint-truth.ts` — **NEW** (derivator)
- `tools/layout-maker/src/lib/breakpoint-truth.test.ts` — **NEW** (5 contract tests)
- `tools/layout-maker/src/components/BreakpointBar.tsx` — readout rewrite (~50 lines diff)
- `tools/layout-maker/src/components/Inspector.tsx` — ADD `BreakpointFooter` (~40 new lines + 1 render site + 1 import)
- `tools/layout-maker/src/styles/maker.css` — new classes for badge/chip/footer (~40 new lines)
- `logs/lm-reforge/phase-2-task.md` — this file (pre-phase deliverable)
- `logs/lm-reforge/phase-2-result.md` — **NEW** (execution log)
- `logs/lm-reforge/visual-baselines/p2-bp-bar-canonical.png` — **NEW**
- `logs/lm-reforge/visual-baselines/p2-bp-bar-non-canonical.png` — **NEW**
- `logs/lm-reforge/visual-baselines/p2-bp-bar-materialization.png` — **NEW**
- `logs/lm-reforge/visual-baselines/p2-inspector-footer.png` — **NEW**
- (optional) `tools/layout-maker/layouts/scratch-desktop-only.yaml` — only if a reusable scratch fixture makes sense

Not touched this phase: `src/App.tsx` (handlers, `ensureGridEntry`,
`applySlotConfigUpdate`, `resolveGridKey` call sites), `src/lib/types.ts`
(`resolveGridKey`, `CanvasBreakpoint`, `BreakpointGrid` shapes),
`runtime/**`, `PARITY-LOG.md`, `CLAUDE.md`, root `package.json`, root
`package-lock.json`.

---

## Acceptance Criteria

- [ ] `npm --prefix tools/layout-maker run test` exits 0; test count is
      **12 passed** (7 prior + 5 new `breakpoint-truth.test.ts`).
- [ ] `npm --prefix tools/layout-maker run typecheck` exits 0.
- [ ] `npm --prefix tools/layout-maker run build` exits 0 (bundle ±5 kB
      of P1 follow-up baseline 310.70 kB — new component code + CSS
      expected to add ~2–4 kB; hard gate ±5 kB to accommodate).
- [ ] `BreakpointBar` shows canonical + resolved + edit-target on the
      primary reading path (three separate rows visible by default).
- [ ] Non-canonical resolved (width ≠ canonical) shows `Non-canonical`
      badge.
- [ ] Fallback nearest-match resolution shows `Recovered` hint (or,
      if same as Non-canonical, whichever the flag combination dictates).
- [ ] Missing canonical key shows `Edit target: First edit will create
      grid.<id> from <source> @ <px>` copy.
- [ ] After first canonicalizing edit, UI flips — new canonical key
      appears as both resolved and target; materialization hint gone.
- [ ] Inspector breakpoint footer mirrors the same data; renders in
      empty-state AND slot-selected states.
- [ ] Contract tests cover all five cases listed in Task 2.2.
- [ ] `phase-2-result.md` includes the 5-step materialization flow
      walk-through with screenshots referenced.
- [ ] Four screenshots under `logs/lm-reforge/visual-baselines/p2-*.png`.
- [ ] Grep-gate delta-vs-P1 recorded in result log. Positive delta
      acceptable if intentional; must be acknowledged per workplan §1
      rule 6. Expected: F.3 (px font-size) grows by ~3–5 (new 11px/12px/
      13px sites); F.1 (hex/rgba) 0; F.2 (fonts) 0.
- [ ] **Binding hook (carry-over from P0):** Any `*.css?raw` import in
      new tests gets non-empty assertion. If no imports — hook carries to P3.
- [ ] `git status` shows ≤ **12 paths** at commit (5 source + 1 new
      test + 5 log/evidence files + 1 task prompt = 12; optional scratch
      fixture = 13 max).
- [ ] **No PARITY-LOG entry** (phase does not touch config → CSS generator).
- [ ] **No `ensureGridEntry` / `applySlotConfigUpdate` / `resolveGridKey`
      edits.** These are explicitly out-of-scope per workplan §Phase 2 Risk
      section.

---

## MANDATORY: Verification

```bash
echo "=== LM-Reforge Phase 2 Verification ==="

# 1. All tests green (7 prior + 5 new = 12)
npm --prefix tools/layout-maker run test
echo "(expect: 12 passed, 0 failed)"

# 2. Typecheck clean
npm --prefix tools/layout-maker run typecheck

# 3. Build clean
npm --prefix tools/layout-maker run build
echo "(expect: exit 0, 310.70 kB ±5 kB)"

# 4. Grep-gate re-run — record counts + delta vs P1
#    Expect F.3 positive delta (new font-size px); F.1/F.2 zero.

# 5. Playwright visual pass + materialization flow
#    - npm run dev, http://localhost:7700
#    - theme-page-layout desktop → screenshot p2-bp-bar-canonical
#    - theme-page-layout tablet → screenshot p2-bp-bar-non-canonical
#    - scratch layout (or reuse a desktop-only fixture) → switch tablet →
#      screenshot p2-bp-bar-materialization
#    - select a slot on tablet → screenshot p2-inspector-footer
#    - run the 5-step materialization flow; record YAML + UI transitions
#      in phase-2-result.md

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

Create `logs/lm-reforge/phase-2-result.md`. Follow the P1 result-log
template (Status frame / Honest review / AC table / Files Changed /
Grep-gate / Verification / Git). Sections specific to P2:

- **Materialization flow walk-through** — 5-step record per Task 2.5.
- **Derivator decision table** — one row per `BreakpointTruth` field
  listing test case IDs that exercise it (forward reference from
  test file line numbers).
- **Grep-gate positive-delta justification** — explain each new px /
  hex / font site (expected: px font-size additions on new badge/chip/
  footer classes; no hex; no fonts). Workplan §1 rule 6 acknowledges
  positive delta is acceptable when intentional.
- **Honest self-review** mandatory if any AC missed or gate tripped.
  P1 set the pattern; P2 inherits.

---

## Git

```bash
git add \
  tools/layout-maker/src/lib/breakpoint-truth.ts \
  tools/layout-maker/src/lib/breakpoint-truth.test.ts \
  tools/layout-maker/src/components/BreakpointBar.tsx \
  tools/layout-maker/src/components/Inspector.tsx \
  tools/layout-maker/src/styles/maker.css \
  logs/lm-reforge/phase-2-task.md \
  logs/lm-reforge/phase-2-result.md \
  logs/lm-reforge/visual-baselines/p2-bp-bar-canonical.png \
  logs/lm-reforge/visual-baselines/p2-bp-bar-non-canonical.png \
  logs/lm-reforge/visual-baselines/p2-bp-bar-materialization.png \
  logs/lm-reforge/visual-baselines/p2-inspector-footer.png

# (optional: tools/layout-maker/layouts/scratch-desktop-only.yaml if created)

git commit -m "feat(lm): phase 2 — breakpoint truth surface [LM-reforge phase 2]"
```

**Explicit pathspec.** No filtered `git status` as scope gate (P0 lesson).

---

## IMPORTANT Notes for CC

- **Read `phase-1-result.md` "Brain-gate correction — named honestly"**
  before starting. Phase 1's failure mode was Brain's incomplete read
  of `DrawerSettingsControl`. Phase 2 is larger — three surfaces,
  new file, CSS — so the RECON step is even more load-bearing. If
  anything in §PHASE 0 Audit contradicts the prompt, STOP and surface.
- **`resolveGridKey` is the algorithm; derivator is the narrator.** Do
  not fork or reimplement the grid-key strategy. The derivator wraps
  existing behavior; UI surfaces show what the derivator narrates.
- **`ensureGridEntry` untouched.** Workplan is explicit. If a test
  would be clearer with a small refactor there — resist. The phase is
  "add disclosure at UI level, not change what gets written."
- **BreakpointBar rewrite keeps existing rows.** Viewport, column widths,
  gap, max all stay; they move under the new rows as Layer 3. Nothing
  deleted.
- **Inspector footer is net-new.** Not a rewrite. Mount it at panel
  level (inside outer `<div className="lm-inspector">`), not inside
  `SlotInspector` (which only renders when slot is selected).
- **CSS delta is acceptable.** Workplan §1 rule 6 allows positive
  grep-gate delta when intentional. Document the additions in the
  result log; do NOT try to avoid px / hex at any cost — the DS
  migration (Appendix B) is a separate workplan.
- **If `resolveGridKey` behavior seems wrong during testing** (e.g.
  returns a key that makes the derivator's flags misleading), log as
  Open Question. Do NOT fix. The algorithm is stable; the narrator
  describes it faithfully even when the algorithm itself could be
  improved.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 2 промпт готовий: `logs/lm-reforge/phase-2-task.md`.

## Структура

**5 tasks + 1 audit, 1–1.5d budget:**

| # | Task | Scope |
|---|------|-------|
| 2.audit | Reads A–I; verify line numbers + fixture availability + grep baseline | no writes |
| 2.1 | `src/lib/breakpoint-truth.ts` create | pure derivator, 8-field `BreakpointTruth` type, wraps `resolveGridKey`; zero React |
| 2.2 | `src/lib/breakpoint-truth.test.ts` create | 5 cases covering every signal on every resolution path |
| 2.3 | `BreakpointBar.tsx` rewrite readout | replace single "Grid: X" line with 3-layer readout (Active / Resolved / Edit target) + badges (Non-canonical / Recovered); existing debug row becomes Layer 3 |
| 2.4 | `Inspector.tsx` ADD footer | net-new `BreakpointFooter` sub-component, panel-level (not slot-level), mirrors derivator data |
| 2.5 | Playwright visual + 5-step materialization flow | 4 screenshots + flow walk-through in result log |
| Gates | Verification | 12 tests green (7 prior + 5 new); typecheck clean; build ±5 kB of 310.70 kB; grep-gate delta documented; ≤ 12-path git scope |

## 7 Brain rulings locked

1. **Derivator = pure function, no React.** Computed inline during render in `BreakpointBar` + `Inspector`. No memoization (three BP objects; cheap).
2. **Reuse `resolveGridKey` verbatim.** Don't fork the exact-match → closest → first strategy. Log as Open Question if bugged.
3. **`isNonCanonicalMatch` fires on EITHER** canonical-key-exists-but-width-diverges OR canonical-key-missing-and-fallback-width-diverges. Both pathological from operator POV.
4. **Inspector breakpoint footer is NEW** (audit step F confirms no footer today). Mount panel-level, not slot-level — BP data applies in empty state too.
5. **Existing `.lm-bp-bar__widths` row preserved as Layer 3.** No delete. Power users need viewport + column widths for debugging.
6. **`ensureGridEntry` / `applySlotConfigUpdate` / `resolveGridKey` untouched.** Workplan §Phase 2 Risk section is explicit. UI narrates; algorithm unchanged.
7. **Grep-gate positive delta acceptable + documented.** New badge/chip/footer classes add ~3–5 px font-size sites (expected 11/12/13px). Workplan §1 rule 6 allows positive delta when intentional. Appendix B sweeps it later.

## Hard gates (inherited + P2 additions)

- **Zero touch:** `App.tsx` (ensureGridEntry + handlers + resolveGridKey call sites), `lib/types.ts` (resolveGridKey + CANVAS_BREAKPOINTS + shapes), `runtime/**`, `PARITY-LOG.md`, `CLAUDE.md`, root `package.json`, root `package-lock.json`, `vitest.config.ts`, `tsconfig.json`, Phase 1 tests.
- **Zero React imports in the derivator.** Pure function, JS-level.
- **Zero Portal DS tokens.** `--lm-*` chrome only per workplan §P0 scope.
- **Zero snapshot tests.** `toMatchObject` for shape assertions.
- **Zero confirm-dialog flows for materialization.** UI disclosure, not mid-action prompt.
- **Zero deletion of existing `.lm-bp-bar__widths` row.** Reorder only.
- **≤ 12 paths in `git status` at commit** (13 if optional scratch fixture created).
- **`git commit -- <pathspec>` explicitly.** P0 lesson; filtered status as scope gate failed once.
- **Bundle size ±5 kB of 310.70 kB.** Wider than P1's ±2 kB because P2 adds real code (derivator + 2 components + CSS). Exceeding = unexpected bloat; investigate.

## Escalation triggers

- **Line numbers in `BreakpointBar.tsx` differ from recon (lines 40/42/94-112)** → file edited since prompt. Grep to relocate; don't edit by line number alone.
- **Audit step F finds an existing Inspector BP footer** → recon wrong, STOP, surface. Task 2.4 becomes "rewrite", not "add".
- **`resolveGridKey` returns a key that makes derivator flags misleading** → algorithm bug; log as Open Question, do NOT fix.
- **5-step materialization flow does NOT flip `willMaterializeCanonicalKey` after first edit** → disclosure is lying; root-cause via `applySlotConfigUpdate` trace. Do NOT add a "fake" materialization pre-write.
- **Grep-gate F.1 (hex) grows** → hardcoded color leaked into new CSS. Revert to `--lm-*` token. F.1 delta of 0 is the hard target; F.3 delta is the acknowledged one.
- **Bundle size grows > +5 kB** → import of a heavy lib leaked (e.g. accidental full `lucide-react` import). Investigate; don't ship bloat.
- **Inspector footer fails to render in empty-state** → mount point is inside `SlotInspector` instead of outer `Inspector`. Relocate.
- **> 12 paths in `git status` at commit** → scope creep. Stop, diagnose, re-scope.
- **PARITY-LOG entry needed** → phase touched the config → CSS pipeline. STOP, surface; Phase 2 should not go near that contract.

## Arch-test target

**N/A** — LM outside `src/__arch__/domain-manifest.ts`. P2 analog:
12 tests green + typecheck + build + Playwright 4 screenshots + 5-step
materialization flow recorded = ship criteria.

## Git state

- `logs/lm-reforge/phase-2-task.md` — new untracked (this file)
- `12efd4bf` + `1f890c16` on `main` from P1 follow-up + embed
- Nothing else staged, nothing committed yet for P2

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найімовірніше — ruling 3 якщо `isNonCanonicalMatch` semantics не подобається, або ruling 5 якщо хочеш видалити існуючий `.lm-bp-bar__widths` row замість reorder)
3. АБО self-commit if workflow permits

Чекаю.
