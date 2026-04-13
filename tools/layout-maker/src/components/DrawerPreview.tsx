import { useState } from 'react'
import type { LayoutConfig, TokenMap, BreakpointGrid } from '../lib/types'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  grid: BreakpointGrid
  drawerSlots: string[]
}

function resolveToken(token: string, tokens: TokenMap): string {
  if (token === '0') return '0px'
  const px = tokens.spacing[token]
  return px != null ? `${px}px` : token
}

export function DrawerPreview({ config, tokens, grid, drawerSlots }: Props) {
  const [openDrawer, setOpenDrawer] = useState<string | null>(null)

  const drawerWidth = grid['drawer-width'] ?? '280px'
  const triggerType = grid['drawer-trigger'] ?? 'hamburger'
  const drawerPosition = grid['drawer-position'] ?? 'both'

  // Determine which sides have drawers
  const leftSlots = drawerSlots.filter((s) => s.includes('left'))
  const rightSlots = drawerSlots.filter((s) => s.includes('right'))

  const showLeft = (drawerPosition === 'left' || drawerPosition === 'both') && leftSlots.length > 0
  const showRight = (drawerPosition === 'right' || drawerPosition === 'both') && rightSlots.length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        className={`lm-drawer-backdrop ${openDrawer ? 'lm-drawer-backdrop--open' : ''}`}
        onClick={() => setOpenDrawer(null)}
      />

      {/* Left trigger */}
      {showLeft && (
        <button
          className={`lm-drawer-trigger lm-drawer-trigger--${triggerType} lm-drawer-trigger--left`}
          onClick={() => setOpenDrawer(openDrawer === 'left' ? null : 'left')}
          aria-label="Open left sidebar"
        >
          {triggerType === 'hamburger' ? (
            <div className="lm-hamburger-icon">
              <span /><span /><span />
            </div>
          ) : (
            <div style={{ width: 3, height: 24, background: 'var(--lm-border-focus)', borderRadius: 2 }} />
          )}
        </button>
      )}

      {/* Right trigger */}
      {showRight && (
        <button
          className={`lm-drawer-trigger lm-drawer-trigger--${triggerType} lm-drawer-trigger--right`}
          onClick={() => setOpenDrawer(openDrawer === 'right' ? null : 'right')}
          aria-label="Open right sidebar"
        >
          {triggerType === 'hamburger' ? (
            <div className="lm-hamburger-icon">
              <span /><span /><span />
            </div>
          ) : (
            <div style={{ width: 3, height: 24, background: 'var(--lm-border-focus)', borderRadius: 2 }} />
          )}
        </button>
      )}

      {/* Left drawer panel */}
      {showLeft && (
        <div
          className={`lm-drawer lm-drawer--left ${openDrawer === 'left' ? 'lm-drawer--open' : ''}`}
          style={{ width: drawerWidth }}
        >
          {leftSlots.map((slotName) => {
            const slotConfig = config.slots[slotName] ?? {}
            const padding = slotConfig.padding ? resolveToken(slotConfig.padding, tokens) : undefined
            return (
              <div
                key={slotName}
                className="lm-slot-zone"
                data-slot-type="sidebar-left"
                style={{ minHeight: slotConfig['min-height'] ?? '200px', padding }}
              >
                <span className="lm-slot-zone__name">{slotName}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Right drawer panel */}
      {showRight && (
        <div
          className={`lm-drawer lm-drawer--right ${openDrawer === 'right' ? 'lm-drawer--open' : ''}`}
          style={{ width: drawerWidth }}
        >
          {rightSlots.map((slotName) => {
            const slotConfig = config.slots[slotName] ?? {}
            const padding = slotConfig.padding ? resolveToken(slotConfig.padding, tokens) : undefined
            return (
              <div
                key={slotName}
                className="lm-slot-zone"
                data-slot-type="sidebar-right"
                style={{ minHeight: slotConfig['min-height'] ?? '200px', padding }}
              >
                <span className="lm-slot-zone__name">{slotName}</span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
