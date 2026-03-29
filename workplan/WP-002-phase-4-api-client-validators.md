# WP-002 Phase 4: API Client + Validators

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 4 of 6
> Priority: P0
> Estimated: 1.5–2 hours
> Type: Full-stack
> Previous: Phase 3 ✅ (Hono API — JWT middleware, health/revalidate/upload routes, AppType exported)
> Next: Phase 5 (Integration Verify + Env Template)

---

## Context

Phases 1–3 delivered: `@cmsmasters/db` (typed client, queries), `@cmsmasters/auth` (PKCE client, hooks, guard), and `apps/api` (Hono with JWT middleware, 3 routes, `export type AppType`).

Now we build the last two shared packages:
- `@cmsmasters/api-client` — Hono RPC typed wrapper so SPAs call the API with full autocomplete
- `@cmsmasters/validators` — Zod schemas shared between frontend forms and API validation

Phase 0 RECON confirmed:
- `packages/api-client` = .gitkeep ONLY (no package.json — invisible to Nx)
- `packages/validators` = package.json + .gitkeep (shell, visible to Nx)
- zod v4.3.6 is in node_modules as transitive dep (breaking changes from v3)
- Decision from Brain: **use zod v4**

```
CURRENT:  @cmsmasters/db ✅, @cmsmasters/auth ✅, apps/api ✅ (AppType exported)
          packages/api-client = .gitkeep only, NO package.json          ✅
          packages/validators = package.json shell + .gitkeep           ✅
          zod v4 in tree (transitive)                                   ✅
MISSING:  Hono RPC client, Zod theme schema                            ❌
```

**Reference:** `.context/LAYER_0_SPEC.md` §0.5 (API Client) and §0.6 (Validators).

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm api-client state
ls -la packages/api-client/
cat packages/api-client/package.json 2>/dev/null || echo "No package.json — expected"

# 2. Confirm validators state
ls -la packages/validators/
cat packages/validators/package.json

# 3. Confirm AppType export exists in apps/api
grep "export type AppType" apps/api/src/index.ts

# 4. Check hono/client availability (comes with hono)
ls node_modules/hono/dist/client 2>/dev/null || ls node_modules/hono/client 2>/dev/null || echo "Check hono client path"

# 5. Check zod version and API (v3 vs v4)
node -e "
try {
  const z = require('zod');
  console.log('zod version:', z.z ? 'v4 (has z namespace)' : 'v3');
  // v4 test: z.string() still works but .parse() returns different shape
  const s = z.z ? z.z.string() : z.string();
  console.log('string schema created OK');
} catch(e) { console.log('zod not importable:', e.message); }
"

# 6. Check Nx visibility
npx nx show projects 2>/dev/null | grep -E "api-client|validators"
```

**Document your findings before writing any code.**

**IMPORTANT — zod v4 API differences to watch for:**
- `z` is still the default export in most cases, but check if import path changed
- `.parse()` in v4 may return `{ success, data, error }` instead of throwing
- `.safeParse()` may have changed signature
- Test the actual installed version before writing schemas

---

## Task 4.1: API Client Package

### What to Build

Create `packages/api-client/` from scratch (no package.json exists).

**1. Create `packages/api-client/package.json`:**
```json
{
  "name": "@cmsmasters/api-client",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "hono": "^4"
  }
}
```

**Note:** `hono` is a dependency because we need `hono/client` for the RPC client. The api-client does NOT depend on `@cmsmasters/api` at runtime — it only imports the TYPE.

**2. Create `packages/api-client/tsconfig.json`:**
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
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**3. Create `packages/api-client/src/client.ts`:**

```typescript
import { hc } from 'hono/client'

// TYPE-ONLY import — no runtime code from apps/api enters the client bundle
import type { AppType } from '../../../apps/api/src/index'

/**
 * Creates a type-safe API client for calling Hono routes.
 *
 * Usage in any SPA:
 * ```ts
 * const api = createApiClient('http://localhost:8787', session.access_token)
 * const res = await api.api.health.$get()
 * const data = await res.json()
 * // data is typed as { status: string, timestamp: string, service: string }
 * ```
 *
 * @param baseUrl — API base URL (from VITE_API_URL env var)
 * @param token — Supabase JWT access token (from session)
 */
export function createApiClient(baseUrl: string, token?: string) {
  return hc<AppType>(baseUrl, {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : undefined,
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
```

**CRITICAL path note:** The `import type` uses a relative path `../../../apps/api/src/index` because there's no npm package to import from (apps/api is not published). This is type-only — the bundler strips it. If TS can't resolve this path, an alternative is to use a tsconfig path alias in the api-client's tsconfig:
```json
{
  "compilerOptions": {
    "paths": {
      "@cmsmasters/api/*": ["../../apps/api/src/*"]
    }
  }
}
```

Check which approach works. The relative path is simpler if TS resolves it.

**4. Create `packages/api-client/src/index.ts`:**
```typescript
export { createApiClient } from './client'
export type { ApiClient } from './client'
```

**5. Delete `.gitkeep`.**

**6. Run `npm install`** from root to register the new package in workspaces.

---

## Task 4.2: Validators Package

### What to Build

Update `packages/validators/` from shell to working package.

**1. Check zod v4 API first.** Run the audit command from Phase 0. If zod v4 is confirmed:

**2. Install zod explicitly:**
```bash
npm install zod --workspace=packages/validators
```

This pins the version explicitly rather than relying on transitive.

**3. Create `packages/validators/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**4. Create `packages/validators/src/theme.ts`:**

Write the theme schema using the ACTUAL zod version's API (v3 or v4 — verify first).

**If zod v3 (standard API):**
```typescript
import { z } from 'zod'

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')),
  themeforest_url: z.string().url().optional().or(z.literal('')),
  themeforest_id: z.string().optional(),
  thumbnail_url: z.string().optional(),
  preview_images: z.array(z.string().url()).default([]),
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  included_plugins: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    value: z.number().optional(),
    icon_url: z.string().optional(),
  })).default([]),
  custom_sections: z.array(z.object({
    type: z.string(),
    data: z.record(z.unknown()),
  })).default([]),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
```

**If zod v4 has different API** (e.g., different import, method chaining changes), adapt accordingly. The SHAPE of the schema is the same — only the zod API surface may differ. Check:
- Is it `import { z } from 'zod'` or `import { z } from 'zod/v4'`?
- Does `.optional()` still work the same way?
- Does `z.infer<>` still work?

**5. Create `packages/validators/src/index.ts`:**
```typescript
export { themeSchema } from './theme'
export type { ThemeFormData } from './theme'
```

**6. Update `packages/validators/package.json`:**
```json
{
  "name": "@cmsmasters/validators",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^4"
  }
}
```

Adjust `"zod": "^4"` or `"zod": "^3"` depending on what's actually installed and working.

**7. Delete `.gitkeep`.**

---

## Files to Modify

- `packages/api-client/package.json` — NEW
- `packages/api-client/tsconfig.json` — NEW
- `packages/api-client/src/client.ts` — NEW: Hono RPC typed client
- `packages/api-client/src/index.ts` — NEW: barrel export
- `packages/api-client/.gitkeep` — DELETE
- `packages/validators/package.json` — MODIFY: add main/exports/types, add zod dep
- `packages/validators/tsconfig.json` — NEW
- `packages/validators/src/theme.ts` — NEW: Zod schema
- `packages/validators/src/index.ts` — NEW: barrel export
- `packages/validators/.gitkeep` — DELETE

---

## Acceptance Criteria

- [ ] `@cmsmasters/api-client` resolves via `require.resolve`
- [ ] `createApiClient` returns typed Hono RPC client
- [ ] API client type-checks against AppType (route names autocomplete)
- [ ] `npx tsc --noEmit -p packages/api-client/tsconfig.json` passes
- [ ] `@cmsmasters/validators` resolves via `require.resolve`
- [ ] `themeSchema` validates correct data and rejects invalid
- [ ] `ThemeFormData` type is inferred correctly from schema
- [ ] `npx tsc --noEmit -p packages/validators/tsconfig.json` passes
- [ ] Both packages visible in `npx nx show projects`
- [ ] No .gitkeep remains in either package

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 4 Verification ==="

# 1. API Client
echo "--- API Client ---"
ls packages/api-client/src/
node -e "
try {
  const p = require.resolve('@cmsmasters/api-client', { paths: [process.cwd()] });
  console.log('✅ @cmsmasters/api-client resolves to:', p);
} catch(e) {
  console.log('❌ @cmsmasters/api-client does not resolve:', e.message);
}
"
npx tsc --noEmit -p packages/api-client/tsconfig.json 2>&1
echo "(expect: zero errors)"

# 2. Validators
echo "--- Validators ---"
ls packages/validators/src/
node -e "
try {
  const p = require.resolve('@cmsmasters/validators', { paths: [process.cwd()] });
  console.log('✅ @cmsmasters/validators resolves to:', p);
} catch(e) {
  console.log('❌ @cmsmasters/validators does not resolve:', e.message);
}
"
npx tsc --noEmit -p packages/validators/tsconfig.json 2>&1
echo "(expect: zero errors)"

# 3. Zod runtime validation test
echo "--- Zod runtime test ---"
node -e "
const { themeSchema } = require('@cmsmasters/validators');
if (!themeSchema) { console.log('❌ themeSchema not exported'); process.exit(1); }

// Valid data
try {
  const result = themeSchema.parse({ slug: 'test-theme', name: 'Test Theme' });
  console.log('✅ Valid data parsed:', typeof result);
} catch(e) {
  // v4 might use safeParse differently — adapt
  console.log('Parse attempt:', e.message);
}

// Invalid data (missing required name)
try {
  themeSchema.parse({ slug: 'test' });
  console.log('❌ Should have rejected missing name');
} catch(e) {
  console.log('✅ Correctly rejected invalid data');
}
" 2>&1

# 4. Nx visibility
echo "--- Nx projects ---"
npx nx show projects 2>/dev/null | grep -E "api-client|validators"
echo "(expect: both visible)"

# 5. Cleanup
echo "--- Cleanup ---"
test -f packages/api-client/.gitkeep && echo "❌ api-client .gitkeep exists" || echo "✅ api-client clean"
test -f packages/validators/.gitkeep && echo "❌ validators .gitkeep exists" || echo "✅ validators clean"

# 6. AppType import check
echo "--- AppType import ---"
grep -n "AppType" packages/api-client/src/client.ts
echo "(expect: import type { AppType } from ...)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-002/phase-4-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 4 — API Client + Validators
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
| api-client resolves | ✅/❌ |
| api-client TypeScript compiles | ✅/❌ |
| validators resolves | ✅/❌ |
| validators TypeScript compiles | ✅/❌ |
| Zod runtime: valid data parses | ✅/❌ |
| Zod runtime: invalid data rejected | ✅/❌ |
| Nx visibility (both packages) | ✅/❌ |
| .gitkeep removed (both) | ✅/❌ |
| AppType import present | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add packages/api-client/ packages/validators/ logs/wp-002/phase-4-result.md
git commit -m "feat: @cmsmasters/api-client + @cmsmasters/validators [WP-002 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Read `.context/LAYER_0_SPEC.md` §0.5 and §0.6** — primary reference for both packages.
- **api-client imports TYPE ONLY from apps/api.** Use `import type { AppType }`. No runtime code from apps/api should enter the client bundle. If relative path doesn't resolve, use tsconfig paths.
- **zod version matters.** Check the actual installed version FIRST. If v4 — its API may differ from v3 examples in LAYER_0_SPEC. Adapt the schema code to the actual API. The SHAPE (fields, validations) stays the same.
- **Do NOT touch packages/db, packages/auth, apps/api, or apps/command-center.**
- **Both packages follow the same tsconfig/package.json pattern** from Phases 1–2.
- If `hono/client` import fails in api-client, check that hono is installed in the package (not just at root).
