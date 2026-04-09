import { Hono } from 'hono'
import type { AuthEnv } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { requireRole } from '../middleware/role'
import { createServiceClient } from '../lib/supabase'
import {
  getAllStaffMembers,
  grantStaffRole,
  revokeStaffRole,
  getActivityLog,
  getRecentActivations,
} from '@cmsmasters/db'
import type { StaffRoleName, UserRole } from '@cmsmasters/db'

const VALID_STAFF_ROLES: StaffRoleName[] = ['admin', 'content_manager', 'support_operator']

const admin = new Hono<AuthEnv>()

// All admin routes require admin role
admin.use('/admin/*', authMiddleware, requireRole('admin'))

// ── GET /admin/stats — overview numbers ──

admin.get('/admin/stats', async (c) => {
  const supabase = createServiceClient(c.env)

  const [usersResult, licensesResult, themesResult, staffResult, recentResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('licenses').select('id', { count: 'exact', head: true }),
    supabase.from('themes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('staff_roles').select('id', { count: 'exact', head: true }),
    getRecentActivations(supabase, 5),
  ])

  return c.json({
    data: {
      totalUsers: usersResult.count ?? 0,
      totalLicenses: licensesResult.count ?? 0,
      publishedThemes: themesResult.count ?? 0,
      staffMembers: staffResult.count ?? 0,
      recentActivations: recentResult,
    },
  })
})

// ── GET /admin/users — paginated user list ──

admin.get('/admin/users', async (c) => {
  const supabase = createServiceClient(c.env)
  const limit = parseInt(c.req.query('limit') ?? '20', 10)
  const offset = parseInt(c.req.query('offset') ?? '0', 10)
  const search = c.req.query('search') ?? ''
  const role = c.req.query('role') ?? ''

  let query = supabase
    .from('profiles')
    .select('*, staff_roles!staff_roles_user_id_fkey(role, permissions, granted_at)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }
  if (role) {
    query = query.eq('role', role as UserRole)
  }

  const { data, error, count } = await query
  if (error) return c.json({ error: 'Failed to fetch users' }, 500)
  return c.json({ data, count })
})

// ── GET /admin/users/:id — full user detail ──

admin.get('/admin/users/:id', async (c) => {
  const userId = c.req.param('id')
  const supabase = createServiceClient(c.env)

  const [profileResult, licensesResult, staffResult, activityResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('licenses')
      .select('*, themes!licenses_theme_id_fkey(id, slug, meta)')
      .eq('user_id', userId),
    supabase.from('staff_roles').select('*').eq('user_id', userId),
    supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (profileResult.error) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({
    data: {
      profile: profileResult.data,
      licenses: licensesResult.data ?? [],
      staffRoles: staffResult.data ?? [],
      recentActivity: activityResult.data ?? [],
    },
  })
})

// ── POST /admin/users/:id/staff-role — grant staff role ──

admin.post('/admin/users/:id/staff-role', async (c) => {
  const targetUserId = c.req.param('id')
  const adminUserId = c.get('userId')
  const body = await c.req.json()
  const { role, permissions } = body as { role?: string; permissions?: string[] }

  if (!role || !VALID_STAFF_ROLES.includes(role as StaffRoleName)) {
    return c.json({ error: `Invalid role. Must be one of: ${VALID_STAFF_ROLES.join(', ')}` }, 400)
  }

  const supabase = createServiceClient(c.env)

  try {
    const result = await grantStaffRole(
      supabase,
      targetUserId,
      role as StaffRoleName,
      adminUserId,
      permissions ?? ['*']
    )

    await supabase.from('audit_log').insert({
      actor_id: adminUserId,
      actor_role: 'admin',
      action: 'staff_role_granted',
      target_type: 'user',
      target_id: targetUserId,
      details: { role, permissions: permissions ?? ['*'] },
    })

    return c.json({ data: result }, 201)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

// ── DELETE /admin/users/:id/staff-role — revoke staff role ──

admin.delete('/admin/users/:id/staff-role', async (c) => {
  const targetUserId = c.req.param('id')
  const adminUserId = c.get('userId')
  const body = await c.req.json()
  const { role } = body as { role?: string }

  if (!role || !VALID_STAFF_ROLES.includes(role as StaffRoleName)) {
    return c.json({ error: 'Invalid role' }, 400)
  }

  // Prevent self-demotion
  if (targetUserId === adminUserId && role === 'admin') {
    return c.json({ error: 'Cannot revoke your own admin role' }, 400)
  }

  const supabase = createServiceClient(c.env)

  try {
    await revokeStaffRole(supabase, targetUserId, role as StaffRoleName)

    await supabase.from('audit_log').insert({
      actor_id: adminUserId,
      actor_role: 'admin',
      action: 'staff_role_revoked',
      target_type: 'user',
      target_id: targetUserId,
      details: { role },
    })

    return c.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: msg }, 500)
  }
})

// ── GET /admin/activity — paginated activity log ──

admin.get('/admin/activity', async (c) => {
  const supabase = createServiceClient(c.env)
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const offset = parseInt(c.req.query('offset') ?? '0', 10)
  const action = c.req.query('action') ?? undefined
  const userId = c.req.query('user_id') ?? undefined

  const result = await getActivityLog(supabase, { userId, action, limit, offset })
  return c.json({ data: result.data, count: result.count })
})

// ── GET /admin/audit — paginated audit log ──

admin.get('/admin/audit', async (c) => {
  const supabase = createServiceClient(c.env)
  const limit = parseInt(c.req.query('limit') ?? '50', 10)
  const offset = parseInt(c.req.query('offset') ?? '0', 10)

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const actorId = c.req.query('actor_id')
  const actionFilter = c.req.query('action')
  if (actorId) query = query.eq('actor_id', actorId)
  if (actionFilter) query = query.eq('action', actionFilter)

  const { data, error, count } = await query
  if (error) return c.json({ error: 'Failed to fetch audit log' }, 500)
  return c.json({ data, count })
})

// ── GET /admin/staff — all staff members ──

admin.get('/admin/staff', async (c) => {
  const supabase = createServiceClient(c.env)
  const data = await getAllStaffMembers(supabase)
  return c.json({ data })
})

// ── GET /admin/health — system health checks ──

admin.get('/admin/health', async (c) => {
  const supabase = createServiceClient(c.env)
  const startTime = Date.now()

  // DB connection check
  const { error: dbError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
  const dbLatency = Date.now() - startTime

  // Table row counts
  const counts = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('themes').select('id', { count: 'exact', head: true }),
    supabase.from('blocks').select('id', { count: 'exact', head: true }),
    supabase.from('licenses').select('id', { count: 'exact', head: true }),
    supabase.from('staff_roles').select('id', { count: 'exact', head: true }),
    supabase.from('audit_log').select('id', { count: 'exact', head: true }),
    supabase.from('activity_log').select('id', { count: 'exact', head: true }),
  ])

  // R2 bucket check
  let r2Status: string
  try {
    const listing = await c.env.ASSETS_BUCKET.list({ limit: 1 })
    r2Status = listing ? 'connected' : 'empty'
  } catch {
    r2Status = 'error'
  }

  return c.json({
    data: {
      status: dbError ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      supabase: {
        connected: !dbError,
        latencyMs: dbLatency,
      },
      r2: {
        status: r2Status,
      },
      tables: {
        profiles: counts[0].count ?? 0,
        themes: counts[1].count ?? 0,
        blocks: counts[2].count ?? 0,
        licenses: counts[3].count ?? 0,
        staff_roles: counts[4].count ?? 0,
        audit_log: counts[5].count ?? 0,
        activity_log: counts[6].count ?? 0,
      },
      envato: {
        tokenConfigured:
          c.env.ENVATO_PERSONAL_TOKEN !== 'dev_mock_token' && !!c.env.ENVATO_PERSONAL_TOKEN,
      },
    },
  })
})

export { admin }
