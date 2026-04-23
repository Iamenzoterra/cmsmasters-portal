// WP-027 Phase 1 — session-state unit tests.
// Mirror of tools/block-forge/src/__tests__/session.test.ts case-for-case,
// minus backedUp/lastSavedAt cases (fields absent in Studio version), plus
// one extra case (16) verifying unbounded history.
//
// Pure transitions → Vitest default env is fine; no DOM, no RTL.

import { describe, it, expect } from 'vitest'
import type { Suggestion } from '@cmsmasters/block-forge-core'
import {
  accept,
  clearAfterSave,
  createSession,
  isActOn,
  isDirty,
  pickAccepted,
  reject,
  undo,
  type SessionState,
} from '../session-state'

// Minimal suggestion factory for pickAccepted test. Matches core Suggestion
// shape enough for id-based filtering; other fields arbitrary.
function makeSuggestion(id: string): Suggestion {
  return {
    id,
    heuristic: 'font-clamp',
    selector: '.test',
    bp: 0,
    property: 'font-size',
    value: 'clamp(1rem, 2vw, 2rem)',
    rationale: 'test',
    confidence: 'medium',
  }
}

describe('session-state', () => {
  // ── 1. createSession ──
  it('createSession returns an empty session shape', () => {
    const s = createSession()
    expect(s).toEqual<SessionState>({
      pending: [],
      rejected: [],
      history: [],
    })
  })

  // ── 2. accept appends + pushes history ──
  it('accept appends id to pending and pushes accept action to history', () => {
    const s = accept(createSession(), 'sugg-a')
    expect(s.pending).toEqual(['sugg-a'])
    expect(s.rejected).toEqual([])
    expect(s.history).toEqual([{ type: 'accept', id: 'sugg-a' }])
  })

  // ── 3. reject appends + pushes history ──
  it('reject appends id to rejected and pushes reject action to history', () => {
    const s = reject(createSession(), 'sugg-b')
    expect(s.rejected).toEqual(['sugg-b'])
    expect(s.pending).toEqual([])
    expect(s.history).toEqual([{ type: 'reject', id: 'sugg-b' }])
  })

  // ── 4. accept on already-pending → SAME reference (strict identity) ──
  it('accept on already-pending id returns the SAME state reference (no-op)', () => {
    const s1 = accept(createSession(), 'sugg-a')
    const s2 = accept(s1, 'sugg-a')
    expect(s2).toBe(s1)
  })

  // ── 5. accept on already-rejected → SAME reference (no cross-set toggle) ──
  it('accept on already-rejected id returns the SAME state reference (no-op; not a cross-set toggle)', () => {
    const rejected = reject(createSession(), 'sugg-a')
    const afterAccept = accept(rejected, 'sugg-a')
    expect(afterAccept).toBe(rejected)
  })

  // ── 6. reject on already-pending → SAME reference ──
  it('reject on already-pending id returns the SAME state reference (no-op)', () => {
    const pending = accept(createSession(), 'sugg-c')
    const afterReject = reject(pending, 'sugg-c')
    expect(afterReject).toBe(pending)
  })

  // ── 7. reject on already-rejected → SAME reference ──
  it('reject on already-rejected id returns the SAME state reference (no-op)', () => {
    const rejected = reject(createSession(), 'sugg-d')
    const afterReject = reject(rejected, 'sugg-d')
    expect(afterReject).toBe(rejected)
  })

  // ── 8. undo after accept ──
  it('undo rolls back an accept: removes id from pending, pops history', () => {
    const s1 = accept(createSession(), 'sugg-x')
    const s2 = undo(s1)
    expect(s2.pending).toEqual([])
    expect(s2.history).toEqual([])
  })

  // ── 9. undo after reject ──
  it('undo rolls back a reject: removes id from rejected, pops history', () => {
    const s1 = reject(createSession(), 'sugg-y')
    const s2 = undo(s1)
    expect(s2.rejected).toEqual([])
    expect(s2.history).toEqual([])
  })

  // ── 10. undo on empty history → SAME reference ──
  it('undo on empty history returns the SAME state reference (no-op)', () => {
    const s = createSession()
    const after = undo(s)
    expect(after).toBe(s)
  })

  // ── 11. Multiple accepts preserve insertion order ──
  it('multiple accepts preserve insertion order in pending', () => {
    const s = accept(accept(accept(createSession(), 'first'), 'second'), 'third')
    expect(s.pending).toEqual(['first', 'second', 'third'])
    expect(s.history).toEqual([
      { type: 'accept', id: 'first' },
      { type: 'accept', id: 'second' },
      { type: 'accept', id: 'third' },
    ])
  })

  // ── 12. clearAfterSave returns empty regardless of input state ──
  it('clearAfterSave returns empty pending/rejected/history regardless of input', () => {
    const dirty = reject(accept(accept(createSession(), 'a'), 'b'), 'c')
    const cleared = clearAfterSave(dirty)
    expect(cleared).toEqual<SessionState>({
      pending: [],
      rejected: [],
      history: [],
    })
  })

  // ── 13. isActOn returns boolean primitive (not union) ──
  it('isActOn returns a boolean primitive for pending/rejected/unseen ids', () => {
    const s = reject(accept(createSession(), 'sugg-p'), 'sugg-r')
    expect(isActOn(s, 'sugg-p')).toBe(true)
    expect(isActOn(s, 'sugg-r')).toBe(true)
    expect(isActOn(s, 'sugg-unseen')).toBe(false)
    expect(typeof isActOn(s, 'sugg-p')).toBe('boolean')
    expect(typeof isActOn(s, 'sugg-unseen')).toBe('boolean')
  })

  // ── 14. pickAccepted filters + preserves input order ──
  it('pickAccepted filters suggestions to ids in pending, preserving input array order', () => {
    const suggestions = [
      makeSuggestion('a'),
      makeSuggestion('b'),
      makeSuggestion('c'),
    ]
    // Accept in reverse of input order to prove input-order is preserved.
    const s = accept(accept(createSession(), 'c'), 'a')
    const picked = pickAccepted(s, suggestions)
    expect(picked.map((p) => p.id)).toEqual(['a', 'c'])
  })

  // ── 15. isDirty true/false conditions ──
  it('isDirty is true when pending or rejected non-empty, false otherwise', () => {
    expect(isDirty(createSession())).toBe(false)
    expect(isDirty(accept(createSession(), 'a'))).toBe(true)
    expect(isDirty(reject(createSession(), 'b'))).toBe(true)
    expect(isDirty(reject(accept(createSession(), 'a'), 'b'))).toBe(true)
    // After clearAfterSave: clean again.
    expect(isDirty(clearAfterSave(accept(createSession(), 'a')))).toBe(false)
  })

  // ── 16. Unbounded history — push 20 accepts, verify history.length === 20 ──
  it('history is unbounded (no cap) — 20 accepts yield history.length === 20', () => {
    let s = createSession()
    for (let i = 0; i < 20; i++) {
      s = accept(s, `sugg-${i}`)
    }
    expect(s.pending).toHaveLength(20)
    expect(s.history).toHaveLength(20)
    expect(s.history[0]).toEqual({ type: 'accept', id: 'sugg-0' })
    expect(s.history[19]).toEqual({ type: 'accept', id: 'sugg-19' })
  })
})
