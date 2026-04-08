# WP-017 Phase 1: SVG Icon Library for Theme Editor

> Workplan: WP-017 SVG Icon Library
> Phase: 1 of 2
> Priority: P1
> Estimated: 4 hours
> Type: Full-stack
> Previous: N/A (new workplan)
> Next: Phase 2 (Media page overhaul — replace stub with full icon management UI)
> Affected domains: app-api, studio-core

---

## Context

Studio's theme editor lets content managers build theme pages with blocks, categories, tags, prices, and use cases. Currently there is **no way to attach SVG icons** to a theme — icons that would appear on the portal page (e.g. feature icons in blocks, category badges, etc.).

The Media page (`apps/studio/src/pages/media.tsx`) is a stub showing "coming soon". Instead of building a full media manager, we scope this to a **focused SVG icon library** stored in R2 with category folders.

```
CURRENT:  R2 bucket `cmsmasters-assets` stores block images under `blocks/` prefix   ✅
CURRENT:  Upload API supports single file + batch upload (SVG mime accepted)          ✅
CURRENT:  Media page is a stub with placeholder UI                                    ✅
MISSING:  API to list icons from R2 by category                                       ❌
MISSING:  API to upload SVG with category + human-readable filename                   ❌
MISSING:  API to delete an icon                                                       ❌
MISSING:  Icon picker component in Studio theme editor                                ❌
MISSING:  `meta.icon_url` field on ThemeMeta type                                     ❌
```

R2 storage layout:
```
cmsmasters-assets/
  blocks/          ← existing (thumbnails, block images)
  icons/           ← NEW
    social/
      facebook.svg
      twitter.svg
    features/
      speed.svg
      security.svg
    general/
      arrow-right.svg
```

---

## Domain Context

**app-api:**
- Hono on Cloudflare Workers, routes in `apps/api/src/routes/`
- R2 bucket bound as `ASSETS_BUCKET` in `env.ts`
- Public URL: `R2_PUBLIC_URL` env var
- Auth: `authMiddleware` + `requireRole('content_manager', 'admin')`
- Existing upload route: `apps/api/src/routes/upload.ts` — uses SHA-256 hash for keys, stores in `blocks/` prefix
- Blast radius: Studio and portal consume these URLs

**studio-core:**
- React SPA (Vite), routes in `apps/studio/src/pages/`
- Theme editor sidebar: `apps/studio/src/components/editor-sidebar.tsx`
- API client: `apps/studio/src/lib/block-api.ts` — `uploadFile()`, `uploadImageBatch()`
- Form: react-hook-form with Zod validation (`@cmsmasters/validators`)
- ThemeMeta type: `packages/db/src/types.ts` line 3
- Blast radius: changes to ThemeMeta affect validators, portal rendering

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline (ALWAYS — do not skip)
npm run arch-test

# 1. Read domain skills for affected areas
cat .claude/skills/domains/app-api/SKILL.md
cat .claude/skills/domains/studio-core/SKILL.md

# 2. Verify R2 bucket binding works
cat apps/api/wrangler.toml | head -20

# 3. Check existing upload route structure
cat apps/api/src/routes/upload.ts

# 4. Check ThemeMeta type
cat packages/db/src/types.ts | head -25

# 5. Check validator schema
cat packages/validators/src/theme.ts

# 6. Check editor sidebar integration point
cat apps/studio/src/components/editor-sidebar.tsx | head -60

# 7. Verify current test state
npm run arch-test
```

**Document your findings before writing any code.**

**IMPORTANT:** The existing upload route uses SHA-256 hash as filename (`blocks/{hash}.svg`). For icons we want **human-readable names** (`icons/{category}/{slug}.svg`) so they're manageable in R2 console. This is a deliberate deviation from the existing pattern.

---

## Task 1.1: Icons API Routes

### What to Build

New route file `apps/api/src/routes/icons.ts` with three endpoints:

**GET /icons** — List all icons grouped by category

```typescript
// Response shape
interface IconItem {
  key: string         // "icons/social/facebook.svg"
  url: string         // "https://pub-xxx.r2.dev/icons/social/facebook.svg"
  name: string        // "facebook"
  category: string    // "social"
}

interface IconsResponse {
  categories: Array<{
    name: string
    icons: IconItem[]
  }>
}
```

Implementation:
- `ASSETS_BUCKET.list({ prefix: 'icons/' })` — returns all objects under `icons/`
- Parse key to extract category and name: `icons/{category}/{name}.svg`
- Group by category, sort alphabetically
- Auth: `authMiddleware` (read-only, any authenticated user)
- Handle R2 list pagination (1000 objects per page, use `cursor` if `list_complete === false`)

**POST /icons** — Upload a new SVG icon

```typescript
// Multipart form: file (SVG) + category (string)
// Response: { url: string, key: string }
```

Implementation:
- Multipart form: `file` field (File) + `category` field (string)
- Validate: file must be `image/svg+xml`, max 100KB
- Validate: category must be `[a-z0-9-]+`, max 50 chars
- Slugify original filename: `My Icon.svg` → `my-icon`
- Key: `icons/{category}/{slug}.svg`
- If key already exists, return existing URL (no overwrite by default)
- Auth: `authMiddleware` + `requireRole('content_manager', 'admin')`

**DELETE /icons/:category/:name** — Delete an icon

```typescript
// Response: { ok: true }
```

Implementation:
- Key: `icons/{category}/{name}.svg`
- `ASSETS_BUCKET.delete(key)`
- Auth: `authMiddleware` + `requireRole('admin')`

### Integration

Register routes in `apps/api/src/index.ts` (or wherever routes are mounted):

```typescript
// EXISTING:
import { upload } from './routes/upload'
app.route('/api', upload)

// ADD:
import { icons } from './routes/icons'
app.route('/api', icons)
```

### Domain Rules

- Use same `Env` type from `apps/api/src/env.ts` — no new bindings needed
- Use existing `authMiddleware` and `requireRole` from middleware
- R2 `list()` returns `R2Objects` with `objects` array and `truncated`/`cursor` for pagination
- Keep response shapes simple — Studio will consume directly

---

## Task 1.2: Studio API Client Functions

### What to Build

Add functions to `apps/studio/src/lib/block-api.ts`:

```typescript
export interface IconItem {
  key: string
  url: string
  name: string
  category: string
}

export interface IconCategory {
  name: string
  icons: IconItem[]
}

/** Fetch all icons grouped by category */
export async function fetchIcons(): Promise<IconCategory[]> {
  const token = await getAuthToken()
  const res = await fetch(`${apiUrl}/api/icons`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch icons')
  const data = await res.json()
  return data.categories
}

/** Upload an SVG icon to a category */
export async function uploadIcon(file: File, category: string): Promise<string> {
  const token = await getAuthToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  const res = await fetch(`${apiUrl}/api/icons`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to upload icon')
  const data = await res.json()
  return data.url
}

/** Delete an icon */
export async function deleteIcon(category: string, name: string): Promise<void> {
  const token = await getAuthToken()
  const res = await fetch(`${apiUrl}/api/icons/${category}/${name}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to delete icon')
}
```

---

## Task 1.3: IconPickerModal Component

### What to Build

New file: `apps/studio/src/components/icon-picker-modal.tsx`

A modal dialog that:
1. Fetches icons via `fetchIcons()` on mount
2. Shows categories as tabs/filter buttons across the top
3. Displays SVG icons in a grid (4-5 columns) as `<img src={url} />` with name below
4. Has a search input that filters by name across all categories
5. Click on an icon = select it, calls `onSelect(url)` and closes
6. Has an "Upload" section at the bottom:
   - File input accepting only `.svg`
   - Category selector (dropdown of existing categories + "New category" option)
   - Upload button
7. Shows currently selected icon (if any) with a "Remove" option
8. Loading and empty states

Props:
```typescript
interface IconPickerModalProps {
  currentUrl?: string       // currently selected icon URL
  onSelect: (url: string) => void
  onRemove: () => void
  onClose: () => void
}
```

Follow existing modal patterns from `TaxonomyPickerModal` for styling (backdrop, panel, close button).

---

## Task 1.4: ThemeMeta Type + Validator Update

### What to Build

**`packages/db/src/types.ts`** — Add `icon_url` to ThemeMeta:

```typescript
export interface ThemeMeta {
  name: string
  tagline?: string
  description?: string
  // ... existing fields ...
  icon_url?: string          // ← ADD: URL to SVG icon from R2 icons library
}
```

**`packages/validators/src/theme.ts`** — Add to metaSchema:

```typescript
icon_url: z.string().url().optional().or(z.literal('')),
```

---

## Task 1.5: EditorSidebar Integration

### What to Build

Add an "Icon" section to `apps/studio/src/components/editor-sidebar.tsx`, between Thumbnail and Status sections (line ~87).

```typescript
// After the Thumbnail section divider, before Status:

{/* Icon */}
<div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
  <span style={labelStyle}>Icon</span>
  {iconUrl ? (
    <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
      <img
        src={iconUrl}
        alt="Theme icon"
        style={{ width: '32px', height: '32px' }}
      />
      <Button variant="ghost" size="mini" onClick={() => setIconPickerOpen(true)}>
        Change
      </Button>
      <Button variant="ghost" size="mini" onClick={() => setValue('meta.icon_url', '', { shouldDirty: true })}>
        Remove
      </Button>
    </div>
  ) : (
    <Button variant="outline" size="mini" onClick={() => setIconPickerOpen(true)}>
      Select Icon
    </Button>
  )}
</div>

<div style={{ height: '1px', backgroundColor: 'hsl(var(--border-default))' }} />
```

State additions:
```typescript
const [iconPickerOpen, setIconPickerOpen] = useState(false)
const iconUrl = watch('meta.icon_url')
```

Modal render (at bottom of component, alongside other modals):
```typescript
{iconPickerOpen && (
  <IconPickerModal
    currentUrl={iconUrl ?? ''}
    onSelect={(url) => {
      setValue('meta.icon_url', url, { shouldDirty: true })
      setIconPickerOpen(false)
    }}
    onRemove={() => {
      setValue('meta.icon_url', '', { shouldDirty: true })
      setIconPickerOpen(false)
    }}
    onClose={() => setIconPickerOpen(false)}
  />
)}
```

---

## Files to Modify

- `apps/api/src/routes/icons.ts` — **NEW**: icons CRUD routes (list, upload, delete)
- `apps/api/src/index.ts` — mount icons routes
- `apps/studio/src/lib/block-api.ts` — add `fetchIcons`, `uploadIcon`, `deleteIcon`
- `apps/studio/src/components/icon-picker-modal.tsx` — **NEW**: icon picker modal
- `apps/studio/src/components/editor-sidebar.tsx` — add Icon section + IconPickerModal
- `packages/db/src/types.ts` — add `icon_url` to `ThemeMeta`
- `packages/validators/src/theme.ts` — add `icon_url` to `metaSchema`
- `src/__arch__/domain-manifest.ts` — add `icons.ts` to `app-api` owned_files, add `icon-picker-modal.tsx` to `studio-core` owned_files

---

## Acceptance Criteria

- [ ] `GET /api/icons` returns icons grouped by category from R2 `icons/` prefix
- [ ] `POST /api/icons` uploads SVG to `icons/{category}/{slug}.svg` with validation
- [ ] `DELETE /api/icons/:category/:name` removes icon from R2
- [ ] Icon picker modal shows grid of SVG icons with category tabs and search
- [ ] Icon picker allows uploading new SVGs with category selection
- [ ] EditorSidebar shows "Icon" section with preview of selected icon
- [ ] Selecting an icon sets `meta.icon_url` on the theme form
- [ ] `ThemeMeta.icon_url` field added to types and validator
- [ ] Only `image/svg+xml` files accepted, max 100KB
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new boundary violations
- [ ] Domain invariants preserved: API auth on write endpoints, R2 public URL for reads

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests (path existence, parity, ownership)
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. TypeScript compilation
npx tsc --noEmit -p apps/api/tsconfig.json
echo "(expect: no type errors in API)"

npx tsc --noEmit -p apps/studio/tsconfig.json
echo "(expect: no type errors in Studio)"

# 3. Verify route is mounted
grep -n "icons" apps/api/src/index.ts
echo "(expect: icons route imported and mounted)"

# 4. Verify ThemeMeta has icon_url
grep "icon_url" packages/db/src/types.ts
echo "(expect: icon_url?: string in ThemeMeta)"

# 5. Verify validator has icon_url
grep "icon_url" packages/validators/src/theme.ts
echo "(expect: icon_url in metaSchema)"

# 6. Verify editor sidebar has icon picker
grep -n "IconPickerModal\|icon_url\|iconPickerOpen" apps/studio/src/components/editor-sidebar.tsx
echo "(expect: icon picker state, modal render, icon_url watch)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-017/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-017 Phase 1 — SVG Icon Library
> Epic: WP-017 SVG Icon Library
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: app-api, studio-core

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
| Build | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/api/src/routes/icons.ts apps/api/src/index.ts apps/studio/src/lib/block-api.ts apps/studio/src/components/icon-picker-modal.tsx apps/studio/src/components/editor-sidebar.tsx packages/db/src/types.ts packages/validators/src/theme.ts src/__arch__/domain-manifest.ts logs/wp-017/
git commit -m "feat(studio): SVG icon library with R2 storage + theme editor picker [WP-017 phase 1]"
```

---

## IMPORTANT Notes for CC

- **Read domain skill FIRST** — `.claude/skills/domains/app-api/SKILL.md` and `.claude/skills/domains/studio-core/SKILL.md` before touching any code
- **Use public entrypoints only** — check skill's Public API section for cross-domain imports
- **Add new files to `domain-manifest.ts`** — update `owned_files` array for `app-api` and `studio-core`
- **Run `npm run arch-test` before committing** — this is not optional
- **Human-readable filenames for icons** — do NOT use SHA-256 hash; use slugified original filename
- **R2 list pagination** — handle `truncated` + `cursor` in list response (Cloudflare R2 returns max 1000 per page)
- **No inline styles where Tailwind works** — follow existing EditorSidebar patterns, but prefer Tailwind classes over `style={{}}`
- **SVG safety** — consider sanitizing SVG content (strip `<script>` tags) before storing, or at minimum set `Content-Security-Policy` headers
