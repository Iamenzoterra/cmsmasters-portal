# WP-007: Portal Layout System

> Layout pages + Astro SSG rendering. Takes layouts from Studio DB and renders theme pages on Portal.

**Status:** ✅ COMPLETE
**Priority:** P0 — no public portal without this
**Prerequisites:** WP-006 ✅ (block import pipeline), WP-005D Phase 1 ✅ (pages + global elements)
**Created:** 2026-04-03
**Completed:** 2026-04-03

---

## Phases

### Phase 1: Layout Page Editor ✅
- Scope selector (theme), HTML import/preview/export, slot detection panel
- DB: scope + html + css columns on pages table
- No type selector, no SEO for layouts

### Phase 2: Astro Portal Scaffold + Theme Page Render ✅
- `apps/portal/` Astro SSG app with build-time Supabase client
- Theme page route `themes/[slug].astro` with full pipeline
- Global elements resolution by scope (sitewide < layout:* < layout:themes)
- Template + block fills merge, hook resolution ({{price}}, {{meta:*}}, {{slot:*}})
- tokens.css, portal-blocks.css, animate-utils.js
- Zero framework JS

### Phase 3: Composed Pages + Homepage ✅
- Catch-all `[...slug].astro` for composed pages
- Homepage slug maps to root `/`
- Page blocks rendered in order with global elements

### Phase 4: SEO + Sitemap + Deploy ✅
- JSON-LD Product (themes) + WebPage (composed) schemas
- OG tags, canonical URLs
- `@astrojs/sitemap` → sitemap-index.xml
- robots.txt
- CF Pages wrangler.toml + deploy script

### Phase 5: Docs + Close ✅
- `.context/BRIEF.md` updated — Layer 2 done, Portal app complete
- Portal-workflow skill updated — current sprint, monorepo structure
- All phase logs in `logs/wp-007/`

---

## Architecture Reference

- `workplan/PORTAL-BLOCK-ARCHITECTURE.md` — full block + layout + global elements spec
- `workplan/adr/023-block-animations.md` — animation layers
- `workplan/adr/024-block-components-states.md` — component strategy
