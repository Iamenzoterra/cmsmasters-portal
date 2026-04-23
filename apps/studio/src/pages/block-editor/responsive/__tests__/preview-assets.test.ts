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

import { describe, it, expect } from 'vitest'
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
