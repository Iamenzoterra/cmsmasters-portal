# WP-027 Phase 1 — Result

**Date:** 2026-04-23
**Duration:** ~2h implementation + ~30min visual verification via Playwright MCP
**Commits (Phase 1 lineage, newest last):**
- Task prompt + amended workplan: `afb365a4` — `logs/wp-027/phase-1-task.md` + `workplan/WP-027-studio-responsive-tab.md`
- Scaffold + tests + manifest: `a34ff13d` — atomic implementation (17 files, 1048 insertions, 5 deletions)
- Result log (initial + SHA-embed amend): `32a7b7b3` — this file, first landing
- Visual verification addendum: `ab8791aa` — amended result log + `phase-1-screenshots/*.png` (7 full-page 1440×900 captures)
- Final amend (this edit): SHA self-reference omitted per Phase 4 / WP-026 chicken-and-egg convention — the amend that embeds `ab8791aa` can't embed its own post-amend SHA without a second amend loop

**Arch-test:** 489 / 0 (exact target; baseline 477 + 12 new owned_files)
**Block-editor typecheck:** clean (`tsc --noEmit` via `npm -w @cmsmasters/studio run lint`)
**Studio test suite:** 16 passed | 3 todo (across 4 files — 1 real + 3 describe.skip stubs)
**Studio build:** clean (`vite build`, 7.33s, 497 kB main bundle)
**Cross-domain typecheck:** clean (admin + dashboard + block-forge-core — zero regression)

---

## Task-by-task

### 1.1 Studio dep add

- **Install path succeeded:** **root** (`npm install --prefer-offline` from monorepo root). 38 new packages added to root `node_modules/`; `apps/studio` workspace linking verified immediately — no fallback needed. Lockfile updated at root `package-lock.json` (no per-workspace lockfile on this monorepo).
- **Versions used** (mirror of `tools/block-forge/package.json` devDependencies, verified at read-time 2026-04-23):
  - `vitest`: `^4` (resolved to `4.1.2`)
  - `@testing-library/react`: `^16`
  - `jsdom`: `^25`
  - `@testing-library/user-event`: NOT added (per Fix 7; `tools/block-forge` doesn't use it either; `fireEvent.click` from `@testing-library/react` covers button tests).
- **Dependencies delta on `apps/studio/package.json`:**
  - `dependencies`: `+@cmsmasters/block-forge-core: "*"` (alphabetical after `@cmsmasters/auth`, before `@cmsmasters/db`).
  - `devDependencies`: `+vitest`, `+@testing-library/react`, `+jsdom`.
  - `scripts`: `+"test": "vitest run"`, `+"test:watch": "vitest"`.
- **Verify step ran:** `npx vitest --version` from `apps/studio/` → `vitest/4.1.2 win32-x64 node-v22.22.0`. ✅ Consistent with version added to package.json.
- **Did NOT run** the `node -e "require('@cmsmasters/block-forge-core')"` check (Fix 2 correctly disabled — pkg-block-forge-core's `"main": "./src/index.ts"` means bare Node can't load without tsx/ts-node). Dep resolution verified instead via 1.2's vitest run + 1.8's studio typecheck + studio build.

### 1.2 Vitest config

`apps/studio/vite.config.ts` extended exactly per Task 1.2 template:
- `css: true` ✅ — MANDATORY per saved memory `feedback_vitest_css_raw.md`.
- `environment: 'jsdom'` ✅.
- `globals: true` ✅.
- Triple-slash reference `/// <reference types="vitest" />` added on line 1.
- `npm -w @cmsmasters/studio test` on empty suite printed `No test files found, exiting with code 1` — expected pre-1.6.

### 1.3 Tab bar

- **LOC delta in `apps/studio/src/pages/block-editor.tsx`:** `+41 / -1` = net **+40** (at the ≤40 LOC target from Task 1.3).
- **Pattern source:** `apps/studio/src/pages/theme-meta.tsx:188–217` — bespoke row of buttons with `borderBottom` active highlight, mirrored exactly (same padding, same font weights, same color tokens).
- **Tab state:** `useState<'editor' | 'responsive'>('editor')` near existing state hooks (after `blockCategories`).
- **Import added:** `import { ResponsiveTab } from './block-editor/responsive/ResponsiveTab'` alongside other local component imports.
- **Structure (per Fix 5 / Task 1.3 anti-trap):**
  - Tab bar inserted between top-bar buttons' closing `</div>` and the "Body: 2-column" comment.
  - `{activeTab === 'editor' && (<div className="flex flex-1 overflow-y-auto"…>…</div>)}` wraps ONLY the 2-column body + Process panel + DeleteConfirmModal.
  - `{activeTab === 'responsive' && (<div className="flex flex-1 flex-col overflow-y-auto"…><ResponsiveTab /></div>)}` immediately after.
  - Save footer (existing Discard + Save + dirty indicator) remains OUTSIDE both conditionals — always visible.
- **Process button behavior unchanged:** verified by inspection — `showProcess` state + `<BlockImportPanel>` render + side-panel toggle all still inside the Editor tab conditional, referenced identifiers unchanged.
- **Save footer stays visible on Responsive tab:** verified by structural reading of the JSX tree. Manual dev-server click-test deferred to user (no browser-driver available in this session); rerun guidance: `npm -w @cmsmasters/studio run dev` → open `/blocks/:id` for any block → click Responsive → confirm footer still renders at bottom with "No changes" disabled state.

### 1.4 Scaffold

- **8 source files created** under `apps/studio/src/pages/block-editor/responsive/`:
  1. `ResponsiveTab.tsx` — rendered placeholder text (real content, not TODO).
  2. `ResponsivePreview.tsx` — `return null` + Phase 2 TODO.
  3. `PreviewPanel.tsx` — `return null` + Phase 2 TODO.
  4. `SuggestionList.tsx` — `return null` + Phase 3 TODO.
  5. `SuggestionRow.tsx` — `return null` + Phase 3/4 TODO.
  6. `preview-assets.ts` — `export {}` + Phase 2 TODO + path-depth comment (6/7 `..` per carry-over (f)).
  7. `PARITY.md` — seeded verbatim from tools/block-forge/PARITY.md, then appended "## Studio-specific deviations" with 5 items (Phase 0 §0.11) + sibling cross-reference line at top (6 `..` to tools/block-forge/PARITY.md) + new "Cross-contract parity notes" section.
  8. `session-state.ts` — see 1.5.
- **PARITY.md seed quality:** matches tools/block-forge/PARITY.md contract section byte-for-byte (tokens / @layer order / slot wrapper / runtime injection / breakpoints / sandbox / out-of-scope). 5 deviations documented: (1) `?raw` path depth 6/7, (2) variants IN scope from Phase 2, (3) sandbox attribute order, (4) dirty-state coupling via RHF, (5) auth context via updateBlockApi.
- **Reverse cross-ref in tools/block-forge/PARITY.md** deliberately NOT added yet — Phase 5 Close task (Brain approval gate).

### 1.5 session-state.ts

- **Exports:** `createSession`, `accept`, `reject`, `undo`, `clearAfterSave`, `isActOn`, `pickAccepted`, `isDirty` (all named), plus types `SessionAction`, `SessionState`.
- **True mirror of WP-026 `session.ts`** (per Fix 4), minus `backedUp: boolean` + `lastSavedAt: number | null` (tied to file `.bak` discipline; irrelevant for DB-backed Studio consumer).
- **Structural contract verified against source (`tools/block-forge/src/lib/session.ts`):**
  - `string[]` arrays (not Set) — insertion order preserved.
  - `accept` / `reject`: no-op if id is in **EITHER** pending or rejected (not cross-set toggles) — return the SAME state reference via `if (... includes ...) return state`.
  - `undo` reverts last action by removing id from whichever set holds it + popping `history`.
  - Unbounded `history: SessionAction[]` (no cap).
  - `isActOn` returns `boolean` primitive.
  - Invalid transitions (re-accept, re-reject, undo-empty) return input state by-reference.
  - `clearAfterSave` returns `{ pending: [], rejected: [], history: [] }` — fully synchronous (no `Date.now()` impurity since lastSavedAt is dropped).
- **No React, no hooks, no DOM, no throws.** Phase 4 consumer wires via `useReducer` inline in `ResponsiveTab.tsx`.

### 1.6 session-state.test.ts

- **Cases: 16** (one file, one top-level `describe('session-state', …)`). Exceeds Task 1.6's "~16" floor exactly.
- **Mirror of `tools/block-forge/src/__tests__/session.test.ts` case-for-case:**
  - Mapping: case 1 = createSession; cases 2–3 = accept/reject append + history push; cases 4–7 = `toBe(sameRef)` no-op identity checks (EACH of accept-on-pending, accept-on-rejected, reject-on-pending, reject-on-rejected — stricter than WP-026 which uses `toEqual`; our implementation returns same-ref so strict identity is valid); cases 8–10 = undo variants; case 11 = insertion order via triple accept; case 12 = clearAfterSave empties all; case 13 = `isActOn` boolean type assertion (via `typeof ... === 'boolean'`); case 14 = pickAccepted filter + input-order preservation; case 15 = isDirty full truth table; case 16 = **unbounded history** (push 20 accepts, assert `history.length === 20`).
- **Intentional omissions from WP-026 test suite:**
  - WP-026 case `clearAfterSave — flips backedUp=true; stamps lastSavedAt > 0` → omitted (fields dropped).
  - WP-026 case `clearAfterSave — on already-saved state: backedUp stays true, timestamp updates` → omitted (fields dropped).
  - WP-026 case `accept → accept → undo rolls back only the second` → retained semantics via case 11 (insertion order) + case 8 (undo rolls back); a standalone undo-after-second-accept case is redundant with these two.
- **All 16 tests pass:** `1 passed | 3 skipped (4)` test files (skipped are the Phase 2/3/4 stubs); `16 passed | 3 todo (19)` tests.
- **No React Testing Library imports.** Pure-function suite.

### 1.7 Manifest + stubs

- **3 stub test files** created with `describe.skip('… (Phase N)', () => { it.todo('TBD') })` bodies:
  - `__tests__/preview-assets.test.ts` — Phase 2
  - `__tests__/suggestion-row.test.tsx` — Phase 3
  - `__tests__/integration.test.tsx` — Phase 4
- **Manifest edit at `src/__arch__/domain-manifest.ts:285–316` (studio-blocks block):**
  - `owned_files`: 4 existing entries + 12 new entries (8 source + 4 tests) = 16 total.
  - `allowed_imports_from`: 5 existing entries + `'pkg-block-forge-core'` inserted after `'pkg-ui'` and before `'studio-core'` (maintains roughly alphabetical-after-pkg-prefix ordering; studio-core stays last as internal-to-parent-app).
- **Arch-test behavior:** stubs make Path Existence check green (`fs.existsSync()` returns true for all 16 entries from Phase 1 onward); `Full-Status Skill Sections` block was already green for studio-blocks (SKILL `status: full` per Phase 0 §0.9 inference); no +6 flip incurred.

### 1.8 Gates

- **`npm run arch-test`**: 489 / 0 — exact target. Duration ~500ms. ✅
- **`npm -w @cmsmasters/studio run lint` (= `tsc --noEmit`)**: clean, no output. ✅
- **`npm -w @cmsmasters/studio test`**: 16 passed | 3 todo across 4 test files. Duration 1.52s. ✅
- **`npm -w @cmsmasters/studio run build`**: clean, built in 7.33s. Main bundle: `dist/assets/index-Ci0FYk2K.js` 497.46 kB / gzip 145.66 kB. ✅
- **`npm -w @cmsmasters/block-forge-core run typecheck`**: clean (no cross-domain regression from new import). ✅
- **`npm -w @cmsmasters/admin run lint` + `npm -w @cmsmasters/dashboard run lint`**: both clean (neighbor-app smoke tests for regressions). ✅
- **Manual `npm -w @cmsmasters/studio run dev` smoke**: deferred to user — this session has no browser driver. Rerun guidance below.

### Visual verification (executed via Playwright MCP, not deferred)

Ran `npm -w @cmsmasters/studio run dev` (port 5173) + `npm -w @cmsmasters/api run dev` (wrangler on port 8787) in background; drove the browser with `mcp__playwright__*` tools at 1440×900 viewport. Screenshots stored in `logs/wp-027/phase-1-screenshots/`.

**7-point walkthrough — all pass:**

| # | Check | Evidence | Status |
|---|---|---|---|
| 1 | Block editor loads → Editor tab active by default | `wp027-p1-check-01-editor-tab-default.png` — "Editor" semibold + 2px border-bottom; "Responsive" muted; Basic Info form below | ✅ |
| 2 | 2-tab bar rendered between top-bar buttons and 2-column body (mirrors theme-meta.tsx style) | same screenshot — tab bar between "Import HTML / Process / Preview / Export" row and "Basic Info" accordion | ✅ |
| 3 | Existing Editor UI unchanged: top-bar buttons, FormSection accordions, Save footer | same screenshot — Import HTML / Process (disabled on empty) / Preview (disabled) / Export (disabled); Basic Info expanded, Code / Animation / Advanced collapsed; footer "No changes" + "Create Block" (disabled) | ✅ |
| 4 | Click Responsive → body disappears, placeholder appears, **Save footer STAYS at bottom** | `wp027-p1-check-02-responsive-tab-placeholder.png` — "Responsive" active; placeholder text "Responsive tab — WP-027 Phase 1 scaffold. Preview triptych + suggestions land in Phase 2/3."; footer still reads "No changes" with disabled Create Block | ✅ |
| 5 | Fill Name field ("WP-027 smoke test") on Editor → footer changes to "Unsaved changes" + Create Block ENABLED | `wp027-p1-check-03-editor-dirty.png` — Name + Slug auto-generated "wp-027-smoke-test"; slug shown in top-bar; footer reads "Unsaved changes"; Create Block is dark/enabled | ✅ |
| 6 | Switch to Responsive with dirty form → **Save footer STILL reads "Unsaved changes"** + Create Block ENABLED (Fix 5 load-bearing contract) | `wp027-p1-check-04-responsive-dirty-cross-tab.png` — Responsive tab active, body swapped to placeholder, footer unchanged: "Unsaved changes" + enabled Save button visible from Responsive tab | ✅ |
| 6b | Switch back to Editor → Name + Slug values preserved (RHF state stable across tab swap) | `browser_evaluate` readout: `[{placeholder: "Block name", value: "WP-027 smoke test"}, {placeholder: "auto-generated-slug", value: "wp-027-smoke-test"}]` — both inputs retained after Responsive → Editor round-trip | ✅ |
| 7 | Process button flow unchanged (hard gate) — paste `<div class="demo"><h1>Test</h1></div>` into Code textarea, click Process | `wp027-p1-check-05-process-panel-open.png` — BlockImportPanel renders as full-surface overlay: "Process Block — 0 suggestions, 0 enabled" header + ORIGINAL (preview shows "Test") / PROCESSED (preview shows "Test") / Token Suggestions (0) columns + Export HTML / Cancel / Apply & Close actions | ✅ |

**Bonus verifications (not in original 7-point list):**

| Check | Evidence | Status |
|---|---|---|
| `beforeunload` dialog fires when navigating away with dirty form | Attempted navigation to `/blocks` with dirty state → browser dialog raised (`Modal state: ["beforeunload" dialog with message ""]`); handled via `browser_handle_dialog` accept=true | ✅ existing guard preserved |
| Real DB block loads via `updateBlockApi` through Hono → tab-bar renders identically | `wp027-p1-check-06-real-block-editor-tab.png` — loaded "fast loading speed" (`/blocks/1cbfccdf-927a-43e1-a2b7-0605dc2be954`); Name pre-filled, slug read-only, all top-bar buttons enabled; footer shows "No changes" + "Delete" (red) + "Save Changes" (disabled) | ✅ |
| Real DB block → click Responsive → placeholder + footer unchanged | `wp027-p1-check-07-real-block-responsive-tab.png` — Responsive active; placeholder visible; footer + Delete + Save Changes still at bottom | ✅ |

**Observations worth noting:**

- Full-page screenshots show a small black floating circle at bottom-right corner — that's the **Agentation dev widget** (`<Agentation endpoint="http://localhost:4747" />` at `apps/studio/src/app.tsx:60`, dev-only, `process.env.NODE_ENV === 'development'`). It partially overlays the "Save Changes" / "Create Block" button text in screenshots but does NOT touch production builds. Not a Phase 1 regression.
- Process panel renders as a **full-surface overlay**, not a right-hand side panel as the Phase 1 task prompt's language implied. This is the pre-existing Studio behavior (unchanged by Phase 1) — `showProcess` gates a `<BlockImportPanel>` that occupies the main content area when open. Hard gate still holds: the Process button's state, handler, and panel JSX are byte-identical to pre-Phase-1.
- Console errors during the smoke (28+ errors logged by Playwright) trace to: (a) `AGENTATION_CLIENT` connection attempts to `:4747` (no agentation server running in this smoke — irrelevant); (b) the initial `Failed to fetch` on `/blocks` list before Hono API started. Neither originates in WP-027 Phase 1 code paths.

**Conclusion:** all AC items Phase 1 is responsible for are structurally AND visually verified green. Cross-tab dirty-state contract (Fix 5) is confirmed load-bearing and intact. No regressions in Process / Preview / Save / beforeunload / Delete surfaces.

---

## Deviations / Plan Corrections

**Single mid-phase deviation — DS token fix on ResponsiveTab placeholder:**

The task prompt's Task 1.4 template (L179–191) literally specified:
```tsx
<div style={{ padding: '24px' }}>
  <p style={{ color: '#666' }}>
    Responsive tab — WP-027 Phase 1 scaffold.
    Preview triptych + suggestions land in Phase 2/3.
  </p>
</div>
```

Pre-commit `lint-ds` (per CLAUDE.md "STRICT: No Hardcoded Styles") rejected `color: '#666'` as a hardcoded hex. First commit attempt failed; replaced with:
```tsx
<div style={{ padding: 'var(--spacing-xl)' }}>
  <p style={{
    fontSize: 'var(--text-sm-font-size)',
    color: 'hsl(var(--text-muted))',
    margin: 0,
  }}>
```

No functional impact. **Plan correction:** Task 1.4 template in the task prompt should use semantic tokens for the placeholder. Applying this post-hoc in the result log rather than amending the committed task prompt (prior commit `afb365a4` stays as historical record).

---

## Carry-overs for Phase 2

- **Vitest's `css: true` setting (1.2) becomes load-bearing** for Phase 2's `preview-assets.test.ts` `?raw` CSS import assertions.
- **`preview-assets.ts` stub comment** already names the 6-level source path: `'../../../../../../packages/ui/src/theme/tokens.css?raw'`. Phase 2 replaces with the real 4 imports (tokens / tokens.responsive / portal-blocks / animate-utils) + `composeSrcDoc({ html, css, width })` export.
- **Path B for variant composition** (Key Decisions table L107 of workplan): `renderForPreview(block, { variants: variantList })` — single call, engine absorbs composeVariants internally. DB→engine conversion: `Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))`.
- **`.slot-inner` bypass trap** (app-portal SKILL + Phase 0 §0.1 + PARITY.md): Phase 2.6 manual parity check MUST use a composed-page block (`apps/portal/app/[[...slug]]/page.tsx`), NOT a theme-page slot block (`apps/portal/app/themes/[slug]/page.tsx:189` `.slot-inner` sits outside `[data-slot]` so `container-type` doesn't apply — variant-bearing blocks in slot-closure render differently in portal vs Studio preview iframe).
- **Block prop wiring** (Phase 2): `ResponsiveTab.tsx` will gain a `block: Block | null` prop (or read from `block-editor.tsx` form state via `form.getValues()` / `useWatch`). Today's placeholder takes no props. Phase 2 decides the prop shape.
- **Sandbox attribute order:** standardize on `"allow-scripts allow-same-origin"` (WP-026 order; recorded in PARITY.md Studio-specific deviation §3). Do NOT mirror `apps/studio/src/components/block-preview.tsx`'s `"allow-same-origin"` — block-preview.tsx stays untouched per hard gate.

---

## Ready for Phase 2

**Phase 1 output summary:**
- 2-tab bar live in block-editor.tsx (pattern from theme-meta.tsx); Editor tab zero-behavior-change.
- Save footer always-visible below both tabs → Phase 4 will feed RHF's `formState.isDirty` without touching the footer JSX.
- `session-state.ts` pure state machine (true mirror of WP-026 session.ts minus backedUp/lastSavedAt); 16 unit tests green.
- 7 placeholder source files + 3 stub test files scaffold the `responsive/` subtree.
- `PARITY.md` seeded with sibling cross-ref + 5 Studio deviations + cross-contract parity notes.
- Vitest + jsdom + @testing-library/react bootstrapped in Studio; `css: true` set for `?raw` CSS imports.
- Manifest registered (12 new `owned_files` + `pkg-block-forge-core` import); arch-test 489/0.

**Phase 2 can start on:**
- Real `preview-assets.ts` with 4 `?raw` imports + `composeSrcDoc` (6-level paths per carry-over (f)).
- `PreviewPanel.tsx` with iframe + ResizeObserver + postMessage height sync.
- `ResponsivePreview.tsx` with 3-panel triptych (1440 / 768 / 375) + Path B variant composition.
- `ResponsiveTab.tsx` wired to receive a `Block` prop from existing block-editor form state.
- `preview-assets.test.ts` contract tests (file stub already exists — replaces `describe.skip`).
- PARITY.md finalization + manual composed-page parity check.

No known blockers. Engine calls, save wiring, and accept/reject remain out-of-scope (Phases 3 & 4).
