// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/PropertyRow.tsx.
// PARITY note: post-WP-033 polish migrated block-forge to single-cell layout.
// Studio remains on the 3-BP M/T/D grid (see WP-037 Phase 0 RECON Ruling 1B).
// PROPERTY_META content is byte-identical between surfaces; render adapts to
// each shape (Studio: select renders only in active cell).
//
// Single property row inside an InspectorPanel section. 3 BP cells (M/T/D)
// each rendered with active-vs-inactive distinction. Active cell becomes an
// editable <input> when `onCellEdit` is provided.
//
// YELLOW caveat slots:
//   1. tokenChip?       — Phase 3 fills via <TokenChip /> from useChipDetection.
//   2. inheritedFrom?   — DEFERRED Phase 3+ (Phase 0 §0.11.b). Slot stays empty.
//   3. ↗ view icon      — Inactive cell only.
//
// Validation: trim whitespace, reject empty (cancel semantics), reject `em`
// per pkg-block-forge-core SKILL Trap (use `rem` / `px` / `%` / `var(...)` /
// unitless number).
//
// WP-037 Phase 1 — typed enum inputs (active cell only).
// When `meta.kind === 'enum'` (looked up via `getPropertyMeta(label)` or
// passed explicitly), the active editable cell renders <select> with
// `meta.options` instead of <input>. Inactive cells stay as text spans —
// switch BP via ↗ first to edit elsewhere.

import type { ReactNode } from 'react'
import type { InspectorBp } from './Inspector'
import { getPropertyMeta, type PropertyMeta } from './property-meta'

export interface PropertyRowProps {
  /** Display label, e.g. "font-size", "padding-left". */
  label: string
  /** Per-BP value strings. Null cells render `—`. */
  valuesByBp: Record<InspectorBp, string | null>
  /** Active BP — cell at this BP is highlighted; others are dimmed. */
  activeBp: InspectorBp
  /** Switch PreviewTriptych + Inspector to that BP via lockstep. */
  onBpSwitch: (bp: InspectorBp) => void
  /** YELLOW caveat 2 — DEFERRED Phase 3+. */
  inheritedFrom?: string
  /** YELLOW caveat 1 — token-chip slot. */
  tokenChip?: ReactNode
  /**
   * Active-cell edit emit. When provided, the active cell becomes an editable
   * input on focus. Commit on blur or Enter; cancel on Esc. Inactive cells are
   * NEVER editable.
   */
  onCellEdit?: (bp: InspectorBp, value: string) => void
  /**
   * WP-037 Phase 1 — optional metadata override. When omitted, looked up via
   * `getPropertyMeta(label)`. Drives select-vs-input rendering on the active
   * cell and (Phase 2) tooltip text.
   */
  meta?: PropertyMeta
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
  const meta = props.meta ?? getPropertyMeta(label)
  const isEnum = meta?.kind === 'enum' && meta.options !== undefined

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
              {isEditable && isEnum && meta?.options ? (
                <select
                  defaultValue={value ?? ''}
                  data-testid={`${testId}-select-${bp}`}
                  onChange={(e) => {
                    const next = e.currentTarget.value
                    if (next === value) return
                    onCellEdit?.(bp, next)
                  }}
                  className="min-w-0 flex-1 bg-transparent font-mono text-[hsl(var(--text-primary))] outline-none"
                >
                  {value && !meta.options.includes(value) && (
                    <option key="__custom__" value={value} disabled>
                      {value} (custom)
                    </option>
                  )}
                  {meta.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : isEditable ? (
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
