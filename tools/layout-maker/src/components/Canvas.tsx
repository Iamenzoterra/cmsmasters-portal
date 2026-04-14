import { useRef, useEffect, useState } from 'react'
import type { LayoutConfig, TokenMap, BlockData, SlotConfig, CanvasBreakpointId } from '../lib/types'
import { CANVAS_BREAKPOINTS } from '../lib/types'
import { resolveToken } from '../lib/tokens'
import { DrawerPreview } from './DrawerPreview'
import { SlotOverlay } from './SlotOverlay'
// Portal assets for iframe injection (same pattern as Studio's block-preview.tsx)
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../packages/ui/src/portal/animate-utils.js?raw'

/** Renders a block inside an iframe for full CSS isolation */
function BlockFrame({ block }: { block: BlockData }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(200)

  const srcDoc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
@layer tokens, reset, shared, block;
@layer tokens {
${tokensCSS}
}
@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Manrope', system-ui, sans-serif; overflow: hidden; background: white; }
}
@layer shared {
${portalBlocksCSS}
}
@layer block {
${block.css || ''}
}
</style>
</head><body>
<div data-block-shell="${block.slug}">
${block.html}
</div>
<script type="module">
${animateUtilsJS}
</script>
<script>
(function() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('[class*="reveal"]').forEach(function(el) { observer.observe(el); });
})();
</script>
${block.js ? '<script type="module">' + block.js + '<\/script>' : ''}
<script>
new ResizeObserver(function() {
  window.parent.postMessage({ type: 'lm-block-height', slug: '${block.slug}', height: document.body.scrollHeight }, '*');
}).observe(document.body);
</script>
</body></html>`

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'lm-block-height' && e.data.slug === block.slug) {
        setHeight(e.data.height)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [block.slug])

  return (
    <div className="lm-block-shell">
      {block.js && <span className="lm-block-shell__js-badge">JS</span>}
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        style={{ width: '100%', height: `${height}px`, border: 'none', display: 'block' }}
        sandbox="allow-scripts allow-same-origin"
        title={`block-${block.slug}`}
      />
    </div>
  )
}

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  activeBreakpoint: CanvasBreakpointId
  gridKey: string
  selectedSlot: string | null
  onSlotSelect: (name: string) => void
  changedSlots: string[]
  blocks: Map<string, BlockData> | null
}

function getSlotType(name: string): string {
  if (name === 'header') return 'header'
  if (name === 'footer') return 'footer'
  if (name === 'content') return 'content'
  if (name.includes('sidebar-left') || name === 'sidebar-left') return 'sidebar-left'
  if (name.includes('sidebar-right') || name === 'sidebar-right') return 'sidebar-right'
  return name
}

export function Canvas({ config, tokens, activeBreakpoint, gridKey, selectedSlot, onSlotSelect, changedSlots, blocks }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoverInfo, setHoverInfo] = useState<{
    name: string
    element: HTMLElement
    slotConfig: SlotConfig
    columnWidth: string
  } | null>(null)

  const grid = config.grid[gridKey]
  if (!grid) return <div className="lm-empty">No grid config for "{gridKey}"</div>

  const isDrawerMode = grid.sidebars === 'drawer'
  const breakpointWidth = CANVAS_BREAKPOINTS.find((b) => b.id === activeBreakpoint)!.width
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
            blocks={blocks}
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
                blocks={blocks}
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
            blocks={blocks}
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
  slotConfig: SlotConfig
  isSelected: boolean
  isFlashing: boolean
  onClick: () => void
  onMouseEnter: (el: HTMLElement) => void
  onMouseLeave: () => void
  blocks: Map<string, BlockData> | null
}

function SlotZone({ name, config, tokens, width, slotConfig, isSelected, isFlashing, onClick, onMouseEnter, onMouseLeave, blocks }: SlotZoneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const minHeight = slotConfig['min-height'] ?? '80px'
  const padding = slotConfig.padding ? resolveToken(slotConfig.padding, tokens) : undefined
  const marginTop = slotConfig['margin-top'] ? resolveToken(slotConfig['margin-top'], tokens) : undefined
  const gap = slotConfig.gap ? resolveToken(slotConfig.gap, tokens) : undefined

  const testBlockSlugs = config['test-blocks']?.[name] ?? []
  const blockCount = testBlockSlugs.length
  const hasLoadedBlocks = blocks && blockCount > 0

  const className = [
    'lm-slot-zone',
    isSelected && 'lm-slot-zone--selected',
    isFlashing && 'lm-flash',
    hasLoadedBlocks && 'lm-slot-zone--has-blocks',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={ref}
      className={className}
      data-slot-type={getSlotType(name)}
      style={{
        minHeight: hasLoadedBlocks ? undefined : minHeight,
        padding,
        marginTop,
      }}
      onClick={onClick}
      onMouseEnter={() => ref.current && onMouseEnter(ref.current)}
      onMouseLeave={onMouseLeave}
    >
      {/* Label row */}
      <div className="lm-slot-zone__label-row">
        <span className="lm-slot-zone__name">{name}</span>
        <span className="lm-slot-zone__width">{width}</span>
        {blockCount > 0 && (
          <span className="lm-slot-zone__blocks">{blockCount} blocks</span>
        )}
      </div>

      {/* Block content — rendered in iframes for full CSS isolation */}
      {hasLoadedBlocks && (
        <div className="lm-slot-zone__block-stack" style={{ gap: gap || undefined }}>
          {testBlockSlugs.map((slug) => {
            const block = blocks.get(slug)
            if (!block) {
              return (
                <div key={slug} className="lm-block-missing">
                  block &apos;{slug}&apos; not found
                </div>
              )
            }
            return (
              <BlockFrame key={slug} block={block} />
            )
          })}
        </div>
      )}
    </div>
  )
}
