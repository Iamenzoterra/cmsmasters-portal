# WP-033 Phase 2: Side panel — element-aware properties + breadcrumb extract + per-BP cells (read-only)

> Workplan: WP-033 Block Forge Inspector — DevTools-style hover/pin + element-aware editing + token-chip integration
> Phase: 2 of 6
> Priority: P0 — populates the InspectorPanel surface that Phase 3 wires for editing
> Estimated: 10-12 hours
> Type: Frontend — pure UI components (no engine changes; no postMessage protocol changes)
> Previous: Phase 1 ✅ COMPLETE (commit `547bb79d`) — iframe pipeline + Inspector orchestrator + InspectorPanel shell
> Next: Phase 3 (Property editing + token-aware suggestions + slider-bug regression pin)
> Affected domains: `infra-tooling` (block-forge only this phase)

---

## Context

Phase 1 shipped the pipeline: hover → outline → click → pin → side-panel header + breadcrumb + BP picker; protocol stable; 14 unit + 6 panel tests + 4 snapshots all green; live-verified at `:7702`. Inspector currently shows a `inspector-properties-placeholder` div; Phase 2 replaces it with **element-aware property sections** rendered from `pinned.computedStyle`.

```
CURRENT  ✅  Phase 1 commit 547bb79d:
              - postMessage protocol stable (block-forge:inspector-{hover,unhover,
                request-pin,pin-applied})
              - Inspector.tsx orchestrator with hovered + pinned state
              - InspectorPanel.tsx shell — header + breadcrumb + BP picker (1440|768|375)
              - pinned.computedStyle pre-populated from preview-assets.ts pin emit
                (curated MVP: margin/padding 4-axis + gap + typography + layout + visibility)
              - data-bf-pin / data-bf-hover outline rules (individual props bypass outline:0 reset)
              - Option C lift: PreviewTriptych ↔ Inspector BP lockstep verified
              - 60ms BP-change re-pin defer (race-mitigation; tested with fakeTimers)

MISSING  ❌  PropertyRow component (label · 3 BP cells · token-chip slot · inheritedFrom?)
MISSING  ❌  BreadcrumbNav extracted from InspectorPanel (cleaner separation; testable)
MISSING  ❌  4 sections in InspectorPanel: Spacing / Typography / Layout / Visibility
MISSING  ❌  Per-BP cell rendering (active highlighted; inactive dimmed + ↗ view icon
              per Phase 0 §0.11 caveat 3)
MISSING  ❌  Token-chip slot in PropertyRow (Phase 3 fills detection logic;
              Phase 2 reserves the structural slot + label format)
```

Phase 2 deliverable: **read-only element-aware property surface**. Author pins an element, sees its computed style across 4 sections, can scan all three BPs at once with active-BP visually distinguished and inactive cells one-click-switchable. No editing yet (Phase 3); cells display values pulled from `pinned.computedStyle` (active BP) and `—` for inactive cells; chip slot empty (Phase 3 wires detection).

**Phase 0 §0.11 YELLOW caveats baked into design (this is the phase they fire):**

1. **Chip 3-BP impact label format** — even though chip detection logic is Phase 3, Phase 2 reserves the structural slot AND defines the label string format `[Use --token-name ✓ — sets X/Y/Z at all 3 BPs]`. Phase 3 just plugs detection results into this slot.
2. **PropertyRow `inheritedFrom?: string` prop** — when a value is inherited (Phase 2 doesn't detect inheritance source — that's Phase 3 jsdom; for now the prop slot exists, defaults to undefined). Hybrid UX: cell shows value with subdued `(inherited from <selector>)` suffix when prop is set.
3. **Active-BP coherence — dim inactive cells + `↗ view` icon** — clicking the icon switches PreviewTriptych tab to that BP (lockstep is already wired both directions Phase 1; Phase 2 adds the icon affordance).

---

## Phase 0 + Phase 1 carry-overs (load-bearing)

### Ruling B — curated MVP property surface (HOLD per Phase 0 §0.6)

12 properties, 4 sections. Phase 0 §0.6 confirmed 100% coverage on the 3 production-block sample:

```
SPACING (3 grouped rows; each row may render 4 sub-axes)
  margin       4 axes: top / right / bottom / left
  padding      4 axes: top / right / bottom / left
  gap          single value (or rowGap + columnGap if grid)

TYPOGRAPHY (5 rows, single-value each)
  font-size
  line-height
  font-weight
  letter-spacing
  text-align

LAYOUT (5 rows, single-value each; conditional render)
  display
  flex-direction       (only when display includes 'flex')
  align-items
  justify-content
  grid-template-columns (only when display includes 'grid')

VISIBILITY (1 row)
  Hide at this BP      checkbox (Phase 3 wires emit; Phase 2 renders disabled)
```

`pinned.computedStyle` from Phase 1 already includes ALL these properties (preview-assets.ts pin emit was scoped to MVP). Phase 2 just reads them.

### Ruling E — per-BP cell sourcing DEFERRED (Phase 3 jsdom × 3)

Phase 2 cells:
- **Active BP cell** → render value from `pinned.computedStyle[property]` (already pulled by preview-assets.ts at pin time at the active iframe's BP)
- **Inactive BP cells** → render `—` placeholder + dim styling + `↗ view` icon
- **No jsdom mini-renders this phase.** Phase 3 §3.2 lands `useInspectorPerBpValues` hook that fills inactive cells with real per-BP computed values.

**Why this works for Phase 2:** the active BP cell is already accurate (computed style at the pinned iframe's actual BP). Inactive cells visually communicate "no data yet — switch tab to populate". Once Phase 3 lands per-BP sourcing, inactive cells auto-fill; Phase 2's structural design doesn't change.

### Ruling F — token-chip detection DEFERRED (Phase 3 PostCSS subset)

Phase 2:
- PropertyRow has a `tokenChip?: ReactNode` prop slot — passed-in component or null
- InspectorPanel does NOT pass anything Phase 2 (slot stays empty)
- Phase 3 §3.4 implements `useChipDetection` hook + `<TokenChip />` component; InspectorPanel passes `<TokenChip ... />` into the slot

### YELLOW caveats locked

| Caveat | Phase 2 implementation |
|---|---|
| **1 — Chip 3-BP impact label format** | TokenChip's actual rendering is Phase 3. Phase 2 reserves the slot. Document the locked format string in PropertyRow JSDoc + WP-033 CONVENTIONS contribution at Phase 5 close. |
| **2 — PropertyRow `inheritedFrom?` prop with subdued label** | Prop exists; Phase 2 always passes `undefined` (inheritance detection = Phase 3). When set, render `<span class="text-[hsl(var(--text-muted))]">(inherited from {selector})</span>` after the value. |
| **3 — Inactive cells dim + ↗ view icon** | Inactive cells: dim styling (`text-[hsl(var(--text-muted))]`), `—` placeholder, small `↗` button. Click → calls `onActiveBpChange(cellBp)` (already wired Phase 1 → triggers PreviewTriptych tab switch). |

### Phase 1 invariants to preserve

- `iframe[title^="<slug>-"]` selector pattern still works post-Phase 1 (used by Inspector.tsx Escape + requestPin) — DO NOT change PreviewTriptych iframe `title` attribute structure
- `data-bf-pin` / `data-bf-hover` attribute names — Phase 2 doesn't touch outlines
- 60ms BP-change re-pin defer — Phase 2 doesn't change BP-change handler in Inspector.tsx (PropertyRow's `↗ view` icon does the SAME bp-change flow that the BP picker does — no new defer needed)
- TweakPanel still in tree, still functional — Phase 2 mounts BELOW or BESIDE Inspector; both coexist; Phase 5 deletes TweakPanel
- BP type `1440 | 768 | 375` for Inspector; `1440 | 768 | 480` for TweakPanel — both coexist; do NOT unify

---

## Domain Context

### `infra-tooling`

- **Invariant — DS tokens for all colors / typography / spacing.** Phase 2 introduces section headers, property labels, dim states, chip slots — every visual choice tokenized. Saved memory `feedback_no_hardcoded_styles` enforced by `lint-ds`.
- **Invariant — Tailwind v4 length-vs-color hint.** `text-[length:var(--text-X-font-size)]` — NOT `text-[var(...)]`.
- **Trap — `text-[length:var(...)]` works for font-size but NOT for letter-spacing in Tailwind v4.** Letter-spacing values like `var(--letter-spacing-tight)` need `tracking-[var(...)]` syntax. **Pre-emptive — verify before writing.** Any new utility class with a `var()` reference: spot-check by grepping similar usage in `packages/ui/` first.
- **Invariant — Test cleanup.** `tools/*` test config has `globals: false` — multi-render component tests need `afterEach(cleanup)` from `@testing-library/react` in `setupTests.ts` per saved memory `feedback_vitest_globals_false_cleanup`. PropertyRow tests will render multiple times; verify cleanup is in scope.
- **Invariant — Snapshot is ground truth** per saved memory. New PropertyRow + BreadcrumbNav snapshots become the contract; future drift surfaces as snap diff.

### `studio-blocks`

**Read-only this phase.** Studio mirror is Phase 4. Inspector files do NOT land in `apps/studio/.../responsive/` until Phase 4.

### `pkg-block-forge-core` (read-only)

**Untouched this phase.** No `emitTweak` calls, no engine consumption. Phase 3 wires.

### `pkg-ui` (read-only)

**Untouched this phase.** `responsive-config.json` read happens Phase 3 (chip detection).

---

## Phase 2 Audit — re-baseline (do FIRST)

```bash
# 0. Baseline
npm run arch-test                        # expect: 548 / 548 (post-Phase-1)

# 1. Confirm Phase 1 state intact
git log --oneline -5                     # 68709466 / 547bb79d / d3fc2ad2 / 6d6c1c66 at top

# 2. pinned.computedStyle shape — confirm preview-assets.ts pin emit has all 12 MVP props
grep -A 15 "block-forge:inspector-pin-applied" tools/block-forge/src/lib/preview-assets.ts | head -50
# Expect: margin{,Top,Right,Bottom,Left}, padding{...}, gap, fontSize, lineHeight,
#         fontWeight, letterSpacing, textAlign, display, flexDirection,
#         alignItems, justifyContent, gridTemplateColumns

# 3. InspectorPanel current placeholder location
grep -n "inspector-properties-placeholder\|Phase 2" tools/block-forge/src/components/InspectorPanel.tsx | head -5
# Expect: the dashed-border placeholder div replaced this phase

# 4. Existing breadcrumb implementation in InspectorPanel
grep -n "breadcrumb\|aria-label=\"Element ancestry\"" tools/block-forge/src/components/InspectorPanel.tsx | head -5
# Phase 2 extracts to BreadcrumbNav.tsx

# 5. Verify DS tokens for muted text + accent
grep -n "text-muted\|accent-default\|status-success-fg" packages/ui/src/theme/tokens.css | head -10
```

**Document any drift before code.**

---

## Task 2.1: Extract `BreadcrumbNav.tsx` from `InspectorPanel.tsx`

### What to do

`tools/block-forge/src/components/BreadcrumbNav.tsx` — pure component, takes ancestors array + current selector, renders breadcrumb with click-to-rename behavior.

```tsx
import * as React from 'react'
import type { ElementPin } from './Inspector'

interface Props {
  ancestors: ElementPin['ancestors']
  /** Selector of the currently pinned element — rendered as the rightmost (non-button) breadcrumb segment. */
  pinnedSelector: string
  /** Click an ancestor segment → re-pin to that ancestor. */
  onAncestorClick: (selector: string) => void
  'data-testid'?: string
}

export function BreadcrumbNav(props: Props) {
  const testId = props['data-testid'] ?? 'inspector-breadcrumb'
  const { ancestors, pinnedSelector, onAncestorClick } = props
  const leafLabel = pinnedSelector.split(' ').pop() ?? pinnedSelector

  if (ancestors.length === 0) {
    // Root element pinned — just render the leaf, no breadcrumb chain
    return (
      <nav
        data-testid={testId}
        aria-label="Element ancestry"
        className="text-[hsl(var(--text-default))] text-[length:var(--text-xs-font-size)] font-[number:var(--font-weight-medium)]"
      >
        {leafLabel}
      </nav>
    )
  }

  return (
    <nav
      data-testid={testId}
      aria-label="Element ancestry"
      className="flex flex-wrap items-center gap-1 text-[hsl(var(--text-muted))] text-[length:var(--text-xs-font-size)]"
    >
      {ancestors.map((a, i) => {
        const segLabel = renderAncestorLabel(a)
        return (
          <React.Fragment key={a.selector + i}>
            <button
              type="button"
              onClick={() => onAncestorClick(a.selector)}
              className="hover:text-[hsl(var(--text-default))] underline-offset-2 hover:underline"
              title={`Click to inspect ${a.selector}`}
            >
              {segLabel}
            </button>
            <span aria-hidden="true" className="text-[hsl(var(--text-muted))]">{'›'}</span>
          </React.Fragment>
        )
      })}
      <span className="text-[hsl(var(--text-default))] font-[number:var(--font-weight-medium)]">
        {leafLabel}
      </span>
    </nav>
  )
}

function renderAncestorLabel(a: ElementPin['ancestors'][number]): string {
  if (!a.classes) return a.tagName
  const firstStable = a.classes
    .split(' ')
    .filter(Boolean)
    .filter((c) => !['hover:', 'focus:', 'active:', 'animate-', 'group-', 'peer-'].some((p) => c.startsWith(p)))
    [0]
  return firstStable ? `${a.tagName}.${firstStable}` : a.tagName
}
```

### Modify `InspectorPanel.tsx`

Replace the inline breadcrumb JSX (currently in InspectorPanel) with `<BreadcrumbNav>`. The existing `onAncestorClick` prop on InspectorPanel passes through.

### Output

§2.1 — file created, InspectorPanel diff documented, existing breadcrumb tests still pass.

---

## Task 2.2: Create `PropertyRow.tsx`

### What to do

`tools/block-forge/src/components/PropertyRow.tsx` — single property row with 3 BP cells + optional token-chip slot + optional inherited-from label.

```tsx
import * as React from 'react'
import type { InspectorActiveBp } from './Inspector'

export interface PropertyRowProps {
  /** Display label, e.g. "font-size", "padding-left". */
  label: string
  /**
   * Per-BP value strings. Phase 2: only the active-BP key is populated; inactive
   * keys are `null`. Phase 3 fills inactive keys via jsdom mini-renders.
   */
  valuesByBp: Record<InspectorActiveBp, string | null>
  /** Active BP — cell at this BP is highlighted; others are dimmed. */
  activeBp: InspectorActiveBp
  /**
   * When user clicks `↗ view` on an inactive cell, switch PreviewTriptych
   * + Inspector to that BP (lockstep wired Phase 1).
   */
  onBpSwitch: (bp: InspectorActiveBp) => void
  /**
   * YELLOW caveat 2 — when the active-BP value is inherited from an ancestor,
   * pass the source selector here. PropertyRow renders `(inherited from <selector>)`
   * after the value in subdued color. Phase 3 fills this; Phase 2 always undefined.
   */
  inheritedFrom?: string
  /**
   * YELLOW caveat 1 — token-chip slot. PropertyRow wraps it next to the label
   * so chips align consistently across rows. Phase 3 fills with <TokenChip>;
   * Phase 2 leaves null.
   */
  tokenChip?: React.ReactNode
  /** Phase 3 will wire onChange per cell. Phase 2 cells are read-only. */
  onCellEdit?: (bp: InspectorActiveBp, value: string) => void
  'data-testid'?: string
}

const BPs: ReadonlyArray<InspectorActiveBp> = [375, 768, 1440]
const BP_SHORT: Record<InspectorActiveBp, string> = {
  375: 'M',
  768: 'T',
  1440: 'D',
}

export function PropertyRow(props: PropertyRowProps) {
  const testId = props['data-testid'] ?? `property-row-${props.label}`
  const { label, valuesByBp, activeBp, onBpSwitch, inheritedFrom, tokenChip, onCellEdit } = props

  return (
    <div
      data-testid={testId}
      data-property={label}
      className="flex items-center gap-2 py-1 text-[length:var(--text-xs-font-size)]"
    >
      {/* Label column */}
      <div
        className="w-32 shrink-0 truncate text-[hsl(var(--text-muted))] font-mono"
        title={label}
      >
        {label}
      </div>

      {/* 3 BP cells */}
      <div className="flex items-center gap-1 grow">
        {BPs.map((bp) => {
          const value = valuesByBp[bp]
          const isActive = bp === activeBp
          const isEmpty = value === null
          return (
            <div
              key={bp}
              data-cell-bp={bp}
              data-active={isActive ? 'true' : 'false'}
              data-empty={isEmpty ? 'true' : 'false'}
              className="flex items-center gap-1 px-2 py-1 rounded border border-[hsl(var(--border-default))]
                         data-[active=true]:bg-[hsl(var(--bg-surface-raised))]
                         data-[active=true]:border-[hsl(var(--accent-default))]
                         data-[active=false]:text-[hsl(var(--text-muted))]
                         min-w-[5rem]"
            >
              <span className="text-[hsl(var(--text-muted))] font-[number:var(--font-weight-medium)]" aria-label={`Breakpoint ${bp}`}>
                {BP_SHORT[bp]}
              </span>
              {/* Value or em-dash */}
              <span
                data-testid={`${testId}-cell-${bp}`}
                className="font-mono"
              >
                {isEmpty ? '—' : value}
              </span>
              {/* Inactive-cell ↗ view icon (caveat 3) */}
              {!isActive && (
                <button
                  type="button"
                  onClick={() => onBpSwitch(bp)}
                  className="ml-auto text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-default))]"
                  title={`Switch preview to ${bp}px`}
                  aria-label={`Switch to ${bp}px breakpoint`}
                >
                  ↗
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* inheritedFrom label (caveat 2) — Phase 2 always undefined; Phase 3 fills */}
      {inheritedFrom && (
        <span
          data-testid={`${testId}-inherited`}
          className="shrink-0 text-[hsl(var(--text-muted))] italic"
        >
          (inherited from {inheritedFrom})
        </span>
      )}

      {/* Token chip slot (caveat 1) — Phase 2 always null; Phase 3 fills */}
      {tokenChip && (
        <div data-testid={`${testId}-chip-slot`} className="shrink-0">
          {tokenChip}
        </div>
      )}
    </div>
  )
}
```

**Style rules:**

- DS tokens only — `--text-muted`, `--accent-default`, `--bg-surface-raised`, `--border-default`, `--text-default`. Saved memory `feedback_no_hardcoded_styles`.
- `font-mono` for property values + labels (DevTools convention)
- Active cell: bg `--bg-surface-raised` + border `--accent-default`; inactive: muted text
- `data-active` / `data-empty` / `data-cell-bp` attrs for test querying

### Output

§2.2 — file created with the props matrix exhaustive.

---

## Task 2.3: Section grouping — populate `InspectorPanel.tsx` 4 sections

### What to do

Replace the `inspector-properties-placeholder` div in InspectorPanel.tsx with 4 sections. Each section header + a list of PropertyRows.

```tsx
// At the top of InspectorPanel.tsx, after BreadcrumbNav extract:
import { PropertyRow } from './PropertyRow'

// Inside the pinned-state branch (where placeholder div lived), add:
const cs = pinned.computedStyle

// Helper — build valuesByBp for active-BP only; inactive cells = null Phase 2
function activeOnly(value: string | undefined): Record<InspectorActiveBp, string | null> {
  return {
    375: activeBp === 375 ? (value ?? null) : null,
    768: activeBp === 768 ? (value ?? null) : null,
    1440: activeBp === 1440 ? (value ?? null) : null,
  }
}

const isFlex = (cs.display ?? '').includes('flex')
const isGrid = (cs.display ?? '').includes('grid')

return (
  <div /* existing wrapper */>
    {/* Existing header */}
    {/* Existing BreadcrumbNav */}
    {/* Existing BP picker */}

    {/* SPACING */}
    <section data-testid="inspector-section-spacing" aria-label="Spacing properties" className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2">
      <div className="text-[hsl(var(--text-muted))] uppercase font-[number:var(--font-weight-semibold)] text-[length:var(--text-xs-font-size)] tracking-wide">
        Spacing
      </div>
      <PropertyRow label="margin-top" valuesByBp={activeOnly(cs.marginTop)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="margin-right" valuesByBp={activeOnly(cs.marginRight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="margin-bottom" valuesByBp={activeOnly(cs.marginBottom)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="margin-left" valuesByBp={activeOnly(cs.marginLeft)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="padding-top" valuesByBp={activeOnly(cs.paddingTop)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="padding-right" valuesByBp={activeOnly(cs.paddingRight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="padding-bottom" valuesByBp={activeOnly(cs.paddingBottom)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="padding-left" valuesByBp={activeOnly(cs.paddingLeft)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      {(cs.gap || cs.rowGap || cs.columnGap) && (
        <PropertyRow label="gap" valuesByBp={activeOnly(cs.gap || `${cs.rowGap} ${cs.columnGap}`)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      )}
    </section>

    {/* TYPOGRAPHY */}
    <section data-testid="inspector-section-typography" aria-label="Typography properties" className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2">
      <div className="text-[hsl(var(--text-muted))] uppercase font-[number:var(--font-weight-semibold)] text-[length:var(--text-xs-font-size)] tracking-wide">
        Typography
      </div>
      <PropertyRow label="font-size" valuesByBp={activeOnly(cs.fontSize)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="line-height" valuesByBp={activeOnly(cs.lineHeight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="font-weight" valuesByBp={activeOnly(cs.fontWeight)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="letter-spacing" valuesByBp={activeOnly(cs.letterSpacing)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="text-align" valuesByBp={activeOnly(cs.textAlign)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
    </section>

    {/* LAYOUT */}
    <section data-testid="inspector-section-layout" aria-label="Layout properties" className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2">
      <div className="text-[hsl(var(--text-muted))] uppercase font-[number:var(--font-weight-semibold)] text-[length:var(--text-xs-font-size)] tracking-wide">
        Layout
      </div>
      <PropertyRow label="display" valuesByBp={activeOnly(cs.display)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      {isFlex && (
        <PropertyRow label="flex-direction" valuesByBp={activeOnly(cs.flexDirection)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      )}
      <PropertyRow label="align-items" valuesByBp={activeOnly(cs.alignItems)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      <PropertyRow label="justify-content" valuesByBp={activeOnly(cs.justifyContent)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      {isGrid && (
        <PropertyRow label="grid-template-columns" valuesByBp={activeOnly(cs.gridTemplateColumns)} activeBp={activeBp} onBpSwitch={onActiveBpChange} />
      )}
    </section>

    {/* VISIBILITY */}
    <section data-testid="inspector-section-visibility" aria-label="Visibility properties" className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2">
      <div className="text-[hsl(var(--text-muted))] uppercase font-[number:var(--font-weight-semibold)] text-[length:var(--text-xs-font-size)] tracking-wide">
        Visibility
      </div>
      <label className="flex items-center gap-2 text-[hsl(var(--text-muted))] cursor-not-allowed" title="Editing wired in Phase 3">
        <input
          type="checkbox"
          disabled
          aria-label={`Hide at ${activeBp}px breakpoint`}
          data-testid="hide-at-bp"
          className="cursor-not-allowed"
        />
        <span>Hide at {activeBp}</span>
        <span className="text-[length:var(--text-xs-font-size)] italic">(Phase 3)</span>
      </label>
    </section>
  </div>
)
```

**Critical decisions:**

- **Per-axis rendering for margin/padding** — 4 rows each instead of 1 collapsed. Rationale: WP-033 §Property surface "margin 4-axis + padding 4-axis"; per Phase 0 §0.6 audit, real blocks use individual axes (e.g., `margin-bottom: 24px` standalone). Per-axis rows simplify Phase 3 emit (one tweak per axis = no re-parsing of "16px 24px" into axes).
- **`gap` row only when actually used** — most blocks don't have gap; conditional render keeps the section short.
- **`flex-direction` + `grid-template-columns` conditional** — only render when display matches. Reduces noise.
- **VISIBILITY checkbox disabled** — Phase 2 renders the structural slot; Phase 3 wires emit. `cursor-not-allowed` + Phase 3 italic hint communicates "coming soon".

### Output

§2.3 — InspectorPanel.tsx diff documented; manual smoke shows all 4 sections render with active-BP cell highlighted, inactive cells dimmed + ↗ button visible.

---

## Task 2.4: Tests — PropertyRow + BreadcrumbNav + InspectorPanel updates

### What to do

#### `tools/block-forge/src/__tests__/PropertyRow.test.tsx` (NEW — ~10 tests)

- Renders label correctly
- valuesByBp sourcing: active BP cell shows value; inactive cells show `—`
- Active BP cell has `data-active="true"`; inactive cells have `data-active="false"`
- Inactive cell `↗ view` button — click → onBpSwitch called with that BP
- Active cell does NOT render `↗ view` button
- `inheritedFrom` prop set → renders "(inherited from X)" suffix; unset → no suffix
- `tokenChip` prop set → renders chip in slot; unset → no slot div
- BP_SHORT labels render correctly (M / T / D)
- Cell with empty value (`null`) → renders `—`; `data-empty="true"`
- Snapshot — all 3 BPs with active=375

#### `tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx` (NEW — ~6 tests)

- Empty ancestors → renders just leaf label (no chain)
- 3 ancestors → renders 3 buttons + 3 separators + leaf
- Ancestor with `id` → renders `tagName#id` (or stable class form)
- Ancestor with utility-only classes → falls back to tagName-only
- Click ancestor button → onAncestorClick called with that ancestor's selector
- Snapshot — 3-deep ancestry

#### `tools/block-forge/src/__tests__/InspectorPanel.test.tsx` (UPDATE — existing 6 tests + ~4 new)

- Existing tests still pass (empty / hover-only / pinned states)
- NEW: pinned state renders 4 sections (querying section data-testids)
- NEW: pinned state with `display: flex` → flex-direction row appears
- NEW: pinned state with `display: grid` → grid-template-columns row appears
- NEW: pinned state with `display: block` → neither flex-direction nor grid-template-columns rendered
- NEW: VISIBILITY hide-at-bp checkbox is disabled (Phase 3 wires)
- Update existing snapshots — new 4-section structure

### Output

§2.4 — test counts; coverage of YELLOW-caveat structural slots (inheritedFrom + tokenChip + ↗ view icon); snapshot updates documented.

---

## Task 2.5: Manifest update + arch-test

### What to do

```ts
// src/__arch__/domain-manifest.ts
'infra-tooling': {
  owned_files: [
    // ... existing entries (incl. Phase 1 additions) ...

    // WP-033 Phase 2 — PropertyRow + BreadcrumbNav extract
    'tools/block-forge/src/components/PropertyRow.tsx',
    'tools/block-forge/src/components/BreadcrumbNav.tsx',
    'tools/block-forge/src/__tests__/PropertyRow.test.tsx',
    'tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx',
  ],
},
```

`npm run arch-test` — expected delta: +4 (per Phase 1 empirical schema: 1 test/file). Baseline 548 → target **552**.

### Output

§2.5 — arch-test pass at target.

---

## Files to Modify

- `tools/block-forge/src/components/PropertyRow.tsx` — NEW
- `tools/block-forge/src/components/BreadcrumbNav.tsx` — NEW
- `tools/block-forge/src/components/InspectorPanel.tsx` — placeholder div replaced with 4 sections; breadcrumb extracted
- `tools/block-forge/src/__tests__/PropertyRow.test.tsx` — NEW
- `tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx` — NEW
- `tools/block-forge/src/__tests__/InspectorPanel.test.tsx` — UPDATED (sections + caveats; snapshots regenerated)
- `tools/block-forge/src/__tests__/__snapshots__/InspectorPanel.test.tsx.snap` — regenerated
- `src/__arch__/domain-manifest.ts` — 4 owned_files added

**Out of scope (do NOT touch):**
- `tools/block-forge/src/lib/preview-assets.ts` — protocol stable from Phase 1
- `tools/block-forge/src/components/Inspector.tsx` — orchestrator stable from Phase 1
- `tools/block-forge/src/App.tsx` — integration stable from Phase 1
- `apps/studio/**` — Phase 4
- `packages/**` — engine + tokens stable
- TweakPanel.tsx — Phase 5 deletes

---

## Acceptance Criteria

- [ ] PropertyRow renders 12 MVP properties (4 sections; conditional rows for flex/grid)
- [ ] Active BP cell visually distinct (border + bg via tokens) from inactive cells (muted text via `--text-muted`)
- [ ] Inactive cells render `—` placeholder + `↗ view` button; click `↗` → PreviewTriptych tab switches to that BP (lockstep verified live at :7702)
- [ ] BreadcrumbNav extracted from InspectorPanel; rendering identical (snapshot diff is mechanical only)
- [ ] PropertyRow `inheritedFrom?` prop slot present; Phase 2 always passes undefined; structural slot ready for Phase 3
- [ ] PropertyRow `tokenChip?` slot present; Phase 2 always passes null; structural slot ready for Phase 3
- [ ] VISIBILITY "Hide at this BP" checkbox renders disabled with "(Phase 3)" hint label
- [ ] All values in PropertyRow / BreadcrumbNav / sections use DS tokens; `lint-ds` clean
- [ ] All existing Phase 1 tests still pass (Inspector orchestrator + InspectorPanel shell)
- [ ] New tests: PropertyRow ~10 + BreadcrumbNav ~6 + InspectorPanel section additions ~4 — all pass
- [ ] Snapshots regenerated for InspectorPanel (acknowledge in commit message: "snap regenerated due to 4-section render")
- [ ] `npm run arch-test` returns **552 / 552** (+4 from baseline 548)
- [ ] `npm run typecheck` clean
- [ ] No mutations to: `apps/studio/**`, `packages/**`, `tools/block-forge/src/lib/preview-assets.ts`, `tools/block-forge/src/components/Inspector.tsx`, `tools/block-forge/src/App.tsx`, `TweakPanel.tsx`
- [ ] Manual live-smoke @ :7702: pin `.gauge-score` on `fast-loading-speed` → 4 sections render with active-BP cell at current preview BP populated, others showing `—`; click ↗ on inactive cell → tab switches; pin survives.

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. Arch tests — +4 expected
npm run arch-test
echo "(expect: 552 / 552 — baseline 548 + 4 new owned_files × 1 test/file)"

# 2. Typecheck
npm run typecheck
echo "(expect: clean)"

# 3. block-forge full test suite
cd tools/block-forge && npm run test 2>&1 | tail -25 && cd ../..
echo "(expect: ~210+ assertions; PropertyRow + BreadcrumbNav suites green; InspectorPanel snapshots regenerated cleanly)"

# 4. Studio + packages untouched
git diff --stat HEAD -- apps/studio/ packages/ | wc -l
echo "(expect: 0)"

# 5. Phase 1 surfaces untouched
git diff --stat HEAD -- tools/block-forge/src/lib/preview-assets.ts \
                          tools/block-forge/src/components/Inspector.tsx \
                          tools/block-forge/src/App.tsx | wc -l
echo "(expect: 0 — Phase 2 is component-additive only)"

# 6. lint-ds clean
npm run lint-ds 2>&1 | tail -5
echo "(expect: clean — no hardcoded styles in PropertyRow/BreadcrumbNav)"

# 7. Manual live-smoke checklist
cat <<'EOF'
Manual checks at :7702:
  [ ] Load fast-loading-speed → click .gauge-score → Inspector populates 4 sections
  [ ] Active BP cell highlighted (border + raised bg); inactive cells dimmed with —
  [ ] Click ↗ on Tablet 768 inactive cell → preview tab switches to Tablet,
      Tablet cell becomes active, Mobile + Desktop become inactive (and now
      show — too — since active-BP value re-sources at new BP)
  [ ] Display:flex element → flex-direction row visible; align-items + justify-content visible
  [ ] Display:grid element → grid-template-columns row visible
  [ ] Display:block (e.g., raw <p>) → no flex-direction, no grid-template-columns
  [ ] Hide-at-BP checkbox is disabled with (Phase 3) hint
  [ ] Breadcrumb still works — click ancestor → re-pins (Phase 1 invariant preserved)
EOF

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-033/phase-2-result.md`:

```markdown
# Execution Log: WP-033 Phase 2 — Side panel sections + per-BP cells (read-only)

> Epic: WP-033 Block Forge Inspector
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling (block-forge only)

## What Was Implemented
{2-5 sentences — PropertyRow + BreadcrumbNav extract + 4 sections; YELLOW caveat slots structurally reserved}

## §2.1 BreadcrumbNav extract
{File created; InspectorPanel diff; existing breadcrumb tests carried forward}

## §2.2 PropertyRow component
{Props matrix; 3 BP cells; ↗ view icon for inactive; inheritedFrom + tokenChip slots}

## §2.3 InspectorPanel section grouping
{4 sections rendered; conditional flex/grid rows; per-axis margin/padding; visibility checkbox disabled}

## §2.4 Tests
{PropertyRow N tests; BreadcrumbNav M tests; InspectorPanel +K tests; snapshot delta}

## §2.5 Manifest + arch-test
{4 new owned_files; arch-test 552/552}

## YELLOW caveats — structural slots verified
- Caveat 1 (chip 3-BP impact): `tokenChip?` slot in PropertyRow rendered when present; format string locked in JSDoc
- Caveat 2 (inheritedFrom): `inheritedFrom?` prop renders subdued italic suffix when set
- Caveat 3 (inactive dim + ↗ view): inactive cells dimmed; ↗ button calls onBpSwitch → triggers PreviewTriptych tab switch (lockstep)

## Issues & Workarounds
{"None" if clean; flag any tracking-utility / Tailwind v4 syntax surprises}

## Open Questions for Phase 3
{Any non-blocking question; e.g., "should `gap` row split into row-gap / column-gap when grid?"}

## Phase 3 entry conditions (all met if green)
- PropertyRow has onCellEdit slot → Phase 3 wires per-property emit
- tokenChip slot → Phase 3 wires <TokenChip> with `useChipDetection` hook
- inheritedFrom slot → Phase 3 fills via per-BP jsdom mini-render walker
- VISIBILITY checkbox → Phase 3 enables + wires display: none emit

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ 552/552 (+4) |
| typecheck | ✅ clean |
| block-forge unit tests | ✅ N/M |
| lint-ds | ✅ clean |
| Studio + packages untouched | ✅ |
| Phase 1 surfaces untouched | ✅ |
| Live-smoke (4 sections + ↗ lockstep + conditional rows) | ✅ GREEN |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add tools/block-forge/src/components/PropertyRow.tsx \
        tools/block-forge/src/components/BreadcrumbNav.tsx \
        tools/block-forge/src/components/InspectorPanel.tsx \
        tools/block-forge/src/__tests__/PropertyRow.test.tsx \
        tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx \
        tools/block-forge/src/__tests__/InspectorPanel.test.tsx \
        tools/block-forge/src/__tests__/__snapshots__/InspectorPanel.test.tsx.snap \
        src/__arch__/domain-manifest.ts \
        logs/wp-033/phase-2-result.md

git commit -m "feat(block-forge): WP-033 Phase 2 — Inspector property sections + per-BP cells (read-only) [WP-033 phase 2]"
```

---

## IMPORTANT Notes for CC (Hands)

- **Read-only this phase.** PropertyRow's `onCellEdit` prop is wired but NEVER called (Phase 3 wires). VISIBILITY checkbox is disabled. NO emit logic.
- **YELLOW caveats are structural slots, not full features.** Phase 2 reserves `tokenChip?`, `inheritedFrom?`, `↗ view` icon. Phase 3 fills the actual detection + sourcing.
- **Per-axis margin/padding rendering.** 4 rows each, NOT collapsed. Eases Phase 3 emit (one tweak per axis).
- **Conditional flex/grid rows.** Only render `flex-direction` when `display.includes('flex')`; only render `grid-template-columns` when `display.includes('grid')`.
- **Active-only valuesByBp Phase 2.** Active cell shows value from `pinned.computedStyle`; inactive cells show `null` → render `—`. Phase 3 jsdom × 3 fills inactive.
- **Tailwind v4 length-vs-color.** `text-[length:var(--text-X-font-size)]` not `text-[var(...)]`. Letter-spacing uses `tracking-[var(...)]`. Spot-check syntax against `packages/ui/` before writing new utility classes.
- **Snapshot updates expected.** InspectorPanel snapshots will regen due to 4-section structure. Acknowledge in commit message; do NOT silently force-update.
- **Surface to Brain immediately if:**
  - `pinned.computedStyle` is missing any MVP property (preview-assets.ts pin emit is supposed to include all 12; verify at audit)
  - `↗ view` icon click does NOT propagate to PreviewTriptych tab (lockstep regression — Phase 1 invariant broken)
  - Tailwind v4 class generation skips a `text-[...]` or `tracking-[...]` utility (would silently produce styles-less DOM)
  - Snapshot regen produces unexpected diff in unrelated test files (drift candidate)

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
