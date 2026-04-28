# WP-036 Phase 2 — Undo Fix + Heuristic Group Result

> **Phase:** 2 (Implementation — `removeFromPending` reducer + `SuggestionGroupCard`)
> **Date:** 2026-04-28
> **Workpackage:** WP-036 Inspector UX Polish
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — all gates GREEN at both surfaces
> **Phase 1 commit:** `81de7729`

---

## TL;DR

Two related UX gaps closed in one phase:

1. **Undo bug fixed** — pending-row Undo button was a silent no-op because `reject(state, id)` early-exits when id is in pending. New `removeFromPending` reducer + `onUndo` prop chain through `SuggestionRow` makes Undo behave correctly. Cross-surface mirror.
2. **Visually-identical suggestions group** — N≥2 suggestions sharing `(heuristic, bp, property, value, rationale)` collapse into a single `SuggestionGroupCard` (collapsed by default, click to expand). Group actions (Accept all / Reject all) + per-selector hover-highlight integrate cleanly with Phase 1 protocol.

Net: ~530 LOC across 12 source + 4 test files. Engine package untouched (atomic emit semantics preserved). PARITY trio cross-surface lockstep.

---

## Outcome ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | `removeFromPending` reducer at both session.ts files + `onUndo` prop chain | session.test.ts: +7 cases × 2 surfaces |
| Silver | Pending-row Undo correctly returns row to default at both surfaces | Live smoke: Accept → pending=true, [undo]; Undo → pending=null, [accept,reject] |
| Gold | `SuggestionGroupCard` collapsed-by-default + expand reveals per-selector rows + group Accept-all | suggestion-grouping.test.ts: 10 new cases × 2 surfaces; live smoke 3 → 1 collapsed |
| Platinum | Phase 1 hover-highlight works on individual group rows (per-selector hover inside expanded card) | onPreviewHover threaded through group → row mouseEnter |

---

## Files modified

### Block-forge (5 files modified, 2 new)

| File | LOC | Change |
|---|---|---|
| `src/lib/session.ts` | +30 | New `removeFromPending` reducer with history filter |
| `src/App.tsx` | +12 | New `handleUndo` callback + threaded `onUndo` |
| `src/components/SuggestionList.tsx` | +60 | New `groupKey` + `buildEntries` + branch render |
| `src/components/SuggestionRow.tsx` | +6 | Pending Undo button rewired to `onUndo` (with `onReject` fallback) |
| `src/components/SuggestionGroupCard.tsx` | +218 NEW | Collapsed-by-default group card with expand/per-selector rows |
| `src/__tests__/session.test.ts` | +70 | +7 `removeFromPending` cases |
| `src/__tests__/suggestion-grouping.test.ts` | +112 NEW | +10 grouping primitive cases |

### Studio (5 files modified, 2 new)

| File | LOC | Change |
|---|---|---|
| `apps/studio/src/pages/block-editor/responsive/session-state.ts` | +25 | Mirror — `removeFromPending` reducer |
| `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` | +13 | Mirror — `handleUndo` callback + threaded `onUndo` |
| `apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx` | +50 | Mirror — grouping + branch render |
| `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx` | +30 | Mirror — pending mode renders single Undo button (block-forge parity) |
| `apps/studio/src/pages/block-editor/responsive/SuggestionGroupCard.tsx` | +295 NEW | Mirror — same group card with inline-style flavour |
| `apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts` | +65 | Mirror — +7 cases |
| `apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-grouping.test.ts` | +110 NEW | Mirror — +10 cases |

### Manifest

| File | Change |
|---|---|
| `src/__arch__/domain-manifest.ts` | +4 entries (2 new components + 2 new tests) |

**Total: ~1,096 LOC across 14 files (12 source + 2 manifest test additions).**
Net new code (excluding test scaffolding): ~700 LOC source.

---

## Reducer contract — `removeFromPending`

```ts
export function removeFromPending(state: SessionState, id: string): SessionState {
  if (!state.pending.includes(id)) return state
  return {
    ...state,
    pending: state.pending.filter((p) => p !== id),
    history: state.history.filter(
      (h) => !(h.type === 'accept' && h.id === id),
    ),
  }
}
```

**Why precise filter, not pop-last:** if author accepts A, then B, then Undos A specifically — popping last would target B (wrong). Filter targets the matching `accept` entry directly. Also prevents subsequent global `undo()` from trying to roll back a phantom action (the test "subsequent global undo does NOT double-pop" pins this invariant).

**Why no-op on non-pending:** Undo is for "I clicked Accept by mistake". If id isn't pending, there's nothing to undo. Idempotent.

---

## Group rendering contract

### Group key tuple

```ts
function groupKey(s: Suggestion): string {
  return `${s.heuristic}|${s.bp}|${s.property}|${s.value}|${s.rationale}`
}
```

5-field tuple captures "visually-identical" intent. Two suggestions group iff:
- Same heuristic (e.g. `horizontal-overflow`)
- Same breakpoint (e.g. `480`)
- Same property (e.g. `overflow-x`)
- Same value (e.g. `auto`)
- Same rationale text (which embeds px/N/etc. for clamp/grid heuristics)

This naturally separates `font-clamp 60px` from `font-clamp 48px` (different rationale texts) — "different problems, just same heuristic" stay separate.

### `buildEntries(sorted: Suggestion[]): ListEntry[]`

Returns ordered list of `{kind:'single', suggestion}` or `{kind:'group', key, suggestions}` entries. Singletons keep using `SuggestionRow`. N≥2 groups render via `SuggestionGroupCard`. Insertion order = first-encounter of each group key.

### `SuggestionGroupCard` UX

**Collapsed (default):**
- Header: heuristic + bp + "N selectors" badge + confidence + ▾ chevron
- CSS line: `… { property: value }` (selector elided)
- Rationale
- "Accept all (N)" + "Reject all" buttons

**Expanded:**
- Same header (▴ chevron)
- Same CSS line + rationale
- N per-selector rows, each with:
  - Selector text in font-mono
  - Pending: single Undo button
  - Default: Accept + Reject buttons
  - Mouse-enter fires `onPreviewHover(s.selector)` → Phase 1 highlight
  - Mouse-leave clears highlight

Group-level "Reject all" intelligently routes pending ids through `onUndo` (instead of `onReject` which would no-op).

---

## Live smoke evidence

### Block-forge — `global-settings` block (exact user-screenshot fixture)

| Step | Action | DOM probe result |
|---|---|---|
| 1 | Load global-settings | `groupCount: 1, groupBadges: ["3 selectors"], singleCardCount: 0` |
| 2 | Click toggle to expand | `dataExpanded: "true", itemCount: 3, itemSelectors: [card-title, color-label, element-row]` |
| 3 | Click Accept on row 1 | Row 1: `data-pending="true", buttons: ["undo"]` |
| 4 | Click Undo on row 1 | Row 1: `data-pending=null, buttons: ["accept","reject"]` ← **bug fixed** |

Visual: `.playwright-mcp/wp036-p2-bf-group-collapsed.png` (1 grouped card with "3 selectors") + `.playwright-mcp/wp036-p2-bf-group-expanded.png` (3 selector rows).

### Studio — same `global-settings` UUID `080da794-b6cd-4865-9c2a-7d7586ceaff7`

| Step | Action | DOM probe result |
|---|---|---|
| 1 | Open Responsive tab | `groupCount: 1, "3 selectors", iframeCount: 3` |
| 2 | Click toggle to expand | `itemCount: 3` (same selectors) |
| 3 | Click Accept on row 1 | Row 1: `data-pending="true", buttons: ["undo"]` |
| 4 | Click Undo on row 1 | Row 1: `data-pending=null, buttons: ["accept","reject"]` ← **bug fixed** |

Visual: `.playwright-mcp/wp036-p2-studio-group-expanded.png` — 3-selector grouped card with all 3 rows visible inside Studio's responsive rail.

---

## Test gates

| Gate | Block-forge | Studio |
|---|---|---|
| typecheck (my files) | CLEAN | CLEAN |
| `session.test.ts` / `session-state.test.ts` | 63/63 (+7) | 23/23 (+7) |
| `preview-assets.test.ts` | 27/27 (Phase 1 carry) | 21/21 (Phase 1 carry) |
| `suggestion-grouping.test.ts` (NEW) | 10/10 | 10/10 |
| **Total WP-036 tests so far** | **100** | **54** |
| arch-test global | 588/588 (was 580 — +8 from manifest additions) | — |
| Live smoke | 4 transitions GREEN | 4 transitions GREEN |

Pre-existing block-forge failures (PropertyRow drift, app-save-regression timeouts) confirmed unchanged — unrelated to WP-036 Phase 2 scope.

---

## Design decisions honored from RECON

| RECON Phase 0 ruling | Honored in Phase 2? |
|---|---|
| Path A — `removeFromPending` reducer + `onUndo` prop (not Path B reuse `undo()`) | ✅ |
| History entry pop precise (filter, not last-pop) | ✅ |
| Studio SuggestionRow renames pending Reject → Undo (block-forge parity) | ✅ |
| Path A — group by tuple, collapsed-by-default | ✅ |
| Per-selector + group Accept-all both available | ✅ |
| Engine atomic emit preserved (consumer-side grouping only) | ✅ |
| Singleton groups render as SuggestionRow (Option A "additive") | ✅ |
| Phase 1 hover-highlight integrates with per-row mouse events in expanded group | ✅ |
| Cross-surface PARITY trio | ✅ |

---

## Phase 2 → Phase 3 handoff notes

**Phase 2 deliverable:** Undo correctness + identical-cards collapse. Two of three Phase 0 problems solved (Phase 1 solved Problem 1 — hover-highlight).

**Phase 3 next** (Close):
1. PARITY trio updates — `tools/block-forge/PARITY.md` + `apps/studio/.../PARITY.md` document the new attribute, postMessage type, group key tuple, removeFromPending reducer
2. SKILL flips — `infra-tooling/SKILL.md` + `studio-blocks/SKILL.md` add WP-036 invariants/recipes
3. CONVENTIONS — sidebar↔iframe protocol pattern; group-by-render-tuple pattern
4. Status flip — WP-036 doc 📋 BACKLOG → ✅ DONE
5. Atomic doc-batch commit
6. Brain pre-commit approval gate per `feedback_close_phase_approval_gate`

---

## Constraints re-confirmed (all green)

- ✅ Zero touch on `packages/block-forge-core/**` — engine emit semantics atomic
- ✅ Zero touch on `packages/ui/**` — token system untouched
- ✅ Zero touch on TweakPanel — coexistence V1 ruling preserved
- ✅ Both surfaces shipped in lockstep (PARITY trio)
- ✅ Snapshot tests guard the IIFE shape — Phase 1 invariants untouched
- ✅ `session.undo()` history-pop semantic untouched — Phase 2 adds NEW per-id reducer, doesn't modify existing reducer

---

## Bonus discovery

- **Studio rail layout** — collapsed grouping naturally improves rail vertical density: 3 horizontal-overflow suggestions that previously occupied ~3× card height now occupy 1×. Inspector + TweakPanel below stay above-fold longer. RECON Phase 0 §Probe E predicted this; Phase 2 live smoke confirms.

---

## Commit ladder

| Phase | Commit message | Files |
|---|---|---|
| 1 | `feat(studio+block-forge): WP-036 phase 1 — sidebar hover-highlight protocol` | 14 (10 source + 4 doc) — landed `81de7729` |
| 2 | `feat(studio+block-forge): WP-036 phase 2 — Undo fix + heuristic group` | 14 (12 source + 2 manifest) + result.md |

**Hands ready for Phase 3 (Close) — awaiting Brain go.**
