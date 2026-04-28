# CMSMasters Portal — Project Brief

> Read this file FIRST. It gives you the full picture in 5 minutes.
> Then read the specific layer spec for your current task.
> Last updated: 2026-04-26

---

## What is this project

CMSMasters is a Ukrainian WordPress theme company — Power Elite Author on ThemeForest, 95K+ customers, 65+ Elementor themes, 16 years in business. Founder: Dmitry Smielov.

The company operates 4 fragmented domains with no shared navigation, broken post-purchase paths, and zero customer email collection.

**CMSMasters Portal** is a unified customer platform replacing this fragmented ecosystem. One domain. One brand. One pipeline from discovery → purchase (ThemeForest) → activation → resources → support.

---

## Architecture (ADR-007 V4, ADR-011 V3, ADR-022)

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENT (browser)                      │
├──────────┬───────────┬───────────┬──────────┬────────────┤
│ Portal   │ Dashboard │ Support   │ Studio   │ Admin      │
│ Next.js  │ Vite SPA  │ Vite SPA  │ Vite SPA │ Vite SPA   │
│ SSG+ISR  │           │           │          │            │
│ (public) │ (auth)    │ (auth)    │ (auth)   │ (auth)     │
│ Vercel   │ CF Pages  │ CF Pages  │ CF Pages │ CF Pages   │
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
- Portal = Next.js 15 App Router (SSG + ISR), public, SEO-first, deployed on **Vercel**
- Dashboard, Support, Studio, Admin = Vite + React Router SPAs on CF Pages
- Hono API on Cloudflare Workers = the ONLY place secrets live
- **Secrets boundary**: Envato key, Resend key, Claude API key, R2 creds, Supabase service_role — ONLY in Hono API. NEVER in SPA bundles.
- **Revalidation**: Studio publish → Hono API → Portal `/api/revalidate` → `revalidatePath()` (< 1 sec)
- Monorepo managed by **Nx** (not Turborepo)
- Command Center is an internal tool (localhost:4000) with its own design — NOT affected by Portal DS

---

## What's built (verified 9 April 2026)

### Infrastructure ✅
| Component | Status | Details |
|-----------|--------|---------|
| Nx monorepo | ✅ | nx.json, workspaces, eslint, knip |
| Supabase DB | ✅ | **15 tables** (profiles, themes, licenses, audit_log, blocks, templates, pages, page_blocks, global_elements, categories, tags, theme_categories, theme_tags, **staff_roles**, **activity_log**). staff_roles: flexible role assignment with permissions jsonb (replaces static profiles.role for staff). activity_log: business analytics (license_verified, theme_viewed, etc.). RLS on all tables. `get_user_role()` SECURITY DEFINER checks staff_roles → profiles.role fallback |
| Supabase Auth | ✅ | PKCE configured, magic link, on_auth_user_created trigger |
| Hono API | ✅ | `apps/api/` — 32+ routes: health, revalidate, upload + upload/batch (R2), blocks CRUD, templates CRUD, pages CRUD, global-elements CRUD, **licenses** (verify + list), **admin** (stats, users, staff, activity, audit, health), **user** (entitlements, profile). Auth + role guards. R2 bucket `cmsmasters-assets` configured. Envato API integration (mock/live mode) |
| Design tokens | ✅ | `packages/ui/src/theme/tokens.css` (222 lines, Figma MCP sync) |
| Design system | ✅ | Flexible, updates through tokens + classes. Three-Layer structure ready |

### Shared packages ✅
| Package | Status | Contents |
|---------|--------|----------|
| `@cmsmasters/db` | ✅ | client.ts, types.ts (15 tables incl. StaffRole, ActivityEntry), mappers.ts, queries for all entities incl. **staff-roles.ts** (grant/revoke/list), **activity.ts** (log/query), **licenses.ts** (CRUD + purchase code lookup). profiles.elements_subscriber column added. licenses.theme_id nullable |
| `@cmsmasters/auth` | ✅ | client.ts, hooks.ts (useSession/useUser/useRole), guards.tsx (RequireAuth), actions.ts (magic link + signout), **resolvers.ts** (resolveBaseAccess, resolveLicenseAccess, resolveStaffAccess, resolveElementsAccess, computeEntitlements). Subpath export: `@cmsmasters/auth/resolvers` for Workers-safe import. useUser() fetches role via `get_user_role()` RPC |
| `@cmsmasters/api-client` | ✅ | Hono RPC typed client |
| `@cmsmasters/validators` | ✅ | theme, block (with js), template, page Zod schemas |
| `@cmsmasters/ui` | 🟡 | tokens.css + button primitive + Three-Layer dirs + `portal-blocks.css` (.cms-btn system) + `animate-utils.js` (5 behavioral animation utilities) |

### Apps
| App | Status | Details |
|-----|--------|---------|
| Command Center | ✅ DONE | 6 pages, localhost:4000, own dark theme |
| Studio | ✅ DONE | Login, themes, blocks (editor + Process panel with token scanner + **Responsive tab (WP-027)** + R2 image upload + component detection), templates, pages, global elements settings, **theme meta (categories + tags CRUD with tabbed UI + picker modals)**. Block editor: HTML+CSS+JS fields, import with script preservation, export, 2-tab surface (Editor \| Responsive). Process panel: split preview (before/after), zoom, scroll, replay, animation support. Theme editor: category/tag picker modals with is_primary toggle, junction table save/load. |
| Portal | ✅ DONE | **Next.js 15 App Router (SSG + ISR)** on Vercel. Theme pages (layout + global elements + template blocks + hook resolution). **Multi-block slots**: sidebar/header/footer slots support multiple blocks with configurable gap (WP-014). Composed pages (page_blocks + global elements). SEO: JSON-LD Product/WebPage, OG, canonical, sitemap.xml, robots.txt. On-demand revalidation via `/api/revalidate`. Dev port: 3100. |
| Dashboard | ✅ DONE | Vite SPA on :5174. My Themes (license cards, support status, bundled plugins), My Account (profile, 4 stat cards, capabilities table, access details), Support (mock), Downloads (mock). Auth: any authenticated user. Lazy routes. |
| Admin | ✅ DONE | Vite SPA on :5175. Overview (5 KPIs, activation feed, date range toggle), Staff & Roles (grant/revoke), User Inspector (search + full detail), Audit Log (filterable), System Health (DB/R2/Envato status). Auth: admin only via staff_roles. |

### Also done
- 24 ADR files (V2/V3/V4) in workplan/adr/ — incl. ADR-007 V4 (Next.js Portal), ADR-023 (Block Animations), ADR-024 (Block Components)
- WP-006 Block Import Pipeline: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js, component detection
- R2 bucket `cmsmasters-assets` configured on Cloudflare
- `/block-craft` skill for Figma → production block pipeline (preview on :7777)
- Homepage wireframe (10 sections)
- .context/ folder with agent context
- CLAUDE.md agent instructions
- 5 skills: block-craft, portal-workflow, lint-ds, sync-tokens, figma-component-vars
- WP-017 Layer 3: 3 DB migrations (012-014), 14 API endpoints, 2 new SPAs (Dashboard + Admin), entitlement resolvers

### Living Documentation ✅
| Component | Status | Details |
|-----------|--------|---------|
| Domain Manifest | ✅ | `src/__arch__/domain-manifest.ts` — 11 domains, typed DomainDefinition interface |
| Domain Skills | ✅ | `.claude/skills/domains/` — 11 SKILL.md files (invariants, traps, blast radius) |
| Arch Tests | ✅ | `src/__arch__/domain-manifest.test.ts` — 384 tests: path existence, dual ownership, table access, skill parity |
| `npm run arch-test` | ✅ | Runs all enforcement tests in ~400ms |

> Source: [WP-009 Living Documentation](../workplan/WP-009-living-documentation.md) | Logs: `logs/wp-009/`

---

## Current sprint: MVP Slice

**Goal:** End-to-end pipeline: create theme in Studio → see it on Portal page → user sees it in Dashboard → admin manages in Admin.

**Support + AI deferred.**

```
Layer 0: Infrastructure           ✅ DONE (DB, Auth, Hono, packages)
Layer 1: Studio + DB + API        ✅ DONE (WP-005A+B+C+D Phase 1)
Block Import Pipeline             ✅ DONE (WP-006: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js)
Layer 2: Portal (Next.js 15)      ✅ DONE (WP-007: layout editor, theme pages, composed pages, SEO, sitemap. Migrated Astro→Next.js 4 Apr 2026)
Global Elements V2                ✅ DONE (WP-008: block categories, defaults, layout slot overrides, new portal resolution)
Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
Block Forge Core                  ✅ DONE (WP-025: pure-function engine — 6 public fns, 75 tests, 3 frozen fixtures + E2E snapshot; unblocks WP-026 tools/block-forge + WP-027 Studio Responsive tab; ADR-025)
Block Forge MVP                   ✅ DONE (WP-026: tools/block-forge/ Vite app on :7702 — file-based authoring against content/db/blocks/*.json, 3-panel preview (1440/768/375), accept/reject suggestions, save with .bak; 46 tests, zero PARITY divergences; unblocks WP-027 Studio Responsive tab + WP-028 Tweaks/Variants UI; ADR-025)
Studio Responsive tab             ✅ DONE (WP-027: apps/studio/ Block Editor's 2-tab surface (Editor | Responsive); display-only suggestion list (6 heuristics via @cmsmasters/block-forge-core); Accept/Reject → form.code dirty → DB save via updateBlockApi({variants}) + Hono /revalidate ≤15 LOC extension ({} = cache-wide); 489/0 arch-test + unit coverage preserved + 6/6 e2e scenarios; composeSrcDoc single-wrap deviation from block-forge PARITY §7 documented; unblocks WP-028 Tweaks/Variants UI + WP-029 tokens.responsive.css populate; ADR-025)
Tweaks + Variants UI              ✅ DONE (WP-028: TweakPanel + VariantsDrawer + VariantEditor on both surfaces — tools/block-forge + Studio Responsive tab; ADR-025 Layer 2 (visual tweaks) + Layer 4 (named variants) authoring; 7 phases (0-6) + Phase 3.5 mini-phase closed; first real DB variants write shipped; Portal render verified at variant BP; cross-surface byte-identical PARITY contract validated at 10× UI complexity; 499/0 arch-test + typecheck + Studio 104 + block-forge 133 tests green; ADR-025)
Heuristic polish (Tasks A+B)      ✅ DONE (WP-029: variant CSS scoping validator (Studio-side, `validateVariantCss.ts` + inline banner; non-blocking; OR-semantics; PostCSS-based) + live `<App />` render-level save regression pins (`tools/block-forge/src/__tests__/app-save-regression.test.tsx`; replaces WP-028 Phase 5/6 harness-mirror baseline) + empirical drift validation. Closes WP-028 OQ4 + OQ6. `tokens.responsive.css` real population shipped at WP-030; Task C heuristic confidence tuning carries forward as post-WP-030 future-WP work pending 2–4 weeks WP-028+WP-030 author field data; ADR-025)
Responsive Tokens Editor          ✅ DONE (WP-030: tools/responsive-tokens-editor/ Vite app on :7703 — Utopia full-system fluid scale config (10 typography + 11 spacing + 1 special token + 3 container BPs); reads/writes packages/ui/src/theme/responsive-config.json (SOT) + tokens.responsive.css (cascade-override, machine-generated); save-safety contract mirrors block-forge (6 rules); cross-surface PARITY trio committed (block-forge globals.css + Studio preview-assets.ts already-imports + responsive-tokens-editor/PARITY.md full contract); 7 phases, 76/76 tests, 539/539 arch-test, conservative defaults preserve desktop static (Phase 0 ruling 1); PF.41 RECON catch on save-time CSS header preserved snapshot stability; resolves ADR-025 Layer 1 foundation; ADR-025)
Block Forge Inspector             ✅ DONE (WP-033: DevTools-style Inspector ships in BOTH tools/block-forge AND apps/studio/.../responsive/inspector — cross-surface mirror byte-identical mod 3-line JSDoc per Phase 4 Ruling 1 REIMPLEMENT; hover/pin postMessage protocol (4 types in block-forge: namespace), single-pin-per-slug + active-cell editable, 3-hidden-iframe per-BP cell sourcing (Option A) with djb2 cssHash cache, PostCSS cascade walk + linear-interp 22-token chip detection (Option B-subset), tooltip pin (Phase 4 Ruling 2) for cascade caveat; Studio mounts Inspector as TweakPanel sibling — both coexist V1 (Phase 5 Brain ruling KEEP); Studio's displayBlock follows watchedFormCode post-Phase 5 OQ1 — visible iframe reflects Inspector edits IMMEDIATELY; @cmsmasters/ui/responsive-config.json package export landed (Phase 4 Ruling 5); 5 phases, ~95 new tests at Studio + 63 at block-forge, 580/580 arch-test, typecheck CLEAN, live smoke 12/12 GREEN at both surfaces; ADR-025 Layer 2 closes alongside (5 authoring tools shipped: TweakPanel + VariantsDrawer + SuggestionList + Inspector × 2 surfaces); cascade-override fix scoped at WP-034 BACKLOG; ADR-025)
Inspector UX Polish               ✅ DONE (WP-036: post-WP-033 user-feedback fixes — hover-suggestion → highlight target via new `block-forge:inspector-request-hover` postMessage + `[data-bf-hover-from-suggestion]` outline (Phase 1); per-id Undo via new `removeFromPending` reducer + `onUndo` prop chain — fixes silent no-op bug where pending-row Undo button was wired to `reject()` which guards against pending ids (Phase 2); render-time grouping of visually-identical suggestions sharing `(heuristic, bp, property, value, rationale)` tuple via new `SuggestionGroupCard` collapsed-by-default + per-selector hover via Phase 1 protocol — engine emit semantics atomic, grouping consumer-side only (Phase 2); Studio bonus: `querySelectorAll` broadcasts hover to all 3 triptych iframes simultaneously (multi-BP hint); 3 phases delivered in 1 day at both surfaces; +12 hover-protocol tests + +14 removeFromPending tests + +20 grouping tests = +46 across PARITY mirrored test files; 588/588 arch-test, typecheck CLEAN, live smoke 4/4 GREEN at both surfaces; ADR-025)
Inspector Typed Inputs + Tooltips ✅ DONE (WP-037: post-WP-036 user-feedback polish — typed `<select>` for 4 LAYOUT enum CSS properties (display, flex-direction, align-items, justify-content) on both surfaces (Phase 1) + first Radix Tooltip primitive in `packages/ui` consumed by Inspector PropertyRow for label hover hints (Phase 2); new PROPERTY_META source-of-truth (kind: numeric|enum, options[], tooltip text) byte-identical mirrored across both surfaces; custom-value fallback preserves legacy tweaks via disabled "(custom)" option; pre-flight commit landed phantom WP-033 post-close polish that was sitting uncommitted in the working tree (single-cell PropertyRow + 5 source files); PARITY divergence on PropertyRow row-shape formalized via Phase 0 RECON Ruling 1B (block-forge single-cell, Studio M/T/D grid — content meta is shape-agnostic); 2 phases + 1 pre-flight delivered in 1 day at both surfaces; +28 new tests across PARITY mirrored test files (20 enum + 8 tooltip); 595/595 arch-test, Studio typecheck CLEAN, Studio 298/298 + block-forge Inspector trio 54/54, 5/5 visual smoke screenshots GREEN at block-forge surface; first portal-wide Tooltip primitive ships for reuse; ADR-025 Layer 2 polish queue)
Inspector Cascade-Override Fix    ✅ DONE (WP-034: closes WP-033 Phase 3 Issue #3 / Phase 4 OQ5 — `[Use --token ✓]` chip apply now visibly applies token at all 3 BPs even when pre-existing `@container slot (max-width: Npx)` rules previously won the cascade; Path A (4-tweak fan-out at canonical BPs `[0, 375, 768, 1440]`) replaces the previous single bp:0 emit on both surfaces (block-forge `App.tsx::handleInspectorApplyToken` + Studio `dispatchInspectorEdit.ts` 'apply-token' kind); `emitTweak` Case C in-place dedupe-update preserves sibling decls when @container blocks pre-exist; Case A creates new @container blocks for canonical BPs missing from source (acceptable +1-3 cosmetic block tradeoff for simpler logic — Smart Path A scan-then-emit is future polish); TokenChip tooltip caveat removed; Phase 0 RECON empirically debunked WP-034 doc's "Path A pollutes" concern via emit-tweak.test.ts dedupe pin; +5 cross-surface tests (3 Studio dispatchInspectorEdit + 2 block-forge session) + 2 visual smoke screenshots at fast-loading-speed.json `.heading` cascade-conflict fixture; 2 phases delivered in 1 day; PARITY trio "Known limitations" sections flipped to "RESOLVED via WP-034 Path A"; 595/595 arch-test, both surfaces typecheck CLEAN, block-forge 363 + Studio 300 tests; ADR-025 Layer 2 polish queue continues)
```

### What's next
- Content seeding: real blocks from Figma via `/block-craft`, real themes in Studio
- Homepage wireframe → implementation
- Theme catalog `/themes` with search
- Support App (AI chat, ticket system)

### Deferred from WP-017
| Feature | When |
|---------|------|
| Dashboard /support (real tickets) | Support System sprint |
| Dashboard /activate (purchase code) | Separate WP (requires theme PHP changes) |
| Theme downloads (ZIP from R2) | When ZIPs uploaded to R2 |
| Activation flow (ADR-006) | Separate WP |
| DateRangeToggle actual filtering | When activity data accumulates |

---

## Theme page architecture (ADR-009 — critical reference)

Each theme references a **template** (ordered position grid with block assignments) and optionally fills empty positions via **block_fills**. Portal resolves blocks from DB at build time, injects dynamic data via hooks.

**Slot types (WP-020):** Layout Maker supports container slots (hold other slots via `nested-slots`) and leaf slots (hold blocks via `.slot-inner`). The theme-page-layout uses `content` as a container for `theme-blocks`. Studio's Slot Assignments panel reads this structure from the layout row — container slots show info cards; leaf slots show block controls.

**Breakpoint system (Layout Maker → Studio → Portal):**

Layout Maker defines responsive layouts with 3 canonical breakpoints (desktop 1440px, tablet 768px, mobile 375px) + device presets (10 widths from 360–1920px). The pipeline:

1. **Layout Maker** (`tools/layout-maker/`) — YAML config with `config.grid[bp].columns` (grid structure per BP), `config.grid[bp].slots[name]` (per-BP visual overrides for padding, gap, align, borders, background). HTML is static; CSS media queries drive responsive behavior. Drawer mode for sidebars on tablet/mobile. Device presets allow previewing at specific device widths (iPad Pro, Galaxy, etc.) while the grid config resolves to the nearest canonical BP.
2. **Export** (`runtime/routes/export.ts`) — `buildSlotConfig()` resolves tokens → px/hex, outputs `slot_config: { [slotName]: { ...base, breakpoints: { tablet: {...}, mobile: {...} } } }` as JSON.
3. **Studio** — imports JSON, saves to DB. TODO: consume `breakpoints` in slot_config, show in UI.
4. **Portal** — renders theme pages with layout HTML+CSS. TODO: generate media queries from `slot_config.breakpoints` at render time.

Per-BP fields: padding-*, gap, align, max-width, min-height, margin-top, border-*, background, visibility, order.
Global fields (never per-BP): position, sticky, z-index, nested-slots, allowed-block-types.

Per-slot visibility (WP-023): `visible` / `hidden` / `drawer` per breakpoint, per slot. Replaces grid-level `sidebars` for fine-grained control (e.g., sidebar-left=hidden, sidebar-right=stacked). Grid-level `sidebars` is fallback.
Display order (WP-023): CSS `order` per slot, per breakpoint. Controls stacking when grid collapses to single column on mobile (e.g., sidebar below content).

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
- WP-008 Phase 1–5: `logs/wp-008/` — Global Elements V2 (block categories, defaults, layout slot overrides, portal cascade resolution)
- Portal Next.js Migration: `logs/portal-nextjs-migration/` — Astro → Next.js 15, ISR, Vercel deploy, revalidation endpoint, portal link in Studio
- WP-017 Phase 0–8: `logs/wp-017/` — Layer 3 Dashboard + Admin (staff_roles, activity_log, auth resolvers, 14 API endpoints, Dashboard SPA, Admin SPA)
- WP-028 Phase 0–6: `logs/wp-028/` — Tweaks + Variants UI (cross-surface lockstep for tools/block-forge + Studio Responsive tab). Phases: 0 RECON (extract-vs-reimplement empirical metric), 1 Foundation + placeholder scaffolding (both surfaces + component-snapshot parity test harness), 2 TweakPanel, 3 VariantsDrawer + 3.5 Path B re-converge, 4 VariantEditor + first real DB variants write, 5 OQ2 clear-signal (`nullable().optional()`) + Dirty-state contract, 6 Close (OQ5 tweak-compose-on-save fix). 6 OQs tracked in `parked-oqs.md`; Phase 6 closed all 6 (3 RESOLVED, 2 DEFERRED→WP-029, 1 CONVERTED→ops ticket).
- WP-029 Phase 0–3: `logs/wp-029/` — Heuristic polish Tasks A+B (variant CSS scoping validator + `<App />` render-level pins). Phases: 0 RECON (PostCSS resolution path + accepted reveal-rule syntaxes audit), 1 Task A (Studio validator + inline banner; 12 unit + 5 RTL pins), 2 Task B (live render pins + drift detector + Brain C-iii sc reduction; 3-commit chain `c842a9a3` → `ecbec5db` → `7c6326f1`; empirical drift validation), 3 Close (doc propagation under approval gate). Closes WP-028 OQ4 + OQ6; surfaces OQ-α/OQ-γ (📦 CHIPs) + OQ-δ (✅ ACCEPTED). Approval-gate pattern 6/6.
- WP-030 Phase 0–7: `logs/wp-030/` — Responsive Tokens Editor (`tools/responsive-tokens-editor/` Vite :7703 — Utopia full-system fluid scale config + cascade-override generator + Vite fs middleware save flow + render-level smoke verification on block-forge :7702 + Portal :3100). Phases: 0 RECON (4 Brain rulings + 4 escalations + conservative-defaults table), 1 chrome scaffold + types skeleton, 2 defaults + generator + validate + snapshot baseline, 3 Global Scale UI + WCAG banner, 4 Token Preview Grid + override editor (PF.14 closure), 5 Container Widths Editor + Live Preview Row (esc.b RESOLVED), 6 Save flow + cross-surface PARITY (esc.d RESOLVED), 7 Close + doc propagation under approval gate. 9 P6 screenshots (block-forge triptych + Portal cascade @ 1440 + Portal fluid scale @ 500). PF.1 → PF.51 across 7 phases (25+ pre-code RECON catches). All 4 escalations closed at P6. Approval-gate pattern executed at P7 per `feedback_close_phase_approval_gate`.
