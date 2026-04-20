import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@cmsmasters/ui'
import { verifyLicense } from '../lib/api'

type VerifyStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

export function Licenses() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<VerifyStatus>({ kind: 'idle' })

  const isLoading = status.kind === 'loading'
  const isSuccess = status.kind === 'success'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    setStatus({ kind: 'loading' })
    try {
      await verifyLicense(trimmed)
      setStatus({ kind: 'success' })
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div>
      {/* Page header */}
      <h1
        style={{
          fontSize: 'var(--h4-font-size)',
          lineHeight: 'var(--h4-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        Add a theme license
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-2xs)',
          marginBottom: 'var(--spacing-2xl)',
        }}
      >
        Enter the ThemeForest purchase code you received with your theme to verify your license and unlock theme resources.
      </p>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-lg)',
          maxWidth: '600px',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <label
          htmlFor="purchase-code"
          style={{
            display: 'block',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'hsl(var(--text-primary))',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          Purchase code
        </label>
        <input
          id="purchase-code"
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          disabled={isLoading || isSuccess}
          placeholder="e.g. 7f5c8a12-1234-4abc-9def-0123456789ab"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            // ds-lint-ignore: purchase codes are UUID-format strings — monospace improves readability
            fontFamily: 'var(--font-family-monospace)',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-primary))',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--rounded-md)',
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            outline: 'none',
          }}
        />
        <p
          style={{
            fontSize: 'var(--text-xs-font-size)',
            lineHeight: 'var(--text-xs-line-height)',
            color: 'hsl(var(--text-muted))',
            marginTop: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          Find your purchase code on ThemeForest: My Account → Downloads → License certificate
        </p>

        <Button
          type="submit"
          variant="primary"
          size="default"
          loading={isLoading}
          disabled={isLoading || isSuccess || code.trim().length === 0}
        >
          {isLoading ? 'Verifying...' : 'Verify purchase code'}
        </Button>

        {status.kind === 'success' && (
          <div
            role="status"
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              backgroundColor: 'hsl(var(--status-success-bg))',
              color: 'hsl(var(--status-success-fg))',
              borderRadius: 'var(--rounded-md)',
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            License verified. Redirecting...
          </div>
        )}

        {status.kind === 'error' && (
          <div
            role="alert"
            style={{
              marginTop: 'var(--spacing-md)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              backgroundColor: 'hsl(var(--status-error-bg))',
              color: 'hsl(var(--status-error-fg))',
              borderRadius: 'var(--rounded-md)',
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            {status.message}
          </div>
        )}
      </form>

      {/* Envato Elements section */}
      <div style={{ maxWidth: '600px' }}>
        <h2
          style={{
            fontSize: 'var(--text-base-font-size)',
            lineHeight: 'var(--text-base-line-height)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
            margin: 0,
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          Envato Elements subscriber?
        </h2>
        <p
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-muted))',
            margin: 0,
          }}
        >
          Envato Elements themes do not require a purchase code. If you have an active Elements subscription linked to this account, your eligible themes unlock automatically — no verification step needed.
        </p>
      </div>
    </div>
  )
}
