import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  getPageBlocks,
  upsertPageBlocks,
  getPageBlockCount,
} from '@cmsmasters/db'
import { pageSchema, updatePageSchema, pageBlockSchema } from '@cmsmasters/validators'
import { z } from 'zod'

const pages = new Hono<AuthEnv>()

// ── GET /pages — list all pages ──

pages.get(
  '/pages',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getPages(supabase)
    return c.json({ data })
  }
)

// ── GET /pages/:id — get page by ID ──

pages.get(
  '/pages/:id',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      const data = await getPageById(supabase, c.req.param('id'))
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Page not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── POST /pages — create page ──

pages.post(
  '/pages',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = pageSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await createPage(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      if (isDuplicate(err)) {
        return c.json({ error: `Page slug "${parsed.data.slug}" already exists` }, 409)
      }
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── PUT /pages/:id — update page ──

pages.put(
  '/pages/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updatePageSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await updatePage(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Page not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── DELETE /pages/:id — delete page (with dependency check) ──

pages.delete(
  '/pages/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const supabase = createServiceClient(c.env)

    const blockCount = await getPageBlockCount(supabase, id)
    if (blockCount > 0) {
      return c.json({ error: 'Page has blocks assigned. Remove them first.' }, 409)
    }

    try {
      await deletePage(supabase, id)
      return c.json({ deleted: true })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Page not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── GET /pages/:id/blocks — get ordered blocks for a page ──

pages.get(
  '/pages/:id/blocks',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getPageBlocks(supabase, c.req.param('id'))
    return c.json({ data })
  }
)

// ── PUT /pages/:id/blocks — replace all blocks for a page ──

pages.put(
  '/pages/:id/blocks',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = z.array(pageBlockSchema).safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    const data = await upsertPageBlocks(supabase, c.req.param('id'), parsed.data)
    return c.json({ data })
  }
)

// ── Supabase error mappers ──

function isNotFound(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'PGRST116'
  )
}

function isDuplicate(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  const code = 'code' in err ? (err as { code: string }).code : ''
  const message = err instanceof Error ? err.message : ''
  return code === '23505' || message.includes('duplicate key') || message.includes('unique')
}

export { pages }
