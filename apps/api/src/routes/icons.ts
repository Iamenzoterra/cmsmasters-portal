import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import type { Env } from '../env'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

const icons = new Hono<AuthEnv>()

// ── Types ──

interface IconItem {
  key: string
  url: string
  name: string
  category: string
}

interface IconCategory {
  name: string
  icons: IconItem[]
}

// ── GET /icons — list all icons grouped by category ──

icons.get('/icons', authMiddleware, async (c) => {
  const bucket = c.env.ASSETS_BUCKET
  const publicUrl = c.env.R2_PUBLIC_URL || ''

  const allObjects: Array<{ key: string }> = []
  let cursor: string | undefined
  let truncated = true

  // Paginate through all objects under icons/ prefix
  while (truncated) {
    const listed = (await bucket.list({
      prefix: 'icons/',
      cursor,
    })) as { objects: Array<{ key: string }>; truncated: boolean; cursor?: string }

    allObjects.push(...listed.objects)
    truncated = listed.truncated
    cursor = listed.cursor
  }

  // Parse keys into IconItems and group by category
  const categoryMap = new Map<string, IconItem[]>()

  for (const obj of allObjects) {
    const match = obj.key.match(/^icons\/([^/]+)\/(.+)\.svg$/)
    if (!match) continue

    const [, category, name] = match
    const item: IconItem = {
      key: obj.key,
      url: `${publicUrl}/${obj.key}`,
      name,
      category,
    }

    const existing = categoryMap.get(category)
    if (existing) {
      existing.push(item)
    } else {
      categoryMap.set(category, [item])
    }
  }

  // Sort categories and icons alphabetically
  const categories: IconCategory[] = [...categoryMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, items]) => ({
      name,
      icons: items.sort((a, b) => a.name.localeCompare(b.name)),
    }))

  return c.json({ categories })
})

// ── POST /icons — upload an SVG icon ──

icons.post(
  '/icons',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const category = formData.get('category')

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'file field is required' }, 400)
    }

    if (!category || typeof category !== 'string') {
      return c.json({ error: 'category field is required' }, 400)
    }

    // Validate category slug
    if (!/^[a-z0-9-]+$/.test(category) || category.length > 50) {
      return c.json({ error: 'category must be lowercase alphanumeric with hyphens, max 50 chars' }, 400)
    }

    // Validate SVG mime type
    if (file.type !== 'image/svg+xml') {
      return c.json({ error: 'Only SVG files are accepted (image/svg+xml)' }, 400)
    }

    // Validate size (100KB max)
    if (file.size > 100 * 1024) {
      return c.json({ error: 'SVG file must be under 100KB' }, 400)
    }

    const buffer = await file.arrayBuffer()

    // Slugify original filename
    const baseName = file.name.replace(/\.svg$/i, '')
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!slug) {
      return c.json({ error: 'Invalid filename — cannot derive a valid slug' }, 400)
    }

    const key = `icons/${category}/${slug}.svg`
    const bucket = c.env.ASSETS_BUCKET
    const publicUrl = c.env.R2_PUBLIC_URL || ''

    // Check if already exists
    const existing = await bucket.head(key)
    if (existing) {
      return c.json({ url: `${publicUrl}/${key}`, key })
    }

    await bucket.put(key, buffer, {
      httpMetadata: { contentType: 'image/svg+xml' },
    })

    return c.json({ url: `${publicUrl}/${key}`, key })
  }
)

// ── DELETE /icons/:category/:name — delete an icon ──

icons.delete(
  '/icons/:category/:name',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const { category, name } = c.req.param()
    const key = `icons/${category}/${name}.svg`
    const bucket = c.env.ASSETS_BUCKET

    // Check existence first
    const existing = await bucket.head(key)
    if (!existing) {
      return c.json({ error: 'Icon not found' }, 404)
    }

    await bucket.delete(key)
    return c.json({ ok: true })
  }
)

export { icons }
