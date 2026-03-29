import { useState, useEffect, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { SupabaseClient, Profile, UserRole } from '@cmsmasters/db'
import type { AuthState } from './types'

/**
 * Core hook: listens to Supabase auth state changes.
 * Returns session and loading state.
 */
export function useSession(client: SupabaseClient) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    client.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) {
        setSession(session)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        setSession(session)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [client])

  return { session, loading }
}

/**
 * Returns AuthState — the single source of truth for auth status (M5).
 * Fetches profile from profiles table when session is active.
 * M2: cancel flag guards against stale profile fetch overwriting state.
 */
export function useUser(client: SupabaseClient) {
  const { session, loading: sessionLoading } = useSession(client)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (sessionLoading) return

    if (!session?.user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)

    client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return // M2: stale fetch guard
        if (error) {
          console.error('Failed to fetch profile:', error)
          setProfile(null)
        } else {
          setProfile(data)
        }
        setProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, session, sessionLoading])

  // M5: authState is THE source of truth — no separate loading boolean
  const authState: AuthState = useMemo(() => {
    if (sessionLoading || profileLoading) return { status: 'loading' }
    if (!session || !profile) return { status: 'unauthenticated' }
    return {
      status: 'authenticated',
      userId: profile.id,
      email: profile.email ?? '',
      role: profile.role as UserRole,
    }
  }, [sessionLoading, profileLoading, session, profile])

  return { authState }
}

/**
 * Convenience wrapper — returns just the role string.
 */
export function useRole(client: SupabaseClient): UserRole | null {
  const { authState } = useUser(client)
  return authState.status === 'authenticated' ? authState.role : null
}
