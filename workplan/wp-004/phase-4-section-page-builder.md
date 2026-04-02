# WP-004 Phase 4: Studio Editor — Section-Based Page Builder

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 4 of 5
> Priority: P0
> Estimated: 2–3 hours
> Type: Frontend (Studio app)
> Previous: Phase 3 ✅ (All call sites migrated, ~30 path renames, 4 legacy form sections removed, builds clean)
> Next: Phase 5 (Documentation update)

---

## Context

Phase 3 left the editor with: Basic Info, Links, SEO + sidebar. The hero/features/plugins/custom-sections form sections were removed. This phase builds the section page builder — the core of the section-driven architecture.

```
CURRENT:  Editor shows: Basic Info, Links, SEO, Sidebar            ✅
CURRENT:  form.sections = getDefaultSections() (5 core sections)   ✅
CURRENT:  sections[] lives in form state but has no UI              ❌
MISSING:  useFieldArray({ name: 'sections' }) for sections list    ❌
MISSING:  Section list UI (collapsed/expanded, add/remove/reorder) ❌
MISSING:  Per-type section editors (core 5)                         ❌
MISSING:  JSON textarea for stub section types                      ❌
MISSING:  Add section picker (CORE_SECTION_TYPES)                   ❌
```

### Current editor layout (after Phase 3):

```
┌─────────────────────────────────────────────────────────────┐
│ Header: ← Themes / Theme Name              /themes/slug    │
├───────────────────────────────────────┬─────────────────────┤
│ Left column (flex-[2])                │ Right (320px)       │
│                                       │                     │
│ ┌─ Basic Info ──────────────────┐     │ ┌─ EditorSidebar ─┐│
│ │ Name, Slug, Tagline, Desc    │     │ │ Thumbnail        ││
│ └───────────────────────────────┘     │ │ Status           ││
│ ┌─ Links ───────────────────────┐     │ │ Category         ││
│ │ Demo URL, TF URL, TF ID      │     │ │ Price            ││
│ └───────────────────────────────┘     │ │ Rating           ││
│                                       │ │ Sales            ││
│ {SECTIONS GO HERE — Phase 4}         │ │ Trust Badges     ││
│                                       │ │ Compatible       ││
│ ┌─ SEO ─────────────────────────┐     │ │ Resources        ││
│ │ Title, Description            │     │ │ Meta             ││
│ └───────────────────────────────┘     │ └─────────────────┘│
├───────────────────────────────────────┴─────────────────────┤
│ Footer: Discard | Delete    Save Draft | Publish            │
└─────────────────────────────────────────────────────────────┘
```

### Target layout (after Phase 4):

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
├───────────────────────────────────────┬─────────────────────┤
│ Left column                           │ Right               │
│                                       │                     │
│ ┌─ Basic Info ──────────────────┐     │ ┌─ EditorSidebar ─┐│
│ └───────────────────────────────┘     │ │ (unchanged)      ││
│ ┌─ Links ───────────────────────┐     │ │                  ││
│ └───────────────────────────────┘     │ │                  ││
│                                       │ │                  ││
│ ┌─ Sections ────────────────────┐     │ │                  ││
│ │ ▼ Hero (expanded)             │     │ │                  ││
│ │   headline input              │     │ │                  ││
│ │   screenshots url list        │     │ │                  ││
│ │ ▸ Features (collapsed)    ↑↓× │     │ │                  ││
│ │ ▸ Plugins (collapsed)     ↑↓× │     │ │                  ││
│ │ ▸ Trust Strip (collapsed) ↑↓× │     │ │                  ││
│ │ ▸ Related (collapsed)     ↑↓× │     │ │                  ││
│ │ [+ Add Section]               │     │ │                  ││
│ └───────────────────────────────┘     │ │                  ││
│                                       │ │                  ││
│ ┌─ SEO ─────────────────────────┐     │ │                  ││
│ └───────────────────────────────┘     │ └─────────────────┘│
├───────────────────────────────────────┴─────────────────────┤
│ Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Verify sections are in form state (getDefaults)
grep -n "getDefaultSections\|sections" apps/studio/src/lib/form-defaults.ts

# 2. Verify current editor has NO section UI
grep -n "useFieldArray\|sections\." apps/studio/src/pages/theme-editor.tsx
# Expected: 0 matches (Phase 3 removed all)

# 3. Verify registry exports are available
grep -n "SECTION_REGISTRY\|SECTION_LABELS\|CORE_SECTION_TYPES\|getDefaultSections\|validateSectionData" packages/validators/src/index.ts

# 4. Read current theme-editor.tsx structure (understand what exists)
wc -l apps/studio/src/pages/theme-editor.tsx
# Expected: ~300 lines (down from ~650 pre-Phase 3)

# 5. Verify section data schemas are exported for typed editors
grep -n "ThemeHeroData\|FeatureGridData\|PluginComparisonData" packages/validators/src/index.ts
```

**Document findings before writing any code.**

---

## Task 4.1: Section List with useFieldArray

### What to Build

Add `useFieldArray({ control, name: 'sections' })` to `ThemeEditor`. Build a `SectionsList` component that renders the array with collapse/expand, reorder (up/down), remove, and an add picker.

**In theme-editor.tsx, add import and hook:**

```typescript
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import {
  SECTION_LABELS,
  CORE_SECTION_TYPES,
  SECTION_REGISTRY,
  type SectionRegistryEntry,
} from '@cmsmasters/validators'
import type { SectionType } from '@cmsmasters/db'
import { Plus, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

// In ThemeEditor():
const sectionsArray = useFieldArray({ control, name: 'sections' })
```

**Place the Sections block in JSX between Links and SEO:**

```tsx
{/* Section Builder */}
<SectionsList
  fields={sectionsArray.fields}
  control={control}
  register={register}
  onRemove={sectionsArray.remove}
  onSwap={sectionsArray.swap}
  onAppend={(type: SectionType) => {
    const entry = SECTION_REGISTRY[type]
    sectionsArray.append({ type, data: { ...entry.defaultData } })
  }}
/>
```

---

## Task 4.2: SectionsList Component

Create as an inline component in theme-editor.tsx (or extract to `apps/studio/src/components/sections-list.tsx` if it gets large).

### Behavior:

- Each section shows a **header row**: type label (from `SECTION_LABELS`), ↑/↓ buttons, × remove button
- Click header → toggles expand/collapse
- Expanded → shows per-type editor
- First section can't move up; last can't move down
- Remove shows confirm (`window.confirm`)
- Bottom: "+ Add Section" button → shows picker dropdown with `CORE_SECTION_TYPES`

### Structure:

```tsx
interface SectionsListProps {
  fields: Array<{ id: string; type: string; data: Record<string, unknown> }>
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
  onRemove: (index: number) => void
  onSwap: (a: number, b: number) => void
  onAppend: (type: SectionType) => void
}

function SectionsList({ fields, control, register, onRemove, onSwap, onAppend }: SectionsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div style={{ /* container styles */ }}>
      <div style={{ /* header */ }}>
        <span style={{ /* title: "Sections" */ }}>Sections ({fields.length})</span>
      </div>

      {fields.map((field, index) => (
        <div key={field.id}>
          {/* Section header: label + controls */}
          <div onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}>
            <span>{SECTION_LABELS[field.type as SectionType] ?? field.type}</span>
            <div>
              <button onClick={(e) => { e.stopPropagation(); index > 0 && onSwap(index, index - 1) }} disabled={index === 0}>
                <ChevronUp size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); index < fields.length - 1 && onSwap(index, index + 1) }} disabled={index === fields.length - 1}>
                <ChevronDown size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); window.confirm('Remove this section?') && onRemove(index) }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Section editor (expanded) */}
          {expandedIndex === index && (
            <SectionEditor
              index={index}
              type={field.type as SectionType}
              control={control}
              register={register}
            />
          )}
        </div>
      ))}

      {/* Add section picker */}
      <div>
        {showPicker ? (
          <div style={{ /* picker dropdown */ }}>
            {CORE_SECTION_TYPES.map((type) => (
              <button key={type} onClick={() => { onAppend(type); setShowPicker(false) }}>
                {SECTION_LABELS[type]}
              </button>
            ))}
            <button onClick={() => setShowPicker(false)}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowPicker(true)}>
            <Plus size={14} /> Add Section
          </button>
        )}
      </div>
    </div>
  )
}
```

### Styling:

Use the same design tokens as existing FormSection component:
- Container: `border: 1px solid hsl(var(--border-default))`, `border-radius: var(--rounded-xl)`, `background: hsl(var(--bg-surface))`
- Section headers: `padding: var(--spacing-md) var(--spacing-xl)`, border-bottom between sections
- Expanded editor area: `padding: 0 var(--spacing-xl) var(--spacing-xl)`
- Add button: dashed border style matching the old "Add Feature" button
- Controls (↑↓×): muted color, small (14px icons), visible on hover or always

---

## Task 4.3: SectionEditor — Per-Type Router

Dispatches to the right editor component based on `section.type`.

```tsx
interface SectionEditorProps {
  index: number
  type: SectionType
  control: Control<ThemeFormData>
  register: UseFormRegister<ThemeFormData>
}

function SectionEditor({ index, type, control, register }: SectionEditorProps) {
  switch (type) {
    case 'theme-hero':
      return <HeroEditor index={index} control={control} register={register} />
    case 'feature-grid':
      return <FeatureGridEditor index={index} control={control} register={register} />
    case 'plugin-comparison':
      return <PluginComparisonEditor index={index} control={control} register={register} />
    case 'trust-strip':
      return <TrustStripInfo />
    case 'related-themes':
      return <RelatedThemesEditor index={index} register={register} />
    default:
      return <StubEditor index={index} control={control} />
  }
}
```

---

## Task 4.4: Core Section Editors (5 components)

All section editors access their data via `sections.${index}.data.*` paths.

### HeroEditor

```tsx
function HeroEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const screenshots = useFieldArray({ control, name: `sections.${index}.data.screenshots` as any })

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      <Field label="Headline">
        <input
          {...register(`sections.${index}.data.headline`)}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="Override default hero text"
        />
      </Field>
      <Field label="Screenshots">
        <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
          {screenshots.fields.map((field, i) => (
            <div key={field.id} className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
              <input
                {...register(`sections.${index}.data.screenshots.${i}`)}
                className="flex-1 outline-none"
                style={inputStyle}
                placeholder="Screenshot URL"
              />
              <button type="button" onClick={() => screenshots.remove(i)} ...>
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => screenshots.append('')} ...>
            <Plus size={12} /> Add Screenshot
          </button>
        </div>
      </Field>
    </div>
  )
}
```

### FeatureGridEditor

```tsx
function FeatureGridEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const features = useFieldArray({ control, name: `sections.${index}.data.features` as any })

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      {features.fields.map((field, i) => (
        <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
          <input {...register(`sections.${index}.data.features.${i}.icon`)} className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="Icon" />
          <input {...register(`sections.${index}.data.features.${i}.title`)} className="flex-1 outline-none" style={inputStyle} placeholder="Title" />
          <input {...register(`sections.${index}.data.features.${i}.description`)} className="flex-[2] outline-none" style={inputStyle} placeholder="Description" />
          <button type="button" onClick={() => features.remove(i)} ...>
            <X size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => features.append({ icon: '', title: '', description: '' })} ...>
        <Plus size={14} /> Add Feature
      </button>
    </div>
  )
}
```

### PluginComparisonEditor

```tsx
function PluginComparisonEditor({ index, control, register }: { index: number; control: any; register: any }) {
  const plugins = useFieldArray({ control, name: `sections.${index}.data.included_plugins` as any })
  const watchedPlugins = useWatch({ control, name: `sections.${index}.data.included_plugins` }) ?? []
  const total = watchedPlugins.reduce((sum: number, p: any) => sum + (p?.value ?? 0), 0)

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      {plugins.fields.length > 0 && (
        <div className="flex" style={{ gap: 'var(--spacing-xs)', fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
          <span className="flex-1">NAME</span>
          <span className="flex-1">SLUG</span>
          <span style={{ width: '80px' }}>VALUE $</span>
          <span className="flex-1">ICON URL</span>
          <span style={{ width: '24px' }} />
        </div>
      )}
      {plugins.fields.map((field, i) => (
        <div key={field.id} className="flex items-start" style={{ gap: 'var(--spacing-xs)' }}>
          <input {...register(`sections.${index}.data.included_plugins.${i}.name`)} className="flex-1 outline-none" style={inputStyle} placeholder="Name" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.slug`)} className="flex-1 outline-none" style={inputStyle} placeholder="slug" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.value`, { setValueAs: nanToUndefined })} type="number" className="outline-none" style={{ ...inputStyle, width: '80px' }} placeholder="$" />
          <input {...register(`sections.${index}.data.included_plugins.${i}.icon_url`)} className="flex-1 outline-none" style={inputStyle} placeholder="Icon URL" />
          <button type="button" onClick={() => plugins.remove(i)} ...>
            <X size={16} />
          </button>
        </div>
      ))}
      {plugins.fields.length > 0 && (
        <div className="flex justify-end">
          <span style={{ fontSize: 'var(--text-sm-font-size)', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
            Total value: ${total}
          </span>
        </div>
      )}
      <button type="button" onClick={() => plugins.append({ name: '', slug: '', value: undefined, icon_url: '' })} ...>
        <Plus size={14} /> Add Plugin
      </button>
    </div>
  )
}
```

### TrustStripInfo

No editor — just a note:

```tsx
function TrustStripInfo() {
  return (
    <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', fontFamily: "'Manrope', sans-serif", margin: 0 }}>
      Trust strip renders from the Trust Badges field in the sidebar. No additional data needed.
    </p>
  )
}
```

### RelatedThemesEditor

```tsx
function RelatedThemesEditor({ index, register }: { index: number; register: any }) {
  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      <Field label="Category Override">
        <input
          {...register(`sections.${index}.data.category`)}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="Leave empty for same category"
        />
      </Field>
      <Field label="Limit">
        <input
          {...register(`sections.${index}.data.limit`, { setValueAs: nanToUndefined })}
          type="number"
          min={1}
          max={12}
          className="w-full outline-none"
          style={inputStyle}
          placeholder="4"
        />
      </Field>
    </div>
  )
}
```

---

## Task 4.5: Stub Section Editor (JSON textarea)

For any section type not in the core 5 switch cases. Shows a JSON textarea for the `data` field.

```tsx
function StubEditor({ index, control }: { index: number; control: any }) {
  const sectionData = useWatch({ control, name: `sections.${index}.data` })
  const [jsonText, setJsonText] = useState(() =>
    sectionData && Object.keys(sectionData).length > 0
      ? JSON.stringify(sectionData, null, 2)
      : '{}'
  )
  const [jsonError, setJsonError] = useState<string | null>(null)
  const { field } = useController({ control, name: `sections.${index}.data` as any })

  function handleBlur() {
    try {
      const parsed = JSON.parse(jsonText)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Must be a JSON object')
        return
      }
      field.onChange(parsed)
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
      <textarea
        rows={6}
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        onBlur={handleBlur}
        className="w-full resize-y outline-none"
        style={{
          ...inputStyle,
          height: 'auto',
          padding: 'var(--spacing-sm)',
          fontFamily: 'monospace',
          fontSize: 'var(--text-xs-font-size)',
          borderColor: jsonError ? 'hsl(var(--status-error-fg))' : undefined,
        }}
      />
      {jsonError && (
        <span style={errorStyle}>{jsonError}</span>
      )}
      <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
        JSON data for this section type. Full editor coming in a future update.
      </p>
    </div>
  )
}
```

**IMPORTANT:** `useController` needed here — import it alongside `useFieldArray`.

---

## Task 4.6: Wire Into Editor JSX

In theme-editor.tsx, insert the `SectionsList` between Links and SEO:

```tsx
{/* Section 2: Links */}
<FormSection title="Links">
  {/* ... existing ... */}
</FormSection>

{/* Section Builder */}
<SectionsList
  fields={sectionsArray.fields}
  control={control}
  register={register}
  onRemove={sectionsArray.remove}
  onSwap={sectionsArray.swap}
  onAppend={(type) => {
    const entry = SECTION_REGISTRY[type]
    sectionsArray.append({ type, data: { ...entry.defaultData } })
  }}
/>

{/* SEO */}
<FormSection title="SEO">
  {/* ... existing ... */}
</FormSection>
```

---

## File Organization

All section editor components can live in **theme-editor.tsx** as local components (below the main export). This keeps everything in one file, which is simpler for this phase. If the file exceeds ~600 lines, extract `SectionsList` and the editors to `apps/studio/src/components/section-editors.tsx`.

Components that go in the file:
- `SectionsList` (list + add picker)
- `SectionEditor` (type router)
- `HeroEditor`
- `FeatureGridEditor`
- `PluginComparisonEditor`
- `TrustStripInfo`
- `RelatedThemesEditor`
- `StubEditor`
- `Field` (already exists)

---

## Files to Modify

- `apps/studio/src/pages/theme-editor.tsx` — **major modify** (add useFieldArray, import registry, add SectionsList + 7 editor components, wire into JSX)

**NOT modified:**
- `apps/studio/src/components/editor-sidebar.tsx` — unchanged
- `apps/studio/src/components/form-section.tsx` — unchanged (SectionsList doesn't use it — it has its own container)
- `packages/validators/` — unchanged
- `packages/db/` — unchanged

---

## Acceptance Criteria

- [ ] `useFieldArray({ name: 'sections' })` powers the section list
- [ ] New theme opens with 5 default sections (hero, features, plugins, trust, related)
- [ ] Each section shows type label + collapse/expand toggle
- [ ] Sections can be reordered with ↑/↓ buttons
- [ ] Sections can be removed with × button (with confirm)
- [ ] "+ Add Section" shows picker with CORE_SECTION_TYPES, appends with default data
- [ ] HeroEditor: headline input + screenshot URL repeater (add/remove)
- [ ] FeatureGridEditor: feature repeater [{icon, title, description}] (add/remove)
- [ ] PluginComparisonEditor: plugin repeater [{name, slug, value, icon_url}] with total (add/remove)
- [ ] TrustStripInfo: displays info message (no editor)
- [ ] RelatedThemesEditor: category + limit inputs
- [ ] Non-core section types → StubEditor (JSON textarea with parse boundary)
- [ ] Save → sections[] persisted in correct order → reload → data + order preserved
- [ ] `npx tsc --noEmit` — no new errors (pre-existing auth errors OK)
- [ ] `npx nx build @cmsmasters/studio` — builds successfully

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 4 Verification ==="

# 1. Studio compiles
npx tsc --noEmit --project apps/studio/tsconfig.json 2>&1 | grep -v "@cmsmasters/auth\|@cmsmasters/api-client" | head -10
echo "(Expected: 0 NEW errors)"

# 2. Studio builds
npx nx build @cmsmasters/studio
echo "(Expected: success)"

# 3. useFieldArray present
grep -n "useFieldArray.*sections" apps/studio/src/pages/theme-editor.tsx
echo "(Expected: 1+ match)"

# 4. Registry imports present
grep -n "SECTION_REGISTRY\|SECTION_LABELS\|CORE_SECTION_TYPES" apps/studio/src/pages/theme-editor.tsx
echo "(Expected: imports + usage)"

# 5. Per-type editors present
grep -n "HeroEditor\|FeatureGridEditor\|PluginComparisonEditor\|TrustStripInfo\|RelatedThemesEditor\|StubEditor" apps/studio/src/pages/theme-editor.tsx
echo "(Expected: 6 component definitions + usage in SectionEditor switch)"

# 6. Section data paths use correct nesting
grep -n "sections\.\${index}\.data\." apps/studio/src/pages/theme-editor.tsx
echo "(Expected: multiple matches — register paths for section data fields)"

echo "=== Phase 4 Verification Complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-004/phase-4-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-004 Phase 4 — Section-Based Page Builder
> Epic: WP-004 Section-Driven Architecture Recovery
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
| `path` | modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions for Brain. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| tsc (no new errors) | ✅/❌ |
| nx build studio | ✅/❌ |
| useFieldArray sections | ✅/❌ |
| Registry imports | ✅/❌ |
| 6 editor components | ✅/❌ |
| Section data paths | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/ logs/wp-004/
git commit -m "feat: section-based page builder with 5 core editors [WP-004 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT change packages/db or packages/validators in this phase.** All contract work is done. This is pure Studio UI.
- **Do NOT change editor-sidebar.tsx, editor-footer.tsx, form-section.tsx, or any list page component.** Only theme-editor.tsx changes.
- **`useFieldArray` paths need `as any` cast** for dynamic section data paths like `sections.${index}.data.features`. react-hook-form can't statically type arbitrary nested paths inside `Record<string, unknown>`. This is expected and safe.
- **`useController` needed for StubEditor** — add to the import from 'react-hook-form'.
- **Keep Field helper component** — it's used by section editors for labels + error display.
- **Styling must match existing design** — use the same `inputStyle`, `labelStyle`, `errorStyle` constants. Dashed border for add buttons. Same spacing tokens. Manrope font.
- **Section expand/collapse state** — local `useState<number | null>`. Only one section expanded at a time (accordion pattern). First section expanded by default.
- **Add picker is a simple dropdown** — not a modal. Shows CORE_SECTION_TYPES labels. Click to append + close. "Cancel" to close without adding.
- **File size target: <700 lines.** If it goes over, extract `SectionsList` + editors to a separate file. Don't sacrifice readability for one-file purity.
- **nanToUndefined helper already exists** in the editor file — reuse for plugin value fields.
