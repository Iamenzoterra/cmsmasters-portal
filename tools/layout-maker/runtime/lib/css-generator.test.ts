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
    expect(tablet).toMatch(/\[data-slot="sidebar-left"\][^{]*\{[^}]*display: none/s)
    expect(tablet).toMatch(/\[data-slot="sidebar-right"\][^{]*\{[^}]*display: none/s)
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
