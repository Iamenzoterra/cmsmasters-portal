# WP-008 Phase 2: Studio — Block Category in Block Editor

> Workplan: WP-008 Global Elements V2
> Phase: 2 of 5
> Priority: P0
> Estimated: 2 hours
> Type: Frontend
> Previous: Phase 1 ✅ (DB: category + is_default + layout_slots columns)
> Next: Phase 3 (Layout Slot Assignment — block picker per slot in layout editor)

---

## Context

Phase 1 added `category` and `is_default` columns to blocks. Now Studio needs UI to set them. The category determines where a block lives — general library (theme/content blocks) or global elements section (header/footer/sidebar blocks).

```
CURRENT:  All blocks in one flat list, no category, no default flag        ❌
TARGET:   Block editor has category dropdown + default checkbox            ✅
TARGET:   Blocks list filters by category                                  ✅
TARGET:   Global Elements sidebar section shows categorized blocks         ✅
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current block editor form fields
grep -A 12 "interface BlockFormData" apps/studio/src/pages/block-editor.tsx

# 2. Current getDefaults
grep -A 15 "function getDefaults" apps/studio/src/pages/block-editor.tsx

# 3. Current blockToFormData  
grep -A 15 "function blockToFormData" apps/studio/src/pages/block-editor.tsx

# 4. Current formDataToPayload
grep -A 25 "function formDataToPayload" apps/studio/src/pages/block-editor.tsx

# 5. Blocks list — how cards render
grep -n "paginatedBlocks\|block.name\|block.slug" apps/studio/src/pages/blocks-list.tsx | head -10

# 6. Sidebar navigation
grep -n "Blocks\|Global\|Elements" apps/studio/src/components/sidebar.tsx | head -10

# 7. Global elements settings page
head -30 apps/studio/src/pages/global-elements-settings.tsx
```

---

## Task 2.1: Add category + is_default to block editor form

### What to Build

**File:** `apps/studio/src/pages/block-editor.tsx`

**2.1a — Update BlockFormData:**
```typescript
interface BlockFormData {
  name: string
  slug: string
  code: string
  js: string
  category: string           // NEW: '' | 'header' | 'footer' | 'sidebar'
  is_default: boolean        // NEW: default block for this category
  thumbnail_url: string
  hasPriceHook: boolean
  priceSelector: string
  links: Array<{ selector: string; field: string; label?: string }>
  alt: string
  figma_node: string
}
```

**2.1b — Update getDefaults():**
```typescript
category: '',
is_default: false,
```

**2.1c — Update blockToFormData():**
```typescript
category: block.category ?? '',
is_default: block.is_default ?? false,
```

**2.1d — Update formDataToPayload():**
Add to return object:
```typescript
category: data.category,
is_default: data.is_default,
```

Note: `category: data.category` always sent (like `js: data.js`) — empty string is valid for content blocks.

---

## Task 2.2: Add category + default UI in block editor

### What to Build

**File:** `apps/studio/src/pages/block-editor.tsx`

Add a "Block Type" section in **Basic Info** (after Slug, before Code):

```
Category:  [ (none) ▾ ]     ← dropdown: (none), Header, Footer, Sidebar
□ Set as default             ← checkbox, only visible when category selected
   ℹ Default blocks auto-fill their slot on all pages unless overridden by layout.
```

**Category dropdown:**
```typescript
const BLOCK_CATEGORIES = [
  { value: '', label: '(none) — Content block' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
] as const
```

**UI rules:**
- Category `(none)` = regular content/theme block — shows in Blocks library
- Category `header`/`footer`/`sidebar` = global element block — shows in Global Elements section
- "Set as default" checkbox visible only when category is NOT empty
- When checked, show info text: "This block will auto-fill all {category} slots unless overridden by a layout."

**Where in the form:** After Slug field, before Code section. Inside Basic Info `FormSection`.

---

## Task 2.3: API — un-set previous default on save

### What to Build

When saving a block with `is_default: true`, the API must un-set `is_default` on any other block with the same category. The DB has a unique partial index that prevents two defaults, but we need to handle it gracefully.

**File:** `apps/api/src/routes/blocks.ts`

In the create and update handlers, before calling `createBlock`/`updateBlock`:

```typescript
// If setting is_default, un-set previous default for same category
if (parsed.data.is_default && parsed.data.category) {
  await supabase
    .from('blocks')
    .update({ is_default: false })
    .eq('category', parsed.data.category)
    .eq('is_default', true)
}
```

For update, also skip un-setting self:
```typescript
if (parsed.data.is_default && parsed.data.category) {
  await supabase
    .from('blocks')
    .update({ is_default: false })
    .eq('category', parsed.data.category)
    .eq('is_default', true)
    .neq('id', c.req.param('id'))
}
```

---

## Task 2.4: Blocks list — show category badge + filter

### What to Build

**File:** `apps/studio/src/pages/blocks-list.tsx`

**2.4a — Category badge on each card:**

Show a small badge on block cards when category is set:

```tsx
{block.category && (
  <span style={{
    fontSize: '10px',
    padding: '1px 6px',
    borderRadius: 'var(--rounded-sm)',
    backgroundColor: 'hsl(var(--tag-active-bg))',
    color: 'hsl(var(--tag-active-fg))',
  }}>
    {block.category}
  </span>
)}
```

**2.4b — Category filter:**

Add a filter dropdown/tabs above the search field:

```
[All] [Content] [Header] [Footer] [Sidebar]
```

Filter logic: if "All" selected → show all. If "Content" → show where `category === ''`. If "Header" → show where `category === 'header'`, etc.

**2.4c — Default badge:**

Show "default" tag next to category badge when `block.is_default`:

```tsx
{block.is_default && (
  <span style={{ fontSize: '10px', color: 'hsl(var(--status-success-fg))' }}>
    default
  </span>
)}
```

---

## Task 2.5: Global Elements sidebar section

### What to Build

The sidebar already has "Global Elements" link. Update it to show categorized blocks meaningfully.

**Option A (simple):** Global Elements page becomes a filtered view of blocks — grouped by category (header, footer, sidebar). Each group shows its blocks with "default" badge. Click → opens block editor.

**Option B (keep current):** Leave global-elements-settings.tsx as is — it still works for legacy scope/priority entries. Add a note at top: "Tip: Set block categories and defaults in the block editor."

**Go with Option A** — replace `global-elements-settings.tsx` content with grouped block view:

```
Global Elements

HEADER
┌──────────────────────────────────┐
│ [Main Header]  ⭐ default        │ → click opens /blocks/{id}
│ [Theme Header]                   │
│ [+ Create Header Block]          │
└──────────────────────────────────┘

FOOTER
┌──────────────────────────────────┐
│ [Main Footer]  ⭐ default        │
│ [+ Create Footer Block]          │
└──────────────────────────────────┘

SIDEBAR
┌──────────────────────────────────┐
│ [Theme Sidebar Right]            │
│ [+ Create Sidebar Block]         │
└──────────────────────────────────┘
```

Each "Create" button → navigates to `/blocks/new?category=header` (pre-fills category).

---

## Files to Modify

- `apps/studio/src/pages/block-editor.tsx` — category + is_default in form, UI dropdown + checkbox
- `apps/api/src/routes/blocks.ts` — un-set previous default on save
- `apps/studio/src/pages/blocks-list.tsx` — category badge + filter + default badge
- `apps/studio/src/pages/global-elements-settings.tsx` — replace with grouped category view

---

## Acceptance Criteria

- [ ] Block editor has Category dropdown: (none), Header, Footer, Sidebar
- [ ] "Set as default" checkbox visible only when category selected
- [ ] Saving with is_default un-sets previous default for same category
- [ ] Block cards show category badge
- [ ] Block cards show "default" badge when is_default
- [ ] Blocks list has category filter tabs
- [ ] Global Elements page shows blocks grouped by category
- [ ] "Create" buttons in GE page pre-fill category
- [ ] Creating a header block with default → it appears in GE page as default
- [ ] `tsc --noEmit` clean for api + studio
- [ ] API redeployed

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-008 Phase 2 Verification ==="

# 1. TypeScript
npx tsc --noEmit -p apps/api/tsconfig.json && echo "✅ API" || echo "❌ API"
npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio" || echo "❌ Studio"

# 2. Block editor has category
grep -c "BLOCK_CATEGORIES\|category\|is_default" apps/studio/src/pages/block-editor.tsx
echo "(expect: 10+)"

# 3. API un-sets previous default
grep -c "is_default.*false\|un-set\|unset" apps/api/src/routes/blocks.ts
echo "(expect: 1+)"

# 4. Blocks list has filter
grep -c "category.*filter\|BLOCK_CATEGORIES\|filterCategory" apps/studio/src/pages/blocks-list.tsx
echo "(expect: 1+)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-008/phase-2-result.md`

---

## Git

```bash
git add apps/studio/src/pages/block-editor.tsx apps/api/src/routes/blocks.ts apps/studio/src/pages/blocks-list.tsx apps/studio/src/pages/global-elements-settings.tsx logs/wp-008/phase-2-result.md
git commit -m "feat: block category dropdown + default checkbox + category filter + GE grouped view [WP-008 phase 2]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **`category: data.category` always sent** — empty string means content block. Don't use `|| undefined` (M1 mine from WP-006).
- **Un-set previous default BEFORE inserting new** — otherwise unique index throws on concurrent defaults.
- **Block editor URL param `?category=header`** — GE page "Create" buttons should pre-fill category in block editor via search params.
- **Don't break existing blocks** — all existing blocks have `category: ''` and `is_default: false` — they should appear in "Content" filter and not show badges.
- **Block picker modal (used in templates/pages)** — should only show content blocks (category === ''). Global element blocks shouldn't appear there. Add filter: `.filter(b => !b.category)`.
- **Sidebar blocks are not split** — `sidebar-left` and `sidebar-right` both use category `sidebar`. The layout decides which slot a sidebar block fills.
