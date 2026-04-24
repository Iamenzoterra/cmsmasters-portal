import type { LayoutConfig, CanvasBreakpointId } from './types'

// Badge precedence (Brain #8): error > warning > info.

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

const CANONICAL: Record<string, CanvasBreakpointId> = {
  desktop: 'desktop', tablet: 'tablet', mobile: 'mobile',
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function validateConfig(
  config: LayoutConfig,
  knownTokens: Record<string, string>,
): ValidationItem[] {
  const items: ValidationItem[] = []

  for (const [bp, grid] of Object.entries(config.grid)) {
    const breakpointId = CANONICAL[bp]
    // Rule 1
    for (const colName of Object.keys(grid.columns)) {
      if (!config.slots[colName]) {
        items.push({
          id: `r1:${bp}:${colName}`,
          severity: 'error',
          message: `Grid "${bp}" column "${colName}" has no slot definition`,
          gridKey: bp, breakpointId, slotName: colName,
        })
      }
    }
    // Rule 3 — overflow
    if (grid['max-width']) {
      const maxWidth = parseInt(grid['max-width'], 10)
      const colWidths = Object.values(grid.columns)
      const fixedWidths = colWidths.filter((w) => w.endsWith('px')).map((w) => parseInt(w, 10))
      if (fixedWidths.length === colWidths.length) {
        const gapToken = grid['column-gap']
        const gapPx = !gapToken || gapToken === '0' ? 0 : parseInt(knownTokens[gapToken] ?? '0', 10)
        const totalGaps = (colWidths.length - 1) * gapPx
        const colTotal = fixedWidths.reduce((a, b) => a + b, 0)
        const total = colTotal + totalGaps
        if (total > maxWidth) {
          items.push({
            id: `r3:${bp}`,
            severity: 'warning',
            message: `Grid "${bp}" overflow: ${total}px > ${maxWidth}px max-width`,
            gridKey: bp, breakpointId,
          })
        }
      }
    }
    // Rule 5
    if (grid.sidebars === 'drawer' && !grid['drawer-trigger']) {
      items.push({
        id: `r5:${bp}`,
        severity: 'error',
        message: `Grid "${bp}" has sidebars:drawer but no drawer-trigger`,
        gridKey: bp, breakpointId,
      })
    }
    // Rule 6
    if (grid.slots) {
      const drawerSlots = Object.entries(grid.slots)
        .filter(([, s]) => s.visibility === 'drawer')
        .map(([name]) => name)
      if (drawerSlots.length && !grid['drawer-trigger'] && grid.sidebars !== 'drawer') {
        items.push({
          id: `r6:${bp}:${drawerSlots.join(',')}`,
          severity: 'error',
          message: `Grid "${bp}" has per-slot visibility:drawer but no drawer-trigger`,
          gridKey: bp, breakpointId, slotName: drawerSlots[0],
        })
      }
    }
  }

  // Rule 2 — unknown tokens
  for (const ref of extractTokenRefs(config)) {
    if (ref !== '0' && !knownTokens[ref]) {
      items.push({
        id: `r2:${ref}`,
        severity: 'warning',
        message: `Unknown token: ${ref}`,
        field: ref,
      })
    }
  }

  // Rule 4 — nested-slots
  validateNestedSlots(config, items)

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
        id: `r4e:${parent}`,
        severity: 'warning',
        message: `slot '${parent}' has empty nested-slots: []`,
        slotName: parent,
      })
      continue
    }
    for (const child of children ?? []) {
      if (!config.slots[child]) {
        items.push({
          id: `r4m:${parent}:${child}`,
          severity: 'error',
          message: `slot '${parent}' references unknown nested slot '${child}'`,
          slotName: parent,
        })
        continue
      }
      if (parentOf[child] && parentOf[child] !== parent) {
        items.push({
          id: `r4p:${child}`,
          severity: 'error',
          message: `slot '${child}' has two parents: '${parentOf[child]}' and '${parent}'`,
          slotName: child,
        })
        continue
      }
      parentOf[child] = parent
    }
  }

  const GRAY = 1, BLACK = 2
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
          id: `r4c:${key}`,
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
