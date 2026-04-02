# WP-006 Phase 1: Token Scanner — Result

**Date:** 2026-04-02
**Status:** DONE

## What was done

### Created files:
1. `apps/studio/src/lib/token-map.ts` — Static token value maps + color conversion helpers
2. `apps/studio/src/lib/block-processor.ts` — CSS scanner, token applier, image extractor
3. `tools/test-scanner.ts` — Verification script

### Token map (`token-map.ts`):
- Color tokens: 30+ HSL→token-name mappings (semantic preferred over brand primitives)
- Font size tokens: 10 mappings (h1-h4, text sizes, caption, mono)
- Line height tokens: 8 mappings
- Font weight tokens: 4 mappings (400-700)
- Spacing tokens: 16 mappings (2px-144px)
- Radius tokens: 9 mappings (0px-9999px)
- Shadow tokens: 7 pattern-based matchers
- Helpers: hexToHsl, rgbToHsl, hslDistance, findClosestColorToken, findClosestSpacing

### Block processor (`block-processor.ts`):
- `scanCSS(css)` → `Suggestion[]` — scans for hardcoded values, returns suggestions all enabled by default
- `applyCSS(css, suggestions)` → tokenized CSS string
- `extractImages(html, css)` → `ImageRef[]` — finds img src and CSS url() references
- `replaceImages(html, css, urlMap)` → HTML/CSS with replaced URLs
- Simple CSS parser (regex-based, handles Claude Code output patterns)

### Confidence levels:
- `exact` — value matches token exactly (e.g., `#181818` → `--text-primary`)
- `close` — within small threshold (e.g., `15px` → `--spacing-md` which is 16px)
- `approximate` — within larger threshold (e.g., `35px` → `--spacing-2xl` which is 32px)

## Verification (test-section.html)

Ran scanner against real block HTML. Results:

| Category | Count | Exact | Close | Approximate |
|----------|-------|-------|-------|-------------|
| Color | 13 | 10 | 1 | 2 |
| Typography | 19 | 16 | 3 | 0 |
| Spacing | 14 | 4 | 5 | 5 |
| Radius | 5 | 1 | 4 | 0 |
| **Total** | **51** | **31** | **13** | **7** |

Images: 7 unique Figma MCP URLs extracted (deduped from 9 references in HTML).

## What worked well
- Color matching is accurate — all semantic colors detected correctly
- Typography matching is nearly perfect — exact matches for h2, h4, text sizes
- Image extraction clean with dedup and alt text context

## Edge cases noted
- Micro-radii (0.3px, 0.8px) in screenshot decorations get suggested → CM should uncheck
- `35px` spacing maps to `32px` (--spacing-2xl) — closest available, but original may be intentional
- White (#fff, white) needs context-aware mapping (bg-surface vs text-inverse) — handled via preferredColorTokens
- `rgba(0,0,0,0.06)` shadows detected but mapped to closest shadow token pattern, not exact

## TypeScript
- `tsc --noEmit` clean (0 errors)
