// WP-027 Phase 4 — SuggestionRow unit tests (updated from Phase 3 DISABLED contract).
//
// Phase 3 asserted disabled=true on both buttons. Phase 4 un-gates them and adds
// PendingPill visual state. Tests now cover:
//   - Field rendering (unchanged)
//   - Confidence label mapping (unchanged)
//   - Accept/Reject ENABLED (contract flipped from Phase 3)
//   - onAccept/onReject fire with suggestion.id on click
//   - isPending → PendingPill renders / absent → no pill
//   - bp=0 → 'base' / bp=480 → '@480px'
//   - data-suggestion-id attribute
//
// All Suggestion fields verified against packages/block-forge-core/src/lib/types.ts:41-50.

// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { SuggestionRow } from '../SuggestionRow'
import type { Suggestion } from '@cmsmasters/block-forge-core'

afterEach(cleanup) // RTL doesn't auto-cleanup in Vitest — saved memory from WP-026 Phase 3

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 'test-suggestion-1',
    heuristic: 'spacing-clamp',
    selector: '.hero',
    bp: 768,
    property: 'padding',
    value: 'clamp(1rem, 5vw, 3rem)',
    rationale: 'Test rationale for spacing-clamp.',
    confidence: 'high',
    ...overrides,
  }
}

const noop = () => {}

describe('SuggestionRow', () => {
  it('renders heuristic, selector, bp, property, value, rationale', () => {
    render(
      <SuggestionRow suggestion={makeSuggestion()} onAccept={noop} onReject={noop} isPending={false} />,
    )
    expect(screen.getByText('spacing-clamp')).toBeTruthy()
    expect(screen.getByText(/\.hero/)).toBeTruthy()
    expect(screen.getByText(/@768px/)).toBeTruthy()
    expect(screen.getByText(/padding/)).toBeTruthy()
    expect(screen.getByText(/clamp\(1rem/)).toBeTruthy()
    expect(screen.getByText(/Test rationale/)).toBeTruthy()
  })

  it('renders "high" confidence label for high confidence', () => {
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ confidence: 'high' })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    expect(screen.getByText('high')).toBeTruthy()
  })

  it('renders "medium" confidence label for medium confidence', () => {
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ confidence: 'medium' })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    expect(screen.getByText('medium')).toBeTruthy()
  })

  it('renders "low" confidence label for low confidence', () => {
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ confidence: 'low' })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    expect(screen.getByText('low')).toBeTruthy()
  })

  it('Accept and Reject buttons are ENABLED (Phase 4 contract)', () => {
    render(
      <SuggestionRow suggestion={makeSuggestion()} onAccept={noop} onReject={noop} isPending={false} />,
    )
    const accept = screen.getByRole('button', { name: /accept/i })
    const reject = screen.getByRole('button', { name: /reject/i })
    expect(accept).toHaveProperty('disabled', false)
    expect(reject).toHaveProperty('disabled', false)
  })

  it('clicking Accept calls onAccept with suggestion.id', () => {
    const onAccept = vi.fn()
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ id: 'click-test-id' })}
        onAccept={onAccept}
        onReject={noop}
        isPending={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /accept/i }))
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onAccept).toHaveBeenCalledWith('click-test-id')
  })

  it('clicking Reject calls onReject with suggestion.id', () => {
    const onReject = vi.fn()
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ id: 'click-test-id' })}
        onAccept={noop}
        onReject={onReject}
        isPending={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(onReject).toHaveBeenCalledTimes(1)
    expect(onReject).toHaveBeenCalledWith('click-test-id')
  })

  it('renders PendingPill when isPending=true, absent when isPending=false', () => {
    const { container: pendingContainer } = render(
      <SuggestionRow suggestion={makeSuggestion()} onAccept={noop} onReject={noop} isPending={true} />,
    )
    expect(pendingContainer.querySelector('[data-role="pending-pill"]')).toBeTruthy()
    expect(screen.getByText(/will apply on save/i)).toBeTruthy()

    cleanup()

    const { container: idleContainer } = render(
      <SuggestionRow suggestion={makeSuggestion()} onAccept={noop} onReject={noop} isPending={false} />,
    )
    expect(idleContainer.querySelector('[data-role="pending-pill"]')).toBeNull()
  })

  it('renders bp as "base" when bp === 0, "@Npx" otherwise', () => {
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ bp: 0 })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    expect(screen.getByText('base')).toBeTruthy()
    cleanup()
    render(
      <SuggestionRow
        suggestion={makeSuggestion({ bp: 480 })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    expect(screen.getByText('@480px')).toBeTruthy()
  })

  it('data-suggestion-id attribute matches suggestion.id', () => {
    const { container } = render(
      <SuggestionRow
        suggestion={makeSuggestion({ id: 'abc-123' })}
        onAccept={noop}
        onReject={noop}
        isPending={false}
      />,
    )
    const row = container.querySelector('[data-suggestion-id]')
    expect(row?.getAttribute('data-suggestion-id')).toBe('abc-123')
  })
})
