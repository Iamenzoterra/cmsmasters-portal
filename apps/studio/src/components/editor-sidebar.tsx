import { useState } from 'react'
import type { Control, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { useController } from 'react-hook-form'
import { Star } from 'lucide-react'
import { StatusSelect } from './status-select'
import { TaxonomyPickerModal } from './taxonomy-picker-modal'
import { ThumbnailUpload } from './thumbnail-upload'
import { useToast } from './toast'
import { uploadFile } from '../lib/block-api'
import { timeAgo } from '../lib/format'

interface EditorSidebarProps {
  control: Control<ThemeFormData>
  watch: UseFormWatch<ThemeFormData>
  setValue: UseFormSetValue<ThemeFormData>
  existingTheme: Theme | null
  allCategories: Array<{ id: string; name: string; slug: string }>
  allTags: Array<{ id: string; name: string; slug: string }>
  selectedCategories: Array<{ id: string; is_primary: boolean }>
  selectedTags: string[]
  onCategoriesChange: (items: Array<{ id: string; is_primary: boolean }>) => void
  onTagsChange: (ids: string[]) => void
  allPrices: Array<{ id: string; name: string; slug: string; type: string }>
  selectedRegularPriceId: string | null
  selectedDiscountPriceId: string | null
  onRegularPriceChange: (id: string | null) => void
  onDiscountPriceChange: (id: string | null) => void
  authorName?: string
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'hsl(var(--text-muted))',

  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

export function EditorSidebar({ control, watch, setValue, existingTheme, allCategories, allTags, selectedCategories, selectedTags, onCategoriesChange, onTagsChange, allPrices, selectedRegularPriceId, selectedDiscountPriceId, onRegularPriceChange, onDiscountPriceChange, authorName }: EditorSidebarProps) {
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [regularPricePickerOpen, setRegularPricePickerOpen] = useState(false)
  const [discountPricePickerOpen, setDiscountPricePickerOpen] = useState(false)
  const thumbnailUrl = watch('meta.thumbnail_url')
  const { toast } = useToast()

  const { field: statusField } = useController({ control, name: 'status' })

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-xl)',
        backgroundColor: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-xl)',
      }}
    >
      {/* Thumbnail */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Thumbnail</span>
        <ThumbnailUpload
          url={thumbnailUrl ?? ''}
          onUpload={async (file) => {
            const url = await uploadFile(file)
            setValue('meta.thumbnail_url', url, { shouldDirty: true })
            toast({ type: 'success', message: 'Thumbnail uploaded' })
          }}
          onRemove={() => setValue('meta.thumbnail_url', '', { shouldDirty: true })}
          onError={(msg) => toast({ type: 'error', message: msg })}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Status</span>
        <StatusSelect value={statusField.value} onChange={statusField.onChange} />
      </div>

      {/* Categories */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <div className="flex items-center justify-between">
          <span style={labelStyle}>Categories</span>
          <button
            type="button"
            onClick={() => setCatPickerOpen(true)}
            style={{
              height: '28px',
              padding: '0 var(--spacing-sm)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-secondary))',
              backgroundColor: 'transparent',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-md)',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
        {selectedCategories.length === 0 ? (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>None selected</span>
        ) : (
          <div className="flex flex-wrap" style={{ gap: '4px' }}>
            {selectedCategories.slice(0, 3).map((s) => {
              const cat = allCategories.find((c) => c.id === s.id)
              if (!cat) return null
              return (
                <span
                  key={s.id}
                  className="inline-flex items-center"
                  style={{
                    backgroundColor: 'hsl(var(--tag-active-bg))',
                    color: 'hsl(var(--tag-active-fg))',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                    gap: '3px',
                  }}
                >
                  {s.is_primary && <Star size={10} fill="currentColor" />}
                  {cat.name}
                </span>
              )
            })}
            {selectedCategories.length > 3 && (
              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', alignSelf: 'center' }}>
                +{selectedCategories.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <div className="flex items-center justify-between">
          <span style={labelStyle}>Tags</span>
          <button
            type="button"
            onClick={() => setTagPickerOpen(true)}
            style={{
              height: '28px',
              padding: '0 var(--spacing-sm)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-secondary))',
              backgroundColor: 'transparent',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-md)',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
        {selectedTags.length === 0 ? (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>None selected</span>
        ) : (
          <div className="flex flex-wrap" style={{ gap: '4px' }}>
            {selectedTags.slice(0, 3).map((id) => {
              const tag = allTags.find((t) => t.id === id)
              if (!tag) return null
              return (
                <span
                  key={id}
                  className="inline-flex items-center"
                  style={{
                    backgroundColor: 'hsl(var(--bg-surface-alt))',
                    color: 'hsl(var(--text-secondary))',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {tag.name}
                </span>
              )
            })}
            {selectedTags.length > 3 && (
              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))', alignSelf: 'center' }}>
                +{selectedTags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Category picker modal */}
      {catPickerOpen && (
        <TaxonomyPickerModal
          title="Select Categories"
          items={allCategories}
          selected={selectedCategories}
          showPrimary
          onSave={(items) => { onCategoriesChange(items); setCatPickerOpen(false) }}
          onClose={() => setCatPickerOpen(false)}
        />
      )}

      {/* Tag picker modal */}
      {tagPickerOpen && (
        <TaxonomyPickerModal
          title="Select Tags"
          items={allTags}
          selected={selectedTags.map((id) => ({ id, is_primary: false }))}
          onSave={(items) => { onTagsChange(items.map((i) => i.id)); setTagPickerOpen(false) }}
          onClose={() => setTagPickerOpen(false)}
        />
      )}

      {/* Price */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
        <span style={labelStyle}>Price</span>

        {/* Regular price row */}
        <div className="flex items-center justify-between" style={{ minHeight: '28px' }}>
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>Regular</span>
          {selectedRegularPriceId ? (
            <div className="flex items-center" style={{ gap: '6px' }}>
              <span
                className="inline-flex items-center"
                style={{
                  backgroundColor: 'hsl(var(--tag-active-bg))',
                  color: 'hsl(var(--tag-active-fg))',
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: '0.02em',
                }}
              >
                ${allPrices.find((p) => p.id === selectedRegularPriceId)?.name ?? '?'}
              </span>
              <button
                type="button"
                onClick={() => setRegularPricePickerOpen(true)}
                style={{
                  fontSize: '11px',
                  color: 'hsl(var(--text-muted))',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRegularPricePickerOpen(true)}
              style={{
                height: '24px',
                padding: '0 var(--spacing-sm)',
                fontSize: '11px',
                color: 'hsl(var(--text-secondary))',
                backgroundColor: 'transparent',
                border: '1px solid hsl(var(--border-default))',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
              }}
            >
              Select
            </button>
          )}
        </div>

        {/* Discount price row */}
        <div className="flex items-center justify-between" style={{ minHeight: '28px' }}>
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>Discount</span>
          {selectedDiscountPriceId ? (
            <div className="flex items-center" style={{ gap: '6px' }}>
              <span
                className="inline-flex items-center"
                style={{
                  backgroundColor: 'hsl(var(--status-success-bg, var(--tag-active-bg)))',
                  color: 'hsl(var(--status-success-fg, var(--tag-active-fg)))',
                  borderRadius: '9999px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: '0.02em',
                }}
              >
                ${allPrices.find((p) => p.id === selectedDiscountPriceId)?.name ?? '?'}
              </span>
              <button
                type="button"
                onClick={() => setDiscountPricePickerOpen(true)}
                style={{
                  fontSize: '11px',
                  color: 'hsl(var(--text-muted))',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                change
              </button>
              <button
                type="button"
                onClick={() => onDiscountPriceChange(null)}
                style={{
                  fontSize: '11px',
                  color: 'hsl(var(--text-muted))',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  lineHeight: 1,
                }}
                title="Remove discount"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDiscountPricePickerOpen(true)}
              style={{
                height: '24px',
                padding: '0 var(--spacing-sm)',
                fontSize: '11px',
                color: 'hsl(var(--text-muted))',
                backgroundColor: 'transparent',
                border: '1px dashed hsl(var(--border-default))',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
              }}
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Price picker modals */}
      {regularPricePickerOpen && (
        <TaxonomyPickerModal
          title="Select Regular Price"
          items={allPrices.filter((p) => p.type === 'normal')}
          selected={selectedRegularPriceId ? [{ id: selectedRegularPriceId, is_primary: false }] : []}
          singleSelect
          onSave={(items) => { onRegularPriceChange(items[0]?.id ?? null); setRegularPricePickerOpen(false) }}
          onClose={() => setRegularPricePickerOpen(false)}
        />
      )}
      {discountPricePickerOpen && (
        <TaxonomyPickerModal
          title="Select Discount Price"
          items={allPrices.filter((p) => p.type === 'discount')}
          selected={selectedDiscountPriceId ? [{ id: selectedDiscountPriceId, is_primary: false }] : []}
          singleSelect
          onSave={(items) => { onDiscountPriceChange(items[0]?.id ?? null); setDiscountPricePickerOpen(false) }}
          onClose={() => setDiscountPricePickerOpen(false)}
        />
      )}

      {/* Separator */}
      <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />

      {/* Meta */}
      {existingTheme && (
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          <span style={labelStyle}>Meta</span>
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <MetaRow label="Created" value={new Date(existingTheme.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={timeAgo(existingTheme.updated_at)} />
            <MetaRow label="By" value={authorName ?? '—'} />
          </div>
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-secondary))' }}>
        {value}
      </span>
    </div>
  )
}
