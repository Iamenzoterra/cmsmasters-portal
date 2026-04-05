# WP-010: Theme Meta — Categories & Tags CRUD

> Full taxonomy management for themes: separate DB tables for categories and tags, many-to-many junction tables, tabbed Theme Meta page in Studio sidebar with inline CRUD.

**Status:** ✅ DONE
**Priority:** P1 — Important
**Prerequisites:** WP-003 ✅ (Studio), WP-002 ✅ (Supabase + DB)
**Milestone/Wave:** Layer 2.5 — Studio enhancements
**Estimated effort:** 8-12 hours across 6 phases
**Created:** 2026-04-05
**Completed:** 2026-04-05

---

## Problem Statement

Theme categorization is hardcoded — `CATEGORY_OPTIONS` is a static array in `editor-sidebar.tsx`. Tags don't exist at all. Content managers can't create, rename, or remove categories without a code deploy. Themes can only have one category (string in `meta.category`), and there's no tagging system for Portal filtering.

We need full CRUD for both taxonomies as proper DB entities with many-to-many relations to themes, managed from a dedicated Studio page.

---

## Solution Overview

### Architecture

```
Studio Sidebar                      Supabase
──────────────                      ────────
Themes                              categories (id, name, slug, created_by, timestamps)
  Themes          (/)               tags       (id, name, slug, created_by, timestamps)
  Theme Meta      (/theme-meta)     theme_categories (theme_id, category_id)  ← junction
  Theme Blocks    (/blocks)         theme_tags       (theme_id, tag_id)       ← junction
  Templates       (/templates)

Theme Meta page:
┌──────────────────────────────────────────┐
│  [Categories]  [Tags]     ← tab bar     │
├──────────────────────────────────────────┤
│  + Add Category                         │
│  ┌──────────────────────────────────┐    │
│  │  Creative           [edit] [del] │    │
│  │  Business           [edit] [del] │    │
│  │  Portfolio          [edit] [del] │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Storage | Separate `categories` + `tags` tables | Referential integrity, RLS, unique slugs | jsonb array in theme.meta (no FK) |
| Relation | Junction tables `theme_categories`, `theme_tags` | Many-to-many, CASCADE deletes | Array column (no joins) |
| UI location | `/theme-meta` with tab bar | Extensible for future meta types | Separate routes per taxonomy |
| Fields | id, name, slug, created_by, timestamps | Minimal — extend later | Full model upfront (YAGNI) |
| Slug | Auto from name, read-only | Matches themes/blocks/templates pattern | Manual entry |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|---------------|----------------|
| pkg-db | New tables, types, queries | All tables in Database type, aliases exported | `owned_tables` in manifest |
| studio-core | New page, sidebar item, route | Pages in `pages/`, routes inside ProtectedRoute | Sidebar group ordering |
| pkg-validators | New Zod schemas | Schemas match DB constraints | Slug format (lowercase, hyphens) |
| infra-tooling | Manifest updates | Every file in `owned_files` | Run arch-test |

**Public API boundaries:**
- `pkg-db` exports: new query functions + types from index.ts
- `pkg-validators` exports: new schemas from index.ts

**Cross-domain risks:**
- Portal may filter by `meta.category` string — must check before migrating to junction table
- `editor-sidebar.tsx` hardcoded `CATEGORY_OPTIONS` must be replaced with DB fetch

---

## What This Changes

### New Files

```
packages/db/src/queries/categories.ts      # CRUD queries
packages/db/src/queries/tags.ts            # CRUD queries
packages/validators/src/category.ts        # Zod schema
packages/validators/src/tag.ts             # Zod schema
apps/studio/src/pages/theme-meta.tsx       # Tabbed page
apps/studio/src/components/taxonomy-list.tsx  # Reusable inline CRUD list
```

### Modified Files

```
packages/db/src/types.ts                   # 4 new table types + aliases
packages/db/src/index.ts                   # Re-exports
packages/validators/src/index.ts           # Re-exports
apps/studio/src/app.tsx                    # /theme-meta route
apps/studio/src/components/sidebar.tsx     # Nav item under Themes
apps/studio/src/components/editor-sidebar.tsx  # DB-driven multi-select
src/__arch__/domain-manifest.ts            # New files + tables
```

### Manifest Updates

```
pkg-db:
  owned_files: + queries/categories.ts, queries/tags.ts
  owned_tables: + categories, tags, theme_categories, theme_tags

studio-core:
  owned_files: + pages/theme-meta.tsx, components/taxonomy-list.tsx

pkg-validators:
  owned_files: + category.ts, tag.ts
```

### Database Changes

```sql
-- categories
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- tags
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- junction tables
CREATE TABLE theme_categories (
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, category_id)
);

CREATE TABLE theme_tags (
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, tag_id)
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_tags ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_write" ON categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "tags_read" ON tags FOR SELECT USING (true);
CREATE POLICY "tags_write" ON tags FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "theme_categories_read" ON theme_categories FOR SELECT USING (true);
CREATE POLICY "theme_categories_write" ON theme_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "theme_tags_read" ON theme_tags FOR SELECT USING (true);
CREATE POLICY "theme_tags_write" ON theme_tags FOR ALL USING (auth.role() = 'authenticated');

-- Triggers
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Remember: update packages/db/src/types.ts + domain-manifest.ts owned_tables
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Audit actual codebase state. Read domain skills. Identify risks.

**Tasks:**

0.1. **Read domain skills** — `.claude/skills/domains/pkg-db/SKILL.md`, `studio-core/SKILL.md`, `pkg-validators/SKILL.md`, `infra-tooling/SKILL.md`
0.2. **Check manifest boundaries** — `src/__arch__/domain-manifest.ts`
0.3. **Grep `meta.category` usage** — across all apps (Studio, Portal, API) to understand migration scope
0.4. **Report findings** — document actual state, invariants, traps

**Verification:** RECON report exists with domain analysis. No code written.

---

### Phase 1: Database + Types (1-2h)

**Goal:** 4 tables exist in Supabase, types and CRUD queries in `packages/db`.

**Tasks:**

1.1. **Run Supabase migration** — create `categories`, `tags`, `theme_categories`, `theme_tags` with RLS + policies + triggers
1.2. **Update `packages/db/src/types.ts`** — add all 4 tables to Database type, add convenience aliases (Category, Tag, etc.)
1.3. **Create `packages/db/src/queries/categories.ts`** — `getAll`, `getById`, `create`, `update`, `delete`
1.4. **Create `packages/db/src/queries/tags.ts`** — same CRUD pattern
1.5. **Add junction helpers** — `getThemeCategories`, `setThemeCategories`, `getThemeTags`, `setThemeTags`
1.6. **Update `packages/db/src/index.ts`** — re-export new queries + types
1.7. **Update manifest** — `owned_files` + `owned_tables`

**Verification:**
```bash
npm run arch-test              # Path existence, parity, ownership
# Manual: verify tables in Supabase dashboard
```

---

### Phase 2: Validators (0.5h)

**Goal:** Zod schemas exist for category and tag input validation.

**Tasks:**

2.1. **Create `packages/validators/src/category.ts`** — `categorySchema` (name: min 1 max 100, slug: lowercase+hyphens)
2.2. **Create `packages/validators/src/tag.ts`** — `tagSchema` (same pattern)
2.3. **Update `packages/validators/src/index.ts`** — re-export
2.4. **Update manifest** — `owned_files`

**Verification:**
```bash
npm run arch-test
```

---

### Phase 3: Theme Meta Page + UI (3-5h)

**Goal:** `/theme-meta` page with tabs, full inline CRUD for categories and tags, polished design.

**Tasks:**

3.1. **Use design agents** — UI Designer / UX Architect for taxonomy list component (inline add/edit/delete)
3.2. **Create `apps/studio/src/components/taxonomy-list.tsx`** — reusable for both:
  - Inline input + save for new items
  - Click-to-edit name
  - Delete with confirmation
  - Auto-generated slug display
  - Empty state
3.3. **Create `apps/studio/src/pages/theme-meta.tsx`** — tabbed layout:
  - Tab bar: Categories | Tags (extensible for future tabs)
  - Active tab renders `TaxonomyList` with appropriate queries
3.4. **Add route** in `apps/studio/src/app.tsx` — `/theme-meta`
3.5. **Add nav item** in `apps/studio/src/components/sidebar.tsx` — "Theme Meta" under Themes group
3.6. **Update manifest** — `owned_files`

**Verification:**
```bash
npm run arch-test
# Manual: navigate to /theme-meta, create/edit/delete categories and tags
```

---

### Phase 4: Theme Editor Integration (1-2h)

**Goal:** Theme editor uses DB-driven multi-select for categories and tags instead of hardcoded array.

**Tasks:**

4.1. **Replace `CATEGORY_OPTIONS`** in `editor-sidebar.tsx` — fetch categories from DB, multi-select UI
4.2. **Add tags multi-select** in editor sidebar
4.3. **Update theme save flow** — persist junction table relations alongside theme save
4.4. **Handle `meta.category` migration** — populate junction from existing string values, keep backward compat during transition

**Verification:**
```bash
npm run arch-test
# Manual: edit theme, assign multiple categories + tags, save, reload — persisted
```

---

### Phase 5: Close (mandatory, always last)

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

5.1. **CC reads all phase logs** — understands what was done, what deviated from plan
5.2. **CC proposes doc updates** — list of files to update with proposed changes
5.3. **Brain approves** — reviews proposed changes
5.4. **CC executes doc updates** — updates `.context/BRIEF.md`, domain skills if contracts changed
5.5. **Verify everything green:**
  ```bash
  npm run arch-test
  ```
5.6. **Update WP status** — mark WP as DONE

**Files to update:**
- `.context/BRIEF.md` — add 4 new tables (9 → 13), update Studio features
- `.context/CONVENTIONS.md` — if new patterns discovered
- `.claude/skills/domains/pkg-db/SKILL.md` — new tables, query patterns
- `.claude/skills/domains/studio-core/SKILL.md` — new page, tab pattern
- `src/__arch__/domain-manifest.ts` — new files/tables added
- `logs/wp-010/phase-*-result.md` — phase evidence (must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Portal reads `meta.category` string | Breaking Portal filtering | Phase 0.3: grep Portal code; Phase 4.4: keep string during transition |
| Cascade delete removes theme associations | Theme silently loses categories | Expected behavior — junction CASCADE, theme row unaffected |
| Slug collision on rename | Unique constraint violation | Validate slug uniqueness before save, show error |
| Cross-domain boundary violation | arch-test fails | Check Public API in skills before importing |
| Invariant violated silently | Production bug | Read domain skill Invariants + run arch-test |

---

## Acceptance Criteria (Definition of Done)

- [ ] `categories` and `tags` tables exist in Supabase with RLS
- [ ] `theme_categories` and `theme_tags` junction tables exist
- [ ] CRUD queries in `packages/db` for both taxonomies + junction helpers
- [ ] Zod schemas in `packages/validators`
- [ ] `/theme-meta` page with tabbed UI (Categories | Tags) in Studio
- [ ] Inline add/edit/delete works for both taxonomies
- [ ] Theme editor multi-select for categories and tags (DB-driven)
- [ ] Theme save persists assignments via junction tables
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] Domain invariants preserved (verified against skills)
- [ ] New files registered in `domain-manifest.ts`
- [ ] All phases logged in `logs/wp-010/`
- [ ] Domain skills updated if contracts changed
- [ ] No known blockers for next WP

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-002 (Supabase + DB) | ✅ Done | DB connection, RLS patterns, `update_updated_at()` function |
| WP-003 (Studio) | ✅ Done | App shell, routing, sidebar, ProtectedRoute |

---

## Notes

- Tab bar should be extensible — future meta types (Features, Compatibility) added as new tabs without restructuring.
- Use design agents (UI Designer, UX Architect) in Phase 3 for polished inline editing UX.
- `meta.category` string field on ThemeMeta will eventually be deprecated in favor of junction table. Keep during transition.
