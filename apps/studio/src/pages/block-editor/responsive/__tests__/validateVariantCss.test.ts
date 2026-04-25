import { describe, it, expect } from 'vitest'
import { validateVariantCss } from '../validateVariantCss'

const VARIANT = 'fast'

describe('validateVariantCss', () => {
  it('1. empty string returns no warnings', () => {
    expect(validateVariantCss('', VARIANT)).toEqual([])
  })

  it('2. whitespace-only returns no warnings', () => {
    expect(validateVariantCss('   \n\t  ', VARIANT)).toEqual([])
  })

  it('3. properly scoped rule returns no warnings', () => {
    const css = '[data-variant="fast"] .foo { background: red }'
    expect(validateVariantCss(css, VARIANT)).toEqual([])
  })

  it('4. unscoped rule yields one unscoped-outside-reveal warning at line 1', () => {
    const css = '.foo { background: red }'
    const result = validateVariantCss(css, VARIANT)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      reason: 'unscoped-outside-reveal',
      selector: '.foo',
      line: 1,
    })
  })

  it('5. reveal-wrapped (named @container slot) returns no warnings', () => {
    const css = '@container slot (max-width: 480px) { .foo { color: red } }'
    expect(validateVariantCss(css, VARIANT)).toEqual([])
  })

  it('6. reveal-wrapped (unnamed @container) returns no warnings', () => {
    const css = '@container (max-width: 480px) { .foo { color: red } }'
    expect(validateVariantCss(css, VARIANT)).toEqual([])
  })

  it('7. mixed scoped + unscoped + reveal yields exactly one warning on the unscoped rule', () => {
    const css = [
      '[data-variant="fast"] .a { color: red }',
      '.b { color: blue }',
      '@container slot (max-width: 480px) { .c { color: green } }',
    ].join('\n')
    const result = validateVariantCss(css, VARIANT)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      reason: 'unscoped-outside-reveal',
      selector: '.b',
    })
  })

  it('8. variant-name mismatch — CSS scoped to different variant warns', () => {
    const css = '[data-variant="other"] .foo { color: red }'
    const result = validateVariantCss(css, VARIANT)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      reason: 'unscoped-outside-reveal',
      selector: '[data-variant="other"] .foo',
    })
  })

  it('9. malformed CSS yields a single parse-error warning', () => {
    const css = '.foo { color: red'
    const result = validateVariantCss(css, VARIANT)
    expect(result).toHaveLength(1)
    expect(result[0].reason).toBe('parse-error')
    if (result[0].reason === 'parse-error') {
      expect(result[0].detail.length).toBeGreaterThan(0)
    }
  })

  it('10. @media ancestor with nested @container returns no warnings (ancestor walk crosses @media)', () => {
    const css = '@media print { @container (max-width: 480px) { .foo { color: red } } }'
    expect(validateVariantCss(css, VARIANT)).toEqual([])
  })

  it('11. @media ancestor without @container yields one warning', () => {
    const css = '@media print { .foo { color: red } }'
    const result = validateVariantCss(css, VARIANT)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      reason: 'unscoped-outside-reveal',
      selector: '.foo',
    })
  })

  it('12. multi-selector rule with OR semantics — one scoped selector unblocks the whole rule', () => {
    // CSS rule = union of selectors. One scoped selector means the rule is
    // not "leaked variant CSS" even though `.unscoped` reads as such alone.
    const css = '.unscoped, [data-variant="fast"] .scoped { color: red }'
    expect(validateVariantCss(css, VARIANT)).toEqual([])
  })
})
