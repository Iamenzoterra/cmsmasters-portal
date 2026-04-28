// Phase 4 — Accept / Reject / Undo wiring.
//
// Two visual modes:
//   (a) default — Accept (success-green) + Reject (neutral, hover-red)
//   (b) pending — "will apply on save" pill in header + single "Undo" button
//       that moves id to `rejected` (hides the row). MVP shortcut: undo-via-
//       reject keeps the state machine simple; session.undo(state) is wired
//       separately through history for precise rollback.
//
// Token grep (all verified in Phase 3):
//   --status-success-bg/-fg, --status-info-bg/-fg, --status-error-fg,
//   --bg-surface, --bg-page, --text-primary, --text-muted, --border-default.
//
// ConfidencePill retains its dynamic inline-style pattern from Phase 3 (per
// CONVENTIONS "truly dynamic" exception).

import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

type Props = {
  suggestion: Suggestion
  isPending: boolean
  onAccept: (id: string) => void
  onReject: (id: string) => void
  /** WP-036 Phase 1 — fires on hover-enter (selector) and hover-leave (null). */
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

function PendingPill() {
  return (
    <span
      data-role="pending-pill"
      className="rounded-full bg-[hsl(var(--status-info-bg))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--status-info-fg))]"
    >
      will apply on save
    </span>
  )
}

export function SuggestionRow({
  suggestion,
  isPending,
  onAccept,
  onReject,
  onPreviewHover,
}: Props) {
  const { heuristic, selector, bp, rationale, confidence, property, value } =
    suggestion

  return (
    <div
      data-suggestion-id={suggestion.id}
      data-pending={isPending || undefined}
      // WP-036 Phase 1 — sidebar→iframe hover-highlight. Mouse-enter fires
      // selector to iframe IIFE which outlines the matching element; leave
      // clears. Optional handler — gracefully no-ops in test contexts that
      // don't pass the prop.
      onMouseEnter={onPreviewHover ? () => onPreviewHover(suggestion.selector) : undefined}
      onMouseLeave={onPreviewHover ? () => onPreviewHover(null) : undefined}
      className="flex flex-col gap-2 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] p-3"
    >
      <div className="flex items-center gap-2">
        <span
          data-role="heuristic"
          className="rounded bg-[hsl(var(--bg-page))] px-2 py-0.5 font-mono text-xs text-[hsl(var(--text-primary))]"
        >
          {heuristic}
        </span>
        <span className="text-xs text-[hsl(var(--text-muted))]">
          {bp === 0 ? 'base' : `@${bp}px`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {isPending && <PendingPill />}
          <ConfidencePill level={confidence} />
        </span>
      </div>

      <div className="font-mono text-xs text-[hsl(var(--text-primary))]">
        <span className="text-[hsl(var(--text-muted))]">{selector}</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      <p className="text-sm text-[hsl(var(--text-primary))]">{rationale}</p>

      <div className="flex gap-2">
        {isPending ? (
          <button
            type="button"
            data-action="undo"
            onClick={() => onReject(suggestion.id)}
            className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
          >
            Undo
          </button>
        ) : (
          <>
            <button
              type="button"
              data-action="accept"
              onClick={() => onAccept(suggestion.id)}
              className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-3 py-1 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80"
            >
              Accept
            </button>
            <button
              type="button"
              data-action="reject"
              onClick={() => onReject(suggestion.id)}
              className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] hover:border-[hsl(var(--status-error-fg))] hover:text-[hsl(var(--status-error-fg))]"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  )
}
