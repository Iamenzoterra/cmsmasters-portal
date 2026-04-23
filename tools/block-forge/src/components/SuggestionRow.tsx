// Phase 3 — single suggestion row: heuristic badge, selector, BP,
// rationale, confidence pill, disabled Accept / Reject (Phase 4 wires).
//
// Token grep gate passed at write time (all 8 tokens present in tokens.css):
//   --status-success-bg/-fg, --status-info-bg/-fg, --bg-surface, --bg-page,
//   --text-primary, --text-muted, --border-default.
//
// ConfidencePill uses inline `style={{ backgroundColor, color }}` — the token
// pair is runtime-driven by the `level` prop, so this is the escape hatch the
// CONVENTIONS doc allows for truly dynamic styling.

import type { Suggestion, Confidence } from '@cmsmasters/block-forge-core'

type Props = {
  suggestion: Suggestion
}

// Confidence → token mapping.
// No `--status-warning-*` exists in tokens.css, so `medium` borrows info.
// `low` uses neutral surface + muted text — quieter than info.
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

export function SuggestionRow({ suggestion }: Props) {
  const { heuristic, selector, bp, rationale, confidence, property, value } =
    suggestion

  return (
    <div
      data-suggestion-id={suggestion.id}
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
        <span className="ml-auto">
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
        <button
          type="button"
          disabled
          title="Phase 4 — accept/reject wiring pending"
          className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Accept
        </button>
        <button
          type="button"
          disabled
          title="Phase 4 — accept/reject wiring pending"
          className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs text-[hsl(var(--text-muted))] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
