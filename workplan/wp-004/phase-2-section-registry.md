# WP-004 Phase 2: Section Registry — Core 5 + Stubs

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 2 of 5
> Priority: P0
> Estimated: 1–1.5 hours
> Type: Backend (validators package)
> Previous: Phase 1 ✅ (DB migration, types, validators, mappers — 38/38 round-trip tests pass)
> Next: Phase 3 (Query recovery — all call sites migrated to nested shape)

---

## Context

Phase 1 established the nested schema: `{ slug, meta, sections[], seo, status }`. The `sectionSchema` currently validates structure (`type: sectionTypeEnum` + `data: z.record()`), but doesn't validate data **per section type**. Any `data` object passes for any section type.

This phase adds a section registry: one file per type, a central registry map, and a `validateSection()` function that enforces per-type data schemas. The registry is also the single source of truth for UI: labels, which types appear in the add-picker, default data for new sections.

```
CURRENT:  sectionSchema validates { type: SectionType, data: Record<string, unknown> }   ✅
CURRENT:  sectionTypeEnum has 12 types                                                    ✅
CURRENT:  No per-type data validation — any data passes for any type                      ❌
MISSING:  Per-type Zod schemas (core 5 full, 7 stubs permissive)                          ❌
MISSING:  SECTION_REGISTRY map: type → { schema, label, defaultData }                     ❌
MISSING:  validateSection() that checks data against type-specific schema                  ❌
MISSING:  CORE_SECTION_TYPES for add-picker UI                                            ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Verify current validator state (Phase 1 output)
cat packages/validators/src/theme.ts
# Expected: sectionTypeEnum with 12 types, sectionSchema with z.record data

# 2. Verify current exports
cat packages/validators/src/index.ts
# Expected: exports themeSchema, metaSchema, seoSchema, sectionSchema, sectionsSchema, sectionTypeEnum

# 3. Check no sections/ directory exists yet
ls packages/validators/src/sections/ 2>/dev/null || echo "sections/ does not exist yet — expected"

# 4. Verify SectionType in db matches sectionTypeEnum in validators
grep -A 15 "export type SectionType" packages/db/src/types.ts
# Must match the 12 values in sectionTypeEnum — if they diverge, Phase 1 had a problem
```

**Document your findings before writing any code.**

---

## Task 2.1: Per-Type Schema Files (Core 5)

### What to Build

Create `packages/validators/src/sections/` with one file per core section type. Each exports a Zod schema for the section's `data` field and a default data object for new sections.

**`packages/validators/src/sections/theme-hero.ts`**

```typescript
import { z } from 'zod'

export const themeHeroDataSchema = z.object({
  headline: z.string().optional().default(''),
  screenshots: z.array(z.string()).default([]),
})

export type ThemeHeroData = z.infer<typeof themeHeroDataSchema>

export const themeHeroDefaults: ThemeHeroData = {
  headline: '',
  screenshots: [],
}
```

**`packages/validators/src/sections/feature-grid.ts`**

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

export const featureGridDefaults: FeatureGridData = {
  features: [],
}
```

**`packages/validators/src/sections/plugin-comparison.ts`**

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

export const pluginComparisonDefaults: PluginComparisonData = {
  included_plugins: [],
}
```

**`packages/validators/src/sections/trust-strip.ts`**

```typescript
import { z } from 'zod'

// Trust strip has no own data — renders from meta.trust_badges
export const trustStripDataSchema = z.object({})

export type TrustStripData = z.infer<typeof trustStripDataSchema>

export const trustStripDefaults: TrustStripData = {}
```

**`packages/validators/src/sections/related-themes.ts`**

```typescript
import { z } from 'zod'

export const relatedThemesDataSchema = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(12).optional().default(4),
})

export type RelatedThemesData = z.infer<typeof relatedThemesDataSchema>

export const relatedThemesDefaults: RelatedThemesData = {
  limit: 4,
}
```

---

## Task 2.2: Per-Type Schema Files (7 Stubs)

Create stub files for the remaining 7 types. Each uses a permissive schema (accepts any data object) but is still a proper file ready for full schemas later.

For each of these 7 types, create the file with this pattern:

**`packages/validators/src/sections/{type}.ts`** (for: `before-after`, `video-demo`, `testimonials`, `faq`, `cta-banner`, `stats-counter`, `resource-sidebar`)

```typescript
import { z } from 'zod'

// Stub: permissive schema. Full schema will be added in WP-005.
export const {camelCase}DataSchema = z.record(z.string(), z.unknown()).default({})

export type {PascalCase}Data = z.infer<typeof {camelCase}DataSchema>

export const {camelCase}Defaults: {PascalCase}Data = {}
```

Naming convention:
| Section type | File | Schema name | Type name | Defaults name |
|---|---|---|---|---|
| `before-after` | `before-after.ts` | `beforeAfterDataSchema` | `BeforeAfterData` | `beforeAfterDefaults` |
| `video-demo` | `video-demo.ts` | `videoDemoDataSchema` | `VideoDemoData` | `videoDemoDefaults` |
| `testimonials` | `testimonials.ts` | `testimonialsDataSchema` | `TestimonialsData` | `testimonialsDefaults` |
| `faq` | `faq.ts` | `faqDataSchema` | `FaqData` | `faqDefaults` |
| `cta-banner` | `cta-banner.ts` | `ctaBannerDataSchema` | `CtaBannerData` | `ctaBannerDefaults` |
| `stats-counter` | `stats-counter.ts` | `statsCounterDataSchema` | `StatsCounterData` | `statsCounterDefaults` |
| `resource-sidebar` | `resource-sidebar.ts` | `resourceSidebarDataSchema` | `ResourceSidebarData` | `resourceSidebarDefaults` |

---

## Task 2.3: Registry Index

### What to Build

Create `packages/validators/src/sections/index.ts` — the central registry. This is the single source of truth for section types throughout the system.

```typescript
// packages/validators/src/sections/index.ts
import { z } from 'zod'
import type { SectionType } from '@cmsmasters/db'

import { themeHeroDataSchema, themeHeroDefaults } from './theme-hero'
import { featureGridDataSchema, featureGridDefaults } from './feature-grid'
import { pluginComparisonDataSchema, pluginComparisonDefaults } from './plugin-comparison'
import { trustStripDataSchema, trustStripDefaults } from './trust-strip'
import { relatedThemesDataSchema, relatedThemesDefaults } from './related-themes'
import { beforeAfterDataSchema, beforeAfterDefaults } from './before-after'
import { videoDemoDataSchema, videoDemoDefaults } from './video-demo'
import { testimonialsDataSchema, testimonialsDefaults } from './testimonials'
import { faqDataSchema, faqDefaults } from './faq'
import { ctaBannerDataSchema, ctaBannerDefaults } from './cta-banner'
import { statsCounterDataSchema, statsCounterDefaults } from './stats-counter'
import { resourceSidebarDataSchema, resourceSidebarDefaults } from './resource-sidebar'

// ── Registry entry shape ──

export interface SectionRegistryEntry {
  schema: z.ZodSchema
  label: string
  defaultData: Record<string, unknown>
}

// ── The registry — single source of truth ──

export const SECTION_REGISTRY: Record<SectionType, SectionRegistryEntry> = {
  'theme-hero': {
    schema: themeHeroDataSchema,
    label: 'Hero',
    defaultData: themeHeroDefaults as Record<string, unknown>,
  },
  'feature-grid': {
    schema: featureGridDataSchema,
    label: 'Features',
    defaultData: featureGridDefaults as Record<string, unknown>,
  },
  'plugin-comparison': {
    schema: pluginComparisonDataSchema,
    label: 'Plugins',
    defaultData: pluginComparisonDefaults as Record<string, unknown>,
  },
  'trust-strip': {
    schema: trustStripDataSchema,
    label: 'Trust Strip',
    defaultData: trustStripDefaults as Record<string, unknown>,
  },
  'related-themes': {
    schema: relatedThemesDataSchema,
    label: 'Related Themes',
    defaultData: relatedThemesDefaults as Record<string, unknown>,
  },
  'before-after': {
    schema: beforeAfterDataSchema,
    label: 'Before & After',
    defaultData: beforeAfterDefaults as Record<string, unknown>,
  },
  'video-demo': {
    schema: videoDemoDataSchema,
    label: 'Video Demo',
    defaultData: videoDemoDefaults as Record<string, unknown>,
  },
  'testimonials': {
    schema: testimonialsDataSchema,
    label: 'Testimonials',
    defaultData: testimonialsDefaults as Record<string, unknown>,
  },
  'faq': {
    schema: faqDataSchema,
    label: 'FAQ',
    defaultData: faqDefaults as Record<string, unknown>,
  },
  'cta-banner': {
    schema: ctaBannerDataSchema,
    label: 'CTA Banner',
    defaultData: ctaBannerDefaults as Record<string, unknown>,
  },
  'stats-counter': {
    schema: statsCounterDataSchema,
    label: 'Stats Counter',
    defaultData: statsCounterDefaults as Record<string, unknown>,
  },
  'resource-sidebar': {
    schema: resourceSidebarDataSchema,
    label: 'Resource Sidebar',
    defaultData: resourceSidebarDefaults as Record<string, unknown>,
  },
}

// ── Derived constants ──

/** All 12 section types — derived from registry keys */
export const SECTION_TYPES = Object.keys(SECTION_REGISTRY) as SectionType[]

/** Human-readable labels for UI */
export const SECTION_LABELS: Record<SectionType, string> = Object.fromEntries(
  Object.entries(SECTION_REGISTRY).map(([k, v]) => [k, v.label])
) as Record<SectionType, string>

/** Core 5 — shown in add-section picker. Stubs NOT shown unless explicitly enabled. */
export const CORE_SECTION_TYPES: SectionType[] = [
  'theme-hero',
  'feature-grid',
  'plugin-comparison',
  'trust-strip',
  'related-themes',
]

/** Default sections for a new theme */
export const DEFAULT_THEME_SECTIONS = CORE_SECTION_TYPES.map((type) => ({
  type,
  data: SECTION_REGISTRY[type].defaultData,
}))

// ── Validation ──

/**
 * Validate a section's data against its type-specific schema.
 * Returns { success: true, data } or { success: false, error }.
 */
export function validateSectionData(
  section: { type: string; data: unknown }
): { success: true; data: unknown } | { success: false; error: string } {
  const entry = SECTION_REGISTRY[section.type as SectionType]
  if (!entry) {
    return { success: false, error: `Unknown section type: ${section.type}` }
  }
  const result = entry.schema.safeParse(section.data)
  if (!result.success) {
    return { success: false, error: result.error.message }
  }
  return { success: true, data: result.data }
}
```

**IMPORTANT about `SectionType` import:** The registry imports `SectionType` from `@cmsmasters/db` to use as the `Record` key. This ensures the registry covers exactly the same 12 types as the DB type. If a type is added to `SectionType` but not to the registry, TypeScript will error. This is the desired safety net.

Check that `@cmsmasters/db` is already a dependency of `packages/validators` (Phase 1 added `@cmsmasters/validators` as dep of `packages/db` — this is the reverse direction). If not available, use `import type` from db, or define a local type. Avoid circular runtime dependencies.

---

## Task 2.4: Wire Into Validators Package

### Update `packages/validators/src/index.ts`

Add re-exports for the section registry:

```typescript
// packages/validators/src/index.ts
export {
  themeSchema,
  metaSchema,
  seoSchema,
  sectionSchema,
  sectionsSchema,
  sectionTypeEnum,
} from './theme'
export type { ThemeFormData } from './theme'

// Section registry
export {
  SECTION_REGISTRY,
  SECTION_TYPES,
  SECTION_LABELS,
  CORE_SECTION_TYPES,
  DEFAULT_THEME_SECTIONS,
  validateSectionData,
} from './sections'
export type { SectionRegistryEntry } from './sections'

// Per-type data schemas (for typed section editors in Studio)
export { themeHeroDataSchema, type ThemeHeroData } from './sections/theme-hero'
export { featureGridDataSchema, type FeatureGridData } from './sections/feature-grid'
export { pluginComparisonDataSchema, type PluginComparisonData } from './sections/plugin-comparison'
export { trustStripDataSchema, type TrustStripData } from './sections/trust-strip'
export { relatedThemesDataSchema, type RelatedThemesData } from './sections/related-themes'
```

Only core 5 data types are exported individually — Studio needs them for typed section editor components. Stub types stay internal.

### Optional: Upgrade sectionSchema in theme.ts

The current `sectionSchema` uses `z.record(z.string(), z.unknown())` for data. Now that we have per-type schemas, we COULD add discriminated validation here. But this adds complexity to the form schema (react-hook-form needs a stable shape). **Recommendation: keep the current permissive `sectionSchema` in `themeSchema` for form compatibility. Use `validateSectionData()` as a separate validation step before save.** This means:
- Form-level validation: ensures structure (type exists, data is an object)
- Save-level validation: calls `validateSectionData()` per section for type-specific checks

Do NOT change `sectionSchema` in `theme.ts` in this phase.

---

## Files to Modify

**New files:**
- `packages/validators/src/sections/index.ts` — registry
- `packages/validators/src/sections/theme-hero.ts` — core schema
- `packages/validators/src/sections/feature-grid.ts` — core schema
- `packages/validators/src/sections/plugin-comparison.ts` — core schema
- `packages/validators/src/sections/trust-strip.ts` — core schema
- `packages/validators/src/sections/related-themes.ts` — core schema
- `packages/validators/src/sections/before-after.ts` — stub
- `packages/validators/src/sections/video-demo.ts` — stub
- `packages/validators/src/sections/testimonials.ts` — stub
- `packages/validators/src/sections/faq.ts` — stub
- `packages/validators/src/sections/cta-banner.ts` — stub
- `packages/validators/src/sections/stats-counter.ts` — stub
- `packages/validators/src/sections/resource-sidebar.ts` — stub

**Modified files:**
- `packages/validators/src/index.ts` — add section registry exports
- `packages/validators/package.json` — add `@cmsmasters/db` dependency IF needed for `SectionType` import

---

## Acceptance Criteria

- [ ] `packages/validators/src/sections/` directory exists with 13 files (index + 12 types)
- [ ] `SECTION_REGISTRY` has exactly 12 entries — keys match `SectionType` from `@cmsmasters/db`
- [ ] `SECTION_TYPES` derived from registry keys (not hardcoded separately)
- [ ] `SECTION_LABELS` derived from registry (not hardcoded separately)
- [ ] `CORE_SECTION_TYPES` = 5 core types
- [ ] `DEFAULT_THEME_SECTIONS` creates 5 sections with correct default data
- [ ] `validateSectionData()` accepts valid hero data
- [ ] `validateSectionData()` rejects invalid hero data (e.g. screenshots not array)
- [ ] `validateSectionData()` rejects unknown type
- [ ] All exports available from `@cmsmasters/validators`
- [ ] `npx tsc --noEmit --project packages/validators/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit --project packages/db/tsconfig.json` — still 0 errors (no regression)
- [ ] `sectionSchema` in `theme.ts` NOT changed (permissive for form, per-type for save)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. File count
SECTION_FILES=$(ls packages/validators/src/sections/*.ts 2>/dev/null | wc -l)
echo "Section files: $SECTION_FILES (expected: 13)"

# 2. Validators compile
npx tsc --noEmit --project packages/validators/tsconfig.json
echo "(Expected: 0 errors)"

# 3. DB package still compiles (no regression)
npx tsc --noEmit --project packages/db/tsconfig.json
echo "(Expected: 0 errors)"

# 4. Registry smoke test
npx tsx -e "
const { SECTION_REGISTRY, SECTION_TYPES, CORE_SECTION_TYPES, DEFAULT_THEME_SECTIONS, validateSectionData } = require('./packages/validators/src/sections');

console.log('Registry entries:', Object.keys(SECTION_REGISTRY).length, '(expected: 12)');
console.log('SECTION_TYPES:', SECTION_TYPES.length, '(expected: 12)');
console.log('CORE_SECTION_TYPES:', CORE_SECTION_TYPES.length, '(expected: 5)');
console.log('DEFAULT_THEME_SECTIONS:', DEFAULT_THEME_SECTIONS.length, '(expected: 5)');

// Validate good data
const good = validateSectionData({ type: 'theme-hero', data: { headline: 'Hi', screenshots: ['a.jpg'] } });
console.log('Valid hero:', good.success ? '✅' : '❌');

// Validate bad data
const bad = validateSectionData({ type: 'theme-hero', data: { screenshots: 'not-array' } });
console.log('Invalid hero rejected:', !bad.success ? '✅' : '❌');

// Unknown type
const unknown = validateSectionData({ type: 'nonexistent', data: {} });
console.log('Unknown type rejected:', !unknown.success ? '✅' : '❌');

// Stub accepts anything
const stub = validateSectionData({ type: 'faq', data: { whatever: true, nested: { a: 1 } } });
console.log('Stub accepts any data:', stub.success ? '✅' : '❌');
"

echo "=== Phase 2 Verification Complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-004/phase-2-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-004 Phase 2 — Section Registry
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
| `path` | created/modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions for Brain. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| 13 section files | ✅/❌ |
| validators compile | ✅/❌ |
| db compile (no regression) | ✅/❌ |
| Registry has 12 entries | ✅/❌ |
| CORE_SECTION_TYPES = 5 | ✅/❌ |
| DEFAULT_THEME_SECTIONS = 5 | ✅/❌ |
| Valid hero accepted | ✅/❌ |
| Invalid hero rejected | ✅/❌ |
| Unknown type rejected | ✅/❌ |
| Stub accepts any data | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/validators/src/sections/ packages/validators/src/index.ts logs/wp-004/
git commit -m "feat: section registry — core 5 schemas + 7 stubs [WP-004 phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify `sectionSchema` in `theme.ts`.** Keep the permissive `z.record()` for form compatibility. Per-type validation happens via `validateSectionData()` at save time.
- **Do NOT modify any files in `apps/studio/`.** Studio changes are Phase 3+4.
- **Circular dependency risk:** validators→db for `SectionType` import. Use `import type` to keep it type-only (zero runtime). If tsconfig doesn't allow it, define a local `SectionType` that must match db's (the Record<SectionType, ...> typing catches mismatches).
- **`z.record()` in Zod v4 requires 2 args:** `z.record(z.string(), z.unknown())` — use this for stub schemas, NOT `z.record(z.unknown())`.
- **Stub schemas must use `.default({})`.** This ensures `validateSectionData()` works on stubs with empty data.
- **Registry keys must exactly match `SectionType` union.** TypeScript enforces this via `Record<SectionType, SectionRegistryEntry>` — if you miss a type or add an extra, it won't compile. This is the safety net.
