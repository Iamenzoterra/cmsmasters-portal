# WP-029: Heuristic polish — Tasks A+B (OQ4 validator + OQ6 App render pins)

> Narrow WP to clear two carry-over OQs from WP-028 before field data has a chance to accumulate. **Task C (real-usage heuristic polish) is explicitly deferred** to a future continuation (WP-030) once WP-028 authors have been in production for 2–4 weeks and generate meaningful signal. Shipping A+B now means no plumbing drift; Task C later means the polish is informed by real data, not guesses.

**Status:** ✅ DONE
**Priority:** P1 — Plumbing hygiene (neither A nor B blocks production use of WP-028 features; both prevent drift / improve regression coverage)
**Prerequisites:** WP-028 ✅, OQ1 Hono Worker redeploy (operationally separate — does not block this WP)
**Milestone/Wave:** ADR-025 follow-ups
**Estimated effort:** 7–10 hours across 4 phases
**Created:** 2026-04-24
**Completed:** 2026-04-25

---

## Problem Statement

WP-028 closed cleanly with 31 Brain rulings applied, 5/5 approval-gate pattern, 8/8 pre-flight RECON catches. Two items parked in `logs/wp-028/parked-oqs.md` for this WP:

- **OQ4 — Variant CSS scoping validator warning.** WP-028 Phase 4 smoke-10 caught a real authoring trap the hard way: an author writing `.block-fast-loading-speed { background: red }` inside variant CSS without `[data-variant="NAME"]` scoping OR `@container slot (max-width: Npx)` reveal rule causes the variant styles to leak into the base render. Portal's `renderBlock` inlines variant CSS verbatim — scoping is authors' responsibility per ADR-025 convention. Real-world authors will repeat this mistake if not warned at edit time. Today, Studio's `VariantEditor.tsx` accepts any CSS; the foot-gun is live.

- **OQ6 — `<App />` render-level regression pins.** WP-028 Phase 5 introduced `assembleSavePayload` contract-mirror pins to cover the tweak+variant save matrix without standing up `<App />` render tests in block-forge (arch-test Δ0 constraint + avoidance of Phase 3/3.5/4 territory churn during a late-phase carve-out). Compromise: pins exercise a harness that mirrors production `App.tsx::handleSave`, not production code. If `handleSave` drifts (e.g. re-introduces `if (accepted.length === 0) return` early-return, or removes Phase 6's `composeTweakedCss` step), the pins pass while production breaks. Current risk is low (handleSave just landed) but grows with every WP that touches block-forge App.

Both items are **plumbing hygiene**: not user-visible features, but the kind of thing that becomes painful to diagnose later. Task A prevents a class of authoring mistakes reaching production. Task B lifts regression coverage from harness-level to render-level. Neither waits on field data — both should land before the next block-forge touch.

**Task C — the heuristic polish that was the original WP-029 theme — requires WP-028 authors to use tweaks + variants in anger for 2–4 weeks to generate meaningful confidence-tuning signal.** Shipping C without data = guessing. Deferring C = honest. See §Not in scope for the carve-out rationale.

---

## Solution Overview

### Architecture

```
  Task A — Variant CSS scoping validator (Studio-side, edit-time warning)
  ────────────────────────────────────────────────────────────────────────
     VariantEditor.tsx (WP-028 artifact)
        │
        │ author types in CSS textarea
        ▼
     validateVariantCss(cssText, variantName) ← NEW helper
        │
        │ parse via PostCSS (already a @cmsmasters/block-forge-core dep)
        ▼
     walk rules; check each for:
        • selector contains [data-variant="{variantName}"]  → OK
        • OR wrapped in @container slot (max-width: …)      → OK
        • else                                              → Warning
        │
        ▼
     non-blocking banner beside textarea with
     link to ADR-025 variant CSS convention docs


  Task B — <App /> render-level regression pins (block-forge tests)
  ────────────────────────────────────────────────────────────────────────
     block-forge <App />                              ← MOUNT in test
        │
        │ user-event click Save with session shape ∈
        │    { tweak-only, variant-only, mixed }
        ▼
     production handleSave (not a mirror!)
        │
        │ composeTweakedCss (OQ5 integration point)
        │ assemble payload
        │ call mocked apiClient.saveBlock
        ▼
     assert mock.called(expected payload)            ← the actual regression pin
     (Phase 5 contract-mirror pins stay, documented as comment-only baseline)


  ── What this WP does NOT contain (explicit non-scope) ───────────
     • Task C — heuristic confidence tuning / new heuristics    → WP-030
     • tokens.responsive.css real population                    → WP-030
     • Portal render changes                                    → frozen at WP-024
     • Engine API changes                                       → 6-function surface locked
     • Hono validator updates                                   → closed in WP-028 Phase 5
     • New WP-028 surface features                              → ADR-025 wave is closed
```

### Key Decisions

| Decision | Chosen | Why | Alternatives |
|---|---|---|---|
| Scope = A+B only, defer C | Honest | Task C needs field data to avoid guessing; A+B are plumbing that drifts if not landed | Bundle A+B+C (premature C); defer everything (OQ drift) |
| Task A validator location | Studio-side only (VariantEditor.tsx) | Author feedback is edit-time; tools/block-forge has its own variant editor and may want the same check, but WP-028 field data will clarify if drift emerges. Start with one surface, not both | Add to block-forge too (scope creep without signal); server-side validator only (miss edit-time feedback) |
| Task A validator semantics | **Warning, not error** — non-blocking banner | ADR-025 says authors write reveal rules themselves; library-level correctness is author's responsibility. Warning nudges, blocking would forbid legitimate edge cases (e.g. reveal rule in base CSS, variant CSS is just values) | Block save — too aggressive; silent detection + auto-fix — violates never-auto-apply |
| Task A parser | **PostCSS** (already a `@cmsmasters/block-forge-core` dependency via WP-025) | Reuse the parser Studio already imports transitively; no new dep | Regex — brittle on nested at-rules; hand-rolled parser — overkill |
| Task A reuse opportunity | Check if `packages/block-forge-core` has an existing CSS walker that can be re-exported | If a scoping-aware walker already exists (from heuristics), reuse. Phase 0 confirms | Build fresh — duplication risk |
| Task B mounting strategy | Full `<App />` mount with mocked `apiClient.saveBlock`, `apiClient.getBlock`, `apiClient.fetchSourceDir`, `BlockPicker` data fetch, jsdom stubs for ResizeObserver + PointerCapture | Phase 5's carve-out rationale no longer applies (no arch-test Δ0 pressure here; no Phase 3/3.5/4 churn). Mocking apiClient is standard React testing practice | Keep contract-mirror pins only — known drift risk acknowledged; Playwright E2E — too heavy for regression pinning |
| Task B test location | `tools/block-forge/src/__tests__/app-save-regression.test.tsx` (new file) | Dedicated file makes the regression-pin intent obvious; existing contract-mirror pins stay as documentation | Inline in existing test file — mixes concerns |
| Task B Phase 5 pins treatment | **Retained as documentation comments**, not deleted | The contract-mirror pins encode the payload shape intent; deleting them loses that documentation. Comment them as "baseline — see app-save-regression.test.tsx for live pins" | Delete — loses historical context |
| Phase count | 4 (Phase 0 RECON → Phase 1 Task A → Phase 2 Task B → Phase 3 Close) | Task A and Task B are independent + small; serializing is simpler than parallelizing across Hands. Approval gate at Phase 3 satisfies saved pattern | 3 phases (bundle A+B in one Phase 1) — harder to log/review; 2 phases (no RECON) — violates pre-flight memory |
| Approval gate | Yes, Phase 3 Close covers ≥3 doc files (CONVENTIONS + parked-oqs.md + at minimum one SKILL update + possibly BLOCK-ARCHITECTURE-V2.md) | Saved memory `feedback_close_phase_approval_gate.md` applies; pattern held 5/5 through WP-028, maintain | Skip gate — breaks pattern without cause |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps |
|---|---|---|---|
| **studio-blocks** | New file: `validateVariantCss.ts` helper + warning banner integration in `VariantEditor.tsx`. New test file | RHF `isDirty` canonical; validator is non-blocking (warning only); PostCSS imports must not bloat Studio bundle beyond WP-028 baseline | Forgetting to memoize validator on heavy CSS; blocking save on warning; bundling PostCSS as a dupe rather than reusing via `@cmsmasters/block-forge-core` re-export |
| **infra-tooling** (tools/block-forge/) | New test file `app-save-regression.test.tsx` only. No production code change | PARITY.md discipline untouched; App.tsx frozen; mock scaffolding does not leak into production bundle | jsdom stubs polluting other tests; mock shapes drifting from real apiClient signatures |
| **pkg-block-forge-core** | Possibly re-export an existing CSS walker helper IF one exists and is reusable for Task A. Read-only check; no new export unless needed | Engine API surface locked; any new export gets a public contract + test | Exporting internal helper that's not contract-stable |
| **pkg-db, pkg-ui, app-api, app-portal** | Zero touch | — | — |

**Public API boundaries:**
- `validateVariantCss(cssText, variantName) → Warning[] | null` — Studio-internal helper, not exported outside studio-blocks
- Task B test mocks shape-match existing `apiClient` types — if apiClient signature changes, mocks update in-phase

**Cross-domain risks:**
- **Validator perf on large CSS.** Authors might have 500+ line variant CSS. PostCSS parse on every keystroke is wasteful — debounce (300ms) before validate.
- **Mock drift in Task B.** Mocked `apiClient.saveBlock` must match real signature byte-for-byte; any Hono endpoint change that alters the payload shape breaks tests silently if mock isn't updated. Phase 0 audits this.

---

## What This Changes

### New Files

```
apps/studio/src/pages/block-editor/responsive/
  validateVariantCss.ts                # Task A — PostCSS-based scope/reveal checker
  ValidatorBanner.tsx                  # Task A — non-blocking warning UI beside VariantEditor textarea
  __tests__/validateVariantCss.test.ts # Task A — unit tests, inline synthetic CSS
  __tests__/validator-banner.test.tsx  # Task A — RTL render + warning display

tools/block-forge/src/__tests__/
  app-save-regression.test.tsx         # Task B — <App /> mount + handleSave regression pins

logs/wp-029/
  phase-0-result.md … phase-3-result.md
```

### Modified Files

```
apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
  # integrate validator banner inside VariantEditorPanel inline component (~L450, after textareas grid); reuse existing 300ms debounce

tools/block-forge/src/__tests__/                    # whatever Phase 5 pin file was named
  # convert existing contract-mirror pins to documentation comments; preserve shape

src/__arch__/domain-manifest.ts
  # register new Studio files under studio-blocks; register test file under infra-tooling

.claude/skills/domains/studio-blocks/SKILL.md       # Close — Task A section
.claude/skills/domains/infra-tooling/SKILL.md       # Close — Task B regression-pin section
logs/wp-028/parked-oqs.md                           # Close — flip OQ4 + OQ6 rows to "resolved in WP-029"
workplan/BLOCK-ARCHITECTURE-V2.md                   # Close — cross-ref WP-029 A+B; Task C deferred note
.context/CONVENTIONS.md                             # Close — validator pattern; render-level regression pin pattern
```

### Manifest Updates

```ts
// studio-blocks.owned_files
'apps/studio/src/pages/block-editor/responsive/validateVariantCss.ts',
'apps/studio/src/pages/block-editor/responsive/ValidatorBanner.tsx',
'apps/studio/src/pages/block-editor/responsive/__tests__/validateVariantCss.test.ts',
'apps/studio/src/pages/block-editor/responsive/__tests__/validator-banner.test.tsx',

// infra-tooling.owned_files
'tools/block-forge/src/__tests__/app-save-regression.test.tsx',
```

### Database Changes

None.

---

## Implementation Phases

### Phase 0: RECON (~1.5h)

**Goal:** Confirm post-WP-028 end-state still holds; inspect Task A + Task B targets; resolve carry-overs for Phase 1+2.

**Tasks:**
0.1. Read skills: `studio-blocks`, `infra-tooling`, `pkg-block-forge-core`. Re-read `logs/wp-028/parked-oqs.md` §OQ4 + §OQ6 in full.
0.2. **End-state check:** `npm run arch-test` (expect 499/0 per WP-028 close). If drift — record and stop.
0.3. **Task A target inspection:** read `apps/studio/src/pages/block-editor/responsive/VariantEditor.tsx` in full. Record current structure: where CSS textarea lives, whether there's already a warning slot, how RHF binds.
0.3.a. **Reveal-rule convention audit (per Brain C1).** Read `packages/block-forge-core/src/compose/compose-variants.ts` in full — record the EXACT reveal rule syntax it emits (named `@container slot (…)` vs unnamed `@container (…)` vs both). Cross-check with `.context/CONVENTIONS.md` §responsive-tokens / variant-CSS + `workplan/adr/025-responsive-blocks.md`. Produce a definitive list of accepted syntaxes. **Validator in Phase 1.1 MUST accept every syntax on this list as "revealed"** — treating only one as valid = false negatives for authors who use the other.
0.4. **Task A parser audit + exit criteria (per Brain C2).** `grep -r "from 'postcss'" apps/studio packages/` — confirm PostCSS resolution path from Studio. `grep -rn "postcss\|walkRules" packages/block-forge-core/src/` — find any existing walker helper worth re-exporting. **Exit criteria (mandatory — one must be true, else Phase 1 grows a task 1.0):**
   - (a) `@cmsmasters/block-forge-core` re-exports PostCSS (or a wrapper helper) from its public API → Studio imports via that path
   - (b) Studio resolves PostCSS transitively through an existing workspace dep → works as-is
   - (c) Neither → **Phase 1.0 (new pre-task) adds `postcss` as Studio `devDependency`** with exact version pin matching `block-forge-core`'s version to avoid dual-version drift
   Phase 0 log records which of (a)/(b)/(c) applies as a hard decision, not a hedge.
0.5. **Task A warning convention check:** read `apps/studio/src/components/toast.tsx` + any existing validation banner pattern in Studio. Reuse if exists; build new only if none.
0.6. **Task B target inspection:** read `tools/block-forge/src/App.tsx::handleSave` verbatim; record current Phase 6 shape (composeTweakedCss integration, payload assembly). Also read Phase 5 carve-out pin file — record exact test names, what each pin asserts, so Phase 2 comment-preserves them.
0.7. **Task B mock audit:** `grep -rn "apiClient" tools/block-forge/src/` — record the exact import path + types so Phase 2 mocks match. Same for `BlockPicker` data fetch + fs middleware.
0.8. **jsdom stubs audit:** `grep -rn "ResizeObserver\|setPointerCapture" tools/block-forge/src/__tests__/` — see if existing tests already polyfill these or if Phase 2 adds fresh.
0.9. **WP-028 post-merge regression gate:** `npm -w @cmsmasters/studio test` + `npm -w tools/block-forge test` — current baseline counts recorded.
0.10. **Deferred-C confirmation:** no Phase 0 task about Task C; explicitly record in log "Task C deferred; this RECON does not audit it."

**Verification:** `logs/wp-029/phase-0-result.md`. Mandatory carry-overs:
  (a) PostCSS resolution path decision — one of {re-export / transitive / direct devDep} with the chosen path recorded as a hard call
  (b) VariantEditor integration point + RHF coupling
  (c) existing Studio warning banner pattern (or "build fresh" decision)
  (d) handleSave current shape + what Phase 5 pins assert
  (e) apiClient + BlockPicker + fs middleware mock shapes
  (f) jsdom stubs needed
  (g) baseline test counts
  (h) **accepted reveal-rule syntaxes** — verbatim list from `composeVariants` output + ADR-025 (validator accepts each as "revealed")

No code written.

---

### Phase 1: Task A — Variant CSS scoping validator (~3–5h)

**Goal:** Non-blocking warning in VariantEditor when variant CSS lacks scoping or reveal rule.

**Tasks:**
1.1. `validateVariantCss(cssText, variantName): ValidationWarning[]` — pure function. Parse via PostCSS. Walk top-level rules. For each rule:
   - If selector includes `[data-variant="{variantName}"]` → pass
   - **If ancestor at-rule matches ANY accepted reveal syntax from Phase 0 carry-over (h)** — minimally `@container slot (max-width: …)` AND unnamed `@container (max-width: …)`; extend per Phase 0 audit — → pass
   - Else → emit `{ rule: selector, line: N, reason: 'unscoped-outside-reveal' }`

   Empty CSS → empty array. Parse errors → single warning `{ reason: 'parse-error', detail: msg }`. **Accepted-syntax matcher is data-driven from Phase 0 carry-over (h), not hardcoded** — if ADR-025 adds a new reveal pattern later, validator updates via the carry-over list, not code.
1.2. `validateVariantCss.test.ts` — inline synthetic CSS cases (per saved memory: no fixture files for heuristic-style unit tests):
   - Properly scoped → no warnings
   - Unscoped → warning
   - Reveal-rule wrapped → no warning
   - Mixed (some scoped, some not) → warnings for the unscoped subset only
   - Empty CSS → empty
   - Malformed CSS → parse-error warning
   - Nested at-rules → correct ancestor detection
1.3. `ValidatorBanner.tsx` — warning banner component. Takes `warnings: ValidationWarning[]`. Renders nothing if empty. Otherwise: amber banner with warning count, expandable details, link to ADR-025 variant CSS convention section.
1.4. Integrate into `VariantEditor.tsx`: run validator (**debounced 300ms with flush-on-unmount per WP-028 Ruling BB**) on CSS textarea change; render ValidatorBanner above or beside textarea. Non-blocking — save still works even with warnings. Flush-on-unmount ensures the last validation pass completes synchronously in cleanup so the warning state reflects final CSS if the author closes the editor mid-debounce; pattern matches existing Studio debounce discipline and avoids inconsistent banner state on re-open.
1.5. `validator-banner.test.tsx` — RTL tests: empty warnings renders nothing; non-empty warnings render banner with correct count; expand toggle works.
1.6. Integration check: open Studio variant editor → type unscoped CSS → banner appears; type scoped CSS → banner disappears.
1.7. Manifest: register 4 new files under `studio-blocks.owned_files`.
1.8. Gates: `npm run arch-test` green (expect 499 + 4 = 503); `npm -w @cmsmasters/studio test` green; `npm -w @cmsmasters/studio run lint` clean.

**Verification:**
```bash
npm run arch-test                    # 503/0
npm -w @cmsmasters/studio test       # validator + banner tests green
npm -w @cmsmasters/studio run lint   # clean
# Manual: open Studio → variant editor → paste unscoped CSS → banner appears
```

---

### Phase 2: Task B — `<App />` render-level regression pins (~1–2h)

**Goal:** Replace Phase 5 contract-mirror pins with real `<App />` mount tests that exercise production `handleSave` through three carve-out scenarios.

**Tasks:**
2.1. `app-save-regression.test.tsx` — new file. Top-level:
   - Mock `apiClient.saveBlock`, `apiClient.getBlock`, `apiClient.fetchSourceDir` (per Phase 0 carry-over (e))
   - Mock `BlockPicker` data fetch to pre-resolve one fixture block
   - jsdom polyfills: ResizeObserver, setPointerCapture (if not already global — per Phase 0 carry-over (f))
2.2. Three scenarios:
   - **Tweak-only:** load block, accept one tweak suggestion via session state helper, click Save, assert `saveBlock` called with `{ css: composedFromTweak, variants: unchanged }`
   - **Variant-only:** load block, add variant via session state, click Save, assert `saveBlock` called with `{ css: unchanged, variants: { [name]: {...} } }`
   - **Mixed:** both, click Save, assert combined payload
2.3. **Drift detector as codified `test.skip` (per Brain C4).** Inside `app-save-regression.test.tsx` add a fourth test marked `test.skip`:
   ```ts
   // ACTIVATION: manually apply the mutation in handleSave (see comment below),
   // un-skip this test, run `npm -w tools/block-forge test` — it MUST fail.
   // Then revert the mutation AND re-skip this test before commit.
   // This test exists to prove the live pins above are render-level, not harness-mirrored.
   test.skip('drift detector — adding `if (accepted.length === 0) return` to handleSave kills tweak-only pin', () => {
     // ...same setup as tweak-only...
     // expected failure mode: saveBlock NOT called because early-return kills it
     expect(mockSaveBlock).not.toHaveBeenCalled()  // inverted assertion — test FAILS when drift is live
   })
   ```
   Codifies the drift experiment as reproducible investigation, eliminates "manually break then revert" PR-accident risk. Activation comment is the instruction.
2.4. Phase 5 contract-mirror pin file: convert `assembleSavePayload` pins from live tests to documentation comments. Keep the payload-shape intent visible; top of file gets a comment `// Live render-level pins live in app-save-regression.test.tsx (WP-029). The pins below are the historical baseline — kept as comments to preserve the payload-shape intent.`
2.5. Manifest: register new test file under `infra-tooling.owned_files`.
2.6. Gates: arch-test green; `npm -w tools/block-forge test` green (skip count = 1 for the drift detector); verify Phase 5 pin file still typechecks as comments.

**Verification:**
```bash
npm run arch-test                         # 503 + 1 = 504/0
npm -w tools/block-forge test             # all active scenarios green; 1 skipped (drift detector)
npm -w tools/block-forge run typecheck    # clean
git diff --quiet                          # mandatory: working tree clean before commit
                                          # — guards against accidental drift-mutation leak
```

---

### Phase 3: Close (~1h)

**Goal:** Doc propagation under approval gate (pattern now 6/6 if clean); flip parked OQs to resolved; Task C deferral documented so future continuation picks up cleanly.

**Tasks:**
3.1. CC reads all phase logs; notes any deviations (especially from Phase 0 audits, e.g. if a walker wasn't reusable and Phase 1 added fresh PostCSS usage).
3.2. Propose doc updates (≥3 files → approval gate):
   - `.context/CONVENTIONS.md` — validator-at-edit-time pattern; render-level regression pin pattern replacing contract-mirror where complexity warrants
   - `.claude/skills/domains/studio-blocks/SKILL.md` — validator section (invariants: non-blocking, debounced, PostCSS-based)
   - `.claude/skills/domains/infra-tooling/SKILL.md` — regression-pin section (mock scaffold shape, drift-detection intent)
   - `logs/wp-028/parked-oqs.md` — flip OQ4 + OQ6 rows to "resolved in WP-029 (SHA refs)"
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — cross-ref WP-029 Tasks A+B; explicit note that Task C is deferred pending field data from WP-028 usage
   - Optionally: `.context/BRIEF.md` — WP-029 done; Task C deferred
3.3. **Brain approves** (6 doc files → gate kicks in).
3.4. CC executes approved doc updates.
3.5. No SKILL-status flip expected (both studio-blocks and infra-tooling already `full`). If pre-flight disagrees, factor +6 per saved memory.
3.6. Final gates:
   ```bash
   npm run arch-test
   npm run typecheck
   npm -w @cmsmasters/studio test
   npm -w tools/block-forge test
   npm -w @cmsmasters/studio run build
   ```
3.7. Flip WP status to `✅ DONE`; set Completed date.

**Files to update (Close):**
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/studio-blocks/SKILL.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `logs/wp-028/parked-oqs.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `.context/BRIEF.md` (optional)
- `logs/wp-029/phase-*-result.md`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| PostCSS import bloats Studio bundle | Main-bundle size regression | Phase 0 confirms transitive availability via `@cmsmasters/block-forge-core`; Phase 1 prefers re-export over direct dep add; Phase 3 build gate checks bundle size delta vs WP-028 baseline |
| Validator triggers on every keystroke | Laggy UX for large CSS | Debounce 300ms in VariantEditor integration (Task 1.4) |
| False positives from unusual but valid CSS | Authors annoyed; banner cried wolf | Warning is non-blocking; banner includes "false positive?" footnote with ADR-025 link; Phase 0 confirms we're checking top-level rules only (don't chase nested edge cases in MVP) |
| Task B mocks drift from real apiClient | Tests pass while production breaks | Phase 0.7 records exact types; Phase 2 TypeScript types the mocks against real `apiClient` module; any apiClient change surfaces as compile error |
| Phase 5 contract-mirror comment-conversion breaks existing file | CI red | Phase 2.3 keeps file compilable (comments don't change syntax); typecheck gate confirms |
| Scope creeps into Task C via "while we're here" heuristic tuning | WP bloats; field-data argument weakens | Phase 0 explicitly records "Task C deferred"; any phase prompt that touches `packages/block-forge-core/src/heuristics/` is a stop-and-Brain-review trigger |
| OQ1 Worker redeploy not done → real variant save still broken → Task A validator has no real author test | Task A ships, nobody notices it works | OQ1 is an operational precondition of manual validation, not a code dep; Task A unit tests cover the logic regardless |
| jsdom stubs conflict with existing tests | Wider test suite flakes | Phase 0.8 audit confirms scope; Phase 2 stubs added at file level, not global, to avoid cross-test pollution |
| Approval gate skipped because "only 2 tasks" | Doc drift | Gate applies on file count (≥3), not task count; Phase 3 target file list is 5–6 docs, gate mandatory |

---

## Acceptance Criteria

- [ ] Phase 0 RECON log exists with eight carry-overs (a)–(h) recorded
- [ ] `validateVariantCss` exports a pure function with PostCSS-based walker; unit tests cover scoped / unscoped / reveal-wrapped / mixed / empty / malformed / nested cases
- [ ] `ValidatorBanner` renders non-blocking warning when variant CSS is unscoped without reveal rule; empty state renders nothing
- [ ] `VariantsDrawer.tsx::VariantEditorPanel` integrates validator + banner with 300ms debounce (reuse existing); save is never blocked
- [ ] Task B `app-save-regression.test.tsx` mounts `<App />`, mocks apiClient + data fetch + jsdom stubs, exercises five scenarios (tweak-only / variant-only / mixed / OQ2 clear-signal / OQ5 tweak-compose), all pass
- [ ] Drift detector exists as `test.skip` in `app-save-regression.test.tsx` with activation instructions in inline comment; verified by reviewer reading the file (no manual-run-then-revert in PR flow)
- [ ] `git diff --quiet` passes before Phase 2 commit (working tree clean — no accidental drift-mutation leak)
- [ ] Phase 5 contract-mirror pins retained as compilable documentation comments
- [ ] `logs/wp-028/parked-oqs.md` OQ4 + OQ6 rows flipped to "resolved in WP-029"
- [ ] `npm run arch-test` green at target count (baseline 499 + 4 new tracked owned_files = 503; tools/block-forge test file excluded from manifest count per infra-tooling convention)
- [ ] `npm run typecheck` clean
- [ ] Studio build clean (no bundle-size regression beyond PostCSS transitive inclusion if new)
- [ ] Phase 3 Close under explicit approval gate; 6/6 on pattern after this WP
- [ ] `.context/CONVENTIONS.md` documents validator-at-edit-time pattern + render-level regression pin pattern
- [ ] Task C explicitly deferred in `workplan/BLOCK-ARCHITECTURE-V2.md` with field-data rationale (not forgotten, not started)
- [ ] No touch to `packages/block-forge-core/`, `apps/portal/`, `packages/ui/`, `apps/api/`
- [ ] No new heuristic added to engine (Task C boundary held)
- [ ] All four phases logged in `logs/wp-029/phase-*-result.md`

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| WP-028 ✅ | Done | parked-oqs.md source registry |
| OQ1 Hono Worker redeploy | Operational, separate | Manual end-to-end variant-save validation — not a code dep |
| ADR-025 active | ✅ | Variant CSS convention (reveal rule + scoping) — validator enforces this |

This WP unblocks: **nothing hard-blocked**. Task C future-WP is informed by WP-028 field data; OQ1 is operational. WP-029 is a plumbing-hygiene pass.

---

## Not in scope (explicit)

- **Task C — real-usage heuristic polish.** Deferred to WP-030 after WP-028 has 2–4 weeks of production usage. Rationale: confidence-tuning without field data is guessing. Signals to watch (future RECON input):
  - False-positive / false-negative rate on the six ADR-025 heuristics
  - New heuristic candidates surfaced by recurring author tweak patterns
  - `tokens.responsive.css` real-value population informed by clamp ranges authors actually emit
- `tokens.responsive.css` real population — same deferral path (currently 2-token scaffold per `.context/CONVENTIONS.md` §Responsive tokens file).
- Portal render changes — frozen at WP-024 level until a new ADR.
- Engine API surface changes — locked at six public functions per `workplan/BLOCK-ARCHITECTURE-V2.md` §Phase 2.
- Hono API validator / schema changes — closed in WP-028 Phase 5.
- Variant validator on `tools/block-forge/` side — start Studio-only; port if field data shows value after WP-028 usage window.
- Bulk "fix all warnings" button — violates ADR-025 never-auto-apply.

---

## Notes

- **Why this WP is P1, not P0:** neither A nor B blocks production use of WP-028 features. Task A is preventative; Task B is regression insurance. Shipping them now prevents plumbing drift, which is cheaper than discovering the drift later.
- **Task C carve-out is a discipline play.** The original WP-029 intent was heuristic polish; shipping A+B under the WP-029 banner risks future confusion ("didn't WP-029 already polish heuristics?"). Doc Close explicitly parks Task C under a new banner (WP-030) so the branding stays clean.
- **Pre-flight RECON** per saved memory — Phase 0 load-bearing even for small WPs (saved memory: 8/8 on WP-028).
- **Approval gate** per saved memory — Phase 3 ≥3 docs, pattern 6/6 target.
- **Visual check** (per saved memory `feedback_visual_check_mandatory.md`) — Phase 1 manual integration check is light (banner shows/hides); Task B is test-only, no UI. No Playwright needed this WP.
- **ADR-025 is the tie-breaker** on variant CSS convention questions.

---

## Final SHA chain (post-close)

- Phase 0 RECON: `302b6908`
- Phase 1 Task A: `611be474`
- Phase 2 Task B initial: `c842a9a3`
- Phase 2 polish (gaps A+B+D): `ecbec5db`
- Phase 2 follow-up (Brain ruling C-iii): `7c6326f1`
- Phase 3 doc propagation: `<pending>`
- Phase 3 result log: `<pending>`

## Approval-gate pattern

6/6 maintained: WP-024 ✅ → WP-025 ✅ → WP-026 ✅ → WP-027 ✅ → WP-028 ✅ → WP-029 ✅.

## Honest gaps closed (Phase 2)

5 gaps surfaced under brutal-honesty audit + closed across 3 commits:
A — pre-existing Studio snap CRLF noise reset (workspace hygiene).
B — `it.skip` for archived harness-mirror pins (honest Vitest count: 138/0 → 132/6/138 total).
C — sc 1+5 redundancy reduced 5→4 scenarios per Brain ruling C-iii (OQ5 invariant inherited by sc 1 `@container` substring).
D — empirical drift validation (mutation experiment in `logs/wp-029/phase-2-drift-experiment.md`).
E — `tools/block-forge` non-workspace nit deferred to Phase 3 CONVENTIONS.md addendum.
