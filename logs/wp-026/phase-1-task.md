# WP-026 Phase 1 — Scaffold + file I/O + arch-test green

**Role:** Hands
**Phase:** 1
**Estimated time:** ~2h
**Plan reference:** `workplan/WP-026-tools-block-forge-mvp.md` Phase 1 (lines 226–245, post-Brain-patch)
**Phase 0 carry-overs source:** `logs/wp-026/phase-0-result.md` §§ "Carry-overs for Phase 1" (lines 219–232)

---

## Brain decisions locked (resolving Phase 0 Open Questions)

- **Q1 Workspace strategy: Option A (LM-mirror).** `tools/*` stays OUT of root `workspaces`. Phase 1 adds a root-level `"block-forge"` script alias in `package.json`. All Phase-1..5 verification commands use `cd tools/block-forge && npm <cmd>` OR `npm run block-forge:<cmd>`. **`npm -w @cmsmasters/block-forge-dev` is forbidden in this WP.**
- **Q2 Picker content: Option A (real-content-only).** The Phase 2 picker scans `content/db/blocks/*.json` only. Synthetic fixtures (`block-spacing-font`, `block-plain-copy`, `block-nested-row`) remain isolated under `packages/block-forge-core/src/__tests__/fixtures/` and are accessed only by Phase 3's integration test via temp-dir copy. **This Phase 1 task writes no fixture-copy code.** README.md (Phase 5) documents the distinction.

---

## Plan corrections applied to WP-026

Before writing this prompt Brain patched 4 locations in `workplan/WP-026-tools-block-forge-mvp.md`:
- **Line 76** (Decision table, Port row) — correct ports (LM 7700/7701, studio-mockups 7777) + block-forge pick 7702.
- **Line 103** (Cross-domain risks, Port collision bullet) — same.
- **Phase 1 verification block (lines 240–244)** — `npm -w ...` → `cd tools/block-forge && npm <cmd>` + Workspace note callout.
- **Phase 2 task 2.1 (line 254)** — slot-wrapper clarification: two-level wrap (`<div class="slot-inner"><div data-block-shell>…</div></div>`), `.slot-inner { container-type: inline-size; container-name: slot }` injected in `@layer shared`.
- **Phase 2/3/4/5 verification blocks** — all `-w` commands replaced with `cd tools/block-forge && npm <cmd>`.

No other plan changes. Hands does NOT re-patch the plan.

---

## Mission

Land the empty shell: a `tools/block-forge/` Vite app that starts on port 7702, a working `file-io.ts` with readBlock/writeBlock/ensureBackupOnce + schema guard + first-save backup, unit tests green, new owned_files registered in the domain manifest, arch-test stays green. **No preview rendering, no core-engine wiring, no components with real logic.** App shell is skeleton; the logic ships in Phase 2–4.

Success = `cd tools/block-forge && npm run dev` opens on `http://localhost:7702/` with an empty layout (picker stub visible, empty triptych placeholder, empty suggestion list placeholder, status bar placeholder). `cd tools/block-forge && npm test` green for `file-io.test.ts`. `npm run arch-test` green at 442 + N (where N = count of new `infra-tooling.owned_files` entries added this phase). `npm run typecheck` clean.

---

## Hard Gates (DO NOT)

- DO NOT import `@cmsmasters/block-forge-core` public API yet — Phase 3 wires the engine. Phase 1 only declares the dep in `package.json`.
- DO NOT import `?raw` CSS yet — Phase 2 builds `preview-assets.ts`. Phase 1 does NOT create `preview-assets.ts`.
- DO NOT implement `session.ts`, `BlockPicker.tsx` logic, `SuggestionList.tsx`, `SuggestionRow.tsx`, `PreviewPanel.tsx`, `PreviewTriptych.tsx`, `CodeView.tsx`, `StatusBar.tsx` beyond empty placeholder divs — the layout-only shell (1.3) is enough. These files are created as stubs with a placeholder return. Their `owned_files` entries land in later phases as their real implementations ship. **Phase 1 owned_files additions:** only the files this phase actually writes real code in (see §3 below).
- DO NOT touch `packages/block-forge-core/`, `apps/portal/`, `packages/ui/**`, any other app, or any workplan doc.
- DO NOT copy any fixtures from `packages/block-forge-core/src/__tests__/fixtures/` or any block from `content/db/blocks/` into `tools/block-forge/`.
- DO NOT add `tools/*` to root `workspaces`. DO NOT use `npm -w @cmsmasters/block-forge-dev`.
- DO NOT scaffold `PARITY.md` yet — Phase 2 seeds it (per plan task 2.6).
- DO NOT update `.claude/skills/domains/infra-tooling/SKILL.md` — Phase 5 propagates docs.

---

## Tasks

### 1.1 — `tools/block-forge/package.json`

Mirror `tools/layout-maker/package.json` field order. Use package name `block-forge` (LM precedent: `"name": "layout-maker"` — not `@cmsmasters/*` — because it's not a workspace). `"private": true`, `"type": "module"`.

Scripts (minimal Phase 1 set — more may be added in later phases):
- `"dev": "vite"` — Phase 2 may add a runtime server; Phase 1 is Vite-only
- `"build": "vite build"`
- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"typecheck": "tsc --noEmit"`

Deps (exact pins for the `@cmsmasters/*` workspace trio; carets for registry deps to match LM):
```json
"dependencies": {
  "react": "^19",
  "react-dom": "^19",
  "@cmsmasters/block-forge-core": "*",
  "@cmsmasters/db": "*",
  "@cmsmasters/ui": "*"
},
"devDependencies": {
  "@testing-library/react": "^16",
  "@types/node": "^22",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@vitejs/plugin-react": "^4",
  "jsdom": "^25",
  "typescript": "^5",
  "vite": "^6",
  "vitest": "^2"
}
```

Note the **three workspace `*` deps** — these resolve via the root `node_modules/@cmsmasters/` symlink chain (§0.3 of Phase 0 log). Do NOT add `zod`, `chokidar`, `hono`, etc. — Phase 1 has no runtime server and no external schema lib; the read-guard in `file-io.ts` uses a hand-written type-narrowing check (see 1.4).

**Version sanity check:** before committing, confirm the exact resolved versions match what LM currently uses (`tools/layout-maker/package.json` + `package-lock.json` for react/vite/vitest). If a major-version mismatch exists (e.g., LM on react 18 vs this on react 19), Hands may downgrade to match LM or call it out as a Plan Correction.

### 1.2 — `tools/block-forge/tsconfig.json`

Mirror LM shape. Minimum fields:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "isolatedModules": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Mirror LM exactly if LM's shape differs — LM is the local precedent.

### 1.3 — `tools/block-forge/vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 7702,
    strictPort: true,
  },
  optimizeDeps: {
    // Defensive: pre-bundle the TS-source entrypoint of the workspace core package
    // so Vite dev server resolves it cleanly on first dev run (Phase 0 carry-over (b)).
    include: ['@cmsmasters/block-forge-core'],
  },
})
```

Port `7702` is pinned; `strictPort: true` means if 7702 is already bound the dev server fails loudly instead of silently double-binding.

### 1.4 — `tools/block-forge/index.html` + `src/main.tsx` + `src/App.tsx`

Index.html mirrors LM's shape: UTF-8 meta, viewport, title `Block Forge`, `<div id="root"></div>`, `<script type="module" src="/src/main.tsx"></script>`.

`main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` — layout-only shell. Four placeholder regions arranged to match the Phase 2+ final shape, each displaying a visible "Phase N placeholder" text so it's obvious at a glance what's not built yet:

```tsx
export function App() {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', height: '100vh' }}>
      <header style={{ padding: '12px 16px', borderBottom: '1px solid #ddd' }}>
        <strong>Block Forge</strong> — Phase 1 shell (picker + triptych + suggestions land in Phase 2+)
      </header>
      <main style={{ display: 'grid', gridTemplateColumns: '1fr 360px' }}>
        <section data-region="triptych" style={{ padding: 16, borderRight: '1px solid #ddd' }}>
          <em>Preview triptych — Phase 2 placeholder</em>
        </section>
        <aside data-region="suggestions" style={{ padding: 16 }}>
          <em>Suggestion list — Phase 3 placeholder</em>
        </aside>
      </main>
      <footer data-region="status" style={{ padding: '8px 16px', borderTop: '1px solid #ddd' }}>
        <em>Status bar — Phase 4 placeholder</em>
      </footer>
    </div>
  )
}
```

**Inline `style` object alert:** pkg-ui DS rules forbid hardcoded styles in apps, but `tools/*` sits in the `infra-tooling` domain whose CLAUDE.md precedent (LM) uses raw CSS/inline styles freely. Phase 5 README will document that block-forge tools UI is NOT subject to the app DS token discipline. For Phase 1 shell alone, inline `style` objects are acceptable; Phase 2+ will introduce a `styles.css` file instead.

### 1.5 — `tools/block-forge/src/vite-env.d.ts`

One-liner required for `?raw` imports to typecheck (Phase 2 will add them):
```ts
/// <reference types="vite/client" />
```

### 1.6 — `tools/block-forge/src/types.ts`

Types-only module. No runtime code. Phase-1 minimum surface:

```ts
// Shape of a block JSON under content/db/blocks/*.json.
// All 4 currently-committed blocks have these 11 top-level keys (Phase 0 §0.4).
// `html` and `slug` are the only fields file-io schema-guards at read time.
export type BlockJson = {
  id: string | number
  slug: string
  name: string
  html: string
  css: string
  js?: string
  block_type?: string
  hooks?: unknown
  metadata?: unknown
  is_default?: boolean
  sort_order?: number
}

export type ReadBlockError =
  | { kind: 'file-not-found'; path: string }
  | { kind: 'invalid-json'; path: string; cause: string }
  | { kind: 'missing-field'; path: string; field: 'html' | 'slug' }
  | { kind: 'empty-field'; path: string; field: 'html' | 'slug' }

export class BlockIoError extends Error {
  readonly detail: ReadBlockError
  constructor(detail: ReadBlockError) {
    super(
      detail.kind === 'missing-field' || detail.kind === 'empty-field'
        ? `Block at ${detail.path} has ${detail.kind === 'missing-field' ? 'missing' : 'empty'} field: ${detail.field}`
        : detail.kind === 'invalid-json'
          ? `Block at ${detail.path} is not valid JSON: ${detail.cause}`
          : `Block at ${detail.path} not found`,
    )
    this.name = 'BlockIoError'
    this.detail = detail
  }
}

export type SessionBackupState = {
  // Keys are absolute paths of source files that have been backed up at least
  // once during this session. Values are the backup-write timestamp (ms).
  backedUp: Map<string, number>
}

export function createSessionBackupState(): SessionBackupState {
  return { backedUp: new Map() }
}
```

Note: keep `BlockJson` fields deliberately loose (`unknown` for `hooks` / `metadata`) — block-forge does NOT validate beyond `html` + `slug` per §0.7 rule 1.

### 1.7 — `tools/block-forge/src/lib/file-io.ts`

Implements §0.7 rules 1–3 + 5–6 (rule 4 dirty-guards land in Phase 4's UI wiring):

```ts
import { readFile, writeFile, access, constants } from 'node:fs/promises'
import { BlockIoError, type BlockJson, type SessionBackupState } from '../types'

/**
 * Read a block JSON from disk. Schema-guards `html` and `slug`.
 * Throws BlockIoError on any failure; the caller should surface `err.detail` to the UI.
 */
export async function readBlock(path: string): Promise<BlockJson> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch {
    throw new BlockIoError({ kind: 'file-not-found', path })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (cause) {
    throw new BlockIoError({
      kind: 'invalid-json',
      path,
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new BlockIoError({ kind: 'invalid-json', path, cause: 'root is not an object' })
  }
  const obj = parsed as Record<string, unknown>

  for (const field of ['html', 'slug'] as const) {
    if (!(field in obj)) throw new BlockIoError({ kind: 'missing-field', path, field })
    if (typeof obj[field] !== 'string' || (obj[field] as string).length === 0) {
      throw new BlockIoError({ kind: 'empty-field', path, field })
    }
  }

  return parsed as BlockJson
}

/**
 * Write a block JSON back to the exact path it was read from.
 * Caller is responsible for calling ensureBackupOnce BEFORE this on first save.
 * No-op if the caller passes the unchanged object — check at caller level.
 */
export async function writeBlock(path: string, block: BlockJson): Promise<void> {
  const serialized = JSON.stringify(block, null, 2) + '\n'
  await writeFile(path, serialized, 'utf8')
}

/**
 * Rule-3 first-save-per-session backup. Idempotent across calls with the same (path, session).
 * Writes `<path>.bak` with the file's current bytes (pre-save).
 * Returns true if a backup was written this call, false if one already existed for this session.
 */
export async function ensureBackupOnce(
  path: string,
  session: SessionBackupState,
): Promise<boolean> {
  if (session.backedUp.has(path)) return false

  // Confirm source exists and is readable before we claim a backup slot.
  try {
    await access(path, constants.R_OK)
  } catch {
    throw new BlockIoError({ kind: 'file-not-found', path })
  }

  const bytes = await readFile(path)
  await writeFile(`${path}.bak`, bytes)
  session.backedUp.set(path, Date.now())
  return true
}
```

**Contract highlights:**
- No delete path (rule 6). Anywhere a `readFile` or `writeFile` failure would catch an absent file, throw the typed `BlockIoError` instead.
- Write-scope (rule 2): `writeBlock` takes the exact path the caller read from; there is no recursive write, no directory traversal, no new-file creation path. The UI wiring in Phase 2–4 ensures the path flows unchanged from open → write.
- `readBlock` returns the raw parsed object — `BlockJson` is a structural assurance, not a runtime transform. All other fields are preserved untouched through `writeBlock(…, applySuggestions(block, accepted))`.

### 1.8 — `tools/block-forge/src/__tests__/file-io.test.ts`

Vitest, jsdom NOT required (Node env). Covers:

1. **read-valid:** write a minimal valid block to a temp dir, `readBlock` returns matching shape.
2. **read-file-not-found:** non-existent path → throws `BlockIoError` with `detail.kind === 'file-not-found'`.
3. **read-invalid-json:** temp file with non-JSON content → throws with `detail.kind === 'invalid-json'`.
4. **read-missing-html:** JSON lacks `html` key → throws with `detail.kind === 'missing-field'` and `detail.field === 'html'`.
5. **read-missing-slug:** JSON lacks `slug` key → same pattern.
6. **read-empty-html:** `html: ""` → throws with `detail.kind === 'empty-field'` and `detail.field === 'html'`.
7. **read-empty-slug:** `slug: ""` → same pattern.
8. **read-preserves-extra-fields:** read block with `hooks`, `metadata`, `block_type`, `sort_order` — confirm they round-trip through the returned object untouched.
9. **write-round-trip:** read block → mutate `css` field → `writeBlock` → re-read → assert the mutation survived and unrelated fields are byte-equal.
10. **write-adds-trailing-newline:** confirm the serialized output ends in `\n` (matches `content/db/blocks/*.json` precedent; stops editors from fighting the file).
11. **ensureBackupOnce-first-call:** no `.bak` exists → call returns `true` → `<path>.bak` exists on disk → contents byte-equal to pre-call source.
12. **ensureBackupOnce-second-call:** call twice in a row with same session+path → second returns `false` and does NOT overwrite the `.bak` (even if source changed between calls — this is the "session backup captures the pristine state, not the latest" invariant).
13. **ensureBackupOnce-different-session:** two separate session objects against the same path → each writes a backup (session isolation).
14. **ensureBackupOnce-path-not-found:** path doesn't exist → throws `BlockIoError` with `detail.kind === 'file-not-found'`. No backup file created.

Use `node:os` `tmpdir()` + `node:crypto` `randomUUID()` for temp-dir scaffolding. Clean up with `node:fs/promises` `rm(dir, { recursive: true })` in `afterEach`.

**Do NOT touch `content/db/blocks/`** for test inputs — construct synthetic minimal blocks inline. (Real-block fixture copies are Phase 3's job.)

### 1.9 — Root `package.json` script aliases

Add to root `package.json` `scripts` section (preserve existing keys, insert alphabetically):

```json
"block-forge": "cd tools/block-forge && npm run dev",
"block-forge:build": "cd tools/block-forge && npm run build",
"block-forge:test": "cd tools/block-forge && npm test",
"block-forge:typecheck": "cd tools/block-forge && npm run typecheck"
```

Do not touch any other root script, dep, or workspace field. Confirm with `git diff package.json` that ONLY these 4 lines changed in the root.

### 1.10 — Install deps for the new tool

`tools/block-forge/` is not a workspace, so a top-level `npm install` won't provision it. Run:
```bash
cd tools/block-forge && npm install
```
This creates `tools/block-forge/node_modules/` + `tools/block-forge/package-lock.json` (matching LM precedent: `tools/layout-maker/` has its own lockfile).

### 1.11 — `src/__arch__/domain-manifest.ts` — add new `infra-tooling.owned_files`

Append (preserving alphabetical-within-domain order where that's the convention) the files this phase actually ships:

```ts
// Under infra-tooling.owned_files, keeping them grouped under the tools/block-forge/ prefix:
'tools/block-forge/package.json',
'tools/block-forge/tsconfig.json',
'tools/block-forge/vite.config.ts',
'tools/block-forge/index.html',
'tools/block-forge/src/main.tsx',
'tools/block-forge/src/App.tsx',
'tools/block-forge/src/types.ts',
'tools/block-forge/src/vite-env.d.ts',
'tools/block-forge/src/lib/file-io.ts',
'tools/block-forge/src/__tests__/file-io.test.ts',
```

**10 new `owned_files` entries.** Phase 0 confirmed zero hardcoded domain-count assertions (carry-over (e)), so no other arch-test files need patching.

Do NOT add Phase 2+ files to the manifest in this phase: `preview-assets.ts`, `paths.ts`, `session.ts`, `BlockPicker.tsx`, `PreviewPanel.tsx`, `PreviewTriptych.tsx`, `SuggestionList.tsx`, `SuggestionRow.tsx`, `CodeView.tsx`, `StatusBar.tsx`, `PARITY.md`, `README.md`, `preview-assets.test.ts`, `session.test.ts`, `integration.test.tsx` — those land in their implementing phase's manifest commit (WP-025 staging precedent).

Do NOT touch `allowed_imports_from` for `infra-tooling` unless arch-test explicitly fails on an import-boundary violation — Phase 0 indicates the current setup should accept `@cmsmasters/block-forge-core`, `@cmsmasters/db`, `@cmsmasters/ui` from `tools/` paths, but if that's a surprise, surface it in the result log with the specific failure message.

### 1.12 — Verification

Run in this order, capture output:

```bash
npm run arch-test                                        # expect 442 + 10 = 452 / 0
npm run typecheck                                        # clean across monorepo
cd tools/block-forge && npm test                         # 14 tests from 1.8, all green
cd tools/block-forge && npm run typecheck                # clean for tools/block-forge only
cd tools/block-forge && npm run dev                      # starts Vite on localhost:7702
# In a browser: http://localhost:7702/ — the empty shell loads with the 4 placeholder regions
```

Kill the dev server after manual verification. Do NOT leave it running in the background.

**Root-alias smoke test:**
```bash
npm run block-forge:test                                 # same as cd tools/block-forge && npm test
npm run block-forge:typecheck                            # same as cd tools/block-forge && npm run typecheck
```

If any command fails, fix the root cause in this phase — do NOT carry a red into Phase 2.

---

## Result Log Structure

Write `logs/wp-026/phase-1-result.md`:

```markdown
# WP-026 Phase 1 — Scaffold + file I/O Result

**Date:** 2026-04-23
**Duration:** <minutes>
**Commit(s):** <sha list>
**Arch-test:** <N> / 0
**File-io tests:** <N> / <N>

---

## What Shipped

- 10 new files under `tools/block-forge/` (list with 1-line purpose each)
- Root `package.json` — 4 script aliases added
- `src/__arch__/domain-manifest.ts` — 10 new `infra-tooling.owned_files` entries
- `tools/block-forge/package-lock.json` — created by local npm install

## Verification Output

<arch-test tail, typecheck output, vitest summary, manual-dev-server screenshot description>

## Deviations from Task Prompt

<Anything the prompt prescribed but reality forced you to adjust. For example:
- "LM uses react 18 not 19 — aligned block-forge to 18 to avoid cross-tool skew; flagged for Brain."
- "LM's vite is 6.0.7; prompt said ^6 — pinned to same exact version."
If none, say "None.">

## Open Items for Phase 2

<Anything Phase 2 should pick up explicitly. Most will be "none" — Phase 2 task prompt will carry the Phase 0 and Phase 1 carry-overs verbatim.>

## Plan Corrections

<New ones found in Phase 1. Usually empty.>
```

---

## Verification Before Writing Result Log

- [ ] Every command in §1.12 was run and passed.
- [ ] `tools/block-forge/` has exactly the 10 files listed (plus `node_modules/`, `package-lock.json`, `dist/` if built — none of which are tracked).
- [ ] No files created outside `tools/block-forge/` + `src/__arch__/domain-manifest.ts` + root `package.json` + `logs/wp-026/phase-1-result.md`.
- [ ] No edits to `packages/`, `apps/`, `workplan/`, `.claude/skills/`, `.context/`, `content/` (including `content/db/blocks/`).
- [ ] 14 file-io tests pass.
- [ ] Arch-test count = 442 + 10 = 452, zero failures.
- [ ] Dev server starts on port 7702 and the empty shell renders the 4 placeholder regions.
- [ ] Root `npm run block-forge:test` alias works.

## After Writing

Report back with:
1. Commit SHA(s)
2. Arch-test count (expected 452/0)
3. Number of file-io tests passing
4. Any deviations from the task prompt (especially registry-version mismatches with LM)
5. Plan Corrections (if any — expect empty)

---

**Brain contract:** after reviewing Phase 1 result, Brain writes `logs/wp-026/phase-2-task.md` with:
- Phase 0 carry-overs (a), (d), (e), (f) carried verbatim
- Phase 1 deviations (if any) integrated into Phase 2 spec
- `preview-assets.ts` + triptych + picker wiring + manual parity check against one published real block
