import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const ctaBannerDataSchema = z.record(z.string(), z.unknown())

export type CtaBannerData = z.infer<typeof ctaBannerDataSchema>
