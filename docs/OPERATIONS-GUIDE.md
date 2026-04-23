# CMSMasters Portal — Operations Guide

> How everything works, starts up, and gets updated.
> Last verified: 9 April 2026

---

## 1. Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
├──────────┬───────────┬───────────┬──────────┬──────────────────┤
│ Portal   │ Dashboard │ Admin     │ Studio   │ Command Center   │
│ Next.js  │ Vite SPA  │ Vite SPA  │ Vite SPA │ Next.js          │
│ :3100    │ :5174     │ :5175     │ :5173    │ :4000            │
│ public   │ any auth  │ admin     │ staff    │ internal         │
│ Vercel   │ CF Pages  │ CF Pages  │ CF Pages │ localhost only   │
├──────────┴───────────┴───────────┴──────────┴──────────────────┤
│  @cmsmasters/auth   @cmsmasters/db   @cmsmasters/validators    │
│  @cmsmasters/ui     @cmsmasters/api-client                     │
├──────────────────────────────────┬──────────────────────────────┤
│  Supabase (anon key + RLS)      │  Hono API (:8787)            │
│  Direct reads/writes             │  CF Workers                  │
│  90% of operations               │  Envato, R2, revalidation   │
│                                  │  admin endpoints, secrets    │
└──────────────────────────────────┴──────────────────────────────┘
```

---

## 2. Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ | `node -v` |
| npm | 10+ | `npm -v` |
| Git | any | `git -v` |
| Wrangler | latest | `npx wrangler --version` (for API dev) |

No global installs needed. Everything runs via npx or workspace scripts.

---

## 3. First-Time Setup

```bash
# Clone
git clone https://github.com/Iamenzoterra/cmsmasters-portal.git
cd cmsmasters-portal

# Install all workspaces
npm install

# Verify
npm run arch-test        # 370+ tests should pass
```

### Environment files

**Root `.env`** (already in repo, safe — only public keys):
```
VITE_SUPABASE_URL=https://yxcqtwuyktbjxstahfqj.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=https://cmsmasters-api.office-4fa.workers.dev
```

**`apps/api/.dev.vars`** (gitignored — create manually for local API dev):
```
SUPABASE_URL=https://yxcqtwuyktbjxstahfqj.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role_key...
R2_PUBLIC_URL=https://pub-c82d3ffae6954db48f40feef14b8e2e0.r2.dev
ENVATO_PERSONAL_TOKEN=bHC6...your_token...
```

---

## 4. Starting Each App

### Quick start (all apps at once)
```bash
npm run dev
```
This uses Nx to start all apps in parallel. But usually you run only what you need.

### Individual apps

| App | Command | URL | Auth |
|-----|---------|-----|------|
| **Studio** | `cd apps/studio && npm run dev` | http://localhost:5173 | content_manager or admin |
| **Dashboard** | `cd apps/dashboard && npm run dev` | http://localhost:5174 | any authenticated user |
| **Admin** | `cd apps/admin && npm run dev` | http://localhost:5175 | admin only |
| **Portal** | `cd apps/portal && npm run dev` | http://localhost:3100 | public (no auth) |
| **Command Center** | `cd apps/command-center && npm run dev` | http://localhost:4000 | internal (no auth) |
| **Hono API** | `cd apps/api && npx wrangler dev --port 8787` | http://localhost:8787 | JWT bearer token |

### What depends on what

```
Studio, Dashboard, Admin → need Supabase (always online)
Dashboard, Admin → need API running for /admin/* and /licenses/* endpoints
Portal → needs Supabase for SSG build; API for revalidation
Command Center → standalone, reads filesystem only
```

**Minimal dev setup:**
- Working on Studio? Just start Studio. It talks directly to Supabase.
- Working on Dashboard? Start Dashboard + API (for license verify and admin endpoints).
- Working on Portal? Just start Portal. It reads Supabase at build time.

---

## 5. Building for Production

```bash
# Build everything
npm run build

# Build individual apps
cd apps/studio && npm run build       # → dist/
cd apps/dashboard && npm run build    # → dist/
cd apps/admin && npm run build        # → dist/
cd apps/portal && npm run build       # → .next/
cd apps/api && npx wrangler deploy    # → Cloudflare Workers
```

### Deploy targets

| App | Platform | How |
|-----|----------|-----|
| Portal | Vercel | Push to main → auto-deploy (configured) |
| Studio, Dashboard, Admin | CF Pages | `npx wrangler pages deploy dist/` |
| API | CF Workers | `cd apps/api && npx wrangler deploy` |
| Command Center | localhost only | Never deployed |

---

## 6. Database (Supabase)

### Access

- **Dashboard:** https://supabase.com/dashboard/project/yxcqtwuyktbjxstahfqj
- **Project ID:** `yxcqtwuyktbjxstahfqj`

### Tables (20 after WP-017)

| Domain | Tables |
|--------|--------|
| Identity | profiles, staff_roles |
| Content | themes, blocks, templates, pages, page_blocks, global_elements, block_categories |
| Taxonomy | categories, tags, use_cases, prices + junction tables (theme_categories, theme_tags, theme_use_cases, theme_prices) |
| Licensing | licenses |
| Analytics | activity_log, audit_log |

### Migrations

Located in `supabase/migrations/` (14 files, 001–014). Applied via Supabase Dashboard SQL Editor (copy-paste) or Supabase CLI.

```bash
# List migrations
ls supabase/migrations/

# Apply new migration via CLI (if configured)
supabase db push

# Or paste SQL in Dashboard → SQL Editor → Run
```

### Key RLS pattern

- **anon** can read published themes, blocks, templates (public content)
- **authenticated** can read own profile, own licenses, own activity
- **admin** (via staff_roles or get_user_role()) can read all profiles, licenses, audit
- **Staff write** goes through Hono API with service_role key (bypasses RLS)

### The `get_user_role()` function

Single source of truth for role resolution. Checks `staff_roles` first, falls back to `profiles.role`. Called by 9+ RLS policies. `SECURITY DEFINER` — bypasses RLS itself, no recursion.

---

## 7. Auth System

### How login works

1. User enters email on login page
2. `signInWithMagicLink(supabase, email)` → Supabase sends magic link email
3. User clicks link → redirected to `/auth/callback`
4. `handleAuthCallback(supabase)` exchanges code for session (PKCE flow)
5. Session stored in browser (Supabase manages JWT automatically)

### Role resolution (client-side)

```
useUser(supabase)
  → supabase.auth.getSession()             // get JWT
  → supabase.from('profiles').select('*')   // get profile
  → supabase.rpc('get_user_role')           // get resolved role (staff_roles → profiles.role)
  → AuthState { status, userId, email, role }
```

### Role resolution (API-side)

```
authMiddleware → extracts JWT, verifies via supabase.auth.getUser()
requireRole('admin') → queries staff_roles, falls back to profiles.role
```

### Role hierarchy

| Role | Can access |
|------|-----------|
| registered | Dashboard (empty state) |
| licensed | Dashboard (with themes) |
| content_manager | Dashboard + Studio |
| admin | Dashboard + Studio + Admin |
| support_operator | Dashboard + Support (future) |

### Entitlements (computed, not stored)

```typescript
computeEntitlements(hasAccount, licenses, staffRoles, isElementsSubscriber)
→ { canAccessDashboard, canAccessStudio, canAccessAdmin, licensedThemes, activeSupport, ... }
```

Resolvers in `packages/auth/src/resolvers.ts`. Each source (base, license, staff, elements) is independent. Results merged.

---

## 8. Hono API

### Running locally

```bash
cd apps/api
npx wrangler dev --port 8787
```

Requires `.dev.vars` with secrets (see section 3).

### Endpoint groups

| Group | Path | Auth | Description |
|-------|------|------|-------------|
| Health | GET /api/health | none | Always returns 200 |
| Blocks | /api/blocks/* | staff | CRUD for HTML+CSS blocks |
| Templates | /api/templates/* | staff | CRUD for position grids |
| Pages | /api/pages/* | staff | CRUD for pages + page_blocks |
| Global Elements | /api/global-elements/* | staff | Scope-bound header/footer/sidebars |
| Upload | POST /api/upload | staff | R2 file upload (signed URL) |
| Revalidate | POST /api/revalidate | secret | Portal ISR trigger |
| Icons | /api/icons/* | staff | Icon management |
| Licenses | /api/licenses/* | user | Verify purchase code, list licenses |
| User | /api/user/* | user | Profile CRUD, entitlements |
| Admin | /api/admin/* | admin | Stats, users, staff roles, audit, health |

### Secrets boundary

These NEVER leave the API:
- `SUPABASE_SERVICE_KEY` — service_role, bypasses RLS
- `ENVATO_PERSONAL_TOKEN` — purchase code verification
- `PORTAL_REVALIDATE_SECRET` — ISR trigger auth
- R2 bucket binding — direct file access

---

## 9. Packages

| Package | Purpose | Key exports |
|---------|---------|-------------|
| `@cmsmasters/db` | Supabase types + queries | All table types, query functions, SupabaseClient |
| `@cmsmasters/auth` | Auth hooks + guards + resolvers | useUser, useRole, RequireAuth, signInWithMagicLink, signOut, computeEntitlements |
| `@cmsmasters/validators` | Zod schemas | theme, block, template, page validators |
| `@cmsmasters/ui` | Design tokens + primitives | tokens.css, Button, portal-blocks.css, animate-utils.js |
| `@cmsmasters/api-client` | Hono RPC typed client | AppType |
| `@cmsmasters/email` | (empty) | Not implemented |

### Dependency chain (no cycles)

```
validators (zod) → db (supabase) → auth (supabase, react)
ui — standalone
api-client — standalone
```

---

## 10. Design Tokens

Source of truth: `packages/ui/src/theme/tokens.css` (222 lines).

Generated from two Figma files via MCP:
- `PodaGqhhlgh6TLkcyAC5Oi` — shadcn Obra base (semantic colors, radii, spacing)
- `CLtdO56o9fJCx19EnhH1nI` — CMSMasters brand (primitives + domain semantics)

### Re-syncing tokens from Figma

Ask Claude Code: "sync tokens from Figma". It will:
1. `Figma:use_figma` on both files → extract variables
2. Resolve aliases → HSL values
3. Write `packages/ui/src/theme/tokens.css`

See `FIGMA_SYNC_INSTRUCTIONS.md` for the full protocol.

---

## 11. Portal (SSG + ISR)

### How theme pages work

1. `generateStaticParams()` → queries all published themes from Supabase
2. For each theme → resolves template (position grid) + block fills
3. Each block's HTML is rendered with hook substitution ({{price}}, {{link:*}}, {{perfect_for}})
4. Global elements (header/footer/sidebars) resolved by scope + priority
5. Static HTML generated at build time → deployed to Vercel CDN

### On-demand revalidation

```
Studio publish → Hono API POST /api/revalidate → Portal /api/revalidate → revalidatePath('/themes/[slug]')
```

Under 1 second from publish to updated page.

### SEO

Every theme page has: JSON-LD Product schema, Open Graph tags, Twitter cards, canonical URL, sitemap.xml, robots.txt.

### Image optimization (R2 + Cloudflare Transformations)

Block images live in Cloudflare R2 bucket `cmsmasters-assets`, served via custom
domain **`assets.cmsmasters.studio`**. On render, portal rewrites every block
`<img>` through the Cloudflare Image Transformations endpoint:

```
https://assets.cmsmasters.studio/cdn-cgi/image/format=auto,quality=85,width=800/blocks/<hash>.png
```

`format=auto` content-negotiates WebP/AVIF based on `Accept` header — typical
savings 30–50 % vs original PNG/JPEG.

**Where:** `apps/portal/lib/optimize-images.ts` exports `rewriteImages(html)`,
`buildImageUrl(path, opts)`, `buildImageSrcSet(path, widths)`. The rewriter runs
inside `BlockRenderer` (`apps/portal/app/_components/block-renderer.tsx`) and
`renderBlock` (`apps/portal/lib/hooks.ts`), covering content pages and theme
pages respectively.

**Rewriter rules:**

- Recognises assets on legacy `pub-*.r2.dev` host, `assets.cmsmasters.studio`,
  and bare/relative paths (`/blocks/x.png`)
- Skips SVGs (format=auto would rasterise them)
- Skips tags that already declare `srcset` (author opted out)
- Sets default `src` at width=800 and generates `srcset` `[400, 800, 1200, 1600]w`
- Adds `loading="lazy"` and `decoding="async"` if missing (respects existing values)

**Dashboard config (Cloudflare):**

- R2 bucket `cmsmasters-assets` → Settings → Custom Domains → `assets.cmsmasters.studio` (Active/Enabled)
- Images → Transformations: enabled on zone `cmsmasters.studio`
- Sources → Specified origins → only `assets.cmsmasters.studio` (no apex, no wildcards)

**Disabling the legacy `r2.dev` URL:** the public-development URL
`pub-c82d3ffae6954db48f40feef14b8e2e0.r2.dev` can be disabled in R2 → Settings →
Public Development URL once `grep -r "pub-c82d3ffae" content/db apps` returns
no hits and no block still references it. Rewriter accepts both hosts, so
stored content can migrate on its own cadence.

**Revalidation after adding new images:** upload via Studio → `/upload` goes
through Hono (`apps/api/src/routes/upload.ts`), stored in R2 at
`blocks/<sha256 prefix>.<ext>`, returned as `https://assets.cmsmasters.studio/blocks/...`.
After content changes, run `/revalidate` to bust portal ISR cache.

---

## 12. Studio (Content Management)

### What Studio manages

| Entity | Page | Actions |
|--------|------|---------|
| Blocks | /blocks, /blocks/:id | Create, edit HTML+CSS+JS, import from clipboard, export, preview |
| Templates | /templates, /templates/:id | Create, edit position grid, assign blocks to positions |
| Themes | /themes, /themes/:id | Edit meta (name, price, URLs), assign template, fill block positions, manage categories/tags |
| Pages | /pages, /pages/:id | Layout or composed pages |
| Global Elements | /global-elements | Header/footer/sidebar assignments with scope + priority |
| Media | /media | (stub) |

### Block pipeline

```
Figma design → /block-craft skill → Export HTML+CSS
→ Studio Import (paste) → Process Panel (token scan, R2 upload, component detect)
→ Save to blocks table → Template assigns position → Portal renders
```

---

## 13. Quality Checks

### Architecture tests (mandatory before every commit)

```bash
npm run arch-test    # ~370 tests, ~500ms
```

Tests enforce: domain boundaries, file ownership, table access rules, skill parity.

### Type checking

```bash
# Individual apps
cd apps/studio && npx tsc --noEmit
cd apps/dashboard && npx tsc --noEmit
cd apps/admin && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
cd apps/portal && npx next build

# All packages
cd packages/db && npx tsc --noEmit
cd packages/auth && npx tsc --noEmit
```

### Quality script

```bash
npm run quality    # runs eslint + knip + jscpd + arch-test
```

### Dead code detection

```bash
npx knip           # unused files, deps, exports
```

---

## 14. Updating the System

### Adding a new Supabase table

1. Write migration SQL in `supabase/migrations/NNN_name.sql`
2. Apply via Supabase Dashboard SQL Editor (or `supabase db push`)
3. Add types to `packages/db/src/types.ts` (Row, Insert, Update in Database interface + convenience aliases)
4. Add queries to `packages/db/src/queries/new-entity.ts`
5. Export from `packages/db/src/index.ts`
6. Register in `src/__arch__/domain-manifest.ts` (owned_files + owned_tables)
7. `npm run arch-test` → verify

### Adding a new API endpoint

1. Create route file in `apps/api/src/routes/name.ts`
2. Apply auth + role middleware as needed
3. Mount in `apps/api/src/index.ts`: `app.route('/api', newRoute)`
4. Add to domain-manifest.ts
5. `cd apps/api && npx tsc --noEmit` → verify

### Adding a new page to an SPA

1. Create page file in `apps/{app}/src/pages/name.tsx` (with `export default`)
2. Add lazy import in `app.tsx`: `const Page = lazy(() => import('./pages/name'))`
3. Add `<Route>` in the routes tree
4. Add nav item in sidebar if needed
5. Build and verify

### Adding a new shared package

1. Create `packages/new-pkg/` with package.json, tsconfig.json, src/index.ts
2. Root workspaces glob `"packages/*"` auto-includes it
3. `npm install` at root
4. Import from apps: `"@cmsmasters/new-pkg": "*"` in package.json

### Updating design tokens

1. Say "sync tokens from Figma" to Claude Code
2. Or manually: `Figma:use_figma` → extract → write `packages/ui/src/theme/tokens.css`
3. All apps pick up new tokens automatically (tokens.css imported in each app's globals.css)

---

## 15. Workflow Protocol

### Brain ↔ Hands

```
Brain (Claude Desktop / planning)
  → RECON → WP strategy → Phase task prompt → write to disk
  → Review execution log → adapt → next phase

Hands (Claude Code / execution)
  → Execute one phase → verify (arch-test) → write execution log → commit
```

### File conventions

| Type | Location | Pattern |
|------|----------|---------|
| Workplan | `workplan/WP-NNN-name.md` | Strategy + phases |
| Phase task | `workplan/WP-NNN-phase-N-name.md` | CC execution prompt |
| Execution log | `logs/wp-NNN/phase-N-result.md` | Evidence of what was done |
| Context docs | `.context/*.md` | Project state, conventions |
| Domain skills | `.claude/skills/domains/*/SKILL.md` | Per-domain invariants |
| Agent prompts | `.claude/agents/*.md` | Design + UX agent personalities |

### Non-negotiables

- RECON before planning
- One phase at a time
- `npm run arch-test` before every commit
- Execution log after every phase
- Docs updated in final phase of every WP

---

## 16. Key Files Reference

| File | Purpose |
|------|---------|
| `.context/BRIEF.md` | **Read first.** Full project state. |
| `.context/ROADMAP.md` | What's next after current layer |
| `.context/CONVENTIONS.md` | Code patterns, naming, token usage |
| `CLAUDE.md` | Claude Code entry point |
| `src/__arch__/domain-manifest.ts` | Domain ownership, enforcement |
| `packages/ui/src/theme/tokens.css` | Design tokens (Figma source) |
| `apps/api/.dev.vars` | API secrets (gitignored) |
| `.env` | Public env vars (Supabase URL, anon key) |
| `workplan/PROGRESS-AUDIT-2026-04-08.md` | Full codebase audit |
| `workplan/LAYER-3-SCOPE.md` | Layer 3 decisions |

---

## 17. Troubleshooting

### "Module not found @cmsmasters/..."
```bash
npm install     # at root — reinstalls all workspaces
```

### "RLS policy violated" in Supabase
- Check you're using the right key (anon for public reads, service_role for admin)
- Verify `get_user_role()` returns expected value: `SELECT get_user_role()` in SQL Editor (returns NULL without auth context)

### Studio login loops
- Check Supabase Auth → URL Configuration → Site URL and Redirect URLs include `http://localhost:5173`
- Check browser console for auth errors

### API returns 401
- JWT expired — re-login in the SPA
- Check `Authorization: Bearer` header is being sent
- Check `.dev.vars` has correct `SUPABASE_SERVICE_KEY`

### Portal build fails
- Check Supabase is online (anon reads at build time)
- Check `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Arch tests fail after new files
- Add new files to `src/__arch__/domain-manifest.ts` → `owned_files` array
- New tables → add to `owned_tables`
- Run `npm run arch-test` to see which check fails
