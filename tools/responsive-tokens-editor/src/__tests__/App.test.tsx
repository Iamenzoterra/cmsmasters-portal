// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { App } from '../App'

describe('App — Phase 3 orchestrator', () => {
  it('mounts and renders header h1 "Responsive Tokens — Global Scale"', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Responsive Tokens — Global Scale'
    )
  })

  it('LoadStatusBadge resolves to "Using defaults" after loadConfig() stub returns null', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText(/using defaults/i)).toBeInTheDocument()
    })
  })

  it('WcagBanner null-renders on V1 conservative defaults (no violations)', async () => {
    render(<App />)
    // Defaults pass WCAG → banner absent. waitFor settles the load-status microtask.
    await waitFor(() => {
      expect(screen.getByText(/using defaults/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders Phase 5 placeholder ribbon in footer (signposts Phase 6 work)', () => {
    render(<App />)
    // Anchor on the unique footer copy — `/Phase 5/i` alone matches both the
    // footer and GlobalScaleConfig's "(Phase 5+)" advanced-multipliers label.
    expect(
      screen.getByText(/Save flow \+ cross-surface PARITY in Phase 6/i)
    ).toBeInTheDocument()
  })
})
