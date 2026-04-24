import { useState } from 'react'
import type { ValidationItem } from '../lib/validation'

export function ValidationItemList({
  items,
  onFocusItem,
}: {
  items: ValidationItem[]
  onFocusItem: (item: ValidationItem) => void
}) {
  return (
    <ul className="lm-validation-summary__list">
      {items.map((item) => (
        <li key={item.id} className={`lm-validation-item lm-validation-item--${item.severity}`}>
          <button className="lm-validation-item__button" onClick={() => onFocusItem(item)}>
            <span className={`lm-validation-badge lm-validation-badge--${item.severity}`} />
            <span className="lm-validation-item__message">{item.message}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ValidationSummary({
  errors,
  warnings,
  onFocusItem,
}: {
  errors: ValidationItem[]
  warnings: ValidationItem[]
  onFocusItem: (item: ValidationItem) => void
}) {
  const hasAny = errors.length + warnings.length > 0
  const [expanded, setExpanded] = useState(false)
  const severity = errors.length ? 'error' : warnings.length ? 'warning' : 'info'
  const text = !hasAny
    ? 'No issues'
    : [
        errors.length ? `Errors: ${errors.length}` : null,
        warnings.length ? `Warnings: ${warnings.length}` : null,
      ]
        .filter(Boolean)
        .join(' · ')

  return (
    <div id="lm-validation-summary" className={`lm-validation-summary lm-validation-summary--${severity}`}>
      <button
        className="lm-validation-summary__header"
        onClick={() => hasAny && setExpanded((v) => !v)}
        disabled={!hasAny}
        aria-expanded={hasAny ? expanded : undefined}
      >
        <span className={`lm-validation-badge lm-validation-badge--${severity}`} />
        <span className="lm-validation-summary__text">{text}</span>
        {hasAny && <span className="lm-validation-summary__chev">{expanded ? '▾' : '▸'}</span>}
      </button>
      {expanded && hasAny && (
        <ValidationItemList items={[...errors, ...warnings]} onFocusItem={onFocusItem} />
      )}
    </div>
  )
}
