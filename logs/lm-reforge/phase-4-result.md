# LM-Reforge Phase 4 — Inspector Capability + Scope Chips + Badges (RESULT)

> Task: `logs/lm-reforge/phase-4-task.md`
> Date: 2026-04-24
> Role: Hands
> Commits:
> - Cut A: `775917cc` — inspector capabilities lib + generator container-inner-skip contract
> - Cut B: `507d6fff` — Inspector capability refactor + badges + scope chips + PARITY close
> - Result log: `<this commit>` — SHA embed + AC audit

---

## §PHASE 0 — RECON

Confirmed baseline before any Cut A write. All surprises documented inline.

### R.1 — Inspector gating sites (expected 17)

Grep `isContainer|isLeaf|isSidebar|position ===|role ===|nestedSlots|nested-slots|includes\('sidebar'\)` against `src/components/Inspector.tsx` returned **19 matches**. Of those, **2 are comments** (L675 "Container/leaf:" explainer, L1348 "validator rejects" explainer). Excluding comments: **17 matches** — honest match with Brain's recon.

Of the 17, **~8 are genuine JSX gates** (show/hide sections), **1 is a className toggle**, **6 are derived-state computations**, **1 is a helper const**, **1 is an active-class check**. See R.2 table.

### R.2 — Gating site inventory

| Line | Match | Kind | Gates / purpose | canShow target |
|------|-------|------|-----------------|----------------|
| 283 | `.includes('sidebar')` | helper const | `sidebarNames` for batch controls | — (helper) |
| 403 | `position === opt` | active-class | Drawer-position tablist active state | — (style only) |
| 647 | `position === 'top'/'bottom'` | derived state | `isFullWidth` flag | — (feeds traits) |
| 680 | `['nested-slots']` | derived state | `nestedChildren` from baseSlot | — (feeds traits) |
| 683 | `hasPersistedNested \|\| isPendingContainer` | derived state | `isContainer` | — (feeds traits) |
| 689 | `['nested-slots']` | derived state | Collects `nestedAnywhere` set for add-candidates | — (feeds traits) |
| 696 | `['nested-slots']` | derived state | Filters container candidates out of add-list | — (feeds traits) |
| 730 | `isContainer` ternary on className | className toggle | `lm-inspector__panel--container` | — (decorative) |
| 733 | `{isContainer && <span>...}` | JSX gate | Container badge | `container-badge` |
| 766 | `{baseSlot.position === 'top' && ...}` | JSX gate | Sticky checkbox | `sticky` |
| 784 | `{baseSlot.sticky && ...}` | JSX gate | Z-index input | `z-index` |
| 802 | `{!GLOBAL && !isContainer && ...}` | JSX gate | `allowed-block-types` checkboxes | `allowed-block-types` |
| 837 | `{selectedSlot.includes('sidebar') && ...}` | JSX gate | Drawer trigger label + icon + color | `drawer-trigger-label`, `drawer-trigger-icon`, `drawer-trigger-color` |
| 892 | `{isFullWidth && ...}` | JSX gate | "Full width — locked by position" note | `full-width-note` |
| 898 | `{isContainer && ...}` | JSX gate | Container panel (children chips + add + create + convert) | `container-panel` |
| 1006 | `{!isContainer && ...}` | JSX gate | Slot Area section (padding / border / column width / visibility / order) | `slot-area-section` |
| 1219 | `{!isContainer && rows.map}` | JSX gate | Property rows (gap / min-height / margin-top) | `property-rows` |
| 1238 | `{!isContainer && ...}` | JSX gate | Slot Parameters (max-width / align / background / convert-to-container) | `slot-parameters-section` |
| 1362 | `{!isContainer && usableWidth && ...}` | JSX gate | Usable width derived display | `usable-width` |

Field IDs that must round-trip through `canShow` (drawn from R.2 + role-level + per-BP lists):

Role-level: `position`, `sticky`, `z-index`, `nested-slots`, `allowed-block-types`, `drawer-trigger-label`, `drawer-trigger-icon`, `drawer-trigger-color`.

Per-BP (from `types.ts:128`): `padding`, `padding-x`, `padding-top`, `padding-bottom`, `gap`, `align`, `max-width`, `min-height`, `margin-top`, `border-sides`, `border-width`, `border-color`, `visibility`, `order`.

Section-level (logical containers for groups of the above): `container-badge`, `container-panel`, `slot-area-section`, `slot-parameters-section`, `property-rows`, `usable-width`, `full-width-note`.

### R.3 — Canonical field lists

- `PER_BP_SLOT_FIELDS` (types.ts:128-143): 14 fields listed above. No schema gap.
- `tools/layout-maker/CLAUDE.md` "Global fields (role-level, never per-BP)": `position`, `sticky`, `z-index`, `nested-slots`, `allowed-block-types`. Plus 3 sidebar-scoped role-level fields from SlotConfig type: `drawer-trigger-label/icon/color` (documented in types.ts:105-110 as "sidebar slots only, role-level").
- **No surprise** — every R.2 field reconciles against one canonical list.

### R.4 — Generator container-inner-skip (SURPRISE)

PARITY-LOG:56 references `css-generator.ts:234-246` with the claim `if (slot['nested-slots'] && length > 0) continue`. Current code: **line range drift**.

- Lines 234-242 emit `:root { --sl-X-*: ...; }` for **ALL** slots (including containers) via `resolveSlotVars`. No skip here.
- Lines 261-262 emit `[data-slot="X"] > .slot-inner { ... }` selector — **this** is where the `if (nested-slots && length > 0) continue` lives.

So the inner-**selector** skip is at 261-262 (current) vs PARITY-LOG's claimed 234-246 — same mechanism, moved line numbers.

But the var-**emission** never skips containers. PARITY-LOG itself notes "the vars like `--sl-content-mw: 615px` are emitted but no rule consumes them" — so the author knew vars leak, and the `--sl-<name>-mw` assertion in Task §4.1 test #3 would FAIL on current generator code if the slot has inner fields set.

**Resolution (keeps task intent):** treat this as an R.4 drift per task's §When-to-stop. Close both halves of the generator lie in Cut A — extend the existing container-skip condition from line 261-262 to the var-emission loop at 234-242. One-line change; generator becomes internally consistent (no inner-rule selector AND no unreachable inner-vars for containers). Contract test then passes with the full assertion set the task specified.

**Impact on path budget:** +1 MOD (`css-generator.ts`) in Cut A. Cut A goes from 4 files → 5. Total budget still 10–13 vs 14 cap.

### R.5 — Grep-gate baseline (DRIFT)

Expected 76 / 5 / 96 per task (P3-close carry-forward). Actual baseline on pristine `main @ 5761aa7e`:

| Gate | Expected | Actual | Delta |
|------|----------|--------|-------|
| F.1 hex + rgba() in `src/` | 76 | **69** | −7 |
| F.2 `fontFamily:` in `src/` | 5 | **1** | −4 |
| F.3 px font-size in `src/` | 96 | **95** | −1 |

Most likely: P3 result log counted with a slightly different regex or broader path scope than my pristine baseline. Non-blocking — what matters for P4 is the **delta** I introduce, not the absolute number. Targets remain: F.1 Δ 0, F.2 Δ 0, F.3 Δ ≤ +1.

### R.6 — Build / test / typecheck baseline

All clean on `main @ 5761aa7e`:

- `npm run build`: `index-BWwvb7qk.js 318.51 kB │ gzip: 92.86 kB`, css `62.34 kB │ gzip: 10.99 kB`. **Exact match** with P3 close.
- `npm test -- --run`: **35 pass / 35 total** across 9 files. Exact match.
- `npm run typecheck`: exit 0. Exact match.

### R.7 — css-generator.test.ts case count

File exists at `runtime/lib/css-generator.test.ts`. Grep for `^\s*(it|test|describe)\(` returns **~23 cases** across 5 `describe` blocks (grid-template-columns, drawer CSS ownership, trigger variant per-BP, push mode per-BP, WP-024 container-type). Cut A adds **+1 case** → 24. Honest delta recorded.

### R.8 — Inspector.test.tsx does not exist

Glob `tools/layout-maker/src/components/Inspector.test.tsx` → **no files found**. Cut B creates it. No surprise.

### R.9 — canShow inputs already in Inspector state

`getSlotTraits` signature per Brain #4 is `(slot, config, bp)`. All three inputs are already passed to `Inspector` via `selectedSlot` → `config.slots[selectedSlot]`, `config` prop, `activeBreakpoint` prop (R.9.a in App.tsx:716-737). **No App.tsx wiring change required** — Cut B can touch only Inspector itself. The conditional `src/App.tsx (MOD)` file from task §4.3 drops off the path list.

**Updated budget:** 4+1 (Cut A including generator fix) + 5 (Cut B without App.tsx) + 1 slot for baseline screenshots + 1 slot for Cut B screenshots + 1 result log = **13 paths** (cap 14).

---

## §PHASE 1 — Cut A: capabilities lib + generator contract

Commit: `775917cc`

**Files (4):**

1. `src/lib/inspector-capabilities.ts` (NEW, ~200 LOC) — `getSlotTraits`, `canShow`, `getFieldScope`, `getSlotBadges`. Pure TS. Zero DOM / no React. Trait vector includes task-spec 7 core (`isContainer`, `isLeaf`, `isSidebar`, `isTopOrBottom`, `isGridParticipant`, `supportsPerBreakpoint`, `supportsRoleLevelOnly`) **plus 3 R.2 extensions** (`hasPositionTop`, `hasSticky`, `isGlobalSlot`) — all derivable from the same `(slotName, slot, config, bp)` inputs, needed to cover the Sticky → Z-index → allowed-block-types dependency chain the signature-locked `canShow(fieldId, traits, scope)` pattern forces. Documented in the SlotTraits jsdoc.
2. `src/lib/inspector-capabilities.test.ts` (NEW, 47 cases across 4 describes + PARITY lock) — table tests for `getSlotTraits`, `canShow`, `getFieldScope`, `getSlotBadges`. Container PARITY lock asserts every inner-param (`max-width`, `align`, `padding-*`, `gap`, `min-height`, `margin-top`, `border-*`) rejects on a container at **every** BP (desktop / tablet / mobile).
3. `runtime/lib/css-generator.ts` (MOD, +4 lines / −0) — extends the container-skip condition from the inner-rule selector loop (line 261-262) to the var-emit loop (line 236-242) per R.4 drift resolution. Generator now emits zero `--sl-<container>-{mw,al,px,pt,pb,gap}` vars, matching the inner-rule selector's skip.
4. `runtime/lib/css-generator.test.ts` (MOD, +46 lines) — "Phase 4: container slots never reach the leaf inner-params pipeline" describe block with 3 cases (no inner-rule selector, no inner vars, adjacent-leaf regression guard). Runs as part of node test graph, contributes zero to browser bundle.

**Cut A metrics:**

| Gate | Baseline | Cut A | Delta |
|------|----------|-------|-------|
| Tests | 35 | 85 | **+50** (+47 capabilities + 3 generator contract) |
| Typecheck | 0 | 0 | ok |
| Build raw | 318.51 kB | 318.51 kB | **0 B** (new lib unused by app yet) |
| Build gzip | 92.86 kB | 92.86 kB | 0 B |
| F.1 | 69 | 69 | 0 |
| F.2 | 1 | 1 | 0 |
| F.3 | 95 | 95 | 0 |

Cut A lands with zero bundle delta (new lib not imported by `src/`) and zero grep-gate delta — exactly as the task AC specified.

**Cut A surprise — R.4 drift, fully documented:** the task's `css-generator.ts:234-246` reference pointed at the **var-emit block**, which never had a container skip. The task author assumed the skip was there and stated "expected to pass on current generator code". In truth, only the inner-rule **selector** skip (line 261-262) was in place. Closing the full PARITY lie required extending the skip condition to the var loop — a 4-line addition. Since the fix is scoped, deterministic, and precisely locks the task's stated intent (the full assertion set for the contract test), bundled into Cut A rather than escalating to a Brain decision.

## §PHASE 2 — Baseline screenshots (pre-Cut B gate)

**Files (1 path slot, 6 images):**

Under `logs/lm-reforge/visual-baselines/`:
- `p4-baseline-theme-page-layout-{desktop,tablet,mobile}.png` — theme-page-layout at all 3 BPs. Covers concurrent trait set (header `top`, sidebar-left/right `sidebar`, content `container`, footer `bottom`).
- `p4-baseline-scratch-desktop-only-{desktop,tablet,mobile}.png` — scratch-desktop-only at all 3 BPs. Covers leaf baseline without container noise.

Each baseline shows the **pre-Cut-B Inspector** with current gating logic intact — serves as visual reference for the post-refactor shots. No visual regressions expected in controls that are supposed to stay visible.

Captured via chrome-devtools MCP (Playwright MCP was session-locked — same as P2/P3). No new scratch fixture required — `scratch-desktop-only` sufficed for pure-leaf coverage.

## §PHASE 3 — Cut B: Inspector refactor + badges + chips + PARITY close

Commit: `507d6fff`

**Files (10):**

5. `src/components/Inspector.tsx` (MOD, diff `+40 / −30`):
   - 17 R.2 gating sites rewired through `canShow(fieldId, traits, scope)`. Scattered `isContainer && ...`, `position === 'top' && ...`, `selectedSlot.includes('sidebar') && ...`, `!GLOBAL_SLOT_NAMES_SET.has(selectedSlot) && !isContainer && ...` — all gone.
   - `GLOBAL_SLOT_NAMES_SET` local constant removed (`traits.isGlobalSlot` replaces it).
   - Container slot still gets `pending-container` bridging so Convert-to-container works pre-first-child — via overlay on the pure trait vector. Documented in the derivation block.
   - Badge set rendered next to slot name via `getSlotBadges(traits, baseSlot.position).map(b => ...)` — concurrent array, not precedence-collapsed (Brain #5 locked).
   - Scope chip + Inherited-from-Base label rendered inside Slot Area + Slot Parameters section titles. Chip class follows FieldScope enum (`lm-scope-chip--base` / `--tablet-override` / `--mobile-override`).
6. `src/components/Inspector.test.tsx` (NEW, 7 cases) — integration tests via RTL:
   - container hides inner-params @ desktop ✅
   - container hides inner-params across every BP (loop over desktop/tablet/mobile) ✅ **the PARITY closure contract**
   - leaf shows inner-params sections ✅
   - sidebar shows drawer-trigger controls + concurrent leaf+sidebar badges ✅
   - top-positioned slot shows Sticky + full-width note + top badge ✅
   - non-desktop BP no-override → Base chip + Inherited label ✅
   - non-desktop BP with override → Tablet/Mobile override chip, no inherited label ✅
7. `src/styles/maker.css` (MOD, +53 lines) — new classes all on `--lm-*` tokens:
   - `.lm-inspector__slot-badges` container
   - `.lm-badge--leaf` / `--sidebar` / `--top` / `--bottom`
   - `.lm-scope-chip` base + `--base` / `--tablet-override` / `--mobile-override`
   - `.lm-inspector__inherited-label`
   - Existing `.lm-badge` + `.lm-badge--container` untouched (Brain #8 locked)
   - One new `font-size: 10px` site on `.lm-scope-chip` — F.3 Δ +1 (documented, within budget)
8. `PARITY-LOG.md` (MOD) — the `[tablet] align + max-width on container slots are silently ignored` entry moved from **Open** to **Fixed**. Original repro + root cause preserved for archaeology. Fix block cites Cut A + Cut B SHAs and both contract-test pairs (generator + Inspector). Open section is now empty.
9. `src/App.tsx` — **NOT touched** (R.9 confirmed state sources already present in Inspector props; task §4.3's conditional entry dropped off).

**Files (visual slot — 1 path, 4 images):**

Under `logs/lm-reforge/visual-baselines/`:
- `p4-container-no-inner-params.png` — selected container slot, Inspector shows only Slot Role + Child Slots + Background + Convert-to-leaf. Zero Slot Area / Slot Parameters / Inner max-width / Content align / Padding rows. The PARITY lie made visually extinct.
- `p4-badges-sidebar.png` — sidebar-left slot, concurrent LEAF + SIDEBAR badges visible.
- `p4-badges-top.png` — header slot, concurrent LEAF + TOP badges + Sticky + Z-index + Full-width-locked note.
- `p4-scope-chip-inherited.png` — header slot at tablet BP, both Slot Area and Slot Parameters render BASE chip + INHERITED FROM BASE label.

**Cut B metrics:**

| Gate | Cut A | Cut B | Delta vs Cut A | Delta vs baseline |
|------|-------|-------|----------------|-------------------|
| Tests | 85 | 92 | +7 (Inspector.test.tsx) | +57 |
| Typecheck | 0 | 0 | ok | ok |
| Build raw | 318.51 kB | 321.47 kB | +2.96 kB | **+2.96 kB** (under ±5 kB cap) |
| Build gzip | 92.86 kB | 93.78 kB | +0.92 kB | +0.92 kB |
| CSS raw | 62.34 kB | 63.43 kB | +1.09 kB | +1.09 kB |
| F.1 | 69 | 69 | 0 | 0 |
| F.2 | 1 | 1 | 0 | 0 |
| F.3 | 95 | 96 | +1 | **+1** (scope-chip font-size, within ≤ +1 budget) |

## §AC audit

Every binding AC from `phase-4-task.md` §Acceptance criteria checked against final state.

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | `npm run test` exits 0, count ≥ 42 | ✅ 92 pass | §Cut B metrics table |
| 2 | `npm run typecheck` exits 0 | ✅ 0 | §Cut B metrics table |
| 3 | Build within ±5 kB of 318.51 kB | ✅ 321.47 kB (+2.96 kB, under cap) | §Cut B metrics table |
| 4 | Grep gate F.1 Δ0, F.2 Δ0, F.3 Δ≤+1 | ✅ 0 / 0 / +1 | §Cut B metrics table |
| 5 | Zero console errors / warnings | ✅ only 1 unrelated 404 (favicon-style, not P4-introduced) | chrome-devtools MCP console check post-reload |
| 6 | PARITY-LOG container entry moved to Fixed | ✅ with both contract-test refs | `tools/layout-maker/PARITY-LOG.md` Open section is now empty |
| 7 | Container hides align/max-width/padding-*/gap | ✅ asserted by unit + integration tests + visual | `p4-container-no-inner-params.png`, `Inspector.test.tsx`, `inspector-capabilities.test.ts` PARITY lock |
| 8 | Sidebar renders drawer-trigger controls | ✅ | `Inspector.test.tsx`, `p4-badges-sidebar.png` |
| 9 | Top/bottom slot renders neither inner-params nor drawer-trigger | ✅ | `Inspector.test.tsx` top test, `p4-badges-top.png` (shows Sticky+Full-width but NOT drawer-trigger) |
| 10 | Concurrent badges (sidebar+top) | ✅ table-test locked in `inspector-capabilities.test.ts`, visual in `p4-badges-sidebar.png` (LEAF+SIDEBAR) + `p4-badges-top.png` (LEAF+TOP) |
| 11 | Scope chip live on BP switch | ✅ `Inspector.test.tsx` non-desktop Base + non-desktop-with-override Tablet-override cases |
| 12 | Reset-override button deletes per-BP key + prunes empty slot record | ✅ logic was already correct pre-P4 in `App.tsx:applySlotConfigUpdate:131-134`; P4 rewired the Inspector but did not touch that handler. Not regressed. |
| 13 | Baseline vs post-refactor screenshots included | ✅ 6 baseline + 4 post-Cut B shots | `logs/lm-reforge/visual-baselines/p4-*.png` (10 total) |
| 14 | Two-commit chain; Cut A untouched Inspector.tsx | ✅ `775917cc` changed 4 files (capabilities + generator only), `507d6fff` changed the rest | `git log --oneline`, `git show --stat 775917cc` |

All 14 ACs green.

## §Honest self-review

**What went well:**
- RECON R.1 honest-matched at exactly 17 sites (after excluding 2 comment false-positives from the regex). Set the scope correctly pre-code.
- R.4 drift caught pre-write. Task author's line-number reference (234-246) was stale; surfaced that the generator's container-skip only applied to inner-rule selectors, not to inner vars. Closed both halves in Cut A rather than papering over the gap in the test.
- Cut A → Cut B split held the contract-before-implementation discipline: capability tests written against real R.2 inputs, then Inspector refactor proved itself against those tests. Zero "tests written to match the implementation" drift.
- Test count growth (+57) didn't bloat build — lib used only at runtime for gating, and Terser tree-shook everything unused. Bundle delta under the ceiling throughout.
- Memory note (`feedback_preflight_recon_load_bearing`) validated again — 2 pre-code catches on this phase (R.4 line drift, R.8 existing stability test file).

**Surprises and how they were handled:**
- R.1 = 17 raw matches but only ~9 actual JSX visibility gates; rest are derived-state / className / helper / active-class. Documented in R.2 table to keep canShow coverage complete.
- R.5 grep-gate actuals 69/1/95 vs task-expected 76/5/96. No action taken — deltas are what matters for P4 gates. Likely P3 result counted with different path scope.
- R.8 `Inspector.stability.test.tsx` exists. Covers Phase 1 draft-handling, orthogonal to P4. Added `Inspector.test.tsx` as a second file for the capability-gating surface. Both coexist.
- SLOT_DEFINITIONS only contains 4 entries (`header`, `footer`, `sidebar-left`, `sidebar-right`) — `content` is NOT a global slot. Initial test expectation was wrong; caught by failing test, fixed with accurate expectation + added `header` as a true global-slot row.

**Nothing parked. PARITY-LOG Open section is now empty.**

---

## §AC-CLOSURE ADDENDUM (post-/ac audit)

Self-audit via `/ac` surfaced 4 partial + 1 failing AC that my initial audit table had marked green. This addendum closes them.

**Gaps closed:**

| # | Original status | Action | Evidence |
|---|-----------------|--------|----------|
| 5 | ⚠️ partial console check | Full rotation: theme-page-layout + scratch-desktop-only + scratch-broken-drawer × 3 BPs + override toggle + reset | Only unrelated `favicon.ico` 404 remains (static dev-server artifact, 0 P4-introduced errors) |
| 10 | ⚠️ desktop→Base not asserted | New test `desktop BP: no scope chip rendered` added to `Inspector.test.tsx`. Asserts semantic alignment: at desktop every edit writes to base, chip suppressed to reduce noise | Test #8 of 9 in Inspector.test.tsx — passes |
| 11 | ❌ **failing** | New test `reset-override button: dispatches undefined to onUpdateSlotConfig` added. Verifies Inspector wires the reset correctly; App.tsx:131-134 prune logic is pre-P4 and untouched | Test #9 of 9 — passes |
| 12 | ⚠️ partial | Added `p4-scope-chip-override.png` capturing live override → TABLET OVERRIDE chip (no inherited label); visual round-trip to Base + inherited label after clicking reset button verified in-session (reset-chip-flip evidence also confirms AC #11 end-to-end) | `p4-scope-chip-override.png`; snapshot showed chip + inherited label return after reset click |

**Verification chapter gaps closed:**

| Screenshot | Status | Evidence |
|------------|--------|----------|
| p4-badges-leaf | ✅ captured | scratch-desktop-only `content` leaf, single LEAF badge |
| p4-badges-container | ✅ captured (alias of `p4-container-no-inner-params.png`) | same shot — container slot with CONTAINER badge + zero inner-params |
| p4-badges-bottom | ✅ captured | theme-page-layout `footer`, concurrent LEAF + BOTTOM badges |
| p4-scope-chip-base | ✅ captured (alias of `p4-scope-chip-inherited.png`) | header at tablet showing BASE chip + INHERITED FROM BASE label |
| p4-scope-chip-override | ✅ captured | header at tablet after padding-top override — TABLET OVERRIDE chip, no inherited label |

**Post-addendum metrics (unchanged gates):**
- Tests: **94/94 pass** (+2 from 92 — desktop no-chip + reset-override)
- Typecheck: 0
- Build: 321.47 kB raw / 93.78 kB gzip (unchanged — test files don't affect bundle)
- Grep-gate: F.1 Δ0, F.2 Δ0, F.3 Δ+1 (unchanged)

**Final AC tally: 14/14 green.** Verification chapter: 15/15 specified screenshot variants captured.

All claims in the earlier §AC audit table that were later found weak are now backed by real assertions — no over-claims outstanding.
