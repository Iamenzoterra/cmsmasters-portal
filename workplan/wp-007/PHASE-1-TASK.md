# WP-007 Phase 1: Layout Page Editor — Scope selector + HTML import

> Workplan: WP-007 Portal Layout System
> Phase: 1
> Priority: P0
> Estimated: 2 hours
> Type: Frontend + Validators
> Previous: WP-006 ✅ (Block import pipeline complete)
> Next: Phase 2 (Astro portal rendering with layout + blocks)

---

## Context

The page editor currently supports two page types: `layout` and `composed`. But the layout type is half-baked:
- Type selector shown (should be hardcoded — layout pages are always `layout`)
- SEO section shown (wrong — layout is a wrapper, SEO lives on the theme/composed page)
- No HTML import (layout is an HTML+CSS template with `{{slot:*}}` placeholders)
- No scope selector (which entity type uses this layout: theme, blog, help-article, etc.)

A layout page is a **structural wrapper** — it defines where header, sidebars, content blocks, and footer go. It's NOT a content page. The flow:

```
1. Create layout page in Studio → name: "Theme Page Layout", scope: "theme"
2. Import HTML with {{slot:header}}, {{slot:content}}, {{slot:sidebar-left}}, etc.
3. Astro at build time: fetches layout for scope "theme", resolves slots with global elements + theme blocks
```

```
CURRENT:  Layout page = title + slug + type selector + SEO + info banner     ❌
TARGET:   Layout page = title + slug + scope selector + HTML import + preview  ✅
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current page editor UI structure
grep -n "FormSection\|isComposed\|watchedType\|type.*layout" apps/studio/src/pages/page-editor.tsx | head -20

# 2. Page validator — what fields exist
cat packages/validators/src/page.ts

# 3. Page DB type — current columns
grep -A 15 "pages:" packages/db/src/types.ts | head -20

# 4. Pages API route
head -50 apps/api/src/routes/pages.ts

# 5. Router — how layout/composed pages are accessed
grep "pages" apps/studio/src/app.tsx | head -10

# 6. How pages list shows type
grep -n "type\|layout\|composed" apps/studio/src/pages/pages-list.tsx | head -15
```

**Document findings before writing code.**

---

## Task 1.1: Add `scope` column to pages

### What to Build

Layout pages need a `scope` field — which content type this layout wraps.

**DB migration** (`supabase/migrations/004_pages_scope.sql`):
```sql
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.pages.scope IS 'Layout scope: theme, theme-category, blog, help-article. Empty for composed pages.';
```

**`packages/db/src/types.ts`** — add to pages Row/Insert/Update:
```typescript
// Row:
scope: string
// Insert:
scope?: string
// Update:
scope?: string
```

**`packages/validators/src/page.ts`** — add `scope` to `pageSchema` and `updatePageSchema`:
```typescript
// pageSchema:
scope: z.string().default(''),

// updatePageSchema:
scope: z.string().optional(),
```

---

## Task 1.2: Add `html` and `css` columns to pages

### What to Build

Layout pages need HTML+CSS storage (like blocks). The layout HTML contains `{{slot:*}}` placeholders.

**DB migration** (same file `004_pages_scope.sql`):
```sql
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS html text NOT NULL DEFAULT '';
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS css text NOT NULL DEFAULT '';
```

**`packages/db/src/types.ts`** — add to pages Row/Insert/Update:
```typescript
// Row:
html: string
css: string
// Insert:
html?: string
css?: string
// Update:
html?: string
css?: string
```

**`packages/validators/src/page.ts`** — add to schemas:
```typescript
// pageSchema:
html: z.string().default(''),
css: z.string().default(''),

// updatePageSchema:
html: z.string().optional(),
css: z.string().optional(),
```

---

## Task 1.3: Rewrite layout page editor UI

### What to Build

**File:** `apps/studio/src/pages/page-editor.tsx`

When creating/editing a layout page, the editor should show:

```
┌─ Layout Editor ─────────────────────────────────────────┐
│                                                          │
│  Basic Info                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Title: [Theme Page Layout          ]               │  │
│  │ Slug:  [theme-page                 ] (auto/readonly)│  │
│  │ Scope: [theme ▾]                                   │  │
│  │ Status: [draft ▾]                                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Layout HTML                                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [Import HTML]  [Preview]  [Export]                  │  │
│  │                                                    │  │
│  │ <textarea rows=20>                                 │  │
│  │   <style>...</style>                               │  │
│  │   <div class="layout-theme-page">                  │  │
│  │     {{slot:header}}                                │  │
│  │     <div class="content-area">                     │  │
│  │       {{slot:sidebar-left}}                        │  │
│  │       {{slot:content}}                             │  │
│  │       {{slot:sidebar-right}}                       │  │
│  │     </div>                                         │  │
│  │     {{slot:footer}}                                │  │
│  │   </div>                                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Changes from current page editor:**

1. **Remove Type selector** — if URL is `/pages/new?type=layout`, type is always `layout`. Pages list will have separate "New Layout" button. If editing existing, type is read from DB.

2. **Remove SEO section** — layouts don't have SEO.

3. **Add Scope selector** — dropdown with options:
   - `theme` — Theme page layout (current)
   - Future: `theme-category`, `blog`, `help-article` (disabled or hidden for now)

4. **Add HTML code field** — same pattern as block editor:
   - `code` textarea for combined HTML+CSS
   - Import HTML button (file picker)
   - Preview button (opens new window, same as block editor)
   - Export button

5. **Remove Blocks section** — layout pages don't have block list (that's for composed)

6. **Save** — splits code into `html` + `css`, saves to DB along with scope

### Scope selector values:

```typescript
const LAYOUT_SCOPES = [
  { value: 'theme', label: 'Theme Page' },
  // Future:
  // { value: 'theme-category', label: 'Theme Category' },
  // { value: 'blog', label: 'Blog Post' },
  // { value: 'help-article', label: 'Help Article' },
] as const
```

### Form shape for layout pages:

```typescript
// When type === 'layout':
interface LayoutFormData {
  title: string
  slug: string
  scope: string         // NEW
  code: string          // HTML+CSS combined (like block editor)
  status: string
}
```

### Import/Preview/Export — reuse block editor patterns:

- **Import HTML:** `parseHtmlFile()` → fills code field
- **Preview:** `window.open()` with full HTML (same as block editor preview)
- **Export:** download as .html file

### Split code on save:

```typescript
function splitCode(code: string): { html: string; css: string } {
  // same as block editor — extract <style> tags
}

// In handleSave:
const { html, css } = splitCode(data.code)
await createPageApi({ ...data, html, css, type: 'layout' })
```

---

## Task 1.4: Slot detection + block assignment UI

### What to Build

After importing layout HTML, the system parses `{{slot:*}}` placeholders and creates a **slot assignment panel** — each detected slot gets a block picker.

**Slot types determine which blocks are shown:**

| Slot name | Type | Block source |
|-----------|------|--------------|
| `{{slot:header}}` | Global element | Global Elements settings (not block library) |
| `{{slot:footer}}` | Global element | Global Elements settings |
| `{{slot:sidebar-left}}` | Global element | Global Elements settings |
| `{{slot:sidebar-right}}` | Global element | Global Elements settings |
| `{{slot:content}}` | Content area | Template blocks (filled at theme level, not here) |

**UI after import:**

```
┌─ Slot Assignments ──────────────────────────────────────┐
│                                                          │
│  Detected 5 slots in layout HTML:                        │
│                                                          │
│  header          → [Global Element ▾] Assigned in        │
│                    Global Elements Settings               │
│  sidebar-left    → [Global Element ▾] Assigned in        │
│                    Global Elements Settings               │
│  content         → Filled by template blocks per theme   │
│  sidebar-right   → [Global Element ▾] Assigned in        │
│                    Global Elements Settings               │
│  footer          → [Global Element ▾] Assigned in        │
│                    Global Elements Settings               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Key behavior:**
- Global element slots (header, footer, sidebar-*) show a note: "Assigned in Global Elements Settings" with a link to `/global-elements`. These are NOT assigned per-layout — they're resolved by scope at build time.
- `content` slot shows: "Filled by template blocks per theme" — read-only info.
- Custom slots (anything not in the global list) → show block picker from block library.

**Slot extraction function:**

```typescript
function extractSlots(html: string): string[] {
  const re = /\{\{slot:([a-z0-9-]+)\}\}/g
  const slots: string[] = []
  let match
  while ((match = re.exec(html)) !== null) {
    if (!slots.includes(match[1])) slots.push(match[1])
  }
  return slots
}

const GLOBAL_SLOTS = ['header', 'footer', 'sidebar-left', 'sidebar-right']

function isGlobalSlot(name: string): boolean {
  return GLOBAL_SLOTS.includes(name)
}
```

**The slot panel is informational for now** — it shows what the layout expects and where each slot gets its content from. Actual block assignment happens in:
- Global Elements Settings (for header/footer/sidebar)
- Theme Editor (for content blocks via template)

---

## Task 1.5: Update pages list — separate layout/composed creation

### What to Build

**File:** `apps/studio/src/pages/pages-list.tsx`

Currently one "Create Page" button. Split into two:
- **"New Composed Page"** → navigates to `/pages/new?type=composed`
- **"New Layout"** → navigates to `/pages/new?type=layout`

Page editor reads `type` from URL search params for new pages:
```typescript
const searchParams = new URLSearchParams(window.location.search)
const defaultType = searchParams.get('type') === 'layout' ? 'layout' : 'composed'
```

---

## Files to Modify

- `supabase/migrations/004_pages_scope.sql` — **NEW** — scope + html + css columns
- `packages/db/src/types.ts` — add scope, html, css to pages Row/Insert/Update
- `packages/validators/src/page.ts` — add scope, html, css to schemas
- `apps/studio/src/pages/page-editor.tsx` — layout mode: scope selector, code field, import/preview/export, remove type/SEO
- `apps/studio/src/pages/pages-list.tsx` — two create buttons

---

## Acceptance Criteria

- [ ] `pages.scope`, `pages.html`, `pages.css` columns exist in Supabase
- [ ] Layout page editor shows: title, slug, scope, code textarea, status
- [ ] No Type selector shown (type is determined by creation flow)
- [ ] No SEO section for layout pages
- [ ] Import HTML works (file picker → fills code field)
- [ ] After import: slot panel shows detected `{{slot:*}}` placeholders
- [ ] Global slots (header, footer, sidebar-*) show "Assigned in Global Elements Settings"
- [ ] Content slot shows "Filled by template blocks per theme"
- [ ] Preview opens new window with full layout HTML
- [ ] Save persists scope + html + css to DB
- [ ] Pages list has "New Layout" and "New Composed Page" buttons
- [ ] Composed page editor unchanged (still has blocks + SEO)
- [ ] `tsc --noEmit` clean

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-007 Phase 1 Verification ==="

# 1. TypeScript
npx tsc --noEmit -p apps/api/tsconfig.json && echo "✅ API" || echo "❌ API"
npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio" || echo "❌ Studio"

# 2. DB columns
grep "scope\|html\|css" packages/db/src/types.ts | grep -A 0 "pages" || true

# 3. Validator has scope
grep "scope" packages/validators/src/page.ts

# 4. Page editor has scope
grep -c "scope\|LAYOUT_SCOPES" apps/studio/src/pages/page-editor.tsx

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-007/phase-1-result.md`

---

## Git

```bash
git add supabase/migrations/004_pages_scope.sql packages/db/src/types.ts packages/validators/src/page.ts apps/studio/src/pages/page-editor.tsx apps/studio/src/pages/pages-list.tsx logs/wp-007/phase-1-result.md
git commit -m "feat: layout page editor — scope selector, HTML import, remove type/SEO [WP-007 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Layout and composed share the same `pages` table** — differentiated by `type` column. Don't create a separate table.
- **Layout HTML uses `{{slot:*}}` placeholders** — same syntax as block hooks but for layout slots. These are resolved at build time by Astro.
- **Scope is a simple string field** — not an enum in DB (future scopes shouldn't require migration). Validate in frontend only.
- **Don't touch composed page flow** — it must keep working exactly as before (blocks + SEO).
- **Import/Preview/Export** — copy patterns from block editor, not reinvent. Same `parseHtmlFile`, same `window.open()` preview, same export blob.
- **Migration must use `IF NOT EXISTS`** — safe to re-run.
