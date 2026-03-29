import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from './auth'
import { createServiceClient } from '../lib/supabase'
import type { UserRole } from '@cmsmasters/db'

/**
 * Authorization middleware factory. Must be used AFTER authMiddleware.
 * Source of truth for role = DB profiles table (M3).
 *
 * M5: checks userId exists first → 401 if missing (not 403).
 */
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    // M5: auth precondition — 401 if not authenticated
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const supabase = createServiceClient(c.env)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return c.json({ error: 'User profile not found' }, 403)
    }

    if (!roles.includes(profile.role as UserRole)) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  })
}
