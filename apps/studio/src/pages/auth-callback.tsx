import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { handleAuthCallback } from '@cmsmasters/auth'
import { supabase } from '../lib/supabase'

export function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleAuthCallback(supabase)
      .then(() => {
        navigate('/', { replace: true })
      })
      .catch((err: Error) => {
        setError(err.message ?? 'Authentication failed')
      })
  }, [navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p style={{ color: 'hsl(var(--status-error-fg))' }}>
          {error}
        </p>
        <Link
          to="/login"
          className="underline"
          style={{ color: 'hsl(var(--text-link))' }}
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <p style={{ color: 'hsl(var(--text-secondary))' }}>Signing in...</p>
    </div>
  )
}
