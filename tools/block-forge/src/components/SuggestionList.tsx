// Phase 4 — session-aware list: filters out rejected suggestions, passes
// accept/reject handlers down, marks pending rows with an "in flight" pill.
//
// Accepted rows stay visible with the pending pill so the author sees what
// will apply on the next Save. Rejected rows hide immediately.
//
// WP-036 Phase 2 — visually-identical suggestions sharing
// (heuristic, bp, property, value, rationale) collapse into a single
// SuggestionGroupCard (collapsed by default; expand reveals per-selector
// rows). Singletons keep using SuggestionRow — Option A "additive" path
// minimizes blast radius. Engine emit semantics unchanged.

import type { Suggestion } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'
import { SuggestionGroupCard } from './SuggestionGroupCard'
import type { SessionState } from '../lib/session'

type Props = {
  suggestions: Suggestion[]
  warnings: string[]
  session: SessionState
  onAccept: (id: string) => void
  onReject: (id: string) => void
  /** WP-036 Phase 2 — per-id Undo (pending → not-pending; preserves history coherence). */
  onUndo?: (id: string) => void
  /** WP-036 Phase 1 — hover a row → highlight target in iframe. Pass null to clear. */
  onPreviewHover?: (selector: string | null) => void
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

/**
 * WP-036 Phase 2 — group suggestions sharing
 * (heuristic, bp, property, value, rationale). The tuple captures
 * "visually-identical" intent: same fix, same breakpoint, same explanation
 * text. Selector differs (different rules in the CSS).
 *
 * Returns a stable list of either single suggestions OR group buckets.
 * Insertion order matches `sortSuggestions` output (first encounter of each
 * group key wins). Singleton groups (length 1) downcast back to Suggestion
 * for SuggestionRow render — Option A "additive" path.
 */
function groupKey(s: Suggestion): string {
  return `${s.heuristic}|${s.bp}|${s.property}|${s.value}|${s.rationale}`
}

type ListEntry =
  | { kind: 'single'; suggestion: Suggestion }
  | { kind: 'group'; key: string; suggestions: Suggestion[] }

function buildEntries(sorted: Suggestion[]): ListEntry[] {
  const buckets = new Map<string, Suggestion[]>()
  const order: string[] = []
  for (const s of sorted) {
    const k = groupKey(s)
    if (!buckets.has(k)) {
      buckets.set(k, [])
      order.push(k)
    }
    buckets.get(k)!.push(s)
  }
  return order.map((k) => {
    const arr = buckets.get(k)!
    if (arr.length === 1) return { kind: 'single', suggestion: arr[0] }
    return { kind: 'group', key: k, suggestions: arr }
  })
}

export { groupKey, buildEntries }

export function SuggestionList({
  suggestions,
  warnings,
  session,
  onAccept,
  onReject,
  onUndo,
  onPreviewHover,
}: Props) {
  const sorted = sortSuggestions(suggestions)
  // Rejected rows hide for the FLAT count; group cards still receive the rejected
  // ids so they can show "X of N rejected" later (Phase 2 ships flat hide for
  // singletons, plus group internal rejected-row hide).
  const visibleFlat = sorted.filter((s) => !session.rejected.includes(s.id))
  const entries = buildEntries(sorted)
  const pendingSet = new Set(session.pending)
  const rejectedSet = new Set(session.rejected)

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

      {visibleFlat.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[hsl(var(--text-muted))]">
          No suggestions — block has no responsive-authoring triggers.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-[hsl(var(--text-muted))]">
            {visibleFlat.length} suggestion{visibleFlat.length === 1 ? '' : 's'}
          </div>
          {entries.map((entry) => {
            if (entry.kind === 'single') {
              const s = entry.suggestion
              if (rejectedSet.has(s.id)) return null
              return (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  isPending={pendingSet.has(s.id)}
                  onAccept={onAccept}
                  onReject={onReject}
                  onUndo={onUndo}
                  onPreviewHover={onPreviewHover}
                />
              )
            }
            // Group: hide entirely if every member rejected.
            const stillVisible = entry.suggestions.some((s) => !rejectedSet.has(s.id))
            if (!stillVisible) return null
            return (
              <SuggestionGroupCard
                key={entry.key}
                suggestions={entry.suggestions}
                pendingIds={pendingSet}
                rejectedIds={rejectedSet}
                onAccept={onAccept}
                onReject={onReject}
                onUndo={onUndo}
                onPreviewHover={onPreviewHover}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export { sortSuggestions }
