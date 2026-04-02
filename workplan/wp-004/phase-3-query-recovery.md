# WP-004 Phase 3: Query Recovery — All Call Sites Migrated

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 3 of 5
> Priority: P0
> Estimated: 1.5–2 hours
> Type: Full-stack (packages + Studio app)
> Previous: Phase 2 ✅ (Section registry — 12 entries, 27/27 tests, getDefaultSections() factory)
> Next: Phase 4 (Studio editor — section-based page builder)

---

## Context

Phases 1–2 changed the contracts: DB is `{ meta, sections[], seo }`, types match, validators are nested, registry exists with 12 section types. But Studio still references the OLD flat shape everywhere — it won't compile.

This phase migrates every call site in Studio to the new nested shape. After this phase, Studio compiles and runs (list, card, table work; editor opens but still shows flat form — Phase 4 converts it to section page builder).

```
CURRENT:  DB + types + validators + mappers = new nested shape           ✅
CURRENT:  Section registry = 12 types, getDefaultSections(), validation  ✅
CURRENT:  Studio uses OLD flat types — build broken                      ❌
MISSING:  form-defaults.ts using new mappers                             ❌
MISSING:  themes-list.tsx: t.name → t.meta.name                          ❌
MISSING:  theme-card.tsx: theme.name → theme.meta.name etc.              ❌
MISSING:  themes-table.tsx: same                                         ❌
MISSING:  editor-sidebar.tsx: paths 'rating' → 'meta.rating' etc.       ❌
MISSING:  theme-editor.tsx: register('name') → register('meta.name')     ❌
```

**CRITICAL:** This phase is mechanical — find-replace with precision. No architectural decisions. No new components. Just wire existing code to new shapes.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Verify new types and mappers exist (Phase 1 output)
grep -n "ThemeMeta\|ThemeSection\|ThemeSEO" packages/db/src/types.ts | head -5
grep -n "themeRowToFormData\|formDataToThemeInsert" packages/db/src/mappers.ts | head -3

# 2. Verify registry exists (Phase 2 output)
grep -n "SECTION_REGISTRY\|getDefaultSections\|CORE_SECTION_TYPES" packages/validators/src/sections/index.ts | head -5

# 3. Verify Studio is broken (expected)
npx tsc --noEmit --project apps/studio/tsconfig.json 2>&1 | head -30
echo "(Expected: many errors about flat fields not existing on Theme)"

# 4. List all files we need to touch
echo "=== Files to migrate ==="
echo "apps/studio/src/lib/form-defaults.ts"
echo "apps/studio/src/lib/queries.ts"
echo "apps/studio/src/pages/themes-list.tsx"
echo "apps/studio/src/pages/theme-editor.tsx"
echo "apps/studio/src/components/theme-card.tsx"
echo "apps/studio/src/components/themes-table.tsx"
echo "apps/studio/src/components/editor-sidebar.tsx"
```

**Document findings (especially the tsc error count) before writing any code.**

---

## Task 3.1: Rewrite form-defaults.ts

The old file has `themeToFormData()` (flat→flat) and `formDataToUpsert()` (flat→flat). These are replaced by the thin mappers in `packages/db/src/mappers.ts`. This file becomes a thin wrapper + utility.

### Replace with:

```typescript
// apps/studio/src/lib/form-defaults.ts
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'
import { getDefaultSections } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * Uses Zod parse for meta/seo defaults + getDefaultSections() for section defaults.
 */
export function getDefaults(): ThemeFormData {
  return themeSchema.parse({
    slug: '',
    meta: { name: '' },
    sections: getDefaultSections(),
    seo: {},
    status: 'draft',
  })
}

/**
 * Auto-generate slug from name (kebab-case).
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
```

**Removed:** `themeToFormData()`, `formDataToUpsert()`, `emptyToNull()` — all replaced by `themeRowToFormData` / `formDataToThemeInsert` from `@cmsmasters/db`.

**Kept:** `getDefaults()` (rewired to nested shape + default sections), `nameToSlug()`.

---

## Task 3.2: Migrate themes-list.tsx

### Changes:

**Search filter** (line ~55):
```
BEFORE: result.filter((t) => t.name.toLowerCase().includes(q))
AFTER:  result.filter((t) => t.meta.name.toLowerCase().includes(q))
```

**Status filter** (line ~59): stays `t.status` — top-level, no change.

**Theme header display** uses `themes.length` — no change.

No other flat-field references. `t.slug`, `t.id`, `t.status` are all top-level and unchanged.

---

## Task 3.3: Migrate theme-card.tsx

### Every flat read → `meta.*`:

| Line | Before | After |
|------|--------|-------|
| ~31 | `theme.thumbnail_url` | `theme.meta.thumbnail_url` |
| ~34 | `theme.name` (alt text) | `theme.meta.name` |
| ~69 | `theme.name` (title) | `theme.meta.name` |
| ~73,84 | `theme.tagline` | `theme.meta.tagline` |
| ~90,105 | `theme.category` | `theme.meta.category` |
| ~108 | `theme.status` | `theme.status` (no change — top-level) |
| ~122 | `theme.price` | `theme.meta.price` |
| ~132 | `theme.updated_at` | `theme.updated_at` (no change — top-level) |

---

## Task 3.4: Migrate themes-table.tsx

### Every flat read → `meta.*`:

| Line | Before | After |
|------|--------|-------|
| ~43 | `theme.id` | `theme.id` (no change) |
| ~44 | `theme.slug` | `theme.slug` (no change) |
| ~55 | `theme.name` | `theme.meta.name` |
| ~58 | `theme.category` | `theme.meta.category` |
| ~61 | `theme.status` | `theme.status` (no change) |
| ~64 | `theme.price` | `theme.meta.price` |
| ~67 | `theme.updated_at` | `theme.updated_at` (no change) |

---

## Task 3.5: Migrate editor-sidebar.tsx

### Import change:

```
BEFORE: import type { ThemeFormData } from '@cmsmasters/validators'
AFTER:  import type { ThemeFormData } from '@cmsmasters/validators'  (no change — type name is the same)
```

### `useController` path renames (6 changes):

| Before | After |
|--------|-------|
| `{ control, name: 'rating' }` | `{ control, name: 'meta.rating' }` |
| `{ control, name: 'trust_badges' }` | `{ control, name: 'meta.trust_badges' }` |
| `{ control, name: 'compatible_plugins' }` | `{ control, name: 'meta.compatible_plugins' }` |
| `{ control, name: 'resources.public' }` | `{ control, name: 'meta.resources.public' }` |
| `{ control, name: 'resources.licensed' }` | `{ control, name: 'meta.resources.licensed' }` |
| `{ control, name: 'resources.premium' }` | `{ control, name: 'meta.resources.premium' }` |

### `register` path renames (4 changes):

| Before | After |
|--------|-------|
| `register('thumbnail_url')` | `register('meta.thumbnail_url')` |
| `register('status')` | `register('status')` (no change — top-level) |
| `register('category')` | `register('meta.category')` |
| `register('price', ...)` | `register('meta.price', ...)` |
| `register('sales', ...)` | `register('meta.sales', ...)` |

### `watch` path renames (2 changes):

| Before | After |
|--------|-------|
| `watch('status')` | `watch('status')` (no change — top-level) |
| `watch('thumbnail_url')` | `watch('meta.thumbnail_url')` |

### `existingTheme` reads — already top-level:
- `existingTheme.created_at` — no change
- `existingTheme.updated_at` — no change
- `existingTheme.created_by` — no change

---

## Task 3.6: Migrate theme-editor.tsx

This is the biggest file. Changes are mechanical but numerous.

### Import changes:

```typescript
// BEFORE:
import { getDefaults, themeToFormData, formDataToUpsert, nameToSlug } from '../lib/form-defaults'

// AFTER:
import { getDefaults, nameToSlug } from '../lib/form-defaults'
import { themeRowToFormData, formDataToThemeInsert } from '@cmsmasters/db'
```

### All `themeToFormData` → `themeRowToFormData` (4 occurrences):
- `reset(themeToFormData(theme))` → `reset(themeRowToFormData(theme))`
- `reset(themeToFormData(saved))` (handleSaveDraft) → `reset(themeRowToFormData(saved))`
- `reset(themeToFormData(saved))` (handlePublish) → `reset(themeRowToFormData(saved))`
- `reset(themeToFormData(existingTheme))` (handleDiscard) → `reset(themeRowToFormData(existingTheme))`

### All `formDataToUpsert` → `formDataToThemeInsert` (2 occurrences):
- `formDataToUpsert(data, existingTheme?.id)` (handleSaveDraft) → `formDataToThemeInsert(data, existingTheme?.id)`
- `formDataToUpsert(data, existingTheme?.id)` (handlePublish) → `formDataToThemeInsert(data, existingTheme?.id)`

### Slug auto-gen watch:
```
BEFORE: useWatch({ control, name: 'name' })
AFTER:  useWatch({ control, name: 'meta.name' })
```

### Slug setValue:
```
BEFORE: form.setValue('slug', nameToSlug(watchedName), ...)
AFTER:  form.setValue('slug', nameToSlug(watchedName), ...)  (no change — slug is top-level)
```

### Feature/plugin repeaters:
```
BEFORE: useFieldArray({ control, name: 'features' })
BEFORE: useFieldArray({ control, name: 'included_plugins' })
```
These will be REMOVED entirely in Phase 4 (replaced by section-based editors). For now, to get compilation working, change to a stub that doesn't break the build. **TWO OPTIONS:**

**Option A (recommended for Phase 3):** Comment out / remove the features and plugins sections from the JSX entirely, since they're moving into sections. Keep the form compiling. Phase 4 will build the real section editors.

**Option B:** Temporarily map to nested paths that don't exist yet. This creates dead code.

**Go with Option A.** Remove the feature/plugin/hero/custom-sections form sections from JSX. Keep: Basic Info, Links, SEO. These use meta/seo paths. Phase 4 adds sections.

### SEO field renames:
```
BEFORE: register('seo_title')         →  register('seo.title')
BEFORE: register('seo_description')   →  register('seo.description')
BEFORE: watch name: 'seo_title'       →  watch name: 'seo.title'
BEFORE: watch name: 'seo_description' →  watch name: 'seo.description'
BEFORE: errors.seo_title              →  errors.seo?.title
BEFORE: errors.seo_description        →  errors.seo?.description
```

### Basic Info field renames:
```
BEFORE: register('name')          →  register('meta.name')
BEFORE: register('slug')          →  register('slug')  (no change — top-level)
BEFORE: register('tagline')       →  register('meta.tagline')
BEFORE: register('description')   →  register('meta.description')
BEFORE: errors.name               →  errors.meta?.name
BEFORE: errors.slug               →  errors.slug  (no change)
```

### Links field renames:
```
BEFORE: register('demo_url')         →  register('meta.demo_url')
BEFORE: register('themeforest_url')  →  register('meta.themeforest_url')
BEFORE: register('themeforest_id')   →  register('meta.themeforest_id')
BEFORE: errors.demo_url              →  errors.meta?.demo_url
BEFORE: errors.themeforest_url       →  errors.meta?.themeforest_url
```

### Header display:
```
BEFORE: existingTheme?.name ?? slug
AFTER:  existingTheme?.meta.name ?? slug
```

### Delete confirm message:
```
BEFORE: `Delete "${existingTheme.name}"?`
AFTER:  `Delete "${existingTheme.meta.name}"?`
```

### Delete audit details:
```
BEFORE: details: { slug: existingTheme.slug, name: existingTheme.name }
AFTER:  details: { slug: existingTheme.slug, name: existingTheme.meta.name }
```

### Remove from JSX (Phase 4 will rebuild these as section editors):
- Section 3: Hero (entire FormSection block)
- Section 4: Features (entire FormSection block)
- Section 5: Plugins & Compatibility (entire FormSection block)
- Section 7: Custom Sections (entire FormSection block)
- `UrlListField` component (moves to section editors)
- `PluginTotalValue` component (moves to section editors)
- `CustomSectionsField` component (moves to section editors)
- `CompatiblePluginsField` component (stays — used in sidebar via meta.compatible_plugins)
- `COMPATIBLE_OPTIONS` constant (stays — used by CompatiblePluginsField which is used in sidebar)

Wait — `CompatiblePluginsField` in theme-editor.tsx uses `useController({ control, name: 'compatible_plugins' })`. This moves to sidebar. Check: EditorSidebar already has its own compatible_plugins controller. So **remove `CompatiblePluginsField` from theme-editor.tsx** — it's duplicated in sidebar.

### Remove from file-level scope:
- `features` useFieldArray
- `plugins` useFieldArray
- `seoTitle` / `seoDesc` watches — keep these, just rename paths
- `COMPATIBLE_OPTIONS` — check if sidebar has its own. YES — EditorSidebar has `PLUGIN_OPTIONS`. Remove from theme-editor.

### Keep these helper components:
- `Field` — still used by Basic Info, Links, SEO
- Remove: `UrlListField`, `PluginTotalValue`, `CustomSectionsField`, `CompatiblePluginsField`

---

## Task 3.7: Queries (no changes needed — verify)

`apps/studio/src/lib/queries.ts` uses `select('*')` and returns `Theme` type. The type shape changed automatically via Phase 1. No query text changes needed.

`packages/db/src/queries/themes.ts` — same: `select('*')`, typed via `ThemeInsert`. The `upsertTheme()` accepts `ThemeInsert` which now has the new shape. No code changes.

**Verify:** both files compile after types change.

---

## Files to Modify

- `apps/studio/src/lib/form-defaults.ts` — **rewrite** (remove flat mappers, wire to db mappers + getDefaultSections)
- `apps/studio/src/pages/themes-list.tsx` — **modify** (1 path rename: `t.name` → `t.meta.name`)
- `apps/studio/src/components/theme-card.tsx` — **modify** (5 path renames)
- `apps/studio/src/components/themes-table.tsx` — **modify** (3 path renames)
- `apps/studio/src/components/editor-sidebar.tsx` — **modify** (~11 path renames)
- `apps/studio/src/pages/theme-editor.tsx` — **major modify** (path renames + remove flat form sections + import changes)

**NOT modified:**
- `apps/studio/src/lib/queries.ts` — `select('*')` auto-propagates
- `packages/db/src/queries/themes.ts` — same
- `apps/studio/src/components/editor-footer.tsx` — no flat refs
- `apps/studio/src/components/form-section.tsx` — no flat refs
- `apps/studio/src/components/status-badge.tsx` — uses ThemeStatus (unchanged)

---

## Acceptance Criteria

- [ ] `npx tsc --noEmit` — 0 errors across entire monorepo (not just packages)
- [ ] `npx nx build @cmsmasters/studio` — builds successfully
- [ ] `form-defaults.ts` uses `getDefaultSections()` for new theme defaults
- [ ] `form-defaults.ts` has NO flat mappers (themeToFormData / formDataToUpsert removed)
- [ ] theme-editor.tsx imports `themeRowToFormData` / `formDataToThemeInsert` from `@cmsmasters/db`
- [ ] themes-list search filter uses `t.meta.name`
- [ ] theme-card reads all content from `theme.meta.*`
- [ ] themes-table reads all content from `theme.meta.*`
- [ ] editor-sidebar uses `meta.*` paths for all useController / register / watch
- [ ] Hero / Features / Plugins / Custom Sections form sections REMOVED from editor (Phase 4 rebuilds them)
- [ ] Editor still shows: Basic Info (meta.name, slug, meta.tagline, meta.description), Links (meta.demo_url etc.), SEO (seo.title, seo.description), Sidebar
- [ ] Phase 0 flat-field greps return 0 matches in runtime code

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. Full monorepo type check
npx tsc --noEmit
echo "(Expected: 0 errors)"

# 2. Studio builds
npx nx build @cmsmasters/studio
echo "(Expected: success)"

# 3. Flat mappers removed from form-defaults
grep -n "themeToFormData\|formDataToUpsert\|emptyToNull" apps/studio/src/lib/form-defaults.ts
echo "(Expected: 0 matches)"

# 4. New mappers imported in editor
grep -n "themeRowToFormData\|formDataToThemeInsert" apps/studio/src/pages/theme-editor.tsx
echo "(Expected: 2+ matches — import + usage)"

# 5. No flat reads in list components
grep -n "theme\.name\b\|theme\.tagline\|theme\.category\b\|theme\.price\b\|theme\.thumbnail_url" \
  apps/studio/src/pages/themes-list.tsx \
  apps/studio/src/components/theme-card.tsx \
  apps/studio/src/components/themes-table.tsx
echo "(Expected: 0 — all should be theme.meta.*)"

# 6. No flat paths in sidebar controllers
grep -n "name: 'rating'\|name: 'trust_badges'\|name: 'compatible_plugins'\|name: 'resources\." \
  apps/studio/src/components/editor-sidebar.tsx
echo "(Expected: 0 — all should be meta.*)"

# 7. No flat register in editor
grep -n "register('name')\|register('tagline')\|register('description')\|register('seo_title')\|register('seo_description')" \
  apps/studio/src/pages/theme-editor.tsx
echo "(Expected: 0 — all should be meta.* or seo.*)"

# 8. Old helper components removed
grep -n "UrlListField\|PluginTotalValue\|CustomSectionsField" apps/studio/src/pages/theme-editor.tsx
echo "(Expected: 0 — removed, Phase 4 rebuilds)"

# 9. getDefaultSections used
grep -n "getDefaultSections" apps/studio/src/lib/form-defaults.ts
echo "(Expected: 1+ match)"

echo "=== Phase 3 Verification Complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-004/phase-3-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-004 Phase 3 — Query Recovery + Path Migration
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions for Brain. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit (monorepo) | ✅/❌ |
| nx build studio | ✅/❌ |
| Flat mappers removed | ✅/❌ |
| New mappers imported | ✅/❌ |
| List components: no flat reads | ✅/❌ |
| Sidebar: no flat paths | ✅/❌ |
| Editor: no flat register | ✅/❌ |
| Old helpers removed | ✅/❌ |
| getDefaultSections used | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/ logs/wp-004/
git commit -m "refactor: migrate all Studio call sites to nested theme shape [WP-004 phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **This phase is MECHANICAL.** No new components. No architectural decisions. Just path renames and import swaps. If you find yourself designing something new, stop — that's Phase 4.
- **Remove flat form sections from editor (Hero, Features, Plugins, Custom Sections).** Phase 4 rebuilds these as section editors. Don't try to wire them to nested paths — they're being replaced entirely.
- **Keep: Basic Info, Links, SEO, Sidebar.** These use meta/seo paths and will persist through Phase 4.
- **`theme.status`, `theme.slug`, `theme.id`, `theme.created_at`, `theme.updated_at`, `theme.created_by`** — ALL stay top-level. Only content fields moved into `meta.*`.
- **EditorSidebar already has `PLUGIN_OPTIONS` and `BADGE_OPTIONS`.** The `COMPATIBLE_OPTIONS` / `CompatiblePluginsField` in theme-editor.tsx is redundant — sidebar handles compatible_plugins. Remove from editor.
- **`UrlListField` helper** — remove from theme-editor.tsx. It will be recreated in Phase 4 section editors if needed.
- **Do NOT change `apps/studio/src/lib/queries.ts`** — `select('*')` auto-propagates types. Just verify it compiles.
- **Test with `npx tsc --noEmit` (no project filter) at the end** — this catches cross-package type errors that project-scoped checks miss.
