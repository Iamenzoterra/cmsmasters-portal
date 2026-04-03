import { useRef, useState, useEffect, useCallback } from 'react'
import { RotateCcw } from 'lucide-react'
// Import shared portal assets as raw strings for iframe injection
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../packages/ui/src/portal/animate-utils.js?raw'

interface BlockPreviewProps {
  html: string
  css?: string
  js?: string
  height?: number
  className?: string
  /** Zoom multiplier: 1 = 100% (1:1), 2 = 50% zoom out, 4 = 25% zoom out. Default: 1 */
  zoom?: number
  /** Show zoom controls. Default: false */
  showZoomControls?: boolean
  /** Allow scrolling the preview content. Default: false */
  scrollable?: boolean
  /**
   * Interactive mode: enables scripts, pointer events, and animations.
   * Use for live previews where user should see real block behavior.
   * Default: false (static thumbnail mode — scripts blocked, animations frozen)
   */
  interactive?: boolean
}

const ZOOM_STEPS = [1, 1.5, 2, 3, 4]
const ZOOM_LABELS: Record<number, string> = { 1: '100%', 1.5: '67%', 2: '50%', 3: '33%', 4: '25%' }

export function BlockPreview({
  html,
  css = '',
  js = '',
  height = 300,
  className,
  zoom: initialZoom = 1,
  showZoomControls = false,
  scrollable = false,
  interactive = false,
}: BlockPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(280)
  const [zoom, setZoom] = useState(initialZoom)
  const [replayKey, setReplayKey] = useState(0)

  const replay = useCallback(() => setReplayKey((k) => k + 1), [])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const renderWidth = containerWidth * zoom
  const scale = containerWidth / renderWidth
  const iframeHeight = scrollable ? 4000 : height / scale
  const scaledHeight = iframeHeight * scale

  // Animation-killing CSS (only for static/thumbnail mode)
  const staticAnimationOverride = `
    .reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-bounce, .reveal-finger, .reveal-dashed,
    [class*="reveal"] {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }`

  // In interactive mode: include block JS, allow animations
  const scriptTag = interactive && js
    ? `<script type="module">${js}</script>`
    : ''

  // IntersectionObserver bootstrap for interactive mode (triggers reveal animations)
  const ioBootstrap = interactive ? `
    <script>
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
      }, { threshold: 0.1 });
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-bounce, .reveal-finger, .reveal-dashed, [class*="reveal"]')
        .forEach(el => observer.observe(el));
      // Also trigger stagger parents
      document.querySelectorAll('.reveal-stagger').forEach(parent => {
        const so = new IntersectionObserver((entries) => {
          entries.forEach(e => { if (e.isIntersecting) e.target.querySelectorAll('.reveal').forEach(c => c.classList.add('visible')); });
        }, { threshold: 0.1 });
        so.observe(parent);
      });
    </script>` : ''

  // In interactive mode, inject shared portal assets (tokens + component classes)
  const sharedStyles = interactive ? `${tokensCSS}\n${portalBlocksCSS}` : ''
  // Make animate-utils available as inline module for block JS imports
  const animateModule = interactive && js
    ? `<script type="module">
// Shared animate-utils — inlined for iframe context
${animateUtilsJS}
</script>` : ''

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${renderWidth}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      width: ${renderWidth}px;
      overflow: hidden;
      background: white;
    }
    ${sharedStyles}
    ${css}
    ${interactive ? '' : staticAnimationOverride}
  </style>
</head>
<body>${html}
${animateModule}
${ioBootstrap}
${scriptTag}
</body>
</html>`

  const sandbox = interactive
    ? 'allow-same-origin allow-scripts'
    : 'allow-same-origin'

  return (
    <div className={`flex flex-col ${className ?? ''}`} style={{ width: '100%' }}>
      {(showZoomControls || interactive) && (
        <div
          className="flex shrink-0 items-center justify-end"
          style={{ gap: 'var(--spacing-xs)', padding: '0 0 var(--spacing-xs)' }}
        >
          {interactive && (
            <button
              type="button"
              onClick={replay}
              className="flex items-center border-0 bg-transparent"
              style={{
                gap: '3px',
                fontSize: '11px',
                color: 'hsl(var(--text-link))',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 'var(--rounded-sm)',
                marginRight: 'auto',
              }}
            >
              <RotateCcw size={11} />
              Replay
            </button>
          )}
          {showZoomControls && ZOOM_STEPS.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setZoom(step)}
              className="border-0"
              style={{
                fontSize: '11px',
                fontWeight: zoom === step ? 'var(--font-weight-semibold)' : 'var(--font-weight-regular)',
                color: zoom === step ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                backgroundColor: zoom === step ? 'hsl(var(--bg-surface-alt))' : 'transparent',
                padding: '2px 6px',
                borderRadius: 'var(--rounded-sm)',
                cursor: 'pointer',
              }}
            >
              {ZOOM_LABELS[step]}
            </button>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: `${height}px`,
          overflow: scrollable ? 'auto' : 'hidden',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 'var(--rounded-lg)',
          backgroundColor: 'white',
        }}
      >
        <div style={{ width: '100%', height: scrollable ? `${scaledHeight}px` : undefined, position: 'relative' }}>
          <iframe
            key={replayKey}
            srcDoc={srcdoc}
            sandbox={sandbox}
            title="Block preview"
            style={{
              width: `${renderWidth}px`,
              height: `${iframeHeight}px`,
              border: 'none',
              overflow: 'hidden',
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              pointerEvents: interactive ? 'auto' : 'none',
              display: 'block',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          />
        </div>
      </div>
    </div>
  )
}
