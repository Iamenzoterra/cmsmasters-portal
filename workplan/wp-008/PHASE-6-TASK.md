# WP-008 Phase 6: Element Block Category

> Workplan: WP-008 Global Elements V2
> Phase: 6 (addendum)
> Priority: P1
> Estimated: 30 minutes
> Type: Frontend
> Previous: Phase 5 ✅ (Cleanup + Docs)

---

## Context

Blocks have categories: header, footer, sidebar, and empty (theme content). Need a new category `element` for composed page sections — homepage hero, pricing tables, about sections, etc. Elements are picked in layout slots with `data-slot="element"` and in composed page block pickers.

Already exists: `Pages → Elements` route in sidebar (`apps/studio/src/pages/elements-list.tsx`).

```
CURRENT:  Categories: (none), header, footer, sidebar                     ✅
MISSING:  Category: element — for composed page sections                  ❌
MISSING:  Elements list page shows element-category blocks                ❌
MISSING:  SLOT_TO_CATEGORY mapping for element slots                      ❌
```

---

## PHASE 0: Audit

```bash
# 1. Current BLOCK_CATEGORIES
grep "BLOCK_CATEGORIES" apps/studio/src/pages/block-editor.tsx

# 2. Current elements list page
cat apps/studio/src/pages/elements-list.tsx

# 3. Current SLOT_TO_CATEGORY in page editor
grep "SLOT_TO_CATEGORY" apps/studio/src/pages/page-editor.tsx

# 4. Current SLOT_TO_CATEGORY in portal
grep "SLOT_TO_CATEGORY" apps/portal/src/lib/global-elements.ts

# 5. Block picker filter
grep "!b.category" apps/studio/src/components/block-picker-modal.tsx

# 6. Elements route in app.tsx
grep "elements" apps/studio/src/app.tsx
```

---

## Task 6.1: Add `element` to BLOCK_CATEGORIES

**File:** `apps/studio/src/pages/block-editor.tsx`

```typescript
const BLOCK_CATEGORIES = [
  { value: '', label: '(none) — Content block' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'element', label: 'Element' },    // NEW
] as const
```

---

## Task 6.2: Add `element` to SLOT_TO_CATEGORY mappings

**File:** `apps/studio/src/pages/page-editor.tsx`

```typescript
const SLOT_TO_CATEGORY: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  'sidebar-left': 'sidebar',
  'sidebar-right': 'sidebar',
  element: 'element',    // NEW
}
```

**File:** `apps/portal/src/lib/global-elements.ts` — same addition.

---

## Task 6.3: Add `element` to blocks list filter

**File:** `apps/studio/src/pages/blocks-list.tsx`

Add `'element'` to the category filter tabs array:

```typescript
['', 'content', 'header', 'footer', 'sidebar', 'element']
```

---

## Task 6.4: Add `element` to Global Elements grouped view

**File:** `apps/studio/src/pages/global-elements-settings.tsx`

Add to CATEGORIES:

```typescript
{ value: 'element', label: 'Element', description: 'Composed page sections — hero, pricing, features' },
```

---

## Task 6.5: Update elements-list.tsx — show element blocks

**File:** `apps/studio/src/pages/elements-list.tsx`

Currently likely a stub or placeholder. Replace with a filtered blocks list showing only `category === 'element'` blocks. Similar to Global Elements page but for elements.

Can reuse `fetchAllBlocks()` + filter by category, or link directly to blocks list with filter pre-set.

**Simplest approach:** Navigate to `/blocks?category=element` or show inline list like GE page.

---

## Task 6.6: Block picker — allow elements in composed page picker

**File:** `apps/studio/src/components/block-picker-modal.tsx`

Currently filters `!b.category` (content blocks only). Composed page editors should also show element blocks:

```typescript
// OLD:
.filter((b) => !b.category)

// NEW — accept optional categories prop:
.filter((b) => !b.category || b.category === 'element')
```

Or better: make it configurable via prop so theme template picker stays content-only.

---

## Files to Modify

- `apps/studio/src/pages/block-editor.tsx` — add 'element' to BLOCK_CATEGORIES
- `apps/studio/src/pages/page-editor.tsx` — add 'element' to SLOT_TO_CATEGORY
- `apps/portal/src/lib/global-elements.ts` — add 'element' to SLOT_TO_CATEGORY
- `apps/studio/src/pages/blocks-list.tsx` — add 'element' to filter tabs
- `apps/studio/src/pages/global-elements-settings.tsx` — add element to CATEGORIES
- `apps/studio/src/pages/elements-list.tsx` — show element-category blocks
- `apps/studio/src/components/block-picker-modal.tsx` — allow elements in composed picker

---

## Acceptance Criteria

- [ ] `element` in block editor category dropdown
- [ ] Element blocks appear in blocks list under Element filter
- [ ] Element blocks appear in Global Elements page under Element group
- [ ] Elements list page (Pages → Elements) shows element blocks
- [ ] Layout slot `data-slot="element"` resolved to element-category blocks
- [ ] Composed page block picker shows element blocks
- [ ] Theme template picker does NOT show element blocks
- [ ] `tsc --noEmit` clean

---

## ⚠️ MANDATORY: Verification

```bash
echo "=== WP-008 Phase 6 Verification ==="

npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio" || echo "❌"

grep "element" apps/studio/src/pages/block-editor.tsx | head -2
grep "element" apps/studio/src/pages/page-editor.tsx | head -2
grep "element" apps/portal/src/lib/global-elements.ts | head -2

echo "=== Done ==="
```

---

## Git

```bash
git add apps/studio/src/ apps/portal/src/lib/global-elements.ts logs/wp-008/phase-6-result.md
git commit -m "feat: element block category for composed page sections [WP-008 phase 6]"
```
