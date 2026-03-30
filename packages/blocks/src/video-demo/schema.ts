import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const videoDemoDataSchema = z.record(z.string(), z.unknown())

export type VideoDemoData = z.infer<typeof videoDemoDataSchema>
