export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockSchema,
  blocksSchema,
} from './theme'
export { blockIdEnum } from '@cmsmasters/blocks'
export type { ThemeFormData } from './theme'

// Block registry (canonical from @cmsmasters/blocks)
export {
  BLOCK_REGISTRY,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from '@cmsmasters/blocks'
export type { BlockRegistryEntry } from '@cmsmasters/blocks'

// Core block data types (for typed block editors in Studio)
export { themeHeroDataSchema, type ThemeHeroData } from '@cmsmasters/blocks'
export { featureGridDataSchema, type FeatureGridData } from '@cmsmasters/blocks'
export { pluginComparisonDataSchema, type PluginComparisonData } from '@cmsmasters/blocks'
export { trustStripDataSchema, type TrustStripData } from '@cmsmasters/blocks'
export { relatedThemesDataSchema, type RelatedThemesData } from '@cmsmasters/blocks'
