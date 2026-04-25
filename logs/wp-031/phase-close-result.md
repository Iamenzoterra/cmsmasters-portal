# WP-031 Close — Layout Maker Inspector UX Refactor (RESULT)

Date: 2026-04-25
Status: ✅ DONE (6 of 6 implementation phases shipped; P4b deferred as
optional follow-up)

## Outcome

The Inspector is restructured from a flat scroll of 21+ inline-styled
field rows into a navigable, dedup'd, rhythmically-tight workspace.
Every commit landed empirically green: 152 contract tests, 0 PARITY-LOG
open entries, no behavior regressions across 5 work phases + 4 hotfix
follow-ups.

This closes the original UX research finding that motivated WP-031:
"24 inline overrides + magic px corrupt visual rhythm; flat scroll hides
intent; control ownership leaks across panels".

## Phases shipped (commit chain)

| Phase | What landed | Commits |
|-------|-------------|---------|
| P0 RECON | UX research doc, 9 baseline screenshots, WP rewrite from cosmetic to workbench/IA refactor | `887aa78a` |
| P1-2 | Dedup + control ownership: SidebarMode/Drawer global controls moved to BreakpointBar popover, decorative glyphs dropped, inline BP-info row removed | `94ae54df` + `68ab3095` (popover anti-clip + focus ring hotfix) |
| P3 | Cluster architecture: 7 clusters per slot-state via native `<details>`/`<summary>`, capability dispatcher cluster IDs (additive, abstract + section-level layers), sticky title CSS | `0f004ad2` (cut A) + `90affe44` (cut B) + `32230d5b` (result log) + `57737a25` (orphan property-rows + empty cluster + sticky CSS hotfix) |
| P4 | Scope + override clarity: per-cluster override count chip + row tint via `:has(.lm-bp-dot)` + "Show overridden only" filter | `27e221dc` + `3ea6abb1` (filter BP-guard + count/filter source-of-truth align hotfix) |
| P5 | Shell responsiveness: Inspector overlay below 1280px (CSS media query, fixed position), toggle button in BreakpointBar, backdrop + Esc + click close | `dae4afef` + `cd44e96a` (toggle reachability + narrow notice hotfix) |
| P6 | Visual rhythm purge: 21 inline `style={{}}` → 2 (only dynamic color swatches), 11 new BEM modifier classes | `8dddfb82` |

Total: **15 commits across 6 phases + 5 hotfix passes**.

## Acceptance criteria audit

### Original WP-031 acceptance (per rewrite at 887aa78a)

#### P0 ✅
- [x] Research doc + workplan rewrite + baseline screenshots
- [x] No runtime change

#### P1-2 ✅
- [x] Selected-slot Inspector shorter (no duplicate BP info)
- [x] No editable field disappeared
- [x] BreakpointFooter remains source of truth
- [x] Global sidebar/drawer controls moved out of selected-slot scroll
- [x] Same callback paths preserved (verified by stability test)

#### P3 ✅
- [x] Every visible field has semantic owner (7 slot-state clusters + 2 empty-state clusters)
- [x] Cluster titles are real disclosure affordances (`<details>` + chevron rotates on `[open]`)
- [x] Old visible field matrix preserved (PARITY guard active)
- [x] Keyboard works through native disclosure (Space/Enter on summary)

#### P4 ✅
- [x] Base BP reads neutral (no count chip)
- [x] Tablet/mobile no-override → "Inherited from Base" label
- [x] Overridden rows visible at glance (2px BP-hued left rail)
- [x] Reset controls remain attached to correct rows
- [x] Filter toggle works
- [x] (Hotfix) Filter doesn't strand operator on desktop
- [x] (Hotfix) Count + filter source-of-truth aligned

#### P5 ✅
- [x] Canvas > 0px at 390px (was 0px — RECON failure resolved)
- [x] Canvas > 0px at 1024px (was 504, now 784)
- [x] Inspector reachable at all tested widths (overlay + toggle)
- [x] Esc + backdrop click close overlay
- [x] (Hotfix) Toggle reachable at 390px (flex-wrap)
- [x] (Hotfix) Narrow notice present at <768px (was task-spec acceptance)

#### P6 ✅
- [x] `style={{` count in Inspector.tsx: 21 → 2
- [x] Magic pixel margin rhythm replaced with token-driven classes
- [x] Controls align consistently across clusters
- [x] No PARITY change

#### P4b ⏸ (Optional follow-up)
- [ ] Drawer trigger modal extraction
  Reason: WP §non-goals didn't list it as blocker for close. Sidebar slots
  with drawer triggers still work — only inline space remains slightly larger
  than the eventual modal would yield. Worth doing as polish, not as P4b
  before WP close.

### Style-hygiene gate (CLAUDE.md F.3 Shared-Selector Convention)

Baseline (post-LM-Reforge P7a): F.1 = 76, F.2 = 5, F.3 = 93.
WP-031 close (`8dddfb82`): F.1 = 76, F.2 = 5, **F.3 = 98 (+5)**.

Honest accounting per phase:
- P3 cluster: `.lm-inspector__cluster-label` joined existing P5 shared rule → Δ 0
- P3 hotfix sticky: no new font-size
- P4 scope clarity: `.lm-cluster-count` (10px) + `.lm-filter-toggle` (11px) added as separate rules → +2
- P5 shell: `.lm-narrow-notice` (11px) added as separate rule → +1
- P6 rhythm: `.lm-inspector__checkbox-label` (12px) + `.lm-btn--inline-pill` (11px) added as separate rules → +2

**Total Δ F.3: +5 (93 → 98).**

The +5 are all new sizes (10/11/12) that don't fit the existing 11px
small-caps shared rule's value. Per CLAUDE.md F.3 convention, "If a new
site does not fit an existing shared rule, it is `legitimate-unique` —
document it in the phase result log." All 5 are documented above.

A future cleanup phase could collapse the four 11px declarations into a
single new shared rule (`.lm-cluster-count, .lm-filter-toggle,
.lm-narrow-notice, .lm-btn--inline-pill { font-size: 11px }`) — would
take F.3 from 98 down to 95.

## Metrics summary

| Metric | Pre-WP-031 baseline | Post-WP-031 close | Δ |
|--------|---------------------|-------------------|---|
| Tests (Vitest) | 107 | **152** | +45 |
| Test files | 16 | **17** | +1 (InspectorCluster) |
| TypeCheck | 0 errors | 0 errors | 0 |
| Bundle JS raw | 323.10 kB | **326.25 kB** | +3.15 (≤±10 cumulative cap) |
| Bundle JS gzip | 94.06 kB | 94.98 kB | +0.92 |
| Bundle CSS raw | 65.65 kB | **70.63 kB** | +4.98 |
| Bundle CSS gzip | 11.59 kB | 12.37 kB | +0.78 |
| F.1 grep (fontFamily) | 76 | 76 | 0 |
| F.2 grep (#hex) | 5 | 5 | 0 |
| F.3 grep (font-size:) | 93 | 98 | **+5** |
| PARITY-LOG open | 0 | 0 | preserved |
| Inline `style={{}}` in Inspector.tsx | 24 | **2** | −22 |

## Honest deviations from original WP plan

**1. Pixel-identical claim in P6 was over-stated.**
Reviewer caught: "Order" input width changed 60px → 64px when consolidated
into `.lm-inspector__field--narrow` (shared with z-index input which was
64px). 4px drift in one input. Not a regression (visually a slightly wider
input), but "pixel-identical" was not literally true.

**2. F.3 Δ 0 claim per phase commit was over-stated.**
Reviewer caught: WP-031 actual F.3 delta is +5 (93 → 98), not Δ 0. Per-phase
commit messages claimed Δ 0 because individual `lm-inspector__cluster-label`
addition truly was Δ 0 (consolidated into P5 shared rule). The other +5
(cluster-count, filter-toggle, narrow-notice, checkbox-label, inline-pill)
were declared as fresh font-size rules because they don't fit the existing
11px shared rule's value. All are `legitimate-unique` per CLAUDE.md F.3 but
should have been counted explicitly as +N delta in their respective commits.

**3. Test floor short on multiple phases.**
- P3 task spec: ≥125 → landed 141 ✓ exceeded
- P4 task spec: ≥150 → landed 147 (3 short)
- P5 task spec: ≥154 → landed 152 (2 short)
- P6 task spec: ≥154 → landed 152 (2 short — DOM-level inline-style assertion attempted but removed because child components also render inline styles, can't differentiate Inspector.tsx-owned)

Each shortfall was empirically substituted by Playwright proof + grep on
source. Reviewer accepted P6 substitution; P4 + P5 shortfalls were honest
self-noted in their result logs.

**4. SECTION_CLUSTERS table introduced mid-Cut B (P3).**
Original P3 task plan had abstract cluster aliases (cluster-spacing/frame/
behavior/etc). When wrapping Inspector.tsx, abstract clusters didn't cleanly
map to existing sections. Added parallel SECTION_CLUSTERS trait-rule table
for cluster-role/outer/inner that maps 1:1 to sections. Both alias systems
coexist — abstract for future field-level cluster work (Phase 4+), section-
level for Inspector.tsx wrap. Documented in inspector-capabilities.ts with
"Two layers" comment.

**5. Cluster names "Slot Role" / "Child slots" preserved for test compat.**
Initial P3 Cut B used new cluster titles ("Role", "Children"). One existing
Inspector.test.tsx assertion failed on `queryByText('Child slots')`. Reverted
to old names. Tradeoff: cluster titles match old section semantics (less
freshness, more compat).

**6. Inherited-from-Base label remains slot-wide, not cluster-local (P4).**
Reviewer flagged Medium severity: cluster-inner can show "Tablet override"
chip even when the override is on a sibling cluster (because chip uses
slot-level `hasAnyPerBpOverride`). Count chip partially compensates. Refining
chip gating (e.g. greying out when cluster-count is 0) was intentionally
deferred — the chip semantics are correct (it indicates write-target), the
count is the override-presence indicator, both together convey scope.

**7. Sidebar overlay below 768px not implemented (P5).**
Original WP §Phase 5 mentioned "if small viewport is unsupported for full
authoring, the UI states that explicitly". Implemented narrow notice as the
explicit statement; sidebar stays in flow. At 390px canvas is 150px (was 0)
— small but usable. Future Phase 5b candidate if narrower-than-390 use
case surfaces.

**8. localStorage collapse persistence deferred (P3 Brain #5).**
Native `<details>` collapse state is per-page-load. Brain #5 in task spec
explicitly allowed deferring "if it does not complicate tests; otherwise
defer to a follow-up cut". Did not implement. If operators ask for
persistence, candidate Phase 3b: `useInspectorCollapseState.ts` reading/
writing `localStorage`.

## Files changed across WP-031

**New components:**
- `tools/layout-maker/src/components/InspectorCluster.tsx` (47 LOC)
- `tools/layout-maker/src/components/InspectorCluster.test.tsx` (9 assertions)
- `tools/layout-maker/src/components/ResponsivePreviewControls.tsx` (P1-2)
- `tools/layout-maker/src/components/BreakpointBar.test.tsx` (P1-2 + P5 tests)

**Modified core files:**
- `tools/layout-maker/src/components/Inspector.tsx` (1495 → 1488 net, but
  major restructure: 7 cluster wraps + filter UI + override count + 21
  inline-style purge)
- `tools/layout-maker/src/components/Inspector.test.tsx` (+19 cluster matrix + scope clarity tests)
- `tools/layout-maker/src/components/BreakpointBar.tsx` (popover + Inspector toggle)
- `tools/layout-maker/src/lib/inspector-capabilities.ts` (CLUSTER_ALIASES + SECTION_CLUSTERS + isLeaf guard)
- `tools/layout-maker/src/lib/inspector-capabilities.test.ts` (+12 cluster ID assertions)
- `tools/layout-maker/src/styles/maker.css` (~150 new rules: cluster, scope strip, row tint, filter, shell media queries, narrow notice, BEM modifiers)
- `tools/layout-maker/src/App.tsx` (Inspector overlay state + Esc handler + backdrop + narrow notice mount)

**Documentation + research:**
- `tools/layout-maker/codex-review/13-inspector-ux-research.md` (12.7 kB)
- `tools/layout-maker/codex-review/ux-current-*.png` (9 baseline screenshots)
- `tools/layout-maker/codex-review/wp031-phase{2,3,3-hotfix,4,5,5-hotfix,6}-*.png` (12 phase proofs)
- `workplan/WP-031-layout-maker-inspector-ux.md` (rewritten Phase 0; close-update pending in this commit)
- `logs/wp-031/phase-{0,1-2,3-task,3-result,4-task,4-result,5-task,6-task}.md` + this close result

## Follow-ups (optional, not WP-031 blockers)

1. **P4b — Drawer Trigger Modal:** extract drawer-trigger config (label/icon/color, sidebar-only) to modal opened from "Configure trigger" button inside cluster-role. Frees ~120px vertical for drawer-using sidebar slots.

2. **F.3 cleanup:** consolidate 4 new 11px declarations (`.lm-cluster-count` / `.lm-filter-toggle` / `.lm-narrow-notice` / `.lm-btn--inline-pill`) into one shared rule. Would take F.3 from 98 down to 95.

3. **P3b — localStorage collapse persistence:** if operators ask for it, add `useInspectorCollapseState.ts` hook. Trivial: ~20 LOC + 2-3 tests.

4. **P5b — Sidebar overlay <768px:** if narrower-than-390 use case surfaces, mirror Inspector overlay strategy for sidebar.

5. **Cluster-local chip semantics (P4 reviewer Medium):** grey out scope chip when cluster has 0 overrides at non-desktop BP. Refines write-target signal.

6. **DS migration (Appendix B from `codex-review/12-workplan.md`):** migrate `--lm-*` palette → `--tag-*`/`--status-*`/shadcn-semantic tokens. Separate workplan; not in scope here.

## Acceptance — DONE marker

- [x] All 6 implementation phases shipped (P0, P1-2, P3, P4, P5, P6)
- [x] All 4 hotfix passes shipped (P3 hotfix, P4 hotfix, P5 hotfix, plus P3 phase-1-2 hotfix earlier)
- [x] Tests green: 152/152 (was 107)
- [x] TypeCheck clean
- [x] Build within ±10 kB cumulative cap
- [x] PARITY-LOG: 0 open entries preserved
- [x] No new product features (per WP §non-goals)
- [x] No PARITY surface change
- [x] No `--lm-*` → `--tag-*` migration (per WP §non-goals — Appendix B is separate)
- [x] All phase result logs exist with embedded commit SHAs

**WP-031 status: ✅ DONE.**
