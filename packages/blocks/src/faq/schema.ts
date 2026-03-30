import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const faqDataSchema = z.record(z.string(), z.unknown())

export type FaqData = z.infer<typeof faqDataSchema>
