# WP-003 Phase 2: Themes List Page

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 2 of 7
> Priority: P0
> Estimated: 2–3 hours
> Type: Frontend
> Previous: Phase 1 ✅ (Vite SPA scaffold + auth + app shell — 22 files, tsc clean, dev server on :5173, Figma-matched sidebar 220px + topbar 56px)
> Next: Phase 3 (Theme Editor — Form Structure)

---

## Context

Phase 1 delivered the Studio shell: Vite SPA, routing, auth (magic link), app layout with Figma-matched sidebar + topbar. Placeholder pages in place.

Now we replace the themes-list placeholder with a working page that reads themes from Supabase and displays them in a grid/table with search and status filter. This is the first page that talks to the database.

Key findings from Phase 1:
- `packages/ui` has only Button + cn(). No Input, Select, Card, Badge primitives yet.
- Studio components live in `apps/studio/src/components/` (not packages/ui) — they're app-specific.
- Tailwind + tokens.css working. Font: Manrope.
- `@cmsmasters/db` queries available: `getThemes()`, `getThemeBySlug()`.
- `postcss.config.cjs` (not .js) due to `"type": "module"`.

```
CURRENT:  Studio shell ✅ (auth, layouts, sidebar, topbar, routing)
          Supabase schema deployed, seed theme "Flavor" exists
MISSING:  Themes list page — fetch from DB, grid, search, filter       ❌
```

---

## Figma Design Source (MANDATORY)

**File:** CMS DS Portal (Obra) — key `PodaGqhhlgh6TLkcyAC5Oi`

| Frame / Component page | What to extract | Used in |
|------------------------|-----------------|---------|
| **`Studio / Themes List — Grid`** (page `0001`) | Full page: toolbar (search + filter + view toggle + "Create Theme" button), grid layout (columns, gap, card sizing), pagination bar | Task 2.2 (page layout), Task 2.3 (toolbar) |
| **`00-cms--theme-card`** (component page) | Card: dimensions, padding, thumbnail aspect ratio, title font, category tag style, status badge position, price style, "Updated" text, hover state, border-radius, shadow | Task 2.4 (ThemeCard) |
| **`00-cms--status-badge`** (component page) | Badge: 3 variants (Draft=yellow, Published=green, Archived=grey), padding, font-size, border-radius, colors for bg/text per variant | Task 2.5 (StatusBadge) |

**Obra components** already instanced in the frames:
- Button ("+ Create Theme") — import from `@cmsmasters/ui`
- Input (search field) — read exact style from Figma, build inline
- Select ("All Statuses" filter) — read exact style from Figma, build inline

**Rule:** Call `Figma:get_design_context` on each frame/component BEFORE writing the corresponding code. Extract exact px values, token variables, spacing, typography. Do NOT guess.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 1 output is intact
ls apps/studio/src/pages/themes-list.tsx
cat apps/studio/src/pages/themes-list.tsx
echo "(expect: placeholder)"

# 2. Check what @cmsmasters/db exports for themes
grep -A10 "export.*getThemes\|export.*getThemeBySlug" packages/db/src/queries/themes.ts
grep "export" packages/db/src/index.ts | head -10

# 3. Check Theme type shape
grep -A20 "themes:" packages/db/src/types.ts | head -25

# 4. Check what Supabase has (seed data)
echo "Verify: Supabase has at least the Flavor test theme from seed.sql"

# 5. Check StatusBadge component page exists in Figma
echo "Will verify via Figma MCP"

# 6. Confirm supabase client is importable
grep "supabase" apps/studio/src/lib/supabase.ts

# 7. Check lucide-react available (for icons in toolbar)
ls node_modules/lucide-react/package.json 2>/dev/null && echo "lucide-react available" || echo "NOT available"
```

---

## Task 2.1: Data Layer — Fetch Themes

### What to Build

Create `apps/studio/src/lib/queries.ts` — Studio-specific data hooks wrapping `@cmsmasters/db`:

```typescript
import { supabase } from './supabase'
import type { Theme } from '@cmsmasters/db'

/**
 * Fetch all themes (any status — Studio sees drafts too).
 * Unlike the public getThemes() which filters by published,
 * Studio needs ALL themes for the content manager.
 */
export async function fetchAllThemes(): Promise<Theme[]> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Fetch single theme by slug (any status).
 */
export async function fetchThemeBySlug(slug: string): Promise<Theme | null> {
  const { data, error } = await supabase
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data
}
```

**Why not use `getThemes()` from @cmsmasters/db directly?** Because `getThemes()` filters `status = 'published'` — it's meant for the public Portal. Studio needs ALL themes including drafts and archived. This is a thin app-specific wrapper, not a new package.

**RLS check:** Content Manager and Admin have `themes_select_staff` policy that allows SELECT on all themes. Verify this works by checking the response.

---

## Task 2.2: Page Layout + State

### Figma reference

> **Before coding:** Call `Figma:get_design_context` on frame **`Studio / Themes List — Grid`** in file `PodaGqhhlgh6TLkcyAC5Oi` page `0001`.
> Extract: overall page structure (toolbar position, grid area), content padding (should match app-layout main padding), spacing between toolbar and grid, spacing between grid and pagination.

### What to Build

Replace `apps/studio/src/pages/themes-list.tsx` placeholder with full implementation.

Page structure:
```
┌─────────────────────────────────────────────────┐
│  Page Header: "Themes"              [+ Create]   │
├─────────────────────────────────────────────────┤
│  [🔍 Search themes...]  [All Statuses ▾]  [≡ ⊞] │  ← toolbar
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────┐ ┌──────┐ ┌──────┐                     │
│  │Card 1│ │Card 2│ │Card 3│                      │  ← grid
│  └──────┘ └──────┘ └──────┘                      │
│  ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │Card 4│ │Card 5│ │Card 6│                      │
│  └──────┘ └──────┘ └──────┘                      │
│                                                  │
├─────────────────────────────────────────────────┤
│  Showing 1-6 of 12            [◀ Prev] [Next ▶] │  ← pagination
└─────────────────────────────────────────────────┘
```

**State management:**
```typescript
const [themes, setThemes] = useState<Theme[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [search, setSearch] = useState('')
const [statusFilter, setStatusFilter] = useState<string>('all')
const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
const [page, setPage] = useState(1)
const ITEMS_PER_PAGE = 12
```

**Data flow:**
1. On mount → `fetchAllThemes()` → set themes
2. Filter client-side: search (by name, case-insensitive) + status filter
3. Paginate client-side: slice filtered array by page * ITEMS_PER_PAGE
4. Navigate: click card → `navigate('/themes/{slug}')`

---

## Task 2.3: Toolbar (Search + Filter + View Toggle + Create Button)

### Figma reference

> **Before coding:** Use the **`Studio / Themes List — Grid`** frame context already fetched.
> Focus on the toolbar row: extract exact height, background, spacing between elements, search input width/style, filter dropdown style, view toggle button styles (active vs inactive), "Create Theme" button variant.

### What to Build

Create `apps/studio/src/components/themes-toolbar.tsx`:

- **Search input** — left-aligned, icon (Search from lucide-react) inside, placeholder "Search themes...", debounced 300ms onChange. Style from Figma (height, border, radius, padding — read token vars).
- **Status filter** — select/dropdown: "All Statuses", "Draft", "Published", "Archived". Build as `<select>` styled to match Figma (or use the Obra Select component style from the frame).
- **View toggle** — two icon buttons: Grid (LayoutGrid icon) and List (List icon). Active state highlighted. Style from Figma.
- **"+ Create Theme" button** — right-aligned, primary Button from `@cmsmasters/ui`, Plus icon from lucide-react. `onClick → navigate('/themes/new')`.

**Debounce implementation:** simple `useEffect` + `setTimeout` for search, no external lib needed.

---

## Task 2.4: Theme Card (Grid View)

### Figma reference

> **Before coding:** Call `Figma:get_design_context` on component page **`00-cms--theme-card`** in file `PodaGqhhlgh6TLkcyAC5Oi`.
> Extract: card width behavior (fluid or fixed), height, padding, border (color, width, radius), shadow, thumbnail area (height/aspect-ratio, background for empty state, border-radius), title (font-size, weight, line-height, color), category tag (pill style: bg, text color, padding, radius, font-size), status badge position (absolute? top-right of thumbnail?), price (font-size, color, weight), "Updated X ago" (font-size, color), hover state (shadow change? border change? scale?).

### What to Build

Create `apps/studio/src/components/theme-card.tsx`:

```typescript
interface ThemeCardProps {
  theme: Theme
  onClick: () => void
}
```

- **Thumbnail area** — top of card. If `thumbnail_url` exists → `<img>`, else → placeholder with theme icon/initial. Aspect ratio and border-radius from Figma.
- **Status badge** — positioned per Figma (likely top-right of thumbnail, absolute). Uses StatusBadge component (Task 2.5).
- **Title** — theme name, styled from Figma.
- **Category** — pill tag if category exists. Style from Figma.
- **Price** — if exists, format as "$59.00". Style from Figma.
- **Updated** — relative time ("Updated 2h ago", "Updated 3d ago"). Use simple relative time formatter (no library — just a helper function).
- **Click** → entire card is clickable.
- **Hover** — subtle elevation/shadow change per Figma.

Also create helper `apps/studio/src/lib/format.ts`:
```typescript
export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

---

## Task 2.5: Status Badge

### Figma reference

> **Before coding:** Call `Figma:get_design_context` on component page **`00-cms--status-badge`** in file `PodaGqhhlgh6TLkcyAC5Oi`.
> Extract: 3 variants (Draft, Published, Archived) — for each: background color (token var), text color (token var), padding (px), border-radius, font-size, font-weight, optional border, optional dot indicator.

### What to Build

Create `apps/studio/src/components/status-badge.tsx`:

```typescript
interface StatusBadgeProps {
  status: 'draft' | 'published' | 'archived'
}
```

Three visual variants — colors from Figma (likely mapping to status tokens):
- **Draft** → yellow/warn: `--status-warn-bg` / `--status-warn-fg`
- **Published** → green/success: `--status-success-bg` / `--status-success-fg`
- **Archived** → grey/muted: token from Figma

Build with `cn()` from `@cmsmasters/ui` for conditional classes.

---

## Task 2.6: Table View (Alternative)

### Figma reference

> The Figma handoff lists only Grid view. Table view: build as functional alternative WITHOUT Figma reference — minimal table using token colors, no pixel-matching needed. This is a secondary view.

### What to Build

Create `apps/studio/src/components/themes-table.tsx`:

Simple HTML `<table>` styled with Tailwind + tokens:
- Columns: Thumbnail (48×36px), Name, Category, Status (badge), Price, Updated
- Row hover: `--bg-surface-alt`
- Row click → navigate to `/themes/{slug}`
- Header: `--text-muted` color, small font
- Border-bottom on rows: `--border-default`

No external table library needed — 65 themes max, client-side pagination.

---

## Task 2.7: Empty State

### What to Build

When `themes.length === 0` (no themes in DB or all filtered out):

Create inline in themes-list.tsx (or extract to component if complex):
- Centered in content area
- Icon or illustration (use FolderOpen or Palette icon from lucide-react, large, muted color)
- "No themes yet" heading
- "Create your first theme to get started" subtext
- "Create Theme" primary button → `/themes/new`

Style: `--text-muted` for subtext, center layout. Read general card/content styles from Figma for spacing consistency.

---

## Task 2.8: Pagination

### What to Build

Create `apps/studio/src/components/pagination.tsx`:

- "Showing {start}-{end} of {total} themes" text (left)
- "Previous" / "Next" buttons (right) — disabled when at start/end
- Style: small text `--text-muted`, outline buttons

Simple client-side pagination — all data already in memory.

---

## Task 2.9: Wire Everything Together

### What to Build

Final `apps/studio/src/pages/themes-list.tsx`:

```tsx
export function ThemesList() {
  // 1. State (search, filter, viewMode, page, themes, loading, error)
  // 2. useEffect → fetchAllThemes() on mount
  // 3. Computed: filteredThemes (search + status filter)
  // 4. Computed: paginatedThemes (slice by page)
  // 5. Render:
  //    - Page header ("Themes" + create button)
  //    - ThemesToolbar (search, filter, view toggle)
  //    - if loading → skeleton cards
  //    - if error → error message
  //    - if empty → EmptyState
  //    - if grid → ThemeCard grid
  //    - if table → ThemesTable
  //    - Pagination
}
```

**Grid layout:** Use CSS Grid — `grid-cols-3` (or responsive: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). Gap from Figma.

**Loading skeleton:** 6 placeholder cards with animated pulse (`animate-pulse` + `bg-surface-alt` rectangles matching card shape).

---

## Files to Modify

- `apps/studio/src/pages/themes-list.tsx` — REPLACE placeholder with full implementation
- `apps/studio/src/lib/queries.ts` — NEW: fetchAllThemes, fetchThemeBySlug
- `apps/studio/src/lib/format.ts` — NEW: timeAgo helper
- `apps/studio/src/components/themes-toolbar.tsx` — NEW
- `apps/studio/src/components/theme-card.tsx` — NEW
- `apps/studio/src/components/status-badge.tsx` — NEW
- `apps/studio/src/components/themes-table.tsx` — NEW
- `apps/studio/src/components/pagination.tsx` — NEW

---

## Acceptance Criteria

- [ ] Themes list fetches data from Supabase on mount
- [ ] Seed theme "Flavor" visible in the grid
- [ ] Grid view: cards match Figma `00-cms--theme-card` component
- [ ] Status badges match Figma `00-cms--status-badge` component (3 variants)
- [ ] Search filters themes by name (debounced)
- [ ] Status dropdown filters by draft/published/archived
- [ ] Grid ↔ Table toggle works
- [ ] "Create Theme" button navigates to `/themes/new`
- [ ] Card click navigates to `/themes/{slug}`
- [ ] Empty state shows when no themes match
- [ ] Loading skeleton during fetch
- [ ] Pagination: shows count, Previous/Next buttons
- [ ] `npx tsc --noEmit -p apps/studio/tsconfig.json` passes

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. New files exist
echo "--- New files ---"
ls apps/studio/src/components/theme-card.tsx
ls apps/studio/src/components/status-badge.tsx
ls apps/studio/src/components/themes-toolbar.tsx
ls apps/studio/src/components/themes-table.tsx
ls apps/studio/src/components/pagination.tsx
ls apps/studio/src/lib/queries.ts
ls apps/studio/src/lib/format.ts

# 2. TypeScript compiles
echo "--- TypeScript ---"
npx tsc --noEmit -p apps/studio/tsconfig.json 2>&1

# 3. No placeholder remains
echo "--- Placeholder removed ---"
grep -c "Coming in Phase 2" apps/studio/src/pages/themes-list.tsx && echo "❌ Placeholder still there" || echo "✅ Placeholder replaced"

# 4. Supabase import
echo "--- Data layer ---"
grep "fetchAllThemes\|from.*supabase" apps/studio/src/pages/themes-list.tsx
grep "fetchAllThemes\|from.*supabase" apps/studio/src/lib/queries.ts

# 5. Manual visual checks
echo "--- Manual checks ---"
echo "1. Open http://localhost:5173 (after login)"
echo "2. Themes page: Flavor theme visible as card"
echo "3. Card matches Figma: thumbnail area, title, category, status badge, price"
echo "4. Status badge: correct color for 'published' (green)"
echo "5. Search: type 'fla' → Flavor shown, type 'xyz' → empty state"
echo "6. Status filter: select 'Draft' → Flavor hidden (it's published)"
echo "7. Grid ↔ Table toggle"
echo "8. 'Create Theme' button → /themes/new"
echo "9. Click card → /themes/flavor"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create `logs/wp-003/phase-2-result.md` with standard structure:
- What Was Implemented
- Key Decisions (include Figma specs extracted)
- Files Changed
- Issues & Workarounds
- Verification Results
- Git commit hash

---

## Git

```bash
git add apps/studio/src/ logs/wp-003/phase-2-result.md
git commit -m "feat: Studio themes list — grid, search, filter, status badges [WP-003 phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Figma is mandatory for visual components.** Call `Figma:get_design_context` on:
  1. Frame `Studio / Themes List — Grid` (page `0001`) — toolbar layout, grid layout
  2. Component page `00-cms--theme-card` — card structure and styling
  3. Component page `00-cms--status-badge` — 3 badge variants
  File key: `PodaGqhhlgh6TLkcyAC5Oi`
- **Table view has NO Figma reference** — build minimal, functional. Grid is the primary view.
- **`fetchAllThemes()` does NOT filter by published.** Studio sees all statuses. The `@cmsmasters/db` `getThemes()` filters by published — don't use it here.
- **RLS:** content_manager and admin have `themes_select_staff` policy — they can read all themes. If fetch returns empty when themes exist → RLS issue → check user role in profiles.
- **Client-side filtering/pagination** is fine for MVP. 65 themes max. No need for server-side pagination.
- **No external libraries** for table, search, or pagination. Plain React + Tailwind.
- **Do NOT modify packages/ui.** Build components in `apps/studio/src/components/`. They're app-specific for now.
- **Do NOT touch sidebar, topbar, or layouts.** Phase 1 output is frozen.
