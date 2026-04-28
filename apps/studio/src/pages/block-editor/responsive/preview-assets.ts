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
import tokensResponsiveOptOutCSS from '../../../../../../packages/ui/src/theme/tokens.responsive.opt-out.css?raw'
import portalBlocksCSS from '../../../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../../../packages/ui/src/portal/animate-utils.js?raw'

// Inline const — NOT exported (mirrors tools/block-forge/src/lib/preview-assets.ts:19
// which is `const` not `export const`). Any change here breaks the cross-surface
// PARITY contract with block-forge.
//
// Per-BP fluid opt-out bypass (`.slot-inner:has(...)`) is duplicated from
// tokens.responsive.opt-out.css for the same reason as block-forge's preview-assets.ts:
// the iframe wraps the opt-out import in `@layer tokens` which loses to `@layer shared`
// regardless of selector specificity. See block-forge's preview-assets.ts header for
// the full rationale.
const SLOT_CONTAINMENT_RULE = `.slot-inner {
  container-type: inline-size;
  container-name: slot;
}
@media (min-width: 768px) and (max-width: 1279.98px) {
  .slot-inner:has([data-fluid-tablet="off"]) { container: normal; }
}
@media (max-width: 767.98px) {
  .slot-inner:has([data-fluid-mobile="off"]) { container: normal; }
}`

// WP-033 Phase 4 — Inspector outline CSS (mirrored from
// tools/block-forge/src/lib/preview-assets.ts:55-66 byte-identical).
// `[data-bf-hover]` and `[data-bf-pin]` attributes are toggled by the Inspector
// IIFE below; CSS draws the visual indicator (blue for hover, green for pin).
// WP-036 Phase 1 — `data-bf-hover-from-suggestion` mirror of
// tools/block-forge/src/lib/preview-assets.ts byte-identical. SEPARATE attribute
// from `data-bf-hover` to avoid race with the iframe's native mouseover handler.
// PARITY trio: any change here MUST update the block-forge reference and the
// surface PARITY.md in the same commit.
const INSPECTOR_OUTLINE_RULE = `[data-bf-hover] {
  outline-style: solid;
  outline-width: 2px;
  outline-color: hsl(var(--text-link));
  outline-offset: -2px;
}
[data-bf-hover-from-suggestion] {
  outline-style: solid;
  outline-width: 2px;
  outline-color: hsl(var(--text-link));
  outline-offset: -2px;
}
[data-bf-pin] {
  outline-style: solid;
  outline-width: 2px;
  outline-color: hsl(var(--status-success-fg));
  outline-offset: -2px;
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
      ${tokensResponsiveOptOutCSS}
    }
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { overflow: visible; }
      body {
        font-family: 'Manrope', system-ui, sans-serif;
        width: ${width}px;
        overflow-x: visible;
        overflow-y: hidden;
        background: white;
      }
    }
    @layer shared {
      ${portalBlocksCSS}
      ${SLOT_CONTAINMENT_RULE}
      ${INSPECTOR_OUTLINE_RULE}
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
    // ResizeObserver: report height + contentWidth so the parent panel can
    // grow the iframe element when block content overflows the simulated BP
    // width. Body keeps the BP width for layout; overflow-x:visible lets
    // content spill; parent sizes the iframe to fit so overflow is rendered
    // instead of clipped. The width literal in the payload remains the BP
    // (filter key for the parent listener); contentWidth is the new field.
    const ro = new ResizeObserver(() => {
      const h = Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight));
      const cw = Math.ceil(Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, ${width}));
      parent.postMessage({ type: 'block-forge:iframe-height', slug: ${JSON.stringify(slug)}, width: ${width}, height: h, contentWidth: cw }, '*');
    });
    ro.observe(document.body);
    ro.observe(document.documentElement);
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
        // NOTE: this script lives inside a template literal — \s must be double-
        // escaped so the emitted source keeps the regex meaning. (Caught by
        // WP-028 Phase 2 live smoke: /s+/ truncated class names at "s" chars.)
        const classes = el.className.split(/\\s+/).filter(Boolean);
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
  <script>
    // WP-033 Phase 4 — Inspector hover + request-pin protocol (Studio mirror of
    // tools/block-forge/src/lib/preview-assets.ts:200-358 byte-identical).
    // ADDITIVE: the click handler above is untouched (TweakPanel still receives
    // 'block-forge:element-click'). Inspector listens to that same message for
    // click-to-pin and replies via 'block-forge:inspector-request-pin'.
    (function () {
      const CLICKABLE_TAGS = ['DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','NAV','MAIN',
                              'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','UL','OL','LI','IMG'];
      const UTILITY_PREFIXES = ['hover:','focus:','active:','animate-','group-','peer-'];
      const SLUG = ${JSON.stringify(slug)};

      function stableClass(el) {
        if (!el.className || typeof el.className !== 'string') return null;
        const classes = el.className.split(/\\s+/).filter(Boolean);
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

      function snapshotComputed(el) {
        const cs = getComputedStyle(el);
        return {
          padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
          margin: cs.margin, marginTop: cs.marginTop, marginRight: cs.marginRight,
          marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
          fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing, textAlign: cs.textAlign,
          color: cs.color, backgroundColor: cs.backgroundColor,
          gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
          display: cs.display, flexDirection: cs.flexDirection,
          alignItems: cs.alignItems, justifyContent: cs.justifyContent,
          gridTemplateColumns: cs.gridTemplateColumns,
          width: cs.width, height: cs.height,
          borderRadius: cs.borderRadius,
        };
      }

      let hoveredEl = null;
      let rafId = null;

      function clearHover() {
        if (hoveredEl) {
          hoveredEl.removeAttribute('data-bf-hover');
          hoveredEl = null;
        }
      }

      function applyHover(el) {
        if (el === hoveredEl) return;
        clearHover();
        if (!el || !CLICKABLE_TAGS.includes(el.tagName)) {
          parent.postMessage({ type: 'block-forge:inspector-unhover', slug: SLUG }, '*');
          return;
        }
        el.setAttribute('data-bf-hover', '');
        hoveredEl = el;
        const rect = el.getBoundingClientRect();
        parent.postMessage({
          type: 'block-forge:inspector-hover',
          slug: SLUG,
          selector: deriveSelector(el),
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        }, '*');
      }

      document.body.addEventListener('mouseover', (e) => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = null;
          applyHover(e.target);
        });
      }, true);

      document.body.addEventListener('mouseleave', () => {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        clearHover();
        parent.postMessage({ type: 'block-forge:inspector-unhover', slug: SLUG }, '*');
      });

      // WP-036 Phase 1 — sidebar to iframe hover-highlight protocol (Studio mirror of
      // tools/block-forge/src/lib/preview-assets.ts). Parent posts
      // 'block-forge:inspector-request-hover' with {slug, selector}. Resolves via
      // document.querySelector, sets data-bf-hover-from-suggestion="". selector
      // === '__clear__' or null clears all. Try/catch silences invalid-selector
      // exceptions. No postback — fire-and-forget for transient hover.
      window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg || typeof msg !== 'object' || msg.type !== 'block-forge:inspector-request-hover') return;
        if (msg.slug !== SLUG) return;

        document.querySelectorAll('[data-bf-hover-from-suggestion]')
          .forEach((el) => el.removeAttribute('data-bf-hover-from-suggestion'));

        if (!msg.selector || msg.selector === '__clear__') return;

        let target = null;
        try { target = document.querySelector(msg.selector); } catch (_err) { /* invalid selector */ }
        if (!target) return;
        target.setAttribute('data-bf-hover-from-suggestion', '');
      });

      window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg || typeof msg !== 'object' || msg.type !== 'block-forge:inspector-request-pin') return;
        if (msg.slug !== SLUG) return;

        const prev = document.querySelector('[data-bf-pin]');
        if (prev) prev.removeAttribute('data-bf-pin');

        if (msg.selector === '__clear__' || !msg.selector) {
          parent.postMessage({
            type: 'block-forge:inspector-pin-applied',
            slug: SLUG,
            selector: null,
          }, '*');
          return;
        }

        let target = null;
        try { target = document.querySelector(msg.selector); } catch (_err) { /* invalid selector */ }

        if (!target) {
          parent.postMessage({
            type: 'block-forge:inspector-pin-applied',
            slug: SLUG,
            selector: null,
            requestedSelector: msg.selector,
            error: 'no-match',
          }, '*');
          return;
        }

        target.setAttribute('data-bf-pin', '');
        const rect = target.getBoundingClientRect();
        parent.postMessage({
          type: 'block-forge:inspector-pin-applied',
          slug: SLUG,
          selector: msg.selector,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          computedStyle: snapshotComputed(target),
        }, '*');
      });

      window.addEventListener('beforeunload', () => {
        if (rafId) cancelAnimationFrame(rafId);
        clearHover();
        const pinned = document.querySelector('[data-bf-pin]');
        if (pinned) pinned.removeAttribute('data-bf-pin');
        // WP-036 Phase 1 — clear external-hover attr on iframe teardown.
        document.querySelectorAll('[data-bf-hover-from-suggestion]')
          .forEach((el) => el.removeAttribute('data-bf-hover-from-suggestion'));
      });
    })();
  </script>
</body>
</html>`
}
