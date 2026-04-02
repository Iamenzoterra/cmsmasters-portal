import { useState, useMemo, useCallback } from 'react'
import { Check, AlertTriangle, Upload, Loader2, Download } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { BlockPreview } from './block-preview'
import {
  scanCSS,
  scanHTML,
  applyCSS,
  extractImages,
  replaceImages,
  type Suggestion,
  type ImageRef,
} from '../lib/block-processor'
import { uploadImageBatch, type BatchUploadResult } from '../lib/block-api'

interface BlockImportPanelProps {
  code: string                          // current HTML+CSS (combined with <style>)
  js: string                            // current JS (separate from code)
  onApply: (processedCode: string, js: string) => void
  onClose: () => void
}

/** Split combined code into html + css + js */
function splitCode(code: string): { html: string; css: string; js: string } {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let css = ''
  let match
  while ((match = styleRegex.exec(code)) !== null) {
    css += (css ? '\n\n' : '') + match[1].trim()
  }

  // Extract <script> and <script type="module"> content
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
  let js = ''
  let scriptMatch
  while ((scriptMatch = scriptRegex.exec(code)) !== null) {
    const content = scriptMatch[1].trim()
    if (content) js += (js ? '\n\n' : '') + content
  }

  const html = code
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .trim()

  return { html, css, js }
}

/** Combine html + css + js back into single code string */
function combineCode(html: string, css: string, js: string): string {
  let result = ''
  if (css.trim()) result += `<style>\n${css}\n</style>\n\n`
  result += html
  if (js.trim()) result += `\n\n<script type="module">\n${js}\n</script>`
  return result
}

/** Export block as standalone HTML file */
function exportAsHtml(html: string, css: string, js: string, name: string): void {
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Manrope', system-ui, sans-serif; }
${css}
  </style>
</head>
<body>
${html}
${js ? `<script type="module">\n${js}\n</script>` : ''}
</body>
</html>`

  const blob = new Blob([doc], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name || 'block'}.html`
  a.click()
  URL.revokeObjectURL(url)
}

const CONFIDENCE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  exact: { label: 'exact', color: 'hsl(var(--status-success-fg))', bg: 'hsl(var(--status-success-bg))' },
  close: { label: 'close', color: 'hsl(var(--status-warn-fg))', bg: 'hsl(var(--status-warn-bg))' },
  approximate: { label: 'approx', color: 'hsl(var(--status-error-fg))', bg: 'hsl(var(--status-error-bg))' },
}

const CATEGORY_LABEL: Record<string, string> = {
  color: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing',
  radius: 'Border Radius',
  shadow: 'Shadows',
  component: 'Components',
}

export function BlockImportPanel({ code, js: jsProp, onApply, onClose }: BlockImportPanelProps) {
  const { html: originalHtml, css: originalCss, js: codeJs } = useMemo(() => splitCode(code), [code])
  // JS from prop takes priority (even empty string = intentionally cleared).
  // Only fall back to codeJs when prop is null/undefined (legacy blocks with no js field).
  const originalJs = jsProp != null ? jsProp : codeJs

  // Token suggestions + component suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => [
    ...scanCSS(originalCss),
    ...scanHTML(originalHtml, originalCss),
  ])

  // Image state
  const images = useMemo(() => extractImages(originalHtml, originalCss), [originalHtml, originalCss])
  const [imageResults, setImageResults] = useState<BatchUploadResult[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Toggle a suggestion
  const toggleSuggestion = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    )
  }, [])

  // Toggle all
  const toggleAll = useCallback((enabled: boolean) => {
    setSuggestions((prev) => prev.map((s) => ({ ...s, enabled })))
  }, [])

  // Compute processed CSS (live, for After preview)
  const processedCss = useMemo(() => applyCSS(originalCss, suggestions), [originalCss, suggestions])

  // Compute processed HTML (with replaced image URLs if uploaded)
  const imageUrlMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const r of imageResults) {
      if (r.uploaded && !r.error) {
        map[r.original] = r.uploaded
      }
    }
    return map
  }, [imageResults])

  const { html: processedHtml, css: finalCss } = useMemo(() => {
    if (Object.keys(imageUrlMap).length === 0) {
      return { html: originalHtml, css: processedCss }
    }
    return replaceImages(originalHtml, processedCss, imageUrlMap)
  }, [originalHtml, processedCss, imageUrlMap])

  // Upload images
  async function handleUploadImages() {
    const urls = images.map((img) => img.original).filter((url) => !url.startsWith('data:'))
    if (urls.length === 0) return

    setUploading(true)
    setUploadError(null)
    try {
      const results = await uploadImageBatch(urls)
      setImageResults(results)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Apply processed code back to form — JS separate, not embedded in code
  function handleApply() {
    const finalCode = combineCode(processedHtml, finalCss, '')
    onApply(finalCode, originalJs)
  }

  // Export as standalone HTML
  function handleExport() {
    exportAsHtml(processedHtml, finalCss, originalJs, 'processed-block')
  }

  // Group suggestions by category
  const grouped = useMemo(() => {
    const map = new Map<string, Suggestion[]>()
    for (const s of suggestions) {
      const arr = map.get(s.category) || []
      arr.push(s)
      map.set(s.category, arr)
    }
    return map
  }, [suggestions])

  const enabledCount = suggestions.filter((s) => s.enabled).length
  const imagesUploaded = imageResults.filter((r) => r.uploaded && !r.error).length

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: 'hsl(var(--bg-surface))' }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b"
        style={{
          height: '56px',
          padding: '0 var(--spacing-xl)',
          borderColor: 'hsl(var(--border-default))',
        }}
      >
        <div className="flex items-center" style={{ gap: 'var(--spacing-md)' }}>
          <span
            style={{
              fontSize: 'var(--text-base-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            Process Block
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
            }}
          >
            {suggestions.length} suggestions, {enabledCount} enabled
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} />
            Export HTML
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply}>
            <Check size={14} />
            Apply & Close
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Split Preview */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{ borderRight: '1px solid hsl(var(--border-default))' }}
        >
          <div className="flex flex-1 overflow-hidden">
            {/* Before */}
            <div className="flex flex-1 flex-col overflow-hidden" style={{ borderRight: '1px solid hsl(var(--border-default))' }}>
              <div
                className="flex shrink-0 items-center border-b"
                style={{
                  height: '36px',
                  padding: '0 var(--spacing-md)',
                  borderColor: 'hsl(var(--border-default))',
                  backgroundColor: 'hsl(var(--bg-surface-alt))',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-secondary))' }}>
                  ORIGINAL
                </span>
              </div>
              <div className="flex-1 overflow-auto" style={{ padding: 'var(--spacing-md)' }}>
                <BlockPreview html={originalHtml} css={originalCss} js={originalJs} height={600} showZoomControls scrollable interactive />
              </div>
            </div>

            {/* After */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div
                className="flex shrink-0 items-center border-b"
                style={{
                  height: '36px',
                  padding: '0 var(--spacing-md)',
                  borderColor: 'hsl(var(--border-default))',
                  backgroundColor: 'hsl(var(--bg-surface-alt))',
                }}
              >
                <span style={{ fontSize: 'var(--text-xs-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-secondary))' }}>
                  PROCESSED
                </span>
              </div>
              <div className="flex-1 overflow-auto" style={{ padding: 'var(--spacing-md)' }}>
                <BlockPreview html={processedHtml} css={finalCss} js={originalJs} height={600} showZoomControls scrollable interactive />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Suggestions + Images */}
        <div
          className="flex shrink-0 flex-col overflow-y-auto"
          style={{ width: '420px' }}
        >
          {/* Images section */}
          {images.length > 0 && (
            <div className="flex flex-col border-b" style={{ borderColor: 'hsl(var(--border-default))', padding: 'var(--spacing-md)', gap: 'var(--spacing-sm)' }}>
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
                  Images ({images.length})
                </span>
                {imageResults.length > 0 ? (
                  <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--status-success-fg))' }}>
                    {imagesUploaded}/{images.length} uploaded
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleUploadImages} disabled={uploading}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Uploading...' : 'Upload to R2'}
                  </Button>
                )}
              </div>
              {uploadError && (
                <div className="flex items-center" style={{ gap: '4px', color: 'hsl(var(--status-error-fg))', fontSize: 'var(--text-xs-font-size)' }}>
                  <AlertTriangle size={12} />
                  {uploadError}
                </div>
              )}
              <div className="flex flex-col" style={{ gap: '4px' }}>
                {images.map((img) => {
                  const result = imageResults.find((r) => r.original === img.original)
                  return (
                    <ImageRow key={img.id} image={img} result={result} />
                  )
                })}
              </div>
            </div>
          )}

          {/* Token suggestions */}
          <div className="flex flex-col" style={{ padding: 'var(--spacing-md)', gap: 'var(--spacing-sm)' }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(var(--text-primary))' }}>
                Token Suggestions ({suggestions.length})
              </span>
              <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="border-0 bg-transparent"
                  style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-link))', cursor: 'pointer', padding: 0 }}
                >
                  All
                </button>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-xs-font-size)' }}>|</span>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="border-0 bg-transparent"
                  style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-link))', cursor: 'pointer', padding: 0 }}
                >
                  None
                </button>
              </div>
            </div>

            {Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category} className="flex flex-col" style={{ gap: '2px' }}>
                <span
                  style={{
                    fontSize: 'var(--text-xs-font-size)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'hsl(var(--text-muted))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: 'var(--spacing-xs) 0 2px',
                  }}
                >
                  {CATEGORY_LABEL[category] ?? category} ({items.length})
                </span>
                {items.map((s) => (
                  <SuggestionRow key={s.id} suggestion={s} onToggle={toggleSuggestion} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SuggestionRow({ suggestion: s, onToggle }: { suggestion: Suggestion; onToggle: (id: string) => void }) {
  const badge = CONFIDENCE_BADGE[s.confidence]

  return (
    <label
      className="flex cursor-pointer items-start"
      style={{
        gap: 'var(--spacing-xs)',
        padding: '4px var(--spacing-xs)',
        borderRadius: 'var(--rounded-md)',
        backgroundColor: s.enabled ? 'transparent' : 'hsl(var(--bg-surface-alt))',
        opacity: s.enabled ? 1 : 0.6,
      }}
    >
      <input
        type="checkbox"
        checked={s.enabled}
        onChange={() => onToggle(s.id)}
        style={{ marginTop: '3px', flexShrink: 0 }}
      />
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: '1px' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
          {/* Color swatch for color suggestions */}
          {s.category === 'color' && (
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: s.original,
                border: '1px solid hsl(var(--border-default))',
                flexShrink: 0,
              }}
            />
          )}
          <span
            className="truncate"
            style={{
              fontSize: 'var(--text-xs-font-size)',
              fontFamily: 'var(--font-family-monospace)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {s.original}
          </span>
          <span style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-xs-font-size)' }}>→</span>
          <span
            className="truncate"
            style={{
              fontSize: 'var(--text-xs-font-size)',
              fontFamily: 'var(--font-family-monospace)',
              color: 'hsl(var(--text-link))',
            }}
          >
            {s.token}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
          <span
            className="truncate"
            style={{
              fontSize: '11px',
              color: 'hsl(var(--text-muted))',
            }}
          >
            {s.selector} · {s.property}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 'var(--font-weight-medium)',
              color: badge.color,
              backgroundColor: badge.bg,
              padding: '0 4px',
              borderRadius: '3px',
              flexShrink: 0,
            }}
          >
            {badge.label}
          </span>
        </div>
        {s.warning && (
          <span style={{ fontSize: '11px', color: 'hsl(var(--status-warn-fg))' }}>
            {s.warning}
          </span>
        )}
      </div>
    </label>
  )
}

function ImageRow({ image, result }: { image: ImageRef; result?: BatchUploadResult }) {
  const shortUrl = image.original.length > 45
    ? image.original.slice(0, 20) + '...' + image.original.slice(-20)
    : image.original

  return (
    <div
      className="flex items-center"
      style={{
        gap: 'var(--spacing-xs)',
        padding: '4px var(--spacing-xs)',
        fontSize: 'var(--text-xs-font-size)',
      }}
    >
      {result ? (
        result.error ? (
          <AlertTriangle size={12} style={{ color: 'hsl(var(--status-error-fg))', flexShrink: 0 }} />
        ) : (
          <Check size={12} style={{ color: 'hsl(var(--status-success-fg))', flexShrink: 0 }} />
        )
      ) : (
        <span style={{ width: '12px', height: '12px', flexShrink: 0 }} />
      )}
      <span className="truncate" style={{ color: 'hsl(var(--text-secondary))', fontFamily: 'var(--font-family-monospace)' }}>
        {shortUrl}
      </span>
      <span className="truncate" style={{ color: 'hsl(var(--text-muted))', flexShrink: 0 }}>
        {image.context}
      </span>
    </div>
  )
}
