import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { heuristicMediaMaxwidth } from '../rules/heuristic-media-maxwidth'

describe('heuristicMediaMaxwidth', () => {
  it('triggers when <img> has no CSS cap — emits max-width + height pair', () => {
    const analysis = analyzeBlock({
      html: '<div><img src="x.png" /></div>',
      css: '',
    })
    const suggestions = heuristicMediaMaxwidth(analysis)
    expect(suggestions).toHaveLength(2)
    expect(suggestions[0]).toMatchObject({
      heuristic: 'media-maxwidth',
      selector: 'img',
      bp: 0,
      property: 'max-width',
      value: '100%',
      confidence: 'high',
    })
    expect(suggestions[1]).toMatchObject({
      heuristic: 'media-maxwidth',
      selector: 'img',
      bp: 0,
      property: 'height',
      value: 'auto',
      confidence: 'high',
    })
  })

  it('does NOT trigger when img { max-width: 100% } already defined', () => {
    const analysis = analyzeBlock({
      html: '<div><img src="x.png" /></div>',
      css: 'img { max-width: 100%; }',
    })
    expect(heuristicMediaMaxwidth(analysis)).toEqual([])
  })

  it('dedupes: three <img> tags + no cap → still 2 suggestions, not 6', () => {
    const analysis = analyzeBlock({
      html: '<div><img src="a.png" /><img src="b.png" /><img src="c.png" /></div>',
      css: '',
    })
    expect(heuristicMediaMaxwidth(analysis)).toHaveLength(2)
  })

  it('no-element case: HTML without media → empty', () => {
    const analysis = analyzeBlock({
      html: '<div><p>text only</p></div>',
      css: '',
    })
    expect(heuristicMediaMaxwidth(analysis)).toEqual([])
  })
})
