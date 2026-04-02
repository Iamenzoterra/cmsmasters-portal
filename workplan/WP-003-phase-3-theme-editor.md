# WP-003 Phase 3: Theme Editor — Full Form

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 3 of 7
> Priority: P0
> Estimated: 3–4 hours
> Type: Frontend
> Previous: Phase 2 ✅ (Themes list — grid/table, search, filter, pagination, 7 components, tsc clean)
> Next: Phase 4 (Save, Publish, Delete)

---

## Context

Phase 2 delivered the themes list page. The theme editor (`/themes/:slug` and `/themes/new`) is still a stub.

**DRIFT NOTE:** Between Phase 2 and Phase 3, the database schema was updated OUT OF BAND. The `themes` table now has 27 columns. `packages/db/src/types.ts` and `packages/validators/src/theme.ts` are already updated. The Figma design has been updated to V2 with ALL 27 fields.

```
CURRENT:  Studio shell ✅, themes list ✅, editor = STUB
          DB has 27 columns (21 original + 6 new)
          types.ts + validators already patched
          Figma V2 design exists: frame 3311:2 with 7 sections + expanded sidebar
MISSING:  Full editor form for all 27 fields
```

---

## Figma Design Source (MANDATORY)

**File:** CMS DS Portal (Obra) — key `PodaGqhhlgh6TLkcyAC5Oi`

| Frame | Node ID | What to extract |
|-------|---------|-----------------|
| **Content Studio — Theme Editor V2 (Full)** | **`3311:2`** | Full page: Header + 7 form sections (left) + expanded Side Panel with 10 items (right) + Footer |

⚠️ **NOT `3289:2`** — that's the old V1 with only 4 sections. Use **`3311:2`**.

**Layout (verified from Figma + screenshot):**
```
┌─ Header (h: 65) ─────────────────────────────────┐
│  ← Back to Themes    Flavor Theme (h1)    • • •   │
├─ Container (h: 2335) ────────────────────────────┤
│  ┌─ Form (left, 7 sections) ┐ ┌─ Side Panel ────┐│
│  │                           │ │                  ││
│  │  1. Basic Info            │ │  Thumbnail       ││
│  │     Name, Tagline, Desc   │ │  Upload image    ││
│  │                           │ │                  ││
│  │  2. Links                 │ │  Status          ││
│  │     Demo, TF URL, TF ID  │ │  • Published     ││
│  │                           │ │                  ││
│  │  3. Hero                  │ │  Category        ││
│  │     Headline, Screenshots │ │  [Creative ▾]    ││
│  │     (sortable gallery)    │ │                  ││
│  │                           │ │  Price           ││
│  │  4. Features              │ │  $ [___]         ││
│  │     [{icon,title,desc}]   │ │                  ││
│  │     + Add Feature         │ │  Rating          ││
│  │                           │ │  ★★★★☆ [4.58]   ││
│  │  5. Plugins & Compat      │ │                  ││
│  │     Included (table+sum)  │ │  Sales           ││
│  │     Compatible (chips)    │ │  [2366]          ││
│  │                           │ │                  ││
│  │  6. SEO                   │ │  Trust Badges    ││
│  │     Title (52/70)         │ │  [PE][Elm][GDPR] ││
│  │     Description (142/160) │ │  + add           ││
│  │                           │ │                  ││
│  │  7. Custom Sections       │ │  Resources       ││
│  │     (JSON textarea)       │ │  🔓 PUBLIC       ││
│  │                           │ │  docs changelog  ││
│  └───────────────────────────┘ │  faq demos       ││
│                                │  🔒 LICENSED     ││
│                                │  download c-t psd││
│                                │  support         ││
│                                │  ⭐ PREMIUM      ││
│                                │  p-support m-acc ││
│                                │                  ││
│                                │  ── META ──      ││
│                                │  Created  15 Jan ││
│                                │  Updated  2h ago ││
│                                │  By       Design ││
│                                └──────────────────┘│
├─ Footer (h: 65, sticky) ─────────────────────────┤
│  Discard Changes          [Save Draft] [Publish]   │
└───────────────────────────────────────────────────┘
```

**Rule:** Call `Figma:get_design_context` on node **`3311:2`** BEFORE writing styled components. Extract exact px values, token variables, spacing, typography, colors.

**Also read:** `workplan/THEME-EDITOR-V2-DESIGN-SPEC.md` — contains full JSON shape, JSON→Portal mapping table, and what breaks if fields are empty.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 2 output is intact
cat apps/studio/src/pages/theme-editor.tsx
echo "(expect: stub placeholder)"

# 2. Verify Theme type has all 27 fields
grep -c "hero\|compatible_plugins\|trust_badges\|rating\|sales\|resources" packages/db/src/types.ts

# 3. Verify Zod schema has new fields
grep -c "hero\|compatible_plugins\|trust_badges\|rating\|sales\|resources" packages/validators/src/theme.ts

# 4. Check react-hook-form installed
grep "react-hook-form" apps/studio/package.json

# 5. Check @hookform/resolvers installed
grep "@hookform/resolvers" apps/studio/package.json

# 6. Verify fetchThemeBySlug exists in queries
grep "fetchThemeBySlug" apps/studio/src/lib/queries.ts

# 7. Check lucide-react for icons
grep "lucide-react" apps/studio/package.json

# 8. Read the Figma V2 editor frame
echo "Use Figma MCP: get_design_context on 3311:2 (NOT 3289:2)"
```

---

## Tasks

### Task A: Form infrastructure setup

Install if missing:
```
react-hook-form @hookform/resolvers
```

Create `apps/studio/src/lib/form-defaults.ts`:
- Default values for new theme (all 27 fields with correct types)
- `themeToFormData(theme: Theme)` — maps DB row to form shape
- `formDataToUpsert(data: ThemeFormData, existingId?: string)` — maps form to Supabase upsert shape

### Task B: Two-column layout shell

Replace `theme-editor.tsx` stub with full layout matching Figma V2 (`3311:2`):

```tsx
// pages/theme-editor.tsx
// Route: /themes/:slug (edit) and /themes/new (create)

// 1. If slug param → fetchThemeBySlug(slug), populate form
// 2. If /themes/new → empty form with defaults
// 3. Two-column: form (left ~65%) + side panel (right ~35%)
// 4. Sticky footer with action buttons
// 5. Header: back link, theme name (or "New Theme"), ••• menu

export function ThemeEditor() {
  const { slug } = useParams()
  const isNew = !slug || slug === 'new'
  // ... form setup with useForm + zodResolver
}
```

### Task C: Form sections (left column — 7 sections from Figma V2)

Each section = collapsible card with header + chevron + fields.

**Section 1: Basic Info**
- `name` — text input (required)
- `tagline` — text input
- `description` — textarea with placeholder

**Section 2: Links**
- `demo_url` — URL input
- `themeforest_url` — URL input
- `themeforest_id` — text input

**Section 3: Hero**
- `hero.headline` — text input, placeholder: "Override default hero text"
- `hero.screenshots` — sortable thumbnail gallery (URL inputs for MVP)
  - Row of image thumbnails with "+" dashed add button
  - Helper text: "Drag to reorder. These appear in the hero carousel."

**Section 4: Features**
- `features` — repeater: `[{icon (input), title (input), description (input)}]`
  - Each row: 3 inline inputs + × delete button
  - useFieldArray for add/remove
  - Dashed "+ Add Feature" button at bottom

**Section 5: Plugins & Compatibility**
- **Included Plugins** — repeater table with column headers (NAME, SLUG, VALUE $, ICON URL)
  - Each row: 4 inputs + × delete
  - Auto-sum row: "Total value: $88" — right-aligned, bold
  - Dashed "+ Add Plugin" at bottom
- **Separator** (1px line)
- **Compatible With** — chip/tag multi-select
  - Active chips: dark bg, white text (Tag/active tokens)
  - Options: Elementor, WooCommerce, WPML, Yoast, etc.
  - "+ add" link

**Section 6: SEO**
- `seo_title` — input (max 70, live char counter in link color: "52 / 70")
- `seo_description` — textarea (max 160, live char counter: "142 / 160")

**Section 7: Custom Sections** *(if not already handled inline)*
- `custom_sections` — JSON textarea, monospace
  - Pretty-printed on load
  - Validation on blur
  - Helper: valid types (before-after, video-demo, testimonial, custom-cta)
  - MVP only — structured editors deferred

### Task D: Side panel (right column — 10 items from Figma V2)

1. **Thumbnail** — image preview + "Upload image" link (text)
2. **Status** — Published/Draft/Archived badge (green dot + label)
3. **Category** — select dropdown (Creative, Business, etc.)
4. **Price** — $ prefix + number input
5. **Rating** — 5 star icons (filled/empty) + number input below (0–5, step 0.01)
6. **Sales** — integer input
7. **Trust Badges** — chip multi-select (Power Elite, Elementor, GDPR) + "+ add"
8. **Resources** — 3 labeled groups:
   - 🔓 PUBLIC — tag chips (docs, changelog, faq, demos) + "+ add"
   - 🔒 LICENSED — tag chips (download, child-theme, psd, support) + "+ add"
   - ⭐ PREMIUM — tag chips (priority-support, megakit-access) + "+ add"
9. **Separator** (1px line)
10. **META** — Created (date), Updated (relative), By (name) — all read-only

### Task E: Sticky footer

- **Discard Changes** — text button, left side, resets form
- **Save Draft** — outline button
- **Publish** — primary dark button
- Buttons use `<Button>` from `@cmsmasters/ui`

### Task F: Slug auto-generation

- On name change (new themes only): auto-generate slug (kebab-case)
- After first save: slug read-only
- Show preview: "Portal URL: /themes/{slug}"

---

## Integration Notes

### Form ↔ Zod validation
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { themeSchema, type ThemeFormData } from '@cmsmasters/validators'

const form = useForm<ThemeFormData>({
  resolver: zodResolver(themeSchema),
  defaultValues: isNew ? getDefaults() : themeToFormData(existingTheme)
})
```

### Repeater fields
```typescript
import { useFieldArray } from 'react-hook-form'

const { fields, append, remove, move } = useFieldArray({
  control: form.control,
  name: 'features'
})
```

### Token usage
Follow existing Studio patterns:
- Colors: `hsl(var(--text-primary))`, `hsl(var(--bg-surface-alt))`
- Sizing: inline style `var(--spacing-xl)`, `var(--rounded-xl)`
- Font: `'Manrope', sans-serif`
- Button: `<Button>` from `@cmsmasters/ui`

### Components to create

```
apps/studio/src/
├── components/
│   ├── form-section.tsx       — collapsible card wrapper (title + chevron + children)
│   ├── repeater-field.tsx     — add/remove list with useFieldArray
│   ├── chip-select.tsx        — multi-select with Tag tokens
│   ├── char-counter.tsx       — "52/70" counter in link color
│   ├── resource-editor.tsx    — 3-tier tag groups (public/licensed/premium)
│   ├── slug-field.tsx         — auto-gen + read-only after save
│   ├── plugin-table.tsx       — table repeater with column headers + value sum
│   ├── star-rating.tsx        — 5 stars display + number input
│   └── screenshot-gallery.tsx — sortable thumbnails + add button
├── pages/
│   └── theme-editor.tsx       — REPLACE stub with full editor
└── lib/
    └── form-defaults.ts       — defaults + mapping functions
```

---

## What This Phase Does NOT Do

- **Save to Supabase** → Phase 4
- **Trigger revalidation** → Phase 4
- **Delete theme** → Phase 4
- **Audit logging** → Phase 4
- **Media upload to R2** → Studio V2 (URL text inputs only)
- **Structured custom section editors** → Studio V2 (JSON textarea only)
- **Icon picker for features** → Studio V2 (text input only)

Phase 3 builds the form shell. Phase 4 wires it to Supabase.

---

## Verification

```bash
# 1. File count
find apps/studio/src/components -name "*.tsx" | wc -l
# (expect: 9 new + 6 existing = 15)

# 2. tsc check
npx tsc --noEmit -p apps/studio/tsconfig.json

# 3. No deep imports
grep -r "packages/db/src\|packages/auth/src\|packages/validators/src" apps/studio/src/

# 4. Stub removed
grep -r "Coming in Phase 3" apps/studio/src/

# 5. Form uses Zod resolver
grep "zodResolver" apps/studio/src/pages/theme-editor.tsx

# 6. Dev server runs
npx nx dev @cmsmasters/studio
# Navigate to /themes/new — form should render all 7 sections + sidebar
```

### Manual (PENDING — requires browser)
- [ ] `/themes/new` renders header, 7 form sections, side panel with 10 items, footer
- [ ] All 27 fields visible and interactive
- [ ] Slug auto-generates from name
- [ ] Feature repeater: add/remove rows
- [ ] Plugin table: add/remove + "Total value: $XX" auto-sum
- [ ] Compatible plugins: chip select works
- [ ] Trust badges: chip select works
- [ ] Resources: 3-tier tag editor with 🔓🔒⭐ labels
- [ ] Rating: star display updates with number input
- [ ] SEO: char counters in link color
- [ ] Custom sections: JSON textarea with validation
- [ ] Hero: screenshot thumbnails + add button
- [ ] Validation: empty name → error, invalid URL → error
- [ ] `/themes/:slug` loads existing theme data into form

---

## Execution Log Instructions

Create `logs/wp-003/phase-3-result.md` with:
- Files created/modified
- Machete mines cut
- Figma frames read (node `3311:2`, what specs extracted)
- Verification results (tsc, grep)
- Surprises/drift
- Pending manual verifications
