# WP-024 Phase 1: Schema + Types — `blocks.variants` column and `BlockVariants` branded type

> Workplan: WP-024 Responsive Blocks — Foundation
> Phase: 1 of 5
> Priority: P0
> Estimated: ~1.5 hours
> Type: Backend (DB migration + typed contract)
> Previous: Phase 0 ✅ (RECON — baseline captured at commit `c3378288`; 380 pass / 7 fail arch-test baseline; branded-type pattern confirmed; types.ts is hand-maintained hybrid)
> Next: Phase 2 (Validators — Zod schemas accept `variants`)
> Affected domains: pkg-db

---

## Context

WP-024 delivers **infrastructure only** for ADR-025 Responsive Blocks. Phase 1 lays the data contract: a nullable JSONB `variants` column on `blocks` and a `BlockVariants` branded TypeScript type that follows the existing pattern of `BlockHooks` / `BlockMetadata`. Zero behaviour change — existing blocks render byte-identically after this phase.

```
CURRENT (confirmed by Phase 0 RECON, commit c3378288):
  - blocks table shape ends at updated_at; no variants column         ✅
  - types.ts is HAND-MAINTAINED hybrid — Database type uses branded
    types directly (e.g. hooks: BlockHooks, not hooks: Json)          ✅
  - BlockHooks (types.ts:81-84) + BlockMetadata (types.ts:86-90)
    are the canonical pattern to mirror                               ✅
  - Both are exported from packages/db/src/index.ts lines 23-24       ✅
  - No code references .variants / BlockVariants anywhere today       ✅
  - Arch-test baseline: 380 pass / 7 fail (pre-existing
    app-command-center drift — NOT a WP-024 blocker)                  ⚠️

MISSING after this phase runs:
  - migration 016_blocks_variants.sql applied                         ❌ → add
  - blocks.Row / Insert / Update have variants: BlockVariants | null  ❌ → add
  - BlockVariant interface + BlockVariants type alias exported        ❌ → add
```

This phase stops there. No validators (Phase 2), no renderer (Phase 3), no slot/tokens (Phase 4).

---

## Domain Context

**pkg-db** (from `.claude/skills/domains/pkg-db/SKILL.md` — read in full before writing code):

- **Key invariants:**
  - `types.ts` is the single typed-contract file for all 15 tables. Although the skill describes it as "auto-generated from Supabase", Phase 0 RECON confirms it is actually **hand-maintained** as a hybrid: the `Database` type was initially generated but has been hand-edited to substitute branded types (`BlockHooks`, `BlockMetadata`, `ThemeMeta`, `ThemeSEO`, etc.) in place of raw `Json`. **Re-running `supabase gen types` would wipe these edits** — do NOT run it in this phase. Hand-edit the file to add the new column.
  - JSON columns are typed via **branded interfaces** defined adjacent to the `Database` type (e.g. `BlockHooks` at lines 81-84, `BlockMetadata` at lines 86-90). Follow the same pattern for `BlockVariants`.
  - All 15 tables have RLS enabled. `blocks` table RLS is inherited by any new column — no RLS work needed.
- **Known traps:**
  - **"types.ts is auto-generated" is a half-truth.** The file is auto-generated *once*, then manually augmented. Regenerating silently loses every manual edit. If in doubt, `git diff` after any type change to confirm only the intended change landed.
  - **JSON columns parse as `any` at runtime** — TypeScript types are compile-time assertions only. No runtime validation; that's pkg-validators' job (Phase 2).
  - **`.maybeSingle()` vs `.single()`** — not relevant to Phase 1 but worth re-reading the trap list.
- **Public API:** `packages/db/src/index.ts` — the only entrypoint consumers import from. `BlockVariant` + `BlockVariants` MUST be exported from here, mirroring `BlockHooks` + `BlockMetadata` at lines 23-24.
- **Blast radius:** Changing `types.ts` affects every consumer of `@cmsmasters/db` (studio, portal, api, dashboard, admin, validators). This phase's change is **purely additive** — existing fields untouched, new field nullable — so no consumer needs edits in this phase. Verify with `npm run typecheck` at the end.

**Open Questions for Brain raised in Phase 0 RECON — resolved for this phase:**

- **Q2 "Arch-test baseline"** — Interpreted as: *"no NEW regressions introduced by this WP."* Phase 1 baseline = 380 pass / 7 fail; target after Phase 1 = 380 pass / 7 fail (**identical count, identical failing tests**). Any new failure is a blocker. The 7 pre-existing `app-command-center` Path Existence failures are tracked separately and out of scope.
- **Q1 and Q3** — both concern Phase 4; not Phase 1's responsibility. Ignore here.

---

## PHASE 0: Audit (do FIRST — short, confirms RECON is still valid at Phase 1 start)

Phase 0 RECON already did the deep audit. This quick confirm-pass catches any drift since commit `c3378288`.

```bash
# 0. Baseline (ALWAYS — do not skip)
npm run arch-test
# Expect: 380 pass / 7 fail. If the numbers differ from Phase 0 RECON,
# STOP and report — something changed on main since Phase 0 ran.

# 1. Read domain skill in full
cat .claude/skills/domains/pkg-db/SKILL.md

# 2. Confirm migration 015 is the latest
ls supabase/migrations/ | sort -V | tail -3
# Expect: 013_..., 014_..., 015_envato_item_snapshot_portal_page_flag.sql

# 3. Confirm blocks table shape in types.ts
grep -n "blocks: {" packages/db/src/types.ts
# Expect one hit around line 242

# 4. Confirm BlockHooks / BlockMetadata pattern is still where RECON said
grep -n "^export interface BlockHooks\|^export interface BlockMetadata" packages/db/src/types.ts
# Expect two hits around lines 81 and 86

# 5. Confirm the two types are exported from the package entrypoint
grep -n "BlockHooks\|BlockMetadata" packages/db/src/index.ts
# Expect both on lines 23-24 in the "export type { ... }" block

# 6. Confirm no pre-existing variants references (sanity)
grep -rn "BlockVariants\|block.variants\|blocks\.variants" packages/ apps/ tools/ \
  --include="*.ts" --include="*.tsx" 2>/dev/null || true
# Expect: zero matches (documentation hits in workplan/ and logs/ are fine to ignore)
```

**Document Phase 0 findings inline in `logs/wp-024/phase-1-result.md` under "Audit confirm-pass".** Do not create a separate file.

**IMPORTANT:** If `supabase gen types` is attempted anywhere in this phase, STOP. It is explicitly forbidden for this phase — hand-edit the file to add the new column (see Task 1.3 rationale).

---

## Task 1.1: Write migration `016_blocks_variants.sql`

### What to Build

A single additive migration that adds a nullable JSONB `variants` column to `blocks`. No default. No NOT NULL. No index (not needed — reads are always by `id`; the column is consumed as a whole payload).

File: `supabase/migrations/016_blocks_variants.sql`

```sql
-- Migration 016: blocks.variants — optional structural variants per block
-- Part of WP-024 (ADR-025 Responsive Blocks — Foundation).
--
-- Shape: jsonb keyed by variant name (e.g. "mobile", "tablet"), each value
--   { html: string, css: string }. Portal inlines all variants into one
--   render artifact; @container CSS reveals the matching one at the block's
--   container width. NULL means the block has no structural variants.
--
-- Backwards-compatible: column is nullable with no default. Existing rows
-- remain NULL and continue to render via the single html/css/js triple.

ALTER TABLE blocks
  ADD COLUMN variants jsonb;

COMMENT ON COLUMN blocks.variants IS
  'Optional named structural variants. Shape: { [name: string]: { html: string, css: string } }. NULL = block has no variants. See ADR-025 and WP-024.';

-- No index. variants is read as a whole jsonb blob by BlockRenderer, never queried
-- by a subfield. RLS inherits from the blocks table policy — no policy change needed.
```

### Integration

Adds to the existing migration chain: `015_envato_item_snapshot_portal_page_flag.sql` → `016_blocks_variants.sql`.

### Domain Rules

- Migration is **additive-only**: no existing column touched, no data backfilled, no RLS change.
- Column is **nullable with no default** — NULL semantics preserved so existing rows require no UPDATE.

---

## Task 1.2: Apply the migration

### What to Build

Apply `016_blocks_variants.sql` to the linked Supabase database using the project's standard migration flow.

Primary option (if Supabase CLI is linked):

```bash
npx supabase db push --linked
```

Fallback options (use only if the primary fails and the reason is understood):

- Supabase Studio → SQL Editor → paste migration contents → Run.
- `psql` against the project connection string.

### Verification after apply

```bash
# Column exists and is jsonb nullable with no default
psql "$DATABASE_URL" -c "\d+ blocks" | grep variants
# Expect a line like:  variants | jsonb |           |          |         | extended |              |

# Row count unchanged (sanity — no data loss)
psql "$DATABASE_URL" -c "SELECT count(*) FROM blocks"
# Compare against pre-migration count in phase-1-result.md
```

If `$DATABASE_URL` isn't exported in the dev shell, use the Supabase dashboard's SQL editor for these two checks.

### Domain Rules

- **Do not run `supabase db reset`** — it drops and recreates the DB from migrations + seed; destroys real data.
- **Do not manually edit the migration after apply.** If the migration needs changes, write a new migration (`017_…`).

---

## Task 1.3: Hand-edit `types.ts` — add `variants` field to `blocks` Row / Insert / Update

### What to Build

Extend `packages/db/src/types.ts` so the `blocks` table entry has `variants: BlockVariants | null` in Row, and `variants?: BlockVariants | null` in Insert and Update. The `BlockVariants` symbol is defined in Task 1.4.

**Reminder:** types.ts is hand-maintained. **Do NOT run `supabase gen types`.** Hand-edit the three places inside the `blocks` sub-object:

```typescript
// packages/db/src/types.ts
// Around lines 242-293, inside Database > public > Tables > blocks:

blocks: {
  Row: {
    id: string
    slug: string
    name: string
    html: string
    css: string
    js: string
    block_type: string
    block_category_id: string | null
    is_default: boolean
    sort_order: number
    hooks: BlockHooks
    metadata: BlockMetadata
    variants: BlockVariants | null          // ← ADD
    created_by: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    slug: string
    name: string
    html: string
    css?: string
    js?: string
    block_type?: string
    block_category_id?: string | null
    is_default?: boolean
    sort_order?: number
    hooks?: BlockHooks
    metadata?: BlockMetadata
    variants?: BlockVariants | null          // ← ADD
    created_by?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    slug?: string
    name?: string
    html?: string
    css?: string
    js?: string
    block_type?: string
    block_category_id?: string | null
    is_default?: boolean
    sort_order?: number
    hooks?: BlockHooks
    metadata?: BlockMetadata
    variants?: BlockVariants | null          // ← ADD
    created_by?: string | null
    updated_at?: string
  }
  Relationships: []
}
```

Place each new line **immediately after the `metadata` field**, mirroring the way `hooks` → `metadata` sit together — so Insert/Update stay in the same order as Row.

### Domain Rules

- **types.ts ordering matters for readability but not for correctness.** Keep the insertion point consistent across Row/Insert/Update (after `metadata`).
- The `Block` / `BlockInsert` / `BlockUpdate` exports in `index.ts` are derived from the `Database` type — they automatically pick up the new field once this edit lands. No separate export edit needed for those three.

---

## Task 1.4: Add `BlockVariant` + `BlockVariants` branded types

### What to Build

Add two declarations immediately after `BlockMetadata` in `types.ts` (so the three "block JSON shapes" sit together):

```typescript
// packages/db/src/types.ts
// Insert AFTER BlockMetadata (currently lines 86-90):

// ── Block variants (stored in blocks.variants jsonb) ──
// See ADR-025 and WP-024. Each variant is a standalone { html, css } payload;
// Portal inlines all of them and @container CSS reveals the matching one at
// the block's container width.

export interface BlockVariant {
  html: string
  css: string
}

export type BlockVariants = Record<string, BlockVariant>
```

Why two symbols rather than one:
- `BlockVariant` — the shape of a single variant payload; useful on its own in validators and renderer code paths.
- `BlockVariants` — the shape of the whole JSONB blob (keyed by variant name).

### Domain Rules

- Follow the exact same section-header comment style as `BlockHooks` / `BlockMetadata` — matches existing file aesthetic.
- Keep the comment pointing at ADR-025 + WP-024 so future readers land in the right place.
- Do NOT add runtime validation here — that is pkg-validators' job (Phase 2).

---

## Task 1.5: Export `BlockVariant` + `BlockVariants` from `packages/db/src/index.ts`

### What to Build

In the `export type { ... }` block currently exporting `BlockHooks, BlockMetadata` (lines 23-24), add the two new symbols adjacent to them:

```typescript
// packages/db/src/index.ts
// Extend the existing export block:

export type {
  Database,
  UserRole,
  ThemeStatus,
  LicenseType,
  ThemeMeta,
  ThemeSEO,
  EnvatoItem,
  EnvatoItemPreview,
  EnvatoItemAttribute,
  BlockHooks,
  BlockMetadata,
  BlockVariant,           // ← ADD
  BlockVariants,          // ← ADD
  // ... rest unchanged
}
```

### Domain Rules

- Public API boundary: consumers outside `packages/db` MUST import from `@cmsmasters/db`, not from deep paths like `@cmsmasters/db/src/types`. Exporting here is what makes these types usable from studio/portal/api/validators downstream.

---

## Task 1.6: Typecheck the whole monorepo

### What to Build

Run typechecks across all workspaces. The change is additive and nullable, so nothing outside `packages/db` should need edits. If typecheck errors surface anywhere, **stop and report** — it means an existing consumer uses a pattern that doesn't tolerate the new optional field (e.g. an exact-type check or a spread into a stricter interface), and that would be a Phase 1 scope creep.

```bash
# Workspace-wide typecheck (use whichever of these exists in this repo;
# prefer the one CI runs)
npm run typecheck --workspaces --if-present
# or, if the repo has a unified script:
npm run typecheck
```

Expected: exit code 0 across all workspaces.

If a workspace has no typecheck script, record that in the log (not a failure — just unmonitored).

### Domain Rules

- Do NOT fix downstream typecheck errors in this phase. If any arise, their root cause is a signal that Phase 1 needs rework (e.g. the new field should be non-nullable, or the branded type shape is wrong). Stop, log, ask Brain.

---

## Files to Modify

- `supabase/migrations/016_blocks_variants.sql` — **NEW** — additive `ALTER TABLE` + column comment
- `packages/db/src/types.ts` — **MODIFIED** — add `BlockVariant` interface, `BlockVariants` type alias, plus three `variants: BlockVariants | null` entries inside `blocks` Row / Insert / Update
- `packages/db/src/index.ts` — **MODIFIED** — extend the existing `export type { ... }` block with `BlockVariant, BlockVariants`
- `src/__arch__/domain-manifest.ts` — **NO CHANGE** — types.ts and index.ts are already owned by `pkg-db`; migration files are not tracked by the manifest. The `blocks` table is already listed under `pkg-db.owned_tables`; adding a column does not require a manifest update.

---

## Acceptance Criteria

- [ ] `supabase/migrations/016_blocks_variants.sql` exists and follows the migration conventions (numeric prefix, descriptive name, header comment, `ALTER TABLE … ADD COLUMN variants jsonb;`, `COMMENT ON COLUMN …`).
- [ ] Migration 016 is applied to the linked DB; `\d+ blocks` shows `variants | jsonb` nullable with no default.
- [ ] Row count in `blocks` is unchanged before and after apply (record both in the log).
- [ ] `packages/db/src/types.ts` has `BlockVariant` interface and `BlockVariants` type alias defined immediately after `BlockMetadata`, with a section-header comment matching the existing style.
- [ ] All three slots in `blocks.{Row,Insert,Update}` contain a `variants` field with the correct type (`BlockVariants | null` in Row; `BlockVariants | null` optional in Insert and Update).
- [ ] `BlockVariant` and `BlockVariants` are exported from `packages/db/src/index.ts` alongside `BlockHooks` / `BlockMetadata`.
- [ ] `npm run arch-test` → exactly **380 pass / 7 fail** (identical to Phase 0 baseline; zero new regressions). If the count differs in either direction, stop and report.
- [ ] Workspace typecheck passes (exit code 0 everywhere a typecheck script exists). If a workspace has no typecheck, record that in the log rather than inferring success.
- [ ] `grep -rn "BlockVariant" packages/db/src/` shows the two new definitions plus the two new exports — four hits total in the package.
- [ ] `supabase gen types` was NOT executed during this phase.
- [ ] Zero source file outside `packages/db` and `supabase/migrations/` was edited.

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-024 Phase 1 Verification ==="

# 1. Arch-test baseline match (no new regressions)
npm run arch-test 2>&1 | tail -20
echo "(expect: 380 pass / 7 fail — identical to Phase 0 baseline)"

# 2. Migration applied + column shape
psql "$DATABASE_URL" -c "\d+ blocks" | grep -i variants || \
  echo "!!! psql not available — verify via Supabase dashboard"
echo "(expect: variants | jsonb | nullable | no default)"

# 3. Row count sanity (no data loss)
psql "$DATABASE_URL" -c "SELECT count(*) AS blocks_count FROM blocks"
echo "(expect: unchanged from pre-migration count)"

# 4. types.ts contains BlockVariant / BlockVariants + uses them in blocks
grep -cE "^export (interface BlockVariant\b|type BlockVariants\b)" \
  packages/db/src/types.ts
echo "(expect: 2)"

grep -c "variants: BlockVariants \| null\|variants\?: BlockVariants \| null" \
  packages/db/src/types.ts
echo "(expect: 3 — one each for Row, Insert, Update)"

# 5. index.ts re-exports both symbols
grep -c "BlockVariant\b\|BlockVariants\b" packages/db/src/index.ts
echo "(expect: 2)"

# 6. Monorepo typecheck
npm run typecheck --workspaces --if-present 2>&1 | tail -5
echo "(expect: exit 0 across all workspaces)"

# 7. No rogue supabase gen types run (empty diff on blocks Row unrelated to this WP)
git diff --stat packages/db/src/types.ts
echo "(expect: only the two branded type additions + three variants field lines)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-024/phase-1-result.md`:

```markdown
# Execution Log: WP-024 Phase 1 — Schema + Types

> Epic: WP-024 Responsive Blocks — Foundation
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: pkg-db

## Audit confirm-pass (Phase 0 findings still valid?)
{Results of the 6 confirm-pass commands from the Phase 0 Audit block. Note any drift since commit c3378288.}

## What Was Implemented
{2-5 sentences: migration 016 applied; blocks.variants column live; BlockVariant / BlockVariants types defined and exported; Database type reflects nullable variants on Row/Insert/Update; no downstream consumer required edits.}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Hand-edit types.ts vs supabase gen types | Hand-edit | Phase 0 RECON: file is hybrid; regen would wipe branded-type substitutions |
| BlockVariant shape | `{ html: string; css: string }` | Matches ADR-025 canonical shape; mirrors BlockHooks pattern |
| ... any others encountered ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `supabase/migrations/016_blocks_variants.sql` | created | ALTER TABLE blocks ADD COLUMN variants jsonb + comment |
| `packages/db/src/types.ts` | modified | BlockVariant interface, BlockVariants type alias, 3 variants fields in blocks Row/Insert/Update |
| `packages/db/src/index.ts` | modified | Re-export BlockVariant + BlockVariants |

## Row counts
| Moment | blocks row count |
|--------|------------------|
| Pre-migration | {N} |
| Post-migration | {N} |

## Issues & Workarounds
{Anything that went sideways. "None" if clean.}

## Open Questions
{Anything that needs Brain before Phase 2. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test delta vs Phase 0 baseline | ✅/❌ (expect: 380 pass / 7 fail identical) |
| Column exists & shape correct | ✅/❌ |
| Row count unchanged | ✅/❌ |
| types.ts BlockVariant + BlockVariants present | ✅/❌ |
| Three variants fields present in blocks | ✅/❌ |
| index.ts exports both symbols | ✅/❌ |
| Monorepo typecheck | ✅/❌ |
| supabase gen types NOT run | ✅/❌ |

## Git
- Commit: `{sha}` — `feat(db): add blocks.variants jsonb + BlockVariants branded type [WP-024 phase 1]`
```

Include `logs/` in your `git add` before committing.

---

## Git

```bash
git add \
  supabase/migrations/016_blocks_variants.sql \
  packages/db/src/types.ts \
  packages/db/src/index.ts \
  logs/wp-024/phase-1-result.md

git commit -m "feat(db): add blocks.variants jsonb + BlockVariants branded type [WP-024 phase 1]"
```

Do NOT include anything else in this commit. If working-tree has unrelated dirty files, leave them alone — the phase is scoped to DB contract only.

---

## IMPORTANT Notes for CC

- **Phase 0 RECON already ran** — do not repeat it. The confirm-pass at the top of this task is a short sanity check, not a re-audit.
- **Read `packages/db/SKILL.md` before editing** — the hand-maintained-types gotcha is the #1 trap for this phase.
- **Do NOT run `supabase gen types`** under any circumstances in this phase. It will wipe the branded-type substitutions across the entire `Database` type, causing massive false-positive churn and erasing work from other WPs. If the file looks stale, that's fine — hand-edit.
- **Arch-test baseline is 380/7, not 387/0.** The 7 failures are pre-existing `app-command-center` manifest drift from a different WP. Your job is to keep the count identical, not to fix them.
- **Scope is DB contract only.** No validator edits. No renderer edits. No slot-CSS edits. No tokens file. If you find yourself touching anything outside `packages/db/src/` and `supabase/migrations/`, stop.
- **Public API boundary:** `BlockVariant` / `BlockVariants` must be importable as `import type { BlockVariants } from '@cmsmasters/db'`. No consumer should ever reach into `packages/db/src/types` directly.
- **If typecheck fails anywhere** — stop, log, do not patch downstream. A failure means the contract needs Brain review.
- **Keep the commit message pattern** — `feat(db): … [WP-024 phase 1]` — so the WP can be reconstructed from git log later.
