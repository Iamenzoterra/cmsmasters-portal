# WP-005D: Portal — Pages, Global Elements, Astro SSG, Content Seed

> Public-facing Portal. Renders themes and static pages from DB blocks.
> Updated after brainstorm (30 March — 2 April 2026).
> Portal = full public site. Global elements with scope binding. Two page types. Two sidebars on theme pages.

**Status:** IN PROGRESS (Phase 0 done, Phase 1 in progress)
**Priority:** P0 — no public site without this
**Prerequisites:** WP-005B ✅ (DB + API), WP-005C ✅ (Studio blocks/templates CRUD)
**Milestone:** First public theme page + homepage on Portal
**Created:** 2026-03-30
**Rewritten:** 2026-04-02 — global_elements model, PAGE-CREATION-FLOW, no auto-generated layouts
**Completed:** —

---

## Architecture References

- `workplan/PORTAL-BLOCK-ARCHITECTURE.md` — full architecture spec
- `workplan/PAGE-CREATION-FLOW.md` — layout creation protocol (Figma → checklist → Studio)
- `workplan/BLOCK-ARCHITECTURE-V2.md` — block model (HTML+CSS assets, hooks, templates)

---

## DB State (2 April 2026)

9 tables in public schema:
- `blocks` (1 row), `templates` (2 rows), `themes` (1 row)
- `pages` (0 rows) — slug, title, type (layout|composed), seo, status. **No header/footer/sidebar refs.**
- `page_blocks` (0 rows) — page_id, block_id, position, config
- `global_elements` (0 rows) — slot, block_id, scope, priority
- `profiles` (1 row), `licenses` (0 rows), `audit_log` (3 rows)

**Key:** themes does NOT have page_id. Layout binding = global_elements with scope, not per-page/per-theme refs.

---

## Phases

### Phase 0: RECON ✅ (done)

### Phase 1: Studio Pages + Global Elements (3–4h)

**Goal:** Studio has Pages section and Global Elements settings. API routes for pages + global_elements CRUD. Types and validators.

**What this phase does NOT do:**
- Does NOT auto-create layout HTML for theme page — that's a manual process following `PAGE-CREATION-FLOW.md` (Figma → Claude Code → checklist → Studio import)
- Does NOT seed blocks — blocks are created through the manual block creation pipeline

**Tasks:**
1. Types + queries for pages, page_blocks, global_elements (`packages/db/`)
2. Validators for pages + global_elements (`packages/validators/`)
3. Hono API routes: pages CRUD + page_blocks CRUD + global_elements CRUD (`apps/api/`)
4. Studio: Pages in sidebar + list page + editor (layout type: title/slug/seo/status only; composed type: + block list with add/reorder/remove)
5. Studio: Global Elements settings page (per-slot scope configuration with block picker)
6. Studio: CORS — add Astro dev port (localhost:4321) to API

**Acceptance:**
- Studio shows Pages + Global Elements in sidebar
- Can create layout and composed pages
- Can configure global elements with scope binding
- API routes work for all three entities
- tsc clean

**Detail:** `workplan/wp-005d/PHASE-1-TASK.md`

---

### Phase 2: Astro Portal + Theme Page Render (3–4h)

**Goal:** `apps/portal/` Astro SSG renders theme pages. Global elements resolved at build time by scope.

**Prerequisites for this phase:**
- Phase 1 ✅ (API + Studio UI)
- **Theme page layout block created manually** through PAGE-CREATION-FLOW.md:
  1. Дмитро дає Figma макет (вже є — Rejuvita скріни)
  2. Claude Code верстає HTML+CSS grid з токенами
  3. Чекліст: slot/meta/content classification + responsive per element
  4. Import до Studio як layout block
  5. Global elements configured: header, footer, sidebar-left, sidebar-right з scope layout:themes
  6. PAGE-SPEC-theme-page.md створений

**Tasks:**

2.1 — Astro app scaffold
```
apps/portal/
├── astro.config.mjs
├── src/
│   ├── lib/
│   │   ├── supabase.ts          — build-time client (anon key)
│   │   ├── blocks.ts            — fetch + merge template positions + block fills
│   │   ├── hooks.ts             — resolveHooks: {{price}}, {{meta:name}}, {{link:*}}, {{slot:*}}
│   │   └── global-elements.ts   — resolveGlobalElements by scope + priority
│   ├── styles/global.css        — Manrope, reset, tokens.css import
│   ├── layouts/Base.astro       — <html>, <head>, global CSS
│   ├── components/
│   │   ├── BlockRenderer.astro  — single block: scoped CSS + HTML + hooks
│   │   ├── LayoutRenderer.astro — layout block: resolve slots + render blocks into them
│   │   ├── SEOHead.astro        — JSON-LD, OG, canonical
│   │   └── EntitlementScript.astro — inline ~2KB JS for entitlement toggle
│   └── pages/
│       └── themes/[slug].astro  — SSG theme page
```

2.2 — Theme page render pipeline (global elements, NOT page refs):
```
[slug].astro:
1. getStaticPaths() → all published themes
2. Per theme:
   a. Fetch theme (meta, template_id, block_fills, seo)
   b. Resolve global elements for scope 'layout:themes':
      → header, footer, sidebar-left, sidebar-right blocks
   c. Fetch layout block from global_elements (the grid/structure block)
   d. Fetch template → positions[], merge with block_fills
   e. Fetch all content blocks
   f. Render layout block:
      - {{slot:header}} → header global element block HTML
      - {{meta:name}}, {{meta:tagline}} → theme.meta values
      - {{slot:sidebar-left}} → sidebar-left block HTML (entitlement hooks)
      - {{slot:content}} → template blocks rendered in order
      - {{slot:sidebar-right}} → sidebar-right block HTML (theme data hooks)
      - {{slot:footer}} → footer global element block HTML
   g. Resolve all remaining hooks: {{price}}, {{link:*}}
   h. SEO: JSON-LD Product, OG tags
   i. Inject EntitlementScript (~2KB)
3. Output: dist/themes/{slug}/index.html
```

2.3 — Global elements resolution:
```typescript
// lib/global-elements.ts
export async function resolveGlobalElements(
  supabase: SupabaseClient,
  pageType: 'layout' | 'composed',
  pageSlug: string
): Promise<Record<string, Block | null>> {
  const { data } = await supabase
    .from('global_elements')
    .select('*, blocks(*)')
    .order('priority', { ascending: false })

  const result: Record<string, Block | null> = {}
  for (const slot of ['header', 'footer', 'sidebar-left', 'sidebar-right']) {
    const match = data?.find(ge =>
      ge.slot === slot && matchesScope(ge.scope, pageType, pageSlug)
    )
    result[slot] = match?.blocks ?? null
  }
  return result
}
```

**Acceptance:**
- apps/portal/ builds with Astro
- Theme page renders: layout block → slots filled with global elements + content blocks
- Hooks resolved ({{price}}, {{meta:name}}, {{slot:*}})
- CSS scoped per block
- 0 framework JS
- Entitlement zones in HTML (guest state mock)

---

### Phase 3: Composed Pages + Homepage (2–3h)

**Prerequisites:**
- Phase 2 ✅
- **Homepage layout + blocks created manually** through PAGE-CREATION-FLOW.md

**Tasks:**
3.1 — Composed page render: `src/pages/[...slug].astro`
3.2 — Homepage blocks created through manual pipeline (Figma → Claude Code → Studio)
3.3 — Homepage assembled in Studio via page_blocks

**Acceptance:**
- Homepage renders from page_blocks
- Global elements (header/footer) resolved by scope
- Theme card slots show real data

---

### Phase 4: SEO + Content Seed (2–3h)

**Tasks:**
4.1 — JSON-LD, OG, sitemap, robots.txt, canonical
4.2 — 5+ real theme content blocks from Figma (created through manual block pipeline)
4.3 — End-to-end: theme page with real blocks, homepage with blocks, Lighthouse > 95

---

### Phase 5: Docs + Close (0.5h)

Update .context/ files, close WP-005.

---

## ⚠️ CRITICAL: No Auto-Generated Layouts

Layout creation (theme page layout, homepage layout) is a **manual process** following `workplan/PAGE-CREATION-FLOW.md`:

1. Figma → Дмитро дає макет з slot map + spacing spec
2. Claude Code → верстає HTML+CSS з токенами
3. Чекліст → Claude Code питає оператора: slot/meta/content? responsive? triggers?
4. Import → layout block в Studio library
5. Global Elements → configure scopes + priorities
6. Page Spec → document saved

**This is NOT automatable.** Each layout is a design decision. Claude Code executes, but Дмитро approves every slot assignment and responsive strategy.

Phase 2 and 3 DEPEND on layouts being created through this manual process before Astro can render them. The phases build the rendering engine — not the layouts themselves.

---

## Acceptance Criteria (full WP-005D)

- [ ] `pages` and `page_blocks` API routes + Studio UI
- [ ] `global_elements` API routes + Studio settings page
- [ ] Global elements resolution by scope at build time
- [ ] apps/portal/ Astro SSG builds
- [ ] Theme page renders through layout block (slots + hooks)
- [ ] Homepage renders as composed page
- [ ] Entitlement zones in HTML (mock guest state)
- [ ] SEO complete (JSON-LD, OG, sitemap)
- [ ] 0 framework JS
- [ ] Lighthouse > 95
- [ ] PAGE-SPEC-theme-page.md exists (from manual flow)
- [ ] All phases logged
- [ ] .context/ docs updated
