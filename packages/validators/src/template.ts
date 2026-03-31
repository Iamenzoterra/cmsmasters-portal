import { z } from 'zod'

// ── Position schema ──

const positionSchema = z.object({
  position: z.number().int().min(1),
  block_id: z.string().uuid().nullable(),
})

// ── Create template ──

export const createTemplateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  positions: z.array(positionSchema).default([]),
  max_positions: z.number().int().min(1).max(100).default(20),
})

// ── Update template (all fields optional except immutable slug) ──

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  positions: z.array(positionSchema).optional(),
  max_positions: z.number().int().min(1).max(100).optional(),
})

export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>
