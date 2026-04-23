/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { readdir, readFile } from 'node:fs/promises'
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

          // 405 for unsupported methods/paths (POST/PUT/DELETE land Phase 4)
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
  optimizeDeps: {
    // Defensive: pre-bundle the TS-source entrypoint of the workspace core package
    // so Vite dev server resolves it cleanly on first dev run (Phase 0 carry-over (b)).
    include: ['@cmsmasters/block-forge-core'],
  },
  test: {
    // Vitest mocks .css imports as empty strings by default, which breaks our
    // `?raw` imports in preview-assets.ts. `css: true` processes CSS through
    // Vite's pipeline so `?raw` returns the actual file content.
    css: true,
  },
})
