// WP-033 Phase 3 §3.5 — Slider-bug regression pin.
//
// History: WP-028 Phase 2 introduced TweakPanel sliders; the slider-doesn't-
// apply bug emerged when @container slot queries swallowed font-size emits.
// Commit ac739477 (post-WP-030) fixed it via "bypass @container slot queries
// when fluid pinned". This test PINS the contract: emitTweak with bp ∈
// {375, 768, 1440} lands inside `@container slot (max-width: <bp>px)`; bp=0
// emits at top-level. If this regresses, vitest goes red BEFORE smoke breaks
// at runtime.

import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import { emitTweak } from '@cmsmasters/block-forge-core'

describe('Slider-bug regression — emitTweak({ bp }) preserves @container behavior', () => {
  it('emitTweak with bp=1440 lands inside @container slot (max-width: 1440px)', () => {
    const baseCss = `.gauge-score { font-size: 60px; }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 1440, property: 'font-size', value: '48px' },
      baseCss,
    )
    expect(out).toContain('@container slot (max-width: 1440px)')
    expect(out).toMatch(
      /@container slot \(max-width: 1440px\) \{[\s\S]*\.gauge-score \{[\s\S]*font-size: 48px/,
    )
  })

  it('emitTweak with bp=0 lands at top-level (no @container wrap)', () => {
    const baseCss = `.gauge-score { font-size: 60px; }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 0, property: 'font-size', value: 'var(--h2-font-size)' },
      baseCss,
    )
    expect(out).toContain('var(--h2-font-size)')

    // Verify the var() decl sits at top-level, not inside any @container.
    const root = postcss.parse(out)
    let foundTopLevel = false
    root.walkRules('.gauge-score', (rule) => {
      if (rule.parent && rule.parent.type === 'root') {
        rule.walkDecls('font-size', (decl) => {
          if (decl.value.includes('var(--h2-font-size)')) foundTopLevel = true
        })
      }
    })
    expect(foundTopLevel).toBe(true)
  })

  it('emitTweak update overwrites existing declaration without duplication', () => {
    const baseCss = `.gauge-score { font-size: 60px; }
@container slot (max-width: 1440px) { .gauge-score { font-size: 48px; } }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 1440, property: 'font-size', value: '40px' },
      baseCss,
    )
    expect(out).toContain('40px')
    expect(out).not.toContain('48px')
    // Top-level `60px` should NOT be touched (different cascade scope).
    expect(out).toContain('60px')
  })
})
