import type { SupabaseClient } from '../client'
import type { BlockCategoryInsert, BlockCategoryUpdate } from '../types'

/** List all block categories, ordered by name */
export async function getBlockCategories(client: SupabaseClient) {
  const { data, error } = await client
    .from('block_categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single block category by ID */
export async function getBlockCategoryById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('block_categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new block category */
export async function createBlockCategory(client: SupabaseClient, category: BlockCategoryInsert) {
  const { data, error } = await client
    .from('block_categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing block category by ID */
export async function updateBlockCategory(client: SupabaseClient, id: string, updates: BlockCategoryUpdate) {
  const { data, error } = await client
    .from('block_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a block category by ID */
export async function deleteBlockCategory(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('block_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}
