# WP-005C Phase 1: Blocks Page — Library CRUD

> Workplan: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Phase: 1 of 5
> Priority: P0
> Estimated: 3–4 hours
> Type: Frontend
> Previous: Phase 0 ✅ (RECON — Studio routes, API patterns, UI inventory documented)
> Next: Phase 2 (Templates Page — Position Grid CRUD)

---

## Context

WP-005B delivered the blocks backend: `blocks` table in Supabase, 5 Hono CRUD endpoints (`GET/POST/PUT/DELETE /api/blocks`), Zod validators (`createBlockSchema`, `updateBlockSchema`), and DB query functions. Studio has no blocks UI at all.

```
CURRENT:  API — GET /api/blocks, GET /api/blocks/:id, POST, PUT, DELETE   ✅
CURRENT:  Validators — createBlockSchema, updateBlockSchema (Zod)          ✅
CURRENT:  Types — Block, BlockInsert, BlockUpdate, BlockHooks, BlockMetadata   ✅
CURRENT:  Studio — auth, sidebar (Themes + Media), theme editor, app-layout   ✅
CURRENT:  api-client — hc<AppType> type-safe RPC, lib/api.ts wrapper       ✅
MISSING:  Blocks list page (/blocks)   ❌
MISSING:  Block editor page (/blocks/new, /blocks/:id)   ❌
MISSING:  Block preview component (iframe srcdoc)   ❌
MISSING:  Sidebar "Blocks" nav item   ❌
MISSING:  Auth token helper for api-client calls   ❌
```

### Phase 0 Findings That Shape This Phase

1. **API fetch pattern:** Studio has `lib/api.ts` → `getApiClient(token)` using `hc<AppType>`. But themes still use direct Supabase. For blocks, we use the api-client since blocks CRUD goes through Hono (auth middleware + role checks).

2. **Token gap:** `getApiClient(token)` needs a JWT string. No helper exists to extract it from Supabase session. Task 1.1 adds `getAuthToken()`.

3. **UI components:** Only `Button` from `@cmsmasters/ui`. Everything else is Studio-local. We'll reuse `FormSection`, `useToast`, and follow the inline-style patterns from `themes-list.tsx` / `theme-editor.tsx`.

4. **List page pattern:** `themes-list.tsx` uses `useState` + `useEffect` fetch, `useMemo` filter/paginate, grid/table toggle, empty states, loading skeletons. Blocks list follows the same pattern (simpler — no table view, no status filter).

5. **Editor pattern:** `theme-editor.tsx` uses `react-hook-form` + `zodResolver`. Block editor follows the same pattern with `createBlockSchema`/`updateBlockSchema`.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm blocks API route file exists and exports are correct
cat apps/api/src/routes/blocks.ts | head -15

# 2. Confirm block validators exist
cat packages/validators/src/block.ts | head -10

# 3. Confirm Block type is exported from @cmsmasters/db
grep "Block" packages/db/src/types.ts | head -10

# 4. Confirm api-client works with current AppType
cat packages/api-client/src/client.ts

# 5. Check that no /blocks routes already exist in app.tsx
grep -n "block" apps/studio/src/app.tsx -i

# 6. Check sidebar.tsx for current nav items
cat apps/studio/src/components/sidebar.tsx | head -10
```

**Document your findings before writing any code.**

**IMPORTANT:** The Hono `hc` client generates methods from the route types. Since `blocks` routes use `.get('/blocks', ...)` etc., the client call pattern will be `client.api.blocks.$get()`, `client.api.blocks[':id'].$get({ param: { id } })`, etc. Verify this matches the actual route shape in `apps/api/src/routes/blocks.ts`.

**IMPORTANT:** Delete endpoint requires `admin` role (not `content_manager`). The UI delete button should be visible to both but the API will reject CM deletes. Handle the 403 gracefully.

---

## Task 1.1: Auth Token Helper + Block API Functions

### What to Build

**File:** `apps/studio/src/lib/auth.ts` (NEW)

Helper to extract JWT access token from the current Supabase session. Needed by all api-client calls.

```typescript
import { supabase } from './supabase'

/**
 * Get the current user's JWT access token.
 * Returns null if not authenticated (shouldn't happen — RequireAuth guards all pages).
 */
export async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}
```

**File:** `apps/studio/src/lib/blocks-api.ts` (NEW)

API functions for blocks CRUD using the type-safe Hono client.

```typescript
import type { Block } from '@cmsmasters/db'
import { getApiClient } from './api'
import { getAuthToken } from './auth'

async function authedClient() {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated')
  return getApiClient(token)
}

export async function fetchBlocks(): Promise<Block[]> {
  const client = await authedClient()
  const res = await client.api.blocks.$get()
  if (!res.ok) throw new Error('Failed to fetch blocks')
  const json = await res.json()
  return json.data
}

export async function fetchBlock(id: string): Promise<Block> {
  const client = await authedClient()
  const res = await client.api.blocks[':id'].$get({ param: { id } })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Block not found')
    throw new Error('Failed to fetch block')
  }
  const json = await res.json()
  return json.data
}

export async function createBlock(payload: {
  slug: string
  name: string
  html: string
  css?: string
  hooks?: Record<string, unknown>
  metadata?: Record<string, unknown>
}): Promise<Block> {
  const client = await authedClient()
  const res = await client.api.blocks.$post({ json: payload })
  if (!res.ok) {
    if (res.status === 409) {
      const err = await res.json()
      throw new Error(err.error ?? 'Slug already exists')
    }
    throw new Error('Failed to create block')
  }
  const json = await res.json()
  return json.data
}

export async function updateBlock(
  id: string,
  payload: {
    name?: string
    html?: string
    css?: string
    hooks?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
): Promise<Block> {
  const client = await authedClient()
  const res = await client.api.blocks[':id'].$put({ param: { id }, json: payload })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Block not found')
    throw new Error('Failed to update block')
  }
  const json = await res.json()
  return json.data
}

export async function deleteBlock(id: string): Promise<void> {
  const client = await authedClient()
  const res = await client.api.blocks[':id'].$delete({ param: { id } })
  if (!res.ok) {
    if (res.status === 409) {
      const err = await res.json()
      throw new Error(err.error ?? 'Block is used in templates')
    }
    if (res.status === 403) throw new Error('Admin role required to delete blocks')
    throw new Error('Failed to delete block')
  }
}
```

### Integration

`getAuthToken()` is reused by `blocks-api.ts` now and `templates-api.ts` in Phase 2. The `authedClient()` pattern avoids repeating token retrieval in every function.

**IMPORTANT:** The `hc` client method signatures depend on the actual Hono route types. If TypeScript complains about `client.api.blocks.$get()` not existing, it means the route types aren't flowing through correctly. In that case, fall back to raw `fetch()` calls against the same endpoints. **Try `hc` first**, fall back only if types don't resolve.

---

## Task 1.2: Block Preview Component

### What to Build

**File:** `apps/studio/src/components/block-preview.tsx` (NEW)

Sandboxed iframe that renders block HTML + CSS. Used in the blocks list (card thumbnails) and block editor (live preview).

```typescript
interface BlockPreviewProps {
  html: string
  css?: string
  height?: number  // px, default 300
  className?: string
}

export function BlockPreview({ html, css = '', height = 300, className }: BlockPreviewProps) {
  const srcdoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, sans-serif; overflow: hidden; }
        ${css}
      </style>
    </head>
    <body>${html}</body>
    </html>
  `

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-same-origin"
      title="Block preview"
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        border: '1px solid hsl(var(--border-default))',
        borderRadius: 'var(--rounded-lg)',
        backgroundColor: 'white',
        pointerEvents: 'none',  // prevent interaction in list/grid
      }}
    />
  )
}
```

**Props:**
- `html` + `css` — block content. If empty, iframe shows blank page.
- `height` — 300px for editor preview, 200px for grid cards, 80px for thumbnails in picker.
- `pointerEvents: 'none'` — blocks interaction when used as a card preview. Editor preview may override this via className.

**Security:** `sandbox="allow-same-origin"` prevents script execution. Only admin/CM can create blocks anyway. CSP = future hardening.

---

## Task 1.3: Blocks List Page

### What to Build

**File:** `apps/studio/src/pages/blocks-list.tsx` (NEW)

Grid page listing all blocks from the DB. Follows the `themes-list.tsx` pattern: fetch → filter → paginate → grid.

**Structure:**

```
┌──────────────────────────────────────────────┐
│  Blocks                         [Add Block]  │  ← header
├──────────────────────────────────────────────┤
│  [Search blocks...]                          │  ← search bar
├──────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│  │ preview  │ │ preview  │ │ preview  │     │  ← 3-col grid
│  │ name     │ │ name     │ │ name     │     │
│  │ slug     │ │ slug     │ │ slug     │     │
│  │ [Edit]   │ │ [Edit]   │ │ [Edit]   │     │
│  └──────────┘ └──────────┘ └──────────┘     │
├──────────────────────────────────────────────┤
│  < 1 2 3 >                                   │  ← pagination
└──────────────────────────────────────────────┘
```

**Key details:**

- Fetch: `fetchBlocks()` from `lib/blocks-api.ts` in `useEffect`
- Search: text filter on `name` (same pattern as themes-list)
- Cards: block name, slug (muted), iframe preview (200px height), Edit button
- Delete: `confirm()` dialog. On 409 (used in templates), show toast with error.
- Empty state: icon + "No blocks yet" + "Create your first block" + CTA button
- Loading: skeleton grid (same pattern as themes-list)
- Pagination: reuse `<Pagination />` component, 12 items per page

**Styling:** Follow themes-list.tsx patterns exactly — inline styles with CSS custom properties, Manrope font, spacing tokens.

### Integration

Imported and route-registered in `app.tsx` (Task 1.5).

---

## Task 1.4: Block Editor Page

### What to Build

**File:** `apps/studio/src/pages/block-editor.tsx` (NEW)

Form page for creating and editing blocks. Used at `/blocks/new` (create) and `/blocks/:id` (edit).

**Structure:**

```
┌──────────────────────────────────────────────────────────┐
│  ← Blocks / New Block                                    │  ← header breadcrumb
├──────────────────────────────────────────────────────────┤
│  ┌─── Left Column (form) ──────────┐  ┌─── Right ────┐  │
│  │                                  │  │              │  │
│  │  [Basic Info]                    │  │  Live        │  │
│  │    Name: [___________]           │  │  Preview     │  │
│  │    Slug: [___________]           │  │              │  │
│  │                                  │  │  (iframe)    │  │
│  │  [HTML]                          │  │              │  │
│  │    ┌──────────────────────┐      │  │  300px       │  │
│  │    │ <div class="hero">  │      │  │  height      │  │
│  │    │   ...                │      │  │              │  │
│  │    └──────────────────────┘      │  │              │  │
│  │                                  │  └──────────────┘  │
│  │  [CSS]                           │                    │
│  │    ┌──────────────────────┐      │                    │
│  │    │ .hero { ... }        │      │                    │
│  │    └──────────────────────┘      │                    │
│  │                                  │                    │
│  │  [Hooks]                         │                    │
│  │    Price: [x] selector: [___]    │                    │
│  │    Links: [+ Add link hook]      │                    │
│  │                                  │                    │
│  │  [Metadata]                      │                    │
│  │    Alt: [___________]            │                    │
│  │    Figma node: [___________]     │                    │
│  │                                  │                    │
│  └──────────────────────────────────┘                    │
├──────────────────────────────────────────────────────────┤
│  [Discard]                        [Save]                 │  ← footer
└──────────────────────────────────────────────────────────┘
```

**Form setup:**

- `react-hook-form` with manual validation (or `zodResolver(createBlockSchema)` for create)
- On edit: fetch block by ID, populate form via `reset()`
- Slug: auto-generated from name on create (same `nameToSlug` from `lib/form-defaults.ts`), readonly on edit
- HTML textarea: large (12+ rows), monospace font (`font-family: 'Courier New', monospace`)
- CSS textarea: large (8+ rows), monospace font
- Live preview: `<BlockPreview html={watchedHtml} css={watchedCss} />` — updates as user types (use `useWatch`)

**Hooks config:**

```typescript
// Price hook: simple toggle + selector
// If enabled, show selector input
<Field label="Price Hook">
  <div>
    <input type="checkbox" /> Enable price hook
    {priceEnabled && <input placeholder="CSS selector, e.g. .price" />}
  </div>
</Field>

// Link hooks: repeater
// Each row: selector + field name + optional label
// [+ Add link hook] button adds a row
<Field label="Link Hooks">
  {links.map((link, i) => (
    <div key={i}>
      <input placeholder="CSS selector" />
      <input placeholder="Field name" />
      <input placeholder="Label (optional)" />
      <button onClick={() => removeLink(i)}>×</button>
    </div>
  ))}
  <button onClick={addLink}>+ Add link hook</button>
</Field>
```

Use `useFieldArray` from react-hook-form for the links repeater, or simple `useState` array (simpler for MVP).

**Save flow:**

```typescript
async function handleSave() {
  const data = form.getValues()
  setSaving(true)
  try {
    if (isNew) {
      const saved = await createBlock({
        slug: data.slug,
        name: data.name,
        html: data.html,
        css: data.css,
        hooks: buildHooksPayload(data),
        metadata: { alt: data.alt, figma_node: data.figma_node },
      })
      navigate(`/blocks/${saved.id}`, { replace: true })
      toast({ type: 'success', message: 'Block created' })
    } else {
      const saved = await updateBlock(id, {
        name: data.name,
        html: data.html,
        css: data.css,
        hooks: buildHooksPayload(data),
        metadata: { alt: data.alt, figma_node: data.figma_node },
      })
      setExistingBlock(saved)
      reset(blockToFormData(saved))
      toast({ type: 'success', message: 'Block saved' })
    }
  } catch (error) {
    toast({ type: 'error', message: error instanceof Error ? error.message : 'Save failed' })
  } finally {
    setSaving(false)
  }
}
```

**Data mapping helpers** (local to this file or in a small helper):

```typescript
// Block row → form data (for populating form on edit)
function blockToFormData(block: Block) {
  return {
    name: block.name,
    slug: block.slug,
    html: block.html,
    css: block.css,
    priceEnabled: !!block.hooks?.price,
    priceSelector: block.hooks?.price?.selector ?? '',
    links: block.hooks?.links ?? [],
    alt: block.metadata?.alt ?? '',
    figma_node: block.metadata?.figma_node ?? '',
  }
}

// Form data → API payload (for save)
function buildHooksPayload(data: FormData): BlockHooks {
  const hooks: BlockHooks = {}
  if (data.priceEnabled && data.priceSelector) {
    hooks.price = { selector: data.priceSelector }
  }
  if (data.links?.length > 0) {
    hooks.links = data.links.filter(l => l.selector && l.field)
  }
  return hooks
}
```

**Layout:** 2-column like theme-editor. Left = form. Right = preview (sticky top). Footer = Discard + Save buttons. Reuse `<EditorFooter>` if its props are compatible, otherwise build a simpler footer.

**IMPORTANT:** The editor header should have a back link to `/blocks` (same breadcrumb pattern as theme-editor's "← Themes / Theme Name").

### Integration

Imported and route-registered in `app.tsx` (Task 1.5).

---

## Task 1.5: Routes + Sidebar Registration

### What to Build

**File:** `apps/studio/src/app.tsx` (MODIFY)

Add routes for blocks pages inside the ProtectedRoute layout:

```typescript
// EXISTING:
import { ThemesList } from './pages/themes-list'
import { ThemeEditor } from './pages/theme-editor'
import { MediaPage } from './pages/media'

// ADD:
import { BlocksList } from './pages/blocks-list'
import { BlockEditor } from './pages/block-editor'

// INSIDE <Route element={<ProtectedRoute>...}>:
// ADD AFTER: <Route path="/media" element={<MediaPage />} />
<Route path="/blocks" element={<BlocksList />} />
<Route path="/blocks/new" element={<BlockEditor />} />
<Route path="/blocks/:id" element={<BlockEditor />} />
```

**File:** `apps/studio/src/components/sidebar.tsx` (MODIFY)

Add Blocks nav item:

```typescript
import { LayoutGrid, Image, Blocks, HelpCircle, LogOut } from 'lucide-react'
//                                 ^^^^^^ or use 'Box' / 'Component' if Blocks icon doesn't exist in lucide

const navItems = [
  { to: '/', label: 'Themes', icon: LayoutGrid },
  { to: '/blocks', label: 'Blocks', icon: Blocks },  // ADD
  { to: '/media', label: 'Media', icon: Image },
]
```

**IMPORTANT:** Check if `Blocks` icon exists in lucide-react. If not, use `Box` or `Component` as the icon. Run: `grep "Blocks" node_modules/lucide-react/dist/esm/icons/` or just try importing and see if tsc complains.

---

## Files to Modify

- `apps/studio/src/lib/auth.ts` — NEW: `getAuthToken()` helper
- `apps/studio/src/lib/blocks-api.ts` — NEW: blocks CRUD functions via api-client
- `apps/studio/src/components/block-preview.tsx` — NEW: sandboxed iframe preview
- `apps/studio/src/pages/blocks-list.tsx` — NEW: blocks grid page
- `apps/studio/src/pages/block-editor.tsx` — NEW: block create/edit form with live preview
- `apps/studio/src/app.tsx` — MODIFY: add 3 block routes
- `apps/studio/src/components/sidebar.tsx` — MODIFY: add Blocks nav item

---

## Acceptance Criteria

- [ ] `/blocks` shows grid of blocks from DB with name + live iframe preview
- [ ] `/blocks` shows empty state when 0 blocks ("No blocks yet" + CTA)
- [ ] `/blocks` search filters blocks by name
- [ ] `/blocks/new` creates block with name, slug, HTML, CSS, hooks, metadata
- [ ] `/blocks/new` shows live preview updating as HTML/CSS is typed
- [ ] `/blocks/new` → Save → navigates to `/blocks/:id`
- [ ] `/blocks/:id` loads existing block and populates form
- [ ] `/blocks/:id` → Save → block updated, form re-synced
- [ ] Delete block → confirm dialog → block removed (or 409 toast if used in templates)
- [ ] Slug auto-generated from name on create, readonly on edit
- [ ] Sidebar shows Blocks nav item between Themes and Media
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] No runtime errors in browser console on `/blocks`, `/blocks/new`, `/blocks/:id`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -10
echo "(expect 0 errors)"

# 2. New files exist
for f in \
  apps/studio/src/lib/auth.ts \
  apps/studio/src/lib/blocks-api.ts \
  apps/studio/src/components/block-preview.tsx \
  apps/studio/src/pages/blocks-list.tsx \
  apps/studio/src/pages/block-editor.tsx; do
  test -f "$f" && echo "✅ $f" || echo "❌ MISSING $f"
done

# 3. Routes registered
grep -n "blocks" apps/studio/src/app.tsx
echo "(expect 3 route lines + 2 imports)"

# 4. Sidebar updated
grep -n "Blocks" apps/studio/src/components/sidebar.tsx
echo "(expect nav item)"

# 5. No console errors — start dev server and check manually
echo "Manual check: run 'npm run dev:studio' and navigate to /blocks, /blocks/new"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-005c/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005C Phase 1 — Blocks Page: Library CRUD
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
| Manual browser test | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/studio/src/lib/auth.ts \
  apps/studio/src/lib/blocks-api.ts \
  apps/studio/src/components/block-preview.tsx \
  apps/studio/src/pages/blocks-list.tsx \
  apps/studio/src/pages/block-editor.tsx \
  apps/studio/src/app.tsx \
  apps/studio/src/components/sidebar.tsx \
  logs/wp-005c/phase-1-result.md

git commit -m "feat: blocks library page with CRUD, preview, and editor [WP-005C phase 1]"
```

---

## IMPORTANT Notes for CC

- **hc client types:** The `hc<AppType>` client generates methods from route types. If `client.api.blocks.$get()` doesn't resolve in TypeScript, the types may not flow through the monorepo path alias. In that case, **fall back to raw `fetch()`** calls: `fetch(\`${apiUrl}/api/blocks\`, { headers: { Authorization: \`Bearer ${token}\` } })`. Don't spend >15 min debugging type resolution — raw fetch is fine for MVP.
- **Do NOT touch theme-editor.tsx** in this phase. The "Content Blocks" placeholder stays. Phase 3 replaces it.
- **Do NOT create template API functions** in this phase. That's Phase 2.
- **Delete is admin-only** on the API side (`requireRole('admin')`). The UI can show delete buttons to all CMs, but handle 403 gracefully with a toast.
- **Hooks config is optional.** If the hooks UI (price toggle, links repeater) is getting complex, implement a simplified version: a single JSON textarea for hooks. Pretty UI can come in Phase 4 (UX Polish). The critical path is: name + slug + HTML + CSS + save + preview.
- **Follow existing patterns.** Copy style patterns from `themes-list.tsx` and `theme-editor.tsx`. Same inline styles, same CSS custom properties, same Manrope font. Don't invent new patterns.
- **Block ID in route, not slug.** Unlike themes (which use slug in URL), blocks use UUID `id` in the editor route: `/blocks/:id`. The API uses ID for all operations. Slug is display-only after creation.
