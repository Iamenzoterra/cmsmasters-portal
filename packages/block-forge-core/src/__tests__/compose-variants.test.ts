import { describe, it, expect } from 'vitest'
import { composeVariants, variantCondition } from '../compose/compose-variants'
import type { BlockInput, Variant } from '../lib/types'

const base: BlockInput = {
  slug: 'demo',
  html: '<p>base</p>',
  css: '.demo { color: red; }\n',
}

describe('composeVariants', () => {
  it('empty variants → output matches input shape, no variants field', () => {
    const out = composeVariants(base, [])
    expect(out.slug).toBe('demo')
    expect(out.html).toBe(base.html)
    expect(out.css).toBe(base.css)
    expect(out.variants).toBeUndefined()
  })

  it('single variant "sm" → reveal rule maps to (max-width: 480px)', () => {
    const sm: Variant = { name: 'sm', html: '<p>small</p>', css: '.demo { color: blue; }' }
    const out = composeVariants(base, [sm])
    expect(out.css).toContain('@container slot (max-width: 480px)')
    expect(out.css).toContain('[data-variant="base"] { display: none; }')
    expect(out.css).toContain('[data-variant="sm"] { display: block; }')
  })

  it('variant CSS is scoped under [data-variant="{name}"] prefix', () => {
    const md: Variant = { name: 'md', html: '<p>medium</p>', css: '.demo { color: blue; }' }
    const out = composeVariants(base, [md])
    expect(out.css).toContain('[data-variant="md"] .demo')
    expect(out.css).toContain('color: blue')
  })

  it('HTML: base wrapped + each variant wrapped in declared order', () => {
    const sm: Variant = { name: 'sm', html: '<p>sm</p>', css: '' }
    const md: Variant = { name: 'md', html: '<p>md</p>', css: '' }
    const out = composeVariants(base, [sm, md])
    expect(out.html).toBe(
      `<div data-variant="base"><p>base</p></div>` +
        `<div data-variant="sm" hidden><p>sm</p></div>` +
        `<div data-variant="md" hidden><p>md</p></div>`,
    )
  })

  it('unknown variant name → onWarning invoked + reveal rule skipped', () => {
    const bad: Variant = { name: 'bogus', html: '<p>x</p>', css: '.demo { color: green; }' }
    const warnings: string[] = []
    const out = composeVariants(base, [bad], msg => warnings.push(msg))

    expect(warnings.length).toBe(1)
    expect(warnings[0]).toContain('bogus')
    expect(out.css).toContain('[data-variant="bogus"]')
    expect(out.css).not.toContain('[data-variant="bogus"] { display: block; }')
  })

  it('variants record matches BlockVariants shape for DB compatibility', () => {
    const sm: Variant = { name: 'sm', html: '<p>sm</p>', css: '.demo { color: blue; }' }
    const out = composeVariants(base, [sm])
    expect(out.variants).toBeDefined()
    expect(out.variants!.sm).toEqual({ html: '<p>sm</p>', css: '.demo { color: blue; }' })
  })
})

describe('variantCondition', () => {
  it('maps conventional names to correct breakpoints', () => {
    expect(variantCondition('sm')).toBe('(max-width: 480px)')
    expect(variantCondition('md')).toBe('(max-width: 640px)')
    expect(variantCondition('lg')).toBe('(max-width: 768px)')
    expect(variantCondition('480')).toBe('(max-width: 480px)')
    expect(variantCondition('640')).toBe('(max-width: 640px)')
    expect(variantCondition('768')).toBe('(max-width: 768px)')
  })

  it('returns null for unknown names', () => {
    expect(variantCondition('bogus')).toBeNull()
    expect(variantCondition('xl')).toBeNull()
    expect(variantCondition('1024')).toBeNull()
  })
})
