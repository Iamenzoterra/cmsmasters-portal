---
domain: app-admin
description: "Admin-only Vite SPA: Overview, Staff & Roles, User Inspector, Audit Log, System Health. Requires admin staff_role."
source_of_truth: src/__arch__/domain-manifest.ts
status: skeleton
---

# Domain: app-admin

> Admin-only Vite SPA for managing users, staff roles, and system health.

## Start Here
1. `apps/admin/src/app.tsx` — routes + admin-only RequireAuth
2. `apps/admin/src/components/sidebar.tsx` — 5 nav items
3. `apps/admin/src/layouts/app-layout.tsx` — layout shell

## Invariants
- **Admin role required**: `allowedRoles: ['admin']` — non-admin users silently redirected to /login
- **Port 5175**: already in API CORS config
- **Design tokens only**: uses `packages/ui/src/theme/tokens.css`, no hardcoded styles

## Traps & Gotchas
- `onForbidden` redirects to `/login`, not a 403 page — admin existence is hidden from non-admins
- User Inspector has TWO routes: `/users` (list) and `/users/:id` (detail) — both in sidebar as one item
- All pages lazy-loaded — use `export default` for lazy() compatibility

## Blast Radius
- `apps/admin/src/app.tsx` — changing routes affects sidebar nav highlighting
- `packages/auth/src/guards.tsx` — RequireAuth is shared with Dashboard; changes affect both apps
