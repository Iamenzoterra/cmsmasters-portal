# PageSpeed Insights — Portal Theme Pages

Тривалий журнал того, що ловиться в PageSpeed на `/themes/[slug]`, звідки
це росте в коді, та що саме було виправлено. Кожен запис структурований
однаково: **симптом → корінь → зміни → очікуваний ефект → caveat**.

---

## Baseline audit — 2026-04-22

Тестова сторінка: <https://portal.cmsmasters.studio/themes/456456>
Репрезентативна тема, 2 блоки в контенті + sidebar-блоки з глобальних
елементів.

Три категорії попереджень:
1. **Legacy JavaScript** — 11.5 KiB полифилів у shared chunk
2. (ігнорується за домовленістю)
3. **Network dependency tree** — 6 зайвих preconnect, дублі Google Fonts,
   `/themes/tokens.css` 404

---

## #1 — Legacy JavaScript (~11.5 KiB wasted)

### Симптом

PageSpeed позначив `_next/static/chunks/18-*.js` (shared framework chunk)
з полифилами для:

- `Array.prototype.at` — ES2022
- `Array.prototype.flat`, `Array.prototype.flatMap` — ES2019
- `Object.fromEntries` — ES2019
- `Object.hasOwn` — ES2022
- `String.prototype.trimStart`, `trimEnd` — ES2019

"Est savings of 12 KiB."

### Корінь

Next.js (без явного `browserslist`) таргетить дефолт
[Chrome 64 / Edge 79 / FF 67 / Opera 51 / **Safari 12**](https://nextjs.org/docs/architecture/supported-browsers).
Safari 12 (2018) не має жодного з перерахованих методів, тож SWC додає
полифили в shared chunk для **всіх** користувачів, включно з модерними.

Супутня деградація: `apps/portal/tsconfig.json` стояв на `"target":
"ES2017"`, тоді як решта apps монорепо (`api`, `studio`, `admin`,
`dashboard`) вже на `ES2022`. Portal — публічна точка входу — відставала.

### Зміни

**`apps/portal/tsconfig.json`**

```diff
- "target": "ES2017",
+ "target": "ES2022",
```

**`apps/portal/package.json`** — додано `browserslist` (≈ Baseline 2023):

```json
"browserslist": [
  "chrome >= 108",
  "edge >= 108",
  "firefox >= 108",
  "safari >= 16"
]
```

Перевірено: `npx browserslist` у `apps/portal/` тепер резолвить до
Safari 16.0 як нижньої межі (замість Safari 12).

### Очікуваний ефект

Next.js SWC більше не транспілює `Array.at` / `Object.hasOwn` /
`String.trimStart` тощо — всі ці методи нативно доступні в
Baseline 2023. 11.5 KiB полифилів з SWC-шляху зникнуть.

### Caveat

У локальному build-і зараз ще видно 3 інстанси тих методів у тому ж
chunk (по одному `Array.prototype.at`, `Object.hasOwn`, `Object.fromEntries`).
Контекст навколо виглядає як **conditional inline polyfills**
(`Array.prototype.at||(Array.prototype.at=function…)`) — тобто їх несе в
бандл якась 3rd-party залежність (ймовірно Supabase SDK або суміжне).

Browserslist не впливає на ці — вони записані в коді залежності as-is.
Якщо post-deploy PageSpeed все ще лається — треба йти по графу
залежностей і знаходити донора.

---

## #3 — Network dependency tree (3,157 ms critical path)

### Симптом

**Warnings:** *More than 4 preconnect connections were found.*

Дерево critical-path:

```
/themes/456456                       (2,729 ms, 26.25 KiB)
├── /css2?family=Manrope:wght@300;400;500;600;700  (googleapis, 2,731 ms)
│   └── …v20/xn7gYHE41….woff2       (gstatic, 3,131 ms, 24.79 KiB)
├── /themes/tokens.css               (portal, 3,157 ms, 2.44 KiB, 404)
└── /css2?family=Manrope:wght@400;500;600;700      (googleapis, 2,732 ms)
```

**Preconnect hints:** 6 штук — `fonts.googleapis.com` ×3,
`fonts.gstatic.com` ×3. Source кожного:

- `div > div.slot-inner > div > link` (у `<main>` slot-і з контентом)
- `aside > div.slot-inner > div > link` (у sidebar-і)

Тобто `<link rel="preconnect">` сидить **всередині `<body>`**, всередині
блоків.

Додатково: з історії playwright-логів видно, що `/themes/tokens.css`
повертає 404 щонайменше з 2026-04-15 — давній зомбі-request.

### Корінь

Portal інлайнить блоки через `renderBlock()` у `apps/portal/lib/hooks.ts`
(патерн WP-024 phase 3 — "inline block variants in renderer"). Кожен
блок — це HTML-фрагмент з Supabase, який потрапляє в DOM сторінки
через `dangerouslySetInnerHTML` **як є**.

Блоки в prod Supabase містять у своєму HTML shell-рівневі теги, які не
повинні були там опинитись:

- `<link rel="preconnect" href="https://fonts.googleapis.com">`
- `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`
- `<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@…">`
- `<link href="tokens.css">` (відносний — під `/themes/[slug]/` резолвиться
  на `/themes/tokens.css` → 404)

Звідки вони взялись — історичний артефакт: блоки, мабуть, колись
редагувались як автономні HTML-документи (див. `tools/layout-maker`
iframe srcdoc з аналогічним `<link>`), і копія shell-а просочилась у
`block.html`. Локальні копії в `content/db/blocks/*.json` чисті —
забруднення живе саме в prod Supabase.

Ключовий факт: Portal **не потребує** цих тегів. Manrope self-hosted
через `next/font/google` у `apps/portal/app/layout.tsx`; tokens.css
вбудований у Next CSS pipeline через `@import` у `globals.css`. Тобто
абсолютно все з цих `<link>`-ів — або дублі, або биті посилання.

### Стратегія фіксу

Замість чистити кожен блок у Supabase (довго + хитко — нові блоки
можуть знову принести сміття) — **захисний sanitizer на рендер-границі**.
Байдуже, що прилетить з БД — на шляху в DOM з нього викидаються
shell-теги.

### Зміни

**`apps/portal/lib/hooks.ts`**

Нова функція:

```ts
export function sanitizeEmbedHTML(html: string): string {
  return html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<!doctype\b[^>]*>/gi, '')
}
```

Інтегрована у дві точки:

- `renderBlock()` — викликає `sanitizeEmbedHTML` на `html` + на
  `v.html` кожного варіанту перед обгорткою `<div data-block-shell>`.
- `stripDebug()` — тепер пропускає результат через `sanitizeEmbedHTML`,
  тож layout-HTML теж захищений (хоча локально він чистий, prod могла
  розсинхронізуватися).

### Очікуваний ефект

Після deploy + cache revalidate:

| Метрика | До | Після |
|---|---|---|
| Preconnect hints у `<body>` | 6 | 0 |
| Google Fonts HTTP-запити | 2 (різні wght) | 0 (Manrope self-hosted) |
| `/themes/tokens.css` 404 | є | нема |
| Довжина critical chain | 5 | 2 (HTML + WOFF2 з `_next/static`) |

"Warnings: more than 4 preconnects" має зникнути повністю.

### Caveat

`sanitizeEmbedHTML` — тупий regex: викидає **всі** `<link>` з
блок-HTML, не лише підозрілі. Якщо колись з'явиться блок з легітимним
`<link>` (дуже малоймовірно — Portal blocks це статичний UI, CSS
приходить через `block.css`, зовнішні ресурси — через Next pipeline) —
треба буде додати whitelist у ту саму функцію.

Аналогічно з `<meta>` / `<title>` / `<!doctype>` — в тілі вбудованого
фрагмента їм нема що робити, тож strip безпечний.

---

## Verification checklist (після деплою)

- [ ] `POST {}` на `/api/revalidate` — чистить всі теги (themes,
      layouts, blocks). Якщо revalidate лише `themes`, інкеш
      `layouts`/`blocks` залишить старий DOM.
- [ ] Відкрити `/themes/456456`, в DevTools перевірити:
  - [ ] У `<main>` / `<aside>` нуль `<link>` / `<meta>` / `<title>`
  - [ ] У Network — нема запиту до `fonts.googleapis.com` і до
        `/themes/tokens.css`
- [ ] Прогнати PageSpeed на тій самій URL
  - [ ] Картка "Legacy JavaScript" зменшилась (або зникла)
  - [ ] Картка "Network dependency tree" зелена, preconnect warning
        зник, chain = 2

---

## Відкрита лінія досліджень

Якщо після deploy PageSpeed все ще показує:

- **Legacy JS** — root-cause-ити 3rd-party залежність з inline
  `Array.prototype.at||(...)` полифилами (ймовірний донор — Supabase
  JS SDK або щось суміжне). Методика: `grep -r 'prototype\.at||' node_modules/`.
- **Інші "wasted bytes"** — запустити `next build` з
  `ANALYZE=true` (після додавання `@next/bundle-analyzer`) для breakdown
  shared chunks.

Нові записи (наступні прогони PageSpeed) — додавати новим розділом
`## Audit — YYYY-MM-DD` з тою самою структурою
(симптом → корінь → зміни → caveat).
