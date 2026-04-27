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
- **Layout Maker Inspector is not the slot-topology host.** `SlotStructurePanel` in the left sidebar owns slot rows, slot selection, row visibility toggles, and `Add slot`; do not move those controls back into Inspector. (WP-032)
- **Canvas slot chrome owns spatial selected-sidebar visibility.** The Phase 2 eye action toggles sidebar visibility without re-selecting the slot, and hidden sidebars surface through the existing hidden badge path. (WP-032)
- **Drawer trigger fields are rare config.** Sidebar trigger label/icon/color render as an Inspector summary plus `DrawerTriggerDialog`, not three inline `Slot Role` rows. (WP-032)
- **`inspector-capabilities.ts` is the source of truth for Inspector visibility/capability gates.** UI moves must preserve that dispatcher rather than forking ad hoc field checks. (WP-032)
- **WP-031 shell metrics remain part of LM workbench acceptance.** Structure/Inspector changes must preserve canvas widths around `1080 / 784 / 150` at `1600 / 1024 / 390` viewports. (WP-031/WP-032)

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

## Responsive Tokens Editor — WP-030 (ADR-025 Layer 1)

### Start Here (responsive-tokens-editor)
1. `tools/responsive-tokens-editor/README.md` — purpose + how to run (if not present, see Recipes below)
2. `tools/responsive-tokens-editor/PARITY.md` — save-flow contract + cascade-override pattern + cross-surface PARITY trio
3. `tools/responsive-tokens-editor/src/App.tsx` — orchestrator (config state + save flow + WCAG override gate)
4. `tools/responsive-tokens-editor/src/lib/generator.ts` — fluid clamp generator (utopia-core wrapper); snapshot baseline at `__tests__/generator.test.ts.snap`
5. `tools/responsive-tokens-editor/src/lib/config-io.ts` — fetch wire-up to Vite middleware
6. `tools/responsive-tokens-editor/vite.config.ts` — `responsiveConfigApiPlugin` (mirrors block-forge `blocksApiPlugin`)

### Public API (responsive-tokens-editor)
(none — runnable dev surface, consumes `utopia-core@1.6.0` + `@cmsmasters/ui` types only; outputs to repo via fs)

### Invariants (responsive-tokens-editor)
- **Port 7703** (strictPort) — sibling of LM `:7700/:7701`, block-forge `:7702`, studio-mockups `:7777`.
- **Two-file save contract:** every Save writes BOTH `packages/ui/src/theme/responsive-config.json` (SOT) AND `packages/ui/src/theme/tokens.responsive.css` (cascade-override, machine-generated). Never one without the other.
- **Save-safety contract (6 rules; mirrors block-forge):** body validated server-side / first-save-per-session `.bak` (client-owned `_firstSaveDone` flag) / two fixed paths only / no deletes / server stateless / two-write atomicity trade-off (JSON first, then CSS — V1 acceptable; PF.40).
- **Snapshot stability via save-time prefix (PF.41 / R.3 invariant from P6):** generator.ts emits its own `/* AUTO-GENERATED */` header (Phase 2 baseline); save-time wrapper in `config-io.ts` PREPENDS a single-line `/* Saved by tools/responsive-tokens-editor on ${ISO} ... */` comment. Generator output stays byte-stable; snapshot test does NOT need re-accept on save flow changes.
- **Cascade-override pattern:** `tokens.css` (Figma-synced static) → `tokens.responsive.css` (machine-generated `clamp()` overrides on same custom-property names) → cascade resolves to fluid behavior. Container widths use `:root + 2 @media` discrete pattern (NOT fluid clamp; per WP §Container widths sub-editor).
- **RTL-safe via `vi` (viewport-inline) units** in all clamp expressions — generator emits `1.234vi` not `1.234vw` so right-to-left languages get correct horizontal scaling.
- **Conservative V1 defaults preserve desktop static** (Phase 0 ruling 1) — clamps resolve to `maxPx` at editor `maxViewport`. Existing blocks render identically on desktop post-WP-030.
- **WCAG 1.4.4 strictness** (Phase 0 esc.c HELD): each fluid token must have `maxPx / minPx ≤ 2.5`. Violations surface inline banner + global header banner. Save blocked unless explicit "Save anyway" override toggle.

### Traps & Gotchas (responsive-tokens-editor)
- **NPM workspace nit (carry from block-forge):** `tools/responsive-tokens-editor/` is NOT an npm workspace (root `package.json` `workspaces` covers `apps/*`, `packages/*`, `tools/layout-maker` only). Use `cd tools/responsive-tokens-editor && npm <cmd>`, NOT `npm -w tools/responsive-tokens-editor <cmd>` (fails with "No workspaces found").
- **Install dance for workspace `*` deps:** if any `@cmsmasters/*` deps appear in `package.json` over time, the same workaround as block-forge applies — temporarily comment out the `@cmsmasters/*` lines, `npm install`, restore.
- **Vitest `css: true` required** (saved memory `feedback_vitest_css_raw`) — preserved at `vite.config.ts:195`. If a future `?raw` import lands and tests assert on content, the flag is mandatory; otherwise assertions silently run on empty strings.
- **Generator snapshot is ground truth (saved memory `feedback_fixture_snapshot_ground_truth`):** filenames in `__tests__/` are aspirational; cross-ref `generator.test.ts.snap` before adding new assertions. Snapshot pins 22 vi entries + 0 vw + 2 @media + 3 --container-max-w.
- **Direct edits to `tokens.responsive.css` are overwritten on next Save.** Authors must edit via the editor UI; `tokens.responsive.css` is NOT a hand-maintained file post-WP-030 (was at WP-024 baseline).
- **Two-write atomicity trade-off (PF.40):** if CSS write fails after JSON success, JSON is committed but CSS stale. Next save retries both (idempotent). V1 acceptable; documented in `tools/responsive-tokens-editor/PARITY.md` Save-safety §6.

### Blast Radius (responsive-tokens-editor)
- **`vite.config.ts` `responsiveConfigApiPlugin`** — breaks the fs bridge. POST handler changes need matching `config-io.ts` update + `__tests__/config-io.test.ts` update.
- **`src/lib/generator.ts`** — affects all 22 fluid token clamp expressions + 3 container blocks. Snapshot at `__tests__/generator.test.ts.snap` pins output; any change requires snapshot re-accept (rare — generator should be stable).
- **`src/lib/config-io.ts`** — affects save flow timestamp prefix (PF.41) + session flag (`_firstSaveDone`). Test file mocks fetch; signature drift surfaces as TS compile error in test.
- **`packages/ui/src/theme/responsive-config.json` schema** breaking changes — affects load on next editor start; `defaults.ts::conservativeDefaults` is the fallback. Schema bump = bump `version` field (not yet implemented; future need).
- **Cross-surface activation paths:**
  - `apps/portal/app/globals.css:3` (cascade @import) — auto-resolves new content
  - `tools/block-forge/src/globals.css:2` (cascade @import; WP-030 P6 BAKE)
  - `tools/block-forge/src/lib/preview-assets.ts:14` (`?raw` import)
  - `apps/studio/src/pages/block-editor/responsive/preview-assets.ts:19` (`?raw` import)
  All auto-propagate; manual edits only on `@layer` order / file path / sibling-file structural changes.

### Recipes (responsive-tokens-editor)
1. **Run dev:** `cd tools/responsive-tokens-editor && npm run dev`. Opens `:7703`. (Root alias `npm run responsive-tokens-editor` not yet wired — polish queue.)
2. **Edit a fluid token:** open `:7703` → Token Preview Grid → click Override on the row → enter minPx/maxPx + reason → Save. Toast confirms. Run `git diff packages/ui/src/theme/responsive-config.json` to see what changed; commit both files together.
3. **Add a Type Scale step:** (V1+ — currently read-only). Requires editing `stepMap` in JSON directly OR future "Edit-multipliers toggle" (polish queue).
4. **Debug Save failing:** DevTools → Network → POST `/api/save-config` → check status + response body (`{ ok: true, savedAt, backupCreated }`). 400 = body validation; 500 = fs error. Check disk for `.bak` siblings.
5. **Restore from `.bak`:** `cp packages/ui/src/theme/tokens.responsive.css.bak packages/ui/src/theme/tokens.responsive.css` + `cp packages/ui/src/theme/responsive-config.json.bak packages/ui/src/theme/responsive-config.json`. Editor reads on next page load.
6. **Verify cross-surface activation:** boot block-forge `:7702` AND Portal `:3100` in addition to `:7703`. Edit a token + Save in :7703 → refresh :7702 (preview iframes pick up via `?raw` HMR) → refresh :3100 (cascade resolves new bytes). DOM-level proof via DevTools `getComputedStyle(document.documentElement).getPropertyValue('--h1-font-size')`.

### Sibling cross-references
- `tools/block-forge/PARITY.md` §"WP-030 cross-surface PARITY (Phase 6)" — block-forge consumption contract
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §"WP-030 cross-surface PARITY (Phase 6)" — Studio consumption contract
- `.context/CONVENTIONS.md` §"Responsive tokens authoring (WP-030, ADR-025 Layer 1)" — author-facing convention rules

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

## Render-level regression pins (WP-029, block-forge)

### Start Here (WP-029)
1. `tools/block-forge/src/__tests__/app-save-regression.test.tsx` — 4 active
   `<App />` mount scenarios + 1 `test.skip` drift detector (canonical
   reference for the pattern)
2. `tools/block-forge/src/__tests__/integration.test.tsx` HISTORICAL NOTE block
   above the Phase 5 describe — 5 archived harness-mirror pins as `it.skip(...)`
3. `logs/wp-029/phase-2-drift-experiment.md` — empirical proof the pins fire
   under production drift

### Invariants (WP-029)
- **Mounts production `<App />`, mocks the module boundary.**
  `vi.mock('../lib/api-client', () => ({ listBlocks: vi.fn(...), getBlock: vi.fn(...),
  saveBlock: vi.fn(...) }))` + `import * as apiClient` + typed `vi.mocked()`
  access. apiClient signature drift surfaces as a TypeScript compile error.
- **jsdom polyfills are file-level.** ResizeObserver mock +
  `setPointerCapture` / `releasePointerCapture` shims at the top of the test
  file (mirroring `TweakPanel.test.tsx` L11–25 + `VariantsDrawer.test.tsx`
  L7–28). Never global — keeps cross-file isolation.
- **Drift detector lives as `test.skip(...)`** with an inverted assertion
  (`expect(saveBlock).not.toHaveBeenCalled()`) + an inline 7-step activation
  recipe in the test body comment. AC-gate `git diff --quiet` before commit
  guards the un-skip leak. Empirically validated under drift mutation in
  Phase 2 (5 live pins fail loudly; drift detector flips to passing).
- **HISTORICAL NOTE convention prefers `it.skip(...)` over body-comment.** When
  archiving harness-mirror pins, convert
  `it('historical/baseline: …', () => { /* original assertions */ })` →
  `it.skip('historical/baseline: …', () => { /* … */ })`. Skip count stays
  honest in Vitest output (no-op `it()` shells silently count as "passed",
  per WP-029 Phase 2 honest-gap closure B).
- **Production code is FROZEN during pin authoring.** Phase 2 added tests
  only; `tools/block-forge/src/App.tsx::handleSave` was untouched across all
  three Phase 2 commits (`c842a9a3` → `ecbec5db` → `7c6326f1`). Pin authors
  MUST NOT modify production code in the same change — prevents
  pin-and-mutation entanglement.

### Traps & Gotchas (WP-029)
- **`@testing-library/user-event` is NOT installed in `tools/block-forge`.**
  Existing tests use `fireEvent` + `act` wrappers; new tests follow the same
  pattern. Add a single `await new Promise(r => setTimeout(r, 350))` to flush
  the App's 300ms tweak debounce when needed (`App.tsx` L195–201).
- **Compose-on-save invariant inheritance.** The OQ5 invariant (production
  `handleSave` calls `composeTweakedCss` BEFORE `applySuggestions`) is
  pinned via the tweak-only scenario's `@container slot (max-width: 768px)`
  substring assertion — that substring exists in the payload only because
  production composes tweaks before saving. Brain ruling C-iii (Phase 2
  follow-up) collapsed harness-era sc 1+5 into one production path; do NOT
  re-introduce a separate "tweak-compose" scenario unless the OQ5 invariant
  surfaces as a new bug class.
- **Don't `vi.spyOn` internal helpers** (e.g. `composeTweakedCss`) to prove
  a code path was taken. Prefer asserting the observable artefact (CSS
  substring in saved payload). Spying on internals is the same harness-mirror
  trap render-level pins exist to escape (Brain ruling C-ii rejection).

### Blast Radius (WP-029)
- **Changing `tools/block-forge/src/App.tsx::handleSave`** — fires the
  app-save-regression scenarios (5 fail under drift; 4 active + 1 skip
  detector activates). Drift mutation experiment in `logs/wp-029/phase-2-drift-experiment.md`
  is the reproducible proof.
- **Renaming exported names from `tools/block-forge/src/lib/api-client.ts`**
  — surfaces as TypeScript compile error in `app-save-regression.test.tsx`
  via `vi.mocked()` typing.
- **Modifying jsdom polyfill scope** (e.g. lifting to a global setup file) —
  changes the cross-file isolation contract. `tools/block-forge` has NO
  `vitest.setup.ts`; introducing one cascades across all 7 test files in
  the package.

### Recipes (WP-029)
1. **Add a new render-level pin** — copy the scenario shape from
   `app-save-regression.test.tsx::test('1. tweak-only: …', ...)`. Helpers:
   `mountAppAndSelectBlock`, `dispatchElementClickAndSwitchBp`,
   `clickHideTweak`, `openVariantsDrawerAndFork`, `clickSave`,
   `lastSaveBlockArg`. Assert against `lastSaveBlockArg()` payload shape.
2. **Reproduce the drift detector experiment** — follow the 7-step recipe in
   the `test.skip` body. Always end with the revert step + verify
   `git diff -- tools/block-forge/src/App.tsx | wc -l` returns 0 before
   committing anything (AC gate).
3. **Archive a Phase 5/6-style harness-mirror pin** — convert
   `it('historical/baseline: …', () => { /* original assertions */ })` →
   `it.skip(...)`. Preserve the original assertions verbatim inside the
   `/* */` block; the empty function body keeps Vitest discovery happy.
   Update the HISTORICAL NOTE block at the top of the describe.

## Inspector (WP-033, ADR-025 Layer 2)

### Start Here (Inspector / block-forge)
1. `tools/block-forge/PARITY.md` §Inspector — hover/pin postMessage protocol + cross-surface contract
2. `tools/block-forge/src/components/Inspector.tsx` — orchestrator (hover/pin lifecycle, useInspectorPerBpValues mount)
3. `tools/block-forge/src/hooks/useInspectorPerBpValues.ts` — 3 hidden iframe per-BP cell sourcing (Option A)
4. `tools/block-forge/src/hooks/useChipDetection.ts` — PostCSS cascade walk + linear-interp token resolution (Option B-subset)
5. `tools/block-forge/src/lib/preview-assets.ts` — Inspector IIFE block (hover/unhover/request-pin/pin-applied postMessage runtime)

### Invariants (Inspector / block-forge)
- **Hover/pin protocol** via `block-forge:inspector-{hover,unhover,request-pin,pin-applied}` postMessage types. rAF throttle on hover; cleanup on iframe unmount.
- **Selector strategy**: id > stable-class > tag.class > nth-of-type fallback (depth 5; UTILITY_PREFIXES filtered). Matches Studio mirror byte-identically (Phase 4 Ruling 1 REIMPLEMENT).
- **Probe iframes (3 hidden)** MUST run html through `renderForPreview` BEFORE `composeSrcDoc` (matches visible iframe DOM with `<div data-block-shell="{slug}">` wrap). Phase 3 §3.3 fix verified by live smoke; same wrap discipline mirrored to Studio Phase 4.
- **Module-scoped cache** by `(selector, cssHash)` via djb2 hash; cleanup on unmount + pin clear.
- **emitTweak `{bp: 0}` = top-level rule** (no @container wrap); empirical pin in `slider-bug-regression.test.ts` guards the contract.
- **Single pin per slug** — pinning a new element auto-clears the prior pin (DevTools mental model). ↗ button on inactive cells switches BP without re-pinning.
- **Active cell editable on focus**; blur/Enter commit, Esc cancel. `em` validation reject (snaps back). `rem|px|%|var(...)|keyword` all pass.

### Traps & Gotchas (Inspector / block-forge)
- **`<input>` blur events don't bubble in browser; React listens to `focusout`.** Vitest tests use `fireEvent.blur(...)` (testing-library); native code paths must dispatch `focusout` not `blur`.
- **Chip-apply emits at bp:0 but pre-existing @container rules may override** (Phase 3 Issue #3). Tooltip pin (Phase 4 Ruling 2) mitigates by surfacing the caveat: "Sets {M}/{T}/{D}px at M/T/D · Note: existing breakpoint overrides may still apply." See WP-034 stub for follow-up.
- **TokenChip `responsive-config.json` import uses `@cmsmasters/ui/responsive-config.json`** package export (post-Phase 4 Ruling 5 migration). Pre-Phase 4 used the relative-path workaround documented in Phase 3 §3.3; that path is now obsolete.
- **Inspector IIFE block in `preview-assets.ts`** is byte-identical to Studio's mirror (Phase 4 §4.6 Issue #2). Editing one without the other breaks cross-surface PARITY.

### Blast Radius (Inspector / block-forge)
- **Hover/pin protocol changes** affect both `tools/block-forge` AND `apps/studio/.../inspector` simultaneously — coordinated edit required (see studio-blocks SKILL §Inspector cross-surface mirror).
- **emitTweak engine changes** ripple to TweakPanel + Inspector + Studio mirror simultaneously (4 surfaces).
- **`responsive-config.json` schema changes** propagate to Inspector chip detection in both surfaces; `@cmsmasters/ui/responsive-config.json` export is the contract.
- **Inspector IIFE byte-identical contract**: see traps. PARITY trio (`tools/block-forge/PARITY.md` + `apps/studio/.../PARITY.md` + `tools/responsive-tokens-editor/PARITY.md`) is the audit trail.

### Recipes (Inspector / block-forge)
1. **Run Inspector live smoke at block-forge:** `npm run block-forge` → `:7702` → load fast-loading-speed → click pin on `.gauge-score` → cell-edit padding 60→48 at active BP → blur → iframe re-renders. Verify pin persists across ↗ BP switches.
2. **Add a new chip-detectable token category** — extend `responsive-config.json` `categories[]` (in responsive-tokens-editor flow) → `useChipDetection.ts` consumes via the package import. Mirror to Studio identically.
3. **Debug Inspector probe iframe staleness** — DevTools → Network → check 3 hidden iframe srcdocs at `:7702` after pin → verify `data-block-shell="{slug}"` wrap present. If missing, `renderForPreview` step was skipped (Phase 3 §3.3 regression).
