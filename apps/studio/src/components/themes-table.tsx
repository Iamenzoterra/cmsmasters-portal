import type { Theme } from '@cmsmasters/db'
import { StatusBadge } from './status-badge'
import { timeAgo, formatPrice } from '../lib/format'

interface ThemesTableProps {
  themes: Theme[]
  onThemeClick: (slug: string) => void
}

const cellStyle: React.CSSProperties = {
  padding: 'var(--spacing-sm) var(--spacing-md)',
}

export function ThemesTable({ themes, onThemeClick }: ThemesTableProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr
          style={{
            borderBottom: '1px solid hsl(var(--border-default))',
          }}
        >
          {['Name', 'Category', 'Status', 'Price', 'Updated'].map((h) => (
            <th
              key={h}
              className="text-left"
              style={{
                ...cellStyle,
                fontSize: 'var(--text-xs-font-size)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {themes.map((theme) => (
          <tr
            key={theme.id}
            onClick={() => onThemeClick(theme.slug)}
            className="cursor-pointer transition-colors"
            style={{ borderBottom: '1px solid hsl(var(--border-default))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'hsl(var(--bg-surface-alt))'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = ''
            }}
          >
            <td style={{ ...cellStyle, fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
              {theme.meta.name}
            </td>
            <td style={{ ...cellStyle, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
              {theme.meta.category ?? '—'}
            </td>
            <td style={cellStyle}>
              <StatusBadge status={theme.status} />
            </td>
            <td style={{ ...cellStyle, fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
              {formatPrice(theme.meta.price ?? null)}
            </td>
            <td style={{ ...cellStyle, fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
              {timeAgo(theme.updated_at)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
