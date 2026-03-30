# Theme Editor V2 — Design Spec

> **Superseded by WP-004 section architecture.** This spec describes the WP-003 flat form design. For current section-driven model, see `workplan/WP-004-section-architecture.md` and `.context/BRIEF.md`.

> Extends the existing Theme Editor with all ADR-009 fields.
> Pipeline: this spec → HTML mockup → Figma capture → token-bound rebuild
> Reference: existing Figma frame `3289:2` (Content Studio — Theme Editor)

---

## What exists (Figma frame 3289:2, screenshot verified)

Current editor has 4 form sections + side panel + sticky footer:

```
Left column (~65%):
  Section 1: Basic Info — Name, Tagline, Description
  Section 2: Links — Demo URL, ThemeForest URL, ThemeForest ID
  Section 3: Features — repeater [{icon, title, description}], "+ Add Feature"
  Section 4: SEO — SEO Title (52/70 counter), SEO Description (142/160 counter)

Right column (~35%):
  Thumbnail — image preview + "Upload image" link
  Status — Published badge (green dot + label)
  Category — dropdown (Creative)
  Price — $ + number input
  META — Created (15 Jan 2026), Updated (2h ago), By (Designer)

Footer (sticky):
  [Discard Changes]                    [Save Draft] [Publish]
```

---

## What needs to be added (6 new DB columns + expanded existing)

### New sections for LEFT column (insert between existing sections)

**Section 2.5: Hero (new — after Links, before Features)**

Hero section controls what Portal renders at the top of the theme page: screenshot carousel + headline.

```
┌─ Hero ──────────────────────────────────────────────┐
│                                                      │
│  Headline (optional)                                 │
│  ┌──────────────────────────────────────────────────┐│
│  │  Override default "Name + Tagline" hero text     ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  Screenshots                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌ ─ ─ ─ ┐              │
│  │ img1 │ │ img2 │ │ img3 │ │+ Add  │              │
│  │      │ │      │ │      │ │       │              │
│  └──────┘ └──────┘ └──────┘ └ ─ ─ ─ ┘              │
│  Drag to reorder. These appear in the hero carousel. │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Fields:
- `hero.headline` — text input, placeholder: "Override default hero text"
- `hero.screenshots` — sortable thumbnail gallery (URL inputs for MVP), dashed "+" button to add
- Helper text below thumbnails: muted, small

Visual style: same card as other sections (border-default, rounded-xl, padding).

---

**Section 3.5: Plugins & Compatibility (new — after Features, before SEO)**

Two sub-sections in one card.

```
┌─ Plugins & Compatibility ───────────────────────────┐
│                                                      │
│  Included Plugins                                    │
│  ┌────────────┬────────────┬─────────┬────────────┐ │
│  │ Name       │ Slug       │ Value $ │ Icon URL   │ │
│  ├────────────┼────────────┼─────────┼────────────┤ │
│  │ ACF PRO    │ acf-pro    │  59     │ https://...│ │
│  │ Slider Rev │ slider-rev │  29     │ https://...│ │
│  └────────────┴────────────┴─────────┴────────────┘ │
│  [+ Add Plugin]                                      │
│                                  Total value: $88    │
│                                                      │
│  ── separator ──────────────────────────────────── │
│                                                      │
│  Compatible With                                     │
│  ┌─────────┐ ┌───────────┐ ┌──────┐ ┌───────┐      │
│  │Elementor│ │WooCommerce│ │ WPML │ │ Yoast │      │
│  └─────────┘ └───────────┘ └──────┘ └───────┘      │
│  [+ add]                                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Fields:
- `included_plugins` — repeater table [{name, slug, value ($), icon_url}]
  - Auto-sum row at bottom: "Total value: $XXX" — right-aligned, muted text, semibold number
  - This powers the Plugin Comparison block on Portal ("$148 value vs $69 price — Save $79")
- Separator: 1px border-light
- `compatible_plugins` — chip/tag multi-select from predefined list
  - Chips: same style as Tag tokens (Tag/active-bg, Tag/active-fg for selected; Tag/inactive-bg, Tag/inactive-fg, Tag/inactive-border for unselected)
  - Predefined options: elementor, woocommerce, wpml, yoast, contact-form-7, acf, gravity-forms, mailchimp, gutenberg

---

**Section 4.5: Custom Sections (new — after SEO)**

```
┌─ Custom Sections ───────────────────────────────────┐
│                                                      │
│  These render unique content blocks on the Portal    │
│  theme page (before-after sliders, video demos,      │
│  testimonials, custom CTAs).                         │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ {                                                ││
│  │   "type": "before-after",                        ││
│  │   "data": {                                      ││
│  │     "before": "https://...",                     ││
│  │     "after": "https://..."                       ││
│  │   }                                              ││
│  │ }                                                ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  Valid types: before-after, video-demo,              │
│  testimonial, custom-cta                             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Fields:
- `custom_sections` — JSON textarea, monospace font
  - Pretty-printed on load
  - Validation on blur: valid JSON + valid types
  - Helper text below: muted, lists valid types
  - Height: auto-expand or min-height ~160px

MVP only: JSON textarea. Structured per-type editors (with drag-drop, visual previews) = Studio V2.

---

### New fields for RIGHT column (side panel)

**Add after Price, before META separator:**

```
┌─ Side panel (continued) ────────────────────────────┐
│                                                      │
│  ... Thumbnail, Status, Category, Price (existing)   │
│                                                      │
│  Rating                                              │
│  ┌─ ★ ★ ★ ★ ☆ ──────────────┐                      │
│  │  4.58                      │                      │
│  └────────────────────────────┘                      │
│                                                      │
│  Sales                                               │
│  ┌────────────────────────────┐                      │
│  │  2,366                     │                      │
│  └────────────────────────────┘                      │
│                                                      │
│  Trust Badges                                        │
│  ┌────────────┐ ┌──────────┐ ┌──────┐              │
│  │Power Elite │ │Elementor │ │ GDPR │              │
│  └────────────┘ └──────────┘ └──────┘              │
│  [+ add]                                             │
│                                                      │
│  Resources                                           │
│  Public                                              │
│  ┌──────┐ ┌─────────┐ ┌─────┐ ┌───────┐            │
│  │ docs │ │changelog│ │ faq │ │ demos │            │
│  └──────┘ └─────────┘ └─────┘ └───────┘            │
│  Licensed                                            │
│  ┌────────┐ ┌───────────┐ ┌─────┐ ┌───────┐        │
│  │download│ │child-theme│ │ psd │ │support│        │
│  └────────┘ └───────────┘ └─────┘ └───────┘        │
│  Premium                                             │
│  ┌────────────────┐ ┌──────────────┐                │
│  │priority-support│ │megakit-access│                │
│  └────────────────┘ └──────────────┘                │
│  [+ add to each tier]                                │
│                                                      │
│  ── separator ──────────────────────────────────── │
│                                                      │
│  META (existing)                                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Fields:
- `rating` — number input (0–5, step 0.01) with visual star display
  - 5 star icons: filled up to rating value, half-star for .5
  - Input below or inline with stars
- `sales` — integer input, formatted with commas (2,366)
- `trust_badges` — chip multi-select, same style as compatible_plugins
  - Options: power-elite, elementor, gdpr, wpml, responsive, retina, gutenberg, dark-mode
- `resources` — three labeled tag groups (ADR-005 V2 access tiers)
  - Public: editable tags, muted "🔓" prefix
  - Licensed: editable tags, muted "🔒" prefix
  - Premium: editable tags, muted "⭐" prefix
  - Each group: existing tags with × remove + text input to add new

---

## Complete section order (after expansion)

### Left column
1. **Basic Info** — Name, Tagline, Description *(existing)*
2. **Links** — Demo URL, ThemeForest URL, ThemeForest ID *(existing)*
3. **Hero** — headline, screenshots gallery *(NEW)*
4. **Features** — repeater [{icon, title, description}] *(existing)*
5. **Plugins & Compatibility** — included plugins table + compatible chips *(NEW)*
6. **SEO** — title (70 chars), description (160 chars), SERP preview *(existing)*
7. **Custom Sections** — JSON textarea *(NEW)*

### Right column (side panel)
1. **Thumbnail** — image preview + upload *(existing)*
2. **Status** — Published/Draft/Archived badge *(existing)*
3. **Category** — dropdown *(existing)*
4. **Price** — $ input *(existing)*
5. **Rating** — star display + number input *(NEW)*
6. **Sales** — integer input *(NEW)*
7. **Trust Badges** — chip multi-select *(NEW)*
8. **Resources** — 3-tier tag groups (public/licensed/premium) *(NEW)*
9. **META** — Created, Updated, By *(existing)*

---

## Design tokens to use

All new elements follow existing editor style. Token reference:

| Element | Token | Resolved |
|---------|-------|----------|
| Section card bg | `Card/bg` or `Bg/surface` | white |
| Section card border | `Card/border` or `Border/default` | rgb(234,229,224) |
| Section card radius | `rounded-xl` (from Obra spacing) | 16px |
| Section card padding | `xl` spacing | 24px |
| Section title | `Text/primary`, Manrope SemiBold 18px | rgb(24,24,24) |
| Field label | `Text/primary`, Manrope Medium 14px | rgb(24,24,24) |
| Field input border | `Border/default` | rgb(234,229,224) |
| Field input radius | `rounded-lg` | 12px |
| Field input height | 40px (from existing) | — |
| Placeholder text | `Text/muted` | rgb(170,161,146) |
| Helper text | `Text/muted`, 12px | rgb(170,161,146) |
| Chip active bg | `Tag/active-bg` | — |
| Chip active text | `Tag/active-fg` | — |
| Chip inactive bg | `Tag/inactive-bg` | — |
| Chip inactive border | `Tag/inactive-border` | — |
| Separator | `Border/light` | rgb(221,221,221) |
| Counter text | `Text/link`, 13px | rgb(41,81,220) |
| "+ Add" button | dashed border, `Text/link`, 14px | — |
| Repeater row bg | transparent, border-bottom `Border/light` | — |

---

## HTML mockup frame size

**1220 × 2400** (same width as existing editor, taller to accommodate new sections).

Page scrolls vertically — the side panel is sticky.

---

## Pipeline next steps

1. **Create HTML mockup** following FIGMA_DESIGN_WORKFLOW.md Step 3
   - File: `tools/studio-mockups/theme-editor-v2.html`
   - Include all 7 left sections + all 9 right panel items
   - Use Tailwind CDN + Manrope + Lucide + Portal DS colors
   - Frame 1220×2400, includes capture script

2. **Serve + preview** (Step 4)

3. **Capture to Figma** (Step 5) → into Obra file as reference

4. **Rebuild with tokens** (Step 7) → replace existing frame 3289:2

5. **Update Phase 3 prompt** to reference new Figma frame instead of old one


---

## THE BIG PICTURE: One JSON → One Theme Page (ADR-009)

This is WHY the editor exists. Every field in the editor produces a piece of JSON. That JSON is stored as one row in Supabase `themes` table (27 columns). Portal reads that row and renders a full public theme page through the ThemePage template.

**The editor is the input. The JSON is the contract. The Portal page is the output.**

```
Studio Editor          →  Supabase themes row  →  Portal /themes/[slug]
(content manager)         (27-column JSON)          (public visitor)
```

---

### Complete JSON shape (what the editor produces)

```json
{
  "slug": "growth-hive",
  "name": "Growth Hive",
  "tagline": "Consulting & Digital Marketing Theme",
  "description": "A stunning, feature-rich WordPress theme...",
  "category": "business",
  "price": 69,

  "themeforest_url": "https://themeforest.net/item/growth-hive/12345",
  "themeforest_id": "12345",
  "demo_url": "https://growth-hive.cmsmasters.studio",

  "hero": {
    "screenshots": [
      "https://r2.cmsmasters.com/growth-hive/hero-1.webp",
      "https://r2.cmsmasters.com/growth-hive/hero-2.webp",
      "https://r2.cmsmasters.com/growth-hive/hero-3.webp"
    ],
    "headline": "Build your consulting empire with Growth Hive"
  },

  "thumbnail_url": "https://r2.cmsmasters.com/growth-hive/thumb.webp",
  "preview_images": [
    "https://r2.cmsmasters.com/growth-hive/preview-1.webp",
    "https://r2.cmsmasters.com/growth-hive/preview-2.webp"
  ],

  "features": [
    { "icon": "palette", "title": "12 Unique Demos", "description": "Ready-to-use demo websites for different business niches" },
    { "icon": "layout", "title": "Elementor Builder", "description": "Full visual editing experience with 40+ custom widgets" },
    { "icon": "zap", "title": "Performance Optimized", "description": "Scores 95+ on Google PageSpeed without plugins" }
  ],

  "included_plugins": [
    { "name": "ACF PRO", "slug": "acf-pro", "value": 59, "icon_url": "https://..." },
    { "name": "Slider Revolution", "slug": "slider-revolution", "value": 29, "icon_url": "https://..." },
    { "name": "CMSMasters Content Composer", "slug": "cmsmasters-addon", "value": 39, "icon_url": "https://..." }
  ],

  "compatible_plugins": ["elementor", "woocommerce", "wpml", "yoast", "contact-form-7"],

  "trust_badges": ["power-elite", "elementor", "gdpr", "wpml", "responsive"],

  "rating": 4.58,
  "sales": 2366,

  "resources": {
    "public": ["docs", "changelog", "faq", "demos"],
    "licensed": ["download", "child-theme", "psd", "support"],
    "premium": ["priority-support", "megakit-access"]
  },

  "custom_sections": [
    {
      "type": "before-after",
      "data": { "before": "https://r2.cmsmasters.com/growth-hive/ba-before.webp", "after": "https://r2.cmsmasters.com/growth-hive/ba-after.webp" }
    },
    {
      "type": "video-demo",
      "data": { "youtubeId": "dQw4w9WgXcQ", "poster": "https://r2.cmsmasters.com/growth-hive/video-poster.webp" }
    },
    {
      "type": "testimonial",
      "data": { "quote": "Growth Hive transformed our online presence", "author": "Sarah Chen", "company": "Apex Consulting", "avatar": "https://..." }
    }
  ],

  "seo_title": "Growth Hive — Consulting & Digital Marketing WordPress Theme",
  "seo_description": "A stunning, feature-rich WordPress theme perfect for creative professionals, agencies, and businesses. Includes 12 demos, Elementor builder, and premium plugins.",

  "status": "published"
}
```

---

### JSON → Portal page mapping (ADR-009: 85% template + 15% custom)

Each JSON field powers a specific section of the Portal `/themes/[slug]` page. This is the ThemePage template.

```
Portal Page Section          ← JSON Fields Used                    ← Editor Section
─────────────────────────────────────────────────────────────────────────────────
SECTION 1: Hero              ← hero.screenshots (carousel)         ← Hero
                             ← name + tagline (or hero.headline)   ← Basic Info / Hero
                             ← demo_url (Demo button)              ← Links
                             ← themeforest_url (Buy button)        ← Links
                             ← trust_badges (badge row)            ← Side: Trust Badges
                             ← rating + sales (social proof)       ← Side: Rating + Sales

SECTION 2: Feature Grid      ← features[] (3×N grid)              ← Features
                             ← Each: icon → Lucide icon
                             ←         title → card heading
                             ←         description → card body

SECTION 3: Plugin Comparison ← included_plugins[] (grid + calc)    ← Plugins & Compat
  "KILLER CONVERSION BLOCK"  ← Each: name, icon_url, value ($)
                             ← price (theme price for comparison)  ← Side: Price
                             ← Auto: "$148 value vs $69 — Save $79"

SECTION 4: Resource Sidebar  ← resources.public[] (🔓 open)       ← Side: Resources
  (sticky, right side)       ← resources.licensed[] (🔒 locked)
                             ← resources.premium[] (⭐ upgrade)
                             ← Per-entitlement lock messaging (ADR-005 V2)

SECTION 5: Custom Sections   ← custom_sections[] (15% unique)     ← Custom Sections
                             ← type → component selector
                             ← data → component props
                             ← Types: before-after, video-demo,
                               testimonial, custom-cta

SECTION 6: Trust Strip       ← trust_badges (reused from hero)    ← Side: Trust Badges
  (bottom, full-width)       ← Hardcoded: "95K+ customers",
                               "65+ themes", "16 years"

SECTION 7: Cross-sell        ← category (same-category query)     ← Side: Category
                             ← Query: WHERE category = X LIMIT 4
─────────────────────────────────────────────────────────────────────────────────
SEO (invisible, per page)    ← seo_title → <title> + og:title     ← SEO
                             ← seo_description → <meta> + og:desc
                             ← thumbnail_url → og:image
                             ← price, rating → JSON-LD Product
```

---

### What this means for the editor

Every field the content manager fills in the editor **directly affects a visible section** on the public page. Nothing is decorative. Nothing is optional metadata that nobody sees.

| If editor field is empty... | ...this breaks on Portal |
|----------------------------|--------------------------|
| `hero.screenshots` empty | Hero has no carousel — just text on blank background |
| `features` empty | Feature Grid section doesn't render — page looks thin |
| `included_plugins` empty | Plugin Comparison disappears — biggest conversion killer gone |
| `trust_badges` empty | No badges in hero, no trust strip — zero social proof |
| `resources` empty | Resource Sidebar empty — no reason for user to come back |
| `rating` / `sales` missing | No social proof numbers in hero |
| `custom_sections` empty | Fine — this is the 15% optional part |
| `seo_title` empty | Google shows auto-generated title — bad CTR |

This is why the editor needs ALL fields, not just Basic Info + Links + SEO.

---

### Adding a new theme = filling this JSON

The editor makes this fast:
1. Content Manager opens `/themes/new`
2. Fills name, tagline, category, price
3. Uploads screenshots → hero.screenshots
4. Adds 6–8 features with icons
5. Lists included plugins with prices → auto-calculates value
6. Selects compatible plugins + trust badges
7. Sets up resources per access tier
8. Optionally adds custom sections (before-after slider, video demo)
9. Fills SEO fields
10. Publish → Supabase row → Portal SSG rebuilds → public page live

AI-оркестратор can generate steps 2–9 from ThemeForest data in minutes. Content manager reviews and publishes.
