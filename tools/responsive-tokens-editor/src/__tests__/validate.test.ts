import { describe, it, expect } from 'vitest'
import { validate } from '../lib/validate'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
import type { ResponsiveConfig } from '../types'

describe('validate — WCAG 1.4.4 via utopia-core checkWCAG', () => {
  it('zero violations on V1 conservative defaults', () => {
    const result = generateTokensCss(conservativeDefaults)
    const violations = validate(conservativeDefaults, result.tokens)
    expect(violations).toEqual([])
  })

  it('flags aggressive override (ratio > 2.5×)', () => {
    const aggressive: ResponsiveConfig = {
      ...conservativeDefaults,
      overrides: {
        ...conservativeDefaults.overrides,
        '--h1-font-size': { minPx: 16, maxPx: 60, reason: 'test — ratio 3.75 exceeds cap' },
      },
    }
    const result = generateTokensCss(aggressive)
    expect(result.wcagViolations.length).toBeGreaterThan(0)
    expect(result.wcagViolations.some((v) => v.token === '--h1-font-size')).toBe(true)
  })

  it('borderline ratio = 2.5× passes', () => {
    const borderline: ResponsiveConfig = {
      ...conservativeDefaults,
      overrides: {
        ...conservativeDefaults.overrides,
        '--h1-font-size': { minPx: 20, maxPx: 50, reason: 'test — exact 2.5× borderline' },
      },
    }
    const result = generateTokensCss(borderline)
    const h1Violation = result.wcagViolations.find((v) => v.token === '--h1-font-size')
    expect(h1Violation, 'borderline 2.5× must pass').toBeUndefined()
  })
})
