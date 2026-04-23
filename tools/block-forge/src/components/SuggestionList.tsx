// Phase 3 — sorted list of suggestions with optional warning banner above
// and friendly empty-state below. Stateless: App.tsx owns the hook.
//
// Sort order is stable: dispatcher-order (HEURISTIC_ORDER) → selector →
// breakpoint. This matches the natural reading order of the rule engine's
// output and keeps test assertions deterministic.

import type { Suggestion } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'

type Props = {
  suggestions: Suggestion[]
  warnings: string[]
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

export function SuggestionList({ suggestions, warnings }: Props) {
  const sorted = sortSuggestions(suggestions)

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

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
          No suggestions — block has no responsive-authoring triggers.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-[hsl(var(--text-muted))]">
            {sorted.length} suggestion{sorted.length === 1 ? '' : 's'}
          </div>
          {sorted.map((s) => (
            <SuggestionRow key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  )
}

export { sortSuggestions }
