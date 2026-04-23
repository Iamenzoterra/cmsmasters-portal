# WP-026 Phase 5 — Close Proposal (byte-precise diffs)

**Role:** Hands
**Phase:** 5 (Close) — STEP 1 only
**Date:** 2026-04-23
**Plan reference:** `logs/wp-026/phase-5-task.md`

Two-step workflow. This file is STEP 1 (Propose). Each of the 7 target docs below gets a byte-precise diff proposal (current → proposed), with exact insertion points. No edits executed. Awaiting Brain approval before STEP 2 (Execute).

---

## Target matrix

| # | File | Change kind | Lines touched (approx) |
|---|------|-------------|---|
| 1 | `.context/BRIEF.md` | Add WP-026 row to sprint progress block | +1 |
| 2 | `.context/CONVENTIONS.md` | New section "Block-forge dev tool conventions" | +~40 |
| 3 | `.claude/skills/domains/infra-tooling/SKILL.md` | Frontmatter flip + new "Block Forge" section (6 REQUIRED_SECTIONS × full) | 1 changed + ~60 added |
| 4 | `workplan/BLOCK-ARCHITECTURE-V2.md` | Append one update-note line after line 8 | +1 |
| 5 | `tools/block-forge/README.md` | NEW FILE | ~120 |
| 6 | `tools/block-forge/PARITY.md` | Append Discipline-confirmation + Cross-contract-test sections | +~25 |
| 7 | `workplan/WP-026-tools-block-forge-mvp.md` | Status flip + Completed date | 2 changed |

---

## 1.1 — `.context/BRIEF.md`

**Observation:** The existing sprint progress block (lines 111–120) shows `Responsive Blocks Foundation` (WP-024) and `Block Forge Core` (WP-025) but does NOT yet contain a WP-026 row. This is an ADD, not a flip — consistent with how WP-024 and WP-025 were added on their respective closes. The overall "What's built" header dates (`verified 9 April 2026` line 52) are not touched; only the sprint block.

**Current** — lines 111–120 (context; the added line slots between lines 119 and 120):

```
Layer 0: Infrastructure           ✅ DONE (DB, Auth, Hono, packages)
Layer 1: Studio + DB + API        ✅ DONE (WP-005A+B+C+D Phase 1)
Block Import Pipeline             ✅ DONE (WP-006: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js)
Layer 2: Portal (Next.js 15)      ✅ DONE (WP-007: layout editor, theme pages, composed pages, SEO, sitemap. Migrated Astro→Next.js 4 Apr 2026)
Global Elements V2                ✅ DONE (WP-008: block categories, defaults, layout slot overrides, new portal resolution)
Layer 3: Dashboard + Admin        ✅ DONE (WP-017: 9 phases, DB migration + auth refactor + 14 API endpoints + 2 SPAs)
Responsive Blocks Foundation      ✅ DONE (WP-024: blocks.variants JSONB + BlockRenderer inlining + slot container-type + tokens.responsive.css scaffold — unblocks WP-025/026/027/028; ADR-025)
Block Forge Core                  ✅ DONE (WP-025: pure-function engine — 6 public fns, 75 tests, 3 frozen fixtures + E2E snapshot; unblocks WP-026 tools/block-forge + WP-027 Studio Responsive tab; ADR-025)
```

**Proposed** — insert this single line AFTER line 119 (the `Block Forge Core` row), BEFORE the closing code-fence on line 120:

```
Block Forge MVP                   ✅ DONE (WP-026: tools/block-forge/ Vite app on :7702 — file-based authoring against content/db/blocks/*.json, 3-panel preview (1440/768/375), accept/reject suggestions, save with .bak; 46 tests, zero PARITY divergences; unblocks WP-027 Studio Responsive tab + WP-028 Tweaks/Variants UI; ADR-025)
```

**Also update** — line 5 `> Last updated: 23 April 2026` is already today; no change needed.

**Also:** sub-section "Current sprint: MVP Slice" heading remains unchanged. No edit to "What's next" (line 122–126) in this phase — content seeding / theme catalog / support app are still the next surface bets; the refactor is out of scope.

---

## 1.2 — `.context/CONVENTIONS.md`

**Placement:** Insert a new section "Block-forge dev tool conventions" AFTER the existing `## Block Forge Core — when to call (WP-025, ADR-025)` section (which ends at line 481 with the paragraph beginning `renderForPreview matches apps/portal/lib/hooks.ts …`). The new section is the natural sibling of Block Forge Core (core → tool), landing them adjacent.

**Exact insertion** — append immediately after line 481's closing paragraph, preceded by a blank line and a horizontal rule (matching the existing separator pattern used between sections in this file):

```markdown

---

## Block-forge dev tool conventions (WP-026, ADR-025)

`tools/block-forge/` is the first consumer of `@cmsmasters/block-forge-core`. These rules apply to block-forge specifically; other Vite-based dev tools (layout-maker, studio-mockups) are free to pick their own patterns unless explicitly called out.

### 1. File I/O contract (save safety)

Six non-negotiable rules from the WP-026 Phase 0 / `tools/block-forge/src/lib/file-io.ts`:

1. **Read guards.** `readBlock` rejects missing/empty `html` or `slug` with a typed `BlockIoError`. The renderer never sees invalid input.
2. **Write scope.** Writes are restricted to the exact file path that was opened. No new-file creation, no directory traversal — the POST handler in `vite.config.ts` (`blocksApiPlugin`) checks `access(filepath, W_OK)` before write.
3. **First-save-per-session backup.** First save in a session writes `<path>.bak` with the pre-overwrite bytes verbatim. Client tracks `session.backedUp: boolean` in `src/lib/session.ts`; POST body carries `requestBackup: boolean` so the server stays stateless.
4. **Dirty-state guards.** `beforeunload` prompts on tab close while the session has pending accepts; picker-switch confirms discard via `window.confirm`.
5. **No-op Save.** Save button is disabled when `session.pending.length === 0 || saveInFlight`.
6. **No deletes.** Block-forge never removes `.json` or `.bak` files. Clean-up is out-of-band (manual).

Reference: `tools/block-forge/PARITY.md` for the preview-side contract; `tools/block-forge/README.md` for the end-user explanation.

### 2. Preview parity with portal

Block-forge's iframe MUST match `apps/portal/lib/hooks.ts` → `renderBlock()` non-variant output byte-for-byte (modulo theme-page chrome, which block-forge omits by design):

- **Token injection:** `packages/ui/src/theme/tokens.css` and `tokens.responsive.css` inside `@layer tokens`.
- **Slot wrapper:** `<div class="slot-inner"><div data-block-shell="{slug}">…</div></div>`. The outer `.slot-inner` carries `container-type: inline-size; container-name: slot` (set in `@layer shared`), matching LM's `css-generator.ts:254-255`.
- **`@layer` order:** `tokens, reset, shared, block`. Non-negotiable — authored block CSS may rely on cascade order.
- **Change discipline:** ANY change to token injection, slot wrapper, or `@layer` order MUST update `tools/block-forge/PARITY.md` in the same commit. See PARITY.md "Discipline" section.

LM does NOT wrap its iframe this way (legacy blocks use `@media`, not `@container slot`). Do not copy LM's iframe pattern into block-forge.

### 3. Vitest config for Vite tools

When a Vite-based tool imports `?raw` CSS (block-forge's `preview-assets.ts` does), `vite.config.ts` MUST include `test: { css: true }`:

```ts
test: {
  css: true,  // required — ?raw imports load as empty strings otherwise
  environment: 'node',
  // ...
}
```

Without it, assertions that scan the CSS content silently run on empty strings and pass on nothing. Reference saved memory `feedback_vitest_css_raw.md`.

### 4. `data-*` test hooks for dev tools

Dev tools use stable DOM selectors via `data-*` attributes (non-presentational, zero CSS impact) rather than text content or Tailwind class chains. Block-forge's reserved hooks:

- `data-action="save"` — Save button in `StatusBar`.
- `data-action="accept" | "reject" | "undo"` — Suggestion row buttons.
- `data-role="source-path" | "pending-count" | "last-saved" | "save-error"` — Status bar readouts.
- `data-role="warnings"` — SuggestionList warnings region.
- `data-pending="true"` — Row in pending state.
- `data-suggestion-id="{id}"` — Row identity for targeting one of many.
- `data-region="triptych" | "suggestions" | "status"` — Top-level app regions.

Browser QA (Chrome DevTools, Playwright) and integration tests (`src/__tests__/integration.test.tsx`) consume these. Renaming any hook requires a test sweep.

Apps (portal / dashboard / studio / admin) continue to prefer semantic ARIA roles first; `data-*` is for dev-tool surfaces where test-only hooks don't leak into production UX.
```

**Rationale:** the 4-subsection split mirrors the task spec; each subsection keeps a single concern with a pointer back to the authoritative source (PARITY.md / SKILL.md / README.md / test file).

---

## 1.3 — `.claude/skills/domains/infra-tooling/SKILL.md`

**Two modifications. Ordering matters: the frontmatter flip is the arch-test trigger.**

### (a) Frontmatter flip — line 5

**Current** (line 5):
```
status: skeleton
```

**Proposed** (line 5):
```
status: full
```

This flip causes `src/__arch__/skill-sections.test.ts` (or equivalent) to assert the 6 REQUIRED_SECTIONS (`Start Here`, `Public API`, `Invariants`, `Traps & Gotchas`, `Blast Radius`, `Recipes`) — arch-test delta **+6** per saved memory `feedback_arch_test_status_flip.md`.

### (b) Append Block Forge section

**Placement:** The current SKILL.md ends at line 33. The file has `Start Here / Public API / Invariants / Traps & Gotchas` populated with Layout Maker content; it is missing `Blast Radius` and `Recipes` sections entirely.

**Strategy:** Rather than reshuffling the Layout Maker content, append Block Forge as a FULL self-contained sibling. That sibling uses nested subsections (`### Start Here (block-forge)`, `### Invariants (block-forge)`, etc.) to avoid clashing with Layout Maker's headings.

**Critical:** After this append, the FILE as a whole must satisfy the 6 REQUIRED_SECTIONS arch-test. Depending on test implementation, the test may look for either top-level `## Start Here` / `## Public API` / `## Invariants` / `## Traps & Gotchas` / `## Blast Radius` / `## Recipes`, or it may scan nested headings. The current file has 4 of 6 at the top level but is missing top-level `## Blast Radius` and `## Recipes`. **To guarantee green**, I propose ALSO adding two top-level sections before the Block Forge part:

**Proposed full insertion** — replace lines 25–33 (the existing `## Traps & Gotchas` block) with the following expanded tail. The Layout Maker content is preserved verbatim; two new top-level sections (`## Blast Radius` and `## Recipes`) are added for Layout Maker content that belongs there; then the Block Forge section follows.

```markdown
## Traps & Gotchas

- **`.context/` is the agent entry point.** Reading order: BRIEF.md -> current layer spec -> CONVENTIONS.md.
- **workplan/*.md files are volatile** — new files added frequently, not tracked individually in manifest.
- **tools/studio-mockups/** serves block preview HTML on :7777 during /block-craft skill.
- **tools/sync-tokens/** has Figma config for token pipeline.
- **yaml `scope` must match DB `scope`.** The drift between `scope: theme-page-layout` (yaml) and `scope: "theme"` (DB) was caught and fixed in WP-020. Always verify scope alignment before a DB push. (WP-020)
- **DB may carry visual params not in yaml** — drifted via Studio edits or older generator runs. Before regenerating from yaml, diff against DB state to catch silent regressions. (WP-020)

## Blast Radius

- **`tools/layout-maker/runtime/lib/css-generator.ts`** — regenerates layout CSS; changes to slot emission propagate to every theme that subsequently re-exports. Batch re-export is out of scope per WP-024 "lazy re-export rollout" note.
- **`.context/BRIEF.md` + `.context/CONVENTIONS.md`** — agent-facing surface; stale content here mis-orients every fresh session. Treat edits as a gate, not a chore.
- **`workplan/adr/*.md`** — architectural records; new ADRs must be referenced from BRIEF.md and the touching WP file.

## Recipes

1. **Add a new ADR.** File path: `workplan/adr/NNN-short-slug.md`. Reference it from BRIEF.md "Also done" section, and from the WP that implements it.
2. **Add a new workplan.** File path: `workplan/WP-NNN-short-slug.md`. Standard header: Status / Priority / Prerequisites / Milestone / Estimated effort / Created / Completed.
3. **Rotate a SKILL from skeleton to full.** Populate all 6 REQUIRED_SECTIONS (`Start Here`, `Public API`, `Invariants`, `Traps & Gotchas`, `Blast Radius`, `Recipes`). Flip frontmatter `status: skeleton` → `status: full`. Run `npm run arch-test`; expect +6 tests.

## Block Forge — Responsive Authoring Dev Tool

### Start Here (block-forge)
1. `tools/block-forge/README.md` — purpose + how to run
2. `tools/block-forge/PARITY.md` — preview injection contract
3. `tools/block-forge/src/App.tsx` — session + save orchestration (end-to-end flow)

### Public API (block-forge)
(none — runnable dev surface, consumes `@cmsmasters/block-forge-core` + `@cmsmasters/ui` + `@cmsmasters/db` types)

### Invariants (block-forge)
- **Port 7702** (strictPort) — sibling of LM's 7700/7701 pair; studio-mockups owns 7777.
- **Preview parity with portal** — token injection, slot wrapper, `@layer` order per `PARITY.md`. Any iframe composition change updates PARITY.md in the same commit.
- **Save safety contract** (6 rules from `.context/CONVENTIONS.md`) — read-guards `html`+`slug`, opened-file-only writes, first-save-per-session `.bak`, dirty guards on navigation, no-op save when nothing pending, no deletes.
- **Client-owned session, server-stateless writes** — the session boundary (pending/rejected/history/backedUp) lives entirely in the browser. The Vite middleware POST handler reads a `requestBackup: boolean` flag per request and writes `.bak` iff requested. No server-side session cache, no cross-request state.
- **Session boundary = slug change** — every `setSelectedSlug` call resets session via `createSession()`. Includes re-selecting the same slug (prevented at UX level by the picker, but semantically fresh if it happened).
- **Single-port architecture** — Vite `configureServer` middleware for `/api/blocks/*`; no separate Hono runtime (unlike LM). Chosen for MVP simplicity; revisit if file-watching or broadcast becomes necessary.

### Traps & Gotchas (block-forge)
- **Install dance for workspace `*` deps.** `tools/*` is not a root workspace; `npm install` with `@cmsmasters/block-forge-core: "*"` declared in `tools/block-forge/package.json` queries the public registry and 404s. Workaround: temporarily comment out the three `@cmsmasters/*` lines, `npm install`, restore. LM has the same pattern. (Carry from Phase 1 Dev #2.)
- **`content-sync pull` collision.** Running `/content-pull` overwrites `content/db/blocks/*.json` from DB. Any unsaved block-forge edits in those files are trampled. Workflow: Save in block-forge (writes + `.bak`) BEFORE any `/content-pull`; or commit first. `tools/content-sync.js:102` is the writer.
- **`test: { css: true }` required** for any Vitest test that exercises a module importing `?raw` CSS. Without it, the CSS loads as empty strings — assertions pass but on nothing. `tools/block-forge/vite.config.ts` sets this; preserve it.
- **`__dirname` in ESM Vite config.** Use `fileURLToPath(import.meta.url)` + `path.dirname` for Windows robustness. LM uses `import.meta.dirname` (Node 20.11+) which also works but is less portable.
- **Slot wrap is two levels deep.** Portal and block-forge wrap blocks in `<div class="slot-inner"><div data-block-shell="{slug}">…</div></div>` — the outer provides `@container slot` context; the inner is the block identity. LM does NOT wrap (legacy blocks don't use `@container slot` queries). Don't copy LM's iframe pattern into block-forge; use `PARITY.md` as the reference.
- **`data-*` test hooks are load-bearing.** `data-suggestion-id`, `data-action`, `data-role`, `data-pending` are used by browser QA + integration tests. Removing them silently breaks tests. Rename requires a test sweep.
- **Session doesn't persist across dev-server restarts.** Accept/reject state is in-memory only. Authors who want to pause and resume should commit WIP or accept Save's on-disk state as the checkpoint.

### Blast Radius (block-forge)
- **`src/lib/preview-assets.ts`** — breaks preview parity. Updates MUST sync with `PARITY.md` (same commit) + run browser parity check against portal.
- **`src/lib/file-io.ts`** — breaks save safety. Updates MUST sync with `.context/CONVENTIONS.md` "file I/O contract" AND `src/__tests__/file-io.test.ts` + `src/__tests__/session.test.ts`.
- **`vite.config.ts` — `blocksApiPlugin`** — breaks the file-system bridge. POST handler changes need a matching `api-client.ts` update + integration test.
- **`src/lib/session.ts`** — breaks the state machine. Full 15-test suite covers transitions; new transitions require test additions.
- **`packages/ui/src/theme/tokens.css` renames** — silently break tool chrome AND iframe injection. Grep `tools/block-forge/src/**/*.{tsx,ts,css}` + `tools/block-forge/src/lib/preview-assets.ts` for the old name.
- **`packages/block-forge-core/src/index.ts` export renames** — compile failures, caught at typecheck. Update `tools/block-forge/src/lib/useAnalysis.ts` + App.tsx `handleSave`.

### Recipes (block-forge)
1. **Run dev:** `npm run block-forge` (root alias) OR `cd tools/block-forge && npm run dev`. Opens `:7702`.
2. **Add a new block:** outside block-forge — use `/block-craft` skill for authoring, then `/content-push` to DB. Block-forge edits existing blocks only.
3. **Debug save not landing:** DevTools → Network tab → POST `/api/blocks/:slug` → check status + response body (`{ ok: true, slug, backupCreated }`). Check disk for `.bak` + modified `.json`.
4. **Regenerate preview parity:** after a token or portal render change, update `src/lib/preview-assets.ts` AND `tools/block-forge/PARITY.md` in the same commit. Run `npm run block-forge` + DevTools-check the iframe DOM matches the new contract.
5. **Install fresh:** follow the install dance (strip `@cmsmasters/*` → `npm install` → restore). Root `block-forge:*` aliases still work post-dance.
```

**Note on structural decision:** I'm adding top-level `## Blast Radius` and `## Recipes` sections to ensure the file as a whole satisfies REQUIRED_SECTIONS regardless of whether the arch-test is top-level-only or nested-aware. Block Forge then has its own nested `### Blast Radius (block-forge)` / `### Recipes (block-forge)` for disambiguation. This is slightly heavier than the minimum but resilient.

**Ambiguity flagged (for Brain to rule):** If the arch-test is nested-heading-aware and already counts the `### Blast Radius (block-forge)` / `### Recipes (block-forge)` headings, the two new top-level sections are redundant. Brain can strip them and we'll investigate if arch-test fails. Lowest-risk path: keep both, match the file to the strictest plausible assertion.

---

## 1.4 — `workplan/BLOCK-ARCHITECTURE-V2.md`

**Placement:** Append immediately after line 8 (the existing `> Engine update 2026-04-23 (WP-025 / ADR-025): …` note) and BEFORE the blank line and `---` at line 9.

**Current** — lines 7–10:
```
> Responsive update 2026-04-22 (WP-024 / ADR-025): `blocks.variants` JSONB column added; `BlockRenderer` + `renderBlock()` inline variants as `<div data-variant>` siblings revealed by `@container slot (…)` rules; leaf slots expose `container-type: inline-size; container-name: slot` via LM-generated layout CSS. Existing blocks render unchanged (null variants = byte-identical output). See `.context/CONVENTIONS.md` → "Responsive blocks".
> Engine update 2026-04-23 (WP-025 / ADR-025): `@cmsmasters/block-forge-core` ships the pure-function pipeline — `analyzeBlock` → `generateSuggestions` (6 heuristics) → `applySuggestions` / `emitTweak` / `composeVariants` / `renderForPreview`. Consumed by WP-026 (tools/block-forge Vite app) and WP-027 (Studio Responsive tab). See `.context/CONVENTIONS.md` → "Block Forge Core".

---
```

**Proposed** — after line 8 (the WP-025 Engine update line), insert a new WP-026 note on what becomes line 9:

```
> Dev tool update 2026-04-23 (WP-026): `tools/block-forge/` Vite app ships as the first consumer of `@cmsmasters/block-forge-core`. File-based authoring against `content/db/blocks/*.json` at port 7702: pick block → 3-panel preview (1440/768/375) → review ADR-025 suggestions → accept/reject → Save (with backup-on-first-save). Covers the MVP authoring loop before Studio integration (WP-027). See `.claude/skills/domains/infra-tooling/SKILL.md` → "Block Forge".
```

Existing line 9 (blank) and line 10 (`---`) remain unchanged, pushed to lines 10 and 11 respectively.

---

## 1.5 — `tools/block-forge/README.md` (NEW FILE)

**Full file contents** (to be created fresh at `tools/block-forge/README.md`):

```markdown
# Block Forge

Vite-based dev tool for file-based responsive block authoring. First consumer of `@cmsmasters/block-forge-core`. Reads a block JSON from `content/db/blocks/`, shows a 3-panel preview (1440 / 768 / 375), surfaces ADR-025 responsive suggestions from the engine, lets the author accept/reject, writes back with backup safety.

## Quick Start

From monorepo root:
\`\`\`bash
npm run block-forge            # opens http://localhost:7702
npm run block-forge:test
npm run block-forge:build
npm run block-forge:typecheck
\`\`\`

Or from `tools/block-forge/`:
\`\`\`bash
cd tools/block-forge && npm run dev
\`\`\`

## What Block Forge Does

1. Lists `content/db/blocks/*.json` in a dropdown.
2. Loads the selected block's `html` + `css` + `js` into three iframes at canonical breakpoints.
3. Runs `analyzeBlock` + `generateSuggestions` from the core engine; displays the result as a sorted, confidence-labeled list.
4. Author clicks Accept/Reject per row; accepted suggestions accumulate in an in-memory session.
5. Clicking Save calls `applySuggestions(block, accepted)`, POSTs the result to `/api/blocks/:slug`, which writes the updated block to disk + `.bak` on first save of the session.
6. Re-analyzes after save — accepted rules now in the block's CSS no longer trigger, so those rows disappear.

## What Block Forge Does NOT Do

- Does not create new blocks — use `/block-craft` skill for authoring, `/content-push` to persist to DB.
- Does not edit Studio mockups — `tools/studio-mockups/` on port 7777 is a separate preview surface.
- Does not write to Supabase — file-based I/O only. After saving, run `/content-push` to ship edits to DB.
- Does not do element-click tweaks or variant forking — WP-028.
- Does not integrate into Studio — WP-027.

## Install

`tools/block-forge/` is NOT a workspace (by design, mirrors `tools/layout-maker/`). It needs its own `npm install`:

\`\`\`bash
cd tools/block-forge && npm install
\`\`\`

**Install gotcha:** the first install fails with `E404 @cmsmasters/block-forge-core@*` because `tools/*` isn't in the root `workspaces` glob. Workaround (same as LM):

1. Temporarily comment out the three `@cmsmasters/*` lines in `tools/block-forge/package.json`.
2. Run `npm install` — populates `node_modules/` with registry deps.
3. Restore the `@cmsmasters/*` lines to `package.json`.

Workspace deps resolve via the monorepo-root `node_modules/@cmsmasters/` symlink chain at runtime; lockfile doesn't need them listed.

## File Layout

\`\`\`
tools/block-forge/
├── package.json             # name: "block-forge", private, not a workspace
├── tsconfig.json
├── vite.config.ts           # port 7702 + blocksApiPlugin (GET/POST /api/blocks/*)
├── tailwind.config.ts       # mirrors apps/dashboard
├── postcss.config.cjs
├── index.html
├── README.md                # you are here
├── PARITY.md                # preview injection contract (non-negotiable)
└── src/
    ├── main.tsx
    ├── App.tsx              # session + save orchestration + dirty guards
    ├── types.ts             # BlockJson + BlockIoError + SessionBackupState
    ├── globals.css          # tokens.css + tailwindcss + @config
    ├── vite-env.d.ts
    ├── components/
    │   ├── BlockPicker.tsx
    │   ├── PreviewTriptych.tsx
    │   ├── PreviewPanel.tsx
    │   ├── SuggestionList.tsx
    │   ├── SuggestionRow.tsx
    │   └── StatusBar.tsx
    ├── lib/
    │   ├── file-io.ts       # readBlock, writeBlock, ensureBackupOnce
    │   ├── preview-assets.ts # composeSrcDoc
    │   ├── api-client.ts    # listBlocks, getBlock, saveBlock
    │   ├── paths.ts
    │   ├── session.ts       # pure state machine
    │   └── useAnalysis.ts   # React hook over core engine
    └── __tests__/
        ├── file-io.test.ts
        ├── preview-assets.test.ts
        ├── session.test.ts
        └── integration.test.tsx
\`\`\`

## Default Source Directory

`content/db/blocks/` relative to monorepo root. Override via `BLOCK_FORGE_SOURCE_DIR=/abs/path npm run block-forge` if needed.

## Save Safety Contract

1. Read: `readBlock` rejects missing/empty `html` or `slug` with a typed error.
2. Write scope: only the exact file path opened. No new-file creation, no directory traversal.
3. Backup: first save per session writes `<path>.bak` with pre-overwrite bytes. Idempotent on subsequent saves in the same session.
4. Dirty guards: `beforeunload` on tab close + picker-switch confirm prompt.
5. No-op Save: disabled when no pending suggestions.
6. No deletes: block-forge never removes `.json` or `.bak` files.

See `.context/CONVENTIONS.md` → "Block-forge dev tool conventions" for the authoritative version.

## Preview Parity

See `PARITY.md` for the complete injection contract. Changes to any token / slot wrapper / `@layer` order must update `PARITY.md` in the same commit.

## Known Interactions

- **`/content-pull` collision.** Running `/content-pull` overwrites `content/db/blocks/*.json` from DB — any unsaved block-forge edits are lost. Save (or commit) before running `/content-pull`.
- **LM + block-forge running simultaneously.** LM on 7700/7701, block-forge on 7702 — no conflict.
- **`tools/studio-mockups/`** serves on 7777 via `/block-craft` — separate surface, no overlap.

## Next WPs

- **WP-027** — Studio «Responsive» tab: same engine + UI patterns integrated into `apps/studio/`.
- **WP-028** — Tweaks + Variants UI: element-click per-BP sliders + variant drawer for both block-forge and Studio.
- **WP-029** — Auto-rules polish + `tokens.responsive.css` populate.
```

**Note:** In the actual file the fenced code blocks use plain triple-backtick; I've escaped them here (`\`\`\``) so this proposal file itself can be valid markdown when rendered. On execute, strip the backslashes.

---

## 1.6 — `tools/block-forge/PARITY.md` (APPEND)

**Placement:** Append at end of file, after line 69 (`_(empty)_` under `## Fixed`). Preserve lines 1–69 verbatim.

**Proposed append** — add these two new sections below the current "Fixed" section:

```markdown

## Discipline Confirmation (WP-026 Close)

Across Phases 2–4 of WP-026, **zero open divergences** were observed against the portal theme-page block render contract:

- **Phase 2** (preview seed) — 3 tests in `preview-assets.test.ts` verify token injection, slot wrapper structure, and `postMessage` height-sync contract.
- **Phase 3** (suggestions consumer) — 4 fixture contracts from `@cmsmasters/block-forge-core` frozen snapshot consumed in `integration.test.tsx`: `block-spacing-padding`, `block-spacing-font`, `block-components-anchor`, `block-overflow-sidebar`.
- **Phase 4** (save orchestration) — 4 real blocks under `content/db/blocks/` (`global-header-ui`, `global-footer-ui`, `homepage-hero`, `block-spacing-padding`) verified end-to-end: load → accept suggestions → Save → `.bak` created → `.json` rewritten → re-analysis.

Block-forge is baseline-true vs the portal theme-page render as of the commit closing WP-026.

## Cross-contract test layers

Block-forge's safety net is two-layered:

1. **Core engine contract** — `packages/block-forge-core/src/__tests__/snapshot.test.ts.snap` freezes the `analyzeBlock` → `generateSuggestions` → `applySuggestions` → `composeVariants` → `renderForPreview` pipeline output for all 3 canonical fixtures + E2E. Any engine behavior drift fails at the package level before block-forge runs.
2. **UI surface contract** — `tools/block-forge/src/__tests__/integration.test.tsx` verifies that the Vite app consumes the engine identically: suggestion IDs flow through to DOM `data-suggestion-id`; Save POST payload matches `applySuggestions` output exactly; `requestBackup` flag flips correctly after first save per session.

A regression in one layer fails tests in that layer — never silently. The snapshot is the ground truth for fixture behavior (not the filename); see saved memory `feedback_fixture_snapshot_ground_truth.md`.
```

---

## 1.7 — `workplan/WP-026-tools-block-forge-mvp.md` (HEADER FLIP)

**Current** — lines 5 and 11:

```
**Status:** PLANNING
```
```
**Completed:** —
```

**Proposed** — lines 5 and 11:

```
**Status:** ✅ DONE
```
```
**Completed:** 2026-04-23
```

No other edits to this file in this phase.

---

## 1.8 — Proposal commit

Commit this proposal file as a single chore-logs commit:

```
chore(logs): add wp-026 phase-5 proposal [WP-026 phase 5 step 1]
```

Untracked `logs/wp-026/phase-5-task.md` (the task file itself) will be staged in the same commit.

---

## Summary (7 sections, 1 line each)

1. **BRIEF.md** — add one-line WP-026 row to sprint progress block after WP-025 row; no other edits.
2. **CONVENTIONS.md** — new 4-subsection "Block-forge dev tool conventions" after existing "Block Forge Core" section.
3. **infra-tooling SKILL.md** — frontmatter `status: skeleton → full` (arch-test +6 trigger) + append full Block Forge section with all 6 REQUIRED_SECTIONS; also adds top-level `Blast Radius` + `Recipes` for Layout Maker content to guarantee arch-test green.
4. **BLOCK-ARCHITECTURE-V2.md** — append one `> Dev tool update 2026-04-23 (WP-026):` line after line 8, mirroring the WP-024/WP-025 pattern.
5. **tools/block-forge/README.md** — NEW FILE, ~120 lines: purpose, quick-start, what-it-does / doesn't, install dance, file layout, save safety contract, next WPs.
6. **tools/block-forge/PARITY.md** — append 2 sections (Discipline Confirmation + Cross-contract test layers) at end; preserve Phase 2 Contract section verbatim.
7. **WP-026 header** — `Status: PLANNING → ✅ DONE`; `Completed: — → 2026-04-23`.

---

## Ambiguities for Brain to rule

1. **SKILL.md structural strategy (1.3).** Two options for satisfying the REQUIRED_SECTIONS arch-test:
   - **(a) Safe/heavy:** add top-level `## Blast Radius` and `## Recipes` for Layout Maker content + nested Block Forge subsections. Proposed by default.
   - **(b) Minimal:** only nested Block Forge subsections; assumes arch-test scans nested headings. Saves ~12 lines but risks red arch-test.
   
   If Brain prefers (b), strip the two top-level sections from section 1.3's proposed content before I execute.

2. **BRIEF.md sprint row wording.** The proposed line matches WP-025's row style (trailing `; unblocks …; ADR-025`). Brain may prefer a shorter version. If so, rule on exact text.

3. **`chore(logs)` commit scope.** Proposal commits `phase-5-proposal.md` alone (plus the untracked `phase-5-task.md`). Brain may prefer to split task-file commit from proposal-file commit for audit clarity — default is single commit.

4. **Proposal file itself.** I escaped triple-backtick fences inside section 1.5 (README proposal) with backslashes so this proposal file is valid markdown. On execute, the escapes will be stripped. Brain can sanity-check this is what they expect.

---

STOP — awaiting Brain approval
