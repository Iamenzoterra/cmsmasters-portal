// WP-033 post-close polish — single-cell layout (replaced multi-BP M/T/D grid).
//
// Rationale (user feedback): three BP cells overwhelmed and required users to
// mentally diff three numbers per row. Active BP is the only one being edited;
// other BPs are visible by switching the BP picker. Aligns with Sketch/Figma
// authoring mental model.
//
// Unit handling: split numeric vs unit at parse time so the input only edits
// the number; unit displays as a static suffix and is re-attached on emit.
// Bare numeric input → auto-appended with the prior unit (or 'px' default).
// Keyword values (e.g. "flex", "auto", "start") pass through unchanged.
//
// WP-037 Phase 1 — typed enum inputs.
// When `meta.kind === 'enum'` (looked up via `getPropertyMeta(label)` or
// passed explicitly), the editable cell renders <select> with `meta.options`
// instead of <input>. Custom (non-listed) values stay selected as a disabled
// "(custom)" option so legacy tweaks survive.

import { useEffect, useRef, type ReactNode } from 'react'
import { getPropertyMeta, type PropertyMeta } from '../lib/property-meta'

export interface PropertyRowProps {
  /** Display label, e.g. "font-size", "padding-left". */
  label: string
  /** Current value at the active BP. `null` = unset; renders `—`. */
  value: string | null
  /** Optional inherited-from selector — renders subdued italic suffix. */
  inheritedFrom?: string
  /** Optional token chip slot — Phase 3 wires `<TokenChip />` here. */
  tokenChip?: ReactNode
  /** When provided, cell becomes editable. Phase 3 wires App's addTweak dispatch. */
  onEdit?: (value: string) => void
  /**
   * When provided, ↺ button renders next to the cell. Click → revert to base
   * (removes the tweak for this property at the active BP). InspectorPanel
   * gates this prop on "tweak exists" so the button only shows when there's
   * something to revert.
   */
  onRevert?: () => void
  /**
   * WP-037 Phase 1 — optional metadata override. When omitted, looked up via
   * `getPropertyMeta(label)`. Drives select-vs-input rendering for the
   * editable cell and (Phase 2) tooltip text.
   */
  meta?: PropertyMeta
  'data-testid'?: string
}

function isValidNumericInput(v: string): boolean {
  const trimmed = v.trim()
  if (trimmed === '') return false
  if (/(?<!r)em\b/i.test(trimmed)) return false
  return true
}

/**
 * Parse a CSS value into editable numeric portion + static unit suffix.
 *   "48px" → { numeric: "48", unit: "px" }
 *   "1.5rem" → { numeric: "1.5", unit: "rem" }
 *   "100%" → { numeric: "100", unit: "%" }
 *   "auto" / "flex" / "normal" → { numeric: "auto", unit: "" } (keyword passthrough)
 *   "var(--token)" → { numeric: "var(--token)", unit: "" }
 */
function parseValueUnit(raw: string | null | undefined): { numeric: string; unit: string } {
  if (raw == null) return { numeric: '', unit: '' }
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]+)?$/i)
  if (m) return { numeric: m[1], unit: m[2] ?? '' }
  return { numeric: raw.trim(), unit: '' }
}

/**
 * Re-attach unit to numeric input on emit.
 * - bare number + prior unit → "<n><unit>" (e.g. "60" + "px" → "60px")
 * - bare number + no prior unit → "<n>px" (auto-default)
 * - keyword/non-numeric → passthrough
 */
function normalizeWithUnit(input: string, priorUnit: string): string {
  const trimmed = input.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed + (priorUnit || 'px')
  return trimmed
}

export function PropertyRow(props: PropertyRowProps) {
  const { label, value, inheritedFrom, tokenChip, onEdit, onRevert } = props
  const meta = props.meta ?? getPropertyMeta(label)
  const testId = props['data-testid'] ?? `property-row-${label}`
  const isEmpty = value === null
  const isEditable = !isEmpty && Boolean(onEdit)
  const isEnum = meta?.kind === 'enum' && meta.options !== undefined
  const { numeric, unit } = parseValueUnit(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync prop value → input.value when value changes externally (e.g. user
  // pinned a different element). React's `defaultValue` is honored only on
  // mount; without this effect, the input keeps the old element's value.
  // Skip sync if user is currently editing (input has focus).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.value !== numeric) el.value = numeric
  }, [numeric])

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

      <div
        data-active="true"
        data-empty={isEmpty ? 'true' : 'false'}
        data-editable={isEditable ? 'true' : 'false'}
        className="flex min-w-0 flex-1 items-center gap-1 rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--bg-surface-alt))] px-2 py-1 text-[hsl(var(--text-primary))]"
      >
        {isEmpty ? (
          <span className="font-mono text-[hsl(var(--text-muted))]">—</span>
        ) : isEditable && isEnum && meta?.options ? (
          <select
            defaultValue={value ?? ''}
            data-testid={`${testId}-select`}
            onChange={(e) => {
              const next = e.currentTarget.value
              if (next === value) return
              onEdit?.(next)
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
          <>
            <input
              ref={inputRef}
              type="text"
              defaultValue={numeric}
              data-testid={`${testId}-input`}
              onBlur={(e) => {
                const next = e.currentTarget.value
                if (next === numeric) return
                if (!isValidNumericInput(next)) {
                  e.currentTarget.classList.add('!text-[hsl(var(--status-error-fg))]')
                  window.setTimeout(() => {
                    e.currentTarget.classList.remove('!text-[hsl(var(--status-error-fg))]')
                    e.currentTarget.value = numeric
                  }, 600)
                  return
                }
                onEdit?.(normalizeWithUnit(next, unit))
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                } else if (e.key === 'Escape') {
                  e.currentTarget.value = numeric
                  e.currentTarget.blur()
                }
              }}
              className="min-w-0 flex-1 bg-transparent font-mono text-[hsl(var(--text-primary))] outline-none"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              size={Math.max(numeric.length, 4)}
            />
            {unit && (
              <span className="font-mono text-[hsl(var(--text-muted))]">{unit}</span>
            )}
          </>
        ) : (
          <span data-testid={`${testId}-cell`} className="font-mono">
            {value}
          </span>
        )}
      </div>

      {onRevert && (
        <button
          type="button"
          onClick={onRevert}
          data-testid={`${testId}-revert`}
          title="Revert to base value (remove tweak)"
          aria-label={`Revert ${label} to base value`}
          className="shrink-0 rounded text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))]"
        >
          ↺
        </button>
      )}

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
