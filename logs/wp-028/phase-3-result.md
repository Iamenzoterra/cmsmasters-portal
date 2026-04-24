# WP-028 Phase 3 — Result Log

> Task prompt: `logs/wp-028/phase-3-task.md` (commit `c3173752` — narrowed + Phase 3.5 Path B split per Hands review)
> Phase: 3 of 7 (+ Phase 3.5 — Path B re-converge, separate task prompt `logs/wp-028/phase-3.5-task.md`)
> Goal: VariantsDrawer real UI + fork/rename/delete + session-backed CRUD on block-forge + RHF-backed CRUD on Studio; PARITY.md additive §Variant CRUD (both surfaces); Phase 3.5 boundary (`preview-assets.ts` + its test + snap + PARITY §7) untouched.

---

## Pre-flight findings (Phase 0 RECON — 13-step audit)

All findings documented before writing any code, per saved memory `feedback_preflight_recon_load_bearing.md`.

| # | Check | Result |
|---|-------|--------|
| 0 | Baseline arch-test | **499 / 0** — Δ0 target confirmed |
| 1 | Domain skills pkg-ui / infra-tooling / studio-blocks | All read; traps + invariants refreshed |
| 2 | `packages/ui/src/primitives/drawer.tsx` exports | 8 exports ready: Drawer, DrawerTrigger, DrawerClose, DrawerPortal, DrawerOverlay, DrawerContent, DrawerHeader, DrawerTitle |
| 3 | VariantsDrawer placeholder diff (both surfaces) | Byte-identical placeholder body; only JSDoc header differs |
| 4 | `composeVariants(base, [])` empty-array behavior | Returns `{slug, html, css}` — NO `variants` key (L52-54 of compose-variants.ts) |
| 5 | validator regex `/^[a-z0-9-]+$/` | Matches drawer `NAME_REGEX` — inline in drawer |
| 6 | Studio BlockFormData.variants | L84 field, L102 default `{}`, L127 `block.variants ?? {}`, L167-179 undefined-else-emit |
| 7 | block-forge BlockJson `variants` | MISSING — added in Task 3.5 |
| 8 | composeSrcDoc current double-wrap | `<div class="slot-inner"><div data-block-shell=...>...</div></div>` at L69-71; Phase 3.5 territory |
| 9 | preview-assets.test.ts `data-block-shell` assertions | 5 matches at L23, 29, 36, 38, 86 — **UNTOUCHED this phase** |
| 10 | session.ts `SessionAction` discriminant | `accept \| reject \| tweak` — extended with 3 variant types |
| 11 | Studio `session-state.ts` mirror | `accept \| reject` only (no tweak, no variant) — Ruling P: Studio uses RHF directly |
| 12 | `window.confirm` usage in tests | Not in block-forge tests yet; need `vi.spyOn(window, 'confirm')` for Phase 3 |
| 13 | `createSession()` call sites | All zero-arg (App.tsx L48/70/75; 9 test call sites) → **Ruling P' useEffect seed confirmed** |

**Key gotchas anticipated:**
- `composeVariants` empty-variants shape: downstream must treat `block.variants ?? {}` as "no variants" (both surfaces already do so).
- Radix Dialog ESC/backdrop: rely only on `onOpenChange` — no separate keydown wiring.
- Tailwind v4 `font-[number:var(--font-weight-medium)]` arbitrary-value hint — valid per v4 docs.
- jsdom Radix polyfills: ResizeObserver + hasPointerCapture/setPointerCapture/releasePointerCapture/scrollIntoView — inline at test file top.

---

## Brain Rulings Applied

| Ruling | Scope | How applied |
|--------|-------|-------------|
| L — Drawer consumption | Import path | `@cmsmasters/ui` barrel gained 1 re-export block (Drawer + 7 sub-components); primitive zero-touch; linear transitions preserved (inherits B) |
| M — Name validation | Fork + rename | Regex `/^[a-z0-9-]+$/` + 2-50 char + unique check. Convention `sm\|md\|lg\|4\d\d\|6\d\d\|7\d\d` → warning not error. Submit allowed for non-convention names; engine emits `composeVariants: unknown variant name` at render |
| N — Fork semantics | `onAction({kind:'create', html, css})` | Studio: parent splits `form.getValues('code')` via `splitCode()` → props `baseHtmlForFork/baseCssForFork`. block-forge: parent passes `block.html/block.css` directly. Drawer itself does not re-read form or block |
| O — Delete confirm | Native `window.confirm()` | No AlertDialog; tests mock via `vi.spyOn(window, 'confirm').mockReturnValue(...)` |
| P — Variant undo | block-forge session.ts | `history` carries `variant-create\|variant-rename\|variant-delete` entries; `undo()` reverses each. `delete` stores `prev: BlockVariant` for lossless restore. Studio side: no session undo — RHF `formState.isDirty` + `reset()` are the canonical dirty+undo signals |
| P' — createSession zero-arg (useEffect seed) | block-forge App.tsx | `createSession()` signature unchanged; variant seed happens via `setSession((s) => ({...s, variants: b.variants ?? {}}))` inside the block-fetch effect. 9 existing test call sites stay zero-arg |
| Q — Studio RHF integration | `dispatchVariantToForm(form, action)` | Exported from `ResponsiveTab.tsx`; mirrors Phase 2 `dispatchTweakToForm`. Reads `form.getValues('variants')` LIVE at dispatch time (OQ4 invariant mirror). `form.setValue('variants', next, { shouldDirty: true })` |
| R' — Path B deferred to Phase 3.5 | Scope boundary | `preview-assets.ts` + its test + its snap + Studio PARITY §7 UNTOUCHED this phase. PreviewTriptych adds INLINE `composeVariants` call (Phase 3 interim); Phase 3.5 replaces with `renderForPreview` |
| S — Barrel edit minimal | `packages/ui/index.ts` | Single block of 8 Drawer re-exports after Phase 2 Slider line |
| T — No new files | arch-test Δ0 | All new helpers inline in existing files; `variant-helpers.test.ts` NOT created — behavioral tests inlined in `integration.test.tsx` |
| X — Lockstep REIMPLEMENT | Cross-surface metric | VariantsDrawer (+1 pair) + session.ts variants (+3 reducers; same pattern as tweaks) → Phase 3 exit projected 14-15 non-cosmetic diffs; ≤15 threshold holds |

---

## Files Modified

### New code (18 files total, all pre-registered in manifest; arch-test Δ0):

| File | Change | LOC |
|---|---|---|
| `packages/ui/index.ts` | +8 Drawer re-exports after Phase 2 Slider line | +11 / −0 |
| `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` | placeholder (24L) → real UI (282L) | full rewrite |
| `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` | +`dispatchVariantToForm` export, +VariantsDrawer mount + props | +95 / −3 |
| `apps/studio/src/pages/block-editor.tsx` | +`useMemo` import, +watchedVariants+splitForFork+handleVariantDispatch+4 props | +15 / −2 |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | §"In scope" +1 bullet; §Variant CRUD new section | +21 / −1 |
| `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx` | placeholder (33L) → 12 real tests | full rewrite |
| `apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` | regen — byte-identical to block-forge snap | regen |
| `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` | +5 `dispatchVariantToForm` OQ4 tests + 1 drawer integration test | +117 / −0 |
| `tools/block-forge/src/components/VariantsDrawer.tsx` | placeholder (24L) → real UI (282L) | full rewrite |
| `tools/block-forge/src/components/PreviewTriptych.tsx` | +useMemo +inline composeVariants call when variants non-empty | +30 / −3 |
| `tools/block-forge/src/App.tsx` | +VariantsDrawer import + 3 reducer imports + Button + drawer state + useEffect seed + handleVariantAction + composedBlock variants passthrough + save payload + trigger + mount | +55 / −5 |
| `tools/block-forge/src/types.ts` | +`variants?: BlockVariants` on BlockJson + import | +9 / −0 |
| `tools/block-forge/src/lib/session.ts` | +SessionAction variant-* types + SessionState.variants + createVariant/renameVariant/deleteVariant + undo extension + isDirty extension + clearAfterSave savedVariants param | +96 / −8 |
| `tools/block-forge/src/__tests__/session.test.ts` | +17 variant-reducer tests (createVariant 3 + renameVariant 4 + deleteVariant 2 + undo 4 + isDirty 4) | +138 / −1 |
| `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` | placeholder → 12 real tests (byte-identical body mod comment header) | full rewrite |
| `tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` | regen — byte-identical to Studio snap | regen |
| `tools/block-forge/src/__tests__/integration.test.tsx` | +3 composeVariants iframe assertions + 2 BlockJson round-trip tests | +95 / −0 |
| `tools/block-forge/PARITY.md` | §Out of scope −1 bullet; §Variant CRUD new section; §Discipline Confirmation WP-028 Phase 3 | +22 / −1 |

### Zero-touch (verified via `git diff --stat`):
- `packages/block-forge-core/**` ✅
- `src/__arch__/domain-manifest.ts` ✅
- `.claude/skills/domains/**/SKILL.md` ✅
- `workplan/WP-028-tweaks-variants-ui.md` ✅
- `packages/ui/src/primitives/{drawer,slider,button}.tsx` ✅
- `packages/validators/src/block.ts` ✅
- `tools/block-forge/vite.config.ts` ✅
- `apps/studio/src/lib/block-api.ts` ✅

### Phase 3.5 scope boundary (MUST stay untouched per Ruling R'):
- `tools/block-forge/src/lib/preview-assets.ts` ✅ empty git diff
- `tools/block-forge/src/__tests__/preview-assets.test.ts` ✅ empty git diff
- `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap` ✅ not regenerated
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §7 ✅ `grep` diff returns 0 matches for §7 content strings (only added bullets outside §7)

---

## Test Counts

| Suite | Baseline | Exit | Delta |
|---|---:|---:|---:|
| arch-test | 499 | **499** | **0** ✅ Δ0 preserved |
| Studio (full) | 77 | **92** | +15 |
| block-forge (full) | 80 | **111** | +31 |

**Studio delta breakdown:** VariantsDrawer.test.tsx placeholder 3 → real 12 (+9); integration.test.tsx +6 (5 `dispatchVariantToForm` OQ4 + 1 drawer fork integration).

**block-forge delta breakdown:** VariantsDrawer.test.tsx placeholder 3 → real 12 (+9); session.test.ts +17 (variant reducers + undo coverage + isDirty extension + clearAfterSave param); integration.test.tsx +5 (3 composeVariants iframe contract + 2 BlockJson round-trip).

Both surfaces exceeded task estimates (Studio target ~89, actual 92; block-forge target ~98, actual 111).

---

## Parity Diffs

### VariantsDrawer.tsx body — 3-line header content only

```
$ diff -U0 tools/block-forge/src/components/VariantsDrawer.tsx apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx

--- tools/block-forge/src/components/VariantsDrawer.tsx
+++ apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
@@ -13,3 +13,3 @@
- * VariantsDrawer — tools/block-forge surface. WP-028 Phase 3 real UI.
- * Fork/rename/delete with session undo; Phase 4 adds side-by-side editor.
- * Mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
+ * VariantsDrawer — Studio Responsive tab surface. WP-028 Phase 3 real UI.
+ * Fork/rename/delete through form.setValue('variants', ...) (Ruling Q).
+ * Mirror: tools/block-forge/src/components/VariantsDrawer.tsx
```

Total unified-diff lines: **9** (2 meta + 1 hunk + 3 del + 3 add). Body byte-identical from line 4 onwards ✅.

### VariantsDrawer.test.tsx.snap byte-identity

```
$ diff -u tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
         apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
    | wc -l
0
```

Snapshot byte-identical ✅ (per Phase 2a lesson: generic describes, no surface-specific tokens).

---

## PARITY.md Symmetric Edits (both files same commit — §5 discipline)

**tools/block-forge/PARITY.md:**
- §"Out of scope" — removed "Variants — composeVariants output is Phase 3+ territory" bullet (Phase 3 landed variants)
- New §"Variant CRUD (WP-028 Phase 3 — additive)" documents: session store + actions + undo + dirty + save round-trip + render-time composition (INLINE `composeVariants` interim) + Phase 3.5 follow-up scope
- New §"Discipline Confirmation (WP-028 Phase 3)" notes cross-surface byte-identical landing + §7 unchanged
- DOM hierarchy block diagram UNCHANGED (still double-wrap until Phase 3.5)
- §7 divergence UNCHANGED (Phase 3.5 territory)

**apps/studio/src/pages/block-editor/responsive/PARITY.md:**
- §"In scope (NEW vs tools/block-forge)" — +1 bullet: "Variant CRUD drawer (WP-028 Phase 3): ... §7 'deliberate divergence' remains until Phase 3.5"
- New §"Variant CRUD (WP-028 Phase 3 — additive)" documents: RHF store + `dispatchVariantToForm` OQ4 mirror + fork base derivation + convention warning + delete confirm + Phase 3 render path (Studio already on Path B) + Phase 3.5 follow-up
- §7 text content UNCHANGED (`grep -c "resolved double-wrap|originates upstream"` in diff returns 0)
- No DOM hierarchy change

---

## Live Smoke (MANDATORY per saved memory `feedback_visual_check_mandatory.md`)

Dev server: `cd tools/block-forge && npm run dev` → http://localhost:7702/  (200)

Flow (all 8 steps executed via Playwright MCP against real block-forge app):

| # | Step | Result | Screenshot |
|---|------|--------|------------|
| 1 | Block picker → `fast-loading-speed` | 3 iframes render; "+ Variant (0)" trigger enabled | `smoke-p3/wp028-p3-smoke-01-block-loaded.png` |
| 2 | Click "+ Variant" trigger | Drawer opens right-edge; empty state visible: "No variants yet. Fork from the base block below." | `smoke-p3/wp028-p3-smoke-02-drawer-empty.png` |
| 3 | Fill "sm" → Create | Trigger → "+ Variant (1)"; list shows `sm` with Rename/Delete; **all 3 iframes contain `[data-variant="base"]` + `[data-variant="sm"]`** wrappers (composeVariants inline call verified) | `smoke-p3/wp028-p3-smoke-03-sm-created.png` |
| 4 | Rename sm → mobile | Inline textbox → Save; list updates to `mobile`; all 3 iframes contain `[data-variant="mobile"]`, none contain `[data-variant="sm"]` | `smoke-p3/wp028-p3-smoke-04-renamed-mobile.png` |
| 5 | Delete mobile (confirm=true) | Trigger → "+ Variant (0)"; empty state back; all 3 iframes contain zero `[data-variant]` wrappers | `smoke-p3/wp028-p3-smoke-05-deleted-empty.png` |
| 6 | Fork "HEADER" (uppercase) | Error: "Name may only contain a-z, 0-9, and dashes"; Create button disabled; click does nothing | `smoke-p3/wp028-p3-smoke-06-uppercase-error.png` |
| 7 | Fork "custom-name" | Warning: "⚠ Name 'custom-name' is not in convention (sm\|md\|lg\|4**\|6**\|7**) — reveal rule will be skipped."; Create button ENABLED | `smoke-p3/wp028-p3-smoke-07-warning-custom-name.png` |
| 8 | ESC key | Drawer unmounts (`data-testid="variants-drawer"` absent, no `[role="dialog"]`) | `smoke-p3/wp028-p3-smoke-08-esc-closed.png` |

**Live-smoke verified invariants:**
- composeVariants inline call (Task 3.4) produces correct `data-variant` wrappers in all 3 breakpoint iframes — confirms the Phase 3 interim render path works end-to-end
- Trigger badge count reflects `session.variants` live via React state
- Delete restores `{}` session state, `composedBlock.variants` goes `undefined`, iframes re-render without wrappers
- Rename atomically updates both drawer list AND iframe wrappers (same React render pass)
- Native `window.confirm()` integration works (auto-accepted via `window.confirm = () => true` shim in smoke; real user gets the browser's native dialog)

Dev server killed post-smoke (PID 15484 taskkill'd; port 7702 released).

---

## Verification Table

| Gate | Command | Result |
|---|---|---|
| Arch-test | `npm run arch-test` | **499 / 0** ✅ Δ0 preserved |
| Typecheck (root) | `npx tsc --noEmit` | Clean ✅ (no output) |
| Studio tests | `npm -w @cmsmasters/studio run test` | **92 / 92** ✅ |
| block-forge tests | `npx vitest run` | **111 / 111** ✅ |
| VariantsDrawer body diff | `diff -U0 ...` | **9 lines** (3 content + 6 markers) ✅ byte-identical body |
| VariantsDrawer snap diff | `diff -u ...snap` | **0 lines** ✅ byte-identical |
| Phase 3.5 scope: preview-assets.ts | `git diff --stat` | Empty ✅ untouched |
| Phase 3.5 scope: preview-assets.test.ts | `git diff --stat` | Empty ✅ untouched |
| Phase 3.5 scope: preview-assets snap | regen check | Not regenerated ✅ |
| Phase 3.5 scope: Studio PARITY §7 | `grep -c "resolved double-wrap\|originates upstream"` in diff | **0 matches** ✅ §7 text unchanged |
| Manifest zero-touch | `git diff --stat src/__arch__/domain-manifest.ts` | Empty ✅ |
| block-editor.tsx deviation | `git diff --stat` | **+15 / −2 = +13 net** this phase; cumulative with Phase 2+2a's 18 → **31 net** total (under 40-line cap) ✅ |

---

## Deviations from Task Prompt

1. **block-editor.tsx LOC overshot target estimate.** Task estimate "~10 lines"; actual +13 net (within 40-cap, just over soft target). Tightened once during implementation (replaced destructured memo with `splitForFork.{html,css}` access). Documented; not escalated because hard cap is 40 and the overshoot is soft (+3 lines = +30% vs +200%).

2. **Trigger Button variant.** Task spec was loose on trigger styling. Used `<Button variant="outline" size="sm">` on both surfaces for consistency with existing picker toolbar styling.

3. **Snapshot coverage broadened.** Parity snap now records BOTH `document.body.innerHTML` AND `container.innerHTML` (container is mostly empty — Radix Dialog portals to body). Gives the snap a more faithful record of what the Drawer actually produces in jsdom. Both snaps are byte-identical between surfaces.

4. **Obsolete placeholder snapshots removed.** Running VariantsDrawer.test.tsx emitted 1 obsolete entry per surface (the pre-P3 `variants-drawer` data-attr snap). Cleaned via `vitest run -u` pass; new snap files are 2 entries per surface, byte-identical cross-surface.

No functional deviations from Brain rulings.

---

## Not Done in Phase 3 (parked)

- **Path B re-converge (Task 3.5 / 3.7 from original prompt)** — explicitly split to Phase 3.5 per Ruling R'. `preview-assets.ts` + test + snap + Studio §7 all untouched this phase, as verified in the gate table above.
- **Studio variant undo** — Ruling P: RHF `formState.isDirty` + `reset()` are the canonical dirty+undo signals on Studio; session-level variant history lives only on block-forge.
- **React dedupe structural fix** (carry-over from Phase 2a) — `tools/block-forge` still not in root workspaces; alias + dedupe + manual delete still the install dance. Hasn't caused fresh issues in Phase 3 tests (all 111 pass), but remains as a paper cut.

---

## Open Questions for Phase 3.5 / Phase 4

1. **Phase 3.5 Path B re-converge signal:** when `preview-assets.ts` drops the inner `<div data-block-shell>` wrap and `PreviewTriptych` switches from inline `composeVariants` to `renderForPreview`, the inline `composeVariants` call lands on the chopping block. Remove inline call entirely → engine handles composition. The `useMemo` around `composeVariants` also goes away.

2. **Phase 4 variant editor side-by-side:** currently each variant shares `{html, css}` identical to base at fork time. Phase 4 opens textareas for each variant's divergence. Question for Brain: do variants share the container/slot context, or does each variant get its own `@container` scope? Answer shapes how `composeVariants` variant CSS gets prefixed (currently `[data-variant="{name}"] .selector` — which already scopes cleanly).

3. **Rename while variant edited:** Phase 4 UX — if author renames a variant while mid-edit, does the textarea content follow? Current Phase 3 drawer rename preserves payload (`moving` object is spread), so the rename action is already payload-safe. Phase 4 just needs to plumb the textarea-binding through.

4. **Duration honesty:** Phase 3 estimate was 3h. Actual ~4h (RECON 30min + drawer 45min + session + App 1h + tests 1h + smoke 30min + result log 15min). Still better than Phase 2+2a's ~4.5h actual vs 2.5h estimate — calibration improving but still ~30% over. Worth folding into Brain's estimation heuristic.

---

## Commit Plan

Single commit per task-prompt §Git:
```
feat(studio+tools): WP-028 Phase 3 — VariantsDrawer CRUD + session variants + RHF dispatch [WP-028 phase 3]
```

18 files staged (listed above). SHA embedded below after commit lands.

**Implementation commit SHA:** `8d73b334` (18 files, +1847 / −84; lint-ds clean)

---

## Post-commit: Ready for Phase 3.5

Waiting on Phase 3.5 start signal. Scope preview:
- `tools/block-forge/src/lib/preview-assets.ts` — drop inner `<div data-block-shell>` wrap (body becomes `<div class="slot-inner">{html}</div>`)
- `tools/block-forge/src/components/PreviewTriptych.tsx` — replace inline `composeVariants` with `renderForPreview(block, { variants })`
- `tools/block-forge/src/__tests__/preview-assets.test.ts` — flip case (c) to pin single-wrap contract
- `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap` — regen
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §7 — flip "deliberate divergence" → "✅ RE-CONVERGED"
- `tools/block-forge/PARITY.md` — update §DOM hierarchy + §WP-027 cross-reference + note Phase 3.5 Close
