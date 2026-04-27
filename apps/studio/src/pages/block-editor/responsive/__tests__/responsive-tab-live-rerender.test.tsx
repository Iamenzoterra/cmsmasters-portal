// @vitest-environment jsdom
// WP-033 Phase 5 OQ1 — displayBlock follows watchedFormCode so the visible
// iframe reflects Inspector + TweakPanel + SuggestionList tweaks IMMEDIATELY
// (DevTools mental model). Falls back to suggestions-applied derivation when
// no form.code is threaded (initial mount + post-Reset / test contexts).
//
// The visible iframe srcdoc is the assertion surface — fingerprint strings in
// form.code MUST appear in the rendered iframe; absence means displayBlock did
// not pick up the watch.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ResponsiveTab } from '../ResponsiveTab'
import type { Block } from '@cmsmasters/db'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
/* eslint-disable @typescript-eslint/no-explicit-any */
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = ResizeObserverMock
}
if (typeof Element !== 'undefined') {
  const P = Element.prototype as any
  if (!P.hasPointerCapture) P.hasPointerCapture = () => false
  if (!P.setPointerCapture) P.setPointerCapture = () => undefined
  if (!P.releasePointerCapture) P.releasePointerCapture = () => undefined
  if (!P.scrollIntoView) P.scrollIntoView = () => undefined
}
/* eslint-enable @typescript-eslint/no-explicit-any */

afterEach(cleanup)

function fixtureBlock(slug: string, html: string, css: string): Block {
  return {
    id: `fixture-${slug}`,
    slug,
    html,
    css,
    variants: null,
  } as unknown as Block
}

function getResponsivePreviewIframes(slug: string): HTMLIFrameElement[] {
  // ResponsivePreview renders 3 iframes via PreviewPanel; Inspector renders 3
  // hidden probe iframes that ALSO source from form.code. Match by data-slug
  // attribute carried in srcdoc (preview-assets composeSrcDoc emits it).
  const all = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[]
  return all.filter((f) => (f.srcdoc ?? '').includes(`data-block-shell="${slug}"`))
}

describe('ResponsiveTab — OQ1 displayBlock follows watchedFormCode', () => {
  it('reflects form.code mutations in iframe srcdoc IMMEDIATELY', () => {
    const block = fixtureBlock(
      'live-rerender-1',
      '<div class="foo">x</div>',
      '.foo { color: red; }',
    )
    // Form.code carries a TWEAK that the visible iframe MUST pick up.
    const formCode = [
      '<style>',
      '.foo { color: red; }',
      '@container slot (max-width: 1440px) {',
      '  .foo { font-size: 99px; /* live-rerender-fingerprint-A */ }',
      '}',
      '</style>',
      '',
      '<div class="foo">x</div>',
    ].join('\n')

    const { container } = render(<ResponsiveTab block={block} watchedFormCode={formCode} />)
    expect(container).toBeTruthy()

    const iframes = getResponsivePreviewIframes('live-rerender-1')
    expect(iframes.length).toBeGreaterThan(0)
    // Fingerprint MUST appear in at least one iframe's srcdoc.
    const matches = iframes.filter((f) => (f.srcdoc ?? '').includes('live-rerender-fingerprint-A'))
    expect(matches.length).toBeGreaterThan(0)
  })

  it('falls back to block derivation when no form.code threaded (initial mount)', () => {
    const block = fixtureBlock(
      'live-rerender-2',
      '<div class="bar">y</div>',
      '.bar { color: blue; /* block-css-fingerprint-B */ }',
    )

    render(<ResponsiveTab block={block} />)

    const iframes = getResponsivePreviewIframes('live-rerender-2')
    expect(iframes.length).toBeGreaterThan(0)
    // Initial mount with no watchedFormCode → fallback path (block.css renders).
    const matches = iframes.filter((f) => (f.srcdoc ?? '').includes('block-css-fingerprint-B'))
    expect(matches.length).toBeGreaterThan(0)
  })

  it('empty watchedFormCode falls back to block (post-Reset shape)', () => {
    const block = fixtureBlock(
      'live-rerender-3',
      '<div class="baz">z</div>',
      '.baz { padding: 8px; /* block-css-fingerprint-C */ }',
    )

    render(<ResponsiveTab block={block} watchedFormCode="" />)

    const iframes = getResponsivePreviewIframes('live-rerender-3')
    expect(iframes.length).toBeGreaterThan(0)
    const matches = iframes.filter((f) => (f.srcdoc ?? '').includes('block-css-fingerprint-C'))
    expect(matches.length).toBeGreaterThan(0)
  })

  it('form.code with only HTML (no <style>) still drives displayBlock html', () => {
    const block = fixtureBlock(
      'live-rerender-4',
      '<div class="orig">original</div>',
      '.orig { color: green; }',
    )
    // Form.code carries a NEW html with a unique fingerprint and no <style>.
    const formCode = '<div class="new">new-html-fingerprint-D</div>'

    render(<ResponsiveTab block={block} watchedFormCode={formCode} />)

    const iframes = getResponsivePreviewIframes('live-rerender-4')
    expect(iframes.length).toBeGreaterThan(0)
    const matches = iframes.filter((f) => (f.srcdoc ?? '').includes('new-html-fingerprint-D'))
    expect(matches.length).toBeGreaterThan(0)
  })

  it('updated watchedFormCode replaces previous fingerprint in iframe srcdoc', () => {
    const block = fixtureBlock(
      'live-rerender-5',
      '<div class="foo">x</div>',
      '.foo { color: red; }',
    )

    const initialCode = '<style>\n.foo { font-size: 11px; /* fingerprint-INITIAL */ }\n</style>\n\n<div class="foo">x</div>'
    const updatedCode = '<style>\n.foo { font-size: 22px; /* fingerprint-UPDATED */ }\n</style>\n\n<div class="foo">x</div>'

    const { rerender } = render(<ResponsiveTab block={block} watchedFormCode={initialCode} />)

    let iframes = getResponsivePreviewIframes('live-rerender-5')
    let initialMatches = iframes.filter((f) => (f.srcdoc ?? '').includes('fingerprint-INITIAL'))
    expect(initialMatches.length).toBeGreaterThan(0)

    rerender(<ResponsiveTab block={block} watchedFormCode={updatedCode} />)

    iframes = getResponsivePreviewIframes('live-rerender-5')
    const updatedMatches = iframes.filter((f) => (f.srcdoc ?? '').includes('fingerprint-UPDATED'))
    expect(updatedMatches.length).toBeGreaterThan(0)
    // Initial fingerprint should be GONE — visible iframe reflects latest form.code.
    const lingering = iframes.filter((f) => (f.srcdoc ?? '').includes('fingerprint-INITIAL'))
    expect(lingering.length).toBe(0)
  })
})
