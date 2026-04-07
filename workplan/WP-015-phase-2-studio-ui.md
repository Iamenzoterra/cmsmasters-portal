# WP-015 Phase 2: Studio UI — Tag Input + Sidebar

> Workplan: WP-015 Use Cases Taxonomy
> Phase: 2 of 4
> Priority: P1
> Estimated: 1.5-2 hours
> Type: Frontend
> Previous: Phase 1 ✅ (DB migration + typed queries + exports)
> Next: Phase 3 (Portal rendering + SEO)
> Affected domains: studio-core

---

## Context

```
CURRENT:  use_cases + theme_use_cases tables in Supabase                        ✅
CURRENT:  @cmsmasters/db exports CRUD + searchUseCases + junction queries        ✅
CURRENT:  EditorSidebar has sections: Thumbnail → Status → Categories → Tags → Price → Meta  ✅
CURRENT:  TaxonomyPickerModal used for categories/tags/prices (checkbox modal)   ✅
CURRENT:  theme-editor.tsx uses useState + useEffect fetch pattern per taxonomy  ✅
MISSING:  TagInput component (inline autocomplete, WordPress-style)              ❌
MISSING:  "Perfect For" section in EditorSidebar                                 ❌
MISSING:  Use cases state + fetch + save in theme-editor.tsx                     ❌
```

This phase creates a WordPress-style tag-input component with inline autocomplete and a
delete popover ("Remove from theme" vs "Delete everywhere"), then integrates it into the
theme editor sidebar.

---

## Domain Context

**studio-core:**
- Key invariants: EditorSidebar props are fully typed; all editors use react-hook-form + zod
- Known traps: all editors duplicate inputStyle/labelStyle inline objects; block-api.ts exports shared authHeaders/parseError
- Public API: none — internal to Studio
- Blast radius: editor-sidebar.tsx used only by theme-editor.tsx (safe)

**Reuse from existing code:**
- `nameToSlug()` from `apps/studio/src/lib/form-defaults.ts` — for auto-generating slugs from use case names
- `labelStyle` constant in editor-sidebar.tsx — for section header styling
- `createUseCase`, `deleteUseCase`, `searchUseCases`, `getUseCases`, `getThemeUseCases`, `setThemeUseCases` from `@cmsmasters/db`
- Design tokens from `packages/ui/src/theme/tokens.css` — chip colors, input styles

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skill
cat .claude/skills/domains/studio-core/SKILL.md

# 2. Check EditorSidebar current props and layout
head -50 apps/studio/src/components/editor-sidebar.tsx

# 3. Verify use-cases queries are available
grep "UseCase\|use-cases" packages/db/src/index.ts

# 4. Check existing chip/pill styling in sidebar (for consistency)
grep -n "borderRadius.*9999\|tag-active" apps/studio/src/components/editor-sidebar.tsx

# 5. Baseline test
npm run arch-test
```

**Document your findings before writing any code.**

**IMPORTANT:** The TagInput component is the ONLY new UI pattern in this WP. It differs from TaxonomyPickerModal:
- Inline (not modal) — text field with dropdown, chips below/above
- Create-on-type — if no match, Enter creates a new use_case
- Delete popover on X — two options: "Remove from theme" or "Delete everywhere"
Follow existing sidebar styling exactly (tokens, font sizes, spacing).

---

## Task 2.1: Create `apps/studio/src/components/tag-input.tsx`

### What to Build

A reusable tag-input component with autocomplete and delete popover.

```typescript
interface TagInputProps {
  /** All available items (for initial dropdown / fallback) */
  items: Array<{ id: string; name: string; slug: string }>
  /** Currently selected item IDs */
  selectedIds: string[]
  /** Called when selection changes (add/remove) */
  onChange: (ids: string[]) => void
  /** Called to search items by query (debounced ILIKE) */
  onSearch: (query: string) => Promise<Array<{ id: string; name: string; slug: string }>>
  /** Called to create a new item from typed text */
  onCreate: (name: string) => Promise<{ id: string; name: string; slug: string }>
  /** Called to permanently delete an item */
  onDelete: (id: string) => Promise<void>
  /** Placeholder text for input */
  placeholder?: string
}
```

**Behavior:**

1. **Text input** — standard input styled like existing sidebar inputs (tokens)
2. **Typing** — debounced (300ms) calls `onSearch(query)` → shows dropdown list below input
3. **Dropdown** — positioned below input, shows matching items. Already-selected items shown dimmed/disabled. If no match: show "Create '{typed text}'" option at bottom.
4. **Select from dropdown** — click or Enter on highlighted item → adds ID to `selectedIds`, clears input, closes dropdown
5. **Create new** — clicking "Create '{text}'" calls `onCreate(name)` → gets back new item → adds to `selectedIds`
6. **Chips** — displayed below input, each chip shows name + X button
7. **X click on chip → popover** with two options:
   - **"Remove from this theme"** — removes ID from `selectedIds` via `onChange`
   - **"Delete everywhere"** — calls `onDelete(id)` then removes from `selectedIds`
   - Popover dismisses on click outside or Escape
8. **Keyboard** — ArrowDown/Up to navigate dropdown, Enter to select, Escape to close dropdown

**Styling (use design tokens, NO hardcoded values):**

```
Input:
  height: 36px (or var(--spacing-2xl) if available)
  backgroundColor: hsl(var(--input))
  border: 1px solid hsl(var(--border))
  borderRadius: var(--rounded-lg)
  fontSize: var(--text-sm-font-size)
  color: hsl(var(--foreground))
  padding: 0 var(--spacing-sm)

Chips (same as existing tag pills in sidebar):
  backgroundColor: hsl(var(--bg-surface-alt))
  color: hsl(var(--text-secondary))
  borderRadius: 9999px
  padding: 2px 8px
  fontSize: 11px
  fontWeight: var(--font-weight-medium)

Dropdown:
  backgroundColor: hsl(var(--bg-surface))
  border: 1px solid hsl(var(--border-default))
  borderRadius: var(--rounded-lg)
  boxShadow: var(--shadow-md)
  maxHeight: 200px, overflow-y: auto
  Each item: padding var(--spacing-xs) var(--spacing-sm), hover bg hsl(var(--bg-surface-alt))

Delete popover:
  backgroundColor: hsl(var(--bg-surface))
  border: 1px solid hsl(var(--border-default))
  borderRadius: var(--rounded-lg)
  boxShadow: var(--shadow-md)
  Two buttons stacked vertically, full width
  "Delete everywhere" in hsl(var(--status-error-fg)) color
```

### Domain Rules
- Use tokens from tokens.css — zero hardcoded colors/fonts/shadows
- Match existing sidebar pill styling (see Categories/Tags chips in editor-sidebar.tsx)
- Component is generic/reusable — all entity operations passed as callbacks

---

## Task 2.2: Integrate into EditorSidebar

### What to Build

Add "Perfect For" section to `apps/studio/src/components/editor-sidebar.tsx`.

**New props to add to `EditorSidebarProps`:**

```typescript
allUseCases: Array<{ id: string; name: string; slug: string }>
selectedUseCaseIds: string[]
onUseCasesChange: (ids: string[]) => void
onUseCaseSearch: (query: string) => Promise<Array<{ id: string; name: string; slug: string }>>
onUseCaseCreate: (name: string) => Promise<{ id: string; name: string; slug: string }>
onUseCaseDelete: (id: string) => Promise<void>
```

**Position:** Insert new section between Tags and Price sections.

```tsx
{/* Perfect For */}
<div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
  <span style={labelStyle}>Perfect For</span>
  <TagInput
    items={allUseCases}
    selectedIds={selectedUseCaseIds}
    onChange={onUseCasesChange}
    onSearch={onUseCaseSearch}
    onCreate={onUseCaseCreate}
    onDelete={onUseCaseDelete}
    placeholder="Type to add..."
  />
</div>
```

### Integration

Insert AFTER the Tags section (after line ~167 `{/* Tag picker modal */}` block) and BEFORE
the `{/* Price */}` section (line ~192).

---

## Task 2.3: Wire up in theme-editor.tsx

### What to Build

Follow the existing tags/categories pattern exactly.

**New imports:**

```typescript
import { getUseCases, getThemeUseCases, setThemeUseCases, searchUseCases, createUseCase, deleteUseCase } from '@cmsmasters/db'
import type { UseCase } from '@cmsmasters/db'
```

**New state (alongside existing allTags/selectedTags on ~line 60):**

```typescript
const [allUseCases, setAllUseCases] = useState<UseCase[]>([])
const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<string[]>([])
```

**Fetch on mount (add to existing useEffect on ~line 76-80):**

```typescript
getUseCases(supabase).then(setAllUseCases).catch(() => {})
```

**Fetch on theme load (add inside the fetchThemeBySlug .then block, ~line 116-127):**

```typescript
getThemeUseCases(supabase, theme.id).then((ucs) => {
  if (!cancelled) setSelectedUseCaseIds(ucs.map((uc: any) => uc.id))
})
```

**Reset on new theme (add to isNew reset block, ~line 84-98):**

```typescript
setSelectedUseCaseIds([])
```

**Save in both handlers (handleSaveDraft ~line 222-226, handlePublish ~line 289-293):**

Add `setThemeUseCases(supabase, saved.id, selectedUseCaseIds)` to the existing `Promise.all`.

**Callback handlers for TagInput (define before return):**

```typescript
async function handleUseCaseSearch(query: string) {
  return searchUseCases(supabase, query)
}

async function handleUseCaseCreate(name: string) {
  const slug = nameToSlug(name)
  const created = await createUseCase(supabase, { name, slug })
  setAllUseCases((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
  return created
}

async function handleUseCaseDelete(id: string) {
  await deleteUseCase(supabase, id)
  setAllUseCases((prev) => prev.filter((uc) => uc.id !== id))
}
```

**Pass to EditorSidebar (add to <EditorSidebar> props on ~line 742-760):**

```tsx
allUseCases={allUseCases}
selectedUseCaseIds={selectedUseCaseIds}
onUseCasesChange={setSelectedUseCaseIds}
onUseCaseSearch={handleUseCaseSearch}
onUseCaseCreate={handleUseCaseCreate}
onUseCaseDelete={handleUseCaseDelete}
```

---

## Task 2.4: Update domain-manifest.ts

Add `tag-input.tsx` to studio-core owned_files:

```
'apps/studio/src/components/tag-input.tsx',
```

---

## Files to Modify

- `apps/studio/src/components/tag-input.tsx` — **NEW** — TagInput component
- `apps/studio/src/components/editor-sidebar.tsx` — add "Perfect For" section + new props
- `apps/studio/src/pages/theme-editor.tsx` — state + fetch + save + callbacks for use cases
- `src/__arch__/domain-manifest.ts` — add tag-input.tsx to studio-core owned_files

---

## Acceptance Criteria

- [ ] TagInput component renders: text input, autocomplete dropdown, chips, delete popover
- [ ] Typing in input triggers debounced search → dropdown with matching use cases
- [ ] Selecting from dropdown adds chip, clears input
- [ ] Typing non-existing text + Enter creates new use case via `createUseCase`
- [ ] X on chip shows popover: "Remove from this theme" vs "Delete everywhere"
- [ ] "Remove from this theme" removes junction only (chip disappears)
- [ ] "Delete everywhere" calls `deleteUseCase` (removes from all themes)
- [ ] EditorSidebar shows "Perfect For" section between Tags and Price
- [ ] Theme save (draft + publish) persists use case junctions via `setThemeUseCases`
- [ ] Loading existing theme populates selected use cases from DB
- [ ] Creating new theme → navigating away → coming back resets use cases state
- [ ] All styling uses design tokens (zero hardcoded colors/fonts/shadows)
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] `tag-input.tsx` registered in `domain-manifest.ts`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 2 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. TypeScript check (Studio app)
npx tsc --noEmit -p apps/studio/tsconfig.json 2>&1 | tail -10
echo "(expect: no errors)"

# 3. Verify new file registered
grep "tag-input" src/__arch__/domain-manifest.ts
echo "(expect: match found)"

echo "=== Verification complete ==="

# 4. Manual testing:
# - Open Studio → theme editor
# - Find "Perfect For" section in sidebar (between Tags and Price)
# - Type in input → see autocomplete dropdown
# - Select item → chip appears
# - Type new text → "Create 'xxx'" option → creates + adds chip
# - Click X on chip → popover with 2 options
# - "Remove from this theme" → chip disappears
# - "Delete everywhere" → chip disappears, item gone from autocomplete
# - Save theme → reload → use cases persist
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-015/phase-2-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-015 Phase 2 — Studio UI
> Epic: Use Cases Taxonomy
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: studio-core

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
| arch-test | ✅/❌ ({N} tests) |
| tsc --noEmit | ✅/❌ |
| Manual UI test | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add apps/studio/src/components/tag-input.tsx apps/studio/src/components/editor-sidebar.tsx apps/studio/src/pages/theme-editor.tsx src/__arch__/domain-manifest.ts logs/wp-015/phase-2-result.md
git commit -m "feat(studio): use cases tag-input with autocomplete + delete popover [WP-015 phase 2]"
```

---

## IMPORTANT Notes for CC

- **Read domain skill FIRST** — `.claude/skills/domains/studio-core/SKILL.md`
- **TagInput is generic** — callbacks for search/create/delete, not hardcoded to use_cases. Could be reused for tags later.
- **Delete popover must not be a browser confirm()** — it's a styled popover/dropdown with two button options
- **Follow existing chip styling** — look at tag/category pills in editor-sidebar.tsx (lines ~140-165)
- **Both save paths** — handleSaveDraft AND handlePublish must include `setThemeUseCases` in their Promise.all
- **nameToSlug** already exists in `apps/studio/src/lib/form-defaults.ts` — import and reuse, do NOT duplicate
- **Run `npm run arch-test` before committing**
- **Do NOT touch Portal code** — that's Phase 3
