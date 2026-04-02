---
id: 23
title: 'Block Animation Architecture'
version: 1
status: active
category: frontend
relatedADRs: [7, 8, 10]
supersededBy: null
date: 2026-04-02
---

## Context

Blocks are HTML+CSS assets stored in Supabase, rendered at build time by Astro SSG into static pages on CDN. The portal must deliver premium, diverse animations (entrance reveals, hover effects, mouse-tracking parallax, magnetic buttons) that are a key competitive differentiator — while maintaining Lighthouse 95+ and zero framework JS (ADR-007).

Each block has unique, bespoke animations. A single shared animation library (AOS, animate.css) produces generic results and is a competitive loss. GSAP ScrollTrigger (28KB) and Framer Motion (30KB+) destroy performance budgets.

CSS Scroll-Driven Animations (`animation-timeline: view()`) shipped in Chrome 115 (2023), Firefox 128 (2025), Safari 18 (2025) — full evergreen support by 2026. Web Animations API (WAAPI) is supported everywhere and runs on the compositor thread.

## Decision

### Three-layer animation architecture

**Layer 1 — CSS Scroll-Driven Animations (entrance, 0 JS)**

All entrance animations are pure CSS using `animation-timeline: view()`. Each block defines its own unique `@keyframes` in scoped CSS. No JavaScript required.

```css
.block-hero .title {
  animation: heroFadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}
@keyframes heroFadeSlide {
  from { opacity: 0; transform: translateY(60px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Progressive enhancement via `@supports`:
```css
@supports not (animation-timeline: view()) {
  .block-hero .title {
    animation: heroFadeSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}
```

**Layer 2 — Shared micro-utilities (~1.5KB gzipped, loaded once)**

A single ES module `/assets/animate-utils.js` provides common behavioral helpers:

| Utility | Purpose | Size |
|---------|---------|------|
| `trackMouse(container, targets, opts)` | Hover parallax, tilt effects | ~200B |
| `magnetic(element, opts)` | Magnetic button attraction | ~200B |
| `stagger(elements, keyframes, opts)` | WAAPI stagger animation | ~300B |
| `spring(from, to, callback)` | Spring physics interpolation | ~300B |
| `onVisible(element, callback, opts)` | IO wrapper for JS-triggered entrances | ~200B |

This is NOT a framework — just pure functions. Tree-shakeable via ES imports.

**Layer 3 — Per-block inline scripts (150-500B each)**

Blocks that need behavioral animations include a self-contained `<script type="module">`:

```html
<script type="module">
  import { trackMouse, magnetic } from '/assets/animate-utils.js';
  const block = document.currentScript.closest('[data-block]');
  trackMouse(block, block.querySelectorAll('.float'), { strength: 20 });
  magnetic(block.querySelector('.cta'), { strength: 0.3 });
</script>
```

### Performance budget

| Component | Size | Thread |
|-----------|------|--------|
| CSS scroll-driven animations | 0 JS | Compositor |
| Shared utilities | ~1.5KB gzip | Main (setup only) |
| Per-block scripts (10 blocks) | ~3KB total | Main (setup only) |
| **Total** | **~4.5KB JS** | **Lighthouse 95+** |

### Block model change

Add `js` column to `blocks` table:
```sql
ALTER TABLE blocks ADD COLUMN js text NOT NULL DEFAULT '';
```

Block JS is stored separately from HTML/CSS. Astro injects it as `<script type="module">` after the block HTML during render.

### Animation properties — only compositor-friendly

Blocks must ONLY animate `transform` and `opacity`. These run on the GPU compositor thread and cannot cause jank. Forbidden: animating `width`, `height`, `top`, `left`, `margin`, `padding`, `border-width`.

### What NOT to use

- **GSAP** — 28KB library for capabilities achievable with CSS + WAAPI + 1.5KB utilities
- **Lenis** — Smooth scroll breaks native scroll, hurts accessibility, adds main thread cost
- **AOS / animate.css** — Generic animations, competitive loss
- **Framer Motion** — Requires React runtime, 30KB+

## Consequences

- Blocks are fully self-contained: HTML + scoped CSS + optional JS
- Claude Code pipeline generates all three layers per block
- Portal pages have rich, diverse, per-block animations at ~5KB total JS
- `blocks` table gets `js` column (migration needed)
- Studio block editor gets JS field alongside HTML/CSS
- Process pipeline may validate animation properties (only transform/opacity)
