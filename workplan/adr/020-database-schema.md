---
id: 20
title: 'Database Schema — Section-Driven Content Model'
version: 3
status: active
category: data-future
relatedADRs: [5, 8, 9, 12, 18, 21]
supersededBy: null
date: 2026-03-30
---

# ADR-020: Database Schema — Section-Driven Content Model

> **V3** — themes таблиця: від flat columns до `meta` + `sections` + `seo` jsonb. Дата: 30 березня 2026.

**V1 (що було):**
- Шість таблиць з flat columns, `role` enum для всіх юзерів

**V2 (проміжна):**
- Normalized relational schema: users, themes (flat: id, slug, name, category, current_version, is_active), licenses, tickets, subscriptions
- `staff_role` замість generic `role` (узгоджено з ADR-005 V2)
- Themes як flat таблиця з колонками per field

**Що було побудовано (реальний стан):**
- themes таблиця з 27 flat колонками: id, slug, name, tagline, description, category, price, demo_url, themeforest_url, themeforest_id, thumbnail_url, preview_images, features, included_plugins, custom_sections, seo_title, seo_description, status, created_by, created_at, updated_at, hero, compatible_plugins, trust_badges, rating, sales, resources
- Кожна «секція» сторінки = окрема колонка. Додавання нового типу секції = ALTER TABLE + нова колонка + новий код в формі + новий код в шаблоні

---

## Context

Drift analysis (30 березня 2026) виявив: themes таблиця з 27 flat колонками — протилежність section-driven моделі з ADR-009 V3. В flat-моделі порядок секцій зашитий в код, не в дані. Додавання нового типу секції потребує змін в 4 місцях (DB schema, types, Studio form, Portal template). В section-driven моделі — нуль змін в DB.

**Критичний факт: themes таблиця має 0 рядків.** Міграція безкоштовна. Це найдешевший момент для корекції data model.

## Decision

### themes таблиця — три jsonb поля замість 27 flat колонок

```sql
-- Drop existing flat columns and restructure
ALTER TABLE themes
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS demo_url,
  DROP COLUMN IF EXISTS themeforest_url,
  DROP COLUMN IF EXISTS themeforest_id,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS preview_images,
  DROP COLUMN IF EXISTS features,
  DROP COLUMN IF EXISTS included_plugins,
  DROP COLUMN IF EXISTS custom_sections,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS hero,
  DROP COLUMN IF EXISTS compatible_plugins,
  DROP COLUMN IF EXISTS trust_badges,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS sales,
  DROP COLUMN IF EXISTS resources;

-- Add structured jsonb columns
ALTER TABLE themes
  ADD COLUMN meta jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN sections jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN seo jsonb DEFAULT '{}';
```

**Результуюча структура themes:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `slug` | `text` | UNIQUE, URL-safe identifier |
| `status` | `text` | CHECK (`draft`, `published`, `archived`) |
| `created_by` | `uuid` | FK → `auth.users(id)`, nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, auto-update trigger |
| `meta` | `jsonb` | NOT NULL, theme-level properties |
| `sections` | `jsonb` | NOT NULL, ordered array of page sections |
| `seo` | `jsonb` | nullable, SEO overrides |

### meta jsonb — theme-level properties

```typescript
interface ThemeMeta {
  name: string                    // "Growth Hive"
  tagline?: string                // "Consulting & Digital Marketing Theme"
  description?: string            // full description
  category: string                // "business" | "healthcare" | "creative" | ...
  price: number                   // 69
  themeforest_url: string         // full ThemeForest URL
  themeforest_id: string          // "62212058"
  demo_url?: string               // "https://growth-hive.cmsmasters.studio"
  thumbnail_url?: string          // "/themes/growth-hive/thumb.webp"
  rating?: number                 // 4.58
  sales?: number                  // 2366
  compatible_plugins?: string[]   // ["elementor", "woocommerce", "wpml"]
  trust_badges?: string[]         // ["power-elite", "elementor", "gdpr"]
  resources?: {
    public?: string[]             // ["docs", "changelog", "faq", "demos"]
    licensed?: string[]           // ["download", "child-theme", "psd", "support"]
    premium?: string[]            // ["priority-support", "megakit-access"]
  }
}
```

### sections jsonb — ordered array of page sections

```typescript
interface ThemeSection {
  type: string                    // key in Section Registry (ADR-009 V3)
  data: Record<string, unknown>   // per-type data, validated by per-type Zod schema
}

// Example:
type ThemeSections = ThemeSection[]
// [
//   { type: "theme-hero", data: { headline: "...", screenshots: [...] } },
//   { type: "feature-grid", data: { features: [...], columns: 3 } },
//   { type: "plugin-comparison", data: { included_plugins: [...] } },
//   ...
// ]
```

Порядок в масиві = порядок секцій на сторінці. Пересортування = зміна порядку елементів. Видалення секції = видалення елементу. Додавання = push нового елементу. Нуль змін в DB schema.

### seo jsonb — SEO overrides

```typescript
interface ThemeSEO {
  title?: string                  // override для <title>
  description?: string            // override для meta description
  og_image?: string               // custom OG image URL
}
```

Якщо seo порожнє — Portal генерує мета з meta.name і meta.tagline автоматично.

### Повна schema всіх таблиць

```
auth.users
    └── profiles (1:1 profile extension)
            ├── licenses (1:N) → themes (N:1, via theme_id or slug)
            ├── tickets  (1:N) → themes (N:1, optional)
            └── subscriptions (1:1 active at a time)
```

**profiles** (renamed from `users` для ясності):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` |
| `email` | `text` | unique, not null |
| `display_name` | `text` | |
| `staff_role` | `text` | NULL for customers, `support_operator` / `content_manager` / `admin` for staff |
| `elements_subscriber` | `boolean` | default false, self-declared (ADR-004 V2) |
| `avatar_url` | `text` | |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | |

**themes:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `slug` | `text` | UNIQUE |
| `status` | `text` | `draft` / `published` / `archived` |
| `meta` | `jsonb` | NOT NULL, theme-level properties |
| `sections` | `jsonb` | NOT NULL, ordered section array |
| `seo` | `jsonb` | nullable, SEO overrides |
| `created_by` | `uuid` | FK → `auth.users(id)`, nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | auto-update trigger |

**licenses:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles(id)` |
| `theme_slug` | `text` | FK → `themes(slug)` |
| `purchase_code` | `text` | ThemeForest purchase code |
| `license_type` | `text` | `regular` / `extended` |
| `envato_item_id` | `text` | |
| `verified_at` | `timestamptz` | |
| `support_until` | `timestamptz` | |
| `created_at` | `timestamptz` | |

UNIQUE constraint on `(user_id, theme_slug)`. RLS: user sees only own rows.

**tickets:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles(id)` |
| `theme_slug` | `text` | nullable (generic tickets) |
| `subject` | `text` | |
| `status` | `text` | `open` / `in_progress` / `waiting` / `resolved` / `closed` |
| `priority` | `text` | `low` / `medium` / `high` / `urgent` |
| `assigned_to` | `uuid` | FK → `profiles(id)`, nullable |
| `ai_summary` | `text` | auto-generated by AI agent |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |
| `resolved_at` | `timestamptz` | |

RLS: customer sees own tickets. Support operator sees all tickets (read + update status). Admin sees all.

**ticket_messages:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `ticket_id` | `uuid` | FK → `tickets(id)` |
| `sender_type` | `text` | `customer` / `ai` / `operator` |
| `sender_id` | `uuid` | FK → `profiles(id)`, nullable for AI |
| `content` | `text` | |
| `attachments` | `jsonb` | array of { url, filename, size } |
| `created_at` | `timestamptz` | |

**subscriptions** (Epic 2, table exists but unused):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles(id)` |
| `plan` | `text` | `free` / `pro` / `agency` |
| `status` | `text` | `trialing` / `active` / `past_due` / `cancelled` |
| `current_period_start` | `timestamptz` | |
| `current_period_end` | `timestamptz` | |
| `stripe_subscription_id` | `text` | |
| `created_at` | `timestamptz` | |

Partial unique index: one active subscription per user.

**activity_log:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK → `profiles(id)` |
| `action` | `text` | `registered` / `activated` / `opened_ticket` / `downloaded` / ... |
| `theme_slug` | `text` | nullable |
| `metadata` | `jsonb` | action-specific data |
| `created_at` | `timestamptz` | |

**audit_log:**

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `actor_id` | `uuid` | FK → `profiles(id)` |
| `actor_role` | `text` | role at time of action |
| `action` | `text` | `create` / `update` / `delete` / `login` / `role_change` / ... |
| `target_type` | `text` | `theme` / `user` / `license` / `ticket` / `setting` |
| `target_id` | `text` | |
| `details` | `jsonb` | what changed |
| `ip_address` | `text` | |
| `created_at` | `timestamptz` | |

### RLS Policies

**profiles:**
- Customer: `SELECT WHERE id = auth.uid()`
- Support: `SELECT` all profiles (read-only, for ticket context)
- Content Manager: `SELECT WHERE id = auth.uid()` only
- Admin: full access

**themes:**
- Everyone (including anonymous): `SELECT WHERE status = 'published'`
- Content Manager: `SELECT, INSERT, UPDATE` all themes
- Admin: full access including DELETE

**licenses:**
- Customer: `SELECT WHERE user_id = auth.uid()`
- Support: `SELECT` all (read-only, for ticket context)
- Admin: full access
- Service role only: `INSERT, UPDATE` (від Hono API після Envato verification)

**tickets:**
- Customer: `SELECT, INSERT WHERE user_id = auth.uid()`
- Support: `SELECT` all, `UPDATE` (status, assigned_to, ai_summary)
- Admin: full access

**ticket_messages:**
- Customer: `SELECT WHERE ticket.user_id = auth.uid()`, `INSERT` own messages
- Support: `SELECT, INSERT` on assigned tickets
- Admin: full access

**subscriptions:**
- Customer: `SELECT WHERE user_id = auth.uid()`
- Admin: full access
- Service role only: `INSERT, UPDATE` (від Stripe webhook через Hono API)

**activity_log, audit_log:**
- Customer: no access
- Support: no access
- Content Manager: no access
- Admin: `SELECT` only (INSERT via service role)

### Indexes

```sql
-- themes
CREATE INDEX idx_themes_status ON themes(status);
CREATE INDEX idx_themes_category ON themes((meta->>'category'));
CREATE INDEX idx_themes_slug ON themes(slug);  -- already UNIQUE

-- licenses
CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_theme ON licenses(theme_slug);
CREATE UNIQUE INDEX idx_licenses_user_theme ON licenses(user_id, theme_slug);

-- tickets
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);

-- subscriptions
CREATE UNIQUE INDEX idx_subscriptions_active 
  ON subscriptions(user_id) 
  WHERE status IN ('trialing', 'active');

-- activity_log
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_action ON activity_log(action);

-- audit_log
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### Querying sections (JSONB patterns)

```sql
-- Get all themes with a specific section type
SELECT slug, meta->>'name' as name
FROM themes
WHERE sections @> '[{"type": "video-demo"}]'
  AND status = 'published';

-- Get theme with hero data
SELECT 
  slug,
  meta->>'name' as name,
  (SELECT elem->>'data' 
   FROM jsonb_array_elements(sections) elem 
   WHERE elem->>'type' = 'theme-hero'
   LIMIT 1) as hero_data
FROM themes
WHERE slug = 'growth-hive';

-- Count sections per theme
SELECT 
  slug,
  meta->>'name' as name,
  jsonb_array_length(sections) as section_count
FROM themes
WHERE status = 'published'
ORDER BY section_count DESC;
```

### TypeScript types

```typescript
// packages/db/src/types.ts (auto-generated from Supabase + manual enrichment)

interface Theme {
  id: string
  slug: string
  status: 'draft' | 'published' | 'archived'
  meta: ThemeMeta
  sections: ThemeSection[]
  seo: ThemeSEO | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface ThemeSection {
  type: string
  data: Record<string, unknown>
}

// Validated version with per-type schemas
type ValidatedThemeSection = 
  | { type: 'theme-hero'; data: z.infer<typeof themeHeroSchema> }
  | { type: 'feature-grid'; data: z.infer<typeof featureGridSchema> }
  | { type: 'plugin-comparison'; data: z.infer<typeof pluginComparisonSchema> }
  // ... one union member per section type in registry
```

### Migration script

```sql
-- Migration: flat columns → meta + sections + seo
-- Safe: themes table has 0 rows, this is a schema-only change

-- 1. Add new columns
ALTER TABLE themes ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]';
ALTER TABLE themes ADD COLUMN IF NOT EXISTS seo jsonb DEFAULT '{}';

-- 2. Drop flat columns (only if they exist, safe)
DO $$
DECLARE
  cols text[] := ARRAY[
    'name', 'tagline', 'description', 'category', 'price',
    'demo_url', 'themeforest_url', 'themeforest_id', 'thumbnail_url',
    'preview_images', 'features', 'included_plugins', 'custom_sections',
    'seo_title', 'seo_description', 'hero', 'compatible_plugins',
    'trust_badges', 'rating', 'sales', 'resources'
  ];
  col text;
BEGIN
  FOREACH col IN ARRAY cols LOOP
    EXECUTE format('ALTER TABLE themes DROP COLUMN IF EXISTS %I', col);
  END LOOP;
END $$;

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_themes_category ON themes((meta->>'category'));
```

## Consequences

**Positive:**
- Додавання нового типу секції = нуль змін в DB. Тільки schema + component + registry entry
- Content Studio працює як page builder: drag-and-drop масиву секцій (ADR-014 V3)
- Порядок секцій визначається даними, не кодом
- AI може генерувати повний `sections[]` масив по schema
- `meta` jsonb гнучкий для додавання нових theme-level полів без ALTER TABLE
- Entitlement checks (ADR-005 V2): `licenses JOIN themes` on `theme_slug` — працює без змін

**Negative / Trade-offs:**
- JSONB менш строгий ніж typed columns — валідація переноситься на application layer
- Пошук по полях всередині jsonb потребує GIN indexes або JSONB operators
- Міграція даних всередині jsonb (зміна schema секції) складніша ніж ALTER TABLE
- Backup/restore працює так само, але schema changes не трекаються Supabase migrations для вмісту jsonb

**Addressed changes:**
- ADR-020 V2 → V3: themes з flat columns → `meta` + `sections` + `seo` jsonb
- Узгоджено з ADR-009 V3 (section-driven pages) і ADR-014 V3 (Content Studio page builder)
- profiles таблиця renamed (від `users`) для ясності, структура з ADR-005 V2 збережена
- Всі інші таблиці (licenses, tickets, ticket_messages, subscriptions, activity_log, audit_log) — без змін
