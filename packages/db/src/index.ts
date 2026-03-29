export { createClient } from './client'
export type { SupabaseClient } from './client'

export type {
  Database,
  UserRole,
  ThemeStatus,
  LicenseType,
  ThemeFeature,
  ThemePlugin,
  CustomSection,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Theme,
  ThemeInsert,
  ThemeUpdate,
  License,
  LicenseInsert,
  AuditEntry,
  AuditEntryInsert,
} from './types'

export { getThemes, getThemeBySlug, upsertTheme } from './queries/themes'
export { getProfile, updateProfile } from './queries/profiles'
export { logAction } from './queries/audit'
