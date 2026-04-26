// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GlobalScaleConfig } from '../components/GlobalScaleConfig'
import { conservativeDefaults } from '../lib/defaults'

describe('GlobalScaleConfig — form rows + change propagation (PF.11 nested shape)', () => {
  it('renders 8 active numeric inputs (viewport×2 + type-base×2 + spacing-base×2 + ...) excluding disabled multiplier rows', () => {
    const onChange = vi.fn()
    render(<GlobalScaleConfig config={conservativeDefaults} onChange={onChange} />)
    const allInputs = screen.getAllByRole('spinbutton')
    const enabled = allInputs.filter((i) => !(i as HTMLInputElement).disabled)
    // 2 viewport + 2 type base + 2 spacing base = 6 enabled numeric inputs
    // (ratios are <select>, not spinbutton)
    expect(enabled).toHaveLength(6)
  })

  it('changing minViewport fires onChange with merged top-level config', () => {
    const onChange = vi.fn()
    render(<GlobalScaleConfig config={conservativeDefaults} onChange={onChange} />)
    const minViewportInput = screen.getByLabelText(/Min viewport/i)
    fireEvent.change(minViewportInput, { target: { value: '400' } })
    expect(onChange).toHaveBeenCalledWith({ ...conservativeDefaults, minViewport: 400 })
  })

  it('renders 2 ratio selects with 8 Utopia preset options each', () => {
    const onChange = vi.fn()
    render(<GlobalScaleConfig config={conservativeDefaults} onChange={onChange} />)
    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(2)
    for (const sel of selects) {
      expect(sel.querySelectorAll('option')).toHaveLength(8)
    }
  })

  it('spacing multipliers table renders 11 rows (3xs..5xl) with disabled inputs', () => {
    const onChange = vi.fn()
    render(<GlobalScaleConfig config={conservativeDefaults} onChange={onChange} />)
    const allInputs = screen.getAllByRole('spinbutton')
    const disabledMultipliers = allInputs.filter(
      (i) => (i as HTMLInputElement).disabled
    )
    expect(disabledMultipliers).toHaveLength(11)
  })

  it('changing Type base @ min fires onChange with merged NESTED config (config.type.baseAtMin)', () => {
    const onChange = vi.fn()
    render(<GlobalScaleConfig config={conservativeDefaults} onChange={onChange} />)
    const input = screen.getByLabelText(/Type base @ min/i)
    fireEvent.change(input, { target: { value: '17' } })
    expect(onChange).toHaveBeenCalledWith({
      ...conservativeDefaults,
      type: { ...conservativeDefaults.type, baseAtMin: 17 },
    })
  })
})
