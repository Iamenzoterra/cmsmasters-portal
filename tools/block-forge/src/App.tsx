// Phase 4 — session + save orchestration.
// WP-028 Phase 2 — adds TweakPanel selection state + element-click listener +
// per-BP tweak dispatch via session.addTweak + composeTweakedCss render layer.
// Debounced 300ms dispatch (Ruling I); Reset scoped to {selector, bp} (Ruling J).
// WP-028 Phase 3 — adds VariantsDrawer + session.variants CRUD (create/rename/delete
// with history-based undo); session.variants seeded via useEffect (Ruling P' — keeps
// createSession() zero-arg). composedBlock passes variants through; PreviewTriptych
// calls composeVariants inline for Phase 3 interim render (Phase 3.5 switches to
// renderForPreview for Path B re-converge).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@cmsmasters/ui'
import { applySuggestions, type Tweak } from '@cmsmasters/block-forge-core'
import type { BlockJson } from './types'
import { getBlock, listBlocks, saveBlock } from './lib/api-client'
import { useAnalysis } from './lib/useAnalysis'
import {
  accept as acceptFn,
  addTweak,
  clearAfterSave,
  composeTweakedCss,
  createSession,
  createVariant as createVariantFn,
  deleteVariant as deleteVariantFn,
  isDirty,
  pickAccepted,
  reject as rejectFn,
  removeTweaksFor,
  renameVariant as renameVariantFn,
  type SessionState,
} from './lib/session'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'
import { StatusBar } from './components/StatusBar'
import { TweakPanel, type TweakSelection } from './components/TweakPanel'
import { VariantsDrawer, type VariantAction } from './components/VariantsDrawer'

/**
 * Small inline debounce — keeps App.tsx self-contained (no new util files
 * per Phase 2 arch-test Δ0 rule). Trailing-edge semantics.
 */
function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let tid: ReturnType<typeof setTimeout> | null = null
  return (...args: A) => {
    if (tid) clearTimeout(tid)
    tid = setTimeout(() => fn(...args), ms)
  }
}

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
        if (!cancelled) {
          setBlock(b)
          // WP-028 Phase 3 (Ruling P') — seed session.variants from fetched block.
          // Reducer stays pure; createSession() stays zero-arg. Spread is the only
          // mutation vector for the initial variants map.
          setSession((s) => ({ ...s, variants: b.variants ?? {} }))
        }
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

  // WP-028 Phase 2 — compose tweaks over base CSS at render time.
  // Block-forge equivalent of Studio's "form.getValues('code')" invariant:
  // session.tweaks is the live authored state, composed fresh each render.
  // WP-028 Phase 3 — passthrough session.variants onto composedBlock so the
  // PreviewTriptych can call composeVariants inline (Phase 3 interim; Phase 3.5
  // Path B re-converge replaces the inline call with `renderForPreview`).
  const composedBlock = useMemo<BlockJson | null>(() => {
    if (!block) return null
    const css = session.tweaks.length > 0
      ? composeTweakedCss(block.css, session.tweaks)
      : block.css
    const variants = Object.keys(session.variants).length > 0 ? session.variants : undefined
    return { ...block, css, variants }
  }, [block, session.tweaks, session.variants])

  // WP-028 Phase 2 — TweakPanel selection state + element-click listener.
  const [selection, setSelection] = useState<TweakSelection | null>(null)
  const [currentBp, setCurrentBp] = useState<1440 | 768 | 480>(1440)
  const currentSlug = block?.slug ?? null

  // Clear selection on block switch.
  useEffect(() => {
    setSelection(null)
  }, [currentSlug])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return
      if ((e.data as { type?: unknown }).type !== 'block-forge:element-click') return
      const data = e.data as {
        type: 'block-forge:element-click'
        slug?: string
        selector?: string
        computedStyle?: Record<string, string>
      }
      if (currentSlug && data.slug !== currentSlug) return
      if (typeof data.selector !== 'string') return
      setSelection({
        selector: data.selector,
        bp: currentBp,
        computedStyle: data.computedStyle ?? {},
      })
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [currentSlug, currentBp])

  const handleAccept = useCallback((id: string) => {
    setSession((prev) => acceptFn(prev, id))
  }, [])
  const handleReject = useCallback((id: string) => {
    setSession((prev) => rejectFn(prev, id))
  }, [])

  // WP-028 Phase 2 — debounced tweak dispatch (Ruling I: 300ms on dispatch side).
  const debouncedAddTweak = useMemo(
    () =>
      debounce((tweak: Tweak) => {
        setSession((prev) => addTweak(prev, tweak))
      }, 300),
    [],
  )

  const handleTweak = useCallback(
    (tweak: Tweak) => {
      debouncedAddTweak(tweak)
    },
    [debouncedAddTweak],
  )

  const handleBpChange = useCallback((bp: 1440 | 768 | 480) => {
    setCurrentBp(bp)
    setSelection((prev) => (prev ? { ...prev, bp } : prev))
  }, [])

  const handleResetTweaks = useCallback(() => {
    if (!selection) return
    setSession((prev) => removeTweaksFor(prev, selection.selector, selection.bp))
  }, [selection])

  const handleClose = useCallback(() => {
    setSelection(null)
  }, [])

  // WP-028 Phase 3 — VariantsDrawer open state + action dispatcher.
  const [variantsDrawerOpen, setVariantsDrawerOpen] = useState(false)
  const handleVariantAction = useCallback((action: VariantAction) => {
    switch (action.kind) {
      case 'create':
        setSession((prev) =>
          createVariantFn(prev, action.name, { html: action.html, css: action.css }),
        )
        break
      case 'rename':
        setSession((prev) => renameVariantFn(prev, action.from, action.to))
        break
      case 'delete':
        setSession((prev) => deleteVariantFn(prev, action.name))
        break
    }
  }, [])

  // WP-028 Phase 2a — derive appliedTweaks for the current (selector, bp) pair
  // from session.tweaks. Drives TweakPanel's slider seeds + Hide/Show aria-pressed.
  const appliedTweaksForSelection = useMemo<Tweak[]>(() => {
    if (!selection) return []
    return session.tweaks.filter(
      (t) => t.selector === selection.selector && t.bp === selection.bp,
    )
  }, [selection, session.tweaks])

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
      // WP-028 Phase 3 — serialize session.variants; emit undefined when empty so
      // the writer preserves Studio's payload convention (blocks.variants nullable
      // by design per WP-024 — phantom `{}` would be a silent drift).
      const hasVariants = Object.keys(session.variants).length > 0
      const updatedBlock: BlockJson = {
        ...block,
        html: applied.html,
        css: applied.css,
        variants: hasVariants ? session.variants : undefined,
      }
      const requestBackup = !session.backedUp
      await saveBlock({ block: updatedBlock, requestBackup })
      // Refetch from disk so UI mirrors on-disk bytes exactly (trailing
      // newline, key ordering, server-side serialization).
      const refreshed = await getBlock(block.slug)
      setBlock(refreshed)
      // Use functional setter so we operate on the latest state; the handler
      // closure's `session` could be one tick stale if a user double-clicks.
      // Pass refreshed.variants as savedVariants so session.variants aligns
      // with post-save disk state (Ruling P' pattern parity).
      setSession((prev) => clearAfterSave(prev, refreshed.variants ?? {}))
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
        <Button
          data-testid="variants-drawer-trigger"
          variant="outline"
          size="sm"
          onClick={() => setVariantsDrawerOpen(true)}
          disabled={!block}
        >
          + Variant ({Object.keys(session.variants).length})
        </Button>
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
          <PreviewTriptych block={composedBlock} />
        </section>
        <aside data-region="suggestions" className="flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <SuggestionList
              suggestions={suggestions}
              warnings={warnings}
              session={session}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </div>
          <TweakPanel
            selection={selection}
            appliedTweaks={appliedTweaksForSelection}
            onBpChange={handleBpChange}
            onTweak={handleTweak}
            onReset={handleResetTweaks}
            onClose={handleClose}
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

      <VariantsDrawer
        open={variantsDrawerOpen}
        onOpenChange={setVariantsDrawerOpen}
        variants={session.variants}
        baseHtml={block?.html ?? ''}
        baseCss={block?.css ?? ''}
        onAction={handleVariantAction}
      />
    </div>
  )
}
