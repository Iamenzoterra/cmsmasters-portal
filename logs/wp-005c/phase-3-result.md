# Execution Log: WP-005C Phase 3 — Theme Editor Pivot: Template Picker + Block Fills
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: 2026-03-31T22:00:00+02:00
> Duration: ~25 min
> Status: ✅ COMPLETE

## What Was Implemented

Replaced the "Content Blocks" placeholder in theme-editor with a fully functional "Page Layout" section. When no template is selected, an inline template picker shows available templates in a 2-column grid. After selection, a template info bar ("Using template: X" + "Change" button) appears above a position grid showing merged template positions (readonly) and theme block fills (editable). Block fills are managed entirely through RHF `form.setValue('block_fills', ...)` — the existing save pipeline handles persistence without modification. Also fixed theme-editor footer pinning and spacing (same issues as block-editor).

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Block fills via RHF | `form.setValue('block_fills', ...)` | Flows through existing save pipeline; `isDirty` tracks automatically |
| Template picker | Inline component, not modal | Simpler UX for selecting from a small list; modal overkill |
| Merged positions | Template positions have priority (M2 cut) | Prevents theme fills from overriding template-defined blocks |
| Fill upsert | Filter by position before insert (M1 cut) | Prevents duplicate fills for same position |
| selectedTemplate | Derived from watchedTemplateId + fetch effect (M3 cut) | Ensures discard/reset clears template display without stale state |
| Footer/spacing | Same fix as block-editor (minHeight + spacer div) | Consistent pattern across editors |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `apps/studio/src/components/template-picker.tsx` | created | Inline template selection grid with loading/empty states |
| `apps/studio/src/pages/theme-editor.tsx` | modified | Replaced placeholder with template picker + position grid + block fill handlers; fixed footer pinning + spacing |

## Issues & Workarounds

**Footer pinning + spacing:** Same issue as block-editor — `h-full` doesn't account for negative margins, and no gap between last section and footer. Applied same fixes: `minHeight: calc(100% + 2 * var(--spacing-3xl))` and 32px spacer div.

## Open Questions

None.

## Verification Results
| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ 0 errors |
| New file exists | ✅ template-picker.tsx |
| Placeholder removed | ✅ 0 matches for "coming in next update" |
| Manual: template picker | ✅ |
| Manual: position grid | ✅ |
| Manual: block fills | ✅ |
| Manual: change template | ✅ |
| Manual: save + reload | ✅ |
| Manual: existing features OK | ✅ |
| AC met | ✅ |

## Git
- Commit: `pending`
