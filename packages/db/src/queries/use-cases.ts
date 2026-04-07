import type { SupabaseClient } from '../client'
import type { UseCaseInsert, UseCaseUpdate } from '../types'

/** List all use cases, ordered by name */
export async function getUseCases(client: SupabaseClient) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single use case by ID */
export async function getUseCaseById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new use case */
export async function createUseCase(client: SupabaseClient, useCase: UseCaseInsert) {
  const { data, error } = await client
    .from('use_cases')
    .insert(useCase)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing use case by ID */
export async function updateUseCase(client: SupabaseClient, id: string, updates: UseCaseUpdate) {
  const { data, error } = await client
    .from('use_cases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a use case by ID (CASCADE removes all theme junctions) */
export async function deleteUseCase(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('use_cases')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Search use cases by name (ILIKE) — for autocomplete */
export async function searchUseCases(client: SupabaseClient, query: string, limit = 10) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

/** Get use cases assigned to a theme (via junction table) */
export async function getThemeUseCases(client: SupabaseClient, themeId: string) {
  const { data, error } = await client
    .from('theme_use_cases')
    .select('use_case_id, use_cases(id, name, slug)')
    .eq('theme_id', themeId)
  if (error) throw error
  return data?.map((r) => (r as any).use_cases) ?? []
}

/** Replace all use case assignments for a theme */
export async function setThemeUseCases(client: SupabaseClient, themeId: string, useCaseIds: string[]) {
  const { error: delError } = await client
    .from('theme_use_cases')
    .delete()
    .eq('theme_id', themeId)
  if (delError) throw delError

  if (useCaseIds.length === 0) return

  const rows = useCaseIds.map((use_case_id) => ({ theme_id: themeId, use_case_id }))
  const { error: insError } = await client
    .from('theme_use_cases')
    .insert(rows)
  if (insError) throw insError
}
