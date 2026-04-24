// Phase 2 — 3 fixed-width preview panels (1440 / 768 / 375) side-by-side.
// Horizontal scroll expected on narrow viewports (~2623px combined).
// Auto-scale-to-fit is a Phase 2.x polish if friction emerges.
// WP-028 Phase 3 (interim) — when composedBlock.variants is non-empty, compose
// inline via `composeVariants(base, variantsList)` to get the multi-variant html+css
// with `data-variant` wrappers + `@container` reveal rules. Phase 3.5 replaces
// this inline call with `renderForPreview` for Path B re-converge.

import { useMemo } from 'react'
import { composeVariants } from '@cmsmasters/block-forge-core'
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
  // WP-028 Phase 3 — if variants present, compose once here; each PreviewPanel
  // consumes the already-composed html+css. `composeSrcDoc` still double-wraps
  // (<div class="slot-inner"><div data-block-shell>...</div></div>); Phase 3.5
  // drops the inner wrap + switches to `renderForPreview`.
  const previewBlock = useMemo<BlockJson | null>(() => {
    if (!block) return null
    if (!block.variants || Object.keys(block.variants).length === 0) return block
    const variantList = Object.entries(block.variants).map(([name, v]) => ({
      name,
      html: v.html,
      css: v.css,
    }))
    const composed = composeVariants(
      { slug: block.slug, html: block.html, css: block.css },
      variantList,
    )
    return { ...block, html: composed.html, css: composed.css }
  }, [block])

  if (!previewBlock) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--text-muted))]">
        Select a block to preview
      </div>
    )
  }

  return (
    <div className="flex gap-6 overflow-auto p-4">
      {BREAKPOINTS.map((bp) => (
        <PreviewPanel key={bp.width} block={previewBlock} width={bp.width} label={bp.label} />
      ))}
    </div>
  )
}
