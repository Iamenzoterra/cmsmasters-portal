import { createClient } from '@cmsmasters/db'
import type { Env } from '../env'

/**
 * Creates a Supabase client with service_role key.
 * Bypasses RLS — use ONLY in API for admin operations.
 * SECRETS BOUNDARY: service_role key exists ONLY here.
 */
export function createServiceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
}
