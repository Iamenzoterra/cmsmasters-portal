import { Search, LayoutGrid, List, Plus } from 'lucide-react'
import { Button } from '@cmsmasters/ui'

interface ThemesToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  viewMode: 'grid' | 'table'
  onViewModeChange: (mode: 'grid' | 'table') => void
  onCreateClick: () => void
}

const inputStyle: React.CSSProperties = {
  height: '40px',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 'var(--text-sm-font-size)',
  lineHeight: 'var(--text-sm-line-height)',
  color: 'hsl(var(--foreground))',
}

export function ThemesToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewMode,
  onViewModeChange,
  onCreateClick,
}: ThemesToolbarProps) {
  return (
    <div className="flex w-full items-center" style={{ gap: 'var(--spacing-sm)' }}>
      {/* Search */}
      <div className="relative shrink-0" style={{ width: '300px' }}>
        <Search
          size={16}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          style={{ left: '12px', color: 'hsl(var(--text-muted))' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search themes..."
          className="w-full outline-none"
          style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '12px' }}
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="shrink-0 appearance-none outline-none"
        style={{
          ...inputStyle,
          width: '160px',
          paddingLeft: 'var(--spacing-md)',
          paddingRight: 'var(--spacing-xs)',
        }}
      >
        <option value="all">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View toggle */}
      <div className="flex shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          className="flex items-center justify-center"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: viewMode === 'grid' ? 'hsl(var(--button-primary-bg))' : 'transparent',
            color: viewMode === 'grid' ? 'hsl(var(--button-primary-fg))' : 'hsl(var(--text-muted))',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('table')}
          className="flex items-center justify-center"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: viewMode === 'table' ? 'hsl(var(--button-primary-bg))' : 'transparent',
            color: viewMode === 'table' ? 'hsl(var(--button-primary-fg))' : 'hsl(var(--text-muted))',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <List size={16} />
        </button>
      </div>

      {/* Create */}
      <Button variant="primary" onClick={onCreateClick}>
        <Plus size={16} />
        Create Theme
      </Button>
    </div>
  )
}
