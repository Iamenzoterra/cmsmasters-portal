/**
 * Inspector capability dispatcher — single source of truth for:
 *   (1) what kind of slot the user is editing (`SlotTraits`)
 *   (2) whether a given field should render (`canShow`)
 *   (3) which scope an edit writes to (`getFieldScope`)
 *   (4) which trait badges the slot earns (`getSlotBadges`)
 *
 * Pure: all four functions read only the arguments handed in. No DOM, no
 * config-state access beyond what's passed. Moving the scattered
 * `isContainer && ...`, `position === 'top' && ...`, etc. gates from
 * `Inspector.tsx` into this file (LM-reforge Phase 4) makes every gate
 * auditable in one place — and lets a single table test lock them against
 * regression.
 *
 * Closes the `[tablet] align + max-width on container slots are silently
 * ignored` PARITY-LOG entry at the Inspector layer: `canShow` hard-rejects
 * inner-params for containers, so the Inspector can never again expose a
 * field the generator won't honor.
 */

import { SLOT_DEFINITIONS } from '@cmsmasters/db/slots'
import type { CanvasBreakpointId, LayoutConfig, SlotConfig } from './types'

const GLOBAL_SLOT_NAMES: Set<string> = new Set(SLOT_DEFINITIONS.map((s) => s.name))

export interface SlotTraits {
  /** Slot holds child slots (`nested-slots` non-empty). */
  isContainer: boolean
  /** Slot holds blocks directly (no `nested-slots`). Inverse of `isContainer`. */
  isLeaf: boolean
  /** Name contains `sidebar` — earns drawer-trigger role fields. */
  isSidebar: boolean
  /** `position: top | bottom` — earns the full-width-locked indicator. */
  isTopOrBottom: boolean
  /** Lives in grid columns at the current BP AND isn't top/bottom positioned. */
  isGridParticipant: boolean
  /** Accepts per-BP visual overrides (leaves only — containers reject them
   *  at the schema/PARITY level). */
  supportsPerBreakpoint: boolean
  /** Inverse of `supportsPerBreakpoint` — restricted to role-level only. */
  supportsRoleLevelOnly: boolean
  /** Slot's base position is `top` (gates the Sticky checkbox). */
  hasPositionTop: boolean
  /** Slot's base has `sticky: true` (gates the Z-index input). */
  hasSticky: boolean
  /** Name matches one of the global slot definitions (hides allowed-block-types). */
  isGlobalSlot: boolean
}

export interface ScopeCtx {
  /** Currently-viewed canonical breakpoint. */
  currentBp: CanvasBreakpointId
  /** A per-BP override is present for this field at `currentBp`. */
  hasOverride: boolean
  /** Field is a grid-level property (e.g. `grid.columns`), not a slot field. */
  isGridField: boolean
}

export type FieldScope =
  | 'base'
  | 'role'
  | 'tablet-override'
  | 'mobile-override'
  | 'grid-level'

/** Builds the trait vector for a given slot at a given breakpoint. Pure. */
export function getSlotTraits(
  slotName: string,
  slot: SlotConfig,
  config: LayoutConfig,
  _bp: CanvasBreakpointId,
): SlotTraits {
  const nested = slot['nested-slots']
  const isContainer = Array.isArray(nested) && nested.length > 0
  const isLeaf = !isContainer
  const isSidebar = slotName.includes('sidebar')
  const isTopOrBottom = slot.position === 'top' || slot.position === 'bottom'
  const hasPositionTop = slot.position === 'top'
  const hasSticky = slot.sticky === true
  const isGlobalSlot = GLOBAL_SLOT_NAMES.has(slotName)

  // Grid participant: present in grid.columns at any BP AND not top/bottom positioned.
  const inAnyGridColumns = Object.values(config.grid).some(
    (g) => g.columns && slotName in g.columns,
  )
  const isGridParticipant = inAnyGridColumns && !isTopOrBottom

  return {
    isContainer,
    isLeaf,
    isSidebar,
    isTopOrBottom,
    isGridParticipant,
    supportsPerBreakpoint: isLeaf,
    supportsRoleLevelOnly: isContainer,
    hasPositionTop,
    hasSticky,
    isGlobalSlot,
  }
}

/** Pure dispatcher: should a given Inspector field render? */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function canShow(
  fieldId: string,
  traits: SlotTraits,
  scope: ScopeCtx,
): boolean {
  const nonDesktop = scope.currentBp !== 'desktop'

  switch (fieldId) {
    // Section / indicator gates
    case 'container-badge':
    case 'container-panel':
      return traits.isContainer
    case 'slot-area-section':
    case 'slot-parameters-section':
    case 'property-rows':
    case 'usable-width':
      return traits.isLeaf
    case 'full-width-note':
      return traits.isTopOrBottom

    // Role-level fields
    case 'position':
    case 'nested-slots':
    case 'background':
      return true
    case 'sticky':
      return traits.hasPositionTop
    case 'z-index':
      return traits.hasSticky
    case 'allowed-block-types':
      return traits.isLeaf && !traits.isGlobalSlot
    case 'drawer-trigger-label':
    case 'drawer-trigger-icon':
    case 'drawer-trigger-color':
      return traits.isSidebar

    // Per-BP inner-params — PARITY contract: containers NEVER expose these
    case 'max-width':
    case 'align':
    case 'padding':
    case 'padding-x':
    case 'padding-top':
    case 'padding-bottom':
    case 'gap':
    case 'min-height':
    case 'margin-top':
    case 'border-sides':
    case 'border-width':
    case 'border-color':
      return traits.isLeaf

    // Per-BP scope-gated (leaf-only + non-desktop)
    case 'visibility':
    case 'order':
      return traits.isLeaf && nonDesktop

    // Column width — only for grid participants, never top/bottom
    case 'column-width':
      return traits.isGridParticipant

    default:
      return false
  }
}

/** Which scope an edit on `fieldId` writes to. Pure. */
export function getFieldScope(
  fieldId: string,
  traits: SlotTraits,
  currentBp: CanvasBreakpointId,
  slotState: { hasOverrideAtBp: boolean },
): FieldScope {
  const ROLE_FIELDS = new Set([
    'position',
    'sticky',
    'z-index',
    'nested-slots',
    'allowed-block-types',
    'drawer-trigger-label',
    'drawer-trigger-icon',
    'drawer-trigger-color',
  ])
  const GRID_FIELDS = new Set(['column-width', 'grid-sidebars', 'grid-drawer-width'])

  if (GRID_FIELDS.has(fieldId)) return 'grid-level'
  if (ROLE_FIELDS.has(fieldId)) return 'role'

  // Containers only accept role-level, but any non-role field on a container
  // surfaces as 'base' since there's no per-BP concept for containers.
  if (traits.supportsRoleLevelOnly) return 'base'

  if (currentBp === 'desktop') return 'base'
  if (!slotState.hasOverrideAtBp) return 'base'
  return currentBp === 'tablet' ? 'tablet-override' : 'mobile-override'
}

/** Concurrent badge set — a sidebar+top slot earns BOTH `sidebar` and `top`
 *  pills. Never collapsed to a single precedence winner (Brain #5 decision). */
export type SlotBadge = 'leaf' | 'container' | 'sidebar' | 'top' | 'bottom'

export function getSlotBadges(
  traits: SlotTraits,
  position?: 'top' | 'bottom',
): SlotBadge[] {
  const badges: SlotBadge[] = []
  if (traits.isContainer) badges.push('container')
  else badges.push('leaf')
  if (traits.isSidebar) badges.push('sidebar')
  if (position === 'top') badges.push('top')
  else if (position === 'bottom') badges.push('bottom')
  return badges
}
