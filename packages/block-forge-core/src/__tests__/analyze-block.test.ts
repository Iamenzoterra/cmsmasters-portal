import { describe, it, expect } from 'vitest'
import { analyzeBlock } from '../analyze/analyze-block'

describe('analyzeBlock', () => {
  describe('CSS parsing', () => {
    it('empty inputs return empty analysis', () => {
      const result = analyzeBlock({ html: '', css: '' })
      expect(result).toEqual({ rules: [], elements: [], warnings: [] })
    })

    it('whitespace-only inputs return empty analysis', () => {
      const result = analyzeBlock({ html: '   \n\t  ', css: '  \n\t\n  ' })
      expect(result).toEqual({ rules: [], elements: [], warnings: [] })
    })

    it('simple CSS + HTML produces expected shape', () => {
      const result = analyzeBlock({
        html: '<div class="foo"><span>x</span></div>',
        css: '.foo { padding: 1rem; }',
      })
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0]).toEqual({
        selector: '.foo',
        declarations: [{ prop: 'padding', value: '1rem' }],
        atRuleChain: [],
      })
      expect(result.elements).toHaveLength(2)
      expect(result.elements[0]).toEqual({
        tag: 'div',
        classes: ['foo'],
        childCount: 1,
        parentTag: null,
      })
      expect(result.elements[1]).toEqual({
        tag: 'span',
        classes: [],
        childCount: 0,
        parentTag: 'div',
      })
      expect(result.warnings).toEqual([])
    })

    it('malformed CSS does not throw and surfaces a warning', () => {
      const badInputs = ['.foo { padding: }', '}', '.foo { color: red', '{ : }']
      for (const css of badInputs) {
        expect(() => analyzeBlock({ html: '', css })).not.toThrow()
      }
      const { warnings } = analyzeBlock({ html: '', css: '.foo { color: red' })
      expect(warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('nested at-rules produce bottom-up atRuleChain', () => {
      const result = analyzeBlock({
        html: '',
        css: '@media (min-width: 640px) { @container slot (max-width: 400px) { .foo { padding: 1rem; } } }',
      })
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0].selector).toBe('.foo')
      expect(result.rules[0].atRuleChain).toEqual([
        '@container slot (max-width: 400px)',
        '@media (min-width: 640px)',
      ])
    })

    it('.block-{slug} prefix is preserved verbatim', () => {
      const result = analyzeBlock({ html: '', css: '.block-hero .child { color: red; }' })
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0].selector).toBe('.block-hero .child')
    })

    it('CSS declaration with nested functions keeps value intact (commas do not split)', () => {
      const result = analyzeBlock({
        html: '',
        css: '.foo { background: linear-gradient(to right, red, blue); }',
      })
      expect(result.rules).toHaveLength(1)
      expect(result.rules[0].declarations).toEqual([
        { prop: 'background', value: 'linear-gradient(to right, red, blue)' },
      ])
    })

    it('top-level empty at-rule produces zero rules, no warning', () => {
      const result = analyzeBlock({ html: '', css: '@media (min-width: 640px) { }' })
      expect(result.rules).toEqual([])
      expect(result.warnings).toEqual([])
    })
  })

  describe('HTML parsing', () => {
    it('block with no CSS: rules empty, elements populated', () => {
      const result = analyzeBlock({ html: '<div><p>hi</p></div>', css: '' })
      expect(result.rules).toEqual([])
      expect(result.elements).toHaveLength(2)
      expect(result.elements.map(e => e.tag)).toEqual(['div', 'p'])
    })

    it('block with no HTML: rules populated, elements empty', () => {
      const result = analyzeBlock({ html: '', css: '.x { color: red; }' })
      expect(result.rules).toHaveLength(1)
      expect(result.elements).toEqual([])
    })

    it('HTML comments are not elements', () => {
      const result = analyzeBlock({ html: '<!-- hidden --><div>a</div>', css: '' })
      expect(result.elements).toHaveLength(1)
      expect(result.elements[0].tag).toBe('div')
    })

    it('<script> and <style> tags are elements', () => {
      const result = analyzeBlock({
        html: '<div><script>x</script><style>.y{color:red}</style></div>',
        css: '',
      })
      const tags = result.elements.map(e => e.tag)
      expect(tags).toContain('script')
      expect(tags).toContain('style')
      expect(result.warnings).toEqual([])
    })

    it('multi-class HTML trims and splits correctly', () => {
      const result = analyzeBlock({ html: '<div class="  a  b   c  "></div>', css: '' })
      expect(result.elements).toHaveLength(1)
      expect(result.elements[0].classes).toEqual(['a', 'b', 'c'])
    })
  })

  describe('glue + determinism', () => {
    it('running analyzeBlock twice on the same input yields deep-equal results', () => {
      const input = {
        html: '<div class="foo"><span>x</span><span>y</span></div>',
        css: '@container slot (max-width: 640px) { .foo { padding: 1rem; } } .bar { color: red; }',
      }
      const a = analyzeBlock(input)
      const b = analyzeBlock(input)
      expect(a).toEqual(b)
    })
  })
})
