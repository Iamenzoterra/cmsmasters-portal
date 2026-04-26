/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { access, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 22+ has `import.meta.dirname`, but fallback via fileURLToPath keeps
// the config robust across Node versions and WSL/Windows path quirks.
// Mirrors tools/block-forge/vite.config.ts:11.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Phase 6 — fixed paths to the SOT (responsive-config.json) and the cascade
// override file (tokens.responsive.css). Both live in packages/ui/src/theme/.
const CONFIG_PATH = path.resolve(
  __dirname,
  '../../packages/ui/src/theme/responsive-config.json',
)
const CSS_PATH = path.resolve(
  __dirname,
  '../../packages/ui/src/theme/tokens.responsive.css',
)

/**
 * Phase 6 — Vite dev-server middleware that mirrors block-forge's
 * `blocksApiPlugin` save-safety pattern (6 rules, infra-tooling SKILL):
 *
 *   1. Read-guards on payload   — body validated for shape; rejected with 400
 *   2. First-save .bak/session  — client owns the flag (`requestBackup` field)
 *   3. Single-file scope        — TWO fixed paths only (config.json + css)
 *   4. No deletes               — server never deletes either file
 *   5. Server stateless         — no cross-request state
 *   6. Two-write atomicity      — JSON first, then CSS (V1 trade-off; PF.40)
 *
 * Endpoints:
 *   GET  /api/load-config  — returns current responsive-config.json (404 → null)
 *   POST /api/save-config  — body { config, cssOutput, requestBackup }
 *
 * Save flow (POST):
 *   a. Validate body shape  (config: object, cssOutput: string, requestBackup: boolean)
 *   b. If requestBackup: write `.bak` of CURRENT bytes for whichever file exists.
 *      responsive-config.json `.bak` is SKIPPED on truly-first-save (file didn't
 *      exist yet — see PF.34). tokens.responsive.css `.bak` is always created
 *      on first save (preserves the WP-024 scaffold for rollback).
 *   c. Write new responsive-config.json (`JSON.stringify(config, null, 2) + '\n'`).
 *   d. Write new tokens.responsive.css (already-headered cssOutput from client).
 *   e. Return { ok: true, savedAt, backupCreated }.
 */
function responsiveConfigApiPlugin(): PluginOption {
  return {
    name: 'responsive-tokens-editor:config-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/load-config') && !req.url?.startsWith('/api/save-config')) {
          return next()
        }

        try {
          // GET /api/load-config — read responsive-config.json (404 → null)
          if (req.method === 'GET' && req.url === '/api/load-config') {
            const raw = await readFile(CONFIG_PATH, 'utf8').catch(() => null)
            if (raw === null) {
              res.statusCode = 404
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'not-found' }))
              return
            }
            try {
              const config = JSON.parse(raw) as Record<string, unknown>
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: true, config }))
            } catch {
              res.statusCode = 500
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'invalid-json-on-disk' }))
            }
            return
          }

          // POST /api/save-config — overwrite responsive-config.json + tokens.responsive.css
          if (req.method === 'POST' && req.url === '/api/save-config') {
            // Read POST body
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
              res.end(JSON.stringify({ ok: false, error: 'invalid-body-json' }))
              return
            }

            // Validate body shape (Rule 1 — read-guards on payload)
            const config = body.config
            const cssOutput = body.cssOutput
            const requestBackup = body.requestBackup === true
            if (typeof config !== 'object' || config === null) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'missing-config' }))
              return
            }
            if (typeof cssOutput !== 'string' || cssOutput.length === 0) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ ok: false, error: 'missing-cssOutput' }))
              return
            }

            // First-save .bak per session (Rule 2). `.bak` of CURRENT bytes,
            // pre-overwrite, verbatim — matches block-forge L77 + L143-145.
            // responsive-config.json `.bak` is SKIPPED on truly-first-save when
            // file didn't exist yet (PF.34).
            let backupCreated = false
            if (requestBackup) {
              // Try config .bak (skip silently if not yet existing)
              const cfgExists = await access(CONFIG_PATH, constants.R_OK)
                .then(() => true)
                .catch(() => false)
              if (cfgExists) {
                const currentCfg = await readFile(CONFIG_PATH)
                await writeFile(`${CONFIG_PATH}.bak`, currentCfg)
                backupCreated = true
              }
              // CSS .bak — file always exists since WP-024 scaffold
              const cssExists = await access(CSS_PATH, constants.R_OK)
                .then(() => true)
                .catch(() => false)
              if (cssExists) {
                const currentCss = await readFile(CSS_PATH)
                await writeFile(`${CSS_PATH}.bak`, currentCss)
                backupCreated = true
              }
            }

            // Write the JSON SOT (pretty-printed, trailing newline).
            const cfgSerialized = JSON.stringify(config, null, 2) + '\n'
            await writeFile(CONFIG_PATH, cfgSerialized, 'utf8')

            // Write the regenerated CSS (already includes header from client).
            await writeFile(CSS_PATH, cssOutput, 'utf8')

            const savedAt = new Date().toISOString()
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, savedAt, backupCreated }))
            return
          }

          // 405 for unsupported methods/paths under /api/(load|save)-config
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              ok: false,
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
              ok: false,
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
  plugins: [react(), responsiveConfigApiPlugin()],
  server: {
    port: 7703,
    strictPort: true,
  },
  test: {
    // Vitest mocks .css imports as empty strings by default, which breaks
    // `?raw` imports in Phase 4 generator tests. `css: true` processes CSS
    // through Vite's pipeline so `?raw` returns the actual file content.
    // (saved memory feedback_vitest_css_raw + infra-tooling SKILL trap)
    css: true,
    // Phase 3: hooks @testing-library/jest-dom matchers into expect.
    // Per-file `// @vitest-environment jsdom` directive on component tests
    // (PF.7 — block-forge precedent; do NOT set environment globally).
    setupFiles: ['./src/setupTests.ts'],
  },
})
