/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { access, copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Node 22+ has `import.meta.dirname`, but fallback via fileURLToPath keeps
// the config robust across Node versions and WSL/Windows path quirks.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// WP-035 Phase 3 — sandbox decouple. Default writeable target is now the
// Forge-local sandbox, NOT the production seed at content/db/blocks/.
// Override via BLOCK_FORGE_SOURCE_DIR for advanced workflows (escape hatch
// for legacy direct-edit). Phase 0 Ruling F collapsed Phase 4 — empirical
// grep confirmed BLOCK_FORGE_ALLOW_DIRECT_EDIT had zero callers.
const SANDBOX_DIR_DEFAULT = path.resolve(__dirname, 'blocks')
const PRODUCTION_SEED_DIR = path.resolve(__dirname, '../../content/db/blocks')

const SOURCE_DIR = process.env.BLOCK_FORGE_SOURCE_DIR
  ? path.resolve(process.env.BLOCK_FORGE_SOURCE_DIR)
  : SANDBOX_DIR_DEFAULT

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/i

export type SeedResult = {
  seeded: boolean
  filesCopied: number
  reason?: string
}

export type CloneResult =
  | { ok: true; sourceSlug: string; newSlug: string }
  | { ok: false; error: string; status: number; sourceSlug?: string }

// Pure helper for the Clone HTTP handler. Validates the source slug,
// reads + parses the source file, strips `id`, finds the first unused
// `<slug>-copy-N` (1..99), and atomically writes the cloned payload using
// the 'wx' flag (race-safe).
export async function performCloneInSandbox(
  sandboxDir: string,
  sourceSlug: unknown,
): Promise<CloneResult> {
  if (typeof sourceSlug !== 'string' || !SAFE_SLUG.test(sourceSlug)) {
    return { ok: false, error: 'invalid-source-slug', status: 400 }
  }

  const sourcePath = path.join(sandboxDir, `${sourceSlug}.json`)
  const sourceRaw = await readFile(sourcePath, 'utf8').catch(() => null)
  if (sourceRaw === null) {
    return { ok: false, error: 'source-not-found', status: 404, sourceSlug }
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(sourceRaw) as Record<string, unknown>
  } catch {
    return {
      ok: false,
      error: 'source-parse-failed',
      status: 500,
      sourceSlug,
    }
  }

  const { id: _droppedId, ...rest } = parsed

  const MAX_N = 99
  for (let n = 1; n <= MAX_N; n++) {
    const candidate = `${sourceSlug}-copy-${n}`
    if (!SAFE_SLUG.test(candidate)) continue
    const candidatePath = path.join(sandboxDir, `${candidate}.json`)
    const cloned = { ...rest, slug: candidate }
    const serialized = JSON.stringify(cloned, null, 2) + '\n'
    try {
      await writeFile(candidatePath, serialized, {
        flag: 'wx',
        encoding: 'utf8',
      })
      return { ok: true, sourceSlug, newSlug: candidate }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'EEXIST') continue
      throw err
    }
  }
  return { ok: false, error: 'no-available-suffix', status: 409, sourceSlug }
}

// First-run seed — copies content/db/blocks/*.json into sandbox iff sandbox
// is empty. Runs once at configureServer boot. Never overwrites existing
// sandbox files (silent data-loss guard per saved memory feedback_no_blocker_no_ask).
export async function seedSandboxIfEmpty(
  sandboxDir: string,
  seedDir: string,
  sandboxDefault: string = SANDBOX_DIR_DEFAULT,
): Promise<SeedResult> {
  // Skip if SOURCE_DIR is overridden — user opted out of sandbox semantics.
  if (sandboxDir !== sandboxDefault) {
    return {
      seeded: false,
      filesCopied: 0,
      reason: 'BLOCK_FORGE_SOURCE_DIR override active',
    }
  }

  await mkdir(sandboxDir, { recursive: true })

  // Sandbox is "empty" iff no .json files (ignore .gitkeep + .bak).
  const existing = await readdir(sandboxDir)
  const populated = existing.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.bak'),
  )
  if (populated.length > 0) {
    return { seeded: false, filesCopied: 0, reason: 'sandbox already populated' }
  }

  try {
    await access(seedDir, constants.R_OK)
  } catch {
    return {
      seeded: false,
      filesCopied: 0,
      reason: `seed source ${seedDir} unreadable`,
    }
  }

  const seedFiles = (await readdir(seedDir)).filter(
    (f) => f.endsWith('.json') && !f.endsWith('.bak'),
  )
  let copied = 0
  for (const f of seedFiles) {
    await copyFile(
      path.join(seedDir, f),
      path.join(sandboxDir, f),
      // COPYFILE_EXCL — fail if target exists; defensive against race + symlinks
      // (we already verified sandbox empty above).
      constants.COPYFILE_EXCL,
    )
    copied++
  }
  return { seeded: true, filesCopied: copied }
}

function blocksApiPlugin(): PluginOption {
  return {
    name: 'block-forge:blocks-api',
    async configureServer(server) {
      // First-run seed (one-time per process; HMR does not re-run configureServer).
      const seedResult = await seedSandboxIfEmpty(SOURCE_DIR, PRODUCTION_SEED_DIR)
      if (seedResult.seeded) {
        server.config.logger.info(
          `[block-forge] Sandbox seeded with ${seedResult.filesCopied} blocks from ${PRODUCTION_SEED_DIR}`,
        )
      } else if (seedResult.reason) {
        server.config.logger.info(
          `[block-forge] Sandbox seed skipped: ${seedResult.reason}`,
        )
      }

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

          // POST /api/blocks/clone — duplicate an existing block with auto-
          // incrementing `<slug>-copy-N` suffix. WP-035 Phase 3.
          //
          // Always writes to SOURCE_DIR (sandbox by default). Core logic lives
          // in `performCloneInSandbox` (top-level export, unit-tested directly).
          if (req.method === 'POST' && req.url === '/api/blocks/clone') {
            const chunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
              req.on('data', (c: Buffer) => chunks.push(c))
              req.on('end', () => resolve())
              req.on('error', reject)
            })
            const bodyRaw = Buffer.concat(chunks).toString('utf8')
            let body: { sourceSlug?: string }
            try {
              body = JSON.parse(bodyRaw) as { sourceSlug?: string }
            } catch {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: 'invalid-body-json' }))
              return
            }

            const result = await performCloneInSandbox(SOURCE_DIR, body.sourceSlug)
            if (!result.ok) {
              res.statusCode = result.status
              res.setHeader('content-type', 'application/json')
              const payload: Record<string, unknown> = { error: result.error }
              if (result.sourceSlug) payload.sourceSlug = result.sourceSlug
              res.end(JSON.stringify(payload))
              return
            }

            res.statusCode = 201
            res.setHeader('content-type', 'application/json')
            res.end(
              JSON.stringify({
                ok: true,
                sourceSlug: result.sourceSlug,
                newSlug: result.newSlug,
              }),
            )
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

            // Reject if target doesn't exist — overwrite-only contract.
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
