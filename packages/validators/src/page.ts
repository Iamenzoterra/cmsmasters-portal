import { z } from 'zod'
import { GLOBAL_SLOT_NAMES } from '@cmsmasters/db'

// ── SEO schema (reused from theme) ──

const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
})

// ── Create page ──

export const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  title: z.string().min(1).max(200),
  type: z.enum(['layout', 'composed']),
  scope: z.string().default(''),
  html: z.string().default(''),
  css: z.string().default(''),
  layout_slots: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
  slot_config: z.record(z.string(), z.object({ gap: z.string().optional() })).default({}),
  seo: seoSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

// ── Update page (all fields optional) ──

export const updatePageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scope: z.string().optional(),
  html: z.string().optional(),
  css: z.string().optional(),
  layout_slots: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  slot_config: z.record(z.string(), z.object({ gap: z.string().optional() })).optional(),
  seo: seoSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
})

// ── Page block (for composed page block list) ──

export const pageBlockSchema = z.object({
  block_id: z.string().uuid(),
  position: z.number().int().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
})

// ── Create global element ──

export const globalElementSchema = z.object({
  slot: z.enum(GLOBAL_SLOT_NAMES),
  block_id: z.string().uuid(),
  scope: z.string().min(1),
  priority: z.number().int().min(0).max(100).default(0),
})

// ── Update global element ──

export const updateGlobalElementSchema = z.object({
  slot: z.enum(GLOBAL_SLOT_NAMES).optional(),
  block_id: z.string().uuid().optional(),
  scope: z.string().min(1).optional(),
  priority: z.number().int().min(0).max(100).optional(),
})

export type CreatePagePayload = z.infer<typeof pageSchema>
export type UpdatePagePayload = z.infer<typeof updatePageSchema>
export type PageBlockPayload = z.infer<typeof pageBlockSchema>
export type CreateGlobalElementPayload = z.infer<typeof globalElementSchema>
export type UpdateGlobalElementPayload = z.infer<typeof updateGlobalElementSchema>
