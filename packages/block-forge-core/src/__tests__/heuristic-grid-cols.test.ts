import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicGridCols } from '../rules/heuristic-grid-cols'

describe('heuristicGridCols', () => {
  it('triggers on repeat(3, 1fr) — emits 2 suggestions (bp 768 + 480)', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.grid { display: grid; grid-template-columns: repeat(3, 1fr); }',
    })
    const suggestions = heuristicGridCols(analysis)
    expect(suggestions).toHaveLength(2)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'grid-cols',
      selector: '.grid',
      bp: 768,
      property: 'grid-template-columns',
      value: 'repeat(2, 1fr)',
      confidence: 'high',
    })
    expect(suggestions[0].rationale).toContain('3 columns')
    expect(suggestions[1]).toMatchObject({
      heuristic: 'grid-cols',
      selector: '.grid',
      bp: 480,
      property: 'grid-template-columns',
      value: '1fr',
      confidence: 'high',
    })
    expect(suggestions[0].id).toMatch(/^grid-cols-[0-9a-f]{8}$/)
  })

  it('triggers on repeat(2, 1fr) — emits 1 suggestion (bp 480 only)', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '.two { display: grid; grid-template-columns: repeat(2, 1fr); }',
    })
    const suggestions = heuristicGridCols(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      bp: 480,
      value: '1fr',
    })
  })

  it('does NOT trigger on repeat(1, ...), explicit tracks without repeat, or display: grid without columns', () => {
    const cases = [
      '.a { display: grid; grid-template-columns: repeat(1, 1fr); }',
      '.b { display: grid; grid-template-columns: 1fr 1fr 1fr; }',
      '.c { display: grid; }',
    ]
    for (const css of cases) {
      const analysis = analyzeBlock({ html: '', css })
      expect(heuristicGridCols(analysis)).toEqual([])
    }
  })

  it('already-adaptive skip: same repeat(3, 1fr) inside @container skips', () => {
    const analysis = analyzeBlock({
      html: '',
      css: '@container slot (max-width: 600px) { .grid { display: grid; grid-template-columns: repeat(3, 1fr); } }',
    })
    expect(heuristicGridCols(analysis)).toEqual([])
  })
})
