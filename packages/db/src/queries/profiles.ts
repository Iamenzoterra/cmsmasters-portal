import type { SupabaseClient } from '../client'
import type { ProfileUpdate } from '../types'

export async function getProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

// M2 cut: Omit role/id/created_at/updated_at — prevent callers from changing role
type SafeProfileUpdate = Omit<ProfileUpdate, 'role' | 'id' | 'created_at' | 'updated_at'>

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  updates: SafeProfileUpdate
) {
  const { data, error } = await client
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
