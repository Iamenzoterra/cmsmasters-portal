import type { UserRole } from '@cmsmasters/db'

// Re-export so consumers don't need to import db separately for auth work
export type { UserRole }

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: string; email: string; role: UserRole }

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
