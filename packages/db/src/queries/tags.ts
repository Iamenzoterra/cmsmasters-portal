import type { SupabaseClient } from '../client'
import type { TagInsert, TagUpdate } from '../types'

/** List all tags, ordered by name */
export async function getTags(client: SupabaseClient) {
  const { data, error } = await client
    .from('tags')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single tag by ID */
export async function getTagById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('tags')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new tag */
export async function createTag(client: SupabaseClient, tag: TagInsert) {
  const { data, error } = await client
    .from('tags')
    .insert(tag)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing tag by ID */
export async function updateTag(client: SupabaseClient, id: string, updates: TagUpdate) {
  const { data, error } = await client
    .from('tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a tag by ID */
export async function deleteTag(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('tags')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Get tags assigned to a theme (via junction table) */
export async function getThemeTags(client: SupabaseClient, themeId: string) {
  const { data, error } = await client
    .from('theme_tags')
    .select('tag_id, tags(id, name, slug)')
    .eq('theme_id', themeId)
  if (error) throw error
  return data?.map((r) => (r as unknown as { tags: Record<string, unknown> }).tags) ?? []
}

/** Replace all tag assignments for a theme */
export async function setThemeTags(client: SupabaseClient, themeId: string, tagIds: string[]) {
  const { error: delError } = await client
    .from('theme_tags')
    .delete()
    .eq('theme_id', themeId)
  if (delError) throw delError

  if (tagIds.length === 0) return

  const rows = tagIds.map((tag_id) => ({ theme_id: themeId, tag_id }))
  const { error: insError } = await client
    .from('theme_tags')
    .insert(rows)
  if (insError) throw insError
}
