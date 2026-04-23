// WP-027 Phase 4 — Responsive tab with session state + displayBlock live-preview + handlers.
// WP-028 Phase 2 — adds TweakPanel wiring: selection state + element-click listener +
// per-BP tweak dispatch with 300ms debounce. OQ4 invariant enforced via the exported
// `dispatchTweakToForm` helper which block-editor.tsx wires into its `onTweakDispatch`
// callback (reads form.getValues('code') at dispatch time, NOT cached block.css).

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  emitTweak,
  type Suggestion,
  type Tweak,
} from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'
import {
  accept as acceptFn,
  reject as rejectFn,
  clearAfterSave,
  pickAccepted,
  createSession,
  type SessionState,
} from './session-state'
import { ResponsivePreview } from './ResponsivePreview'
import { SuggestionList } from './SuggestionList'
import { TweakPanel, type TweakSelection } from './TweakPanel'

interface ResponsiveTabProps {
  block: Block | null
  /** Parent callback — wraps form.setValue('code', blockToFormData(appliedBlock).code, { shouldDirty: true }). */
  onApplyToForm?: (appliedBlock: Block) => void
  /**
   * WP-028 Phase 2 — parent callback invoked by the TweakPanel's debounced dispatch.
   * Parent (block-editor.tsx) wraps `dispatchTweakToForm(form, tweak)` in a useCallback
   * so `form.getValues('code')` resolves at dispatch time (OQ4 invariant). Optional to
   * keep ResponsiveTab usable in read-only/test contexts without a form.
   */
  onTweakDispatch?: (tweak: Tweak) => void
  /**
   * Parent-controlled counter. Incrementing this after a successful DB save signals
   * this component to call `clearAfterSave(session)`. Required to honor Brain ruling 8:
   * clear ONLY on successful updateBlockApi, never on Discard.
   */
  saveNonce?: number
}

interface AnalysisResult {
  suggestions: Suggestion[]
  warnings: string[]
  error: Error | null
}

/**
 * Analyzes the BASE block (ignoring variants + ignoring session accepts per Brain ruling 2)
 * and returns suggestions + warnings + any thrown error.
 */
function useResponsiveAnalysis(block: Block | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return { suggestions: [], warnings: [], error: null }
    try {
      const analysis = analyzeBlock({
        html: block.html ?? '',
        css: block.css ?? '',
      })
      const suggestions = generateSuggestions(analysis)
      return {
        suggestions,
        warnings: analysis.warnings ?? [],
        error: null,
      }
    } catch (err) {
      return {
        suggestions: [],
        warnings: [],
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }, [block?.id, block?.html, block?.css])
}

/**
 * OQ4 INVARIANT — pure helper exported for direct unit testing.
 *
 * Reads LIVE form.code at dispatch time, splits into {html, css}, runs `emitTweak`
 * against the CSS only, reassembles, and writes back via form.setValue. The
 * block-editor.tsx useCallback simply closes over `form` and delegates to this
 * helper, so the invariant is enforced at the single source rather than per-caller.
 *
 * @param form RHF subset — just the two methods we need (keeps the signature
 *             test-friendly; a full UseFormReturn<BlockFormData> is compatible).
 * @param tweak The authored per-BP override to apply.
 *
 * @invariant `form.getValues('code')` is called SYNCHRONOUSLY at dispatch time.
 *            No cached closure over block.css or a prior getValues() result.
 *            Tested in TweakPanel.test.tsx "OQ4 invariant" describe.
 */
export function dispatchTweakToForm(
  form: {
    getValues: (key: 'code') => string
    setValue: (
      key: 'code',
      value: string,
      opts?: { shouldDirty?: boolean },
    ) => void
  },
  tweak: Tweak,
): void {
  const liveCode = form.getValues('code')
  // Split into <style>…</style> CSS and HTML rest. Duplicates block-editor.tsx
  // splitCode inline to avoid a cross-file dependency.
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let baseCss = ''
  let m: RegExpExecArray | null
  const re = new RegExp(styleRe.source, styleRe.flags)
  while ((m = re.exec(liveCode)) !== null) {
    baseCss += (baseCss ? '\n\n' : '') + m[1].trim()
  }
  const htmlOnly = liveCode.replace(styleRe, '').trim()

  const nextCss = emitTweak(tweak, baseCss)
  const combined = nextCss.trim()
    ? `<style>\n${nextCss}\n</style>\n\n${htmlOnly}`
    : htmlOnly

  form.setValue('code', combined, { shouldDirty: true })
}

/**
 * Small inline debounce — keeps ResponsiveTab self-contained (no new util files
 * per Phase 2 arch-test Δ0 rule). Trailing-edge semantics match lodash.debounce.
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

export function ResponsiveTab({
  block,
  onApplyToForm,
  onTweakDispatch,
  saveNonce,
}: ResponsiveTabProps) {
  const { suggestions, warnings, error } = useResponsiveAnalysis(block)

  const [session, setSession] = useState<SessionState>(() => createSession())

  // Reset session when block.id changes.
  const currentBlockId = block?.id ?? null
  const [lastBlockId, setLastBlockId] = useState<string | null>(currentBlockId)
  if (currentBlockId !== lastBlockId) {
    setSession(createSession())
    setLastBlockId(currentBlockId)
    // Also clear selection on block switch — selector context no longer applies.
    // Deferred to an effect below (render-phase state mutations only touch session).
  }

  // Brain ruling 8: parent-signal clearAfterSave.
  const saveNonceRef = useRef<number | undefined>(saveNonce)
  useEffect(() => {
    if (saveNonce === undefined) return
    if (saveNonce === saveNonceRef.current) return
    saveNonceRef.current = saveNonce
    setSession((prev) => clearAfterSave(prev))
  }, [saveNonce])

  // WP-028 Phase 2 — TweakPanel selection state + element-click listener.
  const [selection, setSelection] = useState<TweakSelection | null>(null)
  const [currentBp, setCurrentBp] = useState<1440 | 768 | 480>(1440)
  const currentSlug = block?.slug ?? null

  // Clear selection whenever the active block changes (different DOM tree).
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
      // Slug filter — multiple iframes emit the same type with their own slug.
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

  // Apply-accepted-suggestions propagation (pre-existing Phase 4 flow).
  const applyToFormFromSession = useCallback(
    (newSession: SessionState) => {
      if (!block || !onApplyToForm) return
      const accepted = pickAccepted(newSession, suggestions)
      const applied = applySuggestions(
        { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
        accepted,
      )
      onApplyToForm({
        ...block,
        html: applied.html,
        css: applied.css,
      })
    },
    [block, suggestions, onApplyToForm],
  )

  const handleAccept = useCallback(
    (id: string) => {
      setSession((prev) => {
        const next = acceptFn(prev, id)
        if (next !== prev) applyToFormFromSession(next)
        return next
      })
    },
    [applyToFormFromSession],
  )

  const handleReject = useCallback((id: string) => {
    setSession((prev) => rejectFn(prev, id))
  }, [])

  // displayBlock for preview — pending accepts only; tweaks live in form.code directly.
  const displayBlock = useMemo(() => {
    if (!block || session.pending.length === 0) return block
    const accepted = pickAccepted(session, suggestions)
    const applied = applySuggestions(
      { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
      accepted,
    )
    return { ...block, html: applied.html, css: applied.css }
  }, [block, session, suggestions])

  // WP-028 Phase 2 — debounced dispatcher; 300ms on dispatch side (Ruling I).
  const onTweakDispatchRef = useRef(onTweakDispatch)
  useEffect(() => {
    onTweakDispatchRef.current = onTweakDispatch
  }, [onTweakDispatch])

  const debouncedDispatch = useMemo(
    () =>
      debounce((tweak: Tweak) => {
        onTweakDispatchRef.current?.(tweak)
      }, 300),
    [],
  )

  const handleTweak = useCallback(
    (tweak: Tweak) => {
      debouncedDispatch(tweak)
    },
    [debouncedDispatch],
  )

  const handleBpChange = useCallback((bp: 1440 | 768 | 480) => {
    setCurrentBp(bp)
    setSelection((prev) => (prev ? { ...prev, bp } : prev))
  }, [])

  const handleReset = useCallback(() => {
    if (!selection || !onTweakDispatchRef.current) return
    // Reset scope (Ruling J): remove current-pair declarations by dispatching
    // "revert" tweaks for each of the 4 tweakable properties. `emitTweak` with
    // value: 'revert' updates the declaration in-place so subsequent layers
    // inherit the base rule cleanly — a best-effort Reset without re-implementing
    // CSS removal in RHF. Full rule-removal is Phase 2.5 polish.
    const { selector, bp } = selection
    const properties: Array<Tweak['property']> = [
      'padding',
      'font-size',
      'gap',
      'display',
    ]
    for (const property of properties) {
      onTweakDispatchRef.current({
        selector,
        bp,
        property,
        value: 'revert',
      })
    }
  }, [selection])

  const handleClose = useCallback(() => {
    setSelection(null)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <ResponsivePreview block={displayBlock} />
      <SuggestionList
        suggestions={suggestions}
        warnings={warnings}
        error={error}
        session={session}
        onAccept={handleAccept}
        onReject={handleReject}
      />
      <TweakPanel
        selection={selection}
        onBpChange={handleBpChange}
        onTweak={handleTweak}
        onReset={handleReset}
        onClose={handleClose}
      />
    </div>
  )
}
