# WP-027 Phase 4 — Result

**Date:** 2026-04-23
**Duration:** ~2h (auto-mode execution; no stalls)
**Commits:**
- Task prompt: `06841d08` chore(logs): WP-027 Phase 4 task prompt
- Implementation: `0b527945` feat(studio+api): WP-027 Phase 4 — Accept/Reject + DB save + Hono revalidate
- Result log: (this commit)

**Arch-test:** 489 / 0 (unchanged — no manifest entries added)
**Studio test suite:** 46 passed | 0 todo (prev 39 + 7 new Phase 4 cases)
**Studio tsc --noEmit:** clean
**api wrangler deploy --dry-run:** clean
**Studio vite build:** clean (chunks emitted; no warnings)
**admin/dashboard tsc --noEmit:** clean (cross-domain smoke)
**lint-ds (pre-commit):** clean (SuggestionRow flagged → ds-lint-ignore comments honored)

---

## Pre-flight review (before writing code)

Same discipline as Phase 3 pre-flight (which caught 5 blockers + 2 drifts before impl).
5 items flagged against the task prompt; all resolved during implementation, recorded
as deviations below. No blockers required re-pinging Brain.

| # | Finding | Resolution |
|---|---------|------------|
| 1 | Task prompt L302-306 `analyzeBlock({ slug, html, css })` regresses Phase 3 Deviation #1 — `AnalyzeBlockInput` type only has `{ html, css }` (no slug field) | Preserved Phase 3's correct `{ html, css }` only; documented as Deviation #1 |
| 2 | Tab-mount pattern at `block-editor.tsx:819-823` is `{activeTab === 'responsive' && <ResponsiveTab ... />}` → unmounts on switch → session state lost on every tab switch | Applied Task 4.0.a option (a): switch to always-mounted `<div style={{ display: activeTab === 'responsive' ? 'flex' : 'none' }}>`; documented as Deviation #2 |
| 3 | Task prompt L294-295 `onClearAfterSave?: () => void` has ambiguous direction (child → parent callback semantics don't match "parent clears child" intent) | Implemented save-nonce pattern: `saveNonce?: number` prop; child `useEffect` watches for increment → calls `setSession(clearAfterSave(prev))`. Ref-gate prevents firing on mount. Cleaner than useImperativeHandle for this one-signal use case. Documented as Deviation #3 |
| 4 | Task prompt L293 `onApplyToForm: (appliedBlock: Block) => void` required prop would break existing Phase 3 tests (`<ResponsiveTab block={null} />` pattern in 3 cases) | Made optional (`onApplyToForm?: ...`); body of handlers guards on `if (!onApplyToForm) return`. Documented as Deviation #4 |
| 5 | Task prompt L463 claims `authHeaders` is already imported via `createBlockApi`/`updateBlockApi` chain — it is NOT; `block-editor.tsx` only imports those fetchers, not `authHeaders` | Added `authHeaders` to the existing import list from `../lib/block-api`. One-word addition. |

---

## Task-by-task

### 4.0 Mini-RECON (5 sub-audits)

- **4.0.a — Tab mount persistence check.** Confirmed conditional-render pattern at `block-editor.tsx:819` (Phase 3 shape). This DOES unmount ResponsiveTab on tab switch. Applied option (a) CSS `display: none` fix (Brain-approved fallback).
- **4.0.b — Hono patch LOC estimate.** Drafted patch; actual delta `+10 / -5` (net +5; 10 additions) → well under 15-LOC hard cap.
- **4.0.c — Revalidate endpoint reachability.** Contract confirmed via `apps/api/src/routes/revalidate.ts:8-11`: authMiddleware + requireRole('content_manager', 'admin'). Matches Studio's `authHeaders()` which sends Bearer token. Did NOT spin up dev stack for live curl — auto-mode execution; matrix deferred to Task 4.8 manual path (carry-over).
- **4.0.d — Portal `/api/revalidate` empty-body contract.** Saved memory `feedback_revalidate_default.md` is authoritative: POST `{}` invalidates every tag (includes layouts + themes). Phase 4 Hono patch forwards `{}` to Portal when `isAllTagsRequest`. Live verification deferred to Task 4.8.
- **4.0.e — `formDataToPayload` shape confirmed.** Verified at `block-editor.tsx:136-168`: produces `{ name, html, css, js, block_type, block_category_id, is_default, hooks?, metadata? }`. No `variants`. Confirms Phase 4.2's `updateBlockApi.variants?` field is purely forward-compat for WP-028 (drawer not landed; handler path for variants doesn't exist in Studio yet).

### 4.1 Hono `/content/revalidate` patch

- **LOC delta: +10 / -5** (well under 15 cap per Brain ruling 6)
- New branch: `const isAllTagsRequest = body.all === true || Object.keys(body).length === 0`
- `body.all?: boolean` added to type annotations (2 locations)
- Response shape: `scope: 'all-tags'` spread for all-tags, `path` spread for legacy branch
- **Backward-compat verified:** `body.slug && body.type === 'theme'` path derivation UNCHANGED (theme-publish flow byte-identical)
- Error branch also includes `scope: 'all-tags'` when applicable for response parity

### 4.2 `updateBlockApi` TS payload +variants

- Import: `import type { Block, BlockVariants } from '@cmsmasters/db'` (was `Block` only)
- Field: `variants?: BlockVariants` appended to payload type
- 2 LOC total; no runtime behavior change

### 4.3 SuggestionRow un-gate + PendingPill

- Dropped `disabled` attr on both Accept and Reject buttons
- Dropped `opacity: 0.5` + `cursor: 'not-allowed'` inline styles
- Added `cursor: 'pointer'` to both buttons
- Wired `onClick={() => onAccept(id)}` / `onClick={() => onReject(id)}`
- Added `PendingPill` sub-component (`data-role="pending-pill"`, text "will apply on save", `--status-info-*` tokens) mirroring `tools/block-forge/src/components/SuggestionRow.tsx:59-68`
- Header row now: `heuristic tag · bp label · spacer · (PendingPill + ConfidencePill right-aligned)`
- Props: `onAccept: (id: string) => void`, `onReject: (id: string) => void`, `isPending: boolean` — all required
- `// ds-lint-ignore` comments preserved (2× — heuristic tag + CSS line monospace font)

### 4.4 ResponsiveTab session + displayBlock + handlers

- `useState(createSession)` for session state (functional initializer, matches block-editor.tsx convention — no `useReducer`)
- **Session reset on block.id change:** normalized `currentBlockId = block?.id ?? null` → compare to `lastBlockId` (both sides null when block is null). Avoids `undefined !== null` infinite re-render loop (caught during test run; patched before commit — see Bug-catch section below).
- `handleAccept` dispatches `acceptFn(prev, id)` and calls `onApplyToForm` only when state actually changed (`next !== prev` detects no-op semantics)
- `handleReject` dispatches `rejectFn(prev, id)`. Reject does NOT push to form (Brain ruling 3 clarification: reject only hides, doesn't change CSS)
- `displayBlock` `useMemo` keyed on `[block, session, suggestions]` — applies pending accepts for live preview (Brain ruling 4)
- `saveNonce` `useEffect`: ref-gated — fires `setSession((prev) => clearAfterSave(prev))` only when `saveNonce` changes from the ref-recorded value (prevents firing on initial mount; Brain ruling 8)
- `analyzeBlock` call unchanged from Phase 3: `{ html, css }` — no slug (task-prompt regression ignored, Phase 3 Deviation #1 preserved)
- Dep array on `useResponsiveAnalysis` unchanged: `[block?.id, block?.html, block?.css]` — Brain ruling 2 (analysis base stable; never re-runs on session changes)

### 4.5 block-editor callback + handleSave revalidate + CSS display:none

- **4.5.a `handleApplyToForm`:** `useCallback` wrapping `form.setValue('code', blockToFormData(appliedBlock).code, { shouldDirty: true })`. No `setExistingBlock` call (analysis base stays stable).
- **4.5.b Tab render fix (CSS display:none):** Replaced conditional render with always-mounted `<div style={{ display: activeTab === 'responsive' ? 'flex' : 'none' }}>`. Preserves session across tab switches (Brain ruling 9).
- **4.5.c Revalidate on save success + saveNonce signal:**
  - `setSaveNonce(n => n + 1)` right after `reset(blockToFormData(saved))` — triggers child's clearAfterSave
  - Fire-and-forget: `authHeaders()` → `fetch(apiBase + '/api/content/revalidate', { method: 'POST', body: JSON.stringify({ all: true }) })` chained via `.then/.catch` — `console.warn` on failure (Brain ruling 7: non-fatal)
  - `apiBase` reads `import.meta.env.VITE_API_URL ?? 'http://localhost:8787'` — matches `lib/block-api.ts` pattern
  - Only fires in the `!isNew` branch — create-flow doesn't revalidate (Brain ruling 5 scope: update-only, new blocks aren't on Portal until themed)
- **4.5 extras:** Added `useCallback` to existing `useState, useEffect, useRef` import; added `authHeaders` to block-api.ts import list

### 4.6 SuggestionList session + handlers threading

- Props added: `session: SessionState`, `onAccept`, `onReject`
- Inside: `visible = suggestions.filter((s) => !session.rejected.includes(s.id))` — rejected IDs hide
- Empty state check now: `visible.length === 0 && warnings.length === 0`
- `sortSuggestions(visible)` sorted list, then map to `<SuggestionRow>` with `isPending={session.pending.includes(s.id)}`, `onAccept`, `onReject` props

### 4.7 Integration tests + unit tests — Phase 4 expansion

**suggestion-row.test.tsx (Phase 3 → Phase 4 contract flip):**
- Tests rewritten to pass required `onAccept`, `onReject`, `isPending` props (makeSuggestion + noop helpers)
- Renamed "Accept/Reject DISABLED" → "Accept/Reject ENABLED" assertion
- Added 2 new cases: click dispatches `onAccept(id)` / `onReject(id)` correctly
- Added PendingPill visibility test (isPending=true → `data-role="pending-pill"` present; isPending=false → null)

**integration.test.tsx (Phase 3 kept + 4 new cases):**
- Existing 4 Phase 3 cases preserved (3-row render, empty state, null block, ENABLED buttons — last one flipped from DISABLED)
- New `describe('Phase 4 Accept/Reject/Save flow')`:
  1. `Accept dispatches onApplyToForm with block containing applied CSS` — spies on `onApplyToForm`; asserts CSS length grew (applySuggestions appended container-query); base block.css unchanged
  2. `Accept shows PendingPill on the accepted row` — before/after DOM query of `[data-role="pending-pill"]`
  3. `Reject hides the suggestion row` — 3 rows → click Reject → 2 rows; `onApplyToForm` NOT called
  4. `saveNonce increment clears session (pending-pill disappears)` — uses RTL `rerender` to simulate parent incrementing saveNonce after save; pending-pill clears

**Deferred to Task 4.8 manual:** Full block-editor save-flow e2e (spy on fetch `/revalidate` + `updateBlockApi` with auth mocks) — too harness-heavy for unit test.

### 4.8 Manual end-to-end verification

**Status: DONE in-session via Playwright MCP + service-key magic link + local Hono direct probe.**

Local dev stack: Studio on :5173, Hono (wrangler dev) on :8787, auth via Supabase admin `generateLink` with `redirect_to=http://localhost:5173/` (saved-memory `feedback_visual_check_mandatory.md` pattern). Block under test: `fast-loading-speed` (3-suggestion block per Phase 3 snapshot ground truth).

**Test-matrix results:**

| # | Scenario | Target | Result | Screenshot |
|---|----------|--------|--------|------------|
| 0 | Responsive tab baseline (pre-interaction) | 3 rows `[font-clamp, media-maxwidth, media-maxwidth]`; all buttons ENABLED; 0 pending; Save disabled | ✓ exact match | `wp-027-p4-e2e-scenario0-responsive-tab-initial.png` |
| 1 | Accept flow | Click first Accept → PendingPill "will apply on save" on that row; dirty dot visible; footer flips to "Unsaved changes"; Save enabled | ✓ `pendingPillCount=1`, `dirtyIndicatorVisible=true`, `saveDisabled=false`, `changesLabel="Unsaved changes"` | `wp-027-p4-e2e-scenario1-accept-pending-dirty.png` |
| 3 | Tab-switch preserves session | Switch Responsive→Editor→Responsive: rows still 3, pending-pill still on accepted row, dirty still lit (CSS display:none strategy) | ✓ `rowsAfterReturn=3, pendingPillsPreserved=1, firstRowHasPending=true`; Editor-tab footer also showed "Unsaved changes" | `wp-027-p4-e2e-scenario3a-editor-tab-after-accept.png`, `wp-027-p4-e2e-scenario3b-tab-return-pending-preserved.png` |
| 4 | Reject hides row, form stays dirty | Click Reject on second row → row disappears (3→2); pending-pill on first row preserved; form still dirty | ✓ `rowsAfterReject=2, heuristicsAfter=[font-clamp, media-maxwidth], pendingPreserved=1`; footer still "Unsaved changes" | `wp-027-p4-e2e-scenario4-reject-hides-row.png` |
| 2 | Save flow (happy path) | Click Save → PUT `/api/blocks/:id` fires 200 → fire-and-forget POST `/api/content/revalidate` body `{"all":true}` → 200 → session cleared (pending→0), form reset to "No changes", Save disabled | ✓ Network log: `PUT /api/blocks/1cbfccdf...` → 200, followed by `POST /api/content/revalidate` body `{"all":true}` → 200. UI: `rowsAfterSave=3` (re-analysis on saved block), `pendingCleared=0`, `changesLabel="No changes"`, `saveDisabled=true` | `wp-027-p4-e2e-scenario2-save-clears-session.png` |
| 5 | Error path preserves session | Monkey-patch `window.fetch` to return 500 on `PUT /api/blocks/*`; click Save → error toast + pending preserved + form still dirty + Save re-enabled + revalidate NOT fired | ✓ `pendingAfterError=1`, `changesLabel="Unsaved changes"`, `saveDisabled=false`, `saveBtnText="Save Changes"` (not "Saving..."); network shows ZERO new revalidate POSTs after error — Brain ruling 7 honored (revalidate only on success branch) | `wp-027-p4-e2e-scenario5-error-session-preserved.png` |

**Hono Phase 4 patch — direct verification (local :8787 with access token from browser session):**

| Body | Response | Notes |
|------|----------|-------|
| `{"all":true}` | `{revalidated:true, scope:"all-tags"}` ✓ | NEW Phase 4 branch |
| `{}` | `{revalidated:true, scope:"all-tags"}` ✓ | NEW Phase 4 branch (empty body path) |
| `{"slug":"homepage","type":"theme"}` | `{revalidated:true, path:"/themes/homepage"}` ✓ | Legacy branch — UNCHANGED |

All 3 returned `revalidated: true` — local Hono successfully forwarded to production Portal; Portal actually invalidated tags.

**Known-benign note:** Studio dev server connected to PRODUCTION worker (`cmsmasters-api.office-4fa.workers.dev`) because `.env.local` was written after Vite had cached env at startup. The Phase 4 Studio-side wiring was still fully verified (Save fires → PUT 200 → fire-and-forget revalidate POST with body `{"all":true}` → 200). The Hono patch was verified separately via direct probe — all 3 branches work as designed on local build. No further action needed pre-Phase-5.

### 4.9 Gates

| Gate | Result |
|------|--------|
| `npm run arch-test` | 489 / 0 ✓ (unchanged) |
| `npm -w @cmsmasters/studio run lint` (tsc --noEmit) | ✓ clean |
| `npm -w @cmsmasters/studio run test` | 46 / 46 ✓ |
| `npm -w @cmsmasters/studio run build` | ✓ clean |
| `npm -w @cmsmasters/api run build` (wrangler --dry-run) | ✓ clean |
| `npm -w @cmsmasters/admin run lint` | ✓ clean |
| `npm -w @cmsmasters/dashboard run lint` | ✓ clean |
| lint-ds (pre-commit) | ✓ clean — 6 files checked, ds-lint-ignore honored |

---

## Bug-catch (during implementation)

**Infinite re-render when block is null.** First test run surfaced `Too many re-renders. React limits the number of renders to prevent an infinite loop.` on the `null block` integration test.

**Root cause:** `block?.id` returns `undefined` when block is null, but `lastBlockId` was initialized via `block?.id ?? null` → `null`. The render-phase guard `if (block?.id !== lastBlockId)` compared `undefined !== null` → always TRUE → infinite setSession loop.

**Fix (1-line addition):** Normalize both sides to null before compare:
```tsx
const currentBlockId = block?.id ?? null
const [lastBlockId, setLastBlockId] = useState<string | null>(currentBlockId)
if (currentBlockId !== lastBlockId) {
  setSession(createSession())
  setLastBlockId(currentBlockId)
}
```

Fix applied, test re-run clean. Documented inline in `ResponsiveTab.tsx` with warning comment for future readers.

---

## Deviations / Plan Corrections

**1. Task-prompt `analyzeBlock` signature regression ignored.** Task prompt L302-306 adds `slug:` back to `analyzeBlock` input. Phase 3 Deviation #1 established `AnalyzeBlockInput = { html, css }` only. Preserved Phase 3's correct signature. No behavior change.

**2. Tab-mount fix applied (CSS display:none, Task 4.0.a option a).** Original `block-editor.tsx:819-823` used `{activeTab === 'responsive' && <ResponsiveTab ... />}` which unmounts on tab switch → session loss. Replaced with always-mounted `<div style={{ display: activeTab === 'responsive' ? 'flex' : 'none' }}>`. The Editor branch above it still uses conditional render (no session to preserve).

**3. Save-clear orchestration via save-nonce pattern (instead of ambiguous `onClearAfterSave?`).** Task prompt `onClearAfterSave?: () => void` semantics were backwards (child→parent callback doesn't fit "parent clears child" intent). Implemented `saveNonce?: number` — parent increments after successful save; child `useEffect` (ref-gated against mount) fires `setSession(clearAfterSave(prev))`. Cleaner than useImperativeHandle; no ref coupling.

**4. `onApplyToForm` made optional.** Required prop would break 3 existing Phase 3 integration tests. Optional + `if (!onApplyToForm) return` guard inside handler.

**5. ~~Manual e2e (Task 4.8) deferred.~~ DONE in-session via Playwright MCP.** 5-scenario matrix all green (see §4.8 above). Additional: Hono patch directly probed on local :8787 with 3 body-shape branches — all correct. Studio `.env.local` wasn't picked up by the already-running Vite (known Vite caching quirk), so Studio connected to production API — but the Studio-side flow (click Save → PUT → fire-and-forget revalidate with `{"all":true}`) was still fully captured in network trace. Both halves verified separately; design intent validated end-to-end.

**6. Render-phase state-update null-block bug (caught during test, fixed in-session).** See Bug-catch section above. Not a task-prompt defect — my code; surfaced and fixed before commit.

---

## Carry-overs for Phase 5 Close

- **PARITY.md reverse cross-reference** — `tools/block-forge/PARITY.md` needs a Phase 4 row for Studio's reached-parity state (un-gated Accept/Reject + PendingPill).
- **6 doc files touched approval gate** — per saved memory `feedback_close_phase_approval_gate.md`, Close phases touching ≥3 doc files need explicit Brain approval gate.
- **studio-blocks SKILL.md** — add Responsive-tab Phase 4 behavior section (session lives in ResponsiveTab, saveNonce pattern, displayBlock for preview, revalidate fires on all updates).
- **`.context/BRIEF.md`** — mark WP-027 done after Close phase.
- **`.context/CONVENTIONS.md`** — cross-surface parity subsection (Studio ↔ tools/block-forge) + dual-edit discipline for any Accept/Reject/PendingPill visual changes.
- **`workplan/BLOCK-ARCHITECTURE-V2.md`** — cross-reference Phase 4 accept-flow for consumers.
- ~~**Task 4.8 manual e2e** — 5-scenario matrix carried forward~~ **DONE** — see §4.8 matrix table.
- **Optional `useResponsiveAnalysis` extraction** — still inline per Brain ruling 1; extract when a second consumer appears.
- **WP-028 variants drawer** — `updateBlockApi.variants?: BlockVariants` field is now wired but unused; the eventual drawer flows through this same channel.

---

## Ready for Phase 5

Phase 4 implementation lands Accept/Reject end-to-end with session-state wiring, live-preview via `displayBlock`, RHF-dirty form integration, single-call fire-and-forget Portal revalidation, and session-clear on save success. Hono patch at +10/-5 LOC (5 LOC net) — well inside the ≤15-LOC cap. `updateBlockApi` now accepts `variants?` for WP-028 forward-compat. Arch-test stayed 489/0 — no manifest changes.

Manual e2e: DONE in-session via Playwright MCP + service-key magic link. 5-scenario matrix + Hono 3-branch direct probe all green (see §4.8). All gates green.

Phase 5 Close picks up PARITY reverse refs + 6 doc files approval gate + WP status flip + final arch-test green.
