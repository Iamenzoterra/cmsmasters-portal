import type { SupabaseClient } from '../client'
import type { License, LicenseInsert } from '../types'

export async function getUserLicenses(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('licenses')
    .select('*, themes!licenses_theme_id_fkey(id, slug, meta, status)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getAllLicenses(
  client: SupabaseClient,
  options?: { limit?: number; offset?: number }
) {
  let query = client
    .from('licenses')
    .select('*, profiles!licenses_user_id_fkey(id, email, full_name), themes!licenses_theme_id_fkey(id, slug, meta)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data, count: count ?? 0 }
}

export async function createLicense(client: SupabaseClient, license: LicenseInsert) {
  const { data, error } = await client
    .from('licenses')
    .insert(license)
    .select()
    .single()
  if (error) throw error
  return data as License
}

export async function getLicenseByPurchaseCode(client: SupabaseClient, purchaseCode: string) {
  const { data, error } = await client
    .from('licenses')
    .select('*')
    .eq('purchase_code', purchaseCode)
    .maybeSingle()
  if (error) throw error
  return data as License | null
}
