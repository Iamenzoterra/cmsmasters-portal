import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClient(url: string, key: string) {
  return supabaseCreateClient<Database>(url, key, {
    auth: { flowType: 'pkce' },
  })
}

export type SupabaseClient = ReturnType<typeof createClient>
