// Phase 4 — status bar pinned to the footer. Shows:
//   • source file path (mono, muted)
//   • "<N> pending" pill when session is dirty
//   • last-saved timestamp (or "never")
//   • inline save-error string
//   • Save button (enabled iff pending > 0 AND not in flight)
//
// Pure presentational — App.tsx owns the session + save handlers and passes
// them down as props. No effects, no state.

import { isDirty, type SessionState } from '../lib/session'

type Props = {
  sourcePath: string | null
  session: SessionState
  onSave: () => void
  onExport: () => void
  onClone: () => void
  cloneInFlight: boolean
  saveInFlight: boolean
  saveError: string | null
}

export function StatusBar({
  sourcePath,
  session,
  onSave,
  onExport,
  onClone,
  cloneInFlight,
  saveInFlight,
  saveError,
}: Props) {
  const pendingCount = session.pending.length
  // Save enables on any dirty state (suggestions, tweaks, or variants) —
  // `session.pending` alone missed tweaks (Phase 2) and variants (Phase 3+4).
  // The pending-count pill still reflects suggestion queue specifically.
  const hasChanges = isDirty(session)
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
        data-action="clone"
        disabled={!sourcePath || cloneInFlight || saveInFlight}
        onClick={onClone}
        className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs font-semibold text-[hsl(var(--text-default))] hover:bg-[hsl(var(--bg-surface-alt))] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cloneInFlight ? 'Cloning…' : '+ Clone'}
      </button>

      <button
        type="button"
        data-action="export"
        disabled={!sourcePath}
        onClick={onExport}
        className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-xs font-semibold text-[hsl(var(--text-default))] hover:bg-[hsl(var(--bg-surface-alt))] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export
      </button>

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
