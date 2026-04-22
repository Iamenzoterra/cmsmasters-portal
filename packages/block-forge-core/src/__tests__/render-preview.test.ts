import { describe, it, expect } from 'vitest'
import { renderForPreview } from '../compose/render-preview'
import { scopeBlockCss, stripGlobalPageRules } from '../lib/css-scoping'
import type { BlockOutput, Variant } from '../lib/types'

const block: BlockOutput = {
  slug: 'demo',
  html: '<p>hello</p>',
  css: '.demo { color: red; }\nbody { margin: 0; }\n',
}

describe('renderForPreview', () => {
  it('non-variant block → HTML wrapped in data-block-shell div (portal parity)', () => {
    const out = renderForPreview(block)
    expect(out.html).toBe('<div data-block-shell="demo"><p>hello</p></div>')
  })

  it('CSS runs through stripGlobalPageRules — body rule dropped, .demo preserved', () => {
    const out = renderForPreview(block)
    expect(out.css).toContain('.demo { color: red; }')
    expect(out.css).not.toContain('body {')
  })

  it('width option → wraps output in sized container', () => {
    const out = renderForPreview(block, { width: 800 })
    expect(out.html).toContain('<div style="max-width: 800px; margin: 0 auto;">')
    expect(out.html).toContain('<div data-block-shell="demo"><p>hello</p></div>')
  })

  it('no width → no outer wrapper', () => {
    const out = renderForPreview(block)
    expect(out.html.startsWith('<div data-block-shell="demo">')).toBe(true)
  })

  it('variants in opts → composeVariants runs; output contains data-variant markers', () => {
    const sm: Variant = { name: 'sm', html: '<p>small</p>', css: '.demo { color: blue; }' }
    const out = renderForPreview(block, { variants: [sm] })
    expect(out.html).toContain('data-variant="base"')
    expect(out.html).toContain('data-variant="sm"')
    expect(out.css).toContain('@container slot (max-width: 480px)')
  })

  it('determinism — identical input yields identical output', () => {
    const a = renderForPreview(block, { width: 800 })
    const b = renderForPreview(block, { width: 800 })
    expect(a).toEqual(b)
  })
})

describe('scopeBlockCss (lib helper)', () => {
  it('prefixes top-level selectors with .block-{slug}', () => {
    const css = '.demo { color: red; } .other { color: blue; }'
    const out = scopeBlockCss(css, 'x')
    expect(out).toContain('.block-x .demo')
    expect(out).toContain('.block-x .other')
  })

  it('leaves selectors inside @container untouched at top level', () => {
    const css = '@container slot (max-width: 640px) { .demo { color: red; } }'
    const out = scopeBlockCss(css, 'x')
    expect(out).toContain('.demo { color: red')
    expect(out).not.toContain('.block-x .demo { color: red')
  })
})

describe('stripGlobalPageRules (lib helper)', () => {
  it('drops top-level html and body rules', () => {
    const css = 'body { margin: 0; } .demo { color: red; } html { font-size: 16px; }'
    const out = stripGlobalPageRules(css)
    expect(out).not.toContain('body {')
    expect(out).not.toContain('html {')
    expect(out).toContain('.demo')
  })
})
