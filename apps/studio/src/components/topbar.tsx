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
              fontWeight: 700,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            C
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontWeight: 600,
            color: 'hsl(var(--text-primary))',
            fontFamily: "'Manrope', sans-serif",
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
              fontWeight: 600,
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {initials}
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--caption-font-size)',
            lineHeight: 'var(--caption-line-height)',
            fontWeight: 500,
            color: 'hsl(var(--text-secondary))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {displayName}
        </span>
      </div>
    </header>
  )
}
