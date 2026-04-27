// @vitest-environment jsdom
// WP-033 Phase 4 — Studio mirror of tools/block-forge Inspector.test.tsx
// (cross-surface test mirror per Phase 4 Ruling 1).

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, render, cleanup, fireEvent } from '@testing-library/react'
import { Inspector } from '../Inspector'

afterEach(() => {
  cleanup()
  document.body.querySelectorAll('iframe').forEach((f) => f.remove())
})

type PinReq = {
  type: 'block-forge:inspector-request-pin'
  slug: string
  selector: string
}

function mountIframeFixture(slug: string) {
  const iframe = document.createElement('iframe')
  iframe.title = `${slug}-1440`
  document.body.appendChild(iframe)
  const spy = vi.fn()
  Object.defineProperty(iframe, 'contentWindow', {
    configurable: true,
    value: { postMessage: spy },
  })
  return { iframe, spy }
}

function dispatchMessage(data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data }))
  })
}

describe('Inspector — slug=null empty state', () => {
  it('renders InspectorPanel with empty placeholder', () => {
    const { getByTestId } = render(
      <Inspector slug={null} activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    const panel = getByTestId('inspector-panel')
    expect(panel.getAttribute('data-empty')).toBe('true')
    expect(panel.textContent).toMatch(/select a block/i)
  })

  it('ignores all messages when slug is null', () => {
    const onBpChange = vi.fn()
    render(<Inspector slug={null} activeBp={1440} onActiveBpChange={onBpChange} />)
    dispatchMessage({
      type: 'block-forge:inspector-hover',
      slug: 'anything',
      selector: '.foo',
      rect: { x: 0, y: 0, w: 10, h: 10 },
    })
    expect(document.querySelector('[data-testid="inspector-breadcrumb"]')).toBeNull()
  })
})

describe('Inspector — hover listener', () => {
  it('updates breadcrumb when matching-slug hover message arrives', () => {
    const { getByTestId, container } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-hover',
      slug: 'hero',
      selector: 'h2.title',
      rect: { x: 0, y: 0, w: 100, h: 40 },
    })
    const bc = getByTestId('inspector-breadcrumb')
    expect(bc.textContent).toContain('h2.title')
    expect(container.querySelector('[data-empty]')).toBeNull()
  })

  it('clears hover on inspector-unhover', () => {
    const { getByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-hover',
      slug: 'hero',
      selector: 'h2.title',
      rect: { x: 0, y: 0, w: 100, h: 40 },
    })
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('h2.title')
    dispatchMessage({ type: 'block-forge:inspector-unhover', slug: 'hero' })
    expect(getByTestId('inspector-breadcrumb').textContent).toMatch(/hover an element/i)
  })

  it('ignores hover with mismatched slug (slug-filter)', () => {
    const { getByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-hover',
      slug: 'OTHER-BLOCK',
      selector: 'p.foreign',
      rect: { x: 0, y: 0, w: 50, h: 20 },
    })
    expect(getByTestId('inspector-breadcrumb').textContent).not.toContain('p.foreign')
  })
})

describe('Inspector — click-to-pin gesture', () => {
  let iframeSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    const { spy } = mountIframeFixture('hero')
    iframeSpy = spy
  })

  it('forwards element-click as inspector-request-pin to the iframe', () => {
    render(<Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />)
    dispatchMessage({
      type: 'block-forge:element-click',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: {},
    })
    expect(iframeSpy).toHaveBeenCalledTimes(1)
    const call = iframeSpy.mock.calls[0][0] as PinReq
    expect(call.type).toBe('block-forge:inspector-request-pin')
    expect(call.slug).toBe('hero')
    expect(call.selector).toBe('.cta')
  })

  it('updates pinned state on inspector-pin-applied (renders Clear button)', () => {
    const { getByTestId, queryByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    expect(queryByTestId('inspector-clear-pin')).toBeNull()
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: { fontSize: '14px' },
    })
    const clearBtn = getByTestId('inspector-clear-pin')
    expect(clearBtn).toBeTruthy()
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('.cta')
  })

  it('clears pinned state on inspector-pin-applied with selector=null', () => {
    const { queryByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: {},
    })
    expect(queryByTestId('inspector-clear-pin')).toBeTruthy()
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: null,
    })
    expect(queryByTestId('inspector-clear-pin')).toBeNull()
  })
})

describe('Inspector — Escape clears pin', () => {
  let iframeSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    const { spy } = mountIframeFixture('hero')
    iframeSpy = spy
  })

  it('Escape sends __clear__ sentinel when pin is active', () => {
    render(<Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />)
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: {},
    })
    iframeSpy.mockClear()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(iframeSpy).toHaveBeenCalledTimes(1)
    const call = iframeSpy.mock.calls[0][0] as PinReq
    expect(call.selector).toBe('__clear__')
  })

  it('Escape with no pin does NOT post any message (listener gated on pinned)', () => {
    render(<Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />)
    iframeSpy.mockClear()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(iframeSpy).not.toHaveBeenCalled()
  })
})

describe('Inspector — slug change clears pin (block switch)', () => {
  beforeEach(() => {
    mountIframeFixture('hero')
  })

  it('clears pinned state when slug prop changes', () => {
    const { rerender, queryByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: {},
    })
    expect(queryByTestId('inspector-clear-pin')).toBeTruthy()
    rerender(<Inspector slug="footer" activeBp={1440} onActiveBpChange={() => undefined} />)
    expect(queryByTestId('inspector-clear-pin')).toBeNull()
  })
})

describe('Inspector — BP change re-pins', () => {
  let iframeSpy: ReturnType<typeof vi.fn>
  beforeEach(() => {
    const { spy } = mountIframeFixture('hero')
    iframeSpy = spy
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('re-issues inspector-request-pin when activeBp changes', () => {
    const { rerender } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    dispatchMessage({
      type: 'block-forge:inspector-pin-applied',
      slug: 'hero',
      selector: '.cta',
      rect: { x: 0, y: 0, w: 80, h: 30 },
      computedStyle: {},
    })
    iframeSpy.mockClear()
    rerender(<Inspector slug="hero" activeBp={768} onActiveBpChange={() => undefined} />)
    expect(iframeSpy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(120)
    expect(iframeSpy).toHaveBeenCalledTimes(1)
    const call = iframeSpy.mock.calls[0][0] as PinReq
    expect(call.selector).toBe('.cta')
  })

  it('does NOT re-pin when activeBp changes but no current pin', () => {
    const { rerender } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={() => undefined} />,
    )
    iframeSpy.mockClear()
    rerender(<Inspector slug="hero" activeBp={768} onActiveBpChange={() => undefined} />)
    vi.advanceTimersByTime(200)
    expect(iframeSpy).not.toHaveBeenCalled()
  })
})

describe('Inspector — BP picker', () => {
  it('clicking inspector-bp-768 calls onActiveBpChange(768)', () => {
    const onBpChange = vi.fn()
    const { getByTestId } = render(
      <Inspector slug="hero" activeBp={1440} onActiveBpChange={onBpChange} />,
    )
    fireEvent.click(getByTestId('inspector-bp-768'))
    expect(onBpChange).toHaveBeenCalledWith(768)
  })
})
