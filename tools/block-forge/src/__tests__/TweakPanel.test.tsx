// @vitest-environment jsdom
// WP-028 Phase 1 — TweakPanel parity scaffold (tools/block-forge surface).
// Phase 2 extends with postMessage + emitTweak dispatch assertions.
// Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TweakPanel } from '../components/TweakPanel'

afterEach(cleanup) // RTL doesn't auto-cleanup in Vitest

describe('TweakPanel (tools/block-forge)', () => {
  it('renders empty placeholder with testid + aria-label', () => {
    const { getByTestId } = render(<TweakPanel selector={null} bp={null} />)
    const el = getByTestId('tweak-panel')
    expect(el.getAttribute('aria-label')).toBe('Element tweak panel')
    expect(el.getAttribute('data-selector')).toBe('')
    expect(el.getAttribute('data-bp')).toBe('')
  })

  it('reflects selector + bp via data-attrs', () => {
    const { getByTestId } = render(<TweakPanel selector=".cta-btn" bp={480} />)
    const el = getByTestId('tweak-panel')
    expect(el.getAttribute('data-selector')).toBe('.cta-btn')
    expect(el.getAttribute('data-bp')).toBe('480')
  })

  it('parity snapshot — cross-surface mirror contract', () => {
    const { container } = render(<TweakPanel selector=".cta-btn" bp={480} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
