import { useState, useEffect, useCallback, useRef } from 'react'
import type { LayoutConfig, LayoutSummary, TokenMap, BlockData, ScopingWarning, CanvasBreakpointId, ScopeEntry, SlotConfig } from './lib/types'
import { resolveGridKey, CANVAS_BREAKPOINTS } from './lib/types'
import { api } from './lib/api-client'
import { LayoutSidebar } from './components/LayoutSidebar'
import { BreakpointBar } from './components/BreakpointBar'
import { Canvas } from './components/Canvas'
import { Inspector } from './components/Inspector'
import { ExportDialog } from './components/ExportDialog'
import { SettingsPage } from './components/SettingsPage'
import { Toast } from './components/Toast'

/** Insert a sidebar column into an existing columns map at the correct position */
function insertSidebarColumn(
  existing: Record<string, string>,
  slotName: string,
  width: string,
): Record<string, string> {
  const entries = Object.entries(existing)
  const result: Record<string, string> = {}
  if (slotName === 'sidebar-left') {
    result[slotName] = width
    for (const [k, v] of entries) result[k] = v
  } else {
    for (const [k, v] of entries) result[k] = v
    result[slotName] = width
  }
  return result
}

function enableSidebar(config: LayoutConfig, slotName: string): void {
  const defaultWidth = '360px'
  for (const [, grid] of Object.entries(config.grid)) {
    if (grid.sidebars === 'drawer' || grid.columns[slotName]) continue
    grid.columns = insertSidebarColumn(grid.columns, slotName, defaultWidth)
  }
  if (!config.slots[slotName]) {
    config.slots[slotName] = { align: 'flex-start', 'min-height': '400px' }
  }
  for (const [, grid] of Object.entries(config.grid)) {
    if (grid.sidebars === 'drawer') grid['drawer-position'] = 'both'
  }
}

/** Clean up drawer config after sidebar removal */
function pruneDrawerConfig(config: LayoutConfig): void {
  const remainingSidebars = Object.keys(config.slots).filter((n) => n.includes('sidebar'))
  if (remainingSidebars.length === 0) {
    for (const [, grid] of Object.entries(config.grid)) {
      if (grid.sidebars !== 'drawer' && grid.sidebars !== 'hidden') continue
      delete grid.sidebars
      delete grid['drawer-width']
      delete grid['drawer-trigger']
      delete grid['drawer-position']
    }
  } else if (remainingSidebars.length === 1) {
    const side = remainingSidebars[0].includes('left') ? 'left' : 'right'
    for (const [, grid] of Object.entries(config.grid)) {
      if (grid.sidebars === 'drawer') grid['drawer-position'] = side
    }
  }
}

function disableSidebar(config: LayoutConfig, slotName: string): void {
  for (const [, grid] of Object.entries(config.grid)) {
    delete grid.columns[slotName]
  }
  delete config.slots[slotName]
  if (config['test-blocks']) delete config['test-blocks'][slotName]
  pruneDrawerConfig(config)
}

/** Set or delete a key in a record, returning whether it was a set */
function setOrDelete(obj: Record<string, unknown>, key: string, value: string | undefined): void {
  if (value === undefined) {
    delete obj[key]
  } else {
    obj[key] = value
  }
}

function applySlotConfigUpdate(
  config: LayoutConfig,
  slotName: string,
  key: string,
  value: string | undefined,
  writeToBase: boolean,
  targetGridKey?: string,
): void {
  if (writeToBase) {
    if (!config.slots[slotName]) config.slots[slotName] = {}
    setOrDelete(config.slots[slotName] as Record<string, unknown>, key, value)
    return
  }
  if (!targetGridKey) return
  const grid = config.grid[targetGridKey]
  if (!grid) return
  if (!grid.slots) grid.slots = {}
  if (!grid.slots[slotName]) grid.slots[slotName] = {}
  setOrDelete(grid.slots[slotName] as Record<string, unknown>, key, value)
  if (value === undefined) {
    if (Object.keys(grid.slots[slotName]!).length === 0) delete grid.slots[slotName]
    if (Object.keys(grid.slots).length === 0) delete grid.slots
  }
}

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
  const [activeId, setActiveId] = useState<string | null>(null)
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
  const [scopes, setScopes] = useState<ScopeEntry[]>([])
  const [view, setView] = useState<'layouts' | 'settings'>('layouts')

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

  const refreshSettings = useCallback(async () => {
    try {
      const s = await api.getSettings()
      setScopes(s.scopes)
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

  // Fetch layouts + tokens + settings on mount
  useEffect(() => {
    refreshLayouts()
    refreshSettings()
    api.getTokens().then(setTokens).catch(() => {})
  }, [refreshLayouts, refreshSettings])

  // Refresh settings whenever we navigate back from settings view
  useEffect(() => {
    if (view === 'layouts') refreshSettings()
  }, [view, refreshSettings])

  // Fetch full config when active scope changes
  useEffect(() => {
    if (!activeId) {
      setActiveConfig(null)
      setSelectedSlot(null)
      prevConfigRef.current = null
      return
    }

    setSelectedSlot(null)

    api.getLayout(activeId).then((config) => {
      setActiveConfig(config)
      prevConfigRef.current = config
    }).catch(() => {
      setActiveConfig(null)
    })
  }, [activeId])

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
      if (event.type === 'layout-deleted' && event.id === activeId) {
        setActiveId(null)
        showToast('Layout deleted.')
      }
      if (event.type === 'layout-changed' && event.id === activeId) {
        api.getLayout(event.id).then((newConfig) => {
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
  }, [activeId, refreshLayouts, showToast])

  const handleToggleSlot = useCallback(async (slotName: string, enabled: boolean) => {
    if (!activeConfig || !activeId) return

    const updated = structuredClone(activeConfig)
    if (enabled) {
      enableSidebar(updated, slotName)
    } else {
      disableSidebar(updated, slotName)
    }

    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${slotName} ${enabled ? 'enabled' : 'disabled'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  const handleUpdateSlotConfig = useCallback(async (
    slotName: string,
    key: string,
    value: string | undefined,
    targetGridKey?: string,
    breakpointId?: CanvasBreakpointId,
  ) => {
    if (!activeConfig || !activeId) return

    const updated = structuredClone(activeConfig)
    const writeToBase = !breakpointId || breakpointId === 'desktop'
    applySlotConfigUpdate(updated, slotName, key, value, writeToBase, targetGridKey)

    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      const scope = writeToBase ? 'base' : targetGridKey
      showToast(`${slotName}.${key} updated (${scope})`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  const handleUpdateGridProp = useCallback(async (breakpointKey: string, key: string, value: string | undefined) => {
    if (!activeConfig || !activeId) return

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
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${breakpointKey}.${key}: ${value ?? 'removed'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  const handleUpdateColumnWidth = useCallback(async (slotName: string, breakpointKey: string, width: string) => {
    if (!activeConfig || !activeId) return

    const updated = structuredClone(activeConfig)
    if (updated.grid[breakpointKey]?.columns) {
      updated.grid[breakpointKey].columns[slotName] = width
    }

    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${slotName} width: ${width}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  /** Write `nested-slots: string[]` (or delete the key when `children === null`) on a slot. */
  const handleUpdateNestedSlots = useCallback(async (parentName: string, children: string[] | null) => {
    if (!activeConfig || !activeId) return
    const updated = structuredClone(activeConfig)
    if (!updated.slots[parentName]) updated.slots[parentName] = {}
    if (children === null) {
      delete (updated.slots[parentName] as Record<string, unknown>)['nested-slots']
    } else {
      ;(updated.slots[parentName] as Record<string, unknown>)['nested-slots'] = children
      // Nested children must not be grid columns — remove from all breakpoints
      for (const child of children) {
        for (const grid of Object.values(updated.grid)) {
          delete grid.columns[child]
        }
      }
    }
    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(
        children === null
          ? `${parentName}: converted to leaf`
          : `${parentName}.nested-slots updated (${children.length})`,
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  /** Atomically create a new leaf slot and append it to parent's nested-slots. */
  const handleCreateNestedSlot = useCallback(async (
    parentName: string,
    childName: string,
    defaults: SlotConfig,
  ) => {
    if (!activeConfig || !activeId) return
    const updated = structuredClone(activeConfig)
    if (updated.slots[childName]) {
      showToast(`Slot '${childName}' already exists`)
      return
    }
    if (!updated.slots[parentName]) updated.slots[parentName] = {}
    updated.slots[childName] = defaults
    const existing = (updated.slots[parentName]['nested-slots'] as string[] | undefined) ?? []
    updated.slots[parentName]['nested-slots'] = [...existing, childName]
    // Nested children must not be grid columns
    for (const grid of Object.values(updated.grid)) {
      delete grid.columns[childName]
    }
    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${childName} created in ${parentName}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  /** Update a role-level field (position, sticky, z-index) on base slot config — never per-breakpoint. */
  const handleUpdateSlotRole = useCallback(async (
    slotName: string,
    updates: Record<string, unknown>,
  ) => {
    if (!activeConfig || !activeId) return
    const updated = structuredClone(activeConfig)
    if (!updated.slots[slotName]) updated.slots[slotName] = {}
    const slot = updated.slots[slotName] as Record<string, unknown>
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete slot[key]
      else slot[key] = value
    }

    // When position leaves 'top', also remove from grid columns (it's now a positioned slot).
    // When position becomes undefined (grid), ensure it's in grid columns.
    const pos = slot.position as string | undefined
    if (pos === 'top' || pos === 'bottom') {
      // Remove from grid columns — positioned slots don't participate in the grid
      for (const grid of Object.values(updated.grid)) {
        delete grid.columns[slotName]
      }
    } else if (!pos) {
      // Ensure grid slot exists in all breakpoints
      for (const grid of Object.values(updated.grid)) {
        if (!grid.columns[slotName]) grid.columns[slotName] = '1fr'
      }
    }

    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      const fields = Object.entries(updates).map(([k, v]) => `${k}=${v ?? 'removed'}`).join(', ')
      showToast(`${slotName} role: ${fields}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  /** Create a new top-level slot (not nested). For grid position, adds column to all breakpoints. */
  const handleCreateTopLevelSlot = useCallback(async (
    name: string,
    defaults: SlotConfig,
    position?: 'top' | 'bottom',
  ) => {
    if (!activeConfig || !activeId) return
    const updated = structuredClone(activeConfig)
    if (updated.slots[name]) {
      showToast(`Slot '${name}' already exists`)
      return
    }
    updated.slots[name] = { ...defaults }
    if (position) {
      ;(updated.slots[name] as Record<string, unknown>).position = position
    } else {
      // Grid slot — add column to each breakpoint
      for (const grid of Object.values(updated.grid)) {
        grid.columns[name] = '1fr'
      }
    }
    try {
      const saved = await api.updateLayout(activeId, updated)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`${name} created (${position ?? 'grid'})`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  const handleUpdateLayoutProp = useCallback(async (key: string, value: string | undefined) => {
    if (!activeConfig || !activeId) return
    const updated = structuredClone(activeConfig) as unknown as Record<string, unknown>
    if (value === undefined) delete updated[key]
    else updated[key] = value
    try {
      const saved = await api.updateLayout(activeId, updated as unknown as LayoutConfig)
      setActiveConfig(saved)
      prevConfigRef.current = saved
      showToast(`layout.${key}: ${value ?? 'removed'}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update layout')
    }
  }, [activeConfig, activeId, showToast])

  return (
    <>
      <div className="lm-shell">
        {/* Left sidebar */}
        <LayoutSidebar
          layouts={layouts}
          activeId={activeId}
          scopes={scopes}
          view={view}
          onSelect={setActiveId}
          onRefresh={refreshLayouts}
          onExport={() => setShowExportDialog(true)}
          onNavigate={setView}
        />

        {/* Center area — canvas or settings */}
        {view === 'settings' ? (
          <div className="lm-settings-area">
            <SettingsPage onShowToast={showToast} />
          </div>
        ) : (
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
        )}

        {/* Right inspector — hidden on settings view */}
        {view === 'layouts' && (
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
          onUpdateSlotRole={handleUpdateSlotRole}
          onUpdateColumnWidth={handleUpdateColumnWidth}
          onUpdateGridProp={handleUpdateGridProp}
          onUpdateLayoutProp={handleUpdateLayoutProp}
          onUpdateNestedSlots={handleUpdateNestedSlots}
          onCreateNestedSlot={handleCreateNestedSlot}
          onCreateTopLevelSlot={handleCreateTopLevelSlot}
          onSelectSlot={setSelectedSlot}
        />
        )}
      </div>

      {/* Export dialog */}
      {showExportDialog && activeId && (
        <ExportDialog
          id={activeId}
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
