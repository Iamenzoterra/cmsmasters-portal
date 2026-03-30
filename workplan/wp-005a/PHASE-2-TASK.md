# WP-005A Phase 2: Rename `type` → `block` Across Codebase

> Workplan: WP-005A Block Library Foundation
> Phase: 2 of 4
> Priority: P0
> Estimated: 2–3 hours
> Type: Full-stack (types + validators + Studio rename)
> Previous: Phase 1 ✅ (packages/blocks/ created, schemas migrated, compat bridge works)
> Next: Phase 3 (Figma → 5 Core Blocks + Template Registry)

---

## Context

Phase 1 created `packages/blocks/` with the canonical `{ block: BlockId }` shape. A compat bridge (`validators/src/sections.ts`) maps `{ block }` → `{ type }` so Studio still compiles with legacy names. Now we complete the migration: every consumer switches to canonical names, the `.type` field becomes `.block`, and the compat bridge is deleted.

**Phase 1 actual state** (from `logs/wp-005a/phase-1-result.md`):

```
packages/blocks/src/registry.ts:
  getDefaultBlocks() → returns { block: BlockId, data: ... }[]     ✅ canonical
  validateBlockData() → accepts both { type } and { block }        ✅ dual-accept

packages/validators/src/sections.ts:
  getDefaultSections() → maps { block } → { type }                 🔸 compat bridge (DELETE this phase)

packages/validators/src/theme.ts:
  sectionTypeEnum = blockIdEnum  (alias)                            🔸 rename
  sectionSchema = z.object({ type: sectionTypeEnum, ... })          🔸 rename to { block }
  sectionsSchema = z.array(sectionSchema)                           🔸 rename

packages/db/src/types.ts:
  SectionType = union of 12 strings                                 🔸 replace with BlockId import
  ThemeSection { type: SectionType, data: ... }                     🔸 rename to ThemeBlock { block: BlockId }
  Database.themes.Row/Insert/Update.sections: ThemeSection[]        🔸 → ThemeBlock[]

packages/db/src/index.ts:
  exports SectionType, ThemeSection                                 🔸 → BlockId, ThemeBlock

packages/db/src/mappers.ts:
  passes sections through (no field access)                         ✅ no code change needed

apps/studio/src/pages/theme-editor.tsx:
  imports SectionType from @cmsmasters/db                           🔸 → BlockId
  imports SECTION_LABELS, CORE_SECTION_TYPES, SECTION_REGISTRY      🔸 → BLOCK_*
  uses field.type, section.type throughout                          🔸 → field.block, section.block

apps/studio/src/lib/form-defaults.ts:
  imports getDefaultSections from @cmsmasters/validators            🔸 → getDefaultBlocks
```

**Important:** 0 rows in themes table → no data migration. The JSON shape change (`{ type }` → `{ block }`) only affects TypeScript types and new data going forward.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 1 is done — compat bridge exists
cat packages/validators/src/sections.ts | head -2
# Expected: "// Backward-compat bridge"

# 2. Confirm canonical shape in blocks
grep "block:" packages/blocks/src/registry.ts | head -3
# Expected: getDefaultBlocks returns { block, data }

# 3. Baseline tsc — all packages compile before changes
npx tsc --noEmit --project packages/blocks/tsconfig.json 2>&1 | tail -3
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 | tail -3
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 | tail -3

# 4. Run all 3 tests — baseline before changes
npx tsx --tsconfig packages/blocks/tsconfig.json packages/blocks/src/__tests__/registry.test.ts 2>&1 | tail -3
npx tsx --tsconfig packages/validators/tsconfig.json packages/validators/src/__tests__/sections-compat.test.ts 2>&1 | tail -3
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 | tail -3

# 5. Count all legacy references that must die
grep -rn "SectionType\|ThemeSection\|section\.type\|field\.type\|SECTION_REGISTRY\|SECTION_LABELS\|CORE_SECTION_TYPES\|getDefaultSections\|sectionTypeEnum\|sectionSchema\|sectionsSchema\|validateSectionData\|validateSections\|SectionRegistryEntry" packages/validators/src/ packages/db/src/ apps/studio/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "__tests__" | wc -l
```

**Document your findings before writing any code.**

---

## Task 2.1: Rename packages/db/src/types.ts

Replace `SectionType` union and `ThemeSection` interface with `BlockId` import and `ThemeBlock`.

### Changes to make

**Replace** the `SectionType` union (lines ~27-39) and `ThemeSection` interface (lines ~41-44) with:

```typescript
// ── Block types (stored in themes.sections jsonb array) ──

import type { BlockId } from '@cmsmasters/blocks'

export type { BlockId }

export interface ThemeBlock {
  block: BlockId
  data: Record<string, unknown>
}
```

**Update** all `ThemeSection` references in the `Database` type to `ThemeBlock`:

- `themes.Row.sections: ThemeSection[]` → `sections: ThemeBlock[]`
- `themes.Insert.sections?: ThemeSection[]` → `sections?: ThemeBlock[]`
- `themes.Update.sections?: ThemeSection[]` → `sections?: ThemeBlock[]`

**Update** the `Theme` convenience alias comment (the type itself derives from `Database` so no code change there).

**Keep** the `SectionType` export as a **deprecated alias** for one phase to avoid breaking anything we might have missed:

```typescript
/** @deprecated Use BlockId from @cmsmasters/blocks */
export type SectionType = BlockId

/** @deprecated Use ThemeBlock */
export interface ThemeSection {
  type: SectionType
  data: Record<string, unknown>
}
```

Wait — actually NO. Clean cut per WP plan. Since RECON confirmed zero external consumers, remove `SectionType` and `ThemeSection` completely. If something breaks, tsc will catch it.

---

## Task 2.2: Update packages/db/src/index.ts

Replace legacy exports with canonical names:

```typescript
export { createClient } from './client'
export type { SupabaseClient } from './client'

export type {
  Database,
  UserRole,
  ThemeStatus,
  LicenseType,
  ThemeMeta,
  BlockId,
  ThemeBlock,
  ThemeSEO,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Theme,
  ThemeInsert,
  ThemeUpdate,
  License,
  LicenseInsert,
  AuditEntry,
  AuditEntryInsert,
} from './types'

export { themeRowToFormData, formDataToThemeInsert } from './mappers'
export { getThemes, getThemeBySlug, upsertTheme } from './queries/themes'
export { getProfile, updateProfile } from './queries/profiles'
export { logAction } from './queries/audit'
```

Removed: `SectionType`, `ThemeSection`. Added: `BlockId`, `ThemeBlock`.

---

## Task 2.3: packages/db/src/mappers.ts — NO code changes needed

`mappers.ts` does `sections: row.sections ?? []` and `sections: form.sections` — pure pass-through. When `ThemeSection` → `ThemeBlock` and `ThemeFormData.sections` shape changes, the mapper still just passes the array. TypeScript will type-check the assignment automatically.

**Verify** it compiles after types.ts changes — that's the only check needed.

---

## Task 2.4: Rewrite packages/validators/src/theme.ts

Rename all schema identifiers from `section*` to `block*`. The `.type` field becomes `.block`.

```typescript
import { z } from 'zod'
import { blockIdEnum } from '@cmsmasters/blocks'

// Re-export for consumers that import from validators
export { blockIdEnum }

// ── Meta schema ──

export const metaSchema = z.object({
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional().default(''),
  description: z.string().optional().default(''),
  category: z.string().optional().default(''),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_url: z.string().url().optional().or(z.literal('')).default(''),
  themeforest_id: z.string().optional().default(''),
  thumbnail_url: z.string().optional().default(''),
  preview_images: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).optional(),
  sales: z.number().int().min(0).optional(),
  compatible_plugins: z.array(z.string()).default([]),
  trust_badges: z.array(z.string()).default([]),
  resources: z.object({
    public: z.array(z.string()).default([]),
    licensed: z.array(z.string()).default([]),
    premium: z.array(z.string()).default([]),
  }).default({ public: [], licensed: [], premium: [] }),
})

// ── SEO schema ──

export const seoSchema = z.object({
  title: z.string().max(70).optional().default(''),
  description: z.string().max(160).optional().default(''),
})

// ── Block schema (permissive data for form binding) ──
// Per-block data validation uses validateBlocks() from @cmsmasters/blocks at save boundary.

export const blockSchema = z.object({
  block: blockIdEnum,
  data: z.record(z.string(), z.unknown()),
})

export const blocksSchema = z.array(blockSchema).default([])

// ── Top-level theme form schema (nested — mirrors DB shape) ──

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  meta: metaSchema,
  sections: blocksSchema,
  seo: seoSchema,
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
```

**Key changes:**
- `sectionTypeEnum` → removed (just export `blockIdEnum` directly)
- `sectionSchema` → `blockSchema`, field `.type` → `.block`
- `sectionsSchema` → `blocksSchema`
- `themeSchema.sections` now uses `blocksSchema`
- `ThemeFormData.sections[n]` now has `.block` instead of `.type`

---

## Task 2.5: Rewrite packages/validators/src/index.ts

Remove all legacy names. Export only canonical names.

```typescript
// ── Theme schemas ──
export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockSchema,
  blocksSchema,
  blockIdEnum,
} from './theme'
export type { ThemeFormData } from './theme'

// ── Block Library (canonical re-exports from @cmsmasters/blocks) ──
export {
  BLOCK_REGISTRY,
  BLOCK_META,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from '@cmsmasters/blocks'
export type { BlockId, BlockRegistryEntry, BlockMeta } from '@cmsmasters/blocks'

// Core block data types (for typed block editors in Studio)
export { themeHeroDataSchema, type ThemeHeroData } from '@cmsmasters/blocks'
export { featureGridDataSchema, type FeatureGridData } from '@cmsmasters/blocks'
export { pluginComparisonDataSchema, type PluginComparisonData } from '@cmsmasters/blocks'
export { trustStripDataSchema, type TrustStripData } from '@cmsmasters/blocks'
export { relatedThemesDataSchema, type RelatedThemesData } from '@cmsmasters/blocks'
```

**Removed:** `sectionTypeEnum`, `sectionSchema`, `sectionsSchema`, `SECTION_REGISTRY`, `SECTION_LABELS`, `CORE_SECTION_TYPES`, `SECTION_TYPES`, `getDefaultSections`, `validateSectionData`, `validateSections`, `SectionRegistryEntry`.

---

## Task 2.6: Delete compat bridge and its test

```bash
rm packages/validators/src/sections.ts
rm packages/validators/src/__tests__/sections-compat.test.ts
```

---

## Task 2.7: Update apps/studio/src/lib/form-defaults.ts

```typescript
import type { ThemeFormData } from '@cmsmasters/validators'
import { getDefaultBlocks } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * Plain typed literal — no themeSchema.parse() (slug/name min constraints would throw).
 * Sections from getDefaultBlocks() (canonical block registry source).
 */
export function getDefaults(): ThemeFormData {
  return {
    slug: '',
    meta: {
      name: '',
      tagline: '',
      description: '',
      category: '',
      demo_url: '',
      themeforest_url: '',
      themeforest_id: '',
      thumbnail_url: '',
      preview_images: [],
      compatible_plugins: [],
      trust_badges: [],
      resources: { public: [], licensed: [], premium: [] },
    },
    sections: getDefaultBlocks(),
    seo: { title: '', description: '' },
    status: 'draft',
  }
}

/**
 * Auto-generate slug from name (kebab-case).
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
}
```

**Changes:** `getDefaultSections` → `getDefaultBlocks`. Return shape now has `{ block, data }` instead of `{ type, data }` — matches new `ThemeFormData`.

---

## Task 2.8: Update apps/studio/src/pages/theme-editor.tsx

This is the largest file change. All occurrences are mechanical renames. Here is the complete list of changes:

### Import changes (top of file)

**Replace:**
```typescript
import { SECTION_LABELS, CORE_SECTION_TYPES, SECTION_REGISTRY } from '@cmsmasters/validators'
import type { SectionType } from '@cmsmasters/db'
```

**With:**
```typescript
import { BLOCK_LABELS, CORE_BLOCK_IDS, BLOCK_REGISTRY } from '@cmsmasters/validators'
import type { BlockId } from '@cmsmasters/db'
```

### SectionsList component — props interface

**Replace:**
```typescript
interface SectionsListProps {
  fields: Array<{ id: string; type: string; data: Record<string, unknown> }>
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
  onRemove: (index: number) => void
  onSwap: (a: number, b: number) => void
  onAppend: (type: SectionType) => void
}
```

**With:**
```typescript
interface SectionsListProps {
  fields: Array<{ id: string; block: string; data: Record<string, unknown> }>
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
  onRemove: (index: number) => void
  onSwap: (a: number, b: number) => void
  onAppend: (block: BlockId) => void
}
```

### SectionsList — field.type → field.block

Inside `SectionsList` component, find every `field.type` and replace with `field.block`:

```typescript
// Label display
{BLOCK_LABELS[field.block as BlockId] ?? field.block}

// Section editor
<SectionEditor index={index} type={field.block as BlockId} control={control} register={register} />
```

### SectionsList — onAppend call and picker buttons

**Replace:**
```typescript
{CORE_SECTION_TYPES.map((type) => (
  <button
    key={type}
    type="button"
    onClick={() => { onAppend(type); setShowPicker(false) }}
    ...
  >
    {SECTION_LABELS[type]}
  </button>
))}
```

**With:**
```typescript
{CORE_BLOCK_IDS.map((blockId) => (
  <button
    key={blockId}
    type="button"
    onClick={() => { onAppend(blockId); setShowPicker(false) }}
    ...
  >
    {BLOCK_LABELS[blockId]}
  </button>
))}
```

### ThemeEditor — sectionsArray.append callback

**Replace:**
```typescript
onAppend={(type: SectionType) => {
  const entry = SECTION_REGISTRY[type]
  sectionsArray.append({ type, data: { ...entry.defaultData } })
}}
```

**With:**
```typescript
onAppend={(block: BlockId) => {
  const entry = BLOCK_REGISTRY[block]
  sectionsArray.append({ block, data: { ...entry.defaultData } })
}}
```

### SectionEditor — type prop

The `SectionEditor` component receives `type` as a prop. The prop name `type` can stay (it's a prop name, not a data field) but for consistency rename it:

**Replace:**
```typescript
function SectionEditor({ index, type, control, register }: { index: number; type: SectionType; control: Control<ThemeFormData>; register: UseFormRegister<ThemeFormData> }) {
  switch (type) {
    case 'theme-hero': {
      return <HeroEditor index={index} control={control} register={register} />
    }
    ...
  }
}
```

**With:**
```typescript
function SectionEditor({ index, block, control, register }: { index: number; block: BlockId; control: Control<ThemeFormData>; register: UseFormRegister<ThemeFormData> }) {
  switch (block) {
    case 'theme-hero': {
      return <HeroEditor index={index} control={control} register={register} />
    }
    ...
  }
}
```

And update the call site:
```typescript
<SectionEditor index={index} block={field.block as BlockId} control={control} register={register} />
```

### Summary of all renames in theme-editor.tsx

| Old | New | Count |
|-----|-----|-------|
| `SectionType` (import + usages) | `BlockId` | ~6 |
| `SECTION_LABELS` | `BLOCK_LABELS` | ~3 |
| `CORE_SECTION_TYPES` | `CORE_BLOCK_IDS` | ~1 |
| `SECTION_REGISTRY` | `BLOCK_REGISTRY` | ~1 |
| `field.type as SectionType` | `field.block as BlockId` | ~2 |
| `field.type` (label display) | `field.block` | ~1 |
| `onAppend: (type: SectionType)` | `onAppend: (block: BlockId)` | ~1 |
| `{ type, data: ... }` in append | `{ block, data: ... }` | ~1 |
| `SectionEditor type prop` | `SectionEditor block prop` | ~3 |

---

## Task 2.9: Update packages/db/src/__tests__/mappers.test.ts

### Import change

**Replace:**
```typescript
import { sectionSchema } from '@cmsmasters/validators'
```

**With:**
```typescript
import { blockSchema } from '@cmsmasters/validators'
```

### Fixture changes — { type: ... } → { block: ... }

**In filledRow** (Scenario 2), replace sections array:
```typescript
sections: [
  { block: 'theme-hero', data: { headline: 'Build with Growth Hive', screenshots: ['s1.jpg'] } },
  { block: 'feature-grid', data: { features: [{ icon: '🚀', title: 'Fast', description: 'Blazing' }] } },
],
```

**In assertion** for sections[0]:
```typescript
assert('sections[0].block preserved', filledInsert.sections?.[0]?.block === 'theme-hero')
```
(was `sections[0].type`)

### Scenario 3 — BlockId enforcement

**Replace:**
```typescript
console.log('\n=== Scenario 3: SectionType Enforcement ===')

const validSection = sectionSchema.safeParse({ type: 'theme-hero', data: { headline: 'Hi' } })
assert('valid section type accepted', validSection.success)

const bogusSection = sectionSchema.safeParse({ type: 'bogus-type', data: {} })
assert('bogus section type rejected', !bogusSection.success)

const emptyType = sectionSchema.safeParse({ type: '', data: {} })
assert('empty string section type rejected', !emptyType.success)
```

**With:**
```typescript
console.log('\n=== Scenario 3: BlockId Enforcement ===')

const validBlock = blockSchema.safeParse({ block: 'theme-hero', data: { headline: 'Hi' } })
assert('valid block ID accepted', validBlock.success)

const bogusBlock = blockSchema.safeParse({ block: 'bogus-type', data: {} })
assert('bogus block ID rejected', !bogusBlock.success)

const emptyBlock = blockSchema.safeParse({ block: '', data: {} })
assert('empty string block ID rejected', !emptyBlock.success)
```

---

## Task 2.10: Update packages/blocks/src/__tests__/registry.test.ts

The canonical test already uses `{ block }` shape (confirmed in Phase 1 log: "33 passed, 0 failed"). But verify that `getDefaultBlocks()[0]` has `.block` not `.type` — the test from Phase 1 already asserts this. **No changes expected**, but confirm it still passes after all other changes.

---

## Files to Modify

| File | What changes |
|------|-------------|
| `packages/db/src/types.ts` | `SectionType` → `BlockId` import, `ThemeSection` → `ThemeBlock`, `.type` → `.block` |
| `packages/db/src/index.ts` | Remove `SectionType`, `ThemeSection` exports → add `BlockId`, `ThemeBlock` |
| `packages/validators/src/theme.ts` | `sectionTypeEnum` → `blockIdEnum`, `sectionSchema` → `blockSchema`, `.type` → `.block` |
| `packages/validators/src/index.ts` | Remove all `SECTION_*` / legacy exports → canonical `BLOCK_*` only |
| `apps/studio/src/pages/theme-editor.tsx` | ~20 renames: `SectionType` → `BlockId`, `SECTION_*` → `BLOCK_*`, `.type` → `.block` |
| `apps/studio/src/lib/form-defaults.ts` | `getDefaultSections` → `getDefaultBlocks` |
| `packages/db/src/__tests__/mappers.test.ts` | `sectionSchema` → `blockSchema`, `{ type: ... }` → `{ block: ... }` (5 occurrences) |

## Files to Delete

| File | Why |
|------|-----|
| `packages/validators/src/sections.ts` | Compat bridge — no longer needed |
| `packages/validators/src/__tests__/sections-compat.test.ts` | Tests for deleted compat bridge |

## Files NOT to modify

| File | Why |
|------|-----|
| `packages/db/src/mappers.ts` | Pass-through — no field access on section items |
| `packages/blocks/src/registry.ts` | Already canonical — `validateBlockData()` dual-accepts both shapes, stays as-is |
| `apps/studio/src/components/editor-sidebar.tsx` | Only imports `ThemeFormData` type — shape change is transparent |

---

## Acceptance Criteria

- [ ] Zero references to `SectionType` in `packages/db/src/` (grep proof)
- [ ] Zero references to `ThemeSection` in `packages/db/src/` (grep proof)
- [ ] Zero references to `sectionTypeEnum`, `sectionSchema`, `sectionsSchema` in `packages/validators/src/` (grep proof)
- [ ] Zero references to `SECTION_REGISTRY`, `SECTION_LABELS`, `CORE_SECTION_TYPES`, `getDefaultSections` in `apps/studio/src/` (grep proof)
- [ ] `packages/validators/src/sections.ts` does NOT exist
- [ ] `packages/validators/src/__tests__/sections-compat.test.ts` does NOT exist
- [ ] `ThemeFormData.sections[n]` has `.block` field, not `.type`
- [ ] `ThemeBlock` interface has `.block` field, not `.type`
- [ ] `blockSchema` validates `{ block: 'theme-hero', data: {...} }` (not `{ type: ... }`)
- [ ] `npx tsc --noEmit --project packages/blocks/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/validators/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/db/tsconfig.json` — 0 errors
- [ ] Registry test passes: `npx tsx packages/blocks/src/__tests__/registry.test.ts`
- [ ] Mapper test passes: `npx tsx packages/db/src/__tests__/mappers.test.ts`

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005A Phase 2 Verification ==="

# 1. Grep proof — zero legacy names in runtime code
echo "--- Legacy name check ---"

echo "packages/db/src/:"
grep -rn "SectionType\|ThemeSection" packages/db/src/ --include="*.ts" | grep -v node_modules | grep -v "__tests__" | grep -v "@deprecated"
echo "(expected: 0 matches)"

echo "packages/validators/src/:"
grep -rn "sectionTypeEnum\|sectionSchema\|sectionsSchema\|SECTION_REGISTRY\|SECTION_LABELS\|CORE_SECTION_TYPES\|SECTION_TYPES\|getDefaultSections\|validateSectionData\|validateSections\|SectionRegistryEntry" packages/validators/src/ --include="*.ts" | grep -v node_modules
echo "(expected: 0 matches)"

echo "apps/studio/src/:"
grep -rn "SectionType\|SECTION_REGISTRY\|SECTION_LABELS\|CORE_SECTION_TYPES\|getDefaultSections\|field\.type\|section\.type" apps/studio/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
echo "(expected: 0 matches)"

# 2. Compat bridge deleted
echo "--- Compat bridge deleted ---"
ls packages/validators/src/sections.ts 2>/dev/null && echo "❌ sections.ts still exists!" || echo "✅ sections.ts deleted"
ls packages/validators/src/__tests__/sections-compat.test.ts 2>/dev/null && echo "❌ compat test still exists!" || echo "✅ compat test deleted"

# 3. TypeScript compilation
echo "--- TypeScript compilation ---"
npx tsc --noEmit --project packages/blocks/tsconfig.json 2>&1 && echo "✅ blocks compiles" || echo "❌ blocks FAILED"
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 && echo "✅ validators compiles" || echo "❌ validators FAILED"
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 && echo "✅ db compiles" || echo "❌ db FAILED"

# 4. Tests
echo "--- Tests ---"
npx tsx --tsconfig packages/blocks/tsconfig.json packages/blocks/src/__tests__/registry.test.ts 2>&1 && echo "✅ registry test passed" || echo "❌ registry test FAILED"
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 && echo "✅ mapper test passed" || echo "❌ mapper test FAILED"

# 5. Shape proof — ThemeFormData sections have .block not .type
echo "--- Shape proof ---"
npx tsx --tsconfig packages/validators/tsconfig.json -e "
  import { blockSchema } from './packages/validators/src/theme';
  const valid = blockSchema.safeParse({ block: 'theme-hero', data: { headline: 'Hi' } });
  const invalid = blockSchema.safeParse({ type: 'theme-hero', data: { headline: 'Hi' } });
  console.log('  blockSchema({ block: ... }):', valid.success ? '✅ accepted' : '❌ rejected');
  console.log('  blockSchema({ type: ... }):', invalid.success ? '❌ should reject!' : '✅ correctly rejected');
" 2>&1

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-005a/phase-2-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005A Phase 2 — Rename type → block
> Epic: WP-005A Block Library Foundation
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually done}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| Zero legacy names in db/src/ | ✅/❌ |
| Zero legacy names in validators/src/ | ✅/❌ |
| Zero legacy names in studio/src/ | ✅/❌ |
| Compat bridge deleted | ✅/❌ |
| blocks tsc | ✅/❌ |
| validators tsc | ✅/❌ |
| db tsc | ✅/❌ |
| registry test | ✅/❌ |
| mapper test | ✅/❌ |
| blockSchema shape proof | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/db/ packages/validators/ apps/studio/ logs/wp-005a/
git commit -m "refactor: rename type→block across db, validators, studio [WP-005A phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Order matters**: modify db/types.ts FIRST → then validators/theme.ts → then validators/index.ts → delete sections.ts → then Studio files → then tests. This keeps tsc errors monotonically decreasing.
- **Do NOT modify `packages/blocks/src/registry.ts`** — `validateBlockData()` already dual-accepts `{ type }` and `{ block }` via the `'block' in section` check. Leave it as-is.
- **Do NOT modify `packages/db/src/mappers.ts`** — it's pass-through. TypeScript will verify it's still type-correct after the interface change.
- **If Studio tsc still has workspace resolution issues** (pre-existing from Phase 1), that's OK — document it as known gap. The important checks are blocks/validators/db tsc + both test suites.
- **Shape proof** in verification: `blockSchema.safeParse({ block: ... })` should accept, `blockSchema.safeParse({ type: ... })` should reject. This proves the rename is real.
- **The `sections` property name on `themeSchema`** STAYS as `sections`. It's the DB column name and semantically correct (a theme has sections). Only the `.type` field INSIDE each section element changes to `.block`.
