---
domain: app-admin
description: "Admin-only Vite SPA: Overview (5 KPIs), Staff & Roles, User Inspector, Audit Log, System Health. Requires admin staff_role."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

# Domain: app-admin

> Admin-only Vite SPA for managing users, staff roles, and system health.

## Start Here
1. `apps/admin/src/app.tsx` — routes + admin-only RequireAuth
2. `apps/admin/src/lib/api.ts` — fetchAdmin, fetchAdminWithCount, mutateAdmin (all API communication)
3. `apps/admin/src/components/sidebar.tsx` — 5 nav items

## Public API

(none — app-admin is a leaf consumer, no other domains import from it)

## Pages

| Route | Page | API endpoint |
|-------|------|-------------|
| `/` | Overview | GET /api/admin/stats + GET /api/admin/activity |
| `/staff` | Staff & Roles | GET /api/admin/staff + POST/DELETE /api/admin/users/:id/staff-role |
| `/users` | User List | GET /api/admin/users?search=&page= |
| `/users/:id` | User Inspector | GET /api/admin/users/:id |
| `/audit` | Audit Log | GET /api/admin/audit?action=&page= |
| `/health` | System Health | GET /api/admin/health |

## Shared Components (7)

| Component | Purpose |
|-----------|---------|
| `lib/api.ts` | API client with JWT Bearer auth — fetchAdmin, fetchAdminWithCount, mutateAdmin + all response types |
| `page-header.tsx` | Title + subtitle + right slot |
| `avatar-initials.tsx` | Deterministic color circle from string hash |
| `status-badge.tsx` | Pill with variant colors + role/action helpers |
| `stat-card.tsx` | KPI card (icon + label + value) |
| `date-range-toggle.tsx` | 3-button pill group (Today/7d/30d) |
| `activation-event.tsx` | Feed row with avatar + info + badge + profile link |

## Invariants

- **Admin role required**: `allowedRoles: ['admin']` — non-admin users silently redirected to /login
- **Port 5175**: already in API CORS config
- **Design tokens only**: uses `packages/ui/src/theme/tokens.css`, no hardcoded styles
- **All data via Hono API**: Admin uses `fetchAdmin()` with JWT Bearer token, NOT direct Supabase queries. This ensures service_role operations (cross-user reads, staff management) go through the API secrets boundary.
- **Lazy routes**: 478KB main + 6 lazy chunks

## Traps & Gotchas

- `onForbidden` redirects to `/login`, not a 403 page — admin existence is hidden from non-admins
- User Inspector has TWO routes: `/users` (list) and `/users/:id` (detail) — both in sidebar as one item
- All pages lazy-loaded — use `export default` for lazy() compatibility
- DateRangeToggle on Overview is **visual only** — stats API doesn't filter by date range yet
- Staff grant form uses email-to-userId resolution — requires the user to already have a profile
- Self-demotion is blocked server-side (API returns 400), not client-side

## Blast Radius

- `apps/admin/src/app.tsx` — changing routes affects sidebar nav highlighting
- `apps/admin/src/lib/api.ts` — all pages depend on this for API communication
- `packages/auth/src/guards.tsx` — RequireAuth is shared with Dashboard; changes affect both apps
- `apps/api/src/routes/admin.ts` — all Admin pages consume these endpoints

## Recipes

```typescript
// Admin API fetch pattern (all pages use this):
import { fetchAdmin, mutateAdmin } from '../lib/api'

// GET with pagination:
const { data, count } = await fetchAdminWithCount('/admin/users?page=1&search=test')

// POST mutation:
await mutateAdmin(`/admin/users/${userId}/staff-role`, {
  method: 'POST',
  body: JSON.stringify({ role: 'content_manager' })
})

// Admin-only auth:
<RequireAuth client={supabase} allowedRoles={['admin']} onForbidden={() => navigate('/login')}>
  <AppLayout />
</RequireAuth>
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** User Inspector has two routes: /users (list) and /users/:id (detail) — both appear as single sidebar item
- **note:** DateRangeToggle on Overview is visual only — stats API doesn't filter by date range yet
