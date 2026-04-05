import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import type { Theme, Template, Block, ThemeBlockFill, Category, Tag, Price } from '@cmsmasters/db'
import { upsertTheme, logAction, themeRowToFormData, formDataToThemeInsert, getCategories, getThemeCategories, setThemeCategories, getTags, getThemeTags, setThemeTags, getPrices, getThemePrices, setThemePrices, getProfile } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft, ExternalLink, Eye, LayoutTemplate } from 'lucide-react'
import { useLocalPortal } from '../lib/use-local-portal'
import { Button } from '@cmsmasters/ui'
import { fetchThemeBySlug, deleteTheme } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { getDefaults, nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { FormSection } from '../components/form-section'
import { CharCounter } from '../components/char-counter'
import { EditorSidebar } from '../components/editor-sidebar'
import { EditorFooter } from '../components/editor-footer'
import { TemplatePicker } from '../components/template-picker'
import { PositionGrid } from '../components/position-grid'
import { BlockPickerModal } from '../components/block-picker-modal'
import { DeleteConfirmModal } from '../components/delete-confirm-modal'
import { fetchTemplateById } from '../lib/template-api'
import { fetchAllBlocks } from '../lib/block-api'

const inputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 var(--spacing-sm)',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 'var(--text-sm-font-size)',
  color: 'hsl(var(--foreground))',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm-font-size)',
  fontWeight: 'var(--font-weight-medium)',
  color: 'hsl(var(--foreground))',
}

const errorStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs-font-size)',
  color: 'hsl(var(--status-error-fg))',
  marginTop: '4px',
}

export function ThemeEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isNew = !slug

  const localPortal = useLocalPortal()
  const [existingTheme, setExistingTheme] = useState<Theme | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; is_primary: boolean }>>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allPrices, setAllPrices] = useState<Price[]>([])
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
  const [authorName, setAuthorName] = useState<string | undefined>(undefined)

  const form = useForm<ThemeFormData>({
    resolver: zodResolver(themeSchema),
    defaultValues: getDefaults(),
  })

  const { register, control, reset, formState: { errors, isDirty } } = form

  // Fetch all categories + tags on mount (for picker modals)
  useEffect(() => {
    getCategories(supabase).then(setAllCategories).catch(() => {})
    getTags(supabase).then(setAllTags).catch(() => {})
    getPrices(supabase).then(setAllPrices).catch(() => {})
  }, [])

  // Fetch existing theme — OR reset all state for new themes (route reuse)
  useEffect(() => {
    if (isNew) {
      // Reset everything when navigating to /themes/new (component is reused by React Router)
      setExistingTheme(null)
      setFetchError(null)
      setLoading(false)
      reset(getDefaults())
      setCurrentTemplateId('')
      setCurrentBlockFills([])
      setSelectedTemplate(null)
      setShowTemplatePicker(false)
      setSelectedCategories([])
      setSelectedTags([])
      setSelectedPriceId(null)
      setAuthorName(undefined)
      return
    }
    let cancelled = false
    setLoading(true)
    setFetchError(null)

    fetchThemeBySlug(slug)
      .then((theme) => {
        if (cancelled) return
        if (!theme) {
          setFetchError(`Theme "${slug}" not found`)
          return
        }
        setExistingTheme(theme)
        reset(themeRowToFormData(theme))
        setCurrentTemplateId(theme.template_id ?? ''); setCurrentBlockFills(theme.block_fills ?? [])
        // Fetch category/tag assignments for this theme
        getThemeCategories(supabase, theme.id).then((cats) => {
          if (!cancelled) setSelectedCategories(cats.map((c: any) => ({ id: c.id, is_primary: c.is_primary })))
        })
        getThemeTags(supabase, theme.id).then((tags) => {
          if (!cancelled) setSelectedTags(tags.map((t: any) => t.id))
        })
        getThemePrices(supabase, theme.id).then((prices) => {
          if (!cancelled) setSelectedPriceId(prices[0]?.id ?? null)
        })
        if (theme.created_by) {
          getProfile(supabase, theme.created_by).then((profile) => {
            if (!cancelled) setAuthorName(profile.full_name ?? profile.email ?? undefined)
          }).catch(() => {})
        }
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : 'Failed to load theme')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isNew])

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Page Layout state
  const [currentTemplateId, setCurrentTemplateId] = useState('')
  const [currentBlockFills, setCurrentBlockFills] = useState<ThemeBlockFill[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [allBlocks, setAllBlocks] = useState<Block[]>([])
  const [fillPickerOpen, setFillPickerOpen] = useState(false)
  const [fillPickerPosition, setFillPickerPosition] = useState<number | null>(null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  // Fetch all blocks on mount (for position grid name lookup + block picker)
  useEffect(() => {
    fetchAllBlocks().then(setAllBlocks).catch(() => {})
  }, [])

  // Fetch template only on edit load (when template already set from DB)
  // Select/change/remove handlers set selectedTemplate directly
  useEffect(() => {
    if (!currentTemplateId || selectedTemplate) return
    fetchTemplateById(currentTemplateId)
      .then(setSelectedTemplate)
      .catch(() => setSelectedTemplate(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTemplateId])

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
    // Sync layout state to RHF before validation
    form.setValue('template_id', currentTemplateId)
    form.setValue('block_fills', currentBlockFills)

    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before saving' }); return }

    const data = form.getValues()
    // Backward compat: populate meta.category with first primary category name
    const primaryCat = allCategories.find((c) => selectedCategories.find((s) => s.id === c.id && s.is_primary))
    if (primaryCat) data.meta.category = primaryCat.name

    setSaving(true)
    try {
      const payload = formDataToThemeInsert(data, existingTheme?.id)
      if (!existingTheme?.created_by) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) payload.created_by = session.user.id
      }
      const saved = await upsertTheme(supabase, payload)

      // Save category/tag junction tables
      await Promise.all([
        setThemeCategories(supabase, saved.id, selectedCategories.map((s) => ({ category_id: s.id, is_primary: s.is_primary }))),
        setThemeTags(supabase, saved.id, selectedTags),
        setThemePrices(supabase, saved.id, selectedPriceId ? [selectedPriceId] : []),
      ])

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

      // Resolve author name after save if newly set
      if (!authorName && saved.created_by) {
        getProfile(supabase, saved.created_by)
          .then((p) => setAuthorName(p.full_name ?? p.email ?? undefined))
          .catch(async () => {
            // Fallback: use session email if profile lookup fails
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.email) setAuthorName(session.user.email)
          })
      }

      // M4: create flow → navigate first, then data resets from route change
      if (existingTheme) {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
        setCurrentTemplateId(saved.template_id ?? ''); setCurrentBlockFills(saved.block_fills ?? [])
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
    // Sync layout state to RHF before validation
    form.setValue('template_id', currentTemplateId)
    form.setValue('block_fills', currentBlockFills)

    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before publishing' }); return }

    const data = form.getValues()
    // Backward compat: populate meta.category with first primary category name
    const primaryCat = allCategories.find((c) => selectedCategories.find((s) => s.id === c.id && s.is_primary))
    if (primaryCat) data.meta.category = primaryCat.name

    setPublishing(true)
    try {
      // M3: force status at payload level, not relying on form state
      const payload = formDataToThemeInsert(data, existingTheme?.id)
      payload.status = 'published'
      const saved = await upsertTheme(supabase, payload)

      // Save category/tag junction tables
      await Promise.all([
        setThemeCategories(supabase, saved.id, selectedCategories.map((s) => ({ category_id: s.id, is_primary: s.is_primary }))),
        setThemeTags(supabase, saved.id, selectedTags),
        setThemePrices(supabase, saved.id, selectedPriceId ? [selectedPriceId] : []),
      ])

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
          body: JSON.stringify({ slug: saved.slug, type: 'theme' }),
        })
      } catch {
        console.warn('Revalidation failed — Portal will update via ISR')
      }

      if (existingTheme) {
        setExistingTheme(saved)
        reset(themeRowToFormData(saved))
        setCurrentTemplateId(saved.template_id ?? ''); setCurrentBlockFills(saved.block_fills ?? [])
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
  function handleDelete() {
    setShowDeleteConfirm(true)
  }

  async function handleDeleteConfirmed() {
    if (!existingTheme) return
    setShowDeleteConfirm(false)
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
      setCurrentTemplateId(existingTheme.template_id ?? ''); setCurrentBlockFills(existingTheme.block_fills ?? [])
    } else {
      reset(getDefaults())
      setCurrentTemplateId(''); setCurrentBlockFills([])
    }
    setShowTemplatePicker(false)
  }

  // ── Page Layout handlers ──

  function handleTemplateSelect(template: Template) {
    setCurrentTemplateId(template.id)
    setCurrentBlockFills([])
    setShowTemplatePicker(false)
    setSelectedTemplate(template)
  }

  function handleChangeTemplate() {
    setShowTemplatePicker(true)
  }

  function handleRemoveTemplate() {
    if (currentBlockFills.length > 0) {
      const confirmed = globalThis.confirm('Removing the template will clear all block fills. Continue?')
      if (!confirmed) return
    }
    setCurrentTemplateId('')
    setCurrentBlockFills([])
    setSelectedTemplate(null)
    setShowTemplatePicker(false)
  }

  // M2 cut: merged positions — template has priority over fills
  function getMergedPositions() {
    if (!selectedTemplate) return []
    const templateMap = new Map(selectedTemplate.positions.map((p) => [p.position, p.block_id]))
    const fillMap = new Map(currentBlockFills.map((f) => [f.position, f.block_id]))

    return Array.from({ length: selectedTemplate.max_positions }, (_, i) => {
      const pos = i + 1
      const templateBlockId = templateMap.get(pos) ?? null
      if (templateBlockId) return { position: pos, block_id: templateBlockId }
      const fillBlockId = fillMap.get(pos) ?? null
      return { position: pos, block_id: fillBlockId }
    })
  }

  function getReadonlyPositions(): number[] {
    if (!selectedTemplate) return []
    return selectedTemplate.positions.filter((p) => p.block_id).map((p) => p.position)
  }

  function handleAssignFill(pos: number) {
    if (getReadonlyPositions().includes(pos)) return
    setFillPickerPosition(pos)
    setFillPickerOpen(true)
  }

  // M1 cut: upsert by position, not append
  function handleFillBlockSelected(block: Block) {
    if (fillPickerPosition === null) return
    const filtered = currentBlockFills.filter((f) => f.position !== fillPickerPosition)
    setCurrentBlockFills([...filtered, { position: fillPickerPosition, block_id: block.id }])
    setFillPickerOpen(false)
    setFillPickerPosition(null)
  }

  function handleRemoveFill(pos: number) {
    if (getReadonlyPositions().includes(pos)) return
    setCurrentBlockFills(currentBlockFills.filter((f) => f.position !== pos))
  }

  if (loading) {
    return (
      <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', flex: 1, padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
          {/* Left column */}
          <div className="flex flex-col" style={{ flex: '2 1 480px', minWidth: 0, gap: 'var(--spacing-lg)' }}>
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
          <div style={{ flex: '0 0 320px' }}>
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
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', margin: 0 }}>{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>Back to Themes</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
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
            <span style={{ fontSize: 'var(--text-sm-font-size)' }}>
              Themes
            </span>
          </Link>
          <span style={{ color: 'hsl(var(--text-muted))' }}>/</span>
          <span
            style={{
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {isNew ? 'New Theme' : existingTheme?.meta.name ?? slug}
          </span>
        </div>
        {formSlug && (
          <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
            {localPortal.isAvailable && (
              <a
                href={`${localPortal.baseUrl}/themes/${formSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center no-underline"
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--status-success-fg))',
                  gap: '4px',
                }}
              >
                <Eye size={12} />
                Local Preview
              </a>
            )}
            {existingTheme?.status === 'published' ? (
              <a
                href={`https://portal.cmsmasters.studio/themes/${formSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center no-underline"
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-link))',
                  gap: '4px',
                }}
              >
                <ExternalLink size={12} />
                /themes/{formSlug}
              </a>
            ) : (
              <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
                /themes/{formSlug}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body: 2-column ── */}
      <div className="flex-1 overflow-y-auto" style={{ display: 'flex', flexWrap: 'wrap', padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
        {/* Left: Form fields */}
        <div className="flex flex-col" style={{ flex: '2 1 480px', minWidth: 0, gap: 'var(--spacing-lg)' }}>

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

          {/* Page Layout */}
          <div
            className="border"
            style={{
              borderColor: 'hsl(var(--border-default))',
              borderRadius: 'var(--rounded-xl)',
              backgroundColor: 'hsl(var(--bg-surface))',
            }}
          >
            <div
              style={{
                padding: 'var(--spacing-lg) var(--spacing-xl)',
              }}
            >
              <span style={{ fontSize: 'var(--text-base-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
                Page Layout
              </span>
            </div>
            <div style={{ padding: '0 var(--spacing-xl) var(--spacing-xl)' }}>
              <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>

                {/* State 1: No template — empty state with Select button */}
                <div style={{ display: (!currentTemplateId && !showTemplatePicker) ? 'flex' : 'none', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-xl) 0' }}>
                  <LayoutTemplate size={32} style={{ color: 'hsl(var(--text-muted))' }} />
                  <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0, textAlign: 'center' }}>
                    No template selected
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowTemplatePicker(true)}>
                    Select Template
                  </Button>
                </div>

                {/* State 2: Picker open — user is choosing a template */}
                <div style={{ display: showTemplatePicker ? 'block' : 'none' }}>
                  {currentTemplateId && (
                    <div className="flex items-center justify-end" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      <button
                        type="button"
                        onClick={() => setShowTemplatePicker(false)}
                        className="border-0 bg-transparent"
                        style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm-font-size)', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <TemplatePicker selectedId={currentTemplateId ?? ''} onSelect={handleTemplateSelect} />
                </div>

                {/* State 3: Template active — show current template + grid */}
                <div style={{ display: (currentTemplateId && !showTemplatePicker && selectedTemplate) ? 'flex' : 'none', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div className="flex items-center justify-between" style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    backgroundColor: 'hsl(var(--bg-surface-alt))',
                    borderRadius: 'var(--rounded-lg)',
                    border: '1px solid hsl(var(--border-default))',
                  }}>
                    <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                      <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
                        Using template:
                      </span>
                      <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
                        {selectedTemplate?.name}
                      </span>
                    </div>
                    <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
                      <button
                        type="button"
                        onClick={handleChangeTemplate}
                        className="border-0 bg-transparent"
                        style={{ color: 'hsl(var(--text-link))', fontSize: 'var(--text-sm-font-size)', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveTemplate}
                        className="border-0 bg-transparent"
                        style={{ color: 'hsl(var(--status-error-fg))', fontSize: 'var(--text-sm-font-size)', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {selectedTemplate && (
                    <PositionGrid
                      maxPositions={selectedTemplate.max_positions}
                      positions={getMergedPositions()}
                      blocks={allBlocks}
                      onAssignBlock={handleAssignFill}
                      onRemoveBlock={handleRemoveFill}
                      readonlyPositions={getReadonlyPositions()}
                    />
                  )}
                </div>

                {/* Loading state for template fetch */}
                {currentTemplateId && !showTemplatePicker && !selectedTemplate && (
                  <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                    Loading template...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Block picker modal for fills */}
          {fillPickerOpen && (
            <BlockPickerModal
              onSelect={handleFillBlockSelected}
              onClose={() => { setFillPickerOpen(false); setFillPickerPosition(null) }}
            />
          )}

          {showDeleteConfirm && existingTheme && (
            <DeleteConfirmModal
              title="Delete theme"
              itemName={existingTheme.meta.name}
              onConfirm={handleDeleteConfirmed}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          )}

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

          <div aria-hidden style={{ height: '32px', flexShrink: 0 }} />

        </div>

        {/* Right: Sidebar */}
        <div style={{ flex: '0 0 320px' }}>
          <EditorSidebar
            control={control}

            watch={form.watch}
            setValue={form.setValue}
            existingTheme={existingTheme}
            allCategories={allCategories}
            allTags={allTags}
            selectedCategories={selectedCategories}
            selectedTags={selectedTags}
            onCategoriesChange={setSelectedCategories}
            onTagsChange={setSelectedTags}
            allPrices={allPrices}
            selectedPriceId={selectedPriceId}
            onPriceChange={setSelectedPriceId}
            authorName={authorName}
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



