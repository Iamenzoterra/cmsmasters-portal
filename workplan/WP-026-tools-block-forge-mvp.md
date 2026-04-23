# WP-026: tools/block-forge/ MVP — Vite authoring surface over block-forge-core

> Standalone Vite app for file-based responsive block authoring. Reads a block JSON from disk, shows 3-panel preview (1440 / 768 / 375), runs `block-forge-core` analyzer + suggestion engine, lets the author accept/reject suggestions, writes back. No tweak panel, no variants drawer, no Studio, no DB. Engine lives in `@cmsmasters/block-forge-core` already — this WP is the wrapper.

**Status:** ✅ DONE
**Priority:** P0 — Critical path (first consumer of the core engine; unblocks the WP-028 tweaks+variants surface work)
**Prerequisites:** WP-024 ✅ (Foundation), WP-025 ✅ (Block Forge Core)
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 10–14 hours across 6 phases
**Created:** 2026-04-23
**Completed:** 2026-04-23

---

## Problem Statement

WP-025 delivered the pure engine (`analyzeBlock`, `generateSuggestions`, `applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`) — six pure functions that turn `{ html, css }` into `{ html, css, variants }`. Nothing calls them yet. Authors still can't see their blocks adapt to tablet/mobile widths, and there is no surface for previewing suggestions before committing them.

The existing block creation pipeline is file-first: `Figma → /block-craft → HTML files → preview :7777 → iterate → Studio import → Process panel → DB`. The natural insertion point for adaptive authoring is **during that crafting loop**, not after the block has already been published to Supabase. `tools/block-forge/` is the Vite-based companion that makes the engine usable where authors actually work — on the filesystem, with hot reload, no auth, no save-to-DB round-trip.

This WP ships the MVP: load a block JSON, render it at three canonical widths, surface auto-rule suggestions from the core, let the author accept or reject each suggestion, save the updated block back to the same file. That's it. Element-level tweak sliders and variant authoring are explicitly WP-028 territory. Studio integration is WP-027. Keeping this WP narrow lets us prove the author workflow on real content before wiring in two more UI modes.

Why now: WP-025 is green; WP-027 (Studio tab) needs a working reference implementation of the core-engine → UI wiring before it starts. Shipping `tools/block-forge/` first gives both surfaces a shared, validated pattern.

---

## Solution Overview

### Architecture

```
   Filesystem                    tools/block-forge/ (Vite, no auth, local only)
   ───────────                   ────────────────────────────────────────────────
   content/db/blocks/*.json  ──▶  File loader
                                    │
                                    ▼
                            ┌──────────────────────────────────┐
                            │ @cmsmasters/block-forge-core     │
                            │   analyzeBlock()                 │
                            │   generateSuggestions()          │
                            │   applySuggestions()             │
                            │   renderForPreview()             │
                            └─────────────────┬────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
        ┌─────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐
        │ 3-panel preview     │  │ Suggestion list       │  │ Raw HTML + CSS     │
        │  iframe 1440        │  │  - rationale          │  │ code view          │
        │  iframe 768         │  │  - confidence badge   │  │ (read-only in MVP) │
        │  iframe 375         │  │  - Accept / Reject    │  │                    │
        │  injects:           │  └───────────┬───────────┘  └────────────────────┘
        │   tokens.css        │              │
        │   tokens.responsive │              ▼
        │   portal-blocks.css │  applySuggestions(block, accepted[])
        │   slot-inner rule   │              │
        │   @container=slot   │              ▼
        └─────────────────────┘       File writer (overwrites same JSON,
                                      backup-on-first-save per session)

   ── What this WP does NOT contain (explicit non-scope) ───────────
     • Click-to-edit element tweaks / per-BP sliders  → WP-028
     • Variants drawer (fork / rename / delete)       → WP-028
     • Studio «Responsive» tab                        → WP-027
     • Save-to-Supabase round-trip                    → WP-027 / content-push
     • Any new heuristic beyond the 6 from WP-025     → WP-029
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|---|---|---|---|
| App location | `tools/block-forge/` | Dev-side surface mirroring `tools/layout-maker/`; not shipped to users; Vite + React | `apps/block-forge/` — implies a production app with auth; `packages/block-forge-ui/` — packages aren't runnable |
| File format | Block JSON matching DB shape (`{ id?, slug, name, html, css, js?, variants? }`) identical to `content/db/blocks/*.json` | Round-trip via existing `/content-push` ships edits to DB without transformation; one source of truth for a block across filesystem and Supabase | Separate `.html` + `.css` files (block-craft convention) — extra merge step; bespoke shape — breaks content-push |
| Default source directory | `content/db/blocks/` | Matches where DB-mirrored blocks live after `/content-pull`; authors already know the path | `tools/studio-mockups/` — that's block-craft's scratch area; implies pre-import, not post-import authoring. Configurable via CLI arg / env so scratch areas still work |
| Port | **7702** (pinned Phase 0). LM holds 7700 (Vite, strictPort) + 7701 (Hono); studio-mockups serves `/block-craft` on 7777 | Avoid collision with existing LM + block-craft tools; 7702 is lowest free port adjacent to LM's 7700/7701 pair | 7778/7779 — too far from LM; bare-number pick — silent double-bind risk |
| Save semantics | Overwrite source file in place; write `*.json.bak` on first save per session | Editors expect edits to persist to the file they opened; backup is an undo safety net without a full history stack | Write to a separate output path — confuses source of truth; prompt each save — noisy |
| Preview rendering | `renderForPreview` from core → srcdoc iframes @ 1440 / 768 / 375 | Core already returns deterministic HTML+CSS string; mirrors layout-maker's approach; no iframe-to-DOM divergence | Direct DOM mount — can't scope CSS to 1440-width container cleanly; SSR render — overkill for dev surface |
| Token injection | Mirror `tools/layout-maker/CLAUDE.md` `@layer` recipe: `tokens.css` + `tokens.responsive.css` + `portal-blocks.css` + `.slot-inner { container-type: inline-size; container-name: slot }` + `animate-utils.js` | Preview must look identical to portal render — any divergence here is a silent lie per PARITY-LOG discipline | Load portal's layout CSS — ties dev surface to theme-specific layouts; inject nothing — blocks look unstyled |
| HMR behaviour | File save → core re-analyze → preview reload; no client-side state persistence across reloads | Matches Vite defaults; keeps the app stateless | Restore suggestion state across reloads — requires serializing Suggestion IDs, YAGNI for MVP |
| Suggestion UX | Flat list ordered by heuristic → selector → BP. Each row: rationale + confidence badge + Accept / Reject. No bulk "Accept all" button in MVP | Forces per-suggestion review while we validate heuristic quality on real content. Bulk ops can land in WP-029 | "Accept all high-confidence" — we don't yet have data that the confidence levels are well-calibrated |
| Undo model | Per-session in-memory stack for suggestion accept/reject; does not survive reload | Lightweight; pairs with the `*.json.bak` file backup for hard-restore | Multi-level file history — overkill; git is the real undo |
| Domain | Add `tools/block-forge/**` to existing `infra-tooling` — same pattern Hands used for `tools/layout-maker/runtime/lib/css-generator.ts` in WP-024 Phase 4 | Keeps the manifest flat; no new domain needed until file count justifies a split | New `infra-block-forge` domain — premature split; tracks one app with its own invariants but they overlap with layout-maker's PARITY disciplines |
| **UI style discipline** | **Full DS compliance** — Tailwind v4 + `@cmsmasters/ui` primitives (Button, Badge, …) + tokens.css vars via `hsl(var(--…))` + zero hardcoded colors/fonts/shadows/spacing. Mirror apps/dashboard stack: `tailwindcss@4` + `@tailwindcss/postcss@4` + `postcss@8` + `autoprefixer@10` + `tailwind.config.ts` (with `../../packages/ui/src/**` in `content`) + `postcss.config.cjs` + `src/globals.css` (imports tokens.css + tailwindcss + config). Every piece of tool chrome (picker, triptych frame, suggestion rows, status bar, buttons, badges) goes through this. | LM is an accumulated mess of raw CSS + inline styles; replicating that debt into block-forge means a rewrite later. Doing it right now costs ~4 extra devDeps + 3 config files + no inline-style escape hatches. Dashboard/studio/admin pattern is already proven. | (A) LM-mirror raw styles — fast now, expensive later. Rejected. (B) Token-only via plain CSS without `@cmsmasters/ui` primitives — we'd re-implement Button/Badge instead of importing. Rejected. (C) Tailwind without pkg-ui primitives — same re-implementation tax. Rejected. |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **infra-tooling** (existing) | Gains the `tools/block-forge/` subtree. Becomes the second Vite dev-surface alongside `tools/layout-maker/` | PARITY with portal render — any divergence in token injection or slot wrappers is a silent lie per existing PARITY-LOG discipline | Drift between layout-maker's `@layer` order and block-forge's. Drift in `tokens.responsive.css` path assumptions. Drift in `.slot-inner { container-type }` rule if WP-024 generator output changes |
| **pkg-block-forge-core** (WP-025) | Read-only consumer. Uses only the public entrypoint (`import { … } from '@cmsmasters/block-forge-core'`). No deep imports | Pure-function contract from WP-025: never auto-applies, deterministic output | Assuming suggestion IDs are stable across versions of the engine (they aren't — treat them as opaque per-run tokens) |
| **pkg-ui** | **Dual consumer:** (1) `?raw` imports of `tokens.css`, `tokens.responsive.css`, `portal-blocks.css`, `animate-utils.js` into preview iframes (4 assets, Phase 2); (2) **runtime imports** of `@cmsmasters/ui` primitives (Button, Badge, …) for tool chrome + `src/globals.css` pulling in `tokens.css` + `tailwindcss` so `hsl(var(--token))` classes resolve (Phase 1). Same Tailwind-v4 content glob (`../../packages/ui/src/**`) as apps/dashboard. | Tokens hand-edit forbidden. Block-forge's `tailwind.config.ts` MUST include `../../packages/ui/src/**` in `content` so primitives' class scanning works. `lint-ds` compliance expected — no hardcoded colors/fonts/shadows/spacing in `tools/block-forge/src/**`. | Stale `?raw` import if pkg-ui path changes. Tailwind content-glob drift if pkg-ui moves primitives. DS token rename ripple (e.g., `--bg-page` → `--bg-base`) would break tool chrome silently until visual inspection. |
| **app-portal** | No change to portal code. Used as the parity reference — preview must render byte-identical for non-variant blocks | `BlockRenderer` RSC + `renderBlock()` helper paths must both match | Testing parity only against one render path → regression slips through the other |

**Public API boundaries:**
- `tools/block-forge/` consumes: `@cmsmasters/block-forge-core` (all public exports), `@cmsmasters/db` (only `BlockVariant` / `BlockVariants` types), `@cmsmasters/ui` (primitives as runtime imports + tokens.css via globals.css + `tokens.css` / `tokens.responsive.css` / `portal-blocks.css` / `animate-utils.js` via Vite `?raw` for iframe injection)
- `tools/block-forge/` exports: **nothing**. It's a runnable dev surface, not a library
- `allowed_imports_from` for infra-tooling in the manifest must already accommodate these — Phase 0 verifies and patches if needed

**Cross-domain risks:**
- **Preview fidelity drift.** The #1 trap for this WP. Each time portal or pkg-ui changes anything that affects block rendering (new global CSS, changed slot wrapper, new animation util), `tools/block-forge/`'s preview must follow in the same commit or it starts lying. Phase 0 adds a `PARITY.md` inside `tools/block-forge/` seeded with the initial contract; every future edit to token injection, slot wrapper, or iframe srcdoc must update it.
- **Port collision.** Actual landscape: LM on 7700 (Vite) + 7701 (Hono runtime), `/block-craft` served by `tools/studio-mockups/` on 7777. Block-forge pinned to **7702** in Phase 0. Recorded in `tools/block-forge/README.md` + PARITY.md.
- **Workspace resolution for the core package.** `tools/block-forge/` imports `@cmsmasters/block-forge-core`. Phase 0 must verify the workspace symlink chain works through Vite's dev server (often needs `optimizeDeps.include` or `resolve.preserveSymlinks` tweaks in monorepo Vite setups).

---

## What This Changes

### New Files

```
tools/block-forge/
  package.json                              # name: "block-forge", private, vite scripts — NOT a workspace
  tsconfig.json
  vite.config.ts                            # port 7702 (strictPort); optimizeDeps.include for core
  tailwind.config.ts                        # mirrors apps/dashboard; content includes pkg-ui primitives
  postcss.config.cjs                        # @tailwindcss/postcss + autoprefixer
  index.html                                # Vite entry
  README.md                                 # how to run; default source dir; port; parity contract
  PARITY.md                                 # what's injected into preview + why; updated on every change

  src/
    main.tsx                                # React root; imports globals.css; no router — single-page app
    App.tsx                                 # top-level layout: picker + 3-panel + suggestion panel
    types.ts                                # UI-local types (Session, OpenBlock, AcceptState)
    globals.css                             # @import tokens.css + tailwindcss + config (dashboard pattern)
    vite-env.d.ts                           # /// <reference types="vite/client" /> for ?raw

    components/
      BlockPicker.tsx                       # file-system dropdown of content/db/blocks/*.json
      PreviewPanel.tsx                      # one iframe at a target width; uses renderForPreview
      PreviewTriptych.tsx                   # three PreviewPanels @ 1440 / 768 / 375
      SuggestionList.tsx                    # ordered list; row = rationale + confidence + actions
      SuggestionRow.tsx                     # single suggestion UI + Accept / Reject buttons
      CodeView.tsx                          # read-only HTML + CSS panes (MVP; editable in WP-028)
      StatusBar.tsx                         # current file path, dirty state, last save timestamp

    lib/
      file-io.ts                            # read/write block JSON; backup-on-first-save
      preview-assets.ts                     # ?raw imports + composeSrcDoc() helper
      session.ts                            # in-memory accept/reject state + undo stack
      paths.ts                              # default source dir resolution

    __tests__/
      file-io.test.ts                       # unit: read, write, backup, schema guard
      preview-assets.test.ts                # unit: composeSrcDoc emits expected @layer order
      session.test.ts                       # unit: accept/reject state + undo
      integration.test.tsx                  # Testing Library: load fixture → render → accept → save

.claude/skills/domains/infra-tooling/SKILL.md   # UPDATED (see Modified Files)

logs/wp-026/
  phase-0-result.md … phase-5-result.md
```

### Modified Files

```
src/__arch__/domain-manifest.ts             # infra-tooling.owned_files += tools/block-forge/**
                                             (Phase 1 task — atomic with scaffold commit)
package.json (root)                         # workspaces glob picks up tools/block-forge/
                                             (verify in Phase 0; patch in Phase 1 only if needed)
.claude/skills/domains/infra-tooling/SKILL.md   # Close phase adds block-forge section to
                                             Invariants + Traps + Recipes
```

No edits to `packages/block-forge-core/`, `apps/portal/`, `packages/ui/**`, or any other app code. The core stays frozen; we consume it.

### Manifest Updates

```ts
// src/__arch__/domain-manifest.ts — append to infra-tooling.owned_files across phases:
'tools/block-forge/package.json',
'tools/block-forge/tsconfig.json',
'tools/block-forge/vite.config.ts',
'tools/block-forge/tailwind.config.ts',
'tools/block-forge/postcss.config.cjs',
'tools/block-forge/index.html',
'tools/block-forge/README.md',
'tools/block-forge/PARITY.md',
'tools/block-forge/src/main.tsx',
'tools/block-forge/src/App.tsx',
'tools/block-forge/src/types.ts',
'tools/block-forge/src/globals.css',
'tools/block-forge/src/vite-env.d.ts',
'tools/block-forge/src/components/BlockPicker.tsx',
'tools/block-forge/src/components/PreviewPanel.tsx',
'tools/block-forge/src/components/PreviewTriptych.tsx',
'tools/block-forge/src/components/SuggestionList.tsx',
'tools/block-forge/src/components/SuggestionRow.tsx',
'tools/block-forge/src/components/CodeView.tsx',
'tools/block-forge/src/components/StatusBar.tsx',
'tools/block-forge/src/lib/file-io.ts',
'tools/block-forge/src/lib/preview-assets.ts',
'tools/block-forge/src/lib/session.ts',
'tools/block-forge/src/lib/paths.ts',
// allowed_imports_from: add 'pkg-block-forge-core', 'pkg-ui' if not already present
```

### Database Changes

None.

---

## Implementation Phases

### Phase 0: RECON (~1h)

**Goal:** Confirm preconditions, pin port + source directory conventions, audit layout-maker's patterns we're mirroring, verify core engine import path works in a tools/ Vite context.

**Tasks:**
0.1. Read domain skills: `infra-tooling`, `pkg-block-forge-core`, `pkg-ui`. Read `tools/layout-maker/CLAUDE.md` (especially Port, @layer recipe, PARITY-LOG discipline, ?raw import paths).
0.2. **Port discovery.** `grep -rnE "7777|7778|7779|listen\(" tools/` and `lsof -iTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -E ":(7777|7778|7779)"` — confirm layout-maker is on 7777 and pick the lowest free port in that range for block-forge. Record the exact port in the log.
0.3. **Core package workspace resolution.** Try `node -e "console.log(require.resolve('@cmsmasters/block-forge-core', { paths: ['tools/layout-maker'] }))"` from repo root to confirm a tools/ location can resolve the package. If it fails, surface the fix (likely `resolve.preserveSymlinks: false` in vite.config.ts or an explicit `optimizeDeps.include`) as a Phase 1 task.
0.4. **Source directory audit.** `ls content/db/blocks/*.json | head -5` — confirm files exist and show the shape (sha256 a couple to stay honest about drift for snapshot tests later). Confirm `/content-pull` is what populates this folder (so authors running `/content-pull` won't clobber work — block-forge MUST warn on unsaved dirty state before a reload).
0.5. **Token + asset import paths.** Record the actual `?raw` import paths that layout-maker uses for `tokens.css`, `portal-blocks.css`, `animate-utils.js`. Add `tokens.responsive.css` (created in WP-024) to the list. Note the exact `@layer tokens, reset, shared, block` order from layout-maker's srcdoc contract.
0.6. **Arch-test baseline.** `npm run arch-test` — record current counts. Factor in the WP-025 archive note: arch-test climbed to 442 after WP-025. Target for WP-026 close: 442 + (N new owned files paths) arch-tests; no failures introduced. Grep for any hardcoded domain counts: `grep -rnE "toHaveLength|Object\.keys\(.*domains.*\)\.length|DOMAIN_COUNT" src/__arch__/`.
0.7. **Node file I/O safety audit.** Document the exact write policy: block-forge only writes to the file it opened; first save creates `<file>.bak`; no recursive directory writes; no creation of new block files (that's block-craft's job).

**Verification:** `logs/wp-026/phase-0-result.md` with findings. Carry-overs for Phase 1:
  (a) pinned port number
  (b) Vite monorepo resolution fix (if any)
  (c) default source dir + dirty-state warning requirement
  (d) `?raw` import paths including `tokens.responsive.css`
  (e) domain-count hardcode locations (if any)
  (f) save-safety contract (opened-file-only, backup-on-first-save)

No code written.

---

### Phase 1: App scaffold + file I/O + arch-test green (~2h)

**Goal:** `npm -w @cmsmasters/block-forge-dev run dev` starts Vite on the Phase 0 port; an empty React shell loads; `file-io.ts` can read a block JSON and write it back with backup; arch-test stays green.

**Tasks:**
1.1. Scaffold `tools/block-forge/` with `package.json` (private, vite dev/build scripts, deps: `react`, `react-dom`, `@cmsmasters/block-forge-core: "*"`, `@cmsmasters/db: "*"` for types only, `@cmsmasters/ui: "*"` for `?raw`; devDeps: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`). Mirror `tools/layout-maker/package.json` for field order.
1.2. `vite.config.ts` with the Phase 0 port, React plugin, and any monorepo resolution tweaks from Phase 0 carry-over (b).
1.3. `index.html` + `src/main.tsx` + `src/App.tsx` empty shell: picker stub, empty triptych, empty suggestion list — layout only, no data flow yet.
1.4. `src/lib/file-io.ts`: `readBlock(path)`, `writeBlock(path, block)`, `ensureBackupOnce(path, session)`. Schema-guard against missing `html` / `slug` on load; throw a typed error with actionable message if malformed.
1.5. `__tests__/file-io.test.ts` — unit-test read, write, backup-once, malformed rejection. Uses a temp dir; no fixtures from `content/db/blocks/` touched.
1.6. Add all new files to `src/__arch__/domain-manifest.ts` under `infra-tooling.owned_files`. If Phase 0 carry-over (e) flagged hardcoded domain-count assertions, bump them in this commit.
1.7. `npm run arch-test` — must stay green with the new files registered. `cd tools/block-forge && npm test` — file-io tests pass.

**Verification:**
```bash
npm run arch-test                                        # green, count = 442 + new-files
cd tools/block-forge && npm test                         # file-io tests green
cd tools/block-forge && npm run dev                      # opens on 7702; empty shell loads
npm run typecheck                                        # clean
```

> **Workspace note (Phase 0 carry-over):** root `package.json` workspaces glob is `["apps/*", "packages/*"]` — does NOT include `tools/*`. Mirroring LM precedent, block-forge uses `cd tools/block-forge && npm <cmd>` (or root-script alias `"block-forge:dev": "cd tools/block-forge && npm run dev"`); `npm -w @cmsmasters/block-forge-dev ...` will fail. Phase 1 task 1.1 does NOT add `tools/*` to workspaces.

---

### Phase 2: 3-panel preview with token injection (~2–3h)

**Goal:** Pick a block in `BlockPicker` → three iframes render at 1440 / 768 / 375 with correct token injection and `.slot-inner { container-type: inline-size }` wrapper. Byte-identical rendering to portal for a block with no variants.

**Tasks:**
2.1. `src/lib/preview-assets.ts`: `?raw` imports for `tokens.css`, `tokens.responsive.css`, `portal-blocks.css`, `animate-utils.js` (4 total — LM's exact set). Export `composeSrcDoc({ html, css, width })` that emits the `@layer tokens, reset, shared, block` srcdoc from Phase 0 carry-over (d). Wrap rendered block HTML in a **two-level wrapper**: outer `<div class="slot-inner">` (for `container-type: inline-size; container-name: slot` — injected in `@layer shared` to match portal theme-page parity) → inner `<div data-block-shell="{slug}">{block.html}</div>` (Portal-parity per `hooks.ts:234` + `renderForPreview` output). The `.slot-inner { container-type: inline-size; container-name: slot }` rule lives in injected CSS, NOT in srcdoc — LM doesn't wrap because legacy blocks don't use `@container slot` queries, but block-forge previews WP-024-shaped blocks that DO.
2.2. Unit tests for `composeSrcDoc`: (a) @layer order is exact, (b) slot wrapper is present with container-type, (c) width is reflected in body width, (d) no `<script>` escaping issues if block.js is present.
2.3. `PreviewPanel.tsx`: iframe with srcdoc from `composeSrcDoc`; ResizeObserver posts rendered height back via `postMessage`; parent scales iframe to fit panel if needed (layout-maker pattern).
2.4. `PreviewTriptych.tsx`: three `PreviewPanel`s in a row, widths from canonical BPs (`1440`, `768`, `375`).
2.5. `BlockPicker.tsx` + `paths.ts`: list `content/db/blocks/*.json`, select one, read via `readBlock`, pass into triptych. (MVP: pre-populated dropdown; no file watcher yet.)
2.6. `PARITY.md` — seed with current contract: token files injected, @layer order, slot wrapper, container name, source path. Every future edit to preview-assets updates this file in the same commit.
2.7. Manual verification: pick one published block; compare block-forge preview screenshot @ 1440 against the same block as rendered by portal on the current theme page. Byte-identical DOM / computed styles for the block subtree.

**Verification:**
```bash
cd tools/block-forge && npm test                         # preview-assets tests green
# Manual: dev server running → pick block → DevTools Elements on iframe
#   → .slot-inner has container-type: inline-size
#   → @layer order: tokens, reset, shared, block
#   → CSS custom props from tokens.responsive.css resolve (--space-section, --text-display)
```

---

### Phase 3: Core engine integration + suggestion list (~2–3h)

**Goal:** After loading a block, call `analyzeBlock` then `generateSuggestions` from core, render the result as a flat list with rationale + confidence badge. No Accept/Reject actions yet — display only.

**Tasks:**
3.1. Wire `analyzeBlock(html, css)` and `generateSuggestions(analysis)` from `@cmsmasters/block-forge-core` into a side-effect-free hook (`useAnalysis(block)`).
3.2. `SuggestionList.tsx`: receives `Suggestion[]`; sorts by heuristic → selector → BP; renders one `SuggestionRow` per entry.
3.3. `SuggestionRow.tsx`: shows heuristic name, selector, BP, rationale text, confidence badge (`high` / `medium` / `low` with distinct color tokens from pkg-ui), and a disabled Accept / Reject pair (wired in Phase 4).
3.4. Warning path: if core returns warnings (malformed CSS etc.), render a banner above the list. Don't crash on malformed input.
3.5. Re-analyze on block change — no caching across blocks (the core is fast; caching is a WP-028 concern).
3.6. Integration test in `__tests__/integration.test.tsx` using Testing Library: load the `block-spacing-font` fixture (copied into a test-local temp dir, not touched) → render → assert suggestion count ≥ 1 and includes a spacing-clamp entry.

**Verification:**
```bash
cd tools/block-forge && npm test                         # integration test green; suggestion rendering green
# Manual: pick block-spacing-font → list shows spacing-clamp + font-clamp with "medium" / "high" confidence
# Manual: pick block-plain-copy → list shows zero suggestions with "no triggers" empty state
# Manual: pick block-nested-row → list shows zero flex-wrap suggestions (nested-row contract holds)
```

---

### Phase 4: Accept / Reject + save round-trip (~2–3h)

**Goal:** Accept / Reject buttons enabled; accept pushes suggestion into pending set; Save button calls `applySuggestions(block, pending[])` from core and writes via `file-io`. Backup on first save per session. Dirty-state indicator in status bar.

**Tasks:**
4.1. `session.ts`: in-memory `AcceptState` (`pending: Set<string>`, `rejected: Set<string>`); undo stack keyed by suggestion ID. Pure functions for transitions.
4.2. Wire Accept / Reject buttons in `SuggestionRow` to dispatch session actions. Hide a suggestion once acted on (rejected disappears; accepted gets a pending badge and stays visible so user sees what will apply).
4.3. Save button in `StatusBar`: calls `applySuggestions(block, pending[])` → `writeBlock(path, updated)` → clears the session state for that block. If session saw no accepts, Save is a no-op (disabled button).
4.4. Backup-on-first-save: `ensureBackupOnce` writes `<file>.json.bak` the very first time Save runs in a session. Idempotent across further saves in the same session.
4.5. Dirty-state: track whether any suggestion has been accepted since last save. Warn via browser `beforeunload` if dirty and user closes the tab. Warn via banner if `BlockPicker` switches to a different block while dirty.
4.6. Re-analyze post-save: after Save, re-run `analyzeBlock` + `generateSuggestions` on the updated block so the list reflects reality (accepted suggestions should mostly disappear — they're now part of the CSS).
4.7. Integration test: load fixture → accept one suggestion → Save → read JSON from disk → assert accepted rule present → no `.bak` exists before first save, exists after.

**Verification:**
```bash
cd tools/block-forge && npm test                         # full integration suite green
npm run arch-test                                        # green; count = Phase 1 end + any session.ts/components added across Phases 2–4
# Manual: accept a spacing-clamp on block-spacing-font → Save → re-open in editor → padding uses clamp()
# Manual: .bak file present alongside source; contents match pre-save source
# Manual: accept + switch block → warning prompt
```

---

### Phase 5: Close (~1h)

**Goal:** Docs propagate; WP-027 and WP-028 have a clear reference point; approval gate holds.

**Tasks:**
5.1. CC reads all phase logs; digests discoveries / drift (especially from Phase 2's parity check and Phase 4's integration test).
5.2. Propose doc updates — touching ≥3 files triggers explicit approval gate per saved pattern:
   - `.context/BRIEF.md` — mark WP-026 done; new dev surface at `tools/block-forge/` on port X; default source `content/db/blocks/`
   - `.context/CONVENTIONS.md` — subsection on "block-forge file I/O contract" (open / backup-once / overwrite-same-path / never create) + "preview parity contract" (always matches portal token injection)
   - `.claude/skills/domains/infra-tooling/SKILL.md` — append block-forge section: Start Here files, Invariants (port, parity contract, source dir policy), Traps (portal drift, dirty-state on reload, schema-guard on malformed JSON), Blast Radius
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — cross-reference WP-026 alongside ADR-025 / WP-024 / WP-025
   - `tools/block-forge/README.md` — finalize usage, port, commands
   - `tools/block-forge/PARITY.md` — finalize contract surface; note the review discipline (PARITY-LOG equivalent)
5.3. **Brain approves** (explicit gate; 6 doc files — well above the ≥3 threshold).
5.4. CC executes approved doc updates.
5.5. If Phase 0 RECON or this phase flips `infra-tooling` SKILL from skeleton to full status, factor in the +6 arch-tests per saved pattern. Current state: infra-tooling SKILL status to be confirmed in Phase 0; if it was already `full`, the flip isn't needed and +6 doesn't apply.
5.6. Final green:
   ```bash
   npm run arch-test                                         # expect 448/0 (442 + owned_files count + 6 SKILL-flip tests)
   npm run typecheck
   cd tools/block-forge && npm test
   cd tools/block-forge && npm run build                     # MVP must at least build; full prod deploy is not in scope
   ```
5.7. Flip WP status to `✅ DONE`, set Completed date.

**Files to update:**
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `tools/block-forge/README.md`
- `tools/block-forge/PARITY.md`
- `logs/wp-026/phase-*-result.md`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Preview diverges from portal render (the PARITY lie) | Authors ship CSS that looks fine in block-forge but broken in portal | `PARITY.md` seeded Phase 2; every edit to preview-assets requires same-commit PARITY edit; Phase 2 manual parity check against one published block; extend to a diff-fixture test in a later polish WP |
| Port collision silently double-binds | Dev server appears up but serves wrong app | Phase 0 task 0.2 pins the port; README records it; vite.config.ts throws on a different port if explicitly overridden |
| Monorepo workspace resolution of `@cmsmasters/block-forge-core` fails inside Vite | Dev server errors on first import | Phase 0 task 0.3 discovers the fix; Phase 1.2 applies it; integration test in Phase 3 catches late regressions |
| Author runs `/content-pull` with unsaved edits in block-forge | Silent data loss | Dirty-state `beforeunload` warning; README warns; future enhancement: block-forge watches source file mtime and warns on external change |
| Core engine suggestion IDs assumed stable across analyses | Undo / pending sets corrupt on re-analyze | Treat IDs as opaque per-run; re-analyze resets session state for that block |
| File writer clobbers unrelated content | Data loss in `content/db/blocks/` | Write policy: only write back to the exact file read in this session; schema-guard on shape before write; `.bak` on first save |
| Scope creep into WP-028 (tweak sliders, variants drawer) | WP balloons; Phase 4 slips | Explicit non-scope list at top of WP; reject PR-style any phase prompt that includes element-click editing or variant forking |
| Scope creep into WP-027 (Studio DB integration) | Blurs ownership | No `@cmsmasters/db` client imports — only types |
| Arch-test hardcoded domain-count breaks after manifest edit | CI red | Phase 0 carry-over (e); Phase 1 atomic bump |
| pkg-ui token files move or rename | `?raw` imports break | Phase 0 records exact paths; Phase 5 CONVENTIONS entry documents that renaming pkg-ui token files requires same-commit block-forge edit |
| HMR loop when block-forge writes the file it's watching | Infinite re-analyze | Vite by default watches source tree; `content/db/blocks/` is outside `tools/block-forge/` — verify in Phase 0; if inside-watch, add `server.watch.ignored` for the source dir |
| SKILL status flip without accounting for +6 arch-tests | CI red on Phase 5 | Phase 0 records current skill status; Phase 5 factors +6 if promoting skeleton → full per saved memory |

---

## Acceptance Criteria (Definition of Done)

- [ ] `tools/block-forge/` exists with full directory structure per "New Files"
- [ ] `npm -w @cmsmasters/block-forge-dev run dev` starts Vite on the Phase 0-pinned port with no console errors
- [ ] Empty-state of the app loads with no block selected; picker shows `content/db/blocks/*.json` entries
- [ ] Picking a block populates the 3-panel triptych (1440 / 768 / 375), each iframe renders scoped under `.slot-inner { container-type: inline-size; container-name: slot }`
- [ ] Token injection into iframes matches layout-maker's `@layer` order and includes `tokens.responsive.css`
- [ ] `PARITY.md` documents the complete injection contract + slot wrapper + source dir
- [ ] Manual parity check passes: block-forge 1440 preview = portal render for one published, non-variant block (screenshot + computed-styles spot check documented in Phase 2 log)
- [ ] Suggestion list renders for a loaded block; each row shows heuristic, selector, BP, rationale, confidence badge
- [ ] `block-spacing-font` fixture shows ≥ 2 suggestions (spacing-clamp + font-clamp); `block-plain-copy` shows empty-state; `block-nested-row` shows zero flex-wrap entries (nested-row contract holds)
- [ ] Accept / Reject controls change session state as specified; Save applies accepted suggestions via `applySuggestions` from core
- [ ] First save in a session creates `<file>.json.bak` next to the source file; subsequent saves do not re-backup
- [ ] After Save, re-analysis updates the list — accepted suggestions disappear from the pending list
- [ ] Dirty-state warnings work: `beforeunload` on tab close; banner on picker switch
- [ ] `applySuggestions(block, [])` round-trip produces byte-identical output to input (Phase 4 integration test asserts)
- [ ] No imports from `apps/**`; no DB client from `@cmsmasters/db` (only types)
- [ ] Vitest green for file-io, preview-assets, session, integration
- [ ] `npm run arch-test` green; count = 442 + new owned files (+ possible +6 if SKILL status flipped)
- [ ] `npm run typecheck` clean across monorepo
- [ ] `npm -w @cmsmasters/block-forge-dev run build` completes without error
- [ ] All six phases logged in `logs/wp-026/phase-*-result.md`
- [ ] `.context/BRIEF.md`, `.context/CONVENTIONS.md`, `infra-tooling` SKILL.md, `BLOCK-ARCHITECTURE-V2.md`, `README.md`, `PARITY.md` all updated via explicit approval gate
- [ ] Zero changes to `packages/block-forge-core/`, `apps/portal/`, `packages/ui/**`
- [ ] No known blockers for WP-027 (Studio tab) or WP-028 (tweaks + variants)

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| WP-024 ✅ (Foundation) | Done | slot container-type + responsive tokens available to preview |
| WP-025 ✅ (Block Forge Core) | Done | all 6 public functions available to import |
| ADR-025 active | ✅ | Scope contract (no tweaks/variants in MVP) |
| `tools/layout-maker/` as the reference Vite dev surface | ✅ | Port + @layer recipe + PARITY discipline all patterned from layout-maker |

This WP blocks:
- **WP-027** — Studio «Responsive» tab (consumes the same core wiring; block-forge serves as the reference UX)
- **WP-028** — Tweaks + Variants UI (extends both surfaces with element-click editing and variant drawer)
- **WP-029** — Auto-rules polish (may want to iterate heuristic thresholds against real authoring in block-forge)

---

## Notes

- **Scope discipline, strict.** MVP is file-based authoring with accept/reject suggestions + save round-trip. Element-click tweaks, per-BP sliders, variant forking, Studio integration, DB writes — all out of scope. If a phase prompt drifts toward any of these, stop and re-scope.
- **Parity is the #1 invariant.** A preview surface that silently diverges from portal render is worse than no preview at all — it trains authors to trust a lie. `PARITY.md` seeded early + updated on every token/slot change + manual check in Phase 2 + diff test as a polish follow-up.
- **No new heuristics.** WP-025 shipped six; WP-029 tunes them. If Phase 3 surfaces an obvious seventh, log it for WP-029.
- **Close phase MUST go through approval gate** — 6 doc files in the update list, well above the threshold. Pattern vindicated 2/2 on WP-024/025; maintain it.
- **ADR-025 is the tie-breaker** on any authoring-semantic question.
- **File I/O safety** is an invariant, not a feature: `tools/block-forge/` never creates new block files, never writes outside the opened file, never deletes. Block authoring starts in `/block-craft`; block-forge shapes an existing block.
- **Watch for PARITY-LOG-equivalent lies.** Layout-maker's discipline (log → root-cause → contract test → fix) applies here too. `PARITY.md` is the block-forge equivalent of `tools/layout-maker/PARITY-LOG.md`.
