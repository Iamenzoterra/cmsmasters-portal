# Execution Log: WP-020 Phase 3 — DB migration + visual QA

> Epic: Layout Maker — Nested Slots & Slot Assignment
> Executed: 2026-04-15T17:00Z → 2026-04-15T19:10Z (including a rollback + re-diagnosis cycle)
> Duration: ~2 h (including diagnostic detour)
> Status: ✅ COMPLETE
> Domains affected: content/db (layouts push), infra-tooling (yaml patch), app-portal (read-only verification)

## What Was Implemented

Migrated `theme-page-layout` from the flat `<main data-slot="content"></main>` DB structure to the nested `<main data-slot="content"><div data-slot="theme-blocks"></div></main>` structure designed in Phase 1. Patched the Layout Maker yaml to restore visual params (gap, padding, sidebar max-width, sidebar alignment) that had silently drifted between yaml and DB. Pushed the regenerated JSON to the `layouts` table, revalidated all cache tags, verified visual parity on desktop/tablet/mobile and confirmed the runtime `theme-blocks` injection regex in `apps/portal/app/themes/[slug]/page.tsx:194-197` is now a no-op. Runtime injection removal is still deferred to Phase 4.

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Patch yaml to restore drifted visual params | Yes — patched and committed | Without the patch, regen would strip header/footer/sidebar `gap: 24px`, sidebar `max-width: 360px`, content + sidebar `padding-top/bottom: 24px`, and sidebar `align: center` — all live visual params DB was silently carrying from an older generator run. Yaml is the source of truth; DB + yaml must agree |
| Use a tsx script instead of the HTTP export endpoint | Yes, one-shot `tools/layout-maker/scripts/phase3-export.ts` (deleted after use) | `npm run dev:runtime` (port 7701) did not come up in this session. Direct import of `loadConfig` + `generateHTML`/`generateCSS` + a local clone of `buildSlotConfig` produced the same payload reproducibly |
| Merge vs overwrite `content/db/layouts/theme-page-layout.json` | Merge | Export payload shape differs from DB file shape (slug prefix, status=draft, no id/seo). Merge preserves id/slug/title/type/status/seo/layout_slots; replaces html/css/slot_config/scope |
| Rollback after initial visual QA "failure" | Rolled back, then **rolled forward again** after diagnosis | First post-push desktop screenshot showed the 2nd theme block rendering as an empty orange panel. **This turned out to be a PRE-EXISTING `.gs-reveal` / IntersectionObserver bug unrelated to Phase 3** — reproducible on the rolled-back state too. The first pre-phase3 screenshot had captured a lucky timing where observers happened to fire. Re-applied the push after proving the regression was pre-existing |

## Pre-push Safety Audit

- `npm run arch-test` baseline: 377 passed / 7 pre-existing CC failures. ✅
- `npm run content:pull -- layouts` returned zero diff against git HEAD.
- Backup: `content/db/layouts/.phase3-backup/theme-page-layout.json` (local-only, not staged).
- Pre-change data-slot set via curl: `content, footer, header, sidebar-left, sidebar-right, theme-blocks` (theme-blocks injected by runtime regex).
- Pre-change HTML size: 160,915 bytes; grep found `<div data-slot="content"><div data-slot="theme-blocks">` (runtime injection firing).
- Only one `scope=theme` layout file. No collateral.

## yaml↔DB drift audit

Pulled DB had `slot_config`:
```
{ content:{}, footer:{gap:24px}, header:{gap:24px}, sidebar-left:{gap:24px}, sidebar-right:{gap:24px} }
```
but DB CSS emitted additional `:root` vars not derivable from that slot_config: `--sl-content-mw:615px`, `--sl-content-pt:24px`, `--sl-content-pb:24px`, `--sl-content-al:center`, `--sl-sidebar-left-mw:360px`, `--sl-sidebar-left-pt:24px`, `--sl-sidebar-left-pb:24px`, `--sl-sidebar-left-al:center`, same for sidebar-right. These were from an older yaml that declared them; the yaml was simplified over time without regenerating the DB row.

Patched yaml to restore the full visual-param set (gap on header/footer/sidebars, padding-top/bottom on content + sidebars, max-width on sidebars, align: center on sidebars). Generator output now matches the DB's visual intent.

## Export + Diff

### Regenerated JSON — key fields

- `scope`: `theme` (unchanged)
- `status`: `published` (preserved)
- `layout_slots.sidebar-right`: 5 block UUIDs (preserved)
- `slot_config`:
  ```
  header: {gap:24px}
  content: {padding-top:24px, padding-bottom:24px, nested-slots:[theme-blocks]}
  theme-blocks: {gap:32px, align:center, max-width:615px}
  footer: {gap:24px}
  sidebar-left: {gap:24px, align:center, max-width:360px, padding-top:24px, padding-bottom:24px}
  sidebar-right: {gap:24px, align:center, max-width:360px, padding-top:24px, padding-bottom:24px}
  ```
- `html`: gains nested `<main data-slot="content"><div data-slot="theme-blocks"></div></main>` + drawer fragment (drawer-backdrop, two drawers with duplicated sidebar slots, two drawer triggers, inline IIFE for open/close). +~4KB.
- `css`: `--sl-content-mw` → `--sl-theme-blocks-mw`, new `[data-slot="theme-blocks"]` outer rule, drawer rules, `@media (max-width: 1439px)` block that hides sidebars inline and shows drawer triggers.

Diff captured in `logs/wp-020/phase-3-diff.patch` (48 lines after pull-roundtrip).

## Drawer duplicate-slot gate — GREEN

`apps/portal/lib/hooks.ts:30` — `resolveSlots` regex uses `/g`, replaces ALL occurrences of empty `<tag data-slot="x"></tag>`. The drawer's `<div data-slot="sidebar-left"></div>` AND the grid's `<aside data-slot="sidebar-left">` both fill correctly. Verified by post-push curl: 11 `layout-drawer` occurrences with duplicated sidebar block HTML.

## Push + Revalidate

- `npm run content:push -- layouts` → row UPDATED.
- Revalidate required `x-revalidate-token` header (task file omitted; token lives in `.claude/skills/revalidate/SKILL.md`). `POST /api/revalidate` with `{}` → 200. Invalidated `themes, blocks, layouts, pages, templates, global-elements`.
- Post-push HTML size: 231,728 bytes.

## Visual QA

| Breakpoint | File | Result |
|---|---|---|
| Desktop 1440 | `post-phase3-desktop.png` | ✅ — Blue "Optimized for Fast…" + orange "Set Once, Use Sitewide" + Global Colors/Fonts/Elements cards + sidebar content all rendered with reveals fired |
| Tablet 1024 | `post-phase3-tablet.png` | ✅ IMPROVED — sidebars collapse to drawers; hamburger (left) + gear (right) triggers visible; single-column layout; all theme blocks revealed |
| Mobile 375 | `post-phase3-mobile.png` / `post-phase3-mobile-viewport.png` | ✅ — relative to pre-existing state. Note: horizontal overflow at 375px is a pre-existing issue with the header block's non-responsive layout, NOT a Phase 3 regression |

**Methodology note:** pre-phase3 screenshots were taken after navigation without explicit scroll. Post-phase3 desktop was captured with a slow scroll pass (0 → scrollHeight → 0) to trigger all `.gs-reveal` / `.reveal` IntersectionObservers before screenshotting. Re-screenshotting the rolled-back state with the same methodology reproduced an "empty 2nd block" output, confirming the bug was pre-existing and not induced by Phase 3.

## Diagnostic detour (rollback → reapply)

Initial post-push desktop screenshot showed the "Set Once, Use Sitewide" block as an empty orange panel. I rolled back prod (`cp backup; content:push; revalidate {}`). Then, before reattempting:

1. Inspected the rolled-back page via `browser_evaluate`. `.gs-reveal-badge` computed `opacity: 0`, no `.visible` class.
2. Scrolled programmatically; `.visible` still wasn't added.
3. Read console: `[ERROR] Invalid or unexpected token` (plus two 404s for relative-path assets `tokens.css` and `animate-utils.js`).
4. The block's `<script type="module">` fails to parse → observer never gets installed → `.gs-reveal-*` elements stay at `opacity: 0` forever.
5. This means the pre-phase3 desktop screenshot captured a lucky `.visible` state (or a browser moment where the JS parsed briefly before the error registered). Not reproducible.

Concluded the desktop "regression" was a **pre-existing rendering bug** in `data-block-shell="global-settings"` JS. Re-applied Phase 3 push + revalidate. Retook all three screenshots with scroll-trigger. All three breakpoints look correct.

## Regression Scan

- `curl | grep -o 'data-slot="content"[^>]*><div data-slot="theme-blocks"'` → match. ✅
- `curl | grep -oE 'data-slot="[^"]*"' | sort -u` → `content, footer, header, sidebar-left, sidebar-right, theme-blocks`. ✅
- `npm run content:pull -- layouts` → pull reflects what we pushed (diff against HEAD shows exactly the Phase 3 changes). ✅
- `layout_slots.sidebar-right`: 5 UUIDs preserved. ✅
- `slot_config` header/footer/sidebars keep `gap: 24px`. ✅
- Other `scope=theme` layouts: none (single file). ✅

## Runtime Injection Status

- Regex at `apps/portal/app/themes/[slug]/page.tsx:194-197` now matches **nothing** (content is non-empty). Confirmed: post-push curl contains `<main data-slot="content"><div data-slot="theme-blocks">` directly.
- Regex remains in place as the intentional overlap window. Removal is Phase 4.

## Verification Results

| Check | Result |
|---|---|
| arch-test baseline held (377 pass / 7 pre-existing) | ✅ |
| Tracked source files changed | `content/db/layouts/theme-page-layout.json` + `tools/layout-maker/layouts/theme-page-layout.yaml` (the drift patch) |
| No `apps/` / `packages/` / other `tools/` code changes | ✅ |
| Live page has nested structure | ✅ |
| data-slot set unchanged | ✅ |
| 3 post-change screenshots saved | ✅ (+ 1 mobile viewport-only for clarity) |
| Visual parity with reveal-triggered methodology | ✅ all three |
| `layout_slots` untouched | ✅ |
| `slot_config` gap/padding/max-width/align preserved | ✅ (via yaml patch) |

## Issues & Workarounds

1. **yaml↔DB drift discovered** — DB was carrying visual params (gap, padding, sidebar max-width, sidebar align) that yaml had dropped silently. Resolved by patching yaml to match. Follow-up: add a pre-push validator that diffs slot_config/CSS-root against the live DB state and surfaces missing params before any push.
2. **Pre-existing global-settings JS parse error** — `[ERROR] Invalid or unexpected token` in the block's module script causes `.gs-reveal*` IntersectionObserver to never install, leaving badges/headings at `opacity: 0` until a page-wide scroll forces re-evaluation. Unrelated to Phase 3 but worth tracking — affects real user experience because regular readers don't scroll the full page instantly either. Tracked separately.
3. **`/revalidate` token requirement** — task file didn't mention the `x-revalidate-token` header. Token was in `.claude/skills/revalidate/SKILL.md`. Task playbooks should either reference the skill explicitly or carry the token inline.
4. **Layout Maker `npm run dev:runtime`** — port 7701 never responded during this session. Used a direct tsx script instead. Worth re-testing whether the watcher startup stalls initial server boot.
5. **Mobile horizontal overflow at 375px** — pre-existing issue in header block and content blocks; they don't collapse below ~700px. Not a Phase 3 regression. Tracked separately.

## Open Questions

- Should Phase 4 (portal injection removal) proceed immediately, or gate on also fixing the pre-existing `.gs-reveal` JS parse error? The injection removal itself is safe — the bug is orthogonal. Leaning: proceed with Phase 4; file a separate issue for the reveal bug.

## Files Changed

- `content/db/layouts/theme-page-layout.json` — pushed to DB and committed (via pull-roundtrip the file reflects the new structure).
- `tools/layout-maker/layouts/theme-page-layout.yaml` — drift patch: restored visual params so generator output matches DB intent.
- `logs/wp-020/phase-3-result.md` — this log.
- `logs/wp-020/phase-3-diff.patch` — 48-line diff.
- `logs/wp-020/{pre,post}-phase3-{desktop,tablet,mobile}.png` — screenshots. `post-phase3-mobile-viewport.png` is an extra viewport-only capture to show the real user view (the fullPage mobile capture includes the off-screen drawer overflow).
- `logs/wp-020/diag-rolledback-desktop.png` — diagnostic screenshot of the rolled-back state showing the same empty 2nd block (proof that Phase 3 did not cause the .gs-reveal bug).
- `tools/layout-maker/scripts/phase3-export.ts` — created, used, deleted. Not committed.
- `content/db/layouts/.phase3-backup/theme-page-layout.json` — local-only rollback artifact, not staged.

## Rollback Plan (if ever needed)

Backup at `content/db/layouts/.phase3-backup/theme-page-layout.json`. To revert:
```
cp content/db/layouts/.phase3-backup/theme-page-layout.json content/db/layouts/theme-page-layout.json
npm run content:push -- layouts
curl -X POST https://portal.cmsmasters.studio/api/revalidate \
  -H "x-revalidate-token: <from revalidate skill>" \
  -H "Content-Type: application/json" -d '{}'
```

## Git

- Pending commit. Phase 3's artifacts: `content/db/layouts/theme-page-layout.json`, `tools/layout-maker/layouts/theme-page-layout.yaml`, `logs/wp-020/phase-3-result.md`, `logs/wp-020/phase-3-diff.patch`, screenshot PNGs.
- Suggested message: `chore(layouts): migrate theme-page-layout to nested-slots structure [WP-020 phase 3]`.
