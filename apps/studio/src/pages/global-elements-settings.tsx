import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Block } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { Plus, Star } from 'lucide-react'
import { fetchAllBlocks } from '../lib/block-api'

const CATEGORIES = [
  { value: 'header', label: 'Header', description: 'Top navigation and branding' },
  { value: 'footer', label: 'Footer', description: 'Bottom navigation and info' },
  { value: 'sidebar', label: 'Sidebar', description: 'Side panels for themes and layouts' },
] as const

export function GlobalElementsSettings() {
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllBlocks()
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false))
  }, [])

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    blocks: blocks.filter((b) => b.block_type === cat.value),
  }))

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--h3-font-size)', lineHeight: 'var(--h3-line-height)', fontWeight: 'var(--font-weight-bold)', color: 'hsl(var(--text-primary))' }}>
            Global Elements
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', lineHeight: 'var(--text-sm-line-height)', color: 'hsl(var(--text-secondary))' }}>
            Header, footer, and sidebar blocks. Set a default to auto-fill all pages, or override per layout.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col w-full" style={{ gap: 'var(--spacing-lg)' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse" style={{ height: '120px', backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }} />
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex flex-col w-full" style={{ gap: 'var(--spacing-2xl)' }}>
          {grouped.map((group) => (
            <div key={group.value} className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
              {/* Category header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ margin: 0, fontSize: 'var(--text-lg-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))', textTransform: 'capitalize' }}>
                    {group.label}
                  </h2>
                  <p style={{ margin: 0, fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
                    {group.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/global-elements/new?category=${group.value}`)}
                >
                  <Plus size={14} />
                  Create {group.label}
                </Button>
              </div>

              {/* Block list */}
              {group.blocks.length === 0 ? (
                <div
                  className="flex items-center justify-center border"
                  style={{
                    padding: 'var(--spacing-xl)',
                    borderColor: 'hsl(var(--border-default))',
                    borderRadius: 'var(--rounded-lg)',
                    borderStyle: 'dashed',
                  }}
                >
                  <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                    No {group.label.toLowerCase()} blocks yet
                  </p>
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
                  {group.blocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => navigate(`/global-elements/${block.id}`)}
                      className="flex w-full cursor-pointer items-center justify-between border text-left transition-shadow hover:shadow-sm"
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        borderColor: 'hsl(var(--card-border))',
                        borderRadius: 'var(--rounded-lg)',
                        backgroundColor: 'hsl(var(--card-bg))',
                      }}
                    >
                      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                        {/* Thumbnail */}
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
                      <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                        {block.is_default && (
                          <span className="flex items-center" style={{ gap: '3px', fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--status-success-fg))' }}>
                            <Star size={11} />
                            default
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
