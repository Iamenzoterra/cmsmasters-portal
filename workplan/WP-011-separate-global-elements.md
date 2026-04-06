# WP-011 Phase 1: Separate Global Elements from Theme Blocks

> Workplan: WP-011 Block Type Split & Block Categories
> Phase: 1 of 1
> Priority: P1
> Estimated: 4 hours
> Type: Full-stack
> Previous: WP-010 Theme Meta CRUD (categories, tags, prices) ✅
> Next: (none planned)
> Affected domains: pkg-db, pkg-validators, app-api, studio-core, app-portal

---

## Context

Global elements (header/footer/sidebar) and theme blocks share a single `blocks.category` string field that conflates two unrelated concerns:
1. **Structural role** — is this block a header, footer, sidebar, element, or plain content block?
2. **Content classification** — what user-facing category does this theme block belong to (e.g., "essential", "related")?

This causes two bugs:
- **Wrong redirects**: Clicking a block in `/global-elements` navigates to `/blocks/{id}` (Theme Blocks section). Creating a header navigates to `/elements/new` (Elements section). Both dump the user into the wrong UI context.
- **No theme block categories**: Theme blocks have no categorization system. The blocks-list page has a disabled category filter UI (guarded by `false &&`).

```
CURRENT:  blocks.category stores structural role (header/footer/sidebar/element/'')   ✅
CURRENT:  /global-elements edit links → /blocks/:id (wrong section)                   ❌
CURRENT:  /global-elements create links → /elements/new (wrong section)               ❌
CURRENT:  Theme blocks have no categories                                              ❌
MISSING:  block_type field for structural role                                         ❌
MISSING:  block_categories table for user-managed theme block categories               ❌
MISSING:  /global-elements/new and /global-elements/:id routes                        ❌
```

This task splits the `category` column into `block_type` (structural) + `block_category_id` (FK to new `block_categories` table), adds dedicated global-elements editor routes, and enables theme block category management.

---

## Domain Context

**pkg-db:**
- Key invariants: All query functions take Supabase client as first arg. `types.ts` is auto-generated — manual edits will be overwritten. JSON columns typed via branded types.
- Known traps: `.maybeSingle()` returns null on 0 rows vs `.single()` throws. After migration, must regenerate types.
- Public API: `packages/db/src/index.ts`
- Blast radius: Changing types.ts affects EVERY consumer of @cmsmasters/db (studio, portal, api, validators)

**pkg-validators:**
- Key invariants: Zod schemas define validation for all entities.
- Public API: `packages/validators/src/index.ts`

**app-api:**
- Key invariants: Secrets boundary — service_role key only here. Auth middleware validates JWT. Role middleware checks profile role.
- Known traps: Route order matters in Hono. `env()` reads from CF Workers env, not process.env.
- Blast radius: Changing routes/blocks.ts default-unsetting logic affects block creation/update.

**studio-core:**
- Key invariants: Every entity has list + editor + API wrapper. All editors use react-hook-form + zodResolver. block-api.ts exports shared `authHeaders`/`parseError` used by ALL entity API wrappers.
- Known traps: Elements tab filters by `category === 'element'`. If category is wrong, blocks won't appear. `fetchAllBlocks` is in studio's block-api.ts (calls Hono API via fetch).
- Blast radius: Changing block-api.ts (authHeaders/parseError) breaks ALL entity API wrappers. Changing app.tsx affects ALL routes.

**app-portal:**
- Key invariants: Global elements resolve by cascade: layout_slots override > category default (is_default=true) > null. SLOT_TO_CATEGORY maps slot names to block categories.
- Known traps: `getThemeBySlug` uses `.eq('status', 'published')`. SSG pages need revalidation.
- Blast radius: Changing `lib/global-elements.ts` affects every page's header/footer/sidebars.

---

## PHASE 0: Audit (do FIRST -- CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skills
cat .claude/skills/domains/studio-core/SKILL.md
cat .claude/skills/domains/pkg-db/SKILL.md
cat .claude/skills/domains/app-api/SKILL.md
cat .claude/skills/domains/app-portal/SKILL.md

# 2. Verify all consumers of blocks.category
grep -rn "\.category" apps/studio/src/pages/block-editor.tsx
grep -rn "\.category" apps/studio/src/pages/blocks-list.tsx
grep -rn "\.category" apps/studio/src/pages/elements-list.tsx
grep -rn "\.category" apps/studio/src/pages/global-elements-settings.tsx
grep -rn "\.category" apps/studio/src/pages/page-editor.tsx
grep -rn "\.category" apps/studio/src/components/block-picker-modal.tsx
grep -rn "\.category" apps/portal/lib/global-elements.ts

# 3. Check current migration numbering
ls supabase/migrations/

# 4. Check existing categories infrastructure (model to follow)
cat packages/db/src/queries/categories.ts
cat packages/validators/src/category.ts

# 5. Verify current test state
npm run arch-test
```

**Document your findings before writing any code.**

**IMPORTANT:** The portal app (`apps/portal/lib/global-elements.ts`) directly queries `blocks.category` with `.neq('category', '')` and maps by `b.category`. This MUST be updated to `block_type` or the production site's headers/footers will break.

**IMPORTANT:** The `blocks_one_default_per_category` unique index references the `category` column. Must be dropped before the column and recreated on `block_type`.

---

## Task 1.1: Database Migration

### What to Build

New migration: `supabase/migrations/009_block_type_split.sql`

```sql
-- 1. Add block_type column and copy data from category
ALTER TABLE public.blocks ADD COLUMN block_type text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.blocks.block_type IS 'Structural role: header, footer, sidebar, element, or empty for theme content blocks';
UPDATE public.blocks SET block_type = category;

-- 2. Create block_categories table (user-managed categories for theme blocks)
CREATE TABLE IF NOT EXISTS public.block_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.block_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_categories_read" ON public.block_categories FOR SELECT USING (true);

-- 3. Add FK from blocks to block_categories
ALTER TABLE public.blocks ADD COLUMN block_category_id uuid
  REFERENCES public.block_categories(id) ON DELETE SET NULL;

-- 4. Replace unique index (one default per block_type)
DROP INDEX IF EXISTS blocks_one_default_per_category;
CREATE UNIQUE INDEX blocks_one_default_per_block_type
  ON public.blocks (block_type) WHERE is_default = true AND block_type != '';

-- 5. Drop old column
ALTER TABLE public.blocks DROP COLUMN category;
```

### Integration

Follows existing migration pattern. Run with `supabase db reset` or `supabase migration up`.

After migration, regenerate types:
```bash
supabase gen types typescript --local > packages/db/src/types.ts
```

Then manually add type aliases at the bottom of `types.ts` (following pattern at ~line 586):
```typescript
export type BlockCategory = Database['public']['Tables']['block_categories']['Row']
export type BlockCategoryInsert = Database['public']['Tables']['block_categories']['Insert']
export type BlockCategoryUpdate = Database['public']['Tables']['block_categories']['Update']
```

### Domain Rules

- types.ts is auto-generated from Supabase — add aliases AFTER the generated content (pkg-db invariant)
- RLS must be enabled on new tables (pkg-db invariant)

---

## Task 1.2: DB Queries for Block Categories

### What to Build

New file: `packages/db/src/queries/block-categories.ts`

Mirror the exact pattern of `packages/db/src/queries/categories.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, BlockCategoryInsert, BlockCategoryUpdate } from '../types'

type Client = SupabaseClient<Database>

export async function getBlockCategories(client: Client) {
  const { data, error } = await client
    .from('block_categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function getBlockCategoryById(client: Client, id: string) {
  const { data, error } = await client
    .from('block_categories')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createBlockCategory(client: Client, category: BlockCategoryInsert) {
  const { data, error } = await client
    .from('block_categories')
    .insert(category)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBlockCategory(client: Client, id: string, updates: BlockCategoryUpdate) {
  const { data, error } = await client
    .from('block_categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBlockCategory(client: Client, id: string) {
  const { error } = await client
    .from('block_categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

### Integration

Export from `packages/db/src/index.ts`:
```typescript
export * from './queries/block-categories'
export type { BlockCategory, BlockCategoryInsert, BlockCategoryUpdate } from './types'
```

### Domain Rules

- All query functions take Supabase client as first arg (pkg-db invariant)
- Follow existing categories.ts pattern exactly

---

## Task 1.3: Validators

### What to Build

**Update** `packages/validators/src/block.ts`:

```typescript
// BEFORE:
category: z.string().default(''),

// AFTER:
block_type: z.string().default(''),
block_category_id: z.string().uuid().nullable().optional(),
```

Apply to both `createBlockSchema` and `updateBlockSchema`.

**New file**: `packages/validators/src/block-category.ts` (mirror `category.ts`):

```typescript
import { z } from 'zod'

export const blockCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
})
```

**Update** `packages/validators/src/index.ts` — export new schema.

### Domain Rules

- Validators are the source of truth for request validation (pkg-validators)

---

## Task 1.4: API Routes

### What to Build

**Update** `apps/api/src/routes/blocks.ts` — change default-unsetting logic:

```typescript
// BEFORE (lines 64-66):
if (parsed.data.is_default && parsed.data.category) {
  await supabase.from('blocks').update({ is_default: false })
    .eq('category', parsed.data.category).eq('is_default', true)
}

// AFTER:
if (parsed.data.is_default && parsed.data.block_type) {
  await supabase.from('blocks').update({ is_default: false })
    .eq('block_type', parsed.data.block_type).eq('is_default', true)
}
```

Same change at lines 99-102 for the update route.

**New file**: `apps/api/src/routes/block-categories.ts` — standard CRUD (mirror existing routes pattern):

- `GET /api/block-categories` — list all (auth required)
- `POST /api/block-categories` — create (content_manager, admin)
- `PUT /api/block-categories/:id` — update (content_manager, admin)
- `DELETE /api/block-categories/:id` — delete (admin only)

**Update** `apps/api/src/index.ts` — import and mount: `app.route('/api', blockCategoriesRoute)`

### Domain Rules

- Auth middleware validates JWT, role middleware checks profile role (app-api invariant)
- Supabase client uses service_role key — bypasses RLS (app-api invariant)
- Route order matters in Hono (app-api trap)

---

## Task 1.5: Studio Client API

### What to Build

**Update** `apps/studio/src/lib/block-api.ts` — add functions:

```typescript
export async function fetchBlockCategories(): Promise<BlockCategory[]> {
  const res = await fetch(`${API_URL}/api/block-categories`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createBlockCategoryApi(payload: { name: string; slug: string }) { ... }
export async function updateBlockCategoryApi(id: string, payload: { name: string; slug: string }) { ... }
export async function deleteBlockCategoryApi(id: string) { ... }
```

Follow the exact pattern of existing CRUD functions in block-api.ts.

### Domain Rules

- block-api.ts exports shared authHeaders/parseError used by ALL wrappers (studio-core invariant)
- Use `authHeaders(token)` and `parseError(res)` from the same file

---

## Task 1.6: Studio Routes & Global Elements Navigation Fix

### What to Build

**Update** `apps/studio/src/app.tsx` — add routes after the existing `/global-elements` route (line 90):

```tsx
<Route path="/global-elements/new" element={<BlockEditor />} />
<Route path="/global-elements/:id" element={<BlockEditor />} />
```

**Update** `apps/studio/src/pages/global-elements-settings.tsx`:

| Line | Before | After |
|------|--------|-------|
| 28 | `b.category === cat.value` | `b.block_type === cat.value` |
| 69 | `navigate('/elements/new?category=${group.value}')` | `navigate('/global-elements/new?category=${group.value}')` |
| 97 | `navigate('/blocks/${block.id}')` | `navigate('/global-elements/${block.id}')` |

### Domain Rules

- Changing app.tsx affects ALL route definitions (studio-core blast radius)

---

## Task 1.7: BlockEditor — Three Contexts

### What to Build

**Update** `apps/studio/src/pages/block-editor.tsx`:

1. **Route detection** (replace lines 208-211):
```typescript
const isElementRoute = location.pathname.startsWith('/elements')
const isGlobalElementRoute = location.pathname.startsWith('/global-elements')
const basePath = isGlobalElementRoute ? '/global-elements' : isElementRoute ? '/elements' : '/blocks'
const sectionLabel = isGlobalElementRoute ? 'Global Elements' : isElementRoute ? 'Elements' : 'Blocks'
```

2. **Replace `BLOCK_CATEGORIES` constant** (lines 54-60) with context-dependent UI:
   - Global elements route → show `block_type` dropdown with options: header, footer, sidebar
   - Elements route → auto-set `block_type = 'element'`, hide dropdown
   - Blocks route → `block_type = ''` hidden; show `block_category_id` dropdown populated from `fetchBlockCategories()` API

3. **Update `BlockFormData` interface** (line 62-75):
   - Replace `category: string` with `block_type: string` and `block_category_id: string`

4. **Update `getDefaults()`** (lines 77-92):
   - `block_type` defaults: from URL param for global-elements, 'element' for elements, '' for blocks
   - `block_category_id: ''` always

5. **Update `blockToFormData()`** (line 104):
   - `block.category` → `block.block_type`; add `block.block_category_id`

6. **Update `formDataToPayload()`** (line 155):
   - `category: data.category` → `block_type: data.block_type, block_category_id: data.block_category_id || null`

7. **Fetch block categories** for the blocks context:
   - Add `useEffect` that calls `fetchBlockCategories()` when on blocks route
   - Store in state for dropdown

### Domain Rules

- All editors use react-hook-form + zodResolver (studio-core invariant)
- Elements tab filters by structural role, not content category (studio-core trap)

---

## Task 1.8: Update Block Lists & Other Consumers

### What to Build

**`apps/studio/src/pages/blocks-list.tsx`**:
- Line 46: `!b.category` → `!b.block_type || b.block_type === ''`
- Lines 308-312: Replace `block.category` badge with block_category name lookup
- Line 118: Remove `false &&` guard — enable category filter tabs using `fetchBlockCategories()` from API

**`apps/studio/src/pages/elements-list.tsx`**:
- Line 15: `b.category === 'element'` → `b.block_type === 'element'`

**`apps/studio/src/pages/page-editor.tsx`**:
- Line 231: `!!b.category` → `!!b.block_type`
- Line 853: `b.category === category` → `b.block_type === category`

**`apps/studio/src/components/block-picker-modal.tsx`**:
- Line 34: `!b.category || b.category === 'element'` → `!b.block_type || b.block_type === 'element'`

**`apps/portal/lib/global-elements.ts`** (CRITICAL — production site):
- Line 41: `.neq('category', '')` → `.neq('block_type', '')`
- Line 42: `b.category` → `b.block_type`

### Domain Rules

- Changing `lib/global-elements.ts` affects every page's header/footer/sidebars (app-portal blast radius)
- Portal uses anon key with RLS — ensure `block_type` column is readable (app-portal trap)

---

## Files to Modify

- `supabase/migrations/009_block_type_split.sql` — **new**: migration for block_type, block_categories table, FK
- `packages/db/src/types.ts` — regenerated + manual type aliases
- `packages/db/src/queries/block-categories.ts` — **new**: CRUD queries
- `packages/db/src/index.ts` — export new queries + types
- `packages/validators/src/block.ts` — `category` → `block_type` + `block_category_id`
- `packages/validators/src/block-category.ts` — **new**: Zod schema
- `packages/validators/src/index.ts` — export new schema
- `apps/api/src/routes/blocks.ts` — `category` → `block_type` in default-unsetting
- `apps/api/src/routes/block-categories.ts` — **new**: CRUD endpoints
- `apps/api/src/index.ts` — mount new route
- `apps/studio/src/lib/block-api.ts` — add block category API functions
- `apps/studio/src/app.tsx` — add `/global-elements/new` and `/global-elements/:id` routes
- `apps/studio/src/pages/global-elements-settings.tsx` — fix navigation + `category` → `block_type`
- `apps/studio/src/pages/block-editor.tsx` — three-context routing, form field split, category dropdown
- `apps/studio/src/pages/blocks-list.tsx` — `category` → `block_type`, enable category filter
- `apps/studio/src/pages/elements-list.tsx` — `category` → `block_type`
- `apps/studio/src/pages/page-editor.tsx` — `category` → `block_type`
- `apps/studio/src/components/block-picker-modal.tsx` — `category` → `block_type`
- `apps/portal/lib/global-elements.ts` — `category` → `block_type` (production!)
- `src/__arch__/domain-manifest.ts` — add new files to owned_files

---

## Acceptance Criteria

- [ ] `/global-elements` → clicking a block opens `/global-elements/{id}` (NOT `/blocks/{id}`)
- [ ] `/global-elements` → "Create Header" opens `/global-elements/new?category=header` (NOT `/elements/new`)
- [ ] Saving a new block from `/global-elements/new` redirects to `/global-elements/{id}`
- [ ] Back button from `/global-elements/{id}` returns to `/global-elements`
- [ ] `/blocks` only shows theme content blocks (block_type = '')
- [ ] `/elements` only shows element blocks (block_type = 'element')
- [ ] Theme blocks can be assigned a user-managed category from the editor
- [ ] Block categories can be created/edited/deleted via API
- [ ] Blocks list has working category filter tabs
- [ ] Portal resolves global elements correctly using `block_type` (header/footer defaults still work)
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new boundary violations
- [ ] Domain invariants preserved: block-api.ts shared utils intact, editors use react-hook-form + zod

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-011 Phase 1 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. TypeScript build check
npx turbo build
echo "(expect: no type errors)"

# 3. Verify migration applied
# Check that blocks table has block_type and block_category_id, no category
# Check that block_categories table exists

# 4. Verify portal global-elements.ts uses block_type
grep -n "block_type\|category" apps/portal/lib/global-elements.ts
echo "(expect: block_type references only, no category)"

# 5. Verify all .category references are gone from blocks-related code
grep -rn "\.category" apps/studio/src/pages/block-editor.tsx apps/studio/src/pages/blocks-list.tsx apps/studio/src/pages/elements-list.tsx apps/studio/src/pages/global-elements-settings.tsx apps/studio/src/pages/page-editor.tsx apps/studio/src/components/block-picker-modal.tsx apps/portal/lib/global-elements.ts
echo "(expect: no block.category references — only theme.meta.category or unrelated)"

# 6. Verify routes exist
grep -n "global-elements" apps/studio/src/app.tsx
echo "(expect: /global-elements, /global-elements/new, /global-elements/:id)"

# 7. Manual test (dev server)
echo "Manual: open Studio → Global Elements → click block → should stay in /global-elements/:id"
echo "Manual: open Studio → Global Elements → Create Header → should go to /global-elements/new"
echo "Manual: open Studio → Blocks → should show only theme blocks with category filter"
echo "Manual: open Portal → theme page → header/footer should render correctly"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-011/phase-1-result.md`

Structure (fill all sections -- write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-011 Phase 1 -- Separate Global Elements from Theme Blocks
> Epic: WP-011 Block Type Split & Block Categories
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: COMPLETE | PARTIAL | FAILED
> Domains affected: pkg-db, pkg-validators, app-api, studio-core, app-portal

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | {N} tests |
| Build | pass/fail |
| AC met | pass/fail |

## Git
- Commit: `{sha}` -- `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add supabase/migrations/009_block_type_split.sql packages/db/ packages/validators/ apps/api/ apps/studio/ apps/portal/lib/global-elements.ts src/__arch__/domain-manifest.ts logs/wp-011/
git commit -m "feat: separate global elements from theme blocks — block_type + block_categories [WP-011 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Read domain skills FIRST** — `.claude/skills/domains/{slug}/SKILL.md` before touching any code
- **Use public entrypoints only** — check skill's Public API section for cross-domain imports
- **Add new files to `domain-manifest.ts`** — update `owned_files` array for the correct domain
- **Run `npm run arch-test` before committing** — this is not optional
- **Portal is CRITICAL** — `apps/portal/lib/global-elements.ts` is production code. If `block_type` references are wrong, headers/footers break on the live site.
- **block-import-panel.tsx and block-processor.ts** use `.category` for token suggestion categories (color, spacing, etc.) — these are UNRELATED to block.category and must NOT be changed.
- **theme-editor.tsx `meta.category`** is theme metadata category — UNRELATED, do not touch.
- **Command Center `adr.category`** is ADR classification — UNRELATED, do not touch.
