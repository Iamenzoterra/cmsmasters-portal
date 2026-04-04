---
domain: app-portal
description: "Next.js 15 SSG+ISR public site: theme pages, composed pages, SEO, revalidation."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/portal/app/themes/[slug]/page.tsx` — theme page rendering pipeline
2. `apps/portal/lib/blocks.ts` — `mergePositions`, `fetchBlocksById`, template/theme queries
3. `apps/portal/lib/hooks.ts` — `resolveBlockHooks`, `resolveSlots`, `resolveMetaHooks`

## Public API

(none — app-portal is a leaf consumer, no other domains import from it)

## Invariants

- **Next.js 15 App Router with SSG + ISR.** Static at build time, revalidated on-demand.
- **Block rendering: HTML → BlockRenderer RSC → `.block-{slug}` scoping.** Each block gets its own `<style>` + `<div class="block-{slug}">` + optional `<script type="module">`.
- **Hook resolution is build-time string replacement.** `{{price}}` → `$XX` from `theme.meta.price`. `{{meta:field}}` → `theme.meta[field]`. `{{link:field}}` → URL from meta. `{{slot:name}}` → rendered slot HTML. All resolved in RSC, zero client JS.
- **Global elements resolve by cascade:** layout_slots override > category default (is_default=true) > null. SLOT_TO_CATEGORY maps slot names to block categories.
- **Revalidation: POST `/api/revalidate`** with `x-revalidate-token` header matching `REVALIDATE_SECRET` env var. Calls `revalidatePath(path, 'page')`.
- **`[[...slug]]` catch-all** handles all composed pages. `/themes/[slug]` handles theme pages.
- **`mergePositions`** combines template positions + per-theme block_fills. Fills override template at same position. Extra fill positions (not in template) get appended.

## Traps & Gotchas

- **"New page not showing"** — SSG pages are built at deploy time. New pages need revalidation via POST to `/api/revalidate` with the correct path.
- **"Block styles leaking between blocks"** — check CSS scoping. Every block MUST use `.block-{slug}` prefix. BlockRenderer wraps in `<div class="block-{slug}">` but the CSS itself must also scope.
- **`resolveSlots` temporarily removes `<style>` blocks** before processing `data-slot` attributes — to avoid matching CSS selectors that contain `data-slot`. Style blocks are restored after.
- **`stripDebug` removes debug toggle buttons** — blocks from /block-craft may include debug UI that must be stripped before production render.
- **Portal uses its own Supabase client** (`lib/supabase.ts`) with the anon key — NOT the service_role from the API. RLS applies to all portal reads.
- **`getThemeBySlug` uses `.eq('status', 'published')`** — draft themes are invisible to the portal.

## Blast Radius

- **Changing BlockRenderer** — affects ALL theme pages and composed pages
- **Changing lib/blocks.ts** — affects all page rendering (theme + composed)
- **Changing lib/hooks.ts** — affects all hook resolution (price, meta, slots, links)
- **Changing lib/global-elements.ts** — affects every page's header/footer/sidebars
- **Changing /api/revalidate/route.ts** — breaks on-demand ISR from Studio publish

## Recipes

```typescript
// Revalidate a theme page after publish (called from Hono API):
await fetch(`${PORTAL_URL}/api/revalidate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-revalidate-token': REVALIDATE_SECRET,
  },
  body: JSON.stringify({ path: `/themes/${slug}` }),
})

// Resolve hooks in a block:
import { resolveBlockHooks } from '../lib/hooks'
const html = resolveBlockHooks(block.html, block.hooks, theme.meta)
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **note:** [[...slug]] catch-all handles composed pages — new pages need revalidation
- **important:** hook resolution ({{price}} -> theme.meta.price) is build-time string replacement in RSC
