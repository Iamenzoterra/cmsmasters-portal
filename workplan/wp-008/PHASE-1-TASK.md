# WP-008 Phase 1: DB Migration — Block Category + Default + Layout Slots

> Workplan: WP-008 Global Elements V2
> Phase: 1 of 5
> Priority: P0
> Estimated: 1.5 hours
> Type: Backend + Types
> Previous: WP-007 ✅ (Portal Layout System complete)
> Next: Phase 2 (Studio — Block Category in Block Editor)

---

## Context

Current global elements system uses a separate `global_elements` table with manual scope+priority entries. This is replaced by:

1. **`blocks.category`** — classifies blocks: `header`, `footer`, `sidebar`, or empty (theme/content block)
2. **`blocks.is_default`** — one default per category, auto-fills all slots unless overridden
3. **`pages.layout_slots`** — per-layout override: layout editor picks specific blocks for each slot

Resolution cascade at build time: `layout_slots[slot]` > `is_default block for category` > null.

```
CURRENT:  global_elements table with scope + priority per slot           ❌ complex
TARGET:   blocks.category + blocks.is_default + pages.layout_slots       ✅ simple cascade
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current blocks table columns
grep -A 15 "blocks:" packages/db/src/types.ts | head -20

# 2. Current pages table columns  
grep -A 20 "pages:" packages/db/src/types.ts | head -25

# 3. Current block validators
cat packages/validators/src/block.ts

# 4. Current page validators
cat packages/validators/src/page.ts

# 5. Global elements table still exists?
grep "global_elements" packages/db/src/types.ts | head -5

# 6. Block API route — what fields pass through
grep -A 5 "createBlockSchema\|updateBlockSchema" apps/api/src/routes/blocks.ts
```

**Document findings before writing code.**

**IMPORTANT:** Do NOT drop the `global_elements` table yet — that's Phase 5. This phase only ADDS new columns.

---

## Task 1.1: Supabase migration

### What to Build

**File:** `supabase/migrations/005_block_categories.sql`

```sql
-- WP-008 Phase 1: Block categories, defaults, layout slot overrides
-- Replaces scope+priority global_elements with simpler cascade model

-- blocks: category classifies block type (header/footer/sidebar or empty for content)
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.blocks.category IS 'Block category: header, footer, sidebar, or empty for content blocks';

-- blocks: is_default flag — one default per category, auto-fills all slots
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.blocks.is_default IS 'Default block for its category — fills all matching slots unless overridden';

-- Enforce: only one default per category (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS blocks_one_default_per_category
  ON public.blocks (category) WHERE is_default = true AND category != '';

-- pages: layout_slots — per-layout slot overrides (jsonb map: slot → block_id)
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS layout_slots jsonb NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.pages.layout_slots IS 'Layout slot overrides: { "header": "block-uuid", "footer": "block-uuid" }. Only for layout pages.';
```

**Run via Supabase dashboard.** Then verify:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'blocks' AND column_name IN ('category', 'is_default');
```

---

## Task 1.2: Update `packages/db/src/types.ts`

### What to Build

Add fields to blocks and pages types.

**Blocks — Row (after `js: string`):**
```typescript
category: string
is_default: boolean
```

**Blocks — Insert (after `js?: string`):**
```typescript
category?: string
is_default?: boolean
```

**Blocks — Update (after `js?: string`):**
```typescript
category?: string
is_default?: boolean
```

**Pages — Row (after `css: string`):**
```typescript
layout_slots: Record<string, string>
```

**Pages — Insert (after `css?: string`):**
```typescript
layout_slots?: Record<string, string>
```

**Pages — Update (after `css?: string`):**
```typescript
layout_slots?: Record<string, string>
```

---

## Task 1.3: Update `packages/validators/src/block.ts`

### What to Build

Add `category` and `is_default` to block schemas.

**`createBlockSchema` — add after `js`:**
```typescript
category: z.string().default(''),
is_default: z.boolean().default(false),
```

**`updateBlockSchema` — add after `js`:**
```typescript
category: z.string().optional(),
is_default: z.boolean().optional(),
```

---

## Task 1.4: Update `packages/validators/src/page.ts`

### What to Build

Add `layout_slots` to page schemas.

**`pageSchema` — add after `css`:**
```typescript
layout_slots: z.record(z.string(), z.string()).default({}),
```

**`updatePageSchema` — add after `css`:**
```typescript
layout_slots: z.record(z.string(), z.string()).optional(),
```

---

## Task 1.5: Update page API client

### What to Build

**File:** `apps/studio/src/lib/page-api.ts`

Add `layout_slots` to `createPageApi` and `updatePageApi` payload types:

```typescript
// createPageApi payload — add:
layout_slots?: Record<string, string>

// updatePageApi payload — add:
layout_slots?: Record<string, string>
```

---

## Task 1.6: Verify API routes pass through

### What to Build

No code changes expected — API routes use `parsed.data` spread from validators. Adding fields to validators should be enough.

**Verify:** `tsc --noEmit` clean for api + studio.

**Mine to check:** If `createBlock` or `updateBlock` in `packages/db/src/queries/blocks.ts` has a field whitelist instead of spread — it won't pass through. Read and verify.

---

## Task 1.7: Redeploy API

### What to Build

Validators changed → production API needs redeployment.

```bash
cd apps/api && npx wrangler deploy
```

Without this, production API will strip new fields via old Zod validation.

---

## Files to Modify

- `supabase/migrations/005_block_categories.sql` — **NEW** — category + is_default + layout_slots
- `packages/db/src/types.ts` — add category, is_default to blocks; layout_slots to pages
- `packages/validators/src/block.ts` — add category, is_default to schemas
- `packages/validators/src/page.ts` — add layout_slots to schemas
- `apps/studio/src/lib/page-api.ts` — add layout_slots to payload types

---

## Acceptance Criteria

- [ ] `blocks.category` column exists in Supabase (text, default '')
- [ ] `blocks.is_default` column exists in Supabase (boolean, default false)
- [ ] Unique partial index: one default per category enforced
- [ ] `pages.layout_slots` column exists (jsonb, default '{}')
- [ ] Block types updated: category + is_default in Row/Insert/Update
- [ ] Page types updated: layout_slots in Row/Insert/Update
- [ ] Block validators accept category + is_default
- [ ] Page validators accept layout_slots
- [ ] Page API client accepts layout_slots
- [ ] `tsc --noEmit` clean for api + studio
- [ ] API redeployed with new validators

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-008 Phase 1 Verification ==="

# 1. TypeScript
cd "C:\work\cmsmasters portal\app\cmsmasters-portal"
npx tsc --noEmit -p apps/api/tsconfig.json && echo "✅ API" || echo "❌ API"
npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio" || echo "❌ Studio"

# 2. Block types have new fields
grep -n "category\|is_default" packages/db/src/types.ts | head -6
echo "(expect: 6 lines — Row + Insert + Update × 2 fields)"

# 3. Page types have layout_slots
grep -n "layout_slots" packages/db/src/types.ts | head -3
echo "(expect: 3 lines — Row + Insert + Update)"

# 4. Validators
grep "category\|is_default" packages/validators/src/block.ts
grep "layout_slots" packages/validators/src/page.ts

# 5. Migration file exists
ls supabase/migrations/005_block_categories.sql && echo "✅"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-008/phase-1-result.md`

---

## Git

```bash
git add supabase/migrations/005_block_categories.sql packages/db/src/types.ts packages/validators/src/block.ts packages/validators/src/page.ts apps/studio/src/lib/page-api.ts logs/wp-008/phase-1-result.md
git commit -m "feat: block categories + is_default + layout_slots — DB + types + validators [WP-008 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT drop global_elements table** — it's used by existing code. Cleanup is Phase 5.
- **Do NOT modify block editor UI yet** — category dropdown + default checkbox is Phase 2.
- **Do NOT modify layout editor yet** — slot picker is Phase 3.
- **Do NOT modify portal resolution yet** — new cascade logic is Phase 4.
- **Unique partial index** — `WHERE is_default = true AND category != ''` ensures empty-category blocks can't be default and only one default per real category.
- **`layout_slots` is jsonb** — not a relation table. Keeps it simple: `{ "header": "uuid", "footer": "uuid" }`.
- **Redeploy API after validators change** — otherwise production strips new fields.
- **Migration uses IF NOT EXISTS** — safe to re-run.
