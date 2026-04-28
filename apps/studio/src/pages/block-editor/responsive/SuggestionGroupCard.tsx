// WP-036 Phase 2 — Studio mirror of tools/block-forge/src/components/SuggestionGroupCard.tsx.
//
// Engine emits per-rule (atomic accept/reject preserved). UX layer collapses
// at render time only. Single-selector groups render via SuggestionRow.
//
// PARITY trio: any drift here vs. the block-forge reference signals
// cross-surface divergence that must be reconciled in the same commit.
//
// Inline style flavour matches Studio's existing SuggestionRow pattern (vs.
// block-forge's Tailwind classes) — token usage is byte-identical.

import { useState } from 'react'
import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

interface SuggestionGroupCardProps {
  /** All suggestions sharing the group key tuple. Length ≥ 2 by construction. */
  suggestions: Suggestion[]
  /** Subset of suggestions in `session.pending` (intersected upstream). */
  pendingIds: Set<string>
  /** Subset of suggestions in `session.rejected` — used for "remaining" count. */
  rejectedIds: Set<string>
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onUndo?: (id: string) => void
  onPreviewHover?: (selector: string | null) => void
}

const CONFIDENCE_STYLES: Record<Confidence, { bg: string; fg: string; label: string }> = {
  high: {
    bg: 'hsl(var(--status-success-bg))',
    fg: 'hsl(var(--status-success-fg))',
    label: 'high',
  },
  medium: {
    bg: 'hsl(var(--status-info-bg))',
    fg: 'hsl(var(--status-info-fg))',
    label: 'medium',
  },
  low: {
    bg: 'hsl(var(--bg-surface))',
    fg: 'hsl(var(--text-muted))',
    label: 'low',
  },
}

function ConfidencePill({ level }: { level: Confidence }) {
  const s = CONFIDENCE_STYLES[level]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px var(--spacing-xs)',
        borderRadius: 'var(--rounded-full)',
        backgroundColor: s.bg,
        color: s.fg,
        fontSize: 'var(--text-xs-font-size)',
        fontWeight: 'var(--font-weight-semibold)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {s.label}
    </span>
  )
}

export function SuggestionGroupCard({
  suggestions,
  pendingIds,
  rejectedIds,
  onAccept,
  onReject,
  onUndo,
  onPreviewHover,
}: SuggestionGroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const first = suggestions[0]
  const { heuristic, bp, property, value, rationale, confidence } = first
  const total = suggestions.length

  const active = suggestions.filter((s) => !rejectedIds.has(s.id))
  const allPending = active.length > 0 && active.every((s) => pendingIds.has(s.id))
  const noneActive = active.length === 0

  return (
    <div
      data-suggestion-group-key={`${heuristic}-${bp}-${property}-${value}`}
      data-expanded={expanded || undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-sm)',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-sm)',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      <button
        type="button"
        data-action="toggle-group"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse group' : 'Expand group'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          data-role="heuristic"
          style={{
            padding: '2px var(--spacing-xs)',
            borderRadius: 'var(--rounded-sm)',
            backgroundColor: 'hsl(var(--bg-page))',
            color: 'hsl(var(--text-primary))',
            // ds-lint-ignore — heuristic tag is a code identifier; monospace required
            fontFamily: 'var(--font-family-monospace)',
            fontSize: 'var(--text-xs-font-size)',
          }}
        >
          {heuristic}
        </span>
        <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
          {bp === 0 ? 'base' : `@${bp}px`}
        </span>
        <span
          data-role="group-count"
          style={{
            padding: '2px var(--spacing-xs)',
            borderRadius: 'var(--rounded-full)',
            backgroundColor: 'hsl(var(--bg-page))',
            color: 'hsl(var(--text-primary))',
            fontSize: 'var(--text-xs-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          {total} selectors
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <ConfidencePill level={confidence} />
          <span aria-hidden="true" style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
            {expanded ? '▴' : '▾'}
          </span>
        </span>
      </button>

      <div
        style={{
          // ds-lint-ignore — CSS snippet rendered verbatim; monospace required
          fontFamily: 'var(--font-family-monospace)',
          fontSize: 'var(--text-xs-font-size)',
          color: 'hsl(var(--text-primary))',
        }}
      >
        <span style={{ color: 'hsl(var(--text-muted))' }}>…</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-primary))' }}>
        {rationale}
      </p>

      {!expanded && !noneActive && (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-2xs)' }}>
          <button
            type="button"
            data-action="accept-all"
            disabled={allPending}
            onClick={() => active.forEach((s) => onAccept(s.id))}
            style={{
              padding: '4px var(--spacing-sm)',
              borderRadius: 'var(--rounded-sm)',
              border: '1px solid hsl(var(--status-success-fg))',
              backgroundColor: 'hsl(var(--status-success-bg))',
              color: 'hsl(var(--status-success-fg))',
              fontSize: 'var(--text-xs-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              cursor: allPending ? 'not-allowed' : 'pointer',
              opacity: allPending ? 0.5 : 1,
            }}
          >
            Accept all ({active.length})
          </button>
          <button
            type="button"
            data-action="reject-all"
            onClick={() =>
              active.forEach((s) => {
                if (pendingIds.has(s.id) && onUndo) onUndo(s.id)
                else onReject(s.id)
              })
            }
            style={{
              padding: '4px var(--spacing-sm)',
              borderRadius: 'var(--rounded-sm)',
              border: '1px solid hsl(var(--border-default))',
              backgroundColor: 'hsl(var(--bg-surface))',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-xs-font-size)',
              cursor: 'pointer',
            }}
          >
            Reject all
          </button>
        </div>
      )}

      {expanded && (
        <ul
          data-role="group-members"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            borderTop: '1px solid hsl(var(--border-default))',
            paddingTop: 'var(--spacing-2xs)',
          }}
        >
          {suggestions.map((s) => {
            const isPending = pendingIds.has(s.id)
            const isRejected = rejectedIds.has(s.id)
            if (isRejected) return null
            return (
              <li
                key={s.id}
                data-suggestion-id={s.id}
                data-pending={isPending || undefined}
                onMouseEnter={onPreviewHover ? () => onPreviewHover(s.selector) : undefined}
                onMouseLeave={onPreviewHover ? () => onPreviewHover(null) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-xs)',
                  padding: '2px var(--spacing-xs)',
                  borderRadius: 'var(--rounded-sm)',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    // ds-lint-ignore — selector is a code identifier; monospace required
                    fontFamily: 'var(--font-family-monospace)',
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--text-primary))',
                  }}
                >
                  {s.selector}
                </span>
                {isPending ? (
                  <button
                    type="button"
                    data-action="undo"
                    onClick={() => (onUndo ?? onReject)(s.id)}
                    style={{
                      padding: '2px var(--spacing-xs)',
                      borderRadius: 'var(--rounded-sm)',
                      border: '1px solid hsl(var(--border-default))',
                      backgroundColor: 'hsl(var(--bg-surface))',
                      color: 'hsl(var(--text-muted))',
                      fontSize: 'var(--text-xs-font-size)',
                      cursor: 'pointer',
                    }}
                  >
                    Undo
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      data-action="accept"
                      onClick={() => onAccept(s.id)}
                      style={{
                        padding: '2px var(--spacing-xs)',
                        borderRadius: 'var(--rounded-sm)',
                        border: '1px solid hsl(var(--status-success-fg))',
                        backgroundColor: 'hsl(var(--status-success-bg))',
                        color: 'hsl(var(--status-success-fg))',
                        fontSize: 'var(--text-xs-font-size)',
                        fontWeight: 'var(--font-weight-semibold)',
                        cursor: 'pointer',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      data-action="reject"
                      onClick={() => onReject(s.id)}
                      style={{
                        padding: '2px var(--spacing-xs)',
                        borderRadius: 'var(--rounded-sm)',
                        border: '1px solid hsl(var(--border-default))',
                        backgroundColor: 'hsl(var(--bg-surface))',
                        color: 'hsl(var(--text-muted))',
                        fontSize: 'var(--text-xs-font-size)',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
