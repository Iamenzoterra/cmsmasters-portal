import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const videoDemoDataSchema = z.record(z.string(), z.unknown())

export type VideoDemoData = z.infer<typeof videoDemoDataSchema>

export const videoDemoDefaults: VideoDemoData = {}
