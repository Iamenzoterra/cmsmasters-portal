// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TokenOverrideEditor } from '../components/TokenOverrideEditor'
import { conservativeDefaults } from '../lib/defaults'
import { generateTokensCss } from '../lib/generator'
import type { GeneratedToken } from '../types'

const findToken = (name: string): GeneratedToken => {
  const result = generateTokensCss(conservativeDefaults)
  const t = result.tokens.find((tok) => tok.name === name)
  if (!t) throw new Error(`token ${name} not in V1 baseline output`)
  return t
}

describe('TokenOverrideEditor', () => {
  it('initial render reflects current override values for --h1-font-size (44 / 54)', () => {
    const token = findToken('--h1-font-size')
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={() => {}}
        onClose={() => {}}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(2)
    expect((inputs[0] as HTMLInputElement).value).toBe('44')
    expect((inputs[1] as HTMLInputElement).value).toBe('54')
  })

  it('editing minPx + clicking Apply → onChange called with merged config; onClose called', () => {
    const token = findToken('--h1-font-size')
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={onChange}
        onClose={onClose}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect(next.overrides['--h1-font-size'].minPx).toBe(40)
    expect(next.overrides['--h1-font-size'].maxPx).toBe(54)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('clicking "Use scale" on --h1-font-size removes the override key (PF.17 destructure-omit)', () => {
    const token = findToken('--h1-font-size')
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={onChange}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Use scale' }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect('--h1-font-size' in next.overrides).toBe(false)
    // Other entries preserved (e.g., --h2-font-size still there)
    expect('--h2-font-size' in next.overrides).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('"Use scale" disabled for --space-section (source=special — PF.16)', () => {
    const token = findToken('--space-section')
    expect(token.source).toBe('special')
    const onChange = vi.fn()
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={onChange}
        onClose={() => {}}
      />
    )
    const useScaleBtn = screen.getByRole('button', { name: 'Use scale' })
    expect(useScaleBtn).toBeDisabled()
    expect(useScaleBtn).toHaveAttribute('title', 'No scale fallback for this token')
    fireEvent.click(useScaleBtn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('setting maxPx > 2.5 × minPx → inline WCAG warning (role=alert) renders', () => {
    const token = findToken('--h1-font-size')
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={() => {}}
        onClose={() => {}}
      />
    )
    const inputs = screen.getAllByRole('spinbutton')
    // min=10, max=30 → ratio 3.0 → fail WCAG
    fireEvent.change(inputs[0], { target: { value: '10' } })
    fireEvent.change(inputs[1], { target: { value: '30' } })
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/WCAG 1\.4\.4 violation/)
    expect(alert).toHaveTextContent(/max \(30\) > 2\.5× min \(10\)/)
  })

  it('reason field — empty → omitted from override; populated → trimmed and included', () => {
    const token = findToken('--h1-font-size')

    // Case A: empty reason → omitted
    const onChangeA = vi.fn()
    const { unmount } = render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={onChangeA}
        onClose={() => {}}
      />
    )
    const reasonInputA = screen.getByRole('textbox')
    fireEvent.change(reasonInputA, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const overrideA = onChangeA.mock.calls[0][0].overrides['--h1-font-size']
    expect('reason' in overrideA).toBe(false)
    unmount()

    // Case B: populated reason → trimmed
    const onChangeB = vi.fn()
    render(
      <TokenOverrideEditor
        token={token}
        config={conservativeDefaults}
        onChange={onChangeB}
        onClose={() => {}}
      />
    )
    const reasonInputB = screen.getByRole('textbox')
    fireEvent.change(reasonInputB, { target: { value: '  tweaked at design crit  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    const overrideB = onChangeB.mock.calls[0][0].overrides['--h1-font-size']
    expect(overrideB.reason).toBe('tweaked at design crit')
  })
})
