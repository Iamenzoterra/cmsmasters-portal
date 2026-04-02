import { useEffect } from 'react'

interface DeleteConfirmModalProps {
  title: string
  itemName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ title, itemName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'hsl(var(--black-alpha-40))',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 150ms ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        style={{
          width: '420px',
          backgroundColor: 'hsl(var(--bg-surface))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, hsl(var(--status-error-fg)), hsl(var(--status-error-fg) / 0.4))',
        }} />

        <div style={{ padding: 'var(--spacing-xl) var(--spacing-xl) var(--spacing-lg)' }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'var(--font-weight-bold)',
            color: 'hsl(var(--text-primary))',
            letterSpacing: '-0.01em',
          }}>
            {title}
          </h3>
          <p style={{
            margin: 'var(--spacing-sm) 0 0',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: '1.5',
            color: 'hsl(var(--text-secondary))',
          }}>
            <strong style={{ color: 'hsl(var(--text-primary))' }}>{itemName}</strong> will be permanently removed. This cannot be undone.
          </p>
        </div>

        <div
          className="flex items-center justify-end"
          style={{
            padding: 'var(--spacing-md) var(--spacing-xl)',
            gap: 'var(--spacing-sm)',
            borderTop: '1px solid hsl(var(--border-default))',
            backgroundColor: 'hsl(var(--bg-surface-alt) / 0.5)',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="border-0 bg-transparent"
            style={{
              padding: 'var(--spacing-xs) var(--spacing-md)',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'hsl(var(--text-secondary))',
              cursor: 'pointer',
              borderRadius: 'var(--rounded-lg)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: 'var(--spacing-xs) var(--spacing-lg)',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'white',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 'var(--rounded-lg)',
              backgroundColor: 'hsl(var(--status-error-fg))',
              transition: 'filter 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none' }}
          >
            Delete
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
