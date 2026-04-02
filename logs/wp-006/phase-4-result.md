# Execution Log: WP-006 Phase 4 — DB Migration + Studio JS field
> Workplan: WP-006 Block Import Pipeline
> Executed: 2026-04-02
> Status: ✅ COMPLETE

## What Was Implemented
Added `js` column to `blocks` table in Supabase for storing animation/behavioral JavaScript separately from HTML/CSS. Updated types, validators, API pass-through, Studio block editor (form field, parseHtmlFile extraction, formDataToPayload, export), and import panel contract.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| `js: data.js` not `\|\| undefined` | Always send js field | M1 cut — empty string is valid, prevents phantom data on clear |
| Panel uses own `originalJs` from splitCode | Not props.js | M3 cut — prevents stale JS when code changes in panel |
| Export adds script only if `js.trim()` non-empty | Conditional script tag | M4 cut — idempotent export/import round-trip |
| `js` prop + `codeJs` fallback in panel | `jsProp \|\| codeJs` | Backwards compat for blocks with JS still in code |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `packages/db/src/types.ts` | modified | Added `js: string` to blocks Row, `js?: string` to Insert/Update |
| `packages/validators/src/block.ts` | modified | Added `js: z.string().default('')` to create, `js: z.string().optional()` to update |
| `apps/studio/src/pages/block-editor.tsx` | modified | BlockFormData js field, getDefaults, blockToFormData, formDataToPayload, parseHtmlFile extracts scripts, handleFileImport sets js, handleExport with conditional script, JS textarea UI |
| `apps/studio/src/components/block-import-panel.tsx` | modified | Props: added js, onApply signature (code, js), handleApply passes JS separately |

## Issues & Workarounds
None. Clean implementation following mine-cut plan.

## Verification Results
| Check | Result |
|-------|--------|
| API tsc | ✅ |
| Studio tsc | ✅ |
| DB migration | ✅ (ALTER TABLE ran, no errors) |
