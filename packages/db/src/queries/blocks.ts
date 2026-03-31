import type { SupabaseClient } from '../client'
import type { BlockInsert, BlockUpdate } from '../types'

/** List all blocks, ordered by name */
export async function getBlocks(client: SupabaseClient) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single block by ID */
export async function getBlockById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Get a single block by slug */
export async function getBlockBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

/** Create a new block */
export async function createBlock(client: SupabaseClient, block: BlockInsert) {
  const { data, error } = await client
    .from('blocks')
    .insert(block)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing block by ID */
export async function updateBlock(client: SupabaseClient, id: string, updates: BlockUpdate) {
  const { data, error } = await client
    .from('blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a block by ID */
export async function deleteBlock(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('blocks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Check if a block is used in any template.
 * Returns array of template slugs that reference this block_id.
 * Used for dependency check before delete.
 *
 * M2: guards against malformed positions jsonb — never crashes on bad data.
 */
export async function getBlockUsage(client: SupabaseClient, blockId: string) {
  const { data, error } = await client
    .from('templates')
    .select('slug, name, positions')
  if (error) throw error

  const using = (data ?? []).filter(t => {
    if (!Array.isArray(t.positions)) return false
    return t.positions.some(
      (p: unknown) =>
        p !== null &&
        typeof p === 'object' &&
        'block_id' in p &&
        (p as { block_id: unknown }).block_id === blockId
    )
  })

  return using.map(t => ({ slug: t.slug, name: t.name }))
}
