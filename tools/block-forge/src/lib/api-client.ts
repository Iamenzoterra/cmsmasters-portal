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

export type SaveBlockRequest = {
  block: BlockJson
  /** True on the first save-of-this-session; server writes `.bak` iff true. */
  requestBackup: boolean
}

export type SaveBlockResponse = {
  ok: true
  slug: string
  backupCreated: boolean
}

export async function saveBlock(
  req: SaveBlockRequest,
): Promise<SaveBlockResponse> {
  const res = await fetch(
    `/api/blocks/${encodeURIComponent(req.block.slug)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        block: req.block,
        requestBackup: req.requestBackup,
      }),
    },
  )
  if (!res.ok) {
    const errBody = await res
      .json()
      .catch(() => ({ error: 'unknown' }))
    throw new Error(
      `saveBlock failed: ${res.status} ${JSON.stringify(errBody)}`,
    )
  }
  return (await res.json()) as SaveBlockResponse
}

// WP-035 Phase 3 — Clone an existing sandbox block with auto-incrementing
// `<slug>-copy-N` suffix. Server is the slug-suffix authority; client just
// echoes the returned newSlug into App.tsx state.
export type CloneBlockResponse = {
  ok: true
  sourceSlug: string
  newSlug: string
}

export async function cloneBlock(
  sourceSlug: string,
): Promise<CloneBlockResponse> {
  const res = await fetch('/api/blocks/clone', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sourceSlug }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(
      `cloneBlock failed: ${res.status} ${JSON.stringify(errBody)}`,
    )
  }
  return (await res.json()) as CloneBlockResponse
}
