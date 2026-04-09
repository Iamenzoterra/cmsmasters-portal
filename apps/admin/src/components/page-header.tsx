interface PageHeaderProps {
  title: string
  subtitle: string
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between" style={{ marginBottom: 'var(--spacing-xl)' }}>
      <div>
        <h1
          style={{
            fontSize: 'var(--h2-font-size)',
            lineHeight: 'var(--h2-line-height)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
            margin: 0,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-secondary))',
            margin: 0,
            marginTop: 'var(--spacing-2xs)',
          }}
        >
          {subtitle}
        </p>
      </div>
      {children && <div className="flex items-center">{children}</div>}
    </div>
  )
}
