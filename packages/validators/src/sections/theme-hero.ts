import { z } from 'zod'

export const themeHeroDataSchema = z.object({
  headline: z.string().optional().default(''),
  screenshots: z.array(z.string()).default([]),
})

export type ThemeHeroData = z.infer<typeof themeHeroDataSchema>

export const themeHeroDefaults: ThemeHeroData = {
  headline: '',
  screenshots: [],
}
