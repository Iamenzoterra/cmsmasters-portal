// Phase 4 (WP-026) — pure session state machine.
// WP-028 Phase 2 — extended with tweaks: Tweak[] + addTweak/removeTweaksFor/composeTweakedCss.
// WP-028 Phase 3 — extended with variants: BlockVariants + createVariant/renameVariant/
//                  deleteVariant + undo coverage + isDirty awareness + clearAfterSave
//                  savedVariants param.
// WP-028 Phase 4 — updateVariantContent reducer + variant-update action type + undo
//                  extension. Silent no-op on rename-race (name absent) and on
//                  byte-identical content (suppresses history noise during debounce).
//
// Session semantics (per Phase 0 §0.7 save-safety rule 3):
//   - One session per selected block. App.tsx creates a fresh session on every
//     slug change (including re-selecting the same slug after a switch-away).
//   - `backedUp` is the in-memory "have we already created .bak this session"
//     flag; it's the single source of truth for "requestBackup: bool" on POST.
//   - `history` is an ordered record of accept/reject/tweak/variant-* actions for undo.
//   - `lastSavedAt` feeds the status bar; null before any successful save.
//   - `tweaks` (WP-028 P2) is an ordered list of authored per-BP overrides. Compose
//     via `composeTweakedCss(baseCss, tweaks)` at render time — baseCss is the
//     current block.css snapshot (pre-tweak). Reducer stays pure; no string
//     accumulation inside state (Brain Ruling D).
//   - `variants` (WP-028 P3) is the current named-fork map authored in this session.
//     Seeded from `block.variants` on slug-change via `setSession((s) => ({ ...s,
//     variants: block.variants ?? {} }))` (Ruling P' — useEffect seed, keeps
//     `createSession()` zero-arg for backward compat). Any variant-* reducer
//     mutates this map + pushes a history entry for undo.
//
// All transitions are pure — no React, no DOM, no timers. `clearAfterSave`
// takes `Date.now()` implicitly (side-effectful clock read) — the only
// impurity. Tests bound this via range assertions (`> 0`) rather than
// mocking time.
//
// No throws — invalid transitions (accept-already-pending, undo-empty-history,
// create-duplicate-variant, rename-to-existing) are silent no-ops that return
// the input state.

import type { Suggestion, Tweak } from '@cmsmasters/block-forge-core'
import { emitTweak } from '@cmsmasters/block-forge-core'
import type { BlockVariant, BlockVariants } from '@cmsmasters/db'
import type { FluidMode } from './fluid-mode'

export type SessionAction =
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }
  | { type: 'tweak'; tweak: Tweak } // WP-028 Phase 2
  | { type: 'variant-create'; name: string; payload: BlockVariant } // WP-028 Phase 3
  | { type: 'variant-rename'; from: string; to: string }
  | { type: 'variant-delete'; name: string; prev: BlockVariant }
  | { type: 'variant-update'; name: string; prev: BlockVariant } // WP-028 Phase 4
  | { type: 'fluid-mode'; mode: FluidMode; prev: FluidMode | null } // WP-030 hotfix — per-BP fluid opt-out (carries prev for undo)

export type SessionState = {
  /** Suggestion IDs accepted but not yet saved. Order preserved. */
  pending: string[]
  /** Suggestion IDs explicitly rejected — hidden from the list. */
  rejected: string[]
  /** Authored per-BP tweaks (WP-028 P2). Compose over base CSS at render time. */
  tweaks: Tweak[]
  /** Named variants authored this session (WP-028 P3). Seeded from block.variants in App.tsx. */
  variants: BlockVariants
  /** Action history for per-session undo. Latest action last. */
  history: SessionAction[]
  /** True iff `saveBlock` has succeeded at least once since this session started. */
  backedUp: boolean
  /** Last successful save timestamp (ms since epoch). Null before any save. */
  lastSavedAt: number | null
  /**
   * Per-block fluid opt-out override (WP-030 hotfix). Null = no change pending;
   * composedBlock falls through to the value parsed from block.html. Non-null
   * = user clicked the FluidModeControl in the header; on save, the override
   * is written into block.html via setFluidMode().
   */
  fluidModeOverride: FluidMode | null
}

export function createSession(): SessionState {
  return {
    pending: [],
    rejected: [],
    tweaks: [],
    variants: {},
    history: [],
    backedUp: false,
    lastSavedAt: null,
    fluidModeOverride: null,
  }
}

/**
 * Set per-BP fluid override (WP-030 hotfix). Pure reducer — App.tsx mutates
 * the block.html via setFluidMode() at render time + save time.
 *
 * History entry carries `prev` so undo can restore the previous override (or
 * fall through to null when the user toggles for the first time this session).
 */
export function setFluidModeOverride(
  state: SessionState,
  mode: FluidMode,
): SessionState {
  return {
    ...state,
    fluidModeOverride: mode,
    history: [
      ...state.history,
      { type: 'fluid-mode', mode, prev: state.fluidModeOverride },
    ],
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

/**
 * WP-033 Phase 3 — property-scoped tweak removal. Used by the visibility
 * checkbox uncheck path (precise reset of `display:none` only, preserves
 * other tweaks at the same selector+bp). Additive — does NOT replace
 * `removeTweaksFor` (selector+bp scoped); the two coexist.
 *
 * Like `removeTweaksFor`, no history compensation entry — destructive reset.
 */
export function removeTweakFor(
  state: SessionState,
  selector: string,
  bp: number,
  property: string,
): SessionState {
  const next = state.tweaks.filter(
    (t) => !(t.selector === selector && t.bp === bp && t.property === property),
  )
  if (next.length === state.tweaks.length) return state
  return { ...state, tweaks: next }
}

/**
 * Create a named variant (WP-028 Phase 3, Ruling N — deep copy at fork time).
 * Silent no-op if `name` already exists. `payload` is {html, css} snapshotted
 * at fork time by the caller (App.tsx seeds from `block.html / block.css`).
 */
export function createVariant(
  state: SessionState,
  name: string,
  payload: BlockVariant,
): SessionState {
  if (name in state.variants) return state
  return {
    ...state,
    variants: { ...state.variants, [name]: payload },
    history: [...state.history, { type: 'variant-create', name, payload }],
  }
}

/**
 * Rename a variant (WP-028 Phase 3). Silent no-op if:
 *   - source name absent
 *   - target name already exists
 *   - from === to
 */
export function renameVariant(
  state: SessionState,
  from: string,
  to: string,
): SessionState {
  if (from === to) return state
  if (!(from in state.variants)) return state
  if (to in state.variants) return state
  const { [from]: moving, ...rest } = state.variants
  return {
    ...state,
    variants: { ...rest, [to]: moving },
    history: [...state.history, { type: 'variant-rename', from, to }],
  }
}

/**
 * Delete a variant (WP-028 Phase 3). Silent no-op if `name` absent.
 * History carries `prev: BlockVariant` so undo restores the full payload,
 * not just the name slot.
 */
export function deleteVariant(state: SessionState, name: string): SessionState {
  const existing = state.variants[name]
  if (!existing) return state
  const { [name]: _drop, ...rest } = state.variants
  return {
    ...state,
    variants: rest,
    history: [...state.history, { type: 'variant-delete', name, prev: existing }],
  }
}

/**
 * Update variant content (WP-028 Phase 4). Silent no-ops:
 *   - variant not found (rename-race: debounce fired after delete/rename)
 *   - new content byte-identical to existing (no history noise)
 *
 * History carries `prev: BlockVariant` so undo restores the pre-edit content.
 */
export function updateVariantContent(
  state: SessionState,
  name: string,
  content: BlockVariant,
): SessionState {
  const existing = state.variants[name]
  if (!existing) return state
  if (existing.html === content.html && existing.css === content.css) return state
  return {
    ...state,
    variants: { ...state.variants, [name]: content },
    history: [...state.history, { type: 'variant-update', name, prev: existing }],
  }
}

/** Roll back the latest action. No-op on empty history. */
export function undo(state: SessionState): SessionState {
  const last = state.history[state.history.length - 1]
  if (!last) return state
  const history = state.history.slice(0, -1)
  if (last.type === 'tweak') {
    return { ...state, tweaks: state.tweaks.slice(0, -1), history }
  }
  if (last.type === 'variant-create') {
    const { [last.name]: _drop, ...rest } = state.variants
    return { ...state, variants: rest, history }
  }
  if (last.type === 'variant-rename') {
    // Rename was `from → to`; undo swaps back. No-op silently if `to` is missing
    // (defensive — shouldn't happen because reducers are the only writer).
    if (!(last.to in state.variants)) return { ...state, history }
    const { [last.to]: moving, ...rest } = state.variants
    return { ...state, variants: { ...rest, [last.from]: moving }, history }
  }
  if (last.type === 'variant-delete') {
    return {
      ...state,
      variants: { ...state.variants, [last.name]: last.prev },
      history,
    }
  }
  if (last.type === 'variant-update') {
    // Silent no-op if the variant was deleted between edit and undo (defensive).
    if (!(last.name in state.variants)) return { ...state, history }
    return {
      ...state,
      variants: { ...state.variants, [last.name]: last.prev },
      history,
    }
  }
  if (last.type === 'fluid-mode') {
    return { ...state, fluidModeOverride: last.prev, history }
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
 * WP-028 Phase 3 — accepts optional `savedVariants` to align session.variants
 * with disk state after save. Defaults to `state.variants` for backward compat
 * with existing zero-arg callers (the post-save state IS what just hit disk,
 * so preserving it keeps session in sync without an extra refetch dance).
 *
 * Note: `backedUp` is only ever flipped true — never back to false — within
 * a session. The only way to reset is a full `createSession()` call.
 */
export function clearAfterSave(
  state: SessionState,
  savedVariants?: BlockVariants,
): SessionState {
  return {
    pending: [],
    rejected: [],
    tweaks: [],
    variants: savedVariants ?? state.variants,
    history: [],
    backedUp: true,
    lastSavedAt: Date.now(),
    fluidModeOverride: null,
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

/** Derived: any unsaved accept/reject/tweak/variant or fluid-mode action present. */
export function isDirty(state: SessionState): boolean {
  if (
    state.pending.length > 0 ||
    state.rejected.length > 0 ||
    state.tweaks.length > 0 ||
    state.fluidModeOverride !== null
  )
    return true
  // WP-028 Phase 3 — variant-* actions in history drive dirty. After undo pops
  // the last variant-* entry, history no longer contains it → returns to clean.
  return state.history.some(
    (h) =>
      h.type === 'variant-create' ||
      h.type === 'variant-rename' ||
      h.type === 'variant-delete' ||
      h.type === 'variant-update',
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
