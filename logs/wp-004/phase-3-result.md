# Execution Log: WP-004 Phase 3 — Query Recovery + Path Migration
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: 2026-03-30T13:30:00+02:00
> Duration: ~20 minutes
> Status: COMPLETE

## What Was Implemented
Migrated all Studio call sites from flat theme shape to nested `{ slug, meta, sections, seo, status }`. Rewrote form-defaults.ts with getDefaultSections()-based init (no themeSchema.parse). Renamed ~30 paths across list/card/table/sidebar/editor. Removed 4 legacy form sections (Hero/Features/Plugins/CustomSections) and 4 dead helper components from editor. Phase 4 rebuilds these as section-based editors.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| getDefaults() | Plain typed literal, not themeSchema.parse() | parse throws on empty slug/name (min constraints). Form validates on submit via resolver. |
| formatPrice(theme.meta.price) | Added `?? null` coercion | ThemeMeta.price is `number \| undefined` but formatPrice expects `number \| null`. |
| Legacy section removal | Two-pass: path renames first, then JSX removal | M6: ensures form compiles between passes, dead code identified by tsc. |
| queries.ts | NOT modified | `select('*')` + Theme type auto-propagated from Phase 1. tsc confirms. |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/lib/form-defaults.ts` | rewritten | Removed flat mappers, new getDefaults() with getDefaultSections() |
| `apps/studio/src/pages/themes-list.tsx` | modified | 1 path rename: t.name → t.meta.name |
| `apps/studio/src/components/theme-card.tsx` | modified | 8 path renames + formatPrice coercion |
| `apps/studio/src/components/themes-table.tsx` | modified | 3 path renames + formatPrice coercion |
| `apps/studio/src/components/editor-sidebar.tsx` | modified | 13 path renames (useController, register, watch) |
| `apps/studio/src/pages/theme-editor.tsx` | major modified | Import swap, ~20 path renames, removed 4 form sections + 4 helpers + unused imports |

## Issues & Workarounds
- **formatPrice type mismatch**: ThemeMeta.price is `number | undefined` (optional), formatPrice expects `number | null`. Fixed with `?? null` at call sites in card and table.

## Open Questions
None.

## Verification Results
| Check | Result |
|-------|--------|
| apps/studio tsc | 7 errors: 6 @cmsmasters/auth + 1 api-client (all pre-existing, zero WP-004) |
| packages/db tsc | 0 errors |
| packages/validators tsc | 0 errors |
| mappers.test.ts | 38/38 |
| registry.test.ts | 27/27 |
| Legacy seo_title/seo_description | 0 matches |
| Legacy themeToFormData/formDataToUpsert | 0 matches |
| Flat theme.name/category/price in list/card/table | 0 matches |
| Flat sidebar paths | 0 matches |
| Flat register paths in editor | 0 matches |

### Known pre-existing errors (exact fingerprint)
| File | Line | Error |
|------|------|-------|
| app.tsx | 2 | TS2307: @cmsmasters/auth |
| sidebar.tsx | 3 | TS2307: @cmsmasters/auth |
| topbar.tsx | 1 | TS2307: @cmsmasters/auth |
| supabase.ts | 1 | TS2307: @cmsmasters/auth |
| auth-callback.tsx | 3 | TS2307: @cmsmasters/auth |
| login.tsx | 2 | TS2307: @cmsmasters/auth |
| node_modules/@cmsmasters/api-client/src/client.ts | 4 | TS2307: apps/api/src/index |

## Git
- Commit: (below)
