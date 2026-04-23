// Phase 2 — block picker dropdown. Real-content only (Brain Q2=A).
// Reads `content/db/blocks/*.json` via the Vite middleware blocks API.
// No fixture exposure.
//
// Token fallbacks (Plan Correction — see phase-2-result.md):
//   --status-danger-fg → NOT present in tokens.css; use --status-error-fg (L123)
//   --bg-base          → NOT present; use --bg-surface (L97 — pure-white form surface)

import { useEffect, useState } from 'react'
import type { BlockListEntry } from '../lib/api-client'
import { listBlocks } from '../lib/api-client'

type Props = {
  selected: string | null
  onSelect: (slug: string) => void
}

export function BlockPicker({ selected, onSelect }: Props) {
  const [blocks, setBlocks] = useState<BlockListEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    listBlocks()
      .then((r) => {
        if (!cancelled) {
          setBlocks(r.blocks)
          setLoading(false)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="text-sm text-[hsl(var(--status-error-fg))]">
        Failed to load blocks: {error}
      </div>
    )
  }

  return (
    <label className="flex items-center gap-3">
      <span className="text-sm text-[hsl(var(--text-muted))]">Block:</span>
      <select
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-3 py-1 text-sm text-[hsl(var(--text-primary))]"
      >
        <option value="" disabled>
          {loading ? 'Loading…' : blocks.length === 0 ? 'No blocks found' : 'Select a block'}
        </option>
        {blocks.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name} ({b.slug})
          </option>
        ))}
      </select>
    </label>
  )
}
