# WP-005B Phase 1: Supabase Migration — blocks + templates Tables, themes Alter

> Workplan: WP-005B DB Foundation + Hono API for Blocks & Templates
> Phase: 1 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Backend (SQL migration + TypeScript types)
> Previous: Phase 0 ✅ (RECON — schema inventoried, 1 row in themes, sections column confirmed in DB)
> Next: Phase 2 (Zod Validators + DB Query Layer)

---

## Context

Phase 0 RECON confirmed:
- **4 tables** in Supabase: profiles, themes, licenses, audit_log
- **themes has 1 row** (test data) — `sections` column is jsonb, NOT NULL, default '[]'
- **`sections` column exists in actual DB** — WP-005A only changed TypeScript types, never ALTER'd the DB
- **`update_updated_at()` function exists** — reuse for new tables (trigger pattern: `CREATE TRIGGER {table}_updated BEFORE UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION update_updated_at()`)
- **RLS pattern**: `get_user_role()` function returns role from profiles; policies use `(SELECT public.get_user_role()) IN ('content_manager', 'admin')`
- **No DELETE policy on themes** — needs adding
- **blocks + templates tables do NOT exist** — confirmed

This phase creates 2 new tables, alters themes, adds RLS + triggers, and updates `packages/db/src/types.ts` to match.

```
CURRENT DB:
  profiles ✅, themes ✅ (with sections jsonb), licenses ✅, audit_log ✅

AFTER THIS PHASE:
  blocks (NEW)      — id, slug, name, html, css, hooks, metadata, created_by, timestamps
  templates (NEW)   — id, slug, name, description, positions, max_positions, created_by, timestamps
  themes (ALTERED)  — sections DROPPED, template_id + block_fills ADDED
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 0 log exists
head -5 logs/wp-005b/phase-0-result.md

# 2. Verify tables current state via Supabase MCP
# Use: Supabase:execute_sql project_id=yxcqtwuyktbjxstahfqj
# SQL: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
# Expected: profiles, themes, licenses, audit_log (NO blocks, NO templates)

# 3. Verify themes has sections column
# SQL: SELECT column_name FROM information_schema.columns WHERE table_name = 'themes' AND column_name = 'sections';
# Expected: 1 row

# 4. Check row count
# SQL: SELECT count(*) FROM themes;
# Expected: 1

# 5. Baseline tsc
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 | tail -3
```

**Document your findings before writing any SQL.**

**IMPORTANT:** themes has 1 test row. The migration will delete this row's sections data when we DROP the column. This is acceptable — it's test data. But log it explicitly.

---

## Task 1.1: Run SQL Migration via Supabase MCP

Execute this SQL via `Supabase:execute_sql` (project_id: `yxcqtwuyktbjxstahfqj`).

Run in **3 separate execute_sql calls** to isolate errors:

### Call 1: CREATE blocks table + RLS + trigger

```sql
-- ============================================
-- WP-005B Migration Part 1: blocks table
-- ============================================

-- Table
CREATE TABLE public.blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  html text NOT NULL,
  css text NOT NULL DEFAULT '',
  hooks jsonb NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY blocks_select_auth ON public.blocks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY blocks_insert_staff ON public.blocks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

CREATE POLICY blocks_update_staff ON public.blocks
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('content_manager', 'admin'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

CREATE POLICY blocks_delete_staff ON public.blocks
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

-- Trigger (reuse existing function)
CREATE TRIGGER blocks_updated
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Call 2: CREATE templates table + RLS + trigger

```sql
-- ============================================
-- WP-005B Migration Part 2: templates table
-- ============================================

-- Table
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  positions jsonb NOT NULL DEFAULT '[]',
  max_positions int NOT NULL DEFAULT 20,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY templates_select_auth ON public.templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY templates_insert_staff ON public.templates
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

CREATE POLICY templates_update_staff ON public.templates
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('content_manager', 'admin'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

CREATE POLICY templates_delete_staff ON public.templates
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));

-- Trigger (reuse existing function)
CREATE TRIGGER templates_updated
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Call 3: ALTER themes — drop sections, add template_id + block_fills + delete policy

```sql
-- ============================================
-- WP-005B Migration Part 3: themes alter
-- ============================================

-- Drop sections column (1 test row — data loss accepted, logged)
ALTER TABLE public.themes DROP COLUMN IF EXISTS sections;

-- Add new columns
ALTER TABLE public.themes ADD COLUMN template_id uuid REFERENCES public.templates(id);
ALTER TABLE public.themes ADD COLUMN block_fills jsonb NOT NULL DEFAULT '[]';

-- Add missing DELETE policy (RECON found none)
CREATE POLICY themes_delete_staff ON public.themes
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('content_manager', 'admin'));
```

---

## Task 1.2: Verify Migration via SQL

Run these verification queries after migration:

```sql
-- 1. blocks table exists with correct columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'blocks' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. templates table exists with correct columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'templates' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. themes table — sections gone, template_id + block_fills present
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. RLS policies on blocks (should be 4: select, insert, update, delete)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'blocks';

-- 5. RLS policies on templates (should be 4)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'templates';

-- 6. RLS policies on themes (should now include delete)
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'themes';

-- 7. Triggers on new tables
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('blocks', 'templates');

-- 8. Test row survived (minus sections)
SELECT id, slug, status, template_id, block_fills FROM themes;
```

---

## Task 1.3: Update packages/db/src/types.ts

This is the largest file change. Update the `Database` type to match the new schema.

### Changes:

**1. Remove `ThemeBlock` interface and `BlockId` type** (dead — no sections column):

Find and remove:
```typescript
// ── Block types (stored in themes.sections jsonb array) ──
// BlockId = string slug (dynamic from DB, not hardcoded enum)
// NOTE: themes.sections will be replaced by template_id + block_fills in WP-005B

export type BlockId = string

export interface ThemeBlock {
  block: BlockId
  data: Record<string, unknown>
}
```

**2. Add Block and Template interfaces** before Database type:

```typescript
// ── Block (stored in blocks table) ──

export interface BlockHooks {
  price?: { selector: string }
  links?: Array<{ selector: string; field: string; label?: string }>
}

export interface BlockMetadata {
  alt?: string
  figma_node?: string
  [key: string]: unknown  // extensible
}

// ── Template position ──

export interface TemplatePosition {
  position: number
  block_id: string | null
}

// ── Theme block fill (per-theme additions to template) ──

export interface ThemeBlockFill {
  position: number
  block_id: string
}
```

**3. Add `blocks` and `templates` to `Database.public.Tables`:**

```typescript
blocks: {
  Row: {
    id: string
    slug: string
    name: string
    html: string
    css: string
    hooks: BlockHooks
    metadata: BlockMetadata
    created_by: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    slug: string
    name: string
    html: string
    css?: string
    hooks?: BlockHooks
    metadata?: BlockMetadata
    created_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    slug?: string
    name?: string
    html?: string
    css?: string
    hooks?: BlockHooks
    metadata?: BlockMetadata
    created_by?: string | null
    updated_at?: string
  }
  Relationships: []
}
templates: {
  Row: {
    id: string
    slug: string
    name: string
    description: string | null
    positions: TemplatePosition[]
    max_positions: number
    created_by: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    slug: string
    name: string
    description?: string
    positions?: TemplatePosition[]
    max_positions?: number
    created_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    slug?: string
    name?: string
    description?: string
    positions?: TemplatePosition[]
    max_positions?: number
    created_by?: string | null
    updated_at?: string
  }
  Relationships: []
}
```

**4. Update `themes` in Database type** — remove `sections`, add `template_id` + `block_fills`:

In `themes.Row`, replace:
```typescript
sections: ThemeBlock[]
```
With:
```typescript
template_id: string | null
block_fills: ThemeBlockFill[]
```

Same for `themes.Insert`:
```typescript
// Remove: sections?: ThemeBlock[]
template_id?: string | null
block_fills?: ThemeBlockFill[]
```

Same for `themes.Update`:
```typescript
// Remove: sections?: ThemeBlock[]
template_id?: string | null
block_fills?: ThemeBlockFill[]
```

**5. Add convenience aliases** at the bottom:

```typescript
export type Block = Database['public']['Tables']['blocks']['Row']
export type BlockInsert = Database['public']['Tables']['blocks']['Insert']
export type BlockUpdate = Database['public']['Tables']['blocks']['Update']

export type Template = Database['public']['Tables']['templates']['Row']
export type TemplateInsert = Database['public']['Tables']['templates']['Insert']
export type TemplateUpdate = Database['public']['Tables']['templates']['Update']
```

---

## Task 1.4: Update packages/db/src/index.ts

**Remove:** `BlockId`, `ThemeBlock` exports

**Add:** `Block`, `BlockInsert`, `BlockUpdate`, `Template`, `TemplateInsert`, `TemplateUpdate`, `BlockHooks`, `BlockMetadata`, `TemplatePosition`, `ThemeBlockFill`

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
```

---

## Task 1.5: Update packages/db/src/mappers.ts

Replace `sections` references with `template_id` + `block_fills`:

```typescript
import type { Theme, ThemeInsert } from './types'
import type { ThemeFormData } from '@cmsmasters/validators'

/**
 * DB Row → Form Data (thin: null → defaults only)
 */
export function themeRowToFormData(row: Theme): ThemeFormData {
  return {
    slug: row.slug,
    meta: {
      name: row.meta.name ?? '',
      tagline: row.meta.tagline ?? '',
      description: row.meta.description ?? '',
      category: row.meta.category ?? '',
      price: row.meta.price ?? undefined,
      demo_url: row.meta.demo_url ?? '',
      themeforest_url: row.meta.themeforest_url ?? '',
      themeforest_id: row.meta.themeforest_id ?? '',
      thumbnail_url: row.meta.thumbnail_url ?? '',
      preview_images: row.meta.preview_images ?? [],
      rating: row.meta.rating ?? undefined,
      sales: row.meta.sales ?? undefined,
      compatible_plugins: row.meta.compatible_plugins ?? [],
      trust_badges: row.meta.trust_badges ?? [],
      resources: row.meta.resources ?? { public: [], licensed: [], premium: [] },
    },
    template_id: row.template_id ?? '',
    block_fills: row.block_fills ?? [],
    seo: {
      title: row.seo?.title ?? '',
      description: row.seo?.description ?? '',
    },
    status: row.status,
  }
}

/**
 * Form Data → DB Insert (thin: empty → undefined normalization)
 */
function emptyToNull(v: string | undefined): string | undefined {
  const trimmed = v?.trim()
  return trimmed && trimmed !== '' ? trimmed : undefined
}

export function formDataToThemeInsert(
  form: ThemeFormData,
  existingId?: string
): ThemeInsert {
  return {
    ...(existingId ? { id: existingId } : {}),
    slug: form.slug,
    status: form.status,
    meta: {
      name: form.meta.name,
      tagline: emptyToNull(form.meta.tagline),
      description: emptyToNull(form.meta.description),
      category: emptyToNull(form.meta.category),
      price: form.meta.price,
      demo_url: emptyToNull(form.meta.demo_url),
      themeforest_url: emptyToNull(form.meta.themeforest_url),
      themeforest_id: emptyToNull(form.meta.themeforest_id),
      thumbnail_url: emptyToNull(form.meta.thumbnail_url),
      preview_images: form.meta.preview_images.length > 0 ? form.meta.preview_images : undefined,
      rating: form.meta.rating,
      sales: form.meta.sales,
      compatible_plugins: form.meta.compatible_plugins.length > 0 ? form.meta.compatible_plugins : undefined,
      trust_badges: form.meta.trust_badges.length > 0 ? form.meta.trust_badges : undefined,
      resources: form.meta.resources,
    },
    template_id: form.template_id || undefined,
    block_fills: form.block_fills.length > 0 ? form.block_fills : undefined,
    seo: {
      title: emptyToNull(form.seo.title),
      description: emptyToNull(form.seo.description),
    },
  }
}
```

---

## Task 1.6: Update packages/validators/src/theme.ts

Replace `blockSchema`/`blocksSchema`/`sections` with `template_id` + `block_fills`:

```typescript
import { z } from 'zod'

// ── Meta schema ──

export const metaSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_id: z.string().optional().default(''),
  thumbnail_url: z.string().optional().default(''),
  preview_images: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).optional(),
  sales: z.number().int().min(0).optional(),
  compatible_plugins: z.array(z.string()).default([]),
  trust_badges: z.array(z.string()).default([]),
  resources: z.object({
    public: z.array(z.string()).default([]),
    licensed: z.array(z.string()).default([]),
    premium: z.array(z.string()).default([]),
  }).default({ public: [], licensed: [], premium: [] }),
})

// ── SEO schema ──

export const seoSchema = z.object({
  title: z.string().max(70).optional().default(''),
  description: z.string().max(160).optional().default(''),
})

// ── Block fill schema (per-theme additions) ──

export const blockFillSchema = z.object({
  position: z.number().int().min(1),
  block_id: z.string().uuid(),
})

// ── Top-level theme form schema ──

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  meta: metaSchema,
  template_id: z.string().uuid().optional().or(z.literal('')).default(''),
  block_fills: z.array(blockFillSchema).default([]),
  seo: seoSchema,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
```

---

## Task 1.7: Update packages/validators/src/index.ts

Remove dead `blockSchema`/`blocksSchema` exports, add `blockFillSchema`:

```typescript
// ── Theme schemas ──
export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockFillSchema,
} from './theme'
export type { ThemeFormData } from './theme'
```

---

## Task 1.8: Update Studio form-defaults.ts

Replace `sections: []` with new fields:

```typescript
import type { ThemeFormData } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * template_id empty — 005C adds template picker.
 * block_fills empty — CM fills via "+" in editor.
 */
export function getDefaults(): ThemeFormData {
  return {
    slug: '',
    meta: {
      name: '',
      tagline: '',
      description: '',
      category: '',
      demo_url: '',
      themeforest_url: '',
      themeforest_id: '',
      thumbnail_url: '',
      preview_images: [],
      compatible_plugins: [],
      trust_badges: [],
      resources: { public: [], licensed: [], premium: [] },
    },
    template_id: '',
    block_fills: [],
    seo: { title: '', description: '' },
    status: 'draft',
  }
}

/**
 * Auto-generate slug from name (kebab-case).
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
}
```

---

## Task 1.9: Update Studio theme-editor.tsx — Remove Sections Builder

The entire SectionsList + SectionEditor + StubEditor block must be removed and replaced with a placeholder. This is ~200 lines of code.

### 1.9a: Remove sections-related imports and useFieldArray

**Remove:**
```typescript
import { useForm, useFieldArray, useWatch, useController } from 'react-hook-form'
```
**Replace with:**
```typescript
import { useForm, useWatch, useController } from 'react-hook-form'
```

(Keep `useController` — `StubEditor` used it but check if anything else does. If only StubEditor used it, remove.)

**Remove:**
```typescript
const sectionsArray = useFieldArray({ control, name: 'sections' })
```

### 1.9b: Remove SectionsList JSX from the form body

Find the `{/* Section Builder */}` block in the JSX that renders `<SectionsList ... />` and replace with:

```tsx
{/* Block & Template management — WP-005C */}
<FormSection title="Content Blocks">
  <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
    Template and block management coming in next update. Use theme meta to configure theme details.
  </p>
</FormSection>
```

### 1.9c: Delete entire SectionsList component (~110 lines)

Delete the `function SectionsList(...)` component and its `SectionsListProps` interface.

### 1.9d: Delete SectionEditor + StubEditor (~55 lines)

Delete `function SectionEditor(...)` and `function StubEditor(...)`.

### 1.9e: Clean up unused imports

After removing sections code, check and remove:
- `useFieldArray` (if no longer used)
- `useController` (if only StubEditor used it)
- `ChevronUp`, `ChevronDown`, `Plus`, `X` from lucide-react (check if still used elsewhere in the file)

**IMPORTANT:** `useWatch` is still used for `seoTitle`, `seoDesc`, `formSlug`, `watchedName`. Keep it.

---

## Task 1.10: Update mappers test

`packages/db/src/__tests__/mappers.test.ts` — update fixtures from `sections` to `template_id` + `block_fills`:

### Sparse row (Scenario 1):

**Replace:**
```typescript
sections: [],
```
**With:**
```typescript
template_id: null,
block_fills: [],
```

**Replace assertion:**
```typescript
assert('sections defaults to []', ...)
```
**With:**
```typescript
assert('template_id defaults to empty string', sparseForm.template_id === '')
assert('block_fills defaults to []', Array.isArray(sparseForm.block_fills) && sparseForm.block_fills.length === 0)
```

### Filled row (Scenario 2):

**Replace:**
```typescript
sections: [
  { block: 'theme-hero', data: { headline: 'Build with Growth Hive', screenshots: ['s1.jpg'] } },
  { block: 'feature-grid', data: { features: [{ icon: '🚀', title: 'Fast', description: 'Blazing' }] } },
],
```
**With:**
```typescript
template_id: 'template-uuid-1',
block_fills: [
  { position: 1, block_id: 'block-uuid-1' },
  { position: 5, block_id: 'block-uuid-2' },
],
```

**Update corresponding assertions.**

### Scenario 3 (BlockId Enforcement):

**Remove entirely** — `blockSchema` no longer exists. Replace with:

```typescript
console.log('\n=== Scenario 3: Template + Block Fill Shape ===')

const validTheme = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  template_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  block_fills: [{ position: 1, block_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' }],
  seo: {},
  status: 'draft',
})
assert('valid theme with template accepted', validTheme.success)

const emptyTemplate = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  template_id: '',
  block_fills: [],
  seo: {},
  status: 'draft',
})
assert('theme with empty template_id accepted', emptyTemplate.success)

const invalidFill = themeSchema.safeParse({
  slug: 'test-theme',
  meta: { name: 'Test' },
  block_fills: [{ position: 0, block_id: 'not-a-uuid' }],
  seo: {},
})
assert('block_fill with position 0 rejected', !invalidFill.success)
```

**Update test imports:**
```typescript
import { themeRowToFormData, formDataToThemeInsert } from '../mappers'
import { themeSchema } from '@cmsmasters/validators'
import type { Theme } from '../types'
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/db/src/types.ts` | Remove BlockId/ThemeBlock, add Block/Template types + Database entries, update themes |
| `packages/db/src/index.ts` | Export new types, remove dead exports |
| `packages/db/src/mappers.ts` | sections → template_id + block_fills |
| `packages/db/src/__tests__/mappers.test.ts` | Fixtures + assertions updated |
| `packages/validators/src/theme.ts` | Remove blockSchema/blocksSchema/sections, add blockFillSchema + template_id |
| `packages/validators/src/index.ts` | Remove dead exports, add blockFillSchema |
| `apps/studio/src/pages/theme-editor.tsx` | Remove ~200 lines (SectionsList, SectionEditor, StubEditor, useFieldArray) |
| `apps/studio/src/lib/form-defaults.ts` | sections → template_id + block_fills |

---

## Acceptance Criteria

- [ ] `blocks` table exists in Supabase (10 columns: id, slug, name, html, css, hooks, metadata, created_by, created_at, updated_at)
- [ ] `templates` table exists (9 columns: id, slug, name, description, positions, max_positions, created_by, created_at, updated_at)
- [ ] `themes.sections` column **dropped**
- [ ] `themes.template_id` column exists (uuid, nullable, FK → templates)
- [ ] `themes.block_fills` column exists (jsonb, NOT NULL, default '[]')
- [ ] `themes_delete_staff` RLS policy exists
- [ ] 4 RLS policies on blocks (select, insert, update, delete)
- [ ] 4 RLS policies on templates (select, insert, update, delete)
- [ ] `blocks_updated` and `templates_updated` triggers exist
- [ ] `packages/db/src/types.ts` has Block + Template in Database type
- [ ] Zero references to `sections` in types.ts, mappers.ts, theme.ts, form-defaults.ts
- [ ] `npx tsc --noEmit --project packages/db/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/validators/tsconfig.json` — 0 errors
- [ ] Mapper test passes with new fixtures

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005B Phase 1 Verification ==="

# 1. DB verification (via Supabase MCP — run these as execute_sql)
echo "--- Run these SQL queries via Supabase MCP ---"
echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blocks' AND table_schema = 'public' ORDER BY ordinal_position;"
echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'templates' AND table_schema = 'public' ORDER BY ordinal_position;"
echo "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'themes' AND table_schema = 'public' ORDER BY ordinal_position;"
echo "SELECT policyname, cmd FROM pg_policies WHERE tablename IN ('blocks', 'templates', 'themes') ORDER BY tablename, policyname;"
echo "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table IN ('blocks', 'templates');"

# 2. sections column gone
echo "--- sections column check ---"
grep -rn "sections" packages/db/src/types.ts packages/db/src/mappers.ts packages/validators/src/theme.ts apps/studio/src/lib/form-defaults.ts | grep -v "node_modules" | grep -v "\.md" | grep -v "comment"
echo "(expected: 0 matches in runtime code)"

# 3. tsc
echo "--- TypeScript ---"
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 && echo "✅ db" || echo "❌ db FAILED"
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 && echo "✅ validators" || echo "❌ validators FAILED"

# 4. Mapper test
echo "--- Tests ---"
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 && echo "✅ mapper test" || echo "❌ mapper test FAILED"

# 5. Studio section builder removed
echo "--- Studio sections check ---"
grep -c "SectionsList\|SectionEditor\|StubEditor\|sectionsArray" apps/studio/src/pages/theme-editor.tsx
echo "(expected: 0)"

echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005b/phase-1-result.md`

```markdown
# Execution Log: WP-005B Phase 1 — Supabase Migration
> Epic: WP-005B DB Foundation + API
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ❌ FAILED

## What Was Done
{summary}

## SQL Executed
{3 migration calls — results}

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Data Impact
- themes row count before: {1}
- themes row count after: {1}
- sections data lost: {yes — test data, accepted}

## Verification Results
| Check | Result |
|-------|--------|
| blocks table (10 columns) | ✅/❌ |
| templates table (9 columns) | ✅/❌ |
| themes.sections dropped | ✅/❌ |
| themes.template_id added | ✅/❌ |
| themes.block_fills added | ✅/❌ |
| blocks RLS (4 policies) | ✅/❌ |
| templates RLS (4 policies) | ✅/❌ |
| themes_delete_staff policy | ✅/❌ |
| triggers on blocks + templates | ✅/❌ |
| db tsc | ✅/❌ |
| validators tsc | ✅/❌ |
| mapper test | ✅/❌ |
| Zero sections refs in runtime | ✅/❌ |
| Studio sections builder removed | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

## Git

```bash
git add packages/db/ packages/validators/ apps/studio/src/ logs/wp-005b/
git commit -m "feat: blocks + templates tables, themes migration, types update [WP-005B phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Run SQL in 3 separate calls** — if one fails, the others may have succeeded. Easier to debug.
- **Verify each SQL call succeeded** before proceeding to the next.
- **themes has 1 test row** — ALTER TABLE DROP sections will delete that column's data. This is expected and accepted. Log it.
- **`useController` in theme-editor.tsx** — check if anything besides StubEditor uses it. If only StubEditor → remove import. If EditorSidebar or other components use it → keep.
- **`ChevronUp`, `ChevronDown`, `Plus`, `X` imports** — check if used elsewhere in theme-editor.tsx before removing. `Plus` might be used for something other than sections.
- **Do NOT modify `packages/db/src/queries/themes.ts`** in this phase — query layer update is Phase 2.
- **Do NOT create blocks.ts or templates.ts queries** — that's Phase 2.
- **Do NOT create API routes** — that's Phase 3.
- **Supabase MCP project ID:** `yxcqtwuyktbjxstahfqj`
- **`search_path` security:** Use `public.` prefix on all table/function references in SQL (existing convention from WP-002 bugfix).
