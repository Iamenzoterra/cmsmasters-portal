import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplateUsage,
} from '@cmsmasters/db'
import { createTemplateSchema, updateTemplateSchema } from '@cmsmasters/validators'

const templates = new Hono<AuthEnv>()

// ── GET /templates — list all templates ──

templates.get(
  '/templates',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getTemplates(supabase)
    return c.json({ data })
  }
)

// ── GET /templates/:id — get template by ID ──

templates.get(
  '/templates/:id',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      const data = await getTemplateById(supabase, c.req.param('id'))
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Template not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── POST /templates — create template ──

templates.post(
  '/templates',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = createTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await createTemplate(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      if (isDuplicate(err)) {
        return c.json({ error: `Template slug "${parsed.data.slug}" already exists` }, 409)
      }
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── PUT /templates/:id — update template ──

templates.put(
  '/templates/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      const data = await updateTemplate(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Template not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── DELETE /templates/:id — delete template (with dependency check) ──

templates.delete(
  '/templates/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const supabase = createServiceClient(c.env)

    const usage = await getTemplateUsage(supabase, id)
    if (usage.length > 0) {
      return c.json({ error: 'Template is used by themes', themes: usage }, 409)
    }

    try {
      await deleteTemplate(supabase, id)
      return c.json({ deleted: true })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Template not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── M2: Supabase error mappers ──

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

export { templates }
