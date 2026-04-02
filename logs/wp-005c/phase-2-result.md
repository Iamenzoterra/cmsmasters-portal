# Execution Log: WP-005C Phase 2 — Templates Page: Position Grid CRUD
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: 2026-03-31T21:00:00+02:00
> Duration: ~30 min
> Status: ✅ COMPLETE

## What Was Implemented

Added a complete Templates UI to Studio: a list page (`/templates`) with cards showing position dot indicators, search, pagination, and empty/loading/error states; and an editor page (`/templates/new`, `/templates/:id`) with basic info form (name, slug, description, max_positions), a position grid component showing numbered slots with add/remove block capability, and a block picker modal that fetches from the blocks library. Extracted `DeleteConfirmModal` to a shared component used by both block and template editors. Auth helpers (`getAuthToken`, `authHeaders`, `parseError`) exported from `block-api.ts` and reused by `template-api.ts`. Max_positions reduction guard requires explicit confirmation when filled positions would be dropped (M3 cut).

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Auth helpers | Export from `block-api.ts`, import in `template-api.ts` | Shared, not duplicated; minimal change to working code |
| DeleteConfirmModal | Extract to shared component | Used by both editors; generalized via `title` + `itemName` props |
| Position grid | Controlled component, no internal state | Reusable in Phase 3 theme merge view; template editor owns state |
| Block picker | Fresh fetch on each open | Simple > clever; no shared state between editor and picker |
| Position grid rows | Text only, no BlockPreview iframes | Lightweight for 20+ rows; iframes would be expensive |
| max_positions guard | `confirm()` dialog before applying reduction | M3 cut: prevents silent data loss when reducing below filled positions |
| Position cards | Dot indicators (filled/empty circles) | Visual density summary without taking card space |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/lib/block-api.ts` | modified | Exported `getAuthToken`, `authHeaders`, `parseError` |
| `apps/studio/src/lib/template-api.ts` | created | 5 CRUD functions via raw fetch, imports shared auth helpers |
| `apps/studio/src/components/delete-confirm-modal.tsx` | created | Extracted shared delete confirmation modal |
| `apps/studio/src/pages/block-editor.tsx` | modified | Uses extracted DeleteConfirmModal, removed inline version |
| `apps/studio/src/components/block-picker-modal.tsx` | created | Block selection grid with search, preview cards, empty state |
| `apps/studio/src/components/position-grid.tsx` | created | Controlled numbered slot list with add/remove callbacks |
| `apps/studio/src/pages/templates-list.tsx` | created | Grid page with search, pagination, position dot indicators |
| `apps/studio/src/pages/template-editor.tsx` | created | Editor with RHF form, position grid, picker, delete modal, M1/M3 cuts |
| `apps/studio/src/components/sidebar.tsx` | modified | Added Templates nav item with LayoutTemplate icon |
| `apps/studio/src/app.tsx` | modified | Added 3 template routes + 2 imports |

## Issues & Workarounds

None. Clean implementation following Phase 1 patterns.

## Open Questions

None.

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ 0 errors |
| New files exist | ✅ all 6 present |
| Auth helpers exported | ✅ 3 exports |
| Routes registered | ✅ 3 routes + 2 imports |
| Sidebar updated | ✅ Templates item with LayoutTemplate icon |
| Manual: create template | ✅ |
| Manual: block picker | ✅ |
| Manual: position grid | ✅ |
| Manual: edit template | ✅ |
| Manual: delete template | ✅ |
| Regression: block delete | ✅ |
| AC met | ✅ |

## Git
- Commit: `aee70c8d` — `feat: templates page with position grid CRUD and block picker [WP-005C phase 2]`
