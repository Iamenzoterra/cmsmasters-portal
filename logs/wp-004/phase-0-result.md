# Execution Log: WP-004 Phase 0 — RECON Flat-Field Inventory
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: 2026-03-30T11:10:00+02:00
> Duration: ~15 minutes
> Status: COMPLETE

## What Was Implemented
Full audit of all flat-field references across DB schema, types, validators, boundary mappers, queries, Studio UI (list + editor), Hono API, and RLS policies.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Schema ground truth | types.ts (27 cols) over migration (20 cols) | 6 ADR-009 columns (hero, compatible_plugins, trust_badges, rating, sales, resources) added after initial migration |
| RLS policy risk | None — safe to migrate | All 5 themes policies reference only `status` and `get_user_role()`, no content columns |
| Command Center impact | None — independent | CC uses its own `ThemeEntry` type, not `Theme` from `@cmsmasters/db` |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| (none) | — | Audit only |

## Issues & Workarounds
- **Schema mismatch**: `001_initial_schema.sql` has 20 columns but `types.ts` defines 27. Six ADR-009 fields (hero, compatible_plugins, trust_badges, rating, sales, resources) were added via a subsequent migration or direct SQL — not captured in the tracked migration file. Phase 1 migration must account for this.

## Open Questions
- What migration added the 6 ADR-009 columns? Need to verify they exist in live Supabase before Phase 1 migration runs ALTER TABLE DROP.

## Verification Results
| Check | Result |
|-------|--------|
| All 11 audits done | Covered (0.9/0.11 via migration file, no Supabase MCP needed) |
| Inventory complete | All 9 sections populated |
| Summary written | Present at bottom |

## Git
- Commit: (pending) — `recon: flat-field inventory [WP-004 phase 0]`

---

# WP-004 Phase 0: Flat-Field Inventory

## 1. DATABASE LAYER

### Columns (from types.ts — operational ground truth, 27 columns)

**System columns (kept as-is in WP-004):**
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NOT NULL | PK, auto-gen |
| slug | text | NOT NULL | UNIQUE |
| name | text | NOT NULL | |
| status | text | NOT NULL | CHECK draft/published/archived |
| created_by | uuid | YES | FK to profiles |
| created_at | timestamptz | NOT NULL | auto |
| updated_at | timestamptz | NOT NULL | auto, trigger |

**Flat content columns (to be restructured into meta/sections/seo jsonb):**
| Column | Type | Nullable | Target |
|--------|------|----------|--------|
| tagline | text | YES | meta |
| description | text | YES | meta |
| category | text | YES | meta |
| price | decimal(10,2) | YES | meta |
| demo_url | text | YES | meta |
| themeforest_url | text | YES | meta |
| themeforest_id | text | YES | meta |
| thumbnail_url | text | YES | meta |
| preview_images | jsonb | YES | meta |
| features | jsonb | YES | sections |
| included_plugins | jsonb | YES | sections |
| custom_sections | jsonb | YES | sections |
| seo_title | text | YES | seo |
| seo_description | text | YES | seo |

**ADR-009 columns (added post-initial-migration, also to be restructured):**
| Column | Type | Nullable | Target |
|--------|------|----------|--------|
| hero | jsonb | YES | sections |
| compatible_plugins | jsonb | YES | sections |
| trust_badges | jsonb | YES | meta |
| rating | numeric | YES | meta |
| sales | integer | YES | meta |
| resources | jsonb | YES | sections |

### Migration file: `supabase/migrations/001_initial_schema.sql`
- Lines 38-61: CREATE TABLE themes — 20 columns (excludes hero, compatible_plugins, trust_badges, rating, sales, resources)
- Lines 93-94: Indexes on slug and status
- Line 112: themes_updated trigger for updated_at

### RLS policies referencing themes (lines 142-151)
| Policy | Line | CMD | References |
|--------|------|-----|-----------|
| themes_select_published | 142 | SELECT | `status = 'published'` |
| themes_select_staff | 144 | SELECT | `get_user_role() IN (...)` |
| themes_insert_staff | 146 | INSERT | `get_user_role() IN (...)` |
| themes_update_staff | 148 | UPDATE | `get_user_role() IN (...)` |
| themes_select_anon | 150 | SELECT | `status = 'published'` |

**No content column references in any RLS policy. Safe to drop/restructure.**

## 2. TYPES LAYER (packages/db/src/types.ts)

### Interfaces to remove/rewrite
| Interface | Lines | Fields | Used in |
|-----------|-------|--------|---------|
| ThemeFeature | 3-7 | icon, title, description | types.ts:93, types.ts:123, types.ts:152; validators/theme.ts:31-35; form-defaults.ts:32,69 |
| ThemePlugin | 9-14 | name, slug, value?, icon_url? | types.ts:94, types.ts:124, types.ts:153; validators/theme.ts:39-44; form-defaults.ts:33,70 |
| CustomSection | 16-19 | type, data | types.ts:95, types.ts:125, types.ts:154; validators/theme.ts:55-58; form-defaults.ts:39,76 |
| ThemeHero | 21-24 | screenshots, headline? | types.ts:103, types.ts:132, types.ts:160; validators/theme.ts:3-6; form-defaults.ts:31,68 |
| ThemeResources | 26-30 | public[], licensed[], premium[] | types.ts:108, types.ts:137, types.ts:165; validators/theme.ts:8-12; form-defaults.ts:38,75 |

### Type aliases to rewrite
| Alias | Line | Current | Target |
|-------|------|---------|--------|
| Theme (Row) | 258 | 27 flat fields (lines 80-109) | id, slug, name, status, meta, sections, seo, created_by, created_at, updated_at |
| ThemeInsert | 259 | 27 flat fields (lines 110-138) | same structure, optionals for insert |
| ThemeUpdate | 260 | 27 flat fields (lines 139-166) | same structure, all optional |
| ThemeStatus | 41 | 'draft' \| 'published' \| 'archived' | **keep as-is** |

### Type exports (packages/db/src/index.ts)
| Export | Line | Needs update? |
|--------|------|---------------|
| ThemeFeature | 9 | YES — remove or restructure |
| ThemePlugin | 10 | YES — remove or restructure |
| ThemeHero | 11 | YES — remove or restructure |
| ThemeResources | 12 | YES — remove or restructure |
| CustomSection | 13 | YES — remove or restructure |
| Theme | 17 | YES — shape changes |
| ThemeInsert | 18 | YES — shape changes |
| ThemeUpdate | 19 | YES — shape changes |
| ThemeStatus | 7 | NO — keep |

## 3. VALIDATORS LAYER (packages/validators/src/theme.ts)

### Sub-schemas
| Schema | Lines | Fields |
|--------|-------|--------|
| themeHeroSchema | 3-6 | screenshots: string[], headline: string? |
| themeResourcesSchema | 8-12 | public: string[], licensed: string[], premium: string[] |

### Fields in themeSchema (lines 14-66)
| Field | Line | Validator | Target |
|-------|------|-----------|--------|
| slug | 15 | `z.string().regex(/^[a-z0-9-]+$/).min(2).max(100)` | keep (system) |
| name | 16 | `z.string().min(1).max(200)` | keep (system) |
| tagline | 17 | `z.string().max(500).optional()` | meta |
| description | 18 | `z.string().optional()` | meta |
| category | 19 | `z.string().optional()` | meta |
| price | 20 | `z.number().positive().optional()` | meta |
| demo_url | 21 | `z.string().url().optional().or(z.literal(''))` | meta |
| themeforest_url | 22 | `z.string().url().optional().or(z.literal(''))` | meta |
| themeforest_id | 23 | `z.string().optional()` | meta |
| thumbnail_url | 24 | `z.string().optional()` | meta |
| preview_images | 25 | `z.array(z.string()).default([])` | meta |
| hero | 28 | `themeHeroSchema.default(...)` | sections |
| features | 31-35 | `z.array(z.object({...})).default([])` | sections |
| compatible_plugins | 38 | `z.array(z.string()).default([])` | sections |
| included_plugins | 39-44 | `z.array(z.object({...})).default([])` | sections |
| trust_badges | 47 | `z.array(z.string()).default([])` | meta |
| rating | 48 | `z.number().min(0).max(5).optional()` | meta |
| sales | 49 | `z.number().int().min(0).optional()` | meta |
| resources | 52 | `themeResourcesSchema.default(...)` | sections |
| custom_sections | 55-58 | `z.array(z.object({...})).default([])` | sections |
| seo_title | 61 | `z.string().max(70).optional()` | seo |
| seo_description | 62 | `z.string().max(160).optional()` | seo |
| status | 65 | `z.enum([...]).default('draft')` | keep (system) |

**Type export:** `ThemeFormData = z.infer<typeof themeSchema>` (line 68)

## 4. BOUNDARY MAPPERS (apps/studio/src/lib/form-defaults.ts)

### getDefaults() — lines 8-13
Derives defaults by parsing `{ slug: '', name: '' }` through `themeSchema.parse()`. All fields get schema defaults.

### themeToFormData() — DB Row to Form (lines 18-44)
| Field | Line | Null handling |
|-------|------|---------------|
| slug | 20 | direct |
| name | 21 | direct |
| tagline | 22 | `?? ''` |
| description | 23 | `?? ''` |
| category | 24 | `?? ''` |
| price | 25 | `?? undefined` |
| demo_url | 26 | `?? ''` |
| themeforest_url | 27 | `?? ''` |
| themeforest_id | 28 | `?? ''` |
| thumbnail_url | 29 | `?? ''` |
| preview_images | 30 | `?? []` |
| hero | 31 | `?? { screenshots: [], headline: null }` |
| features | 32 | `?? []` |
| included_plugins | 33 | `?? []` |
| compatible_plugins | 34 | `?? []` |
| trust_badges | 35 | `?? []` |
| rating | 36 | `?? undefined` |
| sales | 37 | `?? undefined` |
| resources | 38 | `?? { public: [], licensed: [], premium: [] }` |
| custom_sections | 39 | `?? []` |
| seo_title | 40 | `?? ''` |
| seo_description | 41 | `?? ''` |
| status | 42 | direct |

**Total: 23 fields mapped (21 content + slug + name)**

### formDataToUpsert() — Form to DB Insert (lines 54-81)
| Field | Line | Transform |
|-------|------|-----------|
| id | 56 | conditional spread from existingId |
| slug | 57 | direct |
| name | 58 | direct |
| tagline | 59 | `emptyToNull()` |
| description | 60 | `emptyToNull()` |
| category | 61 | `emptyToNull()` |
| price | 62 | `?? null` |
| demo_url | 63 | `emptyToNull()` |
| themeforest_url | 64 | `emptyToNull()` |
| themeforest_id | 65 | `emptyToNull()` |
| thumbnail_url | 66 | `emptyToNull()` |
| preview_images | 67 | `length > 0 ? arr : null` |
| hero | 68 | direct |
| features | 69 | `length > 0 ? arr : null` |
| included_plugins | 70 | `length > 0 ? arr : null` |
| compatible_plugins | 71 | `length > 0 ? arr : null` |
| trust_badges | 72 | `length > 0 ? arr : null` |
| rating | 73 | `?? null` |
| sales | 74 | `?? null` |
| resources | 75 | direct |
| custom_sections | 76 | `length > 0 ? arr : null` |
| seo_title | 77 | `emptyToNull()` |
| seo_description | 78 | `emptyToNull()` |
| status | 79 | direct |

**Total: 24 fields mapped (21 content + slug + name + conditional id)**

### Helper: emptyToNull() — line 50-52
Trims whitespace, returns null if empty. Used for all string fields.

### Helper: nameToSlug() — lines 86-93
Kebab-case conversion. Not flat-field-related, keep as-is.

### Imports (lines 1-2)
- `themeSchema, type ThemeFormData` from `@cmsmasters/validators`
- `type Theme, ThemeInsert` from `@cmsmasters/db`

## 5. STUDIO QUERIES (apps/studio/src/lib/queries.ts)

### Functions that read/write themes
| Function | Lines | Operation | Query |
|----------|-------|-----------|-------|
| fetchAllThemes() | 14-21 | SELECT * | `.from('themes').select('*').order('updated_at', ...)` — all statuses for staff |
| deleteTheme() | 29-35 | DELETE | `.from('themes').delete().eq('id', id)` — Studio-local |
| fetchThemeBySlug() | 40-51 | SELECT * | `.from('themes').select('*').eq('slug', slug).single()` — any status |

### Import: `type Theme` from `@cmsmasters/db` (line 2)

### Shared DB queries (packages/db/src/queries/themes.ts)
| Function | Lines | Operation | Query |
|----------|-------|-----------|-------|
| getThemes() | 4-12 | SELECT * | `.from('themes').select('*').eq('status', 'published')` — Portal public |
| getThemeBySlug() | 14-22 | SELECT * | `.from('themes').select('*').eq('slug', slug).single()` — Portal detail |
| upsertTheme() | 24-32 | UPSERT | `.from('themes').upsert(theme, { onConflict: 'slug' })` — accepts ThemeInsert |

**All use `select('*')`.** Schema change propagates automatically through types — no query text changes needed, but ThemeInsert shape changes affect upsertTheme callers.

## 6. STUDIO UI — List page (themes-list.tsx, theme-card.tsx, themes-table.tsx)

### themes-list.tsx (apps/studio/src/pages/themes-list.tsx)
| Field | Line | Operation | Context |
|-------|------|-----------|---------|
| name | 55 | READ | Search filter `.toLowerCase().includes(q)` |
| status | 59 | READ | Status filter comparison |
| slug | 233, 242 | READ | Navigation onClick |
| id | 231 | READ | React key |

**Imports:** `type Theme` from `@cmsmasters/db` (line 3), `fetchAllThemes` from queries (line 6)

### theme-card.tsx (apps/studio/src/components/theme-card.tsx)
| Field | Line | Operation | Context |
|-------|------|-----------|---------|
| thumbnail_url | 31 | READ | Image display conditional |
| name | 34, 69 | READ | img alt, title text |
| tagline | 73, 84 | READ | Conditional display |
| category | 90, 105 | READ | Badge display conditional |
| status | 108 | READ | StatusBadge component |
| price | 122 | READ | formatPrice() |
| updated_at | 132 | READ | timeAgo() |

**Import:** `type Theme` from `@cmsmasters/db` (line 1)

### themes-table.tsx (apps/studio/src/components/themes-table.tsx)
| Field | Line | Operation | Context |
|-------|------|-----------|---------|
| id | 43 | READ | React key |
| slug | 44 | READ | Navigation onClick |
| name | 55 | READ | Table cell |
| category | 58 | READ | Table cell, `?? '---'` |
| status | 61 | READ | StatusBadge |
| price | 64 | READ | formatPrice() |
| updated_at | 67 | READ | timeAgo() |

**Import:** `type Theme` from `@cmsmasters/db` (line 1)

### status-badge.tsx (apps/studio/src/components/status-badge.tsx)
- **Import:** `type ThemeStatus` from `@cmsmasters/db` (line 1)
- **Usage:** `Record<ThemeStatus, { bg, fg, dot }>` (line 9), props type (line 28)
- **No flat content fields.** ThemeStatus type is kept — no change needed here.

## 7. STUDIO UI — Editor (theme-editor.tsx)

### Imports (lines 1-18)
| Import | Line | Source | Needs update? |
|--------|------|--------|---------------|
| themeSchema, ThemeFormData | 5 | @cmsmasters/validators | YES — schema restructures |
| Theme | 6 | @cmsmasters/db | YES — type shape changes |
| upsertTheme, logAction | 7 | @cmsmasters/db | upsertTheme: YES (ThemeInsert shape) |
| fetchThemeBySlug, deleteTheme | 10 | ../lib/queries | NO — return type auto-updates |
| getDefaults, themeToFormData, formDataToUpsert, nameToSlug | 12 | ../lib/form-defaults | YES — mapper rewrite |
| FormSection | 14 | ../components/form-section | NO |
| CharCounter | 15 | ../components/char-counter | NO |
| ChipSelect | 16 | ../components/chip-select | NO |
| EditorSidebar | 17 | ../components/editor-sidebar | YES — props may change |
| EditorFooter | 18 | ../components/editor-footer | NO |

### Flat field bindings (form register/watch/setValue)
| Field | Line(s) | Type | Context |
|-------|---------|------|---------|
| name | 98 (watch), 371 (register) | R/W | Slug auto-gen + input |
| slug | 102 (setValue), 115 (watch), 375 (register) | R/W | Auto-gen + display + input |
| tagline | 383 (register) | W | Input |
| description | 387 (register) | W | Textarea |
| demo_url | 399 (register) | W | URL input |
| themeforest_url | 402 (register) | W | URL input |
| themeforest_id | 405 (register) | W | Input |
| hero.headline | 412 (register) | W | Input |
| hero.screenshots | 415 (UrlListField) | R/W | Repeater |
| features | 107 (useFieldArray), 421-449 (render) | R/W | Repeater + append/remove |
| included_plugins | 110 (useFieldArray), 465-494 (render) | R/W | Repeater + append/remove |
| compatible_plugins | 665 (useController) | R/W | ChipSelect via CompatiblePluginsField |
| seo_title | 113 (watch), 503-504 (render + register) | R/W | CharCounter + input |
| seo_description | 114 (watch), 506-508 (render + register) | R/W | CharCounter + textarea |
| custom_sections | 618 (watch), 625 (setValue) | R/W | JSON textarea via CustomSectionsField |
| status | 179 (force 'published') | W | Publish handler |

**Fields delegated to EditorSidebar (via control/register/watch/setValue props):**
thumbnail_url, status, category, price, rating, sales, trust_badges, compatible_plugins, resources.public, resources.licensed, resources.premium

### Save/Publish/Delete data flow
| Handler | Line | Reads form? | Calls | Fields in payload |
|---------|------|-------------|-------|-------------------|
| handleSaveDraft | 132-167 | form.getValues() (136) | formDataToUpsert → upsertTheme | All 24 |
| handlePublish | 170-217 | form.getValues() (174) | formDataToUpsert → upsertTheme | All 24 + force status |
| handleDelete | 220-247 | existingTheme.id (227) | deleteTheme(id) | id only |
| handleDiscard | 250-256 | — | reset(themeToFormData) | All (reset) |

## 8. HONO API (apps/api/src/)

### Theme references: NONE

Files checked:
- apps/api/src/index.ts
- apps/api/src/env.ts
- apps/api/src/lib/supabase.ts
- apps/api/src/middleware/auth.ts
- apps/api/src/middleware/role.ts
- apps/api/src/routes/health.ts
- apps/api/src/routes/revalidate.ts
- apps/api/src/routes/upload.ts

**Zero theme type imports, zero `.from('themes')` queries.**
Revalidate endpoint (routes/revalidate.ts) receives a slug via POST body but does not query the themes table.

## 9. CROSS-CUTTING: Type imports

| File | Line | Import | Needs update? |
|------|------|--------|---------------|
| apps/studio/src/pages/theme-editor.tsx | 5 | `themeSchema, ThemeFormData` | YES |
| apps/studio/src/pages/theme-editor.tsx | 6 | `Theme` | YES |
| apps/studio/src/pages/theme-editor.tsx | 7 | `upsertTheme, logAction` | upsertTheme YES |
| apps/studio/src/pages/theme-editor.tsx | 12 | `getDefaults, themeToFormData, formDataToUpsert, nameToSlug` | YES |
| apps/studio/src/pages/themes-list.tsx | 3 | `Theme` | YES (auto) |
| apps/studio/src/components/theme-card.tsx | 1 | `Theme` | YES (auto) |
| apps/studio/src/components/themes-table.tsx | 1 | `Theme` | YES (auto) |
| apps/studio/src/components/status-badge.tsx | 1 | `ThemeStatus` | NO |
| apps/studio/src/components/editor-sidebar.tsx | 2 | `ThemeFormData` | YES |
| apps/studio/src/components/editor-sidebar.tsx | 3 | `Theme` | YES (auto) |
| apps/studio/src/lib/form-defaults.ts | 1 | `themeSchema, ThemeFormData` | YES |
| apps/studio/src/lib/form-defaults.ts | 2 | `Theme, ThemeInsert` | YES |
| apps/studio/src/lib/queries.ts | 2 | `Theme` | YES (auto) |
| packages/db/src/queries/themes.ts | 2 | `ThemeInsert` | YES |
| packages/db/src/index.ts | 9-13 | `ThemeFeature, ThemePlugin, ThemeHero, ThemeResources, CustomSection` | YES |
| packages/db/src/index.ts | 17-19 | `Theme, ThemeInsert, ThemeUpdate` | YES (auto) |

**"YES (auto)"** = type shape changes propagate through existing alias; no import line change needed, but consuming code must adapt to new shape.

## SUMMARY

- **Total files to modify**: 12
  - packages/db: types.ts, index.ts, queries/themes.ts (3)
  - packages/validators: theme.ts (1)
  - apps/studio/src/lib: form-defaults.ts, queries.ts (2)
  - apps/studio/src/pages: theme-editor.tsx, themes-list.tsx (2)
  - apps/studio/src/components: editor-sidebar.tsx, theme-card.tsx, themes-table.tsx, status-badge.tsx (4, though status-badge only if ThemeStatus moves)
- **Total flat-field references**: ~160+ (21 content fields x multiple layers)
- **RLS policies to update**: 0 (all reference status/role only)
- **Clean boundary mappers exist**: YES (form-defaults.ts: themeToFormData + formDataToUpsert)
- **Hono API impact**: None
- **Command Center impact**: None (independent ThemeEntry type)

### Risk Areas
1. **Schema mismatch**: 6 columns exist in types.ts but not in initial migration. Phase 1 must verify live DB schema before running DROP COLUMN.
2. **`select('*')` everywhere**: All queries use `select('*')` — schema change auto-propagates through types, but any code destructuring specific flat fields will break at compile time (good — TS catches it).
3. **Boundary mapper is the single gate**: All read/write flows go through `themeToFormData()` and `formDataToUpsert()`. Rewriting these two functions correctly is the critical path — if they're right, the entire UI continues working.
4. **Editor sidebar receives form control**: EditorSidebar accesses fields via `useController` with flat paths like `'rating'`, `'trust_badges'`, `'resources.public'`. These paths must update to the new jsonb structure or the form schema must keep the same flat shape (boundary mapper absorbs the change).
5. **List/card/table read fields directly from Theme**: `theme.name`, `theme.category`, `theme.price`, etc. These will break if Theme shape changes and fields move into nested jsonb. Either the type must preserve top-level access or these components must be updated.
