// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WcagBanner } from '../components/WcagBanner'

describe('WcagBanner', () => {
  it('null-renders when violations is empty array', () => {
    const { container } = render(<WcagBanner violations={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders "WCAG 1.4.4 violations · 1" headline + violator entry for single-violation array', () => {
    render(
      <WcagBanner
        violations={[
          {
            token: '--h1-font-size',
            minPx: 16,
            maxPx: 60,
            reason: 'WCAG 1.4.4 violation; ratio > 2.5×',
          },
        ]}
      />
    )
    expect(screen.getByText(/WCAG 1\.4\.4 violations · 1/)).toBeInTheDocument()
    expect(screen.getByText('--h1-font-size')).toBeInTheDocument()
  })

  it('alert role + aria-live="polite" present', () => {
    render(
      <WcagBanner
        violations={[
          {
            token: '--h1-font-size',
            minPx: 16,
            maxPx: 60,
            reason: 'ratio > 2.5×',
          },
        ]}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
  })
})
