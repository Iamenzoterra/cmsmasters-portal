# Sprint Plan: MVP Slice (V2 — corrected 30 March 2026)

> 4 апки + інфра. Section-driven architecture.
> Support + AI — відкладено. DS оновлюється через токени.
> V1 (28 березня) мав flat 27-column schema — відхилено як drift від візії.
> V2 відновлює section-driven model: `meta` + `sections[]` + `seo`.

---

## Ціль

End-to-end pipeline: створити тему в Studio (section-based page builder) → побачити її на публічній сторінці Portal (rendered from sections[]) → юзер бачить свої теми в Dashboard → адмін керує всім в Admin.

---

## Що вже є

| Що | Статус |
|----|--------|
| Nx монорепо | ✅ configured |
| tokens.css (222 рядки, Figma sync) | ✅ generated |
| Design system (Three-Layer, shadcn Obra base) | ✅ working |
| 22 ADR files | ✅ V2/V3 aligned |
| Command Center (6 pages) | ✅ localhost:4000 |
| .context/ folder (6 files, ~44 KB) | ✅ agent-ready |
| **Layer 0: Infrastructure** | **✅ DONE** |
| — Supabase: 4 tables, RLS, functions, triggers | ✅ deployed |
| — packages/db, auth, api-client, validators | ✅ implemented |
| — Hono API: auth middleware, revalidate, upload | ✅ implemented |
| **Layer 1 partial: Studio shell** | **🟡 partial** |
| — Login, themes list (grid/table/search/filter) | ✅ WP-003 ph 0-2 |
| — Section page builder (5 core editors + stub) | ✅ WP-004 ph 1-4 |
| — Save/publish/delete with toast + audit | ✅ WP-003 ph 4 |

---

## Проблема: архітектурний drift

Studio побудоване з flat 27-column schema. Оригінальна візія: вся сторінка = масив `sections[]`, порядок з JSON, 100% section-driven. Що є — hardcoded template з flat полями.

**WP-004 виправляє це зараз** (0 rows в DB, найдешевший момент). Деталі: `workplan/WP-004-section-architecture.md`.

---

## Порядок побудови (оновлений)

```
LAYER 0: Infra                          ✅ DONE
  ├─ Supabase schema + RLS              ✅
  ├─ Auth PKCE + route guards           ✅
  ├─ Hono API skeleton                  ✅
  └─ Shared packages wiring             ✅

WP-004: Section Architecture Recovery   ✅ DONE (completed 30 March 2026)
  ├─ DB: drop flat columns → meta + sections[] + seo jsonb
  ├─ Types + validators: section registry, per-type schemas
  ├─ Boundary mappers: themeRowToFormData ↔ formDataToThemeInsert
  ├─ Query recovery: list, editor, save/publish
  └─ Studio editor: flat form → section page builder

WP-003 Phase 5-7: Studio Polish         ← after WP-004
  ├─ Error boundaries, 404, media stub
  ├─ Integration verify (end-to-end CRUD)
  └─ Docs update

LAYER 2: Portal page                     ~2-3 дні (after Studio)
  └─ /themes/[slug] SSG — renders ordered sections[]

LAYER 3: Dashboard + Admin (паралельно)  ~3-4 дні
  ├─ Dashboard: profile + my themes
  └─ Admin: users + themes + audit
```

---

## LAYER 0: Infrastructure ✅ DONE

**Supabase** (project: `yxcqtwuyktbjxstahfqj`):
- 4 таблиці: profiles, themes, licenses, audit_log
- 15 RLS policies
- 3 функції: get_user_role, handle_new_user, update_updated_at
- 3 тригери: profiles_updated, themes_updated, on_auth_user_created

**themes table (WP-004 done):**
- 9 columns: `id, slug, status, meta (jsonb), sections (jsonb), seo (jsonb), created_by, created_at, updated_at`

**Packages:**
- `@cmsmasters/db` — client, types, queries (themes, profiles, audit)
- `@cmsmasters/auth` — client, hooks, guards (RequireAuth), actions (magic link)
- `@cmsmasters/api-client` — Hono RPC typed client
- `@cmsmasters/validators` — nested themeSchema, section registry (12 types), validateSectionData()
- `@cmsmasters/ui` — tokens.css + Button primitive

**Hono API** (`apps/api/`):
- Auth + role middleware
- `POST /api/content/revalidate`
- `POST /api/upload` (R2 stub)
- `GET /api/health`

---

## WP-004: Section Architecture Recovery (CURRENT)

**Що міняється:**

DB schema:
```sql
themes: id, slug, status,
  meta JSONB,      -- {name, tagline, category, price, links, badges, resources, rating, sales}
  sections JSONB,  -- [{type: "theme-hero", data: {...}}, {type: "feature-grid", data: {...}}, ...]
  seo JSONB,       -- {title, description}
  created_by, created_at, updated_at
```

Section registry (12 типів, core 5 з повним UI):
- `theme-hero`, `feature-grid`, `plugin-comparison`, `trust-strip`, `related-themes` — full editor
- `before-after`, `video-demo`, `testimonials`, `faq`, `cta-banner`, `stats-counter`, `resource-sidebar` — schema + JSON textarea

Studio editor → page builder:
- Ліво: ordered list of sections (add/remove/reorder/expand-to-edit)
- Право: meta sidebar (thumbnail, status, category, price, rating, sales, badges, resources, SEO, meta)

**Деталі:** `workplan/WP-004-section-architecture.md`

---

## LAYER 1: Studio (Vite + React Router)

**Мета:** Content Manager створює тему як набір секцій в section page builder.

**Що вже побудовано (WP-003 phases 0-4):**
- Vite SPA scaffold, routing, auth (magic link), app shell
- Themes list (grid/table, search, filter, pagination, status badges)
- Theme editor (flat form — переписується в WP-004)
- Save/publish/delete, toast, audit logging, loading states

**Що залишилось (WP-003 phases 5-7, після WP-004):**
- Error boundaries, 404 page, media page stub
- Integration verify (end-to-end CRUD з section model)
- Docs update

**Data flow (після WP-004):**
1. Page builder → `{ meta: {...}, sections: [{type, data}, ...], seo: {...} }`
2. Save → Supabase upsert themes table (meta + sections + seo)
3. Publish → status='published' + `POST /api/content/revalidate` via Hono
4. Media → Hono API → R2 signed URL → upload → URL в section data

---

## LAYER 2: Portal Theme Page (Next.js SSG)

**Мета:** публічна сторінка теми, рендериться з ordered `sections[]`.

```
/apps/portal/
  app/themes/[slug]/page.tsx — SSG from Supabase
```

**Рендеринг (section-driven, не hardcoded template):**
```tsx
export function ThemePage({ theme }) {
  return (
    <main>
      {theme.sections.map((section, i) => {
        const Component = SECTION_COMPONENTS[section.type]
        return Component ? <Component key={i} {...section.data} meta={theme.meta} /> : null
      })}
    </main>
    <aside>
      <ResourceSidebar resources={theme.meta.resources} />
    </aside>
  )
}
```

Порядок секцій = порядок в JSON. Хочеш прибрати секцію з конкретної теми — не включай. Хочеш додати відео — додай в масив. Нуль змін коду.

**SEO:** generateMetadata() з meta + seo, JSON-LD Product, OG tags.
**Revalidation:** Studio publish → Hono → revalidatePath.

**WP-005 (пізніше):** Astro замість Next.js для zero-JS output, triple format (HTML + MD + JSON).

---

## LAYER 3A: Dashboard (Vite + React Router)

**Мета:** клієнт бачить профіль і свої теми.

- Login (magic link)
- My Themes: grid карток (licenses joined з themes через `meta->>'name'`)
- Profile: edit name
- Licenses: read-only list

**Не зараз:** Envato verification, downloads, activation, emails.

---

## LAYER 3B: Admin (Vite + React Router)

**Мета:** admin бачить і керує всіма юзерами і темами.

- Overview: 3 KPI cards + activity feed
- Users: table (search, filter by role, drill-down, role change + audit)
- Themes: all themes table (status, link to Studio)
- Audit log: paginated table with filters

---

## Acceptance Criteria (весь MVP slice)

### Infra ✅
- [x] Supabase schema deployed
- [x] RLS policies working
- [x] Auth PKCE: magic link → session → role-based guard
- [x] Hono API responds
- [x] packages/db types importable

### Studio (after WP-004)
- [ ] Theme editor is section-based page builder (not flat form)
- [ ] Default sections appear on new theme (hero, features, plugins, trust, related)
- [ ] Can add/remove/reorder sections
- [ ] Save persists meta + sections[] + seo to Supabase
- [ ] Publish triggers revalidation
- [ ] Themes list reads from meta jsonb correctly

### Portal
- [ ] /themes/[slug] renders SSG from Supabase sections[]
- [ ] Section order matches JSON order
- [ ] SEO: JSON-LD, OG tags
- [ ] Revalidation: Studio publish → page updates

### Dashboard
- [ ] Login → see My Themes (from licenses + themes meta)
- [ ] Profile edit
- [ ] Themes grid with correct data from meta jsonb

### Admin
- [ ] Overview with KPI
- [ ] Users table with role management + audit
- [ ] Themes table
- [ ] Audit log viewer

---

## Що відкладено (explicit)

| Відкладене | Коли |
|-----------|------|
| Support App + AI chat | окремий спринт |
| Envato API verification | Dashboard V2 |
| Activation flow (WP → Portal) | Dashboard V2 |
| Download signed URLs | Dashboard V2 |
| Email notifications (Resend) | Dashboard V2 |
| Studio live preview (iframe) | WP-005 Part 4 |
| Semantic HTML output (Astro) | WP-005 Part 1 |
| Triple output (HTML + MD + JSON) | WP-005 Part 2 |
| Story Builder (Figma → section) | WP-005 Part 3 |
| Blog system | Portal V2 |
| Homepage (10 sections) | Portal V2 |
| Theme catalog /themes з пошуком | Portal V2 |
| Meilisearch | Portal V2 |

---

## Оцінка (оновлена)

| Крок | Effort | Залежність |
|------|--------|-----------|
| ~~0: Infra~~ | ~~2-3 дні~~ | ✅ DONE |
| WP-004: Architecture fix | 1-1.5 дні | Layer 0 ✅ |
| WP-003 ph 5-7: Studio polish | 0.5-1 день | WP-004 |
| 2: Portal page | 2-3 дні | WP-004 + 1 тема |
| 3: Dashboard + Admin | 3-4 дні (паралельно) | Layer 0 ✅ |
| **Remaining** | **~7-10 днів** | |
