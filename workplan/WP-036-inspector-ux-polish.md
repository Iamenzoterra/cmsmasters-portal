# WP-036 — Inspector UX Polish (Hover-Highlight + Undo Fix + Heuristic Group)

> **Status:** ✅ DONE (Phase 0 RECON + Phase 1 + Phase 2 + Phase 3 Close shipped 2026-04-28)
> **Origin:** User feedback 2026-04-28 post-WP-033 close (block-forge live use)
> **Estimated effort:** 2–3 phases (~6–10h) — actual 3 phases delivered in 1 day
> **Layer:** L2 authoring tools (refines WP-033 Inspector + WP-027/WP-028 SuggestionList behaviour)
> **Completed:** 2026-04-28

---

## Outcome ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Phase 1 hover-highlight protocol cross-surface | commit `81de7729`; preview-assets test 27/27 + 21/21 |
| Silver | Phase 2 Undo fix + per-id `removeFromPending` reducer | commit `e09c8cc5`; session test 63/63 + 23/23 |
| Gold | Phase 2 SuggestionGroupCard collapsed-by-default + expand/Accept-all | suggestion-grouping test 10/10 + 10/10; live smoke 3→1 collapse at both surfaces |
| Platinum | Phase 3 Close — PARITY trio + SKILL flips + CONVENTIONS + status flip + atomic doc batch | this commit (TBD SHA) |

---

## Commit ladder

| Phase | Commit message | SHA | Files |
|---|---|---|---|
| 0 | (RECON) | (no commit) | logs/wp-036/phase-0-recon-result.md (shipped Phase 1) |
| 1 | `feat(studio+block-forge): WP-036 phase 1 — sidebar hover-highlight protocol` | `81de7729` | 14 (10 source + 4 doc) |
| 2 | `feat(studio+block-forge): WP-036 phase 2 — undo fix + heuristic group` | `e09c8cc5` | 16 (12 source + 2 manifest + result.md + screenshots) |
| 3 (Close) | `docs(wp-036): phase 3 close — PARITY trio + SKILL flips + CONVENTIONS + status flip` | `b3764aa0` | 9 (8 doc + result.md) |

---

## TL;DR

Three independent UX bugs / polish items surfaced during first live use of WP-033 Inspector at the `global-settings` block (Forge surface):

1. **Suggestion cards don't reveal their target.** Hovering a suggestion card (e.g. `horizontal-overflow .block-global-settings__card-title`) does nothing in the iframe. Author has to mentally map a CSS class name to a visible element. UX is opaque despite the Inspector outline infrastructure (`[data-bf-pin]`, `[data-bf-hover]`) already being in place from WP-033 Phase 1.
2. **Undo button is a no-op.** `SuggestionRow` (pending state) wires Undo → `onReject(id)` → `reject(state, id)` → guard `if (state.pending.includes(id)) return state` short-circuits silently. The MVP shortcut "undo-via-reject" comment in `SuggestionRow.tsx:5-8` describes a flow that **never worked**. Existing tests mock `onReject={() => undefined}`, so no coverage caught it.
3. **Identical-looking duplicates spam the panel.** When a block has N CSS rules matching the same heuristic at the same breakpoint with the same rationale (e.g. 3× `horizontal-overflow @480px`), the panel emits 3 visually-identical cards differing only by selector (rendered in font-mono on a secondary line). Author sees "three copies of the same hint" cognitively, even though they're 3 distinct fixes.

WP-036 closes all three at both surfaces (block-forge + Studio) in lockstep per PARITY trio.

---

## Problem details

### Problem 1 — Hover-suggestion → highlight target

**Current:** `SuggestionRow` cards are static. No interaction with the iframe preview.

**Available infrastructure (already shipped WP-033 Phase 1):**

- `tools/block-forge/src/lib/preview-assets.ts` and `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` inject `[data-bf-hover]` / `[data-bf-pin]` outline rules into `@layer shared`.
- `block-forge:inspector-request-pin` postMessage protocol — parent → iframe with `{slug, selector}` → iframe runs `document.querySelector(selector)` → applies `data-bf-pin=""` (green outline) → posts back rect + computedStyle. Wrapped in try/catch; invalid selectors yield silent `error: 'no-match'`.

**Gap:** suggestion cards don't tap into the protocol.

### Problem 2 — Undo no-op

**Root cause:** `tools/block-forge/src/lib/session.ts:120-122`:

```ts
export function reject(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  ...
}
```

Pending IDs early-exit. The Undo button at `SuggestionRow.tsx:115` calls `onReject(suggestion.id)` which threads to this guarded reducer. Author clicks Undo → state unchanged → row stays in pending → "will apply on save" pill stays → confusing.

**Same code path in Studio:** `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx` (cross-surface mirror) — same bug.

**Existing escape hatch:** `session.undo(state)` (history pop, line 264) works correctly, but is "global undo last action" not "undo this specific suggestion".

### Problem 3 — Duplicate-looking cards

**Symptom:** Block with 3 rules matching `white-space: nowrap` without `overflow-x` → 3 separate cards, identical heuristic + rationale + breakpoint + fix; only selector differs (small font-mono on second line, easy to miss).

**Heuristic emit logic** (`packages/block-forge-core/src/rules/heuristic-horizontal-overflow.ts`): per-rule iteration, no grouping. Same pattern in `heuristic-spacing-clamp`, `heuristic-font-clamp`, `heuristic-flex-wrap` — any heuristic that emits multiple times with identical (heuristic, bp, property, value, rationale) tuples can spam the panel.

**Engine emit is correct** — atomic fixes need atomic accept/reject. UX-layer grouping (consumer-side, not engine-side) is the right scope.

---

## Acceptance criteria

### Hover-highlight (Problem 1)
- [x] `onMouseEnter` on a `SuggestionRow` outlines the target element in the iframe (transient hover style — blue, like `[data-bf-hover]`).
- [x] `onMouseLeave` clears the outline.
- [x] Invalid / non-matching selector → silent skip (no console errors, no broken iframe).
- [x] Multiple rapid hovers (across 3 identical-looking cards) — outline tracks current hover, no leftover ghosts.
- [x] Both surfaces ship the feature (block-forge + Studio), iframe message handler mirrored in both `preview-assets.ts` files.

### Undo fix (Problem 2)
- [x] Click Undo on a pending row → row returns to default state (Accept + Reject buttons), id removed from `session.pending`, Save button reflects updated dirty state.
- [x] Undo button never produces a no-op state mutation.
- [x] Vitest unit covers the new reducer path (`removeFromPending` or equivalent).
- [x] Live smoke at both surfaces: accept → undo → accept again works without page reload.

### Heuristic group (Problem 3)
- [x] When ≥2 suggestions share `(heuristic, bp, rationale, property, value)`, they collapse into one card showing N selectors as a list (or a "+N more" counter). — implemented as expanded list with per-selector rows + group Accept-all/Reject-all
- [x] Each grouped row has per-selector Accept / Reject affordance OR an "Accept all / Reject all" group action (RECON to choose). — RECON Path A: BOTH (per-row in expanded view + group-level when collapsed)
- [x] Single-selector suggestions render as today (no regression). — Option A "additive" path; singletons keep using SuggestionRow
- [x] Hover-highlight from Problem 1 supports per-selector hover within the grouped card.

### Cross-surface
- [x] Both `tools/block-forge/src/components/SuggestionRow.tsx` and `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx` ship the same UX in the same commit.
- [x] Both `preview-assets.ts` files receive the same iframe message-handler addition.
- [x] PARITY trio cross-references updated (`tools/block-forge/PARITY.md`, `apps/studio/.../PARITY.md`).
  - `tools/responsive-tokens-editor/PARITY.md` not affected — no Inspector consumer changes there.

---

## Implementation paths (to be evaluated in Phase 0 RECON)

### For Problem 1 — hover-highlight

**Path A — New `inspector-request-hover` message (transient).** Mirrors the existing `inspector-request-pin` shape but applies `data-bf-hover-from-suggestion=""` with the same blue outline, clears on mouseleave or new hover. Net new: ~12 LOC iframe-side per surface, one new attribute selector in `INSPECTOR_OUTLINE_RULE`, one new handler in App.tsx + ResponsiveTab.tsx.

**Path B — Hover + click-to-pin (full integration).** A: hover transient; B: click on card body (gate `e.target.closest('button')` to not steal Accept/Reject) → reuse existing `inspector-request-pin` → persistent green outline + Inspector panel populates with the target's computed styles. Path A scope plus card-level click handler + selection-state coordination with existing pin state.

**Recommendation:** A first (V1), B as P2 if value is clear.

### For Problem 2 — Undo fix

**Path A — `removeFromPending(state, id)` reducer + `onUndo` prop.** Pure addition: new reducer pops id from `pending` array AND pops the matching `accept` history entry (so future global undo doesn't double-undo). Two new tests, one in session.test.ts, one integration. ~15 LOC.

**Path B — Reuse `session.undo(state)` from history pop.** Less code (call the existing function), but semantically wrong — global undo is "rollback last action" not "undo this specific suggestion". If author accepted suggestions A then B, then clicks Undo on A's pill, B should not be affected.

**Recommendation:** A. B is misleading.

### For Problem 3 — Heuristic group

**Path A — Render-time collapse, no engine change.** `SuggestionList.tsx` groups by `(heuristic, bp, property, value, rationale)`; renders a single `SuggestionGroupCard` listing N selectors. Single Accept-all + Reject-all actions; per-row hover highlights individual selector. Engine remains atomic.

**Path B — Single-row "expand to see N more" pattern.** Show first selector in the card; "+N more" pill expands an inline list. Similar UX, less group-action surface.

**Path C — Don't group; just make selector primary.** Promote selector to the heading position of the card (H1 of card), heuristic name moves to a secondary pill. Reduces "they all look the same" feel without changing render counts.

**Recommendation:** A or C. RECON to choose based on whether grouped Accept-all is desirable (A: yes; C: no, every fix is its own act).

---

## Constraints (locked)

- ❌ No engine package edits (`packages/block-forge-core/**`) — engine emit semantics stay atomic; grouping is consumer-only.
- ❌ No token system edits (`packages/ui/src/**`).
- ❌ No new message-protocol fields beyond the new hover request — extend, don't reshape.
- ✅ Both surfaces ship in lockstep (block-forge + Studio).
- ✅ PARITY trio updates record the new behaviours.
- ✅ Existing tests stay green; new tests cover each fix path.
- ✅ Zero touch on TweakPanel (coexistence V1 ruling from WP-033 remains).

---

## Cross-references

- WP-033 Phase 1 — Inspector outline rules, hover/pin postMessage protocol baseline (`tools/block-forge/src/lib/preview-assets.ts:55-66`, lines 200-453)
- WP-027 Phase 4 — SuggestionList session-aware filtering, SuggestionRow Accept/Reject/Undo MVP shortcut comment
- `tools/block-forge/src/lib/session.ts:120-122` — the pending-guard that blocks Undo
- `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx` — Studio mirror (same bug)
- `tools/block-forge/PARITY.md`, `apps/studio/src/pages/block-editor/responsive/PARITY.md` — surface-parity contract

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 RECON | 1h | Probe each path option; surface vitest + live-smoke evidence shape; Brain ruling on A/B/C choices |
| 1 Hover-highlight | 2h | Both surfaces — `inspector-request-hover` protocol, SuggestionRow handler threading, attribute-selector outline rule, vitest |
| 2 Undo + Group | 3–4h | `removeFromPending` reducer + `onUndo` thread, group-render in SuggestionList, vitest both fixes |
| 3 Close | 1–2h | PARITY trio updates, SKILL flips, status flip, atomic doc commit |

Total: ~6–10h across 3 phases (or fold P1+P2 if RECON finds them lightly coupled).

---

## Open questions for Phase 0 RECON

1. Should grouped cards have Accept-all / Reject-all, or stay per-selector even when collapsed visually? (Path A vs Path C in Problem 3)
2. Should hover-highlight also apply when hovering Inspector pin labels (cross-feature consistency), or stay scoped to SuggestionRow? (out-of-scope guard candidate)
3. Should `removeFromPending` also pop the matching history entry, or leave history intact so a subsequent global undo still rolls back? (semantic call)
4. Studio Inspector renders SuggestionList in the right rail — confirm layout doesn't break when grouped cards expand vertically.
5. Live-smoke evidence: 3+ identical-heuristic block (e.g. `global-settings` already exhibits this) is the natural test fixture — confirm before P1 starts.
