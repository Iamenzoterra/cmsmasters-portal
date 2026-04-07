import { useState, useEffect } from 'react'
import type { Block } from '@cmsmasters/db'
import { Search, X, Boxes } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchAllBlocks } from '../lib/block-api'
import { BlockPreview } from './block-preview'

interface BlockPickerModalProps {
  onSelect: (block: Block) => void
  onClose: () => void
  excludeIds?: string[]
  filterCategory?: string
}

export function BlockPickerModal({ onSelect, onClose, excludeIds = [], filterCategory }: BlockPickerModalProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    fetchAllBlocks()
      .then(setBlocks)
      .catch(() => setBlocks([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = blocks
    .filter((b) => !excludeIds.includes(b.id))
    .filter((b) => {
      if (filterCategory) return b.block_type === filterCategory
      return !b.block_type || b.block_type === 'element'
    })
    .filter((b) => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'hsl(var(--black-alpha-60))' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          width: '800px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          backgroundColor: 'hsl(var(--bg-surface))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'modalIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            height: '48px',
            padding: '0 var(--spacing-lg)',
            borderBottom: '1px solid hsl(var(--border-default))',
          }}
        >
          <span style={{
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
          }}>
            Select a Block
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center border-0 bg-transparent"
            style={{ width: '32px', height: '32px', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg) 0' }}>
          <div className="relative w-full">
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
              }}
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-md) var(--spacing-lg) var(--spacing-lg)' }}>
          {loading && (
            <p style={{
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
              padding: 'var(--spacing-xl) 0',
            }}>
              Loading blocks...
            </p>
          )}

          {!loading && blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3" style={{ padding: 'var(--spacing-xl) 0' }}>
              <Boxes size={36} style={{ color: 'hsl(var(--text-muted))' }} />
              <p style={{
                fontSize: 'var(--text-sm-font-size)',
                color: 'hsl(var(--text-muted))',
                margin: 0,
              }}>
                No blocks in library
              </p>
              <Button variant="outline" size="sm" onClick={() => { onClose(); window.location.href = '/blocks/new' }}>
                Create a Block
              </Button>
            </div>
          )}

          {!loading && blocks.length > 0 && filtered.length === 0 && (
            <p style={{
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
              padding: 'var(--spacing-xl) 0',
            }}>
              No blocks match your search
            </p>
          )}

          {!loading && filtered.length > 0 && (
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}
            >
              {filtered.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => onSelect(block)}
                  className="flex cursor-pointer flex-col overflow-hidden border text-left transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: 'hsl(var(--card-bg))',
                    borderColor: 'hsl(var(--card-border))',
                    borderRadius: 'var(--rounded-lg)',
                  }}
                >
                  {(block.metadata as Record<string, unknown>)?.thumbnail_url ? (
                    <img
                      src={(block.metadata as Record<string, unknown>).thumbnail_url as string}
                      alt={block.name}
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                    />
                  ) : (
                    <BlockPreview html={block.html} css={block.css} height={120} zoom={4} />
                  )}
                  <div style={{ padding: 'var(--spacing-sm)' }}>
                    <p
                      className="truncate"
                      style={{
                        fontSize: 'var(--text-sm-font-size)',
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'hsl(var(--text-primary))',
                        margin: 0,
                      }}
                    >
                      {block.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
