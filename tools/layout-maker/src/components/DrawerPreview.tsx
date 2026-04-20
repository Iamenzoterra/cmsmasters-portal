import { useState } from 'react'
import type { LayoutConfig, TokenMap, BreakpointGrid } from '../lib/types'
import { resolveToken } from '../lib/tokens'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  grid: BreakpointGrid
  drawerSlots: string[]
}

type TriggerVariant = 'peek' | 'hamburger' | 'tab'

// Shared with Portal via packages/ui/src/portal/portal-shell.css. Class names
// and open-state convention (.is-open on the layer, .is-active on the panel)
// must match exactly — the whole point of this component is that Canvas and
// the real Portal render speak the same drawer language.
export function DrawerPreview({ config, tokens, grid, drawerSlots }: Props) {
  const [openSide, setOpenSide] = useState<'left' | 'right' | null>(null)

  const drawerWidth = grid['drawer-width'] ?? '400px'
  const triggerVariant = (grid['drawer-trigger'] as TriggerVariant | undefined) ?? 'peek'
  const drawerPosition = grid['drawer-position'] ?? 'both'

  const leftSlots = drawerSlots.filter((s) => s.includes('left'))
  const rightSlots = drawerSlots.filter((s) => s.includes('right'))

  const showLeft = (drawerPosition === 'left' || drawerPosition === 'both') && leftSlots.length > 0
  const showRight = (drawerPosition === 'right' || drawerPosition === 'both') && rightSlots.length > 0

  const toggle = (side: 'left' | 'right') => setOpenSide(openSide === side ? null : side)
  const close = () => setOpenSide(null)

  return (
    <>
      {showLeft && (
        <TriggerButton
          variant={triggerVariant}
          side="left"
          label="Open left"
          onClick={() => toggle('left')}
          hidden={openSide !== null}
        />
      )}
      {showRight && (
        <TriggerButton
          variant={triggerVariant}
          side="right"
          label="Open right"
          onClick={() => toggle('right')}
          hidden={openSide !== null}
        />
      )}

      <div className={`drawer-layer${openSide ? ' is-open' : ''}`}>
        <div className="drawer-backdrop" onClick={close} />

        {showLeft && (
          <DrawerPanel
            side="left"
            slots={leftSlots}
            config={config}
            tokens={tokens}
            width={drawerWidth}
            isActive={openSide === 'left'}
            onClose={close}
          />
        )}

        {showRight && (
          <DrawerPanel
            side="right"
            slots={rightSlots}
            config={config}
            tokens={tokens}
            width={drawerWidth}
            isActive={openSide === 'right'}
            onClose={close}
          />
        )}
      </div>
    </>
  )
}

function TriggerButton({
  variant,
  side,
  label,
  onClick,
  hidden,
}: {
  variant: TriggerVariant
  side: 'left' | 'right'
  label: string
  onClick: () => void
  hidden: boolean
}) {
  // "tab" is an alias for peek (same visual) until a distinct tab variant
  // design exists — keeps the enum value meaningful without dead CSS.
  const renderVariant = variant === 'tab' ? 'peek' : variant
  const cls = `drawer-trigger drawer-trigger--${renderVariant} drawer-trigger--${side}${hidden ? ' drawer-trigger--is-hidden' : ''}`
  const style = hidden ? { opacity: 0, pointerEvents: 'none' as const } : undefined

  if (renderVariant === 'hamburger') {
    return (
      <button type="button" className={cls} onClick={onClick} aria-label={label} style={style}>
        <span className="drawer-hamburger-icon" aria-hidden="true">
          <span /><span /><span />
        </span>
      </button>
    )
  }

  return (
    <button type="button" className={cls} onClick={onClick} aria-label={label} style={style}>
      <span className="drawer-trigger__icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={side === 'left' ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
        </svg>
      </span>
      <span className="drawer-trigger__label">{side === 'left' ? 'Menu' : 'Details'}</span>
    </button>
  )
}

function DrawerPanel({
  side,
  slots,
  config,
  tokens,
  width,
  isActive,
  onClose,
}: {
  side: 'left' | 'right'
  slots: string[]
  config: LayoutConfig
  tokens: TokenMap
  width: string
  isActive: boolean
  onClose: () => void
}) {
  return (
    <aside
      className={`drawer-panel drawer-panel--${side}${isActive ? ' is-active' : ''}`}
      style={{ width }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isActive}
    >
      <div className="drawer-head">
        <div className="drawer-head__meta">
          <span className="drawer-head__eyebrow">{side === 'left' ? 'Menu' : 'Details'}</span>
          <h3 className="drawer-head__title">{slots.join(' · ')}</h3>
        </div>
        <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="drawer-body">
        {slots.map((name) => {
          const sc = config.slots[name] ?? {}
          const padding = sc.padding ? resolveToken(sc.padding, tokens) : undefined
          return (
            <div
              key={name}
              className="lm-slot-zone"
              data-slot-type={`sidebar-${side}`}
              style={{ minHeight: sc['min-height'] ?? '200px', padding }}
            >
              <span className="lm-slot-zone__name">{name}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
