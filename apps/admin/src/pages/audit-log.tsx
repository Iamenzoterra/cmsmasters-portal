export default function AuditLog() {
  return (
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
        Audit Log
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
        System-wide action history
      </p>
    </div>
  )
}
