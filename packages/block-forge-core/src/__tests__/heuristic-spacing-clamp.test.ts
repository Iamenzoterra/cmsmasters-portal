import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicSpacingClamp } from '../rules/heuristic-spacing-clamp'

describe('heuristicSpacingClamp', () => {
  it('triggers on padding: 64px 40px (largest 64px)', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.card { padding: 64px 40px; }',
    })
    const suggestions = heuristicSpacingClamp(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'spacing-clamp',
      selector: '.card',
      bp: 640,
      property: 'padding',
      confidence: 'medium',
    })
    expect(suggestions[0].value).toContain('clamp(')
    expect(suggestions[0].value).toContain('64px')
  })

  it('triggers on gap: 48px', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.row { gap: 48px; }',
    })
    const suggestions = heuristicSpacingClamp(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      property: 'gap',
      bp: 640,
      confidence: 'medium',
    })
  })

  it('does NOT trigger on sub-threshold, var, viewport, or already-clamp values', () => {
    const cases = [
      '.a { padding: 32px; }',
      '.b { padding: var(--space-lg); }',
      '.c { padding: 2vw; }',
      '.d { padding: clamp(1rem, 2vw, 3rem); }',
    ]
    for (const css of cases) {
      const analysis = analyzeBlock({ html: '', css })
      expect(heuristicSpacingClamp(analysis)).toEqual([])
    }
  })

  it('already-adaptive skip: padding: 64px inside @media skips', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '@media (min-width: 640px) { .card { padding: 64px; } }',
    })
    expect(heuristicSpacingClamp(analysis)).toEqual([])
  })
})
