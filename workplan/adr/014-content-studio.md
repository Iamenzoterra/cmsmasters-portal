---
id: 14
title: 'Content Studio — Page Assembler'
version: 4
status: active
category: tooling
relatedADRs: [8, 9, 11, 20, 22, 23]
supersededBy: null
date: 2026-03-30
---

# ADR-014: Content Studio — Page Assembler

> **V4** — від page builder до page assembler. Блоки з Figma, не з форм. Дата: 30 березня 2026.

**V1 (що було):**
- «Форми згенеровані з JSON Schema + markdown editor + live preview»
- Content Studio як generic form editor для контенту в Supabase

**V2 (проміжна):**
- «Structured content editing — forms and rich text editors that map directly to Supabase schema»
- 27-field flat form для themes таблиці. Сім секцій форми.

**V3 (попередня):**
- Section-based page builder з useFieldArray
- Ліва панель: sortable list секцій, expand → per-type form editors
- Права панель: meta sidebar (thumbnail, status, category, price, SEO)
- Per-section editors: кожен тип секції має свій form component
- Проблема: CM бачить форми, не результат. Не знає як блок виглядає поки не відкриє Portal

**V4 (поточна):**
- Page assembler: CM вибирає готові візуальні блоки з бібліотеки
- Блоки = HTML+CSS з Figma. Preview thumbnails показують фінальний вигляд
- CM не редагує дизайн блоку — тільки заповнює дані (тексти, URL, ціни)
- Дизайн блоку змінюється тільки через Figma → regenerate pipeline

---

## Context

Між V3 і V4 прийшло розуміння: Content Manager не повинен бути дизайнером. V3 давала CM контроль над структурою сторінки (add/remove/reorder sections), але кожна секція = абстрактна форма. CM не знав як feature-grid виглядає — бачив тільки поля "icon", "title", "description".

**Founder's insight (30 березня 2026):**
> «Блоки не треба особливо редагувати в Studio. Вони редагуються в Figma і потім апдейтяться. Studio — це "+" кнопка, обрати з бібліотеки, заповнити дані.»

Це радикально спрощує Studio: з full-featured page builder → lightweight page assembler.

## Decision

### Що таке Studio тепер

**Studio = page assembler.** Не page builder. Не WYSIWYG editor. Не CMS-форма.

Workflow:
1. CM створює нову тему → обирає Template (business, portfolio, ecommerce)
2. Template заповнює 85% сторінки готовими блоками з default data
3. CM бачить список блоків з preview thumbnails
4. CM натискає "+" де потрібно → block picker з бібліотеки (preview grid)
5. CM клікає на блок → expands → заповнює дані (тексти, URL, ціни) через auto-generated form
6. CM може: reorder блоки (↑↓), видалити (×), додати нові (+)
7. Save → Supabase → Publish → Portal rebuild

### Що CM НЕ робить в Studio

- Не змінює дизайн блоку (кольори, шрифти, layout) — це Figma
- Не пише HTML/CSS — це Figma → Claude pipeline
- Не бачить WYSIWYG inline editing — бачить form fields + thumbnail preview
- Не дизайнить нові блоки — вибирає з готової бібліотеки

### Studio layout (V4)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Themes / Growth Hive                          /themes/growth-hive│
├────────────────────────────────────────────┬─────────────────────────┤
│                                            │                         │
│  BLOCKS                                    │  META                   │
│                                            │                         │
│  Template: Business ✓                      │  Thumbnail [image]      │
│                                            │  Status: ● Published    │
│  ┌─────────────────────────────────────┐   │  Name: Growth Hive      │
│  │ 1. Hero Carousel     [preview img]  │   │  Tagline: Consulting... │
│  │    ▸ headline, 3 screenshots  [↑↓×] │   │  Category: Business     │
│  └─────────────────────────────────────┘   │  Price: $69             │
│  ┌─────────────────────────────────────┐   │                         │
│  │ 2. Feature Grid 3col [preview img]  │   │  Rating: ★★★★☆          │
│  │    ▸ 12 features              [↑↓×] │   │  Sales: 2,366           │
│  └─────────────────────────────────────┘   │  Trust Badges [chips]   │
│  ┌─────────────────────────────────────┐   │  Compatible [chips]     │
│  │ 3. Plugin Calculator  [preview img] │   │                         │
│  │    ▸ 5 plugins, $148 total    [↑↓×] │   │  Resources:             │
│  └─────────────────────────────────────┘   │    Public [multi]       │
│                                            │    Licensed [multi]     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐   │    Premium [multi]      │
│  │           [+] Add Block             │   │                         │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘   │  Links:                 │
│                                            │    ThemeForest URL      │
│  ┌─────────────────────────────────────┐   │    Demo URL             │
│  │ 4. Trust Strip        [preview img] │   │                         │
│  │    (reads meta.trust_badges)  [↑↓×] │   │  SEO:                   │
│  └─────────────────────────────────────┘   │    Title (0/70)         │
│  ┌─────────────────────────────────────┐   │    Description (0/160)  │
│  │ 5. Related Themes     [preview img] │   │                         │
│  │    ▸ category: business, 4    [↑↓×] │   │                         │
│  └─────────────────────────────────────┘   │                         │
│                                            │                         │
│  [+] Add Block                             │                         │
│                                            │                         │
├────────────────────────────────────────────┴─────────────────────────┤
│  Discard | Delete                                Save Draft | Publish│
└──────────────────────────────────────────────────────────────────────┘
```

### Block Picker (натиснули "+")

```
┌─ Choose a Block ─────────────────────────────────────────────────────┐
│ Search blocks...                           Filter: [All ▼]           │
│                                                                       │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ [preview]    │ │ [preview]    │ │ [preview]    │ │ [preview]    │ │
│ │              │ │              │ │              │ │              │ │
│ │ Hero         │ │ Feature Grid │ │ Plugin Calc  │ │ Before/After │ │
│ │ Carousel     │ │ 3-Column     │ │              │ │ Slider       │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ [preview]    │ │ [preview]    │ │ [preview]    │ │ [preview]    │ │
│ │              │ │              │ │              │ │              │ │
│ │ Testimonials │ │ FAQ          │ │ CTA Banner   │ │ Stats        │ │
│ │ Cards        │ │ Accordion    │ │              │ │ Counter      │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
│                                                                       │
│                                                         [Cancel]     │
└──────────────────────────────────────────────────────────────────────┘
```

Grid з preview thumbnails. Кожен thumbnail = screenshot з Figma або Storybook. CM бачить як блок виглядає ПЕРЕД тим як додати.

### Block Data Editor (expanded block)

Коли CM клікає на блок в списку, він expandається і показує auto-generated form:

```
┌─ 2. Feature Grid 3-Column ──────────── [preview img] ─── [↑↓×] ─┐
│                                                                    │
│  Features:                                                         │
│  ┌─ 1 ──────────────────────────────── [↑↓] [×] ─┐                │
│  │ Icon: [palette ▼]  Title: [12 Demos]           │                │
│  │ Description: [Ready-to-use demo sites for...]  │                │
│  └────────────────────────────────────────────────┘                │
│  ┌─ 2 ──────────────────────────────── [↑↓] [×] ─┐                │
│  │ Icon: [zap ▼]  Title: [70+ Widgets]            │                │
│  │ Description: [CMSMasters Addon included...]    │                │
│  └────────────────────────────────────────────────┘                │
│  [+ Add Feature]                                                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

Form fields generated from block's `schema.ts` (Zod). Repeaters для масивів. Selects для enums. Text inputs для strings. Number inputs для numbers.

### Block update flow (Figma → Studio)

Коли дизайнер змінює блок в Figma:

```
Designer updates block in Figma
  ↓
Developer: "update block hero-carousel-v1"
  ↓
Claude Code via Figma MCP:
  1. Read Figma frame
  2. Generate updated block.astro (HTML+CSS)
  3. Update schema.ts if fields changed
  4. Generate new preview.png
  ↓
Review → Commit → npm/monorepo update
  ↓
Portal: rebuild picks up new HTML
Studio: preview.png updates in block picker
  ↓
Existing themes NOT affected — data stays same, only rendering changes
```

**Критично:** оновлення дизайну блоку НЕ вимагає зміни даних в Supabase. Дані (тексти, URL, ціни) залишаються ті самі. Змінюється тільки як вони рендеряться.

### Що Studio робить окрім тем

По ADR-008 V2, Content Studio також має:
- **Docs Editor** — markdown editor з preview (для документації тем)
- **Blog Editor** — markdown editor для блогу
- **Media Library** — upload на R2, browse, select
- **Collections Manager** — курировані колекції для homepage

Ці частини НЕ використовують block system. Docs/Blog = markdown. Media = file upload. Collections = drag-and-drop ordering.

Block system = тільки для побудови сторінок (theme pages, landing pages, homepage).

### Що зберігається від V3

- **App shell** — Vite SPA, sidebar, topbar, login, routing
- **Themes list** — grid/table з фільтрами, читає `meta.name`, `meta.category`
- **useFieldArray** — sections list add/remove/reorder = та сама механіка
- **Meta sidebar** — ChipSelect, StarRating, CharCounter, all form components
- **DB schema** — `meta` + `sections` + `seo` jsonb = без змін
- **Boundary mappers** — themeRowToFormData / formDataToThemeInsert
- **Auth, toast, error boundaries** — без змін

### Що міняється від V3

- **Section type editors** → auto-generated від block schema (не hand-coded per type)
- **"Add Section" text picker** → visual block picker з preview thumbnails
- **section.type** → **section.block** (field rename — more accurate semantics)
- **Section Registry** → **Block Registry** (rename + preview + .astro templates)
- **Template selection** при створенні нової теми (business, portfolio, etc.)

## Consequences

**Positive:**
- CM бачить блоки з preview — знає що додає
- Дизайн блоків контролюється в Figma — одне джерело правди для візуалу
- Studio простіший — assembler замість builder. Менше коду, менше багів
- Новий блок = Figma → files → автоматично в picker. Нуль змін в Studio коді
- Оновлення дизайну блоку = regenerate HTML, існуючі дані не зачіпаються
- Auto-generated forms від Zod schema — не треба писати form component per block

**Negative / Trade-offs:**
- CM не може змінити дизайн — тільки дані. Для дизайн-змін потрібен Figma → regenerate cycle
- Preview thumbnails потребують генерації і підтримки
- Auto-generated forms менш polish'овані ніж hand-crafted per-type editors
- Template system потребує maintenance (нові templates при нових нішах)

**Addressed changes:**
- ADR-014 V3 → V4: page builder → page assembler
- Узгоджено з ADR-009 V4 (Block-Driven Pages)
- Узгоджено з ADR-023 (Block Library Architecture)
- Узгоджено з ADR-007 V3 (Astro Portal)
