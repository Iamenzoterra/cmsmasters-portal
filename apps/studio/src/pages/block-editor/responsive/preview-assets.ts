// WP-027 Phase 2 — iframe srcdoc composition for Studio Responsive tab.
//
// PARITY §7 deliberate divergence vs. tools/block-forge/src/lib/preview-assets.ts:
// Studio's composeSrcDoc wraps body with ONLY `<div class="slot-inner">${html}</div>`
// — no inner `<div data-block-shell="${slug}">` wrap. The shell comes pre-wrapped
// upstream via `renderForPreview` (packages/block-forge-core/src/lib/css-scoping.ts
// → wrapBlockHtml), because Studio uses Path B for variant composition.
//
// Every other detail (layer order, tokens injection, body reset, portal-blocks +
// slot containment rule, block CSS, Google Fonts preconnect + link, animate-utils
// script, optional js blob, ResizeObserver postMessage with "block-forge:iframe-height"
// literal) is byte-identical to the block-forge reference. Any change here MUST
// update apps/studio/src/pages/block-editor/responsive/PARITY.md in the same commit.
//
// ?raw path depth: 6 `..` from this file (source depth); 7 `..` from __tests__/
// (verified Phase 0 §0.6 carry-over (f)).

import tokensCSS from '../../../../../../packages/ui/src/theme/tokens.css?raw'
import tokensResponsiveCSS from '../../../../../../packages/ui/src/theme/tokens.responsive.css?raw'
import portalBlocksCSS from '../../../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../../../packages/ui/src/portal/animate-utils.js?raw'

// Inline const — NOT exported (mirrors tools/block-forge/src/lib/preview-assets.ts:19
// which is `const` not `export const`). Any change here breaks the cross-surface
// PARITY contract with block-forge.
const SLOT_CONTAINMENT_RULE = `.slot-inner {
  container-type: inline-size;
  container-name: slot;
}`

export type ComposeSrcDocInput = {
  /** Pre-wrapped html from renderForPreview — contains `<div data-block-shell="{slug}">...</div>` */
  html: string
  /** Pre-stripped css from renderForPreview (stripGlobalPageRules already applied) */
  css: string
  /** Optional per-block JS blob appended after animate-utils */
  js?: string
  /** Breakpoint width in px: 1440 | 768 | 375 */
  width: number
  /** Block slug — used for postMessage filter payload, NOT for DOM wrapping */
  slug: string
}

export function composeSrcDoc(input: ComposeSrcDocInput): string {
  const { html, css, js, width, slug } = input
  const jsBlock = js ? `<script type="module">${js}</script>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${width}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @layer tokens, reset, shared, block;
    @layer tokens {
      ${tokensCSS}
      ${tokensResponsiveCSS}
    }
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Manrope', system-ui, sans-serif;
        width: ${width}px;
        overflow: hidden;
        background: white;
      }
    }
    @layer shared {
      ${portalBlocksCSS}
      ${SLOT_CONTAINMENT_RULE}
    }
    @layer block {
      ${css}
    }
  </style>
</head>
<body>
  <div class="slot-inner">${html}</div>
  <script type="module">${animateUtilsJS}</script>
  ${jsBlock}
  <script>
    // ResizeObserver → postMessage parent for iframe height sync
    const ro = new ResizeObserver((entries) => {
      const h = Math.ceil(entries[0].contentRect.height);
      parent.postMessage({ type: 'block-forge:iframe-height', slug: ${JSON.stringify(slug)}, width: ${width}, height: h }, '*');
    });
    ro.observe(document.body);
  </script>
</body>
</html>`
}
