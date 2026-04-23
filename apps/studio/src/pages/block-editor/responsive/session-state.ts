// WP-027 Phase 1 — pure session state machine for the Studio Responsive tab.
//
// **True mirror** of `tools/block-forge/src/lib/session.ts`, minus file-I/O-specific
// fields (`backedUp` + `lastSavedAt`) which are tied to the filesystem `.bak`
// discipline irrelevant for a DB consumer. Shape, semantics, and behavior are
// otherwise byte-identical:
//   - `string[]` arrays preserve insertion order.
//   - `accept` / `reject` are no-ops if id is in EITHER set (not cross-set toggles).
//   - `undo` reverts the last action by removing id from whichever set holds it
//     + popping history.
//   - Unbounded history (no cap).
//   - `isActOn` returns `boolean` (not a union type).
//   - Invalid transitions return the SAME state reference (idempotence).
//
// Cross-surface parity is the load-bearing design contract for WP-027; preserving
// this at the state-machine level is the cheapest way to keep the two surfaces
// (tools/block-forge + Studio Responsive tab) honest.
//
// All transitions are pure — no React, no DOM, no timers. Phase 4 consumer
// (`ResponsiveTab.tsx`) wraps these in `useReducer` inline.

import type { Suggestion } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. */
  rejected: string[]
  /** Action history for per-session undo. Latest action last. Unbounded. */
  history: SessionAction[]
}

export function createSession(): SessionState {
  return { pending: [], rejected: [], history: [] }
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
 * After a successful save: clear pending / rejected / history.
 * Synchronous — no clock reads (WP-026's `lastSavedAt` timestamp is not tracked
 * here; the Studio tab leans on RHF's Save-button state for UX feedback).
 */
export function clearAfterSave(_state: SessionState): SessionState {
  return { pending: [], rejected: [], history: [] }
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
