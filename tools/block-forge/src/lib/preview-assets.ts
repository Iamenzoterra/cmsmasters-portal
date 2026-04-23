// Phase 2 — iframe srcdoc composition. Deterministic, unit-tested.
//
// Contract lives in `tools/block-forge/PARITY.md` — any change to @layer order,
// slot wrapper, injected assets, or postMessage shape MUST update that file in
// the same commit (seed-discipline mirrors LM's PARITY-LOG).
//
// All 4 `?raw` paths verified in Phase 0 §0.5 and hotfix-result.md carry-over (d).
// Do NOT change the 4x `../` depth without re-verifying against repo root.

import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
import tokensResponsiveCSS from '../../../../packages/ui/src/theme/tokens.responsive.css?raw'
import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../packages/ui/src/portal/animate-utils.js?raw'

// Slot containment rule — emitted into @layer shared so `@container slot (max-width: Npx)`
// queries in the block CSS evaluate inside the preview iframe. Matches portal's theme-page
// hierarchy where `[data-slot] > .slot-inner` gets this contract (see
// `tools/layout-maker/runtime/lib/css-generator.ts:254-255`).
const SLOT_CONTAINMENT_RULE = `.slot-inner {
  container-type: inline-size;
  container-name: slot;
}`

export type ComposeSrcDocInput = {
  html: string
  css: string
  js?: string
  width: number
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
  <div class="slot-inner">
    <div data-block-shell="${slug}">${html}</div>
  </div>
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
