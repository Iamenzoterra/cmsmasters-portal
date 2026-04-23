import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm, useWatch, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBlockSchema } from '@cmsmasters/validators'
import type { Block } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft, Plus, X, Upload, Download, Eye, Sparkles } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchBlockById, createBlockApi, updateBlockApi, deleteBlockApi, uploadFile } from '../lib/block-api'
import type { BlockCategory } from '@cmsmasters/db'
import { getBlockCategories } from '@cmsmasters/db'
import { supabase } from '../lib/supabase'
import { nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { StyledSelect } from '../components/styled-select'
import { FormSection } from '../components/form-section'
import { DeleteConfirmModal } from '../components/delete-confirm-modal'
import { BlockImportPanel } from '../components/block-import-panel'
import { ThumbnailUpload } from '../components/thumbnail-upload'
import { ResponsiveTab } from './block-editor/responsive/ResponsiveTab'
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
import tokensResponsiveCSS from '../../../../packages/ui/src/theme/tokens.responsive.css?raw'
import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'

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

const monoStyle: React.CSSProperties = {
  ...inputStyle,
  height: 'auto',
  padding: 'var(--spacing-md)',
  font: 'var(--text-sm-font-size)/1.6 var(--font-family-monospace)',
  resize: 'vertical' as const,
  backgroundColor: 'hsl(var(--bg-surface-alt))',
  tabSize: 2,
  letterSpacing: '-0.01em',
}

const GLOBAL_ELEMENT_TYPES = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
] as const

interface BlockFormData {
  name: string
  slug: string
  block_type: string
  block_category_id: string
  is_default: boolean
  code: string
  js: string
  thumbnail_url: string
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
    block_type: '',
    block_category_id: '',
    is_default: false,
    code: '',
    js: '',
    thumbnail_url: '',
    hasPriceHook: false,
    priceSelector: '',
    links: [],
    alt: '',
    figma_node: '',
  }
}

/** Combine html + css from DB into a single code string */
function blockToCode(block: Block): string {
  if (!block.css) return block.html
  return `<style>\n${block.css}\n</style>\n\n${block.html}`
}

function blockToFormData(block: Block): BlockFormData {
  return {
    name: block.name,
    slug: block.slug,
    block_type: block.block_type ?? '',
    block_category_id: block.block_category_id ?? '',
    is_default: block.is_default ?? false,
    code: blockToCode(block),
    js: block.js ?? '',
    thumbnail_url: (block.metadata as Record<string, unknown>)?.thumbnail_url as string ?? '',
    hasPriceHook: !!block.hooks?.price,
    priceSelector: block.hooks?.price?.selector ?? '',
    links: block.hooks?.links ?? [],
    alt: block.metadata?.alt ?? '',
    figma_node: block.metadata?.figma_node ?? '',
  }
}

/** Split code into html + css for the API */
function splitCode(code: string): { html: string; css: string } {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let css = ''
  let match
  while ((match = styleRegex.exec(code)) !== null) {
    css += (css ? '\n\n' : '') + match[1].trim()
  }
  const html = code.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim()
  return { html, css }
}

function formDataToPayload(data: BlockFormData) {
  const { html, css } = splitCode(data.code)

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
  if (data.thumbnail_url.trim()) metadata.thumbnail_url = data.thumbnail_url.trim()

  return {
    name: data.name,
    html: html || data.code,
    css: css || undefined,
    js: data.js,
    block_type: data.block_type,
    block_category_id: data.block_category_id || null,
    is_default: data.is_default,
    hooks: Object.keys(hooks).length > 0 ? hooks : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

/** Extract R2 URLs from a saved block (for detecting removed images on re-import) */
function extractR2Urls(block: Block): string[] {
  const urls: string[] = []
  const re = /https?:\/\/[^"'\s]+\.r2\.dev\/[^"'\s)]+/g
  const html = block.html || ''
  const css = block.css || ''
  for (const match of html.matchAll(re)) urls.push(match[0])
  for (const match of css.matchAll(re)) urls.push(match[0])
  return [...new Set(urls)]
}

function parseHtmlFile(content: string): { code: string; js: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  const styles = Array.from(doc.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n\n')
    .trim()

  const scripts = Array.from(doc.querySelectorAll('script'))
    .map((el) => el.textContent ?? '')
    .filter(Boolean)
    .join('\n\n')
    .trim()

  const body = doc.body?.innerHTML?.trim() ?? content
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim()

  let code = ''
  if (styles) code += `<style>\n${styles}\n</style>\n\n`
  code += cleaned

  return { code, js: scripts }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function BlockEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = !id
  // Pre-fill category from URL param (e.g., /blocks/new?category=header)
  const urlCategory = isNew ? new URLSearchParams(location.search).get('category') ?? '' : ''
  // Detect section: /global-elements, /elements, or /blocks
  const isGlobalElementRoute = location.pathname.startsWith('/global-elements')
  const isElementRoute = location.pathname.startsWith('/elements')
  const basePath = isGlobalElementRoute ? '/global-elements' : isElementRoute ? '/elements' : '/blocks'
  const sectionLabel = isGlobalElementRoute ? 'Global Elements' : isElementRoute ? 'Elements' : 'Blocks'

  // Compute default block_type based on context
  const defaultBlockType = isGlobalElementRoute ? urlCategory : isElementRoute ? 'element' : ''

  const [existingBlock, setExistingBlock] = useState<Block | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<BlockFormData>({
    resolver: isNew ? zodResolver(createBlockSchema, {
      // Map our form shape to createBlockSchema shape for validation
    }) : undefined,
    defaultValues: { ...getDefaults(), block_type: defaultBlockType },
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
  const watchedCode = useWatch({ control, name: 'code' })
  const formSlug = useWatch({ control, name: 'slug' })

  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProcess, setShowProcess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([])
  // WP-027 Phase 1: 2-tab bar. Tab 1 = Editor (all existing UI + Process button unchanged);
  // Tab 2 = Responsive (new). Save footer stays OUTSIDE the conditional so dirty state +
  // Save button remain reachable on both tabs.
  const [activeTab, setActiveTab] = useState<'editor' | 'responsive'>('editor')

  // Fetch block categories for theme blocks context
  useEffect(() => {
    if (isGlobalElementRoute || isElementRoute) return
    getBlockCategories(supabase).then(setBlockCategories).catch(() => {})
  }, [isGlobalElementRoute, isElementRoute])

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
    if (!data.code.trim()) {
      toast({ type: 'error', message: 'Code is required' })
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
        navigate(`${basePath}/${saved.id}`, { replace: true })
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

  async function handleDeleteConfirmed() {
    if (!existingBlock) return
    setShowDeleteConfirm(false)
    setDeleting(true)
    try {
      await deleteBlockApi(existingBlock.id)
      toast({ type: 'success', message: 'Block deleted' })
      navigate(basePath, { replace: true })
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

  function handleExport() {
    const code = form.getValues('code')
    if (!code.trim()) return
    const name = form.getValues('name') || form.getValues('slug') || 'block'
    const js = form.getValues('js') ?? ''
    const scriptTag = js.trim() ? `\n<script type="module">\n${js}\n</script>` : ''
    const blob = new Blob([
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${name}</title>\n  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />\n  <style>*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Manrope', system-ui, sans-serif; }\n${tokensCSS}\n${tokensResponsiveCSS}\n${portalBlocksCSS}</style>\n</head>\n<body>\n${code}${scriptTag}\n</body>\n</html>`
    ], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const { code, js } = parseHtmlFile(content)

      form.setValue('code', code, { shouldDirty: true })
      form.setValue('js', js, { shouldDirty: true })

      // Auto-fill name from filename if empty
      const currentName = form.getValues('name')
      if (!currentName) {
        const name = file.name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')
        form.setValue('name', name, { shouldDirty: true })
        if (isNew) form.setValue('slug', nameToSlug(name), { shouldDirty: false })
      }

      toast({ type: 'success', message: `Imported ${file.name}` })
    }
    reader.readAsText(file)

    // Reset input so same file can be re-imported
    e.target.value = ''
  }

  if (loading) {
    return (
      <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
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
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', margin: 0 }}>
          {fetchError}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(basePath)}>Back to {sectionLabel}</Button>
      </div>
    )
  }

  const busy = saving || deleting

  return (
    <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
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
            to={basePath}
            className="flex items-center no-underline"
            style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}
          >
            <ChevronLeft size={18} />
            <span style={{ fontSize: 'var(--text-sm-font-size)' }}>
              {sectionLabel}
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
            {isNew ? 'New Block' : existingBlock?.name ?? id}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          {formSlug && (
            <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
              {formSlug}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Import HTML
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowProcess(true)} disabled={!(watchedCode ?? '').trim()}>
            <Sparkles size={14} />
            Process
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const code = form.getValues('code') ?? ''
            const js = form.getValues('js') ?? ''
            const name = form.getValues('name') || 'Block Preview'
            const scriptTag = js.trim() ? `\n<script type="module">\n${js}\n</script>` : ''
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} — Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Manrope', system-ui, sans-serif; background: hsl(20 23% 97%); display: flex; justify-content: center; padding-top: 300px; padding-bottom: 100px; min-height: 100vh; }
    ${tokensCSS}
    ${tokensResponsiveCSS}
    ${portalBlocksCSS}
  </style>
</head>
<body>
${code}${scriptTag}
</body>
</html>`
            const win = window.open('', '_blank')
            if (win) { win.document.write(html); win.document.close() }
          }} disabled={!(watchedCode ?? '').trim()}>
            <Eye size={14} />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!(watchedCode ?? '').trim()}>
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* WP-027 Phase 1: 2-tab bar. Pattern mirrors theme-meta.tsx. */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid hsl(var(--border-default))', padding: '0 var(--spacing-xl)', backgroundColor: 'hsl(var(--bg-surface))' }}>
        {([
          { key: 'editor', label: 'Editor' },
          { key: 'responsive', label: 'Responsive' },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className="border-0 bg-transparent"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: activeTab === t.key ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              color: activeTab === t.key ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
              borderBottom: activeTab === t.key ? '2px solid hsl(var(--text-primary))' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body: 2-column (Editor tab) or Responsive tab — only ONE renders at a time.
          Save footer stays OUTSIDE this conditional — always visible. */}
      {activeTab === 'editor' && (
      <div className="flex flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
        {/* Left: Form */}
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--spacing-lg)', maxWidth: '900px' }}>

          <FormSection title="Basic Info">
            <Field label="Name *" error={errors.name?.message}>
              <input {...register('name')} className="w-full outline-none" style={inputStyle} placeholder="Block name" />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              {isNew ? (
                <input
                  {...register('slug')}
                  className="w-full outline-none"
                  style={inputStyle}
                  placeholder="auto-generated-slug"
                />
              ) : (
                <span style={{
                  fontSize: 'var(--text-sm-font-size)',
                  color: 'hsl(var(--text-muted))',
                  padding: '0 var(--spacing-sm)',
                  lineHeight: '36px',
                }}>
                  {formSlug}
                </span>
              )}
            </Field>
            {/* Context-dependent type/category fields */}
            {isGlobalElementRoute && (
              <>
                <Field label="Type">
                  <StyledSelect {...register('block_type')}>
                    {GLOBAL_ELEMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </StyledSelect>
                </Field>
                <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
                  <label className="flex items-center" style={{ gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                    <input type="checkbox" {...register('is_default')} />
                    <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
                      Set as default
                    </span>
                  </label>
                  {form.watch('is_default') && (
                    <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0, paddingLeft: 'var(--spacing-xl)' }}>
                      This block will auto-fill all {form.watch('block_type')} slots unless overridden by a layout.
                    </p>
                  )}
                </div>
              </>
            )}
            {!isGlobalElementRoute && !isElementRoute && blockCategories.length > 0 && (
              <Field label="Category">
                <StyledSelect {...register('block_category_id')}>
                  <option value="">(none)</option>
                  {blockCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </StyledSelect>
              </Field>
            )}
          </FormSection>

          <FormSection title="Code *" defaultOpen={false}>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const code = form.getValues('code')
                  if (code) { navigator.clipboard.writeText(code); toast({ type: 'info', message: 'Code copied' }) }
                }}
                className="flex items-center gap-1 border-0 bg-transparent"
                style={{
                  color: 'hsl(var(--text-link))',
                  fontSize: 'var(--text-xs-font-size)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Copy
              </button>
            </div>
            <textarea
              {...register('code')}
              rows={20}
              className="w-full outline-none"
              style={monoStyle}
              placeholder={'<style>\n  .block-container { padding: 40px; }\n</style>\n\n<div class="block-container">\n  <!-- Block content here -->\n</div>'}
            />
          </FormSection>

          <FormSection title="Animation & Interaction JS" defaultOpen={false}>
            <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
              Vanilla JS for scroll reveals, hover effects, parallax. Rendered as &lt;script type=&quot;module&quot;&gt;.
            </p>
            <textarea
              {...register('js')}
              rows={12}
              className="w-full outline-none"
              style={monoStyle}
              placeholder={"// Scoped to this block\nconst block = document.querySelector('.block-slug');\nconst io = new IntersectionObserver(...);\n// ..."}
            />
          </FormSection>

          <FormSection title="Advanced" defaultOpen={false}>
            {/* Price hook */}
            <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
              <label style={labelStyle}>Price Hook</label>
              <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                Bind dynamic pricing to an element in your block HTML.
              </p>
              <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                <input type="checkbox" {...register('hasPriceHook')} />
                <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
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
              <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                Bind dynamic links to elements. Selector targets the element, field is the data key.
              </p>
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
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <Plus size={14} />
                Add link hook
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />

            {/* Thumbnail */}
            <ThumbnailUpload
              url={form.watch('thumbnail_url')}
              onUpload={async (file) => {
                const url = await uploadFile(file)
                form.setValue('thumbnail_url', url, { shouldDirty: true })
                toast({ type: 'success', message: 'Thumbnail uploaded' })
              }}
              onRemove={() => form.setValue('thumbnail_url', '', { shouldDirty: true })}
              onError={(msg) => toast({ type: 'error', message: msg })}
            />

            <div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />

            {/* Metadata */}
            <Field label="Alt Text">
              <input {...register('alt')} className="w-full outline-none" style={inputStyle} placeholder="Alternative text description" />
            </Field>
            <Field label="Figma Node ID">
              <input {...register('figma_node')} className="w-full outline-none" style={inputStyle} placeholder="e.g. 1234:5678" />
            </Field>
          </FormSection>

          <div aria-hidden style={{ height: '32px', flexShrink: 0 }} />

        </div>

        {/* Process panel */}
        {showProcess && (
          <BlockImportPanel
            code={watchedCode ?? ''}
            js={form.getValues('js') ?? ''}
            previousImageUrls={existingBlock ? extractR2Urls(existingBlock) : []}
            onApply={(processedCode, js) => {
              form.setValue('code', processedCode, { shouldDirty: true })
              form.setValue('js', js, { shouldDirty: true })
              setShowProcess(false)
              toast({ type: 'success', message: 'Block processed — tokens applied' })
            }}
            onClose={() => setShowProcess(false)}
          />
        )}
        {showDeleteConfirm && existingBlock && (
          <DeleteConfirmModal
            title="Delete block"
            itemName={existingBlock.name}
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
      )}
      {activeTab === 'responsive' && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <ResponsiveTab block={existingBlock} />
        </div>
      )}

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
          {isDirty && (
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'hsl(var(--status-warning-fg))',
              flexShrink: 0,
            }} />
          )}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty || busy}
            className="border-0 bg-transparent disabled:opacity-40"
            style={{
              color: 'hsl(var(--text-secondary))',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: isDirty && !busy ? 'pointer' : 'default',
              padding: 0,
            }}
          >
            {isDirty ? 'Unsaved changes' : 'No changes'}
          </button>

          {existingBlock && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={busy}
              className="border-0 bg-transparent disabled:opacity-40"
              style={{
                color: 'hsl(var(--status-error-fg))',
                fontSize: 'var(--text-sm-font-size)',
                fontWeight: 'var(--font-weight-medium)',
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
          disabled={busy || !isDirty}
          loading={saving}
        >
          {saving ? 'Saving...' : isNew ? 'Create Block' : 'Save Changes'}
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
