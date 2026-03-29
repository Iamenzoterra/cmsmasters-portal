import { useState } from 'react'
import { signInWithMagicLink } from '@cmsmasters/auth'
import { Button } from '@cmsmasters/ui'
import { supabase } from '../lib/supabase'

/* Figma: Studio / Login — Default (3257:85) */
/* Figma: Studio / Login — Link Sent (3257:118) */

const cardStyle: React.CSSProperties = {
  width: '420px',
  padding: 'var(--spacing-4xl)',
  backgroundColor: 'hsl(var(--bg-surface))',
  border: '1px solid hsl(var(--bg-page))',
  borderRadius: 'var(--rounded-2xl)',
  boxShadow: '0px 8px 32px 0px rgba(0,0,0,0.03), 0px 2px 12px 0px rgba(0,0,0,0.04)',
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    try {
      await signInWithMagicLink(
        supabase,
        email.trim(),
        window.location.origin + '/auth/callback',
      )
      setSent(true)
      startCooldown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  function startCooldown() {
    setCooldown(60)
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (cooldown > 0) return
    setLoading(true)
    try {
      await signInWithMagicLink(
        supabase,
        email.trim(),
        window.location.origin + '/auth/callback',
      )
      startCooldown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  /* ── Link Sent state ── */
  if (sent) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ ...cardStyle, gap: 'var(--spacing-xl)' }}
      >
        {/* Success icon */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            backgroundColor: 'hsl(var(--status-success-bg))',
          }}
        >
          <span style={{ fontSize: '32px', lineHeight: 1 }}>✉</span>
        </div>

        {/* Text group */}
        <div
          className="flex flex-col items-center text-center"
          style={{ gap: 'var(--spacing-sm)' }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--h4-font-size)',
              lineHeight: 'var(--h4-line-height)',
              fontWeight: 700,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Check your email
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              color: 'hsl(var(--text-secondary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            We sent a magic link to
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {email}
          </p>
        </div>

        {/* Separator */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: 'hsl(var(--accent))',
          }}
        />

        {/* Resend */}
        <div
          className="flex flex-col items-center text-center"
          style={{ gap: 'var(--spacing-xs)' }}
        >
          <span
            style={{
              fontSize: 'var(--caption-font-size)',
              lineHeight: 'var(--caption-line-height)',
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            Didn't receive it?
          </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || loading}
            className="border-0 bg-transparent disabled:opacity-50"
            style={{
              fontSize: 'var(--caption-font-size)',
              lineHeight: 'var(--caption-line-height)',
              fontWeight: 500,
              color: 'hsl(var(--text-link))',
              fontFamily: "'Manrope', sans-serif",
              cursor: cooldown > 0 ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send again'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Default state ── */
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-center justify-center"
      style={{ ...cardStyle, gap: 'var(--spacing-2xl)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          backgroundColor: 'hsl(var(--button-primary-bg))',
          boxShadow: '0px 4px 12px rgba(21,31,79,0.25)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--h4-font-size)',
            lineHeight: 'var(--h4-line-height)',
            fontWeight: 700,
            color: 'hsl(var(--button-primary-fg))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          C
        </span>
      </div>

      {/* Title group */}
      <div
        className="flex flex-col items-center text-center"
        style={{ gap: 'var(--spacing-xs)' }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--h4-font-size)',
            lineHeight: 'var(--h4-line-height)',
            fontWeight: 700,
            color: 'hsl(var(--text-primary))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Content Studio
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-secondary))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Sign in to manage themes
        </p>
      </div>

      {/* Form fields */}
      <div className="flex w-full flex-col" style={{ gap: 'var(--spacing-sm)' }}>
        <label
          htmlFor="email"
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontWeight: 500,
            color: 'hsl(var(--foreground))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full outline-none"
          style={{
            height: '36px',
            padding: '0 var(--spacing-sm)',
            backgroundColor: 'hsl(var(--input))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--rounded-lg)',
            boxShadow: 'var(--shadow-xs)',
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--foreground))',
            fontFamily: "'Manrope', sans-serif",
          }}
        />
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--status-error-fg))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          {error}
        </p>
      )}

      {/* Submit — uses @cmsmasters/ui Button */}
      <Button
        type="submit"
        variant="primary"
        loading={loading}
        className="w-full"
      >
        Send Magic Link
      </Button>

      {/* Footer */}
      <p
        className="text-center"
        style={{
          margin: 0,
          fontSize: 'var(--text-xs-font-size)',
          lineHeight: 'var(--text-xs-line-height)',
          color: 'hsl(var(--text-muted))',
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        We'll send a login link — no password needed
      </p>
    </form>
  )
}
