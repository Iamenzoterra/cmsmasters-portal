# WP-031 Phase 4 - Scope And Override Clarity (TASK)

Date: 2026-04-25

## Goal

Make per-BP write scope obvious at every glance. Today the operator must
read individual `.lm-bp-dot` indicators on each label to know what's
overridden. Phase 4 surfaces override state at THREE levels:
cluster header (scope strip + override count), row (BP-hued left rail),
and global (optional "show overridden only" filter). Storage of overrides
unchanged. Reset path unchanged. PARITY contract preserved.

## Binding Brain Decisions

1. **Single cut.** Phase 4 surface is small (~5 files). No split needed.
   Brain #11 catch-all triggers if Inspector.tsx grows > 150 LOC OR if
   any test fails after batch landing.

2. **Cluster scope strip via existing `scopeBadge` prop.**
   InspectorCluster.tsx already accepts `scopeBadge?: ReactNode`. Slot
   Area + Slot Parameters already pass scope chip via this prop in
   Cut B. Phase 4 broadens to:
   - All editable clusters (Slot Area, Slot Parameters, Children if
     containers eventually get per-BP — currently no, so skip)
   - Add override count: `{BP-name} · N override{s}` when count > 0
   - When BP=desktop (base): no chip (current behavior)

3. **Row-level `data-overridden` attribute.**
   On any `.lm-inspector__row` (or `.lm-inspector__pad-row` already
   present in code) where the field is overridden at current BP, add
   `data-overridden="true"`. CSS adds 2px BP-hued left border.
   Existing `.lm-bp-dot` stays — row tint is additive, not replacement.

4. **CSS: BP-hued color via `--lm-bp-hue`.**
   `--lm-bp-hue` is already wired to `data-active-bp` on Inspector root
   (set in Phase 2). Row tint uses `hsl(var(--lm-bp-hue) 70% 50%)` for
   the left border.

5. **"Show overridden only" filter — Identity-area toggle.**
   A small checkbox above slot-name when current BP is non-desktop.
   Toggle state lives in `useState` (no persistence). When active,
   sets `data-filter="overridden"` on `.lm-inspector__body`. CSS uses
   `:has()` to hide clusters without `[data-overridden]` descendants.
   Browser support: evergreen Chrome only — LM is operator-internal.

6. **Cluster override count derived in Inspector.tsx, passed to scopeBadge.**
   Compute at wrap site:
   ```
   const outerOverrideCount = isBaseBp ? 0 : OUTER_FIELDS.filter(f => isOverridden(f)).length
   ```
   Pass to `<InspectorCluster scopeBadge={...}>` as text + chip.

7. **Old Slot-Area/Parameters scope chip rendering — KEEP.**
   The current `lm-scope-chip` + "Inherited from Base" labels stay (they
   provide cluster-context info). Phase 4 ADDS the cluster-header strip
   on top. Both visible — operator gets two cues for the same scope state.

8. **Path budget ≤ 6:** Inspector.tsx + Inspector.test.tsx + InspectorCluster.tsx
   (small additions) + InspectorCluster.test.tsx (filter test) + maker.css
   (row tint + filter CSS) + screenshots.

9. **Test floor 141 → ≥150.** Expected adds:
   - Cluster scope strip rendering (3-4 assertions)
   - Override count derivation (3 assertions)
   - Row data-overridden attribute (3 assertions)
   - Filter toggle behavior (2 assertions)

10. **Bundle cap: ±5 kB raw.**

11. **PARITY zero open precondition.** No write path changes — Phase 4
    is presentation-only.

12. **Empirical pass/fail BEFORE close** (per `feedback_empirical_over_declarative`).
    Each contract verified via Playwright + getComputedStyle checks.

13. **Catch-all stop trigger:**
    - Inspector.tsx grows > 150 LOC
    - Bundle > ±5 kB
    - Any test fails after batch
    - PARITY entry surfaces (must not happen — phase is read-only on data)
    - `:has()` browser support gap surfaces (in which case fall back to JS class toggle)

## File scope

```
tools/layout-maker/src/components/Inspector.tsx                # M (override-count derivation, scopeBadge wiring, filter toggle)
tools/layout-maker/src/components/Inspector.test.tsx           # M (Phase 4 cluster matrix)
tools/layout-maker/src/components/InspectorCluster.tsx         # M (override-count style for scopeBadge if needed)
tools/layout-maker/src/components/InspectorCluster.test.tsx    # M (scopeBadge with count assertion)
tools/layout-maker/src/styles/maker.css                        # M (data-overridden row tint + filter CSS)
tools/layout-maker/codex-review/wp031-phase4-*.png             # NEW (3 screenshots: tablet base, tablet override, filter active)
```

## Tests planned

```
# Inspector.test.tsx — Phase 4 additions
- cluster-outer at tablet with 1 override → scopeBadge contains "1 override"
- cluster-outer at tablet with 0 override → scopeBadge contains "tablet" but no count
- row with override at tablet → has data-overridden="true"
- row without override at tablet → no data-overridden attribute
- filter toggle: when active → body has data-filter="overridden"
- filter toggle: clusters without override descendant → display: none in computed

# InspectorCluster.test.tsx — extend
- scopeBadge slot accepts arbitrary children (existing test verifies this)
```

## Out of scope (defer)

- Drawer-trigger modal extraction (Phase 4b — separate)
- Shell responsiveness (Phase 5)
- Visual rhythm / inline-style purge (Phase 6)
- localStorage persistence of filter toggle
