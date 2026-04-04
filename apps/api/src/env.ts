// Minimal R2 type for consumers that don't have @cloudflare/workers-types
// (e.g., api-client imported by Studio). At runtime in Workers, the real R2Bucket is used.
interface R2BucketBinding {
  head(key: string): Promise<unknown | null>
  get(key: string): Promise<unknown | null>
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: unknown): Promise<unknown>
  delete(key: string): Promise<void>
  list(options?: unknown): Promise<unknown>
}

export interface Env {
  // Vars (from wrangler.toml [vars] or Cloudflare dashboard)
  SUPABASE_URL: string
  R2_PUBLIC_URL: string // Public URL prefix for R2 assets (e.g., https://assets.cmsmasters.net)

  // Secrets (from `wrangler secret put`)
  SUPABASE_SERVICE_KEY: string
  PORTAL_REVALIDATE_URL: string   // e.g. https://portal.cmsmasters.net/api/revalidate
  PORTAL_REVALIDATE_SECRET: string

  // R2 bucket binding (from wrangler.toml [[r2_buckets]])
  ASSETS_BUCKET: R2BucketBinding
}
