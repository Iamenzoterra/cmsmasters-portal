import type { ThemeMeta } from '@cmsmasters/db'
import { Button, Badge } from '@cmsmasters/ui'

export interface LicenseWithTheme {
  id: string
  purchase_code: string | null
  license_type: 'regular' | 'extended' | null
  support_until: string | null
  created_at: string
  themes: {
    id: string
    slug: string
    meta: ThemeMeta
    status: string
  } | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSupportStatus(supportUntil: string | null) {
  if (!supportUntil) {
    return { label: 'No support included', color: 'hsl(var(--text-muted))' }
  }
  if (new Date(supportUntil) > new Date()) {
    return {
      label: `Support until ${formatDate(supportUntil)}`,
      color: 'hsl(var(--status-success-fg))',
    }
  }
  return {
    label: `Support expired on ${formatDate(supportUntil)}`,
    color: 'hsl(var(--status-error-fg))',
  }
}

function getAction(license: LicenseWithTheme) {
  const themeforestUrl = license.themes?.meta?.themeforest_url ?? 'https://themeforest.net'

  if (!license.purchase_code) {
    return { label: 'Buy license on ThemeForest', variant: 'outline' as const, href: themeforestUrl }
  }
  if (license.support_until && new Date(license.support_until) > new Date()) {
    return { label: 'Extend support', variant: 'primary' as const, href: themeforestUrl }
  }
  return { label: 'Renew support', variant: 'primary' as const, href: themeforestUrl }
}

interface ThemeCardProps {
  license: LicenseWithTheme
}

export function ThemeCard({ license }: ThemeCardProps) {
  const theme = license.themes
  const themeName = theme?.meta?.name ?? 'Unknown Theme'
  const initial = themeName.charAt(0).toUpperCase()
  const isRegular = !!license.purchase_code
  const supportStatus = getSupportStatus(license.support_until)
  const action = getAction(license)

  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--card-bg))',
        border: '1px solid hsl(var(--card-border))',
        borderRadius: 'var(--rounded-xl)',
        padding: 'var(--spacing-md)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-md)',
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        style={{
          width: '80px',
          height: '80px',
          flexShrink: 0,
          borderRadius: 'var(--rounded-lg)',
          backgroundColor: 'hsl(var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-lg-font-size)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-secondary))',
        }}
      >
        {initial}
      </div>

      {/* Info block */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {/* Title + badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-2xs)',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {themeName}
          </span>
          <Badge
            roundness="round"
            style={{
              backgroundColor: isRegular
                ? 'hsl(var(--status-success-bg))'
                : 'hsl(var(--secondary))',
              color: isRegular
                ? 'hsl(var(--status-success-fg))'
                : 'hsl(var(--text-muted))',
              fontSize: '11px',
              lineHeight: '16px',
              fontWeight: 'var(--font-weight-medium)',
              paddingLeft: 'var(--spacing-xs)',
              paddingRight: 'var(--spacing-xs)',
              paddingTop: '2px',
              paddingBottom: '2px',
            }}
          >
            {isRegular ? 'Regular' : 'Elements'}
          </Badge>
        </div>

        {/* Meta lines */}
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            lineHeight: 'var(--text-xs-line-height)',
            color: 'hsl(var(--text-muted))',
          }}
        >
          Registered {formatDate(license.created_at)}
        </span>
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            lineHeight: 'var(--text-xs-line-height)',
            color: supportStatus.color,
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {supportStatus.label}
        </span>
      </div>

      {/* Actions block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 'var(--spacing-xs)',
          flexShrink: 0,
        }}
      >
        <Button variant={action.variant} size="sm" asChild>
          <a href={action.href} target="_blank" rel="noopener noreferrer">
            {action.label}
          </a>
        </Button>
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            lineHeight: 'var(--text-xs-line-height)',
            color: 'hsl(var(--text-muted))',
          }}
        >
          <a
            href="#"
            style={{
              color: 'hsl(var(--text-muted))',
              textDecoration: 'none',
            }}
          >
            Docs
          </a>
        </span>
      </div>
    </div>
  )
}
