import { z } from 'zod'
import { sectionTypeEnum } from '../theme'

import { themeHeroDataSchema, themeHeroDefaults } from './theme-hero'
import { featureGridDataSchema, featureGridDefaults } from './feature-grid'
import { pluginComparisonDataSchema, pluginComparisonDefaults } from './plugin-comparison'
import { trustStripDataSchema, trustStripDefaults } from './trust-strip'
import { relatedThemesDataSchema, relatedThemesDefaults } from './related-themes'
import { beforeAfterDataSchema, beforeAfterDefaults } from './before-after'
import { videoDemoDataSchema, videoDemoDefaults } from './video-demo'
import { testimonialsDataSchema, testimonialsDefaults } from './testimonials'
import { faqDataSchema, faqDefaults } from './faq'
import { ctaBannerDataSchema, ctaBannerDefaults } from './cta-banner'
import { statsCounterDataSchema, statsCounterDefaults } from './stats-counter'
import { resourceSidebarDataSchema, resourceSidebarDefaults } from './resource-sidebar'

// Derive SectionType from validators' own enum — no db import, no cycle
type SectionType = z.infer<typeof sectionTypeEnum>

// ── Registry entry shape ──

export interface SectionRegistryEntry {
  schema: z.ZodSchema
  label: string
  defaultData: Record<string, unknown>
}

// ── The registry — single source of truth ──

export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {
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

// ── Derived constants ──

export const SECTION_TYPES = Object.keys(SECTION_REGISTRY) as SectionType[]

export const SECTION_LABELS: Record<SectionType, string> = Object.fromEntries(
  Object.entries(SECTION_REGISTRY).map(([k, v]) => [k, v.label])
) as Record<SectionType, string>

export const CORE_SECTION_TYPES: SectionType[] = [
  'theme-hero',
  'feature-grid',
  'plugin-comparison',
  'trust-strip',
  'related-themes',
]

/** Factory: returns fresh default sections array each call (M2 — no shared refs) */
export function getDefaultSections(): Array<{ type: SectionType; data: Record<string, unknown> }> {
  return CORE_SECTION_TYPES.map((type) => ({
    type,
    data: { ...SECTION_REGISTRY[type].defaultData },
  }))
}

// ── Validation ──

/** Validate a single section's data against its type-specific schema. */
export function validateSectionData(
  section: { type: string; data: unknown }
): { success: true; data: unknown } | { success: false; error: string } {
  const entry = SECTION_REGISTRY[section.type as SectionType]
  if (!entry) {
    return { success: false, error: `Unknown section type: ${section.type}` }
  }
  const result = entry.schema.safeParse(section.data)
  if (!result.success) {
    return { success: false, error: result.error.message }
  }
  return { success: true, data: result.data }
}

/** Validate entire sections array. Returns first error or success. */
export function validateSections(
  sections: Array<{ type: string; data: unknown }>
): { success: true } | { success: false; index: number; error: string } {
  for (let i = 0; i < sections.length; i++) {
    const result = validateSectionData(sections[i])
    if (!result.success) {
      return { success: false, index: i, error: result.error }
    }
  }
  return { success: true }
}
