# WP-023 Phase 1: Per-Slot Visibility & Display Order

> Workplan: WP-023 Per-Slot Responsive Controls
> Phase: 1 of 1
> Priority: P1
> Estimated: 3 hours
> Type: Full-stack (Layout Maker)
> Previous: WP-022 phase 1 (custom slot blocks) + breakpoint presets/shortcuts
> Next: Studio/Portal breakpoint consumption (future WP)
> Affected domains: infra-tooling (layout-maker)

---

## Context

```
CURRENT:  Sidebar display mode (visible/hidden/drawer) is a grid-level property     ✅
          — config.grid[bp].sidebars = 'drawer' | 'hidden'
          — applies to ALL sidebar slots at once (blanket hide/show)
          — SidebarModeControl renders in Inspector (no-slot + slot-selected views)
          — CSS generator hides ALL [data-slot*="sidebar"] in one rule
MISSING:  Per-slot visibility (e.g., sidebar-left=hidden, sidebar-right=stacked)     ❌
          Per-slot display order (CSS order) for responsive reflow                   ❌
```

**Why:** Common responsive pattern — on mobile, a sidebar should appear BELOW the main content instead of beside it. Currently impossible because:
1. `sidebars` is grid-level — can't set different modes per-slot
2. No CSS `order` property — can't control visual stacking when grid collapses to single column

---

## Domain Context

**infra-tooling (layout-maker):**
- Key invariants: YAML nested-slots must validate (existence, single-parent, no-cycles). html-generator emits nested `<div data-slot>` with zero whitespace. css-generator skips `.slot-inner` for containers.
- Known traps: yaml `scope` must match DB `scope`. DB may carry visual params not in yaml (drifted via Studio edits).
- Blast radius: CSS generator output affects Portal rendering. Export JSON shape affects Studio import.

---

## PHASE 0: Audit (do FIRST)

```bash
# 0. Baseline
npx tsc --noEmit --project tools/layout-maker/tsconfig.json

# 1. Current sidebars implementation
grep -n "sidebars" tools/layout-maker/src/lib/types.ts
grep -n "sidebars" tools/layout-maker/runtime/lib/css-generator.ts
grep -n "sidebars" tools/layout-maker/runtime/lib/html-generator.ts
grep -n "sidebars" tools/layout-maker/runtime/lib/config-schema.ts
grep -n "SidebarModeControl" tools/layout-maker/src/components/Inspector.tsx

# 2. Current order support (expect: nothing)
grep -rn "order" tools/layout-maker/src/lib/types.ts
grep -rn "css.*order" tools/layout-maker/runtime/lib/css-generator.ts

# 3. Sample YAML to see current sidebar config
head -40 tools/layout-maker/layouts/inspect-test.yaml
```

**Document findings before writing code.**

**IMPORTANT:** Grid-level `sidebars` must remain as backward-compatible fallback. New per-slot fields override it when present.

---

## Task 1.1: Add `visibility` and `order` to SlotConfig

### What to Build

Add two new fields to `SlotConfig` interface and `PER_BP_SLOT_FIELDS`:

**File: `tools/layout-maker/src/lib/types.ts`**

```typescript
export interface SlotConfig {
  // ... existing fields ...
  
  /** Per-BP slot visibility: visible (default), hidden, or drawer */
  visibility?: 'visible' | 'hidden' | 'drawer'
  /** Per-BP CSS order for responsive stacking (lower = first) */
  order?: number
}
```

Add to `PER_BP_SLOT_FIELDS`:
```typescript
export const PER_BP_SLOT_FIELDS = [
  // ... existing 12 fields ...
  'visibility',
  'order',
] as const satisfies ReadonlyArray<keyof SlotConfig>
```

### Integration

In `types.ts`, add the two fields to the `SlotConfig` interface (after `border-color`, before `nested-slots`). Add them to the `PER_BP_SLOT_FIELDS` array.

### Domain Rules
- `visibility` and `order` are per-BP fields, NOT global
- On desktop (base BP), `visibility` defaults to `'visible'` (undefined = visible)
- `order` is only meaningful when grid collapses to 1 column (mobile/tablet)
- `nested-slots` and `allowed-block-types` remain global (not per-BP)

---

## Task 1.2: Update config schema validation

### What to Build

**File: `tools/layout-maker/runtime/lib/config-schema.ts`**

Add `visibility` and `order` to BOTH `slotSchemaPartial` and `slotSchema`:

```typescript
// In slotSchemaPartial (per-bp overrides):
visibility: z.enum(['visible', 'hidden', 'drawer']).optional(),
order: z.number().int().min(0).max(99).optional(),

// In slotSchema (base slot):
visibility: z.enum(['visible', 'hidden', 'drawer']).optional(),
order: z.number().int().min(0).max(99).optional(),
```

Cross-field validation (add after existing drawer-trigger check):
```typescript
// 6. Per-slot drawer requires drawer-trigger + drawer-width at grid level
for (const [bp, grid] of Object.entries(config.grid)) {
  if (!grid.slots) continue
  const hasPerSlotDrawer = Object.values(grid.slots).some(
    (s) => s.visibility === 'drawer'
  )
  if (hasPerSlotDrawer && !grid['drawer-trigger']) {
    errors.push(
      `Grid "${bp}" has per-slot visibility:drawer but no drawer-trigger`
    )
  }
}
```

---

## Task 1.3: Update CSS generator

### What to Build

**File: `tools/layout-maker/runtime/lib/css-generator.ts`**

Currently (line 370-378):
```typescript
// Hide sidebar slots in drawer or hidden mode (blanket — ALL sidebars)
if ((grid.sidebars === 'drawer' || grid.sidebars === 'hidden') && sidebarSlots.length > 0) {
  const selectors = sidebarSlots.map((n) => `  [data-slot="${n}"]`).join(',\n')
  out.push(`${selectors} {`)
  out.push('    display: none;')
  out.push('  }')
}
```

Replace with per-slot logic:

```typescript
// Per-slot visibility: check per-slot overrides first, fall back to grid-level sidebars
for (const [slotName, slot] of Object.entries(config.slots)) {
  const perSlotOverride = grid.slots?.[slotName]
  const slotVis = perSlotOverride?.visibility
  
  // Determine effective visibility for this slot at this BP
  let effectiveVis: string | undefined
  if (slotVis) {
    effectiveVis = slotVis  // explicit per-slot override
  } else if (sidebarSlots.includes(slotName) && grid.sidebars) {
    effectiveVis = grid.sidebars  // grid-level fallback for sidebar slots
  }
  
  if (effectiveVis === 'hidden' || effectiveVis === 'drawer') {
    out.push(`  [data-slot="${slotName}"] { display: none; }`)
  }
}

// Per-slot order (all slots, not just sidebars)
const orderRules: string[] = []
for (const [slotName] of Object.entries(config.slots)) {
  const slotOrder = grid.slots?.[slotName]?.order
  if (slotOrder !== undefined) {
    orderRules.push(`  [data-slot="${slotName}"] { order: ${slotOrder}; }`)
  }
}
if (orderRules.length > 0) {
  out.push('')
  for (const r of orderRules) out.push(r)
}
```

Keep the existing drawer trigger show logic (`grid.sidebars === 'drawer'`). Also trigger it if any per-slot visibility is 'drawer':

```typescript
const hasDrawerAtBp = grid.sidebars === 'drawer' ||
  Object.values(grid.slots ?? {}).some((s) => s.visibility === 'drawer')

if (hasDrawerAtBp) {
  out.push('  .drawer-trigger { display: block; }')
  // ... drawer-width override
}
```

Also update the `hasDrawers` detection at the top of `generateCSS()` to include per-slot drawer check.

---

## Task 1.4: Update Inspector UI

### What to Build

**File: `tools/layout-maker/src/components/Inspector.tsx`**

Add visibility + order controls to the **SLOT AREA** section, shown only on non-desktop BPs. Two new rows after the existing border controls:

```tsx
{/* Slot visibility — per-BP, shown on non-desktop for all slots */}
{!isBaseBp && (
  <div className="lm-inspector__row">
    <span className="lm-inspector__label">
      Visibility
      {isOverridden('visibility') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
    </span>
    <div className="lm-align-group">
      {([
        { value: undefined, label: 'Visible' },
        { value: 'hidden', label: 'Hidden' },
        { value: 'drawer', label: 'Drawer' },
      ] as const).map((opt) => (
        <button
          key={opt.label}
          className={`lm-align-btn${(slotConfig.visibility ?? undefined) === opt.value ? ' lm-align-btn--active' : ''}`}
          onClick={() => writeField('visibility', opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
)}

{/* Display order — per-BP, shown on non-desktop */}
{!isBaseBp && (
  <div className="lm-inspector__row">
    <span className="lm-inspector__label">
      Order
      {isOverridden('order') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
    </span>
    <input
      type="number"
      className="lm-spacing-select lm-spacing-select--inline"
      min={0}
      max={99}
      value={slotConfig.order ?? ''}
      placeholder="auto"
      onChange={(e) => {
        const v = e.target.value
        writeField('order', v === '' ? undefined : v)
      }}
      style={{ width: '60px' }}
    />
  </div>
)}
```

**Remove or deprecate `SidebarModeControl`:** Since visibility is now per-slot, the global sidebar mode control is redundant. Keep it as a convenience shortcut that sets visibility on ALL sidebar slots at once (batch operation), OR remove it. Recommended: keep it but label it "All sidebars" and have it write per-slot visibility to each sidebar slot.

### CSS for new controls

**File: `tools/layout-maker/src/styles/maker.css`**

No new CSS classes needed — reuses existing `.lm-align-group`, `.lm-align-btn`, `.lm-inspector__row`, `.lm-spacing-select`.

---

## Task 1.5: Update export route

### What to Build

**File: `tools/layout-maker/runtime/routes/export.ts`**

Add `visibility` and `order` to the `VisualParams` type and `resolveVisualParams()`:

```typescript
type VisualParams = {
  // ... existing fields ...
  visibility?: 'visible' | 'hidden' | 'drawer'
  order?: number
}

function resolveVisualParams(slot: Record<string, unknown>, tokens: Record<string, string>): VisualParams {
  // ... existing code ...
  if (slot.visibility) out.visibility = slot.visibility as string
  if (slot.order !== undefined) out.order = slot.order as number
  return out
}
```

Also update the `ExportPayload` type in `types.ts` to include `visibility` and `order` in breakpoint overrides.

---

## Task 1.6: Update living documentation

### What to Build

**File: `tools/layout-maker/CLAUDE.md`**

Update Per-breakpoint fields list:
```
### Per-breakpoint fields (PER_BP_SLOT_FIELDS)
padding, padding-x, padding-top, padding-bottom, gap, align, max-width, min-height, margin-top, border-sides, border-width, border-color, **visibility**, **order**
```

Add section:
```
### Per-slot visibility (per-BP)
- `visible` (default) — slot renders normally in grid
- `hidden` — slot gets `display: none` at this BP
- `drawer` — slot hidden in grid, content moves to off-canvas drawer

Replaces grid-level `sidebars` for per-slot control. Grid-level `sidebars` still works as fallback for sidebar slots without explicit per-slot visibility.

### Display order (per-BP)
CSS `order` property for controlling visual stacking when grid collapses to single column.
Example: on mobile, set content order=1, sidebar-right order=2 to stack sidebar below content.
```

**File: `.context/BRIEF.md`**

Update breakpoint system section to mention per-slot visibility and order.

---

## Files to Modify

- `tools/layout-maker/src/lib/types.ts` — add `visibility`, `order` to SlotConfig + PER_BP_SLOT_FIELDS + ExportPayload
- `tools/layout-maker/runtime/lib/config-schema.ts` — add validation for new fields
- `tools/layout-maker/runtime/lib/css-generator.ts` — per-slot visibility + order CSS emission
- `tools/layout-maker/src/components/Inspector.tsx` — visibility + order controls in SLOT AREA, update SidebarModeControl
- `tools/layout-maker/runtime/routes/export.ts` — export new fields in slot_config
- `tools/layout-maker/CLAUDE.md` — document new fields
- `.context/BRIEF.md` — update breakpoint system section

---

## Acceptance Criteria

- [ ] Per-slot `visibility` field works: visible/hidden/drawer per breakpoint
- [ ] Per-slot `order` field works: CSS order emitted in media queries
- [ ] Grid-level `sidebars` still works as fallback (backward compatible)
- [ ] Inspector shows visibility + order controls on non-desktop BPs
- [ ] BP badge visible on SLOT AREA section header
- [ ] CSS generator emits per-slot `display: none` / `order: N` in media queries
- [ ] Export includes visibility + order in `slot_config.breakpoints`
- [ ] TypeScript compiles clean (`npx tsc --noEmit --project tools/layout-maker/tsconfig.json`)
- [ ] Config validation accepts new fields, rejects invalid values
- [ ] Documentation updated (CLAUDE.md + BRIEF.md)

---

## MANDATORY: Verification

```bash
echo "=== WP-023 Phase 1 Verification ==="

# 1. TypeScript compilation
npx tsc --noEmit --project tools/layout-maker/tsconfig.json
echo "(expect: no errors)"

# 2. Verify new fields in types
grep -n "visibility" tools/layout-maker/src/lib/types.ts
grep -n "order" tools/layout-maker/src/lib/types.ts
echo "(expect: visibility + order in SlotConfig and PER_BP_SLOT_FIELDS)"

# 3. Verify schema validation
grep -n "visibility" tools/layout-maker/runtime/lib/config-schema.ts
grep -n "order" tools/layout-maker/runtime/lib/config-schema.ts
echo "(expect: visibility enum + order int in both slot schemas)"

# 4. Verify CSS generator
grep -n "visibility\|\.order" tools/layout-maker/runtime/lib/css-generator.ts
echo "(expect: per-slot visibility + order emission)"

# 5. Verify export
grep -n "visibility\|order" tools/layout-maker/runtime/routes/export.ts
echo "(expect: new fields in VisualParams + resolveVisualParams)"

# 6. Visual test — start dev server and verify in browser
echo "(manual: open Layout Maker, switch to tablet, check Inspector for visibility + order controls)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification, create: `logs/wp-023/phase-1-result.md`

---

## Git

```bash
git add tools/layout-maker/src/lib/types.ts tools/layout-maker/runtime/lib/config-schema.ts tools/layout-maker/runtime/lib/css-generator.ts tools/layout-maker/src/components/Inspector.tsx tools/layout-maker/runtime/routes/export.ts tools/layout-maker/CLAUDE.md .context/BRIEF.md logs/wp-023/
git commit -m "feat(layout-maker): per-slot visibility & display order [WP-023 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Grid-level `sidebars` must NOT break** — it's used in existing YAML configs. Per-slot visibility overrides it when present, otherwise grid-level applies as fallback.
- **Drawer HTML generation** (html-generator.ts) may need updates if per-slot drawer detection changes which slots get drawer elements. Check `hasDrawers` detection.
- **`order` writes as a number**, not a string — ensure `writeField` handles number vs string correctly in Inspector.
- **`isOverridden()` already works** for any field in PER_BP_SLOT_FIELDS — no changes needed to the override detection logic.
- The `SidebarModeControl` component can be kept as a batch control that writes `visibility` to all sidebar slots, or removed. Decision: keep as convenience, relabel.
