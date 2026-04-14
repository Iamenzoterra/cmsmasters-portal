import { useState, useEffect, useCallback, useRef } from 'react'
import type { LayoutConfig, LayoutSummary, TokenMap, BlockData, ScopingWarning, CanvasBreakpointId } from './lib/types'
import { resolveGridKey, getBaseGridKey, CANVAS_BREAKPOINTS } from './lib/types'
import { api } from './lib/api-client'
import { LayoutSidebar } from './components/LayoutSidebar'
import { BreakpointBar } from './components/BreakpointBar'
import { Canvas } from './components/Canvas'
import { Inspector } from './components/Inspector'
import { ExportDialog } from './components/ExportDialog'
import { Toast } from './components/Toast'

function getChangedSlots(prev: LayoutConfig, next: LayoutConfig): string[] {
  const changed: string[] = []
  for (const slot of Object.keys(next.slots)) {
    if (JSON.stringify(prev.slots[slot]) !== JSON.stringify(next.slots[slot])) {
      changed.push(slot)
    }
  }
  for (const bp of Object.keys(next.grid)) {
    if (JSON.stringify(prev.grid[bp]?.columns) !== JSON.stringify(next.grid[bp]?.columns)) {
      changed.push(...Object.keys(next.grid[bp].columns))
    }
    // Per-bp slot overrides — flash slots whose override changed
    const prevBpSlots = prev.grid[bp]?.slots ?? {}
    const nextBpSlots = next.grid[bp]?.slots ?? {}
    const slotNames = new Set([...Object.keys(prevBpSlots), ...Object.keys(nextBpSlots)])
    for (const name of slotNames) {
      if (JSON.stringify(prevBpSlots[name]) !== JSON.stringify(nextBpSlots[name])) {
        changed.push(name)
      }
    }
  }
  return [...new Set(changed)]
}

export function App() {
  const [layouts, setLayouts] = useState<LayoutSummary[]>([])
  const [activeScope, setActiveScope] = useState<string | null>(null)
  const [activeConfig, setActiveConfig] = useState<LayoutConfig | null>(null)
  const [tokens, setTokens] = useState<TokenMap | null>(null)
  const [activeBreakpoint, setActiveBreakpoint] = useState<CanvasBreakpointId>('desktop')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [changedSlots, setChangedSlots] = useState<string[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [blocks, setBlocks] = useState<Map<string, BlockData> | null>(null)
  const [blockWarnings, setBlockWarnings] = useState<ScopingWarning[]>([])

  const prevConfigRef = useRef<LayoutConfig | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshLayouts = useCallback(async () => {
    try {
      const list = await api.listLayouts()
      setLayouts(list)
    } catch {
      // Runtime may not be ready yet
    }
  }, [])

  const showToast = useCallback((message: string) => {
    setToastMessage(message)
    setToastKey((k) => k + 1)
  }, [])

  const dismissToast = useCallback(() => {
    setToastMessage(null)
  }, [])

  // Fetch layouts + tokens on mount
  useEffect(() => {
    refreshLayouts()
    api.getTokens().then(setTokens).catch(() => {})
  }, [refreshLayouts])

  // Fetch full config when active scope changes
  useEffect(() => {
    if (!activeScope) {
      setActiveConfig(null)
      setSelectedSlot(null)
      prevConfigRef.current = null
      return
    }

    setSelectedSlot(null)

    api.getLayout(activeScope).then((config) => {
      setActiveConfig(config)
      prevConfigRef.current = config
    }).catch(() => {
      setActiveConfig(null)
    })
  }, [activeScope])

  // Fetch blocks when config changes
  useEffect(() => {
    if (!activeConfig) {
      setBlocks(null)
      setBlockWarnings([])
      return
    }

    const testBlocks = activeConfig['test-blocks']
    if (!testBlocks) {
      setBlocks(null)
      setBlockWarnings([])
      return
    }

    // Collect unique slugs from all slots
    const slugs = [...new Set(Object.values(testBlocks).flat())]
    if (slugs.length === 0) {
      setBlocks(null)
      setBlockWarnings([])
      return
    }

    api.getBlocks(slugs).then((res) => {
      const map = new Map<string, BlockData>()
      for (const block of res.data) {
        map.set(block.slug, block)
      }
      setBlocks(map)
      setBlockWarnings(res.warnings)

      // Toast summary
      const loaded = res.data.length
      const missing = slugs.length - loaded
      let msg = `Loaded ${loaded} block${loaded !== 1 ? 's' : ''} (${res.source})`
      if (missing > 0) msg += `, ${missing} not found`
      if (res.warnings.length > 0) msg += ` | ${res.warnings.length} scoping warning${res.warnings.length !== 1 ? 's' : ''}`
      showToast(msg)
    }).catch(() => {
      setBlocks(null)
      setBlockWarnings([])
    })
  }, [activeConfig, showToast])

  // SSE subscription
  useEffect(() => {
    const unsubscribe = api.subscribeEvents((event) => {
      if (event.type === 'layout-added' || event.type === 'layout-deleted') {
        refreshLayouts()
      }
      if (event.type === 'layout-deleted' && event.scope === activeScope) {
        setActiveScope(null)
        showToast('Layout deleted.')
      }
      if (event.type === 'layout-changed' && event.scope === activeScope) {
        api.getLayout(event.scope).then((newConfig) => {
          // Diff for flash
          if (prevConfigRef.current) {
            const changed = getChangedSlots(prevConfigRef.current, newConfig)
            if (changed.length > 0) {
              setChangedSlots(changed)
              // Clear previous timer if rapid-fire updates
              if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
              flashTimerRef.current = setTimeout(() => setChangedSlots([]), 500)
            }
          }
          prevConfigRef.current = newConfig
          setActiveConfig(newConfig)
          showToast('Layout updated externally.')
        }).catch(() => {})
      }
    })
    return unsubscribe
  }, [activeScope, refreshLayouts, showToast])

  const handleToggleSlot = useCallback(async (slotName: string, enabled: boolean) => {
    if (!activeConfig || !activeScope) return

    const updated = structuredClone(activeConfig)

    if (enabled) {
      // Add sidebar to all breakpoints + slots
      const defaultWidth = '360px'

      // Add to desktop grid columns (insert in correct position)
      for (const [, grid] of Object.entries(updated.grid)) {
        if (grid.sidebars === 'drawer') continue // drawer sidebars live in drawer element, not grid columns
        if (!grid.columns[slotName]) {
          // Insert sidebar in the right position relative to content
          const entries = Object.entries(grid.columns)
          const newColumns: Record<string, string> = {}
          if (slotName === 'sidebar-left') {
            newColumns[slotName] = defaultWidth
            for (const [k, v] of entries) newColumns[k] = v
          } else if (slotName === 'sidebar-right') {
            for (const [k, v] of entries) newColumns[k] = v
            newColumns[slotName] = defaultWidth
          }
          grid.columns = newColumns
        }
      }

      // Add slot config
      if (!updated.slots[slotName]) {
        updated.slots[slotName] = { align: 'flex-start', 'min-height': '400px' }
      }

      // Add drawer config to tablet/mobile breakpoints
      for (const [, grid] of Object.entries(updated.grid)) {
        if (grid.sidebars === 'drawer') {
          grid['drawer-position'] = 'both'
        }
      }
    } else {
      // Remove sidebar from all grid breakpoints
      for (const [, grid] of Object.entries(updated.grid)) {
        delete grid.columns[slotName]
      }

      // Remove slot config
      delete updated.slots[slotName]

      // Remove test-blocks for this slot
      if (updated['test-blocks']) {
        delete updated['test-blocks'][slotName]
      }

      // Update drawer-position if no sidebars remain
      const remainingSidebars = Object.keys(updated.slots).filter((n) => n.includes('sidebar'))
      if (remainingSidebars.length === 0) {
        for (const [, grid] of Object.entries(updated.grid)) {
          if (grid.sidebars === 'drawer' || grid.sidebars === 'hidden') {
            delete grid.sidebars
            delete grid['drawer-width']
            delete grid['drawer-trigger']
            delete grid['drawer-position']
          }
        }
      } else if (remainingSidebars.length === 1) {
        const side = remainingSidebars[0].includes('left') ? 'left' : 'right'
        for (const [, grid] of Object.entries(updated.grid)) {
          if (grid.sidebars === 'drawer') {
            grid['drawer-position'] = side
          }
        }
      }
    }

    try {
      const saved = await api.updateLayout(activeScope, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${slotName} ${enabled ? 'enabled' : 'disabled'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeScope, showToast])

  const handleUpdateSlotConfig = useCallback(async (
    slotName: string,
    key: string,
    value: string | undefined,
    targetGridKey?: string,
    breakpointId?: CanvasBreakpointId,
  ) => {
    if (!activeConfig || !activeScope) return

    const updated = structuredClone(activeConfig)
    // Route by canonical breakpoint, not by resolved grid key
    const writeToBase = !breakpointId || breakpointId === 'desktop'

    if (writeToBase) {
      if (!updated.slots[slotName]) updated.slots[slotName] = {}
      if (value === undefined) {
        delete (updated.slots[slotName] as Record<string, unknown>)[key]
      } else {
        ;(updated.slots[slotName] as Record<string, unknown>)[key] = value
      }
    } else {
      if (!targetGridKey) return
      const grid = updated.grid[targetGridKey]
      if (!grid) return
      if (!grid.slots) grid.slots = {}
      if (!grid.slots[slotName]) grid.slots[slotName] = {}
      if (value === undefined) {
        delete (grid.slots[slotName] as Record<string, unknown>)[key]
        // Prune empty override objects
        if (Object.keys(grid.slots[slotName]!).length === 0) delete grid.slots[slotName]
        if (Object.keys(grid.slots).length === 0) delete grid.slots
      } else {
        ;(grid.slots[slotName] as Record<string, unknown>)[key] = value
      }
    }

    try {
      const saved = await api.updateLayout(activeScope, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      const scope = writeToBase ? 'base' : targetGridKey
      showToast(`${slotName}.${key} updated (${scope})`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeScope, showToast])

  const handleUpdateGridProp = useCallback(async (breakpointKey: string, key: string, value: string | undefined) => {
    if (!activeConfig || !activeScope) return

    const updated = structuredClone(activeConfig)
    let grid = updated.grid[breakpointKey]

    // Auto-create grid entry if it doesn't exist (e.g., tablet inheriting from desktop)
    if (!grid) {
      const resolvedKey = resolveGridKey(breakpointKey as CanvasBreakpointId, updated.grid)
      const source = updated.grid[resolvedKey]
      if (!source) return
      const bpWidth = CANVAS_BREAKPOINTS.find((b) => b.id === breakpointKey)?.width
      grid = {
        ...structuredClone(source),
        'min-width': bpWidth ? `${bpWidth}px` : source['min-width'],
      }
      updated.grid[breakpointKey] = grid
    }

    if (value === undefined) {
      delete (grid as unknown as Record<string, unknown>)[key]
    } else {
      ;(grid as unknown as Record<string, unknown>)[key] = value
    }

    try {
      const saved = await api.updateLayout(activeScope, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${breakpointKey}.${key}: ${value ?? 'removed'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeScope, showToast])

  const handleUpdateColumnWidth = useCallback(async (slotName: string, breakpointKey: string, width: string) => {
    if (!activeConfig || !activeScope) return

    const updated = structuredClone(activeConfig)
    if (updated.grid[breakpointKey]?.columns) {
      updated.grid[breakpointKey].columns[slotName] = width
    }

    try {
      const saved = await api.updateLayout(activeScope, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${slotName} width: ${width}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeScope, showToast])

  return (
    <>
      <div className="lm-shell">
        {/* Left sidebar */}
        <LayoutSidebar
          layouts={layouts}
          activeScope={activeScope}
          onSelect={setActiveScope}
          onRefresh={refreshLayouts}
          onExport={() => setShowExportDialog(true)}
        />

        {/* Center canvas */}
        <div className="lm-canvas-area">
          {activeConfig && tokens ? (
            <>
              <BreakpointBar
                config={activeConfig}
                tokens={tokens}
                activeBreakpoint={activeBreakpoint}
                onBreakpointChange={setActiveBreakpoint}
              />
              <Canvas
                config={activeConfig}
                tokens={tokens}
                activeBreakpoint={activeBreakpoint}
                gridKey={resolveGridKey(activeBreakpoint, activeConfig.grid)}
                selectedSlot={selectedSlot}
                onSlotSelect={setSelectedSlot}
                changedSlots={changedSlots}
                blocks={blocks}
              />
            </>
          ) : (
            <div className="lm-empty">
              {layouts.length === 0
                ? 'No layouts yet. Create one to get started.'
                : 'Select a layout from the sidebar.'}
            </div>
          )}
        </div>

        {/* Right inspector */}
        <Inspector
          selectedSlot={selectedSlot}
          config={activeConfig}
          activeBreakpoint={activeBreakpoint}
          gridKey={activeConfig ? resolveGridKey(activeBreakpoint, activeConfig.grid) : ''}
          tokens={tokens}
          onShowToast={showToast}
          blockWarnings={blockWarnings}
          onToggleSlot={handleToggleSlot}
          onUpdateSlotConfig={handleUpdateSlotConfig}
          onUpdateColumnWidth={handleUpdateColumnWidth}
          onUpdateGridProp={handleUpdateGridProp}
        />
      </div>

      {/* Export dialog */}
      {showExportDialog && activeScope && (
        <ExportDialog
          scope={activeScope}
          onClose={() => setShowExportDialog(false)}
          onShowToast={showToast}
        />
      )}

      {/* Toast — outside grid to avoid overflow:hidden clipping */}
      <Toast
        key={toastKey}
        message={toastMessage}
        onDismiss={dismissToast}
      />
    </>
  )
}
