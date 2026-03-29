import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray, useWatch, useController } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { ChevronLeft, Plus, X } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchThemeBySlug } from '../lib/queries'
import { getDefaults, themeToFormData, nameToSlug } from '../lib/form-defaults'
import { FormSection } from '../components/form-section'
import { CharCounter } from '../components/char-counter'
import { ChipSelect } from '../components/chip-select'
import { EditorSidebar } from '../components/editor-sidebar'
import { EditorFooter } from '../components/editor-footer'

/** M3 cut: empty number input → NaN with valueAsNumber. Normalize to undefined. */
function nanToUndefined(v: string) {
  const n = Number(v)
  return v === '' || Number.isNaN(n) ? undefined : n
}

const inputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 var(--spacing-sm)',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 'var(--text-sm-font-size)',
  color: 'hsl(var(--foreground))',
  fontFamily: "'Manrope', sans-serif",
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm-font-size)',
  fontWeight: 500,
  color: 'hsl(var(--foreground))',
  fontFamily: "'Manrope', sans-serif",
}

const errorStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  color: 'hsl(var(--status-error-fg))',
  fontFamily: "'Manrope', sans-serif",
  marginTop: '4px',
}

const COMPATIBLE_OPTIONS = ['Elementor', 'WooCommerce', 'WPML', 'Yoast SEO', 'Rank Math', 'Contact Form 7', 'ACF']

export function ThemeEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isNew = !slug

  const [existingTheme, setExistingTheme] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const form = useForm<ThemeFormData>({
    resolver: zodResolver(themeSchema),
    defaultValues: getDefaults(),
  })

  const { register, control, reset, formState: { errors, isDirty } } = form

  // Fetch existing theme
  useEffect(() => {
    if (isNew) return
    let cancelled = false
    setLoading(true)

    fetchThemeBySlug(slug)
      .then((theme) => {
        if (cancelled) return
        if (!theme) {
          setFetchError(`Theme "${slug}" not found`)
          return
        }
        setExistingTheme(theme)
        reset(themeToFormData(theme))
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load theme')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug, isNew, reset])

  // Slug auto-generation (new themes only)
  const watchedName = useWatch({ control, name: 'name' })
  useEffect(() => {
    if (!isNew) return
    if (watchedName) {
      form.setValue('slug', nameToSlug(watchedName), { shouldDirty: false })
    }
  }, [watchedName, isNew, form])

  // Repeater: features
  const features = useFieldArray({ control, name: 'features' })

  // Repeater: included plugins
  const plugins = useFieldArray({ control, name: 'included_plugins' })

  // Watched values for computed displays
  const seoTitle = useWatch({ control, name: 'seo_title' }) ?? ''
  const seoDesc = useWatch({ control, name: 'seo_description' }) ?? ''
  const formSlug = useWatch({ control, name: 'slug' })

  // Phase 4 placeholders
  function handleSaveDraft() { /* Phase 4 */ }
  function handlePublish() { /* Phase 4 */ }
  function handleDiscard() { reset() }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p style={{ color: 'hsl(var(--text-secondary))', fontFamily: "'Manrope', sans-serif" }}>Loading...</p>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p style={{ color: 'hsl(var(--status-error-fg))', fontFamily: "'Manrope', sans-serif" }}>{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>Back to Themes</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))' }}>
      {/* ── Header ── */}
      <div
        className="flex shrink-0 items-center justify-between border-b"
        style={{
          height: '65px',
          padding: '0 var(--spacing-xl)',
          borderColor: 'hsl(var(--border-default))',
          backgroundColor: 'hsl(var(--bg-surface))',
        }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <Link
            to="/"
            className="flex items-center no-underline"
            style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}
          >
            <ChevronLeft size={18} />
            <span style={{ fontSize: 'var(--text-sm-font-size)', fontFamily: "'Manrope', sans-serif" }}>
              Themes
            </span>
          </Link>
          <span style={{ color: 'hsl(var(--text-muted))' }}>/</span>
          <span
            style={{
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {isNew ? 'New Theme' : existingTheme?.name ?? slug}
          </span>
        </div>
        {formSlug && (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
            /themes/{formSlug}
          </span>
        )}
      </div>

      {/* ── Body: 2-column ── */}
      <div className="flex flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
        {/* Left: Form sections */}
        <div className="flex min-w-0 flex-[2] flex-col" style={{ gap: 'var(--spacing-lg)' }}>

          {/* Section 1: Basic Info */}
          <FormSection title="Basic Info">
            <Field label="Name" error={errors.name?.message}>
              <input {...register('name')} className="w-full outline-none" style={inputStyle} placeholder="Theme name" />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              <input
                {...register('slug')}
                className="w-full outline-none"
                style={{ ...inputStyle, backgroundColor: isNew ? 'hsl(var(--input))' : 'hsl(var(--bg-surface-alt))' }}
                readOnly={!isNew}
                placeholder="auto-generated-slug"
              />
            </Field>
            <Field label="Tagline">
              <input {...register('tagline')} className="w-full outline-none" style={inputStyle} placeholder="Short tagline" />
            </Field>
            <Field label="Description">
              <textarea
                {...register('description')}
                rows={4}
                className="w-full resize-y outline-none"
                style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)' }}
                placeholder="Theme description..."
              />
            </Field>
          </FormSection>

          {/* Section 2: Links */}
          <FormSection title="Links">
            <Field label="Demo URL" error={errors.demo_url?.message}>
              <input {...register('demo_url')} type="url" className="w-full outline-none" style={inputStyle} placeholder="https://demo.example.com" />
            </Field>
            <Field label="ThemeForest URL" error={errors.themeforest_url?.message}>
              <input {...register('themeforest_url')} type="url" className="w-full outline-none" style={inputStyle} placeholder="https://themeforest.net/item/..." />
            </Field>
            <Field label="ThemeForest ID">
              <input {...register('themeforest_id')} className="w-full outline-none" style={inputStyle} placeholder="e.g. 12345678" />
            </Field>
          </FormSection>

          {/* Section 3: Hero */}
          <FormSection title="Hero">
            <Field label="Headline">
              <input {...register('hero.headline')} className="w-full outline-none" style={inputStyle} placeholder="Override default hero text" />
            </Field>
            <Field label="Screenshots">
              <UrlListField control={control} name="hero.screenshots" placeholder="Screenshot URL" />
            </Field>
          </FormSection>

          {/* Section 4: Features */}
          <FormSection title="Features">
            {features.fields.map((field, index) => (
              <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
                <input {...register(`features.${index}.icon`)} className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="Icon" />
                <input {...register(`features.${index}.title`)} className="flex-1 outline-none" style={inputStyle} placeholder="Title" />
                <input {...register(`features.${index}.description`)} className="flex-[2] outline-none" style={inputStyle} placeholder="Description" />
                <button type="button" onClick={() => features.remove(index)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer', marginTop: '8px' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => features.append({ icon: '', title: '', description: '' })}
              className="flex items-center border border-dashed bg-transparent"
              style={{
                padding: 'var(--spacing-sm)',
                borderColor: 'hsl(var(--border-default))',
                borderRadius: 'var(--rounded-lg)',
                color: 'hsl(var(--text-link))',
                fontSize: 'var(--text-sm-font-size)',
                fontFamily: "'Manrope', sans-serif",
                cursor: 'pointer',
                gap: '4px',
                justifyContent: 'center',
              }}
            >
              <Plus size={14} /> Add Feature
            </button>
          </FormSection>

          {/* Section 5: Plugins & Compatibility */}
          <FormSection title="Plugins & Compatibility">
            <span style={{ ...labelStyle, fontSize: 'var(--text-xs-font-size)', fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Included Plugins
            </span>
            {plugins.fields.length > 0 && (
              <div className="flex" style={{ gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
                <span className="flex-1">NAME</span>
                <span className="flex-1">SLUG</span>
                <span style={{ width: '80px' }}>VALUE $</span>
                <span className="flex-1">ICON URL</span>
                <span style={{ width: '24px' }} />
              </div>
            )}
            {plugins.fields.map((field, index) => (
              <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
                <input {...register(`included_plugins.${index}.name`)} className="flex-1 outline-none" style={inputStyle} placeholder="Name" />
                <input {...register(`included_plugins.${index}.slug`)} className="flex-1 outline-none" style={inputStyle} placeholder="slug" />
                <input {...register(`included_plugins.${index}.value`, { setValueAs: nanToUndefined })} type="number" className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="$" />
                <input {...register(`included_plugins.${index}.icon_url`)} className="flex-1 outline-none" style={inputStyle} placeholder="Icon URL" />
                <button type="button" onClick={() => plugins.remove(index)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer', marginTop: '8px' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <PluginTotalValue control={control} />
            <button
              type="button"
              onClick={() => plugins.append({ name: '', slug: '', value: undefined, icon_url: '' })}
              className="flex items-center border border-dashed bg-transparent"
              style={{
                padding: 'var(--spacing-sm)',
                borderColor: 'hsl(var(--border-default))',
                borderRadius: 'var(--rounded-lg)',
                color: 'hsl(var(--text-link))',
                fontSize: 'var(--text-sm-font-size)',
                fontFamily: "'Manrope', sans-serif",
                cursor: 'pointer',
                gap: '4px',
                justifyContent: 'center',
              }}
            >
              <Plus size={14} /> Add Plugin
            </button>

            <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))', margin: 'var(--spacing-sm) 0' }} />

            <CompatiblePluginsField control={control} />
          </FormSection>

          {/* Section 6: SEO */}
          <FormSection title="SEO">
            <Field label="SEO Title" error={errors.seo_title?.message} trailing={<CharCounter current={seoTitle.length} max={70} />}>
              <input {...register('seo_title')} className="w-full outline-none" style={inputStyle} placeholder="Page title for search engines" maxLength={70} />
            </Field>
            <Field label="SEO Description" error={errors.seo_description?.message} trailing={<CharCounter current={seoDesc.length} max={160} />}>
              <textarea
                {...register('seo_description')}
                rows={3}
                className="w-full resize-y outline-none"
                style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)' }}
                placeholder="Meta description for search engines"
                maxLength={160}
              />
            </Field>
          </FormSection>

          {/* Section 7: Custom Sections */}
          <FormSection title="Custom Sections" defaultOpen={false}>
            <CustomSectionsField control={control} setValue={form.setValue} watch={form.watch} />
            <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
              Valid types: before-after, video-demo, testimonial, custom-cta
            </p>
          </FormSection>
        </div>

        {/* Right: Sidebar */}
        <div className="w-[320px] shrink-0">
          <EditorSidebar
            control={control}
            register={register}
            watch={form.watch}
            setValue={form.setValue}
            existingTheme={existingTheme}
          />
        </div>
      </div>

      {/* ── Footer ── */}
      <EditorFooter
        isDirty={isDirty}
        onDiscard={handleDiscard}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />
    </div>
  )
}

/* ── Helper components ── */

function Field({ label, error, trailing, children }: { label: string; error?: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: '4px' }}>
      <div className="flex items-center justify-between">
        <label style={labelStyle}>{label}</label>
        {trailing}
      </div>
      {children}
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}

function UrlListField({ control, name, placeholder }: { control: any; name: string; placeholder: string }) {
  const arr = useFieldArray({ control, name: name as any })
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
      {arr.fields.map((field, i) => (
        <div key={field.id} className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
          <input {...control.register(`${name}.${i}`)} className="flex-1 outline-none" style={inputStyle} placeholder={placeholder} />
          <button type="button" onClick={() => arr.remove(i)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => arr.append('' as any)}
        className="flex items-center border border-dashed bg-transparent"
        style={{
          padding: 'var(--spacing-xs) var(--spacing-sm)',
          borderColor: 'hsl(var(--border-default))',
          borderRadius: 'var(--rounded-lg)',
          color: 'hsl(var(--text-link))',
          fontSize: 'var(--text-xs-font-size)',
          fontFamily: "'Manrope', sans-serif",
          cursor: 'pointer',
          gap: '4px',
        }}
      >
        <Plus size={12} /> Add
      </button>
    </div>
  )
}

function PluginTotalValue({ control }: { control: any }) {
  const plugins = useWatch({ control, name: 'included_plugins' }) ?? []
  const total = plugins.reduce((sum: number, p: any) => sum + (p.value ?? 0), 0)
  if (plugins.length === 0) return null
  return (
    <div className="flex justify-end">
      <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
        Total value: ${total}
      </span>
    </div>
  )
}

/** M4 cut: JSON textarea with live parse boundary — invalid JSON shows error, doesn't silently drop */
function CustomSectionsField({ control, setValue, watch }: { control: any; setValue: any; watch: any }) {
  const [jsonText, setJsonText] = useState(() => {
    const val = watch('custom_sections')
    return val && val.length > 0 ? JSON.stringify(val, null, 2) : ''
  })
  const [jsonError, setJsonError] = useState<string | null>(null)

  function handleBlur() {
    if (!jsonText.trim()) {
      setValue('custom_sections', [])
      setJsonError(null)
      return
    }
    try {
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed)) {
        setJsonError('Must be a JSON array')
        return
      }
      setValue('custom_sections', parsed, { shouldDirty: true })
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <Field label="JSON Data" error={jsonError ?? undefined}>
      <textarea
        rows={8}
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onBlur={handleBlur}
        className="w-full resize-y outline-none"
        style={{
          ...inputStyle,
          height: 'auto',
          padding: 'var(--spacing-sm)',
          fontFamily: 'var(--font-family-monospace)',
          fontSize: 'var(--text-xs-font-size)',
          borderColor: jsonError ? 'hsl(var(--status-error-fg))' : undefined,
        }}
        placeholder='[{"type": "video-demo", "data": {}}]'
      />
    </Field>
  )
}

function CompatiblePluginsField({ control }: { control: any }) {
  const { field } = useController({ control, name: 'compatible_plugins' })
  return (
    <ChipSelect
      label="Compatible With"
      values={field.value}
      onChange={field.onChange}
      options={COMPATIBLE_OPTIONS}
    />
  )
}
