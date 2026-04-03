import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getBlocks,
  getBlockById,
  createBlock,
  updateBlock,
  deleteBlock,
  getBlockUsage,
} from '@cmsmasters/db'
import { createBlockSchema, updateBlockSchema } from '@cmsmasters/validators'

const blocks = new Hono<AuthEnv>()

// ── GET /blocks — list all blocks ──

blocks.get(
  '/blocks',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    const data = await getBlocks(supabase)
    return c.json({ data })
  }
)

// ── GET /blocks/:id — get block by ID ──

blocks.get(
  '/blocks/:id',
  authMiddleware,
  async (c) => {
    const supabase = createServiceClient(c.env)
    try {
      const data = await getBlockById(supabase, c.req.param('id'))
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Block not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── POST /blocks — create block ──

blocks.post(
  '/blocks',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = createBlockSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      // Un-set previous default for same category
      if (parsed.data.is_default && parsed.data.category) {
        await supabase.from('blocks').update({ is_default: false })
          .eq('category', parsed.data.category).eq('is_default', true)
      }
      const data = await createBlock(supabase, {
        ...parsed.data,
        created_by: c.get('userId'),
      })
      return c.json({ data }, 201)
    } catch (err) {
      if (isDuplicate(err)) {
        return c.json({ error: `Block slug "${parsed.data.slug}" already exists` }, 409)
      }
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── PUT /blocks/:id — update block ──

blocks.put(
  '/blocks/:id',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    const body = await c.req.json()
    const parsed = updateBlockSchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
    }

    const supabase = createServiceClient(c.env)
    try {
      // Un-set previous default for same category (skip self)
      if (parsed.data.is_default && parsed.data.category) {
        await supabase.from('blocks').update({ is_default: false })
          .eq('category', parsed.data.category).eq('is_default', true)
          .neq('id', c.req.param('id'))
      }
      const data = await updateBlock(supabase, c.req.param('id'), parsed.data)
      return c.json({ data })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Block not found' }, 404)
      return c.json({ error: 'Internal server error' }, 500)
    }
  }
)

// ── DELETE /blocks/:id — delete block (with dependency check) ──

blocks.delete(
  '/blocks/:id',
  authMiddleware,
  requireRole('admin'),
  async (c) => {
    const id = c.req.param('id')
    const supabase = createServiceClient(c.env)

    const usage = await getBlockUsage(supabase, id)
    if (usage.length > 0) {
      return c.json({ error: 'Block is used in templates', templates: usage }, 409)
    }

    try {
      await deleteBlock(supabase, id)
      return c.json({ deleted: true })
    } catch (err) {
      if (isNotFound(err)) return c.json({ error: 'Block not found' }, 404)
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

export { blocks }
