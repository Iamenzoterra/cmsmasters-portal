// @vitest-environment jsdom
// WP-033 Phase 4 — Studio-local css-mutate.ts unit tests.
//
// Verifies removeDeclarationFromCss handles:
//   - bp=0 top-level rule removal
//   - bp>0 @container slot rule removal
//   - empty rule cleanup (no leftover orphan)
//   - empty container cleanup
//   - no-match no-op (returns input verbatim semantics)
//   - other-property preservation in same rule

import { describe, it, expect } from 'vitest'
import { removeDeclarationFromCss } from '../lib/css-mutate'

describe('removeDeclarationFromCss — bp=0 top-level', () => {
  it('removes the matching declaration', () => {
    const css = `.x { display: none; font-size: 16px; }`
    const next = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(next).not.toContain('display: none')
    expect(next).toContain('font-size: 16px')
  })

  it('removes the rule when only the target decl was present', () => {
    const css = `.x { display: none; }`
    const next = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(next.trim()).toBe('')
  })

  it('does NOT match @container rules when bp=0', () => {
    const css = `@container slot (max-width: 768px) { .x { display: none; } }`
    const next = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(next).toContain('display: none')
  })
})

describe('removeDeclarationFromCss — bp>0 @container slot', () => {
  it('removes the matching declaration inside @container', () => {
    const css = `@container slot (max-width: 768px) { .x { display: none; font-size: 14px; } }`
    const next = removeDeclarationFromCss(css, '.x', 768, 'display')
    expect(next).not.toContain('display: none')
    expect(next).toContain('font-size: 14px')
  })

  it('removes the rule + container when only the target decl was present', () => {
    const css = `@container slot (max-width: 768px) { .x { display: none; } }`
    const next = removeDeclarationFromCss(css, '.x', 768, 'display')
    expect(next.trim()).toBe('')
  })

  it('does NOT match a different bp container', () => {
    const css = `@container slot (max-width: 768px) { .x { display: none; } }`
    const next = removeDeclarationFromCss(css, '.x', 1440, 'display')
    expect(next).toContain('display: none')
  })

  it('preserves other selectors in the same @container', () => {
    const css = `@container slot (max-width: 768px) { .x { display: none; } .y { font-size: 12px; } }`
    const next = removeDeclarationFromCss(css, '.x', 768, 'display')
    expect(next).not.toContain('.x')
    expect(next).toContain('.y')
    expect(next).toContain('font-size: 12px')
  })
})

describe('removeDeclarationFromCss — no-match safety', () => {
  it('returns input unchanged when selector not present', () => {
    const css = `.y { color: red; }`
    const next = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(next).toBe(css)
  })

  it('returns input unchanged when property not present', () => {
    const css = `.x { color: red; }`
    const next = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(next).toBe(css)
  })

  it('returns empty input untouched', () => {
    expect(removeDeclarationFromCss('', '.x', 0, 'display')).toBe('')
    expect(removeDeclarationFromCss('   ', '.x', 0, 'display')).toBe('   ')
  })

  it('survives malformed css gracefully', () => {
    const css = `not a valid css {{{`
    const result = removeDeclarationFromCss(css, '.x', 0, 'display')
    expect(typeof result).toBe('string')
  })
})
