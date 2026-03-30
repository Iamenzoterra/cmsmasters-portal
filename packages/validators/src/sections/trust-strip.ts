import { z } from 'zod'

// Trust strip renders from meta.trust_badges — no own data fields
export const trustStripDataSchema = z.object({})

export type TrustStripData = z.infer<typeof trustStripDataSchema>

export const trustStripDefaults: TrustStripData = {}
