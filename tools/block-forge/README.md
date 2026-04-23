# Block Forge

Vite-based dev tool for file-based responsive block authoring. First consumer of `@cmsmasters/block-forge-core`. Reads a block JSON from `content/db/blocks/`, shows a 3-panel preview (1440 / 768 / 375), surfaces ADR-025 responsive suggestions from the engine, lets the author accept/reject, writes back with backup safety.

## Quick Start

From monorepo root:
```bash
npm run block-forge            # opens http://localhost:7702
npm run block-forge:test
npm run block-forge:build
npm run block-forge:typecheck
```

Or from `tools/block-forge/`:
```bash
cd tools/block-forge && npm run dev
```

## What Block Forge Does

1. Lists `content/db/blocks/*.json` in a dropdown.
2. Loads the selected block's `html` + `css` + `js` into three iframes at canonical breakpoints.
3. Runs `analyzeBlock` + `generateSuggestions` from the core engine; displays the result as a sorted, confidence-labeled list.
4. Author clicks Accept/Reject per row; accepted suggestions accumulate in an in-memory session.
5. Clicking Save calls `applySuggestions(block, accepted)`, POSTs the result to `/api/blocks/:slug`, which writes the updated block to disk + `.bak` on first save of the session.
6. Re-analyzes after save — accepted rules now in the block's CSS no longer trigger, so those rows disappear.

## What Block Forge Does NOT Do

- Does not create new blocks — use `/block-craft` skill for authoring, `/content-push` to persist to DB.
- Does not edit Studio mockups — `tools/studio-mockups/` on port 7777 is a separate preview surface.
- Does not write to Supabase — file-based I/O only. After saving, run `/content-push` to ship edits to DB.
- Does not do element-click tweaks or variant forking — WP-028.
- Does not integrate into Studio — WP-027.

## Install

`tools/block-forge/` is NOT a workspace (by design, mirrors `tools/layout-maker/`). It needs its own `npm install`:

```bash
cd tools/block-forge && npm install
```

**Install gotcha:** the first install fails with `E404 @cmsmasters/block-forge-core@*` because `tools/*` isn't in the root `workspaces` glob. Workaround (same as LM):

1. Temporarily comment out the three `@cmsmasters/*` lines in `tools/block-forge/package.json`.
2. Run `npm install` — populates `node_modules/` with registry deps.
3. Restore the `@cmsmasters/*` lines to `package.json`.

Workspace deps resolve via the monorepo-root `node_modules/@cmsmasters/` symlink chain at runtime; lockfile doesn't need them listed.

## File Layout

```
tools/block-forge/
├── package.json             # name: "block-forge", private, not a workspace
├── tsconfig.json
├── vite.config.ts           # port 7702 + blocksApiPlugin (GET/POST /api/blocks/*)
├── tailwind.config.ts       # mirrors apps/dashboard
├── postcss.config.cjs
├── index.html
├── README.md                # you are here
├── PARITY.md                # preview injection contract (non-negotiable)
└── src/
    ├── main.tsx
    ├── App.tsx              # session + save orchestration + dirty guards
    ├── types.ts             # BlockJson + BlockIoError + SessionBackupState
    ├── globals.css          # tokens.css + tailwindcss + @config
    ├── vite-env.d.ts
    ├── components/
    │   ├── BlockPicker.tsx
    │   ├── PreviewTriptych.tsx
    │   ├── PreviewPanel.tsx
    │   ├── SuggestionList.tsx
    │   ├── SuggestionRow.tsx
    │   └── StatusBar.tsx
    ├── lib/
    │   ├── file-io.ts       # readBlock, writeBlock, ensureBackupOnce
    │   ├── preview-assets.ts # composeSrcDoc
    │   ├── api-client.ts    # listBlocks, getBlock, saveBlock
    │   ├── paths.ts
    │   ├── session.ts       # pure state machine
    │   └── useAnalysis.ts   # React hook over core engine
    └── __tests__/
        ├── file-io.test.ts
        ├── preview-assets.test.ts
        ├── session.test.ts
        └── integration.test.tsx
```

## Default Source Directory

`content/db/blocks/` relative to monorepo root. Override via `BLOCK_FORGE_SOURCE_DIR=/abs/path npm run block-forge` if needed.

## Save Safety Contract

1. Read: `readBlock` rejects missing/empty `html` or `slug` with a typed error.
2. Write scope: only the exact file path opened. No new-file creation, no directory traversal.
3. Backup: first save per session writes `<path>.bak` with pre-overwrite bytes. Idempotent on subsequent saves in the same session.
4. Dirty guards: `beforeunload` on tab close + picker-switch confirm prompt.
5. No-op Save: disabled when no pending suggestions.
6. No deletes: block-forge never removes `.json` or `.bak` files.

See `.context/CONVENTIONS.md` → "Block-forge dev tool conventions" for the authoritative version.

## Preview Parity

See `PARITY.md` for the complete injection contract. Changes to any token / slot wrapper / `@layer` order must update `PARITY.md` in the same commit.

## Known Interactions

- **`/content-pull` collision.** Running `/content-pull` overwrites `content/db/blocks/*.json` from DB — any unsaved block-forge edits are lost. Save (or commit) before running `/content-pull`.
- **LM + block-forge running simultaneously.** LM on 7700/7701, block-forge on 7702 — no conflict.
- **`tools/studio-mockups/`** serves on 7777 via `/block-craft` — separate surface, no overlap.

## Next WPs

- **WP-027** — Studio «Responsive» tab: same engine + UI patterns integrated into `apps/studio/`.
- **WP-028** — Tweaks + Variants UI: element-click per-BP sliders + variant drawer for both block-forge and Studio.
- **WP-029** — Auto-rules polish + `tokens.responsive.css` populate.
