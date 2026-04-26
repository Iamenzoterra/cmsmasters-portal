import { useEffect, useMemo, useState } from 'react'
import { conservativeDefaults } from './lib/defaults'
import { generateTokensCss } from './lib/generator'
import { validate } from './lib/validate'
import { loadConfig, saveConfig } from './lib/config-io'
import type { ResponsiveConfig } from './types'
import { GlobalScaleConfig } from './components/GlobalScaleConfig'
import { WcagBanner } from './components/WcagBanner'
import { ResetButton } from './components/ResetButton'
import { LoadStatusBadge } from './components/LoadStatusBadge'
import { TokenPreviewGrid } from './components/TokenPreviewGrid'
import { ContainerWidthsEditor } from './components/ContainerWidthsEditor'
import { LivePreviewRow } from './components/LivePreviewRow'

/**
 * Phase 3 orchestrator — single source of truth = useState<ResponsiveConfig>.
 * Memoized derivations (generator + validate) recompute on config change.
 *
 * Mount-once useEffect attempts loadConfig(); on null → fallback to
 * conservativeDefaults + LoadStatusBadge='defaults'. Phase 6 wires fs-fetch.
 *
 * Phase 6 — Save flow:
 *   • "Save" button next to LoadStatusBadge in header
 *   • WCAG override checkbox appears below header iff violations.length > 0
 *   • Toast (status / alert role) reports outcome
 *   • Save anyway requires explicit `overrideWcag` toggle on (R.4)
 */
export function App() {
  const [config, setConfig] = useState<ResponsiveConfig>(conservativeDefaults)
  const [loadStatus, setLoadStatus] = useState<'pending' | 'defaults' | 'loaded'>(
    'pending'
  )
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle'
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [overrideWcag, setOverrideWcag] = useState(false)

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

  const handleSave = async () => {
    if (violations.length > 0 && !overrideWcag) {
      setSaveStatus('error')
      setSaveError(
        `${violations.length} WCAG violation(s) — toggle "Save anyway" to override.`
      )
      return
    }
    setSaveStatus('saving')
    setSaveError(null)
    const out = await saveConfig(config, result.css)
    if (out.ok) {
      setSaveStatus('success')
      setOverrideWcag(false)
    } else {
      setSaveStatus('error')
      setSaveError(out.error ?? 'unknown error')
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-4">
        <h1 className="text-[length:var(--h2-font-size)] font-[var(--font-weight-semibold)]">
          Responsive Tokens — Global Scale
        </h1>
        <div className="flex items-center gap-3">
          <LoadStatusBadge status={loadStatus} />
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            aria-label="Save responsive config to disk"
            className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--primary))] px-4 py-2 text-[length:var(--text-sm-font-size)] font-[var(--font-weight-medium)] text-[hsl(var(--primary-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
          >
            {saveStatus === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {violations.length > 0 && (
        <label className="flex items-center gap-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-6 py-2 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
          <input
            type="checkbox"
            checked={overrideWcag}
            onChange={(e) => setOverrideWcag(e.target.checked)}
            aria-label="Save anyway despite WCAG violations"
            className="rounded border-[hsl(var(--border))]"
          />
          Save anyway despite {violations.length} WCAG violation(s)
        </label>
      )}

      {saveStatus === 'success' && (
        <div
          role="status"
          className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-6 py-2 text-[length:var(--text-sm-font-size)] text-[hsl(var(--foreground))]"
        >
          Saved. Run <code>git commit</code> to deploy.
        </div>
      )}
      {saveStatus === 'error' && saveError && (
        <div
          role="alert"
          className="border-b border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))] px-6 py-2 text-[length:var(--text-sm-font-size)] text-[hsl(var(--destructive-foreground))]"
        >
          {saveError}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <WcagBanner violations={violations} />
        <GlobalScaleConfig config={config} onChange={setConfig} />
        <TokenPreviewGrid
          tokens={result.tokens}
          violations={violations}
          config={config}
          onChange={setConfig}
        />
        <ContainerWidthsEditor config={config} onChange={setConfig} />
        <LivePreviewRow resultCss={result.css} />
        <ResetButton onReset={() => setConfig(conservativeDefaults)} />
      </main>

      <footer className="border-t border-[hsl(var(--border))] px-6 py-3 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
        Phase 6 · Save flow live · Cross-surface PARITY active
      </footer>
    </div>
  )
}
