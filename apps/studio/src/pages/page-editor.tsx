import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { pageSchema, type CreatePagePayload } from '@cmsmasters/validators'
import type { Page, Block } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft, Plus, ArrowUp, ArrowDown, Trash2, Upload, Eye, Download, ExternalLink } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchPageById, createPageApi, updatePageApi, deletePageApi, fetchPageBlocks, updatePageBlocks } from '../lib/page-api'
import { fetchAllBlocks } from '../lib/block-api'
import { nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { FormSection } from '../components/form-section'
import { CharCounter } from '../components/char-counter'
import { EditorFooter } from '../components/editor-footer'
import { BlockPickerModal } from '../components/block-picker-modal'
import { DeleteConfirmModal } from '../components/delete-confirm-modal'
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
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
}

const LAYOUT_SCOPES = [
  { value: 'theme', label: 'Theme Page' },
] as const

const GLOBAL_SLOTS = ['header', 'footer', 'sidebar-left', 'sidebar-right']

function extractSlots(html: string): string[] {
  const slots: string[] = []
  function add(name: string) {
    const n = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (n && !slots.includes(n)) slots.push(n)
  }
  // 1. {{slot:name}} placeholders
  for (const m of html.matchAll(/\{\{slot:([a-z0-9-]+)\}\}/g)) add(m[1])
  // 2. <!-- SLOT: NAME --> HTML comments
  for (const m of html.matchAll(/<!--\s*SLOT:\s*([A-Za-z0-9-_ :]+?)\s*-->/g)) add(m[1])
  // 3. data-slot="name" attributes (most common in layout prototypes)
  for (const m of html.matchAll(/data-slot=["']([^"']+)["']/g)) add(m[1])
  return slots
}

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

function parseHtmlFile(content: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')
  const styles = Array.from(doc.querySelectorAll('style')).map(el => el.textContent ?? '').join('\n\n').trim()
  const body = doc.body?.innerHTML?.trim() ?? content
  const cleaned = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').trim()
  let code = ''
  if (styles) code += `<style>\n${styles}\n</style>\n\n`
  code += cleaned
  return code
}

interface BlockEntry {
  block_id: string
  position: number
  config: Record<string, unknown>
}

export function PageEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = !id

  // Detect type from URL path — /layouts/* = layout, /static-pages/* = composed
  const isLayoutRoute = location.pathname.includes('/layouts')
  const defaultType = isLayoutRoute ? 'layout' : 'composed'

  const [existingPage, setExistingPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Layout-specific state
  const [layoutCode, setLayoutCode] = useState('')
  const [layoutScope, setLayoutScope] = useState('theme')
  const [layoutSlots, setLayoutSlots] = useState<Record<string, string>>({})
  const [slotBlocks, setSlotBlocks] = useState<Block[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<CreatePagePayload>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      slug: '',
      title: '',
      type: defaultType,
      scope: defaultType === 'layout' ? 'theme' : '',
      html: '',
      css: '',
      seo: { title: '', description: '' },
      status: 'draft',
    },
  })

  const { register, control, reset, formState: { errors, isDirty } } = form

  // Block list state (composed pages only)
  const [blockEntries, setBlockEntries] = useState<BlockEntry[]>([])
  const [allBlocks, setAllBlocks] = useState<Block[]>([])
  const [blockPickerOpen, setBlockPickerOpen] = useState(false)

  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch existing page
  useEffect(() => {
    if (isNew) {
      setExistingPage(null)
      setFetchError(null)
      setLoading(false)
      reset({
        slug: '',
        title: '',
        type: defaultType,
        scope: defaultType === 'layout' ? 'theme' : '',
        html: '',
        css: '',
        seo: { title: '', description: '' },
        status: 'draft',
      })
      setBlockEntries([])
      setLayoutCode('')
      setLayoutScope('theme')
      return
    }
    let cancelled = false
    setLoading(true)
    setFetchError(null)

    fetchPageById(id)
      .then((page) => {
        if (cancelled) return
        setExistingPage(page)
        reset({
          slug: page.slug,
          title: page.title,
          type: page.type,
          scope: page.scope ?? '',
          html: page.html ?? '',
          css: page.css ?? '',
          seo: page.seo ?? { title: '', description: '' },
          status: page.status,
        })
        // Restore layout code from saved html+css
        if (page.type === 'layout' && (page.html || page.css)) {
          let code = ''
          if (page.css) code += `<style>\n${page.css}\n</style>\n\n`
          code += page.html ?? ''
          setLayoutCode(code)
        }
        if (page.scope) setLayoutScope(page.scope)
        if (page.layout_slots) setLayoutSlots(page.layout_slots as Record<string, string>)
        // Fetch page blocks for composed pages
        if (page.type === 'composed') {
          fetchPageBlocks(page.id)
            .then((blocks) => {
              if (!cancelled) {
                setBlockEntries(blocks.map((b) => ({
                  block_id: b.block_id,
                  position: b.position,
                  config: b.config ?? {},
                })))
              }
            })
            .catch(() => {})
        }
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : 'Failed to load page')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }

  }, [id, isNew])

  // Fetch all blocks for picker
  useEffect(() => {
    fetchAllBlocks().then((blocks) => {
      setAllBlocks(blocks)
      setSlotBlocks(blocks.filter((b) => !!b.block_type))
    }).catch(() => {})
  }, [])

  // Slug auto-generation (new pages only)
  const watchedTitle = useWatch({ control, name: 'title' })
  useEffect(() => {
    if (!isNew) return
    if (watchedTitle) {
      form.setValue('slug', nameToSlug(watchedTitle), { shouldDirty: false })
    }
  }, [watchedTitle, isNew, form])

  const watchedType = useWatch({ control, name: 'type' })
  const seoTitle = useWatch({ control, name: 'seo.title' }) ?? ''
  const seoDesc = useWatch({ control, name: 'seo.description' }) ?? ''
  const formSlug = useWatch({ control, name: 'slug' })

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // Block list helpers
  const blockMap = new Map(allBlocks.map((b) => [b.id, b]))

  function handleAddBlock(block: Block) {
    const nextPos = blockEntries.length > 0
      ? Math.max(...blockEntries.map((e) => e.position)) + 1
      : 1
    setBlockEntries([...blockEntries, { block_id: block.id, position: nextPos, config: {} }])
    setBlockPickerOpen(false)
  }

  function handleRemoveBlock(index: number) {
    const updated = blockEntries.filter((_, i) => i !== index)
    setBlockEntries(updated.map((e, i) => ({ ...e, position: i + 1 })))
  }

  function handleMoveBlock(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blockEntries.length) return
    const updated = [...blockEntries]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setBlockEntries(updated.map((e, i) => ({ ...e, position: i + 1 })))
  }

  function handleConfigChange(index: number, value: string) {
    try {
      const parsed = value.trim() ? JSON.parse(value) : {}
      const updated = [...blockEntries]
      updated[index] = { ...updated[index], config: parsed }
      setBlockEntries(updated)
    } catch {
      // Invalid JSON, ignore
    }
  }

  // Save draft
  async function handleSaveDraft() {
    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before saving' }); return }

    const data = form.getValues()
    const isLayout = data.type === 'layout'

    // For layout: split code into html+css
    let layoutHtml = ''
    let layoutCss = ''
    if (isLayout && layoutCode.trim()) {
      const split = splitCode(layoutCode)
      layoutHtml = split.html
      layoutCss = split.css
    }

    setSaving(true)
    try {
      if (existingPage) {
        const updatePayload: Record<string, unknown> = {
          title: data.title,
          status: data.status,
        }
        if (isLayout) {
          updatePayload.scope = layoutScope
          updatePayload.html = layoutHtml
          updatePayload.css = layoutCss
          updatePayload.layout_slots = layoutSlots
        } else {
          updatePayload.seo = data.seo
        }
        const saved = await updatePageApi(existingPage.id, updatePayload)
        if (!isLayout) {
          await updatePageBlocks(saved.id, blockEntries)
        }
        setExistingPage(saved)
        reset({
          slug: saved.slug,
          title: saved.title,
          type: saved.type,
          scope: saved.scope ?? '',
          html: saved.html ?? '',
          css: saved.css ?? '',
          seo: saved.seo ?? { title: '', description: '' },
          status: saved.status,
        })
      } else {
        const createPayload = {
          ...data,
          ...(isLayout ? { scope: layoutScope, html: layoutHtml, css: layoutCss, layout_slots: layoutSlots } : {}),
        }
        const saved = await createPageApi(createPayload)
        if (!isLayout && blockEntries.length > 0) {
          await updatePageBlocks(saved.id, blockEntries)
        }
        const basePath = isLayout ? '/layouts' : '/static-pages'
        navigate(`${basePath}/${saved.id}`, { replace: true })
      }
      toast({ type: 'success', message: 'Page saved' })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Publish
  async function handlePublish() {
    const valid = await form.trigger()
    if (!valid) { toast({ type: 'error', message: 'Fix validation errors before publishing' }); return }

    const data = form.getValues()
    const isLayout = data.type === 'layout'
    let layoutHtml = ''
    let layoutCss = ''
    if (isLayout && layoutCode.trim()) {
      const split = splitCode(layoutCode)
      layoutHtml = split.html
      layoutCss = split.css
    }

    setPublishing(true)
    try {
      if (existingPage) {
        const updatePayload: Record<string, unknown> = {
          title: data.title,
          status: 'published',
        }
        if (isLayout) {
          updatePayload.scope = layoutScope
          updatePayload.html = layoutHtml
          updatePayload.css = layoutCss
          updatePayload.layout_slots = layoutSlots
        } else {
          updatePayload.seo = data.seo
        }
        const saved = await updatePageApi(existingPage.id, updatePayload)
        if (!isLayout) {
          await updatePageBlocks(saved.id, blockEntries)
        }
        setExistingPage(saved)
        reset({
          slug: saved.slug,
          title: saved.title,
          type: saved.type,
          scope: saved.scope ?? '',
          html: saved.html ?? '',
          css: saved.css ?? '',
          seo: saved.seo ?? { title: '', description: '' },
          status: saved.status,
        })
      } else {
        const createPayload = {
          ...data,
          status: 'published' as const,
          ...(isLayout ? { scope: layoutScope, html: layoutHtml, css: layoutCss, layout_slots: layoutSlots } : {}),
        }
        const saved = await createPageApi(createPayload)
        if (!isLayout && blockEntries.length > 0) {
          await updatePageBlocks(saved.id, blockEntries)
        }
        const basePath = isLayout ? '/layouts' : '/static-pages'
        navigate(`${basePath}/${saved.id}`, { replace: true })
      }
      toast({ type: 'success', message: 'Page published' })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Publish failed' })
    } finally {
      setPublishing(false)
    }
  }

  // Delete
  async function handleDeleteConfirmed() {
    if (!existingPage) return
    setShowDeleteConfirm(false)
    setDeleting(true)
    try {
      await deletePageApi(existingPage.id)
      toast({ type: 'success', message: 'Page deleted' })
      navigate('/pages', { replace: true })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed' })
    } finally {
      setDeleting(false)
    }
  }

  // Discard
  function handleDiscard() {
    if (existingPage) {
      reset({
        slug: existingPage.slug,
        title: existingPage.title,
        type: existingPage.type,
        scope: existingPage.scope ?? '',
        html: existingPage.html ?? '',
        css: existingPage.css ?? '',
        seo: existingPage.seo ?? { title: '', description: '' },
        status: existingPage.status,
      })
      if (existingPage.type === 'layout') {
        let code = ''
        if (existingPage.css) code += `<style>\n${existingPage.css}\n</style>\n\n`
        code += existingPage.html ?? ''
        setLayoutCode(code)
        setLayoutScope(existingPage.scope ?? 'theme')
        setLayoutSlots(existingPage.layout_slots as Record<string, string> ?? {})
      }
    } else {
      reset({
        slug: '',
        title: '',
        type: defaultType,
        scope: '',
        html: '',
        css: '',
        seo: { title: '', description: '' },
        status: 'draft',
      })
      setBlockEntries([])
      setLayoutCode('')
      setLayoutScope('theme')
      setLayoutSlots({})
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
        <div
          className="shrink-0 border-b"
          style={{ height: '65px', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
        />
        <div style={{ display: 'flex', flex: 1, padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
          <div className="flex flex-col" style={{ flex: '2 1 480px', minWidth: 0, gap: 'var(--spacing-lg)' }}>
            {[120, 100, 200].map((h, i) => (
              <div key={i} className="animate-pulse" style={{ height: `${h}px`, backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }} />
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t" style={{ height: '65px', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }} />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <AlertTriangle size={48} style={{ color: 'hsl(var(--status-error-fg))' }} />
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', margin: 0 }}>{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/pages')}>Back to Pages</Button>
      </div>
    )
  }

  const isComposed = watchedType === 'composed'

  return (
    <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b"
        style={{ height: '65px', padding: '0 var(--spacing-xl)', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <Link to="/pages" className="flex items-center no-underline" style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}>
            <ChevronLeft size={18} />
            <span style={{ fontSize: 'var(--text-sm-font-size)' }}>Pages</span>
          </Link>
          <span style={{ color: 'hsl(var(--text-muted))' }}>/</span>
          <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
            {isNew ? 'New Page' : existingPage?.title ?? id}
          </span>
        </div>
        {formSlug && (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
            /pages/{formSlug}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-xl)', maxWidth: '720px' }}>
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>

          {/* Basic Info */}
          <FormSection title="Basic Info">
            <Field label="Title" error={errors.title?.message}>
              <input {...register('title')} className="w-full outline-none" style={inputStyle} placeholder={isComposed ? 'Page title' : 'Layout name'} />
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
            {/* Scope — layout only */}
            {!isComposed && (
              <Field label="Scope">
                <select
                  value={layoutScope}
                  onChange={(e) => setLayoutScope(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {LAYOUT_SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Status">
              <select {...register('status')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
          </FormSection>

          {/* Layout: HTML code + import/preview/export */}
          {!isComposed && (
            <>
              <FormSection title="Layout HTML">
                <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => {
                        const code = parseHtmlFile(reader.result as string)
                        setLayoutCode(code)
                        if (!form.getValues('title')) {
                          const name = file.name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')
                          form.setValue('title', name, { shouldDirty: true })
                          if (isNew) form.setValue('slug', nameToSlug(name), { shouldDirty: false })
                        }
                        toast({ type: 'success', message: `Imported ${file.name}` })
                      }
                      reader.readAsText(file)
                      e.target.value = ''
                    }}
                    style={{ display: 'none' }}
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={14} />
                    Import HTML
                  </Button>
                  <Button variant="outline" size="sm" disabled={!layoutCode.trim()} onClick={() => {
                    const name = form.getValues('title') || 'Layout Preview'
                    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n<title>${name}</title>\n<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />\n<style>*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; } body { font-family:'Manrope',system-ui,sans-serif; background:hsl(20 23% 97%); }\n${tokensCSS}\n${portalBlocksCSS}</style>\n</head>\n<body style="display:flex;justify-content:center;padding-top:200px">\n${layoutCode}\n</body>\n</html>`
                    const win = window.open('', '_blank')
                    if (win) { win.document.write(html); win.document.close() }
                  }}>
                    <Eye size={14} />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" disabled={!layoutCode.trim()} onClick={() => {
                    const name = form.getValues('title') || form.getValues('slug') || 'layout'
                    const blob = new Blob([`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>${name}</title>\n<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />\n<style>*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; } body { font-family:'Manrope',system-ui,sans-serif; }</style>\n</head>\n<body>\n${layoutCode}\n</body>\n</html>`], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${(name).replace(/\s+/g, '-').toLowerCase()}.html`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}>
                    <Download size={14} />
                    Export
                  </Button>
                </div>
                <textarea
                  value={layoutCode}
                  onChange={(e) => setLayoutCode(e.target.value)}
                  rows={20}
                  className="w-full outline-none"
                  style={monoStyle}
                  placeholder={'<style>\n  .layout-theme-page { display: grid; ... }\n</style>\n\n<div class="layout-theme-page">\n  {{slot:header}}\n  {{slot:sidebar-left}}\n  {{slot:content}}\n  {{slot:sidebar-right}}\n  {{slot:footer}}\n</div>'}
                />
              </FormSection>

              {/* Slot detection panel */}
              <SlotPanel
                code={layoutCode}
                layoutSlots={layoutSlots}
                onSlotChange={(slot, blockId) => {
                  setLayoutSlots((prev) => {
                    const next = { ...prev }
                    if (blockId) next[slot] = blockId
                    else delete next[slot]
                    return next
                  })
                }}
                blocks={slotBlocks}
              />
            </>
          )}

          {/* Composed: Block List */}
          {isComposed && (
            <FormSection title="Blocks">
              {blockEntries.length === 0 && (
                <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                  No blocks added yet. Add blocks to compose this page.
                </p>
              )}

              {blockEntries.map((entry, idx) => {
                const block = blockMap.get(entry.block_id)
                return (
                  <div
                    key={`${entry.block_id}-${idx}`}
                    className="flex items-center border"
                    style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      gap: 'var(--spacing-sm)',
                      borderColor: 'hsl(var(--border-default))',
                      borderRadius: 'var(--rounded-lg)',
                      backgroundColor: 'hsl(var(--bg-surface-alt))',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--text-muted))',
                        width: '24px',
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="flex-1 truncate"
                      style={{
                        fontSize: 'var(--text-sm-font-size)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'hsl(var(--text-primary))',
                      }}
                    >
                      {block?.name ?? entry.block_id}
                    </span>
                    <div className="flex items-center" style={{ gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, 'up')}
                        disabled={idx === 0}
                        className="flex items-center justify-center border-0 bg-transparent disabled:opacity-30"
                        style={{ width: '28px', height: '28px', cursor: idx === 0 ? 'default' : 'pointer', color: 'hsl(var(--text-muted))' }}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, 'down')}
                        disabled={idx === blockEntries.length - 1}
                        className="flex items-center justify-center border-0 bg-transparent disabled:opacity-30"
                        style={{ width: '28px', height: '28px', cursor: idx === blockEntries.length - 1 ? 'default' : 'pointer', color: 'hsl(var(--text-muted))' }}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="flex items-center justify-center border-0 bg-transparent"
                        style={{ width: '28px', height: '28px', cursor: 'pointer', color: 'hsl(var(--status-error-fg))' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}

              <Button variant="outline" size="sm" onClick={() => setBlockPickerOpen(true)}>
                <Plus size={14} />
                Add Block
              </Button>

              {/* Per-block config (JSON) */}
              {blockEntries.length > 0 && (
                <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                  <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Block Configs (JSON)
                  </span>
                  {blockEntries.map((entry, idx) => {
                    const block = blockMap.get(entry.block_id)
                    return (
                      <div key={`config-${idx}`} className="flex flex-col" style={{ gap: '4px' }}>
                        <label style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-secondary))' }}>
                          {block?.name ?? `Block ${idx + 1}`}
                        </label>
                        <textarea
                          defaultValue={Object.keys(entry.config).length > 0 ? JSON.stringify(entry.config, null, 2) : ''}
                          onBlur={(e) => handleConfigChange(idx, e.target.value)}
                          rows={2}
                          className="w-full resize-y outline-none"
                          style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)', font: 'var(--text-xs-font-size)/1.4 var(--font-family-monospace)' }}
                          placeholder="{}"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </FormSection>
          )}

          {/* SEO (composed only) */}
          {isComposed && (
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
          )}

          <div aria-hidden style={{ height: '32px', flexShrink: 0 }} />
        </div>
      </div>

      {/* Block Picker Modal */}
      {blockPickerOpen && (
        <BlockPickerModal
          onSelect={handleAddBlock}
          onClose={() => setBlockPickerOpen(false)}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && existingPage && (
        <DeleteConfirmModal
          title="Delete page"
          itemName={existingPage.title}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Footer */}
      <EditorFooter
        isDirty={isDirty || blockEntries.length > 0}
        isSaving={saving}
        isPublishing={publishing}
        isDeleting={deleting}
        isPublished={existingPage?.status === 'published'}
        onDiscard={handleDiscard}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={existingPage ? () => setShowDeleteConfirm(true) : undefined}
      />
    </div>
  )
}

const SLOT_TO_CATEGORY: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  'sidebar-left': 'sidebar',
  'sidebar-right': 'sidebar',
  element: 'element',
}

function SlotPanel({ code, layoutSlots, onSlotChange, blocks }: {
  code: string
  layoutSlots: Record<string, string>
  onSlotChange: (slot: string, blockId: string | null) => void
  blocks: Block[]
}) {
  const slots = useMemo(() => extractSlots(code), [code])
  if (slots.length === 0) return null

  return (
    <FormSection title={`Slot Assignments (${slots.length})`}>
      <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
        {slots.map((slot) => {
          const isGlobal = GLOBAL_SLOTS.includes(slot)
          const isContent = slot === 'content'
          const isMeta = slot.startsWith('meta:')
          const category = SLOT_TO_CATEGORY[slot]
          const categoryBlocks = category ? blocks.filter((b) => b.block_type === category) : []
          const selectedId = layoutSlots[slot] ?? ''

          return (
            <div
              key={slot}
              className="flex items-center justify-between border"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderColor: 'hsl(var(--border-default))',
                borderRadius: 'var(--rounded-lg)',
                backgroundColor: 'hsl(var(--bg-surface-alt))',
              }}
            >
              <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', minWidth: '120px' }}>
                <code style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-link))', backgroundColor: 'hsl(var(--bg-surface))', padding: '2px 6px', borderRadius: 'var(--rounded-sm)' }}>
                  {slot}
                </code>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs-font-size)' }}>
                {isGlobal && categoryBlocks.length > 0 ? (
                  <select
                    value={selectedId}
                    onChange={(e) => onSlotChange(slot, e.target.value || null)}
                    style={{
                      height: '28px',
                      padding: '0 var(--spacing-xs)',
                      fontSize: 'var(--text-xs-font-size)',
                      border: '1px solid hsl(var(--border-default))',
                      borderRadius: 'var(--rounded-md)',
                      backgroundColor: 'hsl(var(--input))',
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      minWidth: '160px',
                    }}
                  >
                    <option value="">(use default)</option>
                    {categoryBlocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.is_default ? ' ⭐' : ''}
                      </option>
                    ))}
                  </select>
                ) : isGlobal ? (
                  <Link to="/global-elements" className="flex items-center no-underline" style={{ gap: '4px', color: 'hsl(var(--text-link))' }}>
                    Create {category} blocks first
                    <ExternalLink size={11} />
                  </Link>
                ) : isContent ? (
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Template blocks per theme</span>
                ) : isMeta ? (
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Resolved from theme.meta</span>
                ) : (
                  <span style={{ color: 'hsl(var(--text-muted))' }}>Custom slot</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </FormSection>
  )
}

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
