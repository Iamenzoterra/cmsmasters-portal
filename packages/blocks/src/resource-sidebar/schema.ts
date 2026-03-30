import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const resourceSidebarDataSchema = z.record(z.string(), z.unknown())

export type ResourceSidebarData = z.infer<typeof resourceSidebarDataSchema>
