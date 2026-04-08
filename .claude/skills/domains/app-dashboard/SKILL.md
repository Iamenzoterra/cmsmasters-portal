---
domain: app-dashboard
description: "Customer-facing Vite SPA: my themes, licenses, settings. Any authenticated user."
source_of_truth: src/__arch__/domain-manifest.ts
status: skeleton
---

## Start Here

1. `apps/dashboard/src/app.tsx` — routing, RequireAuth (no role restriction), lazy routes
2. `apps/dashboard/src/layouts/app-layout.tsx` — shell: topbar + sidebar + main
3. `apps/dashboard/src/pages/login.tsx` — magic link + Google OAuth login

## Public API

(none — app-dashboard is a leaf consumer, no other domains import from it)

## Invariants

- **Any authenticated user can access.** No `allowedRoles` on RequireAuth — registered users see empty dashboard + CTA.
- **Vite SPA on port 5174.** Same stack as Studio: Vite + React Router v7 + Tailwind v4.
- **Auth flow identical to Studio.** Magic link + Google OAuth via `@cmsmasters/auth`.
- **Lazy routes from day 1.** All page routes use `lazy()` to avoid bundle bloat.
- **Design tokens from Portal DS.** Uses `packages/ui/src/theme/tokens.css` — no hardcoded colors/fonts.

## Traps & Gotchas

- **"use client" is NOT needed** — this is a Vite SPA, not Next.js. All components are client-side by default.
- **Named exports required** — lazy imports use `.then(m => ({ default: m.X }))` pattern, matching Studio convention.
- **Port 5174 is pre-registered** in API CORS (`apps/api/src/index.ts` line 24).

## Blast Radius

- **Changing app.tsx** — affects all routing and auth guard
- **Changing layouts/app-layout.tsx** — affects shell for all protected pages
- **Changing lib/supabase.ts** — affects all auth and data fetching

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** scaffold only — stub pages, no data fetching yet (Phase 5)
