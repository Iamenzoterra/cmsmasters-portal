// Phase 4 (WP-026) — pure session state machine.
// WP-028 Phase 2 — extended with tweaks: Tweak[] + addTweak/removeTweaksFor/composeTweakedCss.
//
// Session semantics (per Phase 0 §0.7 save-safety rule 3):
//   - One session per selected block. App.tsx creates a fresh session on every
//     slug change (including re-selecting the same slug after a switch-away).
//   - `backedUp` is the in-memory "have we already created .bak this session"
//     flag; it's the single source of truth for "requestBackup: bool" on POST.
//   - `history` is an ordered record of accept/reject/tweak actions for undo.
//   - `lastSavedAt` feeds the status bar; null before any successful save.
//   - `tweaks` (WP-028) is an ordered list of authored per-BP overrides. Compose
//     via `composeTweakedCss(baseCss, tweaks)` at render time — baseCss is the
//     current block.css snapshot (pre-tweak). Reducer stays pure; no string
//     accumulation inside state (Brain Ruling D).
//
// All transitions are pure — no React, no DOM, no timers. `clearAfterSave`
// takes `Date.now()` implicitly (side-effectful clock read) — the only
// impurity. Tests bound this via range assertions (`> 0`) rather than
// mocking time.
//
// No throws — invalid transitions (accept-already-pending, undo-empty-history)
// are silent no-ops that return the input state.

import type { Suggestion, Tweak } from '@cmsmasters/block-forge-core'
import { emitTweak } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }
  | { type: 'tweak'; tweak: Tweak } // WP-028 Phase 2

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. */
  rejected: string[]
  /** Authored per-BP tweaks (WP-028). Compose over base CSS at render time. */
  tweaks: Tweak[]
  /** Action history for per-session undo. Latest action last. */
  history: SessionAction[]
  /** True iff `saveBlock` has succeeded at least once since this session started. */
  backedUp: boolean
  /** Last successful save timestamp (ms since epoch). Null before any save. */
  lastSavedAt: number | null
}

export function createSession(): SessionState {
  return {
    pending: [],
    rejected: [],
    tweaks: [],
    history: [],
    backedUp: false,
    lastSavedAt: null,
  }
}

/** Move id to `pending`. No-op if already in pending or rejected. */
export function accept(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  return {
    ...state,
    pending: [...state.pending, id],
    history: [...state.history, { type: 'accept', id }],
  }
}

/** Move id to `rejected`. No-op if already in pending or rejected. */
export function reject(state: SessionState, id: string): SessionState {
  if (state.pending.includes(id) || state.rejected.includes(id)) return state
  return {
    ...state,
    rejected: [...state.rejected, id],
    history: [...state.history, { type: 'reject', id }],
  }
}

/**
 * Append a tweak (WP-028 Phase 2, Ruling D).
 * Pure reducer — no dedupe/merge logic. `composeTweakedCss` applies in order.
 * Caller may send duplicate (selector, bp, property) tweaks — `emitTweak`
 * naturally overwrites the inner declaration, so last-write-wins at render time.
 */
export function addTweak(state: SessionState, tweak: Tweak): SessionState {
  return {
    ...state,
    tweaks: [...state.tweaks, tweak],
    history: [...state.history, { type: 'tweak', tweak }],
  }
}

/**
 * Remove every tweak matching (selector, bp). Ruling J — Reset is scoped to the
 * currently-selected (selector, bp) pair; other tweaks preserved.
 *
 * Does NOT push a compensating history entry — undo works by popping the
 * last action; wholesale-remove is a destructive reset, separate from undo.
 * (If author wants per-tweak undo they use the global undo button; Reset is
 * the "clear this cell" affordance.)
 */
export function removeTweaksFor(
  state: SessionState,
  selector: string,
  bp: number,
): SessionState {
  const next = state.tweaks.filter(
    (t) => !(t.selector === selector && t.bp === bp),
  )
  if (next.length === state.tweaks.length) return state
  return { ...state, tweaks: next }
}

/** Roll back the latest action. No-op on empty history. */
export function undo(state: SessionState): SessionState {
  const last = state.history[state.history.length - 1]
  if (!last) return state
  const history = state.history.slice(0, -1)
  if (last.type === 'tweak') {
    return { ...state, tweaks: state.tweaks.slice(0, -1), history }
  }
  // accept / reject — remove id from whichever set holds it (existing contract).
  return {
    ...state,
    pending: state.pending.filter((id) => id !== last.id),
    rejected: state.rejected.filter((id) => id !== last.id),
    history,
  }
}

/**
 * After a successful save: clear pending / rejected / tweaks / history; flip
 * `backedUp=true` (so subsequent saves skip the .bak write); stamp
 * `lastSavedAt = Date.now()`.
 *
 * Note: `backedUp` is only ever flipped true — never back to false — within
 * a session. The only way to reset is a full `createSession()` call.
 */
export function clearAfterSave(_state: SessionState): SessionState {
  return {
    pending: [],
    rejected: [],
    tweaks: [],
    history: [],
    backedUp: true,
    lastSavedAt: Date.now(),
  }
}

/** Derived: true iff `id` is already acted on (pending OR rejected). */
export function isActOn(state: SessionState, id: string): boolean {
  return state.pending.includes(id) || state.rejected.includes(id)
}

/** Derived: filter `suggestions` down to those in `state.pending`. */
export function pickAccepted(
  state: SessionState,
  suggestions: Suggestion[],
): Suggestion[] {
  const set = new Set(state.pending)
  return suggestions.filter((s) => set.has(s.id))
}

/** Derived: any unsaved accept/reject/tweak action present. */
export function isDirty(state: SessionState): boolean {
  return (
    state.pending.length > 0 ||
    state.rejected.length > 0 ||
    state.tweaks.length > 0
  )
}

/**
 * Compose the rendered CSS by applying every session tweak in order to a
 * baseline. Pure function — no state, no side effects. Call at render time
 * (memoized) before passing `block.css` to `composeSrcDoc`.
 *
 * Determinism: `emitTweak` is PostCSS-based and idempotent for identical
 * (tweak, css) inputs; reducing an ordered list preserves that property.
 */
export function composeTweakedCss(
  baseCss: string,
  tweaks: readonly Tweak[],
): string {
  return tweaks.reduce((css, tweak) => emitTweak(tweak, css), baseCss)
}
