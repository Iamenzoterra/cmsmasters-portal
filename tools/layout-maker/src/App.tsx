import { useState, useEffect, useCallback } from 'react'
import type { LayoutConfig, LayoutSummary, TokenMap } from './lib/types'
import { api } from './lib/api-client'
import { LayoutSidebar } from './components/LayoutSidebar'
import { BreakpointBar } from './components/BreakpointBar'
import { Canvas } from './components/Canvas'

export function App() {
  const [layouts, setLayouts] = useState<LayoutSummary[]>([])
  const [activeScope, setActiveScope] = useState<string | null>(null)
  const [activeConfig, setActiveConfig] = useState<LayoutConfig | null>(null)
  const [tokens, setTokens] = useState<TokenMap | null>(null)
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>('')

  const refreshLayouts = useCallback(async () => {
    try {
      const list = await api.listLayouts()
      setLayouts(list)
    } catch {
      // Runtime may not be ready yet
    }
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
      return
    }

    api.getLayout(activeScope).then((config) => {
      setActiveConfig(config)
      // Default to first breakpoint
      const bpKeys = Object.keys(config.grid)
      if (bpKeys.length > 0) setActiveBreakpoint(bpKeys[0])
    }).catch(() => {
      setActiveConfig(null)
    })
  }, [activeScope])

  // SSE subscription
  useEffect(() => {
    const unsubscribe = api.subscribeEvents((event) => {
      if (event.type === 'layout-added' || event.type === 'layout-deleted') {
        refreshLayouts()
      }
      if (event.type === 'layout-deleted' && event.scope === activeScope) {
        setActiveScope(null)
      }
      if (event.type === 'layout-changed' && event.scope === activeScope) {
        api.getLayout(event.scope).then(setActiveConfig).catch(() => {})
      }
    })
    return unsubscribe
  }, [activeScope, refreshLayouts])

  return (
    <div className="lm-shell">
      {/* Left sidebar */}
      <LayoutSidebar
        layouts={layouts}
        activeScope={activeScope}
        onSelect={setActiveScope}
        onRefresh={refreshLayouts}
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

      {/* Right inspector (stub for Phase 3) */}
      <div className="lm-inspector">
        <div className="lm-inspector__header">Inspector</div>
        <div className="lm-inspector__body">
          <div className="lm-inspector__empty">
            Click a slot in the canvas to inspect it.
          </div>
        </div>
      </div>
    </div>
  )
}
