import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'

const upload = new Hono<AuthEnv>()

upload.post(
  '/upload',
  authMiddleware,
  requireRole('content_manager', 'admin'),
  async (c) => {
    return c.json({
      url: 'https://placeholder.r2.dev/upload-url',
      message: 'Stub — R2 signed URL generation not yet implemented',
    })
  }
)

export { upload }
