export interface Env {
  // Vars (from wrangler.toml [vars] or Cloudflare dashboard)
  SUPABASE_URL: string

  // Secrets (from `wrangler secret put`)
  SUPABASE_SERVICE_KEY: string
  SUPABASE_JWT_SECRET: string
}
