/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { access, readdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 22+ has `import.meta.dirname`, but fallback via fileURLToPath keeps
// the config robust across Node versions and WSL/Windows path quirks.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
            const files = (await readdir(SOURCE_DIR)).filter(
              (f) => f.endsWith('.json') && !f.endsWith('.bak'),
            )
            const list = await Promise.all(
              files.map(async (f) => {
                const raw = await readFile(path.join(SOURCE_DIR, f), 'utf8')
                const parsed = JSON.parse(raw) as { slug?: string; name?: string }
                return {
                  slug: parsed.slug ?? '',
                  name: parsed.name ?? parsed.slug ?? '',
                  filename: f,
                }
              }),
            )
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ sourceDir: SOURCE_DIR, blocks: list }))
            return
          }

          // GET /api/blocks/:slug — read one
          const match = /^\/api\/blocks\/([^/?]+)$/.exec(req.url)
          if (req.method === 'GET' && match) {
            const slug = decodeURIComponent(match[1])
            if (!SAFE_SLUG.test(slug)) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid-slug' }))
              return
            }
            const direct = path.join(SOURCE_DIR, `${slug}.json`)
            const raw = await readFile(direct, 'utf8').catch(() => null)
            if (raw === null) {
              res.statusCode = 404
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'not-found', slug }))
              return
            }
            res.setHeader('content-type', 'application/json')
            res.end(raw)
            return
          }

          // POST /api/blocks/:slug — overwrite an existing block JSON + optional
          // .bak on first save per session (client decides via `requestBackup`).
          //
          // Safety (per Phase 0 §0.7 save-safety rules):
          //  (1) slug regex rejects `..`, `/`, `\`.
          //  (2) 404 if target doesn't exist — no file creation.
          //  (3) `.bak` contains the CURRENT disk bytes, pre-overwrite, verbatim.
          //  (4) Client is the single source of truth for "first-save-this-session"
          //      — server never consults its own state across requests.
          //  (5) Single-file scope — no recursive writes, no glob expansion.
          //  (6) Server is stateless; session lives in the browser.
          if (req.method === 'POST' && match) {
            const slug = decodeURIComponent(match[1])
            if (!SAFE_SLUG.test(slug)) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid-slug' }))
              return
            }
            const filepath = path.join(SOURCE_DIR, `${slug}.json`)

            // Reject if target doesn't exist — Phase 4 is overwrite-only.
            try {
              await access(filepath, constants.W_OK)
            } catch {
              res.statusCode = 404
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'not-found', slug }))
              return
            }

            // Read POST body.
            const chunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
              req.on('data', (c: Buffer) => chunks.push(c))
              req.on('end', () => resolve())
              req.on('error', reject)
            })
            const bodyRaw = Buffer.concat(chunks).toString('utf8')
            let body: Record<string, unknown>
            try {
              body = JSON.parse(bodyRaw) as Record<string, unknown>
            } catch {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid-body-json' }))
              return
            }

            const block = body.block
            const requestBackup = body.requestBackup === true
            if (typeof block !== 'object' || block === null) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'missing-block' }))
              return
            }
            const b = block as Record<string, unknown>
            if (
              typeof b.html !== 'string' ||
              typeof b.slug !== 'string' ||
              b.slug !== slug
            ) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'block-schema' }))
              return
            }

            // Back up (pre-overwrite bytes, verbatim) if client requested.
            let backupCreated = false
            if (requestBackup) {
              const currentBytes = await readFile(filepath)
              await writeFile(`${filepath}.bak`, currentBytes)
              backupCreated = true
            }

            // Write the new block (pretty-printed, trailing newline — mirrors
            // Phase 1 `writeBlock` precedent for consistent on-disk formatting).
            const serialized = JSON.stringify(block, null, 2) + '\n'
            await writeFile(filepath, serialized, 'utf8')

            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, slug, backupCreated }))
            return
          }

          // 405 for unsupported methods/paths.
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'method-not-allowed',
              method: req.method,
              url: req.url,
            }),
          )
        } catch (err) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'server-error',
              message: err instanceof Error ? err.message : String(err),
            }),
          )
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
  resolve: {
    // WP-028 Phase 2 — Dedupe React + Radix across tools/block-forge's own
    // node_modules AND the hoisted root node_modules. Slider (from @cmsmasters/ui)
    // imports react from the root workspace; block-forge also has react locally.
    // Without dedupe, two React copies load and Radix hooks hit `useRef: null`.
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      '@radix-ui/react-slider',
      '@radix-ui/react-dialog',
      '@radix-ui/react-slot',
    ],
    alias: {
      // Force resolution of React to root node_modules (same as @cmsmasters/ui consumers).
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // Defensive: pre-bundle the TS-source entrypoint of the workspace core package
    // so Vite dev server resolves it cleanly on first dev run (Phase 0 carry-over (b)).
    include: ['@cmsmasters/block-forge-core', 'react', 'react-dom', '@radix-ui/react-slider'],
  },
  test: {
    // Vitest mocks .css imports as empty strings by default, which breaks our
    // `?raw` imports in preview-assets.ts. `css: true` processes CSS through
    // Vite's pipeline so `?raw` returns the actual file content.
    css: true,
  },
})
