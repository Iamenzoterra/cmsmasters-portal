# WP-005D Phase 0: RECON — Portal Scaffold Readiness

> Workplan: WP-005D — Astro Portal + Content Seed
> Phase: 0 of 5
> Priority: P0
> Estimated: 0.5 hours
> Type: Audit
> Previous: WP-005C ✅ (Studio Blocks/Templates CRUD, Theme Editor pivot)
> Next: Phase 1 (Astro App Scaffold + Data Fetching)

---

## Context

WP-005C completed the Studio: CM can manage blocks, templates, and themes. The full content pipeline is ready backend-side. Now we build `apps/portal/` — an Astro SSG app that fetches published themes from Supabase at build time, resolves template + block positions, renders HTML+CSS blocks with hook substitution, and outputs pure static pages.

Before touching any files, we need to verify the environment is ready:

```
CURRENT:  blocks + templates tables in Supabase, CRUD API   ✅
CURRENT:  Studio manages blocks/templates/themes (WP-005C)   ✅
CURRENT:  Hono API routes: /api/blocks, /api/templates, /api/themes   ✅
MISSING:  apps/portal/ — no Astro app exists yet   ❌
UNKNOWN:  Astro + Nx integration approach   ?
UNKNOWN:  Supabase anon key access for blocks/templates (RLS)   ?
UNKNOWN:  CORS for localhost:4321 (Astro dev port)   ?
UNKNOWN:  Root .env layout (SUPABASE_URL, SUPABASE_ANON_KEY present?)   ?
```

This phase is **read-only audit only**. No code. No config changes.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Run every check below. Document every result. Nothing skipped.

### 0.1 — Verify apps/portal/ does not exist

```bash
ls apps/portal 2>/dev/null && echo "EXISTS ⚠️" || echo "does not exist ✅"
```

Expected: "does not exist ✅"

---

### 0.2 — Verify Nx workspace covers new app

```bash
# Root package.json workspaces
grep -A5 '"workspaces"' package.json

# nx.json — check project detection config
cat nx.json
```

Expected: `"apps/*"` glob in workspaces → any `apps/portal/` will be auto-included.
Also check if nx.json has `projectsRelationship` or `workspaceLayout` that could affect discovery.

---

### 0.3 — Check Nx integration for Astro

```bash
# Does @nx/astro exist?
ls node_modules/@nx/astro 2>/dev/null && echo "@nx/astro installed" || echo "@nx/astro NOT installed"

# What Nx plugins are installed?
grep '"@nx/' package.json

# How does Studio project.json declare its targets? (reference pattern for our project.json)
cat apps/studio/project.json
```

**IMPORTANT:** Studio uses `nx:run-commands` executor — not `@nx/vite`. This means Nx treats all apps as generic shell commands. Astro doesn't need `@nx/astro`. We'll add a `project.json` with `nx:run-commands` using `astro dev`, `astro build`, `astro preview`. Confirm this is the right approach by checking the other apps' project.json files.

```bash
cat apps/command-center/project.json 2>/dev/null || echo "No project.json in command-center"
cat apps/api/project.json 2>/dev/null || echo "No project.json in api"
```

---

### 0.4 — Check root .env file (env var availability)

```bash
# Root .env — safe keys only (do NOT print secrets, just check if keys exist)
grep -E "^SUPABASE_URL|^SUPABASE_ANON_KEY|^VITE_SUPABASE" .env 2>/dev/null | sed 's/=.*/=<present>/' || echo ".env not found"
grep -E "^SUPABASE_URL|^SUPABASE_ANON_KEY|^VITE_SUPABASE" .env.local 2>/dev/null | sed 's/=.*/=<present>/' || echo ".env.local not found"
```

**What we need:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` at root level (Vite apps get these via `envDir: '../..'`). Astro also reads from `.env` by default. Document which file they live in and their exact key names (not values).

```bash
# How Studio passes them to Supabase client
grep -rn "SUPABASE_URL\|SUPABASE_ANON_KEY\|VITE_SUPABASE" packages/db/src/ packages/auth/src/ apps/studio/src/ --include="*.ts" | head -20
```

Note: Vite requires `VITE_` prefix for browser-exposed vars. Astro uses `PUBLIC_` prefix. Check which prefix Studio uses.

---

### 0.5 — Check CORS config in Hono API

```bash
cat apps/api/src/index.ts | grep -A 20 "cors("
```

**Known state:** CORS origin list includes `http://localhost:3000` (old Next.js Portal) but NOT `http://localhost:4321` (Astro default). Document:

- Is `localhost:4321` in the list?
- Is `localhost:3000` there (we can replace or add to it)?
- What file to edit: `apps/api/src/index.ts`, line number in cors origin array

This is a **required change for Phase 1** — flag it clearly as a blocker.

---

### 0.6 — Check Supabase RLS: can anon key read themes/blocks/templates?

Run these via **Supabase MCP** (`execute_sql`):

```sql
-- 6a. RLS policies on themes table
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'themes'
ORDER BY policyname;
```

```sql
-- 6b. RLS policies on blocks table
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'blocks'
ORDER BY policyname;
```

```sql
-- 6c. RLS policies on templates table
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'templates'
ORDER BY policyname;
```

**What to look for:**
- `themes`: should have a policy that allows `anon` role (or `public`) to SELECT where `status = 'published'`. If it's `authenticated` only — anon build-time reads won't work. Flag as a blocker.
- `blocks` and `templates`: WORKPLAN says policies are `blocks_select_auth` and `templates_select_auth` (authenticated role). If `anon` can't read them at build time, Portal can't assemble theme pages. This is the **highest-risk item in Phase 0**. Two options if anon can't read:
  - Add anon SELECT policies for blocks/templates
  - Use `SUPABASE_SERVICE_ROLE_KEY` at build time (build only, not shipped to browser)

Document which option is needed.

---

### 0.7 — Check current DB state (content seed readiness)

Run via **Supabase MCP** (`execute_sql`):

```sql
-- How many rows in each table?
SELECT 
  (SELECT count(*) FROM blocks) AS blocks_count,
  (SELECT count(*) FROM templates) AS templates_count,
  (SELECT count(*) FROM themes WHERE status = 'published') AS published_themes_count,
  (SELECT count(*) FROM themes) AS total_themes_count;
```

```sql
-- Existing themes (if any)
SELECT id, slug, status, template_id, 
       (block_fills IS NOT NULL AND block_fills != '[]'::jsonb) AS has_fills
FROM themes
ORDER BY created_at DESC
LIMIT 5;
```

This tells us whether Phase 4 (Content Seed) starts from zero or has existing data.

---

### 0.8 — Verify packages/db types include new columns

```bash
# Check Theme type has template_id + block_fills
grep -n "template_id\|block_fills" packages/db/src/types.ts

# Check Block and Template types exist
grep -n "^export.*Block\|^export.*Template\|^export type Block\|^export type Template" packages/db/src/types.ts

# Check mappers/queries for blocks and templates
ls packages/db/src/
grep -n "fetchBlocks\|fetchTemplates\|getBlock\|getTemplate" packages/db/src/queries.ts 2>/dev/null | head -20
```

Portal will need `@cmsmasters/db` for types. Confirm it exports what we need.

---

### 0.9 — Check Figma file accessibility for Phase 4

Phase 4 requires reading 5 block frame IDs from the Figma file to generate HTML+CSS. Verify the Figma file key is accessible via Figma MCP:

**File key:** The Figma design files from CLAUDE.md:
- `PodaGqhhlgh6TLkcyAC5Oi` — CMS DS Portal (shadcn colors)
- `CLtdO56o9fJCx19EnhH1nI` — Portal DS CMSMasters brand

**Block frame node IDs from WORKPLAN:**
```
3331:597   — "Fast Loading Speed" (performance gauge)
3331:621   — "Demo Import" (one-click install showcase)
3331:1204  — "Control Every Element" (element customization)
3331:1279  — "Global Settings" (set once, use sitewide)
3331:1363  — "Template Management" (flexibility showcase)
```

To verify, use `mcp__claude_ai_Figma__get_metadata` with one of the file keys. If Figma MCP is not available, note this — Phase 4 will need to generate blocks from screenshots instead.

This check is **informational only** — Phase 4 handles the actual block generation.

---

## Files to Modify

None. This phase is read-only audit.

---

## Acceptance Criteria

- [ ] `apps/portal/` confirmed absent
- [ ] Nx workspace glob confirmed covers `apps/*`
- [ ] Nx project.json executor pattern documented (`nx:run-commands` — no `@nx/astro` needed)
- [ ] Root `.env` key names documented (VITE_ vs PUBLIC_ prefix decision noted)
- [ ] CORS gap documented: `localhost:4321` missing → required addition in Phase 1
- [ ] RLS verdict for themes anon read (SELECT WHERE status='published')
- [ ] RLS verdict for blocks/templates anon read (blocker if missing → two mitigation options)
- [ ] DB content count documented (0 published themes → Phase 4 must seed)
- [ ] `packages/db` types confirmed: Theme has `template_id` + `block_fills`, Block + Template types exported
- [ ] Figma accessibility checked
- [ ] Findings written to `logs/wp-005d/phase-0-result.md`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Log file was created
test -f logs/wp-005d/phase-0-result.md && echo "Phase 0 log exists ✅" || echo "Phase 0 log MISSING ❌"

# 2. No code changes (TypeScript still clean)
npx tsc --noEmit 2>&1 | tail -5
echo "(expect 0 errors — no code changes in Phase 0)"

# 3. Log has all required sections
for section in "apps/portal" "CORS" "RLS" "env" "blocks"; do
  grep -qi "$section" logs/wp-005d/phase-0-result.md && echo "$section section ✅" || echo "$section section MISSING ❌"
done

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After audit, create:
`logs/wp-005d/phase-0-result.md`

```markdown
# Execution Log: WP-005D Phase 0 — RECON: Portal Scaffold Readiness
> Epic: WP-005D — Astro Portal + Content Seed
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## Findings

### apps/portal/ Status
{exists or absent}

### Nx Workspace & Astro Integration
{workspace glob, nx.json discovery, @nx/astro status, recommended approach for project.json}

### Environment Variables
{which file, key names, VITE_ vs PUBLIC_ prefix decision}

### CORS Gap
{localhost:4321 status — missing/present, exact line in apps/api/src/index.ts to update}

### RLS — themes (anon read)
{policy name, roles, qual condition — can anon SELECT published themes?}

### RLS — blocks (anon read)
{policy name, roles — can anon SELECT blocks? If not: mitigation chosen (add policy vs service_role)}

### RLS — templates (anon read)
{policy name, roles — can anon SELECT templates? If not: same mitigation as blocks}

### DB Content State
{blocks_count, templates_count, published_themes_count, total_themes_count}

### packages/db Types
{template_id + block_fills on Theme type, Block + Template export status}

### Figma Accessibility
{Figma MCP available or not, file key accessible, node IDs confirmed}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Nx/Astro executor | nx:run-commands (no @nx/astro) | {reason} |
| Env var prefix | VITE_ or PUBLIC_ | {reason} |
| Anon key strategy | anon only / service_role fallback | {based on RLS findings} |
| ... | ... | ... |

## Blockers for Phase 1
{List each blocker with resolution path. "None" if clear.}

Example expected blockers:
- CORS: localhost:4321 not in API — add in Phase 1 alongside scaffold
- RLS blocks/templates: anon can't read — add SELECT policy in Phase 1 migration

## Open Questions
{Non-blocking questions for Brain. "None" if none.}
```

---

## Git

No commit for Phase 0 — read-only audit. Log file committed with Phase 1.

---

## IMPORTANT Notes for CC

- **Do NOT write any code in this phase.** Read and query only.
- **Do NOT modify any files.** Only create the log file.
- **Supabase MCP** (`execute_sql`) is the source of truth for RLS policies — don't guess from migration files (some policies were added via MCP directly and may not be in `supabase/migrations/`).
- **The RLS check (0.6) is the most critical audit item.** If anon can't read blocks and templates, Phase 1 needs a migration before any Astro page can render. Document both options clearly so Brain can choose.
- **CORS gap is expected and known** — `localhost:3000` is there (old Next.js) but `localhost:4321` (Astro) is not. This is a Phase 1 change, not a blocker for recon.
- **Env var prefix matters**: Vite uses `VITE_` for client-exposed vars. Astro uses `PUBLIC_` prefix for public vars, `import.meta.env.SUPABASE_URL` for server-only (SSG build). Check which prefix Studio uses before deciding Portal's pattern.
- **Read every file referenced in the audit steps.** Don't skip based on assumptions.
