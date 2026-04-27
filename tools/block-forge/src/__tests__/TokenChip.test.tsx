// @vitest-environment jsdom
// WP-033 Phase 3 §3.3 — TokenChip render component.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { TokenChip } from '../components/TokenChip'

afterEach(cleanup)

const VALUES = { 375: 34, 768: 37, 1440: 42 } as const

describe('TokenChip — in-use mode', () => {
  it('renders <span> (no button) with token name', () => {
    const { getByTestId } = render(
      <TokenChip mode="in-use" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    const chip = getByTestId('token-chip---h2-font-size')
    expect(chip.tagName.toLowerCase()).toBe('span')
    expect(chip.textContent).toContain('--h2-font-size')
    expect(chip.textContent).toMatch(/Using/)
  })

  it('has data-mode="in-use"', () => {
    const { getByTestId } = render(
      <TokenChip mode="in-use" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    expect(getByTestId('token-chip---h2-font-size').getAttribute('data-mode')).toBe('in-use')
  })

  it('does not invoke onApply when in-use (no clickable element)', () => {
    const onApply = vi.fn()
    const { getByTestId } = render(
      <TokenChip
        mode="in-use"
        tokenName="--h2-font-size"
        valuesByBp={VALUES}
        onApply={onApply}
      />,
    )
    fireEvent.click(getByTestId('token-chip---h2-font-size'))
    expect(onApply).not.toHaveBeenCalled()
  })
})

describe('TokenChip — available mode', () => {
  it('renders <button> with checkmark', () => {
    const { getByTestId } = render(
      <TokenChip mode="available" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    const chip = getByTestId('token-chip---h2-font-size')
    expect(chip.tagName.toLowerCase()).toBe('button')
    expect(chip.textContent).toMatch(/✓/)
    expect(chip.textContent).toContain('--h2-font-size')
  })

  it('has data-mode="available"', () => {
    const { getByTestId } = render(
      <TokenChip mode="available" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    expect(getByTestId('token-chip---h2-font-size').getAttribute('data-mode')).toBe('available')
  })

  it('click calls onApply', () => {
    const onApply = vi.fn()
    const { getByTestId } = render(
      <TokenChip
        mode="available"
        tokenName="--h2-font-size"
        valuesByBp={VALUES}
        onApply={onApply}
      />,
    )
    fireEvent.click(getByTestId('token-chip---h2-font-size'))
    expect(onApply).toHaveBeenCalledTimes(1)
  })
})

describe('TokenChip — title attr', () => {
  it('contains M/T/D triple in correct order', () => {
    const { getByTestId } = render(
      <TokenChip mode="available" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    const chip = getByTestId('token-chip---h2-font-size')
    expect(chip.getAttribute('title')).toBe('Sets 34/37/42px at M/T/D')
  })

  it('title same shape for in-use mode', () => {
    const { getByTestId } = render(
      <TokenChip mode="in-use" tokenName="--h2-font-size" valuesByBp={VALUES} />,
    )
    const chip = getByTestId('token-chip---h2-font-size')
    expect(chip.getAttribute('title')).toBe('Sets 34/37/42px at M/T/D')
  })
})

describe('TokenChip — custom data-testid', () => {
  it('honors override', () => {
    const { getByTestId } = render(
      <TokenChip
        mode="in-use"
        tokenName="--h2-font-size"
        valuesByBp={VALUES}
        data-testid="custom-chip"
      />,
    )
    expect(getByTestId('custom-chip')).toBeTruthy()
  })
})
