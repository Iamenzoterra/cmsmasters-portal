// WP-036 Phase 2 — grouping primitives unit tests.
// Pure functions — `groupKey` (tuple → key) + `buildEntries` (sorted → entries).
// Cross-surface parity contract: tests here mirror
// apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-grouping.test.ts.

import { describe, it, expect } from 'vitest'
import type { Suggestion } from '@cmsmasters/block-forge-core'
import { groupKey, buildEntries } from '../components/SuggestionList'

function makeSugg(
  id: string,
  selector: string,
  overrides: Partial<Suggestion> = {},
): Suggestion {
  return {
    id,
    heuristic: 'horizontal-overflow',
    selector,
    bp: 480,
    property: 'overflow-x',
    value: 'auto',
    rationale: 'white-space: nowrap without overflow-x fallback',
    confidence: 'low',
    ...overrides,
  }
}

describe('groupKey', () => {
  it('produces identical keys for visually-identical suggestions on different selectors', () => {
    const a = makeSugg('a', '.foo')
    const b = makeSugg('b', '.bar')
    expect(groupKey(a)).toBe(groupKey(b))
  })

  it('different rationale produces different key (e.g. font-clamp 60px vs 48px)', () => {
    const a = makeSugg('a', '.foo', { heuristic: 'font-clamp', rationale: 'large font-size (60px)' })
    const b = makeSugg('b', '.foo', { heuristic: 'font-clamp', rationale: 'large font-size (48px)' })
    expect(groupKey(a)).not.toBe(groupKey(b))
  })

  it('different bp produces different key (480 vs 768)', () => {
    const a = makeSugg('a', '.foo', { bp: 480 })
    const b = makeSugg('b', '.foo', { bp: 768 })
    expect(groupKey(a)).not.toBe(groupKey(b))
  })

  it('different property produces different key (overflow-x vs overflow-y)', () => {
    const a = makeSugg('a', '.foo', { property: 'overflow-x' })
    const b = makeSugg('b', '.foo', { property: 'overflow-y' })
    expect(groupKey(a)).not.toBe(groupKey(b))
  })
})

describe('buildEntries', () => {
  it('singleton suggestion → kind:single entry', () => {
    const entries = buildEntries([makeSugg('a', '.foo')])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('single')
    if (entries[0].kind === 'single') {
      expect(entries[0].suggestion.id).toBe('a')
    }
  })

  it('two visually-identical suggestions → kind:group with both members', () => {
    const entries = buildEntries([makeSugg('a', '.foo'), makeSugg('b', '.bar')])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('group')
    if (entries[0].kind === 'group') {
      expect(entries[0].suggestions.map((s) => s.id)).toEqual(['a', 'b'])
    }
  })

  it('mixed: two-member group + singleton renders as 2 entries', () => {
    const entries = buildEntries([
      makeSugg('a', '.foo'), // group with b
      makeSugg('b', '.bar'), // group with a
      makeSugg('c', '.baz', { heuristic: 'font-clamp', rationale: 'big font' }), // alone
    ])
    expect(entries).toHaveLength(2)
    expect(entries[0].kind).toBe('group')
    expect(entries[1].kind).toBe('single')
  })

  it('preserves first-encounter order (insertion order of group keys)', () => {
    const entries = buildEntries([
      makeSugg('a', '.foo', { heuristic: 'font-clamp', rationale: 'big' }),
      makeSugg('b', '.bar'), // horizontal-overflow
      makeSugg('c', '.baz', { heuristic: 'font-clamp', rationale: 'big' }), // joins font-clamp group
    ])
    expect(entries).toHaveLength(2)
    if (entries[0].kind === 'group') {
      expect(entries[0].suggestions.map((s) => s.id)).toEqual(['a', 'c'])
    }
    if (entries[1].kind === 'single') {
      expect(entries[1].suggestion.id).toBe('b')
    }
  })

  it('three-member group (matches global-settings live fixture)', () => {
    const entries = buildEntries([
      makeSugg('a', '.block-global-settings__card-title'),
      makeSugg('b', '.block-global-settings__color-label'),
      makeSugg('c', '.block-global-settings__element-row'),
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0].kind).toBe('group')
    if (entries[0].kind === 'group') {
      expect(entries[0].suggestions).toHaveLength(3)
    }
  })
})
