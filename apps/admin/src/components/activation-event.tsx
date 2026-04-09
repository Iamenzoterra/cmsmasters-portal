import { Link } from 'react-router-dom'
import { AvatarInitials } from './avatar-initials'
import { StatusBadge } from './status-badge'
import type { ActivityEntry } from '../lib/api'

interface ActivationEventProps {
  event: ActivityEntry
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

function getVerificationStatus(
  event: ActivityEntry,
): { label: string; variant: 'success' | 'warning' | 'neutral' } {
  const meta = event.metadata
  if (meta?.verified === true || event.action === 'license_verified')
    return { label: 'Verified', variant: 'success' }
  if (meta?.status === 'pending') return { label: 'Pending', variant: 'warning' }
  return { label: 'Self-declared', variant: 'neutral' }
}

export function ActivationEvent({ event }: ActivationEventProps) {
  const email = (event.metadata?.email as string) || event.user_id || 'Unknown'
  const themeName = event.theme_slug || (event.metadata?.theme_name as string) || ''
  const licenseType = (event.metadata?.license_type as string) || ''
  const source = (event.metadata?.source as string) || ''
  const price = (event.metadata?.price as string) || ''
  const status = getVerificationStatus(event)

  const metaParts = [licenseType, source, price, formatTime(event.created_at)].filter(Boolean)

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderBottom: '1px solid hsl(var(--card-border))',
      }}
    >
      <AvatarInitials name={null} email={email} size={32} />

      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
        <div
          className="flex items-center gap-1"
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
          }}
        >
          <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
            {email}
          </span>
          {themeName && (
            <>
              <span style={{ color: 'hsl(var(--text-muted))' }}>&rarr;</span>
              <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
                {themeName}
              </span>
            </>
          )}
        </div>
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            lineHeight: 'var(--text-xs-line-height)',
            color: 'hsl(var(--text-muted))',
          }}
        >
          {metaParts.join(' \u00B7 ')}
        </span>
      </div>

      <StatusBadge label={status.label} variant={status.variant} />

      {event.user_id && (
        <Link
          to={`/users/${event.user_id}`}
          style={{
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--text-muted))',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Open profile
        </Link>
      )}
    </div>
  )
}
