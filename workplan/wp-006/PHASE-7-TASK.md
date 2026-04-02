# WP-006 Phase 7: Process Pipeline — Component Detection

> Workplan: WP-006 Block Import Pipeline
> Phase: 7 of 8
> Priority: P1
> Estimated: 2 hours
> Type: Frontend
> Previous: Phase 6 ✅ (animate-utils.js — shared behavioral animation utilities)
> Next: Phase 8 (Integration testing + docs close)

---

## Context

The Process panel (Phase 1-3) scans CSS for hardcoded values and suggests token replacements. But it has no awareness of **components** — it treats a CTA button's `background: #181818` the same as a section background. Result:

1. `#181818` on a button maps to `--text-primary` instead of `--button-primary-bg`
2. No suggestion to use `.cms-btn` classes from `portal-blocks.css` (Phase 5)
3. `<div class="cta-container">` stays a `<div>` — no warning about semantics
4. Animation classes (`reveal`, `reveal-left`) could get caught by the scanner

```
CURRENT:  Scanner treats all CSS equally — no component awareness          ❌
CURRENT:  No HTML analysis — only CSS scanning                             ❌
CURRENT:  Animation classes could accidentally match                        ❌
MISSING:  Button detection → suggest .cms-btn classes                      ❌
MISSING:  Semantic HTML warnings (div used as button)                      ❌
MISSING:  Context-aware token mapping (button context → button tokens)     ❌
```

### What changes

**`block-processor.ts`** gets two new capabilities:

1. **`scanHTML(html, css)`** — analyzes HTML for component patterns, returns component-level suggestions (new category: `component`)
2. **Button-context token override** — when a selector looks like a button, color suggestions prefer `--button-*` tokens over generic ones
3. **Animation class protection** — skip selectors containing `reveal`, `animate`, `@keyframes` names

**`block-import-panel.tsx`** gets the new `component` category in the UI.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current suggestion categories
grep "category:" apps/studio/src/lib/block-processor.ts | head -10

# 2. Current Suggestion type
grep -A 5 "export interface Suggestion" apps/studio/src/lib/block-processor.ts

# 3. CATEGORY_LABEL in import panel
grep -A 8 "CATEGORY_LABEL" apps/studio/src/components/block-import-panel.tsx

# 4. How scanCSS is called — entry point
grep -B 2 -A 10 "export function scanCSS" apps/studio/src/lib/block-processor.ts

# 5. Test block HTML — what does the CTA look like?
grep -B 2 -A 5 "cta-container\|button-extended" tools/studio-mockups/test-section.html

# 6. What animation classes exist in test block?
grep "reveal" tools/studio-mockups/test-section.html | head -10

# 7. Current color context detection
grep -A 10 "function colorContext" apps/studio/src/lib/block-processor.ts

# 8. Current findClosestColorToken signature
grep -A 5 "export function findClosestColorToken" apps/studio/src/lib/token-map.ts
```

**Document your findings before writing any code.**

---

## Task 7.1: Add `component` category + `scanHTML` function

### What to Build

**File:** `apps/studio/src/lib/block-processor.ts`

**7.1a — Extend Suggestion type:**

Add `'component'` to the category union:
```typescript
category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'component'
```

**7.1b — Add `scanHTML` export:**

New function that analyzes HTML (not CSS) for component patterns. Returns suggestions in the `component` category.

```typescript
export interface ComponentSuggestion extends Suggestion {
  category: 'component'
  /** What type of component was detected */
  componentType: 'button' | 'card'
  /** Suggested class to add */
  suggestedClass: string
  /** Warning message (e.g., "div used as button") */
  warning?: string
}

/**
 * Scan HTML for component patterns, return component-level suggestions.
 */
export function scanHTML(html: string, css: string): ComponentSuggestion[]
```

Detection logic:

**Button detection — find selectors that look like buttons:**
1. Parse CSS rules, find selectors where declarations include:
   - `cursor: pointer` AND
   - (`background-color` or `background`) with a non-transparent color AND
   - (`padding` or `padding-top`) AND
   - (`border-radius`)
2. For each match, check the HTML:
   - If the element is `<div>` or `<span>` → create warning suggestion: "Use `<button>` instead of `<div>` for interactive elements"
   - Create suggestion: "Add `cms-btn cms-btn--{variant}` class" based on background color:
     - Dark bg (lightness < 30%) → `cms-btn--primary`
     - Blue bg (hue 200-240, sat > 50%) → `cms-btn--secondary`
     - Light bg with border → `cms-btn--outline`
     - Light bg without border → `cms-btn--cta`

**Output for test-section.html:**
The `.cta-container` selector has: `background: #181818` (dark), `border-radius: 12px`, `padding: 15px 35px`, implicit cursor (it's interactive). Should suggest `cms-btn--primary`.

---

## Task 7.2: Button-context token override

### What to Build

**File:** `apps/studio/src/lib/block-processor.ts`

When scanning colors, detect if the selector is a button-like element (same heuristic as 7.1). If so, use button-specific token preferences:

**File:** `apps/studio/src/lib/token-map.ts`

Add a button-context color map:

```typescript
export const buttonColorTokens: Record<string, string> = {
  '230 58% 20%': '--button-primary-bg',
  '0 0% 100%': '--button-primary-fg',
  '235 36% 24%': '--button-primary-hover',
  '227 72% 51%': '--button-secondary-bg',
  '235 67% 29%': '--button-secondary-hover',
  '206 100% 92%': '--button-cta-bg',
}
```

In `scanColors()`, when the selector matches a button pattern, check `buttonColorTokens` FIRST before falling back to generic `colorTokens`.

The button detection heuristic (shared with 7.1):
```typescript
function isButtonSelector(selector: string, rules: CSSRule[]): boolean {
  const rule = rules.find(r => r.selector === selector)
  if (!rule) return false
  const has = (prop: string) => rule.declarations.some(d => d.property === prop)
  return has('cursor') || (has('background') && has('padding') && has('border-radius'))
}
```

This makes `#181818` on `.cta-container` map to `--button-primary-bg` instead of `--text-primary`.

---

## Task 7.3: Animation class protection

### What to Build

**File:** `apps/studio/src/lib/block-processor.ts`

In `scanCSS()`, skip selectors that are animation-related:

```typescript
// Add at top of scanCSS loop, before scanning declarations
const ANIMATION_SELECTORS = /reveal|animate|visible|keyframe/i

for (const rule of rules) {
  // Skip animation-related selectors
  if (ANIMATION_SELECTORS.test(rule.selector)) continue

  for (const decl of rule.declarations) {
    // ... existing scanning
  }
}
```

This prevents:
- `.reveal` styles (opacity: 0, transform: translateY) from being tokenized
- `.reveal.visible` styles from generating suggestions
- `@keyframes` from being processed (already skipped by `parseRules`, but belt-and-suspenders)

---

## Task 7.4: Update import panel UI

### What to Build

**File:** `apps/studio/src/components/block-import-panel.tsx`

**7.4a — Add category label:**
```typescript
const CATEGORY_LABEL: Record<string, string> = {
  color: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing',
  radius: 'Border Radius',
  shadow: 'Shadows',
  component: 'Components',    // NEW
}
```

**7.4b — Call `scanHTML` alongside `scanCSS`:**

Currently the panel calls `scanCSS(originalCss)` to get suggestions. Add `scanHTML(originalHtml, originalCss)` and merge results:

```typescript
const [suggestions, setSuggestions] = useState<Suggestion[]>(() => [
  ...scanCSS(originalCss),
  ...scanHTML(originalHtml, originalCss),
])
```

**7.4c — Render component suggestions differently:**

Component suggestions may have `warning` text. Show it:
- If suggestion has `warning`, show a yellow warning icon + text below the suggestion
- If suggestion has `suggestedClass`, show as: `div.cta-container → <button class="cms-btn cms-btn--primary">`

The existing `SuggestionRow` component can handle this — just check `category === 'component'` for special rendering.

---

## Task 7.5: Wire `scanHTML` into `applyCSS` / apply pipeline

### What to Build

Component suggestions are **informational only** — they don't auto-apply CSS changes (unlike token suggestions). The `applyCSS` function only processes token replacements. Component suggestions show in the UI as recommendations for the CM to act on manually.

However, the button-context token override (7.2) IS automatic — it changes which token a color maps to, not the apply mechanism.

No changes to `applyCSS` needed. Just ensure component suggestions have `enabled: true` (visible) but don't interfere with `applyCSS`.

In `applyCSS`, filter to only process non-component suggestions:
```typescript
const enabled = suggestions
  .filter(s => s.enabled && s.category !== 'component')
  .sort(...)
```

---

## Files to Modify

- `apps/studio/src/lib/block-processor.ts` — `scanHTML`, animation protection, button context in `scanColors`
- `apps/studio/src/lib/token-map.ts` — `buttonColorTokens` map
- `apps/studio/src/components/block-import-panel.tsx` — component category label, call `scanHTML`, render warnings

---

## Acceptance Criteria

- [ ] `scanHTML(testSectionHtml, testSectionCss)` detects `.cta-container` as button-like
- [ ] Suggests `cms-btn--primary` (dark bg)
- [ ] `#181818` on `.cta-container` maps to `--button-primary-bg` (not `--text-primary`)
- [ ] `.reveal`, `.reveal-left`, etc. selectors skipped by scanner — no suggestions for animation CSS
- [ ] `component` category shows in import panel UI
- [ ] Component suggestions don't interfere with `applyCSS` token replacement
- [ ] `tsc --noEmit` clean for studio
- [ ] Test scanner script still works: `npx tsx tools/test-scanner.ts`

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-006 Phase 7 Verification ==="

# 1. TypeScript
cd "C:\work\cmsmasters portal\app\cmsmasters-portal"
npx tsc --noEmit -p apps/studio/tsconfig.json && echo "✅ Studio tsc clean" || echo "❌ Studio tsc failed"

# 2. Test scanner still works
npx tsx tools/test-scanner.ts 2>&1 | tail -20
echo "(check: no reveal/animation selectors in output, cta-container maps to --button-primary-bg)"

# 3. Component category exists
grep "component" apps/studio/src/lib/block-processor.ts | head -5
echo "(expect: category type, scanHTML export)"

# 4. Animation protection
grep "ANIMATION_SELECTORS\|reveal" apps/studio/src/lib/block-processor.ts | head -5
echo "(expect: skip pattern)"

# 5. Button color tokens
grep "buttonColorTokens" apps/studio/src/lib/token-map.ts | head -3
echo "(expect: exported map)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create: `logs/wp-006/phase-7-result.md`

---

## Git

```bash
git add apps/studio/src/lib/block-processor.ts apps/studio/src/lib/token-map.ts apps/studio/src/components/block-import-panel.tsx tools/test-scanner.ts logs/wp-006/phase-7-result.md
git commit -m "feat: component detection + animation protection in block processor [WP-006 phase 7]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Component suggestions are informational** — they show in the UI but `applyCSS` ignores them. CM reads the suggestion and manually refactors HTML if they agree.
- **Button detection is heuristic** — it may have false positives. That's OK — CM can uncheck. Better to over-detect than miss real buttons.
- **Animation protection is critical** — without it, `.reveal { opacity: 0 }` would get a suggestion to remove it, breaking the animation. The skip MUST happen at the selector level.
- **Don't modify test-scanner.ts logic** — just verify it still runs. If output changes (fewer suggestions due to animation skip), that's correct behavior.
- **`buttonColorTokens` is a small map** — only the 6 button color tokens. Don't duplicate the full colorTokens map.
