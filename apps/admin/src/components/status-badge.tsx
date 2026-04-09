type BadgeVariant = 'success' | 'info' | 'warning' | 'error' | 'neutral'

const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: 'hsl(var(--status-success-bg))', color: 'hsl(var(--status-success-fg))' },
  info: { bg: 'hsl(var(--status-info-bg))', color: 'hsl(var(--status-info-fg))' },
  warning: { bg: 'hsl(var(--status-warn-bg))', color: 'hsl(var(--status-warn-fg))' },
  error: { bg: 'hsl(var(--status-error-bg))', color: 'hsl(var(--status-error-fg))' },
  neutral: { bg: 'hsl(var(--secondary))', color: 'hsl(var(--text-muted))' },
}

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  const style = variantStyles[variant]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: 'var(--text-xs-font-size)',
        lineHeight: 'var(--text-xs-line-height)',
        fontWeight: 'var(--font-weight-medium)',
        backgroundColor: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

/** Map common role/status strings to badge variants */
export function roleBadgeVariant(
  role: string,
): BadgeVariant {
  switch (role) {
    case 'admin':
      return 'success'
    case 'content_manager':
      return 'info'
    case 'support_operator':
      return 'warning'
    case 'licensed':
      return 'success'
    case 'verified':
      return 'success'
    case 'self-declared':
      return 'neutral'
    case 'pending':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function actionBadgeVariant(action: string): BadgeVariant {
  if (action.includes('grant') || action.includes('create') || action.includes('verified'))
    return 'success'
  if (action.includes('revoke') || action.includes('delete')) return 'error'
  if (action.includes('publish') || action.includes('update')) return 'warning'
  return 'neutral'
}
