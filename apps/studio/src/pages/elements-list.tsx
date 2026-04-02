import { Component } from 'lucide-react'

export function ElementsList() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
      <Component size={48} style={{ color: 'hsl(var(--text-muted))' }} />
      <h2
        style={{
          margin: 0,
          fontSize: 'var(--h4-font-size)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
        }}
      >
        Elements
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          maxWidth: '360px',
        }}
      >
        Page-level building blocks will be managed here. Coming soon.
      </p>
    </div>
  )
}
