import { useState } from 'react'
import type { TokenMap } from '../lib/types'
import { SlotReference } from './SlotReference'
import { TokenReference } from './TokenReference'

// Phase 6 — Collapsible container (Brain #5) that demotes reference utilities
// out of the main Inspector scroll path. Collapsed by default — reveals
// SlotReference + TokenReference on header click. Applies to both the
// empty-state and the slot-selected Inspector view.

interface Props {
  tokens: TokenMap | null
  onCopied: () => void
}

export function InspectorUtilityZone({ tokens, onCopied }: Props) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="lm-utility-zone">
      <button
        type="button"
        className="lm-utility-zone__header"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className={
            expanded
              ? 'lm-utility-zone__chevron lm-utility-zone__chevron--expanded'
              : 'lm-utility-zone__chevron'
          }
        >
          {'▸'}
        </span>
        References
      </button>
      {expanded && (
        <div className="lm-utility-zone__body">
          <SlotReference onCopied={onCopied} />
          {tokens?.categories && (
            <TokenReference categories={tokens.categories} onCopied={onCopied} />
          )}
        </div>
      )}
    </div>
  )
}
