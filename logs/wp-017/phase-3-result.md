# Execution Log: WP-017 Phase 3 — Hono API Routes
> Epic: WP-017 Layer 3 — Dashboard + Admin
> Executed: 2026-04-08T21:45:00+02:00
> Duration: ~20 minutes
> Status: COMPLETE
> Domains affected: app-api, pkg-db, pkg-auth

## What Was Implemented

Created 3 new route modules (licenses, admin, user) providing 14 HTTP endpoints for Dashboard and Admin apps. License verification supports both real Envato API and dev-mode mock when token is placeholder. Admin routes are gated behind wildcard middleware `requireRole('admin')`. User routes expose entitlements computation and profile CRUD. Fixed two schema gaps discovered during audit: `licenses.theme_id` was NOT NULL (blocks license creation when theme not seeded), and `profiles.elements_subscriber` column was missing (needed by `computeEntitlements`).

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| `theme_id` nullable | Migration 014 | License verification can succeed before themes are seeded — NOT NULL would hard-fail |
| `elements_subscriber` column | Migration 014 | `computeEntitlements()` needs this boolean; adding default false is non-breaking |
| `@cmsmasters/auth` import strategy | Subpath export `./resolvers` | Barrel export pulls JSX guards + `import.meta.env` — both fail in Workers runtime |
| Admin middleware pattern | Wildcard `admin.use('/admin/*', ...)` | 9+ handlers share identical auth — per-route would be repetitive; departure from existing pattern but justified |
| Envato mock mode | Token value check | `dev_mock_token` or empty → mock success; real token → real API. `.dev.vars` already has a real token |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `supabase/migrations/014_license_theme_nullable_elements_subscriber.sql` | NEW | Make licenses.theme_id nullable + add profiles.elements_subscriber |
| `packages/db/src/types.ts` | MODIFY | theme_id nullable in License types, elements_subscriber in Profile types |
| `packages/auth/src/resolvers.ts` | MODIFY | Null guard on theme_id in licensedThemes/activeSupport arrays |
| `packages/auth/package.json` | MODIFY | Added `./resolvers` subpath export for Workers-safe import |
| `apps/api/package.json` | MODIFY | Added `@cmsmasters/auth` dependency |
| `apps/api/src/env.ts` | MODIFY | Added ENVATO_PERSONAL_TOKEN to Env interface |
| `apps/api/src/routes/licenses.ts` | NEW | POST /licenses/verify + GET /licenses |
| `apps/api/src/routes/admin.ts` | NEW | 9 admin endpoints: stats, users, staff-role CRUD, activity, audit, staff, health |
| `apps/api/src/routes/user.ts` | NEW | GET /user/entitlements, GET/PATCH /user/profile |
| `apps/api/src/index.ts` | MODIFY | Mount 3 new route groups |
| `src/__arch__/domain-manifest.ts` | MODIFY | Added 3 route files to app-api, added pkg-auth to allowed_imports_from |

## Verification Results
| Check | Result |
|-------|--------|
| `tsc --noEmit` (apps/api) | 0 errors |
| `npm run arch-test` | 315/315 passed |
| `npm run quality` | PASSED (4 pass, 3 warn, 0 fail) |
| Studio build | built in 5.78s |
| Manual API testing | Not run (requires wrangler dev + JWT) |

## Open Questions
- Manual endpoint testing deferred — requires running `wrangler dev` with valid JWT
- `.dev.vars` has what appears to be a real Envato token — mock mode won't activate locally
- Migration 014 needs to be applied to Supabase: `supabase db push` or via dashboard

## Endpoints Created
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/licenses/verify | user | Verify Envato purchase code, create license |
| GET | /api/licenses | user | List current user's licenses |
| GET | /api/admin/stats | admin | Overview counts (users, licenses, themes, staff) |
| GET | /api/admin/users | admin | Paginated user list with search/filter |
| GET | /api/admin/users/:id | admin | Full user detail (profile + licenses + staff + activity) |
| POST | /api/admin/users/:id/staff-role | admin | Grant staff role (audit logged) |
| DELETE | /api/admin/users/:id/staff-role | admin | Revoke staff role (self-demotion guard) |
| GET | /api/admin/activity | admin | Paginated activity log |
| GET | /api/admin/audit | admin | Paginated audit log |
| GET | /api/admin/staff | admin | All staff members |
| GET | /api/admin/health | admin | System health (DB, R2, table counts, Envato token) |
| GET | /api/user/entitlements | user | Computed access rights for current user |
| GET | /api/user/profile | user | Current user profile |
| PATCH | /api/user/profile | user | Update name/avatar |
