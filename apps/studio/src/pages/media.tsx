import { Link } from 'react-router-dom'
import { ChevronLeft, Upload, Info } from 'lucide-react'

export function MediaPage() {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xl)' }}>
      {/* Breadcrumb header */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
        <Link
          to="/"
          className="flex items-center no-underline"
          style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}
        >
          <ChevronLeft size={18} />
          <span style={{ fontSize: 'var(--text-sm-font-size)' }}>
            Themes
          </span>
        </Link>
        <span style={{ color: 'hsl(var(--text-muted))' }}>/</span>
        <span
          style={{
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
          }}
        >
          Media Library
        </span>
      </div>

      {/* Info card */}
      <div
        style={{
          backgroundColor: 'hsl(var(--status-info-bg))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-lg)',
        }}
      >
        <div className="flex items-start" style={{ gap: 'var(--spacing-sm)' }}>
          <Info size={20} style={{ color: 'hsl(var(--status-info-fg))', flexShrink: 0, marginTop: '2px' }} />
          <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
            <p
              style={{
                fontSize: 'var(--text-sm-font-size)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'hsl(var(--text-primary))',
                margin: 0,
              }}
            >
              Media uploads coming soon
            </p>
            <p
              style={{
                fontSize: 'var(--text-sm-font-size)',
                color: 'hsl(var(--text-secondary))',
                margin: 0,
              }}
            >
              Direct file upload via Cloudflare R2 is under development. In the meantime, you can
              enter image URLs directly in the theme editor fields (hero screenshots, thumbnails, etc.).
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--spacing-md)',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center"
            style={{
              height: '200px',
              border: '2px dashed hsl(var(--border-default))',
              borderRadius: 'var(--rounded-xl)',
              gap: 'var(--spacing-xs)',
            }}
          >
            <Upload size={24} style={{ color: 'hsl(var(--text-muted))' }} />
            <span
              style={{
                fontSize: 'var(--text-sm-font-size)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              Drop files here
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
