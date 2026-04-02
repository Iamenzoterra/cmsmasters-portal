import { useState, useEffect } from 'react'
import type { Block, GlobalElement } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { Globe, Plus, Trash2 } from 'lucide-react'
import { fetchAllGlobalElements, createGlobalElementApi, updateGlobalElementApi, deleteGlobalElementApi } from '../lib/global-element-api'
import { fetchAllBlocks } from '../lib/block-api'
import { useToast } from '../components/toast'

const SLOTS = ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const

const SCOPE_PRESETS = [
  { value: 'sitewide', label: 'Sitewide', priority: 0 },
  { value: 'composed:*', label: 'All Composed Pages', priority: 10 },
  { value: 'layout:*', label: 'All Layout Pages', priority: 10 },
  { value: 'composed:homepage', label: 'Homepage', priority: 20 },
  { value: 'layout:themes', label: 'Themes Layout', priority: 20 },
]

const inputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 var(--spacing-sm)',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  fontSize: 'var(--text-sm-font-size)',
  color: 'hsl(var(--foreground))',
}

interface ElementRow {
  id?: string
  scope: string
  block_id: string
  priority: number
  isNew?: boolean
}

export function GlobalElementsSettings() {
  const [elements, setElements] = useState<GlobalElement[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Per-slot editing state
  const [slotRows, setSlotRows] = useState<Record<string, ElementRow[]>>({
    header: [],
    footer: [],
    'sidebar-left': [],
    'sidebar-right': [],
  })

  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchAllGlobalElements(), fetchAllBlocks()])
      .then(([ge, bl]) => {
        if (cancelled) return
        setElements(ge)
        setBlocks(bl)

        // Populate slot rows from fetched data
        const rows: Record<string, ElementRow[]> = {
          header: [],
          footer: [],
          'sidebar-left': [],
          'sidebar-right': [],
        }
        for (const el of ge) {
          if (rows[el.slot]) {
            rows[el.slot].push({
              id: el.id,
              scope: el.scope,
              block_id: el.block_id,
              priority: el.priority,
            })
          }
        }
        setSlotRows(rows)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  function handleAddRow(slot: string) {
    setSlotRows((prev) => ({
      ...prev,
      [slot]: [...prev[slot], { scope: 'sitewide', block_id: '', priority: 0, isNew: true }],
    }))
  }

  function handleRemoveRow(slot: string, index: number) {
    setSlotRows((prev) => ({
      ...prev,
      [slot]: prev[slot].filter((_, i) => i !== index),
    }))
  }

  function handleRowChange(slot: string, index: number, field: keyof ElementRow, value: string | number) {
    setSlotRows((prev) => ({
      ...prev,
      [slot]: prev[slot].map((row, i) => {
        if (i !== index) return row
        if (field === 'scope') {
          // Auto-set priority from preset
          const preset = SCOPE_PRESETS.find((p) => p.value === value)
          return { ...row, scope: value as string, priority: preset?.priority ?? row.priority }
        }
        return { ...row, [field]: value }
      }),
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Process each slot
      for (const slot of SLOTS) {
        const currentRows = slotRows[slot]
        const existingForSlot = elements.filter((e) => e.slot === slot)
        const existingIds = new Set(existingForSlot.map((e) => e.id))
        const keptIds = new Set(currentRows.filter((r) => r.id).map((r) => r.id))

        // Delete removed rows
        for (const id of existingIds) {
          if (!keptIds.has(id)) {
            await deleteGlobalElementApi(id)
          }
        }

        // Create or update rows
        for (const row of currentRows) {
          if (!row.block_id) continue

          if (row.id && !row.isNew) {
            await updateGlobalElementApi(row.id, {
              block_id: row.block_id,
              scope: row.scope,
              priority: row.priority,
            })
          } else {
            await createGlobalElementApi({
              slot,
              block_id: row.block_id,
              scope: row.scope,
              priority: row.priority,
            })
          }
        }
      }

      // Refresh data
      const ge = await fetchAllGlobalElements()
      setElements(ge)
      const rows: Record<string, ElementRow[]> = {
        header: [],
        footer: [],
        'sidebar-left': [],
        'sidebar-right': [],
      }
      for (const el of ge) {
        if (rows[el.slot]) {
          rows[el.slot].push({
            id: el.id,
            scope: el.scope,
            block_id: el.block_id,
            priority: el.priority,
          })
        }
      }
      setSlotRows(rows)

      toast({ type: 'success', message: 'Global elements saved' })
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--status-error-fg))' }}>{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col" style={{ gap: '4px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'var(--h3-font-size)',
              lineHeight: 'var(--h3-line-height)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            Global Elements
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              color: 'hsl(var(--text-secondary))',
            }}
          >
            Configure header, footer, and sidebar blocks for all pages
          </p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>
          Save All
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex w-full flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ height: '120px', backgroundColor: 'hsl(var(--bg-surface-alt))', borderRadius: 'var(--rounded-xl)' }} />
          ))}
        </div>
      )}

      {/* Slot sections */}
      {!loading && SLOTS.map((slot) => (
        <div
          key={slot}
          className="w-full border"
          style={{
            borderColor: 'hsl(var(--border-default))',
            borderRadius: 'var(--rounded-xl)',
            backgroundColor: 'hsl(var(--bg-surface))',
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ padding: 'var(--spacing-lg) var(--spacing-xl)' }}
          >
            <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
              <Globe size={18} style={{ color: 'hsl(var(--text-muted))' }} />
              <span
                style={{
                  fontSize: 'var(--text-base-font-size)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'hsl(var(--text-primary))',
                  textTransform: 'capitalize',
                }}
              >
                {slot.replace('-', ' ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAddRow(slot)}
              className="flex items-center border-0 bg-transparent"
              style={{
                gap: '4px',
                color: 'hsl(var(--text-link))',
                fontSize: 'var(--text-sm-font-size)',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              <Plus size={14} />
              Add Scope
            </button>
          </div>

          <div style={{ padding: '0 var(--spacing-xl) var(--spacing-xl)' }}>
            {slotRows[slot].length === 0 && (
              <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
                No assignments for this slot
              </p>
            )}

            <div className="flex flex-col" style={{ gap: 'var(--spacing-sm)' }}>
              {slotRows[slot].map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center"
                  style={{ gap: 'var(--spacing-sm)' }}
                >
                  {/* Scope */}
                  <select
                    value={SCOPE_PRESETS.some((p) => p.value === row.scope) ? row.scope : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        handleRowChange(slot, idx, 'scope', '')
                      } else {
                        handleRowChange(slot, idx, 'scope', e.target.value)
                      }
                    }}
                    style={{ ...inputStyle, flex: '0 0 180px' }}
                  >
                    {SCOPE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                    <option value="__custom__">Custom...</option>
                  </select>

                  {/* Custom scope input */}
                  {!SCOPE_PRESETS.some((p) => p.value === row.scope) && (
                    <input
                      type="text"
                      value={row.scope}
                      onChange={(e) => handleRowChange(slot, idx, 'scope', e.target.value)}
                      placeholder="e.g. composed:about"
                      className="outline-none"
                      style={{ ...inputStyle, flex: '0 0 160px' }}
                    />
                  )}

                  {/* Block picker */}
                  <select
                    value={row.block_id}
                    onChange={(e) => handleRowChange(slot, idx, 'block_id', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  >
                    <option value="">Select block...</option>
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>

                  {/* Priority */}
                  <input
                    type="number"
                    value={row.priority}
                    onChange={(e) => handleRowChange(slot, idx, 'priority', parseInt(e.target.value) || 0)}
                    min={0}
                    max={100}
                    className="outline-none"
                    style={{ ...inputStyle, flex: '0 0 64px', textAlign: 'center' }}
                    title="Priority (0-100)"
                  />

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(slot, idx)}
                    className="flex items-center justify-center border-0 bg-transparent"
                    style={{ width: '32px', height: '32px', cursor: 'pointer', color: 'hsl(var(--status-error-fg))', flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
