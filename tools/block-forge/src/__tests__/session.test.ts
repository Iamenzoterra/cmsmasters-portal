// Phase 4 — session state machine unit tests.
// WP-028 Phase 2 — extended with tweaks (addTweak / removeTweaksFor /
// composeTweakedCss + undo/isDirty tweak-awareness + clearAfterSave resets
// tweaks too).
//
// Pure transitions, no DOM, no React — Vitest default Node env is correct.

import { describe, it, expect } from 'vitest'
import type { Suggestion, Tweak } from '@cmsmasters/block-forge-core'
import {
  accept,
  addTweak,
  clearAfterSave,
  composeTweakedCss,
  createSession,
  isActOn,
  isDirty,
  pickAccepted,
  reject,
  removeTweaksFor,
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

function makeTweak(overrides: Partial<Tweak> = {}): Tweak {
  return {
    selector: '.cta-btn',
    bp: 480,
    property: 'padding',
    value: '24px',
    ...overrides,
  }
}

describe('session — createSession', () => {
  it('returns an empty session shape (WP-028: tweaks: [] present)', () => {
    const s = createSession()
    expect(s).toEqual<SessionState>({
      pending: [],
      rejected: [],
      tweaks: [],
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
    expect(s.tweaks).toEqual([])
    expect(s.history).toEqual([{ type: 'accept', id: 'sugg-a' }])
  })

  it('no-op on already-pending id (content equality)', () => {
    const s1 = accept(createSession(), 'sugg-a')
    const s2 = accept(s1, 'sugg-a')
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
    expect(s.tweaks).toEqual([])
    expect(s.history).toEqual([{ type: 'reject', id: 'sugg-b' }])
  })

  it('no-op on already-pending id (content equality)', () => {
    const pending = accept(createSession(), 'sugg-c')
    const afterReject = reject(pending, 'sugg-c')
    expect(afterReject).toEqual(pending)
  })
})

describe('session — addTweak (WP-028 Phase 2)', () => {
  it('appends tweak to tweaks + history', () => {
    const t = makeTweak()
    const s = addTweak(createSession(), t)
    expect(s.tweaks).toEqual([t])
    expect(s.history).toEqual([{ type: 'tweak', tweak: t }])
    expect(s.pending).toEqual([])
    expect(s.rejected).toEqual([])
  })

  it('does NOT dedupe — duplicate (selector, bp, property) goes in as a new entry', () => {
    const t1 = makeTweak({ value: '16px' })
    const t2 = makeTweak({ value: '24px' })
    const s = addTweak(addTweak(createSession(), t1), t2)
    expect(s.tweaks).toEqual([t1, t2])
    expect(s.history).toHaveLength(2)
  })

  it('preserves existing accepts/rejects when appending', () => {
    const base = reject(accept(createSession(), 'sugg-a'), 'sugg-b')
    const s = addTweak(base, makeTweak())
    expect(s.pending).toEqual(['sugg-a'])
    expect(s.rejected).toEqual(['sugg-b'])
    expect(s.tweaks).toHaveLength(1)
    expect(s.history).toHaveLength(3)
  })
})

describe('session — removeTweaksFor (WP-028 Phase 2)', () => {
  it('removes all tweaks matching (selector, bp); preserves others', () => {
    const s = addTweak(
      addTweak(
        addTweak(
          createSession(),
          makeTweak({ selector: '.x', bp: 480, property: 'padding' }),
        ),
        makeTweak({ selector: '.x', bp: 480, property: 'font-size', value: '20px' }),
      ),
      makeTweak({ selector: '.y', bp: 480, property: 'padding' }),
    )
    const next = removeTweaksFor(s, '.x', 480)
    expect(next.tweaks).toHaveLength(1)
    expect(next.tweaks[0].selector).toBe('.y')
  })

  it('does NOT affect tweaks at other BPs for the same selector (Ruling J)', () => {
    const s = addTweak(
      addTweak(
        createSession(),
        makeTweak({ selector: '.x', bp: 480, property: 'padding' }),
      ),
      makeTweak({ selector: '.x', bp: 768, property: 'padding' }),
    )
    const next = removeTweaksFor(s, '.x', 480)
    expect(next.tweaks).toHaveLength(1)
    expect(next.tweaks[0].bp).toBe(768)
  })

  it('is a no-op (same ref) when nothing matches', () => {
    const s = addTweak(createSession(), makeTweak({ selector: '.x', bp: 480 }))
    const next = removeTweaksFor(s, '.not-there', 480)
    expect(next).toBe(s)
  })

  it('does NOT push a history entry (destructive reset, not undoable)', () => {
    const s = addTweak(createSession(), makeTweak({ selector: '.x', bp: 480 }))
    const next = removeTweaksFor(s, '.x', 480)
    expect(next.history).toEqual(s.history) // history unchanged
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

  it('rolls back a tweak: pops last tweak and history (WP-028)', () => {
    const t = makeTweak()
    const s1 = addTweak(createSession(), t)
    const s2 = undo(s1)
    expect(s2.tweaks).toEqual([])
    expect(s2.history).toEqual([])
  })

  it('undo is uniform across kinds: accept → tweak → reject → undo×3', () => {
    let s = createSession()
    s = accept(s, 'sugg-1')
    s = addTweak(s, makeTweak())
    s = reject(s, 'sugg-2')

    s = undo(s) // pops reject
    expect(s.rejected).toEqual([])
    expect(s.tweaks).toHaveLength(1)
    expect(s.pending).toEqual(['sugg-1'])

    s = undo(s) // pops tweak
    expect(s.tweaks).toEqual([])
    expect(s.pending).toEqual(['sugg-1'])

    s = undo(s) // pops accept
    expect(s.pending).toEqual([])
    expect(s.history).toEqual([])
  })
})

describe('session — clearAfterSave', () => {
  it('clears pending/rejected/tweaks/history; flips backedUp=true; stamps lastSavedAt > 0', () => {
    const before = Date.now()
    const s = clearAfterSave(
      addTweak(reject(accept(createSession(), 'sugg-a'), 'sugg-b'), makeTweak()),
    )
    expect(s.pending).toEqual([])
    expect(s.rejected).toEqual([])
    expect(s.tweaks).toEqual([])
    expect(s.history).toEqual([])
    expect(s.backedUp).toBe(true)
    expect(s.lastSavedAt).not.toBeNull()
    expect(s.lastSavedAt ?? 0).toBeGreaterThanOrEqual(before)
  })

  it('on already-saved state: backedUp stays true, timestamp updates', async () => {
    const first = clearAfterSave(accept(createSession(), 'sugg-a'))
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
    expect(picked.map((p) => p.id)).toEqual(['a', 'c'])
  })
})

describe('session — isDirty', () => {
  it('true when pending only / rejected only / tweaks only / any combo; false when empty', () => {
    expect(isDirty(createSession())).toBe(false)
    expect(isDirty(accept(createSession(), 'a'))).toBe(true)
    expect(isDirty(reject(createSession(), 'b'))).toBe(true)
    expect(isDirty(addTweak(createSession(), makeTweak()))).toBe(true) // WP-028
    expect(
      isDirty(
        addTweak(reject(accept(createSession(), 'a'), 'b'), makeTweak()),
      ),
    ).toBe(true)
    expect(isDirty(clearAfterSave(accept(createSession(), 'a')))).toBe(false)
  })
})

describe('session — composeTweakedCss (WP-028 Phase 2)', () => {
  it('returns baseline unchanged on empty tweaks list', () => {
    expect(composeTweakedCss('.x { color: red }', [])).toBe('.x { color: red }')
  })

  it('applies tweaks in order — emitTweak produces @container blocks for bp > 0', () => {
    const base = '.x { color: red }'
    const tweaks: Tweak[] = [
      { selector: '.x', bp: 480, property: 'padding', value: '24px' },
      { selector: '.x', bp: 480, property: 'font-size', value: '20px' },
    ]
    const out = composeTweakedCss(base, tweaks)
    expect(out).toContain('@container slot (max-width: 480px)')
    expect(out).toContain('padding: 24px')
    expect(out).toContain('font-size: 20px')
    // Base rule still there.
    expect(out).toContain('.x { color: red }')
  })

  it('is deterministic — same inputs produce same output', () => {
    const base = '.cta-btn { color: blue }'
    const tweaks: Tweak[] = [
      { selector: '.cta-btn', bp: 768, property: 'padding', value: '16px' },
    ]
    expect(composeTweakedCss(base, tweaks)).toBe(
      composeTweakedCss(base, tweaks),
    )
  })
})
