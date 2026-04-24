import { useState } from 'react'
import type { ValidationItem } from '../lib/validation'

// Phase 3 Task 3.5 — live validation ribbon above BreakpointBar.
// Sits inside `.lm-canvas-area`, right above `BreakpointBar`. Collapsed
// by default to preserve the 3-layer BP rhythm from P2. Expands on
// click when there is at least one item.

interface Props {
  errors: ValidationItem[]
  warnings: ValidationItem[]
  onFocusItem: (item: ValidationItem) => void
}

type Severity = 'error' | 'warning' | 'info'

function badgeSeverity(errors: ValidationItem[], warnings: ValidationItem[]): Severity {
  if (errors.length > 0) return 'error'
  if (warnings.length > 0) return 'warning'
  return 'info'
}

function summaryText(errors: ValidationItem[], warnings: ValidationItem[]): string {
  if (errors.length === 0 && warnings.length === 0) return 'No issues'
  const parts: string[] = []
  if (errors.length > 0) parts.push(`Errors: ${errors.length}`)
  if (warnings.length > 0) parts.push(`Warnings: ${warnings.length}`)
  return parts.join(' · ')
}

export function ValidationSummary({ errors, warnings, onFocusItem }: Props) {
  const hasAny = errors.length + warnings.length > 0
  const [expanded, setExpanded] = useState(false)
  const severity = badgeSeverity(errors, warnings)
  const items = [...errors, ...warnings]

  return (
    <div
      id="lm-validation-summary"
      className={`lm-validation-summary lm-validation-summary--${severity}`}
      data-severity={severity}
    >
      <button
        type="button"
        className="lm-validation-summary__header"
        onClick={() => hasAny && setExpanded((v) => !v)}
        disabled={!hasAny}
        aria-expanded={hasAny ? expanded : undefined}
      >
        <span
          className={`lm-validation-badge lm-validation-badge--${severity}`}
          aria-hidden="true"
        />
        <span className="lm-validation-summary__text">
          {summaryText(errors, warnings)}
        </span>
        {hasAny && (
          <span className="lm-validation-summary__chev" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </button>

      {expanded && hasAny && (
        <ul className="lm-validation-summary__list" role="list">
          {items.map((item) => (
            <li key={item.id} className={`lm-validation-item lm-validation-item--${item.severity}`}>
              <button
                type="button"
                className="lm-validation-item__button"
                onClick={() => onFocusItem(item)}
              >
                <span
                  className={`lm-validation-badge lm-validation-badge--${item.severity}`}
                  aria-hidden="true"
                />
                <span className="lm-validation-item__message">{item.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
