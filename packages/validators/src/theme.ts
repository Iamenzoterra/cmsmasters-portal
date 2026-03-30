import { z } from 'zod'
import { blockIdEnum } from '@cmsmasters/blocks'

// ── Meta schema ──

export const metaSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_id: z.string().optional().default(''),
  thumbnail_url: z.string().optional().default(''),
  preview_images: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).optional(),
  sales: z.number().int().min(0).optional(),
  compatible_plugins: z.array(z.string()).default([]),
  trust_badges: z.array(z.string()).default([]),
  resources: z.object({
    public: z.array(z.string()).default([]),
    licensed: z.array(z.string()).default([]),
    premium: z.array(z.string()).default([]),
  }).default({ public: [], licensed: [], premium: [] }),
})

// ── SEO schema ──

export const seoSchema = z.object({
  title: z.string().max(70).optional().default(''),
  description: z.string().max(160).optional().default(''),
})

// ── Block schema (permissive for form binding) ──
// Per-block data validation uses validateBlocks() from @cmsmasters/blocks at save boundary.

export const blockSchema = z.object({
  block: blockIdEnum,
  data: z.record(z.string(), z.unknown()),
})

export const blocksSchema = z.array(blockSchema).default([])

// ── Top-level theme form schema (nested — mirrors DB shape) ──

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  meta: metaSchema,
  sections: blocksSchema,
  seo: seoSchema,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
