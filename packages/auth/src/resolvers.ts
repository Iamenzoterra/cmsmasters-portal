import type { License, StaffRole, StaffRoleName } from '@cmsmasters/db'

// ── Entitlement types ──

export interface Entitlements {
  /** Can access Dashboard */
  canAccessDashboard: boolean
  /** Can access Studio */
  canAccessStudio: boolean
  /** Can access Admin */
  canAccessAdmin: boolean
  /** Theme slugs the user has licensed access to */
  licensedThemes: string[]
  /** Support is active for these themes */
  activeSupport: string[]
  /** Staff roles (empty for regular users) */
  staffRoles: StaffRoleName[]
  /** Is self-declared Elements subscriber */
  isElementsSubscriber: boolean
  /** Raw facts for debugging */
  _facts: {
    hasAccount: boolean
    licenseCount: number
    staffRoleCount: number
    elementsSubscriber: boolean
  }
}

// ── Individual resolvers ──

export function resolveBaseAccess(hasAccount: boolean): Partial<Entitlements> {
  return {
    canAccessDashboard: hasAccount,
    canAccessStudio: false,
    canAccessAdmin: false,
    licensedThemes: [],
    activeSupport: [],
    staffRoles: [],
    isElementsSubscriber: false,
  }
}

export function resolveLicenseAccess(licenses: License[]): Partial<Entitlements> {
  const now = new Date()
  return {
    licensedThemes: licenses.map(l => l.theme_id),
    activeSupport: licenses
      .filter(l => l.support_until && new Date(l.support_until) > now)
      .map(l => l.theme_id),
  }
}

export function resolveStaffAccess(staffRoles: StaffRole[]): Partial<Entitlements> {
  const roleNames = staffRoles.map(r => r.role as StaffRoleName)
  return {
    canAccessStudio: roleNames.includes('content_manager') || roleNames.includes('admin'),
    canAccessAdmin: roleNames.includes('admin'),
    staffRoles: roleNames,
  }
}

export function resolveElementsAccess(isSubscriber: boolean): Partial<Entitlements> {
  return {
    isElementsSubscriber: isSubscriber,
  }
}

// ── Merge all resolvers ──

export function mergeEntitlements(
  base: Partial<Entitlements>,
  ...sources: Partial<Entitlements>[]
): Entitlements {
  const merged: Entitlements = {
    canAccessDashboard: base.canAccessDashboard ?? false,
    canAccessStudio: base.canAccessStudio ?? false,
    canAccessAdmin: base.canAccessAdmin ?? false,
    licensedThemes: base.licensedThemes ?? [],
    activeSupport: base.activeSupport ?? [],
    staffRoles: base.staffRoles ?? [],
    isElementsSubscriber: base.isElementsSubscriber ?? false,
    _facts: {
      hasAccount: base.canAccessDashboard ?? false,
      licenseCount: 0,
      staffRoleCount: 0,
      elementsSubscriber: false,
    },
  }

  for (const source of sources) {
    if (source.canAccessStudio) merged.canAccessStudio = true
    if (source.canAccessAdmin) merged.canAccessAdmin = true
    if (source.licensedThemes?.length) {
      merged.licensedThemes = [...new Set([...merged.licensedThemes, ...source.licensedThemes])]
    }
    if (source.activeSupport?.length) {
      merged.activeSupport = [...new Set([...merged.activeSupport, ...source.activeSupport])]
    }
    if (source.staffRoles?.length) {
      merged.staffRoles = [...new Set([...merged.staffRoles, ...source.staffRoles])]
    }
    if (source.isElementsSubscriber) merged.isElementsSubscriber = true
  }

  merged._facts = {
    hasAccount: true,
    licenseCount: merged.licensedThemes.length,
    staffRoleCount: merged.staffRoles.length,
    elementsSubscriber: merged.isElementsSubscriber,
  }

  return merged
}

// ── Convenience: compute full entitlements from DB data ──

export function computeEntitlements(
  hasAccount: boolean,
  licenses: License[],
  staffRoles: StaffRole[],
  isElementsSubscriber: boolean
): Entitlements {
  return mergeEntitlements(
    resolveBaseAccess(hasAccount),
    resolveLicenseAccess(licenses),
    resolveStaffAccess(staffRoles),
    resolveElementsAccess(isElementsSubscriber)
  )
}
