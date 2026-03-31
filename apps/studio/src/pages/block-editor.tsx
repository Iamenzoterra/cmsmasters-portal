import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBlockSchema } from '@cmsmasters/validators'
import type { Block } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft, Plus, X } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchBlockById, createBlockApi, updateBlockApi, deleteBlockApi } from '../lib/block-api'
import { nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { FormSection } from '../components/form-section'
import { BlockPreview } from '../components/block-preview'

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

const monoStyle: React.CSSProperties = {
  ...inputStyle,
  height: 'auto',
  padding: 'var(--spacing-sm)',
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '13px',
  lineHeight: '1.5',
  resize: 'vertical' as const,
}

interface BlockFormData {
  name: string
  slug: string
  html: string
  css: string
  hasPriceHook: boolean
  priceSelector: string
  links: Array<{ selector: string; field: string; label?: string }>
  alt: string
  figma_node: string
}

function getDefaults(): BlockFormData {
  return {
    name: '',
    slug: '',
    html: '',
    css: '',
    hasPriceHook: false,
    priceSelector: '',
    links: [],
    alt: '',
    figma_node: '',
  }
}

function blockToFormData(block: Block): BlockFormData {
  return {
    name: block.name,
    slug: block.slug,
    html: block.html,
    css: block.css,
    hasPriceHook: !!block.hooks?.price,
    priceSelector: block.hooks?.price?.selector ?? '',
    links: block.hooks?.links ?? [],
    alt: block.metadata?.alt ?? '',
    figma_node: block.metadata?.figma_node ?? '',
  }
}

function formDataToPayload(data: BlockFormData) {
  const hooks: Record<string, unknown> = {}
  if (data.hasPriceHook && data.priceSelector.trim()) {
    hooks.price = { selector: data.priceSelector.trim() }
  }
  const validLinks = data.links.filter((l) => l.selector.trim() && l.field.trim())
  if (validLinks.length > 0) {
    hooks.links = validLinks.map((l) => ({
      selector: l.selector.trim(),
      field: l.field.trim(),
      ...(l.label?.trim() ? { label: l.label.trim() } : {}),
    }))
  }

  const metadata: Record<string, unknown> = {}
  if (data.alt.trim()) metadata.alt = data.alt.trim()
  if (data.figma_node.trim()) metadata.figma_node = data.figma_node.trim()

  return {
    name: data.name,
    html: data.html,
    css: data.css || undefined,
    hooks: Object.keys(hooks).length > 0 ? hooks : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

export function BlockEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [existingBlock, setExistingBlock] = useState<Block | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const form = useForm<BlockFormData>({
    resolver: isNew ? zodResolver(createBlockSchema, {
      // Map our form shape to createBlockSchema shape for validation
    }) : undefined,
    defaultValues: getDefaults(),
  })

  const { register, control, reset, formState: { errors, isDirty } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'links' })

  // Fetch existing block
  useEffect(() => {
    if (isNew) return
    let cancelled = false
    setLoading(true)

    fetchBlockById(id)
      .then((block) => {
        if (cancelled) return
        setExistingBlock(block)
        reset(blockToFormData(block))
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : 'Failed to load block')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [id, isNew, reset])

  // Slug auto-generation (new blocks only)
  const watchedName = useWatch({ control, name: 'name' })
  useEffect(() => {
    if (!isNew) return
    if (watchedName) {
      form.setValue('slug', nameToSlug(watchedName), { shouldDirty: false })
    }
  }, [watchedName, isNew, form])

  // Live preview values
  const watchedHtml = useWatch({ control, name: 'html' })
  const watchedCss = useWatch({ control, name: 'css' })
  const formSlug = useWatch({ control, name: 'slug' })

  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  async function handleSave() {
    const data = form.getValues()

    // Manual validation for required fields
    if (!data.name.trim()) {
      toast({ type: 'error', message: 'Name is required' })
      return
    }
    if (!data.html.trim()) {
      toast({ type: 'error', message: 'HTML is required' })
      return
    }
    if (isNew && !data.slug.trim()) {
      toast({ type: 'error', message: 'Slug is required' })
      return
    }

    setSaving(true)
    try {
      const payload = formDataToPayload(data)
      if (isNew) {
        const saved = await createBlockApi({
          slug: data.slug,
          ...payload,
        })
        navigate(`/blocks/${saved.id}`, { replace: true })
        toast({ type: 'success', message: 'Block created' })
      } else {
        const saved = await updateBlockApi(id, payload)
        setExistingBlock(saved)
        reset(blockToFormData(saved))
        toast({ type: 'success', message: 'Block saved' })
      }
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!existingBlock) return
    const confirmed = globalThis.confirm(`Delete "${existingBlock.name}"? This cannot be undone.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      await deleteBlockApi(existingBlock.id)
      toast({ type: 'success', message: 'Block deleted' })
      navigate('/blocks', { replace: true })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed' })
    } finally {
      setDeleting(false)
    }
  }

  function handleDiscard() {
    if (existingBlock) {
      reset(blockToFormData(existingBlock))
    } else {
      reset(getDefaults())
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))' }}>
        <div
          className="shrink-0 border-b"
          style={{ height: '65px', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
        />
        <div className="flex flex-1" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
          <div className="flex min-w-0 flex-[2] flex-col" style={{ gap: 'var(--spacing-lg)' }}>
            {[180, 200, 160, 100, 100].map((h, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ height: `${h}px`, backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }}
              />
            ))}
          </div>
          <div className="w-[320px] shrink-0">
            <div
              className="animate-pulse"
              style={{ height: '300px', backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }}
            />
          </div>
        </div>
        <div
          className="shrink-0 border-t"
          style={{ height: '65px', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
        />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle size={48} style={{ color: 'hsl(var(--status-error-fg))' }} />
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
          {fetchError}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/blocks')}>Back to Blocks</Button>
      </div>
    )
  }

  const busy = saving || deleting

  return (
    <div className="flex h-full flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))' }}>
      {/* Header */}
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
            to="/blocks"
            className="flex items-center no-underline"
            style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}
          >
            <ChevronLeft size={18} />
            <span style={{ fontSize: 'var(--text-sm-font-size)', fontFamily: "'Manrope', sans-serif" }}>
              Blocks
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
            {isNew ? 'New Block' : existingBlock?.name ?? id}
          </span>
        </div>
        {formSlug && (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
            {formSlug}
          </span>
        )}
      </div>

      {/* Body: 2-column */}
      <div className="flex flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
        {/* Left: Form */}
        <div className="flex min-w-0 flex-[2] flex-col" style={{ gap: 'var(--spacing-lg)' }}>

          <FormSection title="Basic Info">
            <Field label="Name" error={errors.name?.message}>
              <input {...register('name')} className="w-full outline-none" style={inputStyle} placeholder="Block name" />
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
          </FormSection>

          <FormSection title="HTML">
            <Field label="HTML Content" error={errors.html?.message}>
              <textarea
                {...register('html')}
                rows={12}
                className="w-full outline-none"
                style={monoStyle}
                placeholder={'<div class="block-container">\n  <!-- Block content here -->\n</div>'}
              />
            </Field>
          </FormSection>

          <FormSection title="CSS">
            <Field label="CSS Styles">
              <textarea
                {...register('css')}
                rows={8}
                className="w-full outline-none"
                style={monoStyle}
                placeholder={'.block-container {\n  /* Styles here */\n}'}
              />
            </Field>
          </FormSection>

          <FormSection title="Hooks" defaultOpen={false}>
            {/* Price hook */}
            <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
              <label style={labelStyle}>Price Hook</label>
              <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                <input type="checkbox" {...register('hasPriceHook')} />
                <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))', fontFamily: "'Manrope', sans-serif" }}>
                  Enable price hook
                </span>
              </div>
              {form.watch('hasPriceHook') && (
                <input
                  {...register('priceSelector')}
                  className="w-full outline-none"
                  style={inputStyle}
                  placeholder="CSS selector, e.g. .price"
                />
              )}
            </div>

            {/* Link hooks */}
            <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
              <label style={labelStyle}>Link Hooks</label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
                  <input
                    {...register(`links.${index}.selector`)}
                    className="flex-1 outline-none"
                    style={inputStyle}
                    placeholder="CSS selector"
                  />
                  <input
                    {...register(`links.${index}.field`)}
                    className="flex-1 outline-none"
                    style={inputStyle}
                    placeholder="Field name"
                  />
                  <input
                    {...register(`links.${index}.label`)}
                    className="flex-1 outline-none"
                    style={inputStyle}
                    placeholder="Label (optional)"
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="flex shrink-0 items-center justify-center border-0 bg-transparent"
                    style={{
                      width: '36px',
                      height: '36px',
                      color: 'hsl(var(--text-muted))',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ selector: '', field: '', label: '' })}
                className="flex items-center gap-1 border-0 bg-transparent"
                style={{
                  color: 'hsl(var(--text-link))',
                  fontSize: 'var(--text-sm-font-size)',
                  fontFamily: "'Manrope', sans-serif",
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Plus size={14} />
                Add link hook
              </button>
            </div>
          </FormSection>

          <FormSection title="Metadata" defaultOpen={false}>
            <Field label="Alt Text">
              <input {...register('alt')} className="w-full outline-none" style={inputStyle} placeholder="Alternative text description" />
            </Field>
            <Field label="Figma Node ID">
              <input {...register('figma_node')} className="w-full outline-none" style={inputStyle} placeholder="e.g. 1234:5678" />
            </Field>
          </FormSection>

        </div>

        {/* Right: Preview */}
        <div className="w-[320px] shrink-0" style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
          <p
            style={{
              margin: '0 0 var(--spacing-sm) 0',
              fontSize: 'var(--text-xs-font-size)',
              fontWeight: 500,
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Preview
          </p>
          <BlockPreview html={watchedHtml ?? ''} css={watchedCss ?? ''} height={400} />
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex shrink-0 items-center justify-between border-t"
        style={{
          height: '65px',
          padding: '0 var(--spacing-xl)',
          borderColor: 'hsl(var(--border-default))',
          backgroundColor: 'hsl(var(--bg-surface))',
        }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || busy}
            className="border-0 bg-transparent disabled:opacity-40"
            style={{
              color: 'hsl(var(--text-secondary))',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 500,
              fontFamily: "'Manrope', sans-serif",
              cursor: isDirty && !busy ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            Discard Changes
          </button>

          {existingBlock && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="border-0 bg-transparent disabled:opacity-40"
              style={{
                color: 'hsl(var(--status-error-fg))',
                fontSize: 'var(--text-sm-font-size)',
                fontWeight: 500,
                fontFamily: "'Manrope', sans-serif",
                cursor: busy ? 'default' : 'pointer',
                padding: 0,
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={busy}
          loading={saving}
        >
          Save
        </Button>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col" style={{ gap: '4px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={errorStyle}>{error}</span>}
    </div>
  )
}
