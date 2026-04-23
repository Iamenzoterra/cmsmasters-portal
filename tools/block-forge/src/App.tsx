// Phase 3 — added useAnalysis hook + SuggestionList in the suggestions aside.
// Only two deltas vs Phase 2's App.tsx: the hook call + the <SuggestionList>
// render. Picker/triptych/loading logic unchanged.
//
// Token names (canonical, all verified in tokens.css):
//   --bg-page, --text-primary, --text-muted, --border-default,
//   --status-error-fg (used for load-error label).

import { useEffect, useState } from 'react'
import type { BlockJson } from './types'
import { getBlock } from './lib/api-client'
import { useAnalysis } from './lib/useAnalysis'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'

export function App() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSlug) {
      setBlock(null)
      return
    }
    setLoadError(null)
    let cancelled = false
    getBlock(selectedSlug)
      .then((b) => {
        if (!cancelled) setBlock(b)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedSlug])

  const { suggestions, warnings } = useAnalysis(block)

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="flex items-center gap-6 border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <BlockPicker selected={selectedSlug} onSelect={setSelectedSlug} />
        {loadError && (
          <span className="text-sm text-[hsl(var(--status-error-fg))]">{loadError}</span>
        )}
      </header>

      <main className="grid grid-cols-[1fr_360px] overflow-hidden">
        <section
          data-region="triptych"
          className="overflow-auto border-r border-[hsl(var(--border-default))]"
        >
          <PreviewTriptych block={block} />
        </section>
        <aside data-region="suggestions" className="overflow-hidden">
          <SuggestionList suggestions={suggestions} warnings={warnings} />
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-default))] px-6 py-2"
      >
        <em className="text-sm text-[hsl(var(--text-muted))]">
          Status bar — Phase 4 placeholder
        </em>
      </footer>
    </div>
  )
}
