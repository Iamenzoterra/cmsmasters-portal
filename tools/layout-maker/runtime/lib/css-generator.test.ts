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

  it('emits per-BP panel width into the shell tokens (--drawer-panel-width / --drawer-push-width)', () => {
    // Sidebars ARE the panels now (no separate .drawer-panel element),
    // so the YAML knob drives the tokens that the sidebar rules consume.
    // Writing BOTH tokens is safe — only one mode fires per BP.
    const config = layoutWithDrawer()
    config.grid.tablet['drawer-width'] = '360px'
    const css = generateCSS(config, tokens)
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(/:root\s*\{[^}]*--drawer-panel-width:\s*360px/s)
    expect(tablet).toMatch(/:root\s*\{[^}]*--drawer-push-width:\s*360px/s)
    expect(tablet).not.toMatch(/\.drawer-panel\s*\{[^}]*width:\s*360px/s)
  })
})

describe('css-generator: trigger variant is per-BP', () => {
  // PARITY-LOG contract: a layout that uses different trigger variants
  // across BPs (e.g. tab @ tablet + fab @ mobile) must hide the inactive
  // variant at each BP — via `visibility: hidden + pointer-events: none`
  // so shell's per-variant `display` (flex for peek/tab/fab,
  // inline-flex for hamburger) stays intact. Earlier iteration used
  // `display: none` / `display: revert`, but revert rolls display
  // back to UA default <button> = inline-block and clobbers flex —
  // broke column-reverse stacking on the FAB armed pill.

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
    expect(tablet).toMatch(/\.drawer-trigger--peek\s*\{\s*visibility:\s*hidden/)
    expect(tablet).toMatch(/\.drawer-trigger--hamburger\s*\{\s*visibility:\s*hidden/)
    expect(tablet).toMatch(/\.drawer-trigger--fab\s*\{\s*visibility:\s*hidden/)
    expect(tablet).toMatch(/\.drawer-trigger--tab\s*\{\s*visibility:\s*visible/)
    // Never touch display — shell's per-variant flex / inline-flex wins.
    expect(tablet).not.toMatch(/\.drawer-trigger--[a-z]+\s*\{\s*display:/)
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
    expect(mobile).toMatch(/\.drawer-trigger--peek\s*\{\s*visibility:\s*hidden/)
    expect(mobile).toMatch(/\.drawer-trigger--hamburger\s*\{\s*visibility:\s*hidden/)
    expect(mobile).toMatch(/\.drawer-trigger--tab\s*\{\s*visibility:\s*hidden/)
    expect(mobile).toMatch(/\.drawer-trigger--fab\s*\{\s*visibility:\s*visible/)
    expect(mobile).not.toMatch(/\.drawer-trigger--[a-z]+\s*\{\s*display:/)
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

  const pushLayout = () => {
    const layout = threeColLayout({ tabletSidebars: 'push' })
    // YAML-driven width — user sets this in the LM Inspector per BP
    layout.grid.tablet['drawer-width'] = '320px'
    return layout
  }

  it('emits push rules only inside the @media block, not globally', () => {
    const css = generateCSS(pushLayout(), tokens)
    const mediaStart = css.indexOf('@media (max-width: 1439px)')
    const outside = css.slice(0, mediaStart)

    // No push-specific selectors should appear outside any @media.
    expect(outside).not.toMatch(/body\.drawer-is-open\s+\[data-slot\]/)
    expect(outside).not.toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
  })

  it('hides everything non-sidebar when body.drawer-is-open (focus mode)', () => {
    const css = generateCSS(pushLayout(), tokens)
    const tablet = tabletBlock(css)

    // Focus architecture: when the drawer opens, every non-sidebar
    // [data-slot] AND the .layout-frame go opacity:0 + visibility:hidden
    // + pointer-events:none. The drawer is the sole rendered,
    // interactive element — no stacking / z-index conflict possible.
    expect(tablet).toMatch(
      /body\.drawer-is-open\s+\[data-slot\]:not\(\[data-drawer-side\]\)[^}]*opacity:\s*0/s,
    )
    expect(tablet).toMatch(
      /body\.drawer-is-open\s+\[data-slot\]:not\(\[data-drawer-side\]\)[^}]*visibility:\s*hidden/s,
    )
    expect(tablet).toMatch(
      /body\.drawer-is-open\s+\[data-slot\]:not\(\[data-drawer-side\]\)[^}]*pointer-events:\s*none/s,
    )

    // Push-width comes from YAML grid[bp].drawer-width — user
    // controls the sidebar panel width from the LM Inspector, no
    // hardcoded value in code. Test fixture sets it to 320px.
    expect(tablet).toMatch(/:root\s*\{[^}]*--drawer-push-width:\s*320px/s)
    expect(tablet).toMatch(/:root\s*\{[^}]*--drawer-panel-width:\s*320px/s)
    // html overflow-x guard remains for negative-margin cascades (and
    // as insurance for horizontal drag gestures).
    expect(tablet).toMatch(/\bhtml\s*\{[^}]*overflow-x:\s*hidden/s)

    // No in-flow stacking hack, no body margin push — focus mode
    // retired both patterns.
    expect(tablet).not.toMatch(/\[data-slot="content"\]\s*\{[^}]*z-index:\s*var\(--drawer-z-push-frame\)/s)
    expect(tablet).not.toMatch(/body\.drawer-is-open-(left|right)\s*\{[^}]*margin-(left|right):\s*var\(--drawer-push-width\)/s)

    expect(tablet).toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
  })

  it('push sidebar is offscreen at rest via --drawer-open-{side}, always visible on open', () => {
    const css = generateCSS(pushLayout(), tokens)
    const tablet = tabletBlock(css)
    const sidebarLeft = tablet.match(
      /\.layout-grid > \[data-slot="sidebar-left"\]\s*\{[^}]*\}/s,
    )
    expect(sidebarLeft).not.toBeNull()
    expect(sidebarLeft![0]).toMatch(/width:\s*var\(--drawer-push-width\)/)
    // Offscreen at rest, onscreen when body.drawer-is-open-left sets
    // --drawer-open-left to 0. Shared vocabulary with drawer mode.
    expect(sidebarLeft![0]).toMatch(
      /transform:\s*translateX\(calc\(var\(--drawer-open-left,\s*1\)\s*\*\s*-100%\)\)/,
    )
    expect(sidebarLeft![0]).toMatch(/transition:\s*transform\s+var\(--drawer-push-content-duration\)/)
    // Cascade resets so wider BPs' drawer rules don't leak.
    expect(sidebarLeft![0]).toMatch(/box-shadow:\s*none/)
    expect(sidebarLeft![0]).toMatch(/max-width:\s*none/)
    // Sidebar is EXEMPT from focus-mode hiding — explicit opacity:1
    // + visibility:visible override any ancestor cascade.
    expect(sidebarLeft![0]).toMatch(/opacity:\s*1/)
    expect(sidebarLeft![0]).toMatch(/visibility:\s*visible/)
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

    // Tablet block: drawer (transform on sidebar, no focus-hide, no backdrop-hide).
    const tablet = tabletBlock(css)
    expect(tablet).toMatch(/transform:\s*translateX\(calc\(var\(--drawer-open-left/)
    expect(tablet).not.toMatch(/\.drawer-backdrop\s*\{\s*display:\s*none/)
    expect(tablet).not.toMatch(/body\.drawer-is-open\s+\[data-slot\]/)

    // Mobile block: push (backdrop-hide, focus-hide of non-sidebars).
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
    expect(mobile).toMatch(/body\.drawer-is-open\s+\[data-slot\]:not\(\[data-drawer-side\]\)[^}]*opacity:\s*0/s)
  })
})

// Extract the first CSS rule body for a given selector.
// Top-level only — stops at the first unmatched `}` so it won't walk into
// nested rules.
function extractRule(css: string, selector: string): string {
  const idx = css.indexOf(selector)
  if (idx < 0) return ''
  const open = css.indexOf('{', idx)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}

describe('WP-024: slot container-type (ADR-025)', () => {
  it('emits container-type + container-name on the generic .slot-inner rule', () => {
    const css = generateCSS(threeColLayout(), tokens)
    const generic = extractRule(css, '[data-slot] > .slot-inner')
    expect(generic).toContain('container-type: inline-size')
    expect(generic).toContain('container-name: slot')
    // Sanity: the five pre-existing declarations still present.
    expect(generic).toContain('display: flex')
    expect(generic).toContain('flex-direction: column')
    expect(generic).toContain('width: 100%')
    expect(generic).toContain('flex: 1 0 auto')
  })

  it('does NOT emit container-type on container-slot outer rules', () => {
    // Container slots (nested-slots) hold <div data-slot="child"> directly,
    // not .slot-inner — so the generic selector doesn't match them, and the
    // per-slot loop `continue`s on them. Assert no outer `[data-slot="X"]`
    // rule contains container-type / container-name.
    const css = generateCSS(threeColLayout(), tokens)
    const outerContainerRules = css.match(/\[data-slot="[^"]+"\]\s*\{[^}]*\}/g) ?? []
    for (const rule of outerContainerRules) {
      expect(rule).not.toContain('container-type')
      expect(rule).not.toContain('container-name')
    }
  })
})

describe('Phase 4: container slots never reach the leaf inner-params pipeline', () => {
  // PARITY-LOG lock — `[tablet] align + max-width on container slots are
  // silently ignored`. Generator side: zero `[data-slot="X"] > .slot-inner`
  // rule AND zero `--sl-X-{mw,al,px,pt,pb,gap}` vars for slots with
  // non-empty `nested-slots`. Inspector side locks the other half (see
  // Inspector.test.tsx container-no-inner-params). Co-contract: if either
  // side breaks, the Inspector can expose fields Portal silently drops.
  const containerConfig: LayoutConfig = {
    version: 1,
    name: 'test',
    scope: 'theme',
    grid: {
      desktop: {
        'min-width': '1440px',
        'column-gap': '0',
        columns: { outer: '1fr' },
      },
    },
    slots: {
      outer: {
        'nested-slots': ['theme-blocks'],
        // Inner-params authored on a container. The PARITY lie: user sets
        // these via Inspector, YAML stores them, Portal ignores them.
        'max-width': '615px',
        align: 'center',
        padding: '--spacing-xl',
        gap: '--spacing-xl',
      },
      'theme-blocks': {},
    },
  }

  it('emits no `[data-slot="outer"] > .slot-inner` rule for container slots', () => {
    const css = generateCSS(containerConfig, tokens)
    expect(css).not.toMatch(/\[data-slot="outer"\]\s*>\s*\.slot-inner/)
  })

  it('emits no --sl-<container>-{mw,al,px,pt,pb,gap} vars for container slots', () => {
    const css = generateCSS(containerConfig, tokens)
    expect(css).not.toMatch(/--sl-outer-mw/)
    expect(css).not.toMatch(/--sl-outer-al/)
    expect(css).not.toMatch(/--sl-outer-px/)
    expect(css).not.toMatch(/--sl-outer-pt/)
    expect(css).not.toMatch(/--sl-outer-pb/)
    expect(css).not.toMatch(/--sl-outer-gap/)
  })

  it('still emits inner rule + vars for adjacent leaf slots (regression guard)', () => {
    const css = generateCSS(containerConfig, tokens)
    expect(css).toMatch(/\[data-slot="theme-blocks"\]\s*>\s*\.slot-inner/)
  })
})
