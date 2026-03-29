import { useEffect, type ReactNode } from 'react'
import type { SupabaseClient } from '@cmsmasters/db'
import type { AllowedRoles } from './types'
import { hasAllowedRole } from './types'
import { useUser } from './hooks'

interface RequireAuthProps {
  client: SupabaseClient
  allowedRoles?: AllowedRoles
  children: ReactNode
  /** Called when user is not authenticated. Wire your router redirect here. */
  onUnauthorized: () => void
  /** Called when user is authenticated but role doesn't match. Falls back to onUnauthorized if not provided. */
  onForbidden?: () => void
  /** Rendered while auth state is loading. Defaults to null. */
  fallback?: ReactNode
}

/**
 * Router-agnostic route guard. 3 states: loading / denied / allowed.
 *
 * M1: onUnauthorized/onForbidden fire ONLY in useEffect — never during render.
 * M3: role check uses hasAllowedRole() — single source of truth.
 */
export function RequireAuth({
  client,
  allowedRoles,
  children,
  onUnauthorized,
  onForbidden,
  fallback = null,
}: RequireAuthProps) {
  const { authState } = useUser(client)

  // M1: side-effect callbacks only in useEffect
  useEffect(() => {
    if (authState.status === 'loading') return

    if (authState.status === 'unauthenticated') {
      onUnauthorized()
      return
    }

    // authenticated but wrong role
    if (!hasAllowedRole(authState.role, allowedRoles)) {
      ;(onForbidden ?? onUnauthorized)()
    }
  }, [authState, allowedRoles, onUnauthorized, onForbidden])

  // Render: loading
  if (authState.status === 'loading') return <>{fallback}</>

  // Render: denied (effect handles callback, render blocks children)
  if (authState.status === 'unauthenticated') return null
  if (!hasAllowedRole(authState.role, allowedRoles)) return null

  // Render: allowed
  return <>{children}</>
}

export type { RequireAuthProps }
