import { z } from 'zod'

export const pluginComparisonDataSchema = z.object({
  included_plugins: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    value: z.number().optional(),
    icon_url: z.string().optional(),
  })).default([]),
})

export type PluginComparisonData = z.infer<typeof pluginComparisonDataSchema>
