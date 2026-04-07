# WP-014 Phase 2: Studio UI — Multi-Block Slot Management

> Workplan: WP-014 Multi-Block Slots with Configurable Gap
> Phase: 2 of 3
> Priority: P1
> Estimated: 2–3 hours
> Type: Frontend
> Previous: Phase 1 ✅ (data layer + portal resolver — types, migration, resolver returns Block[])
> Next: Phase 3 (Close — docs, logs, final verification)
> Affected domains: studio-core

---

## Context

```
CURRENT:  layout_slots type accepts string | string[] (Phase 1)           ✅
CURRENT:  SlotPanel shows a single <select> per global slot               ✅
CURRENT:  onSlotChange sets ONE block ID per slot                         ✅
CURRENT:  No slot_config (gap) state or UI exists                         ✅
MISSING:  SlotPanel showing ordered list of blocks per slot               ❌
MISSING:  Add/remove/reorder buttons for slot blocks                      ❌
MISSING:  Gap configuration input per slot                                ❌
MISSING:  slot_config state wired through save/publish flow               ❌
MISSING:  BlockPickerModal filtered by slot category                      ❌
```

Phase 1 upgraded the data layer — `layout_slots` now accepts arrays, `slot_config` stores gap per slot, and the portal resolver handles it all. This phase builds the Studio UI so content managers can manage multiple blocks per slot.

**Key pattern to reuse:** The composed page's block list (lines 668–733 in `page-editor.tsx`) already has the exact UI pattern we need — ordered list with ArrowUp/ArrowDown/Trash2 buttons, plus "Add Block" button opening `BlockPickerModal`. We replicate this inside `SlotPanel` for each global slot.

---

## Domain Context

**studio-core:**
- Key invariants: `block-api.ts` exports shared `authHeaders`/`parseError` used by all API wrappers. All editors share `inputStyle`/`labelStyle` inline objects.
- Known traps: `BlockPickerModal` currently filters out `header`/`footer`/`sidebar` blocks (line 34: `!b.block_type || b.block_type === 'element'`). For slot blocks, we need the OPPOSITE filter — only show blocks matching the slot's category.
- Public API: `page-api.ts` — `createPageApi`, `updatePageApi` already accept `layout_slots: Record<string, string | string[]>` and `slot_config` (updated in Phase 1).
- Blast radius: Changing `SlotPanel` only affects layout pages in page-editor. Changing `BlockPickerModal` affects composed page block picking too — be careful with filter prop.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skill
cat .claude/skills/domains/studio-core/SKILL.md

# 2. Verify Phase 1 types are in place
grep "slot_config" packages/db/src/types.ts
grep "slot_config" apps/studio/src/lib/page-api.ts

# 3. Check current SlotPanel signature and full code
grep -n "function SlotPanel" apps/studio/src/pages/page-editor.tsx

# 4. Check BlockPickerModal filter logic
grep -n "block_type" apps/studio/src/components/block-picker-modal.tsx

# 5. Check how composed page block list does reorder (reuse pattern)
grep -n "handleMoveBlock\|handleRemoveBlock\|handleAddBlock" apps/studio/src/pages/page-editor.tsx
```

**IMPORTANT:** `BlockPickerModal` filters blocks by `!b.block_type || b.block_type === 'element'` on line 34. For slot blocks, we need to show only blocks matching the slot category (e.g., `block_type === 'sidebar'`). Add a `filterCategory` prop rather than changing the existing filter — keeps backward compat for composed pages.

---

## Task 2.1: Add `slotConfig` State + Wire Through Save Flow

### What to Build

In `page-editor.tsx`, add state for `slotConfig` alongside existing `layoutSlots`:

```typescript
// After line 124 (layoutSlots state):
const [slotConfig, setSlotConfig] = useState<Record<string, { gap?: string }>>({})
```

**Load from existing page:**

```typescript
// In the page load effect (where layoutSlots is loaded from page.layout_slots):
if (page.slot_config) setSlotConfig(page.slot_config as Record<string, { gap?: string }>)
```

Find all 4 places where `layout_slots` is passed to `createPageApi`/`updatePageApi` and add `slot_config: slotConfig`:

1. Save (update) — ~line 325: add `slot_config: slotConfig` to `updatePayload`
2. Save (create) — ~line 347: add `slot_config: slotConfig` to `createPayload`
3. Publish (update) — ~line 390: add `slot_config: slotConfig` to `updatePayload`
4. Publish (create) — ~line 413: add `slot_config: slotConfig` to `createPayload`

**Reset on new page:**

```typescript
// In the reset handler (where layoutSlots is reset to {}):
setSlotConfig({})
```

### Integration

In `page-editor.tsx`, find `setLayoutSlots({})` in the reset handler (~line 481) and add `setSlotConfig({})` after it.

Find `setLayoutSlots(page.layout_slots ...)` in the load handler (~line 202 and ~line 465) and add:
```typescript
if (page.slot_config) setSlotConfig(page.slot_config as Record<string, { gap?: string }>)
```

### Domain Rules

- Save flow has 4 code paths (save-update, save-create, publish-update, publish-create) — all 4 must include `slot_config`
- Keep `slotConfig` state type matching `SlotConfig` from `@cmsmasters/db`

---

## Task 2.2: Add `filterCategory` Prop to `BlockPickerModal`

### What to Build

Add optional `filterCategory` prop to `BlockPickerModal`. When provided, show only blocks with that `block_type`. When absent, use existing filter (content blocks only).

```typescript
interface BlockPickerModalProps {
  onSelect: (block: Block) => void
  onClose: () => void
  excludeIds?: string[]
  filterCategory?: string  // NEW: when set, show only blocks with this block_type
}
```

Update the filter logic (~line 32-34):

```typescript
const filtered = blocks
  .filter((b) => !excludeIds.includes(b.id))
  .filter((b) => {
    if (filterCategory) return b.block_type === filterCategory
    return !b.block_type || b.block_type === 'element'
  })
  .filter((b) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)
  })
```

### Domain Rules

- Do NOT change existing behavior when `filterCategory` is absent — composed page block picker must still work as before
- The prop is optional with no default — backward compatible

---

## Task 2.3: Rewrite `SlotPanel` for Multi-Block Slots

### What to Build

Replace the single `<select>` per global slot with:
1. Ordered list of assigned blocks (reuse composed page list pattern)
2. ArrowUp / ArrowDown / Trash2 buttons per block
3. "+ Add" button opening `BlockPickerModal` with `filterCategory={category}`
4. Gap input per slot

**Change the `SlotPanel` props:**

```typescript
function SlotPanel({ code, layoutSlots, slotConfig, onSlotsChange, onConfigChange, blocks }: {
  code: string
  layoutSlots: Record<string, string | string[]>
  slotConfig: Record<string, { gap?: string }>
  onSlotsChange: (slots: Record<string, string | string[]>) => void
  onConfigChange: (config: Record<string, { gap?: string }>) => void
  blocks: Block[]
}) {
```

**Note:** We change from per-slot `onSlotChange(slot, blockId)` to full-state `onSlotsChange(slots)` because multi-block operations (add, remove, reorder) are easier to express on the whole state.

**For each global slot, render:**

```
┌─────────────────────────────────────────────────┐
│ sidebar-right                           Gap: 24 │  ← slot name + gap input
├─────────────────────────────────────────────────┤
│  1  Pricing Card         ▲  ▼  🗑              │  ← block row with reorder
│  2  Categories           ▲  ▼  🗑              │
│  3  Theme Details        ▲  ▼  🗑              │
│  [+ Add sidebar block]                          │  ← opens BlockPickerModal
└─────────────────────────────────────────────────┘
```

**Helper to normalize slot value:**

```typescript
function getSlotBlockIds(layoutSlots: Record<string, string | string[]>, slot: string): string[] {
  const val = layoutSlots[slot]
  if (!val) return []
  if (Array.isArray(val)) return val.filter(Boolean)
  return [val]
}
```

**Block list per slot:**

```tsx
const blockIds = getSlotBlockIds(layoutSlots, slot)

{blockIds.length > 0 && (
  <div className="flex flex-col" style={{ gap: '2px' }}>
    {blockIds.map((id, idx) => {
      const block = blocks.find((b) => b.id === id)
      return (
        <div key={id} className="flex items-center" style={{ ... same pattern as composed list ... }}>
          <span style={{ ... }}>{idx + 1}</span>
          <span className="flex-1 truncate" style={{ ... }}>{block?.name ?? id}</span>
          <div className="flex items-center" style={{ gap: '4px' }}>
            {/* ArrowUp — disabled if idx === 0 */}
            {/* ArrowDown — disabled if idx === blockIds.length - 1 */}
            {/* Trash2 — always enabled */}
          </div>
        </div>
      )
    })}
  </div>
)}
```

**Reorder handler:**

```typescript
function handleSlotMove(slot: string, index: number, direction: 'up' | 'down') {
  const ids = getSlotBlockIds(layoutSlots, slot)
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= ids.length) return
  const updated = [...ids]
  ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
  onSlotsChange({ ...layoutSlots, [slot]: updated })
}
```

**Remove handler:**

```typescript
function handleSlotRemove(slot: string, index: number) {
  const ids = getSlotBlockIds(layoutSlots, slot)
  const updated = ids.filter((_, i) => i !== index)
  const next = { ...layoutSlots }
  if (updated.length === 0) delete next[slot]
  else next[slot] = updated
  onSlotsChange(next)
}
```

**Add handler** (opens `BlockPickerModal` filtered by category):

```typescript
// State for which slot is being picked for
const [pickingSlot, setPickingSlot] = useState<string | null>(null)

function handleSlotAdd(slot: string, block: Block) {
  const ids = getSlotBlockIds(layoutSlots, slot)
  onSlotsChange({ ...layoutSlots, [slot]: [...ids, block.id] })
  setPickingSlot(null)
}
```

**Gap input per slot:**

```tsx
<input
  type="number"
  value={parseInt(slotConfig[slot]?.gap ?? '24', 10)}
  onChange={(e) => {
    const gap = `${e.target.value}px`
    onConfigChange({ ...slotConfig, [slot]: { ...slotConfig[slot], gap } })
  }}
  style={{ width: '48px', ...inputStyle, height: '28px', textAlign: 'center' }}
/>
<span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>px</span>
```

**Non-global slots** (content, meta, custom) — keep existing behavior (static labels, no modification).

### Integration

**Update `SlotPanel` call site** (~line 643 in page-editor.tsx):

```tsx
<SlotPanel
  code={layoutCode}
  layoutSlots={layoutSlots}
  slotConfig={slotConfig}
  onSlotsChange={setLayoutSlots}
  onConfigChange={setSlotConfig}
  blocks={slotBlocks}
/>
```

This replaces the current inline `onSlotChange` handler.

### Domain Rules

- Reuse the exact same button/icon styles from composed page block list (lines 704–729)
- All styling via tokens — no hardcoded colors, fonts, sizes
- `BlockPickerModal` must receive `filterCategory` matching `SLOT_TO_CATEGORY[slot]`
- `excludeIds` should be the current slot's block IDs (prevent duplicates)

---

## Files to Modify

- `apps/studio/src/pages/page-editor.tsx` — `slotConfig` state, save flow (4 paths), reset, load, `SlotPanel` rewrite, call site update
- `apps/studio/src/components/block-picker-modal.tsx` — add `filterCategory` prop

---

## Acceptance Criteria

- [ ] `slotConfig` state loaded from existing page and saved through all 4 save paths
- [ ] `BlockPickerModal` accepts `filterCategory` prop, filters by `block_type`
- [ ] `BlockPickerModal` without `filterCategory` still shows content blocks only (backward compat)
- [ ] SlotPanel shows ordered block list per global slot
- [ ] ArrowUp/ArrowDown reorder blocks within a slot
- [ ] Trash2 removes a block from a slot
- [ ] "+ Add" button opens picker filtered by slot category
- [ ] Gap input per slot (number + "px" suffix), stored in `slotConfig`
- [ ] Non-global slots (content, meta, custom) unchanged
- [ ] `npm run arch-test` passes
- [ ] `npx tsc --noEmit -p apps/studio/tsconfig.json` — no new errors

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green)"

# 2. Studio compiles
npx tsc --noEmit -p apps/studio/tsconfig.json 2>&1 | tail -10
echo "(expect: only pre-existing revalidate.ts errors, 0 new)"

# 3. Manual verification (Studio running on localhost:5173)
echo "Manual checks:"
echo "  - Open page editor for a layout page"
echo "  - Slot panel shows global slots with block lists"
echo "  - Can add multiple sidebar blocks"
echo "  - Can reorder with arrows"
echo "  - Can remove with trash"
echo "  - Can set gap per slot"
echo "  - Save + reload preserves slot blocks and gap"
echo "  - Composed page block picker still works (no sidebar blocks shown)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-014/phase-2-result.md`

Structure (fill all sections):

```markdown
# Execution Log: WP-014 Phase 2 — Studio UI Multi-Block Slots
> Epic: Multi-Block Slots with Configurable Gap
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: studio-core

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅/❌ ({N} tests) |
| studio tsc | ✅/❌ |
| Manual UI test | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add apps/studio/src/pages/page-editor.tsx \
  apps/studio/src/components/block-picker-modal.tsx \
  logs/wp-014/phase-2-result.md
git commit -m "feat(studio): multi-block slot UI with reorder and gap config [WP-014 phase 2]"
```

---

## IMPORTANT Notes for CC

- **Reuse the composed block list pattern** — lines 668–733 in page-editor.tsx have the exact ArrowUp/ArrowDown/Trash2 UI. Copy the styles.
- **`BlockPickerModal` filter change is the trap** — do NOT change existing behavior for composed pages. Add `filterCategory` as optional prop.
- **4 save paths** — save-update, save-create, publish-update, publish-create. All must include `slot_config: slotConfig`. Easy to miss one.
- **`pickingSlot` state** — needed to know which slot the BlockPickerModal is adding to. Render one modal, track which slot triggered it.
- **Gap default** — show 24 in the input when `slotConfig[slot]?.gap` is undefined. Store as "24px" string.
- **Run `npm run arch-test` before committing**
