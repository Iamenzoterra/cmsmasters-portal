import { useState, useEffect } from 'react'
import { api } from '../lib/api-client'
import type { ExportResult } from '../lib/types'
import type { ValidationItem, ValidationState } from '../lib/validation'
import { ValidationItemList } from './ValidationSummary'

interface Props {
  id: string
  onClose: () => void
  onShowToast: (message: string) => void
  validationState?: ValidationState
  onFocusItem?: (item: ValidationItem) => void
}

export function ExportDialog({
  id,
  onClose,
  onShowToast,
  validationState = { errors: [], warnings: [] },
  onFocusItem,
}: Props) {
  const [result, setResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [htmlOpen, setHtmlOpen] = useState(false)
  const [cssOpen, setCssOpen] = useState(false)

  const { errors, warnings } = validationState
  const blocked = errors.length > 0

  useEffect(() => {
    if (blocked) { setLoading(false); return }
    api.exportLayout(id).then(setResult).catch((e: Error & { details?: string[] }) => {
      setError(e.message)
      if (e.details) setDetails(e.details)
    }).finally(() => setLoading(false))
  }, [id, blocked])

  const handleCopyPayload = async () => {
    if (!result) return
    await navigator.clipboard.writeText(JSON.stringify(result.payload, null, 2))
    onShowToast('Payload copied to clipboard.')
  }

  const handleDownloadJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.payload.scope}.json`
    a.click()
    URL.revokeObjectURL(url)
    onShowToast('JSON downloaded.')
  }

  const handleItemClick = (item: ValidationItem) => {
    onClose()
    onFocusItem?.(item)
  }

  return (
    <div
      className="lm-export-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="lm-export-dialog">
        <div className="lm-export-dialog__header">
          <span>Export: {id}</span>
          <button
            className="lm-export-dialog__close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {blocked ? (
          <div className="lm-export-dialog__body">
            <div className="lm-export-dialog__blocked-header">
              <span className="lm-validation-badge lm-validation-badge--error" />
              <strong>
                Export blocked: {errors.length} structural error
                {errors.length === 1 ? '' : 's'} must be fixed first.
              </strong>
            </div>
            <ValidationItemList items={[...errors, ...warnings]} onFocusItem={handleItemClick} />
          </div>
        ) : (
          <>
            {warnings.length > 0 && (
              <div className="lm-export-dialog__warnings-banner">
                {warnings.length} warning(s) — review before shipping
              </div>
            )}
            {loading && (
              <div className="lm-export-dialog__loading">Generating export...</div>
            )}

            {error && (
              <div className="lm-export-dialog__errors">
                <strong>Export failed:</strong> {error}
                {details.length > 0 && (
                  <ul>
                    {details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {result && (
              <div className="lm-export-dialog__body">
                <div className="lm-export-dialog__meta">
                  <div className="lm-export-dialog__meta-row">
                    <span className="lm-export-dialog__meta-label">slug</span>
                    <code>{result.payload.slug}</code>
                  </div>
                  <div className="lm-export-dialog__meta-row">
                    <span className="lm-export-dialog__meta-label">title</span>
                    <code>{result.payload.title}</code>
                  </div>
                  <div className="lm-export-dialog__meta-row">
                    <span className="lm-export-dialog__meta-label">scope</span>
                    <code>{result.payload.scope}</code>
                  </div>
                </div>

                <div className="lm-export-dialog__section">
                  <button
                    className="lm-export-dialog__toggle"
                    onClick={() => setHtmlOpen(!htmlOpen)}
                  >
                    {htmlOpen ? '▾' : '▸'} HTML (
                    {result.payload.html.split('\n').length} lines)
                  </button>
                  {htmlOpen && (
                    <pre className="lm-export-dialog__preview">
                      {result.payload.html}
                    </pre>
                  )}
                </div>

                <div className="lm-export-dialog__section">
                  <button
                    className="lm-export-dialog__toggle"
                    onClick={() => setCssOpen(!cssOpen)}
                  >
                    {cssOpen ? '▾' : '▸'} CSS (
                    {result.payload.css.split('\n').length} lines)
                  </button>
                  {cssOpen && (
                    <pre className="lm-export-dialog__preview">
                      {result.payload.css}
                    </pre>
                  )}
                </div>

                {Object.keys(result.payload.slot_config).length > 0 && (
                  <div className="lm-export-dialog__section">
                    <div className="lm-export-dialog__section-title">
                      slot_config
                    </div>
                    <pre className="lm-export-dialog__preview lm-export-dialog__preview--short">
                      {JSON.stringify(result.payload.slot_config, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="lm-export-dialog__section">
                  <div className="lm-export-dialog__section-title">
                    Exported files
                  </div>
                  <div className="lm-export-dialog__files">
                    <code>{result.files.html}</code>
                    <code>{result.files.css}</code>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="lm-export-dialog__actions">
          {!blocked && result && (
            <>
              <button
                className="lm-btn lm-btn--primary"
                onClick={handleDownloadJson}
              >
                Download JSON
              </button>
              <button
                className="lm-btn"
                onClick={handleCopyPayload}
              >
                Copy payload
              </button>
            </>
          )}
          <button className="lm-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
