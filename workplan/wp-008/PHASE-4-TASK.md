# WP-008 Phase 4: Portal — New Resolution Logic

> Workplan: WP-008 Global Elements V2
> Phase: 4 of 5
> Priority: P0
> Estimated: 1 hour
> Type: Frontend (Astro portal)
> Previous: Phase 3 ✅ (Layout slot assignment — block picker per slot)
> Next: Phase 5 (Cleanup + Docs)

---

## Context

Studio now saves `blocks.category`, `blocks.is_default`, and `pages.layout_slots`. Portal still uses old `global_elements` table with scope+priority matching. Replace with new cascade:

```
For each slot (header, footer, sidebar-left, sidebar-right):
  1. layout.layout_slots[slot] → if set, fetch this block (layout override)
  2. blocks WHERE category = slot_category AND is_default = true → default block
  3. null → no block for this slot
```

```
CURRENT:  global_elements table → scope matching → priority sort                    ❌ old
TARGET:   layout_slots override > category default > null                            ✅ new
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current portal global-elements.ts
cat apps/portal/src/lib/global-elements.ts

# 2. How theme page calls it
grep "getGlobalElements\|globalElements" apps/portal/src/pages/themes/\\[slug\\].astro | head -5

# 3. How composed page calls it
grep "getGlobalElements\|globalElements" "apps/portal/src/pages/[...slug].astro" | head -5

# 4. Current blocks.ts — getLayoutByScope exists?
grep "getLayoutByScope" apps/portal/src/lib/blocks.ts
```

---

## Task 4.1: Rewrite `global-elements.ts` — new resolution

### What to Build

**File:** `apps/portal/src/lib/global-elements.ts`

Replace scope matching with cascade: layout_slots > default > null.

```typescript
import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'

const SLOT_TO_CATEGORY: Record<string, string> = {
  header: 'header',
  footer: 'footer',
  'sidebar-left': 'sidebar',
  'sidebar-right': 'sidebar',
}

/**
 * Resolve global element blocks for a page.
 * Cascade: layout_slots override > category default > null
 */
export async function resolveGlobalBlocks(
  layoutSlots: Record<string, string>,
): Promise<Record<string, Block | null>> {
  const slots = ['header', 'footer', 'sidebar-left', 'sidebar-right'] as const
  const result: Record<string, Block | null> = {}

  // 1. Collect all block IDs from layout overrides
  const overrideIds = slots
    .map(s => layoutSlots[s])
    .filter(Boolean)

  // 2. Fetch override blocks in one query
  let overrideMap = new Map<string, Block>()
  if (overrideIds.length > 0) {
    const { data } = await supabase
      .from('blocks')
      .select('*')
      .in('id', overrideIds)
    overrideMap = new Map((data ?? []).map(b => [b.id, b as Block]))
  }

  // 3. Fetch default blocks (one per category)
  const { data: defaults } = await supabase
    .from('blocks')
    .select('*')
    .eq('is_default', true)
    .neq('category', '')
  const defaultMap = new Map((defaults ?? []).map(b => [b.category, b as Block]))

  // 4. Resolve per slot: override > default > null
  for (const slot of slots) {
    const overrideId = layoutSlots[slot]
    if (overrideId && overrideMap.has(overrideId)) {
      result[slot] = overrideMap.get(overrideId)!
    } else {
      const category = SLOT_TO_CATEGORY[slot]
      result[slot] = defaultMap.get(category) ?? null
    }
  }

  return result
}
```

Key differences from old:
- No `global_elements` table query
- No scope matching / priority sort
- Takes `layoutSlots` as input (from layout page)
- Two simple DB queries: overrides + defaults

---

## Task 4.2: Update theme page route

### What to Build

**File:** `apps/portal/src/pages/themes/[slug].astro`

Replace `getGlobalElements('layout', 'themes')` call with new resolution:

```typescript
// OLD:
const globalElements = await getGlobalElements('layout', 'themes')

// NEW:
import { resolveGlobalBlocks } from '../../lib/global-elements'
const layoutSlots = (layoutPage?.layout_slots ?? {}) as Record<string, string>
const globalElements = await resolveGlobalBlocks(layoutSlots)
```

Layout page already fetched — just pass its `layout_slots` to resolver.

---

## Task 4.3: Update composed page route

### What to Build

**File:** `apps/portal/src/pages/[...slug].astro`

Composed pages don't have layout_slots (no layout page). They just get defaults:

```typescript
// OLD:
const globalElements = await getGlobalElements('composed', pageSlug)

// NEW:
import { resolveGlobalBlocks } from '../lib/global-elements'
const globalElements = await resolveGlobalBlocks({}) // empty = defaults only
```

---

## Task 4.4: Build verify

```bash
cd apps/portal && npx astro build
```

Theme pages + composed pages should still build. Global elements resolved via new cascade.

---

## Files to Modify

- `apps/portal/src/lib/global-elements.ts` — rewrite with cascade logic
- `apps/portal/src/pages/themes/[slug].astro` — use resolveGlobalBlocks
- `apps/portal/src/pages/[...slug].astro` — use resolveGlobalBlocks

---

## Acceptance Criteria

- [ ] `resolveGlobalBlocks(layoutSlots)` function exists
- [ ] No `global_elements` table queries in portal
- [ ] Theme page uses layout_slots from layout page for overrides
- [ ] Composed page passes empty object (defaults only)
- [ ] Cascade: layout override > category default > null
- [ ] Only 2 DB queries: override blocks + default blocks
- [ ] `npx astro build` succeeds
- [ ] Theme pages still render
- [ ] No regressions

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-008 Phase 4 Verification ==="

# 1. No global_elements queries
grep -c "global_elements" apps/portal/src/lib/global-elements.ts
echo "(expect: 0)"

# 2. resolveGlobalBlocks exists
grep -c "resolveGlobalBlocks" apps/portal/src/lib/global-elements.ts
echo "(expect: 1+)"

# 3. Theme page uses new function
grep "resolveGlobalBlocks" apps/portal/src/pages/themes/\\[slug\\].astro
echo "(expect: 1)"

# 4. Composed page uses new function
grep "resolveGlobalBlocks" "apps/portal/src/pages/[...slug].astro"
echo "(expect: 1)"

# 5. Build
cd apps/portal && npx astro build 2>&1 | tail -5

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-008/phase-4-result.md`

---

## Git

```bash
git add apps/portal/src/lib/global-elements.ts apps/portal/src/pages/ logs/wp-008/phase-4-result.md
git commit -m "feat: portal resolution — layout_slots override > category default > null [WP-008 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Old `getGlobalElements` function removed** — replaced entirely by `resolveGlobalBlocks`.
- **`layoutSlots` comes from layout page** — fetched via `getLayoutByScope('theme')` which already exists.
- **Composed pages have no layout** — pass `{}` for defaults only.
- **`global_elements` table NOT dropped yet** — Phase 5 cleanup. Just stop querying it.
- **SLOT_TO_CATEGORY same as in page-editor.tsx** — sidebar-left/right both map to 'sidebar' category.
