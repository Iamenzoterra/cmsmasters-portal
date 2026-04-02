# WP-003: Layer 1 — Content Studio

> First client app on the stack. Content Manager creates and publishes WordPress themes to the portal.

**Status:** PLANNING
**Priority:** P0 — Critical path
**Prerequisites:** WP-002 ✅ (Layer 0 Infrastructure)
**Milestone/Wave:** MVP Slice — Layer 1
**Estimated effort:** 16–22 hours across 7 phases
**Created:** 2026-03-29
**Completed:** —

---

## Problem Statement

Layer 0 delivered shared infrastructure — database, auth, API, packages. But there's no way for a human to put content into the system. There's no UI. The themes table is empty except for a seed record.

Content Studio is the first app that closes the loop: a person opens a browser, logs in, fills a form, clicks Save — and a theme record exists in Supabase that Portal can later render publicly. Without Studio, the entire pipeline has no input.

This is an internal tool, not a public product. One or two content managers use it daily. Priority is functional correctness and speed-to-build, not visual polish. Design comes from Figma (design spec written, Figma frames in progress), but the app must work functionally before pixel-perfect UI is applied.

---

## Solution Overview

### Architecture

```
┌─────────────────────────────────────────────────┐
│                Content Studio                    │
│            Vite + React Router SPA               │
│                                                  │
│  /login         → magic link (Supabase Auth)     │
│  /              → themes list (grid + table)     │
│  /themes/:slug  → theme editor form              │
│  /themes/new    → create new theme               │
│  /media         → image upload + gallery (MVP)   │
│                                                  │
├─────────────────────────────────────────────────┤
│  @cmsmasters/auth      → login, session, guard   │
│  @cmsmasters/db        → Supabase client, queries│
│  @cmsmasters/validators→ themeSchema (Zod v4)    │
│  @cmsmasters/api-client→ POST /api/revalidate    │
│  @cmsmasters/ui        → primitives (shadcn)     │
├─────────────────────────────────────────────────┤
│        Supabase (direct, anon key + RLS)         │
│  profiles: auth user    themes: CRUD             │
│  audit_log: actions     licenses: read-only      │
├─────────────────────────────────────────────────┤
│        Hono API (via api-client)                 │
│  POST /api/content/revalidate (after publish)    │
│  POST /api/upload (R2 signed URL — stub)         │
└─────────────────────────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Framework | Vite + React Router | ADR-007 V2: internal SPA, no SSR needed | Next.js (overhead without value for internal tool) |
| Form library | react-hook-form + Zod resolver | Industry standard, works with @cmsmasters/validators | Formik (heavier, less TS-native) |
| State management | React state + react-hook-form | App is CRUD — no complex state needed | Zustand, Redux (premature) |
| UI before Figma | Functional-first with shadcn defaults | Unblocks Layer 2/3; Figma polish applied later | Wait for Figma (blocks everything) |
| Repeater fields | react-hook-form `useFieldArray` | Native support, handles add/remove/reorder | Custom state management (fragile) |
| Media upload | Stub in MVP (URL text input) | R2 upload via Hono needs wrangler secrets configured | Full drag-and-drop upload (Studio V2) |
| Routing | React Router v7 | Lightweight, widely adopted, matches ADR split-stack | TanStack Router (possible upgrade later) |

---

## What This Changes

### New Files

```
apps/studio/
├── index.html                     — Vite entry HTML
├── package.json                   — deps: react, react-router-dom, react-hook-form, @hookform/resolvers
├── project.json                   — Nx targets: dev (port 5173), build, lint
├── tsconfig.json                  — Vite + React config
├── vite.config.ts                 — Vite config with @cmsmasters/* resolution
├── .env.example                   — VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
├── src/
│   ├── main.tsx                   — React root + BrowserRouter
│   ├── app.tsx                    — Route definitions + auth provider
│   ├── lib/
│   │   ├── supabase.ts            — createBrowserClient() instance
│   │   └── api.ts                 — createApiClient() instance
│   ├── layouts/
│   │   ├── auth-layout.tsx        — centered layout for /login
│   │   └── app-layout.tsx         — sidebar + topbar + content area
│   ├── components/
│   │   ├── sidebar.tsx            — navigation sidebar
│   │   ├── topbar.tsx             — top bar with user avatar + dropdown
│   │   ├── theme-card.tsx         — grid card for themes list
│   │   ├── theme-table.tsx        — table row for themes list
│   │   ├── status-badge.tsx       — draft/published/archived badge
│   │   ├── repeater-field.tsx     — add/remove/reorder list field
│   │   ├── image-upload.tsx       — upload zone (stub: URL input for MVP)
│   │   └── seo-preview.tsx        — Google result preview
│   ├── pages/
│   │   ├── login.tsx              — magic link login form
│   │   ├── auth-callback.tsx      — PKCE callback handler
│   │   ├── themes-list.tsx        — / (grid + table + search + filters)
│   │   ├── theme-editor.tsx       — /themes/:slug and /themes/new
│   │   └── media.tsx              — /media (MVP stub)
│   └── styles/
│       └── globals.css            — Tailwind + token imports
```

### Modified Files

```
.context/BRIEF.md         — Layer 1 status update
.context/ROADMAP.md        — Layer 1 status update
nx.json                    — if any workspace-level config needed
```

### Database Changes

```sql
-- No schema changes. Studio uses the existing themes, profiles, audit_log tables from Layer 0.
-- Content Manager must have role = 'content_manager' or 'admin' in profiles table.
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Understand actual state of apps/ and packages/ui before scaffolding.

**Tasks:**

0.1. **Audit apps/studio** — confirm it doesn't exist (Phase 0 RECON said only api + command-center)
0.2. **Audit packages/ui** — what primitives exist? Button only, or more? What's the import pattern?
0.3. **Check Vite in monorepo** — are there existing Vite configs to reference? How does CC's Next.js config handle @cmsmasters/* imports?
0.4. **Check react-router-dom availability** — installed? Version?
0.5. **Check react-hook-form, @hookform/resolvers** — installed? Available?
0.6. **Check Tailwind config** — is there a shared config in packages/ui? How does CC use Tailwind?
0.7. **Read packages/ui exports** — what's available from @cmsmasters/ui right now?

**Verification:** RECON report — no code written.

---

### Phase 1: Vite SPA Scaffold + Auth (3–4h)

**Goal:** `apps/studio` exists as a working Vite SPA with routing, auth (login + guard), and app shell layout. `npx nx dev @cmsmasters/studio` opens the app on localhost:5173.

**Tasks:**

1.1. **Vite project setup** — package.json, vite.config.ts, tsconfig.json, index.html, Nx project.json with dev/build targets

1.2. **Dependencies** — react, react-dom, react-router-dom, @cmsmasters/auth, @cmsmasters/db, @cmsmasters/ui, tailwindcss

1.3. **Tailwind + tokens** — globals.css imports tokens.css from @cmsmasters/ui, Tailwind configured to use token CSS variables

1.4. **Supabase client singleton** — `lib/supabase.ts` calls createBrowserClient()

1.5. **Route definitions** — app.tsx with routes:
- `/login` → LoginPage (public)
- `/auth/callback` → AuthCallback (PKCE handler)
- `/` → ThemesList (protected: content_manager, admin)
- `/themes/new` → ThemeEditor (protected)
- `/themes/:slug` → ThemeEditor (protected)
- `/media` → MediaPage (protected)

1.6. **Auth flow** — login page with email input + "Send Magic Link" button, callback handler, RequireAuth guard wrapping protected routes

1.7. **App shell layout** — sidebar (Themes, Media links) + top bar (logo, user avatar + dropdown with logout). Functional, not pixel-perfect — uses shadcn primitives where available, plain Tailwind otherwise.

1.8. **Placeholder pages** — each route renders a placeholder heading so navigation works

**Verification:**
- `npx nx dev @cmsmasters/studio` starts on localhost:5173
- `/login` shows email input + button
- Without session → any route redirects to /login
- After login → sidebar + topbar visible, placeholder content renders
- Logout works

---

### Phase 2: Themes List Page (2–3h)

**Goal:** `/` shows all themes from Supabase with grid view, search, status filter, and links to editor.

**Tasks:**

2.1. **Data fetching** — on mount, fetch themes from Supabase via `@cmsmasters/db` queries. Show loading skeleton.

2.2. **Grid view** — responsive card grid (3-4 columns). Theme card shows: thumbnail (or placeholder), name, category tag, status badge, price, "Updated X ago".

2.3. **Table view** — toggleable table with columns: thumbnail (small), name, category, status, price, updated. Row click → `/themes/{slug}`.

2.4. **Search** — text input filters themes by name (client-side for MVP, debounced).

2.5. **Status filter** — dropdown: All / Draft / Published / Archived.

2.6. **"Create Theme" button** — navigates to `/themes/new`.

2.7. **Empty state** — when no themes exist: illustration placeholder + "No themes yet" + "Create Theme" CTA.

2.8. **Pagination** — "Showing X-Y of Z" + Previous/Next (client-side for MVP; 65 themes fits in memory).

**Verification:**
- Page loads and shows seed theme (Flavor) from Supabase
- Search filters by name
- Status filter works
- "Create Theme" navigates to editor
- Grid ↔ Table toggle works

---

### Phase 3: Theme Editor — Form Structure (3–4h)

**Goal:** `/themes/:slug` and `/themes/new` render the full theme editor form with all field sections, powered by react-hook-form + Zod validation.

**Tasks:**

3.1. **Form setup** — react-hook-form with zodResolver(@cmsmasters/validators themeSchema). Initializes empty for `/themes/new`, fetches and populates for `/themes/:slug`.

3.2. **Layout** — two-column: form (left ~65-70%) + side panel (right ~30-35%) + sticky footer.

3.3. **Basic Info section** — Name (required), Slug (auto-generated from name, editable), Tagline (max 500 chars with counter), Description (textarea).

3.4. **Links section** — Demo URL, ThemeForest URL, ThemeForest ID (text inputs with URL validation).

3.5. **Media section** — Thumbnail URL (text input for MVP — full upload in Studio V2), Preview Images (repeater of URL strings).

3.6. **Features section (repeater)** — useFieldArray for `[{icon, title, description}]`. Add/remove buttons. Each item = row of 3 inputs.

3.7. **Plugins section (repeater)** — useFieldArray for `[{name, slug, value, icon_url}]`. Add/remove buttons.

3.8. **Custom Sections** — JSON textarea for MVP (structured UI deferred). Textarea with basic JSON validation.

3.9. **SEO section** — seo_title (input, max 70, live char counter), seo_description (textarea, max 160, live char counter).

3.10. **Side panel** — Status toggle (Draft/Published), Category select, Price input, Slug display, Meta info (created/updated dates, author).

3.11. **Validation display** — inline errors under fields, red border on invalid inputs, scroll to first error on Save.

**Verification:**
- New theme form renders all sections
- Existing theme loads data into form
- Validation: empty name shows error, bad URL shows error, max chars shows error
- Repeater: add/remove features works
- Repeater: add/remove plugins works
- Tab through all fields — no broken inputs

---

### Phase 4: Save, Publish, Delete (2–3h)

**Goal:** Content Manager can save drafts, publish themes, and delete themes. Data persists in Supabase.

**Tasks:**

4.1. **Save Draft** — form submit → Supabase upsert (via @cmsmasters/db). On success → toast "Theme saved". On error → toast with error message.

4.2. **Publish** — sets status to 'published' + saves → Supabase upsert → then calls `POST /api/content/revalidate` via @cmsmasters/api-client. Toast "Theme published".

4.3. **Create new theme** — `/themes/new` → Save creates record → redirects to `/themes/{slug}`.

4.4. **Slug generation** — auto-generate from name on first edit (kebab-case). Once saved, slug is locked (displayed read-only).

4.5. **Unsaved changes** — track form dirty state. Show indicator in footer ("Unsaved changes"). Browser beforeunload warning.

4.6. **Delete** — confirmation dialog → Supabase delete → redirect to themes list. Toast "Theme deleted".

4.7. **Audit logging** — on save/publish/delete → logAction() via @cmsmasters/db (actor, action, target).

4.8. **Sticky footer** — "Discard Changes" (resets form), "Save Draft" / "Save", "Publish" buttons. Disable buttons during save (loading state).

**Verification:**
- Create new theme → visible in Supabase themes table
- Edit theme → changes persist after page reload
- Publish → status changes to 'published' in DB
- Delete → theme removed from DB and list
- Audit log has entries for save/publish/delete actions
- Unsaved changes warning fires on navigation

---

### Phase 5: Media Page Stub + Polish (1.5–2h)

**Goal:** `/media` page exists as functional stub. Overall app polish: error boundaries, loading states, 404 handling.

**Tasks:**

5.1. **Media page** — placeholder grid layout. For MVP: informational message "Media upload via R2 coming soon. For now, enter image URLs directly in the theme editor." With link back to themes.

5.2. **Error boundaries** — React error boundary wrapping routes, shows friendly error message + "Go back" link.

5.3. **404 page** — unknown routes show "Page not found".

5.4. **Theme not found** — `/themes/nonexistent` shows "Theme not found" with link back to list.

5.5. **Loading states** — skeleton screens for themes list and editor while data loads.

5.6. **Toast system** — global toast provider (using shadcn Toast if available, or simple implementation). Used by save/publish/delete flows.

**Verification:**
- `/media` renders without error
- `/nonexistent-route` shows 404
- `/themes/nonexistent-slug` shows "Theme not found"
- Network error during save shows error toast
- Loading skeletons appear during data fetch

---

### Phase 6: Integration Verify (1–1.5h)

**Goal:** End-to-end flow works: login → create theme → fill form → save → publish → verify in Supabase → see in themes list.

**Tasks:**

6.1. **Full flow test:**
1. Open studio on localhost:5173
2. Login with magic link (or existing session)
3. Click "Create Theme"
4. Fill: name, slug, tagline, category, price, 2 features, 1 plugin, SEO fields
5. Save as Draft → verify in Supabase (status = draft)
6. Edit → Publish → verify in Supabase (status = published)
7. Go back to list → theme visible with "Published" badge
8. Delete theme → confirm → gone from list and DB

6.2. **Cross-package integration** — verify all 5 shared packages work in Studio:
- @cmsmasters/db — Supabase queries
- @cmsmasters/auth — login, session, guard
- @cmsmasters/validators — form validation
- @cmsmasters/api-client — revalidate call
- @cmsmasters/ui — any used primitives

6.3. **TypeScript check** — `npx tsc --noEmit -p apps/studio/tsconfig.json`

6.4. **Build check** — `npx nx build @cmsmasters/studio` completes without errors

**Verification:**
- Full CRUD cycle works end-to-end
- Supabase has correct data after each operation
- tsc passes
- Build succeeds

---

### Phase 7: Documentation Update (1h)

**Goal:** All docs reflect what was actually built.

**Tasks:**

7.1. **CC reads all phase logs** — understands what was done, what deviated from plan
7.2. **CC proposes doc updates** — list of files to update with proposed changes
7.3. **Brain approves** — reviews proposed changes
7.4. **CC executes doc updates** — updates canonical `.context/` files
7.5. **Link source logs** — add `Source Logs` section in touched core docs
7.6. **Update WP status** — mark WP-003 as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — Layer 1 ✅, current task → Layer 2
- `.context/ROADMAP.md` — Layer 1 ✅
- `.context/CONVENTIONS.md` — new patterns from Studio (Vite config, RHF patterns, etc.)
- `workplan/WP-003-layer-1-studio.md` — status → ✅ DONE
- `logs/wp-003/phase-*-result.md` — must all exist

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Figma designs not ready yet | UI looks rough / inconsistent | Build functional-first with shadcn defaults + tokens. Figma polish pass is separate WP after designs exist |
| Vite + monorepo workspace resolution issues | @cmsmasters/* imports fail | Phase 0 RECON checks existing patterns (CC app). Vite config may need resolve aliases |
| Supabase RLS blocks content_manager writes | Theme save fails silently | Phase 1 RECON verifies RLS allows content_manager INSERT/UPDATE on themes |
| react-hook-form + Zod v4 compatibility | Form validation broken | Check @hookform/resolvers supports zod v4. If not — use custom resolver wrapper |
| Tailwind + tokens.css integration in Vite | Styles don't apply | Follow whatever pattern packages/ui already uses. Phase 0 audits this |
| Media upload (R2) not configured | Can't upload images | MVP uses URL text inputs instead. Full upload deferred to Studio V2 |
| Large forms cause performance issues | Sluggish editor UX | 65 themes × form with repeaters is small. Not a real risk at MVP scale |

---

## Acceptance Criteria (Definition of Done)

- [ ] `apps/studio/` exists as Vite SPA, starts on localhost:5173
- [ ] Login: magic link flow works (send → click → session → protected routes)
- [ ] Route guard: unauthenticated → /login redirect, wrong role → /login redirect
- [ ] Themes list: shows themes from Supabase, grid/table toggle, search, status filter
- [ ] Theme editor: all field sections render (basic, links, media, features, plugins, custom, SEO)
- [ ] Validation: Zod schema validates on Save, inline errors shown
- [ ] Save: creates/updates theme in Supabase
- [ ] Publish: sets status = published + calls revalidate endpoint
- [ ] Delete: removes theme from Supabase with confirmation dialog
- [ ] Audit: save/publish/delete actions logged in audit_log table
- [ ] Unsaved changes: warning on navigation away from dirty form
- [ ] Error handling: 404, theme not found, save errors → user-visible feedback
- [ ] TypeScript: `tsc --noEmit` passes
- [ ] Build: `nx build @cmsmasters/studio` succeeds
- [ ] All phases logged in `logs/wp-003/`
- [ ] `.context/` docs updated (Phase 7)
- [ ] No known blockers for Layer 2 (Portal theme page)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-002 Layer 0 (all shared packages) | ✅ DONE | Everything — Studio imports all 5 packages |
| Supabase project (live, with schema deployed) | ⬜ Dmitry | Theme CRUD needs live database |
| Figma designs (STUDIO-MVP-DESIGN-SPEC.md) | ⬜ In Progress | Pixel-perfect UI. Does NOT block functional build |
| Content Manager user with role in Supabase | ⬜ Dmitry | Need at least 1 user with content_manager role for testing |

---

## Notes

- **Functional-first, Figma-polish-later:** Studio is built with shadcn defaults and token CSS variables. When Figma designs are ready, a separate polish pass (WP-004 or similar) applies pixel-perfect styles. This approach unblocks Layers 2–3 which depend on Studio to create themes.
- **Design spec:** `workplan/STUDIO-MVP-DESIGN-SPEC.md` — comprehensive 23KB spec for the Figma designer. Covers all 6 pages, all token mappings, all component specs, UX patterns.
- **ADR references:** ADR-007 V2 (Vite SPA), ADR-010 V2 (three-layer DS), ADR-011 V3 (content_manager role), ADR-014 V2 (database-backed publishing), ADR-022 (Hono API for revalidation).
- **Media upload is a stub.** R2 signed URLs require wrangler secrets and Cloudflare R2 bucket setup. MVP uses plain text URL inputs. Content Manager pastes image URLs directly. Full upload UX is Studio V2.
- **Custom Sections editor is minimal.** MVP provides a JSON textarea. Structured UI for each section type (before-after, video-demo, testimonial) is Studio V2.
- **Supabase migration from Layer 0 must be deployed** before Studio can work. Dmitry runs the SQL via dashboard or `supabase db push`.
- **Phase prompts written one at a time** — per CC Workflow protocol. Brain writes Phase 0 RECON prompt first, reviews log, then writes Phase 1 prompt, etc.
