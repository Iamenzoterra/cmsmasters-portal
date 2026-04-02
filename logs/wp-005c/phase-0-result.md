# Execution Log: WP-005C Phase 0 — RECON: Current Studio State
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: 2026-03-31T15:10:00+02:00
> Duration: ~15 min
> Status: ✅ COMPLETE

## What Was Found

### Studio Routes

**File:** `apps/studio/src/app.tsx`

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `LoginPage` | AuthLayout (no auth) |
| `/auth/callback` | `AuthCallback` | AuthLayout (no auth) |
| `/` (index) | `ThemesList` | ProtectedRoute (content_manager, admin) |
| `/themes/new` | `ThemeEditor` | ProtectedRoute |
| `/themes/:slug` | `ThemeEditor` | ProtectedRoute |
| `/media` | `MediaPage` | ProtectedRoute |
| `*` | `NotFound` | None |

**Layout structure:** `AuthLayout` wraps login/callback. `ProtectedRoute > ErrorBoundary > AppLayout` wraps all authenticated pages.

No `/blocks` or `/templates` routes exist yet — **clear to add**.

### Sidebar Navigation

**File:** `apps/studio/src/components/sidebar.tsx`

| Label | Icon | Path |
|-------|------|------|
| Themes | `LayoutGrid` | `/` |
| Media | `Image` | `/media` |

Bottom section: Help link (external) + Logout button.

Nav uses `NavLink` with `end` prop for exact match. Active state: `bg-surface-alt` background + `text-primary` color + weight 500. Inactive: transparent + `text-secondary` + weight 400.

`navItems` is a plain array — easy to extend with Blocks + Templates entries.

### Theme Editor State

**File:** `apps/studio/src/pages/theme-editor.tsx` (462 lines)

**Placeholder confirmed** at lines 393-398:
```tsx
<FormSection title="Content Blocks">
  <p>Template and block management coming in next update...</p>
</FormSection>
```

This `FormSection` sits between Links and SEO sections. Phase 3 will replace this with the template picker + position grid.

**Data flow:**
- Fetch: `fetchThemeBySlug(slug)` → direct Supabase client query (from `lib/queries.ts`)
- Save: `upsertTheme(supabase, payload)` → shared `@cmsmasters/db` function
- Form: `react-hook-form` + `zodResolver(themeSchema)` from `@cmsmasters/validators`
- Mapper: `themeRowToFormData()` / `formDataToThemeInsert()` from `@cmsmasters/db`
- Toast: custom `useToast()` hook from `components/toast.tsx`

**No React Query / SWR** — plain `useEffect` + `useState` for data fetching.

### form-defaults.ts

**File:** `apps/studio/src/lib/form-defaults.ts`

Already has `template_id: ''` and `block_fills: []` — set up by WP-005B Phase 1. **No changes needed.**

### API Fetch Patterns

Studio uses **two patterns**:

1. **Direct Supabase client** (`lib/supabase.ts` → `lib/queries.ts`):
   - `fetchAllThemes()`, `fetchThemeBySlug()`, `deleteTheme()` — all use `supabase.from('themes')` directly
   - Used for theme CRUD in the current codebase

2. **Hono API client** (`lib/api.ts` → `@cmsmasters/api-client`):
   - `getApiClient(token)` wraps `createApiClient(apiUrl, token)` from `@cmsmasters/api-client`
   - `@cmsmasters/api-client` uses `hono/client` `hc<AppType>()` — **type-safe RPC client**
   - Base URL: `VITE_API_URL` env var, default `http://localhost:8787`
   - Auth: Bearer token passed in headers
   - **Currently unused for themes** — only publish revalidation calls the API directly via `fetch()`

**Decision for Phase 1:** Use `@cmsmasters/api-client` (`hc<AppType>`) for blocks/templates. It gives type-safe calls matching the Hono routes. The `lib/api.ts` wrapper already exists — just need to get the JWT token from Supabase session and call `getApiClient(token).api.blocks.$get()` etc.

### @cmsmasters/api-client

**Exists.** Files:
- `packages/api-client/src/client.ts` — `createApiClient(baseUrl, token)` using `hc<AppType>()`
- `packages/api-client/src/index.ts` — barrel re-export

Uses **type-only import** of `AppType` from `apps/api/src/index` — no runtime code leaks into the client bundle. This means the client automatically gets type-safe methods for `/api/blocks` and `/api/templates` routes added in WP-005B.

### Available UI Components

**`@cmsmasters/ui` exports** (from `packages/ui/index.ts`):
- `cn` — clsx + tailwind-merge utility
- `Button` / `buttonVariants` / `ButtonProps` — cva-based button with variants

That's it. Only `Button` is a real component. `primitives/` has only button. `domain/` and `layouts/` are empty (`.gitkeep`).

**Studio-local components** (`apps/studio/src/components/`):
| Component | Purpose |
|-----------|---------|
| `sidebar.tsx` | Nav sidebar |
| `topbar.tsx` | Top bar |
| `form-section.tsx` | Collapsible form section wrapper |
| `char-counter.tsx` | Character count display |
| `chip-select.tsx` | Multi-select chip input |
| `star-rating.tsx` | Star rating display |
| `toast.tsx` | Toast notification system |
| `editor-footer.tsx` | Save/Publish/Delete/Discard footer bar |
| `editor-sidebar.tsx` | Right sidebar (status, thumbnail, etc.) |
| `error-boundary.tsx` | Error boundary wrapper |
| `status-badge.tsx` | Draft/Published/Archived badge |
| `theme-card.tsx` | Theme grid card |
| `themes-table.tsx` | Theme list table view |
| `themes-toolbar.tsx` | Search/filter/view toggle toolbar |
| `pagination.tsx` | Pagination controls |

**Reusable for blocks/templates:** `FormSection`, `toast`, `editor-footer`, `Button`, `pagination`, `status-badge`. Will need new: `block-preview`, `block-picker-modal`, `position-grid`.

### CORS / Connectivity

**File:** `apps/api/src/index.ts` (lines 12-28)

CORS is configured globally on `*` routes:
- `http://localhost:5173` — Studio ✅
- `http://localhost:5174` — Dashboard
- `http://localhost:5175` — Admin
- `http://localhost:5176` — Support
- `http://localhost:4000` — Command Center
- `http://localhost:3000` — Portal

Allowed headers: `Content-Type`, `Authorization`
Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
Credentials: `true`

**No blockers.** Studio on port 5173 is allowed. JWT via Authorization header is allowed.

API runs on port `8787` (Hono default, matches `VITE_API_URL` fallback in `lib/api.ts`).

Block and template routes are already mounted:
```typescript
app.route('/api', blocks)
app.route('/api', templates)
```

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| API fetch approach | Use `@cmsmasters/api-client` (hc) via `lib/api.ts` | Type-safe, already wired, auto-picks up block/template routes |
| Theme queries migration | Keep direct Supabase for themes (existing), use api-client for new entities | Avoids unnecessary refactor of working theme code |
| New components location | `apps/studio/src/components/` | Consistent with existing pattern — all Studio components are local |
| Form library | `react-hook-form` + `zodResolver` | Already used in theme editor — same pattern for block/template editors |

## Issues & Workarounds

None. Clean state.

## Open Questions

1. **Token retrieval for api-client:** Need to get JWT from `supabase.auth.getSession()` to pass to `getApiClient(token)`. Themes bypass this by using Supabase client directly (RLS handles auth). Blocks/templates go through Hono API which needs explicit JWT. Phase 1 will add a helper like `getAuthToken()`.

## Blockers for Phase 1

None. All prerequisites are met:
- API routes exist and are CORS-ready
- `@cmsmasters/api-client` is wired with type-safe Hono client
- UI foundation (Button, FormSection, toast) is available
- Route registration pattern is clear
- Sidebar extension is straightforward
