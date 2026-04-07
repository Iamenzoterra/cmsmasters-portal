# WP-014 Phase 1: Data Layer + Portal Resolver

> Workplan: WP-014 Multi-Block Slots with Configurable Gap
> Phase: 1 of 3
> Priority: P1
> Estimated: 1.5–2 hours
> Type: Full-stack
> Previous: Phase 0 (RECON) — done inline during WP planning
> Next: Phase 2 (Studio UI — multi-block slot management)
> Affected domains: pkg-db, app-portal, pkg-validators

---

## Context

```
CURRENT:  layout_slots stores ONE block ID per slot: { "sidebar-right": "uuid" }       ✅
CURRENT:  resolveGlobalBlocks returns Record<string, Block | null>                      ✅
CURRENT:  Theme page renders one block per global slot                                  ✅
MISSING:  layout_slots accepting array of IDs: { "sidebar-right": ["id1","id2","id3"] } ❌
MISSING:  resolveGlobalBlocks returning Block[] per slot                                ❌
MISSING:  Sidebar rendering multiple blocks with configurable gap                       ❌
MISSING:  slot_config column on pages table for gap configuration                       ❌
MISSING:  sort_order column on blocks for default ordering                              ❌
```

This phase upgrades the data layer (types, validators, DB migration) and the portal resolver + renderer. Phase 2 will add Studio UI for managing multi-block slots.

---

## Domain Context

**pkg-db:**
- Key invariants: All query functions take Supabase client as first arg. types.ts is source of truth for DB shapes. JSON columns typed via branded types.
- Known traps: types.ts is "auto-generated" — but we edit it manually in practice (Supabase `gen types` would overwrite). JSON columns parse as `any` at runtime.
- Public API: `packages/db/src/index.ts` — every export consumers can use
- Blast radius: Changing types.ts affects EVERY consumer of `@cmsmasters/db` (studio, portal, api, validators)

**app-portal:**
- Key invariants: SSG+ISR. Block rendering: HTML + scoped CSS + optional JS. Hook resolution is build-time string replace. Global elements cascade: layout_slots > is_default > null.
- Known traps: `resolveSlots` temporarily removes `<style>` blocks before processing `data-slot`. Portal uses anon Supabase client (RLS applies).
- Blast radius: Changing `lib/global-elements.ts` affects every page's header/footer/sidebars. Changing `lib/hooks.ts` affects all hook resolution.

**pkg-validators:**
- Key invariants: Zod schemas match DB types. `pageSchema` used by Studio page-editor and API.
- Blast radius: Changing `pageSchema` affects Studio form + API validation.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skills
cat .claude/skills/domains/pkg-db/SKILL.md
cat .claude/skills/domains/app-portal/SKILL.md

# 2. Check current layout_slots type in DB types
grep -n "layout_slots" packages/db/src/types.ts

# 3. Check current resolver signature
head -20 apps/portal/lib/global-elements.ts

# 4. Check validator schema
grep -n "layout_slots" packages/validators/src/page.ts

# 5. Check what the portal theme page does with globalElements
grep -n "globalElements\|renderGlobalBlock\|sidebar" apps/portal/app/themes/[slug]/page.tsx

# 6. Check existing migrations count (next = 010)
ls supabase/migrations/

# 7. Check if sort_order already exists on blocks
grep -n "sort_order" packages/db/src/types.ts
```

**Document findings before writing any code.**

**IMPORTANT:** `layout_slots` is currently `Record<string, string>` in 3 places (types.ts Row/Insert/Update). All three must change to `Record<string, string | string[]>`. The jsonb column in Postgres already accepts arrays — no ALTER needed for that column.

---

## Task 1.1: Supabase Migration

### What to Build

Create `supabase/migrations/010_multi_block_slots.sql`:

```sql
-- WP-014: Multi-block slots with configurable gap
-- Adds slot_config (gap per slot) to pages, sort_order to blocks.
-- layout_slots already jsonb — no ALTER needed (arrays work in jsonb).

-- Per-slot configuration (gap, future: direction, maxBlocks, etc.)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS slot_config jsonb NOT NULL DEFAULT '{}';
-- Example value: { "sidebar-right": { "gap": "24px" }, "sidebar-left": { "gap": "16px" } }

-- Default block ordering within a category (lower = first)
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
```

### Domain Rules

- Migration file naming: `NNN_description.sql` — next number is 010
- All tables already have RLS — no new RLS rules needed (existing SELECT/INSERT/UPDATE policies cover new columns)

---

## Task 1.2: Update `packages/db/src/types.ts`

### What to Build

**Add `SlotConfig` interface** (near the other JSON types at the top):

```typescript
// ── Slot configuration (stored in pages.slot_config jsonb) ──

export interface SlotConfig {
  [slot: string]: { gap?: string }
}
```

**Update `pages` table type** — `layout_slots` accepts string or string[] values, add `slot_config`:

```typescript
// In pages.Row:
layout_slots: Record<string, string | string[]>
slot_config: SlotConfig

// In pages.Insert:
layout_slots?: Record<string, string | string[]>
slot_config?: SlotConfig

// In pages.Update:
layout_slots?: Record<string, string | string[]>
slot_config?: SlotConfig
```

**Update `blocks` table type** — add `sort_order`:

```typescript
// In blocks.Row:
sort_order: number

// In blocks.Insert:
sort_order?: number

// In blocks.Update:
sort_order?: number
```

### Integration

Changes in `packages/db/src/types.ts`:

1. Add `SlotConfig` interface after `ThemeBlockFill` (line ~48)
2. Update `pages.Row.layout_slots` (line 308) from `Record<string, string>` to `Record<string, string | string[]>`
3. Add `pages.Row.slot_config: SlotConfig` after `layout_slots`
4. Same for `pages.Insert` and `pages.Update`
5. Add `blocks.Row.sort_order: number` after `is_default` (line ~163)
6. Add `blocks.Insert.sort_order?: number` after `is_default`
7. Add `blocks.Update.sort_order?: number` after `is_default`

### Domain Rules

- Changing types.ts affects ALL consumers — ensure no type errors in portal, studio, api
- Type aliases (Page, Block, etc.) at bottom auto-derive from the table types — no extra changes needed

---

## Task 1.3: Update `packages/validators/src/page.ts`

### What to Build

Update `layout_slots` Zod schema to accept string or string[]. Add `slot_config`.

```typescript
// In pageSchema:
layout_slots: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
slot_config: z.record(z.string(), z.object({ gap: z.string().optional() })).default({}),

// In updatePageSchema:
layout_slots: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
slot_config: z.record(z.string(), z.object({ gap: z.string().optional() })).optional(),
```

### Domain Rules

- `CreatePagePayload` and `UpdatePagePayload` types auto-infer from schemas — no manual type changes needed
- Studio page-editor uses `CreatePagePayload` for form — the type change is transparent

---

## Task 1.4: Rewrite `apps/portal/lib/global-elements.ts`

### What to Build

Change return type from `Record<string, Block | null>` to `Record<string, Block[]>`. Normalize string values to arrays. Fetch multiple blocks per slot. Support default blocks with sort_order.

```typescript
import { unstable_cache } from 'next/cache'
import { supabase } from './supabase'
import type { Block } from '@cmsmasters/db'
import { GLOBAL_SLOT_NAMES, SLOT_TO_CATEGORY } from '@cmsmasters/db'

/**
 * Normalize layout_slots value: string → [string], string[] stays, falsy → []
 */
function normalizeSlotValue(val: string | string[] | undefined): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return val ? [val] : []
}

/**
 * Resolve global element blocks for a page.
 * Cascade: layout_slots override > category defaults (is_default + sort_order) > []
 *
 * @param layoutSlots — from layout page's layout_slots field (or {} for composed pages)
 */
export const resolveGlobalBlocks = (
  layoutSlots: Record<string, string | string[]> = {},
): Promise<Record<string, Block[]>> => {
  const slotsKey = Object.entries(layoutSlots)
    .sort()
    .map(([k, v]) => `${k}:${Array.isArray(v) ? v.join('+') : v}`)
    .join(',') || 'default'

  return unstable_cache(
    async (): Promise<Record<string, Block[]>> => {
      const result: Record<string, Block[]> = {}

      // 1. Collect all override block IDs across all slots
      const allOverrideIds: string[] = []
      for (const slot of GLOBAL_SLOT_NAMES) {
        allOverrideIds.push(...normalizeSlotValue(layoutSlots[slot]))
      }

      // 2. Fetch override blocks
      let overrideMap = new Map<string, Block>()
      if (allOverrideIds.length > 0) {
        const { data } = await supabase
          .from('blocks')
          .select('*')
          .in('id', [...new Set(allOverrideIds)])
        overrideMap = new Map((data ?? []).map((b) => [b.id, b as Block]))
      }

      // 3. Fetch default blocks (is_default = true, ordered by sort_order)
      const { data: defaults } = await supabase
        .from('blocks')
        .select('*')
        .eq('is_default', true)
        .neq('block_type', '')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      const defaultsByCategory = new Map<string, Block[]>()
      for (const b of defaults ?? []) {
        const cat = (b as Block).block_type
        if (!defaultsByCategory.has(cat)) defaultsByCategory.set(cat, [])
        defaultsByCategory.get(cat)!.push(b as Block)
      }

      // 4. Resolve: override array > defaults > []
      for (const slot of GLOBAL_SLOT_NAMES) {
        const overrideIds = normalizeSlotValue(layoutSlots[slot])
        if (overrideIds.length > 0) {
          // Preserve array order from layout_slots
          result[slot] = overrideIds
            .map((id) => overrideMap.get(id))
            .filter((b): b is Block => b !== undefined)
        } else {
          const category = SLOT_TO_CATEGORY[slot]
          result[slot] = defaultsByCategory.get(category) ?? []
        }
      }

      return result
    },
    ['global-elements', slotsKey],
    { tags: ['blocks', 'global-elements'], revalidate: 3600 },
  )()
}
```

### Domain Rules

- Portal uses anon Supabase client — RLS applies
- Cache key includes all block IDs (via slotsKey) for proper invalidation
- `GLOBAL_SLOT_NAMES` and `SLOT_TO_CATEGORY` imported from `@cmsmasters/db`

---

## Task 1.5: Update `apps/portal/app/themes/[slug]/page.tsx`

### What to Build

Update theme page to render `Block[]` per slot. Add gap wrapper for multi-block slots. Read `slot_config` from layout page.

**Key changes:**

1. Update `layoutPage` type to include `slot_config`
2. Replace `renderGlobalBlock(block)` with `renderSlotBlocks(blocks, gap?)` that wraps multiple blocks
3. Pass gap from `slot_config` per slot

```typescript
// Replace the single-block renderGlobalBlock function with:

function renderSlotBlocks(blocks: Block[], gap?: string): string {
  if (blocks.length === 0) return ''
  const rendered = blocks.map((block) => {
    const html = resolveBlockHooks(block.html, block.hooks as Record<string, unknown>, meta)
    return renderBlock(html, block.css, block.slug, block.js || undefined)
  })
  // Single block — no wrapper needed
  if (rendered.length === 1) return rendered[0]
  // Multiple blocks — flex column with gap
  const style = gap ? ` style="display:flex;flex-direction:column;gap:${gap}"` : ' style="display:flex;flex-direction:column;gap:24px"'
  return `<div class="slot-stack"${style}>${rendered.join('\n')}</div>`
}
```

**Update the page assembly (step 7):**

```typescript
// Read slot_config from layout page
const slotConfig = ((layoutPage as Record<string, unknown>)?.slot_config ?? {}) as Record<string, { gap?: string }>

// In resolveSlots call:
pageHTML = resolveSlots(cleanLayout, {
  header: renderSlotBlocks(globalElements.header, slotConfig.header?.gap),
  footer: renderSlotBlocks(globalElements.footer, slotConfig.footer?.gap),
  'sidebar-left': renderSlotBlocks(globalElements['sidebar-left'], slotConfig['sidebar-left']?.gap),
  'sidebar-right': renderSlotBlocks(globalElements['sidebar-right'], slotConfig['sidebar-right']?.gap),
  content: contentHTML,
})
```

**Update batch block fetch (step 4):**

```typescript
// globalElements is now Record<string, Block[]> — flatten for batch fetch
const globalBlockIds = Object.values(globalElements)
  .flat()
  .map((b) => b.id)
```

**Update the layoutPage type annotation (line 78):**

```typescript
let layoutPage: {
  html: string
  css: string
  layout_slots?: Record<string, string | string[]>
  slot_config?: Record<string, { gap?: string }>
} | null = null
```

**Update fallback (no layout) case:**

```typescript
} else {
  const header = renderSlotBlocks(globalElements.header)
  const footer = renderSlotBlocks(globalElements.footer)
  pageHTML = `${header}\n<main>${contentHTML}</main>\n${footer}`
}
```

### Domain Rules

- All static styling via classes or inline style on wrapper div (gap is dynamic from DB config)
- `renderBlock()` from `lib/hooks.ts` unchanged — still renders individual blocks
- `resolveBlockHooks` and `resolveMetaHooks` still work as before

---

## Task 1.6: Export `SlotConfig` from `packages/db/src/index.ts`

### What to Build

Add `SlotConfig` to the existing exports in `packages/db/src/index.ts`.

```typescript
// In the existing type exports section, add:
export type { SlotConfig } from './types'
```

---

## Files to Modify

- `supabase/migrations/010_multi_block_slots.sql` — NEW: add slot_config + sort_order columns
- `packages/db/src/types.ts` — update layout_slots type, add SlotConfig, add sort_order
- `packages/db/src/index.ts` — export SlotConfig
- `packages/validators/src/page.ts` — layout_slots accepts array, add slot_config
- `apps/portal/lib/global-elements.ts` — resolver returns Block[], normalize string→array
- `apps/portal/app/themes/[slug]/page.tsx` — render multi-block slots with gap wrapper
- `src/__arch__/domain-manifest.ts` — add `010_multi_block_slots.sql` to owned_files if migrations are tracked

---

## Acceptance Criteria

- [ ] `layout_slots` type accepts both `string` and `string[]` values
- [ ] `SlotConfig` type exported from `@cmsmasters/db`
- [ ] `resolveGlobalBlocks` returns `Record<string, Block[]>`
- [ ] Backward compatible: existing `{ "sidebar-right": "uuid" }` still resolves correctly
- [ ] Multi-block slots render with flex column + gap wrapper
- [ ] Default blocks ordered by `sort_order` then `name`
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new boundary violations
- [ ] Portal and Studio type-check clean: `npx tsc --noEmit`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green)"

# 2. DB types compile
npx tsc --noEmit -p packages/db/tsconfig.json 2>&1 | tail -5
echo "(expect: no errors)"

# 3. Validators compile
npx tsc --noEmit -p packages/validators/tsconfig.json 2>&1 | tail -5
echo "(expect: no errors)"

# 4. Portal compiles
npx tsc --noEmit -p apps/portal/tsconfig.json 2>&1 | tail -5
echo "(expect: no errors)"

# 5. Studio compiles (type change in layout_slots may surface errors — expected, will fix in Phase 2)
npx tsc --noEmit -p apps/studio/tsconfig.json 2>&1 | tail -5
echo "(expect: may have errors in page-editor.tsx — fix if simple, defer to Phase 2 if complex)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-014/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-014 Phase 1 — Data Layer + Portal Resolver
> Epic: Multi-Block Slots with Configurable Gap
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: pkg-db, app-portal, pkg-validators

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅/❌ ({N} tests) |
| pkg-db tsc | ✅/❌ |
| validators tsc | ✅/❌ |
| portal tsc | ✅/❌ |
| studio tsc | ✅/❌ or deferred |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add supabase/migrations/010_multi_block_slots.sql \
  packages/db/src/types.ts \
  packages/db/src/index.ts \
  packages/validators/src/page.ts \
  apps/portal/lib/global-elements.ts \
  apps/portal/app/themes/\[slug\]/page.tsx \
  logs/wp-014/
git commit -m "feat: multi-block slots with configurable gap [WP-014 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Read domain skills FIRST** — `pkg-db/SKILL.md` and `app-portal/SKILL.md` before touching code
- **Backward compatibility is critical** — existing string values in layout_slots MUST still work
- **The `normalizeSlotValue` helper is the key** — converts string→[string] everywhere
- **Studio page-editor will have type errors** after this phase — that's expected. If the fix is a simple `string | string[]` state type change, do it. If it requires UI changes (multi-select), defer to Phase 2.
- **Run `npm run arch-test` before committing**
- **Add new migration file to domain-manifest.ts** if migrations are tracked there (check first)
