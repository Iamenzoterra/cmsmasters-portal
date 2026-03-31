import { useRef, useState, useEffect } from 'react'

interface BlockPreviewProps {
  html: string
  css?: string
  height?: number
  className?: string
}

export function BlockPreview({ html, css = '', height = 300, className }: BlockPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(280)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setContainerWidth(w)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Render at 2x container width for detail, scale down to fit
  const renderWidth = containerWidth * 2
  const scale = containerWidth / renderWidth
  const iframeHeight = height / scale

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
      overflow-x: hidden;
    }
    ${css}
    /* Preview: force all animated elements visible (scripts are stripped) */
    .reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-bounce, .reveal-finger, .reveal-dashed,
    [class*="reveal"] {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  </style>
</head>
<body>${html}</body>
</html>`

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden',
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-lg)',
        backgroundColor: 'white',
      }}
    >
      <iframe
        srcDoc={srcdoc}
        sandbox="allow-same-origin"
        title="Block preview"
        style={{
          width: `${renderWidth}px`,
          height: `${iframeHeight}px`,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          pointerEvents: 'none',
          display: 'block',
        }}
      />
    </div>
  )
}
