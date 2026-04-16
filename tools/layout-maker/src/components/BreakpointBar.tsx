import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { CanvasBreakpointId, LayoutConfig, TokenMap } from '../lib/types'
import { CANVAS_BREAKPOINTS, DEVICE_PRESETS, resolveGridKey } from '../lib/types'

interface Props {
  config: LayoutConfig
  tokens: TokenMap
  activeBreakpoint: CanvasBreakpointId
  viewportWidth: number
  onBreakpointChange: (bp: CanvasBreakpointId) => void
  onDevicePreset: (width: number) => void
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

export function BreakpointBar({ config, tokens, activeBreakpoint, viewportWidth, onBreakpointChange, onDevicePreset }: Props) {
  const gridKey = resolveGridKey(activeBreakpoint, config.grid)
  const grid = config.grid[gridKey]
  if (!grid) return null

  const canonicalWidth = CANVAS_BREAKPOINTS.find((b) => b.id === activeBreakpoint)!.width
  const isCustomWidth = viewportWidth !== canonicalWidth

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

  // Group presets by breakpoint for the dropdown
  const presetsByBp: Record<CanvasBreakpointId, typeof DEVICE_PRESETS> = {
    desktop: DEVICE_PRESETS.filter((p) => p.breakpoint === 'desktop'),
    tablet: DEVICE_PRESETS.filter((p) => p.breakpoint === 'tablet'),
    mobile: DEVICE_PRESETS.filter((p) => p.breakpoint === 'mobile'),
  }

  return (
    <div className="lm-bp-bar">
      <div className="lm-bp-bar__row">
        <div className="lm-bp-bar__buttons">
          {CANVAS_BREAKPOINTS.map((b) => (
            <button
              key={b.id}
              className={`lm-bp-btn ${b.id === activeBreakpoint ? 'lm-bp-btn--active' : ''}`}
              onClick={() => onBreakpointChange(b.id)}
              title={`${b.label} — ${b.width}px (Ctrl+${CANVAS_BREAKPOINTS.indexOf(b) + 1})`}
            >
              {icons[b.id]}
              <span className="lm-bp-btn__width">{b.width}</span>
            </button>
          ))}
        </div>

        <PresetDropdown
          presetsByBp={presetsByBp}
          viewportWidth={viewportWidth}
          onSelect={onDevicePreset}
        />
      </div>

      <div className="lm-bp-bar__widths">
        <span>
          Viewport: <strong>{viewportWidth}px</strong>
          {isCustomWidth && (
            <span className="lm-bp-bar__custom-badge">custom</span>
          )}
        </span>
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

      <div className="lm-bp-bar__shortcuts">
        <kbd>Ctrl+1/2/3</kbd> switch
        <kbd>Ctrl+[/]</kbd> cycle
      </div>
    </div>
  )
}

/* ── Device Preset Dropdown ─────────────────────────────────── */

interface PresetDropdownProps {
  presetsByBp: Record<CanvasBreakpointId, typeof DEVICE_PRESETS>
  viewportWidth: number
  onSelect: (width: number) => void
}

function PresetDropdown({ presetsByBp, viewportWidth, onSelect }: PresetDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const activeName = DEVICE_PRESETS.find((p) => p.width === viewportWidth)?.name

  return (
    <div className="lm-preset-dropdown" ref={ref}>
      <button
        className="lm-preset-dropdown__trigger"
        onClick={() => setOpen(!open)}
        title="Device presets"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 4.5h12M1 9.5h12M4.5 1v12M9.5 1v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span>{activeName ?? `${viewportWidth}px`}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className="lm-preset-dropdown__chevron">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="lm-preset-dropdown__menu">
          {(['desktop', 'tablet', 'mobile'] as CanvasBreakpointId[]).map((bp) => (
            <div key={bp} className="lm-preset-dropdown__group">
              <div className="lm-preset-dropdown__group-label">
                {icons[bp]}
                <span>{bp}</span>
              </div>
              {presetsByBp[bp].map((preset) => (
                <button
                  key={preset.width}
                  className={`lm-preset-dropdown__item ${preset.width === viewportWidth ? 'lm-preset-dropdown__item--active' : ''}`}
                  onClick={() => {
                    onSelect(preset.width)
                    setOpen(false)
                  }}
                >
                  <span>{preset.name}</span>
                  <span className="lm-preset-dropdown__item-width">{preset.width}px</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
