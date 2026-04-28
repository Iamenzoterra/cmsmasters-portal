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
import { FLUID_DEFAULT, parseFluidMode, setFluidMode, type FluidMode } from './lib/fluid-mode'
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
  removeFromPending as removeFromPendingFn,
  removeTweakFor,
  removeTweaksFor,
  renameVariant as renameVariantFn,
  setFluidModeOverride,
  updateVariantContent as updateVariantContentFn,
  type SessionState,
} from './lib/session'
import { BlockPicker } from './components/BlockPicker'
import { ExportDialog } from './components/ExportDialog'
import { Inspector, type InspectorBp } from './components/Inspector'
import { PreviewTriptych } from './components/PreviewTriptych'
import { SuggestionList } from './components/SuggestionList'
import { StatusBar } from './components/StatusBar'
import { TweakPanel, type TweakSelection } from './components/TweakPanel'
import { VariantsDrawer, type VariantAction } from './components/VariantsDrawer'

// WP-033 Phase 1.5 — Inspector ↔ PreviewTriptych viewport coupling.
// Inspector's BP picker (1440|768|375) and Triptych's tab id share state via
// App.tsx (single source of truth). The two tables map between them. The 480
// BP (TweakPanel legacy) is intentionally NOT mapped — TweakPanel keeps its
// own independent BP state until Phase 5 collapses both to 1440|768|375.
type ViewportId = 'desktop' | 'tablet' | 'mobile'
const VIEWPORT_BP: Record<ViewportId, InspectorBp> = {
  desktop: 1440,
  tablet: 768,
  mobile: 375,
}
const BP_VIEWPORT: Record<InspectorBp, ViewportId> = {
  1440: 'desktop',
  768: 'tablet',
  375: 'mobile',
}

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
    // WP-030 hotfix — apply pending fluid-mode override on top of base html.
    const html =
      session.fluidModeOverride !== null
        ? setFluidMode(block.html, session.fluidModeOverride)
        : block.html
    const variants = Object.keys(session.variants).length > 0 ? session.variants : undefined
    return { ...block, html, css, variants }
  }, [block, session.tweaks, session.variants, session.fluidModeOverride])

  // WP-028 Phase 2 — TweakPanel selection state + element-click listener.
  const [selection, setSelection] = useState<TweakSelection | null>(null)
  const [currentBp, setCurrentBp] = useState<1440 | 768 | 480>(1440)
  const currentSlug = block?.slug ?? null

  // WP-033 Phase 1.5 — Option C: lift PreviewTriptych's activeId here so
  // Inspector and Triptych stay in lockstep. Default 'desktop' (existing
  // Triptych default). inspectorActiveBp is derived from previewActiveId.
  const [previewActiveId, setPreviewActiveId] = useState<ViewportId>('desktop')
  const inspectorActiveBp = VIEWPORT_BP[previewActiveId]
  const handleInspectorBpChange = useCallback((bp: InspectorBp) => {
    setPreviewActiveId(BP_VIEWPORT[bp])
  }, [])

  // WP-033 polish — resizable sidebar via left-edge drag handle.
  // rAF-throttled mousemove to avoid re-render churn. Width clamped 320-960px.
  const [sidebarWidth, setSidebarWidth] = useState(360)
  const [sidebarDragging, setSidebarDragging] = useState(false)
  useEffect(() => {
    if (!sidebarDragging) return
    let rafId: number | null = null
    let pendingX: number | null = null
    function onMove(e: MouseEvent) {
      pendingX = e.clientX
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        if (pendingX === null) return
        const next = Math.max(320, Math.min(960, window.innerWidth - pendingX))
        setSidebarWidth(next)
        pendingX = null
      })
    }
    function onUp() {
      if (rafId !== null) cancelAnimationFrame(rafId)
      setSidebarDragging(false)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [sidebarDragging])

  // WP-033 Phase 3 — Inspector dispatchers. Synchronous (not debounced like
  // TweakPanel's slider) — cell edit / token apply / visibility toggle are
  // discrete actions, not continuous drags. composedBlock memo picks up the
  // new tweak and re-renders the iframe; Inspector re-pins automatically.
  const handleInspectorCellEdit = useCallback(
    (selector: string, bp: InspectorBp, property: string, value: string) => {
      setSession((prev) => addTweak(prev, { selector, bp, property, value }))
    },
    [],
  )
  const handleInspectorApplyToken = useCallback(
    (selector: string, property: string, tokenName: string) => {
      setSession((prev) =>
        addTweak(prev, { selector, bp: 0, property, value: `var(${tokenName})` }),
      )
    },
    [],
  )
  const handleInspectorVisibilityToggle = useCallback(
    (selector: string, bp: InspectorBp, hide: boolean) => {
      setSession((prev) =>
        hide
          ? addTweak(prev, { selector, bp, property: 'display', value: 'none' })
          : removeTweakFor(prev, selector, bp, 'display'),
      )
    },
    [],
  )
  // Revert handler — strips both BP-scoped tweak AND any bp:0 token-apply for
  // this property, so a single ↺ click brings the cell back to the base CSS.
  const handleInspectorRevert = useCallback(
    (selector: string, bp: InspectorBp, property: string) => {
      setSession((prev) => {
        const afterBp = removeTweakFor(prev, selector, bp, property)
        return removeTweakFor(afterBp, selector, 0, property)
      })
    },
    [],
  )
  // Phase C — bake `transform: scale(N)` from parent into per-child px tweaks.
  // Removes parent's transform / transform-origin tweaks and adds the supplied
  // per-child px tweaks at the active BP.
  const handleInspectorBakeScale = useCallback(
    (
      parentSelector: string,
      bp: InspectorBp,
      bakedTweaks: ReadonlyArray<{ selector: string; property: string; value: string }>,
    ) => {
      setSession((prev) => {
        let next = removeTweakFor(prev, parentSelector, bp, 'transform')
        next = removeTweakFor(next, parentSelector, bp, 'transform-origin')
        for (const t of bakedTweaks) {
          next = addTweak(next, { selector: t.selector, bp, property: t.property, value: t.value })
        }
        return next
      })
    },
    [],
  )

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

  // WP-036 Phase 2 — per-id Undo. Distinct from `reject` (which is "no, I don't
  // want this suggestion") — Undo means "I clicked Accept by mistake, take it
  // back". Calls `removeFromPending` reducer which filters pending + matching
  // `accept` history entry. Idempotent: clicking Undo when not pending is a no-op.
  const handleUndo = useCallback((id: string) => {
    setSession((prev) => removeFromPendingFn(prev, id))
  }, [])

  // WP-036 Phase 1 — sidebar→iframe hover-highlight broadcast.
  // Posts `block-forge:inspector-request-hover` to ALL triptych iframes for the
  // current slug (querySelectorAll, not querySelector — Inspector's per-BP probe
  // picks the first match, but for hover we want all visible BPs to light up so
  // the author sees the element across desktop/tablet/mobile in one glance).
  // selector === null sends the __clear__ sentinel (postMessage cross-realm
  // safe). Iframe IIFE handles the resolve + outline; fire-and-forget shape.
  const handlePreviewHover = useCallback(
    (selector: string | null) => {
      if (!currentSlug) return
      const iframes = document.querySelectorAll<HTMLIFrameElement>(
        `iframe[title^="${CSS.escape(currentSlug)}-"]`,
      )
      iframes.forEach((iframe) => {
        if (!iframe.contentWindow) return
        iframe.contentWindow.postMessage(
          {
            type: 'block-forge:inspector-request-hover',
            slug: currentSlug,
            selector: selector ?? '__clear__',
          },
          '*',
        )
      })
    },
    [currentSlug],
  )

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

  // WP-030 redesign — per-BP fluid toggle (rendered next to each non-desktop
  // panel header in PreviewTriptych). Derived from session override with
  // fall-through to block.html parse.
  const currentFluidMode = useMemo<FluidMode>(() => {
    if (session.fluidModeOverride !== null) return session.fluidModeOverride
    if (!block) return FLUID_DEFAULT
    return parseFluidMode(block.html)
  }, [session.fluidModeOverride, block])

  const handleFluidModeChange = useCallback((mode: FluidMode) => {
    setSession((prev) => setFluidModeOverride(prev, mode))
  }, [])

  const handleClose = useCallback(() => {
    setSelection(null)
  }, [])

  // WP-035 Phase 1 — ExportDialog open state + minimal V1 toast (no shared
  // toast infra in block-forge yet; Phase 5 polish absorbs proper toast).
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)
  const showExportToast = useCallback((msg: string) => {
    setExportToast(msg)
    window.setTimeout(() => setExportToast((cur) => (cur === msg ? null : cur)), 2500)
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
      case 'update-content':
        setSession((prev) =>
          updateVariantContentFn(prev, action.name, { html: action.html, css: action.css }),
        )
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
    // WP-028 Phase 4 — save on any dirty state (suggestions / tweaks / variants).
    // Pre-Phase-4 this early-returned on `accepted.length === 0` which blocked
    // variant-only edits from persisting (and hid the tweaks-only save gap too).
    if (!isDirty(session)) return
    const accepted = pickAccepted(session, suggestions)

    setSaveInFlight(true)
    setSaveError(null)
    try {
      // Core applySuggestions takes {slug, html, css} (BlockInput), returns
      // {slug, html, css, variants?} (BlockOutput). When no suggestions are
      // accepted, skip the call and keep base html/css verbatim — variant /
      // tweak edits still reach disk through updatedBlock below.
      // WP-028 Phase 6 (Ruling MM / OQ5) — compose session.tweaks into CSS
      // before applySuggestions so tweak-only saves persist. Pre-Phase-6,
      // composeTweakedCss ran only at render-time (L149 memo); handleSave
      // used raw block.css and silently dropped tweaks on save.
      const composedCss =
        session.tweaks.length > 0
          ? composeTweakedCss(block.css, session.tweaks)
          : block.css
      // WP-030 hotfix — apply pending fluid-mode override into html before save.
      const composedHtml =
        session.fluidModeOverride !== null
          ? setFluidMode(block.html, session.fluidModeOverride)
          : block.html
      const applied =
        accepted.length > 0
          ? applySuggestions(
              { slug: block.slug, html: composedHtml, css: composedCss },
              accepted,
            )
          : { html: composedHtml, css: composedCss }
      // Merge applied html/css back into the full BlockJson so we preserve
      // non-engine fields (name, id, block_type, hooks, metadata, etc.).
      // WP-028 Phase 3 — serialize session.variants; emit the non-populated
      // sentinel when empty (disk parity with Studio's formDataToPayload).
      // WP-028 Phase 5 (Ruling HH+LL / OQ2) — sentinel flipped undefined → null
      // to match Studio's PUT payload and preserve the key through JSON.stringify
      // round-trip. JSON.stringify drops undefined keys but preserves null, so
      // both disk on-the-wire bytes and the DB column behave the same way
      // (Studio API → Supabase; block-forge fs → .json file). Consumers treat
      // `null | undefined | {}` as "no variants".
      const hasVariants = Object.keys(session.variants).length > 0
      const updatedBlock: BlockJson = {
        ...block,
        html: applied.html,
        css: applied.css,
        variants: hasVariants ? session.variants : null,
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

      <main className="grid grid-cols-[1fr_auto] overflow-hidden">
        <section
          data-region="triptych"
          className="overflow-auto border-r border-[hsl(var(--border-default))]"
        >
          <PreviewTriptych
            block={composedBlock}
            fluidMode={currentFluidMode}
            onFluidModeChange={handleFluidModeChange}
            activeId={previewActiveId}
            onActiveIdChange={setPreviewActiveId}
          />
        </section>
        <aside
          data-region="suggestions"
          className="relative flex flex-col overflow-hidden border-l border-[hsl(var(--border-default))]"
          style={{ width: sidebarWidth }}
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            data-testid="sidebar-resize-handle"
            onMouseDown={(e) => {
              e.preventDefault()
              setSidebarDragging(true)
            }}
            className={`absolute left-0 top-0 bottom-0 z-20 w-1.5 cursor-col-resize transition-colors hover:bg-[hsl(var(--text-link))] ${sidebarDragging ? 'bg-[hsl(var(--text-link))]' : ''}`}
          />
          <div className="max-h-[40vh] shrink-0 overflow-auto">
            <SuggestionList
              suggestions={suggestions}
              warnings={warnings}
              session={session}
              onAccept={handleAccept}
              onReject={handleReject}
              onUndo={handleUndo}
              onPreviewHover={handlePreviewHover}
            />
          </div>
          {/* WP-033 post-close — TweakPanel sunset (user feedback: confusing dup of Inspector, slider showed wrong values). Inspector replaces it. State (selection, appliedTweaks, handlers) kept alive for now in case rollback needed. */}
          <div className="min-h-0 flex-1 overflow-auto">
            <Inspector
              slug={currentSlug}
              activeBp={inspectorActiveBp}
              onActiveBpChange={handleInspectorBpChange}
              onCellEdit={handleInspectorCellEdit}
              onApplyToken={handleInspectorApplyToken}
              onVisibilityToggle={handleInspectorVisibilityToggle}
              onCellRevert={handleInspectorRevert}
              onBakeScale={handleInspectorBakeScale}
              tweaks={session.tweaks}
              effectiveCss={composedBlock?.css ?? ''}
              blockHtml={composedBlock?.html ?? ''}
            />
          </div>
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
          onExport={() => setShowExportDialog(true)}
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

      {showExportDialog && composedBlock && (
        <ExportDialog
          block={composedBlock}
          onClose={() => setShowExportDialog(false)}
          onShowToast={showExportToast}
        />
      )}

      {exportToast && (
        <div
          role="status"
          data-testid="export-toast"
          className="fixed bottom-6 left-1/2 z-[1100] -translate-x-1/2 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-4 py-2 text-sm text-[hsl(var(--text-default))] shadow-lg"
        >
          {exportToast}
        </div>
      )}
    </div>
  )
}
