// WP-033 Phase 1 — Inspector orchestrator.
// WP-033 Phase 3 — owns useInspectorPerBpValues hook (Option A: hook lifecycle
// at this level keeps InspectorPanel pure-presentational). Forwards new
// callbacks (onCellEdit, onApplyToken, onVisibilityToggle) + isHiddenAtActiveBp.
//
// Owns hover + pin state. Listens to 4 postMessage types from the preview
// iframe; dispatches `block-forge:inspector-request-pin` back to apply the
// data-bf-pin attribute. The iframe-side runtime (preview-assets.ts IIFE)
// renders the outline; Inspector NEVER touches DOM directly — it only
// requests state changes via postMessage and reads back via reply messages.
//
// Coexists with TweakPanel: both surfaces listen to `block-forge:element-click`
// for selection. This file does NOT preventDefault — the element-click handler
// inside the iframe IIFE already does that.
//
// 4 listeners (Phase 1 contract — UNCHANGED Phase 3):
//   1. block-forge:inspector-hover    → setHovered
//   2. block-forge:inspector-unhover  → setHovered(null)
//   3. block-forge:element-click      → request pin (click-to-pin gesture)
//   4. block-forge:inspector-pin-applied → setPinned (or null on __clear__)
//
// Slug filter: every message is gated on `msg.slug === slug` so a stale
// iframe (mid-tab-switch) can't pollute the active inspection.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tweak } from '@cmsmasters/block-forge-core'
import { InspectorPanel } from './InspectorPanel'
import { useInspectorPerBpValues } from '../hooks/useInspectorPerBpValues'

type Rect = { x: number; y: number; w: number; h: number }

export type ComputedSnapshot = Record<string, string>

export type HoverState = {
  selector: string
  rect: Rect
}

export type PinState = {
  selector: string
  rect: Rect
  computedStyle: ComputedSnapshot
}

export type InspectorBp = 1440 | 768 | 375

type Props = {
  slug: string | null
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
  /** Phase 3 — emit a tweak from active cell. App.tsx → addTweak. */
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  /** Phase 3 — apply fluid token (bp:0 emit). App.tsx → addTweak with var(--token). */
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  /** Phase 3 — visibility toggle. App.tsx → addTweak / removeTweakFor for `display`. */
  onVisibilityToggle?: (selector: string, bp: InspectorBp, hide: boolean) => void
  /** Revert handler — App.tsx dispatches removeTweakFor(selector, bp, property). */
  onCellRevert?: (selector: string, bp: InspectorBp, property: string) => void
  /**
   * Phase C — bake `transform: scale` into per-child tweaks. Inspector posts
   * bake-scale-request to iframe; iframe responds with tweaks array; this
   * callback applies them via App's session reducer (and clears the parent's
   * transform tweaks).
   */
  onBakeScale?: (
    parentSelector: string,
    bp: InspectorBp,
    tweaks: ReadonlyArray<{ selector: string; property: string; value: string }>,
  ) => void
  /**
   * Phase 3 — session.tweaks slice. Used to derive `isHiddenAtActiveBp`
   * (checkbox state) inline at this level since pin selector lives here.
   * App.tsx is the session owner; passing the readonly slice is the lowest
   * coupling option.
   */
  tweaks?: ReadonlyArray<Tweak>
  /** Phase 3 — base+composed CSS used by useChipDetection + useInspectorPerBpValues. */
  effectiveCss?: string
  /** Phase 3 — block HTML threaded through to useInspectorPerBpValues for hidden-iframe srcdoc. */
  blockHtml?: string
}

const PIN_CLEAR_SENTINEL = '__clear__'

export function Inspector({
  slug,
  activeBp,
  onActiveBpChange,
  onCellEdit,
  onApplyToken,
  onVisibilityToggle,
  onCellRevert,
  onBakeScale,
  tweaks,
  effectiveCss,
  blockHtml,
}: Props) {
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const [pinned, setPinned] = useState<PinState | null>(null)

  // Phase 3 §3.2 — hidden-iframe per-BP value sourcing.
  const valuesByBp = useInspectorPerBpValues({
    pinned,
    blockHtml: blockHtml ?? '',
    effectiveCss: effectiveCss ?? '',
    slug,
  })

  // Send a request-pin message to the active iframe. Selector === null sends
  // the __clear__ sentinel (cross-iframe-safe; null serializes oddly through
  // postMessage in some realms, the explicit string is unambiguous).
  const requestPin = useCallback(
    (selector: string | null) => {
      if (!slug) return
      const iframe = document.querySelector(
        `iframe[title^="${cssEscape(slug)}-"]`,
      ) as HTMLIFrameElement | null
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        {
          type: 'block-forge:inspector-request-pin',
          slug,
          selector: selector ?? PIN_CLEAR_SENTINEL,
        },
        '*',
      )
    },
    [slug],
  )

  // Ref-thru so the message listener (registered once per slug) sees the
  // latest requestPin closure without re-subscribing on every render.
  const requestPinRef = useRef(requestPin)
  useEffect(() => {
    requestPinRef.current = requestPin
  }, [requestPin])

  // Refs for bake-scale-result handler (registered in onMessage at slug-mount;
  // needs latest pinned selector + activeBp without re-subscribing).
  const pinnedRef = useRef<PinState | null>(null)
  const activeBpRef = useRef<InspectorBp>(activeBp)
  useEffect(() => {
    pinnedRef.current = pinned
  }, [pinned])
  useEffect(() => {
    activeBpRef.current = activeBp
  }, [activeBp])

  // Phase C — send bake-scale-request to active iframe.
  const requestBakeScale = useCallback(
    (parentSelector: string, scaleFactor: number) => {
      if (!slug) return
      const iframe = document.querySelector(
        `iframe[title^="${cssEscape(slug)}-"]`,
      ) as HTMLIFrameElement | null
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        {
          type: 'block-forge:inspector-bake-scale-request',
          slug,
          parentSelector,
          scaleFactor,
        },
        '*',
      )
    },
    [slug],
  )
  const requestBakeScaleRef = useRef(requestBakeScale)
  useEffect(() => {
    requestBakeScaleRef.current = requestBakeScale
  }, [requestBakeScale])

  useEffect(() => {
    if (!slug) {
      setHovered(null)
      setPinned(null)
      return
    }

    function onMessage(ev: MessageEvent) {
      const d = ev.data as
        | {
            type?: string
            slug?: string
            selector?: string | null
            rect?: Rect
            computedStyle?: ComputedSnapshot
            tweaks?: ReadonlyArray<{ selector: string; property: string; value: string }>
          }
        | undefined
      if (!d || typeof d !== 'object' || d.slug !== slug || !d.type) return

      if (d.type === 'block-forge:inspector-bake-scale-result') {
        if (Array.isArray(d.tweaks) && onBakeScale && pinnedRef.current?.selector) {
          onBakeScale(pinnedRef.current.selector, activeBpRef.current, d.tweaks)
        }
        return
      }

      if (d.type === 'block-forge:inspector-hover') {
        if (typeof d.selector === 'string' && d.rect) {
          setHovered({ selector: d.selector, rect: d.rect })
        }
        return
      }
      if (d.type === 'block-forge:inspector-unhover') {
        setHovered(null)
        return
      }
      if (d.type === 'block-forge:element-click') {
        if (typeof d.selector === 'string') {
          requestPinRef.current(d.selector)
        }
        return
      }
      if (d.type === 'block-forge:inspector-pin-applied') {
        if (d.selector == null) {
          setPinned(null)
        } else if (d.rect && d.computedStyle) {
          setPinned({
            selector: d.selector,
            rect: d.rect,
            computedStyle: d.computedStyle,
          })
        }
        return
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [slug])

  // Slug change clears pin (the old element selector likely no longer exists
  // in the new block's DOM and is meaningless across blocks anyway).
  useEffect(() => {
    setPinned(null)
    setHovered(null)
  }, [slug])

  // Escape unpins.
  useEffect(() => {
    if (!pinned) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestPinRef.current(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  // Re-pin on BP-change.
  const lastSentBpRef = useRef<InspectorBp>(activeBp)
  useEffect(() => {
    if (lastSentBpRef.current === activeBp) return
    lastSentBpRef.current = activeBp
    if (pinned?.selector) {
      const id = window.setTimeout(() => {
        requestPinRef.current(pinned.selector)
      }, 60)
      return () => window.clearTimeout(id)
    }
  }, [activeBp, pinned?.selector])

  // Re-pin on effectiveCss-change (proxy for "iframe re-mounted with new srcdoc"
  // — happens after every cell edit / token apply / visibility toggle). Without
  // this, pinned.computedStyle stays stale from the destroyed iframe and the
  // user sees pre-edit values. 120ms covers iframe re-mount + IIFE attach.
  const lastSentCssRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (lastSentCssRef.current === undefined) {
      lastSentCssRef.current = effectiveCss
      return
    }
    if (lastSentCssRef.current === effectiveCss) return
    lastSentCssRef.current = effectiveCss
    if (pinned?.selector) {
      const id = window.setTimeout(() => {
        requestPinRef.current(pinned.selector)
      }, 120)
      return () => window.clearTimeout(id)
    }
  }, [effectiveCss, pinned?.selector])

  // Phase 3 — bind selector to onVisibilityToggle so InspectorPanel doesn't
  // need to know the selector explicitly.
  const handleVisibilityToggle = useCallback(
    (bp: InspectorBp, hide: boolean) => {
      if (!pinned?.selector || !onVisibilityToggle) return
      onVisibilityToggle(pinned.selector, bp, hide)
    },
    [pinned?.selector, onVisibilityToggle],
  )

  // Phase 3 — derive isHiddenAtActiveBp from session.tweaks slice.
  const isHiddenAtActiveBp = useMemo(() => {
    if (!pinned?.selector || !tweaks) return false
    return tweaks.some(
      (t) =>
        t.selector === pinned.selector &&
        t.bp === activeBp &&
        t.property === 'display' &&
        t.value === 'none',
    )
  }, [pinned?.selector, activeBp, tweaks])

  return (
    <InspectorPanel
      slug={slug}
      hovered={hovered}
      pinned={pinned}
      activeBp={activeBp}
      onActiveBpChange={onActiveBpChange}
      onClearPin={() => requestPinRef.current(null)}
      valuesByBp={valuesByBp}
      onCellEdit={onCellEdit}
      onApplyToken={onApplyToken}
      onVisibilityToggle={onVisibilityToggle ? handleVisibilityToggle : undefined}
      isHiddenAtActiveBp={isHiddenAtActiveBp}
      effectiveCss={effectiveCss}
      tweaks={tweaks}
      onCellRevert={onCellRevert}
      onApplyScale={
        onBakeScale && pinned?.selector
          ? (scaleFactor: number) => requestBakeScaleRef.current(pinned.selector, scaleFactor)
          : undefined
      }
    />
  )
}

// Minimal CSS.escape for query-selector embedding.
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s)
  }
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
}
