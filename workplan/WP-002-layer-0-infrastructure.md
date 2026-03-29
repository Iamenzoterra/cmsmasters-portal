# WP-002: Layer 0 — Infrastructure

> Shared infrastructure that unblocks all four client apps (Studio, Portal, Dashboard, Admin).

**Status:** ✅ DONE
**Priority:** P0 — Critical path
**Prerequisites:** WP-001 ✅ (Command Center built, monorepo configured)
**Milestone/Wave:** MVP Slice — Layer 0
**Estimated effort:** 12–18 hours across 6 phases
**Created:** 2026-03-28
**Completed:** 2026-03-29

---

## Problem Statement

The monorepo has apps and package shells, but zero working infrastructure. No database schema, no auth, no API, no shared query helpers — nothing that a client app can import and use. Every app (Studio, Dashboard, Admin, Portal) is blocked until this layer exists.

Layer 0 delivers the "invisible plumbing" that all apps share: Supabase schema with RLS, auth package with route guards, Hono API skeleton with JWT middleware, typed DB and API client packages, and Zod validators. Without it, there's nothing to build on.

---

## Solution Overview

### Architecture

```
┌── Studio ──┐  ┌── Dashboard ──┐  ┌── Admin ──┐  ┌── Portal ──┐
│  Vite SPA  │  │   Vite SPA   │  │ Vite SPA  │  │  Next SSG  │
└─────┬──────┘  └──────┬───────┘  └─────┬─────┘  └─────┬──────┘
      │                │                │               │
      ▼                ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│  @cmsmasters/auth    @cmsmasters/db    @cmsmasters/validators│
│  @cmsmasters/api-client                @cmsmasters/ui        │
├─────────────────────────────┬───────────────────────────────┤
│  Supabase (direct, 90%)    │  Hono API (Workers, 10%)      │
│  anon key + RLS            │  service_role + secrets        │
│  profiles, themes,         │  JWT verify, health,           │
│  licenses, audit_log       │  revalidate, upload stubs      │
└─────────────────────────────┴───────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Auth provider | Supabase Auth (PKCE) | Already in stack, magic link, per-app sessions | Clerk (extra cost, extra dep) |
| Role storage | Single `role` column on profiles | MVP simplicity; ADR-020 V2 staff_roles table is post-MVP | Separate staff_roles table (more flexible but premature) |
| API framework | Hono on CF Workers | 0ms cold start, typed client, $0 at our scale | Supabase Edge Functions (Deno lock-in, cold starts) |
| Validators | Zod (runtime) | Shares types with frontend forms, composable | JSON Schema (no runtime type inference) |
| Type generation | Supabase CLI `gen types` | Single source of truth from live schema | Manual types (drift risk) |

---

## What This Changes

### New Files

```
packages/db/
├── src/
│   ├── client.ts              — createClient() factory
│   ├── types.ts               — auto-generated Database type from Supabase
│   ├── queries/
│   │   ├── themes.ts          — getThemes(), getThemeBySlug(), upsertTheme()
│   │   ├── profiles.ts        — getProfile(), updateProfile()
│   │   └── audit.ts           — logAction()
│   └── index.ts               — barrel export
├── package.json
└── tsconfig.json

packages/auth/
├── src/
│   ├── client.ts              — createBrowserClient() factory
│   ├── guards.tsx             — useRequireAuth(allowedRoles[]) hook
│   ├── hooks.ts               — useUser(), useSession(), useRole()
│   ├── types.ts               — UserRole, AuthState types
│   └── index.ts               — barrel export
├── package.json
└── tsconfig.json

packages/api-client/
├── src/
│   ├── client.ts              — Hono RPC typed client
│   └── index.ts
├── package.json
└── tsconfig.json

packages/validators/
├── src/
│   ├── theme.ts               — Zod schema for theme form
│   └── index.ts
├── package.json
└── tsconfig.json

apps/api/
├── src/
│   ├── index.ts               — Hono app entry, CORS, routes
│   ├── middleware/
│   │   └── auth.ts            — JWT verification from Supabase
│   ├── routes/
│   │   ├── health.ts          — GET /api/health
│   │   ├── revalidate.ts      — POST /api/content/revalidate (stub)
│   │   └── upload.ts          — POST /api/upload (R2 signed URL stub)
│   └── lib/
│       └── supabase.ts        — service_role Supabase client
├── wrangler.toml
├── package.json
└── tsconfig.json

supabase/
├── migrations/
│   └── 001_initial_schema.sql — profiles, themes, licenses, audit_log + RLS
└── seed.sql                   — test theme + role update instructions
```

### Modified Files

```
nx.json                        — register new packages and apps/api
.env.example                   — add Supabase + API env vars template
package.json (root)            — add supabase CLI as devDependency
```

### Database Changes

```sql
-- Migration: 001_initial_schema.sql
-- 4 tables: profiles, themes, licenses, audit_log
-- 1 trigger: handle_new_user() on auth.users INSERT
-- 1 helper fn: get_user_role()
-- 1 utility fn: update_updated_at()
-- 6 indexes
-- 12 RLS policies across 4 tables
-- Full SQL in .context/LAYER_0_SPEC.md §0.1
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Understand actual state of packages/, apps/, and env before writing any code.

**Tasks:**

0.1. **Audit package shells** — check what exists in each packages/ dir (package.json, src/, tsconfig)
0.2. **Audit apps/api** — does it exist? Any existing Hono setup?
0.3. **Check Nx config** — are packages registered? Can they import each other?
0.4. **Check env setup** — any .env, .env.example, .env.local files?
0.5. **Check Supabase state** — is there a `supabase/` dir? Any existing config?
0.6. **Report findings** — document what exists vs what's assumed in LAYER_0_SPEC

**Verification:** RECON report in execution log — no code written.

---

### Phase 1: Supabase Schema + DB Package (3–4h)

**Goal:** Live Supabase database with 4 tables, RLS policies, and a typed `@cmsmasters/db` package that other packages can import.

**Tasks:**

1.1. **Supabase migration file** — `supabase/migrations/001_initial_schema.sql` with all 4 tables, trigger, helper functions, indexes, RLS policies (from LAYER_0_SPEC §0.1)

1.2. **DB package** — `packages/db/` with:
- `client.ts` — createClient() factory (generic, works for both browser anon + server service_role)
- `types.ts` — auto-generated Database type (manual scaffold first, Supabase CLI gen later)
- `queries/themes.ts` — getThemes(), getThemeBySlug(), upsertTheme()
- `queries/profiles.ts` — getProfile(), updateProfile()
- `queries/audit.ts` — logAction()
- Barrel export via index.ts

1.3. **Nx registration** — ensure `@cmsmasters/db` is importable from other packages

1.4. **Seed file** — `supabase/seed.sql` with test theme + role assignment instructions

**⚠️ USER ACTION REQUIRED before this phase:**
Dmitry must create Supabase project via dashboard and provide: project URL, anon key, service_role key. Or — CC scaffolds everything locally and Dmitry connects Supabase later.

**Verification:**
- `packages/db` builds without errors
- TypeScript types compile
- Import `@cmsmasters/db` from another package resolves

---

### Phase 2: Auth Package (2–3h)

**Goal:** `@cmsmasters/auth` package that any Vite SPA can import for login, session management, and role-based route protection.

**Tasks:**

2.1. **Auth types** — UserRole union type, AuthState interface
2.2. **Browser client factory** — `createBrowserClient()` using `@supabase/supabase-js` + `@cmsmasters/db` Database type
2.3. **Auth hooks** — `useUser()`, `useSession()`, `useRole()` (React hooks wrapping Supabase onAuthStateChange)
2.4. **Route guard** — `useRequireAuth(allowedRoles[])` — redirects to /login if unauthorized or wrong role
2.5. **Nx registration** — ensure `@cmsmasters/auth` importable, depends on `@cmsmasters/db`

**Verification:**
- Package builds
- TypeScript: `useRequireAuth(['admin'])` accepts only valid role strings
- Import from another package resolves

---

### Phase 3: Hono API Skeleton (2–3h)

**Goal:** Working `apps/api` Hono app with JWT middleware, CORS, and 3 route stubs — deployable to CF Workers.

**Tasks:**

3.1. **Hono app entry** — `apps/api/src/index.ts` with CORS for localhost origins, route mounting
3.2. **JWT middleware** — verify Supabase JWT from Authorization header, extract user_id + role, attach to Hono context
3.3. **Service-role Supabase client** — `lib/supabase.ts` for server-side operations
3.4. **Routes:**
- `GET /api/health` — public, returns `{ status: 'ok', timestamp }`
- `POST /api/content/revalidate` — protected (content_manager, admin), stub that returns `{ revalidated: true }`
- `POST /api/upload` — protected, stub that returns `{ url: 'placeholder' }`
3.5. **Wrangler config** — `wrangler.toml` with vars placeholders
3.6. **Nx registration** — apps/api as buildable target

**Verification:**
- `wrangler dev` starts without errors (or `npx tsx src/index.ts` for local dev)
- `curl http://localhost:8787/api/health` returns 200
- Request without JWT to protected route returns 401

---

### Phase 4: API Client + Validators (1.5–2h)

**Goal:** `@cmsmasters/api-client` for type-safe API calls from SPAs, `@cmsmasters/validators` for shared Zod schemas.

**Tasks:**

4.1. **API client package** — `packages/api-client/` with Hono RPC typed client (`hono/client`), createApiClient(token) factory
4.2. **Validators package** — `packages/validators/` with themeSchema Zod validator (from LAYER_0_SPEC §0.6), exported ThemeFormData type
4.3. **Nx registration** — both packages importable, api-client depends on apps/api types

**Verification:**
- Both packages build
- `ThemeFormData` type inferred correctly from Zod schema
- `createApiClient` type-checks against Hono app routes

---

### Phase 5: Integration Verify + Env Template (1–1.5h)

**Goal:** All 6 deliverables work together. Env template documented. Dev can clone and start.

**Tasks:**

5.1. **Cross-package imports** — verify that a test file can import from all 4 packages without errors
5.2. **Env template** — `.env.example` with all required vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL, SUPABASE_SERVICE_KEY for API)
5.3. **Dev setup docs** — update `.context/BRIEF.md` Layer 0 status from ⬜ to ✅
5.4. **Smoke test script** — bash script that checks: all packages build, API starts, types compile

**Verification:**
- Full monorepo `nx build` passes for all new packages
- API local dev starts
- No circular dependencies
- .env.example has all vars

---

### Phase 6: Documentation Update (1h)

**Goal:** All docs reflect what was actually built.

**Tasks:**

6.1. **CC reads all phase logs** — understands what was done, what deviated from plan
6.2. **CC proposes doc updates** — list of files to update with proposed changes
6.3. **Brain approves** — reviews proposed changes
6.4. **CC executes doc updates** — updates canonical `.context/` files
6.5. **Update WP status** — mark WP-002 as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — mark Layer 0 done, update current task to Layer 1
- `.context/CONVENTIONS.md` — add patterns discovered (env vars naming, import conventions)
- `.context/LAYER_0_SPEC.md` — mark as completed, note any deviations
- `.context/ROADMAP.md` — update Layer 0 status
- `workplan/WP-002-layer-0-infrastructure.md` — status → ✅ DONE
- `logs/wp-002/phase-*-result.md` — must all exist

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase project not created yet | Phase 1 blocked for live deployment | CC scaffolds migration files + types locally; Dmitry creates project when ready; schema deployed later |
| Hono RPC type export from apps/api → packages/api-client | Circular dependency if not structured right | api-client imports only TYPE from api, not runtime code; use `import type` |
| Supabase CLI not installed | Can't auto-generate types | Manual type scaffold in Phase 1; CLI gen as follow-up or Phase 5 |
| RLS policies too restrictive for development | Can't test queries | Seed SQL includes role assignment; dev can temporarily use service_role key |
| Package shells already have conflicting configs | Build errors on Nx | Phase 0 RECON catches this; adapt Phase 1 to existing state |

---

## Acceptance Criteria (Definition of Done)

- [ ] Supabase migration file: 4 tables (profiles, themes, licenses, audit_log) + RLS + triggers
- [ ] `@cmsmasters/db` — exports typed client, query helpers, Database type
- [ ] `@cmsmasters/auth` — exports createBrowserClient, useRequireAuth, useUser, useSession, useRole
- [ ] `@cmsmasters/api-client` — exports createApiClient with Hono RPC types
- [ ] `@cmsmasters/validators` — exports themeSchema + ThemeFormData type
- [ ] `apps/api` — Hono app with JWT middleware, health/revalidate/upload routes
- [ ] All packages importable via `@cmsmasters/{name}` across monorepo
- [ ] `.env.example` with all required env vars documented
- [ ] All 6 phases logged in `logs/wp-002/`
- [ ] `.context/` docs updated (Phase 6)
- [ ] No known blockers for Layer 1 (Studio)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-001 (Command Center + monorepo) | ✅ DONE | Monorepo structure exists |
| Supabase project (manual) | ⬜ Dmitry | Live schema deployment (can scaffold without) |
| Cloudflare account (manual) | ⬜ Dmitry | API deployment (dev works locally without) |

---

## Notes

- Full SQL schema, code examples, and package structures are in `.context/LAYER_0_SPEC.md` — CC should read it as primary reference during implementation.
- ADR Bible references: ADR-005 (access model), ADR-010 (design system layers), ADR-018 (Supabase), ADR-020 (DB schema), ADR-022 (Hono API + secrets boundary).
- Simplified role model for MVP: single `role` column on profiles instead of separate `staff_roles` table from ADR-020. The staff_roles table is a post-MVP refinement — the single column covers all MVP needs and migrates cleanly later.
- Per-app sessions (ADR-022): each SPA creates its own Supabase client independently. No shared auth state between apps.
- Secrets boundary rule: Envato key, Resend key, Claude API key, R2 creds, service_role key → ONLY in `apps/api`. Never in SPA bundles.
