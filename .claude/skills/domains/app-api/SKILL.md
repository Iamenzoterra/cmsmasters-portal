---
domain: app-api
description: "Hono on Cloudflare Workers: CRUD routes, auth middleware, R2 upload, revalidation. Only place secrets live."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/api/src/index.ts` — Hono app setup, CORS, route mounting, `AppType` export
2. `apps/api/src/middleware/auth.ts` — JWT auth via `supabase.auth.getUser(token)`
3. `apps/api/src/routes/blocks.ts` — representative CRUD route pattern

## Public API

(none — API is accessed via HTTP, not TS imports. `AppType` is imported type-only by pkg-api-client)

## Invariants

- **Secrets boundary.** Envato key, Resend key, Claude API key, R2 creds, Supabase `service_role` key — ONLY here. NEVER in SPA bundles.
- **Supabase client uses `service_role` key** — bypasses RLS. All authorization is handled by middleware, not DB-level RLS.
- **Auth middleware validates JWT via `supabase.auth.getUser(token)`.** This delegates to Supabase's token verification — works with any signing algorithm and handles key rotation. Sets `userId` + `userEmail` on Hono context.
- **Role middleware** (`middleware/role.ts`) checks profile role for admin-only routes. Separate from auth — auth = who, role = what.
- **Health route is public** — mounted before auth middleware in index.ts.
- **CORS whitelist** includes localhost dev ports (5173-5176, 4000, 3000, 4321). Production domains not yet added.
- **`AppType` exported for type-safe RPC** — pkg-api-client imports this type-only to get typed client.

## Traps & Gotchas

- **`env()` reads from CF Workers env, not `process.env`.** Hono's `c.env` provides bindings. See `env.ts` for the `Env` type.
- **Route order matters in Hono.** Global middleware (CORS) registered first, then health (public), then protected routes. Auth middleware is per-route, not global.
- **Revalidate route calls Portal's `/api/revalidate`** — if Portal is down or secret mismatches, revalidation silently fails.
- **R2 upload routes** (`/upload` single, `/upload/batch` multiple) — files go to `cmsmasters-assets` R2 bucket. Max sizes enforced in route handler, not middleware.
- **No rate limiting currently** — all routes are open to authenticated users.

## Blast Radius

- **Changing index.ts** — affects ALL routes (CORS, error handler, route mounting)
- **Changing middleware/auth.ts** — affects every protected route
- **Changing env.ts** — affects how all routes access CF Workers bindings
- **Changing routes/revalidate.ts** — breaks Studio → Portal publish flow
- **Changing AppType export** — breaks type-safe RPC in pkg-api-client

## Recipes

```typescript
// Standard Hono route pattern:
import { Hono } from 'hono'
import { authMiddleware, type AuthEnv } from '../middleware/auth'

const route = new Hono<{ Bindings: Env }>()
route.use(authMiddleware)
route.get('/api/things', async (c) => {
  const userId = c.get('userId')
  // ... query with service_role client
  return c.json(data)
})

// Access CF Workers env:
const supabase = createServiceClient(c.env)
const bucket = c.env.ASSETS_BUCKET  // R2 binding
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** secrets boundary — Envato key, Resend key, Claude API key, R2 creds, service_role ONLY here
- **note:** supabase client uses service_role key — bypasses RLS
