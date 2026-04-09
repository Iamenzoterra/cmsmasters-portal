# WP-017 Phase 6 Result: Admin Scaffold

**Date:** 2026-04-09
**Status:** COMPLETE
**Duration:** ~15 min

## What was built

`apps/admin/` — Vite SPA on port 5175 with admin-only auth (`allowedRoles: ['admin']`).

### Files created (20 files)

**Config (8):** package.json, project.json, vite.config.ts, tailwind.config.ts, tsconfig.json, postcss.config.cjs, index.html, vite-env.d.ts

**Source (12):**
- `src/main.tsx` — React entry
- `src/app.tsx` — routes + admin RequireAuth
- `src/globals.css` — tokens + TW4
- `src/lib/supabase.ts` — browser client
- `src/layouts/app-layout.tsx` — topbar + sidebar + outlet
- `src/layouts/auth-layout.tsx` — centered auth
- `src/components/sidebar.tsx` — 5 nav items (correction applied)
- `src/components/topbar.tsx` — "Admin" branding
- `src/pages/login.tsx` — magic link + Google OAuth
- `src/pages/auth-callback.tsx` — OAuth callback
- `src/pages/not-found.tsx` — 404
- `src/pages/overview.tsx` — stub
- `src/pages/staff.tsx` — stub
- `src/pages/user-list.tsx` — stub (/users)
- `src/pages/user-inspector.tsx` — stub (/users/:id)
- `src/pages/audit-log.tsx` — stub
- `src/pages/system-health.tsx` — stub

### Files modified

- `src/__arch__/domain-manifest.ts` — added `app-admin` domain (17 owned files)
- `.claude/skills/domains/app-admin/SKILL.md` — skeleton domain skill

## Correction applied

Figma node 3134:33 shows 5 sidebar nav items, not 4. User Inspector added to sidebar with `/users` (list) route. `/users/:id` also exists for detail view.

## Verification

| Check | Result |
|-------|--------|
| `npm run arch-test` | 363 passed |
| `tsc --noEmit` | 0 errors |
| `vite build` (admin) | 477KB main + 6 lazy chunks |
| `vite build` (dashboard) | Still passes |
| `vite build` (studio) | Still passes |

## Key decisions

- **onForbidden → /login**: Non-admin users silently redirected. Admin existence hidden.
- **Lazy routes from day 1**: All 6 page routes code-split (learned from Studio's 841KB monolith).
- **User Inspector dual routes**: `/users` = list/search (sidebar), `/users/:id` = detail (deep-link).
