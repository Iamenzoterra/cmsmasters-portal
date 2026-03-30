import { z } from 'zod'

/** Zod enum — single source of truth for all block IDs */
export const blockIdEnum = z.enum([
  'theme-hero',
  'feature-grid',
  'plugin-comparison',
  'trust-strip',
  'related-themes',
  'before-after',
  'video-demo',
  'testimonials',
  'faq',
  'cta-banner',
  'stats-counter',
  'resource-sidebar',
])

/** TypeScript union derived from the Zod enum */
export type BlockId = z.infer<typeof blockIdEnum>

/** Shape of a registry entry */
export interface BlockRegistryEntry {
  schema: z.ZodSchema
  label: string
  defaultData: Record<string, unknown>
}

/** Block metadata — for picker UI, categories, docs */
export interface BlockMeta {
  label: string
  category: 'hero' | 'features' | 'social-proof' | 'cta' | 'content' | 'navigation'
  description: string
  stub: boolean
}
