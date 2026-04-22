# Drawer Push Quest — канонічний літопис

Цей документ фіксує всі спроби зробити iOS-style push drawer у Portal. Не вдалося — оставив тут все що пробував + гіпотези чому провалилось + що робити далі.

Останнє оновлення: 2026-04-22. Author: Claude (Opus 4.7).

---

## 1. Що користувач хоче (фінальний список із сесії)

- **a)** Тригер НЕ ресайзиться на мобільному. Нічого не розростається, стабільна форма.
- **b)** Плавний штовх у сторону: швидко → замедлення → стоп (iOS spring feel).
- **c)** Контент сайдбара видно чітко, скрол працює **на сайдбарі**, не на сторінці під ним.
- **d)** Свайп у сторону повертає екран на контент (закриває сайдбар).

Вхідна картина від користувача (Image #1 — скріншот mobile Safari, `portal.cmsmasters.studio/themes/456456`):
- Зліва — тан-кольоровий напівпрозорий піктограмний сайдбар "Global Elements / Logo / Body Background / Button / Form Fields / Link", обрізаний зліва (перші літери відсутні).
- Справа — на тому ж екрані ВИДНО контент сторінки (pricing "$19", "Buy Now / Live Demo", таги "Spa / ... re & Medical", "me is perfect for" буліт-список, "Theme Details / March 2026").
- Круглий темно-синій FAB у нижньому правому куті.

Тобто сайдбар **перетинається** з контентом замість того щоб він лежав **під** шаром контенту який зʼїхав убік. І контент, і сайдбар скролиться як одне ціле.

---

## 2. Чому це складно — архітектурні обмеження

### 2.1 Rendering pipeline у Portal

`apps/portal/app/themes/[slug]/page.tsx:252-266`:

```tsx
return (
  <>
    <script type="application/ld+json">…</script>
    <style>{layoutPage.css}</style>      // CSS згенерований у css-generator.ts
    <style>{slotConfigCSS}</style>       // DB-рівень slot_config overrides
    <div dangerouslySetInnerHTML={{ __html: pageHTML }} />   // ← ЄДИНИЙ ОБГОРТЧИК
  </>
)
```

HTML згенерований у `tools/layout-maker/runtime/lib/html-generator.ts`:

```html
<header data-slot="header">…</header>                  <!-- position: top -->

<div class="layout-frame">
  <div class="layout-grid">
    <aside data-slot="sidebar-left"  data-drawer-side="left">…</aside>
    <main  data-slot="content">…</main>
    <aside data-slot="sidebar-right" data-drawer-side="right">…</aside>
  </div>
</div>

<footer data-slot="footer">…</footer>                  <!-- position: bottom -->

<div class="drawer-shell">
  <button class="drawer-trigger drawer-trigger--fab drawer-trigger--left">…</button>
  <button class="drawer-trigger drawer-trigger--fab drawer-trigger--right">…</button>
  <div class="drawer-layer"><div class="drawer-backdrop"></div></div>
</div>
```

**Важливий факт:** сайдбари **завжди** лежать всередині `.layout-grid`. Жодних варіантів DOM-структури по breakpoint (HTML статичний, CSS-only responsive).

### 2.2 Обмеження `document.querySelector`

Блок-скрипти (всередині block JS inside `.slot-inner`) використовують `document.querySelector('.block-X')` **singular** — ініціалізується **лише перший** екземпляр. Це означає:

- НЕ можна **дублювати** sidebar DOM (одна копія для `.layout-grid`, інша для push-track). Раніше дублювання було — пункт PARITY-LOG "Drawer sidebars render unstyled".
- Сайдбар може бути тільки в одному місці DOM.

### 2.3 Block-level позиціонування

У контенту є блоки зі своїми правилами:
- `sticky-header` з `z-index: 999`
- `position: sticky` secondary elements
- Різні локальні stacking contexts через `transform`, `will-change`

Будь-який `z-index` на sidebar нижче `999` → header блок поверх.

---

## 3. Спроби (хронологія)

### Спроба 1 — `.layout-frame { position: relative; z-index: 2 }` + sidebar fixed z:1

```css
.layout-frame {
  position: relative;
  z-index: var(--drawer-z-push-frame);   /* 2 */
  background: var(--drawer-panel-bg);
  transition: margin ...;
}
body.drawer-is-open-left .layout-frame { margin-inline: var(--drawer-push-width) calc(-1 * ...); }
.layout-grid > [data-slot="sidebar-left"] {
  position: fixed; top: 0; bottom: 0; left: 0;
  width: var(--drawer-push-width);   /* тоді 100% */
  z-index: var(--drawer-z-push-sidebar);   /* 1 */
  …
}
```

**Що зламалось:** `.layout-frame` створила stacking context. Сайдбар (positioned z:1) **всередині** цього context'у опинявся над content (non-positioned). В CSS-стекінгу positioned завжди over non-positioned у тому ж context'і.

**Сайдбар перекривав content.**

### Спроба 2 — in-flow slots виносять stacking context на свій рівень

```css
.layout-frame { /* no stacking context */ }
.layout-grid > [data-slot="content"] {
  position: relative;
  z-index: 2;
  background: var(--drawer-panel-bg);
}
```

**Що зламалось:** у реальному Portal сторінці є контент **ВИЩЕ** за `.layout-frame` — Next.js чи загальна шапка сторінки (яка не `data-slot="header"` у YAML, а `<header>` від page template). Вона ПОЗА `.layout-grid`, тому за нею `z-index: 2` не застосовувалось. Sidebar з `width: 100%; height: 100%` перекривав цю top-region сторінки.

### Спроба 3 — body-level margin + sidebar offscreen

Замість `.layout-frame margin` → `body.drawer-is-open-X { margin-inline }`.
Sidebar отримав `transform: translateX(calc(var(--drawer-open-{side}, 1) * ±100%))` — **off-screen at rest**, онскрін при `body.drawer-is-open-{side}` (тоді `--drawer-open-{side}: 0`, shell CSS встановлює через `body.drawer-is-open-{side}` class).

Фікси:
- `html { overflow-x: hidden }` — щоб negative body-margin не створював горизонтальний scrollbar.
- Дропнув `.layout-frame` stacking context і `z-index` на in-flow slots — не потрібно, якщо sidebar off-screen.
- `--drawer-push-width: 100%` → `var(--drawer-panel-width-mobile)` (300px) — і в shell default, і через `:root` override у layout CSS всередині @media (щоб фікс landed без Portal redeploy).

**Що працювало:** FAB видимий на мобільному. Відкривши drawer, body-margin-shift шифтить header + theme + footer разом.

**Що не працювало:** користувач бачить сайдбар + контент **одночасно** (скріншот). Гіпотеза чому — живе shell CSS ще має `--drawer-push-width: 100%` (Portal не deploy-нутий), а layout CSS тепер 300px — може бути некогерентна картинка. Плюс sticky headers / blocks з власним z-index перекривають sidebar.

### Спроба 4 — Vaul-style scroll lock

Був `body.drawer-is-open { overflow: hidden }`. На iOS Safari цього недостатньо — momentum / rubber-band scroll просікає крізь.

Замінив на JS у `portal-shell.js`:
```js
function lockScroll() {
  lockedScrollY = window.scrollY
  document.body.style.position = 'fixed'
  document.body.style.top = '-' + lockedScrollY + 'px'
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}
function unlockScroll() {
  // remove inline styles, restore cached
  window.scrollTo(0, lockedScrollY)
}
```

**Що не встигло/не перевірено:** Portal JS ще не re-deploy-нутий, тому це не працює живцем.

### Спроба 5 — FAB one-tap (не armed-then-open)

Оригінально FAB мав 2-крокову логіку: клік → armed state (chevron flips, label appears, pill grows downward) → 2s або другий клік → open.

Користувач сказав "трігер не ресайзиться" — прибрав armed flow. FAB тепер завжди 44×44, один тап = відкриває.

Видалив всі `body.drawer-armed-{side} ...` правила з shell CSS.

**Що не встигло:** Portal JS не redeploy-нутий → стара armed-логіка ще жива. Тому користувач **досі бачить** як FAB розростається.

### Спроба 6 — Pointer-based swipe з velocity

Переписав touch handler з touchstart/end на pointerdown/up з:
- `|dx| > |dy|` (horizontal dominant)
- `|dx| > 50px` distance threshold
- OR velocity > 0.35 px/ms
- Sidebar CSS: `touch-action: pan-y; overscroll-behavior: contain`

**Що не встигло:** Portal JS не redeploy-нутий.

### Спроба 7 — `stroke-width="2"` → `"2.5"` для chevron

Chevron на FAB рендериться в 14×14px, viewBox 24 → stroke 2/24×14 ≈ 1.17px (тонкий). Референс (`Mobile Drawer _standalone_.html`) використовує 2.5. Змінив.

**Що не встигло:** потрібен re-export layout → нова HTML з 2.5.

---

## 4. Результати досліджень (agent reports)

### 4.1 Vaul (emilkowalski/vaul) — той "ідеальний" drawer

- **Анімує `transform: translate3d`**, не margin. Transform hits compositor (GPU), margin triggers layout.
- **Duration 500ms**, easing `cubic-bezier(0.32, 0.72, 0, 1)` (iOS decel). Velocity threshold 0.4, distance threshold 25% of drawer size.
- **Scroll lock: position:fixed + top:-scrollY**, restore via `window.scrollTo`. Єдиний рецепт що надійно працює на iOS.
- **`touch-action: none`** на panel, `pan-y` на grab-handle.
- **React Portal** — drawer рендериться в `document.body` (або custom container), НЕ nested в page tree.
- **`::after` pseudo 200% size** — щоб overscroll / rubber-band не показував сторінку за panel.

### 4.2 react-native-drawer-layout `drawerType='back'` — реальний iOS Mail pattern

```css
.drawer-panel {
  position: absolute;
  z-index: -1;                  /* ← behind track */
  left: calc(var(--w) * -1);    /* parked off-canvas left */
  transform: translateX(0 or var(--w));
}
.content-track {
  background: opaque;            /* hides z:-1 drawer at rest */
  transform: translateX(0 or var(--w));
  transition: transform 0.3s;
}
```

Обидва (і drawer, і track) транслейтяться **на однакову відстань** при відкритті. Track з opaque bg закриває drawer при `translate: 0`; коли обидва рухаються на `var(--w)`, track виходить за межі, drawer прокривається на x=0.

### 4.3 Material Design side sheet — "standard" (push) vs "modal"

- **Standard (non-modal, push)** — лежить поряд з контентом, без scrim, content resizes. Elevation 1.
- **Modal** — overlay + scrim. Elevation 16.
- Enter 250ms, decel easing. Exit 200ms, accel easing.

### 4.4 Висновок дослідження

**Правильна DOM-структура:**
```html
<body>                             <!-- plain, ніколи не трансформується -->
  <header>…</header>                <!-- sibling, не рухається -->
  <div class="push-stage">          <!-- position: relative; overflow-x: clip -->
    <aside class="push-drawer">…</aside>  <!-- absolute, z:-1 -->
    <div class="push-track">        <!-- ← transform here, opaque bg -->
      …контент…
    </div>
  </div>
  <footer>…</footer>                <!-- sibling, не рухається -->
</body>
```

Ключові пункти:
- Drawer **sibling** track-а (не descendant), всередині `.push-stage` clipping wrapper
- Drawer `z-index: -1` + track `opaque bg` ховає drawer at rest
- `inset-block: 0` обмежує drawer висотою stage-а → не лізе на header/footer
- Transform, не margin

---

## 5. Поточний стан коду (що закомічено / змінено в цій сесії)

### Generator / Layout Maker
- `tools/layout-maker/runtime/lib/css-generator.ts` (push @media):
  - Sidebar з `transform: translateX(calc(var(--drawer-open-{side}, 1) * ±100%))`, `overscroll-behavior: contain`, `touch-action: pan-y`
  - `html { overflow-x: hidden }` inside push @media
  - `body { transition: margin; will-change: margin }` inside push @media
  - `body.drawer-is-open-{side} { margin-inline }` inside push @media
  - `:root { --drawer-push-width: var(--drawer-panel-width-mobile) }` inside push @media (щоб НЕ чекати Portal redeploy)
  - `.drawer-backdrop { display: none }` inside push @media
- `tools/layout-maker/runtime/lib/html-generator.ts`:
  - Chevron SVG `stroke-width="2.5"` (було "2")
- `tools/layout-maker/src/components/DrawerPreview.tsx`:
  - Прибрано armed-state tracking, все тригер-варіанти одно-кнопкові тепер
- `tools/layout-maker/PARITY-LOG.md`:
  - 2 записи в "Fixed" (stacking rewrite, architecture shift)

### Portal runtime
- `apps/portal/public/assets/portal-shell.js` **переписаний**:
  - One-tap open для всіх варіантів
  - Vaul scroll lock (`position: fixed; top: -scrollY`)
  - Pointer events для swipe (velocity + distance threshold)
  - unlockScroll відкладений на `--drawer-push-content-duration` + 30ms, щоб margin transition встигла відграти
- `packages/ui/src/portal/portal-shell.css`:
  - Прибрано `body.drawer-is-open { overflow: hidden }`
  - Прибрано всі `body.drawer-armed-{side} ...` правила
  - Коментар на місці push section — "no global push rules"
  - `--drawer-push-width` default: `var(--drawer-panel-width-mobile)` (було 100%)

### Тести
- 43/43 vitest pass
- `css-generator.test.ts` має 2 push-специфічних describe'а

---

## 6. Чому все одно не працює (що бачить користувач)

### 6.1 Portal не redeploy-нутий
- Живе `portal-shell.js` ще має armed-then-open (стара версія) → FAB розростається
- Живе `portal-shell.css` ще має `body.drawer-is-open { overflow: hidden }` (стара) → scroll chaining живий
- Живе shell token `--drawer-push-width: 100%`

### 6.2 Layout CSS може не бути re-export-нутим
- Live CSS має мої push rules **crypto виглядає новим** (body margin rules є) але розміри й transform не збігаються з очікуваним
- Треба переекспортувати layout 2132

### 6.3 Фундаментальна проблема stacking — `sidebar під хедером і під контентом`

**Гіпотеза користувача:** `z-index` самих **блоків** всередині header/content перекривають sidebar.

**Підтвердження:** блок `sticky-header` має `z-index: 999`. Sidebar має `z-index: var(--drawer-z-push-sidebar) = 1` (за shell tokens). 1 ≪ 999, тому sticky header буде поверх sidebar. Це саме те що користувач описав.

**Але:** якщо sidebar push-offscreen при rest і ловить `position: fixed` при open, то **відкритий** sidebar має бути на viewport-wide fixed элементом. Його `z-index: 1` у root stacking context НЕ достатньо, бо sticky header створює власний stacking context з z:999.

Треба:
- Підняти sidebar `z-index` вище всіх ймовірних `z-index` у блоках. Може бути `--drawer-z-push-sidebar: 9999` замість `1`.
- Або: рендерити sidebar через React Portal в `document.body` (Vaul pattern), щоб жоден stacking context блоків не бі

### 6.4 Чому свайп не працює

Коли користувач свайпає над header або над блоком зі sticky, pointer event трапляється над сторонніми блоками (які можуть мати власні pointer handlers, сторонні CSS `touch-action`, etc).

Мій pointer handler — document-level `addEventListener('pointerdown', ..., { passive: true })`. Він МАЄ ловити events від будь-якого target'у через event bubbling. Але якщо дочірній елемент робить `event.stopPropagation()` — handler не спрацює.

Плюс якщо body-scroll не залочений (див. 6.1), то вертикальний swipe просто scroll-ить сторінку і pointerup fire-иться але з різними coordinates — мій handler може відкинути як не-горизонтальний.

---

## 7. Що робити далі (пропозиції для наступної ітерації)

### 7.1 Найпевніший шлях — React Portal pattern (як Vaul)

Переробити `apps/portal/app/themes/[slug]/page.tsx`:
```tsx
<>
  <script>...</script>
  <style>...</style>
  <div className="portal-page-root">
    <div dangerouslySetInnerHTML={{ __html: pageMainHTML }} />    // header + content + footer (БЕЗ sidebar)
  </div>
  <div className="drawer-portal" dangerouslySetInnerHTML={{ __html: drawerHTML }} />  // sidebars + triggers + backdrop
</>
```

Це вимагає:
1. html-generator **розділити output** на `pageMainHTML` (header + layout-frame БЕЗ sidebars + footer) та `drawerHTML` (sidebars + drawer-shell)
2. CSS animate `.portal-page-root { transform: translate3d }` на open (сайдбари — siblings, не в DOM під root)
3. Оскільки sidebars тепер body-direct-child-й, `z-index` їх перемагає всі внутрішні блок-стекінг-контексти

Але: html-generator це static HTML. Розділити його на 2 файли — архитектурна зміна, потрібна міграція кожного layout-а.

**Timeline:** півдня-день, якщо обережно.

### 7.2 Альтернатива — різко підняти `z-index` sidebar + kill stacking contexts в блоках

Найменш ризикова спроба:
1. `--drawer-z-push-sidebar: 9999` (замість 1)
2. На push BP: `.layout-frame, header, footer { isolation: auto !important; z-index: auto !important }` — знищує їхні stacking contexts
3. `body.drawer-is-open { position: fixed }` через CSS (коли shell deploy-иться)

Плюс: мало коду. Мінус: `!important` та грубе перезатирання блоків може зламати інші візуальні ефекти.

### 7.3 Перевірити, чи Portal deploy-иться автоматично

Якщо user has git-push → Vercel auto-deploy, то просто commit/push, і JS/CSS живе через 1-2 хв.

Якщо deploy ручний → скриптик ~/deploy-portal.

### 7.4 Тест на реальному девайсі

Користувач тестує на iPhone. Playwright desktop-chrome може не реплікувати Safari iOS behavior (`position: fixed + margin`, momentum scroll, sticky). Рекомендую:
- Дев-deploy Portal на preview URL
- Тест на iPhone
- Логи з `touchstart/touchend` координат через `console.log` + Safari Web Inspector

---

## 8. Рекомендована послідовність при наступній атаці

1. **Перш за все:** Portal redeploy з поточним кодом (portal-shell.js + portal-shell.css вже готові — треба лише, щоб вони дойшли до production).
2. Re-export layout 2132 в LM, upload, revalidate. Перевірити FAB (повинен БУТИ 44×44, не розростатися) + chevron видимий (stroke 2.5) + scroll lock працює.
3. Якщо після (1)+(2) проблема `сайдбар під хедером` залишається — виконати §7.2 (bump z-index + kill stacking на flow ancestors).
4. Якщо все одно погано — перехід на §7.1 (React Portal + DOM split).
5. Swipe тестувати **після** того як scroll-lock живий і sidebar видимий.

---

## 9. Файли на які варто подивитись при наступній атаці

- `tools/layout-maker/runtime/lib/css-generator.ts:383-485` — push branch у @media
- `tools/layout-maker/runtime/lib/html-generator.ts:120-217` — HTML emission + drawer-shell
- `apps/portal/public/assets/portal-shell.js` — повний controller (one-tap, scroll lock, swipe)
- `packages/ui/src/portal/portal-shell.css:20-146` — tokens (особливо `--drawer-z-*`)
- `apps/portal/app/themes/[slug]/page.tsx:252-266` — React root + dangerouslySetInnerHTML
- `tools/layout-maker/PARITY-LOG.md` — детальна історія фіксів з контрактними тестами
- `C:\work\cmsmasters portal\Mobile Drawer _standalone_.html` — reference mockup для поведінки

---

## 10. Технічні гіпотези які ще не перевірив

- **Чи має `.block-sticky-header` `transform: translateZ(0)` або `will-change: transform`?** Якщо так, то ця стороння блокова властивість створює containing block для `position: fixed` дочірніх sidebarів і ламає їхнє viewport-anchoring.
- **Чи використовує Portal якийсь theme-level JS який toggle-ить body classes?** Може бути conflict з моїми `drawer-is-open-*`.
- **Чи `.slot-inner`-wrapper має overflow: hidden / clip?** Може обрізати sidebar-content яку sidebar намагається показати.
- **Чи sidebar-right і sidebar-left однаково зламані?** Скріншоти показують LEFT — RIGHT поведінка не перевірена у цій сесії.

---

---

## 11. ФОКУС-АРХІТЕКТУРА (рішення)

Після спроб 1-7 користувач сформулював вимогу інакше:

> "коли пуш драуер активний він стає головним фокусом. всі інші
> елементи контента хедера футера стають неактивні і невидимі,
> поки пуш драуер відкритий."

Це перевертає задачу з ніг на голову. Замість того щоб **воювати зі
stacking contextами** (sidebar треба рівно над header-блоком з
z:999, опиратися block-level transforms, розводити DOM) — просто
**усе решта зникає**. Коли на сторінці рендериться ЛИШЕ sidebar —
нема з чим конфліктувати.

### 11.1 Правило

```css
@media (max-width: 767px) {
  /* Focus mode — everything except sidebars + drawer-shell is
   * invisible + inactive when drawer is open */
  [data-slot]:not([data-drawer-side]),
  .layout-frame {
    transition: opacity 520ms cubic-bezier(0.32, 0.72, 0, 1),
                visibility 0s linear 0s;
  }
  body.drawer-is-open [data-slot]:not([data-drawer-side]),
  body.drawer-is-open .layout-frame {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 520ms cubic-bezier(0.32, 0.72, 0, 1),
                visibility 0s linear 520ms;
  }
  /* Sidebar explicitly opts-out of the cascade */
  .layout-grid > [data-slot="sidebar-left"],
  .layout-grid > [data-slot="sidebar-right"] {
    opacity: 1;
    visibility: visible;
    /* ...fixed, transform, transition... */
  }
}
```

### 11.2 Що це дає

- **(c) скрол працює на сайдбарі** — контент має `pointer-events:none`
  + `visibility:hidden`, події просікають до body. Body локнутий
  (`overflow: hidden` + JS Vaul `position: fixed` коли deploy-иться).
  Sidebar має `overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y` — його сам скрол.
- **(d) свайп закриває** — оскільки все крім sidebar має `pointer-
  events: none`, swipe над будь-яким місцем екрану досягає або
  sidebar (свого scroll), або body (мій document-level handler).
  Жоден sticky-header блок не ловить pointerdown замість мене.
- **(a) тригер не ресайзиться** — це незалежно від фокус-mode, але
  разом з шостою спробою (прибрано armed-flow в portal-shell.js +
  видалено все `body.drawer-armed-*` з shell CSS).
- **(b) плавність** — sidebar слайд-ін використовує
  `cubic-bezier(0.32, 0.72, 0, 1)` @ 520ms (Vaul easing).
  Контент фейд-аут одночасно з тією ж кривою.

### 11.3 Вихідна комплексність

Усе з попередніх спроб тепер **видалено з generator'а**:
- Body margin-inline animation — **нема** (контент невидимий,
  немає куди "зіштовхувати")
- `.layout-frame` / in-flow slot stacking contexts — **нема**
  (stacking не важливий коли нема з чим стекатися)
- `body { transition: margin; will-change: margin }` — **нема**

Що **залишилось** в push @media:
1. Sidebar fixed + offscreen transform + cascade resets
2. `:root { --drawer-push-width: var(--drawer-panel-width-mobile) }`
   (бо shell default ще 100% поки Portal не redeploy-нутий)
3. `html { overflow-x: hidden }`
4. `body.drawer-is-open { overflow: hidden }` (CSS fallback
   для scroll-lock, на випадок коли shell JS застарілий)
5. Focus mode: fade-out non-sidebar `[data-slot]` + `.layout-frame`
6. `.drawer-backdrop { display: none }`

### 11.4 Z-index insurance

Sidebar `--drawer-z-push-sidebar: 2000` (було 1). Як belt-and-
suspenders на випадок коли якесь residual рендерить над focus-
hidden елементами. 2000 б'є будь-який sticky-header з z:999.

### 11.5 Chevron visibility

Старе: `--drawer-fab-chev-size: 14px`, `stroke-width="2.5"` →
ефективний stroke 1.4px. Занадто тонко.

Нове: `--drawer-fab-chev-size: 18px`, `stroke-width="3"` →
ефективний stroke 2.25px. Контрастно, видно навіть при
антиалайзингу.

### 11.6 Що треба для live state

1. **Re-export layout 2132** в LM → upload CSS + HTML у Supabase →
   `/revalidate`. Це підтягне нові generator rules (focus-mode +
   чевронну stroke=3 + push-width override).
2. **Portal redeploy** — для того щоб нова `portal-shell.js`
   (one-tap, Vaul scroll-lock, pointer swipe) доїхала. Без
   deploy-у стара armed-логіка ще жива.

Після обох кроків — перевірити на iPhone Safari:
- Відкрити `/themes/456456` у mobile viewport
- Тап на FAB → sidebar з'їжджає в 520ms, контент + header + footer
  зникають одночасно
- Спробувати скролити sidebar (повинен мати власний скрол)
- Свайп в сторону (проти edge-у) — має закрити
- Тап поза sidebar (невидима зона) — має робити нічого, НЕ повертати
  контент через body scroll

### 11.7 Тест-контракти

Оновлені в `css-generator.test.ts`:
- `emits push rules only inside the @media block, not globally` — нема push
  селекторів зовні @media
- `hides everything non-sidebar when body.drawer-is-open (focus mode)` —
  `body.drawer-is-open [data-slot]:not([data-drawer-side])` має
  opacity:0 + visibility:hidden + pointer-events:none
- `push sidebar is offscreen at rest via --drawer-open-{side}, always
  visible on open` — sidebar має explicit opacity:1 + visibility:visible
  (опт-аут з focus-mode)

---

---

## 12. Спроба 8 — sidebar invisibility bug + armed-label-beside-circle

Після коміту focus-architecture користувач написав: "сайдбар невидимий".
Причина знайдена: `opacity: 0` на `.layout-frame` (через combined
селектор `body.drawer-is-open [data-slot]:not(...), .layout-frame`)
каскадується на ВСЮ її піддерево включно з sidebar. `opacity: 0` —
**не перебивна** атомарна властивість піддерева stacking-контексту;
`opacity: 1` на descendant її НЕ повертає. `visibility: hidden`
навпаки — перебивна.

**Фікс:**
- `body.drawer-is-open [data-slot]:not([data-drawer-side])` — БОТ
  `opacity: 0` + `visibility: hidden` (прямі non-sidebar [data-slot])
- `body.drawer-is-open .layout-frame` — ТІЛЬКИ `visibility: hidden`
  (перебивне), без opacity

**Плюс "armed label beside circle" attempt:** я вирішив що armed-
state зламаний і переписав його — label тепер `position: absolute`
ВИЩЕ кружка (bottom: calc(100% + 10px)), кружок не росте.

Коміт: `8558a9fd fix(portal): sidebar visibility + armed FAB label beside circle`.

---

## 13. Спроба 9 — REVERT approved trigger design (user blocked redesign)

Користувач побачив мою "label above circle" зміну і сказав:
> "не міняй дизайн. поверний дизайн який був, він затверджений,
> не чипай і не вигадуй."

Прямий копіпаст з commit 4f410c82 (останній approved):
- `packages/ui/src/portal/portal-shell.css` — verbatim
- `apps/portal/public/assets/portal-shell.js` — verbatim

Approved дизайн: armed = pill grows downward (height: auto), label
inside (writing-mode vertical-rl), chevron `height: 0; opacity: 0`
(ховається). Кружок на rest 44×44, на armed виростає в пілл.

Коміт: `6c2d6f9a revert(portal): restore approved FAB trigger design`.

Але це дропнуло Vaul scroll-lock та pointer swipe — їх у approved
JS нема. Довелось додавати їх **ADDITIVELY** в наступній ітерації.

---

## 14. Спроба 10 — Vaul lock + pointer swipe (ADDITIVE до approved JS)

Зміни в `portal-shell.js` БЕЗ touching armed-flow:
- `lockBodyScroll` / `unlockBodyScroll` — Vaul pattern (position:fixed;
  top:-scrollY; restore window.scrollTo on close)
- Виклики вбудовані в `openDrawer` / `closeDrawer` (єдина точка вставки)
- `pointerdown` / `pointerup` listeners у кінці файлу для swipe-
  close; `|dx| > |dy|` + (`|dx| > 25% push-width` OR velocity > 0.35)

Плюс спроба "sidebar 100% width" (щоб focus-mode закривав увесь
viewport) — користувач сказав "блоки поплющило", відкотив назад.

Коміт: `c10dc7f6 fix(portal): Vaul scroll lock + pointer swipe, keep 300px push width`.

---

## 15. Спроба 11 — push width from YAML (not code)

Користувач: "звідки це взагалі? ширина пуша має визначатися
налаштуваннями сайдбару на мобільному в лайаут менеджері, а не
впіляна десь в код".

Виявив: генератор мав dead code `.drawer-panel { width: X }` (селектор
`.drawer-panel` не використовується — sidebars ARE панелі). Замість
нього тепер:

```css
@media (max-width: 767px) {
  :root {
    --drawer-panel-width: 320px;
    --drawer-push-width: 320px;
  }
}
```

Де `320px` — значення з YAML `grid.mobile.drawer-width`. Inspector
вже експонує це поле для BP з drawer/push режимом.

Також прибрав свій хардкод `:root { --drawer-push-width: var(--drawer-panel-width-mobile) }`.

Коміт: `e93a96d7 refactor(layout-maker): drawer width driven by YAML, not code`.

---

## 16. Поточні проблеми (2026-04-22, після коміта e93a96d7)

Користувач повідомляє три відкриті баги:

### 16.1 Трігер ресайзиться + шеврон не видно на мобільному

- Approved design (armed-pill) РОСТЕ при першому тапі. Це by design —
  але користувач не хоче цього на мобільному.
- В armed-state chevron отримує `height: 0; opacity: 0` → невидимий.
- На rest-state (до armed) chevron 14×14 з stroke-width=3 повинен
  бути видно, але користувач каже "не видно".

**Гіпотези:**
- Живий html ще має `stroke-width="2"` (re-export не зроблений);
  при 14×14 ефективний stroke 1.17px — на темно-синьому фоні майже
  невидимий.
- АБО chevron ховається в armed-state і користувач бачить тільки
  armed (бо автоматично армиться швидко).
- АБО вже в open-state, де shell ховає opposite-side FAB, але
  same-side залишається з непрозорим scale — можливо scale(0.8)
  плюс transform зі scroll-lock спричиняє дивні координати.

### 16.2 Скролер у пуш драуері не працює

- Body залочено Vaul-pattern-ом (position:fixed) — це зупиняє
  body-scroll ✓
- Sidebar має `overflow-y: auto; overscroll-behavior: contain;
  touch-action: pan-y` ✓

**Гіпотези:**
- На live ще діє legacy CSS правило з `.layout-frame { opacity: 0 }`
  (user re-export був ДО мого split-fix коміта 8558a9fd). Focus-mode
  ховає sidebar через каскадну opacity — користувач бачить порожню
  сторінку, думає що sidebar не скролиться (насправді sidebar є але
  invisible).
- АБО Portal ще не redeploy-нутий → старий portal-shell.js без
  lockBodyScroll → body залишається scrollable → scroll-fight між
  sidebar і body.
- АБО sidebar `touch-action: pan-y` якимось чином блокує pointerdown
  на сайдбарі, js-scroll handler сайдбара не фаериться.

### 16.3 Свайп не закриває драуер

- `portal-shell.js` має pointerdown/pointerup handlers з велосіті-
  trigger.

**Гіпотези:**
- Portal ще не redeploy-нутий → JS swipe handler ще не зашиплений
  → навіть якщо користувач робить правильний свайп, нічого не
  відбувається.
- АБО sidebar `touch-action: pan-y` блокує horizontal pan гест;
  браузер не forwardить pointermove для горизонтального жесту.
- АБО drawer-is-open-{side} клас не встановлюється (click handler
  не спрацював на FAB).

---

## 17. Що критично перевірити ПЕРЕД наступною атакою

1. **Чи Portal redeployed?** Перевірити `apps/portal/public/assets/portal-shell.js`
   на live: містить `lockBodyScroll` функцію? Якщо ні — Vercel
   deploy потрібен.
2. **Чи re-export layout зроблений ПІСЛЯ коміта 8558a9fd?**
   Перевірити live CSS: рядок `body.drawer-is-open .layout-frame {
   opacity: 0 }` — якщо присутній, це legacy; fix не долетів.
3. **Чи Inspector має drawer-width заповнений на mobile BP?**
   Якщо empty — fallback на shell default (100% на non-deployed
   portal, `var(--drawer-panel-width-mobile)` на deployed).

---

## 18. Список файлів які чіпалися в цьому quest-і

| Файл | Тип змін |
|---|---|
| `tools/layout-maker/runtime/lib/css-generator.ts` | Кілька ітерацій: body margin → in-flow z-index → offscreen sidebar → focus-mode → split opacity/visibility → YAML-driven drawer-width |
| `tools/layout-maker/runtime/lib/html-generator.ts` | `stroke-width` 2 → 2.5 → 3 |
| `tools/layout-maker/runtime/lib/css-generator.test.ts` | Переписані push-тести під кожну архітектурну ітерацію |
| `apps/portal/public/assets/portal-shell.js` | Переписаний (Vaul + one-tap) → revert до approved → + additive Vaul + swipe |
| `packages/ui/src/portal/portal-shell.css` | Токени bumps → armed-label-redesign → revert до approved |
| `tools/layout-maker/src/components/DrawerPreview.tsx` | Прибрано armed-state (ще не відновлено після revert) |
| `tools/layout-maker/PARITY-LOG.md` | 3 Fixed записи |
| `tools/layout-maker/drawer-push-quest.md` | Цей документ |

---

## 19. Commit trail (в хронологічному порядку)

```
4dc7354d refactor(portal,layout-maker): push drawer focus architecture
8558a9fd fix(portal): sidebar visibility + armed FAB label beside circle
6c2d6f9a revert(portal): restore approved FAB trigger design
c10dc7f6 fix(portal): Vaul scroll lock + pointer swipe, keep 300px push width
e93a96d7 refactor(layout-maker): drawer width driven by YAML, not code
```

---

_Кінець літопису. Користувач: "все ще проблеми". Три відкритих
пункти в §16. Перед наступною атакою — §17 (верифікувати deploy
state). Якщо після deploy + re-export проблеми залишаються —
логувати детальну Playwright-діагностику кожного з трьох бугів і
повертатися до §7.1 (React Portal pattern) або розглядати
заміну FAB-логіки на простіший один-тап._
