import { describe, expect, it } from 'vitest'
import { generateHTML } from './html-generator.js'
import type { LayoutConfig } from './config-schema.js'

function base(drawerAtTablet: boolean): LayoutConfig {
  const config: LayoutConfig = {
    version: 1,
    name: 'test',
    scope: 'theme',
    grid: {
      desktop: {
        'min-width': '1440px',
        columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
        'column-gap': '0',
      },
      tablet: {
        'min-width': '768px',
        columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
        'column-gap': '0',
      },
    },
    slots: {
      'sidebar-left': {},
      content: {},
      'sidebar-right': {},
    },
  }
  if (drawerAtTablet) {
    config.grid.tablet.sidebars = 'drawer'
    config.grid.tablet['drawer-trigger'] = 'peek'
  }
  return config
}

describe('html-generator: drawer shell', () => {
  // PARITY-LOG contract: drawer markup in the exported HTML speaks the
  // shell vocabulary (packages/ui/src/portal/portal-shell.css) — no
  // legacy .layout-drawer / .layout-drawer-backdrop / inline script.

  it('emits no drawer-shell when layout has no drawer BP', () => {
    const html = generateHTML(base(false))
    expect(html).not.toMatch(/class="drawer-shell"/)
    expect(html).not.toMatch(/class="drawer-layer"/)
    expect(html).not.toMatch(/class="drawer-trigger/)
  })

  it('wraps drawer markup in a single .drawer-shell container', () => {
    const html = generateHTML(base(true))
    const occurrences = html.match(/class="drawer-shell"/g) ?? []
    expect(occurrences.length).toBe(1)
  })

  it('uses shell class names — no .layout-drawer or inline script', () => {
    const html = generateHTML(base(true))
    expect(html).not.toMatch(/class="layout-drawer/)
    expect(html).not.toMatch(/<script/)
    expect(html).toMatch(/class="drawer-layer"/)
    expect(html).toMatch(/class="drawer-backdrop"/)
    expect(html).toMatch(/class="drawer-panel drawer-panel--left"/)
    expect(html).toMatch(/class="drawer-panel drawer-panel--right"/)
  })

  it('emits data-drawer-open on trigger and data-drawer-close on backdrop/close', () => {
    const html = generateHTML(base(true))
    expect(html).toMatch(/data-drawer-open="left"/)
    expect(html).toMatch(/data-drawer-open="right"/)
    expect(html).toMatch(/data-drawer-close/)
  })

  it('uses the slot-level drawer-trigger-label in trigger button and panel title', () => {
    const config = base(true)
    config.slots['sidebar-right']['drawer-trigger-label'] = 'Theme details'
    const html = generateHTML(config)
    // Right-side trigger label
    expect(html).toMatch(/drawer-trigger--right[\s\S]{0,200}Theme details/)
    // Right-side panel title
    expect(html).toMatch(/drawer-panel--right[\s\S]{0,600}Theme details/)
  })

  it('uses the icon from the registry based on drawer-trigger-icon', () => {
    const config = base(true)
    config.slots['sidebar-right']['drawer-trigger-icon'] = 'details'
    const html = generateHTML(config)
    // The "details" icon path starts with "M14 2H6..."
    expect(html).toMatch(/drawer-trigger--right[\s\S]{0,400}d="M14 2H6/)
  })

  it('falls back to chevron when drawer-trigger-icon is unset', () => {
    const html = generateHTML(base(true))
    // chevron-right path
    expect(html).toMatch(/d="M9 5l7 7-7 7"/)
  })

  it('keeps the grid copy of each sidebar (data-slot) alongside the drawer panel copy', () => {
    const html = generateHTML(base(true))
    // One grid copy inside .layout-grid
    expect(html).toMatch(/<aside data-slot="sidebar-left"><\/aside>/)
    // Plus one drawer-body copy with the same slot name — Portal resolver fills both
    expect(html).toMatch(/class="drawer-body" data-slot="sidebar-left"/)
    const leftMatches = html.match(/data-slot="sidebar-left"/g) ?? []
    expect(leftMatches.length).toBe(2)
  })

  it('emits only the side that is marked drawer (per-slot visibility override)', () => {
    const config = base(false)
    config.grid.tablet.slots = { 'sidebar-left': { visibility: 'drawer' } }
    // sidebar-right has no drawer → no right panel/trigger
    const html = generateHTML(config)
    expect(html).toMatch(/drawer-panel--left/)
    expect(html).not.toMatch(/drawer-panel--right/)
    expect(html).toMatch(/data-drawer-open="left"/)
    expect(html).not.toMatch(/data-drawer-open="right"/)
  })
})
