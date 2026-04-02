import { useUser } from '@cmsmasters/auth'
import { supabase } from '../lib/supabase'

export function Topbar() {
  const { authState } = useUser(supabase)

  const initials =
    authState.status === 'authenticated'
      ? authState.email.slice(0, 2).toUpperCase()
      : ''

  const displayName =
    authState.status === 'authenticated'
      ? authState.email.split('@')[0]
      : ''

  return (
    <header
      className="flex shrink-0 items-center justify-between overflow-hidden border-b"
      style={{
        height: '56px',
        padding: '0 var(--spacing-lg)',
        borderColor: 'hsl(var(--border-default))',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      {/* Left: brand */}
      <div className="flex items-center" style={{ gap: 'var(--radius)' }}>
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            backgroundColor: 'hsl(var(--button-primary-bg))',
          }}
        >
          <span
            style={{
              color: 'hsl(var(--button-primary-fg))',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-bold)',
            }}
          >
            C
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
          }}
        >
          Content Studio
        </span>
      </div>

      {/* Right: user */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '15px',
            backgroundColor: 'hsl(var(--bg-surface-alt))',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-muted))',
            }}
          >
            {initials}
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--caption-font-size)',
            lineHeight: 'var(--caption-line-height)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'hsl(var(--text-secondary))',
          }}
        >
          {displayName}
        </span>
      </div>
    </header>
  )
}
