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

  it('emits inline --drawer-trigger-bg style when drawer-trigger-color is set', () => {
    const config = base(true)
    config.slots['sidebar-left']['drawer-trigger-color'] = '--brand-mare'
    const html = generateHTML(config)
    expect(html).toMatch(/drawer-trigger--left[^>]*style="--drawer-trigger-bg: hsl\(var\(--brand-mare\)\)"/)
  })

  it('omits inline style when drawer-trigger-color is unset (shell default wins)', () => {
    const html = generateHTML(base(true))
    // No style attr on the trigger — shell's --drawer-trigger-bg-{side}
    // fallback provides the color.
    expect(html).not.toMatch(/drawer-trigger--left[^>]*style="/)
    expect(html).not.toMatch(/drawer-trigger--right[^>]*style="/)
  })

  it('emits one button per (variant × side) — each with exactly ONE variant class', () => {
    const config = base(true)
    // tablet uses peek (default from helper), mobile uses fab
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'fab',
    }
    const html = generateHTML(config)

    // Two distinct variants × two sides = 4 buttons.
    const peekLeft = html.match(/class="drawer-trigger drawer-trigger--peek drawer-trigger--left"/g) ?? []
    const peekRight = html.match(/class="drawer-trigger drawer-trigger--peek drawer-trigger--right"/g) ?? []
    const fabLeft = html.match(/class="drawer-trigger drawer-trigger--fab drawer-trigger--left"/g) ?? []
    const fabRight = html.match(/class="drawer-trigger drawer-trigger--fab drawer-trigger--right"/g) ?? []

    expect(peekLeft.length).toBe(1)
    expect(peekRight.length).toBe(1)
    expect(fabLeft.length).toBe(1)
    expect(fabRight.length).toBe(1)

    // No button carries more than one variant class (the whole point).
    expect(html).not.toMatch(/drawer-trigger--peek[^"]*drawer-trigger--fab/)
    expect(html).not.toMatch(/drawer-trigger--fab[^"]*drawer-trigger--peek/)
  })

  it('emits exactly one button per side when only one variant is used', () => {
    const config = base(true) // tablet: default 'peek' variant, no mobile declared
    const html = generateHTML(config)
    const peekLeft = html.match(/class="drawer-trigger drawer-trigger--peek drawer-trigger--left"/g) ?? []
    const peekRight = html.match(/class="drawer-trigger drawer-trigger--peek drawer-trigger--right"/g) ?? []
    expect(peekLeft.length).toBe(1)
    expect(peekRight.length).toBe(1)
    expect(html).not.toMatch(/drawer-trigger--hamburger/)
    expect(html).not.toMatch(/drawer-trigger--fab/)
    expect(html).not.toMatch(/drawer-trigger--tab/)
  })

  it('never emits data-drawer-mode — mode is a per-BP CSS concern', () => {
    // Both a drawer-only layout and a push-using layout must emit the
    // shell without any mode marker. Keeping mode out of HTML means a
    // layout can freely mix drawer@tablet + push@mobile without any
    // state leaking globally.
    const drawerOnly = base(true)
    const withPush = base(false)
    withPush.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'push',
    }
    expect(generateHTML(drawerOnly)).toMatch(/<div class="drawer-shell">/)
    expect(generateHTML(drawerOnly)).not.toMatch(/data-drawer-mode/)
    expect(generateHTML(withPush)).toMatch(/<div class="drawer-shell">/)
    expect(generateHTML(withPush)).not.toMatch(/data-drawer-mode/)
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

  // PARITY-LOG: "tablet peek/tab pill shows a close (X) sprite alongside
  // the chevron at rest". FAB is the only variant whose icon-wrap paints
  // a chev↔close swap on open — peek/tab/hamburger hide themselves while
  // a drawer is open, so they have no open state that would consume the
  // close sprite. Emitting it anyway let peek's flex icon-wrap paint the
  // chev and X side-by-side.

  it('emits a chev sprite inside every trigger button', () => {
    const config = base(true) // tablet: peek (default)
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'fab',
    }
    const html = generateHTML(config)
    // 2 peek + 2 fab buttons = 4 chev sprites total.
    const chevs = html.match(/drawer-trigger__icon--chev/g) ?? []
    expect(chevs.length).toBe(4)
  })

  it('emits __icon--close only for FAB triggers (not peek / tab / hamburger)', () => {
    const config = base(true) // tablet: peek (default)
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'fab',
    }
    const html = generateHTML(config)

    // 2 fab buttons (left + right) → 2 close sprites. Not 4.
    const closes = html.match(/drawer-trigger__icon--close/g) ?? []
    expect(closes.length).toBe(2)

    // Peek buttons carry only the chev sprite; FAB buttons carry both.
    const peekButtons =
      html.match(/<button[^>]*drawer-trigger--peek[^>]*>[\s\S]*?<\/button>/g) ?? []
    expect(peekButtons.length).toBe(2)
    for (const btn of peekButtons) {
      expect(btn).toMatch(/drawer-trigger__icon--chev/)
      expect(btn).not.toMatch(/drawer-trigger__icon--close/)
    }
    const fabButtons =
      html.match(/<button[^>]*drawer-trigger--fab[^>]*>[\s\S]*?<\/button>/g) ?? []
    expect(fabButtons.length).toBe(2)
    for (const btn of fabButtons) {
      expect(btn).toMatch(/drawer-trigger__icon--chev/)
      expect(btn).toMatch(/drawer-trigger__icon--close/)
    }
  })

  it('hamburger and tab triggers do not emit a close sprite either', () => {
    const config = base(false)
    config.grid.tablet = {
      ...config.grid.tablet,
      sidebars: 'drawer',
      'drawer-trigger': 'hamburger',
    }
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'tab',
    }
    const html = generateHTML(config)
    // Neither variant has an open-state icon swap; no close sprite at all.
    expect(html).not.toMatch(/drawer-trigger__icon--close/)
  })
})
