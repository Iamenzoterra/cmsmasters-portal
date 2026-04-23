// Phase 4 — session + save orchestration.
//
// Responsibilities at this level:
//   1. Own `session` state (one session per selected block slug).
//      Session resets on every slug change, including re-selecting same slug
//      (Phase 0 §0.7 save-safety rule 3 — "switch-and-back = new session").
//   2. Route accept/reject clicks from <SuggestionList> → session transitions.
//   3. Orchestrate Save: applySuggestions → saveBlock (POST) with
//      `requestBackup: !session.backedUp` → refetch block from disk →
//      clearAfterSave(). Re-analysis happens automatically because
//      useAnalysis keys on (slug, html, css).
//   4. Dirty-state guards: `beforeunload` prompt; picker-switch `window.confirm`.
//   5. Source-path display: one-time GET /api/blocks to read `sourceDir`.
//
// Server stays stateless; client is the sole owner of session state.
//
// Token names (all verified in tokens.css; Phase 3 sanity):
//   --bg-page, --text-primary, --text-muted, --border-default,
//   --status-error-fg.

import { useCallback, useEffect, useState } from 'react'
import { applySuggestions } from '@cmsmasters/block-forge-core'
import type { BlockJson } from './types'
import { getBlock, listBlocks, saveBlock } from './lib/api-client'
import { useAnalysis } from './lib/useAnalysis'
import {
  accept as acceptFn,
  clearAfterSave,
  createSession,
  isDirty,
  pickAccepted,
  reject as rejectFn,
  type SessionState,
} from './lib/session'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionState>(() => createSession())
  const [saveInFlight, setSaveInFlight] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sourceDir, setSourceDir] = useState<string | null>(null)

  // One-time sourceDir fetch for the status bar. Tolerates failure silently.
  useEffect(() => {
    let cancelled = false
    listBlocks()
      .then((r) => {
        if (!cancelled) setSourceDir(r.sourceDir)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch block on slug change + reset session.
  useEffect(() => {
    if (!selectedSlug) {
      setBlock(null)
      setSession(createSession())
      return
    }
    setLoadError(null)
    setSaveError(null)
    setSession(createSession())

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

  // Dirty-tab-close guard.
  useEffect(() => {
    if (!isDirty(session)) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Legacy spec — Chrome requires setting returnValue to trigger the
      // prompt. Modern browsers ignore the string but the assignment is
      // still the trigger.
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [session])

  // Picker-switch with dirty confirm.
  const handlePickerSelect = useCallback(
    (newSlug: string) => {
      if (newSlug === selectedSlug) return
      if (isDirty(session)) {
        const go = window.confirm(
          'Unsaved suggestion state — discard and switch block?',
        )
        if (!go) return
      }
      setSelectedSlug(newSlug)
    },
    [selectedSlug, session],
  )

  const { suggestions, warnings } = useAnalysis(block)

  const handleAccept = useCallback((id: string) => {
    setSession((prev) => acceptFn(prev, id))
  }, [])
  const handleReject = useCallback((id: string) => {
    setSession((prev) => rejectFn(prev, id))
  }, [])

  const handleSave = useCallback(async () => {
    if (!block) return
    const accepted = pickAccepted(session, suggestions)
    if (accepted.length === 0) return

    setSaveInFlight(true)
    setSaveError(null)
    try {
      // Core applySuggestions takes {slug, html, css} (BlockInput), returns
      // {slug, html, css, variants?} (BlockOutput).
      const applied = applySuggestions(
        { slug: block.slug, html: block.html, css: block.css },
        accepted,
      )
      // Merge applied html/css back into the full BlockJson so we preserve
      // non-engine fields (name, id, block_type, hooks, metadata, etc.).
      const updatedBlock: BlockJson = {
        ...block,
        html: applied.html,
        css: applied.css,
      }
      const requestBackup = !session.backedUp
      await saveBlock({ block: updatedBlock, requestBackup })
      // Refetch from disk so UI mirrors on-disk bytes exactly (trailing
      // newline, key ordering, server-side serialization).
      const refreshed = await getBlock(block.slug)
      setBlock(refreshed)
      // Use functional setter so we operate on the latest state; the handler
      // closure's `session` could be one tick stale if a user double-clicks.
      setSession((prev) => clearAfterSave(prev))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaveInFlight(false)
    }
  }, [block, session, suggestions])

  const sourcePath =
    block && sourceDir ? `${sourceDir}/${block.slug}.json` : null

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="flex items-center gap-6 border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <BlockPicker selected={selectedSlug} onSelect={handlePickerSelect} />
        {loadError && (
          <span className="text-sm text-[hsl(var(--status-error-fg))]">
            {loadError}
          </span>
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
          <SuggestionList
            suggestions={suggestions}
            warnings={warnings}
            session={session}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-default))]"
      >
        <StatusBar
          sourcePath={sourcePath}
          session={session}
          onSave={handleSave}
          saveInFlight={saveInFlight}
          saveError={saveError}
        />
      </footer>
    </div>
  )
}
