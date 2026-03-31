# Execution Log: WP-005C Phase 1 — Blocks Page: Library CRUD
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: 2026-03-31T17:30:00+02:00
> Duration: ~3 hours (incl. UX iteration + auth fix)
> Status: ✅ COMPLETE

## What Was Implemented

Added a complete Blocks library UI to Studio: a list page (`/blocks`) with grid cards, search filtering, pagination, and empty/loading/error states; and an editor page (`/blocks/new`, `/blocks/:id`) with a single-column form layout featuring Basic Info, unified Code field (merged HTML+CSS), Hooks, and Metadata sections in a collapsible "Advanced" group. Preview is a full-page modal (90vw×90vh) opened via a header button. HTML file import parses `<style>` + `<body>` from `.html` files. Delete uses a custom modal with red accent bar and backdrop blur. All CRUD operations go through `block-api.ts` using raw `fetch` with JWT auth.

Also fixed a critical auth issue: Supabase rotated JWT signing keys from HS256 to ECC P-256 (ES256), breaking the manual HS256 verification in `auth.ts`. Replaced with `supabase.auth.getUser(token)` which delegates verification to Supabase — works with any algorithm and handles key rotation automatically. Removed `SUPABASE_JWT_SECRET` from env.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| API transport | Raw `fetch` (not hc typed client) | `hc<AppType>` types resolved as `unknown` in Studio tsconfig — monorepo path aliases don't flow route types through |
| Auth verification | `supabase.auth.getUser(token)` instead of manual JWT crypto | Supabase rotated to ECC P-256 keys; manual HS256 verification broke. Delegation handles any algorithm + key rotation |
| Editor layout | Single column + preview modal (not 2-column sidebar) | 320px sidebar preview was too narrow for real content; full-page modal shows blocks at actual size |
| Code field | Single unified field (merged HTML+CSS) | Users never edit HTML and CSS separately; single field allows copy/paste to/from Claude for editing |
| Hooks form state | Inside RHF via `useFieldArray` + `register` | M1 cut: prevents drift between local useState and RHF reset/isDirty/submit |
| Delete confirmation | Custom modal with animation | Browser `confirm()` is ugly and non-customizable; modal matches app aesthetic |
| FormSection overflow | Removed `overflow-hidden` | Was clipping input shadows, textarea resize handles, and content at card edges |
| Import HTML | Parse with DOMParser, strip scripts, keep styles | Allows importing Figma-exported HTML files directly; scripts stripped for sandbox safety |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/lib/block-api.ts` | created | Auth token helper + 5 CRUD functions via raw fetch |
| `apps/studio/src/components/block-preview.tsx` | created | Scaled iframe preview with ResizeObserver (used by list cards) |
| `apps/studio/src/pages/blocks-list.tsx` | created | Grid page with search, pagination, empty/loading/error states |
| `apps/studio/src/pages/block-editor.tsx` | created | Editor with unified Code field, import HTML, preview modal, delete modal, hooks via useFieldArray |
| `apps/studio/src/components/pagination.tsx` | modified | Added optional `itemLabel` prop |
| `apps/studio/src/components/sidebar.tsx` | modified | Added Blocks nav item with Boxes icon |
| `apps/studio/src/components/form-section.tsx` | modified | Removed `overflow-hidden` that clipped content |
| `apps/studio/src/pages/themes-list.tsx` | modified | Added `itemLabel="themes"` to Pagination |
| `apps/studio/src/app.tsx` | modified | Added 3 block routes + 2 imports |
| `apps/api/src/middleware/auth.ts` | modified | Replaced manual HS256 JWT verification with `supabase.auth.getUser(token)` |
| `apps/api/src/env.ts` | modified | Removed `SUPABASE_JWT_SECRET` from Env interface |
| `apps/api/.dev.vars` | created | Local dev secrets (gitignored) |

## Issues & Workarounds

**1. hc type resolution failure:** `hc<AppType>` client returned `unknown` in Studio because `AppType` is imported via relative path and Studio's tsconfig doesn't include API source files. Switched to raw `fetch` per M2 cut.

**2. JWT auth 401 errors:** Supabase rotated signing keys from Legacy HS256 to ECC P-256 (ES256). Manual HS256 verification in `auth.ts` broke silently. Fixed by replacing 50+ lines of Web Crypto API code with a single `supabase.auth.getUser(token)` call.

**3. Preview rendering issues:** 320px sidebar preview was too narrow for real content (500px+ blocks). Scaled iframe approach (CSS transform) still showed tiny/distorted content. CSS animations (`opacity: 0` reveal classes) made content invisible since scripts were stripped. Resolved by switching to full-page preview modal and adding `!important` overrides for reveal classes.

**4. FormSection overflow-hidden:** Clipped input box-shadows, textarea resize handles, and content at card edges. Fixed by removing the class.

**5. Footer spacing:** Multiple attempts to add gap between last form section and footer via padding/margin on flex containers failed due to `overflow-y-auto` scroll context. Fixed with a simple 32px spacer div.

## Open Questions

1. **Figma asset URLs in imported HTML:** Images use `figma.com/api/mcp/asset/` URLs that are temporary MCP session URLs. They'll break when the session expires. Future: auto-download + re-upload to media storage during import. Media upload is currently mock data.

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ 0 errors |
| New files exist | ✅ all present |
| Routes registered | ✅ 3 routes + 2 imports |
| Sidebar updated | ✅ Blocks item with Boxes icon |
| Manual: create block | ✅ name/slug/code/save/redirect works |
| Manual: edit block | ✅ form prefilled, save persists, reload confirms |
| Manual: delete block | ✅ modal confirmation, redirect to /blocks |
| Manual: import HTML | ✅ parses style+body, populates code field |
| Manual: preview modal | ✅ full-page render, Escape/click-outside closes |
| AC met | ✅ all criteria verified |

## Git
- Commit 1: `1928ee13` — `feat: blocks library page with CRUD, preview, and editor [WP-005C phase 1]`
- Commit 2: pending — `fix: auth ES256 support, editor UX improvements [WP-005C phase 1 polish]`
