// WP-033 Phase 2 — PropertyRow.
// WP-033 Phase 3 — active cell becomes an editable <input> when `onCellEdit`
// is provided. Inactive cells stay <span> (no edit-at-wrong-BP per Phase 0
// §0.11.g). Empty cells stay `—` (jsdom hook fills these in §3.2).
//
// Single property row inside an InspectorPanel section. 3 BP cells (M/T/D)
// each rendered with active-vs-inactive distinction.
//
// YELLOW caveat slots (Phase 0 §0.11):
//   1. tokenChip?       — Phase 3 fills via <TokenChip /> from useChipDetection.
//                         Locked label format: "[Use --token ✓ — sets X/Y/Z
//                         at all 3 BPs]" — see TokenChip.tsx.
//   2. inheritedFrom?   — DEFERRED Phase 3 (Phase 0 §0.11.b). Slot stays empty.
//   3. ↗ view icon      — Inactive cell only. Click → onBpSwitch(cellBp) → tab
//                         switch via Phase 1 lockstep. Active cell never has ↗.
//
// Validation (Phase 3): trim whitespace, reject empty (cancel semantics),
// reject `em` per pkg-block-forge-core SKILL Trap (use `rem` / `px` / `%` /
// `var(...)` / unitless number).

import type { ReactNode } from 'react'
import type { InspectorBp } from './Inspector'

export interface PropertyRowProps {
  /** Display label, e.g. "font-size", "padding-left". */
  label: string
  /**
   * Per-BP value strings. Phase 3: active-BP cell may come from `pinned.computedStyle`
   * (Phase 1 visible iframe), inactive cells from `useInspectorPerBpValues` hook
   * (Phase 3 hidden probe iframes). Null cells render `—`.
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
   * subdued italic suffix. Phase 3 always undefined (DEFERRED).
   */
  inheritedFrom?: string
  /**
   * YELLOW caveat 1 — token-chip slot. Phase 3 wires `<TokenChip />` after
   * `useChipDetection` runs. When undefined, no chip renders.
   */
  tokenChip?: ReactNode
  /**
   * Phase 3 — active-cell edit emit. When provided, the active cell becomes
   * an editable input on focus. Commit on blur or Enter; cancel on Esc.
   * Inactive cells are NEVER editable (use ↗ to switch first).
   *
   * Validation handled in this component before invoking; invalid input
   * (empty / `em` unit) snaps back to the previous value WITHOUT calling.
   */
  onCellEdit?: (bp: InspectorBp, value: string) => void
  'data-testid'?: string
}

const BPs: ReadonlyArray<InspectorBp> = [375, 768, 1440] as const
const BP_SHORT: Record<InspectorBp, string> = {
  375: 'M',
  768: 'T',
  1440: 'D',
}

/**
 * Validate a user-typed cell value. `em` is rejected because per-element
 * em-units cascade-multiply through ancestor font-size — see pkg-block-forge-core
 * SKILL Trap. `rem`, `px`, `%`, `var(...)`, unitless numbers, keyword values
 * (e.g. `none`, `flex`) all pass.
 */
function isValidCellValue(v: string): boolean {
  const trimmed = v.trim()
  if (trimmed === '') return false
  if (/(?<!r)em\b/i.test(trimmed)) return false
  return true
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
          const isEditable = isActive && !isEmpty && Boolean(onCellEdit)
          return (
            <div
              key={bp}
              data-cell-bp={bp}
              data-active={isActive ? 'true' : 'false'}
              data-empty={isEmpty ? 'true' : 'false'}
              data-editable={isEditable ? 'true' : 'false'}
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
              {isEditable ? (
                <input
                  type="text"
                  defaultValue={value ?? ''}
                  data-testid={`${testId}-input-${bp}`}
                  onBlur={(e) => {
                    const next = e.currentTarget.value
                    if (next === value) return
                    if (!isValidCellValue(next)) {
                      e.currentTarget.value = value ?? ''
                      return
                    }
                    onCellEdit?.(bp, next.trim())
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                      e.currentTarget.value = value ?? ''
                      e.currentTarget.blur()
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[hsl(var(--text-primary))] outline-none placeholder:text-[hsl(var(--text-muted))]"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                  size={Math.max((value ?? '').length, 4)}
                />
              ) : (
                <span
                  data-testid={`${testId}-cell-${bp}`}
                  className="font-mono"
                >
                  {isEmpty ? '—' : value}
                </span>
              )}
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
