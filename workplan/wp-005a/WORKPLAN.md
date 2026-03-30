# WP-005A: Block Library Foundation

> Create `packages/blocks/` — migrate section schemas, rename `type` → `block`, generate first 5 blocks from Figma, template registry.

**Status:** PLANNING
**Priority:** P0 — Critical path (005B/C/D all depend on this)
**Prerequisites:** WP-004 ✅ (section model in DB + section registry + Studio page builder)
**Milestone:** WP-005 Part 1 of 4
**Estimated effort:** 12–16 hours across 5 phases
**Created:** 2026-03-30
**Completed:** —

---

## Problem Statement

WP-004 built the section-driven data model: `meta` + `sections[]` + `seo` in Supabase, a section registry with 12 Zod schemas, and a Studio page builder with useFieldArray. But "section" is an abstract concept — `{ type: "feature-grid", data: {...} }` has no visual identity. The type `feature-grid` could look 10 different ways.

ADR-009 V4 redefines this: a **block** is a specific visual component from Figma — concrete HTML+CSS, not an abstract type. Block Library (`packages/blocks/`) becomes the single source of truth: schemas live there, .astro templates live there, preview thumbnails live there. Portal imports .astro for rendering. Studio imports schemas for form generation + previews for the picker.

This WP creates that package, migrates existing schemas into it, renames `type` → `block` across the codebase, generates the first 5 core blocks from Figma, and establishes the template registry.

---

## Solution Overview

### Architecture

```
packages/validators/src/sections/   ← CURRENT: 12 schema files + registry
                │
                │  WP-005A migrates
                ▼
packages/blocks/                     ← NEW: Block Library
├── src/
│   ├── registry.ts                  — BLOCK_REGISTRY, BlockRegistryEntry
│   ├── templates/                   — Template presets (business, portfolio...)
│   └── {block-id}/                  — Per-block: schema, defaults, meta, preview, .astro
│       ├── schema.ts
│       ├── defaults.ts
│       ├── meta.ts
│       ├── preview.png              ← From Figma export
│       └── block.astro              ← From Figma → Claude Code pipeline
│
├── consumed by:
│   ├── apps/portal/ (Astro)         → imports block.astro for rendering
│   └── apps/studio/ (Vite React)    → imports schema, defaults, meta, preview for picker + forms
│
├── packages/validators/             → imports blockIdEnum from blocks for themeSchema
└── packages/db/                     → ThemeSection.type → ThemeSection.block
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Keep current block IDs | `theme-hero`, `feature-grid`, etc. stay as-is | Only 1 variant per type now. New IDs (hero-carousel-v1) when multiple variants exist | Rename all IDs now (premature — no second variants yet) |
| Schemas move to packages/blocks/ | Each block owns its schema.ts | Single source of truth per block. ADR-023 spec. | Keep in validators (two packages to sync) |
| validators imports from blocks | `blockIdEnum` defined in blocks, consumed by validators themeSchema | Blocks = owner of block IDs. validators = consumer. | Duplicate enum (drift risk) |
| Field rename `type` → `block` | `ThemeSection.block: BlockId` | ADR-009 V4: block = specific visual unit, not abstract type | Keep `type` (confusing — type ≠ block semantically) |
| Block previews = Figma export | preview.png per block from `Figma:get_screenshot` | Simplest. Story Builder screenshots = later | Storybook screenshots (need Storybook setup first) |

---

## What This Changes

### New Files

```
packages/blocks/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                        — barrel exports
│   ├── registry.ts                     — BLOCK_REGISTRY, BLOCK_IDS, BLOCK_CATEGORIES, etc.
│   ├── types.ts                        — BlockId, BlockRegistryEntry, BlockMeta
│   ├── templates/
│   │   ├── index.ts                    — TEMPLATE_REGISTRY
│   │   └── business.ts                 — default template for business themes
│   │
│   ├── theme-hero/                     — block (reuses current schema)
│   │   ├── schema.ts                   — moved from validators/sections/theme-hero.ts
│   │   ├── defaults.ts                 — extracted from schema file
│   │   ├── meta.ts                     — { label, category, description, figmaFrame }
│   │   ├── preview.png                 — Figma export
│   │   ├── markdown.ts                 — toMarkdown() for triple output
│   │   └── block.astro                 — HTML+CSS from Figma (Phase 3)
│   │
│   ├── feature-grid/                   — same structure
│   ├── plugin-comparison/              — same structure
│   ├── trust-strip/                    — same structure
│   ├── related-themes/                 — same structure
│   ├── before-after/                   — stub (schema + defaults + meta only, no .astro yet)
│   ├── video-demo/                     — stub
│   ├── testimonials/                   — stub
│   ├── faq/                            — stub
│   ├── cta-banner/                     — stub
│   ├── stats-counter/                  — stub
│   └── resource-sidebar/              — stub
```

### Modified Files

```
packages/db/src/types.ts                — SectionType → BlockId, ThemeSection.type → .block
packages/db/src/index.ts                — export rename
packages/db/src/mappers.ts              — sections pass-through (field name change if typed)
packages/db/src/__tests__/mappers.test.ts — update fixtures

packages/validators/src/theme.ts        — sectionTypeEnum → blockIdEnum (imported from blocks), sectionSchema.type → .block
packages/validators/src/index.ts        — re-export block registry from packages/blocks
packages/validators/src/sections/       — DELETED (moved to packages/blocks/)

apps/studio/src/pages/theme-editor.tsx  — section.type → section.block, import paths
apps/studio/src/lib/form-defaults.ts    — getDefaultSections → getDefaultBlocks (or similar)

.context/CONVENTIONS.md                 — block library patterns
```

### Database Changes

```sql
-- No schema change. sections is jsonb — field name lives in JSON data.
-- With 0 rows in themes table: no data migration needed.
-- If rows existed: UPDATE themes SET sections = (transform type→block in each element)
```

---

## Implementation Phases

### Phase 0: RECON — Inventory of All type/section References (0.5–1h)

**Goal:** Exact list of every file + line that references `type` in section context, `SectionType`, `SECTION_REGISTRY`, `SECTION_LABELS`, `sectionTypeEnum`, `sectionSchema`, `getDefaultSections`, and `packages/validators/src/sections/` imports. This becomes the rename checklist.

**Tasks:**

0.1. **Grep section-related identifiers across monorepo**
```bash
# Type/Section references in packages
grep -rn "SectionType\|sectionTypeEnum\|SECTION_REGISTRY\|SECTION_LABELS\|SECTION_TYPES\|CORE_SECTION_TYPES\|SectionRegistryEntry\|getDefaultSections\|validateSectionData\|validateSections" packages/ --include="*.ts" --include="*.tsx"

# Section.type field references in Studio
grep -rn "section\.type\|\.type as Section\|field\.type\|sections\.\${.*}\.type" apps/studio/ --include="*.ts" --include="*.tsx"

# Import paths referencing validators/sections
grep -rn "from.*validators.*sections\|from.*sections/" packages/ apps/ --include="*.ts" --include="*.tsx"

# sectionSchema references
grep -rn "sectionSchema\|sectionsSchema" packages/ apps/ --include="*.ts" --include="*.tsx"
```

0.2. **Count files in validators/sections/**
```bash
ls -la packages/validators/src/sections/
# 13 files (index + 12 types) + __tests__
```

0.3. **Check if packages/blocks/ already exists**
```bash
ls packages/blocks/ 2>/dev/null || echo "Does not exist — expected"
```

0.4. **Document full inventory**

**Verification:** Inventory at `logs/wp-005a/phase-0-result.md` with every reference catalogued.

---

### Phase 1: Create packages/blocks/ + Migrate Schemas (2–3h)

**Goal:** `packages/blocks/` exists as an npm workspace package. All 12 block schemas moved from `packages/validators/src/sections/` to `packages/blocks/src/{block-id}/schema.ts`. Block Registry replaces Section Registry. validators/sections/ directory deleted. packages/validators imports blockIdEnum from packages/blocks.

**Tasks:**

1.1. **Create packages/blocks/ scaffold**
- `package.json` (name: `@cmsmasters/blocks`, deps: zod)
- `tsconfig.json` (noEmit, bundler resolution, jsx: react-jsx)
- `src/index.ts` — barrel
- `src/types.ts` — `BlockId` type, `BlockRegistryEntry` interface, `BlockMeta` interface
- `src/registry.ts` — `BLOCK_REGISTRY`, derived constants

1.2. **Create per-block directories with migrated schemas**
For each of the 12 blocks:
- Create `src/{block-id}/schema.ts` — move Zod schema from `validators/sections/{block-id}.ts`
- Create `src/{block-id}/defaults.ts` — extract defaults (currently inline in section files)
- Create `src/{block-id}/meta.ts` — `{ label, category, description }`
- `block.astro`, `preview.png`, `markdown.ts` — placeholder/empty for now (Phase 3 fills core 5)

1.3. **Build Block Registry**
```typescript
// packages/blocks/src/registry.ts
export const BLOCK_REGISTRY: Record<BlockId, BlockRegistryEntry> = {
  'theme-hero': { schema, defaults, meta },
  'feature-grid': { schema, defaults, meta },
  // ...all 12
}
export const BLOCK_IDS = Object.keys(BLOCK_REGISTRY) as BlockId[]
export const BLOCK_LABELS = ...
export const CORE_BLOCK_IDS: BlockId[] = ['theme-hero', 'feature-grid', 'plugin-comparison', 'trust-strip', 'related-themes']
export function getDefaultBlocks() { ... }  // replaces getDefaultSections
export function validateBlockData(block) { ... }
export function validateBlocks(blocks[]) { ... }
```

1.4. **Wire packages/blocks into monorepo**
- Add to root `package.json` workspaces
- Add `@cmsmasters/blocks` as dep of `@cmsmasters/validators` and `@cmsmasters/db`
- Verify `npx tsc --noEmit --project packages/blocks/tsconfig.json` — 0 errors

1.5. **Update packages/validators**
- `theme.ts`: import `blockIdEnum` from `@cmsmasters/blocks` instead of local `sectionTypeEnum`
- `index.ts`: re-export block registry from `@cmsmasters/blocks` (so Studio can import from either)
- Delete `src/sections/` directory entirely (schemas moved to blocks)
- Verify validators compile

1.6. **Update packages/db**
- `types.ts`: keep `SectionType` as alias for now (Phase 2 renames it)
- Add `@cmsmasters/blocks` to deps if needed for type imports
- Verify db compiles

**Verification:**
```bash
npx tsc --noEmit --project packages/blocks/tsconfig.json  # 0 errors
npx tsc --noEmit --project packages/validators/tsconfig.json  # 0 errors
npx tsc --noEmit --project packages/db/tsconfig.json  # 0 errors
ls packages/validators/src/sections/  # should not exist
ls packages/blocks/src/theme-hero/schema.ts  # should exist
```

---

### Phase 2: Rename `type` → `block` Across Codebase (2–3h)

**Goal:** Field `ThemeSection.type` becomes `ThemeSection.block`. All types, validators, registries, Studio references updated. `SectionType` → `BlockId`. `sectionSchema` → `blockSchema`. `SECTION_*` → `BLOCK_*`. Monorepo compiles. Round-trip test passes.

**Tasks:**

2.1. **packages/db/src/types.ts**
- `SectionType` → `BlockId` (keep both as aliases during transition, or rename fully)
- `ThemeSection { type: SectionType }` → `ThemeSection { block: BlockId }`
- Update `Database.themes.Row/Insert/Update` types accordingly
- Update exports in `index.ts`

2.2. **packages/blocks/**
- Already uses `BlockId` from Phase 1. Verify `BLOCK_REGISTRY` key type matches.

2.3. **packages/validators/src/theme.ts**
- `sectionTypeEnum` → `blockIdEnum` (or import renamed from blocks)
- `sectionSchema = z.object({ type: ... })` → `blockSchema = z.object({ block: ... })`
- `sectionsSchema` → `blocksSchema` (or keep name, just change inner field)
- `themeSchema.sections` uses updated schema
- Update exports in `index.ts`

2.4. **packages/db/src/mappers.ts**
- `themeRowToFormData`: sections pass-through — but if typed, field name in ThemeSection changed
- `formDataToThemeInsert`: same
- Update `mappers.test.ts` fixtures: `{ type: 'theme-hero' }` → `{ block: 'theme-hero' }`

2.5. **apps/studio/src/pages/theme-editor.tsx**
- All `section.type` → `section.block` references
- `SECTION_LABELS[field.type as SectionType]` → `BLOCK_LABELS[field.block as BlockId]`
- Import changes: `SECTION_*` → `BLOCK_*`, `SectionType` → `BlockId`
- `SectionEditor` switch: `case 'theme-hero':` stays (block IDs unchanged)
- `SectionsList` component: `field.type` → `field.block`

2.6. **apps/studio/src/lib/form-defaults.ts**
- `getDefaultSections()` import → `getDefaultBlocks()` from `@cmsmasters/blocks`
- Or re-export through validators

2.7. **Re-run round-trip test**
- Update `packages/db/src/__tests__/mappers.test.ts` fixtures
- `npx tsx packages/db/src/__tests__/mappers.test.ts` — all pass

2.8. **Structural proof**
- Grep from Phase 0 re-run: 0 matches for old names in runtime code

**Verification:**
```bash
npx tsc --noEmit  # entire monorepo (excluding known pre-existing auth errors)
npx tsx packages/db/src/__tests__/mappers.test.ts  # round-trip passes
grep -rn "SectionType\|SECTION_REGISTRY\|SECTION_LABELS\|sectionTypeEnum\|\.type as Section\|section\.type" packages/ apps/studio/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "\.md"
# Expected: 0 matches in runtime code (only in logs/workplan docs)
```

---

### Phase 3: Figma → 5 Core Blocks + Template Registry (3–5h)

**Goal:** First 5 core blocks have real `.astro` files from Figma, preview.png thumbnails, filled meta.ts, and markdown.ts. Template registry has `business` template. The Figma → Block pipeline is proven.

**Tasks:**

3.1. **Identify Figma frames for 5 core blocks**
- Use `Figma:get_design_context` on the Portal design file to locate frames for:
  - Hero section (carousel + name + tagline + CTAs)
  - Feature grid (3-column with icons)
  - Plugin comparison (table + value calculator)
  - Trust strip (badges + stats)
  - Related themes (theme card grid)
- Document frame IDs for each

3.2. **Generate block.astro for each core block**
For each of the 5 blocks:
- Read Figma frame via `Figma:get_design_context` or `Figma:get_screenshot`
- Generate `.astro` component: HTML structure from Figma + scoped CSS + props interface
- Semantic HTML: `<section>`, `<article>`, `<h2>`/`<h3>`, `aria-label`, proper heading hierarchy
- CSS: scoped styles from Figma design tokens (colors, spacing, typography)
- Props: match the Zod schema fields (headline, features[], plugins[], etc.)

3.3. **Generate preview.png for each core block**
- `Figma:get_screenshot` for each frame → save as `preview.png` in block directory
- 480×320px recommended

3.4. **Fill meta.ts for each core block**
- label, category (hero/features/social-proof/cta), description, figmaFrame reference

3.5. **Create markdown.ts for each core block**
- `toMarkdown(data, meta?)` function per block
- Hero → `# {name}\n\n{tagline}`
- Feature grid → `## Features\n\n- **{title}** — {description}`
- Plugin comparison → `## Included Plugins\n\n| Plugin | Value |`
- Trust strip → `## Trust & Recognition\n\n{badges}`
- Related themes → `## Related Themes\n\n{list}`

3.6. **Create template registry**
- `packages/blocks/src/templates/business.ts` — default blocks for business themes
- `packages/blocks/src/templates/index.ts` — TEMPLATE_REGISTRY
- Update `form-defaults.ts` to use business template for new themes

3.7. **Verify block.astro files are valid Astro syntax**
```bash
# Syntax check (Astro doesn't have standalone type-check, but we verify structure)
for f in packages/blocks/src/*/block.astro; do
  echo "Checking $f..."
  head -5 "$f"  # Should start with --- frontmatter
done
```

**Verification:**
```bash
# All 5 core blocks have .astro files
ls packages/blocks/src/theme-hero/block.astro
ls packages/blocks/src/feature-grid/block.astro
ls packages/blocks/src/plugin-comparison/block.astro
ls packages/blocks/src/trust-strip/block.astro
ls packages/blocks/src/related-themes/block.astro

# All 5 have preview.png
ls packages/blocks/src/*/preview.png | wc -l  # ≥ 5

# All 5 have filled meta.ts
grep -l "category:" packages/blocks/src/*/meta.ts | wc -l  # ≥ 5

# Template registry exists
grep "business" packages/blocks/src/templates/index.ts

# TypeScript compiles
npx tsc --noEmit --project packages/blocks/tsconfig.json
```

---

### Phase 4: Documentation Update (0.5–1h)

**Goal:** All docs reflect Block Library, `type` → `block` rename, Figma pipeline.

**Tasks:**

4.1. **CC reads all phase logs**
4.2. **CC proposes doc updates**
4.3. **Brain approves**
4.4. **CC executes doc updates**
4.5. **Link source logs**
4.6. **Update WP status** — mark WP-005A as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — Block Library exists, `packages/blocks/`, block IDs
- `.context/CONVENTIONS.md` — block file structure, block naming, Figma → block pipeline, `type` → `block`
- `.context/ROADMAP.md` — Layer 2 uses Block Library for rendering
- `workplan/WP-005-full-section-architecture.md` — Part 1 done
- `workplan/SPRINT_MVP_SLICE.md` — WP-005A status
- `logs/wp-005a/phase-*-result.md` — must exist

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Circular dependency blocks↔validators | Build fails | validators imports `blockIdEnum` from blocks. blocks imports `z` from zod. No cycle. Use `import type` where possible. |
| Figma frames don't match expected structure | .astro generation fails or looks wrong | Phase 3.1 identifies frames first. Manual review every generated block. |
| `type` → `block` rename misses a reference | Runtime error (field undefined) | Phase 0 RECON inventory + Phase 2 structural grep proof. Same approach as WP-004 Phase 3. |
| .astro files invalid syntax | Portal (005B) can't import | Phase 3.7 syntax check. Astro files are simple HTML+CSS with props — low complexity. |
| 7 stub blocks have no .astro | Incomplete library | Expected — stubs get .astro in future WPs when Figma designs exist. Registry marks them as stub. |
| packages/blocks/ not resolved by Nx | Import errors at build time | Phase 1.4 wires workspace. Test import early before doing rename. |
| Studio breaks after rename | Editor unusable | Phase 2 is mechanical rename (like WP-004 Phase 3). tsc catches all type errors. |

---

## Acceptance Criteria (Definition of Done)

- [ ] `packages/blocks/` exists as workspace package with registry, types, 12 block directories
- [ ] Each block directory has: `schema.ts`, `defaults.ts`, `meta.ts` (migrated from validators/sections/)
- [ ] 5 core blocks additionally have: `block.astro`, `preview.png`, `markdown.ts`
- [ ] 7 stub blocks have schema + defaults + meta only (no .astro yet — explicitly marked as stub)
- [ ] `BLOCK_REGISTRY` has 12 entries, `BLOCK_IDS` derived from keys
- [ ] `CORE_BLOCK_IDS` = 5 core blocks
- [ ] `getDefaultBlocks()` returns 5 core blocks with defaults
- [ ] Template registry has `business` template
- [ ] `packages/validators/src/sections/` directory **deleted**
- [ ] `ThemeSection.type` → `ThemeSection.block` everywhere
- [ ] `SectionType` → `BlockId` everywhere
- [ ] `sectionTypeEnum` → `blockIdEnum` everywhere
- [ ] `SECTION_REGISTRY` → `BLOCK_REGISTRY` everywhere
- [ ] Zero references to old names in runtime code (logs/workplan OK)
- [ ] `npx tsc --noEmit` — 0 new errors (pre-existing auth errors OK)
- [ ] Round-trip mapper test passes with `{ block: 'theme-hero' }` shape
- [ ] All phases logged in `logs/wp-005a/`
- [ ] `.context/` docs updated (Phase 4)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-004 (section model + registry + Studio page builder) | ✅ DONE | All phases |
| Figma design file with block frames | 🟡 Exists (key: PodaGqhhlgh6TLkcyAC5Oi) | Phase 3 — need specific frame IDs |
| Nx workspace resolution | ✅ Working | Phase 1 — new package must resolve |

---

## Notes

- **Block IDs stay as-is for now.** `theme-hero`, `feature-grid`, etc. When second variant of same block type appears (e.g. `hero-minimal-v1`), then we introduce variant naming. No premature rename.
- **validators/sections/ is DELETED, not deprecated.** Clean cut. Everything moves to packages/blocks/. validators imports what it needs from blocks.
- **Phase 3 depends on Figma MCP.** If Figma frames aren't findable or MCP fails, Phase 3 can generate .astro files manually from the screenshot reference. The pipeline is "Figma → Claude → .astro", whether automated or prompted.
- **Preview thumbnails** are Figma exports for now. When Storybook is set up, they can be replaced with Storybook screenshots (richer, shows with real data).
- **Stub blocks** (7 without .astro) are valid in the registry — they just can't render on Portal yet. Studio can still add them to sections[] and save data. Portal skips unknown blocks gracefully.
- **This WP unblocks 005B (Astro Portal), 005C (Studio Assembler), 005D (Content Pipeline)** — all three consume packages/blocks/.
