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
    tabletSidebars: 'drawer' | 'hidden' | 'push'
    tabletPerSlotVisibility: Record<string, 'hidden' | 'drawer' | 'push'>
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
    expect(tablet).toMatch(
      /\.layout-grid > \[data-slot="sidebar-left"\][\s\S]*?position:\s*fixed/,
    )
    // Transform reads from a shell-owned custom prop — body class toggles
    // it from 1 (closed → -100%) to 0 (open → 0%). No specificity race.
    expect(tablet).toMatch(/transform:\s*translateX\(calc\(var\(--drawer-open-left,\s*1\)\s*\*\s*-100%\)\)/)
    expect(tablet).toMatch(/width:\s*var\(--drawer-panel-width\)/)
    expect(tablet).toMatch(/background:\s*var\(--drawer-panel-bg\)/)
    expect(tablet).toMatch(/box-shadow:\s*var\(--drawer-panel-shadow-left\)/)
    expect(tablet).toMatch(/transition:\s*transform\s+var\(--drawer-enter-duration\)/)
  })

  it('emits right-side panel with translateX read from --drawer-open-right', () => {
    const css = generateCSS(layoutWithDrawer(), tokens)
    const tablet = tabletBlock(css)
    const rightBlock = tablet.match(
      /\.layout-grid > \[data-slot="sidebar-right"\]\s*\{[^}]*\}/s,
    )
    expect(rightBlock).not.toBeNull()
    expect(rightBlock![0]).toMatch(/right:\s*0/)
    expect(rightBlock![0]).toMatch(/transform:\s*translateX\(calc\(var\(--drawer-open-right,\s*1\)\s*\*\s*100%\)\)/)
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

describe('css-generator: trigger variant is per-BP', () => {
  // PARITY-LOG contract: a layout that uses different trigger variants
  // across BPs (e.g. tab @ tablet + fab @ mobile) must hide the inactive
  // variant at each BP via a plain `.drawer-trigger--{v} { display: none }`.
  // html-generator emits one button per variant × side (single variant
  // class each), so a plain selector is enough — no `:not()` juggling.

  function crossBpLayout(): LayoutConfig {
    const config = threeColLayout({ tabletSidebars: 'drawer' })
    config.grid.tablet['drawer-trigger'] = 'tab'
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'fab',
    }
    return config
  }

  it('at tablet @media hides every variant except the active one (tab)', () => {
    const css = generateCSS(crossBpLayout(), tokens)
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(/\.drawer-trigger--peek\s*\{\s*display:\s*none/)
    expect(tablet).toMatch(/\.drawer-trigger--hamburger\s*\{\s*display:\s*none/)
    expect(tablet).toMatch(/\.drawer-trigger--fab\s*\{\s*display:\s*none/)
    expect(tablet).not.toMatch(/\.drawer-trigger--tab\s*\{\s*display:\s*none/)
  })

  it('at mobile @media hides every variant except the active one (fab)', () => {
    const css = generateCSS(crossBpLayout(), tokens)
    const mobileStart = css.indexOf('@media (max-width: 767px)')
    expect(mobileStart).toBeGreaterThan(-1)
    let depth = 0
    let end = css.length
    for (let i = mobileStart; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }
    const mobile = css.slice(mobileStart, end)
    expect(mobile).toMatch(/\.drawer-trigger--peek\s*\{\s*display:\s*none/)
    expect(mobile).toMatch(/\.drawer-trigger--hamburger\s*\{\s*display:\s*none/)
    expect(mobile).toMatch(/\.drawer-trigger--tab\s*\{\s*display:\s*none/)
    expect(mobile).not.toMatch(/\.drawer-trigger--fab\s*\{\s*display:\s*none/)
  })

  it('uses plain selectors, not :not() compounds, to hide variants', () => {
    const css = generateCSS(crossBpLayout(), tokens)
    // The older :not()-based hide rule was unrecoverable when buttons
    // carried multiple variant classes; single-variant-per-button
    // means the plain selector is enough.
    expect(css).not.toMatch(/\.drawer-trigger--\w+:not\(\.drawer-trigger--/)
  })
})

describe('css-generator: push mode is per-BP, not global', () => {
  // PARITY-LOG contract: tablet drawer and mobile push must stay
  // independent. Push-specific rules (frame margin/bg/z-index,
  // backdrop-hide, FAB translate) live ONLY inside the @media block
  // of the BP that uses push — never outside. This keeps tablet
  // drawer overlay working unchanged when mobile switches to push.

  const pushLayout = () => threeColLayout({ tabletSidebars: 'push' })

  it('emits push rules only inside the @media block, not globally', () => {
    const css = generateCSS(pushLayout(), tokens)
    const mediaStart = css.indexOf('@media (max-width: 1439px)')
    const outside = css.slice(0, mediaStart)

    // No push-specific selectors should appear outside any @media.
    expect(outside).not.toMatch(/body\.drawer-is-open-left\s+\.layout-frame/)
    expect(outside).not.toMatch(/body\.drawer-is-open-right\s+\.layout-frame/)
    expect(outside).not.toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
  })

  it('emits frame + margin + backdrop-hide + FAB transform inside the @media', () => {
    const css = generateCSS(pushLayout(), tokens)
    const tablet = tabletBlock(css)

    expect(tablet).toMatch(/\.layout-frame\s*\{[^}]*position:\s*relative/s)
    expect(tablet).toMatch(/\.layout-frame\s*\{[^}]*z-index:\s*var\(--drawer-z-push-frame\)/s)
    expect(tablet).toMatch(/\.layout-frame\s*\{[^}]*transition:\s*margin/s)

    expect(tablet).toMatch(
      /body\.drawer-is-open-left\s+\.layout-frame\s*\{[^}]*margin-left:\s*var\(--drawer-push-width\)/s,
    )
    expect(tablet).toMatch(
      /body\.drawer-is-open-left\s+\.drawer-trigger--fab\.drawer-trigger--left\s*\{[^}]*transform:\s*translateX\(var\(--drawer-push-width\)\)/s,
    )

    expect(tablet).toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
  })

  it('push sidebar uses --drawer-push-width, not --drawer-panel-width', () => {
    const css = generateCSS(pushLayout(), tokens)
    const tablet = tabletBlock(css)
    const sidebarLeft = tablet.match(
      /\.layout-grid > \[data-slot="sidebar-left"\]\s*\{[^}]*\}/s,
    )
    expect(sidebarLeft).not.toBeNull()
    expect(sidebarLeft![0]).toMatch(/width:\s*var\(--drawer-push-width\)/)
    expect(sidebarLeft![0]).not.toMatch(/transform:/)
    expect(sidebarLeft![0]).not.toMatch(/box-shadow:/)
  })

  it('drawer@tablet + push@mobile — each BP gets its own mode rules', () => {
    const config = threeColLayout({ tabletSidebars: 'drawer' })
    config.grid.mobile = {
      'min-width': '375px',
      columns: { 'sidebar-left': '1fr', content: '1fr', 'sidebar-right': '1fr' },
      'column-gap': '0',
      sidebars: 'push',
      'drawer-trigger': 'fab',
    }
    const css = generateCSS(config, tokens)

    // Tablet block: drawer (transform on sidebar, no frame margin, no backdrop-hide).
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(/transform:\s*translateX\(calc\(var\(--drawer-open-left/)
    expect(tablet).not.toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
    expect(tablet).not.toMatch(/body\.drawer-is-open-left\s+\.layout-frame/)

    // Mobile block: push (backdrop-hide, frame margin, no transform on sidebar).
    const mobileStart = css.indexOf('@media (max-width: 767px)')
    expect(mobileStart).toBeGreaterThan(-1)
    const mobileEnd = (() => {
      let depth = 0
      for (let i = mobileStart; i < css.length; i++) {
        if (css[i] === '{') depth++
        else if (css[i] === '}') {
          depth--
          if (depth === 0) return i + 1
        }
      }
      return css.length
    })()
    const mobile = css.slice(mobileStart, mobileEnd)
    expect(mobile).toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
    expect(mobile).toMatch(/body\.drawer-is-open-left\s+\.layout-frame[^}]*margin-left/s)
  })
})
