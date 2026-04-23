// Phase 4 — pure session state machine.
//
// Session semantics (per Phase 0 §0.7 save-safety rule 3):
//   - One session per selected block. App.tsx creates a fresh session on every
//     slug change (including re-selecting the same slug after a switch-away).
//   - `backedUp` is the in-memory "have we already created .bak this session"
//     flag; it's the single source of truth for "requestBackup: bool" on POST.
//   - `history` is an ordered record of accept/reject actions for undo.
//   - `lastSavedAt` feeds the status bar; null before any successful save.
//
// All transitions are pure — no React, no DOM, no timers. `clearAfterSave`
// takes `Date.now()` implicitly (side-effectful clock read) — the only
// impurity. Tests bound this via range assertions (`> 0`) rather than
// mocking time.
//
// No throws — invalid transitions (accept-already-pending, undo-empty-history)
// are silent no-ops that return the input state.

import type { Suggestion } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. */
  rejected: string[]
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

/** Roll back the latest action. No-op on empty history. */
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

/**
 * After a successful save: clear pending / rejected / history; flip
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

/** Derived: any unsaved accept/reject action present. */
export function isDirty(state: SessionState): boolean {
  return state.pending.length > 0 || state.rejected.length > 0
}
