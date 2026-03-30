import { z } from 'zod'

export const trustStripDataSchema = z.object({})

export type TrustStripData = z.infer<typeof trustStripDataSchema>
