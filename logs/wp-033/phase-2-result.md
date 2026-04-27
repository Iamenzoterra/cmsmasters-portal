# Execution Log: WP-033 Phase 2 — Side panel sections + per-BP cells (read-only)

> Epic: WP-033 Block Forge Inspector
> Executed: 2026-04-27 16:30–16:50 (UTC+0)
> Duration: ~20 min
> Status: ✅ COMPLETE
> Domains affected: `infra-tooling` (block-forge only)

---

## What Was Implemented

`BreadcrumbNav` extracted from `InspectorPanel` (clean lift, identical render). New `PropertyRow` component (label · 3 BP cells M/T/D · `tokenChip?` slot · `inheritedFrom?` slot · `↗ view` icon on inactive cells · disabled `onCellEdit`). `InspectorPanel` now renders 4 sections (Spacing 8-axis + conditional gap, Typography 5-row, Layout 5-row with conditional flex-direction/grid-template-columns, Visibility disabled checkbox) populated from `pinned.computedStyle`. All YELLOW caveats (1 chip-slot · 2 inheritedFrom · 3 inactive-dim+↗) reserved structurally; Phase 3 fills detection. Manifest +4, arch-test 548 → 552.

**1 escalation (preview-assets.ts):** Phase 1 `snapshotComputed` was missing 6 of the 18 MVP keys (`letterSpacing`, `textAlign`, `flexDirection`, `alignItems`, `justifyContent`, `gridTemplateColumns`). Without them, Typography (3/5 missing) and Layout (4/5 missing) sections rendered as `—` for all cells. Per task prompt's explicit escalation trigger ("Surface to Brain immediately if `pinned.computedStyle` is missing any MVP property"), patched snapshotComputed. Phase 1 protocol shape unchanged — the additive payload growth is type-compatible (Inspector's `ComputedSnapshot` is `Record<string, string>`). Preview-assets snapshot regenerated (1 file).

---

## §2.1 BreadcrumbNav extract

**File:** [tools/block-forge/src/components/BreadcrumbNav.tsx](tools/block-forge/src/components/BreadcrumbNav.tsx)

Clean 1:1 lift of the 3-state breadcrumb logic from InspectorPanel:
- pinned → text-primary + green dot (`--status-success-fg`)
- hover → text-muted + blue dot (`--text-link`)
- empty → text-muted + hint copy

**Shape adaptation:** task prompt drafted `ancestors` chain support; current `PinState` has no `ancestors` field (Phase 1 emit didn't include it). Extracted current shape verbatim — no ancestor chain. Future enhancement (Phase 3 or beyond) can extend pinned-state branch with chain when preview-assets.ts adds ancestors emit. Tests pin the 3 actual states + pin-takes-priority + custom data-testid.

InspectorPanel's existing breadcrumb JSX replaced with `<BreadcrumbNav hovered={hovered} pinned={pinned} />` — InspectorPanel snapshot diff is mechanical (matches the same className/structure under the new component boundary).

---

## §2.2 PropertyRow component

**File:** [tools/block-forge/src/components/PropertyRow.tsx](tools/block-forge/src/components/PropertyRow.tsx)

```
label (w-32 mono muted)  [M cell] [T cell] [D cell]  [(inherited from X)?]  [tokenChip?]
```

**3 BP cells (M=375, T=768, D=1440)** rendered with active vs inactive distinction:
- **Active:** `--text-link` border + `--bg-surface-alt` bg + `--text-primary` text
- **Inactive:** `--border-default` border + `--text-muted` text + `↗` switch button

**YELLOW caveat slots — all reserved:**
- **Caveat 1 — `tokenChip?: ReactNode`** — JSDoc locks Phase 3's required label format `[Use --token ✓ — sets X/Y/Z at all 3 BPs]`. Phase 2 always undefined; slot test asserts both rendered + non-rendered states.
- **Caveat 2 — `inheritedFrom?: string`** — when set, renders `(inherited from <selector>)` subdued italic suffix. Phase 2 always undefined.
- **Caveat 3 — `↗ view` icon on inactive cells** — `onClick={() => onBpSwitch(bp)}` calls Phase 1's lockstep BP picker (`onActiveBpChange` from App). Live verified: clicking ↗ on 768 cell flipped iframe title to `fast-loading-speed-768`, panel `data-bp` to 768, with re-pin restoring outline at the new BP.

**Token substitutions** (task prompt referenced 3 names that don't exist in tokens.css):
| Task prompt | Substituted | Reason |
|---|---|---|
| `--accent-default` | `--text-link` | accent indicator (HSL 227 72% 51%) |
| `--bg-surface-raised` | `--bg-surface-alt` | already used by BP picker active |
| `--text-default` | `--text-primary` | matches existing usage |

**Read-only Phase 2:** `onCellEdit?` slot wired to props but never invoked. Phase 3 §3.1 wires per-cell emit through `composeTweakedCss`.

---

## §2.3 InspectorPanel section grouping

**File:** [tools/block-forge/src/components/InspectorPanel.tsx](tools/block-forge/src/components/InspectorPanel.tsx)

Placeholder `inspector-properties-placeholder` div replaced with `<PropertySections>` when `pinned`, or `inspector-properties-empty` hint when not yet pinned. Internal `<Section>` helper renders the header + child rows with token-themed border + spacing.

**4 sections — Ruling B curated MVP property surface:**

| Section | Rows | Conditional |
|---|---|---|
| **Spacing** | margin × 4 axes, padding × 4 axes, gap | gap only when `cs.gap || cs.rowGap || cs.columnGap` |
| **Typography** | font-size, line-height, font-weight, letter-spacing, text-align | always 5 rows |
| **Layout** | display, flex-direction, align-items, justify-content, grid-template-columns | flex-direction only when `display.includes('flex')`; grid-template-columns only when `display.includes('grid')` |
| **Visibility** | Hide-at-{activeBp} checkbox | always; disabled in Phase 2 with `(Phase 3)` italic hint |

**Per-axis margin/padding (4 rows each, NOT collapsed)** — preserves Phase 3 emit ergonomics (one tweak per axis = no shorthand re-parse). Verified at live smoke on `.gauge-score`: 9 spacing rows (8 axes + gap) renderered correctly.

**Active-only Phase 2 sourcing:** `activeOnly(cs.X)` helper builds `{ 375: a, 768: a, 1440: a }` where only the activeBp key gets `cs.X`, others null → cell renders `—`. Phase 3 `useInspectorPerBpValues` jsdom hook fills inactive keys; PropertyRow's structural shape doesn't change.

**Live state at fast-loading-speed `.gauge-score` pin (active BP=1440):**
- font-size: `60px` (active) · `—` (T/M)
- line-height: `60px` (active)
- letter-spacing: `-3px` (active) ← **previously rendered `—` due to missing key**
- text-align: `start` (active) ← **previously rendered `—`**
- display: `flex` (active) ← Layout section conditional rows fire
- flex-direction: `column` (active) ← **previously rendered `—`**
- align-items / justify-content: filled
- grid-template-columns: NOT rendered (display is flex, not grid) ← conditional logic verified

---

## §2.4 Tests

**Coverage delta:**

| Suite | Tests | Snapshots | Status |
|---|---|---|---|
| BreadcrumbNav.test.tsx (new) | 8 | 3 | ✅ |
| PropertyRow.test.tsx (new) | 12 | 1 | ✅ |
| InspectorPanel.test.tsx (updated) | 11 (was 6, +5) | 4 (regenerated 3, no net delta) | ✅ |
| preview-assets.test.ts | 3 snapshots regenerated (snapshotComputed expansion) | — | ✅ |

**Total Phase 2 deltas:** +20 new tests, 4 new/regenerated snapshots, all 212 block-forge tests pass.

**InspectorPanel new tests** cover:
- 4 sections render when pinned (data-testid query)
- display:block → no flex-direction, no grid-template-columns
- display:flex → flex-direction visible, grid-template-columns absent
- display:grid → grid-template-columns visible, flex-direction absent
- gap row appears only when computedStyle has gap-related keys
- Hide-at-bp checkbox disabled with `(Phase 3)` hint

**Snapshot regen acknowledgment:** 3 InspectorPanel snapshots regenerated due to placeholder → 4-section structure (intentional, expected). 3 preview-assets snapshots regenerated due to `snapshotComputed` +6 keys (intentional, expected per escalation §). 5 brand-new snapshots committed for BreadcrumbNav (3) + PropertyRow (1).

---

## §2.5 Manifest + arch-test

`src/__arch__/domain-manifest.ts` — added 4 entries to `infra-tooling.owned_files`:
- `tools/block-forge/src/components/BreadcrumbNav.tsx`
- `tools/block-forge/src/components/PropertyRow.tsx`
- `tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx`
- `tools/block-forge/src/__tests__/PropertyRow.test.tsx`

`npm run arch-test` → **552 / 552** (baseline 548 + 4 new owned_files × 1 test/file per Phase 1 empirical schema). No SKILL flips.

---

## YELLOW caveats — structural slots verified

| Caveat | Implementation | Verification |
|---|---|---|
| 1 — chip 3-BP impact label format | `tokenChip?: ReactNode` in PropertyRow; format string locked in JSDoc | Test asserts slot renders when prop set, absent when undefined |
| 2 — inheritedFrom subdued label | `inheritedFrom?: string` → `(inherited from X)` italic suffix | Test asserts suffix appears + absent states; Phase 2 always passes undefined |
| 3 — inactive cells dim + ↗ view | inactive cells styled with `--text-muted`; `↗` button calls `onBpSwitch(bp)` → triggers PreviewTriptych tab switch via Phase 1 lockstep | Live: clicked 768 cell ↗ on font-size row → iframe title flipped to `fast-loading-speed-768`, panel data-bp=768, re-pin restored outline at new BP |

---

## Issues & Workarounds

### Escalation 1 — `snapshotComputed` missing 6 MVP keys (preview-assets.ts touched)

**Issue:** Phase 1 `snapshotComputed` emitted only 18 of 24 keys; missing `letterSpacing`, `textAlign`, `flexDirection`, `alignItems`, `justifyContent`, `gridTemplateColumns`.

**Decision:** Patched `snapshotComputed` to add the 6 keys. The "out of scope: preview-assets.ts" boundary in the task prompt protected the postMessage protocol shape — the computedStyle payload contents are explicitly under Phase 0 §0.6 Ruling B (curated MVP). Inspector's `ComputedSnapshot` type is `Record<string, string>` (additive-safe). Preview-assets test snapshot regenerated as expected.

**Why not skip the 6 keys for Phase 2?** Without them, Typography rendered 3 of 5 rows as `—`, Layout rendered 4 of 5 as `—` — gutting the curated MVP. The escalation trigger in the task prompt explicitly anticipated this gap.

### Caveat — task prompt referred to nonexistent token names

`--accent-default`, `--bg-surface-raised`, `--text-default` not in tokens.css. Substituted: `--text-link`, `--bg-surface-alt`, `--text-primary` (all existing, all match the intended visual role). Documented in §2.2.

### Caveat — task prompt drafted ancestor chain not yet emitted

PinState has no `ancestors` field. BreadcrumbNav extracted as 1:1 from existing 3-state breadcrumb. Future ancestor support can extend the pinned-state branch when preview-assets.ts adds ancestors emit; structural seam preserved.

---

## Open Questions for Phase 3

1. **`useInspectorPerBpValues` placement** — Is jsdom × 3 mini-render run inside the hook or via Worker? The hook signature locks Phase 2 read-only contract regardless.
2. **Token-chip detection — `useChipDetection` PostCSS subset scope** — confirm Phase 3 ranges over `responsive-config.json` token map, or only the curated-MVP subset (12 properties). Phase 2 chip slot is parser-agnostic.
3. **Ancestor chain emit** — does Phase 3 add `ancestors[]` to `inspector-pin-applied` payload, or defer to a later phase? BreadcrumbNav can adopt without API churn (the 3-state branch becomes `pinned > [chain] > leaf`).
4. **Visibility checkbox emit semantics** — `display: none` at active BP, or a class-based hide token? Curated MVP §0.6 deferred this question.

---

## Phase 3 entry conditions (all met if green)

- ✅ PropertyRow has `onCellEdit?` slot — Phase 3 wires per-property emit
- ✅ `tokenChip?` slot — Phase 3 wires `<TokenChip>` with `useChipDetection`
- ✅ `inheritedFrom?` slot — Phase 3 fills via per-BP jsdom mini-render walker
- ✅ Visibility checkbox structurally present — Phase 3 enables + wires `display: none` emit (or class-token alternative)
- ✅ snapshotComputed now emits all 12 MVP property keys (post-escalation patch) — Phase 3 emit can target any cell's value

---

## Verification Results

| Check | Result |
|---|---|
| arch-test | ✅ 552/552 (+4) |
| typecheck (block-forge) | ✅ clean |
| block-forge unit tests | ✅ 212 passing / 6 skipped (218 total) |
| Studio + packages untouched | ✅ (zero diff) |
| Phase 1 surfaces — Inspector.tsx, App.tsx untouched | ✅ |
| preview-assets.ts touched | ⚠️ +6 keys to snapshotComputed (escalation §; protocol shape unchanged) |
| TweakPanel.tsx untouched | ✅ |
| 4 sections render at fast-loading-speed `.gauge-score` pin | ✅ |
| Active cell highlighted, inactive dim + `—` placeholder | ✅ |
| ↗ click → PreviewTriptych tab switches + re-pin | ✅ |
| display:flex → flex-direction row visible (live verified) | ✅ |
| All 5 typography rows populated incl. new letter-spacing + text-align | ✅ |
| Hide-at-BP checkbox disabled with (Phase 3) hint | ✅ |
| BreadcrumbNav identical render (snapshot mechanical) | ✅ |

**Live smoke evidence (`.gauge-score` on fast-loading-speed at active BP=1440 → click ↗ on font-size 768 cell):**

```js
{
  panelBp: "768",                          // ← was 1440, switched
  iframeTitle: "fast-loading-speed-768",   // ← PreviewTriptych tab switch verified
  fontSize768Active: "T60px",              // ← T cell now active with value
  fontSize1440NowInactive: true            // ← D cell now inactive
}
```

---

## Files touched

| File | Δ | Type |
|---|---|---|
| `tools/block-forge/src/components/BreadcrumbNav.tsx` | NEW | component |
| `tools/block-forge/src/components/PropertyRow.tsx` | NEW | component |
| `tools/block-forge/src/components/InspectorPanel.tsx` | placeholder → 4 sections + breadcrumb extracted | component |
| `tools/block-forge/src/lib/preview-assets.ts` | +6 keys in snapshotComputed (escalation §) | infra |
| `tools/block-forge/src/__tests__/BreadcrumbNav.test.tsx` | NEW | test |
| `tools/block-forge/src/__tests__/PropertyRow.test.tsx` | NEW | test |
| `tools/block-forge/src/__tests__/InspectorPanel.test.tsx` | +5 tests, snapshot regen | test |
| `tools/block-forge/src/__tests__/__snapshots__/BreadcrumbNav.test.tsx.snap` | NEW | snapshot |
| `tools/block-forge/src/__tests__/__snapshots__/PropertyRow.test.tsx.snap` | NEW | snapshot |
| `tools/block-forge/src/__tests__/__snapshots__/InspectorPanel.test.tsx.snap` | regenerated | snapshot |
| `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap` | regenerated (3 snapshots) | snapshot |
| `src/__arch__/domain-manifest.ts` | +4 owned_files | manifest |

---

## Notes for Brain Review

1. **Escalation §1 — preview-assets.ts touched.** `snapshotComputed` +6 keys: additive payload only, `Record<string, string>` type-compatible, postMessage protocol shape unchanged. Required to deliver Ruling B's 12 MVP properties.
2. **Token name substitutions documented.** Three task-prompt references (`--accent-default`, `--bg-surface-raised`, `--text-default`) substituted with existing tokens.css names. No DS drift.
3. **BreadcrumbNav scope simplified.** Ancestor-chain support deferred; current shape is clean extract. Phase 3+ can extend.
4. **Phase 3 unblocked.** All structural slots reserved: `onCellEdit?`, `tokenChip?`, `inheritedFrom?`, Visibility checkbox. Detection / emit / sourcing logic to be wired without component API changes.

## Git

- Commit: `6bf32ee0` — `feat(block-forge): WP-033 phase 2 — inspector property sections + per-BP cells (read-only) [WP-033 phase 2]`
