import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

const revalidate = new Hono<AuthEnv>()

revalidate.post(
  '/content/revalidate',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    return c.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
      message: 'Stub — Portal revalidation not yet implemented',
    })
  }
)

export { revalidate }
