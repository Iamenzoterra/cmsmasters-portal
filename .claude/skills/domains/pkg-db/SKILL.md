---
domain: pkg-db
description: "Supabase client, typed queries, mappers for all 15 tables incl. staff_roles + activity_log."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `packages/db/src/index.ts` — public API: every export consumers can use
2. `packages/db/src/types.ts` — generated DB types (all 15 table shapes)
3. `packages/db/src/queries/blocks.ts` — representative query pattern (CRUD + usage check)

## Public API

- `packages/db/src/index.ts`

## Invariants

- **All query functions take Supabase client as first arg.** Dependency injection — consumer provides the client (anon or service_role depending on context).
- **types.ts is auto-generated from Supabase.** Running `supabase gen types` overwrites it. Manual edits will be lost.
- **mappers.ts is the ONLY place DB→form and form→DB conversion happens.** Currently only theme mappers exist (`themeRowToFormData`, `formDataToThemeInsert`). Other entities don't need mappers yet — they map 1:1.
- **JSON columns are typed via branded types** in types.ts (ThemeMeta, ThemeSEO, BlockHooks, BlockMetadata, TemplatePosition, ThemeBlockFill, ActivityMetadata). Access sub-fields through these types, not raw `any`.
- **15 tables, all with RLS.** profiles, themes, blocks, templates, pages, page_blocks, global_elements, licenses, audit_log, categories, tags, theme_categories, theme_tags, staff_roles, activity_log.

## Tables Added by WP-017

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `staff_roles` | Flexible staff role assignment | user_id, role (admin/content_manager/support_operator), permissions jsonb, granted_by |
| `activity_log` | Business analytics | user_id, action, theme_slug, metadata jsonb |

### Column changes
- `profiles.elements_subscriber` — boolean, default false (used by entitlement resolvers)
- `licenses.theme_id` — now **nullable** (allows license creation before theme seeding)

## Query Modules

| File | Functions |
|------|-----------|
| `queries/staff-roles.ts` | getStaffRoles, getAllStaffMembers, grantStaffRole, revokeStaffRole, hasStaffRole |
| `queries/activity.ts` | logActivity, getActivityLog, getRecentActivations |
| `queries/licenses.ts` | getUserLicenses, getAllLicenses, createLicense, getLicenseByPurchaseCode |

## Traps & Gotchas

- **"Empty results but no error"** — `.maybeSingle()` returns `null` on 0 rows. `.single()` throws on 0 rows. Most getBySlug use `.maybeSingle()`, getById use `.single()`.
- **JSON columns parse as `any` at runtime** — TypeScript types are assertions, not runtime validation. If Supabase data doesn't match the expected shape, you get silent corruption.
- **`formDataToThemeInsert` uses `emptyToNull` helper** — trims whitespace and converts empty strings to undefined.
- **Block `hooks` and `metadata` fields are jsonb** — stored as raw JSON objects. No Zod validation on read from DB, only on write via validators package.
- **staff_roles RLS uses `get_user_role()` SECURITY DEFINER** — avoids infinite recursion (staff_roles checking staff_roles).

## Blast Radius

- **Changing types.ts** — affects EVERY consumer of @cmsmasters/db (studio, portal, api, dashboard, admin, validators)
- **Changing mappers.ts** — affects theme editor save/load in Studio
- **Changing queries/blocks.ts** — affects Studio block CRUD + Portal block fetching
- **Changing queries/staff-roles.ts** — affects Admin staff management + API admin endpoints
- **Changing queries/activity.ts** — affects Admin activity feed + API admin endpoints
- **Changing index.ts exports** — may break any importing app/package

## Recipes

```typescript
// Query blocks with the anon client (browser, RLS applies):
import { createClient, getBlocks } from '@cmsmasters/db'
const supabase = createClient()
const blocks = await getBlocks(supabase)

// Staff role operations (service_role, API only):
import { grantStaffRole, revokeStaffRole, getAllStaffMembers } from '@cmsmasters/db'
await grantStaffRole(supabase, userId, 'content_manager', adminId)
const staff = await getAllStaffMembers(supabase)
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** types.ts is generated from Supabase — manual edits will be overwritten
- **important:** mappers.ts handles snake_case→camelCase but has no runtime validation
