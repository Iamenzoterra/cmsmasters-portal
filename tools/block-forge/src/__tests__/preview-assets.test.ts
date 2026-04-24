// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

/**
 * WP-028 Phase 2a — DOM harness: extracts the injected `deriveSelector`
 * function from composeSrcDoc output and runs it directly against jsdom-built
 * elements. Closes the coverage gap that let the `/\s+/` template-literal escape
 * bug ship silently (commit 53c9ffd1, caught by live Playwright smoke).
 *
 * Strategy: pull only the pure helpers (stableClass + deriveSelector) out of
 * the IIFE and wrap in a Function that takes a target element. Avoids
 * document.body listener accumulation across tests, and keeps assertions
 * focused on the SELECTOR DERIVATION logic (which was the actual bug).
 */
describe('injected click-handler script — selector derivation via DOM harness', () => {
  // Build a deriveSelector from the exact emitted source. Regex targets the
  // two function bodies; the UTILITY_PREFIXES const is also pulled. This is
  // the SAME code the iframe runtime executes — fidelity matters for the
  // regression guard.
  function buildDeriveSelector(srcdoc: string): (el: Element) => string {
    const iife = srcdoc.match(/\/\/ WP-028 Phase 2 — element-click[\s\S]+?\}\)\(\);/)?.[0]
    if (!iife) throw new Error('could not locate click-handler IIFE')
    // Index-slice around known anchor points — avoids fragile brace-counting regex.
    const utilMatch = iife.match(/const UTILITY_PREFIXES = \[[^\]]+\];/)?.[0]
    const stableStart = iife.indexOf('function stableClass')
    const deriveStart = iife.indexOf('function deriveSelector')
    const listenerStart = iife.indexOf('document.body.addEventListener')
    if (!utilMatch || stableStart < 0 || deriveStart < 0 || listenerStart < 0) {
      throw new Error('could not locate helper function anchors in IIFE source')
    }
    const stableMatch = iife.slice(stableStart, deriveStart).trim()
    const deriveMatch = iife.slice(deriveStart, listenerStart).trim()
    // Pass CSS + document as explicit params — `new Function` doesn't inherit
    // globals the same way module imports do, and jsdom's CSS global may lack
    // `.escape`. Minimal polyfill matches WHATWG CSS.escape for our use
    // (escaping `-` runs, spaces → `\NN `, ident safe chars kept).
    const cssPolyfill = {
      escape: (s: string) =>
        String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c),
    }
    const body = `${utilMatch}\n${stableMatch}\n${deriveMatch}\nreturn deriveSelector(__target);`
    return (el: Element) => new Function('__target', 'CSS', 'document', body)(
      el,
      cssPolyfill,
      globalThis.document,
    ) as string
  }

  const SRCDOC = composeSrcDoc({ html: 'x', css: '', width: 768, slug: 'test-block' })
  const deriveSelector = buildDeriveSelector(SRCDOC)

  beforeEach(() => {
    document.body.innerHTML = '<div class="slot-inner"></div>'
  })

  it('derives stable class (not space-escape) for multi-class "heading reveal"', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML = '<section class="my-block"><h2 class="heading reveal">Hello</h2></section>'
    const h2 = root.querySelector('h2')!
    const sel = deriveSelector(h2)
    // Regression guard for commit 53c9ffd1: selector must NOT contain a
    // CSS.escape-encoded space (`\ `) — classes must split on whitespace.
    expect(sel).not.toContain('\\ ')
    expect(sel).toContain('h2.heading')
    expect(sel).toContain('section.my-block')
    expect(sel).toContain('div.slot-inner')
  })

  it('emits id selector when element has an id (Ruling H priority)', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML = '<section><p id="cta-lead">text</p></section>'
    expect(deriveSelector(root.querySelector('#cta-lead')!)).toBe('#cta-lead')
  })

  it('falls back to nth-of-type when no id and no stable class', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML = '<section><p>one</p><p>two</p><p>three</p></section>'
    const second = root.querySelectorAll('p')[1]
    expect(deriveSelector(second)).toContain('p:nth-of-type(2)')
  })

  it('ignores utility-prefixed classes (hover:, focus:, animate-, group-, peer-)', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML =
      '<section><button class="hover:text-red animate-pulse real-class">x</button></section>'
    const sel = deriveSelector(root.querySelector('button')!)
    expect(sel).toContain('button.real-class')
    // No escape of utility prefix — we skipped past them when picking a class.
    expect(sel).not.toContain('hover')
    expect(sel).not.toContain('animate-pulse')
  })

  it('handles id ancestors — stops walking and prepends #id', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML = '<section id="hero"><div class="wrap"><p>x</p></div></section>'
    const p = root.querySelector('p')!
    const sel = deriveSelector(p)
    expect(sel).toContain('#hero')
    // Walk stops at id — no ancestor-of-hero in the path.
    expect(sel.indexOf('#hero')).toBeLessThan(sel.indexOf('p'))
  })
})

/**
 * Source-level guards on the injected script — complements the DOM harness by
 * pinning the SHAPE of the script itself (tag filter, preventDefault, etc.)
 * without needing to execute the full event pipeline. Cheap + stable tests
 * that catch shape regressions (tag list pruning, stop-propagation removed, etc.).
 */
describe('injected click-handler — source contract', () => {
  const srcdoc = composeSrcDoc({ html: 'x', css: '', width: 768, slug: 'test' })
  const iife = srcdoc.match(/\/\/ WP-028 Phase 2 — element-click[\s\S]+?\}\)\(\);/)![0]

  it('installs a capture-phase listener on document.body', () => {
    expect(iife).toContain("document.body.addEventListener('click'")
    expect(iife).toContain('}, true);') // capture phase argument
  })

  it('filters by CLICKABLE_TAGS (semantic block elements only)', () => {
    expect(iife).toContain("'H2'")
    expect(iife).toContain("'P'")
    expect(iife).toContain("'BUTTON'")
    // Non-clickable fragments / inline-only tags should NOT be listed.
    expect(iife).not.toMatch(/'(CIRCLE|PATH|TEXT|META|SCRIPT)'/)
  })

  it('calls preventDefault + stopPropagation on matched clicks', () => {
    expect(iife).toContain('e.preventDefault()')
    expect(iife).toContain('e.stopPropagation()')
  })

  it('emits the postMessage type literal "block-forge:element-click"', () => {
    expect(iife).toContain("type: 'block-forge:element-click'")
  })

  it('passes selector, rect, and computedStyle fields in the payload', () => {
    expect(iife).toMatch(/selector:\s*deriveSelector/)
    expect(iife).toMatch(/rect:\s*\{\s*x:/)
    expect(iife).toMatch(/computedStyle:\s*\{\s*padding:/)
  })
})
