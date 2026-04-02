# WP-003 Phase 4: Save, Publish, Delete

> Workplan: WP-003 Layer 1 — Content Studio
> Phase: 4 of 7
> Priority: P0
> Estimated: 2–3 hours
> Type: Frontend + Supabase integration
> Previous: Phase 3 ✅ (Full 27-field form, 7 sections + sidebar, tsc clean, RHF + Zod wired)
> Next: Phase 5 (Media Page Stub + Polish)

---

## Context

Phase 3 delivered the complete form shell: 7 collapsible sections, expanded sidebar with 10 items, sticky footer with Discard/Save/Publish buttons. The form is wired to `react-hook-form` + `zodResolver(themeSchema)`. All 27 fields render and are interactive.

**But nothing saves.** The form produces validated `ThemeFormData` — but there's no `onSubmit`, no Supabase write, no toast feedback, no delete flow. The "Save Draft" and "Publish" buttons are inert.

Phase 4 closes this gap: form data → Supabase → feedback → audit trail.

```
CURRENT:  Form renders all 27 fields ✅
          useForm + zodResolver wired ✅
          EditorFooter has 3 buttons (Discard, Save Draft, Publish) — inert
          formDataToUpsert() exists in form-defaults.ts — untested
MISSING:  Save to Supabase, publish flow, delete, toasts, audit log, unsaved warning
```

---

## Phase 0: Audit (do FIRST)

```bash
# 1. Confirm Phase 3 output
wc -l apps/studio/src/pages/theme-editor.tsx
echo "(expect: ~450 lines)"

# 2. Check formDataToUpsert exists
grep "formDataToUpsert" apps/studio/src/lib/form-defaults.ts

# 3. Check upsertTheme exists in @cmsmasters/db
grep "upsertTheme" packages/db/src/queries/themes.ts
grep "upsertTheme" packages/db/src/index.ts

# 4. Check logAction exists in @cmsmasters/db
grep "logAction" packages/db/src/queries/audit.ts
grep "logAction" packages/db/src/index.ts

# 5. Check supabase client singleton
cat apps/studio/src/lib/supabase.ts

# 6. Check api-client for revalidation
cat apps/studio/src/lib/api.ts

# 7. Check if toast/notification system exists
grep -r "toast\|Toaster\|notification" apps/studio/src/ 2>/dev/null || echo "No toast system yet"

# 8. Verify EditorFooter accepts onSave/onPublish/onDiscard callbacks
grep "onSave\|onPublish\|onDiscard\|onClick" apps/studio/src/components/editor-footer.tsx
```

---

## Tasks

### Task A: Supabase write helpers

In `apps/studio/src/lib/queries.ts` add:

```typescript
// Save (create or update) theme to Supabase
export async function saveTheme(data: ThemeInsert | ThemeUpdate, existingId?: string): Promise<Theme> {
  if (existingId) {
    // UPDATE existing
    const { data: result, error } = await supabase
      .from('themes')
      .update(data)
      .eq('id', existingId)
      .select()
      .single()
    if (error) throw error
    return result
  } else {
    // INSERT new
    const { data: result, error } = await supabase
      .from('themes')
      .insert(data)
      .select()
      .single()
    if (error) throw error
    return result
  }
}

// Delete theme
export async function deleteTheme(id: string): Promise<void> {
  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

Types come from `@cmsmasters/db` (`Theme`, `ThemeInsert`, `ThemeUpdate`).

### Task B: Toast notification system

Studio needs user feedback. Create a minimal toast system:

```
apps/studio/src/components/toast.tsx
apps/studio/src/lib/toast-context.tsx  (or use a simpler approach)
```

Options:
1. If shadcn Toast primitive exists in `@cmsmasters/ui` → use it
2. If not → create minimal implementation: fixed-position container, auto-dismiss after 4s, success (green) + error (red) + info variants

Usage pattern:
```typescript
const { toast } = useToast()
toast({ type: 'success', message: 'Theme saved' })
toast({ type: 'error', message: 'Failed to save: ' + error.message })
```

### Task C: Wire Save Draft flow

In `theme-editor.tsx`:

```typescript
const handleSaveDraft = async (data: ThemeFormData) => {
  try {
    setSaving(true)
    const upsertData = formDataToUpsert(data, existingTheme?.id)
    // Force status to current (don't change on save)
    const saved = await saveTheme(upsertData, existingTheme?.id)

    // Audit log
    await logAction(supabase, {
      action: existingTheme ? 'theme.updated' : 'theme.created',
      target_type: 'theme',
      target_id: saved.id,
      details: { slug: saved.slug, status: saved.status }
    })

    // If new theme → redirect to /themes/{slug}
    if (!existingTheme) {
      navigate(`/themes/${saved.slug}`, { replace: true })
    }

    // Reset form dirty state with new values
    reset(themeToFormData(saved))
    toast({ type: 'success', message: 'Theme saved' })
  } catch (err) {
    toast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' })
  } finally {
    setSaving(false)
  }
}
```

**Key details:**
- `formDataToUpsert()` from `form-defaults.ts` transforms form data → DB shape
- After save: `reset()` with fresh data clears dirty state
- New themes: redirect to `/themes/{slug}` after first save (slug becomes permanent)
- Error: catch RLS failures, network errors → show in toast

### Task D: Wire Publish flow

```typescript
const handlePublish = async (data: ThemeFormData) => {
  try {
    setPublishing(true)
    const upsertData = formDataToUpsert(data, existingTheme?.id)
    upsertData.status = 'published'  // Override status

    const saved = await saveTheme(upsertData, existingTheme?.id)

    // Audit log
    await logAction(supabase, {
      action: 'theme.published',
      target_type: 'theme',
      target_id: saved.id,
      details: { slug: saved.slug }
    })

    // Trigger Portal revalidation via Hono API
    try {
      const api = createApiClient(session?.access_token)
      await api.api.content.revalidate.$post({ json: { slug: saved.slug } })
    } catch {
      // Revalidation failure is non-fatal — Portal will catch up via ISR
      console.warn('Revalidation failed — Portal will update via ISR')
    }

    if (!existingTheme) {
      navigate(`/themes/${saved.slug}`, { replace: true })
    }
    reset(themeToFormData(saved))
    toast({ type: 'success', message: 'Theme published' })
  } catch (err) {
    toast({ type: 'error', message: err instanceof Error ? err.message : 'Publish failed' })
  } finally {
    setPublishing(false)
  }
}
```

**Key details:**
- Same as save, but forces `status = 'published'`
- After Supabase write → calls Hono API to trigger Portal SSG revalidation
- Revalidation failure = non-fatal warning (Portal has ISR fallback)
- Access token from session passed to API client for JWT auth

### Task E: Wire Delete flow

```typescript
const handleDelete = async () => {
  if (!existingTheme) return

  // Confirmation dialog
  const confirmed = window.confirm(
    `Delete "${existingTheme.name}"? This cannot be undone.`
  )
  if (!confirmed) return

  try {
    setDeleting(true)
    await deleteTheme(existingTheme.id)

    // Audit log
    await logAction(supabase, {
      action: 'theme.deleted',
      target_type: 'theme',
      target_id: existingTheme.id,
      details: { slug: existingTheme.slug, name: existingTheme.name }
    })

    toast({ type: 'success', message: 'Theme deleted' })
    navigate('/', { replace: true })
  } catch (err) {
    toast({ type: 'error', message: err instanceof Error ? err.message : 'Delete failed' })
  } finally {
    setDeleting(false)
  }
}
```

**MVP:** `window.confirm()` dialog. Custom modal = Studio V2.

Delete button location: header ••• menu or footer. Check Phase 3 layout — if ••• menu exists in header, put delete there. Otherwise add a destructive text button in footer.

### Task F: Wire Discard Changes

```typescript
const handleDiscard = () => {
  if (existingTheme) {
    reset(themeToFormData(existingTheme))
  } else {
    reset(getDefaults())
  }
}
```

Already in EditorFooter as a button — just needs the callback wired.

### Task G: Unsaved changes warning

```typescript
// Browser beforeunload
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```

`isDirty` comes from `useForm`'s `formState.isDirty`.

For react-router navigation: use `useBlocker` or `useBeforeUnload` from react-router-dom v7 if available. Otherwise `beforeunload` only (covers browser back/close, not SPA navigation).

### Task H: Loading states on buttons

EditorFooter needs to accept loading state props:

```typescript
interface EditorFooterProps {
  onDiscard: () => void
  onSaveDraft: () => void
  onPublish: () => void
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  isNew: boolean  // hide "Discard" for new themes with no saved state
}
```

- Save Draft: show spinner, disable all buttons during save
- Publish: show spinner, disable all buttons during publish
- Discard Changes: disabled when form is not dirty
- "Unsaved changes" text indicator when `isDirty && !isSaving`

---

## What This Phase Does NOT Do

- **Media upload to R2** → Studio V2 (URL text inputs remain)
- **Custom delete modal** → Studio V2 (window.confirm for MVP)
- **Optimistic updates** → not needed for single-user internal tool
- **Autosave** → not needed for MVP
- **Structured custom section editors** → Studio V2
- **Error boundary around form** → Phase 5 (Polish)

---

## Verification

```bash
# 1. tsc clean
npx tsc --noEmit -p apps/studio/tsconfig.json

# 2. Save function exists
grep "saveTheme" apps/studio/src/lib/queries.ts

# 3. Delete function exists
grep "deleteTheme" apps/studio/src/lib/queries.ts

# 4. logAction called
grep -c "logAction" apps/studio/src/pages/theme-editor.tsx
# (expect: 3 — save, publish, delete)

# 5. Toast system exists
find apps/studio/src -name "*toast*" -o -name "*Toast*"

# 6. formState.isDirty used
grep "isDirty" apps/studio/src/pages/theme-editor.tsx

# 7. beforeunload wired
grep "beforeunload" apps/studio/src/pages/theme-editor.tsx
```

### Manual (requires browser + Supabase + auth)
- [ ] Login as content_manager
- [ ] `/themes/new` → fill name + 2 features → Save Draft
- [ ] Check Supabase: theme row exists with status='draft'
- [ ] Check Supabase: audit_log has 'theme.created' entry
- [ ] Edit theme → change tagline → Save → reload → changes persisted
- [ ] Publish → status changes to 'published' in Supabase
- [ ] Audit log has 'theme.published' entry
- [ ] Revalidation endpoint called (check Hono API logs or network tab)
- [ ] Delete → confirm → theme gone from list and DB
- [ ] Audit log has 'theme.deleted' entry
- [ ] Toast: green on success, red on error
- [ ] Unsaved changes: edit field → try to close tab → browser warns
- [ ] Discard Changes → form resets to last saved state
- [ ] New theme: after save → URL changes to /themes/{slug}
- [ ] Buttons disabled during save/publish (no double-submit)

---

## Execution Log Instructions

Create `logs/wp-003/phase-4-result.md` with:
- Files created/modified
- Mines cut (Supabase write edge cases, RLS issues, toast integration)
- Verification results (tsc, grep, manual tests if possible)
- Surprises/drift
- Phase 5 handoff notes
