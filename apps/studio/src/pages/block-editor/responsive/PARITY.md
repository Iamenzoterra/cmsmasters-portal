# Studio Responsive Tab — Preview Parity Contract

> **Sibling contract:** [`tools/block-forge/PARITY.md`](../../../../../../tools/block-forge/PARITY.md). Any edit here must apply there (and vice-versa).

> Source of truth for what the Studio Responsive tab's preview iframe injects and why.
> Every change to `preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (Phase 2 — finalized, WP-027 — mirrors tools/block-forge/PARITY.md with §7 divergence)

### Token injection (inside `@layer tokens`)
1. `packages/ui/src/theme/tokens.css` — portal design-system tokens (semantic colors, typography scale, spacing, radii, shadows).
2. `packages/ui/src/theme/tokens.responsive.css` — WP-024 clamp-based responsive companion (currently 2-token scaffold: `--space-section`, `--text-display`; WP-029 populates).

### Reset layer (`@layer reset`)
- Box-sizing + margin/padding normalize on `*, *::before, *::after`.
- `body { font-family: 'Manrope', system-ui, sans-serif; width: {renderWidth}px; overflow: hidden; background: white; }`
  - `width` is fixed per breakpoint panel (1440/768/375). `overflow: hidden` prevents double-scroll; parent `PreviewPanel` controls scroll via ResizeObserver → postMessage height sync.

### Shared layer (`@layer shared`)
1. `packages/ui/src/portal/portal-blocks.css` — shared component classes from ADR-024 (buttons, headings, containers shared across blocks).
2. `.slot-inner { container-type: inline-size; container-name: slot; }` — inline containment rule matching portal's theme-page hierarchy. Reference: `tools/layout-maker/runtime/lib/css-generator.ts:254-255`.

### Block layer (`@layer block`)
- Per-block CSS from `block.css` (verbatim, no preprocessing).

### DOM hierarchy in iframe body
```
<div class="slot-inner">                   ← containment context (inline-size, name=slot) — emitted by composeSrcDoc
  <div data-block-shell="{slug}">          ← portal-parity block wrapper — emitted by renderForPreview (engine upstream)
    {block.html}                           ← if variants present: contains data-variant="base"/"{name}" descendants
  </div>
</div>
```

Matches portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper. The wrap-LOCATION (who emits data-block-shell) is the PARITY §7 deviation — see Studio deviation §7 below.

### Runtime injection (after body DOM)
1. `packages/ui/src/portal/animate-utils.js` — ADR-023 animation layer (always-on for parity with portal runtime).
2. Block's own `block.js` (if present) — appended after animate-utils.
3. ResizeObserver → `postMessage({ type: 'block-forge:iframe-height', slug, width, height })` for parent-panel height sync.
   - `type` literal is pinned by `preview-assets.test.ts` case (i) — any rename forces test update.
4. **Element-click delegator** (WP-028 Phase 2) → `postMessage({ type: 'block-forge:element-click', slug, selector, rect, computedStyle })` for parent TweakPanel seeding.
   - Delegated click listener on `document.body` (capture phase). Filters by `CLICKABLE_TAGS` (semantic block elements) and emits `e.preventDefault() + e.stopPropagation()` on match so the preview doesn't navigate/submit.
   - Selector derivation per Ruling H: `#id` → stable class → `nth-of-type` fallback walk, max depth 5. Utility prefixes (`hover:`, `focus:`, `active:`, `animate-`, `group-`, `peer-`) excluded from "stable" class pool.
   - Strictly additive injection (Ruling E) — wrap structure, layer order, and slot CSS are unchanged. Any future PARITY edit that touches wrap structure should land separately from the click-handler script.
   - Cross-surface byte-identical with `tools/block-forge/src/lib/preview-assets.ts` click-handler block.

### Canonical breakpoints
- Desktop: 1440px
- Tablet: 768px
- Mobile: 375px

### Sandbox policy
- `sandbox="allow-scripts allow-same-origin"`
- `allow-same-origin` is required for Google Fonts `<link>` loading inside srcdoc (matches LM iframe convention).

### Out of scope (Studio tab)
- Theme-page chrome — Studio preview renders blocks in isolation, same as tools/block-forge.
- Layout-maker slot grid rules — Studio doesn't reconstruct layout either.
- Tweak sliders + variants drawer — WP-028 scope.

### In scope
- **Variant composition via Path B:** `renderForPreview(block, { variants })` — engine internally calls `composeVariants` when `variants.length > 0`. Both surfaces now on Path B as of WP-028 Phase 3.5 (block-forge re-converged from double-wrap; see §7 below).
- **Variant CRUD drawer (WP-028 Phase 3):** `VariantsDrawer` component landed on both surfaces (byte-identical body). Studio wires fork/rename/delete through `dispatchVariantToForm(form, action)` helper → `form.setValue('variants', next, { shouldDirty: true })`.

## Discipline (PARITY-LOG equivalent)

1. Before proposing a change to `preview-assets.ts` or iframe composition, re-read this file.
2. When a divergence from portal render is observed, log it in the "Open Divergences" section below BEFORE debugging — naming where the lie lives is half the fix.
3. When closing a divergence, move it to "Fixed" with commit SHA AND add a contract test in `preview-assets.test.ts`.
4. When changing the token list, `@layer` order, slot wrapper, or runtime injection, update the Contract section above in the same commit as the code.
5. **Cross-surface parity enforcement:** any edit to this file MUST be mirrored in `tools/block-forge/PARITY.md` in the same WP (and vice versa). Divergence between the two PARITY contracts is a bug.

## Open Divergences

_(none at Phase 2 close — preview-assets.ts + tests implemented; Phase 2.8 composed-page parity check documented in `logs/wp-027/phase-2-result.md`)_

## Fixed

_(empty)_

---

## Studio-specific deviations

The following intentional deltas from `tools/block-forge/PARITY.md` apply only to the Studio Responsive tab:

1. **`?raw` path depth — 6 `..` from source, 7 `..` from tests.** ✅ (verified Phase 2 implementation)
   Studio's `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` lives 2 directories deeper than `tools/block-forge/src/lib/preview-assets.ts`. Paths:
   - Source: `'../../../../../../packages/ui/src/theme/tokens.css?raw'` (6 `..`)
   - Tests under `__tests__/`: `'../../../../../../../packages/ui/src/theme/tokens.css?raw'` (7 `..`) — applies only to Phase 3 fixture reuse; Phase 2 tests don't import `?raw` content directly (they assert on substring match in composeSrcDoc output).
   - WP-025 fixtures from tests: `'../../../../../../../packages/block-forge-core/src/__tests__/fixtures/{name}.html?raw'` (7 `..`) — forward reference for Phase 3.

2. **Variants IN scope from Phase 2.** ✅ (implemented in `ResponsivePreview.tsx`)
   Studio Responsive tab renders variant-bearing blocks end-to-end via Path B: `renderForPreview(block, { variants: variantList })`. Engine internally calls `composeVariants` when `variants.length > 0`. tools/block-forge defers variants to WP-028.

3. **Sandbox attribute order `"allow-scripts allow-same-origin"`.** ✅ (matches WP-026)
   Standardized on the tools/block-forge order. Studio's existing `apps/studio/src/components/block-preview.tsx` uses `"allow-same-origin"` (+ `"allow-scripts"` in interactive mode) — Responsive tab does NOT share code with block-preview.tsx (separate injection stack per Phase 0 §0.3).

4. **Dirty-state coupling — RHF `formState.isDirty`.** (forward reference — Phase 4)
   On Accept, Phase 4 calls `form.setValue('code', newCodeString, { shouldDirty: true })`. Existing Save footer + beforeunload + dirty indicator fire unchanged (studio-core invariant: "all editors use react-hook-form + zodResolver"). Session-state primitives (`session-state.ts`) hold accept/reject bookkeeping for UI only — dirty-state lives in RHF. No parallel dirty system.

5. **Auth context — reuse existing Studio `updateBlockApi`.** (forward reference — Phase 4)
   Save path goes through `apps/studio/src/lib/block-api.ts`' `updateBlockApi` with Supabase session token via `authHeaders()`. Hono `PUT /api/blocks/:id` + `requireRole('content_manager', 'admin')`. Revalidate via Hono `POST /api/content/revalidate` with `{ all: true }` body (Phase 4 extension, per WP-027 plan Q3 Option 2).

6. **Block-type uniform applicability.** (forward reference — WP-027 Close)
   Responsive tab covers `/blocks/:id`, `/elements/:id`, `/global-elements/:id` identically — all three share the `.slot-inner` container-type context. Complex elements (tabs, dynamic content) are prime candidates; atomic elements gracefully show the empty state. Slot-context variance (content vs sidebar vs header widths) is pre-existing — acknowledge once and move on. Close phase finalizes this note.

7. **`data-block-shell` wrap originates upstream, not in composeSrcDoc.** ✅ **RE-CONVERGED at WP-028 Phase 3.5**

   **Both surfaces (post-WP-028 Phase 3.5):** `composeSrcDoc` on each surface emits ONLY the outer `.slot-inner` wrap:
   ```
   <div class="slot-inner">{pre-wrapped-html-from-renderForPreview}</div>
   ```
   The inner `<div data-block-shell="{slug}">…</div>` is emitted upstream by the engine's `wrapBlockHtml` (`packages/block-forge-core/src/lib/css-scoping.ts:26-28`) as part of `renderForPreview(block, { variants })`. Studio `ResponsivePreview.tsx` and block-forge `PreviewTriptych.tsx` both make the same engine single-call; neither surface double-wraps.

   **Why the re-converge landed in Phase 3.5:**
   - Phase 3 introduced variant CRUD on both surfaces; block-forge compensated with an INLINE `composeVariants` call in `PreviewTriptych` while `composeSrcDoc` still double-wrapped. That was explicit interim scaffolding.
   - Phase 3.5 (this one) replaced the inline call with `renderForPreview` + dropped the inner wrap in `composeSrcDoc`. No behavior change — iframe body DOM is structurally identical to pre-3.5 output (verified via live Playwright DOM queries, not a literal HTML-byte diff); only the WHO-wraps refactor.
   - Both surfaces now produce `body > div.slot-inner > div[data-block-shell="{slug}"] > content` — identical DOM.

   **Re-converge tracking:** tools/block-forge Phase 3.5 implementation SHA captured in `logs/wp-028/phase-3.5-result.md`; tools/block-forge PARITY.md §Discipline Confirmation (WP-028 Phase 3.5) mirrors this status.

   **Anti-regression test:** `__tests__/preview-assets.test.ts` case `(studio-1)` on Studio + cases `(b)` `(c)` `(h)` `(j)` `(k)` on block-forge pin the single-wrap contract — any edit that re-adds `<div data-block-shell` inside `composeSrcDoc` fails these tests.

8. **Known corner: theme-page slot-block bypass.** (forward-risk acknowledgement, not fixed)
   `apps/portal/app/themes/[slug]/page.tsx:189` has a known `.slot-inner` bypass for theme-page slot-closure rendering (documented in app-portal SKILL). **Variant-bearing** blocks rendered through that path may differ from iframe preview output. For **non-variant** blocks the bypass does NOT affect output — theme-page is a valid parity surface in that case. Phase 2.8 parity check used theme-page against a non-variant block (`fast-loading-speed`) because that was the only published surface at the time. Composed-page parity (via `apps/portal/app/[[...slug]]/page.tsx`) remains the preferred surface and the MANDATORY one once variant-bearing blocks need parity verification.

9. **Image URL-rewriter lives above the injection stack.** ✅ (documented Phase 2.8)
   Portal runtime wraps rendered block HTML with a layout-level image-URL rewriter (`commit a69f99a8 fix(portal): migrate SVG icon hostnames + layout-level image rewrite`) that:
   - Replaces R2 pub-URL host (`pub-*.r2.dev`) with the custom CDN host `assets.cmsmasters.studio`
   - Adds Cloudflare Image Resizing prefix: `/cdn-cgi/image/format=auto,quality=85,width=800/`
   - Generates `srcset` with 4 width variants (400/800/1200/1600w)

   **Studio Responsive tab deliberately does NOT apply this rewriter.** The tab is an editor view — content authors need to see the raw asset URLs as they were authored and stored, not the CDN-optimized versions. This is an **expected & documented delta** between the two surfaces, not a bug, not a contract breach.

   **Implications for parity testing:**
   - Byte-identical parity up to `<img src=` attribute value ✅
   - URL-rewriter delta lives at `apps/portal/app/layout.tsx` post-processing, not at `renderBlock()` or injection stack
   - Any future parity test that needs to compare Studio output vs Portal runtime should either (a) normalize asset URLs before diff, or (b) compare against Portal's pre-rewriter `renderBlock()` output directly.

---

## Variant CRUD (WP-028 Phase 3 — additive)

Studio's `VariantsDrawer` (`./VariantsDrawer.tsx`) has a byte-identical body to tools/block-forge's (`tools/block-forge/src/components/VariantsDrawer.tsx`) — only the 3-line JSDoc header differs per the Phase 2 lockstep discipline. Wiring differs between surfaces:

- **Store:** RHF `form.variants` field (registered in `BlockFormData` at `block-editor.tsx:84`); seeded from `block.variants ?? {}` via `blockToFormData`. `useWatch({ name: 'variants' })` feeds the drawer; `form.setValue('variants', next, { shouldDirty: true })` commits.
- **Dispatch helper:** `dispatchVariantToForm(form, action)` in `./ResponsiveTab.tsx` mirrors the Phase 2 `dispatchTweakToForm` pattern — reads `form.getValues('variants')` LIVE at dispatch time (OQ4 invariant mirror — no cached closure over `watchedVariants`). Returns the prior record for undo instrumentation; Studio does not wire session-level undo (RHF `formState.isDirty` + `reset()` cover this).
- **Fork base (Ruling N):** `block-editor.tsx` splits `form.getValues('code')` via existing `splitCode(code)` helper into `{html, css}` memoized as `baseHtmlForFork / baseCssForFork`; drawer receives these as props and seeds new variants at fork time. Drawer itself does not re-read form.
- **Convention warning (Ruling M):** name validation ALLOWS names outside `sm|md|lg|4\d\d|6\d\d|7\d\d` with a warning; engine emits `composeVariants: unknown variant name` at render time.
- **Delete confirm (Ruling O):** native `window.confirm()`; tests mock via `vi.spyOn(window, 'confirm')`.

**Phase 3 render path:** Studio's `ResponsivePreview` already uses Path B (`renderForPreview(block, { variants })`) since WP-027 — variants flow straight through to iframe `srcdoc`. No PreviewTriptych changes this phase.

**Phase 3.5 follow-up (landed):** tools/block-forge `composeSrcDoc` now emits single `.slot-inner` wrap; `PreviewTriptych` calls `renderForPreview(block, { variants })` upstream. §7 above flipped to `✅ RE-CONVERGED`. Both surfaces structurally identical iframe DOM (DOM-query-level verification via live Playwright smoke + snapshot pins on composeSrcDoc body region).

---

## Variant Editor (WP-028 Phase 4 — additive)

As of Phase 4, `VariantsDrawer.tsx` ships a tabbed editor on both surfaces:
- **"Manage" tab** — fork/rename/delete list (Phase 3, unchanged).
- **Per-variant tabs** — 2-column editor (base HTML/CSS read-only | variant HTML/CSS editable) + width slider + mini-preview iframe.

Editor body byte-identical between surfaces mod 3-line JSDoc header + 1 surface-specific `composeSrcDoc` import path (Ruling GG explicit exception — Studio `./preview-assets`, block-forge `../lib/preview-assets`).

**Dispatch path:** textarea edit → 300ms debounce → `onAction({ kind: 'update-content', name, html, css })`. Flush-on-unmount (empty-deps cleanup effect reading latest-values via ref) guarantees closing the drawer mid-edit never drops content (Ruling BB).

**Mini-preview iframe:** uses reserved slug `'variant-preview'` — TweakPanel listener filters by `currentSlug` (the real block slug at `ResponsiveTab.tsx:410`), so cross-iframe `block-forge:element-click` postMessages from this preview are silently dropped. No composeSrcDoc opt-out param needed (Ruling II). Render pipeline: `renderForPreview(base, { variants: [{ name, html, css }] })` → `composeSrcDoc({ html, css, width, slug: 'variant-preview' })`.

**Width slider:** range 320-1440 step 10. Default per variant name convention — `sm`/`4**`→480, `md`/`6**`→640, `lg`/`7**`→768, custom→640 (Ruling CC). Drives iframe `style.width` live.

**Save paths (per surface):**
- Studio: textarea → debounced `onAction` → `dispatchVariantToForm({kind:'update-content',...})` → `form.setValue('variants', next, { shouldDirty: true })` → RHF.isDirty footer → existing Save button → `updateBlockApi` → Supabase `blocks.variants` JSONB → `revalidate { all: true }` fire-and-forget.
- block-forge: textarea → debounced `onAction` → `updateVariantContent(session, name, content)` reducer → `session.isDirty` status bar → existing Save button → `fs.writeFileSync` → `content/db/blocks/{slug}.json`. `.bak` semantics preserved.

**Rename-race safety:** if the user renames or deletes a variant while a debounce is pending, the stale `update-content` dispatch silently no-ops at both dispatch sites (`dispatchVariantToForm` checks `action.name in current`; `updateVariantContent` checks `name in state.variants`).

**Undo symmetry (block-forge only):** `session.ts` extends `SessionAction` with `{ type: 'variant-update'; name; prev: BlockVariant }`; `undo()` restores the pre-edit payload. `isDirty()` picks up `variant-update` entries alongside existing variant-* actions. Studio uses RHF's native dirty tracking — no explicit undo wiring for content edits (consistent with Phase 3 Studio-side discipline).

**First real DB variants write lands at Phase 4** — verified via Playwright Studio save E2E + Portal render at variant BP (screenshots in `logs/wp-028/smoke-p4/`).

---

## Cross-contract parity notes

- **Injection stack identity:** `@layer tokens, reset, shared, block` order + `.slot-inner { container-type: inline-size; container-name: slot }` wrapper + `<div data-block-shell="{slug}">` block wrapper + `animate-utils.js` runtime injection — byte-identical DOM + CSS output between Studio and tools/block-forge (wrap LOCATION differs per §7, wrap RESULT is identical).
- **Test mirror:** Studio's `__tests__/preview-assets.test.ts` mirrors `tools/block-forge/src/__tests__/preview-assets.test.ts` cases (a)–(i) and adds case `(studio-1)` pinning the §7 single-wrap contract. Both surfaces test the `@layer` order, slot wrapper presence + `container-type`, width reflection in body, and postMessage type literal.
- **Cross-surface reverse-reference:** `tools/block-forge/PARITY.md` should cross-reference Studio §7 in WP-027 Phase 5 Close ("Studio Responsive tab diverges on wrap LOCATION per its PARITY.md §7 — this is expected until WP-028 unifies"). Until that close pass, the reverse reference lives only here.

## Dirty-state contract (WP-028 Phase 5)

Authoritative enumeration of dirty signals + save-enabling sources across both surfaces. All rows reflect the canonical post-Phase-4 carve-out behaviour (Phase 4 fixed StatusBar `hasChanges` + `handleSave` pre-existing bugs where tweak-only and variant-only edits were silently non-saving) plus the Phase 5 OQ2 clear-signal fix (empty variants emit `null`, not `undefined`).

### Studio Responsive tab (RHF-driven)

| Source | Field | Triggers `formState.isDirty` | Save button reads |
|--------|-------|------------------------------|-------------------|
| Code textarea (Editor tab) | `form.code` | Yes (RHF native) | `formState.isDirty` |
| Suggestion Accept (Responsive tab) | `form.code` via `setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Tweak slider dispatch | `form.code` via `dispatchTweakToForm → setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Variant CRUD (fork/rename/delete) | `form.variants` via `dispatchVariantToForm → setValue('variants', ..., { shouldDirty: true })` | Yes | same |
| Variant editor (update-content) | `form.variants` via `dispatchVariantToForm({kind:'update-content'})` → `setValue` | Yes | same |

**Save payload shape (post-Phase-5):** `formDataToPayload` emits `variants: populated-map` when `Object.keys(data.variants).length > 0`, else `variants: null`. The `null` sentinel is the OQ2 clear-signal — Supabase JS `update({ variants: null })` NULLs the column; `update({ variants: undefined })` (pre-Phase-5) silently dropped the key and left the prior value intact. Validator accepts `variantsSchema.nullable().optional()`.

### tools/block-forge (session-driven)

| Source | State mutation | `isDirty(session)` true | StatusBar `hasChanges` reads |
|--------|----------------|-------------------------|------------------------------|
| Suggestion Accept | `pending.push(id)` | Yes | `isDirty(session)` |
| Suggestion Reject | `rejected.push(id)` | Yes | same |
| Tweak dispatch | `tweaks.push(tweak)` | Yes (post-Phase-4 StatusBar fix) | same |
| Variant fork | `variants[name] = {...}` | Yes | same |
| Variant rename | variants key swap | Yes | same |
| Variant delete | variants key removal | Yes | same |
| Variant editor (update-content) | `variants[name].html / .css` updated via `updateVariantContent` | Yes | same |
| Undo | history pop | If history non-empty, yes; else no-op | same |

**handleSave path (post-Phase-4+5):**
1. Early return if `!isDirty(session)` — prevents no-op fs writes (Phase 4 carve-out).
2. `accepted = pickAccepted(session, suggestions)`; `applySuggestions` only runs when `accepted.length > 0`, else html/css pass through verbatim (Phase 4 carve-out).
3. Payload `{ ...block, html: applied.html, css: applied.css, variants: hasVariants ? session.variants : null }` written via `saveBlock` → fs middleware. `null` on empty (Phase 5 OQ2 / Ruling LL — JSON.stringify preserves the key for disk/DB parity with Studio's PUT payload).
4. `.bak` written iff `!session.backedUp` (first save per session).
5. `clearAfterSave(session, refreshed.variants ?? {})` — session aligns to post-save disk state.

**Tweak-compose-on-save ✅ RESOLVED at WP-028 Phase 6 Commit 1 `fc8ed555`:** `composeTweakedCss` now runs in `handleSave` BEFORE `applySuggestions` when `session.tweaks.length > 0` (App.tsx L271-281). Tweak-only saves persist composed CSS. Regression pin in `src/__tests__/integration.test.tsx` `Phase 6 — OQ5 tweak-compose-on-save regression pin` describe block asserts `@container slot (max-width: 480px)` chunk + property:value in saved css. Studio path SYMMETRIC (no fix needed) — `ResponsiveTab.tsx:151-152` lands `emitTweak` output in `form.code` at dispatch time; save serializes verbatim.

### Cross-tab concurrency — last-write-wins semantics

Both surfaces follow last-write-wins — no per-tab isolation, no explicit conflict-resolution UI. Example scenarios:

1. **Studio:** Editor-tab textarea edits `form.code` → author switches to Responsive tab → tweak slider dispatches → `dispatchTweakToForm` also writes `form.code`. Result: tweak-composed CSS lands; manual textarea edits preserved iff outside the CSS region PostCSS `emitTweak` touched.
2. **block-forge:** Accept suggestion → tweak element → variant fork. All three land in `session` (each via a distinct reducer path); `handleSave` writes all in one fs round-trip.

Transparent last-write-wins is acceptable per the WP-028 workplan §5 directive: "document last-write-wins behaviour. No new logic unless real data loss." Phase 4 live-smoke confirmed no data loss on either surface. This section is the canonical documentation; Phase 6 Close cross-references it without duplication.

## Discipline Confirmation (WP-028 Close — Studio mirror)

Studio Responsive tab surface closed WP-028 with byte-identical cross-surface body discipline across TweakPanel + VariantsDrawer + VariantEditor. OQ5 Studio zero-touch confirmed via Phase 6 pre-flight: `ResponsiveTab.tsx:151-152` emits `emitTweak` output into `form.code` at dispatch time; save serializes `form.code` verbatim with no compose-on-save step required. Contrast with block-forge which shipped Ruling MM compose-in-handleSave fix at Phase 6 Commit 1 `fc8ed555` (asymmetric fix pattern — data path differs, dirty-state contract identical).

`block-editor.tsx` LOC deviation held at 33/40 through Phase 6 (Phase 5 exit). Cross-reference: `tools/block-forge/PARITY.md` §Discipline Confirmation (WP-028 Close).
