// @vitest-environment jsdom
// WP-033 Phase 2 — PropertyRow component tests.
//
// Coverage: label, valuesByBp sourcing (active vs null), active-vs-inactive
// data attributes, ↗ view icon click → onBpSwitch with correct BP, no ↗ on
// active cell, inheritedFrom slot, tokenChip slot, BP_SHORT (M/T/D), empty
// cell em-dash. Snapshot covers the typical pinned-state row shape.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { PropertyRow } from '../components/PropertyRow'

afterEach(cleanup)

function makeValues(activeBp: 375 | 768 | 1440, value: string) {
  return {
    375: activeBp === 375 ? value : null,
    768: activeBp === 768 ? value : null,
    1440: activeBp === 1440 ? value : null,
  }
}

describe('PropertyRow — label rendering', () => {
  it('renders the property label', () => {
    const { getByText } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(getByText('font-size')).toBeTruthy()
  })

  it('uses label as default data-testid', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(getByTestId('property-row-font-size')).toBeTruthy()
  })
})

describe('PropertyRow — valuesByBp sourcing', () => {
  it('shows the value at the active BP cell', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(getByTestId('property-row-font-size-cell-1440').textContent).toContain('16px')
  })

  it('shows em-dash on inactive cells (Phase 2 active-only sourcing)', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(getByTestId('property-row-font-size-cell-768').textContent).toContain('—')
    expect(getByTestId('property-row-font-size-cell-375').textContent).toContain('—')
  })
})

describe('PropertyRow — active vs inactive cell attributes', () => {
  it('marks the active BP cell with data-active="true"', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(768, '14px')}
        activeBp={768}
        onBpSwitch={() => undefined}
      />,
    )
    const row = getByTestId('property-row-font-size')
    const activeCell = row.querySelector('[data-cell-bp="768"]')
    const inactive1 = row.querySelector('[data-cell-bp="1440"]')
    const inactive2 = row.querySelector('[data-cell-bp="375"]')
    expect(activeCell?.getAttribute('data-active')).toBe('true')
    expect(inactive1?.getAttribute('data-active')).toBe('false')
    expect(inactive2?.getAttribute('data-active')).toBe('false')
  })

  it('marks the empty cells with data-empty="true"', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    const row = getByTestId('property-row-font-size')
    expect(row.querySelector('[data-cell-bp="1440"]')?.getAttribute('data-empty')).toBe('false')
    expect(row.querySelector('[data-cell-bp="768"]')?.getAttribute('data-empty')).toBe('true')
    expect(row.querySelector('[data-cell-bp="375"]')?.getAttribute('data-empty')).toBe('true')
  })
})

describe('PropertyRow — ↗ view icon (caveat 3 — inactive switch)', () => {
  it('renders ↗ button only on inactive cells', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-font-size-switch-1440')).toBeNull()
    expect(getByTestId('property-row-font-size-switch-768')).toBeTruthy()
    expect(getByTestId('property-row-font-size-switch-375')).toBeTruthy()
  })

  it('clicking ↗ on inactive cell calls onBpSwitch with that BP', () => {
    const onBpSwitch = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={onBpSwitch}
      />,
    )
    fireEvent.click(getByTestId('property-row-font-size-switch-768'))
    expect(onBpSwitch).toHaveBeenCalledWith(768)
    fireEvent.click(getByTestId('property-row-font-size-switch-375'))
    expect(onBpSwitch).toHaveBeenCalledWith(375)
    expect(onBpSwitch).toHaveBeenCalledTimes(2)
  })
})

describe('PropertyRow — caveat 1 (tokenChip slot)', () => {
  it('renders chip slot when tokenChip is set', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        tokenChip={<span data-testid="my-chip">[Use --text-sm-font-size]</span>}
      />,
    )
    expect(getByTestId('property-row-font-size-chip-slot')).toBeTruthy()
    expect(getByTestId('my-chip')).toBeTruthy()
  })

  it('does NOT render chip slot when tokenChip is undefined', () => {
    const { queryByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-font-size-chip-slot')).toBeNull()
  })
})

describe('PropertyRow — caveat 2 (inheritedFrom slot)', () => {
  it('renders "(inherited from <selector>)" suffix when set', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="color"
        valuesByBp={makeValues(1440, 'rgb(0,0,0)')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        inheritedFrom="div.parent"
      />,
    )
    const inherited = getByTestId('property-row-color-inherited')
    expect(inherited.textContent).toContain('(inherited from div.parent)')
  })

  it('does NOT render inherited label when undefined', () => {
    const { queryByTestId } = render(
      <PropertyRow
        label="color"
        valuesByBp={makeValues(1440, 'rgb(0,0,0)')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-color-inherited')).toBeNull()
  })
})

describe('PropertyRow — BP labels', () => {
  it('renders M/T/D short labels for BPs 375/768/1440', () => {
    const { container } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    const cells = container.querySelectorAll('[data-cell-bp]')
    expect(cells).toHaveLength(3)
    const labels = Array.from(cells).map((c) =>
      c.querySelector('[aria-label^="Breakpoint"]')?.textContent,
    )
    expect(labels).toEqual(['M', 'T', 'D'])
  })
})

describe('PropertyRow — snapshot', () => {
  it('matches snapshot — active=375 typical row', () => {
    const { container } = render(
      <PropertyRow
        label="padding-left"
        valuesByBp={makeValues(375, '8px')}
        activeBp={375}
        onBpSwitch={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })
})
