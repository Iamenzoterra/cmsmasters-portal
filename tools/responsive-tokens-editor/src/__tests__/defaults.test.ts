import { describe, it, expect } from 'vitest'
import { conservativeDefaults } from '../lib/defaults'

describe('conservativeDefaults — V1 ruling-locked values', () => {
  it('viewport range is 375-1440 px', () => {
    expect(conservativeDefaults.minViewport).toBe(375)
    expect(conservativeDefaults.maxViewport).toBe(1440)
  })

  it('type base 16/18 px; ratio 1.2/1.25 (Minor Third → Major Third)', () => {
    expect(conservativeDefaults.type.baseAtMin).toBe(16)
    expect(conservativeDefaults.type.baseAtMax).toBe(18)
    expect(conservativeDefaults.type.ratioAtMin).toBeCloseTo(1.2)
    expect(conservativeDefaults.type.ratioAtMax).toBeCloseTo(1.25)
  })

  it('spacing base 16/20 px', () => {
    expect(conservativeDefaults.spacing.baseAtMin).toBe(16)
    expect(conservativeDefaults.spacing.baseAtMax).toBe(20)
  })

  it('exactly 22 override entries (10 typography + 11 spacing + 1 special)', () => {
    expect(Object.keys(conservativeDefaults.overrides)).toHaveLength(22)
  })

  it('--text-display ruling 1.a: 28-64 (preserves WP-024 hero scaffold)', () => {
    const o = conservativeDefaults.overrides['--text-display']
    expect(o).toBeDefined()
    expect(o.minPx).toBe(28)
    expect(o.maxPx).toBe(64)
  })

  it('--space-section ruling 1.b: 52-96 (tightened from 24-96 to satisfy WCAG)', () => {
    const o = conservativeDefaults.overrides['--space-section']
    expect(o).toBeDefined()
    expect(o.minPx).toBe(52)
    expect(o.maxPx).toBe(96)
    expect(o.maxPx / o.minPx).toBeLessThanOrEqual(2.5)
  })

  it('every typography override maxPx = tokens.css static (preserve desktop)', () => {
    // Cross-references Phase 0 §0.6 + Phase 2 pre-flight grep
    const expected: Record<string, number> = {
      '--h1-font-size': 54, '--h2-font-size': 42, '--h3-font-size': 32, '--h4-font-size': 26,
      '--text-lg-font-size': 20, '--text-base-font-size': 18,
      '--text-sm-font-size': 15, '--text-xs-font-size': 13, '--caption-font-size': 14,
    }
    for (const [token, staticPx] of Object.entries(expected)) {
      expect(conservativeDefaults.overrides[token].maxPx).toBe(staticPx)
    }
  })

  it('every override has WCAG ratio max/min ≤ 2.5×', () => {
    for (const [name, override] of Object.entries(conservativeDefaults.overrides)) {
      const ratio = override.maxPx / override.minPx
      expect(ratio, `${name} ratio ${ratio} exceeds WCAG 2.5×`).toBeLessThanOrEqual(2.5)
    }
  })

  it('mobile reduction percentage ≤ 20% on every override (ruling 1.c borderline cap)', () => {
    for (const [name, o] of Object.entries(conservativeDefaults.overrides)) {
      // Skip --text-display + --space-section — these are intentionally aggressive
      // (greenfield tokens with no current static to preserve)
      if (name === '--text-display' || name === '--space-section') continue
      const reduction = (o.maxPx - o.minPx) / o.maxPx
      expect(reduction, `${name} reduction ${(reduction * 100).toFixed(1)}% exceeds 20% cap`).toBeLessThanOrEqual(0.2 + 0.001)
    }
  })

  it('spacing 6xl..10xl excluded per Phase 0 escalation (a)', () => {
    expect(conservativeDefaults.overrides['--spacing-6xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-7xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-8xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-9xl']).toBeUndefined()
    expect(conservativeDefaults.overrides['--spacing-10xl']).toBeUndefined()
  })

  // Phase 5 — container schema seed (WP §2.2)
  it('seeds container widths per WP §2.2 (mobile 100%/16, tablet 720/24, desktop 1280/32)', () => {
    expect(conservativeDefaults.containers.mobile).toEqual({ maxWidth: '100%', px: 16 })
    expect(conservativeDefaults.containers.tablet).toEqual({ maxWidth: 720, px: 24 })
    expect(conservativeDefaults.containers.desktop).toEqual({ maxWidth: 1280, px: 32 })
  })
})
