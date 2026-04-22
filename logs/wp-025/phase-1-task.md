# WP-025 Phase 1 — Task (Package scaffold + public types)

> **Role:** Hands (execution)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 1 of 5 (Scaffold)
> **Estimated duration:** ~2h
> **Prerequisites:** Phase 0 ✅ ([logs/wp-025/phase-0-result.md](./phase-0-result.md), SHA `249a421e`)
> **Previous WP:** WP-024 ✅ DONE — `BlockVariant`/`BlockVariants` live at `packages/db/src/types.ts:97,102`

---

## Mission

Create `packages/block-forge-core/` as a fully wired workspace package with the complete public-API type surface, a working test harness (smoke test only — zero domain tests yet), and a registered domain entry in the arch-test manifest. `npm run arch-test` stays at **384/0** + new domain picked up automatically (carry-over **b** confirmed no hardcoded counts). Typecheck stays clean across monorepo.

No analyzer code, no heuristic code, no compose code — only types, scaffolding, and a single smoke test that asserts the public type surface imports cleanly.

---

## Carry-overs from Phase 0 — use verbatim

| # | Carry-over | Value | Where it applies |
|---|---|---|---|
| **a** | `postcss` pinned exact | `"8.5.10"` (no `^`, no `~`) | `packages/block-forge-core/package.json` dependencies |
| **a** | `node-html-parser` pinned exact | `"7.1.0"` (no `^`, no `~`) | `packages/block-forge-core/package.json` dependencies |
| **b** | Hardcoded-11 sites to bump | **none** — arch-test is count-agnostic | Phase 1.5: no edits needed |
| **c** | Root `package.json` workspaces | glob `packages/*` already covers new package | Phase 1.1: no root edit needed |
| **c** | Root vitest workspace config | **none exists** | Phase 1.1: add package-local `vitest.config.ts` only |
| **d** | Fixtures | **Phase 2 concern** — not scaffolded here | — |

---

## Scope contract — strict

**In scope:**
- New directory `packages/block-forge-core/` with `package.json`, `README.md`, `vitest.config.ts`, and full `src/` tree per WP § "New Files" **for types and scaffolding only**.
- `src/index.ts` — public-API re-exports (types only at this phase; function exports are stubs that throw `"not implemented in phase 1"` OR simply don't exist yet — see 1.2 for exact choice).
- `src/lib/types.ts` — complete public type surface (all 11 shapes listed in task 1.3).
- `src/__tests__/smoke.test.ts` — one trivial type-resolution test.
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — stub (arch-test `skill parity` requires file presence).
- `src/__arch__/domain-manifest.ts` — new `pkg-block-forge-core` entry.

**Out of scope (do NOT write this phase):**
- Any file under `src/analyze/`, `src/rules/`, `src/compose/` beyond empty placeholder stubs (if you even create them).
- Any fixture files under `src/__tests__/fixtures/`.
- Any heuristic tests.
- Any consumer integration (tools/block-forge, studio).
- Touching ANY file outside `packages/block-forge-core/`, `.claude/skills/domains/pkg-block-forge-core/`, `src/__arch__/domain-manifest.ts`, `logs/wp-025/`.

**If execution tempts you outside this list — STOP and escalate.** Scope creep in a Phase-1 scaffold commits the whole WP to harder-to-undo shapes.

---

## Tasks

### 1.1 — Package skeleton

Mirror `packages/validators/package.json` shape. Create `packages/block-forge-core/package.json`:

```json
{
  "name": "@cmsmasters/block-forge-core",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cmsmasters/db": "*",
    "postcss": "8.5.10",
    "node-html-parser": "7.1.0"
  },
  "devDependencies": {
    "vitest": "<match root vitest version>",
    "typescript": "<match root typescript version>"
  }
}
```

**Exact versions for dependencies** (carry-over a) — no caret, no tilde. For devDependencies, match whatever version the root `package.json` or `packages/validators/package.json` uses; if those use `^`, use `^` here too (consistency with repo convention, since dev tools already have coordinated upgrades).

Create `packages/block-forge-core/README.md` — **one-pager, <40 lines**:
- What the package is (one paragraph, lifted from WP § Problem Statement)
- What it IS (analyzer, heuristics, compose functions — pure fns)
- What it is NOT (no UI, no DB, no React, no window — inherited from ADR-025)
- How to import: `import { analyzeBlock } from '@cmsmasters/block-forge-core'` — public entry only, no deep imports
- Pointer to domain skill: `.claude/skills/domains/pkg-block-forge-core/SKILL.md`
- Note: "Heuristics never auto-apply — see `applySuggestions` contract"

Create `packages/block-forge-core/tsconfig.json` — extend from whatever `packages/validators/tsconfig.json` extends, with `rootDir: "./src"`, `outDir: "./dist"` (even though we don't build — typecheck needs it).

Create `packages/block-forge-core/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globals: false,
    environment: 'node',
  },
})
```

`environment: 'node'` matters — node-html-parser is node-capable; no jsdom needed.

### 1.2 — Public entrypoint `src/index.ts`

Re-export types ONLY this phase. Functions are NOT exported yet (they don't exist).

```ts
// packages/block-forge-core/src/index.ts

// Public type surface — consumers import from here, not deep.
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

Single `export type` block. No `export *`. No `export const`. No function exports. The WP acceptance criterion "Public API surface exported from `src/index.ts`: `analyzeBlock`, `generateSuggestions`, …" is a **Phase 4 close-condition**, not a Phase 1 condition. Phase 1 ships the type surface; subsequent phases add function exports as they implement them.

### 1.3 — Public types in `src/lib/types.ts`

Hand-write the complete public type surface. 11 shapes. Each shape is a `type` or `interface` with JSDoc one-liner. No external dependencies in this file except `import type { BlockVariants } from '@cmsmasters/db'`.

Minimum shapes (ground to WP § Architecture diagram + Phase goals):

```ts
// packages/block-forge-core/src/lib/types.ts
import type { BlockVariants } from '@cmsmasters/db'

/** Input to the engine — raw block as stored in DB or file system. */
export interface BlockInput {
  slug: string
  html: string
  css: string
}

/** Output of the engine — adaptive block ready for renderer / persistence. */
export interface BlockOutput {
  slug: string
  html: string
  css: string
  variants?: BlockVariants
}

/** Parsed block state — flat rules list + element tree + parse warnings. */
export interface BlockAnalysis {
  rules: Rule[]
  elements: Element[]
  warnings: string[]
}

/** A single CSS rule with at-rule context (empty array = top-level). */
export interface Rule {
  selector: string
  declarations: Array<{ prop: string; value: string }>
  atRuleChain: string[]   // e.g. ['@container slot (max-width: 640px)']
}

/** A single HTML element — shallow view for the heuristics that need it. */
export interface Element {
  tag: string
  classes: string[]
  childCount: number
  parentTag: string | null
}

/** A suggestion from the rule engine — consumer decides accept/tweak/reject. */
export interface Suggestion {
  id: string                   // deterministic — heuristic slug + stable hash
  heuristic: Heuristic
  selector: string
  bp: number                   // breakpoint in px, e.g. 640 | 768 | 480
  property: string
  value: string
  rationale: string
  confidence: Confidence
}

/** Identifier of one of the six ADR-025 heuristics. */
export type Heuristic =
  | 'grid-cols'
  | 'spacing-clamp'
  | 'font-clamp'
  | 'flex-wrap'
  | 'horizontal-overflow'
  | 'media-maxwidth'

/** Three levels of confidence for suggestions — UI may filter by these. */
export type Confidence = 'high' | 'medium' | 'low'

/** A tweak — a single property-per-breakpoint override, authored explicitly. */
export interface Tweak {
  selector: string
  bp: number
  property: string
  value: string
}

/** A variant — full-rewrite alternative HTML+CSS for a breakpoint. */
export interface Variant {
  name: string
  html: string
  css: string
}

/** Result of renderForPreview — deterministic HTML+CSS string pair. */
export interface PreviewResult {
  html: string
  css: string
}
```

Adjust names/shapes only if a type in `packages/db/src/types.ts` already dictates otherwise (check `BlockVariants` shape — it's `Record<string, BlockVariant>` per Phase 0 § 0.2). The `Variant` type above is a Phase-1 engine-side representation and does NOT need to be identical to `BlockVariant`; if you find that matching the DB type verbatim simplifies Phase 4's `composeVariants`, do so — but keep the change limited to this file.

### 1.4 — Smoke test

Create `packages/block-forge-core/src/__tests__/smoke.test.ts`:

```ts
import { describe, it, expectTypeOf } from 'vitest'
import type {
  BlockInput,
  BlockOutput,
  Suggestion,
  Heuristic,
  Confidence,
} from '../index'

describe('public type surface', () => {
  it('resolves all public types from package entry', () => {
    // Type-level smoke: these assignments must compile.
    const heuristic: Heuristic = 'grid-cols'
    const confidence: Confidence = 'high'
    const input: BlockInput = { slug: 'x', html: '', css: '' }
    const output: BlockOutput = { slug: 'x', html: '', css: '' }
    const suggestion: Suggestion = {
      id: 'test',
      heuristic,
      selector: 'div',
      bp: 768,
      property: 'padding',
      value: '1rem',
      rationale: '',
      confidence,
    }
    expectTypeOf(suggestion).toMatchTypeOf<Suggestion>()
    expectTypeOf(input).toMatchTypeOf<BlockInput>()
    expectTypeOf(output).toMatchTypeOf<BlockOutput>()
  })
})
```

If `expectTypeOf` isn't available in the project's vitest version, fall back to plain runtime assertions — the goal is "imports resolve and types check", not exhaustive type testing.

### 1.5 — Domain manifest + skill stub

**Manifest edit** — add new domain entry to `src/__arch__/domain-manifest.ts`:

```ts
'pkg-block-forge-core': {
  name: 'Block Forge Core Engine',
  slug: 'pkg-block-forge-core',
  description: 'Framework-agnostic responsive block authoring — CSS analyzer, auto-rules, tweak emitter, variant composer, preview renderer. Pure functions.',
  owned_files: [
    'packages/block-forge-core/package.json',
    'packages/block-forge-core/README.md',
    'packages/block-forge-core/tsconfig.json',
    'packages/block-forge-core/vitest.config.ts',
    'packages/block-forge-core/src/index.ts',
    'packages/block-forge-core/src/lib/types.ts',
    'packages/block-forge-core/src/__tests__/smoke.test.ts',
  ],
  owned_tables: [],
  public_entrypoints: ['packages/block-forge-core/src/index.ts'],
  allowed_imports_from: ['pkg-db'],
  known_gaps: [
    'important: heuristics never auto-apply — consumers MUST present suggestions for accept/tweak/reject per ADR-025',
    'note: fixture blocks in src/__tests__/fixtures/ are frozen; never /content-pull into this folder',
    'scaffold-only in Phase 1: analyze/ rules/ compose/ trees + function exports land in Phases 2-4',
  ],
},
```

**IMPORTANT:** `owned_files` in Phase 1 lists **only files that exist at end of Phase 1**. The WP's full owned_files list (L192-213) includes Phase 2/3/4 files — those get added by their respective phases. Manifest ownership MUST match actual FS — arch-test will fail otherwise. The third `known_gaps` entry documents the staged growth pattern.

**Skill stub** — create `.claude/skills/domains/pkg-block-forge-core/SKILL.md`:

```md
# pkg-block-forge-core — Block Forge Core Engine

> **Status:** scaffold (Phase 1 — WP-025). Invariants/Traps/Recipes populated in Phase 5 Close.
> **Purpose:** Pure-function engine for responsive block authoring. Consumed by tools/block-forge (future WP-026) and Studio Responsive tab (future WP-027).

## Start Here (Phase 1 — minimal)

- [packages/block-forge-core/README.md](../../../../packages/block-forge-core/README.md) — what + why
- [packages/block-forge-core/src/lib/types.ts](../../../../packages/block-forge-core/src/lib/types.ts) — public type surface
- [workplan/WP-025-block-forge-core.md](../../../../workplan/WP-025-block-forge-core.md) — full architecture + phases

## Invariants

TBD in Phase 5 Close (after implementation lands in Phases 2–4).

## Traps & Gotchas

TBD in Phase 5 Close.

## Blast Radius

TBD in Phase 5 Close.
```

The stub is deliberately thin — arch-test's `skill parity` check requires the file to exist and reference the domain slug; full content lands in Phase 5 Close (per WP § Phase 5).

### 1.6 — Install + verify

```bash
npm install
```

This wires the new workspace. Expect npm to:
- Create symlink in `node_modules/@cmsmasters/block-forge-core`
- Hoist `postcss@8.5.10` + `node-html-parser@7.1.0` (or nest them, depending on resolution)
- NOT downgrade existing `postcss@^8` devDeps in apps (dedupe should find a compatible resolution)

After install:

```bash
npm ls postcss
```

Expect: single top-level resolution for `postcss` (e.g., `postcss@8.5.10`) with app devDeps pointing to the same. If you see a `node_modules/.../node_modules/postcss@<different>` nested install for any app, that's a split — flag in the result log but don't block (dedupe behavior is npm's domain).

```bash
npm run arch-test
```

Expected: **384/0** (same as Phase 0 baseline). The new domain is picked up automatically via manifest iteration (carry-over b confirmed count-agnostic). If count changes (e.g., new path-existence tests fire for the new `owned_files`), record the new number AND verify the delta is explainable (7 new path-existence tests → +7 arch-test count is acceptable; arbitrary failures are not).

```bash
npm -w @cmsmasters/block-forge-core run test
```

Expected: smoke test passes. 1 test file, 1 test, green.

```bash
npm run typecheck
```

Expected: clean across monorepo. No new errors from the scaffold.

### 1.7 — Log + commit

Write `logs/wp-025/phase-1-result.md` with:
- What shipped (file list + LoC estimate)
- Install sanity — `npm ls postcss` output + interpretation
- Arch-test count (384 → N) + explanation for any delta
- Smoke test green proof
- Typecheck green proof
- Any deviations from this task prompt (e.g., if devDeps versions had to be adjusted) — with one-line justification each
- Open questions for Brain (if any) — numbered Q1..Qn OR explicit "None."

Commit — stage ONLY:

```
packages/block-forge-core/                  # entire new directory
.claude/skills/domains/pkg-block-forge-core/SKILL.md
src/__arch__/domain-manifest.ts
package-lock.json                           # expected modified by npm install
logs/wp-025/phase-1-task.md                 # this file
logs/wp-025/phase-1-result.md               # your result log
```

**Do NOT** stage:
- Root `package.json` (should not be modified — glob workspaces already cover new package)
- Any file outside the list above

Commit message:

```
feat(pkg-block-forge-core): scaffold package + public types [WP-025 phase 1]
```

Embed the final commit SHA into `phase-1-result.md` as a post-commit follow-up (per WP-024 precedent). If the package-lock.json diff is noisy (large resolution changes from `npm install`), note in the result log — expected noise, not drift.

---

## Hard gates — do not violate

- **384/0 baseline must hold** (or grow cleanly with explainable delta for new path-existence tests). Red arch-test blocks the phase.
- **Typecheck must be clean across the monorepo** — not just the new package.
- **Exact version pins** for `postcss` and `node-html-parser` — no caret, no tilde.
- **No function exports from `src/index.ts`** — types only. Phases 2-4 add functions as they ship.
- **`allowed_imports_from: ['pkg-db']` already enforced** — `src/lib/types.ts` is the only file that imports from another package (`@cmsmasters/db`). If you find yourself writing `import` for `postcss` or `node-html-parser` in Phase 1 code, you've over-reached scope — those imports belong in Phase 2.
- **No files outside Scope Contract's allowed list** get edited.
- **Root `package.json` is NOT edited.** Glob workspaces already cover the new package (carry-over c).

---

## Verification checklist — what phase-1-result.md MUST show

| Check | Expected | Source |
|---|---|---|
| Files created under `packages/block-forge-core/` | 7 files (package.json, README.md, tsconfig.json, vitest.config.ts, src/index.ts, src/lib/types.ts, src/__tests__/smoke.test.ts) | `ls -R packages/block-forge-core/` |
| Skill stub created | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` present | `ls .claude/skills/domains/pkg-block-forge-core/` |
| Manifest entry landed | `pkg-block-forge-core` key in `src/__arch__/domain-manifest.ts` | `grep -n "pkg-block-forge-core" src/__arch__/domain-manifest.ts` |
| `npm ls postcss` result | Deduped or clean split; no blocker | captured in result log |
| `npm run arch-test` | 384/0 OR 384+N/0 where N is new path-existence tests for 7 owned_files (so N ≤ 7); explain delta | captured |
| `npm -w @cmsmasters/block-forge-core run test` | 1 smoke test green | captured |
| `npm run typecheck` | clean | captured |
| Public types importable | `import type { BlockInput, … } from '@cmsmasters/block-forge-core'` compiles | smoke test IS this check |
| `allowed_imports_from: ['pkg-db']` enforced | `grep -rn "from '@cmsmasters/" packages/block-forge-core/src/` shows only `@cmsmasters/db` | grep in result log |
| No function exports in `src/index.ts` | Only `export type { … }` block | `cat packages/block-forge-core/src/index.ts` in result log |
| `package.json` (root) unchanged | `git diff package.json` clean | captured |

---

## What success looks like

Phase 1 ends with a package that any consumer can install and import types from, a test harness that runs a single smoke test, a domain registered in the manifest, and arch-test green. Phase 2 opens to a clean scaffold — adds `src/analyze/` files + their tests, appends them to `owned_files`, and moves on. Zero "wait, where does X go?" questions — the shape is already there.

If at any point the scope contract feels too narrow (e.g., "it would be efficient to drop in the postcss wrapper now") — **resist**. Phase 2 is the right place for it. Scope discipline in scaffolding is how WP-024 landed clean and how WP-025 will too.
