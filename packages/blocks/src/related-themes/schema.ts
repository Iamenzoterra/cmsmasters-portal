import { z } from 'zod'

export const relatedThemesDataSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(12).optional().default(4),
})

export type RelatedThemesData = z.infer<typeof relatedThemesDataSchema>
