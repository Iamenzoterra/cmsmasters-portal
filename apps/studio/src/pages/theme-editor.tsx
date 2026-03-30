import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray, useWatch, useController } from 'react-hook-form'
import type { Control, UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { upsertTheme, logAction, themeRowToFormData, formDataToThemeInsert } from '@cmsmasters/db'
import { SECTION_LABELS, CORE_SECTION_TYPES, SECTION_REGISTRY } from '@cmsmasters/validators'
import type { SectionType } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft, ChevronUp, ChevronDown, Plus, X } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchThemeBySlug, deleteTheme } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { getDefaults, nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { FormSection } from '../components/form-section'
import { CharCounter } from '../components/char-counter'
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
  const sectionsArray = useFieldArray({ control, name: 'sections' })

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
        reset(themeRowToFormData(theme))
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : 'Failed to load theme')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [slug, isNew, reset])

  // Slug auto-generation (new themes only)
  const watchedName = useWatch({ control, name: 'meta.name' })
  useEffect(() => {
    if (!isNew) return
    if (watchedName) {
      form.setValue('slug', nameToSlug(watchedName), { shouldDirty: false })
    }
  }, [watchedName, isNew, form])

  // Watched values for computed displays
  const seoTitle = useWatch({ control, name: 'seo.title' }) ?? ''
  const seoDesc = useWatch({ control, name: 'seo.description' }) ?? ''
  const formSlug = useWatch({ control, name: 'slug' })

  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // M5: beforeunload only when dirty, cleanup in return
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Save Draft ──
  async function handleSaveDraft() {
    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before saving' }); return }

    const data = form.getValues()
    setSaving(true)
    try {
      const payload = formDataToThemeInsert(data, existingTheme?.id)
      const saved = await upsertTheme(supabase, payload)

      // M2: audit non-blocking with explicit marker
      try {
        await logAction(supabase, {
          action: existingTheme ? 'theme.updated' : 'theme.created',
          target_type: 'theme',
          target_id: saved.id,
          details: { slug: saved.slug, status: saved.status },
        })
      } catch {
        console.warn('AUDIT_LOG_FAILED', existingTheme ? 'theme.updated' : 'theme.created', saved.slug)
      }

      // M4: create flow → navigate first, then data resets from route change
      if (existingTheme) {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
      } else {
        navigate(`/themes/${saved.slug}`, { replace: true })
      }
      toast({ type: 'success', message: 'Theme saved' })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // ── Publish ──
  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before publishing' }); return }

    const data = form.getValues()
    setPublishing(true)
    try {
      // M3: force status at payload level, not relying on form state
      const payload = formDataToThemeInsert(data, existingTheme?.id)
      payload.status = 'published'
      const saved = await upsertTheme(supabase, payload)

      try {
        await logAction(supabase, {
          action: 'theme.published',
          target_type: 'theme',
          target_id: saved.id,
          details: { slug: saved.slug },
        })
      } catch {
        console.warn('AUDIT_LOG_FAILED', 'theme.published', saved.slug)
      }

      // Fire-and-forget revalidation (stub endpoint, non-fatal)
      try {
        const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
        await fetch(`${apiUrl}/api/content/revalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: saved.slug }),
        })
      } catch {
        console.warn('Revalidation failed — Portal will update via ISR')
      }

      if (existingTheme) {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
      } else {
        navigate(`/themes/${saved.slug}`, { replace: true })
      }
      toast({ type: 'success', message: 'Theme published' })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }

  // ── Delete (M6: only for existing themes) ──
  async function handleDelete() {
    if (!existingTheme) return
    const confirmed = globalThis.confirm(`Delete "${existingTheme.meta.name}"? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteTheme(existingTheme.id)

      try {
        await logAction(supabase, {
          action: 'theme.deleted',
          target_type: 'theme',
          target_id: existingTheme.id,
          details: { slug: existingTheme.slug, name: existingTheme.meta.name },
        })
      } catch {
        console.warn('AUDIT_LOG_FAILED', 'theme.deleted', existingTheme.slug)
      }

      toast({ type: 'success', message: 'Theme deleted' })
      navigate('/', { replace: true })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed' })
    } finally {
      setDeleting(false)
    }
  }

  // ── Discard: reset to last persisted state, not empty defaults ──
  function handleDiscard() {
    if (existingTheme) {
      reset(themeRowToFormData(existingTheme))
    } else {
      reset(getDefaults())
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))' }}>
        {/* Header skeleton */}
        <div
          className="shrink-0 border-b"
          style={{
            height: '65px',
            borderColor: 'hsl(var(--border-default))',
            backgroundColor: 'hsl(var(--bg-surface))',
          }}
        />
        {/* Body skeleton */}
        <div className="flex flex-1" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
          {/* Left column */}
          <div className="flex min-w-0 flex-[2] flex-col" style={{ gap: 'var(--spacing-lg)' }}>
            {[180, 120, 140, 200, 240, 120, 100].map((h, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: `${h}px`,
                  backgroundColor: 'hsl(var(--bg-surface-alt))',
                  borderRadius: 'var(--rounded-xl)',
                }}
              />
            ))}
          </div>
          {/* Right sidebar */}
          <div className="w-[320px] shrink-0">
            <div
              className="animate-pulse"
              style={{
                height: '600px',
                backgroundColor: 'hsl(var(--bg-surface-alt))',
                borderRadius: 'var(--rounded-xl)',
              }}
            />
          </div>
        </div>
        {/* Footer skeleton */}
        <div
          className="shrink-0 border-t"
          style={{
            height: '65px',
            borderColor: 'hsl(var(--border-default))',
            backgroundColor: 'hsl(var(--bg-surface))',
          }}
        />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle size={48} style={{ color: 'hsl(var(--status-error-fg))' }} />
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>{fetchError}</p>
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
            {isNew ? 'New Theme' : existingTheme?.meta.name ?? slug}
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
            <Field label="Name" error={errors.meta?.name?.message}>
              <input {...register('meta.name')} className="w-full outline-none" style={inputStyle} placeholder="Theme name" />
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
              <input {...register('meta.tagline')} className="w-full outline-none" style={inputStyle} placeholder="Short tagline" />
            </Field>
            <Field label="Description">
              <textarea
                {...register('meta.description')}
                rows={4}
                className="w-full resize-y outline-none"
                style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)' }}
                placeholder="Theme description..."
              />
            </Field>
          </FormSection>

          {/* Section 2: Links */}
          <FormSection title="Links">
            <Field label="Demo URL" error={errors.meta?.demo_url?.message}>
              <input {...register('meta.demo_url')} type="url" className="w-full outline-none" style={inputStyle} placeholder="https://demo.example.com" />
            </Field>
            <Field label="ThemeForest URL" error={errors.meta?.themeforest_url?.message}>
              <input {...register('meta.themeforest_url')} type="url" className="w-full outline-none" style={inputStyle} placeholder="https://themeforest.net/item/..." />
            </Field>
            <Field label="ThemeForest ID">
              <input {...register('meta.themeforest_id')} className="w-full outline-none" style={inputStyle} placeholder="e.g. 12345678" />
            </Field>
          </FormSection>

          {/* Section Builder */}
          <SectionsList
            fields={sectionsArray.fields}
            control={control}
            register={register}
            onRemove={sectionsArray.remove}
            onSwap={sectionsArray.swap}
            onAppend={(type: SectionType) => {
              const entry = SECTION_REGISTRY[type]
              sectionsArray.append({ type, data: { ...entry.defaultData } })
            }}
          />

          {/* SEO */}
          <FormSection title="SEO">
            <Field label="SEO Title" error={errors.seo?.title?.message} trailing={<CharCounter current={seoTitle.length} max={70} />}>
              <input {...register('seo.title')} className="w-full outline-none" style={inputStyle} placeholder="Page title for search engines" maxLength={70} />
            </Field>
            <Field label="SEO Description" error={errors.seo?.description?.message} trailing={<CharCounter current={seoDesc.length} max={160} />}>
              <textarea
                {...register('seo.description')}
                rows={3}
                className="w-full resize-y outline-none"
                style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)' }}
                placeholder="Meta description for search engines"
                maxLength={160}
              />
            </Field>
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
        isSaving={saving}
        isPublishing={publishing}
        isDeleting={deleting}
        onDiscard={handleDiscard}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={existingTheme ? handleDelete : undefined}
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

/* ── Section Builder ── */

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--spacing-md) var(--spacing-xl)',
  cursor: 'pointer',
  userSelect: 'none',
}

const controlBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  padding: '2px',
  cursor: 'pointer',
  color: 'hsl(var(--text-muted))',
  display: 'flex',
  alignItems: 'center',
}

interface SectionsListProps {
  fields: Array<{ id: string; type: string; data: Record<string, unknown> }>
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
  onRemove: (index: number) => void
  onSwap: (a: number, b: number) => void
  onAppend: (type: SectionType) => void
}

function SectionsList({ fields, control, register, onRemove, onSwap, onAppend }: SectionsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-xl)',
        backgroundColor: 'hsl(var(--bg-surface))',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 'var(--spacing-md) var(--spacing-xl)', borderBottom: '1px solid hsl(var(--border-default))' }}>
        <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
          Sections ({fields.length})
        </span>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} style={{ borderBottom: '1px solid hsl(var(--border-default))' }}>
          <div
            style={sectionHeaderStyle}
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 500, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
              {expandedIndex === index ? '\u25BC' : '\u25B6'}{' '}
              {SECTION_LABELS[field.type as SectionType] ?? field.type}
            </span>
            <div className="flex items-center" style={{ gap: '2px' }}>
              <button
                type="button"
                style={{ ...controlBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
                disabled={index === 0}
                onClick={(e) => { e.stopPropagation(); onSwap(index, index - 1) }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                style={{ ...controlBtnStyle, opacity: index === fields.length - 1 ? 0.3 : 1 }}
                disabled={index === fields.length - 1}
                onClick={(e) => { e.stopPropagation(); onSwap(index, index + 1) }}
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                style={controlBtnStyle}
                onClick={(e) => { e.stopPropagation(); if (globalThis.confirm('Remove this section?')) onRemove(index) }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {expandedIndex === index && (
            <div style={{ padding: '0 var(--spacing-xl) var(--spacing-xl)' }}>
              <SectionEditor index={index} type={field.type as SectionType} control={control} register={register} />
            </div>
          )}
        </div>
      ))}

      <div style={{ padding: 'var(--spacing-md) var(--spacing-xl)' }}>
        {showPicker ? (
          <div className="flex flex-wrap items-center" style={{ gap: 'var(--spacing-xs)' }}>
            {CORE_SECTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { onAppend(type); setShowPicker(false) }}
                className="border bg-transparent"
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  borderColor: 'hsl(var(--border-default))',
                  borderRadius: 'var(--rounded-lg)',
                  fontSize: 'var(--text-xs-font-size)',
                  fontFamily: "'Manrope', sans-serif",
                  color: 'hsl(var(--text-link))',
                  cursor: 'pointer',
                }}
              >
                {SECTION_LABELS[type]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="border-0 bg-transparent"
              style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center border border-dashed bg-transparent"
            style={{
              padding: 'var(--spacing-sm)',
              borderColor: 'hsl(var(--border-default))',
              borderRadius: 'var(--rounded-lg)',
              color: 'hsl(var(--text-link))',
              fontSize: 'var(--text-sm-font-size)',
              fontFamily: "'Manrope', sans-serif",
              cursor: 'pointer',
              gap: '4px',
            }}
          >
            <Plus size={14} /> Add Section
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Section Editor Router ── */

function SectionEditor({ index, type, control, register }: { index: number; type: SectionType; control: Control<ThemeFormData>; register: UseFormRegister<ThemeFormData> }) {
  switch (type) {
    case 'theme-hero': {
      return <HeroEditor index={index} control={control} register={register} />
    }
    case 'feature-grid': {
      return <FeatureGridEditor index={index} control={control} register={register} />
    }
    case 'plugin-comparison': {
      return <PluginComparisonEditor index={index} control={control} register={register} />
    }
    case 'trust-strip': {
      return <TrustStripInfo />
    }
    case 'related-themes': {
      return <RelatedThemesEditor index={index} register={register} />
    }
    default: {
      return <StubEditor index={index} control={control} />
    }
  }
}

/* ── Core Section Editors ── */

function HeroEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const screenshots = useFieldArray({ control, name: `sections.${index}.data.screenshots` as any })

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      <Field label="Headline">
        <input
          {...register(`sections.${index}.data.headline`)}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="Override default hero text"
        />
      </Field>
      <Field label="Screenshots">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          {screenshots.fields.map((field, i) => (
            <div key={field.id} className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <input
                {...register(`sections.${index}.data.screenshots.${i}`)}
                className="flex-1 outline-none"
                style={inputStyle}
                placeholder="Screenshot URL"
              />
              <button type="button" onClick={() => screenshots.remove(i)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => screenshots.append('' as any)}
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
            <Plus size={12} /> Add Screenshot
          </button>
        </div>
      </Field>
    </div>
  )
}

function FeatureGridEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const features = useFieldArray({ control, name: `sections.${index}.data.features` as any })

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      {features.fields.map((field, i) => (
        <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
          <input {...register(`sections.${index}.data.features.${i}.icon`)} className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="Icon" />
          <input {...register(`sections.${index}.data.features.${i}.title`)} className="flex-1 outline-none" style={inputStyle} placeholder="Title" />
          <input {...register(`sections.${index}.data.features.${i}.description`)} className="flex-[2] outline-none" style={inputStyle} placeholder="Description" />
          <button type="button" onClick={() => features.remove(i)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer', marginTop: '8px' }}>
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
    </div>
  )
}

function PluginComparisonEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const plugins = useFieldArray({ control, name: `sections.${index}.data.included_plugins` as any })
  const watchedPlugins = useWatch({ control, name: `sections.${index}.data.included_plugins` as any }) ?? []
  const total = watchedPlugins.reduce((sum: number, p: any) => sum + (p?.value ?? 0), 0)

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      {plugins.fields.length > 0 && (
        <div className="flex" style={{ gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
          <span className="flex-1">NAME</span>
          <span className="flex-1">SLUG</span>
          <span style={{ width: '80px' }}>VALUE $</span>
          <span className="flex-1">ICON URL</span>
          <span style={{ width: '24px' }} />
        </div>
      )}
      {plugins.fields.map((field, i) => (
        <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
          <input {...register(`sections.${index}.data.included_plugins.${i}.name`)} className="flex-1 outline-none" style={inputStyle} placeholder="Name" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.slug`)} className="flex-1 outline-none" style={inputStyle} placeholder="slug" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.value`, { setValueAs: nanToUndefined })} type="number" className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="$" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.icon_url`)} className="flex-1 outline-none" style={inputStyle} placeholder="Icon URL" />
          <button type="button" onClick={() => plugins.remove(i)} className="flex shrink-0 items-center border-0 bg-transparent" style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer', marginTop: '8px' }}>
            <X size={16} />
          </button>
        </div>
      ))}
      {plugins.fields.length > 0 && (
        <div className="flex justify-end">
          <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
            Total value: ${total}
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => plugins.append({ name: '', slug: '', value: undefined, icon_url: '' } as any)}
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
    </div>
  )
}

function TrustStripInfo() {
  return (
    <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
      Trust strip renders from the Trust Badges field in the sidebar. No additional data needed.
    </p>
  )
}

function RelatedThemesEditor({ index, register }: { index: number; register: any }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      <Field label="Category Override">
        <input
          {...register(`sections.${index}.data.category`)}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="Leave empty for same category"
        />
      </Field>
      <Field label="Limit">
        <input
          {...register(`sections.${index}.data.limit`, { setValueAs: nanToUndefined })}
          type="number"
          min={1}
          max={12}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="4"
        />
      </Field>
    </div>
  )
}

function StubEditor({ index, control }: { index: number; control: any }) {
  const sectionData = useWatch({ control, name: `sections.${index}.data` as any })
  const [jsonText, setJsonText] = useState(() =>
    sectionData && typeof sectionData === 'object' && Object.keys(sectionData).length > 0
      ? JSON.stringify(sectionData, null, 2)
      : '{}'
  )
  const [jsonError, setJsonError] = useState<string | null>(null)
  const { field } = useController({ control, name: `sections.${index}.data` as any })

  function handleBlur() {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object')
        return
      }
      field.onChange(parsed)
      setJsonError(null)
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Invalid JSON')
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
      <textarea
        rows={6}
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onBlur={handleBlur}
        className="w-full resize-y outline-none"
        style={{
          ...inputStyle,
          height: 'auto',
          padding: 'var(--spacing-sm)',
          fontFamily: 'monospace',
          fontSize: 'var(--text-xs-font-size)',
          borderColor: jsonError ? 'hsl(var(--status-error-fg))' : undefined,
        }}
      />
      {jsonError && <span style={errorStyle}>{jsonError}</span>}
      <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0, fontFamily: "'Manrope', sans-serif" }}>
        JSON data for this section type. Full editor coming in a future update.
      </p>
    </div>
  )
}

