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
      className="inline-flex items-center shrink-0"
      style={{
        backgroundColor: v.bg,
        borderRadius: '9999px',
        padding: '6px',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          backgroundColor: v.dot,
          flexShrink: 0,
        }}
      />
    </span>
  )
}
