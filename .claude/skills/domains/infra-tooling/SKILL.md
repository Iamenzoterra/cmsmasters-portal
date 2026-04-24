---
domain: infra-tooling
description: "Monorepo config, context docs, workplans, dev tools. Non-code meta domain."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `.context/BRIEF.md` — project overview, read FIRST for any task
2. `nx.json` — Nx monorepo configuration
3. `CLAUDE.md` — agent entry point, design system rules, token conventions

## Public API

(none — meta domain, no code exports)

## Invariants

- **Layout Maker yaml supports `nested-slots: string[]` per slot.** Validator enforces: (1) all referenced children must be declared in `slots`, (2) no slot nested under >1 parent, (3) no cycles (reports full path: `a -> b -> c -> a`). (WP-020)
- **html-generator emits nested `<div data-slot="child"></div>` inside the parent tag**, zero whitespace between tags (required for `resolveSlots` regex compatibility in portal). (WP-020)
- **css-generator skips `.slot-inner` rules for container slots** (they have no `.slot-inner` — they contain other `data-slot` elements). Container outer rules (min-height, flex, background) are preserved. (WP-020)
- **css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule.** Exposes each leaf slot's inline width to block CSS `@container slot (max-width: …)` queries. Container slots correctly skip — they hold nested `<div data-slot="child">`, not `.slot-inner`, so the selector never matches them. Contract test in `css-generator.test.ts` asserts both the emission and the container-slot exclusion. (WP-024 / ADR-025)

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

## Tweaks + Variants authoring (WP-028, ADR-025 Layer 2 + Layer 4)

### Start Here (WP-028)
1. `tools/block-forge/src/App.tsx` handleSave L256-311 — save orchestration post-OQ5 (composeTweakedCss BEFORE applySuggestions)
2. `tools/block-forge/src/lib/session.ts` — session reducer: `tweaks`, `variants`, `history`
3. `tools/block-forge/src/components/VariantsDrawer.tsx` — variant CRUD + VariantEditor (tabbed UI)
4. `tools/block-forge/PARITY.md` §Dirty-state contract — authoritative cross-surface dirty signal enumeration

### Invariants (WP-028)
- **`composeTweakedCss` runs in BOTH render-time memo (App.tsx L149) AND handleSave (L271-281).** Pre-Phase-6 handleSave used raw `block.css` and silently dropped tweaks on save (OQ5). Ruling MM fix: compose first, then applySuggestions. Regression pin in `integration.test.tsx` asserts `@container` chunk in saved css.
- **Session reducer shape:** `{ pending, rejected, history, backedUp, lastSavedAt, tweaks: Tweak[], variants: BlockVariants }`. `isDirty(session)` returns true if any of: pending/rejected non-empty, tweaks non-empty, variants mutated from baseline, history carries variant-* or variant-update actions.
- **Variants save emits `null` on empty.** `handleSave` payload: `variants: hasVariants ? session.variants : null`. `null` sentinel (Ruling LL) preserves JSON.stringify key for disk/DB parity with Studio's PUT payload.
- **Path B re-converge (Phase 3.5):** `composeSrcDoc` single-wraps (`.slot-inner` only); `renderForPreview` emits pre-wrapped `<div data-block-shell="{slug}">` via engine `wrapBlockHtml`. Both surfaces structurally identical iframe DOM. Future `composeSrcDoc` edits MUST NOT re-introduce inner wrap.
- **VariantEditor mini-preview iframe uses reserved slug `'variant-preview'`** — TweakPanel listener filters by `currentSlug`, so cross-iframe element-click postMessages from variant preview are silently dropped.

### Traps & Gotchas (WP-028)
- **Tweak-only save data-loss (OQ5 pre-fix).** Fixed at Phase 6 Commit 1 `fc8ed555`; if anyone reverts the `composedCss` step in handleSave, the OQ5 regression pin in `integration.test.tsx` fires with `@container` chunk missing assertion. Do NOT remove the pin.
- **`session.variants` vs `block.variants` on slug change.** Ruling P' seeds `session.variants` from `block.variants ?? {}` via useEffect spread (createSession stays zero-arg). Any slug-change regression causes stale variants from prior block to leak into current session.
- **`VariantsDrawer.tsx` cross-surface body discipline.** Byte-identical between surfaces modulo header + `composeSrcDoc` import. Adding logic that diverges requires extracting to shared package OR sync-edit both files in same commit.
- **Debounced update-content flush-on-unmount.** 300ms debounce on textarea → `onAction` dispatch. Empty-deps cleanup effect reading latest-values via ref guarantees close-drawer-mid-edit never drops content (Ruling BB). Do NOT convert to regular state ref — will flush stale values.

### Blast Radius (WP-028)
- **`tools/block-forge/src/App.tsx` handleSave** — OQ5 fix site. Removing composeTweakedCss step silently regresses tweak-only save. Regression pin guards: `Phase 6 — OQ5 tweak-compose-on-save regression pin` describe block.
- **`tools/block-forge/src/lib/session.ts`** — full state machine including variant actions + variant-update. 25+ tests in `session.test.ts`; new transitions require test additions.
- **`tools/block-forge/src/components/VariantsDrawer.tsx` + `VariantEditor` tabs** — byte-identical with Studio mirror. Diverging edits require cross-surface sync OR extract.
- **`packages/validators/src/block.ts` variants schema** — `nullable().optional()` (WP-028 Phase 5 OQ2 Ruling HH). Tightening to non-nullable silently breaks "delete all variants" clear-signal flow.

### Recipes (WP-028)
1. **Add a new tweak property** — extend `CLICKABLE_TAGS` in preview-assets element-click handler (both surfaces), add property to TweakPanel slider UI (both surfaces byte-identical), add PostCSS emit path in `packages/block-forge-core/src/lib/tweaks.ts` `emitTweak`. Snapshot test in core engine pins new property; integration pin in both surfaces pins @container chunk emission.
2. **Debug tweak-save regression** — run `npm -w tools/block-forge test -- integration` and check `Phase 6 — OQ5 tweak-compose-on-save regression pin` result. Pin asserts `@container slot (max-width: 480px)` in saved css + property:value chunk. If green, save path is correct; if red, composeTweakedCss step missing from handleSave.
