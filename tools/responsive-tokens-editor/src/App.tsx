import { useEffect, useMemo, useState } from 'react'
import { conservativeDefaults } from './lib/defaults'
import { generateTokensCss } from './lib/generator'
import { validate } from './lib/validate'
import { loadConfig } from './lib/config-io'
import type { ResponsiveConfig } from './types'
import { GlobalScaleConfig } from './components/GlobalScaleConfig'
import { WcagBanner } from './components/WcagBanner'
import { ResetButton } from './components/ResetButton'
import { LoadStatusBadge } from './components/LoadStatusBadge'

/**
 * Phase 3 orchestrator — single source of truth = useState<ResponsiveConfig>.
 * Memoized derivations (generator + validate) recompute on config change.
 *
 * Mount-once useEffect attempts loadConfig() (Phase 2 stub returns Promise<null>);
 * on null → fallback to conservativeDefaults + LoadStatusBadge='defaults'.
 * Phase 6 wires fs-fetch → 'loaded' state.
 */
export function App() {
  const [config, setConfig] = useState<ResponsiveConfig>(conservativeDefaults)
  const [loadStatus, setLoadStatus] = useState<'pending' | 'defaults' | 'loaded'>(
    'pending'
  )

  // Mount-once load attempt — async-aware (PF.12 carry; loadConfig returns Promise).
  useEffect(() => {
    let cancelled = false
    loadConfig().then((loaded) => {
      if (cancelled) return
      if (loaded === null) {
        setLoadStatus('defaults')
      } else {
        setConfig(loaded)
        setLoadStatus('loaded')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const result = useMemo(() => generateTokensCss(config), [config])
  const violations = useMemo(
    () => validate(config, result.tokens),
    [config, result.tokens]
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <h1 className="text-[length:var(--h2-font-size)] font-[var(--font-weight-semibold)]">
          Responsive Tokens — Global Scale
        </h1>
        <LoadStatusBadge status={loadStatus} />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <WcagBanner violations={violations} />
        <GlobalScaleConfig config={config} onChange={setConfig} />
        <ResetButton onReset={() => setConfig(conservativeDefaults)} />
      </main>

      <footer className="border-t border-[hsl(var(--border))] px-6 py-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Phase 3 · Token grid + per-token override editor land in Phase 4 · Save in
        Phase 6
      </footer>
    </div>
  )
}
