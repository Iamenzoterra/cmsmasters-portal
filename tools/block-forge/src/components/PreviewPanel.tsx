// Phase 2 — single iframe at a given width. Uses composeSrcDoc + postMessage
// height sync.
//
// Overflow-aware sizing (post-tab refactor):
//   - Body inside iframe keeps `width: {bp}px` (layout simulation), but
//     `overflow-x: visible` allows content wider than `bp` to render past
//     the body box. The iframe runtime now also reports `contentWidth`
//     alongside `height` (see preview-assets.ts ResizeObserver).
//   - This panel sizes the iframe ELEMENT to `max(bp, contentWidth)` so any
//     overflow is rendered (not clipped by the iframe). The visible canvas
//     border + dashed BP marker keep the simulated BP boundary obvious.
//
// Inline styles for width/height are the DS-sanctioned escape for truly
// computed values per CONVENTIONS — they're not "hardcoded", they're the
// runtime-resolved layout output.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlockJson } from '../types'
import { composeSrcDoc } from '../lib/preview-assets'

type Props = {
  block: BlockJson
  width: number
  label: string
  /** Show the inline "Label · Npx" caption above the iframe. Defaults to true
   *  for backward compat; the tabbed PreviewTriptych passes `false` since the
   *  active tab already shows the same info. */
  showLabel?: boolean
}

type SizeMsg = {
  type?: string
  slug?: string
  width?: number
  height?: number
  contentWidth?: number
}

export function PreviewPanel({ block, width, label, showLabel = true }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState<number>(600)
  const [contentWidth, setContentWidth] = useState<number>(width)

  // Reset content-width on bp-change so an old (larger) measurement from a
  // previous block doesn't leak into the new render's first paint.
  useEffect(() => {
    setContentWidth(width)
  }, [width, block.slug])

  const srcDoc = useMemo(
    () =>
      composeSrcDoc({
        html: block.html,
        css: block.css,
        js: block.js,
        width,
        slug: block.slug,
      }),
    // composeSrcDoc included so Vite HMR on preview-assets.ts (where the iframe
    // IIFE lives) invalidates this memo and re-renders the iframe with new code.
    [block.html, block.css, block.js, block.slug, width, composeSrcDoc],
  )

  useEffect(() => {
    function onMessage(ev: MessageEvent<SizeMsg>) {
      const d = ev.data
      if (
        d?.type !== 'block-forge:iframe-height' ||
        d.slug !== block.slug ||
        d.width !== width
      ) {
        return
      }
      if (typeof d.height === 'number') setIframeHeight(d.height)
      if (typeof d.contentWidth === 'number') {
        setContentWidth(Math.max(width, d.contentWidth))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [block.slug, width])

  const overflows = contentWidth > width

  return (
    <div className="flex flex-col gap-2">
      {showLabel && (
        <div className="text-xs text-[hsl(var(--text-muted))]">
          {label} · {width}px
        </div>
      )}
      <div
        className="relative rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] shadow-[var(--shadow-sm)]"
        style={{ width: contentWidth }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={`${block.slug}-${width}`}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width: contentWidth,
            height: iframeHeight,
            border: 0,
            display: 'block',
          }}
        />
        {overflows && (
          <>
            <div
              aria-hidden="true"
              data-testid="preview-bp-marker"
              className="pointer-events-none absolute inset-y-0 z-10 border-r-2 border-dashed border-[hsl(var(--status-warn-fg))]"
              style={{ left: width - 2, width: 0 }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1 z-10 rounded bg-[hsl(var(--status-warn-bg))] px-1.5 py-0.5 text-[length:var(--text-xs-font-size)] font-medium text-[hsl(var(--status-warn-fg))]"
              style={{ left: width + 6 }}
            >
              overflow +{contentWidth - width}px
            </div>
          </>
        )}
      </div>
    </div>
  )
}
