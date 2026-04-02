import type { SupabaseClient } from '../client'
import type { PageInsert, PageUpdate } from '../types'

interface PageBlockInput {
  block_id: string
  position: number
  config?: Record<string, unknown>
}

/** List all pages, ordered by title */
export async function getPages(client: SupabaseClient) {
  const { data, error } = await client
    .from('pages')
    .select('*')
    .order('title', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single page by ID */
export async function getPageById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Get a single page by slug */
export async function getPageBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

/** Create a new page */
export async function createPage(client: SupabaseClient, page: PageInsert) {
  const { data, error } = await client
    .from('pages')
    .insert(page)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing page by ID */
export async function updatePage(client: SupabaseClient, id: string, updates: PageUpdate) {
  const { data, error } = await client
    .from('pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a page by ID */
export async function deletePage(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('pages')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Get page blocks with block details, ordered by position */
export async function getPageBlocks(client: SupabaseClient, pageId: string) {
  const { data, error } = await client
    .from('page_blocks')
    .select('*, blocks(*)')
    .eq('page_id', pageId)
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

/** Replace all blocks for a page (delete existing + insert new) */
export async function upsertPageBlocks(
  client: SupabaseClient,
  pageId: string,
  blocks: PageBlockInput[]
) {
  // Delete existing blocks for this page
  const { error: deleteError } = await client
    .from('page_blocks')
    .delete()
    .eq('page_id', pageId)
  if (deleteError) throw deleteError

  if (blocks.length === 0) return []

  // Insert new blocks with page_id set
  const rows = blocks.map((b) => ({ ...b, page_id: pageId }))
  const { data, error: insertError } = await client
    .from('page_blocks')
    .insert(rows)
    .select()
  if (insertError) throw insertError
  return data
}

/**
 * Check if a page has any page_blocks.
 * Used for dependency check before delete.
 */
export async function getPageBlockCount(client: SupabaseClient, pageId: string) {
  const { count, error } = await client
    .from('page_blocks')
    .select('*', { count: 'exact', head: true })
    .eq('page_id', pageId)
  if (error) throw error
  return count ?? 0
}
