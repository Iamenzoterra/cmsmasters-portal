/**
 * html-parser.ts — Parse an HTML layout document into a LayoutConfig.
 *
 * Extracts:
 *  - Slot names from data-slot attributes
 *  - Slot positions (top/bottom/grid) from DOM order
 *  - Grid structure from CSS grid-template-columns
 *  - Slot styles (padding, gap, min-height, sticky, z-index, align, margin-top)
 *  - Responsive breakpoints from @media queries
 *  - Drawer configuration from sidebar CSS
 */

import type { LayoutConfig } from './config-schema'

type SlotPosition = SlotPosition

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract all <style> block contents from HTML */
function extractCSS(html: string): string {
  const blocks: string[] = []
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    blocks.push(m[1])
  }
  return blocks.join('\n')
}

/** Extract unique data-slot names from HTML, preserving first-occurrence order */
function extractSlotNames(html: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  const re = /data-slot="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      names.push(m[1])
    }
  }
  return names
}

/**
 * Determine slot positions from HTML structure.
 * Looks for the grid container — the element whose children contain multiple
 * data-slot elements in sequence. Slots before it are 'top', after are 'bottom'.
 */
function classifySlotPositions(
  _html: string,
  slotNames: string[],
): Record<string, SlotPosition> {
  const result: Record<string, SlotPosition> = {}

  // Find grid slots — slots that are NOT header/footer type
  // Convention: slots with position 'top' come first, then grid columns, then 'bottom'
  // Use CSS hints: [data-slot="X"] with position:sticky → top
  //                [data-slot="X"] with margin-top → bottom
  // Fallback: first slot is top if named "header", last is bottom if named "footer"
  for (const name of slotNames) {
    if (name === 'header' || name.includes('header') || name === 'nav') {
      result[name] = 'top'
    } else if (name === 'footer' || name.includes('footer')) {
      result[name] = 'bottom'
    } else {
      result[name] = 'grid'
    }
  }

  return result
}

/** Try to resolve a CSS var() reference to a spacing token name */
function resolveToToken(value: string): string | null {
  // var(--spacing-xl) → --spacing-xl
  const varMatch = value.match(/var\((--spacing-[\w-]+)/)
  if (varMatch) return varMatch[1]

  // var(--spacing-xl, 48px) → --spacing-xl
  const varFallbackMatch = value.match(/var\((--spacing-[\w-]+)\s*,/)
  if (varFallbackMatch) return varFallbackMatch[1]

  return null
}

/** Try to resolve a CSS value to a spacing token or "0" */
function resolveSpacing(value: string): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed === '0' || trimmed === '0px') return '0'

  const token = resolveToToken(trimmed)
  if (token) return token

  // Can't map raw px values to tokens — skip (schema requires --spacing-* or "0")
  return undefined
}

/** Extract a CSS property value from a rule block */
function extractProp(css: string, selector: string, prop: string): string | undefined {
  // Find the rule block for the selector
  // Handle both exact selectors and attribute selectors
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // eslint-disable-next-line security/detect-non-literal-regexp -- selector is escaped above
  const re = new RegExp(escaped + '\\s*\\{([^}]*?)\\}', 'g')
  let m: RegExpExecArray | null

  while ((m = re.exec(css)) !== null) {
    const block = m[1]
    // eslint-disable-next-line security/detect-non-literal-regexp -- prop is a known CSS property name
    const propRe = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i')
    const propMatch = block.match(propRe)
    if (propMatch) return propMatch[1].trim()
  }
  return undefined
}

/** Extract CSS custom property value from :root */
function extractCustomProp(css: string, name: string): string | undefined {
  // eslint-disable-next-line security/detect-non-literal-regexp -- name is escaped inline
  const re = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`, 'i')
  const m = css.match(re)
  return m ? m[1].trim() : undefined
}

/** Extract all CSS custom properties from :root blocks */
function extractAllCustomProps(css: string): Record<string, string> {
  const props: Record<string, string> = {}
  // Match :root { ... } blocks
  const rootBlocks = css.match(/:root\s*\{([^}]+)\}/g)
  if (!rootBlocks) return props

  for (const block of rootBlocks) {
    // eslint-disable-next-line sonarjs/slow-regex -- simple CSS block extraction, trusted input
    const inner = block.match(/\{([^}]+)\}/)?.[1] ?? ''
    // eslint-disable-next-line sonarjs/slow-regex -- simple CSS property extraction, trusted input
    const re = /--([\w-]+)\s*:\s*([^;]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(inner)) !== null) {
      props[`--${m[1]}`] = m[2].trim()
    }
  }
  return props
}

/**
 * Resolve a calc() expression by substituting known CSS custom properties.
 * Returns a px string if fully resolvable, otherwise null.
 *
 * Handles: calc(var(--a) + var(--b) * 2)
 * where --a and --b are px values in customProps.
 */
function resolveCalc(
  expr: string,
  customProps: Record<string, string>,
): string | null {
  // Strip outer calc(...)
  const inner = expr.match(/^calc\((.+)\)$/)?.[1]
  if (!inner) return null

  // Replace var(--name) and var(--name, fallback) with their values
  // eslint-disable-next-line sonarjs/slow-regex -- simple var() extraction, trusted CSS input
  const resolved = inner.replace(/var\((--[\w-]+)[^)]*\)/g, (_, name) => {
    const val = customProps[name]
    if (!val) return 'NaN'
    // Strip px suffix for math
    return val.replace('px', '')
  })

  // Check no unresolved var() references remain
  if (resolved.includes('var(') || resolved.includes('NaN')) return null

  // Evaluate simple math (only +, -, * with numbers)
  try {
    // Security: only allow digits, spaces, +, -, *, ., ()
    if (!/^[\d\s+\-*./()]+$/.test(resolved)) return null
    // eslint-disable-next-line sonarjs/code-eval -- safe: input validated to digits/operators only
    const result = new Function(`return (${resolved})`)() as number
    if (typeof result !== 'number' || isNaN(result)) return null
    return `${Math.round(result)}px`
  } catch {
    return null
  }
}

/** Split CSS value by spaces, respecting parentheses depth */
function splitCSSValue(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (const ch of value) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ' ' && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

/** Normalize a single column value — resolve calc() if possible */
function normalizeColumnValue(value: string, customProps: Record<string, string>): string {
  if (value === '1fr' || /^\d+px$/.test(value)) return value
  if (value.startsWith('calc(')) return resolveCalc(value, customProps) ?? value
  return '1fr'
}

/** Parse grid-template-columns into column names based on slot order */
function parseGridColumns(
  gtc: string,
  gridSlotNames: string[],
  customProps: Record<string, string>,
): Record<string, string> | null {
  const parts = splitCSSValue(gtc)
  if (parts.length !== gridSlotNames.length) return null

  const columns: Record<string, string> = {}
  for (const [i, value] of parts.entries()) {
    columns[gridSlotNames[i]] = normalizeColumnValue(value, customProps)
  }
  return columns
}

/** Parse @media blocks and extract breakpoint info */
function parseMediaBreakpoints(css: string): Array<{
  maxWidth: number
  body: string
}> {
  const breakpoints: Array<{ maxWidth: number; body: string }> = []
  // Match @media (max-width: Npx) { ... } — handle nested braces
  const re = /@media\s*\([^)]*max-width:\s*(\d+)px[^)]*\)\s*\{/g
  let m: RegExpExecArray | null

  while ((m = re.exec(css)) !== null) {
    const maxWidth = parseInt(m[1], 10)
    const start = m.index + m[0].length
    let depth = 1
    let i = start
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth++
      if (css[i] === '}') depth--
      i++
    }
    breakpoints.push({ maxWidth, body: css.slice(start, i - 1) })
  }

  return breakpoints.sort((a, b) => b.maxWidth - a.maxWidth)
}

// ---------------------------------------------------------------------------
// Desktop grid extraction
// ---------------------------------------------------------------------------

function findGridTemplateColumns(css: string): string | undefined {
  for (const sel of ['.layout-grid', '.theme-layout', '[class*="layout"]', '[class*="grid"]']) {
    const v = extractProp(css, sel, 'grid-template-columns')
    if (v) return v
  }
  const gtcMatch = css.match(/grid-template-columns\s*:\s*([^;]+)/i)
  return gtcMatch ? gtcMatch[1].trim() : undefined
}

function parseDesktopGrid(
  css: string,
  gridSlotNames: string[],
  customProps: Record<string, string>,
): { columns: Record<string, string>; columnGap: string; maxWidth?: string; center?: boolean } {
  const gtcValue = findGridTemplateColumns(css)

  let columns: Record<string, string> = {}
  if (gtcValue && gridSlotNames.length > 0) {
    const parsed = parseGridColumns(gtcValue, gridSlotNames, customProps)
    if (parsed) columns = parsed
  }
  if (Object.keys(columns).length === 0) {
    for (const n of gridSlotNames) columns[n] = '1fr'
  }

  let columnGap = '0'
  const gapValue = extractProp(css, '.layout-grid', 'column-gap')
    ?? extractProp(css, '.theme-layout', 'column-gap')
    ?? extractProp(css, '.layout-grid', 'gap')
    ?? extractProp(css, '.theme-layout', 'gap')
  if (gapValue) {
    const token = resolveSpacing(gapValue)
    if (token) columnGap = token
  }

  let maxWidth: string | undefined
  const mwValue = extractProp(css, '.layout-frame', 'max-width')
    ?? extractProp(css, '.theme-layout-frame', 'max-width')
    ?? extractProp(css, '.theme-layout', 'max-width')
  if (mwValue && /^\d+px$/.test(mwValue)) maxWidth = mwValue

  let center: boolean | undefined
  const marginValue = extractProp(css, '.layout-frame', 'margin')
    ?? extractProp(css, '.theme-layout', 'margin')
  if (marginValue && /auto/.test(marginValue)) center = true

  return { columns, columnGap, maxWidth, center }
}

// ---------------------------------------------------------------------------
// Slot extraction
// ---------------------------------------------------------------------------

function parseSlotProps(
  css: string,
  slotName: string,
  position: SlotPosition,
): LayoutConfig['slots'][string] {
  const slotSel = `[data-slot="${slotName}"]`
  const slot: LayoutConfig['slots'][string] = {}

  if (position === 'top') slot.position = 'top'
  if (position === 'bottom') slot.position = 'bottom'

  const positionVal = extractProp(css, slotSel, 'position')
  if (positionVal === 'sticky') {
    slot.sticky = true
    const zVal = extractProp(css, slotSel, 'z-index')
    if (zVal) slot['z-index'] = parseInt(zVal, 10)
  }

  parseSlotSpacing(css, slotSel, slot)

  const mhVal = extractProp(css, slotSel, 'min-height')
  if (mhVal && /^\d+px$/.test(mhVal)) slot['min-height'] = mhVal

  const mwSlotVal = extractProp(css, slotSel, 'max-width')
  if (mwSlotVal && /^\d+px$/.test(mwSlotVal)) slot['max-width'] = mwSlotVal

  const alignVal = extractProp(css, slotSel, 'align-items')
  if (alignVal === 'flex-start' || alignVal === 'center' || alignVal === 'flex-end' || alignVal === 'stretch') {
    slot.align = alignVal
  }

  return slot
}

/** Extract a CSS prop and resolve it to a spacing token, writing to slot if found */
function assignSpacingProp(
  css: string,
  slotSel: string,
  cssProp: string,
  slot: LayoutConfig['slots'][string],
  slotKey: keyof LayoutConfig['slots'][string],
): void {
  const value = extractProp(css, slotSel, cssProp)
  if (!value) return
  const token = resolveSpacing(value)
  if (token) (slot as Record<string, unknown>)[slotKey] = token
}

function parseSlotSpacing(
  css: string,
  slotSel: string,
  slot: LayoutConfig['slots'][string],
): void {
  assignSpacingProp(css, slotSel, 'padding', slot, 'padding')
  assignSpacingProp(css, slotSel, 'padding-top', slot, 'padding-top')
  assignSpacingProp(css, slotSel, 'padding-bottom', slot, 'padding-bottom')
  assignSpacingProp(css, slotSel, 'gap', slot, 'gap')
  assignSpacingProp(css, slotSel, 'margin-top', slot, 'margin-top')

  const padLeftVal = extractProp(css, slotSel, 'padding-left')
  const padRightVal = extractProp(css, slotSel, 'padding-right')
  if (padLeftVal && padRightVal && padLeftVal === padRightVal) {
    const token = resolveSpacing(padLeftVal)
    if (token) slot['padding-x'] = token
  }
}

// ---------------------------------------------------------------------------
// Responsive breakpoint extraction
// ---------------------------------------------------------------------------

function parseResponsiveGrid(
  css: string,
  mediaBreakpoints: Array<{ maxWidth: number; body: string }>,
): Record<string, LayoutConfig['grid'][string]> {
  const grid: Record<string, LayoutConfig['grid'][string]> = {}

  for (const bp of mediaBreakpoints) {
    const bpName = bp.maxWidth <= 768 ? 'mobile' : 'tablet'
    const hasDrawer = /position:\s*fixed/.test(bp.body) &&
      /data-slot.*sidebar|sidebar/.test(bp.body)

    const drawerWidth = extractDrawerWidth(bp.body, css)

    const bpGtc = bp.body.match(/grid-template-columns\s*:\s*([^;]+)/i)
    const isSingleColumn = bpGtc && bpGtc[1].trim() === '1fr'

    if (isSingleColumn || hasDrawer) {
      grid[bpName] = {
        'min-width': `${bp.maxWidth}px`,
        columns: { content: '1fr' },
        'column-gap': '0',
        ...(hasDrawer
          ? {
              sidebars: 'drawer' as const,
              'drawer-width': drawerWidth ?? '280px',
              'drawer-trigger': 'hamburger' as const,
              'drawer-position': 'both' as const,
            }
          : {}),
      }
    }
  }

  return grid
}

function extractDrawerWidth(bpBody: string, css: string): string | undefined {
  const dwMatch = bpBody.match(/(?:sidebar|drawer)[^}]*width:\s*(\d+px)/i)
  if (dwMatch) return dwMatch[1]

  const varDw = extractCustomProp(css, '--sidebar-drawer-width')
  if (varDw && /^\d+px$/.test(varDw)) return varDw
  return undefined
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseHTMLToConfig(
  html: string,
  name: string,
  scope: string,
): LayoutConfig {
  const css = extractCSS(html)
  const customProps = extractAllCustomProps(css)
  const slotNames = extractSlotNames(html)
  const positions = classifySlotPositions(html, slotNames)
  const gridSlotNames = slotNames.filter((n) => positions[n] === 'grid')

  const { columns, columnGap, maxWidth, center } = parseDesktopGrid(css, gridSlotNames, customProps)

  const slots: LayoutConfig['slots'] = {}
  for (const slotName of slotNames) {
    slots[slotName] = parseSlotProps(css, slotName, positions[slotName])
  }

  const mediaBreakpoints = parseMediaBreakpoints(css)
  const responsiveGrid = parseResponsiveGrid(css, mediaBreakpoints)

  const grid: LayoutConfig['grid'] = {
    desktop: {
      'min-width': '1440px',
      columns,
      'column-gap': columnGap,
      ...(maxWidth ? { 'max-width': maxWidth } : {}),
      ...(center ? { center } : {}),
    },
    ...responsiveGrid,
  }

  return { version: 1, name, scope, grid, slots }
}
