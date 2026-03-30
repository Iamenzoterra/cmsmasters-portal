import { z } from 'zod'

// Stub: permissive schema. Full schema in WP-005.
export const resourceSidebarDataSchema = z.record(z.string(), z.unknown())

export type ResourceSidebarData = z.infer<typeof resourceSidebarDataSchema>

export const resourceSidebarDefaults: ResourceSidebarData = {}
