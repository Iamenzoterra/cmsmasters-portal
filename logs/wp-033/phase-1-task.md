# WP-033 Phase 1: Iframe pipeline — hover + pin protocol on tools/block-forge

> Workplan: WP-033 Block Forge Inspector — DevTools-style hover/pin + element-aware editing + token-chip integration
> Phase: 1 of 6
> Priority: P0 — pipeline foundation; everything Phase 2-4 depends on this
> Estimated: 8-10 hours
> Type: Full-stack — iframe scripts + parent React orchestrator + integration
> Previous: Phase 0 ✅ RECON — 6 rulings + Product-RECON YELLOW + slider-bug live-smoke deferred to Phase 1 kickoff
> Next: Phase 2 (Side panel — element-aware properties + breadcrumb + per-BP cells)
> Affected domains: `infra-tooling` (primary — block-forge only this phase)

---

## Context

Phase 0 RECON closed cleanly with 6 rulings + Product-RECON YELLOW. Slider-bug declarative trace shows all 3 layers correctly wired in current main (post-`ac739477`); needs **live-smoke verification at Phase 1 kickoff** before pipeline build. Phase 1 lays the **iframe ↔ parent postMessage protocol** for hover-highlight + click-to-pin + ancestor walk: outline injection, hovered/pinned state, side-panel orchestrator with breadcrumb shell. **No property editing yet** — Phase 2 fills the side panel sections; Phase 3 wires emitTweak.

```
CURRENT  ✅  WP-028 click-to-select infrastructure already in
              tools/block-forge/src/lib/preview-assets.ts:109-172
              (deriveSelector — id > stable class > nth-of-type, depth 5;
               postMessage 'block-forge:element-click' with computedStyle pull)
CURRENT  ✅  TweakPanel.tsx + selection state in App.tsx:163-192
              (currentBp typed as 1440 | 768 | 480 — see §BP normalization below)
CURRENT  ✅  composeTweakedCss(block.css, session.tweaks) helper exists at
              tools/block-forge/src/lib/session.ts:360-365 — Ruling C "no new
              helper needed" relies on this
CURRENT  ✅  Phase 0 reserved 4 new postMessage types in 'block-forge:' namespace:
              block-forge:element-hover / element-pin / element-unpin / request-pin

MISSING  ❌  Hover script (mouseenter/leave → outline data-attr → postMessage)
MISSING  ❌  Outline CSS rules ([data-inspector-state="hover"|"pin"] tokenized)
MISSING  ❌  Inspector.tsx orchestrator — owns hovered + pinned state, listens
              for 4 new postMessage types, dispatches programmatic re-pin on
              breadcrumb ancestor click
MISSING  ❌  InspectorPanel.tsx placeholder (header + breadcrumb shell;
              "Properties — Phase 2" stub for sections)
MISSING  ❌  App.tsx integration — Inspector mounted ALONGSIDE TweakPanel
              (NOT replacing yet — TweakPanel stays as no-op fallback through
              Phase 4; deletion is Phase 5)
MISSING  ❌  BP normalization 480 → 375 (align with PreviewTriptych)
```

Phase 1 deliverable is a **runnable pipeline**: open `:7702`, load any block, hover an element → outline appears in `--accent-default`; click → outline switches to `--status-success-fg`; side panel opens with selector header + breadcrumb; click on body or press Escape → outline + panel clear; click an ancestor in the breadcrumb → re-pins to that ancestor (no link/onClick side effects). Side panel still says "Properties — coming in Phase 2" for the sections region. **Studio surface is NOT touched this phase** — Phase 4 mirrors lockstep.

---

## Phase 0 carry-overs (load-bearing)

These rulings + caveats arrived from Phase 0 RECON and gate Phase 1 implementation:

### Ruling A — Selector strategy (HOLD WP-028 Ruling H)

**No selector code changes.** The existing `deriveSelector()` at `preview-assets.ts:128-150` (id > stable class > tag.class > nth-of-type, depth 5) is empirically stable: 0 Tailwind utility-collapse cases across 15 traced elements. **Phase 1 hover script piggybacks the existing function** — do NOT reimplement; do NOT modify.

### Ruling C — Slider-bug live-smoke at kickoff (CRITICAL gate)

Phase 0 §0.3 trace concluded "NOT a wiring fault" with **MEDIUM confidence (declarative)**. Phase 1 kickoff (Task 1.1 below) MUST live-verify before building any new code. If smoke fails, surface to Brain immediately — Phase 1 plan pivots to deeper Slider component trace.

### Ruling D — REIMPLEMENT (this phase: block-forge ONLY)

`packages/block-forge-ui/` package is NOT created. `pkg-block-forge-ui` domain is NOT added to manifest. New Inspector files land under `tools/block-forge/src/components/` only. Studio surface mirror is **Phase 4** — do NOT add Inspector files to `apps/studio/.../responsive/` this phase.

### Ruling E — Per-BP cell sourcing (Phase 3, NOT Phase 1)

Inspector's per-BP cells, jsdom mini-renders, PostCSS chip-source detection — all Phase 3. Phase 1's InspectorPanel is a SHELL: header + breadcrumb + "Properties — Phase 2" placeholder. NO cell rendering, NO chip detection logic.

### Ruling F — Chip emission path (Phase 3, NOT Phase 1)

`emitTweak({ bp: 0 })` is verified TOP-LEVEL. Chip click handler + `removeTweaksFor` `property` extension — Phase 3 §3.5. NOT Phase 1.

### Pre-empted findings (bake into Phase 1 hover/click scripts)

1. **postMessage namespace = `block-forge:` prefix** for all 4 new types: `element-hover`, `element-pin`, `element-unpin`, `request-pin`. NO `inspector:` prefix anywhere.
2. **rAF cleanup contract** — store `rafId` in script-scoped `let`, cancel on `mouseleave`, listener teardown on `beforeunload`. (Sketch in Phase 0 §0.8.)
3. **Template-literal escape doubling** — `\\s` becomes `\s` after template interp; double-escape is mandatory in scripts injected via `composeSrcDoc`. WP-028 Phase 2 caught a regex truncation when this rule was missed.

### YELLOW caveats (Phase 2, NOT Phase 1)

Chip-label 3-BP impact, `inheritedFrom?` PropertyRow prop, inactive-cell dim + `↗ view` — ALL Phase 2 PropertyRow design. Phase 1 doesn't render properties; caveats don't fire here. **Mention in Phase 1 result so Phase 2 task prompt has explicit reminder.**

---

## §BP normalization (load-bearing — surfaced by Phase 0 §0.11 step 7)

**Issue:** Existing types and constants in `tools/block-forge/src/` use `1440 | 768 | 480` for breakpoints (set by WP-028 TweakPanel). PreviewTriptych post-`3ff4eddf` uses `1440 / 768 / 375` widths. Inspector cells must visually match PreviewTriptych — so **Inspector aligns to 375**, not 480.

**Phase 1 normalization scope (additive — does NOT touch TweakPanel):**

- Inspector + InspectorPanel `activeBp` typed as `1440 | 768 | 375` (NOT `1440 | 768 | 480`).
- New BP picker in InspectorPanel header: `[Mobile 375] [Tablet 768] [Desktop 1440]`.
- Existing `currentBp` state in App.tsx (typed `1440 | 768 | 480`) **stays** — it feeds the legacy TweakPanel and survives until Phase 5 deletion. Inspector gets its OWN `inspectorActiveBp` state typed `1440 | 768 | 375` to avoid breaking TweakPanel.
- Two BP states coexist in App.tsx during Phase 1-4. Slightly awkward but correct: TweakPanel keeps its mental model; Inspector aligns to PreviewTriptych. Phase 5 deletion of TweakPanel collapses to one.

**Alternative considered:** widen `currentBp` to `1440 | 768 | 480 | 375` and let both panels share. Rejected: union types in narrow handlers (e.g., `bp: 480` switch cases in TweakPanel) compile-error noise, more diff surface, no real benefit while TweakPanel survives.

**Decision:** two coexisting BP states (additive). Phase 5 close collapses to Inspector's after TweakPanel deletion.

---

## Domain Context

### `infra-tooling`

- **Invariant — `tools/*` is NOT an npm workspace.** Phase 1 doesn't add new tools, but if any local install is needed (none expected), use the cd-pattern (`cd tools/block-forge && npm install`).
- **Invariant — preview-assets.ts is the iframe-script SOT.** All injected scripts live in `composeSrcDoc`. New hover script appends to existing template (does NOT create a new file).
- **Invariant — tokens for outline.** `--accent-default` (hover) and `--status-success-fg` (pin) per WP §Key Decisions. NO hardcoded colors. Saved memory `feedback_no_hardcoded_styles` applies.
- **Trap — Template-literal escape doubling.** Already mentioned. Hover script regex (if any) needs `\\s+` → emits `\s+`.
- **Trap — Hidden listeners on iframe re-mount.** Block change → iframe re-mounts; old listeners + rAF refs orphan. Cleanup contract is mandatory (Phase 0 §0.8 sketch).

### `studio-blocks`

**Read-only this phase.** Studio mirror is Phase 4. Inspector files do NOT land in `apps/studio/.../responsive/` until Phase 4. PARITY.md is updated at Phase 4, NOT now.

### `pkg-block-forge-core` (read-only)

**Untouched this phase.** Inspector consumes nothing from the engine yet (no `emitTweak` calls, no `analyzeBlock` integration). Phase 3 wires this.

### `pkg-ui` (read-only)

**Untouched this phase.** `responsive-config.json` is read by chip detection — Phase 3 only.

---

## Phase 1 Audit — re-baseline (do FIRST)

```bash
# 0. Baseline
npm run arch-test                       # expect: 544 / 544 (post-Phase-0 baseline)

# 1. Confirm post-RECON state
git log --oneline -3                    # Phase 0 commit at HEAD or near top
                                        # 6d6c1c66 docs(wp-033): phase 0 RECON ...

# 2. Spot existing Inspector-relevant infra
sed -n '109,172p' tools/block-forge/src/lib/preview-assets.ts
# Re-verify deriveSelector + click delegator (Ruling A piggybacks this)

sed -n '163,192p' tools/block-forge/src/App.tsx
# Re-verify selection state + element-click listener (Inspector adds parallel pinned state)

# 3. WP-033 BP normalization context
grep -n 'currentBp\|TweakSelection\|480' tools/block-forge/src/App.tsx | head -10
grep -n 'BREAKPOINTS\|1440 | 768 | 480' tools/block-forge/src/components/TweakPanel.tsx | head -5
# Confirms current 480-typing surface so Phase 1 normalization scope is bounded

# 4. PreviewTriptych BP widths
grep -n '375\|width:' tools/block-forge/src/components/PreviewTriptych.tsx | head -10
# Expect: 1440 / 768 / 375 in VIEWPORTS array (Phase 1 alignment target)
```

**Document any state drift** before writing code.

---

## Task 1.1: Live-smoke kickoff — verify slider applies (Ruling C gate)

### What to do

Boot block-forge at `:7702`. Load `fast-loading-speed.json`. Click any element (h2 ideal — has visible font-size). Use the existing TweakPanel font-size slider to drag from current value down to ~30px. Watch the active preview tab.

```bash
cd tools/block-forge && npm run dev &       # Background — kill after smoke
sleep 3                                       # Vite warm-up
# Visit :7702 in browser; load fast-loading-speed; click .heading; drag font-size slider
```

**Pass criteria:**
- Slider value visually changes (was already true per WP-028)
- **Active preview tab iframe re-renders** with new font-size (this is the Ruling C uncertainty)
- Switching tabs (Mobile/Tablet/Desktop) shows the change persists per BP

**Fail criteria:**
- Slider drags but iframe stays static → Ruling C wrong; root cause is deeper than declarative trace shows
- Iframe re-renders but at wrong BP scope → `bp: 480` vs `bp: 375` mismatch (BP normalization issue) — Phase 1 §BP-norm scope expands

### Output

`logs/wp-033/phase-1-result.md` §1.1 — verdict + screenshots OR Chrome DevTools network/console evidence:

```
Live-smoke verdict: ✅ GREEN — slider applies; preview iframe reflects edit; persists across BP tabs
                  | ⚠ YELLOW — applies on some BPs but not others (BP scope issue; surface)
                  | ❌ RED — slider edits don't apply; deeper trace required, escalate to Brain
```

If GREEN → Ruling C empirically confirmed; proceed to Task 1.2.
If YELLOW or RED → STOP, post evidence to Brain, do not proceed.

---

## Task 1.2: Extend `preview-assets.ts` — outline CSS rules + hover script

### What to do

Add to `tools/block-forge/src/lib/preview-assets.ts` `composeSrcDoc` template:

#### 2.1 Outline CSS rule (in `@layer shared` block)

After the existing `SLOT_CONTAINMENT_RULE` definition, add:

```ts
// WP-033 Phase 1 — Inspector outline rules. Tokenized per saved memory
// feedback_no_hardcoded_styles. Hover state uses --accent-default; pin state
// uses --status-success-fg (different colors so the two states are visually
// distinct). Outline-offset: -2px keeps outline INSIDE the element box so
// nested elements don't visually clip.
const INSPECTOR_OUTLINE_RULE = `[data-inspector-state="hover"] {
  outline: 2px solid hsl(var(--accent-default));
  outline-offset: -2px;
}
[data-inspector-state="pin"] {
  outline: 2px solid hsl(var(--status-success-fg));
  outline-offset: -2px;
}`
```

Insert into `@layer shared` block alongside `SLOT_CONTAINMENT_RULE`:

```css
@layer shared {
  ${portalBlocksCSS}
  ${SLOT_CONTAINMENT_RULE}
  ${INSPECTOR_OUTLINE_RULE}        /* NEW — Phase 1 */
}
```

#### 2.2 Hover script (rAF-throttled mouseenter/leave delegation)

Append a new `<script>` after the existing element-click delegator (around current line 173+):

```ts
<script>
  // WP-033 Phase 1 — Inspector hover delegator. rAF-throttled mouseenter/leave
  // on document.body (capture phase). Sets data-inspector-state="hover" on the
  // target; emits 'block-forge:element-hover' postMessage. Cleanup on
  // beforeunload to prevent leaks across iframe re-mount.
  //
  // Piggybacks the existing deriveSelector + CLICKABLE_TAGS guard from the
  // element-click delegator above. Defined inline in this script to keep
  // template-literal hygiene; no shared closure.
  (function () {
    const HOVER_TAGS = ['DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','NAV','MAIN',
                        'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','UL','OL','LI','IMG'];
    const UTIL_PREFIXES = ['hover:','focus:','active:','animate-','group-','peer-'];

    function stableClass(el) {
      if (!el.className || typeof el.className !== 'string') return null;
      // Double-escape \\s — see PARITY.md "template-literal escape" note
      const classes = el.className.split(/\\s+/).filter(Boolean);
      return classes.find((c) => !UTIL_PREFIXES.some((p) => c.startsWith(p))) || null;
    }

    function deriveSelector(el) {
      // Identical to element-click delegator — keep in lockstep
      if (!el || el === document.body) return 'body';
      if (el.id) return '#' + CSS.escape(el.id);
      const path = [];
      let cur = el; let depth = 0;
      while (cur && cur !== document.body && depth < 5) {
        if (cur.id) { path.unshift('#' + CSS.escape(cur.id)); break; }
        const cls = stableClass(cur);
        if (cls) {
          path.unshift(cur.tagName.toLowerCase() + '.' + CSS.escape(cls));
        } else {
          const parent = cur.parentElement;
          const siblings = parent ? Array.from(parent.children).filter((c) => c.tagName === cur.tagName) : [];
          const idx = siblings.indexOf(cur) + 1;
          path.unshift(cur.tagName.toLowerCase() + ':nth-of-type(' + idx + ')');
        }
        cur = cur.parentElement;
        depth += 1;
      }
      return path.join(' > ');
    }

    let rafId = null;
    let pendingTarget = null;
    let lastHoveredEl = null;

    function flushHover() {
      rafId = null;
      const el = pendingTarget;
      pendingTarget = null;
      if (!el || !HOVER_TAGS.includes(el.tagName)) return;

      // Clear hover state from any previous target (don't touch pinned state)
      if (lastHoveredEl && lastHoveredEl !== el) {
        if (lastHoveredEl.getAttribute('data-inspector-state') === 'hover') {
          lastHoveredEl.removeAttribute('data-inspector-state');
        }
      }
      // Don't override pin state with hover
      if (el.getAttribute('data-inspector-state') !== 'pin') {
        el.setAttribute('data-inspector-state', 'hover');
      }
      lastHoveredEl = el;

      const rect = el.getBoundingClientRect();
      parent.postMessage({
        type: 'block-forge:element-hover',
        slug: ${JSON.stringify(slug)},
        selector: deriveSelector(el),
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        tagName: el.tagName.toLowerCase(),
      }, '*');
    }

    function onMouseEnter(e) {
      pendingTarget = e.target;
      if (rafId == null) rafId = requestAnimationFrame(flushHover);
    }
    function onMouseLeave(e) {
      pendingTarget = null;
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      const t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-inspector-state') === 'hover') {
        t.removeAttribute('data-inspector-state');
      }
      if (lastHoveredEl === t) lastHoveredEl = null;
    }

    document.body.addEventListener('mouseover', onMouseEnter, true);
    document.body.addEventListener('mouseout', onMouseLeave, true);

    window.addEventListener('beforeunload', () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      document.body.removeEventListener('mouseover', onMouseEnter, true);
      document.body.removeEventListener('mouseout', onMouseLeave, true);
    });
  })();
</script>
```

**Notes:**

- Use `mouseover`/`mouseout` (which DO bubble) instead of `mouseenter`/`mouseleave` (which don't bubble) — needed for delegation on `document.body` to catch nested children. WP-028 click delegator uses the same pattern.
- The hover script does NOT prevent default or stop propagation (lets clicks still fire normally).
- `e.target` may be a non-element (e.g., text node) on rare events — guard with `el.tagName` check.
- **Pin state takes precedence over hover state** — if an element is already pinned, hover doesn't downgrade it.

#### 2.3 Pin script extension

The existing `block-forge:element-click` delegator (around line 152) MUST also emit a NEW `block-forge:element-pin` message with extended payload (ancestors array). Modify the existing handler:

```ts
document.body.addEventListener('click', (e) => {
  const el = e.target;
  if (!el || !CLICKABLE_TAGS.includes(el.tagName)) {
    // Click on body/non-clickable → emit unpin
    parent.postMessage({
      type: 'block-forge:element-unpin',
      slug: ${JSON.stringify(slug)},
    }, '*');
    return;
  }
  e.preventDefault(); e.stopPropagation();

  // Clear data-inspector-state from any previously-pinned element
  const prev = document.querySelector('[data-inspector-state="pin"]');
  if (prev && prev !== el) prev.removeAttribute('data-inspector-state');

  // Set pin state on new target
  el.setAttribute('data-inspector-state', 'pin');

  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);

  // Build ancestors array (max 8 levels to body, stable selector each)
  const ancestors = [];
  let cur = el.parentElement;
  let depth = 0;
  while (cur && cur !== document.body && depth < 8) {
    ancestors.unshift({
      selector: deriveSelector(cur),
      tagName: cur.tagName.toLowerCase(),
      classes: cur.className && typeof cur.className === 'string' ? cur.className : '',
    });
    cur = cur.parentElement;
    depth += 1;
  }

  // Existing block-forge:element-click for TweakPanel backward-compat (KEEP)
  parent.postMessage({
    type: 'block-forge:element-click',
    slug: ${JSON.stringify(slug)},
    selector: deriveSelector(el),
    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    computedStyle: {
      padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
      fontSize: cs.fontSize, gap: cs.gap, display: cs.display,
    },
  }, '*');

  // NEW — block-forge:element-pin for Inspector
  parent.postMessage({
    type: 'block-forge:element-pin',
    slug: ${JSON.stringify(slug)},
    selector: deriveSelector(el),
    rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
    computedStyle: {
      // Curated MVP per Ruling B — Phase 2 will use these
      margin: cs.margin, marginTop: cs.marginTop, marginRight: cs.marginRight,
      marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
      padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
      gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing, textAlign: cs.textAlign,
      display: cs.display, flexDirection: cs.flexDirection,
      alignItems: cs.alignItems, justifyContent: cs.justifyContent,
      gridTemplateColumns: cs.gridTemplateColumns,
    },
    ancestors,
  }, '*');
}, true);
```

**Critical:** keep the existing `block-forge:element-click` emit for TweakPanel — TweakPanel survives Phase 1-4 as a no-op fallback. Pin emit is ADDITIVE.

#### 2.4 Programmatic re-pin (parent → iframe)

Append a `message` listener inside the iframe (near the bottom of composeSrcDoc, after click handlers):

```ts
<script>
  // WP-033 Phase 1 — programmatic re-pin (parent breadcrumb click → iframe).
  // Receives 'block-forge:request-pin' from parent; finds element by selector;
  // dispatches the pin logic WITHOUT firing a real click event (avoids triggering
  // user-click side effects like <a> navigation).
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'block-forge:request-pin') return;
    if (d.slug !== ${JSON.stringify(slug)}) return;
    const el = document.querySelector(d.selector);
    if (!el) {
      parent.postMessage({ type: 'block-forge:element-unpin', slug: ${JSON.stringify(slug)} }, '*');
      return;
    }
    // Reuse pin logic by simulating the click handler internals (NO click event)
    const prev = document.querySelector('[data-inspector-state="pin"]');
    if (prev && prev !== el) prev.removeAttribute('data-inspector-state');
    el.setAttribute('data-inspector-state', 'pin');

    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const ancestors = [];
    let cur = el.parentElement; let depth = 0;
    // ... same ancestor build as above, factored if Hands prefers ...
    parent.postMessage({
      type: 'block-forge:element-pin',
      slug: ${JSON.stringify(slug)},
      selector: d.selector,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      computedStyle: { /* same shape */ },
      ancestors,
    }, '*');
  });
</script>
```

**Refactoring note:** the click delegator + request-pin listener share the "build pin payload" logic. If Hands prefers, factor into an inline helper `buildPinPayload(el)` defined once in the iframe script scope. Keep both call sites consuming it.

### Output

§1.2 — confirmation that:
- INSPECTOR_OUTLINE_RULE injected in @layer shared
- Hover script appended after click delegator
- Click delegator extended with element-pin emit (additive — element-click still fires)
- request-pin listener installed
- Manual smoke: hover an element → outline appears (in `--accent-default`); click → switches to `--status-success-fg`; click body → both clear

---

## Task 1.3: Create `Inspector.tsx` orchestrator

### What to do

`tools/block-forge/src/components/Inspector.tsx` — owns hovered + pinned state; listens for 4 postMessage types; renders InspectorPanel.

```ts
import * as React from 'react'
import type { BlockJson } from '../types'
import { InspectorPanel } from './InspectorPanel'

export type ElementHover = {
  selector: string
  rect: { x: number; y: number; w: number; h: number }
  tagName: string
}

export type ElementPin = {
  selector: string
  rect: { x: number; y: number; w: number; h: number }
  computedStyle: Record<string, string>   // Curated MVP per Ruling B
  ancestors: Array<{ selector: string; tagName: string; classes: string }>
}

export type InspectorActiveBp = 1440 | 768 | 375     // Phase 1 BP normalization

interface Props {
  block: BlockJson | null
  /**
   * Lifted shared with PreviewTriptych — Inspector activeBp tracks tab BP
   * (Phase 1 §BP normalization). Two-way: PreviewTriptych tab change updates
   * activeBp; Inspector BP picker (Phase 2) updates the same.
   */
  activeBp: InspectorActiveBp
  onActiveBpChange: (bp: InspectorActiveBp) => void
}

export function Inspector({ block, activeBp, onActiveBpChange }: Props) {
  const [hovered, setHovered] = React.useState<ElementHover | null>(null)
  const [pinned, setPinned] = React.useState<ElementPin | null>(null)
  const slug = block?.slug ?? null

  // Clear both on block switch
  React.useEffect(() => {
    setHovered(null)
    setPinned(null)
  }, [slug])

  // Listen for postMessages
  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      const data = e.data as { type?: string; slug?: string; [k: string]: unknown }
      if (data.type === undefined || !data.type.startsWith('block-forge:element-')) return
      // Filter by slug — multiple iframes may exist (preview-triptych post-tab refactor
      // has only one mounted, but guard regardless)
      if (slug && data.slug !== slug) return

      switch (data.type) {
        case 'block-forge:element-hover': {
          const { selector, rect, tagName } = data as unknown as ElementHover & { type: string; slug: string }
          if (typeof selector !== 'string') return
          setHovered({ selector, rect, tagName })
          break
        }
        case 'block-forge:element-pin': {
          const d = data as unknown as ElementPin & { type: string; slug: string }
          if (typeof d.selector !== 'string') return
          setPinned({
            selector: d.selector,
            rect: d.rect,
            computedStyle: d.computedStyle,
            ancestors: d.ancestors ?? [],
          })
          setHovered(null)
          break
        }
        case 'block-forge:element-unpin': {
          setPinned(null)
          break
        }
        // request-pin is parent→iframe only; not received here
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [slug])

  // Escape clears pin
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && pinned) {
        setPinned(null)
        // Tell iframe to clear data-attr
        const iframes = document.querySelectorAll('iframe[title^="' + (slug ?? '') + '"]')
        iframes.forEach((f) => {
          (f as HTMLIFrameElement).contentWindow?.postMessage({
            type: 'block-forge:request-pin',
            slug,
            selector: '__clear__',  // NOTE: iframe handles unknown selector by emitting unpin
          }, '*')
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned, slug])

  // Programmatic re-pin (breadcrumb ancestor click)
  const requestRepin = React.useCallback((selector: string) => {
    if (!slug) return
    const iframes = document.querySelectorAll('iframe[title^="' + slug + '"]')
    iframes.forEach((f) => {
      (f as HTMLIFrameElement).contentWindow?.postMessage({
        type: 'block-forge:request-pin', slug, selector,
      }, '*')
    })
  }, [slug])

  return (
    <InspectorPanel
      hovered={hovered}
      pinned={pinned}
      activeBp={activeBp}
      onActiveBpChange={onActiveBpChange}
      onAncestorClick={requestRepin}
    />
  )
}
```

**Critical points:**

- `setHovered(null)` when pin lands — hover shouldn't show alongside pin (visual conflict).
- Escape posts `request-pin` with sentinel selector `__clear__`; iframe's request-pin listener interprets unknown selector → emits unpin (you may want a dedicated `request-unpin` instead — Hands' call; document choice).
- `iframe[title^="..."]` selector relies on PreviewPanel's iframe `title={`${block.slug}-${width}`}` — verify this still holds post-`3ff4eddf`.

### Output

§1.3 — confirmation file created + manual smoke that hover/pin states update correctly in React DevTools.

---

## Task 1.4: Create `InspectorPanel.tsx` shell

### What to do

`tools/block-forge/src/components/InspectorPanel.tsx` — header + breadcrumb + sections placeholder.

```ts
import * as React from 'react'
import type { ElementHover, ElementPin, InspectorActiveBp } from './Inspector'

interface Props {
  hovered: ElementHover | null
  pinned: ElementPin | null
  activeBp: InspectorActiveBp
  onActiveBpChange: (bp: InspectorActiveBp) => void
  onAncestorClick: (selector: string) => void
  'data-testid'?: string
}

const BPs: ReadonlyArray<InspectorActiveBp> = [1440, 768, 375]
const BP_LABELS: Record<InspectorActiveBp, string> = {
  1440: 'Desktop',
  768: 'Tablet',
  375: 'Mobile',
}

export function InspectorPanel(props: Props) {
  const testId = props['data-testid'] ?? 'inspector-panel'
  const { hovered, pinned, activeBp, onActiveBpChange, onAncestorClick } = props

  // Empty state — no pin
  if (!pinned) {
    return (
      <div
        data-testid={testId}
        data-empty="true"
        aria-label="Inspector panel"
        className="flex flex-col gap-2 p-4 text-[hsl(var(--text-muted))] text-[length:var(--text-sm-font-size)]"
      >
        <div className="font-[number:var(--font-weight-medium)] text-[hsl(var(--text-default))]">
          Inspector
        </div>
        <div>
          {hovered
            ? `Hovering: ${hovered.tagName} · ${hovered.selector}`
            : 'Click an element in the preview to inspect it.'}
        </div>
      </div>
    )
  }

  // Pinned state — header + breadcrumb + placeholder sections
  const primaryClass =
    pinned.selector.split(' ').pop()?.split('.')[1]?.split(':')[0] ?? ''
  const tagName =
    pinned.ancestors.length > 0 ? '' : pinned.selector.split(/[.#:]/)[0]

  return (
    <div
      data-testid={testId}
      aria-label="Inspector panel"
      className="flex flex-col gap-3 p-4 text-[length:var(--text-sm-font-size)]"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="font-[number:var(--font-weight-semibold)] text-[hsl(var(--text-default))]">
          Element: {pinned.selector.split(' ').pop()}
        </div>
        <div className="text-[hsl(var(--text-muted))] text-[length:var(--text-xs-font-size)] font-mono">
          {pinned.selector}
        </div>
      </div>

      {/* Breadcrumb */}
      {pinned.ancestors.length > 0 && (
        <nav
          aria-label="Element ancestry"
          className="flex flex-wrap gap-1 text-[hsl(var(--text-muted))] text-[length:var(--text-xs-font-size)]"
        >
          {pinned.ancestors.map((a, i) => (
            <React.Fragment key={a.selector + i}>
              <button
                type="button"
                onClick={() => onAncestorClick(a.selector)}
                className="hover:text-[hsl(var(--text-default))] underline-offset-2 hover:underline"
                title={`Click to inspect ${a.selector}`}
              >
                {a.tagName}
                {a.classes && a.classes.split(' ').filter(Boolean).slice(0, 1).map(c => '.' + c).join('')}
              </button>
              <span aria-hidden="true">{'>'}</span>
            </React.Fragment>
          ))}
          <span className="text-[hsl(var(--text-default))] font-[number:var(--font-weight-medium)]">
            {pinned.selector.split(' ').pop()}
          </span>
        </nav>
      )}

      {/* BP picker (Phase 1 — informational; Phase 2 wires per-BP cells) */}
      <div className="flex items-center gap-2">
        <span className="text-[hsl(var(--text-muted))]">BP:</span>
        <div role="radiogroup" aria-label="Active breakpoint" className="inline-flex gap-1">
          {BPs.map((bp) => (
            <button
              key={bp}
              type="button"
              role="radio"
              aria-checked={activeBp === bp}
              onClick={() => onActiveBpChange(bp)}
              data-active={activeBp === bp ? 'true' : 'false'}
              className="px-2 py-1 rounded border border-[hsl(var(--border-default))] data-[active=true]:bg-[hsl(var(--accent-default))] data-[active=true]:text-[hsl(var(--accent-fg))]"
            >
              {BP_LABELS[bp]} {bp}
            </button>
          ))}
        </div>
      </div>

      {/* Sections placeholder — Phase 2 fills */}
      <div
        data-testid="inspector-properties-placeholder"
        className="rounded border border-dashed border-[hsl(var(--border-default))] p-3 text-[hsl(var(--text-muted))]"
      >
        Properties — coming in Phase 2 (Spacing · Typography · Layout · Visibility)
      </div>
    </div>
  )
}
```

**Style rules (saved memory `feedback_no_hardcoded_styles`):**
- Colors via `hsl(var(--token))` in arbitrary class
- Font sizes via `text-[length:var(--text-X-font-size)]`
- Font weights via `font-[number:var(--font-weight-Y)]`
- NO `text-gray-500`, NO inline `style={{ color: '...' }}`

### Output

§1.4 — file created + screenshot/note showing empty state, hovered state hint, pinned state with breadcrumb.

---

## Task 1.5: Wire Inspector into App.tsx

### What to do

Modify `tools/block-forge/src/App.tsx`:

1. **Add Inspector state** — separate `inspectorActiveBp: InspectorActiveBp` state, initial `1440`.
2. **Lift activeBp shared between Inspector + PreviewTriptych** — when PreviewTriptych tab changes, update inspectorActiveBp; when Inspector BP picker changes (Phase 2), update PreviewTriptych. **Phase 1 only handles the PreviewTriptych → Inspector direction; Phase 2 wires the reverse.**
3. **Mount Inspector ALONGSIDE TweakPanel** — both visible during Phase 1-4. Place Inspector above TweakPanel in the side-panel column. Phase 5 deletes TweakPanel.
4. **NO removal of existing TweakPanel mount, selection state, currentBp state, debouncedAddTweak, handleTweak, handleBpChange.** All TweakPanel infrastructure is preserved.

```ts
// Add near currentBp:
const [inspectorActiveBp, setInspectorActiveBp] = useState<InspectorActiveBp>(1440)

// Add: when PreviewTriptych tab changes, sync inspectorActiveBp
// (PreviewTriptych currently doesn't lift its activeId; this Phase 1 adds a
// new prop `onActiveBpChange?: (bp: 1440 | 768 | 375) => void` to
// PreviewTriptych and a useEffect that maps activeId → bp.)
// Implementation note: easiest approach is to also lift PreviewTriptych's
// activeId state to App.tsx. PreviewTriptych currently owns activeId internally
// (line 41 in PreviewTriptych.tsx). Phase 1 lifts it.

// In JSX side-panel column:
<Inspector
  block={composedBlock}
  activeBp={inspectorActiveBp}
  onActiveBpChange={(bp) => {
    setInspectorActiveBp(bp)
    // Phase 2 will also call PreviewTriptych setActiveId(...) to sync
  }}
/>
{/* Existing TweakPanel kept — Phase 5 deletes */}
<TweakPanel ... />
```

**PreviewTriptych lift change** (`tools/block-forge/src/components/PreviewTriptych.tsx`):
- Add prop `activeId?: ViewportId; onActiveIdChange?: (id: ViewportId) => void`
- Internally still default-uncontrolled if props not passed (backward-compat), but use props when supplied
- App.tsx passes both; tab change in PreviewTriptych emits `onActiveIdChange` → App.tsx maps to inspectorActiveBp

### Output

§1.5 — App.tsx + PreviewTriptych diff documented; manual smoke: switch tab in preview → BP picker in InspectorPanel updates.

---

## Task 1.6: Tests

### What to do

`tools/block-forge/src/components/__tests__/Inspector.test.tsx`:

- Mount Inspector with mock block + activeBp + handlers
- Simulate `window.postMessage({ type: 'block-forge:element-hover', slug, selector, rect, tagName })` → assert hovered state set; InspectorPanel renders "Hovering: …" hint
- Simulate `block-forge:element-pin` with full payload (computedStyle + ancestors) → assert pinned state set; hovered cleared; InspectorPanel renders header + breadcrumb
- Simulate `block-forge:element-unpin` → assert pinned cleared
- Simulate Escape keydown when pinned → assert pinned cleared
- Simulate slug mismatch → assert state untouched (filter discriminator)

`tools/block-forge/src/components/__tests__/InspectorPanel.test.tsx`:

- Render with `pinned: null, hovered: null` → empty state copy renders
- Render with `pinned: null, hovered: { selector: '.foo', tagName: 'h2', rect }` → hover hint renders
- Render with full pinned state + 3 ancestors → breadcrumb renders 3 buttons; click ancestor → onAncestorClick called with that selector
- BP picker → click `Mobile 375` → onActiveBpChange called with `375`

**No live preview / iframe tests in Phase 1.** Phase 3 adds the render-level pin (`inspector-pipeline.test.tsx`).

### Output

§1.6 — tests passing; coverage of hover / pin / unpin / Escape / breadcrumb ancestry / BP picker.

---

## Task 1.7: Manifest update + arch-test

### What to do

Add new files to `infra-tooling.owned_files` in `src/__arch__/domain-manifest.ts`:

```ts
'infra-tooling': {
  owned_files: [
    // ... existing entries ...

    // WP-033 Phase 1 — Inspector pipeline
    'tools/block-forge/src/components/Inspector.tsx',
    'tools/block-forge/src/components/InspectorPanel.tsx',
    'tools/block-forge/src/components/__tests__/Inspector.test.tsx',
    'tools/block-forge/src/components/__tests__/InspectorPanel.test.tsx',
  ],
},
```

Verify `npm run arch-test` — expected delta: +8 (4 new owned_files × 2 tests each: path-existence + ownership). Baseline 544 → target **552**.

### Output

§1.7 — arch-test pass with target count.

---

## Files to Modify

- `tools/block-forge/src/lib/preview-assets.ts` — INSPECTOR_OUTLINE_RULE injected; hover script appended; click delegator extended; request-pin listener added
- `tools/block-forge/src/components/Inspector.tsx` — NEW
- `tools/block-forge/src/components/InspectorPanel.tsx` — NEW
- `tools/block-forge/src/components/__tests__/Inspector.test.tsx` — NEW
- `tools/block-forge/src/components/__tests__/InspectorPanel.test.tsx` — NEW
- `tools/block-forge/src/components/PreviewTriptych.tsx` — activeId lifted (props-controlled with backward-compat)
- `tools/block-forge/src/App.tsx` — inspectorActiveBp state + Inspector mount alongside TweakPanel
- `src/__arch__/domain-manifest.ts` — 4 owned_files added

**Out of scope (do NOT touch):**
- `apps/studio/**` (Phase 4 mirror)
- `packages/block-forge-core/**` (engine locked)
- `packages/ui/**` (read-only)
- `tools/block-forge/src/components/TweakPanel.tsx` (Phase 5 deletion)

---

## Acceptance Criteria

- [ ] **Task 1.1 live-smoke verdict GREEN** (slider applies; preview reflects edit; Ruling C empirically confirmed)
- [ ] Hover any element in preview iframe → outline appears via CSS rule (`--accent-default`); rAF-throttled at 60fps; no DOM mutation per hover (only `data-inspector-state` attribute toggle)
- [ ] Click any element → outline switches to `--status-success-fg`; Inspector panel header + selector + breadcrumb populate
- [ ] Click on body / non-clickable → both outline + panel clear (unpin)
- [ ] Escape (when pinned) → pin clears
- [ ] Click breadcrumb ancestor → re-pins to ancestor; **NO link/onClick side effects on ancestor** (no navigation, no scroll)
- [ ] PreviewTriptych tab change → InspectorPanel BP picker updates (one-way Phase 1; reverse direction Phase 2)
- [ ] Inspector + TweakPanel coexist (TweakPanel still functional; existing element-click postMessage still flows for backward-compat)
- [ ] No hardcoded colors / fonts / shadows; tokens via `hsl(var(--X))` and `text-[length:var(--Y)]` (saved memory `feedback_no_hardcoded_styles`)
- [ ] No `inspector:` namespace anywhere; all 4 new types use `block-forge:element-*` prefix (Pre-empted finding A)
- [ ] rAF cleanup: hover script removes listeners on `beforeunload`; cancels pending rAF on `mouseout`
- [ ] All test cases pass (Inspector + InspectorPanel unit tests)
- [ ] `npm run arch-test` returns **552 / 552** (+8 from baseline 544)
- [ ] `npm run typecheck` clean
- [ ] No mutations to `apps/studio/**`, `packages/**`, `tools/block-forge/src/components/TweakPanel.tsx`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Arch tests — +8 expected
npm run arch-test
echo "(expect: 552 / 552 — baseline 544 + 8 new)"

# 2. Typecheck
npm run typecheck
echo "(expect: clean)"

# 3. block-forge package tests
cd tools/block-forge && npm run test 2>&1 | tail -20 && cd ../..
echo "(expect: Inspector + InspectorPanel suites green)"

# 4. Studio surface untouched
git diff --stat HEAD -- apps/studio/ packages/ | wc -l
echo "(expect: 0 — Studio + packages NOT modified this phase)"

# 5. TweakPanel still in tree
test -f tools/block-forge/src/components/TweakPanel.tsx && echo "✅ TweakPanel preserved (Phase 5 deletes)"

# 6. Manual live-smoke checklist
cat <<'EOF'
Manual checks at :7702:
  [ ] Hover an element → outline appears in --accent-default
  [ ] Click element → outline switches to --status-success-fg, panel opens
  [ ] Hover a different element while one pinned → pinned outline survives;
      hover outline appears on the new element (independent state)
  [ ] Click body → unpin; outline clears
  [ ] Escape → unpin
  [ ] Click breadcrumb ancestor → re-pins (no link nav)
  [ ] Switch PreviewTriptych tab → InspectorPanel BP picker updates
  [ ] TweakPanel still works (drag font-size slider; preview reflects)
EOF

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-033/phase-1-result.md`:

```markdown
# Execution Log: WP-033 Phase 1 — Iframe pipeline (hover + pin protocol)

> Epic: WP-033 Block Forge Inspector
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling (block-forge only)

## What Was Implemented
{2-5 sentences — pipeline foundation: outline rules, hover script, pin extension, Inspector orchestrator, InspectorPanel shell, App.tsx integration}

## §1.1 Live-smoke verdict
{GREEN/YELLOW/RED + screenshots/evidence on slider applies}

## §1.2 preview-assets.ts diff
{Outline rule + hover script + pin extension + request-pin listener}

## §1.3 Inspector.tsx
{Created; state machine summary}

## §1.4 InspectorPanel.tsx
{Created; empty/hovered/pinned states}

## §1.5 App.tsx + PreviewTriptych integration
{inspectorActiveBp state + lifted activeId}

## §1.6 Tests
{Suite count + assertion count}

## §1.7 Manifest update
{4 new owned_files; arch-test 552/552}

## Issues & Workarounds
{Surprises during impl; "None" if clean}

## Open Questions for Phase 2
{Any non-blocking question carried forward; e.g., "should Inspector BP picker
also update PreviewTriptych — Phase 2 reverse-direction wiring approach"}

## Phase 2 reminders (Ruling-deferred items + YELLOW caveats)
- Per-BP cell sourcing (Ruling E) — Option A jsdom + Option B-subset PostCSS
- Chip detection (Ruling F + caveat 1) — chip label format `[Use --token ✓ — sets X/Y/Z at all 3 BPs]`
- PropertyRow `inheritedFrom?` prop (caveat 2)
- Inactive cells dim + `↗ view` icon (caveat 3)

## Verification Results
| Check | Result |
|-------|--------|
| Live-smoke (Ruling C) | ✅ GREEN |
| arch-test | ✅ 552/552 (+8) |
| typecheck | ✅ clean |
| block-forge unit tests | ✅ N suites / M assertions |
| No Studio/packages mutations | ✅ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add tools/block-forge/src/lib/preview-assets.ts \
        tools/block-forge/src/components/Inspector.tsx \
        tools/block-forge/src/components/InspectorPanel.tsx \
        tools/block-forge/src/components/__tests__/Inspector.test.tsx \
        tools/block-forge/src/components/__tests__/InspectorPanel.test.tsx \
        tools/block-forge/src/components/PreviewTriptych.tsx \
        tools/block-forge/src/App.tsx \
        src/__arch__/domain-manifest.ts \
        logs/wp-033/phase-1-result.md

git commit -m "feat(block-forge): WP-033 Phase 1 — Inspector pipeline (hover/pin postMessage + outline + side-panel shell) [WP-033 phase 1]"
```

---

## IMPORTANT Notes for CC (Hands)

- **Live-smoke FIRST.** Task 1.1 is a gate. If RED, halt + escalate; do NOT proceed to write Inspector code on a broken pipeline.
- **TweakPanel stays.** Phase 1 is ADDITIVE. TweakPanel + selection state + currentBp + debouncedAddTweak — all preserved. Phase 5 deletes.
- **Two BP states coexist.** `currentBp: 1440 | 768 | 480` (TweakPanel-bound) and `inspectorActiveBp: 1440 | 768 | 375` (Inspector-bound). DO NOT unify in Phase 1.
- **Template-literal escape doubling.** `\\s` in regex literal in injected script — required; misses cause "matches literal s+" bug (WP-028 Phase 2 caught this).
- **Tokens-only styles.** Outline colors via `--accent-default` + `--status-success-fg`. Spacing/typography in InspectorPanel via existing tokens. Saved memory `feedback_no_hardcoded_styles` is enforced by `lint-ds`.
- **Studio surface zero touch.** No file under `apps/studio/**` should appear in the diff. Phase 4 handles cross-surface mirror.
- **Surface to Brain immediately if:**
  - Task 1.1 live-smoke verdict YELLOW or RED
  - PreviewTriptych iframe `title` attribute pattern (`{slug}-{width}`) has changed since current main — `iframe[title^="..."]` query in Inspector.tsx Escape handler depends on it
  - rAF cleanup leaks observed in DevTools memory profile (load 5 blocks; expect stable heap)
  - Outline visibly clips inside nested elements (outline-offset: -2px should prevent; if not, propose alternative — could be ghost outline div)
  - Any postMessage type collision surfaces at runtime

---
---

# Brain → Operator handoff summary

(Posted to Operator after this task file is written; not part of the file Hands receives.)
