import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getGlobalElements,
  createGlobalElement,
  updateGlobalElement,
  deleteGlobalElement,
  resolveGlobalElementsForPage,
} from '@cmsmasters/db'
import { globalElementSchema, updateGlobalElementSchema } from '@cmsmasters/validators'

const globalElements = new Hono<AuthEnv>()

// ── GET /global-elements — list all with blocks ──

globalElements.get(
  '/global-elements',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getGlobalElements(supabase)
    return c.json({ data })
  }
)

// ── GET /global-elements/resolve — resolve slots for a page ──

globalElements.get(
  '/global-elements/resolve',
  authMiddleware,
  async (c) => {
    const type = c.req.query('type')
    const slug = c.req.query('slug')

    if (!type || !slug) {
      return c.json({ error: 'Query params "type" and "slug" are required' }, 400)
    }

    const supabase = createServiceClient(c.env)
    const data = await resolveGlobalElementsForPage(supabase, type, slug)
    return c.json({ data })
  }
)

// ── POST /global-elements — create ──

globalElements.post(
  '/global-elements',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = globalElementSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await createGlobalElement(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      if (isDuplicate(err)) {
        return c.json({ error: `Global element for slot "${parsed.data.slot}" with scope "${parsed.data.scope}" already exists` }, 409)
      }
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── PUT /global-elements/:id — update ──

globalElements.put(
  '/global-elements/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updateGlobalElementSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await updateGlobalElement(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Global element not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── DELETE /global-elements/:id — delete ──

globalElements.delete(
  '/global-elements/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      await deleteGlobalElement(supabase, c.req.param('id'))
      return c.json({ deleted: true })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Global element not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
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

export { globalElements }
