// Phase 4 — session-aware list: filters out rejected suggestions, passes
// accept/reject handlers down, marks pending rows with an "in flight" pill.
//
// Accepted rows stay visible with the pending pill so the author sees what
// will apply on the next Save. Rejected rows hide immediately.

import type { Suggestion } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'
import type { SessionState } from '../lib/session'

type Props = {
  suggestions: Suggestion[]
  warnings: string[]
  session: SessionState
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

/** Dispatcher order from WP-025 — stable list ordering. */
const HEURISTIC_ORDER = [
  'grid-cols',
  'spacing-clamp',
  'font-clamp',
  'flex-wrap',
  'horizontal-overflow',
  'media-maxwidth',
] as const

function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return [...suggestions].sort((a, b) => {
    const ha = HEURISTIC_ORDER.indexOf(a.heuristic)
    const hb = HEURISTIC_ORDER.indexOf(b.heuristic)
    if (ha !== hb) return ha - hb
    if (a.selector !== b.selector) return a.selector.localeCompare(b.selector)
    return a.bp - b.bp
  })
}

export function SuggestionList({
  suggestions,
  warnings,
  session,
  onAccept,
  onReject,
}: Props) {
  const sorted = sortSuggestions(suggestions)
  // Rejected rows hide; pending rows stay visible so the author can Undo.
  const visible = sorted.filter((s) => !session.rejected.includes(s.id))

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      {warnings.length > 0 && (
        <div
          role="alert"
          className="rounded border border-[hsl(var(--status-error-fg))] bg-[hsl(var(--status-error-bg))] p-3 text-sm text-[hsl(var(--status-error-fg))]"
        >
          <div className="font-semibold">Analyzer warnings ({warnings.length})</div>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w, i) => (
              <li key={i} className="font-mono text-xs">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
          No suggestions — block has no responsive-authoring triggers.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-[hsl(var(--text-muted))]">
            {visible.length} suggestion{visible.length === 1 ? '' : 's'}
          </div>
          {visible.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              isPending={session.pending.includes(s.id)}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export { sortSuggestions }
