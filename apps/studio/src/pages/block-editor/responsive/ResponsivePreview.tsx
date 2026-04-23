// WP-027 Phase 2 — 3-panel triptych (1440 / 768 / 375) + Path B variant composition.
//
// Engine integration (Brain ruling 1 — Path B):
//   renderForPreview(block, { variants })  ← single call; engine internally calls
//                                             composeVariants when variants non-empty.
//
// Brain ruling 3 (no width to renderForPreview):
//   renderForPreview's `{ width }` option wraps html in an EXTRA
//   <div style="max-width: Npx; margin: 0 auto">...</div>, causing triple-wrap
//   when passed through composeSrcDoc. Per-BP width is applied in composeSrcDoc's
//   body CSS only — here we pass ONLY { variants }.
//
// Brain ruling 7 (no live-form-edit coupling in Phase 2):
//   Preview reflects the `block` prop (DB snapshot) only. Accept/reject will
//   re-wire in Phase 4.

import { useMemo } from 'react'
import { renderForPreview, type Variant } from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'
import { composeSrcDoc } from './preview-assets'
import { PreviewPanel } from './PreviewPanel'

interface ResponsivePreviewProps {
  /** DB-loaded block; null when Responsive tab is opened on a brand-new block */
  block: Block | null
}

const BREAKPOINTS = [1440, 768, 375] as const

export function ResponsivePreview({ block }: ResponsivePreviewProps) {
  // Build srcdocs once per block change. Keyed on stable block fields (not
  // preview.html/css directly — engine returns new object refs every call which
  // would defeat the memo).
  const srcdocs = useMemo(() => {
    if (!block) return null

    const variantList: Variant[] = block.variants
      ? Object.entries(block.variants).map(([name, v]) => ({
          name,
          html: v.html,
          css: v.css,
        }))
      : []

    // Path B: single engine call, no manual composeVariants.
    // NO { width } option — see Brain ruling 3 (triple-wrap hazard).
    const preview = renderForPreview(
      {
        slug: block.slug,
        html: block.html ?? '',
        css: block.css ?? '',
      },
      { variants: variantList },
    )
    // preview.html is now pre-wrapped `<div data-block-shell="{slug}">...</div>`
    // (+ data-variant="base"/"{name}" descendants if variants non-empty).
    // preview.css has been stripGlobalPageRules'd.

    return BREAKPOINTS.map((w) => ({
      width: w,
      srcdoc: composeSrcDoc({
        html: preview.html,
        css: preview.css,
        width: w,
        slug: block.slug,
      }),
    }))
  }, [block?.id, block?.slug, block?.html, block?.css, block?.variants])

  if (!block || !srcdocs) {
    return (
      <div
        style={{
          padding: 'var(--spacing-xl)',
          color: 'hsl(var(--text-muted))',
          fontSize: 'var(--text-sm-font-size)',
        }}
      >
        Select a block to preview.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-xl)',
        overflowX: 'auto',
      }}
    >
      {srcdocs.map(({ width, srcdoc }) => (
        <PreviewPanel
          key={width}
          width={width}
          slug={block.slug}
          srcdoc={srcdoc}
          label={`${width}px`}
        />
      ))}
    </div>
  )
}
