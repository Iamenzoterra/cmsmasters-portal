import type { Control, UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import type { ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { useController } from 'react-hook-form'
import { StatusBadge } from './status-badge'
import { StarRating } from './star-rating'
import { ChipSelect } from './chip-select'
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
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  fontWeight: 600,
  color: 'hsl(var(--text-muted))',
  fontFamily: "'Manrope', sans-serif",
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
  fontFamily: "'Manrope', sans-serif",
  width: '100%',
}

const BADGE_OPTIONS = ['Power Elite', 'Starter', 'Starter Developer', 'Elementor', 'GDPR', 'Starter Starter Developer']
const PLUGIN_OPTIONS = ['Elementor', 'WooCommerce', 'WPML', 'Yoast SEO', 'Rank Math', 'Contact Form 7', 'ACF']
const CATEGORY_OPTIONS = ['Creative', 'Business', 'Blog', 'Portfolio', 'Technology', 'Health', 'Education', 'eCommerce']

const RESOURCE_PUBLIC = ['docs', 'changelog', 'faq', 'demos']
const RESOURCE_LICENSED = ['download', 'child-theme', 'psd', 'support']
const RESOURCE_PREMIUM = ['priority-support', 'megakit-access']

export function EditorSidebar({ control, register, watch, setValue, existingTheme }: EditorSidebarProps) {
  const status = watch('status')
  const thumbnailUrl = watch('thumbnail_url')

  const { field: ratingField } = useController({ control, name: 'rating' })
  const { field: trustField } = useController({ control, name: 'trust_badges' })
  const { field: compatField } = useController({ control, name: 'compatible_plugins' })
  const { field: resPubField } = useController({ control, name: 'resources.public' })
  const { field: resLicField } = useController({ control, name: 'resources.licensed' })
  const { field: resPreField } = useController({ control, name: 'resources.premium' })

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
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            height: '140px',
            backgroundColor: 'hsl(var(--bg-surface-alt))',
            borderRadius: 'var(--rounded-lg)',
          }}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Thumbnail" className="h-full w-full object-cover" />
          ) : (
            <span style={{ fontSize: '32px', color: 'hsl(var(--text-muted))' }}>🖼</span>
          )}
        </div>
        <input
          {...register('thumbnail_url')}
          type="text"
          placeholder="Image URL"
          className="w-full outline-none"
          style={inputStyle}
        />
      </div>

      {/* Status */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Status</span>
        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
          <StatusBadge status={status} />
          <select
            {...register('status')}
            className="appearance-none border-0 bg-transparent outline-none"
            style={{
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-link))',
              fontFamily: "'Manrope', sans-serif",
              cursor: 'pointer',
            }}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Category */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Category</span>
        <select
          {...register('category')}
          className="w-full appearance-none outline-none"
          style={inputStyle}
        >
          <option value="">Select category</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Price</span>
        <div className="relative">
          <span
            className="pointer-events-none absolute top-1/2 -translate-y-1/2"
            style={{ left: '12px', color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)' }}
          >
            $
          </span>
          <input
            type="number"
            min={0}
            step={1}
            {...register('price', { setValueAs: nanToUndefined })}
            placeholder="0"
            className="w-full outline-none"
            style={{ ...inputStyle, paddingLeft: '28px' }}
          />
        </div>
      </div>

      {/* Rating */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Rating</span>
        <StarRating value={ratingField.value} onChange={ratingField.onChange} />
      </div>

      {/* Sales */}
      <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
        <span style={labelStyle}>Sales</span>
        <input
          type="number"
          min={0}
          step={1}
          {...register('sales', { setValueAs: nanToUndefined })}
          placeholder="0"
          className="w-full outline-none"
          style={inputStyle}
        />
      </div>

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
      <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </span>
      <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-secondary))', fontFamily: "'Manrope', sans-serif" }}>
        {value}
      </span>
    </div>
  )
}
