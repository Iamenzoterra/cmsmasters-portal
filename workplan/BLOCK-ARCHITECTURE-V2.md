# Block Architecture V2 — DB-Driven Blocks

> Status: DRAFT v2 — потребує підтвердження Brain
> Дата: 2026-03-31
> Замінює: hardcoded packages/blocks/ schemas model
> Контекст: WP-005A Phases 0-2 done (type→block rename), Phases 3-4 cancelled
> Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
> Engine update 2026-04-23 (WP-025 / ADR-025): `@cmsmasters/block-forge-core` ships the pure-function pipeline — `analyzeBlock` → `generateSuggestions` (6 heuristics) → `applySuggestions` / `emitTweak` / `composeVariants` / `renderForPreview`. Consumed by WP-026 (tools/block-forge Vite app) and WP-027 (Studio Responsive tab). See `.context/CONVENTIONS.md` → "Block Forge Core".
> Dev tool update 2026-04-23 (WP-026): `tools/block-forge/` Vite app ships as the first consumer of `@cmsmasters/block-forge-core`. File-based authoring against `content/db/blocks/*.json` at port 7702: pick block → 3-panel preview (1440/768/375) → review ADR-025 suggestions → accept/reject → Save (with backup-on-first-save). Covers the MVP authoring loop before Studio integration (WP-027). See `.claude/skills/domains/infra-tooling/SKILL.md` → "Block Forge".
> Studio integration update 2026-04-23 (WP-027): Studio Block Editor's Responsive tab (`apps/studio/src/pages/block-editor.tsx` + `pages/block-editor/responsive/ResponsiveTab.tsx`) ships as the second consumer of `@cmsmasters/block-forge-core`. 2-tab surface (Editor | Responsive); display-only suggestion list with 6 ADR-025 heuristics; Accept/Reject → form.code dirty → DB save via `updateBlockApi({ variants })` + Hono `/api/content/revalidate` `{}` cache-wide extension (≤15 LOC). Covers the DB-backed authoring loop — complements block-forge's file-backed MVP. See `.context/CONVENTIONS.md` → "Studio Responsive tab conventions".

---

## Core Model

```
Block    = HTML + scoped CSS. Створюється поза Studio (Figma → Claude Code).
           Зберігається в Supabase. Не має полів inline-редагування.
           Має hooks для динамічних даних (price, links).

Template = grid позицій з блоками. CRUD в Studio.
           Не всі позиції заповнені — порожні = "+" для CM.

Theme    = template_id + per-theme block fills (CM заповнює порожні слоти).
           Динамічні дані (price) на рівні theme.meta → hooks підставляють всюди.
```

---

## Position Model

Блоків умовно до 20. Позиції 1–20. Поки вертикальні, але модель не хардкодить напрямок.

```
positions: [
  { position: 1, block_id: null },        ← порожній слот, "+" в Studio
  { position: 2, block_id: null },        ← порожній слот
  { position: 3, block_id: 'uuid-aaa' },  ← з template
  { position: 4, block_id: 'uuid-bbb' },  ← з template
  { position: 5, block_id: null },        ← порожній слот
  ...
  { position: 8, block_id: 'uuid-ccc' },  ← з template
  ...
]
```

Template задає: "на позиціях 3, 4, 8–20 стоять блоки X, Y, Z..."
Theme наслідує template і CM заповнює порожні слоти (1, 2, 5, 6, 7) per-theme блоками.

---

## Flow

### 1. Створення блоку (Дмитро + Claude Code, поза Studio)
1. Figma фрейм → Claude Code генерує HTML + scoped CSS
2. Studio → Blocks → Add
3. Вставляє HTML + CSS, задає name/slug
4. Налаштовує hooks:
   - `price` — CSS selector кнопки ціни (читає theme.meta.price)
   - `links[]` — selector + field name (читає theme.meta.demo_url тощо)
   - `alt` — текст для AI crawlers
5. Зберігає → блок в бібліотеці

### 2. Створення template (CM в Studio)
1. Studio → Templates → New
2. Задає name, кількість позицій (або дефолт 20)
3. На кожній позиції: або обирає блок з бібліотеки, або лишає порожнім
4. Зберігає template

### 3. Створення/редагування theme (CM в Studio)
1. Studio → Theme → обирає template
2. Template блоки займають свої позиції
3. Порожні позиції показують "+"
4. CM натискає "+" → обирає блок з бібліотеки → блок стає на позицію
5. Ці per-theme fills зберігаються в themes.block_fills

### 4. Зміна template → каскад
Змінив template (додав/прибрав блок) → всі themes з цим template оновлюються.
Per-theme fills (CM додані через "+") — залишаються як є.

### 5. Рендеринг (Portal, Astro SSG)
1. Зчитати theme → template_id + block_fills
2. Зчитати template → positions з блоками
3. Merge: template positions + theme fills
4. Для кожного зайнятого position:
   - Рендерити block.html
   - Inject block.css (scoped через class prefix `.block-{slug}`)
   - Resolve hooks: `{{price}}` → theme.meta.price, `{{link:demo_url}}` → theme.meta.demo_url
5. Skip порожні positions (або render placeholder для draft preview)

---

## DB Schema

### blocks
```sql
create table blocks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- 'fast-loading-speed'
  name text not null,                  -- 'Fast Loading Speed'
  html text not null,                  -- raw HTML (Claude Code output)
  css text not null default '',        -- scoped CSS (Claude Code output)

  -- Hooks: dynamic data bindings resolved at render time
  hooks jsonb not null default '{}',
  -- hooks.price: { selector: ".cta-btn" }
  -- hooks.links: [{ selector: ".demo-link", field: "demo_url" }]

  -- Extensible metadata
  metadata jsonb not null default '{}',
  -- metadata.alt: string              -- AI crawler description
  -- metadata.figma_node: string       -- source Figma node ID

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### templates
```sql
create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- 'starter-theme'
  name text not null,
  description text default '',

  -- Ordered positions with optional block assignments
  -- [{ position: 1, block_id: uuid|null }, { position: 2, block_id: uuid|null }, ...]
  positions jsonb not null default '[]',

  max_positions int not null default 20,

  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### themes — migration
```sql
-- DROP old columns (0 rows, safe):
alter table themes drop column if exists sections;

-- ADD new columns:
alter table themes add column template_id uuid references templates(id);

-- Per-theme block fills: CM fills empty template positions
-- [{ position: 1, block_id: uuid }, { position: 5, block_id: uuid }]
alter table themes add column block_fills jsonb not null default '[]';
```

### RLS
```
blocks:  SELECT → authenticated. INSERT/UPDATE/DELETE → content_manager, admin.
templates: SELECT → authenticated. INSERT/UPDATE/DELETE → content_manager, admin.
themes: existing RLS + new columns follow same policy.
```

---

## CSS Isolation

Class prefix per block: `.block-{slug}` wraps all selectors.

```html
<style>
  .block-fast-loading-speed .gauge { ... }
  .block-fast-loading-speed .headline { ... }
</style>
<div class="block-fast-loading-speed">
  <div class="gauge">90+</div>
  <h2 class="headline">Optimized For Fast Loading Speed</h2>
  ...
</div>
```

Чому не `<style scoped>`: scoped deprecated в HTML spec, не всі browsers. Class prefix — надійно, контрольовано, zero JS.

---

## Hook Resolution — Compile-Time (Astro SSG)

Hooks resolve at build time в Astro. Zero JS в output.

```
Block HTML:  <a class="cta-btn">Purchase Theme {{price}}</a>
Hook:        hooks.price = { selector: ".cta-btn" }
Theme meta:  price = 69

Astro build: reads theme.meta.price → replaces {{price}} → outputs:
             <a class="cta-btn">Purchase Theme $69</a>
```

Чому compile-time:
- 0 KB JS на Portal (ADR-007)
- Astro SSG вже має всі дані (theme meta) під час білду
- Простіша модель — string replacement, не runtime binding
- Якщо потрібен runtime (SPA dashboard preview) — fallback до JS replacement тим самим алгоритмом

---

## Block Versioning — Auto-Update

Оновив HTML/CSS блоку → всі themes і templates з цим блоком отримують нову версію.
Немає версіонування. Завжди latest.

Якщо в майбутньому потрібно "заморозити" версію для конкретної теми — додамо `version` поле і snapshot логіку в Epic 2. Зараз — KISS.

---

## What Happens to packages/blocks/

Phase 0-2 (type→block rename): корисна робота, залишається.

`packages/blocks/` pivot:
- **Видалити:** BLOCK_REGISTRY з 12 hardcoded entries, всі schemas, Zod validation, BLOCK_META
- **Залишити/перетворити на:** TypeScript types для API responses (Block, Template, ThemeBlock)
- **Або:** повністю видалити packages/blocks/, типи живуть в packages/db/

Рекомендація: перемістити types в `packages/db/src/types.ts` (де вже живуть всі DB types), видалити `packages/blocks/` як пакет. Менше пакетів = менше resolver issues.

---

## Studio Pages

### Blocks (НОВА сторінка)
- Grid бібліотеки блоків (назва + rendered preview)
- Add: paste HTML + CSS, name, slug, hooks config
- Edit: оновити HTML/CSS/hooks/metadata
- Delete: з dependency check (чи використовується в template)

### Templates (НОВА сторінка)
- List templates
- Create/Edit: сітка позицій, на кожній — "обери блок" або "порожньо"
- Показує скільки themes використовують цей template
- Delete: з dependency check

### Theme Editor (МОДИФІКАЦІЯ)
- Прибрати поточний sections useFieldArray
- Додати: template picker
- Показати позиції template: заповнені (read-only, з template) + порожні ("+")
- CM заповнює порожні позиції блоками з бібліотеки
- Per-theme fills зберігаються в themes.block_fills

---

## Impact on WP-005 Sub-Workplans

| WP | Original | New |
|----|----------|-----|
| **005A** | Hardcoded block library | Phases 0-2 ✅. Phases 3-4 → new WP: DB migration, cleanup packages/blocks/ |
| **005B** | Astro Portal + .astro blocks | Astro Portal renders HTML from DB blocks. No .astro per block. |
| **005C** | Studio SchemaForm assembler | Studio Blocks CRUD + Templates CRUD + Theme editor pivot |
| **005D** | Content pipeline seed | Seed: create blocks from Figma, create templates, assign to themes |

---

## Migration Path (suggested WP order)

```
WP-005A-close  →  cleanup packages/blocks/, move types to db, update validators
                  (small, 1-2 phases)

WP-006         →  Supabase migration: blocks + templates tables, themes alter
                  RLS policies. Hono API endpoints: CRUD blocks, templates
                  (medium, 3-4 phases)

WP-007         →  Studio Blocks page + Templates page + Theme editor pivot
                  (large, 4-5 phases)

WP-008         →  Astro Portal: render blocks from DB, hooks resolution
                  (medium, 3-4 phases)

WP-009         →  Content: seed blocks from Figma, create templates, assign themes
                  (medium, 2-3 phases)
```
