# WP-005C Phase 2: Templates Page — Position Grid CRUD

> Workplan: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Phase: 2 of 5
> Priority: P0
> Estimated: 3–4 hours
> Type: Frontend
> Previous: Phase 1 ✅ (Blocks page: list + editor + preview + CRUD via raw fetch + auth fix)
> Next: Phase 3 (Theme Editor Pivot — Template Picker + Block Fills)

---

## Context

Phase 1 delivered the Blocks library: grid list, editor with unified code field, preview modal, and CRUD via raw `fetch` to the Hono API. Auth was fixed (ES256 key rotation → `supabase.auth.getUser(token)`).

Now we need the Templates page — where CM creates position grids that define page layouts. Templates are ordered lists of positions (1–N), each optionally pointing at a block from the library. Themes (Phase 3) will reference a template and fill its empty positions.

```
CURRENT:  API — GET/POST/PUT/DELETE /api/templates (5 endpoints)          ✅
CURRENT:  Validators — createTemplateSchema, updateTemplateSchema          ✅
CURRENT:  Types — Template, TemplatePosition { position, block_id }        ✅
CURRENT:  Blocks page — full CRUD, preview, list, editor                   ✅
CURRENT:  Auth — supabase.auth.getUser(token), raw fetch pattern           ✅
MISSING:  Templates list page (/templates)   ❌
MISSING:  Template editor page (/templates/new, /templates/:id)   ❌
MISSING:  Block picker modal (select block from library for a position)   ❌
MISSING:  Position grid component (visual numbered slot list)   ❌
MISSING:  Sidebar "Templates" nav item   ❌
```

### Phase 1 Patterns to Follow (CRITICAL — match these exactly)

1. **API transport:** Raw `fetch` with `authHeaders()` — NOT hc typed client. Copy the pattern from `apps/studio/src/lib/block-api.ts` exactly: `getAuthToken()` → `authHeaders()` → `fetch(url, { headers })` → parse `{ data }` response.

2. **List page pattern:** `blocks-list.tsx` = `useState` + `useEffect` fetch, `useMemo` filter, `Pagination` component, skeleton grid, empty state with icon + CTA, "no matches" state with clear button.

3. **Editor pattern:** `block-editor.tsx` = `react-hook-form`, `useWatch` for live updates, `FormSection` for card groups, breadcrumb header ("← Templates / Template Name"), footer with Discard + Save + Delete, custom `DeleteConfirmModal`, `useToast` for feedback.

4. **Naming:** API file = `template-api.ts` (singular, matching `block-api.ts`). Pages = `templates-list.tsx`, `template-editor.tsx`.

5. **Inline styles:** Same CSS custom properties, same Manrope font, same `inputStyle`/`labelStyle`/`errorStyle` pattern. No new CSS files.

6. **File imports:** `import type { Template } from '@cmsmasters/db'`, `import { Button } from '@cmsmasters/ui'`, `import { FormSection } from '../components/form-section'`, etc.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm templates API route matches expected shape
head -30 apps/api/src/routes/templates.ts

# 2. Confirm Template type shape (positions array)
grep -A 15 "templates:" packages/db/src/types.ts | head -20

# 3. Confirm template validators
cat packages/validators/src/template.ts

# 4. Confirm block-api.ts pattern exists (to copy for template-api.ts)
head -20 apps/studio/src/lib/block-api.ts

# 5. Confirm no /templates routes exist yet
grep -n "template" apps/studio/src/app.tsx -i

# 6. Confirm sidebar current state
grep "navItems" apps/studio/src/components/sidebar.tsx -A 5

# 7. Check what blocks are in DB (needed for block picker)
# (manual: navigate to /blocks in browser — how many blocks exist?)
```

**Document your findings before writing any code.**

**IMPORTANT:** The `positions` array in the DB uses `TemplatePosition[]` = `{ position: number, block_id: string | null }[]`. The API returns this directly. When building the position grid UI, the source of truth is this array — positions can have gaps (e.g., position 1, 3, 5 if 2 and 4 were removed). The grid should display `max_positions` slots, merging with the `positions` array to show which slots are filled.

**IMPORTANT:** Delete endpoint requires `admin` role (not `content_manager`). Same as blocks — handle 403 gracefully.

---

## Task 2.1: Template API Functions

### What to Build

**File:** `apps/studio/src/lib/template-api.ts` (NEW)

Copy the exact pattern from `block-api.ts`. Same `getAuthToken()` import, same `authHeaders()`, same `parseError()` — but import these from `block-api.ts` or duplicate them (duplication is fine for MVP, extraction = Phase 4).

Actually — `getAuthToken()` and `authHeaders()` are not exported from `block-api.ts`. Either:
- **(A) Export them** from `block-api.ts` and import in `template-api.ts`
- **(B) Duplicate** them in `template-api.ts`

**Choose (A)** — add `export` to `getAuthToken` and `authHeaders` in `block-api.ts`, then import in `template-api.ts`. This avoids code duplication without creating a new file.

```typescript
// apps/studio/src/lib/template-api.ts

import type { Template } from '@cmsmasters/db'
import { authHeaders, parseError } from './block-api'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function fetchAllTemplates(): Promise<Template[]> {
  const res = await fetch(`${apiUrl}/api/templates`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch templates')
  const json = await res.json() as { data: Template[] }
  return json.data
}

export async function fetchTemplateById(id: string): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, { headers: await authHeaders() })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Template not found')
    throw new Error('Failed to fetch template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function createTemplateApi(payload: {
  slug: string
  name: string
  description?: string
  positions?: Array<{ position: number; block_id: string | null }>
  max_positions?: number
}): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Slug already exists'))
    if (res.status === 400) throw new Error(await parseError(res, 'Validation failed'))
    throw new Error('Failed to create template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function updateTemplateApi(
  id: string,
  payload: {
    name?: string
    description?: string
    positions?: Array<{ position: number; block_id: string | null }>
    max_positions?: number
  }
): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Template not found')
    throw new Error('Failed to update template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function deleteTemplateApi(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Template is used by themes'))
    if (res.status === 403) throw new Error('Admin role required to delete templates')
    throw new Error('Failed to delete template')
  }
}
```

### Integration

Modify `block-api.ts`: add `export` keyword to `getAuthToken`, `authHeaders`, and `parseError` functions. No other changes to that file.

---

## Task 2.2: Block Picker Modal

### What to Build

**File:** `apps/studio/src/components/block-picker-modal.tsx` (NEW)

Modal overlay that shows all blocks from the library. User picks one → modal returns the selected block. Used by the position grid (Task 2.3) and later by the theme editor (Phase 3).

**Structure:**

```
┌─────────────────────────────────────────────────┐
│  Select a Block                          [×]    │
├─────────────────────────────────────────────────┤
│  [Search blocks...]                              │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ preview  │ │ preview  │ │ preview  │        │
│  │ name     │ │ name     │ │ name     │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                      │
│  │ preview  │ │ preview  │                      │
│  │ name     │ │ name     │                      │
│  └──────────┘ └──────────┘                      │
└─────────────────────────────────────────────────┘
```

**Props:**

```typescript
interface BlockPickerModalProps {
  onSelect: (block: Block) => void  // returns full Block object (caller extracts id)
  onClose: () => void
  excludeIds?: string[]  // optional: hide blocks already assigned to positions
}
```

**Key details:**

- Fetches blocks from `fetchAllBlocks()` on mount (same function blocks-list uses)
- Search filter on name/slug (text input, same pattern as blocks-list search)
- Grid of block cards: `BlockPreview` (height 120px) + name below
- Click card → `onSelect(block)` → modal closes
- Escape key → `onClose()`
- Backdrop click → `onClose()`
- Style: same modal pattern as `PreviewModal` in `block-editor.tsx` — fixed inset overlay, centered container, dark backdrop

**Size:** Max-width 800px, max-height 80vh, overflow-y scroll for the grid.

**Empty state:** If 0 blocks exist, show message: "No blocks in library. Create blocks first." with a link/button to `/blocks/new`.

**Loading:** Simple "Loading blocks..." text or small spinner while fetching.

---

## Task 2.3: Position Grid Component

### What to Build

**File:** `apps/studio/src/components/position-grid.tsx` (NEW)

Visual vertical list of numbered position slots. Each slot is either filled (shows a block) or empty (shows a "+" button). This component is used by:
- Template editor (Task 2.5) — CM assigns blocks to positions
- Theme editor (Phase 3) — CM fills empty positions left by the template

**Props:**

```typescript
interface PositionGridProps {
  maxPositions: number
  positions: Array<{ position: number; block_id: string | null }>
  blocks: Block[]  // all blocks from DB (for name/preview lookup)
  onAssignBlock: (position: number) => void   // triggers block picker
  onRemoveBlock: (position: number) => void   // clears a position
  readonlyPositions?: number[]  // positions that can't be changed (Phase 3: template-defined blocks)
}
```

**Visual design:**

```
┌─────────────────────────────────────────────┐
│  1  │ [Block preview mini] Hero Banner  [×] │  ← filled
├─────────────────────────────────────────────┤
│  2  │ [Block preview mini] CTA Section  [×] │  ← filled
├─────────────────────────────────────────────┤
│  3  │          [+ Add block]                 │  ← empty
├─────────────────────────────────────────────┤
│  4  │          [+ Add block]                 │  ← empty
├─────────────────────────────────────────────┤
│  5  │ [Block preview mini] FAQ          [×] │  ← filled
└─────────────────────────────────────────────┘
```

**Key details:**

- Renders `maxPositions` rows, numbered 1 through `maxPositions`
- Each row looks up its position in the `positions` array by `position` number
- If `block_id` is non-null, look up the block in `blocks` array by ID:
  - Show: position number, `BlockPreview` (height 60px, width ~120px), block name, [×] remove button
  - If the position is in `readonlyPositions`, hide the [×] button (it's template-defined, not removable)
- If `block_id` is null or position not in array:
  - Show: position number, dashed border area with "+" icon and "Add block" text
  - Click → calls `onAssignBlock(positionNumber)`
- Position number label: left column, fixed width (~40px), centered vertically, muted color

**Row styling:** Each row is a horizontal flex container. Border between rows. First and last rows have rounded corners matching the card. Filled rows have subtle bg-surface background. Empty rows have dashed border.

---

## Task 2.4: Templates List Page

### What to Build

**File:** `apps/studio/src/pages/templates-list.tsx` (NEW)

Grid/list page showing all templates. Follows `blocks-list.tsx` pattern exactly.

**Structure:**

```
┌──────────────────────────────────────────────────┐
│  Templates                    [Create Template]  │
│  N templates                                     │
├──────────────────────────────────────────────────┤
│  [Search templates...]                           │
├──────────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐       │
│  │  Template Name    │ │  Template Name    │      │
│  │  slug-here        │ │  slug-here        │      │
│  │  5/10 positions   │ │  3/8 positions    │      │
│  │  Used by 3 themes │ │  Used by 0 themes │      │
│  │  Updated 2h ago   │ │  Updated 1d ago   │      │
│  └──────────────────┘ └──────────────────┘       │
├──────────────────────────────────────────────────┤
│  < 1 2 >                                         │
└──────────────────────────────────────────────────┘
```

**Key details:**

- Fetch: `fetchAllTemplates()` from `template-api.ts`
- Search: filter by name
- Cards: template name, slug (muted), positions summary ("N/M positions filled"), updated timestamp
- Click card → navigate to `/templates/:id`
- Empty state: icon + "No templates yet" + CTA
- Skeleton, error state, pagination — same patterns as `blocks-list.tsx`

**Card differences from blocks-list:**
- No iframe preview (templates don't have HTML — they're position grids)
- Instead, show a compact visual: colored dots or a mini position indicator
  - Simple approach: "N / M positions" text (filled count / max_positions)
  - Optional: row of small circles — filled = primary color, empty = muted/dashed

**Grid:** 2 columns (templates have more text info than blocks), or 3 columns — match blocks-list's 3-col grid for consistency.

**Pagination:** reuse `<Pagination itemLabel="templates" />`

---

## Task 2.5: Template Editor Page

### What to Build

**File:** `apps/studio/src/pages/template-editor.tsx` (NEW)

Form page for creating and editing templates. Used at `/templates/new` (create) and `/templates/:id` (edit).

**Structure:**

```
┌──────────────────────────────────────────────────────────┐
│  ← Templates / New Template                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Basic Info]                                            │
│    Name: [___________]                                   │
│    Slug: [___________]  (auto from name, readonly edit)  │
│    Description: [___________]                            │
│    Max Positions: [20]                                   │
│                                                          │
│  [Position Grid]                                         │
│    ┌─────────────────────────────────────────┐           │
│    │  1  │ [Block preview] Hero Banner  [×]  │           │
│    │  2  │        [+ Add block]              │           │
│    │  3  │        [+ Add block]              │           │
│    │  ...                                    │           │
│    │  20 │        [+ Add block]              │           │
│    └─────────────────────────────────────────┘           │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [Unsaved changes]              [Delete]       [Save]    │
└──────────────────────────────────────────────────────────┘
```

**Form setup:**

- `react-hook-form` for basic fields (name, slug, description, max_positions)
- Positions managed via local state (`useState<TemplatePosition[]>`) synced with form dirty state
- When `max_positions` changes, the position grid re-renders with the new slot count
- Slug auto-generated from name on create (use `nameToSlug` from `lib/form-defaults.ts`), readonly on edit

**Position grid integration:**

- On mount (edit mode): fetch template → populate form + set positions state
- `onAssignBlock(pos)` → open `BlockPickerModal` → on select, update positions array (set `block_id` for that position)
- `onRemoveBlock(pos)` → set `block_id` to `null` for that position
- Need to fetch all blocks once (for the grid component's block name/preview lookup + for the picker)

**Data flow on save:**

```typescript
const payload = {
  name: data.name,
  slug: isNew ? data.slug : undefined,  // slug only on create
  description: data.description,
  positions: positions,  // TemplatePosition[] from state
  max_positions: data.max_positions,
}
if (isNew) {
  const saved = await createTemplateApi({ slug: data.slug, ...payload })
  navigate(`/templates/${saved.id}`, { replace: true })
} else {
  const saved = await updateTemplateApi(id, payload)
  // reset form + state
}
```

**Delete:** Same `DeleteConfirmModal` pattern as block-editor. Copy the component or extract a shared one. On 409 (used by themes), show toast with error.

**Layout:** Single column (no sidebar). Max-width ~900px same as block-editor. Header breadcrumb, footer with save/delete/discard.

**IMPORTANT:** When `max_positions` is reduced below the current number of filled positions, warn the user — positions beyond the new max will be dropped. Simple approach: just truncate silently (positions array only contains entries ≤ max_positions). Better approach: show a warning toast.

---

## Task 2.6: Routes + Sidebar Registration

### What to Build

**File:** `apps/studio/src/app.tsx` (MODIFY)

Add imports and routes:

```typescript
import { TemplatesList } from './pages/templates-list'
import { TemplateEditor } from './pages/template-editor'

// Inside ProtectedRoute layout, after blocks routes:
<Route path="/templates" element={<TemplatesList />} />
<Route path="/templates/new" element={<TemplateEditor />} />
<Route path="/templates/:id" element={<TemplateEditor />} />
```

**File:** `apps/studio/src/components/sidebar.tsx` (MODIFY)

Add Templates nav item. Use `LayoutTemplate` or `Layers` icon from lucide-react:

```typescript
import { LayoutGrid, Boxes, LayoutTemplate, Image, HelpCircle, LogOut } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Themes', icon: LayoutGrid },
  { to: '/blocks', label: 'Blocks', icon: Boxes },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },  // ADD
  { to: '/media', label: 'Media', icon: Image },
]
```

**IMPORTANT:** Verify `LayoutTemplate` exists in lucide-react. If not, use `Layers`, `Grid3X3`, or `TableProperties`. Import and try — tsc will catch missing icons.

---

## Files to Modify

- `apps/studio/src/lib/block-api.ts` — MODIFY: export `getAuthToken`, `authHeaders`, `parseError`
- `apps/studio/src/lib/template-api.ts` — NEW: 5 template CRUD functions
- `apps/studio/src/components/block-picker-modal.tsx` — NEW: block selection modal
- `apps/studio/src/components/position-grid.tsx` — NEW: numbered position slot list
- `apps/studio/src/pages/templates-list.tsx` — NEW: templates grid page
- `apps/studio/src/pages/template-editor.tsx` — NEW: template editor with position grid
- `apps/studio/src/app.tsx` — MODIFY: add 3 template routes + 2 imports
- `apps/studio/src/components/sidebar.tsx` — MODIFY: add Templates nav item

---

## Acceptance Criteria

- [ ] `/templates` shows list of templates from DB with name, slug, position count, updated time
- [ ] `/templates` shows empty state when 0 templates ("No templates yet" + CTA)
- [ ] `/templates` search filters templates by name
- [ ] `/templates/new` creates template with name, slug, description, max_positions
- [ ] `/templates/new` position grid shows `max_positions` numbered slots
- [ ] Click "+" on empty position → block picker modal opens → select block → position filled
- [ ] Click [×] on filled position → block removed from that position
- [ ] Block picker modal shows all blocks with preview + search
- [ ] `/templates/:id` loads existing template and populates form + position grid
- [ ] Save → template created/updated with correct positions array
- [ ] Delete → confirmation modal → template removed (or 409 toast if used by themes)
- [ ] Sidebar shows Templates nav item between Blocks and Media
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] No runtime errors in browser console

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -10
echo "(expect 0 errors)"

# 2. New files exist
for f in \
  apps/studio/src/lib/template-api.ts \
  apps/studio/src/components/block-picker-modal.tsx \
  apps/studio/src/components/position-grid.tsx \
  apps/studio/src/pages/templates-list.tsx \
  apps/studio/src/pages/template-editor.tsx; do
  test -f "$f" && echo "✅ $f" || echo "❌ MISSING $f"
done

# 3. block-api.ts exports auth helpers
grep "export.*authHeaders\|export.*getAuthToken\|export.*parseError" apps/studio/src/lib/block-api.ts
echo "(expect 3 exports)"

# 4. Routes registered
grep -n "template" apps/studio/src/app.tsx -i
echo "(expect 3 route lines + 2 imports)"

# 5. Sidebar updated
grep -n "Templates" apps/studio/src/components/sidebar.tsx
echo "(expect nav item)"

# 6. Manual checks
echo "Manual: run 'npm run dev:studio' and verify:"
echo "  - /templates shows empty state or template list"
echo "  - /templates/new → fill form → add blocks to positions → Save"
echo "  - /templates/:id loads existing template"
echo "  - Block picker modal opens, shows blocks, select works"
echo "  - Delete with confirmation"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-005c/phase-2-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005C Phase 2 — Templates Page: Position Grid CRUD
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
| New files exist | ✅/❌ |
| Routes registered | ✅/❌ |
| Sidebar updated | ✅/❌ |
| Manual: create template | ✅/❌ |
| Manual: block picker | ✅/❌ |
| Manual: position grid | ✅/❌ |
| Manual: edit template | ✅/❌ |
| Manual: delete template | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/src/lib/block-api.ts \
  apps/studio/src/lib/template-api.ts \
  apps/studio/src/components/block-picker-modal.tsx \
  apps/studio/src/components/position-grid.tsx \
  apps/studio/src/pages/templates-list.tsx \
  apps/studio/src/pages/template-editor.tsx \
  apps/studio/src/app.tsx \
  apps/studio/src/components/sidebar.tsx \
  logs/wp-005c/phase-2-result.md

git commit -m "feat: templates page with position grid CRUD and block picker [WP-005C phase 2]"
```

---

## IMPORTANT Notes for CC

- **Copy Phase 1 patterns exactly.** block-api.ts → template-api.ts. blocks-list.tsx → templates-list.tsx. block-editor.tsx → template-editor.tsx. Same inline styles, same state management, same error handling. Don't reinvent.
- **Raw fetch, not hc client.** Phase 1 confirmed hc types don't resolve in Studio. Use the same raw fetch pattern.
- **Export auth helpers from block-api.ts.** Don't duplicate `getAuthToken` / `authHeaders` / `parseError`. Just add `export` to the existing functions and import them in template-api.ts.
- **Block picker loads blocks fresh.** Don't try to share state between the template editor and the block picker. The picker calls `fetchAllBlocks()` on its own mount. Simple > clever.
- **Position grid is a controlled component.** It receives positions + blocks as props and calls callbacks. It does NOT manage its own state or fetch data. The template editor owns the state.
- **Template ID in URL, not slug.** Same as blocks — `/templates/:id` uses UUID.
- **Delete confirm modal.** Either copy the `DeleteConfirmModal` from block-editor.tsx verbatim (acceptable duplication for 2 files) or extract to a shared component in `components/`. Either is fine — don't over-engineer.
- **max_positions governs grid rows.** If template has `max_positions: 10`, the grid shows 10 rows. The `positions` array may have fewer entries — empty positions just show "+".
- **Do NOT touch theme-editor.tsx.** That's Phase 3.
