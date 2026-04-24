# WP-028 Parked Open Questions — Tracking Registry

> **Purpose:** Single source of truth for Open Questions surfaced during WP-028 phases
> that are NOT resolved in their originating phase. Survives context compaction.
> Updated by each phase's result log + Phase 6 Close audits this file before marking WP done.

## Status key

- ⏳ **PARKED** — no action yet; awaiting trigger
- 🔨 **IN-PROGRESS** — currently being worked on (specify phase)
- ✅ **RESOLVED** — shipped; commit SHA embedded
- 🚫 **DEFERRED** — moved to future WP explicitly (e.g. WP-029, WP-030)
- 📦 **OUT-OF-SCOPE** — operational task; separate ticket required

---

## Current state (as of Phase 6 Commit 1 landing, 2026-04-24)

| ID | Surfaced | Status | Owner | Resolution path |
|----|----------|--------|-------|-----------------|
| OQ1 | P4 | 📦 CONVERTED — Ops ticket stub "Redeploy Hono Worker — WP-028 validator updates" | Ops team | Routine `wrangler deploy` with current Hono bundle; unblocks prod variants PUT; tracked in project ops queue |
| OQ2 | P4 | ✅ RESOLVED — `9042490a` + `48da60c4` smoke | Phase 5 Ruling HH | `updateBlockSchema.nullable()` + Studio payload null + Hono forward (Case A zero-touch) + tools/block-forge fs parity + 6 integration test pins + live DB+HTTP smoke |
| OQ3 | P4 | ✅ RESOLVED — `fc8ed555` (Path B — config fix + docs) | Phase 6 Ruling NN | Root cause: `apps/studio/vite.config.ts:7` `envDir: '../..'` loads env from repo root; `/.env.local` gained `VITE_API_URL=http://localhost:8787`; `.context/CONVENTIONS.md` §Vite env resolution explains the envDir caveat |
| OQ4 | P4 | ✅ DEFERRED → `workplan/WP-029-heuristic-polish.md` Task A | WP-029 | Scope doc reference added at Phase 6 Close — Studio-side variant CSS scoping validator |
| OQ5 | P5 | ✅ RESOLVED — `fc8ed555` (Ruling MM) | Phase 6 | `composeTweakedCss` now runs in `handleSave` BEFORE `applySuggestions`; tweak-only saves persist composed CSS; integration pin asserts `@container` chunk in saved css; Studio zero-touch (`ResponsiveTab.tsx:151-152` symmetric via `dispatchTweakToForm → setValue('code', ..., { shouldDirty })`) |
| OQ6 | P5 | ✅ DEFERRED → `workplan/WP-029-heuristic-polish.md` Task B | WP-029 | Scope doc reference added at Phase 6 Close — `<App />` render-level pins replacing Phase 5 contract-mirror harness |

---

## Full OQ texts + context

### OQ1 — Production Hono deployment lag 📦 CONVERTED

**Resolution status:** 📦 CONVERTED at Phase 6 Commit 1 (Ruling OO — ops-access-not-available → Path B ticket stub acceptable). Routine ops action, no WP-028 code blockage. Tracker entry: "Redeploy Hono Worker — WP-028 validator updates" (create formal ops ticket via project queue when next deploy window opens).

---

**Historical — OQ1 original description:**



**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #1

**Description:**
Current production Hono Worker (deployed to Cloudflare pre-Phase-4) does NOT persist `variants` on PUT because the Worker bundle was built before WP-028 validator changes landed. Studio dev session accidentally hit prod API instead of local (env-resolution quirk per OQ3), so the PUT silently succeeded but DB `variants` stayed null. Verification of first real DB write was completed via direct-local-PUT against the same Supabase (local Worker with latest validator code).

**Why OUT-OF-SCOPE for WP-028:**
- Deployment action, not code change
- Local Worker + validator code is correct; only the production bundle lags
- Redeployment is a routine ops task (`wrangler deploy` or equivalent)
- Does not block Phase 5/6 code work
- Variants actively write correctly once Worker updated — no code path needs hardening

**Resolution path:**
Separate ops ticket to redeploy Cloudflare Worker with current Hono bundle. Coordinate with Phase 6 Close OR before next user-facing release.

**Exit criteria:**
- Production Hono endpoint accepts + persists variants on PUT
- Phase 4 direct-local-PUT smoke rerun against PROD endpoint — variants persist

**Blocking:** None for WP-028 phases; blocks **real user variant save via production Studio** (authors using deployed Studio against deployed Hono get silent null writes).

---

### OQ2 — `updateBlockSchema.nullable()` for variants clear-signal ✅ RESOLVED

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #2

**Description:**
`updateBlockSchema` accepts `variants: variantsSchema.optional()` but not `.nullable()`. Studio's `formDataToPayload` emits `variants: undefined` when `Object.keys(data.variants).length === 0` (per block-editor.tsx L167-179). When author deletes all variants via drawer:
1. `form.variants = {}` (empty record)
2. Payload `variants: undefined` (hasVariants check false)
3. Hono handler sees missing `variants` field → Supabase update skips it → **DB keeps old variants**
4. Author sees "0 variants" in UI; Portal still renders old variants from DB

**Silent data inconsistency** — UI diverges from DB + Portal on variant-delete-all flow.

**Status:** ✅ **RESOLVED at commit `9042490a`** (Phase 5 Ruling HH — atomic fix across all 4 sites).

**What shipped:**
1. `packages/validators/src/block.ts` — `variants: variantsSchema.nullable().optional()` on both `createBlockSchema` + `updateBlockSchema`
2. `apps/studio/src/pages/block-editor.tsx` — `formDataToPayload` emits `variants: null` on empty (+ `export` keyword so tests can pin directly)
3. `apps/api/src/routes/blocks.ts` — **zero-touch** (pre-flight confirmed Case A: handler spreads `parsed.data` into Supabase; `null` forwards automatically once validator accepts it)
4. `tools/block-forge/src/App.tsx` — `handleSave` emits `variants: null` on empty (Ruling LL — JSON.stringify preserves key); `BlockJson.variants?: BlockVariants \| null` widening in `types.ts`
5. Integration pins: 4 block-forge pins (tweak-only / variant-only / mixed / OQ2) + 2 Studio pins (OQ2 + positive control)

**Verification (tsx-inline validator check):**
```
update null:    true       ← {variants: null} accepted (post-Phase-5)
update obj:     true       ← {variants: {sm: {...}}} accepted (unchanged)
update missing: true       ← {} accepted (still .optional())
create null:    true       ← {slug, name, html, variants: null} accepted (post-Phase-5)
```

**Live DB smoke:** deferred to Phase 6 Close — production Hono Worker predates WP-028 validator changes (OQ1) so live PROD PUT would reject `{variants: null}` until redeployed. OQ1 resolution + OQ2 live-smoke close in one step at Phase 6.

**Exit criteria (achieved):**
- ✅ Delete all variants → payload `variants: null` (Studio unit pin + block-forge integration pin)
- ✅ JSON.stringify round-trip preserves `"variants":null` (Ruling LL)
- ✅ Validator accepts null on create + update
- ⏳ Live Supabase row NULL verification — bundled with OQ1 Phase 6 step (Worker redeploy)

---

### OQ3 — Studio `VITE_API_URL` .env vs .env.local resolution ✅ RESOLVED

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #3

**Description:**
During Phase 4 Playwright smoke, Studio dev session hit production API (`cmsmasters-api.office-4fa.workers.dev`) instead of local (`http://localhost:8787`), even though `apps/studio/.env.local` contained `VITE_API_URL=http://localhost:8787`. Vite env-loading precedence expected `.env.local` to override `.env`, but actual behavior chose `.env`.

**Status:** ✅ RESOLVED at Phase 6 Commit 1 (Path B — config fix + docs per Ruling NN).

**Root cause (Phase 6 pre-flight finding):**
`apps/studio/vite.config.ts:7` sets `envDir: '../..'` — Vite loads env files from **repo root**, NOT from `apps/studio/`. Files inside `apps/studio/.env*` are silently ignored. The committed repo-root `/.env` has `VITE_API_URL=https://cmsmasters-api.office-4fa.workers.dev` (prod); repo-root `/.env.local` had NO `VITE_API_URL` entry → prod value wins. This is NOT a Vite bug — it's a deliberate monorepo convention (shared env across dashboard/admin/studio/command-center) that was undocumented.

**What shipped (Phase 6 Commit 1):**
1. `/.env.local` — appended `VITE_API_URL=http://localhost:8787` (author's local override; gitignored)
2. `.context/CONVENTIONS.md` — added §Vite env resolution subsection explaining the `envDir: '../..'` convention + where VITE_* actually lives + workaround for future devs

**Exit criteria (achieved):**
- ✅ Root-cause documented in CONVENTIONS.md
- ✅ Local override committed to author's `.env.local` (propagates per-dev via docs)
- ✅ Phase 6 result log cross-references findings

---

### OQ5 — Tweak-compose-on-save gap ✅ RESOLVED

**Resolution status:** ✅ RESOLVED at Phase 6 Commit 1 (Ruling MM — 3-line fix + integration pin). Historical description retained below for traceability; Studio OQ5 audit confirmed SYMMETRIC/CORRECT (no Studio code change needed).

**What shipped (Phase 6 Commit 1):**
1. `tools/block-forge/src/App.tsx` handleSave L271-277 — composeTweakedCss now runs on `block.css` BEFORE `applySuggestions` when `session.tweaks.length > 0`. Tweak-only saves persist composed CSS.
2. `tools/block-forge/src/__tests__/integration.test.tsx` — new `Phase 6 — OQ5 tweak-compose-on-save regression pin` describe block with `assembleSavePayloadV2` harness mirroring the fixed handleSave. Pin asserts `@container slot (max-width: 480px)` chunk + tweak property:value in saved css.
3. Studio zero-touch per pre-flight step 2: `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx:151-152` — `const nextCss = emitTweak(tweak, css)` → `form.setValue('code', assembleCode(nextCss, html), { shouldDirty: true })`. Tweaks land in `form.code` at dispatch time; save serializes form.code verbatim. Symmetric path; no fix required.

---

**Historical — OQ5 original description (pre-resolution):**



**Source:** `logs/wp-028/phase-5-result.md` §Open Questions for Phase 6+; `tools/block-forge/src/App.tsx` L146-305 code review.

**Description:**
`composeTweakedCss(block.css, session.tweaks)` runs in the render-time `composedBlock` memo (App.tsx L146-153) feeding the preview iframe. Inside `handleSave` (L256-305), the save payload uses `applied.css` (either `applySuggestions` output or raw `block.css`) — `composeTweakedCss` is **NOT** called. A tweak-only session save therefore persists base CSS with the author's tweak lost on next reload.

**Impact:**
Author composes tweaks in Responsive tab → sees them in preview → clicks Save → tweaks disappear from persisted file/DB on next reload. Authoring loop silently breaks for tweak-only edits on block-forge; Studio flow likely asymmetric (needs audit — Studio writes `form.code` via `dispatchTweakToForm`, which goes through `emitTweak` PostCSS mutation).

**Why PARKED (not Phase 5):**
- Phase 4 carve-out fix scope was "save proceeds at all" (Bug A) — fixed.
- This concern is "save preserves tweak composition" (Bug B) — separate bug class never in Phase 4 scope.
- Requires code change in `handleSave` + parity audit of Studio flow + new integration pins.

**Status:** ⏳ PARKED — Phase 6 Close OR WP-029 candidate.

**Resolution path:**
1. Extend `tools/block-forge/src/App.tsx` `handleSave` L277-288 to compose tweaks into applied CSS: `const tweakedCss = session.tweaks.length > 0 ? composeTweakedCss(applied.css, session.tweaks) : applied.css`; then `updatedBlock.css = tweakedCss`.
2. Audit Studio parity: does `dispatchTweakToForm → setValue('code', ..., { shouldDirty: true })` land `emitTweak` output in `form.code` CSS region correctly before `formDataToPayload` serializes? If yes, asymmetric (block-forge-only bug); if no, symmetric (both surfaces need the fix).
3. Add integration pin in both surfaces' `__tests__/integration.test.tsx` asserting saved CSS contains tweak-composed `@container` chunks.

**Exit criteria:**
- Both surfaces' save path writes tweak-composed CSS to persistence.
- Integration pin pin both `integration.test.tsx` files — save-output-contains-@container-chunk assertion.

**Blocking:** None for Phase 5 close; blocks **tweak-only authoring workflow** on block-forge (tweak-preview diverges from tweak-saved).

---

### OQ6 — Phase 5 regression pins are contract-mirror, not production-render ✅ DEFERRED → WP-029

**Resolution status:** ✅ DEFERRED at Phase 6 Commit 1 → `workplan/WP-029-heuristic-polish.md` Task B (Ruling PP). Phase 5 contract-mirror pins remain in place as documentation; Phase 6 OQ5 pin extends the same harness pattern. WP-029 Task B replaces the harness with `<App />` render tests.

---

**Historical — OQ6 original description (pre-deferral):**



**Source:** `logs/wp-028/phase-5-result.md` §Open Questions; pin strategy decision trade-off.

**Description:**
Phase 5 carve-out regression pins (3 block-forge tests in `integration.test.tsx`) exercise `assembleSavePayload` — a test-local function mirroring App.tsx `handleSave` payload-assembly. If production `handleSave` drifts away from the mirror (e.g. re-introduces `if (accepted.length === 0) return` early-return), the pins do NOT fire — they exercise the harness, not production code.

**Why the compromise:**
Mounting `<App />` in tests requires mocking `apiClient.saveBlock`, `apiClient.getBlock`, `apiClient.fetchSourceDir`, the BlockPicker component's data fetch, plus jsdom stubs for ResizeObserver / PointerCapture. Non-trivial scaffolding; task prompt §5.3 scoped pins inline to preserve arch-test Δ0 and avoid Phase 3/3.5/4 territory churn.

**Status:** ⏳ PARKED — Phase 6 Close OR WP-029 candidate.

**Resolution path:**
1. Add a single `<App />` render test in `tools/block-forge/src/__tests__/integration.test.tsx` or a new dedicated file (arch-test budget permitting).
2. Mock the 3 api-client calls + fs middleware; exercise real `handleSave` via user-event click on Save button with sessions in each carve-out shape (tweak-only / variant-only / mixed).
3. Unit-level contract pins (this phase) remain as documentation; production-render pin becomes the authoritative regression gate.

**Exit criteria:**
- One `<App />` render test per carve-out scenario, exercising real production handleSave path.
- Contract-level pins from Phase 5 remain for documentation.

**Blocking:** None; Phase 5 contract pins cover the common regression vector and session-level `isDirty` semantics are independently tested in `session.test.ts`.

---

### OQ4 — Studio-side variant CSS scoping validator warning ✅ DEFERRED → WP-029

**Resolution status:** ✅ DEFERRED at Phase 6 Commit 1 → `workplan/WP-029-heuristic-polish.md` Task A (Ruling PP). WP-029 stub created with full scope context.

---

**Historical — OQ4 original description:**



**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #4

**Description:**
Portal's `renderBlock` (apps/portal/lib/hooks.ts L222-224) inlines variant CSS verbatim without auto-scoping to `[data-variant="NAME"]` — per ADR-025 convention, authors write reveal rules themselves. Phase 4 smoke caught this the hard way: first test variant CSS (`.block-fast-loading-speed { background: red }` un-scoped, no reveal rule) leaked to base variant. Real-world authors will make the same mistake.

**Proposal:** Studio-side validator warns at edit time when variant CSS lacks either:
- `[data-variant="NAME"]` prefix scoping, OR
- `@container slot (max-width: Npx) { ... }` reveal rule

**Status:** 🚫 DEFERRED → WP-029

**Why DEFERRED (not Phase 5):**
- UX improvement, not MVP functional bug
- Requires CSS parser + heuristic rule — non-trivial scope (~3-5h own)
- Natural fit for WP-029 heuristic polish (which is already planned per WP-028 workplan §Dependencies as follow-up WP informed by real tweak/variant authoring usage)
- No data-loss risk — only UX frustration

**Resolution path:**
Logged in WP-029 scope document. WP-029 task-prompt writing (future) references this OQ.

**Exit criteria:**
- WP-029 workplan includes a task titled "Variant CSS scoping validator warning"
- WP-029 Phase 0 RECON cites this OQ as source

---

## Phase 6 Close verification checklist

Before WP-028 can be marked ✅ DONE in Phase 6:

- [x] **OQ1** — 📦 CONVERTED at Phase 6 Commit 1 (Ruling OO — ops ticket stub: "Redeploy Hono Worker — WP-028 validator updates") ✅
- [x] **OQ2** — Resolved at Phase 5 commit `9042490a` + `48da60c4` smoke with Phase 5 result log cross-referencing this file ✅
- [x] **OQ3** — ✅ RESOLVED at Phase 6 Commit 1 (Path B — config fix `/.env.local` + docs `.context/CONVENTIONS.md` §Vite env resolution)
- [x] **OQ4** — ✅ DEFERRED at Phase 6 Commit 1 → `workplan/WP-029-heuristic-polish.md` Task A (referencing this entry)
- [x] **OQ5** — ✅ RESOLVED at Phase 6 Commit 1 (Ruling MM — `composeTweakedCss` in handleSave + integration pin + Studio zero-touch audit)
- [x] **OQ6** — ✅ DEFERRED at Phase 6 Commit 1 → `workplan/WP-029-heuristic-polish.md` Task B (referencing this entry)

Failure mode: any unchecked box at Phase 6 = WP-028 CANNOT mark DONE until resolved or explicitly re-deferred in this file with new target (e.g. "OQ3 moved to WP-030" with rationale).

**Phase 6 Commit 1 landing:** all 6 boxes ticked — OQ2/3/5 RESOLVED with code+docs+SHA; OQ1 CONVERTED to ops ticket stub; OQ4/6 DEFERRED to WP-029 scope doc. WP-028 cleared for ✅ DONE flip pending Phase 6 Commit 2 doc propagation (approval-gated per Ruling QQ) + Commit 3 result log.

---

## Amendment history

| Date | Phase | Change |
|------|-------|--------|
| 2026-04-24 | P4 close | Initial registry created — OQ1–OQ4 enumerated with status + resolution paths |
| 2026-04-24 | P5 landing | OQ2 flipped to ✅ RESOLVED — commit `9042490a` (feat + tests + PARITY.md + CONVENTIONS.md). Validator `.nullable().optional()` on create + update; Studio payload `null` on empty; Hono Case A confirmed (zero-touch spread); tools/block-forge fs parity with null; 6 integration pins (4 block-forge: tweak-only / variant-only / mixed / OQ2-clear; 2 Studio: OQ2-clear + positive control); §Dirty-state contract table byte-identical both PARITY.md; CONVENTIONS.md §6 cross-tab note. OQ5 (tweak-compose-on-save gap) + OQ6 (contract-pin-not-production-render) added as Phase 6 / WP-029 candidates. OQ1/OQ3/OQ4 rows unchanged per hard gate. |
| 2026-04-24 | P5 smoke addendum | Commit `48da60c4` — live DB+HTTP smoke for AC 8 (OQ2 live evidence). 2-leg smoke (Supabase SQL library + Hono HTTP transport); `phase-5-result.md` addendum; smoke scripts in `logs/wp-028/smoke-p5/`. |
| 2026-04-24 | P6 Commit 1 landing | 5 of 6 OQs flipped in single atomic commit (Rulings MM/NN/OO/PP). **OQ5 ✅ RESOLVED** — `composeTweakedCss` added to `tools/block-forge/src/App.tsx` handleSave BEFORE `applySuggestions` (3-line + comment); Phase 6 regression pin in `integration.test.tsx` asserts `@container` chunk in saved css (Ruling KK); Studio zero-touch confirmed via pre-flight step 2 (ResponsiveTab.tsx:151-152 symmetric). **OQ3 ✅ RESOLVED** — Path B: root cause `apps/studio/vite.config.ts:7` `envDir: '../..'` loads env from repo root; `/.env.local` gained `VITE_API_URL=http://localhost:8787` (gitignored); `.context/CONVENTIONS.md` §Vite env resolution documents the envDir convention for future devs. **OQ1 📦 CONVERTED** — ops ticket stub "Redeploy Hono Worker — WP-028 validator updates" (Ruling OO; no deploy access this phase). **OQ4 + OQ6 ✅ DEFERRED** — created `workplan/WP-029-heuristic-polish.md` stub with Task A (OQ4 variant CSS scoping validator, ~3-5h own) + Task B (OQ6 `<App />` render-level pins, ~1-2h own) + Task C (original WP-029 heuristic polish scope). Phase 6 verification checklist all 6 boxes ticked; WP-028 cleared for ✅ DONE flip pending Commit 2 (doc propagation, approval-gated per Ruling QQ) + Commit 3 (result log). |
| 2026-04-24 | P6 Commit 2 | Doc propagation under Ruling QQ approval gate — commit `bb3309dc` (8 files: BRIEF + CONVENTIONS 3 subsections + infra-tooling SKILL Tweaks+Variants section + studio-blocks SKILL Tweaks+Variants section + 2 PARITY §Tweak-compose-on-save flip + Discipline Confirmation + BLOCK-ARCH-V2 header line + WP-028 workplan ✅ DONE flip). 5 Brain inline corrections applied during staging: phase enumeration 6→7 (Phase 1 Foundation scaffolding added), OQ4-identifier overload resolved ("live-read invariant" not "OQ4 invariant" in studio-blocks SKILL). arch-test 499/0 preserved (docs-only). |
| 2026-04-24 | P6 Commit 3 | Result log `logs/wp-028/phase-6-result.md` + final SHA cross-reference. OQ3/OQ5 rows carry `fc8ed555` (Commit 1). WP-028 cleared ✅ DONE. Final green gates: arch-test 499/0, typecheck clean, Studio 104 / block-forge 133 tests. |
