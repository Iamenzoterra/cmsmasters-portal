// Types
export { blockIdEnum, type BlockId, type BlockRegistryEntry, type BlockMeta } from './types'

// Registry
export {
  BLOCK_REGISTRY,
  BLOCK_META,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from './registry'

// Per-block data schemas (for typed block editors)
export { themeHeroDataSchema, type ThemeHeroData } from './theme-hero/schema'
export { featureGridDataSchema, type FeatureGridData } from './feature-grid/schema'
export { pluginComparisonDataSchema, type PluginComparisonData } from './plugin-comparison/schema'
export { trustStripDataSchema, type TrustStripData } from './trust-strip/schema'
export { relatedThemesDataSchema, type RelatedThemesData } from './related-themes/schema'
