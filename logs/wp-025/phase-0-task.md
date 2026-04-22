# WP-025 Phase 0 — Task (RECON)

> **Role:** Hands (audit only — zero code, zero config, zero edits)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 0 of 5 (RECON)
> **Estimated duration:** ~1h
> **Prerequisites:** WP-024 ✅ DONE (2026-04-22) — `BlockVariant`/`BlockVariants` live, arch-test 384/0 baseline, typecheck clean.

---

## Mission

Confirm all preconditions before Phase 1 scaffolds a new package + domain. Read relevant skills, pin parser versions, audit arch-test for hardcoded domain counts, verify vitest workspace pickup, pick 3 frozen fixture blocks with hashes. **No files written outside `logs/wp-025/phase-0-result.md`.**

The phase-0 log is the contract Phase 1 will execute against. It MUST end with four concrete carry-overs (a/b/c/d — see Verification). Phase 1 does not re-discover anything this phase discovers.

---

## Scope contract — strict

- **No code changes.** Not even whitespace.
- **No `package.json` edits.** Phase 1 edits root + creates the new package's.
- **No manifest edits.** Phase 1 adds the `pkg-block-forge-core` entry.
- **No file copies yet.** Phase 2 copies fixtures into `__tests__/fixtures/`. Phase 0 only **records** slugs + source hashes.
- **No `npm install`.** Phase 1 runs install after manifest + package.json land.
- **If an audit step surfaces something unexpected** (e.g., PostCSS already in root deps, domain count already ≥12, fixture folder already exists) — **STOP and log as blocker**. Do not improvise a fix.

---

## Tasks

### 0.1 — Read domain skills (context load)

Read three domain skills top-to-bottom. Record one-line takeaway from each in the log (what's the mirror pattern / what to avoid).

- [`.claude/skills/domains/pkg-db/SKILL.md`](../../.claude/skills/domains/pkg-db/SKILL.md) — where `BlockVariant` / `BlockVariants` live; hand-maintained types.ts pattern.
- [`.claude/skills/domains/pkg-validators/SKILL.md`](../../.claude/skills/domains/pkg-validators/SKILL.md) — mirror this package's shape (private, `main=src/index.ts`, vitest).
- [`.claude/skills/domains/studio-blocks/SKILL.md`](../../.claude/skills/domains/studio-blocks/SKILL.md) — `apps/studio/src/lib/block-processor.ts` is **reference only, not code to reuse**. Note what it does + why it's not a fit (regex-based, no AST).

### 0.2 — Verify WP-024 exports live

```bash
grep -n "BlockVariant\|BlockVariants" packages/db/src/index.ts packages/db/src/types.ts
```

Expected: both types exported from `packages/db/src/index.ts` (re-exported from `types.ts`). Record the exact export line(s) in the log. If either is missing, **STOP** — WP-024 didn't close cleanly and Phase 1 can't import.

### 0.3 — Audit + pin parser versions (carry-over **a**)

**Step 1 — confirm libraries aren't already repo-wide deps:**

```bash
grep -rn "\"postcss\":" package.json packages/ apps/ tools/ --include="package.json"
grep -rn "\"node-html-parser\":" package.json packages/ apps/ tools/ --include="package.json"
grep -rn "from ['\"]postcss['\"]\|from ['\"]node-html-parser['\"]" packages/ apps/ tools/ --include="*.ts" --include="*.tsx" --include="*.js"
```

Expected: zero hits for both imports (the library). `apps/admin/postcss.config.cjs` uses the PostCSS *ecosystem* (autoprefixer-style), which is a different thing and does NOT count — if grep catches it, record + dismiss. If either parser IS already installed at any level, **STOP** — architectural assumption violated, escalate to Brain.

**Step 2 — discover latest stable:**

```bash
npm view postcss version
npm view node-html-parser version
```

Record the exact `X.Y.Z` output of each. Also check for security advisories: `npm view postcss` and scan the output for any recent `deprecated` fields or security notes; same for `node-html-parser`. If anything looks off, log it as a risk (do not skip the phase).

**Carry-over (a) for Phase 1:**

```
postcss:          "<exact X.Y.Z>"         ← Phase 1.1 pins this (no ^, no ~)
node-html-parser: "<exact X.Y.Z>"         ← Phase 1.1 pins this (no ^, no ~)
```

### 0.4 — Pick 3 fixture blocks + hash them (carry-over **d**)

List all blocks:

```bash
ls content/db/blocks/*.json
```

Open/scan enough to classify. Pick exactly three:

- **block-hero-grid** candidate: a block using `display: grid` with `grid-template-columns: repeat(N, …)` where N ≥ 2. Surfaces `heuristic-grid-cols` + likely `heuristic-spacing-clamp`.
- **block-pricing-row** candidate: a block using `display: flex; flex-direction: row` with ≥ 3 children and no `flex-wrap`. Surfaces `heuristic-flex-wrap`.
- **block-plain-copy** candidate: a block with mostly typography + no grid/flex-row/oversized padding. Surfaces **zero** heuristics — important as the negative-case fixture.

For each picked file:

```bash
# Windows bash (Git Bash)
sha256sum content/db/blocks/<slug>.json
```

Record in the log:

```
block-hero-grid    → slug="<actual-slug>"    source="content/db/blocks/<file>.json"    sha256=<hash>
block-pricing-row  → slug="<actual-slug>"    source="content/db/blocks/<file>.json"    sha256=<hash>
block-plain-copy   → slug="<actual-slug>"    source="content/db/blocks/<file>.json"    sha256=<hash>
```

Include a one-sentence "why this fits" per fixture (e.g., "uses `repeat(3, 1fr)` at L42 — direct grid-cols trigger").

**Do NOT copy the files anywhere.** Phase 2 does the freeze-copy with hash re-assertion.

If any of the three categories has no good candidate in `content/db/blocks/`, log it as a blocker — don't substitute synthetic fixtures.

### 0.5 — Arch-test baseline + domain-count hardcode audit (carry-over **b**)

**Step 1 — baseline:**

```bash
npm run arch-test 2>&1 | tail -30
```

Expected: `384 passed / 0 failed` (per WP-024 Phase 5 close). Record exact pass/fail numbers. If not 384/0, **STOP** — WP-024 baseline drifted and Phase 1 will commit into a red tree.

**Step 2 — hardcode grep:**

```bash
grep -rnE "toHaveLength|Object\.keys\([^)]*domain[^)]*\)\.length|DOMAIN_COUNT|domains\.length" src/__arch__/
grep -rnE "\b11\b" src/__arch__/
```

The first grep finds structural count assertions. The second grep catches any literal `11` that might be a count. Inspect each hit — is it a domain-count assertion, or unrelated (e.g., a port number, a TTL)? Record each hit as either:

- **HARDCODED** — needs `11 → 12` bump in Phase 1 (list file:line + current expression)
- **UNRELATED** — dismiss with one-word reason

**Carry-over (b) for Phase 1:**

```
Hardcoded domain-count sites needing 11 → 12 bump in Phase 1:
  - <file>:<line>   <code snippet>
  - <file>:<line>   <code snippet>
  (or "none — all parity/ownership assertions are count-agnostic")
```

### 0.6 — Workspace pickup audit (carry-over **c**)

**Step 1 — root `package.json` workspaces:**

```bash
grep -A5 '"workspaces"' package.json
```

Look for `packages/*` glob (covers new package automatically) vs enumerated list (Phase 1 must add explicit entry).

**Step 2 — vitest config:**

```bash
ls vitest.workspace.ts vitest.workspace.js vitest.config.ts vitest.config.js 2>&1
```

If any exists, open and check whether `packages/*` is in the projects array, an enumerated list, or absent. Also check `packages/validators/` — if validators is picked up the same way a new package would be, Phase 1 has zero work here.

**Carry-over (c) for Phase 1:**

```
Root package.json workspaces: "<glob or enumerated>" — <action needed in Phase 1.1 or "none">
Vitest config:                 "<file or NONE>"      — <action needed in Phase 1.1 or "none">
```

### 0.7 — Open questions for Brain

List anything audit surfaced that's NOT a blocker but needs a Brain decision before Phase 1. Example shapes of legitimate Phase-0 questions:

- "Q1: `content/db/blocks/` has no pure-copy block without any padding ≥ 40px — closest is `<slug>` with padding 48px on one selector. Accept as plain-copy fixture anyway (heuristic-spacing-clamp will flag one selector) or re-scope?"
- "Q2: `vitest.workspace.ts` uses enumerated list including `packages/validators` + `packages/db`. Phase 1 will add `packages/block-forge-core` — confirm explicit-entry pattern, or switch whole config to `packages/*` glob?"
- "Q3: `node-html-parser` latest is `X.Y.Z` published <date>. Previous 1-year history shows <N> breaking changes — accept or downgrade to a stabler minor?"

If nothing arose, write "**None.**" explicitly — don't skip the section.

---

## Verification — what phase-0-result.md MUST contain

| Section | Required content |
|---|---|
| **Header** | Phase, duration, WP link, "Audit only, no code written" |
| **0.1 Skills read** | 1-line takeaway per skill (3 total) |
| **0.2 WP-024 exports** | Exact export line(s) for `BlockVariant` + `BlockVariants`, or STOP blocker |
| **0.3 Parser audit** | grep results (zero hits or STOP), `npm view` output for both, security notes |
| **0.3 Carry-over (a)** | Pinned versions block — exact `X.Y.Z` for both, ready to paste into Phase 1 package.json |
| **0.4 Fixture picks** | 3 rows: category, slug, source path, sha256, "why fits" |
| **0.5 Arch-test baseline** | Exact pass/fail count (must be 384/0) |
| **0.5 Carry-over (b)** | List of hardcoded-11 sites OR "none" |
| **0.6 Carry-over (c)** | Root workspaces status + vitest config status, with Phase 1.1 action |
| **0.7 Open questions** | Numbered Q1..Qn OR explicit "None." |
| **Footer** | "Next: Phase 1 awaits Brain decisions on open questions (if any), then scaffolds package using carry-overs a/b/c/d verbatim." |

---

## Hard gates — do not violate

- **No `npm install`** in Phase 0. Discovery only.
- **No file writes** except `logs/wp-025/phase-0-task.md` (Brain wrote this) and `logs/wp-025/phase-0-result.md` (you write this).
- **No arch-test edits.** If grep finds hardcoded `11`, record — don't fix.
- **No fixture copies.** Record slugs + hashes only.
- **No guessing.** If `npm view` doesn't return, if grep is ambiguous, if a fixture candidate is borderline — log as open question, don't decide unilaterally.

---

## Commit (end of phase)

Stage + commit these two files **only**:

```
logs/wp-025/phase-0-task.md      # this file (Brain-written)
logs/wp-025/phase-0-result.md    # your audit output
```

Commit message:

```
chore(logs): WP-025 Phase 0 RECON — audit + carry-overs for Phase 1 scaffold [WP-025 phase 0]
```

Embed the final commit SHA back into `phase-0-result.md` as a post-commit follow-up (per WP-024 precedent — see `logs/wp-024/phase-4-result.md` pattern).

---

## What success looks like

Phase 1 opens `phase-0-result.md`, reads four carry-overs (a/b/c/d), copies exact version strings into `package.json`, applies the `11→12` bump to listed arch-test files in the same commit as the manifest edit, adds vitest entry if needed, and picks fixtures by slug — zero re-discovery, zero improvisation.

If Brain has to ask a clarifying question between Phase 0 and Phase 1, the audit log was incomplete.
