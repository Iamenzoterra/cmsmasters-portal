# WP-005B: DB Foundation + Hono API for Blocks & Templates

> Supabase tables (blocks, templates), themes migration, RLS, Hono CRUD endpoints, Zod validators, DB query layer.

**Status:** DONE
**Priority:** P0 — Critical path (Studio + Portal both depend on this)
**Prerequisites:** WP-005A ✅ (codebase cleanup, BlockId=string, architecture pivot documented)
**Milestone:** WP-005 Part 2 of 4 — DB + API foundation for block system
**Estimated effort:** 10–14 hours across 5 phases
**Created:** 2026-03-31
**Completed:** 2026-03-31
**Note:** Phase 4 (Studio adaptation) was merged into Phase 1. Phase 5 (docs) became Phase 4.

---

## Problem Statement

The block system has no storage layer. Architecture V2 defines blocks (HTML+CSS assets) and templates (ordered position grids) as Supabase-managed entities, but the tables don't exist. The Hono API has no CRUD endpoints for blocks or templates. Studio and Portal can't function without this foundation.

Currently:
- `themes` table has a `sections` jsonb column with the old model (`[{ block, data }]`) — needs replacing with `template_id` + `block_fills`
- No `blocks` table — block HTML+CSS has nowhere to live
- No `templates` table — template position grids have nowhere to live
- Hono API has 3 routes (health, revalidate, upload) — no block/template management
- `packages/db/src/types.ts` still has old `ThemeBlock` with `sections` — needs update
- `packages/validators/` has `blockSchema`/`blocksSchema` referencing old model — needs replacement

---

## Solution Overview

### Architecture

```
Supabase                                    Hono API (apps/api/)
┌───────────────┐                           ┌──────────────────────────────┐
│ blocks        │ ←── RLS ──────────────    │ POST   /api/blocks           │
│ templates     │                           │ GET    /api/blocks           │
│ themes (alter)│                           │ GET    /api/blocks/:id       │
└───────────────┘                           │ PUT    /api/blocks/:id       │
       ↓                                    │ DELETE /api/blocks/:id       │
packages/db/                                │                              │
┌───────────────┐                           │ POST   /api/templates        │
│ types.ts      │ ← Block, Template,        │ GET    /api/templates        │
│               │   Theme (updated)         │ GET    /api/templates/:id    │
│ queries/      │                           │ PUT    /api/templates/:id    │
│  blocks.ts    │ ← CRUD functions          │ DELETE /api/templates/:id    │
│  templates.ts │ ← CRUD functions          └──────────────────────────────┘
│  themes.ts    │ ← updated for template_id         ↑
└───────────────┘                           packages/validators/
                                            ┌──────────────────────────────┐
                                            │ block.ts   ← Zod schemas     │
                                            │ template.ts ← Zod schemas    │
                                            │ theme.ts   ← updated         │
                                            └──────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives |
|----------|--------|-----|-------------|
| `blocks.css` = text column | Store CSS alongside HTML in same row | One row = complete visual unit. No join needed. | Separate CSS table (over-engineering) |
| `templates.positions` = jsonb array | `[{ position: 1, block_id: uuid|null }]` | Flexible, ordered, supports gaps | Separate `template_positions` join table (more complex queries) |
| `themes.sections` → DROP | 0 rows in prod, safe to drop | Clean break, no migration needed | Keep alongside new columns (confusing dual model) |
| Service role for API writes | API uses `SUPABASE_SERVICE_KEY` (existing pattern) | Bypasses RLS for admin ops. Auth checked in middleware. | Anon key + RLS (would need per-operation policies) |
| Dependency check on delete | API checks refs before allowing delete | Prevent orphaned template references | DB constraints + cascade (too destructive) |
| `@cmsmasters/validators` dep for API | API imports validators for request body parsing | Validators = single source of truth for schemas | Inline Zod schemas in routes (duplication) |

---

## What This Changes

### New Supabase Tables

```sql
-- blocks: HTML+CSS visual assets
CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  html text NOT NULL,
  css text NOT NULL DEFAULT '',
  hooks jsonb NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- templates: ordered position grids with optional block assignments
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  positions jsonb NOT NULL DEFAULT '[]',
  max_positions int NOT NULL DEFAULT 20,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- themes: drop sections, add template_id + block_fills
ALTER TABLE themes DROP COLUMN IF EXISTS sections;
ALTER TABLE themes ADD COLUMN template_id uuid REFERENCES templates(id);
ALTER TABLE themes ADD COLUMN block_fills jsonb NOT NULL DEFAULT '[]';
```

### New Files

```
packages/validators/src/
├── block.ts                    — Zod schemas for block create/update
├── template.ts                 — Zod schemas for template create/update

packages/db/src/
├── queries/blocks.ts           — getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock
├── queries/templates.ts        — getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate

apps/api/src/routes/
├── blocks.ts                   — CRUD /api/blocks
├── templates.ts                — CRUD /api/templates
```

### Modified Files

```
packages/db/src/types.ts        — Block, Template types in Database, Theme updated (sections→template_id+block_fills)
packages/db/src/index.ts        — export new types + queries
packages/db/src/mappers.ts      — themeRowToFormData updated (sections gone, template_id + block_fills added)
packages/db/src/queries/themes.ts — queries updated for new columns

packages/validators/src/theme.ts — themeSchema updated (sections → template_id + block_fills)
packages/validators/src/index.ts — export block + template schemas

apps/api/src/index.ts           — mount blocks + templates routes
apps/api/src/env.ts             — no changes needed (service key already available)
apps/api/package.json           — add @cmsmasters/validators dep

apps/studio/src/pages/theme-editor.tsx    — adapt to new ThemeFormData (no sections field)
apps/studio/src/lib/form-defaults.ts      — adapt to new defaults
apps/studio/src/components/editor-sidebar.tsx — if references sections, update
```

---

## Implementation Phases

### Phase 0: RECON (0.5–1h)

**Goal:** Verify exact current state of DB, existing RLS policies, Hono route patterns, Studio usage of `sections`. Build a precise change list.

**Tasks:**
- Query Supabase for existing tables, columns, RLS policies
- Grep for `sections` usage across Studio (theme-editor, form-defaults, mappers, editor-sidebar)
- Verify API route pattern (authMiddleware + requireRole decorators)
- Check if any Supabase migration numbering convention exists
- Count exact files that need modification

**Verification:** Inventory at `logs/wp-005b/phase-0-result.md`

---

### Phase 1: Supabase Migration — blocks + templates + themes alter (2–3h)

**Goal:** Three new/altered tables exist in Supabase with proper RLS. Types updated in `packages/db/`. tsc compiles.

**Tasks:**

1.1. **Run SQL migration via Supabase MCP** — CREATE blocks, CREATE templates, ALTER themes (drop sections, add template_id + block_fills)

1.2. **Add `updated_at` triggers** for blocks and templates (same pattern as existing themes/profiles)

1.3. **RLS policies:**
- `blocks_select`: authenticated users can SELECT
- `blocks_insert`: content_manager, admin can INSERT
- `blocks_update`: content_manager, admin can UPDATE
- `blocks_delete`: content_manager, admin can DELETE
- `templates_select`: authenticated users can SELECT
- `templates_insert`: content_manager, admin can INSERT
- `templates_update`: content_manager, admin can UPDATE
- `templates_delete`: content_manager, admin can DELETE
- `themes` existing policies stay — just add new columns to coverage

1.4. **Update `packages/db/src/types.ts`:**
- Add `Block` interface (Row/Insert/Update) to `Database.public.Tables`
- Add `Template` interface (Row/Insert/Update) to `Database.public.Tables`
- Update `themes` Row/Insert/Update: remove `sections`, add `template_id`, `block_fills`
- Remove `ThemeBlock` interface (dead — no sections column)
- Add convenience aliases: `Block`, `BlockInsert`, `Template`, `TemplateInsert`

1.5. **Update `packages/db/src/index.ts`** — export new types

1.6. **Update `packages/db/src/mappers.ts`** — adapt to new theme shape (no sections)

**Verification:**
```bash
# Tables exist in Supabase (via MCP or SQL)
# npx tsc --noEmit for db + validators
# RLS policies confirmed via pg_policies query
```

---

### Phase 2: Zod Validators + DB Query Layer (2–3h)

**Goal:** Zod schemas for block/template create/update payloads. DB query functions for CRUD. Tests pass.

**Tasks:**

2.1. **Create `packages/validators/src/block.ts`:**
```typescript
import { z } from 'zod'

export const createBlockSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  html: z.string().min(1),
  css: z.string().default(''),
  hooks: z.object({
    price: z.object({ selector: z.string() }).optional(),
    links: z.array(z.object({
      selector: z.string(),
      field: z.string(),
      label: z.string().optional(),
    })).optional(),
  }).default({}),
  metadata: z.object({
    alt: z.string().optional(),
    figma_node: z.string().optional(),
  }).passthrough().default({}),
})

export const updateBlockSchema = createBlockSchema.partial().omit({ slug: true })

export type CreateBlockPayload = z.infer<typeof createBlockSchema>
export type UpdateBlockPayload = z.infer<typeof updateBlockSchema>
```

2.2. **Create `packages/validators/src/template.ts`:**
```typescript
import { z } from 'zod'

const positionSchema = z.object({
  position: z.number().int().min(1),
  block_id: z.string().uuid().nullable(),
})

export const createTemplateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  positions: z.array(positionSchema).default([]),
  max_positions: z.number().int().min(1).max(100).default(20),
})

export const updateTemplateSchema = createTemplateSchema.partial().omit({ slug: true })

export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>
```

2.3. **Update `packages/validators/src/theme.ts`** — replace `sections`/`blocksSchema` with template_id + block_fills

2.4. **Update `packages/validators/src/index.ts`** — export new schemas

2.5. **Create `packages/db/src/queries/blocks.ts`** — CRUD functions (getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock)

2.6. **Create `packages/db/src/queries/templates.ts`** — CRUD functions

2.7. **Update `packages/db/src/queries/themes.ts`** — adapt to new columns

2.8. **Update mapper test** — adapt fixtures for new theme shape

**Verification:**
```bash
npx tsc --noEmit --project packages/validators/tsconfig.json
npx tsc --noEmit --project packages/db/tsconfig.json
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts
```

---

### Phase 3: Hono API Routes — Blocks + Templates CRUD (2–3h)

**Goal:** Full CRUD for blocks and templates via API. Auth + role protected. Dependency check on delete.

**Tasks:**

3.1. **Create `apps/api/src/routes/blocks.ts`:**
- `GET /api/blocks` — list all blocks (authenticated)
- `GET /api/blocks/:id` — get block by ID (authenticated)
- `POST /api/blocks` — create block (content_manager, admin)
- `PUT /api/blocks/:id` — update block (content_manager, admin)
- `DELETE /api/blocks/:id` — delete block with dependency check (admin)

Pattern: follows existing `revalidate.ts` — Hono sub-app, authMiddleware + requireRole decorators, service client from `lib/supabase.ts`

3.2. **Create `apps/api/src/routes/templates.ts`:**
- `GET /api/templates` — list all templates (authenticated)
- `GET /api/templates/:id` — get template by ID (authenticated)
- `POST /api/templates` — create template (content_manager, admin)
- `PUT /api/templates/:id` — update template (content_manager, admin)
- `DELETE /api/templates/:id` — delete template with dependency check (admin)

3.3. **Dependency check logic:**
- Block delete: query `templates.positions` jsonb for `block_id` references → reject if found
- Template delete: query `themes.template_id` → reject if found

3.4. **Mount routes in `apps/api/src/index.ts`**

3.5. **Add `@cmsmasters/validators` to `apps/api/package.json`**

3.6. **Update `apps/api/src/env.ts`** if needed

**Verification:**
```bash
cd apps/api && npm run build  # wrangler dry-run
# Manual test: wrangler dev → curl endpoints
```

---

### Phase 4: Studio Adaptation (1–2h)

**Goal:** Studio compiles with new theme shape. Section builder replaced with placeholder (005C builds the real UI). Theme meta editor still works.

**Tasks:**

4.1. **Update `apps/studio/src/pages/theme-editor.tsx`:**
- Remove entire SectionsList component + SectionEditor + StubEditor
- Remove sections-related useFieldArray
- Add placeholder text: "Template & blocks management coming in next update"
- Keep: meta form, SEO form, sidebar, save/publish/delete

4.2. **Update `apps/studio/src/lib/form-defaults.ts`:**
- Adapt to new ThemeFormData (template_id, block_fills instead of sections)

4.3. **Update `apps/studio/src/components/editor-sidebar.tsx`** if it references sections

4.4. **Verify Studio compiles** (at least tsc, ideally dev server)

**Verification:**
```bash
npx tsc --noEmit --project packages/db/tsconfig.json
npx tsc --noEmit --project packages/validators/tsconfig.json
# Studio dev server if possible
```

---

### Phase 5: Documentation Update (0.5h)

**Goal:** All docs reflect new DB schema, API endpoints, block/template model.

**Tasks:**
- Update `.context/BRIEF.md` — blocks + templates tables, Hono endpoints
- Update `.context/CONVENTIONS.md` — API route pattern, validator patterns
- Update `.context/ROADMAP.md` — WP-005B done
- Update `workplan/wp-005b/WORKPLAN.md` — Status ✅ DONE
- Link phase logs

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase migration fails | Can't create tables | Use Supabase MCP execute_sql; if fails, use Supabase dashboard SQL editor |
| jsonb queries for dependency check are slow | DELETE endpoint slow | Tables will have <100 rows in MVP. Add GIN index later if needed |
| Studio breaks after theme shape change | Editor unusable | Phase 4 explicitly handles this. Sections builder was already degraded (Phase 3 of 005A) |
| Circular dep validators↔db | Build fails | Existing pattern: validators has no db dep, db imports validators. New block/template validators have no db import. |
| API route tests | No test framework | Manual curl testing for MVP. Automated tests = future WP. |

---

## Acceptance Criteria (Definition of Done)

- [ ] `blocks` table exists in Supabase with slug, name, html, css, hooks, metadata
- [ ] `templates` table exists with slug, name, positions, max_positions
- [ ] `themes` table: `sections` column dropped, `template_id` + `block_fills` columns added
- [ ] RLS: blocks + templates readable by authenticated, writable by content_manager/admin
- [ ] `packages/db/src/types.ts` has Block + Template in Database type
- [ ] `packages/db/src/queries/blocks.ts` has CRUD functions
- [ ] `packages/db/src/queries/templates.ts` has CRUD functions
- [ ] `packages/validators/src/block.ts` has createBlockSchema + updateBlockSchema
- [ ] `packages/validators/src/template.ts` has createTemplateSchema + updateTemplateSchema
- [ ] Theme validators + types updated for template_id + block_fills
- [ ] Hono API: 5 endpoints for blocks, 5 for templates
- [ ] Block delete checks template dependencies
- [ ] Template delete checks theme dependencies
- [ ] Studio compiles with new theme shape (section builder removed/placeholder)
- [ ] `npx tsc --noEmit` passes for validators, db
- [ ] Mapper test passes with new theme shape
- [ ] All phases logged in `logs/wp-005b/`
- [ ] `.context/` docs updated

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-005A ✅ | DONE | All phases |
| Supabase project (yxcqtwuyktbjxstahfqj) | ✅ Available | Phase 1 — migration |
| Hono API skeleton (apps/api/) | ✅ Available | Phase 3 — new routes |
| Auth + role middleware | ✅ Available | Phase 3 — route protection |

---

## Notes

- **Supabase CLI not used.** Schema managed via SQL editor / MCP. This is existing convention (WP-002).
- **No API tests.** Manual curl/httpie for MVP. Test framework = future WP.
- **Studio section builder is intentionally removed** in Phase 4, replaced with placeholder. 005C builds the real block/template management UI.
- **`themes.sections` DROP is safe** — 0 rows in production. If dev data exists, it's test data we don't need.
- **API follows existing pattern** from `revalidate.ts`: Hono sub-app, `authMiddleware` + `requireRole()` decorators, service client from `lib/supabase.ts`.
- **`apps/api/package.json`** needs `@cmsmasters/validators` added as dependency for request body parsing.
