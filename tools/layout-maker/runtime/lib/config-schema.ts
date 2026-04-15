import { z } from 'zod'
import type { TokenMap } from './token-parser.js'

// --- Primitives ---

/** Spacing token reference (--spacing-*) or literal "0" */
const spacingToken = z
  .string()
  .regex(
    /^(--spacing-[\w-]+|0)$/,
    'Must be a spacing token (--spacing-*) or "0"',
  )

/** Structural dimension: px value, 1fr, or calc() */
const structuralDimension = z
  .string()
  .regex(
    /^\d+px$|^1fr$|^calc\(.+\)$/,
    'Must be a px value (e.g. "280px"), "1fr", or calc()',
  )

// --- Breakpoint ---

const slotSchemaPartial = z
  .object({
    position: z.enum(['top', 'bottom']).optional(),
    sticky: z.boolean().optional(),
    'z-index': z.number().optional(),
    padding: spacingToken.optional(),
    'padding-x': spacingToken.optional(),
    'padding-top': spacingToken.optional(),
    'padding-bottom': spacingToken.optional(),
    gap: spacingToken.optional(),
    align: z.enum(['flex-start', 'center', 'flex-end', 'stretch']).optional(),
    'max-width': z.string().regex(/^\d+px$/).optional(),
    'min-height': z.string().regex(/^\d+px$/).optional(),
    'margin-top': spacingToken.optional(),
    background: z.string().optional(),
  })
  .strict()

const breakpointSchema = z.object({
  'min-width': z.string().regex(/^\d+px$/, 'Must be a px value like "1440px"'),
  columns: z.record(z.string(), structuralDimension),
  'column-gap': spacingToken.default('0'),
  'max-width': z.string().regex(/^\d+px$/).optional(),
  center: z.boolean().optional(),
  sidebars: z.enum(['drawer', 'hidden']).optional(),
  'drawer-width': z.string().regex(/^\d+px$/).optional(),
  'drawer-trigger': z.enum(['hamburger', 'tab']).optional(),
  'drawer-position': z.enum(['left', 'right', 'both']).optional(),
  /** Per-breakpoint partial slot overrides (WP-style inheritance). */
  slots: z.record(z.string(), slotSchemaPartial).optional(),
})

// --- Slot ---

const slotSchema = z
  .object({
    position: z.enum(['top', 'bottom']).optional(),
    sticky: z.boolean().optional(),
    'z-index': z.number().optional(),
    padding: spacingToken.optional(),
    'padding-x': spacingToken.optional(),
    'padding-top': spacingToken.optional(),
    'padding-bottom': spacingToken.optional(),
    gap: spacingToken.optional(),
    align: z.enum(['flex-start', 'center', 'flex-end', 'stretch']).optional(),
    'max-width': z.string().regex(/^\d+px$/).optional(),
    'min-height': z.string().regex(/^\d+px$/).optional(),
    'margin-top': spacingToken.optional(),
    background: z.string().optional(),
    'nested-slots': z.array(z.string().min(1)).optional(),
  })
  .strict() // Rejects unknown keys — catches "width" in slots

// --- Full config ---

export const configSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase alphanumeric with hyphens').min(1).optional(),
  name: z.string().min(1),
  scope: z.string().regex(/^[a-z0-9-]+$/, 'Scope must be lowercase alphanumeric with hyphens').min(1),
  description: z.string().optional(),
  background: z.string().optional(),
  extends: z.string().optional(),
  overrides: z
    .object({
      slots: z.record(z.string(), slotSchema.partial()).optional(),
      grid: z.record(z.string(), breakpointSchema.partial()).optional(),
    })
    .optional(),
  grid: z.record(z.string(), breakpointSchema),
  slots: z.record(z.string(), slotSchema),
  'test-blocks': z.record(z.string(), z.array(z.string())).optional(),
})

export type LayoutConfig = z.infer<typeof configSchema>

// --- Cross-field validation ---

// eslint-disable-next-line sonarjs/cognitive-complexity
export function validateConfig(
  config: LayoutConfig,
  knownTokens: TokenMap,
): string[] {
  const errors: string[] = []

  // 1. Grid columns must reference defined slots (content is implicit)
  for (const [bp, grid] of Object.entries(config.grid)) {
    for (const colName of Object.keys(grid.columns)) {
      if (!config.slots[colName]) {
        errors.push(
          `Grid "${bp}" column "${colName}" has no slot definition`,
        )
      }
    }
  }

  // 2. All spacing token references must exist in tokens.css
  const tokenRefs = extractTokenRefs(config)
  for (const ref of tokenRefs) {
    if (ref !== '0' && !knownTokens[ref]) {
      errors.push(`Unknown token: ${ref}`)
    }
  }

  // 3. Grid overflow: fixed columns + gaps > max-width
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
        gapToken === '0'
          ? 0
          : parseInt(knownTokens[gapToken] ?? '0', 10)
      const totalGaps = (colWidths.length - 1) * gapPx
      const colTotal = fixedWidths.reduce((a, b) => a + b, 0)
      const total = colTotal + totalGaps

      if (total > maxWidth) {
        errors.push(
          `Grid "${bp}" overflow: columns (${colTotal}px) + gaps (${totalGaps}px) = ${total}px exceeds max-width (${maxWidth}px)`,
        )
      }
    }
  }

  // 4. nested-slots cross-field validation
  validateNestedSlots(config, errors)

  // 5. Drawer breakpoint requires drawer-trigger
  for (const [bp, grid] of Object.entries(config.grid)) {
    if (grid.sidebars === 'drawer' && !grid['drawer-trigger']) {
      errors.push(
        `Grid "${bp}" has sidebars:drawer but no drawer-trigger`,
      )
    }
  }

  return errors
}

/** nested-slots: existence + single-parent + no-cycles */
function validateNestedSlots(config: LayoutConfig, errors: string[]): void {
  const parentOf: Record<string, string> = {}

  for (const [parent, slot] of Object.entries(config.slots)) {
    const children = slot['nested-slots'] ?? []
    for (const child of children) {
      if (!config.slots[child]) {
        errors.push(
          `slot '${parent}' references nested slot '${child}' which is not declared in slots`,
        )
        continue
      }
      if (parentOf[child] && parentOf[child] !== parent) {
        errors.push(
          `slot '${child}' is nested under both '${parentOf[child]}' and '${parent}' — a slot can only have one parent`,
        )
        continue
      }
      parentOf[child] = parent
    }
  }

  // Cycle detection via DFS coloring
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color: Record<string, number> = {}
  const reported = new Set<string>()

  function dfs(node: string, path: string[]): void {
    if (color[node] === GRAY) {
      const cycleStart = path.indexOf(node)
      const cyclePath = [...path.slice(cycleStart), node]
      const key = cyclePath.join('→')
      if (!reported.has(key)) {
        reported.add(key)
        errors.push(`cycle detected in nested-slots: ${cyclePath.join(' → ')}`)
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

/** Walk config and collect all --spacing-* token references */
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
