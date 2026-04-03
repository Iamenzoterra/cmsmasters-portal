# WP-008 Phase 3: Layout Slot Assignment — Block Picker Per Slot

> Workplan: WP-008 Global Elements V2
> Phase: 3 of 5
> Priority: P0
> Estimated: 1.5 hours
> Type: Frontend
> Previous: Phase 2 ✅ (Block category dropdown + default checkbox + GE grouped view)
> Next: Phase 4 (Portal — new resolution logic: layout override > default > null)

---

## Context

Phase 2 added categories and defaults to blocks. Now the layout page editor needs a slot picker — when CM imports layout HTML with `data-slot="header"` etc., each detected slot shows a block picker filtered by category. This creates the **layout-level override** for global elements.

```
CURRENT:  Layout editor shows slots as info text ("Configured in Global Elements Settings")     ❌
TARGET:   Each slot has a block picker (filtered by category) + "Use default" option            ✅
TARGET:   Selected blocks saved to pages.layout_slots jsonb                                      ✅
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current SlotPanel component
grep -n "function SlotPanel" apps/studio/src/pages/page-editor.tsx

# 2. Current slot display
grep -A 20 "function SlotPanel" apps/studio/src/pages/page-editor.tsx

# 3. Layout save flow — where layout_slots should be sent
grep -n "layoutScope\|layout_slots\|updatePayload" apps/studio/src/pages/page-editor.tsx | head -10

# 4. Current GLOBAL_SLOTS
grep "GLOBAL_SLOTS" apps/studio/src/pages/page-editor.tsx

# 5. fetchAllBlocks available?
grep "fetchAllBlocks" apps/studio/src/pages/page-editor.tsx
```

---

## Task 3.1: Add layout_slots state to page editor

### What to Build

**File:** `apps/studio/src/pages/page-editor.tsx`

Add state for layout slot assignments:

```typescript
const [layoutSlots, setLayoutSlots] = useState<Record<string, string>>({})
```

On fetch existing layout page, restore from DB:
```typescript
if (page.layout_slots) setLayoutSlots(page.layout_slots as Record<string, string>)
```

On save/publish, include in payload:
```typescript
if (isLayout) {
  updatePayload.layout_slots = layoutSlots
}
```

On discard, reset:
```typescript
setLayoutSlots(existingPage?.layout_slots as Record<string, string> ?? {})
```

---

## Task 3.2: Fetch categorized blocks for slot picker

### What to Build

**File:** `apps/studio/src/pages/page-editor.tsx`

Fetch all blocks on mount (for slot picker dropdowns):

```typescript
const [allBlocks, setAllBlocks] = useState<Block[]>([])

useEffect(() => {
  fetchAllBlocks().then(setAllBlocks).catch(() => {})
}, [])
```

Already imported: `fetchAllBlocks` from block-api (used for composed page block list).

Helper to get blocks by category:
```typescript
function getBlocksForCategory(category: string): Block[] {
  return allBlocks.filter(b => b.category === category)
}
```

Map slot name to block category:
```typescript
const SLOT_TO_CATEGORY: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  'sidebar-left': 'sidebar',
  'sidebar-right': 'sidebar',
}
```

---

## Task 3.3: Rewrite SlotPanel with block pickers

### What to Build

**File:** `apps/studio/src/pages/page-editor.tsx`

Replace the current `SlotPanel` (info-only) with interactive slot assignment:

```
Slot Assignments (5)

header        global   [ Main Header ▾ ] ⭐ default    [Use default]
sidebar-left  global   [ Theme Sidebar ▾ ]              [Use default]
content       content  Template blocks per theme
sidebar-right global   [ (none) ▾ ]                     [Use default]
footer        global   [ Main Footer ▾ ] ⭐ default     [Use default]
meta:title    meta     Resolved from theme.meta
```

**For global slots (header, footer, sidebar-left, sidebar-right):**
- `<select>` dropdown with blocks matching the slot's category
- First option: "(use default)" — clears the override
- If a block is selected → saved to `layoutSlots[slotName] = blockId`
- If "(use default)" selected → delete from `layoutSlots`
- Show "⭐ default" badge next to blocks that have `is_default: true`

**For content slot:** read-only text "Template blocks per theme"
**For meta:* slots:** read-only text "Resolved from theme.meta"
**For custom slots:** read-only text "Custom slot"

**SlotPanel props update:**
```typescript
function SlotPanel({
  code,
  layoutSlots,
  onSlotChange,
  blocks,
}: {
  code: string
  layoutSlots: Record<string, string>
  onSlotChange: (slot: string, blockId: string | null) => void
  blocks: Block[]
})
```

---

## Task 3.4: Wire layoutSlots into save/publish/discard

### What to Build

**File:** `apps/studio/src/pages/page-editor.tsx`

**Save draft (handleSaveDraft):**
Already has `updatePayload` for layout — add:
```typescript
updatePayload.layout_slots = layoutSlots
```
And for create:
```typescript
const createPayload = {
  ...data,
  ...(isLayout ? { scope: layoutScope, html: layoutHtml, css: layoutCss, layout_slots: layoutSlots } : {}),
}
```

**Publish (handlePublish):** same pattern.

**Discard (handleDiscard):** reset layoutSlots to saved value.

**Fetch existing:** restore layoutSlots from `page.layout_slots`.

---

## Files to Modify

- `apps/studio/src/pages/page-editor.tsx` — layoutSlots state, SlotPanel rewrite, save/publish/discard wiring

---

## Acceptance Criteria

- [ ] SlotPanel shows block picker dropdown for each global slot
- [ ] Dropdown filtered by category (header slot → header blocks only)
- [ ] "(use default)" option clears override
- [ ] Selected block saved to layoutSlots state
- [ ] layoutSlots persisted to DB on save/publish
- [ ] layoutSlots restored from DB on page load
- [ ] layoutSlots reset on discard
- [ ] Content/meta slots remain read-only info
- [ ] Default blocks show ⭐ badge in dropdown
- [ ] `tsc --noEmit` clean

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-008 Phase 3 Verification ==="

npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio" || echo "❌ Studio"

grep -c "layoutSlots\|onSlotChange\|SLOT_TO_CATEGORY" apps/studio/src/pages/page-editor.tsx
echo "(expect: 10+)"

grep -c "layout_slots" apps/studio/src/pages/page-editor.tsx
echo "(expect: 5+ — state, fetch, save, publish, discard)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-008/phase-3-result.md`

---

## Git

```bash
git add apps/studio/src/pages/page-editor.tsx logs/wp-008/phase-3-result.md
git commit -m "feat: layout slot assignment — block picker per slot with category filter [WP-008 phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **SlotPanel receives blocks as prop** — don't fetch inside SlotPanel, parent already has allBlocks state.
- **SLOT_TO_CATEGORY maps slot names to block categories** — sidebar-left and sidebar-right both map to 'sidebar' category.
- **layoutSlots is a flat object** — `{ "header": "uuid", "footer": "uuid" }`. Slots without override are simply absent.
- **"(use default)" = delete key** — `onSlotChange(slot, null)` removes the slot from layoutSlots.
- **Don't modify API or validators** — layout_slots already supported from Phase 1.
- **isDirty tracking** — layoutSlots changes should make the form dirty. Since it's separate state (not react-hook-form), pass `isDirty || Object.keys(layoutSlots).length > 0` to EditorFooter, or compare with saved value.
