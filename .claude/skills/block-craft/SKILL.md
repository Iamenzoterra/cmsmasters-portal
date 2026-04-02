---
name: block-craft
description: "Create production-ready portal blocks from Figma designs. Use when user shares a Figma link/node, says 'create block', 'зроби блок', 'зверстай секцію', or wants to build an HTML+CSS+JS block for the CMSMasters portal. Serves live preview on port 7777."
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

### Step 2: Generate the block

Write the block as a single HTML file to `tools/studio-mockups/{block-name}.html`.
This file is the **source of truth** — it contains everything: styles, markup, animations, scripts.

### Step 3: Serve preview

```bash
cd "C:\work\cmsmasters portal\app\cmsmasters-portal"
npx serve tools/studio-mockups -p 7777 --no-clipboard
```

Tell the user: **"Preview ready at http://localhost:7777/{block-name}.html"**

### Step 4: Iterate

User reviews in browser. Refine animations, spacing, interactions until approved.
Each change → save file → browser refresh.

### Step 5: Ready for Studio import

When approved, user imports the HTML file into Studio → Process panel → Upload images → Apply tokens → Save.

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
      background: hsl(20 23% 97%);  /* --bg-page */
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

## Design Tokens — MANDATORY

All visual values MUST use design tokens. The portal has a comprehensive token system in `packages/ui/src/theme/tokens.css`.
In standalone preview files, use the resolved values with comments noting the token name.
Studio's Process panel will convert to `var(--token)` on import.

**However, it is BETTER to use tokens directly.** When the block is imported, the Process panel will find 0 suggestions — confirming everything is correct.

### Color Tokens (HSL triplets, need `hsl()` wrapper)

**Text:**
| Token | Value | Use for |
|-------|-------|---------|
| `--text-primary` | `0 0% 9%` | Main body text, headings |
| `--text-secondary` | `0 0% 33%` | Secondary text, descriptions |
| `--text-muted` | `37 12% 62%` | Muted/disabled text, captions |
| `--text-inverse` | `0 0% 100%` | Text on dark backgrounds |
| `--text-brand` | `230 58% 20%` | Brand-colored text |
| `--text-link` | `227 72% 51%` | Links |

**Backgrounds:**
| Token | Value | Use for |
|-------|-------|---------|
| `--bg-page` | `20 23% 97%` | Page background (warm beige) |
| `--bg-surface` | `0 0% 100%` | Cards, panels (white) |
| `--bg-surface-alt` | `0 0% 95%` | Alternate surface (light gray) |
| `--bg-inverse` | `230 58% 20%` | Dark backgrounds |

**Section accents (for block backgrounds):**
| Token | Value | Use for |
|-------|-------|---------|
| `--section-gold` | `39 91% 87%` | Warm gold sections |
| `--section-azure` | `206 100% 92%` | Light blue sections |
| `--section-green` | `118 45% 89%` | Light green sections |
| `--section-pink` | `312 100% 92%` | Light pink sections |
| `--section-teal` | `189 69% 58%` | Teal accent sections |
| `--section-grey-blue` | `197 18% 85%` | Neutral blue-gray sections |
| `--section-light-orange` | `29 70% 85%` | Light orange sections |

**Borders:**
| Token | Value | Use for |
|-------|-------|---------|
| `--border-default` | `30 19% 90%` | Default borders |
| `--border-light` | `0 0% 87%` | Subtle borders |
| `--border-strong` | `235 36% 24%` | Prominent borders |

**Buttons:**
| Token | Value | Use for |
|-------|-------|---------|
| `--button-primary-bg` | `230 58% 20%` | Primary button background |
| `--button-primary-fg` | `0 0% 100%` | Primary button text |
| `--button-primary-hover` | `235 36% 24%` | Primary button hover |
| `--button-secondary-bg` | `227 72% 51%` | Secondary button background |
| `--button-cta-bg` | `206 100% 92%` | CTA button background |
| `--button-cta-fg` | `235 67% 29%` | CTA button text |

**Usage in CSS:**
```css
/* Colors need hsl() wrapper because tokens store raw HSL triplets */
color: hsl(var(--text-primary));
background-color: hsl(var(--section-gold));
border-color: hsl(var(--border-default));

/* With alpha */
background-color: hsl(var(--text-primary) / 0.1);
```

### Typography Tokens

| Token | Value | Use for |
|-------|-------|---------|
| `--h1-font-size` | `54px` | Hero headings |
| `--h2-font-size` | `42px` | Section headings |
| `--h3-font-size` | `32px` | Subsection headings |
| `--h4-font-size` | `26px` | Card/feature headings |
| `--text-lg-font-size` | `20px` | Large body text |
| `--text-base-font-size` | `18px` | Base body text |
| `--text-sm-font-size` | `15px` | Small text |
| `--text-xs-font-size` | `13px` | Captions, labels |

| Token | Value | Use for |
|-------|-------|---------|
| `--h2-line-height` | `46px` | Pairs with h2 |
| `--h4-line-height` | `34px` | Pairs with h4 |
| `--text-lg-line-height` | `26px` | Pairs with lg |
| `--font-weight-regular` | `400` | Normal text |
| `--font-weight-medium` | `500` | Medium emphasis |
| `--font-weight-semibold` | `600` | Strong emphasis |
| `--font-weight-bold` | `700` | Maximum emphasis |

### Spacing Tokens

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--spacing-3xs` | `2px` | | `--spacing-xl` | `24px` |
| `--spacing-2xs` | `4px` | | `--spacing-2xl` | `32px` |
| `--spacing-xs` | `8px` | | `--spacing-3xl` | `40px` |
| `--spacing-sm` | `12px` | | `--spacing-4xl` | `48px` |
| `--spacing-md` | `16px` | | `--spacing-5xl` | `64px` |
| `--spacing-lg` | `20px` | | `--spacing-6xl` | `80px` |

### Border Radius Tokens

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--rounded-sm` | `4px` | | `--rounded-xl` | `12px` |
| `--rounded-md` | `6px` | | `--rounded-2xl` | `16px` |
| `--rounded-lg` | `8px` | | `--rounded-3xl` | `24px` |

### Shadow Tokens

| Token | Value |
|-------|-------|
| `--shadow-xs` | `0 1px 2px 0px hsl(0 0% 0% / 0.05)` |
| `--shadow-sm` | `0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)` |
| `--shadow-md` | `0 4px 6px -1px hsl(0 0% 0% / 0.1), 0 2px 4px -2px hsl(0 0% 0% / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px hsl(0 0% 0% / 0.1), 0 4px 6px -4px hsl(0 0% 0% / 0.1)` |
| `--shadow-xl` | `0 20px 25px -5px hsl(0 0% 0% / 0.1), 0 8px 10px -6px hsl(0 0% 0% / 0.1)` |

---

## Semantic HTML — MANDATORY

### Buttons
```html
<!-- CORRECT — native element, accessible, has :hover/:active/:focus for free -->
<button class="block-{slug}__cta" type="button">Purchase Theme</button>
<a href="{{link:demo_url}}" class="block-{slug}__demo-link">Live Demo</a>

<!-- WRONG — no keyboard nav, no focus, no :disabled, screen reader sees generic text -->
<div class="cta-container" onclick="...">Purchase Theme</div>
```

### Button CSS Pattern
```css
.block-{slug}__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 32px;
  font-family: inherit;
  font-size: var(--text-lg-font-size);
  font-weight: var(--font-weight-medium);
  line-height: var(--text-lg-line-height);
  color: hsl(var(--button-primary-fg));
  background-color: hsl(var(--button-primary-bg));
  border: none;
  border-radius: var(--rounded-xl);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}
.block-{slug}__cta:hover {
  background-color: hsl(var(--button-primary-hover));
}
.block-{slug}__cta:active {
  transform: scale(0.97);
}
.block-{slug}__cta:focus-visible {
  outline: 2px solid hsl(var(--border-focus));
  outline-offset: 2px;
}
```

### Accordions
```html
<!-- CORRECT — native, accessible, animated, 0 JS -->
<details name="faq-group">
  <summary>Question here</summary>
  <div class="block-{slug}__answer">Answer content</div>
</details>
```

### Images
```html
<!-- Always include meaningful alt text -->
<img src="https://www.figma.com/api/mcp/asset/..." alt="Theme screenshot showing clinic services page" />
```
Image URLs from Figma are temporary — Studio's Process panel uploads them to R2 on import.

---

## CSS Scoping — MANDATORY

ALL selectors MUST be prefixed with `.block-{slug}` to prevent style leaking between blocks on a page.

```css
/* CORRECT */
.block-clinic-services .section-header { ... }
.block-clinic-services .feature-title { ... }

/* WRONG — will leak to other blocks */
.section-header { ... }
h1 { ... }
```

---

## Animations (ADR-023)

Animations are a key differentiator. Each block should have unique, thoughtful animations.

### Layer 1: CSS Entrance Animations (preferred, 0 JS)

Use CSS scroll-driven animations where possible:

```css
/* Modern — scroll-triggered, pure CSS */
.block-{slug} .hero-title {
  animation: heroReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}

@keyframes heroReveal {
  from { opacity: 0; transform: translateY(60px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fallback for older browsers */
@supports not (animation-timeline: view()) {
  .block-{slug} .hero-title {
    animation: heroReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}
```

**Or** class-based reveals with IntersectionObserver (more compatible):

```css
.block-{slug} .reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.block-{slug} .reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

With JS to trigger:
```javascript
const block = document.querySelector('.block-{slug}');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
block.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

### Layer 2: Behavioral Animations (JS, per-block)

For hover effects, parallax, magnetic buttons:

```javascript
// Mouse-tracking parallax on floating elements
const block = document.querySelector('.block-{slug}');
const floats = block.querySelectorAll('.float-element');
block.addEventListener('mousemove', (e) => {
  const rect = block.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  floats.forEach(el => {
    const strength = parseFloat(el.dataset.parallax || '20');
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });
});
```

### Animation Rules

1. **ONLY animate `transform` and `opacity`** — these run on GPU compositor, zero jank
2. **NEVER animate** `width`, `height`, `top`, `left`, `margin`, `padding` — causes layout thrashing
3. **Use `will-change: transform`** on elements that will animate (sparingly — each one costs GPU memory)
4. **Stagger children** with `transition-delay` or `animation-delay` for organic feel
5. **Use premium easings:** `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out), `cubic-bezier(0.34, 1.56, 0.64, 1)` (back-out)
6. **Respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  .block-{slug} * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Hooks — Dynamic Data Placeholders

Blocks on theme pages can display dynamic data from each theme's metadata. Use these placeholder patterns:

```html
<!-- Price — resolved at build time from theme.meta.price -->
<span class="price">{{price}}</span>

<!-- Theme metadata -->
<h1>{{meta:name}}</h1>
<p>{{meta:tagline}}</p>

<!-- Links — resolved from theme.meta -->
<a href="{{link:demo_url}}">Live Demo</a>
<a href="{{link:themeforest_url}}">Buy on ThemeForest</a>
```

Hooks are configured in Studio after import (Block Inspector → Hooks section).
For blocks that are NOT on theme pages (homepage, about), hooks are not needed — content is static.

---

## Responsive Strategy

Design for **desktop-first** (1440px+ viewport). Blocks will have responsive handling configured per-breakpoint in Studio:

- **Resize** — CSS scales naturally (flexbox/grid + relative units)
- **Redesign** — different block instance for mobile (configured in Studio)
- **Hide** — block hidden on certain breakpoints (configured in Studio)

For the HTML file, focus on the desktop design. Use flexible layouts (flexbox, grid, %, max-width) so basic resize works. Don't add complex media queries — Studio handles breakpoint decisions.

```css
.block-{slug} {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 40px;
}

.block-{slug} .features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}
```

---

## Images

- Use Figma asset URLs directly from the MCP API — they work for development preview
- Studio's Process panel will upload them to Cloudflare R2 and replace URLs on import
- Always include meaningful `alt` text
- For decorative icons, use inline SVG when possible (smaller, scalable, no network request)
- For screenshots/photos, use `<img>` tags with Figma URLs

---

## Checklist — Before Considering a Block Done

### Structure
- [ ] HTML wrapped in `<section class="block-{slug}" data-block>`
- [ ] ALL CSS selectors prefixed with `.block-{slug}`
- [ ] No global styles that could leak
- [ ] Semantic HTML: `<button>` for actions, `<a>` for links, `<details>` for accordions
- [ ] All images have `alt` text

### Design Tokens
- [ ] Colors use token values (or var references)
- [ ] Font sizes from token scale (not arbitrary px)
- [ ] Font weights: 400/500/600/700 only
- [ ] Spacing approximates token scale (8, 12, 16, 20, 24, 32, 40, 48, 64, 80)
- [ ] Border radius from token scale
- [ ] Shadows from token presets

### Interactive States
- [ ] Buttons have `:hover` transition (background-color change)
- [ ] Buttons have `:active` feedback (`scale(0.97)`)
- [ ] Buttons have `:focus-visible` ring
- [ ] Cards/links have hover effect (shadow, lift, or color shift)
- [ ] Touch protection: `@media (hover: none)` considered

### Animations
- [ ] Entrance animation present (scroll-triggered reveal or CSS scroll-driven)
- [ ] Only `transform` and `opacity` animated
- [ ] Stagger timing on grouped elements
- [ ] Premium easing curves (not linear, not ease)
- [ ] `prefers-reduced-motion` respected
- [ ] Behavioral animations if design calls for it (hover parallax, magnetic, tilt)

### Quality
- [ ] Font family: Manrope loaded via Google Fonts
- [ ] Body background: warm beige (`hsl(20 23% 97%)` = `--bg-page`)
- [ ] Preview looks correct at http://localhost:7777/{name}.html
- [ ] No console errors in browser
- [ ] JS is `<script type="module">` (deferred, scoped)
- [ ] No external dependencies (no npm packages, no CDN libraries)

---

## What NOT to Do

1. **Don't use React/Vue/Svelte** — blocks are vanilla HTML+CSS+JS
2. **Don't use Tailwind classes** — blocks use scoped CSS, not utility classes
3. **Don't use GSAP, AOS, animate.css** — vanilla JS/CSS only
4. **Don't use `<div>` for buttons** — use `<button>` or `<a>`
5. **Don't hardcode colors as hex** — use HSL values matching tokens (or var references)
6. **Don't animate layout properties** — only `transform` and `opacity`
7. **Don't add `@media` breakpoints** — Studio handles responsive per-block
8. **Don't inline base64 images** — use Figma URLs, Studio uploads to R2
9. **Don't add framework-level event handlers** — vanilla `addEventListener` only
10. **Don't use CSS `@import`** — all styles in one `<style>` block
