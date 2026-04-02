# WP-006 Phase 6: Shared Animation Utilities — `animate-utils.js`

> Workplan: WP-006 Block Import Pipeline
> Phase: 6 of 8
> Priority: P1
> Estimated: 1.5 hours
> Type: Frontend (vanilla JS)
> Previous: Phase 5 ✅ (portal-blocks.css — shared component stylesheet)
> Next: Phase 7 (Process Pipeline — component detection in token scanner)

---

## Context

ADR-023 defines a 3-layer animation architecture:
- **Layer 1:** CSS scroll-driven animations (entrance, 0 JS) — blocks already do this
- **Layer 2:** Shared micro-utilities for behavioral animations — **THIS PHASE**
- **Layer 3:** Per-block inline `<script type="module">` that imports from Layer 2

Blocks need hover parallax, magnetic buttons, stagger effects, spring physics. Without shared utilities, each block reimplements the same 200B mouse-tracking function. The shared module provides composable primitives that blocks import.

```
CURRENT:  Each block writes own mousemove/IO handlers              ❌ duplication
MISSING:  Shared /assets/animate-utils.js with composable utils    ❌
```

**Where to put it:** `apps/portal/` doesn't exist yet. File goes in `packages/ui/src/portal/animate-utils.js` — same location as `portal-blocks.css`. When Portal is created, it copies/imports this as a public asset. For `/block-craft` preview, the file is loaded via relative path.

**Key constraint:** This is a **browser ES module** (not TypeScript, not bundled). It must work with `<script type="module">` in any HTML page. No build step, no imports from node_modules.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm portal directory in packages/ui
ls packages/ui/src/portal/

# 2. Check test-section.html for current animation patterns
grep -n "IntersectionObserver\|mousemove\|transform" tools/studio-mockups/test-section.html | head -15

# 3. Verify ADR-023 utility list
grep -A 10 "trackMouse\|magnetic\|stagger\|spring\|onVisible" workplan/adr/023-block-animations.md | head -20

# 4. Check if any animate-utils already exists
find . -name "animate*" -not -path "*/node_modules/*" 2>/dev/null
```

**Document your findings before writing any code.**

**IMPORTANT:** This is vanilla JavaScript, NOT TypeScript. The file must have `.js` extension and use JSDoc for type hints. No `import` from npm packages. Browser-native APIs only (IntersectionObserver, Web Animations API, `element.animate()`, `addEventListener`).

---

## Task 6.1: Create `animate-utils.js`

### What to Build

**File:** `packages/ui/src/portal/animate-utils.js`

An ES module with 5 exported utility functions. Each function is self-contained, compositor-safe (only mutates `transform` and `opacity`), and < 300B.

### `trackMouse(container, targets, options)`

Mouse-tracking parallax. When cursor moves over container, targets translate proportionally.

```javascript
/**
 * Mouse-tracking parallax on child elements.
 * Each target moves based on cursor position within container.
 * @param {HTMLElement} container — element to track mouse on
 * @param {NodeList|HTMLElement[]} targets — elements to move
 * @param {{ strength?: number, resetOnLeave?: boolean }} [opts]
 */
export function trackMouse(container, targets, opts = {}) {
  const { strength = 20, resetOnLeave = true } = opts
  const elems = Array.from(targets)

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    for (const el of elems) {
      const s = parseFloat(el.dataset.parallax || String(strength))
      el.style.transform = `translate(${x * s}px, ${y * s}px)`
    }
  })

  if (resetOnLeave) {
    container.addEventListener('mouseleave', () => {
      for (const el of elems) {
        el.style.transform = ''
      }
    })
  }
}
```

Usage in block:
```html
<div data-parallax="30" class="float-card">...</div>
<script type="module">
  import { trackMouse } from '/assets/animate-utils.js';
  const block = document.querySelector('.block-hero');
  trackMouse(block, block.querySelectorAll('[data-parallax]'));
</script>
```

### `magnetic(element, options)`

Magnetic button effect — element shifts toward cursor on hover, snaps back on leave.

```javascript
/**
 * Magnetic attraction effect on an element.
 * Element translates toward cursor while hovered.
 * @param {HTMLElement} element
 * @param {{ strength?: number }} [opts]
 */
export function magnetic(element, opts = {}) {
  const { strength = 0.3 } = opts

  element.addEventListener('mousemove', (e) => {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    element.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  })

  element.addEventListener('mouseleave', () => {
    element.style.transform = ''
  })
}
```

### `stagger(elements, keyframes, options)`

WAAPI-based stagger animation. Plays the same animation on each element with incremental delay.

```javascript
/**
 * Stagger animation using Web Animations API.
 * @param {HTMLElement[]} elements
 * @param {Keyframe[]} keyframes — WAAPI keyframes array
 * @param {{ duration?: number, delay?: number, easing?: string, fill?: string }} [opts]
 */
export function stagger(elements, keyframes, opts = {}) {
  const {
    duration = 600,
    delay = 80,
    easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill = 'forwards',
  } = opts

  Array.from(elements).forEach((el, i) => {
    el.animate(keyframes, {
      duration,
      delay: i * delay,
      easing,
      fill,
    })
  })
}
```

### `spring(from, to, callback)`

Simple spring interpolation for organic motion. Calls `callback(value)` on each frame until settled.

```javascript
/**
 * Spring physics interpolation.
 * @param {number} from — start value
 * @param {number} to — target value
 * @param {(value: number) => void} callback — called each frame
 * @param {{ stiffness?: number, damping?: number }} [opts]
 * @returns {{ stop: () => void }} — cancel handle
 */
export function spring(from, to, callback, opts = {}) {
  const { stiffness = 0.15, damping = 0.8 } = opts
  let value = from
  let velocity = 0
  let raf = 0

  function tick() {
    const force = (to - value) * stiffness
    velocity = (velocity + force) * damping
    value += velocity

    callback(value)

    if (Math.abs(velocity) > 0.01 || Math.abs(to - value) > 0.01) {
      raf = requestAnimationFrame(tick)
    } else {
      callback(to) // snap to final value
    }
  }

  raf = requestAnimationFrame(tick)
  return { stop: () => cancelAnimationFrame(raf) }
}
```

### `onVisible(element, callback, options)`

IntersectionObserver wrapper. Fires callback once when element enters viewport.

```javascript
/**
 * Fire callback when element becomes visible in viewport.
 * @param {HTMLElement} element
 * @param {(el: HTMLElement) => void} callback
 * @param {{ threshold?: number, rootMargin?: string, once?: boolean }} [opts]
 */
export function onVisible(element, callback, opts = {}) {
  const { threshold = 0.15, rootMargin = '0px', once = true } = opts
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        callback(entry.target)
        if (once) observer.unobserve(entry.target)
      }
    }
  }, { threshold, rootMargin })
  observer.observe(element)
  return { disconnect: () => observer.disconnect() }
}
```

---

## Task 6.2: Create demo page

**File:** `tools/studio-mockups/animate-utils-demo.html`

A minimal HTML page that imports `animate-utils.js` and demonstrates all 5 utilities:
- A box with hover parallax (trackMouse)
- A magnetic button (magnetic)
- A row of items that stagger-animate on visibility (stagger + onVisible)
- A spring-animated counter

This page serves as both a test and a reference for `/block-craft`.

The demo page should load the utilities from a relative path:
```html
<script type="module">
  import { trackMouse, magnetic, stagger, spring, onVisible } from '../../packages/ui/src/portal/animate-utils.js';
  // ... demo code
</script>
```

---

## Files to Modify

- `packages/ui/src/portal/animate-utils.js` — **NEW** — shared animation utilities
- `tools/studio-mockups/animate-utils-demo.html` — **NEW** — demo + test page

---

## Acceptance Criteria

- [ ] `animate-utils.js` exists at `packages/ui/src/portal/animate-utils.js`
- [ ] 5 exports: `trackMouse`, `magnetic`, `stagger`, `spring`, `onVisible`
- [ ] ES module (`export function ...`) — works with `<script type="module">`
- [ ] No npm imports — browser-native APIs only
- [ ] Only mutates `transform` and `opacity` — compositor-safe
- [ ] Each function < 300B (excluding JSDoc comments)
- [ ] Total raw file < 3KB (with comments), < 1.5KB stripped
- [ ] Demo page at `tools/studio-mockups/animate-utils-demo.html` works
- [ ] Demo: magnetic button shifts toward cursor, snaps back on leave
- [ ] Demo: parallax targets follow mouse within container
- [ ] Demo: stagger items animate with delay on scroll into view

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-006 Phase 6 Verification ==="

# 1. File exists
ls -la packages/ui/src/portal/animate-utils.js && echo "✅ Module exists" || echo "❌ Missing"

# 2. Size check
wc -c packages/ui/src/portal/animate-utils.js
echo "(target: < 3KB raw)"

# 3. All exports present
grep -c "export function" packages/ui/src/portal/animate-utils.js
echo "(expect: 5)"

# 4. No npm imports
grep "from '" packages/ui/src/portal/animate-utils.js | grep -v "from './" && echo "❌ Found external import!" || echo "✅ No external imports"

# 5. Compositor-safe — only transform and opacity mutations
grep -n "\.style\." packages/ui/src/portal/animate-utils.js
echo "(should only show .style.transform or .style.opacity)"

# 6. Demo exists
ls tools/studio-mockups/animate-utils-demo.html && echo "✅ Demo exists" || echo "❌ Demo missing"

# 7. Strip comments + whitespace, check minified size
sed '/\/\*\*/,/\*\//d; /^$/d; /^\s*\/\//d; s/^[[:space:]]*//' packages/ui/src/portal/animate-utils.js | wc -c
echo "(target: < 1.5KB stripped)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-006/phase-6-result.md`

```markdown
# Execution Log: WP-006 Phase 6 — animate-utils.js
> Workplan: WP-006 Block Import Pipeline
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|

## Files Changed
| File | Change | Description |
|------|--------|-------------|

## Issues & Workarounds

## Verification Results
| Check | Result |
|-------|--------|
| File exists | ✅/❌ |
| 5 exports | ✅/❌ |
| Size < 3KB | ✅/❌ |
| Stripped < 1.5KB | ✅/❌ |
| No external imports | ✅/❌ |
| Compositor-safe | ✅/❌ |
| Demo works | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add packages/ui/src/portal/animate-utils.js tools/studio-mockups/animate-utils-demo.html logs/wp-006/phase-6-result.md
git commit -m "feat: animate-utils.js — shared behavioral animation utilities [WP-006 phase 6]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **This is `.js` NOT `.ts`** — plain JavaScript ES module. No TypeScript compilation. Use JSDoc for type hints.
- **No build step** — file is served as-is by browser. Must work with bare `<script type="module" src="...">`.
- **ONLY `transform` and `opacity`** — if you find yourself writing `.style.left`, `.style.width`, or `.style.top`, STOP. Use `transform: translate()` instead.
- **`mouseleave` reset** — every mouse-tracking function MUST reset transform on mouseleave. Otherwise elements get stuck in translated position.
- **`spring` must stop** — return a cancel handle and ensure RAF loop terminates when settled (velocity + distance below threshold).
- **Demo import path** — from `tools/studio-mockups/` to `packages/ui/src/portal/` is `../../packages/ui/src/portal/animate-utils.js`. Verify this path works with `npx serve` from project root.
