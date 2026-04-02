# WP-004 Phase 0: RECON — Hard Inventory of All Flat-Field References

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 0 of 5
> Priority: P0
> Estimated: 0.5–1 hour
> Type: Audit
> Previous: WP-003 Phase 4 ✅ (flat form editor, save/publish with toast + audit)
> Next: Phase 1 (Schema migration + types + validators + boundary mappers)

---

## Context

Studio is built with a flat 27-column `themes` table. WP-004 replaces this with `meta` (jsonb) + `sections[]` (jsonb) + `seo` (jsonb). Before touching anything, we need an exact inventory of every file and line that references flat theme columns — this becomes the checklist for Phases 1–4.

```
CURRENT:  27 flat columns in themes table (name, tagline, features, hero, etc.)   ✅
CURRENT:  Flat types in packages/db/src/types.ts (ThemeFeature, ThemePlugin, etc.)   ✅
CURRENT:  Flat validator in packages/validators/src/theme.ts (themeSchema)   ✅
CURRENT:  Flat mappers in apps/studio/src/lib/form-defaults.ts (themeToFormData, formDataToUpsert)   ✅
CURRENT:  Flat form in apps/studio/src/pages/theme-editor.tsx   ✅
MISSING:  Inventory of ALL references — exact file + line + what it reads/writes   ❌
```

This phase produces the inventory. No code changes.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

This IS the audit. Run ALL of the following. Document every match.

### 0.1 — DB query call sites for themes

```bash
# Where do we query the themes table?
grep -rn "\.from('themes')" packages/ apps/studio/ apps/api/
grep -rn "from('themes')" apps/studio/src/ packages/db/src/
```

### 0.2 — Flat column references in packages/db

```bash
# Type definitions that map to flat columns
grep -rn "ThemeFeature\|ThemePlugin\|ThemeHero\|ThemeResources\|CustomSection" packages/db/src/
# Type exports
grep -rn "ThemeFeature\|ThemePlugin\|ThemeHero\|ThemeResources\|CustomSection" packages/db/src/index.ts
```

### 0.3 — Flat column references in validators

```bash
grep -rn "tagline\|description\|category\|price\|demo_url\|themeforest_url\|themeforest_id\|thumbnail_url\|preview_images\|features\|included_plugins\|compatible_plugins\|custom_sections\|seo_title\|seo_description\|hero\|trust_badges\|rating\|sales\|resources" packages/validators/src/
```

### 0.4 — Flat field reads/writes in Studio editor

```bash
# The big one: theme-editor.tsx references to flat fields
grep -rn "\.name\|\.tagline\|\.description\|\.category\|\.price\|\.demo_url\|\.themeforest_url\|\.themeforest_id\|\.thumbnail_url\|\.preview_images\|\.features\|\.included_plugins\|\.compatible_plugins\|\.hero\|\.trust_badges\|\.rating\|\.sales\|\.resources\|\.custom_sections\|\.seo_title\|\.seo_description" apps/studio/src/pages/theme-editor.tsx
```

### 0.5 — Flat field reads in list page + card + table

```bash
grep -rn "\.name\|\.tagline\|\.category\|\.status\|\.thumbnail_url\|\.slug\|\.price\|\.rating\|\.sales" apps/studio/src/pages/themes-list.tsx apps/studio/src/components/theme-card.tsx apps/studio/src/components/themes-table.tsx apps/studio/src/components/themes-toolbar.tsx
```

### 0.6 — Boundary mappers (form-defaults.ts)

```bash
# Current mappers that do flat → form and form → flat
cat apps/studio/src/lib/form-defaults.ts
```

**IMPORTANT:** This file contains `themeToFormData()` and `formDataToUpsert()` — the existing boundary mappers. Document every field they map. These functions will be rewritten in Phase 1.

### 0.7 — Type imports across Studio

```bash
# Who imports flat types?
grep -rn "ThemeFormData\|ThemeInsert\|ThemeUpdate\|Theme " apps/studio/src/ --include="*.ts" --include="*.tsx"
grep -rn "ThemeFeature\|ThemePlugin\|ThemeHero\|ThemeResources\|CustomSection" apps/studio/src/
```

### 0.8 — Hono API theme references

```bash
# Check if API routes reference any theme flat fields
grep -rn "theme\|Theme" apps/api/src/ --include="*.ts"
```

### 0.9 — RLS policies on themes table

Run this SQL via Supabase MCP (`execute_sql`):

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'themes'
ORDER BY policyname;
```

Document which policies reference column names that will be dropped.

### 0.10 — Editor component dependencies

```bash
# What components does theme-editor.tsx import?
grep -n "^import" apps/studio/src/pages/theme-editor.tsx

# What does EditorSidebar receive as props?
grep -rn "interface\|type.*Props\|export.*function" apps/studio/src/components/editor-sidebar.tsx | head -20
```

### 0.11 — Existing DB columns (ground truth)

Run via Supabase MCP:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'themes' AND table_schema = 'public'
ORDER BY ordinal_position;
```

This is the source of truth for which columns exist and must be dropped.

---

## Deliverable: Inventory Document

After running all greps, produce a structured inventory. Organize by layer:

```markdown
# WP-004 Phase 0: Flat-Field Inventory

## 1. DATABASE LAYER
### Columns to drop (from 0.11)
| Column | Type | Nullable |
|--------|------|----------|
| name   | text | NOT NULL |
| ...    | ...  | ...      |

### RLS policies referencing flat columns (from 0.9)
| Policy | References |
|--------|-----------|
| ...    | ...       |

## 2. TYPES LAYER (packages/db/src/types.ts)
### Interfaces to remove/rewrite
- ThemeFeature — used in: [file:line, file:line]
- ThemePlugin — used in: [file:line, file:line]
- ThemeHero — used in: [file:line, file:line]
- ThemeResources — used in: [file:line, file:line]
- CustomSection — used in: [file:line, file:line]

### Type aliases to rewrite
- Theme (Row) — 27 flat fields → meta/sections/seo
- ThemeInsert — same
- ThemeUpdate — same

## 3. VALIDATORS LAYER (packages/validators/src/theme.ts)
### Fields in themeSchema (from 0.3)
[list every field and its validator]

## 4. BOUNDARY MAPPERS (apps/studio/src/lib/form-defaults.ts)
### themeToFormData() — fields mapped (from 0.6)
[list every field]

### formDataToUpsert() — fields mapped (from 0.6)
[list every field]

## 5. STUDIO QUERIES (apps/studio/src/lib/queries.ts)
### Functions that read themes (from 0.1)
[list with file:line]

## 6. STUDIO UI — List page (themes-list, theme-card, themes-table)
### Flat field reads (from 0.5)
[file:line — what field]

## 7. STUDIO UI — Editor (theme-editor.tsx)
### Flat field bindings (from 0.4)
[file:line — what field — read or write]

### Component imports (from 0.10)
[list — which to keep, which need modification]

## 8. HONO API (from 0.8)
### Theme references
[file:line — what it does]

## 9. CROSS-CUTTING: Type imports (from 0.7)
[file:line — what type imported — needs update?]

## SUMMARY
- Total files to modify: N
- Total flat-field references: N
- RLS policies to update: N
- Clean boundary mappers exist: YES (form-defaults.ts)
- Risk areas: [list any surprises]
```

---

## Files to Modify

- None — this phase is audit-only.

---

## Acceptance Criteria

- [ ] All 11 audit steps (0.1–0.11) executed and results documented
- [ ] Inventory document follows the structure above — no section left empty (use "None" if clean)
- [ ] Every flat-field reference has exact file + line number
- [ ] RLS policies checked and any column references flagged
- [ ] DB columns ground truth captured from `information_schema`
- [ ] Surprises or risk areas explicitly called out in SUMMARY

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Log file exists
test -f logs/wp-004/phase-0-result.md && echo "✅ Log exists" || echo "❌ Log missing"

# 2. Inventory has all 9 sections
grep -c "^## [0-9]" logs/wp-004/phase-0-result.md
echo "(expected: 9 sections)"

# 3. Summary section exists
grep -q "SUMMARY" logs/wp-004/phase-0-result.md && echo "✅ Summary exists" || echo "❌ Summary missing"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-004/phase-0-result.md`

> Use the inventory document itself as the execution log for this phase — it IS the deliverable.
> Add the standard log header on top:

```markdown
# Execution Log: WP-004 Phase 0 — RECON Flat-Field Inventory
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
Full audit of all flat-field references across DB, types, validators, mappers, queries, Studio UI, and Hono API.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| (none) | — | Audit only |

## Issues & Workarounds
{Any surprises found during grep}

## Open Questions
{Non-blocking questions for Brain}

## Verification Results
| Check | Result |
|-------|--------|
| All 11 audits done | ✅/❌ |
| Inventory complete | ✅/❌ |
| Summary written | ✅/❌ |

## Git
- Commit: `{sha}` — `recon: flat-field inventory [WP-004 phase 0]`

---

{FULL INVENTORY DOCUMENT BELOW}
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
mkdir -p logs/wp-004
git add logs/wp-004/phase-0-result.md
git commit -m "recon: flat-field inventory [WP-004 phase 0]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify any code in this phase.** This is pure audit. Zero changes to source files.
- **Do NOT skip any grep step.** Even if you think a file is clean — verify it. The inventory is only useful if it's complete.
- **RLS policies are critical.** If any policy references a column being dropped, Phase 1 migration will silently break access control. Flag these clearly.
- **form-defaults.ts is the current boundary.** `themeToFormData()` and `formDataToUpsert()` map every flat field. Read them carefully — the count of fields mapped there is the ground truth for "how many references to migrate."
- **If grep misses something and it breaks later — that's this phase's fault.** Be thorough.
- **Windows paths:** the monorepo is at `c:\work\cmsmasters portal\app\cmsmasters-portal\`. Grep commands use relative paths from monorepo root. If your shell doesn't support grep, use `findstr /S /N` or equivalent.
