# WP-024 Phase 2: Validators — variants field on create + update schemas

> Workplan: WP-024 Responsive Blocks — Foundation
> Phase: 2 of 5
> Priority: P0
> Estimated: ~0.5 hour
> Type: Backend (package-level)
> Previous: Phase 1 ✅ (`blocks.variants jsonb` column + `BlockVariants` branded type — commit `29314082`)
> Next: Phase 3 (Renderer — `BlockRenderer` RSC + `renderBlock()` inline variants when present)
> Affected domains: pkg-validators

---

## Context

Phase 1 shipped the DB column + branded types. The DB has **zero runtime validation** on JSONB columns — shape checks happen at the validator layer only. Phase 2 adds the write-path guard for `variants`: if something tries to POST a malformed variants blob through the API, Zod rejects it before it hits Supabase.

```
CURRENT (after Phase 1):
  - blocks.variants jsonb NULL exists in DB                                         ✅
  - BlockVariant + BlockVariants types exported from @cmsmasters/db                 ✅
  - createBlockSchema / updateBlockSchema ignore variants silently                  ✅
MISSING (this phase):
  - variants field on create + update schemas                                       ❌
  - variantPayloadSchema ({ html, css })                                            ❌
  - variantsSchema (record of kebab-case name → payload)                            ❌
  - exported Zod symbols if consumers need the shape (optional)                     ❌
```

**Scope discipline:** NO changes to the renderer, NO default values, NO DB writes in this phase. Validators only. Phase 3 consumes the schema.

---

## Domain Context

**pkg-validators:**
- Key invariants:
  - Validators are the **only write-path check** — DB has no runtime validation on JSONB.
  - Optional JSONB fields must default to `undefined` (absent), NOT `{}`. The goal is for an omitted `variants` field to land as `NULL` in DB, not as `{}` (which is a different truthy state).
  - Schemas live in `packages/validators/src/*.ts`; `createX` + `updateX` pairs share payload sub-schemas.
- Known traps:
  - `hooksSchema` and `metadataSchema` use `.default({})` — that pattern is **wrong for `variants`**. Null semantics matter: absent variants ≠ empty-object variants. Use `.optional()` with no default.
  - `CreateBlockPayload` / `UpdateBlockPayload` are re-exported from the package index; if new payload types are added they must follow the same pattern.
  - Zod **v4** is pinned (`"zod": "^4"` in package.json). Syntax is largely compatible with v3 but some APIs changed — double-check if something doesn't compile.
- Public API: `packages/validators/src/index.ts` re-exports schemas + payload types. Consumers: API route handlers, Studio forms, portal write paths.
- Blast radius: any API endpoint that accepts a `POST /blocks` or `PATCH /blocks/:id` body. The `variants` field becomes accepted but still optional — zero breaking change for existing callers.

**Related (read-only — do not modify in this phase):**
- `@cmsmasters/db` exports `BlockVariant` (single-variant interface `{ html, css }`) and `BlockVariants` (`Record<string, BlockVariant>`). Our Zod schemas should produce types that are structurally assignable to these — but do NOT import them here (validators package has no runtime dependency on db types for schemas; keep it zero-coupled).

---

## PHASE 0: Audit (do FIRST — no code yet)

```bash
# 0. Baseline — must match post-cleanup state
npm run arch-test
# Expected: 380 passed, 0 failed (f8321deb set the new baseline)

# 1. Read the pkg-validators skill
cat .claude/skills/domains/pkg-validators/SKILL.md

# 2. Read current block.ts to confirm structure hasn't drifted since Phase 0 RECON
cat packages/validators/src/block.ts

# 3. Read the package index to confirm export pattern
cat packages/validators/src/index.ts | head -20

# 4. Confirm no pre-existing variants references in validators
grep -rn "variants\|variant" packages/validators/src/
# Expected: zero matches

# 5. Confirm Zod version is v4 (v3 → v4 migration is silent on record(); worth checking)
grep "\"zod\"" packages/validators/package.json
# Expected: "zod": "^4"

# 6. Check whether a test harness exists
ls packages/validators/src/__tests__/ 2>/dev/null
cat packages/validators/package.json | grep -E "test|vitest|jest"
# Expected: __tests__ folder may exist but is empty; no test script in package.json
#           → tests are OPTIONAL for this phase. Skip if no harness.
```

**IMPORTANT:** If audit shows a `test` script in `packages/validators/package.json`, write the three unit tests listed in Task 2.4. Otherwise, skip Task 2.4 and log "no harness — tests deferred" in phase-2-result.md.

---

## Task 2.1: Add `variantPayloadSchema` and `variantsSchema`

### What to Build

Two sub-schemas in `packages/validators/src/block.ts`:

```typescript
// ── Variants schema ──
// Responsive blocks (WP-024 / ADR-025): optional named structural variants.
// Absent → block has no variants; portal renders base html/css only.
// Present → renderer inlines each variant as <div data-variant="{name}" hidden>
//           and @container rules inside block CSS reveal the right one.

const variantPayloadSchema = z.object({
  html: z.string().min(1),
  css: z.string().default(''),
})

const variantsSchema = z.record(
  z.string().regex(/^[a-z0-9-]+$/),
  variantPayloadSchema
)
```

### Where it lives

Insert **between** the existing `metadataSchema` block (line 25) and the `// ── Create block ──` header (line 27).

### Edge cases

- **Empty variants object `{}`** — current Zod `.record()` accepts empty object. That's fine at the validator layer; renderer in Phase 3 must treat `{}` the same as `undefined` (no wrappers emitted). Phase 2 does NOT add `.min(1)` on the record — keep validators permissive, renderer decides.
- **Variant name validation** — kebab-case regex `/^[a-z0-9-]+$/`. Matches the existing `slug` regex on line 30. No underscores, no camelCase, no whitespace. Examples: `mobile`, `tablet`, `mobile-landscape`.
- **`css` default `''`** — mirrors the top-level `css` default. Allows a variant to ship only an HTML override while reusing the base CSS via `@container` rules.
- **No `.default(…)` on `variantsSchema`** — the whole field defaults to `undefined` (via `.optional()` in Task 2.2), NOT `{}`. Null semantics preserved.

---

## Task 2.2: Extend `createBlockSchema` and `updateBlockSchema`

### What to Build

Add `variants: variantsSchema.optional()` to both schemas.

```typescript
// createBlockSchema — ADD after metadata line (currently line 39):
  hooks: hooksSchema,
  metadata: metadataSchema,
  variants: variantsSchema.optional(),   // ← new
})

// updateBlockSchema — ADD after metadata.optional() line (currently line 53):
  hooks: hooksSchema.optional(),
  metadata: metadataSchema.optional(),
  variants: variantsSchema.optional(),   // ← new
})
```

### Domain Rules

- **NO `.default({})`** on `variants` in either schema. The default is absence — Zod coerces `undefined` to omitted, and the DB stores `NULL`. Different from `hooks`/`metadata` by design.
- Both schemas gain the field as optional — fully backwards-compatible. Existing `POST /blocks` requests without `variants` continue to pass.
- Do NOT change the order of fields in a way that breaks diffs — append at the end of each schema, after `metadata`/`metadata.optional()`.

---

## Task 2.3: Export schemas + payload types from package index

### What to Build

`packages/validators/src/index.ts` — the existing block export block:

```typescript
// ── Block schemas ──
export {
  createBlockSchema,
  updateBlockSchema,
} from './block'
export type { CreateBlockPayload, UpdateBlockPayload } from './block'
```

**Decide:** are the internal sub-schemas (`variantsSchema`, `variantPayloadSchema`) needed by any consumer?

- **If yes** (e.g., Studio form may want to validate a single variant inline): export them AND add `export type VariantPayload = z.infer<typeof variantPayloadSchema>` and `export type Variants = z.infer<typeof variantsSchema>` from `block.ts`, then re-export from index.
- **If no** (Phase 3 only needs the inferred shape on `CreateBlockPayload.variants`): keep them module-private, do not touch index.

**Brain decision:** default to **module-private**. Phase 3's renderer reads `block.variants` off the DB row (`BlockVariants` from `@cmsmasters/db`), not the validator type. No consumer currently needs the sub-schemas. If a future WP needs them, promote at that point. Keep the public surface minimal.

So: no changes to `packages/validators/src/index.ts` unless the audit reveals a consumer that needs the sub-schemas.

---

## Task 2.4: Unit tests (SKIP unless harness exists)

**Audit checks first.** If `packages/validators/package.json` has no `test` script and no Vitest/Jest config, SKIP this task and record "no harness — tests deferred to the WP that adds one" in `phase-2-result.md`. Do NOT introduce a test runner as part of this WP.

If a harness exists, write three tests in `packages/validators/src/__tests__/block.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { createBlockSchema } from '../block'

describe('createBlockSchema.variants', () => {
  const base = {
    slug: 'test-block',
    name: 'Test',
    html: '<div>x</div>',
    // css/js/block_type/hooks/metadata all default
  }

  it('accepts payloads without a variants field', () => {
    const result = createBlockSchema.safeParse(base)
    expect(result.success).toBe(true)
    expect(result.success && result.data.variants).toBeUndefined()
  })

  it('rejects variant names that violate kebab-case', () => {
    const result = createBlockSchema.safeParse({
      ...base,
      variants: { 'Mobile_Large': { html: '<p/>', css: '' } },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a variant with empty html', () => {
    const result = createBlockSchema.safeParse({
      ...base,
      variants: { mobile: { html: '', css: '' } },
    })
    expect(result.success).toBe(false)
  })
})
```

---

## Files to Modify

- `packages/validators/src/block.ts` — add variants schemas + extend create/update (Tasks 2.1, 2.2)
- `packages/validators/src/index.ts` — NO change (module-private sub-schemas per 2.3)
- `packages/validators/src/__tests__/block.test.ts` — NEW, only if harness exists (Task 2.4)
- `src/__arch__/domain-manifest.ts` — NO change (block.ts + index.ts already owned by pkg-validators)

---

## Acceptance Criteria

- [ ] `variantPayloadSchema` and `variantsSchema` defined in `packages/validators/src/block.ts` between `metadataSchema` and `createBlockSchema`
- [ ] `variants: variantsSchema.optional()` on both `createBlockSchema` and `updateBlockSchema`
- [ ] NO `.default(…)` on the `variants` field in either schema (absence → `undefined` → DB `NULL`)
- [ ] Kebab-case regex `/^[a-z0-9-]+$/` on variant names; `html.min(1)` mandatory; `css.default('')`
- [ ] `CreateBlockPayload` and `UpdateBlockPayload` (inferred types) now have `variants?: Record<string, { html: string; css: string }> | undefined`
- [ ] `packages/validators/src/index.ts` unchanged (sub-schemas stay module-private)
- [ ] `npm run arch-test` — 380 passed, 0 failed (no regressions)
- [ ] `npx tsc -p packages/validators/tsconfig.json --noEmit` → exit 0
- [ ] `npx tsc -p apps/api/tsconfig.json --noEmit` → exit 0 (API is the primary consumer — must still compile)
- [ ] `npx tsc -p apps/studio/tsconfig.json --noEmit` → exit 0 (Studio forms consume these types)
- [ ] If tests written: all three pass

---

## MANDATORY: Verification

```bash
echo "=== WP-024 Phase 2 Verification ==="

# 1. Arch tests — baseline is 380/0 after f8321deb
npm run arch-test
echo "(expect: 380 passed, 0 failed)"

# 2. Validators package typecheck
npx tsc -p packages/validators/tsconfig.json --noEmit
echo "(expect: exit 0)"

# 3. Downstream consumers typecheck
npx tsc -p apps/api/tsconfig.json --noEmit
echo "(expect: exit 0 — api imports createBlockSchema / updateBlockSchema)"

npx tsc -p apps/studio/tsconfig.json --noEmit
echo "(expect: exit 0 — studio forms infer from payload types)"

# 4. No accidental extra files
git status --porcelain | grep -v "^$"
echo "(expect: only packages/validators/src/block.ts modified; index.ts unchanged; optional test file if harness exists)"

# 5. Inline check: variants field is present in both schemas, optional, no default
grep -n "variants" packages/validators/src/block.ts
echo "(expect: 3-4 matches — schema definitions + createBlockSchema + updateBlockSchema)"

grep -n "variants.*default" packages/validators/src/block.ts
echo "(expect: zero matches — variants must NOT have .default())"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification (before committing), create `logs/wp-024/phase-2-result.md`. Use the standard execution-log structure (see TASK-TEMPLATE.md). Must include:

- **Audit confirm-pass** — re-run the Phase 0 confirm checks + Phase 2 audit checks; confirm nothing drifted since `f8321deb`
- **What Was Implemented** — 2-3 sentences
- **Key Decisions** — at minimum: export sub-schemas or keep private (yes/no), tests written or deferred
- **Files Changed** — table with diff sizes
- **Issues & Workarounds** — "None" if clean
- **Open Questions** — should be "None" for this phase
- **Verification Results** — table with all 5 checks above + typecheck exit codes
- **Git commit SHA** — fill after commit

---

## Git

```bash
git add packages/validators/src/block.ts logs/wp-024/phase-2-task.md logs/wp-024/phase-2-result.md
# If tests written:
#   git add packages/validators/src/__tests__/block.test.ts
git commit -m "feat(validators): accept optional variants on block create/update [WP-024 phase 2]"
```

---

## IMPORTANT Notes for CC

- **`.optional()` not `.default({})`** — this is the single most-likely-to-be-done-wrong detail. `hooks` and `metadata` use `.default({})` because they're always objects; `variants` is semantically nullable.
- **Sub-schemas stay module-private** unless audit surfaces a consumer that needs them. Validator packages keep their surface minimal.
- **No DB touch, no renderer touch.** Phase 3 handles render-side variants. Phase 2 is 20-ish lines of code.
- **Zod v4** — if any API surprises appear (e.g. `.record()` signature changed), adjust and flag in Open Questions. Likely nothing changes.
- **Scope discipline** (reminder from WP): do NOT migrate existing blocks, do NOT add auto-rules, do NOT touch tokens.
