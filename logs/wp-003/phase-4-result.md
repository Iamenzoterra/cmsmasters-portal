# Execution Log: WP-003 Phase 4 — Save, Publish, Delete
> Epic: Layer 1 — Content Studio
> Executed: 2026-03-30T00:15:00+02:00
> Duration: ~20 minutes
> Status: ⚠️ PARTIAL — all flows wired + tsc clean; Supabase persistence untestable on localhost without auth

## What Was Done

Wired form data → Supabase → feedback → audit trail. All flows wired (save draft, publish, delete, discard). Toast notifications, loading states, unsaved changes warning added. Localhost DB/auth verification pending — this is wiring-complete, not product-proven.

## Machete Mines Cut

| Mine | What | Resolution |
|------|------|------------|
| M1 — shared db contract | Plan said don't use `upsertTheme` — but it covers both create+edit | Used `upsertTheme(supabase, payload)` from `@cmsmasters/db` directly. Only `deleteTheme` is Studio-local. |
| M2 — audit swallow | `logAction` failure shouldn't block save but needs visibility | Non-blocking try/catch with `AUDIT_LOG_FAILED` marker + action + slug in console.warn |
| M3 — publish status drift | Form might still have `status='draft'` when user clicks Publish | `payload.status = 'published'` forced at payload level, not relying on form state |
| M4 — new theme redirect race | save → reset → navigate order matters | Create: navigate(`/themes/${slug}`) first (route change triggers fresh fetch). Edit: reset in place. |
| M5 — beforeunload sticky | Listener must depend on isDirty and cleanup | `useEffect` with `isDirty` dep, cleanup in return. Only fires when form actually dirty. |
| M6 — delete on unsaved theme | Delete button on `/themes/new` = no id = error | `onDelete={existingTheme ? handleDelete : undefined}` — footer hides Delete for new themes |
| M7 — toast scope creep | MVP needs feedback, not a framework | Minimal: ToastProvider + useToast hook, success/error/info, autodismiss 4s, no stacking policy |

## Key Decision: Shared vs Local

Used `upsertTheme` from `@cmsmasters/db` for save/publish — maintains contract with shared layer. Only `deleteTheme` is Studio-local (destructive admin action not in shared queries).

## Files Created/Modified

| Action | File | What |
|--------|------|------|
| MODIFIED | `src/lib/form-defaults.ts` | Added `formDataToUpsert()` + `emptyToNull()` helper |
| MODIFIED | `src/lib/queries.ts` | Added `deleteTheme(id)` |
| NEW | `src/components/toast.tsx` | ToastProvider + useToast + autodismiss UI |
| MODIFIED | `src/components/editor-footer.tsx` | Loading states (isSaving/isPublishing/isDeleting) + conditional Delete button |
| MODIFIED | `src/pages/theme-editor.tsx` | 4 handlers: saveDraft, publish, delete, discard + beforeunload + toast integration |
| MODIFIED | `src/main.tsx` | Wrapped app in `<ToastProvider>` |

All paths relative to `apps/studio/`.

## Verification

| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ Clean |
| Uses shared `upsertTheme` | ✅ 2 call sites (save + publish) |
| `deleteTheme` exists | ✅ in queries.ts |
| `formDataToUpsert` exists | ✅ in form-defaults.ts |
| `logAction` call sites | ✅ 3 (save, publish, delete) |
| `AUDIT_LOG_FAILED` markers | ✅ 3 catch blocks |
| `beforeunload` wired | ✅ with isDirty dep + cleanup |
| Toast system | ✅ ToastProvider in main.tsx, useToast in editor |
| Footer loading states | ✅ isSaving/isPublishing/isDeleting props |
| Delete hidden for new | ✅ `onDelete={existingTheme ? ... : undefined}` |

### Manual (PENDING — requires Supabase + auth)
- [ ] `/themes/new` → fill name → Save Draft → row in DB, route becomes `/themes/{slug}`
- [ ] Reload → data persisted
- [ ] Edit → change tagline → Save → reload → persisted
- [ ] Publish → `status='published'` in DB + audit_log entry
- [ ] Delete → confirm → gone from DB + redirect to `/`
- [ ] Audit log has entries for created/published/deleted
- [ ] Toast: green on success, red on error
- [ ] Buttons disabled during save (no double-submit)
- [ ] Close tab with dirty form → browser warns
- [ ] Discard on existing theme → resets to last saved, not empty defaults
- [ ] Discard on new theme → resets to empty defaults
- [ ] Delete button not visible on `/themes/new`

## Phase 5 Handoff

Form + persistence complete. Phase 5 (Media Page Stub + Polish) can now:
1. Add error boundary around editor
2. Polish loading skeletons
3. Build media page stub
4. Any visual QA from browser testing

## Git
- Commit: (pending)
