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

/** Decide which sides need a drawer trigger + panel. Considers both
 *  grid-level `sidebars: drawer` and per-slot `visibility: drawer`
 *  overrides so the two mechanisms stay interchangeable. */
function resolveDrawerSides(
  config: LayoutConfig,
): { needLeft: boolean; needRight: boolean } {
  let needLeft = false
  let needRight = false

  for (const grid of Object.values(config.grid)) {
    // Grid-level: sidebars=drawer + drawer-position picks sides
    if (grid.sidebars === 'drawer') {
      const pos = grid['drawer-position'] ?? 'both'
      if (pos === 'left' || pos === 'both') needLeft = true
      if (pos === 'right' || pos === 'both') needRight = true
    }
    // Per-slot: any sidebar slot with visibility:drawer
    for (const [slotName, override] of Object.entries(grid.slots ?? {})) {
      if (override.visibility !== 'drawer') continue
      if (slotName.includes('left')) needLeft = true
      else if (slotName.includes('right')) needRight = true
    }
  }

  return { needLeft, needRight }
}

/** Render a trigger button for one side. Label + icon come from the
 *  slot's role-level drawer-trigger-label / drawer-trigger-icon. */
function renderTrigger(
  side: 'left' | 'right',
  sidebarName: string,
  slot: { 'drawer-trigger-label'?: string; 'drawer-trigger-icon'?: string },
): string[] {
  const out: string[] = []
  const label = slot['drawer-trigger-label'] || (side === 'left' ? 'Menu' : 'Details')
  const icon = getDrawerIcon(slot['drawer-trigger-icon'])

  out.push(
    `  <button type="button" class="drawer-trigger drawer-trigger--peek drawer-trigger--${side}" data-drawer-open="${side}" data-drawer-for="${sidebarName}" aria-label="${escapeAttr(label)}">`,
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

/** Render the drawer panel for one side. The body has data-slot=X so
 *  the Portal resolver fills it with the same sidebar content the grid
 *  copy gets — two DOM copies, one visible per BP. */
function renderPanel(
  side: 'left' | 'right',
  sidebarName: string,
  slot: { 'drawer-trigger-label'?: string },
): string[] {
  const title = slot['drawer-trigger-label'] || (side === 'left' ? 'Menu' : 'Details')
  const out: string[] = []
  out.push(
    `    <aside class="drawer-panel drawer-panel--${side}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">`,
  )
  out.push('      <div class="drawer-head">')
  out.push('        <div class="drawer-head__meta">')
  out.push(`          <span class="drawer-head__eyebrow">${escapeHTML(side === 'left' ? 'Menu' : 'Details')}</span>`)
  out.push(`          <h3 class="drawer-head__title">${escapeHTML(title)}</h3>`)
  out.push('        </div>')
  out.push(
    '        <button type="button" class="drawer-close" data-drawer-close aria-label="Close">',
  )
  out.push(
    '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  )
  out.push('        </button>')
  out.push('      </div>')
  out.push(`      <div class="drawer-body" data-slot="${sidebarName}"></div>`)
  out.push('    </aside>')
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

  const { needLeft, needRight } = resolveDrawerSides(config)
  const hasDrawers = needLeft || needRight

  // Categorize slots by position
  const topSlots = Object.entries(slots).filter(([, s]) => s.position === 'top')
  const bottomSlots = Object.entries(slots).filter(([, s]) => s.position === 'bottom')

  // Desktop column order (highest min-width breakpoint)
  const desktopBp = Object.entries(config.grid).sort(
    (a, b) => parseInt(b[1]['min-width'], 10) - parseInt(a[1]['min-width'], 10),
  )[0]
  const desktopColumns = Object.keys(desktopBp[1].columns)

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
    out.push(`    <${tag} data-slot="${name}">${inner}</${tag}>`)
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

  // Drawer shell — wraps all drawer-related markup. Hidden by default
  // via packages/ui/src/portal/portal-shell.css; per-layout CSS opts it
  // in at the specific responsive BPs that use drawers.
  if (hasDrawers) {
    const sidebarNames = Object.keys(slots).filter((n) => n.includes('sidebar'))
    const leftSidebar = sidebarNames.find((n) => n.includes('left')) ?? sidebarNames[0]
    const rightSidebar = sidebarNames.find((n) => n.includes('right')) ?? sidebarNames.at(-1)

    out.push('<div class="drawer-shell">')

    if (needLeft && leftSidebar) {
      out.push(...renderTrigger('left', leftSidebar, slots[leftSidebar] ?? {}))
    }
    if (needRight && rightSidebar) {
      out.push(...renderTrigger('right', rightSidebar, slots[rightSidebar] ?? {}))
    }

    out.push('  <div class="drawer-layer">')
    out.push('    <div class="drawer-backdrop" data-drawer-close></div>')

    if (needLeft && leftSidebar) {
      out.push(...renderPanel('left', leftSidebar, slots[leftSidebar] ?? {}))
    }
    if (needRight && rightSidebar) {
      out.push(...renderPanel('right', rightSidebar, slots[rightSidebar] ?? {}))
    }

    out.push('  </div>')
    out.push('</div>')
    out.push('')
  }

  return out.join('\n')
}
