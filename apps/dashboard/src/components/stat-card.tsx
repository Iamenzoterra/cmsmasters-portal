interface StatCardProps {
  label: string
  value: string
  sub: string
  muted?: boolean
}

export function StatCard({ label, value, sub, muted }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: muted ? 'hsl(var(--secondary))' : 'hsl(var(--card-bg))',
        border: '1px solid hsl(var(--card-border))',
        borderRadius: 'var(--rounded-xl)',
        padding: 'var(--spacing-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-2xs)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--text-xs-font-size)',
          lineHeight: 'var(--text-xs-line-height)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'hsl(var(--text-muted))',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 'var(--text-lg-font-size)',
          lineHeight: 'var(--text-lg-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: muted ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))',
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 'var(--text-xs-font-size)',
          lineHeight: 'var(--text-xs-line-height)',
          color: 'hsl(var(--text-muted))',
        }}
      >
        {sub}
      </span>
    </div>
  )
}
