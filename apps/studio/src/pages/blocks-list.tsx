import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Block } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { Boxes, Plus, Search } from 'lucide-react'
import { fetchAllBlocks } from '../lib/block-api'
import { BlockPreview } from '../components/block-preview'
import { Pagination } from '../components/pagination'
import { timeAgo } from '../lib/format'

const ITEMS_PER_PAGE = 12

export function BlocksList() {
  const navigate = useNavigate()

  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchAllBlocks()
      .then((data) => {
        if (!cancelled) setBlocks(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load blocks')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => { setPage(1) }, [search])

  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return blocks
    const q = search.trim().toLowerCase()
    return blocks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    )
  }, [blocks, search])

  const paginatedBlocks = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredBlocks.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredBlocks, page])

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
            Blocks
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
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate('/blocks/new')}>
          <Plus size={16} />
          Create Block
        </Button>
      </div>

      {/* Search */}
      {!loading && blocks.length > 0 && (
        <div className="relative w-full" style={{ maxWidth: '320px' }}>
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
            placeholder="Search blocks..."
            className="w-full outline-none"
            style={{
              height: '36px',
              padding: '0 var(--spacing-sm) 0 calc(var(--spacing-sm) + 24px)',
              backgroundColor: 'hsl(var(--input))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--rounded-lg)',
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--foreground))',
              fontFamily: "'Manrope', sans-serif",
            }}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          className="grid w-full gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden"
              style={{
                borderRadius: 'var(--rounded-xl)',
                backgroundColor: 'hsl(var(--bg-surface-alt))',
                height: '280px',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && blocks.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
          <Boxes size={48} style={{ color: 'hsl(var(--text-muted))' }} />
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--h4-font-size)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            No blocks yet
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-secondary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Create your first block to get started
          </p>
          <Button variant="primary" onClick={() => navigate('/blocks/new')}>
            <Plus size={16} />
            Create Block
          </Button>
        </div>
      )}

      {/* No matches */}
      {!loading && blocks.length > 0 && filteredBlocks.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-2 py-20 text-center">
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            No blocks match your search
          </p>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="border-0 bg-transparent"
            style={{
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-link))',
              fontFamily: "'Manrope', sans-serif",
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {!loading && paginatedBlocks.length > 0 && (
        <div
          className="grid w-full"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--spacing-xl)',
          }}
        >
          {paginatedBlocks.map((block) => (
            <button
              key={block.id}
              type="button"
              onClick={() => navigate(`/blocks/${block.id}`)}
              className="flex w-full cursor-pointer flex-col items-start overflow-hidden border text-left transition-shadow hover:shadow-md"
              style={{
                backgroundColor: 'hsl(var(--card-bg))',
                borderColor: 'hsl(var(--card-border))',
                borderRadius: 'var(--rounded-xl)',
                boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.06)',
              }}
            >
              <BlockPreview html={block.html} css={block.css} height={160} />

              <div
                className="flex w-full flex-col"
                style={{ padding: 'var(--spacing-md)', gap: '4px' }}
              >
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
                  {block.name}
                </p>
                <p
                  className="truncate"
                  style={{
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--text-muted))',
                    fontFamily: "'Manrope', sans-serif",
                    margin: 0,
                  }}
                >
                  {block.slug}
                </p>
                <div className="flex w-full items-center justify-end">
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'hsl(var(--text-muted))',
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    Updated {timeAgo(block.updated_at)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredBlocks.length > 0 && (
        <Pagination
          page={page}
          totalItems={filteredBlocks.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setPage}
          itemLabel="blocks"
        />
      )}
    </>
  )
}
