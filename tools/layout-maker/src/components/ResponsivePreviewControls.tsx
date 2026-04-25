import { useEffect, useState } from 'react'
import type { CanvasBreakpointId, LayoutConfig } from '../lib/types'

export type BatchUpdateSlotConfig = (
  slotNames: string[],
  key: string,
  value: string | number | undefined,
  breakpointId?: CanvasBreakpointId,
) => void

export type UpdateGridProp = (
  breakpointKey: string,
  key: string,
  value: string | undefined,
) => void

export function hasResponsivePreviewControls(
  config: LayoutConfig,
  activeBreakpoint: CanvasBreakpointId,
  gridKey: string,
): boolean {
  const grid = config.grid[gridKey]
  if (!grid) return false

  const sidebarNames = Object.keys(config.slots).filter((n) => n.includes('sidebar'))
  const hasSidebarModeControl = activeBreakpoint !== 'desktop' && sidebarNames.length > 0
  const isOffCanvas = (v: string | undefined) => v === 'drawer' || v === 'push'
  const hasDrawerSettings =
    isOffCanvas(grid.sidebars)
    || Object.values(grid.slots ?? {}).some((s) => isOffCanvas(s.visibility))

  return hasSidebarModeControl || hasDrawerSettings
}

export function SidebarModeControl({ config, activeBreakpoint, gridKey, onBatchUpdateSlotConfig }: {
  config: LayoutConfig
  activeBreakpoint: CanvasBreakpointId
  gridKey: string
  onBatchUpdateSlotConfig: BatchUpdateSlotConfig
}) {
  const isDesktop = activeBreakpoint === 'desktop'
  const sidebarNames = Object.keys(config.slots).filter((n) => n.includes('sidebar'))
  if (isDesktop || sidebarNames.length === 0) return null

  const sidebarVisibilities = sidebarNames.map((name) => {
    const override = config.grid[gridKey]?.slots?.[name]?.visibility
    return override ?? undefined
  })
  const allSame = sidebarVisibilities.every((v) => v === sidebarVisibilities[0])
  const currentMode = allSame ? sidebarVisibilities[0] : undefined

  return (
    <div className="lm-inspector__section lm-inspector__info">
      <div className="lm-inspector__row">
        <span className="lm-inspector__label">All sidebars at {activeBreakpoint}</span>
      </div>
      <div className="lm-align-group">
        {([
          { value: undefined, label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'drawer', label: 'Drawer' },
          { value: 'push', label: 'Push' },
        ] as const).map((opt) => (
          <button
            key={opt.label}
            className={`lm-align-btn${currentMode === opt.value ? ' lm-align-btn--active' : ''}`}
            onClick={() => {
              onBatchUpdateSlotConfig(sidebarNames, 'visibility', opt.value, activeBreakpoint)
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DrawerSettingsControl({ config, activeBreakpoint, gridKey, onUpdateGridProp }: {
  config: LayoutConfig
  activeBreakpoint: CanvasBreakpointId
  gridKey: string
  onUpdateGridProp: UpdateGridProp
}) {
  const grid = config.grid[gridKey]

  const [widthDraft, setWidthDraft] = useState((grid?.['drawer-width'] ?? '').replace(/px$/, ''))

  useEffect(() => {
    setWidthDraft((grid?.['drawer-width'] ?? '').replace(/px$/, ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridKey, grid?.['drawer-width']])

  if (!grid) return null

  const isOffCanvas = (v: string | undefined) => v === 'drawer' || v === 'push'
  const perSlotOffCanvas = Object.values(grid.slots ?? {}).some((s) => isOffCanvas(s.visibility))
  const gridLevelOffCanvas = isOffCanvas(grid.sidebars)
  if (!perSlotOffCanvas && !gridLevelOffCanvas) return null

  const inheritedWidth = (() => {
    if (grid['drawer-width']) return undefined
    const sorted = Object.entries(config.grid)
      .sort(([, a], [, b]) => parseInt(b['min-width'], 10) - parseInt(a['min-width'], 10))
    const idx = sorted.findIndex(([n]) => n === gridKey)
    if (idx < 0) return undefined
    for (let i = 0; i < idx; i++) {
      const v = sorted[i][1]['drawer-width']
      if (v) return { bp: sorted[i][0], value: v.replace(/px$/, '') }
    }
    return undefined
  })()

  const trigger = grid['drawer-trigger'] ?? 'peek'
  const position = grid['drawer-position'] ?? 'both'

  return (
    <div className="lm-inspector__section lm-inspector__info">
      <div className="lm-inspector__row">
        <span className="lm-inspector__label">Drawer at {activeBreakpoint}</span>
      </div>

      <div className="lm-inspector__row" style={{ marginTop: '6px' }}>
        <span className="lm-inspector__label">Trigger</span>
      </div>
      <div className="lm-align-group">
        {(['peek', 'hamburger', 'tab', 'fab'] as const).map((opt) => (
          <button
            key={opt}
            className={`lm-align-btn${trigger === opt ? ' lm-align-btn--active' : ''}`}
            onClick={() => onUpdateGridProp(gridKey, 'drawer-trigger', opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
        <span className="lm-inspector__label">Side</span>
      </div>
      <div className="lm-align-group">
        {(['left', 'right', 'both'] as const).map((opt) => (
          <button
            key={opt}
            className={`lm-align-btn${position === opt ? ' lm-align-btn--active' : ''}`}
            onClick={() => onUpdateGridProp(gridKey, 'drawer-position', opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
        <span className="lm-inspector__label">
          Panel width
          {inheritedWidth && (
            <span className="lm-inspector__hint">
              {` inherits ${inheritedWidth.value}px from ${inheritedWidth.bp}`}
            </span>
          )}
        </span>
      </div>
      <div className="lm-width-control">
        <input
          className="lm-input"
          type="number"
          min="200"
          max="800"
          placeholder={inheritedWidth?.value ?? '400'}
          value={widthDraft}
          onChange={(e) => setWidthDraft(e.target.value)}
          onBlur={() => {
            const v = widthDraft.trim()
            onUpdateGridProp(gridKey, 'drawer-width', v ? `${v}px` : undefined)
          }}
        />
        <span className="lm-inspector__unit">px</span>
      </div>
    </div>
  )
}
