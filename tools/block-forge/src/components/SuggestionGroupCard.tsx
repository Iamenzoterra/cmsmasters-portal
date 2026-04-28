// WP-036 Phase 2 — collapsed-by-default grouping for visually-identical
// suggestions sharing (heuristic, bp, property, value, rationale).
//
// Engine emits per-rule (atomic accept/reject preserved). UX layer collapses
// at render time only. Single-selector groups render via SuggestionRow (this
// component handles N≥2 only — branch logic lives in SuggestionList).
//
// Default state: COLLAPSED — header + CSS line (no selector) + rationale +
// "N selectors" badge + group Accept-all/Reject-all. Click anywhere on the
// header (or chevron button) to toggle expand.
//
// Expanded state: same header + per-selector rows. Each row has its own
// Accept/Reject (or Undo when pending) + individual hover-highlight via
// Phase 1 onPreviewHover protocol.
//
// History/state semantics: every action operates on individual suggestion ids
// (group is purely visual). Save composition reads `session.pending` as before.

import { useState } from 'react'
import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

type Props = {
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

const CONFIDENCE_STYLES: Record<
  Confidence,
  { bg: string; fg: string; label: string }
> = {
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
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: s.bg, color: s.fg }}
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
}: Props) {
  const [expanded, setExpanded] = useState(false)

  // Group meta from first suggestion — all members share these by construction.
  const first = suggestions[0]
  const { heuristic, bp, property, value, rationale, confidence } = first
  const total = suggestions.length

  // "Active" = not yet rejected. Group actions only fire on still-active ids.
  const active = suggestions.filter((s) => !rejectedIds.has(s.id))
  const allPending = active.length > 0 && active.every((s) => pendingIds.has(s.id))
  const noneActive = active.length === 0

  return (
    <div
      data-suggestion-group-key={`${heuristic}-${bp}-${property}-${value}`}
      data-expanded={expanded || undefined}
      className="flex flex-col gap-2 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-3"
    >
      {/* Header: heuristic + bp + N selectors + confidence + chevron */}
      <button
        type="button"
        data-action="toggle-group"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse group' : 'Expand group'}
        className="flex items-center gap-2 text-left"
      >
        <span
          data-role="heuristic"
          className="rounded bg-[hsl(var(--bg-page))] px-2 py-0.5 font-mono text-xs text-[hsl(var(--text-primary))]"
        >
          {heuristic}
        </span>
        <span className="text-xs text-[hsl(var(--text-muted))]">
          {bp === 0 ? 'base' : `@${bp}px`}
        </span>
        <span
          data-role="group-count"
          className="rounded-full bg-[hsl(var(--bg-page))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--text-primary))]"
        >
          {total} selectors
        </span>
        <span className="ml-auto flex items-center gap-2">
          <ConfidencePill level={confidence} />
          <span
            aria-hidden="true"
            className="text-xs text-[hsl(var(--text-muted))]"
          >
            {expanded ? '▴' : '▾'}
          </span>
        </span>
      </button>

      {/* CSS line — selector elided since multiple. Shows shared property:value. */}
      <div className="font-mono text-xs text-[hsl(var(--text-primary))]">
        <span className="text-[hsl(var(--text-muted))]">…</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      <p className="text-sm text-[hsl(var(--text-primary))]">{rationale}</p>

      {!expanded && !noneActive && (
        <div className="flex gap-2">
          <button
            type="button"
            data-action="accept-all"
            disabled={allPending}
            onClick={() => active.forEach((s) => onAccept(s.id))}
            className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-3 py-1 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80 disabled:opacity-50"
          >
            Accept all ({active.length})
          </button>
          <button
            type="button"
            data-action="reject-all"
            onClick={() =>
              active.forEach((s) => {
                // For pending ids, route through onUndo (so they leave pending);
                // for not-yet-acted ids, normal reject.
                if (pendingIds.has(s.id) && onUndo) onUndo(s.id)
                else onReject(s.id)
              })
            }
            className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
          >
            Reject all
          </button>
        </div>
      )}

      {expanded && (
        <ul
          data-role="group-members"
          className="flex flex-col gap-1 border-t border-[hsl(var(--border-default))] pt-2"
        >
          {suggestions.map((s) => {
            const isPending = pendingIds.has(s.id)
            const isRejected = rejectedIds.has(s.id)
            if (isRejected) return null // rejected rows hide same as flat list
            return (
              <li
                key={s.id}
                data-suggestion-id={s.id}
                data-pending={isPending || undefined}
                onMouseEnter={
                  onPreviewHover ? () => onPreviewHover(s.selector) : undefined
                }
                onMouseLeave={
                  onPreviewHover ? () => onPreviewHover(null) : undefined
                }
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[hsl(var(--bg-page))]"
              >
                <span className="flex-1 font-mono text-xs text-[hsl(var(--text-primary))]">
                  {s.selector}
                </span>
                {isPending ? (
                  <button
                    type="button"
                    data-action="undo"
                    onClick={() => (onUndo ?? onReject)(s.id)}
                    className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-0.5 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
                  >
                    Undo
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      data-action="accept"
                      onClick={() => onAccept(s.id)}
                      className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      data-action="reject"
                      onClick={() => onReject(s.id)}
                      className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-0.5 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
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
