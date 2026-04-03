# CMSMasters Portal — Project Brief

> Read this file FIRST. It gives you the full picture in 5 minutes.
> Then read the specific layer spec for your current task.
> Last updated: 2 April 2026

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
│ Astro    │ Vite SPA  │ Vite SPA  │ Vite SPA │ Vite SPA   │
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
- Portal = Astro SSG, public, no auth, zero framework JS, SEO-first
- Dashboard, Support, Studio, Admin = Vite + React Router SPAs
- Hono API on Cloudflare Workers = the ONLY place secrets live
- **Secrets boundary**: Envato key, Resend key, Claude API key, R2 creds, Supabase service_role — ONLY in Hono API. NEVER in SPA bundles.
- Monorepo managed by **Nx** (not Turborepo)
- Command Center is an internal tool (localhost:4000) with its own design — NOT affected by Portal DS

---

## What's built (verified 2 April 2026)

### Infrastructure ✅
| Component | Status | Details |
|-----------|--------|---------|
| Nx monorepo | ✅ | nx.json, workspaces, eslint, knip |
| Supabase DB | ✅ | **9 tables** (profiles, themes, licenses, audit_log, **blocks**, **templates**, **pages**, **page_blocks**, **global_elements**). blocks: html+css+js with hooks/metadata. templates: ordered position grids. pages: layout/composed. global_elements: scope-bound header/footer/sidebars. RLS on all tables |
| Supabase Auth | ✅ | PKCE configured, magic link, on_auth_user_created trigger |
| Hono API | ✅ | `apps/api/` — 18+ routes: health, revalidate, upload + upload/batch (R2), blocks CRUD, templates CRUD, pages CRUD, global-elements CRUD. Auth + role guards. R2 bucket `cmsmasters-assets` configured |
| Design tokens | ✅ | `packages/ui/src/theme/tokens.css` (222 lines, Figma MCP sync) |
| Design system | ✅ | Flexible, updates through tokens + classes. Three-Layer structure ready |

### Shared packages ✅
| Package | Status | Contents |
|---------|--------|----------|
| `@cmsmasters/db` | ✅ | client.ts, types.ts (9 tables: Block with html+css+js, Template, Theme, Page, PageBlock, GlobalElement), mappers.ts, queries for all entities |
| `@cmsmasters/auth` | ✅ | client.ts, hooks.ts (useSession/useUser/useRole), guards.tsx (RequireAuth), actions.ts (magic link + signout) |
| `@cmsmasters/api-client` | ✅ | Hono RPC typed client |
| `@cmsmasters/validators` | ✅ | theme, block (with js), template, page Zod schemas |
| `@cmsmasters/ui` | 🟡 | tokens.css + button primitive + Three-Layer dirs + `portal-blocks.css` (.cms-btn system) + `animate-utils.js` (5 behavioral animation utilities) |

### Apps
| App | Status | Details |
|-----|--------|---------|
| Command Center | ✅ DONE | 6 pages, localhost:4000, own dark theme |
| Studio | ✅ DONE | Login, themes, blocks (editor + Process panel with token scanner + R2 image upload + component detection), templates, pages, global elements settings. Block editor: HTML+CSS+JS fields, import with script preservation, export. Process panel: split preview (before/after), zoom, scroll, replay, animation support. |
| Portal | ✅ DONE | Astro SSG. Theme pages (layout + global elements + template blocks + hook resolution). Composed pages (page_blocks + global elements). SEO: JSON-LD Product/WebPage, OG, canonical, sitemap.xml, robots.txt. CF Pages deploy config. Zero framework JS. |
| Dashboard | ⬜ | Not created yet |
| Admin | ⬜ | Not created yet |

### Also done
- 24 ADR files (V2/V3) in workplan/adr/ — incl. ADR-023 (Block Animations), ADR-024 (Block Components)
- WP-006 Block Import Pipeline: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js, component detection
- R2 bucket `cmsmasters-assets` configured on Cloudflare
- `/block-craft` skill for Figma → production block pipeline (preview on :7777)
- Homepage wireframe (10 sections)
- .context/ folder with agent context
- CLAUDE.md agent instructions
- 5 skills: block-craft, portal-workflow, lint-ds, sync-tokens, figma-component-vars

---

## Current sprint: MVP Slice

**Goal:** End-to-end pipeline: create theme in Studio → see it on Portal page → user sees it in Dashboard → admin manages in Admin.

**Support + AI deferred.**

```
Layer 0: Infrastructure           ✅ DONE (DB, Auth, Hono, packages)
Layer 1: Studio + DB + API        ✅ DONE (WP-005A+B+C+D Phase 1)
Block Import Pipeline             ✅ DONE (WP-006: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js)
Layer 2: Portal (Astro SSG)       ✅ DONE (WP-007: layout editor, theme pages, composed pages, SEO, sitemap, CF Pages)
Layer 3: Dashboard + Admin        ⬜ future
```

### What's next: Layer 3 (Dashboard + Admin)
- `apps/dashboard/` — profile, my themes, license list
- `apps/admin/` — users table, role management, themes overview, audit log
- Content seeding: real blocks from Figma via `/block-craft`, real themes in Studio

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

**Block model (WP-005B + WP-006):**
- **Block** = HTML + scoped CSS + JS in `blocks` table. Has hooks for dynamic data. Created via Figma → `/block-craft` skill → Studio import → Process panel. Animations: CSS scroll-driven (entrance) + animate-utils.js (behavioral). Components: `.cms-btn` classes from portal-blocks.css. ADR-023, ADR-024.
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
- WP-005D Phase 0–1: `logs/wp-005d/` — pages + global elements types/API/Studio UI
- WP-006 Phase 0–8: `logs/wp-006/` — block import pipeline (token scanner, R2 upload, Process panel, JS field, portal-blocks.css, animate-utils.js, component detection)
- WP-007 Phase 1–5: `logs/wp-007/` — Portal layout system (layout editor, Astro SSG, theme pages, composed pages, SEO, sitemap, CF Pages deploy)
