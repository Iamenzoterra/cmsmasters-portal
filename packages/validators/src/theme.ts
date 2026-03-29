import { z } from 'zod'

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')),
  themeforest_url: z.string().url().optional().or(z.literal('')),
  themeforest_id: z.string().optional(),
  thumbnail_url: z.string().optional(),
  preview_images: z.array(z.string().url()).default([]),
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  included_plugins: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    value: z.number().optional(),
    icon_url: z.string().optional(),
  })).default([]),
  custom_sections: z.array(z.object({
    type: z.string(),
    data: z.record(z.string(), z.unknown()),
  })).default([]),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
