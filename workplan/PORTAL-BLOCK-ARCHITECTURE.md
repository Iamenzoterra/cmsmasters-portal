# Portal & Block Architecture Spec

> Результат брейнсторму 30 березня — 2 квітня 2026.
> Визначає що таке Portal, як працюють blocks, як Studio керує контентом, як global elements розподіляються по сторінках.
> Last updated: 2 April 2026 — added global elements with scope binding, two page types, two sidebars on theme pages, removed per-page block refs.

---

## Core Decisions (зафіксовані)

### 1. Portal = тупий статичний фронтенд
Portal — не Next.js апка. Не React SPA. Це папка зі згенерованими HTML+CSS файлами на CDN (Astro SSG). Без власної логіки. Без серверного рендерингу. Build process бере дані зі Studio (Supabase) і генерує статичні файли. Deploy = закинути на CDN.

### 2. Studio = мозок всього контенту
Studio керує:
- **Pages** — статичні сторінки (home, about, pricing) — type `composed`
- **Pages** — layout wrappers (theme page) — type `layout`
- **Themes** — продуктові сторінки тем (окрема таблиця, бо це продукт)
- **Block Library** — бібліотека блоків для складання сторінок
- **Global Elements** — header, footer, sidebars з scope binding
- **Block Inspector** — хуки, альти, responsive breakpoints
- **Templates** — position grids for theme content blocks

### 3. Block = завжди template
Кожен block — template з можливістю мати hooks і slots. Деякі мають 0 hooks і 0 slots (чисто статичні). Уніфікована модель, єдиний workflow створення і використання.

### 4. Entitlement = hook type
Умовний контент (sidebar з замочками, "Purchase now" vs "Download") — це не окрема система. Це hook type `entitlement` в block model. Маленький клієнтський JS (~2KB) резолвить entitlements і toggle visibility. Сторінка залишається статичною.

### 5. Дві таблиці контенту + окремі docs
- `pages` — сторінки (два типи: layout і composed)
- `themes` — продуктові сторінки тем (може продаватися напряму в Epic 2)
- `docs` — пізніше, своя логіка

### 6. Два типи сторінок (pages)
- **`layout`** — обгортка для динамічного контенту. Одна layout page → багато тем. Визначає ЩО навколо theme content (через global elements з scope). Приклад: "theme-page" — всі 65 тем використовують цей layout.
- **`composed`** — повна сторінка зібрана з blocks. Одна page = один URL. Blocks через `page_blocks` таблицю. Приклад: homepage, about, pricing.

### 7. Global Elements з scope binding (замість per-page block refs)
Header, footer, sidebars — це НЕ поля на pages таблиці. Це окрема таблиця `global_elements` де кожен елемент має **slot** і **scope**:

```
Slots: header | footer | sidebar-left | sidebar-right

Scopes:
  'sitewide'              — на кожній сторінці (default)
  'composed:*'            — на всіх composed pages
  'composed:homepage'     — тільки на homepage
  'layout:*'              — на всіх layout pages
  'layout:themes'         — тільки на theme layout pages

Priority: higher wins when multiple scopes match
  0  = sitewide (default fallback)
  10 = type-specific (composed:*, layout:*)
  20 = page-specific (composed:homepage, layout:themes)
```

Це дає:
- Homepage header відрізняється від header на theme pages
- Right sidebar (theme params) — тільки `layout:themes`
- Left sidebar (entitlement) — тільки `layout:themes`
- Footer sitewide або per-scope override

**Resolution algorithm:** для конкретної сторінки знайти всі global_elements де scope матчить, для кожного slot обрати елемент з найвищим priority.

### 8. Два сайдбари на theme page
Theme page має два сайдбари:
- **sidebar-left** — залежить від ролі/entitlement (Purchase now, Add to collection, Ask anything, Read online docs, Chatbot support, Ticket support, Best practices, Video tutorials). Block з entitlement hooks — показує/ховає елементи залежно від auth стану. Scope: `layout:themes`.
- **sidebar-right** — theme related параметри (ціна, рейтинг, trust badges, included plugins, resources по тірах). Block з theme data hooks. Scope: `layout:themes`.

### 9. Responsive — per-block breakpoint management
Кожен block має 3 стратегії per-breakpoint:
- **Resize** — CSS масштабує (найпростіше)
- **Redesign** — інший інстанс для breakpoint
- **Hide** — не показувати на breakpoint

### 10. Block creation pipeline
```
1. Figma → дизайн блоку
2. Claude Code → HTML+CSS+JS з токенами
3. Витягуєш картинки → CF Images / R2
4. Studio → імпорт → токени applied, хардкод вичищений
5. Inspector → хуки (ціна, alt, responsive breakpoints)
6. Save → block в бібліотеці
7. Сторінка → "+" → обрати block → готово
```

---

## DB Schema (actual — 2 April 2026)

9 таблиць в public schema:

### blocks (бібліотека)
```sql
blocks (id, slug, name, html, css, hooks jsonb, metadata jsonb, created_by, created_at, updated_at)
```
- hooks: `{price: {selector: ".cta-btn"}, links: [{selector: ".demo-link", field: "demo_url"}]}`
- metadata: `{alt: "...", figma_node: "..."}`

### templates (position grids для тем)
```sql
templates (id, slug, name, description, positions jsonb, max_positions int, created_by, created_at, updated_at)
```
- positions: `[{position: 1, block_id: null}, {position: 2, block_id: "uuid"}, ...]`

### themes (продукт)
```sql
themes (id, slug, status, meta jsonb, seo jsonb, template_id uuid→templates, block_fills jsonb, created_by, created_at, updated_at)
```
- meta: `{name, tagline, price, rating, sales, demo_url, themeforest_url, trust_badges[], resources{}, ...}`
- block_fills: `[{position: 1, block_id: "uuid"}, ...]` — CM fills empty template positions

### pages (layout + composed)
```sql
pages (id, slug, title, type, seo jsonb, status, created_by, created_at, updated_at)
```
- type: `'layout'` або `'composed'`
- НЕ має header/footer/sidebar refs — це через global_elements

### page_blocks (blocks на composed pages)
```sql
page_blocks (id, page_id→pages, block_id→blocks, position int, config jsonb, created_at)
```
- config: `{slots: {theme-1: "growth-hive"}, hooks: {headline: "Custom text"}}`
- UNIQUE constraint: (page_id, position)

### global_elements (scope-bound layout elements)
```sql
global_elements (id, slot text, block_id→blocks, scope text, priority int, created_by, created_at, updated_at)
```
- slot: `'header'` | `'footer'` | `'sidebar-left'` | `'sidebar-right'`
- scope: `'sitewide'` | `'composed:*'` | `'composed:homepage'` | `'layout:*'` | `'layout:themes'`
- priority: 0 (sitewide) → 10 (type) → 20 (specific)
- UNIQUE constraint: (slot, scope)

### profiles, licenses, audit_log
Unchanged from Layer 0.

---

## Block Model (TypeScript)

```typescript
interface Block {
  id: string
  slug: string
  name: string
  version: number

  html: string              // Clean HTML with token classes
  css: string               // Scoped CSS using design tokens
  js: string | null         // Interactive JS or null

  hooks: BlockHook[]        // 0..N
  slots: BlockSlot[]        // 0..N

  breakpoints: {
    desktop: BreakpointConfig
    tablet: BreakpointConfig
    mobile: BreakpointConfig
  }

  metadata: Record<string, unknown>
}

interface BlockHook {
  name: string              // "theme-price", "purchase-cta"
  type: HookType
  selector: string          // CSS selector: ".price-value"
  config: Record<string, unknown>
}

type HookType =
  | 'static_text'           // Editable text
  | 'theme.price'           // From theme.meta.price
  | 'theme.rating'          // From theme.meta.rating
  | 'theme.sales'
  | 'theme.name'
  | 'entitlement'           // Show/hide based on user entitlements (ADR-005 V2)
  | 'custom'

interface BlockSlot {
  name: string              // "theme-1"
  accepts: string           // "theme-card"
  selector: string          // ".slot-1"
}

type BreakpointConfig = {
  strategy: 'resize' | 'redesign' | 'hidden'
  instance_id?: string      // For redesign: alt block instance
}
```

---

## Entitlement Hooks (client-side, ~2KB)

Build generates ALL states in HTML, hidden by default:

```html
<div class="entitlement-zone" data-hook="purchase-cta" data-show="guest,registered">
  <button>Purchase now — $69</button>
</div>
<div class="entitlement-zone" data-hook="download-btn" data-show="licensed:this-theme" style="display:none">
  <a href="/api/download/growth-hive">Download Theme</a>
</div>
```

Inline JS (~2KB):
```javascript
(async () => {
  const session = await supabase.auth.getSession()
  if (!session) return  // Guest — default state already visible
  const entitlements = await fetch('/api/entitlements')
  document.querySelectorAll('[data-hook]').forEach(el => {
    const showFor = el.dataset.show.split(',')
    el.style.display = resolveVisibility(showFor, entitlements) ? '' : 'none'
  })
})()
```

Pages remain static. JS only toggles visibility.

---

## Build Process (Astro SSG)

```
Studio (Supabase data)
  ↓
Astro build
  ↓
  ├── For each page WHERE type='composed' AND status='published':
  │   1. Fetch page + page_blocks (ordered)
  │   2. Resolve global_elements for this page's scope
  │   3. Render: header → blocks → footer
  │   4. SEO from page.seo
  │   5. Output: dist/[slug]/index.html
  │
  ├── For each theme WHERE status='published':
  │   1. Fetch theme (meta + template + block_fills)
  │   2. Resolve global_elements for scope 'layout:themes'
  │   3. Merge template positions + block_fills → ordered blocks
  │   4. Render: header → sidebar-left → content blocks → sidebar-right → footer
  │   5. Resolve hooks: {{price}} → theme.meta.price
  │   6. SEO from theme.seo + JSON-LD Product
  │   7. Inject entitlement resolver JS (~2KB)
  │   8. Output: dist/themes/[slug]/index.html
  │
  └── Deploy dist/ to CDN (CF Pages)
```

### Global Elements Resolution at Build Time

```typescript
function resolveGlobalElements(
  pageType: 'layout' | 'composed',
  pageSlug: string,
  allGlobalElements: GlobalElement[]
): Record<GlobalSlot, Block | null> {
  const result: Record<GlobalSlot, Block | null> = {
    header: null, footer: null, 'sidebar-left': null, 'sidebar-right': null
  }
  
  for (const slot of ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const) {
    const candidates = allGlobalElements
      .filter(ge => ge.slot === slot)
      .filter(ge => matchesScope(ge.scope, pageType, pageSlug))
      .sort((a, b) => b.priority - a.priority)
    
    result[slot] = candidates[0]?.block ?? null
  }
  return result
}

function matchesScope(scope: string, pageType: string, pageSlug: string): boolean {
  if (scope === 'sitewide') return true
  if (scope === `${pageType}:*`) return true
  if (scope === `${pageType}:${pageSlug}`) return true
  return false
}
```

---

## Studio UI (expanded scope)

```
Studio Sidebar:
├── 📄 Pages                    ← page list + page composer (layout/composed)
├── 🎨 Themes                   ← theme list + template picker + block fills
├── 🧱 Blocks                   ← block library browser + editor
├── 📐 Templates                ← position grid editor
├── 🌐 Global Elements          ← scope-based slot configuration
├── 🖼 Media                     ← R2 media browser
└── ⚙ Settings
```

### Global Elements Settings Page
```
┌─ Global Elements ─────────────────────────────────┐
│                                                     │
│  HEADER                                             │
│  ┌─────────────────────────────────────────────┐    │
│  │ sitewide (priority 0)    [header-main ▾]    │    │
│  │ layout:themes (priority 20) [header-theme ▾]│    │
│  │ [+ Add scope override]                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  FOOTER                                             │
│  ┌─────────────────────────────────────────────┐    │
│  │ sitewide (priority 0)    [footer-main ▾]    │    │
│  │ [+ Add scope override]                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  SIDEBAR-LEFT                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │ layout:themes (priority 20) [theme-sidebar-left ▾]│
│  │ [+ Add scope override]                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  SIDEBAR-RIGHT                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ layout:themes (priority 20) [theme-sidebar-right ▾]│
│  │ [+ Add scope override]                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│                              [Save]                 │
└─────────────────────────────────────────────────────┘
```

---

## Theme Page Layout (two sidebars)

```
┌─ header (from global_elements, scope sitewide or layout:themes) ─────┐
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  sidebar-left          content                      sidebar-right    │
│  (entitlement)         (template blocks              (theme params)  │
│                         + block fills)                               │
│  ┌──────────┐          ┌──────────────────┐         ┌──────────┐    │
│  │Purchase  │          │ Block pos 1      │         │ $69      │    │
│  │now       │          │ (hero area)      │         │ ★★★★☆    │    │
│  │          │          ├──────────────────┤         │ 2,366    │    │
│  │Add to    │          │ Block pos 2      │         │ sales    │    │
│  │collection│          │ (features)       │         │          │    │
│  │          │          ├──────────────────┤         │ Plugins: │    │
│  │Ask any   │          │ Block pos 3      │         │ ACF $59  │    │
│  │Read docs │          │ (plugins)        │         │ Rev $29  │    │
│  │Chatbot   │          ├──────────────────┤         │          │    │
│  │Ticket    │          │ Block pos 4      │         │ Resources│    │
│  │Practices │          │ (demo showcase)  │         │ 🔓 docs  │    │
│  │Videos    │          ├──────────────────┤         │ 🔒 psd   │    │
│  │          │          │ Block pos 5      │         │ ⭐ prio  │    │
│  └──────────┘          │ (trust strip)    │         └──────────┘    │
│                        └──────────────────┘                          │
│                                                                      │
├─ footer (from global_elements, scope sitewide) ─────────────────────┤
└──────────────────────────────────────────────────────────────────────┘
```

- sidebar-left: block з entitlement hooks (data-show="guest", "licensed:this-theme", etc.)
- sidebar-right: block з theme.* hooks ({{price}}, {{rating}}, {{sales}}, resource tiers)
- Both sidebars: scope `layout:themes` in global_elements — NOT on other pages
- Content: blocks from template positions + theme block_fills, rendered in order

---

## Implementation Order

```
WP-005D Phase 1: Studio Pages + Global Elements + seed
  └─ Types, queries, API, Studio UI for pages + global_elements
  └─ Create header, footer, 2 sidebar blocks
  └─ Configure global_elements with scopes

WP-005D Phase 2: Astro Portal + theme page render
  └─ apps/portal/ Astro SSG
  └─ Global elements resolution at build time
  └─ Theme page: header → sidebar-left → blocks → sidebar-right → footer

WP-005D Phase 3: Composed pages + homepage
  └─ Catch-all route for composed pages
  └─ Homepage blocks + assembly

WP-005D Phase 4: SEO + content seed
  └─ JSON-LD, OG, sitemap
  └─ 5+ real blocks from Figma

WP-005D Phase 5: Docs + close
```

---

## Open Questions (for future sessions)

1. **Block versioning** — when block HTML updated, auto-update all usages or pin version?
2. **Build trigger** — Studio publish → webhook → Astro build → CF Pages deploy. What runs the build?
3. **Dev preview** — how does CM preview before publishing? Localhost Astro build? Staging?
4. **Theme section↔block mapping** — 1:1 or can same data render via different block designs?
5. **Docs pages** — separate table with own logic (confirmed "пізніше")
6. **Search (Meilisearch)** — homepage hero search, theme catalog search — separate WP
