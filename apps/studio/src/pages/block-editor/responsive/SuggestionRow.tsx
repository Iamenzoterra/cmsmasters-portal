// WP-027 Phase 4 — un-gated SuggestionRow with onAccept/onReject handlers + PendingPill.
//
// Structural mirror of tools/block-forge/src/components/SuggestionRow.tsx.
// Phase 3 disabled the Accept/Reject buttons; Phase 4 enables them and adds a
// "will apply on save" pill shown next to the confidence pill when the suggestion
// is in the pending-accept set (parity with WP-026 reference L59-68).
//
// Field shape verified against packages/block-forge-core/src/lib/types.ts:41-50:
//   { id, heuristic, selector, bp: number, property, value, rationale, confidence }
// `bp` is always number; bp === 0 means "base" (no media-maxwidth), matches reference L93.
// Labels lowercase; CSS text-transform handles uppercase display (reference L33, L38, L43).

import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

interface SuggestionRowProps {
  suggestion: Suggestion
  onAccept: (id: string) => void
  onReject: (id: string) => void
  /** Visual state — suggestion is accepted locally but not yet saved to DB. */
  isPending: boolean
  /** WP-036 Phase 1 — fires on hover-enter (selector) and hover-leave (null). */
  onPreviewHover?: (selector: string | null) => void
}

// Confidence → token mapping verbatim from tools/block-forge/src/components/SuggestionRow.tsx:26-45.
// Medium maps to --status-info-* (not --status-warn-*) — cross-surface parity.
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

// WP-027 Phase 4 — mirrors WP-026 reference SuggestionRow.tsx:59-68 pending-pill pattern.
function PendingPill() {
  return (
    <span
      data-role="pending-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px var(--spacing-xs)',
        borderRadius: 'var(--rounded-full)',
        backgroundColor: 'hsl(var(--status-info-bg))',
        color: 'hsl(var(--status-info-fg))',
        fontSize: 'var(--text-xs-font-size)',
        fontWeight: 'var(--font-weight-semibold)',
      }}
    >
      will apply on save
    </span>
  )
}

export function SuggestionRow({
  suggestion,
  onAccept,
  onReject,
  isPending,
  onPreviewHover,
}: SuggestionRowProps) {
  const { id, heuristic, selector, bp, property, value, rationale, confidence } = suggestion

  return (
    <div
      data-suggestion-id={id}
      // WP-036 Phase 1 — sidebar→iframe hover-highlight (Studio mirror of
      // tools/block-forge/src/components/SuggestionRow.tsx). Optional handler —
      // no-ops gracefully when prop omitted (test contexts).
      onMouseEnter={onPreviewHover ? () => onPreviewHover(selector) : undefined}
      onMouseLeave={onPreviewHover ? () => onPreviewHover(null) : undefined}
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
      {/* Header: heuristic tag + bp label + (pending-pill when applicable) + confidence pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
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
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 'var(--spacing-xs)' }}>
          {isPending && <PendingPill />}
          <ConfidencePill level={confidence} />
        </span>
      </div>

      {/* Actionable CSS line — core of the suggestion */}
      <div
        style={{
          // ds-lint-ignore — CSS snippet rendered verbatim; monospace required
          fontFamily: 'var(--font-family-monospace)',
          fontSize: 'var(--text-xs-font-size)',
          color: 'hsl(var(--text-primary))',
        }}
      >
        <span style={{ color: 'hsl(var(--text-muted))' }}>{selector}</span>
        {' { '}
        {property}: {value};
        {' }'}
      </div>

      {/* Rationale */}
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-primary))',
        }}
      >
        {rationale}
      </p>

      {/* Accept/Reject — enabled in Phase 4; dispatch to session-state via parent callbacks. */}
      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-2xs)' }}>
        <button
          type="button"
          data-action="accept"
          onClick={() => onAccept(id)}
          aria-label="Accept suggestion"
          style={{
            padding: '4px var(--spacing-sm)',
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
          onClick={() => onReject(id)}
          aria-label="Reject suggestion"
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
          Reject
        </button>
      </div>
    </div>
  )
}
