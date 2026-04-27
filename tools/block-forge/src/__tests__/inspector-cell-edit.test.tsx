// @vitest-environment jsdom
// WP-033 Phase 3 §3.1 — PropertyRow active-cell edit.
//
// Covers the active-cell-becomes-editable-input pattern:
//   1. <input> when onCellEdit + active + !empty
//   2. <span> for inactive cells (no edit at wrong BP)
//   3. blur commits via onCellEdit
//   4. Enter blurs (commits)
//   5. Escape reverts and blurs (no commit)
//   6. `em` validation rejects (no commit; reverts)

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

describe('PropertyRow §3.1 — active cell input rendering', () => {
  it('renders <input> on active cell when onCellEdit provided + value present', () => {
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input.defaultValue).toBe('16px')
  })

  it('does NOT render input when onCellEdit is undefined (read-only mode)', () => {
    const { queryByTestId, getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-font-size-input-1440')).toBeNull()
    expect(getByTestId('property-row-font-size-cell-1440')).toBeTruthy()
  })

  it('inactive cells stay non-editable even when onCellEdit provided', () => {
    const { queryByTestId, getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={{ 375: '12px', 768: null, 1440: null }}
        activeBp={375}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    expect(getByTestId('property-row-font-size-input-375')).toBeTruthy()
    expect(queryByTestId('property-row-font-size-input-768')).toBeNull()
    expect(queryByTestId('property-row-font-size-input-1440')).toBeNull()
  })

  it('empty active cell stays as `—` (no input rendered)', () => {
    const { queryByTestId, getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={{ 375: null, 768: null, 1440: null }}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={() => undefined}
      />,
    )
    expect(queryByTestId('property-row-font-size-input-1440')).toBeNull()
    expect(getByTestId('property-row-font-size-cell-1440').textContent).toContain('—')
  })
})

describe('PropertyRow §3.1 — commit behavior', () => {
  it('blur with new value calls onCellEdit(activeBp, trimmedValue)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.value = '  48px  '
    fireEvent.blur(input)
    expect(onCellEdit).toHaveBeenCalledTimes(1)
    expect(onCellEdit).toHaveBeenCalledWith(1440, '48px')
  })

  it('blur with unchanged value is a no-op (no onCellEdit call)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    fireEvent.blur(input) // value still '16px'
    expect(onCellEdit).not.toHaveBeenCalled()
  })

  it('Enter keydown blurs the input (which commits)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.focus()
    input.value = '24px'
    fireEvent.keyDown(input, { key: 'Enter' })
    // Blur fires synchronously after .blur() in jsdom, so onCellEdit lands.
    expect(onCellEdit).toHaveBeenCalledWith(1440, '24px')
  })
})

describe('PropertyRow §3.1 — cancel + validation', () => {
  it('Escape keydown reverts value + blurs (no commit)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.focus()
    input.value = '99px'
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('16px')
    expect(onCellEdit).not.toHaveBeenCalled()
  })

  it('em-unit value rejected (snaps back to previous; no commit)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.value = '2em'
    fireEvent.blur(input)
    expect(input.value).toBe('16px')
    expect(onCellEdit).not.toHaveBeenCalled()
  })

  it('rem-unit value accepted (rem allowed, distinct from em)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.value = '2rem'
    fireEvent.blur(input)
    expect(onCellEdit).toHaveBeenCalledWith(1440, '2rem')
  })

  it('empty value rejected (snaps back to previous; no commit)', () => {
    const onCellEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow
        label="font-size"
        valuesByBp={makeValues(1440, '16px')}
        activeBp={1440}
        onBpSwitch={() => undefined}
        onCellEdit={onCellEdit}
      />,
    )
    const input = getByTestId('property-row-font-size-input-1440') as HTMLInputElement
    input.value = ''
    fireEvent.blur(input)
    expect(input.value).toBe('16px')
    expect(onCellEdit).not.toHaveBeenCalled()
  })
})
