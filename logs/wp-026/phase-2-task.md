# WP-026 Phase 2 — 3-panel preview + token injection + picker

**Role:** Hands
**Phase:** 2
**Estimated time:** ~2.5–3h
**Plan reference:** `workplan/WP-026-tools-block-forge-mvp.md` Phase 2 (lines 249–269, post-Brain-patch)
**Carry-overs source:** `logs/wp-026/phase-0-result.md` §§"Carry-overs for Phase 1" + `logs/wp-026/phase-1-hotfix-result.md` (DS base ready)

---

## Phase 1 Hotfix Landing Context

DS-compliant base is live (commit `1d6e6feb`):
- Tailwind v4 + PostCSS wired; `@cmsmasters/ui` primitives import-ready; `globals.css` pulls tokens.css.
- Real token names verified: `--bg-page`, `--text-primary`, `--text-muted`, `--border-default` (NOT `--border-base`).
- Arch-test floor: 455/0.
- lint-ds scopes away from `tools/**` (outcome c) — block-forge maintains DS compliance by convention, not automated gate. This phase continues that discipline.

All tokens referenced in this prompt have been verified to exist in `packages/ui/src/theme/tokens.css`. If you need a token this prompt doesn't list (e.g., spacing token, status color), GREP `packages/ui/src/theme/tokens.css` first — don't invent names.

---

## Carry-overs from Phase 0 (verbatim, Phase 2 must honor)

- **(a) Port:** 7702 (already pinned in `vite.config.ts`; don't change).
- **(d) `?raw` imports (exact 4x `../` paths from `src/lib/preview-assets.ts`):**
  ```ts
  import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
  import tokensResponsiveCSS from '../../../../packages/ui/src/theme/tokens.responsive.css?raw'
  import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'
  import animateUtilsJS from '../../../../packages/ui/src/portal/animate-utils.js?raw'
  ```
  All 4 files verified to exist. `tokens.responsive.css` is the WP-024 clamp-based companion (hand-maintained, will populate in WP-029).
- **(e) No hardcoded domain-count assertions.** Adding new `infra-tooling.owned_files` entries is safe.
- **(f) Save safety contract.** Not implemented this phase (Phase 4 wires writes), but Phase 2's file-system bridge must respect rule 2 (opened-file-only scope) — the read endpoint reads from the source dir only; no directory traversal (`../` in slug) allowed.

## Brain decisions (locked, don't relitigate)

- **Q1 workspace strategy — A (LM-mirror cd-alias).** `tools/*` stays out of workspaces. No new root-script aliases needed this phase (`block-forge:*` covers dev/build/test/typecheck from Phase 1).
- **Q2 picker content — A (real-content-only).** BlockPicker reads `content/db/blocks/*.json` only. Do NOT expose fixtures from `packages/block-forge-core/src/__tests__/fixtures/` in the picker UI.
- **Runtime architecture — Vite-middleware (single-port).** Unlike LM which runs Hono on 7701 alongside Vite on 7700, block-forge keeps ONE process on 7702 using a Vite `configureServer` plugin for its `/api/blocks/*` surface. Rationale: MVP doesn't need file-watching, multi-client broadcast, or any of the LM-runtime features that justify the two-process setup. Single-port = simpler dev UX, fewer failure modes, easier to kill cleanly. If Phase 4 discovers a need for watchers, revisit then.

## Plan addition (Brain-noted, not a correction)

The plan omitted the file-system bridge design — listing `content/db/blocks/*.json` from a browser context requires a Node-side endpoint. This phase adds it as a Vite middleware plugin + a tiny `src/lib/api-client.ts` browser wrapper. Flagged for Phase 5 README documentation.

---

## Mission

Pick a block from a dropdown → render it in three iframes at 1440 / 768 / 375 with full token injection and the two-level slot wrapper → visually identical to how portal would render the same block on a theme page. Preview-assets composition is deterministic and unit-tested. PARITY.md seeded with the injection contract.

**Success** =
1. `cd tools/block-forge && npm run dev` opens on :7702.
2. Picker dropdown lists the 4 real blocks from `content/db/blocks/`.
3. Selecting a block triggers 3 iframe loads at 1440 / 768 / 375 widths, each with full `@layer tokens, reset, shared, block` injection + `<div class="slot-inner"><div data-block-shell="{slug}">…</div></div>` wrap + `.slot-inner { container-type: inline-size; container-name: slot }` injected into `@layer shared`.
4. Manual parity check: one real block previewed in block-forge @ 1440 = portal's rendering of the same block on its theme page (computed-styles spot check + full-page screenshot in result log).
5. `preview-assets.test.ts` unit tests green.
6. Arch-test clean at new baseline (455 + new owned_files = ~463).

**No Accept/Reject, no suggestions, no save, no `@cmsmasters/block-forge-core` imports.** Engine wiring is Phase 3.

---

## Hard Gates (DO NOT)

- DO NOT import `@cmsmasters/block-forge-core` yet. Phase 2 is preview-plumbing only. The picker reads raw block JSON; the triptych renders `{html, css}` directly through `composeSrcDoc`. The `renderForPreview` function is NOT called this phase — that's Phase 3.
- DO NOT implement `session.ts`, `SuggestionList.tsx`, `SuggestionRow.tsx`, `StatusBar.tsx`, `CodeView.tsx`. Placeholders for triptych + picker land this phase; suggestions region stays as the Phase-1-hotfix placeholder text.
- DO NOT write any Node fs code in browser-context files (components, api-client). The `src/lib/api-client.ts` is strictly `fetch()`-based.
- DO NOT wire POST/PUT endpoints in the Vite plugin. Read-only API this phase: GET /api/blocks, GET /api/blocks/:slug. POST /api/blocks/:slug + backup lands in Phase 4.
- DO NOT copy any fixture from `packages/block-forge-core/src/__tests__/fixtures/`.
- DO NOT touch `packages/`, `apps/`, other `tools/`, `workplan/`, `.claude/skills/`, `.context/`, `content/**` (including no writes to `content/db/blocks/*.json`).
- DO NOT edit `file-io.ts` or its tests.
- DO NOT add any new root-`package.json` script aliases.
- DO NOT add `hono` or `@hono/node-server` or `concurrently` — single-process Vite-middleware only.

---

## Tasks

### 2.1 — `src/lib/preview-assets.ts`

Four `?raw` imports + `composeSrcDoc({ html, css, width, slug })` function.

```ts
import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'
import tokensResponsiveCSS from '../../../../packages/ui/src/theme/tokens.responsive.css?raw'
import portalBlocksCSS from '../../../../packages/ui/src/portal/portal-blocks.css?raw'
import animateUtilsJS from '../../../../packages/ui/src/portal/animate-utils.js?raw'

// Slot containment rule — emitted into @layer shared so @container slot (max-width: Npx)
// queries in the block CSS evaluate inside the preview iframe.
// Matches portal's theme-page hierarchy where [data-slot] > .slot-inner gets this contract
// (see tools/layout-maker/runtime/lib/css-generator.ts:254-255).
const SLOT_CONTAINMENT_RULE = `
.slot-inner {
  container-type: inline-size;
  container-name: slot;
}
`.trim()

export type ComposeSrcDocInput = {
  html: string
  css: string
  js?: string
  width: number
  slug: string
}

export function composeSrcDoc(input: ComposeSrcDocInput): string {
  const { html, css, js, width, slug } = input
  const jsBlock = js ? `<script type="module">${js}</script>` : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${width}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @layer tokens, reset, shared, block;
    @layer tokens {
      ${tokensCSS}
      ${tokensResponsiveCSS}
    }
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Manrope', system-ui, sans-serif;
        width: ${width}px;
        overflow: hidden;
        background: white;
      }
    }
    @layer shared {
      ${portalBlocksCSS}
      ${SLOT_CONTAINMENT_RULE}
    }
    @layer block {
      ${css}
    }
  </style>
</head>
<body>
  <div class="slot-inner">
    <div data-block-shell="${slug}">${html}</div>
  </div>
  <script type="module">${animateUtilsJS}</script>
  ${jsBlock}
  <script>
    // ResizeObserver → postMessage parent for iframe height sync
    const ro = new ResizeObserver((entries) => {
      const h = Math.ceil(entries[0].contentRect.height);
      parent.postMessage({ type: 'block-forge:iframe-height', slug: ${JSON.stringify(slug)}, width: ${width}, height: h }, '*');
    });
    ro.observe(document.body);
  </script>
</body>
</html>`
}
```

**Contract highlights:**
- **Two-level wrap** per Phase 0 §0.5: outer `.slot-inner` (containment context) → inner `data-block-shell="{slug}"` (block wrapper — portal parity). This is the deliberate divergence from LM (which doesn't wrap) and alignment with portal's theme-page hierarchy.
- **`@layer tokens` bundles BOTH `tokens.css` and `tokens.responsive.css`** — mirrors LM's pattern verified in Phase 0 §0.5. tokens.responsive.css is currently a 2-token scaffold but must inject alongside tokens.css from day one so WP-029 populate work has a live target.
- **`SLOT_CONTAINMENT_RULE` in `@layer shared`** — lives alongside `portal-blocks.css`, same layer as portal's shared CSS, so block CSS in `@layer block` can override if needed.
- **`JSON.stringify(slug)`** for postMessage safety — prevents quote-injection issues if a slug contains weird chars (in practice slugs are kebab-case, but defense-in-depth is cheap).
- **No script-tag escaping gotchas.** The injected `${css}` and `${js}` are inside `<style>` and `<script type="module">` respectively; if a block CSS contains the literal string `</style>`, that'd break out — but per WP-025 guarantees, `analyzeBlock` rejects malformed CSS, and real blocks from `content/db/blocks/` are hand-authored. Still, add a defensive test (2.2 case f below).

### 2.2 — `src/__tests__/preview-assets.test.ts`

Vitest, jsdom env (required for DOMParser used in a couple assertions). Covers:

```ts
// a. @layer order is exactly "tokens, reset, shared, block" — assert the literal string
//    appears before any @layer { ... } block.
// b. Two-level wrapper present: both <div class="slot-inner"> and <div data-block-shell="{slug}">
//    in correct nesting. Use DOMParser on the output and walk: body > .slot-inner > [data-block-shell]
// c. Slug attribute sanitized: call composeSrcDoc with slug="kebab-slug", assert output contains
//    data-block-shell="kebab-slug". (No XSS vector test — slugs come from file-io which schema-guards.)
// d. Width is reflected: width=768 → <meta name="viewport" content="width=768"> AND body { width: 768px; }.
// e. tokens.responsive.css is injected INSIDE @layer tokens (not just tokens.css alone).
//    Assert output contains both tokens.css AND tokens.responsive.css content markers — pick one
//    token from each (e.g., `--bg-page:` from tokens.css, `--space-section` or whatever 2-token
//    scaffold name is currently in tokens.responsive.css).
// f. .slot-inner containment rule emitted: output contains
//    ".slot-inner {\n  container-type: inline-size;\n  container-name: slot;\n}"
//    inside @layer shared (AFTER portal-blocks.css content).
// g. js block optional: omit js → output has no extra <script type="module">{js}</script> block
//    (only animate-utils.js + ResizeObserver); include js → output contains it.
// h. No null/undefined crashes for edge cases: empty html="", empty css="".
// i. postMessage payload shape: grep for the 'block-forge:iframe-height' literal so any rename
//    forces an explicit test update.
```

Test count: 9 cases (a–i). Tests must pass at commit time. No manual parity check in unit tests — that's task 2.7.

### 2.3 — `src/lib/paths.ts`

Source-dir resolution + slug-from-path helpers. Browser-safe (no Node imports — this file is imported by components).

```ts
// Canonical source directory: content/db/blocks/ relative to repo root.
// Resolved server-side by the Vite plugin; browser side only needs slug handling.

export const CANONICAL_SOURCE_DIR_REL = 'content/db/blocks'

// Filename → slug (strip trailing .json)
export function pathToSlug(filename: string): string {
  return filename.replace(/\.json$/i, '')
}

// Slug → filename (append .json)
export function slugToFilename(slug: string): string {
  return `${slug}.json`
}

// Safety: reject slugs containing path traversal chars.
// Called on both API request handling AND before any display to keep the assumption tight.
export function isSafeSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/i.test(slug) && !slug.includes('..') && !slug.includes('/') && !slug.includes('\\')
}
```

The Node-side source-dir absolute path is computed by the Vite plugin (task 2.4) via `path.resolve(__dirname, '../../content/db/blocks')` where `__dirname` = `tools/block-forge/`. Optional env override via `BLOCK_FORGE_SOURCE_DIR` (absolute path) — Phase 5 README documents this.

### 2.4 — Vite plugin for `/api/blocks/*` (inline in `vite.config.ts`)

Extend `tools/block-forge/vite.config.ts` with a `configureServer` hook. Keep the plugin inline (don't split into a separate `vite-plugins/` file unless it grows past ~60 LOC) so the manifest stays small.

```ts
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_DIR = process.env.BLOCK_FORGE_SOURCE_DIR
  ? path.resolve(process.env.BLOCK_FORGE_SOURCE_DIR)
  : path.resolve(__dirname, '../../content/db/blocks')

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i

function blocksApiPlugin(): PluginOption {
  return {
    name: 'block-forge:blocks-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/blocks')) return next()

        try {
          // GET /api/blocks — list
          if (req.method === 'GET' && req.url === '/api/blocks') {
            const files = (await readdir(SOURCE_DIR)).filter((f) => f.endsWith('.json') && !f.endsWith('.bak'))
            const list = await Promise.all(
              files.map(async (f) => {
                const raw = await readFile(path.join(SOURCE_DIR, f), 'utf8')
                const parsed = JSON.parse(raw)
                return { slug: parsed.slug as string, name: (parsed.name as string) ?? parsed.slug, filename: f }
              }),
            )
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ sourceDir: SOURCE_DIR, blocks: list }))
            return
          }

          // GET /api/blocks/:slug — read one
          const match = /^\/api\/blocks\/([a-zA-Z0-9][a-zA-Z0-9-]*)$/.exec(req.url)
          if (req.method === 'GET' && match) {
            const slug = match[1]
            if (!SAFE_SLUG.test(slug)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid-slug' }))
              return
            }
            // Find the file: either slug.json OR any file whose JSON content has this slug.
            // Phase 0 §0.4 shows the 4 real blocks have filename == slug, so direct lookup first.
            const direct = path.join(SOURCE_DIR, `${slug}.json`)
            const raw = await readFile(direct, 'utf8').catch(() => null)
            if (raw === null) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'not-found', slug }))
              return
            }
            res.setHeader('content-type', 'application/json')
            res.end(raw)
            return
          }

          // 405 for unsupported methods (POST/PUT/DELETE land Phase 4)
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'method-not-allowed', method: req.method }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'server-error', message: err instanceof Error ? err.message : String(err) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), blocksApiPlugin()],
  server: {
    port: 7702,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['@cmsmasters/block-forge-core'],
  },
})
```

**Note on `__dirname`:** in Vite config (loaded as ESM), `__dirname` is NOT auto-defined. Use `import.meta.dirname` (Node 20.11+) or `fileURLToPath(import.meta.url)` + `path.dirname`. Check Node version at install time (`node --version`) — if it's 20.11+, `import.meta.dirname` works directly; else use the fileURLToPath path. LM's `runtime/index.ts:33` uses `import.meta.dirname` successfully, so the same should work here.

**Safety:**
- Source dir is fixed at startup — no query-param override. If a user sets `BLOCK_FORGE_SOURCE_DIR` before `npm run dev`, that absolute path wins.
- Slug regex rejects `..`, `/`, `\`, uppercase control chars.
- Phase 4 will extend this plugin with POST handling; the slug guard stays.

### 2.5 — `src/lib/api-client.ts`

Browser-side fetch wrappers. Tiny surface, no deps.

```ts
import type { BlockJson } from '../types'

export type BlockListEntry = { slug: string; name: string; filename: string }
export type BlockListResponse = { sourceDir: string; blocks: BlockListEntry[] }

export async function listBlocks(): Promise<BlockListResponse> {
  const res = await fetch('/api/blocks')
  if (!res.ok) throw new Error(`listBlocks failed: ${res.status}`)
  return res.json() as Promise<BlockListResponse>
}

export async function getBlock(slug: string): Promise<BlockJson> {
  const res = await fetch(`/api/blocks/${encodeURIComponent(slug)}`)
  if (!res.ok) throw new Error(`getBlock(${slug}) failed: ${res.status}`)
  return res.json() as Promise<BlockJson>
}
```

No schema validation on browser side — the server (via file-io.ts indirectly, or directly via JSON.parse) already schema-guards. Browser trusts the server's response shape.

### 2.6 — `src/components/BlockPicker.tsx`

```tsx
import { useEffect, useState } from 'react'
import type { BlockListEntry } from '../lib/api-client'
import { listBlocks } from '../lib/api-client'

type Props = {
  selected: string | null
  onSelect: (slug: string) => void
}

export function BlockPicker({ selected, onSelect }: Props) {
  const [blocks, setBlocks] = useState<BlockListEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listBlocks()
      .then((r) => setBlocks(r.blocks))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  if (error) {
    return (
      <div className="text-sm text-[hsl(var(--status-danger-fg))]">
        Failed to load blocks: {error}
      </div>
    )
  }

  return (
    <label className="flex items-center gap-3">
      <span className="text-sm text-[hsl(var(--text-muted))]">Block:</span>
      <select
        value={selected ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-base))] px-3 py-1 text-sm text-[hsl(var(--text-primary))]"
      >
        <option value="" disabled>
          {blocks.length === 0 ? 'Loading…' : 'Select a block'}
        </option>
        {blocks.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name} ({b.slug})
          </option>
        ))}
      </select>
    </label>
  )
}
```

**Token grep before coding:** verify `--status-danger-fg` and `--bg-base` exist in `tokens.css`. If `--bg-base` doesn't exist (the hotfix result log only mentioned `--bg-page`), use `--bg-page` or the nearest form card background token. No invention.

### 2.7 — `src/components/PreviewPanel.tsx`

Single iframe at a given width. Uses `composeSrcDoc`. Listens for postMessage height sync.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BlockJson } from '../types'
import { composeSrcDoc } from '../lib/preview-assets'

type Props = {
  block: BlockJson
  width: number
  label: string
}

export function PreviewPanel({ block, width, label }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState<number>(600)

  const srcDoc = useMemo(
    () =>
      composeSrcDoc({
        html: block.html,
        css: block.css,
        js: block.js,
        width,
        slug: block.slug,
      }),
    [block.html, block.css, block.js, block.slug, width],
  )

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      const d = ev.data as { type?: string; slug?: string; width?: number; height?: number }
      if (d?.type === 'block-forge:iframe-height' && d.slug === block.slug && d.width === width && typeof d.height === 'number') {
        setIframeHeight(d.height)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [block.slug, width])

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-[hsl(var(--text-muted))]">
        {label} · {width}px
      </div>
      <div
        className="overflow-hidden rounded border border-[hsl(var(--border-default))]"
        style={{ width }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={`${block.slug}-${width}`}
          sandbox="allow-scripts allow-same-origin"
          style={{ width, height: iframeHeight, border: 0, display: 'block' }}
        />
      </div>
    </div>
  )
}
```

**Inline style legitimacy:** the two `style={{ width, ... }}` objects here are truly dynamic (computed height, per-panel width). Per CONVENTIONS that's the allowed escape for dynamic values. All static styling stays in Tailwind classes.

**Sandbox:** `allow-scripts allow-same-origin` matches LM's iframe setup. `same-origin` is required for Google Fonts `<link>` loading inside srcdoc.

### 2.8 — `src/components/PreviewTriptych.tsx`

```tsx
import type { BlockJson } from '../types'
import { PreviewPanel } from './PreviewPanel'

const BREAKPOINTS = [
  { label: 'Desktop', width: 1440 },
  { label: 'Tablet', width: 768 },
  { label: 'Mobile', width: 375 },
] as const

type Props = {
  block: BlockJson | null
}

export function PreviewTriptych({ block }: Props) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--text-muted))]">
        Select a block to preview
      </div>
    )
  }

  return (
    <div className="flex gap-6 overflow-auto p-4">
      {BREAKPOINTS.map((bp) => (
        <PreviewPanel key={bp.width} block={block} width={bp.width} label={bp.label} />
      ))}
    </div>
  )
}
```

Horizontal scroll is expected on viewport < 1440+768+375+gaps (~2623px total). MVP doesn't auto-scale — authors scroll. Phase 2+ can add scale-to-fit if it becomes annoying.

### 2.9 — `src/App.tsx` — wire picker + triptych

Replace the `<section data-region="triptych">` placeholder with actual picker + triptych. Keep the suggestions/status placeholders as-is (Phase 3/4 wiring).

```tsx
import { useEffect, useState } from 'react'
import type { BlockJson } from './types'
import { getBlock } from './lib/api-client'
import { BlockPicker } from './components/BlockPicker'
import { PreviewTriptych } from './components/PreviewTriptych'

export function App() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [block, setBlock] = useState<BlockJson | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSlug) {
      setBlock(null)
      return
    }
    setLoadError(null)
    getBlock(selectedSlug)
      .then(setBlock)
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)))
  }, [selectedSlug])

  return (
    <div className="grid h-screen grid-rows-[auto_1fr_auto] bg-[hsl(var(--bg-page))] text-[hsl(var(--text-primary))]">
      <header className="flex items-center gap-6 border-b border-[hsl(var(--border-default))] px-6 py-3">
        <strong className="font-semibold">Block Forge</strong>
        <BlockPicker selected={selectedSlug} onSelect={setSelectedSlug} />
        {loadError && (
          <span className="text-sm text-[hsl(var(--status-danger-fg))]">{loadError}</span>
        )}
      </header>

      <main className="grid grid-cols-[1fr_360px] overflow-hidden">
        <section
          data-region="triptych"
          className="overflow-auto border-r border-[hsl(var(--border-default))]"
        >
          <PreviewTriptych block={block} />
        </section>
        <aside data-region="suggestions" className="p-6">
          <em className="text-sm text-[hsl(var(--text-muted))]">
            Suggestion list — Phase 3 placeholder
          </em>
        </aside>
      </main>

      <footer
        data-region="status"
        className="border-t border-[hsl(var(--border-default))] px-6 py-2"
      >
        <em className="text-sm text-[hsl(var(--text-muted))]">
          Status bar — Phase 4 placeholder
        </em>
      </footer>
    </div>
  )
}
```

### 2.10 — `tools/block-forge/PARITY.md` (SEED)

Mirror the discipline-shape of `tools/layout-maker/PARITY-LOG.md` but scoped to block-forge's concerns. Seed with the initial contract so Phase 2's preview surface starts from a documented baseline.

```markdown
# Block Forge Preview Parity Contract

> Source of truth for what block-forge's preview iframe injects and why.
> Every change to `src/lib/preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (as of Phase 2 seed, WP-026)

### Token injection (inside `@layer tokens`)
1. `packages/ui/src/theme/tokens.css` — portal design-system tokens (semantic colors, typography scale, spacing, radii, shadows)
2. `packages/ui/src/theme/tokens.responsive.css` — WP-024 clamp-based responsive companion (currently 2-token scaffold; WP-029 populates)

### Reset layer (`@layer reset`)
- Box-sizing + margin/padding normalize
- `body { font-family: 'Manrope', system-ui, sans-serif; width: {renderWidth}px; overflow: hidden; background: white; }`

### Shared layer (`@layer shared`)
1. `packages/ui/src/portal/portal-blocks.css` — shared component classes from ADR-024
2. `.slot-inner { container-type: inline-size; container-name: slot; }` — inline containment rule matching portal's theme-page hierarchy (see `tools/layout-maker/runtime/lib/css-generator.ts:254-255`)

### Block layer (`@layer block`)
- Per-block CSS from `block.css`

### DOM hierarchy in iframe body
```
<div class="slot-inner">                   ← containment context (inline-size, name=slot)
  <div data-block-shell="{slug}">          ← portal-parity block wrapper
    {block.html}
  </div>
</div>
```

Matches portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper. LM does NOT wrap (legacy blocks use @media, not @container slot) — block-forge's divergence from LM is deliberate.

### Runtime injection (after body)
- `packages/ui/src/portal/animate-utils.js` — ADR-023 animation layer
- Block's own `block.js` (if present)
- ResizeObserver → `postMessage({ type: 'block-forge:iframe-height', slug, width, height })` for parent-panel height sync

### Canonical breakpoints
- Desktop: 1440px
- Tablet: 768px
- Mobile: 375px

### Out of scope (explicit)
- Theme-page chrome (header, nav, footer, layout grid) — block-forge previews blocks in isolation
- Any `[data-slot="…"]` outer grid rules from layout-maker — block-forge doesn't reconstruct the layout, only the slot-inner containment context
- Variants — composeVariants output is Phase 3+ territory; this contract covers single-block base rendering only

## Discipline (PARITY-LOG equivalent)

1. Before proposing a change to `preview-assets.ts` or iframe composition, re-read this file.
2. When a divergence from portal render is observed, log it in an "Open Divergences" section below BEFORE debugging — filling in where the lie lives is half the fix.
3. When closing a divergence, move it to "Fixed" with commit SHA AND add a contract test in `preview-assets.test.ts`.
4. When changing the token list, @layer order, slot wrapper, or runtime injection, update the Contract section above in the same commit as the code.

## Open Divergences

_(none at Phase 2 seed)_

## Fixed

_(empty)_
```

Seed only; Phases 3–4 won't touch it unless a real divergence surfaces.

### 2.11 — Domain manifest — add Phase 2 owned_files

Append to `infra-tooling.owned_files`:

```ts
'tools/block-forge/src/lib/preview-assets.ts',
'tools/block-forge/src/lib/paths.ts',
'tools/block-forge/src/lib/api-client.ts',
'tools/block-forge/src/components/BlockPicker.tsx',
'tools/block-forge/src/components/PreviewPanel.tsx',
'tools/block-forge/src/components/PreviewTriptych.tsx',
'tools/block-forge/src/__tests__/preview-assets.test.ts',
'tools/block-forge/PARITY.md',
```

**8 new owned_files.** Expected arch-test baseline: 455 + 8 = **463 / 0**.

The `vite.config.ts` was already owned in Phase 1 — editing it in-place (task 2.4) doesn't change manifest.

---

## Verification

```bash
npm run arch-test                                        # 463/0
npm run typecheck                                        # clean
cd tools/block-forge && npm run typecheck                # clean
cd tools/block-forge && npm test                         # file-io 14/14 + preview-assets 9/9 = 23/23
cd tools/block-forge && npm run build                    # Vite build succeeds
cd tools/block-forge && npm run dev                      # :7702 live
```

**API smoke tests (dev server running):**
```bash
curl -s http://localhost:7702/api/blocks | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('blocks:', r.blocks.length, 'sourceDir:', r.sourceDir)"
# Expected: blocks: 4, sourceDir ends with content/db/blocks

curl -s http://localhost:7702/api/blocks/header | node -e "const r=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('slug:', r.slug, 'html-len:', r.html.length)"
# Expected: slug: header, html-len > 0

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7702/api/blocks/../../../etc/passwd
# Expected: 400 (slug regex rejects)

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7702/api/blocks/nonexistent-slug
# Expected: 404

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:7702/api/blocks/header
# Expected: 405 (POST not wired until Phase 4)
```

**Browser parity check (OBLIGATORY — Phase 2 gate):**
1. Open http://localhost:7702/.
2. Pick `header` from the dropdown.
3. Three iframes load at 1440 / 768 / 375.
4. DevTools on the 1440 iframe → Elements → confirm:
   - `body > div.slot-inner > div[data-block-shell="header"] > <block content>` hierarchy.
   - `.slot-inner` computed styles include `container-type: inline-size` and `container-name: slot`.
   - `@layer` order appears in the `<style>` block exactly as `@layer tokens, reset, shared, block`.
   - A token var like `--bg-page` resolves to a real HSL color in computed styles.
5. Screenshot all three panels: `tools/block-forge/phase-2-preview-verification.png` (gitignored via .gitignore added in hotfix).
6. **Parity vs portal:** navigate to the currently-published page on the live portal that contains the `header` block. Take a screenshot of the header block as rendered there. Compare side-by-side to block-forge's 1440 panel:
   - Same typography, spacing, colors (modulo theme-page chrome around it).
   - Same hover states if applicable.
   - If divergence found, log in PARITY.md's "Open Divergences" section and STOP — don't fix in this phase; flag for a Phase 2.x hotfix.

Record the parity check outcome in the result log with links to both screenshots (stored as working-tree PNGs, not committed).

---

## Result Log Structure

Write `logs/wp-026/phase-2-result.md`:

```markdown
# WP-026 Phase 2 — Preview + Picker Result

**Date:** 2026-04-23
**Duration:** <minutes>
**Commit(s):** <sha list>
**Arch-test:** 463 / 0
**Test totals:** file-io 14/14 + preview-assets 9/9 = 23/23

## What Shipped

- 8 new files (list)
- `vite.config.ts` — +`blocksApiPlugin` (inline)
- `App.tsx` — picker + triptych wired; suggestions/status placeholders unchanged

## API Smoke Tests

<curl outputs for list/read/traversal/404/405>

## Parity Check (OBLIGATORY)

- Block chosen: `<slug>`
- block-forge 1440 screenshot: `tools/block-forge/phase-2-preview-verification.png`
- Portal reference URL: `<url>`
- Portal screenshot: `<path>`
- Side-by-side verdict: **match** / **divergence** (+ description, PARITY.md entry SHA)

## PARITY.md

Seeded with initial contract. Zero open divergences (or: <N> logged with details).

## Deviations

<e.g., token rename discovered, plugin had to be split out due to size>

## Plan Corrections

<Usually empty.>

## Ready for Phase 3

<Confirm core-engine wiring + SuggestionList are unblocked.>
```

---

## Verification Before Writing Result Log

- [ ] All 23 tests pass.
- [ ] `npm run arch-test` = 463/0.
- [ ] All 5 API smoke curls return expected status codes.
- [ ] DevTools computed-styles check on iframe body hierarchy matches PARITY.md contract.
- [ ] Parity check done against a real portal-rendered block; outcome recorded.
- [ ] PARITY.md committed with the `preview-assets.ts` commit (same SHA).
- [ ] Zero inline styles in block-forge code except the two dynamic ones in PreviewPanel (width + height).
- [ ] No `@cmsmasters/block-forge-core` imports yet.
- [ ] No POST/PUT/DELETE wiring in the Vite plugin.
- [ ] No file writes under `content/db/blocks/`.

## After Writing

Report back with:
1. Commit SHA(s) — including the SHA-embed commit.
2. Arch-test count (expected 463/0).
3. Test totals (expected 23/23).
4. API smoke results (all 5 curls).
5. Parity check verdict — **match** or **divergence** with PARITY.md excerpt.
6. Deviations and Plan Corrections (if any).

---

**Brain contract:** after reviewing Phase 2 result, Brain writes `logs/wp-026/phase-3-task.md` (core-engine wiring + SuggestionList + SuggestionRow + useAnalysis hook + integration test).
