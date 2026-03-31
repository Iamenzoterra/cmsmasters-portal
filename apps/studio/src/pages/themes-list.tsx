import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Theme } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { Palette, Plus } from 'lucide-react'
import { fetchAllThemes } from '../lib/queries'
import { ThemesToolbar } from '../components/themes-toolbar'
import { ThemeCard } from '../components/theme-card'
import { ThemesTable } from '../components/themes-table'
import { Pagination } from '../components/pagination'

const ITEMS_PER_PAGE = 12

export function ThemesList() {
  const navigate = useNavigate()

  // ── State (page owns all) ──
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [page, setPage] = useState(1)

  // ── Fetch (single fetch point — Task B) ──
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllThemes()
      .then((data) => {
        if (!cancelled) setThemes(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load themes')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  // ── M5: reset page on filter/search change ──
  useEffect(() => { setPage(1) }, [search, statusFilter])

  // ── Derived pipeline (Task D): allThemes → filtered → paginated ──
  const filteredThemes = useMemo(() => {
    let result = themes

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((t) => t.meta.name.toLowerCase().includes(q))
    }

    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter)
    }

    return result
  }, [themes, search, statusFilter])

  const paginatedThemes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredThemes.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredThemes, page])

  // ── M1: error state (fetch failed / RLS) ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--status-error-fg))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {error}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--h3-font-size)',
              lineHeight: 'var(--h3-line-height)',
              fontWeight: 700,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Themes
          </h1>
          {!loading && (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm-font-size)',
                lineHeight: 'var(--text-sm-line-height)',
                color: 'hsl(var(--text-secondary))',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {themes.length} theme{themes.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate('/themes/new')}>
          <Plus size={16} />
          Create Theme
        </Button>
      </div>

      {/* Toolbar */}
      <ThemesToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => navigate('/themes/new')}
      />

      {/* Loading skeleton */}
      {loading && (
        <div
          className="grid w-full gap-6"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden"
              style={{
                borderRadius: 'var(--rounded-xl)',
                backgroundColor: 'hsl(var(--bg-surface-alt))',
                height: '371px',
              }}
            />
          ))}
        </div>
      )}

      {/* M1: empty state — fetch succeeded but DB has no themes */}
      {!loading && themes.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
          <Palette size={48} style={{ color: 'hsl(var(--text-muted))' }} />
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--h4-font-size)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            No themes yet
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-secondary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Create your first theme to get started
          </p>
          <Button variant="primary" onClick={() => navigate('/themes/new')}>
            <Plus size={16} />
            Create Theme
          </Button>
        </div>
      )}

      {/* M1: no matches — fetch succeeded, themes exist, but filter yields 0 */}
      {!loading && themes.length > 0 && filteredThemes.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-2 py-20 text-center">
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            No themes match your filters
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setStatusFilter('all') }}
            className="border-0 bg-transparent"
            style={{
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-link))',
              fontFamily: "'Manrope', sans-serif",
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* M7: grid and table consume same paginatedThemes */}
      {!loading && paginatedThemes.length > 0 && viewMode === 'grid' && (
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-xl)',
          }}
        >
          {paginatedThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onClick={() => navigate(`/themes/${theme.slug}`)}
            />
          ))}
        </div>
      )}

      {!loading && paginatedThemes.length > 0 && viewMode === 'table' && (
        <ThemesTable
          themes={paginatedThemes}
          onThemeClick={(slug) => navigate(`/themes/${slug}`)}
        />
      )}

      {/* Pagination */}
      {!loading && filteredThemes.length > 0 && (
        <Pagination
          page={page}
          totalItems={filteredThemes.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          itemLabel="themes"
        />
      )}
    </>
  )
}
