import { useState } from 'react'
import { signInWithMagicLink, signInWithGoogle } from '@cmsmasters/auth'
import { Button } from '@cmsmasters/ui'
import { supabase } from '../lib/supabase'

const cardStyle: React.CSSProperties = {
  width: '420px',
  padding: 'var(--spacing-4xl)',
  backgroundColor: 'hsl(var(--bg-surface))',
  border: '1px solid hsl(var(--bg-page))',
  borderRadius: 'var(--rounded-2xl)',
  boxShadow: 'var(--shadow-lg)',
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
          {/* ds-lint-ignore: HTML character entity, not a hex color */}
          <span style={{ fontSize: 'var(--h2-font-size)', lineHeight: 'var(--h2-line-height)' }}>&#9993;</span>
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
              fontWeight: 'var(--font-weight-bold)',
              color: 'hsl(var(--text-primary))',
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
            }}
          >
            We sent a magic link to
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
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
              fontWeight: 'var(--font-weight-medium)',
              color: 'hsl(var(--text-link))',
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
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--h4-font-size)',
            lineHeight: 'var(--h4-line-height)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'hsl(var(--button-primary-fg))',
          }}
        >
          A
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
            fontWeight: 'var(--font-weight-bold)',
            color: 'hsl(var(--text-primary))',
          }}
        >
          Admin
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            color: 'hsl(var(--text-secondary))',
          }}
        >
          Sign in with your admin account
        </p>
      </div>

      {/* Form fields */}
      <div className="flex w-full flex-col" style={{ gap: 'var(--spacing-sm)' }}>
        <label
          htmlFor="email"
          style={{
            fontSize: 'var(--text-sm-font-size)',
            lineHeight: 'var(--text-sm-line-height)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'hsl(var(--foreground))',
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
          }}
        />
      </div>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--status-error-fg))',
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

      {/* Divider */}
      <div className="flex w-full items-center" style={{ gap: 'var(--spacing-sm)' }}>
        <div className="flex-1" style={{ height: '1px', backgroundColor: 'hsl(var(--border))' }} />
        <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>or</span>
        <div className="flex-1" style={{ height: '1px', backgroundColor: 'hsl(var(--border))' }} />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => signInWithGoogle(supabase, window.location.origin + '/auth/callback')}
        className="flex w-full items-center justify-center border bg-transparent"
        style={{
          height: '36px',
          gap: 'var(--spacing-sm)',
          borderColor: 'hsl(var(--border))',
          borderRadius: 'var(--rounded-lg)',
          fontSize: 'var(--text-sm-font-size)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'hsl(var(--foreground))',
          cursor: 'pointer',
        }}
      >
        {/* ds-lint-ignore: Google brand colors are mandatory per brand guidelines */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Footer */}
      <p
        className="text-center"
        style={{
          margin: 0,
          fontSize: 'var(--text-xs-font-size)',
          lineHeight: 'var(--text-xs-line-height)',
          color: 'hsl(var(--text-muted))',
        }}
      >
        We'll send a login link — no password needed
      </p>
    </form>
  )
}
