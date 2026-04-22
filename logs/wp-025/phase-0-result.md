# WP-025 Phase 0 — Result (RECON)

> **Phase:** 0 of 5 (RECON)
> **Duration:** ~45 min (audit only, no code written)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Prev:** WP-024 ✅ DONE (2026-04-22) — `BlockVariant` / `BlockVariants` live, arch-test 384/0, typecheck clean
> **Next:** Phase 1 awaits Brain decisions on open questions (if any), then scaffolds package using carry-overs a/b/c/d verbatim

---

## 0.1 — Skills read (context load)

| Skill | One-line takeaway |
|---|---|
| [pkg-db/SKILL.md](../../.claude/skills/domains/pkg-db/SKILL.md) | Types flow `types.ts` → re-exported via `index.ts`. **`BlockVariant` + `BlockVariants` already live** (added WP-024). New domain imports them from `@cmsmasters/db` — no type duplication. |
| [pkg-validators/SKILL.md](../../.claude/skills/domains/pkg-validators/SKILL.md) | Package shape to mirror: `private: true`, `"main": "./src/index.ts"`, `"exports": {".": "./src/index.ts"}`, per-entity files under `src/`. Skeleton skill — low coupling, easy reference pattern. |
| [studio-blocks/SKILL.md](../../.claude/skills/domains/studio-blocks/SKILL.md) | `block-processor.ts` is **regex-based, client-side, suggestion-oriented** — scans strings, not AST. WP-025 needs real AST parsers (postcss + node-html-parser) to walk declarations deterministically. Reference only, do NOT import/extend. |

---

## 0.2 — WP-024 exports live

```bash
$ grep -n "BlockVariant\|BlockVariants" packages/db/src/index.ts packages/db/src/types.ts
packages/db/src/index.ts:25:  BlockVariant,
packages/db/src/index.ts:26:  BlockVariants,
packages/db/src/types.ts:97:export interface BlockVariant {
packages/db/src/types.ts:102:export type BlockVariants = Record<string, BlockVariant>
```

Both types live on `types.ts` and are re-exported from `index.ts` as part of the main type export block (L13–L50 context). **No STOP.** Phase 1 imports via `import type { BlockVariant, BlockVariants } from '@cmsmasters/db'`.

---

## 0.3 — Parser audit

### Step 1 — repo-wide presence check

```bash
$ grep -rn "\"postcss\":" --include="package.json"
apps/admin/package.json:24:          "postcss": "^8"
apps/command-center/package.json:29:  "postcss": "^8.4.0"
apps/studio/package.json:29:        "postcss": "^8"
apps/dashboard/package.json:25:     "postcss": "^8"
# (+ 5 identical hits under .claude/worktrees/* — worktree copies, dismissed)
```

```bash
$ grep -rn "\"node-html-parser\":" --include="package.json"
(no matches)
```

```bash
$ grep -rn "from ['\"]postcss['\"]\|from ['\"]node-html-parser['\"]" \
    packages/ apps/ tools/ --include="*.ts" --include="*.tsx" --include="*.js"
(no matches)
```

**Interpretation — no STOP:**

- `postcss@^8` is a devDependency in 4 apps (admin, command-center, studio, dashboard) because each runs `postcss.config.cjs` as part of the Tailwind build pipeline (autoprefixer-style ecosystem use). **Zero `import … from 'postcss'` in code anywhere.** Per task § 0.3 guidance ("PostCSS ecosystem … does NOT count — record + dismiss"), this is ecosystem presence, not code-import presence.
- `.claude/worktrees/` hits are gitignored session worktrees, not main tree — dismissed.
- `node-html-parser` completely absent. Clean.
- No architectural assumption violated. Proceeding.

### Step 2 — latest stable + security scan

```bash
$ npm view postcss version
8.5.10

$ npm view node-html-parser version
7.1.0
```

Full metadata scan (`npm view postcss` / `npm view node-html-parser`):

| Package | Version | Published | License | Deprecated? | Notes |
|---|---|---|---|---|---|
| `postcss` | `8.5.10` | 1 week ago | MIT | No | 3 deps (nanoid, picocolors, source-map-js). Maintainer: `ai@sitnik.es` (author/primary). 274 versions — active. |
| `node-html-parser` | `7.1.0` | 1 month ago | MIT | No | 2 deps (css-select, he). Maintainer: `taoqf`. 123 versions. `beta` dist-tag at `6.1.15-0` — ignore, latest = 7.1.0. |

No deprecated fields in either manifest. No recent CVE advisories flagged in `npm view` output. Both packages are on active maintenance tracks.

### Carry-over (a) — pinned versions for Phase 1.1

```
postcss:          "8.5.10"        ← Phase 1.1 pins this (no ^, no ~)
node-html-parser: "7.1.0"         ← Phase 1.1 pins this (no ^, no ~)
```

---

## 0.4 — Fixture picks

### Inventory

```bash
$ ls content/db/blocks/*.json
content/db/blocks/fast-loading-speed.json
content/db/blocks/header.json
content/db/blocks/sidebar-perfect-for.json
content/db/blocks/sidebar-pricing.json
```

**Only 4 blocks exist.**

### Classification (read each file's CSS)

| File | `display: grid`? | `flex-direction: row` w/ ≥3 root children? | Plain-copy fit? | Key props |
|---|---|---|---|---|
| `fast-loading-speed.json` | ❌ no grid anywhere | ❌ root is `flex; flex-direction: column` | ❌ hardcoded `padding: 64px 40px`, `font-size: 60px`, `width: 615px` | spacing-clamp candidate only |
| `header.json` | ❌ no grid | ⚠️ root has `display: flex` (row default) but only **2 direct children** (`__logo` + `__right`); nested `__links` has 4 anchor children but is not block root | ❌ hardcoded 112px, 44px, 280px, 35px, 18px, 112px | sticky nav, not pricing-row shape |
| `sidebar-perfect-for.json` | ❌ no grid | ❌ root is `flex; flex-direction: column` | ✅ mostly tokenized typography + badges; `padding: var(--spacing-2xl, 32px)` (≤ 40px trigger); hardcoded bits: `max-width: 360px`, `width/height: 24px` icons | **best plain-copy fit** — nearly heuristic-free |
| `sidebar-pricing.json` | ❌ no grid | ❌ root is `flex; flex-direction: column`; internal `__price-row` / `__buttons` are row but each has only 2 children | ❌ has button rows + max-width 360px hardcoded | weak flex-row candidate at best |

```bash
$ grep -rnE "display:\s*grid|grid-template-columns" content/db/blocks/
(no matches)
```

**Confirmed: no block in `content/db/blocks/` uses `display: grid`.** All 4 are flexbox-based.

### ⛔ BLOCKER — Carry-over (d) cannot be completed as specified

Per task § 0.4: *"If any of the three categories has no good candidate in `content/db/blocks/`, log it as a blocker — don't substitute synthetic fixtures."*

- **block-hero-grid** → ❌ NO CANDIDATE. Zero blocks use `display: grid`.
- **block-pricing-row** → ⚠️ WEAK CANDIDATE. No block has ≥3 flex-row siblings at root. Closest is `header.json` root (flex row, 2 direct children) or its nested `.block-header-nav__links` (4 anchors, but that's a child of the block, not the block root — doesn't match the heuristic target "block root with flex-direction: row + N≥3 children + no flex-wrap").
- **block-plain-copy** → ✅ CANDIDATE. `sidebar-perfect-for.json` — typography-forward, column-flex, mostly tokenized. A few hardcoded bits (`max-width: 360px`, `24px` icons) may or may not trigger heuristics depending on thresholds; Phase 2 test can assert the exact expected count.

Deferring fixture slugs + hashes until Brain routes Q1 below. Candidate-only hashes (for reference, in case Brain accepts them or partial coverage):

```
sidebar-perfect-for.json → sha256=263a76bc95d4ea803f86d4f457290287118265e3922370d4bc40e3922cb31452   (plain-copy candidate)
fast-loading-speed.json  → sha256=91aa6aefea1c267379c45dfd79bbcf80c510179726c0a1b1d2320a25e38d343a   (spacing-clamp surface, not a hero-grid fit)
header.json              → sha256=36e52be3ee1b50abc7bb74c0493a8702b21e13cfd2ceda056be49700974cba91   (weak flex-row — nested only)
sidebar-pricing.json     → sha256=2c3be480ba54daae15e9590f056f0b7d67b5d239cb7c1450008031307c0c6ebd   (column root; 2-child flex rows)
```

These are **reference hashes only**, not accepted fixtures. Brain decides via Q1.

---

## 0.5 — Arch-test baseline + hardcoded-count audit

### Step 1 — baseline

```bash
$ npm run arch-test 2>&1 | tail -5
 Test Files  1 passed (1)
      Tests  384 passed (384)
   Start at  20:31:26
   Duration  474ms
```

✅ **384 passed / 0 failed.** Matches WP-024 Phase 5 close baseline exactly. No drift.

### Step 2 — hardcoded-count grep

```bash
$ grep -rnE "toHaveLength|Object\.keys\([^)]*domain[^)]*\)\.length|DOMAIN_COUNT|domains\.length" src/__arch__/
(no matches)

$ grep -rnE "\b11\b" src/__arch__/
(no matches)
```

No hardcoded structural count assertions. No literal `11` anywhere in `src/__arch__/`. All parity/ownership assertions in `domain-manifest.test.ts` iterate over the manifest's `domains` array without locking count.

### Carry-over (b) — Hardcoded domain-count sites

```
none — all parity/ownership assertions are count-agnostic.
Phase 1 adds pkg-block-forge-core → domain-manifest.domains array grows to 12.
Arch-test automatically picks up the new entry via iteration; no bump edit needed.
```

---

## 0.6 — Workspace pickup audit

### Step 1 — root `package.json`

```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

✅ **Glob pattern.** `packages/block-forge-core/` will be auto-discovered by npm workspaces once created. No enumerated-list edit needed in Phase 1.

### Step 2 — vitest config

```bash
$ ls vitest.workspace.ts vitest.workspace.js vitest.config.ts vitest.config.js
(none exist at repo root)
```

**No root-level vitest workspace config.** The only vitest config is `src/__arch__/vitest.config.ts`, invoked explicitly by `npm run arch-test`. Other packages run tests independently (validators has `src/__tests__/` but no `vitest.config.ts`, so its tests don't currently run as part of any repo-level task — side observation, out of Phase 0 scope).

### Carry-over (c) — workspace + test config

```
Root package.json workspaces: glob "packages/*"    — no action needed in Phase 1.1
Vitest workspace config:       NONE at root         — no action needed in Phase 1.1

Phase 1.1 adds:
  packages/block-forge-core/vitest.config.ts       (package-local config; run via its own `test` script)
  packages/block-forge-core/package.json scripts   (e.g., "test": "vitest run")
```

Running `npm run arch-test` continues to use only `src/__arch__/vitest.config.ts` — orthogonal to new package's tests.

---

## 0.7 — Open questions for Brain

### Q1 — **BLOCKER.** No grid-based block exists in `content/db/blocks/`.

**Context:** Phase 0 § 0.4 requires 3 frozen fixtures covering `heuristic-grid-cols`, `heuristic-flex-wrap`, and a negative plain-copy case. All 4 blocks under `content/db/blocks/` use flexbox only; none use `display: grid`. Similarly, no block has a root-level flex-row with ≥3 direct children (closest is `header.json` root with 2 children, or its nested `__links` with 4 anchors — but nested, not root).

**What Phase 1/2 cannot do without your answer:**
- Phase 2 cannot copy fixtures into `__tests__/fixtures/` because the required categories don't all exist in source.
- Tests for `heuristic-grid-cols` have no real-world fixture to assert against.
- Tests for `heuristic-flex-wrap` have weak real-world coverage.

**Proposed resolution paths (Brain picks one):**
1. **Author new seed blocks.** Before Phase 2, `/block-craft` a grid-based hero block (e.g., `block-hero-grid` with `grid-template-columns: repeat(3, 1fr)`) and a flex-row pricing block (3 price tiers side-by-side) and commit them to `content/db/blocks/`. Phase 2 then uses them as fixtures.
2. **Relax fixture sourcing.** Allow Phase 2 to embed minimal synthetic HTML+CSS fixtures directly in `__tests__/fixtures/` (not sourced from `content/db/blocks/`). Violates the current "freeze from real block" pattern but unblocks tests today.
3. **Redefine fixture categories.** Replace `block-hero-grid` with a heuristic-spacing-clamp fixture (where `fast-loading-speed.json` has `padding: 64px 40px` — triggers clearly). Replace `block-pricing-row` with a different real heuristic the available blocks cover. Plain-copy keeps `sidebar-perfect-for`.
4. **Partial Phase 1 / hold Phase 2.** Phase 1 still scaffolds package + parsers + one-or-two heuristics that have working fixtures; defer `heuristic-grid-cols` to a later phase after new seed blocks ship.

**My recommendation (non-binding):** Path 1 or Path 3. Path 1 is cleanest (real blocks, real fixtures, no new test shapes) but requires `/block-craft` work. Path 3 keeps the Phase 1/2 timeline but narrows WP-025 initial heuristic coverage.

### Q2 — PostCSS ecosystem presence in 4 apps

**Context:** `postcss@^8` is a devDependency in `apps/admin`, `apps/command-center`, `apps/studio`, `apps/dashboard` (Tailwind's PostCSS config runtime). No code imports `from 'postcss'`. Task § 0.3 says "record + dismiss" for ecosystem use — I've dismissed it. Flagging here just so you're aware before Phase 1: the new `packages/block-forge-core/package.json` will add `postcss` as a direct dependency (pinned `8.5.10`), which may hoist to the root `node_modules` alongside the existing `^8` devDeps in apps. No version conflict expected (both resolve to 8.5.x minor range), but npm's dedupe behavior across workspaces should be verified after Phase 1.1 install.

**Expected answer:** "Fine, proceed — dedupe is npm's job; re-run arch-test after install; if a resolver complaint surfaces, Phase 1 pins apps' devDeps to match." Only flag if you want a different path.

---

## Verification — Phase 0 deliverable checklist

| § | Requirement | Status |
|---|---|---|
| 0.1 | 1-line takeaway per skill (3 total) | ✅ 3 takeaways above |
| 0.2 | Exact export lines for `BlockVariant` + `BlockVariants` | ✅ Recorded (index.ts:25-26 + types.ts:97,102) |
| 0.3 | Parser grep (zero code imports) + npm view output + security scan | ✅ Zero code imports; deprecation/security clean |
| 0.3 | Carry-over (a) | ✅ `postcss: 8.5.10`, `node-html-parser: 7.1.0` |
| 0.4 | 3 rows of picked fixtures with slug/source/sha256/why | ⛔ **BLOCKER — Q1 open.** Candidate hashes recorded, not accepted |
| 0.5 | Arch-test exact pass/fail | ✅ 384/0 |
| 0.5 | Carry-over (b) | ✅ `none — all parity/ownership assertions are count-agnostic` |
| 0.6 | Carry-over (c) | ✅ glob workspaces + no root vitest = Phase 1.1 only adds package-local config |
| 0.7 | Numbered Q1..Qn OR "None." | ✅ Q1 (blocker), Q2 (flag) |
| Header | Phase, duration, WP link, audit-only | ✅ Present |
| Footer | "Next: Phase 1 awaits Brain decisions …" | ✅ Present (top of file) |

### Scope discipline — hard gates honored

- ✅ No code written (only this file + it will be committed alongside the Brain-written `phase-0-task.md`)
- ✅ No `npm install` run
- ✅ No `package.json` edits
- ✅ No manifest edits
- ✅ No fixture copies (only hashes recorded, and those are deferred pending Q1)
- ✅ No arch-test edits

---

## Git

- **Commit:** `249a421e` — `chore(logs): WP-025 Phase 0 RECON — audit + carry-overs for Phase 1 scaffold [WP-025 phase 0]`
- **Staged:** `logs/wp-025/phase-0-task.md`, `logs/wp-025/phase-0-result.md` (only)
- **Message:** `chore(logs): WP-025 Phase 0 RECON — audit + carry-overs for Phase 1 scaffold [WP-025 phase 0]`

---

## Next

Phase 1 awaits Brain decisions on Q1 (fixture blocker — **mandatory answer needed**) and Q2 (PostCSS ecosystem flag — likely dismiss).

Once Q1 resolves, Phase 1 scaffolds `packages/block-forge-core/` using carry-overs (a/b/c) verbatim, adds `pkg-block-forge-core` to `domain-manifest.ts`, runs install + arch-test, then fixture copy + tests land in Phase 2 per Q1 resolution.
