// WP-033 Phase 1 — Inspector orchestrator.
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
// 4 listeners (Phase 1 contract):
//   1. block-forge:inspector-hover    → setHovered
//   2. block-forge:inspector-unhover  → setHovered(null)
//   3. block-forge:element-click      → request pin (click-to-pin gesture)
//   4. block-forge:inspector-pin-applied → setPinned (or null on __clear__)
//
// Slug filter: every message is gated on `msg.slug === slug` so a stale
// iframe (mid-tab-switch) can't pollute the active inspection.
//
// Programmatic re-pin: when activeBp changes, PreviewTriptych re-renders a
// new iframe instance — its IIFE has no data-bf-pin set, so Inspector
// re-sends the pin request to restore the outline. Same trigger covers
// block-switch (slug change clears pinned state instead).

import { useCallback, useEffect, useRef, useState } from 'react'
import { InspectorPanel } from './InspectorPanel'

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
}

const PIN_CLEAR_SENTINEL = '__clear__'

export function Inspector({ slug, activeBp, onActiveBpChange }: Props) {
  const [hovered, setHovered] = useState<HoverState | null>(null)
  const [pinned, setPinned] = useState<PinState | null>(null)

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

  // Slug change clears pin (the old element selector likely no longer exists
  // in the new block's DOM and is meaningless across blocks anyway).
  useEffect(() => {
    setPinned(null)
    setHovered(null)
  }, [slug])

  // Escape unpins. Listener is parent-window-scoped — iframe sandbox prevents
  // keydowns from bubbling, so this won't conflict with the existing fullscreen
  // Escape handler in PreviewTriptych (different concern, both can coexist).
  useEffect(() => {
    if (!pinned) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestPinRef.current(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  // Re-pin on BP-change: PreviewTriptych destroys + recreates the iframe when
  // tabs switch, so the new iframe instance has no data-bf-pin set. We
  // re-issue the request to restore the outline. Skipped on first mount
  // (pinned is null then anyway) and skipped when there's no current pin.
  const lastSentBpRef = useRef<InspectorBp>(activeBp)
  useEffect(() => {
    if (lastSentBpRef.current === activeBp) return
    lastSentBpRef.current = activeBp
    if (pinned?.selector) {
      // Defer one frame so the new iframe's IIFE has registered its message
      // listener before we post. (Without the defer, the post arrives before
      // the listener exists and is silently dropped.)
      const id = window.setTimeout(() => {
        requestPinRef.current(pinned.selector)
      }, 60)
      return () => window.clearTimeout(id)
    }
  }, [activeBp, pinned?.selector])

  return (
    <InspectorPanel
      slug={slug}
      hovered={hovered}
      pinned={pinned}
      activeBp={activeBp}
      onActiveBpChange={onActiveBpChange}
      onClearPin={() => requestPinRef.current(null)}
    />
  )
}

// Minimal CSS.escape for query-selector embedding. Standard CSS.escape exists
// in modern browsers; this fallback covers the same shape for the slug names
// we care about (kebab-case, ASCII).
function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s)
  }
  return String(s).replace(/[^a-zA-Z0-9_-]/g, (c) => '\\' + c)
}
