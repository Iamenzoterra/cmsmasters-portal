---
domain: pkg-db
description: "Supabase client, typed queries, mappers for all 9 tables."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `packages/db/src/index.ts` — public API: every export consumers can use
2. `packages/db/src/types.ts` — generated DB types (all 9 table shapes)
3. `packages/db/src/queries/blocks.ts` — representative query pattern (CRUD + usage check)

## Public API

- `packages/db/src/index.ts`

## Invariants

- **All query functions take Supabase client as first arg.** Dependency injection — consumer provides the client (anon or service_role depending on context).
- **types.ts is auto-generated from Supabase.** Running `supabase gen types` overwrites it. Manual edits will be lost.
- **mappers.ts is the ONLY place DB→form and form→DB conversion happens.** Currently only theme mappers exist (`themeRowToFormData`, `formDataToThemeInsert`). Other entities don't need mappers yet — they map 1:1.
- **JSON columns are typed via branded types** in types.ts (ThemeMeta, ThemeSEO, BlockHooks, BlockMetadata, TemplatePosition, ThemeBlockFill). Access sub-fields through these types, not raw `any`.
- **9 tables, all with RLS.** profiles, themes, blocks, templates, pages, page_blocks, global_elements, licenses, audit_log.

## Traps & Gotchas

- **"Empty results but no error"** — `.maybeSingle()` returns `null` on 0 rows. `.single()` throws on 0 rows. Most getBySlug use `.maybeSingle()`, getById use `.single()`.
- **JSON columns parse as `any` at runtime** — TypeScript types are assertions, not runtime validation. If Supabase data doesn't match the expected shape, you get silent corruption.
- **`formDataToThemeInsert` uses `emptyToNull` helper** — trims whitespace and converts empty strings to undefined. This means "" in a form field becomes `undefined` in the DB insert, not empty string.
- **Block `hooks` and `metadata` fields are jsonb** — stored as raw JSON objects. No Zod validation on read from DB, only on write via validators package.

## Blast Radius

- **Changing types.ts** — affects EVERY consumer of @cmsmasters/db (studio, portal, api, validators)
- **Changing mappers.ts** — affects theme editor save/load in Studio
- **Changing queries/blocks.ts** — affects Studio block CRUD + Portal block fetching
- **Changing index.ts exports** — may break any importing app/package

## Recipes

```typescript
// Query blocks with the anon client (browser, RLS applies):
import { createClient, getBlocks } from '@cmsmasters/db'
const supabase = createClient()
const blocks = await getBlocks(supabase)

// Insert a theme:
import { formDataToThemeInsert, upsertTheme } from '@cmsmasters/db'
const insert = formDataToThemeInsert(formData)
await upsertTheme(supabase, insert)
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** types.ts is generated from Supabase — manual edits will be overwritten
- **important:** mappers.ts handles snake_case→camelCase but has no runtime validation
