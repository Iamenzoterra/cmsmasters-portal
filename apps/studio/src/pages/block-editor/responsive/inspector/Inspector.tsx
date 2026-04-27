// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/Inspector.tsx
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Inspector orchestrator — owns hover + pin state, listens to 4 postMessage
// types from the preview iframe; dispatches `block-forge:inspector-request-pin`
// back to apply the data-bf-pin attribute. The iframe-side runtime (preview-assets.ts
// IIFE) renders the outline; Inspector NEVER touches DOM directly.
//
// Coexists with TweakPanel: both surfaces listen to `block-forge:element-click`
// for selection. Phase 4 Ruling 1 — no mutual exclusion.
//
// 4 listeners (Phase 1 contract):
//   1. block-forge:inspector-hover    → setHovered
//   2. block-forge:inspector-unhover  → setHovered(null)
//   3. block-forge:element-click      → request pin (click-to-pin gesture)
//   4. block-forge:inspector-pin-applied → setPinned (or null on __clear__)
//
// Slug filter: every message gated on `msg.slug === slug`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tweak } from '@cmsmasters/block-forge-core'
import { InspectorPanel } from './InspectorPanel'
import { useInspectorPerBpValues } from './hooks/useInspectorPerBpValues'

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
  /** Phase 3 — emit a tweak from active cell. Studio: dispatchInspectorEdit. */
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
  /** Phase 3 — apply fluid token (bp:0 emit). Studio: dispatchInspectorEdit. */
  onApplyToken?: (selector: string, property: string, tokenName: string) => void
  /** Phase 3 — visibility toggle. Studio: dispatchInspectorEdit / removeDeclarationFromCss. */
  onVisibilityToggle?: (selector: string, bp: InspectorBp, hide: boolean) => void
  /**
   * Phase 3 — tweaks slice. Studio: parseTweaksFromCode(form.code) → Tweak[].
   * Used to derive `isHiddenAtActiveBp` (visibility checkbox state).
   */
  tweaks?: ReadonlyArray<Tweak>
  /** Phase 3 — base+composed CSS used by useChipDetection + useInspectorPerBpValues. */
  effectiveCss?: string
  /** Phase 3 — block HTML threaded through to useInspectorPerBpValues. */
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
  tweaks,
  effectiveCss,
  blockHtml,
}: Props) {
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const [pinned, setPinned] = useState<PinState | null>(null)

  const valuesByBp = useInspectorPerBpValues({
    pinned,
    blockHtml: blockHtml ?? '',
    effectiveCss: effectiveCss ?? '',
    slug,
  })

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

  const requestPinRef = useRef(requestPin)
  useEffect(() => {
    requestPinRef.current = requestPin
  }, [requestPin])

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
          }
        | undefined
      if (!d || typeof d !== 'object' || d.slug !== slug || !d.type) return

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

  useEffect(() => {
    setPinned(null)
    setHovered(null)
  }, [slug])

  useEffect(() => {
    if (!pinned) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestPinRef.current(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

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

  const handleVisibilityToggle = useCallback(
    (bp: InspectorBp, hide: boolean) => {
      if (!pinned?.selector || !onVisibilityToggle) return
      onVisibilityToggle(pinned.selector, bp, hide)
    },
    [pinned?.selector, onVisibilityToggle],
  )

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
    />
  )
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s)
  }
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
}
