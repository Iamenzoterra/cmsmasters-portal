import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const statsCounterDataSchema = z.record(z.string(), z.unknown())

export type StatsCounterData = z.infer<typeof statsCounterDataSchema>

export const statsCounterDefaults: StatsCounterData = {}
