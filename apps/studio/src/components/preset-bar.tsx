import { useState, useEffect } from 'react'
import { Save, Download, Trash2, Loader2 } from 'lucide-react'
import { Button, Tooltip } from '@cmsmasters/ui'
import { fetchPresets, fetchPreset, savePreset, deletePreset } from '../lib/block-api'
import type { PresetSummary } from '../lib/block-api'
import { StyledSelect } from './styled-select'
import { useToast } from './toast'

interface PresetBarProps {
  /** R2 preset type key: "theme-details" or "help-and-support" */
  type: string
  /** Current items to save */
  getItems: () => Array<{ icon_url: string; label: string; value: string }>
  /** Load items from preset */
  onLoad: (items: Array<{ icon_url: string; label: string; value: string }>) => void
}

export function PresetBar({ type, getItems, onLoad }: PresetBarProps) {
  const [presetList, setPresetList] = useState<PresetSummary[]>([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPresets(type).then(setPresetList).catch(() => {})
  }, [type])

  async function handleLoad() {
    if (!selectedSlug) return
    setLoading(true)
    try {
      const data = await fetchPreset(type, selectedSlug)
      onLoad(data.items)
      toast({ type: 'success', message: `Loaded "${data.name}"` })
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Load failed' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const items = getItems()
    if (items.length === 0) {
      toast({ type: 'error', message: 'Add items first' })
      return
    }
    const name = prompt('Preset name:')
    if (!name?.trim()) return

    setSaving(true)
    try {
      const result = await savePreset(type, name.trim(), items)
      toast({ type: 'success', message: `Saved "${result.name}"` })
      const updated = await fetchPresets(type)
      setPresetList(updated)
      setSelectedSlug(result.slug)
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedSlug) return
    const name = presetList.find((p) => p.slug === selectedSlug)?.name ?? selectedSlug
    if (!confirm(`Delete preset "${name}"?`)) return

    try {
      await deletePreset(type, selectedSlug)
      toast({ type: 'success', message: `Deleted "${name}"` })
      setSelectedSlug('')
      const updated = await fetchPresets(type)
      setPresetList(updated)
    } catch (err) {
      toast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
    }
  }

  return (
    <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
      <StyledSelect
        compact
        value={selectedSlug}
        onChange={(e) => setSelectedSlug(e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">Preset...</option>
        {presetList.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name}</option>
        ))}
      </StyledSelect>

      <Tooltip content="Load preset">
        <Button
          variant="ghost"
          size="mini"
          onClick={handleLoad}
          disabled={!selectedSlug || loading}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        </Button>
      </Tooltip>

      <Tooltip content="Save as preset">
        <Button
          variant="ghost"
          size="mini"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
        </Button>
      </Tooltip>

      {selectedSlug && (
        <Tooltip content="Delete preset">
          <Button
            variant="ghost"
            size="mini"
            onClick={handleDelete}
          >
            <Trash2 size={12} />
          </Button>
        </Tooltip>
      )}
    </div>
  )
}
