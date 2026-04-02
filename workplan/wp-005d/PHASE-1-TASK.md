# WP-005D Phase 1: Studio Pages + Global Elements

> Workplan: WP-005D Portal — Pages, Global Elements, Astro SSG, Content Seed
> Phase: 1 of 5
> Priority: P0
> Estimated: 3–4 hours
> Type: Full-stack (API + Studio UI)
> Previous: Phase 0 ✅ (RECON — Astro in Nx verified, env vars confirmed)
> Next: Phase 2 (Astro Portal scaffold + theme page render — REQUIRES manual layout creation first)

---

## Context

WP-005B delivered blocks + templates tables and Hono CRUD API. WP-005C delivered Studio Blocks, Templates, and Theme Editor. DB migrations for `pages`, `page_blocks`, and `global_elements` tables already applied. Tables exist but are empty. No API routes, no Studio UI, no types/validators.

```
CURRENT:  blocks (1 row), templates (2 rows), themes (1 row)               ✅
          Hono API: /api/blocks, /api/templates CRUD                        ✅
          Studio: Blocks, Templates, Theme Editor pages                     ✅
          DB: pages (0), page_blocks (0), global_elements (0) — tables exist ✅
MISSING:  Types/validators for pages + global_elements                      ❌
          Hono API routes for pages + global_elements CRUD                  ❌
          Studio: Pages sidebar + list + editor                             ❌
          Studio: Global Elements settings page                             ❌
```

**Key architecture (from PORTAL-BLOCK-ARCHITECTURE.md):**
- `pages` has NO header/footer/sidebar columns — global_elements handles layout binding
- `themes` has NO page_id — scope matching in global_elements determines which layout applies
- Two page types: `layout` (wrapper for themes) and `composed` (assembled from blocks)
- Four slots: header, footer, sidebar-left, sidebar-right — each with scope + priority

**⚠️ This phase does NOT create layouts or seed blocks.** Layout creation is a manual process following `workplan/PAGE-CREATION-FLOW.md`.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm all 3 tables exist with correct structure
# Use Supabase MCP: execute_sql
# SELECT column_name FROM information_schema.columns WHERE table_name = 'pages' ORDER BY ordinal_position;
# Expect: id, slug, title, type, seo, status, created_by, created_at, updated_at (NO header_block_id, footer_block_id, sidebar_block_id)

# SELECT column_name FROM information_schema.columns WHERE table_name = 'page_blocks' ORDER BY ordinal_position;
# Expect: id, page_id, block_id, position, config, created_at

# SELECT column_name FROM information_schema.columns WHERE table_name = 'global_elements' ORDER BY ordinal_position;
# Expect: id, slot, block_id, scope, priority, created_by, created_at, updated_at

# 2. Confirm themes does NOT have page_id
# SELECT column_name FROM information_schema.columns WHERE table_name = 'themes' AND column_name = 'page_id';
# Expect: 0 rows

# 3. Check current API routes
ls apps/api/src/routes/
echo "(expect: blocks.ts, health.ts, revalidate.ts, templates.ts, upload.ts)"

# 4. Check Studio sidebar
grep "navItems" apps/studio/src/components/sidebar.tsx
echo "(expect: Themes, Blocks, Templates, Media)"

# 5. Check packages/db exports
grep -i "page\|global" packages/db/src/index.ts
echo "(expect: 0 matches)"

# 6. Reference: existing API route pattern
head -40 apps/api/src/routes/blocks.ts
head -40 apps/api/src/routes/templates.ts
```

**IMPORTANT:** Tables ALREADY exist in Supabase. Do NOT create them. Only add types, queries, API routes, validators, and Studio UI.

---

## Task 1.1: Types for Pages + Global Elements

### What to Build

Add to `packages/db/src/types.ts` following Block/Template pattern:

```typescript
// ── Page types ──
export type PageType = 'layout' | 'composed'

export interface Page {
  id: string
  slug: string
  title: string
  type: PageType
  seo: ThemeSEO | null
  status: ThemeStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type PageInsert = Omit<Page, 'id' | 'created_at' | 'updated_at'>
export type PageUpdate = Partial<Omit<Page, 'id' | 'created_at'>>

export interface PageBlock {
  id: string
  page_id: string
  block_id: string
  position: number
  config: Record<string, unknown>
  created_at: string
}

export type PageBlockInsert = Omit<PageBlock, 'id' | 'created_at'>

// ── Global Element types ──
export type GlobalSlot = 'header' | 'footer' | 'sidebar-left' | 'sidebar-right'

export interface GlobalElement {
  id: string
  slot: GlobalSlot
  block_id: string
  scope: string
  priority: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export type GlobalElementInsert = Omit<GlobalElement, 'id' | 'created_at' | 'updated_at'>
export type GlobalElementUpdate = Partial<Omit<GlobalElement, 'id' | 'created_at'>>
```

Also add `pages`, `page_blocks`, `global_elements` to Database type.

### Integration

Export all new types from `packages/db/src/index.ts`.

---

## Task 1.2: Queries for Pages, Page Blocks, Global Elements

### What to Build

**`packages/db/src/queries/pages.ts`:**
```typescript
export async function getPages(client) { ... }
export async function getPageById(client, id) { ... }
export async function getPageBySlug(client, slug) { ... }
export async function createPage(client, page: PageInsert) { ... }
export async function updatePage(client, id, page: PageUpdate) { ... }
export async function deletePage(client, id) { ... }  // dependency check: page_blocks

export async function getPageBlocks(client, pageId) {
  // SELECT *, blocks(*) JOIN — ordered by position
}
export async function upsertPageBlocks(client, pageId, blocks: PageBlockInsert[]) {
  // DELETE existing → INSERT new (ordered)
}
```

**`packages/db/src/queries/global-elements.ts`:**
```typescript
export async function getGlobalElements(client) { ... }
export async function getGlobalElementsBySlot(client, slot: GlobalSlot) { ... }
export async function createGlobalElement(client, el: GlobalElementInsert) { ... }
export async function updateGlobalElement(client, id, el: GlobalElementUpdate) { ... }
export async function deleteGlobalElement(client, id) { ... }

// Resolution function — used by Astro at build time
export async function resolveGlobalElementsForPage(
  client,
  pageType: 'layout' | 'composed',
  pageSlug: string
) {
  // Fetch all global_elements with blocks JOIN
  // Filter by matching scope
  // Per slot: pick highest priority
  // Return: Record<GlobalSlot, Block | null>
}
```

### Integration

Export from `packages/db/src/index.ts`.

---

## Task 1.3: Validators

### What to Build

**`packages/validators/src/page.ts`:**
```typescript
export const pageSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  title: z.string().min(1).max(200),
  type: z.enum(['layout', 'composed']),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export const globalElementSchema = z.object({
  slot: z.enum(['header', 'footer', 'sidebar-left', 'sidebar-right']),
  block_id: z.string().uuid(),
  scope: z.string().min(1),  // 'sitewide', 'composed:*', 'layout:themes', etc.
  priority: z.number().int().min(0).max(100).default(0),
})
```

### Integration

Export from `packages/validators/src/index.ts`.

---

## Task 1.4: Hono API Routes

### What to Build

**`apps/api/src/routes/pages.ts`:**
```
GET    /api/pages           — list all pages
GET    /api/pages/:id       — get page by ID
POST   /api/pages           — create page
PUT    /api/pages/:id       — update page
DELETE /api/pages/:id       — delete (dependency check)

GET    /api/pages/:id/blocks — get ordered blocks for composed page
PUT    /api/pages/:id/blocks — replace all blocks (delete + insert)
```

**`apps/api/src/routes/global-elements.ts`:**
```
GET    /api/global-elements           — list all
POST   /api/global-elements           — create
PUT    /api/global-elements/:id       — update
DELETE /api/global-elements/:id       — delete

GET    /api/global-elements/resolve?type=layout&slug=themes — resolve for specific page
```

Both use auth + requireRole(['content_manager', 'admin']) middleware, same pattern as blocks.ts.

### Integration

In `apps/api/src/index.ts`:
```typescript
import { pages } from './routes/pages'
import { globalElements } from './routes/global-elements'

app.route('/api', pages)
app.route('/api', globalElements)
```

Also add `'http://localhost:4321'` (Astro dev port) to CORS origins.

---

## Task 1.5: Studio — Pages Sidebar + List Page

### What to Build

**1.5a — Sidebar** (`apps/studio/src/components/sidebar.tsx`):
Add two new nav items:
```typescript
{ to: '/pages', label: 'Pages', icon: FileText },          // between Themes and Blocks
{ to: '/global-elements', label: 'Global Elements', icon: Globe },  // after Templates
```

**1.5b — Pages list** (`apps/studio/src/pages/pages-list.tsx`):
Table: Title, Slug, Type badge (layout=blue, composed=green), Status, Updated.
"Create Page" → `/pages/new`. Row click → `/pages/:id`.

**1.5c — Routes** in `apps/studio/src/app.tsx`:
```typescript
<Route path="/pages" element={<PagesList />} />
<Route path="/pages/new" element={<PageEditor />} />
<Route path="/pages/:id" element={<PageEditor />} />
<Route path="/global-elements" element={<GlobalElementsSettings />} />
```

---

## Task 1.6: Studio — Page Editor

### What to Build

`apps/studio/src/pages/page-editor.tsx`:

**For both types:**
- Title, Slug (auto-gen, read-only after save)
- Type select (layout | composed) — **read-only after creation**
- Status: draft / published
- Save / Publish footer

**For type='layout' only:**
- Just title/slug/status. No block list, no SEO.
- Info text: "Layout pages wrap theme content. Configure which blocks appear in which slots via Global Elements settings."

**For type='composed' only:**
- SEO: title, description (with CharCounter)
- Block list (ordered):
  - Each: block name + type badge + position
  - [+] Add → block picker from library
  - [×] Remove
  - [↑][↓] Reorder
  - Per-block config: JSON textarea for slot fills / hook overrides

**Note:** Page editor does NOT have header/footer/sidebar pickers. Those are in Global Elements settings.

---

## Task 1.7: Studio — Global Elements Settings

### What to Build

`apps/studio/src/pages/global-elements-settings.tsx`:

Single page with 4 sections (one per slot):

```
┌─ HEADER ──────────────────────────────────┐
│ ┌───────────────────┬──────────────────┐   │
│ │ Scope             │ Block            │   │
│ ├───────────────────┼──────────────────┤   │
│ │ sitewide (pri: 0) │ [header-main ▾]  │   │
│ │ layout:themes (20)│ [header-theme ▾] │   │
│ └───────────────────┴──────────────────┘   │
│ [+ Add scope override]                     │
└────────────────────────────────────────────┘

┌─ FOOTER ──────────────────────────────────┐
│ │ sitewide (pri: 0) │ [footer-main ▾]  │   │
│ [+ Add scope override]                     │
└────────────────────────────────────────────┘

┌─ SIDEBAR-LEFT ────────────────────────────┐
│ │ layout:themes (20)│ [entitlement-sb ▾]│  │
│ [+ Add scope override]                     │
└────────────────────────────────────────────┘

┌─ SIDEBAR-RIGHT ───────────────────────────┐
│ │ layout:themes (20)│ [theme-params-sb ▾]│ │
│ [+ Add scope override]                     │
└────────────────────────────────────────────┘
```

For each slot:
- List of current scope assignments (scope + priority + block picker dropdown)
- Block picker: dropdown loaded from `/api/blocks`
- Scope: text input or predefined select (sitewide, composed:*, composed:homepage, layout:*, layout:themes)
- Priority: auto-calculated (sitewide=0, type=10, specific=20) or manual input
- [+ Add] adds new scope row
- [×] Remove scope assignment
- Save all at bottom

**Data flow:**
- Load: `GET /api/global-elements`
- Save: For each changed/added/removed row → individual POST/PUT/DELETE calls

---

## Files to Modify

- `packages/db/src/types.ts` — **MODIFY** — add Page, PageBlock, GlobalElement types
- `packages/db/src/index.ts` — **MODIFY** — export new types + queries
- `packages/db/src/queries/pages.ts` — **NEW**
- `packages/db/src/queries/global-elements.ts` — **NEW**
- `packages/validators/src/page.ts` — **NEW**
- `packages/validators/src/index.ts` — **MODIFY** — export page + global validators
- `apps/api/src/routes/pages.ts` — **NEW**
- `apps/api/src/routes/global-elements.ts` — **NEW**
- `apps/api/src/index.ts` — **MODIFY** — mount routes + CORS
- `apps/studio/src/components/sidebar.tsx` — **MODIFY** — add Pages + Global Elements
- `apps/studio/src/pages/pages-list.tsx` — **NEW**
- `apps/studio/src/pages/page-editor.tsx` — **NEW**
- `apps/studio/src/pages/global-elements-settings.tsx` — **NEW**
- `apps/studio/src/app.tsx` — **MODIFY** — add routes

---

## Acceptance Criteria

- [ ] Page + PageBlock + GlobalElement types exported from @cmsmasters/db
- [ ] Page + GlobalElement validators exported from @cmsmasters/validators
- [ ] resolveGlobalElementsForPage() function works (scope matching + priority)
- [ ] Hono API: pages CRUD + page_blocks CRUD (7 endpoints)
- [ ] Hono API: global-elements CRUD + resolve (5 endpoints)
- [ ] CORS includes localhost:4321 (Astro)
- [ ] Studio sidebar: Pages + Global Elements items
- [ ] Pages list: shows type badge + status
- [ ] Page editor (layout): title, slug, status only — info text about Global Elements
- [ ] Page editor (composed): + SEO + block list with add/remove/reorder
- [ ] Global Elements settings: 4 slots, scope+block configuration per slot
- [ ] tsc clean across packages and apps
- [ ] No regressions: blocks, templates, themes still work

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005D Phase 1 Verification ==="

# 1. Types exported
grep -c "Page\|PageBlock\|GlobalElement\|GlobalSlot" packages/db/src/index.ts
echo "(expect: 8+ type exports)"

# 2. Queries exist
ls packages/db/src/queries/pages.ts packages/db/src/queries/global-elements.ts
echo "(expect: both files exist)"

# 3. Validators
grep "pageSchema\|globalElementSchema" packages/validators/src/index.ts
echo "(expect: both exported)"

# 4. API routes mounted
grep -c "pages\|globalElements" apps/api/src/index.ts
echo "(expect: 2+ — both imported and mounted)"

# 5. CORS includes Astro port
grep "4321" apps/api/src/index.ts
echo "(expect: 1 match)"

# 6. Studio sidebar
grep -c "Pages\|Global Elements" apps/studio/src/components/sidebar.tsx
echo "(expect: 2)"

# 7. Studio routes
grep -c "/pages\|/global-elements" apps/studio/src/app.tsx
echo "(expect: 4+ routes)"

# 8. tsc clean
npx tsc --noEmit -p packages/db/tsconfig.json
npx tsc --noEmit -p packages/validators/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json
npx tsc --noEmit -p apps/studio/tsconfig.json
echo "(expect: 0 errors)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

Create: `logs/wp-005d/phase-1-result.md`

```markdown
# Execution Log: WP-005D Phase 1 — Studio Pages + Global Elements
> Epic: WP-005D Portal
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Issues & Workarounds
{or "None"}

## Open Questions
{or "None"}

## Verification Results
| Check | Result |
|-------|--------|

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add packages/db/src/ packages/validators/src/ apps/api/src/ apps/studio/src/ logs/wp-005d/
git commit -m "feat: pages + global elements CRUD, Studio UI [WP-005D phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT create DB tables** — pages, page_blocks, global_elements already exist in Supabase.
- **Do NOT create layout blocks or seed content** — that's a manual process via PAGE-CREATION-FLOW.md. This phase builds the tools, not the content.
- **Do NOT add header/footer/sidebar fields to pages table** — they don't exist. Use global_elements.
- **Do NOT add page_id to themes table** — it doesn't exist. Layout binding is through global_elements scope.
- **Follow patterns** from blocks.ts/templates.ts for API routes — same auth, error handling, response format.
- **Page type is immutable after creation** — type select disabled on edit.
- **Layout page editor** is minimal: title, slug, status, info text. No block list, no SEO. The "content" of a layout page is defined by global_elements and the layout block.
- **Composed page editor** has block list with add/remove/reorder — same UX as template position editor from WP-005C.
- **Global Elements settings** — single page, not per-element editor. All 4 slots managed on one screen.
- **Read** `workplan/PORTAL-BLOCK-ARCHITECTURE.md` for full architecture context.
- **Read** `workplan/PAGE-CREATION-FLOW.md` to understand what is manual vs automated.
