import type { Theme } from '@cmsmasters/db'
import { StatusBadge } from './status-badge'
import { timeAgo, formatPrice } from '../lib/format'

interface ThemeCardProps {
  theme: Theme
  onClick: () => void
}

export function ThemeCard({ theme, onClick }: ThemeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col items-start overflow-hidden border text-left transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'hsl(var(--card-bg))',
        borderColor: 'hsl(var(--card-border))',
        borderRadius: 'var(--rounded-xl)',
        boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.06)',
      }}
    >
      {/* Thumbnail */}
      <div
        className="flex w-full items-center justify-center overflow-hidden"
        style={{
          height: '225px',
          backgroundColor: 'hsl(var(--bg-surface-alt))',
        }}
      >
        {theme.thumbnail_url ? (
          <img
            src={theme.thumbnail_url}
            alt={theme.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            style={{
              fontSize: '32px',
              color: 'hsl(var(--text-muted))',
            }}
          >
            🖼
          </span>
        )}
      </div>

      {/* Content */}
      <div
        className="flex w-full flex-col"
        style={{
          padding: 'var(--spacing-md)',
          gap: 'var(--radius)',
        }}
      >
        {/* Title */}
        <p
          className="truncate"
          style={{
            fontSize: 'var(--text-base-font-size)',
            lineHeight: '24px',
            fontWeight: 600,
            color: 'hsl(var(--text-primary))',
            fontFamily: "'Manrope', sans-serif",
            margin: 0,
          }}
        >
          {theme.name}
        </p>

        {/* Tagline */}
        {theme.tagline && (
          <p
            className="truncate"
            style={{
              fontSize: 'var(--text-xs-font-size)',
              lineHeight: '18px',
              color: 'hsl(var(--text-secondary))',
              fontFamily: "'Manrope', sans-serif",
              margin: 0,
            }}
          >
            {theme.tagline}
          </p>
        )}

        {/* Tags row */}
        <div className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
          {theme.category && (
            <span
              className="shrink-0"
              style={{
                backgroundColor: 'hsl(var(--tag-inactive-bg))',
                border: '1px solid hsl(var(--tag-inactive-border))',
                borderRadius: '9999px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '16px',
                color: 'hsl(var(--tag-category-fg))',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {theme.category}
            </span>
          )}
          <StatusBadge status={theme.status} />
        </div>

        {/* Meta row */}
        <div className="flex w-full items-center justify-between">
          <span
            style={{
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {formatPrice(theme.price)}
          </span>
          <span
            style={{
              fontSize: '12px',
              lineHeight: 'var(--text-xs-line-height)',
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Updated {timeAgo(theme.updated_at)}
          </span>
        </div>
      </div>
    </button>
  )
}
