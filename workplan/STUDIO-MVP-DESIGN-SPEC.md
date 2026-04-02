# Studio MVP — Дизайн-специфікація для Figma

> Для дизайнера. Джерело правди для UI/UX студії.
> Після затвердження — це reference для Claude Code.

---

## Що це

**Content Studio** — внутрішній інструмент для контент-менеджера CMSMasters. Не публічний сайт, а закрита SPA-апка за логіном. Тут створюються і редагуються WordPress-теми які потім з'являються на публічному порталі.

**Аналогія:** Contentful / Strapi / WordPress admin, але кастомний під конкретну задачу — управління каталогом WordPress-тем.

**Юзер:** один-два контент-менеджери. Не тисячі користувачів. Працюють щодня, 8+ годин. Пріоритет — ефективність, не wow-ефект.

---

## Дизайн-система

Дизайн будується виключно на існуючих токенах з двох Figma-файлів:

| Файл | Figma Key | Що містить |
|------|-----------|------------|
| **CMS DS Portal** (shadcn Obra) | `PodaGqhhlgh6TLkcyAC5Oi` | shadcn семантичні кольори (light+dark), radii, spacing |
| **Portal DS** (CMSMasters brand) | `CLtdO56o9fJCx19EnhH1nI` | brand primitives, Bg/Text/Border/Status/Button/Tag/Card семантика |

### Палітра для Studio

Studio — **внутрішній інструмент**, тому використовує **light mode** як основний (dark mode деferred).

**Фони:**
- Сторінка: `--bg-page` (тепла біж, HSL 20 23% 97%)
- Поверхні (картки, панелі): `--bg-surface` (білий)
- Альтернативний фон: `--bg-surface-alt` (сіро-білий)
- Elevated (модалки, dropdown): `--bg-elevated` (білий + shadow)

**Текст:**
- Основний: `--text-primary` (майже чорний, HSL 0 0% 9%)
- Вторинний: `--text-secondary` (темно-сірий, HSL 0 0% 33%)
- Приглушений: `--text-muted` (тепло-сірий, HSL 38 12% 62%)
- Посилання: `--text-link` (синій, HSL 227 72% 51%)

**Рамки:**
- Стандартна: `--border-default` (тепло-сіра, HSL 30 19% 90%)
- Легка: `--border-light` (HSL 0 0% 87%)
- Фокус: `--border-focus` (синій, HSL 227 72% 51%)

**Кнопки:**
- Primary: `--btn-primary-bg` (navy, HSL 230 58% 20%) + `--btn-primary-fg` (білий)
- Secondary: `--btn-secondary-bg` (синій, HSL 227 72% 51%) + `--btn-secondary-fg` (білий)
- Outline: `--btn-outline-border` + `--btn-outline-fg` (navy)

**Статуси:**
- Успіх: `--status-success-bg` / `--status-success-fg`
- Помилка: `--status-error-bg` / `--status-error-fg`
- Попередження: `--status-warn-bg` / `--status-warn-fg`
- Інфо: `--status-info-bg` / `--status-info-fg`

**Типографіка:**
- Шрифт: Inter (як у всій системі)
- Body: `--type-15-size` (0.9375rem / 15px), line-height `--type-15-lh`
- Small: `--type-13-size` (0.8125rem / 13px)
- H1: `--type-32-size` (2rem / 32px)
- H2: `--type-26-size` (1.625rem / 26px)
- H3: `--type-20-size` (1.25rem / 20px)
- H4: `--type-18-size` (1.125rem / 18px)

**Радіуси:**
- Стандартний: `--radius` (0.625rem / 10px)
- Дрібний (inputs): `--radius-md` (0.375rem / 6px) або `--radius-lg` (0.5rem / 8px)
- Картки: `--radius-xl` (0.75rem / 12px)
- Великий (модалки): `--radius-2xl` (1rem / 16px)
- Pill (tags): `--radius-full` (9999px)

**Spacing:**
- Внутрішній padding карток: `--spacing-lg` (1.25rem) — `--spacing-xl` (1.5rem)
- Gap між елементами: `--spacing-sm` (0.75rem) — `--spacing-md` (1rem)
- Секції: `--spacing-2xl` (2rem) — `--spacing-3xl` (2.5rem)

---

## Компоненти (shadcn/ui Obra base)

Дизайн-система будується на **shadcn/ui** (Obra стиль — вже в Figma файлі CMS DS Portal). Всі базові компоненти:

**Вже є / стандартні shadcn:**
Button, Input, Textarea, Select, Checkbox, Switch, Label, Badge, Card, Dialog (модалки), Dropdown Menu, Popover, Sheet (бокова панель), Separator, Skeleton, Toast, Tooltip, Tabs, Table

**Потрібно додизайнити для Studio:**
- Form field wrapper (label + input + error message + helper text)
- Repeater field (dynamic list: add/remove/reorder items)
- Image upload zone (drag-and-drop area + preview thumbnail)
- Status badge (draft=жовтий, published=зелений, archived=сірий)
- Sidebar navigation (fixed left, collapsible)
- Page header (title + breadcrumb + actions)
- Empty state (ілюстрація + текст + CTA)
- Data table з пагінацією і сортуванням

---

## Сторінки

### 1. Login

**URL:** `/login`
**Layout:** по центру, без sidebar

**Елементи:**
- Логотип CMSMasters (зверху по центру)
- Заголовок: "Content Studio"
- Підзаголовок: "Sign in to manage themes"
- Email input field
- Button "Send Magic Link" (primary)
- Footer text: "Check your email for the login link"

**Стан "лінк надіслано":**
- Іконка конверта
- "Magic link sent to {email}"
- "Didn't receive it? Send again" (таймер 60 сек)

**Примітка:** Magic link — єдиний спосіб логіну. Без паролів.

---

### 2. App Shell (layout для всіх сторінок після логіну)

**Структура:**
```
┌──────────────────────────────────────────────┐
│  [Logo]  Content Studio        [Avatar ▾]    │  ← Top bar (h: 56-64px)
├────────┬─────────────────────────────────────┤
│        │                                     │
│  Nav   │        Page Content                 │
│        │                                     │
│ Themes │                                     │
│ Media  │                                     │
│        │                                     │
│        │                                     │
│        │                                     │
│        │                                     │
│ ────── │                                     │
│ Help   │                                     │
│ Logout │                                     │
│        │                                     │
└────────┴─────────────────────────────────────┘
   ↑ 220-240px
```

**Top bar:**
- Ліворуч: логотип CMSMasters (compact) + "Content Studio" label
- Праворуч: avatar + ім'я юзера + dropdown (Profile Settings, Logout)
- Фон: `--bg-surface`, border-bottom `--border-default`

**Sidebar:**
- Фіксована зліва, ширина 220–240px
- Фон: `--bg-surface`
- Навігація:
  - **Themes** (іконка: LayoutGrid) — посилання на /
  - **Media** (іконка: Image) — посилання на /media
- Розділювач
  - **Help** (іконка: HelpCircle) — зовнішнє посилання
  - **Logout** (іконка: LogOut)
- Активний пункт: `--bg-surface-alt` фон + `--text-primary` + лівий accent border `--btn-primary-bg`

**Page content:**
- Фон: `--bg-page`
- Max-width: 1280px (для списку), без max-width для editor (fluid)
- Padding: `--spacing-2xl` (2rem)

---

### 3. Themes List (`/` — головна після логіну)

**Page header:**
- H1: "Themes"
- Праворуч: Button "Create Theme" (primary, іконка Plus)

**Toolbar:**
- Search input (ліворуч, placeholder: "Search themes...")
- Filter dropdown: Status (All / Draft / Published / Archived)
- View toggle: Grid / Table (іконки)

**Grid view (default):**
- 3-4 колонки responsive
- Картка теми:
  - Thumbnail зображення (зверху, aspect ratio ~16:10, fallback placeholder якщо немає зображення)
  - Назва теми (bold, `--type-18-size`)
  - Category tag (pill badge, `--tag-inactive-bg`)
  - Status badge: Draft (жовтий), Published (зелений), Archived (сірий)
  - Ціна (якщо є): "$59" (`--type-15-size`, `--text-secondary`)
  - Останнє оновлення: "Updated 2h ago" (`--type-13-size`, `--text-muted`)
  - Клік → `/themes/{slug}`

**Table view:**
- Колонки: Thumbnail (маленький, 48x36px), Name, Category, Status, Price, Updated
- Row hover: `--bg-surface-alt`
- Row клік → `/themes/{slug}`

**Empty state (коли тем ще немає):**
- Ілюстрація (мінімалістична, в brand кольорах)
- "No themes yet"
- "Create your first theme to get started"
- Button "Create Theme" (primary)

**Пагінація:**
- Знизу: "Showing 1-12 of 45 themes"
- Кнопки Previous / Next

---

### 4. Theme Editor (`/themes/:slug` та `/themes/new`)

Найскладніша сторінка. Це основний робочий інструмент. Тут контент-менеджер проводить 80% часу.

**Layout:**
```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Themes    Flavor Theme              [Actions]│  ← Page header
├──────────────────────────────────────────┬───────────────┤
│                                          │               │
│         Form Fields                      │   Side Panel  │
│         (scrollable)                     │               │
│                                          │  Thumbnail    │
│  ┌─ Basic Info ──────────────────┐       │  Status       │
│  │  Name: [Flavor Theme       ]  │       │  Slug         │
│  │  Tagline: [Creative Multi..]  │       │  Category     │
│  │  Description: [textarea     ] │       │  Price        │
│  └───────────────────────────────┘       │               │
│                                          │  ──────────── │
│  ┌─ Links ───────────────────────┐       │  Meta         │
│  │  Demo URL: [http://...]       │       │  Created: ... │
│  │  ThemeForest URL: [http://..] │       │  Updated: ... │
│  │  ThemeForest ID: [24452857]   │       │  Created by:..│
│  └───────────────────────────────┘       │               │
│                                          │               │
│  ┌─ Features ────────────────────┐       │               │
│  │  [Feature 1: icon, title, ..] │       │               │
│  │  [Feature 2: icon, title, ..] │       │               │
│  │  [+ Add Feature]             │       │               │
│  └───────────────────────────────┘       │               │
│                                          │               │
│  ┌─ Plugins ─────────────────────┐       │               │
│  │  [Plugin 1: name, slug, val]  │       │               │
│  │  [+ Add Plugin]              │       │               │
│  └───────────────────────────────┘       │               │
│                                          │               │
│  ┌─ SEO ─────────────────────────┐       │               │
│  │  Title: [70 chars max]        │       │               │
│  │  Description: [160 chars max] │       │               │
│  │  Character counter shown      │       │               │
│  └───────────────────────────────┘       │               │
│                                          │               │
├──────────────────────────────────────────┴───────────────┤
│  [Discard Changes]              [Save Draft] [Publish]   │  ← Sticky footer
└──────────────────────────────────────────────────────────┘
```

**Page header:**
- Ліворуч: "← Back to Themes" (текстовий лінк)
- Центр: Назва теми (H2) або "New Theme" для нової
- Праворуч: дії (kebab menu: Delete theme, Duplicate)

**Основна форма (ліва частина, ~65-70% ширини):**

Форма розділена на collapsible секції з заголовками:

**Секція "Basic Info":**
- Name (text input, required, підсвічується червоним якщо порожній)
- Slug (text input, auto-generated з name, editable, format: `lowercase-with-dashes`)
- Tagline (text input, max 500 chars, character counter)
- Description (textarea, 4-6 рядків, resizable)

**Секція "Links":**
- Demo URL (url input, валідація URL формату)
- ThemeForest URL (url input)
- ThemeForest ID (text input)

**Секція "Media":**
- Thumbnail (image upload zone — drag-and-drop або click to browse, shows preview)
- Preview Images (sortable gallery — drag-and-drop для додавання, drag для зміни порядку, X для видалення)

**Секція "Features" (repeater):**
- Список фіч, кожна = рядок з:
  - Icon (text input або icon picker)
  - Title (text input)
  - Description (text input)
- Кнопка "+ Add Feature" знизу
- Drag handle зліва для зміни порядку
- Кнопка видалення (X або trash icon) праворуч
- Пустий стан: "No features added yet"

**Секція "Included Plugins" (repeater):**
- Список плагінів, кожен = рядок:
  - Name (text input)
  - Slug (text input, auto from name)
  - Value (number input, ціна плагіну)
  - Icon URL (text input, optional)
- "+ Add Plugin", drag-and-drop, delete

**Секція "Custom Sections" (repeater):**
- Кожна секція:
  - Type (select/text: before-after, video-demo, testimonial, custom-cta)
  - Data (JSON textarea або structured sub-form)
- **Примітка для дизайнера:** це advanced функціональність. Може бути simplified на MVP — навіть просто JSON editor з syntax highlighting. Не потрібно вигадувати складний UI для кожного типу секції.

**Секція "SEO":**
- SEO Title (text input, max 70 chars, live character counter з кольором: зелений до 60, жовтий 60-70, червоний 70+)
- SEO Description (textarea, max 160 chars, аналогічний counter)
- Preview: мініатюра Google result (як виглядатиме в пошуку)

**Side Panel (права частина, ~30-35% ширини, sticky):**
- **Thumbnail preview** (якщо завантажений)
- **Status toggle:** Draft ↔ Published (switch або segmented control)
- **Slug:** відображення поточного slug з іконкою копіювання
- **Category:** select dropdown (creative, business, portfolio, blog, ecommerce, nonprofit, education, health, technology, food, travel, real-estate, other)
- **Price:** number input з "$" prefix
- **Meta інформація:**
  - Created: дата
  - Updated: дата
  - Created by: ім'я юзера

**Sticky footer (завжди видимий знизу):**
- Ліворуч: "Discard Changes" (ghost/text button, enabled тільки коли є unsaved changes)
- Праворуч: "Save Draft" (outline button) + "Publish" (primary button)
- Якщо тема вже published: "Save" (primary) замість "Save Draft" + "Publish"
- Unsaved changes indicator: dot або текст "Unsaved changes" у footer

**Стани форми:**
- Loading (Skeleton layout поки дані вантажаться)
- Error (Toast notification при помилці збереження)
- Success (Toast "Theme saved successfully" / "Theme published")
- Validation errors (поля підсвічуються, scroll to first error)
- Unsaved changes warning при спробі покинути сторінку

---

### 5. Media Library (`/media`)

**MVP scope:** мінімальна версія для завантаження зображень тем.

**Layout:**
- Page header: "Media Library" + "Upload" button
- Grid зображень (4-6 колонок)
- Кожна картка: thumbnail, filename, date, size
- Клік → preview з URL для копіювання

**Upload:**
- Drag-and-drop zone на всю сторінку (або в модалку)
- Progress indicator
- Після upload: image з'являється в grid

**Примітка:** повна медіа-бібліотека (фільтри, теги, пошук) — Studio V2. MVP = upload + grid + copy URL.

---

### 6. Delete Confirmation (модалка)

- Dialog з іконкою warning
- "Delete {theme name}?"
- "This action cannot be undone. The theme and all its data will be permanently removed."
- Кнопки: "Cancel" (outline) + "Delete" (destructive — червоний)

---

## UX-патерни

### Autosave vs Manual Save
**MVP: Manual save** (кнопка Save). Autosave deferred. Причина: простіше для першої версії, менше edge-cases.

### Form validation
- Client-side validation через Zod schema
- Inline errors під полями (червоний текст, `--status-error-fg`)
- Border полів з помилкою: `--status-error-fg`
- При Save: scroll до першої помилки

### Navigation
- Sidebar для глобальної навігації (Themes, Media)
- Breadcrumbs для контексту всередині editor
- "Back to Themes" як основний шлях назад

### Responsive
- Мінімальна ширина: 1024px (це десктопний інструмент)
- На менших екранах: sidebar згортається в hamburger
- Editor: side panel під формою на вузьких екранах

### Confirmation patterns
- Delete: завжди модалка
- Leave з unsaved changes: browser dialog (beforeunload)
- Publish: без додаткового підтвердження (кнопка і так явна)

---

## Figma Deliverables

### Обов'язкові фрейми:

1. **Login** — default + "link sent" state
2. **App Shell** — sidebar + top bar layout
3. **Themes List** — grid view + table view + empty state
4. **Theme Editor** — заповнена форма з усіма секціями
5. **Theme Editor** — пустий стан (нова тема)
6. **Theme Editor** — стан з validation errors
7. **Media Library** — grid з файлами + upload zone
8. **Delete Confirmation** — модалка

### Компоненти для бібліотеки:

1. **Form Field** — label + input + error + helper (варіанти: text, textarea, number, url, select)
2. **Repeater Field** — add/remove/reorder list item
3. **Image Upload Zone** — empty + with preview + uploading
4. **Status Badge** — draft (жовтий) / published (зелений) / archived (сірий)
5. **Theme Card** — для grid view списку тем
6. **SEO Preview** — Google search result мініатюра
7. **Sidebar Navigation** — nav item default + active + hover
8. **Page Header** — title + breadcrumb + actions
9. **Sticky Footer** — save/publish actions bar
10. **Empty State** — illustration placeholder + text + CTA
11. **Toast Notification** — success / error / warning / info

### Що НЕ потрібно дизайнити:

- Dark mode (deferred)
- Mobile layout (десктопний інструмент)
- Docs editor / Blog editor (Studio V2)
- Collections manager (Studio V2)
- Live preview iframe (Studio V2)
- Media library filters/tags (Studio V2)
- User settings page (окрема задача)
- Onboarding / tutorial

---

## Інтерактивні нотатки

- Sidebar може бути collapsible (280px → 64px icon-only) — опціонально
- Theme Card в grid має hover state (subtle shadow elevation)
- Repeater fields мають плавну анімацію при add/remove
- Drag-and-drop для Preview Images та Repeater items
- Toast з'являється top-right, автоматично зникає через 5 секунд
- Search має debounce (не шукати на кожну літеру)

---

## Технічні обмеження для дизайнера

1. **Всі кольори — тільки з токенів.** Не вигадувати нових кольорів. Якщо потрібний відтінок — знайди найближчий токен.
2. **Компоненти базуються на shadcn/ui Obra.** Не перемальовувати кнопки, inputs, selects з нуля — взяти base і стилізувати токенами.
3. **Іконки — Lucide React.** Стандартний набір. Не потрібні кастомні іконки.
4. **Шрифт — Inter.** Один шрифт, різні ваги (400, 500, 600, 700).
5. **Максимальна щільність інформації для editor.** Це робочий інструмент, не маркетинговий сайт. Менше повітря, більше корисного контенту у viewport.
