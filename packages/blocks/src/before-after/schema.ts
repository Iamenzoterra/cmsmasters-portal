import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const beforeAfterDataSchema = z.record(z.string(), z.unknown())

export type BeforeAfterData = z.infer<typeof beforeAfterDataSchema>
