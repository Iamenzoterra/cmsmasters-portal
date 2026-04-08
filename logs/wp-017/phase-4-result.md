# WP-017 Phase 4 Result: Dashboard Scaffold

**Status:** COMPLETE
**Date:** 2026-04-08
**Duration:** ~30 min
**Commit:** `81b33a71`

---

## What was done

Scaffolded `apps/dashboard/` — a Vite + React Router v7 + Tailwind v4 SPA for the customer-facing dashboard.

### Files created (23)

**Config (8):**
- `apps/dashboard/package.json` — @cmsmasters/dashboard, port 5174
- `apps/dashboard/project.json` — Nx targets (dev, build, lint)
- `apps/dashboard/vite.config.ts` — React plugin, envDir ../../
- `apps/dashboard/tailwind.config.ts` — TW v4 with UI package content
- `apps/dashboard/tsconfig.json` — strict, bundler resolution, package paths
- `apps/dashboard/postcss.config.cjs` — @tailwindcss/postcss + autoprefixer
- `apps/dashboard/vite-env.d.ts` — Vite client types
- `apps/dashboard/index.html` — "Dashboard — CMSMasters"

**Source (15):**
- `src/main.tsx` — StrictMode + BrowserRouter entry
- `src/app.tsx` — Routes with RequireAuth (no allowedRoles), 4 lazy page routes
- `src/globals.css` — tokens.css import, TW v4, Manrope font
- `src/lib/supabase.ts` — createBrowserClient()
- `src/layouts/app-layout.tsx` — Topbar + Sidebar + Suspense + Outlet
- `src/layouts/auth-layout.tsx` — centered auth container
- `src/pages/login.tsx` — magic link + Google OAuth (copied from Studio, rebranded)
- `src/pages/auth-callback.tsx` — PKCE callback handler
- `src/pages/not-found.tsx` — 404 with "Back to Dashboard" button
- `src/pages/my-themes.tsx` — stub placeholder
- `src/pages/theme-detail.tsx` — stub with :slug param
- `src/pages/licenses.tsx` — stub placeholder
- `src/pages/settings.tsx` — stub placeholder
- `src/components/sidebar.tsx` — 3 nav items + sign out
- `src/components/topbar.tsx` — brand badge + user initials/name

### Files modified (1)

- `src/__arch__/domain-manifest.ts` — added `app-dashboard` domain (15 owned files)

### Files added (1)

- `.claude/skills/domains/app-dashboard/SKILL.md` — domain skill (status: skeleton)

---

## Workplan corrections applied

The workplan had several outdated assumptions. Key corrections:

| Issue | Workplan | Actual |
|-------|----------|--------|
| Router package | `react-router` | `react-router-dom` ^7 |
| Tailwind | ^3.4.0 | ^4 with @tailwindcss/postcss |
| Internal deps | `workspace:*` | `"*"` |
| PostCSS plugin | `tailwindcss` | `@tailwindcss/postcss` |
| Export style | `export default` | Named exports + `.then()` lazy |
| globals.css | @tailwind directives | `@import 'tailwindcss'; @config` (TW v4) |
| Google OAuth | Not mentioned | Included (matches Studio) |

---

## Verification

| Check | Result |
|-------|--------|
| `npm run arch-test` | 335 passed |
| `tsc --noEmit` (dashboard) | 0 errors |
| `vite build` (dashboard) | success, 477KB main + 4 lazy chunks |
| `vite build` (studio) | success, no regression |
| Port 5174 in API CORS | pre-existing |
| Workspace auto-detection | confirmed (apps/* glob) |

---

## Build output

```
dist/index.html                        0.41 kB
dist/assets/index-By7oSkXt.css        22.52 kB
dist/assets/my-themes-B1TGAiTD.js      0.47 kB
dist/assets/settings-dAu9ANTZ.js       0.49 kB
dist/assets/licenses-CeYFH0tU.js       0.50 kB
dist/assets/theme-detail-Dhkg0drX.js    0.51 kB
dist/assets/index-dMEq9u2y.js        477.36 kB
```

Lazy splitting works — each page route is its own chunk.

---

## Next: Phase 5

Dashboard pages with data fetching: My Themes (license list), Theme Detail (resources sidebar), Licenses (activation keys), Settings (profile).
