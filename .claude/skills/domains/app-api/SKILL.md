---
domain: app-api
description: "Hono on Cloudflare Workers: 32+ routes (CRUD, admin, licenses, user), auth middleware, R2 upload, revalidation, Envato integration. Only place secrets live."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/api/src/index.ts` — Hono app setup, CORS, route mounting, `AppType` export
2. `apps/api/src/middleware/auth.ts` — JWT auth via `supabase.auth.getUser(token)`
3. `apps/api/src/routes/blocks.ts` — representative CRUD route pattern

## Route Files

| File | Endpoints | Auth |
|------|-----------|------|
| `routes/blocks.ts` | CRUD | staff |
| `routes/templates.ts` | CRUD | staff |
| `routes/pages.ts` | CRUD | staff |
| `routes/global-elements.ts` | CRUD | staff |
| `routes/licenses.ts` | POST /verify, GET / | user |
| `routes/admin.ts` | GET /stats, /users, /users/:id, POST /users/:id/staff-role, DELETE /users/:id/staff-role, GET /activity, /audit, /staff, /health | admin |
| `routes/user.ts` | GET /entitlements, GET /profile, PATCH /profile | user |
| `routes/upload.ts` | POST /upload, /upload/batch | staff |
| `routes/revalidate.ts` | POST /revalidate | staff |
| `routes/health.ts` | GET /health | public |

## Public API

(none — API is accessed via HTTP, not TS imports. `AppType` is imported type-only by pkg-api-client)

## Invariants

- **Secrets boundary.** Envato key, Resend key, Claude API key, R2 creds, Supabase `service_role` key — ONLY here. NEVER in SPA bundles.
- **Supabase client uses `service_role` key** — bypasses RLS. All authorization is handled by middleware, not DB-level RLS.
- **Auth middleware validates JWT via `supabase.auth.getUser(token)`.** Sets `userId` + `userEmail` on Hono context.
- **Role middleware** (`middleware/role.ts`) checks staff_roles first → profiles.role fallback for admin-only routes.
- **Health route is public** — mounted before auth middleware in index.ts.
- **CORS whitelist** includes localhost dev ports (5173-5176, 4000, 3000, 4321).
- **`AppType` exported for type-safe RPC** — pkg-api-client imports this type-only.
- **Envato mock mode** — `ENVATO_PERSONAL_TOKEN` value `dev_mock_token` or empty → mock responses; real token → live Envato API.
- **Self-demotion guard** — DELETE /users/:id/staff-role blocks admin from revoking own role.

## Traps & Gotchas

- **`env()` reads from CF Workers env, not `process.env`.** Hono's `c.env` provides bindings. See `env.ts` for the `Env` type.
- **Route order matters in Hono.** Global middleware (CORS) registered first, then health (public), then protected routes.
- **Revalidate route calls Portal's `/api/revalidate`** — if Portal is down or secret mismatches, revalidation silently fails.
- **R2 upload routes** (`/upload` single, `/upload/batch` multiple) — files go to `cmsmasters-assets` R2 bucket.
- **No rate limiting currently** — all routes are open to authenticated users.
- **Admin routes use `@cmsmasters/auth/resolvers` subpath** — NOT main `@cmsmasters/auth` (would pull browser deps into Workers).
- **`ENVATO_PERSONAL_TOKEN` in Env** — must be added to `apps/api/src/env.ts` type and `.dev.vars`.

## Blast Radius

- **Changing index.ts** — affects ALL routes (CORS, error handler, route mounting)
- **Changing middleware/auth.ts** — affects every protected route
- **Changing middleware/role.ts** — affects admin routes + Studio staff routes
- **Changing env.ts** — affects how all routes access CF Workers bindings
- **Changing routes/revalidate.ts** — breaks Studio → Portal publish flow
- **Changing routes/admin.ts** — affects Admin app (all 6 pages fetch from these endpoints)
- **Changing routes/licenses.ts** — affects Dashboard license verification
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
  return c.json(data)
})

// Admin-only route:
import { requireRole } from '../middleware/role'
route.use(requireRole('admin'))

// Envato integration (in routes/licenses.ts):
const token = c.env.ENVATO_PERSONAL_TOKEN
const isMock = !token || token === 'dev_mock_token'
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** secrets boundary — Envato key, Resend key, Claude API key, R2 creds, service_role ONLY here
- **note:** supabase client uses service_role key — bypasses RLS
