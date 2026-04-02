# WP-006: Block Import Pipeline — Token Mapping + Image Hosting + Animation & Component Architecture

> Automated processing pipeline for blocks created via Figma → Claude Code.
> Extracts images to R2, maps hardcoded CSS to design tokens, enforces semantic HTML (buttons, accordions),
> separates animation JS, provides live before/after preview in Studio.

**Status:** IN PROGRESS (Phases 0-3 done, Phases 4-8 remaining)
**Priority:** P0 — blocks are unusable on Portal without tokenized CSS and permanent image URLs
**Prerequisites:** WP-005C ✅ (Studio Blocks CRUD), WP-005B ✅ (Hono API, blocks table)
**Milestone:** Clean, tokenized blocks with hosted images, animation JS, and component states ready for Portal render
**ADRs:** ADR-023 (Block Animations), ADR-024 (Block Components & States)
**Created:** 2026-04-02
**Completed:** —

---

## Problem Statement

Blocks are created via Figma → Claude Code → HTML+CSS. The output has two critical problems:

1. **Temporary image URLs.** Images reference `https://www.figma.com/api/mcp/asset/...` — these expire. No block can go to production with Figma MCP URLs.

2. **Hardcoded CSS values.** All colors (`#FCE7C1`, `#181818`), font sizes (`42px`, `13px`), radii (`35px`, `12px`), shadows (`rgba(0,0,0,0.06)`), spacing (`70px`, `15px`) are hardcoded. Blocks won't respect the Portal design system or dark mode.

### Current block pipeline (broken at steps 3-4):
```
1. Figma → design                              ✅ manual
2. Claude Code → HTML+CSS+animations           ✅ automated
3. Extract images → CF R2 → permanent URLs      ❌ NOT BUILT
4. Map hardcoded CSS → design tokens            ❌ NOT BUILT
5. Studio → import → save clean block           ❌ no processing UI
```

### Example (real block — test-section.html):
- 7 images on Figma MCP URLs (will expire)
- 15+ hardcoded hex colors
- 10+ hardcoded font-size/weight values
- 5+ hardcoded box-shadows
- 5+ hardcoded border-radius values
- Hardcoded font-family, spacing, line-heights

---

## Solution Overview

### Architecture

```
Studio Block Editor
  │
  ├── [Paste HTML+CSS]
  │
  ├── Client-side: Token Scanner
  │   ├── Parse CSS → find hardcoded values
  │   ├── Match to closest design token (tokens.css)
  │   └── Return Suggestion[] (all enabled by default)
  │
  ├── Client-side: Image Extractor
  │   ├── Parse HTML → find <img src>, css url()
  │   └── Return ImageRef[] with original URLs
  │
  ├── API: POST /api/upload/batch
  │   ├── Download images from source URLs
  │   ├── Upload to Cloudflare R2
  │   └── Return { original → permanent URL } map
  │
  ├── Studio: Import Preview UI
  │   ├── Split view: Before (original) | After (tokenized, live)
  │   ├── Suggestions list — all ON by default
  │   ├── Toggle any suggestion → After preview updates instantly
  │   ├── CM sees no visible difference → tokens mapped correctly
  │   ├── CM sees breakage → uncheck that suggestion
  │   └── Images: progress bar for R2 upload
  │
  └── [Apply & Save] → block saved with clean CSS + permanent image URLs
```

### Why client-side processing (not API)?

- **Instant preview:** Toggle a suggestion → preview re-renders in <16ms. Server roundtrip would kill UX.
- **Token map is static:** It's derived from tokens.css at build time. No secrets needed.
- **Only image upload needs API:** R2 credentials must stay server-side (secrets boundary).

---

## Token Mapping Strategy

### Color mapping

Source tokens.css contains HSL triplets. Scanner converts hardcoded hex to HSL, finds nearest match:

```
#181818 → hsl(0, 0%, 9%)   → --text-primary (0 0% 9%)         ✅ exact
#545454 → hsl(0, 0%, 33%)  → --text-secondary (0 0% 33%)      ✅ exact
#FCE7C1 → hsl(39, 91%, 87%) → --section-gold (39 91% 87%)     ✅ exact
#BCBCBC → hsl(0, 0%, 74%)  → --brand-neutral-300 (0 0% 74%)   ~ close
```

Threshold: deltaE < 3 → auto-match. deltaE 3-10 → suggest with "approximate" flag. deltaE > 10 → no suggestion.

### Typography mapping

```
font-size: 42px  → var(--h2-font-size)       // 42px exact match
font-size: 26px  → var(--h4-font-size)        // 26px exact match
font-size: 13px  → var(--text-xs-font-size)   // 13px exact match
font-size: 12px  → var(--caption-font-size)    // 14px close, or --button-font-size-mini 13px
font-size: 20px  → var(--text-lg-font-size)   // 20px exact match
font-weight: 500 → var(--font-weight-medium)
font-weight: 600 → var(--font-weight-semibold)
font-weight: 400 → var(--font-weight-regular)
```

### Spacing mapping

```
70px → var(--spacing-6xl)    // 80px close
35px → var(--spacing-3xl)    // 40px close
15px → var(--spacing-md)     // 16px close
45px → var(--spacing-4xl)    // 48px close
```

Strategy: snap to nearest token. Flag if delta > 4px.

### Border-radius mapping

```
35px → var(--rounded-3xl)    // 24px — needs review
12px → var(--rounded-xl)     // 12px exact
4.5px → var(--rounded-sm)    // 4px close
```

### Shadow mapping

Pattern-match common shadow shapes to tokens:
```
box-shadow: 0 Npx Mpx ... → closest --shadow-{size}
```

### What NOT to tokenize

- `width`, `height` of specific layout elements (not design tokens)
- `position`, `top`, `left`, `right`, `bottom` percentages (layout-specific)
- `transform`, `transition`, `animation` values
- `border-width` (usually 1px, not tokenized)
- `opacity` values in animations
- Colors inside `rgba()` with specific alpha (keep as-is or map to `--black-alpha-*`)

---

## Phases

### Phase 0: RECON

Audit current state:
- Read existing block editor UI in Studio
- Read upload route stub
- Read wrangler.toml for R2 config status
- Inventory tokens.css for full mapping table
- Verify test-section.html as test fixture

---

### Phase 1: Token Scanner (client-side library)

**Goal:** Pure function that takes CSS string, returns token suggestions.

**Files:**
```
packages/ui/src/lib/token-map.ts        — static map: value → token name
apps/studio/src/lib/block-processor.ts  — scanner + applier functions
```

**token-map.ts:**
- Parse tokens.css at build time (or hardcode the map — tokens change rarely via /sync-tokens)
- Export maps: `colorTokens`, `typographyTokens`, `spacingTokens`, `radiusTokens`, `shadowTokens`
- Color comparison via deltaE (CIEDE2000 or simplified HSL distance)

**block-processor.ts:**
```typescript
interface Suggestion {
  id: string                    // unique, for toggle tracking
  property: string              // 'color', 'font-size', 'border-radius', etc.
  selector: string              // CSS selector where found
  original: string              // '#181818', '42px', etc.
  token: string                 // '--text-primary', '--h2-font-size', etc.
  tokenValue: string            // resolved value for display: '0 0% 9%', '42px'
  confidence: 'exact' | 'close' | 'approximate'
  enabled: boolean              // true by default
}

function scanCSS(css: string): Suggestion[]
function applyCSS(css: string, suggestions: Suggestion[]): string
function extractImages(html: string): ImageRef[]
```

**Acceptance:**
- `scanCSS(testSectionCSS)` returns 30+ suggestions
- `applyCSS(css, allSuggestions)` produces valid CSS with `var(--token)` references
- Colors wrapped in `hsl(var(--token))`
- All suggestions have correct confidence levels
- Unit tests pass

---

### Phase 2: R2 Image Pipeline (API)

**Goal:** Upload images to Cloudflare R2, return permanent URLs.

**Tasks:**

2.1 — R2 bucket setup:
- Create R2 bucket `cmsmasters-portal-assets` in Cloudflare dashboard
- Add to `wrangler.toml`: R2 bucket binding
- Add to `env.ts`: R2 binding type
- Custom domain or public bucket URL for serving

2.2 — Upload endpoint:
```
POST /api/upload/batch
Body: { urls: string[] }           // source URLs to download + upload
Response: { results: { original: string, uploaded: string, error?: string }[] }
```
- Download each URL server-side
- Detect content type (image/png, image/jpeg, image/svg+xml, image/webp)
- Generate deterministic key: `blocks/{hash}.{ext}` (content-hash for dedup)
- Upload to R2
- Return permanent URL

2.3 — Image extractor (client-side):
```typescript
interface ImageRef {
  type: 'img-src' | 'css-url'
  original: string              // original URL or base64
  element?: string              // selector or tag context
}

function extractImages(html: string, css: string): ImageRef[]
function replaceImages(html: string, css: string, map: Record<string, string>): { html: string, css: string }
```

**Acceptance:**
- R2 bucket configured and accessible
- `POST /api/upload/batch` with Figma MCP URLs → returns R2 URLs
- Dedup works (same image uploaded twice → same key)
- Content-type detected correctly
- Auth required (content_manager or admin)

---

### Phase 3: Studio Import UI

**Goal:** Block editor gets "Process" flow with split preview and suggestion toggles.

**UI Layout:**
```
┌─ Block Import ─────────────────────────────────────────────────┐
│                                                                 │
│  ┌─ Original ─────────────┐    ┌─ Processed (live) ──────────┐ │
│  │                         │    │                              │ │
│  │  [BlockPreview          │    │  [BlockPreview               │ │
│  │   original HTML+CSS]    │    │   with applied suggestions]  │ │
│  │                         │    │                              │ │
│  └─────────────────────────┘    └──────────────────────────────┘ │
│                                                                 │
│  ── Token Suggestions (32 found) ──────────────── [All] [None] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ #FCE7C1 → --section-gold         .section-container bg  ││
│  │ ✅ #181818 → --text-primary          h1 color        exact  ││
│  │ ✅ #545454 → --text-secondary        .option-label   exact  ││
│  │ ✅ 42px → --h2-font-size             h1 font-size    exact  ││
│  │ ⚠️ 35px → --rounded-3xl             container radius close  ││
│  │ ...                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ── Images (7 found, 5 unique) ───────────── [Upload to R2]   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ bae2e790... → blocks/a3f2c1.png                   4 KB  ││
│  │ ✅ dd7174fe... → blocks/7bc1d2.png (x3)              2 KB  ││
│  │ ⏳ 07409dc4... → uploading...                        120 KB ││
│  │ ...                                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                                          [Apply & Save Block]   │
└─────────────────────────────────────────────────────────────────┘
```

**Behaviour:**
- All suggestions enabled by default → After preview shows tokenized version
- CM sees no visual difference → confirms tokens mapped correctly
- CM sees breakage → unchecks that suggestion → After preview updates instantly
- "All" / "None" buttons for bulk toggle
- Confidence badges: `exact` (green), `close` (yellow), `approximate` (orange)
- Image upload: batch upload with progress, shows permanent URLs when done
- "Apply & Save" → applies enabled suggestions + image URL replacements → saves to DB

**Files:**
```
apps/studio/src/components/block-import-panel.tsx    — main UI
apps/studio/src/components/suggestion-list.tsx       — toggle list
apps/studio/src/components/image-upload-list.tsx     — upload progress
```

**Integration with existing block editor:**
- Add "Process" tab/step to existing block create/edit flow
- After processing, HTML+CSS fields populated with clean versions
- CM can still manually edit HTML+CSS after processing

**Acceptance:**
- Split preview renders correctly (Before + After)
- Toggling suggestions updates After preview in real-time
- Image upload works end-to-end (Figma URL → R2 → new URL in HTML)
- "Apply & Save" produces clean block in DB
- Works for new blocks (create) and existing blocks (re-process)

---

### Phase 4: DB Migration — `js` column + Studio JS field

**Goal:** Blocks can store animation/behavioral JS separately from HTML/CSS.
**ADR:** ADR-023 (Block Animations)

**Tasks:**
4.1 — Supabase migration: `ALTER TABLE blocks ADD COLUMN js text NOT NULL DEFAULT '';`
4.2 — Update `packages/db` types: add `js` field to Block interface
4.3 — Update `packages/validators`: add `js` to block schemas
4.4 — Update Hono API block routes: accept/return `js` field
4.5 — Update Studio block editor: add JS code field (like HTML/CSS but for scripts)
4.6 — Update block import: `parseHtmlFile()` extracts `<script type="module">` into JS field (instead of stripping)

**Acceptance:**
- `blocks.js` column exists in Supabase
- Studio can save/load block JS
- Import preserves `<script type="module">` content into JS field

---

### Phase 5: Shared Portal Stylesheet — `portal-blocks.css`

**Goal:** All portal pages ship a shared CSS file with button/card/tooltip component classes.
**ADR:** ADR-024 (Block Components & States)

**Tasks:**
5.1 — Create `apps/portal/src/styles/portal-blocks.css` with:
  - `.cms-btn` base + variants (primary, secondary, outline, cta)
  - All states: `:hover`, `:active`, `:focus-visible`, `:disabled`
  - Size variants: sm, default, lg, xl, pill
  - `.cms-card` hover transitions
  - `[data-tooltip]` CSS tooltips
  - Touch device protection `@media (hover: none)`
5.2 — All styles use tokens from `tokens.css`
5.3 — Size target: < 3KB minified

**Acceptance:**
- `portal-blocks.css` exists with full button state system
- All variants use design tokens
- Buttons have hover, active, focus-visible, disabled states

---

### Phase 6: Shared Animation Utilities — `animate-utils.js`

**Goal:** Tiny shared module for behavioral animations.
**ADR:** ADR-023 (Block Animations)

**Tasks:**
6.1 — Create `apps/portal/public/assets/animate-utils.js` (~1.5KB):
  - `trackMouse(container, targets, opts)` — hover parallax/tilt
  - `magnetic(element, opts)` — magnetic button effect
  - `stagger(elements, keyframes, opts)` — WAAPI stagger
  - `spring(from, to, callback)` — spring interpolation
  - `onVisible(element, callback, opts)` — IO wrapper
6.2 — ES module, tree-shakeable via imports
6.3 — Only `transform` and `opacity` mutations (compositor-safe)

**Acceptance:**
- Module works standalone in browser
- Each utility < 300B
- Total < 1.5KB gzipped
- Demo: magnetic button + parallax hover on test block

---

### Phase 7: Process Pipeline — Component Detection

**Goal:** Processor suggests semantic HTML and `.cms-btn` classes, not just token replacements.
**ADR:** ADR-024 (Block Components & States)

**Tasks:**
7.1 — Detect button-like elements: `<div>/<span>` with padding + background + border-radius + cursor:pointer
7.2 — Suggest replacing with `<button class="cms-btn cms-btn--{variant}">`
7.3 — Detect CTA patterns: dark bg + light text + rounded → `cms-btn--primary`
7.4 — Flag `<div>` used as button → warning in suggestions
7.5 — Map button-specific tokens: when context is button, prefer `--button-primary-bg` over `--text-primary`
7.6 — Detect animation classes (`reveal`, `reveal-left`, etc.) → preserve, don't tokenize

**Acceptance:**
- Processor identifies CTA container in test-section.html as button
- Suggests `.cms-btn--primary` class
- Button context maps to button-specific tokens
- Animation classes untouched

---

### Phase 8: Integration Testing + Docs

**Goal:** End-to-end pipeline with all features.

**Tasks:**
8.1 — Process test-section.html through full pipeline (tokens + images + JS extraction + component detection)
8.2 — Verify block preview with tokenized CSS
8.3 — Verify images from R2
8.4 — Verify animation JS preserved in separate field
8.5 — Verify `.cms-btn` classes render with proper states
8.6 — Edge cases: blocks with no images, no JS, no buttons
8.7 — Update `.context/BRIEF.md`, `.context/CONVENTIONS.md`
8.8 — Update `PORTAL-BLOCK-ARCHITECTURE.md` — pipeline fully implemented
8.9 — Execution logs for all phases

**Acceptance:**
- test-section.html → fully processed block (HTML + CSS + JS + R2 images)
- Block looks identical with tokenized styles
- Button has hover/active/focus/disabled states
- Animations preserved and functional
- Lighthouse 95+ compatible output

---

## Technical Notes

### Token map maintenance
The token map is derived from `tokens.css`. When tokens change (via `/sync-tokens`), the map should be regenerated. Options:
- **Simple:** Hardcode map in `token-map.ts`, update manually after sync (tokens change rarely)
- **Better:** Parse tokens.css at Studio build time, generate map automatically

Start with simple. Revisit if token churn increases.

### CSS parsing approach
Use regex-based scanning (not full CSS AST parser):
- `/#[0-9a-fA-F]{3,8}/` → hex colors
- `/rgba?\([^)]+\)/` → rgb/rgba colors
- `/font-size:\s*(\d+(?:\.\d+)?px)/` → font sizes
- `/border-radius:\s*(\d+(?:\.\d+)?px)/` → radii
- `/box-shadow:\s*([^;]+)/` → shadows

Why not PostCSS/AST: overkill for this use case, adds dependency, slower for real-time preview. Regex covers 95% of Claude Code output which follows consistent patterns.

### R2 bucket structure
```
cmsmasters-portal-assets/
├── blocks/
│   ├── {content-hash}.png
│   ├── {content-hash}.jpg
│   ├── {content-hash}.svg
│   └── {content-hash}.webp
├── themes/           (future: theme screenshots)
└── media/            (future: general uploads)
```

Content-hash = first 12 chars of SHA-256 of image binary. Ensures dedup.

### Image format handling
| Source | Detection | Action |
|--------|-----------|--------|
| `https://...` URL | Fetch, check Content-Type header | Download → R2 |
| `data:image/png;base64,...` | Parse data URI | Decode → R2 |
| Inline SVG in HTML | Detect `<svg>` tags | Extract → save as .svg → R2 |
| `url(...)` in CSS | Regex extract | Same as URL handling |

---

## Acceptance Criteria (full WP-006)

### Token Processing (Phases 0-3) ✅
- [x] Token scanner produces correct suggestions for test-section.html (51 suggestions)
- [x] All token confidence levels accurate (exact/close/approximate)
- [x] R2 bucket configured and upload endpoint working
- [x] Image batch upload: URL → R2 → permanent URL
- [x] Studio import UI with split preview + zoom controls + scroll
- [x] All suggestions enabled by default
- [x] Toggle updates preview instantly
- [x] Apply & Close writes processed code to form

### Animation Architecture (Phases 4, 6)
- [ ] `blocks.js` column in Supabase
- [ ] Studio block editor has JS field
- [ ] Import extracts `<script type="module">` into JS field
- [ ] `animate-utils.js` shared module (< 1.5KB gzip)
- [ ] trackMouse, magnetic, stagger, spring, onVisible utilities work

### Component States (Phases 5, 7)
- [ ] `portal-blocks.css` with .cms-btn classes (all variants + states)
- [ ] Processor detects button-like elements
- [ ] Processor suggests .cms-btn classes
- [ ] Button context uses button-specific tokens

### Integration (Phase 8)
- [ ] test-section.html fully processed end-to-end (HTML + CSS + JS + R2 images)
- [ ] Block renders identically with tokenized styles
- [ ] Animations preserved and functional
- [ ] Button states work (hover, active, focus-visible, disabled)
- [ ] No regressions in existing Studio functionality
- [ ] Execution logs for all phases
- [ ] .context/ docs updated
- [ ] ADR-023 and ADR-024 referenced in ADR_DIGEST.md
