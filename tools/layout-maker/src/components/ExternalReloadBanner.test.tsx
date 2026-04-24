/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExternalReloadBanner } from './ExternalReloadBanner'

// Phase 6 contract — locks the banner shape (Brain #3/#4). Three assertions
// guard against accidental toast-regression or dismiss wiring drift.

import '../styles/maker.css'

describe('ExternalReloadBanner (Phase 6)', () => {
  afterEach(() => cleanup())

  it('renders nothing when visible=false', () => {
    const { container } = render(
      <ExternalReloadBanner visible={false} onDismiss={vi.fn()} />,
    )
    expect(container.querySelector('.lm-banner')).toBeNull()
  })

  it('renders canonical text and .lm-banner--info when visible=true', () => {
    const { getByText, container } = render(
      <ExternalReloadBanner visible={true} onDismiss={vi.fn()} />,
    )
    expect(getByText('Layout updated externally.')).toBeTruthy()
    const banner = container.querySelector('.lm-banner')
    expect(banner).not.toBeNull()
    expect(banner?.classList.contains('lm-banner--info')).toBe(true)
  })

  it('fires onDismiss exactly once when the close button is clicked', () => {
    const onDismiss = vi.fn()
    const { getByRole } = render(
      <ExternalReloadBanner visible={true} onDismiss={onDismiss} />,
    )
    fireEvent.click(getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
