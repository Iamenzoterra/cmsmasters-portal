# Page Creation Flow — Operator + Claude Code Protocol

> Живий процес створення layout або composed сторінки.
> Кожна нова сторінка проходить цей flow. Результат — layout block в бібліотеці + page spec документ.

---

## Overview

```
1. FIGMA        → Дмитро малює макет з зонами і розмірами
2. ВЕРСТКА      → Claude Code створює HTML+CSS grid з дизайн токенами
3. ЧЕКЛІСТ      → Claude Code питає оператора про кожен елемент
4. ІМПЛЕМЕНТАЦІЯ → Розставляє tokens, пише responsive, додає triggers
5. STUDIO       → Імпорт як block, вичищення хардкоду
6. GLOBAL ELEMENTS → Конфігурація slots зі scopes
7. SPEC         → Документ PAGE-SPEC-{slug}.md зберігається поряд з workplan
```

---

## Step 1: Figma

Дмитро створює 3 артефакти:
1. **Готовий макет** — як має виглядати сторінка (скрін 1)
2. **Slot map** — розподіл сторінки на зони з підписами (скрін 2)
3. **Spacing spec** — відступи, розміри, вирівнювання (скрін 3)

Не обов'язково pixel-perfect — але структура і пропорції мають бути зрозумілі.

---

## Step 2: Верстка (Claude Code)

Claude Code бере Figma і створює **тільки layout structure** — HTML+CSS:
- CSS Grid для загальної структури (колонки, рядки, areas)
- Дизайн токени (var(--spacing-*), var(--bg-*), hsl(var(--text-*)))
- Manrope font
- Responsive breakpoints + sidebar trigger UI + push/overlay behavior
- Порожні slot-зони з data-атрибутами (data-slot="header", data-slot="sidebar-left", etc.)

**ВАЖЛИВО — Layout НЕ містить контенту:**
- Header, footer, sidebars, content blocks — це все **динамічний контент** який підставляється build process (Astro SSG) через slot resolution з `global_elements` таблиці.
- Layout не знає і не має знати ЩО буде всередині кожного slot. Він визначає тільки ДЕ зона розташована, які відступи, як поводиться на різних breakpoints.
- Кожна зона в HTML — порожній `<div data-slot="...">` з CSS розмірами. Без тексту, без кнопок, без навігації, без placeholder імітації контенту.
- Для візуальної перевірки layout кожна зона отримує фоновий колір і CSS `::after` з назвою slot (напр. "slot:header") — це чистий CSS, не контент.

Output: робочий HTML файл який можна відкрити в браузері і побачити **grid structure з кольоровими зонами**.

---

## Step 3: Чекліст (КРИТИЧНИЙ)

> **⚠️ No-code step.** Чекліст — це збір інформації для Page Spec документа (Step 7). Тут НЕ пишеться код. Claude Code тільки питає оператора і записує відповіді. Вся інформація з чеклісту йде в PAGE-SPEC-{slug}.md — вона потрібна для build process (Astro SSG), Studio конфігурації та global_elements setup. Не для layout HTML.

Claude Code проходить по КОЖНОМУ елементу/зоні на сторінці і питає оператора:

### 3.1 Element Classification

Для кожного елементу:

```
┌─────────────────────────────────────────────────────┐
│ Елемент: ________                                    │
│                                                       │
│ Q1: Це що?                                           │
│   ○ slot       — сюди вставляється global element     │
│                  (header, footer, sidebar)             │
│   ○ meta       — дані з theme/page                    │
│                  (name, tagline, price)                │
│   ○ content    — сюди рендеряться blocks               │
│                  (template positions + fills)           │
│   ○ static     — захардкожений контент в layout        │
│                  (декоративний елемент, роздільник)     │
│                                                       │
│ Q2: (якщо slot) Який slot name?                       │
│   ○ header                                            │
│   ○ footer                                            │
│   ○ sidebar-left                                      │
│   ○ sidebar-right                                     │
│   ○ custom: ________                                  │
│                                                       │
│ Q3: (якщо meta) Яке поле?                             │
│   theme.meta.________ (name, tagline, price, etc.)    │
│   або page.________ (title)                           │
│                                                       │
│ Q4: (якщо slot) Який scope?                           │
│   ○ sitewide           — на кожній сторінці           │
│   ○ layout:themes      — тільки на theme pages        │
│   ○ composed:homepage  — тільки на homepage            │
│   ○ composed:*         — на всіх composed pages       │
│   ○ custom: ________                                  │
└─────────────────────────────────────────────────────┘
```

### 3.2 Responsive per Element

Для кожного елементу (крім static):

```
┌─────────────────────────────────────────────────────┐
│ Елемент: ________                                    │
│                                                       │
│ Desktop (>1280px):                                    │
│   [як на макеті — default]                            │
│                                                       │
│ Tablet (768–1280px):                                  │
│   ○ resize   — CSS масштабує, той самий layout         │
│   ○ redesign — інший layout (опиши як)                │
│   ○ hide     — не показувати                          │
│                                                       │
│ Mobile (<768px):                                      │
│   ○ resize   — CSS масштабує                          │
│   ○ redesign — інший layout (опиши як)                │
│   ○ hide     — не показувати                          │
│                                                       │
│ (якщо hide) Є trigger для показу?                     │
│   ○ ні — елемент просто відсутній                     │
│   ○ hamburger menu tap                                │
│   ○ swipe from edge                                   │
│   ○ tab/accordion switch                              │
│   ○ floating button tap                               │
│   ○ інше: ________                                    │
│                                                       │
│ (якщо redesign) Опис нового layout:                   │
│   ________________________________________             │
└─────────────────────────────────────────────────────┘
```

### 3.3 Content Area Details (if applicable)

```
┌─────────────────────────────────────────────────────┐
│ Content area: ________                               │
│                                                       │
│ Що тут рендериться?                                   │
│   ○ template blocks (positions з theme template)      │
│   ○ page_blocks (composed page blocks in order)       │
│                                                       │
│ Layout всередині:                                     │
│   ○ vertical stack (blocks один під одним)            │
│   ○ grid (blocks в сітці N×M)                         │
│   ○ custom: ________                                  │
│                                                       │
│ Gap між blocks: ________ px (or token)                │
└─────────────────────────────────────────────────────┘
```

---

## Step 4: Імплементація (Claude Code)

На основі відповідей з чеклісту:

1. Замінює placeholder зони на відповідні tokens:
   - `{{slot:header}}`, `{{slot:sidebar-left}}`, etc.
   - `{{meta:name}}`, `{{meta:tagline}}`, etc.
   - `{{slot:content}}` для content area

2. Пише responsive CSS:
   ```css
   /* Desktop — default */
   .theme-layout .content-area {
     display: grid;
     grid-template-columns: 220px 1fr 280px;
     gap: 48px;
   }
   
   /* Tablet — sidebars hidden, triggers added */
   @media (max-width: 1280px) {
     .slot-sidebar-left,
     .slot-sidebar-right { display: none; }
     .sidebar-trigger { display: flex; }
   }
   
   /* Mobile — single column */
   @media (max-width: 768px) {
     .theme-layout .content-area {
       grid-template-columns: 1fr;
     }
   }
   ```

3. Додає trigger UI (якщо sidebar ховається):
   ```html
   <button class="sidebar-trigger sidebar-trigger--left" aria-label="Open menu">
     <svg>...</svg>
   </button>
   ```
   + мінімальний JS для toggle (~1KB)

---

## Step 5: Studio Import

Оператор заносить layout block в Studio:
1. Studio → Blocks → Add
2. Paste HTML + CSS
3. Name: "Theme Page Layout" / "Homepage Layout"
4. Metadata: `{ is_layout: true, page_type: "layout" }`
5. Save

Studio вичищає хардкод:
- Кольори → CSS variables
- Розміри → design tokens де можливо
- Шрифти → Manrope через token

---

## Step 6: Global Elements Configuration

В Studio → Global Elements:
- Призначити blocks на slots з правильними scopes
- Приклад для theme page:

```
header:        block "header-main",       scope "sitewide",       priority 0
footer:        block "footer-main",       scope "sitewide",       priority 0
sidebar-left:  block "theme-sidebar-left", scope "layout:themes", priority 20
sidebar-right: block "theme-sidebar-right", scope "layout:themes", priority 20
```

---

## Step 7: Page Spec Document

Зберегти результат чеклісту як документ:

`workplan/page-specs/PAGE-SPEC-{slug}.md`

```markdown
# Page Spec: {Page Name}

## Layout: {layout block slug}
## Type: layout | composed

## Elements

| Zone | Type | Token/Slot | Scope | Desktop | Tablet | Mobile | Trigger |
|------|------|-----------|-------|---------|--------|--------|---------|
| Header | slot | slot:header | sitewide | visible | visible | hamburger | tap |
| Title | meta | meta:name + meta:tagline | — | 720px center | full-width | full-width | — |
| Left sidebar | slot | slot:sidebar-left | layout:themes | sticky 220px | hidden | hidden | hamburger tap |
| Content | content | template blocks | — | flex-1 | full-width | full-width | — |
| Right sidebar | slot | slot:sidebar-right | layout:themes | 280px | hidden | hidden | swipe/tab |
| Footer | slot | slot:footer | sitewide | visible | visible | visible | — |

## Spacing (from Figma)
- Page margin: 48px
- Header→Title gap: 16px
- Title→Content gap: 64px
- Sidebar↔Content gap: 48px
- Content blocks gap: 48px (vertical)

## Responsive Notes
- Tablet: both sidebars hidden, trigger buttons appear
- Mobile: single column, sidebars accessible via triggers
- Left sidebar trigger: hamburger icon top-left
- Right sidebar trigger: swipe from right edge or floating tab
```

---

## Example: Theme Page (from brainstorm)

Applying the checklist to the Rejuvita mockup:

| Zone | Q1: Type | Q2/Q3: Detail | Q4: Scope | Desktop | Tablet | Mobile | Trigger |
|------|----------|---------------|-----------|---------|--------|--------|---------|
| Header bar | slot | slot:header | sitewide | full-width, sticky | full-width, sticky | hamburger | tap |
| Title area | meta | meta:name, meta:tagline | — | 720px centered | full-width centered | full-width | — |
| Left sidebar | slot | slot:sidebar-left | layout:themes | sticky 220px | hidden | hidden | hamburger tap |
| Content blocks | content | template positions | — | flex-1 | full-width | full-width | — |
| Right sidebar | slot | slot:sidebar-right | layout:themes | sticky 280px, 3 stacked blocks | hidden | hidden | swipe or tab |
| Footer | slot | slot:footer | sitewide | full-width | full-width | stacked | — |

---

## For Composed Pages (homepage, about)

Same flow, different answers:

| Zone | Q1: Type | Q2/Q3: Detail | Desktop | Tablet | Mobile |
|------|----------|---------------|---------|--------|--------|
| Header bar | slot | slot:header, scope: sitewide | full-width | full-width | hamburger |
| Content | content | page_blocks in order | full-width sections | full-width | full-width |
| Footer | slot | slot:footer, scope: sitewide | full-width | full-width | stacked |

No sidebars on composed pages (unless specifically added via global_elements with composed:homepage scope).

---

## How It All Connects — The Full Pipeline

HTML-прототип layout-сторінки — це не просто верстка. Це **blueprint**, який визначає slot-структуру для всього build pipeline:

```
Figma mockup
  ↓
HTML prototype (Step 2)          ← визначає слоти: data-slot="header", "sidebar-left", etc.
  ↓                                та їх responsive поведінку
DB tables (Phase 0)              ← global_elements.slot маппиться 1:1 на ці data-slot
  ↓
Studio CRUD (Phase 1)            ← UI для керування pages + global elements
  ↓
Astro SSG build (Phase 2+)      ← resolveGlobalElementsForPage('layout', 'themes')
  ↓                                → отримує блоки для кожного слоту
Rendered HTML                    ← layout structure з прототипу + реальний контент в слотах
```

### Два типи сторінок — різна роль layout

**Layout page** = контейнер зі слотами. Сам по собі не має контенту — тільки CSS Grid структура та порожні `data-slot` зони. Global Elements визначають ЩО вставляється в кожен слот, з урахуванням scope (sitewide, layout:themes, composed:homepage) та priority (0=sitewide fallback, 10=type, 20=specific).

**Composed page** = повністю зібрана з блоків сторінка. Блоки додаються через `page_blocks` таблицю з позиціями. Слоти (header/footer) все одно приходять з `global_elements`, але sidebars зазвичай не використовуються.

### Приклад: як Astro рендерить theme page

```
1. Fetch page WHERE slug='themes' AND type='layout'
2. resolveGlobalElementsForPage('layout', 'themes')
   → header:        block "header-main"        (scope sitewide, priority 0)
   → sidebar-left:  block "theme-sidebar-left"  (scope layout:themes, priority 20)
   → sidebar-right: block "theme-sidebar-right"  (scope layout:themes, priority 20)
   → footer:        block "footer-main"        (scope sitewide, priority 0)
3. Fetch theme data (meta, template, block_fills)
4. Render layout HTML з prototype → вставити блоки в відповідні data-slot зони
5. Resolve hooks ({{price}} → theme.meta.price)
6. Output: /themes/[slug]/index.html
```

Layout prototype визначає **структуру**, global elements визначають **контент слотів**, theme data визначає **динамічні значення** всередині блоків.
