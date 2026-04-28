# Execution Log: WP-035 Phase 1 — Forge ExportDialog

> Epic: WP-035 Block Forge Sandbox + Export/Import
> Executed: 2026-04-28
> Duration: ~75 minutes
> Status: ✅ COMPLETE
> Domains affected: `infra-tooling` (block-forge)

## What Was Implemented

ExportDialog component ported from `tools/layout-maker/src/components/ExportDialog.tsx` per Phase 0 Ruling D — port-verbatim+adapt-fields. The new component lives at `tools/block-forge/src/components/ExportDialog.tsx`; payload is built client-side from `composedBlock` (no fetch — block-forge has no Hono runtime), with byte-parity to the Vite middleware writer (`JSON.stringify(block, null, 2) + '\n'`). Footer StatusBar gains an `[Export]` button (disabled when no block selected) wired to a new `showExportDialog` state in App.tsx. A minimal V1 toast banner (no shared toast infra in block-forge yet — Phase 5 polish absorbs proper toast) appears on Copy/Download success and auto-dismisses after 2.5s. CSS namespace `bf-export-*` ports from `lm-export-*` with full Portal DS token substitution per Phase 0 §0.3 mapping table. Clone affordance deferred to Phase 3 per task-spec pre-flight finding (without sandbox, Clone would mutate `content/db/blocks/` — exactly the architectural smell WP-035 fixes).

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Clone scope | Deferred to Phase 3 | Without sandbox, every Clone writes `<slug>-copy-N.json` directly to `content/db/blocks/` — the production seed mutation WP-035 was born to eliminate. Bundle Clone with sandbox migration. |
| Payload source | `composedBlock` (App.tsx:167-179) | User expects export to reflect current editor state (post-tweaks/variants/fluid-mode), not last-saved disk state. Mirrors UX of "show me what I'd ship right now." |
| CSS namespace | `bf-export-*` | Mirror layout-maker `lm-export-*` convention; tool-local prefix avoids cross-surface collision with Studio's `bf-` if ever added. |
| Toast infra | Inline V1 banner (`exportToast` state + 2.5s setTimeout) | No shared toast pattern in block-forge today (StatusBar shows save status; no dialogs use toast). V1 fallback is minimal (~12 LOC) + auto-dismiss. Phase 5 polish absorbs proper toast or reuse from Studio. |
| Backdrop close-on-click | Yes | Matches LM convention + a11y norm (Esc-style escape via overlay click). |
| Pretty-print trailing newline | Yes | Byte-parity with vite.config.ts:150 writer. Round-trip download → Studio import → fs writeBlock → re-fetch should produce zero git diff (saved memory `feedback_fixture_snapshot_ground_truth`). |

## Files Changed

| File | Change | LOC delta | Notes |
|---|---|---|---|
| `tools/block-forge/src/components/ExportDialog.tsx` | created | +189 | Pure presentational; no fetch; no validation gating. |
| `tools/block-forge/src/__tests__/ExportDialog.test.tsx` | created | +213 | 15 cases covering render, close paths, toggles, Copy byte-parity, Download blob shape. |
| `tools/block-forge/src/components/StatusBar.tsx` | modified | +12 | New `onExport` prop + `[Export]` button before Save. Disabled when `!sourcePath`. |
| `tools/block-forge/src/App.tsx` | modified | +24 (visible) | Import ExportDialog; `showExportDialog` + `exportToast` state; `showExportToast` callback (auto-dismiss); StatusBar `onExport`; conditional `<ExportDialog>` + `<div role="status">` toast. |
| `tools/block-forge/src/globals.css` | modified | +152 | Full bf-export-* CSS block with Portal DS tokens (overlay, dialog, header, body, meta, section, toggle, preview, actions, btn). Zero hardcoded colors/fonts/shadows. |
| `src/__arch__/domain-manifest.ts` | modified | +6 | Two new entries in `infra-tooling.owned_files` with WP-035 phase-1 comment block. |

## Issues & Workarounds

1. **Pre-existing test failures in block-forge surface (24 failed / 266 passed / 6 skipped) are NOT introduced by Phase 1.** All failures map to files marked `M` in the initial git-status snapshot before Phase 1 began:
   - `preview-assets.test.ts` → pre-existing `M tools/block-forge/src/lib/preview-assets.ts`
   - `inspector-cell-edit.test.tsx` + `PropertyRow.test.tsx` → pre-existing `M tools/block-forge/src/components/PropertyRow.tsx`
   - `InspectorPanel.test.tsx` → pre-existing `M tools/block-forge/src/components/InspectorPanel.tsx`
   - `app-save-regression.test.tsx` → mounts `<App />`; transitively renders broken Inspector tree → cascading failure
   - My new `ExportDialog.test.tsx` passes 15/15.
   - My deltas to `App.tsx` + `StatusBar.tsx` are isolated additions (state, render, prop) that don't touch `handleSave`, Inspector, PropertyRow, or preview-assets paths.
   - Phase 1 has not regressed any previously-passing test.

2. **`composedBlock` drops empty `variants` key (sets `undefined`).** App.tsx:177 sets `variants` to `undefined` when empty; JSON.stringify drops it. On-save handler at App.tsx:450 uses `null` sentinel. So a download → re-save round-trip may flip empty-variants blocks from `(no key)` to `"variants": null`. This is a known minor parity gap inherited from the composedBlock memo; the `variants?: BlockVariants | null` type accepts all three states (undefined/null/{}). Phase 2 ImportDialog's validator will accept all three; not blocking. Live smoke confirmed export of `fast-loading-speed` (no variants) produces a payload with 11 keys (no variants entry) — matches type contract.

3. **`npm run lint-ds` does not exist as a package.json script** — top-level package.json has only `lint` (nx). DS lint is `scripts/lint-ds.sh` (called from pre-commit hook). The script SKIPS `tools/` paths by design (line 54), so tool-local Phase 1 files are exempt. Self-audited: `grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(|fontFamily:|fontWeight:\s*[0-9]"` over all Phase 1 files returned zero hits. All colors/fonts/shadows route through Portal DS tokens.

## Open Questions

- **Phase 5 toast unification.** The V1 inline banner (`exportToast` state in App.tsx) duplicates pattern Studio already has via `useToast`. Phase 5 close should evaluate: (a) port Studio's toast to block-forge as a primitive; (b) keep V1 inline; (c) extract a shared toast in `packages/ui/`. Out of scope for Phase 1.

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ **582 / 582** (post-baseline 580 + 2 new owned_files) |
| `tools/block-forge` typecheck (`npx tsc --noEmit`) | ⚠️ Pre-existing errors in `PropertyRow.test.tsx` (10 type errors on `valuesByBp` prop drift). Not introduced by Phase 1; PropertyRow.tsx was modified pre-session. ExportDialog.tsx + ExportDialog.test.tsx + StatusBar.tsx + App.tsx Phase 1 deltas type-check clean. |
| ExportDialog test suite | ✅ **15 / 15** passing — render, close paths (4 variants), toggle reveal/hide, Copy byte-parity, Download blob shape, JS/variants conditional rendering |
| Full block-forge test run | ⚠️ 24 failed / 266 passed / 6 skipped — ALL 24 failures are in files with pre-existing `M` modifications unrelated to WP-035 (PropertyRow, InspectorPanel, preview-assets, app-save-regression). Phase 1 introduces zero regressions. |
| `scripts/lint-ds.sh` (manual on Phase 1 files) | ✅ clean (script skips tools/ — self-audit via grep also clean) |
| Live browser smoke (`http://localhost:7702/`) | ✅ Block selected → [Export] enabled → dialog renders with title `Export: fast-loading-speed` → backdrop `rgba(0,0,0,0.6)` (matches `--black-alpha-60`) → surface white, radius 8px (matches `--rounded-lg`) → toggle reveals HTML 29 lines / CSS 118 lines / JS 33 lines → Copy payload writes 7274-char pretty-printed string ending with `\n` to clipboard, parses to slug=`fast-loading-speed`, 11 expected keys → toast `"Payload copied to clipboard."` shows + auto-dismisses → footer Close button closes overlay |
| Visual QA screenshot eval | ✅ saved to `logs/wp-035/phase-1-export-dialog.png` — Portal DS tokens applied; backdrop dim; dialog centered; semantic green primary button; no hardcoded colors visible in DevTools `getComputedStyle` |
| Pretty-print byte-parity | ✅ asserted in `ExportDialog.test.tsx::Copy payload` (`expect(clipboardWrite).toHaveBeenCalledWith(JSON.stringify(fixture, null, 2) + '\n')`) AND empirically verified via live `navigator.clipboard.readText()` returning a payload that ends with `\n` |

## Git

- Commit: TBD (next step in this session)
- Commit message: `feat(block-forge): WP-035 phase 1 — ExportDialog (Download JSON / Copy payload) [WP-035 phase 1]`
