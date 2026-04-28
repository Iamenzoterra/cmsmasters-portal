// @vitest-environment jsdom
// WP-033 post-close polish — InspectorPanel snapshot + section structure tests.
//
// Pins the shell + 5 property sections (SPACING, DIMENSIONS, TYPOGRAPHY-iff-hasText,
// LAYOUT, VISIBILITY) for the single-cell layout. Conditional row tests cover
// flex/grid sub-rows + gap row gating.
//
// Note (WP-037 Phase 0 RECON repair): test fixtures updated post-WP-033 polish.
// `hasText: '1'` flag added to PINNED_BLOCK so Typography section renders for
// "renders 4 property sections" assertion. Snapshots auto-regenerate on next run.

import type { ReactElement } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TooltipProvider } from '@cmsmasters/ui'
import { InspectorPanel } from '../components/InspectorPanel'
import type { PinState } from '../components/Inspector'

afterEach(cleanup)

/**
 * WP-037 Phase 2: TooltipProvider required when InspectorPanel renders
 * PropertyRow for enum LAYOUT properties (label gets wrapped in <Tooltip>).
 */
function renderPanel(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const PINNED_BLOCK: PinState = {
  selector: '.cta',
  rect: { x: 0, y: 0, w: 80, h: 30 },
  computedStyle: {
    marginTop: '0px',
    marginRight: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    paddingTop: '8px',
    paddingRight: '12px',
    paddingBottom: '8px',
    paddingLeft: '12px',
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '500',
    letterSpacing: '0px',
    textAlign: 'left',
    display: 'block',
    alignItems: 'normal',
    justifyContent: 'normal',
    flexDirection: 'row',
    gridTemplateColumns: 'none',
    hasText: '1',
  },
}

const PINNED_FLEX: PinState = {
  ...PINNED_BLOCK,
  computedStyle: {
    ...PINNED_BLOCK.computedStyle,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
}

const PINNED_GRID: PinState = {
  ...PINNED_BLOCK,
  computedStyle: {
    ...PINNED_BLOCK.computedStyle,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
  },
}

describe('InspectorPanel — empty state (no slug)', () => {
  it('renders empty placeholder', () => {
    const { container } = renderPanel(
      <InspectorPanel
        slug={null}
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — populated, no hover/pin', () => {
  it('renders header + breadcrumb hint + BP picker + properties-empty hint', () => {
    const { container, getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-properties-empty')).toBeTruthy()
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — hover only', () => {
  it('renders blue dot + selector in muted breadcrumb', () => {
    const { container, getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={{ selector: 'h2.title', rect: { x: 0, y: 0, w: 100, h: 40 } }}
        pinned={null}
        activeBp={768}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('h2.title')
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — pinned (block-level)', () => {
  it('renders Clear button + breadcrumb + 4 property sections', () => {
    const { container, getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={375}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-clear-pin')).toBeTruthy()
    expect(getByTestId('inspector-breadcrumb').textContent).toContain('.cta')
    expect(getByTestId('inspector-section-spacing')).toBeTruthy()
    expect(getByTestId('inspector-section-typography')).toBeTruthy()
    expect(getByTestId('inspector-section-layout')).toBeTruthy()
    expect(getByTestId('inspector-section-visibility')).toBeTruthy()
    expect(container).toMatchSnapshot()
  })
})

describe('InspectorPanel — section conditional rows', () => {
  it('display:block → neither flex-direction nor grid-template-columns', () => {
    const { container } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container.querySelector('[data-property="flex-direction"]')).toBeNull()
    expect(container.querySelector('[data-property="grid-template-columns"]')).toBeNull()
  })

  it('display:flex → flex-direction row appears, no grid-template-columns', () => {
    const { container } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_FLEX}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container.querySelector('[data-property="flex-direction"]')).toBeTruthy()
    expect(container.querySelector('[data-property="grid-template-columns"]')).toBeNull()
  })

  it('display:grid → grid-template-columns row appears, no flex-direction', () => {
    const { container } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_GRID}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(container.querySelector('[data-property="grid-template-columns"]')).toBeTruthy()
    expect(container.querySelector('[data-property="flex-direction"]')).toBeNull()
  })

  it('gap row appears only when computedStyle has gap/rowGap/columnGap', () => {
    const { container: blockContainer } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(blockContainer.querySelector('[data-property="gap"]')).toBeNull()

    cleanup()

    const { container: flexContainer } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_FLEX}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(flexContainer.querySelector('[data-property="gap"]')).toBeTruthy()
  })
})

describe('InspectorPanel — Visibility section (Phase 3 wires)', () => {
  it('renders disabled checkbox when no onVisibilityToggle (Phase 3 read-only fallback)', () => {
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    const cb = getByTestId('inspector-hide-at-bp') as HTMLInputElement
    expect(cb).toBeTruthy()
    expect(cb.disabled).toBe(true)
  })

  it('renders enabled checkbox when onVisibilityToggle provided', () => {
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
        onVisibilityToggle={() => undefined}
      />,
    )
    const cb = getByTestId('inspector-hide-at-bp') as HTMLInputElement
    expect(cb.disabled).toBe(false)
    expect(cb.checked).toBe(false)
  })

  it('reflects isHiddenAtActiveBp=true → checked', () => {
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
        onVisibilityToggle={() => undefined}
        isHiddenAtActiveBp
      />,
    )
    const cb = getByTestId('inspector-hide-at-bp') as HTMLInputElement
    expect(cb.checked).toBe(true)
  })

  it('checking calls onVisibilityToggle(activeBp, true)', async () => {
    const { vi } = await import('vitest')
    const { fireEvent } = await import('@testing-library/react')
    const onToggle = vi.fn()
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
        onVisibilityToggle={onToggle}
      />,
    )
    const cb = getByTestId('inspector-hide-at-bp') as HTMLInputElement
    fireEvent.click(cb)
    expect(onToggle).toHaveBeenCalledWith(1440, true)
  })

  it('unchecking calls onVisibilityToggle(activeBp, false)', async () => {
    const { vi } = await import('vitest')
    const { fireEvent } = await import('@testing-library/react')
    const onToggle = vi.fn()
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={PINNED_BLOCK}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
        onVisibilityToggle={onToggle}
        isHiddenAtActiveBp
      />,
    )
    const cb = getByTestId('inspector-hide-at-bp') as HTMLInputElement
    fireEvent.click(cb)
    expect(onToggle).toHaveBeenCalledWith(1440, false)
  })
})

describe('InspectorPanel — BP picker', () => {
  it('renders 3 BP radios with active one aria-checked', () => {
    const { getAllByRole } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={768}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    const radios = getAllByRole('radio')
    expect(radios.length).toBe(3)
    const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)
    expect(checked[0].textContent).toBe('768')
  })

  it('exposes data-testid for each BP option', () => {
    const { getByTestId } = renderPanel(
      <InspectorPanel
        slug="hero"
        hovered={null}
        pinned={null}
        activeBp={1440}
        onActiveBpChange={() => undefined}
        onClearPin={() => undefined}
      />,
    )
    expect(getByTestId('inspector-bp-1440')).toBeTruthy()
    expect(getByTestId('inspector-bp-768')).toBeTruthy()
    expect(getByTestId('inspector-bp-375')).toBeTruthy()
  })
})
