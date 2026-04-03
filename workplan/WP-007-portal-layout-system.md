# WP-007: Portal Layout System

> Layout pages + Astro SSG rendering. Takes layouts from Studio DB and renders theme pages on Portal.

**Status:** IN PROGRESS
**Priority:** P0 — no public portal without this
**Prerequisites:** WP-006 ✅ (block import pipeline), WP-005D Phase 1 ✅ (pages + global elements)
**Created:** 2026-04-03
**Completed:** —

---

## Phases

### Phase 1: Layout Page Editor ✅ DONE
- Scope selector (theme), HTML import/preview/export, slot detection panel
- DB: scope + html + css columns on pages table
- No type selector, no SEO for layouts

### Phase 2: Astro Portal Scaffold + Theme Page Render
- Create `apps/portal/` Astro SSG app
- Theme page route: `src/pages/themes/[slug].astro`
- Fetch layout by scope `theme` → resolve `{{slot:*}}` with global elements + template blocks
- Hook resolution: `{{price}}` → `theme.meta.price`
- Include `tokens.css`, `portal-blocks.css`, `animate-utils.js`
- 0 framework JS output

### Phase 3: Composed Pages + Homepage
- Catch-all route `src/pages/[...slug].astro` for composed pages
- Fetch page → page_blocks → render blocks in order
- Homepage created via composed page flow

### Phase 4: SEO + Sitemap + Deploy
- JSON-LD Product schema for themes
- OG tags, canonical URLs
- `sitemap.xml`, `robots.txt`
- Deploy to Cloudflare Pages
- Lighthouse > 95

### Phase 5: Docs + Close
- Update `.context/BRIEF.md`, `.context/CONVENTIONS.md`
- Execution logs for all phases

---

## Architecture Reference

- `workplan/PORTAL-BLOCK-ARCHITECTURE.md` — full block + layout + global elements spec
- `workplan/adr/023-block-animations.md` — animation layers
- `workplan/adr/024-block-components-states.md` — component strategy
