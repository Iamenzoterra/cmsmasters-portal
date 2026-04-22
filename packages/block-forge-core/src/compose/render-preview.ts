import type { BlockOutput, PreviewResult, Variant } from '../lib/types'
import { stripGlobalPageRules, wrapBlockHtml } from '../lib/css-scoping'
import { composeVariants } from './compose-variants'

export interface RenderForPreviewOptions {
  /** Viewport hint in px — wraps output in `<div style="max-width:{width}px;margin:0 auto">`. */
  width?: number
  /** Overlay variants merged into `block` before rendering (calls composeVariants). */
  variants?: readonly Variant[]
}

/**
 * Deterministic `{html, css}` pair for iframe preview.
 *
 * HTML shape mirrors portal `renderBlock()` non-variant output exactly:
 *   `<div data-block-shell="{slug}">{html}</div>`
 * (see `apps/portal/lib/hooks.ts:211` — portal uses `data-block-shell` attribute,
 * not a `.block-{slug}` class. Task spec description differed from actual portal;
 * this implementation follows the code.)
 *
 * CSS is cleaned with `stripGlobalPageRules` (portal parity). Prefix-scoping via
 * `scopeBlockCss` is available as a lib helper but deliberately NOT applied here
 * — portal relies on block authoring convention, and preview inherits the same
 * contract. An iframe host provides the additional isolation.
 *
 * When `opts.variants` is provided, the block is composed via `composeVariants`
 * before rendering; the resulting multi-variant HTML+CSS is then wrapped.
 *
 * When `opts.width` is provided, output HTML is wrapped in a sized container
 * with `max-width:{width}px; margin:0 auto` for consistent iframe measurement.
 */
export function renderForPreview(
  block: BlockOutput,
  opts?: RenderForPreviewOptions,
): PreviewResult {
  let innerHtml = block.html
  let innerCss = block.css

  if (opts?.variants && opts.variants.length > 0) {
    const composed = composeVariants(block, opts.variants)
    innerHtml = composed.html
    innerCss = composed.css
  }

  let html = wrapBlockHtml(innerHtml, block.slug)
  if (opts?.width !== undefined) {
    html = `<div style="max-width: ${opts.width}px; margin: 0 auto;">${html}</div>`
  }

  const css = stripGlobalPageRules(innerCss)

  return { html, css }
}
