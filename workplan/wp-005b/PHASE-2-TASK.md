# WP-005B Phase 2: Zod Validators + DB Query Layer

> Workplan: WP-005B DB Foundation + Hono API for Blocks & Templates
> Phase: 2 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Backend (validators + query functions)
> Previous: Phase 1 ✅ (Supabase migration done, types updated, 45 mapper tests pass)
> Next: Phase 3 (Hono API Routes — Blocks + Templates CRUD)

---

## Context

Phase 1 created the DB tables (`blocks`, `templates`, altered `themes`) and updated TypeScript types. Now we need:
1. **Zod validators** for block and template API payloads (Phase 3 routes will import these)
2. **DB query functions** for blocks and templates CRUD (Phase 3 routes will call these)

Existing patterns to follow:
- Query functions: `packages/db/src/queries/themes.ts` — client injection, `if (error) throw error`
- Validators: `packages/validators/src/theme.ts` — Zod schemas with exports

```
CURRENT STATE (after Phase 1):
  packages/db/src/types.ts          — Block, BlockInsert, BlockUpdate, Template, TemplateInsert, TemplateUpdate   ✅
  packages/db/src/queries/themes.ts — getThemes, getThemeBySlug, upsertTheme                                     ✅
  packages/db/src/queries/blocks.ts — does not exist                                                              ❌
  packages/db/src/queries/templates.ts — does not exist                                                           ❌
  packages/validators/src/block.ts  — does not exist                                                              ❌
  packages/validators/src/template.ts — does not exist                                                            ❌

AFTER THIS PHASE:
  packages/validators/src/block.ts    — createBlockSchema, updateBlockSchema                                      ✅
  packages/validators/src/template.ts — createTemplateSchema, updateTemplateSchema                                ✅
  packages/db/src/queries/blocks.ts   — getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock, getBlockUsage  ✅
  packages/db/src/queries/templates.ts — getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, getTemplateUsage  ✅
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 1 types are in place
grep "BlockInsert\|TemplateInsert" packages/db/src/types.ts | head -5

# 2. Confirm new tables exist in types
grep "blocks:\|templates:" packages/db/src/types.ts | head -4

# 3. Existing query patterns
cat packages/db/src/queries/themes.ts
cat packages/db/src/queries/profiles.ts

# 4. Current validators exports
cat packages/validators/src/index.ts

# 5. No query files yet
ls packages/db/src/queries/blocks.ts 2>/dev/null && echo "EXISTS" || echo "OK: does not exist"
ls packages/db/src/queries/templates.ts 2>/dev/null && echo "EXISTS" || echo "OK: does not exist"

# 6. No validator files yet
ls packages/validators/src/block.ts 2>/dev/null && echo "EXISTS" || echo "OK: does not exist"
ls packages/validators/src/template.ts 2>/dev/null && echo "EXISTS" || echo "OK: does not exist"

# 7. Baseline tsc
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 | tail -3
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 | tail -3
```

**Document findings before writing any code.**

---

## Task 2.1: Create packages/validators/src/block.ts

Zod schemas for block create and update API payloads.

```typescript
import { z } from 'zod'

// ── Hooks schema ──

const hookPriceSchema = z.object({
  selector: z.string().min(1),
})

const hookLinkSchema = z.object({
  selector: z.string().min(1),
  field: z.string().min(1),
  label: z.string().optional(),
})

const hooksSchema = z.object({
  price: hookPriceSchema.optional(),
  links: z.array(hookLinkSchema).optional(),
}).default({})

// ── Metadata schema (extensible) ──

const metadataSchema = z.object({
  alt: z.string().optional(),
  figma_node: z.string().optional(),
}).passthrough().default({})

// ── Create block ──

export const createBlockSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  html: z.string().min(1),
  css: z.string().default(''),
  hooks: hooksSchema,
  metadata: metadataSchema,
})

// ── Update block (all fields optional except immutable slug) ──

export const updateBlockSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  html: z.string().min(1).optional(),
  css: z.string().optional(),
  hooks: hooksSchema.optional(),
  metadata: metadataSchema.optional(),
})

export type CreateBlockPayload = z.infer<typeof createBlockSchema>
export type UpdateBlockPayload = z.infer<typeof updateBlockSchema>
```

---

## Task 2.2: Create packages/validators/src/template.ts

Zod schemas for template create and update API payloads.

```typescript
import { z } from 'zod'

// ── Position schema ──

const positionSchema = z.object({
  position: z.number().int().min(1),
  block_id: z.string().uuid().nullable(),
})

// ── Create template ──

export const createTemplateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  positions: z.array(positionSchema).default([]),
  max_positions: z.number().int().min(1).max(100).default(20),
})

// ── Update template (all fields optional except immutable slug) ──

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  positions: z.array(positionSchema).optional(),
  max_positions: z.number().int().min(1).max(100).optional(),
})

export type CreateTemplatePayload = z.infer<typeof createTemplateSchema>
export type UpdateTemplatePayload = z.infer<typeof updateTemplateSchema>
```

---

## Task 2.3: Update packages/validators/src/index.ts

Add block and template exports:

```typescript
// ── Theme schemas ──
export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockFillSchema,
} from './theme'
export type { ThemeFormData } from './theme'

// ── Block schemas ──
export {
  createBlockSchema,
  updateBlockSchema,
} from './block'
export type { CreateBlockPayload, UpdateBlockPayload } from './block'

// ── Template schemas ──
export {
  createTemplateSchema,
  updateTemplateSchema,
} from './template'
export type { CreateTemplatePayload, UpdateTemplatePayload } from './template'
```

---

## Task 2.4: Create packages/db/src/queries/blocks.ts

CRUD query functions for blocks. Follow existing pattern from `themes.ts` and `profiles.ts`.

```typescript
import type { SupabaseClient } from '../client'
import type { BlockInsert, BlockUpdate } from '../types'

/** List all blocks, ordered by name */
export async function getBlocks(client: SupabaseClient) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single block by ID */
export async function getBlockById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Get a single block by slug */
export async function getBlockBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('blocks')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

/** Create a new block */
export async function createBlock(client: SupabaseClient, block: BlockInsert) {
  const { data, error } = await client
    .from('blocks')
    .insert(block)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing block by ID */
export async function updateBlock(client: SupabaseClient, id: string, updates: BlockUpdate) {
  const { data, error } = await client
    .from('blocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a block by ID */
export async function deleteBlock(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('blocks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Check if a block is used in any template.
 * Returns array of template slugs that reference this block_id.
 * Used for dependency check before delete.
 */
export async function getBlockUsage(client: SupabaseClient, blockId: string) {
  // Query templates where positions jsonb array contains this block_id
  // Supabase jsonb containment: filter positions array for block_id match
  const { data, error } = await client
    .from('templates')
    .select('slug, name, positions')
  if (error) throw error

  // Client-side filter: check if any position references this block_id
  // (Supabase doesn't support jsonb array element field filtering directly)
  const using = (data ?? []).filter(t =>
    Array.isArray(t.positions) &&
    t.positions.some((p: { block_id: string | null }) => p.block_id === blockId)
  )

  return using.map(t => ({ slug: t.slug, name: t.name }))
}
```

**Note on `getBlockUsage`:** Supabase PostgREST doesn't natively filter by jsonb array element fields. With <100 templates in MVP, client-side filter is acceptable. If this becomes a bottleneck, add a Postgres function or GIN index.

---

## Task 2.5: Create packages/db/src/queries/templates.ts

CRUD query functions for templates. Same pattern.

```typescript
import type { SupabaseClient } from '../client'
import type { TemplateInsert, TemplateUpdate } from '../types'

/** List all templates, ordered by name */
export async function getTemplates(client: SupabaseClient) {
  const { data, error } = await client
    .from('templates')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single template by ID */
export async function getTemplateById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Create a new template */
export async function createTemplate(client: SupabaseClient, template: TemplateInsert) {
  const { data, error } = await client
    .from('templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing template by ID */
export async function updateTemplate(client: SupabaseClient, id: string, updates: TemplateUpdate) {
  const { data, error } = await client
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a template by ID */
export async function deleteTemplate(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Check if a template is used by any theme.
 * Returns array of theme slugs that reference this template_id.
 * Used for dependency check before delete.
 */
export async function getTemplateUsage(client: SupabaseClient, templateId: string) {
  const { data, error } = await client
    .from('themes')
    .select('slug, meta')
    .eq('template_id', templateId)
  if (error) throw error
  return (data ?? []).map(t => ({ slug: t.slug, name: (t.meta as { name?: string })?.name ?? t.slug }))
}
```

---

## Task 2.6: Update packages/db/src/index.ts

Add exports for new query functions:

**Add after existing query exports:**

```typescript
// Block queries
export {
  getBlocks,
  getBlockById,
  getBlockBySlug,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from './queries/blocks'

// Template queries
export {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from './queries/templates'
```

Full file should be:

```typescript
export { createClient } from './client'
export type { SupabaseClient } from './client'

export type {
  Database,
  UserRole,
  ThemeStatus,
  LicenseType,
  ThemeMeta,
  ThemeSEO,
  BlockHooks,
  BlockMetadata,
  TemplatePosition,
  ThemeBlockFill,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Theme,
  ThemeInsert,
  ThemeUpdate,
  Block,
  BlockInsert,
  BlockUpdate,
  Template,
  TemplateInsert,
  TemplateUpdate,
  License,
  LicenseInsert,
  AuditEntry,
  AuditEntryInsert,
} from './types'

export { themeRowToFormData, formDataToThemeInsert } from './mappers'
export { getThemes, getThemeBySlug, upsertTheme } from './queries/themes'
export { getProfile, updateProfile } from './queries/profiles'
export { logAction } from './queries/audit'

export {
  getBlocks,
  getBlockById,
  getBlockBySlug,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from './queries/blocks'

export {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from './queries/templates'
```

---

## Task 2.7: npm install (if needed)

```bash
npm install
```

No new deps — validators uses only `zod` (already present), db uses only `@supabase/supabase-js` + `@cmsmasters/validators` (already present).

---

## Files to Create (4)

| File | Content |
|------|---------|
| `packages/validators/src/block.ts` | createBlockSchema, updateBlockSchema, payload types |
| `packages/validators/src/template.ts` | createTemplateSchema, updateTemplateSchema, payload types |
| `packages/db/src/queries/blocks.ts` | 7 functions: getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock, getBlockUsage |
| `packages/db/src/queries/templates.ts` | 6 functions: getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, getTemplateUsage |

## Files to Modify (2)

| File | Changes |
|------|---------|
| `packages/validators/src/index.ts` | Add block + template schema exports |
| `packages/db/src/index.ts` | Add block + template query exports |

---

## Acceptance Criteria

- [ ] `packages/validators/src/block.ts` exists with `createBlockSchema` + `updateBlockSchema`
- [ ] `packages/validators/src/template.ts` exists with `createTemplateSchema` + `updateTemplateSchema`
- [ ] `createBlockSchema` validates: slug (kebab), name, html (required), css, hooks, metadata
- [ ] `updateBlockSchema` validates: all optional except slug (not updatable)
- [ ] `createTemplateSchema` validates: slug, name, positions (array of {position, block_id}), max_positions
- [ ] `packages/db/src/queries/blocks.ts` exists with 7 CRUD functions
- [ ] `packages/db/src/queries/templates.ts` exists with 6 CRUD functions
- [ ] `getBlockUsage()` returns template slugs that reference a block
- [ ] `getTemplateUsage()` returns theme slugs that reference a template
- [ ] All new functions exported from `packages/db/src/index.ts`
- [ ] All new schemas exported from `packages/validators/src/index.ts`
- [ ] `npx tsc --noEmit --project packages/validators/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/db/tsconfig.json` — 0 errors
- [ ] Existing mapper test still passes (45 assertions)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005B Phase 2 Verification ==="

# 1. Files exist
echo "--- Files ---"
ls packages/validators/src/block.ts && echo "✅ block.ts"
ls packages/validators/src/template.ts && echo "✅ template.ts"
ls packages/db/src/queries/blocks.ts && echo "✅ queries/blocks.ts"
ls packages/db/src/queries/templates.ts && echo "✅ queries/templates.ts"

# 2. Validators export check
echo "--- Validators exports ---"
grep "createBlockSchema\|updateBlockSchema" packages/validators/src/index.ts
grep "createTemplateSchema\|updateTemplateSchema" packages/validators/src/index.ts
echo "(expected: 4 exports)"

# 3. DB exports check
echo "--- DB exports ---"
grep "getBlocks\|createBlock\|deleteBlock\|getBlockUsage" packages/db/src/index.ts
grep "getTemplates\|createTemplate\|deleteTemplate\|getTemplateUsage" packages/db/src/index.ts
echo "(expected: 13 query exports)"

# 4. TypeScript compilation
echo "--- TypeScript ---"
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 && echo "✅ validators" || echo "❌ validators FAILED"
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 && echo "✅ db" || echo "❌ db FAILED"

# 5. Existing mapper test still passes
echo "--- Existing tests ---"
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 && echo "✅ mapper test (45/45)" || echo "❌ mapper test FAILED"

# 6. Validator smoke test
echo "--- Validator smoke test ---"
npx tsx --tsconfig packages/validators/tsconfig.json -e "
  const { createBlockSchema, createTemplateSchema, updateBlockSchema } = require('./packages/validators/src/index');
  
  const validBlock = createBlockSchema.safeParse({ slug: 'fast-loading', name: 'Fast Loading', html: '<div>test</div>' });
  console.log('  createBlock valid:', validBlock.success ? '✅' : '❌');
  
  const noHtml = createBlockSchema.safeParse({ slug: 'test', name: 'Test' });
  console.log('  createBlock no html rejected:', !noHtml.success ? '✅' : '❌');
  
  const validTemplate = createTemplateSchema.safeParse({ slug: 'starter', name: 'Starter', positions: [{ position: 1, block_id: null }] });
  console.log('  createTemplate valid:', validTemplate.success ? '✅' : '❌');
  
  const partialUpdate = updateBlockSchema.safeParse({ name: 'New Name' });
  console.log('  updateBlock partial:', partialUpdate.success ? '✅' : '❌');
  
  const emptyUpdate = updateBlockSchema.safeParse({});
  console.log('  updateBlock empty:', emptyUpdate.success ? '✅' : '❌');
" 2>&1

echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005b/phase-2-result.md`

```markdown
# Execution Log: WP-005B Phase 2 — Zod Validators + DB Query Layer
> Epic: WP-005B DB Foundation + API
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ❌ FAILED

## What Was Done
{summary}

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Verification Results
| Check | Result |
|-------|--------|
| block.ts exists | ✅/❌ |
| template.ts exists | ✅/❌ |
| queries/blocks.ts exists | ✅/❌ |
| queries/templates.ts exists | ✅/❌ |
| validators exports | ✅/❌ |
| db exports | ✅/❌ |
| validators tsc | ✅/❌ |
| db tsc | ✅/❌ |
| mapper test (45) | ✅/❌ |
| validator smoke test | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

## Git

```bash
git add packages/validators/src/ packages/db/src/ logs/wp-005b/
git commit -m "feat: block + template validators and query layer [WP-005B phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Follow existing query pattern EXACTLY** — look at `themes.ts`: client injection first param, `if (error) throw error`, return raw data.
- **`getBlockUsage` uses client-side filter** — Supabase PostgREST can't filter by jsonb array element fields. This is intentional and documented. <100 templates makes it fine.
- **`getTemplateUsage` is simpler** — just `eq('template_id', id)` on themes table (regular column, not jsonb).
- **Do NOT modify any existing files** except `validators/index.ts` and `db/index.ts` (adding exports).
- **Do NOT create API routes** — that's Phase 3.
- **Do NOT create tests for queries** — manual testing via curl in Phase 3. Automated tests = future WP.
- **Slug is immutable** — `updateBlockSchema` and `updateTemplateSchema` don't include slug. Slug set at creation, never changed.
- **`metadata` schema uses `.passthrough()`** — allows unknown keys for extensibility (future fields).
- **Zod v4 quirk**: if `z.record()` requires 2 args, use `z.record(z.string(), z.unknown())`.
