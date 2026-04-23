// Phase 4 — session state machine unit tests.
// Pure transitions, no DOM, no React — Vitest default Node env is correct.
// 15 cases per task prompt §4.2.

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
} from '../lib/session'

// Minimal suggestion factory for pickAccepted test only. Matches the core
// Suggestion shape enough for filtering-by-id behavior; other fields are
// deliberately arbitrary because the filter only reads `.id`.
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

describe('session — createSession', () => {
  it('returns an empty session shape', () => {
    const s = createSession()
    expect(s).toEqual<SessionState>({
      pending: [],
      rejected: [],
      history: [],
      backedUp: false,
      lastSavedAt: null,
    })
  })
})

describe('session — accept', () => {
  it('moves id into pending and records history', () => {
    const s = accept(createSession(), 'sugg-a')
    expect(s.pending).toEqual(['sugg-a'])
    expect(s.rejected).toEqual([])
    expect(s.history).toEqual([{ type: 'accept', id: 'sugg-a' }])
  })

  it('no-op on already-pending id (content equality)', () => {
    const s1 = accept(createSession(), 'sugg-a')
    const s2 = accept(s1, 'sugg-a')
    // Reference may or may not be the same — contract is content equality.
    expect(s2).toEqual(s1)
  })

  it('no-op on already-rejected id (content equality)', () => {
    const rejected = reject(createSession(), 'sugg-a')
    const afterAccept = accept(rejected, 'sugg-a')
    expect(afterAccept).toEqual(rejected)
  })
})

describe('session — reject', () => {
  it('moves id into rejected and records history', () => {
    const s = reject(createSession(), 'sugg-b')
    expect(s.rejected).toEqual(['sugg-b'])
    expect(s.pending).toEqual([])
    expect(s.history).toEqual([{ type: 'reject', id: 'sugg-b' }])
  })

  it('no-op on already-pending id (content equality)', () => {
    const pending = accept(createSession(), 'sugg-c')
    const afterReject = reject(pending, 'sugg-c')
    expect(afterReject).toEqual(pending)
  })
})

describe('session — undo', () => {
  it('rolls back an accept: removes id from pending and pops history', () => {
    const s1 = accept(createSession(), 'sugg-x')
    const s2 = undo(s1)
    expect(s2.pending).toEqual([])
    expect(s2.history).toEqual([])
  })

  it('rolls back a reject: removes id from rejected and pops history', () => {
    const s1 = reject(createSession(), 'sugg-y')
    const s2 = undo(s1)
    expect(s2.rejected).toEqual([])
    expect(s2.history).toEqual([])
  })

  it('no-op on empty history', () => {
    const s = createSession()
    const after = undo(s)
    expect(after).toEqual(s)
  })

  it('accept → accept → undo rolls back only the second', () => {
    const s1 = accept(createSession(), 'sugg-1')
    const s2 = accept(s1, 'sugg-2')
    const s3 = undo(s2)
    expect(s3.pending).toEqual(['sugg-1'])
    expect(s3.history).toEqual([{ type: 'accept', id: 'sugg-1' }])
  })
})

describe('session — clearAfterSave', () => {
  it('clears pending/rejected/history; flips backedUp=true; stamps lastSavedAt > 0', () => {
    const before = Date.now()
    const s = clearAfterSave(
      reject(accept(createSession(), 'sugg-a'), 'sugg-b'),
    )
    expect(s.pending).toEqual([])
    expect(s.rejected).toEqual([])
    expect(s.history).toEqual([])
    expect(s.backedUp).toBe(true)
    expect(s.lastSavedAt).not.toBeNull()
    expect(s.lastSavedAt ?? 0).toBeGreaterThanOrEqual(before)
  })

  it('on already-saved state: backedUp stays true, timestamp updates', async () => {
    const first = clearAfterSave(accept(createSession(), 'sugg-a'))
    // Small pause so Date.now() advances across OS clock granularity.
    await new Promise((r) => setTimeout(r, 2))
    const second = clearAfterSave(first)
    expect(second.backedUp).toBe(true)
    expect((second.lastSavedAt ?? 0) >= (first.lastSavedAt ?? 0)).toBe(true)
  })
})

describe('session — isActOn', () => {
  it('true for pending AND rejected ids; false otherwise', () => {
    const s = reject(accept(createSession(), 'sugg-p'), 'sugg-r')
    expect(isActOn(s, 'sugg-p')).toBe(true)
    expect(isActOn(s, 'sugg-r')).toBe(true)
    expect(isActOn(s, 'sugg-unseen')).toBe(false)
  })
})

describe('session — pickAccepted', () => {
  it('filters suggestions to those in pending, preserves input order', () => {
    const suggestions = [
      makeSuggestion('a'),
      makeSuggestion('b'),
      makeSuggestion('c'),
    ]
    const s = accept(accept(createSession(), 'c'), 'a')
    const picked = pickAccepted(s, suggestions)
    // Order reflects the suggestions array, not the accept order.
    expect(picked.map((p) => p.id)).toEqual(['a', 'c'])
  })
})

describe('session — isDirty', () => {
  it('true when pending only, true when rejected only, true when both, false when empty', () => {
    expect(isDirty(createSession())).toBe(false)
    expect(isDirty(accept(createSession(), 'a'))).toBe(true)
    expect(isDirty(reject(createSession(), 'b'))).toBe(true)
    expect(
      isDirty(reject(accept(createSession(), 'a'), 'b')),
    ).toBe(true)
    // After save: clean.
    expect(isDirty(clearAfterSave(accept(createSession(), 'a')))).toBe(false)
  })
})
