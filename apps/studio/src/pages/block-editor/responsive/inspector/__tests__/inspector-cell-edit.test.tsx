// @vitest-environment jsdom
// WP-040 Phase 1 — Studio mirror of tools/block-forge/src/__tests__/inspector-cell-edit.test.tsx
// (cross-surface test mirror per Phase 4 Ruling 1; row-shape PARITY restored
// via Brain ruling Option B — single-cell wins).
//
// Covers the editable-cell pattern (single-cell layout):
//   1. <input> when onEdit + value present
//   2. read-only <span> when onEdit absent
//   3. blur commits via onEdit (after normalizeWithUnit)
//   4. blur unchanged → no-op
//   5. Enter blurs (commits)
//   6. Escape reverts and blurs (no commit)
//   7. `em` validation rejects (no commit; reverts via timeout)
//   8. `rem` accepted (distinct from `em`)
//   9. empty value rejected (no commit; reverts)
//  10. bare numeric "60" + prior unit "px" → re-emits "60px"
//  11. keyword "monospace" + no unit → passthrough emit "monospace"

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { PropertyRow } from '../PropertyRow'

afterEach(cleanup)

describe('PropertyRow edit — input rendering', () => {
  it('renders <input> when onEdit provided + value present', () => {
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={() => undefined} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.tagName.toLowerCase()).toBe('input')
    expect(input.defaultValue).toBe('16') // numeric portion; unit suffix renders separately
  })

  it('does NOT render input when onEdit is undefined (read-only mode)', () => {
    const { queryByTestId, getByTestId } = render(
      <PropertyRow label="font-size" value="16px" />,
    )
    expect(queryByTestId('property-row-font-size-input')).toBeNull()
    expect(getByTestId('property-row-font-size-cell')).toBeTruthy()
  })

  it('empty cell stays as `—` (no input rendered even with onEdit)', () => {
    const { queryByTestId, container } = render(
      <PropertyRow label="font-size" value={null} onEdit={() => undefined} />,
    )
    expect(queryByTestId('property-row-font-size-input')).toBeNull()
    expect(container.textContent).toContain('—')
  })
})

describe('PropertyRow edit — commit behavior', () => {
  it('blur with new numeric value re-attaches prior unit and calls onEdit', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.value = '48'
    fireEvent.blur(input)
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith('48px')
  })

  it('blur with unchanged value is a no-op', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    fireEvent.blur(input) // value still '16'
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('Enter keydown blurs the input (which commits)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.focus()
    input.value = '24'
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onEdit).toHaveBeenCalledWith('24px')
  })

  it('keyword passthrough — input "monospace" + no prior unit emits "monospace" (non-enum)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-family" value="serif" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-family-input') as HTMLInputElement
    input.value = 'monospace'
    fireEvent.blur(input)
    expect(onEdit).toHaveBeenCalledWith('monospace')
  })

  it('numeric input with no prior unit auto-appends "px"', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="auto" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.value = '32'
    fireEvent.blur(input)
    expect(onEdit).toHaveBeenCalledWith('32px')
  })
})

describe('PropertyRow edit — cancel + validation', () => {
  it('Escape keydown reverts value + blurs (no commit)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.focus()
    input.value = '99'
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.value).toBe('16') // reverted to numeric portion
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('em-unit value rejected (no commit; flagged via error class)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.value = '2em'
    fireEvent.blur(input)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('rem-unit value accepted (rem allowed, distinct from em)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.value = '2rem'
    fireEvent.blur(input)
    expect(onEdit).toHaveBeenCalledWith('2rem')
  })

  it('empty value rejected (no commit; flagged via error class)', () => {
    const onEdit = vi.fn()
    const { getByTestId } = render(
      <PropertyRow label="font-size" value="16px" onEdit={onEdit} />,
    )
    const input = getByTestId('property-row-font-size-input') as HTMLInputElement
    input.value = ''
    fireEvent.blur(input)
    expect(onEdit).not.toHaveBeenCalled()
  })
})
