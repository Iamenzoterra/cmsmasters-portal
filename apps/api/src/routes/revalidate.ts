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
    const body: { slug?: string; type?: string; all?: boolean } = await c.req.json<{ slug?: string; type?: string; all?: boolean }>().catch(() => ({}))

    const portalUrl = c.env.PORTAL_REVALIDATE_URL
    const portalSecret = c.env.PORTAL_REVALIDATE_SECRET

    if (!portalUrl || !portalSecret) {
      return c.json({
        revalidated: false,
        message: 'Portal revalidation not configured — set PORTAL_REVALIDATE_URL and PORTAL_REVALIDATE_SECRET',
      }, 503)
    }

    // WP-027 Phase 4: all-tags request when body is empty {} OR { all: true }.
    // Per saved memory feedback_revalidate_default.md — Portal's /api/revalidate invalidates
    // every tag when POST body is {}.
    const isAllTagsRequest = body.all === true || Object.keys(body).length === 0

    // Determine which path to revalidate (legacy { slug, type } branch — unchanged for theme-publish).
    let path = '/'
    if (body.slug && body.type === 'theme') {
      path = `/themes/${body.slug}`
    } else if (body.slug) {
      path = body.slug === 'homepage' ? '/' : `/${body.slug}`
    }

    try {
      const response = await fetch(portalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-token': portalSecret,
        },
        body: JSON.stringify(isAllTagsRequest ? {} : { path }),
      })

      const result = await response.json<Record<string, unknown>>()

      return c.json({
        revalidated: result.revalidated ?? false,
        ...(isAllTagsRequest ? { scope: 'all-tags' as const } : { path }),
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      return c.json({
        revalidated: false,
        ...(isAllTagsRequest ? { scope: 'all-tags' as const } : { path }),
        error: error instanceof Error ? error.message : 'Portal revalidation request failed',
      }, 502)
    }
  }
)

export { revalidate }
