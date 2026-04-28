// @vitest-environment jsdom
//
// WP-027 Phase 2 — preview-assets contract tests.
//
// Mirrors tools/block-forge/src/__tests__/preview-assets.test.ts cases (a)–(i)
// with one Studio-specific divergence (case studio-1) that pins the
// single-wrap body contract from PARITY §7.
//
// MINIMAL fixture uses a pre-wrapped html input (with `<div data-block-shell>`)
// because Studio's composeSrcDoc trusts the caller to pre-wrap via
// renderForPreview — this simulates upstream engine output.
//
// `css: true` in apps/studio/vite.config.ts is MANDATORY — without it the `?raw`
// CSS imports load as empty strings and the token-substring assertions would
// silently pass against `''`. Saved memory: feedback_vitest_css_raw.md.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderForPreview } from '@cmsmasters/block-forge-core'
import { composeSrcDoc } from '../preview-assets'

const MINIMAL = {
  // Pre-wrapped html input — simulates renderForPreview upstream output
  // (Studio PARITY §7 deviation vs. block-forge which uses raw html here).
  html: '<div data-block-shell="test-block"><section>hi</section></div>',
  css: '.x { color: red; }',
  width: 1440,
  slug: 'test-block',
}

describe('composeSrcDoc', () => {
  it('(a) declares @layer order exactly as tokens, reset, shared, block', () => {
    const out = composeSrcDoc(MINIMAL)
    const declIdx = out.indexOf('@layer tokens, reset, shared, block;')
    expect(declIdx).toBeGreaterThan(-1)
    const firstBlockIdx = out.indexOf('@layer tokens {')
    expect(firstBlockIdx).toBeGreaterThan(declIdx)
  })

  it('(b) wraps body DOM: .slot-inner > [data-block-shell="{slug}"] > inner (shell from pre-wrap)', () => {
    // NOTE: data-block-shell comes from pre-wrapped input (upstream renderForPreview),
    // NOT from composeSrcDoc — PARITY §7 deviation vs. block-forge.
    const out = composeSrcDoc({
      ...MINIMAL,
      slug: 'kebab-slug',
      html: '<div data-block-shell="kebab-slug"><p id="inside">x</p></div>',
    })
    const parser = new DOMParser()
    const doc = parser.parseFromString(out, 'text/html')
    const slotInner = doc.querySelector('body > div.slot-inner')
    expect(slotInner).not.toBeNull()
    const shell = slotInner?.querySelector(':scope > div[data-block-shell="kebab-slug"]')
    expect(shell).not.toBeNull()
    const inside = shell?.querySelector('#inside')
    expect(inside).not.toBeNull()
  })

  it('(c) reflects slug verbatim in data-block-shell (via pre-wrap) AND postMessage payload', () => {
    const out = composeSrcDoc({
      ...MINIMAL,
      slug: 'kebab-slug',
      html: '<div data-block-shell="kebab-slug"><p>x</p></div>',
    })
    expect(out).toContain('data-block-shell="kebab-slug"')
    // postMessage uses JSON.stringify(slug) → appears as `slug: "kebab-slug"`
    expect(out).toContain('slug: "kebab-slug"')
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
    expect(sharedSection).toMatch(
      /\.slot-inner\s*\{[^}]*container-type:\s*inline-size[^}]*container-name:\s*slot[^}]*\}/,
    )
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
    // Studio single-wrap: empty input → `<div class="slot-inner"></div>` (no inner shell).
    // Note: block-forge would produce `<div class="slot-inner"><div data-block-shell="test-block"></div></div>`
    // — PARITY §7 deviation.
    expect(out).toContain('<div class="slot-inner"></div>')
  })

  it('(i) pins the postMessage type literal "block-forge:iframe-height"', () => {
    // Rename-guard: any rename forces a matching test update.
    const out = composeSrcDoc(MINIMAL)
    expect(out).toContain("type: 'block-forge:iframe-height'")
  })

  it('(studio-1) does NOT emit an inner data-block-shell wrapper — PARITY §7 anti-regression', () => {
    // Input html without data-block-shell → output body without data-block-shell.
    // If a future edit accidentally re-adds the inner wrap in composeSrcDoc, this
    // test fails loudly.
    const out = composeSrcDoc({
      ...MINIMAL,
      html: '<section>plain</section>',
      slug: 'plain-slug',
    })
    const parser = new DOMParser()
    const doc = parser.parseFromString(out, 'text/html')
    const slotInner = doc.querySelector('body > div.slot-inner')
    expect(slotInner).not.toBeNull()
    // First child inside .slot-inner should be the raw <section>, NOT a data-block-shell wrapper.
    expect(slotInner?.querySelector('[data-block-shell]')).toBeNull()
    expect(slotInner?.querySelector(':scope > section')).not.toBeNull()
    // But slug still flows into postMessage payload.
    expect(out).toContain('slug: "plain-slug"')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Task 2.9 — variant-bearing block rendering via Path B
// ───────────────────────────────────────────────────────────────────────────
describe('preview-assets — variant-bearing block rendering (Path B)', () => {
  it('renders both data-variant wrappers when block has variants', () => {
    // Synthetic block — Brain ruling (fixture strategy from Phase 0): engine has no
    // variant-bearing fixture, so we synthesize inline here.
    const syntheticBlock = {
      slug: 'test-variant-block',
      html: '<p class="hero">Base content</p>',
      css: '.hero { font-size: 24px; }',
      variants: {
        sm: {
          html: '<p class="hero">Mobile content</p>',
          css: '.hero { font-size: 16px; }',
        },
      },
    }
    const variantList = Object.entries(syntheticBlock.variants).map(([name, v]) => ({
      name,
      html: v.html,
      css: v.css,
    }))
    const preview = renderForPreview(
      {
        slug: syntheticBlock.slug,
        html: syntheticBlock.html,
        css: syntheticBlock.css,
      },
      { variants: variantList }, // NO width option — see Brain ruling 3 (triple-wrap hazard)
    )
    const srcdoc = composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: 375,
      slug: syntheticBlock.slug, // required for postMessage payload
    })

    // Variant wrappers come from engine's composeVariants output:
    expect(srcdoc).toContain('data-variant="base"')
    expect(srcdoc).toContain('data-variant="sm"')
    // At 375 panel width, `sm` variant reveals via @container slot (max-width: 480px)
    // emitted by buildAtContainer(480, body):
    expect(srcdoc).toMatch(/@container slot.*max-width:\s*480px/)
    // data-block-shell wrap present (from renderForPreview, not composeSrcDoc):
    expect(srcdoc).toContain('data-block-shell="test-variant-block"')
  })

  it('composes identity output when block has no variants', () => {
    const preview = renderForPreview(
      { slug: 'plain', html: '<p>hi</p>', css: 'p { color: black; }' },
      { variants: [] },
    )
    const srcdoc = composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: 1440,
      slug: 'plain',
    })
    expect(srcdoc).not.toContain('data-variant=')
    expect(srcdoc).toContain('<div data-block-shell="plain">')
    expect(srcdoc).toContain('<p>hi</p>')
  })
})

/**
 * WP-028 Phase 2a — DOM harness mirroring block-forge's injected click-handler test.
 * Extracts deriveSelector from composeSrcDoc output and runs against jsdom-built
 * elements. Regression guard for commit 53c9ffd1 (template-literal \s+ escape bug).
 */
describe('injected click-handler script — selector derivation via DOM harness', () => {
  function buildDeriveSelector(srcdoc: string): (el: Element) => string {
    const iife = srcdoc.match(/\/\/ WP-028 Phase 2 — element-click[\s\S]+?\}\)\(\);/)?.[0]
    if (!iife) throw new Error('could not locate click-handler IIFE')
    const utilMatch = iife.match(/const UTILITY_PREFIXES = \[[^\]]+\];/)?.[0]
    const stableStart = iife.indexOf('function stableClass')
    const deriveStart = iife.indexOf('function deriveSelector')
    const listenerStart = iife.indexOf('document.body.addEventListener')
    if (!utilMatch || stableStart < 0 || deriveStart < 0 || listenerStart < 0) {
      throw new Error('could not locate helper function anchors in IIFE source')
    }
    const stableMatch = iife.slice(stableStart, deriveStart).trim()
    const deriveMatch = iife.slice(deriveStart, listenerStart).trim()
    // CSS.escape polyfill — jsdom's CSS may lack escape; this matches the
    // WHATWG spec well enough for ident-class escaping in our test cases.
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
    root.innerHTML = '<section class="my-block"><h2 class="heading reveal">Hi</h2></section>'
    const sel = deriveSelector(root.querySelector('h2')!)
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

  it('ignores utility-prefixed classes and finds the first stable class', () => {
    const root = document.querySelector('.slot-inner')!
    root.innerHTML = '<section><button class="hover:text-red animate-pulse real-class">x</button></section>'
    const sel = deriveSelector(root.querySelector('button')!)
    expect(sel).toContain('button.real-class')
    expect(sel).not.toContain('hover')
    expect(sel).not.toContain('animate-pulse')
  })
})

/**
 * WP-036 Phase 1 — sidebar-to-iframe hover-highlight protocol contracts.
 * Studio mirror of tools/block-forge/src/__tests__/preview-assets.ts. Same 6
 * source-level invariants pinning the new request-hover IIFE listener.
 * PARITY: any drift here vs. the block-forge reference signals cross-surface
 * divergence that must be reconciled in the same commit.
 */
describe('injected hover-highlight handler — source contract (WP-036 Phase 1)', () => {
  const srcdoc = composeSrcDoc({ html: 'x', css: '', width: 768, slug: 'test' })

  it('declares [data-bf-hover-from-suggestion] outline rule', () => {
    expect(srcdoc).toContain('[data-bf-hover-from-suggestion]')
    const block = srcdoc.match(
      /\[data-bf-hover-from-suggestion\][\s\S]+?outline-color:\s*hsl\(var\(--text-link\)\)/,
    )
    expect(block).not.toBeNull()
  })

  it('listens for the inspector-request-hover postMessage type', () => {
    expect(srcdoc).toContain("'block-forge:inspector-request-hover'")
  })

  it('clears all data-bf-hover-from-suggestion attrs before applying new (multi-match safety)', () => {
    expect(srcdoc).toMatch(
      /document\.querySelectorAll\(['"]\[data-bf-hover-from-suggestion\]['"]\)\s*\.\s*forEach/,
    )
  })

  it('honors the __clear__ sentinel (selector falsy/sentinel returns without setAttr)', () => {
    expect(srcdoc).toMatch(/!msg\.selector\s*\|\|\s*msg\.selector\s*===\s*['"]__clear__['"]/)
  })

  it('wraps querySelector in try/catch (invalid selectors silent)', () => {
    const hoverBlock = srcdoc.match(
      /inspector-request-hover[\s\S]+?setAttribute\(['"]data-bf-hover-from-suggestion['"]/,
    )
    expect(hoverBlock).not.toBeNull()
    expect(hoverBlock![0]).toMatch(/try\s*\{/)
    expect(hoverBlock![0]).toContain('catch')
  })

  it('beforeunload cleanup clears the new external-hover attribute', () => {
    const teardown = srcdoc.match(
      /addEventListener\(['"]beforeunload['"][\s\S]+?data-bf-hover-from-suggestion[\s\S]+?\}\);/,
    )
    expect(teardown).not.toBeNull()
  })
})
