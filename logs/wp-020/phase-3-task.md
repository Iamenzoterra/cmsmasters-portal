# WP-020 Phase 3: DB migration + visual QA

> Workplan: WP-020 Layout Maker — Nested Slots & Slot Assignment
> Phase: 3 of 6 (**RE-SEQUENCED** — originally WP Phase 4; swapped to land before portal cleanup per WP Risk #4)
> Priority: P1
> Estimated: 1-1.5 hours
> Type: Deploy (content push + revalidate + visual QA)
> Previous: Phase 2 ✅ (Layout Maker UI ships container/leaf Inspector + CreateSlotModal + Canvas nesting. Commit `ff14fb21`. No DB push yet.)
> Next: Phase 4 (Portal renderer cleanup — remove runtime injection regex + fallback hardcode; MUST land AFTER this phase's DB push + revalidate is live in prod)
> Affected domains: app-portal (read-only verification), **content/db** (push)

---

## Why this phase comes before portal cleanup

The WP originally sequenced portal cleanup as Phase 3 and DB push as Phase 4. **Brain re-sequenced**: if we remove the runtime injection regex (`apps/portal/app/themes/[slug]/page.tsx` lines 120-123) BEFORE the DB has `<div data-slot="theme-blocks">` baked into `layouts.html`, theme pages render a bare `<main data-slot="content"></main>` that `resolveSlots` never fills for `theme-blocks` → **blank content area in prod**.

**Correct order:** push new layout to DB → revalidate → verify pages still render (injection is redundant but harmless right now) → THEN remove injection code. That's the safe path per WP Risk #4.

---

## Context

Phase 1 produced a new generator output for `theme-page-layout` that includes the nested structure:

```html
<main data-slot="content"><div data-slot="theme-blocks"></div></main>
```

and removes the `[data-slot="content"] > .slot-inner` rule in favor of `[data-slot="theme-blocks"] > .slot-inner` with `--sl-theme-blocks-mw: 615px`. The Phase 1 log (`logs/wp-020/phase-1-result.md`) captured the exact new html+css output plus a diff against current DB state.

Current live DB (`content/db/layouts/theme-page-layout.json` after `content:pull`):
- `scope: "theme"` (already correct)
- `html` has `<main data-slot="content"></main>` (empty — no theme-blocks baked in)
- `slot_config.content = {}` (no `nested-slots` key)
- `slot_config.theme-blocks` — does not exist
- css still has `--sl-content-mw: 615px`

After this phase:
- `html` contains `<main data-slot="content"><div data-slot="theme-blocks"></div></main>`
- `slot_config.content = { 'nested-slots': ['theme-blocks'] }` (or equivalent — whatever Layout Maker's export produces)
- `slot_config.theme-blocks = { gap: '--spacing-2xl', 'max-width': '615px' }`
- css has `[data-slot="theme-blocks"] { ... }` + `[data-slot="theme-blocks"] > .slot-inner { ... }` + `--sl-theme-blocks-mw: 615px`

**Critical:** the portal runtime injection regex is STILL IN PLACE during this phase. That's intentional. The injection becomes a **no-op** once DB html contains `<div data-slot="theme-blocks">` (the regex only matches an empty `<main data-slot="content"></main>`). This overlap window is the safety net: if the DB push breaks something, the injection still fires and pages keep working.

```
CURRENT:
  - Layout Maker yaml + generators support nested-slots (Phase 1)   ✅
  - UI ships (Phase 2)   ✅
  - DB layouts.html = flat <main data-slot="content"></main>   ❌
  - Portal injection regex fires on every render   ⚠️ (intentional crutch — removed in Phase 4)
MISSING (Phase 3 delivers):
  - DB layouts.html contains nested structure from yaml   ❌
  - DB slot_config has nested-slots + theme-blocks entries   ❌
  - Caches busted (themes + layouts tags)   ❌
  - Visual parity verified on deployed prod   ❌
```

**What Phase 3 does NOT touch:**
- No `apps/portal/*` edits. The injection regex stays until Phase 4.
- No `apps/studio/*` edits.
- No `tools/layout-maker/*` edits (frozen after Phase 2).
- No new code anywhere — this is a content migration + verification phase.

---

## Domain Context

**app-portal** (read-only verification):
- `resolveSlots` is single-pass; it fills empty `<tag data-slot="x"></tag>` only. Once the outer `<main>` has a child, the outer is skipped and the inner empty `<div data-slot="theme-blocks">` gets filled. Confirmed in Phase 0.
- Injection regex `/(<(\w+)[^>]*\s+data-slot="content"[^>]*)>\s*<\/\2>/` only matches an **empty** `<main data-slot="content"></main>`. After this phase, the regex won't match (content is non-empty) → no-op. This is the desired overlap state.
- Portal calls `getLayoutByScope('theme')` — scope value is `"theme"` (already correct; Phase 1 yaml fix aligned the source).

**content/db:**
- `npm run content:push -- layouts` reads `content/db/layouts/*.json` and upserts into the `layouts` Supabase table.
- `slot_config: jsonb` accepts arbitrary keys (no schema migration needed for `nested-slots`).
- `layout_slots` rows are independent of `layouts.slot_config`; they reference `layout_id + slot_name`. Phase 1 finding: only `sidebar-right` has populated block overrides today (5 block UUIDs). Those must survive the push untouched.

---

## PHASE 0 of this task: Pre-push safety audit (10 min)

```bash
# 0. Baseline
npm run arch-test

# 1. Confirm the yaml + generator output haven't drifted since Phase 1
cat tools/layout-maker/layouts/theme-page-layout.yaml

# 2. Confirm current DB state (what we're replacing)
npm run content:pull -- layouts
cat content/db/layouts/theme-page-layout.json | python -m json.tool | head -60
# Check: html field, slot_config keys, scope, status

# 3. Confirm layout_slots are tracked separately (should not be overwritten by push)
grep -rn 'layout_slots' scripts/ tools/ 2>/dev/null | head -10
# If there's a content:pull/push for layout_slots, confirm this phase doesn't touch those files

# 4. Pre-change baseline screenshot — live theme page
# Grab a reference screenshot of /themes/456456 (or another known theme) for post-push diff.
# Use Playwright MCP if available, else browser + manual capture:
#   Desktop 1440, tablet 1024, mobile 375.
# Save to tools/layout-maker/ or logs/wp-020/ as `pre-phase3-desktop.png` etc.

# 5. Curl the live page HTML and record the current data-slot set
curl -sL https://portal.cmsmasters.studio/themes/456456 \
  | grep -oE 'data-slot="[^"]*"' | sort -u
# Expected BEFORE: content, footer, header, sidebar-left, sidebar-right, theme-blocks
# (theme-blocks appears because of the runtime injection)

# 6. Other scope=theme layouts — confirm this is the only one affected
grep -rn '"scope": "theme"' content/db/layouts/ | head
# Expect: only theme-page-layout.json

# 7. Any portal route that depends on a different slot shape?
grep -rn 'data-slot' apps/portal/app/ | head -20
```

Document all findings in the log before pushing anything. **If the pre-change curl does NOT show `theme-blocks` in the data-slot set, STOP** — the runtime injection isn't working and pushing new html might expose a latent bug.

---

## Task 3.1: Regenerate theme-page-layout via Layout Maker

### What to Build

Start the Layout Maker dev server, open `theme-page-layout.yaml`, and export the layout. The export writes to `content/db/layouts/theme-page-layout.json` (or produces downloadable content — check the actual ExportDialog flow per Phase 0/1 audit).

```bash
cd tools/layout-maker
npm run dev
# Browser:
#   - Open layout theme-page-layout
#   - Trigger Export (the same flow QA'd during Phase 2)
#   - Confirm exported JSON matches Phase 1's recorded output (html + css + slot_config)
#   - Save to content/db/layouts/theme-page-layout.json
```

If Layout Maker has a CLI/tsx export path (check `package.json` scripts + `tools/layout-maker/runtime/` for a standalone generator entry), prefer that over the UI click-path — reproducibility matters for Phase 4 rollback.

### Integration

The output must match Phase 1's recorded html + css exactly (modulo any subsequent yaml tweaks — there should be none). Diff the newly-exported JSON against Phase 1 log's captured strings before proceeding.

### Domain Rules

- **Do NOT hand-edit** `content/db/layouts/theme-page-layout.json`. Every byte comes from the generator.
- If the export differs materially from Phase 1's captured output, STOP and reconcile — Layout Maker may have drifted or a yaml tweak leaked in.

---

## Task 3.2: Diff the regenerated JSON vs live DB

### What to Build

Before pushing, produce a human-readable diff:

```bash
# Current live state is the content:pull result from Phase 0 step 2
# New state is the regenerated JSON from Task 3.1
git diff --no-index content/db/layouts/theme-page-layout.json.backup \
                    content/db/layouts/theme-page-layout.json \
  > logs/wp-020/phase-3-diff.patch 2>&1 || true

# Or simpler: capture before/after and paste salient fields into the log
```

Expected changes:
- `html`: now contains nested `<div data-slot="theme-blocks"></div>` inside `<main data-slot="content">`; drawer fragment may also appear (Phase 1 open question — confirm this is OK; if not, flag before push).
- `slot_config.content`: gains `"nested-slots": ["theme-blocks"]`.
- `slot_config.theme-blocks`: new entry with gap/max-width.
- `css`: swaps `--sl-content-mw` → `--sl-theme-blocks-mw`; drops `[data-slot="content"] > .slot-inner { ... }`; adds `[data-slot="theme-blocks"] > .slot-inner { ... }`.
- `scope`: unchanged (`"theme"`).
- `status`: unchanged (`"published"`).

**Unexpected changes to watch for:**
- `layout_slots` entries moving (they shouldn't — different table).
- `slot_config.header/footer/sidebar-*` losing their current `gap: '24px'` (Phase 1 yaml didn't touch these — regen should preserve them).
- Any new/unknown top-level field.

If the diff contains anything outside the expected list, STOP and document before pushing.

---

## Task 3.3: Push to DB

```bash
npm run content:push -- layouts
```

This upserts the layouts row. Watch the output for:
- Row updated (not inserted — a new row would mean scope drift)
- No errors
- Counts match expectation (1 row affected if only theme-page-layout changed)

Check pipeline logs if the push script prints them — some `content:push` flows produce a summary file at `content/db/.push-summary.json` or similar.

---

## Task 3.4: Revalidate caches

Per project auto-memory: "/revalidate defaults to all tags — on bare /revalidate, POST `{}` to invalidate every tag (themes alone misses layouts cache)."

```bash
# Invalidate ALL tags (safest for layout changes — layouts cache isn't always reachable by tag name)
curl -X POST https://portal.cmsmasters.studio/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{}'
```

Alternative (narrower): `-d '{"tags":["themes","layouts"]}'` — but the blanket `{}` is the project convention. Use it.

Record the response (should include revalidated tag count or a 200 status).

---

## Task 3.5: Visual QA — deployed prod

### What to Build

Screenshot the deployed theme page at three breakpoints, compare against Phase 0 pre-change baseline.

```bash
# Using Playwright MCP (preferred) or local Playwright:
# Desktop
#   Navigate to https://portal.cmsmasters.studio/themes/456456
#   Viewport 1440x900
#   Full-page screenshot → logs/wp-020/post-phase3-desktop.png
# Tablet
#   Viewport 1024x1366
#   Full-page screenshot → logs/wp-020/post-phase3-tablet.png
# Mobile
#   Viewport 375x812
#   Full-page screenshot → logs/wp-020/post-phase3-mobile.png
```

Compare visually to the Phase 0 pre-change screenshots. **Expected: pixel-level parity.** Any visible drift is a regression.

Common visible diffs to investigate if they appear:
- `max-width` on content body shifted → likely the 615px migrated to `theme-blocks` incorrectly; check `--sl-theme-blocks-mw` vs prior `--sl-content-mw`.
- Gap between theme blocks changed → `theme-blocks.gap: '--spacing-2xl'` in yaml vs prior inherited behavior; might need tuning.
- Sidebars or header shifted → unrelated; something else got disturbed in the push.

If there's drift, do NOT revert immediately — diagnose first. Options:
1. Small yaml tweak (gap, max-width, padding) → re-export → re-push → re-revalidate.
2. If the diff is structural (missing element, CSS rule dropped), rollback via `content:push` of the backup JSON.

### Domain Rules

- **Visual parity is a hard gate.** Per auto-memory: "Visual QA — never ship broken screenshots. Critically evaluate full screenshot before marking done, don't just tick checkboxes."
- A "close enough" screenshot diff is not acceptable. If it looks different, it IS different — investigate.

---

## Task 3.6: Regression scan

### What to Build

```bash
# 1. Confirm no other scope=theme layouts exist (Phase 0 already verified — reconfirm)
grep -rn '"scope": "theme"' content/db/layouts/ | head

# 2. Pull layouts again — did anything unexpected change server-side?
npm run content:pull -- layouts
git diff content/db/layouts/theme-page-layout.json
# Expect: empty diff (what we pushed is what's there)

# 3. Curl the live page and confirm data-slot set
curl -sL https://portal.cmsmasters.studio/themes/456456 \
  | grep -oE 'data-slot="[^"]*"' | sort -u
# Expected AFTER: content, footer, header, sidebar-left, sidebar-right, theme-blocks
# (same as before — theme-blocks is now structural, not injected)

# 4. Confirm <main data-slot="content"><div data-slot="theme-blocks"> pattern is in the rendered HTML
curl -sL https://portal.cmsmasters.studio/themes/456456 \
  | grep -o 'data-slot="content"[^>]*><div data-slot="theme-blocks"'
# Expect: non-empty match

# 5. Check for other theme pages (if any) — regression on each
# Grab a list from the portal:
curl -sL https://portal.cmsmasters.studio/themes | grep -oE '/themes/[a-z0-9-]+' | sort -u | head -10
# For each, curl the page and confirm the structure above.
```

Document all curl outputs in the log. The `<main data-slot="content"><div data-slot="theme-blocks">` match is the smoking gun that confirms DB html is now structural.

---

## Files to Modify / Create

- `content/db/layouts/theme-page-layout.json` — **modified**: regenerated from Layout Maker
- `logs/wp-020/phase-3-diff.patch` — **created**: diff of DB row before/after (optional but recommended)
- `logs/wp-020/pre-phase3-{desktop,tablet,mobile}.png` — **created**: baseline screenshots
- `logs/wp-020/post-phase3-{desktop,tablet,mobile}.png` — **created**: post-push screenshots
- `logs/wp-020/phase-3-result.md` — **created**: this phase's log
- **No source code changes.** No `apps/*`, `packages/*`, `tools/*` edits.

---

## Acceptance Criteria

- [ ] `content/db/layouts/theme-page-layout.json` regenerated from yaml; matches Phase 1 captured output byte-for-byte (modulo expected timestamps).
- [ ] `npm run content:push -- layouts` succeeded, row updated (not inserted).
- [ ] Revalidate call returned 200.
- [ ] Live page HTML contains `<main data-slot="content"><div data-slot="theme-blocks">` (confirmed via curl).
- [ ] `curl | grep -oE 'data-slot="[^"]*"' | sort -u` output matches pre-change set: `content, footer, header, sidebar-left, sidebar-right, theme-blocks`.
- [ ] Visual QA: desktop (1440), tablet (1024), mobile (375) screenshots match pre-change baseline. No visible regressions.
- [ ] `layout_slots` rows untouched (sidebar-right still has its 5 blocks).
- [ ] `slot_config.{header,footer,sidebar-left,sidebar-right}` still have their `gap: '24px'` values.
- [ ] Runtime injection in `apps/portal/app/themes/[slug]/page.tsx` is now a **no-op** (regex doesn't match because content is non-empty) — runs harmlessly on every render. Do NOT remove yet (Phase 4).
- [ ] `npm run arch-test` baseline unchanged (377 pass / 7 pre-existing).
- [ ] No code files modified — `git diff --stat apps/ packages/ tools/` is empty.

---

## MANDATORY: Verification

```bash
echo "=== Phase 3 Verification ==="

# 1. Arch tests — baseline hold
npm run arch-test
echo "(expect: 377 passed / 7 pre-existing CC failures)"

# 2. Confirm only the layouts JSON changed (nothing else)
git status --short | grep -v '^??' | grep -v 'logs/wp-020'
echo "(expect: only content/db/layouts/theme-page-layout.json modified)"

# 3. Live page structural check
curl -sL https://portal.cmsmasters.studio/themes/456456 \
  | grep -o 'data-slot="content"[^>]*><div data-slot="theme-blocks"'
echo "(expect: non-empty match)"

# 4. Data-slot set unchanged
curl -sL https://portal.cmsmasters.studio/themes/456456 \
  | grep -oE 'data-slot="[^"]*"' | sort -u
echo "(expect: content, footer, header, sidebar-left, sidebar-right, theme-blocks)"

# 5. Screenshots exist (at least 3 post-)
ls -la logs/wp-020/post-phase3-*.png
echo "(expect: 3 files — desktop, tablet, mobile)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

Create `logs/wp-020/phase-3-result.md`:

```markdown
# Execution Log: WP-020 Phase 3 — DB migration + visual QA

> Epic: Layout Maker — Nested Slots & Slot Assignment
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: content/db (push), app-portal (read-only verification)

## What Was Implemented
{2-5 sentences.}

## Pre-push Safety Audit
- current DB state (html/slot_config summary): ...
- pre-change curl data-slot set: ...
- pre-change screenshots captured: ...

## Export + Diff
### Regenerated JSON — key fields
```json
{html, slot_config, scope, status}
```

### Diff vs live DB (salient lines)
{before → after bullets}

### Unexpected fields? 
{"None" if clean, else list}

## Push + Revalidate
- `npm run content:push -- layouts` output: ...
- Revalidate response: ...

## Visual QA
| Breakpoint | Pre-change | Post-change | Match? |
|---|---|---|---|
| Desktop (1440) | pre-phase3-desktop.png | post-phase3-desktop.png | ✅/❌ |
| Tablet (1024) | pre-phase3-tablet.png | post-phase3-tablet.png | ✅/❌ |
| Mobile (375) | pre-phase3-mobile.png | post-phase3-mobile.png | ✅/❌ |

{Include inline thumbnail references or side-by-side notes.}

## Regression Scan
- `<main data-slot="content"><div data-slot="theme-blocks">` match: ✅/❌
- data-slot set unchanged: ✅/❌
- other scope=theme layouts scanned: ...
- layout_slots untouched (sidebar-right has 5 blocks): ✅/❌
- slot_config gap values preserved: ✅/❌

## Runtime Injection Status
- Regex in page.tsx is now a no-op (content is non-empty). Confirmed by: ...
- NOT removed in this phase (Phase 4 handles removal).

## Issues & Workarounds
{"None" if clean.}

## Open Questions
{"None" if none.}

## Verification Results
| Check | Result |
|---|---|
| arch-test baseline | ✅/❌ |
| Only layouts JSON changed | ✅/❌ |
| Live page has nested structure | ✅/❌ |
| data-slot set match | ✅/❌ |
| 3 post-change screenshots saved | ✅/❌ |
| Visual parity desktop/tablet/mobile | ✅/❌ |

## Rollback Plan (if needed)
Backup JSON at `content/db/layouts/.phase3-backup/theme-page-layout.json` (or equivalent). Rollback:
  cp .phase3-backup/theme-page-layout.json content/db/layouts/theme-page-layout.json
  npm run content:push -- layouts
  curl -X POST .../api/revalidate -d '{}'

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
# Before push: keep a backup of current DB state for rollback
mkdir -p content/db/layouts/.phase3-backup
cp content/db/layouts/theme-page-layout.json content/db/layouts/.phase3-backup/

# After successful push + visual QA:
git add content/db/layouts/theme-page-layout.json \
        logs/wp-020/phase-3-result.md \
        logs/wp-020/phase-3-diff.patch \
        logs/wp-020/post-phase3-*.png \
        logs/wp-020/pre-phase3-*.png

git commit -m "chore(layouts): migrate theme-page-layout to nested-slots structure [WP-020 phase 3]"
```

Do NOT stage `.phase3-backup/` — it's local-only rollback material.

---

## IMPORTANT Notes for CC

- **This is a content migration, not a code change.** If you find yourself editing `.ts`/`.tsx` files, STOP — that's Phase 4.
- **The runtime injection in `apps/portal/app/themes/[slug]/page.tsx` stays untouched this phase.** Its regex becomes a no-op once content is non-empty; that's the safety overlap window. Removal is Phase 4.
- **Take the pre-change screenshots BEFORE running `content:push`.** Once pushed + revalidated, you can't recover the pre-change render state cheaply.
- **Visual parity is non-negotiable.** Per project auto-memory: don't just tick the checkbox; critically evaluate the full screenshot. If something looks off, diagnose before proceeding.
- **Use `/revalidate` with empty body `{}`** per project convention (not `{tags:[...]}` which can miss caches).
- **Keep a local backup of the pre-push JSON** at `content/db/layouts/.phase3-backup/theme-page-layout.json`. This gives us a one-command rollback if Phase 4 surfaces anything the visual QA missed.
- **Drawer fragment open question (from Phase 1)**: the regenerated html now includes the drawer fragment, but the current DB html may not. If the diff surfaces the drawer HTML as new, confirm the portal page doesn't double-render drawers (search for drawer logic in `apps/portal/app/themes/[slug]/page.tsx` or layout shell). If double-rendering is a risk, flag it and pause before push — we may need a yaml tweak before going live.
- **DO NOT touch `layout_slots`.** Different table, different content:pull/push flow. Phase 3 only moves the `layouts` row.
- **Re-sequencing rationale**: Brain swapped WP Phases 3↔4 to eliminate the blank-page risk window. Phase 4 (portal cleanup) can only happen once this DB state is live in prod.
