import type { ReactNode } from 'react'
import type { CanvasBreakpointId, LayoutConfig, TokenMap } from '../lib/types'
import { CANVAS_BREAKPOINTS, resolveGridKey } from '../lib/types'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  activeBreakpoint: CanvasBreakpointId
  onBreakpointChange: (bp: CanvasBreakpointId) => void
}

/* ── Inline SVG icons (16×16) ───────────────────────────────── */

const icons: Record<CanvasBreakpointId, ReactNode> = {
  desktop: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  tablet: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="1" width="11" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 12.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  mobile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="1" width="8" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 12.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

export function BreakpointBar({ config, tokens, activeBreakpoint, onBreakpointChange }: Props) {
  const gridKey = resolveGridKey(activeBreakpoint, config.grid)
  const grid = config.grid[gridKey]
  if (!grid) return null

  const bp = CANVAS_BREAKPOINTS.find((b) => b.id === activeBreakpoint)!

  // Resolve a spacing token to px value
  function resolveGap(tokenOrValue: string): string {
    if (tokenOrValue === '0') return '0'
    const px = tokens.spacing[tokenOrValue]
    return px != null ? `${px}px` : tokenOrValue
  }

  const columnWidths = Object.entries(grid.columns).map(([name, width]) => ({
    name,
    width,
  }))

  const gapDisplay = grid['column-gap']
    ? `${grid['column-gap']} (${resolveGap(grid['column-gap'])})`
    : '0'

  return (
    <div className="lm-bp-bar">
      <div className="lm-bp-bar__buttons">
        {CANVAS_BREAKPOINTS.map((b) => (
          <button
            key={b.id}
            className={`lm-bp-btn ${b.id === activeBreakpoint ? 'lm-bp-btn--active' : ''}`}
            onClick={() => onBreakpointChange(b.id)}
            title={`${b.label} — ${b.width}px`}
          >
            {icons[b.id]}
            <span className="lm-bp-btn__width">{b.width}</span>
          </button>
        ))}
      </div>

      <div className="lm-bp-bar__widths">
        <span>Viewport: <strong>{bp.width}px</strong></span>
        <span className="lm-bp-bar__sep">|</span>
        <span>Grid: <strong>{gridKey}</strong></span>
        {columnWidths.map(({ name, width }) => (
          <span key={name}>
            {name}: <strong>{width}</strong>
          </span>
        ))}
        <span>Gap: <strong>{gapDisplay}</strong></span>
        {grid['max-width'] && (
          <span>Max: <strong>{grid['max-width']}</strong></span>
        )}
      </div>
    </div>
  )
}
