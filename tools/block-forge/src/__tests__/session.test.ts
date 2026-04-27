// Phase 4 — session state machine unit tests.
// WP-028 Phase 2 — extended with tweaks (addTweak / removeTweaksFor /
// composeTweakedCss + undo/isDirty tweak-awareness + clearAfterSave resets
// tweaks too).
//
// Pure transitions, no DOM, no React — Vitest default Node env is correct.

import { describe, it, expect } from 'vitest'
import type { Suggestion, Tweak } from '@cmsmasters/block-forge-core'
import type { BlockVariant } from '@cmsmasters/db'
import {
  accept,
  addTweak,
  clearAfterSave,
  composeTweakedCss,
  createSession,
  createVariant,
  deleteVariant,
  isActOn,
  isDirty,
  pickAccepted,
  reject,
  removeTweakFor,
  removeTweaksFor,
  renameVariant,
  setFluidModeOverride,
  undo,
  updateVariantContent,
  type SessionState,
} from '../lib/session'
import { FLUID_DEFAULT } from '../lib/fluid-mode'

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

function makeVariant(overrides: Partial<BlockVariant> = {}): BlockVariant {
  return { html: '<h2>base</h2>', css: '.x { color: blue }', ...overrides }
}

describe('session — createSession', () => {
  it('returns an empty session shape (WP-028 P3: variants: {} present)', () => {
    const s = createSession()
    expect(s).toEqual<SessionState>({
      pending: [],
      rejected: [],
      tweaks: [],
      variants: {},
      history: [],
      backedUp: false,
      lastSavedAt: null,
      fluidModeOverride: null,
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

describe('session — removeTweakFor (WP-033 Phase 3)', () => {
  it('removes only the tweak matching (selector, bp, property); preserves others at same selector+bp', () => {
    const s = addTweak(
      addTweak(
        createSession(),
        makeTweak({ selector: '.x', bp: 1440, property: 'display', value: 'none' }),
      ),
      makeTweak({ selector: '.x', bp: 1440, property: 'font-size', value: '48px' }),
    )
    const next = removeTweakFor(s, '.x', 1440, 'display')
    expect(next.tweaks).toHaveLength(1)
    expect(next.tweaks[0].property).toBe('font-size')
  })

  it('does NOT affect tweaks at different BPs', () => {
    const s = addTweak(
      addTweak(
        createSession(),
        makeTweak({ selector: '.x', bp: 1440, property: 'display', value: 'none' }),
      ),
      makeTweak({ selector: '.x', bp: 768, property: 'display', value: 'none' }),
    )
    const next = removeTweakFor(s, '.x', 1440, 'display')
    expect(next.tweaks).toHaveLength(1)
    expect(next.tweaks[0].bp).toBe(768)
  })

  it('is a no-op (same ref) when nothing matches', () => {
    const s = addTweak(
      createSession(),
      makeTweak({ selector: '.x', bp: 1440, property: 'font-size', value: '48px' }),
    )
    const next = removeTweakFor(s, '.x', 1440, 'display')
    expect(next).toBe(s)
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

describe('session — createVariant (WP-028 Phase 3)', () => {
  it('appends new variant + pushes history entry', () => {
    const v = makeVariant({ html: '<h2>sm</h2>', css: '.x { padding: 12px }' })
    const s = createVariant(createSession(), 'sm', v)
    expect(s.variants).toEqual({ sm: v })
    expect(s.history).toEqual([{ type: 'variant-create', name: 'sm', payload: v }])
  })

  it('duplicate name is a silent no-op (same state reference)', () => {
    const v1 = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v1)
    const s2 = createVariant(s1, 'sm', makeVariant({ html: '<h2>alt</h2>' }))
    expect(s2).toBe(s1)
  })

  it('multiple variants accumulate in order of insertion', () => {
    const v1 = makeVariant({ html: '<h2>a</h2>' })
    const v2 = makeVariant({ html: '<h2>b</h2>' })
    const s = createVariant(createVariant(createSession(), 'a', v1), 'b', v2)
    expect(Object.keys(s.variants)).toEqual(['a', 'b'])
    expect(s.history.map((h) => h.type)).toEqual(['variant-create', 'variant-create'])
  })
})

describe('session — renameVariant (WP-028 Phase 3)', () => {
  it('renames the slot + pushes history entry', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = renameVariant(s1, 'sm', 'mobile')
    expect(s2.variants).toEqual({ mobile: v })
    expect(s2.history[s2.history.length - 1]).toEqual({
      type: 'variant-rename',
      from: 'sm',
      to: 'mobile',
    })
  })

  it('rename to-existing name is a silent no-op (same state reference)', () => {
    const v1 = makeVariant({ html: '<h2>a</h2>' })
    const v2 = makeVariant({ html: '<h2>b</h2>' })
    const s1 = createVariant(createVariant(createSession(), 'sm', v1), 'md', v2)
    const s2 = renameVariant(s1, 'sm', 'md')
    expect(s2).toBe(s1)
  })

  it('rename missing-source is a silent no-op', () => {
    const s1 = createSession()
    const s2 = renameVariant(s1, 'nonexistent', 'target')
    expect(s2).toBe(s1)
  })

  it('rename from === to is a silent no-op', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = renameVariant(s1, 'sm', 'sm')
    expect(s2).toBe(s1)
  })
})

describe('session — deleteVariant (WP-028 Phase 3)', () => {
  it('removes variant + stores prev payload in history', () => {
    const v = makeVariant({ css: '.preserve { me: true }' })
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = deleteVariant(s1, 'sm')
    expect(s2.variants).toEqual({})
    expect(s2.history[s2.history.length - 1]).toEqual({
      type: 'variant-delete',
      name: 'sm',
      prev: v,
    })
  })

  it('delete missing name is a silent no-op', () => {
    const s1 = createSession()
    const s2 = deleteVariant(s1, 'nonexistent')
    expect(s2).toBe(s1)
  })
})

describe('session — undo for variant-* actions (WP-028 Phase 3)', () => {
  it('undo create removes the variant + pops history', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = undo(s1)
    expect(s2.variants).toEqual({})
    expect(s2.history).toEqual([])
  })

  it('undo rename swaps the name back', () => {
    const v = makeVariant()
    const s1 = renameVariant(createVariant(createSession(), 'sm', v), 'sm', 'mobile')
    const s2 = undo(s1)
    expect(s2.variants).toEqual({ sm: v })
    expect(s2.history.map((h) => h.type)).toEqual(['variant-create'])
  })

  it('undo delete restores with prev payload intact', () => {
    const v = makeVariant({ css: '.important { keep: this }' })
    const s1 = deleteVariant(createVariant(createSession(), 'sm', v), 'sm')
    const s2 = undo(s1)
    expect(s2.variants).toEqual({ sm: v })
    expect(s2.history.map((h) => h.type)).toEqual(['variant-create'])
  })

  it('undo through a full create → rename → delete chain leaves an empty session', () => {
    const v = makeVariant()
    let s = createVariant(createSession(), 'sm', v)
    s = renameVariant(s, 'sm', 'mobile')
    s = deleteVariant(s, 'mobile')
    // 3 actions in history; undo each.
    expect(s.history.length).toBe(3)
    s = undo(s) // undo delete → restore "mobile"
    s = undo(s) // undo rename → swap back to "sm"
    s = undo(s) // undo create → remove "sm"
    expect(s.variants).toEqual({})
    expect(s.history).toEqual([])
  })
})

describe('session — isDirty with variants (WP-028 Phase 3)', () => {
  it('true after variant-create; false after undo', () => {
    const s1 = createVariant(createSession(), 'sm', makeVariant())
    expect(isDirty(s1)).toBe(true)
    expect(isDirty(undo(s1))).toBe(false)
  })

  it('true after variant-delete even when variants become empty', () => {
    const s1 = createVariant(createSession(), 'sm', makeVariant())
    // After create + delete, variants={} but history records BOTH actions → still dirty.
    const s2 = deleteVariant(s1, 'sm')
    expect(s2.variants).toEqual({})
    expect(isDirty(s2)).toBe(true)
  })

  it('clearAfterSave with savedVariants aligns session + returns clean isDirty', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = clearAfterSave(s1, { sm: v })
    expect(s2.variants).toEqual({ sm: v })
    expect(isDirty(s2)).toBe(false)
  })

  it('clearAfterSave with no savedVariants arg preserves session.variants (backward compat)', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = clearAfterSave(s1)
    expect(s2.variants).toEqual({ sm: v })
    expect(isDirty(s2)).toBe(false)
  })
})

describe('session — updateVariantContent (WP-028 Phase 4)', () => {
  it('updates the variant content + pushes history with prev payload for undo', () => {
    const v = makeVariant({ html: '<h2>orig</h2>', css: '.orig{}' })
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = updateVariantContent(s1, 'sm', { html: '<h2>edited</h2>', css: '.edited{}' })
    expect(s2.variants).toEqual({ sm: { html: '<h2>edited</h2>', css: '.edited{}' } })
    expect(s2.history[s2.history.length - 1]).toEqual({
      type: 'variant-update',
      name: 'sm',
      prev: v,
    })
  })

  it('no-op (same state ref) when new content is byte-identical to existing', () => {
    const v = makeVariant({ html: '<h2>same</h2>', css: '.same{}' })
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = updateVariantContent(s1, 'sm', { html: '<h2>same</h2>', css: '.same{}' })
    expect(s2).toBe(s1)
  })

  it('no-op (same state ref) when variant missing (rename-race safety)', () => {
    const s1 = createSession()
    const s2 = updateVariantContent(s1, 'missing', { html: 'x', css: 'y' })
    expect(s2).toBe(s1)
  })

  it('undo reverts update content to the prev payload', () => {
    const v = makeVariant({ html: '<h2>orig</h2>', css: '.orig{}' })
    const s1 = createVariant(createSession(), 'sm', v)
    const s2 = updateVariantContent(s1, 'sm', { html: '<h2>edited</h2>', css: '.edited{}' })
    const s3 = undo(s2)
    expect(s3.variants).toEqual({ sm: v })
    expect(s3.history.map((h) => h.type)).toEqual(['variant-create'])
  })

  it('isDirty is true after updateVariantContent and false after undo', () => {
    const v = makeVariant()
    const s1 = createVariant(createSession(), 'sm', v)
    const saved = clearAfterSave(s1) // clean baseline from first save
    expect(isDirty(saved)).toBe(false)
    const s2 = updateVariantContent(saved, 'sm', { html: '<h2>new</h2>', css: '' })
    expect(isDirty(s2)).toBe(true)
    expect(isDirty(undo(s2))).toBe(false)
  })
})

describe('session — setFluidModeOverride (WP-030 redesign)', () => {
  it('sets the override + pushes a fluid-mode history entry carrying prev=null', () => {
    const s = setFluidModeOverride(createSession(), { tablet: 'off', mobile: 'on' })
    expect(s.fluidModeOverride).toEqual({ tablet: 'off', mobile: 'on' })
    expect(s.history).toEqual([
      { type: 'fluid-mode', mode: { tablet: 'off', mobile: 'on' }, prev: null },
    ])
  })

  it('isDirty becomes true on override; clearAfterSave resets back to null', () => {
    const s = setFluidModeOverride(createSession(), { tablet: 'off', mobile: 'off' })
    expect(isDirty(s)).toBe(true)
    const cleared = clearAfterSave(s)
    expect(cleared.fluidModeOverride).toBeNull()
    expect(isDirty(cleared)).toBe(false)
  })

  it('undo restores the previous override (chain: A → B → undo → A)', () => {
    const s1 = setFluidModeOverride(createSession(), { tablet: 'off', mobile: 'on' })
    const s2 = setFluidModeOverride(s1, { tablet: 'off', mobile: 'off' })
    const undone = undo(s2)
    expect(undone.fluidModeOverride).toEqual({ tablet: 'off', mobile: 'on' })
  })

  it('undo of the first override restores null (back to fall-through to block.html)', () => {
    const s = setFluidModeOverride(createSession(), FLUID_DEFAULT)
    const undone = undo(s)
    expect(undone.fluidModeOverride).toBeNull()
    expect(undone.history).toEqual([])
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
