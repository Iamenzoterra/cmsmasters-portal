import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicFontClamp } from '../rules/heuristic-font-clamp'

describe('heuristicFontClamp', () => {
  it('triggers on font-size: 60px', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.h1 { font-size: 60px; }',
    })
    const suggestions = heuristicFontClamp(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'font-clamp',
      selector: '.h1',
      bp: 640,
      property: 'font-size',
      confidence: 'high',
    })
    expect(suggestions[0].value).toContain('clamp(')
    expect(suggestions[0].value).toContain('60px')
  })

  it('triggers on font-size: 2rem', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.h2 { font-size: 2rem; }',
    })
    const suggestions = heuristicFontClamp(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      property: 'font-size',
      confidence: 'high',
    })
  })

  it('does NOT trigger on small sizes or dynamic values', () => {
    const cases = [
      '.a { font-size: 16px; }',
      '.b { font-size: 1rem; }',
      '.c { font-size: var(--h1); }',
    ]
    for (const css of cases) {
      const analysis = analyzeBlock({ html: '', css })
      expect(heuristicFontClamp(analysis)).toEqual([])
    }
  })

  it('already-adaptive skip: font-size: 60px inside @container skips', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '@container slot (max-width: 400px) { .h1 { font-size: 60px; } }',
    })
    expect(heuristicFontClamp(analysis)).toEqual([])
  })
})
