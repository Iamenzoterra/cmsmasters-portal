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
  <script>
    // WP-028 Phase 2 — element-click selection for TweakPanel (Ruling E: strictly additive).
    // Delegates clicks on document.body; derives a stable selector (Ruling H: id > stable
    // class > nth-of-type, max depth 5); emits 'block-forge:element-click' postMessage with
    // selector, rect, and computedStyle seeds for the parent TweakPanel to consume.
    (function () {
      const CLICKABLE_TAGS = ['DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','NAV','MAIN',
                              'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','UL','OL','LI','IMG'];
      const UTILITY_PREFIXES = ['hover:','focus:','active:','animate-','group-','peer-'];

      function stableClass(el) {
        if (!el.className || typeof el.className !== 'string') return null;
        const classes = el.className.split(/\s+/).filter(Boolean);
        return classes.find((c) => !UTILITY_PREFIXES.some((p) => c.startsWith(p))) || null;
      }

      function deriveSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + CSS.escape(el.id);

        const path = [];
        let cur = el;
        let depth = 0;
        while (cur && cur !== document.body && depth < 5) {
          if (cur.id) { path.unshift('#' + CSS.escape(cur.id)); break; }
          const cls = stableClass(cur);
          if (cls) {
            path.unshift(cur.tagName.toLowerCase() + '.' + CSS.escape(cls));
          } else {
            const parent = cur.parentElement;
            const siblings = parent ? Array.from(parent.children).filter((c) => c.tagName === cur.tagName) : [];
            const idx = siblings.indexOf(cur) + 1;
            path.unshift(cur.tagName.toLowerCase() + ':nth-of-type(' + idx + ')');
          }
          cur = cur.parentElement;
          depth += 1;
        }
        return path.join(' > ');
      }

      document.body.addEventListener('click', (e) => {
        const el = e.target;
        if (!el || !CLICKABLE_TAGS.includes(el.tagName)) return;
        e.preventDefault(); e.stopPropagation();

        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        parent.postMessage({
          type: 'block-forge:element-click',
          slug: ${JSON.stringify(slug)},
          selector: deriveSelector(el),
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          computedStyle: {
            padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
            paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
            fontSize: cs.fontSize, gap: cs.gap, display: cs.display,
          },
        }, '*');
      }, true);
    })();
  </script>
</body>
</html>`
}
