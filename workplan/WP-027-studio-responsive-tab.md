# WP-027: Studio «Responsive» tab — DB-backed authoring surface over block-forge-core

> New tab in Studio's block editor. Same core-engine wiring that `tools/block-forge/` proved in WP-026, but backed by Supabase (not the filesystem) and inside Studio's auth'd shell. Pick any DB block → 3-panel preview (1440 / 768 / 375) → accept/reject auto-rule suggestions → save via existing update mutation → on-demand revalidate. No tweak sliders, no variants drawer — those are WP-028.

**Status:** PLANNING
**Priority:** P0 — Critical path (last WP before WP-028 can open both authoring surfaces in parallel)
**Prerequisites:** WP-024 ✅, WP-025 ✅, WP-026 ✅
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 12–15 hours across 6 phases
**Created:** 2026-04-23
**Completed:** —

---

## Problem Statement

WP-026 proved the authoring UX against the filesystem: open a block JSON, see it at 1440/768/375, review suggestions from the core engine, save. That surface is great for the file-first crafting loop (`/block-craft` → `tools/studio-mockups/` → `tools/block-forge/` → import into Studio). It does nothing for blocks that are **already in the DB** — blocks that content managers maintain post-import, blocks whose metadata / hooks evolved after initial crafting, blocks where someone wants to add responsiveness without round-tripping through `/content-pull` + file edit + `/content-push`.

The natural home for that workflow is Studio's existing block editor. Authors already go there to edit `html` / `css` / `hooks` / `metadata`; responsive authoring belongs on the same page, one tab over. Doing it through Studio also picks up the pieces that `tools/block-forge/` skips by design — Supabase auth, RLS, audit logging, existing publish / revalidate plumbing.

The risk to manage is surface divergence. Two UIs on the same engine is the point (as ADR-025 and WP-026 agreed), but if they diverge on preview injection, suggestion ordering, save semantics, or the parity contract, authors will develop different mental models and eventually ship blocks that look fine in one surface and broken in the other. This WP uses WP-026 as the reference implementation — identical engine wiring, identical parity contract — and only changes the I/O substrate (filesystem → DB) and the shell (Vite app → Studio tab).

Why now: WP-024/025/026 is a complete vertical slice on files. Adding the DB surface here unblocks every Tweaks+Variants UI change in WP-028 to land in both places at once.

---

## Solution Overview

### Architecture

```
   Supabase                       apps/studio (existing Vite SPA, authenticated)
   ────────                       ────────────────────────────────────────────────
   blocks table             ────▶ existing block editor page
   (html, css, variants,          ├─ Tab: Basic (existing)
    hooks, metadata,              ├─ Tab: Process (existing — token scanner, R2 upload)
    ...)                          └─ Tab: Responsive (NEW — WP-027)
                                           │
                                           ▼
                                    ┌──────────────────────────────────────┐
                                    │  @cmsmasters/block-forge-core        │
                                    │    analyzeBlock()                    │
                                    │    generateSuggestions()             │
                                    │    applySuggestions()                │
                                    │    composeVariants()  ← display-path │
                                    │    renderForPreview()                │
                                    └──────────────────┬───────────────────┘
                                                       │
                    ┌──────────────────────────────────┼──────────────────────────────────┐
                    ▼                                  ▼                                  ▼
        ┌────────────────────┐            ┌───────────────────────┐            ┌────────────────────┐
        │ 3-panel preview    │            │ Suggestion list       │            │ Dirty-state banner │
        │  iframe 1440/768/  │            │  - rationale          │            │ (integrates with   │
        │  375               │            │  - confidence badge   │            │  existing Studio   │
        │  injects:          │            │  - Accept / Reject    │            │  unsaved-changes   │
        │   tokens.css       │            └───────────┬───────────┘            │  pattern)          │
        │   tokens.responsive│                        │                        └────────────────────┘
        │   portal-blocks.css│                        ▼
        │   animate-utils.js │              applySuggestions(block, accepted[])
        │   .slot-inner {    │                        │
        │    container-type: │                        ▼
        │    inline-size }   │              existing block update mutation
        │   composeVariants  │                        │
        │   on display when  │                        ▼
        │   variants present │                  Supabase write
        └────────────────────┘                        │
                                                      ▼
                                        existing /revalidate flow
                                        (Hono API → Portal ISR bust)

   ── What this WP does NOT contain (explicit non-scope) ───────────
     • Click-to-edit element tweaks / per-BP sliders   → WP-028
     • Variants drawer (fork / rename / delete)        → WP-028
     • A new shared React UI package                   → future polish (only if drift emerges)
     • Any new heuristic beyond the 6 from WP-025      → WP-029
     • Changes to tools/block-forge/ that shouldn't    → reject
       also ship to Studio (or vice versa)
```

### Phase 0 RECON Amendments (2026-04-23, post-recon)

Recon (`logs/wp-027/phase-0-result.md`) revealed that several plan assumptions were wrong. Brain-approved amendments:

1. **No pre-existing tab system in block-editor.tsx.** Ruling: **Option A' — 2-tab bar, not 3.** Tab 1 = "Editor" (all current top-bar buttons incl. Process + 2-column body + Save — **zero behavior change**). Tab 2 = "Responsive" (new). ~40 LOC bespoke tab row mirroring `theme-meta.tsx` pattern. Process button stays exactly as today.
2. **Domain ownership = `studio-blocks`, not `studio-core`.** Manifest already owns `block-editor.tsx` in `studio-blocks`. `studio-blocks` SKILL status: **`full`** → no +6 flip in Phase 5 Close.
3. **Variant composition path = Path B.** `renderForPreview(block, { variants: list })` — engine absorbs `composeVariants` internally; one function call fewer in consumer code.
4. **Revalidate = Option 2 with scope caps (Phase 4 only).** Extend Hono `/api/content/revalidate` to accept `{ all: true }` body and forward `{}` to Portal for all-tags invalidation. **Hard cap: ≤15 LOC Hono patch.** Phase 4 mini-RECON confirms cross-domain ownership of `apps/api/src/routes/revalidate.ts` before editing. Frontend call: `fetch(apiUrl + '/api/content/revalidate', { method: 'POST', headers: authHeaders, body: JSON.stringify({ all: true }) })` — fire-and-forget, non-fatal, toast on failure.
5. **Phase 1 scope grew to ~3–4h (was ~2h).** Added: (a) vitest setup from scratch (Studio has no vitest today — outcome j3); (b) `@cmsmasters/block-forge-core` dep add to `apps/studio/package.json`; (c) tab-bar scaffold in block-editor.tsx. Kept as one coherent phase — do NOT split.
6. **Arch-test target = 489/0.** Baseline 477 + 8 source files + 4 test files = 12 owned_files (pkg-block-forge-core precedent: tests count in owned_files). Original plan said "+8"; corrected.
7. **Phase 2.6 parity check MUST use a composed-page block, not a theme-page slot block** — `apps/portal/app/themes/[slug]/page.tsx:189` `.slot-inner` bypass is a live forward-risk (see app-portal SKILL).
8. **`?raw` path depth: 6 `..` from source, 7 `..` from tests** (recorded in carry-over (f)).

The sections below were **authored pre-recon** and contain the superseded assumptions. Where they conflict with amendments above, **amendments win.** Explicit row-level patches are threaded through Key Decisions / Domain Impact / Modified Files / Manifest Updates / Phase 1–5 below.

---

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|---|---|---|---|
| Surface location | New tab inside existing block editor route (`apps/studio/src/pages/block-editor.tsx`) | Authors already go there; single source of truth for a block's full lifecycle | Separate `/responsive-editor/:slug` route — adds navigation jump; sidebar panel — crams UI into a tight slot |
| Tab registration | **Add minimal 2-tab bar inside `block-editor.tsx`** (Option A' per Phase 0 amendment). Tab 1 = "Editor" (all current UI unchanged — incl. Process button + side panel), Tab 2 = "Responsive" (new surface). ~40 LOC bespoke bar mirroring `theme-meta.tsx`. | Phase 0 RECON confirmed no pre-existing tab system. Option A' preserves Process button UX verbatim — zero behavior change to existing surfaces | Refactor Process into a 3rd tab (Option A) — behavior change on live feature; side-panel drawer (Option B) — conflicts with Process slot; 5th FormSection accordion (Option C) — no room for 3-panel triptych |
| Engine consumption | Import from `@cmsmasters/block-forge-core` via workspace alias; use only the public entrypoint, treat Suggestion IDs as opaque per-analysis | Identical to `tools/block-forge/` — zero engine divergence | Re-analyze in the browser via a worker — premature; call the engine over HTTP — over-engineered for a pure function |
| UI components | **Reimplement** in Studio rather than share with `tools/block-forge/` via a `packages/block-forge-ui/` split | Copy-then-extract is cheaper than premature abstraction; two callers don't justify a new package yet; Studio uses different design primitives than `tools/block-forge/` | Extract now into `packages/block-forge-ui/` — adds a third manifest entry + test surface for unclear payoff; if genuine drift appears post-WP-028, extract in a targeted polish WP |
| Preview component | **New** `ResponsivePreview.tsx` specifically for this tab, not a refactor of existing `block-preview.tsx` | Touching `block-preview.tsx` risks regressions in Process panel and elsewhere. Scope is narrower with a dedicated component. If duplication becomes painful later, extract then | Refactor `block-preview.tsx` to cover both — too much blast radius for this WP |
| Preview token injection | Mirror `tools/block-forge/` Phase 2 contract exactly: `tokens.css` + `tokens.responsive.css` + `portal-blocks.css` + `.slot-inner { container-type: inline-size; container-name: slot }` + `animate-utils.js`; `@layer tokens, reset, shared, block` | Parity with WP-026 and with portal render. PARITY discipline applies identically | Tie to Studio globals — implicit coupling; skip responsive tokens — silent lie |
| Variant display | **Path B** — `renderForPreview(block, { variants: variantList })`. Engine internally calls `composeVariants` when `variants.length > 0`, identity otherwise. DB→engine conversion: `Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))` | One function call fewer than explicit compose→render; engine source supports either path (verified Phase 0 §0.6.a). Phase 2 codes against Path B | Path A — explicit `composeVariants(base, list)` then `renderForPreview(composed)`; functionally equivalent but two calls |
| Save path | Call `applySuggestions(block, accepted[])` → existing Studio `updateBlockApi` → **explicit** revalidate call (Studio save does NOT auto-revalidate per Phase 0 §0.7). No new API endpoint for save itself | Reuses existing plumbing; respects existing RLS and audit trail. Phase 4 adds `variants?: BlockVariants` to frontend TS payload type (backend already accepts it) | New `/blocks/:id/responsive-save` endpoint — unnecessary; direct Supabase write bypassing mutation — breaks audit |
| Revalidate scope | **Option 2 — extend Hono `/api/content/revalidate`** to accept `{ all: true }` (or bare `{}`) and forward empty body to Portal for all-tags invalidation. Hard cap: **≤15 LOC Hono patch.** Frontend fires `{ all: true }` after successful save, fire-and-forget, non-fatal | Browser can't call Portal `/api/revalidate` directly (secret exposure); saved memory `feedback_revalidate_default.md` describes Portal's endpoint — Studio reaches it through Hono middleman. Extension preserves secret posture + matches all-tags semantics | Option 1 — Hono forward path `'/'` only (revalidates just `/` — insufficient); Option 3 — forward tags (not wired today); Option 4 — per-theme reverse index (does not exist) |
| Dirty-state | **Outcome c1 — react-hook-form `formState.isDirty`** (canonical studio-core pattern). On Accept, Phase 4 calls `form.setValue('code', newCode, { shouldDirty: true })` — existing Save button + beforeunload + dirty indicator all fire unchanged. Session-state stays pure/in-memory for accept/reject bookkeeping; dirty-state lives in RHF | One source of truth; matches studio-core invariant "all editors use react-hook-form + zodResolver"; no parallel dirty system | Parallel dirty slice — confuses author about what's unsaved |
| Suggestion UX | Identical to WP-026: flat list ordered heuristic → selector → BP; rationale + confidence badge; per-suggestion Accept / Reject; no bulk-accept | Cross-surface consistency; same reasoning as WP-026 | Different UX — violates the ADR-025 single-authoring-mental-model principle |
| Domain assignment | **`studio-blocks`** — manifest already owns `block-editor.tsx` under this domain (`src/__arch__/domain-manifest.ts:290`). Domain slug description: "Block editor, import panel, CSS token scanner, token map — the processing pipeline." | Phase 0 §0.1 + §0.8 RECON: manifest is source of truth; `studio-blocks` owns the neighbor file. Adds `pkg-block-forge-core` to `studio-blocks.allowed_imports_from` | `studio-core` — original plan assumption; manifest contradicts it. `studio-blocks` is `status: full` (Phase-0-follow-up verified) → no +6 flip in Phase 5 |
| Session state scope | Per-block, in-memory for the duration the tab is mounted. Unmount = lose state (same as WP-026) | Matches Studio's existing behaviour on other tabs | Persist to DB or localStorage — adds state machine complexity with no author-visible benefit |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **studio-blocks** (existing) | Gains 12 new files under `apps/studio/src/pages/block-editor/responsive/**` (8 source + 4 tests). Gains a 2-tab bar inside `block-editor.tsx`. Integrates accept/reject → `form.setValue('code', …, { shouldDirty: true })` to feed existing RHF `formState.isDirty`. Gains `pkg-block-forge-core` in `allowed_imports_from` | `studio-blocks` slug is "the processing pipeline" — block editor + import panel + token scanner. All block-editor state reads via react-hook-form + zodResolver (studio-core invariant inherited) | Accidentally touching `block-preview.tsx` (owned by studio-core) — regresses Process panel, element thumbnails, picker modal previews; parallel dirty slice; bypassing RHF |
| **studio-core** (read-only impact) | No file ownership changes. `block-preview.tsx` remains in studio-core untouched. Dirty-state pattern convention (RHF `formState.isDirty`) inherited | Studio app shell + auth + CRUD layouts | Writing to studio-core from Phase 1–4 violates Q2 ruling |
| **pkg-block-forge-core** (WP-025) | Second read-only consumer. Same contract as WP-026 | Pure-function contract; never auto-applies; suggestion IDs opaque per-run | Assuming variant-handling in preview is free — must explicitly compose before render |
| **pkg-db** | No schema change. Reads `blocks.variants` (nullable JSONB, WP-024). Uses existing update mutation | types.ts is hand-maintained hybrid (WP-024 trap still live); never run `supabase gen types`; RLS applies | Treating `block.variants` as always-defined; forgetting nullable guard |
| **pkg-ui** | Read-only: `?raw` imports of `tokens.css`, `tokens.responsive.css`, `portal-blocks.css`, `animate-utils.js` — matches WP-026 injection contract | Tokens are Figma-synced; `tokens.responsive.css` is hand-maintained | Path drift between Studio `?raw` paths and `tools/block-forge/` — PARITY concern |
| **app-portal** | No code change. Consumed as the parity reference for preview fidelity | `BlockRenderer` RSC + `renderBlock()` helper semantics unchanged | Tab preview silently ahead/behind portal; same PARITY concern as WP-026 |
| **infra-tooling** / **tools/block-forge/** (WP-026) | Reference implementation. Any heuristic-UX change here must also apply to WP-026 (and vice versa) | Shared-behaviour contract: both surfaces expose the same engine identically | Divergence over time — caught at WP-028 if not earlier |

**Public API boundaries:**
- Studio's Responsive tab consumes: `@cmsmasters/block-forge-core` (public exports only), `@cmsmasters/db` (existing block read/update queries + `BlockVariant` / `BlockVariants` types), `@cmsmasters/ui` (tokens via `?raw`, existing design primitives for buttons/badges/banners), Supabase client (same instance already used by block editor)
- Nothing new is exported from Studio — this is a consumer-only change
- `allowed_imports_from` for `studio-blocks` currently = `['pkg-db', 'pkg-validators', 'pkg-api-client', 'pkg-ui', 'studio-core']` (Phase 0 §0.8). Phase 1 **must add** `'pkg-block-forge-core'` to that list (not present in either studio-core or studio-blocks today)

**Cross-domain risks:**
- **Surface drift between `tools/block-forge/` and Studio tab.** The main long-term risk. Mitigation: this WP's Phase 2 copies the preview-assets contract from `tools/block-forge/PARITY.md` verbatim and treats any Studio-specific deviation as a contract edit (same approval gate). Both PARITY docs get cross-referenced so future edits to either are prompted to propagate.
- **Existing Studio block editor regression.** A new tab that shares state with the editor can break Basic or Process tab behaviour if it touches the wrong hooks. Mitigation: Phase 0 audits the editor's state model; new tab reads block state from the same source-of-truth but holds session accept/reject state in its own slice.
- **Variant-handling mismatch.** This is the first Studio surface that end-to-end displays blocks with variants. If `composeVariants` + `renderForPreview` produce output the existing block-preview infra can't render (e.g. multiple `<style>` tags vs one), we'll discover it here. Phase 2 has an explicit test for this against a synthetic variant-bearing block.
- **Revalidate is absent today.** Phase 0 §0.7 confirmed Studio's `updateBlockApi` does NOT trigger `/revalidate`; block saves leave Portal stale until a human hits theme Publish or a full ISR cycle. Phase 4 adds an explicit call after `updateBlockApi` success via Hono middleman (Q3 Option 2). Accept/Reject happens in-memory only — only 1 revalidate per Save click, not per accept.

---

## What This Changes

### New Files

```
apps/studio/src/pages/block-editor/responsive/
  ResponsiveTab.tsx                             # top-level tab component — orchestrates preview + suggestions + save wiring
  ResponsivePreview.tsx                         # 3-panel triptych; injects the WP-026-equivalent @layer stack
  PreviewPanel.tsx                              # single iframe; ResizeObserver → postMessage height; scale-to-fit
  SuggestionList.tsx                            # flat ordered list of Suggestion rows
  SuggestionRow.tsx                             # one suggestion: rationale + confidence badge + Accept / Reject
  session-state.ts                              # per-block in-memory accept/reject/undo slice
  preview-assets.ts                             # ?raw imports + composeSrcDoc() — copied contract from tools/block-forge/
  PARITY.md                                     # preview injection contract; mirror of tools/block-forge/PARITY.md
  __tests__/
    session-state.test.ts
    preview-assets.test.ts                      # asserts @layer order exact; matches tools/block-forge/ contract
    suggestion-row.test.tsx                     # accept/reject dispatch; confidence badge rendering
    integration.test.tsx                        # fixture block + variants path → render → accept → save spy

.claude/skills/domains/studio-blocks/SKILL.md   # UPDATED (Close phase) — new section for Responsive tab

logs/wp-027/
  phase-0-result.md … phase-5-result.md
```

### Modified Files

```
apps/studio/src/pages/block-editor.tsx          # Phase 1: add 2-tab bar (Option A'); ~40 LOC bespoke bar
                                                 mirroring theme-meta.tsx pattern. Tab 1 = "Editor"
                                                 (all current UI unchanged), Tab 2 = "Responsive" (new)

apps/studio/package.json                        # Phase 1: add `@cmsmasters/block-forge-core: "*"` dep,
                                                 add vitest + @testing-library/react + jsdom devDeps
                                                 (versions mirror tools/block-forge verbatim),
                                                 add "test": "vitest run" + "test:watch": "vitest" scripts

apps/studio/vite.config.ts                      # Phase 1: add test: { css: true, environment: 'jsdom',
                                                 globals: true } block (saved memory
                                                 feedback_vitest_css_raw.md — `css: true` MANDATORY)

apps/studio/src/lib/block-api.ts                # Phase 4: add `variants?: BlockVariants` to updateBlockApi
                                                 payload type (one-line TS; backend already accepts)

apps/api/src/routes/revalidate.ts               # Phase 4: extend Hono handler to accept `{ all: true }` or
                                                 bare `{}` body; forward `{}` to Portal. Hard cap: ≤15 LOC.
                                                 Phase 4 mini-RECON verifies cross-domain ownership first

src/__arch__/domain-manifest.ts                 # Phase 1: studio-blocks.owned_files += 12 new paths
                                                 (8 source + 4 tests); studio-blocks.allowed_imports_from
                                                 += 'pkg-block-forge-core'

.claude/skills/domains/studio-blocks/SKILL.md   # UPDATED (Close) — Invariants / Traps / Recipes for the Responsive tab
tools/block-forge/PARITY.md                     # UPDATED (Close) — cross-reference to Studio tab PARITY
.context/BRIEF.md                               # UPDATED (Close) — mark WP-027 done; responsive authoring available in Studio
.context/CONVENTIONS.md                         # UPDATED (Close) — cross-surface parity contract pattern
workplan/BLOCK-ARCHITECTURE-V2.md               # UPDATED (Close) — diagram + reference to WP-027
```

No edits to `packages/block-forge-core/`, `apps/portal/`, `packages/ui/**`, `tools/block-forge/src/**`, or `apps/studio/src/components/block-preview.tsx`.

### Manifest Updates

```ts
// src/__arch__/domain-manifest.ts — append to studio-blocks.owned_files:
// Source files (8)
'apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx',
'apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx',
'apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx',
'apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx',
'apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx',
'apps/studio/src/pages/block-editor/responsive/session-state.ts',
'apps/studio/src/pages/block-editor/responsive/preview-assets.ts',
'apps/studio/src/pages/block-editor/responsive/PARITY.md',
// Test files (4) — pkg-block-forge-core precedent: tests count in owned_files
'apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts',
'apps/studio/src/pages/block-editor/responsive/__tests__/preview-assets.test.ts',
'apps/studio/src/pages/block-editor/responsive/__tests__/suggestion-row.test.tsx',
'apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx',

// studio-blocks.allowed_imports_from — current: ['pkg-db', 'pkg-validators', 'pkg-api-client', 'pkg-ui', 'studio-core']
// Phase 1 adds: 'pkg-block-forge-core'
```

**Arch-test target (Phase 1):** baseline 477 + 12 = **489 / 0**. No domain-count bump (studio-blocks exists). No +6 SKILL flip (studio-blocks is already `status: full` per Phase-0-follow-up).

### Database Changes

None.

---

## Implementation Phases

### Phase 0: RECON (~1.5h)

**Goal:** Confirm preconditions; map Studio's block editor tab system, save mutation, dirty-state pattern, and preview infra; pin the exact edit point for tab registration; verify variant-display path end-to-end on paper.

**Tasks:**
0.1. Read domain skills: `studio-core`, `pkg-block-forge-core`, `pkg-db`, `pkg-ui`, `app-portal`. Re-read `tools/block-forge/PARITY.md` and `tools/block-forge/README.md` for the exact injection contract to mirror.
0.2. **Map Studio's block editor structure.** Where does `block-editor.tsx` live? How are Basic / Process tabs registered? Is there a `TabBar` / `TabProvider` / router-based pattern? Exact file + line for the registration point goes in the Phase 0 log.
0.3. **Existing preview audit.** `apps/studio/src/components/block-preview.tsx` — does its current `@layer` + `?raw` contract already include `tokens.responsive.css` (added in WP-024 Phase 4.7)? Does it inject the `.slot-inner { container-type }` wrapper? Record what's there vs. what the WP-026 contract requires. If block-preview.tsx is short of the contract, Phase 2 builds the new `ResponsivePreview.tsx` with the full contract and **does not** touch block-preview.tsx.
0.4. **Save mutation audit.** `grep -rn "updateBlock\|block update" apps/studio/src/lib/ apps/studio/src/pages/block-editor*` — find the existing update path. Does it: (a) accept a full block payload, (b) include `variants` column per WP-024 schema, (c) trigger `/revalidate` automatically, (d) batch concurrent updates? Record answers; each informs the Phase 4 wiring.
0.5. **Dirty-state audit.** Does block-editor have a canonical "unsaved changes" signal (hook, store, context)? If yes, how do Basic and Process tabs plug in today? If no, Phase 4 must coordinate with user on whether to establish one first (scope creep risk; likely **defer** to a separate Studio UX WP).
0.6. **Variant-display path rehearsal on paper.** Given a block with `{ html, css, variants: { mobile: { html, css } } }` from DB, the Responsive tab must render the composed output. Confirm call shape: `composeVariants(base, [variants])` → `renderForPreview(composed)` → srcdoc. Phase 0 writes the expected call sequence so Phase 2 codes to it directly.
0.7. **Revalidate behaviour.** Confirm existing update mutation already calls `/revalidate` with the default-all-tags body (`{}`) per saved memory, OR that Studio has a dedicated publish step after save. This affects whether Phase 4 needs to add revalidate explicitly.
0.8. **Arch-test baseline.** `npm run arch-test` — record current count (after WP-026 close = 476/0). Grep again for any hardcoded domain-count assertions in `src/__arch__/`. Current domain count is 12 (WP-025 added `pkg-block-forge-core`); this WP doesn't add a domain so no bump needed.
0.9. **studio-core SKILL status.** Current status (skeleton / full / partial). Determines whether Phase 5 incurs the +6 arch-test bump on a status flip (per saved memory). If already `full`, no bump.
0.10. **Auth + RLS path.** Responsive tab reads/writes via the same Studio client that Basic/Process use; no new auth work. Verify quickly.
0.11. **Cross-surface PARITY review.** Read `tools/block-forge/PARITY.md` line-by-line; copy the exact contract into a draft for `apps/studio/src/pages/block-editor/responsive/PARITY.md` (to be seeded in Phase 2). Any deviation Studio requires (e.g. iframe sandbox flags different from tools/block-forge/) gets flagged as a Phase 0 carry-over.

**Verification:** `logs/wp-027/phase-0-result.md` with findings. Carry-overs for Phase 1:
  (a) exact tab-registration edit point (file + line)
  (b) existing save mutation signature + whether it auto-revalidates
  (c) dirty-state integration path (or explicit "defer dirty-state integration to followup WP")
  (d) block-preview.tsx current injection state (so Phase 2 knows what NOT to duplicate)
  (e) variant-display call sequence rehearsed on paper
  (f) `?raw` paths for tokens / responsive tokens / portal-blocks / animate-utils (from Studio's perspective)
  (g) domain-count / arch-test expectations
  (h) SKILL status flip implication for Close arch-test count
  (i) PARITY contract copied verbatim from tools/block-forge/ for seeding Phase 2

No code written.

---

### Phase 1: Studio bootstrap + tab scaffold + session-state primitives (~3–4h)

**Goal:** Responsive tab shows up in block-editor as an empty shell via 2-tab bar; session-state primitives exist and are unit-tested under new vitest setup; arch-test 489/0.

**Scope grew post-Phase-0** (see amendments block): original ~2h assumed vitest + block-forge-core dep already present; Phase 0 §0.12 found neither. This phase handles both setup items in addition to the scaffold.

**Tasks:**
1.1. **Studio dep add.** Edit `apps/studio/package.json`:
  - `dependencies`: `"@cmsmasters/block-forge-core": "*"`
  - `devDependencies`: `vitest`, `@testing-library/react`, `jsdom` — **use the exact versions from `tools/block-forge/package.json` devDependencies.** Read that file first and mirror verbatim (do NOT pick from memory; versions drift).
  - `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`
  - Run `npm install --prefer-offline` from repo root (or `cd apps/studio && npm install` if workspace root misbehaves).

1.2. **Vitest config.** Extend `apps/studio/vite.config.ts`:
  ```ts
  /// <reference types="vitest" />
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  export default defineConfig({
    plugins: [react()],
    envDir: '../..',
    test: {
      css: true,              // MANDATORY — saved memory feedback_vitest_css_raw.md
      environment: 'jsdom',
      globals: true,
    },
  })
  ```
  Verify `npm -w @cmsmasters/studio test` runs (empty test suite = pass).

1.3. **2-tab bar in `block-editor.tsx`.** Bespoke implementation mirroring `theme-meta.tsx` pattern:
  - `useState<'editor' | 'responsive'>('editor')` near existing state hooks
  - Render a tab row above the 2-column body (below top-bar buttons):
    - Tab 1 label "Editor" — active when `tab === 'editor'`
    - Tab 2 label "Responsive" — active when `tab === 'responsive'`
  - Wrap **ONLY the 2-column body** (left form + right side-panel slot) in `{tab === 'editor' && (<>…</>)}`. Keep the Save footer **OUTSIDE** the conditional — it stays always-visible so dirty state + Save button remain reachable from the Responsive tab. See Task 1.3 of the Phase 1 task prompt for the anti-trap rule.
  - Render `<ResponsiveTab />` when `tab === 'responsive'`
  - **Zero behavior change to Editor tab** — Process button, side panel toggle, preview popup all remain wired as today.
  - ~40 LOC total.

1.4. Create `apps/studio/src/pages/block-editor/responsive/` subtree with placeholder contents:
  - `ResponsiveTab.tsx` — `export function ResponsiveTab() { return <div>Responsive tab — WP-027 Phase 1 scaffold</div> }` (Phase 2 replaces with preview triptych + suggestion list)
  - `ResponsivePreview.tsx` / `PreviewPanel.tsx` / `SuggestionList.tsx` / `SuggestionRow.tsx` / `preview-assets.ts` — empty-export TODO stubs (`export {}` with a `// TODO: Phase N` comment)
  - `PARITY.md` — seed from Phase 0 carry-over (i) verbatim + 5 Studio deviations (listed Phase 0 §0.11)

1.5. **`session-state.ts`** — pure state machine (**true mirror** of `tools/block-forge/src/lib/session.ts`, minus file-I/O `backedUp` + `lastSavedAt`): `{ pending: string[], rejected: string[], history: SessionAction[] }`. Pure transition functions `accept / reject / undo / clearAfterSave / isActOn / pickAccepted / isDirty`; `accept`/`reject` are no-ops if id is in **EITHER** set (not cross-set toggles); unbounded history; `isActOn` returns **boolean**. No React hook layer — Phase 4 consumes via `useReducer` inline in `ResponsiveTab`. See Task 1.5 of the Phase 1 task prompt for the full spec.

1.6. **`__tests__/session-state.test.ts`** — ~16 cases mirroring `tools/block-forge/src/__tests__/session.test.ts` (16th verifies unbounded history): accept transitions, reject transitions, undo history ordering, clearAfterSave, no-op-on-either-set for accept and reject, history preserves insertion order, isActOn boolean contract, pickAccepted filter + order preservation, isDirty boolean.

1.7. **Manifest register.** Append 12 owned_files to `studio-blocks` in `src/__arch__/domain-manifest.ts`. Add `'pkg-block-forge-core'` to `studio-blocks.allowed_imports_from`.

1.8. Green gates (see Verification).

**Verification:**
```bash
npm run arch-test                                  # green, count = 489 / 0
npm -w @cmsmasters/studio test                     # session-state.test.ts passes, no other tests yet
npm -w @cmsmasters/studio run dev                  # open block editor → 2-tab bar visible;
                                                   # Editor tab = identical to today;
                                                   # Responsive tab = placeholder text
npm run typecheck                                  # clean
```

**Explicit non-goals this phase:**
- No `?raw` imports yet (Phase 2)
- No iframe preview (Phase 2)
- No engine calls (Phase 3)
- No save wiring (Phase 4)

---

### Phase 2: ResponsivePreview + token injection + variant-display (~3h)

**Goal:** Select any block (including one with variants) → 3-panel triptych renders at 1440/768/375 with the full WP-026 injection contract. Variant-bearing blocks compose before render. Byte-identical preview for non-variant blocks vs. portal render.

**Tasks:**
2.1. `preview-assets.ts` — `?raw` imports of `tokens.css`, `tokens.responsive.css`, `portal-blocks.css`, `animate-utils.js` using the Studio-side paths from Phase 0 carry-over (f). Export `composeSrcDoc({ html, css, width })` with identical `@layer tokens, reset, shared, block` ordering and identical `.slot-inner { container-type: inline-size; container-name: slot }` wrapper as `tools/block-forge/`.
2.2. `__tests__/preview-assets.test.ts` — assert @layer order exact, slot wrapper present with container-type, width reflected in body width, script escaping safe. Mirror `tools/block-forge/` tests so the two contracts stay synchronized.
2.3. `PreviewPanel.tsx` — iframe with srcdoc; ResizeObserver → postMessage height; scale-to-fit if iframe wider than available pane.
2.4. `ResponsivePreview.tsx` — three `PreviewPanel`s at 1440 / 768 / 375. Receives a `Block` prop. **Path B (Phase 0 amendment):**
  ```ts
  const variantList: Variant[] = block.variants
    ? Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))
    : []
  const preview = renderForPreview(
    { slug: block.slug, html: block.html, css: block.css ?? '' },
    { variants: variantList },
  )
  // preview.html already has data-block-shell + data-variant wrappers when variants present
  // preview.css already has variant-scoped rules + @container reveal rules
  ```
  Then pass `{ html: preview.html, css: preview.css, width: 1440|768|375 }` to each `PreviewPanel`.
2.5. `PARITY.md` — finalize from Phase 1 seed (Phase 0 carry-over (i) + 5 deviations). Cross-reference `tools/block-forge/PARITY.md`.
2.6. **Manual parity check — composed-page block only** (Phase 0 carry-over (d) trap). Pick one published non-variant block rendered via `apps/portal/app/[[...slug]]/page.tsx` (composed page), NOT via `apps/portal/app/themes/[slug]/page.tsx` (theme page has known `.slot-inner` bypass at L189, per app-portal SKILL forward-risk). Compare Studio Responsive tab 1440 preview computed styles against portal render. Byte-identical for block subtree.
2.7. Synthetic variant test: construct a block payload in integration fixture with `{ variants: { mobile: { html, css } } }`. Assert preview srcdoc for each panel contains both `data-variant="base"` and `data-variant="mobile"` wrappers, and that at 375 the `@container` rule reveals the mobile variant (via DOM inspection after load).

**Verification:**
```bash
npm -w @cmsmasters/studio test                    # preview-assets + variant composition green
# Manual: dev server → pick a published block → DevTools on iframe
#   → .slot-inner has container-type: inline-size
#   → @layer order correct
#   → --space-section / --text-display resolve from tokens.responsive.css
# Manual: pick a synthetic block with variants → inspect srcdoc → confirm both variants inlined
```

---

### Phase 3: Core engine integration + suggestion list (~2h)

**Goal:** Selecting a block runs `analyzeBlock` + `generateSuggestions`; list renders identically to `tools/block-forge/`. Display only — Accept/Reject disabled until Phase 4.

**Tasks:**
3.1. Hook (`useResponsiveAnalysis(block)`): runs `analyzeBlock` + `generateSuggestions` on the current block; memoizes on `{ html, css, variants }` identity; surfaces `warnings[]` + `suggestions[]`.
3.2. `SuggestionList.tsx` — ordered by heuristic → selector → BP. One `SuggestionRow` per suggestion.
3.3. `SuggestionRow.tsx` — heuristic name, selector, BP, rationale, confidence badge (`high` / `medium` / `low`), disabled Accept / Reject pair. Use Studio's existing design system primitives (buttons, badges). If a badge variant is missing, use the closest existing one; no new pkg-ui changes in this WP.
3.4. Warnings path — banner above the list if core returns warnings.
3.5. `__tests__/suggestion-row.test.tsx` — confidence badge renders correctly for each level; Accept/Reject buttons are disabled (Phase 3 state); rationale text visible.
3.6. `__tests__/integration.test.tsx` — fixture strategy per Brain ruling:
  - **Reuse WP-025 frozen fixtures via long `?raw` path** (7 `..` from tests — Phase 0 carry-over (f)):
    ```ts
    import blockSpacingFontHtml from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
    import blockSpacingFontCss  from '../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'
    ```
  - **Synthesize ONE variant-bearing block inline** for the variant-display test — engine has no variant-bearing fixture yet; the synthesis is the Studio-display contract not the heuristic contract.
  - Render `ResponsiveTab` with the fixture-shaped block; assert suggestion count + content.
  - **Snapshot-as-ground-truth trap (saved memory `feedback_fixture_snapshot_ground_truth.md`):** before asserting `expect(suggestions).toContain(...)`, cross-reference `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` for authoritative behaviour on that fixture. Fixture filename is aspirational; snapshot is authority.

**Verification:**
```bash
npm -w @cmsmasters/studio test                    # suggestion-row + integration green
# Manual: dev server → pick block with known heuristic triggers (spacing/font)
#   → list shows suggestions; Accept/Reject disabled
# Manual: pick block-plain-copy (sidebar-perfect-for) → list shows empty-state
```

---

### Phase 4: Accept / Reject + DB save + Hono revalidate patch (~3–4h)

**Goal:** Accept / Reject enabled; Save triggers `applySuggestions` → `updateBlockApi` (with variants TS fix) → explicit revalidate via Hono `{ all: true }`; RHF `formState.isDirty` drives existing Save button.

**Tasks:**
4.0. **Mini-RECON (first 15 min).** Verify domain ownership of `apps/api/src/routes/revalidate.ts` in `src/__arch__/domain-manifest.ts`. Confirm the domain's `allowed_imports_from` + public entrypoints allow the edit. If cross-domain edit is blocked (e.g. revalidate.ts owned by domain that studio-blocks can't touch) → STOP, surface to Brain. Also grep the current file contents to estimate LOC delta for the ≤15 cap. Record in phase-4-result.md carry-over.

4.1. **TS payload type fix** — edit `apps/studio/src/lib/block-api.ts` `updateBlockApi` payload type:
  ```ts
  updateBlockApi(id: string, payload: {
    name?: string
    html?: string
    css?: string
    hooks?: Record<string, unknown>
    metadata?: Record<string, unknown>
    variants?: BlockVariants  // ← NEW; backend schema already accepts (Phase 0 §0.4)
  })
  ```
  One-line change + import of `BlockVariants` type.

4.2. **Hono endpoint extension** — edit `apps/api/src/routes/revalidate.ts` to accept `{ all: true }` or bare `{}` body:
  - Branch: if body has `all === true` OR body is `{}` → forward `{}` to Portal (triggers all-tags invalidation per `feedback_revalidate_default.md` Portal semantics)
  - Keep existing `{ slug, type }` branch untouched for theme Publish backward compat
  - **Hard cap: ≤15 LOC added.** If the patch grows (e.g. body validation, schema updates), surface to Brain before committing.

4.3. Enable Accept / Reject in `SuggestionRow` — dispatches to reducer over `session-state.ts`. Visual: rejected disappears; accepted gets pending badge + stays visible.

4.4. **Dirty-state integration (Option A per Phase 0 §0.5).** On Accept:
  - Call `applySuggestions(block, [accepted])` in memory → derive new CSS
  - Compose block code: `form.setValue('code', newCodeString, { shouldDirty: true })` — makes existing Save button enable, beforeunload fire, dirty indicator light up
  - Session-state stores pending/rejected for UI state only; dirty-state is RHF's
  - NO parallel dirty system

4.5. **Save button wiring.** The existing Editor tab's Save button already reads `formState.isDirty`; when user clicks it:
  - Existing `handleSave` runs (unchanged) — fires `updateBlockApi` with current form values (which include the applied CSS from 4.4)
  - On `updateBlockApi` success, Responsive tab fires explicit `await fetch(apiUrl + '/api/content/revalidate', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ all: true }) })` — fire-and-forget; log warning on failure, don't block UI
  - Session state `clearAfterSave()` called; re-run analysis on updated block

4.6. Error path: `updateBlockApi` fails → RHF stays dirty (existing behavior); Studio's existing `useToast({ type: 'error', message })` fires from `handleSave`. No partial writes because nothing in Phase 4 bypasses the existing mutation.

4.7. Concurrency guard: Save button already `disabled={busy || !isDirty}` — double-click protection via React re-render on `setSaving(true)`. No new guard needed.

4.8. `__tests__/integration.test.tsx` — extend: load fixture block → accept one suggestion → assert RHF `isDirty === true` → invoke Save (spy on `updateBlockApi` + `fetch` for revalidate) → assert mutation called with applied CSS → assert revalidate called with `{ all: true }` body → assert session state cleared.

4.9. Manual end-to-end: on dev Supabase, pick a block → accept a spacing-clamp → Save → verify DB row updated (Studio SQL console or direct query) → verify portal page for a theme using this block re-renders with the new CSS after ~1s.

**Verification:**
```bash
npm -w @cmsmasters/studio test                    # integration end-to-end green
npm run arch-test                                  # green
# Manual: accept → Save → DB row has applied CSS → portal preview re-renders
# Manual: multiple tabs open — Basic tab's html/css fields reflect the new CSS after Save (coordination with Studio's block state)
```

---

### Phase 5: Close (~1h)

**Goal:** Docs propagate; approval gate holds; cross-surface parity contract is documented in both places.

**Tasks:**
5.1. CC reads all phase logs. Particularly checks Phase 2 parity result and Phase 4 dirty-state resolution.
5.2. Propose doc updates — 6 doc files → explicit approval gate per saved pattern (target 4/4 on gate):
   - `.context/BRIEF.md` — WP-027 done; Studio Responsive tab live; unblocks WP-028
   - `.context/CONVENTIONS.md` — subsection on "Cross-surface parity: preview injection contract lives in two PARITY.md files and must edit together"
   - `.claude/skills/domains/studio-blocks/SKILL.md` — new Responsive-tab section: Start Here files, Invariants (engine-only consumption, Path B composition, RHF isDirty integration, PARITY with tools/block-forge/), Traps (touching block-preview.tsx owned by studio-core, parallel dirty slice, variant-compose skipped for non-null variants, theme-page slot-block used for parity check), Blast Radius
   - `tools/block-forge/PARITY.md` — cross-reference the new Studio PARITY.md; note that any contract change here must also apply there
   - `apps/studio/src/pages/block-editor/responsive/PARITY.md` — finalize
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — cross-reference WP-027 and the dual-surface pattern
5.3. **Brain approves** (6 doc files → gate kicks in; pattern now 3/3 → 4/4 after this).
5.4. CC executes approved doc updates.
5.5. **SKILL flip: N/A.** Phase-0-follow-up verified `studio-blocks` SKILL `status: full` already. No +6 arch-tests from status flip this Close.
5.6. Final green:
   ```bash
   npm run arch-test                                 # green at 489 / 0 (no SKILL flip bump)
   npm run typecheck                                  # clean
   npm -w @cmsmasters/studio test                     # green
   npm -w @cmsmasters/studio run build                # clean
   ```
5.7. Flip WP status to `✅ DONE`, set Completed date.

**Files to update:**
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/studio-blocks/SKILL.md`
- `tools/block-forge/PARITY.md`
- `apps/studio/src/pages/block-editor/responsive/PARITY.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `logs/wp-027/phase-*-result.md`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Surface drift between Studio tab and `tools/block-forge/` | Authors develop diverging mental models; cross-surface bugs | Two PARITY.md files cross-referenced; Phase 2 test mirrors `tools/block-forge/` preview-assets test byte-for-byte; CONVENTIONS entry in Close phase documents the dual-edit discipline |
| Editing `block-preview.tsx` instead of creating new `ResponsivePreview.tsx` | Regression in Process panel or other Studio surfaces | Key Decisions lock scope to new component; Phase 0 carry-over (d) documents what's in block-preview.tsx so Phase 2 stays on its own file |
| Variant-display path untested end-to-end | Opening a variant-bearing block in Studio breaks silently | Phase 2.7 synthetic variant test; Phase 3.6 integration test includes variant fixture |
| Dirty-state desync with Studio's existing pattern | Unsaved accepts lost on route navigation | Phase 0 maps the pattern; Phase 4 integrates OR explicitly defers to followup WP (documented gap, not silent drift) |
| Existing save mutation doesn't accept `variants` field | Save errors when trying to write a block that had variants pre-existing | Phase 0 §0.4 confirmed: backend validator + Hono route already accept variants; frontend TS payload type missing `variants?: BlockVariants`. Phase 4.1 adds one line. |
| Revalidate not triggered → Portal stale | Authors don't see changes | Phase 0 §0.7 confirmed: Studio save does NOT auto-revalidate today. Phase 4.2 extends Hono `/api/content/revalidate` to accept `{ all: true }` (≤15 LOC cap); Phase 4.5 fires fire-and-forget call after successful save. |
| Hono revalidate patch balloons past 15 LOC | Scope creep; potential schema / auth cascade | Phase 4.0 mini-RECON estimates LOC delta before editing; hard stop + Brain surface if exceeded |
| Scope creep into WP-028 (tweak sliders, variants drawer) | Phase 4 slips; dual-WP responsibility confusion | Explicit non-scope at top of WP; tab UI deliberately mirrors WP-026 MVP, no tweak panel region |
| Scope creep into a shared `packages/block-forge-ui/` extraction | WP balloons; adds manifest churn | Key Decisions locks "reimplement, don't extract"; if genuine drift shows up post-WP-028, extract in a targeted polish WP |
| Concurrent Studio auth / RLS issues on update | 403 on Save for some users | Uses existing Studio client + existing mutation — no new auth; if an RLS bug exists, it exists on Basic tab too and is out of scope here |
| Arch-test hardcoded domain-count breaks | Red CI if manifest-level assertion collides with new files | Phase 0 re-grep; this WP adds no new domain so no bump, but registration of new files is verified in Phase 1 |
| `tokens.responsive.css` path drift (pkg-ui moves file) | `?raw` import breaks | Phase 0 carry-over (f) records the current path; CONVENTIONS entry documents dual-edit rule for pkg-ui token renames |
| SKILL status flip without +6 arch-test accounting | Red CI on Phase 5 | **Resolved:** Phase-0-follow-up verified `studio-blocks` SKILL `status: full` — no flip needed, no +6 bump in Phase 5 |
| Bulk accept button creeps in | Violates Key Decisions (no bulk until confidence calibrated) | No button in Phase 3 / 4; explicit in AC |

---

## Acceptance Criteria (Definition of Done)

- [ ] **2-tab bar visible in Studio block editor:** Tab 1 "Editor" (all current UI incl. Process button unchanged), Tab 2 "Responsive" (new)
- [ ] Opening the Responsive tab with no block selected shows a clean empty state
- [ ] Switching from Editor → Responsive → Editor does NOT lose form state (tab swap preserves RHF state)
- [ ] Selecting a published block from any Studio list → tab renders 3-panel preview at 1440 / 768 / 375
- [ ] Preview injection matches `tools/block-forge/PARITY.md` contract exactly: `tokens.css` + `tokens.responsive.css` + `portal-blocks.css` + `animate-utils.js` inside `@layer tokens, reset, shared, block`; `.slot-inner { container-type: inline-size; container-name: slot }` wrapper
- [ ] Variant-bearing blocks render both `data-variant` wrappers inlined; `@container slot (max-width: 480px)` reveals the mobile variant at 375 panel
- [ ] Manual parity check at 1440 vs. portal render byte-identical for one published non-variant block (documented in Phase 2 log)
- [ ] Suggestion list renders from `analyzeBlock` + `generateSuggestions`; ordering matches `tools/block-forge/`
- [ ] Confidence badges render correctly for high/medium/low
- [ ] Warnings from core surface as a banner above the list
- [ ] Accept / Reject buttons dispatch correctly; rejected suggestions disappear; accepted show pending badge
- [ ] Save button (Editor tab footer) calls `applySuggestions(block, pending[])` → `updateBlockApi` (with variants TS fix) → Hono `/api/content/revalidate` with `{ all: true }` body → session clears; re-analysis runs
- [ ] No new Supabase endpoint (Hono `/api/content/revalidate` is **extended** not created; ≤15 LOC patch)
- [ ] Dirty-state via RHF `formState.isDirty` — on Accept, `form.setValue('code', …, { shouldDirty: true })` fires; existing Save button / beforeunload / dirty indicator all light up unchanged
- [ ] `ResponsivePreview.tsx` is a new file; `apps/studio/src/components/block-preview.tsx` untouched (owned by `studio-core`)
- [ ] `apps/studio/src/pages/block-editor/responsive/PARITY.md` exists; cross-references `tools/block-forge/PARITY.md`; the reverse cross-reference lands in tools/block-forge/PARITY.md in Phase 5
- [ ] Vitest green for session-state, preview-assets, suggestion-row, integration (including variant path)
- [ ] `npm run arch-test` green at **489 / 0** (baseline 477 + 12 new owned_files; no SKILL flip because `studio-blocks` is already `full`)
- [ ] `npm -w @cmsmasters/studio test` green (script added in Phase 1)
- [ ] `npm run typecheck` clean across monorepo
- [ ] `npm -w @cmsmasters/studio run build` completes without error
- [ ] Zero changes to `packages/block-forge-core/`, `apps/portal/`, `packages/ui/**`, `tools/block-forge/src/**`, or `apps/studio/src/components/block-preview.tsx`
- [ ] Hono `/api/content/revalidate` patch ≤15 LOC added (Phase 4.0 mini-RECON + Phase 4.2 implementation)
- [ ] All six phases logged in `logs/wp-027/phase-*-result.md`
- [ ] Close phase went through explicit approval gate on ≥3 doc files (continuing 3/3 pattern)
- [ ] No known blockers for WP-028 (Tweaks + Variants UI)

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| WP-024 ✅ (Foundation — `blocks.variants` column + renderer) | Done | Variant-bearing blocks display correctly |
| WP-025 ✅ (Block Forge Core) | Done | Engine imports |
| WP-026 ✅ (tools/block-forge/ MVP) | Done | Reference implementation + PARITY contract to mirror |
| ADR-025 active | ✅ | Scope contract (no tweaks/variants in MVP) |

This WP blocks:
- **WP-028** — Tweaks + Variants UI (extends both surfaces in lockstep; requires this WP to exist to extend)
- **WP-029** — Auto-rules polish (heuristic tuning informed by author usage across both surfaces)

---

## Notes

- **Scope discipline, identical to WP-026.** MVP = preview + accept/reject + save. Anything else is WP-028 or later.
- **Two PARITY.md files is the design, not a smell.** Dual-surface parity is an explicit contract, not something to abstract away prematurely. The cross-reference pattern is the enforcement mechanism.
- **Studio's save-then-revalidate flow is the authority.** Phase 0 confirms existing behaviour; Phase 4 only fills the explicit revalidate call if it's missing. Don't add a parallel revalidate path.
- **`block-preview.tsx` is not for this WP.** Even though it looks adjacent, editing it risks Process panel regressions. `ResponsivePreview.tsx` is a new file, full stop. Extraction of duplication is a future polish concern — not now.
- **Dirty-state deferral is legitimate.** If Studio doesn't have a canonical unsaved-changes pattern, establishing one is its own UX WP and outside this one. Document the gap honestly in PARITY.md and move on. The tab-local indicator is enough for MVP.
- **Approval gate at Phase 5 is load-bearing.** Pattern is 3/3; 6 doc files in the update list here (incl. two PARITY.md) — gate catches cross-file drift. Maintain.
- **`--border-base` note from WP-026** — if that issue stems from a bad token reference elsewhere in `packages/ui/` or Studio, Phase 0 is the chance to include a quick grep check. Out-of-scope fix, but discovery is cheap.
- **WP-028 lookahead.** WP-028 will add tweak sliders and variants drawer to BOTH surfaces in lockstep. WP-027's parity contract is what makes that tractable: any WP-028 edit lands in two places with one design call.
- **ADR-025 is the tie-breaker** on any authoring-semantic question.
