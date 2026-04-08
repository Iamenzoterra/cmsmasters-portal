import type { Entitlements } from '@cmsmasters/auth'

type StatusColor = 'success' | 'warn' | 'error' | 'muted'

interface Capability {
  name: string
  status: string
  statusColor: StatusColor
  description: string
}

const STATUS_COLORS: Record<StatusColor, string> = {
  success: 'hsl(var(--status-success-fg))',
  warn: 'hsl(var(--status-warn-fg))',
  error: 'hsl(var(--status-error-fg))',
  muted: 'hsl(var(--text-muted))',
}

function getCapabilities(e: Entitlements): Capability[] {
  return [
    {
      name: 'Theme documentation',
      status: e.licensedThemes.length > 0 || e.isElementsSubscriber ? 'Available' : 'Not available',
      statusColor: e.licensedThemes.length > 0 || e.isElementsSubscriber ? 'success' : 'error',
      description: 'For your registered themes',
    },
    {
      name: 'Theme updates',
      status: e.licensedThemes.length > 0 ? 'Available' : 'Not available',
      statusColor: e.licensedThemes.length > 0 ? 'success' : 'error',
      description: 'For verified ThemeForest licenses',
    },
    {
      name: 'Support tickets',
      status:
        e.activeSupport.length > 0
          ? `Available (${e.activeSupport.length})`
          : 'Not available',
      statusColor: e.activeSupport.length > 0 ? 'success' : 'error',
      description:
        e.activeSupport.length > 0
          ? `${e.activeSupport.length} theme${e.activeSupport.length > 1 ? 's' : ''} with active support period`
          : 'No themes with active support',
    },
    {
      name: 'Bundled plugins',
      status: e.licensedThemes.length > 0 ? 'Partially available' : 'Not available',
      statusColor: e.licensedThemes.length > 0 ? 'warn' : 'error',
      description: 'Depends on the theme you registered',
    },
    {
      name: 'Premium resources',
      status: 'Not included',
      statusColor: 'error',
      description: 'Requires CMSMasters subscription',
    },
    {
      name: 'Elements access',
      status: e.isElementsSubscriber ? 'Active' : 'Inactive',
      statusColor: e.isElementsSubscriber ? 'warn' : 'muted',
      description: e.isElementsSubscriber
        ? 'Public resources only, no support or auto-updates'
        : 'Not active on your account',
    },
  ]
}

interface CapabilitiesTableProps {
  entitlements: Entitlements
}

export function CapabilitiesTable({ entitlements }: CapabilitiesTableProps) {
  const capabilities = getCapabilities(entitlements)

  return (
    <div>
      <h2
        style={{
          fontSize: 'var(--text-base-font-size)',
          lineHeight: 'var(--text-base-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        What's included
      </h2>

      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
        }}
      >
        {capabilities.map((cap, i) => (
          <div
            key={cap.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderBottom:
                i < capabilities.length - 1
                  ? '1px solid hsl(var(--card-border))'
                  : 'none',
            }}
          >
            <span
              style={{
                width: '200px',
                flexShrink: 0,
                fontSize: 'var(--text-sm-font-size)',
                lineHeight: 'var(--text-sm-line-height)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'hsl(var(--text-primary))',
              }}
            >
              {cap.name}
            </span>
            <span
              style={{
                width: '160px',
                flexShrink: 0,
                fontSize: 'var(--text-xs-font-size)',
                lineHeight: 'var(--text-xs-line-height)',
                fontWeight: 'var(--font-weight-medium)',
                color: STATUS_COLORS[cap.statusColor],
              }}
            >
              {cap.status}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 'var(--text-xs-font-size)',
                lineHeight: 'var(--text-xs-line-height)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              {cap.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
