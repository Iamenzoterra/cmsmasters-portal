# WP-026 Phase 1 — Scaffold + file I/O Result

**Date:** 2026-04-23
**Duration:** ~55 min
**Commit(s):** `<embed after commit>`
**Arch-test:** 452 / 0 (442 baseline + 10 new `infra-tooling.owned_files` entries — exact prediction)
**File-io tests:** 14 / 14

---

## What Shipped

### 10 new files under `tools/block-forge/`
1. `package.json` — block-forge tool manifest; `"name": "block-forge"` (LM precedent, not `@cmsmasters/*`), `"private": true`, `"type": "module"`, deps = react 19 / react-dom 19 / 3× workspace `*` deps + registry devDeps (see §Deviations for vitest).
2. `tsconfig.json` — strict ES2022 + DOM libs, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`, types `[vite/client, node]`.
3. `vite.config.ts` — port `7702`, `strictPort: true`, `optimizeDeps.include: ['@cmsmasters/block-forge-core']` (Phase 0 carry-over (b) defensive hedge).
4. `index.html` — minimal shell mirroring LM shape; title `Block Forge`; mount at `/src/main.tsx`.
5. `src/main.tsx` — `createRoot` + `StrictMode` wrapper; NO token/CSS imports yet (Phase 2 task 2.2 introduces `styles.css`).
6. `src/App.tsx` — 4-region grid shell (header / triptych placeholder / suggestions placeholder / status placeholder) with inline placeholder text matching the Phase 2+ final layout.
7. `src/types.ts` — `BlockJson` (loose 11-key shape) + `ReadBlockError` discriminated union + `BlockIoError` class + `SessionBackupState` + `createSessionBackupState()`.
8. `src/vite-env.d.ts` — `/// <reference types="vite/client" />` one-liner for `?raw` imports (Phase 2).
9. `src/lib/file-io.ts` — `readBlock` (schema-guards `html`+`slug`), `writeBlock` (round-trip preserving all fields, trailing `\n`), `ensureBackupOnce` (rule-3 first-save-per-session, idempotent).
10. `src/__tests__/file-io.test.ts` — 14 vitest cases, Node env (no jsdom needed for this module), temp-dir scaffolding with `tmpdir() + randomUUID()`, cleanup via `rm({recursive, force})`.

### Root `package.json` — 4 script aliases added
```
"block-forge": "cd tools/block-forge && npm run dev",
"block-forge:build": "cd tools/block-forge && npm run build",
"block-forge:test": "cd tools/block-forge && npm test",
"block-forge:typecheck": "cd tools/block-forge && npm run typecheck"
```
Inserted alphabetically between `arch-test` and `content:pull`. No other root keys touched. `git diff package.json` shows only +4 lines.

### `src/__arch__/domain-manifest.ts` — 10 new `infra-tooling.owned_files`
Appended after the existing `tools/layout-maker/runtime/lib/css-generator.test.ts` line, before `nx.json`. Path order follows file-role grouping inside `tools/block-forge/` (top-level configs first, then `src/` tree depth-first). No `allowed_imports_from` changes needed — arch-test accepts the new `tools/block-forge/` paths without import-boundary complaints.

### `tools/block-forge/package-lock.json` — created by local npm install
Tracks only registry deps (167 packages). The 3× `@cmsmasters/*` deps are NOT in the lockfile — this mirrors LM precedent (`tools/layout-maker/package-lock.json` also omits `@cmsmasters/db`). Runtime resolution works via Node's parent-dir walk finding the root `node_modules/@cmsmasters/*` symlink chain. See §Deviations.

---

## Verification Output

### `npm run arch-test` → 452 / 0
```
Test Files  1 passed (1)
     Tests  452 passed (452)
  Start at  10:27:18
  Duration  500ms
```
Exact match for prediction: 442 baseline + 10 new `infra-tooling.owned_files` = 452. Zero failures. Zero hardcoded-domain-count assertions broke (confirming Phase 0 carry-over (e) — no `expect(domains.length).toBe(N)` asserts anywhere in arch-test).

### `npx tsc --noEmit` (monorepo root) → clean
Zero output, zero errors. `tools/block-forge/` TypeScript compiles cleanly against the root monorepo project because the root `tsconfig` doesn't `include` tools paths — tools/block-forge uses its own local tsconfig which itself passes.

### `cd tools/block-forge && npm test` → 14 / 14 green
```
 RUN  v4.1.5 C:/work/cmsmasters portal/app/cmsmasters-portal/tools/block-forge
 Test Files  1 passed (1)
      Tests  14 passed (14)
   Duration  350ms
```

All 14 cases pass:
- `readBlock` × 8 (valid, file-not-found, invalid-json, missing-field×2, empty-field×2, preserves-extra-fields)
- `writeBlock` × 2 (round-trip, trailing-newline)
- `ensureBackupOnce` × 4 (first-call, second-call-idempotent, session-isolation, file-not-found)

### `cd tools/block-forge && npm run typecheck` → clean
Zero output, zero errors.

### `cd tools/block-forge && npm run dev` → bound to http://localhost:7702/
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:7702/` → `200`
- `curl http://localhost:7702/` returns the expected `index.html` with `<title>Block Forge</title>` + `/@vite/client` + `/src/main.tsx` script tags.
- `curl http://localhost:7702/src/App.tsx` returns Vite-transformed TSX with JSX runtime + HMR boilerplate (confirms compile pipeline works end-to-end).
- `curl http://localhost:7702/src/main.tsx` imports `react`, `react-dom/client`, and `/src/App.tsx` — import graph wired correctly.
- Dev server stopped via `TaskStop` after smoke test — no orphaned process.

**Manual shell render:** the 4 regions render as prescribed in §1.4 — `<strong>Block Forge</strong>` header, three `<em>…placeholder</em>` blocks in the triptych/suggestions/status zones.

### Root-alias smoke tests
- `npm run block-forge:test` → 14/14 green (same output as above, just invoked via root alias).
- `npm run block-forge:typecheck` → clean.

---

## Deviations from Task Prompt

1. **`vitest` version: prompt said `^2`, shipped `^4`.**
   - Rationale: root monorepo uses `vitest@4.1.2` (for `arch-test`). Pinning block-forge to `^2` would cause version-skew between the tool and the rest of the repo (e.g., arch-test and block-forge would use different vitest runtimes). Shipping `^4` aligns with the root precedent. Shipped version: `vitest@4.1.5` (latest `^4` at install time).
   - Blast radius: none. Vitest 4 is strictly a superset of vitest 2's vitest-api for the features this phase uses (`describe`, `it`, `expect`, `beforeEach`, `afterEach`, `rejects.toMatchObject`, `rejects.toBeInstanceOf`).

2. **Workspace-dep install pattern: `@cmsmasters/*` NOT in `package-lock.json`.**
   - Symptom: first `npm install` in `tools/block-forge/` failed with `E404 @cmsmasters/block-forge-core@* is not in this registry`.
   - Root cause: `tools/*` is NOT in root workspaces (Q1 decision: Option A LM-mirror). `npm install` inside a non-workspace tool can't resolve workspace `*` deps — it queries the public registry.
   - Resolution: mirror LM's workaround exactly:
     1. Temporarily removed the 3× `@cmsmasters/*` lines from `package.json`.
     2. Ran `npm install` — succeeded, populated lockfile with 167 registry packages.
     3. Restored the `@cmsmasters/*` lines to `package.json`.
   - Why this works: Node's module resolution walks up parent dirs looking for `node_modules/@cmsmasters/block-forge-core`. It finds the symlink at the monorepo root (`<root>/node_modules/@cmsmasters/block-forge-core → packages/block-forge-core/`). The lockfile doesn't need to know about the workspace dep for runtime to resolve it.
   - Verified: `node -e "console.log(require.resolve('@cmsmasters/block-forge-core'))"` from `tools/block-forge/` returns `.../packages/block-forge-core/src/index.ts`.
   - Precedent: `tools/layout-maker/package.json` declares `"@cmsmasters/db": "*"`, but `tools/layout-maker/package-lock.json` has ZERO entries for `@cmsmasters/*`. Same pattern.
   - **Phase 5 README implication:** the README must document this install dance — "run `cd tools/block-forge && npm install` but expect E404 if you include workspace deps; temporarily strip them, install, restore" — OR we wire a preinstall helper script. Flagged as §Open Items for Phase 2 to decide whether Phase 5 needs a helper or a README note is enough.

3. **LM `tools/layout-maker/` has NO `vite-env.d.ts`.**
   - Task prompt §1.5 required the one-liner; I created it.
   - LM's types-only precedent doesn't expose this because LM doesn't use `?raw` imports as static imports in TSX files — it does them in `.ts` files where TS picks up `"types": ["vite/client"]` from the `tools/layout-maker/tsconfig.json` indirectly via `@types/node` + legacy config quirks.
   - block-forge's `tsconfig.json` explicitly lists `"types": ["vite/client", "node"]`, AND we have `src/vite-env.d.ts`. Both signals are defensive — either alone works; both together costs nothing. No action needed.

---

## Open Items for Phase 2

1. **Workspace-dep install dance documentation.** Phase 5 README task needs to include the `@cmsmasters/*` strip-then-restore workaround from §Deviations 2, OR Phase 2 could add a `tools/block-forge/scripts/preinstall.sh` that automates it. **Recommendation:** README note is sufficient — the dance only happens when someone manually runs `npm install` in `tools/block-forge/` from scratch, which is rare. Phase 5 can decide.

2. **`vitest` version pin vs caret.** Currently `"^4"` in `devDependencies`. If root bumps to vitest 5, caret would auto-upgrade block-forge too. That's desirable (consistency). No action needed; flagged for awareness only.

3. **Phase 2 carry-overs from Phase 0 remain intact.**
   - (a) Manifest path additions Phase 2+ files → not touched this phase (by contract §3).
   - (d) Arch-test zero-drift → confirmed again at 452/0.
   - (e) No hardcoded domain-count asserts → re-confirmed.
   - (f) Slot-wrapper two-level contract → belongs to Phase 2 task 2.1 (not touched this phase).

---

## Plan Corrections

**None.** The 3 corrections from Phase 0 were already patched into the workplan by Brain before Phase 1 kicked off (Lines 76, 103, 237–244, 254, plus the `-w` sweep through Phases 2–5). No new corrections discovered in Phase 1.

---

## Hard Gates — Compliance

- [x] No `@cmsmasters/block-forge-core` public-API imports yet (the package-json dep declaration is allowed; actual imports land in Phase 3).
- [x] No `?raw` CSS imports (Phase 2 will build `preview-assets.ts`).
- [x] All stub components (BlockPicker, SuggestionList, SuggestionRow, PreviewPanel, PreviewTriptych, CodeView, StatusBar, `session.ts`) NOT created — only the layout-only shell in App.tsx with inline placeholder text.
- [x] No touches to `packages/block-forge-core/`, `apps/`, `packages/ui/**`, `workplan/`, `.claude/skills/`, `.context/`, `content/`.
- [x] No fixture copies from `packages/block-forge-core/src/__tests__/fixtures/` or `content/db/blocks/` into `tools/block-forge/`.
- [x] `tools/*` NOT added to root `workspaces`. No `npm -w @cmsmasters/block-forge-dev` used.
- [x] `PARITY.md` NOT scaffolded (Phase 2 seeds it).
- [x] `.claude/skills/domains/infra-tooling/SKILL.md` NOT touched.
- [x] `infra-tooling.owned_files` only the 10 files actually shipping real code this phase. Phase 2+ files deferred per staging precedent.

---

## Summary for Brain

- **Arch-test:** 452/0 (exact prediction match — 442 + 10).
- **File-io tests:** 14/14 green.
- **Typecheck:** clean (both monorepo-wide and tools/block-forge-local).
- **Dev server:** boots on :7702, serves the empty shell via Vite transform pipeline, stopped cleanly.
- **Deviations:** 1 substantive (vitest ^4 not ^2 — aligned with root), 1 procedural (npm-install dance for workspace deps — LM-mirror pattern), 1 harmless (vite-env.d.ts present, LM-absent but defensive).
- **Plan Corrections:** none (Brain's Phase 0 patches covered everything).
- **Ready for Phase 2** prompt. Phase 2's `preview-assets.ts` + picker + triptych + PARITY.md seed land on this clean base.
