# WP-026 Phase 2 — Preview + Picker Result

**Date:** 2026-04-23
**Duration:** ~55 min
**Commit(s):** `7a29960f`
**Arch-test:** 463 / 0 (exact +8 prediction)
**Test totals:** file-io 14/14 + preview-assets 9/9 = **23 / 23**

---

## What Shipped

### 8 new files under `tools/block-forge/`
1. `src/lib/preview-assets.ts` — `composeSrcDoc({ html, css, js?, width, slug })` + 4× `?raw` imports (tokens.css, tokens.responsive.css, portal-blocks.css, animate-utils.js) + `SLOT_CONTAINMENT_RULE` emitted into `@layer shared`.
2. `src/lib/paths.ts` — `CANONICAL_SOURCE_DIR_REL`, `pathToSlug`, `slugToFilename`, `isSafeSlug` (browser-safe, no node: imports).
3. `src/lib/api-client.ts` — `listBlocks()` + `getBlock(slug)` fetch wrappers.
4. `src/components/BlockPicker.tsx` — real-content dropdown; reads `/api/blocks`.
5. `src/components/PreviewPanel.tsx` — single iframe + ResizeObserver height sync.
6. `src/components/PreviewTriptych.tsx` — 3 fixed-width panels (1440 / 768 / 375).
7. `src/__tests__/preview-assets.test.ts` — 9 jsdom-env cases (a–i).
8. `PARITY.md` — Phase 2 contract seed (token list, `@layer` order, slot wrapper, runtime injection, discipline rules).

### Modified existing files
- `vite.config.ts` — inline `blocksApiPlugin` (Vite middleware on `/api/blocks/*`); added `test.css: true` + `/// <reference types="vitest/config" />`; switched to `fileURLToPath(import.meta.url)` for `__dirname` (Windows-safe).
- `src/App.tsx` — picker + triptych wired on Phase-1-hotfix shell; suggestions/status placeholders preserved for Phase 3/4.
- `src/__arch__/domain-manifest.ts` — `+8` `infra-tooling.owned_files` entries added inline (source-tree grouped, not appended).

**Phase 2 owned_files total:** 13 (Phase 1 hotfix baseline) + 8 = **21**.

### Untracked working-dir artifacts
- `tools/block-forge/phase-2-triptych-verification.png` — full-page Playwright screenshot; gitignored per hotfix `.gitignore` (`*.png`). Retained locally for parity reference.

---

## Token Sanity — pre-coding grep verdict

Grep `^\s*--(status-danger-fg|bg-base|bg-page|text-primary|text-muted|border-default)\s*:` vs `packages/ui/src/theme/tokens.css`:

| Requested token | Status | Resolution |
|---|---|---|
| `--bg-page` | ✅ L96: `20 23% 97%` | Used verbatim |
| `--text-primary` | ✅ L105: `0 0% 9%` | Used verbatim |
| `--text-muted` | ✅ L107: `37 12% 62%` | Used verbatim |
| `--border-default` | ✅ L114: `30 19% 90%` | Used verbatim |
| `--status-danger-fg` | ❌ **NOT PRESENT** | **Fallback to `--status-error-fg`** (L123: `0 72% 51%`). Documented as Plan Correction C1. |
| `--bg-base` | ❌ **NOT PRESENT** | **Fallback to `--bg-surface`** (L97: `0 0% 100%`) — pure-white form-surface semantic (the `<select>` background fits `--bg-surface` better than `--bg-page` warm-off-white app shell). Documented as Plan Correction C2. |

Survey for transparency:
- status-* family has `--status-success-*`, `--status-error-*`, `--status-warn-*`, `--status-info-*` (no `--status-danger-*`). `--status-error-fg` = `0 72% 51%` — that's the same "red-500-ish" danger semantic.
- bg-* family has `--bg-page`, `--bg-surface`, `--bg-surface-alt`, `--bg-elevated`, `--bg-inverse`, `--bg-brand-*` (no `--bg-base`). `--bg-surface` is the nearest neutral form-input background.

---

## Verification Output

### `npm run arch-test` → 463 / 0
```
Test Files  1 passed (1)
     Tests  463 passed (463)
  Duration  575ms
```
Exact +8 prediction match (455 hotfix baseline + 8 new owned_files).

### `cd tools/block-forge && npm run typecheck` → clean
Zero output.

### `npx tsc --noEmit` (monorepo root) → clean
Zero output.

### `cd tools/block-forge && npm test` → 23 / 23
```
Test Files  2 passed (2)
     Tests  23 passed (23)
  Duration  954ms
```
File-io unchanged (14/14), preview-assets 9/9 first pass after `test.css: true` fix (see Deviation #1 below).

### `cd tools/block-forge && npm run build` → ✓ built in 1.25s
```
✓ 38 modules transformed.
dist/index.html                  0.38 kB │ gzip:  0.27 kB
dist/assets/index-g_2GT93i.css  24.43 kB │ gzip:  5.78 kB
dist/assets/index-BJlbvysu.js  227.59 kB │ gzip: 69.13 kB
```
**Inherited PostCSS warning** (from Phase 1 hotfix — structurally identical `globals.css`): `@import must precede all other statements (besides @charset or empty @layer)`. Browser honors `@import url()` for Manrope correctly. Zero functional impact.

---

## API Smoke Tests (5 / 5 passing)

Dev server on `:7702`, curl against `/api/blocks/*`:

| Case | Expectation | Actual |
|---|---|---|
| `GET /api/blocks` | 200 + 4 blocks, sourceDir ends with `content\db\blocks` | ✅ `{"sourceDir":"C:\\work\\...\\content\\db\\blocks","blocks":[{slug:"fast-loading-speed",…}, {slug:"header",…}, {slug:"sidebar-perfect-for",…}, {slug:"sidebar-pricing",…}]}` |
| `GET /api/blocks/header` | 200 + valid BlockJson | ✅ `slug: header, html-len: 1396, css-len: 4637, has-js: true` |
| `GET /api/blocks/..%2F..%2Fetc%2Fpasswd` | 400 | ✅ **400** (slug regex rejects) |
| `GET /api/blocks/nonexistent-slug` | 404 | ✅ **404** |
| `POST /api/blocks/header` | 405 (not wired until Phase 4) | ✅ **405** |

---

## Playwright DevTools Verification (1440 iframe)

Computed styles + DOM hierarchy on `http://localhost:7702/` → picker set to `header`:

```json
{
  "summary": [
    {"title":"header-1440","width":1440,"height":144,"hasSrcDoc":true},
    {"title":"header-768","width":768,"height":144,"hasSrcDoc":true},
    {"title":"header-375","width":375,"height":144,"hasSrcDoc":true}
  ],
  "hierarchy": {
    "slotInnerPresent": true,
    "shellPresent": true,
    "shellSlug": "header",
    "firstBlockTag": "SECTION",
    "firstBlockClass": "block-header-nav"
  },
  "slotInnerComputed": {
    "containerType": "inline-size",
    "containerName": "slot"
  },
  "bodyComputed": {
    "fontFamily": "Manrope, system-ui, sans-serif",
    "width": "1440px",
    "overflow": "hidden"
  },
  "bgPageResolved": "20 23% 97%",
  "layerOrderDeclarationIndex": 5,
  "styleTagCount": 1
}
```

**Every PARITY.md contract assertion passes:**
- ✅ `body > div.slot-inner > div[data-block-shell="header"] > <section.block-header-nav>` — exact hierarchy.
- ✅ `.slot-inner` computed `container-type: inline-size`, `container-name: slot`.
- ✅ `--bg-page` resolves to `20 23% 97%` (matches tokens.css L96).
- ✅ `body { font-family: Manrope, ...; width: 1440px; overflow: hidden }`.
- ✅ `@layer tokens, reset, shared, block;` declaration present at byte-index 5 in the iframe's single `<style>` tag.
- ✅ 3 iframes render at exact widths 1440 / 768 / 375.

---

## Parity Check (OBLIGATORY — verdict: **contract-match**)

**Block chosen:** `header` (`content/db/blocks/header.json`).

**block-forge 1440 render:** see `tools/block-forge/phase-2-triptych-verification.png`. Navy circular "Masters" logo, Themes/Docs/Blog/Support nav, rounded pill search with icon, "My Account" outlined navy pill. Warm off-white `--bg-page` container. Manrope typography.

**Portal reference availability:**
- `https://portal.cmsmasters.studio/` — `ERR_NAME_NOT_RESOLVED` (DNS not configured).
- `https://portal.cmsmasters.net/` — 404 NOT_FOUND (live deployment empty or routed elsewhere).
- Local portal dev (`apps/portal` @ `:3100`) — started cleanly (Next.js 15.5.15 ready in 3.3s), but every route returns 404 because `content/db/` has no `themes/` directory (themes are Supabase-seeded; dev DB not populated here). `/themes`, `/themes/avada`, `/avada`, `/` all 404.

**Pivoted parity approach — contract-level verification:**

block-forge's iframe render is **deterministic from three inputs**:
1. **Source of truth:** `content/db/blocks/header.json` — the exact file Supabase is seeded from. block-forge reads this file directly; portal reads its Supabase row that originated here.
2. **Injection contract:** `@layer tokens { tokens.css + tokens.responsive.css }` + `@layer shared { portal-blocks.css + SLOT_CONTAINMENT_RULE }` + `@layer block { block.css }` — every asset verified to exist at Phase 0; computed-styles check above confirms all inject at runtime.
3. **Slot wrapper:** `<div class="slot-inner"><div data-block-shell="{slug}">…</div></div>` — structural parity with portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper, verified via DevTools DOM walk.

**Verdict:** **match** on contract + structure + token resolution + asset injection. Live-portal visual byte-diff check deferred until portal is reachable locally with seeded data OR until a Phase 2.x hotfix has a reachable portal URL.

**PARITY.md Open Divergences:** _(none at Phase 2 seed)_ — no observed divergence to log.

---

## Deviations

1. **`test.css: true` required for Vitest to resolve `?raw` CSS imports.** First test run (default config) saw `tokensCSS`, `tokensResponsiveCSS`, `portalBlocksCSS` all evaluate to empty strings; only `animateUtilsJS` (`?raw` on a `.js` file) loaded. Root cause: Vitest mocks `.css` imports as empty strings by default (`css: false`), overriding even the `?raw` query suffix. Fix: added `test: { css: true }` to `vite.config.ts` + `/// <reference types="vitest/config" />` triple-slash for typing. 23/23 green on re-run. Noted in vite.config.ts inline comment.

2. **Portal-live parity screenshot not obtained.** See §Parity Check above — portal is 404 at both `.studio` and `.net`; local dev 404s without Supabase seeding. Substituted contract-level parity (structural + asset-injection + token-resolution) which verifies the render is deterministic from the documented contract. Non-blocking for Phase 3 since core-engine wiring doesn't depend on live-portal visual diff.

3. **`--border-default`/etc. token usage inherited from Phase 1 hotfix precedent.** `--status-danger-fg` and `--bg-base` (both prescribed in task §2.6) not in tokens.css; fallback to `--status-error-fg` and `--bg-surface` respectively. Same pre-coding grep discipline as hotfix.

4. **`__dirname` polyfill via `fileURLToPath`.** Task §2.4 suggested `import.meta.dirname` with `fileURLToPath` fallback. Chose `fileURLToPath(import.meta.url)` directly for Windows path robustness (Node 22.22.0 has `import.meta.dirname`, but the fileURLToPath form is battle-tested across WSL/Windows drive-letter quirks).

---

## Plan Corrections

**C1 — `--status-danger-fg` should read `--status-error-fg` in task §2.6 / `BlockPicker.tsx` error div.** The "danger" semantic in portal DS is `--status-error-*` (no `--status-danger-*` family). Same fix pattern as hotfix's `--border-base` → `--border-default`.

**C2 — `--bg-base` should read `--bg-surface` in task §2.6 / `<select>` bg.** No `--bg-base` exists; `--bg-surface` (pure white, L97) is the nearest form-input-background semantic.

Recommended: Brain patch to `logs/wp-026/phase-2-task.md` §2.6 code block (2 token names) + §"Token grep before coding" note updating the expectation. No code change needed — Phase 2 already used correct fallbacks.

**C3 (minor, non-blocking) — Add `test.css: true` to task §2.2 Vitest config expectations** so future phases don't repeat the empty-string debug loop. One-line note in phase-2-task.md §Verification would suffice.

**Other:** none.

---

## Summary for Brain

- **Arch-test:** 463/0 (exact +8 prediction).
- **Tests:** 23/23 green (14 file-io unchanged + 9 preview-assets new).
- **Typecheck:** clean (root + tools/block-forge).
- **Build:** Vite+PostCSS+Tailwind → ✓ 1.25s, 38 modules.
- **API smoke:** 5/5 (list, get, traversal→400, missing→404, POST→405).
- **DevTools parity:** all 6 PARITY.md contract assertions pass on live iframe.
- **Visual parity:** `contract-match` verdict (live portal unreachable; substituted structural + contract + token verification). Screenshot stored locally (gitignored).
- **Deviations:** 4 (Vitest CSS mock fix, portal-live 404 substitution, token-fallback inheritance, `fileURLToPath` over `import.meta.dirname`).
- **Plan Corrections:** 3 (C1 `--status-error-fg`, C2 `--bg-surface`, C3 `test.css: true` note).
- **Ready for Phase 3** — core-engine wiring (`renderForPreview`, `useAnalysis`, SuggestionList, SuggestionRow) is unblocked: preview-assets + api-client + triptych foundation is stable, BlockJson flows end-to-end, PARITY.md has seed contract.
