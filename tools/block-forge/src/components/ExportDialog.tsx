// WP-035 Phase 1 — ExportDialog: Forge-side payload export gate.
// Port from tools/layout-maker/src/components/ExportDialog.tsx with these
// adaptations (per Phase 0 §0.3 Ruling D):
//   - payload is in-memory (no server fetch — block-forge has no Hono runtime)
//   - drop validation gating, slot_config, files: section, scope meta-row
//   - rename lm-export-* → bf-export-*; LM tokens → Portal DS tokens
//   - pretty-print byte-parity with vite.config.ts:150 writer
//     (JSON.stringify(block, null, 2) + '\n') — round-trip download → re-import
//     should be git-clean.
import { useState } from 'react'
import type { BlockJson } from '../types'

type Props = {
  block: BlockJson
  onClose: () => void
  onShowToast: (message: string) => void
}

export function ExportDialog({ block, onClose, onShowToast }: Props) {
  const [htmlOpen, setHtmlOpen] = useState(false)
  const [cssOpen, setCssOpen] = useState(false)
  const [jsOpen, setJsOpen] = useState(false)

  const payloadString = JSON.stringify(block, null, 2) + '\n'

  const handleCopyPayload = async () => {
    await navigator.clipboard.writeText(payloadString)
    onShowToast('Payload copied to clipboard.')
  }

  const handleDownloadJson = () => {
    const blob = new Blob([payloadString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${block.slug}.json`
    a.click()
    URL.revokeObjectURL(url)
    onShowToast('JSON downloaded.')
  }

  const lineCount = (s: string) => s.split('\n').length
  const hasJs = typeof block.js === 'string' && block.js.trim().length > 0
  const hasVariants =
    block.variants !== null &&
    block.variants !== undefined &&
    Object.keys(block.variants).length > 0

  return (
    <div
      className="bf-export-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bf-export-dialog-title"
      data-testid="bf-export-overlay"
    >
      <div className="bf-export-dialog">
        <div className="bf-export-dialog__header">
          <span id="bf-export-dialog-title">Export: {block.slug}</span>
          <button
            type="button"
            className="bf-export-dialog__close"
            onClick={onClose}
            aria-label="Close"
            data-action="close"
          >
            &times;
          </button>
        </div>

        <div className="bf-export-dialog__body">
          <div className="bf-export-dialog__meta">
            <div className="bf-export-dialog__meta-row">
              <span className="bf-export-dialog__meta-label">slug</span>
              <code>{block.slug}</code>
            </div>
            <div className="bf-export-dialog__meta-row">
              <span className="bf-export-dialog__meta-label">name</span>
              <code>{block.name}</code>
            </div>
            {block.block_type && (
              <div className="bf-export-dialog__meta-row">
                <span className="bf-export-dialog__meta-label">type</span>
                <code>{block.block_type}</code>
              </div>
            )}
          </div>

          <div className="bf-export-dialog__section">
            <button
              type="button"
              className="bf-export-dialog__toggle"
              onClick={() => setHtmlOpen(!htmlOpen)}
              data-action="toggle-html"
              aria-expanded={htmlOpen}
            >
              {htmlOpen ? '▾' : '▸'} HTML ({lineCount(block.html)} lines)
            </button>
            {htmlOpen && (
              <pre className="bf-export-dialog__preview" data-section="html">
                {block.html}
              </pre>
            )}
          </div>

          <div className="bf-export-dialog__section">
            <button
              type="button"
              className="bf-export-dialog__toggle"
              onClick={() => setCssOpen(!cssOpen)}
              data-action="toggle-css"
              aria-expanded={cssOpen}
            >
              {cssOpen ? '▾' : '▸'} CSS ({lineCount(block.css)} lines)
            </button>
            {cssOpen && (
              <pre className="bf-export-dialog__preview" data-section="css">
                {block.css}
              </pre>
            )}
          </div>

          {hasJs && (
            <div className="bf-export-dialog__section">
              <button
                type="button"
                className="bf-export-dialog__toggle"
                onClick={() => setJsOpen(!jsOpen)}
                data-action="toggle-js"
                aria-expanded={jsOpen}
              >
                {jsOpen ? '▾' : '▸'} JS ({lineCount(block.js!)} lines)
              </button>
              {jsOpen && (
                <pre className="bf-export-dialog__preview" data-section="js">
                  {block.js}
                </pre>
              )}
            </div>
          )}

          {hasVariants && (
            <div className="bf-export-dialog__section">
              <div className="bf-export-dialog__section-title">
                variants ({Object.keys(block.variants!).length})
              </div>
              <pre
                className="bf-export-dialog__preview bf-export-dialog__preview--short"
                data-section="variants"
              >
                {JSON.stringify(block.variants, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bf-export-dialog__actions">
          <button
            type="button"
            className="bf-btn bf-btn--primary"
            onClick={handleDownloadJson}
            data-action="download-json"
          >
            Download JSON
          </button>
          <button
            type="button"
            className="bf-btn"
            onClick={handleCopyPayload}
            data-action="copy-payload"
          >
            Copy payload
          </button>
          <button
            type="button"
            className="bf-btn"
            onClick={onClose}
            data-action="close-footer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
