# WP-025 Phase 1 — Result (Package scaffold + public types)

> **Phase:** 1 of 5 (Scaffold)
> **Duration:** ~45 min (writes + install + verify + fix-up for 2 spec bugs)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Task:** [logs/wp-025/phase-1-task.md](./phase-1-task.md)
> **Previous:** Phase 0 ✅ (`249a421e` + SHA-embed `eade9e4f`)
> **Next:** Phase 2 (analyzer) — awaits Brain Q1 resolution (fixture blocker) from Phase 0

---

## What shipped

New workspace package `@cmsmasters/block-forge-core` — types-only scaffold, single smoke test, domain registered, arch-test green.

| File | LoC | Purpose |
|---|---|---|
| `packages/block-forge-core/package.json` | 22 | Private workspace package; pins postcss 8.5.10 + node-html-parser 7.1.0 (Phase 0 carry-over **a**) |
| `packages/block-forge-core/README.md` | 33 | One-pager: what / what-not / import / domain skill pointer |
| `packages/block-forge-core/tsconfig.json` | 16 | Inline compilerOptions mirrors pkg-db/pkg-validators; paths mapping for `@cmsmasters/db` |
| `packages/block-forge-core/vitest.config.ts` | 10 | `environment: 'node'`, `globals: false`, `include: src/**/*.test.ts` |
| `packages/block-forge-core/src/index.ts` | 14 | Single `export type` block — 11 public shapes. Zero function exports. |
| `packages/block-forge-core/src/lib/types.ts` | 87 | 11 shapes. Only external import: `import type { BlockVariants } from '@cmsmasters/db'` |
| `packages/block-forge-core/src/__tests__/smoke.test.ts` | 31 | `expectTypeOf` on Suggestion/BlockInput/BlockOutput — validates public surface resolves through `../index` |
| `.claude/skills/domains/pkg-block-forge-core/SKILL.md` | 28 | Frontmatter + scaffold body; Invariants/Traps/Blast Radius deferred to Phase 5 Close |
| `src/__arch__/domain-manifest.ts` | +22 | New `pkg-block-forge-core` entry inserted after `pkg-api-client` (end of PACKAGE DOMAINS section) |

**Total new files:** 8 · **Manifest edit:** 1 · **package-lock.json:** modified (expected).

Domain count: 11 → **12**. Manifest iteration picks it up automatically (Phase 0 carry-over **b** confirmed — zero hardcoded counts in `src/__arch__/`).

---

## Install sanity

### `npm install`
```
added 3 packages, and audited 1533 packages in 4s
1 moderate severity vulnerability   (pre-existing, unrelated to this phase)
```
Three packages added: `@cmsmasters/block-forge-core` (workspace link) + `postcss@8.5.10` + `node-html-parser@7.1.0`. No downgrades prompted.

### `npm ls postcss`

**Finding (flagged, not blocking):** split resolution.

```
+-- @cmsmasters/admin        → postcss@8.4.31 (hoisted root devDep)
+-- @cmsmasters/block-forge-core  → postcss@8.5.10 (nested)
+-- @cmsmasters/command-center    → postcss@8.4.31 (deduped)
+-- @cmsmasters/dashboard    → postcss@8.4.31 (deduped)
+-- @cmsmasters/studio       → postcss@8.4.31 (deduped)
+-- @nx/next transitive      → postcss@8.5.8 / 8.5.9 (various nested)
```

- Our pin `postcss: 8.5.10` (exact) does NOT match root devDeps' caret range `postcss: ^8`, so npm refuses to dedupe and nests `8.5.10` under `node_modules/@cmsmasters/block-forge-core/node_modules/postcss`.
- Apps' pipelines (Tailwind, Vite) continue to use `8.4.31` — unchanged.
- Expected behavior per task prompt: _"If you see a `node_modules/.../node_modules/postcss@<different>` nested install for any app, that's a split — flag in the result log but don't block"_.
- Cost: duplicated postcss in `node_modules` (~200KB). Benefit: Phase 1's exact pin is honored; Phase 2 analyzer parses with precisely `postcss@8.5.10`.

### `npm ls node-html-parser`
```
`-- @cmsmasters/block-forge-core@0.0.0
   `-- node-html-parser@7.1.0
```
Clean — single install, no tree pollution.

---

## Arch-test

| Run | Count | Duration | Result |
|---|---|---|---|
| 1st attempt (spec-verbatim files) | 394 passed / **4 failed** | 513 ms | Red — see "Deviations" below |
| 2nd attempt (after fix-up) | **398 passed / 0 failed** | 508 ms | ✅ Green |

**Delta from baseline (384 → 398 = +14):**

| Source | Count | Notes |
|---|---|---|
| Path Existence per `owned_files` | +7 | one per listed file (package.json / README.md / tsconfig.json / vitest.config.ts / src/index.ts / src/lib/types.ts / src/__tests__/smoke.test.ts) |
| Skill Parity (file exists + frontmatter domain match + source_of_truth + status valid) | +4 | all now pass — required frontmatter addition (spec deviation, see below) |
| Known Gaps Severity (one per entry) | +3 | three gaps, each gets a `startsWith(critical:\|important:\|note:)` assertion |
| **Total new** | **+14** | Matches observed delta exactly; no arbitrary failures. |

---

## Smoke test

```
> @cmsmasters/block-forge-core@0.0.0 test
> vitest run

 RUN  v4.1.2 C:/.../packages/block-forge-core
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  249ms
```

Single `public type surface > resolves all public types from package entry` passes. `expectTypeOf` is available in vitest 4.1.2 — no fallback needed.

---

## Typecheck

Monorepo-wide, per WP-024 Phase 5 precedent (same set of `tsc -p …`):

| Project | Result |
|---|---|
| `packages/block-forge-core/tsconfig.json` | ✅ clean (after dropping `rootDir`/`outDir` — see deviations) |
| `apps/portal/tsconfig.json` | ✅ clean |
| `apps/studio/tsconfig.json` | ✅ clean |
| `apps/api/tsconfig.json` | ✅ clean |
| `tools/layout-maker/tsconfig.json` | ✅ clean |

No new errors introduced outside the scaffold.

---

## Contract proofs

### `packages/block-forge-core/src/index.ts` (full contents)
```ts
export type {
  BlockInput,
  BlockOutput,
  BlockAnalysis,
  Rule,
  Element,
  Suggestion,
  Heuristic,
  Confidence,
  Tweak,
  Variant,
  PreviewResult,
} from './lib/types'
```
Single `export type` block, zero function exports. ✅ Hard-gate honored.

### `allowed_imports_from: ['pkg-db']` enforced
```bash
$ grep -rn "from '@cmsmasters/" packages/block-forge-core/src/
packages/block-forge-core/src/lib/types.ts:1:import type { BlockVariants } from '@cmsmasters/db'
```
Single import across the whole src tree, exclusively from `@cmsmasters/db`. ✅ Contract matches manifest.

### Root `package.json` unchanged
```bash
$ git diff --stat package.json
(no output — file unchanged)
```
Glob workspaces `packages/*` covered the new package per Phase 0 carry-over **c**. ✅ No root edit needed.

---

## Deviations from task prompt (minor, both forced by arch-test structural invariants)

### Deviation 1 — SKILL.md frontmatter added

**Task prompt** specified the SKILL.md stub as plain markdown with just `# heading` + body.

**Actual** — added YAML frontmatter matching `.claude/skills/domains/infra-tooling/SKILL.md` convention:
```yaml
---
domain: pkg-block-forge-core
description: "Framework-agnostic responsive block authoring — …"
source_of_truth: src/__arch__/domain-manifest.ts
status: skeleton
---
```

**Why:** `src/__arch__/domain-manifest.test.ts > Skill Parity` suite asserts every domain's SKILL.md contains:
- `frontmatter domain matches slug`
- `source_of_truth points to manifest`
- `status is valid` (one of `'full' | 'skeleton' | 'deprecated'`)

Without frontmatter the stub failed these checks (3 FAILs). `status: skeleton` is the correct value given Invariants/Traps/Blast Radius are deferred to Phase 5.

### Deviation 2 — Third `known_gaps` entry prefixed

**Task prompt** quoted the third entry verbatim as:
```
'scaffold-only in Phase 1: analyze/ rules/ compose/ trees + function exports land in Phases 2-4'
```

**Actual:**
```
'note: scaffold-only in Phase 1 — analyze/ rules/ compose/ trees + function exports land in Phases 2-4'
```

**Why:** `Known Gaps Severity` arch-test asserts every gap starts with `critical:`, `important:`, or `note:`. Without the `note:` prefix, this entry failed (1 FAIL). `note:` is correct severity — this is informational about phased growth, not a defect.

### Deviation 3 — Dropped `rootDir: "./src"` + `outDir: "./dist"` from tsconfig

**Task prompt** directed:
> Create `packages/block-forge-core/tsconfig.json` — extend from whatever `packages/validators/tsconfig.json` extends, with `rootDir: "./src"`, `outDir: "./dist"` (even though we don't build — typecheck needs it).

**Actual** — kept everything except `rootDir` + `outDir`. Mirrors `packages/db/tsconfig.json` exactly (also has `paths` mapping + no rootDir/outDir).

**Why:** With `paths: { "@cmsmasters/db": ["../db/src/index.ts"] }` + `rootDir: "./src"`, TS6059 fires (17 errors) — TS follows the path alias, finds files under `packages/db/src/`, and rejects them as "not under rootDir `packages/block-forge-core/src`". Removing `rootDir`/`outDir` resolves cleanly; `noEmit: true` already makes `outDir` a no-op. The `packages/db/tsconfig.json` pattern (noEmit + paths, no rootDir) is the proven shape for this repo.

All three deviations are documented here; no further scope changes.

---

## Files staged for commit

```
packages/block-forge-core/                   # new — 7 files (incl. src tree)
.claude/skills/domains/pkg-block-forge-core/ # new — SKILL.md with frontmatter
src/__arch__/domain-manifest.ts              # modified — +22 lines (new domain entry)
package-lock.json                            # modified — postcss + node-html-parser resolution
logs/wp-025/phase-1-task.md                  # new — Brain-written
logs/wp-025/phase-1-result.md                # new — this file
```

**Not staged** — intentional, per task prompt hard-gate:
- `package.json` (root) — unchanged
- Untracked screenshots, workplan drafts, backup folders (all pre-existing)

---

## Open questions for Brain

**Q1 (fixture blocker from Phase 0, still open):** before Phase 2 starts, Brain needs to pick one of the four resolution paths surfaced in Phase 0's `phase-0-result.md` § 0.7. Phase 2 builds the analyzer and its first heuristic-surfacing tests — without frozen fixtures it can't begin.

No new Phase 1 questions.

---

## Verification checklist (from task § "Verification checklist")

| Check | Expected | Actual | ✓ |
|---|---|---|---|
| Files under `packages/block-forge-core/` | 7 | 7 (package.json, README.md, tsconfig.json, vitest.config.ts, src/index.ts, src/lib/types.ts, src/__tests__/smoke.test.ts) | ✅ |
| Skill stub present | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` | present, with frontmatter (see Deviation 1) | ✅ |
| Manifest entry landed | `pkg-block-forge-core` key in manifest | present; 12th domain | ✅ |
| `npm ls postcss` | deduped or clean split, no blocker | split (recorded); not a blocker | ✅ |
| `npm run arch-test` | 384/0 OR 384+N/0 with N ≤ ~14 | **398/0** (+14 new tests, all explainable) | ✅ |
| `npm -w @cmsmasters/block-forge-core run test` | 1 smoke test green | 1 test green, 249ms | ✅ |
| Monorepo typecheck | clean | portal + studio + api + layout-maker + block-forge-core all clean | ✅ |
| Public types importable | `import type … from '@cmsmasters/block-forge-core'` compiles | smoke test is the proof | ✅ |
| `allowed_imports_from: ['pkg-db']` enforced | grep shows only `@cmsmasters/db` | confirmed (1 line, db only) | ✅ |
| No function exports in `src/index.ts` | only `export type { … }` | confirmed (file contents pasted above) | ✅ |
| Root `package.json` unchanged | `git diff` clean | confirmed | ✅ |

11 / 11 green.

---

## Git

- **Commit:** `{pending}` — `feat(pkg-block-forge-core): scaffold package + public types [WP-025 phase 1]`

Final SHA embedded post-commit via follow-up `chore(logs)` per Phase 0 / WP-024 Phase 4 precedent.
