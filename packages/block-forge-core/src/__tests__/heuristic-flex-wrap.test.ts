import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicFlexWrap } from '../rules/heuristic-flex-wrap'

describe('heuristicFlexWrap', () => {
  it('triggers on .hero flex-row with 4 children at top level', () => {
    const analysis = analyzeBlock({
      html: '<div class="hero"><span>1</span><span>2</span><span>3</span><span>4</span></div>',
      css: '.hero { display: flex; flex-direction: row; }',
    })
    const suggestions = heuristicFlexWrap(analysis)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'flex-wrap',
      selector: '.hero',
      bp: 640,
      property: 'flex-wrap',
      value: 'wrap',
      confidence: 'medium',
    })
    expect(suggestions[0].rationale).toContain('4 children')
  })

  it('nested-row NO-trigger contract — .nav inside <header> does NOT emit', () => {
    const analysis = analyzeBlock({
      html: '<header><nav class="nav"><a>1</a><a>2</a><a>3</a><a>4</a></nav></header>',
      css: '.nav { display: flex; flex-direction: row; }',
    })
    const navEl = analysis.elements.find(e => e.tag === 'nav')
    expect(navEl?.parentTag).toBe('header')
    expect(navEl?.childCount).toBe(4)
    expect(heuristicFlexWrap(analysis)).toEqual([])
  })

  it('does NOT trigger on flex-column, <3 children, or unmatched selector', () => {
    const colAnalysis = analyzeBlock({
      html: '<div class="col"><span>1</span><span>2</span><span>3</span></div>',
      css: '.col { display: flex; flex-direction: column; }',
    })
    expect(heuristicFlexWrap(colAnalysis)).toEqual([])

    const twoKidsAnalysis = analyzeBlock({
      html: '<div class="pair"><span>1</span><span>2</span></div>',
      css: '.pair { display: flex; flex-direction: row; }',
    })
    expect(heuristicFlexWrap(twoKidsAnalysis)).toEqual([])

    const noMatchAnalysis = analyzeBlock({
      html: '<div class="ghost"><span>1</span><span>2</span><span>3</span></div>',
      css: '.other { display: flex; flex-direction: row; }',
    })
    expect(heuristicFlexWrap(noMatchAnalysis)).toEqual([])
  })

  it('already-adaptive skip: same flex-row inside @container skips', () => {
    const analysis = analyzeBlock({
      html: '<div class="hero"><span>1</span><span>2</span><span>3</span><span>4</span></div>',
      css: '@container slot (max-width: 600px) { .hero { display: flex; flex-direction: row; } }',
    })
    expect(heuristicFlexWrap(analysis)).toEqual([])
  })
})
