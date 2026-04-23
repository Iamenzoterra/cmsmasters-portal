// @vitest-environment jsdom
// WP-028 Phase 2 — TweakPanel real-component tests (tools/block-forge surface).
// Parity snapshot regenerated; body assertions match the mirror test on Studio surface.
// Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import type { Tweak } from '@cmsmasters/block-forge-core'
import { TweakPanel, type TweakSelection } from '../components/TweakPanel'

// jsdom doesn't implement ResizeObserver / PointerCapture; Radix Slider uses them.
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

function makeSelection(overrides: Partial<TweakSelection> = {}): TweakSelection {
  return {
    selector: '.cta-btn',
    bp: 480,
    computedStyle: {
      padding: '24px',
      fontSize: '16px',
      gap: '0px',
      display: 'block',
    },
    ...overrides,
  }
}

function makeProps(overrides: Partial<React.ComponentProps<typeof TweakPanel>> = {}) {
  return {
    selection: null as TweakSelection | null,
    onBpChange: vi.fn(),
    onTweak: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe('TweakPanel (tools/block-forge) — empty state', () => {
  it('renders empty placeholder with testid + aria-label when selection is null', () => {
    const { getByTestId } = render(<TweakPanel {...makeProps({ selection: null })} />)
    const el = getByTestId('tweak-panel')
    expect(el.getAttribute('aria-label')).toBe('Element tweak panel')
    expect(el.getAttribute('data-empty')).toBe('true')
    expect(el.textContent).toMatch(/click.*element/i)
  })
})

describe('TweakPanel (tools/block-forge) — populated state', () => {
  it('reflects selector + bp via data attrs', () => {
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection() })} />,
    )
    const el = getByTestId('tweak-panel')
    expect(el.getAttribute('data-selector')).toBe('.cta-btn')
    expect(el.getAttribute('data-bp')).toBe('480')
  })

  it('renders BP picker with 3 breakpoints (1440 / 768 / 480 per Ruling K)', () => {
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection() })} />,
    )
    expect(getByTestId('tweak-panel-bp-1440')).toBeTruthy()
    expect(getByTestId('tweak-panel-bp-768')).toBeTruthy()
    expect(getByTestId('tweak-panel-bp-480')).toBeTruthy()
  })

  it('BP picker click fires onBpChange with the chosen breakpoint', () => {
    const onBpChange = vi.fn()
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection(), onBpChange })} />,
    )
    fireEvent.click(getByTestId('tweak-panel-bp-768'))
    expect(onBpChange).toHaveBeenCalledWith(768)
  })

  it('hide button fires onTweak with { property: display, value: none }', () => {
    const onTweak = vi.fn()
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection(), onTweak })} />,
    )
    fireEvent.click(getByTestId('tweak-panel-visibility-hide'))
    expect(onTweak).toHaveBeenCalledTimes(1)
    const arg = onTweak.mock.calls[0][0] as Tweak
    expect(arg.property).toBe('display')
    expect(arg.value).toBe('none')
    expect(arg.selector).toBe('.cta-btn')
    expect(arg.bp).toBe(480)
  })

  it('reset button fires onReset', () => {
    const onReset = vi.fn()
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection(), onReset })} />,
    )
    fireEvent.click(getByTestId('tweak-panel-reset'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('close button fires onClose', () => {
    const onClose = vi.fn()
    const { getByTestId } = render(
      <TweakPanel {...makeProps({ selection: makeSelection(), onClose })} />,
    )
    fireEvent.click(getByTestId('tweak-panel-close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('parity snapshot — cross-surface mirror contract', () => {
    const { container } = render(
      <TweakPanel {...makeProps({ selection: makeSelection() })} />,
    )
    expect(container.innerHTML).toMatchSnapshot()
  })
})
