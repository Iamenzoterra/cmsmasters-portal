import { describe, expect, it } from 'vitest'
import { generateCSS } from './css-generator.js'
import type { LayoutConfig } from './config-schema.js'
import type { TokenMap } from './token-parser.js'

const tokens: TokenMap = {
  '--spacing-xl': '24px',
  '--spacing-3xl': '40px',
}

function threeColLayout(
  overrides: Partial<{
    tabletSidebars: 'drawer' | 'hidden'
    tabletPerSlotVisibility: Record<string, 'hidden' | 'drawer'>
  }> = {},
): LayoutConfig {
  const base: LayoutConfig = {
    version: 1,
    name: 'test',
    scope: 'theme',
    grid: {
      desktop: {
        'min-width': '1440px',
        columns: {
          'sidebar-left': '1fr',
          content: '1fr',
          'sidebar-right': '1fr',
        },
        'column-gap': '0',
      },
      tablet: {
        'min-width': '768px',
        columns: {
          'sidebar-left': '1fr',
          content: '1fr',
          'sidebar-right': '1fr',
        },
        'column-gap': '0',
      },
    },
    slots: {
      'sidebar-left': {},
      content: {},
      'sidebar-right': {},
    },
  }
  if (overrides.tabletSidebars) {
    base.grid.tablet.sidebars = overrides.tabletSidebars
    base.grid.tablet['drawer-trigger'] = 'hamburger'
  }
  if (overrides.tabletPerSlotVisibility) {
    base.grid.tablet.slots = {}
    for (const [name, vis] of Object.entries(overrides.tabletPerSlotVisibility)) {
      base.grid.tablet.slots[name] = { visibility: vis }
    }
    if (Object.values(overrides.tabletPerSlotVisibility).includes('drawer')) {
      base.grid.tablet['drawer-trigger'] = 'hamburger'
    }
  }
  return base
}

function tabletBlock(css: string): string {
  const start = css.indexOf('@media (max-width: 1439px)')
  if (start === -1) throw new Error('No tablet media block found')
  // Match braces to find the end of the @media block.
  let depth = 0
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') {
      depth--
      if (depth === 0) return css.slice(start, i + 1)
    }
  }
  throw new Error('Unterminated @media block')
}

describe('css-generator: grid-template-columns at responsive BPs', () => {
  // PARITY-LOG entry: grid-template-columns kept 3 tracks even when sidebars went to drawer.
  // Contract: hidden/drawered slots must not reserve a grid track.

  it('drops tracks for grid-level drawered sidebars', () => {
    const css = generateCSS(threeColLayout({ tabletSidebars: 'drawer' }), tokens)
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/grid-template-columns:\s*1fr\s*;/)
    expect(tablet).not.toMatch(/grid-template-columns:\s*1fr 1fr 1fr\s*;/)
    // Drawered sidebars don't get display:none — they transform into the
    // drawer panel at this BP. They just shouldn't reserve a grid track.
    expect(tablet).toMatch(/\.layout-grid > \[data-slot="sidebar-left"\][^{]*\{[^}]*position:\s*fixed/s)
    expect(tablet).toMatch(/\.layout-grid > \[data-slot="sidebar-right"\][^{]*\{[^}]*position:\s*fixed/s)
  })

  it('drops tracks for grid-level hidden sidebars', () => {
    const css = generateCSS(threeColLayout({ tabletSidebars: 'hidden' }), tokens)
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/grid-template-columns:\s*1fr\s*;/)
    expect(tablet).not.toMatch(/grid-template-columns:\s*1fr 1fr 1fr\s*;/)
  })

  it('drops tracks for per-slot visibility=drawer overrides', () => {
    const css = generateCSS(
      threeColLayout({
        tabletPerSlotVisibility: {
          'sidebar-left': 'drawer',
          'sidebar-right': 'drawer',
        },
      }),
      tokens,
    )
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/grid-template-columns:\s*1fr\s*;/)
    expect(tablet).not.toMatch(/grid-template-columns:\s*1fr 1fr 1fr\s*;/)
  })

  it('drops only the affected track when one sidebar is hidden and the other is visible', () => {
    const css = generateCSS(
      threeColLayout({
        tabletPerSlotVisibility: { 'sidebar-left': 'hidden' },
      }),
      tokens,
    )
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/grid-template-columns:\s*1fr 1fr\s*;/)
  })

  it('keeps all tracks when no slot is hidden or drawered', () => {
    const css = generateCSS(threeColLayout(), tokens)
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/grid-template-columns:\s*1fr 1fr 1fr\s*;/)
  })
})

describe('css-generator: drawer CSS ownership', () => {
  // PARITY-LOG contract: drawer visuals live in packages/ui/src/portal/portal-shell.css.
  // The generator must NOT emit drawer-trigger / drawer-backdrop / close
  // styles. It DOES emit the per-BP panel rules on [data-drawer-side]
  // (the in-grid sidebar element) so the single DOM copy of the sidebar
  // becomes the drawer panel without any duplication.

  const layoutWithDrawer = () => threeColLayout({ tabletSidebars: 'drawer' })

  it('does not emit .layout-drawer or .layout-drawer-backdrop rules', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    expect(css).not.toMatch(/\.layout-drawer\s*\{/)
    expect(css).not.toMatch(/\.layout-drawer-backdrop/)
  })

  it('does not emit trigger / backdrop / close styles (shell owns them)', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    expect(css).not.toMatch(/\.drawer-trigger\s*\{[^}]*position:/s)
    expect(css).not.toMatch(/\.drawer-trigger\s*\{[^}]*background:/s)
    expect(css).not.toMatch(/\.drawer-trigger--left\s*\{\s*left:/)
    expect(css).not.toMatch(/\.drawer-trigger--right\s*\{\s*right:/)
    expect(css).not.toMatch(/\.drawer-backdrop\s*\{/)
    expect(css).not.toMatch(/\.drawer-close\s*\{/)
  })

  it('emits per-BP panel rules on the grid sidebar with shell tokens', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    const tablet = tabletBlock(css)
    // Each drawered sidebar gets a position:fixed rule referencing shell tokens.
    expect(tablet).toMatch(
      /\.layout-grid > \[data-slot="sidebar-left"\][\s\S]*?position:\s*fixed/,
    )
    expect(tablet).toMatch(/transform:\s*translateX\(-100%\)/)
    expect(tablet).toMatch(/width:\s*var\(--drawer-panel-width\)/)
    expect(tablet).toMatch(/background:\s*var\(--drawer-panel-bg\)/)
    expect(tablet).toMatch(/box-shadow:\s*var\(--drawer-panel-shadow-left\)/)
    expect(tablet).toMatch(/transition:\s*transform\s+var\(--drawer-enter-duration\)/)
  })

  it('emits right-side panel with translateX(100%) and right:0', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    const tablet = tabletBlock(css)
    const rightBlock = tablet.match(
      /\.layout-grid > \[data-slot="sidebar-right"\]\s*\{[^}]*\}/s,
    )
    expect(rightBlock).not.toBeNull()
    expect(rightBlock![0]).toMatch(/right:\s*0/)
    expect(rightBlock![0]).toMatch(/transform:\s*translateX\(100%\)/)
    expect(rightBlock![0]).toMatch(/box-shadow:\s*var\(--drawer-panel-shadow-right\)/)
  })

  it('does NOT emit display:none on drawered sidebars (they transform into panels)', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    const tablet = tabletBlock(css)
    // A drawered sidebar must not also be display:none — that would
    // cancel the panel rule and the drawer would never appear.
    const leftDisplayNone = tablet.match(
      /\.layout-grid > \[data-slot="sidebar-left"\][^{]*\{\s*display:\s*none/,
    )
    expect(leftDisplayNone).toBeNull()
  })

  it('hides grid sidebars that are marked visibility:hidden (not drawered)', () => {
    const css = generateCSS(
      threeColLayout({ tabletPerSlotVisibility: { 'sidebar-left': 'hidden' } }),
      tokens,
    )
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(
      /\.layout-grid > \[data-slot="sidebar-left"\]\s*\{\s*display:\s*none/,
    )
  })

  it('may emit a per-BP drawer-panel width override (per-layout knob)', () => {
    const config = layoutWithDrawer()
    config.grid.tablet['drawer-width'] = '360px'
    const css = generateCSS(config, tokens)
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(/\.drawer-panel\s*\{[^}]*width:\s*360px/s)
  })
})
