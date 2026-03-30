# WP-004: Section-Driven Architecture Recovery

> Course correction: flat 27-column model → `meta` + `sections[]` + `seo` jsonb. Zero rows in DB = cheapest moment.

**Status:** DONE
**Completed:** 2026-03-30
**Priority:** P0 — Critical path (blocks Portal rendering)
**Prerequisites:** WP-003 Phases 0–4 ✅ (Studio shell, list, editor, save/publish exist)
**Milestone:** MVP Slice — architecture fix before Layer 2
**Estimated effort:** 8–11 hours across 6 phases
**Created:** 2026-03-30
**Completed:** —

---

## Problem Statement

The original vision: every theme page = `sections[]` array. Order from JSON, not code. 100% section-driven. Content Manager decides which sections appear, in which order, per theme — zero code changes needed.

What was built in WP-003: 27 flat columns, a flat form, and a hardcoded template assumption. This means:
- Can't reorder sections per theme
- Can't remove a section from one theme without removing it from all
- Can't add a new section type without DB + types + validators + form changes
- Portal (Layer 2) would render a hardcoded section order — defeating the entire architecture

The cost of fixing now: minimal (0 rows in themes table, localhost-only testing). The cost of fixing later: exponential — every row in DB, every query, every form component would need migration.

Full gap analysis: `workplan/ARCHITECTURE-DRIFT-ANALYSIS.md`

---

## Solution Overview

### Architecture

```
Studio (Vite SPA)
  └─ Section Page Builder
       ├── Left: ordered sections[] list (add / remove / reorder / expand-to-edit)
       └── Right: meta sidebar (thumbnail, status, category, price, SEO, etc.)
              │
     Form shape mirrors DB shape (nested, not flat):
     { meta: { name, ... }, sections: [{ type, data }], seo: { title, ... } }
              │
              ▼
     formDataToThemeInsert()          ←── THIN MAPPER (null→default conversions only)
              │
              ▼
     Supabase: themes table
     ┌───────────────────────────────────────────────────────────┐
     │ id │ slug │ status │ meta {} │ sections [] │ seo {} │ …  │
     └───────────────────────────────────────────────────────────┘
              │
              ▼
     themeRowToFormData()             ←── THIN MAPPER (null→default conversions only)
              │
              ▼
     Portal (Next.js SSG)
       └─ sections.map(s => SECTION_COMPONENTS[s.type])
          → rendered in JSON order, zero hardcoding
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| 3 jsonb columns vs 1 big jsonb | `meta` + `sections` + `seo` separately | Query efficiency: list page reads only `meta`, Portal reads all three, SEO generation reads only `seo` | Single `content` jsonb (harder to query selectively) |
| **Form shape = nested (mirrors DB)** | **Form paths: `meta.name`, `meta.category`, `sections[i].data`, `seo.title`** | **Sections are an array — flat form can't express N sections of same type. Thin mappers (null→default only) vs thick translation layer. `useFieldArray({ name: 'sections' })` works natively. New section type = 0 mapper changes.** | **Flat form with thick mappers (saves ~25 path renames now, but mappers grow per section type and can't represent repeatable sections)** |
| Section registry as source of truth | `SECTION_REGISTRY` in validators package | Single point: validation, type derivation, labels, add-picker all from one map | Per-file loose schemas (no enforcement of known types) |
| Core 5 + 7 stubs | Full editor UI for 5 core types, JSON textarea for 7 stubs | Ship MVP fast, stubs are valid and extensible | All 12 with full UI (too much work for this WP) |
| Boundary mapper pair | Two functions as the ONLY contract boundary | Prevents ad-hoc field mapping scattered across codebase | Inline mapping in each component (drift-prone) |
| Array position = section order | No separate `order` field; `sections[i]` index is the order | Simplest model, reorder = array splice, no sync issues | Explicit `order: number` per section (redundant) |

---

## What This Changes

### New Files

```
packages/validators/src/sections/
├── index.ts              — SECTION_REGISTRY, SECTION_TYPES, validateSection(), SECTION_LABELS
├── theme-hero.ts         — full Zod schema
├── feature-grid.ts       — full Zod schema
├── plugin-comparison.ts  — full Zod schema
├── trust-strip.ts        — full Zod schema
├── related-themes.ts     — full Zod schema
├── before-after.ts       — stub schema
├── video-demo.ts         — stub schema
├── testimonials.ts       — stub schema
├── faq.ts                — stub schema
├── cta-banner.ts         — stub schema
├── stats-counter.ts      — stub schema
└── resource-sidebar.ts   — stub schema

packages/db/src/mappers.ts  — themeRowToFormData() + formDataToThemeInsert()
```

### Modified Files

```
packages/db/src/types.ts           — ThemeRow → meta/sections/seo shape; ThemeMeta, ThemeSection, ThemeSEO interfaces
packages/db/src/queries/themes.ts  — getThemes(), getThemeBySlug(), upsertTheme() → new jsonb shape
packages/validators/src/theme.ts   — flat themeSchema → nested { meta: metaSchema, sections: sectionsSchema, seo: seoSchema }
packages/validators/src/index.ts   — re-export section registry

apps/studio/src/lib/form-defaults.ts      — rewrite mappers (thin: null→default only), update getDefaults()
apps/studio/src/pages/themes-list.tsx      — theme.name → theme.meta.name, theme.category → theme.meta.category
apps/studio/src/components/theme-card.tsx   — all flat reads → meta.* reads
apps/studio/src/components/themes-table.tsx — all flat reads → meta.* reads
apps/studio/src/components/editor-sidebar.tsx — form paths: 'category' → 'meta.category', 'rating' → 'meta.rating', etc.
apps/studio/src/pages/theme-editor.tsx      — flat form → section page builder, all register() paths → nested
apps/studio/src/lib/queries.ts              — select meta/sections/seo jsonb
```

### Database Changes

```sql
-- Migration: drop flat columns, add jsonb columns
-- IMPORTANT: Phase 0 confirmed 6 ADR-009 columns exist in live DB but not in
-- initial migration file. Verify with information_schema before DROP.

ALTER TABLE public.themes
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS demo_url,
  DROP COLUMN IF EXISTS themeforest_url,
  DROP COLUMN IF EXISTS themeforest_id,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS preview_images,
  DROP COLUMN IF EXISTS features,
  DROP COLUMN IF EXISTS included_plugins,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS hero,
  DROP COLUMN IF EXISTS compatible_plugins,
  DROP COLUMN IF EXISTS trust_badges,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS sales,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS custom_sections;

ALTER TABLE public.themes
  ADD COLUMN meta JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN sections JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN seo JSONB DEFAULT '{}';

-- Phase 0 confirmed: RLS policies reference only status + get_user_role(). No updates needed.
```

---

## Implementation Phases

### Phase 0: RECON — Hard Inventory of All Flat-Field References (0.5–1h) ✅

**Goal:** Exact grep list of every file+line that touches flat theme columns.

**Result:** `logs/wp-004/phase-0-result.md` — full inventory across 9 layers. Key findings:
- 12 files to modify, ~160+ flat-field references
- RLS policies: 0 content column refs (safe)
- Hono API: 0 theme refs (safe)
- 6 ADR-009 columns exist in types.ts but not in initial migration — verify live DB before DROP
- Boundary mappers in form-defaults.ts map 23 fields (read) / 24 fields (write)

---

### Phase 1: Schema Migration + Types + Validators + Boundary Mappers (2–3h)

**Goal:** DB has new shape, TypeScript types match, Zod validators enforce nested `{ meta, sections, seo }` shape, thin boundary mappers proven with round-trip test. Code may not compile yet (call sites not migrated).

**Tasks:**

1.1. **DB migration** — Verify live DB columns via `information_schema`, then execute SQL: drop 21 flat columns, add `meta` + `sections` + `seo` jsonb.

1.2. **Types rewrite** (`packages/db/src/types.ts`)
- `ThemeMeta` interface: name, tagline, description, category, price, demo_url, themeforest_url, themeforest_id, thumbnail_url, rating, sales, compatible_plugins, trust_badges, resources
- `SectionType` literal union derived from registry keys (not bare `string`)
- `ThemeSection` interface: `{ type: SectionType, data: Record<string, unknown> }`
- `ThemeSEO` interface: title, description
- `ThemeRow`: id, slug, status, meta, sections, seo, created_by, created_at, updated_at

1.3. **Validators rewrite** (`packages/validators/src/theme.ts`) — **nested shape matching form**
- `metaSchema` — Zod schema matching ThemeMeta (name, tagline, category, price, etc.)
- `seoSchema` — Zod schema matching ThemeSEO (title, description)
- `themeSectionsSchema` — `z.array(sectionSchema)` where each element validates type + data
- Top-level `themeSchema` = `z.object({ meta: metaSchema, sections: themeSectionsSchema, seo: seoSchema, status })` — form shape mirrors DB shape
- `ThemeFormData = z.infer<typeof themeSchema>` — nested, not flat

1.4. **Thin boundary mapper pair** (`packages/db/src/mappers.ts`)
- `themeRowToFormData(row: ThemeRow): ThemeFormData` — null→default conversions only (row.meta → form.meta with defaults for missing fields, row.sections → form.sections ?? [], row.seo → form.seo with defaults)
- `formDataToThemeInsert(form: ThemeFormData, existingId?: string): ThemeInsert` — form → DB with empty→null normalization
- These are thin because form shape ≈ DB shape. No field-by-field translation.

1.5. **Round-trip proof** — Create a test fixture: ThemeRow → formData → ThemeInsert → compare. Proves the mapper pair is lossless.

**Verification:**
```bash
# DB columns correct
SELECT column_name FROM information_schema.columns
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;
# Expected: id, slug, status, meta, sections, seo, created_by, created_at, updated_at

# Types compile
npx tsc --noEmit --project packages/db/tsconfig.json
npx tsc --noEmit --project packages/validators/tsconfig.json
```

---

### Phase 2: Section Registry — Core 5 + Stubs (1–1.5h)

**Goal:** Section registry exists as single source of truth. All 12 types have valid Zod schemas. Core 5 have full data shapes for editor UI. Stubs have permissive schemas for JSON textarea editing.

**Tasks:**

2.1. **Create registry structure** (`packages/validators/src/sections/index.ts`)
- `SECTION_REGISTRY: Record<SectionType, z.ZodSchema>` — maps type → schema
- `SECTION_TYPES` — derived from registry keys
- `SECTION_LABELS: Record<SectionType, string>` — human labels for UI
- `CORE_SECTION_TYPES: SectionType[]` — the 5 types shown in add picker
- `validateSection(section: { type: string; data: unknown })` — validates against registry

2.2. **Core 5 schemas** (full data shape, full editor UI in Phase 4):
- `theme-hero` — `{ headline?: string, screenshots: string[] }`
- `feature-grid` — `{ features: [{ icon: string, title: string, description: string }] }`
- `plugin-comparison` — `{ included_plugins: [{ name, slug, value, icon_url }] }`
- `trust-strip` — `{}` (renders from meta.trust_badges)
- `related-themes` — `{ category?: string, limit?: number }`

2.3. **Stub schemas** (7 types: `before-after`, `video-demo`, `testimonials`, `faq`, `cta-banner`, `stats-counter`, `resource-sidebar`)
- Each: `z.record(z.string(), z.unknown())` — permissive but typed
- Not shown in add picker unless explicitly enabled

2.4. **Wire into validators** — re-export from `packages/validators/src/index.ts`, integrate with `themeSectionsSchema` from Phase 1

**Verification:**
```bash
# Registry compiles and exports correctly
npx tsc --noEmit --project packages/validators/tsconfig.json

# Quick smoke: import and check registry has 12 entries
node -e "const r = require('./packages/validators/dist/sections'); console.log(Object.keys(r.SECTION_REGISTRY).length)"
# Expected: 12
```

---

### Phase 3: Query Recovery — All Call Sites Migrated (1.5–2h)

**Goal:** Every reference from Phase 0 inventory is migrated to nested shape. Grep returns 0 flat-field matches in runtime code. List page and editor compile and render (even with 0 rows).

**Tasks:**

3.1. **`packages/db` queries** (`queries/themes.ts`)
- `getThemes()` — returns typed rows; list page reads `theme.meta.name`, `theme.meta.category`, `theme.status`
- `getThemeBySlug()` — returns full row with meta/sections/seo
- `upsertTheme()` — accepts new shape from boundary mapper

3.2. **Studio queries** (`apps/studio/src/lib/queries.ts`)
- `fetchAllThemes()` — updated select, returns typed rows
- `fetchThemeBySlug()` — same

3.3. **Studio list page components** — all flat reads → `meta.*` reads
- `themes-list.tsx` — `theme.name` → `theme.meta.name`, `theme.category` → `theme.meta.category`
- `theme-card.tsx` — `theme.name` → `theme.meta.name`, `theme.tagline` → `theme.meta.tagline`, `theme.thumbnail_url` → `theme.meta.thumbnail_url`, `theme.category` → `theme.meta.category`, `theme.price` → `theme.meta.price`
- `themes-table.tsx` — `theme.name` → `theme.meta.name`, `theme.category` → `theme.meta.category`, `theme.price` → `theme.meta.price`

3.4. **Studio form-defaults.ts** — rewrite mappers for nested form shape
- `getDefaults()` — parse via new nested themeSchema
- `themeToFormData()` → `themeRowToFormData()` from `packages/db/src/mappers.ts` (or thin local wrapper)
- `formDataToUpsert()` → `formDataToThemeInsert()` from mappers
- Update all imports in theme-editor.tsx

3.5. **Editor path renames** (~25 mechanical changes in theme-editor.tsx + editor-sidebar.tsx)
- `register('name')` → `register('meta.name')`
- `register('tagline')` → `register('meta.tagline')`
- `register('category')` → `register('meta.category')`
- `register('price')` → `register('meta.price')`
- `register('thumbnail_url')` → `register('meta.thumbnail_url')`
- `register('demo_url')` → `register('meta.demo_url')`
- `register('themeforest_url')` → `register('meta.themeforest_url')`
- `register('themeforest_id')` → `register('meta.themeforest_id')`
- `watch('name')` → `watch('meta.name')` (slug auto-gen)
- `watch('status')` → stays `watch('status')` (top-level)
- `watch('thumbnail_url')` → `watch('meta.thumbnail_url')`
- `watch('seo_title')` → `watch('seo.title')`
- `watch('seo_description')` → `watch('seo.description')`
- `register('seo_title')` → `register('seo.title')`
- `register('seo_description')` → `register('seo.description')`
- EditorSidebar `useController` paths:
  - `'rating'` → `'meta.rating'`
  - `'trust_badges'` → `'meta.trust_badges'`
  - `'compatible_plugins'` → `'meta.compatible_plugins'`
  - `'resources.public'` → `'meta.resources.public'`
  - `'resources.licensed'` → `'meta.resources.licensed'`
  - `'resources.premium'` → `'meta.resources.premium'`
  - `'sales'` → `'meta.sales'`

3.6. **Structural proof** — re-run Phase 0 greps, confirm 0 matches in runtime code

**Verification:**
```bash
# Flat column names in runtime code = 0
grep -rn "\.name\b" apps/studio/src/ packages/db/src/ --include="*.ts" --include="*.tsx" \
  | grep -v "meta\.name\|node_modules\|\.md\|migration\|workplan\|mappers"
# Expected: 0 matches (or only false positives like variable names)

# TypeScript compiles
npx tsc --noEmit

# Studio builds
npx nx build @cmsmasters/studio
```

---

### Phase 4: Studio Editor — Section-Based Page Builder (2–3h)

**Goal:** Theme editor is a section page builder. Default sections appear on create. Sections can be added, removed, reordered. Save persists `{ meta, sections[], seo }`. Round-trip: create → save → reload → data intact, order preserved.

**Tasks:**

4.1. **Left panel: Section list** — powered by `useFieldArray({ name: 'sections' })`
- Default sections for new theme: `[theme-hero, feature-grid, plugin-comparison, trust-strip, related-themes]`
- Each section: collapsed (type label + summary) / expanded (per-type form)
- Add section: picker shows `CORE_SECTION_TYPES` only → `append({ type, data: defaults })`
- Remove section: × button with confirm → `remove(index)`
- Reorder: up/down buttons → `swap(index, index±1)` (drag-and-drop deferred to WP-005)
- Section order = `sections[]` array position. Save takes current array as-is.

4.2. **Right panel: Meta sidebar** — paths already renamed in Phase 3
- Thumbnail (`meta.thumbnail_url`), Status, Category (`meta.category`), Price (`meta.price`), Rating (`meta.rating`), Sales (`meta.sales`), Trust Badges (`meta.trust_badges`), Resources (`meta.resources.*`), SEO (`seo.title`, `seo.description`)
- Reuses existing components: ChipSelect, StarRating, CharCounter, EditorSidebar

4.3. **Per-type section editors (core 5):**
- `theme-hero`: headline input + screenshots URL list → `register('sections.${i}.data.headline')`
- `feature-grid`: repeater `[{icon, title, description}]` with add/remove → nested `useFieldArray`
- `plugin-comparison`: repeater `[{name, slug, value, icon_url}]` with auto-sum + compatible chips
- `trust-strip`: no editor (renders from `meta.trust_badges`)
- `related-themes`: category override + limit

4.4. **Stub type editor** — if a stub section exists in `sections[]` (e.g. loaded from DB), show as JSON textarea. Not shown in add picker.

4.5. **Wire save/publish** — uses `formDataToThemeInsert()` exclusively. No ad-hoc mapping.

**Verification:**
```bash
# Build succeeds
npx nx build @cmsmasters/studio

# Manual verification scenarios:
# 1. Create new theme → see 5 default sections → edit meta → add one section → reorder → save → reload → data + order preserved
# 2. Insert unknown section type in DB → validator blocks save, error shown
# 3. List page renders correctly after migration (empty state or seed theme)
```

---

### Phase 5: Documentation Update (0.5–1h)

**Goal:** All docs reflect what was actually built, based on phase logs.

**Tasks:**

5.1. **CC reads all phase logs** — understands what was done, what deviated from plan

5.2. **CC proposes doc updates** — list of files to update with proposed changes

5.3. **Brain approves** — reviews proposed changes

5.4. **CC executes doc updates** — updates canonical `.context/` where relevant

5.5. **Link source logs** — add `Source Logs` section in touched core docs

5.6. **Update WP status** — mark WP-004 as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — update schema description, current state, section model, nested form decision
- `.context/ROADMAP.md` — Layer 2 renders ordered `sections[]`
- `.context/CONVENTIONS.md` — section registry pattern, nested form convention, thin mapper pattern
- `workplan/THEME-EDITOR-V2-DESIGN-SPEC.md` — update JSON shape to meta + sections[]
- `workplan/SPRINT_MVP_SLICE.md` — mark WP-004 as ✅ DONE
- `workplan/adr/009-*` — update to V2: "100% section-driven pages"
- `logs/wp-004/phase-*-result.md` — must exist for all phases

**Verification:** No context file mentions flat theme content model. Layer 2 spec says Portal renders `sections[]`.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policies reference dropped columns | Queries fail silently or return wrong results | Phase 0 confirmed: 0 content column refs. Safe. |
| Themes list queries break between Phase 1 and Phase 3 | Studio unusable temporarily | Expected — Phase 3 exists specifically to fix all call sites. Keep phases atomic, don't stop mid-way. |
| Save contract drift (validator ≠ DB type ≠ form shape) | Data corruption or silent loss | Nested form = all three shapes nearly identical. Thin mapper + round-trip proof (Phase 1.5) prevents this. |
| 12 section types bloat the phase | Effort overrun | Core 5 get full UI. 7 stubs are schema-only + JSON textarea. Full editors deferred to WP-005. |
| Drop columns breaks code before queries fixed | Build fails | Phase 0 inventory → Phase 1 types/validators ready → Phase 3 fixes call sites. |
| 6 ADR-009 columns may not exist in live DB | DROP COLUMN fails | Phase 1 verifies via information_schema BEFORE running migration. Uses DROP IF EXISTS as safety net. |
| Supabase RLS `meta->>'name'` performance | Slow list queries | Acceptable for MVP row counts. GIN index on meta deferred until performance data exists. |

---

## Acceptance Criteria (Definition of Done)

- [ ] `themes` table has `meta` + `sections` + `seo` jsonb columns — no flat content columns
- [ ] Section registry exists with 12 types (5 core + 7 stubs), `SECTION_TYPES` derived from registry keys
- [ ] Boundary mappers (`themeRowToFormData` / `formDataToThemeInsert`) are thin (null→default only) — round-trip proven
- [ ] Form shape is nested: `{ meta: {...}, sections: [...], seo: {...} }` — mirrors DB shape
- [ ] Themes list shows name/category/status from `theme.meta.*`
- [ ] Studio editor is section-based page builder: add/remove/reorder sections via `useFieldArray`, meta sidebar
- [ ] New theme opens with 5 default sections (hero, features, plugins, trust, related)
- [ ] Save persists `{ meta, sections[], seo }` to Supabase; reload preserves data + order
- [ ] Phase 0 greps return 0 flat-field matches in runtime code
- [ ] `tsc --noEmit` and `nx build @cmsmasters/studio` green
- [ ] All phases logged in `logs/wp-004/`
- [ ] Core docs updated in `.context/` (Phase 5)
- [ ] Source Logs linked in touched core docs
- [ ] No known blockers for WP-005 or Layer 2

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-003 Phases 0–4 (Studio shell, list, editor, save/publish) | ✅ DONE | All phases — we're rewriting what WP-003 built |
| Layer 0 infrastructure (Supabase schema, RLS, packages) | ✅ DONE | Phase 1 — DB migration needs existing table |
| Supabase project access (yxcqtwuyktbjxstahfqj) | ✅ Available | Phase 1 — SQL execution |

---

## Notes

- **Full gap analysis:** `workplan/ARCHITECTURE-DRIFT-ANALYSIS.md` documents the drift in detail
- **Phase 0 results:** `logs/wp-004/phase-0-result.md` — 12 files, ~160+ refs, 0 RLS risk, 0 API risk
- **Form shape decision (B):** Nested form mirrors DB. Rationale: sections are arrays (`useFieldArray` native), thin mappers, 0 mapper changes per new section type. Trade-off: ~25 mechanical path renames in editor — accepted as one-time cost during full editor rewrite.
- **What comes next:** `workplan/WP-005-full-section-architecture.md` — semantic HTML (Astro), triple output, Story Builder, Studio V2 (live preview + rich editors). ~3–4 weeks.
- **Portal rendering model (Layer 2):** `sections.map(s => SECTION_COMPONENTS[s.type])` — order from JSON, zero hardcoding. This WP makes that possible.
- **Existing components reused:** FormSection, ChipSelect, StarRating, CharCounter, EditorFooter, toast, auth guards — all stay, just rewired to nested paths.
