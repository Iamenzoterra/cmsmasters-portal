// @vitest-environment jsdom
// WP-028 Phase 1 — VariantsDrawer parity scaffold (Studio Responsive tab surface).
// Phase 3 extends with form.setValue('variants', ...) dispatch assertions (Brain OQ4).
// Cross-surface parity mirror: tools/block-forge/src/__tests__/VariantsDrawer.test.tsx

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { VariantsDrawer } from '../VariantsDrawer'

afterEach(cleanup) // RTL doesn't auto-cleanup in Vitest

describe('VariantsDrawer (apps/studio)', () => {
  it('renders empty placeholder with testid + aria-label', () => {
    const noop = () => {}
    const { getByTestId } = render(<VariantsDrawer open={false} onOpenChange={noop} />)
    const el = getByTestId('variants-drawer')
    expect(el.getAttribute('aria-label')).toBe('Variants drawer')
    expect(el.getAttribute('data-open')).toBe('false')
  })

  it('reflects open state via data-attr', () => {
    const noop = () => {}
    const { getByTestId } = render(<VariantsDrawer open={true} onOpenChange={noop} />)
    expect(getByTestId('variants-drawer').getAttribute('data-open')).toBe('true')
  })

  it('parity snapshot — cross-surface mirror contract', () => {
    const noop = () => {}
    const { container } = render(<VariantsDrawer open={true} onOpenChange={noop} />)
    expect(container.innerHTML).toMatchSnapshot()
  })
})
