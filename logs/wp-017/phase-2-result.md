# Execution Log: WP-017 Phase 2 — Auth Package Update
> Epic: WP-017 Layer 3 — Dashboard + Admin
> Executed: 2026-04-08T18:43:00+02:00
> Duration: ~15 minutes
> Status: COMPLETE
> Domains affected: pkg-auth, app-api

## What Was Implemented

Created the entitlement resolution module (`resolvers.ts`) with composable resolver functions per ADR-005 V2. Updated `useUser()` hook to fetch role via `get_user_role()` RPC in parallel with profile query, so staff_roles override profiles.role automatically. Updated API `requireRole()` middleware to check staff_roles first with profiles.role fallback. Added optional `entitlements` field to AuthState for future Dashboard/Admin use. All changes are backward-compatible — Studio login and CRUD unaffected.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Role resolution approach (client) | RPC `get_user_role()` | Already typed in Database definition (types.ts:695), single source of truth with DB function that checks staff_roles -> profiles.role |
| Role resolution approach (server) | Direct staff_roles query | Server uses service_role key (bypasses RLS), no need for RPC wrapper — direct query is simpler and avoids function call overhead |
| Entitlements on AuthState | Optional field | Too heavy to compute on every page load; will be computed on-demand in Dashboard/Admin |
| Parallel fetch in useUser() | Promise.all | Profile + RPC run simultaneously — no added latency vs current single query |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `packages/auth/src/resolvers.ts` | NEW | Entitlement resolution: 4 resolvers + merge + computeEntitlements |
| `packages/auth/src/types.ts` | MODIFY | Added optional `entitlements?: Entitlements` to authenticated AuthState |
| `packages/auth/src/hooks.ts` | MODIFY | useUser() now uses Promise.all for profile + get_user_role RPC |
| `packages/auth/src/index.ts` | MODIFY | Export resolvers + Entitlements type |
| `apps/api/src/middleware/role.ts` | MODIFY | requireRole() checks staff_roles first, profiles.role fallback |
| `src/__arch__/domain-manifest.ts` | MODIFY | Added resolvers.ts to pkg-auth owned_files |
| `supabase/migrations/013_fix_circular_rls.sql` | NEW | Fix circular RLS: drop redundant policies, rewrite admin policies to use get_user_role() |

## Issues & Workarounds
- **Circular RLS 500**: Migration 012 added `profiles_select_all_admin` (queries `staff_roles`) and `staff_roles_select_admin` (queries `profiles`) — cross-table RLS infinite recursion → 500 on profiles GET. Fixed with migration 013: dropped redundant policies (covered by 001's `get_user_role()`-based policies) and rewrote staff_roles/activity_log admin policies to use `get_user_role()` (SECURITY DEFINER bypasses RLS).

## Open Questions
None.

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | 312 passed (+1 for resolvers.ts) |
| auth tsc | 0 errors |
| Studio build | built in 4.14s |
| API tsc | 0 errors |
| Portal build | all routes compiled |
| Studio manual login test | ✅ (confirmed after 013 fix) |
| AC met | ✅ all met |

## Git
- Commit: pending — `auth: add entitlement resolvers, update role resolution to staff_roles, fix circular RLS [WP-017 phase 2]`
