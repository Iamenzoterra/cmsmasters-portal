import { describe, it, expect } from 'vitest'
import type { LayoutConfig, SlotConfig } from './types'
import {
  getSlotTraits,
  canShow,
  getFieldScope,
  getSlotBadges,
  type SlotTraits,
  type ScopeCtx,
} from './inspector-capabilities'

/** Minimal layout scaffold — just enough for `getSlotTraits`'s config read. */
function makeConfig(
  slots: Record<string, SlotConfig>,
  columns: Record<string, string> = {},
): LayoutConfig {
  return {
    version: 1,
    name: 'test',
    scope: 'theme',
    slots,
    grid: {
      desktop: {
        'min-width': '1440px',
        columns: columns,
      },
    },
  } satisfies LayoutConfig
}

describe('getSlotTraits', () => {
  // (slot-shape, name, expected-trait-vector) tuples — every row locks one
  // species of slot the Inspector encounters in real layouts.
  const cases: Array<{
    label: string
    name: string
    slot: SlotConfig
    columns?: Record<string, string>
    expected: Partial<SlotTraits>
  }> = [
    {
      label: 'plain leaf slot in grid (custom, non-global)',
      name: 'content',
      slot: {},
      columns: { content: '1fr' },
      expected: {
        isContainer: false,
        isLeaf: true,
        isSidebar: false,
        isTopOrBottom: false,
        isGridParticipant: true,
        supportsPerBreakpoint: true,
        supportsRoleLevelOnly: false,
        hasPositionTop: false,
        hasSticky: false,
        // SLOT_DEFINITIONS = {header, footer, sidebar-left, sidebar-right}.
        isGlobalSlot: false,
      },
    },
    {
      label: 'header is a global slot',
      name: 'header',
      slot: {},
      expected: { isGlobalSlot: true, isLeaf: true },
    },
    {
      label: 'container with nested-slots',
      name: 'content',
      slot: { 'nested-slots': ['theme-blocks'] },
      columns: { content: '1fr' },
      expected: {
        isContainer: true,
        isLeaf: false,
        supportsPerBreakpoint: false,
        supportsRoleLevelOnly: true,
      },
    },
    {
      label: 'container with empty nested-slots array is leaf',
      name: 'content',
      slot: { 'nested-slots': [] },
      expected: { isContainer: false, isLeaf: true },
    },
    {
      label: 'sidebar-left slot',
      name: 'sidebar-left',
      slot: {},
      columns: { 'sidebar-left': '360px' },
      expected: { isSidebar: true, isGridParticipant: true },
    },
    {
      label: 'sidebar-right slot',
      name: 'sidebar-right',
      slot: {},
      columns: { 'sidebar-right': '360px' },
      expected: { isSidebar: true },
    },
    {
      label: 'header with position: top',
      name: 'header',
      slot: { position: 'top' },
      expected: {
        isTopOrBottom: true,
        hasPositionTop: true,
        isGridParticipant: false,
      },
    },
    {
      label: 'footer with position: bottom',
      name: 'footer',
      slot: { position: 'bottom' },
      expected: { isTopOrBottom: true, hasPositionTop: false },
    },
    {
      label: 'sticky top header earns hasSticky',
      name: 'header',
      slot: { position: 'top', sticky: true },
      expected: { hasSticky: true, hasPositionTop: true },
    },
    {
      label: 'custom (non-global) leaf slot',
      name: 'theme-blocks',
      slot: {},
      expected: { isGlobalSlot: false, isLeaf: true },
    },
  ]

  for (const { label, name, slot, columns, expected } of cases) {
    it(label, () => {
      const config = makeConfig({ [name]: slot }, columns)
      const traits = getSlotTraits(name, slot, config, 'desktop')
      for (const [key, val] of Object.entries(expected)) {
        expect(traits[key as keyof SlotTraits], `trait ${key}`).toBe(val)
      }
    })
  }
})

describe('canShow', () => {
  const leafTraits: SlotTraits = {
    isContainer: false,
    isLeaf: true,
    isSidebar: false,
    isTopOrBottom: false,
    isGridParticipant: true,
    supportsPerBreakpoint: true,
    supportsRoleLevelOnly: false,
    hasPositionTop: false,
    hasSticky: false,
    isGlobalSlot: false,
  }
  const containerTraits: SlotTraits = {
    ...leafTraits,
    isContainer: true,
    isLeaf: false,
    supportsPerBreakpoint: false,
    supportsRoleLevelOnly: true,
  }
  const sidebarTraits: SlotTraits = { ...leafTraits, isSidebar: true }
  const topTraits: SlotTraits = {
    ...leafTraits,
    isTopOrBottom: true,
    hasPositionTop: true,
    isGridParticipant: false,
  }
  const stickyTopTraits: SlotTraits = { ...topTraits, hasSticky: true }
  const globalLeafTraits: SlotTraits = { ...leafTraits, isGlobalSlot: true }

  const desktopScope: ScopeCtx = { currentBp: 'desktop', hasOverride: false, isGridField: false }
  const tabletScope: ScopeCtx = { currentBp: 'tablet', hasOverride: false, isGridField: false }

  const rows: Array<{
    field: string
    traits: SlotTraits
    scope: ScopeCtx
    expected: boolean
    note: string
  }> = [
    // Container vs leaf section gates
    { field: 'container-panel', traits: containerTraits, scope: desktopScope, expected: true, note: 'container shows container-panel' },
    { field: 'container-panel', traits: leafTraits, scope: desktopScope, expected: false, note: 'leaf hides container-panel' },
    { field: 'slot-area-section', traits: leafTraits, scope: desktopScope, expected: true, note: 'leaf shows slot-area' },
    { field: 'slot-area-section', traits: containerTraits, scope: desktopScope, expected: false, note: 'container hides slot-area' },
    { field: 'slot-parameters-section', traits: leafTraits, scope: desktopScope, expected: true, note: 'leaf shows params' },
    { field: 'slot-parameters-section', traits: containerTraits, scope: desktopScope, expected: false, note: 'container hides params' },

    // Role-level gates
    { field: 'position', traits: leafTraits, scope: desktopScope, expected: true, note: 'position always shown' },
    { field: 'position', traits: containerTraits, scope: desktopScope, expected: true, note: 'position on container' },
    { field: 'sticky', traits: topTraits, scope: desktopScope, expected: true, note: 'sticky requires position=top' },
    { field: 'sticky', traits: leafTraits, scope: desktopScope, expected: false, note: 'no sticky on non-top' },
    { field: 'z-index', traits: stickyTopTraits, scope: desktopScope, expected: true, note: 'z-index requires sticky' },
    { field: 'z-index', traits: topTraits, scope: desktopScope, expected: false, note: 'no z-index without sticky' },
    { field: 'allowed-block-types', traits: leafTraits, scope: desktopScope, expected: true, note: 'custom leaf shows types' },
    { field: 'allowed-block-types', traits: globalLeafTraits, scope: desktopScope, expected: false, note: 'global leaf hides types' },
    { field: 'allowed-block-types', traits: containerTraits, scope: desktopScope, expected: false, note: 'container hides types' },
    { field: 'drawer-trigger-label', traits: sidebarTraits, scope: desktopScope, expected: true, note: 'sidebar shows trigger label' },
    { field: 'drawer-trigger-label', traits: leafTraits, scope: desktopScope, expected: false, note: 'non-sidebar hides trigger label' },
    { field: 'drawer-trigger-icon', traits: sidebarTraits, scope: desktopScope, expected: true, note: 'sidebar shows trigger icon' },
    { field: 'drawer-trigger-color', traits: sidebarTraits, scope: desktopScope, expected: true, note: 'sidebar shows trigger color' },

    // Per-BP scope-gated
    { field: 'visibility', traits: leafTraits, scope: tabletScope, expected: true, note: 'leaf+tablet shows visibility' },
    { field: 'visibility', traits: leafTraits, scope: desktopScope, expected: false, note: 'leaf+desktop hides visibility' },
    { field: 'visibility', traits: containerTraits, scope: tabletScope, expected: false, note: 'container hides visibility' },
    { field: 'order', traits: leafTraits, scope: tabletScope, expected: true, note: 'leaf+tablet shows order' },
    { field: 'order', traits: containerTraits, scope: tabletScope, expected: false, note: 'container hides order' },

    // Column width
    { field: 'column-width', traits: leafTraits, scope: desktopScope, expected: true, note: 'grid participant shows column-width' },
    { field: 'column-width', traits: topTraits, scope: desktopScope, expected: false, note: 'positioned slot hides column-width' },

    // Unknown field
    { field: 'nonexistent', traits: leafTraits, scope: desktopScope, expected: false, note: 'unknown field → false' },
  ]

  for (const { field, traits, scope, expected, note } of rows) {
    it(`${note}: canShow('${field}') → ${expected}`, () => {
      expect(canShow(field, traits, scope)).toBe(expected)
    })
  }

  // PARITY-LOG lock — the whole point of this phase
  it('container PARITY lock: inner-params reject on container at EVERY BP', () => {
    const innerFields = [
      'max-width', 'align', 'padding-x', 'padding-top', 'padding-bottom',
      'gap', 'min-height', 'margin-top',
      'border-sides', 'border-width', 'border-color',
    ] as const
    const bps: Array<ScopeCtx['currentBp']> = ['desktop', 'tablet', 'mobile']
    for (const bp of bps) {
      const scope: ScopeCtx = { currentBp: bp, hasOverride: false, isGridField: false }
      for (const f of innerFields) {
        expect(canShow(f, containerTraits, scope), `${f} @ ${bp}`).toBe(false)
      }
    }
  })
})

describe('canShow — cluster aliases (WP-031 phase 3)', () => {
  const leafTraits: SlotTraits = {
    isContainer: false, isLeaf: true, isSidebar: false, isTopOrBottom: false,
    isGridParticipant: true, supportsPerBreakpoint: true, supportsRoleLevelOnly: false,
    hasPositionTop: false, hasSticky: false, isGlobalSlot: false,
  }
  const containerTraits: SlotTraits = {
    ...leafTraits, isContainer: true, isLeaf: false,
    supportsPerBreakpoint: false, supportsRoleLevelOnly: true,
  }
  const sidebarTraits: SlotTraits = { ...leafTraits, isSidebar: true }
  const stickyTopTraits: SlotTraits = {
    ...leafTraits, isTopOrBottom: true, hasPositionTop: true, hasSticky: true,
  }

  const desktopScope: ScopeCtx = { currentBp: 'desktop', hasOverride: false, isGridField: false }
  const tabletScope: ScopeCtx = { currentBp: 'tablet', hasOverride: false, isGridField: false }

  it('cluster-identity always shows (slot-selected sentinel)', () => {
    expect(canShow('cluster-identity', leafTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-identity', containerTraits, desktopScope)).toBe(true)
  })

  it('cluster-references always shows (utility zone available)', () => {
    expect(canShow('cluster-references', leafTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-references', containerTraits, desktopScope)).toBe(true)
  })

  it('cluster-spacing → true for leaf (any padding/gap field shows)', () => {
    expect(canShow('cluster-spacing', leafTraits, desktopScope)).toBe(true)
  })

  it('cluster-spacing → false for container (PARITY lock cascades)', () => {
    expect(canShow('cluster-spacing', containerTraits, desktopScope)).toBe(false)
  })

  it('cluster-frame → true for leaf, false for container', () => {
    expect(canShow('cluster-frame', leafTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-frame', containerTraits, desktopScope)).toBe(false)
  })

  it('cluster-children → true for container, false for leaf', () => {
    expect(canShow('cluster-children', containerTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-children', leafTraits, desktopScope)).toBe(false)
  })

  it('cluster-drawer-trigger → true for sidebar, false for non-sidebar', () => {
    expect(canShow('cluster-drawer-trigger', sidebarTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-drawer-trigger', leafTraits, desktopScope)).toBe(false)
    expect(canShow('cluster-drawer-trigger', containerTraits, desktopScope)).toBe(false)
  })

  it('cluster-behavior → true when any of sticky/z-index/allowed-block-types is active', () => {
    // sticky requires position=top; allowed-block-types requires non-global leaf
    expect(canShow('cluster-behavior', leafTraits, desktopScope)).toBe(true) // allowed-block-types
    expect(canShow('cluster-behavior', stickyTopTraits, desktopScope)).toBe(true) // sticky + z-index
  })

  it('cluster-layout → true for leaf with grid participation', () => {
    expect(canShow('cluster-layout', leafTraits, desktopScope)).toBe(true) // column-width
    expect(canShow('cluster-layout', leafTraits, tabletScope)).toBe(true) // visibility/order
  })

  it('cluster-diagnostics → true for leaf (usable-width)', () => {
    expect(canShow('cluster-diagnostics', leafTraits, desktopScope)).toBe(true)
    expect(canShow('cluster-diagnostics', containerTraits, desktopScope)).toBe(false)
  })

  it('unknown cluster-* ID returns false (no silent passthrough)', () => {
    expect(canShow('cluster-bogus', leafTraits, desktopScope)).toBe(false)
  })

  it('alias backwards-compat: old field-level IDs continue to work', () => {
    // Cluster ID adds a new resolution path; old field IDs unchanged.
    expect(canShow('padding-x', leafTraits, desktopScope)).toBe(true)
    expect(canShow('padding-x', containerTraits, desktopScope)).toBe(false)
    expect(canShow('drawer-trigger-label', sidebarTraits, desktopScope)).toBe(true)
  })
})

describe('getSlotBadges', () => {
  const leafTraits: SlotTraits = {
    isContainer: false, isLeaf: true, isSidebar: false, isTopOrBottom: false,
    isGridParticipant: true, supportsPerBreakpoint: true, supportsRoleLevelOnly: false,
    hasPositionTop: false, hasSticky: false, isGlobalSlot: false,
  }

  it('plain leaf → [leaf]', () => {
    expect(getSlotBadges(leafTraits)).toEqual(['leaf'])
  })

  it('container → [container]', () => {
    expect(getSlotBadges({ ...leafTraits, isContainer: true, isLeaf: false })).toEqual(['container'])
  })

  it('sidebar leaf → concurrent [leaf, sidebar]', () => {
    expect(getSlotBadges({ ...leafTraits, isSidebar: true })).toEqual(['leaf', 'sidebar'])
  })

  it('sidebar + top → concurrent [leaf, sidebar, top] (Brain #5: no precedence collapse)', () => {
    const t = { ...leafTraits, isSidebar: true, isTopOrBottom: true, hasPositionTop: true }
    expect(getSlotBadges(t, 'top')).toEqual(['leaf', 'sidebar', 'top'])
  })

  it('bottom-positioned leaf → [leaf, bottom]', () => {
    expect(getSlotBadges({ ...leafTraits, isTopOrBottom: true }, 'bottom')).toEqual(['leaf', 'bottom'])
  })
})

describe('getFieldScope', () => {
  const leafTraits: SlotTraits = {
    isContainer: false, isLeaf: true, isSidebar: false, isTopOrBottom: false,
    isGridParticipant: true, supportsPerBreakpoint: true, supportsRoleLevelOnly: false,
    hasPositionTop: false, hasSticky: false, isGlobalSlot: false,
  }
  const containerTraits: SlotTraits = {
    ...leafTraits, isContainer: true, isLeaf: false, supportsPerBreakpoint: false, supportsRoleLevelOnly: true,
  }

  it('role-level field → role', () => {
    expect(getFieldScope('position', leafTraits, 'tablet', { hasOverrideAtBp: true })).toBe('role')
    expect(getFieldScope('sticky', leafTraits, 'mobile', { hasOverrideAtBp: false })).toBe('role')
  })

  it('per-BP field at desktop → base', () => {
    expect(getFieldScope('padding', leafTraits, 'desktop', { hasOverrideAtBp: false })).toBe('base')
  })

  it('per-BP field at tablet with override → tablet-override', () => {
    expect(getFieldScope('padding', leafTraits, 'tablet', { hasOverrideAtBp: true })).toBe('tablet-override')
  })

  it('per-BP field at mobile with override → mobile-override', () => {
    expect(getFieldScope('gap', leafTraits, 'mobile', { hasOverrideAtBp: true })).toBe('mobile-override')
  })

  it('per-BP field at tablet without override → base (inherited)', () => {
    expect(getFieldScope('padding', leafTraits, 'tablet', { hasOverrideAtBp: false })).toBe('base')
  })

  it('grid-level field → grid-level (Brain #6 reserved value)', () => {
    expect(getFieldScope('column-width', leafTraits, 'desktop', { hasOverrideAtBp: false })).toBe('grid-level')
    expect(getFieldScope('grid-sidebars', leafTraits, 'tablet', { hasOverrideAtBp: true })).toBe('grid-level')
  })

  it('container at tablet on any non-role field → base (containers do not accept per-BP)', () => {
    expect(getFieldScope('padding', containerTraits, 'tablet', { hasOverrideAtBp: true })).toBe('base')
  })
})
