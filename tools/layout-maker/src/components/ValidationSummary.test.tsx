/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ValidationSummary } from './ValidationSummary'
import type { ValidationItem } from '../lib/validation'

// Also imports chrome CSS so the jsdom computed-style assertion below
// can see the ValidationSummary rules. This closes the P0→P1 css:true
// carry-forward (feedback_vitest_css_raw).
import '../styles/maker.css'

const errorItem: ValidationItem = {
  id: 'err-1',
  severity: 'error',
  message: 'Broken thing',
  slotName: 'sidebar-left',
}

const warningItem: ValidationItem = {
  id: 'warn-1',
  severity: 'warning',
  message: 'Sketchy thing',
  gridKey: 'tablet',
  breakpointId: 'tablet',
}

describe('ValidationSummary (P3 Task 3.5)', () => {
  afterEach(() => cleanup())

  it('shows "No issues" when clean', () => {
    const { getByText } = render(
      <ValidationSummary errors={[]} warnings={[]} onFocusItem={vi.fn()} />,
    )
    expect(getByText('No issues')).toBeTruthy()
  })

  it('summarizes warnings-only state', () => {
    const { getByText, container } = render(
      <ValidationSummary errors={[]} warnings={[warningItem]} onFocusItem={vi.fn()} />,
    )
    expect(getByText('Warnings: 1')).toBeTruthy()
    expect(
      container.querySelector('.lm-validation-summary--warning'),
    ).not.toBeNull()
  })

  it('summarizes errors-only state and the root carries the error class', () => {
    const { getByText, container } = render(
      <ValidationSummary errors={[errorItem]} warnings={[]} onFocusItem={vi.fn()} />,
    )
    expect(getByText('Errors: 1')).toBeTruthy()
    expect(
      container.querySelector('.lm-validation-summary--error'),
    ).not.toBeNull()
  })

  it('dispatches onFocusItem when an expanded list item is clicked', () => {
    const onFocusItem = vi.fn()
    const { getByText, container } = render(
      <ValidationSummary
        errors={[errorItem]}
        warnings={[warningItem]}
        onFocusItem={onFocusItem}
      />,
    )
    // Expand.
    fireEvent.click(container.querySelector('.lm-validation-summary__header')!)
    fireEvent.click(getByText('Broken thing'))
    expect(onFocusItem).toHaveBeenCalledTimes(1)
    expect(onFocusItem).toHaveBeenCalledWith(errorItem)
  })

  // P0→P1 carry-forward: chrome CSS must reach jsdom via Vitest's
  // `css: true` + the explicit import at the top of this file.
  // Without both, the rule below is absent from computed styles and the
  // assertion silently passes against an empty string — which was the
  // trap P1 left unresolved. Breaking css: true or the import turns
  // this assertion red.
  it('chrome CSS rules apply in jsdom (closes P0→P1 css:true carry-forward)', () => {
    const { container } = render(
      <ValidationSummary errors={[errorItem]} warnings={[]} onFocusItem={vi.fn()} />,
    )
    const badge = container.querySelector('.lm-validation-badge--error')!
    const bg = getComputedStyle(badge).backgroundColor
    expect(bg).not.toBe('')
    expect(bg).not.toBe('transparent')
  })
})
