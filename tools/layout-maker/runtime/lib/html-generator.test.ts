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
  // PARITY-LOG contract: the drawer shell emits ONLY triggers + backdrop.
  // Each sidebar keeps exactly one DOM copy (stamped with
  // data-drawer-side) that css-generator turns into a drawer panel at
  // the drawer BP. No duplicate content — so block JS that does
  // `document.querySelector('.block-X')` still hits the one instance.

  it('emits no drawer-shell when layout has no drawer BP', () => {
    const html = generateHTML(base(false))
    expect(html).not.toMatch(/class="drawer-shell"/)
    expect(html).not.toMatch(/class="drawer-layer"/)
    expect(html).not.toMatch(/class="drawer-trigger/)
    expect(html).not.toMatch(/data-drawer-side/)
  })

  it('wraps trigger + backdrop in exactly one .drawer-shell', () => {
    const html = generateHTML(base(true))
    const shells = html.match(/class="drawer-shell"/g) ?? []
    expect(shells.length).toBe(1)
    expect(html).toMatch(/class="drawer-layer"/)
    expect(html).toMatch(/class="drawer-backdrop" data-drawer-close/)
  })

  it('uses shell class names — no .layout-drawer, no inline script, no drawer-panel wrappers', () => {
    const html = generateHTML(base(true))
    expect(html).not.toMatch(/class="layout-drawer/)
    expect(html).not.toMatch(/<script/)
    expect(html).not.toMatch(/class="drawer-panel/)
    expect(html).not.toMatch(/class="drawer-body/)
    expect(html).not.toMatch(/class="drawer-head/)
  })

  it('emits data-drawer-open on each side trigger and data-drawer-close on backdrop', () => {
    const html = generateHTML(base(true))
    expect(html).toMatch(/data-drawer-open="left"/)
    expect(html).toMatch(/data-drawer-open="right"/)
    expect(html).toMatch(/data-drawer-close/)
  })

  it('stamps data-drawer-side on the grid sidebar that becomes a drawer', () => {
    const html = generateHTML(base(true))
    expect(html).toMatch(/<aside data-slot="sidebar-left" data-drawer-side="left">/)
    expect(html).toMatch(/<aside data-slot="sidebar-right" data-drawer-side="right">/)
  })

  it('keeps exactly one DOM copy of each sidebar (no data-slot duplication)', () => {
    const html = generateHTML(base(true))
    const leftMatches = html.match(/data-slot="sidebar-left"/g) ?? []
    const rightMatches = html.match(/data-slot="sidebar-right"/g) ?? []
    expect(leftMatches.length).toBe(1)
    expect(rightMatches.length).toBe(1)
  })

  it('uses the slot-level drawer-trigger-label on the trigger button', () => {
    const config = base(true)
    config.slots['sidebar-right']['drawer-trigger-label'] = 'Theme details'
    const html = generateHTML(config)
    expect(html).toMatch(/drawer-trigger--right[\s\S]{0,300}Theme details/)
  })

  it('uses the icon from the registry based on drawer-trigger-icon', () => {
    const config = base(true)
    config.slots['sidebar-right']['drawer-trigger-icon'] = 'details'
    const html = generateHTML(config)
    expect(html).toMatch(/drawer-trigger--right[\s\S]{0,400}d="M14 2H6/)
  })

  it('falls back to chevron when drawer-trigger-icon is unset', () => {
    const html = generateHTML(base(true))
    expect(html).toMatch(/d="M9 5l7 7-7 7"/)
  })

  it('emits only the side that is marked drawer (per-slot visibility override)', () => {
    const config = base(false)
    config.grid.tablet.slots = { 'sidebar-left': { visibility: 'drawer' } }
    const html = generateHTML(config)
    expect(html).toMatch(/data-drawer-side="left"/)
    expect(html).not.toMatch(/data-drawer-side="right"/)
    expect(html).toMatch(/data-drawer-open="left"/)
    expect(html).not.toMatch(/data-drawer-open="right"/)
  })
})
