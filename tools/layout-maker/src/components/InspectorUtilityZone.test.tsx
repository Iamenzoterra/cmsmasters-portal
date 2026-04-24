/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InspectorUtilityZone } from './InspectorUtilityZone'
import type { TokenMap } from '../lib/types'

// Phase 6 contract — locks the collapsed-by-default behavior (Brain #5).
// Three assertions: hidden by default, toggles on click, toggles back.
// We assert on the `.lm-utility-zone__body` wrapper rather than poking
// into SlotReference/TokenReference internals, so this stays a tight
// container-contract test regardless of reference-utility churn.

import '../styles/maker.css'

const tokens: TokenMap = {
  all: {},
  spacing: {},
  categories: [
    { name: 'test', tokens: [{ name: '--lm-x', value: '0 0% 0%' }] },
  ],
}

describe('InspectorUtilityZone (Phase 6)', () => {
  afterEach(() => cleanup())

  it('is collapsed by default — body not rendered', () => {
    const { container, getByText } = render(
      <InspectorUtilityZone tokens={tokens} onCopied={vi.fn()} />,
    )
    // Header is always present …
    expect(getByText(/references/i)).toBeTruthy()
    // … but body wrapper is not.
    expect(container.querySelector('.lm-utility-zone__body')).toBeNull()
  })

  it('renders body (and inner references) after header click', () => {
    const { container, getByRole } = render(
      <InspectorUtilityZone tokens={tokens} onCopied={vi.fn()} />,
    )
    fireEvent.click(getByRole('button', { name: /references/i }))
    expect(container.querySelector('.lm-utility-zone__body')).not.toBeNull()
    // Sanity: SlotReference actually mounted (it owns `.lm-slot-ref`).
    expect(container.querySelector('.lm-slot-ref')).not.toBeNull()
  })

  it('collapses again after a second header click', () => {
    const { container, getByRole } = render(
      <InspectorUtilityZone tokens={tokens} onCopied={vi.fn()} />,
    )
    const header = getByRole('button', { name: /references/i })
    fireEvent.click(header)
    expect(container.querySelector('.lm-utility-zone__body')).not.toBeNull()
    fireEvent.click(header)
    expect(container.querySelector('.lm-utility-zone__body')).toBeNull()
  })
})
