import { useState } from 'react'
import type { Control, UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { useController } from 'react-hook-form'
import { Star } from 'lucide-react'
import { StatusSelect } from './status-select'
import { ChipSelect } from './chip-select'
import { TaxonomyPickerModal } from './taxonomy-picker-modal'
import { ThumbnailUpload } from './thumbnail-upload'
import { useToast } from './toast'
import { uploadFile } from '../lib/block-api'
import { timeAgo } from '../lib/format'

/** M3 cut: empty number input → NaN with valueAsNumber. Normalize to undefined. */
function nanToUndefined(v: string) {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? undefined : n
}

interface EditorSidebarProps {
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
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
  selectedPriceId: string | null
  onPriceChange: (id: string | null) => void
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'hsl(var(--text-muted))',

  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 var(--spacing-sm)',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  fontSize: 'var(--text-sm-font-size)',
  color: 'hsl(var(--foreground))',

  width: '100%',
}

const BADGE_OPTIONS = ['Power Elite', 'Starter', 'Starter Developer', 'Elementor', 'GDPR', 'Starter Starter Developer']
const PLUGIN_OPTIONS = ['Elementor', 'WooCommerce', 'WPML', 'Yoast SEO', 'Rank Math', 'Contact Form 7', 'ACF']

const RESOURCE_PUBLIC = ['docs', 'changelog', 'faq', 'demos']
const RESOURCE_LICENSED = ['download', 'child-theme', 'psd', 'support']
const RESOURCE_PREMIUM = ['priority-support', 'megakit-access']

export function EditorSidebar({ control, register, watch, setValue, existingTheme, allCategories, allTags, selectedCategories, selectedTags, onCategoriesChange, onTagsChange, allPrices, selectedPriceId, onPriceChange }: EditorSidebarProps) {
  const status = watch('status')
  const [catPickerOpen, setCatPickerOpen] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [pricePickerOpen, setPricePickerOpen] = useState(false)
  const thumbnailUrl = watch('meta.thumbnail_url')
  const { toast } = useToast()

  const { field: statusField } = useController({ control, name: 'status' })
  const { field: trustField } = useController({ control, name: 'meta.trust_badges' })
  const { field: compatField } = useController({ control, name: 'meta.compatible_plugins' })
  const { field: resPubField } = useController({ control, name: 'meta.resources.public' })
  const { field: resLicField } = useController({ control, name: 'meta.resources.licensed' })
  const { field: resPreField } = useController({ control, name: 'meta.resources.premium' })

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
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <div className="flex items-center justify-between">
          <span style={labelStyle}>Price</span>
          <button
            type="button"
            onClick={() => setPricePickerOpen(true)}
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
            {selectedPriceId ? 'Change' : 'Select'}
          </button>
        </div>
        {selectedPriceId ? (
          (() => {
            const price = allPrices.find((p) => p.id === selectedPriceId)
            if (!price) return <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>Unknown price</span>
            return (
              <div className="flex items-center" style={{ gap: '6px' }}>
                <span
                  className="inline-flex items-center"
                  style={{
                    backgroundColor: 'hsl(var(--tag-active-bg))',
                    color: 'hsl(var(--tag-active-fg))',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {price.name}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs-font-size)',
                    color: price.type === 'discount' ? 'hsl(var(--status-warn-fg))' : 'hsl(var(--text-muted))',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {price.type}
                </span>
              </div>
            )
          })()
        ) : (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>None selected</span>
        )}
      </div>

      {/* Price picker modal */}
      {pricePickerOpen && (
        <TaxonomyPickerModal
          title="Select Price"
          items={allPrices}
          selected={selectedPriceId ? [{ id: selectedPriceId, is_primary: false }] : []}
          singleSelect
          onSave={(items) => { onPriceChange(items[0]?.id ?? null); setPricePickerOpen(false) }}
          onClose={() => setPricePickerOpen(false)}
        />
      )}

      {/* Trust Badges */}
      <ChipSelect
        label="Trust Badges"
        values={trustField.value}
        onChange={trustField.onChange}
        options={BADGE_OPTIONS}
      />

      {/* Compatible Plugins */}
      <ChipSelect
        label="Compatible With"
        values={compatField.value}
        onChange={compatField.onChange}
        options={PLUGIN_OPTIONS}
      />

      {/* Resources */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
        <span style={labelStyle}>Resources</span>
        <ChipSelect label="🔓 PUBLIC" values={resPubField.value} onChange={resPubField.onChange} options={RESOURCE_PUBLIC} />
        <ChipSelect label="🔒 LICENSED" values={resLicField.value} onChange={resLicField.onChange} options={RESOURCE_LICENSED} />
        <ChipSelect label="⭐ PREMIUM" values={resPreField.value} onChange={resPreField.onChange} options={RESOURCE_PREMIUM} />
      </div>

      {/* Separator */}
      <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />

      {/* Meta */}
      {existingTheme && (
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          <span style={labelStyle}>Meta</span>
          <div className="flex flex-col" style={{ gap: '4px' }}>
            <MetaRow label="Created" value={new Date(existingTheme.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={timeAgo(existingTheme.updated_at)} />
            <MetaRow label="By" value={existingTheme.created_by ?? '—'} />
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
