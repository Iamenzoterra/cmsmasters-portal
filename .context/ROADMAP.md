# Roadmap — Layers 1–3 (after Layer 0)

> What comes next. Read this to understand WHY Layer 0 is shaped the way it is.
> Each layer builds on the previous one.

---

## Layer 1: Studio (3–4 days after Layer 0)

**App:** `apps/studio/` — Vite + React Router SPA
**Auth:** content_manager or admin role
**Purpose:** Content Manager creates and edits themes in Supabase.

### Pages
- `/` — themes list (grid/table, status badges, search)
- `/themes/:slug` — theme editor form (react-hook-form + Zod)
- `/media` — R2 media browser (upload, copy URL)

### Theme Editor form fields
- Basic: name, slug (auto), tagline, description, category (select), price
- Media: thumbnail upload, preview images (sortable gallery)
- Links: demo_url, themeforest_url
- Features: repeater [{icon, title, description}]
- Plugins: repeater [{name, slug, value, icon_url}]
- Custom Sections: repeater [{type, data}]
- SEO: seo_title, seo_description
- Status: draft / published toggle

### Data flow
1. Form → local state
2. Save → Supabase `upsert` (direct, anon key + RLS)
3. Publish → Supabase update + `POST /api/content/revalidate` via Hono
4. Media → Hono API → R2 signed upload URL → upload → save URL

### Dependencies on Layer 0
- `@cmsmasters/db` for Supabase client and types
- `@cmsmasters/auth` for login + route guard
- `@cmsmasters/validators` for theme form Zod schema
- `@cmsmasters/api-client` for Hono revalidation call
- `@cmsmasters/ui` for form components (primitives)

---

## Layer 2: Portal Theme Page (2–3 days, can overlap with Layer 3)

**App:** `apps/portal/` — Next.js 15 App Router, SSG
**Auth:** None (public)
**Purpose:** One public theme page, SSG from Supabase.

### Route
- `/themes/[slug]/page.tsx` — SSG theme page

### What it renders
- Hero: thumbnail, name, tagline, rating, price, Demo + Buy CTAs
- Features grid (from theme.features jsonb)
- Included plugins (from theme.included_plugins jsonb)
- Custom sections renderer (from theme.custom_sections jsonb)
- SEO: JSON-LD Product schema, OG tags via generateMetadata()

### Data fetching
- `generateStaticParams()` → all published themes from Supabase
- Page fetches theme by slug at build time
- On-demand revalidation via Hono API endpoint

### Dependencies on Layer 0
- Supabase schema (themes table with published data)
- `@cmsmasters/db` for typed queries
- `@cmsmasters/ui` for UI components

### Dependencies on Layer 1
- At least 1 theme created in Studio to test rendering

---

## Layer 3A: Dashboard (2–3 days, parallel with 3B)

**App:** `apps/dashboard/` — Vite + React Router SPA
**Auth:** any authenticated user
**Purpose:** Customer sees profile and licensed themes.

### Pages
- `/` — My Themes grid (licenses joined with themes)
- `/settings` — profile edit (name, avatar)
- `/licenses` — license list (read-only for now)

### MVP scope
- Login (magic link)
- My Themes: cards for licensed themes
- Profile: edit name
- Licenses: read-only list

### NOT in MVP
- Envato API verification
- Download signed URLs
- Purchase code input
- Activation flow
- Email notifications

### Dependencies on Layer 0
- `@cmsmasters/auth` for login + route guard
- `@cmsmasters/db` for profile and license queries
- `@cmsmasters/ui` for components

---

## Layer 3B: Admin (2–3 days, parallel with 3A)

**App:** `apps/admin/` — Vite + React Router SPA
**Auth:** admin role only
**Purpose:** Admin manages users, themes, views audit log.

### Pages
- `/` — overview: 3 KPI cards + activity feed
- `/users` — users table (search, filter by role, paginate)
- `/users/:id` — user detail + role change + licenses
- `/themes` — all themes table (draft + published)
- `/audit` — audit log table with filters

### MVP scope
- KPI cards (user count, theme count, recent actions)
- Users table with search, filter, drill-down
- Change user role → Supabase update + audit_log entry
- Themes table with link to Studio
- Audit log viewer

### Dependencies on Layer 0
- `@cmsmasters/auth` for admin route guard
- `@cmsmasters/db` for all queries
- `@cmsmasters/ui` for table, cards, forms

---

## After MVP Slice (deferred)

| Feature | When |
|---------|------|
| Support App + AI chat | Separate sprint |
| Envato API verification | Dashboard V2 |
| Activation flow (WP → Portal) | Dashboard V2 |
| Download signed URLs | Dashboard V2 |
| Email notifications (Resend) | Dashboard V2 |
| Studio live preview (iframe) | Studio V2 |
| Markdown docs editor | Studio V2 |
| Blog system | Portal V2 |
| Homepage (10 sections) | Portal V2 |
| Theme catalog /themes with search | Portal V2 |
| Meilisearch integration | Portal V2 |

---

## Timeline

```
Layer 0: ██████  (2-3 days)     ✅ DONE (2026-03-29)
Layer 1:       ████████  (3-4 days)   ← CURRENT
Layer 2:              ██████  (2-3 days)
Layer 3:              ████████  (3-4 days, parallel)
                                ________
Total:                          ~10-14 days
```
