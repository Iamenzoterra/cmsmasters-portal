import { useRef, useEffect, useState } from 'react'
import { SLOT_DEFINITIONS } from '@cmsmasters/db/slots'
import type { LayoutConfig, TokenMap, BlockData, SlotConfig, CanvasBreakpointId } from '../lib/types'
import { CANVAS_BREAKPOINTS, resolveSlotConfig } from '../lib/types'
import { resolveToken, hslTripletToHex } from '../lib/tokens'

/** Resolve a background token or raw value to a canvas-usable hex color. */
function resolveBackgroundStyle(value: string | undefined, tokens: TokenMap): string | undefined {
  if (!value) return undefined
  if (value.startsWith('--')) {
    const raw = tokens.all[value]
    if (!raw) return undefined
    return hslTripletToHex(raw) ?? undefined
  }
  return value
}
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
${block.js ? '<script type="module">' + block.js + '</scr' + 'ipt>' : ''}
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

/** Known slot types derived from the registry + content */
const KNOWN_SLOT_TYPES = new Set([
  ...SLOT_DEFINITIONS.map((s) => s.name),
  'content',
])

function getSlotType(name: string): string {
  if (KNOWN_SLOT_TYPES.has(name)) return name
  // Fuzzy match for variants (e.g. "sidebar-left-2")
  for (const known of KNOWN_SLOT_TYPES) {
    if (name.includes(known)) return known
  }
  return name
}

export function Canvas({ config, tokens, activeBreakpoint, gridKey, selectedSlot, onSlotSelect, changedSlots, blocks }: Props) {
  const resolveSlot = (name: string): SlotConfig => resolveSlotConfig(name, gridKey, config)
  // Slots that are nested inside a container — omit from top-level renders since they draw inside the parent.
  const nestedChildNames = new Set<string>()
  for (const [, s] of Object.entries(config.slots)) {
    const nl = s['nested-slots']
    if (Array.isArray(nl)) nl.forEach((c) => nestedChildNames.add(c))
  }
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
  const isSidebarsHidden = grid.sidebars === 'hidden'
  const hideSidebars = isDrawerMode || isSidebarsHidden
  const breakpointWidth = CANVAS_BREAKPOINTS.find((b) => b.id === activeBreakpoint)!.width
  const columnGap = grid['column-gap'] ? resolveToken(grid['column-gap'], tokens) : '0px'

  // Separate slots by position (role lives on base slot — not per-bp)
  const topSlots = Object.entries(config.slots)
    .filter(([, s]) => s.position === 'top')
    .map(([name]) => [name, resolveSlot(name)] as const)
  const bottomSlots = Object.entries(config.slots)
    .filter(([, s]) => s.position === 'bottom')
    .map(([name]) => [name, resolveSlot(name)] as const)

  // In drawer/hidden mode, exclude sidebar columns from the grid.
  // Also exclude slots that are nested inside another slot (they render inside the parent zone).
  const visibleColumns = (hideSidebars
    ? Object.entries(grid.columns).filter(([name]) => !name.includes('sidebar'))
    : Object.entries(grid.columns)
  ).filter(([name]) => !nestedChildNames.has(name))

  // Fluid outer + inner max-width → minmax(maxW, 1fr) so the slot claims
  // at least its inner max-width from neighboring fluid tracks.
  const gridTemplateColumns = visibleColumns.map(([name, w]) => {
    if (w === '1fr') {
      const innerMax = resolveSlot(name)['max-width']
      if (innerMax) return `minmax(${innerMax}, 1fr)`
    }
    return w
  }).join(' ')

  // Sidebar slots for drawer mode — check config.slots, not grid.columns
  // (tablet/mobile grids don't include sidebar columns)
  const drawerSlots = isDrawerMode
    ? Object.keys(config.slots).filter((name) => name.includes('sidebar'))
    : []

  // Hidden sidebars — show muted indicators in canvas
  const hiddenSidebarSlots = isSidebarsHidden
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

  const layoutBgStyle = resolveBackgroundStyle(config.background, tokens)

  return (
    <div className="lm-canvas-scroll" ref={scrollRef}>
      <div
        className="lm-canvas-viewport"
        ref={viewportRef}
        style={{
          width: `${breakpointWidth}px`,
          transform: `scale(${scale})`,
          background: layoutBgStyle,
        }}
      >
        {/* Top-position slots (header) */}
        {topSlots.filter(([name]) => !nestedChildNames.has(name)).map(([name, slotConfig]) => (
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
            selectedSlot={selectedSlot}
            onSlotSelect={onSlotSelect}
            resolveSlot={resolveSlot}
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
            const slotConfig = resolveSlot(name)
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
                selectedSlot={selectedSlot}
                onSlotSelect={onSlotSelect}
                resolveSlot={resolveSlot}
              />
            )
          })}
        </div>

        {/* Bottom-position slots (footer) */}
        {bottomSlots.filter(([name]) => !nestedChildNames.has(name)).map(([name, slotConfig]) => (
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
            selectedSlot={selectedSlot}
            onSlotSelect={onSlotSelect}
            resolveSlot={resolveSlot}
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

        {/* Hidden sidebars indicator */}
        {hiddenSidebarSlots.length > 0 && (
          <div className="lm-hidden-sidebars">
            {hiddenSidebarSlots.map((name) => (
              <span key={name} className="lm-hidden-sidebars__badge">{name} (hidden)</span>
            ))}
          </div>
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
  selectedSlot: string | null
  onSlotSelect: (name: string) => void
  resolveSlot: (name: string) => SlotConfig
}

function SlotZone({ name, config, tokens, width, slotConfig, isSelected, isFlashing, onClick, onMouseEnter, onMouseLeave, blocks, selectedSlot, onSlotSelect, resolveSlot }: SlotZoneProps) {
  const ref = useRef<HTMLDivElement>(null)
  const minHeight = slotConfig['min-height'] ?? '80px'
  // Padding: prefer split fields, fall back to legacy shorthand
  const legacyPad = slotConfig.padding ? resolveToken(slotConfig.padding, tokens) : undefined
  const padTop = slotConfig['padding-top'] ? resolveToken(slotConfig['padding-top'], tokens) : legacyPad
  const padBottom = slotConfig['padding-bottom'] ? resolveToken(slotConfig['padding-bottom'], tokens) : legacyPad
  const padX = slotConfig['padding-x'] ? resolveToken(slotConfig['padding-x'], tokens) : legacyPad
  const hasAnyPad = padTop || padBottom || padX
  const padding = hasAnyPad ? `${padTop ?? '0'} ${padX ?? '0'} ${padBottom ?? '0'}` : undefined
  const marginTop = slotConfig['margin-top'] ? resolveToken(slotConfig['margin-top'], tokens) : undefined
  const gap = slotConfig.gap ? resolveToken(slotConfig.gap, tokens) : undefined
  const alignItems = slotConfig.align ?? undefined
  const innerMaxWidth = slotConfig['max-width'] ?? undefined

  const slotBgStyle = resolveBackgroundStyle(slotConfig.background, tokens)

  // Border
  const borderSides = slotConfig['border-sides']?.split(',').filter(Boolean) ?? []
  const borderWidth = slotConfig['border-width'] ?? '1px'
  const borderColorHex = slotConfig['border-color']
    ? resolveBackgroundStyle(slotConfig['border-color'], tokens)
    : undefined
  const borderStyle: Record<string, string> = {}
  if (borderSides.length > 0) {
    borderStyle.border = 'none'
    const bc = borderColorHex ?? '#e2e8f0'
    for (const side of borderSides) {
      const prop = `border${side.charAt(0).toUpperCase()}${side.slice(1)}` as string
      borderStyle[prop] = `${borderWidth} solid ${bc}`
    }
  }

  const testBlockSlugs = config['test-blocks']?.[name] ?? []
  const blockCount = testBlockSlugs.length
  const hasLoadedBlocks = blocks && blockCount > 0

  const hasNested = Array.isArray(slotConfig['nested-slots']) && slotConfig['nested-slots']!.length > 0
  // Container has no inner host — Phase 1 css-generator drops inner fields silently.
  // Mirror that on canvas: never paint padding/gap/align/maxWidth on a container.
  const outerPadding = hasNested ? undefined : padding
  const outerAlign = hasNested ? undefined : alignItems

  const className = [
    'lm-slot-zone',
    isSelected && 'lm-slot-zone--selected',
    isFlashing && 'lm-flash',
    hasLoadedBlocks && 'lm-slot-zone--has-blocks',
    hasNested && 'lm-slot-zone--has-nested',
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={ref}
      className={className}
      data-slot-type={getSlotType(name)}
      style={{
        minHeight: hasLoadedBlocks ? undefined : minHeight,
        padding: outerPadding,
        marginTop,
        alignItems: outerAlign,
        background: slotBgStyle,
        ...borderStyle,
      }}
      onClick={onClick}
      onMouseEnter={() => ref.current && onMouseEnter(ref.current)}
      onMouseLeave={onMouseLeave}
    >
      {/* Inner container — constrained by max-width, positioned by outer align-items */}
      <div
        className="lm-slot-zone__inner"
        data-constrained={!hasNested && innerMaxWidth ? '' : undefined}
        style={{ maxWidth: hasNested ? undefined : innerMaxWidth }}
      >
        {/* Label row */}
        <div className="lm-slot-zone__label-row">
          <span className="lm-slot-zone__name">{name}</span>
          {config.slots[name]?.sticky && (
            <span className="lm-slot-zone__sticky-badge" title="Sticky">sticky</span>
          )}
          <span className="lm-slot-zone__width">
            {width}{innerMaxWidth ? ` → ${innerMaxWidth}` : ''}
          </span>
          {blockCount > 0 && (
            <span className="lm-slot-zone__blocks">{blockCount} blocks</span>
          )}
        </div>

        {/* Nested children — dashed zones rendered inside parent. One level deep.
            TODO: deeper nesting when needed. */}
        {hasNested && (
          <div className="lm-nested-stack" style={{ gap: gap || undefined }}>
            {slotConfig['nested-slots']!.map((childName) => {
              const childCfg = resolveSlot(childName)
              const childMaxW = childCfg['max-width']
              const childAlign = childCfg.align
              const childBg = resolveBackgroundStyle(childCfg.background, tokens)
              // Child padding: prefer split fields, fall back to legacy shorthand
              const cLegacy = childCfg.padding ? resolveToken(childCfg.padding, tokens) : undefined
              const cPadTop = childCfg['padding-top'] ? resolveToken(childCfg['padding-top'], tokens) : cLegacy
              const cPadBot = childCfg['padding-bottom'] ? resolveToken(childCfg['padding-bottom'], tokens) : cLegacy
              const cPadX = childCfg['padding-x'] ? resolveToken(childCfg['padding-x'], tokens) : cLegacy
              const cHasPad = cPadTop || cPadBot || cPadX
              const childPadding = cHasPad ? `${cPadTop ?? '0'} ${cPadX ?? '0'} ${cPadBot ?? '0'}` : undefined
              // Child border
              const cBorderSides = childCfg['border-sides']?.split(',').filter(Boolean) ?? []
              const cBorderWidth = childCfg['border-width'] ?? '1px'
              const cBorderColorHex = childCfg['border-color']
                ? resolveBackgroundStyle(childCfg['border-color'], tokens)
                : undefined
              const childBorderStyle: Record<string, string> = {}
              if (cBorderSides.length > 0) {
                childBorderStyle.border = 'none'
                const cbc = cBorderColorHex ?? '#e2e8f0'
                for (const side of cBorderSides) {
                  const prop = `border${side.charAt(0).toUpperCase()}${side.slice(1)}` as string
                  childBorderStyle[prop] = `${cBorderWidth} solid ${cbc}`
                }
              }
              const isChildSelected = childName === selectedSlot
              return (
                <div
                  key={childName}
                  className={`lm-slot-zone lm-slot-zone--nested${isChildSelected ? ' lm-slot-zone--selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  data-slot-name={childName}
                  aria-label={`Nested slot ${childName} inside ${name}`}
                  style={{
                    maxWidth: childMaxW,
                    padding: childPadding,
                    alignItems: childAlign,
                    background: childBg,
                    marginInline: childAlign === 'center' ? 'auto' : undefined,
                    ...childBorderStyle,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSlotSelect(childName)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onSlotSelect(childName)
                    }
                  }}
                >
                  <div className="lm-slot-zone--nested__content">
                    <div className="lm-slot-zone__label-row">
                      <span className="lm-slot-zone__name">{childName}</span>
                      {childMaxW && <span className="lm-slot-zone__width">{childMaxW}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
    </div>
  )
}
