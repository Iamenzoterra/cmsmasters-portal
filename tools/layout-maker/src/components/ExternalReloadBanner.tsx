// Phase 6 — External-reload banner (Brain #4). Persistent notification that
// replaces the transient "Layout updated externally." toast. Auto-apply still
// fires upstream (setActiveConfig in App.tsx SSE handler); the banner only
// marks that it happened so long edit sessions don't miss the event.

interface Props {
  visible: boolean
  onDismiss: () => void
}

export function ExternalReloadBanner({ visible, onDismiss }: Props) {
  if (!visible) return null
  return (
    <div className="lm-banner lm-banner--info" role="status" aria-live="polite">
      <span className="lm-banner__text">Layout updated externally.</span>
      <button
        type="button"
        className="lm-banner__close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  )
}
