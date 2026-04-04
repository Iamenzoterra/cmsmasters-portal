# ADR Digest — Architecture Decisions for Implementation

> Condensed from 24 ADRs (V2/V3/V4 versions). Only implementation-relevant decisions.
> Full ADR Bible: workplan/adr/ (22 files) or docs/ARCHITECTURE.md

---

## Stack decisions

### ADR-007 V4: Split-stack
- **Portal** → Next.js 15 App Router, SSG + ISR. Deployed on **Vercel**. Public, SEO, on-demand revalidation.
- **Dashboard, Support, Studio, Admin** → Vite + React Router. SPA, auth required.
- **API** → Hono on Cloudflare Workers. Business logic with secrets.
- **Command Center** → Next.js (localhost, already built, don't change).

Why: Portal needs ISR (500+ pages), middleware (auth-gated content), streaming (search). Astro V3 was for static marketing — Portal is a product.
Revalidation: Studio publish → Hono API → `revalidatePath()` on Portal (< 1 sec).

### ADR-017 V3: Nx monorepo
- Nx (not Turborepo). Chosen for polyglot future (potential Python AI service).
- `nx.json` configured. Build: `nx run-many -t build`. Dev: `nx run-many -t dev`.

### ADR-022: Hono API on Cloudflare Workers
- Separate API service for operations requiring secrets or elevated privileges.
- Endpoints: verify-purchase (Envato), send-email (Resend), ai-chat (Claude API), signed-url (R2), revalidate (Portal ISR), export (service_role).
- **CRITICAL: Secrets boundary rule** — Envato key, Resend key, Claude API key, R2 creds, Supabase service_role key exist ONLY here. Never in SPA bundles.
- Typed client via `hono/client` RPC in `/packages/api-client`.
- JWT verification middleware on every request.

---

## Data decisions

### ADR-008 V2: Content in Supabase (not Git files)
- V1 was Content-as-Code (JSON + Markdown in Git). V2 moved to Supabase.
- Themes, docs, blog = Supabase tables with RLS.
- Portal SSG fetches from Supabase at build time.
- On-demand revalidation: Studio saves → Hono API → Portal `/api/revalidate` → `revalidatePath()`.
- custom_sections = jsonb column on themes table.
- Many-to-many via junction tables (themes ↔ plugins, features, badges).

### ADR-020 V2: Database schema (25+ tables, 6 domains)
MVP subset for now (4 tables): profiles, themes, licenses, audit_log.
Full schema adds: theme_features, theme_plugins, theme_categories, theme_badges, docs, blog_posts, support_tickets, ticket_messages, ai_conversations, subscriptions, etc.

### ADR-018: Supabase for dynamic data
- Postgres + Auth + RLS + Realtime + pgvector.
- SPAs connect directly via anon key. RLS filters by JWT.
- service_role key ONLY in Hono API.

---

## Auth & access decisions

### ADR-005 V2: Entitlement-based access
- NOT linear levels (Guest → Registered → Licensed).
- Facts about user (account exists, licenses[], elements_subscriber, subscription) → resolvers → entitlements.
- Example: has license on theme X → access docs X, auto-update X, support X.
- For MVP: simplified to role field on profiles (`registered`, `licensed`, `admin`, `content_manager`).
- Entitlement resolver architecture prepared but not fully implemented yet.

### ADR-022 (auth section): Supabase Auth PKCE
- Magic link login (passwordless).
- Per-app sessions — each SPA creates its own Supabase client.
- Route guard: `useRequireAuth(allowedRoles[])`.
- SSO between apps — deferred (per-app sessions sufficient).

---

## Design system decisions

### ADR-010 V2: Three-Layer model
```
Primitives  — shadcn/ui + tokens, zero CMSMasters knowledge
Domain      — CMSMasters-specific, maps to data models  
Layouts     — thin orchestration, no business logic
```

Located in `/packages/ui/`:
- `src/primitives/` — Button, Input, Badge, Card, Dialog, etc.
- `src/domain/` — ThemeCard, PluginCard, RatingStars, etc.
- `src/layouts/` — page shells, navigation patterns

### Token system
- Single file: `packages/ui/src/theme/tokens.css` (222 lines)
- Generated from Figma via MCP Plugin API (not REST — needs Enterprise)
- Two Figma sources: shadcn Obra (`PodaGqhhlgh6TLkcyAC5Oi`) + Portal DS (`CLtdO56o9fJCx19EnhH1nI`)
- HSL without wrapper: `228 54% 20%` (shadcn convention)
- shadcn vars (--primary, --border) power Primitives
- Brand vars (--brand-sky, --btn-primary-bg) power Domain components
- Command Center has its OWN tokens (dark zinc). Not affected by Portal DS.

### Design approach
- Build real pages first (homepage, theme page) → extract DS from them.
- NOT speculative component lists.
- DS is flexible — updates through tokens and classes, not a blocker.

---

## Business decisions (context only)

### ADR-003: All sales through ThemeForest (exclusive deal)
- Portal doesn't sell. "Buy" buttons → ThemeForest.
- Portal = discovery + activation + resources. ThemeForest = cash register.

### ADR-002: Elementor themes only
- 65+ Elementor themes on portal. Legacy (Content Composer) themes stay on ThemeForest.

### ADR-006 V2: Activation via theme setup wizard
- WordPress theme → setup wizard step → redirect to portal for verification.
- Return flow with signed token. Deferred for MVP Layer 0–3.

### ADR-021: Subscription prepared architecturally
- subscription_tier field ready in schema. Stripe/Paddle = Epic 2 (post-launch).

---

## Block animation & interaction (ADR-023, ADR-024)

### ADR-023: Block Animation Architecture
- **3-layer hybrid:** CSS scroll-driven animations (entrance, 0 JS) + shared micro-utilities (1.5KB) + per-block inline scripts (150-500B each)
- Entrance: `animation-timeline: view()` in pure CSS. Each block has unique `@keyframes` in scoped CSS.
- Behavioral (hover parallax, magnetic buttons): tiny vanilla JS via shared `/assets/animate-utils.js`
- Per-block `<script type="module">` for bespoke interactions. Self-contained, lazy.
- Only animate `transform` and `opacity` (compositor-safe). No GSAP, no Lenis, no AOS.
- `blocks` table gets `js` column for animation/behavioral scripts.
- Total JS budget: ~5KB per page. Lighthouse 95+.

### ADR-024: Block Interactive Components and States
- **4 tiers:** (1) CSS + native HTML (80%), (2) CSS + inline vanilla JS (15%), (3) Astro islands (5%), (4) Web Components (future)
- Buttons: `<button class="cms-btn cms-btn--primary">` with `:hover`, `:active`, `:focus-visible`, `:disabled` via tokens. Never `<div>` for interactive elements.
- Accordions: `<details name="group">` (native, accessible, 0 JS)
- Tabs: inline `<script>` ~400B with ARIA roles
- Shared `portal-blocks.css` (~3KB) ships with every page — full button system using design tokens
- Block authoring rule: semantic HTML mandatory (button, a, details). Claude Code enforces.

---

## Global Elements V2 (WP-008)

### Block categories + defaults + layout overrides
- Blocks have `category` field: `header`, `footer`, `sidebar`, or empty (content block)
- `is_default` flag: one default per category, auto-fills all matching slots
- Layout pages have `layout_slots` jsonb: `{ "header": "block-uuid" }` for per-layout override
- **Resolution cascade:** layout_slots[slot] > category default (is_default=true) > null
- `global_elements` table deprecated — replaced by category + default + layout_slots
- Studio: category dropdown in block editor, Global Elements page groups blocks by category
- Block picker modal filters out categorized blocks (only content blocks shown)

---

## What NOT to build (scope protection)

1. Direct sales (ThemeForest exclusive)
2. Billing/subscription (Epic 2)
3. Legacy themes
4. Mobile app (responsive web)
5. SSO between apps (per-app sessions sufficient)
6. Speculative design system (extract from real designs only)
7. API routes in Portal (all API in Hono on Workers)
