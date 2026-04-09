import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

/**
 * Presets are stored in R2 as JSON files:
 *   presets/{type}/{slug}.json
 *
 * Each file contains: { name: string, items: Array<{icon_url, label, value}> }
 *
 * Types: "theme-details", "help-and-support"
 */

const VALID_TYPES = ['theme-details', 'help-and-support'] as const

const presets = new Hono<AuthEnv>()

// ── GET /presets/:type — list all presets for a type ──

presets.get('/presets/:type', authMiddleware, async (c) => {
  const type = c.req.param('type')
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return c.json({ error: 'Invalid type. Use: theme-details, help-and-support' }, 400)
  }

  const bucket = c.env.ASSETS_BUCKET
  const prefix = `presets/${type}/`

  const listed = (await bucket.list({ prefix })) as {
    objects: Array<{ key: string }>
    truncated: boolean
  }

  const results: Array<{ slug: string; name: string }> = []

  for (const obj of listed.objects) {
    const match = obj.key.match(/^presets\/[^/]+\/(.+)\.json$/)
    if (!match) continue
    try {
      const data = await bucket.get(obj.key) as { text(): Promise<string> } | null
      if (!data) continue
      const parsed = JSON.parse(await data.text()) as { name?: string }
      results.push({ slug: match[1], name: parsed.name ?? match[1] })
    } catch {
      results.push({ slug: match[1], name: match[1] })
    }
  }

  return c.json({ presets: results.sort((a, b) => a.name.localeCompare(b.name)) })
})

// ── GET /presets/:type/:slug — get a single preset ──

presets.get('/presets/:type/:slug', authMiddleware, async (c) => {
  const { type, slug } = c.req.param()
  if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
    return c.json({ error: 'Invalid type' }, 400)
  }

  const key = `presets/${type}/${slug}.json`
  const data = await c.env.ASSETS_BUCKET.get(key) as { text(): Promise<string> } | null
  if (!data) return c.json({ error: 'Preset not found' }, 404)

  const parsed = JSON.parse(await data.text())
  return c.json(parsed)
})

// ── POST /presets/:type — save a preset ──

presets.post(
  '/presets/:type',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const type = c.req.param('type')
    if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return c.json({ error: 'Invalid type' }, 400)
    }

    const body = await c.req.json<{
      name: string
      items: Array<{ icon_url: string; label: string; value: string }>
    }>()

    if (!body.name || typeof body.name !== 'string') {
      return c.json({ error: 'name is required' }, 400)
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return c.json({ error: 'items array is required and must not be empty' }, 400)
    }

    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) return c.json({ error: 'Invalid name' }, 400)

    const key = `presets/${type}/${slug}.json`
    const payload = JSON.stringify({ name: body.name, items: body.items })

    await c.env.ASSETS_BUCKET.put(key, payload, {
      httpMetadata: { contentType: 'application/json' },
    })

    return c.json({ slug, name: body.name })
  }
)

// ── DELETE /presets/:type/:slug — delete a preset ──

presets.delete(
  '/presets/:type/:slug',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const { type, slug } = c.req.param()
    if (!VALID_TYPES.includes(type as typeof VALID_TYPES[number])) {
      return c.json({ error: 'Invalid type' }, 400)
    }

    const key = `presets/${type}/${slug}.json`
    const existing = await c.env.ASSETS_BUCKET.head(key)
    if (!existing) return c.json({ error: 'Not found' }, 404)

    await c.env.ASSETS_BUCKET.delete(key)
    return c.json({ ok: true })
  }
)

export { presets }
