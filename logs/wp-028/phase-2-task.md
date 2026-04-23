# WP-028 Phase 2: Tweak panel — click-to-select + per-BP sliders + emitTweak wiring

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 2 of 7
> Priority: P0
> Estimated: ~5 hours (HARD CAP: 6h — overrun triggers WP-028a split re-evaluation at Phase 3 handoff)
> Type: Frontend (feature — real component behavior, no new scaffolding)
> Previous: Phase 1 ✅ (foundation — RHF variants + pkg-ui primitives + placeholders; commits `0eab5493 → b306c622`; arch-test 499/0)
> Next: Phase 3 (Variants drawer — fork/rename/delete + Path B re-converge in tools/block-forge)
> Affected domains: infra-tooling (session.ts tweaks extension + TweakPanel + preview click-handler), studio-blocks (ResponsiveTab wiring + TweakPanel + RHF dispatch), pkg-ui (read-only Slider consumer)

---

## Context

Phase 1 landed the foundation: TweakPanel placeholders exist on both surfaces (byte-identical mod 3-line header), pkg-ui ships `Slider` + `Drawer` primitives, RHF `BlockFormData.variants` field is wired, 4 parity `.snap` files anchor cross-surface identity. Zero feature logic. Phase 2 upgrades the TweakPanel placeholder to a **real component**: click-to-edit element selection via iframe `postMessage`, per-BP slider stack (padding / font-size / gap / hide-show), `emitTweak` dispatch with debounced preview reload, and Reset button.

```
CURRENT (after Phase 1):
  TweakPanel placeholder × 2:  pure-render, accepts `selector` + `bp`, renders empty div    ✅
  RHF form:                    variants field live; form.code is dispatch source-of-truth   ✅
  pkg-ui Slider:               radix-backed, tokens-driven, ready to consume                ✅
  session.ts (block-forge):    accepted/rejected/actionLog only — no tweaks slot            ⚠ Phase 2 extends

MISSING (Phase 2 adds):
  Iframe click-handler injection → element-click postMessage                                ❌
  Parent listener + selection state (ResponsiveTab / App.tsx)                               ❌
  TweakPanel real impl: 4 slider rows + BP picker + Reset                                   ❌
  Tweak dispatch (debounced 300ms) with OQ4 invariant                                       ❌
  session.ts tweaks extension (block-forge) — Studio uses RHF, no mirror                    ❌
  Preview compose on block-forge: applyAllTweaks(base.css, session.tweaks)                  ❌
  Behavioral test for OQ4 dispatch-source-of-truth invariant                                ❌
```

Phase 2 is pure behavior — zero new files, zero scaffolding. Arch-test target: **499 / 0 unchanged**. All work is edits to existing files.

---

## Domain Context

**infra-tooling** (`status: full`):
- Key invariants: PARITY discipline; port 7702; file-based I/O; session.ts is pure reducer (accept/reject/undo); existing hooks live in `src/lib/`.
- Phase 2 adds: `tweaks: Tweak[]` array to `SessionState`; reducer actions `addTweak`, `removeTweaksFor`; undo() extends to pop either tweak OR accept (chronological); helper `composeTweakedCss(baseCss, tweaks)`.
- Trap: **Do NOT modify preview-assets.ts wrap structure** — the double-wrap is deliberate until Phase 3 Path B re-converge. Phase 2 adds click-handler injection **strictly additively** to the runtime `<script>` section (L74-81 area).

**studio-blocks** (`status: full`):
- Key invariants: RHF `formState.isDirty` canonical; session-state is pure (no dirty coupling); 2-tab bar stays 2-tab.
- Phase 2 adds: parent listener in `ResponsiveTab.tsx` for `block-forge:element-click` postMessage; `selection: { selector, bp } | null` state lifted to ResponsiveTab; TweakPanel props wiring; dispatch via `form.setValue('code', emitTweak(tweak, form.getValues('code')), { shouldDirty: true })`.
- Trap: **OQ4 invariant** — `form.getValues('code')` at DISPATCH time (not render time, not block.css from DB). Behavioral test in 2.7 enforces.

**pkg-ui** (`status: full`) — read-only consumer:
- Slider consumed from Phase 1 scaffold; `Slider` takes `value` + `onValueChange` + `min` + `max` + `step`. Sized via Tailwind scale (no Figma Slider tokens yet).

**pkg-block-forge-core** (`status: full`) — read-only consumer:
- `emitTweak(tweak: Tweak, css: string): string` — Phase 0 carry-over (a) signature locked. PostCSS-based, 3 cases (A/B/C).
- `Tweak = { selector, bp, property, value }` — exact shape.
- Engine FROZEN for WP-028. Zero edits to `packages/block-forge-core/`.

---

## Brain Rulings (Phase 2 additions; A/B/C/OQ1–7 carry forward from Phase 0/1)

| # | Ruling | Why |
|---|---|---|
| D | **session.ts extension shape** = `tweaks: Tweak[]` array (NOT `currentCss: string`) | Preserves existing reducer purity + enables undo uniformly across accept/reject/tweak. Compose via helper at render time. |
| E | **preview-assets.ts Phase 2 edits = STRICTLY ADDITIVE** — new `<script>` block for click-handler only. No wrap structure change, no layer order change, no slot wrapper change. Path B re-converge stays Phase 3. | Separates "add tweak UI" from "refactor render pipeline" — each phase does one thing. |
| F | **Padding slider uses shorthand `padding: {N}px`** (all-sides) for Phase 2 MVP. Per-side (top/right/bottom/left) is Phase 2.5 polish if budget permits. | Ships the end-to-end loop fast; 80% of author use-cases are symmetric padding anyway. |
| G | **Slider step sizes locked**: padding 4px, gap 4px, font-size 2px, hide/show boolean toggle. Ranges: padding 0–128, gap 0–64, font-size 8–72. Defaults seeded from computedStyle. | Per workplan Key Decisions row — matches design-on-4/8px-grid author mental model. |
| H | **Selector derivation priority**: `#id` > single stable `.class` > `tag:nth-of-type(N)` fallback walk. Stops at first element with id OR stable class (not utility/state classes like `hover`, `active`). Max depth 5 before falling back to full path. | Produces human-readable selectors that survive minor DOM churn. Brittleness is a Phase 2.5 concern if it bites. |
| I | **Debounce** = 300ms on dispatch side (Studio) / on composedCss recompute side (block-forge). No debounce on slider onValueChange itself — Slider fires continuously during drag; debounce wraps the `emitTweak` dispatch. | Author sees live slider position; preview catches up after 300ms pause. Matches live-feedback-but-not-thrash UX. |
| J | **Reset button scope** = removes all tweaks matching currently-selected `{selector, bp}` pair. Does NOT affect tweaks at other BPs for same selector. Does NOT affect other selectors. | Narrow-scope reset preserves author's work elsewhere. |
| K | **BP picker affordance** = radio-group-like segment toggle inside TweakPanel header: `1440 | 768 | 480`. Default = current preview panel width. Switching BP keeps selected element, just changes WHICH tweaks the sliders reflect/emit. | Natural "what am I tweaking" affordance without leaving the panel. |

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline — arch-test must be 499/0 entry (Phase 1 exit)
npm run arch-test
# expected: 499 tests, 0 failures

# 1. Git state clean
git status --porcelain
# expected: pre-existing untracked noise OK; no tracked-modified

# 2. Engine exports available (Phase 0 carry-over a + index.ts)
grep -n "emitTweak\|^export.*Tweak\b" packages/block-forge-core/src/index.ts
# expected: emitTweak + Tweak type both exported

# 3. session.ts current shape (block-forge)
grep -nE "^export|SessionState|SessionAction" tools/block-forge/src/lib/session.ts
# expected: 9 exports (createSession, accept, reject, undo, clearAfterSave, isActOn, pickAccepted, isDirty, types)

# 4. session.test.ts exists (block-forge)
test -f tools/block-forge/src/__tests__/session.test.ts && echo "session tests OK"
wc -l tools/block-forge/src/__tests__/session.test.ts

# 5. preview-assets.ts injection site (block-forge)
grep -nB 2 -A 8 "block-forge:iframe-height" tools/block-forge/src/lib/preview-assets.ts
# expected: ResizeObserver script at L74-81 area — click-handler injection goes after it

# 6. Studio preview-assets.ts equivalent injection site
grep -nB 2 -A 8 "block-forge:iframe-height" apps/studio/src/pages/block-editor/responsive/preview-assets.ts
# expected: same iframe-height script

# 7. ResponsiveTab.tsx current shape (selection state lands here)
grep -n "useState\|useEffect\|form\." apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx | head -20

# 8. App.tsx current shape (block-forge — selection state lands here)
grep -n "useState\|useEffect\|session" tools/block-forge/src/App.tsx | head -20

# 9. Placeholder TweakPanel files — Phase 2 upgrades in place (NO rename, NO new files)
cat tools/block-forge/src/components/TweakPanel.tsx
cat apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
# expected: Phase 1 placeholder shape; Phase 2 replaces body + extends props

# 10. Existing tests green before changes
npm -w @cmsmasters/studio test -- --run
npm -w @cmsmasters/block-forge run test -- --run
# expected: all green (Phase 1 baseline)
```

**Document findings before writing any code.**

**IMPORTANT:** If `session.test.ts` is missing OR `preview-assets.ts` structure differs from Phase 0 carry-over expectations, STOP and surface via escalation trigger 2 below.

---

## Task 2.1: Iframe click-handler injection (both surfaces)

### What to Build

Add a new `<script>` block to `preview-assets.ts` on both surfaces, placed AFTER the existing ResizeObserver script. Delegates clicks on `document.body`; derives a stable selector per Ruling H; emits `block-forge:element-click` postMessage.

**Selector derivation logic (inline in injected script):**
1. Start at `event.target`.
2. If element has `id` → return `#${CSS.escape(id)}`.
3. Walk up to root. At each ancestor:
   - If has id → prepend `#${escape(id)} ` to path, stop.
   - If has a stable class (not starting with `hover:`, `focus:`, `active:`, `animate-`, `data-` attributes are NOT classes) → add `.${escape(firstStableClass)}`.
   - Else → add `${tagName}:nth-of-type(${indexInParent + 1})`.
4. Join path with ` > `. Max depth 5 ancestors before giving up and emitting tag path only.

**Injected script (block-forge preview-assets.ts example; mirror into Studio):**

```javascript
<script>
  // WP-028 Phase 2 — element-click selection for TweakPanel
  (function () {
    const CLICKABLE_TAGS = ['DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','NAV','MAIN',
                            'H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','UL','OL','LI','IMG'];
    const UTILITY_PREFIXES = ['hover:','focus:','active:','animate-','group-','peer-'];

    function stableClass(el) {
      if (!el.className || typeof el.className !== 'string') return null;
      const classes = el.className.split(/\s+/).filter(Boolean);
      return classes.find(c => !UTILITY_PREFIXES.some(p => c.startsWith(p))) ?? null;
    }

    function deriveSelector(el) {
      if (!el || el === document.body) return 'body';
      if (el.id) return '#' + CSS.escape(el.id);

      const path = [];
      let cur = el;
      let depth = 0;
      while (cur && cur !== document.body && depth < 5) {
        if (cur.id) { path.unshift('#' + CSS.escape(cur.id)); break; }
        const cls = stableClass(cur);
        if (cls) {
          path.unshift(cur.tagName.toLowerCase() + '.' + CSS.escape(cls));
        } else {
          const parent = cur.parentElement;
          const siblings = parent ? Array.from(parent.children).filter(c => c.tagName === cur.tagName) : [];
          const idx = siblings.indexOf(cur) + 1;
          path.unshift(cur.tagName.toLowerCase() + ':nth-of-type(' + idx + ')');
        }
        cur = cur.parentElement;
        depth += 1;
      }
      return path.join(' > ');
    }

    document.body.addEventListener('click', (e) => {
      const el = e.target;
      if (!el || !CLICKABLE_TAGS.includes(el.tagName)) return;
      e.preventDefault(); e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);

      parent.postMessage({
        type: 'block-forge:element-click',
        slug: ${JSON.stringify(slug)},
        selector: deriveSelector(el),
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        computedStyle: {
          padding: cs.padding, paddingTop: cs.paddingTop, paddingRight: cs.paddingRight,
          paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
          fontSize: cs.fontSize, gap: cs.gap, display: cs.display
        }
      }, '*');
    }, true);
  })();
</script>
```

### Integration

Added AFTER existing ResizeObserver script in both `tools/block-forge/src/lib/preview-assets.ts` (L81 area) and `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` equivalent position. The two injected scripts are byte-identical.

### Domain Rules

- **Ruling E invariant** — no changes to wrap structure, layer order, slot CSS. Strictly additive script.
- **PARITY contract** — both `tools/block-forge/PARITY.md` and `apps/studio/src/pages/block-editor/responsive/PARITY.md` need an update noting the new postMessage type; Phase 2 touches PARITY section "Runtime injection" with a new bullet. Update in SAME commit as the code change.
- **Selector output is a best-effort string** — tests assert behavior on representative cases, not exhaustively. Brittleness is Phase 2.5 concern if an author complains.

---

## Task 2.2: Parent listener + selection state (ResponsiveTab / App.tsx)

### What to Build

**Studio (`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx`):**

Lift `selection` state to ResponsiveTab. Attach `window.addEventListener('message', handler)` with cleanup.

```typescript
type Selection = {
  selector: string
  bp: 1440 | 768 | 480
  computedStyle: Record<string, string>
} | null

// Inside ResponsiveTab component:
const [selection, setSelection] = useState<Selection>(null)
const [currentBp, setCurrentBp] = useState<1440 | 768 | 480>(1440)

useEffect(() => {
  const handler = (e: MessageEvent) => {
    if (!e.data || typeof e.data !== 'object') return
    if (e.data.type !== 'block-forge:element-click') return
    if (e.data.slug !== block.slug) return   // slug-filter

    setSelection({
      selector: e.data.selector,
      bp: currentBp,          // seed BP from active preview panel
      computedStyle: e.data.computedStyle,
    })
  }
  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, [block?.slug, currentBp])

// Pass selection + callbacks to TweakPanel + sibling PreviewPanel children:
<TweakPanel
  selection={selection}
  onBpChange={(bp) => setSelection(prev => prev ? { ...prev, bp } : null)}
  onTweak={(tweak) => dispatchTweak(tweak, form)}
  onReset={() => resetTweaksForSelection(selection, form)}
  onClose={() => setSelection(null)}
/>
```

**Block-forge (`tools/block-forge/src/App.tsx` or wherever PreviewTriptych + SuggestionList live):**

Mirror — same listener shape, same Selection type, dispatch to `session.tweaks` instead of RHF.

### Integration

ResponsiveTab.tsx edits:
- New `selection` + `currentBp` state hooks
- New useEffect with message listener + cleanup
- New `<TweakPanel ... />` rendered inline below existing SuggestionList (Ruling OQ3)
- Slug-filter on message handler — multiple iframes (triptych) all emit same type, but each tagged with own slug; listener accepts only matching slug

App.tsx equivalent for block-forge.

### Domain Rules

- **Cleanup on unmount** is mandatory — Phase 0 carry-over (e) notes "prevents memory leak when switching tabs / blocks". Return the `removeEventListener` call from the useEffect.
- **Slug filter** — ResponsiveTab and App.tsx both hold multiple preview iframes (1440/768/375). Each iframe's script emits with its own `slug` field. Handler filters by current block.slug to avoid cross-talk.
- **currentBp seed** — first click in a session seeds `selection.bp = currentBp`. Subsequent BP toggles inside TweakPanel update `selection.bp` without losing selector.

---

## Task 2.3: TweakPanel real implementation (both surfaces; byte-identical)

### What to Build

Upgrade `TweakPanel.tsx` placeholder to real component. Mirror both surfaces — files must be byte-identical modulo 3-line comment header (same parity contract as Phase 1).

**Props (expanded from Phase 1 placeholder):**

```typescript
import { Slider } from '@cmsmasters/ui/primitives/slider';
import type { Tweak } from '@cmsmasters/block-forge-core';

type Selection = {
  selector: string
  bp: 1440 | 768 | 480
  computedStyle: Record<string, string>
} | null

export interface TweakPanelProps {
  selection: Selection
  onBpChange: (bp: 1440 | 768 | 480) => void
  onTweak: (tweak: Tweak) => void
  onReset: () => void
  onClose: () => void
  'data-testid'?: string
}
```

**Layout (inline below SuggestionList per Ruling OQ3):**

```
┌─ selector header ──────────────────────────────────── × (close) ┐
│  .cta-btn                                                       │
├─ BP picker ─────────────────────────────────────────────────────┤
│  ○ 1440  ● 768  ○ 480                                           │
├─ sliders ───────────────────────────────────────────────────────┤
│  Padding       [slider 0-128 step 4]   24px    ↻ reset          │
│  Font size     [slider 8-72  step 2]   16px                     │
│  Gap           [slider 0-64  step 4]   8px                      │
│  Hide at BP    [ ] show   [✓] hide                              │
└─────────────────────────────────────────────────────────────────┘
```

**Empty state (selection === null):**

```tsx
if (!selection) {
  return (
    <div data-testid={props['data-testid'] ?? 'tweak-panel'} aria-label="Element tweak panel" data-empty="true">
      <p className="text-[hsl(var(--muted-foreground))] text-sm p-4">
        Click an element in the preview to start tweaking.
      </p>
    </div>
  )
}
```

**Populated state:** render selector header + BP picker (3 radio buttons) + 4 slider rows.

**Slider row (padding example):**

```tsx
function SliderRow({
  label, property, min, max, step, currentValue, onValueChange,
}: {
  label: string; property: string; min: number; max: number; step: number;
  currentValue: number; onValueChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-2">
      <label className="w-24 text-sm">{label}</label>
      <Slider
        min={min} max={max} step={step}
        value={[currentValue]}
        onValueChange={([v]) => onValueChange(v)}
        className="flex-1"
        aria-label={`${label} at ${selection.bp}px breakpoint`}
      />
      <span className="w-16 text-right text-sm tabular-nums">{currentValue}px</span>
    </div>
  )
}
```

**Hide/show toggle:** separate row using `<button>` pair (not Slider). Emits `emitTweak({selector, bp, property: 'display', value: 'none'})` on hide; on show, emits a reset-for-this-property (handled via onReset callback filtered to just display).

**Seeding current values:**

```tsx
// Parse computedStyle values for initial slider positions
function parsePixels(v: string): number {
  const m = /^(\d+)/.exec(v)
  return m ? Number(m[1]) : 0
}
const paddingSeed = parsePixels(selection.computedStyle.padding ?? '0px')
const fontSizeSeed = parsePixels(selection.computedStyle.fontSize ?? '16px')
const gapSeed = parsePixels(selection.computedStyle.gap ?? '0px')
const isHidden = selection.computedStyle.display === 'none'
```

### Integration

Both TweakPanel files are replaced in place (no rename, no new file). File imports:
- Both: `import { Slider } from '@cmsmasters/ui/primitives/slider';`
- Both: `import type { Tweak } from '@cmsmasters/block-forge-core';`
- Both: `import * as React from 'react';`
- Body byte-identical (mod 3-line comment header).

### Domain Rules

- **Parity discipline** — 3-line header diff only. Diff check in verification step 6.
- **Ruling F** — padding shorthand ONLY. No top/right/bottom/left sliders in Phase 2.
- **Ruling G** — step sizes locked. DO NOT parametrize.
- **No hardcoded colors/fonts/shadows** — `hsl(var(--...))` for all color references; text sizes via tokens or Tailwind scale, NOT px.
- **a11y** — slider `aria-label` mandatory with context ("Padding at 480px breakpoint"). Button roles for BP picker.

---

## Task 2.4: Tweak dispatch wiring (OQ4 invariant; debounced)

### What to Build

**Studio (inside ResponsiveTab.tsx):**

```typescript
import { emitTweak } from '@cmsmasters/block-forge-core'

/**
 * Dispatch a tweak: patches current CSS → propagates to form.
 *
 * @invariant reads `form.getValues('code')` at dispatch time — NEVER `block.css`
 *            from DB. Prevents silent data loss when textarea edits predate tweak.
 *            (Phase 0 carry-over j risk flag; Phase 1 Ruling OQ4.)
 */
const dispatchTweakRaw = useCallback((tweak: Tweak) => {
  const liveCss = form.getValues('code')        // ← OQ4 invariant
  // Extract just the CSS from the code blob (strip <style> tags etc.)
  // ... same splitCode() helper as block-editor.tsx L125-133
  const nextCss = emitTweak(tweak, liveCss)
  form.setValue('code', nextCss, { shouldDirty: true })
}, [form])

const dispatchTweak = useMemo(
  () => debounce(dispatchTweakRaw, 300),
  [dispatchTweakRaw]
)
```

**Block-forge (inside App.tsx / wherever session + preview live):**

```typescript
import { emitTweak } from '@cmsmasters/block-forge-core'
import { addTweak } from './lib/session'

const dispatchTweakRaw = useCallback((tweak: Tweak) => {
  setSession(prev => addTweak(prev, tweak))    // reducer; applyTweaks at render
}, [])

const dispatchTweak = useMemo(
  () => debounce(dispatchTweakRaw, 300),
  [dispatchTweakRaw]
)
```

**Reset logic:**

Studio: reverse the effect by calling `emitTweak` with original value. Practically hard (no per-tweak undo in engine) → simplest: re-run all OTHER tweaks against a pristine baseline. For Phase 2 MVP, **Reset calls a form-level "remove tweaks for this selector+bp" helper** that:
  1. Reads current `form.getValues('code')`.
  2. Finds the `@container slot (max-width: ${bp}px)` block (if bp !== 1440).
  3. Finds the `.selector { ... }` rule inside.
  4. Removes declarations for padding / font-size / gap / display (the 4 tweak properties).
  5. If rule becomes empty, removes the rule. If container becomes empty, removes the container.
  6. `form.setValue('code', cleanedCss)`.

Block-forge: `setSession(prev => removeTweaksFor(prev, selector, bp))` — reducer.

### Integration

- `lodash.debounce` is likely already in deps — if not, use a minimal custom debounce:

```typescript
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let tid: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (tid) clearTimeout(tid)
    tid = setTimeout(() => fn(...args), ms)
  }) as T
}
```
  Place inline in ResponsiveTab.tsx / App.tsx; no new utility file.

### Domain Rules

- **OQ4 invariant** — `form.getValues('code')` at dispatch time, NOT render time. JSDoc pin on `dispatchTweakRaw`.
- **No new file** — `debounce` is inline, not extracted.
- **Reset is scoped** — Ruling J: removes tweaks for CURRENT selector+bp ONLY.

---

## Task 2.5: session.ts tweaks extension (block-forge only)

### What to Build

Extend `tools/block-forge/src/lib/session.ts` to track tweaks alongside accept/reject.

```typescript
import type { Tweak } from '@cmsmasters/block-forge-core'

export type SessionAction =
  | { kind: 'accept'; id: string }
  | { kind: 'reject'; id: string }
  | { kind: 'tweak'; tweak: Tweak }          // ← NEW

export type SessionState = {
  accepted: Set<string>
  rejected: Set<string>
  tweaks: Tweak[]                             // ← NEW
  actionLog: SessionAction[]
  backedUp: boolean
  lastSavedAt: number | null
}

export function createSession(): SessionState {
  return {
    accepted: new Set(),
    rejected: new Set(),
    tweaks: [],                               // ← NEW
    actionLog: [],
    backedUp: false,
    lastSavedAt: null,
  }
}

// ── New reducers ──

export function addTweak(state: SessionState, tweak: Tweak): SessionState {
  return {
    ...state,
    tweaks: [...state.tweaks, tweak],
    actionLog: [...state.actionLog, { kind: 'tweak', tweak }],
  }
}

/** Remove all tweaks matching selector + bp. */
export function removeTweaksFor(
  state: SessionState,
  selector: string,
  bp: number,
): SessionState {
  return {
    ...state,
    tweaks: state.tweaks.filter(t => !(t.selector === selector && t.bp === bp)),
    actionLog: [...state.actionLog, { kind: 'reject', id: `tweak-reset:${selector}:${bp}` }],
  }
}

// ── Updated undo ──

export function undo(state: SessionState): SessionState {
  const last = state.actionLog[state.actionLog.length - 1]
  if (!last) return state

  const log = state.actionLog.slice(0, -1)
  if (last.kind === 'tweak') {
    return { ...state, tweaks: state.tweaks.slice(0, -1), actionLog: log }
  }
  // existing accept/reject undo behavior preserved
  if (last.kind === 'accept') {
    const accepted = new Set(state.accepted); accepted.delete(last.id)
    return { ...state, accepted, actionLog: log }
  }
  if (last.kind === 'reject') {
    const rejected = new Set(state.rejected); rejected.delete(last.id)
    return { ...state, rejected, actionLog: log }
  }
  return state
}

// ── Compose helper ──

import { emitTweak } from '@cmsmasters/block-forge-core'

/**
 * Compose tweaked CSS by applying every session tweak in order to baseline.
 * Pure function; use at render time before passing CSS to composeSrcDoc.
 */
export function composeTweakedCss(baseCss: string, tweaks: readonly Tweak[]): string {
  return tweaks.reduce((css, tweak) => emitTweak(tweak, css), baseCss)
}
```

**isDirty extends:**

```typescript
export function isDirty(state: SessionState): boolean {
  return state.accepted.size > 0 || state.rejected.size > 0 || state.tweaks.length > 0
}
```

### Integration

Single file edit: `tools/block-forge/src/lib/session.ts`. Public API gains 3 new exports: `addTweak`, `removeTweaksFor`, `composeTweakedCss`. 2 types gain a new variant (`SessionAction` + `SessionState`). `undo` + `isDirty` + `createSession` extended.

### Domain Rules

- **Pure reducer discipline** — no Date.now(), no `Math.random()`, no side effects. Matches existing session.ts invariants.
- **Studio does NOT get mirror extension** — session-state.ts in Studio stays as-is. RHF is Studio's equivalent of session.tweaks.
- **Engine import is OK** — session.ts already consumes `@cmsmasters/block-forge-core` types; adding a function call is allowed (engine FROZEN means do not EDIT engine, not "do not CALL it").

---

## Task 2.6: Preview render compose (block-forge only)

### What to Build

Update `tools/block-forge/src/App.tsx` (or wherever `block` + `session` feed `PreviewTriptych`) to compose tweaked CSS before passing to preview.

**Before:**
```tsx
<PreviewTriptych block={block} session={session} />
```

**After:**
```tsx
import { composeTweakedCss } from './lib/session'

const composedBlock = useMemo(() => ({
  ...block,
  css: composeTweakedCss(block.css, session.tweaks),
}), [block, session.tweaks])

<PreviewTriptych block={composedBlock} session={session} />
```

### Integration

- Single memo layer. `PreviewTriptych` + `PreviewPanel` + `composeSrcDoc` downstream all receive the composed block and treat it as canonical (they do not need to know tweaks exist).
- **Studio does not need this** — RHF form.code is already the render source; tweaks already propagated via `form.setValue('code', ...)` in Task 2.4.

### Domain Rules

- **Ruling E** — preview-assets.ts wrap structure untouched. The compose layer is UPSTREAM of preview-assets.ts.

---

## Task 2.7: Tests

### What to Build

**Test 1 — Behavioral OQ4 invariant (Studio only, new `it()` block in existing `TweakPanel.test.tsx`):**

```typescript
it('dispatch reads live form.code, not stale block.css (OQ4 invariant)', async () => {
  // Mock RHF form with edited code that differs from baseline
  const mockForm = {
    getValues: vi.fn((key: 'code') => 'EDITED-BY-TEXTAREA { padding: 99px }'),
    setValue: vi.fn(),
  }
  const emitTweakSpy = vi.spyOn(engine, 'emitTweak')

  // Simulate tweak dispatch
  dispatchTweak(
    { selector: '.x', bp: 480, property: 'padding', value: '24px' },
    mockForm as any,
  )

  // Assert: emitTweak called with LIVE form code, not baseline
  expect(emitTweakSpy).toHaveBeenCalledWith(
    expect.objectContaining({ property: 'padding' }),
    'EDITED-BY-TEXTAREA { padding: 99px }',
  )
  expect(mockForm.getValues).toHaveBeenCalledWith('code')
})
```

**Test 2 — session.ts tweaks extension (block-forge only, new `describe` block in existing `session.test.ts`):**

```typescript
describe('session — addTweak / removeTweaksFor / undo', () => {
  it('addTweak appends to tweaks + actionLog', () => {
    const s = createSession()
    const t = { selector: '.x', bp: 480, property: 'padding', value: '24px' }
    const next = addTweak(s, t)
    expect(next.tweaks).toEqual([t])
    expect(next.actionLog).toHaveLength(1)
  })

  it('removeTweaksFor filters matching selector+bp only', () => {
    const s = addTweak(
      addTweak(createSession(), { selector: '.x', bp: 480, property: 'padding', value: '24px' }),
      { selector: '.y', bp: 480, property: 'padding', value: '16px' },
    )
    const next = removeTweaksFor(s, '.x', 480)
    expect(next.tweaks).toHaveLength(1)
    expect(next.tweaks[0].selector).toBe('.y')
  })

  it('undo pops last action across accept+reject+tweak uniformly', () => {
    let s = createSession()
    s = accept(s, 'sug-1')
    s = addTweak(s, { selector: '.x', bp: 480, property: 'padding', value: '24px' })
    s = reject(s, 'sug-2')

    s = undo(s)   // pops reject
    expect(s.rejected.size).toBe(0)
    expect(s.tweaks).toHaveLength(1)

    s = undo(s)   // pops tweak
    expect(s.tweaks).toHaveLength(0)
    expect(s.accepted.size).toBe(1)
  })

  it('isDirty returns true when tweaks non-empty even if no accept/reject', () => {
    const s = addTweak(createSession(), { selector: '.x', bp: 480, property: 'padding', value: '24px' })
    expect(isDirty(s)).toBe(true)
  })
})
```

**Test 3 — composeTweakedCss helper (block-forge only, new describe):**

```typescript
describe('composeTweakedCss', () => {
  it('applies tweaks in order to baseline', () => {
    const base = '.x { color: red }'
    const tweaks = [
      { selector: '.x', bp: 480, property: 'padding', value: '24px' },
      { selector: '.x', bp: 480, property: 'font-size', value: '20px' },
    ]
    const out = composeTweakedCss(base, tweaks)
    expect(out).toContain('@container slot (max-width: 480px)')
    expect(out).toContain('padding: 24px')
    expect(out).toContain('font-size: 20px')
  })

  it('empty tweaks returns baseline unchanged', () => {
    expect(composeTweakedCss('.x{}', [])).toBe('.x{}')
  })
})
```

**Test 4 — parity snapshot regeneration (both surfaces):**

Existing `TweakPanel.test.tsx` parity snapshot test updates automatically on first run (real component renders differently than placeholder). Commit the new `.snap` content. Diff the two `.snap` files after regeneration — must be byte-identical (Ruling: cross-surface parity).

**Test 5 — Integration (both surfaces, new `it()` block in existing `integration.test.tsx`):**

Mock click → BP pick → slider change → assert patched CSS includes expected tweak. Full surface-level integration.

### Integration

All tests extend existing `.test.tsx` / `.test.ts` files. **No new test files** (Phase 2 arch-test delta = 0).

### Domain Rules

- **OQ4 behavioral test is mandatory** — Ruling C Anchor 2. If this test doesn't exist at Phase 2 end, invariant has no enforcement.
- **Snapshot regeneration** is expected. Commit `.snap` diffs alongside code.
- **Cross-surface parity** — after Phase 2, the two `TweakPanel.test.tsx.snap` files must be byte-identical.

---

## Files to Modify

**Modified (all existing files; zero new):**
- `tools/block-forge/src/lib/preview-assets.ts` — add click-handler `<script>` injection (strictly additive)
- `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` — mirror same injection
- `tools/block-forge/src/components/TweakPanel.tsx` — upgrade placeholder to real impl
- `apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx` — mirror
- `tools/block-forge/src/App.tsx` (or equivalent host file) — parent listener + dispatchTweak + compose layer
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — parent listener + dispatchTweak + selection state
- `tools/block-forge/src/lib/session.ts` — tweaks extension (types + 3 new reducers + composeTweakedCss + isDirty extends)
- `tools/block-forge/src/__tests__/session.test.ts` — new describe blocks (addTweak/removeTweaksFor/undo/isDirty/composeTweakedCss)
- `tools/block-forge/src/__tests__/TweakPanel.test.tsx` — parity snapshot regen (real component)
- `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx` — parity snapshot regen + OQ4 behavioral test
- `tools/block-forge/src/__tests__/integration.test.tsx` — new click→tweak→save integration
- `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` — mirror integration
- `tools/block-forge/PARITY.md` — new bullet under "Runtime injection" for `element-click` postMessage
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — mirror bullet

**Auto-regenerated:**
- 2 `.snap` files — TweakPanel parity snapshots after component body upgrade

**NOT modified (zero touch):**
- `packages/block-forge-core/*` — engine frozen (Ruling carry-over from Phase 0)
- `packages/ui/src/primitives/slider.tsx` / `drawer.tsx` — consumed, not edited
- `src/__arch__/domain-manifest.ts` — Phase 2 adds no new owned_files
- `.claude/skills/domains/**/SKILL.md` — Phase 6 Close territory
- Workplan body — Phase 6 Close territory
- `apps/studio/src/pages/block-editor.tsx` — RHF already extended in Phase 1
- VariantsDrawer placeholders — Phase 3 upgrades

---

## Acceptance Criteria

- [ ] `npm run arch-test` green — **499 / 0 unchanged (Δ0)**
- [ ] `npm -w @cmsmasters/studio test -- --run` green — all existing + new OQ4 behavioral test + updated parity snapshot + new integration scenario
- [ ] `npm -w @cmsmasters/block-forge run test -- --run` green — all existing + new session addTweak/removeTweaksFor/undo/isDirty/composeTweakedCss tests + updated parity snapshot + new integration scenario
- [ ] `npm run typecheck` clean
- [ ] TweakPanel files byte-identical mod 3-line header (diff shows only comment)
- [ ] Two `TweakPanel.test.tsx.snap` files byte-identical after regeneration
- [ ] OQ4 behavioral test present + passing (`form.getValues('code')` at dispatch time)
- [ ] Click handler injection in BOTH preview-assets.ts files (grep `block-forge:element-click` → 2 matches in srcdoc-emission sources, plus mirror-test expectations)
- [ ] PARITY.md on both surfaces has new bullet for `element-click` postMessage under "Runtime injection"
- [ ] No changes to engine, `src/__arch__/domain-manifest.ts`, SKILL files, workplan body, Slider/Drawer primitives, VariantsDrawer placeholders
- [ ] Manual smoke (either surface): open block → click element in preview → TweakPanel opens with seeded values → move padding slider → preview updates within 500ms → Save → CSS file / DB row reflects tweak
- [ ] Duration ≤ 6h hard cap; record actual in result log

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-028 Phase 2 Verification ==="

# 1. Arch-test unchanged
npm run arch-test
echo "(expect: 499/0 — Phase 2 Δ0)"

# 2. Studio tests green (includes OQ4 behavioral test + integration)
npm -w @cmsmasters/studio test -- --run
echo "(expect: all pass; snapshot regen accepted on first run)"

# 3. Block-forge tests green (includes session tweaks tests + integration)
npm -w @cmsmasters/block-forge run test -- --run

# 4. Typecheck clean
npm run typecheck

# 5. TweakPanel parity diff (mod header only)
diff tools/block-forge/src/components/TweakPanel.tsx \
     apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
echo "(expect: ~3-line comment-header delta only)"

# 6. Snapshot files byte-identical post-regen
diff tools/block-forge/src/__tests__/__snapshots__/TweakPanel.test.tsx.snap \
     apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/TweakPanel.test.tsx.snap
echo "(expect: empty diff)"

# 7. OQ4 behavioral test present
grep -n "OQ4\|form\.getValues.*code" apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx
echo "(expect: at least one match — the invariant test)"

# 8. Click handler injection on both surfaces
grep -c "block-forge:element-click" tools/block-forge/src/lib/preview-assets.ts
grep -c "block-forge:element-click" apps/studio/src/pages/block-editor/responsive/preview-assets.ts
echo "(expect: ≥1 on each — script emit source)"

# 9. session.ts exports extended
grep -n "export.*addTweak\|export.*removeTweaksFor\|export.*composeTweakedCss" tools/block-forge/src/lib/session.ts
echo "(expect: 3 matches — new public API)"

# 10. No engine/manifest/SKILL/workplan touched
git diff --name-only | grep -E "packages/block-forge-core|src/__arch__|\.claude/skills|workplan" | wc -l
echo "(expect: 0)"

# 11. No NEW files
git status --porcelain | grep -E "^\?\?" | grep -v "^\?\?\s+\.claude/" | grep -v "logs/wp-028/"
echo "(expect: no new tracked files outside logs/wp-028/)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log

After verification (before committing), create:
`logs/wp-028/phase-2-result.md`

Standard structure (fill all sections — write N/A if not applicable):

```markdown
# Execution Log: WP-028 Phase 2 — Tweak panel wiring
> Epic: WP-028 Tweaks + Variants UI
> Executed: {ISO}
> Duration: {minutes}  (CAP: 6h / 360min)
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: infra-tooling, studio-blocks, pkg-ui (read-only)

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|---|---|---|

## Arch-test Delta
- Baseline: 499 / 0
- Exit: {N} / 0
- Delta: +{N} (expected 0)

## Files Changed
| File | Change | Description |

## Brain Rulings Applied (trace)
- A (grep retired) — no feature-leak grep in verification: ✅
- B (linear drawer) — irrelevant this phase (Drawer not consumed): N/A
- C (OQ4 JSDoc + test) — JSDoc on dispatchTweakRaw + behavioral test: ✅/❌
- D (tweaks: Tweak[]) — session.ts shape: ✅/❌
- E (preview-assets strictly additive) — wrap structure unchanged: ✅/❌
- F (padding shorthand only) — no top/right/bottom/left sliders: ✅/❌
- G (step sizes locked) — 4/4/2/bool: ✅/❌
- H (selector priority) — id > class > nth-of-type implemented: ✅/❌
- I (300ms debounce on dispatch) — debounce applied: ✅/❌
- J (reset scoped to {selector, bp}) — removeTweaksFor filter correct: ✅/❌
- K (BP picker 1440/768/480 segment) — TweakPanel header: ✅/❌

## Issues & Workarounds
{Any deviations; "None" if clean}

## Open Questions
{Phase 3 inputs: VariantsDrawer + Path B re-converge + first real variants DB write path}

## Verification Results
| Check | Result |
|---|---|
| arch-test | ✅ 499/0 |
| studio tests | ✅ N pass |
| block-forge tests | ✅ N pass |
| typecheck | ✅ clean |
| TweakPanel parity diff | ✅ 3-line header only |
| Snapshot diff | ✅ empty |
| OQ4 behavioral test | ✅ present + passing |
| Click-handler injection both surfaces | ✅ |
| session.ts 3 new exports | ✅ |
| Zero touch list | ✅ |

## Duration vs Cap
- Estimated: 5h
- Actual: {N}h
- Overrun flag: {YES/NO}

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add tools/block-forge/src/lib/preview-assets.ts
git add tools/block-forge/src/components/TweakPanel.tsx
git add tools/block-forge/src/App.tsx
git add tools/block-forge/src/lib/session.ts
git add tools/block-forge/src/__tests__/session.test.ts
git add tools/block-forge/src/__tests__/TweakPanel.test.tsx
git add tools/block-forge/src/__tests__/integration.test.tsx
git add tools/block-forge/src/__tests__/__snapshots__/TweakPanel.test.tsx.snap
git add tools/block-forge/PARITY.md
git add apps/studio/src/pages/block-editor/responsive/preview-assets.ts
git add apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
git add apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx
git add apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/TweakPanel.test.tsx.snap
git add apps/studio/src/pages/block-editor/responsive/PARITY.md
git add logs/wp-028/phase-2-result.md

git commit -m "$(cat <<'EOF'
feat(studio+tools): WP-028 Phase 2 — Tweak panel + element-click postMessage + emitTweak dispatch [WP-028 phase 2]

- Iframe click-handler injection on both preview-assets.ts surfaces
  (strictly additive; element-click postMessage with selector + rect + computedStyle).
- TweakPanel real impl: 4 slider rows (padding / font-size / gap / hide-show),
  BP picker (1440/768/480), Reset button scoped to {selector, bp}. Byte-identical
  mod 3-line header between surfaces.
- session.ts extended with tweaks: Tweak[] + addTweak / removeTweaksFor /
  composeTweakedCss + undo/isDirty extensions. Studio uses RHF form.code
  as equivalent (OQ4 invariant: form.getValues at dispatch time).
- Debounced 300ms dispatch. Arch-test 499/0 unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## IMPORTANT Notes for CC

- **Read domain skills FIRST** — infra-tooling + studio-blocks + pkg-block-forge-core (read-only). Especially session.ts invariants before extending.
- **Engine FROZEN** — `packages/block-forge-core/*` is zero touch. Only consume `emitTweak` + `Tweak` type.
- **Cross-surface parity is load-bearing** — TweakPanel.tsx files byte-identical mod 3-line header. Diff before committing.
- **OQ4 invariant MUST have a test** — not just a JSDoc comment. Behavioral test in `TweakPanel.test.tsx`.
- **Preview-assets.ts edits are strictly additive** — only the new `<script>` block. DO NOT touch wrap structure, layer order, or slot CSS (Ruling E). Path B re-converge is Phase 3.
- **No new files** — Phase 2 is pure behavior. Arch-test delta = 0.
- **Debounce inline, not as utility** — inline helper function inside ResponsiveTab.tsx / App.tsx. Don't extract.
- **Manual smoke MUST happen** — click element → slider → preview updates → save round-trip on at least one surface. Document in result log.

---

## Escalation Triggers

Stop and surface to Brain if:

1. `npm run arch-test` baseline ≠ 499 → environment drift; reconcile.
2. `tools/block-forge/src/lib/session.ts` shape differs from Phase 0 carry-over expectations → re-audit session.ts before extending.
3. `preview-assets.ts` structure on either surface doesn't match the injection-site expectation (ResizeObserver at L74-81 area) → surface the actual structure before injecting.
4. TweakPanel files cannot be kept byte-identical mod header (legitimately need surface-specific logic) → surface the divergence with rationale; may trigger PARITY update instead of parity violation.
5. `lodash.debounce` not available AND inline debounce adds > 20 LOC → consider accepting a new tiny utility file (surface first, do not decide unilaterally).
6. Click handler causes preview-click interception side-effects (anchors, form submissions in block content) → Phase 2.5 scope, surface with repro.
7. Arch-test delta > 0 → unplanned files; surface count.
8. Duration exceeds 6h cap → WP-028a split re-evaluation flag; record and continue (Brain decides at Phase 3 handoff).
9. OQ4 behavioral test becomes flaky OR hard to write due to RHF mock complexity → surface the shape; may warrant a tiny RHF test helper.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 2 промпт готовий: `logs/wp-028/phase-2-task.md`.

## Структура

**7 tasks (2.1–2.7) + audit + gates, ~5h budget, 6h hard cap, Δ0 arch-test:**

| # | Task | Scope |
|---|------|-------|
| 2.0 | Pre-flight audit | session.test.ts exists; preview-assets injection site; existing tests green |
| 2.1 | Iframe click-handler injection × 2 | Strictly additive `<script>` in preview-assets.ts; selector derivation id > class > nth-of-type; emits `block-forge:element-click` |
| 2.2 | Parent listener + selection state | ResponsiveTab (Studio) + App.tsx (block-forge); slug-filter; cleanup on unmount |
| 2.3 | TweakPanel real impl × 2 | 4 slider rows (padding / font-size / gap / hide-show) + BP picker (1440/768/480) + Reset; byte-identical mod 3-line header |
| 2.4 | Dispatch wiring | debounce(300ms); Studio via RHF form.setValue; block-forge via session.addTweak; OQ4 JSDoc on dispatchTweakRaw |
| 2.5 | session.ts tweaks extension | +`tweaks: Tweak[]` + addTweak + removeTweaksFor + composeTweakedCss + undo/isDirty extends. Block-forge ONLY — Studio uses RHF |
| 2.6 | Preview compose (block-forge) | useMemo composedBlock = { ...block, css: composeTweakedCss(base, tweaks) } |
| 2.7 | Tests | OQ4 behavioral (Studio) + session tweaks (block-forge) + composeTweakedCss + parity snapshot regen + integration both surfaces |
| Gates | arch-test 499/0 unchanged, parity diff 3-line, snap byte-identical, OQ4 test passing | 11-point verification |

## 8 new Brain rulings (D–K)

1. **D** — session.ts extension = `tweaks: Tweak[]` array (not `currentCss: string`); pure reducer preserved; undo uniform across kinds
2. **E** — preview-assets.ts Phase 2 edits STRICTLY ADDITIVE — click-handler `<script>` only; wrap structure untouched; Path B re-converge stays Phase 3
3. **F** — padding = shorthand all-sides; per-side deferred to Phase 2.5 polish if budget permits
4. **G** — slider steps locked: padding/gap 4px, font-size 2px, hide/show boolean. Ranges 0-128/0-64/8-72
5. **H** — selector derivation: id > stable class > nth-of-type walk; utility prefixes (hover:/focus:/animate-) excluded; max depth 5
6. **I** — debounce 300ms on dispatch side (not Slider onValueChange); author sees live slider, preview catches up
7. **J** — Reset scoped to current {selector, bp} pair only; other tweaks preserved
8. **K** — BP picker = segment toggle `1440 | 768 | 480` in TweakPanel header; switching keeps selector, changes which tweaks active

Carry-forward from Phase 0/1: OQ1–7, A (grep retired), B (linear drawer permanent), C (OQ4 via JSDoc + behavioral test — ENFORCED this phase).

## Hard gates (inherited + Phase 2 additions)

- Zero touch: `packages/block-forge-core/`, `src/__arch__/domain-manifest.ts`, SKILL files, workplan body, Slider/Drawer primitives, VariantsDrawer placeholders, block-editor.tsx (already Phase 1)
- Zero new files — Phase 2 is pure behavior; arch-test Δ0
- TweakPanel byte-identical mod 3-line header — parity contract
- OQ4 behavioral test MUST exist — invariant anchor (Ruling C)
- Preview-assets.ts strictly additive — no wrap structure changes (Ruling E)

## Escalation triggers

- arch-test ≠ 499 at start → env drift
- session.ts shape differs from carry-over → re-audit
- preview-assets.ts injection site doesn't match L74-81 expectation → surface actual
- TweakPanel can't be byte-identical (legit divergence needed) → PARITY update, not parity violation
- debounce utility > 20 LOC → surface before adding utility file
- Click handler intercepts anchors/forms → Phase 2.5 repro
- Arch-test delta > 0 → unplanned files count
- Duration > 6h → WP-028a split flag
- OQ4 test flaky/hard due to RHF mock → surface, may warrant helper

## Arch-test target

**499 / 0 — unchanged (Δ0).** Phase 2 edits existing files only. No new owned_files. No SKILL status flips.

## Git state

- `logs/wp-028/phase-2-task.md` — new untracked (this file)
- `logs/wp-028/phase-2-result.md` — new untracked after Hands
- Implementation commit + task-prompt commit (WP-026/027 convention)

## Next

1. Review → commit task prompt (`chore(logs): WP-028 Phase 2 task prompt`) → handoff Hands
2. АБО правки (особливо Ruling F — чи справді MVP padding shorthand only, а не per-side; Ruling H — selector derivation edge cases; Ruling D — tweaks array vs currentCss)
3. АБО self-commit if workflow permits

Чекаю.
