import type { LayoutConfig } from './config-schema.js'
import { getDrawerIcon } from '../../../../packages/ui/src/portal/drawer-icons.js'

/** Get semantic HTML tag for a slot name */
function getTag(name: string): string {
  if (name === 'content') return 'main'
  if (name.includes('sidebar')) return 'aside'
  return 'div'
}

/** Inner HTML for a slot: nested-child placeholders (no whitespace) or empty. */
function renderSlotInner(slot: { 'nested-slots'?: string[] }): string {
  const nested = slot['nested-slots']
  if (nested && nested.length > 0) {
    return nested.map((child) => `<div data-slot="${child}"></div>`).join('')
  }
  return ''
}

/** Decide which sides need a drawer trigger. Considers both
 *  grid-level `sidebars` and per-slot `visibility` overrides so
 *  the two mechanisms stay interchangeable. Mode (drawer vs push)
 *  isn't tracked here — it's a per-BP concern picked up by
 *  css-generator inside each @media block. */
function resolveDrawerSides(
  config: LayoutConfig,
): { leftSidebar?: string; rightSidebar?: string } {
  const sidebarNames = Object.keys(config.slots).filter((n) => n.includes('sidebar'))
  const defaultLeft = sidebarNames.find((n) => n.includes('left'))
  const defaultRight = sidebarNames.find((n) => n.includes('right'))

  let leftActive = false
  let rightActive = false

  const isOffCanvasMode = (v: string | undefined): v is 'drawer' | 'push' =>
    v === 'drawer' || v === 'push'

  for (const grid of Object.values(config.grid)) {
    if (isOffCanvasMode(grid.sidebars)) {
      const pos = grid['drawer-position'] ?? 'both'
      if (pos === 'left' || pos === 'both') leftActive = true
      if (pos === 'right' || pos === 'both') rightActive = true
    }
    for (const [slotName, override] of Object.entries(grid.slots ?? {})) {
      if (!isOffCanvasMode(override.visibility)) continue
      if (slotName.includes('left')) leftActive = true
      else if (slotName.includes('right')) rightActive = true
    }
  }

  return {
    leftSidebar: leftActive ? defaultLeft : undefined,
    rightSidebar: rightActive ? defaultRight : undefined,
  }
}

/** Collect every trigger variant the layout uses across all BPs,
 *  so the HTML button carries the class for each and css-generator's
 *  per-BP @media blocks can hide the ones that aren't active here. */
function collectTriggerVariants(config: LayoutConfig): Set<string> {
  const variants = new Set<string>()
  for (const grid of Object.values(config.grid)) {
    const v = grid['drawer-trigger']
    if (!v) continue
    variants.add(v)
  }
  if (variants.size === 0) variants.add('peek')
  return variants
}

/** Render a trigger button for one side. Label + icon + color come
 *  from the slot's role-level drawer-trigger-label / drawer-trigger-icon /
 *  drawer-trigger-color. Color is applied as an inline CSS custom prop
 *  (--drawer-trigger-bg) that the shell's `background: var(--drawer-trigger-bg,
 *  var(--drawer-trigger-bg-{side}))` reads — per-slot wins, default
 *  falls through. Variant classes stamp every variant the layout uses
 *  across all BPs; layout CSS hides the ones not active at a given BP. */
function renderTrigger(
  side: 'left' | 'right',
  slot: {
    'drawer-trigger-label'?: string
    'drawer-trigger-icon'?: string
    'drawer-trigger-color'?: string
  },
  variants: Set<string>,
): string[] {
  const out: string[] = []
  const label = slot['drawer-trigger-label'] || (side === 'left' ? 'Menu' : 'Details')
  const icon = getDrawerIcon(slot['drawer-trigger-icon'])
  const color = slot['drawer-trigger-color']
  const styleAttr = color
    ? ` style="--drawer-trigger-bg: hsl(var(${color}))"`
    : ''

  const variantClasses = Array.from(variants).map((v) => `drawer-trigger--${v}`).join(' ')

  out.push(
    `  <button type="button" class="drawer-trigger ${variantClasses} drawer-trigger--${side}" data-drawer-open="${side}" aria-label="${escapeAttr(label)}"${styleAttr}>`,
  )
  out.push('    <span class="drawer-trigger__icon-wrap" aria-hidden="true">')
  out.push(
    `      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${icon.d}"/></svg>`,
  )
  out.push('    </span>')
  out.push(`    <span class="drawer-trigger__label">${escapeHTML(label)}</span>`)
  out.push('  </button>')
  return out
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function generateHTML(config: LayoutConfig): string {
  const out: string[] = []
  const slots = config.slots
  const { leftSidebar, rightSidebar } = resolveDrawerSides(config)
  const hasDrawers = Boolean(leftSidebar) || Boolean(rightSidebar)

  // Categorize slots by position
  const topSlots = Object.entries(slots).filter(([, s]) => s.position === 'top')
  const bottomSlots = Object.entries(slots).filter(([, s]) => s.position === 'bottom')

  // Desktop column order (highest min-width breakpoint)
  const desktopBp = Object.entries(config.grid).sort(
    (a, b) => parseInt(b[1]['min-width'], 10) - parseInt(a[1]['min-width'], 10),
  )[0]
  const desktopColumns = Object.keys(desktopBp[1].columns)

  // Drawered sidebar → which side. Used to stamp data-drawer-side on the
  // grid element so shell CSS and layout CSS can target it without
  // duplicating the node. One DOM copy per sidebar, period.
  const drawerSideBySlot = new Map<string, 'left' | 'right'>()
  if (leftSidebar) drawerSideBySlot.set(leftSidebar, 'left')
  if (rightSidebar) drawerSideBySlot.set(rightSidebar, 'right')

  // Comment header
  out.push(`<!-- Layout: ${config.name} | Scope: ${config.scope} -->`)
  out.push('<!-- Generated by Layout Maker — do not edit manually -->')
  out.push('')

  // Top-position slots (header, hero, etc.)
  for (const [name, slot] of topSlots) {
    const tag = getTag(name)
    const inner = renderSlotInner(slot)
    out.push(`<${tag} data-slot="${name}">${inner}</${tag}>`)
    out.push('')
  }

  // Collect nested children — these render inside their parent, not as grid columns
  const nestedChildren = new Set<string>()
  for (const s of Object.values(slots)) {
    const nl = s['nested-slots']
    if (Array.isArray(nl)) nl.forEach((c) => nestedChildren.add(c))
  }

  // Grid frame
  out.push('<div class="layout-frame">')
  out.push('  <div class="layout-grid">')

  for (const name of desktopColumns) {
    if (nestedChildren.has(name)) continue
    const tag = getTag(name)
    const slot = slots[name] ?? {}
    const inner = renderSlotInner(slot)
    const drawerSide = drawerSideBySlot.get(name)
    const drawerAttr = drawerSide ? ` data-drawer-side="${drawerSide}"` : ''
    out.push(`    <${tag} data-slot="${name}"${drawerAttr}>${inner}</${tag}>`)
  }

  out.push('  </div>')
  out.push('</div>')
  out.push('')

  // Bottom-position slots (footer, etc.)
  for (const [name, slot] of bottomSlots) {
    const tag = getTag(name)
    const inner = renderSlotInner(slot)
    out.push(`<${tag} data-slot="${name}">${inner}</${tag}>`)
    out.push('')
  }

  // Drawer shell — ONLY triggers + backdrop. The sidebars themselves
  // live in the grid (one DOM copy) and become drawer panels at the
  // responsive BP via layout CSS + shell tokens. No duplicate slot
  // content, no drawer panels here.
  if (hasDrawers) {
    out.push('<div class="drawer-shell">')

    const variants = collectTriggerVariants(config)
    if (leftSidebar) {
      out.push(...renderTrigger('left', slots[leftSidebar] ?? {}, variants))
    }
    if (rightSidebar) {
      out.push(...renderTrigger('right', slots[rightSidebar] ?? {}, variants))
    }

    out.push('  <div class="drawer-layer">')
    out.push('    <div class="drawer-backdrop" data-drawer-close></div>')
    out.push('  </div>')
    out.push('</div>')
    out.push('')
  }

  return out.join('\n')
}
