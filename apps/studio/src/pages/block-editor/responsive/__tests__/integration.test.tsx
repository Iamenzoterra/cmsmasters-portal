// WP-027 Phase 3 (display) + Phase 4 (save flow) — ResponsiveTab integration.
//
// Phase 3 scope: fixture-driven test via WP-025 engine fixtures (7-dot ?raw paths per
// Phase 0 carry-over (f)). Asserts snapshot-as-ground-truth (saved memory
// feedback_fixture_snapshot_ground_truth.md): fixture filename is aspirational, snapshot
// is authority.
//
// Phase 4 scope additions:
//   - Un-gated Accept/Reject (DISABLED contract flipped)
//   - onApplyToForm dispatched on accept (not on reject)
//   - PendingPill shown on accepted rows
//   - Rejected rows disappear from list
//   - saveNonce increment triggers clearAfterSave (pending-pill clears)
//
// Full block-editor save-flow (fetch spy on /revalidate) is deferred to manual e2e
// (Task 4.8) — too integration-heavy for unit test harness without auth mocks.

// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { ResponsiveTab } from '../ResponsiveTab'
import type { Block } from '@cmsmasters/db'

// jsdom doesn't implement ResizeObserver; PreviewPanel.tsx (Phase 2) uses it for scale-to-fit.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).ResizeObserver ??= ResizeObserverMock

// Fixture reuse per Brain ruling 7 (Phase 0 carry-over (f)) — 7 dots from __tests__/
import blockSpacingFontHtml from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
import blockSpacingFontCss from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'
import blockPlainCopyHtml from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.html?raw'
import blockPlainCopyCss from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-plain-copy.css?raw'

afterEach(cleanup)

function fixtureBlock(slug: string, html: string, css: string): Block {
  // Engine only reads { html, css }; full Block type from Supabase has many other
  // required fields (id, created_at, updated_at, name, etc.). Cast suppresses the extras.
  return {
    id: `fixture-${slug}`,
    slug,
    html,
    css,
    variants: null,
  } as unknown as Block
}

describe('ResponsiveTab — integration via WP-025 fixtures', () => {
  it('block-spacing-font: 3 suggestions (font-clamp + 2× media-maxwidth) per snapshot', () => {
    // ⚠ SNAPSHOT-AS-GROUND-TRUTH (feedback_fixture_snapshot_ground_truth.md).
    // Ground truth per packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap:470-476:
    //   "suggestionCount": 3,
    //   "suggestionHeuristics": ["font-clamp", "media-maxwidth", "media-maxwidth"],
    //   "warnings": []
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)

    const rows = document.querySelectorAll('[data-suggestion-id]')
    expect(rows.length).toBe(3)

    const heuristicSpans = document.querySelectorAll('[data-role="heuristic"]')
    const heuristicTexts = Array.from(heuristicSpans).map((el) => el.textContent?.trim())
    expect(heuristicTexts).toEqual(['font-clamp', 'media-maxwidth', 'media-maxwidth'])

    expect(screen.queryByText(/^Warnings \(/)).toBeNull()
  })

  it('block-plain-copy: empty state (no heuristic triggers, no warnings)', () => {
    const block = fixtureBlock('block-plain-copy', blockPlainCopyHtml, blockPlainCopyCss)
    render(<ResponsiveTab block={block} />)
    expect(screen.getByText(/No responsive suggestions/i)).toBeTruthy()
    expect(document.querySelectorAll('[data-suggestion-id]').length).toBe(0)
  })

  it('null block: renders preview prompt + empty suggestion state', () => {
    render(<ResponsiveTab block={null} />)
    expect(screen.getByText(/Select a block/i)).toBeTruthy()
    expect(screen.getByText(/No responsive suggestions/i)).toBeTruthy()
  })

  it('Phase 4 contract: Accept/Reject buttons are ENABLED on all rows', () => {
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)
    const acceptButtons = screen.queryAllByRole('button', { name: /accept/i })
    const rejectButtons = screen.queryAllByRole('button', { name: /reject/i })
    expect(acceptButtons.length).toBe(3)
    expect(rejectButtons.length).toBe(3)
    for (const btn of acceptButtons) expect(btn).toHaveProperty('disabled', false)
    for (const btn of rejectButtons) expect(btn).toHaveProperty('disabled', false)
  })
})

describe('ResponsiveTab — Phase 4 Accept/Reject/Save flow', () => {
  it('Accept dispatches onApplyToForm with block containing applied CSS', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    fireEvent.click(acceptButtons[0])

    expect(onApplyToForm).toHaveBeenCalledTimes(1)
    const appliedBlock = onApplyToForm.mock.calls[0][0] as Block
    expect(appliedBlock.slug).toBe(block.slug)
    // applySuggestions appends container-query CSS — string grows
    expect((appliedBlock.css ?? '').length).toBeGreaterThan((block.css ?? '').length)
    // Base analysis CSS unchanged (applySuggestions returns a new block; original untouched)
    expect(block.css).toBe(blockSpacingFontCss)
  })

  it('Accept shows PendingPill on the accepted row', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    expect(document.querySelectorAll('[data-role="pending-pill"]').length).toBe(0)

    const acceptButtons = screen.getAllByRole('button', { name: /accept/i })
    fireEvent.click(acceptButtons[0])

    expect(document.querySelectorAll('[data-role="pending-pill"]').length).toBe(1)
  })

  it('Reject hides the suggestion row', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} />)

    expect(document.querySelectorAll('[data-suggestion-id]').length).toBe(3)

    const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
    fireEvent.click(rejectButtons[0])

    expect(document.querySelectorAll('[data-suggestion-id]').length).toBe(2)
    // Form NOT dirtied by reject — no onApplyToForm invocation
    expect(onApplyToForm).not.toHaveBeenCalled()
  })

  it('saveNonce increment clears session (pending-pill disappears)', () => {
    const onApplyToForm = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)

    const { rerender } = render(
      <ResponsiveTab block={block} onApplyToForm={onApplyToForm} saveNonce={0} />,
    )

    fireEvent.click(screen.getAllByRole('button', { name: /accept/i })[0])
    expect(document.querySelectorAll('[data-role="pending-pill"]').length).toBe(1)

    // Simulate parent's successful save: increment saveNonce → child clears session.
    rerender(<ResponsiveTab block={block} onApplyToForm={onApplyToForm} saveNonce={1} />)
    expect(document.querySelectorAll('[data-role="pending-pill"]').length).toBe(0)
  })
})
