import type { BlockId, BlockRegistryEntry, BlockMeta } from './types'

import { themeHeroDataSchema } from './theme-hero/schema'
import { themeHeroDefaults } from './theme-hero/defaults'
import { themeHeroMeta } from './theme-hero/meta'

import { featureGridDataSchema } from './feature-grid/schema'
import { featureGridDefaults } from './feature-grid/defaults'
import { featureGridMeta } from './feature-grid/meta'

import { pluginComparisonDataSchema } from './plugin-comparison/schema'
import { pluginComparisonDefaults } from './plugin-comparison/defaults'
import { pluginComparisonMeta } from './plugin-comparison/meta'

import { trustStripDataSchema } from './trust-strip/schema'
import { trustStripDefaults } from './trust-strip/defaults'
import { trustStripMeta } from './trust-strip/meta'

import { relatedThemesDataSchema } from './related-themes/schema'
import { relatedThemesDefaults } from './related-themes/defaults'
import { relatedThemesMeta } from './related-themes/meta'

import { beforeAfterDataSchema } from './before-after/schema'
import { beforeAfterDefaults } from './before-after/defaults'
import { beforeAfterMeta } from './before-after/meta'

import { videoDemoDataSchema } from './video-demo/schema'
import { videoDemoDefaults } from './video-demo/defaults'
import { videoDemoMeta } from './video-demo/meta'

import { testimonialsDataSchema } from './testimonials/schema'
import { testimonialsDefaults } from './testimonials/defaults'
import { testimonialsMeta } from './testimonials/meta'

import { faqDataSchema } from './faq/schema'
import { faqDefaults } from './faq/defaults'
import { faqMeta } from './faq/meta'

import { ctaBannerDataSchema } from './cta-banner/schema'
import { ctaBannerDefaults } from './cta-banner/defaults'
import { ctaBannerMeta } from './cta-banner/meta'

import { statsCounterDataSchema } from './stats-counter/schema'
import { statsCounterDefaults } from './stats-counter/defaults'
import { statsCounterMeta } from './stats-counter/meta'

import { resourceSidebarDataSchema } from './resource-sidebar/schema'
import { resourceSidebarDefaults } from './resource-sidebar/defaults'
import { resourceSidebarMeta } from './resource-sidebar/meta'

// ── The registry — single source of truth ──

export const BLOCK_REGISTRY: Record<BlockId, BlockRegistryEntry> = {
  'theme-hero': {
    schema: themeHeroDataSchema,
    label: 'Hero',
    defaultData: themeHeroDefaults as Record<string, unknown>,
  },
  'feature-grid': {
    schema: featureGridDataSchema,
    label: 'Features',
    defaultData: featureGridDefaults as Record<string, unknown>,
  },
  'plugin-comparison': {
    schema: pluginComparisonDataSchema,
    label: 'Plugins',
    defaultData: pluginComparisonDefaults as Record<string, unknown>,
  },
  'trust-strip': {
    schema: trustStripDataSchema,
    label: 'Trust Strip',
    defaultData: trustStripDefaults as Record<string, unknown>,
  },
  'related-themes': {
    schema: relatedThemesDataSchema,
    label: 'Related Themes',
    defaultData: relatedThemesDefaults as Record<string, unknown>,
  },
  'before-after': {
    schema: beforeAfterDataSchema,
    label: 'Before & After',
    defaultData: beforeAfterDefaults as Record<string, unknown>,
  },
  'video-demo': {
    schema: videoDemoDataSchema,
    label: 'Video Demo',
    defaultData: videoDemoDefaults as Record<string, unknown>,
  },
  'testimonials': {
    schema: testimonialsDataSchema,
    label: 'Testimonials',
    defaultData: testimonialsDefaults as Record<string, unknown>,
  },
  'faq': {
    schema: faqDataSchema,
    label: 'FAQ',
    defaultData: faqDefaults as Record<string, unknown>,
  },
  'cta-banner': {
    schema: ctaBannerDataSchema,
    label: 'CTA Banner',
    defaultData: ctaBannerDefaults as Record<string, unknown>,
  },
  'stats-counter': {
    schema: statsCounterDataSchema,
    label: 'Stats Counter',
    defaultData: statsCounterDefaults as Record<string, unknown>,
  },
  'resource-sidebar': {
    schema: resourceSidebarDataSchema,
    label: 'Resource Sidebar',
    defaultData: resourceSidebarDefaults as Record<string, unknown>,
  },
}

// ── Block metadata ──

export const BLOCK_META: Record<BlockId, BlockMeta> = {
  'theme-hero': themeHeroMeta,
  'feature-grid': featureGridMeta,
  'plugin-comparison': pluginComparisonMeta,
  'trust-strip': trustStripMeta,
  'related-themes': relatedThemesMeta,
  'before-after': beforeAfterMeta,
  'video-demo': videoDemoMeta,
  'testimonials': testimonialsMeta,
  'faq': faqMeta,
  'cta-banner': ctaBannerMeta,
  'stats-counter': statsCounterMeta,
  'resource-sidebar': resourceSidebarMeta,
}

// ── Derived constants ──

export const BLOCK_IDS = Object.keys(BLOCK_REGISTRY) as BlockId[]

export const BLOCK_LABELS: Record<BlockId, string> = Object.fromEntries(
  Object.entries(BLOCK_REGISTRY).map(([k, v]) => [k, v.label])
) as Record<BlockId, string>

export const CORE_BLOCK_IDS: BlockId[] = [
  'theme-hero',
  'feature-grid',
  'plugin-comparison',
  'trust-strip',
  'related-themes',
]

/** Canonical: returns { block, data } — NOT { type, data } */
export function getDefaultBlocks(): Array<{ block: BlockId; data: Record<string, unknown> }> {
  return CORE_BLOCK_IDS.map((block) => ({
    block,
    data: { ...BLOCK_REGISTRY[block].defaultData },
  }))
}

// ── Validation ──

/** Validate a single block's data against its block-specific schema.
 *  Accepts both canonical { block } and legacy { type } shapes. */
export function validateBlockData(
  section: { type: string; data: unknown } | { block: string; data: unknown }
): { success: true; data: unknown } | { success: false; error: string } {
  const id = ('block' in section ? section.block : section.type) as BlockId
  const entry = BLOCK_REGISTRY[id]
  if (!entry) {
    return { success: false, error: `Unknown block: ${id}` }
  }
  const result = entry.schema.safeParse(section.data)
  if (!result.success) {
    return { success: false, error: result.error.message }
  }
  return { success: true, data: result.data }
}

/** Validate entire blocks array. Returns first error or success.
 *  Accepts both canonical { block } and legacy { type } shapes. */
export function validateBlocks(
  blocks: Array<{ type: string; data: unknown } | { block: string; data: unknown }>
): { success: true } | { success: false; index: number; error: string } {
  for (const [i, block] of blocks.entries()) {
    const result = validateBlockData(block)
    if (!result.success) {
      return { success: false, index: i, error: result.error }
    }
  }
  return { success: true }
}
