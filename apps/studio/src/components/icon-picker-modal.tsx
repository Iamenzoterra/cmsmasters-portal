import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, X, Upload, Loader2, Plus } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchIcons, uploadIcon, deleteIcon } from '../lib/block-api'
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
  const [uploading, setUploading] = useState(false)
  const [uploadCategory, setUploadCategory] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchIcons()
      .then((cats) => {
        setCategories(cats)
        if (cats.length > 0 && !activeCategory) {
          setActiveCategory(null) // "All" tab
        }
      })
      .catch(() => toast({ type: 'error', message: 'Failed to load icons' }))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Flat list of all icons, filtered
  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase()
    let icons: IconItem[] = []

    if (activeCategory) {
      const cat = categories.find((c) => c.name === activeCategory)
      icons = cat?.icons ?? []
    } else {
      icons = categories.flatMap((c) => c.icons)
    }

    if (q) {
      icons = icons.filter((icon) =>
        icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q)
      )
    }

    return icons
  }, [categories, activeCategory, search])

  const effectiveUploadCategory = showNewCategory
    ? newCategoryName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : uploadCategory

  async function handleUpload(file: File) {
    if (!effectiveUploadCategory) {
      toast({ type: 'error', message: 'Select or create a category first' })
      return
    }

    setUploading(true)
    try {
      const url = await uploadIcon(file, effectiveUploadCategory)
      toast({ type: 'success', message: 'Icon uploaded' })
      // Refresh the list
      const cats = await fetchIcons()
      setCategories(cats)
      // Auto-select the uploaded icon
      onSelect(url)
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(icon: IconItem) {
    try {
      await deleteIcon(icon.category, icon.name)
      toast({ type: 'success', message: `Deleted ${icon.name}` })
      setCategories((prev) =>
        prev
          .map((cat) => cat.name === icon.category
            ? { ...cat, icons: cat.icons.filter((i) => i.key !== icon.key) }
            : cat
          )
          .filter((cat) => cat.icons.length > 0)
      )
      // If deleted icon was the current selection, clear it
      if (currentUrl === icon.url) {
        onRemove()
      }
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
    }
  }

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
          {/* Search */}
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

          {/* Category tabs */}
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
            <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
              {search.trim() ? 'No icons match your search.' : 'No icons uploaded yet. Use the upload section below.'}
            </p>
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
                    className="group relative flex flex-col items-center"
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
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                    title={`${icon.category}/${icon.name}`}
                  >
                    <img
                      src={icon.url}
                      alt={icon.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'contain',
                      }}
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
                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(icon)
                      }}
                      className="absolute flex items-center justify-center border-0 opacity-0 group-hover:opacity-100"
                      style={{
                        top: '2px',
                        right: '2px',
                        width: '18px',
                        height: '18px',
                        borderRadius: '9999px',
                        backgroundColor: 'hsl(var(--destructive))',
                        color: 'hsl(var(--destructive-foreground))',
                        cursor: 'pointer',
                        transition: 'opacity 150ms',
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upload Section */}
        <div
          className="flex shrink-0 flex-col"
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderTop: '1px solid hsl(var(--border-default))',
            gap: 'var(--spacing-sm)',
          }}
        >
          <span style={{
            fontSize: 'var(--text-xs-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-muted))',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Upload New Icon
          </span>

          <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
            {/* Category selector */}
            {!showNewCategory ? (
              <div className="flex items-center" style={{ gap: '4px', flex: 1 }}>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  style={{
                    height: '32px',
                    flex: 1,
                    backgroundColor: 'hsl(var(--input))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--rounded-lg)',
                    fontSize: 'var(--text-sm-font-size)',
                    color: 'hsl(var(--foreground))',
                    padding: '0 var(--spacing-sm)',
                  }}
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="flex shrink-0 items-center justify-center border-0 bg-transparent"
                  style={{ cursor: 'pointer', color: 'hsl(var(--text-muted))', width: '32px', height: '32px' }}
                  title="Create new category"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: '4px', flex: 1 }}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="new-category-name"
                  className="outline-none"
                  style={{
                    height: '32px',
                    flex: 1,
                    backgroundColor: 'hsl(var(--input))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--rounded-lg)',
                    fontSize: 'var(--text-sm-font-size)',
                    color: 'hsl(var(--foreground))',
                    padding: '0 var(--spacing-sm)',
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                  className="flex shrink-0 items-center justify-center border-0 bg-transparent"
                  style={{ cursor: 'pointer', color: 'hsl(var(--text-muted))', width: '32px', height: '32px' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.target.value = ''
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !effectiveUploadCategory}
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              <span style={{ marginLeft: '4px' }}>Upload SVG</span>
            </Button>
          </div>
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
