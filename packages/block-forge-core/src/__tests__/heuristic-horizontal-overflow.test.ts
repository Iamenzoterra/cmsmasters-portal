import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicHorizontalOverflow } from '../rules/heuristic-horizontal-overflow'

describe('heuristicHorizontalOverflow', () => {
  it('triggers on rule with white-space: nowrap and no overflow-x', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.pill { white-space: nowrap; }',
    })
    const suggestions = heuristicHorizontalOverflow(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'horizontal-overflow',
      selector: '.pill',
      bp: 480,
      property: 'overflow-x',
      value: 'auto',
      confidence: 'low',
    })
  })

  it('does NOT trigger when overflow-x already set', () => {
    const cases = [
      '.a { white-space: nowrap; overflow-x: auto; }',
      '.b { white-space: nowrap; overflow-x: scroll; }',
      '.c { white-space: nowrap; overflow-x: hidden; }',
    ]
    for (const css of cases) {
      const analysis = analyzeBlock({ html: '', css })
      expect(heuristicHorizontalOverflow(analysis)).toEqual([])
    }
  })

  it('does NOT trigger without white-space: nowrap', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.a { color: red; }',
    })
    expect(heuristicHorizontalOverflow(analysis)).toEqual([])
  })

  it('already-adaptive skip: same nowrap inside @media skips', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '@media (min-width: 640px) { .pill { white-space: nowrap; } }',
    })
    expect(heuristicHorizontalOverflow(analysis)).toEqual([])
  })
})
