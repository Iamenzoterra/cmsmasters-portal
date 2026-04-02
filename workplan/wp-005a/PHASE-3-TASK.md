# WP-005A Phase 3: Remove packages/blocks/, Prepare for DB-Driven Model

> Workplan: WP-005A Block Library Foundation
> Phase: 3 of 4
> Priority: P0
> Estimated: 1–1.5 hours
> Type: Cleanup (delete package, fix deps, simplify Studio)
> Previous: Phase 2 ✅ (type→block rename), Hotfix ✅ (per-block dirs + BlockMeta)
> Next: Phase 4 (Documentation Update — closes WP-005A)

---

## Context

Architecture pivot (2026-03-31): blocks move from hardcoded `packages/blocks/` to Supabase `blocks` table (WP-005B). The entire `packages/blocks/` package — 12 Zod schemas, BLOCK_REGISTRY, BLOCK_META, BLOCK_LABELS, validation functions, typed exports — all of it is **dead code** under the new model.

This phase deletes `packages/blocks/` and makes minimal changes to keep the monorepo compilable. Studio's section builder becomes non-functional (all blocks = JSON editor, no picker) — that's expected because 005C replaces it entirely.

```
DELETE:
  packages/blocks/                          — entire package (12 dirs, registry, types, tests)

MODIFY:
  packages/db/src/types.ts                  — BlockId becomes plain string, no import from blocks
  packages/db/src/index.ts                  — remove BlockId export (it's just string now)
  packages/db/package.json                  — remove @cmsmasters/blocks dep
  packages/db/tsconfig.json                 — remove @cmsmasters/blocks path alias
  packages/validators/src/theme.ts          — blockIdEnum → z.string(), blockSchema.block → z.string()
  packages/validators/src/index.ts          — remove all block-related re-exports
  packages/validators/package.json          — remove @cmsmasters/blocks dep
  packages/validators/tsconfig.json         — remove @cmsmasters/blocks path alias
  apps/studio/src/pages/theme-editor.tsx    — remove BLOCK_*/BlockId imports, remove typed editors, simplify
  apps/studio/src/lib/form-defaults.ts      — remove getDefaultBlocks, sections = []
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm packages/blocks/ exists and will be deleted
ls packages/blocks/package.json && echo "EXISTS — will be deleted"

# 2. Find ALL imports from @cmsmasters/blocks across monorepo
grep -rn "from.*@cmsmasters/blocks\|require.*@cmsmasters/blocks" packages/ apps/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules
# Expected: db/types.ts, db/package.json, db/tsconfig.json, validators/theme.ts, validators/index.ts, validators/package.json, validators/tsconfig.json, blocks/ internal

# 3. Find ALL symbols imported from @cmsmasters/blocks
grep -rn "blockIdEnum\|BLOCK_REGISTRY\|BLOCK_META\|BLOCK_IDS\|BLOCK_LABELS\|CORE_BLOCK_IDS\|getDefaultBlocks\|validateBlockData\|validateBlocks\|BlockRegistryEntry\|BlockMeta\|BlockId" apps/studio/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# 4. Baseline — tests and tsc
npx tsc --noEmit --project packages/blocks/tsconfig.json 2>&1 | tail -3
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 | tail -3
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 | tail -3
```

**Document your findings before writing any code.**

---

## Task 3.1: Delete packages/blocks/ Entirely

```bash
rm -rf packages/blocks/
```

This removes:
- 12 per-block dirs (schema.ts, defaults.ts, meta.ts each)
- `src/registry.ts` (BLOCK_REGISTRY, BLOCK_META, getDefaultBlocks, validateBlockData, validateBlocks)
- `src/types.ts` (blockIdEnum, BlockId, BlockRegistryEntry, BlockMeta)
- `src/index.ts` (barrel exports)
- `src/__tests__/registry.test.ts`
- `package.json`, `tsconfig.json`

Total: ~50 files removed.

---

## Task 3.2: Update packages/db/

### 3.2a: `packages/db/src/types.ts`

Replace the BlockId import section:

**Find:**
```typescript
// ── Block types (stored in themes.sections jsonb array) ──

import type { BlockId } from '@cmsmasters/blocks'
export type { BlockId }

export interface ThemeBlock {
  block: BlockId
  data: Record<string, unknown>
}
```

**Replace with:**
```typescript
// ── Block types (stored in themes.sections jsonb array) ──
// BlockId = string slug (dynamic from DB, not hardcoded enum)
// NOTE: themes.sections will be replaced by template_id + block_fills in WP-005B

export type BlockId = string

export interface ThemeBlock {
  block: BlockId
  data: Record<string, unknown>
}
```

### 3.2b: `packages/db/package.json`

Remove `@cmsmasters/blocks` from dependencies:

```json
{
  "name": "@cmsmasters/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@cmsmasters/validators": "*",
    "@supabase/supabase-js": "^2"
  }
}
```

### 3.2c: `packages/db/tsconfig.json`

Remove `@cmsmasters/blocks` path alias:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "paths": {
      "@cmsmasters/validators": ["../validators/src/index.ts"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 3.2d: `packages/db/src/index.ts`

`BlockId` is now just `string` — keep the export for backward compat (Studio imports it):

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

No changes to export list — `BlockId` stays exported, just its definition changed from `z.infer<typeof blockIdEnum>` to `string`.

---

## Task 3.3: Update packages/validators/

### 3.3a: `packages/validators/src/theme.ts`

Replace blockIdEnum import with inline z.string():

**Find:**
```typescript
import { z } from 'zod'
import { blockIdEnum } from '@cmsmasters/blocks'
```

**Replace with:**
```typescript
import { z } from 'zod'
```

**Find:**
```typescript
export const blockSchema = z.object({
  block: blockIdEnum,
  data: z.record(z.string(), z.unknown()),
})
```

**Replace with:**
```typescript
// Block ID = any string slug (dynamic from DB, validated at API layer)
export const blockSchema = z.object({
  block: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
})
```

### 3.3b: `packages/validators/src/index.ts`

Strip everything that came from `@cmsmasters/blocks`:

```typescript
// ── Theme schemas ──
export {
  themeSchema,
  metaSchema,
  seoSchema,
  blockSchema,
  blocksSchema,
} from './theme'
export type { ThemeFormData } from './theme'
```

That's it. All block registry re-exports, typed per-block schema exports — gone.

### 3.3c: `packages/validators/package.json`

Remove `@cmsmasters/blocks` dep:

```json
{
  "name": "@cmsmasters/validators",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^4"
  }
}
```

### 3.3d: `packages/validators/tsconfig.json`

Remove path alias:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Task 3.4: Simplify apps/studio/

### 3.4a: `apps/studio/src/lib/form-defaults.ts`

Remove `getDefaultBlocks` — new themes start with empty sections (005C will use template selection):

```typescript
import type { ThemeFormData } from '@cmsmasters/validators'

/**
 * Default form values for a new theme.
 * Sections empty — 005C adds template picker for initial blocks.
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
    sections: [],
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

### 3.4b: `apps/studio/src/pages/theme-editor.tsx`

Major simplification. This is mechanical — remove dead imports + dead code:

**Imports — remove these lines entirely:**
```typescript
import { BLOCK_LABELS, CORE_BLOCK_IDS, BLOCK_REGISTRY } from '@cmsmasters/validators'
import type { BlockId } from '@cmsmasters/db'
```

**Delete entire functions** (typed editors — ~135 lines total):
- `HeroEditor` (screenshots useFieldArray + headline input)
- `FeatureGridEditor` (features useFieldArray)
- `PluginComparisonEditor` (plugins useFieldArray + total value display)
- `TrustStripInfo` (static text)
- `RelatedThemesEditor` (category + limit inputs)

**Simplify SectionEditor** — remove switch, always use StubEditor:

**Replace:**
```typescript
function SectionEditor({ index, block, control, register }: { index: number; block: BlockId; control: Control<ThemeFormData>; register: UseFormRegister<ThemeFormData> }) {
  switch (block) {
    case 'theme-hero': { return <HeroEditor ... /> }
    case 'feature-grid': { return <FeatureGridEditor ... /> }
    case 'plugin-comparison': { return <PluginComparisonEditor ... /> }
    case 'trust-strip': { return <TrustStripInfo /> }
    case 'related-themes': { return <RelatedThemesEditor ... /> }
    default: { return <StubEditor index={index} control={control} /> }
  }
}
```

**With:**
```typescript
function SectionEditor({ index, control }: { index: number; control: Control<ThemeFormData> }) {
  return <StubEditor index={index} control={control} />
}
```

**Update SectionEditor call site** in SectionsList:

**Replace:**
```typescript
<SectionEditor index={index} block={field.block as BlockId} control={control} register={register} />
```

**With:**
```typescript
<SectionEditor index={index} control={control} />
```

**Simplify SectionsListProps** — remove BlockId reference:

**Replace:**
```typescript
interface SectionsListProps {
  fields: Array<{ id: string; block: string; data: Record<string, unknown> }>
  ...
  onAppend: (block: BlockId) => void
}
```

**With:**
```typescript
interface SectionsListProps {
  fields: Array<{ id: string; block: string; data: Record<string, unknown> }>
  ...
  onAppend: (block: string) => void
}
```

**Simplify "Add Section" picker** — BLOCK_LABELS and CORE_BLOCK_IDS are gone. Replace the picker with a simple text input for block slug (temporary — 005C replaces with DB-driven picker):

**Replace** the entire picker section in SectionsList (the `showPicker` conditional block with `CORE_BLOCK_IDS.map(...)`) **with:**

```typescript
{showPicker ? (
  <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
    <input
      className="flex-1 outline-none"
      style={inputStyle}
      placeholder="Block slug (e.g. fast-loading-speed)"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const slug = (e.target as HTMLInputElement).value.trim()
          if (slug) { onAppend(slug); setShowPicker(false) }
        }
      }}
    />
    <button
      type="button"
      onClick={() => setShowPicker(false)}
      className="border-0 bg-transparent"
      style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
    >
      Cancel
    </button>
  </div>
) : (
  /* keep existing "Add Section" dashed button as-is */
)}
```

**Update onAppend callback** in ThemeEditor:

**Replace:**
```typescript
onAppend={(block: BlockId) => {
  const entry = BLOCK_REGISTRY[block]
  sectionsArray.append({ block, data: { ...entry.defaultData } })
}}
```

**With:**
```typescript
onAppend={(block: string) => {
  sectionsArray.append({ block, data: {} })
}}
```

**SectionsList label display** — BLOCK_LABELS is gone:

**Replace:**
```typescript
{BLOCK_LABELS[field.block as BlockId] ?? field.block}
```

**With:**
```typescript
{field.block}
```

(Shows raw slug. 005C will fetch labels from DB.)

---

## Task 3.5: Update mappers test

`packages/db/src/__tests__/mappers.test.ts` imports `blockSchema` from `@cmsmasters/validators`. This import still works — `blockSchema` is still exported. But the schema now accepts any string for `block` field, not just the enum values. The test's Scenario 3 (BlockId enforcement) needs updating:

**Replace:**
```typescript
console.log('\n=== Scenario 3: BlockId Enforcement ===')

const validBlock = blockSchema.safeParse({ block: 'theme-hero', data: { headline: 'Hi' } })
assert('valid block ID accepted', validBlock.success)

const bogusBlock = blockSchema.safeParse({ block: 'bogus-type', data: {} })
assert('bogus block ID rejected', !bogusBlock.success)

const emptyBlock = blockSchema.safeParse({ block: '', data: {} })
assert('empty string block ID rejected', !emptyBlock.success)
```

**With:**
```typescript
console.log('\n=== Scenario 3: Block Schema ===')

const validBlock = blockSchema.safeParse({ block: 'theme-hero', data: { headline: 'Hi' } })
assert('known block slug accepted', validBlock.success)

const anyBlock = blockSchema.safeParse({ block: 'any-custom-slug', data: {} })
assert('any non-empty slug accepted (dynamic IDs)', anyBlock.success)

const emptyBlock = blockSchema.safeParse({ block: '', data: {} })
assert('empty string block rejected', !emptyBlock.success)
```

---

## Task 3.6: Delete blocks registry test

```bash
rm -rf packages/blocks/
# Already done in Task 3.1 — this is just a reminder that the test is gone too.
# validators/src/__tests__/ was deleted in Phase 2. Nothing extra to clean.
```

---

## Task 3.7: npm install

```bash
npm install
```

Re-resolve workspace — `packages/blocks` is gone, deps updated.

---

## Files to Delete

| Path | Why |
|------|-----|
| `packages/blocks/` | Entire package — replaced by Supabase blocks table in 005B |

## Files to Modify (10)

| File | Changes |
|------|---------|
| `packages/db/src/types.ts` | BlockId = string, remove import from @cmsmasters/blocks |
| `packages/db/src/index.ts` | No changes (BlockId still exported) |
| `packages/db/package.json` | Remove @cmsmasters/blocks dep |
| `packages/db/tsconfig.json` | Remove @cmsmasters/blocks path alias |
| `packages/validators/src/theme.ts` | Remove blockIdEnum import, block field → z.string().min(1) |
| `packages/validators/src/index.ts` | Remove all block registry re-exports, keep only theme schemas |
| `packages/validators/package.json` | Remove @cmsmasters/blocks dep |
| `packages/validators/tsconfig.json` | Remove @cmsmasters/blocks path alias |
| `apps/studio/src/pages/theme-editor.tsx` | Remove BLOCK_*/BlockId imports, delete 5 typed editors, simplify SectionEditor, simplify picker |
| `apps/studio/src/lib/form-defaults.ts` | Remove getDefaultBlocks, sections = [] |

## Files to Modify (tests, 1)

| File | Changes |
|------|---------|
| `packages/db/src/__tests__/mappers.test.ts` | Update Scenario 3: any slug accepted, empty rejected |

---

## Acceptance Criteria

- [ ] `packages/blocks/` directory **does not exist**
- [ ] Zero references to `@cmsmasters/blocks` in `packages/` or `apps/` (grep proof)
- [ ] `BlockId = string` in `packages/db/src/types.ts`
- [ ] `blockSchema.block` accepts any non-empty string (not enum)
- [ ] `validators/index.ts` exports ONLY theme schemas (no block registry)
- [ ] Studio has NO typed editors (HeroEditor, FeatureGridEditor, etc.)
- [ ] Studio SectionEditor uses StubEditor for all blocks
- [ ] `form-defaults.ts` returns `sections: []`
- [ ] `npx tsc --noEmit --project packages/validators/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/db/tsconfig.json` — 0 errors
- [ ] Mapper test passes (38 assertions)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-005A Phase 3 Verification ==="

# 1. packages/blocks/ gone
echo "--- blocks/ deleted ---"
ls packages/blocks/ 2>/dev/null && echo "❌ blocks/ still exists!" || echo "✅ blocks/ deleted"

# 2. Zero @cmsmasters/blocks references
echo "--- @cmsmasters/blocks references ---"
grep -rn "@cmsmasters/blocks" packages/ apps/ --include="*.ts" --include="*.tsx" --include="*.json" | grep -v node_modules
echo "(expected: 0 matches)"

# 3. No typed editors in Studio
echo "--- typed editors ---"
grep -c "function HeroEditor\|function FeatureGridEditor\|function PluginComparisonEditor\|function TrustStripInfo\|function RelatedThemesEditor" apps/studio/src/pages/theme-editor.tsx
echo "(expected: 0)"

# 4. BlockId = string
echo "--- BlockId type ---"
grep "BlockId" packages/db/src/types.ts
echo "(expected: export type BlockId = string)"

# 5. blockSchema accepts any slug
echo "--- blockSchema ---"
grep "block:" packages/validators/src/theme.ts
echo "(expected: z.string().min(1))"

# 6. validators/index.ts is clean
echo "--- validators exports ---"
grep -c "BLOCK_\|getDefault\|validate\|blockIdEnum\|BlockRegistryEntry\|BlockMeta" packages/validators/src/index.ts
echo "(expected: 0)"

# 7. tsc
echo "--- TypeScript ---"
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 && echo "✅ validators" || echo "❌ validators FAILED"
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 && echo "✅ db" || echo "❌ db FAILED"

# 8. Mapper test
echo "--- Tests ---"
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 && echo "✅ mapper test" || echo "❌ mapper test FAILED"

echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005a/phase-3-result.md`

```markdown
# Execution Log: WP-005A Phase 3 — Remove packages/blocks/, Prepare for DB-Driven Model
> Epic: WP-005A Block Library Foundation
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ❌ FAILED

## What Was Done
{summary}

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Verification Results
| Check | Result |
|-------|--------|
| blocks/ deleted | ✅/❌ |
| Zero @cmsmasters/blocks refs | ✅/❌ |
| No typed editors | ✅/❌ |
| BlockId = string | ✅/❌ |
| blockSchema any slug | ✅/❌ |
| validators exports clean | ✅/❌ |
| validators tsc | ✅/❌ |
| db tsc | ✅/❌ |
| mapper test | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

## Git

```bash
git add -A
git commit -m "refactor: remove packages/blocks/, BlockId=string, prepare for DB model [WP-005A phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Delete `packages/blocks/` FIRST**, then fix imports. Order matters — tsc will show you every broken reference.
- **Do NOT create any new block-related structures.** This phase only removes. 005B builds the new model.
- **Studio will be functionally degraded** — section builder shows slugs instead of labels, no predefined block picker. This is intentional and temporary (005C replaces entirely).
- **`sections` field stays on themeSchema** — 005B migrates to template_id + block_fills. Not this phase.
- **`nanToUndefined` helper** in theme-editor.tsx — check if it's still used after removing typed editors. If only used by PluginComparisonEditor, remove it. If used by EditorSidebar, keep it.
- **Do NOT modify `packages/db/src/mappers.ts`** — pass-through, no changes needed.
- **If `npm install` has issues** after deleting packages/blocks/, check that no lockfile entries reference it. `npm install` should clean up automatically.
