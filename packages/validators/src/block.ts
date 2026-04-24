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

// ── Variants schema ──
// Responsive blocks (WP-024 / ADR-025): optional named structural variants.
// Absent → block has no variants; portal renders base html/css only.
// Present → renderer inlines each variant as <div data-variant="{name}" hidden>
//           and @container rules inside block CSS reveal the right one.

const variantPayloadSchema = z.object({
  html: z.string().min(1),
  css: z.string().default(''),
})

const variantsSchema = z.record(
  z.string().regex(/^[a-z0-9-]+$/),
  variantPayloadSchema
)

// ── Create block ──

export const createBlockSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  html: z.string().min(1),
  css: z.string().default(''),
  js: z.string().default(''),
  block_type: z.string().default(''),
  block_category_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().default(false),
  hooks: hooksSchema,
  metadata: metadataSchema,
  // WP-028 Phase 5 (Ruling HH / OQ2) — accept `null` as an explicit clear-signal
  // alongside missing/undefined. Supabase `update({ variants: null })` NULLs the
  // column; `update({ variants: undefined })` is dropped client-side and leaves
  // the old row value intact. Clients emit null on empty to avoid that silent
  // drift (Studio formDataToPayload + tools/block-forge App.tsx handleSave).
  variants: variantsSchema.nullable().optional(),
})

// ── Update block (all fields optional except immutable slug) ──

export const updateBlockSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  html: z.string().min(1).optional(),
  css: z.string().optional(),
  js: z.string().optional(),
  block_type: z.string().optional(),
  block_category_id: z.string().uuid().nullable().optional(),
  is_default: z.boolean().optional(),
  hooks: hooksSchema.optional(),
  metadata: metadataSchema.optional(),
  variants: variantsSchema.nullable().optional(),
})

export type CreateBlockPayload = z.infer<typeof createBlockSchema>
export type UpdateBlockPayload = z.infer<typeof updateBlockSchema>
