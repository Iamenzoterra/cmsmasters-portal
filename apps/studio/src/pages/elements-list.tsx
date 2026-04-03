import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Block } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { Plus, Component, Star } from 'lucide-react'
import { fetchAllBlocks } from '../lib/block-api'

export function ElementsList() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllBlocks()
      .then((all) => setBlocks(all.filter((b) => b.category === 'element')))
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--h3-font-size)', lineHeight: 'var(--h3-line-height)', fontWeight: 'var(--font-weight-bold)', color: 'hsl(var(--text-primary))' }}>
            Elements
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
            Page sections — hero, pricing, features, testimonials. Used in composed pages and element slots.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/elements/new?category=element')}>
          <Plus size={16} />
          Create Element
        </Button>
      </div>

      {loading && (
        <div className="grid w-full" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: '160px', backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }} />
          ))}
        </div>
      )}

      {!loading && blocks.length === 0 && (
        <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
          <Component size={48} style={{ color: 'hsl(var(--text-muted))' }} />
          <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
            No elements yet. Create your first page section.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/elements/new?category=element')}>
            <Plus size={14} />
            Create Element
          </Button>
        </div>
      )}

      {!loading && blocks.length > 0 && (
        <div className="flex w-full flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          {blocks.map((block) => (
            <button
              key={block.id}
              type="button"
              onClick={() => navigate(`/elements/${block.id}`)}
              className="flex w-full cursor-pointer items-center justify-between border text-left transition-shadow hover:shadow-sm"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderColor: 'hsl(var(--card-border))',
                borderRadius: 'var(--rounded-lg)',
                backgroundColor: 'hsl(var(--card-bg))',
              }}
            >
              <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                {(block.metadata as Record<string, unknown>)?.thumbnail_url ? (
                  <img
                    src={(block.metadata as Record<string, unknown>).thumbnail_url as string}
                    alt={block.name}
                    style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: 'var(--rounded-sm)', border: '1px solid hsl(var(--border-default))' }}
                  />
                ) : (
                  <div style={{ width: '48px', height: '32px', borderRadius: 'var(--rounded-sm)', backgroundColor: 'hsl(var(--bg-surface-alt))' }} />
                )}
                <div>
                  <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-medium)', color: 'hsl(var(--text-primary))' }}>
                    {block.name}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', marginLeft: 'var(--spacing-xs)' }}>
                    {block.slug}
                  </span>
                </div>
              </div>
              {block.is_default && (
                <span className="flex items-center" style={{ gap: '3px', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--status-success-fg))' }}>
                  <Star size={11} />
                  default
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
