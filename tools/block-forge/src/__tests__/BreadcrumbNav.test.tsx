// @vitest-environment jsdom
// WP-033 Phase 2 — BreadcrumbNav extracted from InspectorPanel. Tests cover
// the 3 visual states (empty, hover, pinned) + pin-takes-priority. Snapshot
// pins the rendered shape so future ancestor-chain extension surfaces as a
// snap diff.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BreadcrumbNav } from '../components/BreadcrumbNav'

afterEach(cleanup)

const HOVER = { selector: 'h2.title', rect: { x: 0, y: 0, w: 100, h: 40 } }
const PIN = {
  selector: '.cta',
  rect: { x: 0, y: 0, w: 80, h: 30 },
  computedStyle: { fontSize: '14px' },
}

describe('BreadcrumbNav — empty state', () => {
  it('renders hint text when both hovered and pinned are null', () => {
    const { getByTestId } = render(<BreadcrumbNav hovered={null} pinned={null} />)
    const bc = getByTestId('inspector-breadcrumb')
    expect(bc.textContent).toMatch(/hover an element to inspect/i)
  })

  it('matches snapshot — empty state', () => {
    const { container } = render(<BreadcrumbNav hovered={null} pinned={null} />)
    expect(container).toMatchSnapshot()
  })
})

describe('BreadcrumbNav — hover state', () => {
  it('renders blue dot + selector when hovered set, pinned null', () => {
    const { getByTestId } = render(<BreadcrumbNav hovered={HOVER} pinned={null} />)
    const bc = getByTestId('inspector-breadcrumb')
    expect(bc.textContent).toContain('h2.title')
    expect(bc.querySelector('.bg-\\[hsl\\(var\\(--text-link\\)\\)\\]')).toBeTruthy()
  })

  it('matches snapshot — hover state', () => {
    const { container } = render(<BreadcrumbNav hovered={HOVER} pinned={null} />)
    expect(container).toMatchSnapshot()
  })
})

describe('BreadcrumbNav — pinned state', () => {
  it('renders green dot + selector when pinned set', () => {
    const { getByTestId } = render(<BreadcrumbNav hovered={null} pinned={PIN} />)
    const bc = getByTestId('inspector-breadcrumb')
    expect(bc.textContent).toContain('.cta')
    expect(bc.querySelector('.bg-\\[hsl\\(var\\(--status-success-fg\\)\\)\\]')).toBeTruthy()
  })

  it('pinned takes priority over hover when both are set', () => {
    const { getByTestId } = render(<BreadcrumbNav hovered={HOVER} pinned={PIN} />)
    const bc = getByTestId('inspector-breadcrumb')
    expect(bc.textContent).toContain('.cta')
    expect(bc.textContent).not.toContain('h2.title')
  })

  it('matches snapshot — pinned state', () => {
    const { container } = render(<BreadcrumbNav hovered={null} pinned={PIN} />)
    expect(container).toMatchSnapshot()
  })
})

describe('BreadcrumbNav — custom data-testid', () => {
  it('honors data-testid override', () => {
    const { getByTestId } = render(
      <BreadcrumbNav hovered={null} pinned={null} data-testid="custom-bc" />,
    )
    expect(getByTestId('custom-bc')).toBeTruthy()
  })
})
