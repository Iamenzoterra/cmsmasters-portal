// WP-033 Phase 2 — PropertyRow.
//
// Single property row inside an InspectorPanel section. 3 BP cells (M/T/D)
// each rendered with active-vs-inactive distinction. Read-only this phase;
// `onCellEdit` slot wired but never called (Phase 3 wires emit).
//
// YELLOW caveat slots (Phase 0 §0.11 — structural reservations):
//   1. tokenChip?       — Phase 3 fills with <TokenChip /> after detection.
//                         Format string locked: "[Use --token ✓ — sets X/Y/Z
//                         at all 3 BPs]"; documented in PropertyRowProps JSDoc
//                         so Phase 3 just plugs the chip into this slot.
//   2. inheritedFrom?   — Phase 3 fills with ancestor selector after jsdom
//                         walker. Phase 2 always undefined; if set, renders
//                         "(inherited from <selector>)" subdued italic suffix.
//   3. ↗ view icon      — On every inactive cell. Click → onBpSwitch(cellBp)
//                         which maps to PreviewTriptych tab switch via the
//                         Phase 1 lockstep already wired in App.tsx.
//
// Per-BP value sourcing:
//   Phase 2 → only the active BP cell receives a value (from
//   pinned.computedStyle); inactive cells render `—`. Phase 3 §3.2 lands
//   `useInspectorPerBpValues` jsdom-mini-render hook to fill inactive cells.
//
// Token usage (substituted for the speculative names in the task prompt that
// don't exist in tokens.css):
//   active cell border  → --text-link        (accent-default substitute)
//   active cell bg      → --bg-surface-alt   (bg-surface-raised substitute)
//   inactive cell text  → --text-muted
//   active cell text    → --text-primary     (text-default substitute)

import type { ReactNode } from 'react'
import type { InspectorBp } from './Inspector'

export interface PropertyRowProps {
  /** Display label, e.g. "font-size", "padding-left". */
  label: string
  /**
   * Per-BP value strings. Phase 2: only the active-BP key is populated;
   * inactive keys are `null`. Phase 3 fills inactive keys via jsdom
   * mini-renders (`useInspectorPerBpValues`).
   */
  valuesByBp: Record<InspectorBp, string | null>
  /** Active BP — cell at this BP is highlighted; others are dimmed. */
  activeBp: InspectorBp
  /**
   * When user clicks `↗ view` on an inactive cell, switch PreviewTriptych
   * + Inspector to that BP (lockstep wired Phase 1 via App.tsx).
   */
  onBpSwitch: (bp: InspectorBp) => void
  /**
   * YELLOW caveat 2 — when the active-BP value is inherited from an
   * ancestor, pass the source selector. Renders `(inherited from <selector>)`
   * subdued italic suffix. Phase 3 fills; Phase 2 always undefined.
   */
  inheritedFrom?: string
  /**
   * YELLOW caveat 1 — token-chip slot. Phase 3 wires `<TokenChip />` after
   * detection runs through PostCSS subset. Phase 2 always null.
   *
   * Locked label format Phase 3 must follow:
   *   "[Use --token ✓ — sets X/Y/Z at all 3 BPs]"
   */
  tokenChip?: ReactNode
  /** Phase 3 wires onChange per cell. Phase 2 cells are read-only. */
  onCellEdit?: (bp: InspectorBp, value: string) => void
  'data-testid'?: string
}

const BPs: ReadonlyArray<InspectorBp> = [375, 768, 1440] as const
const BP_SHORT: Record<InspectorBp, string> = {
  375: 'M',
  768: 'T',
  1440: 'D',
}

export function PropertyRow(props: PropertyRowProps) {
  const testId = props['data-testid'] ?? `property-row-${props.label}`
  const { label, valuesByBp, activeBp, onBpSwitch, inheritedFrom, tokenChip } = props

  return (
    <div
      data-testid={testId}
      data-property={label}
      className="flex items-center gap-2 py-1 text-[length:var(--text-xs-font-size)]"
    >
      <div
        className="w-32 shrink-0 truncate font-mono text-[hsl(var(--text-muted))]"
        title={label}
      >
        {label}
      </div>

      <div className="flex grow items-center gap-1">
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
              className={
                isActive
                  ? 'flex min-w-[5rem] items-center gap-1 rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--bg-surface-alt))] px-2 py-1 text-[hsl(var(--text-primary))]'
                  : 'flex min-w-[5rem] items-center gap-1 rounded border border-[hsl(var(--border-default))] px-2 py-1 text-[hsl(var(--text-muted))]'
              }
            >
              <span
                className="font-[number:var(--font-weight-medium)] text-[hsl(var(--text-muted))]"
                aria-label={`Breakpoint ${bp}`}
              >
                {BP_SHORT[bp]}
              </span>
              <span
                data-testid={`${testId}-cell-${bp}`}
                className="font-mono"
              >
                {isEmpty ? '—' : value}
              </span>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => onBpSwitch(bp)}
                  data-testid={`${testId}-switch-${bp}`}
                  className="ml-auto text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]"
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

      {inheritedFrom && (
        <span
          data-testid={`${testId}-inherited`}
          className="shrink-0 italic text-[hsl(var(--text-muted))]"
        >
          (inherited from {inheritedFrom})
        </span>
      )}

      {tokenChip && (
        <div data-testid={`${testId}-chip-slot`} className="shrink-0">
          {tokenChip}
        </div>
      )}
    </div>
  )
}
