interface BlockPreviewProps {
  html: string
  css?: string
  height?: number
  className?: string
}

export function BlockPreview({ html, css = '', height = 300, className }: BlockPreviewProps) {
  const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; overflow: hidden; }
    ${css}
  </style>
</head>
<body>${html}</body>
</html>`

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-same-origin"
      title="Block preview"
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-lg)',
        backgroundColor: 'white',
        pointerEvents: 'none',
      }}
    />
  )
}
