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
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { act, render, cleanup, screen, fireEvent } from '@testing-library/react'
import { ResponsiveTab } from '../ResponsiveTab'
import type { Block } from '@cmsmasters/db'

// jsdom doesn't implement ResizeObserver / PointerCapture; PreviewPanel + Radix Slider use them.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
/* eslint-disable @typescript-eslint/no-explicit-any */
if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = ResizeObserverMock
}
if (typeof Element !== 'undefined') {
  const P = Element.prototype as any
  if (!P.hasPointerCapture) P.hasPointerCapture = () => false
  if (!P.setPointerCapture) P.setPointerCapture = () => undefined
  if (!P.releasePointerCapture) P.releasePointerCapture = () => undefined
  if (!P.scrollIntoView) P.scrollIntoView = () => undefined
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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

// ─────────────────────────────────────────────────────────────────────────
// WP-028 Phase 2 — TweakPanel integration: postMessage → selection → dispatch
// ─────────────────────────────────────────────────────────────────────────
describe('ResponsiveTab — WP-028 Phase 2 TweakPanel flow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('element-click postMessage populates TweakPanel selection (slug-filtered)', () => {
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)

    // Before message: TweakPanel empty.
    const empty = document.querySelector('[data-testid="tweak-panel"][data-empty="true"]')
    expect(empty).toBeTruthy()

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'block-forge:element-click',
            slug: 'block-spacing-font',
            selector: '.hero-cta',
            computedStyle: { padding: '24px', fontSize: '18px', gap: '0px', display: 'block' },
          },
        }),
      )
    })

    const panel = document.querySelector('[data-testid="tweak-panel"]') as HTMLElement | null
    expect(panel).toBeTruthy()
    expect(panel!.getAttribute('data-selector')).toBe('.hero-cta')
    expect(panel!.getAttribute('data-bp')).toBe('1440') // default currentBp
  })

  it('postMessage with different slug is IGNORED (slug filter)', () => {
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'block-forge:element-click',
            slug: 'some-other-block',
            selector: '.foreign',
            computedStyle: {},
          },
        }),
      )
    })

    // Panel stays empty — slug mismatch filtered it out.
    const empty = document.querySelector('[data-testid="tweak-panel"][data-empty="true"]')
    expect(empty).toBeTruthy()
  })

  it('BP picker click + hide toggle → onTweakDispatch fires after debounce', () => {
    const onTweakDispatch = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(<ResponsiveTab block={block} onTweakDispatch={onTweakDispatch} />)

    // Seed selection via postMessage.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'block-forge:element-click',
            slug: 'block-spacing-font',
            selector: '.hero-cta',
            computedStyle: { padding: '24px', fontSize: '18px', gap: '0px', display: 'block' },
          },
        }),
      )
    })

    // Switch to 768 BP.
    fireEvent.click(document.querySelector('[data-testid="tweak-panel-bp-768"]') as HTMLButtonElement)
    // Click Hide.
    fireEvent.click(document.querySelector('[data-testid="tweak-panel-visibility-hide"]') as HTMLButtonElement)

    // Before debounce expires — no dispatch.
    expect(onTweakDispatch).not.toHaveBeenCalled()

    // Advance 300ms.
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onTweakDispatch).toHaveBeenCalled()
    const lastCall = onTweakDispatch.mock.calls[onTweakDispatch.mock.calls.length - 1][0]
    expect(lastCall).toEqual({
      selector: '.hero-cta',
      bp: 768,
      property: 'display',
      value: 'none',
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────
// WP-028 Phase 3 — dispatchVariantToForm behavioral unit tests (Ruling T —
// kept inline with integration to avoid creating a new test file; preserves
// arch-test Δ0). Mirrors Phase 2 OQ4 invariant tests for dispatchTweakToForm.
// ─────────────────────────────────────────────────────────────────────────
import { dispatchVariantToForm } from '../ResponsiveTab'
import type { BlockVariants } from '@cmsmasters/db'

function makeFormMock(initialVariants: BlockVariants = {}) {
  let current: BlockVariants = initialVariants
  const setValue = vi.fn(
    (_key: 'variants', value: BlockVariants, _opts?: { shouldDirty?: boolean }) => {
      current = value
    },
  )
  const getValues = vi.fn((_key: 'variants') => current)
  return {
    form: { getValues, setValue } as Parameters<typeof dispatchVariantToForm>[0],
    get current() {
      return current
    },
    setValue,
    getValues,
  }
}

describe('dispatchVariantToForm — OQ4 mirror behavioral tests', () => {
  it('create: setValue called with {...prev, [name]: payload}; returns previous', () => {
    const harness = makeFormMock({ md: { html: '<h2>md</h2>', css: '' } })
    const prev = dispatchVariantToForm(harness.form, {
      kind: 'create',
      name: 'sm',
      html: '<h2>sm</h2>',
      css: '.sm { padding: 12px }',
    })
    expect(prev).toEqual({ md: { html: '<h2>md</h2>', css: '' } })
    expect(harness.setValue).toHaveBeenCalledWith(
      'variants',
      {
        md: { html: '<h2>md</h2>', css: '' },
        sm: { html: '<h2>sm</h2>', css: '.sm { padding: 12px }' },
      },
      { shouldDirty: true },
    )
  })

  it('rename: moves the slot + preserves payload; returns previous', () => {
    const harness = makeFormMock({ sm: { html: '<h2>x</h2>', css: '.a { color: red }' } })
    const prev = dispatchVariantToForm(harness.form, {
      kind: 'rename',
      from: 'sm',
      to: 'mobile',
    })
    expect(prev).toEqual({ sm: { html: '<h2>x</h2>', css: '.a { color: red }' } })
    expect(harness.current).toEqual({ mobile: { html: '<h2>x</h2>', css: '.a { color: red }' } })
  })

  it('delete: drops the slot; returns previous', () => {
    const harness = makeFormMock({
      sm: { html: '<h2>sm</h2>', css: '' },
      md: { html: '<h2>md</h2>', css: '' },
    })
    const prev = dispatchVariantToForm(harness.form, { kind: 'delete', name: 'sm' })
    expect(Object.keys(prev)).toContain('sm')
    expect(harness.current).toEqual({ md: { html: '<h2>md</h2>', css: '' } })
  })

  it('OQ4 invariant — reads live form state on each dispatch (not cached)', () => {
    const harness = makeFormMock({})
    // First dispatch: creates `sm`.
    dispatchVariantToForm(harness.form, {
      kind: 'create',
      name: 'sm',
      html: '<h2>sm</h2>',
      css: '',
    })
    // External mutation — simulates user edit between dispatches.
    harness.setValue('variants', { md: { html: '<h2>md</h2>', css: '' } }, {
      shouldDirty: true,
    })
    // Second dispatch: reads LIVE (which is now `{md: ...}`, NOT the `{sm: ...}` from
    // the first dispatch's return). Adding `lg` must preserve `md`, not resurrect `sm`.
    dispatchVariantToForm(harness.form, {
      kind: 'create',
      name: 'lg',
      html: '<h2>lg</h2>',
      css: '',
    })
    expect(harness.current).toEqual({
      md: { html: '<h2>md</h2>', css: '' },
      lg: { html: '<h2>lg</h2>', css: '' },
    })
    expect(harness.current.sm).toBeUndefined()
  })

  it('rename missing source → no setValue call; returns previous', () => {
    const harness = makeFormMock({ md: { html: '<h2>md</h2>', css: '' } })
    const prev = dispatchVariantToForm(harness.form, {
      kind: 'rename',
      from: 'nonexistent',
      to: 'sm',
    })
    expect(prev).toEqual({ md: { html: '<h2>md</h2>', css: '' } })
    expect(harness.setValue).not.toHaveBeenCalled()
  })

  it('update-content: updates html+css, preserves other variants, returns previous', () => {
    const harness = makeFormMock({
      sm: { html: '<h2>sm-orig</h2>', css: '.x {}' },
      md: { html: '<h2>md</h2>', css: '.m {}' },
    })
    const prev = dispatchVariantToForm(harness.form, {
      kind: 'update-content',
      name: 'sm',
      html: '<h2>sm-edited</h2>',
      css: '.x { color: red }',
    })
    expect(prev).toEqual({
      sm: { html: '<h2>sm-orig</h2>', css: '.x {}' },
      md: { html: '<h2>md</h2>', css: '.m {}' },
    })
    expect(harness.setValue).toHaveBeenCalledWith(
      'variants',
      {
        sm: { html: '<h2>sm-edited</h2>', css: '.x { color: red }' },
        md: { html: '<h2>md</h2>', css: '.m {}' },
      },
      { shouldDirty: true },
    )
  })

  it('update-content: rename-race safety — variant deleted between edit + debounce → no-op', () => {
    const harness = makeFormMock({ md: { html: '<h2>md</h2>', css: '' } })
    const prev = dispatchVariantToForm(harness.form, {
      kind: 'update-content',
      name: 'sm', // deleted / never existed
      html: '<h2>stale</h2>',
      css: '',
    })
    expect(prev).toEqual({ md: { html: '<h2>md</h2>', css: '' } })
    expect(harness.setValue).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// WP-028 Phase 3 — integration: VariantsDrawer trigger → fork → RHF variants
// ─────────────────────────────────────────────────────────────────────────
describe('ResponsiveTab — WP-028 Phase 3 Variant drawer integration', () => {
  it('drawer trigger opens drawer; Create variant fires onVariantDispatch with deep-copy base', () => {
    const onVariantDispatch = vi.fn()
    const block = fixtureBlock('block-spacing-font', blockSpacingFontHtml, blockSpacingFontCss)
    render(
      <ResponsiveTab
        block={block}
        onVariantDispatch={onVariantDispatch}
        watchedVariants={{}}
        baseHtmlForFork="<h2>base</h2>"
        baseCssForFork=".x { color: red }"
      />,
    )

    // Open drawer via trigger.
    fireEvent.click(document.querySelector('[data-testid="variants-drawer-trigger"]') as HTMLElement)

    // Portal renders into document.body — query there.
    const forkInput = document.querySelector(
      '[data-testid="variants-drawer-fork-input"]',
    ) as HTMLInputElement
    expect(forkInput).toBeTruthy()
    fireEvent.change(forkInput, { target: { value: 'sm' } })
    fireEvent.click(
      document.querySelector('[data-testid="variants-drawer-fork-submit"]') as HTMLElement,
    )

    expect(onVariantDispatch).toHaveBeenCalledWith({
      kind: 'create',
      name: 'sm',
      html: '<h2>base</h2>',
      css: '.x { color: red }',
    })
  })
})
