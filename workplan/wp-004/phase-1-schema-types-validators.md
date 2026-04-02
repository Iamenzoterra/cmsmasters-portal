# WP-004 Phase 1: Schema Migration + Types + Validators + Boundary Mappers

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 1 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Backend (DB + packages)
> Previous: Phase 0 ✅ (RECON — flat-field inventory: 12 files, ~160+ refs, 0 RLS/API risk)
> Next: Phase 2 (Section registry — core 5 + stubs)

---

## Context

Phase 0 produced a complete inventory of all flat-field references (`logs/wp-004/phase-0-result.md`). This phase replaces the DB schema and all shared package contracts. After this phase, the DB, types, validators, and mappers are on the new shape. Studio code will NOT compile yet — that's Phase 3's job.

```
CURRENT:  27 flat columns in themes table                         ✅
CURRENT:  Flat types (Theme, ThemeInsert, ThemeUpdate)             ✅
CURRENT:  Flat validator (themeSchema with 23 top-level fields)    ✅
CURRENT:  Flat mappers (themeToFormData, formDataToUpsert)         ✅
MISSING:  meta/sections/seo jsonb columns                          ❌
MISSING:  Nested types (ThemeMeta, ThemeSection, ThemeSEO)         ❌
MISSING:  Nested validator ({ meta: metaSchema, sections, seo })   ❌
MISSING:  Thin boundary mappers (null→default only)                ❌
```

**CRITICAL DECISION (from Phase 0 review):** Form shape = nested, mirrors DB shape. Paths like `register('meta.name')`, `useFieldArray({ name: 'sections' })`. Mappers are thin (null→default conversions only). This is deliberate — see WP-004 Key Decisions table.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Phase 0 RECON is already done. But before writing any code, verify the LIVE DB matches expectations:

```bash
# 1. Verify actual columns in live Supabase (not just types.ts)
# Run via Supabase MCP: execute_sql on project yxcqtwuyktbjxstahfqj
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;

# Expected: 27 columns including the 6 ADR-009 ones (hero, compatible_plugins, trust_badges, rating, sales, resources)
# If ANY of the 6 ADR-009 columns are MISSING → they were never applied. Log this and proceed — DROP IF EXISTS handles it safely.

# 2. Verify 0 rows (cheapest moment assertion)
SELECT count(*) FROM public.themes;
# Expected: 0. If > 0, STOP and report to Brain.

# 3. Re-read Phase 0 inventory for context
cat logs/wp-004/phase-0-result.md
```

**Document your findings before writing any code.**

**IMPORTANT:** If `SELECT count(*)` returns > 0, STOP. Do not run the migration. Report the count and ask for guidance — we may need data migration logic.

---

## Task 1.1: DB Migration

### What to Build

Execute the migration SQL on the live Supabase DB via `execute_sql`.

```sql
-- Step 1: Drop all flat content columns
ALTER TABLE public.themes
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS demo_url,
  DROP COLUMN IF EXISTS themeforest_url,
  DROP COLUMN IF EXISTS themeforest_id,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS preview_images,
  DROP COLUMN IF EXISTS features,
  DROP COLUMN IF EXISTS included_plugins,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS hero,
  DROP COLUMN IF EXISTS compatible_plugins,
  DROP COLUMN IF EXISTS trust_badges,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS sales,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS custom_sections;

-- Step 2: Add jsonb columns
ALTER TABLE public.themes
  ADD COLUMN meta JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN sections JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN seo JSONB DEFAULT '{}';
```

### Post-migration verification

```sql
-- Confirm final column set
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns (9 total):
-- id         uuid        NOT NULL
-- slug       text        NOT NULL
-- status     text        NOT NULL
-- created_by uuid        YES
-- created_at timestamptz NOT NULL
-- updated_at timestamptz NOT NULL
-- meta       jsonb       NOT NULL  DEFAULT '{}'
-- sections   jsonb       NOT NULL  DEFAULT '[]'
-- seo        jsonb       YES       DEFAULT '{}'
```

Also save the migration SQL to the repo for documentation:

```
File: supabase/migrations/002_section_architecture.sql
Content: the SQL above with a header comment
```

---

## Task 1.2: Types Rewrite

### What to Build

Rewrite `packages/db/src/types.ts`. The entire file changes.

**Keep as-is:** `UserRole`, `ThemeStatus`, `LicenseType`, profiles/licenses/audit_log table types, convenience aliases for those.

**Remove:** `ThemeFeature`, `ThemePlugin`, `CustomSection`, `ThemeHero`, `ThemeResources` as standalone interfaces. Their shapes move into section schemas (Phase 2) or into ThemeMeta.

**New interfaces:**

```typescript
// packages/db/src/types.ts

// ── Theme meta (stored in themes.meta jsonb) ──

export interface ThemeMeta {
  name: string
  tagline?: string
  description?: string
  category?: string
  price?: number
  demo_url?: string
  themeforest_url?: string
  themeforest_id?: string
  thumbnail_url?: string
  preview_images?: string[]
  rating?: number
  sales?: number
  compatible_plugins?: string[]
  trust_badges?: string[]
  resources?: {
    public: string[]
    licensed: string[]
    premium: string[]
  }
}

// ── Section types (stored in themes.sections jsonb array) ──

export type SectionType =
  | 'theme-hero'
  | 'feature-grid'
  | 'plugin-comparison'
  | 'trust-strip'
  | 'related-themes'
  | 'before-after'
  | 'video-demo'
  | 'testimonials'
  | 'faq'
  | 'cta-banner'
  | 'stats-counter'
  | 'resource-sidebar'

export interface ThemeSection {
  type: SectionType
  data: Record<string, unknown>
}

// ── SEO (stored in themes.seo jsonb) ──

export interface ThemeSEO {
  title?: string
  description?: string
}
```

**Update the Database type:**

```typescript
// themes table in Database type
themes: {
  Row: {
    id: string
    slug: string
    status: ThemeStatus
    meta: ThemeMeta
    sections: ThemeSection[]
    seo: ThemeSEO | null
    created_by: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    slug: string
    status?: ThemeStatus
    meta: ThemeMeta
    sections?: ThemeSection[]
    seo?: ThemeSEO | null
    created_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    slug?: string
    status?: ThemeStatus
    meta?: ThemeMeta
    sections?: ThemeSection[]
    seo?: ThemeSEO | null
    created_by?: string | null
    updated_at?: string
  }
  Relationships: []
}
```

**Update convenience aliases** (same names, new shapes — auto-propagate):

```typescript
export type Theme = Database['public']['Tables']['themes']['Row']
export type ThemeInsert = Database['public']['Tables']['themes']['Insert']
export type ThemeUpdate = Database['public']['Tables']['themes']['Update']
```

**Update exports in `packages/db/src/index.ts`:**
- Remove: `ThemeFeature`, `ThemePlugin`, `ThemeHero`, `ThemeResources`, `CustomSection`
- Add: `ThemeMeta`, `SectionType`, `ThemeSection`, `ThemeSEO`
- Keep: `Theme`, `ThemeInsert`, `ThemeUpdate`, `ThemeStatus`

---

## Task 1.3: Validators Rewrite

### What to Build

Rewrite `packages/validators/src/theme.ts` to nested shape.

```typescript
// packages/validators/src/theme.ts
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

// ── Section schema (basic — Phase 2 adds per-type registry) ──

export const sectionSchema = z.object({
  type: z.string(),  // Phase 2 narrows this to SectionType enum
  data: z.record(z.string(), z.unknown()),
})

export const sectionsSchema = z.array(sectionSchema).default([])

// ── Top-level theme form schema (nested — mirrors DB shape) ──

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  meta: metaSchema.default({ name: '' }),
  sections: sectionsSchema,
  seo: seoSchema.default({ title: '', description: '' }),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
```

**IMPORTANT:** The `slug` and `status` fields stay at the top level — they're system columns in the DB, not content. The form shape is `{ slug, meta: {...}, sections: [...], seo: {...}, status }`.

**Update `packages/validators/src/index.ts`:**

```typescript
export { themeSchema, metaSchema, seoSchema, sectionSchema, sectionsSchema } from './theme'
export type { ThemeFormData } from './theme'
```

---

## Task 1.4: Thin Boundary Mappers

### What to Build

Create `packages/db/src/mappers.ts` with the two mapper functions. These are thin because the form shape mirrors the DB shape — they only handle null→default conversions.

```typescript
// packages/db/src/mappers.ts
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
    sections: row.sections ?? [],
    seo: {
      title: row.seo?.title ?? '',
      description: row.seo?.description ?? '',
    },
    status: row.status,
  }
}

/**
 * Form Data → DB Insert (thin: empty → null normalization)
 */
function emptyToNull(v: string | undefined): string | null {
  return v && v.trim() !== '' ? v.trim() : null
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
      tagline: emptyToNull(form.meta.tagline) ?? undefined,
      description: emptyToNull(form.meta.description) ?? undefined,
      category: emptyToNull(form.meta.category) ?? undefined,
      price: form.meta.price,
      demo_url: emptyToNull(form.meta.demo_url) ?? undefined,
      themeforest_url: emptyToNull(form.meta.themeforest_url) ?? undefined,
      themeforest_id: emptyToNull(form.meta.themeforest_id) ?? undefined,
      thumbnail_url: emptyToNull(form.meta.thumbnail_url) ?? undefined,
      preview_images: form.meta.preview_images.length > 0 ? form.meta.preview_images : undefined,
      rating: form.meta.rating,
      sales: form.meta.sales,
      compatible_plugins: form.meta.compatible_plugins.length > 0 ? form.meta.compatible_plugins : undefined,
      trust_badges: form.meta.trust_badges.length > 0 ? form.meta.trust_badges : undefined,
      resources: form.meta.resources,
    },
    sections: form.sections,
    seo: {
      title: emptyToNull(form.seo.title) ?? undefined,
      description: emptyToNull(form.seo.description) ?? undefined,
    },
  }
}
```

**Update `packages/db/src/index.ts`:**

```typescript
// Add export
export { themeRowToFormData, formDataToThemeInsert } from './mappers'
```

**IMPORTANT:** `@cmsmasters/validators` is imported in `packages/db`. Check that this dependency exists in `packages/db/package.json`. If not, add it — or keep `ThemeFormData` type import-only (`import type`).

---

## Task 1.5: Round-Trip Proof

### What to Build

A simple test script that proves the mapper pair is lossless.

Create `packages/db/src/__tests__/mappers.test.ts` (or a simpler inline script):

```typescript
// packages/db/src/__tests__/mappers.test.ts
import { themeRowToFormData, formDataToThemeInsert } from '../mappers'
import type { Theme } from '../types'

const mockRow: Theme = {
  id: 'test-uuid',
  slug: 'growth-hive',
  status: 'draft',
  meta: {
    name: 'Growth Hive',
    tagline: 'A modern business theme',
    description: 'Full description here',
    category: 'Business',
    price: 69,
    demo_url: 'https://demo.cmsmasters.net/growth-hive',
    themeforest_url: 'https://themeforest.net/item/growth-hive/12345',
    themeforest_id: '12345',
    thumbnail_url: 'https://example.com/thumb.jpg',
    preview_images: ['img1.jpg', 'img2.jpg'],
    rating: 4.8,
    sales: 1200,
    compatible_plugins: ['Elementor', 'WooCommerce'],
    trust_badges: ['Power Elite', 'Starter'],
    resources: {
      public: ['docs', 'changelog'],
      licensed: ['download', 'child-theme'],
      premium: ['priority-support'],
    },
  },
  sections: [
    { type: 'theme-hero', data: { headline: 'Build with Growth Hive', screenshots: ['s1.jpg'] } },
    { type: 'feature-grid', data: { features: [{ icon: '🚀', title: 'Fast', description: 'Blazing' }] } },
  ],
  seo: { title: 'Growth Hive - Business Theme', description: 'A modern business WP theme' },
  created_by: 'user-uuid',
  created_at: '2026-03-30T10:00:00Z',
  updated_at: '2026-03-30T10:00:00Z',
}

// Round-trip: Row → FormData → Insert
const formData = themeRowToFormData(mockRow)
const insert = formDataToThemeInsert(formData, mockRow.id)

// Verify key fields survive
console.log('=== Round-Trip Proof ===')
console.log('meta.name:', insert.meta.name === 'Growth Hive' ? '✅' : '❌')
console.log('meta.price:', insert.meta.price === 69 ? '✅' : '❌')
console.log('meta.rating:', insert.meta.rating === 4.8 ? '✅' : '❌')
console.log('sections length:', insert.sections?.length === 2 ? '✅' : '❌')
console.log('sections[0].type:', insert.sections?.[0]?.type === 'theme-hero' ? '✅' : '❌')
console.log('sections[1].data:', JSON.stringify(insert.sections?.[1]?.data).includes('Fast') ? '✅' : '❌')
console.log('seo.title:', insert.seo?.title === 'Growth Hive - Business Theme' ? '✅' : '❌')
console.log('slug:', insert.slug === 'growth-hive' ? '✅' : '❌')
console.log('status:', insert.status === 'draft' ? '✅' : '❌')
console.log('id preserved:', insert.id === 'test-uuid' ? '✅' : '❌')
console.log('=== Done ===')
```

Run with `npx tsx packages/db/src/__tests__/mappers.test.ts` (or compile + node).

**Acceptance:** All checks print ✅. If ANY prints ❌, fix the mapper before moving on.

---

## Files to Modify

- `supabase/migrations/002_section_architecture.sql` — **new** (migration SQL)
- `packages/db/src/types.ts` — **rewrite** (ThemeMeta, ThemeSection, ThemeSEO, Database.themes)
- `packages/db/src/index.ts` — **update** (remove old type exports, add new ones + mappers)
- `packages/db/src/mappers.ts` — **new** (themeRowToFormData, formDataToThemeInsert)
- `packages/db/src/__tests__/mappers.test.ts` — **new** (round-trip proof)
- `packages/validators/src/theme.ts` — **rewrite** (metaSchema, seoSchema, nested themeSchema)
- `packages/validators/src/index.ts` — **update** (re-export new schemas)

---

## Acceptance Criteria

- [ ] Live DB has 9 columns: id, slug, status, meta, sections, seo, created_by, created_at, updated_at
- [ ] 0 flat content columns remain
- [ ] `ThemeMeta`, `ThemeSection`, `ThemeSEO` interfaces exist and are exported
- [ ] `SectionType` is a literal union of 12 types (not bare `string`)
- [ ] `themeSchema` is nested: `{ slug, meta: {...}, sections: [...], seo: {...}, status }`
- [ ] `ThemeFormData` inferred from nested schema
- [ ] `themeRowToFormData` + `formDataToThemeInsert` exist in `packages/db/src/mappers.ts`
- [ ] Round-trip proof passes: all checks ✅
- [ ] `packages/db` and `packages/validators` compile: `npx tsc --noEmit`
- [ ] Migration SQL saved to `supabase/migrations/002_section_architecture.sql`

**Note:** Studio and other apps will NOT compile after this phase — that's expected and fixed in Phase 3.

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. DB column check (run via Supabase MCP)
echo "Run: SELECT column_name FROM information_schema.columns WHERE table_name='themes' AND table_schema='public' ORDER BY ordinal_position;"
echo "(Expected: id, slug, status, created_by, created_at, updated_at, meta, sections, seo)"

# 2. Types compile
npx tsc --noEmit --project packages/db/tsconfig.json
echo "(Expected: 0 errors)"

# 3. Validators compile
npx tsc --noEmit --project packages/validators/tsconfig.json
echo "(Expected: 0 errors)"

# 4. Round-trip proof
npx tsx packages/db/src/__tests__/mappers.test.ts
echo "(Expected: all ✅)"

# 5. Migration file exists
test -f supabase/migrations/002_section_architecture.sql && echo "✅ Migration file exists" || echo "❌ Migration file missing"

# 6. Mappers file exists
test -f packages/db/src/mappers.ts && echo "✅ Mappers file exists" || echo "❌ Mappers file missing"

echo "=== Phase 1 Verification Complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-004/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-004 Phase 1 — Schema Migration + Types + Validators + Mappers
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

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
{Non-blocking questions for Brain. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| DB columns (9 total) | ✅/❌ |
| packages/db compiles | ✅/❌ |
| packages/validators compiles | ✅/❌ |
| Round-trip proof | ✅/❌ |
| Migration SQL saved | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/db/ packages/validators/ supabase/migrations/ logs/wp-004/
git commit -m "feat: section architecture — DB migration + types + validators + mappers [WP-004 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify any files in `apps/studio/` in this phase.** Studio will break after types change — that's expected and handled in Phase 3.
- **Do NOT run `npx tsc --noEmit` on the entire monorepo.** Only check `packages/db` and `packages/validators`. Studio errors are expected.
- **Verify live DB columns BEFORE running DROP.** Phase 0 found a schema mismatch (6 ADR-009 columns in types.ts but not in initial migration). Use `information_schema` to check what actually exists.
- **If themes table has > 0 rows, STOP.** Do not proceed with the migration. Report to Brain.
- **`@cmsmasters/validators` dependency in packages/db:** The mappers import `ThemeFormData` from validators. Use `import type` to avoid circular dependency. If the dep doesn't exist in package.json, add it as a devDependency or use type-only import.
- **Zod v4 quirk:** `z.record()` requires 2 arguments: `z.record(z.string(), z.unknown())` — already in the code samples above.
- **The `emptyToNull()` helper** moves from `apps/studio/src/lib/form-defaults.ts` to `packages/db/src/mappers.ts` (or define locally). Don't import from Studio — packages must not depend on apps.
