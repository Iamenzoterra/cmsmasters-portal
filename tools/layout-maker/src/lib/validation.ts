import type { LayoutConfig, CanvasBreakpointId } from './types'
import { CANVAS_BREAKPOINTS } from './types'

// Phase 3 Task 3.2 — structured validation surface.
// Pure TS. Safe to import from both src/ (React) and runtime/ (Node).
// Badge precedence (Brain decision #8): error > warning > info.

export type ValidationSeverity = 'error' | 'warning'

export interface ValidationItem {
  id: string
  severity: ValidationSeverity
  message: string
  slotName?: string
  breakpointId?: CanvasBreakpointId
  gridKey?: string
  layoutId?: string
  field?: string
}

export interface ValidationState {
  errors: ValidationItem[]
  warnings: ValidationItem[]
}

const CANONICAL_BP_IDS = new Set<string>(CANVAS_BREAKPOINTS.map((b) => b.id))

function asBreakpointId(key: string): CanvasBreakpointId | undefined {
  return CANONICAL_BP_IDS.has(key) ? (key as CanvasBreakpointId) : undefined
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function validateConfig(
  config: LayoutConfig,
  knownTokens: Record<string, string>,
): ValidationItem[] {
  const items: ValidationItem[] = []

  // Rule 1 — grid columns must reference defined slots (error).
  for (const [bp, grid] of Object.entries(config.grid)) {
    for (const colName of Object.keys(grid.columns)) {
      if (!config.slots[colName]) {
        items.push({
          id: `grid-missing-slot:${bp}:${colName}`,
          severity: 'error',
          message: `Grid "${bp}" column "${colName}" has no slot definition`,
          gridKey: bp,
          breakpointId: asBreakpointId(bp),
          slotName: colName,
        })
      }
    }
  }

  // Rule 2 — all spacing-token refs must exist (warning: layout still renders with fallback).
  const tokenRefs = extractTokenRefs(config)
  for (const ref of tokenRefs) {
    if (ref !== '0' && !knownTokens[ref]) {
      items.push({
        id: `unknown-token:${ref}`,
        severity: 'warning',
        message: `Unknown token: ${ref}`,
        field: ref,
      })
    }
  }

  // Rule 3 — grid overflow (warning: reflects a sizing choice, not a structural break).
  for (const [bp, grid] of Object.entries(config.grid)) {
    if (!grid['max-width']) continue
    const maxWidth = parseInt(grid['max-width'], 10)
    const colWidths = Object.values(grid.columns)
    const fixedWidths = colWidths
      .filter((w) => w.endsWith('px'))
      .map((w) => parseInt(w, 10))

    if (fixedWidths.length === colWidths.length) {
      const gapToken = grid['column-gap']
      const gapPx =
        gapToken === '0' || gapToken === undefined
          ? 0
          : parseInt(knownTokens[gapToken] ?? '0', 10)
      const totalGaps = (colWidths.length - 1) * gapPx
      const colTotal = fixedWidths.reduce((a, b) => a + b, 0)
      const total = colTotal + totalGaps

      if (total > maxWidth) {
        items.push({
          id: `grid-overflow:${bp}`,
          severity: 'warning',
          message: `Grid "${bp}" overflow: columns (${colTotal}px) + gaps (${totalGaps}px) = ${total}px exceeds max-width (${maxWidth}px)`,
          gridKey: bp,
          breakpointId: asBreakpointId(bp),
        })
      }
    }
  }

  // Rule 4 — nested-slots: empty-list (warning) + missing/multi-parent/cycle (error).
  validateNestedSlots(config, items)

  // Rule 5 — drawer breakpoint requires drawer-trigger (error: drawer renders with no open affordance).
  for (const [bp, grid] of Object.entries(config.grid)) {
    if (grid.sidebars === 'drawer' && !grid['drawer-trigger']) {
      items.push({
        id: `drawer-no-trigger:${bp}`,
        severity: 'error',
        message: `Grid "${bp}" has sidebars:drawer but no drawer-trigger`,
        gridKey: bp,
        breakpointId: asBreakpointId(bp),
      })
    }
  }

  // Rule 6 — per-slot drawer visibility requires drawer-trigger (error: same as rule 5).
  for (const [bp, grid] of Object.entries(config.grid)) {
    if (!grid.slots) continue
    const slotsWithDrawer = Object.entries(grid.slots)
      .filter(([, s]) => s.visibility === 'drawer')
      .map(([name]) => name)
    if (slotsWithDrawer.length > 0 && !grid['drawer-trigger'] && grid.sidebars !== 'drawer') {
      items.push({
        id: `per-slot-drawer-no-trigger:${bp}:${slotsWithDrawer.join(',')}`,
        severity: 'error',
        message: `Grid "${bp}" has per-slot visibility:drawer but no drawer-trigger`,
        gridKey: bp,
        breakpointId: asBreakpointId(bp),
        slotName: slotsWithDrawer[0],
      })
    }
  }

  return items
}

/** Back-compat shim: flattens items to messages for runtime callers that
 *  still surface a `string[]` body in HTTP error responses. */
export function validateConfigMessages(
  config: LayoutConfig,
  knownTokens: Record<string, string>,
): string[] {
  return validateConfig(config, knownTokens).map((i) => i.message)
}

/** Split validation output by severity. Pure function. */
export function deriveValidationState(
  config: LayoutConfig,
  knownTokens: Record<string, string>,
): ValidationState {
  const items = validateConfig(config, knownTokens)
  const errors: ValidationItem[] = []
  const warnings: ValidationItem[] = []
  for (const item of items) {
    if (item.severity === 'error') errors.push(item)
    else warnings.push(item)
  }
  return { errors, warnings }
}

function validateNestedSlots(
  config: LayoutConfig,
  items: ValidationItem[],
): void {
  const parentOf: Record<string, string> = {}

  for (const [parent, slot] of Object.entries(config.slots)) {
    const children = slot['nested-slots']
    if (children !== undefined && children.length === 0) {
      items.push({
        id: `nested-empty:${parent}`,
        severity: 'warning',
        message: `slot '${parent}' has empty nested-slots: [] — remove the key if the slot has no children`,
        slotName: parent,
      })
      continue
    }
    for (const child of children ?? []) {
      if (!config.slots[child]) {
        items.push({
          id: `nested-missing:${parent}:${child}`,
          severity: 'error',
          message: `slot '${parent}' references nested slot '${child}' which is not declared in slots`,
          slotName: parent,
        })
        continue
      }
      if (parentOf[child] && parentOf[child] !== parent) {
        items.push({
          id: `nested-multi-parent:${child}`,
          severity: 'error',
          message: `slot '${child}' is nested under both '${parentOf[child]}' and '${parent}' — a slot can only have one parent`,
          slotName: child,
        })
        continue
      }
      parentOf[child] = parent
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2
  const color: Record<string, number> = {}
  const reported = new Set<string>()

  function dfs(node: string, path: string[]): void {
    if (color[node] === GRAY) {
      const cycleStart = path.indexOf(node)
      const cyclePath = [...path.slice(cycleStart), node]
      const key = cyclePath.join('->')
      if (!reported.has(key)) {
        reported.add(key)
        items.push({
          id: `nested-cycle:${key}`,
          severity: 'error',
          message: `cycle detected in nested-slots: ${cyclePath.join(' -> ')}`,
          slotName: cyclePath[0],
        })
      }
      return
    }
    if (color[node] === BLACK) return
    color[node] = GRAY
    const children = config.slots[node]?.['nested-slots'] ?? []
    for (const c of children) {
      if (config.slots[c]) dfs(c, [...path, node])
    }
    color[node] = BLACK
  }

  for (const slot of Object.keys(config.slots)) {
    if (color[slot] === undefined) dfs(slot, [])
  }
  void WHITE
}

function extractTokenRefs(obj: unknown): string[] {
  const refs: string[] = []

  function walk(value: unknown) {
    if (typeof value === 'string' && value.startsWith('--spacing-')) {
      refs.push(value)
    } else if (typeof value === 'object' && value !== null) {
      for (const v of Object.values(value)) {
        walk(v)
      }
    }
  }

  walk(obj)
  return [...new Set(refs)]
}
