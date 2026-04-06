# WP-013 Phase 1: On-Demand Revalidation via Cache Tags

> Workplan: WP-013 On-Demand Revalidation
> Phase: 1 of 1
> Priority: P1
> Estimated: 1 hour
> Type: Backend
> Affected domains: portal

---

## Context

```
CURRENT:  Portal pages use generateStaticParams() + revalidate=3600 (full SSG)   ✅
CURRENT:  Data fetched via Supabase JS SDK (not Next.js fetch)                   ✅
CURRENT:  revalidatePath() API exists but has no effect                           ❌
MISSING:  Cache layer between Supabase SDK and Next.js ISR                       ❌
MISSING:  Tag-based invalidation for granular cache busting                      ❌
```

**Problem:** `revalidatePath()` only invalidates Next.js fetch cache, but Supabase SDK
bypasses it entirely. Pages are rebuilt only on full redeploy or after 3600s timeout.

**Solution:** Wrap all Supabase data-fetching functions in `unstable_cache()` with
semantic tags. Update revalidate API to use `revalidateTag()`.

---

## Task 1.1: Wrap data functions in unstable_cache

### Files
- `apps/portal/lib/blocks.ts` — wrap 6 functions
- `apps/portal/lib/global-elements.ts` — wrap resolveGlobalBlocks

### Implementation

Each Supabase query gets wrapped with `unstable_cache` from `next/cache`:

| Function | Cache Key | Tags |
|----------|-----------|------|
| `getThemeBySlug(slug)` | `['theme', slug]` | `['themes', 'theme-{slug}']` |
| `getLayoutByScope(scope)` | `['layout', scope]` | `['layouts', 'layout-{scope}']` |
| `getTemplateById(id)` | `['template', id]` | `['templates']` |
| `fetchBlocksById(ids)` | `['blocks', ...ids]` | `['blocks']` |
| `getComposedPageBySlug(slug)` | `['page', slug]` | `['pages', 'page-{slug}']` |
| `getPageBlocksWithData(pageId)` | `['page-blocks', pageId]` | `['blocks', 'pages']` |
| `resolveGlobalBlocks(slots)` | `['global-elements', hash]` | `['blocks', 'global-elements']` |

### Pattern

```typescript
import { unstable_cache } from 'next/cache'

// Before:
export async function getThemeBySlug(slug: string) { ... }

// After:
async function _getThemeBySlug(slug: string) { ... }
export const getThemeBySlug = (slug: string) =>
  unstable_cache(_getThemeBySlug, ['theme', slug], {
    tags: ['themes', `theme-${slug}`],
    revalidate: 3600,
  })(slug)
```

---

## Task 1.2: Update revalidate API route

### File: `apps/portal/app/api/revalidate/route.ts`

Add `revalidateTag()` support. Accept both `path` and `tags` in request body:

```typescript
// POST body: { path?: string, tags?: string[] }
// - path: triggers revalidatePath (backwards compat)
// - tags: triggers revalidateTag for each tag

import { revalidatePath, revalidateTag } from 'next/cache'
```

### Common revalidation scenarios:
- Theme updated in DB → `tags: ["themes"]` or `tags: ["theme-{slug}"]`
- Block HTML changed → `tags: ["blocks"]`
- Layout changed → `tags: ["layouts"]`
- Global elements changed → `tags: ["global-elements"]`
- Everything → `tags: ["themes", "blocks", "layouts", "pages", "global-elements"]`

---

## Task 1.3: Remove generateStaticParams from pages

Remove `generateStaticParams()` from both page files. With `unstable_cache` + ISR,
pages render on-demand on first request and cache thereafter. No need for build-time
generation.

Keep `revalidate = 3600` as fallback timeout.

---

## Files to Modify

- `apps/portal/lib/blocks.ts` — wrap functions in unstable_cache
- `apps/portal/lib/global-elements.ts` — wrap resolveGlobalBlocks
- `apps/portal/app/api/revalidate/route.ts` — add revalidateTag support
- `apps/portal/app/themes/[slug]/page.tsx` — remove generateStaticParams
- `apps/portal/app/[[...slug]]/page.tsx` — remove generateStaticParams

---

## Acceptance Criteria

- [ ] All Supabase queries wrapped in unstable_cache with semantic tags
- [ ] revalidate API accepts `tags` param and calls revalidateTag()
- [ ] `curl POST /api/revalidate -d '{"tags":["themes"]}'` invalidates theme cache
- [ ] generateStaticParams removed from both pages
- [ ] Portal builds without errors
- [ ] Revalidation skill updated with tag examples

---

## Verification

```bash
echo "=== WP-013 Phase 1 Verification ==="

# 1. Build check
cd apps/portal && npx next build 2>&1 | tail -20
echo "(expect: build success)"

# 2. Check unstable_cache usage
grep -r "unstable_cache" apps/portal/lib/ --include="*.ts"
echo "(expect: blocks.ts, global-elements.ts)"

# 3. Check revalidateTag usage
grep -r "revalidateTag" apps/portal/ --include="*.ts"
echo "(expect: route.ts)"

# 4. Check no generateStaticParams
grep -r "generateStaticParams" apps/portal/app/ --include="*.tsx"
echo "(expect: empty — removed from both pages)"

echo "=== Verification complete ==="
```
