import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const faqDataSchema = z.record(z.string(), z.unknown())

export type FaqData = z.infer<typeof faqDataSchema>

export const faqDefaults: FaqData = {}
