# Execution Log: WP-028 Phase 0 — RECON + extract-vs-reimplement ruling

> Epic: WP-028 Tweaks + Variants UI
> Executed: 2026-04-23 (same-session handoff from WP-027 Phase 5 close)
> Duration: ~45 minutes
> Status: ✅ COMPLETE
> Domains affected: RECON-only (no owned_files changed)

---

## What Was Audited

13 audit steps across engine API, 5 direct component-pair diffs, variants data-flow end-to-end,
validator/engine gap, iframe postMessage inventory, RHF form gap, UI primitives, Path B refactor
scope, and dirty-state rehearsal. Produced the 12 carry-overs (a)–(l) that feed Phase 1 + the
empirical **extract-vs-reimplement ruling** (ruling: REIMPLEMENT, conservative metric 11 < 15
threshold). Arch-test baseline preserved at **489 / 0**. Zero code/SKILL/PARITY/manifest edits.

---

## Pre-flight Corrections Confirmed Live

| Workplan claim | Actual | Impact |
|---|---|---|
| `packages/block-forge-core/src/emit/emit-tweak.ts` | `packages/block-forge-core/src/compose/emit-tweak.ts` ✅ | Plan text-only; signature captured verbatim in (a) |
| `compose-variants.ts` location | `packages/block-forge-core/src/compose/compose-variants.ts` ✅ | Signature + name-regex captured verbatim in (b) |
| `packages/block-forge-core/src/emit/` dir | does NOT exist ✅ | Ruling 1 stands |
| `tools/block-forge/src/hooks/useElementSelection.ts` (planned) | `tools/block-forge/src/hooks/` does NOT exist; hooks live in `src/lib/` (`useAnalysis.ts`) | Phase 1 naming decision: mirror `src/lib/` (not create `src/hooks/`) |
| WP-026 session primitive | `tools/block-forge/src/lib/session.ts` ✅ (115 LOC, 9 exports) | Confirmed |
| WP-027 session primitive | `apps/studio/src/pages/block-editor/responsive/session-state.ts` ✅ (99 LOC, 8 exports; `backedUp`+`lastSavedAt` absent by design) | Confirmed — non-cosmetic pair-4 diff count = 3 |
| Studio PARITY §7 forward-compat | Verbatim block at `apps/studio/src/pages/block-editor/responsive/PARITY.md:118` — "when WP-028 adds variants to tools/block-forge, that surface will also switch to calling `renderForPreview` upstream — at which point tools/block-forge's composeSrcDoc should adopt Studio's single-wrap pattern, re-converging PARITY" | Ruling 4 locked |
| `variantsSchema` regex | `/^[a-z0-9-]+$/` at `packages/validators/src/block.ts:38-41` ✅ | Ruling 3 confirmed — NOT a bug |
| `apps/studio/src/pages/block-editor.tsx` RHF `variants` | NOT registered in `BlockFormData` (verified L66–80); `useForm<BlockFormData>` at L231; payload forward-compat in `updateBlockApi` at L78 but no RHF binding | Ruling 5 confirmed — Phase 1 extends type + initial values |
| `packages/ui/src/primitives/` | ONLY `badge.tsx` + `button.tsx` ✅ (no `domain/`, no `layouts/` dirs exist) | Stronger than pre-flight — Slider **+** Drawer **+** Dialog all missing |

**New findings during live audit (beyond Brain pre-flight):**
- `pkg-validators` SKILL is `status: skeleton` (only Start Here + Public API populated; no Invariants / Traps / Blast Radius / Recipes) — recorded in (h) for arch-test projection.
- `packages/ui/src/domain/` and `packages/ui/src/layouts/` dirs do NOT exist (only `primitives/` + `lib/` + `theme/` + `portal/`) — pkg-ui SKILL comment "Three-Layer structure" refers to aspirational layout, not current state.
- Zero existing `type="range"` inputs anywhere in the monorepo — Slider is genuinely new.

---

## Carry-overs (Phase 1 INPUT)

### (a) `emitTweak` signature (verbatim)

```ts
// packages/block-forge-core/src/compose/emit-tweak.ts:18
export function emitTweak(tweak: Tweak, css: string): string
// Tweak = { selector: string, bp: number, property: string, value: string }
// PostCSS-based, deterministic over identical (tweak, css).
//
// Three cases (when bp !== 0):
//   A. No matching `@container slot (max-width: {bp}px)` → append new chunk
//   B. Container exists, selector-rule inside does not → append new inner rule
//   C. Container + rule exist:
//        - declaration for `property` absent → append declaration
//        - declaration present → update its value (preserves other decls)
//
// Special case: `bp === 0` → top-level rule (no @container) via emitTopLevel()
```

**Engine public export surface** (`packages/block-forge-core/src/index.ts`):
```ts
export type { BlockInput, BlockOutput, BlockAnalysis, Rule, Element, Suggestion,
              Heuristic, Confidence, Tweak, Variant, PreviewResult } from './lib/types'
export { analyzeBlock } from './analyze/analyze-block'
export { generateSuggestions } from './rules'
export { applySuggestions } from './compose/apply-suggestions'
export { emitTweak } from './compose/emit-tweak'
export { composeVariants } from './compose/compose-variants'
export { renderForPreview } from './compose/render-preview'
```

### (b) `composeVariants` signature (verbatim) + name convention

```ts
// packages/block-forge-core/src/compose/compose-variants.ts:47-51
export function composeVariants(
  base: BlockInput,
  variants: readonly Variant[],
  onWarning?: (msg: string) => void,
): BlockOutput
// Variant = { name: string, html: string, css: string }

// variantCondition(name) — reveal-rule name convention:
//   'sm' | /^4\d\d$/  → '(max-width: 480px)'
//   'md' | /^6\d\d$/  → '(max-width: 640px)'
//   'lg' | /^7\d\d$/  → '(max-width: 768px)'
//   else              → null (onWarning fired, reveal rule skipped)
//
// variants.length === 0 → return {slug, html, css} only (no variants field).
// HTML: <div data-variant="base">…</div><div data-variant="{name}" hidden>…</div>
// CSS:  base + [data-variant="{name}"]-scoped variant CSS + reveal rules inside @container
// Unknown name: CSS still scoped+inlined; ONLY reveal rule is skipped.
```

Warning message (verbatim for Phase 3 UX mirror):
> `composeVariants: unknown variant name "{name}" — reveal rule skipped (expected sm|md|lg or /^[467]\d\d$/)`

### (c) Component divergence audit

**Strict non-cosmetic metric** (changes that alter behavior, API surface, prop shape, test hooks, state shape, or render output; styling-method shifts Tailwind↔inline-style are NOT counted):

| Pair | WP-026 LOC | WP-027 LOC | Non-cosmetic diffs | Notes |
|---|---|---|---|---|
| 1. PreviewPanel | 73 | 128 | **2** | (i) prop API `block` → `srcdoc` externalizes composeSrcDoc; (ii) scale-to-fit ResizeObserver+transform (NEW feature) |
| 2. SuggestionList | 92 | 136 | **2** | (i) `error: Error \| null` prop + render block (NEW); (ii) WP-026 exports `sortSuggestions`, WP-027 doesn't |
| 3. SuggestionRow | 143 | 193 | **3** | (i) Undo-button-on-pending (WP-026) vs always-show Accept/Reject (WP-027); (ii) `data-pending` attribute lost in WP-027; (iii) `aria-label` added in WP-027 |
| 4. session(-state) | 115 | 99 | **3** | (i) `backedUp` field absent; (ii) `lastSavedAt` field absent; (iii) `clearAfterSave` impurity (Date.now()) absent — 3 deliberate DB-domain divergences |
| 5. preview-assets | 84 | 94 | **1** | §7 single-wrap body: `<div class="slot-inner">{html}</div>` vs double-wrap `<div class="slot-inner"><div data-block-shell="{slug}">{html}</div></div>` (path-depth diff is cosmetic — file-system location only) |

**Total non-cosmetic: 11**
**Threshold: 15 (total) / 3 (per-pair)**
**Per-pair max: 3 (pairs 3 + 4 tied, NOT exceeding 3 → threshold `>3` not triggered)**

**Ruling: REIMPLEMENT** (metric 11 < 15; no pair exceeds 3)

**Rationale:** Divergences are mostly intentional and locked by ADR / PARITY:
- Pair 1: scale-to-fit is Studio-only UX requirement (embedded tab vs standalone tool)
- Pair 2: error boundary is Studio-only requirement (hosted inside RHF context)
- Pair 3: UX model delta (pending-becomes-Undo vs always-Reject) — behavior contract between the two
- Pair 4: domain divergence — DB-backed saves don't need `.bak` discipline fields
- Pair 5: §7 deliberate single-wrap, PARITY-documented

Extracting to `packages/block-forge-ui/` would collapse these intentional differences into configuration flags or leave the package incomplete. Reimplement-with-tightened-PARITY is cheaper: reinforce cross-surface parity via **component-level snapshot tests** (see carry-over f) rather than shared-package infrastructure.

**Borderline note:** This count is near but below the 12–17 "Brain reviews" escalation band. Ruling committed; Brain may override at Phase 1 prompt handoff.

**Pair 6 (informational, not in metric):** `PreviewTriptych.tsx` (WP-026, 3 iframe panels in a row) vs `ResponsivePreview.tsx` (WP-027, composes block+variants via renderForPreview into a single srcdoc blob distributed to PreviewPanel trio) — abstraction-level delta. WP-027's Path B is the forward-compatible shape; tools/block-forge will adopt it in Phase 2 or 3 (see carry-over k).

### (d) Variants data-flow + validator/engine gap

**File-based (WP-026 today):** `content/db/blocks/*.json` — sampled 5 blocks, **zero have `variants` key** (all non-variant base blocks from pre-WP-024 era). Schema implicitly: `{ id, slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js }` + optional `variants` field (not currently populated).

**DB-based (WP-027 today):**
- `updateBlockApi` at `apps/studio/src/lib/block-api.ts:68-80` has `variants?: BlockVariants` in payload type (WP-027 Phase 4 forward-compat — never actually called with variants yet)
- Hono route `PUT /api/blocks/:id` at `apps/api/src/routes/blocks.ts` uses `updateBlockSchema` from `@cmsmasters/validators`; schema accepts `variants: variantsSchema.optional()` at L71
- Validator regex: `/^[a-z0-9-]+$/` (permissive; any kebab-case)
- Engine reveal-rule regex (from carry-over b): `sm|md|lg|/^4\d\d$/|/^6\d\d$/|/^7\d\d$/`

**Gap table:**
| Name example | Validator | Engine reveal rule |
|---|---|---|
| `sm`, `md`, `lg` | ✅ accepts | ✅ emits |
| `480`, `640`, `768` | ✅ accepts | ✅ emits |
| `499`, `720`, `768` (3-digit starting 4/6/7) | ✅ accepts | ✅ emits |
| `mobile`, `tablet`, `desktop` | ✅ accepts | ⚠ onWarning + no reveal rule (CSS still scoped) |
| `custom-xl`, `my-variant` | ✅ accepts | ⚠ onWarning + no reveal rule (CSS still scoped) |
| `MobileUpper`, `snake_case`, `with.dot` | ❌ rejects | n/a |

**Ruling 3 confirmed:** NOT a bug. Phase 3 TweakPanel/VariantsDrawer UX warns at name-input time on the engine-stricter boundary (name is validator-valid but engine-warned).

**Save flow per surface:**
- tools/block-forge: `fs.writeFileSync(content/db/blocks/{slug}.json)` via `lib/file-io.ts`; `.bak` on first save per session
- Studio: `form.setValue('code', …, { shouldDirty: true })` → `updateBlockApi({ variants })` (Phase 1 extension) → `PUT /api/blocks/:id` → `updateBlockSchema` Zod parse → Supabase write → `POST /api/content/revalidate {}` (cache-wide per WP-027 Phase 4)

**Portal render:** `apps/portal/lib/hooks.ts:217` — `renderBlock(block, variants?)` inlines variants server-side when present. No runtime composeVariants call — that's a WP-025/WP-026/WP-027 authoring-surface concern.

### (e) Iframe postMessage inventory + WP-028 additions

**Existing message types (monorepo-wide grep):**
- `'block-forge:iframe-height'` — emitted from srcdoc ResizeObserver, consumed by `PreviewPanel.tsx` on both surfaces. Payload: `{ type, slug, width, height }`. Pinned by `preview-assets.test.ts` case `(i)` on both surfaces.

**No other types currently exist.** Zero `block-forge:*` prefixed types beyond `iframe-height`.

**Proposed new types for WP-028 (Phase 2 introduces):**
```ts
type ElementClickMsg = {
  type: 'block-forge:element-click'
  slug: string
  selector: string        // computed CSS selector for clicked element
  rect: { x, y, w, h }    // bounding client rect for overlay positioning
  computedStyle: Record<string, string>  // resolved values for TweakPanel presets
}

type ElementHoverMsg = {  // OPTIONAL — for hover-outline preview
  type: 'block-forge:element-hover'
  slug: string
  selector: string | null  // null = hover exited
}
```

**Parent-side contract:** listener on `window.addEventListener('message', ...)` with slug-filter; cleanup on unmount (prevents leak when switching tabs or blocks). Existing `iframe-height` pattern is the template.

### (f) Test strategy (per carry-over c ruling)

**Chosen: REIMPLEMENT → parallel test files + component-level snapshot tests.**

Per-surface test locations:
- `tools/block-forge/src/__tests__/TweakPanel.test.tsx` (+ `.parity.snap`)
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` (+ `.parity.snap`)
- `apps/studio/src/pages/block-editor/responsive/__tests__/TweakPanel.test.tsx` (+ `.parity.snap`)
- `apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx` (+ `.parity.snap`)

**Snapshot discipline:** render both surfaces' TweakPanel with identical mock `block` + `selection` + `bp`. Serialize rendered DOM (strip React internals). Byte-compare via string-contains assertions on the key DOM features (selector-header, bp-select, property rows, action buttons). Fail on divergence that isn't pre-declared in PARITY §7.

**Estimated new file count (Phase 1 placeholders + Phase 2/3 implementations):**
- 4 `.test.tsx` files
- 4 `.parity.snap` artifacts (vitest inline snapshot or toMatchInlineSnapshot)
- 2 new components × 2 surfaces = 4 `.tsx` files

### (g) Effort recalc + split decision

| Phase | Task | Hours (reimplement) |
|---|---|---|
| 0 | RECON (this phase) | ~2h (actual: ~45min, but log-weighted) |
| 1 | Foundation: RHF variants field + Slider primitive + Drawer primitive + 4 component skeletons + parity test scaffold | ~4h |
| 2 | Tweak: postMessage contract (element-click) + TweakPanel wired to `emitTweak` + both surfaces | ~5h |
| 3 | Variants: VariantsDrawer + name-validator UX + `setValue('variants', …)` + both surfaces | ~6h |
| 4 | Variants data-flow: file-based write + DB write + Portal E2E Playwright | ~3h |
| 5 | Polish + Path B refactor for tools/block-forge (PARITY §7 re-convergence) | ~3h |
| 6 | Close: docs sync (WP-027 Phase 5 pattern) | ~1.5h |
| **Total** | | **~24.5h** |

**Trigger evaluation:** 24.5h is **at the WP-028a threshold** (> 24h). This is borderline.

**Split decision:** DO NOT split proactively at Phase 0. Rationale:
1. Tweaks + Variants share substrate (postMessage contract, form integration, session state) — splitting fragments the contract surface
2. Cross-surface parity is PER-FEATURE; splitting by feature gives up the lockstep invariant WP-028 exists to prove
3. 24.5h estimate has ~15% cushion; real overrun to 28h+ is the trigger, not estimate-touching-threshold

Flag for Phase 1: if Phase 1 foundation hours exceed 5h (i.e., ≥ 25% over the 4h estimate), re-evaluate split at Phase 2 handoff.

### (h) Arch-test baseline + projected target

- **Phase 0 entry baseline:** 489 / 0 (verified)
- **Phase 0 exit:** 489 / 0 ✅ (no new files, no manifest edits — verified below in Verification Results)

**Projection per path:**
- **Reimplement path (chosen):** Phase 1 adds ~8 new owned_files (4 components × 2 surfaces, or 2 components × 2 surfaces + 4 test files — exact pending Phase 1 prompt), + 1 new `slider.tsx` primitive, + 1 new `drawer.tsx` primitive. Approximate arch-test delta per new owned_file is +1 (path-existence test). **Phase 1 exit projected: 489 + ~10 = ~499 / 0**.
- **Close (Phase 6) projection:** + additional snapshot files (~4) + SKILL + PARITY updates (no arch-test delta — those are content edits). **WP-028 Close projected: ~503 / 0.**
- **pkg-validators status: skeleton → full flip?** — NOT expected in WP-028. Schema already carries `variantsSchema`; flipping to full requires Invariants/Traps/Blast Radius/Recipes writing. If Phase 6 decides to flip (e.g., because WP-028 made validator centrally important), add `feedback_arch_test_status_flip +6` = **509 / 0**. Decision deferred to Phase 6.

### (i) RHF `variants` field gap

- `apps/studio/src/pages/block-editor.tsx:66-80` defines `BlockFormData`:
  ```ts
  interface BlockFormData {
    name, slug, block_type, block_category_id, is_default,
    code, js, thumbnail_url,
    hasPriceHook, priceSelector, links,
    alt, figma_node
  }
  ```
  **`variants` NOT present.**
- `apps/studio/src/pages/block-editor.tsx:231` `useForm<BlockFormData>({...})` — form never registers `variants`.
- `apps/studio/src/pages/block-editor.tsx:82-98` `getDefaults()` — no `variants: {}` key.
- `apps/studio/src/pages/block-editor.tsx:106-122` `blockToFormData(block)` — does not read `block.variants`.
- `apps/studio/src/pages/block-editor.tsx:136+` `formDataToPayload(data)` — does not emit `variants` to API.
- `apps/studio/src/lib/block-api.ts:78` `updateBlockApi({ variants? })` — payload type has forward-compat slot but no caller passes it yet.

**Phase 1 extension points (EXACT file:line list for Phase 1 prompt):**
| File | Line | Change |
|---|---|---|
| `block-editor.tsx` | 66-80 | `BlockFormData` adds `variants: BlockVariants` |
| `block-editor.tsx` | 82-98 | `getDefaults()` adds `variants: {}` |
| `block-editor.tsx` | 106-122 | `blockToFormData(block)` reads `block.variants ?? {}` |
| `block-editor.tsx` | 136+ | `formDataToPayload(data)` emits `variants: data.variants` (only if non-empty) |
| `block-api.ts` | 78 | Type slot already present — no change |

### (j) Dirty-state conflict rehearsal

**Scenario walkthrough (paper):**

1. Author opens block → `reset(blockToFormData(block))` — form clean, session empty.
2. Types CSS in Editor tab `code` textarea → `formState.isDirty = true`, session unchanged.
3. Switches to Responsive tab → `display:none` on Editor, `display:flex` on Responsive (WP-027 convention). Form state PRESERVED (mount discipline). Textarea edit retained on return.
4. Clicks element in Responsive preview iframe → `block-forge:element-click` postMessage → TweakPanel opens (Phase 2).
5. Adjusts padding slider → `emitTweak({selector, bp, property: 'padding', value: '24px'}, form.getValues('code'))` → patched CSS string.
6. `form.setValue('code', patchedCss, { shouldDirty: true })` — both the textarea edit from step 2 AND the tweak are in `code` now (tweak applied ON TOP of textarea edit, because we read `form.getValues` at dispatch time, not at tab-switch time).
7. Switches back to Editor tab — textarea shows `patchedCss` (reflects both edits).
8. Additional textarea edit → still live last-write-wins in `form.code`.
9. Clicks Save → `form.getValues()` → full payload → `updateBlockApi` → DB write.

**Conclusion:** last-write-wins is intact; no data loss. Tweak always applies to POST-textarea CSS because `form.getValues('code')` is read at dispatch time.

**Risk flag:** if Phase 2 implementation reads `block.css` (from DB) instead of `form.getValues('code')` at dispatch, it would apply tweak to PRE-textarea CSS — silent data loss. Phase 2 prompt MUST specify "dispatch reads `form.getValues('code')`". Added to Open Questions.

**Phase 5 acknowledges only; no new logic in Phase 0.**

### (k) Path B forward-compat refactor for tools/block-forge

**Current state (tools/block-forge):**
- `tools/block-forge/src/lib/preview-assets.ts:78-80` body template:
  ```html
  <div class="slot-inner">
    <div data-block-shell="${slug}">${html}</div>
  </div>
  ```
- `tools/block-forge/src/components/PreviewTriptych.tsx` → `PreviewPanel.tsx:24-33` computes `composeSrcDoc({html: block.html, …})` inline — feeds raw `block.html` WITHOUT engine pre-wrap.
- Does NOT call `renderForPreview` anywhere.

**Target state (after refactor):**
- Drop inner `<div data-block-shell="${slug}">` wrap in `preview-assets.ts` body template → single-wrap matching Studio:
  ```html
  <div class="slot-inner">${html}</div>
  ```
- Upstream: feed `composeSrcDoc` with `renderForPreview(block, { variants }).html` (pre-wrapped) instead of raw `block.html`.
- PreviewPanel / PreviewTriptych accept pre-composed srcdoc as prop (mirrors Studio pair-1 divergence, collapses it).

**Landing phase:** Phase 2 or 3 — whenever first variants integration lands in tools/block-forge. The refactor naturally coincides with "we now want variants to work here too."

**Tests affected:**
- `tools/block-forge/src/__tests__/preview-assets.test.ts` case `(c)` and body-wrap assertions update (mirror Studio's `(studio-1)` single-wrap test)
- Byte-identical output contract with Studio becomes enforceable

**Close deliverable:** WP-028 Phase 6 Close edits `tools/block-forge/PARITY.md` "WP-027 Studio Responsive tab cross-reference" section to mark the divergence **RESOLVED** (single-wrap adopted both sides).

### (l) UI primitives inventory

**Current `packages/ui/src/primitives/`:**
- `badge.tsx` ✅
- `button.tsx` ✅

**Missing (needed for WP-028):**
- **Slider** — no primitive exists; zero `type="range"` inputs anywhere in the monorepo. Phase 1 adds `packages/ui/src/primitives/slider.tsx` (tokens-driven, CVA variants, accessible ARIA). Required for TweakPanel's per-bp value adjustment.
- **Drawer / Sheet** — no primitive exists; no `dialog.tsx` either. Phase 1 decision: add a `drawer.tsx` primitive OR compose from scratch in VariantsDrawer. Given cross-surface parity requirement, **pkg-ui primitive is the cleaner choice** — Phase 1 adds `packages/ui/src/primitives/drawer.tsx` (shadcn-pattern: Radix Sheet or Dialog as a right-edge drawer with backdrop).

**`packages/ui/src/domain/` + `packages/ui/src/layouts/`:** directories do NOT exist. Three-Layer structure in pkg-ui SKILL is aspirational, not enforced. No blocker — primitives is the only layer touched in WP-028.

---

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Extract vs reimplement | **REIMPLEMENT** | Strict metric 11 < 15 threshold; no pair > 3; divergences are intentional (ADR / PARITY / domain) |
| Test harness | Parallel + component-level snapshots | Cheaper than extracting package; enforces PARITY cross-surface |
| Split WP-028a? | **NO** | 24.5h at threshold, not over. Re-evaluate at Phase 2 handoff if Phase 1 overruns |
| Slider primitive | **New in pkg-ui** | Nothing exists to reuse; adding at the right layer |
| Drawer primitive | **New in pkg-ui** | Same logic as Slider; cross-surface parity needs central home |
| `variants` RHF extension | **Phase 1** | 5 exact extension points in `block-editor.tsx` (carry-over i) |
| Path B refactor timing | **Phase 2 or 3** (with first variants integration) | Ruling 4; natural coupling |
| tools/block-forge hooks dir | **`src/lib/`** (not new `src/hooks/`) | Existing convention (`useAnalysis.ts`) |
| pkg-validators status flip | **Defer to Phase 6** decision | Not required by WP-028 plan; worth +6 arch-test only if domain content warrants full-flip |

---

## Files Changed

| File | Change | Description |
|---|---|---|
| `logs/wp-028/phase-0-result.md` | created | This log |

**NOT modified (per Phase 0 RECON discipline):**
- Zero code files (`apps/`, `packages/`, `tools/*/src/`)
- Zero SKILL edits
- Zero PARITY edits
- Zero workplan body edits
- Zero `src/__arch__/domain-manifest.ts` edits

---

## Issues & Workarounds

**None substantive.** Two minor additions to pre-flight findings:

1. `pkg-validators` SKILL is `status: skeleton` — factored into (h) projection. Flip deferred to Phase 6.
2. `packages/ui/src/domain/` + `layouts/` directories don't exist — pkg-ui SKILL's "Three-Layer structure" is aspirational. No blocker; WP-028 only touches `primitives/`.

---

## Open Questions

For Phase 1 prompt (Brain inputs):
1. **Slider primitive shape** — radix `@radix-ui/react-slider` vs custom `<input type="range">`? shadcn convention leans radix. Phase 1 confirms.
2. **Drawer primitive shape** — right-edge slide (variants list) vs bottom-sheet (mobile-friendly)? Responsive-tab context suggests right-edge desktop + bottom mobile. Phase 1 confirms.
3. **TweakPanel location** — inline below SuggestionList OR floating panel anchored to selected element? Phase 2 design call.
4. **Phase 2 Tweak dispatch source of truth** — MUST read `form.getValues('code')` at dispatch time, NOT `block.css` from DB (see carry-over j risk flag).
5. **Snapshot strategy** — `toMatchInlineSnapshot` vs `.snap` files on disk? Both work; consistency choice.
6. **tools/block-forge file-io variants** — file-based surface needs `.variants` nested key in `content/db/blocks/*.json`. Shape: `{ ...existing, variants: { sm: { html, css }, md: {…} } }`. Confirm at Phase 3 prompt.
7. **Borderline metric escalation:** 11 non-cosmetic is close to 12–17 Brain-review band. If Brain wants to override REIMPLEMENT → EXTRACT, Phase 1 prompt scope changes significantly (new `packages/block-forge-ui/` package). Decision point at Phase 1 handoff.

---

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ **489 / 0** unchanged |
| `git status --porcelain` | ✅ only `logs/wp-028/phase-0-result.md` tracked-new |
| `src/compose/emit-tweak.ts` exists | ✅ (pre-flight ruling 1 verified) |
| `src/compose/compose-variants.ts` exists | ✅ |
| `src/emit/` does NOT exist | ✅ |
| `tools/block-forge/src/lib/session.ts` (WP-026) | ✅ 115 LOC |
| `apps/studio/.../responsive/session-state.ts` (WP-027) | ✅ 99 LOC |
| `packages/validators/src/block.ts` | ✅ `variantsSchema` present at L38 |
| 13 audit steps executed | ✅ (0-prep through 0.13) |
| 12 carry-overs (a)–(l) populated | ✅ |
| Zero code/SKILL/PARITY/manifest edits | ✅ |

---

## Next (Phase 1 Handoff Brief)

**Phase 1 scope** (based on ruling + carry-overs):
- Foundation commit: RHF `variants` field extension (5 extension points per carry-over i) + `packages/ui/src/primitives/slider.tsx` + `packages/ui/src/primitives/drawer.tsx` + 2 placeholder components per surface (4 total `.tsx` files: `TweakPanel.tsx`, `VariantsDrawer.tsx` × 2 surfaces) + 4 `.test.tsx` scaffolds with first parity assertion.
- Arch-test delta projected: +~10 (new owned_files in manifest).
- No Path B refactor yet (carry-over k lands in Phase 2 or 3 with first variants integration).
- No TweakPanel logic yet — Phase 2 wires postMessage + `emitTweak`.

**Brain inputs for Phase 1 prompt:**
- Open Questions 1–6 above
- Confirm REIMPLEMENT ruling (or override to EXTRACT — scope changes)
- Confirm effort cap at 4h for Phase 1 scaffold

---

## Git

- Task prompt commit: `fecee433` (`chore(logs): WP-028 Phase 0 task prompt`)
- Result log commit: `0a75d3a6` — `chore(logs): WP-028 Phase 0 RECON result [WP-028 phase 0]`
