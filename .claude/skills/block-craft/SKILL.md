---
name: block-craft
description: Create production-ready portal blocks from Figma designs. Use when user shares a Figma link/node, says create block, зроби блок, зверстай секцію, or wants to build an HTML+CSS+JS block for the CMSMasters portal. Serves live preview on port 7777.
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

1. Use the `figma-use` skill first (MANDATORY before any `use_figma` call)
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

### Step 6: Ready for Studio import

When approved, user imports the HTML file into Studio → Process panel → Upload images → Save.

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
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Manrope', system-ui, sans-serif;
      background: hsl(var(--bg-page, 20 23% 97%));
    }

    /* ══════════════════════════════════════
       BLOCK: {block-name}
       Scoped under .block-{slug}
       ══════════════════════════════════════ */

    .block-{slug} {
      /* block container styles */
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

```css
/* CORRECT */
.block-clinic-services .section-header { ... }

/* WRONG — will leak */
.section-header { ... }
h1 { ... }
```

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

## Hooks — Dynamic Data Placeholders

For blocks on theme pages — resolved at build time:

```html
<span>{{price}}</span>           <!-- theme.meta.price -->
<h1>{{meta:name}}</h1>           <!-- theme.meta.name -->
<a href="{{link:demo_url}}">     <!-- theme.meta.demo_url -->
```

Hooks are configured in Studio after import. Static blocks (homepage) don't need hooks.

---

## Responsive Strategy

Desktop-first (1440px+). Use flexible layouts — Studio handles breakpoint decisions.
Don't add `@media` queries. Use `max-width`, flexbox, grid, relative units.

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
