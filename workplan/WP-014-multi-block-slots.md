# WP-014: Multi-Block Slots with Configurable Gap

> Allow sidebar (and other global-element slots) to hold multiple blocks with a configurable gap, not just one.

**Status:** ✅ DONE
**Priority:** P1 — Important
**Prerequisites:** WP-012 ✅ (slot-registry), WP-008 ✅ (global-elements-v2)
**Estimated effort:** 4–6 hours across 3 phases + close
**Created:** 2026-04-07
**Completed:** 2026-04-07

---

## Problem Statement

Currently each global-element slot (`header`, `footer`, `sidebar-left`, `sidebar-right`) resolves to exactly **one block**. The `layout_slots` field in the `pages` table stores `{ "sidebar-right": "block-uuid" }` — a single ID per slot.

The sidebar on theme pages needs to show **multiple stacked blocks** (pricing card, categories, "perfect for" list, theme details, help & support — 5 separate blocks). Today the only workaround is baking all sidebar content into one giant block, which defeats the purpose of modular blocks.

We need:
1. Multiple blocks per slot, in a defined order
2. A configurable gap between blocks (per-layout, not hardcoded)
3. Studio UI to add/remove/reorder blocks per slot

---

## Solution Overview

### Architecture

```
pages.layout_slots (jsonb) — BEFORE:
  { "sidebar-right": "uuid-1" }

pages.layout_slots (jsonb) — AFTER:
  { "sidebar-right": ["uuid-1", "uuid-2", "uuid-3"] }

  Backward compat: string value treated as [string]

pages.slot_config (new jsonb column):
  { "sidebar-right": { "gap": "24px" }, "sidebar-left": { "gap": "16px" } }

resolveGlobalBlocks() — BEFORE:
  returns Record<string, Block | null>

resolveGlobalBlocks() — AFTER:
  returns Record<string, Block[]>
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Storage format for multi-block | Array of IDs in `layout_slots` | Zero migration — jsonb already supports arrays. Array index = order | Junction table `slot_blocks(page_id, slot, block_id, position)` — overkill for 3-5 blocks per slot |
| Gap config location | New `slot_config` jsonb column on `pages` | Per-layout control without touching blocks table | CSS custom property on layout HTML only — not configurable in Studio UI |
| Backward compat | String → `[string]` normalization in resolver | No migration needed for existing data | Migration to convert all strings to arrays — risky, unnecessary |
| Default blocks | Multiple `is_default` per `block_type` + new `sort_order` column on `blocks` | Allows default sidebar to have multiple blocks in order | Single default only — breaks the feature goal |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|---------------|----------------|
| pkg-db | Types: `layout_slots` accepts `string \| string[]` values. New `slot_config` type. Add `sort_order` to Block type | Block type must stay backward-compatible | Supabase types.ts must match actual DB columns |
| app-portal | `resolveGlobalBlocks` returns `Block[]` per slot. Theme page renders multiple blocks per sidebar slot | Layout HTML slot placeholders unchanged (`{{slot:sidebar-right}}` still works) | Cache key must include all block IDs, not just slot names |
| studio-core | SlotPanel in page-editor: multi-select + reorder arrows + gap input. Global Elements page unchanged | page-api.ts payload must serialize arrays correctly | Block picker must allow adding to existing list, not replace |

**Cross-domain risks:**
- Changing `resolveGlobalBlocks` return type breaks `apps/portal/app/themes/[slug]/page.tsx` — must update consumer simultaneously
- `layout_slots` type change in `pkg-db` affects `apps/studio/src/pages/page-editor.tsx` state type

---

## What This Changes

### Modified Files

```
packages/db/src/types.ts                          — layout_slots type: Record<string, string | string[]>
                                                    add SlotConfig type, slot_config to Page
                                                    add sort_order to Block
apps/portal/lib/global-elements.ts                — resolveGlobalBlocks → Record<string, Block[]>
                                                    normalize string→array, preserve order
apps/portal/app/themes/[slug]/page.tsx            — render Block[] per slot with wrapper div + gap
apps/studio/src/pages/page-editor.tsx             — SlotPanel: multi-block list, add/remove/reorder, gap input
                                                    layoutSlots state type update
packages/validators/src/page.ts                   — layout_slots schema accepts string | string[]
```

### Database Changes

```sql
-- Supabase migration: add slot_config to pages, sort_order to blocks
-- No migration needed for layout_slots — jsonb already accepts arrays

ALTER TABLE pages ADD COLUMN IF NOT EXISTS slot_config jsonb NOT NULL DEFAULT '{}';
-- Example: { "sidebar-right": { "gap": "24px" } }

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
-- Used for default block ordering when no layout_slots override
```

### Manifest Updates

```
No new files — only modifications to existing files.
Update packages/db/src/types.ts owned_tables if columns added.
```

---

## Implementation Phases

### Phase 0: RECON (done)

Completed during planning. Key findings:
- `layout_slots` is `Record<string, string>` everywhere (types, state, resolver)
- `resolveGlobalBlocks` returns `Record<string, Block | null>` — single block per slot
- `SlotPanel` uses `<select>` (single choice) per slot
- `is_default` is boolean on blocks — currently only one default per `block_type` enforced by convention, not constraint
- No `sort_order` column exists on blocks yet

---

### Phase 1: Data Layer + Portal Resolver (1.5–2h)

**Goal:** `resolveGlobalBlocks` returns `Block[]` per slot. Backward-compatible with existing string values.

**Tasks:**

1.1. **Supabase migration** — add `slot_config` to pages, `sort_order` to blocks
- `supabase/migrations/NNN_multi_block_slots.sql`

1.2. **Update `packages/db/src/types.ts`** — 
- `Page.layout_slots`: `Record<string, string | string[]>`
- Add `SlotConfig` type: `Record<string, { gap?: string }>`
- `Page.slot_config`: `SlotConfig`
- `Block.sort_order`: `number`

1.3. **Update `packages/validators/src/page.ts`** —
- `layout_slots` schema: `z.record(z.union([z.string(), z.array(z.string())]))`
- Add `slot_config` to page schema

1.4. **Rewrite `apps/portal/lib/global-elements.ts`** —
- Normalize: if `layoutSlots[slot]` is string → `[string]`
- Fetch all block IDs (flat), build blockMap
- Return `Record<string, Block[]>` (preserving array order)
- Default: query blocks where `block_type=category AND is_default=true`, ordered by `sort_order`

1.5. **Update `apps/portal/app/themes/[slug]/page.tsx`** —
- `renderGlobalBlock` → `renderGlobalBlocks(blocks: Block[], gap?: string)` returning wrapper div
- Read `slot_config` from layout page for gap values
- Wrap multi-block slot in `<div style="display:flex;flex-direction:column;gap:{gap}">…</div>`

**Verification:**
```bash
npm run arch-test
# Portal builds without type errors
npx tsc --noEmit -p apps/portal/tsconfig.json
```

---

### Phase 2: Studio UI — Multi-Block Slot Management (2–3h)

**Goal:** Studio SlotPanel lets users add multiple blocks per slot, reorder with arrows, set gap.

**Tasks:**

2.1. **Update `layoutSlots` state type** in `page-editor.tsx` —
- `Record<string, string | string[]>`
- Helper: `getSlotBlockIds(slot): string[]` normalizes string→array

2.2. **Replace single `<select>` with multi-block list** in `SlotPanel` —
- Show ordered list of assigned blocks (name + slug)
- Each row: `ArrowUp` / `ArrowDown` / `Trash2` buttons
- `+ Add block` button opens `BlockPickerModal` filtered by category
- Adding appends to array, removing splices, arrows swap positions

2.3. **Add gap config input** per slot in `SlotPanel` —
- Number input + "px" suffix (default 24)
- Stored in `slotConfig` state → saved to `pages.slot_config`

2.4. **Wire `slot_config` through save flow** —
- `createPageApi` / `updatePageApi` payloads include `slot_config`
- `page-api.ts` types updated

**Verification:**
```bash
npm run arch-test
# Studio builds
npx tsc --noEmit -p apps/studio/tsconfig.json
# Manual: open page editor, add multiple sidebar blocks, reorder, set gap, save, reload
```

---

### Phase 3: Close

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

3.1. **CC reads all phase logs** — understands what was done, what deviated from plan
3.2. **CC proposes doc updates** — list of files to update with proposed changes
3.3. **Brain approves** — reviews proposed changes
3.4. **CC executes doc updates** — updates `.context/BRIEF.md`, domain skills if contracts changed
3.5. **Verify everything green:**
  ```bash
  npm run arch-test
  ```
3.6. **Update WP status** — mark WP as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — note multi-block slot support
- `.context/CONVENTIONS.md` — if new patterns (slot_config, array normalization)
- `.claude/skills/domains/app-portal/SKILL.md` — resolveGlobalBlocks return type change
- `.claude/skills/domains/studio-core/SKILL.md` — SlotPanel multi-block behavior
- `src/__arch__/domain-manifest.ts` — if new files added
- `logs/wp-014/phase-*-result.md` — phase evidence

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing layout_slots with string values break | Portal 500 errors | Normalize string→`[string]` in resolver. No data migration needed |
| Cache invalidation with variable block count | Stale sidebar | Include sorted block IDs in cache key |
| Too many blocks in one slot (performance) | Slow page build | Practical limit: sidebar rarely exceeds 5-6 blocks. No hard cap needed |
| sort_order column missing on existing blocks | Default blocks unordered | Default `sort_order=0` — all existing blocks equal, ordered by name fallback |

---

## Acceptance Criteria (Definition of Done)

- [ ] `layout_slots` supports both `string` and `string[]` values per slot
- [ ] `resolveGlobalBlocks` returns `Record<string, Block[]>` with correct order
- [ ] Sidebar renders multiple blocks with configurable gap
- [ ] Studio SlotPanel: add, remove, reorder blocks per slot
- [ ] Studio SlotPanel: gap configuration per slot
- [ ] Backward compatible — existing single-block layouts still work
- [ ] `npm run arch-test` passes
- [ ] Domain invariants preserved
- [ ] All phases logged in `logs/wp-014/`

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-012 slot-registry | ✅ DONE | Slot names and categories |
| WP-008 global-elements-v2 | ✅ DONE | layout_slots + is_default pattern |

---

## Notes

- Header and footer technically benefit from this too (multi-block header = topbar + nav), but primary use case is sidebar
- Gap token could later be added to `tokens.css` as `--slot-gap-default` if needed
- The `global_elements` legacy table is untouched — Studio global-elements-settings.tsx page stays as-is (it manages block_type/is_default, not slot assignments)
