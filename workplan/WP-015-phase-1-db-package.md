# WP-015 Phase 1: Database + Package Layer

> Workplan: WP-015 Use Cases Taxonomy
> Phase: 1 of 4
> Priority: P1
> Estimated: 1-1.5 hours
> Type: Backend
> Previous: Phase 0 ✅ (RECON — pattern confirmed, all findings documented)
> Next: Phase 2 (Studio UI — TagInput + Sidebar)
> Affected domains: pkg-db

---

## Context

```
CURRENT:  17 tables typed in packages/db/src/types.ts                          ✅
CURRENT:  tags pattern: CRUD + junction (delete-all + re-insert)               ✅
CURRENT:  index.ts re-exports all queries + types per entity                   ✅
CURRENT:  pkg-db owned_tables lists only 13 original tables (drift)            ⚠️
MISSING:  use_cases table in Supabase                                          ❌
MISSING:  theme_use_cases junction table                                       ❌
MISSING:  Typed queries for use cases                                          ❌
MISSING:  searchUseCases() for autocomplete (new pattern — no ILIKE in tags)   ❌
```

This phase creates the data layer: Supabase migration, typed queries following the tags.ts
pattern exactly, plus a new `searchUseCases` query for autocomplete (ILIKE + LIMIT).

---

## Domain Context

**pkg-db:**
- Key invariants: all queries take SupabaseClient as first arg; types.ts has Row/Insert/Update per table; index.ts re-exports everything
- Known traps: junction uses delete-all + re-insert (not upsert); `.maybeSingle()` for getBySlug, `.single()` for getById
- Public API: `packages/db/src/index.ts`
- Blast radius: changing types.ts affects ALL consumers; adding new exports is safe

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skill
cat .claude/skills/domains/pkg-db/SKILL.md

# 2. Verify tags.ts still matches expected pattern
cat packages/db/src/queries/tags.ts

# 3. Check current owned_tables in manifest
grep -A 20 "owned_tables" src/__arch__/domain-manifest.ts | head -25

# 4. Verify types.ts table count
grep "Row:" packages/db/src/types.ts | wc -l

# 5. Baseline test
npm run arch-test
```

**Document your findings before writing any code.**

**IMPORTANT:** The `searchUseCases` function is a NEW pattern not present in tags/categories. It uses ILIKE for fuzzy matching — test that RLS allows anon reads (public read policy).

---

## Task 1.1: Supabase Migration

### What to Build

Run this SQL in Supabase dashboard (project: yxcqtwuyktbjxstahfqj):

```sql
-- use_cases: shared pool of use case entries
CREATE TABLE use_cases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- junction: many-to-many theme <> use_case
CREATE TABLE theme_use_cases (
  theme_id    uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, use_case_id)
);

-- RLS
ALTER TABLE use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_use_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "use_cases_read" ON use_cases FOR SELECT USING (true);
CREATE POLICY "use_cases_write" ON use_cases FOR ALL
  USING (get_user_role() IN ('admin', 'content_manager'));

CREATE POLICY "theme_use_cases_read" ON theme_use_cases FOR SELECT USING (true);
CREATE POLICY "theme_use_cases_write" ON theme_use_cases FOR ALL
  USING (get_user_role() IN ('admin', 'content_manager'));

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON use_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Domain Rules
- RLS must be enabled on both tables
- Public read, admin/content_manager write — matches categories/tags policy pattern
- ON DELETE CASCADE on both FKs — removing a use_case auto-cleans all junctions

---

## Task 1.2: Add Types to `packages/db/src/types.ts`

### What to Build

Add `use_cases` and `theme_use_cases` table definitions to the `Database` type, following the exact pattern of `tags` and `theme_tags`.

```typescript
// Add inside Database['public']['Tables'] — after theme_prices block:

      use_cases: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      theme_use_cases: {
        Row: {
          theme_id: string
          use_case_id: string
        }
        Insert: {
          theme_id: string
          use_case_id: string
        }
        Update: {
          theme_id?: string
          use_case_id?: string
        }
        Relationships: []
      }
```

Add convenience aliases after existing BlockCategory aliases (end of file):

```typescript
export type UseCase = Database['public']['Tables']['use_cases']['Row']
export type UseCaseInsert = Database['public']['Tables']['use_cases']['Insert']
export type UseCaseUpdate = Database['public']['Tables']['use_cases']['Update']

export type ThemeUseCase = Database['public']['Tables']['theme_use_cases']['Row']
export type ThemeUseCaseInsert = Database['public']['Tables']['theme_use_cases']['Insert']
```

---

## Task 1.3: Create `packages/db/src/queries/use-cases.ts`

### What to Build

Follow `tags.ts` pattern exactly, plus add `searchUseCases` for autocomplete:

```typescript
import type { SupabaseClient } from '../client'
import type { UseCaseInsert, UseCaseUpdate } from '../types'

/** List all use cases, ordered by name */
export async function getUseCases(client: SupabaseClient) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single use case by ID */
export async function getUseCaseById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Create a new use case */
export async function createUseCase(client: SupabaseClient, useCase: UseCaseInsert) {
  const { data, error } = await client
    .from('use_cases')
    .insert(useCase)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing use case by ID */
export async function updateUseCase(client: SupabaseClient, id: string, updates: UseCaseUpdate) {
  const { data, error } = await client
    .from('use_cases')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a use case by ID (CASCADE removes all theme junctions) */
export async function deleteUseCase(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('use_cases')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Search use cases by name (ILIKE) — for autocomplete */
export async function searchUseCases(client: SupabaseClient, query: string, limit = 10) {
  const { data, error } = await client
    .from('use_cases')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data
}

/** Get use cases assigned to a theme (via junction table) */
export async function getThemeUseCases(client: SupabaseClient, themeId: string) {
  const { data, error } = await client
    .from('theme_use_cases')
    .select('use_case_id, use_cases(id, name, slug)')
    .eq('theme_id', themeId)
  if (error) throw error
  return data?.map((r) => (r as any).use_cases) ?? []
}

/** Replace all use case assignments for a theme */
export async function setThemeUseCases(client: SupabaseClient, themeId: string, useCaseIds: string[]) {
  const { error: delError } = await client
    .from('theme_use_cases')
    .delete()
    .eq('theme_id', themeId)
  if (delError) throw delError

  if (useCaseIds.length === 0) return

  const rows = useCaseIds.map((use_case_id) => ({ theme_id: themeId, use_case_id }))
  const { error: insError } = await client
    .from('theme_use_cases')
    .insert(rows)
  if (insError) throw insError
}
```

---

## Task 1.4: Export from `packages/db/src/index.ts`

### What to Build

Add two export blocks at the end of index.ts:

```typescript
// After block-categories exports:

export {
  getUseCases,
  getUseCaseById,
  createUseCase,
  updateUseCase,
  deleteUseCase,
  searchUseCases,
  getThemeUseCases,
  setThemeUseCases,
} from './queries/use-cases'
```

Add types to the type export block:

```typescript
// Add to the existing type export block:
  UseCase,
  UseCaseInsert,
  UseCaseUpdate,
  ThemeUseCase,
  ThemeUseCaseInsert,
```

---

## Task 1.5: Update `domain-manifest.ts`

### What to Build

**pkg-db owned_files** — add:
```
'packages/db/src/queries/use-cases.ts',
```

**pkg-db owned_tables** — fix drift AND add new tables. Replace current owned_tables with complete list:
```typescript
owned_tables: [
  'profiles',
  'themes',
  'blocks',
  'templates',
  'pages',
  'page_blocks',
  'global_elements',
  'licenses',
  'audit_log',
  'categories',
  'tags',
  'theme_categories',
  'theme_tags',
  'prices',
  'theme_prices',
  'block_categories',
  'use_cases',
  'theme_use_cases',
],
```

---

## Files to Modify

- `packages/db/src/types.ts` — add use_cases + theme_use_cases table types + aliases
- `packages/db/src/queries/use-cases.ts` — **NEW** — CRUD + search + junction queries
- `packages/db/src/index.ts` — re-export queries + types
- `src/__arch__/domain-manifest.ts` — add file to owned_files, fix owned_tables

---

## Acceptance Criteria

- [ ] `use_cases` and `theme_use_cases` tables exist in Supabase with RLS + trigger
- [ ] `packages/db/src/types.ts` has both table definitions + convenience aliases
- [ ] `packages/db/src/queries/use-cases.ts` has 8 functions (CRUD + search + junction)
- [ ] `packages/db/src/index.ts` re-exports all 8 functions + 5 types
- [ ] `domain-manifest.ts` has `use-cases.ts` in owned_files
- [ ] `domain-manifest.ts` owned_tables lists all 18 tables (fixed drift)
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new boundary violations

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. TypeScript compilation check
npx tsc --noEmit -p packages/db/tsconfig.json 2>&1 | tail -5
echo "(expect: no errors)"

# 3. Verify exports resolve
node -e "const m = require('./packages/db/src/index.ts'); console.log('SKIP — TS source, not compiled')"
echo "(manual: confirm index.ts exports look correct)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-015/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-015 Phase 1 — Database + Package Layer
> Epic: Use Cases Taxonomy
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: pkg-db

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
| arch-test | ✅/❌ ({N} tests) |
| Build | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/db/src/queries/use-cases.ts packages/db/src/types.ts packages/db/src/index.ts src/__arch__/domain-manifest.ts logs/wp-015/phase-1-result.md
git commit -m "feat(db): use_cases taxonomy — types, queries, exports [WP-015 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Supabase migration is MANUAL** — run SQL in Supabase dashboard first, then write the TypeScript code
- **Follow tags.ts pattern exactly** — same function signatures, same error handling, same junction pattern
- **searchUseCases is NEW** — the only function without precedent in tags.ts. Uses `.ilike()` + `.limit()`
- **Fix owned_tables drift** — current list has 13, should be 18 after this phase
- **Run `npm run arch-test` before committing** — this is not optional
- **Do NOT touch Studio or Portal code** — that's Phase 2 and 3
