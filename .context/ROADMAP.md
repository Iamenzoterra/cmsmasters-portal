# Roadmap — Layers 1–3 (after Layer 0)

> Layer 0 is DONE. This file describes what comes next.
> Each layer builds on the previous one.

---

## Layer 1: Studio — Complete Theme Editor (3–4 days) — SECTION BUILDER DONE

**App:** `apps/studio/` — Vite + React Router SPA (shell already exists)
**Auth:** content_manager or admin role
**Purpose:** Content Manager creates and edits themes via section-based page builder.

### What exists
- Login page, auth callback
- Themes list page (table + toolbar + cards + pagination + status badges)
- Sidebar, topbar
- Section-based page builder (WP-004): useFieldArray sections, 5 core editors, stub editor, add/remove/reorder
- Save/publish: meta + sections[] + seo persisted, revalidation triggered
- Section registry: 12 types in @cmsmasters/validators
- Media page (stub)

### What needs building

**Media upload flow:**
1. User drags image → component calls Hono API `POST /api/upload`
2. Hono returns R2 signed upload URL
3. Browser uploads directly to R2
4. URL saved in theme record

**Publish flow:**
1. Save → Supabase `upsert` themes table (direct, anon key)
2. Publish → set status='published' + `POST /api/content/revalidate` via @cmsmasters/api-client
3. Revalidation triggers Portal SSG rebuild of `/themes/[slug]`

### Acceptance criteria
- [x] Section page builder with 5 core editors + stub editor
- [x] Save/publish persists meta + sections[] + seo to Supabase
- [x] Section registry: 12 types, getDefaultSections(), validateSectionData()
- [ ] Error boundaries, 404 page
- [ ] Media upload works (image appears in R2, URL saved)
- [ ] At least 1 theme created end-to-end with section model
- [ ] Publish triggers revalidation endpoint

---

## Layer 2: Portal Theme Page (2–3 days, can overlap with Layer 3)

**App:** `apps/portal/` — Next.js 15 App Router, SSG
**Auth:** None (public)
**Purpose:** Public theme page — the main marketing asset. Each theme is a universe.

### Route
- `/themes/[slug]/page.tsx` — SSG theme page from Supabase

### ThemePage template (ADR-009)

Portal renders ordered `sections[]` array from DB. Section type determines component. No hardcoded template — section order = JSON order.

**Section 1: Hero**
- Screenshots carousel (from `hero.screenshots[]` or `preview_images[]`)
- Theme name + tagline
- Two big CTAs: **Buy** → themeforest_url, **Demo** → demo_url
- Trust badges row: renders from `trust_badges[]` (Power Elite, Elementor, GDPR, WPML, etc.)
- Rating stars (from `rating`) + sales count (from `sales`)

**Section 2: Feature Grid**
- Responsive 3×N grid of FeatureCard components
- Each: icon + title + description
- Rendered from `features[]` array

**Section 3: Plugin Comparison (conversion killer)**
- Grid of included plugins with icons and individual prices
- Calculator: "$148 total value vs $69 theme price — Save $79"
- Rendered from `included_plugins[]` with auto-calculated totals
- This is the highest-converting section — do not simplify

**Section 4: Resource Sidebar (sticky, right side)**
Three tiers with visual lock/unlock per entitlement (ADR-005 V2):

```
🔓 Public (open lock icon):
   Live Demo, Documentation, Changelog, FAQ

🔒 Licensed (closed lock + "Buy to unlock" CTA):
   Theme Download, Child Theme, PSD Files, Support Ticket

⭐ Premium (star + "Upgrade" CTA — Epic 2 prep):
   Priority Support, Megakit Access
```

Lock context is per-entitlement: "Придбайте тему щоб отримати доступ" or "Оновіть підписку для пріоритетної підтримки". Specific to what's locked, not generic.

Rendered from `resources` jsonb: `{public: [...], licensed: [...], premium: [...]}`.

**Section 5: Custom Sections (15% unique)**
Template reads `custom_sections[]` and renders matching component per `type`:
- `before-after` → image comparison slider
- `video-demo` → YouTube embed with poster
- `testimonial` → quote card with author + company
- `custom-cta` → styled call-to-action block
New types = new component file, zero template changes.

**Section 6: Trust Strip (bottom, full-width)**
- Power Elite badge, customer count (95K+), theme count (65+), years (16)

**Section 7: Cross-sell**
- "Similar themes" grid — 3–4 ThemeCard components from same `category`
- Query: Supabase `themes WHERE category = theme.category AND slug != theme.slug LIMIT 4`

### SEO (every page)
- `generateMetadata()` → title, description from `seo.title`, `seo.description`
- JSON-LD Product schema: `{name, price, rating, image, url, offers, aggregateRating}`
- Open Graph + Twitter cards (thumbnail, name, tagline)
- Canonical URL: `/themes/[slug]`

### Data fetching
- `generateStaticParams()` → Supabase query: all themes WHERE status='published'
- Page fetches full theme by slug at build time (meta + sections[] + seo jsonb)
- On-demand revalidation: Studio publish → Hono API → `revalidatePath('/themes/[slug]')` or `revalidateTag('themes')`
- ISR fallback: `revalidate: 3600` as safety net

### Theme JSON shape reference (section-driven, WP-004)
```json
{
  "slug": "growth-hive",
  "status": "published",
  "meta": {
    "name": "Growth Hive",
    "tagline": "Consulting & Digital Marketing Theme",
    "category": "business",
    "price": 69,
    "themeforest_url": "https://themeforest.net/item/...",
    "demo_url": "https://growth-hive.cmsmasters.studio",
    "thumbnail_url": "...",
    "preview_images": ["..."],
    "rating": 4.58,
    "sales": 2366,
    "compatible_plugins": ["elementor", "woocommerce", "wpml"],
    "trust_badges": ["power-elite", "elementor", "gdpr"],
    "resources": {
      "public": ["docs", "changelog", "faq", "demos"],
      "licensed": ["download", "child-theme", "psd", "support"],
      "premium": ["priority-support", "megakit-access"]
    }
  },
  "sections": [
    { "type": "theme-hero", "data": { "headline": "Build with Growth Hive", "screenshots": ["hero-1.webp"] } },
    { "type": "feature-grid", "data": { "features": [{ "icon": "palette", "title": "12 Demos", "description": "..." }] } },
    { "type": "plugin-comparison", "data": { "included_plugins": [{ "name": "ACF PRO", "slug": "acf-pro", "value": 59 }] } },
    { "type": "trust-strip", "data": {} },
    { "type": "related-themes", "data": { "limit": 4 } }
  ],
  "seo": {
    "title": "Growth Hive — Consulting WordPress Theme",
    "description": "..."
  }
}
```

### Domain components needed
- **ThemeHero** — carousel + name + tagline + CTAs + trust badges + rating
- **FeatureGrid** — responsive grid of FeatureCard
- **PluginComparison** — plugin grid + value calculator ("$148 vs $69")
- **ResourceSidebar** — 3-tier sticky sidebar with lock/unlock per entitlement
- **CustomSectionRenderer** — switch on type, renders matching component
- **TrustStrip** — Power Elite, 95K+, 65+, 16 years
- **CrossSell** — ThemeCard grid from same category
- **ThemeCard** — thumbnail + name + category + rating + price + Demo/Buy buttons

### Acceptance criteria
- [ ] `apps/portal/` Next.js app created and builds
- [ ] `/themes/[slug]` SSG renders full page from Supabase
- [ ] All 7 sections render correctly with real data
- [ ] Plugin Comparison shows correct value calculation
- [ ] Resource Sidebar shows 3 tiers with appropriate icons
- [ ] Custom sections render based on type
- [ ] SEO: JSON-LD, OG tags, metadata verified
- [ ] Lighthouse: Performance > 90
- [ ] Studio publish → page updates within seconds

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
- My Themes: ThemeCard grid for licensed themes (thumbnail, name, license type, support_until, link to Portal page)
- Profile: edit name
- Licenses: read-only list

### NOT in MVP
- Envato API verification, download signed URLs, purchase code input, activation flow, email notifications

---

## Layer 3B: Admin (2–3 days, parallel with 3A)

**App:** `apps/admin/` — Vite + React Router SPA
**Auth:** admin role only
**Purpose:** Admin manages users, themes, views audit log.

### Pages
- `/` — overview: 3 KPI cards (users, themes, recent actions) + activity feed
- `/users` — users table (search, filter by role, paginate)
- `/users/:id` — user detail + role change dropdown + licenses
- `/themes` — all themes table (draft + published, link to Studio)
- `/audit` — audit log table (actor, action, target, timestamp, filters)

### MVP scope
- KPI cards with real data from Supabase
- Users table with search + filter + drill-down
- Change user role → Supabase update + audit_log entry
- Themes table with status badges
- Audit log viewer with filters

---

## Timeline

```
Layer 0: ██████  DONE
Layer 1:       ████████  (3-4 days) ← CURRENT
Layer 2:              ██████  (2-3 days)
Layer 3:              ████████  (3-4 days, parallel)
                                ________
Remaining:                      ~8-11 days
```

---

## Deferred (explicit)

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
