import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const statsCounterDataSchema = z.record(z.string(), z.unknown())

export type StatsCounterData = z.infer<typeof statsCounterDataSchema>
