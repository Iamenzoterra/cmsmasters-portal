# WP-026 CDN-URL-drift chip — resolution

**Spawned:** during Phase 4 close (QA note in result log)
**Resolved:** 2026-04-23
**Outcome:** false-positive premise + unrelated real issue backfilled

## What the chip claimed
content/db/blocks/fast-loading-speed.json had URL drift:
pub-*.r2.dev → assets.cmsmasters.studio, pulled locally but never
committed. Action requested: /content-pull + diff + commit.

## What was actually true
1. No URL drift in DB. fast-loading-speed.json still has 2 instances
   of pub-c82d...r2.dev; zero instances of assets.cmsmasters.studio.
   Pull produced byte-identical files (git CRLF noise only).
2. The r2.dev → assets.cmsmasters.studio migration was code-level:
   apps/portal/lib/hooks.ts + apps/portal/app/themes/[slug]/page.tsx
   added rewriteImages() in commit a69f99a8. URLs rewrite at render
   time; DB rows unchanged by design.

## Unrelated real issue found
6 blocks exist in DB but were never tracked in repo. 4 of them
(theme-details, theme-tags, sidebar-perfect-for, sidebar-help-support)
are actively wired into theme-page-layout.sidebar-right — production
renders them today, repo would drop them on next content:push.

## Action taken
Backfilled the 6 snapshots via /content-pull + explicit git add +
atomic commit. See commit a7f26f65.

## Lessons
- /ac audits + Phase-close QA notes that assume DB drift should cross-
  check the rendering pipeline first. `rewriteImages` was the recent
  migration vector for hostname changes.
- `content:push` is destructive-by-omission: any block in DB without a
  repo snapshot can be wiped on the next push. Future sessions should
  periodically sweep `git status` after a clean pull for untracked
  JSONs in content/db/blocks/ as a safety net.
