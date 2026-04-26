// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ContainerWidthsEditor } from '../components/ContainerWidthsEditor'
import { conservativeDefaults } from '../lib/defaults'

describe('ContainerWidthsEditor', () => {
  it('renders 3 BP rows (Mobile / Tablet / Desktop) labeled correctly', () => {
    render(
      <ContainerWidthsEditor
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    // Each label cell includes the BP name + bracketed range. Use partial match.
    expect(screen.getByText(/^Mobile/)).toBeInTheDocument()
    expect(screen.getByText(/^Tablet/)).toBeInTheDocument()
    expect(screen.getByText(/^Desktop/)).toBeInTheDocument()
  })

  it('mobile full-bleed checkbox is CHECKED on V1 baseline (defaults.containers.mobile.maxWidth === "100%")', () => {
    render(
      <ContainerWidthsEditor
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    const cb = screen.getByRole('checkbox') as HTMLInputElement
    expect(cb.checked).toBe(true)
  })

  it('mobile px = 16; tablet maxWidth = 720 / px = 24; desktop maxWidth = 1280 / px = 32 (V1 defaults)', () => {
    render(
      <ContainerWidthsEditor
        config={conservativeDefaults}
        onChange={() => {}}
      />
    )
    const mobilePx = screen.getByLabelText('Mobile padding (px)') as HTMLInputElement
    const tabletMaxW = screen.getByLabelText('Tablet max width (px)') as HTMLInputElement
    const tabletPx = screen.getByLabelText('Tablet padding (px)') as HTMLInputElement
    const desktopMaxW = screen.getByLabelText('Desktop max width (px)') as HTMLInputElement
    const desktopPx = screen.getByLabelText('Desktop padding (px)') as HTMLInputElement
    expect(mobilePx.value).toBe('16')
    expect(tabletMaxW.value).toBe('720')
    expect(tabletPx.value).toBe('24')
    expect(desktopMaxW.value).toBe('1280')
    expect(desktopPx.value).toBe('32')
  })

  it('editing tablet maxWidth 720 → 800 calls onChange with merged config; other BPs unchanged', () => {
    const onChange = vi.fn()
    render(
      <ContainerWidthsEditor
        config={conservativeDefaults}
        onChange={onChange}
      />
    )
    const tabletMaxW = screen.getByLabelText('Tablet max width (px)')
    fireEvent.change(tabletMaxW, { target: { value: '800' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0]
    expect(next.containers.tablet.maxWidth).toBe(800)
    expect(next.containers.tablet.px).toBe(24) // unchanged
    expect(next.containers.mobile).toEqual(conservativeDefaults.containers.mobile)
    expect(next.containers.desktop).toEqual(conservativeDefaults.containers.desktop)
  })

  it('toggling mobile full-bleed OFF reveals number input; entering 400 calls onChange with maxWidth === 400', () => {
    // Pass 1: toggle OFF — onChange fires with maxWidth: 375 (initial fallback per task spec)
    const onChange = vi.fn()
    const { rerender } = render(
      <ContainerWidthsEditor
        config={conservativeDefaults}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledTimes(1)
    const afterToggle = onChange.mock.calls[0][0]
    expect(afterToggle.containers.mobile.maxWidth).toBe(375)

    // Pass 2: with toggled-off config, the number input should now be visible —
    // entering 400 calls onChange with maxWidth: 400.
    rerender(
      <ContainerWidthsEditor
        config={afterToggle}
        onChange={onChange}
      />
    )
    const mobileMaxW = screen.getByLabelText('Mobile max width (px)')
    fireEvent.change(mobileMaxW, { target: { value: '400' } })
    expect(onChange).toHaveBeenCalledTimes(2)
    const afterEdit = onChange.mock.calls[1][0]
    expect(afterEdit.containers.mobile.maxWidth).toBe(400)
  })

  it('toggling mobile full-bleed BACK ON sets maxWidth === "100%"', () => {
    const onChange = vi.fn()
    // Start from a config where mobile is currently a number (full-bleed off).
    const cfgNum = {
      ...conservativeDefaults,
      containers: {
        ...conservativeDefaults.containers,
        mobile: { maxWidth: 400, px: 16 },
      },
    }
    render(<ContainerWidthsEditor config={cfgNum} onChange={onChange} />)
    const cb = screen.getByRole('checkbox') as HTMLInputElement
    expect(cb.checked).toBe(false)
    fireEvent.click(cb)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].containers.mobile.maxWidth).toBe('100%')
  })
})
