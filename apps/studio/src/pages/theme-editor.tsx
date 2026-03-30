import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme } from '@cmsmasters/db'
import { upsertTheme, logAction, themeRowToFormData, formDataToThemeInsert } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
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
      .catch((err) => {
        if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load theme')
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
      } catch (auditErr) {
        console.warn('AUDIT_LOG_FAILED', existingTheme ? 'theme.updated' : 'theme.created', saved.slug, auditErr)
      }

      // M4: create flow → navigate first, then data resets from route change
      if (!existingTheme) {
        navigate(`/themes/${saved.slug}`, { replace: true })
      } else {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
      }
      toast({ type: 'success', message: 'Theme saved' })
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' })
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
      } catch (auditErr) {
        console.warn('AUDIT_LOG_FAILED', 'theme.published', saved.slug, auditErr)
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

      if (!existingTheme) {
        navigate(`/themes/${saved.slug}`, { replace: true })
      } else {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
      }
      toast({ type: 'success', message: 'Theme published' })
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }

  // ── Delete (M6: only for existing themes) ──
  async function handleDelete() {
    if (!existingTheme) return
    const confirmed = window.confirm(`Delete "${existingTheme.meta.name}"? This cannot be undone.`)
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
      } catch (auditErr) {
        console.warn('AUDIT_LOG_FAILED', 'theme.deleted', existingTheme.slug, auditErr)
      }

      toast({ type: 'success', message: 'Theme deleted' })
      navigate('/', { replace: true })
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
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

          {/* Sections: Hero, Features, Plugins, Custom Sections — removed in Phase 3.
             Phase 4 rebuilds these as section-based editors using the registry. */}

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

