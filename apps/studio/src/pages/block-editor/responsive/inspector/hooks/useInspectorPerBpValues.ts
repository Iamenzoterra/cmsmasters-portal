// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/hooks/useInspectorPerBpValues.ts
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Per-BP value sourcing via 3 hidden browser iframes. Three off-screen iframes
// per pin event, each at the canonical width (375 / 768 / 1440); inject
// composeSrcDoc with the same effectiveCss; on load, querySelector(pinned.selector);
// harvest snapshotComputed; relay to React state. Cache by (selector, effectiveCssHash).
//
// Module-scoped cache survives re-mounts. Cleanup on unmount disposes any
// in-flight iframes; cache lookup short-circuits redundant work.
//
// Studio-specific: imports `composeSrcDoc` from `../../preview-assets` (Studio-local;
// has same Path B contract as block-forge). Uses Studio's renderForPreview wrap so
// probe DOM matches the visible iframe (Phase 3 Issue #1 fix).

import { useEffect, useState, useRef } from 'react'
import { renderForPreview } from '@cmsmasters/block-forge-core'
import type { ComputedSnapshot, InspectorBp, PinState } from '../Inspector'
import { composeSrcDoc } from '../../preview-assets'

export type ValuesByBp = Record<InspectorBp, ComputedSnapshot | null>

const cache = new Map<string, ValuesByBp>()

const PROBE_BPS: readonly InspectorBp[] = [375, 768, 1440] as const
const PROBE_TITLE_PREFIX = 'inspector-probe-'

function emptyMap(): ValuesByBp {
  return { 375: null, 768: null, 1440: null }
}

function hashCss(css: string): string {
  let h = 5381
  for (let i = 0; i < css.length; i++) h = (h * 33) ^ css.charCodeAt(i)
  return String(h >>> 0)
}

function harvestSnapshot(cs: CSSStyleDeclaration): ComputedSnapshot {
  return {
    marginTop: cs.marginTop,
    marginRight: cs.marginRight,
    marginBottom: cs.marginBottom,
    marginLeft: cs.marginLeft,
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
    gap: cs.gap,
    rowGap: cs.rowGap,
    columnGap: cs.columnGap,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
    fontWeight: cs.fontWeight,
    letterSpacing: cs.letterSpacing,
    textAlign: cs.textAlign,
    display: cs.display,
    flexDirection: cs.flexDirection,
    alignItems: cs.alignItems,
    justifyContent: cs.justifyContent,
    gridTemplateColumns: cs.gridTemplateColumns,
  }
}

export function useInspectorPerBpValues(args: {
  pinned: PinState | null
  blockHtml: string
  effectiveCss: string
  slug: string | null
}): ValuesByBp {
  const { pinned, blockHtml, effectiveCss, slug } = args
  const [valuesByBp, setValuesByBp] = useState<ValuesByBp>(() => emptyMap())
  const inFlightIframesRef = useRef<HTMLIFrameElement[]>([])

  useEffect(() => {
    if (!pinned?.selector || !blockHtml) {
      setValuesByBp(emptyMap())
      return
    }

    const cacheKey = `${pinned.selector}::${hashCss(effectiveCss)}::${slug ?? ''}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setValuesByBp(cached)
      return
    }

    // Wrap html with `<div data-block-shell="{slug}">…</div>` to match the
    // visible PreviewTriptych iframe DOM (Phase 1 selector capture path).
    // Without this wrap, captured selectors with `:nth-of-type` fail because
    // composeSrcDoc only adds the outer `.slot-inner`.
    const probeRendered = renderForPreview(
      { slug: slug ?? 'inspector-probe', html: blockHtml, css: effectiveCss },
      { variants: [] },
    )

    const result: ValuesByBp = emptyMap()
    let pending = PROBE_BPS.length
    let disposed = false
    const iframes: HTMLIFrameElement[] = []

    PROBE_BPS.forEach((bp) => {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.position = 'absolute'
      iframe.style.left = '-99999px'
      iframe.style.top = '-99999px'
      iframe.style.width = `${bp}px`
      iframe.style.height = '600px'
      iframe.title = `${PROBE_TITLE_PREFIX}${bp}`
      iframe.srcdoc = composeSrcDoc({
        html: probeRendered.html,
        css: probeRendered.css,
        width: bp,
        slug: `${PROBE_TITLE_PREFIX}${bp}`,
      })

      iframe.addEventListener('load', () => {
        if (disposed) return
        try {
          const doc = iframe.contentDocument
          const view = iframe.contentWindow
          const target = doc?.querySelector(pinned.selector) ?? null
          if (target && doc && view) {
            const cs = view.getComputedStyle(target)
            result[bp] = harvestSnapshot(cs)
          }
        } catch {
          result[bp] = null
        }
        pending -= 1
        if (pending === 0 && !disposed) {
          cache.set(cacheKey, result)
          setValuesByBp(result)
          iframes.forEach((f) => {
            if (f.parentNode) f.parentNode.removeChild(f)
          })
        }
      })

      document.body.appendChild(iframe)
      iframes.push(iframe)
    })

    inFlightIframesRef.current = iframes
    return () => {
      disposed = true
      iframes.forEach((f) => {
        if (f.parentNode) f.parentNode.removeChild(f)
      })
      inFlightIframesRef.current = []
    }
  }, [pinned?.selector, effectiveCss, blockHtml, slug])

  return valuesByBp
}

/** Test-only: clear cache between vitest cases. */
export function __resetInspectorPerBpCache(): void {
  cache.clear()
}
