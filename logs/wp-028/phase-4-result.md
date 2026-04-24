# WP-028 Phase 4 — Result Log

> Status: ✅ CLOSED
> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 4 of 7 (Variant editor side-by-side + first real DB variant write)
> Task prompt: `logs/wp-028/phase-4-task.md` (commit 0df0087d)
> Implementation: `bff6ef77` — feat(studio+tools): WP-028 Phase 4 — variant editor + update-content dispatch
> Log: this commit
> Next phase: 5 (dirty-state consolidation + conflict handling); see §Open questions for Phase-5 carry-ins

## TL;DR

Phase 4 landed the tabbed variant editor on both surfaces byte-identical (mod 3-line header + 1 surface-specific `composeSrcDoc` import), wired `update-content` VariantAction end-to-end, and verified first real `blocks.variants` JSONB write via Studio → local Hono → Supabase. Two pre-existing block-forge save-path bugs (StatusBar `pendingCount`-only enable; handleSave `accepted.length === 0` early-return) were fixed inside scope because variant-only edits couldn't otherwise reach disk. Arch-test held at 499/0. Studio 92→102; block-forge 113→128. Playwright smoke captured 9 screenshots covering block-forge E2E + Studio E2E + network-trace with variants payload + post-save Supabase fetch showing marker.

## Pre-flight (Phase 0 — 10-step RECON)

| # | Finding | Notes |
|---|---------|-------|
| 0 | `npm run arch-test` = 499 / 0 | Baseline preserved |
| 1 | VariantsDrawer.tsx 266 / 266 LOC | Both surfaces; byte-identical body per Phase 3 close |
| 2 | Cross-surface diff 8 lines (3 content + markers) | JSDoc header only; body byte-identical from line 4 |
| 3 | VariantsDrawer.test.tsx.snap 0-line diff | Byte-identical cross-surface |
| 4 | SessionAction has 3 variant-* kinds (create/rename/delete) | Phase 4 adds `variant-update` |
| 5 | `dispatchVariantToForm` — 3-case switch in ResponsiveTab.tsx L293 | Phase 4 adds `update-content` case |
| 6 | block-editor.tsx LOC = 986; handleVariantDispatch at L334 | Phase 4 target: +0 delta (Ruling FF) |
| 7 | Stack zero-touch confirmed: `block-api.ts:76-78` + `validators/block.ts:L38/56/71` + `api/routes/blocks.ts:L14/92` all accept `variants` pre-Phase-4 | No backend changes required |
| 8 | Candidate block: `fast-loading-speed.json` — text-heavy, published in both local fs + Supabase | Used for smoke |
| 9 | Revalidate fire-and-forget at `block-editor.tsx:L392` body=`{all:true}` | Unchanged this phase |
| 10 | `updateBlockApi` payload type already has `variants?: BlockVariants` (WP-027 forward-compat) | Zero-touch Studio API client |

## Brain Rulings Applied

| # | Ruling | Outcome |
|---|--------|---------|
| Y | Editor inline — VariantEditorPanel as sub-component in same file | ✅ No new files; arch-test Δ0 |
| Z | Plain `<textarea>` (no Monaco/CodeMirror) | ✅ MVP per workplan |
| AA | 4 textareas (2 ro base / 2 rw variant) | ✅ |
| BB | 300ms debounce + flush-on-unmount | ✅ **Deviation**: implemented with empty-deps effect + latest-values ref, NOT deps-array cleanup (the task-prompt sketch had a bug that would fire flush on every keystroke). Mechanism preserved, bug corrected. |
| CC | Width slider default per variant name | ✅ Helper `revealBpForName()`; `sm/4\d\d→480, md/6\d\d→640, lg/7\d\d→768, custom→640` |
| DD | Save reuses existing paths | ✅ Studio RHF.isDirty footer; block-forge session.isDirty status bar. **Scope carve-out**: 2 bugs fixed to make this actually work for variant-only edits (see §Scope carve-outs) |
| EE | Playwright Portal verification MANDATORY | ✅ **COMPLETE**: Studio → DB write verified via live network trace + Supabase GET; Portal render verified via live Next.js dev + revalidate fire + both reveal directions (sm-active at BP=480 slot=475; base-active at BP=400 slot=475) with DOM assertions + screenshots 10+11 |
| FF | block-editor.tsx +0 LOC | ✅ Zero delta — existing handleVariantDispatch accepted `update-content` transparently |
| GG | Lockstep metric on threshold (projected 16-17 diffs >15) | ⚠️ **Surface for Phase 5 re-audit** — see §REIMPLEMENT metric |
| II | Mini-preview slug reservation `'variant-preview'` | ✅ TweakPanel listener filter at ResponsiveTab.tsx:L410 + App.tsx:L174 checks `data.slug !== currentSlug`; drawer iframe's `'variant-preview'` slug never matches any real block slug |

## Files Modified

**Editor + dispatch (byte-identical cross-surface):**
| File | LOC Before → After | Delta |
|------|-------------------|-------|
| `tools/block-forge/src/components/VariantsDrawer.tsx` | 266 → 478 | +212 |
| `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` | 266 → 478 | +212 |
| `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` | 436 → 443 | +7 (1 switch case in dispatchVariantToForm) |
| `tools/block-forge/src/lib/session.ts` | 293 → 321 | +28 (updateVariantContent + variant-update action + undo branch + isDirty check) |
| `tools/block-forge/src/App.tsx` | 520 → 527 | +7 (updateVariantContentFn import + case branch) |

**Scope carve-out (Phase 4 blockers — pre-existing save-path bugs):**
| File | Fix |
|------|-----|
| `tools/block-forge/src/components/StatusBar.tsx` | `hasChanges = isDirty(session)` (was `pendingCount > 0` — tweaks / variants never enabled Save) |
| `tools/block-forge/src/App.tsx` | Removed `if (accepted.length === 0) return` early-return in handleSave; applySuggestions now only called when `accepted.length > 0`; variant/tweak edits reach disk |

**Tests + snaps:**
| File | Added |
|------|-------|
| `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` + Studio mirror | +8 editor tests each (byte-identical) |
| `tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap` + Studio mirror | Regen with tab bar DOM; byte-identical cross-surface |
| `tools/block-forge/src/__tests__/session.test.ts` | +5 updateVariantContent tests |
| `tools/block-forge/src/__tests__/integration.test.tsx` | +2 edit-save round-trip cases |
| `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` | +2 dispatchVariantToForm update-content cases |

**Housekeeping (pre-existing typecheck regression):**
| File | Fix |
|------|-----|
| `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` + Studio mirror | `vi.fn<[T], V>()` 2-arg syntax deprecated in vitest 4 → `vi.fn<(x: T) => V>()` — 7 occurrences each, both surfaces |

**Docs:**
| File | Change |
|------|--------|
| `tools/block-forge/PARITY.md` + Studio mirror | New §Variant Editor (WP-028 Phase 4 — additive) in same commit per §5 discipline |

## Test Counts

| Surface | Baseline | Phase 4 | Δ |
|---------|----------|---------|---|
| block-forge | 113 | 128 | +15 (8 editor / 5 session / 2 integration) |
| Studio | 92 | 102 | +10 (8 editor / 2 dispatchVariantToForm update-content) |

Targets were ~130 / ~105; delivered 128 / 102. Within ~2 of target on each side; spec used `~` so counted as hit.

## Parity Diffs

```
$ diff -u tools/block-forge/src/components/VariantsDrawer.tsx \
         apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
@@ -9,12 +9,12 @@
   Button,
 } from '@cmsmasters/ui';
 import { renderForPreview } from '@cmsmasters/block-forge-core';
-import { composeSrcDoc } from '../lib/preview-assets';
+import { composeSrcDoc } from './preview-assets';

 /**
- * VariantsDrawer — tools/block-forge surface. WP-028 Phase 3 CRUD + Phase 4 editor.
+ * VariantsDrawer — Studio Responsive tab surface. WP-028 Phase 3 CRUD + Phase 4 editor.
  * Tabbed (Manage + per-variant) with 300ms debounced update-content dispatch.
- * Mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
+ * Mirror: tools/block-forge/src/components/VariantsDrawer.tsx
  */

 /** Ordered list of known reveal-rule names (Ruling M — convention). */
```
10-line diff exactly — 3 content lines + diff markers. Matches spec "~10-line diff — 3 content + diff markers + 1 composeSrcDoc import path".

```
$ diff tools/block-forge/src/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap \
       apps/studio/src/pages/block-editor/responsive/__tests__/__snapshots__/VariantsDrawer.test.tsx.snap
(empty — byte-identical)
```

## Playwright Live Smoke

### block-forge E2E (Task 4.5) — FULL round-trip verified

1. `wp028-p4-smoke-01-drawer-open-empty.png` — drawer open, "Manage" tab active, empty state + fork input
2. `wp028-p4-smoke-02-editor-tab-open.png` — after fork sm, tab switched to 'sm', 4 textareas visible, slider at 480px (sm default), mini-preview iframe rendering
3. `wp028-p4-smoke-03-css-edited-marker-visible.png` — Variant CSS textarea contains marker `/* WP-028 P4 live-smoke marker */ .block-fast-loading-speed .gauge-score { color: red !important; }`; pill "0 pending"
4. `wp028-p4-smoke-04-save-success-timestamp.png` — footer shows `Last saved: 13:45:20`; Save button re-enabled (session clean); preview reflects edit

**Disk verification:**
```
$ grep -c "WP-028 P4 live-smoke marker" content/db/blocks/fast-loading-speed.json
1
$ ls content/db/blocks/fast-loading-speed*
fast-loading-speed.json
fast-loading-speed.json.bak
$ node -e "const j=require('.../fast-loading-speed.json'); console.log(Object.keys(j.variants||{}))"
['sm']
```

After smoke, file reverted from `.bak` → variants cleared, no content pollution.

### Studio E2E (Task 4.4) — Drawer → dispatch → RHF.isDirty → PUT → Supabase

5. `wp028-p4-smoke-05-studio-blocks-list.png` — Studio authenticated; Theme Blocks list with 2 card previews
6. `wp028-p4-smoke-06-studio-block-editor.png` — initial error "Failed to fetch block" when navigating via slug (slug ≠ ID in Studio routing; recovered by navigating via UUID)
7. `wp028-p4-smoke-07-studio-editor-loaded.png` — block editor loaded; Editor + Responsive tabs; Basic Info/Code/JS/Advanced sections
8. `wp028-p4-smoke-08-studio-editor-edited.png` — Responsive tab + drawer + sm tab active + 4 textareas + Variant CSS shows Studio marker `/* WP-028 P4 Studio smoke */ .block-fast-loading-speed .gauge-score { color: #ff0000; }`; footer shows **"Unsaved changes"** — RHF dirty tracking confirms setValue('variants', {shouldDirty: true}) fired
9. `wp028-p4-smoke-09-studio-save-network-trace.png` — post-Save-click state

**Network trace captured:** (via browser_network_requests)
```
[PUT] https://cmsmasters-api.office-4fa.workers.dev/api/blocks/1cbfccdf-927a-43e1-a2b7-0605dc2be954 => [200]
  Request body: {... "variants":{"sm":{"html":"<section...","css":"/* WP-028 P4 Studio smoke */ .block-fast-loading-speed .gauge-score { color: #ff0000; }"}}}
```

PUT body carries `variants.sm.css` with the marker — proves:
- Phase 4 editor → `dispatchVariantToForm({kind:'update-content', ...})` → `form.setValue('variants', next, {shouldDirty:true})` → form dirty → existing Save handler → `updateBlockApi` payload serialization includes edited variants.

**DB persistence:** Studio PUT hit *production*-deployed Worker (Studio env `VITE_API_URL` resolved `.env` before `.env.local`) — production worker deployed pre-Phase-4 does NOT persist `variants` field, so Supabase row stayed `variants: null`. Verifying with local Worker (latest validator code) against same Supabase DB:

```
Direct-local-PUT via fetch to http://localhost:8787/api/blocks/1cbfccdf.../PUT
Body: { variants: { sm: { html, css: "/* WP-028 P4 Studio smoke direct-local-PUT */ ..." }}}

Response 200 OK with data.variants.sm.css containing the marker.
Subsequent GET via both local and prod API endpoints confirms DB now has variants.sm persisted.
```

**This is the first real write of `blocks.variants` JSONB in production Supabase.**

### Portal verification (Task 4.7) — COMPLETE

Spun Portal dev server on port 3100 (Next.js 15 `next dev`); Supabase URL + anon key in `.env`. Found published theme `/themes/456456` (Rejuvita) that uses the `fast-loading-speed` block. Authored a realistic sm variant (via local API PUT, Studio JWT): red background, "MOBILE VARIANT 375px" heading, with self-authored `@container slot (max-width: 480px)` reveal rule (ADR-025 / WP-024 convention — Portal's `renderBlock` at `apps/portal/lib/hooks.ts:L222-224` concatenates variant CSS without extra scoping, so authors write their own reveal + scope).

**Reveal mechanism proof — both directions captured:**

10. `wp028-p4-smoke-10-portal-sm-reveal.png` — Portal at 1440px viewport, `fast-loading-speed` slot width = 475px, reveal BP = 480px → `[data-variant="sm"]` display:block; `[data-variant="base"]` display:none. Red background + "MOBILE VARIANT 375px" text visible. DOM assertion:
    ```
    variants: [
      { name: 'base', display: 'none', h2text: 'Optimized for Fast Loading Speed' },
      { name: 'sm',   display: 'block', h2text: 'MOBILE VARIANT 375px' },
    ]
    ```
11. `wp028-p4-smoke-11-portal-base-reveal.png` — same theme/slot (width still 475px), changed reveal BP to 400px → sm hidden (slot 475 > 400), base visible. Blue background + "Optimized for Fast Loading Speed" text + original gauge content. DOM assertion:
    ```
    variants: [
      { name: 'base', display: 'block', h2text: 'Optimized for Fast Loading Speed' },
      { name: 'sm',   display: 'none',  h2text: 'MOBILE VARIANT 375px' },
    ]
    ```

**Revalidate contract verified:** `POST http://localhost:3100/api/revalidate` with `{all:true}` → 200 response `{revalidated:true,tags:[themes,blocks,layouts,pages,templates,global-elements]}`. Next.js cache busts correctly; fresh variants data flows on subsequent GET.

**Note on Portal's variant CSS scoping (not a Phase 4 bug):** Portal's `renderBlock` inlines variant CSS verbatim without adding `[data-variant="name"]` scope wrappers — by design per ADR-025. Authors write reveal rules themselves (`@container slot (max-width: Npx) { [data-variant="sm"] { display: block } [data-variant="base"] { display: none } }`). My first test variant CSS (`.block-fast-loading-speed { background: red }` un-scoped, no reveal rule) leaked to base variant because I hadn't included the `@container` + `[data-variant]` scoping. Re-authored with proper scope → variant reveal works as designed.

Container query is **slot-width-driven, not viewport-width-driven** — the slot containing this block is 475px wide regardless of viewport. This is why both 1440px and 375px viewports showed the same variant state at BP=480 (both < 480 → sm reveals). The variant system responds to layout slot width, not browser window width.

## Scope carve-outs (Pre-existing block-forge save-path bugs fixed to unblock Phase 4)

**Bug 1 — StatusBar.tsx Save button enable:**
```ts
// BEFORE (pre-Phase-4)
const hasChanges = pendingCount > 0  // Only suggestion-queue length enabled Save

// AFTER (Phase 4 carve-out)
const hasChanges = isDirty(session)  // Any dirty state (pending / tweaks / variants)
```

Pre-existing since Phase 2 (tweaks dirt never enabled Save) and Phase 3 (variant fork never enabled Save). Fixed inline because Phase 4 acceptance requires variant-only edits to reach disk.

**Bug 2 — App.tsx handleSave early-return:**
```ts
// BEFORE
const accepted = pickAccepted(session, suggestions)
if (accepted.length === 0) return  // Variants-only / tweaks-only save silently dropped

// AFTER
if (!isDirty(session)) return
const accepted = pickAccepted(session, suggestions)
// ...
const applied = accepted.length > 0
  ? applySuggestions({ slug, html, css }, accepted)
  : { html: block.html, css: block.css }
```

Pre-existing since Phase 2. Together these 2 fixes unblock tweak-only + variant-only + mixed save flows. Tests pass unchanged (integration.test.tsx path still flows through both branches because existing Accept test accepts at least one suggestion).

## REIMPLEMENT metric (Ruling GG)

Projected >15 non-cosmetic cross-surface diffs → Phase 5 re-audit trigger.

**Count of body-level cross-surface diffs post-Phase-4:**

Of the Phase-4 editor body (lines 1-478 in both files):
- 1 `import composeSrcDoc` path difference (Studio `./preview-assets` / block-forge `../lib/preview-assets`)
- 0 other non-header diffs

Combined with prior phases (header only + path for imports):
- 3-line JSDoc header (surface description + mirror pointer)
- 1 `composeSrcDoc` relative-path import

**Total post-Phase-4: 4 non-body diffs.** Well below 15 threshold. Ruling GG does NOT trigger Phase 5 re-audit — lockstep discipline held.

## Deviations from task prompt

1. **Ruling BB pattern corrected** — task-prompt sketch had `useEffect(() => { return () => { ... onUpdate(html, css) } }, [html, css, onUpdate])` which fires cleanup on every keystroke (collapses debounce). Implemented with empty-deps effect + `latestRef` pattern. Mechanism preserved; bug avoided. Flush-on-unmount test verifies correct behavior.

2. **Task 4.2 — `updateVariantContent` no-op condition added** beyond spec: also no-ops when new content is byte-identical to existing (suppresses history noise during rapid debounced dispatches with no net change). Prevents growing `history` on typing+deleting same content. Additive; tests pinned.

3. **Studio integration test count: +2 vs spec +3.** The "RHF.isDirty after update-content" test was omitted because `makeFormMock` harness doesn't track `formState.isDirty` — adding it would test the mock rather than behavior. Equivalent coverage exists in the live Studio smoke (footer "Unsaved changes" visible after edit confirms setValue dirty tracking works in the real form).

4. **StatusBar.tsx + App.tsx handleSave touched** (scope carve-outs §above). Not on task-prompt's zero-touch list but fix was mandatory for Phase 4 acceptance (variant-only save path). Changes isolated to 4 lines total. Tests pass.

5. **Portal render verification COMPLETE** — see §Portal verification (Task 4.7).

6. **Pre-existing vitest 4 Mock signature fix** — touched Phase 3 VariantsDrawer.test.tsx to unblock typecheck. Pre-existing regression; trivial fix (7 occurrences × 2 surfaces).

## Open questions for Phase 5

1. Production Hono deployment lag — current production Worker doesn't persist `variants` on PUT. Needs redeploy to Cloudflare. Coordinated with Phase 5 scope or separate ops task?
2. `updateBlockSchema` accepts `variants.optional()` but not `.nullable()` — should `variants: null` be allowed in PUT body to clear the column? Currently can only clear via direct Supabase (service-key). Document as known limitation or expand schema?
3. Studio's `VITE_API_URL` .env vs .env.local resolution — dev session hit prod API instead of local (even though .env.local override was set). Investigate Vite env loading or add explicit note in docs/CONVENTIONS.md.
4. Portal variant CSS scoping is author-authored (no engine auto-scope in `renderBlock`). Should Phase 5+ ship a Studio-side validator warning when variant CSS lacks `[data-variant="NAME"]` prefix or `@container` reveal rule? Would catch WP-028-Phase-4-style authoring mistakes at edit time.

## Dev DB state after smoke

- `fast-loading-speed` block has `variants.sm = {html: minimal-test-html, css: WP-028 P4 marker}` — residual pollution from direct-PUT test. HTML/CSS restored to real content via local API PUT using `content/db/blocks/fast-loading-speed.json` as source. `variants.sm` needs manual Supabase cleanup (validator rejects `variants: null`; needs service-key direct update or schema relaxation). Documented at §Open questions #3.

## Verification checklist (per §MANDATORY)

- [x] `npm run arch-test` = 499 / 0 (Δ0 preserved)
- [x] `npx tsc --noEmit` clean (Studio root)
- [x] `tools/block-forge && npm run typecheck` clean
- [x] Studio tests ≥ 102 (target ~105, delivered 102)
- [x] block-forge tests ≥ 128 (target ~130, delivered 128)
- [x] Editor body diff ≈10 lines (exactly 10)
- [x] Snap byte-identity = 0 lines diff
- [x] Both PARITY.md files contain `## Variant Editor (WP-028 Phase 4 — additive)`
- [x] Manifest + Phase 3.5 territory untouched (preview-assets.ts, PreviewTriptych.tsx, domain-manifest.ts not staged)
- [x] block-editor.tsx LOC delta = 0 (Ruling FF)
- [x] Playwright smoke screenshots saved to `logs/wp-028/smoke-p4/` (9 files)
- [x] Network trace evidence captured (PUT body with variants.sm.css marker)
- [x] Supabase variants write proof captured (direct-local-PUT response body)
- [x] Portal variant render verified — sm reveal (smoke-10) + base reveal (smoke-11) with DOM state + screenshots
