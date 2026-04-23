// WP-027 Phase 2 — single iframe panel at a given breakpoint width.
//
// Mirrors tools/block-forge/src/components/PreviewPanel.tsx shape:
// - srcDoc (pre-composed by caller via composeSrcDoc)
// - sandbox="allow-scripts allow-same-origin" (CRITICAL: allow-scripts FIRST per
//   Brain ruling 5 + PARITY §3 — WP-026 order; do NOT mirror block-preview.tsx)
// - postMessage listener for "block-forge:iframe-height" → iframe height state
// - ResizeObserver on outer container → compute scale-to-fit clamp (scale DOWN
//   only; if container ≥ iframe width, render at 1×)
//
// DS-token discipline (Brain ruling 8): all chrome uses hsl(var(--...)),
// var(--spacing-*), var(--text-*-font-size). Dynamic width/height/transform
// are the sanctioned inline-style escape for truly-computed values per CONVENTIONS.

import { useEffect, useMemo, useRef, useState } from 'react'

interface PreviewPanelProps {
  /** Pre-composed iframe srcdoc from composeSrcDoc(...) */
  srcdoc: string
  /** Breakpoint width in px — 1440 | 768 | 375 */
  width: number
  /** Block slug — used for postMessage payload matching across panels */
  slug: string
  /** Optional label rendered above the iframe */
  label?: string
}

type HeightMsg = {
  type?: string
  slug?: string
  width?: number
  height?: number
}

export function PreviewPanel({ srcdoc, width, slug, label }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Iframe-reported content height (via postMessage from ResizeObserver in srcdoc)
  const [iframeHeight, setIframeHeight] = useState<number>(600)

  // Outer container width (via ResizeObserver on containerRef) for scale-to-fit
  const [containerWidth, setContainerWidth] = useState<number>(width)

  // Scale-to-fit: only shrink, never grow. If container ≥ iframe width, scale = 1.
  const scale = useMemo(
    () => (containerWidth < width ? containerWidth / width : 1),
    [containerWidth, width],
  )

  // Listen for height updates from the iframe's ResizeObserver.
  useEffect(() => {
    function onMessage(ev: MessageEvent<HeightMsg>) {
      const d = ev.data
      if (
        d?.type === 'block-forge:iframe-height' &&
        d.slug === slug &&
        d.width === width &&
        typeof d.height === 'number'
      ) {
        setIframeHeight(d.height)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [slug, width])

  // Watch outer container width for scale computation.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? width
      setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)',
        minWidth: 0, // allow flex parent to shrink us below natural width
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--text-muted))',
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          // Outer box reserves space for the scaled iframe — equal to scaled width × scaled height.
          width: width * scale,
          height: iframeHeight * scale,
          overflow: 'hidden',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 'var(--rounded-md)',
          background: 'white',
        }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcdoc}
          title={`${slug}-${width}`}
          sandbox="allow-scripts allow-same-origin"
          style={{
            width,
            height: iframeHeight,
            border: 0,
            display: 'block',
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  )
}
