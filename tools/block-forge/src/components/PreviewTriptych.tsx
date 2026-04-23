// Phase 2 — 3 fixed-width preview panels (1440 / 768 / 375) side-by-side.
// Horizontal scroll expected on narrow viewports (~2623px combined).
// Auto-scale-to-fit is a Phase 2.x polish if friction emerges.

import type { BlockJson } from '../types'
import { PreviewPanel } from './PreviewPanel'

const BREAKPOINTS = [
  { label: 'Desktop', width: 1440 },
  { label: 'Tablet', width: 768 },
  { label: 'Mobile', width: 375 },
] as const

type Props = {
  block: BlockJson | null
}

export function PreviewTriptych({ block }: Props) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--text-muted))]">
        Select a block to preview
      </div>
    )
  }

  return (
    <div className="flex gap-6 overflow-auto p-4">
      {BREAKPOINTS.map((bp) => (
        <PreviewPanel key={bp.width} block={block} width={bp.width} label={bp.label} />
      ))}
    </div>
  )
}
