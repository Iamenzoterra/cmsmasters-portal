export { createClient } from './client'
export type { SupabaseClient } from './client'

export type {
  Database,
  UserRole,
  ThemeStatus,
  LicenseType,
  ThemeMeta,
  ThemeSEO,
  BlockHooks,
  BlockMetadata,
  TemplatePosition,
  ThemeBlockFill,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Theme,
  ThemeInsert,
  ThemeUpdate,
  License,
  LicenseInsert,
  Block,
  BlockInsert,
  BlockUpdate,
  Template,
  TemplateInsert,
  TemplateUpdate,
  PageType,
  GlobalSlot,
  Page,
  PageInsert,
  PageUpdate,
  PageBlock,
  PageBlockInsert,
  GlobalElement,
  GlobalElementInsert,
  GlobalElementUpdate,
  AuditEntry,
  AuditEntryInsert,
} from './types'

export { themeRowToFormData, formDataToThemeInsert } from './mappers'
export { getThemes, getThemeBySlug, upsertTheme } from './queries/themes'
export { getProfile, updateProfile } from './queries/profiles'
export { logAction } from './queries/audit'

export {
  getBlocks,
  getBlockById,
  getBlockBySlug,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from './queries/blocks'

export {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from './queries/templates'

export {
  getPages,
  getPageById,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  getPageBlocks,
  upsertPageBlocks,
  getPageBlockCount,
} from './queries/pages'

export {
  getGlobalElements,
  getGlobalElementsBySlot,
  createGlobalElement,
  updateGlobalElement,
  deleteGlobalElement,
  resolveGlobalElementsForPage,
} from './queries/global-elements'
