import { createClient } from '@cmsmasters/db'

/**
 * Creates a Supabase browser client for Vite SPAs.
 * Each app calls this independently — per-app sessions (ADR-022).
 */
export function createBrowserClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // M4 cut: runtime guard — env.d.ts silences TS but doesn't prevent undefined at runtime
  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file.'
    )
  }

  return createClient(url, anonKey)
}
