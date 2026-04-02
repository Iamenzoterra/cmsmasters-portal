# WP-005C Phase 3: Theme Editor Pivot — Template Picker + Block Fills

> Workplan: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Phase: 3 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Frontend
> Previous: Phase 2 ✅ (Templates page: list + editor + position grid + block picker + shared DeleteConfirmModal)
> Next: Phase 4 (UX Polish)

---

## Context

Phases 1–2 delivered Blocks and Templates pages with full CRUD. The theme editor still has the WP-005B placeholder at lines 393-398:

```tsx
<FormSection title="Content Blocks">
  <p>Template and block management coming in next update...</p>
</FormSection>
```

This phase replaces that placeholder with the template-driven content model described in BLOCK-ARCHITECTURE-V2: pick template → see positions → fill empty slots with "+".

```
CURRENT:  Theme editor — Basic Info, Links, [PLACEHOLDER], SEO + sidebar   ✅
CURRENT:  ThemeFormData has template_id + block_fills (Zod + mapper ready)  ✅
CURRENT:  PositionGrid component (controlled, supports readonlyPositions)   ✅
CURRENT:  BlockPickerModal component (reusable)                             ✅
CURRENT:  template-api.ts — fetchAllTemplates, fetchTemplateById            ✅
CURRENT:  Save pipeline — formDataToThemeInsert handles template_id/fills   ✅
MISSING:  Template picker in theme editor   ❌
MISSING:  Position grid with merged template + theme block_fills   ❌
MISSING:  "+" fills for empty template positions   ❌
MISSING:  "Change template" with block_fills reset warning   ❌
```

### Key Architecture Fact

The theme editor uses a **different save pipeline** than blocks/templates:
- Blocks/templates: raw `fetch` to Hono API via `block-api.ts` / `template-api.ts`
- Themes: direct Supabase client via `upsertTheme(supabase, payload)` from `@cmsmasters/db`

`template_id` and `block_fills` are already part of `ThemeFormData` → `formDataToThemeInsert` → `upsertTheme`. So saving works automatically once the form fields are populated. **No new API calls for saving.**

We DO need `fetchAllTemplates()` and `fetchTemplateById()` from `template-api.ts` for the picker and position display. And `fetchAllBlocks()` from `block-api.ts` for the position grid block name lookup.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm the placeholder location in theme-editor.tsx
grep -n "Content Blocks\|coming in next update" apps/studio/src/pages/theme-editor.tsx

# 2. Confirm ThemeFormData has template_id + block_fills
grep -n "template_id\|block_fills" packages/validators/src/theme.ts

# 3. Confirm mappers handle template_id + block_fills
grep -n "template_id\|block_fills" packages/db/src/mappers.ts

# 4. Confirm PositionGrid supports readonlyPositions
grep -n "readonlyPositions" apps/studio/src/components/position-grid.tsx

# 5. Confirm BlockPickerModal props
head -12 apps/studio/src/components/block-picker-modal.tsx

# 6. Confirm template-api exports
grep "export.*function" apps/studio/src/lib/template-api.ts

# 7. Confirm form-defaults has template_id + block_fills
cat apps/studio/src/lib/form-defaults.ts
```

**Document your findings before writing any code.**

**IMPORTANT:** The theme editor uses `react-hook-form` with `zodResolver(themeSchema)`. `template_id` and `block_fills` are RHF-managed fields, NOT separate useState like template-editor's positions. Use `form.setValue('template_id', ...)` and `form.setValue('block_fills', ...)` — they flow through the normal save pipeline. The `isDirty` flag will track changes automatically.

---

## Task 3.1: Template Picker Component

### What to Build

**File:** `apps/studio/src/components/template-picker.tsx` (NEW)

Inline component (not a modal) that lets the CM select which template to apply to a theme. Shown when `template_id` is empty or when "Change template" is clicked.

**Props:**

```typescript
interface TemplatePickerProps {
  selectedId: string   // current template_id ('' = none)
  onSelect: (templateId: string) => void
}
```

**Behavior:**

- Fetches templates via `fetchAllTemplates()` on mount
- Shows a list/grid of template cards: name, description, "N positions" count
- Click card → `onSelect(template.id)`
- If `selectedId` is non-empty, highlight the currently selected template
- Search filter on template name (optional for MVP — list is likely small)

**Visual:**

```
┌──────────────────────────────────────────┐
│  Select a Template                       │
│                                          │
│  ┌──────────────┐ ┌──────────────┐       │
│  │ Homepage     │ │ Landing      │       │
│  │ 10 positions │ │ 6 positions  │       │
│  │ [Selected ✓] │ │              │       │
│  └──────────────┘ └──────────────┘       │
│                                          │
│  ┌──────────────┐                        │
│  │ Blog Page    │                        │
│  │ 8 positions  │                        │
│  └──────────────┘                        │
│                                          │
│  No templates? Create one in Templates → │
└──────────────────────────────────────────┘
```

**Empty state:** "No templates available" + link to `/templates/new`.
**Loading:** "Loading templates..."

---

## Task 3.2: Replace Placeholder with Template Section

### What to Build

**File:** `apps/studio/src/pages/theme-editor.tsx` (MODIFY)

Replace the placeholder `FormSection` (lines 393-398) with the template-driven content area. This is the core of the phase.

**Two states:**

**State A — No template selected** (`template_id` is empty):
```tsx
<FormSection title="Page Layout">
  <TemplatePicker
    selectedId={watchedTemplateId}
    onSelect={handleTemplateSelect}
  />
</FormSection>
```

**State B — Template selected** (`template_id` is non-empty):
```tsx
<FormSection title="Page Layout">
  {/* Template info bar */}
  <div>
    Using template: <strong>{selectedTemplate?.name}</strong>
    ({filledCount} / {selectedTemplate?.max_positions} positions)
    <button onClick={handleChangeTemplate}>Change template</button>
  </div>
  
  {/* Position grid: merged view */}
  <PositionGrid
    maxPositions={selectedTemplate.max_positions}
    positions={mergedPositions}
    blocks={allBlocks}
    onAssignBlock={handleAssignFill}
    onRemoveBlock={handleRemoveFill}
    readonlyPositions={templateFilledPositions}
  />
</FormSection>
```

### New State & Logic (added to ThemeEditor component)

```typescript
// New imports
import { PositionGrid } from '../components/position-grid'
import { BlockPickerModal } from '../components/block-picker-modal'
import { TemplatePicker } from '../components/template-picker'
import { fetchTemplateById } from '../lib/template-api'
import { fetchAllBlocks } from '../lib/block-api'
import type { Block, Template, TemplatePosition, ThemeBlockFill } from '@cmsmasters/db'

// New state
const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
const [allBlocks, setAllBlocks] = useState<Block[]>([])
const [pickerOpen, setPickerOpen] = useState(false)
const [pickerPosition, setPickerPosition] = useState<number | null>(null)

// Watch template_id from form
const watchedTemplateId = useWatch({ control, name: 'template_id' })
const watchedBlockFills = useWatch({ control, name: 'block_fills' })

// Fetch blocks on mount (for position grid name lookup + block picker)
useEffect(() => {
  fetchAllBlocks().then(setAllBlocks).catch(() => {})
}, [])

// Fetch selected template whenever template_id changes
useEffect(() => {
  if (!watchedTemplateId) {
    setSelectedTemplate(null)
    return
  }
  fetchTemplateById(watchedTemplateId)
    .then(setSelectedTemplate)
    .catch(() => setSelectedTemplate(null))
}, [watchedTemplateId])
```

### Merged Positions Logic

The position grid needs to show a merged view: template-defined blocks (readonly) + theme block_fills (editable) + empty slots ("+").

```typescript
// Build merged positions array for PositionGrid
function getMergedPositions(): TemplatePosition[] {
  if (!selectedTemplate) return []
  
  const templateMap = new Map(
    selectedTemplate.positions.map((p) => [p.position, p.block_id])
  )
  const fillMap = new Map(
    (watchedBlockFills ?? []).map((f) => [f.position, f.block_id])
  )
  
  return Array.from({ length: selectedTemplate.max_positions }, (_, i) => {
    const pos = i + 1
    // Template-defined block takes priority
    const templateBlockId = templateMap.get(pos) ?? null
    if (templateBlockId) return { position: pos, block_id: templateBlockId }
    // Then theme fill
    const fillBlockId = fillMap.get(pos) ?? null
    return { position: pos, block_id: fillBlockId }
  })
}

// Positions where the template defines a block (readonly in grid)
function getReadonlyPositions(): number[] {
  if (!selectedTemplate) return []
  return selectedTemplate.positions
    .filter((p) => p.block_id)
    .map((p) => p.position)
}
```

### Template Selection Handler

```typescript
function handleTemplateSelect(templateId: string) {
  // If changing from one template to another, warn about block_fills reset
  if (watchedTemplateId && watchedTemplateId !== templateId) {
    const currentFills = form.getValues('block_fills')
    if (currentFills.length > 0) {
      const confirmed = globalThis.confirm(
        'Changing the template will remove all block fills for the current template. Continue?'
      )
      if (!confirmed) return
    }
  }
  
  form.setValue('template_id', templateId, { shouldDirty: true })
  form.setValue('block_fills', [], { shouldDirty: true })  // Reset fills on template change
}
```

### Block Fill Handlers (for "+" on empty positions)

```typescript
function handleAssignFill(pos: number) {
  // Don't allow assigning to template-defined positions
  if (getReadonlyPositions().includes(pos)) return
  setPickerPosition(pos)
  setPickerOpen(true)
}

function handleFillBlockSelected(block: Block) {
  if (pickerPosition === null) return
  const currentFills = form.getValues('block_fills') ?? []
  const filtered = currentFills.filter((f) => f.position !== pickerPosition)
  const newFills = [...filtered, { position: pickerPosition, block_id: block.id }]
  form.setValue('block_fills', newFills, { shouldDirty: true })
  setPickerOpen(false)
  setPickerPosition(null)
}

function handleRemoveFill(pos: number) {
  // Don't allow removing template-defined positions
  if (getReadonlyPositions().includes(pos)) return
  const currentFills = form.getValues('block_fills') ?? []
  const filtered = currentFills.filter((f) => f.position !== pos)
  form.setValue('block_fills', filtered, { shouldDirty: true })
}
```

### "Change Template" Handler

```typescript
function handleChangeTemplate() {
  // Set template_id to '' to show picker again
  // Warn if there are block_fills
  const currentFills = form.getValues('block_fills')
  if (currentFills.length > 0) {
    const confirmed = globalThis.confirm(
      'Removing the template will clear all block fills. Continue?'
    )
    if (!confirmed) return
  }
  form.setValue('template_id', '', { shouldDirty: true })
  form.setValue('block_fills', [], { shouldDirty: true })
  setSelectedTemplate(null)
}
```

### Integration

The new code lives entirely within `theme-editor.tsx`. The save pipeline doesn't change — `template_id` and `block_fills` are RHF fields that flow through `form.getValues()` → `formDataToThemeInsert()` → `upsertTheme()`.

**On edit load:** `themeRowToFormData(theme)` already maps `template_id` and `block_fills`. The `useEffect` watching `watchedTemplateId` will fire and fetch the selected template.

**On discard:** `reset(themeRowToFormData(existingTheme))` resets both fields. The template watcher re-fetches the template. But `selectedTemplate` in useState needs to also be reset. Handle this by making the `useEffect` that watches `watchedTemplateId` always re-fetch — it already does.

### JSX Changes

Replace lines 392-398 (the Content Blocks placeholder) with:

```tsx
{/* Page Layout — template picker or position grid */}
<FormSection title="Page Layout">
  {!watchedTemplateId ? (
    <TemplatePicker
      selectedId=""
      onSelect={handleTemplateSelect}
    />
  ) : selectedTemplate ? (
    <>
      {/* Template info bar */}
      <div className="flex items-center justify-between" style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        backgroundColor: 'hsl(var(--bg-surface-alt))',
        borderRadius: 'var(--rounded-lg)',
        border: '1px solid hsl(var(--border-default))',
      }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
          <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))', fontFamily: "'Manrope', sans-serif" }}>
            Using template:
          </span>
          <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))', fontFamily: "'Manrope', sans-serif" }}>
            {selectedTemplate.name}
          </span>
        </div>
        <button
          type="button"
          onClick={handleChangeTemplate}
          className="border-0 bg-transparent"
          style={{ color: 'hsl(var(--text-link))', fontSize: 'var(--text-sm-font-size)', fontFamily: "'Manrope', sans-serif", cursor: 'pointer', padding: 0 }}
        >
          Change
        </button>
      </div>
      
      {/* Position grid: merged template + theme fills */}
      <PositionGrid
        maxPositions={selectedTemplate.max_positions}
        positions={getMergedPositions()}
        blocks={allBlocks}
        onAssignBlock={handleAssignFill}
        onRemoveBlock={handleRemoveFill}
        readonlyPositions={getReadonlyPositions()}
      />
    </>
  ) : (
    <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
      Loading template...
    </p>
  )}
</FormSection>

{/* Block picker modal for fills */}
{pickerOpen && (
  <BlockPickerModal
    onSelect={handleFillBlockSelected}
    onClose={() => { setPickerOpen(false); setPickerPosition(null) }}
  />
)}
```

---

## Files to Modify

- `apps/studio/src/components/template-picker.tsx` — NEW: inline template selection component
- `apps/studio/src/pages/theme-editor.tsx` — MODIFY: replace placeholder with template picker + position grid + block fills

---

## Acceptance Criteria

- [ ] New theme: "Page Layout" section shows template picker (list of templates)
- [ ] Select template → picker replaced by template info bar + position grid
- [ ] Position grid shows template-defined blocks as readonly (no [×] button)
- [ ] Position grid shows empty slots with "+" for block fills
- [ ] Click "+" → block picker modal → select block → fill saved to `block_fills`
- [ ] Click [×] on a fill → fill removed from `block_fills`
- [ ] "Change" button → confirm if fills exist → resets template_id + block_fills → shows picker
- [ ] Save draft/publish → template_id + block_fills persisted to DB
- [ ] Reload page → template + fills restored correctly
- [ ] Discard → template + fills reset to last saved state
- [ ] Empty templates list → "No templates available" + link to create
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] No runtime errors in browser console
- [ ] Existing theme editor features (Basic Info, Links, SEO, sidebar, save/publish/delete) unaffected

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -10
echo "(expect 0 errors)"

# 2. New file exists
test -f apps/studio/src/components/template-picker.tsx && echo "✅ template-picker.tsx" || echo "❌ MISSING"

# 3. Placeholder removed
grep -c "coming in next update" apps/studio/src/pages/theme-editor.tsx
echo "(expect 0)"

# 4. Template imports in theme-editor
grep -c "TemplatePicker\|PositionGrid\|BlockPickerModal\|fetchTemplateById\|fetchAllBlocks" apps/studio/src/pages/theme-editor.tsx
echo "(expect 5+)"

# 5. Manual checks
echo "Manual: run 'npm run dev:studio' and verify:"
echo "  - /themes/new → Page Layout shows template picker"
echo "  - Select template → position grid appears with template blocks readonly"
echo "  - Click + on empty position → picker → block fill added"
echo "  - Save draft → reload → template + fills preserved"
echo "  - Change template → confirm → resets"
echo "  - Edit existing theme with template → loads correctly"
echo "  - Basic Info, Links, SEO, sidebar all still work"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-005c/phase-3-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005C Phase 3 — Theme Editor Pivot: Template Picker + Block Fills
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅/❌ |
| New file exists | ✅/❌ |
| Placeholder removed | ✅/❌ |
| Manual: template picker | ✅/❌ |
| Manual: position grid | ✅/❌ |
| Manual: block fills | ✅/❌ |
| Manual: change template | ✅/❌ |
| Manual: save + reload | ✅/❌ |
| Manual: existing features OK | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/src/components/template-picker.tsx \
  apps/studio/src/pages/theme-editor.tsx \
  logs/wp-005c/phase-3-result.md

git commit -m "feat: theme editor template picker + block fills [WP-005C phase 3]"
```

---

## IMPORTANT Notes for CC

- **RHF fields, not separate state.** Unlike template-editor (which uses `useState<TemplatePosition[]>` for positions), the theme editor manages `template_id` and `block_fills` as RHF form fields. Use `form.setValue(...)` and `useWatch(...)`. This keeps the save pipeline intact — no custom merge logic needed.
- **Do NOT touch the save functions.** `handleSaveDraft` and `handlePublish` already call `formDataToThemeInsert(data)` which maps `template_id` and `block_fills`. The mapper is already correct (line 70-71 of mappers.ts). Just populate the form fields correctly and saving works.
- **Do NOT touch EditorFooter or EditorSidebar.** They're unchanged.
- **Merged positions ≠ saved positions.** The PositionGrid gets a merged array (template blocks + fills). But `block_fills` in the form only stores the theme's additions — not the template positions. The merge is display-only.
- **readonlyPositions prevents editing template blocks.** Positions where the template defines a block can't be removed or reassigned by the theme. The PositionGrid already handles this via the `readonlyPositions` prop (hides [×] button).
- **Template fetch is by ID, not slug.** `fetchTemplateById(watchedTemplateId)` uses UUID. `template_id` in `ThemeFormData` is a UUID string (or `''` for none).
- **Confirm before template change.** If `block_fills` is non-empty, warn the user that changing/removing the template will clear fills.
- **Follow existing inline style patterns.** Same CSS custom properties, same Manrope font, same inputStyle/labelStyle patterns as the rest of theme-editor.tsx.
