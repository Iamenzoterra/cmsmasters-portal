# WP-017 Phase 5 Result: Dashboard Pages — My Themes + My Account + Stubs

> Phase: 5 of 8
> Status: COMPLETE
> Date: 2026-04-09

## What was done

Replaced 4 stub pages in the Dashboard Vite SPA with 2 real data-driven pages and 2 mock stubs, matching Figma designs (nodes `3151:33`, `3163:45`).

### Changes

| File | Action |
|------|--------|
| `apps/dashboard/src/app.tsx` | Routes updated: removed `/themes/:slug`, `/licenses`, `/settings`; added `/account`, `/support`, `/downloads` |
| `apps/dashboard/src/components/sidebar.tsx` | 4 nav items, 240px width, switched to `--sidebar-*` tokens |
| `apps/dashboard/src/pages/my-themes.tsx` | Rewritten: fetches licenses via `getUserLicenses`, renders ThemeCards, bundled plugins panel, support panel, empty state |
| `apps/dashboard/src/pages/my-account.tsx` | New: fetches profile + entitlements via `Promise.all`, renders avatar, 4 stat cards, capabilities table, access detail cards, quick links |
| `apps/dashboard/src/pages/support.tsx` | New: mock stub with `support@cmsmasters.net` mailto link |
| `apps/dashboard/src/pages/downloads.tsx` | New: mock stub with ThemeForest link |
| `apps/dashboard/src/components/theme-card.tsx` | New: license card with thumbnail placeholder, badge (Regular/Elements), support status (green/red/muted), action buttons |
| `apps/dashboard/src/components/stat-card.tsx` | New: reusable stat card (label, value, sub, muted variant) |
| `apps/dashboard/src/components/capabilities-table.tsx` | New: "What's included" table with 6 rows, status colors from entitlements |
| `apps/dashboard/src/pages/theme-detail.tsx` | Deleted |
| `apps/dashboard/src/pages/licenses.tsx` | Deleted |
| `apps/dashboard/src/pages/settings.tsx` | Deleted |
| `src/__arch__/domain-manifest.ts` | Updated owned_files and known_gaps for app-dashboard |

### Data flow

- **My Themes**: `useUser → authState.userId → getUserLicenses(supabase, userId) → ThemeCard[]`
- **My Account**: `useUser → Promise.all([getProfile, getUserLicenses, getStaffRoles]) → computeEntitlements → StatCard[] + CapabilitiesTable`

### Reused code

- `getUserLicenses` from `@cmsmasters/db` (licenses with joined themes)
- `getProfile`, `getStaffRoles` from `@cmsmasters/db`
- `computeEntitlements` from `@cmsmasters/auth`
- `useUser` hook from `@cmsmasters/auth`
- `Button`, `Badge` from `@cmsmasters/ui`

## Deferred / not implemented

- **"Deactivate" link**: omitted — no backend endpoint. Only "Docs" shown as secondary action.
- **"How to install" links**: render as `#` href — no docs system yet.
- **Bundled plugins data**: derived from `theme.meta.compatible_plugins[]` — may be empty if themes don't have this field populated.
- **Subscription stat card**: always shows "None" — Epic 2 deferred.
- **Theme thumbnails**: placeholder div with theme initial letter — real thumbnails will come from R2 when themes are seeded.
- **"Browse documentation" quick link**: `#` href — no external docs URL defined yet.

## Verification

| Check | Result |
|-------|--------|
| `npm run arch-test` | 340/340 pass |
| `tsc --noEmit` | 0 errors |
| `vite build` | Success (2.00s) |
| `npm run quality` (ESLint) | 0 errors in dashboard files |
| Old files deleted | theme-detail.tsx, licenses.tsx, settings.tsx confirmed gone |
| New files exist | my-account.tsx, support.tsx, downloads.tsx, theme-card.tsx, stat-card.tsx, capabilities-table.tsx confirmed |

## Build output

```
dist/index.html                      0.41 kB │ gzip:   0.28 kB
dist/assets/index-CwqJJIdi.css      22.58 kB │ gzip:   5.47 kB
dist/assets/support-DJ5yzfEx.js       1.10 kB │ gzip:   0.50 kB
dist/assets/downloads-HAbtUGW1.js     1.16 kB │ gzip:   0.53 kB
dist/assets/my-themes-Dbg_Tw-Z.js     7.92 kB │ gzip:   2.11 kB
dist/assets/my-account-cySa9BDI.js   10.65 kB │ gzip:   2.79 kB
dist/assets/index-DAJnn-XD.js       477.62 kB │ gzip: 140.11 kB
```

## Next

Phase 6: Admin scaffold
