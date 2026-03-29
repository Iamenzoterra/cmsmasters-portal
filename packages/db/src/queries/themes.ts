import type { SupabaseClient } from '../client'
import type { ThemeInsert } from '../types'

export async function getThemes(client: SupabaseClient) {
  const { data, error } = await client
    .from('themes')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getThemeBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function upsertTheme(client: SupabaseClient, theme: ThemeInsert) {
  const { data, error } = await client
    .from('themes')
    .upsert(theme, { onConflict: 'slug' })
    .select()
    .single()
  if (error) throw error
  return data
}
