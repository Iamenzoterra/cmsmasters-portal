/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { deriveBreakpointTruth } from './breakpoint-truth'
import type { BreakpointGrid } from './types'

// Hand-rolled minimal fixtures — `BreakpointGrid` only needs `min-width` +
// `columns` for the derivator to work end-to-end. `columns` stays empty
// because the narrator never reads it.
const makeGrid = (entries: Record<string, number>): Record<string, BreakpointGrid> => {
  const out: Record<string, BreakpointGrid> = {}
  for (const [key, minWidth] of Object.entries(entries)) {
    out[key] = { 'min-width': `${minWidth}px`, columns: {} }
  }
  return out
}

describe('deriveBreakpointTruth', () => {
  it('canonical key present with matching width', () => {
    const t = deriveBreakpointTruth('tablet', makeGrid({ desktop: 1440, tablet: 768 }))
    expect(t).toMatchObject({
      canonicalId: 'tablet',
      canonicalWidth: 768,
      resolvedKey: 'tablet',
      resolvedMinWidth: 768,
      hasCanonicalGridKey: true,
      isNonCanonicalMatch: false,
      isFallbackResolved: false,
      willMaterializeCanonicalKey: false,
      materializationSourceKey: 'tablet',
    })
  })

  it('canonical key present but width diverges (pathological)', () => {
    const t = deriveBreakpointTruth('tablet', makeGrid({ desktop: 1440, tablet: 900 }))
    expect(t.hasCanonicalGridKey).toBe(true)
    expect(t.isNonCanonicalMatch).toBe(true)
    expect(t.willMaterializeCanonicalKey).toBe(false)
    expect(t.resolvedKey).toBe('tablet')
    expect(t.resolvedMinWidth).toBe(900)
  })

  it('canonical key absent, fallback resolves to a non-canonical alias', () => {
    const t = deriveBreakpointTruth(
      'tablet',
      makeGrid({ desktop: 1440, 'theme-tablet': 1400 }),
    )
    expect(t).toMatchObject({
      hasCanonicalGridKey: false,
      isFallbackResolved: true,
      willMaterializeCanonicalKey: true,
      materializationSourceKey: 'theme-tablet',
      resolvedKey: 'theme-tablet',
      resolvedMinWidth: 1400,
    })
    expect(t.isNonCanonicalMatch).toBe(true)
  })

  it('canonical key absent, only a far-away grid remains → fallback to nearest (here: desktop)', () => {
    const t = deriveBreakpointTruth('mobile', makeGrid({ desktop: 1440 }))
    expect(t).toMatchObject({
      hasCanonicalGridKey: false,
      isFallbackResolved: true,
      willMaterializeCanonicalKey: true,
      materializationSourceKey: 'desktop',
      resolvedKey: 'desktop',
      resolvedMinWidth: 1440,
    })
  })

  it('exact canonical desktop + canonical width = happy path (no flags)', () => {
    const t = deriveBreakpointTruth('desktop', makeGrid({ desktop: 1440, tablet: 768 }))
    expect(t.isNonCanonicalMatch).toBe(false)
    expect(t.isFallbackResolved).toBe(false)
    expect(t.willMaterializeCanonicalKey).toBe(false)
    expect(t.hasCanonicalGridKey).toBe(true)
    expect(t.resolvedKey).toBe('desktop')
    expect(t.resolvedMinWidth).toBe(1440)
  })

  // Added in P2 follow-up to close AC #6 — exercises the Recovered-only
  // badge state: canonical key missing, fallback lands on an alias whose
  // width HAPPENS to match canonical, so isNonCanonicalMatch stays false.
  // In the 5-case set above, every fallback scenario also had a divergent
  // width, masking this branch.
  it('canonical key absent, fallback alias width matches canonical → Recovered only (no Non-canonical)', () => {
    const t = deriveBreakpointTruth(
      'tablet',
      makeGrid({ desktop: 1440, 'theme-tablet': 768 }),
    )
    expect(t).toMatchObject({
      canonicalId: 'tablet',
      canonicalWidth: 768,
      resolvedKey: 'theme-tablet',
      resolvedMinWidth: 768,
      hasCanonicalGridKey: false,
      isFallbackResolved: true,
      isNonCanonicalMatch: false,
      willMaterializeCanonicalKey: true,
      materializationSourceKey: 'theme-tablet',
    })
  })
})
