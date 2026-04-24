// Phase 2 — 3 fixed-width preview panels (1440 / 768 / 375) side-by-side.
// Horizontal scroll expected on narrow viewports (~2623px combined).
// Auto-scale-to-fit is a Phase 2.x polish if friction emerges.
// WP-028 Phase 3.5 — Path B re-converge: drop the inline `composeVariants` from
// Phase 3; call `renderForPreview(block, { variants })` upstream. The engine
// absorbs composeVariants + emits the `<div data-block-shell="{slug}">…</div>`
// wrap via wrapBlockHtml. composeSrcDoc now receives pre-wrapped html and adds
// only the outer `.slot-inner` container. Mirrors Studio ResponsivePreview.

import { useMemo } from 'react'
import { renderForPreview, type Variant } from '@cmsmasters/block-forge-core'
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
  // WP-028 Phase 3.5 — Path B: engine single-call. composeVariants runs inside
  // renderForPreview when variantList is non-empty; output html is pre-wrapped
  // with `<div data-block-shell="{slug}">…</div>`. PreviewPanel's composeSrcDoc
  // then adds only the outer `.slot-inner` wrap (single-wrap, matches Studio).
  //
  // Ruling 3.5-β — NO { width } option. WP-027 Ruling 3 flagged it as a
  // triple-wrap hazard: composeSrcDoc already re-emits width per-panel, so
  // letting renderForPreview wrap via width would duplicate the containment.
  const previewBlock = useMemo<BlockJson | null>(() => {
    if (!block) return null
    const variantList: Variant[] = block.variants
      ? Object.entries(block.variants).map(([name, v]) => ({
          name,
          html: v.html,
          css: v.css,
        }))
      : []
    const preview = renderForPreview(
      { slug: block.slug, html: block.html, css: block.css },
      { variants: variantList },
    )
    // preview.html is now pre-wrapped <div data-block-shell="{slug}">...</div>
    // (+ data-variant="base"/"{name}" descendants when variants non-empty).
    return { ...block, html: preview.html, css: preview.css }
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
