import { hc } from 'hono/client'

// M2: type-only import — no runtime code from apps/api enters client bundle
import type { AppType } from '../../../apps/api/src/index'

/**
 * Creates a type-safe API client for calling Hono routes.
 *
 * @param baseUrl — API base URL (from VITE_API_URL env var)
 * @param token — Supabase JWT access token (optional — omit for public routes)
 */
export function createApiClient(baseUrl: string, token?: string) {
  return hc<AppType>(baseUrl, {
    // M3: headers only when token is truthy — no "Bearer undefined"
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
