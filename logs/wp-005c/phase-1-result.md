# Execution Log: WP-005C Phase 1 — Blocks Page: Library CRUD
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: 2026-03-31T17:30:00+02:00
> Duration: ~35 min
> Status: ✅ COMPLETE

## What Was Implemented

Added a complete Blocks library UI to Studio: a list page (`/blocks`) with grid cards showing live iframe previews, search filtering, pagination, and empty/loading/error states; and an editor page (`/blocks/new`, `/blocks/:id`) with a 2-column layout featuring a form with Basic Info, HTML, CSS, Hooks (price toggle + links repeater via `useFieldArray`), and Metadata sections alongside a live preview panel. All CRUD operations go through a single `block-api.ts` transport boundary using raw `fetch` against the Hono API with JWT auth. Sidebar nav and routes are wired into the existing Studio shell.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| API transport | Raw `fetch` (not hc typed client) | `hc<AppType>` types resolved as `unknown` in Studio tsconfig — monorepo path aliases don't flow the route types through. Committed to single transport per M2 cut. |
| Auth + API in one file | Combined `getAuthToken()` + CRUD in `block-api.ts` | Simpler than separate `auth.ts` + `blocks-api.ts`; single import for all consumers |
| Editor footer | Custom inline (not `<EditorFooter>`) | Blocks have no publish/draft concept; EditorFooter requires `onSaveDraft` + `onPublish` |
| Hooks form state | Inside RHF via `useFieldArray` + `register` | M1 cut: prevents drift between local useState and RHF reset/isDirty/submit |
| Block cards | Inline in grid (no separate component) | Minimal data shape (name, slug, preview, timestamp) — separate file adds no value |
| Pagination label | Added `itemLabel` prop to Pagination | 1-line backward-compatible change; prevents "themes" label on blocks page |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/lib/block-api.ts` | created | Auth token helper + 5 CRUD functions via raw fetch, normalized error handling |
| `apps/studio/src/components/block-preview.tsx` | created | Sandboxed iframe component for HTML+CSS preview |
| `apps/studio/src/pages/blocks-list.tsx` | created | Grid page with search, pagination, empty/loading/error states |
| `apps/studio/src/pages/block-editor.tsx` | created | Create/edit form with live preview, hooks via useFieldArray, custom footer |
| `apps/studio/src/components/pagination.tsx` | modified | Added optional `itemLabel` prop (default "items") |
| `apps/studio/src/components/sidebar.tsx` | modified | Added Blocks nav item with Boxes icon |
| `apps/studio/src/pages/themes-list.tsx` | modified | Added `itemLabel="themes"` to Pagination (prevent regression) |
| `apps/studio/src/app.tsx` | modified | Added 3 block routes + 2 imports |

## Issues & Workarounds

**hc type resolution failure:** `hc<AppType>` client returned `unknown` in Studio because `AppType` is imported via relative path in `api-client/src/client.ts` (`../../../apps/api/src/index`) and Studio's tsconfig doesn't include the API source files. Switched entirely to raw `fetch` per M2 cut — single transport, consistent error contract.

## Open Questions

None. Pagination regression was fixed by passing `itemLabel="themes"` to themes-list's Pagination call.

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ 0 errors |
| New files exist | ✅ all 4 present |
| Routes registered | ✅ 3 routes + 2 imports |
| Sidebar updated | ✅ Blocks item with Boxes icon |
| Manual browser test | ⏳ pending dev server |
| AC met | ✅ (code-level; runtime pending manual test) |

## Git
- Commit: `pending`
