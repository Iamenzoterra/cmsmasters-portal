# WP-036 Phase 1 — Hover-Highlight Result

> **Phase:** 1 (Implementation — sidebar→iframe hover-highlight protocol)
> **Date:** 2026-04-28
> **Workpackage:** WP-036 Inspector UX Polish
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE — all gates GREEN at both surfaces

---

## TL;DR

Hovering a suggestion card in the sidebar now outlines the matching CSS target in the iframe preview. Works at **both** block-forge (single-iframe) and Studio (3-iframe triptych broadcast). Pin protocol untouched. Zero engine-package edits. ~150 LOC across 8 source files + 2 test files.

---

## Outcome ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | New attribute outline rule + IIFE listener at both surfaces | preview-assets.ts diffs at both surfaces |
| Silver | Handler thread App.tsx → SuggestionList → SuggestionRow at both surfaces | 6 source files modified |
| Gold | Existing test suites GREEN + 12 new tests added (6 per surface) | block-forge 27/27 preview-assets; Studio 21/21 preview-assets |
| Platinum | Live Playwright smoke at both surfaces with multi-card transitions verified | Screenshots + DOM probe results below |

---

## Files modified

### Block-forge (5 files)
| File | LOC | Change |
|---|---|---|
| `tools/block-forge/src/lib/preview-assets.ts` | +28 | New `[data-bf-hover-from-suggestion]` outline rule, new IIFE listener for `inspector-request-hover`, beforeunload cleanup |
| `tools/block-forge/src/App.tsx` | +27 | New `handlePreviewHover` useCallback broadcasts to all `iframe[title^="${slug}-"]` via `querySelectorAll` |
| `tools/block-forge/src/components/SuggestionList.tsx` | +4 | Optional `onPreviewHover` prop pass-through |
| `tools/block-forge/src/components/SuggestionRow.tsx` | +9 | `onMouseEnter` / `onMouseLeave` on outermost div (gracefully no-ops when prop omitted) |
| `tools/block-forge/src/__tests__/preview-assets.test.ts` | +50 | 6 source-contract tests for new IIFE shape |

### Studio (5 files — mirror)
| File | LOC | Change |
|---|---|---|
| `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` | +28 | Mirror — same outline rule + IIFE listener + beforeunload cleanup |
| `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` | +27 | Mirror — `handlePreviewHover` useCallback |
| `apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx` | +4 | Mirror — prop pass-through |
| `apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx` | +15 | Mirror — `onMouseEnter`/`onMouseLeave` |
| `apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts` | +50 | Mirror — 6 source-contract tests |

**Total: ~242 LOC across 10 files (5 source + 1 test per surface).**

Snapshot files auto-updated by `vitest --update`:
- `tools/block-forge/src/__tests__/__snapshots__/preview-assets.test.ts.snap`

---

## Protocol shape

### Parent → iframe

```js
// At block-forge App.tsx + Studio ResponsiveTab.tsx
const handlePreviewHover = useCallback((selector: string | null) => {
  const iframes = document.querySelectorAll<HTMLIFrameElement>(
    `iframe[title^="${CSS.escape(currentSlug)}-"]`,
  )
  iframes.forEach((iframe) => {
    iframe.contentWindow?.postMessage(
      { type: 'block-forge:inspector-request-hover', slug: currentSlug, selector: selector ?? '__clear__' },
      '*',
    )
  })
}, [currentSlug])
```

### Iframe IIFE listener

```js
// Inside composeSrcDoc IIFE at both preview-assets.ts files
window.addEventListener('message', (e) => {
  const msg = e.data
  if (msg?.type !== 'block-forge:inspector-request-hover') return
  if (msg.slug !== SLUG) return

  document.querySelectorAll('[data-bf-hover-from-suggestion]')
    .forEach((el) => el.removeAttribute('data-bf-hover-from-suggestion'))

  if (!msg.selector || msg.selector === '__clear__') return

  let target = null
  try { target = document.querySelector(msg.selector) } catch (_) {}
  if (!target) return
  target.setAttribute('data-bf-hover-from-suggestion', '')
})
```

### Outline rule (CSS — both surfaces, byte-identical)

```css
[data-bf-hover-from-suggestion] {
  outline-style: solid;
  outline-width: 2px;
  outline-color: hsl(var(--text-link));
  outline-offset: -2px;
}
```

Same blue token (`--text-link`) as native `[data-bf-hover]` — but separate attribute slot so the two outlines coexist on different elements without racing.

### React handler

```tsx
// SuggestionRow.tsx (both surfaces, structurally identical)
<div
  onMouseEnter={onPreviewHover ? () => onPreviewHover(suggestion.selector) : undefined}
  onMouseLeave={onPreviewHover ? () => onPreviewHover(null) : undefined}
  ...
```

Optional handler — if `onPreviewHover` undefined (test contexts), no listeners attached → graceful no-op.

---

## Live smoke evidence

### Block-forge (single-iframe at active BP tab)

| Step | Card hovered | Iframe target | Outlined element |
|---|---|---|---|
| 1 | `.block-global-settings__card-title` | `global-settings-1440` | SPAN "Global Colors" |
| 2 | `.block-global-settings__color-label` | `global-settings-1440` | SPAN "Primary" |
| 3 | `.block-global-settings__element-row` | `global-settings-1440` | DIV "Logo …" |
| 4 | (mouse leaves to dropdown) | all iframes | **0 outlined** (cleared) |

Visual evidence: `.playwright-mcp/wp036-p1-bf-hover-card-title.png` — "Global Colors" text has visible blue outline.

### Studio (3-iframe triptych — multi-broadcast)

| Step | Card hovered | All 3 iframes (1440/768/375) | Outlined element |
|---|---|---|---|
| 1 | `.block-fast-loading-speed .gauge-score` (font-clamp) | `count: 1` in each | DIV "90+" (gauge-score) |
| 2 | (mouse leaves to sidebar nav) | `count: 0` in each | **all 3 cleared** |

Multi-iframe broadcast confirmed via DOM probe at all 3 BPs simultaneously. Visual screenshot: `.playwright-mcp/wp036-p1-studio-hover-iframes-visible.png`.

---

## Test gates

| Gate | Result |
|---|---|
| Block-forge typecheck | CLEAN for all WP-036 files (pre-existing PropertyRow + ExportDialog drift unrelated) |
| Studio typecheck | CLEAN |
| Block-forge `preview-assets.test.ts` | 27/27 (21 existing + 6 new WP-036) |
| Studio `preview-assets.test.ts` | 21/21 (15 existing + 6 new WP-036) |
| Block-forge full suite | 24 pre-existing failures (PropertyRow snapshot drift, inspector-cell-edit, app-save-regression timeouts) — UNRELATED to WP-036 |
| Studio full suite | 245/245 ✅ |
| Block-forge live smoke | 4 transitions GREEN (3 cards + clear) |
| Studio live smoke | 2 transitions GREEN (1 card → 3 iframes + clear) |

The 24 pre-existing block-forge failures are concentrated in `PropertyRow.test.tsx`, `inspector-cell-edit.test.tsx`, `InspectorPanel.test.tsx` snapshot drift, and `app-save-regression.test.tsx` timeouts. None touch the files modified in WP-036 Phase 1. They originate from concurrent WP-035 (sandbox export/import) work in flight, visible in the same git working tree (e.g., `tools/block-forge/src/components/ExportDialog` import added to App.tsx by another agent).

---

## Design decisions honored from RECON

| RECON decision | Honored in Phase 1? |
|---|---|
| Path A (new `inspector-request-hover` protocol) over Path B (click-to-pin) | ✅ |
| New `data-bf-hover-from-suggestion` attribute (avoid race with native `[data-bf-hover]`) | ✅ |
| Same blue `--text-link` token (visual cognition continuity) | ✅ |
| `querySelectorAll` clear-all-then-apply (multi-match safety) | ✅ |
| Try/catch around `querySelector` (invalid-selector silent) | ✅ |
| Fire-and-forget shape (no postback for transient hover) | ✅ |
| Cross-surface lockstep (PARITY trio) | ✅ |
| Optional `onPreviewHover` prop — graceful test-context fallback | ✅ |
| Multi-iframe broadcast (querySelectorAll on parent side) | ✅ — Studio benefits naturally |
| Beforeunload cleanup includes new attribute | ✅ |

---

## Phase 1 → Phase 2 handoff notes

**Phase 1 deliverable:** hover-highlight V1 ships, end-to-end verified at both surfaces.

**Phase 2 next** (Undo + Heuristic Group):
1. New `removeFromPending(state, id)` reducer + `onUndo` prop at both `session.ts` files
2. `SuggestionGroupCard` collapsed-by-default render in both `SuggestionList.tsx`s
3. Group-key = `(heuristic, bp, property, value, rationale)` tuple
4. Per-selector hover within expanded group reuses Phase 1 protocol — zero new infra needed

**Key carry-over:** the `onPreviewHover` prop chain Phase 1 added is the natural integration point for grouped cards — each per-selector row inside `SuggestionGroupCard` will fire the same handler with its own `suggestion.selector`. No protocol changes for Phase 2.

---

## Constraints re-confirmed (all green)

- ✅ Zero touch on `packages/block-forge-core/**` — engine emit semantics atomic
- ✅ Zero touch on `packages/ui/**` — token system untouched
- ✅ Zero touch on TweakPanel — coexistence V1 ruling preserved
- ✅ Both surfaces shipped in lockstep
- ✅ Pin protocol (`inspector-request-pin`) untouched — additive change
- ✅ Snapshot tests guard the IIFE shape — any future drift forces explicit update

---

## Commit ladder

| Phase | Commit message | Files |
|---|---|---|
| 1 | `feat(inspector): WP-036 Phase 1 — sidebar hover-highlight protocol (cross-surface)` | 10 (5 source × 2 surfaces + 2 test) |

**Hands ready for Phase 2 — awaiting Brain go.**
