---
id: 24
title: 'Block Interactive Components and States'
version: 1
status: active
category: frontend
relatedADRs: [7, 10, 23]
supersededBy: null
date: 2026-04-02
---

## Context

Blocks contain interactive elements — buttons, cards, accordions, tabs, tooltips — that need proper interaction states (hover, active, focus, disabled). The portal is Astro SSG with zero framework JS (ADR-007). Blocks are raw HTML+CSS in Supabase. Currently, buttons are `<div class="cta-container">` with hardcoded styles and no interaction states — no hover, no focus ring, no disabled state, no keyboard accessibility.

Research into production static sites (Stripe, Apple, Linear, Tailwind docs, shadcn.com) shows: button states are always pure CSS. Complex components (tabs, carousels) use minimal vanilla JS. Nobody ships a framework runtime just for button hover states.

## Decision

### Four-tier component strategy

**Tier 1: CSS + Native HTML elements (80% of needs, 0 JS)**

All interactive elements MUST use semantic HTML:
- Clickable actions → `<button>` (never `<div>`)
- Navigation → `<a href="...">`
- Expandable sections → `<details><summary>...</summary>...</details>`
- Exclusive accordion → `<details name="group">`
- Tooltips → `data-tooltip` attribute + CSS `::after`, or Popover API
- Disclosure → `<dialog>`, Popover API (`popover` attribute)

Button states via CSS pseudo-classes + design tokens:

```css
.cms-btn--primary {
  background-color: hsl(var(--button-primary-bg));
  color: hsl(var(--button-primary-fg));
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.cms-btn--primary:hover {
  background-color: hsl(var(--button-primary-hover));
}
.cms-btn--primary:active {
  transform: scale(0.97);
}
.cms-btn--primary:focus-visible {
  outline: 2px solid hsl(var(--border-focus));
  outline-offset: 2px;
}
.cms-btn--primary:disabled {
  opacity: 0.5;
  pointer-events: none;
}
```

Touch device protection:
```css
@media (hover: none) {
  .cms-btn:hover { background-color: inherit; }
}
```

**Tier 2: CSS + Inline Vanilla JS (15% of needs, 0.3-1.5KB per block)**

For components that require state toggling:

| Component | Approach | Size |
|-----------|----------|------|
| Tabs | Inline `<script>`, ARIA `role="tab"`, `aria-selected`, `hidden` | ~400B |
| Carousel | CSS `scroll-snap` + JS for autoplay, dots | ~1.5KB |
| Before/after slider | JS drag handle | ~800B |
| Copy-to-clipboard | `navigator.clipboard.writeText()` | ~100B |

Scripts are inline `<script type="module">` inside block HTML. Self-contained, no external dependencies. Progressive enhancement — content visible without JS.

**Tier 3: Astro Islands (5%, complex state)**

Reserved for components that genuinely need framework features:
- Search panel (API calls, debounce, result rendering)
- Auth-aware sidebar (session check, conditional display)

Use Preact (3KB) over React (40KB) for islands.

**Tier 4: Web Components (future, optional)**

If a JS pattern (e.g., tabs) repeats in 10+ blocks, extract to shared `<cms-tabs>` Web Component using Light DOM (no Shadow DOM — CSS tokens inherit normally). Only when the duplication justifies it.

### Shared portal stylesheet: `portal-blocks.css`

Ships with every portal page. Contains:

```
.cms-btn                    — base button reset + transitions
.cms-btn--primary           — primary variant + hover/active/focus/disabled
.cms-btn--secondary         — secondary variant
.cms-btn--outline           — outline variant
.cms-btn--cta               — CTA variant
.cms-btn--sm/lg/xl          — size variants
.cms-btn--pill              — pill radius variant
.cms-card                   — card hover + shadow transitions
[data-tooltip]              — tooltip via ::after
```

All styles use tokens from `tokens.css`. Size: ~2-3KB minified. Cost: negligible.

### Block authoring rules

Claude Code MUST generate blocks following these rules:

1. **Use `<button>` for actions, `<a>` for navigation** — never `<div>` or `<span>` for interactive elements
2. **Use `.cms-btn` classes** for all buttons — don't hand-roll button styles per block
3. **Use `<details>` for accordions** — not JS-powered show/hide
4. **Use Popover API for tooltips/popovers** — not custom JS
5. **Include `type="button"`** on buttons that don't submit forms
6. **Add `aria-label`** when button text is not descriptive

### Process pipeline impact

The token processor (WP-006) should:
1. Detect button-like elements (`<button>`, `<a>` with padding+background, `.btn`, `.cta` classes)
2. Suggest replacing inline button styles with `.cms-btn` classes
3. Flag `<div>` elements used as buttons → suggest replacing with `<button>`

## Consequences

- All block buttons get hover/active/focus/disabled states for free via `portal-blocks.css`
- Keyboard accessibility works automatically with native elements
- `portal-blocks.css` created in `apps/portal/src/styles/` (loaded once per page)
- Block authoring pipeline updated to enforce semantic HTML
- Process pipeline gets component-level suggestions (not just token mapping)
- `blocks` table gets `js` column for inline scripts (shared with ADR-023)
- Accordions, tooltips, popovers — zero JS, native HTML
- Tabs, carousels — minimal inline JS, progressive enhancement
