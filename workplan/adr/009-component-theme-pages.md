---
id: 9
title: 'Block-Driven Pages'
version: 4
status: active
category: product
relatedADRs: [7, 8, 10, 14, 15, 20, 23]
supersededBy: null
date: 2026-03-30
---

# ADR-009: Block-Driven Pages

> **V4** — від section-driven до block-driven з трьома рівнями: Block → Template → Theme. Дата: 30 березня 2026.

**V1 (що було):**
- «85% шаблон, 15% customSections» — hardcoded ThemePage з фіксованими секціями
- Порядок зашитий в код. Зміна порядку = зміна React-компоненту

**V2 (проміжна):**
- Reusable React components з three-layer design system
- Все ще hardcoded page composition, тільки компоненти краще організовані

**V3 (попередня):**
- 100% section-driven: `sections[]` масив, кожна секція = `{ type, data }`
- Section Registry з Zod schemas. Порядок з JSON, не з коду
- Studio = page builder з useFieldArray, per-type form editors
- Проблема: секція = абстрактна схема + дані. Як виглядає — вирішує окремий React-компонент. Studio показує форми, не результат. Content Manager не бачить фінальний вигляд

**V4 (поточна):**
- Block = візуальна одиниця з Figma (конкретний HTML+CSS), не абстрактна схема
- Три рівні: Block → Template → Theme
- Studio = page assembler (вибирає блоки з бібліотеки), не form builder
- Блоки редагуються в Figma, не в Studio. Studio тільки збирає і заповнює дані

---

## Context

Аналіз реальної сторінки теми на cmsmasters.studio (Growth Hive, ~4 екрани контенту) показав: сторінка складається з 15-20 візуально різних блоків. Кожен блок — це конкретний дизайн з Figma: hero з каруселлю, grid з іконками, таблиця плагінів з калькулятором, before/after slider, testimonial cards.

V3 abstracts ці блоки до `{ type: "feature-grid", data: {...} }`. Але "feature-grid" може виглядати 10 різних способів. V3 не розрізняє між ними — один React-компонент рендерить один type. Якщо потрібен інший дизайн feature grid — або параметр `variant`, або новий type.

**Рішення founder'а (30 березня 2026):**
> «Блоки з Figma стають HTML. Цей HTML має потрапляти в Studio як ассет. Студія — це "+" секція, вибрати з бібліотеки готових блоків. Блоки не редагуються в Studio — вони редагуються в Figma і потім апдейтяться.»

Це змінює модель: block ≠ abstract section type. Block = **конкретний візуальний компонент з Figma**, з конкретним HTML+CSS і набором редагованих полів.

## Decision

### Три рівні контентної ієрархії

**Block** — одна візуальна одиниця. Конкретний HTML+CSS дизайн з Figma.

Приклади блоків:
- `hero-carousel-v1` — hero з каруселлю скріншотів, назвою, CTA кнопками
- `feature-grid-3col-icons` — 3-колонковий grid з іконками зверху
- `feature-grid-2col-images` — 2-колонковий grid з картинками збоку
- `plugin-value-calc` — таблиця плагінів з калькулятором цінності
- `testimonial-cards-3up` — 3 testimonial cards в ряд
- `before-after-slider` — before/after з drag handle
- `trust-strip-badges` — стрічка trust badges з counter stats

Кожен блок — окремий інстанс. `feature-grid-3col-icons` і `feature-grid-2col-images` — два різних блоки, не один з параметром variant.

**Template** — пресет блоків для типу теми. Заповнює 85% сторінки.

```typescript
// packages/blocks/templates/business.ts
export const businessTemplate = [
  { block: 'hero-carousel-v1', data: {} },
  { block: 'feature-grid-3col-icons', data: { features: [] } },
  { block: 'plugin-value-calc', data: { plugins: [] } },
  { block: 'trust-strip-badges', data: {} },
  { block: 'related-themes-grid', data: { limit: 4 } },
]
```

Інші templates: `portfolio`, `ecommerce`, `blog`, `landing`.

**Theme** — конкретна тема. Template + кастомні блоки + конкретні дані.

Content Manager створює тему → вибирає template → 85% блоків на місцях → натискає "+" в порожніх слотах → додає з бібліотеки → заповнює дані (тексти, URL, ціни).

### Data model (еволюція V3)

DB schema **не міняється** — `meta` + `sections` + `seo` jsonb залишаються. Міняється що всередині `sections`:

```json
{
  "meta": { "name": "Growth Hive", "category": "business", "price": 69, "..." },
  "sections": [
    { "block": "hero-carousel-v1", "data": { "headline": "Build your empire", "screenshots": ["s1.webp"] } },
    { "block": "feature-grid-3col-icons", "data": { "features": [{ "icon": "palette", "title": "12 Demos", "description": "..." }] } },
    { "block": "plugin-value-calc", "data": { "plugins": [{ "name": "ACF PRO", "slug": "acf-pro", "value": 59 }] } },
    { "block": "before-after-slider", "data": { "before": "before.webp", "after": "after.webp" } },
    { "block": "trust-strip-badges", "data": {} },
    { "block": "related-themes-grid", "data": { "limit": 4 } }
  ],
  "seo": { "title": "Growth Hive — WordPress Theme", "description": "..." }
}
```

Зміна від V3: `"type"` → `"block"`. Block ID = конкретний визуальний компонент, не абстрактний тип.

### Block anatomy

Кожен блок в бібліотеці:

```
packages/blocks/
├── registry.ts                    — каталог всіх блоків
├── hero-carousel-v1/
│   ├── block.astro                — HTML+CSS template (з Figma, для Portal)
│   ├── schema.ts                  — Zod schema (editable fields)
│   ├── defaults.ts                — default data для нового блоку
│   ├── preview.png                — thumbnail для Studio picker
│   └── README.md                  — опис, Figma frame reference
├── feature-grid-3col-icons/
│   ├── block.astro
│   ├── schema.ts
│   ├── defaults.ts
│   ├── preview.png
│   └── README.md
```

- `block.astro` — Astro component (HTML+CSS з props). Це вихід Figma → Claude pipeline. **Редагується тільки через Figma → regenerate**, не руками в коді.
- `schema.ts` — Zod schema описує які поля `data` об'єкта можна редагувати (тексти, URL, масиви). Studio генерує форму з цієї schema.
- `defaults.ts` — початкові значення для нового блоку.
- `preview.png` — thumbnail для Studio block picker (screenshot з Figma або Storybook).

### Figma → Block pipeline

```
Designer редагує блок в Figma
  ↓
Trigger: "update block hero-carousel-v1"
  ↓
Claude Code (через Figma MCP):
  1. Читає Figma frame
  2. Генерує block.astro (HTML+CSS)
  3. Оновлює schema.ts якщо поля змінились
  4. Генерує preview.png (screenshot)
  ↓
Review → Commit → Portal rebuild
```

Блоки НЕ редагуються в Studio. Дизайн = Figma → code pipeline. Studio тільки вибирає блоки і заповнює дані.

### Portal renderer (Astro)

```astro
---
// apps/portal/src/pages/themes/[slug].astro
import { BLOCK_COMPONENTS } from '../../blocks/registry'
const { theme } = Astro.props
---
<Layout title={theme.seo.title}>
  <main>
    {theme.sections.map(section => {
      const Block = BLOCK_COMPONENTS[section.block]
      return Block ? <Block {...section.data} meta={theme.meta} /> : null
    })}
  </main>
  <aside>
    <ResourceSidebar resources={theme.meta.resources} meta={theme.meta} />
  </aside>
</Layout>
```

Output: чистий HTML+CSS. 0KB JS (крім islands де потрібен інтерактив).

### Page layout

Сторінка теми має три зони:

```
┌──────────────────────────────────────────────────────────┐
│                    Site Header (nav)                       │
├────────────┬─────────────────────────────┬───────────────┤
│            │                             │               │
│  Left      │  Content Area               │  Right        │
│  Sidebar   │  (blocks from sections[])   │  Sidebar      │
│  (site     │                             │  (theme meta: │
│  specific) │  [hero-carousel-v1]         │  price, buy,  │
│            │  [feature-grid-3col]        │  rating, CTA, │
│            │  [plugin-value-calc]        │  resources)   │
│            │  [before-after-slider]      │               │
│            │  [trust-strip-badges]       │  STICKY       │
│            │  [related-themes-grid]      │               │
│            │                             │               │
├────────────┴─────────────────────────────┴───────────────┤
│                    Site Footer                            │
└──────────────────────────────────────────────────────────┘
```

- **Left sidebar** — site-specific (nav, categories, search). Не керується зі Studio.
- **Content area** — ordered blocks from `sections[]`. Керується зі Studio.
- **Right sidebar** — theme meta (price, rating, CTAs, resources). Fixed component, дані з `meta`.

### Animations

CSS-only на старті:
- Scroll fade-in (`animation-timeline: scroll()` або IntersectionObserver + CSS class toggle)
- Hover effects на кнопки і елементи (`:hover` transitions)
- No JS framework для анімацій

Пізніше (якщо потрібно): vanilla JS snippets або Web Components для carousel, before/after drag. Кожен блок може мати свій `<script>` тег з ~1-2KB inline JS.

## Consequences

**Positive:**
- Block = конкретний дизайн з Figma, не абстракція. Content Manager бачить preview при виборі
- Figma → HTML pipeline: дизайнер змінив — блок оновився. Нуль ручного кодування HTML
- Template = 85% ready. CM тільки заповнює дані і додає 2-3 блоки
- Новий блок = Figma → Claude → файли в бібліотеку → автоматично в Studio picker. Нуль змін в DB
- 0KB JS на Portal (Astro). CSS-only анімації
- AI crawlers бачать чистий semantic HTML
- Той самий DB schema (meta + sections + seo) — WP-004 не переробляється

**Negative / Trade-offs:**
- Кожен варіант дизайну = окремий файл (більше файлів ніж V3 де один component per type)
- Figma → code pipeline потребує налагодження (Claude MCP, review process)
- Preview thumbnails потребують генерації і підтримки
- Два синтаксиси: `.astro` для блоків (Portal), `.tsx` для Studio editors (React)

**Міграція від V3:**
- `sections[].type` → `sections[].block` (rename field)
- Section Registry → Block Registry (rename + add preview thumbnails + .astro templates)
- Zod schemas per type залишаються — вони стають schema per block
- Studio useFieldArray, add/remove/reorder — та сама механіка

**Addressed changes:**
- ADR-009 V3 → V4: section-driven → block-driven, три рівні Block → Template → Theme
- Узгоджено з ADR-007 V3 (Astro Portal)
- Потребує ADR-023 (Block Library Architecture) для деталей pipeline
- ADR-014 → V4: Studio = page assembler з block picker (не form builder)
