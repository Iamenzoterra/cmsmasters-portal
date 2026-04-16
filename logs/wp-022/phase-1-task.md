# WP-022 Phase 1: Custom Slot Block Assignment

> Workplan: WP-022 Custom Slot Block Assignment Pipeline
> Phase: 1 of 1
> Priority: P1
> Estimated: 4-5 hours
> Type: Frontend (cross-domain)
> Previous: WP-021 Phase 1 (slot position, sticky, top-level slot creation)
> Next: N/A (self-contained)
> Affected domains: infra-tooling, studio-portal

---

## Context

WP-021 added the ability to create custom top-level slots in Layout Maker (e.g., `page-title` for a theme title banner between header and content). The slot appears in the generated HTML with `data-slot="page-title"`.

**Problem:** When this layout is imported into Studio, the custom slot appears in Slot Assignments but is **non-interactive** — it renders as a static label saying "Custom slot" with no block picker, no gap control, and no way to assign blocks.

**Root cause:** Studio's `SlotPanel` (`apps/studio/src/pages/page-editor.tsx:973`) uses:
```tsx
const hasInteractiveControls = isGlobal || isNestedLeaf(slot)
```

Custom slots are neither global (header/footer/sidebar-left/sidebar-right) nor nested leaves (children of containers), so they fall through to the static label branch (line 1006).

Additionally, the block picker modal (`block-picker-modal.tsx:36`) filters blocks by `SLOT_TO_CATEGORY[slot]`, which returns `undefined` for custom slots — so even if we enabled the controls, the picker wouldn't know which block types to show.

**Solution:** Add an `allowed_block_types` field to slot config that Layout Maker authors set via checkboxes, which flows through export → import → Studio's SlotPanel to enable block assignment.

```
CURRENT:  Layout Maker can create custom top-level slots (WP-021)        ✅
CURRENT:  Studio extractSlots() finds custom slots in imported HTML      ✅
CURRENT:  Block picker works for global slots (header/footer/sidebar)    ✅
MISSING:  Layout Maker UI to configure which block types a slot accepts  ❌
MISSING:  Export pipeline includes allowed_block_types in slot_config     ❌
MISSING:  Studio renders block assignment controls for custom slots      ❌
```

---

## Domain Context

**infra-tooling (Layout Maker):**
- Key invariants: html-generator emits `<div data-slot>` (zero whitespace); position/sticky/z-index are role-level (base config only, never per-breakpoint)
- Known traps: export `resolveVisualParams()` only picks explicit visual keys — new fields need explicit passthrough in `buildSlotConfig()`
- Note: `nested-slots` is also currently dropped by export — this task should fix that too

**studio-portal (Studio):**
- Key invariants: `SLOT_TO_CATEGORY` maps global slot names to block_type; `extractSlots()` derives slot list from HTML markers
- Known traps: `slotConfigEntrySchema` in `packages/validators/src/page.ts` validates slot_config on save — new fields must be added there or they'll be stripped

---

## PHASE 0: Audit (do FIRST)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skills
cat .claude/skills/domains/infra-tooling/SKILL.md
cat .claude/skills/domains/studio-portal/SKILL.md

# 2. Verify SlotConfig type — current fields
grep -n "interface SlotConfig" tools/layout-maker/src/lib/types.ts

# 3. Verify export drops nested-slots (no mention in resolveVisualParams)
grep -n "nested-slots\|allowed_block" tools/layout-maker/runtime/routes/export.ts

# 4. Verify Studio SlotPanel non-interactive branch
grep -n "hasInteractiveControls\|Non-interactive\|Custom slot" apps/studio/src/pages/page-editor.tsx

# 5. Verify block picker filtering
grep -n "filterCategory" apps/studio/src/components/block-picker-modal.tsx

# 6. Verify validator schema
grep -n "slotConfigEntrySchema\|slotVisualParams" packages/validators/src/page.ts

# 7. Check block_type values in use
grep -n "block_type\|GLOBAL_ELEMENT_TYPES" apps/studio/src/pages/block-editor.tsx | head -10
```

**Document findings before writing any code.**

---

## Task 1.1: Layout Maker — `allowed_block_types` in SlotConfig & Inspector

### What to Build

Add `allowed_block_types` field to slot configuration and UI controls in Layout Maker Inspector.

### Type Changes

**`tools/layout-maker/src/lib/types.ts`** — add to `SlotConfig`:
```typescript
export interface SlotConfig {
  // ... existing fields ...
  'allowed_block_types'?: string[]
}
```

Allowed values (human-readable identifiers, mapped in Studio):
| Value | Maps to `block_type` | Description |
|-------|---------------------|-------------|
| `'theme-block'` | `''` (empty string) | Theme content blocks |
| `'element'` | `'element'` | Reusable elements |
| `'header'` | `'header'` | Header blocks |
| `'footer'` | `'footer'` | Footer blocks |
| `'sidebar'` | `'sidebar'` | Sidebar blocks |

### Inspector UI

In `tools/layout-maker/src/components/Inspector.tsx`, add a "Block Types" subsection inside the **Slot Role** section (`lm-inspector__section--role`). Only visible for **custom slots** — NOT for slots that exist in `SLOT_DEFINITIONS` (header, footer, sidebar-left, sidebar-right), and NOT for container slots.

```tsx
{/* Allowed block types — custom leaf slots only */}
{!isGlobalSlot && !isContainer && (
  <div className="lm-inspector__row lm-inspector__row--col">
    <span className="lm-inspector__label">Block types</span>
    <div className="lm-inspector__checkbox-group">
      {[
        { id: 'theme-block', label: 'Theme blocks' },
        { id: 'element', label: 'Elements' },
      ].map(({ id, label }) => (
        <label key={id} className="lm-inspector__checkbox">
          <input
            type="checkbox"
            checked={allowedTypes.includes(id)}
            onChange={(e) => {
              const next = e.target.checked
                ? [...allowedTypes, id]
                : allowedTypes.filter((t) => t !== id)
              onUpdateSlotRole(selectedSlot, { 'allowed_block_types': next.length > 0 ? next : undefined })
            }}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
    {allowedTypes.length === 0 && (
      <span className="lm-inspector__hint">No types selected — slot won't have block controls in Studio</span>
    )}
  </div>
)}
```

**Default behavior:** When creating a new custom slot via CreateSlotModal in top-level mode, default `allowed_block_types` to `['theme-block', 'element']`.

### Schema Validation

**`tools/layout-maker/runtime/lib/config-schema.ts`** — add to slot schema:
```typescript
'allowed_block_types': z.array(z.enum(['theme-block', 'element', 'header', 'footer', 'sidebar'])).optional(),
```

### Domain Rules

- `allowed_block_types` is **role-level** — stored on `config.slots[name]`, NOT per-breakpoint
- Use `onUpdateSlotRole` handler (from WP-021) — NOT `writeField`
- Global slots (header/footer/sidebar-left/sidebar-right) don't need this — their block types are determined by `SLOT_TO_CATEGORY`
- Container slots don't need this — they hold child slots, not blocks

---

## Task 1.2: Layout Maker — Export Pipeline

### What to Build

Extend `buildSlotConfig()` in `tools/layout-maker/runtime/routes/export.ts` to include `allowed_block_types` and `nested-slots` (currently both are dropped by `resolveVisualParams`).

### Implementation

**`tools/layout-maker/runtime/routes/export.ts`** — after building the visual params entry, pass through structural fields:

```typescript
// In buildSlotConfig(), after creating entry from resolveVisualParams:
const entry: SlotConfigEntry = { ...base }

// Pass through structural (non-visual) fields
const nestedSlots = (slot as Record<string, unknown>)['nested-slots']
if (Array.isArray(nestedSlots) && nestedSlots.length > 0) {
  ;(entry as Record<string, unknown>)['nested-slots'] = nestedSlots
}

const allowedTypes = (slot as Record<string, unknown>)['allowed_block_types']
if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
  ;(entry as Record<string, unknown>)['allowed_block_types'] = allowedTypes
}
```

**Update types** — extend `SlotConfigEntry` in export.ts:
```typescript
type SlotConfigEntry = VisualParams & {
  breakpoints?: Record<string, VisualParams>
  'nested-slots'?: string[]
  'allowed_block_types'?: string[]
}
```

**Update ExportPayload** — in `tools/layout-maker/src/lib/types.ts`, add to `slot_config` type:
```typescript
slot_config: Record<string, {
  // ... existing fields ...
  'nested-slots'?: string[]
  'allowed_block_types'?: string[]
}>
```

### Domain Rules

- `resolveVisualParams()` stays unchanged — it handles visual fields only
- Structural fields (`nested-slots`, `allowed_block_types`) are passed through separately
- Both fields are arrays and should only be included when non-empty

---

## Task 1.3: Studio — SlotPanel Block Assignment for Custom Slots

### What to Build

Update Studio's `SlotPanel` component to render full block assignment controls (block list + picker + gap) for custom slots that have `allowed_block_types` in their `slot_config`.

### Implementation

**`apps/studio/src/pages/page-editor.tsx`**

#### Step A: Update `hasInteractiveControls` (line 973)

```typescript
// Read allowed_block_types from slot_config
const allowedTypes = (slotConfig[slot] as Record<string, unknown>)?.['allowed_block_types'] as string[] | undefined
const isCustomWithBlocks = !isGlobal && !isNestedLeaf(slot) && !!allowedTypes?.length

const hasInteractiveControls = isGlobal || isNestedLeaf(slot) || isCustomWithBlocks
```

#### Step B: Map allowed_block_types to block_type filter

Add a mapping function near the top of the file:

```typescript
/** Map Layout Maker's allowed_block_types identifiers to DB block_type values. */
const BLOCK_TYPE_MAP: Record<string, string> = {
  'theme-block': '',       // empty string = theme content blocks
  'element': 'element',
  'header': 'header',
  'footer': 'footer',
  'sidebar': 'sidebar',
}
```

#### Step C: Determine blocks for custom slots

Inside the `slots.map()` callback, after existing `categoryBlocks` line:

```typescript
const category = SLOT_TO_CATEGORY[slot]
const categoryBlocks = category ? blocks.filter((b) => b.block_type === category) : []

// For custom slots with allowed_block_types:
const customFilteredBlocks = (!isGlobal && allowedTypes)
  ? blocks.filter((b) => {
      const mappedTypes = allowedTypes.map((t) => BLOCK_TYPE_MAP[t] ?? t)
      return mappedTypes.includes(b.block_type)
    })
  : []
const availableBlocks = isGlobal ? categoryBlocks : customFilteredBlocks
```

#### Step D: Add render branch for custom slots with block assignment

Between the "Non-interactive slots" branch (line 1006) and the "Dynamic nested leaves" branch (line 1030), add:

```tsx
// Custom slots with allowed_block_types: full block controls
if (isCustomWithBlocks) {
  return (
    <div
      key={slot}
      className="flex flex-col border"
      style={{
        borderColor: 'hsl(var(--border-default))',
        borderRadius: 'var(--rounded-lg)',
        backgroundColor: 'hsl(var(--bg-surface-alt))',
        overflow: 'hidden',
      }}
    >
      {/* Slot header: name + gap */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderBottom: blockIds.length > 0 ? '1px solid hsl(var(--border-default))' : 'none',
        }}
      >
        <code style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-link))', backgroundColor: 'hsl(var(--bg-surface))', padding: '2px 6px', borderRadius: 'var(--rounded-sm)' }}>
          {slot}
        </code>
        <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>Gap:</span>
          <input type="number" min={0} max={200} value={gapVal}
            onChange={(e) => {
              const gap = `${e.target.value}px`
              onConfigChange({ ...slotConfig, [slot]: { ...slotConfig[slot], gap } })
            }}
            className="outline-none"
            style={{ width: '48px', height: '28px', textAlign: 'center', padding: '0 4px',
              backgroundColor: 'hsl(var(--input))', border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--rounded-md)', fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--foreground))' }}
          />
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>px</span>
        </div>
      </div>

      {/* Block list (same pattern as global slots) */}
      {blockIds.length > 0 && (
        <div className="flex flex-col" style={{ gap: 0 }}>
          {blockIds.map((id, idx) => {
            const block = blocks.find((b) => b.id === id)
            return (
              /* ... same block row as global slots with move up/down/remove ... */
            )
          })}
        </div>
      )}

      {/* Add button */}
      <div style={{ padding: 'var(--spacing-xs) var(--spacing-md) var(--spacing-sm)' }}>
        {availableBlocks.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => setPickingSlot(slot)}>
            <Plus size={14} /> Add block
          </Button>
        ) : (
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
            No matching blocks found. Create theme blocks or elements first.
          </span>
        )}
      </div>
    </div>
  )
}
```

**Note:** The block row rendering (move up/down/remove) is identical to the global slots branch (lines 1139-1207). Extract a shared helper or duplicate the JSX — implementor's choice.

#### Step E: Update BlockPickerModal to support custom filtering

**`apps/studio/src/components/block-picker-modal.tsx`** — extend `filterCategory` to accept array:

```typescript
interface BlockPickerModalProps {
  onSelect: (block: Block) => void
  onClose: () => void
  excludeIds?: string[]
  filterCategory?: string
  filterCategories?: string[]    // NEW: for custom slots
}
```

Update filter logic:
```typescript
.filter((b) => {
  if (filterCategories?.length) return filterCategories.includes(b.block_type)
  if (filterCategory) return b.block_type === filterCategory
  return !b.block_type || b.block_type === 'element'
})
```

In SlotPanel, when opening picker for custom slot:
```tsx
<BlockPickerModal
  filterCategories={allowedTypes?.map((t) => BLOCK_TYPE_MAP[t] ?? t)}
  excludeIds={getSlotBlockIds(layoutSlots, pickingSlot)}
  onSelect={(block) => handleSlotAdd(pickingSlot, block)}
  onClose={() => setPickingSlot(null)}
/>
```

---

## Task 1.4: Validator Schema Update

### What to Build

Add `allowed_block_types` and `nested-slots` to the slot config validation schema so they survive the save pipeline.

**`packages/validators/src/page.ts`** — extend `slotConfigEntrySchema`:

```typescript
const slotConfigEntrySchema = slotVisualParamsSchema.extend({
  breakpoints: z.record(z.string(), slotVisualParamsSchema).optional(),
  'nested-slots': z.array(z.string()).optional(),
  'allowed_block_types': z.array(z.string()).optional(),
})
```

**Note:** Also add `background`, `border-sides`, `border-width`, `border-color` if they're not already in `slotVisualParamsSchema` — check current state during audit. These were added by WP-020 and may already be in the schema.

---

## Files to Modify

| File | Domain | Change |
|------|--------|--------|
| `tools/layout-maker/src/lib/types.ts` | infra-tooling | Add `allowed_block_types` to `SlotConfig` and `ExportPayload.slot_config` |
| `tools/layout-maker/src/components/Inspector.tsx` | infra-tooling | Add block type checkboxes in Slot Role section |
| `tools/layout-maker/src/components/CreateSlotModal.tsx` | infra-tooling | Default `allowed_block_types: ['theme-block', 'element']` for top-level slots |
| `tools/layout-maker/runtime/routes/export.ts` | infra-tooling | Pass through `nested-slots` + `allowed_block_types` in `buildSlotConfig()` |
| `tools/layout-maker/runtime/lib/config-schema.ts` | infra-tooling | Add `allowed_block_types` to slot schema |
| `apps/studio/src/pages/page-editor.tsx` | studio-portal | Update `SlotPanel` for custom slot block assignment |
| `apps/studio/src/components/block-picker-modal.tsx` | studio-portal | Add `filterCategories` prop for multi-type filtering |
| `packages/validators/src/page.ts` | shared | Add `nested-slots` + `allowed_block_types` to `slotConfigEntrySchema` |
| `tools/layout-maker/src/styles/maker.css` | infra-tooling | Styles for `.lm-inspector__checkbox-group` if needed |

---

## Acceptance Criteria

- [ ] Layout Maker Inspector shows "Block types" checkboxes for custom leaf slots (not global, not container)
- [ ] Checkboxes: "Theme blocks" and "Elements" (with room to add header/footer/sidebar later)
- [ ] New top-level slots default to `allowed_block_types: ['theme-block', 'element']`
- [ ] Export JSON includes `allowed_block_types` in `slot_config` for custom slots
- [ ] Export JSON includes `nested-slots` in `slot_config` for container slots (bugfix)
- [ ] Studio Slot Assignments shows full block controls (add/remove/reorder + gap) for custom slots with `allowed_block_types`
- [ ] Block picker filters correctly: "theme-block" shows `block_type === ''`, "element" shows `block_type === 'element'`
- [ ] Global slots (header/footer/sidebar) continue working unchanged via `SLOT_TO_CATEGORY`
- [ ] Custom slots WITHOUT `allowed_block_types` still render as static "Custom slot" label
- [ ] Validator accepts `allowed_block_types` and `nested-slots` — fields survive save roundtrip
- [ ] `npm run arch-test` passes (no regressions)
- [ ] Layout Maker build clean (no TS errors)
- [ ] Existing layouts load without regression

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-022 Phase 1 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. Layout Maker builds without errors
cd tools/layout-maker && npx tsc --noEmit 2>&1 | tail -5
echo "(expect: clean, no TS errors)"

# 3. Existing layout loads correctly
cat tools/layout-maker/layouts/theme-page-layout.yaml | head -30
echo "(expect: existing config intact, no corruption)"

# 4. Export includes structural fields
echo "(manual check: export a layout with a custom slot + container, verify JSON has allowed_block_types and nested-slots)"

# 5. Studio — manual browser test
echo "- Open Studio page editor for a layout"
echo "- Import a layout JSON with custom slot that has allowed_block_types"
echo "- Verify custom slot shows block assignment controls"
echo "- Verify block picker filters correctly"
echo "- Save and reload — verify slot_config persists"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-022/phase-1-result.md`

Structure (fill all sections):

```markdown
# Execution Log: WP-022 Phase 1 — Custom Slot Block Assignment
> Epic: WP-022 Custom Slot Block Assignment Pipeline
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: COMPLETE | PARTIAL | FAILED
> Domains affected: infra-tooling, studio-portal

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified | brief |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ({N} tests) |
| LM Build | |
| Studio Manual Test | |
| AC met | |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add tools/layout-maker/ apps/studio/src/pages/page-editor.tsx apps/studio/src/components/block-picker-modal.tsx packages/validators/src/page.ts logs/wp-022/
git commit -m "feat(studio): custom slot block assignment pipeline [WP-022 phase 1]"
```

---

## IMPORTANT Notes for CC

- **`allowed_block_types` is role-level** — stored on `config.slots[name]`, NOT per-breakpoint. Use `onUpdateSlotRole` handler.
- **Identifier mapping**: Layout Maker stores `'theme-block'` / `'element'` etc. Studio maps these to actual `block_type` values (`''` / `'element'`). The mapping lives in Studio only — Layout Maker doesn't know about DB block_type values.
- **Export gap**: `resolveVisualParams()` intentionally only handles visual CSS fields. Structural fields (`nested-slots`, `allowed_block_types`) must be passed through separately in `buildSlotConfig()`.
- **Validator is a gate**: if `allowed_block_types` isn't in `slotConfigEntrySchema`, Zod will strip it on save. Update validator FIRST or test against real save.
- **Block picker backward compat**: the new `filterCategories` prop is additive — existing `filterCategory` (singular) behavior is unchanged when `filterCategories` is not provided.
- **Don't touch global slot logic** — `SLOT_TO_CATEGORY` and the global slot rendering branch must remain untouched.
- Read domain skills FIRST: `.claude/skills/domains/infra-tooling/SKILL.md` and `.claude/skills/domains/studio-portal/SKILL.md`
- Run `npm run arch-test` before committing
