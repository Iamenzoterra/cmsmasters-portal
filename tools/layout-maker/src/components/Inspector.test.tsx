/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Inspector } from './Inspector'
import type { LayoutConfig, TokenMap } from '../lib/types'

// Phase 4 Cut B — locks the Inspector side of the capability refactor. The
// container-no-inner-params test is the closing contract for the PARITY-LOG
// "[tablet] align + max-width on container slots are silently ignored"
// entry. The generator side (`css-generator.test.ts` Phase 4 describe) and
// this file together make the class of lie unreachable.

const tokens: TokenMap = { all: {}, spacing: {}, categories: [] }

function makeConfig(slots: LayoutConfig['slots']): LayoutConfig {
  return {
    version: 1,
    name: 'p4-test',
    scope: 'theme',
    grid: {
      desktop: {
        'min-width': '1440px',
        columns: Object.fromEntries(Object.keys(slots).map((n) => [n, '1fr'])),
        'column-gap': '0',
      },
      tablet: {
        'min-width': '768px',
        columns: Object.fromEntries(Object.keys(slots).map((n) => [n, '1fr'])),
        'column-gap': '0',
      },
    },
    slots,
  }
}

const baseProps = {
  tokens,
  onShowToast: vi.fn(),
  blockWarnings: [],
  onToggleSlot: vi.fn(),
  onUpdateSlotConfig: vi.fn(),
  onBatchUpdateSlotConfig: vi.fn(),
  onUpdateSlotRole: vi.fn(),
  onUpdateColumnWidth: vi.fn(),
  onUpdateGridProp: vi.fn(),
  onUpdateLayoutProp: vi.fn(),
  onUpdateNestedSlots: vi.fn(),
  onCreateNestedSlot: vi.fn(),
  onCreateTopLevelSlot: vi.fn(),
  onSelectSlot: vi.fn(),
}

describe('Inspector capability gating (Phase 4 Cut B)', () => {
  afterEach(() => cleanup())

  it('container slot: hides inner-params (PARITY lie closed)', () => {
    const config = makeConfig({
      outer: { 'nested-slots': ['inner'] },
      inner: {},
    })
    const { queryByText } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="outer"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    // Inner-params section titles — must not render for containers.
    expect(queryByText('Slot Parameters')).toBeNull()
    expect(queryByText('Slot Area')).toBeNull()

    // Specific inner fields — explicit negatives lock the whole surface.
    expect(queryByText('Inner max-width')).toBeNull()
    expect(queryByText('Content align')).toBeNull()
    expect(queryByText(/Padding ←→|Padding ↑|Padding ↓/)).toBeNull()
    expect(queryByText('Usable width')).toBeNull()

    // Container panel + badge present.
    expect(queryByText('Child slots')).not.toBeNull()
    expect(queryByText('container')).not.toBeNull()
  })

  it('leaf slot: shows inner-params sections', () => {
    const config = makeConfig({ content: {} })
    const { queryByText, container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(queryByText('Slot Parameters')).not.toBeNull()
    expect(queryByText('Slot Area')).not.toBeNull()
    expect(queryByText('Inner max-width')).not.toBeNull()
    expect(queryByText('Content align')).not.toBeNull()
    // Leaf badge renders.
    expect(container.querySelector('.lm-badge--leaf')).not.toBeNull()
    // Container badge does NOT render on a leaf.
    expect(container.querySelector('.lm-badge--container')).toBeNull()
  })

  it('sidebar slot: shows drawer-trigger controls + concurrent sidebar+leaf badges', () => {
    const config = makeConfig({ 'sidebar-left': {} })
    const { queryByText, container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="sidebar-left"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(queryByText('Trigger label')).not.toBeNull()
    expect(queryByText('Trigger icon')).not.toBeNull()
    expect(queryByText('Trigger color')).not.toBeNull()
    // Concurrent badge set (Brain #5 — no precedence collapse).
    expect(container.querySelector('.lm-badge--leaf')).not.toBeNull()
    expect(container.querySelector('.lm-badge--sidebar')).not.toBeNull()
  })

  it('top-positioned slot: shows sticky + full-width locked note + top badge', () => {
    const config = makeConfig({ header: { position: 'top' } })
    const { queryByText, container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="header"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(queryByText('Sticky')).not.toBeNull()
    expect(queryByText(/Full width — locked by position/)).not.toBeNull()
    expect(container.querySelector('.lm-badge--top')).not.toBeNull()
  })

  it('non-desktop BP with no override: scope chip reads Base + inherited label', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    const { queryAllByText, container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )

    // Chip reads "Base" — rendered on both Slot Area and Slot Parameters.
    const baseChips = container.querySelectorAll('.lm-scope-chip--base')
    expect(baseChips.length).toBeGreaterThanOrEqual(1)
    expect(baseChips[0].textContent).toBe('Base')
    // Inherited label visible (also one per per-BP section).
    expect(queryAllByText('Inherited from Base').length).toBeGreaterThanOrEqual(1)
  })

  it('non-desktop BP with override: scope chip reads Tablet override', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    // Inject a per-BP override.
    config.grid.tablet.slots = { content: { padding: '--spacing-3xl' } }

    const { queryAllByText, container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )

    const overrideChips = container.querySelectorAll('.lm-scope-chip--tablet-override')
    expect(overrideChips.length).toBeGreaterThanOrEqual(1)
    expect(overrideChips[0].textContent).toBe('Tablet override')
    // No inherited label when override is present.
    expect(queryAllByText('Inherited from Base').length).toBe(0)
  })

  it('desktop BP: no scope chip rendered (scope IS Base — no visual noise)', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    // At desktop, the scope chip is intentionally suppressed — every edit
    // writes to base, so a chip on every slot is noise. The section title
    // alone communicates "Slot Area / Slot Parameters" — scope = Base by
    // default. Asserts the non-noise UX choice.
    expect(container.querySelector('.lm-scope-chip')).toBeNull()
    expect(container.querySelector('.lm-inspector__inherited-label')).toBeNull()
  })

  it('selected slot shows breakpoint truth once via the footer, without an inline duplicate row', () => {
    const config = makeConfig({ content: {} })
    const { queryAllByText } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(queryAllByText('Breakpoint')).toHaveLength(1)
  })

  it('section titles do not render decorative disclosure glyphs before clusters exist', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(container.querySelector('.lm-inspector__section-glyph')).toBeNull()
  })

  it('reset-override button: dispatches undefined to onUpdateSlotConfig (App.tsx then prunes empty slot override record)', () => {
    // Set up a leaf slot with a per-BP override so the reset button renders.
    // Inspector's reset dispatches `onUpdateSlotConfig(name, key, undefined,
    // gridKey, breakpointId)` — App.tsx:applySlotConfigUpdate:131-134 then
    // prunes the empty slot record from `config.grid[bp].slots`. This test
    // asserts the Inspector side of the contract. App.tsx prune logic is
    // unchanged from pre-P4 and is covered by existing behavior.
    const config = makeConfig({ content: { 'padding-x': '--spacing-xl' } })
    // Override padding-x specifically so the padding-x row shows a reset btn
    // (padding shorthand isn't one of the Inspector's 3 rendered rows:
    //  padding-x / padding-top / padding-bottom).
    config.grid.tablet.slots = { content: { 'padding-x': '--spacing-3xl' } }

    const onUpdateSlotConfig = vi.fn()
    const { container } = render(
      <Inspector
        {...baseProps}
        onUpdateSlotConfig={onUpdateSlotConfig}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )

    // Padding ←→ row has a reset button when overridden (the only padding
    // field with an override here — padding-shorthand is the override).
    // There are multiple reset buttons across per-BP fields; pick the one
    // paired with the override dot. We find it via title attribute.
    const resetBtn = container.querySelector('button.lm-reset-btn[title="Reset to inherited"]')
    expect(resetBtn, 'reset button renders when override present').not.toBeNull()

    fireEvent.click(resetBtn!)

    // The first arg set: (slotName, key, undefined, gridKey, breakpointId).
    // `key` is whichever per-BP field the reset was wired to — we assert the
    // contract shape, not the exact key (brittle across UI shifts).
    expect(onUpdateSlotConfig).toHaveBeenCalledTimes(1)
    const [slotName, , value, gridKey, bpId] = onUpdateSlotConfig.mock.calls[0]
    expect(slotName).toBe('content')
    expect(value).toBeUndefined()
    expect(gridKey).toBe('tablet')
    expect(bpId).toBe('tablet')
  })

  it('container slot: hides inner-params across EVERY BP (not just desktop)', () => {
    const config = makeConfig({
      outer: {
        'nested-slots': ['inner'],
        'max-width': '615px',
        align: 'center',
      },
      inner: {},
    })

    for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
      const { queryByText, unmount } = render(
        <Inspector
          {...baseProps}
          config={config}
          selectedSlot="outer"
          activeBreakpoint={bp}
          gridKey={bp === 'mobile' ? 'tablet' : bp}
        />,
      )
      expect(queryByText('Inner max-width'), `${bp} @ inner max-width`).toBeNull()
      expect(queryByText('Content align'), `${bp} @ content align`).toBeNull()
      expect(queryByText('Slot Parameters'), `${bp} @ Slot Parameters`).toBeNull()
      unmount()
    }
  })
})

describe('Inspector cluster wrapping (WP-031 phase 3 cut B)', () => {
  afterEach(() => cleanup())

  it('leaf slot: renders cluster-identity, cluster-role, cluster-outer, cluster-inner', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    expect(container.querySelector('[data-cluster-id="cluster-identity"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-role"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-outer"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-inner"]')).not.toBeNull()
    // Container-only cluster absent on leaf
    expect(container.querySelector('[data-cluster-id="cluster-children"]')).toBeNull()
  })

  it('container slot: renders cluster-children, NO cluster-outer or cluster-inner', () => {
    const config = makeConfig({
      outer: { 'nested-slots': ['inner'] },
      inner: {},
    })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="outer"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    expect(container.querySelector('[data-cluster-id="cluster-identity"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-role"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-children"]')).not.toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-outer"]')).toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-inner"]')).toBeNull()
  })

  it('default-open clusters have <details open> attribute (Layout / Spacing equivalents)', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    const role = container.querySelector('[data-cluster-id="cluster-role"]')
    const outer = container.querySelector('[data-cluster-id="cluster-outer"]')
    const inner = container.querySelector('[data-cluster-id="cluster-inner"]')
    // role/outer/inner are open by default per WP §Default open policy
    expect(role?.hasAttribute('open')).toBe(true)
    expect(outer?.hasAttribute('open')).toBe(true)
    expect(inner?.hasAttribute('open')).toBe(true)
  })

  it('diagnostics + references collapsed by default', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    const refs = container.querySelector('[data-cluster-id="cluster-references"]')
    expect(refs).not.toBeNull()
    expect(refs?.hasAttribute('open')).toBe(false)
  })

  it('empty state: cluster-layout-defaults + cluster-references mount once each', () => {
    const config = makeConfig({})
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot={null}
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    expect(container.querySelectorAll('[data-cluster-id="cluster-layout-defaults"]').length).toBe(1)
    expect(container.querySelectorAll('[data-cluster-id="cluster-references"]').length).toBe(1)
    // Selected-slot-only clusters absent in empty state
    expect(container.querySelector('[data-cluster-id="cluster-identity"]')).toBeNull()
    expect(container.querySelector('[data-cluster-id="cluster-role"]')).toBeNull()
  })

  it('cluster identity has no <details>/chevron (always-on)', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    const identity = container.querySelector('[data-cluster-id="cluster-identity"]')
    expect(identity?.tagName.toLowerCase()).toBe('div') // not <details>
  })
})

describe('Inspector scope + override clarity (WP-031 phase 4)', () => {
  afterEach(() => cleanup())

  it('cluster-inner shows override count when innerOverrideCount > 0', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    config.grid.tablet.slots = { content: { padding: '--spacing-3xl' } }
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )
    const inner = container.querySelector('[data-cluster-id="cluster-inner"]')
    const count = inner?.querySelector('.lm-cluster-count')
    expect(count).not.toBeNull()
    expect(count?.textContent).toMatch(/1 override/)
  })

  it('cluster-inner has no count chip when no override at this BP', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )
    const inner = container.querySelector('[data-cluster-id="cluster-inner"]')
    expect(inner?.querySelector('.lm-cluster-count')).toBeNull()
  })

  it('desktop BP: no count chip rendered (scope IS Base)', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    expect(container.querySelector('.lm-cluster-count')).toBeNull()
  })

  it('"Show overridden only" toggle visible at non-desktop BP', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )
    expect(container.querySelector('.lm-filter-toggle')).not.toBeNull()
  })

  it('"Show overridden only" toggle absent at desktop BP', () => {
    const config = makeConfig({ content: {} })
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )
    expect(container.querySelector('.lm-filter-toggle')).toBeNull()
  })

  it('toggling "Show overridden only" sets data-filter on body', () => {
    const config = makeConfig({ content: { padding: '--spacing-xl' } })
    config.grid.tablet.slots = { content: { padding: '--spacing-3xl' } }
    const { container } = render(
      <Inspector
        {...baseProps}
        config={config}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )
    const checkbox = container.querySelector('.lm-filter-toggle input') as HTMLInputElement
    const body = container.querySelector('.lm-inspector__body')
    expect(body?.getAttribute('data-filter')).toBeNull()
    fireEvent.click(checkbox)
    expect(body?.getAttribute('data-filter')).toBe('overridden')
  })
})
