# Execution Log: WP-038 Phase 0 — RECON pre-flight + Brain rulings

> Epic: WP-038 Block Craft → Forge sandbox finalize step
> Executed: 2026-04-28
> Duration: ~35 minutes
> Status: ✅ COMPLETE
> Domains affected: NONE (RECON-only; `.claude/skills/*` outside `domain-manifest.ts`)

---

## §0 — Re-baseline audit

| Check | Expected | Observed |
|---|---|---|
| `npm run arch-test` (start) | 595 / 595 | ✅ 595 / 595 (post-WP-035 Phase 5 close baseline) |
| `.claude/skills/block-craft/SKILL.md` | exists, ~470 lines | ✅ 471 lines |
| `tools/block-forge/blocks/*.json` count | ≥ 9 | ✅ 9 (post first-run seed) |
| `content/db/blocks/*.json` count | 9 | ✅ 9 |
| `tools/block-forge/vite.config.ts:18` `SANDBOX_DIR_DEFAULT` | unchanged | ✅ `path.resolve(__dirname, 'blocks')` |
| `tools/block-forge/vite.config.ts:21` `SOURCE_DIR` env override | unchanged | ✅ `BLOCK_FORGE_SOURCE_DIR ?? SANDBOX_DIR_DEFAULT` |
| `importBlockSchema.id` policy | optional | ✅ `z.union([z.string(), z.number()]).optional()` (block.ts:89) |
| Pre-existing `git status` dirty | content/db/blocks/fast-loading-speed.json | ✅ pre-existing (predates WP-035; documented WP-035 Phase 5 §0) — not a Phase 0 leak |

WP-035 invariants hold. Sandbox path stable. No source code touched.

---

## §0.1 — 11-key BlockJson shape (audit ground truth)

Read 4 representative production-seed JSONs verbatim:

| Key | fast-loading-speed | header | theme-name | sidebar-help-support | Notes |
|---|---|---|---|---|---|
| id | `"1cbfccdf-..."` | `"baf05a76-..."` | `"6bda8908-..."` | `"0c115e43-..."` | UUID v4; production-seeded |
| slug | `"fast-loading-speed"` | `"header"` | `"theme-name"` | `"sidebar-help-support"` | kebab; matches filename |
| name | `"fast loading speed"` | `"header"` | `"theme name"` | `"sidebar help support"` | space-separated lowercase (drift signal — see Findings) |
| block_type | `""` | `"header"` | `"element"` | `"sidebar"` | empty string OR slot-category-aligned string |
| is_default | `false` | `true` | `false` | `false` | `true` only for global-element defaults (header) |
| sort_order | `0` | `0` | `0` | `0` | always 0 in production seed |
| hooks | `{}` | `{}` | `{}` | `{}` | empty object default; matches `hooksSchema.default({})` |
| metadata | `{ thumbnail_url: "..." }` | `{}` | `{}` | `{}` | post-Process upload only sets `thumbnail_url` |
| html | `<section class="block-fast-loading-speed" data-block="" data-fluid-tablet="off">` | `<section class="block-header-nav" data-block="">` | `<section class="block-theme-name" data-block="">` | `<!DOCTYPE html><html...><section class="block-sidebar-help-support" data-block>...` | **DRIFT — see Findings #2** |
| css | `*, *::before, *::after { margin: 0; ... } body { font-family: 'Manrope'... }` + scoped block styles | same legacy `*` reset + `body` rule + scoped | `body { ... }` + scoped | preview comment + `body { font-family: ... }` + scoped | **DRIFT — see Findings #3** |
| js | raw IIFE / IntersectionObserver code; **NO `<script>` tags** | raw IIFE; **NO tags** | raw IO code | raw template-clone + IO code | uniform — `js` is body-only |
| variants | `null` | (KEY ABSENT) | (KEY ABSENT) | (KEY ABSENT) | only `fast-loading-speed` has `variants: null`; other 3 omit the key entirely |

### Key ordering (observed across all 4)

`id → slug → name → block_type → is_default → sort_order → hooks → metadata → html → css → js [→ variants]`

11 keys minimum; 12 with `variants` (only `fast-loading-speed` carries it explicitly as `null` — WP-028 Ruling HH sentinel).

### Findings (drives Ruling A)

1. **`block_type` policy**: empty string for "section" blocks (homepage / theme-page sections), or one of `"header" | "footer" | "sidebar" | "element"` for global-element / hookable blocks. Skill default for `/block-craft` output: `""` (section blocks are the common case).
2. **`html` field encoding (DRIFT)**: 3 of 4 samples (`fast-loading-speed`, `header`, `theme-name`) start at `<section class="block-{slug}" data-block...>` verbatim. **`sidebar-help-support` is the outlier** — it embeds the FULL standalone preview HTML (`<!DOCTYPE html>...<head>...<body><section...>...</body></html>`). This is legacy authoring drift that the portal's renderer tolerates by string-extraction; **Phase 1 SPLIT contract MUST emit only the `<section class="block-{slug}" data-block>...</section>` segment**, not the full HTML document.
3. **`css` field encoding (DRIFT)**: ALL 4 samples have legacy global resets (`*, *::before, *::after { margin: 0; ... }`) and `body { font-family: 'Manrope'... }` rules at the top of `css`, BEFORE the scoped `.block-{slug}` rules. These violate the SKILL.md "ZERO global selectors" rule (line 226). The portal renderer strips `html`/`body`/`*` rules as a safety net (per SKILL.md line 229), so they are tolerated but undesirable. **Phase 1 SPLIT contract MUST extract ONLY the `.block-{slug}`-scoped rules + block-specific `@keyframes` / `@container slot (...)` queries**, omitting the legacy preview-time globals.
4. **`js` field**: uniformly NO `<script>` tags — raw JS body only. Phase 1 SPLIT strips wrapping `<script type="module">` tags from the studio-mockups HTML.
5. **`variants` field**: emit `null` (sentinel) when no variants present, matching WP-028 Phase 5 Ruling HH/LL. `JSON.stringify` preserves `null`, drops `undefined`. Disk + DB round-trip parity preserved.
6. **`name` field convention**: lowercase space-separated (e.g. `"fast loading speed"`, not `"Fast Loading Speed"`). Phase 1 confirm-with-proposal step should suggest the lowercase form derived from slug.

---

## §0.2 — Forge sandbox path + cache contract

| Aspect | Verified | Source |
|---|---|---|
| `SANDBOX_DIR_DEFAULT` | `tools/block-forge/blocks/` (resolved via `__dirname`) | vite.config.ts:18 |
| `SOURCE_DIR` env override | `BLOCK_FORGE_SOURCE_DIR` (path.resolve) → falls back to default | vite.config.ts:21–23 |
| Sandbox files (live) | 9 .json files | `ls tools/block-forge/blocks/*.json` |
| `GET /api/blocks` cache | NONE — `readdir(SOURCE_DIR)` per request | vite.config.ts:166–184 |
| First-run seed gate | one-shot per `configureServer` boot; sandbox empty + seed dir readable | vite.config.ts:93–143, 150 |
| `.bak` + `.gitkeep` filtering | `.json && !.bak` filter; `.gitkeep` ignored | vite.config.ts:111, 128, 168 |
| Skill write target | `tools/block-forge/blocks/<slug>.json` | confirmed safe — Phase 1 writes here |

WP-035 Phase 3 contract holds verbatim. **No escalation trigger.**

---

## §0.3 — `id` field policy

| Aspect | Verified | Source |
|---|---|---|
| `importBlockSchema.id` | optional (server-resolves on insert) | block.ts:89 |
| `/api/blocks/import` | find-or-create-by-slug upsert (WP-035 Phase 2) | block.ts:81–84 docstring |
| Forge `BlockJson` type declaration | `id: string \| number` (REQUIRED) | tools/block-forge/src/types.ts:7 |
| `performCloneInSandbox` empirical | strips `id` (line 67: `const { id: _droppedId, ...rest } = parsed`) | vite.config.ts:67 |
| Sandbox blocks today | first-run seed copies retain `id` (9 files, all have `id`); clones lack `id` | empirical |
| Forge `GET /api/blocks` list | reads `slug + name + filename` only — id-less files list-safe | vite.config.ts:170–177 |
| Forge `GET /api/blocks/:slug` | returns raw file bytes verbatim | vite.config.ts:241–251 |
| App.tsx `block.id` access | grep returned ZERO matches in `tools/block-forge/src` | empirical |

### Empirical evidence — Forge tolerates id-less files

`performCloneInSandbox` strips `id` and writes a clean file. Cloned blocks exist on disk without `id`, are listed by the picker, fetched by `getBlock`, displayed by App.tsx, exported by ExportDialog, and saved by `handleSave` — all without runtime panic. The TypeScript `BlockJson.id: string | number` (REQUIRED) is a structural lie that's been working because cloned blocks already break it; no consumer reads `block.id` at runtime in the Forge UI.

**Drives Ruling B**: skill OMITS `id` field on FINALIZE — empirically safe (matches Clone semantics); Studio Import server-resolves on insert. Type-level annotation in `BlockJson` will be reconciled in a separate WP if needed (out of WP-038 scope).

---

## §0.4 — Figma read tooling availability

`ls .claude/skills/`:

```
block-craft/  create-component/  debug-with-reliability/  domains/
figma-component-vars/  lint-ds/  portal-workflow/  register-slot/
revalidate/  sync-tokens/  tailwind/
```

| Skill / tool name | Exists? | Used for? |
|---|---|---|
| `figma-use` | ❌ NOT FOUND | Step 1 reference in current SKILL.md (`.claude/skills/block-craft/SKILL.md:35`) is **STALE** |
| `figma-component-vars` | ✅ | Variable resolution (orthogonal — for `/sync-tokens` flow, not block-craft) |
| Figma MCP (`mcp__Figma__*`) | not listed in current ToolSearch deferred tools | likely user invokes `use_figma` MCP directly when available |
| Pasted screenshot path | ✅ (vision; multimodal Read on screenshot files) | Fallback when no Figma URL |

### Step 1 reference status: ❌ STALE

Current SKILL.md line 35 says: "Use the `figma-use` skill first (MANDATORY before any `use_figma` call)". No such skill exists.

**Drives Ruling C**: Phase 1 SKILL.md rewrite — Step 1 must drop the `figma-use` reference. Replacement: "When the user shares a Figma URL/node, call `use_figma` (MCP tool, when available) directly OR ask user to paste a screenshot. No mandatory pre-skill required." Single-line correction, low scope add.

---

## §0.5 — Cross-doc references to `/block-craft` workflow

```bash
grep -rln "block-craft\|studio-mockups" .context/ tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md
```

Hits classified:

| File | Line(s) | Reference type | Phase 2 edit? |
|---|---|---|---|
| `.context/BRIEF.md` | 86 (skill list, decorative) | Decorative | NO |
| `.context/BRIEF.md` | 90 (skills count list) | Decorative | NO |
| `.context/BRIEF.md` | 131 (sprint backlog "real blocks from Figma via /block-craft") | Decorative — describes intent, not flow | NO |
| `.context/BRIEF.md` | **174** (Block model: "Created via Figma → `/block-craft` skill → Studio import → Process panel") | **Load-bearing — names old flow** | **YES** — update arrow chain |
| `.context/CONVENTIONS.md` | **437** (Block creation workflow §Pipeline step 1: "Figma design → `/block-craft` skill → Claude Code generates HTML+CSS+JS → preview on `localhost:7777`") | **Load-bearing — defines pipeline** | **YES** — append sandbox finalize step |
| `.context/CONVENTIONS.md` | 630 (Vite tools list mentions `studio-mockups` as sibling) | Decorative | NO |
| `.context/HANDOFF-RESPONSIVE-BLOCKS-2026-04-26.md` | 95 (notes that block-craft import path handles structural cases) | Decorative — handoff archive | NO |
| `.context/SKILL.md` | **124–158** (Block authoring loop — lists seed sources: first-run + Clone) | **Load-bearing — needs third seed source** | **YES** — add `/block-craft` FINALIZE |
| `.context/CONVENTIONS.md` | **1131–1155** (WP-035 Block authoring action table) | **Load-bearing — needs new row** | **YES** — add `/block-craft` finalize row |
| `tools/block-forge/PARITY.md` | none (block-craft not yet referenced) | — | **YES** — append seed-source note OR new WP-038 entry |
| `apps/studio/.../responsive/PARITY.md` | none (Studio's role unchanged) | — | NO |
| `.context/FIGMA_DESIGN_WORKFLOW.md` | 195, 212, 473 (broader Figma → mockups workflow; doesn't claim block-craft flow) | Decorative | NO |

**Total Phase 2 edits: 4 doc files** (`.context/BRIEF.md`, `.context/CONVENTIONS.md`, `.context/SKILL.md`, `tools/block-forge/PARITY.md`).

### Verdict: Phase 2 ALIVE

4 load-bearing files ≥ 3 → approval gate **ENGAGED** per saved memory `feedback_close_phase_approval_gate`.

**Drives Ruling E**: Phase 2 stays alive. Phase 1 commit ships the SKILL.md rewrite + workplan status flip stub; Phase 2 ships the cross-doc batch + saved memory write + WP-038 status flip → ✅ DONE under explicit "approve close" gate.

---

## §0.6 — Slot/hook table parity vs `slot-registry.ts`

`packages/db/src/slot-registry.ts` is source of truth. Compared against `.claude/skills/block-craft/SKILL.md` lines 320–386.

### Layout slots — clean

| Skill row | Registry match | Drift? |
|---|---|---|
| header (header) | ✅ `{ name: 'header', category: 'header' }` | clean |
| footer (footer) | ✅ `{ name: 'footer', category: 'footer' }` | clean |
| sidebar-left (sidebar) | ✅ | clean |
| sidebar-right (sidebar) | ✅ | clean |

### Meta slots — clean

All 12 META_SLOTS in `slot-registry.ts:31–44` match SKILL.md table 348–362 (name, tagline, description, category, price, discount_price, demo_url, themeforest_url, themeforest_id, thumbnail_url, rating, sales).

### Hook shortcuts — DRIFT (2 missing)

| Registry pattern | In SKILL.md hook shortcuts table? | Drift |
|---|---|---|
| `{{price}}` | ✅ | clean |
| `{{discount_price}}` | ✅ | clean |
| `{{link:field}}` | ✅ | clean |
| `{{primary_categories}}` | ❌ MISSING | **DRIFT** |
| `{{perfect_for}}` | ❌ MISSING | **DRIFT** |
| `{{tags}}` | ✅ | clean |
| `{{theme_details}}` | ✅ | clean |
| `{{help_and_support}}` | ✅ | clean |

**Drives Ruling F**: SKILL.md hook shortcuts table needs +2 rows in Phase 1: `{{primary_categories}}` (theme_categories is_primary join → badge pills) and `{{perfect_for}}` (theme_use_cases join → "Perfect for" sidebar list). Single-table edit; budget +5 min.

---

## §0.7 — Trigger interpretation heuristic

| Signal class | User phrasing examples | Skill action |
|---|---|---|
| **PROCEED** | "забираю", "готово", "ship", "ок зберігаємо", "save to forge", "це воно", "збережемо в форджі", "запиши в forge", "зроби джсон" | run FINALIZE |
| **DECLINE** | "ні", "ще доробимо", "wait", "no", "ще треба X", "поправ Y" + describes change | continue ITERATE (do not finalize) |
| **CLARIFY** | "ну добре", "ок", "норм", "ну ок" + no qualifier, short ack after long iterate | ask once: "Зберегти `<slug>` у Forge sandbox? (це створить `tools/block-forge/blocks/<slug>.json`)" |

### Implementation note for Phase 1 SKILL.md

The skill prompt instructs Claude to interpret natural language **in conversational context** — last 2–3 messages, current iterate state, presence/absence of "iterate" verbs ("change", "make Y bigger", "поправ", "додай"). Not an allow-list. The 3-class model is the OUTPUT, not the input.

**Confirm-with-proposal is ALWAYS required after PROCEED**, even when the trigger phrasing is unambiguous, because slug + name affect on-disk filename + StatusBar display:

> ```
> Готую FINALIZE. Запропонований slug: `fast-loading-speed`,
> name: "fast loading speed". OK, чи поправ?
> ```

If sandbox already has `<slug>.json`: warn explicitly + offer overwrite vs. abort vs. rename.

**Drives Ruling D**: Phase 1 SKILL.md embeds this heuristic table verbatim in a new "Step 6 — FINALIZE protocol" section, replacing the current "Step 6: Ready for Studio import".

---

## Brain Rulings (locked)

### Ruling A — 11-key BlockJson SPLIT contract

Skill emits keys in the exact order observed across `content/db/blocks/*.json`:

```
id?, slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants?
```

- `id`: **OMITTED** (per Ruling B; Studio Import resolves on insert).
- `html`: ONLY the `<section class="block-{slug}" data-block>...</section>` segment, extracted from studio-mockups HTML body. NO `<!DOCTYPE>` / `<html>` / `<head>` / `<body>` wrapping. NO preview-only `<style data-preview-only>`. Outer `<section>` tag preserved verbatim.
- `css`: ONLY the rules from the block's main `<style>` (NOT `<style data-preview-only>`). Strip global resets (`*, *::before, *::after { ... }`), strip `body { ... }` rules, strip `html { ... }` rules. Preserve all `.block-{slug}`-scoped rules + block-specific `@keyframes` + `@container slot (...)` queries. (Legacy production blocks have global resets in `css`; Phase 1 does NOT preserve that drift — emits clean.)
- `js`: raw JS body, with `<script>` / `<script type="module">` wrapping tags **stripped**. If multiple `<script>` tags exist in studio-mockups HTML, concatenate bodies in document order (one newline separator). Skip preview-only scripts (e.g. `<script id="preview-data">` or scripts that exist only to inject `<template id="preview-data">` content).
- `block_type`: `""` default. Skill confirm step may override if user signals slot-category fit (e.g. "це новий header" → `"header"` + `is_default: true`).
- `is_default`: `false` default. `true` only if user explicitly says it's a slot-category default (rare).
- `sort_order`: `0` (constant; sorting happens in Studio).
- `hooks`: `{}` default.
- `metadata`: `{}` default. Skill does NOT emit `metadata.thumbnail_url` — that field is owned by Studio Process panel post-Save.
- `variants`: emitted as `null` sentinel when none (WP-028 Ruling HH/LL); omit only when block author explicitly wants no variants key (legacy seed pattern). Skill default: emit `null`.

### Ruling B — `id` emit-or-omit

**OMIT.** Empirical evidence: `performCloneInSandbox` strips `id` (vite.config.ts:67); cloned blocks have no `id` on disk and Forge handles them without runtime panic; no consumer in `tools/block-forge/src` reads `block.id` (grep returned ZERO matches). `importBlockSchema.id` is optional + server-resolves (block.ts:89 + WP-035 Phase 2 commentary). The TypeScript `BlockJson.id: string | number` (REQUIRED) is a structural lie already broken by Clone — Phase 1 mirrors Clone semantics.

### Ruling C — Step 1 Figma read reference

`figma-use` skill DOES NOT EXIST in `.claude/skills/`. Phase 1 SKILL.md rewrite drops the line "Use the `figma-use` skill first (MANDATORY before any `use_figma` call)". Replacement: "When the user shares a Figma URL/node, call `use_figma` (MCP tool, when available) directly. If MCP is unavailable, ask user to paste a screenshot of the design."

### Ruling D — Trigger interpretation rules

Phase 1 skill prompt embeds the §0.7 PROCEED / DECLINE / CLARIFY 3-class model verbatim. Natural language interpretation in conversational context — NOT an allow-list. Confirm-with-proposal step is ALWAYS required after PROCEED, even when trigger is unambiguous. Slug collision → explicit warning + overwrite/abort/rename branch.

### Ruling E — Phase 2 alive or collapsed

**ALIVE.** §0.5 surfaced 4 load-bearing cross-doc edits (`.context/BRIEF.md`, `.context/CONVENTIONS.md` ×2 sections, `.context/SKILL.md`, `tools/block-forge/PARITY.md`). 4 ≥ 3 doc files → approval gate ENGAGED per saved memory `feedback_close_phase_approval_gate`. Phase 2 ships cross-doc batch + saved memory `feedback_block_craft_finalize_finalize` + WP-038 status flip 🟡 → ✅ DONE under explicit "approve close" signal. Phase 1 ships skill rewrite alone; backfills WP doc Commit Ladder Phase 1 SHA.

### Ruling F — Slot/hook table updates

Phase 1 SKILL.md hook shortcuts table needs **+2 rows** for parity with `packages/db/src/slot-registry.ts` HOOK_SHORTCUTS:

| Pattern | Resolves to | Description |
|---|---|---|
| `{{primary_categories}}` | theme_categories (is_primary=true) join categories | Badge pills for primary categories |
| `{{perfect_for}}` | theme_use_cases join use_cases | HTML list of use cases ("Perfect for" sidebar) |

Single-table append; +5 min budget.

---

## Product RECON verdict

**Question:** Does the FINALIZE protocol genuinely close the seeding gap, or does it just shift manual work?

**Audit:**
- Iterate loop (Steps 1–5): unchanged. ✅
- **Manual work today:** user splits HTML by hand into BlockJson (extract `<section>...</section>`, strip `<style data-preview-only>`, strip wrapping `<script>` tags, type 11 keys with correct ordering, generate slug, paste into Studio Import dialog). Cost: 5–15 minutes per block, with a real risk of forgetting global-reset stripping or `<script>` tag stripping (legacy seed has both).
- **Manual work post-WP-038:** user types "забираю", confirms slug + name (1 message), opens Forge picker. Cost: <30 seconds.
- **Edge case — re-finalize after iterate:** today: re-do split. Post-WP-038: skill re-runs split, overwrites JSON (allowed per Brain ruling 3). Cost: <30 seconds.
- **Forge picker doesn't auto-poll:** user must refresh after FINALIZE — acceptable per WP-035 contract (`GET /api/blocks` does fresh `readdir(SOURCE_DIR)` on every list call; refresh is single click).
- **Slug collision:** confirm-with-proposal step prevents silent overwrite (PROCEED → suggest slug → if exists, prompt overwrite/abort/rename).
- **Asymmetry preserved:** `/block-craft` writes to Forge sandbox ONLY (third seed source alongside first-run + Clone). Studio remains the production gate. No cross-write. Saved memory `feedback_forge_sandbox_isolation` honored.

**Verdict:** GREEN — protocol closes the gap empirically. Manual cost drops from minutes to seconds; the architectural seam (skill becomes the third sandbox seed source) is covered. No new failure modes:

- Natural-language interpretation has CLARIFY fallback.
- Collision warning prevents silent overwrite.
- LEAVE-AS-IS rule (Brain ruling 2) preserves user iteration freedom — `studio-mockups/<name>.html` remains intact post-finalize.
- Re-finalize cycle is allowed and idempotent (Brain ruling 3 — overwrites Forge JSON).

**Risks identified:**

1. **Legacy `<script id="preview-data">` blocks** in studio-mockups (e.g. `sidebar-help-support` pattern) — Phase 1 split must distinguish `<script type="module">` (block JS) from `<script id="preview-data">` (preview-only). Mitigation: Phase 1 split rule = "skip scripts whose only effect is to inject `<template>` content; emit only IO observers + behavioral handlers".
2. **Block-specific `@container slot (max-width: ...)` queries** in CSS — production seeds (e.g. `fast-loading-speed`) have these inline; Phase 1 split must preserve them. Phase 1 task spec calls this out under Ruling A.
3. **Type-level `BlockJson.id: string | number` (REQUIRED)** is broken by Clone semantics today — Phase 1 ships id-less files (Ruling B); type reconciliation is out of scope. Risk: future TypeScript strictness / consumer addition that reads `block.id` would break. Mitigation: documented in Ruling B; flag for separate WP if it surfaces.

---

## Files Changed

| File | Change | Description |
|---|---|---|
| `logs/wp-038/phase-0-result.md` | created | This file (RECON output) |

No SKILL.md edit. No source code touched. No `domain-manifest.ts` edit. No tests added.

---

## Issues & Workarounds

- **`figma-use` skill missing** (§0.4): noted; Phase 1 Ruling C drives correction. No action in Phase 0.
- **Hook shortcuts drift** (§0.6): noted; Phase 1 Ruling F drives +2 row append. No action in Phase 0.
- **Pre-existing dirty diff on `content/db/blocks/fast-loading-speed.json`**: in `git status` snapshot at session start; predates WP-035. NOT a Phase 0 leak. No action.

---

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` (start) | ✅ 595 / 595 |
| `npm run arch-test` (end) | (not re-run — RECON did not touch source; deferred to Phase 1) |
| `logs/wp-038/phase-0-result.md` exists | ✅ created |
| `git status` outside `logs/wp-038/` | ✅ no new tracked changes (pre-existing dirty diff documented) |
| `.claude/skills/block-craft/SKILL.md` untouched | ✅ — Phase 0 is read-only |
| `domain-manifest.ts` untouched | ✅ — `.claude/skills/*` outside manifest |

---

## Git

```bash
git add logs/wp-038/phase-0-task.md logs/wp-038/phase-0-result.md \
        workplan/WP-038-block-craft-finalize-to-forge-json.md
git commit -m "docs(wp-038): WP-038 Phase 0 — RECON pre-flight + 6 rulings (skill-only WP, arch-test 595/595 unchanged) [WP-038 phase 0]"
```

(Commit SHA backfilled in WP-038 Commit Ladder post-commit.)

---

## Phase 1 handoff (next)

Phase 1 task: rewrite `.claude/skills/block-craft/SKILL.md`:

- **Step 1**: drop `figma-use` reference (Ruling C); replace with "use_figma MCP when available, else paste screenshot".
- **Step 6**: replace "Ready for Studio import" with FINALIZE protocol — embeds §0.7 PROCEED/DECLINE/CLARIFY heuristic (Ruling D), ALWAYS-confirm-with-proposal step, write to `tools/block-forge/blocks/<slug>.json`.
- **SPLIT contract section** (new, before Step 6): documents Ruling A 11-key shape + ordering + html/css/js extraction rules + `id` omission (Ruling B) + `variants: null` sentinel.
- **Hook shortcuts table** (lines ~365–376): append `{{primary_categories}}` + `{{perfect_for}}` rows (Ruling F).
- Steps 1–5 (other content, Slots & Hooks, Animations, CSS Scoping, Checklist, What NOT to Do): preserved verbatim.

**Arch-test target Phase 1**: 595 / 595 unchanged (`.claude/skills/*` outside `domain-manifest.ts`).

**Phase 2 (Close)**: cross-doc batch (4 files: BRIEF, CONVENTIONS ×2 sections, SKILL.md, block-forge PARITY) + saved memory `feedback_block_craft_finalize_finalize` + WP-038 status flip → ✅ DONE under explicit "approve close" signal per `feedback_close_phase_approval_gate`.
