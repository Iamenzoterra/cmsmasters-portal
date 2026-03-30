import { supabase } from './supabase'
import type { Theme } from '@cmsmasters/db'

/**
 * Fetch ALL themes (any status) for staff view.
 *
 * Why not getThemes() from @cmsmasters/db?
 * That filters status='published' — Portal public view only.
 * Studio staff needs drafts + archived too.
 *
 * This is the SINGLE fetch point for the themes list page.
 * Grid and table views both consume this — no duplicate queries.
 */
export async function fetchAllThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Delete theme by ID. Intentionally Studio-local (not in shared @cmsmasters/db).
 * Rationale: delete is a destructive admin-only action. Save/publish use shared
 * upsertTheme to maintain contract across apps. Delete stays local because
 * only Studio performs it — Dashboard/Portal never delete themes.
 */
export async function deleteTheme(id: string): Promise<void> {
  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Fetch single theme by slug (any status).
 */
export async function fetchThemeBySlug(slug: string): Promise<Theme | null> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}
