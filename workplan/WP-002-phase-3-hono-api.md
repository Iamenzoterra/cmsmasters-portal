# WP-002 Phase 3: Hono API Skeleton

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 3 of 6
> Priority: P0
> Estimated: 2–3 hours
> Type: Backend
> Previous: Phase 2 ✅ (Auth package — PKCE client, hooks, router-agnostic guard, actions)
> Next: Phase 4 (API Client + Validators)

---

## Context

Phases 1–2 delivered `@cmsmasters/db` (typed client, queries) and `@cmsmasters/auth` (browser client, hooks, guard). Now we build the server-side counterpart: Hono API on Cloudflare Workers.

Phase 0 RECON confirmed: `apps/api/` exists as directory with `.gitkeep` only — no package.json, no project.json, invisible to Nx. Full scaffolding from zero.

```
CURRENT:  @cmsmasters/db ✅, @cmsmasters/auth ✅
          apps/api = .gitkeep only, invisible to Nx                     ✅
          hono, wrangler = NOT installed                                ✅
MISSING:  Hono app, JWT middleware, routes, wrangler config, Nx target  ❌
```

**Secrets boundary (ADR-022 — CRITICAL):**
- `SUPABASE_SERVICE_KEY` lives ONLY in apps/api (wrangler secrets)
- `SUPABASE_JWT_SECRET` — for JWT verification
- NO secrets leak to SPA bundles. Ever.

**Reference:** `.context/LAYER_0_SPEC.md` §0.3 — Hono API Skeleton.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm apps/api current state
ls -la apps/api/
cat apps/api/package.json 2>/dev/null || echo "No package.json — expected"

# 2. Check if hono or wrangler already in node_modules
ls node_modules/hono 2>/dev/null || echo "hono not installed — expected"
ls node_modules/wrangler 2>/dev/null || echo "wrangler not installed — expected"

# 3. Check Nx project patterns — how does command-center register?
cat apps/command-center/project.json | head -30
echo "--- CC package.json scripts ---"
grep -A10 '"scripts"' apps/command-center/package.json 2>/dev/null

# 4. Check root workspaces config
grep -A5 '"workspaces"' package.json

# 5. Read the API spec
sed -n '/## 0.3 Hono API Skeleton/,/## 0.4/p' .context/LAYER_0_SPEC.md

# 6. Confirm @cmsmasters/db exports we need (service-role client)
grep "export" packages/db/src/client.ts
grep "export" packages/db/src/index.ts | head -5
```

**Document your findings before writing any code.**

---

## Task 3.1: Package & Nx Setup

### What to Build

**1. Create `apps/api/package.json`:**
```json
{
  "name": "@cmsmasters/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4",
    "@supabase/supabase-js": "^2",
    "@cmsmasters/db": "*"
  },
  "devDependencies": {
    "wrangler": "^3",
    "@cloudflare/workers-types": "^4"
  }
}
```

**2. Create `apps/api/project.json`:**
Follow the Command Center pattern but adapted for Wrangler:
```json
{
  "name": "@cmsmasters/api",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/api/src",
  "projectType": "application",
  "targets": {
    "dev": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx wrangler dev",
        "cwd": "apps/api"
      }
    },
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx wrangler deploy --dry-run",
        "cwd": "apps/api"
      }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npx wrangler deploy",
        "cwd": "apps/api"
      }
    }
  }
}
```

**3. Create `apps/api/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**4. Install dependencies:**
```bash
npm install hono @supabase/supabase-js --workspace=apps/api
npm install -D wrangler @cloudflare/workers-types --workspace=apps/api
```

**5. Delete `.gitkeep`** from apps/api/.

---

## Task 3.2: Wrangler Config

### What to Build

Create `apps/api/wrangler.toml`:

```toml
name = "cmsmasters-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
SUPABASE_URL = ""
# Non-secret vars can go here for dev
# For production: set via Cloudflare dashboard

# Secrets (set via `wrangler secret put`):
# SUPABASE_SERVICE_KEY
# SUPABASE_JWT_SECRET
```

**Note:** Secrets are NOT in this file. They're set via:
```bash
npx wrangler secret put SUPABASE_SERVICE_KEY
npx wrangler secret put SUPABASE_JWT_SECRET
```

Also create `apps/api/.dev.vars` (gitignored) template for local development:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-jwt-secret
```

Add `.dev.vars` to `.gitignore` if not already there.

---

## Task 3.3: Cloudflare Workers Env Type

### What to Build

Create `apps/api/src/env.ts` — type definition for Workers environment bindings:

```typescript
export interface Env {
  // Vars (from wrangler.toml [vars] or Cloudflare dashboard)
  SUPABASE_URL: string

  // Secrets (from `wrangler secret put`)
  SUPABASE_SERVICE_KEY: string
  SUPABASE_JWT_SECRET: string
}
```

This type is used by Hono: `new Hono<{ Bindings: Env }>()`.

---

## Task 3.4: Service-Role Supabase Client

### What to Build

Create `apps/api/src/lib/supabase.ts`:

```typescript
import { createClient } from '@cmsmasters/db'
import type { Env } from '../env'

/**
 * Creates a Supabase client with service_role key.
 * This bypasses RLS — use ONLY in API for admin operations.
 *
 * SECRETS BOUNDARY: service_role key exists ONLY here.
 */
export function createServiceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
}
```

---

## Task 3.5: JWT Auth Middleware

### What to Build

Create `apps/api/src/middleware/auth.ts`:

The middleware:
1. Extracts `Authorization: Bearer <token>` header
2. Verifies JWT signature using Supabase JWT secret
3. Extracts `sub` (user_id) and role from JWT claims
4. Attaches to Hono context for route handlers

```typescript
import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'

// Context variables set by auth middleware
type AuthVariables = {
  userId: string
  userRole: string
  userEmail: string
}

export type AuthEnv = {
  Bindings: Env
  Variables: AuthVariables
}

/**
 * JWT verification middleware.
 * Verifies Supabase JWT and extracts user claims.
 *
 * Supabase JWTs are standard JWTs signed with the project's JWT secret.
 * The payload contains:
 *   sub: user UUID
 *   email: user email
 *   role: 'authenticated' (Supabase default role, NOT our app role)
 *   app_metadata: { provider, providers }
 *   user_metadata: { full_name, etc }
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    // Verify JWT using Web Crypto API (available in CF Workers)
    const payload = await verifySupabaseJWT(token, c.env.SUPABASE_JWT_SECRET)

    if (!payload.sub) {
      return c.json({ error: 'Invalid token: missing sub claim' }, 401)
    }

    c.set('userId', payload.sub as string)
    c.set('userEmail', (payload.email as string) ?? '')
    // Note: Supabase JWT 'role' claim is always 'authenticated'
    // Our app role comes from profiles table — fetch if needed per-route
    c.set('userRole', 'authenticated')

    await next()
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

/**
 * Verify Supabase JWT using Web Crypto API.
 * Supabase uses HS256 (HMAC-SHA256) by default.
 */
async function verifySupabaseJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown>> {
  const [headerB64, payloadB64, signatureB64] = token.split('.')

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('Invalid JWT format')
  }

  // Import secret key for HMAC verification
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // Verify signature
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(signatureB64)

  const valid = await crypto.subtle.verify('HMAC', key, signature, data)

  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  // Decode and check expiry
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired')
  }

  return payload
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}
```

**Why manual JWT verification instead of a library:**
CF Workers don't have Node.js `crypto` module. We use the Web Crypto API which is natively available. Supabase uses HS256 (HMAC-SHA256) which is straightforward with Web Crypto. No external JWT library needed — fewer deps, no Node.js polyfill issues.

---

## Task 3.6: Role-Check Middleware (optional per-route)

### What to Build

Create `apps/api/src/middleware/role.ts`:

For routes that need app-level role checking (e.g., only admin or content_manager):

```typescript
import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from './auth'
import { createServiceClient } from '../lib/supabase'
import type { UserRole } from '@cmsmasters/db'

/**
 * Factory: creates a middleware that checks user's app role.
 * Must be used AFTER authMiddleware.
 *
 * Fetches role from profiles table using service client (bypasses RLS).
 */
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createServiceClient(c.env)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return c.json({ error: 'User profile not found' }, 403)
    }

    if (!roles.includes(profile.role as UserRole)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    // Update context with actual app role
    c.set('userRole', profile.role)

    await next()
  })
}
```

---

## Task 3.7: Route Handlers

### What to Build

**`apps/api/src/routes/health.ts`** — public, no auth:
```typescript
import { Hono } from 'hono'
import type { Env } from '../env'

const health = new Hono<{ Bindings: Env }>()

health.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cmsmasters-api',
  })
})

export { health }
```

**`apps/api/src/routes/revalidate.ts`** — protected (content_manager, admin):
```typescript
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

const revalidate = new Hono<AuthEnv>()

// POST /api/content/revalidate — triggers Portal SSG rebuild
revalidate.post(
  '/content/revalidate',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    // Stub — full implementation in Layer 2 (Portal SSG)
    return c.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      message: 'Stub — Portal revalidation not yet implemented',
    })
  }
)

export { revalidate }
```

**`apps/api/src/routes/upload.ts`** — protected (content_manager, admin):
```typescript
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

const upload = new Hono<AuthEnv>()

// POST /api/upload — generates R2 signed URL for file upload
upload.post(
  '/upload',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    // Stub — full implementation when R2 is configured
    return c.json({
      url: 'https://placeholder.r2.dev/upload-url',
      message: 'Stub — R2 signed URL generation not yet implemented',
    })
  }
)

export { upload }
```

---

## Task 3.8: Hono App Entry

### What to Build

Create `apps/api/src/index.ts` — the main entry point:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './env'
import { health } from './routes/health'
import { revalidate } from './routes/revalidate'
import { upload } from './routes/upload'

const app = new Hono<{ Bindings: Env }>()

// CORS — allow all localhost dev ports + future production domains
app.use('*', cors({
  origin: [
    'http://localhost:5173',  // Studio (Vite default)
    'http://localhost:5174',  // Dashboard
    'http://localhost:5175',  // Admin
    'http://localhost:5176',  // Support
    'http://localhost:4000',  // Command Center
    'http://localhost:3000',  // Portal (Next.js)
  ],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
}))

// Mount routes under /api prefix
app.route('/api', health)
app.route('/api', revalidate)
app.route('/api', upload)

// 404 fallback
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Export for Cloudflare Workers
export default app

// Export type for Hono RPC client (used by @cmsmasters/api-client in Phase 4)
export type AppType = typeof app
```

**CRITICAL:** The `export type AppType = typeof app` line is what Phase 4's api-client package will import for type-safe RPC. This is a TYPE-ONLY export — no runtime code leaks to the client bundle.

---

## Files to Modify

- `apps/api/package.json` — NEW
- `apps/api/project.json` — NEW (Nx registration)
- `apps/api/tsconfig.json` — NEW
- `apps/api/wrangler.toml` — NEW
- `apps/api/.dev.vars` — NEW (gitignored, local secrets)
- `apps/api/src/env.ts` — NEW: Env type
- `apps/api/src/index.ts` — NEW: Hono app entry + AppType export
- `apps/api/src/lib/supabase.ts` — NEW: service-role client
- `apps/api/src/middleware/auth.ts` — NEW: JWT verification
- `apps/api/src/middleware/role.ts` — NEW: role-check factory
- `apps/api/src/routes/health.ts` — NEW
- `apps/api/src/routes/revalidate.ts` — NEW (stub)
- `apps/api/src/routes/upload.ts` — NEW (stub)
- `apps/api/.gitkeep` — DELETE
- `.gitignore` — add `.dev.vars` if not present

---

## Acceptance Criteria

- [ ] `apps/api/package.json` exists with hono, @supabase/supabase-js, wrangler
- [ ] `apps/api/project.json` registers dev/build/deploy targets in Nx
- [ ] `npx nx show projects` includes `@cmsmasters/api`
- [ ] `npx tsc --noEmit -p apps/api/tsconfig.json` passes
- [ ] `cd apps/api && npx wrangler dev` starts without crash (may warn about missing secrets — OK)
- [ ] `GET /api/health` returns `{ status: 'ok', timestamp, service }` with 200
- [ ] Request to `/api/content/revalidate` WITHOUT Authorization header returns 401
- [ ] Request to `/api/upload` WITHOUT Authorization header returns 401
- [ ] `export type AppType` exists in src/index.ts (for Phase 4 api-client)
- [ ] `.dev.vars` is gitignored
- [ ] No secrets in any committed file

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. File structure
echo "--- File structure ---"
find apps/api -type f | sort
echo "(expect: package.json, project.json, tsconfig.json, wrangler.toml, .dev.vars, src/env.ts, src/index.ts, src/lib/supabase.ts, src/middleware/auth.ts, src/middleware/role.ts, src/routes/health.ts, src/routes/revalidate.ts, src/routes/upload.ts)"

# 2. Nx discovers the project
echo "--- Nx registration ---"
npx nx show projects 2>/dev/null | grep api
echo "(expect: @cmsmasters/api)"

# 3. TypeScript compiles
echo "--- TypeScript check ---"
npx tsc --noEmit -p apps/api/tsconfig.json 2>&1
echo "(expect: zero errors)"

# 4. AppType exported
echo "--- AppType export ---"
grep "export type AppType" apps/api/src/index.ts && echo "✅ AppType exported" || echo "❌ AppType missing"

# 5. Secrets boundary check
echo "--- Secrets boundary ---"
grep -r "SUPABASE_SERVICE_KEY\|service_role\|SERVICE_KEY" apps/api/src/ | grep -v "type\|interface\|Env\|.d.ts" | head -5
echo "(expect: only in lib/supabase.ts and env.ts type definition)"
grep -r "SUPABASE_SERVICE_KEY" packages/ 2>/dev/null && echo "❌ SECRET LEAK in packages!" || echo "✅ No secrets in packages"

# 6. .dev.vars is gitignored
echo "--- Gitignore ---"
grep "\.dev\.vars" .gitignore && echo "✅ .dev.vars in gitignore" || echo "⚠️ .dev.vars NOT in gitignore — add it"

# 7. Health route test (start wrangler briefly)
echo "--- Health route test ---"
echo "Run manually: cd apps/api && npx wrangler dev"
echo "Then: curl http://localhost:8787/api/health"
echo "(expect: 200 with { status: ok })"

# 8. No .gitkeep remains
echo "--- Cleanup ---"
test -f apps/api/.gitkeep && echo "❌ .gitkeep still exists" || echo "✅ .gitkeep removed"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-002/phase-3-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 3 — Hono API Skeleton
> Epic: Layer 0 Infrastructure
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| File structure (13 files) | ✅/❌ |
| Nx discovers @cmsmasters/api | ✅/❌ |
| TypeScript compiles | ✅/❌ |
| AppType exported | ✅/❌ |
| Secrets boundary clean | ✅/❌ |
| .dev.vars gitignored | ✅/❌ |
| Health route 200 | ✅/❌ |
| .gitkeep removed | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add apps/api/ .gitignore logs/wp-002/phase-3-result.md
git commit -m "feat: Hono API skeleton — JWT middleware, health/revalidate/upload routes [WP-002 phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Read `.context/LAYER_0_SPEC.md` §0.3 FIRST** — it has the package structure. This prompt expands with full code.
- **SECRETS BOUNDARY is non-negotiable:** `SUPABASE_SERVICE_KEY` exists ONLY in `apps/api/src/lib/supabase.ts` (usage) and `apps/api/src/env.ts` (type). Nowhere else. NEVER in packages/.
- **JWT verification uses Web Crypto API** — no Node.js `crypto`, no external JWT library. CF Workers have Web Crypto natively.
- **`export type AppType`** in index.ts is critical for Phase 4. Without it, api-client can't have type-safe RPC.
- **`.dev.vars`** is the Wrangler convention for local secrets. Must be gitignored.
- **Do NOT touch packages/db, packages/auth, or apps/command-center.**
- **wrangler dev may show warnings about missing secrets** — that's OK for this phase. The health route doesn't need them.
- If `npm install` in apps/api fails due to workspace issues, check that root package.json `workspaces` includes `"apps/*"`.
