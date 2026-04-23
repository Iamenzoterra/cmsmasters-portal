// WP-027 Phase 3 (display) + Phase 4 (save flow) — ResponsiveTab integration.
//
// Phase 3 scope: fixture-driven test via WP-025 engine fixtures (7-dot ?raw paths per
// Phase 0 carry-over (f)). Asserts snapshot-as-ground-truth (saved memory
// feedback_fixture_snapshot_ground_truth.md): fixture filename is aspirational, snapshot
// is authority.
//
// Phase 4 will expand with save-flow cases: spy on updateBlockApi + fetch revalidate,
// assert RHF dirty transitions, assert session-state clearAfterSave.

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ResponsiveTab } from '../ResponsiveTab'
import type { Block } from '@cmsmasters/db'

// jsdom doesn't implement ResizeObserver; PreviewPanel.tsx (Phase 2) uses it for scale-to-fit.
// Minimal no-op polyfill so the component tree mounts during integration tests.
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
  // Engine only reads { slug, html, css }; full Block type from Supabase has many other
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
    // Fixture filename suggests spacing-clamp fires; engine's var()-skip gate ignores
    // spacing values wrapped in var() — so spacing-clamp does NOT fire. Don't assert it.
    // HEURISTIC_ORDER sort: font-clamp (idx 2) before media-maxwidth (idx 5).

    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)

    // 3 total rendered rows
    const rows = document.querySelectorAll('[data-suggestion-id]')
    expect(rows.length).toBe(3)

    // Heuristics render in data-role="heuristic" spans, in sort order
    const heuristicSpans = document.querySelectorAll('[data-role="heuristic"]')
    const heuristicTexts = Array.from(heuristicSpans).map((el) => el.textContent?.trim())
    expect(heuristicTexts).toEqual(['font-clamp', 'media-maxwidth', 'media-maxwidth'])

    // No warnings banner (snapshot shows warnings: [])
    expect(screen.queryByText(/^Warnings \(/)).toBeNull()
  })

  it('block-plain-copy: empty state (no heuristic triggers, no warnings)', () => {
    // Ground truth per snapshot:346-348 — suggestionCount: 0, warnings: [].
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

  it('Accept/Reject buttons remain DISABLED across all suggestion rows', () => {
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)
    const acceptButtons = screen.queryAllByRole('button', { name: /accept/i })
    const rejectButtons = screen.queryAllByRole('button', { name: /reject/i })
    expect(acceptButtons.length).toBe(3)
    expect(rejectButtons.length).toBe(3)
    for (const btn of acceptButtons) expect(btn).toHaveProperty('disabled', true)
    for (const btn of rejectButtons) expect(btn).toHaveProperty('disabled', true)
  })
})
