// WP-027 Phase 3 — ordered suggestion list with warnings banner + empty/error states.
//
// HEURISTIC_ORDER copied verbatim from tools/block-forge/src/components/SuggestionList.tsx:20-27
// (engine does NOT export it publicly — it's a local block-forge const). Any future resync
// between the two surfaces is a Phase 5 Close PARITY approval gate item.
//
// Warnings banner uses --status-error-* tokens (mirrors block-forge reference) for
// cross-surface parity, even though tokens.css also has --status-warn-*. Any rebrand of
// warnings visuals must edit both surfaces in lockstep.

import type { Suggestion, Heuristic } from '@cmsmasters/block-forge-core'
import { SuggestionRow } from './SuggestionRow'

// Verbatim from tools/block-forge/src/components/SuggestionList.tsx:20-27
const HEURISTIC_ORDER: readonly Heuristic[] = [
  'grid-cols',
  'spacing-clamp',
  'font-clamp',
  'flex-wrap',
  'horizontal-overflow',
  'media-maxwidth',
]

function sortSuggestions(suggestions: Suggestion[]): Suggestion[] {
  // Heuristic → selector → BP. `bp` is always number per types.ts:45; no null guard.
  return [...suggestions].sort((a, b) => {
    const hIdxA = HEURISTIC_ORDER.indexOf(a.heuristic)
    const hIdxB = HEURISTIC_ORDER.indexOf(b.heuristic)
    if (hIdxA !== hIdxB) return hIdxA - hIdxB
    if (a.selector !== b.selector) return a.selector.localeCompare(b.selector)
    return a.bp - b.bp
  })
}

interface SuggestionListProps {
  suggestions: Suggestion[]
  warnings: string[]
  error: Error | null
}

export function SuggestionList({ suggestions, warnings, error }: SuggestionListProps) {
  // Error state — something threw inside analyzeBlock or generateSuggestions
  if (error) {
    return (
      <div
        style={{
          padding: 'var(--spacing-xl)',
          backgroundColor: 'hsl(var(--status-error-bg))',
          color: 'hsl(var(--status-error-fg))',
          borderRadius: 'var(--rounded-md)',
          margin: 'var(--spacing-xl)',
          fontSize: 'var(--text-sm-font-size)',
        }}
      >
        <strong>Analysis error:</strong> {error.message}
      </div>
    )
  }

  // Empty state — no suggestions AND no warnings
  if (suggestions.length === 0 && warnings.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--spacing-xl)',
          color: 'hsl(var(--text-muted))',
          fontSize: 'var(--text-sm-font-size)',
        }}
      >
        No responsive suggestions for this block — looks good.
      </div>
    )
  }

  const sorted = sortSuggestions(suggestions)

  return (
    <div
      style={{
        padding: 'var(--spacing-xl)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
      }}
    >
      {warnings.length > 0 && (
        <div
          style={{
            // Mirror block-forge reference: warnings use --status-error-* (cross-surface parity).
            padding: 'var(--spacing-md)',
            backgroundColor: 'hsl(var(--status-error-bg))',
            color: 'hsl(var(--status-error-fg))',
            border: '1px solid hsl(var(--status-error-fg))',
            borderRadius: 'var(--rounded-md)',
            fontSize: 'var(--text-sm-font-size)',
          }}
        >
          <strong>Warnings ({warnings.length})</strong>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {sorted.map((s) => (
        <SuggestionRow key={s.id} suggestion={s} />
      ))}
    </div>
  )
}
