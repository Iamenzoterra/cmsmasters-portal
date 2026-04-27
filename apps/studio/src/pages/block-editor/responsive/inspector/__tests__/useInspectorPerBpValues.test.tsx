// @vitest-environment jsdom
// WP-033 Phase 4 — Studio mirror of tools/block-forge useInspectorPerBpValues.test.tsx
// (cross-surface test mirror per Phase 4 Ruling 1).
//
// jsdom limitation: jsdom doesn't fully resolve @container queries, so we
// assert the *flow* (iframe spawn count, pin/unpin transitions, cache
// hit/miss, cleanup) rather than the *resolved values*. Live smoke verifies
// resolved values in a real browser.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup, waitFor } from '@testing-library/react'
import {
  useInspectorPerBpValues,
  __resetInspectorPerBpCache,
} from '../hooks/useInspectorPerBpValues'
import type { PinState } from '../Inspector'

beforeEach(() => {
  __resetInspectorPerBpCache()
})
afterEach(cleanup)

const PIN: PinState = {
  selector: '.cta',
  rect: { x: 0, y: 0, w: 80, h: 30 },
  computedStyle: { fontSize: '14px' },
}

const HTML = `<div class="cta">Hi</div>`
const CSS = `.cta { font-size: 14px; }`

function probeIframeCount(): number {
  return document.querySelectorAll('iframe[title^="inspector-probe-"]').length
}

describe('useInspectorPerBpValues — null pin', () => {
  it('returns empty map when pinned is null', () => {
    const { result } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: null,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(result.current).toEqual({ 375: null, 768: null, 1440: null })
    expect(probeIframeCount()).toBe(0)
  })

  it('returns empty map when blockHtml is empty', () => {
    const { result } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: '',
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(result.current).toEqual({ 375: null, 768: null, 1440: null })
    expect(probeIframeCount()).toBe(0)
  })
})

describe('useInspectorPerBpValues — iframe spawn', () => {
  it('spawns 3 hidden iframes when pin set + html + css present', () => {
    renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)

    const iframes = Array.from(
      document.querySelectorAll('iframe[title^="inspector-probe-"]'),
    ) as HTMLIFrameElement[]
    const titles = iframes.map((f) => f.title).sort()
    expect(titles).toEqual([
      'inspector-probe-1440',
      'inspector-probe-375',
      'inspector-probe-768',
    ])
  })

  it('iframes are positioned off-screen (left: -99999px)', () => {
    renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    const iframes = Array.from(
      document.querySelectorAll('iframe[title^="inspector-probe-"]'),
    ) as HTMLIFrameElement[]
    iframes.forEach((f) => {
      expect(f.style.left).toBe('-99999px')
      expect(f.getAttribute('aria-hidden')).toBe('true')
    })
  })
})

describe('useInspectorPerBpValues — cleanup', () => {
  it('removes iframes on unmount', () => {
    const { unmount } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)
    unmount()
    expect(probeIframeCount()).toBe(0)
  })

  it('removes iframes on pin clear', () => {
    const { rerender } = renderHook(
      ({ pinned }: { pinned: PinState | null }) =>
        useInspectorPerBpValues({
          pinned,
          blockHtml: HTML,
          effectiveCss: CSS,
          slug: 'test',
        }),
      { initialProps: { pinned: PIN as PinState | null } },
    )
    expect(probeIframeCount()).toBe(3)
    rerender({ pinned: null })
    expect(probeIframeCount()).toBe(0)
  })
})

function dispatchLoadOnAllProbes() {
  const iframes = Array.from(
    document.querySelectorAll('iframe[title^="inspector-probe-"]'),
  ) as HTMLIFrameElement[]
  iframes.forEach((f) => {
    f.dispatchEvent(new Event('load'))
  })
}

describe('useInspectorPerBpValues — settled values (manual load dispatch)', () => {
  it('after dispatching load on all 3 probes, returns settled map + iframes cleaned', async () => {
    const { result } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)
    dispatchLoadOnAllProbes()
    await waitFor(() => expect(probeIframeCount()).toBe(0), { timeout: 1000 })
    expect(result.current).toBeDefined()
  })
})

describe('useInspectorPerBpValues — cache', () => {
  it('cache hit on remount with same args spawns 0 new iframes', async () => {
    const { unmount } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)
    dispatchLoadOnAllProbes()
    await waitFor(() => expect(probeIframeCount()).toBe(0), { timeout: 1000 })
    unmount()

    const { result: result2 } = renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(0)
    expect(result2.current).toBeDefined()
  })

  it('cache miss on selector change spawns new iframes', () => {
    renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)
    dispatchLoadOnAllProbes()

    cleanup()
    expect(probeIframeCount()).toBe(0)

    const PIN2: PinState = { ...PIN, selector: '.different' }
    renderHook(() =>
      useInspectorPerBpValues({
        pinned: PIN2,
        blockHtml: HTML,
        effectiveCss: CSS,
        slug: 'test',
      }),
    )
    expect(probeIframeCount()).toBe(3)
  })
})
