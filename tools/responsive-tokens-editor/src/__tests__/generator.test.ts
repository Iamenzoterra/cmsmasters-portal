import { describe, it, expect } from 'vitest'
import { generateTokensCss } from '../lib/generator'
import { conservativeDefaults } from '../lib/defaults'

describe('generator — V1 conservative defaults', () => {
  const result = generateTokensCss(conservativeDefaults)

  it('emits exactly 22 tokens (10 typography + 11 spacing + 1 special)', () => {
    expect(result.tokens).toHaveLength(22)
  })

  it('every token clampCss uses vi units (RTL-safe per WP §Output format)', () => {
    // utopia-core emits format: clamp(min_rem, intercept_rem + slope_unit, max_rem)
    // The unit (vi/vw) is followed by comma, never closing paren — verify accordingly.
    for (const t of result.tokens) {
      expect(t.clampCss).toMatch(/vi,/)
      expect(t.clampCss).not.toMatch(/vw,/)
    }
  })

  it('every token clampCss is a clamp() expression', () => {
    for (const t of result.tokens) {
      expect(t.clampCss).toMatch(/^clamp\(/)
    }
  })

  it('zero WCAG violations on V1 defaults', () => {
    expect(result.wcagViolations).toEqual([])
  })

  it('matches locked snapshot — Brain ruling 1 conservative-defaults table baseline', () => {
    // Snapshot ground truth per saved memory feedback_snapshot_ground_truth.
    // Future changes to defaults.ts → review this snapshot diff explicitly.
    expect(result.css).toMatchSnapshot()
  })

  it('header includes WP-030 reference + AUTO-GENERATED warning', () => {
    expect(result.css).toContain('AUTO-GENERATED')
    expect(result.css).toContain('WP-030')
    expect(result.css).toContain('do not edit manually')
  })

  it('preserves desktop static for every existing token (maxPx = current static)', () => {
    const tokenStaticMap = new Map<string, number>([
      ['--h1-font-size', 54],
      ['--h2-font-size', 42],
      ['--h3-font-size', 32],
      ['--h4-font-size', 26],
      ['--text-lg-font-size', 20],
      ['--text-base-font-size', 18],
      ['--text-sm-font-size', 15],
      ['--text-xs-font-size', 13],
      ['--caption-font-size', 14],
      ['--spacing-3xs', 2], ['--spacing-2xs', 4], ['--spacing-xs', 8],
      ['--spacing-sm', 12], ['--spacing-md', 16], ['--spacing-lg', 20],
      ['--spacing-xl', 24], ['--spacing-2xl', 32], ['--spacing-3xl', 40],
      ['--spacing-4xl', 48], ['--spacing-5xl', 64],
    ])
    for (const [name, expectedStatic] of tokenStaticMap) {
      const t = result.tokens.find((tok) => tok.name === name)
      expect(t, `token ${name} missing from output`).toBeDefined()
      expect(t!.maxPx, `token ${name} maxPx must equal desktop static`).toBe(expectedStatic)
    }
  })
})
