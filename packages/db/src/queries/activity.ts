import type { SupabaseClient } from '../client'
import type { ActivityEntry, ActivityEntryInsert, ActivityMetadata } from '../types'

export async function logActivity(
  client: SupabaseClient,
  userId: string,
  action: string,
  themeSlug?: string,
  metadata?: ActivityMetadata
) {
  const insert: ActivityEntryInsert = {
    user_id: userId,
    action,
    theme_slug: themeSlug,
    metadata: metadata ?? {},
  }
  const { error } = await client.from('activity_log').insert(insert)
  if (error) throw error
}

export async function getActivityLog(
  client: SupabaseClient,
  options?: {
    userId?: string
    action?: string
    limit?: number
    offset?: number
  }
) {
  let query = client
    .from('activity_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (options?.userId) query = query.eq('user_id', options.userId)
  if (options?.action) query = query.eq('action', options.action)
  if (options?.limit) query = query.limit(options.limit)
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as ActivityEntry[], count: count ?? 0 }
}

export async function getRecentActivations(
  client: SupabaseClient,
  limit = 20
) {
  const { data, error } = await client
    .from('activity_log')
    .select('*')
    .eq('action', 'license_verified')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as ActivityEntry[]
}
