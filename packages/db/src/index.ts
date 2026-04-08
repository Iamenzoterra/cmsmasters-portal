export { createClient } from './client'
export type { SupabaseClient } from './client'

export {
  SLOT_DEFINITIONS,
  GLOBAL_SLOT_NAMES,
  SLOT_TO_CATEGORY,
} from './slot-registry'
export type { GlobalSlot } from './slot-registry'

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
  SlotConfig,
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
  Category,
  CategoryInsert,
  CategoryUpdate,
  Tag,
  TagInsert,
  TagUpdate,
  ThemeCategory,
  ThemeCategoryInsert,
  ThemeTag,
  ThemeTagInsert,
  PriceType,
  Price,
  PriceInsert,
  PriceUpdate,
  ThemePrice,
  ThemePriceInsert,
  BlockCategory,
  BlockCategoryInsert,
  BlockCategoryUpdate,
  UseCase,
  UseCaseInsert,
  UseCaseUpdate,
  ThemeUseCase,
  ThemeUseCaseInsert,
  StaffRole,
  StaffRoleInsert,
  StaffRoleUpdate,
  StaffRoleName,
  ActivityEntry,
  ActivityEntryInsert,
  ActivityMetadata,
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

export {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getThemeCategories,
  setThemeCategories,
} from './queries/categories'

export {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getThemeTags,
  setThemeTags,
} from './queries/tags'

export {
  getPrices,
  getPriceById,
  createPrice,
  updatePrice,
  deletePrice,
  getThemePrices,
  setThemePrices,
} from './queries/prices'

export {
  getBlockCategories,
  getBlockCategoryById,
  createBlockCategory,
  updateBlockCategory,
  deleteBlockCategory,
} from './queries/block-categories'

export {
  getUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  deleteUseCase,
  searchUseCases,
  getThemeUseCases,
  setThemeUseCases,
} from './queries/use-cases'

export {
  getStaffRoles,
  getAllStaffMembers,
  grantStaffRole,
  revokeStaffRole,
  hasStaffRole,
} from './queries/staff-roles'

export {
  logActivity,
  getActivityLog,
  getRecentActivations,
} from './queries/activity'

export {
  getUserLicenses,
  getAllLicenses,
  createLicense,
  getLicenseByPurchaseCode,
} from './queries/licenses'
