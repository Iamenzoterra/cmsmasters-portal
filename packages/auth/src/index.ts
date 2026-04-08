export { createBrowserClient } from './client'

export { useSession, useUser, useRole } from './hooks'

export { RequireAuth } from './guards'
export type { RequireAuthProps } from './guards'

export { signInWithMagicLink, signInWithGoogle, signOut, handleAuthCallback } from './actions'

export type { AuthState, AllowedRoles, UserRole, Entitlements } from './types'
export { hasAllowedRole } from './types'

export {
  computeEntitlements,
  mergeEntitlements,
  resolveBaseAccess,
  resolveLicenseAccess,
  resolveStaffAccess,
  resolveElementsAccess,
} from './resolvers'
