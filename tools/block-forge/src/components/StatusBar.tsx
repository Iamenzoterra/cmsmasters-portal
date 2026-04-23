// Phase 4 — status bar pinned to the footer. Shows:
//   • source file path (mono, muted)
//   • "<N> pending" pill when session is dirty
//   • last-saved timestamp (or "never")
//   • inline save-error string
//   • Save button (enabled iff pending > 0 AND not in flight)
//
// Pure presentational — App.tsx owns the session + save handlers and passes
// them down as props. No effects, no state.

import type { SessionState } from '../lib/session'

type Props = {
  sourcePath: string | null
  session: SessionState
  onSave: () => void
  saveInFlight: boolean
  saveError: string | null
}

export function StatusBar({
  sourcePath,
  session,
  onSave,
  saveInFlight,
  saveError,
}: Props) {
  const pendingCount = session.pending.length
  const hasChanges = pendingCount > 0
  const lastSavedLabel = session.lastSavedAt
    ? new Date(session.lastSavedAt).toLocaleTimeString()
    : 'never'

  return (
    <div className="flex items-center gap-4 px-6 py-2">
      <span
        data-role="source-path"
        className="font-mono text-xs text-[hsl(var(--text-muted))]"
      >
        {sourcePath ?? '(no block selected)'}
      </span>

      {hasChanges && (
        <span
          data-role="pending-count"
          className="rounded-full bg-[hsl(var(--status-info-bg))] px-2 py-0.5 text-xs font-semibold text-[hsl(var(--status-info-fg))]"
        >
          {pendingCount} pending
        </span>
      )}

      <span
        data-role="last-saved"
        className="ml-auto text-xs text-[hsl(var(--text-muted))]"
      >
        Last saved: {lastSavedLabel}
      </span>

      {saveError && (
        <span
          data-role="save-error"
          className="text-xs text-[hsl(var(--status-error-fg))]"
        >
          {saveError}
        </span>
      )}

      <button
        type="button"
        data-action="save"
        disabled={!hasChanges || saveInFlight}
        onClick={onSave}
        className="rounded border border-[hsl(var(--status-success-fg))] bg-[hsl(var(--status-success-bg))] px-3 py-1 text-xs font-semibold text-[hsl(var(--status-success-fg))] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveInFlight ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
