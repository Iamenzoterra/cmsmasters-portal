import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Page } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { FileText, Plus, Search, Eye } from 'lucide-react'
import { StyledSelect } from '../components/styled-select'
import { fetchAllPages } from '../lib/page-api'
import { Pagination } from '../components/pagination'
import { timeAgo } from '../lib/format'

const ITEMS_PER_PAGE = 12

const typeBadgeColors: Record<string, { bg: string; fg: string }> = {
  layout: { bg: 'hsl(var(--tag-info-bg))', fg: 'hsl(var(--tag-info-fg))' },
  composed: { bg: 'hsl(var(--tag-success-bg))', fg: 'hsl(var(--tag-success-fg))' },
}

const statusColors: Record<string, string> = {
  draft: 'hsl(var(--text-muted))',
  published: 'hsl(var(--status-success-fg))',
  archived: 'hsl(var(--text-secondary))',
}

interface PagesListProps {
  filterType?: 'layout' | 'composed'
  title?: string
  createLabel?: string
  createPath?: string
  editPath?: string
}

export function PagesList({
  filterType,
  title = 'Pages',
  createLabel = 'Create Page',
  createPath = '/pages/new',
  editPath = '/pages',
}: PagesListProps = {}) {
  const navigate = useNavigate()

  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>(filterType ?? 'all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllPages()
      .then((data) => {
        if (!cancelled) setPages(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load pages')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => { setPage(1) }, [search, typeFilter])

  const filteredPages = useMemo(() => {
    let result = pages
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      )
    }
    return result
  }, [pages, search, typeFilter])

  const paginatedPages = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredPages.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredPages, page])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--status-error-fg))',
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
              fontWeight: 'var(--font-weight-bold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {title}
          </h1>
          {!loading && (
            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm-font-size)',
                lineHeight: 'var(--text-sm-line-height)',
                color: 'hsl(var(--text-secondary))',
              }}
            >
              {pages.length} page{pages.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate(createPath)}>
          <Plus size={16} />
          {createLabel}
        </Button>
      </div>

      {/* Search + Filter */}
      {!loading && pages.length > 0 && (
        <div className="flex w-full items-center" style={{ gap: 'var(--spacing-md)' }}>
          <div className="relative" style={{ maxWidth: '320px', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 'var(--spacing-sm)',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'hsl(var(--text-muted))',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages..."
              className="w-full outline-none"
              style={{
                height: '36px',
                padding: '0 var(--spacing-sm) 0 calc(var(--spacing-sm) + 24px)',
                backgroundColor: 'hsl(var(--input))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--rounded-lg)',
                fontSize: 'var(--text-sm-font-size)',
                color: 'hsl(var(--foreground))',
              }}
            />
          </div>
          {!filterType && (
            <StyledSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="layout">Layout</option>
              <option value="composed">Composed</option>
            </StyledSelect>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex w-full flex-col" style={{ gap: 'var(--spacing-sm)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                borderRadius: 'var(--rounded-lg)',
                backgroundColor: 'hsl(var(--bg-surface-alt))',
                height: '56px',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && pages.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
          <FileText size={48} style={{ color: 'hsl(var(--text-muted))' }} />
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--h4-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            No {title.toLowerCase()} yet
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            Create your first page to get started
          </p>
          <Button variant="primary" onClick={() => navigate(createPath)}>
            <Plus size={16} />
            Create Page
          </Button>
        </div>
      )}

      {/* No matches */}
      {!loading && pages.length > 0 && filteredPages.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-2 py-20 text-center">
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-muted))',
            }}
          >
            No pages match your search
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setTypeFilter('all') }}
            className="border-0 bg-transparent"
            style={{
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-link))',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && paginatedPages.length > 0 && (
        <div
          className="w-full overflow-hidden border"
          style={{
            borderColor: 'hsl(var(--border-default))',
            borderRadius: 'var(--rounded-xl)',
            backgroundColor: 'hsl(var(--bg-surface))',
          }}
        >
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid hsl(var(--border-default))',
                }}
              >
                {['Title', 'Slug', ...(filterType ? [] : ['Type']), 'Status', 'Updated', ...(filterType === 'layout' ? ['Preview'] : [])].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      fontSize: 'var(--text-xs-font-size)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'hsl(var(--text-muted))',
                      textAlign: 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedPages.map((p) => {
                const badge = typeBadgeColors[p.type] ?? typeBadgeColors.composed
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`${editPath}/${p.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderBottom: '1px solid hsl(var(--border-default))',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--bg-surface-alt))' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <td
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: 'var(--text-sm-font-size)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'hsl(var(--text-primary))',
                      }}
                    >
                      {p.title}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      {p.slug}
                    </td>
                    {!filterType && (
                      <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--rounded-full)',
                            fontSize: 'var(--text-xs-font-size)',
                            fontWeight: 'var(--font-weight-medium)',
                            backgroundColor: badge.bg,
                            color: badge.fg,
                          }}
                        >
                          {p.type}
                        </span>
                      </td>
                    )}
                    <td
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: 'var(--text-xs-font-size)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: statusColors[p.status] ?? 'hsl(var(--text-muted))',
                        textTransform: 'capitalize',
                      }}
                    >
                      {p.status}
                    </td>
                    <td
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      {timeAgo(p.updated_at)}
                    </td>
                    {filterType === 'layout' && (
                      <td
                        style={{
                          padding: 'var(--spacing-sm) var(--spacing-md)',
                          width: '1%',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/layouts/${p.id}/preview`, '_blank', 'noopener,noreferrer')
                          }}
                          className="inline-flex items-center border"
                          style={{
                            gap: '4px',
                            height: '28px',
                            padding: '0 var(--spacing-sm)',
                            borderRadius: 'var(--rounded-md)',
                            borderColor: 'hsl(var(--border-default))',
                            backgroundColor: 'hsl(var(--bg-surface))',
                            color: 'hsl(var(--text-link))',
                            fontSize: 'var(--text-xs-font-size)',
                            fontWeight: 'var(--font-weight-medium)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={12} />
                          Preview
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredPages.length > 0 && (
        <Pagination
          page={page}
          totalItems={filteredPages.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          itemLabel="pages"
        />
      )}
    </>
  )
}
