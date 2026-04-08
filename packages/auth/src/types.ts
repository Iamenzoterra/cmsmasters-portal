import type { UserRole } from '@cmsmasters/db'
import type { Entitlements } from './resolvers'

// Re-export so consumers don't need to import db separately for auth work
export type { UserRole }
export type { Entitlements }

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | {
      status: 'authenticated'
      userId: string
      email: string
      role: UserRole
      entitlements?: Entitlements
    }

export type AllowedRoles = UserRole | UserRole[]

// M3 cut: single place for role-check logic — no copy-paste in guards/hooks
export function hasAllowedRole(
  userRole: UserRole,
  allowedRoles?: AllowedRoles
): boolean {
  if (!allowedRoles) return true
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return roles.includes(userRole)
}
