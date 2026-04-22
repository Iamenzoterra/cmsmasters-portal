# Execution Log: WP-024 Phase 2 — Validators

> Epic: WP-024 Responsive Blocks — Foundation
> Executed: 2026-04-22 15:29–15:34 (local)
> Duration: ~5 min
> Status: ✅ COMPLETE
> Domains affected: pkg-validators
> Parent commits: Phase 1 `29314082`, cleanup `f8321deb`

---

## Audit confirm-pass (Phase 0 + Phase 2 checks)

All six Phase 2 audit checks re-ran at start; state matches task expectations exactly:

| Check | Expected | Actual |
|-------|----------|--------|
| `npm run arch-test` baseline | 380 pass / 0 fail (after `f8321deb`) | ✅ 380 pass / 0 fail |
| `packages/validators/src/block.ts` shape | `metadataSchema` → `// ── Create block ──` at lines 25/27 | ✅ matches — insertion point clean |
| `packages/validators/src/index.ts` export pattern | `export { createBlockSchema, updateBlockSchema }` + `CreateBlockPayload`/`UpdateBlockPayload` re-export | ✅ lines 11-15 |
| Pre-existing `variants`/`variant` refs in validators | zero matches | ✅ zero (`grep -rn variants packages/validators/src/` → empty) |
| Zod version | `^4` | ✅ `"zod": "^4"` |
| Test harness | `__tests__/` exists but empty; no `test` script in `package.json` | ✅ confirmed — **Task 2.4 SKIPPED** per task rules |

No drift since `f8321deb`. Phase 2 proceeded against the same snapshot.

---

## What Was Implemented

Added two module-private sub-schemas to `packages/validators/src/block.ts` — `variantPayloadSchema` (`{ html: string.min(1), css: string.default('') }`) and `variantsSchema` (`z.record(kebab-regex, variantPayloadSchema)`) — inserted between `metadataSchema` (line 25) and the `// ── Create block ──` header. Both `createBlockSchema` and `updateBlockSchema` gained a trailing `variants: variantsSchema.optional()` field — no `.default(…)`, so an absent field stays `undefined` and lands as `NULL` in the DB column added in Phase 1. Inferred types `CreateBlockPayload` and `UpdateBlockPayload` now expose `variants?: Record<string, { html: string; css: string }> | undefined` automatically. The change is fully additive; every existing create/update call site continues to compile and validate without edits.

---

## Key Decisions

| Decision | Chosen | Why |
|----------|--------|-----|
| `.optional()` vs `.default({})` on `variants` | `.optional()` only | Null semantics matter: absent variants ≠ empty variants. Task IMPORTANT note explicitly calls this out; `hooks`/`metadata` use `.default({})` because they're always present — `variants` is semantically nullable and must round-trip as `NULL` in the DB. |
| Export `variantPayloadSchema` / `variantsSchema` | Kept module-private | Brain pre-decision in task 2.3: Phase 3 renderer reads `block.variants` off the DB row typed as `BlockVariants` (from `@cmsmasters/db`) — no current consumer needs the sub-schemas. Keep the public surface minimal; promote later if a WP needs them. |
| Variant name regex | `/^[a-z0-9-]+$/` | Mirrors the existing `slug` regex (line 30). Rejects camelCase, underscores, whitespace, uppercase — matches the existing kebab-case convention across the codebase. |
| `html.min(1)`, `css.default('')` | As specified | Variant must have HTML (otherwise pointless); CSS may be omitted if the variant relies on the base CSS via `@container` rules — mirrors the top-level `css.default('')`. |
| Unit tests (Task 2.4) | SKIPPED | No test harness exists in `packages/validators` — `__tests__/` is empty, `package.json` has no `test` script, no Vitest/Jest config. Task rules explicitly say "SKIP unless harness exists" and "do NOT introduce a test runner as part of this WP". Logged here as a decision. |
| Touch `packages/validators/src/index.ts` | No | Direct consequence of the "module-private" decision above — the only public symbols touched are `createBlockSchema`/`updateBlockSchema`, which are already re-exported. |

---

## Files Changed

| File | Change | Description |
|------|--------|-------------|
| `packages/validators/src/block.ts` | **modified** | Inserted `variantPayloadSchema` + `variantsSchema` between `metadataSchema` and the create-block header (lines 27-41). Appended `variants: variantsSchema.optional(),` to `createBlockSchema` (line 56) and `updateBlockSchema` (line 71). Total diff: +19 / -0. |

Nothing else touched:
- `packages/validators/src/index.ts` — **unchanged** (module-private decision)
- `packages/validators/src/__tests__/block.test.ts` — **not created** (no harness)
- `src/__arch__/domain-manifest.ts` — **unchanged** (`block.ts` and `index.ts` already owned by `pkg-validators`)

---

## Issues & Workarounds

**None.** Clean run — all typechecks and arch-tests passed first try, no Zod v4 API surprises encountered (`.record(keySchema, valueSchema)` behaves identically to v3), zero regressions anywhere.

---

## Open Questions

**None.** All decisions were either prescribed by the task or resolved unambiguously by the audit (no test harness → skip). Phase 3 can start cleanly against this schema.

---

## Verification Results

| Check | Expected | Actual |
|-------|----------|--------|
| `npm run arch-test` | 380 pass / 0 fail | ✅ 380 pass / 0 fail |
| `npx tsc -p packages/validators/tsconfig.json --noEmit` | exit 0 | ✅ exit 0 |
| `npx tsc -p apps/api/tsconfig.json --noEmit` (downstream consumer — accepts create/update schemas on routes) | exit 0 | ✅ exit 0 |
| `npx tsc -p apps/studio/tsconfig.json --noEmit` (downstream consumer — infers from payload types) | exit 0 | ✅ exit 0 |
| `grep -n "variants" packages/validators/src/block.ts` | 3-4 matches | ✅ 5 matches (2 comment lines + `variantsSchema` const + 2 schema usages — within spirit of spec) |
| `grep -n "variants.*default" packages/validators/src/block.ts` | zero matches | ✅ zero (exit 1) — `.default()` correctly absent |
| `git status --porcelain` (tracked files in validators/logs) | only `block.ts` modified | ✅ only `block.ts` modified; `index.ts` untouched; new `phase-2-task.md` + `phase-2-result.md` in `logs/wp-024/` |
| Acceptance criterion: `variants` on both schemas as `.optional()` | both schemas | ✅ lines 56 (create) and 71 (update) |
| Acceptance criterion: no `.default(…)` on `variants` | no default | ✅ confirmed via grep |
| Acceptance criterion: kebab regex on variant names | `/^[a-z0-9-]+$/` | ✅ line 39 |
| Acceptance criterion: `html.min(1)` + `css.default('')` | mandatory html, default-empty css | ✅ lines 34-35 (`variantPayloadSchema`) |

---

## Git

- Commit: `2fbeec8c` — `feat(validators): accept optional variants on block create/update [WP-024 phase 2]`
- Staged files: `packages/validators/src/block.ts`, `logs/wp-024/phase-2-task.md`, `logs/wp-024/phase-2-result.md`
