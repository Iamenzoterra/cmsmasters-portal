# WP-007 Phase 3: Composed Pages + Homepage

> Workplan: WP-007 Portal Layout System
> Phase: 3 of 5
> Priority: P0
> Estimated: 1.5 hours
> Type: Frontend (Astro)
> Previous: Phase 2 ✅ (Astro portal + theme page SSG render)
> Next: Phase 4 (SEO + Sitemap + Deploy to Cloudflare Pages)

---

## Context

Phase 2 delivered theme page rendering via layout + template + global elements. Now: composed pages — static pages like homepage, about, pricing — assembled from blocks in Studio.

Composed pages are simpler than theme pages: no template, no block fills, no hooks. Just page → page_blocks → render in order. Global elements (header/footer) resolved by scope `composed:*` or `composed:{slug}`.

```
CURRENT:  apps/portal/ renders themes/[slug].astro only                    ✅
MISSING:  Catch-all route for composed pages ([...slug].astro)             ❌
MISSING:  Fetch page → page_blocks → render blocks                         ❌
MISSING:  Global elements for composed pages (scope: composed:*)           ❌
MISSING:  Homepage as composed page (slug: 'homepage' or root '/')         ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current portal pages
ls apps/portal/src/pages/

# 2. DB query functions for pages
grep -n "export async function" packages/db/src/queries/pages.ts

# 3. getPageBlocks — what it returns
grep -A 10 "getPageBlocks" packages/db/src/queries/pages.ts | head -15

# 4. Current global-elements.ts in portal
cat apps/portal/src/lib/global-elements.ts

# 5. Current blocks.ts — what functions exist
grep -n "export.*function\|export async" apps/portal/src/lib/blocks.ts

# 6. Existing index.astro (placeholder)
cat apps/portal/src/pages/index.astro
```

---

## Task 3.1: Add page + page_blocks queries to portal lib

### What to Build

**File:** `apps/portal/src/lib/blocks.ts` — add functions:

```typescript
/**
 * Fetch a composed page by slug.
 */
export async function getComposedPageBySlug(slug: string) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('type', 'composed')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  if (error) throw error
  return data
}

/**
 * Fetch page blocks with full block data, ordered by position.
 */
export async function getPageBlocksWithData(pageId: string) {
  const { data, error } = await supabase
    .from('page_blocks')
    .select('*, blocks(*)')
    .eq('page_id', pageId)
    .order('position', { ascending: true })
  if (error) throw error
  return data ?? []
}
```

---

## Task 3.2: Composed page route — `[...slug].astro`

### What to Build

**File:** `apps/portal/src/pages/[...slug].astro`

Catch-all route for composed pages. Renders page_blocks in order with global elements.

```astro
---
import Base from '../layouts/Base.astro'
import SEOHead from '../components/SEOHead.astro'
import { supabase } from '../lib/supabase'
import { getGlobalElements } from '../lib/global-elements'
import { getComposedPageBySlug, getPageBlocksWithData, fetchBlocksById } from '../lib/blocks'
import { renderBlock } from '../lib/hooks'

export async function getStaticPaths() {
  // Fetch all published composed pages
  const { data: pages } = await supabase
    .from('pages')
    .select('slug')
    .eq('type', 'composed')
    .eq('status', 'published')

  return (pages ?? []).map((p) => ({
    params: { slug: p.slug === 'homepage' ? undefined : p.slug },
  }))
}

const { slug } = Astro.params
const pageSlug = slug ?? 'homepage'

// 1. Fetch page
const page = await getComposedPageBySlug(pageSlug)

// 2. Resolve global elements for composed scope
const globalElements = await getGlobalElements('composed', pageSlug)

// 3. Fetch page blocks (ordered)
const pageBlocks = await getPageBlocksWithData(page.id)

// 4. Render blocks
const blocksHTML = pageBlocks.map((pb) => {
  const block = pb.blocks
  if (!block) return ''
  return renderBlock(block.html, block.css, block.slug, block.js || undefined)
}).join('\n')

// 5. Render global elements
const headerHTML = globalElements.header
  ? renderBlock(globalElements.header.html, globalElements.header.css, globalElements.header.slug)
  : ''
const footerHTML = globalElements.footer
  ? renderBlock(globalElements.footer.html, globalElements.footer.css, globalElements.footer.slug)
  : ''

const seo = (page.seo ?? {}) as Record<string, string>
---
<Base title={seo.title || page.title}>
  <Fragment slot="head">
    <meta name="description" content={seo.description || ''} />
    <link rel="canonical" href={new URL(`/${pageSlug === 'homepage' ? '' : pageSlug}`, Astro.site).href} />
    <meta property="og:title" content={seo.title || page.title} />
    <meta property="og:description" content={seo.description || ''} />
  </Fragment>
  <Fragment set:html={headerHTML} />
  <main>
    <Fragment set:html={blocksHTML} />
  </main>
  <Fragment set:html={footerHTML} />
</Base>
```

**Key details:**
- `slug: 'homepage'` maps to root URL `/` via `params: { slug: undefined }`
- Other slugs map to `/{slug}`
- Global elements resolved for `composed:*` or `composed:{slug}` scope
- SEO from page.seo (set in Studio)
- No hooks needed (composed pages are static content, no theme.meta)

---

## Task 3.3: Update `index.astro` to redirect or be replaced

### What to Build

**File:** `apps/portal/src/pages/index.astro`

The catch-all `[...slug].astro` with `slug: undefined` for homepage already handles `/`. Delete or replace the placeholder `index.astro` to avoid route conflict.

**Option A (recommended):** Delete `src/pages/index.astro` — the `[...slug].astro` handles `/` when slug is `homepage`.

**Option B:** Keep `index.astro` as a static fallback in case no `homepage` composed page exists.

Go with **Option A** — delete `index.astro`. If no `homepage` page exists in DB, the build simply won't generate `/index.html` (acceptable — CM must create the page first).

---

## Task 3.4: Verify build with composed pages

### What to Build

No code — just build verification.

```bash
cd apps/portal && npx astro build
```

Expected: if composed pages exist in DB with `status: 'published'`, they appear in `dist/`. If none exist yet, build succeeds with only theme pages.

To test: create a composed page in Studio with slug `homepage`, add a block, publish. Rebuild → `dist/index.html` should contain the block.

---

## Files to Modify

- `apps/portal/src/lib/blocks.ts` — add `getComposedPageBySlug`, `getPageBlocksWithData`
- `apps/portal/src/pages/[...slug].astro` — **NEW** — composed page catch-all
- `apps/portal/src/pages/index.astro` — **DELETE** — replaced by catch-all

---

## Acceptance Criteria

- [ ] `getComposedPageBySlug` and `getPageBlocksWithData` functions exist
- [ ] `[...slug].astro` route handles composed pages
- [ ] `slug: 'homepage'` maps to root `/` URL
- [ ] Other slugs map to `/{slug}`
- [ ] Global elements resolved for `composed:*` scope
- [ ] Page blocks rendered in position order
- [ ] SEO from page.seo applied
- [ ] `index.astro` placeholder deleted (no route conflict)
- [ ] `npx astro build` succeeds
- [ ] Theme pages still work (no regression)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-007 Phase 3 Verification ==="

# 1. Build succeeds
cd apps/portal && npx astro build 2>&1 | tail -5
echo ""

# 2. Theme pages still generated
ls dist/themes/*/index.html 2>/dev/null && echo "✅ Theme pages exist" || echo "⚠️ No theme pages (ok if no published themes)"

# 3. Composed page route exists
ls src/pages/\\[...slug\\].astro && echo "✅ Catch-all route exists" || echo "❌ Missing"

# 4. index.astro deleted
ls src/pages/index.astro 2>/dev/null && echo "❌ index.astro still exists" || echo "✅ Deleted"

# 5. Query functions
grep -c "getComposedPageBySlug\|getPageBlocksWithData" src/lib/blocks.ts
echo "(expect: 2+)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-007/phase-3-result.md`

---

## Git

```bash
git add apps/portal/src/lib/blocks.ts apps/portal/src/pages/ logs/wp-007/phase-3-result.md
git commit -m "feat: composed pages + homepage catch-all route [WP-007 phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **`[...slug].astro` is a catch-all** — it matches `/`, `/about`, `/pricing`, etc. Make sure it doesn't conflict with `/themes/[slug]` (Astro resolves specific routes first).
- **Homepage mapping:** `slug === 'homepage'` → `params: { slug: undefined }` → renders as `/index.html`. This is Astro's convention for root pages via catch-all.
- **No hooks for composed pages** — blocks are static content, no `{{price}}` or `{{meta:*}}`. Just `renderBlock(html, css, slug)`.
- **`page_blocks` join:** The Supabase query `select('*, blocks(*)')` joins page_blocks with blocks table, returning full block data inline. No separate fetch needed.
- **Global elements:** Use `getGlobalElements('composed', pageSlug)` — same function as theme pages but different scope.
- **Don't touch theme page route** — `themes/[slug].astro` must keep working exactly as is.
