import { z } from 'zod'

// ── Hooks schema ──

const hookPriceSchema = z.object({
  selector: z.string().min(1),
})

const hookLinkSchema = z.object({
  selector: z.string().min(1),
  field: z.string().min(1),
  label: z.string().optional(),
})

const hooksSchema = z.object({
  price: hookPriceSchema.optional(),
  links: z.array(hookLinkSchema).optional(),
}).default({})

// ── Metadata schema (extensible) ──

const metadataSchema = z.object({
  alt: z.string().optional(),
  figma_node: z.string().optional(),
}).passthrough().default({})

// ── Create block ──

export const createBlockSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  html: z.string().min(1),
  css: z.string().default(''),
  hooks: hooksSchema,
  metadata: metadataSchema,
})

// ── Update block (all fields optional except immutable slug) ──

export const updateBlockSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  html: z.string().min(1).optional(),
  css: z.string().optional(),
  hooks: hooksSchema.optional(),
  metadata: metadataSchema.optional(),
})

export type CreateBlockPayload = z.infer<typeof createBlockSchema>
export type UpdateBlockPayload = z.infer<typeof updateBlockSchema>
