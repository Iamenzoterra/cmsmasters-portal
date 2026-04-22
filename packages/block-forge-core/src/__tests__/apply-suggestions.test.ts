import { describe, it, expect } from 'vitest'
import { applySuggestions } from '../compose/apply-suggestions'
import type { BlockInput, Suggestion } from '../lib/types'

const baseBlock: BlockInput = {
  slug: 'demo',
  html: '<div class="demo">hi</div>',
  css: '.demo { padding: 64px; font-size: 60px; }\n',
}

function sugg(partial: Partial<Suggestion> & Pick<Suggestion, 'heuristic' | 'selector' | 'bp' | 'property' | 'value'>): Suggestion {
  return {
    id: `${partial.heuristic}-test`,
    rationale: 'test',
    confidence: 'medium',
    ...partial,
  } as Suggestion
}

describe('applySuggestions', () => {
  it('empty accepted → identity: html and css are byte-identical', () => {
    const out = applySuggestions(baseBlock, [])
    expect(out.css).toBe(baseBlock.css)
    expect(out.html).toBe(baseBlock.html)
    expect(out.slug).toBe(baseBlock.slug)
    expect(out.variants).toBeUndefined()
  })

  it('single suggestion → emits @container chunk appended to css', () => {
    const out = applySuggestions(baseBlock, [
      sugg({
        heuristic: 'spacing-clamp',
        selector: '.demo',
        bp: 640,
        property: 'padding',
        value: 'clamp(32px, 3.33vw, 64px)',
      }),
    ])
    expect(out.css).toContain('@container slot (max-width: 640px)')
    expect(out.css).toContain('.demo {')
    expect(out.css).toContain('padding: clamp(32px, 3.33vw, 64px)')
    expect(out.css.startsWith(baseBlock.css)).toBe(true)
  })

  it('multiple suggestions at different bps → chunks appear in ascending bp order', () => {
    const out = applySuggestions(baseBlock, [
      sugg({ heuristic: 'grid-cols', selector: '.grid', bp: 768, property: 'grid-template-columns', value: 'repeat(2, 1fr)' }),
      sugg({ heuristic: 'spacing-clamp', selector: '.demo', bp: 640, property: 'padding', value: 'clamp(32px, 3.33vw, 64px)' }),
      sugg({ heuristic: 'horizontal-overflow', selector: '.pill', bp: 480, property: 'overflow-x', value: 'auto' }),
    ])
    const idx480 = out.css.indexOf('(max-width: 480px)')
    const idx640 = out.css.indexOf('(max-width: 640px)')
    const idx768 = out.css.indexOf('(max-width: 768px)')
    expect(idx480).toBeGreaterThan(-1)
    expect(idx640).toBeGreaterThan(idx480)
    expect(idx768).toBeGreaterThan(idx640)
  })

  it('bp: 0 media-maxwidth → top-level rule, not wrapped in @container', () => {
    const out = applySuggestions(baseBlock, [
      sugg({ heuristic: 'media-maxwidth', selector: 'img', bp: 0, property: 'max-width', value: '100%', confidence: 'high' }),
      sugg({ heuristic: 'media-maxwidth', selector: 'img', bp: 0, property: 'height', value: 'auto', confidence: 'high' }),
    ])
    expect(out.css).toContain('img {')
    expect(out.css).toContain('max-width: 100%')
    expect(out.css).toContain('height: auto')
    const imgIdx = out.css.indexOf('img {')
    const containerIdx = out.css.indexOf('@container')
    expect(containerIdx === -1 || containerIdx > imgIdx).toBe(true)
  })

  it('determinism — same (block, accepted) twice yields byte-identical css', () => {
    const list = [
      sugg({ heuristic: 'spacing-clamp', selector: '.demo', bp: 640, property: 'padding', value: 'clamp(32px, 3.33vw, 64px)' }),
      sugg({ heuristic: 'font-clamp', selector: '.demo', bp: 640, property: 'font-size', value: 'clamp(32px, 3.12vw, 60px)' }),
    ]
    const a = applySuggestions(baseBlock, list)
    const b = applySuggestions(baseBlock, list)
    expect(a.css).toBe(b.css)
    expect(a.html).toBe(b.html)
  })

  it('does not mutate input css', () => {
    const originalCss = baseBlock.css
    applySuggestions(baseBlock, [
      sugg({ heuristic: 'spacing-clamp', selector: '.demo', bp: 640, property: 'padding', value: 'clamp(32px, 3.33vw, 64px)' }),
    ])
    expect(baseBlock.css).toBe(originalCss)
  })
})
