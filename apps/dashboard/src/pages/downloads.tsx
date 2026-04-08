export function Downloads() {
  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--h4-font-size)',
          lineHeight: 'var(--h4-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        Downloads
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-2xs)',
        }}
      >
        Download your licensed themes and resources
      </p>

      <div
        style={{
          marginTop: 'var(--spacing-2xl)',
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-xl)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-secondary))',
            margin: 0,
          }}
        >
          Theme downloads will be available in a future update. For now, download your themes
          directly from{' '}
          <a
            href="https://themeforest.net/downloads"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'hsl(var(--text-link))',
              fontWeight: 'var(--font-weight-medium)',
              textDecoration: 'none',
            }}
          >
            ThemeForest
          </a>
        </p>
      </div>
    </div>
  )
}
