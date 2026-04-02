# WP-005D Phase 1 Result — Studio Pages + Global Elements

**Date:** 2026-04-02
**Status:** COMPLETE

---

## What Was Built

### 1. Types (`packages/db/src/types.ts`)
- Added `PageType = 'layout' | 'composed'`
- Added `GlobalSlot = 'header' | 'footer' | 'sidebar-left' | 'sidebar-right'`
- Added `pages`, `page_blocks`, `global_elements` tables to `Database` type
- Added convenience aliases: `Page`, `PageInsert`, `PageUpdate`, `PageBlock`, `PageBlockInsert`, `GlobalElement`, `GlobalElementInsert`, `GlobalElementUpdate`
- Reused existing `ThemeSEO` for page SEO, `ThemeStatus` for page status
- All exported from `packages/db/src/index.ts`

### 2. Queries
- **`packages/db/src/queries/pages.ts`** — 8 functions: `getPages`, `getPageById`, `getPageBySlug`, `createPage`, `updatePage`, `deletePage`, `getPageBlocks`, `upsertPageBlocks`, `getPageBlockCount`
- **`packages/db/src/queries/global-elements.ts`** — 6 functions: `getGlobalElements`, `getGlobalElementsBySlot`, `createGlobalElement`, `updateGlobalElement`, `deleteGlobalElement`, `resolveGlobalElementsForPage`
- All exported from `packages/db/src/index.ts`

### 3. Validators (`packages/validators/src/page.ts`)
- `pageSchema` — slug, title, type (enum), seo (optional), status (default draft)
- `updatePageSchema` — all optional
- `pageBlockSchema` — block_id (uuid), position (int), config (optional)
- `globalElementSchema` — slot (4-value enum), block_id (uuid), scope, priority (0-100)
- `updateGlobalElementSchema` — all optional
- All exported from `packages/validators/src/index.ts`

### 4. API Routes
- **`apps/api/src/routes/pages.ts`** — 7 endpoints:
  - `GET /pages` — list all
  - `GET /pages/:id` — get by ID
  - `POST /pages` — create (CM/admin)
  - `PUT /pages/:id` — update (CM/admin)
  - `DELETE /pages/:id` — delete with dependency check (admin)
  - `GET /pages/:id/blocks` — get ordered blocks
  - `PUT /pages/:id/blocks` — replace all blocks (CM/admin)
- **`apps/api/src/routes/global-elements.ts`** — 5 endpoints:
  - `GET /global-elements` — list all with blocks
  - `GET /global-elements/resolve` — resolve slots by ?type=&slug=
  - `POST /global-elements` — create (CM/admin)
  - `PUT /global-elements/:id` — update (CM/admin)
  - `DELETE /global-elements/:id` — delete (admin)
- Both mounted in `apps/api/src/index.ts`
- CORS updated with `localhost:4321` for Astro

### 5. Studio API Clients
- **`apps/studio/src/lib/page-api.ts`** — fetchAllPages, fetchPageById, createPageApi, updatePageApi, deletePageApi, fetchPageBlocks, updatePageBlocks
- **`apps/studio/src/lib/global-element-api.ts`** — fetchAllGlobalElements, createGlobalElementApi, updateGlobalElementApi, deleteGlobalElementApi

### 6. Studio UI
- **Sidebar** — Added Pages (FileText icon) between Themes and Blocks, Global Elements (Globe icon) after Templates
- **`apps/studio/src/pages/pages-list.tsx`** — Table view with Title, Slug, Type badge, Status, Updated. Search + type filter. Pagination.
- **`apps/studio/src/pages/page-editor.tsx`** — Full editor with:
  - Both types: Title, Slug (auto-gen), Type select (readonly after save), Status
  - Layout type: info text about Global Elements
  - Composed type: block list (add/remove/reorder), per-block JSON config, SEO fields
  - Save Draft / Publish / Delete footer
- **`apps/studio/src/pages/global-elements-settings.tsx`** — Single page with 4 slot sections (header/footer/sidebar-left/sidebar-right). Each section has scope rows with block picker, scope select (presets + custom), priority, add/remove. Save All button.
- **Routes** added to `apps/studio/src/app.tsx`: `/pages`, `/pages/new`, `/pages/:id`, `/global-elements`

---

## Verification

| Check | Result |
|-------|--------|
| Type exports in packages/db/src/index.ts | 10 new types exported |
| New query files exist | pages.ts + global-elements.ts |
| Validator exports in packages/validators/src/index.ts | 5 schemas + 5 types |
| Route mounts in apps/api/src/index.ts | pages + globalElements |
| CORS 4321 in apps/api/src/index.ts | Added |
| Sidebar nav items | Pages + Global Elements added |
| Studio routes in apps/studio/src/app.tsx | 4 new routes |
| `npx tsc --noEmit` packages/db | 0 errors |
| `npx tsc --noEmit` packages/validators | 0 errors |
| `npx tsc --noEmit` apps/api | 0 errors |
| `npx tsc --noEmit` apps/studio | 0 errors |

---

## Files Changed/Created

| File | Action |
|------|--------|
| `packages/db/src/types.ts` | MODIFIED — added Page, PageBlock, GlobalElement types |
| `packages/db/src/index.ts` | MODIFIED — added exports |
| `packages/db/src/queries/pages.ts` | NEW |
| `packages/db/src/queries/global-elements.ts` | NEW |
| `packages/validators/src/page.ts` | NEW |
| `packages/validators/src/index.ts` | MODIFIED — added exports |
| `apps/api/src/routes/pages.ts` | NEW |
| `apps/api/src/routes/global-elements.ts` | NEW |
| `apps/api/src/index.ts` | MODIFIED — mounted routes + CORS |
| `apps/studio/src/lib/page-api.ts` | NEW |
| `apps/studio/src/lib/global-element-api.ts` | NEW |
| `apps/studio/src/components/sidebar.tsx` | MODIFIED — 2 nav items |
| `apps/studio/src/pages/pages-list.tsx` | NEW |
| `apps/studio/src/pages/page-editor.tsx` | NEW |
| `apps/studio/src/pages/global-elements-settings.tsx` | NEW |
| `apps/studio/src/app.tsx` | MODIFIED — 4 routes |

---

## Blockers Resolved
- CORS: `localhost:4321` added to API origins
- RLS: Not addressed in this phase (requires Supabase MCP access for policy creation)

## Known Limitations
- RLS policies for pages/page_blocks/global_elements tables need to be added via Supabase MCP
- Page editor `isDirty` tracking includes block entries even on initial load (cosmetic)
- Global Elements settings saves sequentially per-element (could be batched)
