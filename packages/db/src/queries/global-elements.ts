import type { SupabaseClient } from '../client'
import type { GlobalElementInsert, GlobalElementUpdate, GlobalSlot } from '../types'

/** List all global elements with block details */
export async function getGlobalElements(client: SupabaseClient) {
  const { data, error } = await client
    .from('global_elements')
    .select('*, blocks(*)')
    .order('slot', { ascending: true })
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

/** Get global elements filtered by slot */
export async function getGlobalElementsBySlot(client: SupabaseClient, slot: GlobalSlot) {
  const { data, error } = await client
    .from('global_elements')
    .select('*, blocks(*)')
    .eq('slot', slot)
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

/** Create a new global element */
export async function createGlobalElement(client: SupabaseClient, element: GlobalElementInsert) {
  const { data, error } = await client
    .from('global_elements')
    .insert(element)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing global element by ID */
export async function updateGlobalElement(
  client: SupabaseClient,
  id: string,
  updates: GlobalElementUpdate
) {
  const { data, error } = await client
    .from('global_elements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a global element by ID */
export async function deleteGlobalElement(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('global_elements')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Resolve global elements for a given page type and slug.
 * Returns the highest-priority matching element per slot.
 *
 * Scope matching rules:
 *   'sitewide'           → matches all pages
 *   '{pageType}:*'       → matches all pages of that type
 *   '{pageType}:{slug}'  → matches specific page
 */
export async function resolveGlobalElementsForPage(
  client: SupabaseClient,
  pageType: string,
  pageSlug: string
) {
  const { data, error } = await client
    .from('global_elements')
    .select('*, blocks(*)')
    .order('priority', { ascending: false })
  if (error) throw error

  const slots = ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const
  const result: Record<string, (typeof data)[number] | null> = {}

  for (const slot of slots) {
    const candidates = (data ?? [])
      .filter((ge) => ge.slot === slot)
      .filter((ge) => matchesScope(ge.scope, pageType, pageSlug))

    result[slot] = candidates[0] ?? null
  }

  return result
}

function matchesScope(scope: string, pageType: string, pageSlug: string): boolean {
  if (scope === 'sitewide') return true
  if (scope === `${pageType}:*`) return true
  if (scope === `${pageType}:${pageSlug}`) return true
  return false
}
