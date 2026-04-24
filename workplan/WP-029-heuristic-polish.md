# WP-029: Heuristic polish — informed by real tweak/variant authoring

**Status:** PLANNING
**Prerequisites:** WP-028 ✅
**Created:** 2026-04-24
**Source:** WP-028 closed with follow-up enhancements surfaced in `logs/wp-028/parked-oqs.md`

---

## Scope (seeded from WP-028 OQs)

### Task A — Variant CSS scoping validator warning (OQ4 from WP-028)

**Problem:** Portal's `renderBlock` (`apps/portal/lib/hooks.ts` L222-224) inlines variant CSS verbatim without auto-scoping to `[data-variant="NAME"]` — per ADR-025 convention, authors write reveal rules themselves. WP-028 Phase 4 smoke caught the un-scoped leak the hard way: first test variant CSS (`.block-fast-loading-speed { background: red }` un-scoped, no reveal rule) leaked to base variant. Real-world authors will make the same mistake.

**Proposal:** Studio-side validator warns at edit time when variant CSS lacks either:
- `[data-variant="NAME"]` prefix scoping, OR
- `@container slot (max-width: Npx) { ... }` reveal rule

**Surface:** `apps/studio/src/pages/block-editor/responsive/VariantEditor.tsx` (WP-028 Phase 3 artifact) — show non-blocking warning banner beside the CSS textarea; link to ADR-025 convention docs.

**Estimated scope:** ~3-5h own (CSS parser — likely reuse PostCSS from block-forge-core — + heuristic rule + warning UI + tests).

**Source:** `logs/wp-028/parked-oqs.md` §OQ4

---

### Task B — App render-level regression pins (OQ6 from WP-028)

**Problem:** WP-028 Phase 5 carve-out regression pins exercise `assembleSavePayload` — a test-local function mirroring App.tsx `handleSave` payload-assembly. If production `handleSave` drifts away from the mirror (e.g. re-introduces `if (accepted.length === 0) return` early-return OR removes the Phase 6 `composeTweakedCss` step), the pins do NOT fire — they exercise the harness, not production code.

**Why the compromise:** Mounting `<App />` in tests requires mocking `apiClient.saveBlock`, `apiClient.getBlock`, `apiClient.fetchSourceDir`, the BlockPicker component's data fetch, plus jsdom stubs for ResizeObserver / PointerCapture. WP-028 task prompt §5.3 scoped pins inline to preserve arch-test Δ0 and avoid Phase 3/3.5/4 territory churn.

**Proposal:** Replace Phase 5 contract-mirror pins with `<App />` render tests in block-forge. Mock api-client + fs middleware; exercise real `handleSave` via user-event click on Save button with sessions in each carve-out shape.

**Scenarios:**
- Tweak-only save (Phase 2/4 carve-out + Phase 6 OQ5 compose-on-save)
- Variant-only save (Phase 3/4 carve-out)
- Mixed save (Phase 4 mixed carve-out)

**Estimated scope:** ~1-2h own (mock scaffolding + 3 render tests; contract-level pins from Phase 5 retained as documentation).

**Source:** `logs/wp-028/parked-oqs.md` §OQ6

---

### Task C — Heuristic polish (original WP-029 scope — informed by WP-028 usage)

Original WP-029 scope per `workplan/BLOCK-ARCHITECTURE-V2.md` §Phase 3 / §Dependencies: refine the six ADR-025 heuristics in `@cmsmasters/block-forge-core` based on real tweak/variant patterns observed during WP-028 authoring.

**Scope TBD after field data collection.** Candidate areas:
- Heuristic confidence tuning (too many false positives / negatives observed)
- New heuristics surfaced by actual author workflows
- `tokens.responsive.css` real token population (currently scaffold-only per `.context/CONVENTIONS.md` §Responsive tokens file)

---

## Source context

- `logs/wp-028/parked-oqs.md` — authoritative OQ registry (OQ4, OQ6)
- `workplan/WP-028-tweaks-variants-ui.md` — §Dependencies lists WP-029 as follow-up
- `logs/wp-028/phase-5-result.md` — carve-out pins + OQ5/OQ6 context
- `logs/wp-028/phase-6-result.md` — OQ5 resolution pattern (informs Task B mock scaffolding)
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — heuristic authoring invariants

---

## Phase 0 requirements (when WP-029 starts)

Per `feedback_preflight_recon_load_bearing.md` saved memory — Phase 0 RECON mandatory. Pre-flight audit topics:
- Confirm WP-028 end-state invariants still hold (arch-test 499/0 target preserved; WP-029 adds owned_files as needed)
- Confirm Phase 5 carve-out pins still pass (Phase 6 OQ5 fix may have altered harness baseline; reconcile)
- Confirm `composeTweakedCss` integration pin from WP-028 Phase 6 still green before Task B replaces it
- Inspect `apps/studio/src/pages/block-editor/responsive/VariantEditor.tsx` current state (may have evolved post-WP-028)

---

## Not in scope (explicit)

- Portal render changes — WP-028 validated cross-surface parity; portal render path is frozen at WP-024 level until new ADR
- Engine API surface changes — `packages/block-forge-core` 6-function surface is locked per `workplan/BLOCK-ARCHITECTURE-V2.md` §Phase 2
- Hono API validator changes — WP-028 Phase 5 closed `variants` nullable semantics; no further validator work here
