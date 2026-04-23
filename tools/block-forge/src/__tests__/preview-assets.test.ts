// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { composeSrcDoc } from '../lib/preview-assets'

const MINIMAL = {
  html: '<section>hi</section>',
  css: '.x { color: red; }',
  width: 1440,
  slug: 'test-block',
}

describe('composeSrcDoc', () => {
  it('(a) declares @layer order exactly as tokens, reset, shared, block', () => {
    const out = composeSrcDoc(MINIMAL)
    // Literal declaration must appear before any `@layer <name> {` block.
    const declIdx = out.indexOf('@layer tokens, reset, shared, block;')
    expect(declIdx).toBeGreaterThan(-1)
    const firstBlockIdx = out.indexOf('@layer tokens {')
    expect(firstBlockIdx).toBeGreaterThan(declIdx)
  })

  it('(b) wraps body in two-level slot hierarchy: .slot-inner > [data-block-shell]', () => {
    const out = composeSrcDoc({ ...MINIMAL, slug: 'kebab-slug', html: '<p id="inside">x</p>' })
    const parser = new DOMParser()
    const doc = parser.parseFromString(out, 'text/html')
    const slotInner = doc.querySelector('body > div.slot-inner')
    expect(slotInner).not.toBeNull()
    const shell = slotInner?.querySelector(':scope > div[data-block-shell="kebab-slug"]')
    expect(shell).not.toBeNull()
    // And the block HTML is nested inside the shell.
    const inside = shell?.querySelector('#inside')
    expect(inside).not.toBeNull()
  })

  it('(c) reflects the slug verbatim in data-block-shell', () => {
    const out = composeSrcDoc({ ...MINIMAL, slug: 'kebab-slug' })
    expect(out).toContain('data-block-shell="kebab-slug"')
  })

  it('(d) reflects width in meta viewport AND body rule', () => {
    const out = composeSrcDoc({ ...MINIMAL, width: 768 })
    expect(out).toContain('<meta name="viewport" content="width=768" />')
    expect(out).toMatch(/body\s*\{[^}]*width:\s*768px/)
  })

  it('(e) injects BOTH tokens.css and tokens.responsive.css inside @layer tokens', () => {
    const out = composeSrcDoc(MINIMAL)
    // One signature token from each file.
    expect(out).toContain('--bg-page:') // tokens.css
    expect(out).toContain('--space-section:') // tokens.responsive.css (clamp-based)
    // Both must appear between `@layer tokens {` and the first closing brace followed by `@layer reset`.
    const tokensStart = out.indexOf('@layer tokens {')
    const resetStart = out.indexOf('@layer reset')
    expect(tokensStart).toBeGreaterThan(-1)
    expect(resetStart).toBeGreaterThan(tokensStart)
    const tokensSection = out.slice(tokensStart, resetStart)
    expect(tokensSection).toContain('--bg-page:')
    expect(tokensSection).toContain('--space-section:')
  })

  it('(f) emits .slot-inner containment rule inside @layer shared, after portal-blocks.css', () => {
    const out = composeSrcDoc(MINIMAL)
    const sharedStart = out.indexOf('@layer shared {')
    const blockStart = out.indexOf('@layer block {')
    expect(sharedStart).toBeGreaterThan(-1)
    expect(blockStart).toBeGreaterThan(sharedStart)
    const sharedSection = out.slice(sharedStart, blockStart)
    // Containment rule literal (whitespace-insensitive match for each token).
    expect(sharedSection).toMatch(/\.slot-inner\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*slot[^}]*\}/)
  })

  it('(g) omits js script block when js is absent; includes it when present', () => {
    const without = composeSrcDoc(MINIMAL)
    // animate-utils.js always injected via `<script type="module">`, so count occurrences.
    const withoutCount = without.match(/<script type="module">/g)?.length ?? 0
    const withJs = composeSrcDoc({ ...MINIMAL, js: 'console.log("block-js");' })
    const withCount = withJs.match(/<script type="module">/g)?.length ?? 0
    expect(withCount).toBe(withoutCount + 1)
    expect(withJs).toContain('console.log("block-js");')
  })

  it('(h) handles empty html and empty css without crashing', () => {
    expect(() => composeSrcDoc({ ...MINIMAL, html: '', css: '' })).not.toThrow()
    const out = composeSrcDoc({ ...MINIMAL, html: '', css: '' })
    expect(out).toContain('<div data-block-shell="test-block"></div>')
  })

  it('(i) pins the postMessage type literal "block-forge:iframe-height"', () => {
    // Rename-guard: any rename forces a matching test update.
    const out = composeSrcDoc(MINIMAL)
    expect(out).toContain("type: 'block-forge:iframe-height'")
  })
})
