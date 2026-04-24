# WP-028 Phase 3 + 3.5 — Rolled-up Summary

> **Status:** both phases closed; ready for Phase 4
> **Source of truth (detailed logs):** `phase-3-result.md`, `phase-3.5-result.md`
> **Scope:** Variants CRUD end-to-end on both surfaces + Path B re-converge of tools/block-forge with Studio

---

## TL;DR (1 paragraph)

Phase 3 landed the `VariantsDrawer` real UI (fork/rename/delete + name validation + native-confirm delete) on both Studio and tools/block-forge — byte-identical component body, byte-identical snap, cross-surface wiring differs by intent (Studio uses RHF `form.variants`; block-forge uses session reducers with undo). Phase 3.5 followed up with the Path B re-converge that had been split out of Phase 3 at the Hands-review fork: tools/block-forge `composeSrcDoc` dropped its inner `<div data-block-shell>` wrap and `PreviewTriptych` switched from an inline `composeVariants` call to `renderForPreview(block, { variants })` upstream. Both surfaces now produce structurally identical iframe DOM; `PARITY.md §7` is marked `✅ RE-CONVERGED` on both files. A post-phase honesty round added snapshot regression guards and reworded over-confident "byte-identical" claims to "structurally identical" where verification was DOM-query-level.

---

## Commit trail

| Commit | Type | Scope |
|---|---|---|
| `c3173752` | chore(logs) | Phase 3 + 3.5 task prompts (narrowed after Hands review — split Path B out) |
| `8d73b334` | feat(studio+tools) | Phase 3 impl — Drawer barrel, VariantsDrawer real UI both surfaces, Studio RHF wiring, block-forge session variants + App.tsx, PreviewTriptych inline composeVariants (interim), BlockJson `variants?`, PARITY §Variant CRUD additive |
| `9238d434` | chore(logs) | Phase 3 result log + 8 smoke screenshots |
| `81d0e9dc` | refactor(tools) | Phase 3.5 impl — composeSrcDoc single-wrap, PreviewTriptych → renderForPreview, preview-assets.test.ts migration, PARITY §7 RE-CONVERGED on both files |
| `de75a550` | chore(logs) | Phase 3.5 result log + 2 smoke screenshots |
| `80ac5930` | chore(tools+logs) | Phase 3.5 honesty-round — snap regression guard, "byte → structural" wording, duration rewound, Phase 4 cleanup agenda parked |
| `b351d373` | chore(logs) | Phase 3.5 honesty-round SHA back-fill |

---

## Deliverables

### User-facing

- **VariantsDrawer** real UI (both surfaces): empty-state + variant list + fork input + inline rename + delete with native `window.confirm` + validation errors/warnings for name convention `(sm | md | lg | 4\d\d | 6\d\d | 7\d\d)`.
- **Variant-bearing preview**: on block-forge fork-sm, all 3 iframe panels (1440 / 768 / 375) immediately show `[data-variant="base"]` + `[data-variant="sm"][hidden]` descendants inside the pre-wrapped `[data-block-shell]`, with `@container slot (max-width: 480px)` reveal CSS emitted by the engine.
- **Disk round-trip**: block-forge save writes `variants: {...}` when session has variants, `undefined` when empty — Studio parity preserved.

### Developer-facing

- **`dispatchVariantToForm(form, action)`** in Studio `ResponsiveTab.tsx` — OQ4 invariant mirror (reads `form.getValues('variants')` live at dispatch time; returns previous record for undo instrumentation).
- **`createVariant / renameVariant / deleteVariant`** pure reducers in block-forge `session.ts` — `history` carries action (with `prev: BlockVariant` for delete) for undo; `isDirty` extended to include any `variant-*` entry.
- **`createSession()` stays zero-arg** (Ruling P' useEffect seed) — backward-compat preserved for all 9 call sites.
- **`clearAfterSave(state, savedVariants?)`** — optional second arg defaults to `state.variants`; current and planned callers both work.
- **`BlockJson.variants?: BlockVariants`** added on block-forge types.
- **Path B re-converge:** tools/block-forge mirrors Studio — `composeSrcDoc` outer-only `.slot-inner`; `renderForPreview(block, { variants })` upstream.

### Contract / documentation

- **Drawer barrel** in `packages/ui/index.ts` — 8 Radix-backed re-exports (mirrors Phase 2 Slider pattern).
- **`@cmsmasters/ui` Button usage** in consumer app (Studio + block-forge) — no direct `@radix-ui/react-dialog` imports.
- **PARITY.md both files**: §Variant CRUD section + §7 `✅ RE-CONVERGED at WP-028 Phase 3.5` + historical note explaining the two-step journey (interim inline composeVariants → renderForPreview upstream).
- **preview-assets.test.ts snapshot pins** on cases (j) + (k) — body-region extraction keeps snap small + stable against unrelated `?raw` imports.

---

## Metrics

| Metric | Phase 3 entry | Phase 3 exit | Phase 3.5 exit | Honesty-round exit |
|---|---:|---:|---:|---:|
| arch-test | 499/0 | **499/0** | **499/0** | **499/0** |
| Studio tests | 77 | **92** (+15) | 92 (0Δ) | **92** (0Δ) |
| block-forge tests | 80 | **111** (+31) | **113** (+2) | 113 (0Δ) |
| `packages/ui` barrel re-exports | 4 | 12 (+8 Drawer) | 12 (0Δ) | 12 (0Δ) |
| block-forge files touched by Phase 3 | — | 13 | 0 (scope boundary respected) | 0 |
| block-forge files touched by Phase 3.5 | — | — | 4 (impl) | +1 (snap) |
| Studio files touched by Phase 3 | — | 6 | 0 | 0 |
| Studio files touched by Phase 3.5 | — | — | 1 (PARITY only) | 0 |
| block-editor.tsx cumulative deviation | 18 | 31 | 31 (0Δ) | 31 (0Δ, under 40-cap) |
| VariantsDrawer body diff (content lines) | — | **3** (9 lines with -U0 markers) | 3 | 3 |
| VariantsDrawer snap diff (bytes) | — | **0** | 0 | 0 |

---

## Brain Rulings Applied (inherited + new)

| Phase | Ruling | Scope |
|---|---|---|
| P3 | L — Drawer consumption | Import via `@cmsmasters/ui` barrel; linear transitions permanent (inherits Phase 1 Ruling B) |
| P3 | M — Name validation | Regex + 2-50 char + unique check; non-convention = WARN not BLOCK |
| P3 | N — Fork deep-copy | Snapshot `{html, css}` at fork time; Studio splits form.code, block-forge reads block |
| P3 | O — Delete confirm | Native `window.confirm()`; tests mock via `vi.spyOn` |
| P3 | P — Variant undo block-forge only | Studio relies on RHF `formState.isDirty` + `reset()` — no parallel session history |
| P3 | P' — `createSession()` zero-arg (useEffect seed) | Replaces task-prompt's signature-extension option; lower TS fragility + backward-compat |
| P3 | Q — Studio RHF dispatch helper | `dispatchVariantToForm(form, action)` mirrors Phase 2 `dispatchTweakToForm` OQ4 pattern |
| P3 | R' — Path B split to Phase 3.5 | Scope boundary: preview-assets.ts + its test + Studio §7 UNTOUCHED in P3; flipped in P3.5 |
| P3 | S — Barrel minimal | 1 block of 8 Drawer re-exports; primitive zero-touch |
| P3 | T — No new files | arch-test Δ0 preserved; helpers inline; tests in existing files |
| P3 | X — Lockstep REIMPLEMENT continues | Phase 3 metric ≈ 14-15 non-cosmetic diffs (≤15 threshold holds) |
| P3.5 | 3.5-α — Structurally identical iframe DOM | Verified via live Playwright DOM queries (not HTML byte diff; "byte-identical" wording reworded during honesty round) |
| P3.5 | 3.5-β — `renderForPreview` NO width param | WP-027 Ruling 3 triple-wrap hazard — composeSrcDoc handles width |

---

## Cross-surface invariants (post-Phase 3.5)

| Invariant | Studio | block-forge |
|---|---|---|
| Variant store | `form.variants` (RHF) | `session.variants` (reducer) |
| Dispatch | `dispatchVariantToForm(form, action)` → `form.setValue(..., { shouldDirty: true })` | `handleVariantAction` → `createVariant/renameVariant/deleteVariant` reducers |
| Undo | RHF `reset()` (future) | `session.undo()` reverses variant-* actions with `prev` restore on delete |
| Dirty signal | `formState.isDirty` | `isDirty(state)` (includes variant-* history entries) |
| Fork base source | `splitCode(form.getValues('code'))` → `{html, css}` | `block.html` / `block.css` at fetch time |
| Render path | `renderForPreview(block, { variants })` | `renderForPreview(block, { variants })` ← **Phase 3.5 re-converge** |
| composeSrcDoc wrap | `<div class="slot-inner">{pre-wrapped-html}</div>` | `<div class="slot-inner">{pre-wrapped-html}</div>` ← **Phase 3.5 re-converge** |
| Inner `<div data-block-shell>` emitter | engine `wrapBlockHtml` upstream | engine `wrapBlockHtml` upstream ← **Phase 3.5 re-converge** |
| Save payload | `variants: Object.keys(variants).length > 0 ? variants : undefined` | `variants: Object.keys(session.variants).length > 0 ? session.variants : undefined` |

---

## Live smoke (both phases)

### Phase 3 — 8 steps, all green

File: `logs/wp-028/smoke-p3/wp028-p3-smoke-01..08.png`

1. Block picker → fast-loading-speed → 3 iframes render
2. `+ Variant` trigger opens drawer — empty state
3. Fork "sm" → list shows `sm` + all iframes get `[data-variant="base"]` + `[data-variant="sm"]` (composeVariants inline wired)
4. Rename sm → mobile → list updates + all iframes reflect
5. Delete mobile (confirm=true) → list empty + iframes cleared
6. `HEADER` uppercase → error + Create disabled
7. `custom-name` → warning + Create enabled
8. ESC → drawer unmounts

### Phase 3.5 — 2 steps, all green

File: `logs/wp-028/smoke-p3.5/wp028-p3.5-smoke-01..02.png`

1. Raw block preview — `body > div.slot-inner > div[data-block-shell="fast-loading-speed"]` direct-child chain on all 3 iframes; `shellIsDirectChildOfSlotInner === true` for each. Structurally identical to pre-3.5 iframe DOM.
2. Fork "sm" variant — engine `wrapBlockHtml` emits shell + composeVariants emits `[data-variant="base"]`/`[data-variant="sm"][hidden]` inside shell; `@container slot (max-width: 480px)` reveal CSS present. Single-wrap contract holds.

### Phase 3.5 live-smoke coverage gaps (admitted in honesty round)

- Only 1 variant tested; 2+ variants simultaneously NOT live-verified
- Only convention name (`sm`) tested; non-convention name (`custom-name` → engine warning in iframe console) NOT live-verified
- Empty variant payload edge case NOT live-verified
- Those cases covered by `composeVariants` unit tests in `packages/block-forge-core` + session reducer tests; live smoke was scoped to representative happy-path

Parked for Phase 4 Phase 0 RECON if useful.

---

## Deviations from task prompts

| Phase | Deviation | Reason |
|---|---|---|
| P3 | block-editor.tsx +13 net LOC (spec est ~10) | Trimmed once; still well under 40 hard cap; documented in P3 result log |
| P3 | Trigger button `variant="outline"` | Spec loose on styling; matched picker toolbar convention |
| P3 | Snapshot records `document.body.innerHTML` + `container.innerHTML` (both) | Radix Dialog portals to body; broader snap = more faithful |
| P3.5 | 5 files instead of 7 | No `preview-assets.test.ts.snap` existed pre-3.5 (only `toContain` + DOM queries); no `data-block-shell` assertions in integration.test.tsx. Both subtasks from spec were correctly N/A |
| P3.5 honesty | Snap later CREATED (not N/A after all) | Gap admitted: absence of snap = no regression guard. Fix landed in `80ac5930` with `toMatchSnapshot('body-region-*')` on cases (j) + (k); extract body region only |
| P3.5 honesty | "byte-identical" → "structurally identical" | Gap admitted: verification was DOM-query-level, not literal HTML byte diff; reworded 4 places (2 PARITY files + result log); preserved "byte-identical" where literal diff was verified (VariantsDrawer body, snap, click-handler) |
| P3.5 honesty | Duration rewound 1h10 → 1h45 | Gap admitted: initial estimate was rough; re-counted tool-call timestamps sum to ~105min |

---

## Parked for Phase 4 Phase 0 RECON (honesty-round agenda)

1. **Add `tools/block-forge/src/__tests__/PreviewTriptych.test.tsx`** — unit coverage for `previewBlock` useMemo edge cases: null block, empty-variants block, non-convention variant name (engine warning path), 2+ variants simultaneous. Phase 3 + 3.5 grew this component but only indirect coverage via integration + live smoke.

2. **Broaden live Playwright smoke in Phase 4** — exercise 2+ variants + non-convention name. Phase 3.5 smoke covered only the 1-variant convention case.

3. **(Carry from Phase 2a)** React dedupe structural fix — `tools/block-forge` still not in root workspaces; alias + dedupe + manual delete still the install dance. Hasn't bitten in Phase 3 or 3.5 but remains a paper cut.

---

## Duration (honest)

| Phase | Estimate | Actual | Notes |
|---|---:|---:|---|
| Phase 3 | 3h | ~4h | RECON 30min + Drawer 45min + session + App 1h + tests 1h + smoke 30min + result log 15min |
| Phase 3.5 | 1.5h | ~1h45min | RECON 15min + Task 3.5.1 5min + Task 3.5.2 10min + Task 3.5.3 20min + Task 3.5.4 15min + verification 10min + smoke 10min + result log 15min + commit 5min |
| Phase 3.5 honesty-round | unplanned | ~40min | /ac audit + flag surfacing + 3 fixes + commits |
| **Combined Phase 3 + 3.5 + honesty** | **4.5h** | **~6.5h** | ~1.4× estimate multiplier. Phase 3 at 1.3× (actual 4h vs 3h est); Phase 3.5 at 1.17× (actual 1h45 vs 1.5h est) — calibration improving but still over, honesty-round added the rest |

---

## Ready for Phase 4

Both surfaces now on unified Path B. Phase 4 variant editor side-by-side can assume:

- `renderForPreview(block, { variants })` is the single render entry point on both surfaces
- `form.variants` (Studio) and `session.variants` (block-forge) are the stores of truth
- Undo semantics: Studio = RHF reset (future work), block-forge = session history pop
- Save payloads: `undefined` when empty, `BlockVariants` otherwise — Studio/block-forge parity
- PARITY §7 re-converged; PreviewTriptych + ResponsivePreview are sibling implementations of the same render contract

Nothing parked blocks Phase 4 variant-editor work. The 3-item Phase 4 Phase 0 RECON cleanup agenda is optional (gap filling, not prerequisite).
