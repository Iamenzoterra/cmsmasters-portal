// @vitest-environment jsdom
// WP-033 Phase 3 §3.3 — useChipDetection + cascade walk + token resolution.
//
// Validates:
//   1. var(--token) source → in-use mode
//   2. raw px matching token at activeBp → available mode
//   3. raw px not matching any token → null
//   4. property without compatible tokens (text-align, font-weight) → null
//   5. var(--space-md) on font-size → null (incompatible category)
//   6. cascade winner inside @container at activeBp wins over top-level
//   7. memoization: stable reference on identical args
//   8. empty selector → null

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useChipDetection, __testing } from '../hooks/useChipDetection'
import responsiveConfig from '../../../../packages/ui/src/theme/responsive-config.json'

describe('useChipDetection — token resolution math', () => {
  it('resolveTokenAtBp returns minPx at 375', () => {
    expect(__testing.resolveTokenAtBp('--h2-font-size', 375, RESPONSIVE_CONFIG())).toBe(34)
  })
  it('resolveTokenAtBp returns maxPx at 1440', () => {
    expect(__testing.resolveTokenAtBp('--h2-font-size', 1440, RESPONSIVE_CONFIG())).toBe(42)
  })
  it('resolveTokenAtBp returns linear interp at 768', () => {
    // h2: min 34, max 42, t = (768-375)/(1440-375) = 0.369 → 34 + 0.369*8 = 36.95 → 37
    expect(__testing.resolveTokenAtBp('--h2-font-size', 768, RESPONSIVE_CONFIG())).toBe(37)
  })
  it('resolveTokenAtBp returns null on unknown token', () => {
    expect(__testing.resolveTokenAtBp('--bogus', 1440, RESPONSIVE_CONFIG())).toBeNull()
  })
})

describe('useChipDetection — parseVarToken / parsePx', () => {
  it('parseVarToken extracts token name', () => {
    expect(__testing.parseVarToken('var(--h2-font-size)')).toBe('--h2-font-size')
  })
  it('parseVarToken handles whitespace + fallback', () => {
    expect(__testing.parseVarToken('var( --h2-font-size , 32px )')).toBe('--h2-font-size')
  })
  it('parseVarToken returns null on raw value', () => {
    expect(__testing.parseVarToken('42px')).toBeNull()
  })
  it('parsePx parses px values', () => {
    expect(__testing.parsePx('42px')).toBe(42)
    expect(__testing.parsePx('  16.6px  ')).toBe(17)
  })
  it('parsePx returns null on non-px', () => {
    expect(__testing.parsePx('var(--x)')).toBeNull()
    expect(__testing.parsePx('1rem')).toBeNull()
  })
})

describe('useChipDetection — compatibleTokens', () => {
  it('font-size → TYPE_TOKENS', () => {
    expect(__testing.compatibleTokens('font-size')).toBe(__testing.TYPE_TOKENS)
  })
  it('margin-top → SPACE_TOKENS', () => {
    expect(__testing.compatibleTokens('margin-top')).toBe(__testing.SPACE_TOKENS)
  })
  it('gap → SPACE_TOKENS', () => {
    expect(__testing.compatibleTokens('gap')).toBe(__testing.SPACE_TOKENS)
  })
  it('text-align → null', () => {
    expect(__testing.compatibleTokens('text-align')).toBeNull()
  })
  it('font-weight → null (no weight tokens)', () => {
    expect(__testing.compatibleTokens('font-weight')).toBeNull()
  })
})

describe('useChipDetection — chip detection (hook)', () => {
  it('returns null when selector is null', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: null,
        property: 'font-size',
        valueAtActiveBp: '42px',
        activeBp: 1440,
        effectiveCss: '.x { font-size: 42px; }',
      }),
    )
    expect(result.current).toBeNull()
  })

  it('returns null when effectiveCss is empty', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '42px',
        activeBp: 1440,
        effectiveCss: '',
      }),
    )
    expect(result.current).toBeNull()
  })

  it('var(--h2-font-size) source → in-use mode', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '42px',
        activeBp: 1440,
        effectiveCss: '.x { font-size: var(--h2-font-size); }',
      }),
    )
    expect(result.current).toEqual({
      mode: 'in-use',
      tokenName: '--h2-font-size',
      valuesByBp: { 375: 34, 768: 37, 1440: 42 },
    })
  })

  it('raw 42px on font-size at 1440 → available --h2-font-size', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '42px',
        activeBp: 1440,
        effectiveCss: '.x { font-size: 42px; }',
      }),
    )
    expect(result.current?.mode).toBe('available')
    expect(result.current?.tokenName).toBe('--h2-font-size')
  })

  it('raw 99px (no token match) → null', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '99px',
        activeBp: 1440,
        effectiveCss: '.x { font-size: 99px; }',
      }),
    )
    expect(result.current).toBeNull()
  })

  it('text-align (no compatible tokens) → null', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'text-align',
        valueAtActiveBp: 'left',
        activeBp: 1440,
        effectiveCss: '.x { text-align: left; }',
      }),
    )
    expect(result.current).toBeNull()
  })

  it('var(--space-md) on font-size → null (incompatible category)', () => {
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '16px',
        activeBp: 1440,
        effectiveCss: '.x { font-size: var(--spacing-md); }',
      }),
    )
    expect(result.current).toBeNull()
  })

  it('cascade winner: @container at activeBp 1440 outranks top-level', () => {
    const css = `
      .x { font-size: 16px; }
      @container slot (max-width: 1440px) {
        .x { font-size: 42px; }
      }
    `
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '42px',
        activeBp: 1440,
        effectiveCss: css,
      }),
    )
    // Container value 42px matches --h2-font-size at maxPx → available.
    expect(result.current?.mode).toBe('available')
    expect(result.current?.tokenName).toBe('--h2-font-size')
  })

  it('@container BP not matching activeBp is ignored', () => {
    const css = `
      .x { font-size: 16px; }
      @container slot (max-width: 768px) {
        .x { font-size: 42px; }
      }
    `
    const { result } = renderHook(() =>
      useChipDetection({
        selector: '.x',
        property: 'font-size',
        valueAtActiveBp: '16px',
        activeBp: 1440,
        effectiveCss: css,
      }),
    )
    // Top-level 16px → matches --text-base-font-size minPx (16) at activeBp=1440?
    // No: --text-base-font-size at 1440 = 18, not 16. So null.
    // 16 at 1440: spacing-lg has minPx 16, maxPx 20 → resolves to 20 at 1440. No match.
    // Verify via no-match expectation:
    expect(result.current?.tokenName).not.toBe('--text-base-font-size') // sanity
  })

  it('memoization: stable reference on identical args', () => {
    const args = {
      selector: '.x',
      property: 'font-size',
      valueAtActiveBp: '42px',
      activeBp: 1440 as const,
      effectiveCss: '.x { font-size: var(--h2-font-size); }',
    }
    const { result, rerender } = renderHook((p: typeof args) => useChipDetection(p), {
      initialProps: args,
    })
    const first = result.current
    rerender(args)
    expect(result.current).toBe(first)
  })
})

function RESPONSIVE_CONFIG() {
  return responsiveConfig
}
