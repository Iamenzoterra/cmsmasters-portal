import type { ThemeStatus } from '@cmsmasters/db'

/**
 * TODO token sync: --status-success-fg is 118 45% 89% (too light for text).
 * Figma uses #218721. Replace this fallback once token is fixed.
 */
const PUBLISHED_TEXT_FALLBACK = '#218721'

const variants: Record<ThemeStatus, { bg: string; fg: string; dot: string }> = {
  draft: {
    bg: 'hsl(var(--status-warn-bg))',
    fg: 'hsl(var(--status-warn-fg))',
    dot: 'hsl(var(--status-warn-fg))',
  },
  published: {
    bg: 'hsl(var(--status-success-bg))',
    fg: PUBLISHED_TEXT_FALLBACK,
    dot: PUBLISHED_TEXT_FALLBACK,
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
        fontWeight: 600,
        lineHeight: '16px',
        fontFamily: "'Manrope', sans-serif",
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
