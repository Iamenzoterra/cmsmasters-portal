import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const testimonialsDataSchema = z.record(z.string(), z.unknown())

export type TestimonialsData = z.infer<typeof testimonialsDataSchema>

export const testimonialsDefaults: TestimonialsData = {}
