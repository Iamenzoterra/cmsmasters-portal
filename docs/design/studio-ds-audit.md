# Studio App — Design System Audit

> Audited: 2026-04-01 | 45 files under `apps/studio/`

## Summary

| Category | DS / Tokens | Hardcoded | Ratio |
|----------|------------|-----------|-------|
| **Colors** | 623 semantic class/var refs | 2 hex + 11 rgba = **13 hardcoded** | ~98% DS |
| **Typography** | font-size/line-height via `var(--text-*)` tokens | `fontFamily: "'Manrope'"` repeated **143 times** across 28 files | Font family is the big miss |
| **Spacing** | Heavy `var(--spacing-*)` usage | 2 arbitrary pixel values (`w-[320px]`, `gap-[5px]`) | ~99% DS |
| **Shadows** | 0 token usage | **11 hardcoded** `rgba()` box-shadows | 0% DS |
| **Components** | Only `Button` from `@cmsmasters/ui` (13 imports) | Everything else is hand-built | ~5% DS components |
| **Inline styles** | Most reference tokens via `var(--*)` | **359 total** `style={{}}` props (vs Tailwind classes) | Heavy inline pattern |

## Key Findings

### 1. `fontFamily: "'Manrope', sans-serif"` — 143 occurrences across 28 files

The font is set once in `globals.css` on `body`, but then re-declared on nearly every styled element via inline styles. This is completely redundant and should be removed — the body inherits it.

**Files affected:** `block-editor.tsx` (17), `login.tsx` (12), `blocks-list.tsx` (11), `templates-list.tsx` (12), `template-editor.tsx` (10), `theme-editor.tsx` (15), `block-picker-modal.tsx` (6), `delete-confirm-modal.tsx` (4), `template-picker.tsx` (6), `position-grid.tsx` (4), `editor-sidebar.tsx` (5), `media.tsx` (5), `sidebar.tsx` (3), `chip-select.tsx` (3), `themes-list.tsx` (7), `theme-card.tsx` (5), `topbar.tsx` (4), `editor-footer.tsx` (2), `error-boundary.tsx` (2), `not-found.tsx` (2), `form-section.tsx` (1), `char-counter.tsx` (1), `pagination.tsx` (1), `star-rating.tsx` (1), `status-badge.tsx` (1), `themes-table.tsx` (1), `themes-toolbar.tsx` (1), `toast.tsx` (1).

### 2. Box shadows — 11 hardcoded rgba values, zero tokens

Every shadow is a raw `rgba(0,0,0,...)` string. No `--shadow-*` tokens exist or are used.

| File | Value |
|------|-------|
| `login.tsx:15` | `0px 8px 32px 0px rgba(0,0,0,0.03), 0px 2px 12px 0px rgba(0,0,0,0.04)` |
| `login.tsx:200` | `0px 4px 12px rgba(21,31,79,0.25)` |
| `blocks-list.tsx:246` | `0px 2px 8px 0px rgba(0,0,0,0.06)` |
| `templates-list.tsx:179` | `0px 2px 8px 0px rgba(0,0,0,0.06)` |
| `theme-card.tsx:20` | `0px 2px 8px 0px rgba(0,0,0,0.06)` |
| `block-editor.tsx:687` | overlay `rgba(0,0,0,0.6)` |
| `block-editor.tsx:698` | `0 25px 50px rgba(0,0,0,0.25)` |
| `block-picker-modal.tsx:43` | overlay `rgba(0,0,0,0.6)` |
| `block-picker-modal.tsx:55` | `0 25px 50px rgba(0,0,0,0.25)` |
| `delete-confirm-modal.tsx:21` | overlay `rgba(0, 0, 0, 0.4)` |
| `delete-confirm-modal.tsx:33` | `0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)` |

### 3. Only `Button` imported from `@cmsmasters/ui`

13 files import `Button`. No other shared components (Input, Badge, Dialog, Card, Select, etc.) are used. All modals, forms, cards, sidebars, tables, toolbars, and pagination are hand-built with inline styles.

### 4. Inline style-heavy architecture (359 `style={{}}` props)

The app uses tokens correctly for colors/spacing values, but delivers them via inline `style={{}}` instead of Tailwind utility classes. This makes the CSS non-cacheable, hard to override, and inconsistent with the rest of the portal.

**Worst offenders by inline style count:**
- `block-editor.tsx` — 46
- `template-editor.tsx` — 28
- `templates-list.tsx` — 23
- `login.tsx` — 22
- `blocks-list.tsx` — 20
- `editor-sidebar.tsx` — 19
- `media.tsx` — 16
- `theme-editor.tsx` — 46 (estimated from var count)

### 5. Two true hardcoded hex colors

- `#218721` (published status green) in `status-badge.tsx:7` and `toast.tsx:79`
- Noted with a comment: "Figma uses #218721. Replace this fallback once token is fixed."

### 6. Modal overlays use raw `rgba(0,0,0,0.4-0.6)`

Three separate modal components each hardcode their own overlay opacity:
- `block-editor.tsx` — `rgba(0,0,0,0.6)`
- `block-picker-modal.tsx` — `rgba(0,0,0,0.6)`
- `delete-confirm-modal.tsx` — `rgba(0, 0, 0, 0.4)`

## Recommended Fixes (by priority)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | Delete 143 redundant `fontFamily` declarations | Cleaner code, body inherits | Low |
| 2 | Create `--shadow-*` tokens, replace 11 hardcoded shadows | Consistent elevation system | Medium |
| 3 | Replace inline `style={{}}` with Tailwind classes using tokens | Cacheable CSS, consistent patterns | High (359 instances) |
| 4 | Use more `@cmsmasters/ui` components (Input, Dialog, Card, Badge) | Consistency across apps | High |
| 5 | Create `--overlay-*` token for modal backdrops | Single source of truth | Low |
| 6 | Replace `#218721` with proper status token once available | Token coverage | Low |
