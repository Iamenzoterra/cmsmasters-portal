---
name: block-craft
description: Create production-ready portal blocks from Figma designs. Use when user shares a Figma link/node, says create block, зроби блок, зверстай секцію, забираю в forge, or wants to build an HTML+CSS+JS block for the CMSMasters portal. Iterates HTML preview on port 7777; on user signal, finalizes to Forge sandbox JSON (tools/block-forge/blocks/<slug>.json) ready for responsive polish + Studio Import.
---

# Block Craft — Figma → Production Block

Create a self-contained HTML + CSS + JS block from a Figma design for the CMSMasters Portal.
The block will be imported into Studio, stored in Supabase, and rendered by Astro SSG on the public portal.

---

## What is a Block

A **block** is one visual section of a portal page — a hero area, feature grid, CTA banner, testimonial strip, pricing card, etc. Blocks are:

- **Self-contained:** HTML + scoped CSS + optional JS in one unit
- **Stored in Supabase:** `blocks` table (html, css, js columns)
- **Assembled into pages:** via templates (position grids) in Studio
- **Rendered statically:** by Astro SSG at build time → HTML on CDN
- **Zero framework JS:** no React, no Vue in output. Vanilla JS only for animations/interactions.

```
Figma design → Claude Code (this skill) → HTML+CSS+JS → Studio import → Process → DB → Portal render
```

---

## Workflow

### Step 1: Read the Figma design

When user shares a Figma link or node:

1. When the user shares a Figma URL/node, call `use_figma` (MCP tool, when available) to read the node directly. If MCP is unavailable, ask the user to paste a screenshot of the design.
2. Read the node — get layout, styles, text content, images, spacing
3. Understand the visual hierarchy, sections, interactive elements

### Step 2: Read current design tokens

**ALWAYS read the tokens file before generating CSS.** Tokens change frequently — Figma is the source of truth.

```
Read: packages/ui/src/theme/tokens.css
```

This file contains all current values for colors, typography, spacing, radii, shadows, and component tokens. Use `var(--token-name)` references in your CSS. Do NOT memorize or hardcode token values.

**Token usage syntax:**
```css
/* Colors — HSL triplets, need hsl() wrapper */
color: hsl(var(--text-primary));
background: hsl(var(--section-gold));

/* With alpha */
background: hsl(var(--text-primary) / 0.1);

/* Sizing — direct use */
font-size: var(--h2-font-size);
padding: var(--spacing-xl);
border-radius: var(--rounded-xl);
box-shadow: var(--shadow-md);
font-weight: var(--font-weight-medium);
```

### Step 3: Generate the block

Write the block as a single HTML file to `tools/studio-mockups/{block-name}.html`.
This file is the **source of truth** — it contains everything: styles, markup, animations, scripts.

### Step 4: Serve preview

```bash
cd "C:\work\cmsmasters portal\app\cmsmasters-portal"
npx serve tools/studio-mockups -p 7777 --no-clipboard
```

Tell the user: **"Preview ready at http://localhost:7777/{block-name}.html"**

### Step 5: Iterate

User reviews in browser. Refine animations, spacing, interactions until approved.
Each change → save file → browser refresh.

### Step 6: Finalize to Forge sandbox (FINALIZE Protocol)

The iterate loop (Steps 1–5) ends when the user signals satisfaction with the desktop look-and-feel. The skill's job is then to assemble an 11-key BlockJson from the current `tools/studio-mockups/<name>.html` and write it to `tools/block-forge/blocks/<slug>.json` — the WP-035 Forge sandbox.

After that, the user opens Forge at http://localhost:7702, polishes responsive variants (WP-019/028 UI), tweaks via Inspector (WP-033), and runs Export → Studio Import → DB (WP-035 Phase 1+2 round-trip).

#### Trigger interpretation (PROCEED / DECLINE / CLARIFY)

The skill interprets natural language **in conversational context** — last 2–3 messages, current iterate state, presence/absence of "iterate" verbs. NOT an allow-list. The 3-class model below is the OUTPUT classification, not the input phrase set:

| Signal class | Example user phrasing | Skill action |
|---|---|---|
| **PROCEED** | "забираю", "готово", "ship", "ок зберігаємо", "save to forge", "це воно", "збережемо в форджі", "запиши в forge", "зроби джсон" | Run FINALIZE (continues to CONFIRM step) |
| **DECLINE** | "ні", "ще доробимо", "wait", "no", "ще треба X", "поправ Y" + describes change | Continue ITERATE (do not finalize; treat as iterate instruction) |
| **CLARIFY** | "ну добре", "ок", "норм", "ну ок" + no qualifier, short ack after long iterate | Ask once: "Зберегти `<slug>` у Forge sandbox? (це створить `tools/block-forge/blocks/<slug>.json`)" — wait for explicit yes/no |

**Precedence — first match wins (highest first):**

1. **Explicit decline** — phrases like "ні", "no", "wait", "ще не", "skasuj", "не зараз", "не треба" → **DECLINE**, even if a save signal is also present in the same message
2. **Iterate verb** — "change X", "поправ", "додай", "remove", "make Y bigger", "ще треба Z", "fix the heading", "зменши на 2px", "tweak X" → **DECLINE**, even if a save signal is also present in the same message
3. **Explicit save signal AND no iterate verb AND no decline** — "save", "забираю", "ship", "finalize", "коміт", "запиши в forge", "ок зберігаємо", "це воно" → **PROCEED** (goes to CONFIRM step)
4. **Pure affirmative with no qualifier** — "ок", "норм", "так", "yes", "ну ок" alone → **CLARIFY** (ask once)
5. **Default** → **DECLINE** (finalize is opt-in; if rules 1–4 don't match, do not finalize)

**Why iterate-verb-wins-over-save:** This protects against silent-finalize when the user is mid-thought. Example: "save але heading 2px more" — the user's actual intent is "keep tweaking", and the "save" was a forward-looking statement, not a now-signal. Better to stay in iterate (treat the message as an iterate instruction targeting "heading 2px more") than to finalize prematurely. Same for "ок забираю але поправ heading" — iterate verb wins; user gets one more cycle.

**CLARIFY ambiguity exhaust:** if after one clarifying question the user's response is still ambiguous (rules 1–4 don't classify it cleanly), default to DECLINE. Finalize is opt-in; "I'm not sure if you wanted to finalize" is always a safer state than "I finalized but the user didn't confirm".

#### CONFIRM step (always runs after PROCEED)

Even when the trigger phrasing is unambiguous, the skill ALWAYS asks the user to confirm slug + name before writing the BlockJson. This is the only opportunity to override auto-derived defaults; once written, the file is on disk and slug determines its filename.

Auto-derive proposals:
- **`name` proposal**: from the studio-mockups filename humanized (`fast-loading-speed.html` → `"fast loading speed"`). Use lowercase space-separated form to match production seed convention (Phase 0 §0.1 finding). FALLBACK: if the filename is generic (`untitled.html`, `test.html`, `block.html`, `index.html`), derive from `<h1>`/`<h2>` text inside `.block-{slug}` lowercased.
  - **Why filename-first:** filename matches all 9 sandbox blocks + all 4 audited production blocks (Phase 0 §0.1 — `fast-loading-speed`, `header`, `theme-name`, `sidebar-help-support` all derive cleanly from filename). `<h2>`-first would mis-derive when the heading is marketing copy (e.g. `<h2>Get Started Today!</h2>` doesn't yield a usable block name).
- **`slug` proposal**: `nameToSlug(name)` — kebab-case, ASCII, `[a-z0-9-]` only.

Check sandbox collision: read `tools/block-forge/blocks/<slug>.json`. If file exists, capture mtime + size for the warning.

Ask user (single message, both proposals + warning if collision):

```
Готую FINALIZE. Запропонований slug: `<derived-slug>`, name: "<derived-name>".

{if collision: ⚠ `tools/block-forge/blocks/<derived-slug>.json` вже існує (X.Y KB, modified 2 hours ago).}

OK, чи поправ?
```

User responds:
- "ок" / "yes" / "так" / similar affirmative → proceed with proposals; if collision, treat as overwrite-confirmed
- "name = X" / "slug = Y" / "обидва: X / Y" / free-form rename ("давай назвемо 'Hero CTA'") → re-derive `slug` from new `name` if only name given; re-check collision; ask again ONLY if collision changed (new collision OR collision removed)
- "abort" / "ні" / "skasuj" → cancel finalize; user stays in iterate loop
- "rename to X" with collision still present → re-check on new slug; warn again if new slug also collides

Maximum 2 confirm rounds. If user is still ambiguous after round 2, default to abort with a "Try again — say 'забираю в forge' when ready" hint.

#### SPLIT step (deterministic — no LLM judgment)

Apply the rules from "## SPLIT Contract" section below:
1. Read `tools/studio-mockups/<file>.html` (the iterate target — current studio-mockups file)
2. Read existing `tools/block-forge/blocks/<slug>.json` (if exists) — extract all 8 metadata fields for preservation
3. Extract `<section class="block-{slug}" data-block>...</section>` → `html` field
4. Extract block's main `<style>` body (NOT `<style data-preview-only>`) → strip global resets, strip `body`/`html` rules → `css` field
5. Extract `<script>` tag bodies (skip preview-only scripts) → `js` field
6. Assemble 11-key BlockJson in canonical order (slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants)
7. On RE-finalize: spread existing 8 metadata fields over freshly-split html/css/js (existingFields wins for everything except html/css/js)
8. On FIRST finalize: defaults — `block_type: ""`, `is_default: false`, `sort_order: 0`, `hooks: {}`, `metadata: {}`, `variants: null`
9. Stringify with `JSON.stringify(payload, null, 2) + '\n'`

#### WRITE step

Use the Write tool (NOT Edit, NOT Forge's POST /api/blocks/:slug):
- Path: `tools/block-forge/blocks/<slug>.json`
- Content: pretty-printed JSON + trailing newline (per SPLIT Contract)
- Single atomic write

Do NOT touch `content/db/blocks/<slug>.json` — that's the production seed and is owned by Studio Import. Saved memory `feedback_forge_sandbox_isolation` is non-negotiable.

#### POST-FINALIZE message

After WRITE succeeds, tell the user (single message, concise):

```
Done. `<slug>.json` written to `tools/block-forge/blocks/`.

Refresh Forge http://localhost:7702 → "<name>" з'явиться в picker.
Polish responsive → Export → Studio Import → DB.
```

Do not delete or rename `tools/studio-mockups/<file>.html`. The user may return to iterate further; re-finalize is allowed (variants + all metadata are preserved per SPLIT Contract re-finalize rule).

#### Re-finalize cycle

If user later says "ще зменшимо heading на 2px" → return to ITERATE (Step 5: edit the studio-mockups HTML). On next FINALIZE signal, the cycle repeats:
1. CONFIRM (slug + name) — same as first finalize; collision warning will fire because the sandbox file exists from previous finalize
2. SPLIT — re-extracts current HTML state for html/css/js
3. All other fields (block_type, is_default, sort_order, hooks, metadata, variants, name) PRESERVED from existing sandbox JSON (per SPLIT Contract re-finalize rule — closes silent block_type / is_default / variants loss)
4. WRITE overwrites the sandbox JSON with merged result

Studio-mockups HTML stays on disk through every cycle. Only the Forge sandbox JSON is overwritten — and only its content fields (html/css/js).

---

## Block HTML Template

Every block MUST follow this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{Block Name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!-- Preview-only styles. NOT part of the block.
       The portal renderer strips html/body/* rules as a safety net, but the
       block's own <style> below must never depend on that — keep globals OUT. -->
  <style data-preview-only>
    body { font-family: 'Manrope', system-ui, sans-serif; margin: 0; }
  </style>

  <style>
    /* ══════════════════════════════════════
       BLOCK: {block-name}
       Scoped under .block-{slug}
       ══════════════════════════════════════
       HARD RULES for this <style>:
       - EVERY selector must start with .block-{slug}
       - NO body / html / * selectors
       - NO global resets, NO global typography, NO global background
       Globals leak onto the portal page and break layout / other blocks. */

    .block-{slug} {
      /* block container styles — ALL styles go under this prefix */
    }

    /* ... all block CSS, prefixed with .block-{slug} ... */

    /* ── Entrance Animations ── */
    /* CSS scroll-driven (preferred) or class-based reveals */

  </style>
</head>
<body>
  <section class="block-{slug}" data-block>
    <!-- Block HTML content -->
  </section>

  <!-- Animation/interaction JS (optional) -->
  <script type="module">
    // Self-contained, scoped to this block
    // ...
  </script>
</body>
</html>
```

---

## Design Tokens — Source of Truth

**`packages/ui/src/theme/tokens.css`** is the ONLY source of truth for design values. Read it before every block creation.

Token categories available:
- **Colors:** `--text-*`, `--bg-*`, `--border-*`, `--section-*`, `--button-*`, `--tag-*`, `--card-*`, `--status-*`
- **Typography:** `--h1-*` through `--h4-*`, `--text-lg-*` through `--text-xs-*`, `--font-weight-*`, `--font-family-*`
- **Spacing:** `--spacing-3xs` through `--spacing-10xl`
- **Radii:** `--rounded-sm` through `--rounded-full`
- **Shadows:** `--shadow-xs` through `--shadow-2xl`
- **Alpha:** `--black-alpha-*`, `--white-alpha-*`

**Rules:**
- Use `var(--token)` in CSS — never hardcode hex, rgb, or arbitrary px values
- If a value doesn't match any token exactly, use the closest token and note it in a comment
- If working in standalone preview (no tokens.css loaded), use the resolved value with a comment: `/* --spacing-xl */ 24px`
- Studio Process panel will verify token usage on import

---

## Semantic HTML — MANDATORY

### Interactive Elements

```html
<!-- Buttons — ALWAYS use <button>, never <div> -->
<button class="block-{slug}__cta" type="button">Purchase Theme</button>

<!-- Links — ALWAYS use <a> -->
<a href="{{link:demo_url}}" class="block-{slug}__link">Live Demo</a>

<!-- Accordions — use native <details>, zero JS -->
<details name="faq-group">
  <summary>Question here</summary>
  <div class="block-{slug}__answer">Answer content</div>
</details>
```

### Button States (CSS)

Buttons MUST have these states — read current button tokens from `tokens.css` for colors:

```css
.block-{slug}__cta {
  /* base styles using button tokens from tokens.css */
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.block-{slug}__cta:hover {
  /* use hover token from tokens.css */
}
.block-{slug}__cta:active {
  transform: scale(0.97);
}
.block-{slug}__cta:focus-visible {
  outline: 2px solid hsl(var(--border-focus));
  outline-offset: 2px;
}
```

### Images

```html
<img src="https://www.figma.com/api/mcp/asset/..." alt="Meaningful description" />
```
Figma URLs are temporary — Studio uploads to R2 on import. Always include `alt` text.

---

## CSS Scoping — MANDATORY

ALL selectors MUST be prefixed with `.block-{slug}` to prevent leaking.

**ZERO global selectors in the block `<style>`.** Not `body`, not `html`, not `*`, not `h1`/`p`/`a`/`ul`/`li`, not `section`/`main`, not `@keyframes` with global names.

Why: blocks are concatenated into a single page on portal. Any non-scoped rule leaks to ALL other blocks, the layout shell, and page `<body>`. A single `body { background: ... }` in one block overrides the layout's page background. A single `* { margin: 0 }` resets every block's spacing.

**Preview typography** (font-family, body margin) belongs in a **separate** `<style data-preview-only>` tag OUTSIDE the block's main `<style>`. See the HTML template above. The portal renderer strips `html`/`body`/`*` rules as a safety net — **do not rely on it**. The rule is: block CSS must be safe when inlined verbatim into the portal page.

```css
/* CORRECT — every selector starts with .block-{slug} */
.block-clinic-services { padding: var(--spacing-xl); }
.block-clinic-services .section-header { color: hsl(var(--text-primary)); }
.block-clinic-services h2 { font-size: var(--h2-font-size); }

/* WRONG — all of these leak page-wide */
body { background: hsl(var(--bg-page)); }     /* overrides layout bg */
body { font-family: 'Manrope', ...; }          /* leaks to other blocks */
html { background: white; }
*, *::before, *::after { margin: 0; padding: 0; }
.section-header { ... }                        /* no block prefix */
h1 { font-size: 48px; }                        /* styles every h1 on page */
section { padding: 40px; }                     /* affects every block wrapper */
```

### Self-check before handing off

Before marking a block ready, grep the block's `<style>` block (NOT the `data-preview-only` tag) for:

- `^\s*body\s*\{` — MUST return zero matches
- `^\s*html\s*\{` — MUST return zero matches
- `^\s*\*` — MUST return zero matches
- Any selector that doesn't start with `.block-{slug}` (ignoring `@media`, `@keyframes`, `@supports`, nested child selectors after a prefixed parent)

---

## Animations (ADR-023)

Animations are a key differentiator. Each block should have unique, thoughtful animations.

### Shared reveal classes (DO NOT redefine in block CSS)

`portal-blocks.css` provides these classes globally. Just use them in HTML + trigger with JS:
- `.reveal` — fade up (translateY 30px)
- `.reveal-left` — slide from left (translateX -60px)
- `.reveal-right` — slide from right (translateX 60px)
- `.reveal-scale` — scale up from 0.8
- Add `.visible` class to trigger (via IntersectionObserver in block JS)
- Use `style="transition-delay: 0.1s"` for stagger

```html
<div class="reveal" style="transition-delay: 0.1s">...</div>
<div class="reveal-scale" style="transition-delay: 0.2s">...</div>
```

```javascript
const block = document.querySelector('.block-{slug}');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
block.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => io.observe(el));
```

### Block-specific animations (define in block CSS)

For unique keyframe animations (gauge fills, counters, custom effects) — define in block's own `<style>`. Only block-unique stuff.

### Layer 2: Behavioral Animations (per-block JS)

```javascript
// Mouse-tracking parallax
const block = document.querySelector('.block-{slug}');
block.addEventListener('mousemove', (e) => {
  const rect = block.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  block.querySelectorAll('[data-parallax]').forEach(el => {
    const s = parseFloat(el.dataset.parallax || '20');
    el.style.transform = `translate(${x * s}px, ${y * s}px)`;
  });
});
```

### Animation Rules

1. **ONLY animate `transform` and `opacity`** — GPU compositor, zero jank
2. **NEVER animate** `width`, `height`, `top`, `left`, `margin`, `padding`
3. **Stagger children** with `transition-delay` or `animation-delay`
4. **Premium easings:** `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out), `cubic-bezier(0.34, 1.56, 0.64, 1)` (back-out)
5. **Respect motion preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  .block-{slug} * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## Slots & Hooks — Dynamic Data Placeholders

**Source of truth:** `packages/db/src/slot-registry.ts`
**Full reference in Studio:** `/slots` page

All hooks are resolved at build time. Static blocks (homepage) don't need hooks.

### Layout Slots

Used in layout page HTML. Each slot is filled by a global element or per-layout override.

| Slot | Category | Syntax |
|------|----------|--------|
| header | header | `{{slot:header}}` or `<div data-slot="header"></div>` or `<!-- SLOT: HEADER -->` |
| footer | footer | `{{slot:footer}}` or `<div data-slot="footer"></div>` or `<!-- SLOT: FOOTER -->` |
| sidebar-left | sidebar | `{{slot:sidebar-left}}` or `<div data-slot="sidebar-left"></div>` |
| sidebar-right | sidebar | `{{slot:sidebar-right}}` or `<div data-slot="sidebar-right"></div>` |

### Nested Slots (layout-scoped)

Nested slots live inside a container slot and are specific to a layout. They are NOT global — they only appear in layouts that declare them via `slot_config[parent]['nested-slots']`.

| Slot | Parent | Layout | Description | Syntax |
|------|--------|--------|-------------|--------|
| theme-blocks | content | theme-page-layout | Template blocks per theme | `<div data-slot="theme-blocks"></div>` |

### Meta Slots

Resolved from `theme.meta` at build time. Use in block HTML for dynamic theme data.

| Field | Syntax | Description |
|-------|--------|-------------|
| name | `{{meta:name}}` | Theme display name |
| tagline | `{{meta:tagline}}` | Short tagline |
| description | `{{meta:description}}` | Full description |
| category | `{{meta:category}}` | Theme category |
| price | `{{meta:price}}` | Regular price (number) |
| discount_price | `{{meta:discount_price}}` | Discount price (number) |
| demo_url | `{{meta:demo_url}}` | Live demo link |
| themeforest_url | `{{meta:themeforest_url}}` | ThemeForest product page |
| themeforest_id | `{{meta:themeforest_id}}` | ThemeForest item ID |
| thumbnail_url | `{{meta:thumbnail_url}}` | Theme thumbnail image |
| rating | `{{meta:rating}}` | Star rating (number) |
| sales | `{{meta:sales}}` | Total sales count |

### Hook Shortcuts

Convenience hooks with special formatting:

| Pattern | Resolves to | Description |
|---------|-------------|-------------|
| `{{price}}` | `theme.meta.price` | Price with $ prefix |
| `{{discount_price}}` | `theme.meta.discount_price` | Discount price with $ prefix |
| `{{link:field}}` | `theme.meta[field]` | URL from meta field (e.g. `{{link:demo_url}}`) |
| `{{primary_categories}}` | `theme_categories (is_primary=true) join categories` | Badge pills for primary categories |
| `{{perfect_for}}` | `theme_use_cases join use_cases` | HTML list of use cases ("Perfect for" sidebar) |
| `{{tags}}` | `theme_tags join tags` | Comma-separated tag names |
| `{{theme_details}}` | `theme.meta.theme_details` | Icon + label + value list (Theme Details sidebar) |
| `{{help_and_support}}` | `theme.meta.help_and_support` | Icon + label + value list (Help & Support sidebar) |

### Examples

```html
<span>{{price}}</span>           <!-- renders "$59" from theme.meta.price -->
<h1>{{meta:name}}</h1>           <!-- renders "Theme Name" from theme.meta.name -->
<a href="{{link:demo_url}}">     <!-- renders URL from theme.meta.demo_url -->
<p>{{meta:tagline}}</p>          <!-- renders tagline text -->
```

> **Note:** When adding new slots, update `packages/db/src/slot-registry.ts` AND this section.

---

## Responsive Strategy

Desktop-first (1440px+). Use flexible layouts — Studio handles breakpoint decisions.
Don't add `@media` queries. Use `max-width`, flexbox, grid, relative units.

---

## SPLIT Contract — Studio-Mockups HTML → BlockJson

When the user signals FINALIZE (see "FINALIZE Protocol" in Step 6), the skill assembles an 11-key BlockJson from the current `tools/studio-mockups/<name>.html` and writes it to `tools/block-forge/blocks/<slug>.json`.

The split is deterministic — same input HTML → same output JSON every time. No LLM judgment in field extraction; only in slug/name confirm proposal.

### 11-key shape + ordering

The keys MUST be emitted in this exact order to match the convention observed across `content/db/blocks/*.json`:

```
slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants
```

`id` is **OMITTED** — not emitted on FINALIZE. Reason: `importBlockSchema.id` is optional (`packages/validators/src/block.ts:89`); Studio Import server-resolves on insert; `performCloneInSandbox` (`tools/block-forge/vite.config.ts:67`) strips `id` and Forge handles id-less files identically; no consumer in `tools/block-forge/src` reads `block.id`. Mirroring Clone semantics.

### Field extraction rules

**`slug`** (string)
Confirmed in CONFIRM step. Default proposal: `nameToSlug(name)` — kebab-case, ASCII, `[a-z0-9-]` only.

**`name`** (string)
Confirmed in CONFIRM step. Default proposal: lowercase space-separated form (e.g. `"fast loading speed"` not `"Fast Loading Speed"`) — matches convention observed across production seed.

**`block_type`** (string)
Default `""` for "section" blocks (the common case for `/block-craft` output). Override only if user explicitly signals slot-category alignment ("це новий header" → `"header"` + `is_default: true`). Empty string is the safe default; Studio can re-tag later.

**`is_default`** (boolean)
Default `false`. `true` ONLY if user explicitly says it's a slot-category default (rare for `/block-craft` output).

**`sort_order`** (number)
Always `0`. Sorting happens in Studio.

**`hooks`** (object)
Always `{}`. User adds hooks (e.g. `{{meta:price}}`) inside the HTML body; the `hooks` field is not used by current portal renderer (legacy concept — kept for schema parity).

**`metadata`** (object)
Always `{}`. Skill does NOT emit `metadata.thumbnail_url` — that field is owned by Studio Process panel post-Save (R2 upload returns a URL).

**`html`** (string)
ONLY the `<section class="block-{slug}" data-block>...</section>` segment, extracted from the studio-mockups HTML body. Strip:
- `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>` wrapping
- All `<link>`, `<meta>`, `<title>` inside `<head>`
- `<style data-preview-only>` block (preview-only, never part of the block)
- Any wrapping `<script>` tags (their content goes into `js`, see below)
- Any preview-data injection scripts (`<script id="preview-data">` or scripts whose only effect is to inject a `<template>` element for the preview)

Outer `<section>` tag preserved verbatim, including `data-block`, `data-fluid-tablet`, `data-fluid-mobile`, and any other `data-*` attributes set during iterate.

Strip rules are **idempotent** — if the studio-mockups HTML is already minimal (no `<!DOCTYPE>`, no `<head>`, only the `<section>` element + adjacent `<style>` and `<script>` siblings), strip operations are no-ops. SPLIT works on both full preview pages AND pre-stripped fragments (e.g. when a user manually prepares a minimal HTML, or when re-finalizing after an upstream tool already did the trimming).

**`css`** (string)
ONLY the rules from the block's main `<style>` (NOT `<style data-preview-only>`). Strip:
- Global resets like `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box }`
- `body { ... }` rules (font-family, background, etc. — these belong in `<style data-preview-only>`)
- `html { ... }` rules
- Any selector that doesn't start with `.block-{slug}` (legacy drift in production seed; Phase 1 emits clean)

Preserve:
- All `.block-{slug}`-scoped rules
- Block-specific `@keyframes` (named uniquely per block)
- `@container slot (max-width: ...)` queries inside the block's CSS scope
- `@media (prefers-reduced-motion)` blocks if scoped under `.block-{slug}`
- `@supports` blocks if scoped under `.block-{slug}`

**`js`** (string)
Raw JS body, with `<script>` / `<script type="module">` wrapping tags STRIPPED. If multiple block-relevant `<script>` tags exist in studio-mockups HTML (rare), concatenate bodies in document order with one newline separator.

Skip preview-only scripts:
- `<script id="preview-data">` (preview-time data injection)
- Scripts whose only effect is to inject `<template>` element content for preview
- Scripts wrapped in conditional preview-only branches

Emit only IO observers, behavioral handlers (mousemove parallax, click toggles), and animation triggers.

If the block has no JS (pure CSS animations only), emit `js: ""` (empty string, NOT undefined or omitted).

**`variants`** (null | BlockVariants)
Always emit `null` sentinel on FIRST finalize (no existing sandbox file). WP-028 Ruling HH/LL: `JSON.stringify` preserves `null`, drops `undefined`; emitting `null` ensures disk + DB round-trip parity.

On RE-finalize (sandbox file exists), preserve `variants` from the existing sandbox JSON — see "Re-finalize contract" below for the broader preservation rule (variants is one of 8 preserved fields).

### Re-finalize contract

If `tools/block-forge/blocks/<slug>.json` already exists when FINALIZE runs, the skill writes ONLY freshly-computed `html` / `css` / `js` from studio-mockups HTML. **Every other field is preserved from the existing sandbox JSON.**

1. READ existing file → capture the full record `{ slug, name, block_type, is_default, sort_order, hooks, metadata, variants }` (8 fields)
2. RECOMPUTE `{ html, css, js }` from current studio-mockups HTML per SPLIT extraction rules above (3 fields)
3. ASSEMBLE: `{ ...existingFields, html, css, js }` in canonical 11-key order (slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants)
4. WRITE merged result

**Mental model:** studio-mockups HTML owns *content* (markup + scoped styles + behavior). Forge sandbox JSON owns everything *about* the block (slug, name, type, defaults, hooks, metadata, responsive variants). Re-finalize is "I edited content"; durable Forge metadata edits survive.

**Why preserve all 8 metadata fields, not just `variants`:** Forge UI may mutate `block_type`, `is_default`, `name`, `sort_order`, `hooks`, `metadata` post-finalize via Inspector / picker / settings dialogs. If the user signaled `block_type: "header"` + `is_default: true` on first finalize, polished responsive in Forge, then re-iterated desktop in studio-mockups, then re-finalized WITHOUT repeating the header signal — narrow `variants`-only preservation would silently overwrite `block_type: ""` + `is_default: false`, breaking slot-picker visibility. Real data-loss bug. Broad preservation closes it.

**Exception — explicit CONFIRM override:** if the user explicitly overrides `slug` or `name` in the CONFIRM step (e.g. "rename to X"), the explicit override wins over the existing sandbox JSON. CONFIRM is the user-controlled metadata channel; re-finalize WITHOUT rename signals "keep what's there".

**Hard discard:** if the user explicitly wants to wipe responsive variants or block_type (rare), they delete `tools/block-forge/blocks/<slug>.json` first via OS file manager — next finalize then becomes a fresh first-finalize and emits defaults. Out of skill scope.

### On-disk format

Pretty-printed with 2-space indent + trailing newline:

```js
JSON.stringify(payload, null, 2) + '\n'
```

This matches Forge's own `POST /api/blocks/:slug` write convention (`tools/block-forge/vite.config.ts:333`). Same byte-shape across skill-write, Forge-save, Clone — git diffs stay clean.

---

## Checklist

### Structure
- [ ] `<section class="block-{slug}" data-block>` wrapper
- [ ] ALL CSS scoped under `.block-{slug}`
- [ ] Semantic HTML: `<button>`, `<a>`, `<details>` — no `<div>` for interactions
- [ ] Images have `alt` text

### Tokens
- [ ] Read `tokens.css` before writing CSS
- [ ] Colors via `hsl(var(--token))`
- [ ] Typography, spacing, radii, shadows via `var(--token)`
- [ ] No hardcoded hex, rgb, or arbitrary px

### Interactions
- [ ] Buttons: `:hover`, `:active` (scale), `:focus-visible` (ring)
- [ ] Cards: hover effect present

### Animations
- [ ] Entrance animation (unique per block)
- [ ] Only `transform` + `opacity`
- [ ] Stagger on grouped elements
- [ ] `prefers-reduced-motion` respected

### Preview
- [ ] Serving on http://localhost:7777/{name}.html
- [ ] No console errors
- [ ] Looks correct, animations play

---

## CSS Size Optimization

`portal-blocks.css` provides shared classes. **DO NOT redefine** these in block CSS:
- `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-scale` — entrance animations
- `.cms-btn`, `.cms-btn--primary/secondary/outline/cta` — button system
- `.cms-card` — card hover
- `.cms-icon` — icon container (flex + img object-fit)
- `[data-tooltip]` — tooltips
- `@media (prefers-reduced-motion)` — handled globally

**Block CSS should ONLY contain:**
- `.block-{slug}` container styles (bg, padding, gap, width)
- Block-specific element styles (scoped under `.block-{slug}`)
- Block-specific `@keyframes` (unique animations like gauge fills)

**Use `.cms-icon` instead of custom icon containers:**
```html
<!-- CORRECT — uses shared class -->
<div class="cms-icon" style="width: 64px; height: 64px">
  <img src="..." alt="..." />
</div>

<!-- WRONG — duplicates icon styling -->
<div class="block-slug__icon"><img ... /></div>
<!-- with CSS: .block-slug__icon img { width:100%; object-fit:contain } -->
```

---

## What NOT to Do

1. **Don't use React/Vue/Svelte** — vanilla HTML+CSS+JS only
2. **Don't use Tailwind** — scoped CSS, not utility classes
3. **Don't use GSAP, AOS, animate.css** — no external libraries
4. **Don't use `<div>` for buttons** — `<button>` or `<a>`
5. **Don't hardcode design values** — read tokens.css, use var()
6. **Don't animate layout properties** — only transform/opacity
7. **Don't add media queries** — Studio handles responsive
8. **Don't embed token tables in this skill** — tokens.css is the source of truth
9. **Don't redefine `.reveal` or `.cms-btn`** — use shared classes from portal-blocks.css
10. **Don't add `@media (prefers-reduced-motion)`** — it's in portal-blocks.css globally
11. **Don't style global selectors** — `body`, `html`, `*`, `h1`, `p`, `a`, `ul`, `li`, `section`, `main`, etc. They leak to the entire portal page and break other blocks + the layout shell. Zero exceptions inside the block `<style>` — preview font/margin goes in a separate `<style data-preview-only>` tag.
12. **Don't add wrapper `<div>`s without a clear purpose** — block HTML root must be `<section class="block-{slug}">` directly, no extra `<div>` wrappers with inline styles (padding, margin, etc.). Extra wrappers break layout spacing in slot stacks and cause alignment bugs with sibling blocks.
13. **Don't auto-finalize without an explicit user signal** — FINALIZE is opt-in. Even when the desktop preview looks great, do NOT write `tools/block-forge/blocks/<slug>.json` until the user signals PROCEED via natural language. Silent writes corrupt the user's mental model of "iterate is sticky".
14. **Don't silent-overwrite the Forge sandbox** — when CONFIRM step detects an existing `tools/block-forge/blocks/<slug>.json`, ALWAYS show the collision warning (file size + mtime). Never write over an existing sandbox file without the user's explicit yes-or-rename response. Saved memory `feedback_no_blocker_no_ask` (silent data-loss guard) applies.
15. **Don't delete or rename `tools/studio-mockups/<file>.html` after FINALIZE** — the iterate HTML is sticky. The user often returns to it for desktop tweaks (font size, color, spacing) post-finalize. The Forge sandbox JSON is the published artifact; the studio-mockups HTML is the source-of-iteration. Keep both. Re-finalize cycles are explicitly allowed and preserve responsive variants.
