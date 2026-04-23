// Browser-side fetch wrappers for the Vite middleware blocks API.
// No validation here — the server already schema-guards (GET /api/blocks/:slug
// delegates to the JSON on disk). Browser trusts the response shape.

import type { BlockJson } from '../types'

export type BlockListEntry = {
  slug: string
  name: string
  filename: string
}

export type BlockListResponse = {
  sourceDir: string
  blocks: BlockListEntry[]
}

export async function listBlocks(): Promise<BlockListResponse> {
  const res = await fetch('/api/blocks')
  if (!res.ok) {
    throw new Error(`listBlocks failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as BlockListResponse
}

export async function getBlock(slug: string): Promise<BlockJson> {
  const res = await fetch(`/api/blocks/${encodeURIComponent(slug)}`)
  if (!res.ok) {
    throw new Error(`getBlock(${slug}) failed: ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as BlockJson
}
