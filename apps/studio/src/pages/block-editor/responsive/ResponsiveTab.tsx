// WP-027 Phase 4 — Responsive tab with session state + displayBlock live-preview + handlers.
//
// Phase 3 introduced engine wiring (analyzeBlock + generateSuggestions) + display-only rows.
// Phase 4 adds:
//   - useState(SessionState) via pure transition helpers from ./session-state
//   - handleAccept / handleReject callbacks (dispatch + form push for accepts)
//   - displayBlock memo (overrides Phase 2 ruling 7 — preview now reflects pending accepts)
//   - onApplyToForm callback prop — parent (block-editor.tsx) wraps form.setValue('code', ...)
//   - saveNonce-triggered clearAfterSave — parent increments nonce on successful save; we clear
//
// Brain ruling 2: analysis base stays stable — useResponsiveAnalysis deps are still
//   [block?.id, block?.html, block?.css]. Accept/reject never re-run analyzeBlock.
// Brain ruling 4: displayBlock layers pending accepts for live preview.
// Brain ruling 8: clearAfterSave ONLY on successful updateBlockApi (parent increments saveNonce).
// Brain ruling 9: session preserved across tab switches — block-editor.tsx uses CSS display:none
//   instead of conditional render so this component stays mounted.

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  type Suggestion,
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

interface ResponsiveTabProps {
  block: Block | null
  /** Parent callback — wraps form.setValue('code', blockToFormData(appliedBlock).code, { shouldDirty: true }). */
  onApplyToForm?: (appliedBlock: Block) => void
  /**
   * Parent-controlled counter. Incrementing this after a successful DB save signals
   * this component to call `clearAfterSave(session)`. Required to honor Brain ruling 8:
   * clear ONLY on successful updateBlockApi, never on Discard.
   */
  saveNonce?: number
}

interface AnalysisResult {
  suggestions: Suggestion[]
  warnings: string[] // engine's BlockAnalysis.warnings is string[] (verified types.ts:22)
  error: Error | null
}

/**
 * Analyzes the BASE block (ignoring variants + ignoring session accepts per Brain ruling 2)
 * and returns suggestions + warnings + any thrown error. Memoized on stable primitives so
 * accept/reject dispatches do NOT cause the suggestions list to churn mid-session.
 */
function useResponsiveAnalysis(block: Block | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return { suggestions: [], warnings: [], error: null }
    try {
      // analyzeBlock takes only { html, css } per AnalyzeBlockInput — engine doesn't read slug.
      // (Phase 3 Deviation #1; preserved in Phase 4.)
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
    // Deliberately NOT keyed on block.variants — Brain ruling 2 (analyze base only).
    // Deliberately NOT keyed on session state — Brain ruling 2 (analysis base stable).
  }, [block?.id, block?.html, block?.css])
}

export function ResponsiveTab({ block, onApplyToForm, saveNonce }: ResponsiveTabProps) {
  const { suggestions, warnings, error } = useResponsiveAnalysis(block)

  const [session, setSession] = useState<SessionState>(() => createSession())

  // Reset session when block.id changes (user navigates to a different block).
  // Render-phase state update per React docs "getDerivedStateFromProps"-style — allowed when
  // guarded by an equality check; React bails out after the second render.
  //
  // ⚠ Normalize both sides to null — `block?.id` is `undefined` when block is null,
  // and `undefined !== null` would loop infinitely otherwise.
  const currentBlockId = block?.id ?? null
  const [lastBlockId, setLastBlockId] = useState<string | null>(currentBlockId)
  if (currentBlockId !== lastBlockId) {
    setSession(createSession())
    setLastBlockId(currentBlockId)
  }

  // Brain ruling 8: parent-signal clearAfterSave. Ref-gate prevents firing on mount.
  const saveNonceRef = useRef<number | undefined>(saveNonce)
  useEffect(() => {
    if (saveNonce === undefined) return
    if (saveNonce === saveNonceRef.current) return
    saveNonceRef.current = saveNonce
    setSession((prev) => clearAfterSave(prev))
  }, [saveNonce])

  // Helper: compute applied block from current session + push to parent form.
  // Called from handleAccept (post-dispatch). Reject doesn't push — it only hides the row.
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
        // acceptFn returns SAME ref on no-op (already-acted id). Skip form push to avoid churn.
        if (next !== prev) applyToFormFromSession(next)
        return next
      })
    },
    [applyToFormFromSession],
  )

  const handleReject = useCallback(
    (id: string) => {
      setSession((prev) => rejectFn(prev, id))
      // Reject hides the row but doesn't change CSS — no form push needed.
    },
    [],
  )

  // Brain ruling 4: displayBlock layers pending accepts over base block for live preview.
  // Keyed on session.pending ref (changes on accept/undo — empty-array sentinel kept stable via
  // initial createSession()) + suggestions (stable across session changes per Brain ruling 2).
  const displayBlock = useMemo(() => {
    if (!block || session.pending.length === 0) return block
    const accepted = pickAccepted(session, suggestions)
    const applied = applySuggestions(
      { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
      accepted,
    )
    return { ...block, html: applied.html, css: applied.css }
  }, [block, session, suggestions])

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
    </div>
  )
}
