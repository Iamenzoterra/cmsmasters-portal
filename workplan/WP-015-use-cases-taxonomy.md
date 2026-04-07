# WP-015: Use Cases Taxonomy

> Add a "Perfect For" taxonomy to themes — normalized table with tag-input UI in Studio and structured rendering on Portal.

**Status:** PLANNING
**Priority:** P1 — Important
**Prerequisites:** WP-010 ✅ (Theme Meta CRUD), WP-014 ✅ (Multi-block slots)
**Milestone/Wave:** Layer 2.5 — Theme enrichment
**Estimated effort:** 4-6 hours across 4 phases
**Created:** 2026-04-07
**Completed:** —

---

## Problem Statement

Each theme targets specific business niches ("Plastic Surgery Clinics", "Aesthetic Medicine Centers", etc.). This information is critical for:

1. **SEO** — search engines use structured data (`suitableFor` in JSON-LD) to understand product relevance.
2. **AI discoverability** — LLM crawlers parse structured metadata better than free-text blobs.
3. **User experience** — "This theme is perfect for:" sidebar list helps buyers evaluate fit instantly.

Currently there's no place to store this data. Hardcoding it in `theme.meta` jsonb would work but creates consistency problems (typos, duplicates, no autocomplete). A WordPress-style tag input with autocomplete from a shared pool of use cases solves this cleanly.

---

## Solution Overview

### Architecture

```
Studio (theme editor sidebar)
  └─ TagInput component ──→ Supabase `use_cases` table (autocomplete source)
  └─ on save ──→ `theme_use_cases` junction (many-to-many)

Portal (theme page sidebar)
  └─ RSC fetches theme_use_cases JOIN use_cases
  └─ Renders "Perfect for" list + JSON-LD suitableFor
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Storage model | Normalized table + junction | Autocomplete, consistency, SEO slugs, no duplicates | jsonb array in theme.meta (no autocomplete, inconsistent naming) |
| Table naming | `use_cases` + `theme_use_cases` | Follows existing pattern (tags/theme_tags, categories/theme_categories) | `perfect_for` (too UI-specific, limits future reuse) |
| UI component | Inline tag-input with autocomplete | WordPress-familiar UX, create-on-type | Modal picker like categories (too heavy for free-text entries) |
| Portal rendering | Hook `{{perfect_for}}` in sidebar block | Consistent with existing hook system ({{price}}, etc.) | Direct component (breaks block model) |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|---------------|----------------|
| pkg-db | New table types, queries, exports | All queries must use typed client; new tables in owned_tables | Export from index.ts; add to Database type |
| pkg-validators | New zod schema for use_case | Schemas mirror DB columns | Keep consistent with tag/category schema pattern |
| studio-core | New TagInput component, sidebar integration | EditorSidebar props must stay typed; no cross-domain imports beyond allowed | editor-sidebar.tsx already has tags/categories — follow same pattern |
| app-portal | Hook resolution for {{perfect_for}} | Hook resolution is build-time string replacement in RSC | Don't break existing hooks; add to existing resolver |

**Public API boundaries:**
- `pkg-db` public entrypoints: `packages/db/src/index.ts` — must re-export new queries/types
- `studio-core` imports from: `pkg-db`, `pkg-validators`, `pkg-ui`
- `app-portal` imports from: `pkg-db`, `pkg-ui`

**Cross-domain risks:**
- Adding props to EditorSidebar affects theme-editor.tsx (same domain, safe)
- New hook type in portal must not break existing hook resolution

---

## What This Changes

### New Files

```
packages/db/src/queries/use-cases.ts       # CRUD + getThemeUseCases + setThemeUseCases
apps/studio/src/components/tag-input.tsx    # Reusable tag-input with autocomplete (WordPress-style)
```

### Modified Files

```
packages/db/src/types.ts                   # use_cases + theme_use_cases table types + aliases
packages/db/src/index.ts                   # Re-export use-cases queries + types
packages/validators/src/theme.ts           # (if needed) use_case zod schema
apps/studio/src/components/editor-sidebar.tsx  # Add "Perfect For" section with TagInput
apps/studio/src/pages/theme-editor.tsx     # Fetch/save use cases, pass to sidebar
apps/portal/...                            # Hook resolution for {{perfect_for}} (Phase 3)
src/__arch__/domain-manifest.ts            # New files in owned_files, new tables in owned_tables
```

### Manifest Updates

```
pkg-db:
  owned_files += 'packages/db/src/queries/use-cases.ts'
  owned_tables += 'use_cases', 'theme_use_cases'

studio-core:
  owned_files += 'apps/studio/src/components/tag-input.tsx'
```

### Database Changes

```sql
-- use_cases: shared pool of use case entries (like tags)
CREATE TABLE use_cases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- junction: many-to-many theme ↔ use_case
CREATE TABLE theme_use_cases (
  theme_id    uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  use_case_id uuid NOT NULL REFERENCES use_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, use_case_id)
);

-- RLS
ALTER TABLE use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_use_cases ENABLE ROW LEVEL SECURITY;

-- Read: anyone. Write: admin/content_manager.
CREATE POLICY "use_cases_read" ON use_cases FOR SELECT USING (true);
CREATE POLICY "use_cases_write" ON use_cases FOR ALL
  USING (get_user_role() IN ('admin', 'content_manager'));

CREATE POLICY "theme_use_cases_read" ON theme_use_cases FOR SELECT USING (true);
CREATE POLICY "theme_use_cases_write" ON theme_use_cases FOR ALL
  USING (get_user_role() IN ('admin', 'content_manager'));

-- updated_at trigger (reuse existing function)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON use_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Audit actual codebase state. Confirm tags/categories pattern. Identify risks.

**Tasks:**

0.1. **Read domain skills** — `pkg-db`, `studio-core`, `app-portal`
0.2. **Audit existing taxonomy pattern** — read tags.ts, categories.ts, theme-editor.tsx to confirm integration pattern
0.3. **Check EditorSidebar** — understand current props, layout, where to insert new section
0.4. **Check portal hook resolution** — find where {{price}} etc. are resolved
0.5. **Report findings** — document actual state, confirm plan viability

**Verification:** RECON report exists with domain analysis. No code written.

---

### Phase 1: Database + Package Layer (1-1.5h)

**Goal:** `use_cases` and `theme_use_cases` tables exist in Supabase, typed queries work from `@cmsmasters/db`.

**Tasks:**

1.1. **Run Supabase migration** — create tables, RLS policies, trigger (SQL above)
1.2. **Add types to `packages/db/src/types.ts`** — `use_cases` and `theme_use_cases` table definitions in Database type + convenience aliases (UseCase, UseCaseInsert, UseCaseUpdate, ThemeUseCase, ThemeUseCaseInsert)
1.3. **Create `packages/db/src/queries/use-cases.ts`** — following tags.ts pattern exactly:
  - `getUseCases(client)` — list all, ordered by name
  - `getUseCaseById(client, id)`
  - `createUseCase(client, useCase)`
  - `updateUseCase(client, id, updates)`
  - `deleteUseCase(client, id)`
  - `getThemeUseCases(client, themeId)` — via junction, returns use_case rows
  - `setThemeUseCases(client, themeId, useCaseIds)` — delete + re-insert pattern
  - `searchUseCases(client, query)` — ILIKE search for autocomplete
1.4. **Export from `packages/db/src/index.ts`** — re-export all queries + types
1.5. **Update domain-manifest.ts** — add file to pkg-db owned_files, tables to owned_tables

**Verification:**
```bash
npm run arch-test              # Path existence, parity, ownership
```

---

### Phase 2: Studio UI — Tag Input + Sidebar (1.5-2h)

**Goal:** Theme editor sidebar has "Perfect For" section with WordPress-style tag input and autocomplete.

**Tasks:**

2.1. **Create `apps/studio/src/components/tag-input.tsx`** — reusable component:
  - Text input field
  - On type: debounced search → dropdown with matching use cases from DB
  - Enter or click → add as chip (pill with X button)
  - **X click → mini-popover with two choices:**
    - "Remove from this theme" — deletes junction only (theme_use_cases row)
    - "Delete everywhere" — deletes the use_case record itself (ON DELETE CASCADE removes all junctions across all themes)
  - If typed text doesn't match existing → create new use case on Enter (auto-generate slug)
  - Chips displayed above/below input
  - Design: use tokens from tokens.css, match existing sidebar styling

2.2. **Integrate into EditorSidebar** — add "Perfect For" collapsible section:
  - New props: `allUseCases`, `selectedUseCaseIds`, `onUseCasesChange`
  - Position: after Tags section, before Prices section
  - Uses TagInput component

2.3. **Wire up in theme-editor.tsx** — follow existing tags pattern:
  - State: `allUseCases`, `selectedUseCases`
  - Fetch on mount: `getUseCases(supabase)`
  - Fetch on theme load: `getThemeUseCases(supabase, theme.id)`
  - Save: `setThemeUseCases(supabase, theme.id, ids)` in submit handler

2.4. **Update domain-manifest.ts** — add tag-input.tsx to studio-core owned_files

**Verification:**
```bash
npm run arch-test
# Manual: open Studio → theme editor → verify tag input works
```

---

### Phase 3: Portal Rendering + SEO (1-1.5h)

**Goal:** Theme pages display "Perfect for" list in sidebar and include structured data for SEO.

**Tasks:**

3.1. **Add hook resolution** — extend existing `{{perfect_for}}` hook in portal's block renderer:
  - Fetch `theme_use_cases` joined with `use_cases` at build time
  - Render as HTML list matching the design (checkmark icon + text per item)
  - If no use cases assigned → render nothing (no empty section)

3.2. **Add JSON-LD structured data** — in theme page's metadata/head:
  - Add `suitableFor` array to existing theme JSON-LD schema
  - Values = use case names

3.3. **Test with ISR** — verify revalidation picks up use case changes

**Verification:**
```bash
npm run arch-test
# Manual: check portal theme page → sidebar shows "Perfect for" list
# Manual: view-source → verify JSON-LD contains suitableFor
```

---

### Phase 4: Close (0.5h)

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

4.1. **CC reads all phase logs** — understands what was done, what deviated from plan
4.2. **CC proposes doc updates** — list of files to update with proposed changes
4.3. **Brain approves** — reviews proposed changes
4.4. **CC executes doc updates** — updates `.context/BRIEF.md`, domain skills if contracts changed
4.5. **Verify everything green:**
  ```bash
  npm run arch-test
  ```
4.6. **Update WP status** — mark WP as DONE

**Files to update:**
- `.context/BRIEF.md` — add use_cases/theme_use_cases to table count, mention Perfect For feature
- `.context/CONVENTIONS.md` — if new patterns discovered
- `.claude/skills/domains/pkg-db/SKILL.md` — new tables, new queries
- `.claude/skills/domains/studio-core/SKILL.md` — new component (tag-input)
- `src/__arch__/domain-manifest.ts` — already updated in phases 1-2
- `logs/wp-015/phase-*-result.md` — phase evidence (must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy blocks autocomplete for non-authenticated users | Tag input broken in Studio | Studio always has auth session; public read policy covers portal |
| Slug collision on auto-generate | Insert fails | Use existing `nameToSlug()` + handle unique constraint error gracefully |
| Too many use cases over time | Slow autocomplete | ILIKE with LIMIT 10 in searchUseCases; index on name |
| Cross-domain boundary violation | arch-test fails | Follow existing tags pattern exactly; check skills before importing |
| Hook resolution breaks existing hooks | Portal render fails | Add {{perfect_for}} as new case, don't modify existing hook handlers |

---

## Acceptance Criteria (Definition of Done)

- [ ] `use_cases` and `theme_use_cases` tables exist with RLS
- [ ] `@cmsmasters/db` exports typed CRUD + junction queries + ILIKE search
- [ ] Studio theme editor has "Perfect For" tag-input with autocomplete
- [ ] Creating a new use case from the input auto-creates the DB record
- [ ] Removing a chip shows popover: "Remove from theme" vs "Delete everywhere"
- [ ] "Delete everywhere" removes the use_case + all junctions (cascade)
- [ ] Portal theme page renders "Perfect for" list in sidebar
- [ ] JSON-LD includes `suitableFor` array
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] Domain invariants preserved (verified against skills)
- [ ] New files registered in `domain-manifest.ts`
- [ ] All phases logged in `logs/wp-015/`
- [ ] Domain skills updated if contracts changed
- [ ] No known blockers for next WP

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-010 Theme Meta CRUD | ✅ DONE | Theme editor must exist for sidebar integration |
| WP-007 Portal Layout System | ✅ DONE | Portal must render theme pages for hook resolution |
| Supabase access | ✅ Available | Migration needs dashboard or CLI access |

---

## Notes

- Pattern is 1:1 with existing tags taxonomy (tags.ts, theme_tags, TaxonomyPickerModal). The main difference is the UI: tag-input with inline autocomplete instead of modal picker.
- The TagInput component could later be reused for tags themselves if the WordPress-style UX is preferred over the current modal picker.
- `use_cases` naming is intentionally generic — it covers "Perfect For" today but could serve other "theme is suitable for X" use cases in the future without schema changes.
- SEO value: `suitableFor` is a recognized schema.org property for Product/SoftwareApplication types.
