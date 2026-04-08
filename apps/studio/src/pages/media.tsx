import { useState, useEffect, useRef } from 'react'
import { Upload, Loader2, X, Search, Plus, Trash2 } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchIcons, uploadIcon, deleteIcon } from '../lib/block-api'
import type { IconItem, IconCategory } from '../lib/block-api'
import { StyledSelect } from '../components/styled-select'
import { useToast } from '../components/toast'

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'hsl(var(--text-muted))',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

export function MediaPage() {
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

  function loadIcons() {
    setLoading(true)
    fetchIcons()
      .then(setCategories)
      .catch(() => toast({ type: 'error', message: 'Failed to load icons' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadIcons() }, []) // load once on mount

  const totalIcons = categories.reduce((sum, c) => sum + c.icons.length, 0)

  const filteredIcons = (() => {
    const q = search.trim().toLowerCase()
    const base = activeCategory
      ? (categories.find((c) => c.name === activeCategory)?.icons ?? [])
      : categories.flatMap((c) => c.icons)
    if (!q) return base
    return base.filter((icon) =>
      icon.name.toLowerCase().includes(q) || icon.category.toLowerCase().includes(q)
    )
  })()

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
      await uploadIcon(file, effectiveUploadCategory)
      toast({ type: 'success', message: `Uploaded ${file.name}` })
      loadIcons()
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
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col" style={{ gap: '2px' }}>
          <h1 style={{
            fontSize: 'var(--text-lg-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
            margin: 0,
          }}>
            Icons
          </h1>
          <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
            {totalIcons} icon{totalIcons !== 1 ? 's' : ''} in {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      </div>

      {/* Upload bar */}
      <div
        className="flex items-center"
        style={{
          padding: 'var(--spacing-md)',
          backgroundColor: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 'var(--rounded-xl)',
          gap: 'var(--spacing-sm)',
        }}
      >
        <span style={labelStyle}>Upload</span>

        {!showNewCategory ? (
          <div className="flex items-center" style={{ gap: '4px', flex: 1, maxWidth: '300px' }}>
            <StyledSelect
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">Category...</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </StyledSelect>
            <button
              type="button"
              onClick={() => setShowNewCategory(true)}
              className="flex shrink-0 items-center justify-center border-0 bg-transparent"
              style={{ cursor: 'pointer', color: 'hsl(var(--text-muted))', width: '32px', height: '32px' }}
              title="New category"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center" style={{ gap: '4px', flex: 1, maxWidth: '300px' }}>
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

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files
            if (files) {
              Array.from(files).forEach((f) => handleUpload(f))
            }
            e.target.value = ''
          }}
        />
        <Button
          variant="primary"
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

      {/* Search + category filter */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
        <div className="relative" style={{ flex: 1, maxWidth: '320px' }}>
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
              All ({totalIcons})
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

      {/* Icon grid */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: 'var(--spacing-2xl)' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'hsl(var(--text-muted))' }} />
        </div>
      ) : filteredIcons.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center"
          style={{
            padding: 'var(--spacing-2xl)',
            border: '2px dashed hsl(var(--border-default))',
            borderRadius: 'var(--rounded-xl)',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Upload size={32} style={{ color: 'hsl(var(--text-muted))' }} />
          <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
            {search.trim() ? 'No icons match your search.' : 'No icons yet. Upload SVG files above.'}
          </span>
        </div>
      ) : (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 'var(--spacing-sm)',
          }}
        >
          {filteredIcons.map((icon) => (
            <div
              key={icon.key}
              className="group relative flex flex-col items-center"
              style={{
                padding: 'var(--spacing-md) var(--spacing-sm)',
                borderRadius: 'var(--rounded-lg)',
                border: '1px solid hsl(var(--border-default))',
                backgroundColor: 'hsl(var(--bg-surface))',
                gap: 'var(--spacing-xs)',
                transition: 'border-color 150ms',
              }}
            >
              <img
                src={icon.url}
                alt={icon.name}
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
              />
              <span
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-secondary))',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
                title={icon.name}
              >
                {icon.name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  color: 'hsl(var(--text-muted))',
                }}
              >
                {icon.category}
              </span>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(icon)}
                className="absolute flex items-center justify-center border-0 opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: 'var(--rounded-lg)',
                  backgroundColor: 'hsl(var(--destructive))',
                  color: 'hsl(var(--destructive-foreground))',
                  cursor: 'pointer',
                }}
                title="Delete icon"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
