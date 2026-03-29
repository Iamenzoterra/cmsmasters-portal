# Execution Log: WP-002 Phase 3 — Hono API Skeleton
> Epic: Layer 0 Infrastructure
> Executed: 2026-03-29T12:30:00+02:00
> Duration: ~20 minutes
> Status: ✅ COMPLETE

## What Was Implemented

Hono API skeleton on CF Workers with JWT authentication middleware (Web Crypto HMAC-SHA256), role-check authorization middleware (DB profile as source of truth), service-role Supabase client, and 3 routes: public health, protected revalidate stub, protected upload stub. Registered in Nx with wrangler dev/build/deploy targets. AppType exported for Phase 4 api-client.

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| Auth/authz separation (M2/M3) | JWT = authentication only; DB profile = authorization | JWT role claim is always 'authenticated' in Supabase, app role lives in profiles table |
| Health route (M1) | Public, no auth middleware | Mounted before protected routes, not affected by auth layer |
| .dev.vars (M4) | Not created as committed file | .gitignore entry + wrangler.toml comments. No template in repo to accidentally commit |
| requireRole precondition (M5) | Checks userId first → 401 | Prevents silent 403 when auth middleware is missing |
| JWT verification | Web Crypto API, no external library | CF Workers native, no Node.js polyfill needed |
| base64UrlDecode return | ArrayBuffer (not Uint8Array) | CF Workers types require ArrayBuffer for crypto.subtle.verify |

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `.gitignore` | modified | Added .dev.vars, .env.local |
| `apps/api/package.json` | created | hono@^4, wrangler@^3, @cloudflare/workers-types@^4 |
| `apps/api/project.json` | created | Nx targets: dev, build, deploy |
| `apps/api/tsconfig.json` | created | noEmit, ES2022, CF Workers types |
| `apps/api/wrangler.toml` | created | Worker config + secrets documentation |
| `apps/api/src/env.ts` | created | Env interface (3 bindings) |
| `apps/api/src/index.ts` | created | Hono app entry, CORS, route mounting, AppType export |
| `apps/api/src/lib/supabase.ts` | created | createServiceClient (secrets boundary) |
| `apps/api/src/middleware/auth.ts` | created | JWT authentication (Web Crypto HMAC-SHA256) |
| `apps/api/src/middleware/role.ts` | created | Role authorization from DB profile |
| `apps/api/src/routes/health.ts` | created | GET /health (public) |
| `apps/api/src/routes/revalidate.ts` | created | POST /content/revalidate (stub, protected) |
| `apps/api/src/routes/upload.ts` | created | POST /upload (stub, protected) |
| `apps/api/.gitkeep` | deleted | Replaced by real content |
| `package-lock.json` | modified | npm install side-effect |

## Issues & Workarounds

| Issue | Resolution |
|-------|-----------|
| `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource` in CF Workers types | Changed `base64UrlDecode` to return `ArrayBuffer` instead of `Uint8Array` |
| wrangler dev not tested on Windows | Deferred — tsc passes, runtime smoke test is manual |

## Open Questions

None.

## Verification Results

| Check | Result |
|-------|--------|
| Nx discovers @cmsmasters/api | ✅ |
| TypeScript compiles | ✅ (after ArrayBuffer fix) |
| AppType exported | ✅ |
| Secrets boundary (no SERVICE_KEY in packages/) | ✅ |
| .dev.vars gitignored | ✅ |
| M1: health is public (no authMiddleware) | ✅ |
| M5: requireRole checks userId first → 401 | ✅ |
| .gitkeep removed | ✅ |
| wrangler dev + health 200 | ✅ `{"status":"ok"}` |
| Protected route no auth → 401 | ✅ `Missing or invalid Authorization header` |
| Protected route bad token → 401 | ✅ `Invalid or expired token` |

## Git
- Commit: `c80969aa` — `feat: Hono API skeleton — JWT middleware, health/revalidate/upload routes [WP-002 phase 3]`
- Commit: `ee45ff59` — `fix: remove wrangler artifacts from tracking, add .wrangler/ to gitignore`
