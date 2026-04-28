# Roadmap — Layers 1–3 (after Layer 0)

> Layer 0 is DONE. This file describes what comes next.
> Each layer builds on the previous one.

---

## Layer 1: Studio — Theme Editor + Blocks/Templates — WP-005A+B+C DONE

**App:** `apps/studio/` — Vite + React Router SPA (shell already exists)
**Auth:** content_manager or admin role
**Purpose:** Content Manager manages blocks, templates, and themes.

### What exists (after WP-005A + WP-005B + WP-005C)
- Login page, auth callback
- Themes list page (table + toolbar + cards + pagination + status badges)
- Sidebar, topbar
- **Blocks list** (responsive grid, search/filter, pagination) + **block editor** (HTML+CSS+hooks, live iframe preview, import, delete with confirmation)
- **Templates list** (position dot indicators, responsive grid) + **template editor** (position grid editor with BlockPickerModal, add/remove blocks per slot)
- **Theme editor:** meta form + SEO + **template picker** (inline grid) + **position grid** (merged template slots readonly + per-theme block fills editable) + save/publish + delete confirmation modal
- Save/publish: meta + seo + template_id + block_fills persisted, revalidation triggered
- Media page (stub)
- **DB foundation (WP-005B):** blocks + templates tables in Supabase, 10 Hono API endpoints (CRUD), validators, query layer, dependency checks on delete
- **Block model:** HTML+CSS assets in DB, hooks for dynamic data, templates as position grids, themes reference template_id + block_fills

**What remains (Layer 1):**

**Media upload flow** (not yet wired):
1. User drags image → component calls Hono API `POST /api/upload`
2. Hono returns R2 signed upload URL
3. Browser uploads directly to R2
4. URL saved in theme record

**Publish flow** (save works, revalidation not wired):
1. Save → Supabase `upsert` themes table (direct, anon key) ✅
2. Publish → set status='published' + `POST /api/content/revalidate` via @cmsmasters/api-client
3. Revalidation triggers Portal SSG rebuild of `/themes/[slug]`

### Acceptance criteria
- [x] WP-005A: type→block rename, packages/blocks/ removed, architecture pivot
- [x] WP-005B: blocks+templates DB tables, 10 API endpoints, validators+queries, Studio cleanup
- [x] WP-005C: Blocks CRUD page, Templates CRUD page, Theme Editor with template picker
- [ ] Error boundaries, 404 page
- [ ] Media upload works (image appears in R2, URL saved)
- [ ] At least 1 theme created end-to-end with template+block model
- [ ] Publish triggers revalidation endpoint

---

## Layer 2: Portal Theme Page (2–3 days, can overlap with Layer 3)

**App:** `apps/portal/` — Next.js 15 App Router, SSG
**Auth:** None (public)
**Purpose:** Public theme page — the main marketing asset. Each theme is a universe.

### Route
- `/themes/[slug]/page.tsx` — SSG theme page from Supabase

### ThemePage template (ADR-009)

Portal resolves a theme's template (position grid) + block fills from DB. Each position maps to a block (HTML+CSS asset). Dynamic data injected via hooks at build time. See `workplan/BLOCK-ARCHITECTURE-V2.md`.

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

**Section 5: Custom Blocks (15% unique)**
Template positions can hold any block from DB. Examples:
- `before-after` → image comparison slider
- `video-demo` → YouTube embed with poster
- `testimonial` → quote card with author + company
- `custom-cta` → styled call-to-action block
New block = new row in blocks table, zero template changes.

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
- Page fetches full theme by slug at build time (meta + template_id + block_fills + seo)
- On-demand revalidation: Studio publish → Hono API → `revalidatePath('/themes/[slug]')` or `revalidateTag('themes')`
- ISR fallback: `revalidate: 3600` as safety net

### Theme JSON shape reference (WP-005B — template+block model)
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
  "template_id": "uuid-of-starter-template",
  "block_fills": [
    { "position": 3, "block_id": "uuid-of-custom-cta-block" },
    { "position": 7, "block_id": "uuid-of-testimonial-block" }
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

## Layer 3A: Dashboard ✅ DONE (WP-017)

**App:** `apps/dashboard/` — Vite + React Router v7 + Tailwind v4 SPA on port 5174
**Auth:** any authenticated user (no role restriction)
**Figma:** nodes 3151-33 (My Themes), 3163-45 (My Account)

### Pages
- `/` — My Themes: license cards with thumbnails, badges (Regular/Elements), support status, bundled plugins panel
- `/account` — My Account: profile + 4 stat cards (Licenses, Themes, Support, Subscription) + capabilities table + access details
- `/support` — Mock stub (mailto link, deferred to Support System sprint)
- `/downloads` — Mock stub (ThemeForest link, deferred to R2 ZIP upload)

### Components
- `theme-card.tsx` — license card with badge + support status + actions
- `stat-card.tsx` — reusable stat display
- `capabilities-table.tsx` — 6-row entitlements table

### Build
- 477KB main + 4 lazy chunks (my-themes, my-account, support, downloads)

---

## Layer 3B: Admin ✅ DONE (WP-017)

**App:** `apps/admin/` — Vite + React Router v7 + Tailwind v4 SPA on port 5175
**Auth:** admin staff_role only (`allowedRoles: ['admin']`)
**Figma:** node 3134-33 (Overview)

### Pages
- `/` — Overview: 5 KPI StatCards (Users, Licenses, Themes, Staff, Activations) + activation feed with DateRangeToggle (Today/7d/30d)
- `/staff` — Staff & Roles: staff list + grant form (email search → resolve ID → POST) + inline revoke
- `/users` — User List: debounced search + pagination + inspect links
- `/users/:id` — User Inspector: account card + 4 StatCards + licenses + activity + admin actions
- `/audit` — Audit Log: action filter + pagination + expandable JSON details
- `/health` — System Health: status banner + 2×2 grid (Database, R2, Envato, Application)

### Shared Components (7)
- `lib/api.ts` — fetchAdmin, fetchAdminWithCount, mutateAdmin + response types
- `page-header.tsx`, `avatar-initials.tsx`, `status-badge.tsx`, `stat-card.tsx`, `date-range-toggle.tsx`, `activation-event.tsx`

### Build
- 478KB main + 6 lazy chunks

---

## Timeline

```
Layer 0: ██████  DONE
Layer 1: ██████  DONE (except error boundaries + media upload)
Layer 2: ██████  DONE (except content seeding)
Layer 3: ██████  DONE (WP-017, completed 2026-04-09)
```

---

## Deferred (explicit)

| Feature | When |
|---------|------|
| Support App + AI chat | Separate sprint |
| Activation flow (ADR-006, WP → Portal) | Separate WP (requires theme PHP changes) |
| Dashboard /activate (purchase code input) | Separate WP |
| Theme downloads (ZIP from R2) | When ZIPs uploaded to R2 |
| Dashboard /support (real tickets) | Support System sprint |
| DateRangeToggle actual filtering | When activity data accumulates |
| Download signed URLs | Dashboard V2 |
| Email notifications (Resend) | Dashboard V2 |
| Studio live preview (iframe) | Studio V2 |
| Markdown docs editor | Studio V2 |
| Blog system | Portal V2 |
| Homepage (10 sections) | Portal V2 |
| Theme catalog /themes with search | Portal V2 |
| Meilisearch integration | Portal V2 |
| Heuristic confidence tuning (Task C, post-WP-030) | Future WP, after 2–4 weeks of WP-028 + WP-030 author field data |
| Cross-surface validator port decision (OQ-δ, post-WP-030) | Future WP — decide: port validator to block-forge / formalize Studio-only / extract to package |
| Inspector cascade-override fix (WP-034, post-WP-033) | ✅ DONE 2026-04-28 — Path A (4-tweak fan-out at canonical BPs `[0, 375, 768, 1440]`) closes WP-033 Phase 3 Issue #3 / Phase 4 OQ5; chip apply now visibly applies token at all 3 BPs even when pre-existing `@container slot` overrides existed; `emitTweak` Case C in-place dedupe-update preserves sibling decls; cross-surface lockstep (block-forge + Studio TokenChip + dispatchInspectorEdit `apply-token` kind body); tooltip caveat removed; +5 cross-surface tests + visual smoke at fast-loading-speed.json fixture; full WP at workplan/WP-034-inspector-cascade-override.md |
| Inspector UX polish (WP-036, post-WP-033) | ✅ DONE 2026-04-28 — hover-suggestion → highlight target (Phase 1), Undo no-op fix (Phase 2), identical-heuristic group (Phase 2); 3 phases delivered in 1 day; full WP at workplan/WP-036-inspector-ux-polish.md |
| Inspector typed inputs + property tooltips (WP-037, post-WP-036) | ✅ DONE 2026-04-28 — typed `<select>` for 4 LAYOUT enum properties (display, flex-direction, align-items, justify-content) sourced from new PROPERTY_META SoT (byte-identical mirror across surfaces); first Radix Tooltip primitive in packages/ui consumed by Inspector PropertyRow for label hover hints; PARITY divergence on PropertyRow row-shape formalized (block-forge single-cell, Studio M/T/D grid — content meta is shape-agnostic); 2 phases + 1 pre-flight WP-033 polish landing commit delivered in 1 day; full WP at workplan/WP-037-inspector-typed-inputs.md |
| TweakPanel sunset decision (post-WP-033) | Future — surface field data on whether authors prefer Inspector vs TweakPanel; coexistence retained V1 |
| Smart Path A scan-then-emit (WP-039, post-WP-034) | ✅ DONE 2026-04-28 — `findConflictBps` helper colocated with emitTweak/parseContainerBp scans source CSS for @container conflicts; chip-apply now emits `1 + N` tweaks (where `N` = canonical BPs with pre-existing declarations); zero redundant @container blocks on no-conflict sources; behaviour at conflict BPs unchanged from WP-034 baseline; +6 core tests + 5 surface tests; cross-surface lockstep (commit `d4e17a4c`); full WP at workplan/WP-039-smart-path-a-scan-then-emit.md |
| PropertyRow row-shape PARITY restoration (WP-040, post-WP-037) | ✅ DONE 2026-04-28 — Brain ruling Option B (single-cell wins): Studio ported to byte-equivalent of Forge mod 3-line JSDoc + import path; ~80 LOC source delta; PropertyRow + InspectorPanel + 51 tests rewritten in mirror; PARITY Ruling 1B RETIRED; 2 phases (Phase 1 `a8275e25`); visual smoke pair pinned at logs/wp-040/smoke-{1-forge,2-studio,2-studio-inspector}.png; full WP at workplan/WP-040-property-row-shape-parity.md |
| Tooltip primitive portal-wide rollout (WP-041, post-WP-037) | ✅ DONE 2026-04-28 — Phase 0 RECON empirically narrowed scope to studio (portal/dashboard/admin had zero native title attrs on focusable elements); 9 sites migrated (preset-bar ×3, editor-sidebar ×1, slots-list ×1, theme-editor ×2, media ×2); PropertyRow ↺ button kept native `title=` as PARITY-locked deferral (mirror Forge); iframe `title=` retained per WCAG 2.1; ~28 LOC source delta + CONVENTIONS native-title policy + PARITY pair cross-references; visual smoke pair pinned (slots + media); 2 phases (Phase 1 `d218c695`); full WP at workplan/WP-041-tooltip-portal-wide-rollout.md |
| Inspector e2e Playwright coverage (WP-042, post-WP-033) | 🟡 BACKLOG — Playwright spec for chip-apply / cascade-conflict / typed input / tooltip / hover-highlight paths at iframe-rendered-CSS level; retires WP-033 Phase 5 Ruling 3 DEFER; 3–4h, 1 phase + close; full WP at workplan/WP-042-inspector-e2e-playwright.md |
