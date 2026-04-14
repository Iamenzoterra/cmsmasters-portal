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
): Record<string, 'top' | 'bottom' | 'grid'> {
  const result: Record<string, 'top' | 'bottom' | 'grid'> = {}

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
  const re = new RegExp(escaped + '\\s*\\{([^}]*?)\\}', 'g')
  let m: RegExpExecArray | null

  while ((m = re.exec(css)) !== null) {
    const block = m[1]
    const propRe = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i')
    const propMatch = block.match(propRe)
    if (propMatch) return propMatch[1].trim()
  }
  return undefined
}

/** Extract CSS custom property value from :root */
function extractCustomProp(css: string, name: string): string | undefined {
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
    const inner = block.match(/\{([^}]+)\}/)?.[1] ?? ''
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
  const resolved = inner.replace(/var\((--[\w-]+)(?:\s*,\s*[^)]+)?\)/g, (_, name) => {
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

/** Parse grid-template-columns into column names based on slot order */
function parseGridColumns(
  gtc: string,
  gridSlotNames: string[],
  customProps: Record<string, string>,
): Record<string, string> | null {
  // Split by spaces but respect calc() and var() parentheses
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (const ch of gtc) {
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

  if (parts.length !== gridSlotNames.length) return null

  const columns: Record<string, string> = {}
  for (const [i, value] of parts.entries()) {
    // Normalize: "1fr" stays, "Npx" stays, calc() → try to resolve
    if (value === '1fr' || /^\d+px$/.test(value)) {
      columns[gridSlotNames[i]] = value
    } else if (value.startsWith('calc(')) {
      const resolved = resolveCalc(value, customProps)
      columns[gridSlotNames[i]] = resolved ?? value
    } else {
      columns[gridSlotNames[i]] = '1fr'
    }
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

  // --- Grid: desktop breakpoint ---

  // Find grid-template-columns — could be in various selectors
  let gtcValue: string | undefined

  // Try common grid container selectors
  for (const sel of ['.layout-grid', '.theme-layout', '[class*="layout"]', '[class*="grid"]']) {
    const v = extractProp(css, sel, 'grid-template-columns')
    if (v) { gtcValue = v; break }
  }

  // Fallback: search any rule with grid-template-columns
  if (!gtcValue) {
    const gtcMatch = css.match(/grid-template-columns\s*:\s*([^;]+)/i)
    if (gtcMatch) gtcValue = gtcMatch[1].trim()
  }

  // Parse columns
  let columns: Record<string, string> = {}
  if (gtcValue && gridSlotNames.length > 0) {
    const parsed = parseGridColumns(gtcValue, gridSlotNames, customProps)
    if (parsed) columns = parsed
  }

  // Fallback: if no columns parsed, all grid slots get 1fr
  if (Object.keys(columns).length === 0) {
    for (const name of gridSlotNames) {
      columns[name] = '1fr'
    }
  }

  // Column gap
  let columnGap = '0'
  const gapValue = extractProp(css, '.layout-grid', 'column-gap')
    ?? extractProp(css, '.theme-layout', 'column-gap')
    ?? extractProp(css, '.layout-grid', 'gap')
    ?? extractProp(css, '.theme-layout', 'gap')
  if (gapValue) {
    const token = resolveSpacing(gapValue)
    if (token) columnGap = token
  }

  // Max-width from layout frame/container
  let maxWidth: string | undefined
  const mwValue = extractProp(css, '.layout-frame', 'max-width')
    ?? extractProp(css, '.theme-layout-frame', 'max-width')
    ?? extractProp(css, '.theme-layout', 'max-width')
  if (mwValue && /^\d+px$/.test(mwValue)) {
    maxWidth = mwValue
  }

  // Center: check for margin: 0 auto
  let center: boolean | undefined
  const marginValue = extractProp(css, '.layout-frame', 'margin')
    ?? extractProp(css, '.theme-layout', 'margin')
  if (marginValue && /auto/.test(marginValue)) {
    center = true
  }

  // --- Slots ---

  const slots: LayoutConfig['slots'] = {}

  for (const slotName of slotNames) {
    const slotSel = `[data-slot="${slotName}"]`
    const slot: LayoutConfig['slots'][string] = {}

    // Position
    const pos = positions[slotName]
    if (pos === 'top') slot.position = 'top'
    if (pos === 'bottom') slot.position = 'bottom'

    // Sticky + z-index
    const positionVal = extractProp(css, slotSel, 'position')
    if (positionVal === 'sticky') {
      slot.sticky = true
      const zVal = extractProp(css, slotSel, 'z-index')
      if (zVal) slot['z-index'] = parseInt(zVal, 10)
    }

    // Padding (shorthand)
    const paddingVal = extractProp(css, slotSel, 'padding')
    if (paddingVal) {
      const token = resolveSpacing(paddingVal)
      if (token) slot.padding = token
    }

    // Padding (split fields)
    const padTopVal = extractProp(css, slotSel, 'padding-top')
    if (padTopVal) {
      const token = resolveSpacing(padTopVal)
      if (token) slot['padding-top'] = token
    }
    const padBottomVal = extractProp(css, slotSel, 'padding-bottom')
    if (padBottomVal) {
      const token = resolveSpacing(padBottomVal)
      if (token) slot['padding-bottom'] = token
    }
    const padLeftVal = extractProp(css, slotSel, 'padding-left')
    const padRightVal = extractProp(css, slotSel, 'padding-right')
    if (padLeftVal && padRightVal && padLeftVal === padRightVal) {
      const token = resolveSpacing(padLeftVal)
      if (token) slot['padding-x'] = token
    }

    // Gap
    const gapVal = extractProp(css, slotSel, 'gap')
    if (gapVal) {
      const token = resolveSpacing(gapVal)
      if (token) slot.gap = token
    }

    // Min-height
    const mhVal = extractProp(css, slotSel, 'min-height')
    if (mhVal && /^\d+px$/.test(mhVal)) {
      slot['min-height'] = mhVal
    }

    // Margin-top
    const mtVal = extractProp(css, slotSel, 'margin-top')
    if (mtVal) {
      const token = resolveSpacing(mtVal)
      if (token) slot['margin-top'] = token
    }

    // Max-width (inner container)
    const mwSlotVal = extractProp(css, slotSel, 'max-width')
    if (mwSlotVal && /^\d+px$/.test(mwSlotVal)) {
      slot['max-width'] = mwSlotVal
    }

    // Align (from align-items)
    const alignVal = extractProp(css, slotSel, 'align-items')
    if (alignVal === 'flex-start' || alignVal === 'center' || alignVal === 'flex-end' || alignVal === 'stretch') {
      slot.align = alignVal
    }

    slots[slotName] = slot
  }

  // --- Responsive breakpoints ---

  const mediaBreakpoints = parseMediaBreakpoints(css)
  const grid: LayoutConfig['grid'] = {}

  // Desktop breakpoint (default — no @media)
  grid.desktop = {
    'min-width': '1440px',
    columns,
    'column-gap': columnGap,
    ...(maxWidth ? { 'max-width': maxWidth } : {}),
    ...(center ? { center } : {}),
  }

  // Parse responsive breakpoints
  for (const bp of mediaBreakpoints) {
    const bpName = bp.maxWidth <= 768 ? 'mobile' : 'tablet'

    // Check if sidebars become drawers (position: fixed on sidebar slots)
    const hasDrawer = /position:\s*fixed/.test(bp.body) &&
      /data-slot.*sidebar|sidebar/.test(bp.body)

    // Extract drawer width
    let drawerWidth: string | undefined
    const dwMatch = bp.body.match(/(?:sidebar|drawer)[^}]*width:\s*(\d+px)/i)
    if (dwMatch) drawerWidth = dwMatch[1]

    // Extract custom property drawer width
    if (!drawerWidth) {
      const varDw = extractCustomProp(css, '--sidebar-drawer-width')
      if (varDw && /^\d+px$/.test(varDw)) drawerWidth = varDw
    }

    // Check grid change
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

  return {
    version: 1,
    name,
    scope,
    grid,
    slots,
  }
}
