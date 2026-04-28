# WP-038 Phase 0: RECON — pre-flight audit for `/block-craft` FINALIZE protocol

> Workplan: WP-038 Block Craft → Forge sandbox finalize step — close the seeding gap
> Phase: 0 of 2 (Phase 2 may collapse into Phase 1 per Ruling E)
> Priority: P1 — closes the post-WP-035 seam: `/block-craft` outputs HTML, Forge wants BlockJson
> Estimated: 30–45 minutes
> Type: RECON (audit-only — **no code or skill written**)
> Previous: WP-035 ✅ Phase 5 close (commits `6223cb23` + `c269c8cc`); arch-test 595/595
> Next: Phase 1 (`.claude/skills/block-craft/SKILL.md` rewrite — Step 6 FINALIZE protocol added)
> Affected domains: NONE — `.claude/skills/*` files are not in domain manifest. RECON checks docs + validators + tools only; **zero file mutations**

---

## Context

WP-038 closes the architectural seam left by WP-035: after sandbox decouple, Forge has three documented seed sources (first-run copy from `content/db/blocks/`, Clone via `[+ Clone]`, manual file create). User flagged the missing fourth path — **NEW blocks from external sources** (Figma node via `/block-craft`, hand-crafted HTML, block-craft output from another developer). Today, `/block-craft` ends with "import the HTML file into Studio → Process panel → Save", which bypasses Forge entirely. User wants `/block-craft` → iterate desktop in `studio-mockups` HTML → user signal → Forge sandbox JSON → polish responsive in Forge → Export → Studio Import → DB.

WP-038 is a single SKILL.md rewrite. Step 6 ("Ready for Studio import") is replaced with a FINALIZE protocol: trigger interpretation (natural language only), confirm with proposal (always), HTML → 11-key BlockJson split, write to `tools/block-forge/blocks/<slug>.json`. Steps 1–5 (Figma read, tokens, generate HTML, serve :7777, iterate) and all rules around scoping, animations, semantic HTML, hooks remain verbatim.

```
CURRENT  ✅  /block-craft skill writes tools/studio-mockups/<name>.html (preview at :7777)
              (.claude/skills/block-craft/SKILL.md — Steps 1–5 + Step 6 "Ready for Studio import")
CURRENT  ✅  Forge sandbox at tools/block-forge/blocks/ (WP-035 Phase 3)
              (tools/block-forge/vite.config.ts:18 SANDBOX_DIR_DEFAULT)
CURRENT  ✅  Forge GET /api/blocks reads readdir(SOURCE_DIR) per request — no cache
              (vite.config.ts:166-184 — fresh disk read on every list call)
CURRENT  ✅  importBlockSchema accepts id-optional payload
              (packages/validators/src/block.ts:86-107 — id z.union([string, number]).optional())
CURRENT  ✅  9 production block JSONs in content/db/blocks/ (split-rules ground truth)
CURRENT  ✅  Studio Import (paste/upload .json → Supabase upsert by slug → revalidate) live
              (WP-035 Phase 2 — apps/studio/src/components/block-import-json-dialog.tsx)
CURRENT  ✅  arch-test 595 / 595 (post-WP-035 Phase 5 close baseline)

MISSING  ❌  FINALIZE protocol in `/block-craft` skill — Step 6 still says "Studio import"
MISSING  ❌  HTML → BlockJson split rules documented anywhere (every invocation re-derives)
MISSING  ❌  Slug+name confirm-with-proposal step
MISSING  ❌  Cross-doc references to `/block-craft` as a Forge sandbox seed source
              (.context/SKILL.md, CONVENTIONS, PARITY trio not yet aware)
```

Phase 0 is **RECON ONLY**. Per saved memory `feedback_preflight_recon_load_bearing`, RECON catches material issues before code/docs land. Three architectural questions need ratification before SKILL.md rewrite:

- **Exact 11-key shape vs `content/db/blocks/` ground truth** (Ruling A) — does `html` field include the outer `<section class="block-{slug}">` tag, or is it stripped? Does the 11-key set include `block_type: ""` empty string by default, or is it omitted? Key ordering matters for git-clean round-trips.
- **`id` emit-or-omit policy** (Ruling B) — `importBlockSchema.id` is optional + server-resolves. Should skill emit a placeholder UUID, or just omit? Affects SAVE-via-Forge behavior too (Forge GET /api/blocks/:slug returns `id` from disk; some downstream code may assume presence).
- **Cross-doc impact → Phase 2 alive or collapsed** (Ruling E) — does `.context/SKILL.md` / CONVENTIONS / PARITY need edits, or can WP close in single Phase 1 commit?

No SKILL.md edit, no source code change, no doc change. Output is `logs/wp-038/phase-0-result.md` with §0.1–§0.7 + 4–6 Brain rulings + product-RECON verdict.

---

## Domain Context

**No domains affected — `.claude/skills/*` is outside `src/__arch__/domain-manifest.ts`.** Audit reads files in:

- `.claude/skills/block-craft/SKILL.md` — current skill body (subject of Phase 1 rewrite)
- `tools/block-forge/vite.config.ts` — sandbox path + middleware contract (WP-035)
- `tools/block-forge/blocks/*.json` — sandbox state (live samples for split rules)
- `content/db/blocks/*.json` — production seed (9 files, ground truth for 11-key shape)
- `packages/validators/src/block.ts` — `importBlockSchema` shape + id policy
- `packages/db/src/slot-registry.ts` — slot/hook table parity check
- `.context/SKILL.md`, `.context/CONVENTIONS.md`, `.context/BRIEF.md` — cross-doc references
- `tools/block-forge/PARITY.md`, `apps/studio/src/pages/block-editor/responsive/PARITY.md` — WP-035 entries
- `.claude/skills/` (root listing) — `figma-use` skill availability check

All reads are **read-only audits**. No file is opened with Edit or Write in Phase 0.

---

## Phase 0 Audit — re-baseline (do FIRST)

```bash
# 0. Baseline — confirm clean starting state
npm run arch-test                                       # expect: 595 / 595 (post-WP-035 Phase 5 close)

# 1. Skill file currently exists + has expected shape
ls .claude/skills/block-craft/SKILL.md                  # expect: file exists
wc -l .claude/skills/block-craft/SKILL.md               # expect: ~470-475 lines (2 sections of interest)

# 2. Forge sandbox path stability (WP-035 Phase 3 ruling)
grep -nE "SANDBOX_DIR_DEFAULT|SOURCE_DIR" tools/block-forge/vite.config.ts | head -10
# expect: line 18 — SANDBOX_DIR_DEFAULT = path.resolve(__dirname, 'blocks')
#         line 21 — SOURCE_DIR = process.env.BLOCK_FORGE_SOURCE_DIR ?? SANDBOX_DIR_DEFAULT

# 3. Forge sandbox blocks count (existing seed targets)
ls tools/block-forge/blocks/*.json 2>/dev/null | wc -l  # expect: ≥9 (post-first-run seed)

# 4. Production seed (split-rules ground truth) count
ls content/db/blocks/*.json | wc -l                     # expect: 9

# 5. importBlockSchema id policy
grep -nA 5 "id:" packages/validators/src/block.ts | head -20
# expect: id: z.union([z.string(), z.number()]).optional()  (line ~89)

# 6. figma-use skill availability
ls .claude/skills/ | grep -iE "figma" || echo "NO FIGMA SKILL FOUND"
# (WP-038 Phase 1 reference to figma-use must match a real skill name OR be rewritten)

# 7. Cross-doc references to /block-craft / studio-mockups
grep -rln "block-craft\|studio-mockups" .context/ tools/block-forge/ apps/studio/src/pages/block-editor/ 2>/dev/null
# Surface every existing reference. Phase 2 (Close) edits these IF they reference the OLD Step 6 ("Studio import").

# 8. PARITY trio current state (WP-035 entries)
ls tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md 2>/dev/null
grep -l "WP-035\|block authoring\|sandbox" tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md 2>/dev/null

# 9. Slot registry parity (skill embeds slot tables)
grep -nE "header|footer|sidebar|theme-blocks" packages/db/src/slot-registry.ts | head -20
# Cross-check vs SKILL.md "Layout Slots" + "Nested Slots" tables

# 10. Re-baseline arch-test post-audit
npm run arch-test                                       # expect: 595 / 595 (unchanged — RECON-only)
```

**Document findings in `logs/wp-038/phase-0-result.md` BEFORE drafting any rulings.**

**IMPORTANT:** RECON is read-only. If the audit surfaces a stale skill ref (e.g. `figma-use` skill renamed/missing), DO NOT fix it in Phase 0 — note in result.md, ruling drives the Phase 1 rewrite scope.

---

## Task 0.1: §0.1 — 11-key BlockJson shape ground truth

### What to Audit

Read 4 representative block JSONs in `content/db/blocks/`:

1. `fast-loading-speed.json` (has html + css + js + variants:null + metadata.thumbnail_url)
2. `header.json` (likely simpler — no js? no variants?)
3. `theme-name.json` (likely uses {{meta:name}} hook)
4. `sidebar-help-support.json` (likely sidebar slot block)

For each, document:

- Exact key set (11 keys per WP-035, but some may be `block_type: ""` vs omitted)
- Key ordering (does `id` come first? `slug` first? Phase 1 rewrite must mirror)
- `html` field encoding: does it START with `<section class="block-{slug}" data-block>...` (verbatim) or is the outer wrapper stripped? Critical for SPLIT contract.
- `css` field encoding: does it start with `*, *::before, *::after { ... }` global resets, or only `.block-{slug}` scoped? (Existing blocks may have legacy global resets — Phase 1 SPLIT must NOT drop them blindly.)
- `js` field encoding: with or without `<script>` tags? (Verify by sample.)
- `variants` field: null literal vs missing key vs `{}` empty object. WP-028 Ruling HH says `null`-sentinel; verify in real data.

### Document in §0.1

```markdown
### §0.1 — 11-key BlockJson shape (audit ground truth)

| Key | Sample value (fast-loading-speed) | Sample value (header) | Sample value (theme-name) | Notes |
|---|---|---|---|---|
| id | "1cbfccdf-..." | <value> | <value> | UUID; Studio resolves |
| slug | "fast-loading-speed" | <value> | <value> | kebab |
| name | "fast loading speed" | <value> | <value> | lowercase OR title-case? |
| html | "<section class=\"block-fast-loading-speed\"..." | <value> | <value> | OUTER section INCLUDED |
| css | "*, *::before...\n.block-fast-loading-speed {..." | <value> | <value> | INCLUDES legacy global reset |
| js | "const block = document.querySelector..." | <value> | <value> | NO <script> tags |
| block_type | "" | <value> | <value> | empty string default |
| is_default | false | <value> | <value> | always false unless registered global |
| sort_order | 0 | <value> | <value> | always 0 unless reordered |
| hooks | {} | <value> | <value> | empty object default |
| metadata | { "thumbnail_url": "..." } OR {} | <value> | <value> | thumbnail post-Process upload |
| variants | null | <value> | <value> | WP-028 sentinel |

Key ordering observed: <ordered list>
```

### Drives Ruling A

Phase 0 Ruling A: confirm exact SPLIT contract — what skill must extract from `studio-mockups/<name>.html` and how it must encode in BlockJson. Specifically:
- Outer `<section>` tag: keep verbatim in `html` field, or strip?
- Global CSS reset (`*, *::before, *::after { margin: 0; ... }`) in studio-mockups preview HTML: include in BlockJson `css` field, or strip? (If existing blocks have it, the answer is "preserve" for round-trip parity. If they don't, this is a NEW concern Phase 1 must address.)

---

## Task 0.2: §0.2 — Forge sandbox stability post-WP-035

### What to Audit

Re-confirm WP-035 Phase 3 contract holds:

- `tools/block-forge/vite.config.ts:18` — `SANDBOX_DIR_DEFAULT = path.resolve(__dirname, 'blocks')`
- `tools/block-forge/vite.config.ts:21-23` — `SOURCE_DIR = process.env.BLOCK_FORGE_SOURCE_DIR ?? SANDBOX_DIR_DEFAULT`
- `tools/block-forge/vite.config.ts:93-143` — `seedSandboxIfEmpty` first-run logic; runs once at `configureServer` boot
- `tools/block-forge/vite.config.ts:166-184` — `GET /api/blocks` does `readdir(SOURCE_DIR)` on EVERY request (no cache → new files appear on next refresh)
- Sandbox dir existence: `ls tools/block-forge/blocks/` — should show ≥9 .json files post-first-run

### Document in §0.2

```markdown
### §0.2 — Forge sandbox path + cache contract

| Aspect | Verified | Notes |
|---|---|---|
| SANDBOX_DIR_DEFAULT | `tools/block-forge/blocks/` | line 18 |
| SOURCE_DIR override | `BLOCK_FORGE_SOURCE_DIR` env | line 21 |
| Sandbox files | <count> | post-first-run seed |
| GET /api/blocks cache | NONE — readdir per request | line 166-184 |
| First-run seed gate | sandbox empty | line 93-116 |
| Skill write target | `tools/block-forge/blocks/<slug>.json` | confirmed safe |
```

### Drives no ruling directly

Just confirms target path. If sandbox dir doesn't exist or has changed since WP-035, flag and stop — Phase 1 rewrite would target a stale path.

---

## Task 0.3: §0.3 — `id` emit-or-omit policy

### What to Audit

- `packages/validators/src/block.ts:86-107` — `importBlockSchema` shape; confirm `id` is `optional()`
- `packages/validators/src/block.ts:88-90` — comment "Optional — ignored server-side; slug is the upsert key"
- `apps/api/src/routes/blocks.ts` — find the `/blocks/import` endpoint (WP-035 Phase 2 introduced); confirm it does find-or-create-by-slug, not by id
- `tools/block-forge/src/types.ts:6-25` — Forge's local `BlockJson` type; confirm `id: string | number` (REQUIRED, not optional). This is the Forge-side contract — emit OR omit on disk affects whether Forge GET `/api/blocks/:slug` works without a panic
- Live test: read one sandbox block JSON; does it have `id`? (Existing first-run seed copies retain `id` from production. Clone strips it per `performCloneInSandbox`. So sandbox blocks without `id` exist today.)
- Read `tools/block-forge/vite.config.ts:166-184` (GET /api/blocks list) — does it require `id` to be present, or only `slug` + `name`? (Quick scan; if list is `slug+name+filename`, id-less files are list-safe.)
- Read GET /api/blocks/:slug (vite.config.ts:230-251) — what does it return for an id-less file?

### Document in §0.3

```markdown
### §0.3 — id field policy

| Aspect | Verified | Notes |
|---|---|---|
| importBlockSchema.id | optional, server-resolved | block.ts:89 |
| /api/blocks/import | find-or-create-by-slug | routes/blocks.ts:<line> |
| Forge BlockJson type | id: string \| number REQUIRED | types.ts:7 |
| Sandbox blocks today | <id-present count> / <id-absent count> | clones lack id, seeded blocks have it |
| Forge list endpoint | requires slug + name only (id n/a) | vite.config.ts:170 |
| Forge get endpoint | returns raw file bytes | vite.config.ts:251 |
| App.tsx consumer of getBlock | <does it require .id?> | App.tsx audit |
```

### Drives Ruling B

Phase 0 Ruling B: skill emits `id`-less BlockJson on finalize OR emits `id: <crypto.randomUUID()>`?

Decision tree:
- If Forge type is `id: string | number REQUIRED` AND App.tsx + tests rely on `block.id` being a string → skill MUST emit `id` (or runtime breaks on `getBlock(slug)`)
- If Forge tolerates id-less reads (no consumer reads `.id` for state) → skill omits `id`; Studio Import server-resolves on insert
- Phase 1 implementation must mirror whichever ruling locks here.

Note WP-035 Phase 3 `performCloneInSandbox` strips `id` (`{ id: _droppedId, ...rest }` then `{ ...rest, slug: candidate }` per vite.config.ts:67-74). Cloned blocks have NO `id` and are produced cleanly — this is empirical evidence Forge tolerates id-less files. Audit confirms.

---

## Task 0.4: §0.4 — `figma-use` skill availability + Step 1 reference

### What to Audit

Step 1 of current SKILL.md says "Use the `figma-use` skill first (MANDATORY before any `use_figma` call)". Confirm:

- `.claude/skills/` listing — is there a directory named `figma-use`, `figma-component-vars`, `figma-mcp`, or similar?
- If only `figma-component-vars` exists — does it overlap with the use case `/block-craft` Step 1 describes (read Figma node)?
- If a Figma skill is missing entirely — what is the current canonical way to fetch Figma node data? (MCP tool `mcp__Figma__*` if registered; or is there no MCP and skill must use `figma-use` directly?)

### Document in §0.4

```markdown
### §0.4 — Figma read tooling availability

| Skill / tool name | Exists? | Used for? |
|---|---|---|
| `figma-use` | yes / no | Reading Figma node (legacy reference in current SKILL.md) |
| `figma-component-vars` | yes | Variable resolution; orthogonal to /block-craft |
| Figma MCP (`mcp__Figma__*`) | yes / no | <list relevant tool names> |
| Pasted screenshot path | yes (vision) | Fallback if no Figma URL |

Step 1 reference status: ✅ valid / ❌ stale (rewrite Phase 1 to reference <correct mechanism>)
```

### Drives Ruling C

Phase 0 Ruling C: Phase 1 SKILL.md rewrite — Step 1 reference. Either keep `figma-use` (verified live) OR rewrite to current canonical Figma read mechanism. Affects Phase 1 scope (skill rewrite touches Step 1 OR not).

---

## Task 0.5: §0.5 — cross-doc impact (Phase 2 alive or collapsed)

### What to Audit

Search for references to `/block-craft`, `block-craft`, `studio-mockups`, "Process panel" (in the context of block authoring):

```bash
grep -rln "block-craft\|studio-mockups" .context/ tools/block-forge/ apps/studio/src/pages/block-editor/ 2>/dev/null
```

For each hit, classify:

- **Load-bearing**: doc text says "after `/block-craft` you import HTML into Studio Process panel" or similar — Phase 1 rewrite makes this stale; Phase 2 must edit
- **Decorative**: doc mentions `/block-craft` exists but doesn't claim a specific output workflow — leave alone
- **Cross-reference**: doc has a table of skills or a SKILL.md index — may need a row update if skill description front-matter changes

Specific files of interest:

- `.context/SKILL.md` — has it got a "Block authoring loop" section post-WP-035? If yes, does it name `/block-craft` as a seed source? Phase 2 may need an "after WP-038" amendment.
- `.context/CONVENTIONS.md` — WP-035 Phase 5 added a "Block authoring" table. Does it have a row for `/block-craft → studio-mockups → Studio import`? If yes, edit or add a row for the new flow.
- `tools/block-forge/PARITY.md` — WP-035 entry. Does it list seed sources (first-run, Clone)? If yes, append `/block-craft → finalize → sandbox` as third source.
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — WP-035 entry. Mostly about Forge/Studio split; `/block-craft` is upstream of both — likely no edit needed.
- `.context/BRIEF.md` — has it got a "Block creation pipeline" diagram? Phase 2 may need to update it.

### Document in §0.5

```markdown
### §0.5 — Cross-doc references to `/block-craft` workflow

| File | Line(s) | Reference type | Phase 2 edit? |
|---|---|---|---|
| `.context/SKILL.md` | <line> | Load-bearing — names "Studio Process panel" as next step | YES |
| `.context/CONVENTIONS.md` | <line> | Block authoring table | YES (add row for /block-craft → finalize) |
| `tools/block-forge/PARITY.md` | <line> | WP-035 seed sources list | YES (append third source) |
| `apps/studio/.../responsive/PARITY.md` | <line> | WP-035 production gate | NO |
| `.context/BRIEF.md` | <line> | Pipeline diagram | YES (update arrow target) |

Total Phase 2 edits: <N> files
Approval gate threshold: 3 files (per saved memory feedback_close_phase_approval_gate)
Verdict: Phase 2 ALIVE / COLLAPSED into Phase 1
```

### Drives Ruling E

Phase 0 Ruling E: Phase 2 alive (≥3 doc edits + saved memory + WP status flip → approval gate engaged) OR collapsed (≤2 doc edits → fold into Phase 1 single commit).

If Phase 2 collapses, Phase 1 commit message reads `feat(skill): WP-038 — /block-craft FINALIZE protocol [WP-038 phase 1+2]` and includes the WP doc status flip + saved memory in the same commit.

---

## Task 0.6: §0.6 — slot/hook table parity

### What to Audit

Current SKILL.md has 3 tables under "Slots & Hooks":

- Layout Slots (header, footer, sidebar-left, sidebar-right)
- Nested Slots (theme-blocks)
- Meta Slots (name, tagline, description, category, price, discount_price, demo_url, themeforest_url, themeforest_id, thumbnail_url, rating, sales)
- Hook Shortcuts ({{price}}, {{discount_price}}, {{link:field}}, {{tags}}, {{theme_details}}, {{help_and_support}})

Read `packages/db/src/slot-registry.ts` (source of truth per current SKILL.md). For each slot/hook in tables, confirm:

- Slot name matches registry
- Slot category matches registry
- Syntax matches registry
- New slots in registry NOT in skill table (drift signal)

### Document in §0.6

```markdown
### §0.6 — Slot/hook table vs slot-registry.ts parity

| Table row in SKILL.md | Registry match | Drift? |
|---|---|---|
| header (header) | <yes/no> | ✅ |
| footer (footer) | <yes/no> | ✅ |
| sidebar-left | <yes/no> | ✅ |
| sidebar-right | <yes/no> | ✅ |
| theme-blocks (nested) | <yes/no> | ✅ |
| meta:price | <yes/no> | ✅ |
| ... | ... | ... |

New registry entries NOT in skill: <list>
Stale skill entries NOT in registry: <list>
```

### Drives no ruling directly (sanity check)

If parity is clean, no Phase 1 changes to slot tables. If drift, Phase 1 SKILL.md rewrite includes table updates as separate sub-task.

---

## Task 0.7: §0.7 — Trigger interpretation principles

### What to Audit

This is **design audit** (not file audit) — confirm the natural-language trigger interpretation rules that Phase 1 will encode:

- "забираю", "готово", "ок", "ship", "save to forge", "це воно" — clearly finalize signals
- "ще доробимо", "no", "ні", "wait" — clearly NOT finalize signals
- "ну ок", "поправ ще", "норм але..." — ambiguous; clarifying question required
- "збережемо в форджі", "запиши в forge", "зроби джсон" — explicit but novel phrasing; finalize signal

Document a heuristic for Phase 1's skill instruction:

- **PROCEED if**: user message has "done"-like phrasing OR explicit "save"/"запиши"/"finalize"
- **DECLINE if**: user message has "no"/"ні"/"wait" OR continues iteration ("change X", "make Y bigger")
- **CLARIFY if**: ambiguous tone, mixed signal, or short response after a long iterate session ("ну добре")

### Document in §0.7

```markdown
### §0.7 — Trigger interpretation heuristic

| Signal class | User phrasing examples | Skill action |
|---|---|---|
| PROCEED | "забираю", "готово", "ship", "save to forge" | run FINALIZE |
| DECLINE | "ні", "wait", "ще треба X" | continue ITERATE |
| CLARIFY | "ну добре", "ок", "норм але..." | ask "Finalize в Forge sandbox?" once |

Implementation note: skill prompt instructs Claude to interpret natural language in context — last 2-3 messages, current iterate state. Not an allow-list.
```

### Drives Ruling D

Phase 0 Ruling D: trigger interpretation rules — concrete heuristic table for Phase 1 skill prompt to embed. Locks user-experience contract.

---

## Brain Rulings (capture in §0.7+)

After completing audits §0.1–§0.7, draft 4–6 rulings in result.md:

| # | Topic | Ruling format |
|---|---|---|
| A | 11-key BlockJson SPLIT contract | "Skill emits keys in order: <list>. `html` field <includes / excludes> outer `<section>`. `css` field <preserves / strips> global resets. `js` field <with / without> `<script>` tags." |
| B | id emit-or-omit policy | "Skill <emits / omits> `id` field. Reasoning: <empirical evidence from §0.3 audit>." |
| C | Step 1 Figma read reference | "Phase 1 SKILL.md rewrite Step 1 references <`figma-use` / `mcp__Figma__*` / current canonical>." |
| D | Trigger interpretation rules | "Skill prompt embeds the §0.7 heuristic table verbatim. PROCEED / DECLINE / CLARIFY 3-class model." |
| E | Phase 2 alive or collapsed | "Phase 2 <ALIVE / COLLAPSED>. Doc edits: <count> files. Approval gate <engaged / not engaged>." |
| F | Slot/hook table updates | "Slot tables <unchanged / require <X> updates per §0.6>." |

If §0.4 surfaces a missing `figma-use` skill, append Ruling C amendment.
If §0.6 surfaces drift, append Ruling F amendment.

---

## Product RECON verdict

Last section of result.md — does WP-038 Phase 1 scope hold up to product audit?

```markdown
## Product RECON verdict

**Question:** Does the FINALIZE protocol genuinely close the gap, or does it just shift the manual work?

**Audit:**
- Iterate loop (Steps 1–5): unchanged. ✅
- Manual work today: user splits HTML by hand into BlockJson, generates slug, types into Studio Import dialog. Cost: 5–15 min per block.
- Manual work post-WP-038: user types "забираю", confirms slug name (1 message), opens Forge. Cost: <30 seconds.
- Edge case: re-finalize after iterate. Today: re-do split. Post-WP-038: skill re-runs split, overwrites JSON. Cost: <30 seconds.
- Forge picker doesn't auto-poll: user must refresh. Acceptable per WP-035 contract.
- Slug collision: confirm-with-warning step prevents silent overwrite. ✅

**Verdict:** GREEN — protocol closes the gap. The manual cost drops from minutes to seconds; the architectural seam is covered (skill becomes the third sandbox seed source). No new failure modes introduced — natural-language interpretation has CLARIFY fallback; collision warning prevents silent overwrite; LEAVE-AS-IS rule preserves user iteration freedom.

**Risks identified during audit:**
- <list any non-trivial risks surfaced; mitigation in WP doc Risks table>
```

---

## Files to Modify

**NONE — RECON is read-only.**

Output is exactly:

- `logs/wp-038/phase-0-result.md` — new file documenting §0.1–§0.7 audits + 4–6 rulings + product-RECON verdict

No SKILL.md edit, no domain-manifest.ts edit, no source code touched, no tests added.

---

## Acceptance Criteria

- [ ] `logs/wp-038/phase-0-result.md` exists with all 7 §-sections filled (no N/A on §0.1–§0.5; §0.6–§0.7 may be brief if audits show no drift)
- [ ] §0.1 documents the 11-key shape from 4 real block JSONs in `content/db/blocks/`
- [ ] §0.2 confirms `tools/block-forge/blocks/` is the live sandbox path
- [ ] §0.3 documents `id` policy with empirical evidence from `performCloneInSandbox` + sandbox file inspection
- [ ] §0.4 lists Figma read tooling availability + Step 1 reference status
- [ ] §0.5 enumerates cross-doc references with Phase 2 edit verdict
- [ ] §0.6 documents slot/hook parity vs `slot-registry.ts`
- [ ] §0.7 documents trigger interpretation heuristic (PROCEED / DECLINE / CLARIFY)
- [ ] 4–6 Brain rulings captured (A through F at minimum)
- [ ] Product RECON verdict: GREEN / YELLOW / RED with reasoning
- [ ] `npm run arch-test` STILL 595 / 595 (no source code touched)
- [ ] `git status` shows ONLY `logs/wp-038/phase-0-result.md` as untracked (no other changes)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-038 Phase 0 Verification ==="

# 1. Arch tests (path existence, parity, ownership) — RECON-only, MUST be unchanged
npm run arch-test
echo "(expect: 595 / 595 — same as WP-035 Phase 5 close baseline)"

# 2. Confirm result.md exists + non-trivial size
test -f logs/wp-038/phase-0-result.md && wc -l logs/wp-038/phase-0-result.md
echo "(expect: file exists, ≥120 lines — RECON depth target)"

# 3. Confirm zero source code mutations
git status --short | grep -vE "^\?\? logs/wp-038/" | grep -E "^.M|^M.|^A|^D"
echo "(expect: NO output — only untracked logs/wp-038/* allowed)"

# 4. Confirm zero arch-test target drift
grep -nE "expectedTotal|expect\(.*?totalTests" src/__arch__/*.test.ts 2>/dev/null | head
echo "(expect: arch-test count matches 595 — no regression)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-038/phase-0-result.md` with the structure described in §0.1–§0.7 above.

Header block (mandatory):

```markdown
# Execution Log: WP-038 Phase 0 — RECON pre-flight + Brain rulings

> Epic: WP-038 Block Craft → Forge sandbox finalize step
> Executed: <ISO timestamp>
> Duration: <minutes>
> Status: ✅ COMPLETE
> Domains affected: NONE (RECON-only; skill files outside manifest)
```

Then sections §0.1 through §0.7, then "Brain Rulings (locked)" with rulings A–F (or A–F+ if drift found), then "Product RECON verdict".

Then a short "Files Changed" table (only `logs/wp-038/phase-0-result.md`), "Issues & Workarounds" (likely "None — pure audit"), "Verification Results" (arch-test 595/595, etc.), and "Git" placeholder for the commit SHA (filled post-commit).

---

## Git

```bash
git add logs/wp-038/phase-0-task.md logs/wp-038/phase-0-result.md workplan/WP-038-block-craft-finalize-to-forge-json.md
git commit -m "docs(wp-038): WP-038 Phase 0 — RECON pre-flight + 4–6 rulings (skill-only WP, arch-test 595/595 unchanged) [WP-038 phase 0]"
```

(WP-038 doc included in commit because Phase 0 may surface amendments to the workplan ladder — e.g. Phase 2 collapse, scope adjustments. Backfill commit SHA in WP-038 Commit Ladder after commit.)

---

## IMPORTANT Notes for CC

- **RECON-only — zero source mutations.** SKILL.md is NOT edited in Phase 0. Only `logs/wp-038/phase-0-result.md` is created.
- **Read existing SKILL.md cold** before audit to internalize current shape (~470 lines). Phase 1 rewrite mirrors structure; mismatch = drift risk.
- **Audit 4 real block JSONs in §0.1** — empirical ground truth beats inferred shape. WP-035 Phase 0 caught Ruling C (id-strip) via empirical Clone audit; WP-038 §0.1 should be at least as rigorous.
- **§0.5 governs Phase 2 fate.** Cross-doc impact is the WP's longest tail — if §0.5 lists 3+ load-bearing references, Phase 2 stays alive (with approval gate); if ≤2, Phase 2 collapses and WP closes in single commit.
- **Saved memory `feedback_preflight_recon_load_bearing` is non-negotiable** — even small WPs benefit from RECON. Empirically: WP-027 24+ catches, WP-030 51 catches, WP-033 5/5 phases gained via RECON. Skipping = false economy.
- **Arch-test 595/595 is the post-WP-035 baseline.** WP-038 Phase 0 must end at the same count. WP-038 Phase 1 (SKILL.md rewrite) should also end at 595/595 since `.claude/skills/*` are not in the manifest.
- **`figma-use` skill availability check (§0.4) may surface a renaming.** If skill is named differently or moved to MCP, Ruling C documents the correction; Phase 1 rewrite uses the corrected reference.
- **Don't fix anything in Phase 0.** Stale references, drifted slot tables, missing skills — all noted in result.md as findings; rulings drive Phase 1 actions. RECON observes; it does not act.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

> The summary below goes to the Operator (Dmytro) AFTER writing the task file.
> The Operator reviews → approves commit → passes the full task file to Hands.

```markdown
Phase 0 промпт готовий: `logs/wp-038/phase-0-task.md`.

## Структура

**7 audit tasks, ~30–45 min budget:**

| # | Task | Scope |
|---|------|-------|
| 0.1 | §0.1 — 11-key BlockJson shape | Read 4 block JSONs in content/db/blocks/, document key set + ordering + html/css/js encoding |
| 0.2 | §0.2 — Forge sandbox stability | Verify tools/block-forge/blocks/ live, vite.config.ts:18 SANDBOX_DIR_DEFAULT, fresh-readdir cache contract |
| 0.3 | §0.3 — id emit-or-omit policy | Audit importBlockSchema, Forge BlockJson type, performCloneInSandbox empirical (clones lack id) |
| 0.4 | §0.4 — figma-use skill availability | List .claude/skills/, confirm Step 1 reference is live or stale |
| 0.5 | §0.5 — cross-doc impact | grep .context/, PARITY trio, BRIEF for /block-craft refs; verdict on Phase 2 alive/collapsed |
| 0.6 | §0.6 — slot/hook table parity | Cross-check SKILL.md tables vs packages/db/src/slot-registry.ts |
| 0.7 | §0.7 — trigger interpretation heuristic | Document PROCEED / DECLINE / CLARIFY 3-class model for Phase 1 skill prompt |

**Output:** logs/wp-038/phase-0-result.md with 7 §-sections + 4–6 Brain rulings + product-RECON verdict.

## 4 Brain rulings ALREADY locked (from prior chat)

1. **Trigger words** — natural language only; no allow-list. CLARIFY fallback if ambiguous.
2. **studio-mockups post-finalize** — LEAVE-AS-IS; no auto-cleanup.
3. **Re-finalize cycle** — allowed; each finalize overwrites Forge JSON.
4. **Slug+name UX** — always confirm with auto-derived proposal (collision warning if exists).

Phase 0 RECON adds rulings A–F (shape, id, Figma reference, trigger heuristic, Phase 2 fate, slot parity).

## Hard gates (Phase 0 only)

- Zero source code touch (skill files not in manifest; arch-test 595/595 must hold)
- Zero SKILL.md edit (RECON observes; Phase 1 acts)
- Zero domain-manifest.ts edit
- Zero file added to repo except `logs/wp-038/phase-0-result.md`

## Escalation triggers

- §0.2 audit shows `tools/block-forge/blocks/` doesn't exist or `SANDBOX_DIR_DEFAULT` changed since WP-035 → STOP, surface to Brain (WP-035 invariant violated mid-flight)
- §0.3 audit shows Forge App.tsx requires `block.id` for state → Ruling B flips to "MUST emit id"; Phase 1 scope adjusts
- §0.4 audit shows `figma-use` skill renamed/missing AND no MCP equivalent → Phase 1 includes Step 1 rewrite as new sub-task
- §0.5 audit shows ≥5 load-bearing cross-doc references → Phase 2 needs explicit approval gate; Phase 1 commit cannot include doc batch
- §0.6 audit shows ≥3 slot table drifts → Phase 1 SKILL.md rewrite scope grows; budget +15 min

## Arch-test target

**595 / 0** — unchanged. RECON is read-only; skill files are outside `domain-manifest.ts` ownership (`.claude/skills/*` is not in `owned_files` for any domain).

## Git state

- `logs/wp-038/phase-0-task.md` — new untracked
- `workplan/WP-038-block-craft-finalize-to-forge-json.md` — new untracked
- Nothing staged, nothing committed

## Next

1. Review → commit pair (Phase 0 task prompt + WP-038 doc) → handoff Hands
2. АБО правки (especially §0.5 cross-doc list — collapse risk underestimated?)
3. АБО self-commit if workflow permits

Чекаю.
```
