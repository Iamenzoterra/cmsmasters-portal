# Execution Log: WP-005B Phase 0 — RECON
> Epic: WP-005B DB Foundation + API
> Executed: 2026-03-31T11:40Z
> Duration: ~10 minutes
> Status: COMPLETE

---

## A. Supabase Schema Inventory

### Tables (4 public)
| Table | RLS | Rows |
|-------|-----|------|
| profiles | yes | 1 |
| themes | yes | **1** |
| licenses | yes | 0 |
| audit_log | yes | 1 |

**blocks table: does NOT exist** (confirmed)
**templates table: does NOT exist** (confirmed)

### themes Table — Exact Columns
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| slug | text | no | — (unique) |
| status | text | no | 'draft' (check: draft/published/archived) |
| created_by | uuid | yes | — (FK → profiles.id) |
| created_at | timestamptz | no | now() |
| updated_at | timestamptz | no | now() |
| meta | jsonb | no | '{}' |
| **sections** | **jsonb** | **no** | **'[]'** |
| seo | jsonb | yes | '{}' |

**`sections` column STILL EXISTS in actual Supabase DB.** WP-005A only changed TypeScript types, never ran ALTER TABLE.

### RLS Policies — themes
| Policy | Command | Condition |
|--------|---------|-----------|
| themes_insert_staff | INSERT | with_check: role IN (content_manager, admin) |
| themes_select_anon | SELECT | status = 'published' |
| themes_select_published | SELECT | status = 'published' |
| themes_select_staff | SELECT | role IN (content_manager, admin) |
| themes_update_staff | UPDATE | role IN (content_manager, admin) |

Note: `themes_select_anon` and `themes_select_published` appear to be duplicates (same condition).

### RLS Policies — Other Tables
| Table | Policy | Command | Condition |
|-------|--------|---------|-----------|
| profiles | profiles_select_own | SELECT | id = auth.uid() |
| profiles | profiles_select_admin | SELECT | role = admin |
| profiles | profiles_update_own | UPDATE | id = auth.uid() |
| profiles | profiles_update_admin | UPDATE | role = admin |
| licenses | licenses_select_own | SELECT | user_id = auth.uid() |
| licenses | licenses_select_admin | SELECT | role = admin |
| licenses | licenses_insert_admin | INSERT | role = admin |
| licenses | licenses_update_admin | UPDATE | role = admin |
| audit_log | audit_insert_any | INSERT | auth.uid() IS NOT NULL |
| audit_log | audit_select_admin | SELECT | role = admin |

### Triggers
| Table | Trigger | Event | Function |
|-------|---------|-------|----------|
| profiles | profiles_updated | UPDATE | update_updated_at() |
| themes | themes_updated | UPDATE | update_updated_at() |

### Functions (3)
| Function | Returns | Definition |
|----------|---------|------------|
| get_user_role() | text | `SELECT role FROM public.profiles WHERE id = auth.uid()` |
| handle_new_user() | trigger | Inserts into profiles on auth.users creation |
| update_updated_at() | trigger | `NEW.updated_at = now(); RETURN NEW;` |

---

## B. sections Usage Map

**29 references across 6 files.**

| File | Line(s) | Usage | Action |
|------|---------|-------|--------|
| packages/db/src/types.ts | 25, 27 | Comments about sections jsonb | Update comments |
| packages/db/src/types.ts | 96 | `sections: ThemeBlock[]` in Theme Row | Remove or replace with template_id + block_fills |
| packages/db/src/types.ts | 107 | `sections?: ThemeBlock[]` in ThemeInsert | Remove or replace |
| packages/db/src/types.ts | 118 | `sections?: ThemeBlock[]` in ThemeUpdate | Remove or replace |
| packages/db/src/mappers.ts | 27 | `sections: row.sections ?? []` (row→form) | Replace with new fields |
| packages/db/src/mappers.ts | 69 | `sections: form.sections` (form→insert) | Replace with new fields |
| packages/validators/src/theme.ts | 49 | `sections: blocksSchema` in themeSchema | Replace with new fields |
| apps/studio/src/pages/theme-editor.tsx | 3 | import useFieldArray | Keep (still needed) |
| apps/studio/src/pages/theme-editor.tsx | 62 | `useFieldArray({ control, name: 'sections' })` | Rename field |
| apps/studio/src/pages/theme-editor.tsx | 352-405 | SectionsList rendering, append/remove/swap | Update field names |
| apps/studio/src/pages/theme-editor.tsx | 489-606 | SectionsList component (full impl) | Rename/update |
| apps/studio/src/pages/theme-editor.tsx | 610-622 | SectionEditor + StubEditor + useWatch/useController on `sections.${index}` | Update field paths |
| apps/studio/src/lib/form-defaults.ts | 24 | `sections: []` | Replace with new field defaults |
| packages/db/src/__tests__/mappers.test.ts | 13, 22, 44 | Sparse row test: sections = [] | Update fixtures |
| packages/db/src/__tests__/mappers.test.ts | 88-111 | Filled row test: sections with 2 blocks | Update fixtures |

**Clean files (no references):**
- apps/api/src/ — zero references
- apps/command-center/ — zero references
- apps/studio/src/components/editor-sidebar.tsx — zero references

---

## C. API Route Pattern Summary

### Route Structure
```
apps/api/src/
  index.ts          — Hono app, CORS, route mounting, error handling
  env.ts            — Env type (SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_JWT_SECRET)
  lib/supabase.ts   — createServiceClient(env) → bypasses RLS
  middleware/
    auth.ts         — JWT HS256 verification, sets userId + userEmail
    role.ts         — requireRole(...roles) factory, DB lookup via profiles
  routes/
    health.ts       — GET /api/health (public)
    revalidate.ts   — POST /api/content/revalidate (auth + role)
    upload.ts       — POST /api/upload (auth + role)
```

### Auth Chain Pattern
```typescript
// Public route
const health = new Hono<{ Bindings: Env }>()
health.get('/health', handler)

// Protected route
const route = new Hono<AuthEnv>()
route.post('/path', authMiddleware, requireRole('content_manager', 'admin'), handler)
```

### Response Format
```typescript
c.json({ key: value }, statusCode)
// Errors: { error: 'message' } with 401/403/404/500
```

### Route Mounting
```typescript
app.route('/api', health)      // public
app.route('/api', revalidate)  // protected
```

### Missing Dependency
`@cmsmasters/validators` is NOT in apps/api/package.json. Must add for new routes.

---

## D. DB Query Pattern Summary

### Function Signature
```typescript
export async function queryName(client: SupabaseClient, ...params) {
  const { data, error } = await client.from('table').select/insert/update/upsert(...)
  if (error) throw error
  return data
}
```

### Key Patterns
- **Client injection**: SupabaseClient always first parameter
- **Error handling**: `if (error) throw error` — no silent failures
- **Return**: raw `data` from Supabase response
- **Type safety**: SafeProfileUpdate pattern to prevent forbidden field mutations
- **Upsert**: `onConflict: 'slug'` for themes
- **Audit**: logAction awaits insert, throws on error (not fire-and-forget)

### Mapper Pattern
- `themeRowToFormData(row)`: DB → Form with null coalescing
- `formDataToThemeInsert(form, existingId?)`: Form → DB with empty→undefined normalization

---

## E. Studio Sections Builder State

**Fully present.** WP-005A removed typed block editors but the sections builder UI remains:

| Component | Lines | Status |
|-----------|-------|--------|
| SectionsList | 497-606 | Active — expand/collapse, reorder, delete, add |
| SectionEditor | 610-612 | Active — router to StubEditor |
| StubEditor | 614-661 | Active — JSON textarea for section data |
| useFieldArray | 62 | Active — `name: 'sections'` |

Total theme-editor.tsx: **663 lines**

Form defaults: `sections: []` (empty array, comment says "005C adds template picker")

---

## F. Risks / Surprises

### 1. themes has 1 row (RECON doc assumed 0)
ALTER TABLE DROP sections must handle existing data. Migration should:
- Back up the sections data before dropping (or accept data loss if it's test data)
- Not use IF NOT EXISTS blindly

### 2. Duplicate SELECT policy on themes
`themes_select_anon` and `themes_select_published` have identical conditions (`status = 'published'`). Consider dropping the duplicate during migration cleanup.

### 3. Sections builder is fully functional in Studio
14 references in theme-editor.tsx. The rename from sections → template_id + block_fills will require significant Studio changes (WP-005B scope or defer to 005C).

### 4. @cmsmasters/validators not in API deps
Must add to apps/api/package.json before new routes can import validators.

### 5. No DELETE policy on themes
Only INSERT/SELECT/UPDATE policies exist. If Phase 1 adds a delete endpoint, a DELETE RLS policy is needed.

---

## Verification Results

| Check | Result |
|-------|--------|
| Supabase schema queried | DONE — 4 tables, columns, types confirmed |
| blocks/templates tables absent | DONE — confirmed empty result |
| themes.sections column exists in DB | DONE — jsonb, default '[]', NOT NULL |
| themes row count | DONE — **1 row (not 0)** |
| RLS policies documented | DONE — 15 policies across 4 tables |
| Triggers documented | DONE — 2 triggers (profiles, themes) |
| Functions documented | DONE — 3 functions |
| sections usage mapped | DONE — 29 refs across 6 files |
| API pattern documented | DONE — auth chain, response format, route mounting |
| DB query pattern documented | DONE — client injection, error handling, mappers |
| Studio sections state confirmed | DONE — SectionsList/SectionEditor/StubEditor all present |
| API validators dep check | DONE — missing, must add |
