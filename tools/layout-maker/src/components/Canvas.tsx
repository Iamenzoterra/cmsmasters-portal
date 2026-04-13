import { useRef, useEffect, useState } from 'react'
import type { LayoutConfig, TokenMap } from '../lib/types'
import { resolveToken } from '../lib/tokens'
import { DrawerPreview } from './DrawerPreview'
import { SlotOverlay } from './SlotOverlay'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  activeBreakpoint: string
  selectedSlot: string | null
  onSlotSelect: (name: string) => void
  changedSlots: string[]
}

function getSlotType(name: string): string {
  if (name === 'header') return 'header'
  if (name === 'footer') return 'footer'
  if (name === 'content') return 'content'
  if (name.includes('sidebar-left') || name === 'sidebar-left') return 'sidebar-left'
  if (name.includes('sidebar-right') || name === 'sidebar-right') return 'sidebar-right'
  return name
}

export function Canvas({ config, tokens, activeBreakpoint, selectedSlot, onSlotSelect, changedSlots }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoverInfo, setHoverInfo] = useState<{
    name: string
    element: HTMLElement
    slotConfig: { padding?: string; gap?: string; [key: string]: unknown }
    columnWidth: string
  } | null>(null)

  const grid = config.grid[activeBreakpoint]
  if (!grid) return <div className="lm-empty">No grid config for "{activeBreakpoint}"</div>

  const isDrawerMode = grid.sidebars === 'drawer'
  const breakpointWidth = parseInt(grid['min-width'], 10) || 1440
  const columnGap = grid['column-gap'] ? resolveToken(grid['column-gap'], tokens) : '0px'

  // Separate slots by position
  const topSlots = Object.entries(config.slots).filter(([, s]) => s.position === 'top')
  const bottomSlots = Object.entries(config.slots).filter(([, s]) => s.position === 'bottom')

  // In drawer mode, exclude sidebar columns from the grid
  const visibleColumns = isDrawerMode
    ? Object.entries(grid.columns).filter(([name]) => !name.includes('sidebar'))
    : Object.entries(grid.columns)

  const gridTemplateColumns = visibleColumns.map(([, w]) => w).join(' ')

  // Sidebar slots for drawer mode — check config.slots, not grid.columns
  // (tablet/mobile grids don't include sidebar columns)
  const drawerSlots = isDrawerMode
    ? Object.keys(config.slots).filter((name) => name.includes('sidebar'))
    : []

  // Scale canvas to fit available space
  useEffect(() => {
    function updateScale() {
      if (!scrollRef.current) return
      const available = scrollRef.current.clientWidth - 48 // padding
      const newScale = available < breakpointWidth ? available / breakpointWidth : 1
      setScale(newScale)
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [breakpointWidth])

  return (
    <div className="lm-canvas-scroll" ref={scrollRef}>
      <div
        className="lm-canvas-viewport"
        ref={viewportRef}
        style={{
          width: `${breakpointWidth}px`,
          transform: `scale(${scale})`,
        }}
      >
        {/* Top-position slots (header) */}
        {topSlots.map(([name, slotConfig]) => (
          <SlotZone
            key={name}
            name={name}
            config={config}
            tokens={tokens}
            width="100%"
            slotConfig={slotConfig}
            isSelected={name === selectedSlot}
            isFlashing={changedSlots.includes(name)}
            onClick={() => onSlotSelect(name)}
            onMouseEnter={(el) => setHoverInfo({ name, element: el, slotConfig, columnWidth: '100%' })}
            onMouseLeave={() => setHoverInfo(null)}
          />
        ))}

        {/* Grid area */}
        <div
          className="lm-layout-grid"
          style={{
            gridTemplateColumns,
            columnGap,
            maxWidth: grid['max-width'] ?? undefined,
            margin: grid.center ? '0 auto' : undefined,
          }}
        >
          {visibleColumns.map(([name, width]) => {
            const slotConfig = config.slots[name] ?? {}
            return (
              <SlotZone
                key={name}
                name={name}
                config={config}
                tokens={tokens}
                width={width}
                slotConfig={slotConfig}
                isSelected={name === selectedSlot}
                isFlashing={changedSlots.includes(name)}
                onClick={() => onSlotSelect(name)}
                onMouseEnter={(el) => setHoverInfo({ name, element: el, slotConfig, columnWidth: width })}
                onMouseLeave={() => setHoverInfo(null)}
              />
            )
          })}
        </div>

        {/* Bottom-position slots (footer) */}
        {bottomSlots.map(([name, slotConfig]) => (
          <SlotZone
            key={name}
            name={name}
            config={config}
            tokens={tokens}
            width="100%"
            slotConfig={slotConfig}
            isSelected={name === selectedSlot}
            isFlashing={changedSlots.includes(name)}
            onClick={() => onSlotSelect(name)}
            onMouseEnter={(el) => setHoverInfo({ name, element: el, slotConfig, columnWidth: '100%' })}
            onMouseLeave={() => setHoverInfo(null)}
          />
        ))}

        {/* Drawer triggers + panels for tablet/mobile */}
        {isDrawerMode && (
          <DrawerPreview
            config={config}
            tokens={tokens}
            grid={grid}
            drawerSlots={drawerSlots}
          />
        )}

        {/* Hover overlay */}
        {hoverInfo && viewportRef.current && (
          <SlotOverlay
            slotName={hoverInfo.name}
            slotConfig={hoverInfo.slotConfig}
            columnWidth={hoverInfo.columnWidth}
            columnGap={columnGap}
            tokens={tokens}
            slotElement={hoverInfo.element}
            viewportElement={viewportRef.current}
          />
        )}
      </div>
    </div>
  )
}

// --- SlotZone sub-component ---

interface SlotZoneProps {
  name: string
  config: LayoutConfig
  tokens: TokenMap
  width: string
  slotConfig: { padding?: string; gap?: string; 'min-height'?: string; 'margin-top'?: string; position?: string }
  isSelected: boolean
  isFlashing: boolean
  onClick: () => void
  onMouseEnter: (el: HTMLElement) => void
  onMouseLeave: () => void
}

function SlotZone({ name, config, tokens, width, slotConfig, isSelected, isFlashing, onClick, onMouseEnter, onMouseLeave }: SlotZoneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const minHeight = slotConfig['min-height'] ?? '80px'
  const padding = slotConfig.padding ? resolveToken(slotConfig.padding, tokens) : undefined
  const marginTop = slotConfig['margin-top'] ? resolveToken(slotConfig['margin-top'], tokens) : undefined

  const testBlocks = config['test-blocks']?.[name]
  const blockCount = testBlocks?.length ?? 0

  const className = [
    'lm-slot-zone',
    isSelected && 'lm-slot-zone--selected',
    isFlashing && 'lm-flash',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={ref}
      className={className}
      data-slot-type={getSlotType(name)}
      style={{
        minHeight,
        padding,
        marginTop,
      }}
      onClick={onClick}
      onMouseEnter={() => ref.current && onMouseEnter(ref.current)}
      onMouseLeave={onMouseLeave}
    >
      <span className="lm-slot-zone__name">{name}</span>
      <span className="lm-slot-zone__width">{width}</span>
      {blockCount > 0 && (
        <span className="lm-slot-zone__blocks">{blockCount} blocks</span>
      )}
    </div>
  )
}
