import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const testimonialsDataSchema = z.record(z.string(), z.unknown())

export type TestimonialsData = z.infer<typeof testimonialsDataSchema>
