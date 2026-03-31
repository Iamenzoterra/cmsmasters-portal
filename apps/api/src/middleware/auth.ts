import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'
import { createServiceClient } from '../lib/supabase'

// Context set by auth middleware — authentication only, no role
type AuthVariables = {
  userId: string
  userEmail: string
}

export type AuthEnv = {
  Bindings: Env
  Variables: AuthVariables
}

/**
 * JWT authentication middleware.
 * Delegates token verification to Supabase auth.getUser() — works with
 * any signing algorithm (HS256, ES256) and handles key rotation automatically.
 * Sets userId + userEmail on context. Does NOT make role/authorization decisions.
 */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const supabase = createServiceClient(c.env)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401)
    }

    c.set('userId', user.id)
    c.set('userEmail', user.email ?? '')

    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})
