# WP-005A Hotfix: Restructure blocks/src/schemas/ → Per-Block Directories + Add BlockMeta

> Workplan: WP-005A Block Library Foundation
> Type: Hotfix (structural correction between Phase 2 and Phase 3)
> Priority: P0 — Phase 3 depends on per-block structure
> Estimated: 30–45 minutes
> Previous: Phase 2 ✅ (type→block rename complete)

---

## Context

Phase 1 was supposed to create per-block directories:
```
packages/blocks/src/theme-hero/
  ├── schema.ts
  ├── defaults.ts
  └── meta.ts
```

Instead CC created flat files:
```
packages/blocks/src/schemas/theme-hero.ts   ← schema + defaults in one file, no meta
```

This blocks Phase 3 (Figma blocks need per-block dirs for `.astro`, `preview.png`, `markdown.ts`) and 005C (block picker needs `BlockMeta` for categories + descriptions).

## ⚠️ CRITICAL: File Structure Requirement

The resulting structure MUST be:
```
packages/blocks/src/
├── theme-hero/
│   ├── schema.ts      ← Zod schema + type export
│   ├── defaults.ts    ← defaults constant
│   └── meta.ts        ← BlockMeta (label, category, description, stub)
├── feature-grid/
│   ├── schema.ts
│   ├── defaults.ts
│   └── meta.ts
├── ... (12 directories total, 3 files each = 36 files)
├── schemas/           ← DELETED
├── types.ts           ← add BlockMeta interface
├── registry.ts        ← update imports, add BLOCK_META
├── index.ts           ← update imports, export BLOCK_META + BlockMeta
└── __tests__/registry.test.ts  ← add BLOCK_META assertions
```

---

## PHASE 0: Audit (do FIRST)

```bash
# 1. Current flat structure
ls packages/blocks/src/schemas/
# Expected: 12 .ts files

# 2. No per-block dirs yet
ls -d packages/blocks/src/theme-hero/ 2>/dev/null && echo "EXISTS" || echo "OK: does not exist"

# 3. Baseline — tests pass
npx tsx --tsconfig packages/blocks/tsconfig.json packages/blocks/src/__tests__/registry.test.ts 2>&1 | tail -3
```

---

## Task 1: Add BlockMeta to types.ts

Append to `packages/blocks/src/types.ts` (after `BlockRegistryEntry`):

```typescript
/** Block metadata — for picker UI, categories, docs */
export interface BlockMeta {
  label: string
  category: 'hero' | 'features' | 'social-proof' | 'cta' | 'content' | 'navigation'
  description: string
  stub: boolean
}
```

---

## Task 2: Create 12 Per-Block Directories

For each block, create a directory and split the flat file into 3 files.

### 5 Core blocks (real schemas)

**theme-hero/** — split from `schemas/theme-hero.ts`:

`schema.ts`:
```typescript
import { z } from 'zod'

export const themeHeroDataSchema = z.object({
  headline: z.string().optional().default(''),
  screenshots: z.array(z.string()).default([]),
})

export type ThemeHeroData = z.infer<typeof themeHeroDataSchema>
```

`defaults.ts`:
```typescript
import type { ThemeHeroData } from './schema'

export const themeHeroDefaults: ThemeHeroData = {
  headline: '',
  screenshots: [],
}
```

`meta.ts`:
```typescript
import type { BlockMeta } from '../types'

export const themeHeroMeta: BlockMeta = {
  label: 'Hero',
  category: 'hero',
  description: 'Theme hero with headline and screenshots carousel',
  stub: false,
}
```

---

**feature-grid/** — split from `schemas/feature-grid.ts`:

`schema.ts`:
```typescript
import { z } from 'zod'

export const featureGridDataSchema = z.object({
  features: z.array(z.object({
    icon: z.string().default(''),
    title: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
})

export type FeatureGridData = z.infer<typeof featureGridDataSchema>
```

`defaults.ts`:
```typescript
import type { FeatureGridData } from './schema'

export const featureGridDefaults: FeatureGridData = { features: [] }
```

`meta.ts`:
```typescript
import type { BlockMeta } from '../types'

export const featureGridMeta: BlockMeta = {
  label: 'Features',
  category: 'features',
  description: 'Feature grid with icon, title, and description',
  stub: false,
}
```

---

**plugin-comparison/** — split from `schemas/plugin-comparison.ts`:

`schema.ts`:
```typescript
import { z } from 'zod'

export const pluginComparisonDataSchema = z.object({
  included_plugins: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    value: z.number().optional(),
    icon_url: z.string().optional(),
  })).default([]),
})

export type PluginComparisonData = z.infer<typeof pluginComparisonDataSchema>
```

`defaults.ts`:
```typescript
import type { PluginComparisonData } from './schema'

export const pluginComparisonDefaults: PluginComparisonData = { included_plugins: [] }
```

`meta.ts`:
```typescript
import type { BlockMeta } from '../types'

export const pluginComparisonMeta: BlockMeta = {
  label: 'Plugins',
  category: 'features',
  description: 'Plugin comparison table with value calculator',
  stub: false,
}
```

---

**trust-strip/** — split from `schemas/trust-strip.ts`:

`schema.ts`:
```typescript
import { z } from 'zod'

export const trustStripDataSchema = z.object({})

export type TrustStripData = z.infer<typeof trustStripDataSchema>
```

`defaults.ts`:
```typescript
import type { TrustStripData } from './schema'

export const trustStripDefaults: TrustStripData = {}
```

`meta.ts`:
```typescript
import type { BlockMeta } from '../types'

export const trustStripMeta: BlockMeta = {
  label: 'Trust Strip',
  category: 'social-proof',
  description: 'Trust badges strip (reads from theme meta.trust_badges)',
  stub: false,
}
```

---

**related-themes/** — split from `schemas/related-themes.ts`:

`schema.ts`:
```typescript
import { z } from 'zod'

export const relatedThemesDataSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(12).optional().default(4),
})

export type RelatedThemesData = z.infer<typeof relatedThemesDataSchema>
```

`defaults.ts`:
```typescript
import type { RelatedThemesData } from './schema'

export const relatedThemesDefaults: RelatedThemesData = { limit: 4 }
```

`meta.ts`:
```typescript
import type { BlockMeta } from '../types'

export const relatedThemesMeta: BlockMeta = {
  label: 'Related Themes',
  category: 'navigation',
  description: 'Grid of related themes from the same category',
  stub: false,
}
```

---

### 7 Stub blocks (permissive z.record schemas)

All 7 follow this exact pattern. Use this table for values:

| Dir name | camelCase | PascalCase | Label | Category | Description |
|----------|-----------|------------|-------|----------|-------------|
| `before-after` | `beforeAfter` | `BeforeAfter` | Before & After | content | Before/after visual comparison |
| `video-demo` | `videoDemo` | `VideoDemo` | Video Demo | content | Embedded video demo showcase |
| `testimonials` | `testimonials` | `Testimonials` | Testimonials | social-proof | Customer testimonials carousel |
| `faq` | `faq` | `Faq` | FAQ | content | Frequently asked questions accordion |
| `cta-banner` | `ctaBanner` | `CtaBanner` | CTA Banner | cta | Call-to-action banner with button |
| `stats-counter` | `statsCounter` | `StatsCounter` | Stats Counter | social-proof | Animated statistics counters |
| `resource-sidebar` | `resourceSidebar` | `ResourceSidebar` | Resource Sidebar | navigation | Resource links with 3 access tiers |

**Stub schema.ts pattern** (same for all 7):
```typescript
import { z } from 'zod'

// Stub: permissive schema. Full schema when Figma design exists.
export const {camelCase}DataSchema = z.record(z.string(), z.unknown())

export type {PascalCase}Data = z.infer<typeof {camelCase}DataSchema>
```

**Stub defaults.ts pattern**:
```typescript
import type { {PascalCase}Data } from './schema'

export const {camelCase}Defaults: {PascalCase}Data = {}
```

**Stub meta.ts pattern**:
```typescript
import type { BlockMeta } from '../types'

export const {camelCase}Meta: BlockMeta = {
  label: '{Label}',
  category: '{category}',
  description: '{Description}',
  stub: true,
}
```

---

## Task 3: Update registry.ts Imports + Add BLOCK_META

Replace ALL import paths from `./schemas/{block}` to `./{block}/schema` and `./{block}/defaults`.
Add meta imports and `BLOCK_META` record.

**Import section** becomes:
```typescript
import type { BlockId, BlockRegistryEntry, BlockMeta } from './types'

import { themeHeroDataSchema } from './theme-hero/schema'
import { themeHeroDefaults } from './theme-hero/defaults'
import { themeHeroMeta } from './theme-hero/meta'

import { featureGridDataSchema } from './feature-grid/schema'
import { featureGridDefaults } from './feature-grid/defaults'
import { featureGridMeta } from './feature-grid/meta'

import { pluginComparisonDataSchema } from './plugin-comparison/schema'
import { pluginComparisonDefaults } from './plugin-comparison/defaults'
import { pluginComparisonMeta } from './plugin-comparison/meta'

import { trustStripDataSchema } from './trust-strip/schema'
import { trustStripDefaults } from './trust-strip/defaults'
import { trustStripMeta } from './trust-strip/meta'

import { relatedThemesDataSchema } from './related-themes/schema'
import { relatedThemesDefaults } from './related-themes/defaults'
import { relatedThemesMeta } from './related-themes/meta'

import { beforeAfterDataSchema } from './before-after/schema'
import { beforeAfterDefaults } from './before-after/defaults'
import { beforeAfterMeta } from './before-after/meta'

import { videoDemoDataSchema } from './video-demo/schema'
import { videoDemoDefaults } from './video-demo/defaults'
import { videoDemoMeta } from './video-demo/meta'

import { testimonialsDataSchema } from './testimonials/schema'
import { testimonialsDefaults } from './testimonials/defaults'
import { testimonialsMeta } from './testimonials/meta'

import { faqDataSchema } from './faq/schema'
import { faqDefaults } from './faq/defaults'
import { faqMeta } from './faq/meta'

import { ctaBannerDataSchema } from './cta-banner/schema'
import { ctaBannerDefaults } from './cta-banner/defaults'
import { ctaBannerMeta } from './cta-banner/meta'

import { statsCounterDataSchema } from './stats-counter/schema'
import { statsCounterDefaults } from './stats-counter/defaults'
import { statsCounterMeta } from './stats-counter/meta'

import { resourceSidebarDataSchema } from './resource-sidebar/schema'
import { resourceSidebarDefaults } from './resource-sidebar/defaults'
import { resourceSidebarMeta } from './resource-sidebar/meta'
```

**Add** after `BLOCK_LABELS`:
```typescript
export const BLOCK_META: Record<BlockId, BlockMeta> = {
  'theme-hero': themeHeroMeta,
  'feature-grid': featureGridMeta,
  'plugin-comparison': pluginComparisonMeta,
  'trust-strip': trustStripMeta,
  'related-themes': relatedThemesMeta,
  'before-after': beforeAfterMeta,
  'video-demo': videoDemoMeta,
  'testimonials': testimonialsMeta,
  'faq': faqMeta,
  'cta-banner': ctaBannerMeta,
  'stats-counter': statsCounterMeta,
  'resource-sidebar': resourceSidebarMeta,
}
```

**Rest of registry.ts** (BLOCK_REGISTRY, derived constants, getDefaultBlocks, validation) stays unchanged.

---

## Task 4: Update index.ts

Replace schema import paths from `./schemas/{block}` to `./{block}/schema`.

**Add** to exports:
```typescript
export { BLOCK_META } from './registry'
export type { BlockMeta } from './types'
```

**Full index.ts:**
```typescript
// Types
export { blockIdEnum, type BlockId, type BlockRegistryEntry, type BlockMeta } from './types'

// Registry
export {
  BLOCK_REGISTRY,
  BLOCK_META,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from './registry'

// Per-block data schemas (for typed block editors)
export { themeHeroDataSchema, type ThemeHeroData } from './theme-hero/schema'
export { featureGridDataSchema, type FeatureGridData } from './feature-grid/schema'
export { pluginComparisonDataSchema, type PluginComparisonData } from './plugin-comparison/schema'
export { trustStripDataSchema, type TrustStripData } from './trust-strip/schema'
export { relatedThemesDataSchema, type RelatedThemesData } from './related-themes/schema'
```

---

## Task 5: Delete schemas/ Directory

```bash
rm -rf packages/blocks/src/schemas/
```

---

## Task 6: Add BLOCK_META Assertions to Test

In `packages/blocks/src/__tests__/registry.test.ts`, add import of `BLOCK_META` and these assertions after the Registry Structure section:

```typescript
import {
  BLOCK_REGISTRY,
  BLOCK_META,
  BLOCK_IDS,
  BLOCK_LABELS,
  CORE_BLOCK_IDS,
  getDefaultBlocks,
  validateBlockData,
  validateBlocks,
} from '../index'
```

Add after the `every entry has defaultData` assertion:

```typescript
// ── Block metadata ──

console.log('\n=== Block Metadata ===')
assert('12 BLOCK_META entries', Object.keys(BLOCK_META).length === 12)
assert('every meta has label', Object.values(BLOCK_META).every(m => typeof m.label === 'string' && m.label.length > 0))
assert('every meta has category', Object.values(BLOCK_META).every(m => ['hero','features','social-proof','cta','content','navigation'].includes(m.category)))
assert('every meta has description', Object.values(BLOCK_META).every(m => typeof m.description === 'string' && m.description.length > 0))
assert('every meta has stub flag', Object.values(BLOCK_META).every(m => typeof m.stub === 'boolean'))
assert('5 core blocks are not stubs', CORE_BLOCK_IDS.every(id => !BLOCK_META[id].stub))
assert('7 stub blocks are stubs', BLOCK_IDS.filter(id => !CORE_BLOCK_IDS.includes(id)).every(id => BLOCK_META[id].stub))
```

---

## Files to Create (36)

12 directories × 3 files = 36 new files under `packages/blocks/src/`.

## Files to Modify (4)

- `packages/blocks/src/types.ts` — add `BlockMeta` interface
- `packages/blocks/src/registry.ts` — update import paths, add `BLOCK_META`
- `packages/blocks/src/index.ts` — update import paths, export `BLOCK_META` + `BlockMeta`
- `packages/blocks/src/__tests__/registry.test.ts` — import + assert `BLOCK_META`

## Files to Delete

- `packages/blocks/src/schemas/` — entire directory (12 files)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Hotfix Verification ==="

# 1. Per-block dirs exist (12 dirs × 3 files)
echo "--- Structure check ---"
count=0
for block in theme-hero feature-grid plugin-comparison trust-strip related-themes before-after video-demo testimonials faq cta-banner stats-counter resource-sidebar; do
  if [ -f "packages/blocks/src/$block/schema.ts" ] && [ -f "packages/blocks/src/$block/defaults.ts" ] && [ -f "packages/blocks/src/$block/meta.ts" ]; then
    count=$((count + 1))
  else
    echo "❌ $block MISSING files"
  fi
done
echo "✅ $count/12 block directories OK"

# 2. schemas/ deleted
ls packages/blocks/src/schemas/ 2>/dev/null && echo "❌ schemas/ still exists!" || echo "✅ schemas/ deleted"

# 3. tsc
echo "--- TypeScript ---"
npx tsc --noEmit --project packages/blocks/tsconfig.json 2>&1 && echo "✅ blocks compiles" || echo "❌ blocks FAILED"
npx tsc --noEmit --project packages/validators/tsconfig.json 2>&1 && echo "✅ validators compiles" || echo "❌ validators FAILED"
npx tsc --noEmit --project packages/db/tsconfig.json 2>&1 && echo "✅ db compiles" || echo "❌ db FAILED"

# 4. Tests
echo "--- Tests ---"
npx tsx --tsconfig packages/blocks/tsconfig.json packages/blocks/src/__tests__/registry.test.ts 2>&1 && echo "✅ registry test" || echo "❌ registry test FAILED"
npx tsx --tsconfig packages/db/tsconfig.json packages/db/src/__tests__/mappers.test.ts 2>&1 && echo "✅ mapper test" || echo "❌ mapper test FAILED"

# 5. No leftover schemas/ imports
echo "--- Import check ---"
grep -rn "from.*schemas/" packages/blocks/src/ --include="*.ts" | grep -v node_modules | grep -v __tests__
echo "(expected: 0 matches)"

echo "=== Done ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

`logs/wp-005a/hotfix-restructure-result.md`

```markdown
# Execution Log: WP-005A Hotfix — Restructure Per-Block Directories + BlockMeta
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ❌ FAILED

## What Was Done
{summary}

## Files Changed
| File | Change |
|------|--------|
| ... | ... |

## Verification Results
| Check | Result |
|-------|--------|
| 12 dirs × 3 files | ✅/❌ |
| schemas/ deleted | ✅/❌ |
| blocks tsc | ✅/❌ |
| validators tsc | ✅/❌ |
| db tsc | ✅/❌ |
| registry test | ✅/❌ |
| mapper test | ✅/❌ |
| No schemas/ imports | ✅/❌ |
```

## Git

```bash
git add packages/blocks/ logs/wp-005a/
git commit -m "fix: restructure blocks to per-block dirs, add BlockMeta [WP-005A hotfix]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify any file outside `packages/blocks/`** — this is a self-contained restructure.
- **Schema content stays identical** — just split into separate files and move directories.
- **BLOCK_REGISTRY stays unchanged** — only import paths change.
- **Validation functions stay unchanged** — they don't touch metadata.
- **Order: create new dirs → update imports → delete schemas/ → verify.** Don't delete first.
