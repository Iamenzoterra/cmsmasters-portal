# WP-006 Phase 4: DB Migration — `js` column + Studio JS field

> Workplan: WP-006 Block Import Pipeline
> Phase: 4 of 8
> Priority: P0
> Estimated: 2 hours
> Type: Full-stack
> Previous: Phase 3 ✅ (Studio Import UI with split preview, token suggestions, image upload)
> Next: Phase 5 (portal-blocks.css — shared button/card component stylesheet)

---

## Context

Blocks are currently stored with `html` and `css` columns in Supabase. But blocks also contain animation and interaction JavaScript — scroll-triggered reveals, hover parallax, magnetic buttons (ADR-023).

Right now this JS is embedded in `<script>` tags inside the HTML, but:
- The block editor's `parseHtmlFile()` **strips all scripts** on import
- The `splitCode()` function only splits into html + css, **ignoring scripts**
- The DB has no `js` column — nowhere to store block JS separately
- The API doesn't accept or return a `js` field

The import panel (`block-import-panel.tsx`) already extracts JS from combined code — but it just puts it back into the combined code string on "Apply". There's no separate persistence.

```
CURRENT:  blocks table = id, slug, name, html, css, hooks, metadata   ✅
MISSING:  blocks.js column (text, default '')                          ❌
MISSING:  Block type includes js field                                 ❌
MISSING:  Validators accept js field                                   ❌
MISSING:  API routes pass js through                                   ❌
MISSING:  Studio editor shows/edits JS separately                      ❌
MISSING:  Studio import preserves JS on file import                    ❌
```

After this phase: blocks store HTML, CSS, and JS as three separate fields. Studio can edit each independently. The Portal (Astro) will inject JS as `<script type="module">` at render time.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current blocks table schema in Supabase types
grep -A 20 "blocks:" packages/db/src/types.ts | head -25

# 2. Current block validators
cat packages/validators/src/block.ts

# 3. Current block API route (check what fields are passed)
grep -n "parsed.data" apps/api/src/routes/blocks.ts

# 4. Current block editor form shape
grep -A 12 "interface BlockFormData" apps/studio/src/pages/block-editor.tsx

# 5. Current splitCode function
grep -A 10 "function splitCode" apps/studio/src/pages/block-editor.tsx

# 6. Current blockToCode / blockToFormData
grep -A 8 "function blockToCode" apps/studio/src/pages/block-editor.tsx
grep -A 15 "function blockToFormData" apps/studio/src/pages/block-editor.tsx

# 7. Current formDataToPayload — check what fields it sends
grep -A 20 "function formDataToPayload" apps/studio/src/pages/block-editor.tsx

# 8. Current parseHtmlFile — see that it strips scripts
grep -A 20 "function parseHtmlFile" apps/studio/src/pages/block-editor.tsx

# 9. Check existing block data in DB (any rows with script content?)
# (manual — open Supabase dashboard, check blocks table)
```

**Document your findings before writing any code.**

**IMPORTANT:** The `packages/db/src/types.ts` file contains a manually maintained `Database` interface (not auto-generated from Supabase). You must update it by hand — adding `js` to the Row, Insert, and Update types for `blocks`.

---

## Task 4.1: Supabase Migration — add `js` column

### What to Build

Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor → New query):

```sql
-- WP-006 Phase 4: Add js column to blocks table
-- Stores animation/behavioral JavaScript separately from HTML
-- ADR-023: Block Animation Architecture

ALTER TABLE public.blocks
  ADD COLUMN js text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.blocks.js IS 'Block animation/behavioral JS — rendered as <script type="module"> by Portal';
```

**This is a manual step.** Tell the user to run this SQL in Supabase dashboard.

After confirming the migration ran, proceed to Task 4.2.

---

## Task 4.2: Update `packages/db` types

### What to Build

Add `js` field to the Block type definition in `packages/db/src/types.ts`.

**File:** `packages/db/src/types.ts`

Find the `blocks` table definition (~line 150) and add `js` to Row, Insert, and Update:

```typescript
// In blocks.Row — add after css:
js: string

// In blocks.Insert — add after css:
js?: string

// In blocks.Update — add after css:
js?: string
```

### Integration

The `Block` type alias (`type Block = Database['public']['Tables']['blocks']['Row']`) automatically picks up the new field. All code importing `Block` from `@cmsmasters/db` will see `js: string`.

---

## Task 4.3: Update `packages/validators`

### What to Build

Add `js` field to block Zod schemas.

**File:** `packages/validators/src/block.ts`

```typescript
// In createBlockSchema — add after css:
js: z.string().default(''),

// In updateBlockSchema — add after css:
js: z.string().optional(),
```

---

## Task 4.4: Update Hono API block routes

### What to Build

The API routes already pass `parsed.data` through to DB query functions. Since `js` is now in the validator schema and DB types, it flows automatically.

**Verify only** — no code changes expected. The `createBlock()` and `updateBlock()` query functions in `packages/db` use spread (`...payload`) so new fields pass through.

**File:** `apps/api/src/routes/blocks.ts` — read and confirm, no changes needed.

Check the DB query functions:

**File:** `packages/db/src/queries/` or `packages/db/src/index.ts` — find `createBlock` and `updateBlock`, verify they spread the payload.

---

## Task 4.5: Update Studio block editor — JS field

### What to Build

Add a `js` field to the block editor form. JS is edited separately from HTML+CSS — it gets its own textarea in an "Animation & Interaction" section.

**File:** `apps/studio/src/pages/block-editor.tsx`

**4.5a — Update BlockFormData interface:**
```typescript
interface BlockFormData {
  name: string
  slug: string
  code: string        // HTML+CSS combined (existing)
  js: string          // NEW — animation/interaction JS
  hasPriceHook: boolean
  priceSelector: string
  links: Array<{ selector: string; field: string; label?: string }>
  alt: string
  figma_node: string
}
```

**4.5b — Update getDefaults():**
```typescript
function getDefaults(): BlockFormData {
  return {
    // ... existing fields ...
    js: '',
  }
}
```

**4.5c — Update blockToCode():**
No change — `blockToCode` combines html + css for the `code` field. JS is separate.

**4.5d — Update blockToFormData():**
```typescript
function blockToFormData(block: Block): BlockFormData {
  return {
    // ... existing fields ...
    js: block.js ?? '',
  }
}
```

**4.5e — Update formDataToPayload():**
```typescript
function formDataToPayload(data: BlockFormData) {
  const { html, css } = splitCode(data.code)
  // ... existing hooks/metadata logic ...
  return {
    name: data.name,
    html: html || data.code,
    css: css || undefined,
    js: data.js || undefined,     // NEW
    hooks: /* existing */,
    metadata: /* existing */,
  }
}
```

**4.5f — Add JS textarea to the form UI:**

Add a new `FormSection` between "Code" and "Advanced":

```tsx
<FormSection title="Animation & Interaction JS" defaultOpen={false}>
  <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0 }}>
    Vanilla JS for scroll reveals, hover effects, parallax. Runs as &lt;script type="module"&gt;.
  </p>
  <textarea
    {...register('js')}
    rows={12}
    className="w-full outline-none"
    style={monoStyle}
    placeholder={'// Scoped to this block\nconst block = document.querySelector(\'.block-{slug}\');\n// ...'}
  />
</FormSection>
```

---

## Task 4.6: Update `parseHtmlFile()` — preserve scripts

### What to Build

Currently `parseHtmlFile()` strips all `<script>` tags. Change it to extract scripts into the `js` form field instead of discarding them.

**File:** `apps/studio/src/pages/block-editor.tsx`

Replace the current `parseHtmlFile` function:

```typescript
function parseHtmlFile(content: string): { code: string; js: string } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(content, 'text/html')

  // Extract <style> content
  const styles = Array.from(doc.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n\n')
    .trim()

  // Extract <script> content (preserve, don't strip)
  const scripts = Array.from(doc.querySelectorAll('script'))
    .map((el) => el.textContent ?? '')
    .join('\n\n')
    .trim()

  // Body without style and script tags
  const body = doc.body?.innerHTML?.trim() ?? content
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim()

  let code = ''
  if (styles) code += `<style>\n${styles}\n</style>\n\n`
  code += cleaned

  return { code, js: scripts }
}
```

**Update `handleFileImport()`** to set both fields:

```typescript
function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const content = reader.result as string
    const { code, js } = parseHtmlFile(content)

    form.setValue('code', code, { shouldDirty: true })
    form.setValue('js', js, { shouldDirty: true })

    // Auto-fill name from filename if empty
    const currentName = form.getValues('name')
    if (!currentName) {
      const name = file.name.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')
      form.setValue('name', name, { shouldDirty: true })
      if (isNew) form.setValue('slug', nameToSlug(name), { shouldDirty: false })
    }

    toast({ type: 'success', message: `Imported ${file.name}` })
  }
  reader.readAsText(file)
  e.target.value = ''
}
```

**Update BlockImportPanel onApply** — pass JS separately from code:

Currently the import panel's `onApply` returns a single `processedCode` string. Update the interface to also return JS:

**File:** `apps/studio/src/components/block-import-panel.tsx`

```typescript
interface BlockImportPanelProps {
  code: string
  js: string                              // NEW
  onApply: (processedCode: string, js: string) => void   // UPDATED
  onClose: () => void
}
```

Update the `handleApply` in the import panel:
```typescript
function handleApply() {
  const finalCode = combineCode(processedHtml, finalCss, '')  // Don't put JS back in code
  onApply(finalCode, originalJs)
}
```

Update the caller in `block-editor.tsx`:
```typescript
<BlockImportPanel
  code={watchedCode ?? ''}
  js={form.getValues('js') ?? ''}
  onApply={(processedCode, js) => {
    form.setValue('code', processedCode, { shouldDirty: true })
    form.setValue('js', js, { shouldDirty: true })
    setShowProcess(false)
    toast({ type: 'success', message: 'Block processed — tokens applied' })
  }}
  onClose={() => setShowProcess(false)}
/>
```

---

## Files to Modify

- `packages/db/src/types.ts` — add `js` to blocks Row/Insert/Update
- `packages/validators/src/block.ts` — add `js` to create/update schemas
- `apps/api/src/routes/blocks.ts` — verify (likely no changes needed)
- `apps/studio/src/pages/block-editor.tsx` — BlockFormData, getDefaults, blockToFormData, formDataToPayload, parseHtmlFile, handleFileImport, UI textarea
- `apps/studio/src/components/block-import-panel.tsx` — accept `js` prop, update `onApply` signature

---

## Acceptance Criteria

- [ ] `blocks.js` column exists in Supabase (verified via dashboard)
- [ ] `packages/db` Block type has `js: string`
- [ ] `packages/validators` createBlockSchema and updateBlockSchema accept `js`
- [ ] API `POST /blocks` and `PUT /blocks/:id` accept and persist `js` field
- [ ] Studio block editor has "Animation & Interaction JS" section with textarea
- [ ] Creating a block with JS → JS saved in DB → loading the block shows JS in textarea
- [ ] Importing an .html file with `<script>` → JS extracted into JS field (not stripped)
- [ ] Process panel receives JS prop → previews show animations → Apply returns JS separately
- [ ] `tsc --noEmit` clean for all projects (api, studio, db, validators)

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-006 Phase 4 Verification ==="

# 1. TypeScript compiles
cd "C:\work\cmsmasters portal\app\cmsmasters-portal"
npx tsc --noEmit -p apps/api/tsconfig.json && echo "✅ API tsc clean" || echo "❌ API tsc failed"
npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio tsc clean" || echo "❌ Studio tsc failed"

# 2. Block type has js field
grep "js:" packages/db/src/types.ts | head -5
echo "(expect 3 lines: Row, Insert, Update)"

# 3. Validator has js field
grep "js:" packages/validators/src/block.ts
echo "(expect 2 lines: create + update)"

# 4. Block editor form has js
grep "js" apps/studio/src/pages/block-editor.tsx | grep -v "//" | head -10
echo "(expect: form field, textarea, formDataToPayload)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-006/phase-4-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-006 Phase 4 — DB Migration + Studio JS field
> Workplan: WP-006 Block Import Pipeline
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
| Build | ✅/❌ |
| Tests | ✅/❌ |
| Lint  | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/db/src/types.ts packages/validators/src/block.ts apps/api/src/routes/blocks.ts apps/studio/src/pages/block-editor.tsx apps/studio/src/components/block-import-panel.tsx logs/wp-006/phase-4-result.md
git commit -m "feat: add js column to blocks — animation/interaction JS storage [WP-006 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Manual step:** The SQL migration must be run by the user in Supabase dashboard. Ask them to confirm before proceeding.
- **Do NOT auto-generate types from Supabase.** The `Database` interface in `types.ts` is manually maintained. Add the `js` field by hand.
- **The `js` field defaults to `''`** (empty string), not `null`. This avoids null checks everywhere.
- **Do NOT modify `block-processor.ts` or `token-map.ts`** — those are Phase 1 files, no changes needed.
- **The import panel already extracts JS** in its local `splitCode()` — this phase makes that extraction persist to DB.
- **If `tsc` fails on other files** unrelated to this phase, note in the log but don't fix — stay scoped.
