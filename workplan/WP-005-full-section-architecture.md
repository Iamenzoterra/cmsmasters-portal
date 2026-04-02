# WP-005: DB-Driven Block System — Blocks, Templates, Portal (Orchestrator)

> Master workplan. Delegates to WP-005A through WP-005D.
> Each sub-WP is a standalone workplan with its own RECON, phases, logs, and docs update.

**Status:** IN PROGRESS (005A+B done, 005C–D next)
**Priority:** P0 — blocks MVP (no public theme page without this)
**Prerequisites:** WP-004 ✅ (section model in DB + types + validators + Studio page builder)
**Milestone:** First public theme page on Portal with real blocks from Figma
**Created:** 2026-03-30
**Rewritten:** 2026-03-31 — architecture pivot from hardcoded Block Library to DB-driven model
**Completed:** —

---

## Architecture Pivot (2026-03-31)

Original plan: blocks = hardcoded `.astro` files in `packages/blocks/`, Zod schemas with typed fields, Studio generates forms from schemas, Portal imports `.astro` directly.

**New plan (BLOCK-ARCHITECTURE-V2.md):**

- **Block** = HTML + scoped CSS ассет. Created outside Studio (Figma → Claude Code → HTML+CSS). Stored in Supabase `blocks` table. No inline-editable fields. Has hooks for dynamic data (price, links, alt).
- **Template** = ordered grid of positions (1–20). Some filled with blocks, some empty ("+"). CRUD in Studio. One template → many themes.
- **Theme** = `template_id` + `block_fills` (CM fills empty positions per-theme via "+"). Dynamic data (price, links) lives in `theme.meta` → hooks inject at render time.

**Why pivot:** Real Figma blocks are free-form visual components, not typed data structures. Content structure varies per block. CM assembles pages by picking blocks, not filling forms.

**What stays from Phases 0–2:** `type` → `block` rename across codebase. Clean monorepo. Package structure.

**What's discarded:** 12 hardcoded Zod schemas, typed per-block editors in Studio, static BLOCK_REGISTRY, `.astro` files in packages/blocks/, Zod→form auto-generation.

---

## Sub-Workplans

| WP | Name | Delivers | Effort | Depends on | Status |
|----|------|----------|--------|------------|--------|
| **005A** | Codebase Cleanup + Close | `type`→`block` rename, cleanup `packages/blocks/`, docs update | 2h | WP-004 ✅ | ✅ DONE |
| **005B** | DB Foundation + API | Supabase `blocks` + `templates` tables, `themes` alter, RLS, 10 Hono CRUD endpoints, validators, query layer | ~4h | 005A ✅ | ✅ DONE (2026-03-31) |
| **005C** | Studio: Blocks, Templates, Theme Editor | Studio Blocks CRUD page, Templates CRUD page, Theme Editor pivot (template picker + "+" for per-theme fills) | 12–16h | 005B ✅ | WAITING |
| **005D** | Astro Portal + Content Seed | `apps/portal/` Astro SSG renders blocks from DB, hook resolution (compile-time), SEO, seed first blocks from Figma, first templates, first themes | 12–16h | 005B ✅ | WAITING |

---

## Dependency Graph

```
WP-004 ✅
  │
  └─→ WP-005A (Cleanup + Close)
        │
        └─→ WP-005B (DB + API)               ← FOUNDATION
              │
              ├─→ WP-005C (Studio pages)      ← CM can manage blocks/templates/themes
              │
              └─→ WP-005D (Portal + Seed)     ← Public-facing rendering
                        ↑
                   005C helpful for seed review
                   but not strictly required
                   (seed via API script works)
```

005C and 005D can run in parallel after 005B. 005D content seeding benefits from Studio (005C) for CM review, but initial seed can be done via API script.

---

## Architecture Reference

Full architecture: `workplan/BLOCK-ARCHITECTURE-V2.md`

Key decisions:
- CSS isolation: class prefix `.block-{slug}` per block
- Hook resolution: compile-time in Astro (string replacement, zero JS)
- Block versioning: auto-update, always latest (versioning = Epic 2)
- Position model: vertical grid 1–N, not hardcoded direction (may need horizontal later)
- `sections` column: DROP (0 rows in DB, safe)

---

## DB Schema (from Architecture V2)

### New tables

```sql
-- blocks: HTML+CSS visual components
blocks (id, slug, name, html, css, hooks jsonb, metadata jsonb, created_by, created_at, updated_at)

-- templates: ordered position grids with block assignments
templates (id, slug, name, description, positions jsonb, max_positions int, created_by, created_at, updated_at)
```

### themes — migration

```sql
ALTER TABLE themes DROP COLUMN IF EXISTS sections;
ALTER TABLE themes ADD COLUMN template_id uuid REFERENCES templates(id);
ALTER TABLE themes ADD COLUMN block_fills jsonb NOT NULL DEFAULT '[]';
```

---

## Timeline

```
005A close:             ██              2h (Phase 3+4)
005B (DB + API):            ████        10-14h (~3 days)
005C (Studio):                  █████   12-16h (~3 days, can parallel with 005D)
005D (Portal + Seed):           █████   12-16h (~3 days)
                        ───────────────
Total:                  ~2 weeks (with parallelism)
```

---

## Acceptance Criteria (whole WP-005)

### 005A — Cleanup + Close
- [x] `type` → `block` rename complete across codebase
- [x] `ThemeSection` → `ThemeBlock` with `.block` field
- [x] `packages/blocks/` created with registry (Phase 1-2)
- [ ] Hardcoded registry, schemas, validation removed from `packages/blocks/`
- [ ] DB types (Block, Template, ThemeBlock) in `packages/db/`
- [ ] `.context/` docs updated

### 005B — DB Foundation + API
- [ ] `blocks` table in Supabase with RLS
- [ ] `templates` table in Supabase with RLS
- [ ] `themes.sections` column dropped, `template_id` + `block_fills` added
- [ ] Hono API: CRUD `/api/blocks` (list, get, create, update, delete)
- [ ] Hono API: CRUD `/api/templates` (list, get, create, update, delete)
- [ ] Hono API: dependency check on delete (block used in template? template used in theme?)
- [ ] Zod validators for block + template payloads

### 005C — Studio Pages
- [ ] Studio → Blocks page: list, add (HTML+CSS+hooks), edit, delete
- [ ] Studio → Templates page: list, create (position grid + block picker), edit, delete
- [ ] Studio → Theme Editor: template picker, show positions, "+" for empty slots
- [ ] Per-theme block_fills saved correctly
- [ ] Dependency warnings (can't delete block used in template)

### 005D — Portal + Content Seed
- [ ] `apps/portal/` Astro SSG renders theme pages
- [ ] Block renderer: fetch blocks from Supabase, render HTML per position
- [ ] Hook resolution: `{{price}}` → theme.meta.price at build time
- [ ] CSS scoped per block (`.block-{slug}`)
- [ ] SEO: JSON-LD Product, OG tags, sitemap, canonical
- [ ] 0 framework JS in output
- [ ] Lighthouse Performance > 95
- [ ] At least 5 blocks created from Figma frames
- [ ] At least 1 template created
- [ ] At least 1 theme rendering end-to-end

### General
- [ ] All sub-WP logs in `logs/wp-005{a,b,c,d}/`
- [ ] `.context/` docs current
- [ ] No stale references to old section model, hardcoded block registry, or packages/blocks/ schemas

---

## Detail Workplans

| File | Status | Notes |
|------|--------|-------|
| `workplan/wp-005a/WORKPLAN.md` | Phases 0-2 ✅ | Phase 3 (cleanup) + Phase 4 (docs) TODO |
| `workplan/wp-005b/WORKPLAN.md` | ❌ OUTDATED | Was: Astro Portal. Needs full rewrite → DB + API |
| `workplan/wp-005c/WORKPLAN.md` | ❌ OUTDATED | Was: Studio SchemaForm. Needs full rewrite → Blocks/Templates/Theme CRUD |
| `workplan/wp-005d/WORKPLAN.md` | ❌ OUTDATED | Was: Content Pipeline. Needs full rewrite → Portal rendering + Seed |
| `workplan/BLOCK-ARCHITECTURE-V2.md` | ✅ CURRENT | Architecture reference for all sub-WPs |

---

## What Was Superseded

| Old concept | New concept | Why |
|------------|------------|-----|
| `packages/blocks/` with 12 Zod schemas | `blocks` Supabase table with HTML+CSS | Blocks are visual assets, not typed data |
| `.astro` files in Block Library | HTML stored in DB, rendered at build time | CM manages blocks through Studio, not code |
| `BLOCK_REGISTRY` hardcoded in code | Supabase query `getBlocks()` | Dynamic library, not compile-time registry |
| Zod→form auto-generation (SchemaForm) | Block picker (visual library) | CM picks blocks, doesn't fill schema forms |
| `sections[]` with `{ block, data }` | `template_id` + `block_fills[]` | Template-driven with per-theme additions |
| Typed per-block editors (HeroEditor, etc.) | No per-block editors — blocks are HTML assets | Content is in the HTML, not in editable fields |
| `getDefaultSections()` / `getDefaultBlocks()` | Template selection | Templates define default block layouts |
