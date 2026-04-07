---
domain: studio-core
description: "Vite SPA shell, routing, layouts, auth pages, and entity CRUD for themes/blocks/templates/pages/global-elements."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/studio/src/app.tsx` — React Router routes, all page imports
2. `apps/studio/src/lib/block-api.ts` — shared API utilities (`authHeaders`, `parseError`) + block CRUD
3. `apps/studio/src/pages/theme-editor.tsx` — representative editor pattern (form + react-hook-form + zod)

## Public API

(none — studio-core is the Studio app shell, not imported by other packages)

## Invariants

- **Every entity has 3 files:** list page (`*-list.tsx`) + editor page (`*-editor.tsx`) + API wrapper (`lib/*-api.ts`). Exception: themes use `lib/queries.ts` for some operations.
- **block-api.ts exports `authHeaders()` and `parseError()` — used by ALL entity API wrappers.** template-api, page-api, global-element-api all import these shared utilities from block-api.ts. Despite the name, this is shared infrastructure.
- **All editors use react-hook-form + zodResolver.** Form state managed by react-hook-form, validated against Zod schemas from @cmsmasters/validators.
- **Auth flow: login.tsx → magic link → auth-callback.tsx → redirect to app.** Uses `signInWithMagicLink` and `handleAuthCallback` from @cmsmasters/auth.
- **Elements page is blocks filtered by `category === 'element'`.** `elements-list.tsx` is NOT a separate entity type — it calls `fetchAllBlocks()` and filters.
- **App layout has two shells:** `auth-layout.tsx` (login/callback) and `app-layout.tsx` (authenticated — sidebar + topbar + content area).

## Traps & Gotchas

- **"block-api.ts is in studio-core, not studio-blocks"** — counterintuitive name. It contains shared auth utilities (authHeaders, parseError) used by ALL API wrappers. The block CRUD functions happen to live here too.
- **block-picker-modal is shared** — used by theme-editor (block fills), page-editor (page blocks + slot blocks), and template-editor (default blocks). Accepts optional `filterCategory` prop to show only blocks of a specific `block_type`. Not block-specific.
- **SlotPanel supports multi-block slots** — global slots show ordered block list with add/remove/reorder (ArrowUp/ArrowDown/Trash2) + per-slot gap input. `layout_slots` stores `string | string[]` per slot. `slot_config` stores `{ gap: "24px" }` per slot. Wired through all 4 save paths (save-update, save-create, publish-update, publish-create).
- **All editors duplicate `inputStyle`/`labelStyle` inline objects** — no shared style constants. If you change the input style pattern, you must update every editor.
- **"Elements tab shows wrong blocks"** — elements-list filters by `category === 'element'`. If a block's category is missing or wrong, it won't appear.
- **`fetchAllBlocks` vs `getBlocks`** — `fetchAllBlocks` is in studio's `block-api.ts` (calls Hono API via fetch). `getBlocks` is in `@cmsmasters/db` (direct Supabase query). Studio uses the API wrapper, not direct DB.
- **Delete operations show `DeleteConfirmModal`** — shared component across all entity types.

## Blast Radius

- **Changing block-api.ts** (`authHeaders`/`parseError`) — breaks ALL entity API wrappers (template-api, page-api, global-element-api)
- **Changing app.tsx** — affects ALL route definitions and page imports
- **Changing app-layout.tsx** — affects the entire authenticated shell (sidebar, topbar, content area)
- **Changing toast.tsx** — affects all user feedback across all pages
- **Changing form-section.tsx** — affects visual grouping in all editors
- **Changing supabase.ts** — affects all direct Supabase calls in Studio

## Recipes

```typescript
// Standard editor pattern:
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createBlockSchema } from '@cmsmasters/validators'

const form = useForm({
  resolver: zodResolver(createBlockSchema),
  defaultValues: { name: '', slug: '', html: '', css: '' },
})

// API call with shared auth:
import { authHeaders, parseError } from '../lib/block-api'

const res = await fetch(`${API_URL}/api/templates`, {
  headers: authHeaders(token),
})
if (!res.ok) throw new Error(await parseError(res))
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** block-api.ts exports shared authHeaders/parseError used by ALL entity API wrappers
- **note:** elements-list.tsx is blocks filtered by category === "element" — not a separate entity
- **note:** all editors duplicate inputStyle/labelStyle inline objects — no shared style component
