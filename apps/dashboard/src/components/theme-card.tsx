import type { ThemeMeta } from '@cmsmasters/db'
import { Button, Badge } from '@cmsmasters/ui'

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'https://portal.cmsmasters.studio'

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
    has_portal_page: boolean
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

interface Action {
  label: string
  variant: 'primary' | 'outline'
  href: string
  external: boolean
}

function getAction(license: LicenseWithTheme): Action {
  const theme = license.themes
  const themeforestUrl = theme?.meta?.themeforest_url ?? 'https://themeforest.net'

  // "New" theme: has a portal page that's published → link to the portal.
  if (
    theme?.has_portal_page &&
    theme.status === 'published' &&
    theme.slug
  ) {
    return {
      label: 'Open theme page',
      variant: 'primary',
      href: `${PORTAL_URL}/themes/${theme.slug}`,
      external: false,
    }
  }

  // Legacy or unpromoted theme: fall back to ThemeForest.
  if (!license.purchase_code) {
    return {
      label: 'Buy license on ThemeForest',
      variant: 'outline',
      href: themeforestUrl,
      external: true,
    }
  }
  if (license.support_until && new Date(license.support_until) > new Date()) {
    return { label: 'Extend support', variant: 'primary', href: themeforestUrl, external: true }
  }
  return { label: 'Renew support', variant: 'primary', href: themeforestUrl, external: true }
}

interface ThemeCardProps {
  license: LicenseWithTheme
}

export function ThemeCard({ license }: ThemeCardProps) {
  const theme = license.themes
  const themeName = theme?.meta?.name ?? 'Unknown Theme'
  const thumbnailUrl = theme?.meta?.thumbnail_url ?? theme?.meta?.icon_url ?? null
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
      {/* Thumbnail (Envato preview or letter fallback) */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={themeName}
          style={{
            width: '80px',
            height: '80px',
            flexShrink: 0,
            borderRadius: 'var(--rounded-lg)',
            objectFit: 'cover',
            backgroundColor: 'hsl(var(--secondary))',
          }}
        />
      ) : (
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
      )}

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
          <a
            href={action.href}
            {...(action.external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
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
