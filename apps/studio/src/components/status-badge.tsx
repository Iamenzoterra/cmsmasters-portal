import type { ThemeStatus } from '@cmsmasters/db'

const variants: Record<ThemeStatus, { bg: string; fg: string; dot: string }> = {
  draft: {
    bg: 'hsl(var(--status-warn-bg))',
    fg: 'hsl(var(--status-warn-fg))',
    dot: 'hsl(var(--status-warn-fg))',
  },
  published: {
    bg: 'hsl(var(--status-success-bg))',
    fg: 'hsl(var(--status-success-fg))',
    dot: 'hsl(var(--status-success-fg))',
  },
  archived: {
    bg: 'hsl(var(--bg-surface-alt))',
    fg: 'hsl(var(--text-muted))',
    dot: 'hsl(var(--text-muted))',
  },
}

interface StatusBadgeProps {
  status: ThemeStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const v = variants[status]

  return (
    <span
      className="inline-flex items-center gap-[5px] shrink-0"
      style={{
        backgroundColor: v.bg,
        color: v.fg,
        borderRadius: '9999px',
        padding: '3px 10px',
        fontSize: '12px',
        fontWeight: 'var(--font-weight-semibold)',
        lineHeight: '16px',
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '9999px',
          backgroundColor: v.dot,
          flexShrink: 0,
        }}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
