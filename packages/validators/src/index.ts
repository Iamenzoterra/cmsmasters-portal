export {
  themeSchema,
  metaSchema,
  seoSchema,
  sectionSchema,
  sectionsSchema,
  sectionTypeEnum,
} from './theme'
export type { ThemeFormData } from './theme'

// Section registry
export {
  SECTION_REGISTRY,
  SECTION_TYPES,
  SECTION_LABELS,
  CORE_SECTION_TYPES,
  getDefaultSections,
  validateSectionData,
  validateSections,
} from './sections'
export type { SectionRegistryEntry } from './sections'

// Core section data types (for typed section editors in Studio)
export { themeHeroDataSchema, type ThemeHeroData } from './sections/theme-hero'
export { featureGridDataSchema, type FeatureGridData } from './sections/feature-grid'
export { pluginComparisonDataSchema, type PluginComparisonData } from './sections/plugin-comparison'
export { trustStripDataSchema, type TrustStripData } from './sections/trust-strip'
export { relatedThemesDataSchema, type RelatedThemesData } from './sections/related-themes'
