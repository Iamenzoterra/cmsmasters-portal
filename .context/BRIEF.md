# CMSMasters Portal — Project Brief

> Read this file FIRST. It gives you the full picture in 5 minutes.
> Then read the specific layer spec for your current task.
> Last updated: 30 March 2026

---

## What is this project

CMSMasters is a Ukrainian WordPress theme company — Power Elite Author on ThemeForest, 95K+ customers, 65+ Elementor themes, 16 years in business. Founder: Dmitry Smielov.

The company operates 4 fragmented domains with no shared navigation, broken post-purchase paths, and zero customer email collection.

**CMSMasters Portal** is a unified customer platform replacing this fragmented ecosystem. One domain. One brand. One pipeline from discovery → purchase (ThemeForest) → activation → resources → support.

---

## Architecture (ADR-007 V2, ADR-011 V3, ADR-022)

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (browser)                      │
├──────────┬───────────┬───────────┬──────────┬────────────┤
│ Portal   │ Dashboard │ Support   │ Studio   │ Admin      │
│ Next.js  │ Vite SPA  │ Vite SPA  │ Vite SPA │ Vite SPA   │
│ SSG      │           │           │          │            │
│ (public) │ (auth)    │ (auth)    │ (auth)   │ (auth)     │
├──────────┴───────────┴───────────┴──────────┴────────────┤
│  /packages/ui   /packages/auth   /packages/api-client     │
│  /packages/db   /packages/validators                      │
├──────────────────────────┬───────────────────────────────┤
│  Supabase (direct, 90%)  │  Hono API (Workers, 10%)      │
│  anon key + RLS          │  service_role + secrets        │
│  CRUD, reads, realtime   │  Envato, email, AI, signed    │
│                          │  URLs, revalidation, exports  │
└──────────────────────────┴───────────────────────────────┘
```

**Key rules:**
- Portal = Next.js 15 SSG, public, no auth, SEO-first
- Dashboard, Support, Studio, Admin = Vite + React Router SPAs
- Hono API on Cloudflare Workers = the ONLY place secrets live
- **Secrets boundary**: Envato key, Resend key, Claude API key, R2 creds, Supabase service_role — ONLY in Hono API. NEVER in SPA bundles.
- Monorepo managed by **Nx** (not Turborepo)
- Command Center is an internal tool (localhost:4000) with its own design — NOT affected by Portal DS

---

## What's built (verified 29 March 2026)

### Infrastructure ✅
| Component | Status | Details |
|-----------|--------|---------|
| Nx monorepo | ✅ | nx.json, workspaces, eslint, knip |
| Supabase DB | ✅ | **4 tables** (profiles, themes, licenses, audit_log), **themes: 9 columns** (id, slug, status, meta jsonb, sections jsonb, seo jsonb, created_by, timestamps), **15 RLS policies**, 3 functions, 3 triggers |
| Supabase Auth | ✅ | PKCE configured, magic link, on_auth_user_created trigger |
| Hono API | ✅ | `apps/api/` — auth middleware, role middleware, health/revalidate/upload routes |
| Design tokens | ✅ | `packages/ui/src/theme/tokens.css` (222 lines, Figma MCP sync) |
| Design system | ✅ | Flexible, updates through tokens + classes. Three-Layer structure ready |

### Shared packages ✅
| Package | Status | Contents |
|---------|--------|----------|
| `@cmsmasters/db` | ✅ | client.ts, types.ts (ThemeMeta, ThemeSection, ThemeSEO, SectionType), mappers.ts (themeRowToFormData/formDataToThemeInsert), queries for themes/profiles/audit |
| `@cmsmasters/auth` | ✅ | client.ts, hooks.ts (useSession/useUser/useRole), guards.tsx (RequireAuth), actions.ts (magic link + signout) |
| `@cmsmasters/api-client` | ✅ | Hono RPC typed client |
| `@cmsmasters/validators` | ✅ | Nested themeSchema ({ slug, meta, sections[], seo, status }), section registry (12 types: 5 core + 7 stubs), per-type Zod schemas, validateSectionData(), getDefaultSections() |
| `@cmsmasters/ui` | 🟡 | tokens.css + button primitive + Three-Layer dirs (primitives/domain/layouts) |

### Apps
| App | Status | Details |
|-----|--------|---------|
| Command Center | ✅ DONE | 6 pages, localhost:4000, own dark theme |
| Studio | 🟡 IN PROGRESS | Login, themes list (table+toolbar+cards), sidebar, section-based page builder (5 core editors + stub), save/publish with toast + audit, media (stub) |
| Portal | ⬜ | Not created yet |
| Dashboard | ⬜ | Not created yet |
| Admin | ⬜ | Not created yet |

### Also done
- 22 ADR files V2/V3 aligned in workplan/adr/
- Homepage wireframe (10 sections)
- .context/ folder with agent context
- CLAUDE.md agent instructions

---

## Current sprint: MVP Slice

**Goal:** End-to-end pipeline: create theme in Studio → see it on Portal page → user sees it in Dashboard → admin manages in Admin.

**Support + AI deferred.**

```
Layer 0: Infrastructure           ✅ DONE (DB, Auth, Hono, packages)
Layer 1: Studio                   🟡 IN PROGRESS (section page builder done, polish + integration verify remaining)
Layer 2: Portal theme page        ⬜ /themes/[slug] SSG from Supabase
Layer 3: Dashboard + Admin        ⬜ parallel after Studio can create themes
```

### What's left for Layer 1 (Studio)
- ~~Theme editor~~ Section page builder: meta sidebar + 5 core section editors + stub editor
- ~~Publish flow~~ Save/publish with toast + audit + revalidation call
- Error boundaries, 404 page
- Media upload wired to Hono API → R2
- Integration verify: end-to-end CRUD with section model
- At least 1 test theme created end-to-end

### What's left for Layer 2 (Portal theme page)
- `apps/portal/` Next.js app created
- `/themes/[slug]/page.tsx` SSG page with full ThemePage template (ADR-009):
  - Hero (carousel + name + tagline + CTAs + trust badges)
  - Feature Grid
  - Plugin Comparison (included plugins with value calculator)
  - Resource Sidebar (3 tiers: public/licensed/premium with lock icons)
  - Custom Sections renderer
  - Trust Strip + Cross-sell
  - Full SEO (JSON-LD, OG, metadata)

### What's left for Layer 3
- `apps/dashboard/` — profile, my themes, license list
- `apps/admin/` — users table, role management, themes overview, audit log

---

## Theme page architecture (ADR-009 — critical reference)

Each theme = one DB row. Portal renders ordered `sections[]` array. Section type determines component. No hardcoded template.

**Resource Sidebar access tiers (ADR-005 V2):**
- 🔓 Public: Live Demo, Documentation, Changelog, FAQ
- 🔒 Licensed: Theme Download, Child Theme, PSD Files, Support Ticket
- ⭐ Premium: Priority Support, Megakit Access (Epic 2 prep)

**Theme data shape (section-driven, WP-004):**

DB columns: id, slug, status, meta (jsonb), sections (jsonb), seo (jsonb), created_by, created_at, updated_at

meta: { name, tagline, description, category, price, demo_url, themeforest_url, themeforest_id, thumbnail_url, preview_images, rating, sales, compatible_plugins, trust_badges, resources: { public, licensed, premium } }

sections: [{ type: SectionType, data: {...} }, ...] — ordered array, section type determines rendering
  Core 5: theme-hero, feature-grid, plugin-comparison, trust-strip, related-themes
  Stubs (7): before-after, video-demo, testimonials, faq, cta-banner, stats-counter, resource-sidebar

seo: { title, description }

---

## Context folder contents

| File | What it is | When to read |
|------|-----------|--------------|
| **BRIEF.md** | This file. Full project overview | Always first |
| **ADR_DIGEST.md** | Key architecture decisions condensed | When making arch choices |
| **LAYER_0_SPEC.md** | Infra spec (✅ DONE — reference only) | For understanding what was built |
| **CONVENTIONS.md** | Code style, naming, file structure, token usage | When writing code |
| **ROADMAP.md** | Layers 1–3 specs with full ADR-009 theme page details | Current + future work |

---

## People

- **Dmitry Smielov** — Founder, 20+ years design experience, makes seed design decisions
- **Eugene** — CTO/partner, architectural review
- **Claude Code** — Tactical agent for file-level tasks
- **Orchestrator** — System-level agent for multi-file app builds

Dmitry communicates concisely in Ukrainian. Corrections are brief — reorient immediately.

---

## Source Logs
- WP-004 Phase 0: `logs/wp-004/phase-0-result.md` — flat-field inventory
- WP-004 Phase 1: `logs/wp-004/phase-1-result.md` — DB migration + types + validators + mappers
- WP-004 Phase 2: `logs/wp-004/phase-2-result.md` — section registry
- WP-004 Phase 3: `logs/wp-004/phase-3-result.md` — query recovery + path migration
- WP-004 Phase 4: `logs/wp-004/phase-4-result.md` — section page builder
