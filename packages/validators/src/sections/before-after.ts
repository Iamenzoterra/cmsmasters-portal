import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const beforeAfterDataSchema = z.record(z.string(), z.unknown())

export type BeforeAfterData = z.infer<typeof beforeAfterDataSchema>

export const beforeAfterDefaults: BeforeAfterData = {}
