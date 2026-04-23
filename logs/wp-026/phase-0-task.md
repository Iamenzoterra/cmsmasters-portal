# WP-026 Phase 0 — RECON Task Prompt

**Role:** Hands
**Phase:** 0 (RECON, audit-only, no implementation)
**Estimated time:** ~1h
**Source of truth:** `workplan/WP-026-tools-block-forge-mvp.md` (lines 201–223)

---

## Mission

Before a single line of code lands in `tools/block-forge/`, capture the ground-truth state of the tooling neighborhood we're joining: real port bindings, workspace resolution of `@cmsmasters/block-forge-core` from a `tools/` Vite config, the exact `?raw` asset path list (including the new `tokens.responsive.css` from WP-024), the `content/db/blocks/` schema + volume, and every hardcoded domain-count assumption in `src/__arch__/` that a new owned-files burst would trip.

This phase writes **nothing** but a log. No packages installed, no files scaffolded, no manifest edits, no fixture copies, no dev servers started.

---

## Hard Gates (DO NOT)

- DO NOT create `tools/block-forge/` or any file inside it.
- DO NOT run `npm install`, `pnpm install`, `npm i -w ...`, or edit any `package.json`.
- DO NOT edit `src/__arch__/domain-manifest.ts`.
- DO NOT touch `.claude/skills/domains/infra-tooling/SKILL.md`.
- DO NOT copy anything from `content/db/blocks/` anywhere.
- DO NOT start Vite on any new port. (`npm run dev` etc. on existing tools is fine if needed for grep/verify but prefer static inspection.)
- DO NOT modify `workplan/WP-026-tools-block-forge-mvp.md`. If you find a factual error in the plan, flag it in the result log under a "Plan Corrections" heading — Brain reverts/patches.

The ONLY file this phase produces: **`logs/wp-026/phase-0-result.md`**.

---

## Plan Assumption Alert (read before starting)

The plan at line 76 and line 207 assumes `tools/layout-maker/` listens on **7777**. Brain recon indicates layout-maker's `vite.config.ts` pins port **7700**, and **7777** is actually served by `tools/studio-mockups/` during `/block-craft`. Phase 0 task 0.2 must verify this from source, not trust the plan. If confirmed, flag in "Plan Corrections" — this forces a port recalculation for block-forge.

---

## Tasks

### 0.1 — Domain skill + tooling-precedent read

Read, in order:
- `.claude/skills/domains/infra-tooling/SKILL.md` — note the `status:` field exactly (skeleton vs full); this drives Phase 5 arch-test delta.
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — note public exports and "never auto-apply" ADR-025 contract.
- `.claude/skills/domains/pkg-ui/SKILL.md` — token source-of-truth status, forbidden hand-edit list.
- `tools/layout-maker/CLAUDE.md` — read in full. Note:
  - `vite.config.ts` port
  - `@layer` order for srcdoc
  - exact `?raw` import paths (paths-relative-to-tools/layout-maker/)
  - `data-block-shell="{slug}"` wrapper convention
  - IntersectionObserver + ResizeObserver patterns
  - `PARITY-LOG.md` discipline (we're mirroring this into `PARITY.md` in Phase 2)

**Deliverable in result log:** 5–8 lines summarizing each file's load-bearing points (no copy-paste walls). Flag any skill that currently has `status: skeleton` in its frontmatter — infra-tooling especially drives Phase 5's +6 arch-test prediction.

---

### 0.2 — Port discovery (REAL, not plan-assumed)

Commands (run from repo root):

```bash
# Every port literal in tools/
grep -rnE "\bport\s*[:=]\s*[0-9]{4}|listen\([0-9]{4}" tools/ --include='*.ts' --include='*.tsx' --include='*.js' --include='*.cjs' --include='*.mjs' --include='*.json' 2>/dev/null

# Every 4-digit number that looks like a port in any tooling config
grep -rnE "\b7[0-9]{3}\b" tools/ --include='*.ts' --include='*.json' --include='*.md' 2>/dev/null
```

Then inspect directly:
- `tools/layout-maker/vite.config.ts` — record the exact port + whether `strictPort: true`.
- `tools/studio-mockups/` — find its entry (likely a server script); record the port.
- Any other tool under `tools/` with a port literal — list them.

**Pick the block-forge port.** Rule: lowest free port in the 77xx range that isn't already bound by a `tools/*` config. Record both the grep evidence and the pick. Suggested (but verify): **7701** if 7700 is LM. If 7701 is free but looks odd next to 7700, 7710 is acceptable — justify the choice.

**Deliverable:**
- Table of all `tools/*` port bindings with exact file:line references.
- Chosen block-forge port + justification (1–2 lines).
- Plan Correction note if the plan's "7777 = layout-maker" premise was wrong (it almost certainly is).

---

### 0.3 — Workspace resolution of `@cmsmasters/block-forge-core` from a `tools/` Vite context

The plan's risk register flags "Monorepo workspace resolution of `@cmsmasters/block-forge-core` fails inside Vite". Resolve this statically first, then with a probe.

Static:
- Read `package.json` (root) — confirm `tools/*` appears in `workspaces` glob.
- Read `tools/layout-maker/package.json` — record whether it depends on `@cmsmasters/db: "*"` (yes per recon) and how layout-maker handles workspace resolution in its `vite.config.ts` (does it use `resolve.preserveSymlinks`? `optimizeDeps.include`?).
- Read `packages/block-forge-core/package.json` — record `name`, `main`, `types`, `exports` fields; confirm the entrypoint emits TypeScript directly or is pre-built.

Probe (read-only, no install):

```bash
# Does Node resolve it from a sibling tools/ location?
node -e "console.log(require.resolve('@cmsmasters/block-forge-core', { paths: ['tools/layout-maker'] }))" 2>&1 || echo "RESOLVE_FAILED"

# Does the workspace symlink exist?
ls -la node_modules/@cmsmasters/block-forge-core 2>/dev/null || echo "NO_SYMLINK"
```

**Deliverable:**
- Static findings (workspaces glob, LM's Vite-config fields, core package shape).
- Probe output (resolve success/failure + symlink evidence).
- Carry-over verdict: **either** "plain monorepo defaults work, Phase 1's `vite.config.ts` needs no special resolve tweaks" **or** the specific fix (e.g., "add `resolve.preserveSymlinks: false` + `optimizeDeps.include: ['@cmsmasters/block-forge-core']`"). Justify with evidence.

---

### 0.4 — Content directory: `content/db/blocks/` audit

Commands:

```bash
# How many blocks, and a sample of shapes
ls content/db/blocks/*.json 2>/dev/null | wc -l
ls content/db/blocks/*.json 2>/dev/null | head -10

# Schema sniff — what top-level keys appear in a block JSON?
for f in $(ls content/db/blocks/*.json 2>/dev/null | head -3); do
  echo "=== $f ==="
  node -e "const b=require('./$f'); console.log(Object.keys(b).sort().join(','))"
done

# Sha256 two, to stay honest about drift for snapshot tests later
node -e "
const fs=require('fs'),c=require('crypto');
const files=['content/db/blocks/block-spacing-font.json','content/db/blocks/block-plain-copy.json','content/db/blocks/block-nested-row.json'];
for (const f of files) {
  try { const h=c.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0,16); console.log(f,h); }
  catch(e) { console.log(f,'NOT_FOUND'); }
}
"
```

**Note on the three fixture slugs:** these are the exact fixtures WP-025 Phase 4 froze by SHA. If any of the three is `NOT_FOUND` in `content/db/blocks/`, they may live instead at `packages/block-forge-core/src/__tests__/fixtures/*` — report both paths. Block-forge's picker operates on `content/db/blocks/` per plan line 75, so if fixtures-under-test diverge from real-world source, the Phase 3 integration test needs a temp-dir copy strategy (already in plan line 283) and this should be confirmed, not assumed.

Also check:
```bash
# Is content/db/blocks/ inside tools/block-forge/'s eventual watch tree?
# (block-forge will live at tools/block-forge/; content/db/blocks/ is at repo-root/content/... — disjoint paths.)
realpath content/db/blocks 2>/dev/null
```

**Deliverable:**
- Block count.
- Top-level keys observed across 3 sampled blocks.
- SHA of the three WP-025 fixture slugs (exact match or "lives elsewhere").
- Confirmation that `content/db/blocks/` is **outside** `tools/block-forge/` (so Vite HMR won't loop).

---

### 0.5 — `?raw` asset paths (including WP-024 addition)

Read `tools/layout-maker/CLAUDE.md` lines around "Vite ?raw Import Paths" and `tools/layout-maker/src/` to find the exact relative imports layout-maker uses today. Then determine the equivalent paths from `tools/block-forge/src/lib/preview-assets.ts` (sibling depth under `tools/`, so paths identical).

Specifically, record the resolved paths for:
1. `tokens.css` — `../../packages/ui/src/theme/tokens.css?raw` (confirm)
2. `tokens.responsive.css` — **NEW in WP-024**, locate it (likely `packages/ui/src/theme/tokens.responsive.css` or `packages/ui/src/portal/tokens.responsive.css`). Actual command:
   ```bash
   find packages/ui/src -name 'tokens.responsive.css' 2>/dev/null
   ```
3. `portal-blocks.css` — confirm path
4. `animate-utils.js` — confirm path
5. Any other asset LM injects that block-forge must mirror (e.g., Google Fonts preconnect is a `<link>` not a `?raw`, so note but don't list).

And the exact `@layer` order from LM's srcdoc: `tokens, reset, shared, block` — verify by reading the srcdoc string in LM source.

**Slot wrapper contract:** plan line 254 says `<div>` with `container-type: inline-size; container-name: slot`. Grep LM and WP-024 outputs to confirm the exact class/wrapper LM uses for containing rendered block HTML:

```bash
grep -nE "container-type\s*:\s*inline-size|container-name\s*:\s*slot" tools/layout-maker/ -r --include='*.ts' --include='*.tsx'
grep -nE "data-block-shell" tools/layout-maker/ -r --include='*.ts' --include='*.tsx' apps/portal/ --include='*.ts' --include='*.tsx'
```

If LM uses `data-block-shell="{slug}"` (not `.slot-inner`) as the per-block wrapper per its CLAUDE.md "Block iframe srcdoc structure" section, block-forge must match — this is a **Plan Correction** candidate if plan line 254 says `.slot-inner`.

**Deliverable:**
- Bulleted list of 5 `?raw` imports with exact paths + existence check for each.
- `@layer` order quoted verbatim from LM source.
- Slot-wrapper verdict: which attribute/class wraps the rendered block HTML in LM today (`data-block-shell="{slug}"` per CLAUDE.md is the expected answer) + any plan correction needed.

---

### 0.6 — Arch-test baseline + domain-count hardcode hunt

Commands:

```bash
npm run arch-test 2>&1 | tail -20
grep -rnE "toHaveLength|Object\.keys\(.*domain.*\)\.length|DOMAIN_COUNT|domains\.length" src/__arch__/ 2>/dev/null
```

**Expected baseline:** 442 passing / 0 failing (post-WP-025). If lower, reconcile with git log for anything landed between WP-025 close and now.

**Domain-count hardcodes:** the WP-025 Phase 0 carry-over confirmed zero hardcoded `.toHaveLength(11)` or similar; verify that's still true. If a new assertion of that shape slipped in, flag it as a Phase 1 patch target.

**SKILL status audit:**
```bash
grep -nE "^status:" .claude/skills/domains/*/SKILL.md
```

Record every domain's `status:` exactly. Pay attention to `infra-tooling` — if it's `skeleton`, Phase 5 **will** flip it to `full` when we add block-forge invariants/traps/recipes, which (per saved memory `feedback_arch_test_status_flip.md`) activates the "Full-Status Skill Sections" test block and adds **+6 arch-tests** on that phase's verification. This must be predicted in Phase 5 baseline, not treated as an unexpected red.

**Deliverable:**
- Current arch-test count exactly.
- Domain-count hardcode grep result ("clean" or specific file:line references).
- `infra-tooling` SKILL status as found.
- +6 arch-test prediction confirmed for Phase 5 (or waived if status is already `full`).

---

### 0.7 — File I/O safety contract (document-only)

No code, just pin the contract that Phase 1's `file-io.ts` and Phase 4's Save path must satisfy:

1. **Read:** `readBlock(path)` rejects if `html` or `slug` missing — throw a typed error with the actionable offending path and field name.
2. **Write scope:** only writes back to the exact file path handed in at open time. No recursive writes, no new file creation under `content/db/blocks/`, no writes anywhere outside it.
3. **Backup policy:** **first save per session** writes `<sourcePath>.bak` with the pre-save contents. Idempotent: subsequent saves in the same session are no-ops on the backup. Session boundary = fresh dev-server start or picker-switch to a different block and back.
4. **Dirty guards:** picker-switch and `beforeunload` both emit a "unsaved accept/reject state" warning if any suggestion is pending unsaved.
5. **No-op Save:** if zero suggestions pending, Save button disabled; no disk write, no `.bak`.
6. **Delete:** block-forge never deletes `content/db/blocks/*.json` files nor their backups.

**Deliverable:** restate the six rules in the result log under a "Save Safety Contract (carry-over f)" heading. No implementation yet.

**User-confirmed note:** the backup-on-first-save-per-session policy (vs always-backup) is the pinned default per Brain's Phase 0 framing. If Hands sees a reason to reconsider (e.g., LM uses a different policy that authors have internalized), flag under Plan Corrections — don't silently change.

---

## Result Log Structure

Write exactly to `logs/wp-026/phase-0-result.md` using this skeleton:

```markdown
# WP-026 Phase 0 — RECON Result

**Date:** 2026-04-23
**Duration:** <actual minutes>
**Arch-test baseline:** <count> / 0

---

## 0.1 Domain & Tooling Read

<5–8 lines per file, load-bearing only>

## 0.2 Port Audit

| Tool | File:line | Port | strictPort |
|---|---|---|---|
| layout-maker | tools/layout-maker/vite.config.ts:N | 7700 | true |
| studio-mockups | <file>:N | 7777 | ? |
| ... | ... | ... | ... |

**Block-forge port pick:** <NNNN> — <justification in 1–2 lines>

## 0.3 Workspace Resolution

- Root workspaces glob: <exact array>
- LM Vite resolve fields: <excerpt>
- `@cmsmasters/block-forge-core` package shape: main=…, types=…, exports=…
- Probe result: <RESOLVED to … | RESOLVE_FAILED>
- Symlink: <present/absent>
- **Carry-over (b):** <"no tweaks needed" OR "add X, Y to vite.config.ts">

## 0.4 Content Directory

- Block count: <N>
- Top-level keys observed: <sorted CSV>
- Fixture SHAs:
  - `block-spacing-font`: <sha16 | NOT_FOUND, lives at path>
  - `block-plain-copy`: <sha16 | NOT_FOUND, lives at path>
  - `block-nested-row`: <sha16 | NOT_FOUND, lives at path>
- `content/db/blocks/` disjoint from `tools/block-forge/`: ✅ / ❌

## 0.5 Preview Asset Paths

Imports block-forge will emit (relative to `tools/block-forge/src/lib/preview-assets.ts`):

1. `tokens.css` → <exact path> (exists: ✅)
2. `tokens.responsive.css` → <exact path> (exists: ✅)
3. `portal-blocks.css` → <exact path> (exists: ✅)
4. `animate-utils.js` → <exact path> (exists: ✅)
5. <any additional>

`@layer` order from LM: <verbatim string>

Slot wrapper verdict: <"data-block-shell=\"{slug}\"" per CLAUDE.md confirmed | divergence found>

## 0.6 Arch-test Baseline & Hardcode Hunt

- Count: <N>/0
- Domain-count hardcodes: <clean | file:line list>
- SKILL statuses: <table or CSV>
- infra-tooling status: <skeleton | full>
- +6 prediction for Phase 5: <enabled | waived because already full>

## 0.7 Save Safety Contract (carry-over f)

<The six rules restated verbatim from the prompt, acknowledged as the Phase 1 + Phase 4 spec.>

## Plan Corrections

<Numbered list of any plan line-level factual errors found, OR "None.">

1. **Line 76 / Line 207:** Plan assumes layout-maker on 7777. Actual: 7700. Studio-mockups owns 7777. Brain patches plan before Phase 1 signoff.
2. <any other>

## Carry-overs for Phase 1

(a) **Port:** <NNNN>
(b) **Vite monorepo resolution fix:** <"none" | specific fields>
(c) **Default source dir + dirty-state warning:** `content/db/blocks/` + `beforeunload` + picker-switch banner (per 0.7 rule 4)
(d) **`?raw` import paths:** 5-line verbatim list from 0.5
(e) **Domain-count hardcode locations:** <"none" | file:line list>
(f) **Save safety contract:** six rules from 0.7 (Phase 1 `file-io.ts` spec; Phase 4 Save path enforcement)

## Open Questions for Brain

<Any decisions Phase 0 surfaces that Brain should rule on before Phase 1 starts. Example:
- Q1: If `@cmsmasters/block-forge-core` needs `optimizeDeps.include` — should LM get the same tweak retroactively for parity, or only block-forge?
- Q2: If slot-wrapper audit shows LM uses X and portal uses Y, which does block-forge mirror?
Leave empty if none.>
```

---

## Verification Before Writing Result Log

- [ ] Every command in this prompt was run and output captured.
- [ ] No files created outside `logs/wp-026/phase-0-result.md`.
- [ ] No edits to `workplan/`, `src/__arch__/`, `.claude/skills/`, `tools/`, `packages/`, `apps/`.
- [ ] Arch-test baseline recorded (did NOT rerun it if it was already captured fresh).
- [ ] Every carry-over (a) through (f) has an evidence-backed value.
- [ ] Plan Corrections section filled (or "None" explicitly).

## After Writing

Report back with:
1. Commit SHA for the phase-0-result.md write
2. Short summary (≤ 10 bullets) of the six carry-overs as single-line values
3. Any Plan Corrections Brain needs to patch before Phase 1 prompt
4. Any Open Questions that block Phase 1 prompt generation

---

**Brain contract:** after reviewing the result log, Brain will (1) patch WP-026 for any confirmed Plan Corrections, (2) resolve Open Questions in-line or as addenda, (3) write `logs/wp-026/phase-1-task.md` carrying (a)–(f) verbatim into the scaffold prompt.
