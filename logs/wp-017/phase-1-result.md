# Execution Log: WP-017 Phase 1 — DB Migration

> Epic: WP-017 Layer 3 — Dashboard + Admin
> Executed: 2026-04-08T18:00:00+02:00
> Duration: ~10 minutes
> Status: ✅ COMPLETE
> Domains affected: pkg-db

## What Was Implemented

Added `staff_roles` and `activity_log` tables to Supabase with full RLS policies. Updated `get_user_role()` to check `staff_roles` first with `profiles.role` fallback, automatically upgrading all 9 existing RLS policies. Created TypeScript types, 3 new query files (staff-roles, activity, licenses), and exported everything from `@cmsmasters/db`.

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| staff_roles admin RLS | `profiles.role = 'admin'` (not `get_user_role()`) | Avoids bootstrap circularity — function reads staff_roles |
| StaffRolePermissions type | Skipped (plain `string[]`) | No need for branded wrapper on a simple array |
| Table insertion order | After audit_log, before categories | Workplan said "before blocks" but actual order is audit_log → categories |
| known_gaps update | Changed text (not removed) | Preserves gap entry structure, reflects licenses queries now exist |

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `supabase/migrations/012_staff_roles_activity.sql` | created | staff_roles + activity_log tables, RLS, seed, get_user_role() update |
| `packages/db/src/types.ts` | modified | ActivityMetadata interface, StaffRoleName type, 2 Database tables, 5 aliases |
| `packages/db/src/queries/staff-roles.ts` | created | getStaffRoles, getAllStaffMembers, grantStaffRole, revokeStaffRole, hasStaffRole |
| `packages/db/src/queries/activity.ts` | created | logActivity, getActivityLog, getRecentActivations |
| `packages/db/src/queries/licenses.ts` | created | getUserLicenses, getAllLicenses, createLicense, getLicenseByPurchaseCode |
| `packages/db/src/index.ts` | modified | Export new types + 3 query modules |
| `src/__arch__/domain-manifest.ts` | modified | +3 owned_files, +2 owned_tables, updated known_gaps |

## Issues & Workarounds

None — clean implementation.

## Open Questions

None.

## Verification Results

| Check | Result |
|-------|--------|
| arch-test | ✅ (311 tests, +6 from baseline 305) |
| db tsc | ✅ (0 errors) |
| Studio build | ✅ (built in 5.00s) |
| API tsc (no NEW errors) | ✅ (0 errors) |
| staff_roles seeded | ✅ (1 admin row with ["*"] permissions) |
| get_user_role() works | ✅ (NULL in SQL Editor — expected, auth.uid() not set) |
| AC met | ✅ |

## Git

- Commit: `268ce76e` — `db: add staff_roles + activity_log tables, update get_user_role() [WP-017 phase 1]`
