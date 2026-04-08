import { useState, useEffect, useMemo } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@cmsmasters/ui'
import { fetchIcons } from '../lib/block-api'
import type { IconItem, IconCategory } from '../lib/block-api'
import { useToast } from './toast'

interface IconPickerModalProps {
  currentUrl?: string
  onSelect: (url: string) => void
  onRemove: () => void
  onClose: () => void
}

export function IconPickerModal({ currentUrl, onSelect, onRemove, onClose }: IconPickerModalProps) {
  const [categories, setCategories] = useState<IconCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchIcons()
      .then(setCategories)
      .catch(() => toast({ type: 'error', message: 'Failed to load icons' }))
      .finally(() => setLoading(false))
  }, []) // load once on mount

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = activeCategory
      ? (categories.find((c) => c.name === activeCategory)?.icons ?? [])
      : categories.flatMap((c) => c.icons)

    if (!q) return base

    return base.filter((icon: IconItem) =>
      icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q)
    )
  }, [categories, activeCategory, search])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'hsl(var(--black-alpha-60))' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          width: '640px',
          maxWidth: '90vw',
          maxHeight: '85vh',
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
            Select Icon
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

        {/* Search + Category Tabs */}
        <div className="flex shrink-0 flex-col" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', gap: 'var(--spacing-sm)' }}>
          <div className="relative w-full">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ left: '10px', color: 'hsl(var(--text-muted))' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons..."
              className="w-full outline-none"
              style={{
                height: '36px',
                paddingLeft: '32px',
                paddingRight: 'var(--spacing-sm)',
                backgroundColor: 'hsl(var(--input))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--rounded-lg)',
                fontSize: 'var(--text-sm-font-size)',
                color: 'hsl(var(--foreground))',
              }}
              autoFocus
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap" style={{ gap: '4px' }}>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="inline-flex items-center border-0"
                style={{
                  backgroundColor: activeCategory === null ? 'hsl(var(--tag-active-bg))' : 'hsl(var(--bg-surface-alt))',
                  color: activeCategory === null ? 'hsl(var(--tag-active-fg))' : 'hsl(var(--text-secondary))',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: 'pointer',
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  className="inline-flex items-center border-0"
                  style={{
                    backgroundColor: activeCategory === cat.name ? 'hsl(var(--tag-active-bg))' : 'hsl(var(--bg-surface-alt))',
                    color: activeCategory === cat.name ? 'hsl(var(--tag-active-fg))' : 'hsl(var(--text-secondary))',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 'var(--font-weight-medium)',
                    cursor: 'pointer',
                  }}
                >
                  {cat.name} ({cat.icons.length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 var(--spacing-lg) var(--spacing-md)' }}>
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: 'var(--spacing-2xl)' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--text-muted))' }} />
            </div>
          ) : filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-sm)', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                {search.trim() ? 'No icons match your search.' : 'No icons uploaded yet.'}
              </p>
              {!search.trim() && (
                <Link
                  to="/media/icons"
                  onClick={onClose}
                  style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--ring))' }}
                >
                  Go to Media &rarr; Icons to upload
                </Link>
              )}
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 'var(--spacing-sm)',
              }}
            >
              {filteredIcons.map((icon) => {
                const isSelected = currentUrl === icon.url
                return (
                  <div
                    key={icon.key}
                    className="flex flex-col items-center"
                    style={{
                      padding: 'var(--spacing-sm)',
                      borderRadius: 'var(--rounded-lg)',
                      border: isSelected
                        ? '2px solid hsl(var(--ring))'
                        : '2px solid transparent',
                      backgroundColor: isSelected
                        ? 'hsl(var(--tag-active-bg))'
                        : 'transparent',
                      cursor: 'pointer',
                      gap: '4px',
                      transition: 'background-color 150ms, border-color 150ms',
                    }}
                    onClick={() => onSelect(icon.url)}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--bg-surface-alt))'
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? 'hsl(var(--tag-active-bg))' : 'transparent'
                    }}
                    title={`${icon.category}/${icon.name}`}
                  >
                    <img
                      src={icon.url}
                      alt={icon.name}
                      style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                    />
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'hsl(var(--text-muted))',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      {icon.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderTop: '1px solid hsl(var(--border-default))',
          }}
        >
          <div>
            {currentUrl && (
              <Button variant="ghost" size="sm" onClick={() => { onRemove(); onClose() }}>
                Remove Icon
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
