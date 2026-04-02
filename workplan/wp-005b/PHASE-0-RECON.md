# WP-005B Phase 0: RECON — Current DB State, sections Usage, API Patterns

> Workplan: WP-005B DB Foundation + Hono API for Blocks & Templates
> Phase: 0 of 5
> Priority: P0
> Estimated: 30–45 minutes
> Type: Audit
> Previous: WP-005A ✅ (codebase cleanup, BlockId=string, packages/blocks/ removed)
> Next: Phase 1 (Supabase Migration — blocks + templates tables, themes alter)

---

## Context

WP-005B creates the DB foundation for the block system: `blocks` table, `templates` table, `themes` alter (drop `sections`, add `template_id` + `block_fills`), RLS, Hono CRUD endpoints, Zod validators, DB query layer.

Before writing any SQL or code, we audit:
1. **Exact current Supabase schema** — tables, columns, RLS policies, triggers
2. **Every usage of `sections`** in the codebase — what breaks when we drop the column
3. **API route pattern** — how existing routes are structured (auth, role, service client)
4. **DB query pattern** — how existing queries are structured (client injection, error handling)

```
CURRENT STATE:
  Supabase tables: profiles, themes, licenses, audit_log                    ✅
  themes.sections: jsonb column (old model, 0 rows)                         🔸 DROP
  themes.template_id: does not exist                                        ❌
  themes.block_fills: does not exist                                        ❌
  blocks table: does not exist                                              ❌
  templates table: does not exist                                           ❌
  Hono routes: health, revalidate, upload                                   ✅
  Hono blocks/templates routes: do not exist                                ❌
  packages/db queries: themes.ts, profiles.ts, audit.ts                     ✅
  packages/db queries/blocks.ts: does not exist                             ❌
  packages/db queries/templates.ts: does not exist                          ❌
  packages/validators/block.ts: does not exist                              ❌
  packages/validators/template.ts: does not exist                           ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

### A. Supabase Schema Audit

Use Supabase MCP to query actual state:

```sql
-- 1. List all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. themes table columns (exact current state)
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. All RLS policies on themes
SELECT policyname, cmd, qual, with_check 
FROM pg_policies WHERE tablename = 'themes';

-- 4. All triggers on themes
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'themes';

-- 5. Check if blocks/templates tables already exist (should NOT)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('blocks', 'templates');

-- 6. Count rows in themes (should be 0)
SELECT count(*) FROM themes;

-- 7. Existing functions/triggers pattern (for updated_at)
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
```

### B. `sections` Usage Across Codebase

```bash
# 1. All references to "sections" in packages/ and apps/ source code
grep -rn "sections" packages/db/src/ packages/validators/src/ apps/studio/src/ apps/api/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "\.md"

# 2. Specifically in types.ts (Database type)
grep -n "sections" packages/db/src/types.ts

# 3. In mappers.ts
grep -n "sections" packages/db/src/mappers.ts

# 4. In validators theme.ts
grep -n "sections" packages/validators/src/theme.ts

# 5. In Studio theme-editor.tsx  
grep -n "sections\|sectionsArray\|useFieldArray" apps/studio/src/pages/theme-editor.tsx

# 6. In Studio form-defaults.ts
grep -n "sections" apps/studio/src/lib/form-defaults.ts

# 7. In mappers test
grep -n "sections" packages/db/src/__tests__/mappers.test.ts

# 8. In Studio editor-sidebar.tsx (check if it references sections)
grep -n "sections" apps/studio/src/components/editor-sidebar.tsx
```

### C. API Route Pattern Audit

```bash
# 1. All route files
ls apps/api/src/routes/

# 2. How revalidate.ts uses middleware (reference pattern for new routes)
cat apps/api/src/routes/revalidate.ts

# 3. How upload.ts uses middleware  
cat apps/api/src/routes/upload.ts

# 4. How index.ts mounts routes
cat apps/api/src/index.ts

# 5. Service client pattern
cat apps/api/src/lib/supabase.ts

# 6. Auth env type
cat apps/api/src/env.ts

# 7. Role middleware (requireRole usage)
head -20 apps/api/src/middleware/role.ts
```

### D. DB Query Pattern Audit

```bash
# 1. Existing query files
ls packages/db/src/queries/

# 2. themes.ts query pattern (function signatures, error handling)
cat packages/db/src/queries/themes.ts

# 3. profiles.ts query pattern  
cat packages/db/src/queries/profiles.ts

# 4. audit.ts query pattern
cat packages/db/src/queries/audit.ts

# 5. How SupabaseClient type is defined
grep -n "SupabaseClient" packages/db/src/client.ts
```

### E. Validators Pattern Audit

```bash
# 1. Current validators exports
cat packages/validators/src/index.ts

# 2. Current theme.ts (what blockSchema/blocksSchema look like)
cat packages/validators/src/theme.ts

# 3. Any existing test files in validators
ls packages/validators/src/__tests__/ 2>/dev/null || echo "No tests dir"
```

### F. Studio Sections Builder — What Exactly Remains

```bash
# 1. How many lines is theme-editor.tsx now
wc -l apps/studio/src/pages/theme-editor.tsx

# 2. SectionsList component — does it still exist?
grep -n "function SectionsList\|function SectionEditor\|function StubEditor" apps/studio/src/pages/theme-editor.tsx

# 3. useFieldArray for sections — still present?
grep -n "useFieldArray" apps/studio/src/pages/theme-editor.tsx

# 4. How form-defaults uses sections
cat apps/studio/src/lib/form-defaults.ts
```

---

## Questions to Answer

1. **Exact themes table columns** — what columns exist right now? Is `sections` still there as jsonb? (Phase 3 of 005A should have changed the types but not the actual DB)

2. **Row count** — confirm 0 rows in themes table (safe to ALTER/DROP)

3. **Existing RLS pattern** — exact policy names and conditions on themes (we'll replicate for blocks + templates)

4. **Existing trigger pattern** — is there an `updated_at` trigger on themes? What function does it use? (We'll reuse for blocks + templates)

5. **Studio sections builder** — does SectionsList / StubEditor / useFieldArray for sections still exist after Phase 3 cleanup? Or was it fully removed?

6. **`sections` in mappers.ts** — themeRowToFormData reads `row.sections`, formDataToThemeInsert writes `sections: form.sections`. Both need updating.

7. **`sections` in mappers.test.ts** — fixtures have `sections: [...]`. Need updating.

8. **editor-sidebar.tsx** — does it reference `sections` anywhere?

9. **API `@cmsmasters/validators` dep** — is it already in api/package.json? (Check needed — new routes will import validators)

10. **Existing DB functions** — `get_user_role`, `handle_new_user`, any `updated_at` triggers? Exact names needed.

---

## Output

Report organized as:

### A. Supabase Schema Inventory
- Tables, columns, types, defaults
- RLS policies (name, cmd, condition)
- Functions and triggers

### B. sections Usage Map
| File | Line(s) | Usage | Action needed |
|------|---------|-------|---------------|

### C. API Route Pattern Summary
- Auth: how middleware is applied
- Role: how requireRole is used
- Service client: how Supabase client is created
- Response format: json shape

### D. DB Query Pattern Summary
- Function signature pattern
- Error handling pattern
- Client injection pattern

### E. Risk Assessment
- Anything unexpected

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005b/phase-0-result.md`

```markdown
# Execution Log: WP-005B Phase 0 — RECON
> Epic: WP-005B DB Foundation + API
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE

## Supabase Schema
{tables, columns, RLS, triggers}

## sections Usage Map
{table}

## API Pattern
{summary}

## DB Query Pattern
{summary}

## Studio State
{what remains of sections builder}

## Risks / Surprises
{anything unexpected}

## Verification Results
| Check | Result |
|-------|--------|
| Supabase schema queried | ✅/❌ |
| sections usage mapped | ✅/❌ |
| API pattern documented | ✅/❌ |
| DB query pattern documented | ✅/❌ |
| Studio sections state confirmed | ✅/❌ |
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT write any code.** This is audit only.
- **Do NOT run any SQL that modifies data.** SELECT only.
- **Use Supabase MCP** (`execute_sql`) for schema queries. Project ID: `yxcqtwuyktbjxstahfqj`. Use `verbose=True` on `list_tables` if available.
- **If Supabase MCP times out**, fall back to grepping `types.ts` for the Database type (it mirrors the schema).
- **The `sections` column may or may not exist in actual Supabase** — Phase 3 of 005A changed TypeScript types but we don't know if anyone ran ALTER TABLE on the actual DB. The RECON must verify.
- **Be thorough on sections grep** — every missed reference becomes a runtime error after we ALTER TABLE.
