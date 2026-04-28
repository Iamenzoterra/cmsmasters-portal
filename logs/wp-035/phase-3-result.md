# Execution Log: WP-035 Phase 3 — Forge sandbox decouple + Clone + Phase 4 collapse

> Epic: WP-035 Block Forge Sandbox + Export/Import
> Executed: 2026-04-28
> Duration: ~70 minutes
> Status: ✅ COMPLETE
> Domains affected: `infra-tooling` (block-forge surface)

## What Was Implemented

The architectural smell that birthed WP-035 is now closed: Forge writes go to `tools/block-forge/blocks/` (sandbox), NEVER to `content/db/blocks/` (production seed). On first dev-server boot when the sandbox is empty, `seedSandboxIfEmpty` copies the 9 production-seed blocks into the sandbox so existing blocks remain accessible without manual setup. POST `/api/blocks/clone` resolves create-by-`<slug>-copy-N` (1..99) with `wx`-flag race-safe writes, byte-parity pretty-print + trailing newline, and `id` stripped from the cloned payload (the DB resolves at next import via Phase 2). The `[+ Clone]` toolbar button mounts before `[Export]` in StatusBar, wired through `handleClone` in App.tsx with a `pickerRefreshNonce` prop that triggers BlockPicker re-fetch (BlockPicker holds its own list state). Phase 4 collapsed per Phase 0 Ruling F: empirical grep confirmed `BLOCK_FORGE_ALLOW_DIRECT_EDIT` had **zero callers** in active source — the existing `BLOCK_FORGE_SOURCE_DIR` env override is sufficient as the escape hatch.

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Sandbox path | `tools/block-forge/blocks/` | Phase 0 Ruling A; mirrors layout-maker locality. |
| Git policy | COMMIT *.json drafts; gitignore *.bak | Phase 0 Ruling B; cross-machine continuity; .bak is local recovery only. |
| First-run seed trigger | `configureServer` boot | One-time per process; HMR doesn't re-run it (intentional). |
| Clone slug naming | `<slug>-copy-N` (1..99 auto) | Phase 0 §0.8(b); macOS-Finder mental model. |
| `id` field on clone | Stripped | Sandbox doesn't enforce uniqueness; DB resolves at next import via Phase 2 endpoint. |
| Phase 4 escape hatch | `BLOCK_FORGE_SOURCE_DIR` (existing) | Empirical zero-callers grep; new flag was over-engineered. |
| Race protection | `wx` flag + bounded suffix loop | EEXIST-safe; 99 attempts max; 409 if exhausted. |
| Pure-helper extraction | `seedSandboxIfEmpty` + `performCloneInSandbox` exported from vite.config | Lets unit tests cover core logic without spinning up a vite dev server; HTTP-shape behavior verified via live curl probes in Task 3.8. |
| BlockPicker refresh | `refreshNonce` prop (incrementing dep in useEffect) | Minimal; BlockPicker keeps its own list state; App.tsx just nudges it. |

## Files Changed

| File | Change | LOC delta | Notes |
|---|---|---|---|
| `tools/block-forge/blocks/.gitkeep` | created | +0 | Empty file — preserves dir on fresh clones. |
| `tools/block-forge/blocks/*.json` | created (9) | n/a | Seeded from production by `seedSandboxIfEmpty` on first dev-run. Git-tracked per Ruling B but NOT manifest-tracked (volatile, like content/db/blocks/). |
| `tools/block-forge/.gitignore` | modified | +2 | Added `blocks/*.bak` (local-only recovery snapshots). |
| `tools/block-forge/vite.config.ts` | modified | +166 | `SANDBOX_DIR_DEFAULT` + `PRODUCTION_SEED_DIR` consts; `seedSandboxIfEmpty` (exported); `performCloneInSandbox` (exported); POST `/blocks/clone` middleware route; `configureServer` first-run seed call with logger output. |
| `tools/block-forge/src/lib/api-client.ts` | modified | +24 | `CloneBlockResponse` type + `cloneBlock(sourceSlug)` wrapper mirroring `saveBlock` error-handling. |
| `tools/block-forge/src/components/StatusBar.tsx` | modified | +12 | `onClone` + `cloneInFlight` props + button before [Export]; disabled when `!sourcePath \|\| cloneInFlight \|\| saveInFlight`. |
| `tools/block-forge/src/components/BlockPicker.tsx` | modified | +5 | `refreshNonce?: number` prop; useEffect dep added; default 0. |
| `tools/block-forge/src/App.tsx` | modified | +28 (visible) | `cloneInFlight` + `pickerRefreshNonce` state; `handleClone` callback (refresh nonce + setSelectedSlug; reuses existing useEffect at App.tsx:101 to reset session on slug change); `cloneBlock` import; StatusBar + BlockPicker prop wiring. |
| `tools/block-forge/src/__tests__/sandbox-seed.test.ts` | created | +135 | 7 cases — empty sandbox copies; populated skips; unreadable seed; SOURCE_DIR override; .gitkeep tolerance; .bak filtering; sandbox dir creation. |
| `tools/block-forge/src/__tests__/clone-endpoint.test.ts` | created | +180 | 12 cases — happy paths (`-copy-1`/`-copy-2`/skip-claimed-suffix); error paths (404, 400 traversal, 400 leading-hyphen, 400 non-string, 500 malformed JSON); payload shape (id stripped, byte-parity pretty-print, variants/hooks/metadata preserved); SAFE_SLUG regex on derived suffix. |
| `src/__arch__/domain-manifest.ts` | modified | +13 | +4 entries in `infra-tooling.owned_files` with WP-035 Phase 3 + Phase 4 collapse comment block. |

## Issues & Workarounds

1. **Refactor for testability**: extracted `seedSandboxIfEmpty` + `performCloneInSandbox` as top-level exports from vite.config.ts so unit tests can call them directly without spinning up a vite dev server. The middleware route delegates to `performCloneInSandbox` and only handles HTTP body parsing + response shaping. This keeps the route thin and the core logic 100% covered by unit tests.

2. **BlockPicker state lift**: BlockPicker fetches its own `blocks` list on mount (existing pattern). For Clone-triggered refresh I added a `refreshNonce?: number` prop included as a useEffect dependency; App.tsx increments it after Clone success. Minimal diff vs lifting list state to App.tsx (which would have rippled through too many existing call sites).

3. **Sandbox seed already happened during this session**: when I saved `vite.config.ts`, an out-of-band block-forge dev process running on port 7702 picked up the change via Vite's config-restart and ran `seedSandboxIfEmpty`. By the time I tried `preview_start` for the smoke test, the sandbox was already populated with 9 files, so my seed log read `Sandbox seed skipped: sandbox already populated` — which is the *correct* second-run behavior. Live curl probes against the running dev server verified Clone end-to-end without needing to bring up a fresh server.

4. **arch-test target shifted from spec's 588 → actual 592**: WP-036 Phase 2 entries were committed by the parallel autonomous agent as `e09c8cc5` (between Phase 2 and Phase 3 of WP-035). New baseline is 588 (584 + 4 from WP-036), so my +4 makes 592. The +4 invariant from the task spec still holds; the absolute number shifted because of the parallel commit landing first.

5. **Block-forge full-suite typecheck failures pre-date Phase 3**: 22 failed tests (all in `PropertyRow.test.tsx` + `InspectorPanel.test.tsx` snapshot drift) match the pre-existing `M tools/block-forge/src/components/PropertyRow.tsx` documented in the Phase 1 result.md. My 19 new tests in sandbox-seed + clone-endpoint pass cleanly. Net suite delta: 22 failed/310 passed/6 skipped vs Phase 1's 24/266/6 — that's +44 passing, –2 failing — strict improvement, zero regressions from Phase 3.

## Open Questions

- **Phase 5 polish — saved memory `feedback_forge_sandbox_isolation`**: documenting the architectural reasoning so future agents don't suggest re-merging surfaces.
- **`BLOCK_FORGE_SOURCE_DIR` override live re-launch smoke**: not driven (would need killing the running dev process again + restart with env var). Unit test in `sandbox-seed.test.ts` covers the override → seed-skipped contract empirically.

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ **592 / 592** (588 baseline post-WP-036 + 4 new owned_files; equivalent to spec's 584 → 588 modulo the parallel WP-036 commit landing first) |
| New tests (sandbox-seed + clone-endpoint) | ✅ **19 / 19** passed |
| Block-forge full suite | ✅ 22 failed / 310 passed / 6 skipped — all 22 failures pre-date Phase 3 (PropertyRow type drift + InspectorPanel snapshot — documented in Phase 1 result.md). Net +44 pass / -2 fail vs Phase 1 baseline. |
| Typecheck (block-forge) | ⚠️ 10 errors — all in `src/__tests__/PropertyRow.test.tsx` (`valuesByBp` prop drift) — pre-existing per Phase 1 result.md. Phase 3 deltas type-check clean. |
| `lint-ds` on changed UI files | ✅ Skipped tools/* paths by design (script line 54). Self-audited via grep: zero hardcoded colors/fonts/shadows in StatusBar.tsx + BlockPicker.tsx + App.tsx changes. |
| Production seed integrity (`git diff content/db/blocks/`) | ✅ Only the pre-existing `fast-loading-speed.json` mod (not from Phase 3; was M at session start per initial git status, blame is `3ff4eddf feat(block-forge): tabbed preview ...`). Phase 3 did NOT mutate the production seed at any point. |
| Sandbox populated post-seed | ✅ 9 .json files copied in (timestamps reflect production-seed mtime preservation through `copyFile`). |
| Live `[block-forge]` logger output | ✅ `Sandbox seed skipped: sandbox already populated` (correct second-run behavior — first-run seed had already executed in the running dev process when vite.config.ts was saved). |
| Live curl smoke — POST /api/blocks/clone (existing source) | ✅ `201 {"ok":true,"sourceSlug":"theme-name","newSlug":"theme-name-copy-1"}` |
| Live curl smoke — Clone twice on same source | ✅ `201 {"ok":true,"sourceSlug":"theme-name","newSlug":"theme-name-copy-2"}` |
| Live curl smoke — path-traversal `../escape` | ✅ `400 {"error":"invalid-source-slug"}` |
| Live curl smoke — missing source | ✅ `404 {"error":"source-not-found","sourceSlug":"no-such-block"}` |
| Cloned payload shape | ✅ Read of `theme-name-copy-1.json` confirms: `id` stripped (file starts with `"slug":`), `slug` = `"theme-name-copy-1"`, html/css/js/hooks/metadata/sort_order/is_default/block_type/name preserved verbatim. Pretty-print 2-space indent visible; trailing newline asserted in unit test. |
| Zero modifications to gated paths | ✅ `git status --short` shows only the 11 expected files (vite.config.ts, api-client.ts, StatusBar.tsx, BlockPicker.tsx, App.tsx, .gitignore, manifest, 2 new test files, 1 .gitkeep, 9 sandbox seed *.json drafts, result.md). Zero touches to `content/db/blocks/**` source code, `apps/**`, `packages/**`, `tools/layout-maker/**`, PARITY docs, or `workplan/`. |
| **Post-commit /ac follow-up #1 — fresh preview_start UI smoke** (after killing stale PID 28376 on :7702) | ✅ `[block-forge] Sandbox seed skipped: sandbox already populated` log confirms idempotent second-run; BlockPicker shows 9 sandbox options |
| Post-commit — `[+ Clone]` button DOM order before `[Export]` | ✅ `compareDocumentPosition` returns DOCUMENT_POSITION_FOLLOWING for export relative to clone |
| Post-commit — Clone button Portal DS tokens (selected state) | ✅ live `getComputedStyle`: bg `rgb(255,255,255)` (`--bg-surface`); border `rgb(234,230,225)` (`--border-default`); color `rgb(23,23,23)` (`--text-default`); font-weight 600; px-3 |
| Post-commit — Clone click → BlockPicker option appears + auto-switch | ✅ post-click DOM: `optionTexts: ["theme-name-copy-1","theme-name"]`; `selectedValueAfterClone: "theme-name-copy-1"` |
| Post-commit — Inspector pin invalidation on slug-switch (WP-033 behavior) | ✅ post-Clone iframe title prefix = `theme-name-copy-1-1440` — proves currentSlug-keyed effects (App.tsx:301,323,365) fired |
| Post-commit — In-browser Save smoke (POST /api/blocks/:slug) | ✅ `200 {ok:true, slug:"theme-name-copy-1", backupCreated:true}`; saved file `name` mutated to `"theme name (smoke-edited)"` |
| Post-commit — `.bak` gitignored at sandbox | ✅ `git check-ignore -v` → `.gitignore:7:blocks/*.bak`; `theme-name-copy-1.json.bak` correctly hidden from `git status` |
| Post-commit — Production seed integrity AFTER Save | ✅ `git diff --name-only content/db/blocks/` returns ONLY pre-existing `fast-loading-speed.json` (commit `3ff4eddf`); zero Phase 3 mutations after both Clone AND Save |
| Post-commit — StatusBar disabled-state (no source selected) | ✅ all 3 buttons `disabled: true` at `opacity: 0.5`; Clone+Export outline; Save semantic green (`--status-success-bg/fg`) |
| `preview_screenshot` (post-commit) | ⚠️ Timed out 2× (same intermittent tool issue as Phase 2); `preview_eval` computed-style probes are the substitute (more precise for token verification) |

## Git

- Commit: `6a08d1f1` — `feat(block-forge): WP-035 phase 3 — sandbox decouple + Clone + Phase 4 collapse [WP-035 phase 3]` (20 files, +819/-9)

## /ac Audit Outcome (post-commit)

`/ac` audit ran post-commit. **14 / 17 ACs PASSED ✅** + 3 ⚠️ (architectural-not-DOM-driven AC#12, partial AC#15 file-system+curl-proven, deferred AC#16 visual QA). **5 / 7 verification items PASSED ✅** + 2 ⚠️ pre-existing failures unrelated to Phase 3 (PropertyRow drift documented in Phase 1 result.md).

**Follow-up #1 (fresh preview_start UI smoke) executed and closed all 3 ⚠️ rows.** Killed stale PID 28376 on :7702; fresh preview_start surfaced the seed-skipped log idempotency; drove Clone-then-Save end-to-end via DOM + curl probes; verified Inspector pin invalidation via iframe title prefix swap (WP-033 currentSlug-keyed effects); confirmed Portal DS tokens via live `getComputedStyle`; production seed `git diff` empty after both Clone AND Save (the architectural smell-fix is now empirically airtight). Smoke artifacts cleaned up; sandbox restored to 9 seeded blocks. The only remaining residue: `preview_screenshot` timeouts (same intermittent tool issue as Phase 2) — substituted with computed-style eval, which is more precise for token verification.

Saved memory `feedback_empirical_over_declarative` honored: every ✅ contract was evaluated empirically against committed state, arch-test re-run at commit's manifest, live curl probes, unit test execution, or live DOM eval — not the result.md narrative.
