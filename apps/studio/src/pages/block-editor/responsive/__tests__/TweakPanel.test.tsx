// @vitest-environment jsdom
// WP-028 Phase 2 — TweakPanel real-component tests (Studio Responsive tab surface).
// Includes OQ4 behavioral invariant (Ruling C Anchor 2): dispatch reads live form.code
// at dispatch time, not stale block.css — tested via dispatchTweakToForm helper.
// Cross-surface parity mirror: tools/block-forge/src/__tests__/TweakPanel.test.tsx

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import type { Tweak } from '@cmsmasters/block-forge-core'
import { TweakPanel, type TweakSelection } from '../TweakPanel'
import { dispatchTweakToForm } from '../ResponsiveTab'

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

describe('TweakPanel (apps/studio) — empty state', () => {
  it('renders empty placeholder with testid + aria-label when selection is null', () => {
    const { getByTestId } = render(<TweakPanel {...makeProps({ selection: null })} />)
    const el = getByTestId('tweak-panel')
    expect(el.getAttribute('aria-label')).toBe('Element tweak panel')
    expect(el.getAttribute('data-empty')).toBe('true')
    expect(el.textContent).toMatch(/click.*element/i)
  })
})

describe('TweakPanel (apps/studio) — populated state', () => {
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

/**
 * OQ4 BEHAVIORAL INVARIANT (Brain Ruling C Anchor 2).
 *
 * dispatchTweakToForm MUST read `form.getValues('code')` at dispatch time —
 * NEVER close over stale `block.css` from a prior load. Prevents silent data
 * loss when an author edits the code textarea and then tweaks via slider.
 *
 * Verification: mock form with getValues returning textarea-edited CSS that
 * differs from what the parent originally loaded. Dispatch a tweak. Assert
 * that setValue received a string derived from the LIVE getValues payload,
 * not from any cached/closure value.
 */
describe('OQ4 invariant — dispatch reads live form.code at dispatch time', () => {
  it('dispatchTweakToForm calls getValues("code") exactly at dispatch time', () => {
    const liveCode =
      '<style>\n.cta-btn { padding: 99px; color: blue; }\n</style>\n\n<button class="cta-btn">Go</button>'
    const getValues = vi.fn(() => liveCode)
    const setValue = vi.fn()
    const form = { getValues, setValue } as const

    const tweak: Tweak = {
      selector: '.cta-btn',
      bp: 480,
      property: 'padding',
      value: '24px',
    }

    dispatchTweakToForm(form, tweak)

    expect(getValues).toHaveBeenCalledWith('code')
    expect(getValues).toHaveBeenCalledTimes(1)
    expect(setValue).toHaveBeenCalledTimes(1)

    const [key, newCode, opts] = setValue.mock.calls[0]
    expect(key).toBe('code')
    expect(opts).toEqual({ shouldDirty: true })

    // The newCode must PRESERVE the author's 99px baseline context (came from
    // live getValues, not a stale closure) while ADDING the @container tweak.
    expect(newCode).toContain('padding: 99px')
    expect(newCode).toContain('@container slot (max-width: 480px)')
    expect(newCode).toContain('padding: 24px')
    // HTML body also preserved.
    expect(newCode).toContain('<button class="cta-btn">Go</button>')
  })

  it('dispatchTweakToForm handles code with NO style tag (pure html)', () => {
    const getValues = vi.fn(() => '<button class="x">Hi</button>')
    const setValue = vi.fn()
    const form = { getValues, setValue } as const

    dispatchTweakToForm(form, {
      selector: '.x',
      bp: 768,
      property: 'gap',
      value: '16px',
    })

    expect(setValue).toHaveBeenCalledTimes(1)
    const [, newCode] = setValue.mock.calls[0]
    expect(newCode).toContain('@container slot (max-width: 768px)')
    expect(newCode).toContain('gap: 16px')
    expect(newCode).toContain('<button class="x">Hi</button>')
  })

  it('dispatchTweakToForm is called fresh each time — no stale closure over form', () => {
    // Simulate two separate dispatches; second one should read updated getValues result.
    let currentCode = '<style>\n.x { color: red }\n</style>'
    const getValues = vi.fn(() => currentCode)
    const setValue = vi.fn((_key: string, v: string) => {
      currentCode = v // Simulate RHF updating on setValue
    })
    const form = { getValues, setValue } as const

    dispatchTweakToForm(form, {
      selector: '.x',
      bp: 480,
      property: 'padding',
      value: '24px',
    })
    expect(getValues).toHaveBeenCalledTimes(1)

    // Between dispatches — author edits textarea manually.
    currentCode = '<style>\n.x { color: red; font-weight: bold; }\n</style>'

    dispatchTweakToForm(form, {
      selector: '.x',
      bp: 768,
      property: 'font-size',
      value: '20px',
    })
    expect(getValues).toHaveBeenCalledTimes(2)

    // The second setValue MUST reflect the mid-way textarea edit (font-weight: bold).
    const [, secondNewCode] = setValue.mock.calls[1]
    expect(secondNewCode).toContain('font-weight: bold')
    expect(secondNewCode).toContain('@container slot (max-width: 768px)')
    expect(secondNewCode).toContain('font-size: 20px')
  })
})
