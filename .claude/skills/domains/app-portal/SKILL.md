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
- **Global elements resolve by cascade:** layout_slots override > category defaults (is_default=true, ordered by sort_order) > []. `resolveGlobalBlocks` returns `Record<string, Block[]>` (multiple blocks per slot). SLOT_TO_CATEGORY maps slot names to block categories. `layout_slots` accepts `string | string[]` per slot (string normalized to `[string]`). `slot_config` stores per-slot gap.
- **Revalidation: POST `/api/revalidate`** with `x-revalidate-token` header matching `REVALIDATE_SECRET` env var. Calls `revalidatePath(path, 'page')`.
- **`[[...slug]]` catch-all** handles all composed pages. `/themes/[slug]` handles theme pages.
- **`mergePositions`** combines template positions + per-theme block_fills. Fills override template at same position. Extra fill positions (not in template) get appended.

## Invariants (cont.)

- **`resolveSlots` is single-pass.** Nested slots work because layout HTML (from DB) already contains `<main data-slot="content"><div data-slot="theme-blocks"></div></main>` — the outer is non-empty so it's skipped; the inner is empty and gets filled. NO runtime injection needed. (WP-020)
- **The temporary injection regex in `themes/[slug]/page.tsx` (commit `640faa93`) has been deleted** (WP-020 Phase 4). Don't re-add it.
- **Block variants are server-inlined.** `BlockRenderer` RSC + `renderBlock()` helper accept optional `variants?: BlockVariants | null`. When absent/null/empty, output is BYTE-IDENTICAL to pre-WP-024. When present, all variants emit as sibling `<div data-variant="base">…</div>` + `<div data-variant="{name}" hidden>…</div>` inside the scope wrapper; base + variant CSS concatenate into one `<style>` tag. `@container slot (max-width: …)` rules inside block CSS reveal the matching variant at each slot width. Variant keys regex-gated upstream by validators (`/^[a-z0-9-]+$/`); CSS content not sanitized. (WP-024 / ADR-025)

## Traps & Gotchas

- **"New page not showing"** — SSG pages are built at deploy time. New pages need revalidation via POST to `/api/revalidate` with the correct path.
- **"Block styles leaking between blocks"** — check CSS scoping. Every block MUST use `.block-{slug}` prefix. BlockRenderer wraps in `<div class="block-{slug}">` but the CSS itself must also scope.
- **`resolveSlots` temporarily removes `<style>` blocks** before processing `data-slot` attributes — to avoid matching CSS selectors that contain `data-slot`. Style blocks are restored after.
- **Layout/portal slot mismatch is silent.** If a new layout is pushed to DB without nested structure but portal code fills `'theme-blocks'` in `resolveSlots`, the slot content silently won't render (no placeholder to fill). Always ensure layout HTML matches the slots the renderer fills. (WP-020)
- **`stripDebug` removes debug toggle buttons** — blocks from /block-craft may include debug UI that must be stripped before production render.
- **Portal uses its own Supabase client** (`lib/supabase.ts`) with the anon key — NOT the service_role from the API. RLS applies to all portal reads.
- **`getThemeBySlug` uses `.eq('status', 'published')`** — draft themes are invisible to the portal.
- **Two scope-wrapper conventions coexist — pre-existing divergence.** `BlockRenderer` RSC emits `<div class="block-{slug}">`; `renderBlock()` string helper emits `<div data-block-shell="{slug}">`. Both work for CSS scoping in practice. WP-024 flagged but did not normalize (scope discipline). Watch when reading across the two render paths — future WP candidate.
- **`stripGlobalPageRules` matches top-level `html`/`body` only.** The regex `/(^|[}\s])(html|body)\s*\{[^}]*\}/g` stops at the first closing brace — `@container … { body { … } }` would have its inner `body {…}` stripped. Real variant/`@container` CSS uses class/attribute selectors under `.block-{slug}`, not raw `body`, so this edge case is harmless in practice (WP-024 phase-3 regression test confirms).
- **Theme-page `.slot-inner` wrapper bypasses slot container-type.** `apps/portal/app/themes/[slug]/page.tsx:189` injects a hand-written `<div class="slot-inner">` NOT inside `[data-slot]` — LM-generated `[data-slot] > .slot-inner { container-type: inline-size }` does NOT apply to it. Blocks rendered through the theme-page slot-blocks closure cannot use `@container slot` queries against that wrapper's width. Composed pages (`[[...slug]]/page.tsx`) unaffected. Forward-risk deferred to a future WP.

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
