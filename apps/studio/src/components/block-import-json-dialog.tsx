// WP-035 Phase 2 — Studio-side Import dialog (paste/upload Forge BlockJson).
//
// Parallel to existing block-import-panel.tsx (HTML import via Process flow);
// this surface accepts a Forge-exported full JSON payload and POSTs it to
// /api/blocks/import for atomic find-or-create-by-slug upsert + server-side
// fire-and-forget revalidate.

import { useState, useEffect, useRef } from 'react'
import type { ChangeEvent } from 'react'
import { importBlockSchema, type ImportBlockPayload } from '@cmsmasters/validators'
import type { Block } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
import { X } from 'lucide-react'
import { importBlockApi, fetchAllBlocks } from '../lib/block-api'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: (block: Block, action: 'created' | 'updated') => void
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void
}

type ParseState =
  | { kind: 'empty' }
  | { kind: 'invalid-json'; error: string }
  | { kind: 'invalid-schema'; issues: Array<{ path: string; message: string }> }
  | { kind: 'valid'; payload: ImportBlockPayload }

export function BlockImportJsonDialog({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}: Props) {
  const [pasted, setPasted] = useState('')
  const [parseState, setParseState] = useState<ParseState>({ kind: 'empty' })
  const [previewOpen, setPreviewOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    fetchAllBlocks()
      .then((blocks) => setExistingSlugs(new Set(blocks.map((b) => b.slug))))
      .catch(() => setExistingSlugs(new Set()))
  }, [isOpen])

  useEffect(() => {
    if (!pasted.trim()) {
      setParseState({ kind: 'empty' })
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(pasted)
    } catch (err) {
      setParseState({
        kind: 'invalid-json',
        error: err instanceof Error ? err.message : 'Invalid JSON',
      })
      return
    }
    const result = importBlockSchema.safeParse(parsed)
    if (result.success) {
      setParseState({ kind: 'valid', payload: result.data })
    } else {
      setParseState({
        kind: 'invalid-schema',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      })
    }
  }, [pasted])

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPasted(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImport = async () => {
    if (parseState.kind !== 'valid') return
    setSubmitting(true)
    try {
      const result = await importBlockApi(parseState.payload)
      onShowToast(
        `Block ${result.action} (${parseState.payload.slug}). ${result.revalidated ? 'Cache revalidated.' : 'Revalidation pending.'}`,
        'success',
      )
      onSuccess(result.data, result.action)
      setPasted('')
      setParseState({ kind: 'empty' })
      onClose()
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Import failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const slugCollision =
    parseState.kind === 'valid' && existingSlugs.has(parseState.payload.slug)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bijd-title"
      data-testid="bijd-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'hsl(var(--black-alpha-60))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        data-testid="bijd-dialog"
        style={{
          background: 'hsl(var(--bg-surface))',
          border: '1px solid hsl(var(--border-default))',
          borderRadius: 'var(--rounded-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: 'min(720px, 90vw)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderBottom: '1px solid hsl(var(--border-default))',
          }}
        >
          <h2
            id="bijd-title"
            style={{
              fontSize: 'var(--text-lg-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
            }}
          >
            Import block (JSON)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-action="close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'hsl(var(--text-muted))',
              padding: 'var(--spacing-xs)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div
          style={{
            padding: 'var(--spacing-lg)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-muted))',
              margin: 0,
            }}
          >
            Paste a Forge-exported block payload, or upload a <code>.json</code> file.
            On import, the block is upserted by slug and the portal cache is revalidated.
          </p>

          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder='{"slug":"my-block","name":"My Block","html":"...","css":"..."}'
            data-testid="bijd-paste"
            spellCheck={false}
            style={{
              minHeight: '160px',
              padding: 'var(--spacing-md)',
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 1.6,
              // ds-lint-ignore — monospace explicit per memory feedback_lint_ds_fontfamily
              fontFamily: 'var(--font-family-monospace)',
              backgroundColor: 'hsl(var(--bg-surface-alt))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-md)',
              color: 'hsl(var(--text-primary))',
              resize: 'vertical',
              tabSize: 2,
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              alignItems: 'center',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              data-testid="bijd-file-input"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              data-action="upload"
            >
              Upload .json
            </Button>
            <span
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              File contents replace the textarea.
            </span>
          </div>

          {parseState.kind === 'invalid-json' && (
            <div
              role="alert"
              data-testid="bijd-json-error"
              style={{
                padding: 'var(--spacing-md)',
                background: 'hsl(var(--status-error-bg))',
                color: 'hsl(var(--status-error-fg))',
                borderRadius: 'var(--rounded-md)',
                fontSize: 'var(--text-sm-font-size)',
              }}
            >
              <strong>Invalid JSON:</strong> {parseState.error}
            </div>
          )}

          {parseState.kind === 'invalid-schema' && (
            <div
              role="alert"
              data-testid="bijd-schema-error"
              style={{
                padding: 'var(--spacing-md)',
                background: 'hsl(var(--status-error-bg))',
                color: 'hsl(var(--status-error-fg))',
                borderRadius: 'var(--rounded-md)',
                fontSize: 'var(--text-sm-font-size)',
              }}
            >
              <strong>Schema validation failed:</strong>
              <ul
                style={{
                  margin: 'var(--spacing-xs) 0 0 var(--spacing-md)',
                  padding: 0,
                }}
              >
                {parseState.issues.map((i, n) => (
                  <li key={n}>
                    <code>{i.path || '(root)'}</code>: {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slugCollision && parseState.kind === 'valid' && (
            <div
              role="alert"
              data-testid="bijd-collision-warning"
              style={{
                padding: 'var(--spacing-md)',
                background: 'hsl(var(--status-warning-bg))',
                color: 'hsl(var(--status-warning-fg))',
                borderRadius: 'var(--rounded-md)',
                fontSize: 'var(--text-sm-font-size)',
              }}
            >
              <strong>Slug exists:</strong> Block "{parseState.payload.slug}"
              already exists in the database. Clicking Import will OVERWRITE it.
            </div>
          )}

          {parseState.kind === 'valid' && (
            <div>
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                data-action="toggle-preview"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--text-muted))',
                  fontSize: 'var(--text-sm-font-size)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {previewOpen ? '▾' : '▸'} Preview payload (
                {Object.keys(parseState.payload).length} fields)
              </button>
              {previewOpen && (
                <pre
                  data-testid="bijd-preview"
                  style={{
                    marginTop: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    background: 'hsl(var(--bg-surface-alt))',
                    border: '1px solid hsl(var(--border-default))',
                    borderRadius: 'var(--rounded-md)',
                    fontSize: 'var(--text-xs-font-size)',
                    // ds-lint-ignore — monospace explicit per memory feedback_lint_ds_fontfamily
                    fontFamily: 'var(--font-family-monospace)',
                    maxHeight: '240px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(parseState.payload, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <footer
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderTop: '1px solid hsl(var(--border-default))',
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            data-action="cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={parseState.kind !== 'valid' || submitting}
            data-action="import"
          >
            {submitting
              ? 'Importing…'
              : slugCollision
                ? 'Overwrite & Import'
                : 'Import'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
