import { z } from 'zod'

export const featureGridDataSchema = z.object({
  features: z.array(z.object({
    icon: z.string().default(''),
    title: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
})

export type FeatureGridData = z.infer<typeof featureGridDataSchema>

export const featureGridDefaults: FeatureGridData = {
  features: [],
}
