# Execution Log: WP-005B Phase 1 — Supabase Migration
> Epic: WP-005B DB Foundation + API
> Executed: 2026-03-31T11:55Z
> Duration: ~20 minutes
> Status: COMPLETE

## What Was Done

Created `blocks` and `templates` tables in Supabase, dropped `themes.sections` column, added `template_id` + `block_fills` columns to themes, added missing `themes_delete_staff` RLS policy. Updated TypeScript types, Zod validators, mappers, form defaults, and Studio theme editor to match new schema. Removed ~200 lines of sections builder UI from Studio.

## SQL Executed

### Call 1: blocks table
- CREATE TABLE `blocks` (10 columns: id, slug, name, html, css, hooks, metadata, created_by, created_at, updated_at)
- RLS enabled, 4 policies (select=authenticated, insert/update/delete=staff)
- Trigger: `blocks_updated` → `update_updated_at()`
- Result: SUCCESS

### Call 2: templates table
- CREATE TABLE `templates` (9 columns: id, slug, name, description, positions, max_positions, created_by, created_at, updated_at)
- RLS enabled, 4 policies (same pattern as blocks)
- Trigger: `templates_updated` → `update_updated_at()`
- Result: SUCCESS

### Call 3: themes alter
- `ALTER TABLE themes DROP COLUMN IF EXISTS sections` — 1 test row's sections data lost (accepted)
- `ALTER TABLE themes ADD COLUMN template_id uuid REFERENCES templates(id)` — nullable
- `ALTER TABLE themes ADD COLUMN block_fills jsonb NOT NULL DEFAULT '[]'`
- `CREATE POLICY themes_delete_staff` — staff condition
- Result: SUCCESS

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `packages/db/src/types.ts` | Modified | Removed BlockId/ThemeBlock; added BlockHooks, BlockMetadata, TemplatePosition, ThemeBlockFill; added blocks+templates to Database; updated themes Row/Insert/Update; added Block/Template aliases |
| `packages/db/src/index.ts` | Modified | Removed BlockId/ThemeBlock exports; added 12 new type exports |
| `packages/db/src/mappers.ts` | Modified | `sections` → `template_id` (M1: `?? ''` DB→form, `\|\| null` form→DB) + `block_fills` |
| `packages/db/src/__tests__/mappers.test.ts` | Rewritten | 3 scenarios: sparse row, filled row (real UUIDs), themeSchema validation (45 assertions) |
| `packages/validators/src/theme.ts` | Modified | Removed blockSchema/blocksSchema; added blockFillSchema; themeSchema: sections → template_id + block_fills |
| `packages/validators/src/index.ts` | Modified | Removed blockSchema/blocksSchema; added blockFillSchema |
| `apps/studio/src/pages/theme-editor.tsx` | Modified | Removed SectionsList/SectionEditor/StubEditor (~170 lines), removed dead imports (useFieldArray, useController, Control, ChevronUp/Down, Plus, X), removed dead styles, added placeholder FormSection |
| `apps/studio/src/lib/form-defaults.ts` | Modified | `sections: []` → `template_id: ''`, `block_fills: []` |

## Data Impact

- themes row count before: 1
- themes row count after: 1 (survived ALTER)
- sections data lost: yes — test row's sections jsonb column dropped (accepted, test data)

## M1 Contract (empty-state)

- Form layer: `template_id: ''`, `block_fills: []`
- DB layer: `template_id: null`, `block_fills: '[]'`
- Validator: `z.string().uuid().or(z.literal('')).default('')`
- Mapper DB→form: `row.template_id ?? ''`
- Mapper form→DB: `form.template_id || null`

## Verification Results

| Check | Result |
|-------|--------|
| blocks table (10 columns) | PASS |
| templates table (9 columns) | PASS |
| themes.sections dropped | PASS |
| themes.template_id added (nullable uuid FK) | PASS |
| themes.block_fills added (jsonb NOT NULL) | PASS |
| blocks RLS (4 policies) | PASS |
| templates RLS (4 policies) | PASS |
| themes_delete_staff policy (M3) | PASS — verified with staff condition |
| triggers on blocks + templates | PASS |
| themes row count = 1 | PASS |
| db tsc --noEmit | PASS (0 errors) |
| validators tsc --noEmit | PASS (0 errors) |
| Studio tsc | PASS (only pre-existing module resolution errors, no type errors) |
| mapper test (45/45) | PASS |
| Drift sweep: BlockId/ThemeBlock/blockSchema/blocksSchema | PASS (0 in runtime code) |
| Drift sweep: sections in runtime code | PASS (0 matches) |
| Studio sections builder removed | PASS (0 refs to SectionsList/SectionEditor/StubEditor) |
