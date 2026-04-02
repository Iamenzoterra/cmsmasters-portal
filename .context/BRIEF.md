# CMSMasters Portal — Project Brief

> Read this file FIRST. It gives you the full picture in 5 minutes.
> Then read the specific layer spec for your current task.
> Last updated: 31 March 2026

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

## What's built (verified 31 March 2026)

### Infrastructure ✅
| Component | Status | Details |
|-----------|--------|---------|
| Nx monorepo | ✅ | nx.json, workspaces, eslint, knip |
| Supabase DB | ✅ | **6 tables** (profiles, themes, licenses, audit_log, **blocks**, **templates**). themes: template_id (FK→templates) + block_fills (jsonb). blocks: html+css assets with hooks/metadata. templates: ordered position grids. **23 RLS policies**, 3 functions, 5 triggers |
| Supabase Auth | ✅ | PKCE configured, magic link, on_auth_user_created trigger |
| Hono API | ✅ | `apps/api/` — 13 routes: health (public), revalidate + upload (staff), **5 blocks CRUD** + **5 templates CRUD** (auth + role + dep checks on delete) |
| Design tokens | ✅ | `packages/ui/src/theme/tokens.css` (222 lines, Figma MCP sync) |
| Design system | ✅ | Flexible, updates through tokens + classes. Three-Layer structure ready |

### Shared packages ✅
| Package | Status | Contents |
|---------|--------|----------|
| `@cmsmasters/db` | ✅ | client.ts, types.ts (Block, Template, Theme with template_id+block_fills, BlockHooks, BlockMetadata, TemplatePosition, ThemeBlockFill), mappers.ts, queries for themes/profiles/audit/**blocks**/**templates** (CRUD + usage helpers) |
| `@cmsmasters/auth` | ✅ | client.ts, hooks.ts (useSession/useUser/useRole), guards.tsx (RequireAuth), actions.ts (magic link + signout) |
| `@cmsmasters/api-client` | ✅ | Hono RPC typed client |
| `@cmsmasters/validators` | ✅ | themeSchema (slug, meta, template_id, block_fills, seo, status), blockFillSchema, createBlockSchema/updateBlockSchema, createTemplateSchema/updateTemplateSchema |
| `@cmsmasters/ui` | 🟡 | tokens.css + button primitive + Three-Layer dirs (primitives/domain/layouts) |

### Apps
| App | Status | Details |
|-----|--------|---------|
| Command Center | ✅ DONE | 6 pages, localhost:4000, own dark theme |
| Studio | 🟡 IN PROGRESS | Login, themes list (grid+table+toolbar+pagination), sidebar, blocks list + block editor (HTML+CSS+hooks), templates list + template editor (position grid), theme editor (meta + SEO + template picker + position grid + per-theme block fills), save/publish with toast + audit, media (stub). **WP-005C complete**: full blocks/templates CRUD UI, theme editor pivot from sections builder to template+fills model, responsive grids, delete modals, readonly position cues. Remaining: error boundaries, media upload, end-to-end theme test. |
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
Layer 1: Studio                   🟡 IN PROGRESS (WP-005A+B+C done. Remaining: error boundaries, media upload, end-to-end theme test)
Layer 2: Portal theme page        ⬜ /themes/[slug] SSG from Supabase (WP-005D)
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

Each theme references a **template** (ordered position grid with block assignments) and optionally fills empty positions via **block_fills**. Portal resolves blocks from DB at build time, injects dynamic data via hooks.

**Resource Sidebar access tiers (ADR-005 V2):**
- 🔓 Public: Live Demo, Documentation, Changelog, FAQ
- 🔒 Licensed: Theme Download, Child Theme, PSD Files, Support Ticket
- ⭐ Premium: Priority Support, Megakit Access (Epic 2 prep)

**Block model (WP-005B):**
- **Block** = HTML + scoped CSS asset in `blocks` table. Has hooks for dynamic data (price selector, links). Created outside Studio (Figma → code → HTML+CSS).
- **Template** = ordered position grid in `templates` table. Positions: `[{ position: 1, block_id: uuid|null }]`. One template → many themes.
- **Theme** = `template_id` (FK→templates) + `block_fills` (CM fills empty positions per-theme). Dynamic data (price, links) lives in `theme.meta` → hooks inject at render time.

**Theme data shape (WP-005B):**

DB columns: id, slug, status, meta (jsonb), template_id (uuid FK→templates), block_fills (jsonb), seo (jsonb), created_by, created_at, updated_at

meta: { name, tagline, description, category, price, demo_url, themeforest_url, themeforest_id, thumbnail_url, preview_images, rating, sales, compatible_plugins, trust_badges, resources: { public, licensed, premium } }

template_id: uuid | null — references templates table
block_fills: [{ position: number, block_id: uuid }] — per-theme additions to template

seo: { title, description }

**Architecture reference:** `workplan/BLOCK-ARCHITECTURE-V2.md`

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
- WP-004 Phase 0–4: `logs/wp-004/` — DB migration, section registry, page builder
- WP-005A Phase 0–4: `logs/wp-005a/` — Block library (created→renamed→removed), type→block rename, architecture pivot to DB-driven model
- WP-005B Phase 0–4: `logs/wp-005b/` — Supabase migration (blocks+templates tables, themes alter), validators+queries, 10 Hono API endpoints, docs close
- WP-005C Phase 0–4: `logs/wp-005c/` — blocks/templates CRUD UI (list+editor), theme editor pivot (template picker + block fills + position grid), UX polish (responsive grids, delete modals, readonly cues)
