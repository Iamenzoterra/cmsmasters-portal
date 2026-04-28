// @vitest-environment jsdom
// WP-033 post-close polish — single-cell PropertyRow tests.
//
// Covers the single-cell layout (replaced multi-BP M/T/D grid):
// - Label rendering + data-testid default.
// - value display: present → renders cell text; null → em-dash.
// - Editable mode (onEdit provided + value present) → renders <input>.
// - Read-only mode (onEdit absent) → renders <span data-testid=...-cell>.
// - Revert button (onRevert provided) → renders ↺ button.
// - tokenChip slot, inheritedFrom slot.
// - Unit handling: parseValueUnit splits numeric+unit; bare numeric input
//   re-emits with prior unit (or 'px' default); keyword passes through.
// - Snapshot pins the typical-row shape.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { PropertyRow } from '../components/PropertyRow'

afterEach(cleanup)

describe('PropertyRow — label rendering', () => {
  it('renders the property label', () => {
    const { getByText } = render(<PropertyRow label="font-size" value="16px" />)
    expect(getByText('font-size')).toBeTruthy()
  })

  it('uses label as default data-testid', () => {
    const { getByTestId } = render(<PropertyRow label="font-size" value="16px" />)
    expect(getByTestId('property-row-font-size')).toBeTruthy()
  })

  it('honors explicit data-testid override', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" data-testid="custom-id" />,
    )
    expect(getByTestId('custom-id')).toBeTruthy()
  })
})

describe('PropertyRow — value display', () => {
  it('renders the value in the read-only cell when onEdit is absent', () => {
    const { getByTestId } = render(<PropertyRow label="display" value="flex" />)
    expect(getByTestId('property-row-display-cell').textContent).toBe('flex')
  })

  it('renders em-dash when value is null', () => {
    const { container } = render(<PropertyRow label="font-size" value={null} />)
    expect(container.textContent).toContain('—')
  })

  it('marks empty cell with data-empty="true"', () => {
    const { container } = render(<PropertyRow label="font-size" value={null} />)
    const cellWrap = container.querySelector('[data-active="true"]')
    expect(cellWrap?.getAttribute('data-empty')).toBe('true')
  })

  it('marks populated cell with data-empty="false"', () => {
    const { container } = render(<PropertyRow label="font-size" value="16px" />)
    const cellWrap = container.querySelector('[data-active="true"]')
    expect(cellWrap?.getAttribute('data-empty')).toBe('false')
  })
})

describe('PropertyRow — editable mode', () => {
  it('renders an <input> when onEdit is provided + value present', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input.defaultValue).toBe('16') // numeric portion only; unit shown as suffix
  })

  it('renders unit as static suffix next to input', () => {
    const { container } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    expect(container.textContent).toContain('px')
  })

  it('does NOT render input when onEdit is undefined (read-only)', () => {
    const { queryByTestId, getByTestId } = render(
      <PropertyRow label="font-size" value="16px" />,
    )
    expect(queryByTestId('property-row-font-size-input')).toBeNull()
    expect(getByTestId('property-row-font-size-cell')).toBeTruthy()
  })

  it('marks editable cell with data-editable="true"', () => {
    const { container } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    const cellWrap = container.querySelector('[data-active="true"]')
    expect(cellWrap?.getAttribute('data-editable')).toBe('true')
  })

  it('marks read-only cell with data-editable="false"', () => {
    const { container } = render(<PropertyRow label="font-size" value="16px" />)
    const cellWrap = container.querySelector('[data-active="true"]')
    expect(cellWrap?.getAttribute('data-editable')).toBe('false')
  })
})

describe('PropertyRow — revert button', () => {
  it('renders ↺ revert button when onRevert is provided', () => {
    const onRevert = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} onRevert={onRevert} />,
    )
    const btn = getByTestId('property-row-font-size-revert')
    expect(btn).toBeTruthy()
    expect(btn.textContent).toBe('↺')
  })

  it('does NOT render revert button when onRevert is undefined', () => {
    const { queryByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    expect(queryByTestId('property-row-font-size-revert')).toBeNull()
  })

  it('clicking ↺ revert button calls onRevert', () => {
    const onRevert = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} onRevert={onRevert} />,
    )
    fireEvent.click(getByTestId('property-row-font-size-revert'))
    expect(onRevert).toHaveBeenCalledTimes(1)
  })

  it('revert button has accessible aria-label', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} onRevert={() => undefined} />,
    )
    const btn = getByTestId('property-row-font-size-revert')
    expect(btn.getAttribute('aria-label')).toContain('Revert font-size')
  })
})

describe('PropertyRow — tokenChip slot', () => {
  it('renders chip slot when tokenChip is set', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        value="16px"
        tokenChip={<span data-testid="my-chip">[Use --text-sm-font-size]</span>}
      />,
    )
    expect(getByTestId('property-row-font-size-chip-slot')).toBeTruthy()
    expect(getByTestId('my-chip')).toBeTruthy()
  })

  it('does NOT render chip slot when tokenChip is undefined', () => {
    const { queryByTestId } = render(<PropertyRow label="font-size" value="16px" />)
    expect(queryByTestId('property-row-font-size-chip-slot')).toBeNull()
  })
})

describe('PropertyRow — inheritedFrom slot', () => {
  it('renders "(inherited from <selector>)" suffix when set', () => {
    const { getByTestId } = render(
      <PropertyRow label="color" value="rgb(0,0,0)" inheritedFrom="div.parent" />,
    )
    const inherited = getByTestId('property-row-color-inherited')
    expect(inherited.textContent).toContain('(inherited from div.parent)')
  })

  it('does NOT render inherited label when undefined', () => {
    const { queryByTestId } = render(<PropertyRow label="color" value="rgb(0,0,0)" />)
    expect(queryByTestId('property-row-color-inherited')).toBeNull()
  })
})

describe('PropertyRow — unit handling', () => {
  it('value "48px" splits into numeric "48" + unit "px"', () => {
    const { getByTestId, container } = render(
      <PropertyRow label="font-size" value="48px" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    expect(input.defaultValue).toBe('48')
    expect(container.textContent).toContain('px')
  })

  it('value "1.5rem" splits into numeric "1.5" + unit "rem"', () => {
    const { getByTestId, container } = render(
      <PropertyRow label="font-size" value="1.5rem" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    expect(input.defaultValue).toBe('1.5')
    expect(container.textContent).toContain('rem')
  })

  it('keyword "serif" passes through with no unit suffix (non-enum property)', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-family" value="serif" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-family-input') as HTMLInputElement
    expect(input.defaultValue).toBe('serif')
  })

  it('var(--token) passes through unchanged', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="var(--text-sm-font-size)" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    expect(input.defaultValue).toBe('var(--text-sm-font-size)')
  })
})

describe('PropertyRow — typed enum inputs (WP-037 Phase 1)', () => {
  it('renders <select> instead of <input> for enum property when editable', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow label="display" value="block" onEdit={() => undefined} />,
    )
    expect(getByTestId('property-row-display-select')).toBeTruthy()
    expect(queryByTestId('property-row-display-input')).toBeNull()
  })

  it('lists all PROPERTY_META.options as <option> entries', () => {
    const { getByTestId } = render(
      <PropertyRow label="flex-direction" value="row" onEdit={() => undefined} />,
    )
    const select = getByTestId('property-row-flex-direction-select') as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    // flex-direction options per PROPERTY_META
    expect(optionValues).toEqual(['row', 'row-reverse', 'column', 'column-reverse'])
  })

  it('selecting an option fires onEdit with the option value', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="align-items" value="stretch" onEdit={onEdit} />,
    )
    const select = getByTestId('property-row-align-items-select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'center' } })
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith('center')
  })

  it('custom value (not in PROPERTY_META.options) renders as disabled "(custom)" option', () => {
    const { getByTestId } = render(
      <PropertyRow label="display" value="table-cell" onEdit={() => undefined} />,
    )
    const select = getByTestId('property-row-display-select') as HTMLSelectElement
    const customOption = Array.from(select.options).find((o) => o.value === 'table-cell')
    expect(customOption).toBeTruthy()
    expect(customOption?.disabled).toBe(true)
    expect(customOption?.textContent).toContain('table-cell (custom)')
  })

  it('custom value is selected as current select value', () => {
    const { getByTestId } = render(
      <PropertyRow label="display" value="table-cell" onEdit={() => undefined} />,
    )
    const select = getByTestId('property-row-display-select') as HTMLSelectElement
    expect(select.value).toBe('table-cell')
  })

  it('enum property in read-only mode (no onEdit) still renders <span>, not <select>', () => {
    const { getByTestId, queryByTestId } = render(<PropertyRow label="display" value="flex" />)
    expect(getByTestId('property-row-display-cell').textContent).toBe('flex')
    expect(queryByTestId('property-row-display-select')).toBeNull()
  })

  it('selecting same value as current is a no-op (no onEdit call)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="justify-content" value="center" onEdit={onEdit} />,
    )
    const select = getByTestId('property-row-justify-content-select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'center' } })
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('non-enum property with onEdit still renders <input> (numeric property)', () => {
    const { getByTestId, queryByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    expect(getByTestId('property-row-font-size-input')).toBeTruthy()
    expect(queryByTestId('property-row-font-size-select')).toBeNull()
  })

  it('explicit meta prop overrides PROPERTY_META lookup', () => {
    const customMeta = {
      kind: 'enum' as const,
      tooltip: 'Custom',
      options: ['x', 'y', 'z'] as const,
    }
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="x" onEdit={() => undefined} meta={customMeta} />,
    )
    const select = getByTestId('property-row-font-size-select') as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toEqual(['x', 'y', 'z'])
  })
})

describe('PropertyRow — snapshot', () => {
  it('matches snapshot — read-only cell with value', () => {
    const { container } = render(<PropertyRow label="padding-left" value="8px" />)
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot — editable cell with revert button', () => {
    const { container } = render(
      <PropertyRow
        label="font-size"
        value="16px"
        onEdit={() => undefined}
        onRevert={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot — empty cell renders em-dash', () => {
    const { container } = render(<PropertyRow label="font-size" value={null} />)
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot — enum property renders select with options', () => {
    const { container } = render(
      <PropertyRow label="display" value="flex" onEdit={() => undefined} />,
    )
    expect(container).toMatchSnapshot()
  })

  it('matches snapshot — enum with custom (legacy) value', () => {
    const { container } = render(
      <PropertyRow label="display" value="table-cell" onEdit={() => undefined} />,
    )
    expect(container).toMatchSnapshot()
  })
})
