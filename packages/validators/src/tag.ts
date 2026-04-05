import { z } from 'zod'

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
})

export type TagFormData = z.infer<typeof tagSchema>
