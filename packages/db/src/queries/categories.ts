import type { SupabaseClient } from '../client'
import type { CategoryInsert, CategoryUpdate } from '../types'

/** List all categories, ordered by name */
export async function getCategories(client: SupabaseClient) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single category by ID */
export async function getCategoryById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new category */
export async function createCategory(client: SupabaseClient, category: CategoryInsert) {
  const { data, error } = await client
    .from('categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing category by ID */
export async function updateCategory(client: SupabaseClient, id: string, updates: CategoryUpdate) {
  const { data, error } = await client
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a category by ID */
export async function deleteCategory(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Get categories assigned to a theme (via junction table, includes is_primary) */
export async function getThemeCategories(client: SupabaseClient, themeId: string) {
  const { data, error } = await client
    .from('theme_categories')
    .select('category_id, is_primary, categories(id, name, slug)')
    .eq('theme_id', themeId)
  if (error) throw error
  return data?.map((r) => ({
    ...(r as any).categories,
    is_primary: r.is_primary,
  })) ?? []
}

/** Replace all category assignments for a theme (with is_primary per item) */
export async function setThemeCategories(
  client: SupabaseClient,
  themeId: string,
  items: Array<{ category_id: string; is_primary: boolean }>
) {
  const { error: delError } = await client
    .from('theme_categories')
    .delete()
    .eq('theme_id', themeId)
  if (delError) throw delError

  if (items.length === 0) return

  const rows = items.map((item) => ({ theme_id: themeId, ...item }))
  const { error: insError } = await client
    .from('theme_categories')
    .insert(rows)
  if (insError) throw insError
}
