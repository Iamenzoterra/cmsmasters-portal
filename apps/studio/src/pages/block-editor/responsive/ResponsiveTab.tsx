// WP-027 Phase 4 — Responsive tab with session state + displayBlock live-preview + handlers.
// WP-028 Phase 2 — adds TweakPanel wiring: selection state + element-click listener +
// per-BP tweak dispatch with 300ms debounce. OQ4 invariant enforced via the exported
// `dispatchTweakToForm` helper which block-editor.tsx wires into its `onTweakDispatch`
// callback (reads form.getValues('code') at dispatch time, NOT cached block.css).
// WP-028 Phase 2a — Reset now performs real rule-removal (postcss-based); TweakPanel
// receives `appliedTweaks` to drive aria-pressed sync + slider seed from latest state.

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import postcss, { type AtRule as PcssAtRule, type Rule as PcssRule } from 'postcss'
import {
  analyzeBlock,
  generateSuggestions,
  applySuggestions,
  emitTweak,
  type Suggestion,
  type Tweak,
} from '@cmsmasters/block-forge-core'
import type { Block, BlockVariants } from '@cmsmasters/db'
import { Button } from '@cmsmasters/ui'
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
import { VariantsDrawer, type VariantAction } from './VariantsDrawer'
import { Inspector, type InspectorBp } from './inspector/Inspector'
import { dispatchInspectorEdit } from './inspector/lib/dispatchInspectorEdit'

// WP-033 Phase 5 OQ2: re-export so block-editor.tsx can import VariantAction
// from ResponsiveTab (its actual definition lives in VariantsDrawer).
export type { VariantAction } from './VariantsDrawer'

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
   * WP-028 Phase 2a — parent callback for Reset button. Wraps `resetTweaksInForm(form, ...)`
   * which parses live form.code, removes the 4 tweak declarations under
   * `@container slot (max-width: {bp}px) > {selector}`, writes back with shouldDirty.
   * Optional — falls back to a no-op in test contexts.
   */
  onResetTweaks?: (selector: string, bp: 1440 | 768 | 480) => void
  /**
   * WP-028 Phase 2a — live `form.code` value, watched by parent via `useWatch`.
   * Drives the TweakPanel slider positions + Hide/Show aria-pressed state so UI
   * reflects the authored state (including mid-session tweaks), not the initial
   * computedStyle-seed snapshot.
   */
  watchedFormCode?: string
  /**
   * Parent-controlled counter. Incrementing this after a successful DB save signals
   * this component to call `clearAfterSave(session)`. Required to honor Brain ruling 8:
   * clear ONLY on successful updateBlockApi, never on Discard.
   */
  saveNonce?: number
  /**
   * WP-028 Phase 3 — parent callback invoked by the VariantsDrawer when the
   * author forks / renames / deletes a variant. Parent (block-editor.tsx) wraps
   * `dispatchVariantToForm(form, action)` in a useCallback so form state reads
   * happen at dispatch time (OQ4 invariant mirror). Optional — falls back to a
   * no-op in read-only / test contexts.
   */
  onVariantDispatch?: (action: VariantAction) => void
  /**
   * WP-028 Phase 3 — live `form.variants` value, watched by the parent via
   * `useWatch({ name: 'variants' })`. Drives the VariantsDrawer list when
   * authors fork/rename/delete. Defaults to `{}` when no variants.
   */
  watchedVariants?: BlockVariants
  /**
   * WP-028 Phase 3 — base block content at fork time (Ruling N — deep copy).
   * Derived upstream by splitting `form.code` into html/css; see block-editor.tsx
   * `baseHtmlForFork/baseCssForFork` memo. Drawer itself does NOT re-read form.
   */
  baseHtmlForFork?: string
  baseCssForFork?: string
  /**
   * WP-033 Phase 4 — Inspector dispatch callback. block-editor.tsx wraps
   * `dispatchInspectorEdit(form, edit)` so the LIVE-read invariant holds.
   * Optional — falls back to read-only Inspector when undefined.
   */
  onInspectorEdit?: (edit: import('./inspector/lib/dispatchInspectorEdit').InspectorEdit) => void
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
  const { html, css } = splitCode(liveCode)
  const nextCss = emitTweak(tweak, css)
  form.setValue('code', assembleCode(nextCss, html), { shouldDirty: true })
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

/**
 * Extract the CSS block from a `form.code` string shaped like
 * `<style>...</style>\n\n<html>`. Empty string if no <style> tag.
 * Exported so the OQ4 dispatcher and the Reset + applied-tweak helpers
 * share the same split semantics.
 */
function splitCode(code: string): { html: string; css: string } {
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let css = ''
  let m: RegExpExecArray | null
  while ((m = styleRe.exec(code)) !== null) {
    css += (css ? '\n\n' : '') + m[1].trim()
  }
  const html = code.replace(styleRe, '').trim()
  return { html, css }
}

function assembleCode(css: string, html: string): string {
  return css.trim() ? `<style>\n${css}\n</style>\n\n${html}` : html
}

/**
 * Match a PostCSS `@container` AtRule whose params correspond to
 * `slot (max-width: {bp}px)`. Bp=0 is the top-level (no container) case.
 */
function isContainerFor(atRule: PcssAtRule, bp: number): boolean {
  if (atRule.name !== 'container') return false
  const m = atRule.params.match(/slot\s*\(\s*max-width:\s*(\d+)px\s*\)/i)
  return !!m && Number(m[1]) === bp
}

/**
 * WP-033 Phase 4 — parse ALL tweaks (across all bps + top-level) from form.code.
 * Used by Inspector to derive `isHiddenAtActiveBp` from form state. Differs from
 * `parseAppliedTweaks` below (which is filtered by selector + bp): Inspector
 * receives the full flat list and filters internally per pinned selector.
 *
 * Top-level rules are emitted as bp:0 entries (matches Inspector apply-token semantic).
 * Pure function — no side effects.
 */
export function parseAllTweaksFromCode(formCode: string): Tweak[] {
  const { css } = splitCode(formCode)
  if (!css) return []
  let root: postcss.Root
  try {
    root = postcss.parse(css)
  } catch {
    return []
  }
  const out: Tweak[] = []

  function collectFromRule(rule: PcssRule, bp: number) {
    rule.walkDecls((decl) => {
      out.push({
        selector: rule.selector.trim(),
        bp,
        property: decl.prop,
        value: decl.value,
      })
    })
  }

  // Top-level rules → bp:0
  root.walkRules((rule) => {
    if (rule.parent?.type === 'root') collectFromRule(rule, 0)
  })

  // @container slot (max-width: Npx) → bp:N
  root.walkAtRules('container', (atRule) => {
    const m = atRule.params.match(/slot\s*\(\s*max-width:\s*(\d+)px\s*\)/i)
    if (!m) return
    const bp = Number(m[1])
    atRule.walkRules((rule) => collectFromRule(rule, bp))
  })

  return out
}

/**
 * Parse the current `form.code` and return the tweaks currently authored
 * for (selector, bp). Used to seed TweakPanel's slider positions + the
 * aria-pressed state of Hide/Show so the UI reflects the live form state.
 *
 * Pure function — no side effects, safe to memoize at render time.
 */
export function parseAppliedTweaks(
  formCode: string,
  selector: string,
  bp: 1440 | 768 | 480,
): Tweak[] {
  const { css } = splitCode(formCode)
  if (!css) return []
  let root: postcss.Root
  try {
    root = postcss.parse(css)
  } catch {
    return []
  }
  const out: Tweak[] = []

  function collectFromRule(rule: PcssRule, actualBp: number) {
    if (rule.selector.trim() !== selector.trim()) return
    rule.walkDecls((decl) => {
      out.push({
        selector,
        bp: actualBp,
        property: decl.prop,
        value: decl.value,
      })
    })
  }

  // bp > 0 → inside matching @container slot (max-width: {bp}px)
  root.walkAtRules('container', (atRule) => {
    if (!isContainerFor(atRule, bp)) return
    atRule.walkRules((rule) => collectFromRule(rule, bp))
  })

  return out
}

/**
 * Remove every declaration for `properties` inside `selector` under
 * `@container slot (max-width: {bp}px)`. Cleanup:
 *   - If the selector rule becomes empty, remove the rule.
 *   - If the @container becomes empty, remove the container.
 *
 * Pure; exported for direct unit testing.
 */
export function removeTweaksFromCss(
  css: string,
  selector: string,
  bp: 1440 | 768 | 480,
  properties: readonly string[],
): string {
  if (!css.trim()) return css
  let root: postcss.Root
  try {
    root = postcss.parse(css)
  } catch {
    return css
  }
  const propSet = new Set(properties)

  root.walkAtRules('container', (atRule) => {
    if (!isContainerFor(atRule, bp)) return
    atRule.walkRules((rule) => {
      if (rule.selector.trim() !== selector.trim()) return
      rule.walkDecls((decl) => {
        if (propSet.has(decl.prop)) decl.remove()
      })
      if (rule.nodes.length === 0) rule.remove()
    })
    if (atRule.nodes.length === 0) atRule.remove()
  })

  return root.toString()
}

/**
 * WP-028 Phase 3 — apply a VariantAction to the RHF form's `variants` field.
 *
 * Reads `form.getValues('variants')` LIVE at dispatch time (OQ4 invariant mirror),
 * computes the next variants record, calls `form.setValue('variants', next,
 * { shouldDirty: true })`. Returns the PREVIOUS record so callers that want
 * undo instrumentation can capture it.
 *
 * @invariant No cached closure over `form.variants` — the live form state is the
 *            single source of truth at dispatch time. Tested in integration.test.tsx.
 */
export function dispatchVariantToForm(
  form: {
    getValues: (key: 'variants') => BlockVariants | undefined
    setValue: (
      key: 'variants',
      value: BlockVariants,
      opts?: { shouldDirty?: boolean },
    ) => void
  },
  action: VariantAction,
): BlockVariants {
  const current = form.getValues('variants') ?? {}
  const prev: BlockVariants = { ...current }
  let next: BlockVariants
  switch (action.kind) {
    case 'create':
      // Deep copy of base (Ruling N) — action carries snapshot html/css.
      next = { ...current, [action.name]: { html: action.html, css: action.css } }
      break
    case 'rename': {
      const moving = current[action.from]
      if (!moving) return prev
      const { [action.from]: _dropFrom, ...rest } = current
      next = { ...rest, [action.to]: moving }
      break
    }
    case 'delete': {
      const { [action.name]: _dropName, ...rest } = current
      next = rest
      break
    }
    case 'update-content': {
      // Phase 4 — debounced editor dispatch. Rename-race safety: if the variant
      // was renamed away while debounce was pending, silently no-op.
      if (!(action.name in current)) return prev
      next = { ...current, [action.name]: { html: action.html, css: action.css } }
      break
    }
  }
  form.setValue('variants', next, { shouldDirty: true })
  return prev
}

/**
 * Studio Reset handler (WP-028 Phase 2a). Reads live form.code, removes all
 * Phase-2 tweak declarations for (selector, bp), writes back with shouldDirty.
 * Exported for direct testing.
 */
export function resetTweaksInForm(
  form: {
    getValues: (key: 'code') => string
    setValue: (
      key: 'code',
      value: string,
      opts?: { shouldDirty?: boolean },
    ) => void
  },
  selector: string,
  bp: 1440 | 768 | 480,
  properties: readonly string[] = ['padding', 'font-size', 'gap', 'display'],
): void {
  const liveCode = form.getValues('code')
  const { html, css } = splitCode(liveCode)
  const nextCss = removeTweaksFromCss(css, selector, bp, properties)
  if (nextCss === css) return // no-op — nothing to reset
  form.setValue('code', assembleCode(nextCss, html), { shouldDirty: true })
}

export function ResponsiveTab({
  block,
  onApplyToForm,
  onTweakDispatch,
  onResetTweaks,
  watchedFormCode,
  saveNonce,
  onVariantDispatch,
  watchedVariants,
  baseHtmlForFork,
  baseCssForFork,
  onInspectorEdit,
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

  // WP-033 Phase 5 OQ1: displayBlock follows watchedFormCode so Inspector +
  // TweakPanel + SuggestionList tweaks reflect in the visible iframe immediately
  // (DevTools mental model). Falls back to suggestions-applied derivation on
  // initial mount when no form.code is threaded (e.g. test contexts).
  const displayBlock = useMemo(() => {
    if (!block) return block
    const liveCode = watchedFormCode ?? ''
    if (liveCode) {
      const { html: liveHtml, css: liveCss } = splitCode(liveCode)
      return { ...block, html: liveHtml || block.html, css: liveCss || block.css }
    }
    if (session.pending.length === 0) return block
    const accepted = pickAccepted(session, suggestions)
    const applied = applySuggestions(
      { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
      accepted,
    )
    return { ...block, html: applied.html, css: applied.css }
  }, [block, session, suggestions, watchedFormCode])

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

  const onResetTweaksRef = useRef(onResetTweaks)
  useEffect(() => {
    onResetTweaksRef.current = onResetTweaks
  }, [onResetTweaks])

  const handleReset = useCallback(() => {
    if (!selection || !onResetTweaksRef.current) return
    // WP-028 Phase 2a — real rule-removal: parent (block-editor.tsx) calls
    // resetTweaksInForm which removes the 4 tweak declarations under the
    // `@container slot (max-width: {bp}px)` rule for this selector. Cleanup
    // collapses empty rules + empty containers. Ruling J scope preserved:
    // other bps and other selectors are untouched because the postcss walk
    // is keyed on BOTH (selector, bp).
    onResetTweaksRef.current(selection.selector, selection.bp)
  }, [selection])

  const handleClose = useCallback(() => {
    setSelection(null)
  }, [])

  // WP-028 Phase 2a — applied tweaks for the current (selector, bp) pair,
  // parsed from live form.code. Drives TweakPanel's slider positions + Hide/Show
  // aria-pressed state. Undefined when no selection (empty-state panel).
  const appliedTweaks = useMemo<Tweak[]>(() => {
    if (!selection || !watchedFormCode) return []
    return parseAppliedTweaks(watchedFormCode, selection.selector, selection.bp)
  }, [selection, watchedFormCode])

  // WP-028 Phase 3 — VariantsDrawer open state + action forwarder.
  const [variantsDrawerOpen, setVariantsDrawerOpen] = useState(false)
  const handleVariantAction = useCallback(
    (action: VariantAction) => {
      onVariantDispatch?.(action)
    },
    [onVariantDispatch],
  )

  // WP-033 Phase 4 — Inspector state + dispatch handlers.
  const [inspectorBp, setInspectorBp] = useState<InspectorBp>(1440)

  // Split form.code into html/css for Inspector (probe iframes need both;
  // useChipDetection needs effectiveCss). Falls back to base block when no
  // form data threaded.
  const inspectorBlockSource = useMemo(() => {
    const code = watchedFormCode ?? ''
    if (code) {
      const { html, css } = splitCode(code)
      return { html, css }
    }
    return { html: block?.html ?? '', css: block?.css ?? '' }
  }, [watchedFormCode, block?.html, block?.css])

  const inspectorTweaks = useMemo<Tweak[]>(() => {
    return watchedFormCode ? parseAllTweaksFromCode(watchedFormCode) : []
  }, [watchedFormCode])

  const onInspectorEditRef = useRef(onInspectorEdit)
  useEffect(() => {
    onInspectorEditRef.current = onInspectorEdit
  }, [onInspectorEdit])

  const handleInspectorCellEdit = useCallback(
    (selector: string, bp: InspectorBp, property: string, value: string) => {
      onInspectorEditRef.current?.({
        kind: 'tweak',
        tweak: { selector, bp, property, value },
      })
    },
    [],
  )

  const handleInspectorApplyToken = useCallback(
    (selector: string, property: string, tokenName: string) => {
      onInspectorEditRef.current?.({
        kind: 'apply-token',
        selector,
        property,
        tokenName,
      })
    },
    [],
  )

  const handleInspectorVisibilityToggle = useCallback(
    (selector: string, bp: InspectorBp, hide: boolean) => {
      if (hide) {
        onInspectorEditRef.current?.({
          kind: 'tweak',
          tweak: { selector, bp, property: 'display', value: 'none' },
        })
      } else {
        onInspectorEditRef.current?.({
          kind: 'remove-decl',
          selector,
          bp,
          property: 'display',
        })
      }
    },
    [],
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <div className="flex justify-end gap-2 border-b border-[hsl(var(--border-default))] px-4 py-2">
        <Button
          data-testid="variants-drawer-trigger"
          variant="outline"
          size="sm"
          onClick={() => setVariantsDrawerOpen(true)}
        >
          + Variant ({Object.keys(watchedVariants ?? {}).length})
        </Button>
      </div>
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
        appliedTweaks={appliedTweaks}
        onBpChange={handleBpChange}
        onTweak={handleTweak}
        onReset={handleReset}
        onClose={handleClose}
      />
      <Inspector
        slug={currentSlug}
        activeBp={inspectorBp}
        onActiveBpChange={setInspectorBp}
        blockHtml={inspectorBlockSource.html}
        effectiveCss={inspectorBlockSource.css}
        tweaks={inspectorTweaks}
        onCellEdit={onInspectorEdit ? handleInspectorCellEdit : undefined}
        onApplyToken={onInspectorEdit ? handleInspectorApplyToken : undefined}
        onVisibilityToggle={onInspectorEdit ? handleInspectorVisibilityToggle : undefined}
      />
      <VariantsDrawer
        open={variantsDrawerOpen}
        onOpenChange={setVariantsDrawerOpen}
        variants={watchedVariants ?? {}}
        baseHtml={baseHtmlForFork ?? ''}
        baseCss={baseCssForFork ?? ''}
        onAction={handleVariantAction}
      />
    </div>
  )
}
