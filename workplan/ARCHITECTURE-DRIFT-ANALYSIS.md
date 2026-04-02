# Architecture Drift Analysis: Vision vs Reality

> What was planned, what was built, what broke, how to fix it.
> Created: 30 March 2026

---

## THE ORIGINAL VISION (from conversations, pre-ADR)

Four interconnected ideas that form one system:

### 1. 100% section-driven pages

Every page = `sections[]` array. NOT 85% template + 15% custom. The entire page is assembled from sections. Order determined by JSON, not code.

```json
{
  "slug": "growth-hive",
  "meta": { "name": "...", "category": "...", "price": 69 },
  "sections": [
    { "type": "theme-hero", "data": { ... } },
    { "type": "feature-grid", "data": { ... } },
    { "type": "plugin-comparison", "data": { ... } },
    { "type": "before-after", "data": { ... } },
    { "type": "trust-strip", "data": { ... } },
    { "type": "related-themes", "data": { ... } }
  ]
}
```

One renderer, one section registry. Want to remove Plugin Comparison from one theme — don't include it. Want to add video before features — move it in the array. Zero code changes.

### 2. Semantic HTML+CSS output (not React hydration)

Public pages = pure HTML+CSS. No JS bundle on the browser. No React hydration. Semantic tags: `<article>`, `<section>`, `<nav>`, `<aside>`, `<main>`. Google reads perfect HTML. AI reads clean structure.

### 3. Three output formats from one source

Each page generates THREE files at build time:
- **HTML+CSS** → for browsers and Google
- **Markdown** → for AI models (ChatGPT, Claude, Perplexity)
- **JSON** → for API consumers and AI helpers

All from one source of truth: the `sections[]` array in Supabase.

### 4. Story Builder + Content Studio as page builder

**Story Builder** — separate app that takes Figma designs and generates:
- JSON schema per section type
- HTML+CSS template per section type
- Storybook story per section type

**Content Studio** — NOT a 27-field form. A drag-and-drop page builder:
```
┌──────────────────────────────────┐
│  Growth Hive — Page Builder       │
│  [+ Add Section]                  │
│                                    │
│  ┌─ 1. Theme Hero ──── [↑↓] [✕] ┐│
│  │  headline: "Build your..."     ││
│  │  screenshots: [3 images]       ││
│  └────────────────────────────────┘│
│                                    │
│  ┌─ 2. Feature Grid ── [↑↓] [✕] ┐│
│  │  features: [12 items]          ││
│  └────────────────────────────────┘│
│                                    │
│  ┌─ 3. Video Demo ──── [↑↓] [✕] ┐│
│  │  youtubeId: "abc123"           ││
│  └────────────────────────────────┘│
│                                    │
│  [+ Add Section]                  │
│    → Theme Hero                   │
│    → Feature Grid                 │
│    → Plugin Comparison            │
│    → Before/After                 │
│    → Video Demo                   │
│    → ...                          │
└──────────────────────────────────┘
```

Live preview in iframe. Reorder sections = reorder on page. Add section = appears on page.

---

## WHAT ADR-009 SAYS (already a simplification)

> "One React template (ThemePage) renders page from JSON data. 85% — fixed sections auto-filled from JSON. 15% — customSections array."

ADR-009 already lost the "100% sections" idea. It hardcoded 6 sections (Hero, Feature Grid, Plugin Comparison, Resource Sidebar, Trust Strip, Cross-sell) and left only `customSections` as flexible. This was the first drift — ADR itself simplified the vision before code was written.

---

## WHAT WE ACTUALLY BUILT

### Database: 27 flat columns
```
themes: id, slug, name, tagline, description, category, price,
        demo_url, themeforest_url, themeforest_id, thumbnail_url,
        preview_images, features, included_plugins, custom_sections,
        seo_title, seo_description, status, created_by,
        created_at, updated_at, hero, compatible_plugins,
        trust_badges, rating, sales, resources
```
No `sections[]` column. No `meta` wrapper. Each section's data is a separate column. Adding a new section type means adding a new column — the opposite of the vision.

### Studio: 27-field flat form
```
Section 1: Basic Info (name, tagline, description)
Section 2: Links (demo_url, themeforest_url, themeforest_id)
Section 3: Hero (hero.headline, hero.screenshots)
Section 4: Features (features[] repeater)
Section 5: Plugins & Compatibility (included_plugins[], compatible_plugins[])
Section 6: SEO (seo_title, seo_description)
Section 7: Custom Sections (JSON textarea)
```
This is a CMS form, not a page builder. Can't reorder sections. Can't remove a section from one theme. Can't add a new section type without adding DB columns + form fields + code.

### Portal: not built yet, but planned as Next.js SSG with React components
ThemePage template with hardcoded section order. React hydration on client. Not semantic HTML output.

### Types/Validators: 27 flat fields
`ThemeFormData` has all fields at top level. `themeSchema` validates flat structure.

---

## THE GAP (5 specific drifts)

| # | Vision | Reality | Impact |
|---|--------|---------|--------|
| 1 | `sections[]` array — order from JSON | 27 flat columns — order from code | Can't reorder, remove, or add sections per theme without code changes |
| 2 | Content Studio = page builder with drag-and-drop | Content Studio = 27-field form | Content managers can't compose pages visually |
| 3 | Semantic HTML+CSS output, zero JS | Next.js SSG with React hydration | Heavier pages, React noise in DOM, worse for AI crawlers |
| 4 | Three output formats (HTML + MD + JSON) | Only React-rendered HTML planned | AI models get HTML with React artifacts, not clean Markdown |
| 5 | Story Builder generates section templates from Figma | No Story Builder. Sections are React components. | No pipeline from Figma design → section template |

---

## WHAT'S SALVAGEABLE (what we DON'T need to throw away)

**Keep:**
- Supabase as database (just restructure schema)
- Hono API + secrets boundary
- `@cmsmasters/auth` package (login, guards — works regardless of content model)
- `@cmsmasters/ui` tokens + primitives (buttons, inputs reused in Studio page builder)
- Studio shell (Vite SPA, sidebar, topbar, login, themes list) — the list page is fine
- Studio form components (ChipSelect, StarRating, CharCounter, FormSection) — reusable in per-section editors
- RLS policies, audit_log, profiles, licenses tables — untouched
- Nx monorepo, workspace resolution, Tailwind setup
- Command Center — fully independent
- All infrastructure (Layer 0)

**Rework:**
- DB `themes` table — restructure to `meta` jsonb + `sections` jsonb
- Studio theme editor — from flat form to section-based page builder
- Types + validators — from flat to `meta` + `sections[]` model
- Portal rendering — from React ThemePage to section renderer (can still be Next.js SSG but with semantic output focus)

---

## RECOVERY PLAN

### Phase A: Schema migration (DB + types + validators)

**Current:** 27 flat columns
**Target:** 3 columns for content

```sql
-- New structure
themes:
  id uuid PK
  slug text UNIQUE
  status text CHECK (draft/published/archived)
  created_by uuid FK
  created_at timestamptz
  updated_at timestamptz

  -- Content (the important part)
  meta jsonb NOT NULL DEFAULT '{}'
  sections jsonb NOT NULL DEFAULT '[]'
  seo jsonb DEFAULT '{}'
```

Where `meta` holds:
```json
{
  "name": "Growth Hive",
  "tagline": "Consulting & Digital Marketing Theme",
  "description": "...",
  "category": "business",
  "price": 69,
  "themeforest_url": "...",
  "themeforest_id": "12345",
  "demo_url": "...",
  "thumbnail_url": "...",
  "rating": 4.58,
  "sales": 2366,
  "compatible_plugins": ["elementor", "woocommerce"],
  "trust_badges": ["power-elite", "elementor", "gdpr"],
  "resources": { "public": [...], "licensed": [...], "premium": [...] }
}
```

And `sections` holds:
```json
[
  {
    "type": "theme-hero",
    "data": {
      "headline": "Build your consulting empire",
      "screenshots": ["hero-1.webp", "hero-2.webp"]
    }
  },
  {
    "type": "feature-grid",
    "data": {
      "features": [
        { "icon": "palette", "title": "12 Demos", "description": "..." }
      ]
    }
  },
  {
    "type": "plugin-comparison",
    "data": {
      "included_plugins": [
        { "name": "ACF PRO", "slug": "acf-pro", "value": 59 }
      ]
    }
  },
  {
    "type": "before-after",
    "data": { "before": "ba-1.webp", "after": "ba-2.webp" }
  },
  {
    "type": "trust-strip",
    "data": {}
  },
  {
    "type": "related-themes",
    "data": { "category": "business" }
  }
]
```

**Migration:** Write SQL that moves flat columns into `meta` + `sections` jsonb. Then drop flat columns. This is non-destructive — table has 0 rows anyway.

**Types:** Replace 27-field `Theme` type with:
```typescript
interface Theme {
  id: string
  slug: string
  status: ThemeStatus
  meta: ThemeMeta
  sections: ThemeSection[]
  seo: ThemeSEO
  created_by: string | null
  created_at: string
  updated_at: string
}

interface ThemeSection {
  type: string  // registry key
  data: Record<string, unknown>  // per-type validated
}
```

**Validators:** Replace flat `themeSchema` with:
```typescript
const themeMetaSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  // ... meta fields
})

const themeSectionSchema = z.object({
  type: z.string(),
  data: z.record(z.string(), z.unknown())
})

const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  meta: themeMetaSchema,
  sections: z.array(themeSectionSchema),
  seo: themeSEOSchema.optional(),
  status: z.enum(['draft', 'published', 'archived']),
})
```

### Phase B: Section type registry + per-type schemas

Define a registry of known section types with their Zod schemas:

```typescript
// packages/validators/src/sections/index.ts
export const SECTION_REGISTRY = {
  'theme-hero': themeHeroSchema,
  'feature-grid': featureGridSchema,
  'plugin-comparison': pluginComparisonSchema,
  'trust-strip': trustStripSchema,
  'before-after': beforeAfterSchema,
  'video-demo': videoDemoSchema,
  'testimonials': testimonialsSchema,
  'related-themes': relatedThemesSchema,
  'resource-sidebar': resourceSidebarSchema,
  'faq': faqSchema,
  'cta-banner': ctaBannerSchema,
  'stats-counter': statsCounterSchema,
} as const
```

Each schema validates the `data` field for its section type. Adding a new type = adding a schema file + one line in the registry. No DB changes. No Studio code changes.

### Phase C: Studio theme editor → section-based page builder

Replace the 27-field flat form with:

**Left panel: Section list (drag-and-drop)**
- Each section shows: type label, collapse/expand, reorder handle, delete
- Expanded: per-type form (using existing form components)
- "+ Add Section" button opens section type picker
- The 7 sections from the current flat form become the DEFAULT set for new themes (auto-populated, but removable/reorderable)

**Right panel: Meta editor (sidebar)**
- Keep existing sidebar items: Thumbnail, Status, Category, Price, Rating, Sales, Trust Badges, Resources, SEO, META
- These are in `meta` — not section-specific, theme-level properties

**The existing form components (FormSection, ChipSelect, StarRating, etc.) are reused** — they just move from fixed positions to per-section expandable editors.

### Phase D: Portal renderer (section-driven, semantic HTML focus)

Instead of hardcoded ThemePage:

```tsx
// Simple renderer
export function ThemePage({ theme }: { theme: Theme }) {
  return (
    <div className="flex gap-8">
      <main className="flex-1">
        {theme.sections.map((section, i) => {
          const Component = SECTION_COMPONENTS[section.type]
          if (!Component) return null
          return <Component key={i} {...section.data} meta={theme.meta} />
        })}
      </main>
      <aside className="w-72 shrink-0">
        <ResourceSidebar resources={theme.meta.resources} />
      </aside>
    </div>
  )
}
```

For now keep Next.js SSG with React — but structure components to output clean semantic HTML (`<article>`, `<section>`, `<h2>`, etc.). The HTML+CSS vs React output format question is important but can be addressed later without changing the content model. The section-driven model is the critical fix.

### Phase E (future): Story Builder + triple output

Deferred — but the section model makes it possible:
- Story Builder takes Figma → generates section JSON schema + HTML template
- Build pipeline generates HTML + MD + JSON per page from `sections[]`
- Each section type has: React component (for Studio preview), HTML template (for Portal output), Markdown template (for AI)

---

## EFFORT ESTIMATE

| Phase | What | Impact on existing code | Effort |
|-------|------|------------------------|--------|
| A | Schema migration | DB, types.ts, validators — rewrite. 0 rows in themes, so non-destructive | 2–3h |
| B | Section registry + per-type schemas | New files in validators. Clean addition. | 2h |
| C | Studio editor → page builder | Rework theme-editor.tsx (450 lines). Reuse form components. | 4–6h |
| D | Portal section renderer | Not started yet, so no rework — just build correctly from start | Part of Layer 2 |

**Total rework: ~8–11 hours.** The key insight: themes table has 0 rows. No data migration needed. Studio has only been tested on localhost without auth. No production data to preserve. This is the cheapest moment to course-correct.

---

## WHAT DOESN'T CHANGE

- Themes list page (shows themes from DB — just reads `meta.name`, `meta.category`, `status`)
- Login, auth, guards
- Toast system, loading states, error boundaries
- Sidebar, topbar, app shell
- Supabase infrastructure (just schema change)
- Hono API (revalidation endpoint unchanged)
- All other packages (@cmsmasters/auth, @cmsmasters/ui, @cmsmasters/api-client)
- Command Center
- Layer 3 plans (Dashboard, Admin)

---

## DECISION NEEDED

This document describes the gap and a recovery path. The question for Dmitry:

1. **Do we course-correct now?** (cheapest moment — 0 rows, no production)
2. **How far?** Options:
   - **Minimum:** Schema + types + validators to `meta` + `sections[]`. Keep Studio as form for now but structure data correctly.
   - **Medium:** Schema + types + validators + Studio page builder with section reorder/add/remove.
   - **Full:** All of the above + semantic HTML output + Markdown/JSON generation + Story Builder.

Recommended: **Medium** now. Full in separate epic. The data model is the foundation — get it right now while the cost is near zero.
