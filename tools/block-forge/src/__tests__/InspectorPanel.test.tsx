// @vitest-environment jsdom
// WP-033 Phase 1 — InspectorPanel snapshot. Pin the rendered shape of the
// shell so any unintended class / structure churn during Phase 2 (when the
// Properties placeholder is replaced) shows up as a snap diff.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { InspectorPanel } from '../components/InspectorPanel'

afterEach(cleanup)

describe('InspectorPanel — empty state (no slug)', () => {
  it('renders empty placeholder', () => {
    const { container } = render(
      <InspectorPanel
        slug={null}
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — populated, no hover/pin', () => {
  it('renders header + breadcrumb hint + BP picker + properties placeholder', () => {
    const { container } = render(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — hover only', () => {
  it('renders blue dot + selector in muted breadcrumb', () => {
    const { container, getByTestId } = render(
      <InspectorPanel
        slug="hero"
        hovered={{ selector: 'h2.title', rect: { x: 0, y: 0, w: 100, h: 40 } }}
        pinned={null}
        activeBp={768}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('h2.title')
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — pinned (Clear button visible)', () => {
  it('renders green dot + selector + Clear button', () => {
    const { container, getByTestId } = render(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={{
          selector: '.cta',
          rect: { x: 0, y: 0, w: 80, h: 30 },
          computedStyle: { fontSize: '14px' },
        }}
        activeBp={375}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-clear-pin')).toBeTruthy()
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('.cta')
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — BP picker', () => {
  it('renders 3 BP radios with active one aria-checked', () => {
    const { getAllByRole } = render(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={768}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    const radios = getAllByRole('radio')
    expect(radios.length).toBe(3)
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0].textContent).toBe('768')
  })

  it('exposes data-testid for each BP option', () => {
    const { getByTestId } = render(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-bp-1440')).toBeTruthy()
    expect(getByTestId('inspector-bp-768')).toBeTruthy()
    expect(getByTestId('inspector-bp-375')).toBeTruthy()
  })
})
