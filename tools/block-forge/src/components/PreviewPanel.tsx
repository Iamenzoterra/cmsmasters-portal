// Phase 2 — single iframe at a given width. Uses composeSrcDoc + postMessage
// height sync. Two inline-style values (width + dynamic height) are the
// DS-sanctioned escape for truly-computed values per CONVENTIONS.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlockJson } from '../types'
import { composeSrcDoc } from '../lib/preview-assets'

type Props = {
  block: BlockJson
  width: number
  label: string
}

type HeightMsg = {
  type?: string
  slug?: string
  width?: number
  height?: number
}

export function PreviewPanel({ block, width, label }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState<number>(600)

  const srcDoc = useMemo(
    () =>
      composeSrcDoc({
        html: block.html,
        css: block.css,
        js: block.js,
        width,
        slug: block.slug,
      }),
    [block.html, block.css, block.js, block.slug, width],
  )

  useEffect(() => {
    function onMessage(ev: MessageEvent<HeightMsg>) {
      const d = ev.data
      if (
        d?.type === 'block-forge:iframe-height' &&
        d.slug === block.slug &&
        d.width === width &&
        typeof d.height === 'number'
      ) {
        setIframeHeight(d.height)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [block.slug, width])

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-[hsl(var(--text-muted))]">
        {label} · {width}px
      </div>
      <div
        className="overflow-hidden rounded border border-[hsl(var(--border-default))]"
        style={{ width }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={`${block.slug}-${width}`}
          sandbox="allow-scripts allow-same-origin"
          style={{ width, height: iframeHeight, border: 0, display: 'block' }}
        />
      </div>
    </div>
  )
}
