import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import type { Template, Block, TemplatePosition } from '@cmsmasters/db'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { fetchTemplateById, createTemplateApi, updateTemplateApi, deleteTemplateApi } from '../lib/template-api'
import { fetchAllBlocks } from '../lib/block-api'
import { nameToSlug } from '../lib/form-defaults'
import { useToast } from '../components/toast'
import { FormSection } from '../components/form-section'
import { PositionGrid } from '../components/position-grid'
import { BlockPickerModal } from '../components/block-picker-modal'
import { DeleteConfirmModal } from '../components/delete-confirm-modal'

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

interface TemplateFormData {
  name: string
  slug: string
  description: string
  max_positions: number
}

function getDefaults(): TemplateFormData {
  return { name: '', slug: '', description: '', max_positions: 20 }
}

function templateToFormData(t: Template): TemplateFormData {
  return {
    name: t.name,
    slug: t.slug,
    description: t.description ?? '',
    max_positions: t.max_positions,
  }
}

export function TemplateEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [existingTemplate, setExistingTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [allBlocks, setAllBlocks] = useState<Block[]>([])

  // Positions state (separate from RHF — M1 cut: synced explicitly)
  const [positions, setPositions] = useState<TemplatePosition[]>([])
  const [positionsDirty, setPositionsDirty] = useState(false)

  // Block picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<number | null>(null)

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const form = useForm<TemplateFormData>({ defaultValues: getDefaults() })
  const { register, control, reset, formState: { errors, isDirty } } = form

  // Slug auto-generation
  const watchedName = useWatch({ control, name: 'name' })
  useEffect(() => {
    if (!isNew) return
    if (watchedName) form.setValue('slug', nameToSlug(watchedName), { shouldDirty: false })
  }, [watchedName, isNew, form])

  const formSlug = useWatch({ control, name: 'slug' })
  const watchedMaxPositions = useWatch({ control, name: 'max_positions' })

  const { toast } = useToast()

  // Fetch blocks (for position grid + picker)
  useEffect(() => {
    fetchAllBlocks().then(setAllBlocks).catch(() => {})
  }, [])

  // Fetch existing template — M1 cut: sync form AND positions together
  useEffect(() => {
    if (isNew) return
    let cancelled = false
    setLoading(true)

    fetchTemplateById(id)
      .then((template) => {
        if (cancelled) return
        setExistingTemplate(template)
        reset(templateToFormData(template))
        setPositions(template.positions)
        setPositionsDirty(false)
      })
      .catch((error) => {
        if (!cancelled) setFetchError(error instanceof Error ? error.message : 'Failed to load template')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id, isNew, reset])

  // beforeunload guard
  const anyDirty = isDirty || positionsDirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (anyDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [anyDirty])

  // M3 cut: max_positions reduction guard
  const handleMaxPositionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseInt(e.target.value, 10)
    if (isNaN(newMax) || newMax < 1) return

    const highestFilled = positions
      .filter((p) => p.block_id)
      .reduce((max, p) => Math.max(max, p.position), 0)

    if (newMax < highestFilled) {
      const count = positions.filter((p) => p.block_id && p.position > newMax).length
      const confirmed = globalThis.confirm(
        `${count} position${count > 1 ? 's' : ''} above position ${newMax} have blocks assigned. They will be removed. Continue?`
      )
      if (!confirmed) return
      // Drop positions above new max
      setPositions((prev) => prev.filter((p) => p.position <= newMax))
      setPositionsDirty(true)
    }

    form.setValue('max_positions', newMax, { shouldDirty: true })
  }, [positions, form])

  // Position grid callbacks
  function handleAssignBlock(pos: number) {
    setPickerPosition(pos)
    setPickerOpen(true)
  }

  function handleBlockSelected(block: Block) {
    if (pickerPosition === null) return
    setPositions((prev) => {
      const filtered = prev.filter((p) => p.position !== pickerPosition)
      return [...filtered, { position: pickerPosition, block_id: block.id }]
    })
    setPositionsDirty(true)
    setPickerOpen(false)
    setPickerPosition(null)
  }

  function handleRemoveBlock(pos: number) {
    setPositions((prev) => prev.filter((p) => p.position !== pos))
    setPositionsDirty(true)
  }

  // Save — M1 cut: one submit boundary
  async function handleSave() {
    const data = form.getValues()

    if (!data.name.trim()) {
      toast({ type: 'error', message: 'Name is required' })
      return
    }
    if (isNew && !data.slug.trim()) {
      toast({ type: 'error', message: 'Slug is required' })
      return
    }

    setSaving(true)
    try {
      const maxPos = data.max_positions
      const filteredPositions = positions.filter((p) => p.position <= maxPos)

      if (isNew) {
        const saved = await createTemplateApi({
          slug: data.slug,
          name: data.name,
          description: data.description || undefined,
          positions: filteredPositions,
          max_positions: maxPos,
        })
        navigate(`/templates/${saved.id}`, { replace: true })
        toast({ type: 'success', message: 'Template created' })
      } else {
        const saved = await updateTemplateApi(id, {
          name: data.name,
          description: data.description || undefined,
          positions: filteredPositions,
          max_positions: maxPos,
        })
        // M1 cut: sync both form AND positions after save
        setExistingTemplate(saved)
        reset(templateToFormData(saved))
        setPositions(saved.positions)
        setPositionsDirty(false)
        toast({ type: 'success', message: 'Template saved' })
      }
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteConfirmed() {
    if (!existingTemplate) return
    setShowDeleteConfirm(false)
    setDeleting(true)
    try {
      await deleteTemplateApi(existingTemplate.id)
      toast({ type: 'success', message: 'Template deleted' })
      navigate('/templates', { replace: true })
    } catch (error) {
      toast({ type: 'error', message: error instanceof Error ? error.message : 'Delete failed' })
    } finally {
      setDeleting(false)
    }
  }

  function handleDiscard() {
    if (existingTemplate) {
      reset(templateToFormData(existingTemplate))
      setPositions(existingTemplate.positions)
    } else {
      reset(getDefaults())
      setPositions([])
    }
    setPositionsDirty(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
        <div className="shrink-0 border-b" style={{ height: '65px', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }} />
        <div className="flex flex-1" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
          <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--spacing-lg)', maxWidth: '900px' }}>
            {[180, 300].map((h, i) => (
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
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
          {fetchError}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/templates')}>Back to Templates</Button>
      </div>
    )
  }

  const busy = saving || deleting

  return (
    <div className="flex flex-col" style={{ margin: 'calc(-1 * var(--spacing-3xl)) calc(-1 * var(--spacing-4xl))', minHeight: 'calc(100% + 2 * var(--spacing-3xl))' }}>
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b"
        style={{ height: '65px', padding: '0 var(--spacing-xl)', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <Link to="/templates" className="flex items-center no-underline" style={{ color: 'hsl(var(--text-secondary))', gap: '4px' }}>
            <ChevronLeft size={18} />
            <span style={{ fontSize: 'var(--text-sm-font-size)', fontFamily: "'Manrope', sans-serif" }}>Templates</span>
          </Link>
          <span style={{ color: 'hsl(var(--text-muted))' }}>/</span>
          <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
            {isNew ? 'New Template' : existingTemplate?.name ?? id}
          </span>
        </div>
        {formSlug && (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif" }}>
            {formSlug}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-y-auto" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-xl)' }}>
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 'var(--spacing-lg)', maxWidth: '900px' }}>

          <FormSection title="Basic Info">
            <Field label="Name *" error={errors.name?.message}>
              <input {...register('name', { required: 'Name is required' })} className="w-full outline-none" style={inputStyle} placeholder="Template name" />
            </Field>
            <Field label="Slug" error={errors.slug?.message}>
              {isNew ? (
                <input {...register('slug')} className="w-full outline-none" style={inputStyle} placeholder="auto-generated-slug" />
              ) : (
                <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", padding: '0 var(--spacing-sm)', lineHeight: '36px' }}>
                  {formSlug}
                </span>
              )}
            </Field>
            <Field label="Description">
              <textarea
                {...register('description')}
                rows={3}
                className="w-full resize-y outline-none"
                style={{ ...inputStyle, height: 'auto', padding: 'var(--spacing-sm)' }}
                placeholder="Template description..."
              />
            </Field>
            <Field label="Max Positions">
              <input
                type="number"
                min={1}
                max={100}
                value={watchedMaxPositions}
                onChange={handleMaxPositionsChange}
                className="w-full outline-none"
                style={{ ...inputStyle, maxWidth: '120px' }}
              />
            </Field>
          </FormSection>

          <FormSection title="Positions">
            <PositionGrid
              maxPositions={watchedMaxPositions || 20}
              positions={positions}
              blocks={allBlocks}
              onAssignBlock={handleAssignBlock}
              onRemoveBlock={handleRemoveBlock}
            />
          </FormSection>

          <div aria-hidden style={{ height: '32px', flexShrink: 0 }} />
        </div>

        {/* Block picker modal */}
        {pickerOpen && (
          <BlockPickerModal
            onSelect={handleBlockSelected}
            onClose={() => { setPickerOpen(false); setPickerPosition(null) }}
            excludeIds={positions.filter((p) => p.block_id).map((p) => p.block_id!)}
          />
        )}

        {/* Delete confirm modal */}
        {showDeleteConfirm && existingTemplate && (
          <DeleteConfirmModal
            title="Delete template"
            itemName={existingTemplate.name}
            onConfirm={handleDeleteConfirmed}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>

      {/* Footer */}
      <div
        className="flex shrink-0 items-center justify-between border-t"
        style={{ height: '65px', padding: '0 var(--spacing-xl)', borderColor: 'hsl(var(--border-default))', backgroundColor: 'hsl(var(--bg-surface))' }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          {anyDirty && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'hsl(var(--status-warning-fg))', flexShrink: 0 }} />
          )}
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!anyDirty || busy}
            className="border-0 bg-transparent disabled:opacity-40"
            style={{ color: 'hsl(var(--text-secondary))', fontSize: 'var(--text-sm-font-size)', fontWeight: 500, fontFamily: "'Manrope', sans-serif", cursor: anyDirty && !busy ? 'pointer' : 'default', padding: 0 }}
          >
            {anyDirty ? 'Unsaved changes' : 'No changes'}
          </button>
          {existingTemplate && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={busy}
              className="border-0 bg-transparent disabled:opacity-40"
              style={{ color: 'hsl(var(--status-error-fg))', fontSize: 'var(--text-sm-font-size)', fontWeight: 500, fontFamily: "'Manrope', sans-serif", cursor: busy ? 'default' : 'pointer', padding: 0 }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={busy || !anyDirty} loading={saving}>
          {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save Changes'}
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
