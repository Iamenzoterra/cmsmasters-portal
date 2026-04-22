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

### Caveat (resolved — see Follow-up 2026-04-22)

Початковий фікс (browserslist + target ES2022) не вбив wasted bytes —
post-deploy PSI показав ті самі 11.5 KiB, а chunk hash не змінився
(`18-2d765459f0cd2fba.js` до і після). Причина: полифили приходили
**не зі SWC**, а з самого Next.js. Див. Follow-up нижче.

---

## #1 follow-up — Next.js власний polyfill-module

### Root cause (після root-cause investigation)

Next.js бандлить `node_modules/next/dist/build/polyfills/polyfill-module.js`
(1.38 KiB source — `Array.prototype.at`, `Object.hasOwn`,
`Object.fromEntries`, `Array.flat/flatMap`, `String.trim{Start,End}`,
`Promise.finally`, `URL.canParse`) в **кожен** клієнтський build.
Browserslist не впливає — модуль інжектиться через `app-globals.js`
як relative import: `import '../build/polyfills/polyfill-module'`.

`grep -rl 'Array.prototype.at||(Array.prototype.at' node_modules/` → один
донор: `next/dist/build/polyfills/polyfill-module.js`.

### Зміни

**`apps/portal/polyfills-shim.js`** (новий файл) — мінімальний shim
тільки з `URL.canParse` (єдиний метод з того списку, якого нема в
Safari 16 / Chrome 108–119 / Firefox 108–114):

```js
if (typeof URL !== 'undefined' && !('canParse' in URL)) {
  URL.canParse = function (url, base) {
    try { return !!new URL(url, base) } catch (_) { return false }
  }
}
```

**`apps/portal/next.config.js`** — `NormalModuleReplacementPlugin` з
regex на resolved disk path (alias на `'next/dist/build/…'` НЕ матчить
relative import зсередини `app-globals.js` — тому regex):

```js
webpack: (config, { isServer, webpack }) => {
  if (!isServer) {
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /next[\\/]dist[\\/](esm[\\/])?build[\\/]polyfills[\\/]polyfill-module(\.js)?$/,
        path.resolve(__dirname, './polyfills-shim.js'),
      ),
    )
  }
  return config
}
```

### Verification (local build)

- Chunk hash: `18-2d765459f0cd2fba.js` → `18-7960f85cf2c969f0.js` ✅
- `grep 'Array.prototype.at=\|Object.hasOwn='` по всіх `.next/static/chunks/*.js` — **нуль матчів** ✅
- `URL.canParse` присутній у `main-*.js` / `main-app-*.js` (shim дійшов у main chunk)

### Caveat

- `URL.canParse` shim — обов'язковий: без нього Safari 16 users отримають
  `TypeError`, якщо десь в deps з'явиться `URL.canParse(…)`. Якщо колись
  піднімемо browserslist до Safari 17 / Chrome 120 — shim можна видалити
  зовсім.
- Alias через `config.resolve.alias` НЕ працює для relative import-ів з
  `node_modules/next/dist/esm/client/app-globals.js`. Тільки
  `NormalModuleReplacementPlugin` з regex по resolved path.

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

## #4 — Reduce unused JavaScript 42 KiB (accepted as framework baseline)

### Симптом

Після деплою #1 follow-up та #3 картка залишилась:

- `chunks/87c73c54-*.js`: 54.2 KiB transferred, 21.7 KiB unused
- `chunks/18-*.js`: 44.3 KiB transferred, 20.5 KiB unused
- **Total First Load JS: ~98.5 KiB**

### Розбір

Peek перших байт кожного chunk-у (`head -c 500 chunk.js`):

- **`87c73c54-*.js`** — містить `"https://react.dev/errors/"` →
  **React core + React-DOM**.
- **`18-*.js`** — містить `TemplateContext`, `useContext`, `jsx(Fragment)`
  → **Next.js App Router runtime**.

Тобто обидва chunk-и — **framework baseline**, не наш код.

### Що перевіряли

- **Client Components** в `/themes/[slug]` → **нема**. Page — pure Server
  Component. Layout — SC з двома `<Script>`, які самі по собі компактні
  wrapper-и.
- **Supabase в client bundle** → **ні**. Використовується тільки в
  server-only файлах (`page.tsx`, `blocks.ts`, `sitemap.ts`,
  `global-elements.ts`).
- **`next/script` vs raw `<script defer>`** → swap дав нульову delta
  (Next вже оптимізує `<Script>` у тонку обгортку). Plus React 19 може
  hoist raw `<script>` у `<head>` — зміна семантики. Залишили `<Script>`.

### Рішення: accept, не копати далі

~98 KiB First Load JS для Next.js 15 + React 19 — це **верхня третина**
діапазону (типовий Next.js app: 200–400 KiB). "Reduce unused JavaScript"
на такій платформі — **інформативна**, не блокуюча метрика. Вона каже
"тут є framework code який на цій конкретній сторінці не викликається",
що правда по визначенню runtime-а, що вантажиться на ВСІ сторінки.

### Якщо колись захочеться цих 42 KiB

Важелі за зростаючим blast radius:

1. **Audit Client Components** — якщо `app/_components/` зростає, ревізія
   `'use client'` помилок (випадково позначений SC як CC) може підрізати
   shared chunk. Зараз — немає чого ревізувати.
2. **`experimental.ppr`** (Partial Prerendering, Next 15) — розділяє
   сторінку на static shell + dynamic islands, hydrate тільки islands.
   Require-ить опрацювання route-per-route + тестів.
3. **Preact swap** через `compat` — економить ~30–40 KiB на React, але
   ламає деякі React 19 фічі (server components compat нестабільна).
   Big migration, не варта для поточного Portal.
4. **Astro для `/themes/[slug]`** — pure static HTML без React runtime.
   Окремий мікросервіс / rewrite route — масштабна переробка.

Жодне — не легкий next step. Acceptance: **98 KiB First Load — baseline
для цього стека; PSI "Reduce unused JS" тут не чіпаємо, поки LCP/FCP
залишаються зеленими.**

---

## Verification checklist (після деплою)

- [ ] `POST {}` на `/api/revalidate` — чистить всі теги (themes,
      layouts, blocks)
- [ ] Відкрити `/themes/456456`, в DevTools перевірити:
  - [ ] У `<main>` / `<aside>` нуль `<link>` / `<meta>` / `<title>`
  - [ ] У Network — нема запиту до `fonts.googleapis.com` і до
        `/themes/tokens.css`
- [ ] Прогнати PageSpeed на тій самій URL (додати `?v=N` щоб оминути
      PSI-кеш)
  - [x] Картка **"Legacy JavaScript"** — fixed (deploy 2026-04-22)
  - [x] Картка **"Network dependency tree"** — fixed (deploy 2026-04-22)
  - [-] Картка **"Reduce unused JavaScript"** — accepted as framework
        baseline, див. #4 вище

---

## Відкриті лінії досліджень

Жодних відкритих на поточний момент. Якщо PSI колись знову підсвітить
щось нове — додавати новим розділом `## Audit — YYYY-MM-DD` з тою самою
структурою
(симптом → корінь → зміни → caveat).
