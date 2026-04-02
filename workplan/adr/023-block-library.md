---
id: 23
title: 'Block Library Architecture'
version: 1
status: active
category: product
relatedADRs: [7, 9, 10, 14, 16]
supersededBy: null
date: 2026-03-30
---

# ADR-023: Block Library Architecture

> **V1** — Block Library як центральний елемент контентної платформи. Дата: 30 березня 2026.

---

## Context

ADR-009 V4 визначає три рівні контентної ієрархії: Block → Template → Theme. ADR-014 V4 визначає Studio як page assembler. ADR-007 V3 визначає Astro як Portal framework. Цей ADR описує як Block Library реалізовується технічно: де живуть блоки, з чого складаються, як потрапляють з Figma в код, як рендеряться на Portal, як Studio їх показує.

## Decision

### Block Library = shared package в монорепо

```
packages/blocks/
├── registry.ts                        — каталог всіх блоків + metadata
├── templates/
│   ├── business.ts                    — template: Business theme
│   ├── portfolio.ts                   — template: Portfolio theme
│   ├── ecommerce.ts                   — template: E-commerce theme
│   └── index.ts                       — template registry
│
├── hero-carousel-v1/
│   ├── block.astro                    — HTML+CSS для Portal (Astro component)
│   ├── schema.ts                      — Zod schema для editable fields
│   ├── defaults.ts                    — default data при додаванні блоку
│   ├── preview.png                    — thumbnail для Studio picker (480×320)
│   ├── meta.ts                        — { label, category, figmaFrame }
│   └── README.md                      — документація, Figma reference
│
├── feature-grid-3col-icons/
│   ├── block.astro
│   ├── schema.ts
│   ├── defaults.ts
│   ├── preview.png
│   ├── meta.ts
│   └── README.md
│
├── plugin-value-calc/
│   ├── ...
│
├── (... more blocks)
```

### Block anatomy — 6 файлів

**1. `block.astro`** — візуальне представлення. Astro component = HTML+CSS з props.

```astro
---
// packages/blocks/feature-grid-3col-icons/block.astro
interface Props {
  features: { icon: string; title: string; description: string }[]
  meta?: { name?: string }  // theme meta available if needed
}
const { features } = Astro.props
---
<section class="feature-grid" aria-label="Theme features">
  <div class="grid">
    {features.map(f => (
      <article class="feature-card">
        <div class="feature-icon" aria-hidden="true">{f.icon}</div>
        <h3>{f.title}</h3>
        <p>{f.description}</p>
      </article>
    ))}
  </div>
</section>

<style>
  .feature-grid {
    padding: 80px 0;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .feature-card {
    text-align: center;
    padding: 32px 24px;
  }
  .feature-icon {
    font-size: 32px;
    margin-bottom: 16px;
  }
  h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px;
  }
  p {
    font-size: 14px;
    color: #666;
    margin: 0;
    line-height: 1.6;
  }
</style>
```

Цей файл — output з Figma → Claude pipeline. **Не редагується руками.** Якщо дизайнер змінив блок в Figma → regenerate цей файл.

CSS scoped до компонента (Astro scoped styles). Нуль глобальних стилів. Нуль залежностей.

**2. `schema.ts`** — Zod schema описує editable fields.

```typescript
// packages/blocks/feature-grid-3col-icons/schema.ts
import { z } from 'zod'

export const schema = z.object({
  features: z.array(z.object({
    icon: z.string().default(''),
    title: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
})

export type Data = z.infer<typeof schema>
```

Studio автоматично генерує форму з цієї schema: масив → repeater, string → text input, number → number input, boolean → checkbox.

**3. `defaults.ts`** — default data коли CM додає блок.

```typescript
// packages/blocks/feature-grid-3col-icons/defaults.ts
import type { Data } from './schema'

export const defaults: Data = {
  features: [
    { icon: '🎨', title: 'Feature title', description: 'Feature description' },
  ],
}
```

**4. `preview.png`** — thumbnail для Studio block picker. 480×320px. Генерується зі Storybook screenshot або Figma export.

**5. `meta.ts`** — metadata для registry і picker.

```typescript
// packages/blocks/feature-grid-3col-icons/meta.ts
export const meta = {
  label: 'Feature Grid — 3 Column with Icons',
  category: 'features',         // для фільтрації в picker
  figmaFrame: '3456:789',       // reference для update pipeline
  description: 'Three-column grid with icon, title, and description per feature',
}
```

**6. `README.md`** — документація для розробників.

### Block Registry

```typescript
// packages/blocks/registry.ts
import type { z } from 'zod'

export interface BlockRegistryEntry {
  schema: z.ZodSchema
  defaults: Record<string, unknown>
  meta: {
    label: string
    category: string
    figmaFrame?: string
    description?: string
  }
  previewUrl: string  // path to preview.png
}

// Auto-discovered або explicit:
export const BLOCK_REGISTRY: Record<string, BlockRegistryEntry> = {
  'hero-carousel-v1': {
    schema: heroCarouselSchema,
    defaults: heroCarouselDefaults,
    meta: heroCarouselMeta,
    previewUrl: '/blocks/hero-carousel-v1/preview.png',
  },
  'feature-grid-3col-icons': {
    schema: featureGrid3colSchema,
    defaults: featureGrid3colDefaults,
    meta: featureGrid3colMeta,
    previewUrl: '/blocks/feature-grid-3col-icons/preview.png',
  },
  // ... all blocks
}

// Derived
export const BLOCK_IDS = Object.keys(BLOCK_REGISTRY)
export const BLOCK_CATEGORIES = [...new Set(
  Object.values(BLOCK_REGISTRY).map(b => b.meta.category)
)]
```

**Portal** imports `block.astro` files для rendering.
**Studio** imports `schema`, `defaults`, `meta`, `previewUrl` для picker і form generation.
Обидва читають з одного package — single source of truth.

### Template Registry

```typescript
// packages/blocks/templates/business.ts
export const businessTemplate = {
  label: 'Business & Consulting',
  description: 'Hero, features, plugins, trust badges, and related themes',
  blocks: [
    { block: 'hero-carousel-v1', data: {} },
    { block: 'feature-grid-3col-icons', data: { features: [] } },
    { block: 'plugin-value-calc', data: { plugins: [] } },
    { block: 'trust-strip-badges', data: {} },
    { block: 'related-themes-grid', data: { limit: 4 } },
  ],
}

// packages/blocks/templates/portfolio.ts
export const portfolioTemplate = {
  label: 'Portfolio & Creative',
  description: 'Hero, gallery, case studies, testimonials, contact CTA',
  blocks: [
    { block: 'hero-minimal-v1', data: {} },
    { block: 'gallery-masonry', data: { images: [] } },
    { block: 'testimonial-cards-3up', data: { quotes: [] } },
    { block: 'cta-banner-v1', data: {} },
  ],
}
```

Studio shows template picker при створенні нової теми. CM обирає → blocks pre-populated → CM заповнює дані.

### Figma → Block pipeline (ADR-009 V4, detail)

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────┐
│  Figma   │ ──→ │ Claude Code │ ──→ │ Block files   │ ──→ │ Review │
│  design  │     │ (Figma MCP) │     │ in monorepo   │     │ + merge│
└─────────┘     └─────────────┘     └──────────────┘     └────────┘
```

**Create new block:**
1. Designer creates Figma frame (named: "Block / Feature Grid 3-Column Icons")
2. Developer: `"create block feature-grid-3col-icons from Figma frame 3456:789"`
3. Claude Code via `Figma:get_design_context`:
   - Reads frame structure, styles, text content
   - Generates `block.astro` (HTML+CSS)
   - Generates `schema.ts` (infers editable fields from text layers, image placeholders)
   - Generates `defaults.ts` (from example content in Figma)
   - Generates `meta.ts` (label from frame name, category inferred)
   - Exports preview.png from Figma via `Figma:get_screenshot`
4. Adds entry to `registry.ts`
5. Developer reviews, adjusts schema if needed, commits

**Update existing block:**
1. Designer modifies Figma frame
2. Developer: `"update block feature-grid-3col-icons"`
3. Claude Code:
   - Re-reads Figma frame
   - Regenerates `block.astro` (HTML+CSS updated)
   - Checks if schema changed (new fields, removed fields)
   - If schema unchanged → only `block.astro` + `preview.png` updated. Zero data migration.
   - If schema changed → flags for review. Developer decides: migrate existing data or version the block (`feature-grid-3col-icons-v2`)
4. Developer reviews, commits

**Critical rule:** блок update що не змінює schema = safe, automatic. Блок update що змінює schema = manual review + possible data migration.

### Animation approach

CSS-only на старті (ADR-009 V4):

```css
/* Scroll-triggered fade-in */
.feature-card {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.feature-card.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Hover */
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
```

IntersectionObserver для `.visible` toggle — один спільний script на сторінку (~0.5KB):

```html
<!-- Shared across all blocks, loaded once -->
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
  }, { threshold: 0.1 })
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el))
</script>
```

Блоки що потребують `data-animate` додають його в HTML. Блоки без анімації — ні.

Пізніше: Web Components для carousel (`<cms-carousel>`), before/after (`<cms-before-after>`). Self-contained, ~1-2KB кожен. Додаються як inline `<script>` в `block.astro` конкретного блоку.

### MD + JSON output (ADR-016)

При білді Portal, окрім HTML генеруються:

**Markdown per theme:**
```
/themes/growth-hive/index.md
```

Кожен блок в registry може мати optional `toMarkdown()`:

```typescript
// packages/blocks/feature-grid-3col-icons/markdown.ts
export function toMarkdown(data: Data): string {
  return [
    '## Features',
    '',
    ...data.features.map(f => `- **${f.title}** — ${f.description}`),
  ].join('\n')
}
```

Build script iterates `sections[]`, calls `toMarkdown()` per block, concatenates.

**JSON per theme:**
```
/api/themes/growth-hive.json
```

Просто `JSON.stringify(theme)` — meta + sections + seo as-is.

**llms.txt:**
```
/llms.txt
```

Index всіх сторінок з descriptions. Генерується при білді.

### Dependency graph

```
packages/blocks/         — Block Library (schemas, defaults, meta, previews, .astro templates)
    ↑                        ↑
    │                        │
apps/portal/ (Astro)     apps/studio/ (Vite React)
  imports block.astro      imports schema, defaults, meta, previewUrl
  renders HTML+CSS         shows picker + auto-generates forms
```

`packages/blocks` = shared package. Portal and Studio consume different parts of it. Portal needs `.astro` files. Studio needs `.ts` files (schema, defaults, meta). Both read from `registry.ts`.

**Important:** `block.astro` files are Astro-specific. Studio (React) does NOT import them. Studio only uses TypeScript exports (schema, defaults, meta, previewUrl). This keeps Studio framework-agnostic regarding block rendering.

## Consequences

**Positive:**
- Single source of truth для блоків — один package, два споживачі
- Figma → code pipeline: дизайнер → developer trigger → Claude → files → review
- Schema-driven forms: Studio auto-generates UI від Zod schema. Нуль hand-coded editors per block
- Safe updates: schema-stable update = only HTML+CSS changes. Existing data untouched
- 0KB JS baseline: CSS scoped styles, CSS animations, minimal shared JS for scroll-trigger
- AI-friendly: semantic HTML, MD output per block, JSON API, llms.txt

**Negative / Trade-offs:**
- `.astro` files = Portal-specific. Якщо Portal framework зміниться — regenerate HTML templates
- Preview thumbnails потребують maintenance (regenerate при кожному block update)
- Auto-generated forms less polished ніж hand-crafted. Acceptable for assembler UX
- Block versioning (v1, v2) може привести до sprawl. Mitigated: deprecate old versions, migrate data

**Future extensions:**
- **Story Builder (WP-005 Part 3):** UI для створення блоків без CLI. Вибираєш Figma frame → AI генерує → review → publish
- **Live preview in Studio:** iframe рендерить Portal Astro components в preview mode
- **AI content generation:** "Generate features for Growth Hive" → AI fills data fields based on ThemeForest page
- **Block marketplace:** third-party designers contribute blocks з preview + schema

**Addressed changes:**
- New ADR, referenced by ADR-007 V3, ADR-009 V4, ADR-014 V4
- Supersedes informal section registry from WP-004 (now Block Registry)
- Defines Figma → code pipeline formally
- Defines animation approach (CSS-first + minimal JS)
- Defines MD/JSON output per block
