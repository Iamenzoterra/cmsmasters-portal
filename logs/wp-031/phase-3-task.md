# WP-031 Phase 3 - Semantic Inspector Clusters (TASK)

Date: 2026-04-25

## Goal

Replace the current flat field list inside the Inspector with a navigable,
collapsible cluster IA. Field data, write paths, and capability gating stay
exactly as they are. The deliverable is structure, not behavior.

This is the highest-risk phase of WP-031. Default to a 2-cut split.

---

## Binding Brain Decisions

1. **2-cut split mandatory.**
   - **Cut A** — primitive + dispatcher work only. Inspector.tsx untouched.
     Tests added/extended. Green build before Cut B.
   - **Cut B** — Inspector.tsx field-to-cluster migration. Mechanical wrap
     of existing field blocks in `<InspectorCluster>`. Zero callback changes.

2. **Native `<details>/<summary>`** for collapse. No custom accordion.
   - A11y for free
   - Keyboard works by default (Space/Enter on summary)
   - `prefers-reduced-motion` compatible (no JS animation)
   - Sets the `[open]` attribute on `<details>` — chevron rotates via CSS
     `:has([open])` or `details[open]` selectors

3. **Capability dispatcher: cluster IDs added as ALIASES.** Old field IDs
   keep working. Zero churn in existing dispatcher tests. Mapping:
   - `cluster-identity`     → ['slot-name', 'slot-badges']
   - `cluster-layout`       → ['position', 'visibility', 'order', 'sticky-related']
   - `cluster-spacing`      → ['padding-x', 'padding-top', 'padding-bottom', 'gap', 'min-height', 'margin-top']
   - `cluster-frame`        → ['max-width', 'align', 'background', 'border-sides', 'border-width', 'border-color']
   - `cluster-children`     → ['nested-slots', 'create-slot', 'convert-to-leaf']
   - `cluster-behavior`     → ['z-index', 'allowed-block-types', 'sticky', 'position']
   - `cluster-drawer-trigger` → ['drawer-trigger-label', 'drawer-trigger-icon', 'drawer-trigger-color']
   - `cluster-diagnostics`  → ['usable-width', 'test-blocks', 'css-warnings']
   - `cluster-references`   → ['token-reference', 'slot-reference']

   `canShow('cluster-X')` returns true if ANY aliased ID returns true for
   the slot. Old field-level `canShow(id)` continues to work for fine-grained
   gating inside a cluster.

4. **Default open policy** (per WP §Phase 3):
   - Identity: always visible (no collapse — header IS the slot identity)
   - Layout: open
   - Spacing: open for leaf
   - Frame: open for leaf if width/background/border field present; else collapsed
   - Children: open for containers
   - Behavior: collapsed unless sticky/z-index/allowed-block-types active
   - Drawer Trigger: collapsed for sidebar slots
   - Diagnostics: collapsed
   - References: collapsed

5. **DEFER collapse persistence.** WP says "if it does not complicate tests;
   otherwise defer persistence to a follow-up cut." `localStorage` adds state
   + test complexity. Ship cluster IA without persistence in P3. If needed,
   add as a Phase 3b cut after Phase 4 lands.

6. **Old field/section IDs marked @deprecated, NOT removed.** Removal is
   Phase 6 hygiene work. Phase 3 tests must show old IDs still resolve.

7. **Field migration is mechanical wrap, not refactor.** Every field block
   in Inspector.tsx stays in place visually. Each gets wrapped in a single
   `<InspectorCluster id="..." title="..." defaultOpen={...}>...</InspectorCluster>`.
   Data flow, props, callbacks unchanged. No prop renames. No state moves.

8. **Path budget ≤ 12.** Cut A targets ≈ 5 paths. Cut B targets ≈ 4 paths.
   Result log = 1. If Cut B grows past 50% of Inspector.tsx LOC, **stop and
   split into Cut B1 + Cut B2** (e.g. by cluster group: B1 = identity+layout+
   spacing, B2 = frame+children+behavior+drawer+diagnostics+references).

9. **Bundle cap per cut: ±5 kB. Phase total: ±10 kB vs current 323.23 kB
   raw / 94.24 kB gzip / 66.88 kB CSS.**

10. **Test floor 111 → ≥125.** Expected additions:
    - InspectorCluster primitive tests (~5)
    - Capability dispatcher cluster ID tests (~6 — one per cluster aliased)
    - Cluster matrix per slot type (leaf / container / sidebar) — minimum 3 × 4 = 12
    - Default open/closed state assertions (~3)
    Conservative floor target ≥ 125.

11. **Brain-consistent grep gate locked** (P6 LM-Reforge convention):
    ```bash
    # From repo root
    rg -c 'fontFamily' tools/layout-maker/src --type ts --type tsx --type css 2>/dev/null | awk -F: '{s+=$2} END {print "F.1:", s}'
    rg -c '#[0-9a-fA-F]{3,8}' tools/layout-maker/src --type css --type ts --type tsx 2>/dev/null | awk -F: '{s+=$2} END {print "F.2:", s}'
    rg -c 'font-size:' tools/layout-maker/src --type css 2>/dev/null | awk -F: '{s+=$2} END {print "F.3:", s}'
    ```
    Baseline (post-WP-031 P1-2 + hotfix): F.1=76, F.2=5, F.3=93. Phase 3
    must report Δ ≤ 0 on F.1/F.2 and Δ ≤ +3 on F.3 (cluster-title rule
    additions allowed if consolidated via shared selector per F.3 convention).

12. **PARITY-LOG zero open precondition.** Confirmed at WP-031 P0.
    Phase 3 must not introduce any new entries. If a divergence surfaces
    during cluster migration (e.g. a field that wasn't writing to expected
    key), STOP, log it in PARITY-LOG, root-cause it, fix in a separate cut.

13. **Empirical pass/fail BEFORE close** (per `feedback_empirical_over_declarative`
    memory). Each cut's claims verified live (test run output, screenshot
    diff, grep counts), not log citation.

14. **Catch-all stop trigger.** Stop and reassess (split phase or
    add cut) if any of:
    - InspectorCluster.tsx exceeds 200 LOC
    - Cut B touches more than 50% of Inspector.tsx lines
    - Any PARITY surprise (field not writing to expected key)
    - Bundle delta exceeds ±5 kB per cut
    - Test floor under-shoots ≥ 125 by more than 5 (cluster matrix
      coverage too thin)
    - Visual screenshot shows unintended field reordering or content drift

---

## Cut A - Primitive + Dispatcher

### Files (≤ 5 paths)

```
tools/layout-maker/src/components/InspectorCluster.tsx          # NEW
tools/layout-maker/src/components/InspectorCluster.test.tsx     # NEW
tools/layout-maker/src/lib/inspector-capabilities.ts            # M (cluster IDs)
tools/layout-maker/src/lib/inspector-capabilities.test.ts       # M (cluster ID tests)
tools/layout-maker/src/styles/maker.css                         # M (cluster CSS)
```

### InspectorCluster API

```tsx
type InspectorClusterProps = {
  id: string                    // 'cluster-identity' | 'cluster-layout' | ...
  title: string                 // Display title (e.g. "Layout", "Spacing")
  defaultOpen?: boolean         // Default open/closed
  scopeBadge?: ReactNode        // Optional right-side scope chip slot (used in Phase 4)
  children: ReactNode
}

// Renders:
// <details className="lm-inspector__cluster" data-cluster-id={id} open={defaultOpen}>
//   <summary className="lm-inspector__cluster-title">
//     <span className="lm-inspector__cluster-label">{title}</span>
//     {scopeBadge && <span className="lm-inspector__cluster-scope">{scopeBadge}</span>}
//   </summary>
//   <div className="lm-inspector__cluster-body">{children}</div>
// </details>
```

Identity cluster is special: `id="cluster-identity"` renders WITHOUT
`<details>` wrapper (always-on). Component handles this with a branch:
`if (id === 'cluster-identity') return <div className="lm-inspector__cluster lm-inspector__cluster--identity">{children}</div>`.

### CSS additions (maker.css)

```css
/* Cluster — collapsible disclosure */
.lm-inspector__cluster {
  border-bottom: 1px solid var(--lm-border-subtle);
}
.lm-inspector__cluster:last-child { border-bottom: none; }

.lm-inspector__cluster-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--lm-sp-3) var(--lm-sp-4);
  cursor: pointer;
  list-style: none;
  /* Add to F.3 shared selector with .lm-sidebar__header,.lm-sidebar__group-label
     for small-caps treatment — see CLAUDE.md F.3 Shared-Selector Convention */
}
.lm-inspector__cluster-title::-webkit-details-marker { display: none; }

.lm-inspector__cluster-title::after {
  content: '›';
  margin-left: auto;
  font-size: 14px;
  color: var(--lm-text-muted);
  transition: transform var(--lm-transition-fast);
}
.lm-inspector__cluster[open] > .lm-inspector__cluster-title::after {
  transform: rotate(90deg);
}

.lm-inspector__cluster-body {
  padding: var(--lm-sp-2) var(--lm-sp-4) var(--lm-sp-4);
}

.lm-inspector__cluster--identity {
  padding: var(--lm-sp-4);
  border-bottom: 1px solid var(--lm-border-subtle);
}
```

F.3 hygiene: `.lm-inspector__cluster-title` MUST be added to the existing
P5 small-caps shared rule (`.lm-sidebar__header, .lm-sidebar__group-label`),
NOT a new declaration. Per CLAUDE.md F.3 Shared-Selector Convention.

### Capability dispatcher additions

In `inspector-capabilities.ts`, add cluster aliases. Keep all existing
field IDs working. New cluster ID = OR over its aliased field IDs.

```ts
const CLUSTER_ALIASES: Record<string, string[]> = {
  'cluster-identity':       ['slot-name', 'slot-badges'],
  'cluster-layout':         ['position', 'visibility', 'order'],
  'cluster-spacing':        ['padding-x', 'padding-top', 'padding-bottom', 'gap', 'min-height', 'margin-top'],
  'cluster-frame':          ['max-width', 'align', 'background', 'border-sides', 'border-width', 'border-color'],
  'cluster-children':       ['nested-slots', 'create-slot', 'convert-to-leaf'],
  'cluster-behavior':       ['z-index', 'allowed-block-types', 'sticky'],
  'cluster-drawer-trigger': ['drawer-trigger-label', 'drawer-trigger-icon', 'drawer-trigger-color'],
  'cluster-diagnostics':    ['usable-width', 'test-blocks', 'css-warnings'],
  'cluster-references':     ['token-reference', 'slot-reference'],
}

function canShow(id: string, slot: SlotTraits): boolean {
  if (id in CLUSTER_ALIASES) {
    return CLUSTER_ALIASES[id].some(fieldId => canShowField(fieldId, slot))
  }
  return canShowField(id, slot)
}
```

### Cut A tests

```bash
# InspectorCluster.test.tsx
- renders <details> for non-identity clusters
- renders <div> (no details) for cluster-identity
- title rendered in <summary>
- chevron rotates via [open] attribute (CSS-checked via class assertion or computed transform)
- defaultOpen=true → open attribute set
- defaultOpen=false → no open attribute
- scopeBadge slot renders in title when provided
- body content rendered inside .lm-inspector__cluster-body

# inspector-capabilities.test.ts (extended)
- canShow('cluster-spacing') for leaf slot → true (any spacing field shows)
- canShow('cluster-children') for container → true
- canShow('cluster-children') for leaf → false (no nested-slots)
- canShow('cluster-drawer-trigger') for sidebar → true
- canShow('cluster-drawer-trigger') for non-sidebar → false
- canShow with old field ID → still works (alias backwards compat)
```

### Cut A verification

```bash
cd tools/layout-maker
npm run test
npm run typecheck
npm run build
# Inspector.tsx untouched at this point. Visual baseline identical.
```

Expected metrics post-Cut A:
- Tests: 111 → 122-125 (+11-14: cluster primitive + dispatcher cluster IDs)
- Bundle: 323.23 → ~324-325 kB raw (+1-2 kB for InspectorCluster + CSS)
- F.3: 93 → ≤95 (cluster-title rule additions, capped via shared-selector
  consolidation per CLAUDE.md F.3)

### Cut A commit

```
feat(lm): WP-031 phase 3 cut A — InspectorCluster primitive + cluster IDs in dispatcher [WP-031 phase 3]
```

---

## Cut B - Inspector.tsx Migration

### Files (≤ 4 paths)

```
tools/layout-maker/src/components/Inspector.tsx                 # M (wrap fields)
tools/layout-maker/src/components/Inspector.test.tsx            # M (cluster matrix)
tools/layout-maker/src/styles/maker.css                         # M (cluster spacing tweaks if needed)
tools/layout-maker/codex-review/wp031-phase3-clusters-*.png     # NEW (3 screenshots)
```

### Migration steps (sequential)

1. **Identify field blocks in current Inspector.tsx.** Each existing
   `<div className="lm-inspector__section">...</div>` is a candidate
   wrapper site. Map to clusters per dispatcher aliases (Brain #3).

2. **Wrap each field block.** Replace:
   ```tsx
   {canShow('slot-area-section', traits) && (
     <div className="lm-inspector__section">...field block...</div>
   )}
   ```
   with:
   ```tsx
   {canShow('cluster-spacing', traits) && (
     <InspectorCluster
       id="cluster-spacing"
       title="Spacing"
       defaultOpen={traits.isLeaf}
     >
       ...field block contents...
     </InspectorCluster>
   )}
   ```

3. **Identity cluster** wraps the slot name + badges + scope row at top
   of slot-state Inspector. Special-case: no collapse, no chevron, but
   uses InspectorCluster with `id="cluster-identity"` for consistency.

4. **References cluster** wraps the existing `<InspectorUtilityZone>`
   mount in the slot-state. Empty-state mount also gets wrapped.

5. **Verify field-by-field that nothing was reordered or dropped.**
   Diff Inspector.tsx pre/post Cut B and visually inspect what the
   wrapping changed. Field blocks themselves untouched — only their
   surrounding `<div>` swapped for `<InspectorCluster>`.

### Cut B tests (cluster matrix)

```bash
# Inspector.test.tsx — extended
# Leaf slot matrix (Inspector with content/header/footer slot selected):
- renders cluster-identity (always visible)
- renders cluster-layout (defaultOpen)
- renders cluster-spacing (defaultOpen)
- renders cluster-frame (defaultOpen if width/background/border present)
- does NOT render cluster-children
- renders cluster-behavior (collapsed unless sticky/z-index/allowed-block-types)
- renders cluster-diagnostics (collapsed)
- renders cluster-references (collapsed)

# Container slot matrix (sidebar-as-container or shell):
- renders cluster-children (defaultOpen)
- does NOT render cluster-spacing (capability hides for containers)
- does NOT render cluster-frame inner params

# Sidebar slot matrix (sidebar-left/sidebar-right):
- renders cluster-drawer-trigger (collapsed)
- non-sidebar slots: cluster-drawer-trigger absent

# Default open/closed state:
- assert <details open> attribute on expected clusters per slot type
- assert no <details open> on collapsed-by-default clusters

# Capability dispatcher contract:
- old field-level canShow IDs still work for fine-grained inner gating
```

### Cut B verification

```bash
cd tools/layout-maker
npm run test           # floor 111+Cut A tests + cluster matrix; expect ≥ 125
npm run typecheck
npm run build          # bundle delta ±5 kB per cut
```

Then Playwright visual proof at 1024×768 (baseline-matching viewport):
- `wp031-phase3-leaf-clusters.png` — leaf slot, all default-open clusters visible
- `wp031-phase3-container-clusters.png` — container slot, children open
- `wp031-phase3-sidebar-clusters.png` — sidebar slot, drawer-trigger collapsed

Empirical proof checklist:
- `getComputedStyle(cluster).borderBottom` non-zero for all but last
- `<details open>` attribute matches default-open policy per slot type
- chevron `transform: rotate(90deg)` when open (visual or computed)
- field count inside each cluster body matches pre-migration field count
  (use a content-comparison test snapshot if needed)
- F.3 ≤ 95 (cluster-title in shared rule, not new declaration)

### Cut B commit

```
feat(lm): WP-031 phase 3 cut B — Inspector field-to-cluster migration [WP-031 phase 3]
```

---

## Result log

After Cut B closes, write `logs/wp-031/phase-3-result.md` covering:

1. **Outcome** — clusters live, field matrix preserved per slot type
2. **Files Changed** — 2 cuts split, with commit SHAs embedded
3. **Behavioral Contract** — every callback path unchanged (list them)
4. **Tests Added** — count by cut, total floor
5. **Verification** — test/typecheck/build/grep-gate output verbatim
6. **Browser proofs** — 3 screenshots referenced
7. **Honest self-review** — anything that deviated from this task spec,
   any catch-all triggers fired, any deferrals (e.g. localStorage persist
   if it became Phase 3b candidate)
8. **Follow-up** — Phase 4 (scope/override clarity) is the natural next.
   Note that `cluster-scope` slot prop in InspectorCluster API is
   already wired for Phase 4 — Phase 4 just provides the badge ReactNode.

---

## Out of scope (do NOT do in Phase 3)

- No collapse-state persistence (deferred to 3b if needed, or never)
- No scope strip / row-level override tint (Phase 4)
- No drawer-trigger modal (Phase 4b)
- No shell width change (Phase 5)
- No inline `style={{}}` purge (Phase 6)
- No new fields, no field renames, no callback changes
- No PARITY surface change

---

## Risk register (Phase 3 specific)

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Field gets dropped during wrap migration | Medium | Cut B test asserts every pre-migration canShow → field rendered post-migration |
| Capability cluster alias miscalibrated → wrong cluster shows wrong fields | Medium | Cut A tests cover each cluster ID for leaf/container/sidebar combinations |
| `<details>` breaks existing CSS that targeted `.lm-inspector__section` | Low | Keep `.lm-inspector__section` class as alias on outer `<details>` for one phase; remove in Phase 6 |
| Sticky cluster title z-index conflicts with popover or modal | Medium | Title `z-index: 1`, popover/modal `z-index: 100+` — already separated |
| Bundle bloat from 9 cluster instances + chevron CSS | Low | Cluster primitive is ~30 LOC; CSS additions ~25 lines |
| Default open policy too aggressive (panel feels cluttered) | Low | Adjust default-open in Cut B if visual review surfaces it; per WP §Default open policy |
| Cut B surface too large (>50% Inspector.tsx) | Medium | Brain #14 catch-all: split into Cut B1 + Cut B2 by cluster group |
