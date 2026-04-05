import { useState, useEffect, useMemo } from 'react'
import { Search, X, Star } from 'lucide-react'
import { Button } from '@cmsmasters/ui'

interface TaxonomyPickerItem {
  id: string
  name: string
  slug: string
}

interface SelectedItem {
  id: string
  is_primary: boolean
}

interface TaxonomyPickerModalProps {
  title: string
  items: TaxonomyPickerItem[]
  selected: SelectedItem[]
  showPrimary?: boolean
  /** When true, only one item can be selected at a time */
  singleSelect?: boolean
  onSave: (selected: SelectedItem[]) => void
  onClose: () => void
}

export function TaxonomyPickerModal({ title, items, selected, showPrimary = false, singleSelect = false, onSave, onClose }: TaxonomyPickerModalProps) {
  const [draft, setDraft] = useState<SelectedItem[]>(() => selected.map((s) => ({ ...s })))
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const selectedIds = useMemo(() => new Set(draft.map((s) => s.id)), [draft])

  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (selectedIds.has(item.id)) return false
      if (!q) return true
      return item.name.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    })
  }, [items, selectedIds, search])

  function addItem(id: string) {
    if (singleSelect) {
      setDraft([{ id, is_primary: false }])
    } else {
      setDraft((prev) => [...prev, { id, is_primary: false }])
    }
  }

  function removeItem(id: string) {
    setDraft((prev) => prev.filter((s) => s.id !== id))
  }

  function togglePrimary(id: string) {
    setDraft((prev) => prev.map((s) => s.id === id ? { ...s, is_primary: !s.is_primary } : s))
  }

  function getItemName(id: string) {
    return items.find((i) => i.id === id)?.name ?? id
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
          width: '560px',
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
            {title}
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
              className="pointer-events-none absolute top-1/2 -translate-y-1/2"
              style={{ left: '10px', color: 'hsl(var(--text-muted))' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          {/* Selected */}
          {draft.length > 0 && (
            <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <span style={{ fontSize: 'var(--text-xs-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Selected ({draft.length})
              </span>
              <div className="flex flex-wrap" style={{ gap: 'var(--spacing-xs)' }}>
                {draft.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center"
                    style={{
                      backgroundColor: 'hsl(var(--tag-active-bg))',
                      color: 'hsl(var(--tag-active-fg))',
                      borderRadius: '9999px',
                      padding: '4px 8px 4px 10px',
                      fontSize: '12px',
                      fontWeight: 'var(--font-weight-medium)',
                      gap: '4px',
                    }}
                  >
                    {showPrimary && (
                      <button
                        type="button"
                        onClick={() => togglePrimary(s.id)}
                        className="flex items-center border-0 bg-transparent p-0"
                        style={{ cursor: 'pointer', color: s.is_primary ? 'hsl(var(--status-warn-fg))' : 'hsl(var(--tag-active-fg))', opacity: s.is_primary ? 1 : 0.4 }}
                        title={s.is_primary ? 'Primary (visible on page)' : 'Not primary (AI/search only)'}
                      >
                        <Star size={12} fill={s.is_primary ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    {getItemName(s.id)}
                    <button
                      type="button"
                      onClick={() => removeItem(s.id)}
                      className="flex items-center border-0 bg-transparent p-0"
                      style={{ color: 'hsl(var(--tag-active-fg))', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available */}
          <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
            <span style={{ fontSize: 'var(--text-xs-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Available ({available.length})
            </span>
            {available.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                {search.trim() ? 'No matches found.' : 'All items selected.'}
              </p>
            ) : (
              <div className="flex flex-wrap" style={{ gap: 'var(--spacing-xs)' }}>
                {available.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item.id)}
                    className="inline-flex items-center border-0"
                    style={{
                      backgroundColor: 'hsl(var(--bg-surface-alt))',
                      color: 'hsl(var(--text-secondary))',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                    }}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex shrink-0 items-center justify-end"
          style={{
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderTop: '1px solid hsl(var(--border-default))',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(draft)}>Save</Button>
        </div>
      </div>
    </div>
  )
}
