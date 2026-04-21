import { useEffect, useRef, useState } from 'react'
import type { LayoutConfig, BreakpointGrid } from '../lib/types'
import { getDrawerIcon } from '../../../../packages/ui/src/portal/drawer-icons'

interface Props {
  config: LayoutConfig
  grid: BreakpointGrid
  drawerSlots: string[]
}

type TriggerVariant = 'peek' | 'hamburger' | 'tab' | 'fab'

// Shared with Portal via packages/ui/src/portal/portal-shell.css. The shell
// contract: one DOM copy of each sidebar lives in the grid. At drawer/push
// BPs the layout CSS turns that same node into a fixed off-canvas panel
// via [data-drawer-side]. This preview mirrors Portal's portal-shell.js
// state: toggling body.drawer-is-open(-left|-right) and, for FAB, the
// trigger's .drawer-trigger--is-armed class. LM canvas and the real Portal
// speak the same open-state vocabulary.
export function DrawerPreview({ config, grid, drawerSlots }: Props) {
  const [openSide, setOpenSide] = useState<'left' | 'right' | null>(null)
  const [armedSide, setArmedSide] = useState<'left' | 'right' | null>(null)
  const armTimerRef = useRef<number | null>(null)

  const triggerVariant = (grid['drawer-trigger'] as TriggerVariant | undefined) ?? 'peek'
  const drawerPosition = grid['drawer-position'] ?? 'both'

  const leftSlots = drawerSlots.filter((s) => s.includes('left'))
  const rightSlots = drawerSlots.filter((s) => s.includes('right'))

  const showLeft = (drawerPosition === 'left' || drawerPosition === 'both') && leftSlots.length > 0
  const showRight = (drawerPosition === 'right' || drawerPosition === 'both') && rightSlots.length > 0

  const clearArm = () => {
    if (armTimerRef.current !== null) {
      window.clearTimeout(armTimerRef.current)
      armTimerRef.current = null
    }
    setArmedSide(null)
  }

  const close = () => {
    setOpenSide(null)
    clearArm()
  }

  const handleTrigger = (side: 'left' | 'right') => {
    if (openSide === side) {
      close()
      return
    }
    if (triggerVariant !== 'fab') {
      clearArm()
      setOpenSide(openSide === side ? null : side)
      return
    }
    // FAB path — arm then open.
    if (armedSide === side) {
      clearArm()
      setOpenSide(side)
      return
    }
    clearArm()
    setOpenSide(null)
    setArmedSide(side)
    armTimerRef.current = window.setTimeout(() => {
      setArmedSide(null)
      armTimerRef.current = null
      setOpenSide(side)
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (armTimerRef.current !== null) window.clearTimeout(armTimerRef.current)
    }
  }, [])

  // Mirror state onto body — same CSS hooks the real Portal's shell.js uses.
  // Mode (drawer/push) is a per-BP concern in real Portal; in the canvas
  // we just toggle the open-state classes and let the canvas-only panel
  // visualizer show the sidebar sliding in.
  useEffect(() => {
    const body = document.body
    body.classList.toggle('drawer-is-open', openSide !== null)
    body.classList.toggle('drawer-is-open-left', openSide === 'left')
    body.classList.toggle('drawer-is-open-right', openSide === 'right')
    return () => {
      body.classList.remove(
        'drawer-is-open',
        'drawer-is-open-left',
        'drawer-is-open-right',
      )
    }
  }, [openSide])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const leftTriggerSlot = leftSlots[0] ? config.slots[leftSlots[0]] : undefined
  const rightTriggerSlot = rightSlots[0] ? config.slots[rightSlots[0]] : undefined
  const leftLabel = leftTriggerSlot?.['drawer-trigger-label'] ?? 'Menu'
  const rightLabel = rightTriggerSlot?.['drawer-trigger-label'] ?? 'Details'
  const leftIcon = leftTriggerSlot?.['drawer-trigger-icon']
  const rightIcon = rightTriggerSlot?.['drawer-trigger-icon']
  const leftColor = leftTriggerSlot?.['drawer-trigger-color']
  const rightColor = rightTriggerSlot?.['drawer-trigger-color']

  return (
    <>
      {showLeft && (
        <TriggerButton
          variant={triggerVariant}
          side="left"
          label={leftLabel}
          iconName={leftIcon}
          colorToken={leftColor}
          armed={armedSide === 'left'}
          onClick={() => handleTrigger('left')}
        />
      )}
      {showRight && (
        <TriggerButton
          variant={triggerVariant}
          side="right"
          label={rightLabel}
          iconName={rightIcon}
          colorToken={rightColor}
          armed={armedSide === 'right'}
          onClick={() => handleTrigger('right')}
        />
      )}

      <div className={`drawer-layer${openSide ? ' is-open' : ''}`}>
        <div className="drawer-backdrop" onClick={close} />
        {/* Canvas-only visualizer. Real Portal uses the grid sidebar itself
            (stamped with data-drawer-side) as the panel; the canvas renders
            sidebars as placeholder zones, so we draw a representative panel
            rect here to show size + direction. */}
        {showLeft && (
          <div
            className="lm-drawer-canvas-panel lm-drawer-canvas-panel--left"
            data-drawer-side="left"
            aria-hidden={openSide !== 'left'}
          />
        )}
        {showRight && (
          <div
            className="lm-drawer-canvas-panel lm-drawer-canvas-panel--right"
            data-drawer-side="right"
            aria-hidden={openSide !== 'right'}
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
  iconName,
  colorToken,
  armed,
  onClick,
}: {
  variant: TriggerVariant
  side: 'left' | 'right'
  label: string
  iconName?: string
  colorToken?: string
  armed: boolean
  onClick: () => void
}) {
  const renderVariant = variant === 'tab' ? 'peek' : variant
  const cls = [
    'drawer-trigger',
    `drawer-trigger--${renderVariant}`,
    `drawer-trigger--${side}`,
    armed ? 'drawer-trigger--is-armed' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style: Record<string, string> = {}
  if (colorToken) {
    style['--drawer-trigger-bg'] = `hsl(var(${colorToken}))`
  }
  const icon = getDrawerIcon(iconName)

  if (renderVariant === 'hamburger') {
    return (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        aria-label={label}
        style={Object.keys(style).length > 0 ? style : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="18" height="18">
          <path d={icon.d} />
        </svg>
      </button>
    )
  }

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
      aria-label={label}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      <span className="drawer-trigger__icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon.d} />
        </svg>
      </span>
      <span className="drawer-trigger__label">{label}</span>
    </button>
  )
}
