# Execution Log: WP-015 Phase 0 — RECON
> Epic: Use Cases Taxonomy
> Executed: 2026-04-07T13:40:00+02:00
> Duration: ~15 minutes
> Status: ✅ COMPLETE
> Domains affected: pkg-db, studio-core, app-portal

## What Was Investigated
Audited the existing taxonomy pattern (tags, categories, prices) across all three layers:
DB types+queries → Studio sidebar integration → Portal hook resolution + JSON-LD.
Read all three domain skills. Confirmed baseline arch-test passes (301 tests).

## Key Findings

| Area | Finding | Impact on Plan |
|------|---------|---------------|
| tags pattern | CRUD + junction (delete-all + re-insert) in `tags.ts`. No ILIKE search exists — we need to add `searchUseCases` as a new pattern. | Phase 1: add `searchUseCases(client, query)` with ILIKE + LIMIT |
| types.ts | Full Database type with Row/Insert/Update per table. 17 tables already typed. Convenience aliases pattern established. | Phase 1: add `use_cases` + `theme_use_cases` following same shape |
| index.ts exports | Groups exports by entity (queries + types). ~150 lines. | Phase 1: add use-cases export block at end |
| EditorSidebar | 312 lines. Sections: Thumbnail → Status → Categories → Tags → Price → separator → Meta. Uses `TaxonomyPickerModal` for cats/tags/prices. `labelStyle` constant for section headers. No collapsible sections — flat list. | Phase 2: insert "Perfect For" section between Tags and Price. TagInput inline (not modal) — fits fine in flat layout |
| theme-editor.tsx | useState pairs per taxonomy: `allTags`/`selectedTags`. Fetch on mount + fetch on theme load. Save in submit handler via `setThemeTags`. | Phase 2: follow exact same pattern for use cases |
| Portal hook resolution | `resolveBlockHooks()` in `lib/hooks.ts` — regex replacement. `{{price}}` → `$XX`, `{{meta:*}}` → value, `{{link:*}}` → URL. All simple string substitutions. | Phase 3: `{{perfect_for}}` needs to produce HTML list. Options: (A) add new regex case in `resolveBlockHooks`, (B) add to `resolveMetaHooks` treating it as meta. **Decision: Option A** — add `{{perfect_for}}` regex case that renders `<ul>` list |
| JSON-LD | Already exists in `themes/[slug]/page.tsx` lines 152-168. `Product` schema with `offers` and `aggregateRating`. | Phase 3: add `suitableFor` array to existing `jsonLd` object — trivial |
| Price enrichment pattern | Lines 68-76: fetches prices from junction table, injects into `meta` object before hook resolution. | Phase 3: follow same pattern — fetch use cases from junction, either inject into meta or resolve directly in hook |
| Supabase tables | Currently 17 tables typed (profiles, themes, blocks, templates, pages, page_blocks, global_elements, licenses, audit_log, categories, tags, theme_categories, theme_tags, prices, theme_prices, block_categories). Adding 2 more → 19. | Update BRIEF.md table count from 13→19 (already outdated — was 13, actually 17) |
| domain-manifest owned_tables | `pkg-db` owned_tables lists only 13 original tables. Missing: categories, tags, theme_categories, theme_tags, prices, theme_prices, block_categories. | Pre-existing gap. Should add use_cases + theme_use_cases AND fix the missing ones. Flag to Brain. |

## Confirmed Invariants
- All queries take SupabaseClient as first arg ✅
- Junction uses delete-all + re-insert pattern ✅
- types.ts has Row/Insert/Update for every table ✅
- index.ts re-exports all queries + types ✅
- Theme-editor follows useState + useEffect fetch pattern ✅
- Hook resolution is regex-based string replacement ✅
- JSON-LD already in theme page ✅
- EditorSidebar props are fully typed ✅

## Risks Identified
- **owned_tables drift**: `pkg-db` owned_tables in domain-manifest.ts only lists 13 tables but types.ts has 17. Adding 2 more without fixing this makes the gap worse. Recommend fixing in Phase 1.
- **{{perfect_for}} is multi-value HTML**: Unlike {{price}} (single value), this hook produces a `<ul>` with N items. The resolveBlockHooks function handles this fine (regex replace returns any string), but the block HTML must contain `{{perfect_for}}` placeholder where the list should appear.
- **Empty state**: If theme has 0 use cases, `{{perfect_for}}` should resolve to empty string (hide section). Block design needs to handle this — probably wrap in a container that hides when empty.

## Plan Adjustments
1. **Phase 1 addition**: fix `pkg-db` owned_tables to include all 17+2 tables (categories, tags, theme_categories, theme_tags, prices, theme_prices, block_categories + new use_cases, theme_use_cases).
2. **Phase 3 clarification**: `{{perfect_for}}` will be a new case in `resolveBlockHooks()` — fetches data and renders as `<ul class="perfect-for-list">` with `<li>` per use case. The data fetch needs to happen BEFORE hook resolution (same as prices pattern on line 68-76 of theme page).
3. **No changes needed to WP structure** — 4 phases confirmed.

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅ (301 tests) |
| Domain skills read | ✅ (pkg-db, studio-core, app-portal) |
| Pattern audit | ✅ (tags, categories, prices — all consistent) |
