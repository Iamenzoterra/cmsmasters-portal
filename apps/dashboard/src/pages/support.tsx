export function Support() {
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
        Support
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-2xs)',
        }}
      >
        Get help with your CMSMasters themes
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
          Support tickets will be available soon. For urgent issues, please contact us at{' '}
          <a
            href="mailto:support@cmsmasters.net"
            style={{
              color: 'hsl(var(--text-link))',
              fontWeight: 'var(--font-weight-medium)',
              textDecoration: 'none',
            }}
          >
            support@cmsmasters.net
          </a>
        </p>
      </div>
    </div>
  )
}
