# WP-033 Phase 3 — Task Prompt: Property editing + per-BP cell sourcing + token-aware suggestions + visibility wire

> Epic: WP-033 Block Forge Inspector
> Phase 3 of 5 (per WP §Phases)
> Owner: Hands (separate Claude Code terminal)
> Brain: this prompt
> Operator: Dmytro
> Effort budget: 12–17h
> Status: 📋 PENDING — task prompt drafted, awaiting Operator approval to commit + handoff
> Pre-conditions met: Phase 2 GREEN (212 block-forge tests · arch-test 552/552 · ↗ lockstep + 4 sections live verified · YELLOW caveat slots reserved structurally)

---

## TL;DR — what Hands ships in Phase 3

**Five tasks, READ → EDIT transition (Phase 2 was read-only):**

1. **§3.1 Per-property emit** — wire `PropertyRow.onCellEdit` ↔ `InspectorPanel.onCellEdit` ↔ `Inspector` callback ↔ `App.dispatch(addTweak(...))`. Active cell becomes editable input on focus; commit on blur, cancel on Esc. **Inactive cells stay ↗-only — no edit-at-wrong-BP** (Phase 0 §0.11.g safeguard).
2. **§3.2 `useInspectorPerBpValues` hook** — Option A (3 hidden iframes) per Ruling E. Fills inactive cells with browser-resolved per-BP values. Cache by `(selector, effectiveCssHash)` tuple.
3. **§3.3 `useChipDetection` + `TokenChip`** — Option B-subset (PostCSS walk) for "raw px vs `var(--token)`" source-declaration distinction. Chip click emits single `bp:0` tweak with `var(--token)` value (fluid token = applies at all 3 BPs by construction).
4. **§3.4 Visibility wire (hide-only)** — enable checkbox; check → emit `display:none` at active BP. Uncheck (show-back) DEFERRED to follow-up phase (semantic-restore complexity); document as YELLOW caveat.
5. **§3.5 Tests + manifest + slider-bug regression pin** — vitest covering all four above + 1 regression pin asserting `emitTweak({bp:1440, property:'font-size', value:'48px'})` contract holds (the bug WP-033 was born to fix).

**Hard gates — zero touch:**
- ❌ `apps/studio/**` (Phase 4 mirror)
- ❌ `packages/ui/**`, `packages/block-forge-core/**` (engine LOCKED)
- ❌ `tools/block-forge/src/components/TweakPanel.tsx` (legacy coexists)
- ❌ `tools/block-forge/src/lib/preview-assets.ts` outline IIFE (Phase 1 contract — only edit if a NEW postMessage type lands; if none, untouched)
- ❌ `tools/block-forge/src/components/PreviewTriptych.tsx` (Phase 1 lockstep wired)

**Soft gate — light edits OK:**
- ✅ `Inspector.tsx` — add `onCellEdit` prop type + forward; consume `useInspectorPerBpValues` if hook owns iframe management at this level (Hands' choice on placement; documented in result.md)
- ✅ `InspectorPanel.tsx` — pass `valuesByBp` from hook output + `onCellEdit` + `tokenChip` slot per row
- ✅ `PropertyRow.tsx` — wire onCellEdit on active cell only (slot already present)
- ✅ `App.tsx` — add `onInspectorCellEdit` callback that dispatches `addTweak`
- ✅ `lib/session.ts` — NO new exports; reuse existing `addTweak` reducer + `composeTweakedCss` (already exported)

---

## Brain rulings — 4 open questions from Phase 2 §Open Questions

These were Hands' Phase 3 questions; Brain rulings below are LOCKED for Phase 3 entry.

### 🔔 Ruling 1 — `useInspectorPerBpValues` placement: **React hook (no Worker)**

**Decision:** Hook owns the 3 hidden iframes. NOT a Worker.

**Rationale:**
- Hidden iframes are async-by-construction (await load event). React hook with `useState + useEffect + cleanup` covers the full lifecycle naturally.
- Worker adds postMessage ceremony (parent → worker → 3 iframes via worker's postMessage to parent → … ) for ZERO CPU savings — the 3 iframe lifecycles run in the browser's event loop either way.
- Cache via module-scoped `Map<cacheKey, snapshot>` survives re-mounts; useEffect cleanup disposes in-flight iframes on unmount.
- **Escape hatch (per Phase 0 §0.9):** if 3 hidden iframes spike memory or interfere with the visible PreviewPanel iframe in Phase 3 smoke, fallback to single-active-BP render. Cells inactive show "—". Keep the hook signature stable so Phase 4 mirror doesn't churn.

### 🔔 Ruling 2 — `useChipDetection` scope: **Curated MVP property × full 22-token table**

**Decision:** Detect against **all 22 fluid tokens** from `responsive-config.json` (10 typography + 11 spacing + 1 special), restricted to the **12 curated MVP properties** Phase 2 already surfaces.

**Rationale:**
- 22 tokens is the SOT (source of truth) — the chip's "Use `--<token>`" suggestion vocabulary should range over all of them, otherwise we hand-curate a subset that rots out of sync with `responsive-config.json`.
- Curated MVP property side already eliminates noise (no `border-radius`, `box-shadow`, etc.); chip detection simply inherits Phase 2's curation by construction.
- Token-property mapping (e.g., `--text-h2-font-size` is a candidate for `font-size` rows; `--space-md` is a candidate for `margin-*`/`padding-*`/`gap` rows) is encoded in the table from Phase 0 §0.7. Use it directly.

### 🔔 Ruling 3 — Ancestors emit: **DEFER to follow-up WP**

**Decision:** Phase 3 does NOT add `ancestors[]` to `inspector-pin-applied` payload. BreadcrumbNav stays at 3-state (pinned/hovered/empty) per Phase 2 extract.

**Rationale:**
- Phase 3 plate is full (5 tasks, 12–17h, two new hooks, one new component, plus regression pin).
- BreadcrumbNav extracted with structural seam preserved (Phase 2 result.md L156). Future ancestor support extends the pinned-state branch with chain when payload grows.
- DevTools-style breadcrumb (full ancestor chain) is product polish, not gate-blocking. Push to dedicated follow-up WP after Phase 5 close.

### 🔔 Ruling 4 — Visibility checkbox emit: **`display: none` at active BP (hide-only)**

**Decision:** Phase 3 wires HIDE only — checkbox check → `addTweak({selector, bp: activeBp, property: 'display', value: 'none'})`.

**Rationale:**
- DevTools mental-model match: hide-at-BP is one-way without complex restore semantics.
- Show-back (uncheck restoring `display: block` vs `flex` vs `grid` vs original computed value) requires capturing the pre-tweak display value. Adds state-management complexity Phase 3 doesn't need.
- **Acceptable Phase 3 UX:** check the box → element disappears at activeBp; uncheck the box → tweak removed via `removeTweaksFor(selector, activeBp)` for the `display` property only (precise reset, NOT full row reset).
  - **Implementation note:** `removeTweaksFor` is currently scoped to (selector, bp) pairs (full row); Phase 3 may need a property-scoped variant `removeTweakFor(selector, bp, property)`. If so, add as a *new* reducer in `lib/session.ts` (additive, no API breakage); document at result.md.
- If the property-scoped reducer turns out to need different shape, document and propose at result.md as a Phase 3.6 follow-up; do NOT block Phase 3 close on it.

---

## YELLOW caveat handling — Phase 2 reserved 3 structural slots; Phase 3 fills detection logic

| Caveat (Phase 0 §0.11) | Phase 2 reservation | Phase 3 fill |
|---|---|---|
| **1 — Token-chip 3-BP impact label** | `tokenChip?: ReactNode` slot in PropertyRow with locked label format `[Use --<token> ✓ — sets X/Y/Z at all 3 BPs]` | `useChipDetection` populates slot via `<TokenChip />` rendered into PropertyRow's `tokenChip` prop. Two modes: in-use (subdued, no click) vs available (clickable, applies token). |
| **2 — Inherited-property edit-target ambiguity** | `inheritedFrom?: string` slot — empty in Phase 2 | Phase 3 OUT-OF-SCOPE: inheritance walker requires walking parent ancestry × 3 BPs (multiplicative cost). DEFER to follow-up. Slot stays empty in Phase 3. Document at result.md as Phase 3 explicit non-goal. |
| **3 — Active-BP coherence (invisible-edit confusion)** | Inactive cell → ↗ button → `onBpSwitch(bp)` lockstep wired Phase 1+2 | Phase 3 reinforces: inactive cells STAY non-editable. Edit affordance only on active cell. ↗ click switches PreviewTriptych tab → Inspector re-pins → cell becomes active → editable. Single coherent flow.

**Result:** caveats 1 + 3 fully addressed Phase 3. Caveat 2 (inheritance) explicitly DEFERRED with structural seam preserved.

---

## §3.1 — Per-property emit (active cell editable)

### Goal

User pins `.gauge-score` → active cell shows `60px` for `font-size` → user clicks the cell → input becomes editable → types `48px` → blur or Enter → tweak appended → iframe re-renders → cell shows `48px`.

### File-by-file changes

**`tools/block-forge/src/components/PropertyRow.tsx`** — wire `onCellEdit`:

Active cell renders a controlled `<input>` instead of `<span>` when `onCellEdit` is provided AND the cell is the active BP. Inactive cells stay `<span>` (no edit input). Empty cells (`null` value) stay `—` (jsdom hook fills these in §3.2).

```tsx
// Inside the BP map, when isActive AND onCellEdit AND !isEmpty:
<input
  type="text"
  defaultValue={value}
  data-testid={`${testId}-input-${bp}`}
  onBlur={(e) => commitEdit(e.currentTarget.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') {
      e.currentTarget.value = value!
      e.currentTarget.blur()
    }
  }}
  className="bg-transparent font-mono outline-none [field-sizing:content]"
/>
```

`field-sizing: content` is a modern CSS feature that auto-sizes inputs to content; if Hands finds Tailwind v4 doesn't support the bare arbitrary-value syntax, fall back to inline `style={{ fieldSizing: 'content' }}` (this is one of the exempt cases for `style={{}}` per CLAUDE.md: dynamic, not a static color/spacing). Acceptable workaround if needed: width calculated from `value.length`.

**Validation:** before calling `onCellEdit(bp, newValue)`, validate:
- Trim whitespace
- Reject empty string (treat as cancel — no tweak)
- Reject `em` (per `(?<!r)em` rule in `pkg-block-forge-core` SKILL Trap L44); allow `rem`, `px`, `%`, `var(...)`
- If validation fails, snap the input value back to the previous; do NOT call `onCellEdit`

**`tools/block-forge/src/components/InspectorPanel.tsx`** — add `onCellEdit` prop:

```tsx
export interface InspectorPanelProps {
  // ... existing
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
}
```

Pass it through to each PropertyRow as a curried function:

```tsx
<PropertyRow
  label="font-size"
  // ...
  onCellEdit={
    onCellEdit
      ? (bp, value) => onCellEdit(pinned.selector, bp, 'font-size', value)
      : undefined
  }
/>
```

**`tools/block-forge/src/components/Inspector.tsx`** — add `onCellEdit` prop:

```tsx
type Props = {
  slug: string | null
  activeBp: InspectorBp
  onActiveBpChange: (bp: InspectorBp) => void
  onCellEdit?: (selector: string, bp: InspectorBp, property: string, value: string) => void
}
```

Forward to `<InspectorPanel onCellEdit={onCellEdit} ... />`.

**`tools/block-forge/src/App.tsx`** — wire dispatch:

Find where `<Inspector ... />` is mounted (Phase 1 added it). Add the prop:

```tsx
<Inspector
  slug={selectedSlug}
  activeBp={inspectorBp}
  onActiveBpChange={setInspectorBp}
  onCellEdit={(selector, bp, property, value) => {
    dispatch(addTweak({ selector, bp, property, value }))
  }}
/>
```

`addTweak` already exists in `lib/session.ts:135`. The render-time memo `composeTweakedCss(block.css, session.tweaks)` (App.tsx:169) automatically picks up the new tweak; PreviewTriptych re-renders the iframe with new srcdoc; Inspector re-pins on the new iframe.

### Test coverage targets (§3.1)

- **`__tests__/inspector-cell-edit.test.tsx`** (NEW) — ~6 tests:
  1. Active cell renders `<input>` when `onCellEdit` provided
  2. Inactive cells stay `<span>` (no input element)
  3. Type new value + blur → onCellEdit called with `(selector, bp, property, newValue)`
  4. Type new value + Enter → onCellEdit called
  5. Type new value + Escape → onCellEdit NOT called; input reverts
  6. Type `em` value → onCellEdit NOT called (validation reject)

---

## §3.2 — `useInspectorPerBpValues` hook (Option A: 3 hidden iframes)

### Goal

Inspector shows `60px / 48px / 32px` for `font-size` on `.gauge-score` across `D / T / M` cells without the user manually switching tabs. Hidden-iframe-per-BP runs once per `(selector, effectiveCssHash)` tuple; cached on subsequent re-renders until pin or effectiveCss changes.

### File-by-file changes

**`tools/block-forge/src/hooks/useInspectorPerBpValues.ts`** (NEW):

```ts
// WP-033 Phase 3 — Per-BP value sourcing via 3 hidden browser iframes.
//
// Ruling E (Phase 0 §0.9) — Option A. Three off-screen iframes per pin event,
// each at the canonical width (375 / 768 / 1440); inject composeSrcDoc with
// the same effectiveCss; on load, querySelector(pinned.selector); harvest
// snapshotComputed; relay to React state. Cache by (selector, effectiveCssHash).
//
// Module-scoped cache survives re-mounts. Cleanup on unmount disposes any
// in-flight iframes; cache lookup short-circuits redundant work.

import { useEffect, useState, useRef } from 'react'
import type { ComputedSnapshot, InspectorBp, PinState } from '../components/Inspector'
import { composeSrcDoc } from '../lib/preview-assets'

type ValuesByBp = Record<InspectorBp, ComputedSnapshot | null>

const cache = new Map<string, ValuesByBp>()

const PROBE_BPS: readonly InspectorBp[] = [375, 768, 1440] as const

function emptyMap(): ValuesByBp {
  return { 375: null, 768: null, 1440: null }
}

function hashCss(css: string): string {
  // Cheap djb2-ish; collision risk acceptable (cache invalidation on any miss).
  let h = 5381
  for (let i = 0; i < css.length; i++) h = (h * 33) ^ css.charCodeAt(i)
  return String(h >>> 0)
}

export function useInspectorPerBpValues(args: {
  pinned: PinState | null
  blockHtml: string
  effectiveCss: string
}): ValuesByBp {
  const { pinned, blockHtml, effectiveCss } = args
  const [valuesByBp, setValuesByBp] = useState<ValuesByBp>(() => emptyMap())
  const inFlightIframesRef = useRef<HTMLIFrameElement[]>([])

  useEffect(() => {
    if (!pinned?.selector) {
      setValuesByBp(emptyMap())
      return
    }

    const cacheKey = `${pinned.selector}::${hashCss(effectiveCss)}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setValuesByBp(cached)
      return
    }

    const result: ValuesByBp = emptyMap()
    let pending = PROBE_BPS.length
    const iframes: HTMLIFrameElement[] = []

    PROBE_BPS.forEach((bp) => {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.position = 'absolute'
      iframe.style.left = '-99999px'
      iframe.style.top = '-99999px'
      iframe.style.width = `${bp}px`
      iframe.style.height = '600px'
      iframe.title = `inspector-probe-${bp}`
      iframe.srcdoc = composeSrcDoc({ html: blockHtml, css: effectiveCss, width: bp, slug: 'inspector-probe' })

      iframe.addEventListener('load', () => {
        try {
          const doc = iframe.contentDocument
          const target = doc?.querySelector(pinned.selector) ?? null
          if (target && doc) {
            const view = iframe.contentWindow!
            const cs = view.getComputedStyle(target)
            result[bp] = harvestSnapshot(cs)
          }
        } catch (_err) {
          result[bp] = null
        }
        pending -= 1
        if (pending === 0) {
          cache.set(cacheKey, result)
          setValuesByBp(result)
          iframes.forEach((f) => f.remove())
        }
      })

      document.body.appendChild(iframe)
      iframes.push(iframe)
    })

    inFlightIframesRef.current = iframes
    return () => {
      inFlightIframesRef.current.forEach((f) => f.remove())
      inFlightIframesRef.current = []
    }
  }, [pinned?.selector, effectiveCss, blockHtml])

  return valuesByBp
}

// Mirror snapshotComputed from preview-assets.ts — must stay in sync with
// the 24 MVP keys. If the parent's snapshotComputed grows, mirror here.
function harvestSnapshot(cs: CSSStyleDeclaration): ComputedSnapshot {
  return {
    marginTop: cs.marginTop, marginRight: cs.marginRight, marginBottom: cs.marginBottom, marginLeft: cs.marginLeft,
    paddingTop: cs.paddingTop, paddingRight: cs.paddingRight, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft,
    gap: cs.gap, rowGap: cs.rowGap, columnGap: cs.columnGap,
    fontSize: cs.fontSize, lineHeight: cs.lineHeight, fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, textAlign: cs.textAlign,
    display: cs.display, flexDirection: cs.flexDirection, alignItems: cs.alignItems, justifyContent: cs.justifyContent, gridTemplateColumns: cs.gridTemplateColumns,
  }
}
```

**Wire-up in `InspectorPanel.tsx`:**

Replace `activeOnly(cs.X)` with `valuesByBp[X]` reading from the hook. The hook needs `blockHtml + effectiveCss`, which Inspector currently doesn't have — these need to be threaded down from App.tsx.

**Threading decision (Hands' choice):**

Two reasonable shapes. Pick whichever has lower API surface drift:

- **Option A:** `Inspector` becomes the hook's caller — App passes `blockHtml + effectiveCss` to Inspector as props; Inspector calls `useInspectorPerBpValues(...)`; passes resulting map down to InspectorPanel as a new prop.
- **Option B:** `useInspectorPerBpValues` is called inside `InspectorPanel` (closer to consumer); App passes `blockHtml + effectiveCss` all the way down through Inspector → Panel.

Either is defensible. Recommendation: **Option A** (Inspector owns hook lifecycle, panel stays presentational). Document choice + reasoning in result.md.

### Edge case — Phase 1 active-cell sourcing collision

Phase 1 already populates `pinned.computedStyle` from the visible iframe at the active BP. With the hook, the active-BP cell now has TWO sources:

1. `pinned.computedStyle` (Phase 1, from visible iframe)
2. `valuesByBp[activeBp]` (Phase 3, from hidden probe iframe)

These should be byte-equal in steady state. If they diverge, prefer (1) — it's the actual rendered iframe, not a probe. Implementation: `valuesByBp[activeBp] || pinned.computedStyle` fallback, OR override active-BP with `pinned.computedStyle` post-hook.

Document the sourcing precedence in result.md.

### Test coverage targets (§3.2)

- **`__tests__/useInspectorPerBpValues.test.ts`** (NEW) — ~6 tests:
  1. No pin → returns empty map (all 3 BPs null)
  2. Pin set → 3 hidden iframes spawn (assert `document.querySelectorAll('iframe[title^="inspector-probe-"]').length === 3` mid-test)
  3. After all 3 iframes load → returns populated map (jsdom iframe load events deterministic via `setTimeout`)
  4. Cache hit on second mount with same (selector, css) → 0 new iframes spawn
  5. Cache miss on selector change → new iframes spawn
  6. Unmount during in-flight → iframes disposed (cleanup verified)

**Note on jsdom limitations:** if jsdom can't actually compute `getComputedStyle` resolution under `@container` rules (jsdom's CSS engine is incomplete), the test asserts the *flow* (iframe spawn + state update) without asserting the *resolved values*. Live smoke at end of phase verifies actual values in real browser. Document any jsdom limitations in result.md as test-tool artifact.

---

## §3.3 — `useChipDetection` + `<TokenChip>` (Option B-subset PostCSS walk)

### Goal

User pins `.heading` → `font-size` row shows `48px` at active BP → chip detection runs → finds raw `48px` matches `--h2-font-size` at 1440 BP → renders chip `[Use --h2-font-size ✓ — sets 32/40/48px at all 3 BPs]` → user clicks chip → emits `addTweak({selector, bp:0, property:'font-size', value:'var(--h2-font-size)'})` → fluid token now applies; cell shows `48px` (D), `40px` (T), `32px` (M); chip transitions to "in-use" mode (subdued, non-clickable).

### Token resolution math (from Phase 0 §0.7)

The 22 fluid tokens resolve to a clamp expression: `clamp(min, fluid, max)` where `min = minPx`, `max = maxPx`, `fluid` = linear interpolation between `minViewport=375` and `maxViewport=1440`. For the 3 BPs:

- BP=375 → `min` (the floor)
- BP=1440 → `max` (the cap)
- BP=768 → `min + (768-375)/(1440-375) * (max-min) = min + 0.369 * (max-min)`

The token `--h2-font-size` (per `responsive-config.json`) has `minPx=34, maxPx=42` (NOT what I wrote in the example; example is illustrative). Hands MUST read actual values from `responsive-config.json` overrides + ratio math to compute the BP triple per token.

**Helper to add to `useChipDetection.ts`:**

```ts
function resolveTokenAtBp(token: string, bp: InspectorBp, config: ResponsiveConfig): number | null {
  // Look up token in config.overrides → minPx/maxPx
  // OR derive from config.type stepMap × ratio math (for type tokens)
  // OR derive from config.spacing × multiplier (for space tokens)
  // Return px value at the given BP, or null if token not found.
}
```

Round to integer px for matching (browser px-resolution is integer).

### Detection algorithm

```
function detectChip(args):
  selector, property, valueAtActiveBp, activeBp, effectiveCss, config

  1. Parse effectiveCss with PostCSS.
  2. Walk rules; find RULE matching selector with declaration for property.
     - Multiple matches possible (cascade order); take the LAST one (cascade winner).
     - If inside @container: only consider the rule whose @container BP === activeBp,
       OR top-level rules with no @container.
  3. Read declaration source value (raw text).
  4. If sourceValue.startsWith('var(--'):
     - Extract token name (regex: /var\(\s*(--[a-z0-9-]+)\s*\)/)
     - If token in 22-token list AND token matches property (e.g. font-size → type tokens):
       → Return { mode: 'in-use', tokenName, valuesByBp: resolve3BPs(token) }
     - Else: return null
  5. Else (raw px or other unit):
     - For each token in 22-token list compatible with property:
       - Compute resolveTokenAtBp(token, activeBp, config).
       - If parseInt(valueAtActiveBp) === resolved → MATCH
     - If matched: return { mode: 'available', tokenName, valuesByBp: resolve3BPs(token), onApply }
     - Else: return null
```

**Property-token compatibility table (subset; expand for completeness):**

| Property | Compatible token category |
|---|---|
| `font-size` | type (`--text-*-font-size`, `--h*-font-size`, `--caption-font-size`, `--text-display`) |
| `line-height` | line-height tokens (subset of type — TBD by Hands per `responsive-config.json` shape) |
| `margin-*`, `padding-*`, `gap`, `row-gap`, `column-gap` | space (`--space-*`) |
| `letter-spacing`, `font-weight`, `text-align`, `display`, `flex-direction`, `align-items`, `justify-content`, `grid-template-columns` | NO token compatibility — chip never appears for these properties (return null) |

### File-by-file changes

**`tools/block-forge/src/hooks/useChipDetection.ts`** (NEW):

```ts
// WP-033 Phase 3 — Token chip detection.
//
// Ruling E (Phase 0 §0.9) — Option B-subset. PostCSS parse + cascade walk
// finds the source declaration value for a (selector, property) pair, then
// matches against the 22 fluid tokens from responsive-config.json.

import { useMemo } from 'react'
import postcss from 'postcss'
import responsiveConfig from '@cmsmasters/ui/responsive-config.json'
import type { InspectorBp } from '../components/Inspector'

export type ChipState =
  | { mode: 'in-use'; tokenName: string; valuesByBp: Record<InspectorBp, number> }
  | { mode: 'available'; tokenName: string; valuesByBp: Record<InspectorBp, number> }
  | null

export function useChipDetection(args: {
  selector: string | null
  property: string
  valueAtActiveBp: string | null
  activeBp: InspectorBp
  effectiveCss: string
}): ChipState {
  return useMemo(() => {
    // Implementation per algorithm above
    // ...
  }, [args.selector, args.property, args.valueAtActiveBp, args.activeBp, args.effectiveCss])
}
```

**`tools/block-forge/src/components/TokenChip.tsx`** (NEW):

```tsx
// WP-033 Phase 3 — Token chip render.
//
// Two modes:
//   - in-use: subdued, no click; "Currently using --<token>"
//   - available: clickable; "[Use --<token> ✓ — sets X/Y/Z at all 3 BPs]"
//
// Click handler emits a single bp:0 tweak (var(--token) at top-level; fluid
// token resolves correctly across all 3 BPs via clamp).

import type { InspectorBp } from './Inspector'

export interface TokenChipProps {
  mode: 'in-use' | 'available'
  tokenName: string
  valuesByBp: Record<InspectorBp, number>
  onApply?: () => void
  'data-testid'?: string
}

export function TokenChip(props: TokenChipProps) {
  const { mode, tokenName, valuesByBp, onApply } = props
  const testId = props['data-testid'] ?? `token-chip-${tokenName}`

  if (mode === 'in-use') {
    return (
      <span
        data-testid={testId}
        data-mode="in-use"
        className="rounded border border-[hsl(var(--border-default))] px-2 py-0.5 font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]"
      >
        Using {tokenName}
      </span>
    )
  }

  // available
  return (
    <button
      type="button"
      data-testid={testId}
      data-mode="available"
      onClick={onApply}
      className="rounded border border-[hsl(var(--text-link))] bg-[hsl(var(--bg-surface-alt))] px-2 py-0.5 font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-link))] hover:bg-[hsl(var(--text-link))] hover:text-[hsl(var(--bg-surface))]"
      title={`Sets ${valuesByBp[375]}/${valuesByBp[768]}/${valuesByBp[1440]}px at M/T/D`}
    >
      Use {tokenName} ✓
    </button>
  )
}
```

**Wire-up in `InspectorPanel.tsx`:**

For each PropertyRow, call `useChipDetection` with the row's property + value:

```tsx
function ChipForRow({ pinned, property, valueAtActiveBp, activeBp, effectiveCss, onApplyToken }) {
  const chip = useChipDetection({ selector: pinned.selector, property, valueAtActiveBp, activeBp, effectiveCss })
  if (!chip) return null
  return (
    <TokenChip
      mode={chip.mode}
      tokenName={chip.tokenName}
      valuesByBp={chip.valuesByBp}
      onApply={chip.mode === 'available' ? () => onApplyToken(pinned.selector, property, chip.tokenName) : undefined}
    />
  )
}
```

`onApplyToken` is a new callback threaded from App.tsx parallel to `onCellEdit`:

```tsx
onApplyToken={(selector, property, tokenName) => {
  dispatch(addTweak({ selector, bp: 0, property, value: `var(${tokenName})` }))
}}
```

`bp: 0` emits as a top-level rule (Phase 0 §0.10 verified). Fluid token applies at all 3 BPs via clamp.

### Test coverage targets (§3.3)

- **`__tests__/useChipDetection.test.ts`** (NEW) — ~8 tests:
  1. Selector with `var(--h2-font-size)` declaration → `mode: 'in-use'`
  2. Selector with raw `42px` matching `--h2-font-size` at activeBp=1440 → `mode: 'available'`
  3. Selector with raw `99px` not matching any token → returns `null`
  4. Property `text-align` (no compatible tokens) → returns `null`
  5. Token in source but property mismatch (e.g., `font-size: var(--space-md)`) → returns `null` (incompatible category)
  6. Cascade winner respect: rule inside `@container slot (max-width: 768)` outranks top-level rule when activeBp=768 → uses container rule's value for matching
  7. Cache memoization: re-render with same args → same result reference (referential equality)
  8. Empty selector → returns `null`

- **`__tests__/TokenChip.test.tsx`** (NEW) — ~6 tests:
  1. Mode 'in-use' renders `<span>` with token name; no button
  2. Mode 'available' renders `<button>` with `✓`
  3. Title attr contains `M/T/D` triple in correct order
  4. Click button → `onApply` called
  5. No `onApply` provided when mode 'in-use'
  6. Mode 'in-use' has `data-mode="in-use"`; available has `data-mode="available"`

---

## §3.4 — Visibility wire (hide-only)

### Goal

User pins `.gauge-score` → checks "Hide at 1440" → element vanishes in iframe at 1440 BP → unchecks → element returns.

### File-by-file changes

**`tools/block-forge/src/components/InspectorPanel.tsx`** — replace disabled checkbox with controlled wire:

Phase 2 currently renders a disabled checkbox with `(Phase 3)` italic hint. Phase 3 enables it:

```tsx
<input
  type="checkbox"
  checked={isHiddenAtActiveBp}
  onChange={(e) => onVisibilityToggle(activeBp, e.currentTarget.checked)}
  aria-label={`Hide at ${activeBp}px breakpoint`}
  data-testid="inspector-hide-at-bp"
/>
<span>Hide at {activeBp}</span>
```

Where `isHiddenAtActiveBp` is derived from session.tweaks: any tweak with `(selector === pinned.selector && bp === activeBp && property === 'display' && value === 'none')` → checked.

**Threading:**

`onVisibilityToggle` is a new callback in InspectorPanel props:

```tsx
onVisibilityToggle?: (bp: InspectorBp, hide: boolean) => void
```

Inspector receives `onVisibilityToggle` from App and forwards. App's handler:

```tsx
onVisibilityToggle={(bp, hide) => {
  if (hide) {
    dispatch(addTweak({ selector: pinned.selector, bp, property: 'display', value: 'none' }))
  } else {
    dispatch(removeTweakFor(pinned.selector, bp, 'display'))
  }
}}
```

**`tools/block-forge/src/lib/session.ts`** — add property-scoped reducer:

```ts
/**
 * Remove a single tweak matching (selector, bp, property). Phase 3 visibility
 * checkbox uncheck path: precise reset of the display:none tweak only,
 * preserves other tweaks at the same (selector, bp).
 */
export function removeTweakFor(state: SessionState, selector: string, bp: number, property: string): SessionState {
  const next = state.tweaks.filter((t) => !(t.selector === selector && t.bp === bp && t.property === property))
  if (next.length === state.tweaks.length) return state
  return { ...state, tweaks: next }
}
```

Additive — does not break existing `removeTweaksFor` (selector+bp scoped). Document at result.md as a Phase 3 SOT extension.

**Detecting `isHiddenAtActiveBp`:**

The check needs the current session.tweaks. Inspector needs to know about session.tweaks to derive checkbox state. Pass `tweaks` as a prop to Inspector:

```tsx
type Props = {
  // existing
  tweaks: ReadonlyArray<Tweak>
}
```

Or compute `isHiddenAtActiveBp` in App.tsx and pass as a prop down through Inspector → Panel:

```tsx
isHiddenAtActiveBp={
  pinned
    ? session.tweaks.some(
        (t) =>
          t.selector === pinned.selector &&
          t.bp === inspectorBp &&
          t.property === 'display' &&
          t.value === 'none',
      )
    : false
}
```

**Recommendation:** Compute in App.tsx (closer to session ownership). Document choice in result.md.

### Test coverage targets (§3.4)

- 3 InspectorPanel tests (added to existing `InspectorPanel.test.tsx`):
  1. Checkbox enabled when pinned (no `(Phase 3)` hint)
  2. Check → onVisibilityToggle(activeBp, true) called
  3. Uncheck → onVisibilityToggle(activeBp, false) called

- 1 session.ts test (added to existing `session.test.ts`):
  1. `removeTweakFor(state, 'sel', 1440, 'display')` removes only the display tweak; preserves font-size tweak at same (selector, bp)

---

## §3.5 — Tests + manifest + slider-bug regression pin

### Slider-bug regression pin (the bug WP-033 was born to fix)

WP-028 left the slider-doesn't-apply bug; commit `ac739477` fixed it post-WP-030 (bypass `@container slot` queries when fluid pinned). Phase 3 adds a regression vitest that PINS the contract: if this regresses, Phase 3 vitest goes red BEFORE smoke breaks at runtime.

**`tools/block-forge/src/__tests__/slider-bug-regression.test.ts`** (NEW) — ~3 tests:

```ts
describe('Slider-bug regression — emitTweak({ bp }) preserves @container behavior', () => {
  it('emitTweak with bp=1440 lands inside @container slot (max-width: 1440px)', () => {
    const baseCss = `.gauge-score { font-size: 60px; }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 1440, property: 'font-size', value: '48px' },
      baseCss,
    )
    expect(out).toContain('@container slot (max-width: 1440px)')
    expect(out).toMatch(/@container slot \(max-width: 1440px\) \{[\s\S]*\.gauge-score \{[\s\S]*font-size: 48px/)
  })

  it('emitTweak with bp=0 lands at top-level (no @container wrap)', () => {
    const baseCss = `.gauge-score { font-size: 60px; }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 0, property: 'font-size', value: 'var(--h2-font-size)' },
      baseCss,
    )
    expect(out).toContain('font-size: var(--h2-font-size)')
    // Top-level emit: rule sits outside any @container.
    const root = postcss.parse(out)
    let foundTopLevel = false
    root.walkRules('.gauge-score', (rule) => {
      if (rule.parent && rule.parent.type === 'root') {
        rule.walkDecls('font-size', (decl) => {
          if (decl.value.includes('var(--h2-font-size)')) foundTopLevel = true
        })
      }
    })
    expect(foundTopLevel).toBe(true)
  })

  it('emitTweak update overwrites existing declaration without duplication', () => {
    const baseCss = `.gauge-score { font-size: 60px; }
@container slot (max-width: 1440px) { .gauge-score { font-size: 48px; } }`
    const out = emitTweak(
      { selector: '.gauge-score', bp: 1440, property: 'font-size', value: '40px' },
      baseCss,
    )
    expect(out).toContain('40px')
    expect(out).not.toContain('48px')
  })
})
```

### Manifest + arch-test

**`src/__arch__/domain-manifest.ts`** — add to `infra-tooling.owned_files`:

- `tools/block-forge/src/hooks/useInspectorPerBpValues.ts`
- `tools/block-forge/src/hooks/useChipDetection.ts`
- `tools/block-forge/src/components/TokenChip.tsx`
- `tools/block-forge/src/__tests__/useInspectorPerBpValues.test.ts`
- `tools/block-forge/src/__tests__/useChipDetection.test.ts`
- `tools/block-forge/src/__tests__/TokenChip.test.tsx`
- `tools/block-forge/src/__tests__/inspector-cell-edit.test.tsx`
- `tools/block-forge/src/__tests__/slider-bug-regression.test.ts`

**Note on hooks/ directory:** if `tools/block-forge/src/hooks/` doesn't exist yet (Phase 1 + 2 didn't create one), this Phase 3 establishes it. No special manifest concern — just owned_files entries per file.

`npm run arch-test` target: **560 / 560** (552 baseline + 8 new owned_files × 1 test/file per Phase 1+2 empirical schema). No SKILL flips (infra-tooling SKILL stays Skeleton until Close phase per WP §Close).

---

## Live smoke verification matrix (Phase 3 close)

Hands runs `npm run dev` in `tools/block-forge/` and pins `.gauge-score` on `fast-loading-speed`. Confirm:

| Check | Expected |
|---|---|
| 3 cells populated for font-size (D=60, T=??, M=??) | Hidden iframes filled inactive cells |
| Cell click → input → type `48px` → blur | font-size updates in iframe; cell shows `48px` |
| Type `2em` → blur | input reverts to previous value (em rejected) |
| Type empty → blur | input reverts (cancel) |
| Pin element with raw `48px` font-size | TokenChip appears: `Use --<token> ✓` |
| Click token chip | iframe re-renders; chip transitions to `Using --<token>` (in-use mode); 3 cells show 3 different px values matching token's BP triple |
| Pin element already using `var(--h2-font-size)` | TokenChip immediately shows `Using --h2-font-size` (in-use, no click action) |
| Hide-at-1440 checkbox → check | `.gauge-score` disappears at 1440 BP only; other BPs render normally |
| Uncheck Hide-at-1440 | element reappears |
| Re-pin after edit (BP switch via ↗) | new BP cell becomes active; new value shows; chip detection re-runs at new BP |

**Document live smoke in result.md with** at least 2 screenshot pieces of evidence (iframe at active BP showing edit committed; chip in both modes).

---

## What success looks like (Hands' result.md table)

| Gate | Target |
|---|---|
| arch-test | 560/560 (+8) |
| typecheck | clean |
| block-forge tests | 240+/240+ (212 baseline + ~28 new) |
| Studio + packages untouched | ✅ |
| TweakPanel.tsx untouched | ✅ |
| preview-assets.ts outline IIFE untouched | ✅ (touch only if §3.x needs new postMessage type — escalate at result.md) |
| Live smoke: cell edit | green (font-size 60→48 via input) |
| Live smoke: token chip apply | green (raw px → `var(--token)` flips to in-use mode) |
| Live smoke: visibility hide | green (display:none at active BP) |
| 3 hidden iframes spawned per pin | verified DOM count mid-pin |
| Slider-bug regression pin | green (3 emitTweak vitest) |

---

## Phase 3 deliverables (committed by Hands at end)

1. **3 commits on main:**
   - `docs(wp-033): phase 3 task prompt — property edit + per-BP cells + token chip + visibility [WP-033 phase 3]` (this file, committed by Brain BEFORE handoff per workflow)
   - `feat(block-forge): WP-033 phase 3 — inspector property edit + token chip + visibility wire [WP-033 phase 3]` (impl + tests + manifest)
   - `docs(wp-033): phase 3 result — inspector edit + chip + visibility GREEN [WP-033 phase 3 followup]` (result.md)

2. **Files touched (expected):**
   - `tools/block-forge/src/hooks/useInspectorPerBpValues.ts` (NEW)
   - `tools/block-forge/src/hooks/useChipDetection.ts` (NEW)
   - `tools/block-forge/src/components/TokenChip.tsx` (NEW)
   - `tools/block-forge/src/components/Inspector.tsx` (added onCellEdit + onApplyToken + onVisibilityToggle props; calls useInspectorPerBpValues if Option A threading chosen)
   - `tools/block-forge/src/components/InspectorPanel.tsx` (wires hooks; visibility checkbox enabled; passes tokenChip slots)
   - `tools/block-forge/src/components/PropertyRow.tsx` (active cell editable on focus)
   - `tools/block-forge/src/App.tsx` (3 new dispatchers: cell-edit, token-apply, visibility-toggle)
   - `tools/block-forge/src/lib/session.ts` (`removeTweakFor` reducer added)
   - 5 new test files (tests for each new hook + component + cell-edit + slider regression)
   - `src/__arch__/domain-manifest.ts` (+8 owned_files)

3. **Result.md sections (mandatory):**
   - What Was Implemented
   - §3.1 / §3.2 / §3.3 / §3.4 / §3.5 sub-sections (matching this prompt)
   - Issues & Workarounds (if any)
   - Open Questions for Phase 4 (cross-surface mirror)
   - Phase 4 entry conditions (all must be ✅)
   - Verification Results table
   - Files touched table
   - Notes for Brain Review
   - Git (commit SHA)

---

## Out-of-scope this phase (DO NOT do)

- ❌ Inheritance walker for `inheritedFrom?` slot — explicit Phase 3 non-goal (Phase 0 §0.11.b deferred)
- ❌ Ancestor chain emit in BreadcrumbNav — Ruling 3 deferred
- ❌ Show-back semantic restore for visibility uncheck — Ruling 4 simplified to remove-only
- ❌ Studio Responsive tab mirror — Phase 4 scope
- ❌ PARITY.md trio updates — Phase 4 scope
- ❌ SKILL flips — Phase 5 Close scope
- ❌ Domain manifest changes outside `infra-tooling.owned_files`
- ❌ TweakPanel.tsx modifications (legacy coexists; no merge)
- ❌ Inspector.tsx postMessage protocol changes (Phase 1 contract LOCKED unless escalation §)

---

## Escalation triggers (surface to Brain immediately)

1. **Hidden iframe lifecycle issues** — if 3 iframes/pin spike memory or interfere with visible PreviewPanel iframe → fall back to single-active-BP render per §0.9 escape hatch; document in result.md.
2. **`useChipDetection` PostCSS rule resolution edge cases** — if cascade winner detection produces ambiguous matches on real blocks (multiple equally-specific rules), escalate for Brain ruling on disambiguation policy.
3. **`removeTweakFor` reducer shape mismatch** — if Phase 3 visibility wire reveals the property-scoped reducer needs different signature than proposed, document at result.md and propose alternative; do NOT block Phase 3 close.
4. **`composeSrcDoc` invocation cost** — if composing srcdoc 3× per pin event causes perceptible delay (>200ms cold), escalate for caching strategy ruling.
5. **Active-cell-vs-hook-snapshot divergence** — if `pinned.computedStyle` (Phase 1) and `valuesByBp[activeBp]` (Phase 3) diverge by >0 px at same BP, escalate for sourcing precedence ruling. Default behavior: prefer Phase 1's `pinned.computedStyle` (it's the actual visible iframe).

---

## Acceptance criteria (Hands MUST satisfy ALL)

- [ ] `npm run arch-test` from repo root → **560 / 560** (+8 from Phase 2 baseline 552)
- [ ] `npm run typecheck` from repo root → clean (no new type errors)
- [ ] `npm run test` from `tools/block-forge/` → 240+ tests passing, 0 failing (212 baseline + ~28 new)
- [ ] No diffs in `apps/studio/`, `packages/ui/`, `packages/block-forge-core/`, `tools/responsive-tokens-editor/`
- [ ] Live smoke at `tools/block-forge/` :7702 — pin → cell edit → token chip apply → visibility hide all GREEN
- [ ] Slider-bug regression vitest GREEN (3 emitTweak assertions)
- [ ] All 4 Brain rulings (1-4) honored, deviations explicitly escalated to Brain
- [ ] result.md committed with all mandatory sections, including Open Questions for Phase 4 + entry conditions checklist
- [ ] Commit SHAs recorded in result.md §Git

---

## Brain → Operator handoff
Phase 3 task prompt drafted. 5 tasks, ~12-17h budget, 4 Brain rulings locked, slider-bug regression pin included. Phase 4 cross-surface mirror unblocked once Phase 3 ships.

Awaiting Operator approval to commit prompt + handoff to Hands.
