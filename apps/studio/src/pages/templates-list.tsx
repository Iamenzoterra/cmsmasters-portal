import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Template } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { LayoutTemplate, Plus, Search } from 'lucide-react'
import { fetchAllTemplates } from '../lib/template-api'
import { Pagination } from '../components/pagination'
import { timeAgo } from '../lib/format'

const ITEMS_PER_PAGE = 12

export function TemplatesList() {
  const navigate = useNavigate()

  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllTemplates()
      .then((data) => { if (!cancelled) setTemplates(data) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load templates') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  useEffect(() => { setPage(1) }, [search])

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.trim().toLowerCase()
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    )
  }, [templates, search])

  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredTemplates.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredTemplates, page])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))' }}>
          {error}
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1 style={{
            margin: 0,
            fontSize: 'var(--h3-font-size)',
            lineHeight: 'var(--h3-line-height)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'hsl(var(--text-primary))',
          }}>
            Templates
          </h1>
          {!loading && (
            <p style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              color: 'hsl(var(--text-secondary))',
            }}>
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate('/templates/new')}>
          <Plus size={16} />
          Create Template
        </Button>
      </div>

      {/* Search */}
      {!loading && templates.length > 0 && (
        <div className="relative w-full" style={{ maxWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: 'var(--spacing-sm)', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
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
      )}

      {/* Loading */}
      {loading && (
        <div className="grid w-full gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden"
              style={{ borderRadius: 'var(--rounded-xl)', backgroundColor: 'hsl(var(--bg-surface-alt))', height: '160px' }}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && templates.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
          <LayoutTemplate size={48} style={{ color: 'hsl(var(--text-muted))' }} />
          <h2 style={{ margin: 0, fontSize: 'var(--h4-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
            No templates yet
          </h2>
          <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
            Create your first template to define page layouts
          </p>
          <Button variant="primary" onClick={() => navigate('/templates/new')}>
            <Plus size={16} />
            Create Template
          </Button>
        </div>
      )}

      {/* No matches */}
      {!loading && templates.length > 0 && filteredTemplates.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-2 py-20 text-center">
          <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
            No templates match your search
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="border-0 bg-transparent"
            style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-link))', cursor: 'pointer', padding: 0 }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && paginatedTemplates.length > 0 && (
        <div className="grid w-full" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
          {paginatedTemplates.map((template) => {
            const filledCount = template.positions.filter((p) => p.block_id).length
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => navigate(`/templates/${template.id}`)}
                className="flex w-full cursor-pointer flex-col items-start overflow-hidden border text-left transition-shadow hover:shadow-md"
                style={{
                  backgroundColor: 'hsl(var(--card-bg))',
                  borderColor: 'hsl(var(--card-border))',
                  borderRadius: 'var(--rounded-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: 'var(--spacing-lg)',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <p className="truncate" style={{
                  fontSize: 'var(--text-base-font-size)',
                  lineHeight: '24px',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'hsl(var(--text-primary))',
                  margin: 0,
                  width: '100%',
                }}>
                  {template.name}
                </p>
                <p className="truncate" style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                  margin: 0,
                }}>
                  {template.slug}
                </p>

                {/* Position dots */}
                <div className="flex flex-wrap items-center" style={{ gap: '4px', marginTop: '4px' }}>
                  {Array.from({ length: template.max_positions }, (_, i) => {
                    const filled = template.positions.some((p) => p.position === i + 1 && p.block_id)
                    return (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: filled ? 'hsl(var(--text-primary))' : 'transparent',
                          border: filled ? 'none' : '1px solid hsl(var(--text-muted))',
                        }}
                      />
                    )
                  })}
                </div>

                <div className="flex w-full items-center justify-between" style={{ marginTop: '4px' }}>
                  <span style={{
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--text-secondary))',
                  }}>
                    {filledCount} / {template.max_positions} positions
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'hsl(var(--text-muted))',
                  }}>
                    Updated {timeAgo(template.updated_at)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredTemplates.length > 0 && (
        <Pagination
          page={page}
          totalItems={filteredTemplates.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          itemLabel="templates"
        />
      )}
    </>
  )
}
