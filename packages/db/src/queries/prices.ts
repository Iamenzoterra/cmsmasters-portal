import type { SupabaseClient } from '../client'
import type { PriceInsert, PriceUpdate } from '../types'

/** List all prices, ordered by name */
export async function getPrices(client: SupabaseClient) {
  const { data, error } = await client
    .from('prices')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single price by ID */
export async function getPriceById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('prices')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new price */
export async function createPrice(client: SupabaseClient, price: PriceInsert) {
  const { data, error } = await client
    .from('prices')
    .insert(price)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing price by ID */
export async function updatePrice(client: SupabaseClient, id: string, updates: PriceUpdate) {
  const { data, error } = await client
    .from('prices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a price by ID */
export async function deletePrice(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('prices')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Get prices assigned to a theme (via junction table) */
export async function getThemePrices(client: SupabaseClient, themeId: string) {
  const { data, error } = await client
    .from('theme_prices')
    .select('price_id, prices(id, name, slug, type)')
    .eq('theme_id', themeId)
  if (error) throw error
  return data?.map((r) => (r as any).prices) ?? []
}

/** Replace all price assignments for a theme */
export async function setThemePrices(client: SupabaseClient, themeId: string, priceIds: string[]) {
  const { error: delError } = await client
    .from('theme_prices')
    .delete()
    .eq('theme_id', themeId)
  if (delError) throw delError

  if (priceIds.length === 0) return

  const rows = priceIds.map((price_id) => ({ theme_id: themeId, price_id }))
  const { error: insError } = await client
    .from('theme_prices')
    .insert(rows)
  if (insError) throw insError
}
