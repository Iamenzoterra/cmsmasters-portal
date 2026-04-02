# Execution Log: WP-003 Phase 2 — Themes List Page
> Epic: Layer 1 — Content Studio
> Executed: 2026-03-29T19:30:00+02:00
> Duration: ~20 minutes
> Status: ⚠️ PARTIAL — tsc clean, all components built; Supabase data fetch untestable on localhost without auth

## What Was Done

Replaced themes-list placeholder with full working page: grid/table views, search, status filter, pagination, status badges. First page that talks to the database.

## Machete Mines Cut

| Mine | What | Resolution |
|------|------|------------|
| M1 — RLS silent-empty | 3 distinct states: error (fetch/RLS fail), empty (no themes in DB), no-matches (filters yield 0) | Each renders differently; error shows message + retry |
| M2 — Theme import drift | Verified `Theme` and `ThemeStatus` exported as convenience aliases from `@cmsmasters/db` | `types.ts:228` — `type Theme = Database['public']['Tables']['themes']['Row']` |
| M3 — direct query bypass | `fetchAllThemes()` in `src/lib/queries.ts` with explicit comment explaining why not `getThemes()` | Single app-level wrapper, clearly marked as staff query |
| M4 — debounce misplaced | Toolbar is dumb (no own state). Page owns search/filter/viewMode/page. No debounce — client-side filter is instant | Toolbar only receives values + callbacks |
| M5 — page reset bug | `useEffect(() => { setPage(1) }, [search, statusFilter])` | Page resets to 1 on any filter/search change |
| M6 — published badge rot | `PUBLISHED_TEXT_FALLBACK = '#218721'` as isolated constant with TODO comment | Single hardcode, one place, flagged for token sync |
| M7 — table visual drift | Grid and table both consume `paginatedThemes` from same derived pipeline | `allThemes → filteredThemes → paginatedThemes` computed once, passed to both views |

## Figma Frames Read (gate)

| Frame | Node ID | Key Specs |
|-------|---------|-----------|
| Studio / Themes List — Grid | 3283:53 | Page gap 24px (xl), toolbar gap 12px (sm), search 300px h-40, filter 160px, toggle 36x36, grid 3-col justify-between 24px row-gap |
| Theme Card | 3280:19 | 360px (352 in grid), thumbnail h-225 bg surface-alt, content p-16 gap-10, title 18px SemiBold, tagline 13px, shadow 0 2px 8px 6%, rounded-xl |
| Status Badge | from memory | Pill 9999px, px-10 py-3, 5px dot, 12px SemiBold. Published: bg success-bg, text #218721. Draft: bg warn-bg, text warn-fg. Archived: bg surface-alt, text muted |

## Files Created/Modified

### New: 7 files
```
apps/studio/src/
├── lib/
│   ├── queries.ts       — fetchAllThemes, fetchThemeBySlug (single fetch point)
│   └── format.ts        — timeAgo, formatPrice helpers
└── components/
    ├── status-badge.tsx  — 3 variants with dot indicator
    ├── theme-card.tsx    — Figma-matched grid card
    ├── themes-toolbar.tsx — search + filter + toggle (dumb)
    ├── themes-table.tsx  — minimal table view
    └── pagination.tsx    — client-side page nav
```

### Replaced: 1 file
- `apps/studio/src/pages/themes-list.tsx` — placeholder → full implementation

## Verification

| Check | Result |
|-------|--------|
| tsc --noEmit | ✅ Clean |
| Placeholder removed | ✅ 0 matches for "Coming in Phase 2" |
| Single fetch point | ✅ `.from('themes')` only in queries.ts |
| fetchAllThemes consumed | ✅ imported + called in themes-list.tsx |
| All 7 new files exist | ✅ |
| No deep imports | ✅ grep clean |

### Manual (PENDING — requires Supabase + auth)
- [ ] Grid view shows theme cards from DB
- [ ] Status badges: Draft=yellow, Published=green, Archived=grey
- [ ] Search filters by name
- [ ] Status filter works
- [ ] Grid/Table toggle shows same filtered data
- [ ] Create Theme → /themes/new
- [ ] Card click → /themes/{slug}
- [ ] Empty state when no themes
- [ ] No-matches state when filters yield 0
- [ ] Page resets to 1 on filter change (M5)
- [ ] Pagination works when >12 themes

## Token Mine Flagged

`--status-success-fg: 118 45% 89%` in tokens.css is too light for text (bg-level green). Published badge uses hardcoded `#218721` as `PUBLISHED_TEXT_FALLBACK`. Needs fix in next token sync.

## Git
- Commit: `63bcf379` — `feat(studio): themes list page — grid, search, filter, status badges [WP-003 phase 2]`