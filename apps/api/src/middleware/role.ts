import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from './auth'
import { createServiceClient } from '../lib/supabase'
import type { UserRole } from '@cmsmasters/db'

/**
 * Authorization middleware factory. Must be used AFTER authMiddleware.
 * Source of truth for role = staff_roles → profiles.role fallback (ADR-020 V3).
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

    // Check staff_roles first (ADR-020 V3)
    const { data: staffRole } = await supabase
      .from('staff_roles')
      .select('role')
      .eq('user_id', userId)
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const effectiveRole = (staffRole?.role as UserRole) ?? null

    if (effectiveRole) {
      if (!roles.includes(effectiveRole)) {
        return c.json({ error: 'Insufficient permissions' }, 403)
      }
      await next()
      return
    }

    // Fallback to profiles.role if no staff_role
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
