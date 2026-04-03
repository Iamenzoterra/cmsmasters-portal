# WP-008: Global Elements V2 — Block Categories, Defaults, Layout Override

> Rethink global elements: blocks have categories (header/footer/sidebar), `is_default` flag for auto-assignment, and layout-level override. No more manual scope+priority per element.

**Status:** PLANNING
**Priority:** P0 — current global elements UX is unusable for real content
**Prerequisites:** WP-007 ✅ (Portal renders layouts + blocks)
**Created:** 2026-04-03
**Completed:** —

---

## Problem

Current global elements system requires CM to manually create scope+priority entries for every slot×page combination. A site with 5 page types × 4 slots = 20 manual entries. This doesn't scale.

Real workflow should be:
1. Create header block via `/block-craft` → import to Studio
2. Mark it as `is_default: true` in category `header`
3. It appears everywhere automatically
4. On "themes" layout → pick different header → overrides default for all theme pages
5. Done. No scope/priority management.

---

## Architecture

### Block categories

Add `category` field to `blocks` table:

```
category: 'header' | 'footer' | 'sidebar' | '' (empty = content/theme block)
```

When creating a block, CM selects category. This determines:
- Where the block appears in Studio (Global Elements section vs Blocks library)
- Which slot it can fill

### Default flag

Add `is_default` boolean to `blocks` table:

```
is_default: boolean (default false)
```

Only one block per category can be default. When set:
- This block fills its slot on ALL pages unless overridden
- Setting a new default un-sets the previous one

### Layout-level override

Layout pages already have `scope` (e.g., 'theme'). Add slot assignments directly on layout:

```sql
-- New: layout_slots on pages table (jsonb)
-- Only for layout pages. Maps slot → block_id override.
layout_slots: { "header": "block-uuid", "sidebar-right": "block-uuid" }
```

When a layout has a slot assignment, it overrides the default for all pages using that layout.

### Resolution cascade (at build time)

```
For each slot (header, footer, sidebar-left, sidebar-right):
  1. Check layout.layout_slots[slot] → if set, use this block (layout override)
  2. Check blocks WHERE category = slot AND is_default = true → use default
  3. Null → no block for this slot
```

No more `global_elements` table — replaced by:
- `blocks.category` + `blocks.is_default` for defaults
- `pages.layout_slots` for layout overrides

---

## Phases

### Phase 1: DB Migration + Block Category

- Add `category` column to `blocks` table (`text NOT NULL DEFAULT ''`)
- Add `is_default` column to `blocks` table (`boolean NOT NULL DEFAULT false`)
- Add `layout_slots` column to `pages` table (`jsonb NOT NULL DEFAULT '{}'`)
- Update `packages/db/src/types.ts`
- Update `packages/validators/src/block.ts` — add category, is_default
- Update `packages/validators/src/page.ts` — add layout_slots

### Phase 2: Studio — Block Category in Block Editor

- Add "Category" dropdown in block editor: (none), header, footer, sidebar
- Add "Set as default" checkbox (visible only when category selected)
- When saving with `is_default: true` → API un-sets previous default for same category
- Blocks list: filter by category (tab or dropdown)
- Global Elements section in sidebar → shows blocks grouped by category

### Phase 3: Studio — Layout Slot Assignment

- Layout page editor: slot panel gets block picker per slot
- Only shows blocks matching the slot's category (header slot → header blocks only)
- Selected block saved to `pages.layout_slots`
- "Use default" option to clear override

### Phase 4: Portal — New Resolution Logic

- Update `apps/portal/src/lib/global-elements.ts`:
  - Remove scope matching logic
  - New: `getDefaultBlock(category)` → block WHERE category AND is_default
  - New: `getLayoutSlotOverride(layoutSlots, slot)` → specific block_id
  - Cascade: layout override > default > null
- Update theme page route + composed page route

### Phase 5: Cleanup + Migration

- Deprecate/remove `global_elements` table (or keep for backwards compat)
- Update Global Elements Settings page → becomes "Default Blocks" view
- Update docs

---

## DB Changes Summary

```sql
-- blocks table
ALTER TABLE blocks ADD COLUMN category text NOT NULL DEFAULT '';
ALTER TABLE blocks ADD COLUMN is_default boolean NOT NULL DEFAULT false;
-- Unique constraint: only one default per category
CREATE UNIQUE INDEX blocks_default_per_category ON blocks (category) WHERE is_default = true AND category != '';

-- pages table  
ALTER TABLE pages ADD COLUMN layout_slots jsonb NOT NULL DEFAULT '{}';
```

---

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Category on blocks, not separate table | Simpler, blocks are blocks | No join needed, same CRUD |
| `is_default` with unique partial index | DB enforces one default per category | No race conditions |
| `layout_slots` jsonb on pages | Layout-specific override | No extra table, layout already has scope |
| Remove global_elements table | Replaced by category + default + layout_slots | Simpler mental model, fewer tables |
| Resolution cascade | layout > default > null | Predictable, no priority numbers |
