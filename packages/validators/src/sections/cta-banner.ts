import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const ctaBannerDataSchema = z.record(z.string(), z.unknown())

export type CtaBannerData = z.infer<typeof ctaBannerDataSchema>

export const ctaBannerDefaults: CtaBannerData = {}
