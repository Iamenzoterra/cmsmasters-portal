import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'
import { generateSuggestions } from '../rules'

const ALL_SIX_INPUT = {
  html: `
    <div class="hero"><span>a</span><span>b</span><span>c</span><span>d</span></div>
    <div class="grid"><span>1</span><span>2</span></div>
    <img src="x.png" />
  `,
  css: `
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); padding: 64px; }
    .title { font-size: 60px; }
    .hero { display: flex; flex-direction: row; }
    .pill { white-space: nowrap; }
  `,
}

describe('generateSuggestions (dispatcher)', () => {
  it('returns heuristics in fixed order: grid-cols → spacing-clamp → font-clamp → flex-wrap → horizontal-overflow → media-maxwidth', () => {
    const analysis = analyzeBlock(ALL_SIX_INPUT)
    const suggestions = generateSuggestions(analysis)
    const heuristicOrder = suggestions.map(s => s.heuristic)

    const firstIdx = (h: string) => heuristicOrder.indexOf(h as (typeof heuristicOrder)[number])
    expect(firstIdx('grid-cols')).toBeGreaterThanOrEqual(0)
    expect(firstIdx('spacing-clamp')).toBeGreaterThan(firstIdx('grid-cols'))
    expect(firstIdx('font-clamp')).toBeGreaterThan(firstIdx('spacing-clamp'))
    expect(firstIdx('flex-wrap')).toBeGreaterThan(firstIdx('font-clamp'))
    expect(firstIdx('horizontal-overflow')).toBeGreaterThan(firstIdx('flex-wrap'))
    expect(firstIdx('media-maxwidth')).toBeGreaterThan(firstIdx('horizontal-overflow'))

    const uniqueHeuristics = new Set(heuristicOrder)
    expect(uniqueHeuristics.size).toBe(6)
  })

  it('all returned IDs are unique across heuristics', () => {
    const analysis = analyzeBlock(ALL_SIX_INPUT)
    const suggestions = generateSuggestions(analysis)
    const ids = suggestions.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('empty analysis → empty array', () => {
    const analysis = analyzeBlock({ html: '', css: '' })
    expect(generateSuggestions(analysis)).toEqual([])
  })

  it('determinism: same input yields deep-equal suggestions across repeat calls', () => {
    const analysis = analyzeBlock(ALL_SIX_INPUT)
    const a = generateSuggestions(analysis)
    const b = generateSuggestions(analysis)
    expect(a).toEqual(b)
    expect(a.map(s => s.id)).toEqual(b.map(s => s.id))
  })
})
