# Execution Log: WP-005A Phase 0 — RECON
> Epic: WP-005A Block Library Foundation
> Executed: 2026-03-30T19:40:00+02:00
> Duration: ~6 minutes
> Status: COMPLETE

## What Was Audited

Full grep scan of all `packages/` and `apps/` for every section/type symbol. Checked all possible consumers: command-center, portal, dashboard, admin, api-client, auth, email, ui. Reviewed tsconfig.json for both validators and db. Inventoried all 13 files in `validators/sections/` + 1 test file.

---

## A. Symbol Inventory

### Section Type Symbols (packages/validators/)

| Symbol | File | Line(s) | Action |
|--------|------|---------|--------|
| `sectionTypeEnum` | `validators/src/theme.ts` | 5 | Rename to `blockTypeEnum` |
| `sectionSchema` | `validators/src/theme.ts` | 54 | Rename to `blockSchema`, rename `.type` field to `.block` |
| `sectionsSchema` | `validators/src/theme.ts` | 59 | Rename to `blocksSchema` |
| `sectionTypeEnum` (import) | `validators/src/sections/index.ts` | 2 | Update import |
| `SectionType` (local) | `validators/src/sections/index.ts` | 18 | Rename to `BlockType` |
| `SectionRegistryEntry` | `validators/src/sections/index.ts` | 22 | Rename to `BlockRegistryEntry` |
| `SECTION_REGISTRY` | `validators/src/sections/index.ts` | 30 | Rename to `BLOCK_REGISTRY` |
| `SECTION_TYPES` | `validators/src/sections/index.ts` | 95 | Rename to `BLOCK_TYPES` |
| `SECTION_LABELS` | `validators/src/sections/index.ts` | 97-99 | Rename to `BLOCK_LABELS` |
| `CORE_SECTION_TYPES` | `validators/src/sections/index.ts` | 101 | Rename to `CORE_BLOCK_TYPES` |
| `getDefaultSections` | `validators/src/sections/index.ts` | 110 | Rename to `getDefaultBlocks`, change return type `{ type: ... }` -> `{ block: ... }` |
| `validateSectionData` | `validators/src/sections/index.ts` | 120 | Rename to `validateBlockData` |
| `validateSections` | `validators/src/sections/index.ts` | 135 | Rename to `validateBlocks` |
| re-exports (all above) | `validators/src/index.ts` | 7, 13-19, 21 | Update all re-export names |
| per-type schema re-exports | `validators/src/index.ts` | 24-28 | Update paths from `./sections/*` to `@cmsmasters/blocks/*` or new location |

### Section Type Symbols (packages/db/)

| Symbol | File | Line(s) | Action |
|--------|------|---------|--------|
| `SectionType` | `db/src/types.ts` | 27-39 | Rename to `BlockType` |
| `ThemeSection` | `db/src/types.ts` | 41-44 | Rename to `ThemeBlock`, rename `.type` field to `.block` |
| `ThemeSection[]` | `db/src/types.ts` | 106, 117, 128 | Update to `ThemeBlock[]` |
| `SectionType` export | `db/src/index.ts` | 10 | Rename to `BlockType` |
| `ThemeSection` export | `db/src/index.ts` | 11 | Rename to `ThemeBlock` |

### Section Type Symbols (apps/studio/)

| Symbol | File | Line(s) | Action |
|--------|------|---------|--------|
| `SectionType` import | `theme-editor.tsx` | 10 | Change to `BlockType` from `@cmsmasters/db` |
| `SECTION_LABELS` import | `theme-editor.tsx` | 9 | Change to `BLOCK_LABELS` from `@cmsmasters/validators` |
| `CORE_SECTION_TYPES` import | `theme-editor.tsx` | 9 | Change to `CORE_BLOCK_TYPES` |
| `SECTION_REGISTRY` import | `theme-editor.tsx` | 9 | Change to `BLOCK_REGISTRY` |
| `SectionType` usage | `theme-editor.tsx` | 411, 505, 535, 566, 629 | Rename all to `BlockType` |
| `field.type as SectionType` | `theme-editor.tsx` | 535, 566 | Change to `field.block as BlockType` |
| `getDefaultSections` import | `form-defaults.ts` | 2 | Change to `getDefaultBlocks` |
| `getDefaultSections()` call | `form-defaults.ts` | 26 | Change to `getDefaultBlocks()` |

### Test Files — Fixture Updates

| Symbol | File | Line(s) | Action |
|--------|------|---------|--------|
| `{ type: '...' }` fixtures | `validators/sections/__tests__/registry.test.ts` | 48-105 (16 occurrences) | Change `type:` to `block:` in all fixture objects |
| `s.type` reference | `validators/sections/__tests__/registry.test.ts` | 36 | Change to `s.block` |
| `SECTION_*` references | `validators/sections/__tests__/registry.test.ts` | 2-8, 22-28 | Rename to `BLOCK_*` |
| `validateSectionData` calls | `validators/sections/__tests__/registry.test.ts` | 46-81 | Rename to `validateBlockData` |
| `validateSections` calls | `validators/sections/__tests__/registry.test.ts` | 86-105 | Rename to `validateBlocks` |
| `{ type: '...' }` fixtures | `db/__tests__/mappers.test.ts` | 89-90, 110 | Change `type:` to `block:` |
| `sectionSchema` import | `db/__tests__/mappers.test.ts` | 2 | Rename to `blockSchema` |
| `sectionSchema.safeParse({ type: ... })` | `db/__tests__/mappers.test.ts` | 122, 125, 128 | Change to `blockSchema.safeParse({ block: ... })` |
| `SectionType Enforcement` label | `db/__tests__/mappers.test.ts` | 118, 120 | Rename to `BlockType Enforcement` |

---

## B. Import Dependency Map

```
@cmsmasters/validators (source of truth)
  validators/src/theme.ts
    <- validators/src/sections/index.ts (imports sectionTypeEnum)
    <- validators/src/index.ts (re-exports sectionSchema, sectionsSchema, sectionTypeEnum)

  validators/src/sections/index.ts
    <- validators/src/index.ts (re-exports SECTION_REGISTRY, SECTION_TYPES, etc.)
    <- validators/src/sections/__tests__/registry.test.ts (direct import)

  validators/src/sections/*.ts (12 per-type schemas)
    <- validators/src/sections/index.ts (imports each schema)
    <- validators/src/index.ts (re-exports 5 core schemas: theme-hero, feature-grid, plugin-comparison, trust-strip, related-themes)

@cmsmasters/db
  db/src/types.ts (defines SectionType, ThemeSection)
    <- db/src/index.ts (re-exports)
    <- db/src/mappers.ts (imports Theme, ThemeInsert — ThemeSection used transitively)
    <- db/__tests__/mappers.test.ts (tests)

  db/src/mappers.ts
    <- db/src/index.ts (re-exports themeRowToFormData, formDataToThemeInsert)

Consumers:
  apps/studio/src/pages/theme-editor.tsx
    <- @cmsmasters/db: SectionType
    <- @cmsmasters/validators: themeSchema, ThemeFormData, SECTION_LABELS, CORE_SECTION_TYPES, SECTION_REGISTRY

  apps/studio/src/lib/form-defaults.ts
    <- @cmsmasters/validators: ThemeFormData, getDefaultSections

  apps/studio/src/components/editor-sidebar.tsx
    <- @cmsmasters/validators: ThemeFormData (type only — NO section symbols)
```

**No other consumers.** The following were checked and are clean:
- `apps/command-center/` — no section references
- `apps/portal/`, `apps/dashboard/`, `apps/admin/` — do not exist yet (empty dirs)
- `packages/api-client/` — no section references
- `packages/auth/` — no section references
- `packages/email/` — does not exist
- `packages/ui/` — no section references

---

## C. Files to Delete (move to packages/blocks/)

12 schema files + index + tests directory:

| File | Content |
|------|---------|
| `packages/validators/src/sections/theme-hero.ts` | ThemeHero schema + defaults |
| `packages/validators/src/sections/feature-grid.ts` | FeatureGrid schema + defaults |
| `packages/validators/src/sections/plugin-comparison.ts` | PluginComparison schema + defaults |
| `packages/validators/src/sections/trust-strip.ts` | TrustStrip schema + defaults |
| `packages/validators/src/sections/related-themes.ts` | RelatedThemes schema + defaults |
| `packages/validators/src/sections/before-after.ts` | BeforeAfter stub schema |
| `packages/validators/src/sections/video-demo.ts` | VideoDemo stub schema |
| `packages/validators/src/sections/testimonials.ts` | Testimonials stub schema |
| `packages/validators/src/sections/faq.ts` | FAQ stub schema |
| `packages/validators/src/sections/cta-banner.ts` | CTABanner stub schema |
| `packages/validators/src/sections/stats-counter.ts` | StatsCounter stub schema |
| `packages/validators/src/sections/resource-sidebar.ts` | ResourceSidebar stub schema |
| `packages/validators/src/sections/index.ts` | Registry, validation functions |
| `packages/validators/src/sections/__tests__/registry.test.ts` | Registry test suite |

Total: 14 files (12 schemas + 1 index + 1 test)

---

## D. Files to Modify

### packages/validators/ (3 files)

| File | Changes |
|------|---------|
| `src/theme.ts` | Rename `sectionTypeEnum` -> `blockTypeEnum`, `sectionSchema` -> `blockSchema` (field `.type` -> `.block`), `sectionsSchema` -> `blocksSchema` |
| `src/index.ts` | Update all re-exports: new names + new paths (`@cmsmasters/blocks` or `./sections` -> deleted) |
| `tsconfig.json` | May need `@cmsmasters/blocks` path alias if validators imports from blocks |

### packages/db/ (3 files)

| File | Changes |
|------|---------|
| `src/types.ts` | Rename `SectionType` -> `BlockType`, `ThemeSection` -> `ThemeBlock`, field `.type` -> `.block` |
| `src/index.ts` | Update exports: `SectionType` -> `BlockType`, `ThemeSection` -> `ThemeBlock` |
| `tsconfig.json` | Already has `@cmsmasters/validators` path alias; may need `@cmsmasters/blocks` if db imports from blocks |

### packages/db/ tests (1 file)

| File | Changes |
|------|---------|
| `src/__tests__/mappers.test.ts` | `sectionSchema` -> `blockSchema`, `{ type: ... }` -> `{ block: ... }` in fixtures (5 occurrences), `SectionType` labels -> `BlockType` |

### apps/studio/ (2 files)

| File | Changes |
|------|---------|
| `src/pages/theme-editor.tsx` | `SectionType` -> `BlockType` (6 occurrences), `SECTION_LABELS` -> `BLOCK_LABELS`, `CORE_SECTION_TYPES` -> `CORE_BLOCK_TYPES`, `SECTION_REGISTRY` -> `BLOCK_REGISTRY`, `field.type` -> `field.block` (2 occurrences) |
| `src/lib/form-defaults.ts` | `getDefaultSections` -> `getDefaultBlocks` (import + call) |

### packages/db/ mappers (0 changes needed)

`mappers.ts` only passes `sections` array through as-is (`row.sections`, `form.sections`). The `sections` column name stays. The `.type` -> `.block` rename is transparent because mappers doesn't access individual fields. **No changes needed.**

---

## E. Surprises / Edge Cases

1. **editor-sidebar.tsx is clean** — imports only `ThemeFormData` type from validators, no section symbols. No changes needed.

2. **mappers.ts is pass-through** — doesn't access `.type` field on individual section objects. Only `mappers.test.ts` has fixtures that use `{ type: ... }`.

3. **queries/themes.ts has zero "section" references** — it queries the `themes` table but doesn't reference the `sections` column by name (the ORM handles it). Clean.

4. **`getDefaultSections()` return type** has explicit `{ type: SectionType; data: ... }` — needs rename to `{ block: BlockType; data: ... }`.

5. **validators/sections/index.ts has a local `SectionType`** derived via `z.infer<typeof sectionTypeEnum>` — not imported from db. This avoids circular deps. The blocks package will need the same pattern.

6. **5 per-type schema re-exports** in `validators/src/index.ts` (lines 24-28) export from `./sections/theme-hero`, etc. These paths will break when files move to `packages/blocks/`. Decision needed: re-export from `@cmsmasters/blocks` or move these exports entirely to blocks.

7. **db tsconfig has `@cmsmasters/validators` path alias** (`"../validators/src/index.ts"`). Will need `@cmsmasters/blocks` alias added when blocks becomes a dependency.

---

## F. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Circular dep: validators <-> blocks** | Medium | blocks depends on zod only. validators imports from blocks. db imports types independently. Same pattern as current validators/sections split. |
| **db tsconfig path resolution** | Low | Just add `@cmsmasters/blocks` path alias pointing to `../blocks/src/index.ts` |
| **ThemeFormData shape change** | Medium | `ThemeFormData.sections[n].type` -> `.block` ripples through theme-editor, form-defaults, mappers.test.ts. All consumers identified above — no hidden ones. |
| **Test fixtures with `{ type: ... }`** | Low | 21 total `{ type: ... }` occurrences across 2 test files. Mechanical rename. |
| **Supabase column name** | None | `sections` column stays. Only JSON field inside array elements changes. 0 rows in prod = no data migration. |
| **No other consumers** | None | Confirmed: command-center, api-client, auth, ui — all clean. Scope is contained. |

---

## Verification Results

| Check | Result |
|-------|--------|
| All section symbols catalogued | PASS — 13 unique symbols, all occurrences mapped |
| Other consumers checked | PASS — 6 packages + 1 app checked, all clean |
| tsconfig reviewed | PASS — validators (no aliases), db (has validators alias, needs blocks alias) |
| Test files identified | PASS — 2 test files: registry.test.ts (21 fixture changes), mappers.test.ts (5 fixture changes) |
| No packages/blocks/ yet | PASS — confirmed does not exist |
| No logs/wp-005a/ yet | PASS — created during this phase |
| queries/themes.ts clean | PASS — no section field references |
| editor-sidebar.tsx clean | PASS — only ThemeFormData type import |
| mappers.ts clean | PASS — pass-through, no field access |

---

## Summary Counts

- **Symbols to rename:** 13 distinct symbols
- **Files to delete/move:** 14 (12 schemas + index + test)
- **Files to modify:** 8 (theme.ts, validators/index.ts, db/types.ts, db/index.ts, mappers.test.ts, theme-editor.tsx, form-defaults.ts, validators/tsconfig.json or db/tsconfig.json)
- **New package to create:** 1 (packages/blocks/)
- **Fixture `{ type: ... }` -> `{ block: ... }` occurrences:** 26 total (21 in registry.test.ts + 5 in mappers.test.ts)
- **Consumers affected:** 2 apps files (studio), 5 package files (validators + db)
- **Zero unexpected consumers**
