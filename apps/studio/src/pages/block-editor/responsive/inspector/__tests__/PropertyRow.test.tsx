// @vitest-environment jsdom
// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/__tests__/PropertyRow.test.tsx
// (cross-surface test mirror per Phase 4 Ruling 1).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { PropertyRow } from '../PropertyRow'

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

  it('shows em-dash on inactive cells (active-only sourcing)', () => {
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

describe('PropertyRow — ↗ view icon', () => {
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

describe('PropertyRow — tokenChip slot', () => {
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

describe('PropertyRow — inheritedFrom slot', () => {
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

describe('PropertyRow — typed enum inputs (WP-037 Phase 1)', () => {
  it('renders <select> instead of <input> on the active cell for enum property', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow
        label="display"
        valuesByBp={makeValues(1440, 'block')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    expect(getByTestId('property-row-display-select-1440')).toBeTruthy()
    expect(queryByTestId('property-row-display-input-1440')).toBeNull()
  })

  it('inactive cells stay as text spans even for enum property', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow
        label="display"
        valuesByBp={{ 375: null, 768: null, 1440: 'block' }}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-display-select-768')).toBeNull()
    expect(queryByTestId('property-row-display-select-375')).toBeNull()
    // Inactive cells render as text spans / em-dash
    expect(getByTestId('property-row-display-cell-768').textContent).toContain('—')
    expect(getByTestId('property-row-display-cell-375').textContent).toContain('—')
  })

  it('lists all PROPERTY_META.options as <option> entries', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="flex-direction"
        valuesByBp={makeValues(1440, 'row')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    const select = getByTestId('property-row-flex-direction-select-1440') as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toEqual(['row', 'row-reverse', 'column', 'column-reverse'])
  })

  it('selecting an option fires onCellEdit(activeBp, value)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="align-items"
        valuesByBp={makeValues(768, 'stretch')}
        activeBp={768}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const select = getByTestId('property-row-align-items-select-768') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'center' } })
    expect(onCellEdit).toHaveBeenCalledTimes(1)
    expect(onCellEdit).toHaveBeenCalledWith(768, 'center')
  })

  it('custom value (not in PROPERTY_META.options) renders as disabled "(custom)" option', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="display"
        valuesByBp={makeValues(1440, 'table-cell')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    const select = getByTestId('property-row-display-select-1440') as HTMLSelectElement
    const customOption = Array.from(select.options).find((o) => o.value === 'table-cell')
    expect(customOption).toBeTruthy()
    expect(customOption?.disabled).toBe(true)
    expect(customOption?.textContent).toContain('table-cell (custom)')
    expect(select.value).toBe('table-cell')
  })

  it('enum property in read-only mode (no onCellEdit) still renders text span', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow
        label="display"
        valuesByBp={makeValues(1440, 'flex')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(getByTestId('property-row-display-cell-1440').textContent).toContain('flex')
    expect(queryByTestId('property-row-display-select-1440')).toBeNull()
  })

  it('selecting same value as current is a no-op (no onCellEdit call)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="justify-content"
        valuesByBp={makeValues(1440, 'center')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const select = getByTestId('property-row-justify-content-select-1440') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'center' } })
    expect(onCellEdit).not.toHaveBeenCalled()
  })

  it('non-enum property with onCellEdit still renders <input> (numeric property)', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    expect(getByTestId('property-row-font-size-input-1440')).toBeTruthy()
    expect(queryByTestId('property-row-font-size-select-1440')).toBeNull()
  })

  it('explicit meta prop overrides PROPERTY_META lookup', () => {
    const customMeta = {
      kind: 'enum' as const,
      tooltip: 'Custom',
      options: ['x', 'y', 'z'] as const,
    }
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, 'x')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
        meta={customMeta}
      />,
    )
    const select = getByTestId('property-row-font-size-select-1440') as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toEqual(['x', 'y', 'z'])
  })
})
