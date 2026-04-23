// WP-027 Phase 3 — SuggestionRow unit tests.
// 7 cases covering field rendering, confidence label mapping, DISABLED button contract,
// bp=0 → 'base' (reference convention), and data-suggestion-id attribute.
//
// All Suggestion fields verified against packages/block-forge-core/src/lib/types.ts:41-50.
// bp is always number (no nullable path). Labels lowercase; CSS text-transform uppercases display.

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { SuggestionRow } from '../SuggestionRow'
import type { Suggestion } from '@cmsmasters/block-forge-core'

afterEach(cleanup) // RTL doesn't auto-cleanup in Vitest — saved memory from WP-026 Phase 3

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  // Complete Suggestion shape — all 8 required fields populated. No `as Suggestion` cast needed.
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

describe('SuggestionRow', () => {
  it('renders heuristic, selector, bp, property, value, rationale', () => {
    render(<SuggestionRow suggestion={makeSuggestion()} />)
    expect(screen.getByText('spacing-clamp')).toBeTruthy()
    expect(screen.getByText(/\.hero/)).toBeTruthy()
    expect(screen.getByText(/@768px/)).toBeTruthy()
    expect(screen.getByText(/padding/)).toBeTruthy()
    expect(screen.getByText(/clamp\(1rem/)).toBeTruthy()
    expect(screen.getByText(/Test rationale/)).toBeTruthy()
  })

  it('renders "high" confidence label for high confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'high' })} />)
    // Label stored lowercase (SuggestionRow.tsx CONFIDENCE_STYLES); CSS text-transform uppercases display.
    // RTL reads source textContent (lowercase).
    expect(screen.getByText('high')).toBeTruthy()
  })

  it('renders "medium" confidence label for medium confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'medium' })} />)
    expect(screen.getByText('medium')).toBeTruthy()
  })

  it('renders "low" confidence label for low confidence', () => {
    render(<SuggestionRow suggestion={makeSuggestion({ confidence: 'low' })} />)
    expect(screen.getByText('low')).toBeTruthy()
  })

  it('Accept and Reject buttons are DISABLED (Phase 3 contract)', () => {
    render(<SuggestionRow suggestion={makeSuggestion()} />)
    const accept = screen.getByRole('button', { name: /accept/i })
    const reject = screen.getByRole('button', { name: /reject/i })
    expect(accept).toHaveProperty('disabled', true)
    expect(reject).toHaveProperty('disabled', true)
  })

  it('renders bp as "base" when bp === 0, "@Npx" otherwise (reference convention)', () => {
    // bp is always number per types.ts:45 — no null/undefined path.
    // bp === 0 means "top-level rule, no media-maxwidth" per engine convention.
    render(<SuggestionRow suggestion={makeSuggestion({ bp: 0 })} />)
    expect(screen.getByText('base')).toBeTruthy()
    cleanup()
    render(<SuggestionRow suggestion={makeSuggestion({ bp: 480 })} />)
    expect(screen.getByText('@480px')).toBeTruthy()
  })

  it('data-suggestion-id attribute matches suggestion.id', () => {
    const { container } = render(<SuggestionRow suggestion={makeSuggestion({ id: 'abc-123' })} />)
    const row = container.querySelector('[data-suggestion-id]')
    expect(row?.getAttribute('data-suggestion-id')).toBe('abc-123')
  })
})
