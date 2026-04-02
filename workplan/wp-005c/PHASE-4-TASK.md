# WP-005C Phase 4: UX Polish

> Workplan: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Phase: 4 of 5
> Priority: P1
> Estimated: 1–2 hours
> Type: Frontend
> Previous: Phase 3 ✅ (Theme editor pivot: template picker + block fills, save/reload works)
> Next: Phase 5 (Documentation Update)

---

## Context

Phases 1–3 delivered all functional CRUD pages. However, several UX gaps remain:

1. **Theme editor delete** still uses raw `globalThis.confirm()` while block-editor and template-editor use the polished `DeleteConfirmModal`. Inconsistent.

2. **No responsive behavior.** All three editors and list pages assume desktop width. Sidebar never collapses. 2-column editor layout breaks on narrow screens. This matters for laptop users (≤1280px).

3. **Position grid has no visual distinction** between template-defined blocks (readonly) and theme fills (editable) in the merged view. Both look the same — only the missing [×] hints at readonly. A subtle visual cue would help.

4. **Template picker in theme editor fetches on every render.** If the user toggles between sections, it re-fetches. Should cache or fetch once.

5. **Block preview aspect ratio inconsistency.** List cards use 160px, picker uses 120px, editor preview modal is full-page. The list card preview can clip tall blocks. Not critical but worth a height audit.

```
CURRENT:  All CRUD pages functional with loading/empty/error states   ✅
CURRENT:  Toast feedback on all save/delete operations                 ✅
CURRENT:  Dependency warnings via 409 → toast                          ✅
CURRENT:  Skeletons on all list + editor pages                         ✅
MISSING:  Theme editor → DeleteConfirmModal (uses globalThis.confirm)  ❌
MISSING:  Responsive: sidebar + editor columns + list grid             ❌
MISSING:  Visual distinction for readonly positions in merged grid     ❌
MISSING:  Minor polish: template picker caching, preview heights       ❌
```

### What NOT to do in this phase

- No new features. No new pages. No new API calls.
- No refactoring of working code for "cleanliness."
- No component extraction beyond what's needed for the fixes.
- If responsive CSS gets complex, do the minimum: single-column stack below breakpoint. Sidebar collapse is out of scope (would require layout-level changes to app-layout.tsx).

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm theme-editor uses globalThis.confirm for delete
grep -n "globalThis.confirm\|window.confirm" apps/studio/src/pages/theme-editor.tsx

# 2. Check if block-editor still has inline DeleteConfirmModal or uses shared
grep -n "DeleteConfirmModal" apps/studio/src/pages/block-editor.tsx

# 3. Check current responsive state — any media queries or responsive classes?
grep -rn "@media\|md:\|lg:\|sm:" apps/studio/src/pages/ apps/studio/src/components/ --include="*.tsx" | head -20

# 4. Check position-grid for any readonly visual differentiation
grep -n "readonly\|readOnly\|locked\|template" apps/studio/src/components/position-grid.tsx

# 5. Check template-picker for caching behavior
grep -n "useEffect\|fetch" apps/studio/src/components/template-picker.tsx

# 6. Inventory BlockPreview usage heights
grep -rn "BlockPreview\|height=" apps/studio/src/ --include="*.tsx" | grep -i "preview\|height"
```

**Document your findings before writing any code.**

---

## Task 4.1: Theme Editor — Use DeleteConfirmModal

### What to Build

**File:** `apps/studio/src/pages/theme-editor.tsx` (MODIFY)

Replace the `globalThis.confirm()` in `handleDelete()` with the shared `DeleteConfirmModal`, matching how block-editor and template-editor do it.

**Changes:**

1. Import `DeleteConfirmModal`:
```typescript
import { DeleteConfirmModal } from '../components/delete-confirm-modal'
```

2. Add state:
```typescript
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
```

3. Split `handleDelete` into trigger + confirmed:
```typescript
// Replace the existing handleDelete:
function handleDelete() {
  setShowDeleteConfirm(true)
}

async function handleDeleteConfirmed() {
  if (!existingTheme) return
  setShowDeleteConfirm(false)
  setDeleting(true)
  try {
    await deleteTheme(existingTheme.id)
    // ... rest of existing delete logic (audit log, toast, navigate)
  } catch { ... }
  finally { setDeleting(false) }
}
```

4. Render modal in JSX (near the BlockPickerModal):
```tsx
{showDeleteConfirm && existingTheme && (
  <DeleteConfirmModal
    title="Delete theme"
    itemName={existingTheme.meta.name}
    onConfirm={handleDeleteConfirmed}
    onCancel={() => setShowDeleteConfirm(false)}
  />
)}
```

**AC:** Theme delete shows the same styled modal as blocks/templates. No more raw browser `confirm()`.

---

## Task 4.2: Responsive Basics

### What to Build

Minimal responsive adjustments so pages don't break on laptop screens (1024–1280px) or smaller windows. Not a full mobile redesign — just prevent overflow and layout breakage.

**File:** `apps/studio/src/pages/blocks-list.tsx` (MODIFY)
**File:** `apps/studio/src/pages/templates-list.tsx` (MODIFY)

Grid columns: change from fixed `repeat(3, 1fr)` to responsive:
```typescript
gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
```

This makes the grid naturally flow to 2 columns on narrower screens and 1 column on very narrow.

Apply to both the data grid AND the skeleton grid.

**File:** `apps/studio/src/pages/theme-editor.tsx` (MODIFY)
**File:** `apps/studio/src/pages/block-editor.tsx` (MODIFY)
**File:** `apps/studio/src/pages/template-editor.tsx` (MODIFY)

Editor body columns: the 2-column layout (form + sidebar) should stack on narrow screens.

For theme-editor (the only one with a right sidebar):
```typescript
// Body container: add flex-wrap or media query
<div className="flex flex-1 flex-col overflow-y-auto lg:flex-row" style={{ ... }}>
```

Wait — Tailwind `lg:` breakpoint utilities may not work with the inline style approach used throughout. Check if TW utility classes are applied anywhere in editors.

**Alternative approach (simpler):** Use CSS `@media` in a `<style>` tag within the component, or simply set `flex-wrap: wrap` on the body container so the sidebar wraps below the form on narrow screens:

```typescript
<div className="flex flex-1 overflow-y-auto" style={{ padding: '...', gap: '...', flexWrap: 'wrap' }}>
  <div className="flex min-w-0 flex-col" style={{ flex: '2 1 500px', gap: '...' }}>
    {/* form */}
  </div>
  <div style={{ flex: '0 0 320px' }}>
    {/* sidebar */}
  </div>
</div>
```

With `flex: '2 1 500px'` on the form and `flex: '0 0 320px'` on the sidebar, when the container is too narrow for both, the sidebar wraps below. This uses inline styles (consistent with existing patterns) and needs no Tailwind breakpoints.

For block-editor and template-editor (single column already, max-width 900px), no changes needed — they already handle narrow screens.

**AC:** List grids reflow to 2→1 columns on narrow windows. Theme editor sidebar wraps below form when viewport < ~900px.

---

## Task 4.3: Readonly Position Visual Cue

### What to Build

**File:** `apps/studio/src/components/position-grid.tsx` (MODIFY)

Add a subtle visual distinction for readonly positions (template-defined blocks that the theme can't remove):

- Filled + readonly: slightly different background color + a small lock icon or "(template)" label
- Filled + editable: normal background (current style)
- Empty: dashed border + "+" (current style, unchanged)

**Minimal change:**

```typescript
// For filled positions, add background + label when readonly
{block ? (
  <div
    className="flex flex-1 items-center justify-between"
    style={{
      padding: 'var(--spacing-xs) var(--spacing-sm) var(--spacing-xs) 0',
      backgroundColor: isReadonly ? 'hsl(var(--bg-surface-alt) / 0.5)' : 'transparent',
    }}
  >
    <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
      <span style={{ ... }}>{block.name}</span>
      {isReadonly && (
        <span style={{
          fontSize: '11px',
          color: 'hsl(var(--text-muted))',
          fontFamily: "'Manrope', sans-serif",
        }}>
          (template)
        </span>
      )}
    </div>
    {!isReadonly && (
      <button onClick={() => onRemoveBlock(pos)}>×</button>
    )}
  </div>
) : /* ... empty slot unchanged */}
```

**AC:** In theme editor's position grid, template-defined blocks show "(template)" label and subtle background tint. Theme fills show normally with [×].

---

## Task 4.4: Minor Polish Items

### What to Build

Small fixes batched together. Each is 1–5 lines.

**4.4a — Template picker: prevent re-fetch on re-render**

**File:** `apps/studio/src/components/template-picker.tsx` (MODIFY)

The current `useEffect` fetches on every mount. If the FormSection collapses/expands or the component re-mounts for any reason, it re-fetches. Add a simple check:

Actually — React's `useEffect(fn, [])` only runs on mount. If the component unmounts and remounts (e.g., FormSection collapse), it WILL re-fetch. This is acceptable for MVP since the fetch is fast and the template list is small. **Skip this optimization — not worth the complexity.**

**4.4b — Block preview height consistency**

**File:** `apps/studio/src/pages/blocks-list.tsx` (AUDIT ONLY)

Current heights:
- List cards: 160px
- Picker cards: 120px
- Editor preview modal: full viewport

These are intentional and reasonable. **No change needed.**

**4.4c — Dependency warning messaging**

Current state: API 409 errors are parsed into toast messages like "Block is used in templates" or "Template is used by themes". These already read well.

**Enhancement:** For delete, if the error is a dependency warning, show which templates/themes use it. The API returns `{ error, templates }` or `{ error, themes }` in the 409 response.

**File:** `apps/studio/src/lib/block-api.ts` (MODIFY)

```typescript
// In deleteBlockApi, enhance 409 handling:
if (res.status === 409) {
  const json = await res.json() as { error: string; templates?: Array<{ name: string }> }
  const names = json.templates?.map((t) => t.name).join(', ')
  throw new Error(names
    ? `Block is used in templates: ${names}`
    : json.error ?? 'Block is used in templates')
}
```

**File:** `apps/studio/src/lib/template-api.ts` (MODIFY)

Same pattern for template delete 409:
```typescript
if (res.status === 409) {
  const json = await res.json() as { error: string; themes?: Array<{ name: string }> }
  const names = json.themes?.map((t) => t.name).join(', ')
  throw new Error(names
    ? `Template is used by themes: ${names}`
    : json.error ?? 'Template is used by themes')
}
```

**AC:** Delete 409 toasts show which templates/themes reference the item.

**NOTE:** Check what the API actually returns in the 409 body. `apps/api/src/routes/blocks.ts` line 113: `c.json({ error: 'Block is used in templates', templates: usage })`. The `usage` variable comes from `getBlockUsage()` — check what shape it returns (array of template rows? just IDs?). If it doesn't include `name`, this enhancement won't work and should be skipped.

---

## Files to Modify

- `apps/studio/src/pages/theme-editor.tsx` — MODIFY: DeleteConfirmModal + responsive flex-wrap
- `apps/studio/src/pages/blocks-list.tsx` — MODIFY: responsive grid columns
- `apps/studio/src/pages/templates-list.tsx` — MODIFY: responsive grid columns
- `apps/studio/src/components/position-grid.tsx` — MODIFY: readonly visual cue
- `apps/studio/src/lib/block-api.ts` — MODIFY: enhanced 409 message (if API supports it)
- `apps/studio/src/lib/template-api.ts` — MODIFY: enhanced 409 message (if API supports it)

---

## Acceptance Criteria

- [ ] Theme delete uses `DeleteConfirmModal` (no more `globalThis.confirm`)
- [ ] Blocks list grid reflows on narrow viewport (2 col → 1 col)
- [ ] Templates list grid reflows on narrow viewport
- [ ] Theme editor sidebar wraps below form on narrow viewport
- [ ] Readonly positions in merged grid show "(template)" label
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] No runtime errors in browser console
- [ ] All existing functionality unchanged (regression check)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 4 Verification ==="

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -10
echo "(expect 0 errors)"

# 2. DeleteConfirmModal used in theme-editor
grep -c "DeleteConfirmModal" apps/studio/src/pages/theme-editor.tsx
echo "(expect 2+ — import + JSX)"

# 3. No more globalThis.confirm in theme-editor
grep -c "globalThis.confirm" apps/studio/src/pages/theme-editor.tsx
echo "(expect 0 for delete — may still exist for template change warns)"

# 4. Responsive grid in list pages
grep "auto-fill\|minmax" apps/studio/src/pages/blocks-list.tsx apps/studio/src/pages/templates-list.tsx
echo "(expect responsive grid template)"

# 5. Readonly label in position grid
grep "template" apps/studio/src/components/position-grid.tsx
echo "(expect readonly label)"

# 6. Manual checks
echo "Manual: run 'npm run dev:studio' and verify:"
echo "  - Resize window to ~1000px wide:"
echo "    - /blocks grid → 2 columns"
echo "    - /templates grid → 2 columns"
echo "    - /themes/:slug editor → sidebar wraps below form"
echo "  - /themes/:slug → delete theme → styled modal (not browser confirm)"
echo "  - /themes/:slug → position grid shows '(template)' on locked positions"
echo "  - All save/delete flows still work"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-005c/phase-4-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005C Phase 4 — UX Polish
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
| DeleteConfirmModal in theme-editor | ✅/❌ |
| Responsive grids | ✅/❌ |
| Responsive editor layout | ✅/❌ |
| Readonly position cue | ✅/❌ |
| Manual: all flows work | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add apps/studio/src/pages/theme-editor.tsx \
  apps/studio/src/pages/blocks-list.tsx \
  apps/studio/src/pages/templates-list.tsx \
  apps/studio/src/components/position-grid.tsx \
  apps/studio/src/lib/block-api.ts \
  apps/studio/src/lib/template-api.ts \
  logs/wp-005c/phase-4-result.md

git commit -m "fix: UX polish — delete modal, responsive grids, readonly cue [WP-005C phase 4]"
```

---

## IMPORTANT Notes for CC

- **This is polish, not features.** Every change should be small and surgical. If something takes more than 15 min to implement, it's too big for this phase — note it as future work and move on.
- **Do NOT restructure components.** No moving files, no extracting new shared components (beyond what's already done), no changing data flow.
- **Do NOT add new dependencies.** No CSS-in-JS, no Tailwind plugins, no new packages.
- **Responsive = inline style only.** The codebase uses inline styles with CSS custom properties. Don't introduce Tailwind breakpoint utilities (`md:`, `lg:`) or `@media` queries in `<style>` tags unless the inline approach truly can't handle it. `flex-wrap: wrap` with min-width flex basis is the preferred approach.
- **409 enhancement is conditional.** Check what `getBlockUsage()` / `getTemplateUsage()` actually return. If they don't include names, skip 4.4c — don't add new DB queries for this.
- **Template change warnings** in theme-editor still use `globalThis.confirm()` — that's acceptable. Only the DELETE action needs the styled modal. Template change is a less destructive action (data is just reset, not deleted).
- **Regression check is critical.** After all changes, manually test: create block, create template, create theme with template + fills, save, reload, delete. All must still work.
