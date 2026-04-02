# WP-006 Phase 5: Shared Portal Stylesheet — `portal-blocks.css`

> Workplan: WP-006 Block Import Pipeline
> Phase: 5 of 8
> Priority: P0
> Estimated: 1.5 hours
> Type: Frontend (CSS only)
> Previous: Phase 4 ✅ (DB `js` column + Studio JS field)
> Next: Phase 6 (animate-utils.js — shared micro-utilities for behavioral animations)

---

## Context

Blocks created via `/block-craft` contain buttons, cards, and interactive elements. Each block currently hand-rolls its own button styles inline — hover, active, focus, disabled. This means:

1. **Duplication** — every block reimplements the same button states
2. **Inconsistency** — slight differences in hover timing, active scale, focus ring
3. **No shared states** — if we change the primary hover color in Figma, every block must be updated individually

ADR-024 specifies a shared `portal-blocks.css` that ships with every portal page. Blocks reference `.cms-btn` classes instead of hand-rolling states. The stylesheet uses design tokens from `tokens.css`.

```
CURRENT:  Each block has own inline button CSS with hardcoded states     ❌
MISSING:  Shared .cms-btn classes with all variants + states            ❌
MISSING:  .cms-card hover pattern                                       ❌  
MISSING:  [data-tooltip] CSS tooltip                                    ❌
```

**Where to put it:** `apps/portal/` doesn't exist yet (WP-005D). The file goes in `packages/ui/src/portal/portal-blocks.css` — it's a shared asset consumed by Portal at build time and by Studio preview (for blocks that use `.cms-btn`). When Portal is created, it will import this file.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current button tokens — read what's available
grep -A 50 "brand semantics: buttons" packages/ui/src/theme/tokens.css | head -55

# 2. Check if packages/ui/src/portal/ directory exists
ls packages/ui/src/portal/ 2>/dev/null || echo "directory doesn't exist — create it"

# 3. Check existing UI package exports
cat packages/ui/index.ts

# 4. Current border/focus tokens
grep "border-focus\|border-strong\|rounded" packages/ui/src/theme/tokens.css | head -15

# 5. Current shadow tokens
grep "shadow-" packages/ui/src/theme/tokens.css | head -10

# 6. Check how blocks currently use buttons (test-section.html reference)
grep -A 10 "cta-container" tools/studio-mockups/test-section.html
```

**Document your findings before writing any code.**

**IMPORTANT:** This CSS file uses `var(--token)` references. It does NOT import tokens.css itself — the consuming page (Portal, Studio preview) must load tokens.css first. The file must be pure class definitions with no `@import`.

---

## Task 5.1: Create `portal-blocks.css`

### What to Build

**File:** `packages/ui/src/portal/portal-blocks.css`

A single CSS file with component classes for Portal blocks. All values via `var(--token)` from tokens.css. Target: **< 3KB minified**.

### `.cms-btn` — Button system

Base reset + 4 color variants + 4 sizes + pill modifier.

```css
/* ── Base ── */
.cms-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--button-gap);
  height: var(--button-height-default);
  padding: var(--button-padding-y-default) var(--button-padding-x-default);
  font-family: inherit;
  font-size: var(--button-font-size);
  font-weight: var(--font-weight-semibold);
  line-height: var(--button-line-height);
  border: none;
  border-radius: var(--button-radius);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease,
    box-shadow 0.15s ease;
}

/* ── Variants ── */
.cms-btn--primary {
  background-color: hsl(var(--button-primary-bg));
  color: hsl(var(--button-primary-fg));
}
.cms-btn--primary:hover {
  background-color: hsl(var(--button-primary-hover));
}

.cms-btn--secondary {
  background-color: hsl(var(--button-secondary-bg));
  color: hsl(var(--button-secondary-fg));
}
.cms-btn--secondary:hover {
  background-color: hsl(var(--button-secondary-hover));
}

.cms-btn--outline {
  background-color: transparent;
  color: hsl(var(--button-outline-fg));
  border: 1.5px solid hsl(var(--button-outline-border));
}
.cms-btn--outline:hover {
  background-color: hsl(var(--button-outline-border));
  color: hsl(var(--button-primary-fg));
}

.cms-btn--cta {
  background-color: hsl(var(--button-cta-bg));
  color: hsl(var(--button-cta-fg));
}
.cms-btn--cta:hover {
  background-color: hsl(var(--button-cta-bg) / 0.7);
}

/* ── Universal states ── */
.cms-btn:active {
  transform: scale(0.97);
  transition-duration: 0.05s;
}

.cms-btn:focus-visible {
  outline: 2px solid hsl(var(--border-focus));
  outline-offset: 2px;
}

.cms-btn:disabled,
.cms-btn[aria-disabled="true"] {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}

/* ── Sizes ── */
.cms-btn--sm {
  height: var(--button-height-sm);
  padding: var(--button-padding-y-sm) var(--button-padding-x-sm);
  font-size: var(--button-font-size-mini);
  line-height: var(--button-line-height-mini);
  gap: var(--button-gap-sm);
}

.cms-btn--lg {
  height: var(--button-height-lg);
  padding: var(--button-padding-y-lg) var(--button-padding-x-lg);
}

.cms-btn--xl {
  height: var(--button-height-xl);
  padding: var(--button-padding-y-xl) var(--button-padding-x-xl);
  font-size: var(--button-font-size-xl);
  line-height: var(--button-line-height-xl);
}

.cms-btn--pill {
  border-radius: var(--button-radius-pill);
}

/* ── Touch protection ── */
@media (hover: none) {
  .cms-btn--primary:hover { background-color: hsl(var(--button-primary-bg)); }
  .cms-btn--secondary:hover { background-color: hsl(var(--button-secondary-bg)); }
  .cms-btn--outline:hover { background-color: transparent; color: hsl(var(--button-outline-fg)); }
  .cms-btn--cta:hover { background-color: hsl(var(--button-cta-bg)); }
}
```

### `.cms-card` — Card hover pattern

```css
.cms-card {
  background-color: hsl(var(--card-bg));
  border: 1px solid hsl(var(--card-border));
  border-radius: var(--rounded-xl);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.cms-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

### `[data-tooltip]` — CSS tooltips

```css
[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-2xs) var(--spacing-xs);
  background-color: hsl(var(--bg-inverse));
  color: hsl(var(--text-inverse));
  font-size: var(--text-xs-font-size);
  line-height: var(--text-xs-line-height);
  border-radius: var(--rounded-md);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

[data-tooltip]:hover::after,
[data-tooltip]:focus::after {
  opacity: 1;
}
```

### `prefers-reduced-motion` — Global respect

```css
@media (prefers-reduced-motion: reduce) {
  .cms-btn,
  .cms-card,
  [data-tooltip]::after {
    transition-duration: 0.01ms !important;
  }
}
```

---

## Task 5.2: Export from packages/ui

### What to Build

Add the CSS file to `packages/ui` exports so consuming apps can import it.

**File:** `packages/ui/index.ts` — check current exports and add if needed. Since this is a CSS file (not a component), it will be imported directly by path in consuming apps:

```typescript
// In Portal (future) or Studio preview:
import '@cmsmasters/ui/src/portal/portal-blocks.css'
```

No changes to `index.ts` needed — CSS is imported by path, not by named export.

---

## Task 5.3: Verify size

After creating the file, check minified size:

```bash
# Quick size check (approximate — no minifier needed, just char count)
wc -c packages/ui/src/portal/portal-blocks.css
# Target: < 4KB raw, < 3KB minified (gzip would be ~1KB)
```

---

## Files to Modify

- `packages/ui/src/portal/portal-blocks.css` — **NEW** — shared component classes for Portal blocks

---

## Acceptance Criteria

- [ ] `portal-blocks.css` exists at `packages/ui/src/portal/portal-blocks.css`
- [ ] `.cms-btn` base class with transition system
- [ ] 4 color variants: `--primary`, `--secondary`, `--outline`, `--cta`
- [ ] 3 size variants: `--sm`, `--lg`, `--xl` (default = no modifier)
- [ ] `--pill` modifier for pill radius
- [ ] States: `:hover` (color change), `:active` (scale 0.97), `:focus-visible` (outline ring), `:disabled` (opacity)
- [ ] `.cms-card` with hover shadow + lift
- [ ] `[data-tooltip]` CSS-only tooltips
- [ ] `@media (hover: none)` touch protection on all button variants
- [ ] `@media (prefers-reduced-motion: reduce)` respected
- [ ] ALL values via `var(--token)` — zero hardcoded colors, sizes, shadows
- [ ] No `@import` — file is standalone (tokens.css loaded by consuming page)
- [ ] Raw file size < 4KB

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-006 Phase 5 Verification ==="

# 1. File exists
ls -la packages/ui/src/portal/portal-blocks.css && echo "✅ File exists" || echo "❌ File missing"

# 2. Size check
wc -c packages/ui/src/portal/portal-blocks.css
echo "(target: < 4KB raw)"

# 3. Has all required classes
grep -c "\.cms-btn " packages/ui/src/portal/portal-blocks.css
echo "(expect: 1+ — base class)"
grep -c "\.cms-btn--primary" packages/ui/src/portal/portal-blocks.css
echo "(expect: 2+ — base + hover)"
grep -c "\.cms-btn--secondary" packages/ui/src/portal/portal-blocks.css
echo "(expect: 2+)"
grep -c "\.cms-btn--outline" packages/ui/src/portal/portal-blocks.css
echo "(expect: 2+)"
grep -c "\.cms-btn--cta" packages/ui/src/portal/portal-blocks.css
echo "(expect: 2+)"
grep -c "focus-visible" packages/ui/src/portal/portal-blocks.css
echo "(expect: 1+)"
grep -c "disabled" packages/ui/src/portal/portal-blocks.css
echo "(expect: 1+)"
grep -c "\.cms-card" packages/ui/src/portal/portal-blocks.css
echo "(expect: 2+ — base + hover)"
grep -c "data-tooltip" packages/ui/src/portal/portal-blocks.css
echo "(expect: 3+)"
grep -c "prefers-reduced-motion" packages/ui/src/portal/portal-blocks.css
echo "(expect: 1+)"
grep -c "hover: none" packages/ui/src/portal/portal-blocks.css
echo "(expect: 1+)"

# 4. No hardcoded hex colors
grep -n "#[0-9a-fA-F]\{3,8\}" packages/ui/src/portal/portal-blocks.css && echo "❌ Found hardcoded hex!" || echo "✅ No hardcoded hex"

# 5. No @import
grep -n "@import" packages/ui/src/portal/portal-blocks.css && echo "❌ Found @import!" || echo "✅ No @import"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-006/phase-5-result.md`

```markdown
# Execution Log: WP-006 Phase 5 — portal-blocks.css
> Workplan: WP-006 Block Import Pipeline
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| File exists | ✅/❌ |
| Size < 4KB | ✅/❌ |
| All classes present | ✅/❌ |
| No hardcoded values | ✅/❌ |
| No @import | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add packages/ui/src/portal/portal-blocks.css logs/wp-006/phase-5-result.md
git commit -m "feat: portal-blocks.css — shared button/card/tooltip classes [WP-006 phase 5]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Read `tokens.css` FIRST** — all values in this CSS must reference existing tokens. If a token doesn't exist, use the closest available and note in comments.
- **Do NOT create `apps/portal/`** — the Portal app is WP-005D scope. The CSS lives in `packages/ui/` for now.
- **Do NOT add `@import` for tokens.css** — the consuming page loads it. This file is standalone class definitions.
- **Do NOT use Tailwind classes** — this is raw CSS for blocks that run outside any build pipeline.
- **Test the button visually** if possible — the classes should match the Figma Button component spec.
- **No BEM nesting** — keep selectors flat: `.cms-btn--primary:hover`, not `.cms-btn .cms-btn__text--primary:hover`.
