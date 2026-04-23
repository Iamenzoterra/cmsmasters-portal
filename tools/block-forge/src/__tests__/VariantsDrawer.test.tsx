// @vitest-environment jsdom
// WP-028 Phase 1 — VariantsDrawer parity scaffold (tools/block-forge surface).
// Phase 3 extends with Drawer open/close + variant-list assertions.
// Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { VariantsDrawer } from '../components/VariantsDrawer'

afterEach(cleanup) // RTL doesn't auto-cleanup in Vitest

describe('VariantsDrawer (tools/block-forge)', () => {
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
