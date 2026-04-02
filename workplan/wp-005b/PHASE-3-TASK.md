# WP-005B Phase 3: Hono API Routes — Blocks + Templates CRUD

> Workplan: WP-005B DB Foundation + Hono API for Blocks & Templates
> Phase: 3 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Backend (API routes)
> Previous: Phase 2 ✅ (Validators + DB query layer — 14 smoke + 45 mapper tests pass)
> Next: Phase 4 (Studio Adaptation — placeholder for new model)

---

## Context

Phase 2 delivered Zod validators (`createBlockSchema`, `updateBlockSchema`, `createTemplateSchema`, `updateTemplateSchema`) and DB query functions (7 for blocks, 6 for templates). Now we wire them into Hono API routes.

Existing API pattern (from `revalidate.ts` and `upload.ts`):
- Hono sub-app with `AuthEnv` type
- `authMiddleware` for JWT verification
- `requireRole('content_manager', 'admin')` for authorization
- `createServiceClient(c.env)` for DB access (bypasses RLS)
- Response: `c.json({ data }, status)` or `c.json({ error: 'message' }, status)`

```
CURRENT API ROUTES:
  GET  /api/health                — public
  POST /api/content/revalidate    — auth + content_manager/admin
  POST /api/upload                — auth + content_manager/admin

AFTER THIS PHASE:
  GET    /api/blocks              — auth (list all)
  GET    /api/blocks/:id          — auth (get by ID)
  POST   /api/blocks              — auth + staff (create)
  PUT    /api/blocks/:id          — auth + staff (update)
  DELETE /api/blocks/:id          — auth + admin (delete with dep check)

  GET    /api/templates           — auth (list all)
  GET    /api/templates/:id       — auth (get by ID)
  POST   /api/templates           — auth + staff (create)
  PUT    /api/templates/:id       — auth + staff (update)
  DELETE /api/templates/:id       — auth + admin (delete with dep check)
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 2 deliverables
ls packages/validators/src/block.ts packages/validators/src/template.ts
ls packages/db/src/queries/blocks.ts packages/db/src/queries/templates.ts

# 2. Current API routes
ls apps/api/src/routes/

# 3. API deps — @cmsmasters/validators NOT present yet
grep "validators" apps/api/package.json
# Expected: no match — must add

# 4. Current index.ts route mounting
cat apps/api/src/index.ts

# 5. Auth middleware types
head -15 apps/api/src/middleware/auth.ts

# 6. Service client
cat apps/api/src/lib/supabase.ts

# 7. Role middleware
cat apps/api/src/middleware/role.ts
```

**Document findings before writing any code.**

---

## Task 3.1: Add @cmsmasters/validators Dependency to API

Update `apps/api/package.json`:

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
    "@cmsmasters/db": "*",
    "@cmsmasters/validators": "*"
  },
  "devDependencies": {
    "wrangler": "^3",
    "@cloudflare/workers-types": "^4"
  }
}
```

Then run `npm install` from monorepo root.

---

## Task 3.2: Create apps/api/src/routes/blocks.ts

10 route handlers for blocks CRUD.

```typescript
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getBlocks,
  getBlockById,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from '@cmsmasters/db'
import { createBlockSchema, updateBlockSchema } from '@cmsmasters/validators'

const blocks = new Hono<AuthEnv>()

// ── GET /blocks — list all blocks ──

blocks.get(
  '/blocks',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getBlocks(supabase)
    return c.json({ data })
  }
)

// ── GET /blocks/:id — get block by ID ──

blocks.get(
  '/blocks/:id',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      const data = await getBlockById(supabase, c.req.param('id'))
      return c.json({ data })
    } catch {
      return c.json({ error: 'Block not found' }, 404)
    }
  }
)

// ── POST /blocks — create block ──

blocks.post(
  '/blocks',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = createBlockSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await createBlock(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      // Unique constraint violation (slug already exists)
      if (message.includes('duplicate key') || message.includes('unique')) {
        return c.json({ error: `Block slug "${parsed.data.slug}" already exists` }, 409)
      }
      return c.json({ error: message }, 500)
    }
  }
)

// ── PUT /blocks/:id — update block ──

blocks.put(
  '/blocks/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updateBlockSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await updateBlock(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch {
      return c.json({ error: 'Block not found or update failed' }, 404)
    }
  }
)

// ── DELETE /blocks/:id — delete block (with dependency check) ──

blocks.delete(
  '/blocks/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const supabase = createServiceClient(c.env)

    // Dependency check: is this block used in any template?
    const usage = await getBlockUsage(supabase, id)
    if (usage.length > 0) {
      return c.json({
        error: 'Block is used in templates',
        templates: usage,
      }, 409)
    }

    try {
      await deleteBlock(supabase, id)
      return c.json({ deleted: true })
    } catch {
      return c.json({ error: 'Block not found or delete failed' }, 404)
    }
  }
)

export { blocks }
```

**Key decisions:**
- **GET = auth only** (any authenticated user can browse blocks)
- **POST/PUT = content_manager or admin** (create/edit blocks)
- **DELETE = admin only** (destructive, with dependency check)
- **409 Conflict** for duplicate slug or blocks in use
- **`created_by`** injected from auth context (`c.get('userId')`)
- **Validation** via Zod before DB call

---

## Task 3.3: Create apps/api/src/routes/templates.ts

Same pattern for templates CRUD.

```typescript
import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from '@cmsmasters/db'
import { createTemplateSchema, updateTemplateSchema } from '@cmsmasters/validators'

const templates = new Hono<AuthEnv>()

// ── GET /templates — list all templates ──

templates.get(
  '/templates',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getTemplates(supabase)
    return c.json({ data })
  }
)

// ── GET /templates/:id — get template by ID ──

templates.get(
  '/templates/:id',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      const data = await getTemplateById(supabase, c.req.param('id'))
      return c.json({ data })
    } catch {
      return c.json({ error: 'Template not found' }, 404)
    }
  }
)

// ── POST /templates — create template ──

templates.post(
  '/templates',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = createTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await createTemplate(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Create failed'
      if (message.includes('duplicate key') || message.includes('unique')) {
        return c.json({ error: `Template slug "${parsed.data.slug}" already exists` }, 409)
      }
      return c.json({ error: message }, 500)
    }
  }
)

// ── PUT /templates/:id — update template ──

templates.put(
  '/templates/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await updateTemplate(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch {
      return c.json({ error: 'Template not found or update failed' }, 404)
    }
  }
)

// ── DELETE /templates/:id — delete template (with dependency check) ──

templates.delete(
  '/templates/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const supabase = createServiceClient(c.env)

    // Dependency check: is this template used by any theme?
    const usage = await getTemplateUsage(supabase, id)
    if (usage.length > 0) {
      return c.json({
        error: 'Template is used by themes',
        themes: usage,
      }, 409)
    }

    try {
      await deleteTemplate(supabase, id)
      return c.json({ deleted: true })
    } catch {
      return c.json({ error: 'Template not found or delete failed' }, 404)
    }
  }
)

export { templates }
```

---

## Task 3.4: Mount Routes in apps/api/src/index.ts

Add block and template routes:

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './env'
import { health } from './routes/health'
import { revalidate } from './routes/revalidate'
import { upload } from './routes/upload'
import { blocks } from './routes/blocks'
import { templates } from './routes/templates'

const app = new Hono<{ Bindings: Env }>()

// CORS — localhost dev ports + production domains (add when deployed)
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173', // Studio (Vite default)
      'http://localhost:5174', // Dashboard
      'http://localhost:5175', // Admin
      'http://localhost:5176', // Support
      'http://localhost:4000', // Command Center
      'http://localhost:3000', // Portal (Next.js)
    ],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  })
)

// M1: health is public — mounted before any auth
app.route('/api', health)

// Protected routes — auth middleware applied per-route, not globally
app.route('/api', revalidate)
app.route('/api', upload)
app.route('/api', blocks)
app.route('/api', templates)

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app

// Phase 4 contract: type-safe RPC client imports this type
export type AppType = typeof app
```

---

## Task 3.5: Add @cmsmasters/validators tsconfig path alias

The API currently has no tsconfig path alias for validators. Check if it has a `tsconfig.json`:

```bash
cat apps/api/tsconfig.json 2>/dev/null || echo "No tsconfig — Wrangler uses its own TS config"
```

If `tsconfig.json` exists, add `@cmsmasters/validators` path. If not, Wrangler resolves workspace packages via npm — should work without paths. **Verify by building.**

---

## Files to Create (2)

| File | Content |
|------|---------|
| `apps/api/src/routes/blocks.ts` | 5 endpoints: GET list, GET :id, POST, PUT :id, DELETE :id |
| `apps/api/src/routes/templates.ts` | 5 endpoints: GET list, GET :id, POST, PUT :id, DELETE :id |

## Files to Modify (2)

| File | Changes |
|------|---------|
| `apps/api/src/index.ts` | Import + mount blocks + templates routes |
| `apps/api/package.json` | Add `@cmsmasters/validators` dependency |

---

## Acceptance Criteria

- [ ] `apps/api/src/routes/blocks.ts` exists with 5 route handlers
- [ ] `apps/api/src/routes/templates.ts` exists with 5 route handlers
- [ ] Routes mounted in `apps/api/src/index.ts`
- [ ] `@cmsmasters/validators` in API package.json deps
- [ ] Block routes: GET list (auth), GET :id (auth), POST (staff), PUT (staff), DELETE (admin + dep check)
- [ ] Template routes: same pattern
- [ ] POST validates body with Zod schema, returns 400 on failure
- [ ] POST returns 409 on duplicate slug
- [ ] DELETE returns 409 if dependencies exist (block in template, template in theme)
- [ ] `created_by` injected from auth context
- [ ] `npm run build` in apps/api/ — 0 errors (wrangler dry-run)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005B Phase 3 Verification ==="

# 1. Files exist
echo "--- Files ---"
ls apps/api/src/routes/blocks.ts && echo "✅ blocks.ts"
ls apps/api/src/routes/templates.ts && echo "✅ templates.ts"

# 2. Routes mounted
echo "--- Route mounting ---"
grep "blocks\|templates" apps/api/src/index.ts
echo "(expected: import + route mount for both)"

# 3. Validators dep
echo "--- API deps ---"
grep "validators" apps/api/package.json
echo "(expected: @cmsmasters/validators)"

# 4. Build check
echo "--- API build ---"
cd apps/api && npm run build 2>&1 && echo "✅ API builds" || echo "❌ API build FAILED"
cd ../..

# 5. Route count
echo "--- Route handlers ---"
grep -c "blocks\.\(get\|post\|put\|delete\)" apps/api/src/routes/blocks.ts
echo "(expected: 5)"
grep -c "templates\.\(get\|post\|put\|delete\)" apps/api/src/routes/templates.ts
echo "(expected: 5)"

# 6. Dependency checks present
echo "--- Dep checks ---"
grep -c "getBlockUsage\|getTemplateUsage" apps/api/src/routes/blocks.ts apps/api/src/routes/templates.ts
echo "(expected: 1 each)"

echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005b/phase-3-result.md`

```markdown
# Execution Log: WP-005B Phase 3 — Hono API Routes
> Epic: WP-005B DB Foundation + API
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ❌ FAILED

## What Was Done
{summary}

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## API Endpoints
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|

## Verification Results
| Check | Result |
|-------|--------|
| blocks.ts exists (5 handlers) | ✅/❌ |
| templates.ts exists (5 handlers) | ✅/❌ |
| Routes mounted | ✅/❌ |
| @cmsmasters/validators dep | ✅/❌ |
| API build (wrangler) | ✅/❌ |
| Dep checks present | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

## Git

```bash
git add apps/api/ logs/wp-005b/
git commit -m "feat: blocks + templates CRUD API routes [WP-005B phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Follow existing pattern EXACTLY** from `revalidate.ts` — Hono sub-app, `AuthEnv` type, `authMiddleware` + `requireRole()`.
- **`createServiceClient(c.env)`** for DB access — already exists in `apps/api/src/lib/supabase.ts`.
- **GET routes use `authMiddleware` only** (no role check — any authenticated user can browse).
- **DELETE routes use `requireRole('admin')` only** — more restrictive than create/update.
- **`c.get('userId')` is set by `authMiddleware`** — use it for `created_by` field.
- **Zod parse BEFORE DB call** — fail fast on bad input.
- **Error messages should NOT leak internal details** — generic messages for catches, Zod issues for validation.
- **Wrangler build = `wrangler deploy --dry-run`** — this is the existing build script in package.json.
- **If wrangler can't resolve `@cmsmasters/validators`**, check if `apps/api/tsconfig.json` needs a path alias or if wrangler config needs `compatibility_flags`.
- **Do NOT modify any packages/** in this phase — only `apps/api/`.
