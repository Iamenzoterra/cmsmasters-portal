# WP-036 Phase 0 — RECON Result

> **Phase:** 0 RECON (read-only research, no code changes)
> **Date:** 2026-04-28
> **Workpackage:** WP-036 Inspector UX Polish (Hover-Highlight + Undo Fix + Heuristic Group)
> **Author:** Hands (autonomous mode)

---

## TL;DR — RECON outcomes

5 probes complete. Material findings:

1. **Hover-highlight infra is genuinely 90% ready** at both surfaces (block-forge + Studio). Both `preview-assets.ts` files have the `inspector-request-pin` protocol, outline rules already injected. Implementation is small + well-bounded.
2. **Undo bug is real at both surfaces, but presents differently.** Block-forge has visible "Undo" label that no-ops. Studio shows "Reject" on accepted rows (because Studio's SuggestionRow doesn't switch to Undo mode), which silently no-ops via the same guard. Studio's `undo()` reducer at `session-state.ts:62-71` is ALSO not per-id — it's "pop last action". Per-id Undo doesn't exist anywhere.
3. **Duplicate-card risk is concentrated** in 2 heuristics (`horizontal-overflow`, `font-clamp`) — the rest emit varying rationale text per (selector, decl). 4 of 6 heuristics have low/medium risk.
4. **`global-settings` block has exactly 3** `white-space: nowrap` declarations (verified via `grep -o`). User screenshot evidence confirmed against source CSS — this is the natural live-smoke fixture.
5. **Studio rail layout is NOT max-height-constrained** (block-forge IS, at `40vh shrink-0 overflow-auto`). Grouped cards must default to COLLAPSED to avoid pushing Studio Inspector below the fold.

**Recommended path picks** (Brain ruling required):
- **Problem 1 (hover):** Path A — new `inspector-request-hover` postMessage with `data-bf-hover-from-suggestion` attr. Reject Path B (click-to-pin) for V1 — it conflicts with existing iframe click-handler that pins via the OTHER message type (`inspector-request-pin` is parent→iframe; the iframe click handler emits `block-forge:element-click` which is consumed by Inspector's own pin flow).
- **Problem 2 (Undo):** Path A — new `removeFromPending(state, id)` reducer + `onUndo` prop. History entry for the matching `accept` action MUST be popped to keep history coherent. Reject Path B.
- **Problem 3 (Group):** Path A with **collapsed-by-default** render. Reject Path C — selector-prominent layout helps but doesn't solve the "3 cards eating rail height" problem. Mandatory collapsed default for Studio rail layout safety.

---

## Probe A — Hover-highlight infrastructure audit

**Goal:** Confirm both surfaces have iframe-side message handlers that can be extended for a new `inspector-request-hover` protocol.

**Files probed:**
- `tools/block-forge/src/lib/preview-assets.ts:200-453` (block-forge srcdoc)
- `apps/studio/src/pages/block-editor/responsive/preview-assets.ts:198-348` (Studio srcdoc)

**Findings:**

Both surfaces ship the `inspector-request-pin` protocol with **byte-identical** semantics (Studio's header explicitly states "byte-identical" mirror). Both have:

- `[data-bf-hover]` and `[data-bf-pin]` outline rules in `INSPECTOR_OUTLINE_RULE` (lines 55-66 / 48-59).
- IIFE message listener for `block-forge:inspector-request-pin` that runs `document.querySelector(msg.selector)`, applies `data-bf-pin=""`, posts back `inspector-pin-applied` with rect + computedStyle. Wrapped in try/catch — invalid selectors silent.
- Native iframe `mouseover` handler that applies `data-bf-hover` (transient blue outline) for direct iframe hover.

**Critical observation:** The native `mouseover` handler **already manages `data-bf-hover`**. If the new external-hover protocol reuses the same attribute, races are possible (mouse hovers iframe element X while sidebar hovers card Y — which outline wins?). **Decision:** new protocol uses a NEW attribute `data-bf-hover-from-suggestion`. Outline rule is added in same `INSPECTOR_OUTLINE_RULE` block.

**Edit footprint estimate per surface:**
- `preview-assets.ts`: +1 attribute selector in `INSPECTOR_OUTLINE_RULE` (~5 LOC), +1 message listener IIFE (~12 LOC). Both surfaces — total ~34 LOC across 2 files.
- `App.tsx` / `ResponsiveTab.tsx`: +1 useCallback `handlePreviewHover` (~6 LOC each surface). Threaded into SuggestionList → SuggestionRow as `onPreviewHover` prop.
- `SuggestionList.tsx`: +1 prop pass-through (~2 LOC each).
- `SuggestionRow.tsx`: +`onMouseEnter`/`onMouseLeave` on outermost div (~4 LOC each).
- New unit test in each surface: 1 test confirming postMessage fires with correct payload on hover, clear on leave (~25 LOC).

**Total estimate: ~120 LOC across 8 files. Single commit feasible.**

**Status:** ✅ READY for Phase 1.

---

## Probe B — Undo bug confirmation

**Goal:** Confirm bug at both surfaces; identify cleanest fix path.

**Files probed:**
- `tools/block-forge/src/lib/session.ts:120-127` (block-forge `reject()`)
- `tools/block-forge/src/lib/session.ts:264+` (block-forge `undo()`)
- `apps/studio/src/pages/block-editor/responsive/session-state.ts:52-71` (Studio `reject()` + `undo()`)
- `tools/block-forge/src/components/SuggestionRow.tsx:111-119` (block-forge Undo button)
- `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx:153-190` (Studio buttons — Reject only, no Undo branch)

**Block-forge bug:**

```ts
// session.ts:120-122
export function reject(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  // ...
}
```

`SuggestionRow` Undo button calls `onReject(id)` which threads through `handleReject` in App.tsx into this `reject()`. Pending IDs early-exit silently. **Confirmed: Undo is no-op for any accepted suggestion.**

**Studio bug (different shape, same root):**

Studio's `SuggestionRow` does NOT have a separate Undo button — it always renders Accept + Reject. When a row is in `pending`, clicking Reject calls `reject(state, id)` which has the same guard at `session-state.ts:53` and silently no-ops. **The bug exists at Studio too**, just less visibly.

**Studio's `undo()` reducer:**

```ts
// session-state.ts:62-71
export function undo(state: SessionState): SessionState {
  const last = state.history[state.history.length - 1]
  if (!last) return state
  return {
    ...state,
    pending: state.pending.filter((id) => id !== last.id),
    rejected: state.rejected.filter((id) => id !== last.id),
    history: state.history.slice(0, -1),
  }
}
```

This DOES correctly remove from pending — but ONLY for the LAST action in history. If author accepted A, then B, clicks Undo on A → this function pops B (last action), not A.

**Per-id Undo does not exist anywhere.** Both surfaces need a new reducer.

**Recommended fix:**

```ts
// New: removeFromPending(state, id)
// 1. Filter id out of state.pending
// 2. Filter the matching `{ type: 'accept', id }` action out of history
//    (so future global undo doesn't double-pop)
// 3. No-op silently if id not in pending
```

This is additive, ~10 LOC per surface, both `session.ts` files mirror.

**SuggestionRow wiring:**
- Block-forge: change `onClick={() => onReject(suggestion.id)}` (line 115) to `onClick={() => onUndo(suggestion.id)}`.
- Studio: requires UX decision — when isPending, show "Undo" instead of "Reject" (parity with block-forge). Or keep two buttons and re-wire pending Reject to Undo semantics. **Recommended: parity — show "Undo" label on pending rows** (saves one `<button>`, mirrors block-forge UX).

**Status:** ✅ READY. Tests at both `session.test.ts`s + integration test for SuggestionRow click → state mutation.

---

## Probe C — Heuristic emit pattern inventory

**Goal:** Identify which heuristics risk emitting visually-identical (heuristic, bp, rationale) tuples across distinct selectors.

**Heuristics audited:**

| Heuristic | Emit pattern | Rationale shape | Dupe risk |
|---|---|---|---|
| `horizontal-overflow` | per-rule | static text — no value embedding | **HIGH** ✓ |
| `font-clamp` | per-rule (font-size only) | embeds px value in text — identical when 2 selectors share px | **HIGH** ✓ |
| `spacing-clamp` | per-(rule, decl) | embeds prop name + px — varies often | LOW-MEDIUM |
| `flex-wrap` | per-rule | embeds childCount — varies when child counts differ | LOW-MEDIUM |
| `grid-cols` | per-rule | embeds N columns — varies when col counts differ | LOW-MEDIUM |
| `media-maxwidth` | per-tag (img/video/iframe) | embeds tag name — different tags | NONE |

**Group-key:** `(heuristic, bp, property, value, rationale)` — NOT just `(heuristic, bp)`. This naturally handles the "2 selectors, same px → group" case AND the "2 selectors, different px → keep separate" case.

**Engine semantics:** unchanged. Engine emits atomic per-rule suggestions; UX layer at `SuggestionList.tsx` collapses by group-key at render time. `Suggestion[]` shape stays atomic for accept/reject reducer compat.

**Open question for Phase 1:** when grouping, should each grouped suggestion still appear individually in `session.pending` (so saved CSS still has N separate accepts)? **Yes — engine emit is the source of truth for what gets applied. The grouping is purely visual.**

**Status:** ✅ READY. Group rendering needs a new component `SuggestionGroupCard.tsx` (one per surface) that wraps N `SuggestionRow`s.

---

## Probe D — global-settings fixture confirmation

**Goal:** Confirm user's screenshot evidence maps to a real block CSS source.

**File probed:** `content/db/blocks/global-settings.json`

**`grep -o "white-space: nowrap"` count: 3.**

**Selectors confirmed:**
- `.block-global-settings__card-title` (~CSS line 118)
- `.block-global-settings__color-label` (~CSS line 166)
- `.block-global-settings__element-row` (~CSS line 242)

All 3 selectors use `white-space: nowrap` without `overflow-x` fallback. All 3 are inside the BASE rule (no `@container` / `@media` wrapper) — `isAlreadyAdaptive()` returns false for all. **Heuristic emit count: 3 suggestions, all identical (heuristic, bp, property, value, rationale) tuples — matches user's screenshot.**

**Status:** ✅ READY. `global-settings` is the natural Phase 1 + Phase 2 live-smoke fixture for both Problems 1 and 3.

---

## Probe E — Studio Inspector rail layout impact

**Goal:** Determine if grouped-card expansion breaks Studio Inspector vertical-stack layout.

**Files probed:**
- `tools/block-forge/src/App.tsx:494-535` — block-forge layout
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx:670-727` — Studio layout

**Block-forge layout:**

```jsx
<main className="grid grid-cols-[1fr_auto] overflow-hidden">
  <section data-region="triptych">...</section>
  <aside data-region="suggestions" style={{ width: sidebarWidth }}>
    <div className="max-h-[40vh] shrink-0 overflow-auto">
      <SuggestionList />
    </div>
    <div className="min-h-0 flex-1 overflow-auto">
      <Inspector />
    </div>
  </aside>
</main>
```

SuggestionList capped at `40vh` with internal scroll. Group expansion (any size) safe — bounded by container.

**Studio layout:**

```jsx
<div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
  <ResponsivePreview ... />
  <SuggestionList ... />        ← no height constraint
  <TweakPanel ... />
  <Inspector ... />
  <VariantsDrawer ... />
</div>
```

SuggestionList is a flex sibling, no max-height. Group expansion grows the list vertically; Inspector/TweakPanel below get pushed; `overflow: hidden` on outer flex container can clip them.

**Implication:** Grouped cards MUST default to COLLAPSED (single row showing N selectors, with expand-on-click). Default render then shorter than current 3 cards → Studio rail improvement, not regression.

**Recommended UX for grouped card:**

```
┌────────────────────────────────────────────┐
│ horizontal-overflow @480px       LOW       │
│ 3 selectors · { overflow-x: auto; }        │
│ white-space: nowrap without overflow-x...  │
│                                  [ ▾ ]     │  ← expand toggle
│ [ Accept all ]  [ Reject all ]             │
└────────────────────────────────────────────┘
```

When expanded:

```
┌────────────────────────────────────────────┐
│ horizontal-overflow @480px       LOW       │
│ 3 selectors · { overflow-x: auto; }        │
│ white-space: nowrap without overflow-x...  │
│                                  [ ▴ ]     │
│ ─────────────────────────────────────────  │
│ • .block-...__card-title        [✓] [✗]   │ ← per-selector
│ • .block-...__color-label       [✓] [✗]   │   accept/reject
│ • .block-...__element-row       [✓] [✗]   │
│                                            │
│ [ Accept all ]  [ Reject all ]             │
└────────────────────────────────────────────┘
```

Hover-highlight from Problem 1 fires on per-selector hover (inside expanded list) AND on the group card body (highlights ALL N selectors at once — UX bonus).

**Status:** ✅ READY. Layout safety confirmed for both surfaces with collapsed-default + expand-on-click.

---

## Open questions for Brain ruling

1. **Group default state:** Confirmed collapsed-by-default for Studio rail layout safety. ✅ pre-ruled.
2. **Per-selector vs group accept:** Both? (per-row + Accept-all). Recommended: yes both. Auto-explained by AC.
3. **Hover-highlight scope:** SuggestionRow only (V1) or also Inspector pin labels / breakpoint chips? **Recommended: SuggestionRow only** — keeps blast radius tight; other affordances can extend protocol later.
4. **History coherence on `removeFromPending`:** pop the matching `accept` action OR leave history intact? **Recommended: pop**. Otherwise a subsequent global undo (Studio's existing `undo()` reducer) would try to undo a non-existent pending entry.
5. **Studio SuggestionRow `Undo` label:** rename pending-row Reject button to "Undo" (block-forge parity)? **Recommended: yes** — fixes the bug AND brings cross-surface UX parity.

---

## Path picks (proposed for Brain ruling)

| Problem | Selected path | Reject |
|---|---|---|
| 1 — Hover-highlight | A (new `inspector-request-hover` protocol, transient blue outline via new `data-bf-hover-from-suggestion` attribute) | B (click-to-pin — defer to V2) |
| 2 — Undo no-op | A (new `removeFromPending` reducer + `onUndo` prop + history pop of matching accept) | B (call existing `undo()` — semantically wrong) |
| 3 — Heuristic group | A (group by `(heuristic, bp, property, value, rationale)`, collapsed-by-default, per-selector + Accept-all in expanded view) | B (expand-in-place — same UX); C (selector-prominent — doesn't solve rail-height) |

---

## Phase 1 + 2 implementation footprint estimate

| Phase | Scope | LOC est | Files touched |
|---|---|---|---|
| 1 — Hover-highlight | Both surfaces: outline rule + IIFE listener + handler thread + tests | ~120 | 8 files |
| 2 — Undo + Group | Both surfaces: `removeFromPending` reducer + `onUndo` prop + `SuggestionGroupCard` + tests | ~250 | 10 files |
| 3 — Close | PARITY trio updates + SKILL flips + status flip + atomic doc commit | ~50 doc only | 5 files |

**Recommendation:** keep Phase 1 and Phase 2 separate for clean review. They can land in two consecutive commits.

---

## Constraints re-confirmed

- ✅ Zero touch on `packages/block-forge-core/**` (engine emit semantics atomic)
- ✅ Zero touch on `packages/ui/**`
- ✅ Zero touch on TweakPanel (sunset, coexistence V1)
- ✅ Both surfaces ship in lockstep
- ✅ PARITY trio (`tools/block-forge/PARITY.md`, `apps/studio/.../PARITY.md`, `tools/responsive-tokens-editor/PARITY.md`) updates required at Phase 3 Close
- ✅ Live smoke fixture: `global-settings` block (3 horizontal-overflow + likely font-clamp dupes from `--h2-font-size` references)

---

## Test fixture inventory

For Phase 1 + 2 vitest:

- **Block-forge:** `tools/block-forge/src/__tests__/preview-assets.test.ts` — add `inspector-request-hover` IIFE coverage (mock postMessage round-trip).
- **Studio:** `apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts` — same.
- **Block-forge session:** `tools/block-forge/src/__tests__/session.test.ts` — `removeFromPending` reducer (3 cases: not pending → no-op; pending → removes from pending + pops history; followed by undo → no double-pop).
- **Studio session:** `apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts` — same.
- **Group rendering:** new `SuggestionGroupCard` component test — `tools/block-forge/src/__tests__/SuggestionGroupCard.test.tsx` + Studio mirror.

For Phase 1 + 2 live smoke:

- Open `global-settings` block at block-forge → expect 3 horizontal-overflow cards collapse to 1 grouped card with "3 selectors" label, expand → 3 individual rows with hover-highlight working on each.
- Same flow at Studio — confirm rail doesn't push Inspector below fold.
- Accept one suggestion → Undo → row returns to default state (Accept + Reject visible again, pill cleared, save button reflects no-dirty).

---

## Phase 1 readiness checklist

- [x] Hover protocol shape locked
- [x] New attribute name decided (`data-bf-hover-from-suggestion`)
- [x] Outline rule edit point identified
- [x] IIFE listener edit point identified
- [x] Handler thread path mapped (App.tsx / ResponsiveTab.tsx → SuggestionList → SuggestionRow)
- [x] Test surface mapped
- [x] Live smoke fixture identified

**Hands ready for Phase 1.** Waiting on Brain ruling on the 3 path picks (or implicit "go" if all 3 align).
