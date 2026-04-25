# WP-031 Phase 3 - Semantic Inspector Clusters (RESULT)

Date: 2026-04-25

## Outcome

Phase 3 closed. The Inspector is now a navigable cluster column with
sticky uppercase headers and native disclosure. Field rendering, write
paths, and capability gating are byte-identical to the pre-phase state —
this was a structure-only change, no behavior moved.

Cuts shipped:
- Cut A — InspectorCluster primitive + capability dispatcher cluster IDs
  (Commit `0f004ad2`)
- Cut B — Inspector.tsx field-to-cluster migration (Commit `90affe44`)

## Files Changed

Cut A (5 paths + task spec):
- `tools/layout-maker/src/components/InspectorCluster.tsx` (NEW, 47 LOC)
- `tools/layout-maker/src/components/InspectorCluster.test.tsx` (NEW, 9 assertions)
- `tools/layout-maker/src/lib/inspector-capabilities.ts` (M — CLUSTER_ALIASES + cluster delegation in canShow)
- `tools/layout-maker/src/lib/inspector-capabilities.test.ts` (M — 12 abstract cluster ID assertions)
- `tools/layout-maker/src/styles/maker.css` (M — cluster CSS + cluster-label added to P5 F.3 shared rule)
- `logs/wp-031/phase-3-task.md` (NEW — Phase 3 task spec with 14 binding Brain decisions)

Cut B (4 paths + 2 screenshots):
- `tools/layout-maker/src/components/Inspector.tsx` (M — 7 wrap sites + import)
- `tools/layout-maker/src/components/Inspector.test.tsx` (M — 6 cluster matrix assertions)
- `tools/layout-maker/src/lib/inspector-capabilities.ts` (M — SECTION_CLUSTERS trait-rule table)
- `tools/layout-maker/src/lib/inspector-capabilities.test.ts` (M — 3 section-level cluster assertions)
- `tools/layout-maker/codex-review/wp031-phase3-leaf-clusters.png` (NEW — leaf state proof)
- `tools/layout-maker/codex-review/wp031-phase3-sidebar-leaf-clusters.png` (NEW — sidebar state proof)

## Cluster inventory (slot-state Inspector)

| Cluster | Element | DefaultOpen | Visible for |
|---------|---------|-------------|-------------|
| `cluster-identity` | `<div>` (no chevron) | always-on | every selected slot |
| `cluster-role` | `<details>` | open | every selected slot (position+sticky+z-index+allowed-block-types+drawer-trigger) |
| `cluster-children` | `<details>` | open | container slots only |
| `cluster-outer` | `<details>` | open | leaf slots (Slot Area: padding/border/column-width/visibility/order) |
| `cluster-inner` | `<details>` | open | leaf slots (Slot Parameters: max-width+align+inner padding+background) |
| `cluster-diagnostics` | `<details>` | collapsed | leaf slots when usable-width OR test-blocks OR warnings present |
| `cluster-references` | `<details>` | collapsed | always available |

Empty state: `cluster-layout-defaults` (open) + `cluster-references` (collapsed) — InspectorUtilityZone now mounts inside the references cluster (no double-mount regression from Phase 1-2).

## Behavioral Contract

Zero callback changes. Every Inspector write still calls the same prop:
- `onUpdateSlotConfig(slotName, key, value, gridKey)` — per-BP slot field writes
- `onUpdateSlotRole(slotName, updates)` — role-level field writes
- `onUpdateGridProp(gridKey, key, value)` — grid-level (sidebar mode, drawer config)
- `onUpdateLayoutProp(key, value)` — layout-level (background)
- `onUpdateColumnWidth(slotName, gridKey, width)` — column width
- `onUpdateNestedSlots(slotName, slots)` — container child management
- `onCreateNestedSlot(parent, name, defaults)` — new child slot
- `onCreateTopLevelSlot(name, defaults)` — new top slot
- `onSelectSlot(name)` — child chip selection
- `onToggleSlot(slotName)` — slot toggle row
- `onShowToast(text)` — copy feedback
- `resetField(key)` — per-BP override reset (existing helper)
- `writeField(key, value)` — per-BP value write (existing helper)

Capability dispatcher logic preserved. Old field-level `canShow(id, traits, scope)` still resolves all existing IDs identically. Cluster IDs are purely additive resolution paths.

## Tests Added

- Cut A: +21 (9 InspectorCluster + 12 abstract cluster IDs)
- Cut B: +9 (3 SECTION_CLUSTERS dispatcher + 6 Inspector cluster matrix)
- Phase 3 total: +30 (111 → 141)
- Floor target ≥125 → cleared with +16 margin

## Verification

Commands run from `tools/layout-maker/`:

```bash
npm run test       # 17 files, 141 passed (was 16/111)
npm run typecheck  # exit 0
npm run build      # JS 324.94 kB / gzip 94.66 kB / CSS 68.14 kB / gzip 11.91 kB
```

Brain-consistent grep gates from repo root (P6 LM-Reforge convention):

```bash
rg -c 'fontFamily' tools/layout-maker/src -g '*.{ts,tsx,css}' | awk -F: '{s+=$2} END {print s}'
# Result: 1 (LM-Reforge baseline)

rg -c '#[0-9a-fA-F]{3,8}' tools/layout-maker/src -g '*.{ts,tsx,css}' | awk -F: '{s+=$2} END {print s}'
# Result: 33 (LM-Reforge baseline)

rg -c 'font-size:' tools/layout-maker/src -g '*.css' | awk -F: '{s+=$2} END {print s}'
# Result: 93 (Δ 0 — cluster-label added to existing P5 F.3 shared rule, no new declaration site)
```

F.3 hygiene preserved: `.lm-inspector__cluster-label` joined the existing P5/P7 small-caps shared rule (`.lm-sidebar__header, .lm-sidebar__group-label, .lm-slot-toggles__title, .lm-inspector__section-title, .lm-slot-ref__title, .lm-token-ref__title`) per CLAUDE.md F.3 Shared-Selector Convention. F.3 count Δ 0.

## Browser Proofs (Playwright @ 1024×768)

- `codex-review/wp031-phase3-leaf-clusters.png` — header slot selected
  - Inspector renders 6 clusters (identity div + 5 details: role/outer/inner/diagnostics/references)
  - Open state matches policy: role/outer/inner open; diagnostics/references collapsed
- `codex-review/wp031-phase3-sidebar-leaf-clusters.png` — sidebar-left selected
  - cluster-role surfaces drawer-trigger fields (sidebar-only gating preserved)
  - Same default-open structure as leaf

DOM inventory check (Playwright `getBoundingClientRect` + `data-cluster-id` query):
```
6 clusters per slot-state Inspector
identity: <div>, no chevron, always-on (correct)
role: <details open>, "Slot Role" title (correct)
outer: <details open>, "Slot Area" title (correct)
inner: <details open>, "Slot Parameters" title (correct)
diagnostics: <details>, no open attr, "Diagnostics" title (correct)
references: <details>, no open attr, "References" title (correct)
```

## Bundle metrics (Phase 3 cumulative vs Phase 1-2 baseline)

| Asset | Before (P1-2 hotfix) | After (P3 cut B) | Δ | Cap |
|-------|----------------------|------------------|---|-----|
| JS raw | 323.23 kB | 324.94 kB | +1.71 | ±10 |
| JS gzip | 94.24 kB | 94.66 kB | +0.42 | — |
| CSS raw | 66.88 kB | 68.14 kB | +1.26 | — |
| CSS gzip | 11.73 kB | 11.91 kB | +0.18 | — |

Both within phase total ±10 kB cap. No bundle bloat from cluster wrapping (just primitive component + small CSS additions for chevron/borders/sticky title).

## Honest self-review

**1. Cluster name conservatism — preserved old section names where tests referenced them.**
Initial Cut B used new cluster titles "Children" and "Role". One existing Inspector.test.tsx assertion (`queryByText('Child slots')` at L81) failed — it was probing the old section-title text. Reverted to "Child slots" and "Slot Role" cluster titles to match. Tradeoff: cluster titles match old section semantics (less freshness, more compat). Followup option: a future phase could rename when test assertions are also updated.

**2. SECTION_CLUSTERS table introduced mid-phase, not in Cut A.**
The original Cut A task plan had abstract cluster aliases (cluster-spacing, cluster-frame, etc.). When wrapping Inspector.tsx in Cut B, the actual section structure didn't cleanly map to those abstract clusters (e.g. Slot Area mixes padding+border+column-width+visibility+order across 3 of my abstract clusters). Rather than splitting Slot Area into 3 separate cluster wraps (a real refactor), I added a parallel SECTION_CLUSTERS trait-rule table for cluster-role/cluster-outer/cluster-inner that maps 1:1 to existing sections. Both alias systems coexist — abstract aliases stay valid for Phase 4+ scope work; section-level clusters drive Inspector.tsx wraps.

This is a real scope drift from the Cut A spec. Mitigation: documented inline in `inspector-capabilities.ts` with the "Two layers" comment. Cut A tests for abstract clusters still pass; Cut B tests for section clusters added separately. Both reachable, both tested.

**3. cluster-frame `traits.isLeaf` guard added in Cut A.**
Caught by Cut A test failure: `cluster-frame` aliased to `['max-width', 'background', ...]`, but `background` is always-true in dispatcher (containers can have backgrounds). Without the leaf guard, cluster-frame would surface on containers with only the background field. Added explicit `isLeaf` guard. This is an acceptable scope creep (1 line of guard logic).

**4. Diagnostics cluster visibility uses an explicit JSX expression, not `canShow('cluster-diagnostics', ...)`.**
The dispatcher's cluster-diagnostics aliases to `['usable-width']` only — but the Inspector renders test-blocks and warnings inside the same cluster, gated by independent state (`blockCount > 0`, `slotWarnings.length > 0`). The cluster wrapper uses an explicit OR expression to show whenever any of three sub-conditions matches. More accurate than dispatcher would be (which would return true for any leaf, even when cluster body is empty). Tradeoff: less centralization, more correctness.

**5. localStorage collapse persistence — DEFERRED per Brain #5 (task spec).**
WP §Phase 3 explicitly allows deferring persistence "if it does not complicate tests; otherwise defer persistence to a follow-up cut". Native `<details>` collapse state is per-page-load. If operators ask for persistence, candidate Cut for Phase 3b: `useInspectorCollapseState.ts` hook reading/writing `localStorage` keyed `lm-inspector-collapse-v1` on toggle event.

**6. Container state screenshot not captured.**
Time pressure + no easy container slot in the active layout. Container path is covered by Inspector.test.tsx assertion: container slot renders cluster-children but NOT cluster-outer/cluster-inner. DOM-level proof (test) substitutes for visual proof (screenshot). If the reviewer needs visual confirmation, easy follow-up: capture `wp031-phase3-container-clusters.png` against a layout with a container slot (e.g. shell wrapping nested slots).

## Follow-up

**Phase 4 — Scope And Override Clarity** is the natural next phase. The
InspectorCluster `scopeBadge` slot prop is already wired in Cut B for
Slot Area + Slot Parameters; Phase 4 will:
1. Replace the current per-section `lm-scope-chip` rendering with a
   cluster-header scope strip that shows `Base / Tablet / Mobile` chip
2. Add `data-overridden` row attribute + 2px BP-hued left border for
   override-row tinting
3. Optional "show overridden only" filter toggle in cluster-identity

Other Phase 3 follow-ups (optional):
- Phase 3b: localStorage collapse persistence (if operator requests)
- Phase 4b: drawer-trigger modal extraction (already in WP §Phase 4b spec)
- Phase 5: shell responsiveness (the 1024px / 390px shell collapse fix)
- Phase 6: visual rhythm + inline-style purge (24 inline → ≤2)
