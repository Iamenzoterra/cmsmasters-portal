---
domain: studio-blocks
description: "Block editor, import panel, CSS token scanner, token map — the processing pipeline."
source_of_truth: src/__arch__/domain-manifest.ts
status: full
---

## Start Here

1. `apps/studio/src/pages/block-editor.tsx` — 941-line editor with Process panel, preview iframe, import/export
2. `apps/studio/src/lib/block-processor.ts` — CSS scanner: finds hardcoded values, suggests token replacements
3. `apps/studio/src/lib/token-map.ts` — maps hex/px/font values to design token names

## Public API

(none — studio-blocks is consumed only within the Studio app via direct imports)

## Invariants

- **Processing is 100% client-side.** block-processor.ts scans CSS locally using regex-based parsing — no API calls for token analysis.
- **token-map defines the mapping tables.** `fontSizeTokens`, `lineHeightTokens`, `fontWeightTokens`, `spacingTokens`, `radiusTokens`, `shadowTokens`, `buttonColorTokens` + color converters (`hexToHsl`, `rgbToHsl`) + closest-match finders (`findClosestColorToken`, `findClosestSpacing`).
- **Suggestion confidence levels: `exact`, `close`, `approximate`.** Only `exact` matches are auto-applied. `close` and `approximate` require user review.
- **CSS scoping: every block gets `.block-{slug}` prefix.** This prevents style leaking between blocks on the portal.
- **block-import-panel preserves `<script>` tags** during HTML import. It strips `<html>`, `<head>`, `<body>` wrappers but keeps inline scripts.
- **Image tracking via `ImageRef` type.** block-processor detects images in HTML (`img-src`) and CSS (`css-url`), tracks their status (`new`, `existing`, `removed`) for R2 batch upload.

## Traps & Gotchas

- **"Token suggestions wrong after tokens.css update"** — token-map.ts has hardcoded token values (hex colors, px sizes). If tokens.css changes via /sync-tokens, token-map may become stale. Must update manually.
- **"Preview iframe blank"** — block-editor uses `srcdoc` for the preview iframe. CSP headers or browser extensions can block srcdoc. Also, tokens.css and portal-blocks.css are injected into the iframe via raw imports (`?raw` suffix in Vite).
- **"Import strips my scripts"** — block-import-panel DOES preserve `<script>` tags, but only from the `<body>`. Scripts in `<head>` are stripped with the wrapper.
- **`idCounter` in block-processor is module-level** — suggestion IDs increment across calls. `resetIdCounter()` exists for testing but is not called automatically between imports.
- **Suggestion `category` field** determines UI grouping: `color`, `typography`, `spacing`, `radius`, `shadow`, `component`. Component suggestions include `suggestedClass` (e.g., `.cms-btn`) and optional `warning`.

## Blast Radius

- **Changing block-processor.ts** — affects ALL block import/processing flows. Every CSS suggestion depends on this.
- **Changing token-map.ts** — affects token suggestion accuracy for ALL CSS properties
- **Changing block-editor.tsx** — affects block CRUD, import, export, Process panel preview, and all block editing UI
- **Changing block-import-panel.tsx** — affects HTML import with script preservation

## Recipes

```typescript
// Scan CSS for hardcoded values:
import { scanCSS } from '../lib/block-processor'
const suggestions = scanCSS(cssString, selectorContext)
// Returns Suggestion[] with token replacement proposals

// Convert hex to HSL for token matching:
import { hexToHsl } from '../lib/token-map'
const hsl = hexToHsl('#218721') // { h: 120, s: 61, l: 33 }
```

## Known Gaps

*From domain-manifest.ts — do not edit manually.*
- **important:** block-processor depends on token-map — if tokens.css changes, token-map may need updates
- **note:** processing is 100% client-side — no API calls for token analysis
