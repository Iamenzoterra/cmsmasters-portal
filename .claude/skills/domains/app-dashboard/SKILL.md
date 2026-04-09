---
domain: app-dashboard
description: "Customer-facing Vite SPA: My Themes (license cards), My Account (profile + entitlements), Support (mock), Downloads (mock). Any authenticated user."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/dashboard/src/app.tsx` — routing, RequireAuth (no role restriction), 4 lazy page routes
2. `apps/dashboard/src/layouts/app-layout.tsx` — shell: topbar + sidebar + Suspense + Outlet
3. `apps/dashboard/src/pages/my-themes.tsx` — data-driven page with license cards

## Public API

(none — app-dashboard is a leaf consumer, no other domains import from it)

## Pages

| Route | Page | Data source |
|-------|------|-------------|
| `/` | My Themes | `getUserLicenses(supabase, userId)` — ThemeCard components with thumbnails, badges, support status, bundled plugins |
| `/account` | My Account | `Promise.all([getProfile, getUserLicenses, getStaffRoles])` — 4 stat cards + capabilities table + access details |
| `/support` | Support (mock) | Static — mailto link to support@cmsmasters.net |
| `/downloads` | Downloads (mock) | Static — ThemeForest link |

## Components

| Component | Purpose |
|-----------|---------|
| `theme-card.tsx` | License card with badge (Regular/Elements), support status, action links |
| `stat-card.tsx` | Reusable stat display (icon + label + value) |
| `capabilities-table.tsx` | 6-row "What's included" entitlements table |
| `sidebar.tsx` | 4 nav items (My Themes, My Account, Support, Downloads) + sign out |
| `topbar.tsx` | Brand badge + user info |

## Invariants

- **Any authenticated user can access.** No `allowedRoles` on RequireAuth — registered users see empty dashboard + CTA.
- **Vite SPA on port 5174.** Same stack as Studio: Vite + React Router v7 + Tailwind v4.
- **Auth flow identical to Studio.** Magic link + Google OAuth via `@cmsmasters/auth`.
- **Lazy routes from day 1.** All page routes use `lazy()` — 477KB main + 4 lazy chunks.
- **Design tokens from Portal DS.** Uses `packages/ui/src/theme/tokens.css` — no hardcoded colors/fonts.
- **Direct Supabase queries.** Dashboard fetches data directly from Supabase (anon key + RLS), NOT through Hono API.

## Traps & Gotchas

- **"use client" is NOT needed** — this is a Vite SPA, not Next.js. All components are client-side by default.
- **Named exports required** — lazy imports use `.then(m => ({ default: m.X }))` pattern, matching Studio convention.
- **Port 5174 is pre-registered** in API CORS (`apps/api/src/index.ts`).
- **Support and Downloads are mock stubs** — real implementation deferred to separate sprints.
- **Deactivate link, How to install links not functional** — placeholder UI only.
- **Bundled plugins derived from `theme.meta.compatible_plugins`** — not a separate DB join.

## Blast Radius

- **Changing app.tsx** — affects all routing and auth guard
- **Changing layouts/app-layout.tsx** — affects shell for all protected pages
- **Changing lib/supabase.ts** — affects all auth and data fetching
- **Changing `@cmsmasters/auth` hooks** — affects auth state display + RequireAuth

## Recipes

```typescript
// Dashboard page data fetching pattern:
import { supabase } from '../lib/supabase'
import { getUserLicenses } from '@cmsmasters/db'

const { data: licenses } = await getUserLicenses(supabase, userId)

// Auth check (no role restriction):
<RequireAuth client={supabase} onUnauthorized={() => navigate('/login')}>
  <AppLayout />
</RequireAuth>
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** Support and Downloads are mock stubs — real implementation in future sprints
- **note:** Deactivate link, How to install links not functional (placeholder UI)
- **note:** Bundled plugins derived from theme meta.compatible_plugins, not separate DB table
