export function Settings() {
  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--h3-font-size)',
          lineHeight: 'var(--h3-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        Settings
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-sm)',
        }}
      >
        Account settings and preferences will appear here.
      </p>
    </div>
  )
}
